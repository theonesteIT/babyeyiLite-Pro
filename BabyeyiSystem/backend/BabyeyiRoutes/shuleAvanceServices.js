'use strict';

const express = require('express');
const { promisePool } = require('../config/database');

const router = express.Router();

const ROLE_TEACHER = 'TEACHER';
const ROLE_ACCOUNTANT = 'ACCOUNTANT';
const MANAGER_ROLES = ['SCHOOL_ADMIN', 'SCHOOL_MANAGER'];
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
  tableReady = true;
}

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

// Teacher CRUD
router.get('/shule-avance/teacher/my-requests', requireRole(ROLE_TEACHER), async (req, res) => {
  try {
    const { schoolId, userId } = req.ctx;
    const [rows] = await promisePool.query(
      `SELECT id, school_id, teacher_user_id, amount_rwf, purpose, repayment_term_months, vendor_label,
              details, invoice_file_name, status, accountant_note, manager_feedback,
              submitted_at, accountant_reviewed_at, manager_reviewed_at, created_at, updated_at
       FROM shule_avance_requests
       WHERE school_id = ? AND teacher_user_id = ?
       ORDER BY id DESC`,
      [schoolId, userId]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('[shule-avance] teacher/my-requests:', error.message);
    res.status(500).json({ success: false, message: 'Failed to load your ShuleAvance requests' });
  }
});

router.post('/shule-avance/teacher/requests', requireRole(ROLE_TEACHER), async (req, res) => {
  try {
    const { schoolId, userId } = req.ctx;
    const amount = Number(req.body?.amount_requested ?? req.body?.amount_rwf);
    const purpose = String(req.body?.purpose || req.body?.details || '').trim();
    const repayment = Number(req.body?.repayment_term_months ?? req.body?.repayment_term ?? 6);
    const vendorLabel = String(req.body?.vendor_label || '').trim();
    const details = String(req.body?.details || '').trim();
    const invoiceFileName = String(req.body?.invoice_file_name || '').trim();

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'amount_requested must be greater than zero' });
    }
    if (!purpose) {
      return res.status(400).json({ success: false, message: 'purpose is required' });
    }
    if (!Number.isInteger(repayment) || repayment < 1 || repayment > 24) {
      return res.status(400).json({ success: false, message: 'repayment_term_months must be between 1 and 24' });
    }

    const [result] = await promisePool.query(
      `INSERT INTO shule_avance_requests
       (school_id, teacher_user_id, amount_rwf, purpose, repayment_term_months, vendor_label, details, invoice_file_name, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [schoolId, userId, amount, purpose, repayment, vendorLabel || null, details || null, invoiceFileName || null, STATUS.PENDING_ACCOUNTANT]
    );

    res.status(201).json({ success: true, message: 'Request submitted to accountant', id: result.insertId });
  } catch (error) {
    console.error('[shule-avance] teacher create:', error.message);
    res.status(500).json({ success: false, message: 'Failed to submit request' });
  }
});

router.put('/shule-avance/teacher/requests/:id', requireRole(ROLE_TEACHER), async (req, res) => {
  try {
    const { schoolId, userId } = req.ctx;
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid request id' });

    const [[existing]] = await promisePool.query(
      `SELECT id, status
       FROM shule_avance_requests
       WHERE id = ? AND school_id = ? AND teacher_user_id = ?
       LIMIT 1`,
      [id, schoolId, userId]
    );
    if (!existing) return res.status(404).json({ success: false, message: 'Request not found' });
    if (existing.status !== STATUS.PENDING_ACCOUNTANT) {
      return res.status(400).json({ success: false, message: 'Only accountant-pending requests can be edited' });
    }

    const amount = Number(req.body?.amount_requested ?? req.body?.amount_rwf);
    const purpose = String(req.body?.purpose || req.body?.details || '').trim();
    const repayment = Number(req.body?.repayment_term_months ?? req.body?.repayment_term ?? 6);
    const vendorLabel = String(req.body?.vendor_label || '').trim();
    const details = String(req.body?.details || '').trim();
    const invoiceFileName = String(req.body?.invoice_file_name || '').trim();

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'amount_requested must be greater than zero' });
    }
    if (!purpose) {
      return res.status(400).json({ success: false, message: 'purpose is required' });
    }
    if (!Number.isInteger(repayment) || repayment < 1 || repayment > 24) {
      return res.status(400).json({ success: false, message: 'repayment_term_months must be between 1 and 24' });
    }

    await promisePool.query(
      `UPDATE shule_avance_requests
       SET amount_rwf = ?, purpose = ?, repayment_term_months = ?, vendor_label = ?, details = ?, invoice_file_name = ?
       WHERE id = ? AND school_id = ? AND teacher_user_id = ?`,
      [amount, purpose, repayment, vendorLabel || null, details || null, invoiceFileName || null, id, schoolId, userId]
    );

    res.json({ success: true, message: 'Request updated successfully' });
  } catch (error) {
    console.error('[shule-avance] teacher update:', error.message);
    res.status(500).json({ success: false, message: 'Failed to update request' });
  }
});

router.delete('/shule-avance/teacher/requests/:id', requireRole(ROLE_TEACHER), async (req, res) => {
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
        message: 'Request not found or cannot be deleted after accountant review',
      });
    }
    res.json({ success: true, message: 'Request deleted successfully' });
  } catch (error) {
    console.error('[shule-avance] teacher delete:', error.message);
    res.status(500).json({ success: false, message: 'Failed to delete request' });
  }
});

// Accountant stage
router.get('/shule-avance/finance/pending-invoices', requireRole(ROLE_ACCOUNTANT), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const [rows] = await promisePool.query(
      `SELECT r.id, r.school_id, r.teacher_user_id, r.amount_rwf, r.purpose, r.repayment_term_months,
              r.vendor_label, r.details, r.invoice_file_name, r.status, r.accountant_note, r.submitted_at,
              TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))) AS staff_name
       FROM shule_avance_requests r
       LEFT JOIN users u ON u.id = r.teacher_user_id
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
    const note = String(req.body?.note || '').trim();
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
    res.json({ success: true, message: 'Request rejected by accountant' });
  } catch (error) {
    console.error('[shule-avance] finance reject:', error.message);
    res.status(500).json({ success: false, message: 'Failed to reject request' });
  }
});

// Manager stage
router.get('/shule-avance/manager/pending-requests', requireRole(MANAGER_ROLES), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const [rows] = await promisePool.query(
      `SELECT r.id, r.school_id, r.teacher_user_id, r.amount_rwf, r.purpose, r.repayment_term_months,
              r.vendor_label, r.details, r.invoice_file_name, r.status, r.accountant_note, r.manager_feedback,
              r.submitted_at, r.accountant_reviewed_at, r.manager_reviewed_at,
              TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))) AS staff_name
       FROM shule_avance_requests r
       LEFT JOIN users u ON u.id = r.teacher_user_id
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
    const feedback = String(req.body?.feedback || '').trim();
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
    res.json({ success: true, message: decision === 'approved' ? 'Request approved successfully' : 'Request rejected successfully' });
  } catch (error) {
    console.error('[shule-avance] manager decision:', error.message);
    res.status(500).json({ success: false, message: 'Failed to save manager decision' });
  }
});

// Legacy endpoints for older pages
router.get('/shule-avance/status', async (req, res) => {
  try {
    const { schoolId, userId } = req.ctx;
    const [rows] = await promisePool.query(
      `SELECT id, amount_rwf AS amount_requested, repayment_term_months, purpose, status, submitted_at AS created_at
       FROM shule_avance_requests
       WHERE school_id = ? AND teacher_user_id = ?
       ORDER BY id DESC`,
      [schoolId, userId]
    );
    const active = rows.find((r) => [STATUS.PENDING_ACCOUNTANT, STATUS.SENT_TO_MANAGER].includes(r.status));
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
    const { schoolId, userId } = req.ctx;
    const amount = Number(req.body?.amount_requested ?? req.body?.amount_rwf);
    const purpose = String(req.body?.purpose || req.body?.details || '').trim();
    const repayment = Number(req.body?.repayment_term_months ?? req.body?.repayment_term ?? 6);

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'amount_requested must be greater than zero' });
    }
    if (!purpose) {
      return res.status(400).json({ success: false, message: 'purpose is required' });
    }
    if (!Number.isInteger(repayment) || repayment < 1 || repayment > 24) {
      return res.status(400).json({ success: false, message: 'repayment_term_months must be between 1 and 24' });
    }

    const [result] = await promisePool.query(
      `INSERT INTO shule_avance_requests
       (school_id, teacher_user_id, amount_rwf, purpose, repayment_term_months, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [schoolId, userId, amount, purpose, repayment, STATUS.PENDING_ACCOUNTANT]
    );
    res.status(201).json({ success: true, message: 'Application submitted', id: result.insertId });
  } catch (error) {
    console.error('[shule-avance] legacy apply:', error.message);
    res.status(500).json({ success: false, message: 'Application failed' });
  }
});

router.delete('/shule-avance/cancel/:id', requireRole(ROLE_TEACHER), async (req, res) => {
  try {
    const { schoolId, userId } = req.ctx;
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid request' });
    const [r] = await promisePool.query(
      `DELETE FROM shule_avance_requests
       WHERE id = ? AND teacher_user_id = ? AND school_id = ? AND status = ?`,
      [id, userId, schoolId, STATUS.PENDING_ACCOUNTANT]
    );
    if (!r.affectedRows) return res.status(404).json({ success: false, message: 'Nothing to cancel' });
    res.json({ success: true, message: 'Cancelled' });
  } catch (error) {
    console.error('[shule-avance] legacy cancel:', error.message);
    res.status(500).json({ success: false, message: 'Cancel failed' });
  }
});

module.exports = router;
