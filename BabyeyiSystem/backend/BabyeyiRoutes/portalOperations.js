'use strict';

const express = require('express');
const { promisePool } = require('../config/database');

const router = express.Router();

const ALL_SCHOOL_ROLES = [
  'TEACHER',
  'HOD',
  'DOS',
  'ACCOUNTANT',
  'SCHOOL_ADMIN',
  'SCHOOL_MANAGER',
  'STORE_MANAGER',
  'STOREKEEPER',
  'LIBRARIAN',
  'DISCIPLINE_STAFF',
];
const TEACHER_REQ_READ_ROLES = ['TEACHER', 'HOD', 'DOS', 'SCHOOL_ADMIN', 'SCHOOL_MANAGER', 'ACCOUNTANT'];
const TEACHER_REQ_WRITE_ROLES = ['TEACHER', 'HOD'];
const ACCOUNTANT_READ_ROLES = ['ACCOUNTANT', 'SCHOOL_ADMIN', 'SCHOOL_MANAGER'];
const ACCOUNTANT_WRITE_ROLES = ['ACCOUNTANT', 'SCHOOL_ADMIN', 'SCHOOL_MANAGER'];
const STORE_READ_ROLES = ['STORE_MANAGER', 'STOREKEEPER', 'ACCOUNTANT', 'SCHOOL_ADMIN', 'SCHOOL_MANAGER'];
const STORE_WRITE_ROLES = ['STORE_MANAGER', 'STOREKEEPER'];
const ADMIN_AUDIT_ROLES = ['SCHOOL_ADMIN', 'SCHOOL_MANAGER'];

let tablesReady = false;
const PORTAL_OPS_PREFIX_RE = /^\/(teacher-portal\/requisitions|accountant\/(?:requisitions|expenses|payroll)|store\/(?:requisitions|inventory|suppliers|movements)|admin\/portal-audit-logs|tools\/ticha-ai)(\/|$)/i;

function resolveUserId(req) {
  return req.session?.userId || req.session?.user?.id || req.user?.id || null;
}

function resolveRoleCode(req) {
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

function requireAuth(req, res, next) {
  const userId = resolveUserId(req);
  const schoolId = resolveSchoolId(req);
  if (!userId) return res.status(401).json({ success: false, message: 'Not authenticated' });
  if (!schoolId) return res.status(400).json({ success: false, message: 'No school linked' });
  req.ctx = { userId, schoolId, roleCode: resolveRoleCode(req) };
  next();
}

function requireRole(allowed) {
  const allowedRoles = Array.isArray(allowed) ? allowed : [allowed];
  return (req, res, next) => {
    const role = req.ctx?.roleCode || '';
    if (!allowedRoles.includes(role)) {
      return res.status(403).json({
        success: false,
        message: `Role "${role || 'UNKNOWN'}" cannot access this endpoint`,
      });
    }
    next();
  };
}

function toMoney(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function toDateOrNow(v) {
  const d = v ? new Date(v) : new Date();
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

function parseDateStart(v) {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
}

function parseDateEnd(v) {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(23, 59, 59, 999);
  return d;
}

function portalPrefixFilter(portalRaw) {
  const portal = String(portalRaw || '').trim().toLowerCase();
  if (!portal) return null;
  if (portal === 'teacher') return '/teacher-portal/%';
  if (portal === 'accountant') return '/accountant/%';
  if (portal === 'manager') return '/manager/%';
  if (portal === 'store' || portal === 'storekeeper') return '/store/%';
  if (portal === 'tools') return '/tools/%';
  if (portal === 'admin') return '/admin/%';
  return null;
}

async function appendAuditLog({
  schoolId,
  userId,
  roleCode,
  endpoint,
  entityType,
  entityId,
  action,
  afterState,
}) {
  try {
    await promisePool.query(
      `INSERT INTO portal_operation_audit_logs
       (school_id, user_id, role_code, endpoint, entity_type, entity_id, action_name, after_state_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        schoolId,
        userId || null,
        roleCode || null,
        endpoint || null,
        entityType || null,
        entityId != null ? String(entityId) : null,
        action || null,
        afterState ? JSON.stringify(afterState) : null,
      ]
    );
  } catch (e) {
    console.warn('[portalOperations] audit log skipped:', e.message);
  }
}

async function ensureTables() {
  if (tablesReady) return;

  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS portal_requisitions (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      created_by_user_id INT UNSIGNED NOT NULL,
      item_id INT UNSIGNED NULL,
      quantity_requested DECIMAL(14,2) NOT NULL DEFAULT 0,
      dept VARCHAR(120) NULL,
      requester VARCHAR(180) NULL,
      purpose TEXT NULL,
      priority_level VARCHAR(16) NULL,
      expected_return_date DATE NULL,
      items TEXT NOT NULL,
      amount_rwf DECIMAL(14,2) NOT NULL DEFAULT 0,
      submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      approved_at DATETIME NULL,
      issued_at DATETIME NULL,
      returned_at DATETIME NULL,
      status_note TEXT NULL,
      attachment_name VARCHAR(255) NULL,
      note TEXT NULL,
      status VARCHAR(32) NOT NULL DEFAULT 'pending',
      source_portal VARCHAR(32) NOT NULL DEFAULT 'teacher',
      deleted_at DATETIME NULL,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_req_school (school_id),
      KEY idx_req_status (status),
      KEY idx_req_source (source_portal)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS accountant_expenses (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      created_by_user_id INT UNSIGNED NOT NULL,
      category VARCHAR(120) NULL,
      title VARCHAR(220) NULL,
      vendor VARCHAR(220) NULL,
      amount_rwf DECIMAL(14,2) NOT NULL DEFAULT 0,
      due_date DATE NULL,
      status VARCHAR(32) NOT NULL DEFAULT 'pending',
      note TEXT NULL,
      deleted_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_exp_school (school_id),
      KEY idx_exp_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS accountant_expense_payments (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      expense_id INT UNSIGNED NOT NULL,
      recorded_by_user_id INT UNSIGNED NOT NULL,
      amount_rwf DECIMAL(14,2) NOT NULL DEFAULT 0,
      method VARCHAR(80) NULL,
      reference VARCHAR(180) NULL,
      note TEXT NULL,
      paid_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL,
      KEY idx_exp_pay_school (school_id),
      KEY idx_exp_pay_expense (expense_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS accountant_payroll_rates (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      role_code VARCHAR(64) NOT NULL,
      base_rwf DECIMAL(14,2) NOT NULL DEFAULT 0,
      allowance_rwf DECIMAL(14,2) NOT NULL DEFAULT 0,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_payroll_rate_school_role (school_id, role_code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS accountant_payroll_staff_overrides (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      user_id INT UNSIGNED NOT NULL,
      rate_role_code VARCHAR(64) NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_payroll_staff_override (school_id, user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS accountant_payroll_runs (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      triggered_by_user_id INT UNSIGNED NOT NULL,
      run_period VARCHAR(32) NOT NULL,
      status VARCHAR(24) NOT NULL DEFAULT 'processed',
      gross_total_rwf DECIMAL(14,2) NOT NULL DEFAULT 0,
      staff_count INT UNSIGNED NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_payroll_runs_school (school_id),
      KEY idx_payroll_runs_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS accountant_payroll_run_lines (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      run_id INT UNSIGNED NOT NULL,
      school_id INT UNSIGNED NOT NULL,
      user_id INT UNSIGNED NULL,
      staff_name VARCHAR(180) NOT NULL,
      dept VARCHAR(120) NULL,
      role_code VARCHAR(64) NULL,
      gross_rwf DECIMAL(14,2) NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_payroll_line_run (run_id),
      KEY idx_payroll_line_school (school_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS accountant_payroll_payments (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      staff_user_id INT UNSIGNED NOT NULL,
      staff_code VARCHAR(64) NULL,
      staff_name VARCHAR(180) NOT NULL,
      role_code VARCHAR(64) NULL,
      department VARCHAR(120) NULL,
      basic_salary_rwf DECIMAL(14,2) NOT NULL DEFAULT 0,
      bonus_rwf DECIMAL(14,2) NOT NULL DEFAULT 0,
      deduction_rwf DECIMAL(14,2) NOT NULL DEFAULT 0,
      net_salary_rwf DECIMAL(14,2) NOT NULL DEFAULT 0,
      pay_month TINYINT UNSIGNED NOT NULL,
      pay_year SMALLINT UNSIGNED NOT NULL,
      payment_date DATE NOT NULL,
      payment_status VARCHAR(32) NOT NULL DEFAULT 'paid',
      payment_method VARCHAR(80) NULL,
      note TEXT NULL,
      created_by_user_id INT UNSIGNED NOT NULL,
      deleted_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_payroll_pay_school (school_id),
      KEY idx_payroll_pay_staff (staff_user_id),
      KEY idx_payroll_pay_period (pay_year, pay_month),
      KEY idx_payroll_pay_status (payment_status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS store_inventory_items (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      name VARCHAR(220) NOT NULL,
      category VARCHAR(120) NULL,
      term VARCHAR(32) NULL,
      academic_year VARCHAR(64) NULL,
      unit VARCHAR(40) NULL,
      quantity DECIMAL(14,2) NOT NULL DEFAULT 0,
      reorder_level DECIMAL(14,2) NOT NULL DEFAULT 0,
      unit_cost DECIMAL(14,2) NOT NULL DEFAULT 0,
      location VARCHAR(180) NULL,
      note TEXT NULL,
      deleted_at DATETIME NULL,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_store_item_school (school_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS store_suppliers (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      name VARCHAR(220) NOT NULL,
      contact_person VARCHAR(180) NULL,
      phone VARCHAR(40) NULL,
      email VARCHAR(180) NULL,
      address TEXT NULL,
      categories VARCHAR(255) NULL,
      note TEXT NULL,
      deleted_at DATETIME NULL,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_store_sup_school (school_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS store_movements (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      item_id INT UNSIGNED NULL,
      type VARCHAR(32) NOT NULL,
      term VARCHAR(32) NULL,
      academic_year VARCHAR(64) NULL,
      movement_date DATE NULL,
      quantity DECIMAL(14,2) NOT NULL DEFAULT 0,
      stock_after DECIMAL(14,2) NOT NULL DEFAULT 0,
      unit_cost DECIMAL(14,2) NULL,
      ref VARCHAR(160) NULL,
      note TEXT NULL,
      created_by_user_id INT UNSIGNED NOT NULL,
      deleted_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_store_mov_school (school_id),
      KEY idx_store_mov_item (item_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS portal_ticha_ai_history (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      user_id INT UNSIGNED NOT NULL,
      prompt TEXT NOT NULL,
      response TEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_ai_school_user (school_id, user_id),
      KEY idx_ai_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS portal_operation_audit_logs (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NULL,
      user_id INT UNSIGNED NULL,
      role_code VARCHAR(64) NULL,
      endpoint VARCHAR(180) NULL,
      entity_type VARCHAR(64) NULL,
      entity_id VARCHAR(80) NULL,
      action_name VARCHAR(80) NULL,
      after_state_json JSON NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_portal_audit_school (school_id),
      KEY idx_portal_audit_entity (entity_type, entity_id),
      KEY idx_portal_audit_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await promisePool.query(`ALTER TABLE portal_requisitions ADD COLUMN deleted_at DATETIME NULL`).catch(() => {});
  await promisePool.query(`ALTER TABLE portal_requisitions ADD COLUMN item_id INT UNSIGNED NULL`).catch(() => {});
  await promisePool.query(`ALTER TABLE portal_requisitions ADD COLUMN quantity_requested DECIMAL(14,2) NOT NULL DEFAULT 0`).catch(() => {});
  await promisePool.query(`ALTER TABLE portal_requisitions ADD COLUMN purpose TEXT NULL`).catch(() => {});
  await promisePool.query(`ALTER TABLE portal_requisitions ADD COLUMN priority_level VARCHAR(16) NULL`).catch(() => {});
  await promisePool.query(`ALTER TABLE portal_requisitions ADD COLUMN expected_return_date DATE NULL`).catch(() => {});
  await promisePool.query(`ALTER TABLE portal_requisitions ADD COLUMN approved_at DATETIME NULL`).catch(() => {});
  await promisePool.query(`ALTER TABLE portal_requisitions ADD COLUMN issued_at DATETIME NULL`).catch(() => {});
  await promisePool.query(`ALTER TABLE portal_requisitions ADD COLUMN returned_at DATETIME NULL`).catch(() => {});
  await promisePool.query(`ALTER TABLE portal_requisitions ADD COLUMN status_note TEXT NULL`).catch(() => {});
  await promisePool.query(`ALTER TABLE accountant_expenses ADD COLUMN deleted_at DATETIME NULL`).catch(() => {});
  await promisePool.query(`ALTER TABLE accountant_expense_payments ADD COLUMN deleted_at DATETIME NULL`).catch(() => {});
  await promisePool.query(`ALTER TABLE accountant_payroll_payments ADD COLUMN deleted_at DATETIME NULL`).catch(() => {});
  await promisePool.query(`ALTER TABLE store_inventory_items ADD COLUMN deleted_at DATETIME NULL`).catch(() => {});
  await promisePool.query(`ALTER TABLE store_inventory_items ADD COLUMN term VARCHAR(32) NULL`).catch(() => {});
  await promisePool.query(`ALTER TABLE store_inventory_items ADD COLUMN academic_year VARCHAR(64) NULL`).catch(() => {});
  await promisePool.query(`ALTER TABLE store_suppliers ADD COLUMN deleted_at DATETIME NULL`).catch(() => {});
  await promisePool.query(`ALTER TABLE store_movements ADD COLUMN deleted_at DATETIME NULL`).catch(() => {});
  await promisePool.query(`ALTER TABLE store_movements ADD COLUMN term VARCHAR(32) NULL`).catch(() => {});
  await promisePool.query(`ALTER TABLE store_movements ADD COLUMN academic_year VARCHAR(64) NULL`).catch(() => {});
  await promisePool.query(`ALTER TABLE store_movements ADD COLUMN movement_date DATE NULL`).catch(() => {});
  await promisePool.query(`ALTER TABLE store_movements ADD COLUMN stock_after DECIMAL(14,2) NOT NULL DEFAULT 0`).catch(() => {});

  tablesReady = true;
}

function isPortalOpsPath(req) {
  const original = String(req.originalUrl || '').split('?')[0];
  if (/^\/api\//i.test(original)) {
    const withoutApi = original.replace(/^\/api/i, '');
    return PORTAL_OPS_PREFIX_RE.test(withoutApi);
  }
  const pathOnly = String(req.path || req.url || '').split('?')[0];
  return PORTAL_OPS_PREFIX_RE.test(pathOnly);
}

router.use((req, _res, next) => {
  if (!isPortalOpsPath(req)) return next('router');
  return next();
});

router.use(requireAuth);
router.use(async (_req, res, next) => {
  try {
    await ensureTables();
    next();
  } catch (e) {
    console.error('[portalOperations] init:', e.message);
    res.status(500).json({ success: false, message: 'Failed to initialize portal operations storage' });
  }
});

// -------------------- Requisitions --------------------
const REQUISITION_STATUSES = ['pending', 'approved', 'rejected', 'issued', 'returned', 'cancelled'];

function canOnlySeeOwnTeacherRequests(roleCode = '') {
  const rc = String(roleCode || '').toUpperCase();
  return rc === 'TEACHER' || rc === 'HOD';
}

function requisitionRowToDto(r) {
  const qty = Number(r.quantity_requested || 0);
  const amount = Number(r.amount_rwf || 0);
  return {
    db_id: r.id,
    id: `REQ-${r.id}`,
    item_id: r.item_id ? Number(r.item_id) : null,
    item_name: r.item_name || '',
    qty: qty > 0 ? qty : 0,
    dept: r.dept || 'General',
    requester: r.requester || 'Unknown',
    items: r.items || '',
    purpose: r.purpose || '',
    priority_level: r.priority_level || '',
    expected_return_date: r.expected_return_date || null,
    amount,
    submitted: r.submitted_at,
    approved_at: r.approved_at || null,
    issued_at: r.issued_at || null,
    returned_at: r.returned_at || null,
    status_note: r.status_note || '',
    attachmentName: r.attachment_name || '',
    note: r.note || '',
    status: r.status || 'pending',
    source_portal: r.source_portal || 'teacher',
  };
}

router.get('/teacher-portal/inventory-equipment', requireRole(TEACHER_REQ_READ_ROLES), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const q = String(req.query?.q || '').trim().toLowerCase();
    const [rows] = await promisePool.query(
      `SELECT id, name, category, unit, quantity, reorder_level
       FROM store_inventory_items
       WHERE school_id = ? AND deleted_at IS NULL
       ORDER BY name ASC
       LIMIT 500`,
      [schoolId]
    );
    const list = (rows || [])
      .map((r) => {
        const quantity = Number(r.quantity || 0);
        const reorder = Number(r.reorder_level || 0);
        const availability = quantity <= 0 ? 'out_of_stock' : (reorder > 0 && quantity <= reorder ? 'low_stock' : 'available');
        return {
          id: r.id,
          name: r.name || '',
          category: r.category || '',
          unit: r.unit || 'pcs',
          quantity,
          availability,
        };
      })
      .filter((r) => !q || r.name.toLowerCase().includes(q) || String(r.category || '').toLowerCase().includes(q));
    res.json({ success: true, data: list });
  } catch (e) {
    console.error('[teacher-portal/inventory-equipment GET]:', e.message);
    res.status(500).json({ success: false, message: 'Failed to load equipment from store inventory' });
  }
});

router.get('/teacher-portal/requisitions', requireRole(TEACHER_REQ_READ_ROLES), async (req, res) => {
  try {
    const { schoolId, userId, roleCode } = req.ctx;
    const status = String(req.query?.status || '').trim().toLowerCase();
    const fromDate = String(req.query?.from || '').trim();
    const toDate = String(req.query?.to || '').trim();
    const itemId = Number(req.query?.item_id);
    const where = ['r.school_id = ?', 'r.deleted_at IS NULL'];
    const params = [schoolId];
    if (canOnlySeeOwnTeacherRequests(roleCode)) {
      where.push('r.created_by_user_id = ?');
      params.push(userId);
    }
    if (status && REQUISITION_STATUSES.includes(status)) {
      where.push('r.status = ?');
      params.push(status);
    }
    if (itemId > 0) {
      where.push('r.item_id = ?');
      params.push(itemId);
    }
    if (fromDate) {
      where.push('DATE(r.submitted_at) >= ?');
      params.push(fromDate);
    }
    if (toDate) {
      where.push('DATE(r.submitted_at) <= ?');
      params.push(toDate);
    }
    const [rows] = await promisePool.query(
      `SELECT r.id, r.item_id, i.name AS item_name, r.quantity_requested, r.dept, r.requester, r.items, r.purpose,
              r.priority_level, r.expected_return_date, r.amount_rwf, r.submitted_at, r.approved_at, r.issued_at, r.returned_at,
              r.status_note, r.attachment_name, r.note, r.status, r.source_portal
       FROM portal_requisitions r
       LEFT JOIN store_inventory_items i ON i.id = r.item_id AND i.school_id = r.school_id AND i.deleted_at IS NULL
       WHERE ${where.join(' AND ')}
       ORDER BY r.id DESC`,
      params
    );
    res.json({ success: true, data: rows.map(requisitionRowToDto) });
  } catch (e) {
    console.error('[teacher-portal/requisitions GET]:', e.message);
    res.status(500).json({ success: false, message: 'Failed to load requisitions' });
  }
});

router.post('/teacher-portal/requisitions', requireRole(TEACHER_REQ_WRITE_ROLES), async (req, res) => {
  try {
    const { schoolId, userId } = req.ctx;
    const payload = req.body || {};
    const rawItemId = Number(payload.item_id);
    const rawQty = toMoney(payload.quantity_requested || payload.qty);
    const itemPayloadProvided = payload.item_id != null || payload.quantity_requested != null || payload.qty != null;
    const hasInventorySelection = rawItemId > 0 && rawQty > 0;
    if (itemPayloadProvided && !hasInventorySelection) {
      return res.status(400).json({ success: false, message: 'item and quantity must both be provided together' });
    }
    const itemId = hasInventorySelection ? rawItemId : null;
    const qty = hasInventorySelection ? rawQty : 0;
    const dept = String(payload.dept || '').trim() || 'General';
    const requester = String(payload.requester || '').trim() || 'Teacher';
    const purpose = String(payload.purpose || '').trim() || null;
    const priorityLevelRaw = String(payload.priority_level || '').trim().toLowerCase();
    const priorityLevel = ['low', 'medium', 'high'].includes(priorityLevelRaw) ? priorityLevelRaw : 'medium';
    const expectedReturnDate = payload.expected_return_date ? toDateOrNow(payload.expected_return_date) : null;
    const items = String(payload.items || '').trim();
    let amount = toMoney(payload.amount || payload.amount_requested);
    const submitted = toDateOrNow(payload.submitted);
    const attachmentName = String(payload.attachmentName || '').trim() || null;
    const note = String(payload.note || '').trim() || null;
    let computedItems = items;
    if (hasInventorySelection) {
      const [[inv]] = await promisePool.query(
        `SELECT id, name, quantity, unit_cost
         FROM store_inventory_items
         WHERE id = ? AND school_id = ? AND deleted_at IS NULL
         LIMIT 1`,
        [itemId, schoolId]
      );
      if (!inv) return res.status(404).json({ success: false, message: 'Selected equipment was not found in stock' });
      const available = Number(inv.quantity || 0);
      if (qty > available) {
        return res.status(400).json({ success: false, message: `Requested quantity exceeds stock. Available: ${available}` });
      }
      computedItems = items || String(inv.name || '').trim() || 'Equipment request';
      if (!amount || amount <= 0) amount = toMoney(qty * Number(inv.unit_cost || 0));
    } else {
      if (!computedItems) {
        return res.status(400).json({ success: false, message: 'items description is required when no equipment is selected' });
      }
      if (!amount || amount < 0) amount = 0;
    }

    const [r] = await promisePool.query(
      `INSERT INTO portal_requisitions
       (school_id, created_by_user_id, item_id, quantity_requested, dept, requester, purpose, priority_level, expected_return_date,
        items, amount_rwf, submitted_at, attachment_name, note, status, source_portal)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'teacher')`,
      [schoolId, userId, itemId, qty, dept, requester, purpose, priorityLevel, expectedReturnDate, computedItems, amount, submitted, attachmentName, note]
    );
    await appendAuditLog({
      schoolId,
      userId,
      roleCode: req.ctx.roleCode,
      endpoint: '/teacher-portal/requisitions',
      entityType: 'requisition',
      entityId: r.insertId,
      action: 'create',
      afterState: { status: 'pending', source_portal: 'teacher', item_id: itemId, qty, amount_rwf: amount },
    });
    res.status(201).json({ success: true, message: 'Requisition submitted', id: r.insertId });
  } catch (e) {
    console.error('[teacher-portal/requisitions POST]:', e.message);
    res.status(500).json({ success: false, message: 'Failed to create requisition' });
  }
});

router.patch('/teacher-portal/requisitions/:id', requireRole(TEACHER_REQ_WRITE_ROLES), async (req, res) => {
  try {
    const { schoolId, userId } = req.ctx;
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid requisition id' });
    const payload = req.body || {};

    const [[existing]] = await promisePool.query(
      `SELECT id, item_id, quantity_requested, items, purpose, priority_level, expected_return_date, attachment_name, note, status
       FROM portal_requisitions
       WHERE id = ? AND school_id = ? AND created_by_user_id = ? AND deleted_at IS NULL
       LIMIT 1`,
      [id, schoolId, userId]
    );
    if (!existing) return res.status(404).json({ success: false, message: 'Requisition not found' });
    if (String(existing.status || '').toLowerCase() !== 'pending') {
      return res.status(409).json({ success: false, message: 'Only pending requisitions can be edited' });
    }

    let itemId = payload.item_id == null ? Number(existing.item_id || 0) : Number(payload.item_id);
    let qty = payload.quantity_requested == null ? Number(existing.quantity_requested || 0) : toMoney(payload.quantity_requested);
    const purpose = payload.purpose == null ? (existing.purpose || null) : (String(payload.purpose || '').trim() || null);
    const priorityLevelRaw = payload.priority_level == null ? String(existing.priority_level || '') : String(payload.priority_level || '');
    const priorityLevel = ['low', 'medium', 'high'].includes(priorityLevelRaw.toLowerCase()) ? priorityLevelRaw.toLowerCase() : 'medium';
    const expectedReturnDate = payload.expected_return_date == null
      ? (existing.expected_return_date || null)
      : (payload.expected_return_date ? toDateOrNow(payload.expected_return_date) : null);
    const items = payload.items == null ? String(existing.items || '').trim() : String(payload.items || '').trim();
    const attachmentName = payload.attachmentName == null
      ? (existing.attachment_name || null)
      : (String(payload.attachmentName || '').trim() || null);
    const note = payload.note == null ? (existing.note || null) : (String(payload.note || '').trim() || null);

    const itemPayloadProvided = payload.item_id != null || payload.quantity_requested != null || payload.qty != null;
    const hasInventorySelection = itemId > 0 && qty > 0;
    if (itemPayloadProvided && !hasInventorySelection) {
      return res.status(400).json({ success: false, message: 'item and quantity must both be provided together' });
    }
    let resolvedItems = items;
    if (hasInventorySelection) {
      const [[inv]] = await promisePool.query(
        `SELECT id, name, quantity
         FROM store_inventory_items
         WHERE id = ? AND school_id = ? AND deleted_at IS NULL
         LIMIT 1`,
        [itemId, schoolId]
      );
      if (!inv) return res.status(404).json({ success: false, message: 'Selected equipment was not found in stock' });
      if (qty > Number(inv.quantity || 0)) {
        return res.status(400).json({ success: false, message: `Requested quantity exceeds stock. Available: ${Number(inv.quantity || 0)}` });
      }
      resolvedItems = items || String(inv.name || '').trim() || 'Equipment request';
    } else {
      itemId = null;
      qty = 0;
      resolvedItems = items || String(existing.items || '').trim();
      if (!resolvedItems) {
        return res.status(400).json({ success: false, message: 'items description is required when no equipment is selected' });
      }
    }

    await promisePool.query(
      `UPDATE portal_requisitions
       SET item_id = ?, quantity_requested = ?, items = ?, purpose = ?, priority_level = ?, expected_return_date = ?, attachment_name = ?, note = ?
       WHERE id = ? AND school_id = ? AND created_by_user_id = ? AND deleted_at IS NULL`,
      [itemId, qty, resolvedItems, purpose, priorityLevel, expectedReturnDate, attachmentName, note, id, schoolId, userId]
    );
    res.json({ success: true, message: 'Requisition updated' });
  } catch (e) {
    console.error('[teacher-portal/requisitions/:id PATCH]:', e.message);
    res.status(500).json({ success: false, message: 'Failed to update requisition' });
  }
});

router.delete('/teacher-portal/requisitions/:id', requireRole(TEACHER_REQ_WRITE_ROLES), async (req, res) => {
  try {
    const { schoolId, userId } = req.ctx;
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid requisition id' });
    const [r] = await promisePool.query(
      `UPDATE portal_requisitions
       SET deleted_at = NOW(), status = 'cancelled'
       WHERE id = ? AND school_id = ? AND created_by_user_id = ? AND deleted_at IS NULL AND status = 'pending'`,
      [id, schoolId, userId]
    );
    if (!r.affectedRows) {
      return res.status(409).json({ success: false, message: 'Only pending requisitions can be cancelled' });
    }
    res.json({ success: true, message: 'Requisition cancelled' });
  } catch (e) {
    console.error('[teacher-portal/requisitions/:id DELETE]:', e.message);
    res.status(500).json({ success: false, message: 'Failed to cancel requisition' });
  }
});

router.get('/reports/requisitions/teacher', requireRole(['DOS', 'ACCOUNTANT', 'SCHOOL_ADMIN', 'SCHOOL_MANAGER', 'STOREKEEPER', 'STORE_MANAGER']), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const status = String(req.query?.status || '').trim().toLowerCase();
    const term = String(req.query?.term || '').trim();
    const academicYear = String(req.query?.academic_year || '').trim();
    const fromDate = String(req.query?.from || '').trim();
    const toDate = String(req.query?.to || '').trim();
    const where = ['r.school_id = ?', 'r.deleted_at IS NULL', "r.source_portal = 'teacher'"];
    const params = [schoolId];
    if (status && REQUISITION_STATUSES.includes(status)) {
      where.push('r.status = ?');
      params.push(status);
    }
    if (term) {
      where.push('i.term = ?');
      params.push(term);
    }
    if (academicYear) {
      where.push('i.academic_year = ?');
      params.push(academicYear);
    }
    if (fromDate) {
      where.push('DATE(r.submitted_at) >= ?');
      params.push(fromDate);
    }
    if (toDate) {
      where.push('DATE(r.submitted_at) <= ?');
      params.push(toDate);
    }

    const [rows] = await promisePool.query(
      `SELECT r.id, r.item_id, i.name AS item_name, i.term, i.academic_year, r.quantity_requested, r.dept, r.requester, r.items, r.purpose,
              r.priority_level, r.expected_return_date, r.amount_rwf, r.submitted_at, r.approved_at, r.issued_at, r.returned_at,
              r.status_note, r.attachment_name, r.note, r.status, r.source_portal
       FROM portal_requisitions r
       LEFT JOIN store_inventory_items i ON i.id = r.item_id AND i.school_id = r.school_id AND i.deleted_at IS NULL
       WHERE ${where.join(' AND ')}
       ORDER BY r.id DESC`,
      params
    );
    const data = rows.map(requisitionRowToDto);
    const summary = {
      total_requests: data.length,
      pending: data.filter((x) => x.status === 'pending').length,
      approved: data.filter((x) => x.status === 'approved').length,
      rejected: data.filter((x) => x.status === 'rejected').length,
      issued: data.filter((x) => x.status === 'issued').length,
      returned: data.filter((x) => x.status === 'returned').length,
    };
    res.json({ success: true, data, summary });
  } catch (e) {
    console.error('[reports/requisitions/teacher GET]:', e.message);
    res.status(500).json({ success: false, message: 'Failed to load teacher requisition report' });
  }
});

router.get('/accountant/requisitions', requireRole(ACCOUNTANT_READ_ROLES), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const sourcePortal = String(req.query?.source_portal || '').trim().toLowerCase();
    const where = ['r.school_id = ?', 'r.deleted_at IS NULL'];
    const params = [schoolId];
    if (sourcePortal) {
      where.push('r.source_portal = ?');
      params.push(sourcePortal);
    }
    const [rows] = await promisePool.query(
      `SELECT r.id, r.item_id, i.name AS item_name, r.quantity_requested, r.dept, r.requester, r.items, r.purpose,
              r.priority_level, r.expected_return_date, r.amount_rwf, r.submitted_at, r.approved_at, r.issued_at, r.returned_at,
              r.status_note, r.attachment_name, r.note, r.status, r.source_portal
       FROM portal_requisitions r
       LEFT JOIN store_inventory_items i ON i.id = r.item_id AND i.school_id = r.school_id AND i.deleted_at IS NULL
       WHERE ${where.join(' AND ')}
       ORDER BY r.id DESC`,
      params
    );
    res.json({ success: true, data: rows.map(requisitionRowToDto) });
  } catch (e) {
    console.error('[accountant/requisitions GET]:', e.message);
    res.status(500).json({ success: false, message: 'Failed to load requisitions' });
  }
});

router.post('/accountant/requisitions', requireRole(ACCOUNTANT_WRITE_ROLES), async (req, res) => {
  try {
    const { schoolId, userId } = req.ctx;
    const payload = req.body || {};
    const dept = String(payload.dept || '').trim() || 'Finance';
    const requester = String(payload.requester || '').trim() || 'Finance Office';
    const items = String(payload.items || '').trim();
    const amount = toMoney(payload.amount);
    const submitted = toDateOrNow(payload.submitted);
    const attachmentName = String(payload.attachmentName || '').trim() || null;
    const note = String(payload.note || '').trim() || null;
    if (!items) return res.status(400).json({ success: false, message: 'items is required' });

    const [r] = await promisePool.query(
      `INSERT INTO portal_requisitions
       (school_id, created_by_user_id, dept, requester, items, amount_rwf, submitted_at, attachment_name, note, status, source_portal)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'accountant')`,
      [schoolId, userId, dept, requester, items, amount, submitted, attachmentName, note]
    );
    await appendAuditLog({
      schoolId,
      userId,
      roleCode: req.ctx.roleCode,
      endpoint: '/accountant/requisitions',
      entityType: 'requisition',
      entityId: r.insertId,
      action: 'create',
      afterState: { status: 'pending', source_portal: 'accountant' },
    });
    res.status(201).json({ success: true, message: 'Requisition created', id: r.insertId });
  } catch (e) {
    console.error('[accountant/requisitions POST]:', e.message);
    res.status(500).json({ success: false, message: 'Failed to create requisition' });
  }
});

router.patch('/accountant/requisitions/:id', requireRole(ACCOUNTANT_WRITE_ROLES), async (req, res) => {
  try {
    const { schoolId, userId, roleCode } = req.ctx;
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid requisition id' });
    const payload = req.body || {};

    const [[existing]] = await promisePool.query(
      `SELECT id, dept, requester, items, amount_rwf, submitted_at, attachment_name, note
       FROM portal_requisitions
       WHERE id = ? AND school_id = ? AND deleted_at IS NULL
       LIMIT 1`,
      [id, schoolId]
    );
    if (!existing) return res.status(404).json({ success: false, message: 'Requisition not found' });

    const dept = String(payload.dept ?? existing.dept ?? 'Finance').trim() || 'Finance';
    const requester = String(payload.requester ?? existing.requester ?? 'Finance Office').trim() || 'Finance Office';
    const items = String(payload.items ?? existing.items ?? '').trim();
    const amount = payload.amount == null ? Number(existing.amount_rwf || 0) : toMoney(payload.amount);
    const submitted = payload.submitted ? toDateOrNow(payload.submitted) : existing.submitted_at;
    const attachmentName = payload.attachmentName == null
      ? (existing.attachment_name || null)
      : (String(payload.attachmentName || '').trim() || null);
    const note = payload.note == null ? (existing.note || null) : (String(payload.note || '').trim() || null);
    if (!items) return res.status(400).json({ success: false, message: 'items is required' });

    await promisePool.query(
      `UPDATE portal_requisitions
       SET dept = ?, requester = ?, items = ?, amount_rwf = ?, submitted_at = ?, attachment_name = ?, note = ?
       WHERE id = ? AND school_id = ? AND deleted_at IS NULL`,
      [dept, requester, items, amount, submitted, attachmentName, note, id, schoolId]
    );
    await appendAuditLog({
      schoolId,
      userId,
      roleCode,
      endpoint: '/accountant/requisitions/:id',
      entityType: 'requisition',
      entityId: id,
      action: 'update',
      afterState: { dept, requester, amount_rwf: amount },
    });
    res.json({ success: true, message: 'Requisition updated' });
  } catch (e) {
    console.error('[accountant/requisitions/:id PATCH]:', e.message);
    res.status(500).json({ success: false, message: 'Failed to update requisition' });
  }
});

router.patch('/accountant/requisitions/:id/status', requireRole(ACCOUNTANT_WRITE_ROLES), async (req, res) => {
  try {
    const { schoolId, userId, roleCode } = req.ctx;
    const id = Number(req.params.id);
    const status = String(req.body?.status || '').toLowerCase();
    const note = String(req.body?.note || '').trim();
    const allowed = ['pending', 'approved', 'rejected', 'issued', 'returned', 'cancelled'];
    if (!id) return res.status(400).json({ success: false, message: 'Invalid requisition id' });
    if (!allowed.includes(status)) return res.status(400).json({ success: false, message: 'Invalid status' });

    const [r] = await promisePool.query(
      `UPDATE portal_requisitions
       SET status = ?,
           approved_at = CASE WHEN ? = 'approved' THEN NOW() ELSE approved_at END,
           issued_at = CASE WHEN ? = 'issued' THEN NOW() ELSE issued_at END,
           returned_at = CASE WHEN ? = 'returned' THEN NOW() ELSE returned_at END,
           note = CASE
         WHEN ? = '' THEN note
         WHEN note IS NULL OR note = '' THEN ?
         ELSE CONCAT(note, '\n[Decision] ', ?)
       END
       WHERE id = ? AND school_id = ? AND deleted_at IS NULL`,
      [status, status, status, status, note, `[Decision] ${note}`, note, id, schoolId]
    );
    if (!r.affectedRows) return res.status(404).json({ success: false, message: 'Requisition not found' });
    await appendAuditLog({
      schoolId,
      userId,
      roleCode,
      endpoint: '/accountant/requisitions/:id/status',
      entityType: 'requisition',
      entityId: id,
      action: 'status_update',
      afterState: { status, note: note || null },
    });
    res.json({ success: true, message: 'Requisition status updated' });
  } catch (e) {
    console.error('[accountant/requisitions/:id/status PATCH]:', e.message);
    res.status(500).json({ success: false, message: 'Failed to update status' });
  }
});

router.patch('/manager/requisitions/:id/decision', requireRole(['SCHOOL_MANAGER', 'SCHOOL_ADMIN']), async (req, res) => {
  try {
    const { schoolId, userId, roleCode } = req.ctx;
    const id = Number(req.params.id);
    const decision = String(req.body?.status || req.body?.decision || '').toLowerCase();
    const note = String(req.body?.note || '').trim();
    if (!id) return res.status(400).json({ success: false, message: 'Invalid requisition id' });
    if (!['approved', 'rejected'].includes(decision)) {
      return res.status(400).json({ success: false, message: 'Decision must be approved or rejected' });
    }

    const [r] = await promisePool.query(
      `UPDATE portal_requisitions
       SET status = ?, note = CASE
         WHEN ? = '' THEN note
         WHEN note IS NULL OR note = '' THEN ?
         ELSE CONCAT(note, '\n[Manager decision] ', ?)
       END
       WHERE id = ? AND school_id = ? AND deleted_at IS NULL AND status IN ('pending', 'pending_approval')`,
      [decision, note, `[Manager decision] ${note}`, note, id, schoolId]
    );
    if (!r.affectedRows) {
      return res.status(409).json({ success: false, message: 'Requisition is not awaiting manager decision' });
    }
    await appendAuditLog({
      schoolId,
      userId,
      roleCode,
      endpoint: '/manager/requisitions/:id/decision',
      entityType: 'requisition',
      entityId: id,
      action: 'manager_decision',
      afterState: { status: decision, note: note || null },
    });
    res.json({ success: true, message: `Requisition ${decision}` });
  } catch (e) {
    console.error('[manager/requisitions/:id/decision PATCH]:', e.message);
    res.status(500).json({ success: false, message: 'Failed to apply manager requisition decision' });
  }
});

router.delete('/accountant/requisitions/:id', requireRole(ACCOUNTANT_WRITE_ROLES), async (req, res) => {
  try {
    const { schoolId, userId, roleCode } = req.ctx;
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid requisition id' });
    const [r] = await promisePool.query(
      `UPDATE portal_requisitions
       SET deleted_at = NOW()
       WHERE id = ? AND school_id = ? AND deleted_at IS NULL`,
      [id, schoolId]
    );
    if (!r.affectedRows) return res.status(404).json({ success: false, message: 'Requisition not found' });
    await appendAuditLog({
      schoolId,
      userId,
      roleCode,
      endpoint: '/accountant/requisitions/:id',
      entityType: 'requisition',
      entityId: id,
      action: 'soft_delete',
      afterState: { deleted_at: true },
    });
    res.json({ success: true, message: 'Requisition deleted' });
  } catch (e) {
    console.error('[accountant/requisitions/:id DELETE]:', e.message);
    res.status(500).json({ success: false, message: 'Failed to delete requisition' });
  }
});

router.get('/store/requisitions', requireRole(STORE_READ_ROLES), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const sourcePortal = String(req.query?.source_portal || '').trim().toLowerCase();
    const where = ['r.school_id = ?', 'r.deleted_at IS NULL'];
    const params = [schoolId];
    if (sourcePortal) {
      where.push('r.source_portal = ?');
      params.push(sourcePortal);
    }
    const [rows] = await promisePool.query(
      `SELECT r.id, r.item_id, i.name AS item_name, r.quantity_requested, r.dept, r.requester, r.items, r.purpose,
              r.priority_level, r.expected_return_date, r.amount_rwf, r.submitted_at, r.approved_at, r.issued_at, r.returned_at,
              r.status_note, r.attachment_name, r.note, r.status, r.source_portal
       FROM portal_requisitions r
       LEFT JOIN store_inventory_items i ON i.id = r.item_id AND i.school_id = r.school_id AND i.deleted_at IS NULL
       WHERE ${where.join(' AND ')}
       ORDER BY r.id DESC`,
      params
    );
    res.json({ success: true, data: rows.map(requisitionRowToDto) });
  } catch (e) {
    console.error('[store/requisitions GET]:', e.message);
    res.status(500).json({ success: false, message: 'Failed to load requisitions' });
  }
});

router.patch('/store/requisitions/:id/status', requireRole(STORE_WRITE_ROLES), async (req, res) => {
  const conn = await promisePool.getConnection();
  try {
    const { schoolId } = req.ctx;
    const id = Number(req.params.id);
    const status = String(req.body?.status || '').toLowerCase();
    const note = String(req.body?.note || '').trim();
    const allowed = ['pending', 'approved', 'rejected', 'issued', 'returned', 'cancelled'];
    if (!id) return res.status(400).json({ success: false, message: 'Invalid requisition id' });
    if (!allowed.includes(status)) return res.status(400).json({ success: false, message: 'Invalid status' });

    await conn.beginTransaction();
    const [[reqRow]] = await conn.query(
      `SELECT id, item_id, quantity_requested, status
       FROM portal_requisitions
       WHERE id = ? AND school_id = ? AND deleted_at IS NULL
       LIMIT 1`,
      [id, schoolId]
    );
    if (!reqRow) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Requisition not found' });
    }

    const prevStatus = String(reqRow.status || '').toLowerCase();
    const itemId = Number(reqRow.item_id || 0);
    const qty = Number(reqRow.quantity_requested || 0);
    if ((status === 'issued' || status === 'returned') && itemId > 0 && qty > 0) {
      const [[inv]] = await conn.query(
        `SELECT id, quantity
         FROM store_inventory_items
         WHERE id = ? AND school_id = ? AND deleted_at IS NULL
         LIMIT 1`,
        [itemId, schoolId]
      );
      if (!inv) {
        await conn.rollback();
        return res.status(404).json({ success: false, message: 'Inventory item linked to requisition was not found' });
      }
      const currentQty = Number(inv.quantity || 0);
      let nextQty = currentQty;
      if (status === 'issued' && prevStatus !== 'issued') {
        if (qty > currentQty) {
          await conn.rollback();
          return res.status(400).json({ success: false, message: `Insufficient stock to issue requisition. Available: ${currentQty}` });
        }
        nextQty = currentQty - qty;
      } else if (status === 'returned' && prevStatus !== 'returned') {
        nextQty = currentQty + qty;
      }
      if (nextQty !== currentQty) {
        await conn.query(
          `UPDATE store_inventory_items
           SET quantity = ?
           WHERE id = ? AND school_id = ? AND deleted_at IS NULL`,
          [nextQty, itemId, schoolId]
        );
      }
    }

    const [r] = await conn.query(
      `UPDATE portal_requisitions
       SET status = ?,
           approved_at = CASE WHEN ? = 'approved' THEN NOW() ELSE approved_at END,
           issued_at = CASE WHEN ? = 'issued' THEN NOW() ELSE issued_at END,
           returned_at = CASE WHEN ? = 'returned' THEN NOW() ELSE returned_at END,
           status_note = CASE
             WHEN ? = '' THEN status_note
             WHEN status_note IS NULL OR status_note = '' THEN ?
             ELSE CONCAT(status_note, '\n', ?)
           END
       WHERE id = ? AND school_id = ? AND deleted_at IS NULL`,
      [status, status, status, status, note, note, note, id, schoolId]
    );
    if (!r.affectedRows) return res.status(404).json({ success: false, message: 'Requisition not found' });

    await conn.commit();
    await appendAuditLog({
      schoolId,
      userId: req.ctx.userId,
      roleCode: req.ctx.roleCode,
      endpoint: '/store/requisitions/:id/status',
      entityType: 'requisition',
      entityId: id,
      action: 'status_update',
      afterState: { status, note: note || null },
    });
    res.json({ success: true, message: 'Requisition status updated' });
  } catch (e) {
    await conn.rollback().catch(() => {});
    console.error('[store/requisitions/:id/status PATCH]:', e.message);
    res.status(500).json({ success: false, message: 'Failed to update status' });
  } finally {
    conn.release();
  }
});

// -------------------- Expenses --------------------
router.get('/accountant/expenses', requireRole(ACCOUNTANT_READ_ROLES), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const [rows] = await promisePool.query(
      `SELECT id, category, title, vendor, amount_rwf, due_date, status, note, created_at
       FROM accountant_expenses
       WHERE school_id = ? AND deleted_at IS NULL
       ORDER BY id DESC`,
      [schoolId]
    );
    const [payments] = await promisePool.query(
      `SELECT id, expense_id, amount_rwf, method, reference, note, paid_at
       FROM accountant_expense_payments
       WHERE school_id = ? AND deleted_at IS NULL
       ORDER BY id DESC`,
      [schoolId]
    );
    const byExpense = new Map();
    for (const p of payments) {
      const list = byExpense.get(p.expense_id) || [];
      list.push({
        id: `PAY-${p.id}`,
        amount: Number(p.amount_rwf || 0),
        method: p.method || '',
        reference: p.reference || '',
        note: p.note || '',
        date: p.paid_at,
      });
      byExpense.set(p.expense_id, list);
    }

    res.json({
      success: true,
      data: rows.map((r) => ({
        db_id: r.id,
        id: `EXP-${r.id}`,
        category: r.category || 'General',
        title: r.title || '',
        vendor: r.vendor || '',
        amount: Number(r.amount_rwf || 0),
        due_date: r.due_date,
        status: r.status || 'pending',
        note: r.note || '',
        created_at: r.created_at,
        payments: byExpense.get(r.id) || [],
      })),
    });
  } catch (e) {
    console.error('[accountant/expenses GET]:', e.message);
    res.status(500).json({ success: false, message: 'Failed to load expenses' });
  }
});

router.post('/accountant/expenses', requireRole(ACCOUNTANT_WRITE_ROLES), async (req, res) => {
  try {
    const { schoolId, userId } = req.ctx;
    const payload = req.body || {};
    const category = String(payload.category || '').trim() || 'General';
    const title = String(payload.title || payload.item || '').trim() || 'Expense';
    const vendor = String(payload.vendor || '').trim() || '';
    const amount = toMoney(payload.amount);
    const dueDate = payload.due_date ? new Date(payload.due_date) : null;
    const note = String(payload.note || '').trim() || null;
    if (!amount || amount <= 0) return res.status(400).json({ success: false, message: 'amount must be greater than zero' });

    const [r] = await promisePool.query(
      `INSERT INTO accountant_expenses
       (school_id, created_by_user_id, category, title, vendor, amount_rwf, due_date, status, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [schoolId, userId, category, title, vendor, amount, dueDate && !Number.isNaN(dueDate.getTime()) ? dueDate : null, note]
    );
    await appendAuditLog({
      schoolId,
      userId,
      roleCode: req.ctx.roleCode,
      endpoint: '/accountant/expenses',
      entityType: 'expense',
      entityId: r.insertId,
      action: 'create',
      afterState: { status: 'pending', amount_rwf: amount },
    });
    res.status(201).json({ success: true, message: 'Expense created', id: r.insertId });
  } catch (e) {
    console.error('[accountant/expenses POST]:', e.message);
    res.status(500).json({ success: false, message: 'Failed to create expense' });
  }
});

router.patch('/accountant/expenses/:id/status', requireRole(ACCOUNTANT_WRITE_ROLES), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const id = Number(req.params.id);
    const status = String(req.body?.status || '').toLowerCase();
    const allowed = ['pending', 'pending_approval', 'approved', 'rejected', 'paid'];
    if (!id) return res.status(400).json({ success: false, message: 'Invalid expense id' });
    if (!allowed.includes(status)) return res.status(400).json({ success: false, message: 'Invalid status' });

    const [r] = await promisePool.query(
      `UPDATE accountant_expenses
       SET status = ?
       WHERE id = ? AND school_id = ? AND deleted_at IS NULL`,
      [status, id, schoolId]
    );
    if (!r.affectedRows) return res.status(404).json({ success: false, message: 'Expense not found' });
    await appendAuditLog({
      schoolId,
      userId: req.ctx.userId,
      roleCode: req.ctx.roleCode,
      endpoint: '/accountant/expenses/:id/status',
      entityType: 'expense',
      entityId: id,
      action: 'status_update',
      afterState: { status },
    });
    res.json({ success: true, message: 'Expense status updated' });
  } catch (e) {
    console.error('[accountant/expenses/:id/status PATCH]:', e.message);
    res.status(500).json({ success: false, message: 'Failed to update expense status' });
  }
});

router.patch('/accountant/expenses/:id/request-approval', requireRole(ACCOUNTANT_WRITE_ROLES), async (req, res) => {
  try {
    const { schoolId, userId, roleCode } = req.ctx;
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid expense id' });

    const [r] = await promisePool.query(
      `UPDATE accountant_expenses
       SET status = 'pending_approval'
       WHERE id = ? AND school_id = ? AND deleted_at IS NULL AND status IN ('pending', 'rejected')`,
      [id, schoolId]
    );
    if (!r.affectedRows) {
      return res.status(409).json({ success: false, message: 'Expense cannot be sent for approval in its current status' });
    }

    await appendAuditLog({
      schoolId,
      userId,
      roleCode,
      endpoint: '/accountant/expenses/:id/request-approval',
      entityType: 'expense',
      entityId: id,
      action: 'request_approval',
      afterState: { status: 'pending_approval' },
    });
    res.json({ success: true, message: 'Expense sent to manager for approval' });
  } catch (e) {
    console.error('[accountant/expenses/:id/request-approval PATCH]:', e.message);
    res.status(500).json({ success: false, message: 'Failed to request approval' });
  }
});

router.patch('/manager/expenses/:id/decision', requireRole(['SCHOOL_MANAGER', 'SCHOOL_ADMIN']), async (req, res) => {
  try {
    const { schoolId, userId, roleCode } = req.ctx;
    const id = Number(req.params.id);
    const decision = String(req.body?.status || req.body?.decision || '').toLowerCase();
    const note = String(req.body?.note || '').trim();
    if (!id) return res.status(400).json({ success: false, message: 'Invalid expense id' });
    if (!['approved', 'rejected'].includes(decision)) {
      return res.status(400).json({ success: false, message: 'Decision must be approved or rejected' });
    }

    const [r] = await promisePool.query(
      `UPDATE accountant_expenses
       SET status = ?, note = CASE
         WHEN ? = '' THEN note
         WHEN note IS NULL OR note = '' THEN ?
         ELSE CONCAT(note, '\n[Manager decision] ', ?)
       END
       WHERE id = ? AND school_id = ? AND deleted_at IS NULL AND status = 'pending_approval'`,
      [decision, note, `[Manager decision] ${note}`, note, id, schoolId]
    );
    if (!r.affectedRows) {
      return res.status(409).json({ success: false, message: 'Expense is not awaiting manager decision' });
    }

    await appendAuditLog({
      schoolId,
      userId,
      roleCode,
      endpoint: '/manager/expenses/:id/decision',
      entityType: 'expense',
      entityId: id,
      action: 'manager_decision',
      afterState: { status: decision, note: note || null },
    });
    res.json({ success: true, message: `Expense ${decision}` });
  } catch (e) {
    console.error('[manager/expenses/:id/decision PATCH]:', e.message);
    res.status(500).json({ success: false, message: 'Failed to apply manager decision' });
  }
});

router.post('/accountant/expenses/:id/payments', requireRole(ACCOUNTANT_WRITE_ROLES), async (req, res) => {
  try {
    const { schoolId, userId } = req.ctx;
    const id = Number(req.params.id);
    const payload = req.body || {};
    const amount = toMoney(payload.amount);
    if (!id || amount <= 0) return res.status(400).json({ success: false, message: 'Invalid payment payload' });

    const method = String(payload.method || '').trim() || 'cash';
    const reference = String(payload.reference || '').trim() || null;
    const note = String(payload.note || '').trim() || null;

    const [[exp]] = await promisePool.query(
      `SELECT id FROM accountant_expenses WHERE id = ? AND school_id = ? AND deleted_at IS NULL LIMIT 1`,
      [id, schoolId]
    );
    if (!exp) return res.status(404).json({ success: false, message: 'Expense not found' });

    const [paymentInsert] = await promisePool.query(
      `INSERT INTO accountant_expense_payments
       (school_id, expense_id, recorded_by_user_id, amount_rwf, method, reference, note)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [schoolId, id, userId, amount, method, reference, note]
    );

    const [[sumRow]] = await promisePool.query(
      `SELECT SUM(amount_rwf) AS paid
       FROM accountant_expense_payments
       WHERE school_id = ? AND expense_id = ? AND deleted_at IS NULL`,
      [schoolId, id]
    );
    const paid = Number(sumRow?.paid || 0);
    const [[expAmt]] = await promisePool.query(
      `SELECT amount_rwf
       FROM accountant_expenses
       WHERE id = ? AND school_id = ? AND deleted_at IS NULL
       LIMIT 1`,
      [id, schoolId]
    );
    const total = Number(expAmt?.amount_rwf || 0);
    const nextStatus = paid >= total && total > 0 ? 'paid' : 'approved';
    await promisePool.query(
      `UPDATE accountant_expenses
       SET status = ?
       WHERE id = ? AND school_id = ? AND deleted_at IS NULL`,
      [nextStatus, id, schoolId]
    );

    await appendAuditLog({
      schoolId,
      userId,
      roleCode: req.ctx.roleCode,
      endpoint: '/accountant/expenses/:id/payments',
      entityType: 'expense_payment',
      entityId: paymentInsert.insertId,
      action: 'payment_recorded',
      afterState: { expense_id: id, amount_rwf: amount, method, status: nextStatus },
    });

    res.status(201).json({ success: true, message: 'Expense payment recorded' });
  } catch (e) {
    console.error('[accountant/expenses/:id/payments POST]:', e.message);
    res.status(500).json({ success: false, message: 'Failed to record payment' });
  }
});

router.delete('/accountant/expenses/:id', requireRole(ACCOUNTANT_WRITE_ROLES), async (req, res) => {
  try {
    const { schoolId, userId, roleCode } = req.ctx;
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid expense id' });

    const [r] = await promisePool.query(
      `UPDATE accountant_expenses
       SET deleted_at = NOW()
       WHERE id = ? AND school_id = ? AND deleted_at IS NULL`,
      [id, schoolId]
    );
    if (!r.affectedRows) return res.status(404).json({ success: false, message: 'Expense not found' });

    await promisePool.query(
      `UPDATE accountant_expense_payments
       SET deleted_at = NOW()
       WHERE school_id = ? AND expense_id = ? AND deleted_at IS NULL`,
      [schoolId, id]
    );

    await appendAuditLog({
      schoolId,
      userId,
      roleCode,
      endpoint: '/accountant/expenses/:id',
      entityType: 'expense',
      entityId: id,
      action: 'soft_delete',
      afterState: { deleted_at: true },
    });
    res.json({ success: true, message: 'Expense deleted' });
  } catch (e) {
    console.error('[accountant/expenses/:id DELETE]:', e.message);
    res.status(500).json({ success: false, message: 'Failed to delete expense' });
  }
});

router.delete('/accountant/expenses/:expenseId/payments/:paymentId', requireRole(ACCOUNTANT_WRITE_ROLES), async (req, res) => {
  try {
    const { schoolId, userId, roleCode } = req.ctx;
    const expenseId = Number(req.params.expenseId);
    const paymentId = Number(req.params.paymentId);
    if (!expenseId || !paymentId) {
      return res.status(400).json({ success: false, message: 'Invalid expense or payment id' });
    }

    const [r] = await promisePool.query(
      `UPDATE accountant_expense_payments
       SET deleted_at = NOW()
       WHERE id = ? AND expense_id = ? AND school_id = ? AND deleted_at IS NULL`,
      [paymentId, expenseId, schoolId]
    );
    if (!r.affectedRows) return res.status(404).json({ success: false, message: 'Payment not found' });

    const [[sumRow]] = await promisePool.query(
      `SELECT SUM(amount_rwf) AS paid
       FROM accountant_expense_payments
       WHERE school_id = ? AND expense_id = ? AND deleted_at IS NULL`,
      [schoolId, expenseId]
    );
    const [[expRow]] = await promisePool.query(
      `SELECT amount_rwf
       FROM accountant_expenses
       WHERE id = ? AND school_id = ? AND deleted_at IS NULL
       LIMIT 1`,
      [expenseId, schoolId]
    );
    if (expRow) {
      const paid = Number(sumRow?.paid || 0);
      const total = Number(expRow?.amount_rwf || 0);
      const nextStatus = paid <= 0 ? 'approved' : paid >= total ? 'paid' : 'approved';
      await promisePool.query(
        `UPDATE accountant_expenses
         SET status = ?
         WHERE id = ? AND school_id = ? AND deleted_at IS NULL`,
        [nextStatus, expenseId, schoolId]
      );
    }

    await appendAuditLog({
      schoolId,
      userId,
      roleCode,
      endpoint: '/accountant/expenses/:expenseId/payments/:paymentId',
      entityType: 'expense_payment',
      entityId: paymentId,
      action: 'soft_delete',
      afterState: { expense_id: expenseId, deleted_at: true },
    });
    res.json({ success: true, message: 'Payment deleted' });
  } catch (e) {
    console.error('[accountant/expenses/:expenseId/payments/:paymentId DELETE]:', e.message);
    res.status(500).json({ success: false, message: 'Failed to delete payment' });
  }
});

// -------------------- Payroll --------------------
const PAYROLL_PAYMENT_STATUSES = ['pending', 'paid', 'cancelled'];

router.get('/accountant/payroll/staff/search', requireRole(ACCOUNTANT_READ_ROLES), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const qRaw = String(req.query?.query || req.query?.q || '').trim();
    const q = `%${qRaw}%`;
    const limit = Math.min(50, Math.max(1, Number(req.query?.limit) || 20));

    const [rows] = await promisePool.query(
      `SELECT u.id, u.user_uid, u.first_name, u.last_name, r.role_code,
              COALESCE(o.rate_role_code, r.role_code) AS assigned_role_code,
              COALESCE(pr.base_rwf, 0) AS base_rwf,
              COALESCE(pr.allowance_rwf, 0) AS allowance_rwf
       FROM users u
       LEFT JOIN roles r ON r.id = u.role_id
       LEFT JOIN accountant_payroll_staff_overrides o
              ON o.school_id = u.school_id AND o.user_id = u.id
       LEFT JOIN accountant_payroll_rates pr
              ON pr.school_id = u.school_id AND pr.role_code = COALESCE(o.rate_role_code, r.role_code)
       WHERE u.school_id = ? AND u.deleted_at IS NULL
         AND (
           ? = ''
           OR CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) LIKE ?
           OR COALESCE(u.user_uid, '') LIKE ?
           OR CAST(u.id AS CHAR) LIKE ?
         )
       ORDER BY u.first_name ASC, u.last_name ASC
       LIMIT ?`,
      [schoolId, qRaw, q, q, q, limit]
    );

    res.json({
      success: true,
      data: rows.map((r) => {
        const roleCode = String(r.role_code || 'STAFF').toUpperCase();
        const assignedRole = String(r.assigned_role_code || roleCode).toUpperCase();
        const basicSalary = Number(r.base_rwf || 0);
        const allowance = Number(r.allowance_rwf || 0);
        return {
          staffUserId: Number(r.id),
          staffId: `STF-${r.id}`,
          staffCode: r.user_uid || `STF-${r.id}`,
          fullName: `${r.first_name || ''} ${r.last_name || ''}`.trim() || `User ${r.id}`,
          role: assignedRole,
          position: assignedRole,
          department: roleCode,
          salary: {
            basic: basicSalary,
            allowance,
            grossSuggested: basicSalary + allowance,
          },
        };
      }),
    });
  } catch (e) {
    console.error('[accountant/payroll/staff/search GET]:', e.message);
    res.status(500).json({ success: false, message: 'Failed to search staff' });
  }
});

router.get('/accountant/payroll', requireRole(ACCOUNTANT_READ_ROLES), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const query = String(req.query?.query || '').trim();
    const status = String(req.query?.status || '').trim().toLowerCase();
    const month = Number(req.query?.month || 0);
    const year = Number(req.query?.year || 0);
    const where = ['p.school_id = ?', 'p.deleted_at IS NULL'];
    const params = [schoolId];

    if (query) {
      where.push(`(
        p.staff_name LIKE ?
        OR COALESCE(p.staff_code, '') LIKE ?
        OR CONCAT('PAY-', p.id) LIKE ?
      )`);
      const like = `%${query}%`;
      params.push(like, like, like);
    }
    if (status && PAYROLL_PAYMENT_STATUSES.includes(status)) {
      where.push('p.payment_status = ?');
      params.push(status);
    }
    if (month >= 1 && month <= 12) {
      where.push('p.pay_month = ?');
      params.push(month);
    }
    if (year >= 2000 && year <= 3000) {
      where.push('p.pay_year = ?');
      params.push(year);
    }
    const limit = Math.min(500, Math.max(1, Number(req.query?.limit) || 200));

    const [rows] = await promisePool.query(
      `SELECT p.id, p.staff_user_id, p.staff_code, p.staff_name, p.role_code, p.department,
              p.basic_salary_rwf, p.bonus_rwf, p.deduction_rwf, p.net_salary_rwf,
              p.pay_month, p.pay_year, p.payment_date, p.payment_status, p.payment_method,
              p.note, p.created_by_user_id, p.created_at, p.updated_at,
              u.first_name AS creator_first_name, u.last_name AS creator_last_name
       FROM accountant_payroll_payments p
       LEFT JOIN users u ON u.id = p.created_by_user_id
       WHERE ${where.join(' AND ')}
       ORDER BY p.id DESC
       LIMIT ?`,
      [...params, limit]
    );

    res.json({
      success: true,
      data: rows.map((r) => ({
        db_id: r.id,
        payrollId: `PAY-${r.id}`,
        staffUserId: Number(r.staff_user_id),
        staffId: `STF-${r.staff_user_id}`,
        staffCode: r.staff_code || '',
        staffName: r.staff_name || '',
        role: r.role_code || 'STAFF',
        department: r.department || '',
        basicSalary: Number(r.basic_salary_rwf || 0),
        bonus: Number(r.bonus_rwf || 0),
        deduction: Number(r.deduction_rwf || 0),
        netSalaryPaid: Number(r.net_salary_rwf || 0),
        month: Number(r.pay_month || 0),
        year: Number(r.pay_year || 0),
        paymentDate: r.payment_date,
        paymentStatus: r.payment_status || 'pending',
        paymentMethod: r.payment_method || '',
        note: r.note || '',
        createdBy: {
          userId: Number(r.created_by_user_id || 0),
          name: `${r.creator_first_name || ''} ${r.creator_last_name || ''}`.trim() || 'Accountant',
        },
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      })),
    });
  } catch (e) {
    console.error('[accountant/payroll GET]:', e.message);
    res.status(500).json({ success: false, message: 'Failed to load payroll records' });
  }
});

router.get('/accountant/payroll/record/:id', requireRole(ACCOUNTANT_READ_ROLES), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const raw = String(req.params.id || '');
    const id = raw.startsWith('PAY-') ? Number(raw.slice(4)) : Number(raw);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid payroll id' });

    const [[r]] = await promisePool.query(
      `SELECT p.id, p.staff_user_id, p.staff_code, p.staff_name, p.role_code, p.department,
              p.basic_salary_rwf, p.bonus_rwf, p.deduction_rwf, p.net_salary_rwf,
              p.pay_month, p.pay_year, p.payment_date, p.payment_status, p.payment_method,
              p.note, p.created_by_user_id, p.created_at, p.updated_at,
              u.first_name AS creator_first_name, u.last_name AS creator_last_name
       FROM accountant_payroll_payments p
       LEFT JOIN users u ON u.id = p.created_by_user_id
       WHERE p.school_id = ? AND p.id = ? AND p.deleted_at IS NULL
       LIMIT 1`,
      [schoolId, id]
    );
    if (!r) return res.status(404).json({ success: false, message: 'Payroll record not found' });

    res.json({
      success: true,
      data: {
        db_id: r.id,
        payrollId: `PAY-${r.id}`,
        staffUserId: Number(r.staff_user_id),
        staffId: `STF-${r.staff_user_id}`,
        staffCode: r.staff_code || '',
        staffName: r.staff_name || '',
        role: r.role_code || 'STAFF',
        department: r.department || '',
        basicSalary: Number(r.basic_salary_rwf || 0),
        bonus: Number(r.bonus_rwf || 0),
        deduction: Number(r.deduction_rwf || 0),
        netSalaryPaid: Number(r.net_salary_rwf || 0),
        month: Number(r.pay_month || 0),
        year: Number(r.pay_year || 0),
        paymentDate: r.payment_date,
        paymentStatus: r.payment_status || 'pending',
        paymentMethod: r.payment_method || '',
        note: r.note || '',
        createdBy: {
          userId: Number(r.created_by_user_id || 0),
          name: `${r.creator_first_name || ''} ${r.creator_last_name || ''}`.trim() || 'Accountant',
        },
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      },
    });
  } catch (e) {
    console.error('[accountant/payroll/:id GET]:', e.message);
    res.status(500).json({ success: false, message: 'Failed to load payroll details' });
  }
});

router.post('/accountant/payroll', requireRole(ACCOUNTANT_WRITE_ROLES), async (req, res) => {
  try {
    const { schoolId, userId, roleCode } = req.ctx;
    const payload = req.body || {};
    const staffUserId = Number(payload.staffUserId || payload.staff_user_id || 0);
    const month = Number(payload.month || payload.pay_month || 0);
    const year = Number(payload.year || payload.pay_year || 0);
    const basicSalary = toMoney(payload.basicSalary || payload.basic_salary || payload.salaryAmount);
    const bonus = toMoney(payload.bonus);
    const deduction = toMoney(payload.deduction);
    const netSalaryComputed = basicSalary + bonus - deduction;
    const paymentDate = payload.paymentDate || payload.payment_date;
    const paymentMethod = String(payload.paymentMethod || payload.payment_method || 'cash').trim();
    const paymentStatus = String(payload.paymentStatus || payload.payment_status || 'paid').trim().toLowerCase();
    const note = String(payload.note || payload.notes || '').trim() || null;

    if (!staffUserId) return res.status(400).json({ success: false, message: 'staffUserId is required' });
    if (!(month >= 1 && month <= 12)) return res.status(400).json({ success: false, message: 'month must be between 1 and 12' });
    if (!(year >= 2000 && year <= 3000)) return res.status(400).json({ success: false, message: 'year is required' });
    if (!(basicSalary > 0)) return res.status(400).json({ success: false, message: 'salary amount must be greater than zero' });
    if (!paymentDate) return res.status(400).json({ success: false, message: 'paymentDate is required' });
    if (!PAYROLL_PAYMENT_STATUSES.includes(paymentStatus)) {
      return res.status(400).json({ success: false, message: 'Invalid payment status' });
    }

    const [[staff]] = await promisePool.query(
      `SELECT u.id, u.user_uid, u.first_name, u.last_name, r.role_code
       FROM users u
       LEFT JOIN roles r ON r.id = u.role_id
       WHERE u.school_id = ? AND u.id = ? AND u.deleted_at IS NULL
       LIMIT 1`,
      [schoolId, staffUserId]
    );
    if (!staff) return res.status(404).json({ success: false, message: 'Staff not found' });

    const [[dup]] = await promisePool.query(
      `SELECT id
       FROM accountant_payroll_payments
       WHERE school_id = ? AND staff_user_id = ? AND pay_month = ? AND pay_year = ? AND deleted_at IS NULL
       LIMIT 1`,
      [schoolId, staffUserId, month, year]
    );
    if (dup) {
      return res.status(409).json({
        success: false,
        message: 'Payroll record already exists for this staff, month and year',
      });
    }

    const [insertResult] = await promisePool.query(
      `INSERT INTO accountant_payroll_payments
       (school_id, staff_user_id, staff_code, staff_name, role_code, department,
        basic_salary_rwf, bonus_rwf, deduction_rwf, net_salary_rwf,
        pay_month, pay_year, payment_date, payment_status, payment_method, note, created_by_user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        schoolId,
        staffUserId,
        staff.user_uid || `STF-${staff.id}`,
        `${staff.first_name || ''} ${staff.last_name || ''}`.trim() || `User ${staff.id}`,
        String(staff.role_code || 'STAFF').toUpperCase(),
        String(staff.role_code || 'STAFF').toUpperCase(),
        basicSalary,
        bonus,
        deduction,
        netSalaryComputed,
        month,
        year,
        toDateOrNow(paymentDate),
        paymentStatus,
        paymentMethod || 'cash',
        note,
        userId,
      ]
    );

    await appendAuditLog({
      schoolId,
      userId,
      roleCode,
      endpoint: '/accountant/payroll',
      entityType: 'payroll_payment',
      entityId: insertResult.insertId,
      action: 'create',
      afterState: { staff_user_id: staffUserId, month, year, payment_status: paymentStatus, net_salary_rwf: netSalaryComputed },
    });

    res.status(201).json({
      success: true,
      message: 'Payroll payment created',
      id: insertResult.insertId,
    });
  } catch (e) {
    console.error('[accountant/payroll POST]:', e.message);
    res.status(500).json({ success: false, message: 'Failed to create payroll record' });
  }
});

router.put('/accountant/payroll/record/:id', requireRole(ACCOUNTANT_WRITE_ROLES), async (req, res) => {
  try {
    const { schoolId, userId, roleCode } = req.ctx;
    const raw = String(req.params.id || '');
    const id = raw.startsWith('PAY-') ? Number(raw.slice(4)) : Number(raw);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid payroll id' });

    const payload = req.body || {};
    const staffUserId = Number(payload.staffUserId || payload.staff_user_id || 0);
    const month = Number(payload.month || payload.pay_month || 0);
    const year = Number(payload.year || payload.pay_year || 0);
    const basicSalary = toMoney(payload.basicSalary || payload.basic_salary || payload.salaryAmount);
    const bonus = toMoney(payload.bonus);
    const deduction = toMoney(payload.deduction);
    const netSalaryComputed = basicSalary + bonus - deduction;
    const paymentDate = payload.paymentDate || payload.payment_date;
    const paymentMethod = String(payload.paymentMethod || payload.payment_method || 'cash').trim();
    const paymentStatus = String(payload.paymentStatus || payload.payment_status || 'paid').trim().toLowerCase();
    const note = String(payload.note || payload.notes || '').trim() || null;

    if (!staffUserId) return res.status(400).json({ success: false, message: 'staffUserId is required' });
    if (!(month >= 1 && month <= 12)) return res.status(400).json({ success: false, message: 'month must be between 1 and 12' });
    if (!(year >= 2000 && year <= 3000)) return res.status(400).json({ success: false, message: 'year is required' });
    if (!(basicSalary > 0)) return res.status(400).json({ success: false, message: 'salary amount must be greater than zero' });
    if (!paymentDate) return res.status(400).json({ success: false, message: 'paymentDate is required' });
    if (!PAYROLL_PAYMENT_STATUSES.includes(paymentStatus)) {
      return res.status(400).json({ success: false, message: 'Invalid payment status' });
    }

    const [[staff]] = await promisePool.query(
      `SELECT u.id, u.user_uid, u.first_name, u.last_name, r.role_code
       FROM users u
       LEFT JOIN roles r ON r.id = u.role_id
       WHERE u.school_id = ? AND u.id = ? AND u.deleted_at IS NULL
       LIMIT 1`,
      [schoolId, staffUserId]
    );
    if (!staff) return res.status(404).json({ success: false, message: 'Staff not found' });

    const [[dup]] = await promisePool.query(
      `SELECT id
       FROM accountant_payroll_payments
       WHERE school_id = ? AND staff_user_id = ? AND pay_month = ? AND pay_year = ? AND deleted_at IS NULL AND id <> ?
       LIMIT 1`,
      [schoolId, staffUserId, month, year, id]
    );
    if (dup) {
      return res.status(409).json({
        success: false,
        message: 'Payroll record already exists for this staff, month and year',
      });
    }

    const [updateResult] = await promisePool.query(
      `UPDATE accountant_payroll_payments
       SET staff_user_id = ?, staff_code = ?, staff_name = ?, role_code = ?, department = ?,
           basic_salary_rwf = ?, bonus_rwf = ?, deduction_rwf = ?, net_salary_rwf = ?,
           pay_month = ?, pay_year = ?, payment_date = ?, payment_status = ?, payment_method = ?, note = ?
       WHERE school_id = ? AND id = ? AND deleted_at IS NULL`,
      [
        staffUserId,
        staff.user_uid || `STF-${staff.id}`,
        `${staff.first_name || ''} ${staff.last_name || ''}`.trim() || `User ${staff.id}`,
        String(staff.role_code || 'STAFF').toUpperCase(),
        String(staff.role_code || 'STAFF').toUpperCase(),
        basicSalary,
        bonus,
        deduction,
        netSalaryComputed,
        month,
        year,
        toDateOrNow(paymentDate),
        paymentStatus,
        paymentMethod || 'cash',
        note,
        schoolId,
        id,
      ]
    );
    if (!updateResult.affectedRows) return res.status(404).json({ success: false, message: 'Payroll record not found' });

    await appendAuditLog({
      schoolId,
      userId,
      roleCode,
      endpoint: '/accountant/payroll/:id',
      entityType: 'payroll_payment',
      entityId: id,
      action: 'update',
      afterState: { staff_user_id: staffUserId, month, year, payment_status: paymentStatus, net_salary_rwf: netSalaryComputed },
    });

    res.json({ success: true, message: 'Payroll record updated' });
  } catch (e) {
    console.error('[accountant/payroll/:id PUT]:', e.message);
    res.status(500).json({ success: false, message: 'Failed to update payroll record' });
  }
});

router.delete('/accountant/payroll/record/:id', requireRole(ACCOUNTANT_WRITE_ROLES), async (req, res) => {
  try {
    const { schoolId, userId, roleCode } = req.ctx;
    const raw = String(req.params.id || '');
    const id = raw.startsWith('PAY-') ? Number(raw.slice(4)) : Number(raw);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid payroll id' });

    const [r] = await promisePool.query(
      `UPDATE accountant_payroll_payments
       SET deleted_at = NOW()
       WHERE school_id = ? AND id = ? AND deleted_at IS NULL`,
      [schoolId, id]
    );
    if (!r.affectedRows) return res.status(404).json({ success: false, message: 'Payroll record not found' });

    await appendAuditLog({
      schoolId,
      userId,
      roleCode,
      endpoint: '/accountant/payroll/:id',
      entityType: 'payroll_payment',
      entityId: id,
      action: 'soft_delete',
      afterState: { deleted_at: true },
    });
    res.json({ success: true, message: 'Payroll record deleted' });
  } catch (e) {
    console.error('[accountant/payroll/:id DELETE]:', e.message);
    res.status(500).json({ success: false, message: 'Failed to delete payroll record' });
  }
});

router.get('/accountant/payroll/config', requireRole(ACCOUNTANT_READ_ROLES), async (req, res) => {
  try {
    const { schoolId } = req.ctx;

    const [rateRows] = await promisePool.query(
      `SELECT role_code, base_rwf, allowance_rwf
       FROM accountant_payroll_rates
       WHERE school_id = ?
       ORDER BY role_code ASC`,
      [schoolId]
    );
    const rateMap = new Map(
      rateRows.map((r) => [
        String(r.role_code || '').toUpperCase(),
        { role: String(r.role_code || '').toUpperCase(), base: Number(r.base_rwf || 0), allowance: Number(r.allowance_rwf || 0) },
      ])
    );

    const defaults = [
      { role: 'TEACHER', base: 180000, allowance: 30000 },
      { role: 'HOD', base: 230000, allowance: 45000 },
      { role: 'DOS', base: 260000, allowance: 60000 },
      { role: 'ACCOUNTANT', base: 240000, allowance: 50000 },
      { role: 'STORE_MANAGER', base: 170000, allowance: 25000 },
      { role: 'LIBRARIAN', base: 160000, allowance: 20000 },
    ];
    for (const d of defaults) if (!rateMap.has(d.role)) rateMap.set(d.role, d);
    const rates = Array.from(rateMap.values()).map((r) => ({ id: `RATE-${r.role}`, role: r.role, base: r.base, allowance: r.allowance }));

    const [staffRows] = await promisePool.query(
      `SELECT u.id, u.first_name, u.last_name, r.role_code,
              COALESCE(pso.rate_role_code, r.role_code) AS assigned_role_code,
              COALESCE(pso.is_active, 1) AS is_active
       FROM users u
       LEFT JOIN roles r ON r.id = u.role_id
       LEFT JOIN accountant_payroll_staff_overrides pso
              ON pso.school_id = u.school_id AND pso.user_id = u.id
       WHERE u.school_id = ? AND u.deleted_at IS NULL
       ORDER BY u.first_name ASC, u.last_name ASC`,
      [schoolId]
    );

    const staff = staffRows.map((s) => {
      const roleCode = String(s.role_code || 'STAFF').toUpperCase();
      const assignedRole = String(s.assigned_role_code || roleCode).toUpperCase();
      return {
        id: `STF-${s.id}`,
        db_user_id: s.id,
        name: `${s.first_name || ''} ${s.last_name || ''}`.trim() || `User ${s.id}`,
        dept: roleCode,
        role: roleCode,
        rateId: `RATE-${assignedRole}`,
        active: Number(s.is_active) === 1,
      };
    });

    res.json({ success: true, data: { rates, staff } });
  } catch (e) {
    console.error('[accountant/payroll/config GET]:', e.message);
    res.status(500).json({ success: false, message: 'Failed to load payroll config' });
  }
});

router.put('/accountant/payroll/rates', requireRole(ACCOUNTANT_WRITE_ROLES), async (req, res) => {
  try {
    const { schoolId, userId, roleCode } = req.ctx;
    const rows = Array.isArray(req.body?.rates) ? req.body.rates : [];
    for (const r of rows) {
      const role = String(r.role || '').toUpperCase().trim();
      if (!role) continue;
      await promisePool.query(
        `INSERT INTO accountant_payroll_rates (school_id, role_code, base_rwf, allowance_rwf)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE base_rwf = VALUES(base_rwf), allowance_rwf = VALUES(allowance_rwf)`,
        [schoolId, role, toMoney(r.base), toMoney(r.allowance)]
      );
    }
    await appendAuditLog({
      schoolId,
      userId,
      roleCode,
      endpoint: '/accountant/payroll/rates',
      entityType: 'payroll_rate',
      entityId: 'bulk',
      action: 'upsert',
      afterState: { count: rows.length },
    });
    res.json({ success: true, message: 'Payroll rates saved' });
  } catch (e) {
    console.error('[accountant/payroll/rates PUT]:', e.message);
    res.status(500).json({ success: false, message: 'Failed to save payroll rates' });
  }
});

router.patch('/accountant/payroll/staff/:userId', requireRole(ACCOUNTANT_WRITE_ROLES), async (req, res) => {
  try {
    const { schoolId, userId: actorId, roleCode } = req.ctx;
    const userId = Number(req.params.userId);
    if (!userId) return res.status(400).json({ success: false, message: 'Invalid userId' });
    const rateId = String(req.body?.rateId || '').trim();
    const activeRaw = req.body?.active;
    const active = activeRaw === undefined ? 1 : activeRaw ? 1 : 0;
    const rateRoleCode = rateId.startsWith('RATE-') ? rateId.slice(5).toUpperCase() : null;

    await promisePool.query(
      `INSERT INTO accountant_payroll_staff_overrides (school_id, user_id, rate_role_code, is_active)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         rate_role_code = COALESCE(VALUES(rate_role_code), rate_role_code),
         is_active = VALUES(is_active)`,
      [schoolId, userId, rateRoleCode, active]
    );
    await appendAuditLog({
      schoolId,
      userId: actorId,
      roleCode,
      endpoint: '/accountant/payroll/staff/:userId',
      entityType: 'payroll_staff_override',
      entityId: userId,
      action: 'upsert',
      afterState: { rate_role_code: rateRoleCode, is_active: active },
    });
    res.json({ success: true, message: 'Staff payroll assignment updated' });
  } catch (e) {
    console.error('[accountant/payroll/staff/:userId PATCH]:', e.message);
    res.status(500).json({ success: false, message: 'Failed to update staff payroll assignment' });
  }
});

router.get('/accountant/payroll/runs', requireRole(ACCOUNTANT_READ_ROLES), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const limit = Math.min(300, Math.max(1, Number(req.query?.limit) || 100));
    const [rows] = await promisePool.query(
      `SELECT id, run_period, status, gross_total_rwf, staff_count, created_at
       FROM accountant_payroll_runs
       WHERE school_id = ?
       ORDER BY id DESC
       LIMIT ?`,
      [schoolId, limit]
    );
    res.json({
      success: true,
      data: rows.map((r) => ({
        db_id: r.id,
        id: `RUN-${r.id}`,
        period: r.run_period,
        status: r.status,
        staffCount: Number(r.staff_count || 0),
        grossTotal: Number(r.gross_total_rwf || 0),
        created_at: r.created_at,
      })),
    });
  } catch (e) {
    console.error('[accountant/payroll/runs GET]:', e.message);
    res.status(500).json({ success: false, message: 'Failed to load payroll runs' });
  }
});

router.get('/accountant/payroll/runs/:id', requireRole(ACCOUNTANT_READ_ROLES), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const raw = String(req.params.id || '');
    const id = raw.startsWith('RUN-') ? Number(raw.slice(4)) : Number(raw);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid run id' });

    const [[run]] = await promisePool.query(
      `SELECT id, run_period, status, gross_total_rwf, staff_count, created_at
       FROM accountant_payroll_runs
       WHERE school_id = ? AND id = ?
       LIMIT 1`,
      [schoolId, id]
    );
    if (!run) return res.status(404).json({ success: false, message: 'Payroll run not found' });

    const [lines] = await promisePool.query(
      `SELECT id, staff_name, dept, role_code, gross_rwf
       FROM accountant_payroll_run_lines
       WHERE school_id = ? AND run_id = ?
       ORDER BY id ASC`,
      [schoolId, id]
    );

    res.json({
      success: true,
      data: {
        db_id: run.id,
        id: `RUN-${run.id}`,
        period: run.run_period,
        status: run.status,
        staffCount: Number(run.staff_count || 0),
        grossTotal: Number(run.gross_total_rwf || 0),
        created_at: run.created_at,
        lines: lines.map((l) => ({
          id: `RUNL-${l.id}`,
          staff: l.staff_name,
          dept: l.dept || l.role_code || 'STAFF',
          role: l.role_code || 'STAFF',
          gross: Number(l.gross_rwf || 0),
        })),
      },
    });
  } catch (e) {
    console.error('[accountant/payroll/runs/:id GET]:', e.message);
    res.status(500).json({ success: false, message: 'Failed to load payroll run details' });
  }
});

router.post('/accountant/payroll/runs/trigger', requireRole(ACCOUNTANT_WRITE_ROLES), async (req, res) => {
  const conn = await promisePool.getConnection();
  try {
    const { schoolId, userId, roleCode } = req.ctx;
    await conn.beginTransaction();

    const [rateRows] = await conn.query(
      `SELECT role_code, base_rwf, allowance_rwf
       FROM accountant_payroll_rates WHERE school_id = ?`,
      [schoolId]
    );
    const rateMap = new Map();
    for (const r of rateRows) {
      rateMap.set(String(r.role_code || '').toUpperCase(), {
        base: Number(r.base_rwf || 0),
        allowance: Number(r.allowance_rwf || 0),
      });
    }

    const [staffRows] = await conn.query(
      `SELECT u.id, u.first_name, u.last_name, r.role_code,
              COALESCE(o.rate_role_code, r.role_code) AS assigned_role_code,
              COALESCE(o.is_active, 1) AS is_active
       FROM users u
       LEFT JOIN roles r ON r.id = u.role_id
       LEFT JOIN accountant_payroll_staff_overrides o
              ON o.school_id = u.school_id AND o.user_id = u.id
       WHERE u.school_id = ? AND u.deleted_at IS NULL`,
      [schoolId]
    );

    const active = staffRows.filter((s) => Number(s.is_active) === 1);
    const lines = [];
    let grossTotal = 0;
    for (const s of active) {
      const role = String(s.assigned_role_code || s.role_code || 'STAFF').toUpperCase();
      const rate = rateMap.get(role) || { base: 150000, allowance: 20000 };
      const gross = Number(rate.base) + Number(rate.allowance);
      grossTotal += gross;
      lines.push({
        user_id: s.id,
        staff_name: `${s.first_name || ''} ${s.last_name || ''}`.trim() || `User ${s.id}`,
        dept: String(s.role_code || role),
        role_code: role,
        gross_rwf: gross,
      });
    }

    const now = new Date();
    const period = `${now.toLocaleString('en-US', { month: 'short' })}-${now.getFullYear()}`;
    const [runResult] = await conn.query(
      `INSERT INTO accountant_payroll_runs
       (school_id, triggered_by_user_id, run_period, status, gross_total_rwf, staff_count)
       VALUES (?, ?, ?, 'processed', ?, ?)`,
      [schoolId, userId, period, grossTotal, lines.length]
    );
    const runId = runResult.insertId;

    for (const l of lines) {
      await conn.query(
        `INSERT INTO accountant_payroll_run_lines
         (run_id, school_id, user_id, staff_name, dept, role_code, gross_rwf)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [runId, schoolId, l.user_id, l.staff_name, l.dept, l.role_code, l.gross_rwf]
      );
    }

    await conn.commit();
    await appendAuditLog({
      schoolId,
      userId,
      roleCode,
      endpoint: '/accountant/payroll/runs/trigger',
      entityType: 'payroll_run',
      entityId: runId,
      action: 'create',
      afterState: { run_period: period, staff_count: lines.length, gross_total_rwf: grossTotal },
    });
    res.status(201).json({ success: true, message: 'Payroll run created', id: runId });
  } catch (e) {
    await conn.rollback().catch(() => {});
    console.error('[accountant/payroll/runs/trigger POST]:', e.message);
    res.status(500).json({ success: false, message: 'Failed to trigger payroll' });
  } finally {
    conn.release();
  }
});

// -------------------- Store --------------------
router.get('/store/inventory', requireRole(STORE_READ_ROLES), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const term = String(req.query?.term || '').trim();
    const academicYear = String(req.query?.academic_year || '').trim();
    const where = ['school_id = ?', 'deleted_at IS NULL'];
    const params = [schoolId];
    if (term) {
      where.push('term = ?');
      params.push(term);
    }
    if (academicYear) {
      where.push('academic_year = ?');
      params.push(academicYear);
    }
    const [rows] = await promisePool.query(
      `SELECT id, name, category, term, academic_year, unit, quantity, reorder_level, unit_cost, location, note, updated_at
       FROM store_inventory_items
       WHERE ${where.join(' AND ')}
       ORDER BY id DESC`,
      params
    );
    res.json({ success: true, data: rows.map((r) => ({ ...r, quantity: Number(r.quantity), reorder_level: Number(r.reorder_level), unit_cost: Number(r.unit_cost) })) });
  } catch (e) {
    console.error('[store/inventory GET]:', e.message);
    res.status(500).json({ success: false, message: 'Failed to load inventory' });
  }
});

router.post('/store/inventory', requireRole(STORE_WRITE_ROLES), async (req, res) => {
  try {
    const { schoolId, userId, roleCode } = req.ctx;
    const payload = req.body || {};
    const name = String(payload.name || '').trim();
    if (!name) return res.status(400).json({ success: false, message: 'name is required' });

    const [r] = await promisePool.query(
      `INSERT INTO store_inventory_items
       (school_id, name, category, term, academic_year, unit, quantity, reorder_level, unit_cost, location, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        schoolId,
        name,
        String(payload.category || '').trim() || 'Other',
        String(payload.term || '').trim() || null,
        String(payload.academic_year || '').trim() || null,
        String(payload.unit || '').trim() || 'pcs',
        toMoney(payload.quantity),
        toMoney(payload.reorder_level),
        toMoney(payload.unit_cost),
        String(payload.location || '').trim() || null,
        String(payload.note || '').trim() || null,
      ]
    );
    await appendAuditLog({
      schoolId,
      userId,
      roleCode,
      endpoint: '/store/inventory',
      entityType: 'store_inventory',
      entityId: r.insertId,
      action: 'create',
      afterState: { name },
    });
    res.status(201).json({ success: true, message: 'Inventory item created', id: r.insertId });
  } catch (e) {
    console.error('[store/inventory POST]:', e.message);
    res.status(500).json({ success: false, message: 'Failed to create inventory item' });
  }
});

router.patch('/store/inventory/:id', requireRole(STORE_WRITE_ROLES), async (req, res) => {
  try {
    const { schoolId, userId, roleCode } = req.ctx;
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid item id' });
    const payload = req.body || {};
    await promisePool.query(
      `UPDATE store_inventory_items
       SET name = ?, category = ?, term = ?, academic_year = ?, unit = ?, quantity = ?, reorder_level = ?, unit_cost = ?, location = ?, note = ?
       WHERE id = ? AND school_id = ? AND deleted_at IS NULL`,
      [
        String(payload.name || '').trim(),
        String(payload.category || '').trim() || 'Other',
        String(payload.term || '').trim() || null,
        String(payload.academic_year || '').trim() || null,
        String(payload.unit || '').trim() || 'pcs',
        toMoney(payload.quantity),
        toMoney(payload.reorder_level),
        toMoney(payload.unit_cost),
        String(payload.location || '').trim() || null,
        String(payload.note || '').trim() || null,
        id,
        schoolId,
      ]
    );
    await appendAuditLog({
      schoolId,
      userId,
      roleCode,
      endpoint: '/store/inventory/:id',
      entityType: 'store_inventory',
      entityId: id,
      action: 'update',
      afterState: { name: String(payload.name || '').trim() },
    });
    res.json({ success: true, message: 'Inventory item updated' });
  } catch (e) {
    console.error('[store/inventory/:id PATCH]:', e.message);
    res.status(500).json({ success: false, message: 'Failed to update inventory item' });
  }
});

router.delete('/store/inventory/:id', requireRole(STORE_WRITE_ROLES), async (req, res) => {
  try {
    const { schoolId, userId, roleCode } = req.ctx;
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid item id' });
    const [r] = await promisePool.query(
      `UPDATE store_inventory_items
       SET deleted_at = NOW()
       WHERE id = ? AND school_id = ? AND deleted_at IS NULL`,
      [id, schoolId]
    );
    if (!r.affectedRows) return res.status(404).json({ success: false, message: 'Inventory item not found' });
    await appendAuditLog({
      schoolId,
      userId,
      roleCode,
      endpoint: '/store/inventory/:id',
      entityType: 'store_inventory',
      entityId: id,
      action: 'soft_delete',
      afterState: { deleted_at: true },
    });
    res.json({ success: true, message: 'Inventory item deleted' });
  } catch (e) {
    console.error('[store/inventory/:id DELETE]:', e.message);
    res.status(500).json({ success: false, message: 'Failed to delete inventory item' });
  }
});

router.get('/store/suppliers', requireRole(STORE_READ_ROLES), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const [rows] = await promisePool.query(
      `SELECT id, name, contact_person, phone, email, address, categories, note, updated_at
       FROM store_suppliers
       WHERE school_id = ? AND deleted_at IS NULL
       ORDER BY id DESC`,
      [schoolId]
    );
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error('[store/suppliers GET]:', e.message);
    res.status(500).json({ success: false, message: 'Failed to load suppliers' });
  }
});

router.post('/store/suppliers', requireRole(STORE_WRITE_ROLES), async (req, res) => {
  try {
    const { schoolId, userId, roleCode } = req.ctx;
    const payload = req.body || {};
    const name = String(payload.name || '').trim();
    if (!name) return res.status(400).json({ success: false, message: 'name is required' });
    const [r] = await promisePool.query(
      `INSERT INTO store_suppliers
       (school_id, name, contact_person, phone, email, address, categories, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        schoolId,
        name,
        String(payload.contact_person || '').trim() || null,
        String(payload.phone || '').trim() || null,
        String(payload.email || '').trim() || null,
        String(payload.address || '').trim() || null,
        String(payload.categories || '').trim() || null,
        String(payload.note || '').trim() || null,
      ]
    );
    await appendAuditLog({
      schoolId,
      userId,
      roleCode,
      endpoint: '/store/suppliers',
      entityType: 'store_supplier',
      entityId: r.insertId,
      action: 'create',
      afterState: { name },
    });
    res.status(201).json({ success: true, message: 'Supplier created', id: r.insertId });
  } catch (e) {
    console.error('[store/suppliers POST]:', e.message);
    res.status(500).json({ success: false, message: 'Failed to create supplier' });
  }
});

router.patch('/store/suppliers/:id', requireRole(STORE_WRITE_ROLES), async (req, res) => {
  try {
    const { schoolId, userId, roleCode } = req.ctx;
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid supplier id' });
    const payload = req.body || {};
    await promisePool.query(
      `UPDATE store_suppliers
       SET name = ?, contact_person = ?, phone = ?, email = ?, address = ?, categories = ?, note = ?
       WHERE id = ? AND school_id = ? AND deleted_at IS NULL`,
      [
        String(payload.name || '').trim(),
        String(payload.contact_person || '').trim() || null,
        String(payload.phone || '').trim() || null,
        String(payload.email || '').trim() || null,
        String(payload.address || '').trim() || null,
        String(payload.categories || '').trim() || null,
        String(payload.note || '').trim() || null,
        id,
        schoolId,
      ]
    );
    await appendAuditLog({
      schoolId,
      userId,
      roleCode,
      endpoint: '/store/suppliers/:id',
      entityType: 'store_supplier',
      entityId: id,
      action: 'update',
      afterState: { name: String(payload.name || '').trim() },
    });
    res.json({ success: true, message: 'Supplier updated' });
  } catch (e) {
    console.error('[store/suppliers/:id PATCH]:', e.message);
    res.status(500).json({ success: false, message: 'Failed to update supplier' });
  }
});

router.delete('/store/suppliers/:id', requireRole(STORE_WRITE_ROLES), async (req, res) => {
  try {
    const { schoolId, userId, roleCode } = req.ctx;
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid supplier id' });
    const [r] = await promisePool.query(
      `UPDATE store_suppliers
       SET deleted_at = NOW()
       WHERE id = ? AND school_id = ? AND deleted_at IS NULL`,
      [id, schoolId]
    );
    if (!r.affectedRows) return res.status(404).json({ success: false, message: 'Supplier not found' });
    await appendAuditLog({
      schoolId,
      userId,
      roleCode,
      endpoint: '/store/suppliers/:id',
      entityType: 'store_supplier',
      entityId: id,
      action: 'soft_delete',
      afterState: { deleted_at: true },
    });
    res.json({ success: true, message: 'Supplier deleted' });
  } catch (e) {
    console.error('[store/suppliers/:id DELETE]:', e.message);
    res.status(500).json({ success: false, message: 'Failed to delete supplier' });
  }
});

router.get('/store/movements', requireRole(STORE_READ_ROLES), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const term = String(req.query?.term || '').trim();
    const academicYear = String(req.query?.academic_year || '').trim();
    const specificDate = String(req.query?.date || '').trim();
    const fromDate = String(req.query?.from || '').trim();
    const toDate = String(req.query?.to || '').trim();
    const where = ['m.school_id = ?', 'm.deleted_at IS NULL'];
    const params = [schoolId];
    if (term) {
      where.push('m.term = ?');
      params.push(term);
    }
    if (academicYear) {
      where.push('m.academic_year = ?');
      params.push(academicYear);
    }
    if (specificDate) {
      where.push('DATE(COALESCE(m.movement_date, m.created_at)) = ?');
      params.push(specificDate);
    } else {
      if (fromDate) {
        where.push('DATE(COALESCE(m.movement_date, m.created_at)) >= ?');
        params.push(fromDate);
      }
      if (toDate) {
        where.push('DATE(COALESCE(m.movement_date, m.created_at)) <= ?');
        params.push(toDate);
      }
    }
    const [rows] = await promisePool.query(
      `SELECT m.id, m.item_id, i.name AS item_name, m.type, m.term, m.academic_year, m.movement_date,
              m.quantity, m.stock_after, m.unit_cost, m.ref, m.note, m.created_at,
              i.quantity AS current_item_stock
       FROM store_movements m
       LEFT JOIN store_inventory_items i ON i.id = m.item_id AND i.deleted_at IS NULL
       WHERE ${where.join(' AND ')}
       ORDER BY m.id DESC
       LIMIT 500`,
      params
    );
    const normalizeType = (raw) => {
      const t = String(raw || '').toLowerCase();
      if (t === 'received' || t === 'stock_in') return 'stock_in';
      if (t === 'issued' || t === 'stock_out') return 'stock_out';
      if (t === 'returned') return 'returned';
      return 'adjusted';
    };
    res.json({
      success: true,
      data: rows.map((r) => ({
        id: r.id,
        item_id: r.item_id,
        item_name: r.item_name || 'Unknown item',
        type: normalizeType(r.type),
        term: r.term || '',
        academic_year: r.academic_year || '',
        movement_date: r.movement_date || null,
        quantity: Number(r.quantity || 0),
        stock_after: Number(r.stock_after || r.current_item_stock || 0),
        current_item_stock: Number(r.current_item_stock || 0),
        unit_cost: Number(r.unit_cost || 0),
        ref: r.ref || '',
        note: r.note || '',
        date: r.movement_date || r.created_at,
        created_at: r.created_at,
      })),
    });
  } catch (e) {
    console.error('[store/movements GET]:', e.message);
    res.status(500).json({ success: false, message: 'Failed to load stock movements' });
  }
});

router.post('/store/movements', requireRole(STORE_WRITE_ROLES), async (req, res) => {
  const conn = await promisePool.getConnection();
  try {
    const { schoolId, userId } = req.ctx;
    const payload = req.body || {};
    const itemId = Number(payload.item_id);
    const rawType = String(payload.type || '').toLowerCase();
    const type = rawType === 'received' || rawType === 'stock_in'
      ? 'stock_in'
      : rawType === 'issued' || rawType === 'stock_out'
        ? 'stock_out'
        : rawType === 'returned'
          ? 'returned'
          : rawType === 'adjusted'
            ? 'adjusted'
            : '';
    const quantity = toMoney(payload.quantity);
    const unitCost = toMoney(payload.unit_cost);
    const term = String(payload.term || '').trim() || null;
    const academicYear = String(payload.academic_year || '').trim() || null;
    const movementDate = String(payload.movement_date || payload.date || '').trim() || null;
    const ref = String(payload.ref || '').trim() || null;
    const note = String(payload.note || '').trim() || null;
    const allowedTypes = ['stock_in', 'stock_out', 'adjusted', 'returned'];
    if (!itemId || quantity <= 0 || !allowedTypes.includes(type)) {
      return res.status(400).json({ success: false, message: 'Invalid movement payload' });
    }

    await conn.beginTransaction();
    const [[item]] = await conn.query(
      `SELECT id, quantity, term, academic_year
       FROM store_inventory_items
       WHERE id = ? AND school_id = ? AND deleted_at IS NULL
       LIMIT 1`,
      [itemId, schoolId]
    );
    if (!item) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Inventory item not found' });
    }

    const currentQty = Number(item.quantity || 0);
    let nextQty = currentQty;
    if (type === 'stock_in' || type === 'returned') nextQty = currentQty + quantity;
    else if (type === 'stock_out') {
      if (quantity > currentQty) {
        await conn.rollback();
        return res.status(400).json({ success: false, message: 'Stock out quantity exceeds available stock' });
      }
      nextQty = currentQty - quantity;
    }
    else if (type === 'adjusted') nextQty = quantity;

    const resolvedTerm = term || String(item.term || '').trim() || null;
    const resolvedAcademicYear = academicYear || String(item.academic_year || '').trim() || null;

    const [movementInsert] = await conn.query(
      `INSERT INTO store_movements
       (school_id, item_id, type, term, academic_year, movement_date, quantity, stock_after, unit_cost, ref, note, created_by_user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [schoolId, itemId, type, resolvedTerm, resolvedAcademicYear, movementDate, quantity, nextQty, unitCost || null, ref, note, userId]
    );
    await conn.query(
      `UPDATE store_inventory_items
       SET quantity = ?
       WHERE id = ? AND school_id = ? AND deleted_at IS NULL`,
      [nextQty, itemId, schoolId]
    );

    await conn.commit();
    await appendAuditLog({
      schoolId,
      userId,
      roleCode: req.ctx.roleCode,
      endpoint: '/store/movements',
      entityType: 'store_movement',
      entityId: movementInsert.insertId,
      action: 'create',
      afterState: { type, quantity, item_id: itemId, stock_after: nextQty },
    });
    res.status(201).json({ success: true, message: 'Stock movement recorded' });
  } catch (e) {
    await conn.rollback().catch(() => {});
    console.error('[store/movements POST]:', e.message);
    res.status(500).json({ success: false, message: 'Failed to record stock movement' });
  } finally {
    conn.release();
  }
});

// -------------------- Admin Audit --------------------
router.get('/admin/portal-audit-logs', requireRole(ADMIN_AUDIT_ROLES), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const portalRaw = String(req.query?.portal || '').trim();
    const entityType = String(req.query?.entity || '').trim();
    const actionName = String(req.query?.action || '').trim();
    const userId = Number(req.query?.userId);
    const fromDateRaw = req.query?.from;
    const toDateRaw = req.query?.to;
    const page = Math.max(1, Number(req.query?.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(req.query?.limit) || 50));
    const offset = (page - 1) * limit;

    const fromDate = fromDateRaw ? parseDateStart(fromDateRaw) : null;
    const toDate = toDateRaw ? parseDateEnd(toDateRaw) : null;
    if (fromDateRaw && !fromDate) return res.status(400).json({ success: false, message: 'Invalid from date' });
    if (toDateRaw && !toDate) return res.status(400).json({ success: false, message: 'Invalid to date' });
    if (fromDate && toDate && fromDate > toDate) {
      return res.status(400).json({ success: false, message: 'from must be before or equal to to' });
    }

    const portalLike = portalPrefixFilter(portalRaw);
    if (portalRaw && !portalLike) {
      return res.status(400).json({
        success: false,
        message: 'Invalid portal filter. Use teacher|accountant|manager|store|storekeeper|tools|admin',
      });
    }

    const where = ['school_id = ?'];
    const params = [schoolId];

    if (portalLike) {
      where.push('endpoint LIKE ?');
      params.push(portalLike);
    }
    if (entityType) {
      where.push('entity_type = ?');
      params.push(entityType);
    }
    if (actionName) {
      where.push('action_name = ?');
      params.push(actionName);
    }
    if (Number.isFinite(userId) && userId > 0) {
      where.push('user_id = ?');
      params.push(userId);
    }
    if (fromDate) {
      where.push('created_at >= ?');
      params.push(fromDate);
    }
    if (toDate) {
      where.push('created_at <= ?');
      params.push(toDate);
    }

    const whereSql = where.join(' AND ');
    const [countRows] = await promisePool.query(
      `SELECT COUNT(*) AS total
       FROM portal_operation_audit_logs
       WHERE ${whereSql}`,
      params
    );
    const total = Number(countRows?.[0]?.total || 0);

    const [rows] = await promisePool.query(
      `SELECT id, school_id, user_id, role_code, endpoint, entity_type, entity_id, action_name, after_state_json, created_at
       FROM portal_operation_audit_logs
       WHERE ${whereSql}
       ORDER BY id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({
      success: true,
      data: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
      filters: {
        portal: portalRaw || null,
        entity: entityType || null,
        action: actionName || null,
        userId: Number.isFinite(userId) && userId > 0 ? userId : null,
        from: fromDate || null,
        to: toDate || null,
      },
    });
  } catch (e) {
    console.error('[admin/portal-audit-logs GET]:', e.message);
    res.status(500).json({ success: false, message: 'Failed to load portal audit logs' });
  }
});

// -------------------- Ticha AI --------------------
router.get('/tools/ticha-ai/history', requireRole(ALL_SCHOOL_ROLES), async (req, res) => {
  try {
    const { schoolId, userId } = req.ctx;
    const [rows] = await promisePool.query(
      `SELECT id, prompt, response, created_at
       FROM portal_ticha_ai_history
       WHERE school_id = ? AND user_id = ?
       ORDER BY id DESC
       LIMIT 40`,
      [schoolId, userId]
    );
    res.json({
      success: true,
      history: rows.map((r) => ({
        id: r.id,
        prompt: r.prompt,
        response: r.response,
        created_at: r.created_at,
      })),
    });
  } catch (e) {
    console.error('[tools/ticha-ai/history GET]:', e.message);
    res.status(500).json({ success: false, message: 'Failed to load Ticha AI history' });
  }
});

router.post('/tools/ticha-ai/assist', requireRole(ALL_SCHOOL_ROLES), async (req, res) => {
  try {
    const { schoolId, userId, roleCode } = req.ctx;
    const prompt = String(req.body?.prompt || '').trim();
    if (!prompt) return res.status(400).json({ success: false, message: 'prompt is required' });

    const response = [
      `Ticha AI (${roleCode || 'STAFF'}) suggestion:`,
      '1) Clarify objective and expected outcome.',
      '2) Break the task into short, measurable steps.',
      '3) Track progress and communicate blockers early.',
      '',
      `Your prompt: "${prompt.slice(0, 200)}"${prompt.length > 200 ? '...' : ''}`,
    ].join('\n');

    await promisePool.query(
      `INSERT INTO portal_ticha_ai_history (school_id, user_id, prompt, response)
       VALUES (?, ?, ?, ?)`,
      [schoolId, userId, prompt, response]
    );

    res.json({ success: true, response });
  } catch (e) {
    console.error('[tools/ticha-ai/assist POST]:', e.message);
    res.status(500).json({ success: false, message: 'Ticha AI assist failed' });
  }
});

module.exports = router;
