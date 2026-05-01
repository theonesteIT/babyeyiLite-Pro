// ================================================================
// parentPortal.js — Parent portal (phone + password, session cookie)
//
// Uses `students.father_phone` / `students.mother_phone` (see students.js)
// and table `parent_portal_accounts` for credentials.
//
// POST /api/parent-portal/check-phone
// POST /api/parent-portal/register
// POST /api/parent-portal/login
// GET  /api/parent-portal/children   (session)
//
// Guest Babyeyi Finder (no login — same as /api/public/student-code-lookup; accepts student UID, student_code, or sdm_code):
// POST /api/parent-portal/public/babyeyi-finder/student-lookup
// ================================================================

const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const nodemailer = require('nodemailer');
const { promisePool } = require('../config/database');
const { requireRole } = require('../middleware/deoAuth');
const { getBabyeyiFinderDiscoveryPayload } = require('./babyeyiFinderDiscovery');
const { applyRememberMeToSession } = require('../utils/sessionRememberMe');

const router = express.Router();
router.use((req, res, next) => {
  // Parent portal screens need fresh payloads while switching students/filters.
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

const checkPhoneLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests — try again later' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 25,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts — try again later' },
});

const phoneResetRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many reset requests — try again later' },
});
const SQL_JOIN_STUDENT_REQ_BY_ITEM = `LEFT JOIN student_requirements sr ON CONVERT(TRIM(LOWER(sr.name)) USING utf8mb4) COLLATE utf8mb4_unicode_ci = CONVERT(TRIM(LOWER(bsr.item)) USING utf8mb4) COLLATE utf8mb4_unicode_ci`;

function trimStr(v) {
  if (v === undefined || v === null) return '';
  return String(v).trim();
}

function yearMatchesRow(rowYear, inputLabel) {
  const a = rowYear === null || rowYear === undefined ? '' : String(rowYear);
  const b = trimStr(inputLabel);
  if (!b) return true;
  if (a === b) return true;
  const num = parseInt(a, 10);
  if (!Number.isNaN(num) && b.startsWith(String(num))) return true;
  if (b.includes('-')) {
    const first = b.split('-')[0];
    if (a === first) return true;
  }
  return false;
}

function classMatchesBabyeyi(row, className) {
  const c = trimStr(className);
  if (!c) return false;
  const primary = trimStr(row.class_name);
  if (primary && primary.toLowerCase() === c.toLowerCase()) return true;
  try {
    const arr = typeof row.classes_json === 'string' ? JSON.parse(row.classes_json) : row.classes_json;
    if (Array.isArray(arr)) {
      return arr.some((x) => String(x).trim().toLowerCase() === c.toLowerCase());
    }
  } catch (_) {}
  return false;
}

/** Same rules as students.js normalizePhone (Rwanda mobiles). */
function normalizePhone(raw) {
  if (!raw) return null;
  let v = String(raw).replace(/[\s\-().]/g, '');
  v = v.replace(/[^\d+]/g, '');
  if (v.startsWith('+250')) v = '0' + v.slice(4);
  else if (v.startsWith('250') && v.length === 12) v = '0' + v.slice(3);
  if (/^[27]\d{8}$/.test(v)) v = '0' + v;
  if (/^07[2-9]\d{7}$/.test(v)) return v;
  if (/^078\d{7}$/.test(v)) return v;
  if (/^079\d{7}$/.test(v)) return v;
  if (/^025\d{7}$/.test(v)) return v;
  return null;
}

function parseRequirementQuantity(raw) {
  if (raw == null || raw === '') return 1;
  const s = String(raw).trim();
  const m = s.match(/(\d+(?:\.\d+)?)/);
  if (m) {
    const n = parseFloat(m[1]);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 1;
}

function normalizeRecoveryEmail(raw) {
  const s = trimStr(raw).toLowerCase();
  if (!s || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return null;
  return s;
}

/** Widen students.* phone/email so multiple values can be stored (parent phone reset appends). */
async function ensureStudentContactColumnsWide() {
  await promisePool.query('ALTER TABLE students MODIFY COLUMN father_phone VARCHAR(160) NULL').catch(() => {});
  await promisePool.query('ALTER TABLE students MODIFY COLUMN mother_phone VARCHAR(160) NULL').catch(() => {});
  await promisePool.query('ALTER TABLE students MODIFY COLUMN father_email VARCHAR(255) NULL').catch(() => {});
  await promisePool.query('ALTER TABLE students MODIFY COLUMN mother_email VARCHAR(255) NULL').catch(() => {});
}

function tokenizePhonesInField(raw) {
  if (raw == null || !String(raw).trim()) return [];
  return String(raw)
    .split(/\s*[·,|/]\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function fieldContainsNormalizedPhone(field, normPhone) {
  if (!normPhone) return false;
  const raw = String(field || '').trim();
  if (!raw) return false;
  if (normalizePhone(raw) === normPhone) return true;
  return tokenizePhonesInField(raw).some((t) => normalizePhone(t) === normPhone);
}

function appendPhoneToStudentField(field, oldPhone, newPhone) {
  const oldP = normalizePhone(oldPhone);
  const newP = normalizePhone(newPhone);
  if (!newP || !oldP) return field;
  const raw = String(field || '').trim();
  if (!raw) return newP;
  if (!fieldContainsNormalizedPhone(raw, oldP)) return raw;
  const norms = tokenizePhonesInField(raw).map((t) => normalizePhone(t)).filter(Boolean);
  if (norms.includes(newP)) return raw;
  return `${raw} · ${newP}`;
}

function appendEmailToStudentField(field, addRaw) {
  const addNorm = normalizeRecoveryEmail(addRaw);
  if (!addNorm) return field;
  const display = trimStr(addRaw);
  const raw = String(field || '').trim();
  if (!raw) return display || addNorm;
  const parts = raw.split(/\s*·\s*/).map((x) => trimStr(x).toLowerCase()).filter(Boolean);
  if (parts.includes(addNorm)) return raw;
  return `${raw} · ${display || addNorm}`;
}

function primaryContactEmailForPortalSync(row) {
  const a = trimStr(row.recovery_email);
  if (a && normalizeRecoveryEmail(a)) return a;
  const b = trimStr(row.father_email);
  if (b && normalizeRecoveryEmail(b)) return b;
  const c = trimStr(row.mother_email);
  if (c && normalizeRecoveryEmail(c)) return c;
  return null;
}

/**
 * MySQL/MariaDB: match a Rwanda phone as a whole token in a column (single number or "a·b", "a · b", "a, b", …).
 * LIKE patterns miss tight "078·079" or comma-separated imports; REGEXP uses non-digit boundaries.
 */
function mysqlPhoneTokenRegexp(phoneNorm) {
  if (!phoneNorm) return null;
  const p = String(phoneNorm).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return `(^|[^0-9])${p}($|[^0-9])`;
}

/** WHERE clause: father or mother phone field contains this normalized number as one token. */
function sqlStudentMatchesParentPhoneExpr(tableAlias) {
  const fp = tableAlias ? `${tableAlias}.father_phone` : 'father_phone';
  const mp = tableAlias ? `${tableAlias}.mother_phone` : 'mother_phone';
  return `(
    (${fp} IS NOT NULL AND TRIM(${fp}) <> '' AND ${fp} REGEXP ?)
    OR (${mp} IS NOT NULL AND TRIM(${mp}) <> '' AND ${mp} REGEXP ?)
  )`;
}

/** Two bindings: same REGEXP pattern for father and mother columns. */
function bindParentPhoneMatchParams(phoneNorm) {
  const r = mysqlPhoneTokenRegexp(phoneNorm);
  return [r, r];
}

function studentRowOwnedByPhone(row, phoneNorm) {
  if (!row || !phoneNorm) return false;
  return (
    fieldContainsNormalizedPhone(row.father_phone, phoneNorm) ||
    fieldContainsNormalizedPhone(row.mother_phone, phoneNorm)
  );
}

function hashPhoneResetToken(plain) {
  return crypto.createHash('sha256').update(String(plain), 'utf8').digest('hex');
}

let parentMailer = null;
function getParentMailer() {
  if (parentMailer !== null) return parentMailer;
  if (!process.env.SMTP_USER) {
    parentMailer = false;
    return null;
  }
  parentMailer = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return parentMailer;
}

async function sendParentPortalEmail({ to, subject, text }) {
  const from = process.env.SMTP_FROM || `"Babyeyi" <${process.env.SMTP_USER}>`;
  const transport = getParentMailer();
  if (!transport) {
    console.warn('[parent-portal/email] SMTP_USER not set — email not sent. Body preview:', subject);
    return false;
  }
  try {
    await transport.sendMail({ from, to, subject, text });
    return true;
  } catch (err) {
    console.error('[parent-portal/email]', err.message);
    return false;
  }
}

let tableReady = false;
let tablePromise = null;
let accessTableReady = false;
let accessTablePromise = null;
let accessLogTableReady = false;
let accessLogTablePromise = null;
let accessRequestTableReady = false;
let accessRequestTablePromise = null;
let parentNotificationTableReady = false;
let parentNotificationTablePromise = null;
let shulecardTableReady = false;
let shulecardTablePromise = null;
let loanRepayTableReady = false;
let loanRepayTablePromise = null;

async function ensureParentPortalTable() {
  if (tableReady) return;
  if (tablePromise) return tablePromise;
  tablePromise = (async () => {
    await promisePool.query(`
      CREATE TABLE IF NOT EXISTS parent_portal_accounts (
        id                  INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        phone               VARCHAR(30)  NOT NULL,
        password_hash       VARCHAR(255) NOT NULL,
        father_full_name    VARCHAR(150) NULL,
        mother_full_name    VARCHAR(150) NULL,
        father_email        VARCHAR(150) NULL,
        mother_email        VARCHAR(150) NULL,
        created_via_phone_only TINYINT(1) NOT NULL DEFAULT 0,
        completed_registration_at DATETIME NULL,
        created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_parent_portal_phone (phone),
        KEY idx_parent_portal_phone (phone)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await promisePool.query('ALTER TABLE parent_portal_accounts ADD COLUMN created_via_phone_only TINYINT(1) NOT NULL DEFAULT 0').catch(() => {});
    await promisePool.query('ALTER TABLE parent_portal_accounts ADD COLUMN completed_registration_at DATETIME NULL').catch(() => {});
    await promisePool.query('ALTER TABLE parent_portal_accounts ADD COLUMN recovery_email VARCHAR(150) NULL').catch(() => {});
    await promisePool.query('ALTER TABLE parent_portal_accounts ADD COLUMN phone_reset_token_hash CHAR(64) NULL').catch(() => {});
    await promisePool.query('ALTER TABLE parent_portal_accounts ADD COLUMN phone_reset_expires_at DATETIME NULL').catch(() => {});
    await promisePool.query('ALTER TABLE parent_portal_accounts ADD KEY idx_parent_recovery_email (recovery_email)').catch(() => {});
    tableReady = true;
  })();
  try {
    await tablePromise;
  } finally {
    tablePromise = null;
  }
}

async function ensureStudentAccessTable() {
  if (accessTableReady) return;
  if (accessTablePromise) return accessTablePromise;
  accessTablePromise = (async () => {
    await promisePool.query(`
      CREATE TABLE IF NOT EXISTS student_access (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        parent_portal_account_id INT UNSIGNED NULL,
        parent_phone VARCHAR(30) NOT NULL,
        student_id INT UNSIGNED NOT NULL,
        access_type ENUM('FULL','LIMITED') NOT NULL DEFAULT 'LIMITED',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_parent_student (parent_phone, student_id),
        KEY idx_parent_student_account (parent_portal_account_id),
        KEY idx_parent_student_student (student_id),
        KEY idx_parent_student_type (access_type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await promisePool.query('ALTER TABLE student_access ADD COLUMN parent_portal_account_id INT UNSIGNED NULL').catch(() => {});
    accessTableReady = true;
  })();
  try {
    await accessTablePromise;
  } finally {
    accessTablePromise = null;
  }
}

async function ensureParentAccessLogTable() {
  if (accessLogTableReady) return;
  if (accessLogTablePromise) return accessLogTablePromise;
  accessLogTablePromise = (async () => {
    await promisePool.query(`
      CREATE TABLE IF NOT EXISTS parent_student_activity_logs (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        parent_portal_account_id INT UNSIGNED NULL,
        parent_phone VARCHAR(30) NOT NULL,
        student_id INT UNSIGNED NOT NULL,
        access_type ENUM('FULL','LIMITED') NOT NULL DEFAULT 'LIMITED',
        action_type VARCHAR(80) NOT NULL,
        endpoint VARCHAR(160) NULL,
        payload_json LONGTEXT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY idx_psal_parent_phone (parent_phone),
        KEY idx_psal_student (student_id),
        KEY idx_psal_access_type (access_type),
        KEY idx_psal_action_type (action_type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    accessLogTableReady = true;
  })();
  try {
    await accessLogTablePromise;
  } finally {
    accessLogTablePromise = null;
  }
}

async function ensureParentAccessRequestTable() {
  if (accessRequestTableReady) return;
  if (accessRequestTablePromise) return accessRequestTablePromise;
  accessRequestTablePromise = (async () => {
    await promisePool.query(`
      CREATE TABLE IF NOT EXISTS parent_student_access_requests (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        parent_portal_account_id INT UNSIGNED NULL,
        parent_phone VARCHAR(30) NOT NULL,
        student_id INT UNSIGNED NOT NULL,
        school_id INT UNSIGNED NULL,
        status ENUM('PENDING','APPROVED','REJECTED','CANCELLED') NOT NULL DEFAULT 'PENDING',
        purpose VARCHAR(120) NULL,
        message TEXT NULL,
        reviewed_by VARCHAR(120) NULL,
        reviewed_at DATETIME NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY idx_psar_parent_phone (parent_phone),
        KEY idx_psar_student (student_id),
        KEY idx_psar_school (school_id),
        KEY idx_psar_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    accessRequestTableReady = true;
  })();
  try {
    await accessRequestTablePromise;
  } finally {
    accessRequestTablePromise = null;
  }
}

async function ensureParentNotificationTable() {
  if (parentNotificationTableReady) return;
  if (parentNotificationTablePromise) return parentNotificationTablePromise;
  parentNotificationTablePromise = (async () => {
    await promisePool.query(`
      CREATE TABLE IF NOT EXISTS parent_portal_notifications (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        target_parent_phone VARCHAR(30) NOT NULL,
        source_parent_phone VARCHAR(30) NULL,
        student_id INT UNSIGNED NULL,
        type VARCHAR(80) NOT NULL,
        title VARCHAR(200) NOT NULL,
        body TEXT NULL,
        payload_json LONGTEXT NULL,
        read_at DATETIME NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY idx_ppn_target_phone (target_parent_phone),
        KEY idx_ppn_student (student_id),
        KEY idx_ppn_type (type),
        KEY idx_ppn_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    parentNotificationTableReady = true;
  })();
  try {
    await parentNotificationTablePromise;
  } finally {
    parentNotificationTablePromise = null;
  }
}

async function ensureShulecardTables() {
  if (shulecardTableReady) return;
  if (shulecardTablePromise) return shulecardTablePromise;
  shulecardTablePromise = (async () => {
    await promisePool.query(`
      CREATE TABLE IF NOT EXISTS parent_shulecard_wallets (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        parent_portal_account_id INT UNSIGNED NULL,
        parent_phone VARCHAR(30) NOT NULL,
        student_id INT UNSIGNED NOT NULL,
        balance_rwf DECIMAL(14,2) NOT NULL DEFAULT 0,
        daily_limit_rwf DECIMAL(14,2) NOT NULL DEFAULT 5000,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_psw_parent_student (parent_phone, student_id),
        KEY idx_psw_student (student_id),
        KEY idx_psw_parent (parent_phone)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await promisePool.query(`
      CREATE TABLE IF NOT EXISTS parent_shulecard_topups (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        parent_portal_account_id INT UNSIGNED NULL,
        parent_phone VARCHAR(30) NOT NULL,
        student_id INT UNSIGNED NOT NULL,
        amount_rwf DECIMAL(14,2) NOT NULL,
        payment_method VARCHAR(40) NOT NULL DEFAULT 'momo',
        note VARCHAR(255) NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'completed',
        reference_no VARCHAR(80) NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY idx_pst_student (student_id),
        KEY idx_pst_parent (parent_phone),
        KEY idx_pst_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await promisePool.query(`
      CREATE TABLE IF NOT EXISTS parent_shulecard_spending_events (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        student_id INT UNSIGNED NOT NULL,
        spender_phone VARCHAR(30) NULL,
        merchant_name VARCHAR(120) NULL,
        amount_rwf DECIMAL(14,2) NOT NULL,
        note VARCHAR(255) NULL,
        spent_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY idx_psse_student (student_id),
        KEY idx_psse_spent_at (spent_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    shulecardTableReady = true;
  })();
  try {
    await shulecardTablePromise;
  } finally {
    shulecardTablePromise = null;
  }
}

async function ensureLoanRepaymentTable() {
  if (loanRepayTableReady) return;
  if (loanRepayTablePromise) return loanRepayTablePromise;
  loanRepayTablePromise = (async () => {
    await promisePool.query(`
      CREATE TABLE IF NOT EXISTS babyeyi_loan_repayments (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        intent_id INT UNSIGNED NOT NULL,
        receipt_no VARCHAR(80) NULL,
        amount_rwf DECIMAL(12,2) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        paid_by_phone VARCHAR(30) NULL,
        note VARCHAR(255) NULL,
        reviewed_by VARCHAR(120) NULL,
        reviewed_at DATETIME NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_blr_receipt (receipt_no),
        KEY idx_blr_intent (intent_id),
        KEY idx_blr_phone (paid_by_phone),
        KEY idx_blr_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await promisePool.query(`ALTER TABLE babyeyi_loan_repayments ADD COLUMN receipt_no VARCHAR(80) NULL`).catch(() => {});
    await promisePool.query(`ALTER TABLE babyeyi_loan_repayments ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'pending'`).catch(() => {});
    await promisePool.query(`ALTER TABLE babyeyi_loan_repayments ADD COLUMN reviewed_by VARCHAR(120) NULL`).catch(() => {});
    await promisePool.query(`ALTER TABLE babyeyi_loan_repayments ADD COLUMN reviewed_at DATETIME NULL`).catch(() => {});
    await promisePool.query(`ALTER TABLE babyeyi_loan_repayments ADD UNIQUE KEY uq_blr_receipt (receipt_no)`).catch(() => {});
    await promisePool.query(`ALTER TABLE babyeyi_loan_repayments ADD KEY idx_blr_status (status)`).catch(() => {});
  })();
  try {
    await loanRepayTablePromise;
    loanRepayTableReady = true;
  } finally {
    loanRepayTablePromise = null;
  }
}

function resolveLoanTotalDue(intentTotal, payload = {}) {
  const due = Number(payload?.payment_plan?.loanSummary?.totalDue);
  if (Number.isFinite(due) && due > 0) return due;
  return Number(intentTotal || 0);
}

function toDateOnly(v) {
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function addMonths(d, months) {
  const x = new Date(d.getTime());
  x.setMonth(x.getMonth() + months);
  return x;
}

function diffFullMonths(from, to) {
  let m = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  if (to.getDate() < from.getDate()) m -= 1;
  return Math.max(0, m);
}

function buildLoanPlan(intentTotal, payload = {}, createdAt) {
  const baseDue = resolveLoanTotalDue(intentTotal, payload);
  const months = Math.max(1, Number(payload?.payment_plan?.loanMonths || 1));
  const extensionMonths = Math.max(0, Number(payload?.payment_plan?.extensionMonths || 0));
  const startDate = toDateOnly(createdAt) || new Date();
  const dueDate = addMonths(startDate, months + extensionMonths);
  const now = new Date();
  const overdueMonths = now > dueDate ? diffFullMonths(dueDate, now) : 0;
  const overdueRateMonthly = 0.02;
  const overdueExtra = Math.round((baseDue * overdueRateMonthly * overdueMonths) * 100) / 100;
  const totalDue = Math.round((baseDue + overdueExtra) * 100) / 100;
  return {
    base_due_rwf: baseDue,
    months,
    extension_months: extensionMonths,
    due_date: dueDate,
    overdue_months: overdueMonths,
    overdue_extra_rwf: overdueExtra,
    total_due_rwf: totalDue,
    monthly_installment_rwf: Math.round((totalDue / months) * 100) / 100,
  };
}

function makeReceiptNo(intentId) {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `RCP-${y}${m}${day}-${intentId}-${rand}`;
}

async function phoneExistsInStudents(normalized) {
  if (!normalized) return false;
  const where = sqlStudentMatchesParentPhoneExpr('');
  const [rows] = await promisePool.query(
    `SELECT id, father_phone, mother_phone FROM students WHERE ${where}`,
    bindParentPhoneMatchParams(normalized)
  );
  return (rows || []).some((r) => studentRowOwnedByPhone(r, normalized));
}

/** Find one student row by Babyeyi student UID, official student_code, or SDM ID (sdm_code). */
async function findStudentRowByCode(raw) {
  const code = String(raw || '').trim();
  if (!code || code.length < 2) return null;
  const upper = code.toUpperCase();
  const [rows] = await promisePool.query(
    `SELECT s.id, s.school_id, s.student_uid, s.student_code, s.sdm_code, s.father_phone, s.mother_phone,
            s.first_name, s.last_name, s.class_name, s.academic_year,
            s.province, s.district, s.sector, s.father_email, s.mother_email,
            sc.school_name, sc.school_code,
            (SELECT m.slug FROM school_mini_websites m
             WHERE m.school_id = s.school_id AND m.status = 'published'
             ORDER BY m.id DESC LIMIT 1) AS mini_website_slug
     FROM students s
     LEFT JOIN schools sc ON sc.id = s.school_id
     WHERE TRIM(UPPER(s.student_uid)) = ?
        OR TRIM(s.student_uid) = ?
        OR (s.student_code IS NOT NULL AND TRIM(s.student_code) = ?)
        OR (s.sdm_code IS NOT NULL AND TRIM(UPPER(s.sdm_code)) = ?)
     ORDER BY s.id ASC
     LIMIT 1`,
    [upper, code, code, upper]
  );
  return rows[0] || null;
}

function phoneSlotEmpty(v) {
  return v == null || !String(v).trim();
}

function buildParentSessionUser(row) {
  const phone = normalizePhone(row.phone) || trimStr(row.phone) || row.phone;
  const display =
    row.father_full_name && row.mother_full_name
      ? `${row.father_full_name} & ${row.mother_full_name}`
      : row.father_full_name || row.mother_full_name || 'Parent';
  return {
    id: row.id,
    parent_portal_id: row.id,
    email: row.father_email || row.mother_email || null,
    first_name: row.father_full_name || row.mother_full_name || 'Parent',
    last_name: '',
    full_name: display,
    photo: null,
    role: { code: 'PARENT', name: 'Parent' },
    parent_phone: phone,
    father_full_name: row.father_full_name || null,
    mother_full_name: row.mother_full_name || null,
    father_email: row.father_email || null,
    mother_email: row.mother_email || null,
    recovery_email: row.recovery_email || null,
    school: null,
    school_id: null,
    force_password_change: false,
    phone_only_registration_required: false,
  };
}

function buildParentSessionUserFromStudentPhone(phone, profileRow) {
  const fatherName = profileRow?.father_full_name || null;
  const motherName = profileRow?.mother_full_name || null;
  const display =
    fatherName && motherName
      ? `${fatherName} & ${motherName}`
      : fatherName || motherName || 'Parent';
  return {
    id: `parent-phone:${phone}`,
    parent_portal_id: null,
    email: profileRow?.father_email || profileRow?.mother_email || null,
    first_name: fatherName || motherName || 'Parent',
    last_name: '',
    full_name: display,
    photo: null,
    role: { code: 'PARENT', name: 'Parent' },
    parent_phone: phone,
    father_full_name: fatherName,
    mother_full_name: motherName,
    father_email: profileRow?.father_email || null,
    mother_email: profileRow?.mother_email || null,
    school: null,
    school_id: null,
    force_password_change: false,
    phone_only_registration_required: true,
  };
}

async function upsertStudentAccess({ parentPortalAccountId, parentPhone, studentId, accessType }) {
  await ensureStudentAccessTable();
  await promisePool.query(
    `INSERT INTO student_access (parent_portal_account_id, parent_phone, student_id, access_type)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       parent_portal_account_id = VALUES(parent_portal_account_id),
       access_type = VALUES(access_type),
       updated_at = CURRENT_TIMESTAMP`,
    [parentPortalAccountId || null, parentPhone, studentId, accessType]
  );
}

async function logParentStudentAction({
  parentPortalAccountId,
  parentPhone,
  studentId,
  accessType,
  actionType,
  endpoint,
  payload,
}) {
  await ensureParentAccessLogTable();
  await promisePool.query(
    `INSERT INTO parent_student_activity_logs
      (parent_portal_account_id, parent_phone, student_id, access_type, action_type, endpoint, payload_json)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      parentPortalAccountId || null,
      parentPhone,
      studentId,
      accessType || 'LIMITED',
      String(actionType || '').slice(0, 80) || 'unknown_action',
      endpoint ? String(endpoint).slice(0, 160) : null,
      payload ? JSON.stringify(payload) : null,
    ]
  );
}

async function resolveParentStudentAccess(parentPhone, studentId) {
  const [rows] = await promisePool.query(
    `SELECT s.id, s.first_name, s.last_name, s.school_id, s.class_name, s.father_phone, s.mother_phone, sc.school_name,
            sa.access_type
     FROM students s
     LEFT JOIN schools sc ON sc.id = s.school_id
     LEFT JOIN student_access sa ON sa.student_id = s.id AND sa.parent_phone = ?
     WHERE s.id = ?
     LIMIT 1`,
    [parentPhone, studentId]
  );
  const st = rows?.[0];
  if (!st) return null;
  const official = studentRowOwnedByPhone(st, parentPhone);
  const accessType = official ? 'FULL' : (st.access_type || null);
  if (!accessType) return null;
  return { ...st, access_type: accessType, officially_linked: official };
}

async function resolveParentStudentAccessByRef(parentPhone, studentRefRaw) {
  const studentRef = String(studentRefRaw || '').trim();
  if (!studentRef) return null;
  const [rows] = await promisePool.query(
    `SELECT s.id, s.student_code, s.student_uid, s.sdm_code, s.first_name, s.last_name, s.school_id, s.class_name,
            s.father_phone, s.mother_phone, sc.school_name, sa.access_type
     FROM students s
     LEFT JOIN schools sc ON sc.id = s.school_id
     LEFT JOIN student_access sa ON sa.student_id = s.id AND sa.parent_phone = ?
     WHERE CAST(s.id AS CHAR) = ? OR s.student_code = ? OR s.student_uid = ? OR s.sdm_code = ?
     ORDER BY CASE WHEN CAST(s.id AS CHAR) = ? THEN 0 WHEN s.student_code = ? THEN 1 WHEN s.student_uid = ? THEN 2 ELSE 3 END
     LIMIT 20`,
    [parentPhone, studentRef, studentRef, studentRef, studentRef, studentRef, studentRef, studentRef]
  );
  for (const st of rows || []) {
    const official = studentRowOwnedByPhone(st, parentPhone);
    const accessType = official ? 'FULL' : (st.access_type || null);
    if (!accessType) continue;
    return { ...st, access_type: accessType, officially_linked: official };
  }
  return null;
}

// ── POST /api/parent-portal/check-phone ─────────────────────────
router.post('/parent-portal/check-phone', checkPhoneLimiter, async (req, res) => {
  try {
    await ensureParentPortalTable();
    const raw = req.body?.phone;
    const phone = normalizePhone(raw);
    if (!phone) {
      return res.status(400).json({ success: false, message: 'Enter a valid Rwanda phone number' });
    }
    const [[acct]] = await promisePool.query(
      'SELECT id FROM parent_portal_accounts WHERE phone = ? LIMIT 1',
      [phone]
    );
    const inStudents = await phoneExistsInStudents(phone);
    return res.json({
      success: true,
      phone,
      inStudents,
      hasPortalAccount: !!acct,
    });
  } catch (err) {
    console.error('[parent-portal/check-phone]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── Self-service phone reset (recovery email) ───────────────────
// POST /api/parent-portal/request-phone-reset
router.post('/parent-portal/request-phone-reset', phoneResetRequestLimiter, async (req, res) => {
  try {
    await ensureParentPortalTable();
    const email = normalizeRecoveryEmail(req.body?.email);
    if (!email) {
      return res.status(400).json({ success: false, message: 'Enter a valid email address' });
    }
    const [rows] = await promisePool.query(
      `SELECT id, phone FROM parent_portal_accounts
       WHERE (recovery_email IS NOT NULL AND LOWER(TRIM(recovery_email)) = ?)
          OR (recovery_email IS NULL AND father_email IS NOT NULL AND LOWER(TRIM(father_email)) = ?)
          OR (recovery_email IS NULL AND mother_email IS NOT NULL AND LOWER(TRIM(mother_email)) = ?)`,
      [email, email, email]
    );
    const genericOk = {
      success: true,
      message:
        'If this email is on a parent account with recovery enabled, you will receive instructions shortly.',
    };
    if (!rows?.length) {
      return res.json(genericOk);
    }
    if (rows.length > 1) {
      console.warn('[parent-portal/request-phone-reset] multiple accounts for email', email);
    }
    const account = rows[0];
    const plainToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashPhoneResetToken(plainToken);
    const expires = new Date(Date.now() + 60 * 60 * 1000);
    await promisePool.query(
      `UPDATE parent_portal_accounts
       SET phone_reset_token_hash = ?, phone_reset_expires_at = ?
       WHERE id = ?`,
      [tokenHash, expires, account.id]
    );
    const base = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
    const link = `${base}/parents/reset-phone?token=${encodeURIComponent(plainToken)}`;
    const sent = await sendParentPortalEmail({
      to: email,
      subject: 'Babyeyi — reset your parent portal phone number',
      text: `You asked to change the phone number for your Babyeyi parent account.

Open this link within 1 hour to choose a new Rwanda mobile number and a new password:

${link}

If you did not request this, ignore this email. Your account will stay unchanged.

— Babyeyi`,
    });
    if (!sent && process.env.NODE_ENV !== 'production') {
      console.warn('[parent-portal/request-phone-reset] dev link (email not sent):', link);
    }
    return res.json(genericOk);
  } catch (err) {
    console.error('[parent-portal/request-phone-reset]', err);
    return res.status(500).json({ success: false, message: 'Could not process request' });
  }
});

// GET /api/parent-portal/phone-reset/validate?token=
router.get('/parent-portal/phone-reset/validate', checkPhoneLimiter, async (req, res) => {
  try {
    await ensureParentPortalTable();
    const plain = String(req.query?.token || '').trim();
    if (!plain || plain.length < 20) {
      return res.json({ success: true, valid: false });
    }
    const h = hashPhoneResetToken(plain);
    const [[row]] = await promisePool.query(
      `SELECT id FROM parent_portal_accounts
       WHERE phone_reset_token_hash = ?
         AND phone_reset_expires_at IS NOT NULL
         AND phone_reset_expires_at > NOW()
       LIMIT 1`,
      [h]
    );
    return res.json({ success: true, valid: !!row });
  } catch (err) {
    console.error('[parent-portal/phone-reset/validate]', err);
    return res.status(500).json({ success: false, message: 'Validation failed' });
  }
});

// POST /api/parent-portal/complete-phone-reset
router.post('/parent-portal/complete-phone-reset', authLimiter, async (req, res) => {
  try {
    await ensureParentPortalTable();
    const plain = String(req.body?.token || '').trim();
    const newPhone = normalizePhone(req.body?.new_phone);
    const newPassword = String(req.body?.new_password || '');
    if (!plain || plain.length < 20) {
      return res.status(400).json({ success: false, message: 'Invalid or missing reset link' });
    }
    if (!newPhone) {
      return res.status(400).json({ success: false, message: 'Enter a valid Rwanda mobile number' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
    }
    const h = hashPhoneResetToken(plain);
    const [[acct]] = await promisePool.query(
      `SELECT * FROM parent_portal_accounts
       WHERE phone_reset_token_hash = ?
         AND phone_reset_expires_at IS NOT NULL
         AND phone_reset_expires_at > NOW()
       LIMIT 1`,
      [h]
    );
    if (!acct) {
      return res.status(400).json({ success: false, message: 'This link is invalid or has expired. Request a new one.' });
    }
    const [[taken]] = await promisePool.query(
      'SELECT id FROM parent_portal_accounts WHERE phone = ? AND id <> ? LIMIT 1',
      [newPhone, acct.id]
    );
    if (taken) {
      return res.status(409).json({ success: false, message: 'That phone number is already used by another parent account' });
    }
    const oldPhone = acct.phone;
    const oldP = normalizePhone(oldPhone);
    const syncEmailRaw = primaryContactEmailForPortalSync(acct);
    const passHash = await bcrypt.hash(newPassword, 10);
    await ensureStudentContactColumnsWide();
    const conn = await promisePool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query(
        `UPDATE parent_portal_accounts SET
         phone = ?,
         password_hash = ?,
         phone_reset_token_hash = NULL,
         phone_reset_expires_at = NULL
       WHERE id = ?`,
        [newPhone, passHash, acct.id]
      );
      const p1 = oldPhone;
      const pLikeStart = `${oldPhone} · %`;
      const pLikeEnd = `% · ${oldPhone}`;
      const pLikeMid = `% · ${oldPhone} · %`;
      const [stuRows] = await conn.query(
        `SELECT id, father_phone, mother_phone, father_email, mother_email FROM students
         WHERE father_phone = ?
            OR father_phone LIKE ?
            OR father_phone LIKE ?
            OR father_phone LIKE ?
            OR mother_phone = ?
            OR mother_phone LIKE ?
            OR mother_phone LIKE ?
            OR mother_phone LIKE ?`,
        [p1, pLikeStart, pLikeEnd, pLikeMid, p1, pLikeStart, pLikeEnd, pLikeMid]
      );
      for (const row of stuRows) {
        let fp = row.father_phone;
        let mp = row.mother_phone;
        let fe = row.father_email;
        let me = row.mother_email;
        if (oldP && fieldContainsNormalizedPhone(fp, oldP)) {
          fp = appendPhoneToStudentField(fp, oldPhone, newPhone);
          if (syncEmailRaw) fe = appendEmailToStudentField(fe, syncEmailRaw);
        }
        if (oldP && fieldContainsNormalizedPhone(mp, oldP)) {
          mp = appendPhoneToStudentField(mp, oldPhone, newPhone);
          if (syncEmailRaw) me = appendEmailToStudentField(me, syncEmailRaw);
        }
        if (
          fp !== row.father_phone ||
          mp !== row.mother_phone ||
          fe !== row.father_email ||
          me !== row.mother_email
        ) {
          await conn.query(
            'UPDATE students SET father_phone = ?, mother_phone = ?, father_email = ?, mother_email = ? WHERE id = ?',
            [fp, mp, fe, me, row.id]
          );
        }
      }
      await conn.commit();
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
    return res.json({
      success: true,
      message: 'Phone number updated. Log in with your new number and new password.',
      phone: newPhone,
    });
  } catch (err) {
    console.error('[parent-portal/complete-phone-reset]', err);
    return res.status(500).json({ success: false, message: 'Could not update phone number' });
  }
});

// PATCH /api/parent-portal/recovery-email  (logged-in, full portal account only)
router.patch('/parent-portal/recovery-email', authLimiter, async (req, res) => {
  try {
    await ensureParentPortalTable();
    const role = (req.session?.user?.role?.code || req.session?.roleCode || '').toUpperCase();
    const accountId = req.session?.parentPortalAccountId || req.session?.user?.parent_portal_id;
    if (role !== 'PARENT' || !accountId) {
      return res.status(401).json({
        success: false,
        message: 'Complete registration with a password first, then you can add a recovery email.',
      });
    }
    const email = normalizeRecoveryEmail(req.body?.recovery_email);
    if (!email) {
      return res.status(400).json({ success: false, message: 'Enter a valid email address' });
    }
    await promisePool.query('UPDATE parent_portal_accounts SET recovery_email = ? WHERE id = ?', [
      email,
      accountId,
    ]);
    const [[row]] = await promisePool.query('SELECT * FROM parent_portal_accounts WHERE id = ?', [accountId]);
    if (row && req.session) {
      req.session.user = buildParentSessionUser(row);
    }
    return new Promise((resolve) => {
      req.session.save((saveErr) => {
        if (saveErr) {
          console.error('[parent-portal/recovery-email] session.save', saveErr);
          return resolve(res.status(500).json({ success: false, message: 'Saved but session refresh failed' }));
        }
        return resolve(res.json({ success: true, message: 'Recovery email saved', recovery_email: email }));
      });
    });
  } catch (err) {
    console.error('[parent-portal/recovery-email]', err);
    return res.status(500).json({ success: false, message: 'Could not save recovery email' });
  }
});

// ── Public student lookup (no login) — used by Babyeyi Finder guest pay ──
// POST /api/public/student-code-lookup
// POST /api/parent-portal/public/babyeyi-finder/student-lookup  (same handler)
async function handlePublicStudentCodeLookup(req, res) {
  try {
    const raw =
      req.body?.code ??
      req.body?.student_uid ??
      req.body?.sdm_code ??
      req.body?.sdmCode;
    const st = await findStudentRowByCode(raw);
    if (!st) {
      return res.json({ success: true, found: false });
    }
    return res.json({
      success: true,
      found: true,
      data: {
        school_id: st.school_id,
        student_uid: st.student_uid,
        student_code: st.student_code,
        sdm_code: st.sdm_code,
        first_name: st.first_name,
        last_name: st.last_name,
        school_name: st.school_name,
        school_code: st.school_code,
        mini_website_slug: st.mini_website_slug || null,
        class_name: st.class_name,
        academic_year: st.academic_year,
        province: st.province,
        district: st.district,
        sector: st.sector,
        father_email: st.father_email || null,
        mother_email: st.mother_email || null,
        parent_email: st.father_email || st.mother_email || null,
      },
    });
  } catch (err) {
    console.error('[public/student-code-lookup]', err);
    return res.status(500).json({ success: false, message: 'Lookup failed' });
  }
}

router.post('/public/student-code-lookup', checkPhoneLimiter, handlePublicStudentCodeLookup);
router.post('/parent-portal/public/babyeyi-finder/student-lookup', checkPhoneLimiter, handlePublicStudentCodeLookup);

// GET /api/parent-portal/public/babyeyi-finder — discovery (explicit here so it is not lost when the
// mounted pay router receives an empty path after Express strips the mount prefix).
router.get('/parent-portal/public/babyeyi-finder', (_req, res) => {
  res.json(getBabyeyiFinderDiscoveryPayload());
});

// ── POST /api/parent-portal/link-student-by-code ─────────────────
router.post('/parent-portal/link-student-by-code', authLimiter, async (req, res) => {
  try {
    await ensureStudentAccessTable();
    const role = (req.session?.user?.role?.code || req.session?.roleCode || '').toUpperCase();
    const parentPhone = req.session?.user?.parent_phone;
    const parentPortalAccountId = req.session?.parentPortalAccountId || req.session?.user?.parent_portal_id || null;
    if (role !== 'PARENT' || !parentPhone) {
      return res.status(401).json({ success: false, message: 'Not authenticated as parent' });
    }
    const np = normalizePhone(parentPhone);
    if (!np) {
      return res.status(400).json({ success: false, message: 'Invalid parent session phone' });
    }
    let st = null;
    const studentId = Number(req.body?.student_id || 0);
    if (studentId > 0) {
      const [rows] = await promisePool.query(
        `SELECT s.id, s.school_id, s.student_uid, s.student_code, s.sdm_code, s.father_phone, s.mother_phone,
                s.first_name, s.last_name, s.class_name, s.academic_year, sc.school_name
         FROM students s
         LEFT JOIN schools sc ON sc.id = s.school_id
         WHERE s.id = ?
         LIMIT 1`,
        [studentId]
      );
      st = rows?.[0] || null;
    } else {
      st = await findStudentRowByCode(
        req.body?.code ?? req.body?.student_uid ?? req.body?.sdm_code ?? req.body?.sdmCode
      );
    }
    if (!st) {
      return res.json({ success: false, notFound: true });
    }
    const officiallyLinked =
      fieldContainsNormalizedPhone(st.father_phone, np) || fieldContainsNormalizedPhone(st.mother_phone, np);
    if (officiallyLinked) {
      await upsertStudentAccess({
        parentPortalAccountId,
        parentPhone: np,
        studentId: st.id,
        accessType: 'FULL',
      });
      return res.json({
        success: true,
        linked: true,
        alreadyLinked: true,
        access_type: 'FULL',
        data: {
          id: st.id,
          student_uid: st.student_uid,
          first_name: st.first_name,
          last_name: st.last_name,
          school_name: st.school_name,
          class_name: st.class_name,
        },
      });
    }
    await upsertStudentAccess({
      parentPortalAccountId,
      parentPhone: np,
      studentId: st.id,
      accessType: 'LIMITED',
    });
    await logParentStudentAction({
      parentPortalAccountId,
      parentPhone: np,
      studentId: st.id,
      accessType: 'LIMITED',
      actionType: 'add_student_limited',
      endpoint: '/api/parent-portal/link-student-by-code',
      payload: { student_uid: st.student_uid, student_code: st.student_code, sdm_code: st.sdm_code },
    }).catch(() => {});
    return res.json({
      success: true,
      linked: true,
      access_type: 'LIMITED',
      limited: true,
      message: 'Student added with limited access.',
      data: {
        id: st.id,
        student_uid: st.student_uid,
        first_name: st.first_name,
        last_name: st.last_name,
        school_name: st.school_name,
        class_name: st.class_name,
      },
    });
  } catch (err) {
    console.error('[parent-portal/link-student-by-code]', err);
    return res.status(500).json({ success: false, message: 'Could not link student' });
  }
});

// ── GET /api/parent-portal/search-students?q=... ──────────────────
router.get('/parent-portal/search-students', authLimiter, async (req, res) => {
  try {
    await ensureStudentAccessTable();
    const role = (req.session?.user?.role?.code || req.session?.roleCode || '').toUpperCase();
    const parentPhone = req.session?.user?.parent_phone;
    if (role !== 'PARENT' || !parentPhone) {
      return res.status(401).json({ success: false, message: 'Not authenticated as parent' });
    }
    const np = normalizePhone(parentPhone);
    if (!np) return res.status(400).json({ success: false, message: 'Invalid parent phone in session' });
    const q = String(req.query?.q || '').trim();
    if (q.length < 2) {
      return res.status(400).json({ success: false, message: 'Enter at least 2 characters to search' });
    }
    const like = `%${q}%`;
    const upperQ = q.toUpperCase();
    const [rows] = await promisePool.query(
      `SELECT s.id, s.student_uid, s.student_code, s.sdm_code, s.first_name, s.last_name, s.class_name, s.academic_year,
              s.school_id, s.father_phone, s.mother_phone, sc.school_name,
              sa.access_type AS saved_access_type
       FROM students s
       LEFT JOIN schools sc ON sc.id = s.school_id
       LEFT JOIN student_access sa ON sa.student_id = s.id AND sa.parent_phone = ?
       WHERE (
         TRIM(UPPER(s.student_uid)) = ?
         OR (s.student_code IS NOT NULL AND TRIM(s.student_code) = ?)
         OR (s.sdm_code IS NOT NULL AND TRIM(UPPER(s.sdm_code)) = ?)
         OR CONCAT(COALESCE(s.first_name,''), ' ', COALESCE(s.last_name,'')) LIKE ?
         OR CONCAT(COALESCE(s.last_name,''), ' ', COALESCE(s.first_name,'')) LIKE ?
       )
       ORDER BY s.last_name ASC, s.first_name ASC
       LIMIT 20`,
      [np, upperQ, q, upperQ, like, like]
    );
    const data = (rows || []).map((r) => {
      const official = studentRowOwnedByPhone(r, np);
      const accessType = official ? 'FULL' : (r.saved_access_type || 'LIMITED');
      return {
        id: r.id,
        student_uid: r.student_uid,
        student_code: r.student_code,
        sdm_code: r.sdm_code,
        first_name: r.first_name,
        last_name: r.last_name,
        class_name: r.class_name,
        academic_year: r.academic_year,
        school_id: r.school_id,
        school_name: r.school_name,
        officially_linked: official,
        access_type: accessType,
      };
    });
    return res.json({ success: true, data });
  } catch (err) {
    console.error('[parent-portal/search-students]', err);
    return res.status(500).json({ success: false, message: 'Could not search students' });
  }
});

// ── POST /api/parent-portal/limited-actions/log ───────────────────
router.post('/parent-portal/limited-actions/log', authLimiter, async (req, res) => {
  try {
    await ensureStudentAccessTable();
    await ensureParentAccessLogTable();
    const role = (req.session?.user?.role?.code || req.session?.roleCode || '').toUpperCase();
    const parentPhone = normalizePhone(req.session?.user?.parent_phone || '');
    const parentPortalAccountId = req.session?.parentPortalAccountId || req.session?.user?.parent_portal_id || null;
    if (role !== 'PARENT' || !parentPhone) {
      return res.status(401).json({ success: false, message: 'Not authenticated as parent' });
    }
    const studentId = Number(req.body?.student_id || 0);
    const actionType = String(req.body?.action_type || '').trim().toLowerCase();
    if (!studentId || !actionType) {
      return res.status(400).json({ success: false, message: 'student_id and action_type are required' });
    }
    const [rows] = await promisePool.query(
      `SELECT s.id, s.father_phone, s.mother_phone, sa.access_type
       FROM students s
       LEFT JOIN student_access sa ON sa.student_id = s.id AND sa.parent_phone = ?
       WHERE s.id = ?
       LIMIT 1`,
      [parentPhone, studentId]
    );
    const row = rows?.[0];
    if (!row) return res.status(404).json({ success: false, message: 'Student not found' });
    const accessType = studentRowOwnedByPhone(row, parentPhone) ? 'FULL' : (row.access_type || null);
    if (!accessType) {
      return res.status(403).json({ success: false, message: 'You do not have access to this student' });
    }
    if (accessType !== 'LIMITED') {
      return res.status(400).json({ success: false, message: 'Action log endpoint is only for limited-access actions' });
    }
    await logParentStudentAction({
      parentPortalAccountId,
      parentPhone,
      studentId,
      accessType,
      actionType,
      endpoint: '/api/parent-portal/limited-actions/log',
      payload: req.body?.payload || null,
    });
    return res.json({ success: true, message: 'Action logged' });
  } catch (err) {
    console.error('[parent-portal/limited-actions/log]', err);
    return res.status(500).json({ success: false, message: 'Could not log action' });
  }
});

// ── POST /api/parent-portal/access-requests ───────────────────────
router.post('/parent-portal/access-requests', authLimiter, async (req, res) => {
  try {
    await ensureStudentAccessTable();
    await ensureParentAccessRequestTable();
    await ensureParentNotificationTable();
    const role = (req.session?.user?.role?.code || req.session?.roleCode || '').toUpperCase();
    const parentPhone = normalizePhone(req.session?.user?.parent_phone || '');
    const parentPortalAccountId = req.session?.parentPortalAccountId || req.session?.user?.parent_portal_id || null;
    if (role !== 'PARENT' || !parentPhone) {
      return res.status(401).json({ success: false, message: 'Not authenticated as parent' });
    }
    const studentId = Number(req.body?.student_id || 0);
    const message = String(req.body?.message || '').trim().slice(0, 1000);
    const purpose = String(req.body?.purpose || 'full_access_request').trim().slice(0, 120);
    if (!studentId) return res.status(400).json({ success: false, message: 'student_id is required' });
    const [rows] = await promisePool.query(
      `SELECT s.id, s.school_id, s.first_name, s.last_name, s.father_phone, s.mother_phone, sc.school_name, sa.access_type
       FROM students s
       LEFT JOIN schools sc ON sc.id = s.school_id
       LEFT JOIN student_access sa ON sa.student_id = s.id AND sa.parent_phone = ?
       WHERE s.id = ?
       LIMIT 1`,
      [parentPhone, studentId]
    );
    const st = rows?.[0];
    if (!st) return res.status(404).json({ success: false, message: 'Student not found' });
    if (studentRowOwnedByPhone(st, parentPhone)) {
      return res.status(400).json({ success: false, message: 'You already have full access for this student' });
    }
    if (String(st.access_type || '').toUpperCase() !== 'LIMITED') {
      return res.status(403).json({ success: false, message: 'Add this student first with limited access' });
    }
    const [openRows] = await promisePool.query(
      `SELECT id FROM parent_student_access_requests
       WHERE parent_phone = ? AND student_id = ? AND status = 'PENDING'
       ORDER BY id DESC LIMIT 1`,
      [parentPhone, studentId]
    );
    if (openRows?.[0]?.id) {
      return res.status(409).json({ success: false, message: 'A pending request already exists for this student' });
    }
    const [ins] = await promisePool.query(
      `INSERT INTO parent_student_access_requests
        (parent_portal_account_id, parent_phone, student_id, school_id, status, purpose, message)
       VALUES (?, ?, ?, ?, 'PENDING', ?, ?)`,
      [parentPortalAccountId || null, parentPhone, studentId, st.school_id || null, purpose || null, message || null]
    );
    const studentName = `${st.first_name || ''} ${st.last_name || ''}`.trim() || 'Student';
    await promisePool.query(
      `INSERT INTO parent_portal_notifications
        (target_parent_phone, source_parent_phone, student_id, type, title, body, payload_json)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        parentPhone,
        null,
        studentId,
        'FULL_ACCESS_REQUEST_SUBMITTED',
        'Full access request sent',
        `Request sent to ${st.school_name || 'school admin'} for ${studentName}.`,
        JSON.stringify({ request_id: ins.insertId, student_id: studentId, school_id: st.school_id || null }),
      ]
    );
    return res.status(201).json({
      success: true,
      message: 'Full access request sent to school admin',
      data: { id: ins.insertId, student_id: studentId, school_id: st.school_id || null, status: 'PENDING' },
    });
  } catch (err) {
    console.error('[parent-portal/access-requests POST]', err);
    return res.status(500).json({ success: false, message: 'Could not submit full access request' });
  }
});

// ── GET /api/parent-portal/access-requests/mine ───────────────────
router.get('/parent-portal/access-requests/mine', authLimiter, async (req, res) => {
  try {
    await ensureParentAccessRequestTable();
    const role = (req.session?.user?.role?.code || req.session?.roleCode || '').toUpperCase();
    const parentPhone = normalizePhone(req.session?.user?.parent_phone || '');
    if (role !== 'PARENT' || !parentPhone) {
      return res.status(401).json({ success: false, message: 'Not authenticated as parent' });
    }
    const [rows] = await promisePool.query(
      `SELECT r.id, r.student_id, r.school_id, r.status, r.purpose, r.message, r.reviewed_by, r.reviewed_at, r.created_at, r.updated_at,
              s.first_name, s.last_name, sc.school_name
       FROM parent_student_access_requests r
       LEFT JOIN students s ON s.id = r.student_id
       LEFT JOIN schools sc ON sc.id = r.school_id
       WHERE r.parent_phone = ?
       ORDER BY r.created_at DESC, r.id DESC
       LIMIT 100`,
      [parentPhone]
    );
    return res.json({ success: true, data: rows || [] });
  } catch (err) {
    console.error('[parent-portal/access-requests/mine]', err);
    return res.status(500).json({ success: false, message: 'Could not load access requests' });
  }
});

// ── GET /api/parent-portal/notifications ──────────────────────────
router.get('/parent-portal/notifications', authLimiter, async (req, res) => {
  try {
    await ensureParentNotificationTable();
    const role = (req.session?.user?.role?.code || req.session?.roleCode || '').toUpperCase();
    const parentPhone = normalizePhone(req.session?.user?.parent_phone || '');
    if (role !== 'PARENT' || !parentPhone) {
      return res.status(401).json({ success: false, message: 'Not authenticated as parent' });
    }
    const limit = Math.min(Math.max(Number(req.query?.limit || 30), 1), 100);
    const [rows] = await promisePool.query(
      `SELECT id, target_parent_phone, source_parent_phone, student_id, type, title, body, payload_json, read_at, created_at
       FROM parent_portal_notifications
       WHERE target_parent_phone = ?
       ORDER BY created_at DESC, id DESC
       LIMIT ?`,
      [parentPhone, limit]
    );
    const data = (rows || []).map((r) => {
      let payload = null;
      try { payload = r.payload_json ? JSON.parse(r.payload_json) : null; } catch { payload = null; }
      return {
        id: r.id,
        source_parent_phone: r.source_parent_phone || null,
        student_id: r.student_id || null,
        type: r.type,
        title: r.title,
        body: r.body,
        payload,
        read: !!r.read_at,
        created_at: r.created_at,
      };
    });
    return res.json({ success: true, data });
  } catch (err) {
    console.error('[parent-portal/notifications GET]', err);
    return res.status(500).json({ success: false, message: 'Could not load notifications' });
  }
});

// ── POST /api/parent-portal/register ────────────────────────────
router.post('/parent-portal/register', authLimiter, async (req, res) => {
  try {
    await ensureParentPortalTable();
    const {
      phone: rawPhone,
      password,
      father_full_name,
      mother_full_name,
      father_email,
      mother_email,
    } = req.body || {};
    const phone = normalizePhone(rawPhone);
    if (!phone) {
      return res.status(400).json({ success: false, message: 'Invalid phone number' });
    }
    if (!password || String(password).length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
    }

    const [[existing]] = await promisePool.query(
      'SELECT id FROM parent_portal_accounts WHERE phone = ? LIMIT 1',
      [phone]
    );
    if (existing) {
      return res.status(409).json({ success: false, message: 'This number already has an account — log in instead' });
    }

    const recovery =
      normalizeRecoveryEmail(req.body?.recovery_email)
      || normalizeRecoveryEmail(father_email)
      || normalizeRecoveryEmail(mother_email);
    const hash = await bcrypt.hash(String(password), 10);
    const [result] = await promisePool.query(
      `INSERT INTO parent_portal_accounts
        (phone, password_hash, father_full_name, mother_full_name, father_email, mother_email, recovery_email, created_via_phone_only, completed_registration_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, NULL)`,
      [
        phone,
        hash,
        father_full_name?.trim() || null,
        mother_full_name?.trim() || null,
        father_email?.trim() || null,
        mother_email?.trim() || null,
        recovery,
      ]
    );
    const id = result.insertId;
    const [[row]] = await promisePool.query('SELECT * FROM parent_portal_accounts WHERE id = ?', [id]);

    req.session.regenerate((err) => {
      if (err) {
        console.error('[parent-portal/register] session.regenerate', err);
        return res.status(500).json({ success: false, message: 'Session error' });
      }
      req.session.parentPortalAccountId = id;
      req.session.roleCode = 'PARENT';
      req.session.user = buildParentSessionUser(row);
      applyRememberMeToSession(req, req.body);
      req.session.save((saveErr) => {
        if (saveErr) {
          console.error('[parent-portal/register] session.save', saveErr);
          return res.status(500).json({ success: false, message: 'Session save failed' });
        }
        return res.json({
          success: true,
          message: 'Account created',
          redirect: '/parents/home?addStudent=1',
        });
      });
    });
  } catch (err) {
    console.error('[parent-portal/register]', err);
    return res.status(500).json({ success: false, message: 'Registration failed' });
  }
});

// ── POST /api/parent-portal/login ───────────────────────────────
router.post('/parent-portal/login', authLimiter, async (req, res) => {
  try {
    await ensureParentPortalTable();
    const { phone: rawPhone, password } = req.body || {};
    const phone = normalizePhone(rawPhone);
    if (!phone || !password) {
      return res.status(400).json({ success: false, message: 'Phone and password are required' });
    }
    const [[row]] = await promisePool.query(
      'SELECT * FROM parent_portal_accounts WHERE phone = ? LIMIT 1',
      [phone]
    );
    if (!row) {
      return res.status(401).json({ success: false, message: 'No account for this number — register first' });
    }
    const ok = await bcrypt.compare(String(password), row.password_hash);
    if (!ok) {
      return res.status(401).json({ success: false, message: 'Wrong password' });
    }

    req.session.regenerate((err) => {
      if (err) {
        console.error('[parent-portal/login] session.regenerate', err);
        return res.status(500).json({ success: false, message: 'Session error' });
      }
      req.session.parentPortalAccountId = row.id;
      req.session.roleCode = 'PARENT';
      req.session.user = buildParentSessionUser(row);
      applyRememberMeToSession(req, req.body);
      req.session.save((saveErr) => {
        if (saveErr) {
          console.error('[parent-portal/login] session.save', saveErr);
          return res.status(500).json({ success: false, message: 'Session save failed' });
        }
        return res.json({ success: true, message: 'Logged in', redirect: '/parents' });
      });
    });
  } catch (err) {
    console.error('[parent-portal/login]', err);
    return res.status(500).json({ success: false, message: 'Login failed' });
  }
});

// ── POST /api/parent-portal/phone-login ─────────────────────────
// Logs in a parent using only a phone number that exists on students table.
router.post('/parent-portal/phone-login', authLimiter, async (req, res) => {
  try {
    await ensureParentPortalTable();
    const { phone: rawPhone } = req.body || {};
    const phone = normalizePhone(rawPhone);
    if (!phone) {
      return res.status(400).json({ success: false, message: 'Invalid phone number' });
    }
    const [[existingAccount]] = await promisePool.query(
      'SELECT id FROM parent_portal_accounts WHERE phone = ? LIMIT 1',
      [phone]
    );
    if (existingAccount) {
      return res.status(409).json({
        success: false,
        message: 'This number already has an account. Please log in with password.',
      });
    }

    const inStudents = await phoneExistsInStudents(phone);
    if (!inStudents) {
      return res.status(404).json({
        success: false,
        message: 'This phone is not linked to any student yet. Please register first.',
      });
    }

    const ownWhere = sqlStudentMatchesParentPhoneExpr('');
    const [profileCandidates] = await promisePool.query(
      `SELECT father_full_name, mother_full_name, father_email, mother_email, father_phone, mother_phone
       FROM students
       WHERE ${ownWhere}
       ORDER BY id DESC`,
      bindParentPhoneMatchParams(phone)
    );
    const profileRow =
      (profileCandidates || []).find((r) => studentRowOwnedByPhone(r, phone)) || profileCandidates?.[0] || null;

    req.session.regenerate((err) => {
      if (err) {
        console.error('[parent-portal/phone-login] session.regenerate', err);
        return res.status(500).json({ success: false, message: 'Session error' });
      }
      req.session.parentPortalPhoneOnly = true;
      req.session.roleCode = 'PARENT';
      req.session.user = buildParentSessionUserFromStudentPhone(phone, profileRow || null);
      applyRememberMeToSession(req, req.body);
      req.session.save((saveErr) => {
        if (saveErr) {
          console.error('[parent-portal/phone-login] session.save', saveErr);
          return res.status(500).json({ success: false, message: 'Session save failed' });
        }
        return res.json({ success: true, message: 'Logged in', redirect: '/parents' });
      });
    });
  } catch (err) {
    console.error('[parent-portal/phone-login]', err);
    return res.status(500).json({ success: false, message: 'Login failed' });
  }
});

// ── POST /api/parent-portal/complete-registration ───────────────
// For phone-only parent sessions: set password + profile and create a full account.
router.post('/parent-portal/complete-registration', authLimiter, async (req, res) => {
  try {
    await ensureParentPortalTable();
    const role = (req.session?.user?.role?.code || req.session?.roleCode || '').toUpperCase();
    const phone = req.session?.user?.parent_phone || null;
    if (role !== 'PARENT' || !phone) {
      return res.status(401).json({ success: false, message: 'Not authenticated as parent' });
    }
    const {
      password,
      father_full_name,
      mother_full_name,
      father_email,
      mother_email,
      recovery_email: rawRecovery,
    } = req.body || {};
    if (!password || String(password).length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
    }
    const [[existing]] = await promisePool.query(
      'SELECT id FROM parent_portal_accounts WHERE phone = ? LIMIT 1',
      [phone]
    );
    if (existing) {
      return res.status(409).json({ success: false, message: 'Account already completed. Please use password login.' });
    }
    const fe = father_email?.trim() || req.session?.user?.father_email || null;
    const me = mother_email?.trim() || req.session?.user?.mother_email || null;
    const recovery =
      normalizeRecoveryEmail(rawRecovery) || normalizeRecoveryEmail(fe) || normalizeRecoveryEmail(me);
    const hash = await bcrypt.hash(String(password), 10);
    const [result] = await promisePool.query(
      `INSERT INTO parent_portal_accounts
        (phone, password_hash, father_full_name, mother_full_name, father_email, mother_email, recovery_email, created_via_phone_only, completed_registration_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, NOW())`,
      [
        phone,
        hash,
        father_full_name?.trim() || req.session?.user?.father_full_name || null,
        mother_full_name?.trim() || req.session?.user?.mother_full_name || null,
        fe,
        me,
        recovery,
      ]
    );
    const id = result.insertId;
    const [[row]] = await promisePool.query('SELECT * FROM parent_portal_accounts WHERE id = ?', [id]);
    req.session.parentPortalAccountId = id;
    req.session.parentPortalPhoneOnly = false;
    req.session.roleCode = 'PARENT';
    req.session.user = buildParentSessionUser(row);
    applyRememberMeToSession(req, req.body);
    req.session.save((saveErr) => {
      if (saveErr) {
        console.error('[parent-portal/complete-registration] session.save', saveErr);
        return res.status(500).json({ success: false, message: 'Session save failed' });
      }
      return res.json({ success: true, message: 'Registration completed' });
    });
  } catch (err) {
    console.error('[parent-portal/complete-registration]', err);
    return res.status(500).json({ success: false, message: 'Failed to complete registration' });
  }
});

// ── GET /api/parent-portal/admin-upgrades ───────────────────────
// Super admin reporting: which parent accounts were completed after phone-only login.
router.get('/parent-portal/admin-upgrades', requireRole('SUPER_ADMIN', 'FULL_SYSTEM_CONTROLLER'), async (_req, res) => {
  try {
    await ensureParentPortalTable();
    const [[counts]] = await promisePool.query(
      `SELECT
         COUNT(*) AS total_accounts,
         SUM(CASE WHEN created_via_phone_only = 1 THEN 1 ELSE 0 END) AS upgraded_accounts
       FROM parent_portal_accounts`
    );
    const [recent] = await promisePool.query(
      `SELECT id, phone, father_full_name, mother_full_name, father_email, mother_email,
              created_via_phone_only, completed_registration_at, created_at, updated_at
       FROM parent_portal_accounts
       ORDER BY COALESCE(completed_registration_at, created_at) DESC
       LIMIT 20`
    );
    return res.json({
      success: true,
      data: {
        total_accounts: Number(counts?.total_accounts || 0),
        upgraded_accounts: Number(counts?.upgraded_accounts || 0),
        recent: recent.map((r) => ({
          ...r,
          created_via_phone_only: !!r.created_via_phone_only,
        })),
      },
    });
  } catch (err) {
    console.error('[parent-portal/admin-upgrades]', err);
    return res.status(500).json({ success: false, message: 'Failed to load parent upgrade stats' });
  }
});

// ── GET /api/parent-portal/admin-accounts ───────────────────────
// Super admin: paginated parent account list with search by phone/name/email.
router.get('/parent-portal/admin-accounts', requireRole('SUPER_ADMIN', 'FULL_SYSTEM_CONTROLLER'), async (req, res) => {
  try {
    await ensureParentPortalTable();
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);
    const offset = (page - 1) * limit;
    const searchRaw = String(req.query.search || '').trim();

    let where = '';
    const params = [];
    const countParams = [];
    if (searchRaw) {
      where = ` WHERE (
        phone LIKE ?
        OR COALESCE(father_full_name,'') LIKE ?
        OR COALESCE(mother_full_name,'') LIKE ?
        OR COALESCE(father_email,'') LIKE ?
        OR COALESCE(mother_email,'') LIKE ?
      )`;
      const like = `%${searchRaw}%`;
      params.push(like, like, like, like, like);
      countParams.push(like, like, like, like, like);
    }

    const [rows] = await promisePool.query(
      `SELECT id, phone, father_full_name, mother_full_name, father_email, mother_email,
              created_via_phone_only, completed_registration_at, created_at, updated_at
       FROM parent_portal_accounts
       ${where}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const [[countRow]] = await promisePool.query(
      `SELECT COUNT(*) AS total FROM parent_portal_accounts ${where}`,
      countParams
    );
    const total = Number(countRow?.total || 0);
    const totalPages = Math.max(Math.ceil(total / limit), 1);

    return res.json({
      success: true,
      data: rows.map((r) => ({ ...r, created_via_phone_only: !!r.created_via_phone_only })),
      total,
      page,
      limit,
      totalPages,
    });
  } catch (err) {
    console.error('[parent-portal/admin-accounts]', err);
    return res.status(500).json({ success: false, message: 'Failed to load parent accounts' });
  }
});

function csvCell(value) {
  const s = String(value ?? '');
  if (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

// ── GET /api/parent-portal/admin-accounts/export.csv ────────────
// Super admin: export filtered parent accounts to CSV.
router.get('/parent-portal/admin-accounts/export.csv', requireRole('SUPER_ADMIN', 'FULL_SYSTEM_CONTROLLER'), async (req, res) => {
  try {
    await ensureParentPortalTable();
    const searchRaw = String(req.query.search || '').trim();
    let where = '';
    const params = [];
    if (searchRaw) {
      where = ` WHERE (
        phone LIKE ?
        OR COALESCE(father_full_name,'') LIKE ?
        OR COALESCE(mother_full_name,'') LIKE ?
        OR COALESCE(father_email,'') LIKE ?
        OR COALESCE(mother_email,'') LIKE ?
      )`;
      const like = `%${searchRaw}%`;
      params.push(like, like, like, like, like);
    }

    const [rows] = await promisePool.query(
      `SELECT id, phone, father_full_name, mother_full_name, father_email, mother_email,
              created_via_phone_only, completed_registration_at, created_at, updated_at
       FROM parent_portal_accounts
       ${where}
       ORDER BY created_at DESC`,
      params
    );

    const headers = [
      'id',
      'phone',
      'father_full_name',
      'mother_full_name',
      'father_email',
      'mother_email',
      'created_via_phone_only',
      'completed_registration_at',
      'created_at',
      'updated_at',
    ];
    const lines = [headers.join(',')];
    for (const row of rows) {
      lines.push(
        [
          row.id,
          row.phone,
          row.father_full_name || '',
          row.mother_full_name || '',
          row.father_email || '',
          row.mother_email || '',
          row.created_via_phone_only ? 'yes' : 'no',
          row.completed_registration_at || '',
          row.created_at || '',
          row.updated_at || '',
        ].map(csvCell).join(',')
      );
    }
    const csv = lines.join('\n');
    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="parent-accounts-${stamp}.csv"`);
    return res.send(csv);
  } catch (err) {
    console.error('[parent-portal/admin-accounts/export.csv]', err);
    return res.status(500).json({ success: false, message: 'Failed to export parent accounts' });
  }
});

// ── School admin review: full-access requests ─────────────────────
router.get('/parent-portal/admin/access-requests', requireRole('SUPER_ADMIN', 'FULL_SYSTEM_CONTROLLER', 'SCHOOL_ADMIN', 'SCHOOL_MANAGER'), async (req, res) => {
  try {
    await ensureParentAccessRequestTable();
    const role = String(req.user?.role_code || '').toUpperCase();
    const userSchoolId = Number(req.user?.school_id || 0);
    const status = String(req.query?.status || 'PENDING').trim().toUpperCase();
    const allowedStatus = new Set(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'ALL']);
    const scopedStatus = allowedStatus.has(status) ? status : 'PENDING';
    const where = [];
    const params = [];
    if (role === 'SCHOOL_ADMIN' || role === 'SCHOOL_MANAGER') {
      where.push('r.school_id = ?');
      params.push(userSchoolId || -1);
    } else {
      const schoolId = Number(req.query?.school_id || 0);
      if (schoolId) {
        where.push('r.school_id = ?');
        params.push(schoolId);
      }
    }
    if (scopedStatus !== 'ALL') {
      where.push('r.status = ?');
      params.push(scopedStatus);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const [rows] = await promisePool.query(
      `SELECT r.id, r.parent_phone, r.student_id, r.school_id, r.status, r.purpose, r.message, r.reviewed_by, r.reviewed_at, r.created_at,
              s.first_name, s.last_name, sc.school_name
       FROM parent_student_access_requests r
       LEFT JOIN students s ON s.id = r.student_id
       LEFT JOIN schools sc ON sc.id = r.school_id
       ${whereSql}
       ORDER BY r.created_at DESC, r.id DESC
       LIMIT 300`,
      params
    );
    return res.json({ success: true, data: rows || [] });
  } catch (err) {
    console.error('[parent-portal/admin/access-requests GET]', err);
    return res.status(500).json({ success: false, message: 'Could not load access requests' });
  }
});

router.patch('/parent-portal/admin/access-requests/:id', requireRole('SUPER_ADMIN', 'FULL_SYSTEM_CONTROLLER', 'SCHOOL_ADMIN', 'SCHOOL_MANAGER'), async (req, res) => {
  try {
    await ensureParentAccessRequestTable();
    await ensureStudentAccessTable();
    await ensureParentNotificationTable();
    const id = Number(req.params.id || 0);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid request id' });
    const role = String(req.user?.role_code || '').toUpperCase();
    const userSchoolId = Number(req.user?.school_id || 0);
    const action = String(req.body?.action || '').trim().toLowerCase();
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, message: 'action must be approve or reject' });
    }
    const [[row]] = await promisePool.query(
      `SELECT id, parent_phone, student_id, school_id, status FROM parent_student_access_requests WHERE id = ? LIMIT 1`,
      [id]
    );
    if (!row) return res.status(404).json({ success: false, message: 'Request not found' });
    if ((role === 'SCHOOL_ADMIN' || role === 'SCHOOL_MANAGER') && Number(row.school_id || 0) !== userSchoolId) {
      return res.status(403).json({ success: false, message: 'Access denied for this school request' });
    }
    if (String(row.status || '').toUpperCase() !== 'PENDING') {
      return res.status(409).json({ success: false, message: `Request already ${String(row.status || '').toLowerCase()}` });
    }
    const reviewedBy = String(req.user?.full_name || req.user?.email || req.user?.username || req.user?.id || role).slice(0, 120);
    const nextStatus = action === 'approve' ? 'APPROVED' : 'REJECTED';
    await promisePool.query(
      `UPDATE parent_student_access_requests
       SET status = ?, reviewed_by = ?, reviewed_at = NOW()
       WHERE id = ?`,
      [nextStatus, reviewedBy, id]
    );
    if (action === 'approve') {
      await promisePool.query(
        `INSERT INTO student_access (parent_portal_account_id, parent_phone, student_id, access_type)
         VALUES (NULL, ?, ?, 'FULL')
         ON DUPLICATE KEY UPDATE access_type = 'FULL', updated_at = CURRENT_TIMESTAMP`,
        [row.parent_phone, row.student_id]
      );
    }
    await promisePool.query(
      `INSERT INTO parent_portal_notifications
        (target_parent_phone, source_parent_phone, student_id, type, title, body, payload_json)
       VALUES (?, NULL, ?, ?, ?, ?, ?)`,
      [
        row.parent_phone,
        row.student_id,
        action === 'approve' ? 'FULL_ACCESS_REQUEST_APPROVED' : 'FULL_ACCESS_REQUEST_REJECTED',
        action === 'approve' ? 'Full access approved' : 'Full access request declined',
        action === 'approve'
          ? 'School admin approved your full access request.'
          : 'School admin declined your full access request.',
        JSON.stringify({ request_id: id, reviewed_by: reviewedBy }),
      ]
    );
    return res.json({ success: true, message: `Request ${nextStatus.toLowerCase()}` });
  } catch (err) {
    console.error('[parent-portal/admin/access-requests PATCH]', err);
    return res.status(500).json({ success: false, message: 'Could not update request' });
  }
});

// ── GET /api/parent-portal/children ─────────────────────────────
router.get('/parent-portal/children', async (req, res) => {
  try {
    await ensureStudentAccessTable();
    const role = (req.session?.user?.role?.code || req.session?.roleCode || '').toUpperCase();
    if (role !== 'PARENT' || !req.session?.user?.parent_phone) {
      return res.status(401).json({ success: false, message: 'Not authenticated as parent' });
    }
    const phone = normalizePhone(req.session.user.parent_phone);
    if (!phone) {
      return res.status(401).json({ success: false, message: 'Not authenticated as parent' });
    }
    const match = sqlStudentMatchesParentPhoneExpr('s');
    const [candidates] = await promisePool.query(
      `SELECT s.id, s.student_uid, s.student_code, s.sdm_code, s.school_id, s.first_name, s.last_name, s.gender, s.birth_year,
              s.province, s.district, s.sector, s.class_name, s.academic_year,
              s.father_phone, s.mother_phone,
              sc.school_name, sc.school_code
       FROM students s
       LEFT JOIN schools sc ON sc.id = s.school_id
       WHERE ${match}
       ORDER BY s.last_name ASC, s.first_name ASC`,
      bindParentPhoneMatchParams(phone)
    );
    const fullStudents = (candidates || [])
      .filter((r) => studentRowOwnedByPhone(r, phone))
      .map(({ father_phone, mother_phone, ...rest }) => ({ ...rest, access_type: 'FULL' }));
    const [limitedRows] = await promisePool.query(
      `SELECT s.id, s.student_uid, s.student_code, s.sdm_code, s.school_id, s.first_name, s.last_name, s.gender, s.birth_year,
              s.province, s.district, s.sector, s.class_name, s.academic_year,
              sc.school_name, sc.school_code, sa.access_type
       FROM student_access sa
       INNER JOIN students s ON s.id = sa.student_id
       LEFT JOIN schools sc ON sc.id = s.school_id
       WHERE sa.parent_phone = ?
       ORDER BY s.last_name ASC, s.first_name ASC`,
      [phone]
    );
    const byId = new Map();
    fullStudents.forEach((r) => byId.set(Number(r.id), r));
    (limitedRows || []).forEach((r) => {
      const idNum = Number(r.id);
      if (!Number.isFinite(idNum) || byId.has(idNum)) return;
      byId.set(idNum, r);
    });
    return res.json({ success: true, data: Array.from(byId.values()) });
  } catch (err) {
    console.error('[parent-portal/children]', err);
    return res.status(500).json({ success: false, message: 'Failed to load children' });
  }
});

// ── ShuleCard APIs (student wallet, top-up, daily limit) ──────────
router.get('/parent-portal/shulecard/students', async (req, res) => {
  try {
    await ensureStudentAccessTable();
    await ensureShulecardTables();
    const role = (req.session?.user?.role?.code || req.session?.roleCode || '').toUpperCase();
    const phone = normalizePhone(req.session?.user?.parent_phone || '');
    if (role !== 'PARENT' || !phone) return res.status(401).json({ success: false, message: 'Not authenticated as parent' });
    const [childrenRes, walletRows] = await Promise.all([
      promisePool.query(
        `SELECT s.id, s.first_name, s.last_name, s.student_uid, s.student_code, s.sdm_code, s.school_id, s.class_name, s.academic_year,
                s.father_phone, s.mother_phone, sc.school_name, sa.access_type AS saved_access_type
         FROM students s
         LEFT JOIN schools sc ON sc.id = s.school_id
         LEFT JOIN student_access sa ON sa.student_id = s.id AND sa.parent_phone = ?
         WHERE (
            (s.father_phone IS NOT NULL AND TRIM(s.father_phone) <> '' AND s.father_phone REGEXP ?)
            OR (s.mother_phone IS NOT NULL AND TRIM(s.mother_phone) <> '' AND s.mother_phone REGEXP ?)
            OR sa.parent_phone = ?
         )
         ORDER BY s.last_name ASC, s.first_name ASC`,
        [phone, mysqlPhoneTokenRegexp(phone), mysqlPhoneTokenRegexp(phone), phone]
      ),
      promisePool.query(
        `SELECT student_id, balance_rwf, daily_limit_rwf, updated_at
         FROM parent_shulecard_wallets
         WHERE parent_phone = ?`,
        [phone]
      ),
    ]);
    const children = childrenRes?.[0] || [];
    const wallets = walletRows?.[0] || [];
    const walletByStudent = new Map(wallets.map((w) => [Number(w.student_id), w]));
    const data = [];
    const seen = new Set();
    for (const c of children) {
      const sid = Number(c.id);
      if (!Number.isFinite(sid) || seen.has(sid)) continue;
      seen.add(sid);
      const official = studentRowOwnedByPhone(c, phone);
      const accessType = official ? 'FULL' : (c.saved_access_type || null);
      if (!accessType) continue;
      const w = walletByStudent.get(sid);
      data.push({
        id: sid,
        first_name: c.first_name,
        last_name: c.last_name,
        student_uid: c.student_uid,
        student_code: c.student_code,
        sdm_code: c.sdm_code,
        class_name: c.class_name,
        academic_year: c.academic_year,
        school_id: c.school_id,
        school_name: c.school_name,
        access_type: accessType,
        can_view_financials: accessType === 'FULL',
        can_set_daily_limit: accessType === 'FULL',
        can_fund: !!accessType,
        wallet: {
          balance_rwf: accessType === 'FULL' ? Number(w?.balance_rwf || 0) : null,
          daily_limit_rwf: accessType === 'FULL' ? Number(w?.daily_limit_rwf || 5000) : null,
          updated_at: w?.updated_at || null,
        },
      });
    }
    return res.json({ success: true, data });
  } catch (err) {
    console.error('[parent-portal/shulecard/students]', err);
    return res.status(500).json({ success: false, message: 'Failed to load shulecard students' });
  }
});

router.post('/parent-portal/shulecard/topups', authLimiter, async (req, res) => {
  try {
    await ensureStudentAccessTable();
    await ensureShulecardTables();
    await ensureParentNotificationTable();
    const role = (req.session?.user?.role?.code || req.session?.roleCode || '').toUpperCase();
    const parentPhone = normalizePhone(req.session?.user?.parent_phone || '');
    const parentPortalAccountId = req.session?.parentPortalAccountId || req.session?.user?.parent_portal_id || null;
    if (role !== 'PARENT' || !parentPhone) return res.status(401).json({ success: false, message: 'Not authenticated as parent' });
    const studentId = Number(req.body?.student_id || 0);
    const amount = Math.floor(Number(req.body?.amount_rwf || 0));
    const paymentMethod = String(req.body?.payment_method || 'momo').trim().toLowerCase();
    const note = String(req.body?.note || '').trim().slice(0, 255);
    if (!studentId) return res.status(400).json({ success: false, message: 'student_id is required' });
    if (!Number.isFinite(amount) || amount < 500 || amount > 5_000_000) {
      return res.status(400).json({ success: false, message: 'Amount must be between 500 and 5,000,000 RWF' });
    }
    const st = await resolveParentStudentAccess(parentPhone, studentId);
    if (!st) return res.status(403).json({ success: false, message: 'No access to this student' });
    const conn = await promisePool.getConnection();
    let nextBalance = 0;
    const referenceNo = `SC-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`;
    try {
      await conn.beginTransaction();
      await conn.query(
        `INSERT INTO parent_shulecard_wallets
          (parent_portal_account_id, parent_phone, student_id, balance_rwf, daily_limit_rwf)
         VALUES (?, ?, ?, 0, 5000)
         ON DUPLICATE KEY UPDATE parent_portal_account_id = VALUES(parent_portal_account_id)`,
        [parentPortalAccountId || null, parentPhone, studentId]
      );
      await conn.query(
        `UPDATE parent_shulecard_wallets
         SET balance_rwf = balance_rwf + ?
         WHERE parent_phone = ? AND student_id = ?`,
        [amount, parentPhone, studentId]
      );
      const [[wallet]] = await conn.query(
        `SELECT balance_rwf, daily_limit_rwf FROM parent_shulecard_wallets WHERE parent_phone = ? AND student_id = ? LIMIT 1`,
        [parentPhone, studentId]
      );
      nextBalance = Number(wallet?.balance_rwf || 0);
      await conn.query(
        `INSERT INTO parent_shulecard_topups
          (parent_portal_account_id, parent_phone, student_id, amount_rwf, payment_method, note, status, reference_no)
         VALUES (?, ?, ?, ?, ?, ?, 'completed', ?)`,
        [parentPortalAccountId || null, parentPhone, studentId, amount, paymentMethod, note || null, referenceNo]
      );
      await conn.commit();
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
    await logParentStudentAction({
      parentPortalAccountId,
      parentPhone,
      studentId,
      accessType: st.access_type,
      actionType: 'create_payment',
      endpoint: '/api/parent-portal/shulecard/topups',
      payload: { amount_rwf: amount, payment_method: paymentMethod, reference_no: referenceNo },
    }).catch(() => {});
    if (st.access_type === 'LIMITED') {
      const studentName = `${st.first_name || ''} ${st.last_name || ''}`.trim() || 'your child';
      const targets = [normalizePhone(st.father_phone), normalizePhone(st.mother_phone)]
        .filter(Boolean)
        .filter((p) => p !== parentPhone);
      const uniqTargets = Array.from(new Set(targets));
      for (const t of uniqTargets) {
        await promisePool.query(
          `INSERT INTO parent_portal_notifications
            (target_parent_phone, source_parent_phone, student_id, type, title, body, payload_json)
           VALUES (?, ?, ?, 'LIMITED_ACCESS_PAYMENT', ?, ?, ?)`,
          [
            t,
            parentPhone,
            studentId,
            'Limited-access ShuleCard top-up',
            `A limited-access parent added ${amount.toLocaleString()} RWF to ${studentName}.`,
            JSON.stringify({ student_id: studentId, amount_rwf: amount, reference_no: referenceNo, product: 'shulecard_topup' }),
          ]
        ).catch(() => {});
      }
    }
    return res.status(201).json({
      success: true,
      message: 'Top-up completed successfully',
      data: {
        student_id: studentId,
        amount_rwf: amount,
        balance_rwf: nextBalance,
        reference_no: referenceNo,
      },
    });
  } catch (err) {
    console.error('[parent-portal/shulecard/topups]', err);
    return res.status(500).json({ success: false, message: 'Failed to complete top-up' });
  }
});

router.patch('/parent-portal/shulecard/daily-limit', authLimiter, async (req, res) => {
  try {
    await ensureStudentAccessTable();
    await ensureShulecardTables();
    const role = (req.session?.user?.role?.code || req.session?.roleCode || '').toUpperCase();
    const parentPhone = normalizePhone(req.session?.user?.parent_phone || '');
    const parentPortalAccountId = req.session?.parentPortalAccountId || req.session?.user?.parent_portal_id || null;
    if (role !== 'PARENT' || !parentPhone) return res.status(401).json({ success: false, message: 'Not authenticated as parent' });
    const studentId = Number(req.body?.student_id || 0);
    const dailyLimit = Math.floor(Number(req.body?.daily_limit_rwf || 0));
    if (!studentId) return res.status(400).json({ success: false, message: 'student_id is required' });
    if (!Number.isFinite(dailyLimit) || dailyLimit < 500 || dailyLimit > 200000) {
      return res.status(400).json({ success: false, message: 'Daily limit must be between 500 and 200,000 RWF' });
    }
    const st = await resolveParentStudentAccess(parentPhone, studentId);
    if (!st) return res.status(403).json({ success: false, message: 'No access to this student' });
    if (st.access_type !== 'FULL') {
      return res.status(403).json({
        success: false,
        message: 'Daily limit can only be set for your officially linked children',
      });
    }
    await promisePool.query(
      `INSERT INTO parent_shulecard_wallets
        (parent_portal_account_id, parent_phone, student_id, balance_rwf, daily_limit_rwf)
       VALUES (?, ?, ?, 0, ?)
       ON DUPLICATE KEY UPDATE
         parent_portal_account_id = VALUES(parent_portal_account_id),
         daily_limit_rwf = VALUES(daily_limit_rwf),
         updated_at = CURRENT_TIMESTAMP`,
      [parentPortalAccountId || null, parentPhone, studentId, dailyLimit]
    );
    await logParentStudentAction({
      parentPortalAccountId,
      parentPhone,
      studentId,
      accessType: st.access_type,
      actionType: 'set_daily_limit',
      endpoint: '/api/parent-portal/shulecard/daily-limit',
      payload: { daily_limit_rwf: dailyLimit },
    }).catch(() => {});
    return res.json({
      success: true,
      message: 'Daily spending limit saved',
      data: { student_id: studentId, daily_limit_rwf: dailyLimit },
    });
  } catch (err) {
    console.error('[parent-portal/shulecard/daily-limit]', err);
    return res.status(500).json({ success: false, message: 'Failed to save daily limit' });
  }
});

router.get('/parent-portal/shulecard/topups', async (req, res) => {
  try {
    await ensureStudentAccessTable();
    await ensureShulecardTables();
    const role = (req.session?.user?.role?.code || req.session?.roleCode || '').toUpperCase();
    const parentPhone = normalizePhone(req.session?.user?.parent_phone || '');
    if (role !== 'PARENT' || !parentPhone) return res.status(401).json({ success: false, message: 'Not authenticated as parent' });
    const studentId = Number(req.query?.student_id || 0);
    if (!studentId) return res.status(400).json({ success: false, message: 'student_id is required' });
    const st = await resolveParentStudentAccess(parentPhone, studentId);
    if (!st) return res.status(403).json({ success: false, message: 'No access to this student' });
    const [rows] = await promisePool.query(
      `SELECT id, amount_rwf, payment_method, note, status, reference_no, created_at
       FROM parent_shulecard_topups
       WHERE parent_phone = ? AND student_id = ?
       ORDER BY created_at DESC, id DESC
       LIMIT 50`,
      [parentPhone, studentId]
    );
    return res.json({ success: true, data: rows || [] });
  } catch (err) {
    console.error('[parent-portal/shulecard/topups GET]', err);
    return res.status(500).json({ success: false, message: 'Failed to load top-up history' });
  }
});

router.get('/parent-portal/shulecard/data', async (req, res) => {
  try {
    await ensureStudentAccessTable();
    await ensureShulecardTables();
    const role = (req.session?.user?.role?.code || req.session?.roleCode || '').toUpperCase();
    const parentPhone = normalizePhone(req.session?.user?.parent_phone || '');
    if (role !== 'PARENT' || !parentPhone) return res.status(401).json({ success: false, message: 'Not authenticated as parent' });

    const [studentRowsRes] = await promisePool.query(
      `SELECT s.id
       FROM students s
       LEFT JOIN student_access sa ON sa.student_id = s.id AND sa.parent_phone = ?
       WHERE (
         (s.father_phone IS NOT NULL AND TRIM(s.father_phone) <> '' AND s.father_phone REGEXP ?)
         OR (s.mother_phone IS NOT NULL AND TRIM(s.mother_phone) <> '' AND s.mother_phone REGEXP ?)
         OR sa.parent_phone = ?
       )`,
      [parentPhone, mysqlPhoneTokenRegexp(parentPhone), mysqlPhoneTokenRegexp(parentPhone), parentPhone]
    );
    const studentIds = Array.from(new Set((studentRowsRes || []).map((r) => Number(r.id)).filter(Boolean)));
    if (!studentIds.length) {
      return res.json({ success: true, data: { topups: [], limits: [], spending: [] } });
    }
    const placeholders = studentIds.map(() => '?').join(',');
    const [topupsRes, limitsRes, spendingRes] = await Promise.all([
      promisePool.query(
        `SELECT t.id, t.student_id, t.amount_rwf, t.payment_method, t.note, t.status, t.reference_no, t.created_at,
                s.first_name, s.last_name, s.class_name, sc.school_name
         FROM parent_shulecard_topups t
         LEFT JOIN students s ON s.id = t.student_id
         LEFT JOIN schools sc ON sc.id = s.school_id
         WHERE t.parent_phone = ? AND t.student_id IN (${placeholders})
         ORDER BY t.created_at DESC, t.id DESC
         LIMIT 500`,
        [parentPhone, ...studentIds]
      ),
      promisePool.query(
        `SELECT w.id, w.student_id, w.balance_rwf, w.daily_limit_rwf, w.updated_at,
                s.first_name, s.last_name, s.class_name, sc.school_name
         FROM parent_shulecard_wallets w
         LEFT JOIN students s ON s.id = w.student_id
         LEFT JOIN schools sc ON sc.id = s.school_id
         WHERE w.parent_phone = ? AND w.student_id IN (${placeholders})
         ORDER BY w.updated_at DESC, w.id DESC
         LIMIT 500`,
        [parentPhone, ...studentIds]
      ),
      promisePool.query(
        `SELECT e.id, e.student_id, e.spender_phone, e.merchant_name, e.amount_rwf, e.note, e.spent_at,
                s.first_name, s.last_name, s.class_name, sc.school_name
         FROM parent_shulecard_spending_events e
         LEFT JOIN students s ON s.id = e.student_id
         LEFT JOIN schools sc ON sc.id = s.school_id
         WHERE e.student_id IN (${placeholders})
         ORDER BY e.spent_at DESC, e.id DESC
         LIMIT 500`,
        [...studentIds]
      ),
    ]);
    return res.json({
      success: true,
      data: {
        topups: topupsRes?.[0] || [],
        limits: limitsRes?.[0] || [],
        spending: spendingRes?.[0] || [],
      },
    });
  } catch (err) {
    console.error('[parent-portal/shulecard/data]', err);
    return res.status(500).json({ success: false, message: 'Failed to load ShuleCard data' });
  }
});

// ── GET /api/parent-portal/classkit-pricing?student_id= ─────────
// Returns class requirements + prices for a parent-owned student.
router.get('/parent-portal/classkit-pricing', async (req, res) => {
  try {
    await ensureStudentAccessTable();
    const role = (req.session?.user?.role?.code || req.session?.roleCode || '').toUpperCase();
    const phone = req.session?.user?.parent_phone || null;
    if (role !== 'PARENT' || !phone) {
      return res.status(401).json({ success: false, message: 'Not authenticated as parent' });
    }
    const studentId = Number(req.query.student_id || 0);
    if (!studentId) {
      return res.status(400).json({ success: false, message: 'student_id is required' });
    }
    const phoneNorm = normalizePhone(phone);
    if (!phoneNorm) {
      return res.status(401).json({ success: false, message: 'Not authenticated as parent' });
    }
    const [ownRows] = await promisePool.query(
      `SELECT s.id, s.school_id, s.class_name, s.academic_year, s.first_name, s.last_name,
              sc.school_name, s.father_phone, s.mother_phone
       FROM students s
       LEFT JOIN schools sc ON sc.id = s.school_id
       WHERE s.id = ?
       LIMIT 1`,
      [studentId]
    );
    const st0 = ownRows?.[0];
    const isOfficial = !!(st0 && studentRowOwnedByPhone(st0, phoneNorm));
    if (!st0) {
      return res.status(404).json({ success: false, message: 'Student not found for this parent' });
    }
    let accessType = isOfficial ? 'FULL' : null;
    if (!isOfficial) {
      const [aRows] = await promisePool.query(
        `SELECT access_type FROM student_access WHERE parent_phone = ? AND student_id = ? LIMIT 1`,
        [phoneNorm, studentId]
      );
      accessType = aRows?.[0]?.access_type || null;
    }
    if (!accessType) {
      return res.status(404).json({ success: false, message: 'Student not found for this parent' });
    }
    if (accessType === 'LIMITED') {
      await logParentStudentAction({
        parentPortalAccountId: req.session?.parentPortalAccountId || req.session?.user?.parent_portal_id || null,
        parentPhone: phoneNorm,
        studentId,
        accessType,
        actionType: 'purchase_items_preview',
        endpoint: '/api/parent-portal/classkit-pricing',
        payload: { scope: 'classkit_pricing' },
      }).catch(() => {});
    }
    const { father_phone: _fp, mother_phone: _mp, ...st } = st0;
    if (!st.school_id || !st.class_name) {
      return res.status(400).json({
        success: false,
        message: 'Student class or school is missing. Ask school manager to update learner class first.',
      });
    }

    const [babyeyiRows] = await promisePool.query(
      `SELECT id, school_id, class_name, classes_json, term, academic_year, status, total_fee
       FROM school_babyeyi
       WHERE school_id = ?
         AND is_active = 1
         AND status = 'approved'
       ORDER BY created_at DESC, id DESC
       LIMIT 200`,
      [st.school_id]
    );
    const babyeyi = (babyeyiRows || []).find(
      (r) => classMatchesBabyeyi(r, st.class_name) && yearMatchesRow(r.academic_year, st.academic_year || '')
    );
    if (!babyeyi) {
      return res.status(404).json({
        success: false,
        message: `No approved Babyeyi found for class ${st.class_name}.`,
      });
    }

    const [feeRows] = await promisePool.query(
      `SELECT id, name, amount, sort_order
       FROM babyeyi_payments
       WHERE babyeyi_id = ?
       ORDER BY sort_order, id`,
      [babyeyi.id]
    );

    let reqLines;
    try {
      [reqLines] = await promisePool.query(
        `SELECT bsr.id AS babyeyi_requirement_id, bsr.item AS requirement_name, bsr.description, bsr.quantity,
                rp.price AS stored_price,
                sr.default_price AS catalog_default_price,
                sr.image_url AS catalog_image_url,
                COALESCE(rp.price, sr.default_price, bsr.cost, 0) AS unit_price
         FROM babyeyi_student_requirements bsr
         LEFT JOIN requirement_prices rp ON rp.babyeyi_id = bsr.babyeyi_id AND rp.babyeyi_requirement_id = bsr.id
         ${SQL_JOIN_STUDENT_REQ_BY_ITEM}
         WHERE bsr.babyeyi_id = ?
         ORDER BY bsr.sort_order, bsr.id`,
        [babyeyi.id]
      );
    } catch (e) {
      if (e.code !== 'ER_BAD_FIELD_ERROR') throw e;
      [reqLines] = await promisePool.query(
        `SELECT bsr.id AS babyeyi_requirement_id, bsr.item AS requirement_name, bsr.description, bsr.quantity,
                rp.price AS stored_price,
                sr.default_price AS catalog_default_price,
                sr.image_url AS catalog_image_url,
                COALESCE(rp.price, sr.default_price, 0) AS unit_price
         FROM babyeyi_student_requirements bsr
         LEFT JOIN requirement_prices rp ON rp.babyeyi_id = bsr.babyeyi_id AND rp.babyeyi_requirement_id = bsr.id
         ${SQL_JOIN_STUDENT_REQ_BY_ITEM}
         WHERE bsr.babyeyi_id = ?
         ORDER BY bsr.sort_order, bsr.id`,
        [babyeyi.id]
      );
    }

    const requirements = (reqLines || []).map((l) => {
      const unit = Number(l.unit_price ?? 0);
      const qty = parseRequirementQuantity(l.quantity);
      const lineTotal = Math.round(unit * qty * 100) / 100;
      return {
        ...l,
        unit_price_rwf: unit,
        quantity_value: qty,
        line_total_rwf: lineTotal,
      };
    });
    const canSeeSchoolFees = accessType === 'FULL';
    const feeRowsScoped = canSeeSchoolFees ? (feeRows || []) : [];
    const schoolFeesTotal = feeRowsScoped.reduce((s, f) => s + Number(f.amount || 0), 0);
    const requirementsTotal = requirements.reduce((s, r) => s + Number(r.line_total_rwf || 0), 0);
    const combinedTotal = Math.round((schoolFeesTotal + requirementsTotal) * 100) / 100;

    return res.json({
      success: true,
      data: {
        student: {
          id: st.id,
          first_name: st.first_name,
          last_name: st.last_name,
          school_id: st.school_id,
          school_name: st.school_name,
          class_name: st.class_name,
          academic_year: st.academic_year,
        },
        babyeyi,
        access_type: accessType,
        limited_access: accessType === 'LIMITED',
        permissions: accessType === 'LIMITED'
          ? ['create_payment', 'purchase_items']
          : ['create_payment', 'purchase_items', 'get_fees_breakdown', 'get_transactions', 'get_reports', 'get_attendance', 'get_discipline'],
        school_fees: feeRowsScoped,
        requirements,
        totals: {
          school_fees_rwf: Math.round(schoolFeesTotal * 100) / 100,
          requirements_rwf: Math.round(requirementsTotal * 100) / 100,
          combined_rwf: combinedTotal,
        },
      },
    });
  } catch (err) {
    console.error('[parent-portal/classkit-pricing]', err);
    return res.status(500).json({ success: false, message: 'Failed to load classkit pricing' });
  }
});

// ── GET /api/parent-portal/payments-report ──────────────────────
// Parent-only payment and loan history with filters + summary.
router.get('/parent-portal/payments-report', async (req, res) => {
  try {
    await ensureLoanRepaymentTable();
    const role = (req.session?.user?.role?.code || req.session?.roleCode || '').toUpperCase();
    const phone = req.session?.user?.parent_phone || null;
    if (role !== 'PARENT' || !phone) {
      return res.status(401).json({ success: false, message: 'Not authenticated as parent' });
    }

    const term = String(req.query.term || '').trim();
    const academicYear = String(req.query.academic_year || '').trim();
    const schoolId = Number(req.query.school_id || 0);
    const status = String(req.query.status || '').trim().toLowerCase();
    const dateFrom = String(req.query.date_from || '').trim();
    const dateTo = String(req.query.date_to || '').trim();

    const phoneNorm = normalizePhone(phone);
    if (!phoneNorm) {
      return res.status(401).json({ success: false, message: 'Not authenticated as parent' });
    }
    const ownWhere = sqlStudentMatchesParentPhoneExpr('');
    const [ownedRows] = await promisePool.query(
      `SELECT id, father_phone, mother_phone FROM students WHERE ${ownWhere}`,
      bindParentPhoneMatchParams(phoneNorm)
    );
    const ownedIds = (ownedRows || [])
      .filter((r) => studentRowOwnedByPhone(r, phoneNorm))
      .map((r) => Number(r.id))
      .filter(Boolean);
    if (!ownedIds.length) {
      return res.json({
        success: true,
        data: [],
        summary: { total: 0, paid: 0, submitted: 0, failed: 0, loans: 0, total_rwf: 0, paid_rwf: 0 },
        filters: { schools: [], terms: [], academic_years: [] },
      });
    }

    const where = [];
    const params = [];
    const studentFilter = `CAST(JSON_UNQUOTE(JSON_EXTRACT(i.payload_json, '$.selected_student.student_id')) AS UNSIGNED)`;
    where.push(`(${studentFilter} IN (${ownedIds.map(() => '?').join(',')}))`);
    params.push(...ownedIds);
    if (term) {
      where.push(`COALESCE(b.term, '') = ?`);
      params.push(term);
    }
    if (academicYear) {
      where.push(`COALESCE(b.academic_year, '') = ?`);
      params.push(academicYear);
    }
    if (schoolId) {
      where.push(`i.school_id = ?`);
      params.push(schoolId);
    }
    if (status && ['submitted', 'paid', 'failed', 'draft'].includes(status)) {
      where.push(`LOWER(COALESCE(i.status, 'draft')) = ?`);
      params.push(status);
    }
    if (dateFrom) {
      where.push(`DATE(i.created_at) >= DATE(?)`);
      params.push(dateFrom);
    }
    if (dateTo) {
      where.push(`DATE(i.created_at) <= DATE(?)`);
      params.push(dateTo);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [rows] = await promisePool.query(
      `SELECT i.id, i.school_id, i.babyeyi_id, i.total_rwf, i.status, i.created_at,
              i.payer_name, i.payer_phone, i.payer_email,
              i.payload_json,
              COALESCE(SUM(CASE WHEN LOWER(COALESCE(lr.status,'pending'))='approved' THEN lr.amount_rwf ELSE 0 END), 0) AS paid_loan_rwf,
              COALESCE(SUM(CASE WHEN LOWER(COALESCE(lr.status,'pending'))='pending' THEN lr.amount_rwf ELSE 0 END), 0) AS pending_loan_rwf,
              s.school_name, b.class_name, b.term, b.academic_year,
              JSON_UNQUOTE(JSON_EXTRACT(i.payload_json, '$.selected_student.student_id')) AS student_id,
              JSON_UNQUOTE(JSON_EXTRACT(i.payload_json, '$.selected_student.student_name')) AS student_name,
              JSON_UNQUOTE(JSON_EXTRACT(i.payload_json, '$.payment_plan.payMode')) AS pay_mode
       FROM babyeyi_payment_intents i
       LEFT JOIN schools s ON s.id = i.school_id
       LEFT JOIN school_babyeyi b ON b.id = i.babyeyi_id
       LEFT JOIN babyeyi_loan_repayments lr ON lr.intent_id = i.id
       ${whereSql}
       GROUP BY i.id
       ORDER BY i.created_at DESC, i.id DESC`,
      params
    );

    const mapped = (rows || []).map((r) => {
      const isLoan = String(r.pay_mode || '').toLowerCase() === 'loan';
      const st = String(r.status || 'submitted').toLowerCase();
      let payload = {};
      try { payload = JSON.parse(r.payload_json || '{}'); } catch { payload = {}; }
      const plan = isLoan ? buildLoanPlan(r.total_rwf, payload, r.created_at) : null;
      const loanTotalDue = isLoan ? Number(plan.total_due_rwf || 0) : 0;
      const loanPaid = Number(r.paid_loan_rwf || 0);
      const loanRemaining = Math.max(0, Math.round((loanTotalDue - loanPaid) * 100) / 100);
      return {
        id: r.id,
        school_id: r.school_id,
        school_name: r.school_name || 'School',
        class_name: r.class_name || null,
        term: r.term || null,
        academic_year: r.academic_year || null,
        student_id: r.student_id || null,
        student_name: r.student_name || null,
        payer_name: r.payer_name || null,
        payer_phone: r.payer_phone || null,
        payer_email: r.payer_email || null,
        total_rwf: Number(r.total_rwf || 0),
        status: st,
        pay_mode: isLoan ? 'loan' : 'full',
        loan_total_due_rwf: loanTotalDue,
        loan_paid_rwf: loanPaid,
        loan_pending_rwf: Number(r.pending_loan_rwf || 0),
        loan_remaining_rwf: loanRemaining,
        loan_due_date: plan?.due_date || null,
        loan_overdue_months: Number(plan?.overdue_months || 0),
        loan_overdue_extra_rwf: Number(plan?.overdue_extra_rwf || 0),
        loan_monthly_installment_rwf: Number(plan?.monthly_installment_rwf || 0),
        created_at: r.created_at,
      };
    });

    const summary = mapped.reduce((acc, r) => {
      acc.total += 1;
      acc.total_rwf += Number(r.total_rwf || 0);
      if (r.status === 'paid') {
        acc.paid += 1;
        acc.paid_rwf += Number(r.total_rwf || 0);
      } else if (r.status === 'submitted') acc.submitted += 1;
      else if (r.status === 'failed') acc.failed += 1;
      if (r.pay_mode === 'loan') acc.loans += 1;
      return acc;
    }, { total: 0, paid: 0, submitted: 0, failed: 0, loans: 0, total_rwf: 0, paid_rwf: 0 });

    const uniq = (arr) => Array.from(new Set(arr.filter(Boolean)));
    const filters = {
      schools: uniq(mapped.map((r) => `${r.school_id}::${r.school_name}`)).map((x) => {
        const [id, name] = x.split('::');
        return { id: Number(id), school_name: name };
      }),
      terms: uniq(mapped.map((r) => r.term)),
      academic_years: uniq(mapped.map((r) => r.academic_year)),
    };

    return res.json({ success: true, data: mapped, summary, filters });
  } catch (err) {
    console.error('[parent-portal/payments-report]', err);
    return res.status(500).json({ success: false, message: 'Failed to load parent payment report' });
  }
});

// ── GET /api/parent-portal/payments-report/export.csv ────────────
// Parent-only CSV export with current filters.
router.get('/parent-portal/payments-report/export.csv', async (req, res) => {
  try {
    await ensureLoanRepaymentTable();
    const role = (req.session?.user?.role?.code || req.session?.roleCode || '').toUpperCase();
    const phone = req.session?.user?.parent_phone || null;
    if (role !== 'PARENT' || !phone) {
      return res.status(401).json({ success: false, message: 'Not authenticated as parent' });
    }

    const term = String(req.query.term || '').trim();
    const academicYear = String(req.query.academic_year || '').trim();
    const schoolId = Number(req.query.school_id || 0);
    const status = String(req.query.status || '').trim().toLowerCase();
    const dateFrom = String(req.query.date_from || '').trim();
    const dateTo = String(req.query.date_to || '').trim();

    const phoneNorm = normalizePhone(phone);
    if (!phoneNorm) {
      return res.status(401).send('Not authenticated');
    }
    const ownWhereCsv = sqlStudentMatchesParentPhoneExpr('');
    const [ownedRowsCsv] = await promisePool.query(
      `SELECT id, father_phone, mother_phone FROM students WHERE ${ownWhereCsv}`,
      bindParentPhoneMatchParams(phoneNorm)
    );
    const ownedIds = (ownedRowsCsv || [])
      .filter((r) => studentRowOwnedByPhone(r, phoneNorm))
      .map((r) => Number(r.id))
      .filter(Boolean);
    if (!ownedIds.length) {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="parent-payments-${new Date().toISOString().slice(0, 10)}.csv"`);
      return res.send('id,student_name,student_id,school_name,class_name,term,academic_year,status,pay_mode,total_rwf,created_at\n');
    }

    const where = [];
    const params = [];
    const studentFilter = `CAST(JSON_UNQUOTE(JSON_EXTRACT(i.payload_json, '$.selected_student.student_id')) AS UNSIGNED)`;
    where.push(`(${studentFilter} IN (${ownedIds.map(() => '?').join(',')}))`);
    params.push(...ownedIds);
    if (term) {
      where.push(`COALESCE(b.term, '') = ?`);
      params.push(term);
    }
    if (academicYear) {
      where.push(`COALESCE(b.academic_year, '') = ?`);
      params.push(academicYear);
    }
    if (schoolId) {
      where.push(`i.school_id = ?`);
      params.push(schoolId);
    }
    if (status && ['submitted', 'paid', 'failed', 'draft'].includes(status)) {
      where.push(`LOWER(COALESCE(i.status, 'draft')) = ?`);
      params.push(status);
    }
    if (dateFrom) {
      where.push(`DATE(i.created_at) >= DATE(?)`);
      params.push(dateFrom);
    }
    if (dateTo) {
      where.push(`DATE(i.created_at) <= DATE(?)`);
      params.push(dateTo);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [rows] = await promisePool.query(
      `SELECT i.id, i.total_rwf, i.status, i.created_at,
              i.payload_json,
              COALESCE(SUM(CASE WHEN LOWER(COALESCE(lr.status,'pending'))='approved' THEN lr.amount_rwf ELSE 0 END), 0) AS paid_loan_rwf,
              COALESCE(SUM(CASE WHEN LOWER(COALESCE(lr.status,'pending'))='pending' THEN lr.amount_rwf ELSE 0 END), 0) AS pending_loan_rwf,
              s.school_name, b.class_name, b.term, b.academic_year,
              JSON_UNQUOTE(JSON_EXTRACT(i.payload_json, '$.selected_student.student_id')) AS student_id,
              JSON_UNQUOTE(JSON_EXTRACT(i.payload_json, '$.selected_student.student_name')) AS student_name,
              JSON_UNQUOTE(JSON_EXTRACT(i.payload_json, '$.payment_plan.payMode')) AS pay_mode
       FROM babyeyi_payment_intents i
       LEFT JOIN schools s ON s.id = i.school_id
       LEFT JOIN school_babyeyi b ON b.id = i.babyeyi_id
       LEFT JOIN babyeyi_loan_repayments lr ON lr.intent_id = i.id
       ${whereSql}
       GROUP BY i.id
       ORDER BY i.created_at DESC, i.id DESC`,
      params
    );

    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const header = [
      'id', 'student_name', 'student_id', 'school_name', 'class_name',
      'term', 'academic_year', 'status', 'pay_mode', 'total_rwf', 'loan_total_due_rwf', 'loan_paid_rwf', 'loan_remaining_rwf', 'loan_pending_rwf', 'created_at',
    ];
    const lines = [header.map(esc).join(',')];
    (rows || []).forEach((r) => {
      const isLoan = String(r.pay_mode || '').toLowerCase() === 'loan';
      let payload = {};
      try { payload = JSON.parse(r.payload_json || '{}'); } catch { payload = {}; }
      const plan = isLoan ? buildLoanPlan(r.total_rwf, payload, r.created_at) : null;
      const loanTotalDue = isLoan ? Number(plan.total_due_rwf || 0) : 0;
      const loanPaid = Number(r.paid_loan_rwf || 0);
      const loanRemaining = Math.max(0, Math.round((loanTotalDue - loanPaid) * 100) / 100);
      lines.push([
        r.id,
        r.student_name || '',
        r.student_id || '',
        r.school_name || '',
        r.class_name || '',
        r.term || '',
        r.academic_year || '',
        String(r.status || 'submitted').toLowerCase(),
        String(r.pay_mode || '').toLowerCase() === 'loan' ? 'loan' : 'full',
        Number(r.total_rwf || 0),
        loanTotalDue,
        loanPaid,
        loanRemaining,
        Number(r.pending_loan_rwf || 0),
        r.created_at || '',
      ].map(esc).join(','));
    });
    const csv = `\uFEFF${lines.join('\n')}\n`;
    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="parent-payments-${stamp}.csv"`);
    return res.status(200).send(csv);
  } catch (err) {
    console.error('[parent-portal/payments-report/export.csv]', err);
    return res.status(500).json({ success: false, message: 'Failed to export parent payment report' });
  }
});

// ── GET /api/parent-portal/loan-intents/:id/detail ───────────────
router.get('/parent-portal/loan-intents/:id/detail', async (req, res) => {
  try {
    await ensureLoanRepaymentTable();
    const role = (req.session?.user?.role?.code || req.session?.roleCode || '').toUpperCase();
    const phone = req.session?.user?.parent_phone || null;
    if (role !== 'PARENT' || !phone) {
      return res.status(401).json({ success: false, message: 'Not authenticated as parent' });
    }
    const phoneNorm = normalizePhone(phone);
    const id = Number(req.params.id || 0);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid intent id' });
    const [rows] = await promisePool.query(
      `SELECT i.id, i.status, i.total_rwf, i.created_at, i.payload_json, i.payer_phone,
              s.school_name, b.class_name, b.term, b.academic_year
       FROM babyeyi_payment_intents i
       LEFT JOIN schools s ON s.id = i.school_id
       LEFT JOIN school_babyeyi b ON b.id = i.babyeyi_id
       WHERE i.id = ?
       LIMIT 1`,
      [id]
    );
    const row = rows?.[0];
    if (!row) return res.status(404).json({ success: false, message: 'Intent not found' });
    let payload = {};
    try { payload = JSON.parse(row.payload_json || '{}'); } catch { payload = {}; }
    const studentId = Number(payload?.selected_student?.student_id || 0);
    let ownsByStudent = false;
    if (studentId && phoneNorm) {
      const [[stu]] = await promisePool.query(
        `SELECT id, father_phone, mother_phone FROM students WHERE id = ? LIMIT 1`,
        [studentId]
      );
      ownsByStudent = !!(stu && studentRowOwnedByPhone(stu, phoneNorm));
    }
    if (!ownsByStudent) {
      return res.status(403).json({ success: false, message: 'Access denied for this loan' });
    }
    const isLoan = String(payload?.payment_plan?.payMode || '').toLowerCase() === 'loan';
    if (!isLoan) return res.status(400).json({ success: false, message: 'This intent is not a loan' });

    const [repays] = await promisePool.query(
      `SELECT id, receipt_no, amount_rwf, status, note, created_at, reviewed_by, reviewed_at
       FROM babyeyi_loan_repayments
       WHERE intent_id = ?
       ORDER BY created_at DESC, id DESC`,
      [id]
    );
    const paid = (repays || []).reduce((s, r) => s + (String(r.status || '').toLowerCase() === 'approved' ? Number(r.amount_rwf || 0) : 0), 0);
    const pendingAmount = (repays || []).reduce((s, r) => s + (String(r.status || '').toLowerCase() === 'pending' ? Number(r.amount_rwf || 0) : 0), 0);
    const plan = buildLoanPlan(row.total_rwf, payload, row.created_at);
    const totalDue = Number(plan.total_due_rwf || 0);
    const remaining = Math.max(0, Math.round((totalDue - paid) * 100) / 100);
    return res.json({
      success: true,
      data: {
        intent_id: id,
        status: row.status,
        school_name: row.school_name,
        class_name: row.class_name,
        term: row.term,
        academic_year: row.academic_year,
        student: payload?.selected_student || null,
        loan: {
          base_due_rwf: Number(plan.base_due_rwf || 0),
          total_due_rwf: totalDue,
          paid_rwf: Math.round(paid * 100) / 100,
          pending_rwf: Math.round(pendingAmount * 100) / 100,
          remaining_rwf: remaining,
          months: plan.months || null,
          extension_months: plan.extension_months || 0,
          due_date: plan.due_date || null,
          overdue_months: Number(plan.overdue_months || 0),
          overdue_extra_rwf: Number(plan.overdue_extra_rwf || 0),
          monthly_installment_rwf: Number(plan.monthly_installment_rwf || 0),
          frequency: payload?.payment_plan?.loanFreq || null,
          summary: payload?.payment_plan?.loanSummary || null,
        },
        repayments: repays || [],
      },
    });
  } catch (err) {
    console.error('[parent-portal/loan-intents/:id/detail]', err);
    return res.status(500).json({ success: false, message: 'Failed to load loan detail' });
  }
});

// ── POST /api/parent-portal/loan-intents/:id/pay ─────────────────
router.post('/parent-portal/loan-intents/:id/pay', async (req, res) => {
  try {
    await ensureLoanRepaymentTable();
    await ensureStudentAccessTable();
    const role = (req.session?.user?.role?.code || req.session?.roleCode || '').toUpperCase();
    const phone = req.session?.user?.parent_phone || null;
    if (role !== 'PARENT' || !phone) {
      return res.status(401).json({ success: false, message: 'Not authenticated as parent' });
    }
    const phoneNormPay = normalizePhone(phone);
    const id = Number(req.params.id || 0);
    const amount = Number(req.body?.amount_rwf || 0);
    const note = String(req.body?.note || '').trim().slice(0, 255);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid intent id' });
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Enter valid payment amount' });
    }

    const [rows] = await promisePool.query(
      `SELECT i.id, i.total_rwf, i.status, i.payload_json, i.payer_phone
       FROM babyeyi_payment_intents i
       WHERE i.id = ?
       LIMIT 1`,
      [id]
    );
    const row = rows?.[0];
    if (!row) return res.status(404).json({ success: false, message: 'Intent not found' });
    let payload = {};
    try { payload = JSON.parse(row.payload_json || '{}'); } catch { payload = {}; }
    const isLoan = String(payload?.payment_plan?.payMode || '').toLowerCase() === 'loan';
    if (!isLoan) return res.status(400).json({ success: false, message: 'This intent is not a loan' });
    const studentId = Number(payload?.selected_student?.student_id || 0);
    let ownsByStudent = false;
    let accessType = null;
    if (studentId && phoneNormPay) {
      const [[stu]] = await promisePool.query(
        `SELECT id, father_phone, mother_phone FROM students WHERE id = ? LIMIT 1`,
        [studentId]
      );
      ownsByStudent = !!(stu && studentRowOwnedByPhone(stu, phoneNormPay));
      if (ownsByStudent) accessType = 'FULL';
      if (!ownsByStudent) {
        const [[aRow]] = await promisePool.query(
          `SELECT access_type FROM student_access WHERE parent_phone = ? AND student_id = ? LIMIT 1`,
          [phoneNormPay, studentId]
        );
        accessType = aRow?.access_type || null;
      }
    }
    if (!ownsByStudent && !accessType) {
      return res.status(403).json({ success: false, message: 'Access denied for this loan' });
    }

    const [sumRows] = await promisePool.query(
      `SELECT
         COALESCE(SUM(CASE WHEN LOWER(COALESCE(status,'pending'))='approved' THEN amount_rwf ELSE 0 END),0) AS paid,
         COALESCE(SUM(CASE WHEN LOWER(COALESCE(status,'pending'))='pending' THEN amount_rwf ELSE 0 END),0) AS pending
       FROM babyeyi_loan_repayments WHERE intent_id = ?`,
      [id]
    );
    const paidBefore = Number(sumRows?.[0]?.paid || 0);
    const pendingBefore = Number(sumRows?.[0]?.pending || 0);
    const plan = buildLoanPlan(row.total_rwf, payload, row.created_at);
    const totalDue = Number(plan.total_due_rwf || 0);
    const remainingBefore = Math.max(0, Math.round((totalDue - paidBefore - pendingBefore) * 100) / 100);
    if (amount > remainingBefore) {
      return res.status(400).json({
        success: false,
        message: `Payment exceeds remaining balance (${remainingBefore.toLocaleString()} RWF). Pending approvals are included.`,
      });
    }

    const receiptNo = makeReceiptNo(id);
    await promisePool.query(
      `INSERT INTO babyeyi_loan_repayments (intent_id, receipt_no, amount_rwf, status, paid_by_phone, note) VALUES (?, ?, ?, 'pending', ?, ?)`,
      [id, receiptNo, amount, phone, note || null]
    );
    await logParentStudentAction({
      parentPortalAccountId: req.session?.parentPortalAccountId || req.session?.user?.parent_portal_id || null,
      parentPhone: phoneNormPay,
      studentId,
      accessType: accessType || 'LIMITED',
      actionType: 'create_payment',
      endpoint: '/api/parent-portal/loan-intents/:id/pay',
      payload: { intent_id: id, amount_rwf: amount, receipt_no: receiptNo },
    }).catch(() => {});
    return res.json({
      success: true,
      message: 'Loan repayment submitted and waiting for admin approval',
      data: {
        intent_id: id,
        receipt_no: receiptNo,
        amount_rwf: amount,
        status: 'pending',
        approved_paid_rwf: paidBefore,
        pending_paid_rwf: Math.round((pendingBefore + amount) * 100) / 100,
        remaining_rwf: Math.max(0, Math.round((totalDue - paidBefore - pendingBefore - amount) * 100) / 100),
      },
    });
  } catch (err) {
    console.error('[parent-portal/loan-intents/:id/pay]', err);
    return res.status(500).json({ success: false, message: 'Failed to record loan payment' });
  }
});

// ── GET /api/parent-portal/loan-repayments/:id/receipt ───────────
router.get('/parent-portal/loan-repayments/:id/receipt', async (req, res) => {
  try {
    await ensureLoanRepaymentTable();
    const role = (req.session?.user?.role?.code || req.session?.roleCode || '').toUpperCase();
    const phone = req.session?.user?.parent_phone || null;
    if (role !== 'PARENT' || !phone) {
      return res.status(401).json({ success: false, message: 'Not authenticated as parent' });
    }
    const phoneNormRcpt = normalizePhone(phone);
    const repaymentId = Number(req.params.id || 0);
    if (!repaymentId) return res.status(400).json({ success: false, message: 'Invalid repayment id' });
    const [rows] = await promisePool.query(
      `SELECT lr.*, i.payload_json, i.payer_phone, i.created_at AS intent_created_at, i.total_rwf,
              s.school_name, b.class_name, b.term, b.academic_year
       FROM babyeyi_loan_repayments lr
       INNER JOIN babyeyi_payment_intents i ON i.id = lr.intent_id
       LEFT JOIN schools s ON s.id = i.school_id
       LEFT JOIN school_babyeyi b ON b.id = i.babyeyi_id
       WHERE lr.id = ?
       LIMIT 1`,
      [repaymentId]
    );
    const row = rows?.[0];
    if (!row) return res.status(404).json({ success: false, message: 'Repayment not found' });
    let payload = {};
    try { payload = JSON.parse(row.payload_json || '{}'); } catch { payload = {}; }
    const studentId = Number(payload?.selected_student?.student_id || 0);
    let ownsByStudent = false;
    if (studentId && phoneNormRcpt) {
      const [[stu]] = await promisePool.query(
        `SELECT id, father_phone, mother_phone FROM students WHERE id = ? LIMIT 1`,
        [studentId]
      );
      ownsByStudent = !!(stu && studentRowOwnedByPhone(stu, phoneNormRcpt));
    }
    if (!ownsByStudent) {
      return res.status(403).json({ success: false, message: 'Access denied for this receipt' });
    }
    const plan = buildLoanPlan(row.total_rwf, payload, row.intent_created_at);
    return res.json({
      success: true,
      data: {
        receipt_no: row.receipt_no || `RCP-${row.id}`,
        repayment_id: row.id,
        intent_id: row.intent_id,
        amount_rwf: Number(row.amount_rwf || 0),
        status: row.status || 'pending',
        note: row.note || null,
        created_at: row.created_at,
        reviewed_at: row.reviewed_at || null,
        student: payload?.selected_student || null,
        school_name: row.school_name || null,
        class_name: row.class_name || null,
        term: row.term || null,
        academic_year: row.academic_year || null,
        loan: {
          months: plan.months,
          extension_months: plan.extension_months,
          due_date: plan.due_date,
          monthly_installment_rwf: plan.monthly_installment_rwf,
          total_due_rwf: plan.total_due_rwf,
        },
      },
    });
  } catch (err) {
    console.error('[parent-portal/loan-repayments/:id/receipt]', err);
    return res.status(500).json({ success: false, message: 'Failed to load receipt detail' });
  }
});

function normalizeWeekday(v) {
  const s = String(v || '').trim().toLowerCase();
  if (!s) return '';
  const map = {
    mon: 'Monday', monday: 'Monday',
    tue: 'Tuesday', tues: 'Tuesday', tuesday: 'Tuesday',
    wed: 'Wednesday', wednesday: 'Wednesday',
    thu: 'Thursday', thur: 'Thursday', thurs: 'Thursday', thursday: 'Thursday',
    fri: 'Friday', friday: 'Friday',
    sat: 'Saturday', saturday: 'Saturday',
    sun: 'Sunday', sunday: 'Sunday',
  };
  return map[s] || '';
}

function dayNameFromDate(v) {
  if (!v) return '';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { weekday: 'long' });
}

// ── Parent child details filters (attendance/discipline) ──────────
router.get('/parent-portal/student-details/filters', async (req, res) => {
  try {
    const role = (req.session?.user?.role?.code || req.session?.roleCode || '').toUpperCase();
    const parentPhone = normalizePhone(req.session?.user?.parent_phone || '');
    if (role !== 'PARENT' || !parentPhone) {
      return res.status(401).json({ success: false, message: 'Not authenticated as parent' });
    }

    const studentRef = String(req.query?.student_ref || req.query?.student_id || '').trim();
    if (!studentRef) return res.status(400).json({ success: false, message: 'student_ref is required' });
    const st = await resolveParentStudentAccessByRef(parentPhone, studentRef);
    if (!st) return res.status(403).json({ success: false, message: 'No access to this student' });
    const studentId = Number(st.id);

    const [yearsRows] = await promisePool.query(
      `SELECT DISTINCT academic_year FROM students WHERE id = ? AND academic_year IS NOT NULL AND TRIM(academic_year) <> ''
       UNION DISTINCT
       SELECT DISTINCT academic_year FROM dos_student_academic_records WHERE student_id = ? AND academic_year IS NOT NULL AND TRIM(academic_year) <> ''
       UNION DISTINCT
       SELECT DISTINCT academic_year FROM discipline_cases WHERE student_id = ? AND academic_year IS NOT NULL AND TRIM(academic_year) <> ''
       UNION DISTINCT
       SELECT DISTINCT academic_year FROM attendance_class WHERE id IN (
         SELECT DISTINCT attendance_id FROM attendance_class_details WHERE student_id = ?
       )
       UNION DISTINCT
       SELECT DISTINCT tt.academic_year
       FROM academic_attendance_logs al
       INNER JOIN academic_attendance_records ar ON ar.log_id = al.id
       INNER JOIN academic_timetables tt ON tt.id = al.timetable_id AND tt.school_id = al.school_id
       WHERE ar.student_id = ? AND tt.academic_year IS NOT NULL AND TRIM(tt.academic_year) <> ''
       ) AND academic_year IS NOT NULL AND TRIM(academic_year) <> ''`,
      [studentId, studentId, studentId, studentId, studentId]
    ).catch(() => [[]]);

    const [termsRows] = await promisePool.query(
      `SELECT DISTINCT term FROM dos_student_academic_records WHERE student_id = ? AND term IS NOT NULL AND TRIM(term) <> ''
       UNION DISTINCT
       SELECT DISTINCT term FROM discipline_cases WHERE student_id = ? AND term IS NOT NULL AND TRIM(term) <> ''
       UNION DISTINCT
       SELECT DISTINCT term FROM attendance_class WHERE id IN (
         SELECT DISTINCT attendance_id FROM attendance_class_details WHERE student_id = ?
       )
       UNION DISTINCT
       SELECT DISTINCT tt.term
       FROM academic_attendance_logs al
       INNER JOIN academic_attendance_records ar ON ar.log_id = al.id
       INNER JOIN academic_timetables tt ON tt.id = al.timetable_id AND tt.school_id = al.school_id
       WHERE ar.student_id = ? AND tt.term IS NOT NULL AND TRIM(tt.term) <> ''
       ) AND term IS NOT NULL AND TRIM(term) <> ''`,
      [studentId, studentId, studentId, studentId]
    ).catch(() => [[]]);

    const years = Array.from(new Set((yearsRows || []).map((r) => String(r.academic_year || '').trim()).filter(Boolean)));
    const terms = Array.from(new Set((termsRows || []).map((r) => String(r.term || '').trim()).filter(Boolean)));
    const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    return res.json({ success: true, data: { academic_years: years, terms, weekdays } });
  } catch (err) {
    console.error('[parent-portal/student-details/filters]', err);
    return res.status(500).json({ success: false, message: 'Failed to load filters' });
  }
});

// ── Parent child details academics (mock marks as requested) ─────
router.get('/parent-portal/student-details/academics', async (req, res) => {
  try {
    const role = (req.session?.user?.role?.code || req.session?.roleCode || '').toUpperCase();
    const parentPhone = normalizePhone(req.session?.user?.parent_phone || '');
    if (role !== 'PARENT' || !parentPhone) {
      return res.status(401).json({ success: false, message: 'Not authenticated as parent' });
    }

    const studentRef = String(req.query?.student_ref || req.query?.student_id || '').trim();
    if (!studentRef) return res.status(400).json({ success: false, message: 'student_ref is required' });
    const st = await resolveParentStudentAccessByRef(parentPhone, studentRef);
    if (!st) return res.status(403).json({ success: false, message: 'No access to this student' });
    const studentId = Number(st.id);

    const academicYear = String(req.query?.academic_year || '').trim();
    const term = String(req.query?.term || '').trim();

    // Mocked data by request (can be replaced later with real gradebook matrix).
    const mockSubjects = [
      { subject: 'Mathematics', score: 84, max: 100, remark: 'Good progress' },
      { subject: 'English', score: 88, max: 100, remark: 'Very good' },
      { subject: 'Science', score: 82, max: 100, remark: 'Consistent' },
      { subject: 'Social Studies', score: 86, max: 100, remark: 'Improving' },
      { subject: 'Kinyarwanda', score: 91, max: 100, remark: 'Excellent' },
    ];
    const avg = Math.round((mockSubjects.reduce((s, x) => s + x.score, 0) / mockSubjects.length) * 10) / 10;
    const classSize = 45;
    const rank = Math.max(1, Math.round((100 - avg) / 6));

    return res.json({
      success: true,
      data: {
        student: {
          id: st.id,
          first_name: st.first_name,
          last_name: st.last_name,
          class_name: st.class_name,
          school_name: st.school_name,
        },
        academic_year: academicYear || null,
        term: term || null,
        overall_gpa_percent: avg,
        class_rank: `${rank} of ${classSize}`,
        subjects: mockSubjects,
      },
    });
  } catch (err) {
    console.error('[parent-portal/student-details/academics]', err);
    return res.status(500).json({ success: false, message: 'Failed to load academics' });
  }
});

// ── Parent attendance proxy (DOS class-period schema) ─────────────
// Returns the same contract shape DOS uses: { periods, roster, ... }.
router.get('/parent-portal/student-details/attendance-dos-proxy', async (req, res) => {
  try {
    const role = (req.session?.user?.role?.code || req.session?.roleCode || '').toUpperCase();
    const parentPhone = normalizePhone(req.session?.user?.parent_phone || '');
    if (role !== 'PARENT' || !parentPhone) {
      return res.status(401).json({ success: false, message: 'Not authenticated as parent' });
    }

    const studentRef = String(req.query?.student_ref || req.query?.student_id || '').trim();
    if (!studentRef) return res.status(400).json({ success: false, message: 'student_ref is required' });
    const st = await resolveParentStudentAccessByRef(parentPhone, studentRef);
    if (!st) return res.status(403).json({ success: false, message: 'No access to this student' });
    const studentId = Number(st.id);

    const toSqlDateLocal = (v) => {
      const d = v ? new Date(v) : new Date();
      if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };
    const date = toSqlDateLocal(req.query?.date);
    const selectedDay = dayNameFromDate(date);
    const className = String(st.class_name || '').trim();
    const term = String(req.query?.term || '').trim();
    const academicYear = String(req.query?.academic_year || '').trim();
    if (!className) {
      return res.status(400).json({ success: false, message: 'Student class is not configured' });
    }

    // Timetable rows for period metadata (same style as DOS payload fields).
    let ttSql = `
      SELECT id, subject_name, start_time, end_time, day_of_week,
             TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))) AS teacher_name
      FROM academic_timetables t
      LEFT JOIN users u ON u.id = t.staff_id
      WHERE t.school_id = ? AND t.class_name = ? AND t.day_of_week = ?
    `;
    const ttParams = [st.school_id, className, selectedDay];
    if (term) {
      ttSql += ' AND t.term = ?';
      ttParams.push(term);
    }
    if (academicYear) {
      ttSql += ' AND t.academic_year = ?';
      ttParams.push(academicYear);
    }
    ttSql += ' ORDER BY t.start_time ASC';
    const [ttRows] = await promisePool.query(ttSql, ttParams).catch(() => [[]]);

    let classSql = `
      SELECT ac.attendance_date, ac.term, ac.academic_year, d.period, d.status, d.remarks
      FROM attendance_class_details d
      INNER JOIN attendance_class ac ON ac.id = d.attendance_id
      WHERE d.student_id = ? AND ac.attendance_date = ?
    `;
    const classParams = [studentId, date];
    if (term) {
      classSql += ' AND ac.term = ?';
      classParams.push(term);
    }
    if (academicYear) {
      classSql += ' AND ac.academic_year = ?';
      classParams.push(academicYear);
    }
    classSql += ' ORDER BY d.period ASC';
    const [detailRows] = await promisePool.query(classSql, classParams).catch(() => [[]]);

    const uniqueStarts = Array.from(
      new Set((ttRows || []).map((r) => String(r.start_time || '').trim()).filter(Boolean))
    ).sort();
    const periodByStart = new Map(uniqueStarts.map((start, idx) => [start, `P${idx + 1}`]));
    const periodCodes = Array.from(
      new Set([
        ...(detailRows || []).map((r) => String(r.period || '').trim()).filter(Boolean),
        ...(ttRows || []).map((r) => periodByStart.get(String(r.start_time || '').trim()) || '').filter(Boolean),
      ])
    ).sort((a, b) => {
      const na = Number(String(a).replace(/[^\d]/g, ''));
      const nb = Number(String(b).replace(/[^\d]/g, ''));
      if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
      return String(a).localeCompare(String(b));
    });

    const ttByPeriod = new Map();
    for (const r of ttRows || []) {
      const p = periodByStart.get(String(r.start_time || '').trim());
      if (!p || ttByPeriod.has(p)) continue;
      ttByPeriod.set(p, r);
    }
    const periods = periodCodes.map((p) => {
      const meta = ttByPeriod.get(p);
      return {
        period: p,
        subject: meta?.subject_name || '',
        start_time: meta?.start_time || null,
        end_time: meta?.end_time || null,
        day_of_week: selectedDay || meta?.day_of_week || null,
        timetable_id: meta?.id || null,
        teacher_name: meta?.teacher_name || '',
      };
    });

    const statusByPeriod = new Map((detailRows || []).map((r) => [String(r.period || '').trim(), r]));
    const periodStatuses = {};
    const remarksLines = [];
    for (const p of periodCodes) {
      const row = statusByPeriod.get(p);
      periodStatuses[p] = row?.status || 'NotMarked';
      if (row?.remarks) remarksLines.push(`${p}: ${row.remarks}`);
    }
    const [[stCode]] = await promisePool.query(
      `SELECT student_uid FROM students WHERE id = ? LIMIT 1`,
      [studentId]
    ).catch(() => [[null]]);
    const roster = [{
      student_id: studentId,
      student_uid: stCode?.student_uid || null,
      student_name: `${st.first_name || ''} ${st.last_name || ''}`.trim() || 'Student',
      period_statuses: periodStatuses,
      remarks: remarksLines.join(' | '),
    }];

    return res.json({
      success: true,
      data: {
        class_name: className,
        term: term || null,
        academic_year: academicYear || null,
        date,
        selected_day: selectedDay,
        timetable_mode: 'parent_proxy',
        periods,
        roster,
      },
    });
  } catch (err) {
    console.error('[parent-portal/student-details/attendance-dos-proxy]', err);
    return res.status(500).json({ success: false, message: 'Failed to load DOS attendance proxy' });
  }
});

// ── Parent-native attendance API (class period + entry/exit) ──────
router.get('/parent-portal/student-attendance', async (req, res) => {
  try {
    const role = (req.session?.user?.role?.code || req.session?.roleCode || '').toUpperCase();
    const parentPhone = normalizePhone(req.session?.user?.parent_phone || '');
    if (role !== 'PARENT' || !parentPhone) {
      return res.status(401).json({ success: false, message: 'Not authenticated as parent' });
    }

    const studentRef = String(req.query?.student_ref || req.query?.student_id || '').trim();
    if (!studentRef) return res.status(400).json({ success: false, message: 'student_ref is required' });
    const st = await resolveParentStudentAccessByRef(parentPhone, studentRef);
    if (!st) return res.status(403).json({ success: false, message: 'No access to this student' });
    const studentId = Number(st.id);

    const type = String(req.query?.type || 'class').trim().toLowerCase(); // class | entry_exit
    const academicYear = String(req.query?.academic_year || '').trim();
    const term = String(req.query?.term || '').trim();
    const specificDate = String(req.query?.date || '').trim();
    const weekday = normalizeWeekday(req.query?.weekday);

    const summarizeClass = (rows) => {
      const s = { present: 0, absent: 0, late: 0, excused: 0, other: 0, total: rows.length };
      for (const r of rows) {
        const k = String(r.status || '').trim().toLowerCase();
        if (k === 'present') s.present += 1;
        else if (k === 'absent') s.absent += 1;
        else if (k === 'late') s.late += 1;
        else if (k === 'excused') s.excused += 1;
        else s.other += 1;
      }
      return s;
    };
    const summarizeEntryExit = (rows) => {
      const s = { present: 0, absent: 0, late: 0, missing: 0, other: 0, total: rows.length };
      for (const r of rows) {
        const inS = String(r.status_in || '').trim().toLowerCase();
        const outS = String(r.status_out || '').trim().toLowerCase();
        const key = inS || outS;
        if (key === 'present') s.present += 1;
        else if (key === 'absent') s.absent += 1;
        else if (key === 'late') s.late += 1;
        else if (key === 'missing') s.missing += 1;
        else s.other += 1;
      }
      return s;
    };

    if (type === 'entry_exit') {
      let sql = `
        SELECT attendance_date, check_in, check_out, status_in, status_out, source_in, source_out, notes
        FROM attendance_student
        WHERE student_id = ?
      `;
      const params = [studentId];
      if (specificDate) {
        sql += ' AND attendance_date = ?';
        params.push(specificDate);
      }
      sql += ' ORDER BY attendance_date DESC LIMIT 365';
      const [rows] = await promisePool.query(sql, params).catch(() => [[]]);
      const filtered = (rows || []).filter((r) => !weekday || dayNameFromDate(r.attendance_date) === weekday);
      return res.json({
        success: true,
        data: { type: 'entry_exit', student_id: studentId, rows: filtered, summary: summarizeEntryExit(filtered) },
      });
    }

    let classSql = `
      SELECT ac.attendance_date, ac.term, ac.academic_year, d.period, d.status, d.remarks
      FROM attendance_class_details d
      INNER JOIN attendance_class ac ON ac.id = d.attendance_id
      WHERE d.student_id = ?
    `;
    const classParams = [studentId];
    if (academicYear) {
      classSql += ' AND ac.academic_year = ?';
      classParams.push(academicYear);
    }
    if (term) {
      classSql += ' AND ac.term = ?';
      classParams.push(term);
    }
    if (specificDate) {
      classSql += ' AND ac.attendance_date = ?';
      classParams.push(specificDate);
    }
    classSql += ' ORDER BY ac.attendance_date DESC, d.period ASC LIMIT 1000';
    const [classRows] = await promisePool.query(classSql, classParams).catch(() => [[]]);
    let filtered = (classRows || []).filter((r) => !weekday || dayNameFromDate(r.attendance_date) === weekday);

    // DOS-compatible fallback: if no attendance_class rows exist, read teacher attendance logs.
    if (!filtered.length) {
      let fallbackSql = `
        SELECT
          al.record_date AS attendance_date,
          tt.term,
          tt.academic_year,
          COALESCE(NULLIF(TRIM(tt.start_time), ''), 'Period') AS period,
          NULLIF(TRIM(tt.subject_name), '') AS course_name,
          CASE
            WHEN LOWER(TRIM(ar.status)) IN ('present', 'on_time', 'ontime') THEN 'Present'
            WHEN LOWER(TRIM(ar.status)) IN ('late') THEN 'Late'
            WHEN LOWER(TRIM(ar.status)) IN ('absent', 'missing') THEN 'Absent'
            WHEN LOWER(TRIM(ar.status)) IN ('excused') THEN 'Excused'
            ELSE 'NotMarked'
          END AS status,
          ar.remarks
        FROM academic_attendance_logs al
        INNER JOIN academic_attendance_records ar ON ar.log_id = al.id
        INNER JOIN academic_timetables tt ON tt.id = al.timetable_id AND tt.school_id = al.school_id
        WHERE ar.student_id = ?
      `;
      const fallbackParams = [studentId];
      if (academicYear) {
        fallbackSql += ' AND tt.academic_year = ?';
        fallbackParams.push(academicYear);
      }
      if (term) {
        fallbackSql += ' AND tt.term = ?';
        fallbackParams.push(term);
      }
      if (specificDate) {
        fallbackSql += ' AND al.record_date = ?';
        fallbackParams.push(specificDate);
      }
      fallbackSql += ' ORDER BY al.record_date DESC, tt.start_time ASC LIMIT 1000';
      const [fallbackRows] = await promisePool.query(fallbackSql, fallbackParams).catch(() => [[]]);
      filtered = (fallbackRows || []).filter((r) => !weekday || dayNameFromDate(r.attendance_date) === weekday);
    }

    // Attach course name for class-period rows by mapping timetable day + period.
    if (type === 'class' && filtered.length) {
      const [ttRows] = await promisePool.query(
        `SELECT day_of_week, start_time, subject_name
         FROM academic_timetables
         WHERE school_id = ? AND class_name = ?
           ${term ? 'AND term = ?' : ''}
           ${academicYear ? 'AND academic_year = ?' : ''}
         ORDER BY day_of_week ASC, start_time ASC`,
        [
          st.school_id,
          st.class_name || '',
          ...(term ? [term] : []),
          ...(academicYear ? [academicYear] : []),
        ]
      ).catch(() => [[]]);
      const dayBuckets = new Map();
      for (const r of ttRows || []) {
        const day = String(r.day_of_week || '').trim();
        if (!day) continue;
        if (!dayBuckets.has(day)) dayBuckets.set(day, []);
        dayBuckets.get(day).push(r);
      }
      const subjectByDayPeriod = new Map();
      const subjectByDayTime = new Map();
      for (const [day, rows] of dayBuckets.entries()) {
        const sorted = [...rows].sort((a, b) => String(a.start_time || '').localeCompare(String(b.start_time || '')));
        sorted.forEach((r, idx) => {
          const subject = r.subject_name || '';
          const timeRaw = String(r.start_time || '').trim();
          const hhmm = timeRaw ? timeRaw.slice(0, 5) : '';
          subjectByDayPeriod.set(`${day}:P${idx + 1}`, subject);
          if (hhmm) subjectByDayTime.set(`${day}:${hhmm}`, subject);
        });
      }
      filtered = filtered.map((r) => {
        const day = dayNameFromDate(r.attendance_date);
        const periodRaw = String(r.period || '').trim();
        const periodUpper = periodRaw.toUpperCase();
        const hhmm = periodRaw.length >= 5 ? periodRaw.slice(0, 5) : '';
        const fromTime = hhmm ? subjectByDayTime.get(`${day}:${hhmm}`) : null;
        const fromOrdinal = /^P\d+$/.test(periodUpper) ? subjectByDayPeriod.get(`${day}:${periodUpper}`) : null;
        const resolvedCourse = r.course_name || fromTime || fromOrdinal || null;
        return { ...r, course_name: resolvedCourse };
      });
    }

    return res.json({
      success: true,
      data: { type: 'class', student_id: studentId, class_name: st.class_name || '', rows: filtered, summary: summarizeClass(filtered) },
    });
  } catch (err) {
    console.error('[parent-portal/student-attendance]', err);
    return res.status(500).json({ success: false, message: 'Failed to load parent attendance' });
  }
});

// ── Parent-native discipline API (from discipline_cases table) ────
router.get('/parent-portal/student-discipline', async (req, res) => {
  try {
    const role = (req.session?.user?.role?.code || req.session?.roleCode || '').toUpperCase();
    const parentPhone = normalizePhone(req.session?.user?.parent_phone || '');
    if (role !== 'PARENT' || !parentPhone) {
      return res.status(401).json({ success: false, message: 'Not authenticated as parent' });
    }

    const studentRef = String(req.query?.student_ref || req.query?.student_id || '').trim();
    if (!studentRef) return res.status(400).json({ success: false, message: 'student_ref is required' });
    const st = await resolveParentStudentAccessByRef(parentPhone, studentRef);
    if (!st) return res.status(403).json({ success: false, message: 'No access to this student' });
    const studentId = Number(st.id);

    const academicYear = String(req.query?.academic_year || '').trim();
    const term = String(req.query?.term || '').trim();
    const specificDate = String(req.query?.date || '').trim();
    const weekday = normalizeWeekday(req.query?.weekday);

    const loadRows = async ({ strictSchool = true } = {}) => {
      let sql = `
        SELECT id, student_id, action, marks, reason, notes, action_date, previous_marks, new_marks, created_at
        FROM discipline_mark_logs
        WHERE student_id = ? AND undone_at IS NULL
      `;
      const params = [studentId];
      if (strictSchool) {
        sql += ' AND school_id = ?';
        params.push(st.school_id);
      }
      if (specificDate) {
        sql += ' AND (DATE(action_date) = DATE(?) OR DATE(created_at) = DATE(?))';
        params.push(specificDate, specificDate);
      }
      sql += ' ORDER BY created_at DESC LIMIT 500';
      const [rows] = await promisePool.query(sql, params).catch(() => [[]]);
      return (rows || []).filter((r) => !weekday || dayNameFromDate(r.action_date || r.created_at) === weekday);
    };

    let filtered = await loadRows({ strictSchool: true });
    // Legacy compatibility: older discipline rows may have missing/mismatched school_id.
    if (!filtered.length) {
      filtered = await loadRows({ strictSchool: false });
    }

    // Student-id migration compatibility:
    // If discipline was recorded under an older student_id, recover using stable student references.
    if (!filtered.length) {
      const stCode = String(st.student_code || '').trim();
      const stUid = String(st.student_uid || '').trim();
      const stSdm = String(st.sdm_code || '').trim();
      if (stCode || stUid || stSdm) {
        const loadByStudentRef = async ({ strictSchool = true } = {}) => {
          let sql = `
            SELECT c.id, c.student_id, c.action, c.marks, c.reason, c.notes, c.action_date, c.previous_marks, c.new_marks, c.created_at
            FROM discipline_mark_logs c
            INNER JOIN students s ON s.id = c.student_id
            WHERE c.undone_at IS NULL AND (
              (? <> '' AND s.student_code = ?)
              OR (? <> '' AND s.student_uid = ?)
              OR (? <> '' AND s.sdm_code = ?)
            )
          `;
          const params = [stCode, stCode, stUid, stUid, stSdm, stSdm];
          if (strictSchool) {
            sql += ' AND c.school_id = ?';
            params.push(st.school_id);
          }
          if (specificDate) {
            sql += ' AND (DATE(c.action_date) = DATE(?) OR DATE(c.created_at) = DATE(?))';
            params.push(specificDate, specificDate);
          }
          sql += ' ORDER BY c.created_at DESC LIMIT 500';
          const [rows] = await promisePool.query(sql, params).catch(() => [[]]);
          return (rows || []).filter((r) => !weekday || dayNameFromDate(r.action_date || r.created_at) === weekday);
        };

        filtered = await loadByStudentRef({ strictSchool: true });
        if (!filtered.length) {
          filtered = await loadByStudentRef({ strictSchool: false });
        }
      }
    }
    
    // If discipline_mark_logs is empty, fallback to legacy discipline_cases
    if (!filtered.length) {
      const loadLegacyCases = async () => {
        let sql = `
          SELECT id, student_id, academic_year, term, class_name,
                 lesson_subject AS case_name, lesson_subject, description,
                 marks_deducted AS marks_removed, marks_deducted, marks_remaining_after, created_at
          FROM discipline_cases
          WHERE student_id = ?
        `;
        const params = [studentId];
        if (academicYear) { sql += ' AND academic_year = ?'; params.push(academicYear); }
        if (term) { sql += ' AND term = ?'; params.push(term); }
        sql += ' ORDER BY created_at DESC LIMIT 500';
        const [rows] = await promisePool.query(sql, params).catch(() => [[]]);
        return rows || [];
      };
      filtered = await loadLegacyCases();
      if (!filtered.length && (academicYear || term)) {
         // try without term filtering
         let sql2 = `
           SELECT id, student_id, academic_year, term, class_name,
                  lesson_subject AS case_name, lesson_subject, description,
                  marks_deducted AS marks_removed, marks_deducted, marks_remaining_after, created_at
           FROM discipline_cases
           WHERE student_id = ? ORDER BY created_at DESC LIMIT 500
         `;
         const [rows2] = await promisePool.query(sql2, [studentId]).catch(() => [[]]);
         filtered = rows2 || [];
      }
    }

    const marksDeductedTotal = filtered.reduce((sum, r) => sum + (r.action === 'remove' || !r.action ? Number(r.marks || r.marks_deducted || 0) : 0), 0);
    const marksRemainingLatest = filtered.length ? Number(filtered[0]?.new_marks || filtered[0]?.marks_remaining_after || 0) : 0;
    const [[defMarksRow]] = await promisePool.query(
      `SELECT default_marks FROM school_discipline_default_marks WHERE school_id = ? LIMIT 1`,
      [st.school_id]
    ).catch(() => [[null]]);
    const disciplineDefaultMarks = defMarksRow?.default_marks != null ? Number(defMarksRow.default_marks) : 40;

    return res.json({
      success: true,
      data: {
        student_id: studentId,
        class_name: st.class_name || '',
        rows: filtered,
        summary: {
          cases_count: filtered.length,
          marks_deducted_total: marksDeductedTotal,
          marks_remaining_latest: marksRemainingLatest,
          discipline_default_marks: disciplineDefaultMarks,
        },
      },
    });
  } catch (err) {
    console.error('[parent-portal/student-discipline]', err);
    return res.status(500).json({ success: false, message: 'Failed to load parent discipline' });
  }
});

module.exports = router;
