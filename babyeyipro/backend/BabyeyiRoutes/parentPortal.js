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
            sc.school_name, sc.school_code
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
    const role = (req.session?.user?.role?.code || req.session?.roleCode || '').toUpperCase();
    const parentPhone = req.session?.user?.parent_phone;
    if (role !== 'PARENT' || !parentPhone) {
      return res.status(401).json({ success: false, message: 'Not authenticated as parent' });
    }
    const np = normalizePhone(parentPhone);
    if (!np) {
      return res.status(400).json({ success: false, message: 'Invalid parent session phone' });
    }
    const st = await findStudentRowByCode(
      req.body?.code ?? req.body?.student_uid ?? req.body?.sdm_code ?? req.body?.sdmCode
    );
    if (!st) {
      return res.json({ success: false, notFound: true });
    }
    if (fieldContainsNormalizedPhone(st.father_phone, np) || fieldContainsNormalizedPhone(st.mother_phone, np)) {
      return res.json({
        success: true,
        linked: true,
        alreadyLinked: true,
        data: {
          student_uid: st.student_uid,
          first_name: st.first_name,
          last_name: st.last_name,
          school_name: st.school_name,
          class_name: st.class_name,
        },
      });
    }
    if (phoneSlotEmpty(st.father_phone)) {
      await promisePool.query('UPDATE students SET father_phone = ? WHERE id = ?', [np, st.id]);
      return res.json({
        success: true,
        linked: true,
        slot: 'father',
        data: {
          student_uid: st.student_uid,
          first_name: st.first_name,
          last_name: st.last_name,
          school_name: st.school_name,
          class_name: st.class_name,
        },
      });
    }
    if (phoneSlotEmpty(st.mother_phone)) {
      await promisePool.query('UPDATE students SET mother_phone = ? WHERE id = ?', [np, st.id]);
      return res.json({
        success: true,
        linked: true,
        slot: 'mother',
        data: {
          student_uid: st.student_uid,
          first_name: st.first_name,
          last_name: st.last_name,
          school_name: st.school_name,
          class_name: st.class_name,
        },
      });
    }
    return res.status(409).json({
      success: false,
      code: 'PHONE_MISMATCH',
      message:
        'This learner is already linked to another parent phone. Ask the school to update your number on the student record.',
    });
  } catch (err) {
    console.error('[parent-portal/link-student-by-code]', err);
    return res.status(500).json({ success: false, message: 'Could not link student' });
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

// ── GET /api/parent-portal/children ─────────────────────────────
router.get('/parent-portal/children', async (req, res) => {
  try {
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
    const students = (candidates || [])
      .filter((r) => studentRowOwnedByPhone(r, phone))
      .map(({ father_phone, mother_phone, ...rest }) => rest);
    return res.json({ success: true, data: students });
  } catch (err) {
    console.error('[parent-portal/children]', err);
    return res.status(500).json({ success: false, message: 'Failed to load children' });
  }
});

// ── GET /api/parent-portal/classkit-pricing?student_id= ─────────
// Returns class requirements + prices for a parent-owned student.
router.get('/parent-portal/classkit-pricing', async (req, res) => {
  try {
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
    if (!st0 || !studentRowOwnedByPhone(st0, phoneNorm)) {
      return res.status(404).json({ success: false, message: 'Student not found for this parent' });
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
    const schoolFeesTotal = (feeRows || []).reduce((s, f) => s + Number(f.amount || 0), 0);
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
        school_fees: feeRows || [],
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
    where.push(`(${studentFilter} IN (${ownedIds.map(() => '?').join(',')}) OR COALESCE(i.payer_phone, '') = ?)`);
    params.push(...ownedIds, phoneNorm);
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
    where.push(`(${studentFilter} IN (${ownedIds.map(() => '?').join(',')}) OR COALESCE(i.payer_phone, '') = ?)`);
    params.push(...ownedIds, phoneNorm);
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
    if (!ownsByStudent && normalizePhone(row.payer_phone) !== phoneNorm) {
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
    if (studentId && phoneNormPay) {
      const [[stu]] = await promisePool.query(
        `SELECT id, father_phone, mother_phone FROM students WHERE id = ? LIMIT 1`,
        [studentId]
      );
      ownsByStudent = !!(stu && studentRowOwnedByPhone(stu, phoneNormPay));
    }
    if (!ownsByStudent && normalizePhone(row.payer_phone) !== phoneNormPay) {
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
    if (!ownsByStudent && normalizePhone(row.payer_phone) !== phoneNormRcpt) {
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

module.exports = router;
