// ================================================================
// accountantFees.js — School accountant: babyeyi fee lookup + collections
//
//   GET  /api/accountant/overview
//   GET  /api/accountant/babyeyi-fee
//   GET  /api/accountant/payments
//   GET  /api/accountant/reports/payments  — per-student fee status for year + term
//   GET  /api/accountant/reports/payments/export.xlsx
//   GET  /api/accountant/reports/payments/export.pdf
//   POST /api/accountant/payments
// ════════════════════════════════════════════════════════════════

const express = require('express');
const xlsx = require('xlsx');
const PDFDocument = require('pdfkit');
const { promisePool } = require('../config/database');
const { requireRole } = require('../middleware/deoAuth');

const router = express.Router();
const ACCOUNTANT_ONLY = ['ACCOUNTANT'];
/** Read-only finance dashboards for school leadership (same fee queries as accountant). */
const ACCOUNTANT_OR_MANAGER_READ = ['ACCOUNTANT', 'SCHOOL_MANAGER', 'SCHOOL_ADMIN'];
const FINANCE_REPORT_READ_ROLES = ['ACCOUNTANT', 'SCHOOL_ADMIN', 'SCHOOL_MANAGER'];

function resolveSchoolId(req) {
  return (
    req.session?.school_id ||
    req.session?.user?.school_id ||
    req.session?.user?.school?.id ||
    null
  );
}

function trimStr(v) {
  if (v === undefined || v === null) return '';
  return String(v).trim();
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

async function getAcademicCalendarSettings(schoolId) {
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
    current_academic_year: trimStr(row?.current_academic_year) || inferAcademicYearFromDate(),
    active_terms: terms,
  };
}

async function resolveAcademicContext(schoolId, academicYearRaw, termRaw) {
  const explicitYear = trimStr(academicYearRaw);
  const explicitTerm = trimStr(termRaw);
  if (explicitYear && explicitTerm) {
    return { academicYear: explicitYear, term: explicitTerm };
  }
  const calendar = await getAcademicCalendarSettings(schoolId);
  return {
    academicYear: explicitYear || calendar.current_academic_year || inferAcademicYearFromDate(),
    term: explicitTerm || inferTermFromMonth(calendar.active_terms),
  };
}

let collectionsTableReady = false;
async function ensureCollectionsTable() {
  if (collectionsTableReady) return;
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS school_fee_collections (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      student_id INT UNSIGNED NOT NULL,
      babyeyi_id INT UNSIGNED NULL,
      academic_year_label VARCHAR(64) NOT NULL,
      term VARCHAR(32) NOT NULL,
      class_name VARCHAR(120) NULL,
      total_due DECIMAL(14,2) NOT NULL DEFAULT 0,
      amount_paid DECIMAL(14,2) NOT NULL DEFAULT 0,
      balance_remaining DECIMAL(14,2) NOT NULL DEFAULT 0,
      recorded_by_user_id INT UNSIGNED NOT NULL,
      notes TEXT NULL,
      payment_method VARCHAR(40) NULL,
      bank_name VARCHAR(120) NULL,
      paid_by VARCHAR(160) NULL,
      transaction_ref VARCHAR(120) NULL,
      momo_phone VARCHAR(32) NULL,
      receipt_no VARCHAR(64) NULL,
      paid_at_date DATE NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_sfc_school (school_id),
      KEY idx_sfc_student (student_id),
      KEY idx_sfc_created (created_at),
      KEY idx_sfc_receipt (receipt_no)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  const alters = [
    'ALTER TABLE school_fee_collections ADD COLUMN total_due DECIMAL(14,2) NOT NULL DEFAULT 0',
    'ALTER TABLE school_fee_collections ADD COLUMN amount_paid DECIMAL(14,2) NOT NULL DEFAULT 0',
    'ALTER TABLE school_fee_collections ADD COLUMN balance_remaining DECIMAL(14,2) NOT NULL DEFAULT 0',
    'ALTER TABLE school_fee_collections ADD COLUMN babyeyi_id INT UNSIGNED NULL',
    'ALTER TABLE school_fee_collections ADD COLUMN academic_year_label VARCHAR(64) NOT NULL DEFAULT ""',
    'ALTER TABLE school_fee_collections ADD COLUMN term VARCHAR(32) NOT NULL DEFAULT ""',
    'ALTER TABLE school_fee_collections ADD COLUMN class_name VARCHAR(120) NULL',
    'ALTER TABLE school_fee_collections ADD COLUMN recorded_by_user_id INT UNSIGNED NOT NULL DEFAULT 0',
    'ALTER TABLE school_fee_collections ADD COLUMN notes TEXT NULL',
    'ALTER TABLE school_fee_collections ADD COLUMN payment_method VARCHAR(40) NULL',
    'ALTER TABLE school_fee_collections ADD COLUMN bank_name VARCHAR(120) NULL',
    'ALTER TABLE school_fee_collections ADD COLUMN paid_by VARCHAR(160) NULL',
    'ALTER TABLE school_fee_collections ADD COLUMN transaction_ref VARCHAR(120) NULL',
    'ALTER TABLE school_fee_collections ADD COLUMN momo_phone VARCHAR(32) NULL',
    'ALTER TABLE school_fee_collections ADD COLUMN receipt_no VARCHAR(64) NULL',
    'ALTER TABLE school_fee_collections ADD COLUMN paid_at_date DATE NULL',
  ];
  for (const sql of alters) {
    await promisePool.query(sql).catch(() => {});
  }
  collectionsTableReady = true;
}

function buildReceiptNo(schoolId, paymentId) {
  const year = new Date().getFullYear();
  return `RCP-${year}-${String(schoolId).padStart(4, '0')}-${String(paymentId).padStart(6, '0')}`;
}

function ymdFromSqlDate(v) {
  if (!v) return '';
  if (v instanceof Date) {
    return [
      v.getFullYear(),
      String(v.getMonth() + 1).padStart(2, '0'),
      String(v.getDate()).padStart(2, '0'),
    ].join('-');
  }
  return String(v).slice(0, 10);
}

function mapPaymentRow(r) {
  if (!r) return null;
  const first = r.first_name || '';
  const last = r.last_name || '';
  return {
    id: r.id,
    student_id: r.student_id,
    academic_year_label: r.academic_year_label,
    term: r.term,
    class_name: r.class_name,
    total_due: Number(r.total_due || 0),
    amount_paid: Number(r.amount_paid || 0),
    balance_remaining: Number(r.balance_remaining || 0),
    notes: r.notes || null,
    payment_method: r.payment_method || null,
    bank_name: r.bank_name || null,
    paid_by: r.paid_by || null,
    transaction_ref: r.transaction_ref || null,
    momo_phone: r.momo_phone || null,
    receipt_no: r.receipt_no || null,
    paid_at_date: r.paid_at_date || null,
    created_at: r.created_at || null,
    first_name: first,
    last_name: last,
    student_name: `${first} ${last}`.trim() || 'Student',
    student_uid: r.student_uid || null,
    student_code: r.student_code || null,
    school_name: r.school_name || null,
    recorded_by_name: r.recorded_by_name || null,
  };
}

function validatePaymentMethodFields(body) {
  const method = trimStr(body.payment_method || body.method) || 'Cash';
  const bankName = trimStr(body.bank_name);
  const paidBy = trimStr(body.paid_by);
  const transactionRef = trimStr(body.transaction_ref || body.receipt_number || body.transaction_number);
  const momoPhone = trimStr(body.momo_phone || body.momo_number);
  const low = method.toLowerCase();

  if (low.includes('bank')) {
    if (!bankName) return { ok: false, message: 'Bank name is required for bank transfer.' };
    if (!paidBy) return { ok: false, message: 'Paid by (payer name) is required for bank transfer.' };
    if (!transactionRef) return { ok: false, message: 'Transaction or receipt number is required for bank transfer.' };
  }
  if (low.includes('mobile') || low.includes('momo')) {
    if (!transactionRef) return { ok: false, message: 'MoMo transaction ID or receipt number is required.' };
  }

  return {
    ok: true,
    payment_method: method,
    bank_name: bankName || null,
    paid_by: paidBy || null,
    transaction_ref: transactionRef || null,
    momo_phone: momoPhone || null,
  };
}

let examinationListTablesReady = false;
async function ensureExaminationListTables() {
  if (examinationListTablesReady) return;
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS school_examination_lists (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      academic_year VARCHAR(64) NOT NULL,
      term VARCHAR(64) NOT NULL,
      class_name VARCHAR(160) NOT NULL,
      published_at DATETIME NULL,
      published_by_user_id INT UNSIGNED NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_exam_list_scope (school_id, academic_year, term, class_name),
      KEY idx_exam_list_school (school_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS school_examination_list_overrides (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      list_id INT UNSIGNED NOT NULL,
      student_id INT UNSIGNED NOT NULL,
      override_mode ENUM('auto','allow','deny') NOT NULL DEFAULT 'auto',
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_exam_ov_student (list_id, student_id),
      KEY idx_exam_ov_student (student_id),
      KEY idx_exam_ov_list (list_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  examinationListTablesReady = true;
}

function resolveActorUserId(req) {
  return req.session?.userId || req.session?.user?.id || req.user?.id || null;
}

/** Fee rule: cleared fees → allowed; unpaid / partial / no Babyeyi card → blocked by default */
function defaultFeesAllowExam(row) {
  const st = String(row.status || '');
  if (st === 'full_pay' || st === 'full') return true;
  if (st === 'not_paid' || st === 'remain_pay' || st === 'no_fee_card') return false;
  return false;
}

/** Match babyeyi academic_year column (may be YEAR or string) to UI values like 2025-2026 */
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
      return arr.some((x) => String(x).toLowerCase() === c.toLowerCase());
    }
  } catch (_) {}
  return false;
}

/** Match stored academic_year_label on a collection row to the report filter (e.g. 2025-2026 vs 2025) */
function collectionYearMatchesFilter(storedLabel, filterYear) {
  const s = trimStr(storedLabel);
  const f = trimStr(filterYear);
  if (!f) return true;
  if (!s) return false;
  if (s === f) return true;
  if (yearMatchesRow(s, f)) return true;
  const sFirst = s.split('-')[0];
  const fFirst = f.split('-')[0];
  if (sFirst && fFirst && sFirst === fFirst) return true;
  return false;
}

/** Match term label across UI vs DB (e.g. "Term 1" vs "TERM 1" vs "term 1"). */
function termKeyLabel(s) {
  const t = trimStr(s).toLowerCase();
  if (!t) return '';
  if (/annual/.test(t)) return 'annual_review';
  const m = t.match(/(\d+)/);
  return m ? `t${Number(m[1])}` : t;
}

function termMatchesRow(rowTerm, inputTerm) {
  const a = trimStr(rowTerm);
  const b = trimStr(inputTerm);
  if (!b) return true;
  if (!a) return false;
  if (a.toLowerCase() === b.toLowerCase()) return true;
  return termKeyLabel(a) === termKeyLabel(b);
}

function statusLabelForExport(status) {
  const m = {
    full_pay: 'Full pay',
    full: 'No fee (0)',
    not_paid: 'Not paid',
    remain_pay: 'Remain to pay',
    no_fee_card: 'No Babyeyi card',
    unknown: '—',
  };
  return m[status] || status;
}

function safeFilenamePart(s) {
  return String(s || 'report').replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 80);
}

function normalizeReportStatusFilter(v) {
  const raw = trimStr(v).toLowerCase();
  if (!raw) return '';
  if (['all', 'any', '*'].includes(raw)) return '';
  if (['full', 'full_pay', 'fully_paid', 'paid_full'].includes(raw)) return 'full_pay';
  if (['partial', 'partially_paid', 'remain_pay', 'remaining'].includes(raw)) return 'remain_pay';
  if (['not_paid', 'unpaid', 'none'].includes(raw)) return 'not_paid';
  if (['no_fee_card', 'no_babyeyi'].includes(raw)) return 'no_fee_card';
  return '';
}

/**
 * Shared report body for JSON + Excel + PDF exports.
 * @param {object} [options]
 * @param {boolean} [options.includeOnlineInvoicePayments=true] — When false, paid amounts come only from
 *   `school_fee_collections` (accountant-recorded / paid-at-school). Online Babyeyi invoice intents are excluded.
 */
async function buildAccountantPaymentReport(schoolId, academicYear, term, classFilter, statusFilterRaw, options = {}) {
  const includeOnlineInvoicePayments = options.includeOnlineInvoicePayments !== false;
  await ensureCollectionsTable();
  await ensureAccountantFeeTotalsTableAcct();

  const [studentRows] = await promisePool.query(
    `SELECT id, student_uid, student_code, first_name, last_name, class_name
     FROM students
     WHERE school_id = ?
     ORDER BY class_name ASC, last_name ASC, first_name ASC`,
    [schoolId]
  );

  const classNamesAll = [
    ...new Set(studentRows.map((s) => trimStr(s.class_name)).filter(Boolean)),
  ].sort();

  let students = studentRows;
  if (classFilter) {
    students = students.filter((s) => trimStr(s.class_name) === classFilter);
  }
  const studentIdByIdentity = new Map();
  for (const st of students) {
    const uid = trimStr(st.student_uid).toUpperCase();
    const code = trimStr(st.student_code).toUpperCase();
    if (uid) studentIdByIdentity.set(uid, Number(st.id));
    if (code) studentIdByIdentity.set(code, Number(st.id));
  }

  const [feeCardRows] = await promisePool.query(
    `SELECT id, babyeyi_id, class_name, classes_json, term, academic_year, total_due
     FROM accountant_babyeyi_fees
     WHERE school_id = ?
     ORDER BY updated_at DESC`,
    [schoolId]
  );

  function totalDueForClass(className) {
    const cn = trimStr(className);
    if (!cn) return null;
    const b = feeCardRows.find(
      (r) =>
        classMatchesBabyeyi(r, cn)
        && yearMatchesRow(r.academic_year, academicYear)
        && termMatchesRow(r.term, term)
    );
    if (!b) return null;
    return Number(b.total_due || 0);
  }

  const [collRows] = await promisePool.query(
    `SELECT student_id, academic_year_label, amount_paid, term
     FROM school_fee_collections
     WHERE school_id = ?`,
    [schoolId]
  );

  const paidByStudent = new Map();
  for (const row of collRows) {
    if (!termMatchesRow(row.term, term)) continue;
    if (!collectionYearMatchesFilter(row.academic_year_label, academicYear)) continue;
    const sid = Number(row.student_id);
    const add = Number(row.amount_paid || 0);
    paidByStudent.set(sid, (paidByStudent.get(sid) || 0) + add);
  }

  // Optional: public/online Babyeyi invoices (payment intents). Representative portal excludes these when only
  // accountant student fees / paid-at-school collections should count.
  let publicPaidRows = [];
  if (includeOnlineInvoicePayments) {
    try {
      const [rows] = await promisePool.query(
        `SELECT i.id, i.total_rwf, i.payload_json, t.class_name, t.classes_json, t.term, t.academic_year
         FROM babyeyi_payment_intents i
         LEFT JOIN accountant_babyeyi_fees t ON t.babyeyi_id = i.babyeyi_id AND t.school_id = i.school_id
         WHERE i.school_id = ?
           AND UPPER(COALESCE(i.invoice_status, 'NOT_PAID')) = 'PAID'
           AND i.babyeyi_id IS NOT NULL`,
        [schoolId]
      );
      publicPaidRows = rows || [];
    } catch (e) {
      publicPaidRows = [];
    }
  }
  for (const row of publicPaidRows) {
    let payload = {};
    try {
      payload = row.payload_json ? JSON.parse(row.payload_json) : {};
    } catch (_) {
      payload = {};
    }
    const intentTerm = trimStr(
      row.term || payload?.term || payload?.babyeyi_term || payload?.babyeyi?.term || ''
    );
    const intentYear = trimStr(
      row.academic_year
      || payload?.academic_year
      || payload?.year
      || payload?.babyeyi_academic_year
      || payload?.babyeyi?.academic_year
      || ''
    );
    if (!termMatchesRow(intentTerm, term)) continue;
    if (!yearMatchesRow(intentYear, academicYear)) continue;
    const classProbe = {
      class_name: row.class_name || payload?.class_name || payload?.class || '',
      classes_json: row.classes_json || payload?.classes_json || [],
    };
    if (classFilter && !classMatchesBabyeyi(classProbe, classFilter)) continue;
    const selectedStudents = Array.isArray(payload?.selected_students)
      ? payload.selected_students
      : (payload?.selected_student ? [payload.selected_student] : []);
    const ids = selectedStudents
      .map((s) => {
        const direct = Number(s?.student_id || 0);
        if (Number.isFinite(direct) && direct > 0) return direct;
        const uid = trimStr(s?.student_uid).toUpperCase();
        const code = trimStr(s?.student_code).toUpperCase();
        return studentIdByIdentity.get(uid) || studentIdByIdentity.get(code) || 0;
      })
      .filter((x) => Number.isFinite(x) && x > 0);
    if (!ids.length) continue;
    const amount = Number(row.total_rwf || 0);
    if (amount <= 0) continue;
    const splitAmount = amount / ids.length;
    ids.forEach((sid) => {
      paidByStudent.set(sid, (paidByStudent.get(sid) || 0) + splitAmount);
    });
  }

  const EPS = 0.005;
  const rowsUnfiltered = students.map((st) => {
    const totalDue = totalDueForClass(st.class_name);
    const totalPaid = paidByStudent.get(Number(st.id)) || 0;
    let remaining = null;
    let status = 'unknown';

    if (totalDue == null) {
      status = 'no_fee_card';
      remaining = null;
    } else if (totalDue <= EPS) {
      status = 'full';
      remaining = 0;
    } else {
      remaining = Math.max(0, totalDue - totalPaid);
      if (totalPaid <= EPS) {
        status = 'not_paid';
      } else if (totalPaid + EPS >= totalDue) {
        status = 'full_pay';
      } else {
        status = 'remain_pay';
      }
    }

    return {
      student_id: st.id,
      student_uid: st.student_uid,
      student_code: st.student_code,
      first_name: st.first_name,
      last_name: st.last_name,
      class_name: st.class_name,
      total_due: totalDue,
      total_paid: totalPaid,
      remaining,
      status,
    };
  });

  const statusFilter = normalizeReportStatusFilter(statusFilterRaw);
  const rows = statusFilter ? rowsUnfiltered.filter((r) => r.status === statusFilter) : rowsUnfiltered;

  const summary = {
    total_students: rows.length,
    full_pay: rows.filter((r) => r.status === 'full_pay' || r.status === 'full').length,
    not_paid: rows.filter((r) => r.status === 'not_paid').length,
    remain_pay: rows.filter((r) => r.status === 'remain_pay').length,
    no_fee_card: rows.filter((r) => r.status === 'no_fee_card').length,
  };

  return {
    filters: { academic_year: academicYear, term, class_name: classFilter || null },
    status_filter: statusFilter || null,
    class_names: classNamesAll,
    summary,
    rows,
  };
}

async function getOrCreateExaminationListRow(schoolId, academicYear, term, className, { createIfMissing }) {
  const cn = trimStr(className);
  const ay = trimStr(academicYear);
  const tm = trimStr(term);
  const [existing] = await promisePool.query(
    `SELECT id, published_at, published_by_user_id FROM school_examination_lists
     WHERE school_id = ? AND academic_year = ? AND term = ? AND class_name = ?
     LIMIT 1`,
    [schoolId, ay, tm, cn]
  );
  if (existing.length) return existing[0];
  if (!createIfMissing) return null;
  const [ins] = await promisePool.query(
    `INSERT INTO school_examination_lists (school_id, academic_year, term, class_name)
     VALUES (?, ?, ?, ?)`,
    [schoolId, ay, tm, cn]
  );
  return {
    id: ins.insertId,
    published_at: null,
    published_by_user_id: null,
  };
}

/**
 * @param {'accountant'|'teacher'} options.audience — Teachers only see data after publish.
 */
async function examinationListPayload(schoolId, academicYearIn, termIn, classNameRaw, options = {}) {
  await ensureExaminationListTables();
  await ensureCollectionsTable();
  const audience = options.audience === 'teacher' ? 'teacher' : 'accountant';
  const { academicYear, term } = await resolveAcademicContext(schoolId, academicYearIn, termIn);
  const className = trimStr(classNameRaw);
  if (!className) {
    const err = new Error('class_name is required');
    err.statusCode = 400;
    throw err;
  }

  const report = await buildAccountantPaymentReport(schoolId, academicYear, term, className, '');
  let listRow = await getOrCreateExaminationListRow(schoolId, academicYear, term, className, {
    createIfMissing: audience === 'accountant',
  });

  if (!listRow) {
    return {
      published: false,
      academic_year: academicYear,
      term,
      class_name: className,
      message:
        'Examination eligibility for this class has not been published by finance yet.',
      students: [],
      counts: { allowed: 0, blocked: 0, total: 0 },
    };
  }

  if (audience === 'teacher' && !listRow.published_at) {
    return {
      published: false,
      academic_year: academicYear,
      term,
      class_name: className,
      message:
        'Examination eligibility for this class has not been published by finance yet.',
      students: [],
      counts: { allowed: 0, blocked: 0, total: 0 },
    };
  }

  const [ovRows] = await promisePool.query(
    `SELECT student_id, override_mode FROM school_examination_list_overrides WHERE list_id = ?`,
    [listRow.id]
  );
  const ovMap = new Map((ovRows || []).map((o) => [Number(o.student_id), String(o.override_mode || 'auto')]));

  const students = report.rows.map((r) => {
    const sid = Number(r.student_id);
    const ov = ovMap.get(sid) || 'auto';
    const feesWouldAllow = defaultFeesAllowExam(r);
    const allowed = ov === 'allow' ? true : ov === 'deny' ? false : feesWouldAllow;
    return {
      student_id: sid,
      student_uid: r.student_uid,
      student_code: r.student_code,
      first_name: r.first_name,
      last_name: r.last_name,
      class_name: r.class_name,
      fee_status: r.status,
      total_due: r.total_due,
      total_paid: r.total_paid,
      remaining: r.remaining,
      override_mode: ov,
      fees_allow_exam: feesWouldAllow,
      allowed_for_exam: allowed,
    };
  });

  const counts = { allowed: 0, blocked: 0, total: students.length };
  for (const s of students) {
    if (s.allowed_for_exam) counts.allowed += 1;
    else counts.blocked += 1;
  }

  return {
    published: Boolean(listRow.published_at),
    published_at: listRow.published_at || null,
    academic_year: academicYear,
    term,
    class_name: className,
    list_id: listRow.id,
    students,
    counts,
    class_names: report.class_names,
  };
}

// ════════════════════════════════════════════════════════════════
// GET /api/accountant/overview
// ════════════════════════════════════════════════════════════════
router.get('/accountant/overview', requireRole(ACCOUNTANT_OR_MANAGER_READ), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    if (!schoolId) {
      return res.status(400).json({ success: false, message: 'School not found in session.' });
    }

    await ensureCollectionsTable();
    await promisePool.query('ALTER TABLE students ADD COLUMN class_name VARCHAR(120) NULL').catch(() => {});

    const [[{ cnt }]] = await promisePool.query(
      'SELECT COUNT(*) AS cnt FROM students WHERE school_id = ?',
      [schoolId]
    );
    const [[sumRow]] = await promisePool.query(
      `SELECT
         COALESCE(SUM(amount_paid),0) AS total_paid,
         COUNT(*) AS payment_count
       FROM school_fee_collections
       WHERE school_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
      [schoolId]
    );

    const [classRows] = await promisePool.query(
      `SELECT
         COALESCE(NULLIF(TRIM(class_name), ''), '—') AS class_name,
         COUNT(*) AS student_count
       FROM students
       WHERE school_id = ?
       GROUP BY COALESCE(NULLIF(TRIM(class_name), ''), '—')
       ORDER BY student_count DESC, class_name ASC`,
      [schoolId]
    );

    let collections_last_14_days = [];
    try {
      const [dayRows] = await promisePool.query(
        `SELECT
           DATE(created_at) AS d,
           COALESCE(SUM(amount_paid), 0) AS total_paid
         FROM school_fee_collections
         WHERE school_id = ? AND created_at >= DATE_SUB(CURDATE(), INTERVAL 13 DAY)
         GROUP BY DATE(created_at)
         ORDER BY d ASC`,
        [schoolId]
      );

      const byDay = new Map();
      for (const row of dayRows || []) {
        const key = ymdFromSqlDate(row.d);
        if (key) byDay.set(key, Number(row.total_paid || 0));
      }
      for (let i = 13; i >= 0; i -= 1) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = [
          d.getFullYear(),
          String(d.getMonth() + 1).padStart(2, '0'),
          String(d.getDate()).padStart(2, '0'),
        ].join('-');
        collections_last_14_days.push({
          date: key,
          total_paid: byDay.get(key) || 0,
        });
      }
    } catch (chartErr) {
      console.warn('[accountant/overview] collections_last_14_days skipped:', chartErr.message);
      collections_last_14_days = [];
    }

    /** Head-of-discipline-style snapshot (read-only for finance dashboard). */
    let discipline_snapshot = {
      cases_this_month: 0,
      students_affected_this_month: 0,
      marks_deducted_this_month: 0,
      cases_last_30_days: 0,
    };
    try {
      const [[mtd]] = await promisePool.query(
        `SELECT
           COUNT(*) AS case_count,
           COUNT(DISTINCT student_id) AS students_affected,
           COALESCE(SUM(marks_deducted), 0) AS marks_deducted
         FROM discipline_cases
         WHERE school_id = ?
           AND created_at >= DATE_FORMAT(CURDATE(), '%Y-%m-01')`,
        [schoolId],
      );
      const [[d30]] = await promisePool.query(
        `SELECT COUNT(*) AS c
         FROM discipline_cases
         WHERE school_id = ?
           AND created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`,
        [schoolId],
      );
      discipline_snapshot = {
        cases_this_month: Number(mtd?.case_count || 0),
        students_affected_this_month: Number(mtd?.students_affected || 0),
        marks_deducted_this_month: Number(Number(mtd?.marks_deducted || 0).toFixed(2)),
        cases_last_30_days: Number(d30?.c || 0),
      };
    } catch (discErr) {
      console.warn('[accountant/overview] discipline_snapshot skipped:', discErr.message);
    }

    return res.json({
      success: true,
      data: {
        student_count: Number(cnt || 0),
        last_30_days_total_paid: Number(sumRow?.total_paid || 0),
        last_30_days_payment_count: Number(sumRow?.payment_count || 0),
        students_by_class: (classRows || []).map((r) => ({
          class_name: r.class_name,
          student_count: Number(r.student_count || 0),
        })),
        collections_last_14_days,
        discipline_snapshot,
      },
    });
  } catch (err) {
    console.error('GET /accountant/overview:', err.message, err.sqlMessage || '');
    return res.status(500).json({
      success: false,
      message: 'Failed to load overview',
      detail: process.env.NODE_ENV === 'production' ? undefined : (err.sqlMessage || err.message),
    });
  }
});

// ════════════════════════════════════════════════════════════════
// GET /api/accountant/babyeyi-fee?class_name=&academic_year=&term=
// ════════════════════════════════════════════════════════════════
router.get('/accountant/babyeyi-fee', requireRole(ACCOUNTANT_ONLY), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    if (!schoolId) {
      return res.status(400).json({ success: false, message: 'School not found in session.' });
    }

    const className = trimStr(req.query.class_name || req.query.class || '');
    const academicYearQ = trimStr(req.query.academic_year || req.query.year || '');
    const termQ = trimStr(req.query.term || '');
    const { academicYear, term } = await resolveAcademicContext(schoolId, academicYearQ, termQ);

    if (!className) {
      return res.status(400).json({
        success: false,
        message: 'class_name is required.',
      });
    }

    await ensureAccountantFeeTotalsTableAcct();
    const [rows] = await promisePool.query(
      `SELECT id, babyeyi_id, class_name, classes_json, term, academic_year,
              tuition_total, paid_at_school_total, total_due, babyeyi_status, babyeyi_is_active, updated_at
       FROM accountant_babyeyi_fees
       WHERE school_id = ?
       ORDER BY updated_at DESC
       LIMIT 400`,
      [schoolId]
    );

    const match = rows.find(
      (r) =>
        classMatchesBabyeyi(r, className)
        && yearMatchesRow(r.academic_year, academicYear)
        && termMatchesRow(r.term, term)
    );

    if (!match) {
      return res.json({
        success: true,
        data: null,
        message: 'No Babyeyi fee card found for this class, year, and term. Create one in Babyeyi Wizard first.',
      });
    }

    return res.json({
      success: true,
      data: {
        babyeyi_id: Number(match.babyeyi_id || 0),
        total_fee: Number(match.total_due || 0),
        tuition_total: Number(match.tuition_total || 0),
        paid_at_school_total: Number(match.paid_at_school_total || 0),
        class_name: match.class_name,
        term: match.term,
        academic_year: match.academic_year,
        status: match.babyeyi_status,
        is_active: Number(match.babyeyi_is_active) === 1,
      },
    });
  } catch (err) {
    console.error('GET /accountant/babyeyi-fee:', err);
    return res.status(500).json({ success: false, message: 'Failed to resolve fee' });
  }
});

// ════════════════════════════════════════════════════════════════
// GET /api/accountant/reports/payments?academic_year=&term=&class_name=
// Per student: expected fee from Babyeyi, sum paid from collections, status
// ════════════════════════════════════════════════════════════════
router.get('/accountant/reports/payments', requireRole(ACCOUNTANT_OR_MANAGER_READ), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    if (!schoolId) {
      return res.status(400).json({ success: false, message: 'School not found in session.' });
    }

    const academicYearQ = trimStr(req.query.academic_year || req.query.year || '');
    const termQ = trimStr(req.query.term || '');
    const { academicYear, term } = await resolveAcademicContext(schoolId, academicYearQ, termQ);
    const classFilter = trimStr(req.query.class_name || req.query.class || '');

    const statusFilter = trimStr(req.query.status || '');
    const data = await buildAccountantPaymentReport(schoolId, academicYear, term, classFilter, statusFilter);
    return res.json({ success: true, data });
  } catch (err) {
    console.error('GET /accountant/reports/payments:', err);
    return res.status(500).json({ success: false, message: 'Failed to build report' });
  }
});

// ════════════════════════════════════════════════════════════════
// Examination eligibility (fees + overrides, publish for teachers)
// GET /api/accountant/examination-list?academic_year=&term=&class_name=
// PATCH /api/accountant/examination-list/override
// POST /api/accountant/examination-list/publish
// ════════════════════════════════════════════════════════════════
router.get('/accountant/examination-list', requireRole(ACCOUNTANT_ONLY), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    if (!schoolId) {
      return res.status(400).json({ success: false, message: 'School not found in session.' });
    }
    const className = trimStr(req.query.class_name || req.query.class || '');
    const academicYearQ = trimStr(req.query.academic_year || req.query.year || '');
    const termQ = trimStr(req.query.term || '');
    const data = await examinationListPayload(schoolId, academicYearQ, termQ, className, {
      audience: 'accountant',
    });
    return res.json({ success: true, data });
  } catch (err) {
    if (err.statusCode === 400) {
      return res.status(400).json({ success: false, message: err.message });
    }
    console.error('GET /accountant/examination-list:', err);
    return res.status(500).json({ success: false, message: 'Failed to load examination list' });
  }
});

router.patch('/accountant/examination-list/override', requireRole(ACCOUNTANT_ONLY), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    if (!schoolId) {
      return res.status(400).json({ success: false, message: 'School not found in session.' });
    }
    const className = trimStr(req.body?.class_name || '');
    const academicYearQ = trimStr(req.body?.academic_year || req.body?.year || '');
    const termQ = trimStr(req.body?.term || '');
    const studentId = Number(req.body?.student_id);
    let mode = trimStr(req.body?.override_mode || req.body?.override || '').toLowerCase();
    if (!className || !studentId) {
      return res.status(400).json({ success: false, message: 'class_name and student_id are required' });
    }
    if (!['auto', 'allow', 'deny'].includes(mode)) {
      return res.status(400).json({ success: false, message: 'override_mode must be auto, allow, or deny' });
    }

    await ensureExaminationListTables();
    const { academicYear, term } = await resolveAcademicContext(schoolId, academicYearQ, termQ);
    let listRow = await getOrCreateExaminationListRow(schoolId, academicYear, term, className, {
      createIfMissing: true,
    });
    if (!listRow) {
      return res.status(500).json({ success: false, message: 'Could not create examination list row' });
    }

    if (mode === 'auto') {
      await promisePool.query(
        `DELETE FROM school_examination_list_overrides WHERE list_id = ? AND student_id = ?`,
        [listRow.id, studentId]
      );
    } else {
      await promisePool.query(
        `INSERT INTO school_examination_list_overrides (list_id, student_id, override_mode)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE override_mode = VALUES(override_mode), updated_at = CURRENT_TIMESTAMP`,
        [listRow.id, studentId, mode]
      );
    }

    const data = await examinationListPayload(schoolId, academicYearQ, termQ, className, {
      audience: 'accountant',
    });
    return res.json({ success: true, data });
  } catch (err) {
    if (err.statusCode === 400) {
      return res.status(400).json({ success: false, message: err.message });
    }
    console.error('PATCH /accountant/examination-list/override:', err);
    return res.status(500).json({ success: false, message: 'Failed to update override' });
  }
});

router.post('/accountant/examination-list/publish', requireRole(ACCOUNTANT_ONLY), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    if (!schoolId) {
      return res.status(400).json({ success: false, message: 'School not found in session.' });
    }
    const className = trimStr(req.body?.class_name || '');
    const academicYearQ = trimStr(req.body?.academic_year || req.body?.year || '');
    const termQ = trimStr(req.body?.term || '');
    if (!className) {
      return res.status(400).json({ success: false, message: 'class_name is required' });
    }

    await ensureExaminationListTables();
    const { academicYear, term } = await resolveAcademicContext(schoolId, academicYearQ, termQ);
    let listRow = await getOrCreateExaminationListRow(schoolId, academicYear, term, className, {
      createIfMissing: true,
    });
    if (!listRow) {
      return res.status(500).json({ success: false, message: 'Could not create examination list row' });
    }

    const uid = resolveActorUserId(req);
    await promisePool.query(
      `UPDATE school_examination_lists
       SET published_at = NOW(), published_by_user_id = ?
       WHERE id = ? AND school_id = ?`,
      [uid, listRow.id, schoolId]
    );

    const data = await examinationListPayload(schoolId, academicYearQ, termQ, className, {
      audience: 'accountant',
    });
    return res.json({ success: true, data, message: 'Examination list published for teachers.' });
  } catch (err) {
    if (err.statusCode === 400) {
      return res.status(400).json({ success: false, message: err.message });
    }
    console.error('POST /accountant/examination-list/publish:', err);
    return res.status(500).json({ success: false, message: 'Failed to publish examination list' });
  }
});

// Manager/Accountant shared read endpoint for finance registry page.
router.get('/manager/finance/payments/report', requireRole(FINANCE_REPORT_READ_ROLES), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    if (!schoolId) {
      return res.status(400).json({ success: false, message: 'School not found in session.' });
    }

    const academicYearQ = trimStr(req.query.academic_year || req.query.year || '');
    const termQ = trimStr(req.query.term || '');
    const { academicYear, term } = await resolveAcademicContext(schoolId, academicYearQ, termQ);
    const classFilter = trimStr(req.query.class_name || req.query.class || '');
    const statusFilter = trimStr(req.query.status || '');

    const data = await buildAccountantPaymentReport(schoolId, academicYear, term, classFilter, statusFilter);
    return res.json({ success: true, data });
  } catch (err) {
    console.error('GET /manager/finance/payments/report:', err);
    return res.status(500).json({ success: false, message: 'Failed to build manager finance payments report' });
  }
});

// ════════════════════════════════════════════════════════════════
// GET /api/accountant/reports/payments/export.xlsx
// ════════════════════════════════════════════════════════════════
router.get('/accountant/reports/payments/export.xlsx', requireRole(ACCOUNTANT_ONLY), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    if (!schoolId) {
      return res.status(400).json({ success: false, message: 'School not found in session.' });
    }

    const academicYearQ = trimStr(req.query.academic_year || req.query.year || '');
    const termQ = trimStr(req.query.term || '');
    const { academicYear, term } = await resolveAcademicContext(schoolId, academicYearQ, termQ);
    const classFilter = trimStr(req.query.class_name || req.query.class || '');

    const [[schoolRow]] = await promisePool.query(
      'SELECT school_name, school_code FROM schools WHERE id = ? LIMIT 1',
      [schoolId]
    );
    const schoolName = schoolRow?.school_name || `School ${schoolId}`;

    const statusFilter = trimStr(req.query.status || '');
    const report = await buildAccountantPaymentReport(schoolId, academicYear, term, classFilter, statusFilter);
    const { summary, rows, filters } = report;

    const metaRows = [
      { Field: 'School', Value: schoolName },
      { Field: 'Academic year', Value: filters.academic_year },
      { Field: 'Term', Value: filters.term },
      { Field: 'Class filter', Value: filters.class_name || 'All classes' },
      { Field: 'Status filter', Value: report.status_filter || 'All statuses' },
      { Field: 'Generated', Value: new Date().toISOString() },
      { Field: '', Value: '' },
      { Field: 'Total students', Value: summary.total_students },
      { Field: 'Full pay', Value: summary.full_pay },
      { Field: 'Not paid', Value: summary.not_paid },
      { Field: 'Remain to pay', Value: summary.remain_pay },
      { Field: 'No Babyeyi card', Value: summary.no_fee_card },
    ];

    const studentRows = rows.map((r) => ({
      FirstName: r.first_name,
      LastName: r.last_name,
      StudentCode: r.student_code || '',
      StudentUID: r.student_uid,
      Class: r.class_name || '',
      TotalDue_RWF: r.total_due != null ? Number(r.total_due) : '',
      Paid_RWF: Number(r.total_paid || 0),
      Remaining_RWF: r.remaining != null ? Number(r.remaining) : '',
      Status: statusLabelForExport(r.status),
    }));

    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(metaRows), 'Summary');
    xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(studentRows), 'Students');

    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const fname = safeFilenamePart(`fee-report-${schoolRow?.school_code || schoolId}-${academicYear}-${term}`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fname}.xlsx"`);
    return res.send(buffer);
  } catch (err) {
    console.error('GET export.xlsx fee report:', err);
    return res.status(500).json({ success: false, message: 'Failed to export Excel' });
  }
});

// ════════════════════════════════════════════════════════════════
// GET /api/accountant/reports/payments/export.pdf
// ════════════════════════════════════════════════════════════════
router.get('/accountant/reports/payments/export.pdf', requireRole(ACCOUNTANT_ONLY), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    if (!schoolId) {
      return res.status(400).json({ success: false, message: 'School not found in session.' });
    }

    const academicYearQ = trimStr(req.query.academic_year || req.query.year || '');
    const termQ = trimStr(req.query.term || '');
    const { academicYear, term } = await resolveAcademicContext(schoolId, academicYearQ, termQ);
    const classFilter = trimStr(req.query.class_name || req.query.class || '');

    const [[schoolRow]] = await promisePool.query(
      'SELECT school_name, school_code FROM schools WHERE id = ? LIMIT 1',
      [schoolId]
    );
    const schoolName = schoolRow?.school_name || `School ${schoolId}`;

    const statusFilter = trimStr(req.query.status || '');
    const report = await buildAccountantPaymentReport(schoolId, academicYear, term, classFilter, statusFilter);
    const { summary, rows, filters } = report;

    const fname = safeFilenamePart(`fee-report-${schoolRow?.school_code || schoolId}-${academicYear}-${term}`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fname}.pdf"`);

    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
    doc.pipe(res);

    doc.fontSize(14).fillColor('#111').text('Fee payment report', { align: 'left' });
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#444').text(schoolName);
    doc.text(`Code: ${schoolRow?.school_code || '—'}  ·  Academic year: ${filters.academic_year}  ·  Term: ${filters.term}`);
    if (filters.class_name) doc.text(`Class filter: ${filters.class_name}`);
    if (report.status_filter) doc.text(`Status filter: ${report.status_filter}`);
    doc.text(`Generated: ${new Date().toLocaleString()}`);
    doc.moveDown(0.6);
    doc.fillColor('#111').fontSize(9).text(
      `Summary — Students: ${summary.total_students}  |  Full pay: ${summary.full_pay}  |  Not paid: ${summary.not_paid}  |  Remain to pay: ${summary.remain_pay}  |  No Babyeyi: ${summary.no_fee_card}`
    );
    doc.moveDown(0.8);

    if (!rows.length) {
      doc.fontSize(11).text('No students in this filter.');
      doc.end();
      return;
    }

    doc.fontSize(7.5);
    const lineH = 11;
    let y = doc.y;
    const left = 40;
    const wName = 130;
    const wCode = 72;
    const wClass = 42;
    const wNum = 68;
    const wStat = 88;

    doc.fillColor('#333').font('Helvetica-Bold', 7.5);
    doc.text('Student', left, y, { width: wName });
    doc.text('Code / ID', left + wName, y, { width: wCode });
    doc.text('Class', left + wName + wCode, y, { width: wClass });
    doc.text('Due (RWF)', left + wName + wCode + wClass, y, { width: wNum });
    doc.text('Paid (RWF)', left + wName + wCode + wClass + wNum, y, { width: wNum });
    doc.text('Remain (RWF)', left + wName + wCode + wClass + wNum * 2, y, { width: wNum });
    doc.text('Status', left + wName + wCode + wClass + wNum * 3, y, { width: wStat });
    y += lineH + 2;
    doc.fillColor('#000').font('Helvetica', 7.5);

    rows.forEach((r) => {
      if (y > 520) {
        doc.addPage();
        y = 40;
      }
      const name = `${r.first_name || ''} ${r.last_name || ''}`.trim();
      const code = r.student_code || r.student_uid || '';
      const due = r.total_due != null ? String(Math.round(Number(r.total_due))) : '—';
      const paid = String(Math.round(Number(r.total_paid || 0)));
      const rem = r.remaining != null ? String(Math.round(Number(r.remaining))) : '—';
      const st = statusLabelForExport(r.status);

      doc.text(name.slice(0, 42), left, y, { width: wName });
      doc.text(String(code).slice(0, 22), left + wName, y, { width: wCode });
      doc.text(String(r.class_name || '—').slice(0, 12), left + wName + wCode, y, { width: wClass });
      doc.text(due, left + wName + wCode + wClass, y, { width: wNum });
      doc.text(paid, left + wName + wCode + wClass + wNum, y, { width: wNum });
      doc.text(rem, left + wName + wCode + wClass + wNum * 2, y, { width: wNum });
      doc.text(st.slice(0, 28), left + wName + wCode + wClass + wNum * 3, y, { width: wStat });
      y += lineH;
    });

    doc.end();
  } catch (err) {
    console.error('GET export.pdf fee report:', err);
    return res.status(500).json({ success: false, message: 'Failed to export PDF' });
  }
});

// ════════════════════════════════════════════════════════════════
// GET /api/accountant/payments?limit=
// ════════════════════════════════════════════════════════════════
router.get('/accountant/payments', requireRole(ACCOUNTANT_ONLY), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    if (!schoolId) {
      return res.status(400).json({ success: false, message: 'School not found in session.' });
    }

    await ensureCollectionsTable();

    const limit = Math.min(200, Math.max(10, Number(req.query.limit) || 50));

    const [rows] = await promisePool.query(
      `SELECT
         fc.id,
         fc.student_id,
         fc.academic_year_label,
         fc.term,
         fc.class_name,
         fc.total_due,
         fc.amount_paid,
         fc.balance_remaining,
         fc.notes,
         fc.payment_method,
         fc.bank_name,
         fc.paid_by,
         fc.transaction_ref,
         fc.momo_phone,
         fc.receipt_no,
         fc.paid_at_date,
         fc.created_at,
         s.first_name,
         s.last_name,
         s.student_uid,
         s.student_code,
         sc.school_name
       FROM school_fee_collections fc
       INNER JOIN students s ON s.id = fc.student_id AND s.school_id = fc.school_id
       LEFT JOIN schools sc ON sc.id = fc.school_id
       WHERE fc.school_id = ?
       ORDER BY fc.created_at DESC
       LIMIT ?`,
      [schoolId, limit]
    );

    return res.json({ success: true, data: rows.map(mapPaymentRow) });
  } catch (err) {
    console.error('GET /accountant/payments:', err);
    return res.status(500).json({ success: false, message: 'Failed to list payments' });
  }
});

// ════════════════════════════════════════════════════════════════
// GET /api/accountant/payments/:id
// ════════════════════════════════════════════════════════════════
router.get('/accountant/payments/:id', requireRole(ACCOUNTANT_ONLY), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    if (!schoolId) {
      return res.status(400).json({ success: false, message: 'School not found in session.' });
    }
    await ensureCollectionsTable();
    const id = Number(req.params.id || 0);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid payment id.' });

    const [[row]] = await promisePool.query(
      `SELECT
         fc.id,
         fc.student_id,
         fc.academic_year_label,
         fc.term,
         fc.class_name,
         fc.total_due,
         fc.amount_paid,
         fc.balance_remaining,
         fc.notes,
         fc.payment_method,
         fc.bank_name,
         fc.paid_by,
         fc.transaction_ref,
         fc.momo_phone,
         fc.receipt_no,
         fc.paid_at_date,
         fc.created_at,
         s.first_name,
         s.last_name,
         s.student_uid,
         s.student_code,
         sc.school_name,
         TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))) AS recorded_by_name
       FROM school_fee_collections fc
       INNER JOIN students s ON s.id = fc.student_id AND s.school_id = fc.school_id
       LEFT JOIN schools sc ON sc.id = fc.school_id
       LEFT JOIN users u ON u.id = fc.recorded_by_user_id
       WHERE fc.school_id = ? AND fc.id = ?
       LIMIT 1`,
      [schoolId, id]
    );
    if (!row) return res.status(404).json({ success: false, message: 'Payment not found' });
    return res.json({ success: true, data: mapPaymentRow(row) });
  } catch (err) {
    console.error('GET /accountant/payments/:id:', err);
    return res.status(500).json({ success: false, message: 'Failed to load payment detail' });
  }
});

// ════════════════════════════════════════════════════════════════
// PATCH /api/accountant/payments/:id
// Body (optional fields): total_due, amount_paid, notes, term, academic_year, class_name
// ════════════════════════════════════════════════════════════════
router.patch('/accountant/payments/:id', requireRole(ACCOUNTANT_ONLY), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    if (!schoolId) {
      return res.status(400).json({ success: false, message: 'School not found in session.' });
    }
    await ensureCollectionsTable();
    const id = Number(req.params.id || 0);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid payment id.' });

    const [[current]] = await promisePool.query(
      `SELECT id, total_due, amount_paid, balance_remaining, notes, term, academic_year_label, class_name
       FROM school_fee_collections
       WHERE school_id = ? AND id = ?
       LIMIT 1`,
      [schoolId, id]
    );
    if (!current) return res.status(404).json({ success: false, message: 'Payment not found' });

    const body = req.body || {};
    const totalDue = body.total_due != null ? Number(body.total_due) : Number(current.total_due || 0);
    const amountPaid = body.amount_paid != null ? Number(body.amount_paid) : Number(current.amount_paid || 0);
    const notes = body.notes != null ? trimStr(body.notes) : current.notes;
    const termIn = body.term != null ? trimStr(body.term) : trimStr(current.term);
    const academicYearIn = body.academic_year != null ? trimStr(body.academic_year) : trimStr(current.academic_year_label);
    const className = body.class_name != null ? trimStr(body.class_name) : trimStr(current.class_name);
    const { academicYear, term } = await resolveAcademicContext(schoolId, academicYearIn, termIn);

    if (Number.isNaN(totalDue) || totalDue < 0) {
      return res.status(400).json({ success: false, message: 'total_due must be a non-negative number.' });
    }
    if (Number.isNaN(amountPaid) || amountPaid < 0) {
      return res.status(400).json({ success: false, message: 'amount_paid must be a non-negative number.' });
    }
    const balance = Math.max(0, totalDue - amountPaid);

    await promisePool.query(
      `UPDATE school_fee_collections
       SET total_due = ?, amount_paid = ?, balance_remaining = ?, notes = ?, term = ?, academic_year_label = ?, class_name = ?
       WHERE school_id = ? AND id = ?`,
      [totalDue, amountPaid, balance, notes || null, term, academicYear, className || null, schoolId, id]
    );
    return res.json({
      success: true,
      message: 'Payment updated.',
      data: { id, balance_remaining: balance },
    });
  } catch (err) {
    console.error('PATCH /accountant/payments/:id:', err);
    return res.status(500).json({ success: false, message: 'Failed to update payment' });
  }
});

// ════════════════════════════════════════════════════════════════
// DELETE /api/accountant/payments/:id
// ════════════════════════════════════════════════════════════════
router.delete('/accountant/payments/:id', requireRole(ACCOUNTANT_ONLY), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    if (!schoolId) {
      return res.status(400).json({ success: false, message: 'School not found in session.' });
    }
    await ensureCollectionsTable();
    const id = Number(req.params.id || 0);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid payment id.' });

    const [result] = await promisePool.query(
      `DELETE FROM school_fee_collections
       WHERE school_id = ? AND id = ?`,
      [schoolId, id]
    );
    if (!result.affectedRows) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }
    return res.json({ success: true, message: 'Payment deleted.' });
  } catch (err) {
    console.error('DELETE /accountant/payments/:id:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete payment' });
  }
});

// ════════════════════════════════════════════════════════════════
// POST /api/accountant/payments
// Body: student_id, academic_year, term, class_name (optional override),
//       amount_paid, notes?
// total_due resolved from babyeyi unless total_due passed explicitly
// ════════════════════════════════════════════════════════════════
router.post('/accountant/payments', requireRole(ACCOUNTANT_ONLY), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    const userId = req.session?.userId || req.session?.user?.id;
    if (!schoolId || !userId) {
      return res.status(400).json({ success: false, message: 'Invalid session.' });
    }

    await ensureCollectionsTable();

    const body = req.body || {};
    const studentId = Number(body.student_id);
    const { academicYear, term } = await resolveAcademicContext(
      schoolId,
      body.academic_year || body.year || '',
      body.term || ''
    );
    let className = trimStr(body.class_name);
    const amountPaid = Number(body.amount_paid);
    const notes = trimStr(body.notes) || null;
    const paidAtDateRaw = trimStr(body.paid_at_date || body.paid_at);
    const paidAtDate = paidAtDateRaw && /^\d{4}-\d{2}-\d{2}$/.test(paidAtDateRaw) ? paidAtDateRaw : null;
    const methodFields = validatePaymentMethodFields(body);
    if (!methodFields.ok) {
      return res.status(400).json({ success: false, message: methodFields.message });
    }
    let totalDueIn = body.total_due != null && body.total_due !== '' ? Number(body.total_due) : null;

    if (!studentId || Number.isNaN(studentId)) {
      return res.status(400).json({ success: false, message: 'student_id is required.' });
    }
    if (Number.isNaN(amountPaid) || amountPaid < 0) {
      return res.status(400).json({ success: false, message: 'amount_paid must be a non-negative number.' });
    }

    const [[stu]] = await promisePool.query(
      'SELECT id, class_name, first_name, last_name FROM students WHERE id = ? AND school_id = ? LIMIT 1',
      [studentId, schoolId]
    );
    if (!stu) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    if (!className) className = trimStr(stu.class_name);

    await ensureAccountantFeeTotalsTableAcct();
    let babyeyiId = null;
    const [fullRows] = await promisePool.query(
      `SELECT babyeyi_id, class_name, classes_json, academic_year, term, total_due
       FROM accountant_babyeyi_fees
       WHERE school_id = ?
       ORDER BY updated_at DESC
       LIMIT 400`,
      [schoolId]
    );
    const bMatch = fullRows.find(
      (r) =>
        classMatchesBabyeyi(r, className)
        && yearMatchesRow(r.academic_year, academicYear)
        && termMatchesRow(r.term, term)
    );

    if (totalDueIn == null || Number.isNaN(totalDueIn)) {
      if (bMatch) {
        totalDueIn = Number(bMatch.total_due || 0);
        babyeyiId = Number(bMatch.babyeyi_id || 0) || null;
      } else {
        // Fallback for legacy/manual classes without a Babyeyi card yet.
        totalDueIn = Math.max(0, amountPaid);
      }
    } else if (bMatch) {
      babyeyiId = Number(bMatch.babyeyi_id || 0) || null;
    }

    const totalDue = Number(totalDueIn);
    const balance = Math.max(0, totalDue - amountPaid);

    const [ins] = await promisePool.query(
      `INSERT INTO school_fee_collections (
         school_id, student_id, babyeyi_id, academic_year_label, term, class_name,
         total_due, amount_paid, balance_remaining, recorded_by_user_id, notes,
         payment_method, bank_name, paid_by, transaction_ref, momo_phone, paid_at_date
       ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        schoolId,
        studentId,
        babyeyiId,
        academicYear,
        term,
        className || null,
        totalDue,
        amountPaid,
        balance,
        userId,
        notes,
        methodFields.payment_method,
        methodFields.bank_name,
        methodFields.paid_by,
        methodFields.transaction_ref,
        methodFields.momo_phone,
        paidAtDate,
      ]
    );

    const paymentId = ins.insertId;
    const receiptNo = buildReceiptNo(schoolId, paymentId);
    await promisePool.query(
      `UPDATE school_fee_collections SET receipt_no = ? WHERE school_id = ? AND id = ?`,
      [receiptNo, schoolId, paymentId]
    );

    const [[fullRow]] = await promisePool.query(
      `SELECT
         fc.id,
         fc.student_id,
         fc.academic_year_label,
         fc.term,
         fc.class_name,
         fc.total_due,
         fc.amount_paid,
         fc.balance_remaining,
         fc.notes,
         fc.payment_method,
         fc.bank_name,
         fc.paid_by,
         fc.transaction_ref,
         fc.momo_phone,
         fc.receipt_no,
         fc.paid_at_date,
         fc.created_at,
         s.first_name,
         s.last_name,
         s.student_uid,
         s.student_code,
         sc.school_name,
         TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))) AS recorded_by_name
       FROM school_fee_collections fc
       INNER JOIN students s ON s.id = fc.student_id AND s.school_id = fc.school_id
       LEFT JOIN schools sc ON sc.id = fc.school_id
       LEFT JOIN users u ON u.id = fc.recorded_by_user_id
       WHERE fc.school_id = ? AND fc.id = ?
       LIMIT 1`,
      [schoolId, paymentId]
    );

    return res.status(201).json({
      success: true,
      message: 'Payment recorded.',
      data: {
        id: paymentId,
        receipt_no: receiptNo,
        balance_remaining: balance,
        payment: mapPaymentRow(fullRow),
      },
    });
  } catch (err) {
    console.error('POST /accountant/payments:', err);
    return res.status(500).json({ success: false, message: 'Failed to record payment' });
  }
});

// ════════════════════════════════════════════════════════════════
// Accountant Babyeyi fee cards (totals-only table)
// GET /api/accountant/babyeyi-fees
// GET /api/accountant/babyeyi-fees/:id
// PUT /api/accountant/babyeyi-fees/:id
// DELETE /api/accountant/babyeyi-fees/:id
// ════════════════════════════════════════════════════════════════

let accountantFeeTotalsTableReady = false;
async function ensureAccountantFeeTotalsTableAcct() {
  if (accountantFeeTotalsTableReady) return;
  await promisePool
    .query(
      `
    CREATE TABLE IF NOT EXISTS accountant_babyeyi_fees (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      babyeyi_id INT UNSIGNED NOT NULL,
      academic_year VARCHAR(64) NOT NULL DEFAULT '',
      term VARCHAR(64) NOT NULL DEFAULT '',
      class_name VARCHAR(255) NULL,
      classes_json LONGTEXT NULL,
      tuition_total DECIMAL(14,2) NOT NULL DEFAULT 0,
      paid_at_school_total DECIMAL(14,2) NOT NULL DEFAULT 0,
      total_due DECIMAL(14,2) NOT NULL DEFAULT 0,
      babyeyi_is_active TINYINT(1) NOT NULL DEFAULT 1,
      babyeyi_status VARCHAR(32) NULL,
      source_updated_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_totals_babyeyi (babyeyi_id),
      KEY idx_totals_school_term (school_id, academic_year, term)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `
    )
    .catch(() => {});
  await promisePool
    .query(
      `INSERT INTO accountant_babyeyi_fees
         (school_id, babyeyi_id, academic_year, term, class_name, classes_json,
          tuition_total, paid_at_school_total, total_due, babyeyi_is_active, babyeyi_status,
          source_updated_at, created_at, updated_at)
       SELECT school_id, babyeyi_id, academic_year, term, class_name, classes_json,
              tuition_total, paid_at_school_total, total_due, babyeyi_is_active, babyeyi_status,
              source_updated_at, created_at, updated_at
       FROM accountant_babyeyi_fee_totals
       ON DUPLICATE KEY UPDATE
         school_id = VALUES(school_id),
         academic_year = VALUES(academic_year),
         term = VALUES(term),
         class_name = VALUES(class_name),
         classes_json = VALUES(classes_json),
         tuition_total = VALUES(tuition_total),
         paid_at_school_total = VALUES(paid_at_school_total),
         total_due = VALUES(total_due),
         babyeyi_is_active = VALUES(babyeyi_is_active),
         babyeyi_status = VALUES(babyeyi_status),
         source_updated_at = VALUES(source_updated_at),
         updated_at = VALUES(updated_at)`
    )
    .catch(() => {});
  accountantFeeTotalsTableReady = true;
}

function normalizeClassesJsonInput(v) {
  if (Array.isArray(v)) {
    return JSON.stringify(v.map((x) => String(x || '').trim()).filter(Boolean));
  }
  if (typeof v === 'string') {
    try {
      const arr = JSON.parse(v);
      if (Array.isArray(arr)) {
        return JSON.stringify(arr.map((x) => String(x || '').trim()).filter(Boolean));
      }
    } catch (_) {
      // keep fallback
    }
  }
  return JSON.stringify([]);
}

function shouldAggregateAllTermsForBudget(term, budgetType) {
  const t = trimStr(term).toLowerCase();
  const bt = trimStr(budgetType).toLowerCase();
  if (bt.includes('annual')) return true;
  if (!t) return false;
  return /full\s*academic|annual|all\s*year|full\s*year/.test(t);
}

function parseCardClassNames(row) {
  const names = [];
  const primary = trimStr(row.class_name);
  if (primary) names.push(primary);
  try {
    const arr = typeof row.classes_json === 'string' ? JSON.parse(row.classes_json) : row.classes_json;
    if (Array.isArray(arr)) {
      for (const x of arr) {
        const t = trimStr(x);
        if (t) names.push(t);
      }
    }
  } catch (_) {}
  const seen = new Set();
  const out = [];
  for (const n of names) {
    const k = n.toLowerCase();
    if (!seen.has(k)) {
      seen.add(k);
      out.push(n);
    }
  }
  return out;
}

function enrichBabyeyiCardsForBudget(feeRows, studentsByClassLower, { aggregateAll, filterTerm }) {
  const cards = [];
  for (const row of feeRows || []) {
    if (!aggregateAll && filterTerm && !termMatchesRow(row.term, filterTerm)) continue;
    const tuitionPer = Number(row.tuition_total || 0);
    const paidPer = Number(row.paid_at_school_total || 0);
    const perStudentDue = Number(row.total_due || 0) > 0
      ? Number(row.total_due || 0)
      : tuitionPer + paidPer;
    const classNames = parseCardClassNames(row);
    let studentCount = 0;
    for (const cn of classNames) {
      studentCount += studentsByClassLower.get(cn.toLowerCase()) || 0;
    }
    const projectedTuition = tuitionPer * studentCount;
    const projectedPaidAtSchool = paidPer * studentCount;
    const projectedTotalDue = perStudentDue * studentCount;
    cards.push({
      id: row.id,
      babyeyi_id: row.babyeyi_id,
      class_name: row.class_name,
      classes_json: row.classes_json,
      class_names: classNames,
      term: row.term,
      academic_year: row.academic_year,
      tuition_total: tuitionPer,
      paid_at_school_total: paidPer,
      total_due: perStudentDue,
      tuition_per_student: tuitionPer,
      paid_at_school_per_student: paidPer,
      per_student_due: perStudentDue,
      student_count: studentCount,
      projected_tuition_total: projectedTuition,
      projected_paid_at_school_total: projectedPaidAtSchool,
      projected_total_due: projectedTotalDue,
      babyeyi_is_active: row.babyeyi_is_active,
      babyeyi_status: row.babyeyi_status,
      updated_at: row.updated_at,
    });
  }

  const summary = {
    card_count: cards.length,
    total_students: cards.reduce((s, c) => s + Number(c.student_count || 0), 0),
    tuition_total: cards.reduce((s, c) => s + Number(c.tuition_total || 0), 0),
    paid_at_school_total: cards.reduce((s, c) => s + Number(c.paid_at_school_total || 0), 0),
    total_due: cards.reduce((s, c) => s + Number(c.total_due || 0), 0),
    projected_tuition_total: cards.reduce((s, c) => s + Number(c.projected_tuition_total || 0), 0),
    projected_paid_at_school_total: cards.reduce((s, c) => s + Number(c.projected_paid_at_school_total || 0), 0),
    projected_total_due: cards.reduce((s, c) => s + Number(c.projected_total_due || 0), 0),
    by_term: [],
  };

  const termMap = new Map();
  for (const c of cards) {
    const key = trimStr(c.term) || '—';
    const prev = termMap.get(key) || {
      term: key,
      card_count: 0,
      student_count: 0,
      projected_total_due: 0,
    };
    prev.card_count += 1;
    prev.student_count += Number(c.student_count || 0);
    prev.projected_total_due += Number(c.projected_total_due || 0);
    termMap.set(key, prev);
  }
  summary.by_term = [...termMap.values()].sort((a, b) => a.term.localeCompare(b.term));

  return { cards, summary };
}

// GET /api/accountant/babyeyi-fees/budget-analysis — fee cards + student counts + projected totals
router.get('/accountant/babyeyi-fees/budget-analysis', requireRole(ACCOUNTANT_ONLY), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    if (!schoolId) {
      return res.status(400).json({ success: false, message: 'School not found in session.' });
    }
    await ensureAccountantFeeTotalsTableAcct();

    const year = trimStr(req.query.academic_year || req.query.year || '');
    const termQ = trimStr(req.query.term || '');
    const budgetType = trimStr(req.query.budget_type || req.query.budgetType || '');
    if (!year) {
      return res.status(400).json({ success: false, message: 'academic_year is required' });
    }

    const aggregateAll = shouldAggregateAllTermsForBudget(termQ, budgetType);
    const where = ['school_id = ?', 'academic_year = ?'];
    const args = [schoolId, year];
    if (!aggregateAll && termQ) {
      where.push('term = ?');
      args.push(termQ);
    }

    const [feeRows] = await promisePool.query(
      `SELECT id, babyeyi_id, academic_year, term, class_name, classes_json,
              tuition_total, paid_at_school_total, total_due, babyeyi_is_active, babyeyi_status,
              source_updated_at, updated_at, created_at
       FROM accountant_babyeyi_fees
       WHERE ${where.join(' AND ')}
       ORDER BY term ASC, class_name ASC`,
      args
    );

    const [classRows] = await promisePool.query(
      `SELECT
         COALESCE(NULLIF(TRIM(class_name), ''), '—') AS class_name,
         COUNT(*) AS student_count
       FROM students
       WHERE school_id = ?
       GROUP BY COALESCE(NULLIF(TRIM(class_name), ''), '—')`,
      [schoolId]
    );

    const studentsByClassLower = new Map();
    for (const r of classRows || []) {
      studentsByClassLower.set(trimStr(r.class_name).toLowerCase(), Number(r.student_count || 0));
    }

    const { cards, summary } = enrichBabyeyiCardsForBudget(feeRows, studentsByClassLower, {
      aggregateAll,
      filterTerm: termQ,
    });

    return res.json({
      success: true,
      data: {
        cards,
        summary,
        aggregate_all_terms: aggregateAll,
        academic_year: year,
        term: termQ || null,
        budget_type: budgetType || null,
      },
    });
  } catch (err) {
    console.error('GET /accountant/babyeyi-fees/budget-analysis:', err);
    return res.status(500).json({ success: false, message: 'Failed to load Babyeyi budget analysis' });
  }
});

router.get('/accountant/babyeyi-fees', requireRole(ACCOUNTANT_ONLY), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    if (!schoolId) {
      return res.status(400).json({ success: false, message: 'School not found in session.' });
    }
    await ensureAccountantFeeTotalsTableAcct();
    const term = trimStr(req.query.term || '');
    const year = trimStr(req.query.academic_year || req.query.year || '');
    const where = ['school_id = ?'];
    const args = [schoolId];
    if (term) {
      where.push('term = ?');
      args.push(term);
    }
    if (year) {
      where.push('academic_year = ?');
      args.push(year);
    }
    const [rows] = await promisePool.query(
      `SELECT id, babyeyi_id, academic_year, term, class_name, classes_json,
              tuition_total, paid_at_school_total, total_due, babyeyi_is_active, babyeyi_status,
              source_updated_at, updated_at, created_at
       FROM accountant_babyeyi_fees
       WHERE ${where.join(' AND ')}
       ORDER BY updated_at DESC`,
      args
    );
    return res.json({ success: true, data: rows || [] });
  } catch (err) {
    console.error('GET /accountant/babyeyi-fees:', err);
    return res.status(500).json({ success: false, message: 'Failed to load Babyeyi fee cards' });
  }
});

router.get('/accountant/babyeyi-fees/:id', requireRole(ACCOUNTANT_ONLY), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    if (!schoolId) {
      return res.status(400).json({ success: false, message: 'School not found in session.' });
    }
    await ensureAccountantFeeTotalsTableAcct();
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid id' });
    const [rows] = await promisePool.query(
      `SELECT * FROM accountant_babyeyi_fees WHERE id = ? AND school_id = ? LIMIT 1`,
      [id, schoolId]
    );
    const row = rows?.[0];
    if (!row) return res.status(404).json({ success: false, message: 'Not found' });
    return res.json({ success: true, data: row });
  } catch (err) {
    console.error('GET /accountant/babyeyi-fees/:id:', err);
    return res.status(500).json({ success: false, message: 'Failed to load fee card' });
  }
});

router.put('/accountant/babyeyi-fees/:id', requireRole(ACCOUNTANT_ONLY), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    if (!schoolId) {
      return res.status(400).json({ success: false, message: 'School not found in session.' });
    }
    await ensureAccountantFeeTotalsTableAcct();
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid id' });
    const [rows] = await promisePool.query(
      `SELECT id FROM accountant_babyeyi_fees WHERE id = ? AND school_id = ? LIMIT 1`,
      [id, schoolId]
    );
    if (!rows?.length) return res.status(404).json({ success: false, message: 'Not found' });

    const b = req.body || {};
    const tuition = Number(b.tuition_total || 0);
    const paidAtSchool = Number(b.paid_at_school_total || 0);
    if (Number.isNaN(tuition) || tuition < 0 || Number.isNaN(paidAtSchool) || paidAtSchool < 0) {
      return res.status(400).json({ success: false, message: 'Totals must be non-negative numbers' });
    }
    const className = trimStr(b.class_name) || null;
    const termIn = trimStr(b.term || '');
    const academicYearIn = trimStr(b.academic_year || '');
    const { academicYear, term } = await resolveAcademicContext(schoolId, academicYearIn, termIn);
    const classesJson = normalizeClassesJsonInput(b.classes_json);
    const totalDue = Math.round((tuition + paidAtSchool) * 100) / 100;
    await promisePool.query(
      `UPDATE accountant_babyeyi_fees
       SET class_name = ?, classes_json = ?, term = ?, academic_year = ?,
           tuition_total = ?, paid_at_school_total = ?, total_due = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND school_id = ?`,
      [className, classesJson, term, academicYear, tuition, paidAtSchool, totalDue, id, schoolId]
    );
    return res.json({ success: true, message: 'Fee card updated.' });
  } catch (err) {
    console.error('PUT /accountant/babyeyi-fees/:id:', err);
    return res.status(500).json({ success: false, message: 'Failed to update fee card' });
  }
});

router.delete('/accountant/babyeyi-fees/:id', requireRole(ACCOUNTANT_ONLY), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    if (!schoolId) {
      return res.status(400).json({ success: false, message: 'School not found in session.' });
    }
    await ensureAccountantFeeTotalsTableAcct();
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid id' });
    const [del] = await promisePool.query(
      `DELETE FROM accountant_babyeyi_fees WHERE id = ? AND school_id = ?`,
      [id, schoolId]
    );
    if (!del.affectedRows) return res.status(404).json({ success: false, message: 'Not found' });
    return res.json({ success: true, message: 'Fee card deleted.' });
  } catch (err) {
    console.error('DELETE /accountant/babyeyi-fees/:id:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete fee card' });
  }
});

/** Used by Representative `/fees-management` — same rules as accountant reports, without online invoice credits */
router.buildAccountantPaymentReport = buildAccountantPaymentReport;
router.resolveAcademicContext = resolveAcademicContext;
router.yearMatchesRow = yearMatchesRow;
router.termMatchesRow = termMatchesRow;
router.trimStr = trimStr;
function parseIntentPayload(raw) {
  try {
    return typeof raw === 'string' ? JSON.parse(raw || '{}') : raw || {};
  } catch {
    return {};
  }
}

function intentMatchesStudent(payload, studentRow) {
  const studentId = Number(studentRow.id);
  const uid = trimStr(studentRow.student_uid).toUpperCase();
  const code = trimStr(studentRow.student_code).toUpperCase();
  const list = [];
  if (payload?.selected_student) list.push(payload.selected_student);
  if (Array.isArray(payload?.selected_students)) list.push(...payload.selected_students);
  for (const s of list) {
    if (Number(s?.student_id) === studentId) return true;
    const probes = [
      trimStr(s?.student_uid).toUpperCase(),
      trimStr(s?.student_code).toUpperCase(),
      trimStr(s?.sdm_code).toUpperCase(),
    ].filter(Boolean);
    if (probes.some((p) => p === uid || p === code)) return true;
  }
  return false;
}

function mapOnlineInvoiceStatus(invoiceStatus) {
  const s = String(invoiceStatus || 'NOT_PAID').toUpperCase();
  if (s === 'PAID') return { status: 'paid', status_label: 'Paid' };
  if (s === 'PARTIAL' || s === 'PARTIALLY_PAID') return { status: 'partial', status_label: 'Partially paid' };
  return { status: 'waiting', status_label: 'Waiting to pay' };
}

function describeOnlineChannel(intent, payload) {
  const provider = trimStr(intent.provider);
  if (provider) return `Online · ${provider}`;
  const payMethod = trimStr(payload?.payment_method || payload?.pay_method);
  if (payMethod) return `Online · ${payMethod}`;
  return 'Online · Public pay fees';
}

// GET /api/accountant/students/:studentId/payment-history?academic_year=&term=
router.get('/accountant/students/:studentId/payment-history', requireRole(ACCOUNTANT_ONLY), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    if (!schoolId) {
      return res.status(400).json({ success: false, message: 'School not found in session.' });
    }
    const studentId = Number(req.params.studentId || 0);
    if (!studentId) {
      return res.status(400).json({ success: false, message: 'Invalid student id.' });
    }

    const { academicYear, term } = await resolveAcademicContext(
      schoolId,
      req.query.academic_year || req.query.year || '',
      req.query.term || ''
    );

    await ensureCollectionsTable();

    const [[student]] = await promisePool.query(
      `SELECT s.id, s.student_uid, s.student_code, s.first_name, s.last_name, s.class_name,
              sc.school_name
       FROM students s
       LEFT JOIN schools sc ON sc.id = s.school_id
       WHERE s.id = ? AND s.school_id = ?
       LIMIT 1`,
      [studentId, schoolId]
    );
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    const [manualRows] = await promisePool.query(
      `SELECT
         fc.id,
         fc.student_id,
         fc.academic_year_label,
         fc.term,
         fc.class_name,
         fc.total_due,
         fc.amount_paid,
         fc.balance_remaining,
         fc.notes,
         fc.payment_method,
         fc.bank_name,
         fc.paid_by,
         fc.transaction_ref,
         fc.momo_phone,
         fc.receipt_no,
         fc.paid_at_date,
         fc.created_at,
         sc.school_name,
         TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))) AS recorded_by_name
       FROM school_fee_collections fc
       LEFT JOIN schools sc ON sc.id = fc.school_id
       LEFT JOIN users u ON u.id = fc.recorded_by_user_id
       WHERE fc.school_id = ? AND fc.student_id = ?
       ORDER BY COALESCE(fc.paid_at_date, fc.created_at) DESC, fc.id DESC`,
      [schoolId, studentId]
    );

    const manualItems = (manualRows || [])
      .filter(
        (r) =>
          termMatchesRow(r.term, term)
          && collectionYearMatchesFilter(r.academic_year_label, academicYear)
      )
      .map((r) => {
        const mapped = mapPaymentRow(r);
        return {
          key: `manual-${mapped.id}`,
          source: 'manual',
          source_label: 'Recorded at school',
          payment_id: mapped.id,
          intent_id: null,
          invoice_no: mapped.receipt_no,
          amount: mapped.amount_paid,
          status: 'paid',
          status_label: 'Paid',
          payment_method: mapped.payment_method || 'Cash',
          channel: mapped.payment_method || 'Recorded at school',
          date: mapped.paid_at_date || mapped.created_at,
          reference: mapped.receipt_no || `PAY-${mapped.id}`,
          transaction_ref: mapped.transaction_ref,
          bank_name: mapped.bank_name,
          paid_by: mapped.paid_by,
          momo_phone: mapped.momo_phone,
          notes: mapped.notes,
          view_url: null,
          invoice_pdf_url: null,
          receipt_pdf_url: null,
          can_view: true,
          can_download: true,
          raw: mapped,
        };
      });

    let onlineItems = [];
    try {
      const [intentRows] = await promisePool.query(
        `SELECT
           i.id,
           i.school_id,
           i.babyeyi_id,
           i.total_rwf,
           i.payload_json,
           i.payer_name,
           i.payer_phone,
           i.payer_email,
           i.provider,
           i.provider_reference,
           i.invoice_no,
           i.invoice_status,
           i.invoice_paid_at,
           i.created_at,
           t.term,
           t.academic_year,
           t.class_name AS fee_class_name
         FROM babyeyi_payment_intents i
         LEFT JOIN accountant_babyeyi_fees t ON t.babyeyi_id = i.babyeyi_id AND t.school_id = i.school_id
         WHERE i.school_id = ?
         ORDER BY i.created_at DESC
         LIMIT 500`,
        [schoolId]
      );

      onlineItems = (intentRows || [])
        .filter((row) => {
          const payload = parseIntentPayload(row.payload_json);
          if (!intentMatchesStudent(payload, student)) return false;
          const intentTerm = trimStr(
            row.term || payload?.term || payload?.babyeyi_term || payload?.babyeyi?.term || ''
          );
          const intentYear = trimStr(
            row.academic_year
            || payload?.academic_year
            || payload?.year
            || payload?.babyeyi_academic_year
            || payload?.babyeyi?.academic_year
            || ''
          );
          if (!termMatchesRow(intentTerm, term)) return false;
          if (!yearMatchesRow(intentYear, academicYear)) return false;
          return true;
        })
        .map((row) => {
          const payload = parseIntentPayload(row.payload_json);
          const st = mapOnlineInvoiceStatus(row.invoice_status);
          const invoiceNo = trimStr(row.invoice_no);
          const intentId = Number(row.id);
          const base = '/api/public/babyeyi-pay';
          const invoicePdf = invoiceNo
            ? `${base}/invoice/${intentId}.pdf?invoice_no=${encodeURIComponent(invoiceNo)}`
            : `${base}/invoices/${intentId}/print.pdf`;
          const receiptPdf =
            st.status === 'paid' && invoiceNo
              ? `${base}/receipt/${intentId}.pdf?invoice_no=${encodeURIComponent(invoiceNo)}`
              : null;
          return {
            key: `online-${intentId}`,
            source: 'online',
            source_label: 'Parent · Public pay',
            payment_id: null,
            intent_id: intentId,
            invoice_no: invoiceNo || null,
            amount: Number(row.total_rwf || 0),
            status: st.status,
            status_label: st.status_label,
            payment_method: describeOnlineChannel(row, payload),
            channel: describeOnlineChannel(row, payload),
            date: row.invoice_paid_at || row.created_at,
            reference: invoiceNo || `INV-${intentId}`,
            transaction_ref: trimStr(row.provider_reference) || invoiceNo || null,
            bank_name: null,
            paid_by: trimStr(row.payer_name) || null,
            momo_phone: trimStr(row.payer_phone) || null,
            notes: trimStr(payload?.notes) || null,
            payer_email: trimStr(row.payer_email) || trimStr(payload?.payer_email) || null,
            view_url: invoicePdf,
            invoice_pdf_url: invoicePdf,
            receipt_pdf_url: receiptPdf,
            can_view: true,
            can_download: true,
            raw: {
              id: intentId,
              invoice_status: row.invoice_status,
              provider: row.provider,
              payload,
            },
          };
        });
    } catch (e) {
      console.warn('[payment-history] online intents skipped:', e.message);
    }

    const items = [...manualItems, ...onlineItems].sort((a, b) => {
      const da = new Date(a.date || 0).getTime();
      const db = new Date(b.date || 0).getTime();
      return db - da;
    });

    const summary = {
      total_items: items.length,
      manual_count: manualItems.length,
      online_count: onlineItems.length,
      online_paid: onlineItems.filter((x) => x.status === 'paid').length,
      online_waiting: onlineItems.filter((x) => x.status === 'waiting').length,
      total_amount: items.reduce((s, x) => s + Number(x.amount || 0), 0),
      total_paid_amount: items
        .filter((x) => x.status === 'paid' || x.source === 'manual')
        .reduce((s, x) => s + Number(x.amount || 0), 0),
    };

    return res.json({
      success: true,
      data: {
        student: {
          id: student.id,
          student_uid: student.student_uid,
          student_code: student.student_code,
          full_name: `${student.first_name || ''} ${student.last_name || ''}`.trim(),
          class_name: student.class_name,
          school_name: student.school_name,
        },
        academic_year: academicYear,
        term,
        items,
        summary,
      },
    });
  } catch (err) {
    console.error('GET /accountant/students/:studentId/payment-history', err);
    return res.status(500).json({ success: false, message: 'Failed to load payment history' });
  }
});

router.collectionYearMatchesFilter = collectionYearMatchesFilter;
router.examinationListPayload = examinationListPayload;

module.exports = router;
