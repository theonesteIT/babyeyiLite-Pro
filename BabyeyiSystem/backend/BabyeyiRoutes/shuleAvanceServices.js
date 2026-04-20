'use strict';

const express = require('express');
const { promisePool } = require('../config/database');
const {
  ensureShuleAvanceTeacherCatalogTable,
  fetchActiveCatalogMaps,
} = require('./shuleAvanceCatalogStore');

const router = express.Router();

const ROLE_ACCOUNTANT = 'ACCOUNTANT';
const MANAGER_ROLES = ['SCHOOL_ADMIN', 'SCHOOL_MANAGER'];
/** Teachers, school staff (HOD/DOS), and accountants can submit requests */
const APPLICANT_ROLES = ['TEACHER', 'HOD', 'DOS', 'ACCOUNTANT'];
const LEGACY_APPLICANT_ROLES = ['TEACHER', 'HOD', 'DOS', 'SCHOOL_ADMIN', 'SCHOOL_MANAGER', 'ACCOUNTANT'];

const STATUS = {
  PENDING_ACCOUNTANT: 'pending_accountant',
  SENT_TO_MANAGER: 'sent_to_manager',
  APPROVED: 'approved',
  REJECTED_BY_ACCOUNTANT: 'rejected_by_accountant',
  REJECTED_BY_MANAGER: 'rejected_by_manager',
};

let tableReady = false;

function toRoleCode(req) {
  return String(req.user?.role_code || req.session?.user?.role?.code || '').toUpperCase();
}

function resolveSchoolId(req) {
  return (
    req.session?.school_id ||
    req.session?.user?.school_id ||
    req.session?.user?.school?.id ||
    req.user?.school_id ||
    null
  );
}

function resolveUserId(req) {
  return req.session?.userId || req.session?.user?.id || req.user?.id || null;
}

function authGuard(req, res, next) {
  const userId = resolveUserId(req);
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Not authenticated' });
  }
  const schoolId = resolveSchoolId(req);
  if (!schoolId) {
    return res.status(400).json({ success: false, message: 'No school linked to this account' });
  }
  req.ctx = { userId, schoolId, roleCode: toRoleCode(req) };
  next();
}

function requireRole(allowedRoles) {
  const accepted = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  return (req, res, next) => {
    const roleCode = req.ctx?.roleCode || '';
    if (!accepted.includes(roleCode)) {
      return res.status(403).json({
        success: false,
        message: `Access denied for role "${roleCode || 'UNKNOWN'}"`,
      });
    }
    next();
  };
}

/** Any logged-in user (including Super Admin preview); catalog has no school scope */
function requireLoggedIn(req, res, next) {
  const userId = resolveUserId(req);
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Not authenticated' });
  }
  next();
}

async function ensureTable() {
  if (tableReady) return;
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS shule_avance_requests (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      teacher_user_id INT UNSIGNED NOT NULL,
      amount_rwf DECIMAL(14,2) NOT NULL,
      purpose TEXT NOT NULL,
      repayment_term_months INT UNSIGNED NOT NULL,
      vendor_label VARCHAR(160) NULL,
      details TEXT NULL,
      invoice_file_name VARCHAR(255) NULL,
      status VARCHAR(40) NOT NULL DEFAULT 'pending_accountant',
      accountant_note TEXT NULL,
      manager_feedback TEXT NULL,
      submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      accountant_reviewed_at DATETIME NULL,
      accountant_reviewed_by INT UNSIGNED NULL,
      manager_reviewed_at DATETIME NULL,
      manager_reviewed_by INT UNSIGNED NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_sa_school (school_id),
      KEY idx_sa_teacher (teacher_user_id),
      KEY idx_sa_status (status),
      KEY idx_sa_submitted (submitted_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  const cols = [
    ['request_type', "VARCHAR(20) NOT NULL DEFAULT 'service'"],
    ['service_category', 'VARCHAR(64) NULL'],
    ['cashout_reason', 'TEXT NULL'],
    ['cashout_category_slug', 'VARCHAR(64) NULL'],
  ];
  for (const [name, def] of cols) {
    try {
      await promisePool.query(`ALTER TABLE shule_avance_requests ADD COLUMN ${name} ${def}`);
    } catch (e) {
      if (e.code !== 'ER_DUP_FIELDNAME') {
        console.warn(`[shule-avance] ALTER add ${name}:`, e.message);
      }
    }
  }

  await ensureShuleAvanceTeacherCatalogTable();
  tableReady = true;
}

const ROW_SELECT = `r.id, r.school_id, r.teacher_user_id, r.amount_rwf, r.purpose, r.repayment_term_months,
              r.vendor_label, r.details, r.invoice_file_name, r.status, r.accountant_note, r.manager_feedback,
              r.submitted_at, r.accountant_reviewed_at, r.manager_reviewed_at, r.created_at, r.updated_at,
              r.request_type, r.service_category, r.cashout_reason, r.cashout_category_slug`;

function parseCreateBody(req, maps) {
  const { servicesBySlug, cashoutsBySlug } = maps;
  if (!servicesBySlug.size && !cashoutsBySlug.size) {
    return { error: 'ShuleAvance catalog is empty. Ask your platform administrator to configure services and cashout types.' };
  }

  const requestType = String(req.body?.request_type || 'service').toLowerCase();
  if (!['service', 'cashout'].includes(requestType)) {
    return { error: 'request_type must be service or cashout' };
  }
  const amount = Number(req.body?.amount_requested ?? req.body?.amount_rwf);
  const repayment = Number(req.body?.repayment_term_months ?? req.body?.repayment_term ?? 6);

  if (!amount || amount <= 0) {
    return { error: 'amount_requested must be greater than zero' };
  }
  if (!Number.isInteger(repayment) || repayment < 1 || repayment > 12) {
    return { error: 'repayment_term_months must be between 1 and 12' };
  }

  let purpose = '';
  let details = String(req.body?.details || '').trim() || null;
  let vendorLabel = String(req.body?.vendor_label || '').trim() || null;
  let serviceCategory = null;
  let cashoutReason = null;
  let cashoutCategorySlug = null;
  const invoiceFileName = String(req.body?.invoice_file_name || '').trim() || null;

  if (requestType === 'service') {
    if (!servicesBySlug.size) {
      return { error: 'No service categories are configured' };
    }
    serviceCategory = String(req.body?.service_category || '').trim();
    if (!servicesBySlug.has(serviceCategory)) {
      return { error: 'Select a valid service category' };
    }
    const cat = servicesBySlug.get(serviceCategory);
    const userDesc = String(req.body?.description || req.body?.purpose || '').trim();
    purpose = userDesc || `Service — ${cat.label}`;
    vendorLabel = cat.label;
  } else {
    if (!cashoutsBySlug.size) {
      return { error: 'No cashout types are configured' };
    }
    cashoutCategorySlug = String(
      req.body?.cashout_category || req.body?.cashout_category_slug || ''
    ).trim();
    if (!cashoutsBySlug.has(cashoutCategorySlug)) {
      return { error: 'Select a valid cashout type' };
    }
    const co = cashoutsBySlug.get(cashoutCategorySlug);
    cashoutReason = String(req.body?.reason || req.body?.cashout_reason || req.body?.purpose || '').trim();
    if (!cashoutReason) {
      return { error: 'reason is required for cashout requests' };
    }
    purpose = `Cashout [${co.label}]: ${cashoutReason}`;
    details = String(req.body?.description || '').trim() || null;
  }

  return {
    value: {
      requestType,
      amount,
      repayment,
      purpose,
      details,
      vendorLabel,
      serviceCategory,
      cashoutReason,
      cashoutCategorySlug,
      invoiceFileName,
    },
  };
}

async function handleApplicantCreate(req, res) {
  try {
    const { schoolId, userId } = req.ctx;
    await ensureShuleAvanceTeacherCatalogTable();
    const maps = await fetchActiveCatalogMaps();
    const parsed = parseCreateBody(req, maps);
    if (parsed.error) {
      return res.status(400).json({ success: false, message: parsed.error });
    }
    const v = parsed.value;

    const [result] = await promisePool.query(
      `INSERT INTO shule_avance_requests
       (school_id, teacher_user_id, amount_rwf, purpose, repayment_term_months, vendor_label, details,
        invoice_file_name, status, request_type, service_category, cashout_reason, cashout_category_slug)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        schoolId,
        userId,
        v.amount,
        v.purpose,
        v.repayment,
        v.vendorLabel,
        v.details,
        v.invoiceFileName,
        STATUS.PENDING_ACCOUNTANT,
        v.requestType,
        v.requestType === 'service' ? v.serviceCategory : null,
        v.requestType === 'cashout' ? v.cashoutReason : null,
        v.requestType === 'cashout' ? v.cashoutCategorySlug : null,
      ]
    );

    res.status(201).json({ success: true, message: 'Request submitted to accountant', id: result.insertId });
  } catch (error) {
    console.error('[shule-avance] applicant create:', error.message);
    res.status(500).json({ success: false, message: 'Failed to submit request' });
  }
}

async function handleApplicantList(req, res) {
  try {
    const { schoolId, userId } = req.ctx;
    const [rows] = await promisePool.query(
      `SELECT ${ROW_SELECT}
       FROM shule_avance_requests r
       WHERE r.school_id = ? AND r.teacher_user_id = ?
       ORDER BY r.id DESC`,
      [schoolId, userId]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('[shule-avance] applicant list:', error.message);
    res.status(500).json({ success: false, message: 'Failed to load your ShuleAvance requests' });
  }
}

async function handleApplicantUpdate(req, res) {
  try {
    const { schoolId, userId } = req.ctx;
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid request id' });

    const [[existing]] = await promisePool.query(
      `SELECT id, status, request_type, cashout_category_slug, service_category
       FROM shule_avance_requests WHERE id = ? AND school_id = ? AND teacher_user_id = ? LIMIT 1`,
      [id, schoolId, userId]
    );
    if (!existing) return res.status(404).json({ success: false, message: 'Request not found' });
    if (existing.status !== STATUS.PENDING_ACCOUNTANT) {
      return res.status(400).json({ success: false, message: 'Only pending requests can be edited' });
    }

    if (
      String(existing.request_type || '').toLowerCase() === 'cashout' &&
      !String(req.body?.cashout_category || req.body?.cashout_category_slug || '').trim() &&
      existing.cashout_category_slug
    ) {
      req.body = { ...req.body, cashout_category: existing.cashout_category_slug };
    }
    if (
      String(existing.request_type || '').toLowerCase() === 'service' &&
      !String(req.body?.service_category || '').trim() &&
      existing.service_category
    ) {
      req.body = { ...req.body, service_category: existing.service_category };
    }

    await ensureShuleAvanceTeacherCatalogTable();
    const maps = await fetchActiveCatalogMaps();
    const parsed = parseCreateBody(req, maps);
    if (parsed.error) {
      return res.status(400).json({ success: false, message: parsed.error });
    }
    const v = parsed.value;

    await promisePool.query(
      `UPDATE shule_avance_requests
       SET amount_rwf = ?, purpose = ?, repayment_term_months = ?, vendor_label = ?, details = ?,
           invoice_file_name = ?, request_type = ?, service_category = ?, cashout_reason = ?, cashout_category_slug = ?
       WHERE id = ? AND school_id = ? AND teacher_user_id = ?`,
      [
        v.amount,
        v.purpose,
        v.repayment,
        v.vendorLabel,
        v.details,
        v.invoiceFileName,
        v.requestType,
        v.requestType === 'service' ? v.serviceCategory : null,
        v.requestType === 'cashout' ? v.cashoutReason : null,
        v.requestType === 'cashout' ? v.cashoutCategorySlug : null,
        id,
        schoolId,
        userId,
      ]
    );

    res.json({ success: true, message: 'Request updated successfully' });
  } catch (error) {
    console.error('[shule-avance] applicant update:', error.message);
    res.status(500).json({ success: false, message: 'Failed to update request' });
  }
}

async function handleApplicantDelete(req, res) {
  try {
    const { schoolId, userId } = req.ctx;
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid request id' });

    const [result] = await promisePool.query(
      `DELETE FROM shule_avance_requests
       WHERE id = ? AND school_id = ? AND teacher_user_id = ? AND status = ?`,
      [id, schoolId, userId, STATUS.PENDING_ACCOUNTANT]
    );

    if (!result.affectedRows) {
      return res.status(400).json({
        success: false,
        message: 'Request not found or cannot be deleted after review',
      });
    }
    res.json({ success: true, message: 'Request deleted successfully' });
  } catch (error) {
    console.error('[shule-avance] applicant delete:', error.message);
    res.status(500).json({ success: false, message: 'Failed to delete request' });
  }
}

router.get('/shule-avance/catalog', requireLoggedIn, async (req, res) => {
  try {
    await ensureShuleAvanceTeacherCatalogTable();
    const [rows] = await promisePool.query(
      `SELECT item_kind, slug, label, description, income_rate_percent, sort_order
       FROM shule_avance_teacher_catalog
       WHERE is_active = 1
       ORDER BY item_kind ASC, sort_order ASC, id ASC`
    );
    const services = [];
    const cashouts = [];
    for (const r of rows || []) {
      const x = {
        slug: r.slug,
        label: r.label,
        description: r.description,
        income_rate_percent: Number(r.income_rate_percent),
        sort_order: r.sort_order,
      };
      if (r.item_kind === 'service') services.push(x);
      else cashouts.push(x);
    }
    res.json({ success: true, data: { services, cashouts } });
  } catch (error) {
    console.error('[shule-avance] catalog:', error.message);
    res.status(500).json({ success: false, message: 'Failed to load catalog' });
  }
});

router.use(authGuard);
router.use(async (_req, res, next) => {
  try {
    await ensureTable();
    next();
  } catch (error) {
    console.error('[shule-avance] ensureTable failed:', error.message);
    res.status(500).json({ success: false, message: 'Failed to initialize ShuleAvance storage' });
  }
});

// Applicant CRUD (teachers, HOD, DOS, accountants)
router.get('/shule-avance/applicant/my-requests', requireRole(APPLICANT_ROLES), handleApplicantList);
router.post('/shule-avance/applicant/requests', requireRole(APPLICANT_ROLES), handleApplicantCreate);
router.put('/shule-avance/applicant/requests/:id', requireRole(APPLICANT_ROLES), handleApplicantUpdate);
router.delete('/shule-avance/applicant/requests/:id', requireRole(APPLICANT_ROLES), handleApplicantDelete);

router.get('/shule-avance/teacher/my-requests', requireRole(APPLICANT_ROLES), handleApplicantList);
router.post('/shule-avance/teacher/requests', requireRole(APPLICANT_ROLES), handleApplicantCreate);
router.put('/shule-avance/teacher/requests/:id', requireRole(APPLICANT_ROLES), handleApplicantUpdate);
router.delete('/shule-avance/teacher/requests/:id', requireRole(APPLICANT_ROLES), handleApplicantDelete);

// Accountant: finance queue (all school requests from staff)
router.get('/shule-avance/finance/requests', requireRole(ROLE_ACCOUNTANT), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const raw = String(req.query?.status || 'all').toLowerCase();
    const allowed = [
      'all',
      STATUS.PENDING_ACCOUNTANT,
      STATUS.SENT_TO_MANAGER,
      STATUS.APPROVED,
      'rejected',
    ];
    if (!allowed.includes(raw)) {
      return res.status(400).json({ success: false, message: 'Invalid status filter' });
    }

    let where = 'r.school_id = ?';
    const params = [schoolId];
    if (raw === STATUS.PENDING_ACCOUNTANT) {
      where += ' AND r.status = ?';
      params.push(STATUS.PENDING_ACCOUNTANT);
    } else if (raw === STATUS.SENT_TO_MANAGER) {
      where += ' AND r.status = ?';
      params.push(STATUS.SENT_TO_MANAGER);
    } else if (raw === STATUS.APPROVED) {
      where += ' AND r.status = ?';
      params.push(STATUS.APPROVED);
    } else if (raw === 'rejected') {
      where += ' AND r.status IN (?, ?)';
      params.push(STATUS.REJECTED_BY_ACCOUNTANT, STATUS.REJECTED_BY_MANAGER);
    }

    const [rows] = await promisePool.query(
      `SELECT ${ROW_SELECT},
              TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))) AS staff_name,
              u.email AS staff_email,
              COALESCE(rl.role_code, '') AS submitter_role_code
       FROM shule_avance_requests r
       LEFT JOIN users u ON u.id = r.teacher_user_id
       LEFT JOIN roles rl ON rl.id = u.role_id
       WHERE ${where}
       ORDER BY r.id DESC`,
      params
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('[shule-avance] finance requests:', error.message);
    res.status(500).json({ success: false, message: 'Failed to load requests' });
  }
});

router.get('/shule-avance/finance/pending-invoices', requireRole(ROLE_ACCOUNTANT), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const [rows] = await promisePool.query(
      `SELECT ${ROW_SELECT},
              TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))) AS staff_name,
              u.email AS staff_email,
              COALESCE(rl.role_code, '') AS submitter_role_code
       FROM shule_avance_requests r
       LEFT JOIN users u ON u.id = r.teacher_user_id
       LEFT JOIN roles rl ON rl.id = u.role_id
       WHERE r.school_id = ? AND r.status = ?
       ORDER BY r.id DESC`,
      [schoolId, STATUS.PENDING_ACCOUNTANT]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('[shule-avance] finance pending:', error.message);
    res.status(500).json({ success: false, message: 'Failed to load pending finance queue' });
  }
});

router.patch('/shule-avance/finance/invoice-requests/:id/send-to-manager', requireRole(ROLE_ACCOUNTANT), async (req, res) => {
  try {
    const { schoolId, userId } = req.ctx;
    const id = Number(req.params.id);
    const note = String(req.body?.note || req.body?.comment || '').trim();
    if (!id) return res.status(400).json({ success: false, message: 'Invalid request id' });

    const [result] = await promisePool.query(
      `UPDATE shule_avance_requests
       SET status = ?, accountant_note = ?, accountant_reviewed_at = NOW(), accountant_reviewed_by = ?
       WHERE id = ? AND school_id = ? AND status = ?`,
      [STATUS.SENT_TO_MANAGER, note || null, userId, id, schoolId, STATUS.PENDING_ACCOUNTANT]
    );
    if (!result.affectedRows) {
      return res.status(400).json({ success: false, message: 'Request not found or already handled' });
    }
    res.json({ success: true, message: 'Request sent to school manager for decision' });
  } catch (error) {
    console.error('[shule-avance] finance send-to-manager:', error.message);
    res.status(500).json({ success: false, message: 'Failed to send request to manager' });
  }
});

router.patch('/shule-avance/finance/invoice-requests/:id/reject', requireRole(ROLE_ACCOUNTANT), async (req, res) => {
  try {
    const { schoolId, userId } = req.ctx;
    const id = Number(req.params.id);
    const note = String(req.body?.note || '').trim();
    if (!id) return res.status(400).json({ success: false, message: 'Invalid request id' });

    const [result] = await promisePool.query(
      `UPDATE shule_avance_requests
       SET status = ?, accountant_note = ?, accountant_reviewed_at = NOW(), accountant_reviewed_by = ?
       WHERE id = ? AND school_id = ? AND status = ?`,
      [STATUS.REJECTED_BY_ACCOUNTANT, note || null, userId, id, schoolId, STATUS.PENDING_ACCOUNTANT]
    );
    if (!result.affectedRows) {
      return res.status(400).json({ success: false, message: 'Request not found or already handled' });
    }
    res.json({ success: true, message: 'Request rejected' });
  } catch (error) {
    console.error('[shule-avance] finance reject:', error.message);
    res.status(500).json({ success: false, message: 'Failed to reject request' });
  }
});

// Manager: list with optional status (default: awaiting manager decision)
router.get('/shule-avance/manager/requests', requireRole(MANAGER_ROLES), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const raw = String(req.query?.status || 'sent_to_manager').toLowerCase();
    let where = 'r.school_id = ?';
    const params = [schoolId];

    if (raw === 'sent_to_manager' || raw === 'pending') {
      where += ' AND r.status = ?';
      params.push(STATUS.SENT_TO_MANAGER);
    } else if (raw === STATUS.APPROVED) {
      where += ' AND r.status = ?';
      params.push(STATUS.APPROVED);
    } else if (raw === 'rejected') {
      where += ' AND r.status = ?';
      params.push(STATUS.REJECTED_BY_MANAGER);
    } else if (raw === 'all') {
      /* no extra filter */
    } else {
      where += ' AND r.status = ?';
      params.push(STATUS.SENT_TO_MANAGER);
    }

    const [rows] = await promisePool.query(
      `SELECT ${ROW_SELECT},
              TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))) AS staff_name,
              u.email AS staff_email,
              COALESCE(rl.role_code, '') AS submitter_role_code
       FROM shule_avance_requests r
       LEFT JOIN users u ON u.id = r.teacher_user_id
       LEFT JOIN roles rl ON rl.id = u.role_id
       WHERE ${where}
       ORDER BY r.id DESC`,
      params
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('[shule-avance] manager requests:', error.message);
    res.status(500).json({ success: false, message: 'Failed to load manager queue' });
  }
});

router.get('/shule-avance/manager/pending-requests', requireRole(MANAGER_ROLES), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const [rows] = await promisePool.query(
      `SELECT ${ROW_SELECT},
              TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))) AS staff_name,
              u.email AS staff_email,
              COALESCE(rl.role_code, '') AS submitter_role_code
       FROM shule_avance_requests r
       LEFT JOIN users u ON u.id = r.teacher_user_id
       LEFT JOIN roles rl ON rl.id = u.role_id
       WHERE r.school_id = ? AND r.status = ?
       ORDER BY r.id DESC`,
      [schoolId, STATUS.SENT_TO_MANAGER]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('[shule-avance] manager pending:', error.message);
    res.status(500).json({ success: false, message: 'Failed to load manager queue' });
  }
});

router.patch('/shule-avance/manager/invoice-requests/:id/decision', requireRole(MANAGER_ROLES), async (req, res) => {
  try {
    const { schoolId, userId } = req.ctx;
    const id = Number(req.params.id);
    const decision = String(req.body?.decision || '').toLowerCase();
    const feedback = String(req.body?.feedback || req.body?.comment || '').trim();
    if (!id) return res.status(400).json({ success: false, message: 'Invalid request id' });
    if (!['approved', 'rejected'].includes(decision)) {
      return res.status(400).json({ success: false, message: 'decision must be approved or rejected' });
    }

    const nextStatus = decision === 'approved' ? STATUS.APPROVED : STATUS.REJECTED_BY_MANAGER;
    const [result] = await promisePool.query(
      `UPDATE shule_avance_requests
       SET status = ?, manager_feedback = ?, manager_reviewed_at = NOW(), manager_reviewed_by = ?
       WHERE id = ? AND school_id = ? AND status = ?`,
      [nextStatus, feedback || null, userId, id, schoolId, STATUS.SENT_TO_MANAGER]
    );
    if (!result.affectedRows) {
      return res.status(400).json({ success: false, message: 'Request not found or already handled' });
    }
    res.json({ success: true, message: decision === 'approved' ? 'Request approved' : 'Request rejected' });
  } catch (error) {
    console.error('[shule-avance] manager decision:', error.message);
    res.status(500).json({ success: false, message: 'Failed to save manager decision' });
  }
});

// Legacy endpoints
router.get('/shule-avance/status', async (req, res) => {
  try {
    const { schoolId, userId } = req.ctx;
    const [rows] = await promisePool.query(
      `SELECT id, amount_rwf AS amount_requested, repayment_term_months, purpose, status, submitted_at AS created_at,
              request_type, service_category, details, vendor_label, cashout_reason, cashout_category_slug,
              accountant_note, manager_feedback
       FROM shule_avance_requests
       WHERE school_id = ? AND teacher_user_id = ?
       ORDER BY id DESC`,
      [schoolId, userId]
    );
    const active = rows.find((r) =>
      [STATUS.PENDING_ACCOUNTANT, STATUS.SENT_TO_MANAGER].includes(r.status)
    );
    res.json({
      success: true,
      has_active_application: !!active,
      active_loan: active || null,
      history: rows,
    });
  } catch (error) {
    console.error('[shule-avance] legacy status:', error.message);
    res.status(500).json({ success: false, message: 'Failed to load status' });
  }
});

router.post('/shule-avance/apply', requireRole(LEGACY_APPLICANT_ROLES), async (req, res) => {
  try {
    await ensureShuleAvanceTeacherCatalogTable();
    const maps = await fetchActiveCatalogMaps();
    const firstCash = maps.cashoutsBySlug.keys().next().value;
    if (!firstCash) {
      return res.status(400).json({ success: false, message: 'No cashout types configured' });
    }
    req.body = {
      ...req.body,
      request_type: 'cashout',
      cashout_category: req.body?.cashout_category || req.body?.cashout_category_slug || firstCash,
      reason: req.body?.reason || req.body?.purpose,
      description: req.body?.details,
    };
    return handleApplicantCreate(req, res);
  } catch (error) {
    console.error('[shule-avance] legacy apply:', error.message);
    res.status(500).json({ success: false, message: 'Failed to submit request' });
  }
});

router.delete('/shule-avance/cancel/:id', requireRole(APPLICANT_ROLES), (req, res) =>
  handleApplicantDelete(req, res)
);

module.exports = router;
