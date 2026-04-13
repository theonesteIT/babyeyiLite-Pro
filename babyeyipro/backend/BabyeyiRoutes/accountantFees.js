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
router.get('/accountant/overview', requireRole(ACCOUNTANT_ONLY), async (req, res) => {
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
router.get('/accountant/babyeyi-fee', requireRole(ACCOUNTANT_ONLY), async (req, res) => {
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
router.get('/accountant/reports/payments', requireRole(ACCOUNTANT_ONLY), async (req, res) => {
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
router.get('/accountant/reports/payments/export.xlsx', requireRole(ACCOUNTANT_ONLY), async (req, res) => {
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
router.get('/accountant/reports/payments/export.pdf', requireRole(ACCOUNTANT_ONLY), async (req, res) => {
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

module.exports = router;
