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
/** Gate logs filters — discipline portal roles need read access too. */
const DOS_ACADEMIC_CALENDAR_GET = [
  'DOS',
  'SCHOOL_ADMIN',
  'SCHOOL_MANAGER',
  'HOD',
  'DISCIPLINE',
  'DISCIPLINE_STAFF',
  'TEACHER',
];

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
      term_dates_json JSON NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      updated_by_user_id INT UNSIGNED NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await promisePool.query(
    'ALTER TABLE school_academic_settings ADD COLUMN term_dates_json JSON NULL'
  ).catch(() => {});

  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS school_teacher_period_settings (
      school_id INT UNSIGNED NOT NULL PRIMARY KEY,
      academic_year VARCHAR(32) NOT NULL,
      term VARCHAR(32) NOT NULL,
      late_threshold_minutes INT UNSIGNED NOT NULL DEFAULT 10,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      updated_by_user_id INT UNSIGNED NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await promisePool.query('ALTER TABLE users ADD COLUMN rfid_uid VARCHAR(64) NULL').catch(() => {});
  await promisePool.query('ALTER TABLE users ADD COLUMN fingerprint_id VARCHAR(128) NULL').catch(() => {});

  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS teacher_period_attendance (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      teacher_id INT UNSIGNED NOT NULL,
      class_name VARCHAR(120) NOT NULL,
      subject_name VARCHAR(255) NOT NULL,
      day_of_week ENUM('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday') NOT NULL,
      period_date DATE NOT NULL,
      start_time VARCHAR(10) NOT NULL,
      end_time VARCHAR(10) NOT NULL,
      entry_time DATETIME NULL,
      exit_time DATETIME NULL,
      status ENUM('ON_TIME','LATE','BEFORE') NULL,
      exit_status ENUM('ON_TIME','BEFORE') NULL,
      late_minutes INT UNSIGNED NOT NULL DEFAULT 0,
      scan_source VARCHAR(64) NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_teacher_period (school_id, teacher_id, period_date, class_name, subject_name, start_time, end_time),
      KEY idx_tpa_school_date (school_id, period_date),
      KEY idx_tpa_teacher_date (school_id, teacher_id, period_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await promisePool.query(
    "ALTER TABLE teacher_period_attendance MODIFY COLUMN status ENUM('ON_TIME','LATE','BEFORE') NULL"
  ).catch(() => {});
  await promisePool.query(
    "ALTER TABLE teacher_period_attendance ADD COLUMN exit_status ENUM('ON_TIME','BEFORE') NULL"
  ).catch(() => {});

  tablesReady = true;
}

function dayOfWeekName(d = new Date()) {
  return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d.getDay()];
}

function timeToMins(t) {
  const [hh, mm] = String(t || '00:00').slice(0, 5).split(':').map(Number);
  return (Number.isFinite(hh) ? hh : 0) * 60 + (Number.isFinite(mm) ? mm : 0);
}

function toDateSql(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

async function getTeacherPeriodSettings(schoolId) {
  const [[settings]] = await promisePool.query(
    `SELECT academic_year, term, late_threshold_minutes
     FROM school_teacher_period_settings
     WHERE school_id = ?
     LIMIT 1`,
    [schoolId]
  );
  if (settings) return settings;

  const calendar = await getAcademicCalendarSettings(schoolId);
  return {
    academic_year: calendar.current_academic_year || '2025-2026',
    term: Array.isArray(calendar.active_terms) && calendar.active_terms.length ? calendar.active_terms[0] : 'Term 1',
    late_threshold_minutes: 10,
  };
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
    `SELECT current_academic_year, active_terms_json, term_dates_json
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
    } catch (_) { /* keep defaults */ }
  }
  let termDates = [];
  if (row?.term_dates_json) {
    try {
      const parsed = Array.isArray(row.term_dates_json)
        ? row.term_dates_json
        : JSON.parse(row.term_dates_json);
      if (Array.isArray(parsed)) termDates = parsed;
    } catch (_) { /* keep empty */ }
  }
  return {
    current_academic_year: row?.current_academic_year || '2025-2026',
    active_terms: terms,
    term_dates: termDates,
  };
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
  const calendar = await getAcademicCalendarSettings(schoolId);
  const terms = Array.isArray(calendar?.active_terms) && calendar.active_terms.length
    ? calendar.active_terms
    : ['Term 1', 'Term 2', 'Term 3'];
  return {
    academicYear: explicitYear || trimStr(calendar?.current_academic_year) || inferAcademicYearFromDate(),
    term: explicitTerm || inferTermFromMonth(terms),
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

    // ─── Gate attendance trend (real RFID data, last 14 days) ────
    let termTrend = [];
    let gateToday = { students_in: 0, staff_in: 0 };
    try {
      const [gateTrendRows] = await promisePool.query(
        `SELECT
           DATE_FORMAT(attendance_date, '%b %d') AS label,
           COUNT(CASE WHEN person_type = 'STUDENT' AND morning_check_in IS NOT NULL THEN 1 END) AS value
         FROM school_gate_attendance_records
         WHERE school_id = ? AND attendance_date >= DATE_SUB(CURDATE(), INTERVAL 14 DAY)
         GROUP BY attendance_date
         ORDER BY attendance_date ASC`,
        [schoolId]
      );
      termTrend = gateTrendRows.map((r) => ({ label: r.label, value: Number(r.value) || 0 }));

      const [[gateRow]] = await promisePool.query(
        `SELECT
           COUNT(CASE WHEN person_type = 'STUDENT' AND morning_check_in IS NOT NULL THEN 1 END) AS students_in,
           COUNT(CASE WHEN person_type = 'STAFF'   AND morning_check_in IS NOT NULL THEN 1 END) AS staff_in
         FROM school_gate_attendance_records
         WHERE school_id = ? AND attendance_date = CURDATE()`,
        [schoolId]
      );
      if (gateRow) {
        gateToday = {
          students_in: Number(gateRow.students_in || 0),
          staff_in:    Number(gateRow.staff_in    || 0),
        };
      }
    } catch (gateErr) {
      console.warn('[dos/dashboard/stats] gate data skipped:', gateErr.message);
    }

    // ─── Student enrollment by section (real data) ───────────────
    let feeByClass = [];
    try {
      const [sectionRows] = await promisePool.query(
        `SELECT
           COALESCE(NULLIF(TRIM(class_name), ''), 'Unknown') AS label,
           COUNT(*) AS value
         FROM students
         WHERE school_id = ?
         GROUP BY COALESCE(NULLIF(TRIM(class_name), ''), 'Unknown')
         ORDER BY class_name`,
        [schoolId]
      );
      feeByClass = sectionRows.map((r) => ({ label: r.label, value: Number(r.value) || 0 }));
    } catch (secErr) {
      console.warn('[dos/dashboard/stats] section enrollment skipped:', secErr.message);
    }

    // ─── Academic marks distribution (real data when available) ──
    let acExceptional = Math.floor(totalStudents * 0.45);
    let acExpected    = Math.floor(totalStudents * 0.40);
    let acReview      = Math.max(0, totalStudents - acExceptional - acExpected);
    let academicHasRealData = false;
    try {
      const [[marksRow]] = await promisePool.query(
        `SELECT
           SUM(CASE WHEN a.max_score > 0 AND (m.score_obtained / a.max_score) >= 0.75 THEN 1 ELSE 0 END) AS exceptional,
           SUM(CASE WHEN a.max_score > 0 AND (m.score_obtained / a.max_score) >= 0.50 AND (m.score_obtained / a.max_score) < 0.75 THEN 1 ELSE 0 END) AS expected,
           SUM(CASE WHEN a.max_score > 0 AND (m.score_obtained / a.max_score) < 0.50 THEN 1 ELSE 0 END) AS needs_review
         FROM academic_marks m
         JOIN academic_assessments a ON m.assessment_id = a.id
         WHERE m.school_id = ? AND a.max_score > 0`,
        [schoolId]
      );
      const total = Number(marksRow?.exceptional || 0) + Number(marksRow?.expected || 0) + Number(marksRow?.needs_review || 0);
      if (total > 0) {
        acExceptional = Number(marksRow.exceptional || 0);
        acExpected    = Number(marksRow.expected    || 0);
        acReview      = Number(marksRow.needs_review || 0);
        academicHasRealData = true;
      }
    } catch (marksErr) {
      console.warn('[dos/dashboard/stats] marks distribution skipped:', marksErr.message);
    }

    // ─── Build sparklines from real gate data ─────────────────────
    const sparklineFromGate = termTrend.length >= 2
      ? termTrend.slice(-7).map((r) => ({ value: r.value }))
      : [{ value: 0 }, { value: 0 }, { value: 0 }, { value: 0 }, { value: 0 }, { value: gateToday.students_in || 0 }];

    const baseCount = presentCount > 0 ? presentCount : totalStudents;
    const activeBoys  = Math.floor(baseCount * 0.48);
    const activeGirls = baseCount - activeBoys;

    const attendanceOverview = {
      present:  presentCount || 0,
      absent:   absentCount  || 0,
      boys:  { count: activeBoys,  percentage: baseCount > 0 ? Math.round((activeBoys  / baseCount) * 100) : 0 },
      girls: { count: activeGirls, percentage: baseCount > 0 ? Math.round((activeGirls / baseCount) * 100) : 0 },
      sparkline: sparklineFromGate,
      gateToday,
    };

    const academicOverview = {
      exceptional:    acExceptional,
      expected:       acExpected,
      needsReview:    acReview,
      hasRealData:    academicHasRealData,
      boys:  { count: (totalStudents * 0.45).toFixed(1), percentage: 48 },
      girls: { count: (totalStudents * 0.55).toFixed(1), percentage: 52 },
      sparkline: [{ value: 65 }, { value: 68 }, { value: 67 }, { value: 70 }, { value: 69 }, { value: Number(institutionalGPA) || 71 }],
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
        termTrend,
        feeByClass,
        activityLog: [
          { id: 'LOG-1', type: 'Academic',   detail: 'Marks and attendance sync with your school records', time: 'recent', status: 'approved' },
          { id: 'LOG-2', type: 'Attendance', detail: 'Daily gate attendance tracked via RFID check-in',     time: 'recent', status: 'pending'  },
        ],
      },
    });
  } catch (err) {
    console.error('[GET /dos/dashboard/stats]', err);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard stats' });
  }
});

// ════════════════════════════════════════════════════════════════
// GET /api/dos/class-enrollment — student count per class/section
// ════════════════════════════════════════════════════════════════
router.get('/dos/class-enrollment', requireRole(DOS_DASHBOARD_ROLES), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'No active school context' });
    const [rows] = await promisePool.query(
      `SELECT
         COALESCE(NULLIF(TRIM(class_name), ''), 'Unknown') AS class_name,
         COUNT(*) AS student_count
       FROM students
       WHERE school_id = ?
       GROUP BY COALESCE(NULLIF(TRIM(class_name), ''), 'Unknown')
       ORDER BY class_name ASC`,
      [schoolId]
    );
    const total = rows.reduce((s, r) => s + Number(r.student_count || 0), 0);
    return res.json({
      success: true,
      data: {
        rows: rows.map((r) => ({ class_name: r.class_name, student_count: Number(r.student_count || 0) })),
        total,
      },
    });
  } catch (err) {
    console.error('GET /dos/class-enrollment:', err);
    return res.status(500).json({ success: false, message: 'Failed to load class enrollment' });
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
router.get('/dos/academic-calendar-settings', requireRole(DOS_ACADEMIC_CALENDAR_GET), async (req, res) => {
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
    const userId   = resolveUserId(req);
    if (!schoolId || !userId) return res.status(400).json({ success: false, message: 'Invalid session.' });

    const year     = trimStr(req.body?.current_academic_year);
    const termsRaw = Array.isArray(req.body?.active_terms) ? req.body.active_terms : [];
    const terms    = termsRaw.map((x) => trimStr(x)).filter(Boolean);

    if (!/^\d{4}-\d{4}$/.test(year)) {
      return res.status(400).json({ success: false, message: 'current_academic_year must be like 2025-2026.' });
    }
    if (!terms.length) {
      return res.status(400).json({ success: false, message: 'At least one term is required.' });
    }

    // Validate & sanitise term_dates array: [{ name, start, end }]
    const termDatesRaw = Array.isArray(req.body?.term_dates) ? req.body.term_dates : [];
    const termDates = termDatesRaw
      .filter((d) => d && d.name && d.start && d.end)
      .map((d) => ({
        name:  String(d.name).trim(),
        start: String(d.start).trim(),
        end:   String(d.end).trim(),
      }));

    await promisePool.query(
      `INSERT INTO school_academic_settings
         (school_id, current_academic_year, active_terms_json, term_dates_json, updated_by_user_id)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         current_academic_year = VALUES(current_academic_year),
         active_terms_json     = VALUES(active_terms_json),
         term_dates_json       = VALUES(term_dates_json),
         updated_by_user_id    = VALUES(updated_by_user_id)`,
      [schoolId, year, JSON.stringify(terms), JSON.stringify(termDates), userId]
    );
    return res.json({ success: true, data: { current_academic_year: year, active_terms: terms, term_dates: termDates } });
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

    const academicYearQ = trimStr(req.query.academic_year || req.query.year || '');
    const termQ = trimStr(req.query.term || '');
    const className = trimStr(req.query.class_name || req.query.class || '');
    const { academicYear, term } = await resolveAcademicContext(schoolId, academicYearQ, termQ);

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
    const { academicYear, term } = await resolveAcademicContext(
      schoolId,
      body.academic_year || body.year || '',
      body.term || ''
    );
    const className = trimStr(body.class_name || '');
    const statusCodeRaw = trimStr(body.status_code).toLowerCase();
    const statusLabel = trimStr(body.status_label || '');
    const marksObtained = Number(body.marks_obtained);
    const notes = trimStr(body.notes) || null;

    if (!studentId || Number.isNaN(studentId)) return res.status(400).json({ success: false, message: 'student_id is required.' });
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

    const academicYearQ = trimStr(req.query.academic_year || req.query.year || '');
    const termQ = trimStr(req.query.term || '');
    const className = trimStr(req.query.class_name || req.query.class || '');
    const { academicYear, term } = await resolveAcademicContext(schoolId, academicYearQ, termQ);

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

    const academicYearQ = trimStr(req.query.academic_year || req.query.year || '');
    const termQ = trimStr(req.query.term || '');
    const className = trimStr(req.query.class_name || req.query.class || '');
    const { academicYear, term } = await resolveAcademicContext(schoolId, academicYearQ, termQ);

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

    const academicYearQ = trimStr(req.query.academic_year || req.query.year || '');
    const termQ = trimStr(req.query.term || '');
    const className = trimStr(req.query.class_name || req.query.class || '');
    const { academicYear, term } = await resolveAcademicContext(schoolId, academicYearQ, termQ);

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

// ════════════════════════════════════════════════════════════════
// TEACHER PERIOD ATTENDANCE (RFID / CARD TAP)
// ════════════════════════════════════════════════════════════════
router.get('/dos/teacher-period/settings', requireRole(DOS_DASHBOARD_ROLES), async (req, res) => {
  try {
    await ensureDosTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'Invalid session' });
    const settings = await getTeacherPeriodSettings(schoolId);
    return res.json({ success: true, data: settings });
  } catch (err) {
    console.error('GET /dos/teacher-period/settings:', err);
    return res.status(500).json({ success: false, message: 'Failed to load teacher period settings' });
  }
});

router.put('/dos/teacher-period/settings', requireRole(DOS_ACADEMIC_ADMIN), async (req, res) => {
  try {
    await ensureDosTables();
    const schoolId = resolveSchoolId(req);
    const userId = resolveUserId(req);
    if (!schoolId || !userId) return res.status(400).json({ success: false, message: 'Invalid session' });

    const { academicYear, term } = await resolveAcademicContext(
      schoolId,
      req.body?.academic_year || req.body?.year || '',
      req.body?.term || ''
    );
    const lateThreshold = Number(req.body?.late_threshold_minutes);
    if (Number.isNaN(lateThreshold) || lateThreshold < 0 || lateThreshold > 120) {
      return res.status(400).json({ success: false, message: 'late_threshold_minutes must be between 0 and 120' });
    }

    await promisePool.query(
      `INSERT INTO school_teacher_period_settings (school_id, academic_year, term, late_threshold_minutes, updated_by_user_id)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         academic_year = VALUES(academic_year),
         term = VALUES(term),
         late_threshold_minutes = VALUES(late_threshold_minutes),
         updated_by_user_id = VALUES(updated_by_user_id)`,
      [schoolId, academicYear, term, lateThreshold, userId]
    );

    return res.json({ success: true, message: 'Teacher period settings saved' });
  } catch (err) {
    console.error('PUT /dos/teacher-period/settings:', err);
    return res.status(500).json({ success: false, message: 'Failed to save teacher period settings' });
  }
});

router.get('/dos/teacher-period/teachers', requireRole(DOS_DASHBOARD_ROLES), async (req, res) => {
  try {
    await ensureDosTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'Invalid session' });

    const [rows] = await promisePool.query(
      `SELECT
         u.id AS teacher_id,
         st.id AS staff_row_id,
         TRIM(CONCAT(COALESCE(u.first_name,''), ' ', COALESCE(u.last_name,''))) AS teacher_name,
         st.staff_id AS teacher_uid,
         u.rfid_uid AS card_uid,
         r.role_code
       FROM staff st
       INNER JOIN users u ON u.id = st.user_id
       INNER JOIN roles r ON r.id = u.role_id
       WHERE st.school_id = ?
         AND u.deleted_at IS NULL
         AND u.is_active = 1
         AND r.role_code IN ('TEACHER', 'HOD', 'DOS')
       ORDER BY teacher_name ASC`,
      [schoolId]
    );

    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /dos/teacher-period/teachers:', err);
    return res.status(500).json({ success: false, message: 'Failed to load teachers' });
  }
});

router.get('/dos/teacher-period/timetable', requireRole(DOS_DASHBOARD_ROLES), async (req, res) => {
  try {
    await ensureDosTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'Invalid session' });
    const settings = await getTeacherPeriodSettings(schoolId);
    const day = trimStr(req.query.day) || dayOfWeekName();

    const [rows] = await promisePool.query(
      `SELECT
         tt.id,
         tt.class_name,
         tt.subject_name,
         tt.staff_id AS teacher_id,
         tt.day_of_week,
         tt.start_time,
         tt.end_time,
         TRIM(CONCAT(COALESCE(u.first_name,''), ' ', COALESCE(u.last_name,''))) AS teacher_name
       FROM academic_timetables tt
       INNER JOIN users u ON u.id = tt.staff_id
       WHERE tt.school_id = ?
         AND tt.day_of_week = ?
       ORDER BY tt.start_time ASC, tt.class_name ASC`,
      [schoolId, day]
    );

    return res.json({ success: true, data: rows, meta: { day, ...settings } });
  } catch (err) {
    console.error('GET /dos/teacher-period/timetable:', err);
    return res.status(500).json({ success: false, message: 'Failed to load timetable' });
  }
});

router.get('/dos/teacher-period/logs', requireRole(DOS_DASHBOARD_ROLES), async (req, res) => {
  try {
    await ensureDosTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'Invalid session' });
    const date = trimStr(req.query.date);
    const teacherId = Number(req.query.teacher_id || 0);
    const status = trimStr(req.query.status).toUpperCase();
    const className = trimStr(req.query.class_name);
    const where = ['tpa.school_id = ?'];
    const params = [schoolId];
    if (date) {
      where.push('tpa.period_date = ?');
      params.push(date);
    }
    if (teacherId && !Number.isNaN(teacherId)) {
      where.push('tpa.teacher_id = ?');
      params.push(teacherId);
    }
    if (status && ['ON_TIME', 'LATE', 'BEFORE'].includes(status)) {
      if (status === 'BEFORE') {
        where.push("tpa.exit_status = 'BEFORE'");
      } else {
        where.push('tpa.status = ?');
        params.push(status);
      }
    }
    if (className) {
      where.push('LOWER(TRIM(tpa.class_name)) = LOWER(TRIM(?))');
      params.push(className);
    }

    const [rows] = await promisePool.query(
      `SELECT
         tpa.id,
         tpa.teacher_id,
         tpa.class_name,
         tpa.subject_name,
         tpa.day_of_week,
         tpa.period_date,
         tpa.start_time,
         tpa.end_time,
         TIME_FORMAT(tpa.entry_time, '%H:%i') AS entry_time,
         TIME_FORMAT(tpa.exit_time, '%H:%i') AS exit_time,
         tpa.status,
         tpa.exit_status,
         tpa.scan_source,
         tpa.late_minutes,
         TRIM(CONCAT(COALESCE(u.first_name,''), ' ', COALESCE(u.last_name,''))) AS teacher_name
       FROM teacher_period_attendance tpa
       INNER JOIN users u ON u.id = tpa.teacher_id AND u.school_id = tpa.school_id
       WHERE ${where.join(' AND ')}
       ORDER BY tpa.period_date DESC, tpa.start_time ASC, teacher_name ASC`,
      params
    );

    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /dos/teacher-period/logs:', err);
    return res.status(500).json({ success: false, message: 'Failed to load logs' });
  }
});

router.delete('/dos/teacher-period/logs/:id', requireRole(DOS_ACADEMIC_ADMIN), async (req, res) => {
  try {
    await ensureDosTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'Invalid session' });
    const id = Number(req.params.id);
    if (!id || Number.isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid log id' });
    const [del] = await promisePool.query(
      'DELETE FROM teacher_period_attendance WHERE id = ? AND school_id = ?',
      [id, schoolId]
    );
    if (!del.affectedRows) return res.status(404).json({ success: false, message: 'Attendance log not found' });
    return res.json({ success: true, message: 'Attendance log deleted' });
  } catch (err) {
    console.error('DELETE /dos/teacher-period/logs/:id:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete attendance log' });
  }
});

router.post('/dos/teacher-period/scan', async (req, res) => {
  try {
    await ensureDosTables();
    const { card_uid, cardUID, deviceID, device_id, timestamp } = req.body || {};
    const cardUid = trimStr(card_uid || cardUID);
    if (!cardUid) return res.status(400).json({ success: false, message: 'card_uid is required' });

    const now = timestamp ? new Date(timestamp) : new Date();
    const date = toDateSql(now);
    const day = dayOfWeekName(now);
    const nowHm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const [[teacher]] = await promisePool.query(
      `SELECT st.school_id, u.id AS teacher_id, st.id AS staff_row_id,
              TRIM(CONCAT(COALESCE(u.first_name,''), ' ', COALESCE(u.last_name,''))) AS teacher_name
       FROM staff st
       INNER JOIN users u ON u.id = st.user_id
       WHERE UPPER(TRIM(COALESCE(u.rfid_uid, ''))) = UPPER(TRIM(?))
       LIMIT 1`,
      [cardUid]
    );
    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Card not registered', code: 'UNKNOWN_CARD' });
    }

    const schoolId = teacher.school_id;
    const settings = await getTeacherPeriodSettings(schoolId);
    const lateThreshold = Number(settings.late_threshold_minutes || 10);

    const [slots] = await promisePool.query(
      `SELECT id, class_name, subject_name, day_of_week, start_time, end_time, staff_id
       FROM academic_timetables
       WHERE school_id = ?
         AND staff_id = ?
         AND day_of_week = ?
         AND term = ?
         AND academic_year = ?
       ORDER BY start_time ASC`,
      [schoolId, teacher.teacher_id, day, settings.term, settings.academic_year]
    );

    const currentSlot = (slots || []).find((s) => {
      const start = timeToMins(s.start_time);
      const end = timeToMins(s.end_time);
      const cur = timeToMins(nowHm);
      return cur >= start && cur <= end;
    });

    if (!currentSlot) {
      return res.status(200).json({
        success: false,
        code: 'NO_CLASS_ASSIGNED',
        message: 'No class assigned now',
        data: { teacher: teacher.teacher_name, card_uid: cardUid, day, time: nowHm, ...settings },
      });
    }

    const startHm = String(currentSlot.start_time).slice(0, 5);
    const endHm = String(currentSlot.end_time).slice(0, 5);
    const [[existing]] = await promisePool.query(
      `SELECT id, entry_time, exit_time, status, late_minutes
       FROM teacher_period_attendance
       WHERE school_id = ? AND teacher_id = ? AND period_date = ?
         AND class_name = ? AND subject_name = ? AND start_time = ? AND end_time = ?
       LIMIT 1`,
      [schoolId, teacher.teacher_id, date, currentSlot.class_name, currentSlot.subject_name, currentSlot.start_time, currentSlot.end_time]
    );

    const source = trimStr(device_id || deviceID) || 'RFID_DEVICE';
    if (!existing) {
      const lateMinutes = Math.max(0, timeToMins(nowHm) - timeToMins(startHm));
      const status = lateMinutes > lateThreshold ? 'LATE' : 'ON_TIME';
      const [ins] = await promisePool.query(
        `INSERT INTO teacher_period_attendance
         (school_id, teacher_id, class_name, subject_name, day_of_week, period_date, start_time, end_time, entry_time, status, late_minutes, scan_source)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [schoolId, teacher.teacher_id, currentSlot.class_name, currentSlot.subject_name, day, date, currentSlot.start_time, currentSlot.end_time, now, status, lateMinutes, source]
      );
      return res.json({
        success: true,
        action: 'entry',
        message: status === 'LATE' ? 'Late entry recorded' : 'Entry recorded',
        data: {
          id: ins.insertId,
          teacher_id: teacher.teacher_id,
          teacher_name: teacher.teacher_name,
          class_name: currentSlot.class_name,
          subject_name: currentSlot.subject_name,
          period: `${startHm}-${endHm}`,
          start_time: startHm,
          end_time: endHm,
          day_of_week: day,
          date,
          entry_time: nowHm,
          exit_time: null,
          status,
          late_minutes: lateMinutes,
          scan_source: source,
          late_threshold_minutes: lateThreshold,
          term: settings.term,
          academic_year: settings.academic_year,
        },
      });
    }

    if (!existing.exit_time) {
      const exitIsBefore = timeToMins(nowHm) < timeToMins(endHm);
      const exitStatus = exitIsBefore ? 'BEFORE' : 'ON_TIME';
      await promisePool.query(
        'UPDATE teacher_period_attendance SET exit_time = ?, exit_status = ?, scan_source = ? WHERE id = ?',
        [now, exitStatus, source, existing.id]
      );
      return res.json({
        success: true,
        action: 'exit',
        message: exitIsBefore ? 'Exit recorded before period ended' : 'Exit recorded',
        data: {
          id: existing.id,
          teacher_id: teacher.teacher_id,
          teacher_name: teacher.teacher_name,
          class_name: currentSlot.class_name,
          subject_name: currentSlot.subject_name,
          period: `${startHm}-${endHm}`,
          start_time: startHm,
          end_time: endHm,
          day_of_week: day,
          date,
          entry_time: existing.entry_time ? new Date(existing.entry_time).toISOString().slice(11, 16) : null,
          exit_time: nowHm,
          status: existing.status,
          exit_status: exitStatus,
          scan_source: source,
          late_minutes: Number(existing.late_minutes || 0),
          late_threshold_minutes: lateThreshold,
          term: settings.term,
          academic_year: settings.academic_year,
        },
      });
    }

    return res.json({
      success: true,
      action: 'duplicate',
      code: 'PERIOD_ATTENDANCE_COMPLETED',
      message: 'you doneee your all attendance for this period',
      data: {
        id: existing.id,
        teacher_id: teacher.teacher_id,
        teacher_name: teacher.teacher_name,
        class_name: currentSlot.class_name,
        subject_name: currentSlot.subject_name,
        period: `${startHm}-${endHm}`,
        start_time: startHm,
        end_time: endHm,
        day_of_week: day,
        date,
        status: existing.status,
        exit_status: existing.exit_status || null,
        scan_source: existing.scan_source || source,
        late_minutes: Number(existing.late_minutes || 0),
        late_threshold_minutes: lateThreshold,
        term: settings.term,
        academic_year: settings.academic_year,
      },
    });
  } catch (err) {
    console.error('POST /dos/teacher-period/scan:', err);
    return res.status(500).json({ success: false, message: 'Failed to process scan' });
  }
});

const DOS_ATTENDANCE_ROLES = ['DOS', 'SCHOOL_ADMIN', 'SCHOOL_MANAGER'];

// ════════════════════════════════════════════════════════════════
// GET /api/dos/attendance/term-progress
//   ?term=Term 1
// Returns working-day stats for the given term so the frontend
// can render a "X% of term elapsed / Y days attended" progress bar.
// Working days = Mon–Fri only (public holidays not excluded).
// ════════════════════════════════════════════════════════════════
function countWorkingDays(startStr, endStr) {
  const start = new Date(startStr);
  const end   = new Date(endStr);
  if (!startStr || !endStr || isNaN(start) || isNaN(end)) return 0;
  let count = 0;
  const cur = new Date(start);
  cur.setHours(0, 0, 0, 0);
  const fin = new Date(end);
  fin.setHours(0, 0, 0, 0);
  while (cur <= fin) {
    const d = cur.getDay(); // 0=Sun,6=Sat
    if (d !== 0 && d !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

router.get('/dos/attendance/term-progress', requireRole(DOS_ATTENDANCE_ROLES), async (req, res) => {
  try {
    await ensureAcademicTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(403).json({ success: false, message: 'No school context' });

    const termParam = trimStr(req.query.term);
    const calendar  = await getAcademicCalendarSettings(schoolId);
    const termDates = Array.isArray(calendar.term_dates) ? calendar.term_dates : [];

    // Find the requested term's date config
    const termCfg = termParam
      ? termDates.find((t) => t.name === termParam)
      : termDates[0] || null;

    if (!termCfg || !termCfg.start || !termCfg.end) {
      return res.json({
        success: true,
        data: {
          configured: false,
          term: termParam || (calendar.active_terms[0] || 'Term 1'),
          message: 'No term dates configured yet. Set them in Settings → Preferences.',
        },
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const termStart = new Date(termCfg.start);
    const termEnd   = new Date(termCfg.end);

    // Clamp today to [termStart, termEnd]
    const elapsedEnd = today < termStart ? termStart : today > termEnd ? termEnd : today;
    const totalWorkingDays   = countWorkingDays(termCfg.start, termCfg.end);
    const elapsedWorkingDays = countWorkingDays(termCfg.start, elapsedEnd.toISOString().slice(0, 10));

    // Count student morning attendance (On time + Late = "present") for the school in this date range
    const [stuRows] = await promisePool.query(
      `SELECT COUNT(DISTINCT a.attendance_date) AS present_days
       FROM attendance_student a
       WHERE a.school_id = ?
         AND a.attendance_date BETWEEN ? AND ?
         AND a.status_in IN ('On time', 'Late')`,
      [schoolId, termCfg.start, elapsedEnd.toISOString().slice(0, 10)]
    );
    const studentPresentDays = Number(stuRows[0]?.present_days || 0);

    // Count staff attendance
    const [staffRows] = await promisePool.query(
      `SELECT COUNT(DISTINCT a.attendance_date) AS present_days
       FROM attendance_teacher a
       WHERE a.school_id = ?
         AND a.attendance_date BETWEEN ? AND ?
         AND a.status_in IN ('Present', 'Late')`,
      [schoolId, termCfg.start, elapsedEnd.toISOString().slice(0, 10)]
    );
    const staffPresentDays = Number(staffRows[0]?.present_days || 0);

    const termProgressPct = elapsedWorkingDays > 0
      ? Math.round((elapsedWorkingDays / totalWorkingDays) * 100)
      : 0;

    const studentAttendancePct = elapsedWorkingDays > 0
      ? Math.round((studentPresentDays / elapsedWorkingDays) * 100)
      : 0;

    const staffAttendancePct = elapsedWorkingDays > 0
      ? Math.round((staffPresentDays / elapsedWorkingDays) * 100)
      : 0;

    return res.json({
      success: true,
      data: {
        configured:          true,
        term:                termCfg.name,
        start:               termCfg.start,
        end:                 termCfg.end,
        totalWorkingDays,
        elapsedWorkingDays,
        termProgressPct,
        student: {
          presentDays:    studentPresentDays,
          attendancePct:  studentAttendancePct,
        },
        staff: {
          presentDays:    staffPresentDays,
          attendancePct:  staffAttendancePct,
        },
      },
    });
  } catch (err) {
    console.error('[GET /dos/attendance/term-progress]', err);
    res.status(500).json({ success: false, message: 'Failed to load term progress' });
  }
});

// ════════════════════════════════════════════════════════════════
// GET /api/dos/reports/attendance/by-class
//   ?from=YYYY-MM-DD&to=YYYY-MM-DD&days=90
// Returns per-class attendance summary from lesson roll-call records.
// ════════════════════════════════════════════════════════════════

router.get('/dos/reports/attendance/by-class', requireRole(DOS_ATTENDANCE_ROLES), async (req, res) => {
  try {
    await ensureAcademicTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(403).json({ success: false, message: 'No active school context' });

    const from = trimStr(req.query.from) || new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0];
    const to   = trimStr(req.query.to)   || new Date().toISOString().split('T')[0];
    const days = Math.max(1, Number(req.query.days) || 90);

    const [rows] = await promisePool.query(
      `SELECT
         tt.class_name,
         COUNT(ar.id)                                                              AS total_marks,
         SUM(CASE WHEN LOWER(ar.status) IN ('present','late','permission') THEN 1 ELSE 0 END) AS present_count,
         SUM(CASE WHEN LOWER(ar.status) = 'absent'                         THEN 1 ELSE 0 END) AS absent_count
       FROM academic_attendance_logs  al
       JOIN academic_timetables       tt ON tt.id = al.timetable_id AND tt.school_id = al.school_id
       JOIN academic_attendance_records ar ON ar.log_id = al.id
       WHERE al.school_id = ? AND al.record_date BETWEEN ? AND ?
       GROUP BY tt.class_name
       ORDER BY tt.class_name ASC`,
      [schoolId, from, to]
    );

    let totalPresent = 0, totalAbsent = 0;
    const classes = rows.map((r) => {
      const total   = Number(r.total_marks)   || 0;
      const present = Number(r.present_count) || 0;
      const absent  = Number(r.absent_count)  || 0;
      const rate    = total > 0 ? Math.round((present / total) * 100) : 0;
      totalPresent += present;
      totalAbsent  += absent;
      return {
        id:           r.class_name,
        class:        r.class_name,
        headTeacher:  '—',
        absences:     absent,
        presenceRate: rate,
        trend:        rate >= 85 ? 'up' : 'down',
        status:       rate >= 95 ? 'Exceptional' : rate >= 80 ? 'Expected' : 'Needs Review',
      };
    });

    const globalTotal = totalPresent + totalAbsent;
    const globalPresence = globalTotal > 0 ? `${Math.round((totalPresent / globalTotal) * 100)}%` : '—';
    const chronicAbsentees = classes.filter((c) => c.presenceRate < 75).length;
    const top = classes.reduce((best, c) => (!best || c.presenceRate > best.presenceRate ? c : best), null);

    res.json({
      success: true,
      data: {
        stats: {
          globalPresence,
          chronicAbsentees: String(chronicAbsentees),
          mostPresentClass: top ? top.class : '—',
          termSync: 'Live',
          range: { from, to },
        },
        classes,
      },
    });
  } catch (err) {
    console.error('[GET /dos/reports/attendance/by-class]', err);
    res.status(500).json({ success: false, message: 'Failed to load class attendance report' });
  }
});

// ════════════════════════════════════════════════════════════════
// GET /api/dos/reports/attendance/by-teacher
//   ?from=YYYY-MM-DD&to=YYYY-MM-DD&days=90
// Returns per-teacher attendance summary inferred from lesson roll-call.
// ════════════════════════════════════════════════════════════════
router.get('/dos/reports/attendance/by-teacher', requireRole(DOS_ATTENDANCE_ROLES), async (req, res) => {
  try {
    await ensureAcademicTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(403).json({ success: false, message: 'No active school context' });

    const from = trimStr(req.query.from) || new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0];
    const to   = trimStr(req.query.to)   || new Date().toISOString().split('T')[0];

    const [rows] = await promisePool.query(
      `SELECT
         tt.staff_id,
         TRIM(CONCAT(COALESCE(u.first_name,''), ' ', COALESCE(u.last_name,''))) AS teacher_name,
         COALESCE(r.role_code, 'TEACHER')                                        AS department,
         COUNT(ar.id)                                                             AS total_marks,
         SUM(CASE WHEN LOWER(ar.status) IN ('present','late','permission') THEN 1 ELSE 0 END) AS present_count,
         SUM(CASE WHEN LOWER(ar.status) = 'absent'                         THEN 1 ELSE 0 END) AS absent_count
       FROM academic_attendance_logs  al
       JOIN academic_timetables       tt ON tt.id = al.timetable_id AND tt.school_id = al.school_id
       JOIN academic_attendance_records ar ON ar.log_id = al.id
       JOIN users                     u  ON u.id = tt.staff_id
       LEFT JOIN roles                r  ON r.id = u.role_id
       WHERE al.school_id = ? AND al.record_date BETWEEN ? AND ?
       GROUP BY tt.staff_id
       ORDER BY teacher_name ASC`,
      [schoolId, from, to]
    );

    let totalPresent = 0, totalAbsent = 0;
    const staff = rows.map((r) => {
      const total   = Number(r.total_marks)   || 0;
      const present = Number(r.present_count) || 0;
      const absent  = Number(r.absent_count)  || 0;
      const rate    = total > 0 ? Math.round((present / total) * 100) : 0;
      totalPresent += present;
      totalAbsent  += absent;
      return {
        id:           r.staff_id,
        name:         r.teacher_name,
        department:   r.department,
        absences:     absent,
        presenceRate: rate,
        trend:        rate >= 85 ? 'up' : 'down',
        status:       rate >= 95 ? 'Exceptional' : rate >= 80 ? 'Expected' : 'Needs Review',
      };
    });

    const globalTotal = totalPresent + totalAbsent;
    const globalPresence = globalTotal > 0 ? `${Math.round((totalPresent / globalTotal) * 100)}%` : '—';
    const chronicAbsentees = staff.filter((s) => s.presenceRate < 75).length;
    const top = staff.reduce((best, s) => (!best || s.presenceRate > best.presenceRate ? s : best), null);

    res.json({
      success: true,
      data: {
        stats: {
          globalPresence,
          chronicAbsentees: String(chronicAbsentees),
          mostPresentClass: top ? top.name : '—',
          termSync: 'Live',
          range: { from, to },
        },
        staff,
      },
    });
  } catch (err) {
    console.error('[GET /dos/reports/attendance/by-teacher]', err);
    res.status(500).json({ success: false, message: 'Failed to load staff attendance report' });
  }
});

// ════════════════════════════════════════════════════════════════
// GET  /api/dos/attendance/morning/students
//   ?date=YYYY-MM-DD&class_name=
// POST /api/dos/attendance/morning/students
//   { date, records: [{ student_id, status_in, notes? }] }
// ════════════════════════════════════════════════════════════════
router.get('/dos/attendance/morning/students', requireRole(DOS_ATTENDANCE_ROLES), async (req, res) => {
  try {
    await ensureAcademicTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(403).json({ success: false, message: 'No school context' });

    const date      = trimStr(req.query.date) || new Date().toISOString().split('T')[0];
    const className = trimStr(req.query.class_name);

    const [rows] = await promisePool.query(
      `SELECT s.id AS student_id, s.student_uid,
              CONCAT(s.first_name, ' ', s.last_name) AS name,
              s.gender, s.class_name,
              a.status_in, a.status_out, a.check_in, a.check_out, a.notes
       FROM students s
       LEFT JOIN attendance_student a
         ON a.school_id = s.school_id AND a.student_id = s.id AND a.attendance_date = ?
       WHERE s.school_id = ?
         ${className ? `AND (${sqlNormLabelEquals('s.class_name')})` : ''}
       ORDER BY s.class_name ASC, s.first_name ASC, s.last_name ASC`,
      className ? [date, schoolId, className] : [date, schoolId]
    );

    const [classes] = await promisePool.query(
      `SELECT DISTINCT class_name FROM students WHERE school_id = ? AND class_name IS NOT NULL AND class_name != '' ORDER BY class_name ASC`,
      [schoolId]
    );

    res.json({
      success: true,
      data: {
        date,
        students: rows,
        classes:  classes.map((c) => c.class_name),
        totals: {
          total:   rows.length,
          onTime:  rows.filter((r) => r.status_in === 'On time').length,
          late:    rows.filter((r) => r.status_in === 'Late').length,
          absent:  rows.filter((r) => !r.status_in || r.status_in === 'Absent').length,
        },
      },
    });
  } catch (err) {
    console.error('[GET /dos/attendance/morning/students]', err);
    res.status(500).json({ success: false, message: 'Failed to load student morning attendance' });
  }
});

router.post('/dos/attendance/morning/students', requireRole(DOS_ATTENDANCE_ROLES), async (req, res) => {
  try {
    await ensureAcademicTables();
    const schoolId = resolveSchoolId(req);
    const userId   = resolveUserId(req);
    if (!schoolId) return res.status(403).json({ success: false, message: 'No school context' });

    const { date, records } = req.body || {};
    if (!date || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ success: false, message: 'date and records[] are required' });
    }

    const now = new Date();
    for (const r of records) {
      const { student_id, status_in, notes } = r;
      if (!student_id || !status_in) continue;
      await promisePool.query(
        `INSERT INTO attendance_student (school_id, student_id, attendance_date, check_in, status_in, notes)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           status_in = VALUES(status_in),
           check_in  = VALUES(check_in),
           notes     = VALUES(notes)`,
        [schoolId, student_id, date, status_in === 'Absent' ? null : now, status_in, notes || null]
      );
    }

    res.json({ success: true, message: `Saved ${records.length} student attendance records` });
  } catch (err) {
    console.error('[POST /dos/attendance/morning/students]', err);
    res.status(500).json({ success: false, message: 'Failed to save student morning attendance' });
  }
});

// ════════════════════════════════════════════════════════════════
// GET  /api/dos/attendance/morning/staff
//   ?date=YYYY-MM-DD
// POST /api/dos/attendance/morning/staff
//   { date, records: [{ teacher_id, status_in, status_out?, remarks? }] }
// ════════════════════════════════════════════════════════════════
router.get('/dos/attendance/morning/staff', requireRole(DOS_ATTENDANCE_ROLES), async (req, res) => {
  try {
    await ensureAcademicTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(403).json({ success: false, message: 'No school context' });

    const date = trimStr(req.query.date) || new Date().toISOString().split('T')[0];

    const [rows] = await promisePool.query(
      `SELECT u.id AS teacher_id,
              TRIM(CONCAT(COALESCE(u.first_name,''), ' ', COALESCE(u.last_name,''))) AS name,
              COALESCE(ro.role_code, 'STAFF') AS role_code,
              COALESCE(ro.role_name, 'Staff') AS role_name,
              a.status_in, a.status_out, a.check_in, a.check_out, a.remarks
       FROM users u
       LEFT JOIN roles ro ON ro.id = u.role_id
       LEFT JOIN attendance_teacher a
         ON a.school_id = u.school_id AND a.teacher_id = u.id AND a.attendance_date = ?
       WHERE u.school_id = ? AND u.deleted_at IS NULL
         AND COALESCE(ro.role_code,'') IN ('TEACHER','DOS','HOD','SCHOOL_ADMIN','SCHOOL_MANAGER','ACCOUNTANT','DISCIPLINE','DISCIPLINE_STAFF')
       ORDER BY u.first_name ASC, u.last_name ASC`,
      [date, schoolId]
    );

    res.json({
      success: true,
      data: {
        date,
        staff: rows,
        totals: {
          total:       rows.length,
          present:     rows.filter((r) => r.status_in === 'Present').length,
          late:        rows.filter((r) => r.status_in === 'Late').length,
          absent:      rows.filter((r) => !r.status_in || r.status_in === 'Absent').length,
          excused:     rows.filter((r) => r.status_in === 'Excused').length,
          checkedOut:  rows.filter((r) => r.status_out === 'Checked out').length,
        },
      },
    });
  } catch (err) {
    console.error('[GET /dos/attendance/morning/staff]', err);
    res.status(500).json({ success: false, message: 'Failed to load staff attendance' });
  }
});

router.post('/dos/attendance/morning/staff', requireRole(DOS_ATTENDANCE_ROLES), async (req, res) => {
  try {
    await ensureAcademicTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(403).json({ success: false, message: 'No school context' });

    const { date, records } = req.body || {};
    if (!date || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ success: false, message: 'date and records[] are required' });
    }

    const now = new Date();
    for (const r of records) {
      const { teacher_id, status_in, status_out, remarks } = r;
      if (!teacher_id) continue;
      await promisePool.query(
        `INSERT INTO attendance_teacher
           (school_id, teacher_id, attendance_date, check_in, check_out, status_in, status_out, remarks)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           status_in  = VALUES(status_in),
           status_out = COALESCE(VALUES(status_out), status_out),
           check_in   = COALESCE(VALUES(check_in),  check_in),
           check_out  = COALESCE(VALUES(check_out), check_out),
           remarks    = COALESCE(VALUES(remarks),   remarks)`,
        [
          schoolId, teacher_id, date,
          (status_in && status_in !== 'Absent') ? now : null,
          (status_out === 'Checked out')         ? now : null,
          status_in  || 'Absent',
          status_out || 'Missing',
          remarks    || null,
        ]
      );
    }

    res.json({ success: true, message: `Saved ${records.length} staff attendance records` });
  } catch (err) {
    console.error('[POST /dos/attendance/morning/staff]', err);
    res.status(500).json({ success: false, message: 'Failed to save staff attendance' });
  }
});

module.exports = router;

