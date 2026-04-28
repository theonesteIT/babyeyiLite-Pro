'use strict';

const express = require('express');
const { promisePool } = require('../config/database');
const { fetchActiveCatalogMaps } = require('./shuleAvanceCatalogStore');

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
const PORTAL_OPS_PREFIX_RE = /^\/(teacher-portal\/requisitions|accountant\/(?:requisitions|expenses|payroll(?:-requests)?)|manager\/payroll-requests|staff\/payroll\/my|payroll\/audit-log|store\/(?:requisitions|inventory|suppliers|movements)|admin\/portal-audit-logs|tools\/ticha-ai)(\/|$)/i;

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

function monthLabelToNumber(v) {
  const raw = String(v || '').trim();
  const n = Number(raw);
  if (n >= 1 && n <= 12) return n;
  const labels = {
    january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
    july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
  };
  return labels[raw.toLowerCase()] || 0;
}

function numberToMonthLabel(n) {
  const idx = Number(n) - 1;
  const labels = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return labels[idx] || String(n || '');
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

async function createPayrollNotification({
  schoolId,
  requestId,
  actorUserId,
  actorRoleCode,
  eventType,
  recipientRoleCode,
  message,
}) {
  try {
    await promisePool.query(
      `INSERT INTO payroll_notifications
       (school_id, request_id, actor_user_id, actor_role_code, event_type, recipient_role_code, message)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        schoolId,
        requestId,
        actorUserId || null,
        actorRoleCode || null,
        eventType || null,
        recipientRoleCode || null,
        String(message || '').slice(0, 500) || null,
      ]
    );
  } catch (e) {
    console.warn('[portalOperations] payroll notification skipped:', e.message);
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
  await promisePool.query(`ALTER TABLE payroll_requests ADD COLUMN paid_by_user_id INT UNSIGNED NULL`).catch(() => {});

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
  await promisePool.query(`ALTER TABLE accountant_payroll_payments ADD COLUMN pay_term VARCHAR(32) NULL`).catch(() => {});
  await promisePool.query(`ALTER TABLE accountant_payroll_payments ADD COLUMN academic_year_label VARCHAR(64) NULL`).catch(() => {});
  await promisePool.query(`ALTER TABLE accountant_payroll_payments ADD COLUMN requested_amount_rwf DECIMAL(14,2) NOT NULL DEFAULT 0`).catch(() => {});
  await promisePool.query(`ALTER TABLE accountant_payroll_payments ADD COLUMN approved_by_user_id INT UNSIGNED NULL`).catch(() => {});
  await promisePool.query(`ALTER TABLE accountant_payroll_payments ADD COLUMN approved_at DATETIME NULL`).catch(() => {});
  await promisePool.query(`ALTER TABLE accountant_payroll_payments ADD COLUMN manager_note TEXT NULL`).catch(() => {});
  await promisePool.query(`ALTER TABLE accountant_payroll_payments ADD COLUMN final_payable_rwf DECIMAL(14,2) NOT NULL DEFAULT 0`).catch(() => {});
  await promisePool.query(`ALTER TABLE accountant_payroll_payments ADD COLUMN paid_amount_rwf DECIMAL(14,2) NOT NULL DEFAULT 0`).catch(() => {});
  await promisePool.query(`ALTER TABLE accountant_payroll_payments ADD COLUMN remaining_amount_rwf DECIMAL(14,2) NOT NULL DEFAULT 0`).catch(() => {});
  await promisePool.query(`ALTER TABLE accountant_payroll_payments ADD COLUMN payment_completion_status VARCHAR(32) NOT NULL DEFAULT 'fully_paid'`).catch(() => {});
  await promisePool.query(`ALTER TABLE accountant_payroll_payments ADD COLUMN last_payment_at DATETIME NULL`).catch(() => {});
  await promisePool.query(`ALTER TABLE payroll_requests DROP INDEX uq_payroll_request_unique`).catch(() => {});
  await promisePool.query(`ALTER TABLE payroll_requests ADD INDEX idx_payroll_request_period (school_id, staff_user_id, month, term, year)`).catch(() => {});

  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS payroll_requests (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      staff_user_id INT UNSIGNED NOT NULL,
      staff_code VARCHAR(64) NULL,
      staff_name VARCHAR(180) NOT NULL,
      role_code VARCHAR(64) NULL,
      department VARCHAR(120) NULL,
      month TINYINT UNSIGNED NOT NULL,
      term VARCHAR(32) NOT NULL,
      year SMALLINT UNSIGNED NOT NULL,
      amount DECIMAL(14,2) NOT NULL DEFAULT 0,
      status ENUM('Pending','Approved','Rejected','Paid') NOT NULL DEFAULT 'Pending',
      created_by_user_id INT UNSIGNED NOT NULL,
      approved_by_user_id INT UNSIGNED NULL,
      rejected_reason TEXT NULL,
      manager_note TEXT NULL,
      approved_at DATETIME NULL,
      paid_at DATETIME NULL,
      locked_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL,
      UNIQUE KEY uq_payroll_request_unique (school_id, staff_user_id, month, term, year),
      KEY idx_payroll_req_school (school_id),
      KEY idx_payroll_req_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS payroll_details (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      request_id INT UNSIGNED NOT NULL,
      school_id INT UNSIGNED NOT NULL,
      basic DECIMAL(14,2) NOT NULL DEFAULT 0,
      allowances DECIMAL(14,2) NOT NULL DEFAULT 0,
      deductions DECIMAL(14,2) NOT NULL DEFAULT 0,
      net_salary DECIMAL(14,2) NOT NULL DEFAULT 0,
      advance DECIMAL(14,2) NOT NULL DEFAULT 0,
      final_payable DECIMAL(14,2) NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_payroll_details_request (request_id),
      KEY idx_payroll_details_school (school_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS payroll_notifications (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      request_id INT UNSIGNED NOT NULL,
      actor_user_id INT UNSIGNED NULL,
      actor_role_code VARCHAR(64) NULL,
      event_type VARCHAR(64) NOT NULL,
      recipient_role_code VARCHAR(64) NULL,
      message VARCHAR(500) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_payroll_notif_school (school_id),
      KEY idx_payroll_notif_request (request_id),
      KEY idx_payroll_notif_event (event_type)
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
const PAYROLL_PAYMENT_STATUSES = ['pending', 'approved', 'rejected', 'paid'];
const PAYROLL_MANAGER_ROLES = ['SCHOOL_MANAGER', 'SCHOOL_ADMIN'];
const PAYROLL_DECISION_ROLES = ['SCHOOL_MANAGER', 'SCHOOL_ADMIN', 'ACCOUNTANT'];

router.get('/accountant/payroll-requests', requireRole(ACCOUNTANT_READ_ROLES), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const status = String(req.query?.status || '').trim();
    const month = monthLabelToNumber(req.query?.month);
    const term = String(req.query?.term || '').trim();
    const year = Number(req.query?.year || 0);
    const qRaw = String(req.query?.query || '').trim();
    const department = String(req.query?.department || '').trim();
    const q = `%${qRaw}%`;

    const where = ['r.school_id = ?', 'r.deleted_at IS NULL'];
    const params = [schoolId];
    if (status && ['Pending', 'Approved', 'Rejected', 'Paid'].includes(status)) {
      where.push('r.status = ?');
      params.push(status);
    }
    if (month >= 1 && month <= 12) {
      where.push('r.month = ?');
      params.push(month);
    }
    if (term) {
      where.push('r.term = ?');
      params.push(term);
    }
    if (year >= 2000 && year <= 3000) {
      where.push('r.year = ?');
      params.push(year);
    }
    if (qRaw) {
      where.push('(r.staff_name LIKE ? OR COALESCE(r.staff_code, "") LIKE ?)');
      params.push(q, q);
    }
    if (department) {
      where.push('LOWER(COALESCE(r.department, "")) = LOWER(?)');
      params.push(department);
    }

    const [rows] = await promisePool.query(
      `SELECT r.id, r.staff_user_id, r.staff_code, r.staff_name, r.role_code, r.department,
              r.month, r.term, r.year, r.amount, r.status, r.rejected_reason, r.manager_note,
              r.created_by_user_id, r.approved_by_user_id, r.paid_by_user_id, r.approved_at, r.paid_at, r.created_at,
              d.basic, d.allowances, d.deductions, d.net_salary, d.advance, d.final_payable,
              TRIM(CONCAT(COALESCE(cu.first_name, ''), ' ', COALESCE(cu.last_name, ''))) AS submit_actor_name,
              COALESCE(cr.role_code, '') AS submit_actor_role,
              TRIM(CONCAT(COALESCE(apu.first_name, ''), ' ', COALESCE(apu.last_name, ''))) AS approved_actor_name,
              COALESCE(apr.role_code, '') AS approved_actor_role,
              TRIM(CONCAT(COALESCE(pyu.first_name, ''), ' ', COALESCE(pyu.last_name, ''))) AS paid_actor_name,
              COALESCE(pyr.role_code, '') AS paid_actor_role
       FROM payroll_requests r
       LEFT JOIN payroll_details d ON d.request_id = r.id AND d.school_id = r.school_id
       LEFT JOIN users cu ON cu.id = r.created_by_user_id
       LEFT JOIN roles cr ON cr.id = cu.role_id
       LEFT JOIN users apu ON apu.id = r.approved_by_user_id
       LEFT JOIN roles apr ON apr.id = apu.role_id
       LEFT JOIN users pyu ON pyu.id = r.paid_by_user_id
       LEFT JOIN roles pyr ON pyr.id = pyu.role_id
       WHERE ${where.join(' AND ')}
       ORDER BY r.id DESC
       LIMIT 500`,
      params
    );

    return res.json({
      success: true,
      data: (rows || []).map((r) => ({
        id: Number(r.id),
        payrollId: `PAY-${r.id}`,
        staffUserId: Number(r.staff_user_id),
        staffCode: r.staff_code || `STF-${r.staff_user_id}`,
        staffName: r.staff_name || '',
        role: r.role_code || 'STAFF',
        department: r.department || '',
        month: numberToMonthLabel(r.month),
        monthNumber: Number(r.month || 0),
        term: r.term || '',
        year: String(r.year || ''),
        amount: Number(r.amount || 0),
        status: r.status || 'Pending',
        basic: Number(r.basic || 0),
        allowances: Number(r.allowances || 0),
        deductions: Number(r.deductions || 0),
        netSalary: Number(r.net_salary || 0),
        advance: Number(r.advance || 0),
        finalPayable: Number(r.final_payable || 0),
        rejectedReason: r.rejected_reason || '',
        managerNote: r.manager_note || '',
        submittedBy: r.submit_actor_name || '',
        submittedByRole: r.submit_actor_role || '',
        submittedAt: r.created_at || null,
        approvedByUserId: Number(r.approved_by_user_id || 0) || null,
        paidByUserId: Number(r.paid_by_user_id || 0) || null,
        approvedBy: r.approved_actor_name || '',
        approvedByRole: r.approved_actor_role || '',
        approvedAt: r.approved_at || null,
        paidBy: r.paid_actor_name || '',
        paidByRole: r.paid_actor_role || '',
        paidAt: r.paid_at || null,
        createdAt: r.created_at,
      })),
    });
  } catch (e) {
    console.error('[accountant/payroll-requests GET]:', e.message);
    return res.status(500).json({ success: false, message: 'Failed to load payroll requests' });
  }
});

router.get('/manager/payroll-requests', requireRole(PAYROLL_MANAGER_ROLES), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const status = String(req.query?.status || '').trim();
    const month = monthLabelToNumber(req.query?.month);
    const term = String(req.query?.term || '').trim();
    const year = Number(req.query?.year || 0);
    const qRaw = String(req.query?.query || '').trim();
    const department = String(req.query?.department || '').trim();
    const page = Math.max(1, Number(req.query?.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query?.limit) || 20));
    const offset = (page - 1) * limit;
    const q = `%${qRaw}%`;

    const where = ['r.school_id = ?', 'r.deleted_at IS NULL'];
    const params = [schoolId];
    if (status && ['Pending', 'Approved', 'Rejected', 'Paid'].includes(status)) {
      where.push('r.status = ?');
      params.push(status);
    }
    if (month >= 1 && month <= 12) {
      where.push('r.month = ?');
      params.push(month);
    }
    if (term) {
      where.push('r.term = ?');
      params.push(term);
    }
    if (year >= 2000 && year <= 3000) {
      where.push('r.year = ?');
      params.push(year);
    }
    if (qRaw) {
      where.push('(r.staff_name LIKE ? OR COALESCE(r.staff_code, "") LIKE ?)');
      params.push(q, q);
    }
    if (department) {
      where.push('LOWER(COALESCE(r.department, "")) = LOWER(?)');
      params.push(department);
    }

    const [countRows] = await promisePool.query(
      `SELECT COUNT(*) AS total
       FROM payroll_requests r
       WHERE ${where.join(' AND ')}`,
      params
    );
    const total = Number(countRows?.[0]?.total || 0);

    const [rows] = await promisePool.query(
      `SELECT r.id, r.staff_user_id, r.staff_code, r.staff_name, r.role_code, r.department,
              r.month, r.term, r.year, r.amount, r.status, r.rejected_reason, r.manager_note,
              r.created_by_user_id, r.approved_by_user_id, r.paid_by_user_id, r.approved_at, r.paid_at, r.created_at,
              d.basic, d.allowances, d.deductions, d.net_salary, d.advance, d.final_payable,
              TRIM(CONCAT(COALESCE(cu.first_name, ''), ' ', COALESCE(cu.last_name, ''))) AS submit_actor_name,
              COALESCE(cr.role_code, '') AS submit_actor_role,
              TRIM(CONCAT(COALESCE(apu.first_name, ''), ' ', COALESCE(apu.last_name, ''))) AS approved_actor_name,
              COALESCE(apr.role_code, '') AS approved_actor_role,
              TRIM(CONCAT(COALESCE(pyu.first_name, ''), ' ', COALESCE(pyu.last_name, ''))) AS paid_actor_name,
              COALESCE(pyr.role_code, '') AS paid_actor_role
       FROM payroll_requests r
       LEFT JOIN payroll_details d ON d.request_id = r.id AND d.school_id = r.school_id
       LEFT JOIN users cu ON cu.id = r.created_by_user_id
       LEFT JOIN roles cr ON cr.id = cu.role_id
       LEFT JOIN users apu ON apu.id = r.approved_by_user_id
       LEFT JOIN roles apr ON apr.id = apu.role_id
       LEFT JOIN users pyu ON pyu.id = r.paid_by_user_id
       LEFT JOIN roles pyr ON pyr.id = pyu.role_id
       WHERE ${where.join(' AND ')}
       ORDER BY r.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return res.json({
      success: true,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
      data: (rows || []).map((r) => ({
        id: Number(r.id),
        payrollId: `PAY-${r.id}`,
        staffUserId: Number(r.staff_user_id),
        staffCode: r.staff_code || `STF-${r.staff_user_id}`,
        staffName: r.staff_name || '',
        role: r.role_code || 'STAFF',
        department: r.department || '',
        month: numberToMonthLabel(r.month),
        monthNumber: Number(r.month || 0),
        term: r.term || '',
        year: String(r.year || ''),
        amount: Number(r.amount || 0),
        status: r.status || 'Pending',
        basic: Number(r.basic || 0),
        allowances: Number(r.allowances || 0),
        deductions: Number(r.deductions || 0),
        netSalary: Number(r.net_salary || 0),
        advance: Number(r.advance || 0),
        finalPayable: Number(r.final_payable || 0),
        rejectedReason: r.rejected_reason || '',
        managerNote: r.manager_note || '',
        submittedBy: r.submit_actor_name || '',
        submittedByRole: r.submit_actor_role || '',
        submittedAt: r.created_at || null,
        approvedByUserId: Number(r.approved_by_user_id || 0) || null,
        paidByUserId: Number(r.paid_by_user_id || 0) || null,
        approvedBy: r.approved_actor_name || '',
        approvedByRole: r.approved_actor_role || '',
        approvedAt: r.approved_at || null,
        paidBy: r.paid_actor_name || '',
        paidByRole: r.paid_actor_role || '',
        paidAt: r.paid_at || null,
        createdAt: r.created_at,
      })),
    });
  } catch (e) {
    console.error('[manager/payroll-requests GET]:', e.message);
    return res.status(500).json({ success: false, message: 'Failed to load payroll requests' });
  }
});

router.get('/accountant/payroll-requests/:id/details', requireRole(ACCOUNTANT_READ_ROLES), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const id = Number(String(req.params.id || '').replace('PAY-', ''));
    if (!id) return res.status(400).json({ success: false, message: 'Invalid payroll request id' });

    const [[row]] = await promisePool.query(
      `SELECT r.id, r.staff_user_id, r.staff_code, r.staff_name, r.role_code, r.department,
              r.month, r.term, r.year, r.amount, r.status, r.rejected_reason, r.manager_note,
              r.created_by_user_id, r.approved_by_user_id, r.paid_by_user_id, r.approved_at, r.paid_at, r.created_at,
              d.basic, d.allowances, d.deductions, d.net_salary, d.advance, d.final_payable,
              TRIM(CONCAT(COALESCE(cu.first_name, ''), ' ', COALESCE(cu.last_name, ''))) AS submit_actor_name,
              COALESCE(cr.role_code, '') AS submit_actor_role,
              TRIM(CONCAT(COALESCE(apu.first_name, ''), ' ', COALESCE(apu.last_name, ''))) AS approved_actor_name,
              COALESCE(apr.role_code, '') AS approved_actor_role,
              TRIM(CONCAT(COALESCE(pyu.first_name, ''), ' ', COALESCE(pyu.last_name, ''))) AS paid_actor_name,
              COALESCE(pyr.role_code, '') AS paid_actor_role
       FROM payroll_requests r
       LEFT JOIN payroll_details d ON d.request_id = r.id AND d.school_id = r.school_id
       LEFT JOIN users cu ON cu.id = r.created_by_user_id
       LEFT JOIN roles cr ON cr.id = cu.role_id
       LEFT JOIN users apu ON apu.id = r.approved_by_user_id
       LEFT JOIN roles apr ON apr.id = apu.role_id
       LEFT JOIN users pyu ON pyu.id = r.paid_by_user_id
       LEFT JOIN roles pyr ON pyr.id = pyu.role_id
       WHERE r.school_id = ? AND r.id = ? AND r.deleted_at IS NULL
       LIMIT 1`,
      [schoolId, id]
    );
    if (!row) return res.status(404).json({ success: false, message: 'Payroll request not found' });

    return res.json({
      success: true,
      data: {
        id: Number(row.id),
        payrollId: `PAY-${row.id}`,
        staffUserId: Number(row.staff_user_id),
        staffCode: row.staff_code || `STF-${row.staff_user_id}`,
        staffName: row.staff_name || '',
        role: row.role_code || 'STAFF',
        department: row.department || '',
        month: numberToMonthLabel(row.month),
        monthNumber: Number(row.month || 0),
        term: row.term || '',
        year: String(row.year || ''),
        amount: Number(row.amount || 0),
        status: row.status || 'Pending',
        basic: Number(row.basic || 0),
        allowances: Number(row.allowances || 0),
        deductions: Number(row.deductions || 0),
        netSalary: Number(row.net_salary || 0),
        advance: Number(row.advance || 0),
        finalPayable: Number(row.final_payable || 0),
        rejectedReason: row.rejected_reason || '',
        managerNote: row.manager_note || '',
        submittedBy: row.submit_actor_name || '',
        submittedByRole: row.submit_actor_role || '',
        submittedAt: row.created_at || null,
        approvedByUserId: Number(row.approved_by_user_id || 0) || null,
        paidByUserId: Number(row.paid_by_user_id || 0) || null,
        approvedBy: row.approved_actor_name || '',
        approvedByRole: row.approved_actor_role || '',
        approvedAt: row.approved_at || null,
        paidBy: row.paid_actor_name || '',
        paidByRole: row.paid_actor_role || '',
        paidAt: row.paid_at || null,
        createdAt: row.created_at,
      },
    });
  } catch (e) {
    console.error('[accountant/payroll-requests/:id/details GET]:', e.message);
    return res.status(500).json({ success: false, message: 'Failed to load payroll details' });
  }
});

router.get('/staff/payroll/my', async (req, res) => {
  try {
    const { schoolId, userId } = req.ctx;
    if (!schoolId || !userId) {
      return res.status(400).json({ success: false, message: 'Missing school or user context' });
    }

    const [[userRow]] = await promisePool.query(
      `SELECT u.id, u.user_uid, u.first_name, u.last_name, u.email, u.phone,
              r.role_code,
              st.department, st.date_of_employment,
              st.payroll_basic_salary, st.payroll_transport_allowance, st.payroll_housing_allowance, st.payroll_meal_allowance,
              st.payroll_other_allowances, st.payroll_tax_percent, st.payroll_pension_amount, st.payroll_other_deductions
       FROM users u
       LEFT JOIN roles r ON r.id = u.role_id
       LEFT JOIN staff st ON st.school_id = u.school_id AND st.user_id = u.id
       WHERE u.school_id = ? AND u.id = ? AND u.deleted_at IS NULL
       LIMIT 1`,
      [schoolId, userId]
    );
    if (!userRow) {
      return res.json({
        success: true,
        data: {
          staff: {
            staffUserId: Number(userId || 0),
            staffCode: `STF-${userId || 0}`,
            fullName: 'Staff',
            role: 'STAFF',
            department: 'STAFF',
            email: '',
            phone: '',
            joinDate: null,
            avatar: null,
          },
          currentSalary: { basic: 0, allowances: 0, rssb: 0, tax: 0, net: 0 },
          advance: { totalLoan: 0, totalPaid: 0, remaining: 0, monthlyDeduction: 0, disbursedDate: null, expectedEndDate: null },
          history: [],
          notifications: [],
        },
      });
    }

    const parseList = (raw) => {
      if (Array.isArray(raw)) return raw;
      if (typeof raw !== 'string' || !raw.trim()) return [];
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    };
    const monthName = (n) => {
      const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      return months[Math.max(0, Number(n || 1) - 1)] || String(n || '');
    };

    const basic = toMoney(userRow.payroll_basic_salary);
    const fixedAllowances =
      toMoney(userRow.payroll_transport_allowance) +
      toMoney(userRow.payroll_housing_allowance) +
      toMoney(userRow.payroll_meal_allowance);
    const extraAllowances = parseList(userRow.payroll_other_allowances).reduce((sum, item) => sum + toMoney(item?.amount), 0);
    const allowances = fixedAllowances + extraAllowances;
    const gross = basic + allowances;
    const tax = (gross * toMoney(userRow.payroll_tax_percent)) / 100;
    const pension = toMoney(userRow.payroll_pension_amount);
    const otherDeductions = parseList(userRow.payroll_other_deductions).reduce((sum, item) => sum + toMoney(item?.amount), 0);
    const deductions = tax + pension + otherDeductions;
    const net = Math.max(0, gross - deductions);

    const [payRows] = await promisePool.query(
      `SELECT r.id, r.month, r.term, r.year, r.amount, r.status, r.created_at, r.approved_at, r.paid_at,
              d.basic, d.allowances, d.deductions, d.net_salary, d.advance, d.final_payable,
              TRIM(CONCAT(COALESCE(cu.first_name, ''), ' ', COALESCE(cu.last_name, ''))) AS submit_actor_name,
              TRIM(CONCAT(COALESCE(apu.first_name, ''), ' ', COALESCE(apu.last_name, ''))) AS approved_actor_name
       FROM payroll_requests r
       LEFT JOIN payroll_details d ON d.request_id = r.id AND d.school_id = r.school_id
       LEFT JOIN users cu ON cu.id = r.created_by_user_id
       LEFT JOIN users apu ON apu.id = r.approved_by_user_id
       WHERE r.school_id = ? AND r.staff_user_id = ? AND r.deleted_at IS NULL
       ORDER BY r.year DESC, r.month DESC, r.id DESC
       LIMIT 80`,
      [schoolId, userId]
    );

    const history = (payRows || []).map((r) => ({
      id: Number(r.id),
      month: monthName(r.month),
      term: r.term || '',
      year: Number(r.year || 0),
      basic: toMoney(r.basic),
      allowances: toMoney(r.allowances),
      rssb: 0,
      tax: toMoney(r.deductions),
      advance: toMoney(r.advance),
      net: toMoney(r.net_salary),
      paid: String(r.status || '') === 'Paid' ? toMoney(r.amount) : 0,
      status: r.status || 'Pending',
      paidDate: r.paid_at || null,
      submittedBy: r.submit_actor_name || null,
      approvedBy: r.approved_actor_name || null,
    }));

    const [advanceRows] = await promisePool.query(
      `SELECT id, amount_rwf, status, submitted_at
       FROM shule_avance_requests
       WHERE school_id = ? AND teacher_user_id = ?
       ORDER BY id DESC
       LIMIT 120`,
      [schoolId, userId]
    );
    const totalLoan = (advanceRows || []).reduce((sum, row) => sum + toMoney(row.amount_rwf), 0);
    const remaining = (advanceRows || [])
      .filter((row) => ['pending_accountant', 'sent_to_manager', 'approved'].includes(String(row.status || '').toLowerCase()))
      .reduce((sum, row) => sum + toMoney(row.amount_rwf), 0);
    const totalPaid = Math.max(0, totalLoan - remaining);

    return res.json({
      success: true,
      data: {
        staff: {
          staffUserId: Number(userRow.id),
          staffCode: userRow.user_uid || `STF-${userRow.id}`,
          fullName: `${userRow.first_name || ''} ${userRow.last_name || ''}`.trim(),
          role: String(userRow.role_code || 'STAFF').toUpperCase(),
          department: userRow.department || String(userRow.role_code || 'STAFF').toUpperCase(),
          email: userRow.email || '',
          phone: userRow.phone || '',
          joinDate: userRow.date_of_employment || null,
          avatar: null,
        },
        currentSalary: {
          basic,
          allowances,
          rssb: pension,
          tax,
          net,
        },
        advance: {
          totalLoan,
          totalPaid,
          remaining,
          monthlyDeduction: 0,
          disbursedDate: (advanceRows || [])[0]?.submitted_at || null,
          expectedEndDate: null,
        },
        history,
        notifications: [],
      },
    });
  } catch (e) {
    console.error('[staff/payroll/my GET]:', e.message);
    return res.status(500).json({ success: false, message: 'Failed to load my payroll data' });
  }
});

router.post('/accountant/payroll-requests', requireRole(ACCOUNTANT_WRITE_ROLES), async (req, res) => {
  const conn = await promisePool.getConnection();
  try {
    const { schoolId, userId, roleCode } = req.ctx;
    const payload = req.body || {};
    const staffUserId = Number(payload.staffUserId || 0);
    const staffCode = String(payload.staffCode || '').trim();
    const staffName = String(payload.staffName || '').trim();
    const role = String(payload.role || 'STAFF').trim().toUpperCase();
    const department = String(payload.department || role).trim().toUpperCase();
    const month = monthLabelToNumber(payload.month);
    const term = String(payload.term || '').trim();
    const year = Number(payload.year || 0);
    const amount = toMoney(payload.amount);
    const basic = toMoney(payload.basic);
    const allowances = toMoney(payload.allowances);
    const deductions = toMoney(payload.deductions);
    const netSalary = toMoney(payload.netSalary);
    const advance = toMoney(payload.advance);
    const finalPayable = toMoney(payload.finalPayable);

    if (!staffUserId) return res.status(400).json({ success: false, message: 'staffUserId is required' });
    if (!staffName) return res.status(400).json({ success: false, message: 'staffName is required' });
    if (!(month >= 1 && month <= 12)) return res.status(400).json({ success: false, message: 'valid month is required' });
    if (!term) return res.status(400).json({ success: false, message: 'term is required' });
    if (!(year >= 2000 && year <= 3000)) return res.status(400).json({ success: false, message: 'valid year is required' });
    if (!(amount > 0)) return res.status(400).json({ success: false, message: 'amount must be greater than zero' });
    if (finalPayable > 0 && amount > finalPayable) {
      return res.status(400).json({ success: false, message: `Amount exceeds allowed net salary (${Math.round(finalPayable)} RWF)` });
    }

    await conn.beginTransaction();

    const [existingRows] = await conn.query(
      `SELECT r.id, r.status, r.amount, d.final_payable
       FROM payroll_requests r
       LEFT JOIN payroll_details d ON d.request_id = r.id AND d.school_id = r.school_id
       WHERE r.school_id = ? AND r.staff_user_id = ? AND r.month = ? AND r.term = ? AND r.year = ?
         AND r.deleted_at IS NULL
       ORDER BY r.id DESC`,
      [schoolId, staffUserId, month, term, year]
    );
    const hasPendingOrApproved = (existingRows || []).some((x) => x.status === 'Pending' || x.status === 'Approved');
    if (hasPendingOrApproved) {
      await conn.rollback();
      return res.status(409).json({ success: false, message: 'This payroll request is waiting manager action.' });
    }
    const alreadyPaid = (existingRows || [])
      .filter((x) => x.status === 'Paid')
      .reduce((sum, x) => sum + toMoney(x.amount), 0);
    const existingFinal = (existingRows || []).reduce((m, x) => Math.max(m, toMoney(x.final_payable)), 0);
    const finalForPeriod = Math.max(existingFinal, finalPayable);
    const remainingForPeriod = Math.max(0, finalForPeriod - alreadyPaid);
    if (existingRows?.length && remainingForPeriod <= 0) {
      await conn.rollback();
      return res.status(409).json({ success: false, message: `Salary for ${numberToMonthLabel(month)} is already fully paid.` });
    }
    if (existingRows?.length && amount > remainingForPeriod) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: `Amount exceeds remaining balance (${Math.round(remainingForPeriod)} RWF).` });
    }

    const [insReq] = await conn.query(
      `INSERT INTO payroll_requests
       (school_id, staff_user_id, staff_code, staff_name, role_code, department, month, term, year, amount, status, created_by_user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', ?)`,
      [schoolId, staffUserId, staffCode || `STF-${staffUserId}`, staffName, role, department, month, term, year, amount, userId]
    );

    await conn.query(
      `INSERT INTO payroll_details
       (request_id, school_id, basic, allowances, deductions, net_salary, advance, final_payable)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [insReq.insertId, schoolId, basic, allowances, deductions, netSalary, advance, finalPayable]
    );

    await conn.commit();

    await appendAuditLog({
      schoolId,
      userId,
      roleCode,
      endpoint: '/accountant/payroll-requests',
      entityType: 'payroll_request',
      entityId: insReq.insertId,
      action: 'create',
      afterState: { staff_user_id: staffUserId, month, term, year, amount, status: 'Pending' },
    });

    await createPayrollNotification({
      schoolId,
      requestId: insReq.insertId,
      actorUserId: userId,
      actorRoleCode: roleCode,
      eventType: 'REQUEST_SUBMITTED',
      recipientRoleCode: 'SCHOOL_MANAGER',
      message: `Payroll request PAY-${insReq.insertId} submitted for ${staffName} (${numberToMonthLabel(month)} ${year}, ${term}).`,
    });
    const io = req.app?.get('io');
    if (io) {
      io.emit('payroll:request-submitted', { school_id: schoolId, request_id: insReq.insertId, staff_name: staffName, term, year, month });
    }

    return res.status(201).json({
      success: true,
      message: 'Payroll request submitted',
      data: { id: insReq.insertId, payrollId: `PAY-${insReq.insertId}`, status: 'Pending' },
    });
  } catch (e) {
    await conn.rollback();
    console.error('[accountant/payroll-requests POST]:', e.message);
    return res.status(500).json({ success: false, message: 'Failed to create payroll request' });
  } finally {
    conn.release();
  }
});

router.post('/accountant/payroll-requests/finish-payment', requireRole(ACCOUNTANT_WRITE_ROLES), async (req, res) => {
  const conn = await promisePool.getConnection();
  try {
    const { schoolId, userId, roleCode } = req.ctx;
    const payload = req.body || {};
    const staffUserId = Number(payload.staffUserId || 0);
    const month = monthLabelToNumber(payload.month);
    const term = String(payload.term || '').trim();
    const year = Number(payload.year || 0);
    const amount = toMoney(payload.amount);

    if (!staffUserId) return res.status(400).json({ success: false, message: 'staffUserId is required' });
    if (!(month >= 1 && month <= 12)) return res.status(400).json({ success: false, message: 'valid month is required' });
    if (!term) return res.status(400).json({ success: false, message: 'term is required' });
    if (!(year >= 2000 && year <= 3000)) return res.status(400).json({ success: false, message: 'valid year is required' });
    if (!(amount > 0)) return res.status(400).json({ success: false, message: 'amount must be greater than zero' });

    await conn.beginTransaction();
    const [rows] = await conn.query(
      `SELECT r.id, r.staff_code, r.staff_name, r.role_code, r.department, r.status, r.amount,
              d.basic, d.allowances, d.deductions, d.net_salary, d.advance, d.final_payable
       FROM payroll_requests r
       LEFT JOIN payroll_details d ON d.request_id = r.id AND d.school_id = r.school_id
       WHERE r.school_id = ? AND r.staff_user_id = ? AND r.month = ? AND r.term = ? AND r.year = ?
         AND r.deleted_at IS NULL
       ORDER BY r.id DESC`,
      [schoolId, staffUserId, month, term, year]
    );
    if (!rows.length) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'No payroll request found for this period' });
    }

    const hasPendingOrApproved = rows.some((r) => r.status === 'Pending' || r.status === 'Approved');
    if (hasPendingOrApproved) {
      await conn.rollback();
      return res.status(409).json({ success: false, message: 'This payroll period is waiting manager action first.' });
    }

    const finalPayable = rows.reduce((m, r) => Math.max(m, toMoney(r.final_payable)), 0);
    const paidAmount = rows.filter((r) => r.status === 'Paid').reduce((s, r) => s + toMoney(r.amount), 0);
    const remaining = Math.max(0, finalPayable - paidAmount);
    if (remaining <= 0) {
      await conn.rollback();
      return res.status(409).json({ success: false, message: 'This payroll period is already fully paid' });
    }
    if (amount > remaining) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: `Amount exceeds remaining balance (${Math.round(remaining)} RWF)` });
    }

    const tpl = rows[0];
    const [insReq] = await conn.query(
      `INSERT INTO payroll_requests
       (school_id, staff_user_id, staff_code, staff_name, role_code, department, month, term, year, amount, status, created_by_user_id, paid_by_user_id, paid_at, locked_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Paid', ?, ?, NOW(), CASE WHEN ? >= ? THEN NOW() ELSE NULL END)`,
      [
        schoolId, staffUserId, tpl.staff_code || `STF-${staffUserId}`, tpl.staff_name || `User ${staffUserId}`,
        tpl.role_code || 'STAFF', tpl.department || (tpl.role_code || 'STAFF'),
        month, term, year, amount, userId, userId, (paidAmount + amount), finalPayable,
      ]
    );
    await conn.query(
      `INSERT INTO payroll_details
       (request_id, school_id, basic, allowances, deductions, net_salary, advance, final_payable)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        insReq.insertId, schoolId,
        toMoney(tpl.basic), toMoney(tpl.allowances), toMoney(tpl.deductions),
        toMoney(tpl.net_salary), toMoney(tpl.advance), finalPayable,
      ]
    );

    await conn.commit();

    const remainingAfter = Math.max(0, finalPayable - (paidAmount + amount));
    await appendAuditLog({
      schoolId,
      userId,
      roleCode,
      endpoint: '/accountant/payroll-requests/finish-payment',
      entityType: 'payroll_request',
      entityId: insReq.insertId,
      action: 'pay',
      afterState: { staff_user_id: staffUserId, month, term, year, amount, remaining_after: remainingAfter },
    });

    return res.status(201).json({
      success: true,
      message: remainingAfter === 0 ? 'Payment completed for this month' : 'Partial payment recorded',
      data: { id: insReq.insertId, remainingAfter, fullyPaid: remainingAfter === 0 },
    });
  } catch (e) {
    await conn.rollback();
    console.error('[accountant/payroll-requests/finish-payment POST]:', e.message);
    return res.status(500).json({ success: false, message: 'Failed to finish payroll payment' });
  } finally {
    conn.release();
  }
});

router.patch('/manager/payroll-requests/:id/decision', requireRole(PAYROLL_DECISION_ROLES), async (req, res) => {
  try {
    const { schoolId, userId, roleCode } = req.ctx;
    const id = Number(String(req.params.id || '').replace('PAY-', ''));
    if (!id) return res.status(400).json({ success: false, message: 'Invalid payroll request id' });
    const decision = String(req.body?.decision || '').trim().toLowerCase();
    const reason = String(req.body?.reason || req.body?.note || '').trim();

    let nextStatus = '';
    if (decision === 'approve') nextStatus = 'Approved';
    if (decision === 'reject') nextStatus = 'Rejected';
    if (decision === 'pay' || decision === 'mark_paid' || decision === 'paid') nextStatus = 'Paid';
    if (!nextStatus) return res.status(400).json({ success: false, message: 'decision must be approve, reject, or pay' });
    if (roleCode === 'ACCOUNTANT' && nextStatus !== 'Paid') {
      return res.status(403).json({ success: false, message: 'Accountant can only mark approved payroll as paid' });
    }
    if (nextStatus === 'Rejected' && !reason) return res.status(400).json({ success: false, message: 'Rejection reason is required' });

    const [[existing]] = await promisePool.query(
      `SELECT id, staff_name, status
       FROM payroll_requests
       WHERE school_id = ? AND id = ? AND deleted_at IS NULL
       LIMIT 1`,
      [schoolId, id]
    );
    if (!existing) return res.status(404).json({ success: false, message: 'Payroll request not found' });
    if (existing.status === 'Paid') return res.status(409).json({ success: false, message: 'Payroll is already paid and locked' });
    if (nextStatus === 'Paid' && existing.status !== 'Approved') {
      return res.status(409).json({ success: false, message: 'Only approved payroll requests can be marked as paid' });
    }

    const [r] = await promisePool.query(
      `UPDATE payroll_requests
       SET status = ?,
           approved_by_user_id = CASE WHEN ? = 'Approved' THEN ? ELSE approved_by_user_id END,
           approved_at = CASE WHEN ? = 'Approved' THEN NOW() ELSE approved_at END,
           paid_by_user_id = CASE WHEN ? = 'Paid' THEN ? ELSE paid_by_user_id END,
           paid_at = CASE WHEN ? = 'Paid' THEN NOW() ELSE paid_at END,
           locked_at = CASE WHEN ? = 'Paid' THEN NOW() ELSE locked_at END,
           rejected_reason = CASE WHEN ? = 'Rejected' THEN ? ELSE rejected_reason END,
           manager_note = CASE WHEN ? = 'Rejected' THEN ? ELSE manager_note END
       WHERE school_id = ? AND id = ? AND deleted_at IS NULL`,
      [
        nextStatus,
        nextStatus, userId,
        nextStatus,
        nextStatus, userId,
        nextStatus,
        nextStatus,
        nextStatus, reason || null,
        nextStatus, reason || null,
        schoolId, id,
      ]
    );
    if (!r.affectedRows) return res.status(404).json({ success: false, message: 'Payroll request not found' });

    await appendAuditLog({
      schoolId,
      userId,
      roleCode,
      endpoint: '/manager/payroll-requests/:id/decision',
      entityType: 'payroll_request',
      entityId: id,
      action: nextStatus.toLowerCase(),
      afterState: { status: nextStatus, manager_note: reason || null },
    });
    await createPayrollNotification({
      schoolId,
      requestId: id,
      actorUserId: userId,
      actorRoleCode: roleCode,
      eventType: `REQUEST_${nextStatus.toUpperCase()}`,
      recipientRoleCode: 'ACCOUNTANT',
      message: `Payroll request PAY-${id} for ${existing.staff_name} is now ${nextStatus}.`,
    });
    const io = req.app?.get('io');
    if (io) io.emit('payroll:request-status-changed', { school_id: schoolId, request_id: id, status: nextStatus });

    return res.json({ success: true, message: `Payroll request ${nextStatus.toLowerCase()}` });
  } catch (e) {
    console.error('[manager/payroll-requests/:id/decision PATCH]:', e.message);
    return res.status(500).json({ success: false, message: 'Failed to apply manager payroll decision' });
  }
});

router.get('/payroll/audit-log', requireRole(ACCOUNTANT_READ_ROLES), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const [rows] = await promisePool.query(
      `SELECT id, request_id, actor_user_id, actor_role_code, event_type, recipient_role_code, message, created_at
       FROM payroll_notifications
       WHERE school_id = ?
       ORDER BY id DESC
       LIMIT 500`,
      [schoolId]
    );
    return res.json({
      success: true,
      data: (rows || []).map((r) => ({
        id: Number(r.id),
        requestId: Number(r.request_id),
        actorUserId: Number(r.actor_user_id || 0) || null,
        actorRoleCode: r.actor_role_code || '',
        eventType: r.event_type || '',
        recipientRoleCode: r.recipient_role_code || '',
        message: r.message || '',
        createdAt: r.created_at,
      })),
    });
  } catch (e) {
    console.error('[payroll/audit-log GET]:', e.message);
    return res.status(500).json({ success: false, message: 'Failed to load payroll audit log' });
  }
});

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
              COALESCE(pr.allowance_rwf, 0) AS allowance_rwf,
              st.payroll_basic_salary,
              st.payroll_transport_allowance,
              st.payroll_housing_allowance,
              st.payroll_meal_allowance,
              st.payroll_other_allowances,
              st.payroll_tax_percent,
              st.payroll_pension_amount,
              st.payroll_other_deductions
       FROM users u
       LEFT JOIN roles r ON r.id = u.role_id
       LEFT JOIN staff st ON st.school_id = u.school_id AND st.user_id = u.id
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
          payroll: {
            basicSalary: Number(r.payroll_basic_salary || 0),
            transportAllowance: Number(r.payroll_transport_allowance || 0),
            housingAllowance: Number(r.payroll_housing_allowance || 0),
            mealAllowance: Number(r.payroll_meal_allowance || 0),
            otherAllowances: r.payroll_other_allowances || null,
            taxPercent: Number(r.payroll_tax_percent || 0),
            pensionAmount: Number(r.payroll_pension_amount || 0),
            otherDeductions: r.payroll_other_deductions || null,
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
    const term = String(req.query?.term || '').trim();
    const academicYear = String(req.query?.academic_year || req.query?.academicYear || '').trim();
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
    if (term) {
      where.push('COALESCE(p.pay_term, "") = ?');
      params.push(term);
    }
    if (academicYear) {
      where.push('COALESCE(p.academic_year_label, "") = ?');
      params.push(academicYear);
    }
    const limit = Math.min(500, Math.max(1, Number(req.query?.limit) || 200));

    const [rows] = await promisePool.query(
      `SELECT p.id, p.staff_user_id, p.staff_code, p.staff_name, p.role_code, p.department,
              p.basic_salary_rwf, p.bonus_rwf, p.deduction_rwf, p.net_salary_rwf,
              p.pay_month, p.pay_year, p.pay_term, p.academic_year_label, p.payment_date, p.payment_status, p.payment_method,
              p.requested_amount_rwf, p.note, p.manager_note, p.created_by_user_id, p.approved_by_user_id, p.approved_at, p.created_at, p.updated_at,
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
        term: r.pay_term || '',
        academicYear: r.academic_year_label || '',
        paymentDate: r.payment_date,
        paymentStatus: r.payment_status || 'pending',
        paymentMethod: r.payment_method || '',
        requestedAmount: Number(r.requested_amount_rwf || 0),
        note: r.note || '',
        managerNote: r.manager_note || '',
        createdBy: {
          userId: Number(r.created_by_user_id || 0),
          name: `${r.creator_first_name || ''} ${r.creator_last_name || ''}`.trim() || 'Accountant',
        },
        approvedByUserId: Number(r.approved_by_user_id || 0) || null,
        approvedAt: r.approved_at || null,
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
              p.pay_month, p.pay_year, p.pay_term, p.academic_year_label, p.payment_date, p.payment_status, p.payment_method,
              p.requested_amount_rwf, p.note, p.manager_note, p.created_by_user_id, p.approved_by_user_id, p.approved_at, p.created_at, p.updated_at,
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
        term: r.pay_term || '',
        academicYear: r.academic_year_label || '',
        paymentDate: r.payment_date,
        paymentStatus: r.payment_status || 'pending',
        paymentMethod: r.payment_method || '',
        requestedAmount: Number(r.requested_amount_rwf || 0),
        note: r.note || '',
        managerNote: r.manager_note || '',
        createdBy: {
          userId: Number(r.created_by_user_id || 0),
          name: `${r.creator_first_name || ''} ${r.creator_last_name || ''}`.trim() || 'Accountant',
        },
        approvedByUserId: Number(r.approved_by_user_id || 0) || null,
        approvedAt: r.approved_at || null,
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
    const paymentStatus = String(payload.paymentStatus || payload.payment_status || 'pending').trim().toLowerCase();
    const note = String(payload.note || payload.notes || '').trim() || null;
    const managerNote = String(payload.managerNote || payload.manager_note || '').trim() || null;
    const term = String(payload.term || '').trim();
    const academicYear = String(payload.academicYear || payload.academic_year || '').trim();
    const requestedAmount = toMoney(payload.requestedAmount || payload.requested_amount || netSalaryComputed);

    if (!staffUserId) return res.status(400).json({ success: false, message: 'staffUserId is required' });
    if (!(month >= 1 && month <= 12)) return res.status(400).json({ success: false, message: 'month must be between 1 and 12' });
    if (!(year >= 2000 && year <= 3000)) return res.status(400).json({ success: false, message: 'year is required' });
    if (!(basicSalary > 0)) return res.status(400).json({ success: false, message: 'salary amount must be greater than zero' });
    if (!(requestedAmount > 0)) return res.status(400).json({ success: false, message: 'requested amount must be greater than zero' });
    if (!paymentDate) return res.status(400).json({ success: false, message: 'paymentDate is required' });
    if (!term) return res.status(400).json({ success: false, message: 'term is required' });
    if (!academicYear) return res.status(400).json({ success: false, message: 'academic year is required' });
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

    const [[staffPayroll]] = await promisePool.query(
      `SELECT payroll_basic_salary, payroll_tax_percent, payroll_pension_amount, payroll_other_allowances, payroll_other_deductions
       FROM staff
       WHERE school_id = ? AND user_id = ?
       LIMIT 1`,
      [schoolId, staffUserId]
    );
    if (staffPayroll) {
      let allowances = 0;
      let extraDeductions = 0;
      try {
        const arr = JSON.parse(staffPayroll.payroll_other_allowances || '[]');
        if (Array.isArray(arr)) allowances = arr.reduce((sum, row) => sum + toMoney(row?.amount), 0);
      } catch (_) {}
      try {
        const arr = JSON.parse(staffPayroll.payroll_other_deductions || '[]');
        if (Array.isArray(arr)) extraDeductions = arr.reduce((sum, row) => sum + toMoney(row?.amount), 0);
      } catch (_) {}
      const baseCfg = toMoney(staffPayroll.payroll_basic_salary);
      const grossCfg = baseCfg + allowances;
      const taxCfg = (grossCfg * toMoney(staffPayroll.payroll_tax_percent)) / 100;
      const pensionCfg = toMoney(staffPayroll.payroll_pension_amount);
      const configuredNetCap = Math.max(0, grossCfg - taxCfg - pensionCfg - extraDeductions);
      if (configuredNetCap > 0 && requestedAmount > configuredNetCap) {
        return res.status(400).json({
          success: false,
          message: `Requested amount cannot exceed configured net salary (${Math.round(configuredNetCap)} RWF)`,
        });
      }
    }

    const [[dup]] = await promisePool.query(
      `SELECT id
       FROM accountant_payroll_payments
       WHERE school_id = ? AND staff_user_id = ? AND pay_month = ? AND pay_year = ?
         AND COALESCE(pay_term, '') = ? AND COALESCE(academic_year_label, '') = ?
         AND deleted_at IS NULL
       LIMIT 1`,
      [schoolId, staffUserId, month, year, term, academicYear]
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
        pay_month, pay_year, pay_term, academic_year_label, payment_date, payment_status, payment_method,
        requested_amount_rwf, note, manager_note, created_by_user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        term,
        academicYear,
        toDateOrNow(paymentDate),
        paymentStatus,
        paymentMethod || 'cash',
        requestedAmount,
        note,
        managerNote,
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
      afterState: { staff_user_id: staffUserId, month, year, term, academic_year: academicYear, payment_status: paymentStatus, net_salary_rwf: netSalaryComputed, requested_amount_rwf: requestedAmount },
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

router.get('/accountant/payroll/payments-tracker', requireRole(ACCOUNTANT_READ_ROLES), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const query = String(req.query?.query || '').trim();
    const month = Number(req.query?.month || 0);
    const year = Number(req.query?.year || 0);
    const term = String(req.query?.term || '').trim();
    const academicYear = String(req.query?.academic_year || '').trim();
    const status = String(req.query?.status || '').trim().toLowerCase();
    const where = ['p.school_id = ?', 'p.deleted_at IS NULL'];
    const params = [schoolId];
    if (query) {
      const like = `%${query}%`;
      where.push('(p.staff_name LIKE ? OR COALESCE(p.staff_code, "") LIKE ?)');
      params.push(like, like);
    }
    if (month >= 1 && month <= 12) { where.push('p.pay_month = ?'); params.push(month); }
    if (year >= 2000 && year <= 3000) { where.push('p.pay_year = ?'); params.push(year); }
    if (term) { where.push('COALESCE(p.pay_term, "") = ?'); params.push(term); }
    if (academicYear) { where.push('COALESCE(p.academic_year_label, "") = ?'); params.push(academicYear); }
    if (['fully_paid', 'partially_paid'].includes(status)) {
      where.push('LOWER(COALESCE(p.payment_completion_status, "fully_paid")) = ?');
      params.push(status);
    }

    const [rows] = await promisePool.query(
      `SELECT p.id, p.staff_user_id, p.staff_code, p.staff_name, p.pay_month, p.pay_year, p.pay_term, p.academic_year_label,
              p.final_payable_rwf, p.paid_amount_rwf, p.remaining_amount_rwf, p.payment_completion_status,
              p.last_payment_at, p.created_at
       FROM accountant_payroll_payments p
       WHERE ${where.join(' AND ')}
       ORDER BY p.id DESC
       LIMIT 500`,
      params
    );
    return res.json({
      success: true,
      data: (rows || []).map((r) => ({
        id: Number(r.id),
        staffUserId: Number(r.staff_user_id),
        staffCode: r.staff_code || `STF-${r.staff_user_id}`,
        staffName: r.staff_name || '',
        month: numberToMonthLabel(r.pay_month),
        monthNumber: Number(r.pay_month || 0),
        year: String(r.pay_year || ''),
        term: r.pay_term || '',
        academicYear: r.academic_year_label || '',
        finalPayable: Number(r.final_payable_rwf || 0),
        paidAmount: Number(r.paid_amount_rwf || 0),
        remainingAmount: Number(r.remaining_amount_rwf || 0),
        paymentCompletionStatus: (r.payment_completion_status || 'fully_paid').toLowerCase(),
        lastPaymentAt: r.last_payment_at || null,
        createdAt: r.created_at,
      })),
    });
  } catch (e) {
    console.error('[accountant/payroll/payments-tracker GET]:', e.message);
    return res.status(500).json({ success: false, message: 'Failed to load payment tracker' });
  }
});

router.post('/accountant/payroll/payments', requireRole(ACCOUNTANT_WRITE_ROLES), async (req, res) => {
  try {
    const { schoolId, userId, roleCode } = req.ctx;
    const payload = req.body || {};
    const staffUserId = Number(payload.staffUserId || 0);
    const staffCode = String(payload.staffCode || '').trim();
    const staffName = String(payload.staffName || '').trim();
    const role = String(payload.role || 'STAFF').trim().toUpperCase();
    const department = String(payload.department || role).trim().toUpperCase();
    const month = monthLabelToNumber(payload.month);
    const term = String(payload.term || '').trim();
    const year = Number(payload.year || 0);
    const academicYear = String(payload.academicYear || payload.academic_year || '').trim();
    const finalPayable = toMoney(payload.finalPayable);
    const paidAmount = toMoney(payload.amountToPay || payload.paidAmount || payload.amount);
    const remainingAmount = Math.max(0, finalPayable - paidAmount);
    const completion = remainingAmount === 0 ? 'fully_paid' : 'partially_paid';
    if (!staffUserId) return res.status(400).json({ success: false, message: 'staffUserId is required' });
    if (!(month >= 1 && month <= 12)) return res.status(400).json({ success: false, message: 'Valid month is required' });
    if (!term) return res.status(400).json({ success: false, message: 'term is required' });
    if (!(year >= 2000 && year <= 3000)) return res.status(400).json({ success: false, message: 'Valid year is required' });
    if (!(finalPayable > 0)) return res.status(400).json({ success: false, message: 'finalPayable must be > 0' });
    if (!(paidAmount > 0)) return res.status(400).json({ success: false, message: 'amount to pay must be > 0' });
    if (paidAmount > finalPayable) return res.status(400).json({ success: false, message: `Amount exceeds final payable (${Math.round(finalPayable)} RWF)` });

    const [[existing]] = await promisePool.query(
      `SELECT id, payment_completion_status, paid_amount_rwf, remaining_amount_rwf
       FROM accountant_payroll_payments
       WHERE school_id = ? AND staff_user_id = ? AND pay_month = ? AND pay_year = ?
         AND COALESCE(pay_term, '') = ? AND COALESCE(academic_year_label, '') = ?
         AND deleted_at IS NULL
       LIMIT 1`,
      [schoolId, staffUserId, month, year, term, academicYear]
    );
    if (existing) {
      if (String(existing.payment_completion_status || '').toLowerCase() === 'fully_paid') {
        return res.status(409).json({ success: false, message: `Salary for ${numberToMonthLabel(month)} is already fully paid. Please select another month.` });
      }
      return res.status(409).json({ success: false, message: 'This month is partially paid. Use Finish Payment.', paymentId: Number(existing.id) });
    }

    const [ins] = await promisePool.query(
      `INSERT INTO accountant_payroll_payments
       (school_id, staff_user_id, staff_code, staff_name, role_code, department,
        basic_salary_rwf, bonus_rwf, deduction_rwf, net_salary_rwf,
        pay_month, pay_year, pay_term, academic_year_label, payment_date, payment_status, payment_method,
        requested_amount_rwf, final_payable_rwf, paid_amount_rwf, remaining_amount_rwf, payment_completion_status,
        note, manager_note, created_by_user_id, last_payment_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), 'paid', 'cash', ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        schoolId, staffUserId, staffCode || `STF-${staffUserId}`, staffName || `User ${staffUserId}`, role, department,
        0, 0, 0, 0,
        month, year, term, academicYear || `${year}-${year + 1}`,
        paidAmount, finalPayable, paidAmount, remainingAmount, completion,
        completion === 'partially_paid' ? 'Partial payroll payment' : 'Full payroll payment', null, userId
      ]
    );

    await appendAuditLog({
      schoolId,
      userId,
      roleCode,
      endpoint: '/accountant/payroll/payments',
      entityType: 'payroll_payment',
      entityId: ins.insertId,
      action: 'create',
      afterState: { staff_user_id: staffUserId, month, term, year, paid_amount_rwf: paidAmount, final_payable_rwf: finalPayable, remaining_amount_rwf: remainingAmount, payment_completion_status: completion },
    });

    return res.status(201).json({
      success: true,
      message: completion === 'fully_paid' ? 'Payment successful' : 'Remaining balance updated',
      data: { id: ins.insertId, paymentCompletionStatus: completion, remainingAmount },
    });
  } catch (e) {
    console.error('[accountant/payroll/payments POST]:', e.message);
    return res.status(500).json({ success: false, message: 'Failed to save payroll payment' });
  }
});

router.post('/accountant/payroll/payments/:id/finish', requireRole(ACCOUNTANT_WRITE_ROLES), async (req, res) => {
  try {
    const { schoolId, userId, roleCode } = req.ctx;
    const id = Number(req.params.id || 0);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid payment id' });
    const [[row]] = await promisePool.query(
      `SELECT id, final_payable_rwf, paid_amount_rwf, remaining_amount_rwf, payment_completion_status
       FROM accountant_payroll_payments
       WHERE school_id = ? AND id = ? AND deleted_at IS NULL
       LIMIT 1`,
      [schoolId, id]
    );
    if (!row) return res.status(404).json({ success: false, message: 'Payment not found' });
    if (String(row.payment_completion_status || '').toLowerCase() === 'fully_paid') {
      return res.status(409).json({ success: false, message: 'This salary is already fully paid' });
    }
    const remainingNow = toMoney(row.remaining_amount_rwf);
    const inputAmount = toMoney(req.body?.amountToPay);
    const amountToPay = inputAmount > 0 ? inputAmount : remainingNow;
    if (!(amountToPay > 0)) return res.status(400).json({ success: false, message: 'amount to pay must be > 0' });
    if (amountToPay > remainingNow) return res.status(400).json({ success: false, message: `Amount exceeds remaining balance (${Math.round(remainingNow)} RWF)` });

    const finalPayable = toMoney(row.final_payable_rwf);
    const newPaid = toMoney(row.paid_amount_rwf) + amountToPay;
    const newRemaining = Math.max(0, finalPayable - newPaid);
    const completion = newRemaining === 0 ? 'fully_paid' : 'partially_paid';

    await promisePool.query(
      `UPDATE accountant_payroll_payments
       SET paid_amount_rwf = ?, remaining_amount_rwf = ?, payment_completion_status = ?, last_payment_at = NOW()
       WHERE school_id = ? AND id = ? AND deleted_at IS NULL`,
      [newPaid, newRemaining, completion, schoolId, id]
    );

    await appendAuditLog({
      schoolId,
      userId,
      roleCode,
      endpoint: '/accountant/payroll/payments/:id/finish',
      entityType: 'payroll_payment',
      entityId: id,
      action: 'update',
      afterState: { paid_amount_rwf: newPaid, remaining_amount_rwf: newRemaining, payment_completion_status: completion },
    });

    return res.json({
      success: true,
      message: completion === 'fully_paid' ? 'Payment successful' : 'Remaining balance updated',
      data: { id, paymentCompletionStatus: completion, paidAmount: newPaid, remainingAmount: newRemaining },
    });
  } catch (e) {
    console.error('[accountant/payroll/payments/:id/finish POST]:', e.message);
    return res.status(500).json({ success: false, message: 'Failed to finish payment' });
  }
});

router.get('/accountant/payroll/advance-check/:staffUserId', requireRole(ACCOUNTANT_READ_ROLES), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const staffUserId = Number(req.params.staffUserId || 0);
    if (!staffUserId) return res.status(400).json({ success: false, message: 'Invalid staffUserId' });

    const maps = await fetchActiveCatalogMaps();
    const serviceRates = maps?.servicesBySlug || new Map();
    const cashoutRates = maps?.cashoutsBySlug || new Map();

    const [rows] = await promisePool.query(
      `SELECT id, amount_rwf, repayment_term_months, status, submitted_at, request_type, service_category, cashout_category_slug
       FROM shule_avance_requests
       WHERE school_id = ? AND teacher_user_id = ?
        AND status = 'approved'
       ORDER BY id DESC
       LIMIT 100`,
      [schoolId, staffUserId]
    );

    const [paidPeriods] = await promisePool.query(
      `SELECT DISTINCT month, year, paid_at
       FROM payroll_requests
       WHERE school_id = ? AND staff_user_id = ?
         AND status = 'Paid' AND deleted_at IS NULL AND paid_at IS NOT NULL
       ORDER BY paid_at ASC`,
      [schoolId, staffUserId]
    );
    const paidPeriodRows = (paidPeriods || []).map((p) => ({
      month: Number(p.month || 0),
      year: Number(p.year || 0),
      paidAt: p.paid_at ? new Date(p.paid_at) : null,
    })).filter((p) => p.paidAt && !Number.isNaN(p.paidAt.getTime()));

    const approvedAdvances = (rows || []).map((r) => {
      const amount = toMoney(r.amount_rwf);
      const months = Math.max(1, Number(r.repayment_term_months || 1));
      const submittedAt = r.submitted_at ? new Date(r.submitted_at) : null;
      const reqType = String(r.request_type || '').toLowerCase();
      const interestRate = reqType === 'cashout'
        ? Number(cashoutRates.get(String(r.cashout_category_slug || '').toLowerCase())?.income_rate_percent || 0)
        : Number(serviceRates.get(String(r.service_category || '').toLowerCase())?.income_rate_percent || 0);
      const principalPerMonth = amount / months;
      const interestPerMonth = (amount * interestRate) / 100;
      const monthlyPayment = principalPerMonth + interestPerMonth;
      const paidInstallments = paidPeriodRows.filter((p) => {
        if (!submittedAt || Number.isNaN(submittedAt.getTime())) return true;
        return p.paidAt >= submittedAt;
      }).length;
      const remainingMonths = Math.max(0, months - paidInstallments);
      const monthlyPaymentApplied = remainingMonths > 0 ? monthlyPayment : 0;
      const remainingBalance = monthlyPayment * remainingMonths;
      return {
        id: r.id,
        status: r.status,
        submittedAt: r.submitted_at,
        totalAmount: Math.round(amount),
        months,
        paidInstallments,
        remainingMonths,
        interestRate,
        principalPerMonth: Math.round(principalPerMonth),
        interestPerMonth: Math.round(interestPerMonth),
        monthlyPayment: Math.round(monthlyPaymentApplied),
        remainingBalance: Math.round(remainingBalance),
      };
    });

    const totalOutstanding = approvedAdvances.reduce((sum, row) => sum + toMoney(row.remainingBalance), 0);
    const totalMonthlyDeduction = approvedAdvances.reduce((sum, row) => sum + toMoney(row.monthlyPayment), 0);

    res.json({
      success: true,
      data: {
        hasActiveAdvance: approvedAdvances.length > 0,
        totalOutstanding,
        totalMonthlyDeduction,
        approvedAdvances,
        requests: (rows || []).map((r) => ({
          id: r.id,
          amount: toMoney(r.amount_rwf),
          status: r.status,
          submittedAt: r.submitted_at,
        })),
      },
    });
  } catch (e) {
    console.error('[accountant/payroll/advance-check/:staffUserId GET]:', e.message);
    res.status(500).json({ success: false, message: 'Failed to load advance summary' });
  }
});

router.get('/manager/payroll/requests', requireRole(ACCOUNTANT_READ_ROLES), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const query = String(req.query?.query || '').trim();
    const status = String(req.query?.status || '').trim().toLowerCase();
    const month = Number(req.query?.month || 0);
    const year = Number(req.query?.year || 0);
    const term = String(req.query?.term || '').trim();
    const academicYear = String(req.query?.academic_year || '').trim();
    const where = ['p.school_id = ?', 'p.deleted_at IS NULL'];
    const params = [schoolId];

    if (query) {
      where.push(`(p.staff_name LIKE ? OR COALESCE(p.staff_code, '') LIKE ? OR CONCAT('PAY-', p.id) LIKE ?)`);
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
    if (term) {
      where.push('COALESCE(p.pay_term, "") = ?');
      params.push(term);
    }
    if (academicYear) {
      where.push('COALESCE(p.academic_year_label, "") = ?');
      params.push(academicYear);
    }

    const [rows] = await promisePool.query(
      `SELECT p.id, p.staff_user_id, p.staff_code, p.staff_name, p.role_code, p.department,
              p.basic_salary_rwf, p.bonus_rwf, p.deduction_rwf, p.net_salary_rwf,
              p.pay_month, p.pay_year, p.pay_term, p.academic_year_label, p.payment_date, p.payment_status, p.payment_method,
              p.requested_amount_rwf, p.note, p.manager_note, p.created_by_user_id, p.approved_by_user_id, p.approved_at, p.created_at, p.updated_at
       FROM accountant_payroll_payments p
       WHERE ${where.join(' AND ')}
       ORDER BY p.id DESC
       LIMIT 500`,
      params
    );

    res.json({
      success: true,
      data: (rows || []).map((r) => ({
        payrollId: `PAY-${r.id}`,
        staffUserId: Number(r.staff_user_id),
        staffCode: r.staff_code || '',
        staffName: r.staff_name || '',
        role: r.role_code || 'STAFF',
        department: r.department || '',
        basicSalary: Number(r.basic_salary_rwf || 0),
        bonus: Number(r.bonus_rwf || 0),
        deduction: Number(r.deduction_rwf || 0),
        netSalaryPaid: Number(r.net_salary_rwf || 0),
        requestedAmount: Number(r.requested_amount_rwf || 0),
        month: Number(r.pay_month || 0),
        year: Number(r.pay_year || 0),
        term: r.pay_term || '',
        academicYear: r.academic_year_label || '',
        paymentDate: r.payment_date,
        paymentStatus: r.payment_status || 'pending',
        paymentMethod: r.payment_method || '',
        note: r.note || '',
        managerNote: r.manager_note || '',
        approvedByUserId: Number(r.approved_by_user_id || 0) || null,
        approvedAt: r.approved_at || null,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      })),
    });
  } catch (e) {
    console.error('[manager/payroll/requests GET]:', e.message);
    res.status(500).json({ success: false, message: 'Failed to load payroll requests' });
  }
});

router.patch('/manager/payroll/requests/:id/decision', requireRole(PAYROLL_MANAGER_ROLES), async (req, res) => {
  try {
    const { schoolId, userId } = req.ctx;
    const raw = String(req.params.id || '');
    const id = raw.startsWith('PAY-') ? Number(raw.slice(4)) : Number(raw);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid payroll id' });
    const decision = String(req.body?.decision || '').trim().toLowerCase();
    const note = String(req.body?.note || '').trim() || null;
    let nextStatus = '';
    if (decision === 'approve') nextStatus = 'approved';
    if (decision === 'reject') nextStatus = 'rejected';
    if (decision === 'mark_paid' || decision === 'paid') nextStatus = 'paid';
    if (!nextStatus) return res.status(400).json({ success: false, message: 'decision must be approve, reject, or mark_paid' });

    const [r] = await promisePool.query(
      `UPDATE accountant_payroll_payments
       SET payment_status = ?, approved_by_user_id = ?, approved_at = NOW(), manager_note = COALESCE(?, manager_note)
       WHERE school_id = ? AND id = ? AND deleted_at IS NULL`,
      [nextStatus, userId, note, schoolId, id]
    );
    if (!r.affectedRows) return res.status(404).json({ success: false, message: 'Payroll request not found' });
    res.json({ success: true, message: `Payroll request ${nextStatus}` });
  } catch (e) {
    console.error('[manager/payroll/requests/:id/decision PATCH]:', e.message);
    res.status(500).json({ success: false, message: 'Failed to update payroll decision' });
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
