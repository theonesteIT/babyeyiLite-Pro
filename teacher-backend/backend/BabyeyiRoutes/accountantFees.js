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
//   GET  /api/accountant/payroll/config
//   PUT  /api/accountant/payroll/rates
//   PATCH /api/accountant/payroll/staff/:userId
//   GET  /api/accountant/payroll/runs
//   GET  /api/accountant/payroll/runs/:id
//   POST /api/accountant/payroll/runs/trigger
// ════════════════════════════════════════════════════════════════

const express = require('express');
const xlsx = require('xlsx');
const PDFDocument = require('pdfkit');
const { promisePool } = require('../config/database');
const { requireRole } = require('../middleware/deoAuth');

const router = express.Router();
const ACCOUNTANT_ONLY = ['ACCOUNTANT'];
/** Read-only finance APIs shared with school leadership (same school scope as accountant). */
const SCHOOL_FINANCE_READ = ['ACCOUNTANT', 'SCHOOL_ADMIN', 'SCHOOL_MANAGER'];
/** Banks / MoMo / other payout instructions managed per school. */
const SCHOOL_FINANCE_WRITE = ['ACCOUNTANT', 'SCHOOL_ADMIN', 'SCHOOL_MANAGER'];

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
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_sfc_school (school_id),
      KEY idx_sfc_student (student_id),
      KEY idx_sfc_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  collectionsTableReady = true;
}

let opsTablesReady = false;
async function ensureOpsTables() {
  if (opsTablesReady) return;
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS school_expenses (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      vendor VARCHAR(180) NOT NULL,
      category VARCHAR(80) NOT NULL,
      expense_date DATE NOT NULL,
      amount DECIMAL(14,2) NOT NULL DEFAULT 0,
      status ENUM('pending','paid') NOT NULL DEFAULT 'pending',
      invoice_no VARCHAR(120) NULL,
      invoice_file_name VARCHAR(255) NULL,
      note TEXT NULL,
      created_by_user_id INT UNSIGNED NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_se_school (school_id),
      INDEX idx_se_date (expense_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS school_expense_payments (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      expense_id INT UNSIGNED NOT NULL,
      amount DECIMAL(14,2) NOT NULL DEFAULT 0,
      method VARCHAR(60) NULL,
      method_ref VARCHAR(120) NULL,
      paid_date DATE NULL,
      receipt_file_name VARCHAR(255) NULL,
      note TEXT NULL,
      created_by_user_id INT UNSIGNED NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_sep_school (school_id),
      INDEX idx_sep_expense (expense_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS school_requisitions (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      req_code VARCHAR(40) NOT NULL,
      dept VARCHAR(120) NOT NULL,
      requester VARCHAR(180) NOT NULL,
      items TEXT NOT NULL,
      amount DECIMAL(14,2) NOT NULL DEFAULT 0,
      submitted_date DATE NOT NULL,
      status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
      attachment_name VARCHAR(255) NULL,
      note TEXT NULL,
      created_by_user_id INT UNSIGNED NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      approved_by_user_id INT UNSIGNED NULL,
      approved_at DATETIME NULL,
      INDEX idx_sr_school (school_id),
      INDEX idx_sr_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  opsTablesReady = true;
}

let financePayMethodsReady = false;
async function ensureSchoolFinancePayMethodsTable() {
  if (financePayMethodsReady) return;
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS school_finance_pay_methods (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      method_type VARCHAR(32) NOT NULL DEFAULT 'bank',
      title VARCHAR(180) NOT NULL,
      institution VARCHAR(180) NULL,
      identifier VARCHAR(255) NULL,
      beneficiary VARCHAR(255) NULL,
      notes VARCHAR(500) NULL,
      is_primary TINYINT(1) NOT NULL DEFAULT 0,
      sort_order INT UNSIGNED NOT NULL DEFAULT 0,
      created_by_user_id INT UNSIGNED NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_sfpm_school (school_id),
      KEY idx_sfpm_sort (school_id, sort_order)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  financePayMethodsReady = true;
}

let payrollTablesReady = false;
async function ensurePayrollTables() {
  if (payrollTablesReady) return;
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS school_payroll_rates (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      role_label VARCHAR(120) NOT NULL,
      role_code VARCHAR(64) NULL,
      base_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
      allowance_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_spr_school_role (school_id, role_label),
      KEY idx_spr_school (school_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS school_payroll_staff_assignments (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      staff_user_id INT UNSIGNED NOT NULL,
      rate_id INT UNSIGNED NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_spsa_staff (school_id, staff_user_id),
      KEY idx_spsa_school (school_id),
      KEY idx_spsa_rate (rate_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS school_payroll_runs (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      run_code VARCHAR(64) NOT NULL,
      period_label VARCHAR(80) NOT NULL,
      period_key VARCHAR(32) NOT NULL,
      status ENUM('pending','processed') NOT NULL DEFAULT 'processed',
      staff_count INT UNSIGNED NOT NULL DEFAULT 0,
      gross_total DECIMAL(16,2) NOT NULL DEFAULT 0,
      created_by_user_id INT UNSIGNED NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_sprun_code (school_id, run_code),
      KEY idx_sprun_school (school_id),
      KEY idx_sprun_period (school_id, period_key)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS school_payroll_run_lines (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      run_id INT UNSIGNED NOT NULL,
      staff_user_id INT UNSIGNED NOT NULL,
      staff_name VARCHAR(255) NOT NULL,
      dept_label VARCHAR(120) NULL,
      role_label VARCHAR(120) NULL,
      gross_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
      KEY idx_sprl_run (run_id),
      KEY idx_sprl_school (school_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  payrollTablesReady = true;
}

function monthLabelFromKey(periodKey) {
  const m = /^(\d{4})-(\d{2})$/.exec(trimStr(periodKey));
  if (!m) return trimStr(periodKey) || 'Period';
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = new Date(y, mo, 1);
  return d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
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

/**
 * Shared report body for JSON + Excel + PDF exports.
 */
async function buildAccountantPaymentReport(schoolId, academicYear, term, classFilter) {
  await ensureCollectionsTable();

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

  const [babyeyiRows] = await promisePool.query(
    `SELECT id, class_name, classes_json, term, academic_year,
            COALESCE(total_fee, total_amount, 0) AS total_fee
     FROM school_babyeyi
     WHERE school_id = ? AND is_active = 1 AND term = ?
     ORDER BY updated_at DESC`,
    [schoolId, term]
  );

  function totalDueForClass(className) {
    const cn = trimStr(className);
    if (!cn) return null;
    const b = babyeyiRows.find(
      (r) => classMatchesBabyeyi(r, cn) && yearMatchesRow(r.academic_year, academicYear)
    );
    if (!b) return null;
    return Number(b.total_fee || 0);
  }

  const [collRows] = await promisePool.query(
    `SELECT student_id, academic_year_label, amount_paid
     FROM school_fee_collections
     WHERE school_id = ? AND term = ?`,
    [schoolId, term]
  );

  const paidByStudent = new Map();
  for (const row of collRows) {
    if (!collectionYearMatchesFilter(row.academic_year_label, academicYear)) continue;
    const sid = Number(row.student_id);
    const add = Number(row.amount_paid || 0);
    paidByStudent.set(sid, (paidByStudent.get(sid) || 0) + add);
  }

  const EPS = 0.005;
  const rows = students.map((st) => {
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

  const summary = {
    total_students: rows.length,
    full_pay: rows.filter((r) => r.status === 'full_pay' || r.status === 'full').length,
    not_paid: rows.filter((r) => r.status === 'not_paid').length,
    remain_pay: rows.filter((r) => r.status === 'remain_pay').length,
    no_fee_card: rows.filter((r) => r.status === 'no_fee_card').length,
  };

  return {
    filters: { academic_year: academicYear, term, class_name: classFilter || null },
    class_names: classNamesAll,
    summary,
    rows,
  };
}

// ════════════════════════════════════════════════════════════════
// GET /api/accountant/overview
// ════════════════════════════════════════════════════════════════
router.get('/accountant/overview', requireRole(SCHOOL_FINANCE_READ), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    if (!schoolId) {
      return res.status(400).json({ success: false, message: 'School not found in session.' });
    }

    await ensureCollectionsTable();

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

    const [dayRows] = await promisePool.query(
      `SELECT
         DATE_FORMAT(DATE(created_at), '%Y-%m-%d') AS d,
         COALESCE(SUM(amount_paid), 0) AS total_paid
       FROM school_fee_collections
       WHERE school_id = ? AND created_at >= DATE_SUB(CURDATE(), INTERVAL 13 DAY)
       GROUP BY DATE(created_at)
       ORDER BY d ASC`,
      [schoolId]
    );

    const byDay = new Map();
    for (const row of dayRows || []) {
      const key = String(row.d || '').slice(0, 10);
      byDay.set(key, Number(row.total_paid || 0));
    }
    const collections_last_14_days = [];
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
      },
    });
  } catch (err) {
    console.error('GET /accountant/overview:', err);
    return res.status(500).json({ success: false, message: 'Failed to load overview' });
  }
});

// ════════════════════════════════════════════════════════════════
// GET /api/accountant/babyeyi-fee?class_name=&academic_year=&term=
// ════════════════════════════════════════════════════════════════
router.get('/accountant/babyeyi-fee', requireRole(SCHOOL_FINANCE_READ), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    if (!schoolId) {
      return res.status(400).json({ success: false, message: 'School not found in session.' });
    }

    const className = trimStr(req.query.class_name || req.query.class || '');
    const academicYear = trimStr(req.query.academic_year || req.query.year || '');
    const term = trimStr(req.query.term || '');

    if (!className || !academicYear || !term) {
      return res.status(400).json({
        success: false,
        message: 'class_name, academic_year, and term are required.',
      });
    }

    const [rows] = await promisePool.query(
      `SELECT id, doc_id, class_name, classes_json, term, academic_year,
              COALESCE(total_fee, total_amount, 0) AS total_fee,
              payments, status, is_active, updated_at
       FROM school_babyeyi
       WHERE school_id = ?
         AND is_active = 1
         AND term = ?
       ORDER BY updated_at DESC
       LIMIT 80`,
      [schoolId, term]
    );

    const match = rows.find(
      (r) => classMatchesBabyeyi(r, className) && yearMatchesRow(r.academic_year, academicYear)
    );

    if (!match) {
      return res.json({
        success: true,
        data: null,
        message: 'No Babyeyi fee card found for this class, year, and term. Create one in Babyeyi Wizard first.',
      });
    }

    let payments = [];
    try {
      payments = typeof match.payments === 'string' ? JSON.parse(match.payments) : match.payments || [];
    } catch (_) {
      payments = [];
    }

    return res.json({
      success: true,
      data: {
        babyeyi_id: match.id,
        doc_id: match.doc_id,
        total_fee: Number(match.total_fee || 0),
        class_name: match.class_name,
        term: match.term,
        academic_year: match.academic_year,
        payments,
        status: match.status,
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
router.get('/accountant/reports/payments', requireRole(SCHOOL_FINANCE_READ), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    if (!schoolId) {
      return res.status(400).json({ success: false, message: 'School not found in session.' });
    }

    const academicYear = trimStr(req.query.academic_year || req.query.year || '');
    const term = trimStr(req.query.term || '');
    const classFilter = trimStr(req.query.class_name || req.query.class || '');

    if (!academicYear || !term) {
      return res.status(400).json({
        success: false,
        message: 'academic_year and term are required.',
      });
    }

    const data = await buildAccountantPaymentReport(schoolId, academicYear, term, classFilter);
    return res.json({ success: true, data });
  } catch (err) {
    console.error('GET /accountant/reports/payments:', err);
    return res.status(500).json({ success: false, message: 'Failed to build report' });
  }
});

// ════════════════════════════════════════════════════════════════
// GET /api/accountant/reports/payments/export.xlsx
// ════════════════════════════════════════════════════════════════
router.get('/accountant/reports/payments/export.xlsx', requireRole(SCHOOL_FINANCE_READ), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    if (!schoolId) {
      return res.status(400).json({ success: false, message: 'School not found in session.' });
    }

    const academicYear = trimStr(req.query.academic_year || req.query.year || '');
    const term = trimStr(req.query.term || '');
    const classFilter = trimStr(req.query.class_name || req.query.class || '');

    if (!academicYear || !term) {
      return res.status(400).json({
        success: false,
        message: 'academic_year and term are required.',
      });
    }

    const [[schoolRow]] = await promisePool.query(
      'SELECT school_name, school_code FROM schools WHERE id = ? LIMIT 1',
      [schoolId]
    );
    const schoolName = schoolRow?.school_name || `School ${schoolId}`;

    const report = await buildAccountantPaymentReport(schoolId, academicYear, term, classFilter);
    const { summary, rows, filters } = report;

    const metaRows = [
      { Field: 'School', Value: schoolName },
      { Field: 'Academic year', Value: filters.academic_year },
      { Field: 'Term', Value: filters.term },
      { Field: 'Class filter', Value: filters.class_name || 'All classes' },
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
router.get('/accountant/reports/payments/export.pdf', requireRole(SCHOOL_FINANCE_READ), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    if (!schoolId) {
      return res.status(400).json({ success: false, message: 'School not found in session.' });
    }

    const academicYear = trimStr(req.query.academic_year || req.query.year || '');
    const term = trimStr(req.query.term || '');
    const classFilter = trimStr(req.query.class_name || req.query.class || '');

    if (!academicYear || !term) {
      return res.status(400).json({
        success: false,
        message: 'academic_year and term are required.',
      });
    }

    const [[schoolRow]] = await promisePool.query(
      'SELECT school_name, school_code FROM schools WHERE id = ? LIMIT 1',
      [schoolId]
    );
    const schoolName = schoolRow?.school_name || `School ${schoolId}`;

    const report = await buildAccountantPaymentReport(schoolId, academicYear, term, classFilter);
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
router.get('/accountant/payments', requireRole(SCHOOL_FINANCE_READ), async (req, res) => {
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
         fc.created_at,
         s.first_name,
         s.last_name,
         s.student_uid,
         s.student_code
       FROM school_fee_collections fc
       INNER JOIN students s ON s.id = fc.student_id AND s.school_id = fc.school_id
       WHERE fc.school_id = ?
       ORDER BY fc.created_at DESC
       LIMIT ?`,
      [schoolId, limit]
    );

    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /accountant/payments:', err);
    return res.status(500).json({ success: false, message: 'Failed to list payments' });
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
    const academicYear = trimStr(body.academic_year);
    const term = trimStr(body.term);
    let className = trimStr(body.class_name);
    const amountPaid = Number(body.amount_paid);
    const notes = trimStr(body.notes) || null;
    let totalDueIn = body.total_due != null && body.total_due !== '' ? Number(body.total_due) : null;

    if (!studentId || Number.isNaN(studentId)) {
      return res.status(400).json({ success: false, message: 'student_id is required.' });
    }
    if (!academicYear || !term) {
      return res.status(400).json({ success: false, message: 'academic_year and term are required.' });
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

    let babyeyiId = null;
    const [fullRows] = await promisePool.query(
      `SELECT id, class_name, classes_json, academic_year,
              COALESCE(total_fee, total_amount, 0) AS total_fee
       FROM school_babyeyi
       WHERE school_id = ? AND is_active = 1 AND term = ?
       ORDER BY updated_at DESC
       LIMIT 80`,
      [schoolId, term]
    );
    const bMatch = fullRows.find(
      (r) => classMatchesBabyeyi(r, className) && yearMatchesRow(r.academic_year, academicYear)
    );

    if (totalDueIn == null || Number.isNaN(totalDueIn)) {
      if (!bMatch) {
        return res.status(400).json({
          success: false,
          message: 'Could not find Babyeyi total for this class and term. Set total_due manually or create a Babyeyi card.',
        });
      }
      totalDueIn = Number(bMatch.total_fee || 0);
      babyeyiId = bMatch.id;
    } else if (bMatch) {
      babyeyiId = bMatch.id;
    }

    const totalDue = Number(totalDueIn);
    const balance = Math.max(0, totalDue - amountPaid);

    const [ins] = await promisePool.query(
      `INSERT INTO school_fee_collections (
         school_id, student_id, babyeyi_id, academic_year_label, term, class_name,
         total_due, amount_paid, balance_remaining, recorded_by_user_id, notes
       ) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
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
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Payment recorded.',
      data: { id: ins.insertId, balance_remaining: balance },
    });
  } catch (err) {
    console.error('POST /accountant/payments:', err);
    return res.status(500).json({ success: false, message: 'Failed to record payment' });
  }
});

// ════════════════════════════════════════════════════════════════
// EXPENSES
// ════════════════════════════════════════════════════════════════
router.get('/accountant/expenses', requireRole(ACCOUNTANT_ONLY), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School not found in session.' });
    await ensureOpsTables();

    const [rows] = await promisePool.query(
      `SELECT id, vendor, category, expense_date AS date, amount, status, invoice_no, invoice_file_name, note, created_at
       FROM school_expenses
       WHERE school_id = ?
       ORDER BY expense_date DESC, id DESC
       LIMIT 300`,
      [schoolId]
    );
    const [pRows] = await promisePool.query(
      `SELECT id, expense_id, amount, method, method_ref, paid_date, receipt_file_name, note, created_at
       FROM school_expense_payments
       WHERE school_id = ?
       ORDER BY created_at DESC
       LIMIT 1000`,
      [schoolId]
    );
    const paymentsByExpense = new Map();
    for (const p of pRows) {
      const key = Number(p.expense_id);
      if (!paymentsByExpense.has(key)) paymentsByExpense.set(key, []);
      paymentsByExpense.get(key).push({
        id: p.id,
        amount: Number(p.amount || 0),
        method: p.method || '',
        methodRef: p.method_ref || '',
        date: p.paid_date || (p.created_at ? String(p.created_at).slice(0, 10) : ''),
        receiptFileName: p.receipt_file_name || '',
        note: p.note || '',
      });
    }
    const data = rows.map((r) => ({
      id: `EXP-${String(r.id).padStart(3, '0')}`,
      db_id: r.id,
      vendor: r.vendor,
      category: r.category,
      date: r.date,
      amount: Number(r.amount || 0),
      status: r.status,
      note: r.note || '',
      invoiceNo: r.invoice_no || '',
      invoiceFileName: r.invoice_file_name || '',
      payments: paymentsByExpense.get(Number(r.id)) || [],
    }));
    return res.json({ success: true, data });
  } catch (err) {
    console.error('GET /accountant/expenses:', err);
    return res.status(500).json({ success: false, message: 'Failed to load expenses' });
  }
});

router.post('/accountant/expenses', requireRole(ACCOUNTANT_ONLY), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    const userId = req.session?.userId || req.session?.user?.id;
    if (!schoolId || !userId) return res.status(400).json({ success: false, message: 'Invalid session.' });
    await ensureOpsTables();
    const body = req.body || {};
    const vendor = trimStr(body.vendor);
    const category = trimStr(body.category) || 'Other';
    const date = trimStr(body.date) || new Date().toISOString().slice(0, 10);
    const amount = Number(body.amount);
    if (!vendor || Number.isNaN(amount) || amount <= 0) {
      return res.status(400).json({ success: false, message: 'vendor and positive amount are required.' });
    }
    const [ins] = await promisePool.query(
      `INSERT INTO school_expenses
         (school_id, vendor, category, expense_date, amount, status, invoice_no, invoice_file_name, note, created_by_user_id)
       VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)`,
      [schoolId, vendor, category, date, amount, trimStr(body.invoiceNo) || null, trimStr(body.invoiceFileName) || null, trimStr(body.note) || null, userId]
    );
    return res.status(201).json({ success: true, data: { id: ins.insertId } });
  } catch (err) {
    console.error('POST /accountant/expenses:', err);
    return res.status(500).json({ success: false, message: 'Failed to create expense' });
  }
});

router.post('/accountant/expenses/:id/payments', requireRole(ACCOUNTANT_ONLY), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    const userId = req.session?.userId || req.session?.user?.id;
    if (!schoolId || !userId) return res.status(400).json({ success: false, message: 'Invalid session.' });
    await ensureOpsTables();
    const expenseId = Number(req.params.id);
    const body = req.body || {};
    const amount = Number(body.amount);
    if (!expenseId || Number.isNaN(amount) || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid expense id and amount are required.' });
    }
    const [[exp]] = await promisePool.query('SELECT id, amount FROM school_expenses WHERE id = ? AND school_id = ? LIMIT 1', [expenseId, schoolId]);
    if (!exp) return res.status(404).json({ success: false, message: 'Expense not found.' });
    await promisePool.query(
      `INSERT INTO school_expense_payments
         (school_id, expense_id, amount, method, method_ref, paid_date, receipt_file_name, note, created_by_user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [schoolId, expenseId, amount, trimStr(body.method) || null, trimStr(body.methodRef) || null, trimStr(body.date) || null, trimStr(body.receiptFileName) || null, trimStr(body.note) || null, userId]
    );
    const [[sumRow]] = await promisePool.query('SELECT COALESCE(SUM(amount),0) AS paid FROM school_expense_payments WHERE school_id = ? AND expense_id = ?', [schoolId, expenseId]);
    const totalPaid = Number(sumRow?.paid || 0);
    const nextStatus = totalPaid >= Number(exp.amount || 0) ? 'paid' : 'pending';
    await promisePool.query('UPDATE school_expenses SET status = ? WHERE id = ? AND school_id = ?', [nextStatus, expenseId, schoolId]);
    return res.json({ success: true, data: { status: nextStatus } });
  } catch (err) {
    console.error('POST /accountant/expenses/:id/payments:', err);
    return res.status(500).json({ success: false, message: 'Failed to record expense payment' });
  }
});

router.patch('/accountant/expenses/:id/status', requireRole(ACCOUNTANT_ONLY), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School not found in session.' });
    await ensureOpsTables();
    const expenseId = Number(req.params.id);
    const status = trimStr(req.body?.status).toLowerCase();
    if (!expenseId || !['pending', 'paid'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid payload.' });
    }
    await promisePool.query('UPDATE school_expenses SET status = ? WHERE id = ? AND school_id = ?', [status, expenseId, schoolId]);
    return res.json({ success: true });
  } catch (err) {
    console.error('PATCH /accountant/expenses/:id/status:', err);
    return res.status(500).json({ success: false, message: 'Failed to update expense status' });
  }
});

// ════════════════════════════════════════════════════════════════
// REQUISITIONS
// ════════════════════════════════════════════════════════════════
router.get('/accountant/requisitions', requireRole(ACCOUNTANT_ONLY), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School not found in session.' });
    await ensureOpsTables();
    const [rows] = await promisePool.query(
      `SELECT id, req_code, dept, requester, items, amount, submitted_date, status, attachment_name, note
       FROM school_requisitions
       WHERE school_id = ?
       ORDER BY submitted_date DESC, id DESC
       LIMIT 300`,
      [schoolId]
    );
    const data = rows.map((r) => ({
      id: r.req_code || `REQ-${String(r.id).padStart(4, '0')}`,
      db_id: r.id,
      dept: r.dept,
      requester: r.requester,
      items: r.items,
      amount: Number(r.amount || 0),
      submitted: r.submitted_date,
      status: r.status,
      attachmentName: r.attachment_name || '',
      note: r.note || '',
    }));
    return res.json({ success: true, data });
  } catch (err) {
    console.error('GET /accountant/requisitions:', err);
    return res.status(500).json({ success: false, message: 'Failed to load requisitions' });
  }
});

router.post('/accountant/requisitions', requireRole(ACCOUNTANT_ONLY), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    const userId = req.session?.userId || req.session?.user?.id;
    if (!schoolId || !userId) return res.status(400).json({ success: false, message: 'Invalid session.' });
    await ensureOpsTables();
    const body = req.body || {};
    const dept = trimStr(body.dept);
    const requester = trimStr(body.requester);
    const items = trimStr(body.items);
    const amount = Number(body.amount);
    const submitted = trimStr(body.submitted) || new Date().toISOString().slice(0, 10);
    if (!dept || !requester || !items || Number.isNaN(amount) || amount <= 0) {
      return res.status(400).json({ success: false, message: 'dept, requester, items and positive amount are required.' });
    }
    const [[cnt]] = await promisePool.query('SELECT COUNT(*) AS c FROM school_requisitions WHERE school_id = ?', [schoolId]);
    const reqCode = `REQ-${String(Number(cnt?.c || 0) + 1001)}`;
    const [ins] = await promisePool.query(
      `INSERT INTO school_requisitions
         (school_id, req_code, dept, requester, items, amount, submitted_date, status, attachment_name, note, created_by_user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)`,
      [schoolId, reqCode, dept, requester, items, amount, submitted, trimStr(body.attachmentName) || null, trimStr(body.note) || null, userId]
    );
    return res.status(201).json({ success: true, data: { id: ins.insertId, req_code: reqCode } });
  } catch (err) {
    console.error('POST /accountant/requisitions:', err);
    return res.status(500).json({ success: false, message: 'Failed to create requisition' });
  }
});

router.patch('/accountant/requisitions/:id/status', requireRole(ACCOUNTANT_ONLY), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    const userId = req.session?.userId || req.session?.user?.id;
    if (!schoolId || !userId) return res.status(400).json({ success: false, message: 'Invalid session.' });
    await ensureOpsTables();
    const reqId = Number(req.params.id);
    const status = trimStr(req.body?.status).toLowerCase();
    if (!reqId || !['pending', 'approved', 'rejected', 'issued'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid payload.' });
    }
    await promisePool.query(
      `UPDATE school_requisitions
       SET status = ?, approved_by_user_id = ?, approved_at = NOW()
       WHERE id = ? AND school_id = ?`,
      [status, userId, reqId, schoolId]
    );
    return res.json({ success: true });
  } catch (err) {
    console.error('PATCH /accountant/requisitions/:id/status:', err);
    return res.status(500).json({ success: false, message: 'Failed to update requisition status' });
  }
});

// ════════════════════════════════════════════════════════════════
// PAYROLL
// ════════════════════════════════════════════════════════════════
router.get('/accountant/payroll/config', requireRole(ACCOUNTANT_ONLY), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School not found in session.' });
    await ensurePayrollTables();

    const [rateRows] = await promisePool.query(
      `SELECT id, role_label AS role, base_amount AS base, allowance_amount AS allowance, role_code
       FROM school_payroll_rates
       WHERE school_id = ?
       ORDER BY role_label ASC`,
      [schoolId]
    );
    const rates = (rateRows || []).map((r) => ({
      id: `RATE-${r.id}`,
      db_id: r.id,
      role: r.role,
      base: Number(r.base || 0),
      allowance: Number(r.allowance || 0),
      role_code: r.role_code || null,
    }));

    const [staffRows] = await promisePool.query(
      `SELECT
         u.id AS user_id,
         CONCAT(COALESCE(u.first_name,''), ' ', COALESCE(u.last_name,'')) AS full_name,
         r.role_code,
         r.role_name,
         a.rate_id,
         COALESCE(a.is_active, 1) AS is_active
       FROM staff st
       INNER JOIN users u ON u.id = st.user_id AND u.deleted_at IS NULL
       INNER JOIN roles r ON r.id = u.role_id
       LEFT JOIN school_payroll_staff_assignments a
         ON a.school_id = st.school_id AND a.staff_user_id = u.id
       WHERE st.school_id = ?
       ORDER BY full_name ASC`,
      [schoolId]
    );

    const staff = (staffRows || []).map((s) => {
      const rid = s.rate_id ? `RATE-${s.rate_id}` : '';
      const dept = trimStr(s.role_name) || trimStr(s.role_code) || 'Staff';
      const role = trimStr(s.role_name) || trimStr(s.role_code) || 'Staff';
      return {
        id: `STF-${s.user_id}`,
        db_user_id: s.user_id,
        name: trimStr(s.full_name) || 'Staff member',
        dept,
        role,
        rateId: rid,
        active: !!s.is_active,
      };
    });

    return res.json({ success: true, data: { rates, staff } });
  } catch (err) {
    console.error('GET /accountant/payroll/config:', err);
    return res.status(500).json({ success: false, message: 'Failed to load payroll config' });
  }
});

router.put('/accountant/payroll/rates', requireRole(ACCOUNTANT_ONLY), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School not found in session.' });
    await ensurePayrollTables();
    const rows = Array.isArray(req.body?.rates) ? req.body.rates : null;
    if (!rows || !rows.length) {
      return res.status(400).json({ success: false, message: 'rates array is required.' });
    }
    for (const row of rows) {
      const role = trimStr(row.role);
      const base = Number(row.base);
      const allowance = Number(row.allowance);
      if (!role || Number.isNaN(base) || Number.isNaN(allowance)) continue;
      await promisePool.query(
        `INSERT INTO school_payroll_rates (school_id, role_label, role_code, base_amount, allowance_amount)
         VALUES (?, ?, NULL, ?, ?)
         ON DUPLICATE KEY UPDATE base_amount = VALUES(base_amount), allowance_amount = VALUES(allowance_amount)`,
        [schoolId, role, base, allowance]
      );
    }
    return res.json({ success: true });
  } catch (err) {
    console.error('PUT /accountant/payroll/rates:', err);
    return res.status(500).json({ success: false, message: 'Failed to save payroll rates' });
  }
});

router.patch('/accountant/payroll/staff/:userId', requireRole(ACCOUNTANT_ONLY), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School not found in session.' });
    await ensurePayrollTables();
    const staffUserId = Number(req.params.userId);
    if (!staffUserId) return res.status(400).json({ success: false, message: 'Invalid staff user id.' });

    const [[mem]] = await promisePool.query(
      `SELECT u.id
       FROM staff st
       INNER JOIN users u ON u.id = st.user_id AND u.deleted_at IS NULL
       WHERE st.school_id = ? AND u.id = ? LIMIT 1`,
      [schoolId, staffUserId]
    );
    if (!mem) return res.status(404).json({ success: false, message: 'Staff member not found in this school.' });

    const body = req.body || {};
    let nextRateId = undefined;
    if (body.rateId !== undefined) {
      const raw = body.rateId;
      if (raw === null || raw === '' || (typeof raw === 'string' && !trimStr(raw))) {
        nextRateId = null;
      } else {
        const m = /^RATE-(\d+)$/.exec(trimStr(raw));
        const num = m ? Number(m[1]) : Number(raw);
        if (!num || Number.isNaN(num)) {
          return res.status(400).json({ success: false, message: 'Invalid rate id.' });
        }
        const [[rateOk]] = await promisePool.query(
          'SELECT id FROM school_payroll_rates WHERE id = ? AND school_id = ? LIMIT 1',
          [num, schoolId]
        );
        if (!rateOk) return res.status(400).json({ success: false, message: 'Rate does not belong to this school.' });
        nextRateId = num;
      }
    }

    const nextActive = body.active !== undefined ? (body.active ? 1 : 0) : undefined;

    if (nextRateId !== undefined || nextActive !== undefined) {
      const insertRate = nextRateId !== undefined ? nextRateId : null;
      const insertActive = nextActive !== undefined ? nextActive : 1;
      const updRateExpr =
        nextRateId !== undefined ? 'VALUES(rate_id)' : 'school_payroll_staff_assignments.rate_id';
      const updActiveExpr =
        nextActive !== undefined ? 'VALUES(is_active)' : 'school_payroll_staff_assignments.is_active';

      await promisePool.query(
        `INSERT INTO school_payroll_staff_assignments (school_id, staff_user_id, rate_id, is_active)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           rate_id = ${updRateExpr},
           is_active = ${updActiveExpr}`,
        [schoolId, staffUserId, insertRate, insertActive]
      );
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('PATCH /accountant/payroll/staff/:userId:', err);
    return res.status(500).json({ success: false, message: 'Failed to update staff payroll assignment' });
  }
});

router.get('/accountant/payroll/runs', requireRole(ACCOUNTANT_ONLY), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School not found in session.' });
    await ensurePayrollTables();
    const limit = Math.min(100, Math.max(5, Number(req.query.limit) || 40));
    const [rows] = await promisePool.query(
      `SELECT id, run_code, period_label, period_key, status, staff_count, gross_total, created_at
       FROM school_payroll_runs
       WHERE school_id = ?
       ORDER BY created_at DESC, id DESC
       LIMIT ?`,
      [schoolId, limit]
    );
    const data = (rows || []).map((r) => ({
      id: r.run_code,
      db_id: r.id,
      period: r.period_label,
      period_key: r.period_key,
      status: r.status,
      staffCount: Number(r.staff_count || 0),
      grossTotal: Number(r.gross_total || 0),
      created_at: r.created_at,
    }));
    return res.json({ success: true, data });
  } catch (err) {
    console.error('GET /accountant/payroll/runs:', err);
    return res.status(500).json({ success: false, message: 'Failed to list payroll runs' });
  }
});

router.get('/accountant/payroll/runs/:id', requireRole(ACCOUNTANT_ONLY), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School not found in session.' });
    await ensurePayrollTables();
    const rawId = trimStr(req.params.id);
    const runIdNum = /^\d+$/.test(rawId) ? Number(rawId) : null;
    const [[run]] = await promisePool.query(
      runIdNum
        ? `SELECT id, run_code, period_label, period_key, status, staff_count, gross_total, created_at
           FROM school_payroll_runs WHERE school_id = ? AND id = ? LIMIT 1`
        : `SELECT id, run_code, period_label, period_key, status, staff_count, gross_total, created_at
           FROM school_payroll_runs WHERE school_id = ? AND run_code = ? LIMIT 1`,
      runIdNum ? [schoolId, runIdNum] : [schoolId, rawId]
    );
    if (!run) return res.status(404).json({ success: false, message: 'Payroll run not found.' });
    const [lines] = await promisePool.query(
      `SELECT id, staff_name, dept_label, role_label, gross_amount
       FROM school_payroll_run_lines
       WHERE school_id = ? AND run_id = ?
       ORDER BY staff_name ASC`,
      [schoolId, run.id]
    );
    const payload = {
      id: run.run_code,
      db_id: run.id,
      period: run.period_label,
      period_key: run.period_key,
      status: run.status,
      staffCount: Number(run.staff_count || 0),
      grossTotal: Number(run.gross_total || 0),
      lines: (lines || []).map((l) => ({
        id: `L-${l.id}`,
        staff: l.staff_name,
        dept: l.dept_label || '—',
        role: l.role_label || '—',
        gross: Number(l.gross_amount || 0),
      })),
    };
    return res.json({ success: true, data: payload });
  } catch (err) {
    console.error('GET /accountant/payroll/runs/:id:', err);
    return res.status(500).json({ success: false, message: 'Failed to load payroll run' });
  }
});

router.post('/accountant/payroll/runs/trigger', requireRole(ACCOUNTANT_ONLY), async (req, res) => {
  const conn = await promisePool.getConnection();
  try {
    const schoolId = resolveSchoolId(req);
    const userId = req.session?.userId || req.session?.user?.id;
    if (!schoolId || !userId) return res.status(400).json({ success: false, message: 'Invalid session.' });
    await ensurePayrollTables();

    const body = req.body || {};
    const now = new Date();
    const periodKey = trimStr(body.period_key) || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const periodLabel = trimStr(body.period_label) || monthLabelFromKey(periodKey);

    const [[dup]] = await conn.query(
      'SELECT id FROM school_payroll_runs WHERE school_id = ? AND period_key = ? LIMIT 1',
      [schoolId, periodKey]
    );
    if (dup) {
      conn.release();
      return res.status(409).json({ success: false, message: 'A payroll run already exists for this period.' });
    }

    const [staffRows] = await conn.query(
      `SELECT
         u.id AS user_id,
         CONCAT(COALESCE(u.first_name,''), ' ', COALESCE(u.last_name,'')) AS full_name,
         r.role_code,
         r.role_name,
         a.rate_id,
         COALESCE(a.is_active, 1) AS is_active
       FROM staff st
       INNER JOIN users u ON u.id = st.user_id AND u.deleted_at IS NULL
       INNER JOIN roles r ON r.id = u.role_id
       LEFT JOIN school_payroll_staff_assignments a
         ON a.school_id = st.school_id AND a.staff_user_id = u.id
       WHERE st.school_id = ?`,
      [schoolId]
    );

    const [rateRows] = await conn.query(
      'SELECT id, role_label, base_amount, allowance_amount FROM school_payroll_rates WHERE school_id = ?',
      [schoolId]
    );
    const rateById = new Map((rateRows || []).map((x) => [Number(x.id), x]));
    const rateByRoleLabel = new Map(
      (rateRows || []).map((x) => [String(x.role_label || '').toLowerCase(), x])
    );

    const lines = [];
    let grossTotal = 0;
    let activeCount = 0;

    for (const s of staffRows || []) {
      if (!s.is_active) continue;
      activeCount += 1;
      const name = trimStr(s.full_name) || 'Staff member';
      const roleLabel = trimStr(s.role_name) || trimStr(s.role_code) || 'Staff';
      const deptLabel = roleLabel;
      let gross = 0;
      if (s.rate_id && rateById.has(Number(s.rate_id))) {
        const rr = rateById.get(Number(s.rate_id));
        gross = Number(rr.base_amount || 0) + Number(rr.allowance_amount || 0);
      } else {
        const match = rateByRoleLabel.get(roleLabel.toLowerCase());
        if (match) {
          gross = Number(match.base_amount || 0) + Number(match.allowance_amount || 0);
        }
      }
      grossTotal += gross;
      lines.push({
        staff_user_id: s.user_id,
        staff_name: name,
        dept_label: deptLabel,
        role_label: roleLabel,
        gross_amount: gross,
      });
    }

    const runCode = `RUN-${periodKey.replace(/[^0-9A-Za-z]+/g, '')}-${Date.now().toString(36).toUpperCase()}`;

    await conn.beginTransaction();
    const [insRun] = await conn.query(
      `INSERT INTO school_payroll_runs
        (school_id, run_code, period_label, period_key, status, staff_count, gross_total, created_by_user_id)
       VALUES (?, ?, ?, ?, 'processed', ?, ?, ?)`,
      [schoolId, runCode, periodLabel, periodKey, activeCount, grossTotal, userId]
    );
    const runId = insRun.insertId;
    for (const ln of lines) {
      await conn.query(
        `INSERT INTO school_payroll_run_lines
          (school_id, run_id, staff_user_id, staff_name, dept_label, role_label, gross_amount)
         VALUES (?,?,?,?,?,?,?)`,
        [schoolId, runId, ln.staff_user_id, ln.staff_name, ln.dept_label, ln.role_label, ln.gross_amount]
      );
    }
    await conn.commit();
    conn.release();

    return res.status(201).json({
      success: true,
      data: {
        id: runCode,
        db_id: runId,
        period: periodLabel,
        period_key: periodKey,
        status: 'processed',
        staffCount: activeCount,
        grossTotal,
      },
    });
  } catch (err) {
    await conn.rollback().catch(() => {});
    conn.release();
    console.error('POST /accountant/payroll/runs/trigger:', err);
    return res.status(500).json({ success: false, message: 'Failed to trigger payroll run' });
  }
});

// ════════════════════════════════════════════════════════════════
// School banks & payment methods (Finance Center — Banks tab)
//   GET    /api/accountant/finance-pay-methods
//   POST   /api/accountant/finance-pay-methods
//   PATCH  /api/accountant/finance-pay-methods/:id
//   DELETE /api/accountant/finance-pay-methods/:id
//   POST   /api/accountant/finance-pay-methods/:id/set-primary
// ════════════════════════════════════════════════════════════════

const PAY_METHOD_TYPES = new Set(['bank', 'momo', 'card', 'cash', 'other']);

router.get('/accountant/finance-pay-methods', requireRole(SCHOOL_FINANCE_READ), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    if (!schoolId) {
      return res.status(400).json({ success: false, message: 'School not found in session.' });
    }
    await ensureSchoolFinancePayMethodsTable();
    const [rows] = await promisePool.query(
      `SELECT id, school_id, method_type, title, institution, identifier, beneficiary, notes,
              is_primary, sort_order, created_at, updated_at
       FROM school_finance_pay_methods
       WHERE school_id = ?
       ORDER BY is_primary DESC, sort_order ASC, id ASC`,
      [schoolId]
    );
    return res.json({ success: true, data: rows || [] });
  } catch (err) {
    console.error('GET /accountant/finance-pay-methods:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to load payment methods' });
  }
});

router.post('/accountant/finance-pay-methods', requireRole(SCHOOL_FINANCE_WRITE), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    const userId = req.session?.userId || req.session?.user?.id || null;
    if (!schoolId) {
      return res.status(400).json({ success: false, message: 'School not found in session.' });
    }
    await ensureSchoolFinancePayMethodsTable();
    const body = req.body || {};
    const methodType = String(body.method_type || 'bank').toLowerCase();
    if (!PAY_METHOD_TYPES.has(methodType)) {
      return res.status(400).json({ success: false, message: 'Invalid method_type' });
    }
    const title = trimStr(body.title);
    if (!title) {
      return res.status(400).json({ success: false, message: 'title is required' });
    }
    const institution = trimStr(body.institution) || null;
    const identifier = trimStr(body.identifier) || null;
    const beneficiary = trimStr(body.beneficiary) || null;
    const notes = trimStr(body.notes).slice(0, 500) || null;
    const wantPrimary = !!body.is_primary;
    const [[{ mx }]] = await promisePool.query(
      'SELECT COALESCE(MAX(sort_order),0) AS mx FROM school_finance_pay_methods WHERE school_id = ?',
      [schoolId]
    );
    const sortOrder = Number(mx || 0) + 1;

    const conn = await promisePool.getConnection();
    try {
      await conn.beginTransaction();
      if (wantPrimary) {
        await conn.query('UPDATE school_finance_pay_methods SET is_primary = 0 WHERE school_id = ?', [schoolId]);
      }
      const [ins] = await conn.query(
        `INSERT INTO school_finance_pay_methods
         (school_id, method_type, title, institution, identifier, beneficiary, notes, is_primary, sort_order, created_by_user_id)
         VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [
          schoolId,
          methodType,
          title,
          institution,
          identifier,
          beneficiary,
          notes,
          wantPrimary ? 1 : 0,
          sortOrder,
          userId,
        ]
      );
      await conn.commit();
      conn.release();
      return res.status(201).json({ success: true, data: { id: ins.insertId } });
    } catch (e) {
      await conn.rollback().catch(() => {});
      conn.release();
      throw e;
    }
  } catch (err) {
    console.error('POST /accountant/finance-pay-methods:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to create payment method' });
  }
});

router.patch('/accountant/finance-pay-methods/:id', requireRole(SCHOOL_FINANCE_WRITE), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    if (!schoolId) {
      return res.status(400).json({ success: false, message: 'School not found in session.' });
    }
    const id = Number(req.params.id || 0);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid id' });
    await ensureSchoolFinancePayMethodsTable();
    const [[row]] = await promisePool.query(
      'SELECT id FROM school_finance_pay_methods WHERE id = ? AND school_id = ? LIMIT 1',
      [id, schoolId]
    );
    if (!row) return res.status(404).json({ success: false, message: 'Not found' });

    const body = req.body || {};
    const fields = [];
    const params = [];
    if (body.method_type !== undefined) {
      const methodType = String(body.method_type || '').toLowerCase();
      if (!PAY_METHOD_TYPES.has(methodType)) {
        return res.status(400).json({ success: false, message: 'Invalid method_type' });
      }
      fields.push('method_type = ?');
      params.push(methodType);
    }
    if (body.title !== undefined) {
      const title = trimStr(body.title);
      if (!title) return res.status(400).json({ success: false, message: 'title cannot be empty' });
      fields.push('title = ?');
      params.push(title);
    }
    if (body.institution !== undefined) {
      fields.push('institution = ?');
      params.push(trimStr(body.institution) || null);
    }
    if (body.identifier !== undefined) {
      fields.push('identifier = ?');
      params.push(trimStr(body.identifier) || null);
    }
    if (body.beneficiary !== undefined) {
      fields.push('beneficiary = ?');
      params.push(trimStr(body.beneficiary) || null);
    }
    if (body.notes !== undefined) {
      fields.push('notes = ?');
      params.push(trimStr(body.notes).slice(0, 500) || null);
    }
    if (body.sort_order !== undefined) {
      fields.push('sort_order = ?');
      params.push(Math.max(0, Number(body.sort_order) || 0));
    }
    const setPrimary = body.is_primary === true || body.is_primary === 1;
    if (!fields.length && !setPrimary) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }
    if (fields.length) {
      params.push(id, schoolId);
      await promisePool.query(
        `UPDATE school_finance_pay_methods SET ${fields.join(', ')} WHERE id = ? AND school_id = ?`,
        params
      );
    }
    if (setPrimary) {
      await promisePool.query('UPDATE school_finance_pay_methods SET is_primary = 0 WHERE school_id = ?', [schoolId]);
      await promisePool.query(
        'UPDATE school_finance_pay_methods SET is_primary = 1 WHERE id = ? AND school_id = ?',
        [id, schoolId]
      );
    }
    return res.json({ success: true, message: 'Updated' });
  } catch (err) {
    console.error('PATCH /accountant/finance-pay-methods/:id:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to update' });
  }
});

router.delete('/accountant/finance-pay-methods/:id', requireRole(SCHOOL_FINANCE_WRITE), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    if (!schoolId) {
      return res.status(400).json({ success: false, message: 'School not found in session.' });
    }
    const id = Number(req.params.id || 0);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid id' });
    await ensureSchoolFinancePayMethodsTable();
    const [r] = await promisePool.query(
      'DELETE FROM school_finance_pay_methods WHERE id = ? AND school_id = ?',
      [id, schoolId]
    );
    if (!r.affectedRows) return res.status(404).json({ success: false, message: 'Not found' });
    return res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    console.error('DELETE /accountant/finance-pay-methods/:id:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to delete' });
  }
});

router.post('/accountant/finance-pay-methods/:id/set-primary', requireRole(SCHOOL_FINANCE_WRITE), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    if (!schoolId) {
      return res.status(400).json({ success: false, message: 'School not found in session.' });
    }
    const id = Number(req.params.id || 0);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid id' });
    await ensureSchoolFinancePayMethodsTable();
    const [[row]] = await promisePool.query(
      'SELECT id FROM school_finance_pay_methods WHERE id = ? AND school_id = ? LIMIT 1',
      [id, schoolId]
    );
    if (!row) return res.status(404).json({ success: false, message: 'Not found' });
    await promisePool.query('UPDATE school_finance_pay_methods SET is_primary = 0 WHERE school_id = ?', [schoolId]);
    await promisePool.query(
      'UPDATE school_finance_pay_methods SET is_primary = 1 WHERE id = ? AND school_id = ?',
      [id, schoolId]
    );
    return res.json({ success: true, message: 'Primary updated' });
  } catch (err) {
    console.error('POST /accountant/finance-pay-methods/:id/set-primary:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to set primary' });
  }
});

module.exports = router;
