// ================================================================
// discipline.js — Head of Discipline (HOD): settings, cases, reports
//
//   GET  /api/discipline/settings
//   PUT  /api/discipline/settings          { total_marks }
//   GET  /api/discipline/students-summary  ?academic_year=&term=&class_name=
//   POST /api/discipline/cases             { student_id, academic_year, term, lesson_subject, description?, marks_deducted }
//   GET  /api/discipline/cases             ?academic_year=&term=&class_name=&limit=
//   GET  /api/discipline/report-summary    ?academic_year=&term=
// ════════════════════════════════════════════════════════════════

const express = require('express');
const { promisePool } = require('../config/database');
const {
  ensureConductMarksColumns,
  getConductBoundsForSchool,
  getConductMaxMarks,
  saveConductBoundsForSchool,
} = require('./conductMarksSettings');
const {
  notifyStudentParentsDiscipline,
  notifyStudentParentsChannels,
} = require('./parentStudentNotifications');
const { requireRole } = require('../middleware/deoAuth');
const {
  ensureStudentYearEnrollmentsTable,
  backfillSchoolEnrollments,
  enrollmentYearFilter,
  enrollmentClassSelect,
} = require('./studentYearEnrollments');

const router = express.Router();
const DISCIPLINE_WRITE_ROLES = ['HOD', 'DOS', 'SCHOOL_MANAGER', 'SCHOOL_ADMIN', 'MANAGER', 'DISCIPLINE', 'DISCIPLINE_STAFF'];
const DISCIPLINE_READ_ROLES = ['HOD', 'DOS', 'SCHOOL_MANAGER', 'SCHOOL_ADMIN', 'MANAGER', 'ACCOUNTANT', 'DISCIPLINE', 'DISCIPLINE_STAFF'];

function resolveSchoolId(req) {
  return (
    req.session?.school_id ||
    req.session?.user?.school_id ||
    req.session?.user?.school?.id ||
    null
  );
}

function resolveUserId(req) {
  return req.session?.userId || req.session?.user?.id || null;
}

function trimStr(v) {
  if (v === undefined || v === null) return '';
  return String(v).trim();
}

function schoolDateOnly(date = new Date()) {
  const tz = process.env.SCHOOL_TIMEZONE || 'Africa/Kigali';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type)?.value || '00';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

let tablesReady = false;
let permissionColumnsReady = false;
async function ensureDisciplineTables() {
  if (tablesReady) return;
  await promisePool.query(`
    ALTER TABLE students
      ADD COLUMN IF NOT EXISTS discipline_marks DECIMAL(8,2) NULL
  `);
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS school_discipline_settings (
      school_id INT UNSIGNED NOT NULL PRIMARY KEY,
      total_marks DECIMAL(8,2) NOT NULL DEFAULT 100.00,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      updated_by_user_id INT UNSIGNED NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS school_discipline_default_marks (
      school_id INT UNSIGNED NOT NULL PRIMARY KEY,
      default_marks DECIMAL(8,2) NOT NULL DEFAULT 40.00,
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      updated_by INT UNSIGNED NULL
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
    CREATE TABLE IF NOT EXISTS discipline_mark_logs (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      student_id INT UNSIGNED NOT NULL,
      action ENUM('add', 'remove') NOT NULL,
      marks DECIMAL(8,2) NOT NULL,
      reason VARCHAR(255) NOT NULL,
      notes TEXT NULL,
      action_date DATE NULL,
      previous_marks DECIMAL(8,2) NOT NULL,
      new_marks DECIMAL(8,2) NOT NULL,
      created_by_user_id INT UNSIGNED NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      undone_at DATETIME NULL,
      undone_by_user_id INT UNSIGNED NULL,
      INDEX idx_dml_school_student_created (school_id, student_id, created_at),
      INDEX idx_dml_school_student_active (school_id, student_id, undone_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  tablesReady = true;
}

async function ensurePermissionTrackingColumns() {
  if (permissionColumnsReady) return;
  await promisePool.query(`ALTER TABLE student_permissions ADD COLUMN actual_out_at DATETIME NULL`).catch(() => {});
  await promisePool.query(`ALTER TABLE student_permissions ADD COLUMN actual_return_at DATETIME NULL`).catch(() => {});
  await promisePool.query(`ALTER TABLE student_permissions ADD COLUMN gate_scan_state ENUM('NOT_USED','OUT','BACK','EXCEEDED') NOT NULL DEFAULT 'NOT_USED'`).catch(() => {});
  await promisePool.query(`ALTER TABLE student_permissions ADD COLUMN exceeded_minutes INT UNSIGNED NOT NULL DEFAULT 0`).catch(() => {});
  permissionColumnsReady = true;
}

/** @deprecated Use getConductMaxMarks — kept as alias for existing callers. */
async function getTotalMarksForSchool(schoolId) {
  return getConductMaxMarks(schoolId);
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
  const explicitYear = trimStr(academicYearRaw);
  const explicitTerm = trimStr(termRaw);
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
  if (row?.active_terms_json) {
    try {
      const parsed = Array.isArray(row.active_terms_json)
        ? row.active_terms_json
        : JSON.parse(row.active_terms_json);
      if (Array.isArray(parsed) && parsed.length) {
        terms = parsed.map((x) => trimStr(x)).filter(Boolean);
      }
    } catch (_) {
      /* ignore parse errors and keep defaults */
    }
  }

  return {
    academicYear: explicitYear || trimStr(row?.current_academic_year) || inferAcademicYearFromDate(),
    term: explicitTerm || inferTermFromMonth(terms),
  };
}

// ════════════════════════════════════════════════════════════════
// GET /api/discipline/settings
// ════════════════════════════════════════════════════════════════
router.get('/discipline/settings', requireRole(DISCIPLINE_READ_ROLES), async (req, res) => {
  try {
    await ensureDisciplineTables();
    await ensureConductMarksColumns();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) {
      return res.status(400).json({ success: false, message: 'School not found in session.' });
    }
    const bounds = await getConductBoundsForSchool(schoolId);
    const maxMarks = bounds.default_marks;
    return res.json({
      success: true,
      data: {
        ...bounds,
        total_marks: maxMarks,
        max_marks: maxMarks,
        minimum_marks: bounds.minimum_marks,
        min_marks: bounds.min_marks,
      },
    });
  } catch (err) {
    console.error('GET /discipline/settings:', err);
    return res.status(500).json({ success: false, message: 'Failed to load settings' });
  }
});

// ════════════════════════════════════════════════════════════════
// PUT /api/discipline/settings/default-marks
// body: { default_marks, apply_to: 'new'|'all', confirmed_overwrite?: boolean }
// ════════════════════════════════════════════════════════════════
router.put('/discipline/settings/default-marks', requireRole(DISCIPLINE_WRITE_ROLES), async (req, res) => {
  try {
    await ensureDisciplineTables();
    const schoolId = resolveSchoolId(req);
    const userId = resolveUserId(req);
    if (!schoolId || !userId) {
      return res.status(400).json({ success: false, message: 'Invalid session.' });
    }

    const defaultMarks = Number(req.body?.default_marks);
    const minimumMarks =
      req.body?.minimum_marks != null
        ? Number(req.body.minimum_marks)
        : req.body?.min_marks != null
          ? Number(req.body.min_marks)
          : 0;
    const applyTo = trimStr(req.body?.apply_to || 'new').toLowerCase();
    const confirmed = !!req.body?.confirmed_overwrite;

    if (!['new', 'all'].includes(applyTo)) {
      return res.status(400).json({ success: false, message: 'apply_to must be "new" or "all".' });
    }
    if (applyTo === 'all' && !confirmed) {
      return res.status(400).json({
        success: false,
        message: 'Confirmation required to overwrite all students.',
      });
    }

    let bounds;
    try {
      bounds = await saveConductBoundsForSchool(
        schoolId,
        { default_marks: defaultMarks, minimum_marks: minimumMarks },
        userId
      );
    } catch (saveErr) {
      return res.status(saveErr.status || 400).json({
        success: false,
        message: saveErr.message || 'Invalid conduct marks range.',
      });
    }

    let updateSql = 'UPDATE students SET discipline_marks = ? WHERE school_id = ?';
    const updateParams = [bounds.default_marks, schoolId];
    if (applyTo === 'new') {
      updateSql += ' AND discipline_marks IS NULL';
    }
    const [updateResult] = await promisePool.query(updateSql, updateParams);

    return res.json({
      success: true,
      message: applyTo === 'all'
        ? 'Conduct range saved and applied to all students.'
        : 'Conduct range saved and applied to new students only.',
      data: {
        ...bounds,
        total_marks: bounds.default_marks,
        max_marks: bounds.max_marks,
        minimum_marks: bounds.minimum_marks,
        min_marks: bounds.min_marks,
        updated_students: Number(updateResult?.affectedRows || 0),
        apply_to: applyTo,
      },
    });
  } catch (err) {
    console.error('PUT /discipline/settings/default-marks:', err);
    return res.status(500).json({ success: false, message: 'Failed to update default marks.' });
  }
});

// ════════════════════════════════════════════════════════════════
// GET /api/discipline/students
// query: ?query=&page=&limit=
// ════════════════════════════════════════════════════════════════
router.get('/discipline/students', requireRole(DISCIPLINE_READ_ROLES), async (req, res) => {
  try {
    await ensureDisciplineTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) {
      return res.status(400).json({ success: false, message: 'School not found in session.' });
    }

    const q = trimStr(req.query.query || req.query.q || '');
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(5, Number(req.query.limit) || 15));
    const offset = (page - 1) * limit;

    let whereSql = 'WHERE s.school_id = ?';
    const whereParams = [schoolId];
    if (q) {
      whereSql += ` AND (
        CONCAT(COALESCE(s.first_name,''), ' ', COALESCE(s.last_name,'')) LIKE ?
        OR COALESCE(s.student_code, '') LIKE ?
        OR COALESCE(s.student_uid, '') LIKE ?
      )`;
      const like = `%${q}%`;
      whereParams.push(like, like, like);
    }

    const [[countRow]] = await promisePool.query(
      `SELECT COUNT(*) AS total
       FROM students s
       ${whereSql}`,
      whereParams
    );
    const total = Number(countRow?.total || 0);

    const { max_marks: conductMax } = await getConductBoundsForSchool(schoolId);

    const [rows] = await promisePool.query(
      `SELECT
        s.id,
        s.student_uid,
        s.student_code,
        s.first_name,
        s.last_name,
        s.class_name,
        COALESCE(s.discipline_marks, ?) AS discipline_marks
      FROM students s
      ${whereSql}
      ORDER BY s.class_name ASC, s.last_name ASC, s.first_name ASC
      LIMIT ? OFFSET ?`,
      [conductMax, ...whereParams, limit, offset]
    );

    const data = rows.map((r) => ({
      id: r.id,
      code: r.student_code || r.student_uid || `ST-${r.id}`,
      student_code: r.student_code || null,
      student_uid: r.student_uid || null,
      name: `${trimStr(r.first_name)} ${trimStr(r.last_name)}`.trim() || `Student ${r.id}`,
      class_name: r.class_name || null,
      discipline_marks: Number(r.discipline_marks || 0),
    }));

    return res.json({
      success: true,
      data,
      meta: {
        page,
        limit,
        total,
        total_pages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (err) {
    console.error('GET /discipline/students:', err);
    return res.status(500).json({ success: false, message: 'Failed to load students.' });
  }
});

// ════════════════════════════════════════════════════════════════
// GET /api/discipline/students/:studentId/logs
// ════════════════════════════════════════════════════════════════
router.get('/discipline/students/:studentId/logs', requireRole(DISCIPLINE_READ_ROLES), async (req, res) => {
  try {
    await ensureDisciplineTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) {
      return res.status(400).json({ success: false, message: 'School not found in session.' });
    }
    const studentId = Number(req.params.studentId);
    if (!studentId) {
      return res.status(400).json({ success: false, message: 'Invalid student id.' });
    }

    const [rows] = await promisePool.query(
      `SELECT
        l.id,
        l.action,
        l.marks,
        l.reason,
        l.notes,
        l.action_date,
        l.previous_marks,
        l.new_marks,
        l.created_at,
        CONCAT(COALESCE(u.first_name,''), ' ', COALESCE(u.last_name,'')) AS created_by
      FROM discipline_mark_logs l
      LEFT JOIN users u ON u.id = l.created_by_user_id
      WHERE l.school_id = ? AND l.student_id = ? AND l.undone_at IS NULL
      ORDER BY l.created_at DESC`,
      [schoolId, studentId]
    );

    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /discipline/students/:studentId/logs:', err);
    return res.status(500).json({ success: false, message: 'Failed to load student logs.' });
  }
});

// ════════════════════════════════════════════════════════════════
// POST /api/discipline/students/:studentId/marks
// body: { action: add|remove, marks, reason, date?, notes? }
// ════════════════════════════════════════════════════════════════
router.post('/discipline/students/:studentId/marks', requireRole(DISCIPLINE_WRITE_ROLES), async (req, res) => {
  const conn = await promisePool.getConnection();
  try {
    await ensureDisciplineTables();
    const schoolId = resolveSchoolId(req);
    const userId = resolveUserId(req);
    if (!schoolId || !userId) {
      return res.status(400).json({ success: false, message: 'Invalid session.' });
    }

    const studentId = Number(req.params.studentId);
    const action = trimStr(req.body?.action || '').toLowerCase();
    const marks = Number(req.body?.marks);
    const reason = trimStr(req.body?.reason);
    const notes = trimStr(req.body?.notes) || null;
    const actionDate = trimStr(req.body?.date) || null;

    if (!studentId) return res.status(400).json({ success: false, message: 'Invalid student id.' });
    if (!['add', 'remove'].includes(action)) return res.status(400).json({ success: false, message: 'action must be "add" or "remove".' });
    if (Number.isNaN(marks) || marks <= 0) return res.status(400).json({ success: false, message: 'marks must be a positive number.' });
    if (!reason) return res.status(400).json({ success: false, message: 'reason is required.' });

    await conn.beginTransaction();

    const [[student]] = await conn.query(
      `SELECT id, discipline_marks
       FROM students
       WHERE id = ? AND school_id = ?
       LIMIT 1
       FOR UPDATE`,
      [studentId, schoolId]
    );
    if (!student) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    const bounds = await getConductBoundsForSchool(schoolId);
    const maxMarks = bounds.max_marks;
    const minMarks = bounds.minimum_marks;
    const previousMarks = Number(student.discipline_marks ?? maxMarks);
    const nextMarks = action === 'add' ? previousMarks + marks : previousMarks - marks;
    if (nextMarks < minMarks) {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        message: `Resulting marks cannot be below the school minimum (${minMarks}).`,
      });
    }
    if (nextMarks > maxMarks) {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        message: `Resulting marks cannot exceed the school maximum (${maxMarks}).`,
      });
    }

    await conn.query(
      'UPDATE students SET discipline_marks = ? WHERE id = ? AND school_id = ?',
      [nextMarks, studentId, schoolId]
    );
    const [ins] = await conn.query(
      `INSERT INTO discipline_mark_logs (
        school_id, student_id, action, marks, reason, notes, action_date,
        previous_marks, new_marks, created_by_user_id
      ) VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [schoolId, studentId, action, marks, reason.slice(0, 255), notes, actionDate || null, previousMarks, nextMarks, userId]
    );

    const [[stName]] = await conn.query(
      `SELECT s.first_name, s.last_name, sc.school_name
       FROM students s
       LEFT JOIN schools sc ON sc.id = s.school_id
       WHERE s.id = ?
       LIMIT 1`,
      [studentId]
    );
    await conn.commit();

    let parent_notifications = null;
    if (action === 'remove' && req.body?.notify_parent !== false) {
      const studentName =
        `${trimStr(stName?.first_name)} ${trimStr(stName?.last_name)}`.trim() || 'Your child';
      try {
        parent_notifications = await notifyStudentParentsDiscipline(studentId, {
          studentName,
          schoolName: stName?.school_name,
          schoolId,
          marks,
          remaining: nextMarks,
          maximum: maxMarks,
          reason,
          logId: ins.insertId,
        });
      } catch (notifyErr) {
        console.warn('[discipline/parent-notify]', notifyErr.message);
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Discipline marks updated successfully.',
      data: {
        id: ins.insertId,
        student_id: studentId,
        action,
        marks,
        previous_marks: previousMarks,
        new_marks: nextMarks,
        minimum_marks: minMarks,
        maximum_marks: maxMarks,
      },
      parent_notifications,
    });
  } catch (err) {
    try { await conn.rollback(); } catch (_) {}
    console.error('POST /discipline/students/:studentId/marks:', err);
    return res.status(500).json({ success: false, message: 'Failed to update marks.' });
  } finally {
    conn.release();
  }
});

// ════════════════════════════════════════════════════════════════
// POST /api/discipline/students/:studentId/undo-last-action
// ════════════════════════════════════════════════════════════════
router.post('/discipline/students/:studentId/undo-last-action', requireRole(DISCIPLINE_WRITE_ROLES), async (req, res) => {
  const conn = await promisePool.getConnection();
  try {
    await ensureDisciplineTables();
    const schoolId = resolveSchoolId(req);
    const userId = resolveUserId(req);
    if (!schoolId || !userId) {
      return res.status(400).json({ success: false, message: 'Invalid session.' });
    }
    const studentId = Number(req.params.studentId);
    if (!studentId) return res.status(400).json({ success: false, message: 'Invalid student id.' });

    await conn.beginTransaction();

    const [[student]] = await conn.query(
      `SELECT id, discipline_marks
       FROM students
       WHERE id = ? AND school_id = ?
       LIMIT 1
       FOR UPDATE`,
      [studentId, schoolId]
    );
    if (!student) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    const [[lastLog]] = await conn.query(
      `SELECT id, previous_marks
       FROM discipline_mark_logs
       WHERE school_id = ? AND student_id = ? AND undone_at IS NULL
       ORDER BY created_at DESC
       LIMIT 1
       FOR UPDATE`,
      [schoolId, studentId]
    );
    if (!lastLog) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'No action to undo.' });
    }

    await conn.query(
      'UPDATE students SET discipline_marks = ? WHERE id = ? AND school_id = ?',
      [Number(lastLog.previous_marks || 0), studentId, schoolId]
    );
    await conn.query(
      'UPDATE discipline_mark_logs SET undone_at = NOW(), undone_by_user_id = ? WHERE id = ?',
      [userId, lastLog.id]
    );

    await conn.commit();
    return res.json({
      success: true,
      message: 'Last action reverted successfully.',
      data: { student_id: studentId, discipline_marks: Number(lastLog.previous_marks || 0) },
    });
  } catch (err) {
    try { await conn.rollback(); } catch (_) {}
    console.error('POST /discipline/students/:studentId/undo-last-action:', err);
    return res.status(500).json({ success: false, message: 'Failed to undo last action.' });
  } finally {
    conn.release();
  }
});

// ════════════════════════════════════════════════════════════════
// PUT /api/discipline/settings
// ════════════════════════════════════════════════════════════════
router.put('/discipline/settings', requireRole(DISCIPLINE_WRITE_ROLES), async (req, res) => {
  try {
    await ensureDisciplineTables();
    const schoolId = resolveSchoolId(req);
    const userId = resolveUserId(req);
    if (!schoolId || !userId) {
      return res.status(400).json({ success: false, message: 'Invalid session.' });
    }
    const totalMarks = Number(req.body?.total_marks);
    if (Number.isNaN(totalMarks) || totalMarks < 1 || totalMarks > 10000) {
      return res.status(400).json({
        success: false,
        message: 'total_marks must be a number between 1 and 10000.',
      });
    }
    const current = await getConductBoundsForSchool(schoolId);
    const bounds = await saveConductBoundsForSchool(
      schoolId,
      { default_marks: totalMarks, minimum_marks: current.minimum_marks },
      userId
    );
    return res.json({
      success: true,
      data: {
        total_marks: bounds.max_marks,
        default_marks: bounds.default_marks,
        max_marks: bounds.max_marks,
        minimum_marks: bounds.minimum_marks,
      },
    });
  } catch (err) {
    console.error('PUT /discipline/settings:', err);
    return res.status(500).json({ success: false, message: 'Failed to save settings' });
  }
});

// ════════════════════════════════════════════════════════════════
// GET /api/discipline/students-roster
// School roster for Conduct portal — students + stats + class/year filters
// query: ?academic_year=&class_name=&q=
// ════════════════════════════════════════════════════════════════
router.get('/discipline/students-roster', requireRole(DISCIPLINE_READ_ROLES), async (req, res) => {
  try {
    await ensureDisciplineTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) {
      return res.status(400).json({ success: false, message: 'School not found in session.' });
    }

    const q = trimStr(req.query.q || req.query.query || '');
    const className = trimStr(req.query.class_name || req.query.class || '');
    const yearQ = trimStr(req.query.academic_year || req.query.year || '');
    const { academicYear: defaultYear } = await resolveAcademicContext(schoolId, yearQ, '');
    const academicYearFilter = yearQ && yearQ.toUpperCase() !== 'ALL' ? yearQ : '';

    if (academicYearFilter) {
      await ensureStudentYearEnrollmentsTable();
      await backfillSchoolEnrollments(schoolId, {
        currentYear: academicYearFilter || defaultYear,
      });
    }

    const yearFilter = enrollmentYearFilter(academicYearFilter, 'ey', 's');
    const bounds = await getConductBoundsForSchool(schoolId);
    const conductMax = bounds.max_marks;
    const conductMin = bounds.minimum_marks;
    const lookupDate = new Date().toISOString().split('T')[0];

    let sql = `
      SELECT s.*,
             ${academicYearFilter ? enrollmentClassSelect('ey') + ',' : ''}
             (SELECT permission_type FROM student_permissions
              WHERE student_id = s.id AND status = 'APPROVED'
              AND (DATE(starts_at) = ? OR DATE(ends_at) = ? OR (? BETWEEN DATE(starts_at) AND DATE(ends_at)))
              LIMIT 1) AS active_permission,
             COALESCE(att.pct, 0) AS attendance_pct
      FROM students s
      ${yearFilter.join}
      LEFT JOIN (
        SELECT ar.student_id,
               ROUND(100 * SUM(CASE WHEN LOWER(TRIM(ar.status)) IN ('present','late') THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0)) AS pct
        FROM academic_attendance_records ar
        INNER JOIN academic_attendance_logs al ON ar.log_id = al.id
        WHERE al.school_id = ?
          AND al.record_date >= DATE_SUB(CURDATE(), INTERVAL 120 DAY)
        GROUP BY ar.student_id
      ) att ON att.student_id = s.id
      WHERE s.school_id = ?${yearFilter.where}`;
    const params = [lookupDate, lookupDate, lookupDate, schoolId, ...yearFilter.params, schoolId];

    if (className) {
      const classCol = academicYearFilter ? yearFilter.classCol : 's.class_name';
      sql += ` AND TRIM(COALESCE(${classCol}, '')) = ?`;
      params.push(className);
    }
    if (q) {
      sql += ` AND (
        CONCAT(COALESCE(s.first_name,''), ' ', COALESCE(s.last_name,'')) LIKE ?
        OR COALESCE(s.student_code, '') LIKE ?
        OR COALESCE(s.student_uid, '') LIKE ?
      )`;
      const like = `%${q}%`;
      params.push(like, like, like);
    }

    sql += ' ORDER BY s.class_name ASC, s.first_name ASC LIMIT 2000';
    const [rows] = await promisePool.query(sql, params);

    const mapStatus = (r, marks) => {
      if (r.active_permission) return 'On leave';
      if (conductMax > 0) {
        const pct = (marks / conductMax) * 100;
        if (pct >= 70) return 'Epic';
        if (pct >= 40) return 'Advanced';
      }
      return 'At risk';
    };

    const data = (rows || []).map((r) => {
      const rosterClass = r.roster_class_name || r.class_name;
      const rosterYear = r.roster_academic_year || r.academic_year;
      const marks = Number(r.discipline_marks ?? conductMax);
      const att = r.attendance_pct != null ? Number(r.attendance_pct) : 0;
      const status = mapStatus(r, marks);
      return {
        row_id: r.id,
        id: r.student_uid || r.student_code || `ST-${r.id}`,
        student_code: r.student_code || null,
        student_uid: r.student_uid || null,
        name: `${trimStr(r.first_name)} ${trimStr(r.last_name)}`.trim() || `Student ${r.id}`,
        grade: rosterClass || 'Unassigned',
        stream: '',
        gpa: conductMax > 0 ? Number(((marks / conductMax) * 4).toFixed(1)) : null,
        discipline_marks: marks,
        discipline_max: conductMax,
        discipline_min: conductMin,
        attendance: Math.round(att),
        status,
        active_permission: r.active_permission || null,
        gender: r.gender || null,
        academic_year: rosterYear || null,
        parent: r.father_full_name || r.mother_full_name || 'Not provided',
        phone: r.father_phone || r.mother_phone || 'Not provided',
        email: r.father_email || r.mother_email || 'Not provided',
        province: r.province || 'N/A',
        district: r.district || 'N/A',
        sector: r.sector || 'N/A',
        cell: r.cell || 'N/A',
        created_at: r.created_at,
      };
    });

    let male = 0;
    let female = 0;
    let epic = 0;
    let attSum = 0;
    let withLeave = 0;
    const classSet = new Set();
    for (const d of data) {
      if (d.gender === 'Male') male += 1;
      else if (d.gender === 'Female') female += 1;
      if (d.status === 'Epic') epic += 1;
      attSum += Number(d.attendance) || 0;
      if (d.active_permission) withLeave += 1;
      if (d.grade && d.grade !== 'Unassigned') classSet.add(d.grade);
    }
    const total = data.length;
    const avgAttendance = total ? (attSum / total).toFixed(1) : '0';
    const epicPercent = total ? Math.round((epic / total) * 100) : 0;
    const diversityIndex = classSet.size ? (classSet.size / Math.max(total, 1)).toFixed(2) : '0';

    await ensureStudentYearEnrollmentsTable();
    const [yearRows] = await promisePool.query(
      `SELECT DISTINCT TRIM(academic_year) AS academic_year
       FROM (
         SELECT TRIM(academic_year) AS academic_year FROM student_year_enrollments WHERE school_id = ?
         UNION
         SELECT TRIM(academic_year) AS academic_year FROM students WHERE school_id = ?
       ) yrs
       WHERE TRIM(COALESCE(academic_year, '')) <> ''
       ORDER BY academic_year DESC`,
      [schoolId, schoolId]
    );
    const academicYears = (yearRows || []).map((r) => trimStr(r.academic_year)).filter(Boolean);
    if (defaultYear && !academicYears.includes(defaultYear)) {
      academicYears.unshift(defaultYear);
    }

    const classes = [...classSet].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    return res.json({
      success: true,
      data,
      stats: {
        totalEnrolled: total,
        epicPercent,
        avgAttendance,
        diversityIndex,
        male,
        female,
        activePermissions: withLeave,
        conductMaximum: conductMax,
        conductMinimum: conductMin,
        classCount: classSet.size,
      },
      meta: {
        academic_year: academicYearFilter || 'ALL',
        current_academic_year: defaultYear,
        academic_years: academicYears,
        classes,
      },
    });
  } catch (err) {
    console.error('GET /discipline/students-roster:', err);
    return res.status(500).json({ success: false, message: 'Failed to load students roster.' });
  }
});

// ════════════════════════════════════════════════════════════════
// GET /api/discipline/students-summary
// ════════════════════════════════════════════════════════════════
router.get('/discipline/students-summary', requireRole(DISCIPLINE_READ_ROLES), async (req, res) => {
  try {
    await ensureDisciplineTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) {
      return res.status(400).json({ success: false, message: 'School not found in session.' });
    }

    const academicYearQ = trimStr(req.query.academic_year || req.query.year || '');
    const termQ = trimStr(req.query.term || '');
    const className = trimStr(req.query.class_name || req.query.class || '');
    const { academicYear, term } = await resolveAcademicContext(schoolId, academicYearQ, termQ);

    const totalMarks = await getTotalMarksForSchool(schoolId);

    let sql = `
      SELECT
        s.id,
        s.student_uid,
        s.student_code,
        s.first_name,
        s.last_name,
        s.class_name,
        s.academic_year,
        COALESCE(ded.deducted, 0) AS discipline_deducted,
        (? - COALESCE(ded.deducted, 0)) AS discipline_remaining
      FROM students s
      LEFT JOIN (
        SELECT student_id, SUM(marks_deducted) AS deducted
        FROM discipline_cases
        WHERE school_id = ? AND academic_year = ? AND term = ?
        GROUP BY student_id
      ) ded ON ded.student_id = s.id
      WHERE s.school_id = ?
    `;
    const params = [totalMarks, schoolId, academicYear, term, schoolId];

    if (className) {
      sql += ' AND s.class_name = ?';
      params.push(className);
    }
    const sy = trimStr(req.query.filter_year || '');
    if (sy) {
      sql += ' AND s.academic_year = ?';
      params.push(sy);
    }

    sql += ' ORDER BY s.class_name ASC, s.last_name ASC, s.first_name ASC';

    const [rows] = await promisePool.query(sql, params);

    const data = rows.map((r) => ({
      id: r.id,
      student_uid: r.student_uid,
      student_code: r.student_code,
      first_name: r.first_name,
      last_name: r.last_name,
      class_name: r.class_name,
      academic_year: r.academic_year,
      discipline_total: totalMarks,
      discipline_deducted: Number(r.discipline_deducted || 0),
      discipline_remaining: Number(r.discipline_remaining || 0),
    }));

    return res.json({
      success: true,
      data,
      meta: { total_marks: totalMarks, academic_year: academicYear, term },
    });
  } catch (err) {
    console.error('GET /discipline/students-summary:', err);
    return res.status(500).json({ success: false, message: 'Failed to load students' });
  }
});

// ════════════════════════════════════════════════════════════════
// POST /api/discipline/cases
// ════════════════════════════════════════════════════════════════
router.post('/discipline/cases', requireRole(DISCIPLINE_WRITE_ROLES), async (req, res) => {
  try {
    await ensureDisciplineTables();
    const schoolId = resolveSchoolId(req);
    const userId = resolveUserId(req);
    if (!schoolId || !userId) {
      return res.status(400).json({ success: false, message: 'Invalid session.' });
    }

    const body = req.body || {};
    const studentId = Number(body.student_id);
    const { academicYear, term } = await resolveAcademicContext(
      schoolId,
      body.academic_year || body.year || '',
      body.term || ''
    );
    const lessonSubject = trimStr(body.lesson_subject || body.lesson || body.case_lesson);
    const description = trimStr(body.description) || null;
    const marksDeducted = Number(body.marks_deducted);

    if (!studentId || Number.isNaN(studentId)) {
      return res.status(400).json({ success: false, message: 'student_id is required.' });
    }
    if (!lessonSubject) {
      return res.status(400).json({ success: false, message: 'lesson_subject (case lesson) is required.' });
    }
    if (Number.isNaN(marksDeducted) || marksDeducted <= 0) {
      return res.status(400).json({ success: false, message: 'marks_deducted must be a positive number.' });
    }

    const [[st]] = await promisePool.query(
      'SELECT id, class_name FROM students WHERE id = ? AND school_id = ? LIMIT 1',
      [studentId, schoolId]
    );
    if (!st) {
      return res.status(404).json({ success: false, message: 'Student not found in this school.' });
    }

    const totalMarks = await getTotalMarksForSchool(schoolId);
    const [[sumRow]] = await promisePool.query(
      `SELECT COALESCE(SUM(marks_deducted), 0) AS s
       FROM discipline_cases
       WHERE school_id = ? AND student_id = ? AND academic_year = ? AND term = ?`,
      [schoolId, studentId, academicYear, term]
    );
    const already = Number(sumRow?.s || 0);
    const remainBefore = totalMarks - already;
    if (marksDeducted > remainBefore) {
      return res.status(400).json({
        success: false,
        message: `Cannot remove more than remaining marks (${remainBefore.toFixed(2)} left for this term).`,
      });
    }
    const remainAfter = remainBefore - marksDeducted;

    const [ins] = await promisePool.query(
      `INSERT INTO discipline_cases (
         school_id, student_id, academic_year, term, class_name,
         lesson_subject, description, marks_deducted, marks_remaining_after,
         recorded_by_user_id
       ) VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [
        schoolId,
        studentId,
        academicYear,
        term,
        st.class_name || null,
        lessonSubject.slice(0, 255),
        description,
        marksDeducted,
        remainAfter,
        userId,
      ]
    );

    const [[stName]] = await promisePool.query(
      `SELECT s.first_name, s.last_name, sc.school_name
       FROM students s
       LEFT JOIN schools sc ON sc.id = s.school_id
       WHERE s.id = ?
       LIMIT 1`,
      [studentId]
    );
    const studentName =
      `${trimStr(stName?.first_name)} ${trimStr(stName?.last_name)}`.trim() || 'Your child';
    const schoolName = trimStr(stName?.school_name) || 'School';
    setImmediate(() => {
      notifyStudentParentsChannels(studentId, {
        type: 'DISCIPLINE_CASE',
        title: `${schoolName}: Discipline case`,
        body: `${studentName}: ${marksDeducted} mark(s) deducted — ${lessonSubject}. Remaining: ${remainAfter} of ${totalMarks}.`,
        payload: {
          case_id: ins.insertId,
          student_id: studentId,
          school_id: schoolId,
          marks_deducted: marksDeducted,
          remaining: remainAfter,
        },
        pushTag: `discipline-case-${ins.insertId}`,
        category: 'discipline',
      }).catch((e) => console.warn('[discipline/case/notify]', e.message));
    });

    return res.status(201).json({
      success: true,
      message: 'Discipline case recorded.',
      data: {
        id: ins.insertId,
        marks_remaining_after: remainAfter,
        discipline_total: totalMarks,
        discipline_deducted: already + marksDeducted,
      },
    });
  } catch (err) {
    console.error('POST /discipline/cases:', err);
    return res.status(500).json({ success: false, message: 'Failed to record case' });
  }
});

// ════════════════════════════════════════════════════════════════
// GET /api/discipline/cases
// ════════════════════════════════════════════════════════════════
router.get('/discipline/cases', requireRole(DISCIPLINE_READ_ROLES), async (req, res) => {
  try {
    await ensureDisciplineTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) {
      return res.status(400).json({ success: false, message: 'School not found in session.' });
    }

    const academicYearQ = trimStr(req.query.academic_year || '');
    const termQ = trimStr(req.query.term || '');
    const className = trimStr(req.query.class_name || '');
    const limit = Math.min(500, Math.max(10, Number(req.query.limit) || 200));
    const { academicYear, term } = await resolveAcademicContext(schoolId, academicYearQ, termQ);

    let sql = `
      SELECT
        c.id,
        c.student_id,
        c.academic_year,
        c.term,
        c.class_name,
        c.lesson_subject,
        c.description,
        c.marks_deducted,
        c.marks_remaining_after,
        c.created_at,
        s.first_name,
        s.last_name,
        s.student_uid,
        s.student_code
      FROM discipline_cases c
      INNER JOIN students s ON s.id = c.student_id AND s.school_id = c.school_id
      WHERE c.school_id = ?
    `;
    const params = [schoolId];

    sql += ' AND c.academic_year = ?';
    params.push(academicYear);
    sql += ' AND c.term = ?';
    params.push(term);
    if (className) {
      sql += ' AND c.class_name = ?';
      params.push(className);
    }

    sql += ' ORDER BY c.created_at DESC LIMIT ?';
    params.push(limit);

    const [rows] = await promisePool.query(sql, params);
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /discipline/cases:', err);
    return res.status(500).json({ success: false, message: 'Failed to list cases' });
  }
});

// ════════════════════════════════════════════════════════════════
// GET /api/discipline/report-summary
// ════════════════════════════════════════════════════════════════
router.get('/discipline/report-summary', requireRole(DISCIPLINE_READ_ROLES), async (req, res) => {
  try {
    await ensureDisciplineTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) {
      return res.status(400).json({ success: false, message: 'School not found in session.' });
    }

    const academicYearQ = trimStr(req.query.academic_year || '');
    const termQ = trimStr(req.query.term || '');
    const { academicYear, term } = await resolveAcademicContext(schoolId, academicYearQ, termQ);

    const totalMarks = await getTotalMarksForSchool(schoolId);

    let caseWhere = 'WHERE school_id = ? AND academic_year = ? AND term = ?';
    const caseParams = [schoolId, academicYear, term];

    const [[agg]] = await promisePool.query(
      `SELECT
         COUNT(*) AS case_count,
         COUNT(DISTINCT student_id) AS students_affected,
         COALESCE(SUM(marks_deducted), 0) AS total_marks_removed
       FROM discipline_cases ${caseWhere}`,
      caseParams
    );

    const [byClass] = await promisePool.query(
      `SELECT
         COALESCE(class_name, '—') AS class_name,
         COUNT(*) AS case_count,
         COALESCE(SUM(marks_deducted), 0) AS marks_removed
       FROM discipline_cases ${caseWhere}
       GROUP BY COALESCE(class_name, '—')
       ORDER BY case_count DESC`,
      caseParams
    );

    return res.json({
      success: true,
      data: {
        academic_year: academicYear,
        term,
        total_marks_default: totalMarks,
        case_count: Number(agg?.case_count || 0),
        students_affected: Number(agg?.students_affected || 0),
        total_marks_removed: Number(agg?.total_marks_removed || 0),
        by_class: byClass || [],
      },
    });
  } catch (err) {
    console.error('GET /discipline/report-summary:', err);
    return res.status(500).json({ success: false, message: 'Failed to load report summary' });
  }
});

// ════════════════════════════════════════════════════════════════
// GET /api/discipline/permissions/exceeded-report
// query: period=today|week|month|all
// ════════════════════════════════════════════════════════════════
router.get('/discipline/permissions/exceeded-report', requireRole(DISCIPLINE_READ_ROLES), async (req, res) => {
  try {
    await ensureDisciplineTables();
    await ensurePermissionTrackingColumns();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) {
      return res.status(400).json({ success: false, message: 'School not found in session.' });
    }

    const period = trimStr(req.query.period || 'month').toLowerCase();
    const today = schoolDateOnly();
    let whereDateSql = '';
    const whereParams = [schoolId];
    if (period === 'today') {
      whereDateSql = ' AND DATE(p.actual_return_at) = ?';
      whereParams.push(today);
    } else if (period === 'week') {
      whereDateSql = ' AND p.actual_return_at >= DATE_SUB(?, INTERVAL 6 DAY)';
      whereParams.push(`${today} 23:59:59`);
    } else if (period === 'month') {
      whereDateSql = ' AND p.actual_return_at >= DATE_SUB(?, INTERVAL 29 DAY)';
      whereParams.push(`${today} 23:59:59`);
    }

    const getTotal = async (rangeSql = '', rangeParams = []) => {
      const [[row]] = await promisePool.query(
        `SELECT
           COUNT(*) AS exceeded_count,
           COALESCE(SUM(exceeded_minutes), 0) AS exceeded_minutes_total
         FROM student_permissions
         WHERE school_id = ?
           AND gate_scan_state = 'EXCEEDED'
           AND actual_return_at IS NOT NULL
           ${rangeSql}`,
        [schoolId, ...rangeParams]
      );
      return {
        exceeded_count: Number(row?.exceeded_count || 0),
        exceeded_minutes_total: Number(row?.exceeded_minutes_total || 0),
      };
    };

    const totalsToday = await getTotal(' AND DATE(actual_return_at) = ?', [today]);
    const totalsWeek = await getTotal(' AND actual_return_at >= DATE_SUB(?, INTERVAL 6 DAY)', [`${today} 23:59:59`]);
    const totalsMonth = await getTotal(' AND actual_return_at >= DATE_SUB(?, INTERVAL 29 DAY)', [`${today} 23:59:59`]);

    const [rows] = await promisePool.query(
      `SELECT
         s.id AS student_id,
         s.student_uid,
         s.student_code,
         s.class_name,
         TRIM(CONCAT(COALESCE(s.first_name,''), ' ', COALESCE(s.last_name,''))) AS student_name,
         COUNT(*) AS exceeded_count,
         COALESCE(SUM(p.exceeded_minutes), 0) AS exceeded_minutes_total,
         MAX(p.exceeded_minutes) AS max_exceeded_minutes,
         MAX(p.actual_return_at) AS last_exceeded_at
       FROM student_permissions p
       INNER JOIN students s ON s.id = p.student_id AND s.school_id = p.school_id
       WHERE p.school_id = ?
         AND p.gate_scan_state = 'EXCEEDED'
         AND p.actual_return_at IS NOT NULL
         ${whereDateSql}
       GROUP BY s.id, s.student_uid, s.student_code, s.class_name, s.first_name, s.last_name
       ORDER BY exceeded_minutes_total DESC, exceeded_count DESC, student_name ASC
       LIMIT 300`,
      whereParams
    );

    const data = (rows || []).map((r) => ({
      student_id: r.student_id,
      student_uid: r.student_uid || null,
      student_code: r.student_code || null,
      class_name: r.class_name || null,
      student_name: r.student_name || `Student ${r.student_id}`,
      exceeded_count: Number(r.exceeded_count || 0),
      exceeded_minutes_total: Number(r.exceeded_minutes_total || 0),
      exceeded_hours_total: Number((Number(r.exceeded_minutes_total || 0) / 60).toFixed(2)),
      exceeded_days_total: Number((Number(r.exceeded_minutes_total || 0) / 1440).toFixed(2)),
      max_exceeded_minutes: Number(r.max_exceeded_minutes || 0),
      last_exceeded_at: r.last_exceeded_at || null,
    }));

    return res.json({
      success: true,
      data,
      totals: {
        today: totalsToday,
        week: totalsWeek,
        month: totalsMonth,
      },
      meta: { period, as_of_date: today },
    });
  } catch (err) {
    console.error('GET /discipline/permissions/exceeded-report:', err);
    return res.status(500).json({ success: false, message: 'Failed to load exceeded permission report.' });
  }
});

module.exports = router;
