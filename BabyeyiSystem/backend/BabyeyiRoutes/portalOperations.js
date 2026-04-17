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
      dept VARCHAR(120) NULL,
      requester VARCHAR(180) NULL,
      items TEXT NOT NULL,
      amount_rwf DECIMAL(14,2) NOT NULL DEFAULT 0,
      submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
    CREATE TABLE IF NOT EXISTS store_inventory_items (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      name VARCHAR(220) NOT NULL,
      category VARCHAR(120) NULL,
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
      quantity DECIMAL(14,2) NOT NULL DEFAULT 0,
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
  await promisePool.query(`ALTER TABLE accountant_expenses ADD COLUMN deleted_at DATETIME NULL`).catch(() => {});
  await promisePool.query(`ALTER TABLE accountant_expense_payments ADD COLUMN deleted_at DATETIME NULL`).catch(() => {});
  await promisePool.query(`ALTER TABLE store_inventory_items ADD COLUMN deleted_at DATETIME NULL`).catch(() => {});
  await promisePool.query(`ALTER TABLE store_suppliers ADD COLUMN deleted_at DATETIME NULL`).catch(() => {});
  await promisePool.query(`ALTER TABLE store_movements ADD COLUMN deleted_at DATETIME NULL`).catch(() => {});

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
router.get('/teacher-portal/requisitions', requireRole(TEACHER_REQ_READ_ROLES), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const [rows] = await promisePool.query(
      `SELECT id, dept, requester, items, amount_rwf, submitted_at, attachment_name, note, status, source_portal
       FROM portal_requisitions
       WHERE school_id = ? AND deleted_at IS NULL
       ORDER BY id DESC`,
      [schoolId]
    );
    res.json({
      success: true,
      data: rows.map((r) => ({
        db_id: r.id,
        id: `REQ-${r.id}`,
        dept: r.dept || 'General',
        requester: r.requester || 'Unknown',
        items: r.items || '',
        amount: Number(r.amount_rwf || 0),
        submitted: r.submitted_at,
        attachmentName: r.attachment_name || '',
        note: r.note || '',
        status: r.status || 'pending',
        source_portal: r.source_portal || 'teacher',
      })),
    });
  } catch (e) {
    console.error('[teacher-portal/requisitions GET]:', e.message);
    res.status(500).json({ success: false, message: 'Failed to load requisitions' });
  }
});

router.post('/teacher-portal/requisitions', requireRole(TEACHER_REQ_WRITE_ROLES), async (req, res) => {
  try {
    const { schoolId, userId } = req.ctx;
    const payload = req.body || {};
    const dept = String(payload.dept || '').trim() || 'General';
    const requester = String(payload.requester || '').trim() || 'Teacher';
    const items = String(payload.items || '').trim();
    const amount = toMoney(payload.amount);
    const submitted = toDateOrNow(payload.submitted);
    const attachmentName = String(payload.attachmentName || '').trim() || null;
    const note = String(payload.note || '').trim() || null;
    if (!items) return res.status(400).json({ success: false, message: 'items is required' });

    const [r] = await promisePool.query(
      `INSERT INTO portal_requisitions
       (school_id, created_by_user_id, dept, requester, items, amount_rwf, submitted_at, attachment_name, note, status, source_portal)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'teacher')`,
      [schoolId, userId, dept, requester, items, amount, submitted, attachmentName, note]
    );
    await appendAuditLog({
      schoolId,
      userId,
      roleCode: req.ctx.roleCode,
      endpoint: '/teacher-portal/requisitions',
      entityType: 'requisition',
      entityId: r.insertId,
      action: 'create',
      afterState: { status: 'pending', source_portal: 'teacher' },
    });
    res.status(201).json({ success: true, message: 'Requisition submitted', id: r.insertId });
  } catch (e) {
    console.error('[teacher-portal/requisitions POST]:', e.message);
    res.status(500).json({ success: false, message: 'Failed to create requisition' });
  }
});

router.get('/accountant/requisitions', requireRole(ACCOUNTANT_READ_ROLES), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const [rows] = await promisePool.query(
      `SELECT id, dept, requester, items, amount_rwf, submitted_at, attachment_name, note, status, source_portal
       FROM portal_requisitions
       WHERE school_id = ? AND deleted_at IS NULL
       ORDER BY id DESC`,
      [schoolId]
    );
    res.json({
      success: true,
      data: rows.map((r) => ({
        db_id: r.id,
        id: `REQ-${r.id}`,
        dept: r.dept || 'General',
        requester: r.requester || 'Unknown',
        items: r.items || '',
        amount: Number(r.amount_rwf || 0),
        submitted: r.submitted_at,
        attachmentName: r.attachment_name || '',
        note: r.note || '',
        status: r.status || 'pending',
        source_portal: r.source_portal || 'teacher',
      })),
    });
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

router.patch('/accountant/requisitions/:id/status', requireRole(ACCOUNTANT_WRITE_ROLES), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const id = Number(req.params.id);
    const status = String(req.body?.status || '').toLowerCase();
    const allowed = ['pending', 'approved', 'rejected', 'issued'];
    if (!id) return res.status(400).json({ success: false, message: 'Invalid requisition id' });
    if (!allowed.includes(status)) return res.status(400).json({ success: false, message: 'Invalid status' });

    const [r] = await promisePool.query(
      `UPDATE portal_requisitions
       SET status = ?
       WHERE id = ? AND school_id = ? AND deleted_at IS NULL`,
      [status, id, schoolId]
    );
    if (!r.affectedRows) return res.status(404).json({ success: false, message: 'Requisition not found' });
    await appendAuditLog({
      schoolId,
      userId: req.ctx.userId,
      roleCode: req.ctx.roleCode,
      endpoint: '/accountant/requisitions/:id/status',
      entityType: 'requisition',
      entityId: id,
      action: 'status_update',
      afterState: { status },
    });
    res.json({ success: true, message: 'Requisition status updated' });
  } catch (e) {
    console.error('[accountant/requisitions/:id/status PATCH]:', e.message);
    res.status(500).json({ success: false, message: 'Failed to update status' });
  }
});

router.get('/store/requisitions', requireRole(STORE_READ_ROLES), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const [rows] = await promisePool.query(
      `SELECT id, dept, requester, items, amount_rwf, submitted_at, attachment_name, note, status, source_portal
       FROM portal_requisitions
       WHERE school_id = ? AND deleted_at IS NULL
       ORDER BY id DESC`,
      [schoolId]
    );
    res.json({
      success: true,
      data: rows.map((r) => ({
        db_id: r.id,
        id: `REQ-${r.id}`,
        dept: r.dept || 'General',
        requester: r.requester || 'Unknown',
        items: r.items || '',
        amount: Number(r.amount_rwf || 0),
        submitted: r.submitted_at,
        attachmentName: r.attachment_name || '',
        note: r.note || '',
        status: r.status || 'pending',
        source_portal: r.source_portal || 'teacher',
      })),
    });
  } catch (e) {
    console.error('[store/requisitions GET]:', e.message);
    res.status(500).json({ success: false, message: 'Failed to load requisitions' });
  }
});

router.patch('/store/requisitions/:id/status', requireRole(STORE_WRITE_ROLES), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const id = Number(req.params.id);
    const status = String(req.body?.status || '').toLowerCase();
    const allowed = ['pending', 'approved', 'rejected', 'issued'];
    if (!id) return res.status(400).json({ success: false, message: 'Invalid requisition id' });
    if (!allowed.includes(status)) return res.status(400).json({ success: false, message: 'Invalid status' });

    const [r] = await promisePool.query(
      `UPDATE portal_requisitions
       SET status = ?
       WHERE id = ? AND school_id = ? AND deleted_at IS NULL`,
      [status, id, schoolId]
    );
    if (!r.affectedRows) return res.status(404).json({ success: false, message: 'Requisition not found' });
    await appendAuditLog({
      schoolId,
      userId: req.ctx.userId,
      roleCode: req.ctx.roleCode,
      endpoint: '/store/requisitions/:id/status',
      entityType: 'requisition',
      entityId: id,
      action: 'status_update',
      afterState: { status },
    });
    res.json({ success: true, message: 'Requisition status updated' });
  } catch (e) {
    console.error('[store/requisitions/:id/status PATCH]:', e.message);
    res.status(500).json({ success: false, message: 'Failed to update status' });
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
    const allowed = ['pending', 'approved', 'rejected', 'paid'];
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
    const [rows] = await promisePool.query(
      `SELECT id, name, category, unit, quantity, reorder_level, unit_cost, location, note, updated_at
       FROM store_inventory_items
       WHERE school_id = ? AND deleted_at IS NULL
       ORDER BY id DESC`,
      [schoolId]
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
       (school_id, name, category, unit, quantity, reorder_level, unit_cost, location, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        schoolId,
        name,
        String(payload.category || '').trim() || 'Other',
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
       SET name = ?, category = ?, unit = ?, quantity = ?, reorder_level = ?, unit_cost = ?, location = ?, note = ?
       WHERE id = ? AND school_id = ? AND deleted_at IS NULL`,
      [
        String(payload.name || '').trim(),
        String(payload.category || '').trim() || 'Other',
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
    const [rows] = await promisePool.query(
      `SELECT m.id, m.item_id, i.name AS item_name, m.type, m.quantity, m.unit_cost, m.ref, m.note, m.created_at
       FROM store_movements m
       LEFT JOIN store_inventory_items i ON i.id = m.item_id AND i.deleted_at IS NULL
       WHERE m.school_id = ? AND m.deleted_at IS NULL
       ORDER BY m.id DESC
       LIMIT 500`,
      [schoolId]
    );
    res.json({
      success: true,
      data: rows.map((r) => ({
        id: r.id,
        item_id: r.item_id,
        item_name: r.item_name || 'Unknown item',
        type: r.type || 'adjusted',
        quantity: Number(r.quantity || 0),
        unit_cost: Number(r.unit_cost || 0),
        ref: r.ref || '',
        note: r.note || '',
        date: r.created_at,
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
    const type = String(payload.type || '').toLowerCase();
    const quantity = toMoney(payload.quantity);
    const unitCost = toMoney(payload.unit_cost);
    const ref = String(payload.ref || '').trim() || null;
    const note = String(payload.note || '').trim() || null;
    const allowedTypes = ['received', 'issued', 'adjusted', 'returned'];
    if (!itemId || quantity <= 0 || !allowedTypes.includes(type)) {
      return res.status(400).json({ success: false, message: 'Invalid movement payload' });
    }

    await conn.beginTransaction();
    const [[item]] = await conn.query(
      `SELECT id, quantity
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
    if (type === 'received' || type === 'returned') nextQty = currentQty + quantity;
    else if (type === 'issued') nextQty = Math.max(0, currentQty - quantity);
    else if (type === 'adjusted') nextQty = quantity;

    const [movementInsert] = await conn.query(
      `INSERT INTO store_movements
       (school_id, item_id, type, quantity, unit_cost, ref, note, created_by_user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [schoolId, itemId, type, quantity, unitCost || null, ref, note, userId]
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
