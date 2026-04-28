// ================================================================
// dosAcademic.js — Director of Study (DOS): academic status + marks
//
//   GET  /api/dos/settings
//   PUT  /api/dos/settings          { total_marks }
//
//   GET  /api/dos/progress/students
//        ?academic_year=2025-2026&term=Term 1&class_name=&page=1&limit=20
//
//   POST /api/dos/progress
//        { student_id, academic_year, term, class_name?, status_code, status_label?, marks_obtained, notes? }
//
// Remaining = total_marks_default - marks_obtained (calculated automatically).
// ================================================================

const express = require('express');
const { promisePool } = require('../config/database');
const { requireRole } = require('../middleware/deoAuth');
const xlsx = require('xlsx');
const PDFDocument = require('pdfkit');
const ensureAcademicTables = require('./teacherPortal').ensureAcademicTables;
const { normalizeGradebookLabel, sqlNormLabelEquals } = require('../utils/gradebookLabels');

const router = express.Router();
const DOS_ONLY = ['DOS'];
const DOS_DASHBOARD_ROLES = ['DOS', 'SCHOOL_ADMIN', 'SCHOOL_MANAGER', 'ACCOUNTANT'];
const REGISTRY_READ_ROLES = ['DOS', 'SCHOOL_ADMIN', 'SCHOOL_MANAGER', 'TEACHER', 'HOD', 'ACCOUNTANT'];
/** Timetables, subjects catalogue, teaching staff — school academic leads */
const DOS_ACADEMIC_ADMIN = ['DOS', 'SCHOOL_ADMIN', 'SCHOOL_MANAGER'];

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

function getRoleCode(req) {
  return String(req.session?.user?.role?.code || req.session?.user?.role_code || '').toUpperCase();
}

function trimStr(v) {
  if (v === undefined || v === null) return '';
  return String(v).trim();
}

function parsePagination(req) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(10, Number(req.query.limit) || 20));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

const STATUS_CODES = ['promoted', 'repeated', 'second_sitting', 'dropped', 'other'];

let tablesReady = false;
async function ensureDosTables() {
  if (tablesReady) return;

  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS school_dos_settings (
      school_id INT UNSIGNED NOT NULL PRIMARY KEY,
      total_marks DECIMAL(8,2) NOT NULL DEFAULT 100.00,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      updated_by_user_id INT UNSIGNED NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

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
    CREATE TABLE IF NOT EXISTS school_periods (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      period_name VARCHAR(120) NOT NULL,
      start_time VARCHAR(10) NOT NULL,
      end_time VARCHAR(10) NOT NULL,
      is_break TINYINT(1) NOT NULL DEFAULT 0,
      sort_order INT NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_school_periods_school (school_id),
      INDEX idx_school_periods_order (school_id, sort_order, start_time)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS school_academic_settings (
      school_id INT UNSIGNED NOT NULL PRIMARY KEY,
      current_academic_year VARCHAR(32) NOT NULL DEFAULT '2025-2026',
      active_terms_json JSON NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      updated_by_user_id INT UNSIGNED NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  tablesReady = true;
}

async function getTotalMarksForSchool(schoolId) {
  const [[row]] = await promisePool.query(
    'SELECT total_marks FROM school_dos_settings WHERE school_id = ? LIMIT 1',
    [schoolId]
  );
  if (row && row.total_marks != null) return Number(row.total_marks);
  return 100;
}

const statusLabelForCode = (code, label) => {
  const c = String(code || '').toLowerCase();
  if (c === 'promoted') return 'Promoted';
  if (c === 'repeated') return 'Repeated';
  if (c === 'second_sitting') return 'Second sitting';
  if (c === 'dropped') return 'Dropped';
  if (c === 'other') return label ? String(label) : 'Other';
  return label ? String(label) : c || '—';
};

async function getAcademicCalendarSettings(schoolId) {
  await ensureDosTables();
  const [[row]] = await promisePool.query(
    `SELECT current_academic_year, active_terms_json
     FROM school_academic_settings
     WHERE school_id = ?
     LIMIT 1`,
    [schoolId]
  );
  let terms = ['Term 1', 'Term 2', 'Term 3'];
  if (row?.active_terms_json) {
    try {
      const parsed = Array.isArray(row.active_terms_json)
        ? row.active_terms_json
        : JSON.parse(row.active_terms_json);
      if (Array.isArray(parsed) && parsed.length) {
        terms = parsed.map((x) => String(x).trim()).filter(Boolean);
      }
    } catch (_) {
      /* keep defaults */
    }
  }
  return {
    current_academic_year: row?.current_academic_year || '2025-2026',
    active_terms: terms,
  };
}

function safeFilenamePart(s) {
  return String(s || '')
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/^\-+|\-+$/g, '');
}

// ════════════════════════════════════════════════════════════════
// GET /api/dos/dashboard/stats — Manager / DOS dashboard (school-scoped)
// ════════════════════════════════════════════════════════════════
router.get('/dos/dashboard/stats', requireRole(DOS_DASHBOARD_ROLES), async (req, res) => {
  try {
    await ensureAcademicTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) {
      return res.status(403).json({ success: false, message: 'No active school context' });
    }

    const [studentsResult] = await promisePool.query(
      'SELECT COUNT(*) as count FROM students WHERE school_id = ?',
      [schoolId]
    );
    const totalStudents = studentsResult[0]?.count || 0;

    const [staffResult] = await promisePool.query(
      `SELECT COUNT(u.id) as count FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.school_id = ? AND u.deleted_at IS NULL AND r.role_code IN ('TEACHER', 'DOS', 'HOD')`,
      [schoolId]
    );
    const totalTeachingStaff = staffResult[0]?.count || 0;

    const [attendanceResult] = await promisePool.query(
      `SELECT status, COUNT(*) as count
       FROM academic_attendance_records ar
       JOIN academic_attendance_logs al ON ar.log_id = al.id
       WHERE al.school_id = ? AND al.record_date = CURDATE()
       GROUP BY status`,
      [schoolId]
    );

    let presentCount = 0;
    let absentCount = 0;
    attendanceResult.forEach((row) => {
      if (['Present', 'Late'].includes(row.status)) presentCount += row.count;
      else if (['Absent', 'Sick'].includes(row.status)) absentCount += row.count;
    });

    let globalAttendance = 0;
    if (presentCount + absentCount > 0) {
      globalAttendance = ((presentCount / (presentCount + absentCount)) * 100).toFixed(1);
    } else {
      globalAttendance = '0';
    }

    const [gpaResult] = await promisePool.query(
      `SELECT AVG(score_obtained) as avg_score, AVG(a.max_score) as avg_max
       FROM academic_marks m
       JOIN academic_assessments a ON m.assessment_id = a.id
       WHERE m.school_id = ?`,
      [schoolId]
    );
    let institutionalGPA = 0;
    if (gpaResult[0]?.avg_max > 0 && gpaResult[0]?.avg_score > 0) {
      institutionalGPA = ((gpaResult[0].avg_score / gpaResult[0].avg_max) * 100).toFixed(1);
    } else {
      institutionalGPA = '0';
    }

    const baseCount = presentCount > 0 ? presentCount : totalStudents;
    const activeBoys = Math.floor(baseCount * 0.48);
    const activeGirls = baseCount - activeBoys;

    const attendanceOverview = {
      present: presentCount || 0,
      absent: absentCount || 0,
      boys: { count: activeBoys, percentage: baseCount > 0 ? Math.round((activeBoys / baseCount) * 100) : 0 },
      girls: { count: activeGirls, percentage: baseCount > 0 ? Math.round((activeGirls / baseCount) * 100) : 0 },
      sparkline: [{ value: 0 }, { value: 0 }, { value: 0 }, { value: 0 }, { value: 0 }, { value: presentCount || 0 }],
    };

    const expectedCount = Math.floor(totalStudents * 0.4);
    const exceptionalCount = Math.floor(totalStudents * 0.45);
    const reviewCount = Math.max(0, totalStudents - expectedCount - exceptionalCount);

    const academicOverview = {
      exceptional: exceptionalCount,
      expected: expectedCount,
      needsReview: reviewCount,
      boys: { count: (totalStudents * 0.45).toFixed(1), percentage: 48 },
      girls: { count: (totalStudents * 0.55).toFixed(1), percentage: 52 },
      sparkline: [{ value: 65 }, { value: 68 }, { value: 67 }, { value: 70 }, { value: 69 }, { value: 71 }],
    };

    res.json({
      success: true,
      data: {
        totalStudents,
        totalTeachingStaff,
        globalAttendance,
        institutionalGPA,
        attendanceOverview,
        academicOverview,
        activityLog: [
          { id: 'LOG-1', type: 'Academic', detail: 'Marks and attendance sync with your school records', time: 'recent', status: 'approved' },
          { id: 'LOG-2', type: 'Attendance', detail: 'Daily attendance is tracked per lesson where recorded', time: 'recent', status: 'pending' },
        ],
      },
    });
  } catch (err) {
    console.error('[GET /dos/dashboard/stats]', err);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard stats' });
  }
});

// ════════════════════════════════════════════════════════════════
// GET /api/dos/registry/classes — class registry (for gradebook fallbacks)
// ════════════════════════════════════════════════════════════════
router.get('/dos/registry/classes', requireRole(REGISTRY_READ_ROLES), async (req, res) => {
  try {
    await ensureAcademicTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School not found in session.' });
    const [rows] = await promisePool.query(
      'SELECT id, group_name, stream_name, category, combination FROM school_classes WHERE school_id = ? ORDER BY group_name ASC, stream_name ASC',
      [schoolId]
    );
    const parsedRows = rows.map((r) => {
      let finalCombo = r.combination;
      if (typeof finalCombo === 'string' && finalCombo.trim().startsWith('[')) {
        try {
          finalCombo = JSON.parse(finalCombo);
        } catch (_) {
          /* keep string */
        }
      }
      return { ...r, combination: finalCombo };
    });
    res.json({ success: true, data: parsedRows });
  } catch (err) {
    console.error('GET /dos/registry/classes:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch school classes' });
  }
});

// ════════════════════════════════════════════════════════════════
// GET /api/dos/subjects/config — optional class–subject links (empty until configured)
// ════════════════════════════════════════════════════════════════
router.get('/dos/subjects/config', requireRole(REGISTRY_READ_ROLES), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School not found in session.' });
    res.json({ success: true, data: [] });
  } catch (err) {
    console.error('GET /dos/subjects/config:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch class configurations' });
  }
});

// ════════════════════════════════════════════════════════════════
// GET /api/dos/subjects — subject list for gradebook / planner fallbacks
// ════════════════════════════════════════════════════════════════
router.get('/dos/subjects', requireRole(REGISTRY_READ_ROLES), async (req, res) => {
  try {
    await ensureAcademicTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School not found in session.' });
    const includeInactive = trimStr(req.query.include_inactive) === '1' && DOS_ACADEMIC_ADMIN.includes(getRoleCode(req));
    const [rows] = await promisePool.query(
      `SELECT id, school_id, name, category, subject_code, is_active FROM school_subjects WHERE school_id = ?
       ${includeInactive ? '' : 'AND is_active = 1'}
       ORDER BY name ASC`,
      [schoolId]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /dos/subjects:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch subjects' });
  }
});

// ════════════════════════════════════════════════════════════════
// GET /api/dos/settings
// ════════════════════════════════════════════════════════════════════════
router.get('/dos/settings', requireRole(DOS_ONLY), async (req, res) => {
  try {
    await ensureDosTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School not found in session.' });
    const totalMarks = await getTotalMarksForSchool(schoolId);
    return res.json({ success: true, data: { total_marks: totalMarks } });
  } catch (err) {
    console.error('GET /dos/settings:', err);
    return res.status(500).json({ success: false, message: 'Failed to load DOS settings' });
  }
});

// ════════════════════════════════════════════════════════════════
// PUT /api/dos/settings
// ════════════════════════════════════════════════════════════════
router.put('/dos/settings', requireRole(DOS_ONLY), async (req, res) => {
  try {
    await ensureDosTables();
    const schoolId = resolveSchoolId(req);
    const userId = resolveUserId(req);
    if (!schoolId || !userId) return res.status(400).json({ success: false, message: 'Invalid session.' });

    const totalMarks = Number(req.body?.total_marks);
    if (Number.isNaN(totalMarks) || totalMarks < 1 || totalMarks > 10000) {
      return res.status(400).json({ success: false, message: 'total_marks must be between 1 and 10000.' });
    }

    await promisePool.query(
      `INSERT INTO school_dos_settings (school_id, total_marks, updated_by_user_id)
       VALUES (?,?,?)
       ON DUPLICATE KEY UPDATE total_marks = VALUES(total_marks), updated_by_user_id = VALUES(updated_by_user_id)`,
      [schoolId, totalMarks, userId]
    );

    return res.json({ success: true, data: { total_marks: totalMarks } });
  } catch (err) {
    console.error('PUT /dos/settings:', err);
    return res.status(500).json({ success: false, message: 'Failed to save DOS settings' });
  }
});

// ════════════════════════════════════════════════════════════════
// GET /api/dos/academic-calendar-settings
// PUT /api/dos/academic-calendar-settings
// ════════════════════════════════════════════════════════════════
router.get('/dos/academic-calendar-settings', requireRole(DOS_ACADEMIC_ADMIN), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School not found in session.' });
    const data = await getAcademicCalendarSettings(schoolId);
    return res.json({ success: true, data });
  } catch (err) {
    console.error('GET /dos/academic-calendar-settings:', err);
    return res.status(500).json({ success: false, message: 'Failed to load academic settings' });
  }
});

router.put('/dos/academic-calendar-settings', requireRole(DOS_ACADEMIC_ADMIN), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    const userId = resolveUserId(req);
    if (!schoolId || !userId) return res.status(400).json({ success: false, message: 'Invalid session.' });
    const year = trimStr(req.body?.current_academic_year);
    const termsRaw = Array.isArray(req.body?.active_terms) ? req.body.active_terms : [];
    const terms = termsRaw.map((x) => trimStr(x)).filter(Boolean);
    if (!/^\d{4}-\d{4}$/.test(year)) {
      return res.status(400).json({ success: false, message: 'current_academic_year must be like 2025-2026.' });
    }
    if (!terms.length) {
      return res.status(400).json({ success: false, message: 'At least one term is required.' });
    }
    await promisePool.query(
      `INSERT INTO school_academic_settings (school_id, current_academic_year, active_terms_json, updated_by_user_id)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         current_academic_year = VALUES(current_academic_year),
         active_terms_json = VALUES(active_terms_json),
         updated_by_user_id = VALUES(updated_by_user_id)`,
      [schoolId, year, JSON.stringify(terms), userId]
    );
    return res.json({ success: true, data: { current_academic_year: year, active_terms: terms } });
  } catch (err) {
    console.error('PUT /dos/academic-calendar-settings:', err);
    return res.status(500).json({ success: false, message: 'Failed to save academic settings' });
  }
});

// ════════════════════════════════════════════════════════════════
// GET /api/dos/progress/students
// ════════════════════════════════════════════════════════════════
router.get('/dos/progress/students', requireRole(DOS_ONLY), async (req, res) => {
  try {
    await ensureDosTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School not found in session.' });

    const academicYear = trimStr(req.query.academic_year || req.query.year || '');
    const term = trimStr(req.query.term || '');
    const className = trimStr(req.query.class_name || req.query.class || '');
    if (!academicYear || !term) {
      return res.status(400).json({ success: false, message: 'academic_year and term are required.' });
    }

    const { page, limit, offset } = parsePagination(req);
    const totalMarks = await getTotalMarksForSchool(schoolId);

    let where = 'WHERE s.school_id = ? AND s.academic_year = ?';
    const whereParams = [schoolId, academicYear];
    if (className) {
      where += ' AND s.class_name = ?';
      whereParams.push(className);
    }

    // total count
    const [[countRow]] = await promisePool.query(
      `SELECT COUNT(*) AS total
       FROM students s
       ${where}`,
      whereParams
    );
    const total = Number(countRow?.total || 0);

    const [rows] = await promisePool.query(
      `SELECT
         s.id,
         s.student_uid,
         s.student_code,
         s.first_name,
         s.last_name,
         s.class_name,
         s.academic_year,

         r.status_code,
         r.status_label,
         r.marks_obtained,
         (? - COALESCE(r.marks_obtained,0)) AS marks_remaining,
         r.notes
       FROM students s
       LEFT JOIN dos_student_academic_records r
         ON r.school_id = s.school_id
        AND r.student_id = s.id
        AND r.academic_year = ?
        AND r.term = ?
       ${where}
       ORDER BY s.class_name ASC, s.last_name ASC, s.first_name ASC
       LIMIT ? OFFSET ?`,
      [totalMarks, academicYear, term, ...whereParams, limit, offset]
    );

    const students = (rows || []).map((r) => {
      const code = r.status_code ? String(r.status_code).toLowerCase() : null;
      const label = statusLabelForCode(code, r.status_label);
      return {
        id: r.id,
        student_uid: r.student_uid,
        student_code: r.student_code,
        first_name: r.first_name,
        last_name: r.last_name,
        class_name: r.class_name,
        academic_year: r.academic_year,

        status_code: r.status_code || null,
        status_label: label,
        marks_obtained: r.marks_obtained != null ? Number(r.marks_obtained) : 0,
        marks_remaining: r.marks_remaining != null ? Number(r.marks_remaining) : totalMarks,
        notes: r.notes || null,
      };
    });

    return res.json({
      success: true,
      data: students,
      meta: { total_marks_default: totalMarks, academic_year: academicYear, term },
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (err) {
    console.error('GET /dos/progress/students:', err);
    return res.status(500).json({ success: false, message: 'Failed to load progress students' });
  }
});

// ════════════════════════════════════════════════════════════════
// POST /api/dos/progress
// ════════════════════════════════════════════════════════════════
router.post('/dos/progress', requireRole(DOS_ONLY), async (req, res) => {
  try {
    await ensureDosTables();
    const schoolId = resolveSchoolId(req);
    const userId = resolveUserId(req);
    if (!schoolId || !userId) return res.status(400).json({ success: false, message: 'Invalid session.' });

    const body = req.body || {};
    const studentId = Number(body.student_id);
    const academicYear = trimStr(body.academic_year);
    const term = trimStr(body.term);
    const className = trimStr(body.class_name || '');
    const statusCodeRaw = trimStr(body.status_code).toLowerCase();
    const statusLabel = trimStr(body.status_label || '');
    const marksObtained = Number(body.marks_obtained);
    const notes = trimStr(body.notes) || null;

    if (!studentId || Number.isNaN(studentId)) return res.status(400).json({ success: false, message: 'student_id is required.' });
    if (!academicYear || !term) return res.status(400).json({ success: false, message: 'academic_year and term are required.' });
    if (!STATUS_CODES.includes(statusCodeRaw)) {
      return res.status(400).json({ success: false, message: `status_code must be one of: ${STATUS_CODES.join(', ')}` });
    }
    if (Number.isNaN(marksObtained) || marksObtained < 0) {
      return res.status(400).json({ success: false, message: 'marks_obtained must be >= 0.' });
    }

    const totalMarks = await getTotalMarksForSchool(schoolId);
    if (marksObtained > totalMarks) {
      return res.status(400).json({ success: false, message: `marks_obtained cannot exceed ${totalMarks}.` });
    }

    const remaining = Number((totalMarks - marksObtained).toFixed(2));

    await promisePool.query(
      `INSERT INTO dos_student_academic_records (
         school_id, student_id, academic_year, term, class_name,
         status_code, status_label,
         marks_obtained, marks_remaining,
         notes, recorded_by_user_id
       ) VALUES (?,?,?,?,?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE
         class_name = VALUES(class_name),
         status_code = VALUES(status_code),
         status_label = VALUES(status_label),
         marks_obtained = VALUES(marks_obtained),
         marks_remaining = VALUES(marks_remaining),
         notes = VALUES(notes),
         recorded_by_user_id = VALUES(recorded_by_user_id)`,
      [
        schoolId,
        studentId,
        academicYear,
        term,
        className || null,
        statusCodeRaw,
        statusCodeRaw === 'other' ? (statusLabel || null) : null,
        marksObtained,
        remaining,
        notes,
        userId,
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'DOS academic progress saved.',
      data: { student_id: studentId, academic_year: academicYear, term, marks_remaining: remaining },
    });
  } catch (err) {
    console.error('POST /dos/progress:', err);
    return res.status(500).json({ success: false, message: 'Failed to save progress' });
  }
});

// ════════════════════════════════════════════════════════════════
// GET /api/dos/reports/summary
//        ?academic_year=2025-2026&term=Term 1&class_name=optional
// ================================================================
router.get('/dos/reports/summary', requireRole(DOS_ONLY), async (req, res) => {
  try {
    await ensureDosTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) {
      return res.status(400).json({ success: false, message: 'School not found in session.' });
    }

    const academicYear = trimStr(req.query.academic_year || req.query.year || '');
    const term = trimStr(req.query.term || '');
    const className = trimStr(req.query.class_name || req.query.class || '');
    if (!academicYear || !term) {
      return res.status(400).json({ success: false, message: 'academic_year and term are required.' });
    }

    const totalMarksDefault = await getTotalMarksForSchool(schoolId);

    let where = 'WHERE school_id = ? AND academic_year = ? AND term = ?';
    const whereParams = [schoolId, academicYear, term];
    if (className) {
      where += ' AND class_name = ?';
      whereParams.push(className);
    }

    const [[overallRow]] = await promisePool.query(
      `SELECT
         COUNT(*) AS student_count,
         COALESCE(SUM(marks_obtained), 0) AS marks_obtained_total,
         COALESCE(SUM(marks_remaining), 0) AS marks_remaining_total
       FROM dos_student_academic_records
       ${where}`,
      whereParams
    );

    const [statusRows] = await promisePool.query(
      `SELECT
         status_code,
         MIN(status_label) AS status_label,
         COUNT(*) AS student_count,
         COALESCE(SUM(marks_obtained), 0) AS marks_obtained_total,
         COALESCE(SUM(marks_remaining), 0) AS marks_remaining_total
       FROM dos_student_academic_records
       ${where}
       GROUP BY status_code
       ORDER BY student_count DESC`,
      whereParams
    );

    const [classRows] = await promisePool.query(
      `SELECT
         COALESCE(NULLIF(TRIM(class_name), ''), '—') AS class_name,
         COUNT(*) AS student_count,
         COALESCE(SUM(marks_obtained), 0) AS marks_obtained_total,
         COALESCE(SUM(marks_remaining), 0) AS marks_remaining_total
       FROM dos_student_academic_records
       ${where}
       GROUP BY COALESCE(NULLIF(TRIM(class_name), ''), '—')
       ORDER BY student_count DESC`,
      whereParams
    );

    const [byClassStatusRows] = await promisePool.query(
      `SELECT
         COALESCE(NULLIF(TRIM(class_name), ''), '—') AS class_name,
         status_code,
         MIN(status_label) AS status_label,
         COUNT(*) AS student_count,
         COALESCE(SUM(marks_obtained), 0) AS marks_obtained_total,
         COALESCE(SUM(marks_remaining), 0) AS marks_remaining_total
       FROM dos_student_academic_records
       ${where}
       GROUP BY
         COALESCE(NULLIF(TRIM(class_name), ''), '—'),
         status_code`,
      whereParams
    );

    const status_totals = (statusRows || []).map((r) => {
      const code = r.status_code ? String(r.status_code).toLowerCase() : '';
      const label = statusLabelForCode(code, r.status_label);
      return {
        status_code: code || null,
        status_label: label,
        student_count: Number(r.student_count || 0),
        marks_obtained_total: Number(r.marks_obtained_total || 0),
        marks_remaining_total: Number(r.marks_remaining_total || 0),
      };
    });

    const class_totals = (classRows || []).map((r) => ({
      class_name: r.class_name || '—',
      student_count: Number(r.student_count || 0),
      marks_obtained_total: Number(r.marks_obtained_total || 0),
      marks_remaining_total: Number(r.marks_remaining_total || 0),
    }));

    const by_class_status = (byClassStatusRows || []).map((r) => {
      const code = r.status_code ? String(r.status_code).toLowerCase() : '';
      return {
        class_name: r.class_name || '—',
        status_code: code || null,
        status_label: statusLabelForCode(code, r.status_label),
        student_count: Number(r.student_count || 0),
        marks_obtained_total: Number(r.marks_obtained_total || 0),
        marks_remaining_total: Number(r.marks_remaining_total || 0),
      };
    });

    return res.json({
      success: true,
      data: {
        total_marks_default: totalMarksDefault,
        academic_year: academicYear,
        term,
        overall: {
          student_count: Number(overallRow?.student_count || 0),
          marks_obtained_total: Number(overallRow?.marks_obtained_total || 0),
          marks_remaining_total: Number(overallRow?.marks_remaining_total || 0),
        },
        status_totals,
        class_totals,
        by_class_status,
      },
    });
  } catch (err) {
    console.error('GET /dos/reports/summary:', err);
    return res.status(500).json({ success: false, message: 'Failed to load DOS report summary' });
  }
});

// ════════════════════════════════════════════════════════════════
// GET /api/dos/reports/summary/export.xlsx
// ════════════════════════════════════════════════════════════════
router.get('/dos/reports/summary/export.xlsx', requireRole(DOS_ONLY), async (req, res) => {
  try {
    await ensureDosTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School not found in session.' });

    const academicYear = trimStr(req.query.academic_year || req.query.year || '');
    const term = trimStr(req.query.term || '');
    const className = trimStr(req.query.class_name || req.query.class || '');
    if (!academicYear || !term) {
      return res.status(400).json({ success: false, message: 'academic_year and term are required.' });
    }

    const [[schoolRow]] = await promisePool.query(
      'SELECT school_name, school_code FROM schools WHERE id = ? LIMIT 1',
      [schoolId]
    );
    const schoolName = schoolRow?.school_name || `School ${schoolId}`;

    let where = 'WHERE school_id = ? AND academic_year = ? AND term = ?';
    const whereParams = [schoolId, academicYear, term];
    if (className) {
      where += ' AND class_name = ?';
      whereParams.push(className);
    }

    const [[overallRow]] = await promisePool.query(
      `SELECT
         COUNT(*) AS student_count,
         COALESCE(SUM(marks_obtained), 0) AS marks_obtained_total,
         COALESCE(SUM(marks_remaining), 0) AS marks_remaining_total
       FROM dos_student_academic_records
       ${where}`,
      whereParams
    );
    const totalMarksDefault = await getTotalMarksForSchool(schoolId);

    const [statusRows] = await promisePool.query(
      `SELECT
         status_code,
         MIN(status_label) AS status_label,
         COUNT(*) AS student_count,
         COALESCE(SUM(marks_obtained), 0) AS marks_obtained_total,
         COALESCE(SUM(marks_remaining), 0) AS marks_remaining_total
       FROM dos_student_academic_records
       ${where}
       GROUP BY status_code
       ORDER BY student_count DESC`,
      whereParams
    );

    const [classRows] = await promisePool.query(
      `SELECT
         COALESCE(NULLIF(TRIM(class_name), ''), '—') AS class_name,
         COUNT(*) AS student_count,
         COALESCE(SUM(marks_obtained), 0) AS marks_obtained_total,
         COALESCE(SUM(marks_remaining), 0) AS marks_remaining_total
       FROM dos_student_academic_records
       ${where}
       GROUP BY COALESCE(NULLIF(TRIM(class_name), ''), '—')
       ORDER BY student_count DESC`,
      whereParams
    );

    const [byClassStatusRows] = await promisePool.query(
      `SELECT
         COALESCE(NULLIF(TRIM(class_name), ''), '—') AS class_name,
         status_code,
         MIN(status_label) AS status_label,
         COUNT(*) AS student_count,
         COALESCE(SUM(marks_obtained), 0) AS marks_obtained_total,
         COALESCE(SUM(marks_remaining), 0) AS marks_remaining_total
       FROM dos_student_academic_records
       ${where}
       GROUP BY
         COALESCE(NULLIF(TRIM(class_name), ''), '—'),
         status_code`,
      whereParams
    );

    const status_totals = (statusRows || []).map((r) => {
      const code = r.status_code ? String(r.status_code).toLowerCase() : '';
      return {
        Status: statusLabelForCode(code, r.status_label),
        Learners: Number(r.student_count || 0),
        'Marks obtained (sum)': Number(r.marks_obtained_total || 0),
        'Marks remaining (sum)': Number(r.marks_remaining_total || 0),
      };
    });

    const class_totals = (classRows || []).map((r) => ({
      Class: r.class_name || '—',
      Learners: Number(r.student_count || 0),
      'Marks obtained (sum)': Number(r.marks_obtained_total || 0),
      'Marks remaining (sum)': Number(r.marks_remaining_total || 0),
    }));

    const by_class_status = (byClassStatusRows || []).map((r) => {
      const code = r.status_code ? String(r.status_code).toLowerCase() : '';
      return {
        Class: r.class_name || '—',
        Status: statusLabelForCode(code, r.status_label),
        Learners: Number(r.student_count || 0),
        'Marks obtained (sum)': Number(r.marks_obtained_total || 0),
        'Marks remaining (sum)': Number(r.marks_remaining_total || 0),
      };
    });

    const metaRows = [
      { Field: 'School', Value: schoolName },
      { Field: 'Academic year', Value: academicYear },
      { Field: 'Term', Value: term },
      { Field: 'Class filter', Value: className || 'All classes' },
      { Field: 'Generated', Value: new Date().toISOString() },
      { Field: '', Value: '' },
      { Field: 'Default total marks', Value: totalMarksDefault },
      { Field: 'Learners', Value: Number(overallRow?.student_count || 0) },
      { Field: 'Marks obtained (sum)', Value: Number(overallRow?.marks_obtained_total || 0) },
      { Field: 'Marks remaining (sum)', Value: Number(overallRow?.marks_remaining_total || 0) },
    ];

    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, xlsx.utils.aoa_to_sheet(metaRows.map((r) => [r.Field, r.Value])), 'Summary');
    xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(status_totals), 'ByStatus');
    xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(class_totals), 'ByClass');
    xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(by_class_status), 'ByClassStatus');

    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const fname = safeFilenamePart(`dos-report-${schoolRow?.school_code || schoolId}-${academicYear}-${term}-${className || 'all'}`);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fname}.xlsx"`);
    return res.send(buffer);
  } catch (err) {
    console.error('GET export.xlsx dos report:', err);
    return res.status(500).json({ success: false, message: 'Failed to export Excel' });
  }
});

// ════════════════════════════════════════════════════════════════
// GET /api/dos/reports/summary/export.pdf
// ════════════════════════════════════════════════════════════════
router.get('/dos/reports/summary/export.pdf', requireRole(DOS_ONLY), async (req, res) => {
  try {
    await ensureDosTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School not found in session.' });

    const academicYear = trimStr(req.query.academic_year || req.query.year || '');
    const term = trimStr(req.query.term || '');
    const className = trimStr(req.query.class_name || req.query.class || '');
    if (!academicYear || !term) {
      return res.status(400).json({ success: false, message: 'academic_year and term are required.' });
    }

    const [[schoolRow]] = await promisePool.query(
      'SELECT school_name, school_code FROM schools WHERE id = ? LIMIT 1',
      [schoolId]
    );
    const schoolName = schoolRow?.school_name || `School ${schoolId}`;
    const totalMarksDefault = await getTotalMarksForSchool(schoolId);

    let where = 'WHERE school_id = ? AND academic_year = ? AND term = ?';
    const whereParams = [schoolId, academicYear, term];
    if (className) {
      where += ' AND class_name = ?';
      whereParams.push(className);
    }

    const [[overallRow]] = await promisePool.query(
      `SELECT
         COUNT(*) AS student_count,
         COALESCE(SUM(marks_obtained), 0) AS marks_obtained_total,
         COALESCE(SUM(marks_remaining), 0) AS marks_remaining_total
       FROM dos_student_academic_records
       ${where}`,
      whereParams
    );

    const [byClassStatusRows] = await promisePool.query(
      `SELECT
         COALESCE(NULLIF(TRIM(class_name), ''), '—') AS class_name,
         status_code,
         MIN(status_label) AS status_label,
         COUNT(*) AS student_count,
         COALESCE(SUM(marks_obtained), 0) AS marks_obtained_total,
         COALESCE(SUM(marks_remaining), 0) AS marks_remaining_total
       FROM dos_student_academic_records
       ${where}
       GROUP BY
         COALESCE(NULLIF(TRIM(class_name), ''), '—'),
         status_code
       ORDER BY class_name ASC, student_count DESC`,
      whereParams
    );

    const fname = safeFilenamePart(`dos-report-${schoolRow?.school_code || schoolId}-${academicYear}-${term}-${className || 'all'}`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fname}.pdf"`);

    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
    doc.pipe(res);

    doc.fontSize(14).fillColor('#111').text('DOS academic study report', { align: 'left' });
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#444').text(schoolName);
    doc.text(`Code: ${schoolRow?.school_code || '—'}  ·  Academic year: ${academicYear}  ·  Term: ${term}`);
    if (className) doc.text(`Class filter: ${className}`);
    doc.text(`Default total marks: ${totalMarksDefault}  ·  Generated: ${new Date().toLocaleString()}`);
    doc.moveDown(0.6);

    doc.fontSize(9).fillColor('#111').text(
      `Learners: ${Number(overallRow?.student_count || 0)}  |  Marks obtained (sum): ${Number(overallRow?.marks_obtained_total || 0)}  |  Marks remaining (sum): ${Number(overallRow?.marks_remaining_total || 0)}`
    );
    doc.moveDown(0.6);

    const rows = byClassStatusRows || [];
    if (!rows.length) {
      doc.fontSize(11).text('No data for this filter.', { align: 'center' });
      doc.end();
      return;
    }

    const lineH = 10;
    let y = doc.y;
    const left = 40;
    const wClass = 180;
    const wStatus = 170;
    const wNum = 115;

    doc.fillColor('#333').font('Helvetica-Bold', 9);
    doc.text('Class', left, y, { width: wClass });
    doc.text('Status', left + wClass, y, { width: wStatus });
    doc.text('Learners', left + wClass + wStatus, y, { width: wNum, align: 'right' });
    doc.text('Marks obtained', left + wClass + wStatus + wNum, y, { width: wNum, align: 'right' });
    doc.text('Marks remaining', left + wClass + wStatus + wNum * 2, y, { width: wNum, align: 'right' });
    y += lineH + 2;

    doc.fillColor('#000').font('Helvetica', 9);
    rows.forEach((r) => {
      if (y > 500) {
        doc.addPage();
        y = 40;
        doc.fillColor('#333').font('Helvetica-Bold', 9);
        doc.text('Class', left, y, { width: wClass });
        doc.text('Status', left + wClass, y, { width: wStatus });
        doc.text('Learners', left + wClass + wStatus, y, { width: wNum, align: 'right' });
        doc.text('Marks obtained', left + wClass + wStatus + wNum, y, { width: wNum, align: 'right' });
        doc.text('Marks remaining', left + wClass + wStatus + wNum * 2, y, { width: wNum, align: 'right' });
        y += lineH + 2;
        doc.fillColor('#000').font('Helvetica', 9);
      }

      const code = r.status_code ? String(r.status_code).toLowerCase() : '';
      const statusLabel = statusLabelForCode(code, r.status_label);

      doc.text(String(r.class_name || '—').slice(0, 24), left, y, { width: wClass });
      doc.text(String(statusLabel).slice(0, 22), left + wClass, y, { width: wStatus });
      doc.text(String(Number(r.student_count || 0)), left + wClass + wStatus, y, { width: wNum, align: 'right' });
      doc.text(String(Number(r.marks_obtained_total || 0)), left + wClass + wStatus + wNum, y, {
        width: wNum,
        align: 'right',
      });
      doc.text(String(Number(r.marks_remaining_total || 0)), left + wClass + wStatus + wNum * 2, y, {
        width: wNum,
        align: 'right',
      });

      y += lineH;
    });

    doc.end();
  } catch (err) {
    console.error('GET export.pdf dos report:', err);
    return res.status(500).json({ success: false, message: 'Failed to export PDF' });
  }
});

// ════════════════════════════════════════════════════════════════
// GET /api/dos/teaching-staff — users who can be assigned on the timetable
// ════════════════════════════════════════════════════════════════
router.get('/dos/teaching-staff', requireRole(DOS_ACADEMIC_ADMIN), async (req, res) => {
  try {
    await ensureAcademicTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School not found in session.' });

    const [rows] = await promisePool.query(
      `SELECT u.id, u.first_name, u.last_name, u.email, UPPER(r.role_code) AS role_code
       FROM users u
       INNER JOIN roles r ON r.id = u.role_id
       WHERE u.school_id = ? AND u.deleted_at IS NULL
         AND UPPER(r.role_code) IN ('TEACHER','HOD','DOS')
       ORDER BY u.last_name ASC, u.first_name ASC`,
      [schoolId]
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /dos/teaching-staff:', err);
    return res.status(500).json({ success: false, message: 'Failed to list teaching staff' });
  }
});

async function assertTeachingStaffForSchool(schoolId, staffUserId) {
  const [rows] = await promisePool.query(
    `SELECT u.id FROM users u
     INNER JOIN roles r ON r.id = u.role_id
     WHERE u.id = ? AND u.school_id = ? AND u.deleted_at IS NULL
       AND UPPER(r.role_code) IN ('TEACHER','HOD','DOS')`,
    [staffUserId, schoolId]
  );
  return rows.length > 0;
}

// ════════════════════════════════════════════════════════════════
// GET /api/dos/timetable — list timetable with optional filters
//   ?class_name=&staff_id=&subject_name=&day_of_week=&q=
// ════════════════════════════════════════════════════════════════
router.get('/dos/timetable', requireRole(DOS_ACADEMIC_ADMIN), async (req, res) => {
  try {
    await ensureAcademicTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School not found in session.' });

    const className = normalizeGradebookLabel(req.query?.class_name);
    const subjectName = normalizeGradebookLabel(req.query?.subject_name);
    const dayOfWeek = trimStr(req.query?.day_of_week);
    const term = trimStr(req.query?.term);
    const academicYear = trimStr(req.query?.academic_year);
    const q = trimStr(req.query?.q).toLowerCase();
    const staffIdRaw = req.query?.staff_id;
    const staffId = staffIdRaw != null && String(staffIdRaw).trim() !== '' ? Number(staffIdRaw) : null;

    let sql = `
      SELECT
        tt.id,
        tt.class_name,
        tt.subject_name,
        tt.staff_id,
        tt.day_of_week,
        tt.start_time,
        tt.end_time,
        tt.room,
        tt.term,
        tt.academic_year,
        CONCAT(tt.start_time, ' - ', tt.end_time) AS time,
        TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))) AS teacher_name
      FROM academic_timetables tt
      LEFT JOIN users u ON u.id = tt.staff_id
      WHERE tt.school_id = ?`;
    const params = [schoolId];

    if (className) {
      sql += ` AND (${sqlNormLabelEquals('tt.class_name')})`;
      params.push(className);
    }
    if (subjectName) {
      sql += ` AND (${sqlNormLabelEquals('tt.subject_name')})`;
      params.push(subjectName);
    }
    if (dayOfWeek) {
      sql += ` AND tt.day_of_week = ?`;
      params.push(dayOfWeek);
    }
    if (term) {
      sql += ` AND TRIM(COALESCE(tt.term, '')) = ?`;
      params.push(term);
    }
    if (academicYear) {
      sql += ` AND TRIM(COALESCE(tt.academic_year, '')) = ?`;
      params.push(academicYear);
    }
    if (staffId != null && !Number.isNaN(staffId)) {
      sql += ` AND tt.staff_id = ?`;
      params.push(staffId);
    }
    if (q) {
      sql += ` AND (
        LOWER(COALESCE(tt.class_name, '')) LIKE ?
        OR LOWER(COALESCE(tt.subject_name, '')) LIKE ?
        OR LOWER(COALESCE(tt.room, '')) LIKE ?
        OR LOWER(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')))) LIKE ?
      )`;
      const like = `%${q}%`;
      params.push(like, like, like, like);
    }

    sql += ' ORDER BY FIELD(tt.day_of_week, "Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"), tt.start_time ASC, tt.id ASC';

    const [rows] = await promisePool.query(sql, params);
    return res.json({ success: true, data: rows || [] });
  } catch (err) {
    console.error('GET /dos/timetable:', err);
    return res.status(500).json({ success: false, message: 'Failed to load timetable' });
  }
});

// ════════════════════════════════════════════════════════════════
// POST /api/dos/subjects — add a subject (“course”) for the school catalogue
// ════════════════════════════════════════════════════════════════
router.post('/dos/subjects', requireRole(DOS_ACADEMIC_ADMIN), async (req, res) => {
  try {
    await ensureAcademicTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School not found in session.' });

    const name = normalizeGradebookLabel(req.body?.name);
    const category = trimStr(req.body?.category) || null;
    const subject_code = trimStr(req.body?.subject_code) || null;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Subject name is required.' });
    }

    const [r] = await promisePool.query(
      `INSERT INTO school_subjects (school_id, name, category, subject_code, is_active)
       VALUES (?,?,?,?,1)`,
      [schoolId, name, category, subject_code]
    );
    return res.status(201).json({
      success: true,
      message: 'Subject added.',
      data: { id: r.insertId, name, category, subject_code, is_active: 1 },
    });
  } catch (err) {
    if (err && err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'A subject with this name already exists for your school.' });
    }
    console.error('POST /dos/subjects:', err);
    return res.status(500).json({ success: false, message: 'Failed to add subject' });
  }
});

// ════════════════════════════════════════════════════════════════
// PATCH /api/dos/subjects/:id — deactivate or reactivate a catalogue subject
// ════════════════════════════════════════════════════════════════
router.patch('/dos/subjects/:id', requireRole(DOS_ACADEMIC_ADMIN), async (req, res) => {
  try {
    await ensureAcademicTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School not found in session.' });
    const id = Number(req.params.id);
    if (!id || Number.isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid id.' });
    const isActive = req.body?.is_active === false || req.body?.is_active === 0 ? 0 : 1;

    const [upd] = await promisePool.query(
      'UPDATE school_subjects SET is_active = ? WHERE id = ? AND school_id = ?',
      [isActive, id, schoolId]
    );
    if (!upd.affectedRows) {
      return res.status(404).json({ success: false, message: 'Subject not found.' });
    }
    return res.json({ success: true, message: 'Subject updated.' });
  } catch (err) {
    console.error('PATCH /dos/subjects/:id:', err);
    return res.status(500).json({ success: false, message: 'Failed to update subject' });
  }
});

// ════════════════════════════════════════════════════════════════
// POST /api/dos/timetable — add a period (assigns class + subject to a teacher)
// ════════════════════════════════════════════════════════════════
router.post('/dos/timetable', requireRole(DOS_ACADEMIC_ADMIN), async (req, res) => {
  try {
    await ensureAcademicTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School not found in session.' });

    const class_name = normalizeGradebookLabel(req.body?.class_name);
    const subject_name = normalizeGradebookLabel(req.body?.subject_name);
    const staff_id = Number(req.body?.staff_id);
    const day_of_week = trimStr(req.body?.day_of_week);
    const start_time = trimStr(req.body?.start_time);
    const end_time = trimStr(req.body?.end_time);
    const room = trimStr(req.body?.room) || null;
    let term = trimStr(req.body?.term);
    let academic_year = trimStr(req.body?.academic_year);
    if (!term || !academic_year) {
      const defaults = await getAcademicCalendarSettings(schoolId);
      if (!academic_year) academic_year = defaults.current_academic_year;
      if (!term) term = defaults.active_terms?.[0] || 'Term 1';
    }

    if (!class_name || !subject_name) {
      return res.status(400).json({ success: false, message: 'class_name and subject_name are required.' });
    }
    if (!staff_id || Number.isNaN(staff_id)) {
      return res.status(400).json({ success: false, message: 'staff_id (teacher user id) is required.' });
    }
    if (!day_of_week || !start_time || !end_time) {
      return res.status(400).json({ success: false, message: 'day_of_week, start_time, and end_time are required.' });
    }
    if (!term || !academic_year) {
      return res.status(400).json({ success: false, message: 'term and academic_year are required.' });
    }

    const okStaff = await assertTeachingStaffForSchool(schoolId, staff_id);
    if (!okStaff) {
      return res.status(400).json({ success: false, message: 'Selected user is not a teaching role at this school.' });
    }

    const [ins] = await promisePool.query(
      `INSERT INTO academic_timetables
        (school_id, class_name, subject_name, staff_id, day_of_week, start_time, end_time, room, term, academic_year)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [schoolId, class_name, subject_name, staff_id, day_of_week, start_time, end_time, room, term, academic_year]
    );
    return res.status(201).json({
      success: true,
      message: 'Timetable period added.',
      data: { id: ins.insertId },
    });
  } catch (err) {
    console.error('POST /dos/timetable:', err);
    return res.status(500).json({ success: false, message: 'Failed to add timetable period' });
  }
});

// ════════════════════════════════════════════════════════════════
// PUT /api/dos/timetable/:id — update a period
// ════════════════════════════════════════════════════════════════
router.put('/dos/timetable/:id', requireRole(DOS_ACADEMIC_ADMIN), async (req, res) => {
  try {
    await ensureAcademicTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School not found in session.' });
    const id = Number(req.params.id);
    if (!id || Number.isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid id.' });

    const [[existing]] = await promisePool.query(
      'SELECT id FROM academic_timetables WHERE id = ? AND school_id = ? LIMIT 1',
      [id, schoolId]
    );
    if (!existing) return res.status(404).json({ success: false, message: 'Period not found.' });

    const class_name = req.body?.class_name != null ? normalizeGradebookLabel(req.body.class_name) : null;
    const subject_name = req.body?.subject_name != null ? normalizeGradebookLabel(req.body.subject_name) : null;
    const staff_id = req.body?.staff_id != null ? Number(req.body.staff_id) : null;
    const day_of_week = req.body?.day_of_week != null ? trimStr(req.body.day_of_week) : null;
    const start_time = req.body?.start_time != null ? trimStr(req.body.start_time) : null;
    const end_time = req.body?.end_time != null ? trimStr(req.body.end_time) : null;
    const room = req.body?.room !== undefined ? (trimStr(req.body.room) || null) : undefined;
    const term = req.body?.term !== undefined ? trimStr(req.body.term) || null : undefined;
    const academic_year = req.body?.academic_year !== undefined ? trimStr(req.body.academic_year) || null : undefined;

    if (staff_id != null && !Number.isNaN(staff_id)) {
      const okStaff = await assertTeachingStaffForSchool(schoolId, staff_id);
      if (!okStaff) {
        return res.status(400).json({ success: false, message: 'Selected user is not a teaching role at this school.' });
      }
    }

    const fields = [];
    const vals = [];
    if (class_name) {
      fields.push('class_name = ?');
      vals.push(class_name);
    }
    if (subject_name) {
      fields.push('subject_name = ?');
      vals.push(subject_name);
    }
    if (staff_id != null && !Number.isNaN(staff_id)) {
      fields.push('staff_id = ?');
      vals.push(staff_id);
    }
    if (day_of_week) {
      fields.push('day_of_week = ?');
      vals.push(day_of_week);
    }
    if (start_time) {
      fields.push('start_time = ?');
      vals.push(start_time);
    }
    if (end_time) {
      fields.push('end_time = ?');
      vals.push(end_time);
    }
    if (room !== undefined) {
      fields.push('room = ?');
      vals.push(room);
    }
    if (term !== undefined) {
      fields.push('term = ?');
      vals.push(term);
    }
    if (academic_year !== undefined) {
      fields.push('academic_year = ?');
      vals.push(academic_year);
    }

    if (!fields.length) {
      return res.status(400).json({ success: false, message: 'No fields to update.' });
    }

    vals.push(id, schoolId);
    await promisePool.query(
      `UPDATE academic_timetables SET ${fields.join(', ')} WHERE id = ? AND school_id = ?`,
      vals
    );
    return res.json({ success: true, message: 'Timetable period updated.' });
  } catch (err) {
    console.error('PUT /dos/timetable/:id:', err);
    return res.status(500).json({ success: false, message: 'Failed to update timetable period' });
  }
});

// ════════════════════════════════════════════════════════════════
// DELETE /api/dos/timetable/:id
// ════════════════════════════════════════════════════════════════
router.delete('/dos/timetable/:id', requireRole(DOS_ACADEMIC_ADMIN), async (req, res) => {
  try {
    await ensureAcademicTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School not found in session.' });
    const id = Number(req.params.id);
    if (!id || Number.isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid id.' });

    const [del] = await promisePool.query(
      'DELETE FROM academic_timetables WHERE id = ? AND school_id = ?',
      [id, schoolId]
    );
    if (!del.affectedRows) {
      return res.status(404).json({ success: false, message: 'Period not found.' });
    }
    return res.json({ success: true, message: 'Timetable period removed.' });
  } catch (err) {
    console.error('DELETE /dos/timetable/:id:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete timetable period' });
  }
});

// ════════════════════════════════════════════════════════════════
// CALENDAR PERIODS (Break, Lunch, Free Hour, Teaching slots)
// ════════════════════════════════════════════════════════════════
router.get('/dos/calendar/periods', requireRole(DOS_ACADEMIC_ADMIN), async (req, res) => {
  try {
    await ensureDosTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School not found in session.' });
    const [rows] = await promisePool.query(
      `SELECT id, school_id, period_name, start_time, end_time, is_break, sort_order
       FROM school_periods
       WHERE school_id = ?
       ORDER BY sort_order ASC, start_time ASC, id ASC`,
      [schoolId]
    );
    return res.json({ success: true, data: rows || [] });
  } catch (err) {
    console.error('GET /dos/calendar/periods:', err);
    return res.status(500).json({ success: false, message: 'Failed to load periods' });
  }
});

router.post('/dos/calendar/periods', requireRole(DOS_ACADEMIC_ADMIN), async (req, res) => {
  try {
    await ensureDosTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School not found in session.' });
    const period_name = trimStr(req.body?.period_name);
    const start_time = trimStr(req.body?.start_time);
    const end_time = trimStr(req.body?.end_time);
    const is_break = req.body?.is_break ? 1 : 0;
    const sort_order = Number(req.body?.sort_order) || 0;
    if (!period_name || !start_time || !end_time) {
      return res.status(400).json({ success: false, message: 'period_name, start_time and end_time are required.' });
    }
    const [ins] = await promisePool.query(
      `INSERT INTO school_periods (school_id, period_name, start_time, end_time, is_break, sort_order)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [schoolId, period_name, start_time, end_time, is_break, sort_order]
    );
    return res.status(201).json({ success: true, message: 'Period added.', data: { id: ins.insertId } });
  } catch (err) {
    console.error('POST /dos/calendar/periods:', err);
    return res.status(500).json({ success: false, message: 'Failed to add period' });
  }
});

router.delete('/dos/calendar/periods/:id', requireRole(DOS_ACADEMIC_ADMIN), async (req, res) => {
  try {
    await ensureDosTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School not found in session.' });
    const id = Number(req.params.id);
    if (!id || Number.isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid id.' });
    const [del] = await promisePool.query(
      `DELETE FROM school_periods WHERE id = ? AND school_id = ?`,
      [id, schoolId]
    );
    if (!del.affectedRows) return res.status(404).json({ success: false, message: 'Period not found.' });
    return res.json({ success: true, message: 'Period removed.' });
  } catch (err) {
    console.error('DELETE /dos/calendar/periods/:id:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete period' });
  }
});

module.exports = router;

