'use strict';

const express = require('express');
const { promisePool } = require('../config/database');
const { fetchActiveCatalogMaps } = require('./shuleAvanceCatalogStore');
const {
  upsertSubscription,
  removeSubscription,
  sendWebPushToUser,
  sendWebPushToSchoolRoles,
  getVapidPublicKey,
  isWebPushConfigured,
} = require('./webPushSubscriptions');

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
const TEACHER_REQ_WRITE_ROLES = ['TEACHER', 'HOD', 'DOS'];
const ACCOUNTANT_READ_ROLES = ['ACCOUNTANT', 'SCHOOL_ADMIN', 'SCHOOL_MANAGER'];
const ACCOUNTANT_WRITE_ROLES = ['ACCOUNTANT', 'SCHOOL_ADMIN', 'SCHOOL_MANAGER'];
const STORE_READ_ROLES = ['STORE_MANAGER', 'STOREKEEPER', 'ACCOUNTANT', 'SCHOOL_ADMIN', 'SCHOOL_MANAGER'];
const STORE_WRITE_ROLES = ['STORE_MANAGER', 'STOREKEEPER'];
const ADMIN_AUDIT_ROLES = ['SCHOOL_ADMIN', 'SCHOOL_MANAGER'];

let tablesReady = false;
const PORTAL_OPS_PREFIX_RE = /^\/(teacher-portal\/(?:requisitions|inventory-equipment|permissions)|reports\/(?:requisitions\/teacher|teacher-permissions)|accountant\/(?:requisitions|expenses|payroll(?:-requests)?|school-budgets|budget-lines|budget-line-usage|action-plans|action-plan-activities|fee-reminders)|manager\/(?:payroll-requests|requisitions)|staff\/payroll\/my|payroll\/audit-log|store\/(?:requisitions|inventory|suppliers|movements)|admin\/(?:portal-audit-logs|staff-logins)|portal\/push|tools\/ticha-ai)(\/|$)/i;

const BUDGET_LARGE_EXPENSE_RWF = Number(process.env.BUDGET_LARGE_EXPENSE_RWF || 5_000_000);

function notifyBudgetSchoolRoles(schoolId, roleCodes, payload) {
  setImmediate(() => {
    sendWebPushToSchoolRoles(schoolId, roleCodes, payload).catch(() => {});
  });
}

function notifyBudgetUser(userId, payload) {
  if (!userId) return;
  setImmediate(() => {
    sendWebPushToUser(userId, payload).catch(() => {});
  });
}

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
    req.session?.school?.id ||
    req.user?.school_id ||
    req.user?.school?.id ||
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

function normalizePayrollTerm(v) {
  const raw = String(v || '').trim().toUpperCase().replace(/\s+/g, '');
  if (!raw) return '';
  if (raw === 'T1' || raw === 'TERM1') return 'T1';
  if (raw === 'T2' || raw === 'TERM2') return 'T2';
  if (raw === 'T3' || raw === 'TERM3') return 'T3';
  return raw;
}

function payrollTermKeys(v) {
  const term = normalizePayrollTerm(v);
  if (term === 'T1') return ['T1', 'TERM1'];
  if (term === 'T2') return ['T2', 'TERM2'];
  if (term === 'T3') return ['T3', 'TERM3'];
  return [term, term];
}

/** Only filter by term when the client sent one (avoids hiding rows stored as T1/T2 vs "Term 1"). */
function appendExplicitPayrollTermFilter(where, params, termQ, columnExpr = 'r.term') {
  const raw = String(termQ || '').trim();
  if (!raw || /^all$/i.test(raw)) return;
  const normalized = normalizePayrollTerm(raw);
  if (!normalized) return;
  const [keyA, keyB] = payrollTermKeys(normalized);
  where.push(`UPPER(REPLACE(COALESCE(${columnExpr}, ''), ' ', '')) IN (?, ?)`);
  params.push(keyA, keyB);
}

function paymentStatusToRequestStatus(status) {
  const s = String(status || '').trim().toLowerCase();
  if (s === 'paid') return 'Paid';
  if (s === 'approved') return 'Approved';
  if (s === 'rejected') return 'Rejected';
  return 'Pending';
}

function mapPayrollRequestRow(r) {
  return {
    id: Number(r.id),
    payrollId: `PAY-${r.id}`,
    source: 'payroll_request',
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
  };
}

function mapPaymentRowToRequest(p) {
  const status = paymentStatusToRequestStatus(p.payment_status);
  return {
    id: Number(p.id),
    payrollId: `APAY-${p.id}`,
    source: 'accountant_payment',
    staffUserId: Number(p.staff_user_id),
    staffCode: p.staff_code || `STF-${p.staff_user_id}`,
    staffName: p.staff_name || '',
    role: p.role_code || 'STAFF',
    department: p.department || '',
    month: numberToMonthLabel(p.pay_month),
    monthNumber: Number(p.pay_month || 0),
    term: normalizePayrollTerm(p.pay_term) || p.pay_term || '',
    year: String(p.pay_year || ''),
    amount: Number(p.net_salary_rwf || p.requested_amount_rwf || 0),
    status,
    basic: Number(p.basic_salary_rwf || 0),
    allowances: Number(p.bonus_rwf || 0),
    deductions: Number(p.deduction_rwf || 0),
    netSalary: Number(p.net_salary_rwf || 0),
    advance: 0,
    finalPayable: Number(p.net_salary_rwf || p.requested_amount_rwf || 0),
    rejectedReason: '',
    managerNote: p.manager_note || '',
    submittedBy: `${p.creator_first_name || ''} ${p.creator_last_name || ''}`.trim() || 'Accountant',
    submittedByRole: 'ACCOUNTANT',
    submittedAt: p.created_at || null,
    approvedByUserId: Number(p.approved_by_user_id || 0) || null,
    paidByUserId: null,
    approvedBy: '',
    approvedByRole: '',
    approvedAt: p.approved_at || null,
    paidBy: status === 'Paid' ? 'Accountant' : '',
    paidByRole: status === 'Paid' ? 'ACCOUNTANT' : '',
    paidAt: p.payment_date || p.last_payment_at || null,
    createdAt: p.created_at,
  };
}

function payrollPeriodKey(staffUserId, month, term, year) {
  const m = monthLabelToNumber(month) || Number(month) || 0;
  const t = normalizePayrollTerm(term) || String(term || '').trim().toUpperCase();
  return `${staffUserId}|${m}|${t}|${parsePayrollYear(year)}`;
}

function parsePayrollYear(v) {
  const raw = String(v ?? '').trim();
  const match = raw.match(/\b(20\d{2}|19\d{2})\b/);
  if (match) return Number(match[1]);
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
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

function inferTermFromMonth(terms = [], date = new Date()) {
  const month = date.getMonth() + 1;
  if (!Array.isArray(terms) || !terms.length) return 'Term 1';
  if (terms.length >= 3) {
    if (month >= 9 && month <= 12) return terms[0];
    if (month >= 1 && month <= 4) return terms[1] || terms[0];
    return terms[2] || terms[terms.length - 1];
  }
  if (terms.length === 2) return month >= 9 || month <= 2 ? terms[0] : terms[1];
  return terms[0];
}

function inferAcademicYearFromDate(date = new Date()) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  return m >= 9 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
}

async function resolveAcademicContext(schoolId, academicYearRaw, termRaw) {
  const explicitYear = String(academicYearRaw || '').trim();
  const explicitTerm = String(termRaw || '').trim();
  if (explicitYear && explicitTerm) {
    return { academicYear: explicitYear, term: explicitTerm };
  }
  const [[row]] = await promisePool.query(
    `SELECT current_academic_year, active_terms_json
     FROM school_academic_settings
     WHERE school_id = ?
     LIMIT 1`,
    [schoolId]
  ).catch(() => [[null]]);
  let terms = ['Term 1', 'Term 2', 'Term 3'];
  try {
    if (row?.active_terms_json) {
      const parsed = Array.isArray(row.active_terms_json)
        ? row.active_terms_json
        : JSON.parse(row.active_terms_json);
      if (Array.isArray(parsed) && parsed.length) {
        terms = parsed.map((x) => String(x || '').trim()).filter(Boolean);
      }
    }
  } catch (_) {}
  return {
    academicYear: explicitYear || String(row?.current_academic_year || '').trim() || inferAcademicYearFromDate(),
    term: explicitTerm || inferTermFromMonth(terms),
  };
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
  await promisePool.query(`ALTER TABLE portal_requisitions ADD COLUMN destination VARCHAR(32) NOT NULL DEFAULT 'accountant'`).catch(() => {});
  await promisePool.query(`ALTER TABLE portal_requisitions ADD COLUMN forwarded_to VARCHAR(32) NULL`).catch(() => {});

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
  await promisePool.query(`ALTER TABLE store_movements ADD COLUMN supplier_id INT UNSIGNED NULL`).catch(() => {});

  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS school_budgets (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      created_by_user_id INT UNSIGNED NOT NULL,
      budget_code VARCHAR(32) NOT NULL,
      title VARCHAR(220) NOT NULL,
      academic_year VARCHAR(64) NOT NULL,
      term VARCHAR(64) NOT NULL,
      budget_type VARCHAR(64) NOT NULL DEFAULT 'Term Budget',
      status VARCHAR(32) NOT NULL DEFAULT 'draft',
      start_date DATE NULL,
      end_date DATE NULL,
      description TEXT NULL,
      approval_notes TEXT NULL,
      total_expected_income_rwf DECIMAL(16,2) NOT NULL DEFAULT 0,
      total_allocated_rwf DECIMAL(16,2) NOT NULL DEFAULT 0,
      prepared_by_name VARCHAR(200) NULL,
      submitted_at DATETIME NULL,
      deleted_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_school_budget_code (school_id, budget_code),
      KEY idx_school_budgets_school (school_id, deleted_at),
      KEY idx_school_budgets_status (school_id, status, deleted_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS school_budget_income_sources (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      budget_id INT UNSIGNED NOT NULL,
      school_id INT UNSIGNED NOT NULL,
      income_source_key VARCHAR(120) NOT NULL,
      custom_source_name VARCHAR(220) NULL,
      income_category VARCHAR(120) NULL,
      expected_amount_rwf DECIMAL(16,2) NOT NULL DEFAULT 0,
      collection_frequency VARCHAR(32) NULL,
      description TEXT NULL,
      sort_order INT UNSIGNED NOT NULL DEFAULT 0,
      KEY idx_budget_income_budget (budget_id),
      KEY idx_budget_income_school (school_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await promisePool.query(`ALTER TABLE school_budgets ADD COLUMN manager_reviewed_at DATETIME NULL`).catch(() => {});
  await promisePool.query(`ALTER TABLE school_budgets ADD COLUMN manager_reviewed_by_user_id INT UNSIGNED NULL`).catch(() => {});
  await promisePool.query(`ALTER TABLE school_budgets ADD COLUMN manager_review_notes TEXT NULL`).catch(() => {});
  await promisePool.query(`ALTER TABLE school_budget_lines ADD COLUMN is_frozen TINYINT(1) NOT NULL DEFAULT 0`).catch(() => {});

  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS school_budget_lines (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      budget_id INT UNSIGNED NOT NULL,
      created_by_user_id INT UNSIGNED NOT NULL,
      line_name_key VARCHAR(120) NOT NULL,
      custom_line_name VARCHAR(220) NULL,
      budget_category VARCHAR(64) NOT NULL,
      department VARCHAR(64) NOT NULL,
      priority_level VARCHAR(32) NOT NULL DEFAULT 'Medium',
      planned_amount_rwf DECIMAL(16,2) NOT NULL DEFAULT 0,
      used_amount_rwf DECIMAL(16,2) NOT NULL DEFAULT 0,
      allocation_date DATE NULL,
      description TEXT NULL,
      notes TEXT NULL,
      reference_number VARCHAR(64) NULL,
      attachments_json JSON NULL,
      prepared_by_name VARCHAR(200) NULL,
      reviewed_by_name VARCHAR(200) NULL,
      approval_status VARCHAR(32) NOT NULL DEFAULT 'Pending',
      approval_notes TEXT NULL,
      deleted_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_budget_lines_school (school_id, deleted_at),
      KEY idx_budget_lines_budget (budget_id, deleted_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS school_budget_line_usage (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      budget_line_id INT UNSIGNED NOT NULL,
      created_by_user_id INT UNSIGNED NOT NULL,
      usage_amount_rwf DECIMAL(16,2) NOT NULL DEFAULT 0,
      usage_date DATE NOT NULL,
      expense_category VARCHAR(64) NULL,
      payment_method VARCHAR(32) NULL,
      description TEXT NULL,
      receipt_name VARCHAR(255) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_line_usage_line (budget_line_id),
      KEY idx_line_usage_school (school_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS teacher_permissions (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      teacher_user_id INT UNSIGNED NOT NULL,
      teacher_name VARCHAR(200) NOT NULL,
      permission_type ENUM('SICK_LEAVE','PERSONAL','FAMILY','OFFICIAL','LATE_ARRIVAL','EARLY_DEPARTURE','OTHER') NOT NULL DEFAULT 'PERSONAL',
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      reason TEXT NULL,
      status ENUM('pending','approved','rejected','cancelled') NOT NULL DEFAULT 'pending',
      decided_by_user_id INT UNSIGNED NULL,
      decided_at DATETIME NULL,
      decision_note TEXT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL,
      KEY idx_tp_school (school_id, deleted_at),
      KEY idx_tp_teacher (school_id, teacher_user_id, deleted_at),
      KEY idx_tp_status (school_id, status, deleted_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

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
const REQUISITION_STATUSES = ['pending', 'approved', 'rejected', 'issued', 'returned', 'cancelled', 'forwarded'];

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
    destination: r.destination || 'accountant',
    forwarded_to: r.forwarded_to || null,
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

    const sourcePortal = String(req.ctx.roleCode || '').toUpperCase() === 'DOS' ? 'dos' : 'teacher';
    const destRaw = String(payload.destination || '').trim().toLowerCase();
    const destination = ['dos', 'accountant', 'store', 'all'].includes(destRaw) ? destRaw : 'accountant';
    const [r] = await promisePool.query(
      `INSERT INTO portal_requisitions
       (school_id, created_by_user_id, item_id, quantity_requested, dept, requester, purpose, priority_level, expected_return_date,
        items, amount_rwf, submitted_at, attachment_name, note, status, source_portal, destination)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
      [schoolId, userId, itemId, qty, dept, requester, purpose, priorityLevel, expectedReturnDate, computedItems, amount, submitted, attachmentName, note, sourcePortal, destination]
    );
    await appendAuditLog({
      schoolId,
      userId,
      roleCode: req.ctx.roleCode,
      endpoint: '/teacher-portal/requisitions',
      entityType: 'requisition',
      entityId: r.insertId,
      action: 'create',
      afterState: { status: 'pending', source_portal: sourcePortal, destination, item_id: itemId, qty, amount_rwf: amount },
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
    const termQ = String(req.query?.term || '').trim();
    const academicYearQ = String(req.query?.academic_year || '').trim();
    const explicitTerm = termQ || null;
    const explicitAcademicYear = academicYearQ || null;
    const { term, academicYear } = explicitTerm || explicitAcademicYear
      ? await resolveAcademicContext(schoolId, academicYearQ, termQ)
      : { term: null, academicYear: null };
    const fromDate = String(req.query?.from || '').trim();
    const toDate = String(req.query?.to || '').trim();
    const sourceQ = String(req.query?.source || '').trim().toLowerCase();
    const where = ['r.school_id = ?', 'r.deleted_at IS NULL'];
    const params = [schoolId];
    if (sourceQ === 'dos') {
      where.push("r.source_portal = 'dos'");
    } else if (sourceQ === 'all') {
      /* no source filter */
    } else {
      where.push("r.source_portal = 'teacher'");
    }
    if (status && REQUISITION_STATUSES.includes(status)) {
      where.push('r.status = ?');
      params.push(status);
    }
    if (term) {
      where.push('(i.term = ? OR r.item_id IS NULL)');
      params.push(term);
    }
    if (academicYear) {
      where.push('(i.academic_year = ? OR r.item_id IS NULL)');
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
              r.status_note, r.attachment_name, r.note, r.status, r.source_portal, r.destination, r.forwarded_to
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
      forwarded: data.filter((x) => x.status === 'forwarded').length,
    };
    res.json({ success: true, data, summary, meta: { term, academic_year: academicYear } });
  } catch (e) {
    console.error('[reports/requisitions/teacher GET]:', e.message);
    res.status(500).json({ success: false, message: 'Failed to load teacher requisition report' });
  }
});

const DOS_ACTION_ROLES = ['DOS', 'SCHOOL_ADMIN', 'SCHOOL_MANAGER'];

router.patch('/reports/requisitions/teacher/:id/action', requireRole(DOS_ACTION_ROLES), async (req, res) => {
  try {
    const { schoolId, userId, roleCode } = req.ctx;
    const id = Number(req.params.id);
    const action = String(req.body?.action || '').trim().toLowerCase();
    const note = String(req.body?.note || '').trim();
    if (!id) return res.status(400).json({ success: false, message: 'Invalid requisition id' });

    const validActions = ['approve', 'reject', 'forward_to_accountant'];
    if (!validActions.includes(action)) {
      return res.status(400).json({ success: false, message: 'Action must be: approve, reject, or forward_to_accountant' });
    }

    const [[existing]] = await promisePool.query(
      `SELECT id, status FROM portal_requisitions WHERE id = ? AND school_id = ? AND deleted_at IS NULL`,
      [id, schoolId]
    );
    if (!existing) return res.status(404).json({ success: false, message: 'Requisition not found' });

    let newStatus, forwardedTo = null, notePrefix = '[DOS decision]';
    if (action === 'approve') {
      newStatus = 'approved';
    } else if (action === 'reject') {
      newStatus = 'rejected';
    } else {
      newStatus = 'forwarded';
      forwardedTo = 'accountant';
      notePrefix = '[DOS forwarded]';
    }

    await promisePool.query(
      `UPDATE portal_requisitions
       SET status = ?,
           forwarded_to = ?,
           approved_at = CASE WHEN ? = 'approved' THEN NOW() ELSE approved_at END,
           note = CASE
             WHEN ? = '' THEN note
             WHEN note IS NULL OR note = '' THEN ?
             ELSE CONCAT(note, '\n', ?)
           END
       WHERE id = ? AND school_id = ? AND deleted_at IS NULL`,
      [newStatus, forwardedTo, newStatus, note, `${notePrefix} ${note}`, `${notePrefix} ${note}`, id, schoolId]
    );
    await appendAuditLog({
      schoolId, userId, roleCode,
      endpoint: '/reports/requisitions/teacher/:id/action',
      entityType: 'requisition',
      entityId: id,
      action: `dos_${action}`,
      afterState: { status: newStatus, forwarded_to: forwardedTo, note: note || null },
    });
    res.json({ success: true, message: `Requisition ${action === 'forward_to_accountant' ? 'forwarded to accountant' : newStatus}` });
  } catch (e) {
    console.error('[reports/requisitions/teacher/:id/action PATCH]:', e.message);
    res.status(500).json({ success: false, message: 'Failed to perform action' });
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
              r.status_note, r.attachment_name, r.note, r.status, r.source_portal, r.destination, r.forwarded_to
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
    const rawStatus = String(req.body?.status || '').toLowerCase();
    const note = String(req.body?.note || '').trim();
    const isForwardToManager = rawStatus === 'forward_to_manager';
    const status = isForwardToManager ? 'forwarded' : rawStatus;
    const allowed = ['pending', 'approved', 'rejected', 'issued', 'returned', 'cancelled', 'forwarded'];
    if (!id) return res.status(400).json({ success: false, message: 'Invalid requisition id' });
    if (!allowed.includes(status)) return res.status(400).json({ success: false, message: 'Invalid status' });
    const notePrefix = isForwardToManager ? '[Sent to Manager]' : '[Accountant decision]';
    const forwardedTo = isForwardToManager ? 'manager' : null;

    const [r] = await promisePool.query(
      `UPDATE portal_requisitions
       SET status = ?,
           forwarded_to = COALESCE(?, forwarded_to),
           approved_at = CASE WHEN ? = 'approved' THEN NOW() ELSE approved_at END,
           issued_at = CASE WHEN ? = 'issued' THEN NOW() ELSE issued_at END,
           returned_at = CASE WHEN ? = 'returned' THEN NOW() ELSE returned_at END,
           note = CASE
         WHEN ? = '' THEN note
         WHEN note IS NULL OR note = '' THEN ?
         ELSE CONCAT(note, '\n', ?)
       END
       WHERE id = ? AND school_id = ? AND deleted_at IS NULL`,
      [status, forwardedTo, status, status, status, note, `${notePrefix} ${note}`, `${notePrefix} ${note}`, id, schoolId]
    );
    if (!r.affectedRows) return res.status(404).json({ success: false, message: 'Requisition not found' });
    await appendAuditLog({
      schoolId,
      userId,
      roleCode,
      endpoint: '/accountant/requisitions/:id/status',
      entityType: 'requisition',
      entityId: id,
      action: isForwardToManager ? 'forward_to_manager' : 'status_update',
      afterState: { status, forwarded_to: forwardedTo, note: note || null },
    });
    res.json({ success: true, message: isForwardToManager ? 'Requisition sent to manager' : 'Requisition status updated' });
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
              r.status_note, r.attachment_name, r.note, r.status, r.source_portal, r.destination, r.forwarded_to
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
      `SELECT e.id, e.category, e.title, e.vendor, e.amount_rwf, e.due_date, e.status, e.note, e.created_at, e.created_by_user_id,
              TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))) AS created_by_display_name,
              u.email AS created_by_email
       FROM accountant_expenses e
       LEFT JOIN users u ON u.id = e.created_by_user_id AND u.deleted_at IS NULL
       WHERE e.school_id = ? AND e.deleted_at IS NULL
       ORDER BY e.id DESC`,
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
        created_by_user_id: r.created_by_user_id ? Number(r.created_by_user_id) : null,
        created_by_name: String(r.created_by_display_name || '').trim() || null,
        created_by_email: r.created_by_email || '',
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
    const termQ = String(req.query?.term || '').trim();
    const academicYearQ = String(req.query?.academic_year || req.query?.academicYear || '').trim();
    const year = Number(req.query?.year || 0);
    const qRaw = String(req.query?.query || '').trim();
    const department = String(req.query?.department || '').trim();
    const q = `%${qRaw}%`;
    const metaCtx = termQ || academicYearQ
      ? await resolveAcademicContext(schoolId, academicYearQ, termQ)
      : { term: '', academicYear: academicYearQ || '' };

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
    appendExplicitPayrollTermFilter(where, params, termQ, 'r.term');
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

    const requestData = (rows || []).map(mapPayrollRequestRow);
    const coveredPeriods = new Set(
      requestData.map((r) => payrollPeriodKey(r.staffUserId, r.monthNumber || r.month, r.term, r.year))
    );

    const payWhere = ['p.school_id = ?', 'p.deleted_at IS NULL'];
    const payParams = [schoolId];
    if (status && ['Pending', 'Approved', 'Rejected', 'Paid'].includes(status)) {
      payWhere.push('p.payment_status = ?');
      payParams.push(status.toLowerCase());
    }
    if (month >= 1 && month <= 12) {
      payWhere.push('p.pay_month = ?');
      payParams.push(month);
    }
    appendExplicitPayrollTermFilter(payWhere, payParams, termQ, 'p.pay_term');
    if (year >= 2000 && year <= 3000) {
      payWhere.push('p.pay_year = ?');
      payParams.push(year);
    }
    if (academicYearQ) {
      payWhere.push('COALESCE(p.academic_year_label, "") = ?');
      payParams.push(academicYearQ);
    }
    if (qRaw) {
      payWhere.push('(p.staff_name LIKE ? OR COALESCE(p.staff_code, "") LIKE ?)');
      payParams.push(q, q);
    }
    if (department) {
      payWhere.push('LOWER(COALESCE(p.department, "")) = LOWER(?)');
      payParams.push(department);
    }

    const [paymentRows] = await promisePool.query(
      `SELECT p.id, p.staff_user_id, p.staff_code, p.staff_name, p.role_code, p.department,
              p.basic_salary_rwf, p.bonus_rwf, p.deduction_rwf, p.net_salary_rwf,
              p.pay_month, p.pay_year, p.pay_term, p.academic_year_label, p.payment_date, p.payment_status,
              p.requested_amount_rwf, p.manager_note, p.created_by_user_id, p.approved_by_user_id, p.approved_at,
              p.created_at, p.last_payment_at,
              u.first_name AS creator_first_name, u.last_name AS creator_last_name
       FROM accountant_payroll_payments p
       LEFT JOIN users u ON u.id = p.created_by_user_id
       WHERE ${payWhere.join(' AND ')}
       ORDER BY p.id DESC
       LIMIT 500`,
      payParams
    );

    const paymentData = (paymentRows || [])
      .map(mapPaymentRowToRequest)
      .filter((row) => {
        const key = payrollPeriodKey(row.staffUserId, row.monthNumber || row.month, row.term, row.year);
        return !coveredPeriods.has(key);
      });

    const merged = [...requestData, ...paymentData].sort(
      (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    );

    return res.json({
      success: true,
      meta: { term: metaCtx.term || '', academic_year: metaCtx.academicYear || academicYearQ || '' },
      data: merged,
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
    const termQ = String(req.query?.term || '').trim();
    const academicYearQ = String(req.query?.academic_year || req.query?.academicYear || '').trim();
    const year = Number(req.query?.year || 0);
    const qRaw = String(req.query?.query || req.query?.search || '').trim();
    const department = String(req.query?.department || '').trim();
    const page = Math.max(1, Number(req.query?.page) || 1);
    const limit = Math.min(500, Math.max(1, Number(req.query?.limit) || 20));
    const offset = (page - 1) * limit;
    const q = `%${qRaw}%`;
    const metaCtx = termQ || academicYearQ
      ? await resolveAcademicContext(schoolId, academicYearQ, termQ)
      : { term: '', academicYear: academicYearQ || '' };

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
    appendExplicitPayrollTermFilter(where, params, termQ, 'r.term');
    if (year >= 2000 && year <= 3000) {
      where.push('r.year = ?');
      params.push(year);
    }
    if (qRaw) {
      where.push('(r.staff_name LIKE ? OR COALESCE(r.staff_code, "") LIKE ? OR COALESCE(r.role_code, "") LIKE ?)');
      params.push(q, q, q);
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
       LIMIT 2000`,
      params
    );

    const requestData = (rows || []).map(mapPayrollRequestRow);
    const coveredPeriods = new Set(
      requestData.map((r) => payrollPeriodKey(r.staffUserId, r.monthNumber || r.month, r.term, r.year))
    );

    const payWhere = ['p.school_id = ?', 'p.deleted_at IS NULL'];
    const payParams = [schoolId];
    if (status && ['Pending', 'Approved', 'Rejected', 'Paid'].includes(status)) {
      payWhere.push('p.payment_status = ?');
      payParams.push(status.toLowerCase());
    }
    if (month >= 1 && month <= 12) {
      payWhere.push('p.pay_month = ?');
      payParams.push(month);
    }
    appendExplicitPayrollTermFilter(payWhere, payParams, termQ, 'p.pay_term');
    if (year >= 2000 && year <= 3000) {
      payWhere.push('p.pay_year = ?');
      payParams.push(year);
    }
    if (academicYearQ) {
      payWhere.push('COALESCE(p.academic_year_label, "") = ?');
      payParams.push(academicYearQ);
    }
    if (qRaw) {
      payWhere.push('(p.staff_name LIKE ? OR COALESCE(p.staff_code, "") LIKE ? OR COALESCE(p.role_code, "") LIKE ?)');
      payParams.push(q, q, q);
    }
    if (department) {
      payWhere.push('LOWER(COALESCE(p.department, "")) = LOWER(?)');
      payParams.push(department);
    }

    const [paymentRows] = await promisePool.query(
      `SELECT p.id, p.staff_user_id, p.staff_code, p.staff_name, p.role_code, p.department,
              p.basic_salary_rwf, p.bonus_rwf, p.deduction_rwf, p.net_salary_rwf,
              p.pay_month, p.pay_year, p.pay_term, p.academic_year_label, p.payment_date, p.payment_status,
              p.requested_amount_rwf, p.manager_note, p.created_by_user_id, p.approved_by_user_id, p.approved_at,
              p.created_at, p.last_payment_at,
              u.first_name AS creator_first_name, u.last_name AS creator_last_name
       FROM accountant_payroll_payments p
       LEFT JOIN users u ON u.id = p.created_by_user_id
       WHERE ${payWhere.join(' AND ')}
       ORDER BY p.id DESC
       LIMIT 2000`,
      payParams
    );

    const paymentData = (paymentRows || [])
      .map(mapPaymentRowToRequest)
      .filter((row) => {
        const key = payrollPeriodKey(row.staffUserId, row.monthNumber || row.month, row.term, row.year);
        return !coveredPeriods.has(key);
      });

    const merged = [...requestData, ...paymentData].sort(
      (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    );
    const total = merged.length;
    const pageData = merged.slice(offset, offset + limit);

    return res.json({
      success: true,
      meta: { term: metaCtx.term || '', academic_year: metaCtx.academicYear || academicYearQ || '' },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
      data: pageData,
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
    const term = normalizePayrollTerm(payload.term);
    const [termKeyA, termKeyB] = payrollTermKeys(term);
    const year = parsePayrollYear(payload.year);
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
       WHERE r.school_id = ? AND r.staff_user_id = ? AND r.month = ?
         AND UPPER(REPLACE(COALESCE(r.term, ''), ' ', '')) IN (?, ?)
         AND r.year = ?
         AND r.deleted_at IS NULL
       ORDER BY r.id DESC`,
      [schoolId, staffUserId, month, termKeyA, termKeyB, year]
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

const PAYROLL_FINISH_PAYMENT_ROLES = ['SCHOOL_MANAGER', 'SCHOOL_ADMIN'];

router.post('/accountant/payroll-requests/finish-payment', requireRole(PAYROLL_FINISH_PAYMENT_ROLES), async (req, res) => {
  const conn = await promisePool.getConnection();
  try {
    const { schoolId, userId, roleCode } = req.ctx;
    const payload = req.body || {};
    const staffUserId = Number(payload.staffUserId || 0);
    const month = monthLabelToNumber(payload.month);
    const term = normalizePayrollTerm(payload.term);
    const [termKeyA, termKeyB] = payrollTermKeys(term);
    const year = parsePayrollYear(payload.year);
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
       WHERE r.school_id = ? AND r.staff_user_id = ? AND r.month = ?
         AND UPPER(REPLACE(COALESCE(r.term, ''), ' ', '')) IN (?, ?)
         AND r.year = ?
         AND r.deleted_at IS NULL
       ORDER BY r.id DESC`,
      [schoolId, staffUserId, month, termKeyA, termKeyB, year]
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
    const termQ = String(req.query?.term || '').trim();
    const academicYearQ = String(req.query?.academic_year || req.query?.academicYear || '').trim();
    const metaCtx = termQ || academicYearQ
      ? await resolveAcademicContext(schoolId, academicYearQ, termQ)
      : { term: '', academicYear: academicYearQ || '' };
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
    appendExplicitPayrollTermFilter(where, params, termQ, 'p.pay_term');
    if (academicYearQ) {
      where.push('COALESCE(p.academic_year_label, "") = ?');
      params.push(academicYearQ);
    }
    const limit = Math.min(2000, Math.max(1, Number(req.query?.limit) || 500));

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
      meta: { term: metaCtx.term || '', academic_year: metaCtx.academicYear || academicYearQ || '' },
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
    const termQ = String(req.query?.term || '').trim();
    const academicYearQ = String(req.query?.academic_year || '').trim();
    const { term, academicYear } = await resolveAcademicContext(schoolId, academicYearQ, termQ);
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
      meta: { term, academic_year: academicYear },
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
    const termQ = String(req.query?.term || '').trim();
    const academicYearQ = String(req.query?.academic_year || '').trim();
    const { term, academicYear } = await resolveAcademicContext(schoolId, academicYearQ, termQ);
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
      meta: { term, academic_year: academicYear },
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

// -------------------- Teacher Permissions --------------------
const TEACHER_PERM_CREATE_ROLES = ['TEACHER', 'HOD', 'DOS'];
const TEACHER_PERM_ADMIN_ROLES = ['DOS', 'SCHOOL_ADMIN', 'SCHOOL_MANAGER'];
const TEACHER_PERM_READ_ROLES = ['TEACHER', 'HOD', 'DOS', 'SCHOOL_ADMIN', 'SCHOOL_MANAGER'];

router.get('/teacher-portal/permissions', requireRole(TEACHER_PERM_CREATE_ROLES), async (req, res) => {
  try {
    const { schoolId, userId, roleCode } = req.ctx;
    const rc = String(roleCode || '').toUpperCase();
    const where = ['tp.school_id = ?', 'tp.deleted_at IS NULL'];
    const params = [schoolId];
    if (rc === 'TEACHER' || rc === 'HOD') {
      where.push('tp.teacher_user_id = ?');
      params.push(userId);
    }
    const statusQ = String(req.query?.status || '').toLowerCase();
    if (['pending', 'approved', 'rejected', 'cancelled'].includes(statusQ)) {
      where.push('tp.status = ?');
      params.push(statusQ);
    }
    const [rows] = await promisePool.query(
      `SELECT tp.* FROM teacher_permissions tp WHERE ${where.join(' AND ')} ORDER BY tp.id DESC`,
      params
    );
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error('[teacher-portal/permissions GET]:', e.message);
    res.status(500).json({ success: false, message: 'Failed to load permissions' });
  }
});

router.post('/teacher-portal/permissions', requireRole(TEACHER_PERM_CREATE_ROLES), async (req, res) => {
  try {
    const { schoolId, userId } = req.ctx;
    const p = req.body || {};
    const teacherName = String(p.teacher_name || '').trim();
    const permissionType = String(p.permission_type || 'PERSONAL').toUpperCase();
    const validTypes = ['SICK_LEAVE', 'PERSONAL', 'FAMILY', 'OFFICIAL', 'LATE_ARRIVAL', 'EARLY_DEPARTURE', 'OTHER'];
    if (!validTypes.includes(permissionType)) {
      return res.status(400).json({ success: false, message: 'Invalid permission type' });
    }
    const startDate = String(p.start_date || '').trim();
    const endDate = String(p.end_date || '').trim();
    const reason = String(p.reason || '').trim();
    if (!teacherName || !startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'teacher_name, start_date, and end_date are required' });
    }
    const [r] = await promisePool.query(
      `INSERT INTO teacher_permissions (school_id, teacher_user_id, teacher_name, permission_type, start_date, end_date, reason)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [schoolId, userId, teacherName, permissionType, startDate, endDate, reason || null]
    );
    res.status(201).json({ success: true, message: 'Permission request submitted', id: r.insertId });
  } catch (e) {
    console.error('[teacher-portal/permissions POST]:', e.message);
    res.status(500).json({ success: false, message: 'Failed to submit permission request' });
  }
});

router.get('/reports/teacher-permissions', requireRole(TEACHER_PERM_READ_ROLES), async (req, res) => {
  try {
    const { schoolId, userId, roleCode } = req.ctx;
    const rc = String(roleCode || '').toUpperCase();
    const where = ['tp.school_id = ?', 'tp.deleted_at IS NULL'];
    const params = [schoolId];
    if (rc === 'TEACHER' || rc === 'HOD') {
      where.push('tp.teacher_user_id = ?');
      params.push(userId);
    }
    const statusQ = String(req.query?.status || '').toLowerCase();
    if (['pending', 'approved', 'rejected', 'cancelled'].includes(statusQ)) {
      where.push('tp.status = ?');
      params.push(statusQ);
    }
    const fromDate = String(req.query?.from || '').trim();
    const toDate = String(req.query?.to || '').trim();
    if (fromDate) { where.push('tp.start_date >= ?'); params.push(fromDate); }
    if (toDate) { where.push('tp.end_date <= ?'); params.push(toDate); }

    const [rows] = await promisePool.query(
      `SELECT tp.* FROM teacher_permissions tp WHERE ${where.join(' AND ')} ORDER BY tp.id DESC`,
      params
    );
    const data = rows;
    const summary = {
      total: data.length,
      pending: data.filter(r => r.status === 'pending').length,
      approved: data.filter(r => r.status === 'approved').length,
      rejected: data.filter(r => r.status === 'rejected').length,
    };
    res.json({ success: true, data, summary });
  } catch (e) {
    console.error('[reports/teacher-permissions GET]:', e.message);
    res.status(500).json({ success: false, message: 'Failed to load teacher permissions report' });
  }
});

router.patch('/reports/teacher-permissions/:id/action', requireRole(TEACHER_PERM_ADMIN_ROLES), async (req, res) => {
  try {
    const { schoolId, userId } = req.ctx;
    const id = Number(req.params.id);
    const action = String(req.body?.action || '').toLowerCase();
    const note = String(req.body?.note || '').trim();
    if (!id) return res.status(400).json({ success: false, message: 'Invalid permission id' });
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Action must be approve or reject' });
    }
    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    const [r] = await promisePool.query(
      `UPDATE teacher_permissions SET status = ?, decided_by_user_id = ?, decided_at = NOW(), decision_note = ?
       WHERE id = ? AND school_id = ? AND deleted_at IS NULL AND status = 'pending'`,
      [newStatus, userId, note || null, id, schoolId]
    );
    if (!r.affectedRows) return res.status(409).json({ success: false, message: 'Permission not found or already decided' });
    res.json({ success: true, message: `Permission ${newStatus}` });
  } catch (e) {
    console.error('[reports/teacher-permissions/:id/action PATCH]:', e.message);
    res.status(500).json({ success: false, message: 'Failed to update permission' });
  }
});

router.delete('/teacher-portal/permissions/:id', requireRole(TEACHER_PERM_CREATE_ROLES), async (req, res) => {
  try {
    const { schoolId, userId } = req.ctx;
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid permission id' });
    const [r] = await promisePool.query(
      `UPDATE teacher_permissions SET deleted_at = NOW()
       WHERE id = ? AND school_id = ? AND teacher_user_id = ? AND deleted_at IS NULL AND status = 'pending'`,
      [id, schoolId, userId]
    );
    if (!r.affectedRows) return res.status(404).json({ success: false, message: 'Permission not found or cannot be cancelled' });
    res.json({ success: true, message: 'Permission request cancelled' });
  } catch (e) {
    console.error('[teacher-portal/permissions/:id DELETE]:', e.message);
    res.status(500).json({ success: false, message: 'Failed to cancel permission' });
  }
});

// -------------------- Store --------------------
router.get('/store/inventory', requireRole(STORE_READ_ROLES), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const termQ = String(req.query?.term || '').trim();
    const academicYearQ = String(req.query?.academic_year || req.query?.year || '').trim();
    const where = ['school_id = ?', 'deleted_at IS NULL'];
    const params = [schoolId];
    if (termQ) {
      where.push('term = ?');
      params.push(termQ);
    }
    if (academicYearQ) {
      where.push('academic_year = ?');
      params.push(academicYearQ);
    }
    const [rows] = await promisePool.query(
      `SELECT id, name, category, term, academic_year, unit, quantity, reorder_level, unit_cost, location, note, updated_at
       FROM store_inventory_items
       WHERE ${where.join(' AND ')}
       ORDER BY id DESC`,
      params
    );
    res.json({
      success: true,
      meta: { term: termQ || null, academic_year: academicYearQ || null },
      data: rows.map((r) => ({
        ...r,
        quantity: Number(r.quantity),
        reorder_level: Number(r.reorder_level),
        unit_cost: r.unit_cost != null ? Number(r.unit_cost) : null,
      })),
    });
  } catch (e) {
    console.error('[store/inventory GET]:', e.message);
    res.status(500).json({ success: false, message: 'Failed to load inventory' });
  }
});

function resolveInventoryCategory(payload) {
  const raw = String(payload.category || '').trim();
  const custom = String(payload.custom_category || payload.customCategory || '').trim();
  if (raw.toLowerCase() === 'other' && custom) return custom;
  return raw || custom || 'Other';
}

function toOptionalMoney(v) {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

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
        resolveInventoryCategory(payload),
        String(payload.term || '').trim() || null,
        String(payload.academic_year || '').trim() || null,
        String(payload.unit || '').trim() || 'pcs',
        toMoney(payload.quantity),
        toMoney(payload.reorder_level),
        toOptionalMoney(payload.unit_cost),
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
        resolveInventoryCategory(payload),
        String(payload.term || '').trim() || null,
        String(payload.academic_year || '').trim() || null,
        String(payload.unit || '').trim() || 'pcs',
        toMoney(payload.quantity),
        toMoney(payload.reorder_level),
        toOptionalMoney(payload.unit_cost),
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
    const termQ = String(req.query?.term || '').trim();
    const academicYearQ = String(req.query?.academic_year || req.query?.year || '').trim();
    const typeQ = String(req.query?.type || '').trim().toLowerCase();
    const supplierIdQ = Number(req.query?.supplier_id);
    const specificDate = String(req.query?.date || '').trim();
    const fromDate = String(req.query?.from || '').trim();
    const toDate = String(req.query?.to || '').trim();
    const where = ['m.school_id = ?', 'm.deleted_at IS NULL'];
    const params = [schoolId];
    if (termQ) {
      where.push('m.term = ?');
      params.push(termQ);
    }
    if (academicYearQ) {
      where.push('m.academic_year = ?');
      params.push(academicYearQ);
    }
    if (typeQ && typeQ !== 'all') {
      const normType =
        typeQ === 'received' ? 'stock_in'
          : typeQ === 'issued' ? 'stock_out'
            : typeQ;
      where.push('m.type = ?');
      params.push(normType);
    }
    if (Number.isFinite(supplierIdQ) && supplierIdQ > 0) {
      where.push('m.supplier_id = ?');
      params.push(supplierIdQ);
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
      `SELECT m.id, m.item_id, i.name AS item_name, i.category AS item_category, m.type, m.term, m.academic_year, m.movement_date,
              m.quantity, m.stock_after, m.unit_cost, m.ref, m.note, m.created_at, m.supplier_id,
              s.name AS supplier_name,
              i.quantity AS current_item_stock
       FROM store_movements m
       LEFT JOIN store_inventory_items i ON i.id = m.item_id AND i.deleted_at IS NULL
       LEFT JOIN store_suppliers s ON s.id = m.supplier_id AND s.school_id = m.school_id AND s.deleted_at IS NULL
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
      meta: { term: termQ || null, academic_year: academicYearQ || null },
      data: rows.map((r) => ({
        id: r.id,
        item_id: r.item_id,
        item_name: r.item_name || 'Unknown item',
        item_category: r.item_category || '',
        type: normalizeType(r.type),
        term: r.term || '',
        academic_year: r.academic_year || '',
        movement_date: r.movement_date || null,
        quantity: Number(r.quantity || 0),
        stock_after: Number(r.stock_after || r.current_item_stock || 0),
        current_item_stock: Number(r.current_item_stock || 0),
        unit_cost: r.unit_cost != null ? Number(r.unit_cost) : null,
        ref: r.ref || '',
        note: r.note || '',
        supplier_id: r.supplier_id || null,
        supplier_name: r.supplier_name || '',
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
    const unitCostRaw = payload.unit_cost;
    const unitCost =
      unitCostRaw === '' || unitCostRaw === null || unitCostRaw === undefined
        ? null
        : toMoney(unitCostRaw);
    const supplierId = Number(payload.supplier_id);
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

    let resolvedSupplierId = null;
    if (Number.isFinite(supplierId) && supplierId > 0) {
      const [[sup]] = await conn.query(
        `SELECT id FROM store_suppliers WHERE id = ? AND school_id = ? AND deleted_at IS NULL LIMIT 1`,
        [supplierId, schoolId]
      );
      if (!sup) {
        await conn.rollback();
        return res.status(400).json({ success: false, message: 'Supplier not found' });
      }
      resolvedSupplierId = supplierId;
    }

    const [movementInsert] = await conn.query(
      `INSERT INTO store_movements
       (school_id, item_id, supplier_id, type, term, academic_year, movement_date, quantity, stock_after, unit_cost, ref, note, created_by_user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        schoolId,
        itemId,
        resolvedSupplierId,
        type,
        resolvedTerm,
        resolvedAcademicYear,
        movementDate,
        quantity,
        nextQty,
        unitCost,
        ref,
        note,
        userId,
      ]
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

// ────────────────────────────────────────────────────────────────────────────
// GET /api/admin/staff-logins — staff login history (last_login + IP per user)
// ────────────────────────────────────────────────────────────────────────────
router.get('/admin/staff-logins', requireRole(ADMIN_AUDIT_ROLES), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const page   = Math.max(1, Number(req.query?.page)  || 1);
    const limit  = Math.min(200, Math.max(1, Number(req.query?.limit) || 60));
    const offset = (page - 1) * limit;
    const search = String(req.query?.search || '').trim();

    let where = 'u.school_id = ? AND u.deleted_at IS NULL';
    const params = [schoolId];

    if (search) {
      where += ' AND (u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ?)';
      const like = `%${search}%`;
      params.push(like, like, like);
    }

    const [[countRow]] = await promisePool.query(
      `SELECT COUNT(*) AS total FROM users u WHERE ${where}`,
      params
    );
    const total = Number(countRow?.total || 0);

    const [rows] = await promisePool.query(
      `SELECT
         u.id, u.first_name, u.last_name, u.email,
         u.last_login, u.last_login_ip, u.failed_login_attempts,
         r.role_code, r.role_name
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE ${where}
       ORDER BY u.last_login DESC, u.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return res.json({
      success: true,
      data: rows,
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    });
  } catch (e) {
    console.error('[admin/staff-logins GET]:', e.message);
    return res.status(500).json({ success: false, message: 'Failed to load staff logins' });
  }
});

// -------------------- School Budgets --------------------
const SCHOOL_BUDGET_STATUSES = ['draft', 'pending_approval', 'approved', 'rejected', 'closed'];
const SCHOOL_BUDGET_TYPES = ['Term Budget', 'Annual Budget', 'Department Budget', 'Project Budget', 'Emergency Budget', 'Supplementary Budget'];
const SCHOOL_BUDGET_TERMS = ['Term 1', 'Term 2', 'Term 3', 'Full Academic Year'];
const SCHOOL_BUDGET_FREQUENCIES = ['One Time', 'Daily', 'Weekly', 'Monthly', 'Per Term', 'Per Academic Year'];
const SCHOOL_BUDGET_INCOME_CATEGORIES = [
  'Academic Fees', 'Boarding & Welfare', 'Transport', 'Government Support',
  'Projects & Business', 'Donations', 'Miscellaneous', 'Other',
];
const SCHOOL_BUDGET_INCOME_SOURCES = [
  'Academic Fees', 'Tuition Fees', 'Registration Fees', 'Admission Fees', 'Re-admission Fees',
  'Examination Fees', 'Academic Materials Fees', 'Library Fees', 'Laboratory Fees', 'ICT/Computer Lab Fees',
  'Practical Training Fees', 'Certificate Processing Fees', 'Transcript Fees', 'Identity Card Fees',
  'Boarding Fees', 'Feeding Fees', 'Dormitory Fees', 'Laundry Fees', 'Welfare Contributions',
  'Transport Fees', 'School Bus Fees', 'Trip Contributions',
  'Government Grants', 'MINEDUC Support', 'District Support Funds', 'Capitation Grants', 'TVET Funding', 'Development Grants',
  'PTA Contributions', 'Parent Contributions', 'Community Donations', 'Church Support', 'Sponsorship Funds',
  'School Canteen Income', 'School Shop Income', 'Agriculture Project Income', 'Livestock Project Income',
  'School Production Sales', 'Event Ticket Sales', 'Hall Rental Income', 'School Farm Income', 'Uniform Sales', 'Bookshop Sales',
  'NGO Donations', 'International Grants', 'Scholarship Funds', 'Sponsor Contributions', 'Charity Donations',
  'Late Payment Penalties', 'Student Fines', 'Discipline Fines', 'Replacement Card Fees', 'Damage Compensation Fees',
  'Bank Interest', 'Investment Income', 'Savings Interest', 'Graduation Contributions', 'Competition Participation Fees', 'Study Tour Contributions',
  'Other',
];

function normalizeBudgetStatus(v) {
  const raw = String(v || '').trim().toLowerCase().replace(/\s+/g, '_');
  if (raw === 'pending' || raw === 'pendingapproval') return 'pending_approval';
  if (raw === 'save_draft' || raw === 'savedraft') return 'draft';
  return raw;
}

function budgetStatusToLabel(status) {
  const map = {
    draft: 'Draft',
    pending_approval: 'Pending Approval',
    approved: 'Approved',
    rejected: 'Rejected',
    closed: 'Closed',
  };
  return map[status] || status;
}

async function generateSchoolBudgetCode(schoolId, academicYear) {
  const yearMatch = String(academicYear || '').match(/\d{4}/);
  const year = yearMatch ? yearMatch[0] : String(new Date().getFullYear());
  const prefix = `BGT-${year}-`;
  const [[row]] = await promisePool.query(
    `SELECT COUNT(*) AS cnt
     FROM school_budgets
     WHERE school_id = ? AND budget_code LIKE ? AND deleted_at IS NULL`,
    [schoolId, `${prefix}%`]
  );
  const seq = Number(row?.cnt || 0) + 1;
  return `${prefix}${String(seq).padStart(3, '0')}`;
}

function mapBudgetIncomeRow(r) {
  const key = String(r.income_source_key || '');
  const isOther = key.toLowerCase() === 'other';
  return {
    id: r.id,
    incomeSource: isOther ? 'Other' : key,
    incomeSourceKey: key,
    customSourceName: r.custom_source_name || '',
    incomeCategory: r.income_category || '',
    expectedAmount: Number(r.expected_amount_rwf || 0),
    collectionFrequency: r.collection_frequency || '',
    description: r.description || '',
    sortOrder: Number(r.sort_order || 0),
  };
}

function mapBudgetRow(r, incomes = []) {
  const totalIncome = Number(r.total_expected_income_rwf || 0);
  const totalAllocated = Number(r.total_allocated_rwf || 0);
  const remaining = totalIncome - totalAllocated;
  const usagePct = totalIncome > 0 ? Math.round((totalAllocated / totalIncome) * 100) : 0;
  return {
    db_id: r.id,
    id: `BGT-${r.id}`,
    budgetCode: r.budget_code,
    title: r.title,
    academicYear: r.academic_year,
    term: r.term,
    budgetType: r.budget_type,
    status: r.status,
    statusLabel: budgetStatusToLabel(r.status),
    startDate: r.start_date,
    endDate: r.end_date,
    description: r.description || '',
    approvalNotes: r.approval_notes || '',
    totalExpectedIncome: totalIncome,
    totalAllocated,
    remainingBalance: remaining,
    budgetUsagePct: usagePct,
    preparedByName: r.prepared_by_name || '',
    createdByUserId: r.created_by_user_id ? Number(r.created_by_user_id) : null,
    submittedAt: r.submitted_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    incomeSources: incomes,
  };
}

async function loadBudgetIncomes(budgetIds, schoolId) {
  if (!budgetIds.length) return new Map();
  const placeholders = budgetIds.map(() => '?').join(',');
  const [rows] = await promisePool.query(
    `SELECT id, budget_id, income_source_key, custom_source_name, income_category,
            expected_amount_rwf, collection_frequency, description, sort_order
     FROM school_budget_income_sources
     WHERE school_id = ? AND budget_id IN (${placeholders})
     ORDER BY sort_order ASC, id ASC`,
    [schoolId, ...budgetIds]
  );
  const map = new Map();
  for (const r of rows) {
    const list = map.get(r.budget_id) || [];
    list.push(mapBudgetIncomeRow(r));
    map.set(r.budget_id, list);
  }
  return map;
}

router.get('/accountant/school-budgets/options', requireRole(ACCOUNTANT_READ_ROLES), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const ctx = await resolveAcademicContext(schoolId, req.query?.academic_year, req.query?.term);
    const academicYear = String(req.query?.academic_year || '').trim() || ctx.academicYear;
    const nextBudgetCode = await generateSchoolBudgetCode(schoolId, academicYear);

    const [[schoolRow]] = await promisePool.query(
      `SELECT name FROM schools WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
      [schoolId]
    ).catch(() => [[null]]);

    const years = new Set();
    years.add(ctx.academicYear);
    years.add(academicYear);
    const y = new Date().getFullYear();
    for (let i = -1; i <= 2; i += 1) {
      const start = y + i;
      years.add(`${start}-${start + 1}`);
    }
    const [[settingsRow]] = await promisePool.query(
      `SELECT current_academic_year FROM school_academic_settings WHERE school_id = ? LIMIT 1`,
      [schoolId]
    ).catch(() => [[null]]);
    if (settingsRow?.current_academic_year) years.add(String(settingsRow.current_academic_year).trim());

    let terms = SCHOOL_BUDGET_TERMS.slice(0, 3);
    try {
      const [[row]] = await promisePool.query(
        `SELECT active_terms_json FROM school_academic_settings WHERE school_id = ? LIMIT 1`,
        [schoolId]
      );
      if (row?.active_terms_json) {
        const parsed = Array.isArray(row.active_terms_json)
          ? row.active_terms_json
          : JSON.parse(row.active_terms_json);
        if (Array.isArray(parsed) && parsed.length) {
          terms = [...new Set([...parsed.map((x) => String(x || '').trim()).filter(Boolean), 'Full Academic Year'])];
        }
      }
    } catch (_) {}

    res.json({
      success: true,
      data: {
        schoolName: schoolRow?.name || '',
        academicYears: [...years].filter(Boolean).sort().reverse(),
        terms,
        budgetTypes: SCHOOL_BUDGET_TYPES,
        budgetStatuses: SCHOOL_BUDGET_STATUSES.map((s) => ({ value: s, label: budgetStatusToLabel(s) })),
        collectionFrequencies: SCHOOL_BUDGET_FREQUENCIES,
        incomeCategories: SCHOOL_BUDGET_INCOME_CATEGORIES,
        incomeSources: SCHOOL_BUDGET_INCOME_SOURCES,
        defaultAcademicYear: ctx.academicYear,
        defaultTerm: ctx.term,
        nextBudgetCode,
      },
    });
  } catch (e) {
    console.error('[accountant/school-budgets/options GET]:', e.message);
    res.status(500).json({ success: false, message: 'Failed to load budget form options' });
  }
});

router.get('/accountant/school-budgets', requireRole(ACCOUNTANT_READ_ROLES), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const statusQ = normalizeBudgetStatus(req.query?.status);
    const where = ['school_id = ?', 'deleted_at IS NULL'];
    const params = [schoolId];
    if (statusQ && SCHOOL_BUDGET_STATUSES.includes(statusQ)) {
      where.push('status = ?');
      params.push(statusQ);
    }
    const [rows] = await promisePool.query(
      `SELECT id, school_id, created_by_user_id, budget_code, title, academic_year, term, budget_type,
              status, start_date, end_date, description, approval_notes,
              total_expected_income_rwf, total_allocated_rwf, prepared_by_name, submitted_at, created_at, updated_at
       FROM school_budgets
       WHERE ${where.join(' AND ')}
       ORDER BY id DESC`,
      params
    );
    const incomeMap = await loadBudgetIncomes(rows.map((r) => r.id), schoolId);
    res.json({
      success: true,
      data: rows.map((r) => mapBudgetRow(r, incomeMap.get(r.id) || [])),
    });
  } catch (e) {
    console.error('[accountant/school-budgets GET]:', e.message);
    res.status(500).json({ success: false, message: 'Failed to load school budgets' });
  }
});

router.get('/accountant/school-budgets/manager-overview', requireRole(ACCOUNTANT_READ_ROLES), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const [[budgetStats]] = await promisePool.query(
      `SELECT COUNT(*) AS total_budgets,
              SUM(CASE WHEN status = 'pending_approval' THEN 1 ELSE 0 END) AS pending_approval,
              SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved_count,
              SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS rejected_count,
              SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) AS closed_count,
              COALESCE(SUM(total_expected_income_rwf), 0) AS total_expected_income,
              COALESCE(SUM(total_allocated_rwf), 0) AS total_allocated
       FROM school_budgets WHERE school_id = ? AND deleted_at IS NULL`,
      [schoolId]
    );
    const [[lineStats]] = await promisePool.query(
      `SELECT COUNT(*) AS total_lines, COALESCE(SUM(planned_amount_rwf), 0) AS lines_planned,
              COALESCE(SUM(used_amount_rwf), 0) AS lines_used,
              SUM(CASE WHEN is_frozen = 1 THEN 1 ELSE 0 END) AS frozen_lines
       FROM school_budget_lines WHERE school_id = ? AND deleted_at IS NULL`,
      [schoolId]
    );
    const [exhaustedRows] = await promisePool.query(
      `SELECT id FROM school_budget_lines WHERE school_id = ? AND deleted_at IS NULL AND is_frozen = 0
         AND planned_amount_rwf > 0 AND used_amount_rwf >= planned_amount_rwf`,
      [schoolId]
    );
    const [warningRows] = await promisePool.query(
      `SELECT id, line_name_key, custom_line_name, planned_amount_rwf, used_amount_rwf
       FROM school_budget_lines WHERE school_id = ? AND deleted_at IS NULL AND is_frozen = 0
         AND planned_amount_rwf > 0 AND (used_amount_rwf / planned_amount_rwf) >= 0.8 LIMIT 12`,
      [schoolId]
    );
    const totalExpected = Number(budgetStats?.total_expected_income || 0);
    const totalAllocated = Number(budgetStats?.total_allocated || 0);
    const linesUsed = Number(lineStats?.lines_used || 0);
    const remaining = totalExpected - totalAllocated;
    const usagePct = totalExpected > 0 ? Math.round((linesUsed / totalExpected) * 100) : 0;
    const alerts = warningRows.map((r) => {
      const planned = Number(r.planned_amount_rwf || 0);
      const used = Number(r.used_amount_rwf || 0);
      const pct = planned > 0 ? Math.round((used / planned) * 100) : 0;
      const name = String(r.line_name_key).toLowerCase() === 'other' ? r.custom_line_name : r.line_name_key;
      return { id: r.id, message: pct >= 100 ? `${name} budget line has been fully used.` : `${name} budget has reached ${pct}% usage.`, type: pct >= 100 ? 'danger' : 'warning' };
    });
    if (Number(budgetStats?.pending_approval || 0) > 0) {
      alerts.unshift({ id: 'pending', message: `${budgetStats.pending_approval} budget(s) pending approval.`, type: 'info' });
    }
    res.json({
      success: true,
      data: {
        totalBudgets: Number(budgetStats?.total_budgets || 0),
        pendingApprovals: Number(budgetStats?.pending_approval || 0),
        approvedCount: Number(budgetStats?.approved_count || 0),
        rejectedCount: Number(budgetStats?.rejected_count || 0),
        totalExpectedIncome: totalExpected,
        totalAllocatedBudget: totalAllocated,
        totalUsedBudget: linesUsed,
        remainingBalance: remaining,
        budgetUsagePct: usagePct,
        totalBudgetLines: Number(lineStats?.total_lines || 0),
        exhaustedLines: exhaustedRows.length,
        frozenLines: Number(lineStats?.frozen_lines || 0),
        alerts,
      },
    });
  } catch (e) {
    console.error('[school-budgets/manager-overview GET]:', e.message);
    res.status(500).json({ success: false, message: 'Failed to load manager overview' });
  }
});

router.get('/accountant/school-budgets/dashboard', requireRole(ACCOUNTANT_READ_ROLES), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const budget = await resolveActiveBudgetForLines(schoolId, req.query?.budget_id);

    const [[schoolStats]] = await promisePool.query(
      `SELECT COUNT(*) AS total_budgets,
              SUM(CASE WHEN status = 'pending_approval' THEN 1 ELSE 0 END) AS pending_approval,
              SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved_count,
              COALESCE(SUM(total_expected_income_rwf), 0) AS total_expected_income
       FROM school_budgets WHERE school_id = ? AND deleted_at IS NULL`,
      [schoolId]
    );

    const [[lineStatsAll]] = await promisePool.query(
      `SELECT COUNT(*) AS total_lines,
              COALESCE(SUM(planned_amount_rwf), 0) AS lines_planned,
              COALESCE(SUM(used_amount_rwf), 0) AS lines_used
       FROM school_budget_lines WHERE school_id = ? AND deleted_at IS NULL`,
      [schoolId]
    );

    const [recentBudgets] = await promisePool.query(
      `SELECT id, title, budget_code, academic_year, term, status, total_expected_income_rwf, total_allocated_rwf, updated_at
       FROM school_budgets WHERE school_id = ? AND deleted_at IS NULL
       ORDER BY updated_at DESC LIMIT 8`,
      [schoolId]
    );

    let activeBudget = null;
    let incomeSources = [];
    let budgetLines = [];
    let monthlyData = [];
    let departmentSpending = [];
    let alerts = [];
    let recentUsage = [];
    let auditLogs = [];

    if (budget) {
      const budgetId = budget.id;
      const incomeMapLoaded = await loadBudgetIncomes([budgetId], schoolId);
      incomeSources = (incomeMapLoaded.get(budgetId) || []).map((inc) => ({
        name: String(inc.incomeSource || '').toLowerCase() === 'other'
          ? (inc.customSourceName || 'Other')
          : (inc.incomeSource || 'Income'),
        amount: Number(inc.expectedAmount || 0),
        collected: Number(inc.expectedAmount || 0),
      }));

      const [lineRows] = await promisePool.query(
        `SELECT id, line_name_key, custom_line_name, department, planned_amount_rwf, used_amount_rwf, is_frozen
         FROM school_budget_lines WHERE budget_id = ? AND school_id = ? AND deleted_at IS NULL
         ORDER BY planned_amount_rwf DESC`,
        [budgetId, schoolId]
      );
      budgetLines = lineRows.map((r) => {
        const mapped = mapBudgetLineRow(r);
        return {
          id: mapped.id,
          name: mapped.lineName,
          planned: mapped.plannedAmount,
          used: mapped.usedAmount,
          dept: mapped.department || 'Unassigned',
          usagePct: mapped.usagePct,
          statusKey: mapped.statusKey,
          statusLabel: mapped.statusLabel,
        };
      });

      const [usageRows] = await promisePool.query(
        `SELECT u.id, u.budget_line_id, u.usage_amount_rwf, u.usage_date, u.expense_category,
                u.payment_method, u.description, u.receipt_name, u.created_at,
                l.line_name_key, l.custom_line_name,
                TRIM(CONCAT(COALESCE(us.first_name,''), ' ', COALESCE(us.last_name,''))) AS recorded_by
         FROM school_budget_line_usage u
         INNER JOIN school_budget_lines l ON l.id = u.budget_line_id AND l.deleted_at IS NULL
         LEFT JOIN users us ON us.id = u.created_by_user_id
         WHERE l.budget_id = ? AND u.school_id = ?
         ORDER BY u.id DESC LIMIT 50`,
        [budgetId, schoolId]
      );
      recentUsage = usageRows.map((r) => ({
        id: r.id,
        budgetLineId: r.budget_line_id,
        lineName: String(r.line_name_key || '').toLowerCase() === 'other' ? (r.custom_line_name || 'Other') : r.line_name_key,
        amount: Number(r.usage_amount_rwf || 0),
        usageDate: r.usage_date,
        expenseCategory: r.expense_category || '',
        paymentMethod: r.payment_method || '',
        description: r.description || '',
        receiptName: r.receipt_name || '',
        reference: r.receipt_name ? String(r.receipt_name) : `USG-${r.id}`,
        recordedBy: String(r.recorded_by || '').trim() || '—',
        createdAt: r.created_at,
      }));

      const [auditRows] = await promisePool.query(
        `SELECT a.id, a.user_id, a.role_code, a.action_name, a.entity_type, a.endpoint, a.created_at,
                TRIM(CONCAT(COALESCE(u.first_name,''), ' ', COALESCE(u.last_name,''))) AS user_name
         FROM portal_operation_audit_logs a
         LEFT JOIN users u ON u.id = a.user_id
         WHERE a.school_id = ?
           AND (
             a.entity_type IN ('school_budget', 'school_budget_line')
             OR a.endpoint LIKE '%school-budget%'
             OR a.endpoint LIKE '%budget-line%'
           )
         ORDER BY a.id DESC
         LIMIT 80`,
        [schoolId]
      );
      auditLogs = auditRows.map((r) => ({
        id: r.id,
        user: String(r.user_name || '').trim() || `User #${r.user_id || '—'}`,
        action: `${r.action_name || 'update'} · ${r.entity_type || 'budget'}`.replace(/_/g, ' '),
        date: r.created_at,
        type: String(r.action_name || '').toLowerCase().includes('approve')
          ? 'approve'
          : String(r.action_name || '').toLowerCase().includes('create')
            ? 'create'
            : String(r.endpoint || '').includes('usage')
              ? 'expense'
              : 'edit',
        entityType: r.entity_type,
        roleCode: r.role_code,
      }));

      const [monthRows] = await promisePool.query(
        `SELECT DATE_FORMAT(u.usage_date, '%Y-%m') AS ym,
                DATE_FORMAT(u.usage_date, '%b') AS month_label,
                COALESCE(SUM(u.usage_amount_rwf), 0) AS expenses
         FROM school_budget_line_usage u
         INNER JOIN school_budget_lines l ON l.id = u.budget_line_id AND l.deleted_at IS NULL
         WHERE l.budget_id = ? AND u.school_id = ?
         GROUP BY ym, month_label
         ORDER BY ym ASC
         LIMIT 12`,
        [budgetId, schoolId]
      );
      monthlyData = monthRows.map((r) => ({
        month: r.month_label,
        expenses: Number(r.expenses || 0),
        income: 0,
      }));

      const deptMap = {};
      budgetLines.forEach((l) => {
        const d = l.dept || 'Other';
        if (!deptMap[d]) deptMap[d] = { department: d, planned: 0, used: 0 };
        deptMap[d].planned += l.planned;
        deptMap[d].used += l.used;
      });
      departmentSpending = Object.values(deptMap).sort((a, b) => b.used - a.used);

      budgetLines.filter((l) => l.planned > 0 && l.usagePct >= 80).forEach((l) => {
        alerts.push({
          id: l.name,
          message: l.usagePct >= 100
            ? `${l.name} line is fully used.`
            : `${l.name} has reached ${l.usagePct}% usage.`,
          type: l.usagePct >= 100 ? 'danger' : 'warning',
        });
      });
      if (String(budget.status) === 'pending_approval') {
        alerts.unshift({ id: 'pending', message: 'This budget is awaiting manager approval.', type: 'info' });
      }

      const [[fullBudget]] = await promisePool.query(
        `SELECT id, title, budget_code, academic_year, term, status,
                total_expected_income_rwf, total_allocated_rwf,
                prepared_by_name, submitted_at, created_at, updated_at,
                manager_review_notes, manager_reviewed_at, approval_notes
         FROM school_budgets WHERE id = ? AND school_id = ? AND deleted_at IS NULL LIMIT 1`,
        [budgetId, schoolId]
      );
      const b = fullBudget || budget;
      activeBudget = {
        id: b.id,
        title: b.title,
        budgetCode: b.budget_code,
        academicYear: b.academic_year,
        term: b.term,
        status: b.status,
        statusLabel: budgetStatusToLabel(b.status),
        totalExpectedIncome: Number(b.total_expected_income_rwf || 0),
        totalAllocated: Number(b.total_allocated_rwf || 0),
        preparedByName: b.prepared_by_name || null,
        submittedAt: b.submitted_at,
        createdAt: b.created_at,
        updatedAt: b.updated_at,
        managerReviewNotes: b.manager_review_notes || null,
        managerReviewedAt: b.manager_reviewed_at,
        approvalNotes: b.approval_notes || null,
      };
    }

    const totalExpectedIncome = activeBudget
      ? activeBudget.totalExpectedIncome
      : Number(schoolStats?.total_expected_income || 0);
    const linesPlanned = budgetLines.reduce((s, l) => s + l.planned, 0);
    const totalAllocated = activeBudget ? linesPlanned : Number(lineStatsAll?.lines_planned || 0);
    const totalUsed = budgetLines.reduce((s, l) => s + l.used, 0) || Number(lineStatsAll?.lines_used || 0);
    const totalCollected = incomeSources.reduce((s, i) => s + i.collected, 0);
    const remainingUnallocated = Math.max(0, totalExpectedIncome - totalAllocated);
    const availableBalance = Math.max(0, totalAllocated - totalUsed);
    const usagePct = totalAllocated > 0 ? Math.round((totalUsed / totalAllocated) * 100) : 0;

    res.json({
      success: true,
      data: {
        schoolOverview: {
          totalBudgets: Number(schoolStats?.total_budgets || 0),
          pendingApprovals: Number(schoolStats?.pending_approval || 0),
          approvedCount: Number(schoolStats?.approved_count || 0),
        },
        activeBudget,
        recentBudgets: recentBudgets.map((b) => ({
          id: b.id,
          title: b.title,
          budgetCode: b.budget_code,
          academicYear: b.academic_year,
          term: b.term,
          status: b.status,
          statusLabel: budgetStatusToLabel(b.status),
          totalExpectedIncome: Number(b.total_expected_income_rwf || 0),
          updatedAt: b.updated_at,
        })),
        incomeSources,
        budgetLines,
        monthlyData,
        departmentSpending,
        alerts,
        recentUsage,
        auditLogs,
        totals: {
          totalExpectedIncome,
          totalCollected,
          totalAllocated,
          totalUsed,
          remainingUnallocated,
          availableBalance,
          usagePct,
        },
      },
    });
  } catch (e) {
    console.error('[school-budgets/dashboard GET]:', e.message);
    res.status(500).json({ success: false, message: 'Failed to load budget dashboard' });
  }
});

router.get('/accountant/school-budgets/:id', requireRole(ACCOUNTANT_READ_ROLES), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid budget id' });
    const [[row]] = await promisePool.query(
      `SELECT id, school_id, created_by_user_id, budget_code, title, academic_year, term, budget_type,
              status, start_date, end_date, description, approval_notes,
              total_expected_income_rwf, total_allocated_rwf, prepared_by_name, submitted_at, created_at, updated_at
       FROM school_budgets
       WHERE id = ? AND school_id = ? AND deleted_at IS NULL
       LIMIT 1`,
      [id, schoolId]
    );
    if (!row) return res.status(404).json({ success: false, message: 'Budget not found' });
    const incomeMap = await loadBudgetIncomes([id], schoolId);
    res.json({ success: true, data: mapBudgetRow(row, incomeMap.get(id) || []) });
  } catch (e) {
    console.error('[accountant/school-budgets/:id GET]:', e.message);
    res.status(500).json({ success: false, message: 'Failed to load school budget' });
  }
});

function parseBudgetDateOrNull(v) {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

router.post('/accountant/school-budgets', requireRole(ACCOUNTANT_WRITE_ROLES), async (req, res) => {
  const conn = await promisePool.getConnection();
  try {
    const { schoolId, userId, roleCode } = req.ctx;
    const payload = req.body || {};
    const title = String(payload.title || '').trim();
    const academicYear = String(payload.academicYear || payload.academic_year || '').trim();
    const term = String(payload.term || '').trim();
    const budgetType = String(payload.budgetType || payload.budget_type || 'Term Budget').trim();
    const status = normalizeBudgetStatus(payload.status || 'draft');
    const startDate = parseBudgetDateOrNull(payload.startDate || payload.start_date);
    const endDate = parseBudgetDateOrNull(payload.endDate || payload.end_date);
    const description = String(payload.description || '').trim() || null;
    const approvalNotes = String(payload.approvalNotes || payload.approval_notes || '').trim() || null;
    const preparedByName = String(payload.preparedByName || payload.prepared_by_name || '').trim() || null;
    const incomes = Array.isArray(payload.incomeSources) ? payload.incomeSources : [];
    const submit = Boolean(payload.submit);

    if (!title) {
      return res.status(400).json({ success: false, message: 'Budget title is required' });
    }
    if (!academicYear) {
      return res.status(400).json({ success: false, message: 'Academic year is required' });
    }
    if (!term) {
      return res.status(400).json({ success: false, message: 'Term is required' });
    }
    if (!SCHOOL_BUDGET_TYPES.includes(budgetType)) {
      return res.status(400).json({ success: false, message: 'Invalid budget type' });
    }

    let finalStatus = SCHOOL_BUDGET_STATUSES.includes(status) ? status : 'draft';
    if (submit) finalStatus = 'pending_approval';
    else if (finalStatus === 'pending_approval') finalStatus = 'draft';

    const budgetCode = String(payload.budgetCode || payload.budget_code || '').trim()
      || await generateSchoolBudgetCode(schoolId, academicYear);

    const totalIncome = incomes.reduce((s, row) => s + toMoney(row.expectedAmount ?? row.expected_amount), 0);
    const totalAllocated = toMoney(payload.totalAllocated ?? payload.total_allocated_rwf ?? 0);

    if (totalAllocated > totalIncome && totalIncome > 0) {
      return res.status(400).json({ success: false, message: 'Allocated amount cannot exceed expected income' });
    }

    let preparedName = preparedByName;
    if (!preparedName) {
      const [[u]] = await promisePool.query(
        `SELECT TRIM(CONCAT(COALESCE(first_name,''), ' ', COALESCE(last_name,''))) AS full_name
         FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
        [userId]
      );
      preparedName = String(u?.full_name || '').trim() || null;
    }

    await conn.beginTransaction();
    const [ins] = await conn.query(
      `INSERT INTO school_budgets
       (school_id, created_by_user_id, budget_code, title, academic_year, term, budget_type, status,
        start_date, end_date, description, approval_notes, total_expected_income_rwf, total_allocated_rwf,
        prepared_by_name, submitted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        schoolId, userId, budgetCode, title, academicYear, term, budgetType, finalStatus,
        startDate,
        endDate,
        description, approvalNotes, totalIncome, totalAllocated, preparedName,
        submit ? new Date() : null,
      ]
    );
    const budgetId = ins.insertId;

    for (let i = 0; i < incomes.length; i += 1) {
      const row = incomes[i] || {};
      const sourceLabel = String(row.incomeSource || row.income_source || '').trim();
      const isOther = sourceLabel.toLowerCase() === 'other';
      const key = isOther ? 'other' : sourceLabel;
      const customName = isOther ? String(row.customSourceName || row.custom_source_name || '').trim() || null : null;
      const category = String(row.incomeCategory || row.income_category || '').trim() || null;
      const amount = toMoney(row.expectedAmount ?? row.expected_amount);
      const frequency = String(row.collectionFrequency || row.collection_frequency || '').trim() || null;
      const note = String(row.description || '').trim() || null;
      if (!sourceLabel && amount <= 0) continue;
      await conn.query(
        `INSERT INTO school_budget_income_sources
         (budget_id, school_id, income_source_key, custom_source_name, income_category,
          expected_amount_rwf, collection_frequency, description, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [budgetId, schoolId, key, customName, category, amount, frequency, note, i]
      );
    }

    await conn.commit();
    await appendAuditLog({
      schoolId,
      userId,
      roleCode,
      endpoint: '/accountant/school-budgets',
      entityType: 'school_budget',
      entityId: budgetId,
      action: submit ? 'submit' : 'create',
      afterState: { status: finalStatus, budget_code: budgetCode, total_expected_income_rwf: totalIncome },
    });

    if (finalStatus === 'pending_approval') {
      notifyBudgetSchoolRoles(schoolId, ['SCHOOL_MANAGER', 'SCHOOL_ADMIN'], {
        title: 'Budget pending approval',
        body: `${title} (${budgetCode}) was submitted and needs your review.`,
        tag: `budget-submit-${budgetId}`,
        url: '/manager/finance/budgets',
      });
    }

    res.status(201).json({
      success: true,
      message: submit ? 'Budget submitted for approval' : 'Budget saved as draft',
      id: budgetId,
      budgetCode,
    });
  } catch (e) {
    await conn.rollback().catch(() => {});
    console.error('[accountant/school-budgets POST]:', e.message);
    const dup = String(e?.code || '') === 'ER_DUP_ENTRY';
    res.status(dup ? 409 : 500).json({
      success: false,
      message: dup
        ? 'A budget with this code already exists. Refresh the form to get a new code.'
        : (e.message || 'Failed to create school budget'),
    });
  } finally {
    conn.release();
  }
});

router.patch('/accountant/school-budgets/:id', requireRole(ACCOUNTANT_WRITE_ROLES), async (req, res) => {
  const conn = await promisePool.getConnection();
  try {
    const { schoolId, userId, roleCode } = req.ctx;
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid budget id' });

    const [[existing]] = await conn.query(
      `SELECT id, status FROM school_budgets WHERE id = ? AND school_id = ? AND deleted_at IS NULL LIMIT 1`,
      [id, schoolId]
    );
    if (!existing) return res.status(404).json({ success: false, message: 'Budget not found' });
    if (!['draft', 'rejected'].includes(String(existing.status))) {
      return res.status(400).json({ success: false, message: 'Only draft or rejected budgets can be edited' });
    }

    const payload = req.body || {};
    const title = String(payload.title || '').trim();
    const academicYear = String(payload.academicYear || payload.academic_year || '').trim();
    const term = String(payload.term || '').trim();
    const budgetType = String(payload.budgetType || payload.budget_type || '').trim();
    const status = normalizeBudgetStatus(payload.status || 'draft');
    const startDate = parseBudgetDateOrNull(payload.startDate || payload.start_date);
    const endDate = parseBudgetDateOrNull(payload.endDate || payload.end_date);
    const description = String(payload.description || '').trim() || null;
    const approvalNotes = String(payload.approvalNotes || payload.approval_notes || '').trim() || null;
    const incomes = Array.isArray(payload.incomeSources) ? payload.incomeSources : null;
    const submit = Boolean(payload.submit);

    let finalStatus = SCHOOL_BUDGET_STATUSES.includes(status) ? status : 'draft';
    if (submit) finalStatus = 'pending_approval';
    else if (finalStatus === 'pending_approval') finalStatus = 'draft';

    if (submit && !String(payload.title || '').trim()) {
      return res.status(400).json({ success: false, message: 'Budget title is required' });
    }

    const totalIncome = incomes
      ? incomes.reduce((s, row) => s + toMoney(row.expectedAmount ?? row.expected_amount), 0)
      : null;
    const totalAllocated = payload.totalAllocated != null || payload.total_allocated_rwf != null
      ? toMoney(payload.totalAllocated ?? payload.total_allocated_rwf)
      : null;

    if (totalIncome != null && totalAllocated != null && totalAllocated > totalIncome && totalIncome > 0) {
      return res.status(400).json({ success: false, message: 'Allocated amount cannot exceed expected income' });
    }

    const sets = [];
    const vals = [];
    if (title) { sets.push('title = ?'); vals.push(title); }
    if (academicYear) { sets.push('academic_year = ?'); vals.push(academicYear); }
    if (term) { sets.push('term = ?'); vals.push(term); }
    if (budgetType && SCHOOL_BUDGET_TYPES.includes(budgetType)) { sets.push('budget_type = ?'); vals.push(budgetType); }
    sets.push('status = ?'); vals.push(finalStatus);
    sets.push('start_date = ?'); vals.push(startDate);
    sets.push('end_date = ?'); vals.push(endDate);
    sets.push('description = ?'); vals.push(description);
    sets.push('approval_notes = ?'); vals.push(approvalNotes);
    if (totalIncome != null) { sets.push('total_expected_income_rwf = ?'); vals.push(totalIncome); }
    if (totalAllocated != null) { sets.push('total_allocated_rwf = ?'); vals.push(totalAllocated); }
    if (submit) { sets.push('submitted_at = ?'); vals.push(new Date()); }
    vals.push(id, schoolId);

    await conn.beginTransaction();
    await conn.query(
      `UPDATE school_budgets SET ${sets.join(', ')} WHERE id = ? AND school_id = ?`,
      vals
    );

    if (incomes) {
      await conn.query(`DELETE FROM school_budget_income_sources WHERE budget_id = ? AND school_id = ?`, [id, schoolId]);
      for (let i = 0; i < incomes.length; i += 1) {
        const row = incomes[i] || {};
        const sourceLabel = String(row.incomeSource || row.income_source || '').trim();
        const isOther = sourceLabel.toLowerCase() === 'other';
        const key = isOther ? 'other' : sourceLabel;
        const customName = isOther ? String(row.customSourceName || row.custom_source_name || '').trim() || null : null;
        const category = String(row.incomeCategory || row.income_category || '').trim() || null;
        const amount = toMoney(row.expectedAmount ?? row.expected_amount);
        const frequency = String(row.collectionFrequency || row.collection_frequency || '').trim() || null;
        const note = String(row.description || '').trim() || null;
        if (!sourceLabel && amount <= 0) continue;
        await conn.query(
          `INSERT INTO school_budget_income_sources
           (budget_id, school_id, income_source_key, custom_source_name, income_category,
            expected_amount_rwf, collection_frequency, description, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, schoolId, key, customName, category, amount, frequency, note, i]
        );
      }
    }

    await conn.commit();
    await appendAuditLog({
      schoolId,
      userId,
      roleCode,
      endpoint: '/accountant/school-budgets/:id',
      entityType: 'school_budget',
      entityId: id,
      action: submit ? 'submit' : 'update',
      afterState: { status: finalStatus },
    });

    if (submit && finalStatus === 'pending_approval') {
      const [[meta]] = await promisePool.query(
        `SELECT title, budget_code FROM school_budgets WHERE id = ? AND school_id = ? LIMIT 1`,
        [id, schoolId]
      );
      const bTitle = meta?.title || title || 'School budget';
      const bCode = meta?.budget_code || '';
      notifyBudgetSchoolRoles(schoolId, ['SCHOOL_MANAGER', 'SCHOOL_ADMIN'], {
        title: 'Budget pending approval',
        body: `${bTitle}${bCode ? ` (${bCode})` : ''} was submitted and needs your review.`,
        tag: `budget-submit-${id}`,
        url: '/manager/finance/budgets',
      });
    }

    res.json({
      success: true,
      message: submit ? 'Budget submitted for approval' : 'Budget updated',
    });
  } catch (e) {
    await conn.rollback().catch(() => {});
    console.error('[accountant/school-budgets/:id PATCH]:', e.message);
    res.status(500).json({ success: false, message: 'Failed to update school budget' });
  } finally {
    conn.release();
  }
});

// -------------------- School Budget Lines --------------------
const BUDGET_LINE_APPROVAL = ['Pending', 'Approved', 'Rejected', 'Draft'];
const BUDGET_LINE_PRIORITY = ['Low', 'Medium', 'High', 'Critical'];

function mapBudgetLineRow(r) {
  const planned = Number(r.planned_amount_rwf || 0);
  const used = Number(r.used_amount_rwf || 0);
  const remaining = planned - used;
  const usagePct = planned > 0 ? Math.round((used / planned) * 100) : 0;
  const isOther = String(r.line_name_key || '').toLowerCase() === 'other';
  const isFrozen = Boolean(r.is_frozen);
  let statusKey = 'active';
  if (isFrozen) statusKey = 'frozen';
  else if (usagePct >= 100) statusKey = 'exhausted';
  else if (usagePct >= 90) statusKey = 'critical';
  else if (usagePct >= 80) statusKey = 'warning';
  return {
    db_id: r.id,
    id: r.id,
    budgetId: r.budget_id,
    lineName: isOther ? (r.custom_line_name || 'Other') : r.line_name_key,
    lineNameKey: r.line_name_key,
    customLineName: r.custom_line_name || '',
    budgetCategory: r.budget_category,
    department: r.department,
    priorityLevel: r.priority_level,
    plannedAmount: planned,
    usedAmount: used,
    remaining,
    usagePct,
    isFrozen,
    statusKey,
    statusLabel: isFrozen ? 'Frozen' : statusKey === 'exhausted' ? 'Exhausted' : statusKey === 'critical' ? 'Critical' : statusKey === 'warning' ? 'Warning' : 'Active',
    allocationDate: r.allocation_date,
    description: r.description || '',
    notes: r.notes || '',
    referenceNumber: r.reference_number || '',
    preparedByName: r.prepared_by_name || '',
    reviewedByName: r.reviewed_by_name || '',
    approvalStatus: r.approval_status,
    approvalNotes: r.approval_notes || '',
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

async function resolveActiveBudgetForLines(schoolId, budgetIdQ) {
  const id = Number(budgetIdQ);
  if (id) {
    const [[row]] = await promisePool.query(
      `SELECT id, title, budget_code, academic_year, term, total_expected_income_rwf, total_allocated_rwf, status
       FROM school_budgets WHERE id = ? AND school_id = ? AND deleted_at IS NULL LIMIT 1`,
      [id, schoolId]
    );
    return row || null;
  }
  const [[row]] = await promisePool.query(
    `SELECT id, title, budget_code, academic_year, term, total_expected_income_rwf, total_allocated_rwf, status
     FROM school_budgets
     WHERE school_id = ? AND deleted_at IS NULL AND status IN ('approved', 'pending_approval')
     ORDER BY FIELD(status, 'approved', 'pending_approval'), id DESC LIMIT 1`,
    [schoolId]
  );
  return row || null;
}

router.get('/accountant/budget-lines/options', requireRole(ACCOUNTANT_READ_ROLES), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const budget = await resolveActiveBudgetForLines(schoolId, req.query?.budget_id);
    const [budgets] = await promisePool.query(
      `SELECT id, title, budget_code, status, total_expected_income_rwf, total_allocated_rwf
       FROM school_budgets WHERE school_id = ? AND deleted_at IS NULL
       ORDER BY id DESC LIMIT 50`,
      [schoolId]
    );
    res.json({
      success: true,
      data: {
        activeBudget: budget
          ? {
              id: budget.id,
              title: budget.title,
              budgetCode: budget.budget_code,
              status: budget.status,
              totalExpectedIncome: Number(budget.total_expected_income_rwf || 0),
              totalAllocated: Number(budget.total_allocated_rwf || 0),
            }
          : null,
        budgets: budgets.map((b) => ({
          id: b.id,
          title: b.title,
          budgetCode: b.budget_code,
          status: b.status,
          totalExpectedIncome: Number(b.total_expected_income_rwf || 0),
          totalAllocated: Number(b.total_allocated_rwf || 0),
        })),
        budgetLineNames: [
          'School Feeding', 'Transport', 'Fuel', 'Cleaning Materials', 'Printing & Stationery',
          'Medical Expenses', 'Security', 'Internet & ICT', 'Electricity', 'Water', 'Insurance', 'Emergency Fund',
          'Teacher Salaries', 'Staff Salaries', 'Library', 'Laboratory', 'Examinations', 'Sports',
          'Training & Workshops', 'Academic Materials', 'Construction', 'Furniture', 'Maintenance',
          'School Renovation', 'ICT Equipment', 'Vehicle Maintenance', 'Other',
        ],
        budgetCategories: ['Operations', 'Academic', 'Infrastructure', 'Utilities', 'Transport', 'ICT', 'Emergency', 'Administration', 'Projects', 'Maintenance'],
        departments: ['Administration', 'Finance', 'Academics', 'ICT', 'Kitchen', 'Transport', 'Sports', 'Library', 'Security', 'Maintenance', 'Procurement', 'Boarding'],
        priorityLevels: BUDGET_LINE_PRIORITY,
        approvalStatuses: BUDGET_LINE_APPROVAL,
        expenseCategories: ['Food Purchase', 'Fuel', 'Transport', 'Maintenance', 'Utilities', 'Salaries', 'ICT Equipment', 'Medical', 'Emergency', 'Other'],
        paymentMethods: ['Cash', 'Bank Transfer', 'Mobile Money', 'Cheque', 'Credit'],
      },
    });
  } catch (e) {
    console.error('[budget-lines/options GET]:', e.message);
    res.status(500).json({ success: false, message: 'Failed to load budget line options' });
  }
});

router.get('/accountant/budget-lines/summary', requireRole(ACCOUNTANT_READ_ROLES), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const budget = await resolveActiveBudgetForLines(schoolId, req.query?.budget_id);
    if (!budget) {
      return res.json({
        success: true,
        data: {
          totalBudget: 0,
          totalUsed: 0,
          remainingBalance: 0,
          usagePct: 0,
          activeCount: 0,
          exhaustedCount: 0,
          lines: [],
        },
      });
    }
    const [lines] = await promisePool.query(
      `SELECT id, line_name_key, custom_line_name, planned_amount_rwf, used_amount_rwf, department
       FROM school_budget_lines WHERE budget_id = ? AND school_id = ? AND deleted_at IS NULL`,
      [budget.id, schoolId]
    );
    const mapped = lines.map((r) => mapBudgetLineRow(r));
    const totalLinesPlanned = mapped.reduce((s, l) => s + l.plannedAmount, 0);
    const totalUsed = mapped.reduce((s, l) => s + l.usedAmount, 0);
    const totalExpectedIncome = Number(budget.total_expected_income_rwf || 0);
    const remainingBalance = totalLinesPlanned - totalUsed;
    const unallocatedToLines = Math.max(0, totalExpectedIncome - totalLinesPlanned);
    const usagePct = totalLinesPlanned > 0 ? Math.round((totalUsed / totalLinesPlanned) * 100) : 0;
    const linesAllocationPct = totalExpectedIncome > 0 ? Math.round((totalLinesPlanned / totalExpectedIncome) * 100) : 0;
    res.json({
      success: true,
      data: {
        budgetId: budget.id,
        budgetTitle: budget.title,
        budgetCode: budget.budget_code,
        budgetStatus: budget.status,
        totalExpectedIncome,
        totalBudget: totalLinesPlanned,
        totalLinesPlanned,
        totalUsed,
        remainingBalance,
        unallocatedToLines,
        linesAllocationPct,
        usagePct,
        activeCount: mapped.filter((l) => l.statusKey === 'active').length,
        exhaustedCount: mapped.filter((l) => l.statusKey === 'exhausted').length,
        warningCount: mapped.filter((l) => ['warning', 'critical'].includes(l.statusKey)).length,
        lines: mapped,
      },
    });
  } catch (e) {
    console.error('[budget-lines/summary GET]:', e.message);
    res.status(500).json({ success: false, message: 'Failed to load budget summary' });
  }
});

router.get('/accountant/budget-lines', requireRole(ACCOUNTANT_READ_ROLES), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const budgetId = Number(req.query?.budget_id);
    const where = ['school_id = ?', 'deleted_at IS NULL'];
    const params = [schoolId];
    if (budgetId) {
      where.push('budget_id = ?');
      params.push(budgetId);
    }
    const [rows] = await promisePool.query(
      `SELECT * FROM school_budget_lines WHERE ${where.join(' AND ')} ORDER BY id DESC`,
      params
    );
    res.json({ success: true, data: rows.map(mapBudgetLineRow) });
  } catch (e) {
    console.error('[budget-lines GET]:', e.message);
    res.status(500).json({ success: false, message: 'Failed to load budget lines' });
  }
});

router.post('/accountant/budget-lines', requireRole(ACCOUNTANT_WRITE_ROLES), async (req, res) => {
  try {
    const { schoolId, userId } = req.ctx;
    const p = req.body || {};
    const budgetId = Number(p.budgetId || p.budget_id);
    const lineName = String(p.lineName || p.line_name || '').trim();
    const isOther = lineName.toLowerCase() === 'other';
    const customName = isOther ? String(p.customLineName || p.custom_line_name || '').trim() : '';
    const planned = toMoney(p.plannedAmount ?? p.planned_amount_rwf);
    const category = String(p.budgetCategory || p.budget_category || '').trim();
    const department = String(p.department || '').trim();
    const priority = String(p.priorityLevel || p.priority_level || 'Medium').trim();

    if (!budgetId) return res.status(400).json({ success: false, message: 'School budget is required' });
    if (!lineName) return res.status(400).json({ success: false, message: 'Budget line name is required' });
    if (isOther && !customName) return res.status(400).json({ success: false, message: 'Custom budget line name is required' });
    if (planned <= 0) return res.status(400).json({ success: false, message: 'Planned amount must be greater than zero' });

    const budget = await resolveActiveBudgetForLines(schoolId, budgetId);
    if (!budget) return res.status(404).json({ success: false, message: 'School budget not found' });

    const [[allocRow]] = await promisePool.query(
      `SELECT COALESCE(SUM(planned_amount_rwf), 0) AS allocated
       FROM school_budget_lines WHERE budget_id = ? AND school_id = ? AND deleted_at IS NULL`,
      [budgetId, schoolId]
    );
    const alreadyAllocated = Number(allocRow?.allocated || 0);
    const totalBudget = Number(budget.total_expected_income_rwf || 0);
    const remaining = totalBudget - alreadyAllocated;
    if (planned > remaining && totalBudget > 0) {
      return res.status(400).json({
        success: false,
        message: `This allocation exceeds remaining balance (${remaining.toLocaleString()} RWF available)`,
      });
    }

    let preparedName = String(p.preparedByName || p.prepared_by_name || '').trim() || null;
    if (!preparedName) {
      const [[u]] = await promisePool.query(
        `SELECT TRIM(CONCAT(COALESCE(first_name,''), ' ', COALESCE(last_name,''))) AS full_name FROM users WHERE id = ? LIMIT 1`,
        [userId]
      );
      preparedName = u?.full_name || null;
    }

    const [ins] = await promisePool.query(
      `INSERT INTO school_budget_lines
       (school_id, budget_id, created_by_user_id, line_name_key, custom_line_name, budget_category, department,
        priority_level, planned_amount_rwf, allocation_date, description, notes, reference_number,
        prepared_by_name, reviewed_by_name, approval_status, approval_notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        schoolId, budgetId, userId, isOther ? 'other' : lineName, isOther ? customName : null,
        category || 'Operations', department || 'Administration',
        BUDGET_LINE_PRIORITY.includes(priority) ? priority : 'Medium', planned,
        parseBudgetDateOrNull(p.allocationDate || p.allocation_date),
        String(p.description || '').trim() || null,
        String(p.notes || '').trim() || null,
        String(p.referenceNumber || p.reference_number || '').trim() || null,
        preparedName,
        String(p.reviewedByName || p.reviewed_by_name || '').trim() || null,
        BUDGET_LINE_APPROVAL.includes(String(p.approvalStatus || 'Pending')) ? String(p.approvalStatus || 'Pending') : 'Pending',
        String(p.approvalNotes || p.approval_notes || '').trim() || null,
      ]
    );

    const newAllocated = alreadyAllocated + planned;
    await promisePool.query(
      `UPDATE school_budgets SET total_allocated_rwf = ? WHERE id = ? AND school_id = ?`,
      [newAllocated, budgetId, schoolId]
    );

    res.status(201).json({
      success: true,
      message: 'Budget line successfully created',
      id: ins.insertId,
    });
  } catch (e) {
    console.error('[budget-lines POST]:', e.message);
    res.status(500).json({ success: false, message: e.message || 'Failed to create budget line' });
  }
});

router.post('/accountant/budget-line-usage', requireRole(ACCOUNTANT_WRITE_ROLES), async (req, res) => {
  try {
    const { schoolId, userId } = req.ctx;
    const p = req.body || {};
    const lineId = Number(p.budgetLineId || p.budget_line_id);
    const amount = toMoney(p.usageAmount ?? p.usage_amount_rwf);
    if (!lineId) return res.status(400).json({ success: false, message: 'Budget line is required' });
    if (amount <= 0) return res.status(400).json({ success: false, message: 'Usage amount must be greater than zero' });

    const [[line]] = await promisePool.query(
      `SELECT id, planned_amount_rwf, used_amount_rwf, line_name_key, custom_line_name
       FROM school_budget_lines WHERE id = ? AND school_id = ? AND deleted_at IS NULL LIMIT 1`,
      [lineId, schoolId]
    );
    if (!line) return res.status(404).json({ success: false, message: 'Budget line not found' });

    const planned = Number(line.planned_amount_rwf || 0);
    const used = Number(line.used_amount_rwf || 0);
    if (used + amount > planned) {
      return res.status(400).json({ success: false, message: 'Usage amount exceeds remaining budget for this line' });
    }

    const usageDate = parseBudgetDateOrNull(p.usageDate || p.usage_date) || new Date();

    await promisePool.query(
      `INSERT INTO school_budget_line_usage
       (school_id, budget_line_id, created_by_user_id, usage_amount_rwf, usage_date, expense_category, payment_method, description, receipt_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        schoolId, lineId, userId, amount, usageDate,
        String(p.expenseCategory || '').trim() || null,
        String(p.paymentMethod || '').trim() || null,
        String(p.description || '').trim() || null,
        String(p.receiptName || p.receipt_name || '').trim() || null,
      ]
    );

    const newUsed = used + amount;
    await promisePool.query(
      `UPDATE school_budget_lines SET used_amount_rwf = ? WHERE id = ? AND school_id = ?`,
      [newUsed, lineId, schoolId]
    );

    const usagePct = planned > 0 ? Math.round((newUsed / planned) * 100) : 0;
    const lineLabel = line.custom_line_name || line.line_name_key;
    let notify = null;
    if (usagePct >= 100) notify = `${lineLabel} budget line has been fully used.`;
    else if (usagePct >= 90) notify = `${lineLabel} budget is almost exhausted (${usagePct}%).`;
    else if (usagePct >= 80) notify = `${lineLabel} budget has reached ${usagePct}% usage.`;

    if (notify) {
      notifyBudgetSchoolRoles(schoolId, ['SCHOOL_MANAGER', 'SCHOOL_ADMIN'], {
        title: usagePct >= 100 ? 'Budget line exhausted' : 'Budget usage alert',
        body: notify,
        tag: `budget-line-${lineId}-${usagePct >= 100 ? 'exhausted' : 'warning'}`,
        url: '/manager/finance/budgets',
      });
    }
    if (amount >= BUDGET_LARGE_EXPENSE_RWF) {
      const amtLabel = new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF', maximumFractionDigits: 0 }).format(amount);
      notifyBudgetSchoolRoles(schoolId, ['SCHOOL_MANAGER', 'SCHOOL_ADMIN', 'ACCOUNTANT'], {
        title: 'Large budget expense',
        body: `${amtLabel} recorded on ${lineLabel}.`,
        tag: `budget-large-${lineId}-${Date.now()}`,
        url: '/manager/finance/budgets',
      });
    }

    res.status(201).json({
      success: true,
      message: 'Budget usage registered',
      notification: notify,
      usagePct,
      remaining: planned - newUsed,
    });
  } catch (e) {
    console.error('[budget-line-usage POST]:', e.message);
    res.status(500).json({ success: false, message: 'Failed to register budget usage' });
  }
});

router.get('/accountant/budget-line-usage', requireRole(ACCOUNTANT_READ_ROLES), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const lineId = Number(req.query?.budget_line_id);
    const budgetIdQ = Number(req.query?.budget_id);
    const where = ['u.school_id = ?', 'l.deleted_at IS NULL'];
    const params = [schoolId];
    if (lineId) {
      where.push('u.budget_line_id = ?');
      params.push(lineId);
    }
    if (budgetIdQ) {
      where.push('l.budget_id = ?');
      params.push(budgetIdQ);
    }
    const [rows] = await promisePool.query(
      `SELECT u.id, u.budget_line_id, u.usage_amount_rwf, u.usage_date, u.expense_category, u.payment_method,
              u.description, u.receipt_name, u.created_at,
              l.line_name_key, l.custom_line_name
       FROM school_budget_line_usage u
       JOIN school_budget_lines l ON l.id = u.budget_line_id
       WHERE ${where.join(' AND ')}
       ORDER BY u.id DESC LIMIT 100`,
      params
    );
    res.json({
      success: true,
      data: rows.map((r) => ({
        id: r.id,
        budgetLineId: r.budget_line_id,
        lineName: String(r.line_name_key).toLowerCase() === 'other' ? r.custom_line_name : r.line_name_key,
        usageAmount: Number(r.usage_amount_rwf || 0),
        usageDate: r.usage_date,
        expenseCategory: r.expense_category,
        paymentMethod: r.payment_method,
        description: r.description,
        receiptName: r.receipt_name,
        createdAt: r.created_at,
      })),
    });
  } catch (e) {
    console.error('[budget-line-usage GET]:', e.message);
    res.status(500).json({ success: false, message: 'Failed to load usage history' });
  }
});

router.patch('/accountant/school-budgets/:id/review', requireRole(['SCHOOL_MANAGER', 'SCHOOL_ADMIN', 'SUPER_ADMIN', 'FULL_SYSTEM_CONTROLLER']), async (req, res) => {
  try {
    const { schoolId, userId, roleCode } = req.ctx;
    const id = Number(req.params.id);
    const decision = String(req.body?.decision || req.body?.approvalDecision || '').trim().toLowerCase();
    const notes = String(req.body?.approvalNotes || req.body?.notes || '').trim();
    const decisionMap = { approve: 'approved', approved: 'approved', reject: 'rejected', rejected: 'rejected', cancel: 'closed', cancelled: 'closed', closed: 'closed', 'request revision': 'rejected', revision: 'rejected' };
    const finalStatus = decisionMap[decision];
    if (!finalStatus) return res.status(400).json({ success: false, message: 'Invalid decision' });
    if ((finalStatus === 'rejected' || finalStatus === 'closed') && !notes) {
      return res.status(400).json({ success: false, message: 'Notes required for reject/cancel' });
    }
    const [[existing]] = await promisePool.query(
      `SELECT id, status, title, budget_code, created_by_user_id FROM school_budgets WHERE id = ? AND school_id = ? AND deleted_at IS NULL LIMIT 1`,
      [id, schoolId]
    );
    if (!existing) return res.status(404).json({ success: false, message: 'Budget not found' });
    const returnToDraft = decision === 'request revision' || decision === 'revision';
    const newStatus = returnToDraft ? 'draft' : finalStatus;
    await promisePool.query(
      `UPDATE school_budgets SET status = ?, manager_review_notes = ?, manager_reviewed_by_user_id = ?, manager_reviewed_at = NOW() WHERE id = ? AND school_id = ?`,
      [newStatus, notes || null, userId, id, schoolId]
    );
    await appendAuditLog({ schoolId, userId, roleCode, endpoint: '/accountant/school-budgets/:id/review', entityType: 'school_budget', entityId: id, action: decision, afterState: { status: newStatus } });

    const bLabel = `${existing.title || 'Budget'}${existing.budget_code ? ` (${existing.budget_code})` : ''}`;
    let pushTitle = 'Budget updated';
    let pushBody = bLabel;
    if (returnToDraft) {
      pushTitle = 'Budget returned for revision';
      pushBody = `${bLabel} needs changes.${notes ? ` Note: ${notes}` : ''}`;
    } else if (newStatus === 'approved') {
      pushTitle = 'Budget approved';
      pushBody = `${bLabel} was approved. You can activate budget lines.`;
    } else if (newStatus === 'rejected') {
      pushTitle = 'Budget rejected';
      pushBody = `${bLabel} was rejected.${notes ? ` Reason: ${notes}` : ''}`;
    } else if (newStatus === 'closed') {
      pushTitle = 'Budget cancelled';
      pushBody = `${bLabel} was cancelled.${notes ? ` Note: ${notes}` : ''}`;
    }
    notifyBudgetUser(Number(existing.created_by_user_id), {
      title: pushTitle,
      body: pushBody,
      tag: `budget-review-${id}-${newStatus}`,
      url: '/accountant/school-budget',
    });

    res.json({ success: true, message: returnToDraft ? 'Budget returned for revision' : finalStatus === 'approved' ? 'Budget approved' : finalStatus === 'rejected' ? 'Budget rejected' : 'Budget cancelled' });
  } catch (e) {
    console.error('[school-budgets/:id/review PATCH]:', e.message);
    res.status(500).json({ success: false, message: 'Failed to review budget' });
  }
});

router.patch('/accountant/budget-lines/:id/freeze', requireRole(['SCHOOL_MANAGER', 'SCHOOL_ADMIN', 'SUPER_ADMIN', 'FULL_SYSTEM_CONTROLLER']), async (req, res) => {
  try {
    const { schoolId, userId, roleCode } = req.ctx;
    const id = Number(req.params.id);
    const freeze = Boolean(req.body?.freeze ?? req.body?.is_frozen ?? true);
    const [[row]] = await promisePool.query(`SELECT id FROM school_budget_lines WHERE id = ? AND school_id = ? AND deleted_at IS NULL LIMIT 1`, [id, schoolId]);
    if (!row) return res.status(404).json({ success: false, message: 'Budget line not found' });
    await promisePool.query(`UPDATE school_budget_lines SET is_frozen = ? WHERE id = ? AND school_id = ?`, [freeze ? 1 : 0, id, schoolId]);
    await appendAuditLog({ schoolId, userId, roleCode, endpoint: '/accountant/budget-lines/:id/freeze', entityType: 'school_budget_line', entityId: id, action: freeze ? 'freeze' : 'unfreeze' });
    res.json({ success: true, message: freeze ? 'Budget line frozen' : 'Budget line unfrozen' });
  } catch (e) {
    console.error('[budget-lines/:id/freeze PATCH]:', e.message);
    res.status(500).json({ success: false, message: 'Failed to update budget line' });
  }
});

// -------------------- Portal Web Push (budget & school alerts) --------------------
const PORTAL_PUSH_ROLES = [...ALL_SCHOOL_ROLES];

router.get('/portal/push/vapid-key', requireRole(PORTAL_PUSH_ROLES), (req, res) => {
  const ok = isWebPushConfigured();
  const publicKey = getVapidPublicKey();
  res.json({
    success: ok && !!publicKey,
    configured: ok && !!publicKey,
    publicKey: ok ? publicKey : null,
    message: ok ? undefined : 'Web Push is not configured (set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY)',
  });
});

router.post('/portal/push/subscribe', requireRole(PORTAL_PUSH_ROLES), async (req, res) => {
  try {
    if (!isWebPushConfigured()) {
      return res.status(503).json({ success: false, message: 'Web Push is not configured on this server' });
    }
    await upsertSubscription(req.ctx.userId, req.body);
    res.json({ success: true, message: 'Push subscription saved' });
  } catch (error) {
    console.error('[portal/push/subscribe]:', error.message);
    const status = error.status === 400 ? 400 : 500;
    res.status(status).json({ success: false, message: error.message || 'Failed to save subscription' });
  }
});

router.post('/portal/push/unsubscribe', requireRole(PORTAL_PUSH_ROLES), async (req, res) => {
  try {
    await removeSubscription(req.ctx.userId, req.body?.endpoint);
    res.json({ success: true, message: 'Subscription removed' });
  } catch (error) {
    console.error('[portal/push/unsubscribe]:', error.message);
    res.status(500).json({ success: false, message: 'Failed to remove subscription' });
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

router.use(require('./actionPlanRoutes'));
router.use(require('./accountantReminders'));

module.exports = router;
