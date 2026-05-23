// ================================================================
// studentTransfer.js — School Manager: Student Transfer / Replacement
//
// Workflow:
//   Receiving school:
//     1) Lookup student by `student_uid`
//     2) Review details (DOS / Discipline / Accountant snapshot)
//     3) Create transfer request (status = pending)
//
//   Old school:
//     4) Approve / reject request (approve updates student + all linked records)
//
// ================================================================

const express = require('express');
const { promisePool, executeTransaction } = require('../config/database');
const { requireRole } = require('../middleware/deoAuth');

const router = express.Router();

const SCHOOL_ADMIN_OR_MANAGER = ['SCHOOL_ADMIN', 'SCHOOL_MANAGER'];

function resolveSchoolId(req) {
  return (
    req.session?.school_id ||
    req.session?.user?.school_id ||
    req.session?.user?.school?.id ||
    req.deoUser?.schoolId ||
    req.session?.user?.school?.id ||
    null
  );
}

function resolveUserId(req) {
  return req.session?.userId || req.session?.user?.id || req.user?.id || null;
}

function trimStr(v) {
  if (v === undefined || v === null) return '';
  return String(v).trim();
}

function safeFilenamePart(s) {
  return String(s || 'report')
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/^\-+|\-+$/g, '');
}

let tablesReady = false;
async function ensureTransferTables() {
  if (tablesReady) return;

  // Transfer request
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS student_transfer_requests (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id_from INT UNSIGNED NOT NULL,
      school_id_to   INT UNSIGNED NOT NULL,
      student_id INT UNSIGNED NOT NULL,
      student_uid VARCHAR(50) NOT NULL,
      student_code VARCHAR(15) NULL,

      requested_by_user_id INT UNSIGNED NOT NULL,
      reason TEXT NULL,
      notes_from_to_school TEXT NULL,

      status VARCHAR(32) NOT NULL DEFAULT 'pending', -- pending|approved|rejected

      responded_by_user_id INT UNSIGNED NULL,
      notes_from_from_school TEXT NULL,

      approved_at DATETIME NULL,
      rejected_at DATETIME NULL,

      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

      INDEX idx_request_student (student_id),
      INDEX idx_request_from (school_id_from, status),
      INDEX idx_request_to (school_id_to, status),
      INDEX idx_request_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // History log
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS student_transfer_logs (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      request_id INT UNSIGNED NOT NULL,
      school_id INT UNSIGNED NULL,
      action VARCHAR(32) NOT NULL, -- requested|approved|rejected
      note TEXT NULL,
      created_by_user_id INT UNSIGNED NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_logs_request (request_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // Notifications (simple in-DB representation)
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS student_transfer_notifications (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      request_id INT UNSIGNED NOT NULL,
      notification_type VARCHAR(32) NOT NULL, -- requested|approved|rejected
      message VARCHAR(255) NOT NULL,
      is_read TINYINT(1) NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_notif_school (school_id, created_at),
      INDEX idx_notif_request (request_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // Ensure related tables exist (for lookup + approval update)
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS dos_student_academic_records (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      student_id INT UNSIGNED NOT NULL,
      academic_year VARCHAR(32) NOT NULL,
      term VARCHAR(32) NOT NULL,
      class_name VARCHAR(120) NULL,
      status_code VARCHAR(32) NOT NULL,
      status_label VARCHAR(64) NULL,
      marks_obtained DECIMAL(8,2) NOT NULL DEFAULT 0,
      marks_remaining DECIMAL(8,2) NOT NULL DEFAULT 0,
      notes TEXT NULL,
      recorded_by_user_id INT UNSIGNED NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_student_term (school_id, student_id, academic_year, term),
      INDEX idx_school_year_term (school_id, academic_year, term),
      INDEX idx_school_class (school_id, class_name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS discipline_cases (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      student_id INT UNSIGNED NOT NULL,
      academic_year VARCHAR(64) NOT NULL,
      term VARCHAR(32) NOT NULL,
      class_name VARCHAR(120) NULL,
      lesson_subject VARCHAR(255) NOT NULL,
      description TEXT NULL,
      marks_deducted DECIMAL(8,2) NOT NULL,
      marks_remaining_after DECIMAL(8,2) NOT NULL,
      recorded_by_user_id INT UNSIGNED NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_school_student_year_term (school_id, student_id, academic_year, term),
      INDEX idx_school_created (school_id, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

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

  tablesReady = true;
}

// ================================================================
// Helpers: matching + formatting
// ================================================================

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

function paymentStatusFromTotals(totalDue, amountPaid) {
  const due = Number(totalDue || 0);
  const paid = Number(amountPaid || 0);
  if (due <= 0) return { status_code: 'unknown', status_label: '—', remaining_balance: 0 };
  const remaining = Math.max(0, due - paid);
  if (paid <= 0) return { status_code: 'not_paid', status_label: 'Not paid', remaining_balance: remaining };
  if (paid >= due - 0.0001) return { status_code: 'full_pay', status_label: 'Fully paid', remaining_balance: 0 };
  return { status_code: 'remain_pay', status_label: 'Partially paid', remaining_balance: remaining };
}

async function getLatestAcademicPeriodForStudent(schoolId, studentId) {
  // Prefer DOS record latest
  const [dosRows] = await promisePool.query(
    `SELECT academic_year, term
     FROM dos_student_academic_records
     WHERE school_id = ? AND student_id = ?
     ORDER BY updated_at DESC, created_at DESC
     LIMIT 1`,
    [schoolId, studentId]
  );
  const dos = (dosRows || [])[0];
  if (dos?.academic_year && dos?.term) return { academic_year: dos.academic_year, term: dos.term };

  // Fallback: discipline latest
  const [discRows] = await promisePool.query(
    `SELECT academic_year, term
     FROM discipline_cases
     WHERE school_id = ? AND student_id = ?
     ORDER BY created_at DESC
     LIMIT 1`,
    [schoolId, studentId]
  );
  const disc = (discRows || [])[0];
  if (disc?.academic_year && disc?.term) return { academic_year: disc.academic_year, term: disc.term };

  return { academic_year: null, term: 'Term 1' };
}

async function getDisciplineSummaryAndCases(oldSchoolId, studentId, academicYear, term) {
  // total_marks default for remaining calculation
  const [[defaultRow]] = await promisePool.query(
    `SELECT default_marks FROM school_discipline_default_marks WHERE school_id = ? LIMIT 1`,
    [oldSchoolId]
  );
  const totalMarks = Number(defaultRow?.default_marks || 40);

  const [caseRows] = await promisePool.query(
    `SELECT
        id, lesson_subject, description,
        marks_deducted, marks_remaining_after,
        created_at,
        class_name, academic_year, term
      FROM discipline_cases
      WHERE school_id = ?
        AND student_id = ?
        AND academic_year = ?
        AND term = ?
      ORDER BY created_at DESC
      LIMIT 60`,
    [oldSchoolId, studentId, academicYear, term]
  );

  const sumDeducted = (caseRows || []).reduce((acc, c) => acc + Number(c.marks_deducted || 0), 0);
  const remaining = Math.max(0, totalMarks - sumDeducted);

  return {
    total_marks_default: totalMarks,
    discipline_deducted_total: Number(sumDeducted.toFixed(2)),
    discipline_remaining_total: Number(remaining.toFixed(2)),
    cases: (caseRows || []).map((c) => ({
      id: c.id,
      lesson_subject: c.lesson_subject,
      description: c.description,
      marks_deducted: Number(c.marks_deducted || 0),
      marks_remaining_after: Number(c.marks_remaining_after || 0),
      created_at: c.created_at,
      class_name: c.class_name,
    })),
  };
}

async function getDosRecords(oldSchoolId, studentId) {
  const [rows] = await promisePool.query(
    `SELECT
      academic_year, term, class_name,
      status_code, status_label,
      marks_obtained, notes,
      updated_at, created_at
     FROM dos_student_academic_records
     WHERE school_id = ? AND student_id = ?
     ORDER BY updated_at DESC, created_at DESC
     LIMIT 8`,
    [oldSchoolId, studentId]
  );

  const records = (rows || []).map((r) => ({
    academic_year: r.academic_year,
    term: r.term,
    class_name: r.class_name,
    status_code: r.status_code,
    status_label: r.status_label || r.status_code,
    marks_obtained: Number(r.marks_obtained || 0),
    notes: r.notes || null,
    updated_at: r.updated_at,
  }));

  return records;
}

async function getPaymentSnapshot(oldSchoolId, studentId, studentClassName, academicYear, term) {
  // 1) Compute total_due from school_babyeyi
  const [babyRows] = await promisePool.query(
    `SELECT
       id, class_name, classes_json, academic_year,
       COALESCE(total_fee, total_amount, 0) AS total_fee
     FROM school_babyeyi
     WHERE school_id = ? AND is_active = 1 AND term = ?
     ORDER BY updated_at DESC
     LIMIT 100`,
    [oldSchoolId, term]
  );

  let totalDue = 0;
  const cn = trimStr(studentClassName);
  const match = (babyRows || []).find((r) => classMatchesBabyeyi(r, cn) && yearMatchesRow(r.academic_year, academicYear));
  if (match) totalDue = Number(match.total_fee || 0);

  // 2) Sum collections for the period
  const [colRows] = await promisePool.query(
    `SELECT
       id, academic_year_label, term, class_name,
       total_due, amount_paid, balance_remaining,
       notes, created_at
     FROM school_fee_collections
     WHERE school_id = ? AND student_id = ? AND term = ?
     ORDER BY created_at DESC
     LIMIT 200`,
    [oldSchoolId, studentId, term]
  );

  const matching = (colRows || []).filter((r) => collectionYearMatchesFilter(r.academic_year_label, academicYear));
  const amountPaid = matching.reduce((acc, r) => acc + Number(r.amount_paid || 0), 0);
  const totalDueFromCollections = matching.reduce((acc, r) => acc + Number(r.total_due || 0), 0);

  if (!totalDue && totalDueFromCollections > 0) totalDue = totalDueFromCollections;

  const status = paymentStatusFromTotals(totalDue, amountPaid);

  return {
    academic_year: academicYear,
    term,
    class_name: cn || null,
    total_due: Number(totalDue || 0),
    amount_paid_total: Number(amountPaid.toFixed(2)),
    remaining_balance: Number(status.remaining_balance.toFixed(2)),
    payment_status_code: status.status_code,
    payment_status_label: status.status_label,
    collections: matching.slice(0, 20).map((r) => ({
      id: r.id,
      created_at: r.created_at,
      total_due: Number(r.total_due || 0),
      amount_paid: Number(r.amount_paid || 0),
      balance_remaining: Number(r.balance_remaining || 0),
      notes: r.notes || null,
    })),
  };
}

// ================================================================
// GET /api/student-transfers/lookup?student_uid=...
// ================================================================
router.get('/student-transfers/lookup', requireRole(SCHOOL_ADMIN_OR_MANAGER), async (req, res) => {
  try {
    await ensureTransferTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School not found in session.' });

    const studentUid = trimStr(req.query.student_uid || req.query.studentId || '');
    if (!studentUid) return res.status(400).json({ success: false, message: 'student_uid is required.' });

    const [rows] = await promisePool.query(
      `SELECT *
       FROM students
       WHERE student_uid = ?
       ORDER BY updated_at DESC, created_at DESC
       LIMIT 2`,
      [studentUid]
    );
    if (!rows || rows.length === 0) return res.status(404).json({ success: false, message: 'Student not found.' });
    if (rows.length > 1) {
      return res.status(409).json({ success: false, message: 'This Student ID exists in multiple schools. Contact admin.' });
    }

    const student = rows[0];
    const fromSchoolId = student.school_id;
    if (!fromSchoolId) return res.status(400).json({ success: false, message: 'Student is missing a school.' });

    const latestPeriod = await getLatestAcademicPeriodForStudent(fromSchoolId, student.id);
    const academicYear = latestPeriod.academic_year || student.academic_year || null;
    const term = latestPeriod.term || 'Term 1';

    const dosRecords = await getDosRecords(fromSchoolId, student.id);

    // discipline snapshot requires academicYear; fallback from student.academic_year
    const disciplineAcademicYear = academicYear || student.academic_year || null;
    let discipline = null;
    if (disciplineAcademicYear) {
      discipline = await getDisciplineSummaryAndCases(fromSchoolId, student.id, disciplineAcademicYear, term);
    } else {
      discipline = {
        total_marks_default: 100,
        discipline_deducted_total: 0,
        discipline_remaining_total: 100,
        cases: [],
      };
    }

    const payment = await getPaymentSnapshot(fromSchoolId, student.id, student.class_name, academicYear || student.academic_year || '2025-2026', term);

    // duplicate transfers protection
    const [[pendingRow]] = await promisePool.query(
      `SELECT id, status, created_at
       FROM student_transfer_requests
       WHERE student_id = ? AND status = 'pending'
       ORDER BY created_at DESC
       LIMIT 1`,
      [student.id]
    );
    const pendingExists = !!pendingRow;

    const canRequest = fromSchoolId !== schoolId && !pendingExists;

    return res.json({
      success: true,
      data: {
        request_eligibility: {
          canRequest,
          student_current_school_id: fromSchoolId,
          student_current_school_matches_session: fromSchoolId === schoolId,
          pending_request_exists: pendingExists,
          pending_request_id: pendingRow?.id || null,
        },
        student: {
          id: student.id,
          student_uid: student.student_uid,
          student_code: student.student_code || null,
          full_name: `${student.first_name || ''} ${student.last_name || ''}`.trim(),
          first_name: student.first_name,
          last_name: student.last_name,
          gender: student.gender || null,
          birth_year: student.birth_year || null,
          nationality: student.nationality || null,
          province: student.province || null,
          district: student.district || null,
          sector: student.sector || null,
          cell: student.cell || null,
          village: student.village || null,
          father_full_name: student.father_full_name || null,
          father_phone: student.father_phone || null,
          father_email: student.father_email || null,
          mother_full_name: student.mother_full_name || null,
          mother_phone: student.mother_phone || null,
          mother_email: student.mother_email || null,
          class_name: student.class_name || null,
          academic_year: student.academic_year || null,
        },
        previous_school: await (async () => {
          const [[srow]] = await promisePool.query(
            'SELECT id, school_name, school_code FROM schools WHERE id = ? LIMIT 1',
            [fromSchoolId]
          );
          return {
            id: fromSchoolId,
            name: srow?.school_name || srow?.name || `School ${fromSchoolId}`,
            code: srow?.school_code || null,
          };
        })(),
        dos_records: dosRecords,
        discipline: disciplineAcademicYear
          ? { ...discipline, academic_year: disciplineAcademicYear, term }
          : discipline,
        payment,
        selected_period: {
          academic_year: academicYear,
          term,
        },
      },
    });
  } catch (err) {
    console.error('[GET /api/student-transfers/lookup]', err);
    return res.status(500).json({ success: false, message: 'Failed to lookup transfer student.' });
  }
});

// ================================================================
// POST /api/student-transfers/request
// Body: { student_uid, reason, notes }
// ================================================================
router.post('/student-transfers/request', requireRole(SCHOOL_ADMIN_OR_MANAGER), async (req, res) => {
  try {
    await ensureTransferTables();
    const schoolIdTo = resolveSchoolId(req);
    const userId = resolveUserId(req);
    if (!schoolIdTo || !userId) return res.status(400).json({ success: false, message: 'Invalid session.' });

    const body = req.body || {};
    const studentUid = trimStr(body.student_uid || body.studentId || '');
    const reason = trimStr(body.reason || '');
    const notes = trimStr(body.notes || body.notes_from_to_school || '') || null;
    if (!studentUid) return res.status(400).json({ success: false, message: 'student_uid is required.' });
    if (!reason) return res.status(400).json({ success: false, message: 'reason is required.' });

    const [studentRows] = await promisePool.query(
      `SELECT id, student_uid, student_code, school_id, class_name, academic_year
       FROM students
       WHERE student_uid = ?
       ORDER BY updated_at DESC, created_at DESC
       LIMIT 1`,
      [studentUid]
    );

    const student = (studentRows || [])[0];
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

    const schoolIdFrom = student.school_id;
    if (!schoolIdFrom) return res.status(400).json({ success: false, message: 'Student is missing a school.' });
    if (schoolIdFrom === schoolIdTo) {
      return res.status(409).json({ success: false, message: 'Student already belongs to your school.' });
    }

    // prevent duplicate pending requests
    const [[pending]] = await promisePool.query(
      `SELECT id FROM student_transfer_requests
       WHERE student_id = ? AND status = 'pending'
       LIMIT 1`,
      [student.id]
    );
    if (pending) return res.status(409).json({ success: false, message: 'A pending transfer request already exists for this student.' });

    const [ins] = await promisePool.query(
      `INSERT INTO student_transfer_requests (
        school_id_from, school_id_to, student_id, student_uid, student_code,
        requested_by_user_id, reason, notes_from_to_school, status
      ) VALUES (?,?,?,?,?,?,?,?,'pending')`,
      [schoolIdFrom, schoolIdTo, student.id, student.student_uid, student.student_code || null, userId, reason, notes]
    );

    const requestId = ins.insertId;

    await promisePool.query(
      `INSERT INTO student_transfer_logs (request_id, school_id, action, note, created_by_user_id)
       VALUES (?,?,?,?,?)`,
      [requestId, schoolIdTo, 'requested', reason, userId]
    );

    // Notifications to both schools
    await promisePool.query(
      `INSERT INTO student_transfer_notifications (school_id, request_id, notification_type, message, is_read)
       VALUES
         (?,?, 'requested', ?, 0),
         (?,?, 'requested', ?, 0)`,
      [
        schoolIdTo, requestId,
        `Transfer request sent for student ${student.student_code || student.student_uid}. Waiting old school approval.`,
        schoolIdFrom, requestId,
        `Incoming transfer request: student ${student.student_code || student.student_uid} wants to join your school. Please review.`,
      ]
    );

    return res.status(201).json({
      success: true,
      data: { request_id: requestId, status: 'pending' },
      message: 'Transfer request sent to the old school.',
    });
  } catch (err) {
    console.error('[POST /api/student-transfers/request]', err);
    return res.status(500).json({ success: false, message: 'Failed to send transfer request.' });
  }
});

// ================================================================
// GET /api/student-transfers/my?student_uid?...
// Returns transfers where current school is from or to
// ================================================================
router.get('/student-transfers/my', requireRole(SCHOOL_ADMIN_OR_MANAGER), async (req, res) => {
  try {
    await ensureTransferTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School not found in session.' });

    const statusFilter = trimStr(req.query.status || '');
    const limit = Math.min(100, Math.max(10, Number(req.query.limit) || 30));

    let sql = `
      SELECT
        r.id,
        r.school_id_from, r.school_id_to,
        r.student_id, r.student_uid, r.student_code,
        r.requested_by_user_id,
        r.reason,
        r.notes_from_to_school,
        r.status,
        r.responded_by_user_id,
        r.notes_from_from_school,
        r.approved_at, r.rejected_at,
        r.created_at,
        s.first_name, s.last_name,
        s.class_name,
        s.academic_year,
        sf.school_name AS from_school_name,
        tf.school_name AS to_school_name
      FROM student_transfer_requests r
      INNER JOIN students s
        ON s.id = r.student_id
      LEFT JOIN schools sf ON sf.id = r.school_id_from
      LEFT JOIN schools tf ON tf.id = r.school_id_to
      WHERE (r.school_id_from = ? OR r.school_id_to = ?)
    `;
    const params = [schoolId, schoolId];
    if (statusFilter) {
      sql += ' AND r.status = ?';
      params.push(statusFilter);
    }
    sql += ' ORDER BY r.created_at DESC LIMIT ?';
    params.push(limit);

    const [rows] = await promisePool.query(sql, params);

    // mysql2 may return ids as BigInt / string; normalize so IN() + object-key lookup match reliably
    const requestIds = (rows || []).map((r) => Number(r.id)).filter((x) => Number.isFinite(x) && x > 0);

    let logsByReq = {};
    if (requestIds.length) {
      const [logRows] = await promisePool.query(
        `SELECT request_id, school_id, action, note, created_at, created_by_user_id
         FROM student_transfer_logs
         WHERE request_id IN (${requestIds.map(() => '?').join(',')})
         ORDER BY created_at ASC`,
        requestIds
      );
      logRows.forEach((l) => {
        const k = String(l.request_id);
        if (!logsByReq[k]) logsByReq[k] = [];
        logsByReq[k].push({
          action: l.action,
          note: l.note,
          created_at: l.created_at,
        });
      });
    }

    let notifByReq = {};
    if (requestIds.length) {
      const [notifRows] = await promisePool.query(
        `SELECT request_id, school_id, notification_type, message, created_at, is_read
         FROM student_transfer_notifications
         WHERE request_id IN (${requestIds.map(() => '?').join(',')})
         ORDER BY created_at DESC`,
        requestIds
      );
      notifRows.forEach((n) => {
        const k = String(n.request_id);
        if (!notifByReq[k]) notifByReq[k] = [];
        notifByReq[k].push({
          notification_type: n.notification_type,
          message: n.message,
          created_at: n.created_at,
          is_read: Number(n.is_read || 0) === 1,
        });
      });
    }

    const transfers = (rows || []).map((r) => ({
      id: Number(r.id),
      status: r.status,
      school_id_from: r.school_id_from,
      school_id_to: r.school_id_to,
      student: {
        student_uid: r.student_uid,
        student_code: r.student_code,
        full_name: `${r.first_name || ''} ${r.last_name || ''}`.trim(),
        class_name: r.class_name || null,
        academic_year: r.academic_year || null,
      },
      from_school_name: r.from_school_name || `School ${r.school_id_from}`,
      to_school_name: r.to_school_name || `School ${r.school_id_to}`,
      reason: r.reason || null,
      notes_from_to_school: r.notes_from_to_school || null,
      notes_from_from_school: r.notes_from_from_school || null,
      approved_at: r.approved_at,
      rejected_at: r.rejected_at,
      created_at: r.created_at,
      logs: logsByReq[String(r.id)] || [],
      notifications: notifByReq[String(r.id)] || [],
      // Old school receives the request and approves/rejects
      direction: r.school_id_from === schoolId ? 'incoming' : 'outgoing',
    }));

    return res.json({
      success: true,
      data: {
        count: transfers.length,
        transfers,
      },
    });
  } catch (err) {
    console.error('[GET /api/student-transfers/my]', err);
    return res.status(500).json({ success: false, message: 'Failed to load transfer requests.' });
  }
});

// ================================================================
// PUT /api/student-transfers/:id/decision
// Body: { action: 'approve'|'reject', notes }
// Old school can decide.
// ================================================================
router.put('/student-transfers/:id/decision', requireRole(SCHOOL_ADMIN_OR_MANAGER), async (req, res) => {
  try {
    await ensureTransferTables();
    const schoolId = resolveSchoolId(req);
    const userId = resolveUserId(req);
    if (!schoolId || !userId) return res.status(400).json({ success: false, message: 'Invalid session.' });

    const requestId = Number(req.params.id);
    const body = req.body || {};
    const action = trimStr(body.action || '').toLowerCase();
    const notes = trimStr(body.notes || '');

    if (!requestId || Number.isNaN(requestId)) return res.status(400).json({ success: false, message: 'Invalid request id.' });
    if (!['approve', 'reject'].includes(action)) return res.status(400).json({ success: false, message: 'action must be approve or reject.' });

    const [[reqRow]] = await promisePool.query(
      `SELECT *
       FROM student_transfer_requests
       WHERE id = ?
       LIMIT 1`,
      [requestId]
    );
    if (!reqRow) return res.status(404).json({ success: false, message: 'Transfer request not found.' });
    if (reqRow.status !== 'pending') return res.status(409).json({ success: false, message: 'Transfer request already decided.' });
    if (Number(reqRow.school_id_from) !== Number(schoolId)) {
      return res.status(403).json({ success: false, message: 'Only the old school can approve/reject this request.' });
    }

    const [[studentRow]] = await promisePool.query(
      `SELECT id, school_id
       FROM students
       WHERE id = ?
       LIMIT 1`,
      [reqRow.student_id]
    );
    if (!studentRow) return res.status(404).json({ success: false, message: 'Student not found.' });
    if (Number(studentRow.school_id) !== Number(reqRow.school_id_from)) {
      return res.status(409).json({ success: false, message: 'Student is no longer in the old school.' });
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    const approvedAt = action === 'approve' ? new Date() : null;
    const rejectedAt = action === 'reject' ? new Date() : null;

    const decisionNote = notes || null;

    const schoolIdFrom = reqRow.school_id_from;
    const schoolIdTo = reqRow.school_id_to;
    const studentId = reqRow.student_id;

    await executeTransaction([
      {
        query: `UPDATE student_transfer_requests
                SET status = ?,
                    responded_by_user_id = ?,
                    notes_from_from_school = ?,
                    approved_at = ?,
                    rejected_at = ?
                WHERE id = ? AND status = 'pending'`,
        params: [newStatus, userId, decisionNote, approvedAt, rejectedAt, requestId],
      },
      {
        query: `INSERT INTO student_transfer_logs (request_id, school_id, action, note, created_by_user_id)
                VALUES (?,?,?,?,?)`,
        params: [requestId, schoolIdFrom, newStatus === 'approved' ? 'approved' : 'rejected', decisionNote, userId],
      },
      ...(action === 'approve'
        ? [
            {
              query: `UPDATE students SET school_id = ? WHERE id = ? AND school_id = ?`,
              params: [schoolIdTo, studentId, schoolIdFrom],
            },
            {
              query: `UPDATE dos_student_academic_records
                      SET school_id = ?
                      WHERE student_id = ? AND school_id = ?`,
              params: [schoolIdTo, studentId, schoolIdFrom],
            },
            {
              query: `UPDATE discipline_cases
                      SET school_id = ?
                      WHERE student_id = ? AND school_id = ?`,
              params: [schoolIdTo, studentId, schoolIdFrom],
            },
            {
              query: `UPDATE school_fee_collections
                      SET school_id = ?
                      WHERE student_id = ? AND school_id = ?`,
              params: [schoolIdTo, studentId, schoolIdFrom],
            },
          ]
        : []),
      {
        query: `INSERT INTO student_transfer_notifications (school_id, request_id, notification_type, message, is_read)
                VALUES
                  (?,?,?,?,0),
                  (?,?,?,?,0)`,
        params: [
          schoolIdFrom,
          requestId,
          newStatus === 'approved' ? 'approved' : 'rejected',
          `Transfer request ${newStatus}. Student will ${newStatus === 'approved' ? 'be moved' : 'remain'} in your school.`,
          schoolIdTo,
          requestId,
          newStatus === 'approved' ? 'approved' : 'rejected',
          `Your transfer request was ${newStatus}.`,
        ],
      },
    ]);

    return res.json({
      success: true,
      data: { request_id: requestId, status: newStatus },
      message: `Transfer request ${newStatus}.`,
    });
  } catch (err) {
    console.error('[PUT /api/student-transfers/:id/decision]', err);
    return res.status(500).json({ success: false, message: 'Failed to update transfer request.' });
  }
});

// ================================================================
// GET /api/student-transfers/notifications/unread-count
// Used by School Manager sidebar badge
// ================================================================
router.get('/student-transfers/notifications/unread-count', requireRole(SCHOOL_ADMIN_OR_MANAGER), async (req, res) => {
  try {
    await ensureTransferTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School not found in session.' });

    const [[row]] = await promisePool.query(
      `SELECT COUNT(*) AS cnt
       FROM student_transfer_notifications
       WHERE school_id = ? AND is_read = 0`,
      [schoolId]
    );

    return res.json({ success: true, data: { unread_count: Number(row?.cnt || 0) } });
  } catch (err) {
    console.error('GET /student-transfers/notifications/unread-count:', err);
    return res.status(500).json({ success: false, message: 'Failed to load unread transfer notifications count.' });
  }
});

module.exports = router;

