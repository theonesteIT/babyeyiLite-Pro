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
const { ensureStudentsTable } = require('./students');
const {
  normalizeGradebookLabel,
  sqlNormLabelEquals,
  sqlNormColumnsEqual,
  collectSchoolRegisteredClassNames,
  formatSchoolClassRow,
} = require('../utils/gradebookLabels');
const {
  ensureSchoolMarksAcademicTables,
  seedDefaultAssessmentTypesIfEmpty,
  syncAssessmentTypesToGradebookColumns,
  slugifyAssessmentName,
} = require('../utils/schoolMarksAcademicSchema');
const { ensureSchoolGradebookSchema, seedDefaultGradebookColumnsIfEmpty } = require('../utils/schoolGradebookSchema');
const {
  ensureCompetencyTables,
  listCompetencyCategories,
  RATING_LEVELS,
} = require('../utils/competencySchema');
const {
  getSchoolGradingScale,
  saveSchoolGradingScale,
  DEFAULT_GRADE_BANDS,
} = require('../utils/schoolGradingSchema');
const { runTimetableDemoSeed } = require('../utils/timetableDemoSeed');
const {
  ensureTeacherAssignmentsTable,
  fetchSchoolAcademicContext,
  createTeacherAssignment,
  updateTeacherAssignmentSafe,
  archiveTeacherAssignment,
  supersedeTeacherAssignment,
  removeOrArchiveAssignment,
  fetchAssignmentHistory,
  listTeacherAssignmentsForSchool,
  buildTeacherAssignmentsOverview,
  syncTeacherAssignmentsToTimetable,
  syncTeachingAssignmentsFromTimetable,
  isClassTeacherSubject,
} = require('../utils/teacherAssignmentsSchema');

/** Timetable assignment row used only to link homeroom teachers (teacher portal students list). */
const CLASS_TEACHER_SUBJECT = 'Class Teacher';
const {
  ensureStudentYearEnrollmentsTable,
  backfillSchoolEnrollments,
  inferNextAcademicYear,
  recordStudentPromotion,
  recordStudentRepeat,
  enrollmentYearFilter,
  enrollmentClassSelect,
} = require('./studentYearEnrollments');

const router = express.Router();
const DOS_ONLY = ['DOS'];
const DOS_DASHBOARD_ROLES = ['DOS', 'SCHOOL_ADMIN', 'SCHOOL_MANAGER', 'ACCOUNTANT', 'SCHOOL_REPRESENTATIVE'];
const REGISTRY_READ_ROLES = ['DOS', 'SCHOOL_ADMIN', 'SCHOOL_MANAGER', 'TEACHER', 'HOD', 'ACCOUNTANT'];
/** Timetables, subjects catalogue, teaching staff — school academic leads */
const DOS_ACADEMIC_ADMIN = ['DOS', 'SCHOOL_ADMIN', 'SCHOOL_MANAGER'];
/** Gate logs filters — discipline portal roles need read access too. */
/** Read-only school year/term settings — used by accountant dashboard, fees, payroll, etc. */
const DOS_ACADEMIC_CALENDAR_GET = [
  'DOS',
  'SCHOOL_ADMIN',
  'SCHOOL_MANAGER',
  'ACCOUNTANT',
  'STOREKEEPER',
  'STORE_MANAGER',
  'SCHOOL_REPRESENTATIVE',
  'HOD',
  'DISCIPLINE',
  'DISCIPLINE_STAFF',
  'TEACHER',
];

function resolveSchoolId(req) {
  return (
    req.query?.school_id ||
    req.body?.school_id ||
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

async function fetchTeacherAssignmentsForClass(schoolId, className, academicYear = null, term = null) {
  await ensureTeacherAssignmentsTable();
  const ctx = await fetchSchoolAcademicContext(schoolId);
  const year = academicYear || ctx.academicYear;
  const termVal = term || ctx.term;
  const [rows] = await promisePool.query(
    `SELECT id, school_id, class_name, subject_name, teacher_user_id, periods_per_week, room
     FROM teacher_assignments
     WHERE school_id = ? AND class_name = ? AND status = 'active'
       AND academic_year = ? AND term = ?`,
    [schoolId, className, year, termVal],
  );
  return rows;
}

/** Avoid "Illegal mix of collations" when comparing registry vs students.academic_year */
const SQL_ACADEMIC_YEAR_EQ = (leftCol, rightCol) =>
  `CONVERT(TRIM(COALESCE(${leftCol}, '')) USING utf8mb4) COLLATE utf8mb4_unicode_ci = CONVERT(TRIM(${rightCol}) USING utf8mb4) COLLATE utf8mb4_unicode_ci`;

const SQL_ACADEMIC_YEAR_PARAM = (col) =>
  `CONVERT(${col} USING utf8mb4) COLLATE utf8mb4_unicode_ci = CONVERT(? USING utf8mb4) COLLATE utf8mb4_unicode_ci`;

/** Period attendance + round roll call rows merged by normalized class name */
function mergeClassAttendanceBuckets(lessonRows, roundRows) {
  const map = new Map();
  const add = (rawName, total, pres, abs) => {
    const k = normalizeGradebookLabel(rawName);
    if (!k) return;
    const cur = map.get(k) || { total_marks: 0, present_count: 0, absent_count: 0 };
    map.set(k, {
      total_marks: cur.total_marks + (Number(total) || 0),
      present_count: cur.present_count + (Number(pres) || 0),
      absent_count: cur.absent_count + (Number(abs) || 0),
    });
  };
  for (const r of lessonRows || []) add(r.class_name, r.total_marks, r.present_count, r.absent_count);
  for (const r of roundRows || []) add(r.class_name, r.total_marks, r.present_count, r.absent_count);
  return map;
}

/** Lesson marks + round roll marks merged by teacher user id */
function mergeTeacherAttendanceBuckets(lessonRows, roundRows) {
  const map = new Map();
  const add = (staffId, total, pres, abs, name, dept) => {
    const id = Number(staffId);
    if (!Number.isFinite(id) || id <= 0) return;
    const cur = map.get(id) || {
      total_marks: 0,
      present_count: 0,
      absent_count: 0,
      teacher_name: name || '—',
      department: dept || 'TEACHER',
    };
    map.set(id, {
      staff_id: id,
      total_marks: cur.total_marks + (Number(total) || 0),
      present_count: cur.present_count + (Number(pres) || 0),
      absent_count: cur.absent_count + (Number(abs) || 0),
      teacher_name: (name && String(name).trim()) || cur.teacher_name,
      department: (dept && String(dept).trim()) || cur.department,
    });
  };
  for (const r of lessonRows || []) {
    add(r.staff_id, r.total_marks, r.present_count, r.absent_count, r.teacher_name, r.department);
  }
  for (const r of roundRows || []) {
    add(r.staff_id, r.total_marks, r.present_count, r.absent_count, r.teacher_name, r.department);
  }
  return map;
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
      promotion_settings_json JSON NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      updated_by_user_id INT UNSIGNED NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await promisePool.query(
    `ALTER TABLE school_dos_settings ADD COLUMN IF NOT EXISTS promotion_settings_json JSON NULL`
  ).catch(() => {});

  await ensureStudentYearEnrollmentsTable();

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
    CREATE TABLE IF NOT EXISTS school_academic_year_registry (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      academic_year VARCHAR(32) NOT NULL,
      active_terms_json JSON NULL,
      term_dates_json JSON NULL,
      is_current TINYINT(1) NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      updated_by_user_id INT UNSIGNED NULL,
      UNIQUE KEY uq_school_year (school_id, academic_year),
      KEY idx_school_current (school_id, is_current)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await promisePool.query(
    'ALTER TABLE school_academic_year_registry MODIFY academic_year VARCHAR(32) NOT NULL COLLATE utf8mb4_unicode_ci'
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

  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS dos_teacher_period_alerts (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      alert_type VARCHAR(32) NOT NULL DEFAULT 'missed',
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      teacher_id INT UNSIGNED NULL,
      teacher_name VARCHAR(255) NULL,
      class_name VARCHAR(120) NULL,
      subject_name VARCHAR(255) NULL,
      period_date DATE NULL,
      is_read TINYINT(1) NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL,
      KEY idx_alerts_school (school_id, deleted_at, created_at),
      KEY idx_alerts_read (school_id, is_read, deleted_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  tablesReady = true;
}

function dayOfWeekName(d = new Date()) {
  return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d.getDay()];
}

function timeToMins(t) {
  const [hh, mm] = String(t || '00:00').slice(0, 5).split(':').map(Number);
  return (Number.isFinite(hh) ? hh : 0) * 60 + (Number.isFinite(mm) ? mm : 0);
}

function timesOverlap(startA, endA, startB, endB) {
  return timeToMins(startA) < timeToMins(endB) && timeToMins(startB) < timeToMins(endA);
}

function teacherSlotKey(staffId, day, startTime) {
  return `${staffId}__${day}__${String(startTime || '').slice(0, 5)}`;
}

async function findTeacherPeriodConflicts(schoolId, opts = {}) {
  const staffId = Number(opts.staffId);
  const dayOfWeek = trimStr(opts.dayOfWeek);
  const startTime = trimStr(opts.startTime);
  const endTime = trimStr(opts.endTime);
  const term = trimStr(opts.term) || '';
  const academicYear = trimStr(opts.academicYear) || '';
  const excludeId = opts.excludeId != null ? Number(opts.excludeId) : null;
  if (!schoolId || !staffId || !dayOfWeek || !startTime || !endTime) return [];

  let sql = `
    SELECT tt.id, tt.class_name, tt.subject_name, tt.day_of_week,
           tt.start_time, tt.end_time, tt.term, tt.academic_year,
           TRIM(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))) AS teacher_name
    FROM academic_timetables tt
    LEFT JOIN users u ON u.id = tt.staff_id
    WHERE tt.school_id = ? AND tt.staff_id = ? AND tt.day_of_week = ?
      AND TRIM(COALESCE(tt.term, '')) = ? AND TRIM(COALESCE(tt.academic_year, '')) = ?`;
  const params = [schoolId, staffId, dayOfWeek, term, academicYear];
  if (excludeId && !Number.isNaN(excludeId)) {
    sql += ' AND tt.id != ?';
    params.push(excludeId);
  }
  const [rows] = await promisePool.query(sql, params);
  return (rows || []).filter((row) => timesOverlap(startTime, endTime, row.start_time, row.end_time));
}

function formatTeacherConflictMessage(conflictRow, day, timeRange) {
  const teacher = conflictRow.teacher_name || 'Teacher';
  const otherClass = conflictRow.class_name || 'another class';
  const otherSubject = conflictRow.subject_name || 'a lesson';
  return `${teacher} is already teaching ${otherSubject} in ${otherClass} on ${day} at ${timeRange}.`;
}

function toDateSql(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
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

const { getConductBoundsForSchool, getConductMaxMarks } = require('./conductMarksSettings');

/** Conduct maximum — same as Head of Discipline default_marks (not a fixed 100). */
async function getTotalMarksForSchool(schoolId) {
  try {
    return await getConductMaxMarks(schoolId);
  } catch (_) {
    return 40;
  }
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

function parseJsonArray(raw, fallback = []) {
  if (!raw) return fallback;
  try {
    const parsed = Array.isArray(raw) ? raw : JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch (_) {
    return fallback;
  }
}

function normalizeTermDates(termDatesRaw, activeTerms) {
  const saved = parseJsonArray(termDatesRaw, []);
  const terms = Array.isArray(activeTerms) && activeTerms.length
    ? activeTerms
    : ['Term 1', 'Term 2', 'Term 3'];
  return terms.map((name) => {
    const hit = saved.find((x) => x && String(x.name).trim() === String(name).trim());
    return {
      name: String(name).trim(),
      start: hit?.start ? String(hit.start).trim() : '',
      end: hit?.end ? String(hit.end).trim() : '',
    };
  });
}

async function syncLegacyAcademicSettingsRow(schoolId, year, terms, termDates, userId = null) {
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
}

async function migrateLegacySettingsToRegistry(schoolId) {
  const [[legacy]] = await promisePool.query(
    `SELECT current_academic_year, active_terms_json, term_dates_json
     FROM school_academic_settings WHERE school_id = ? LIMIT 1`,
    [schoolId]
  );
  const [[countRow]] = await promisePool.query(
    'SELECT COUNT(*) AS c FROM school_academic_year_registry WHERE school_id = ?',
    [schoolId]
  );
  if (Number(countRow?.c || 0) > 0) return;

  const year = trimStr(legacy?.current_academic_year) || inferAcademicYearFromDate();
  const terms = parseJsonArray(legacy?.active_terms_json, ['Term 1', 'Term 2', 'Term 3'])
    .map((x) => String(x).trim())
    .filter(Boolean);
  const termDates = normalizeTermDates(legacy?.term_dates_json, terms);
  await promisePool.query(
    `INSERT INTO school_academic_year_registry
       (school_id, academic_year, active_terms_json, term_dates_json, is_current)
     VALUES (?, ?, ?, ?, 1)`,
    [schoolId, year, JSON.stringify(terms), JSON.stringify(termDates)]
  );
}

async function listAcademicYearRegistry(schoolId) {
  await ensureDosTables();
  await migrateLegacySettingsToRegistry(schoolId);
  const [rows] = await promisePool.query(
    `SELECT r.id, r.academic_year, r.active_terms_json, r.term_dates_json, r.is_current,
            r.created_at, r.updated_at,
            (SELECT COUNT(*) FROM student_year_enrollments e
              WHERE e.school_id = r.school_id
                AND ${SQL_ACADEMIC_YEAR_EQ('e.academic_year', 'r.academic_year')}) AS student_count
     FROM school_academic_year_registry r
     WHERE r.school_id = ?
     ORDER BY r.academic_year DESC`,
    [schoolId]
  );
  return (rows || []).map((row) => {
    const terms = parseJsonArray(row.active_terms_json, ['Term 1', 'Term 2', 'Term 3'])
      .map((x) => String(x).trim())
      .filter(Boolean);
    return {
      id: row.id,
      academic_year: row.academic_year,
      active_terms: terms,
      term_dates: normalizeTermDates(row.term_dates_json, terms),
      is_current: Number(row.is_current) === 1,
      student_count: Number(row.student_count || 0),
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  });
}

async function upsertAcademicYearRegistry(schoolId, payload, userId) {
  const year = trimStr(payload.academic_year);
  if (!/^\d{4}-\d{4}$/.test(year)) {
    throw new Error('academic_year must be like 2026-2027.');
  }
  const termsRaw = Array.isArray(payload.active_terms) ? payload.active_terms : [];
  const terms = termsRaw.map((x) => trimStr(x)).filter(Boolean);
  if (!terms.length) throw new Error('At least one term is required.');

  const termDates = normalizeTermDates(payload.term_dates, terms);
  let setCurrent = payload.set_as_current === true || payload.is_current === true;
  const [[hasCurrent]] = await promisePool.query(
    'SELECT id FROM school_academic_year_registry WHERE school_id = ? AND is_current = 1 LIMIT 1',
    [schoolId]
  );
  if (!hasCurrent) setCurrent = true;

  if (setCurrent) {
    await promisePool.query(
      'UPDATE school_academic_year_registry SET is_current = 0 WHERE school_id = ?',
      [schoolId]
    );
  }

  await promisePool.query(
    `INSERT INTO school_academic_year_registry
       (school_id, academic_year, active_terms_json, term_dates_json, is_current, updated_by_user_id)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       active_terms_json  = VALUES(active_terms_json),
       term_dates_json    = VALUES(term_dates_json),
       is_current         = IF(VALUES(is_current) = 1, 1, school_academic_year_registry.is_current),
       updated_by_user_id = VALUES(updated_by_user_id)`,
    [
      schoolId,
      year,
      JSON.stringify(terms),
      JSON.stringify(termDates),
      setCurrent ? 1 : 0,
      userId,
    ]
  );

  if (setCurrent) {
    await promisePool.query(
      `UPDATE school_academic_year_registry SET is_current = 1 WHERE school_id = ? AND ${SQL_ACADEMIC_YEAR_PARAM('academic_year')}`,
      [schoolId, year]
    );
    await syncLegacyAcademicSettingsRow(schoolId, year, terms, termDates, userId);
  }

  return listAcademicYearRegistry(schoolId);
}

async function setCurrentAcademicYearRegistry(schoolId, year, userId) {
  const y = trimStr(year);
  if (!/^\d{4}-\d{4}$/.test(y)) throw new Error('Invalid academic year.');
  const registry = await listAcademicYearRegistry(schoolId);
  const hit = registry.find((r) => r.academic_year === y);
  if (!hit) throw new Error('Academic year not registered. Add it first.');

  await promisePool.query(
    'UPDATE school_academic_year_registry SET is_current = 0 WHERE school_id = ?',
    [schoolId]
  );
  await promisePool.query(
    `UPDATE school_academic_year_registry SET is_current = 1 WHERE school_id = ? AND ${SQL_ACADEMIC_YEAR_PARAM('academic_year')}`,
    [schoolId, y]
  );
  await syncLegacyAcademicSettingsRow(schoolId, y, hit.active_terms, hit.term_dates, userId);
  return listAcademicYearRegistry(schoolId);
}

async function getAcademicCalendarSettings(schoolId) {
  await ensureDosTables();
  const registry = await listAcademicYearRegistry(schoolId);
  const current =
    registry.find((r) => r.is_current) ||
    registry[0] ||
    null;

  if (current) {
    return {
      current_academic_year: current.academic_year,
      active_terms: current.active_terms,
      term_dates: current.term_dates,
      academic_years_registry: registry,
    };
  }

  const year = inferAcademicYearFromDate();
  const terms = ['Term 1', 'Term 2', 'Term 3'];
  const termDates = normalizeTermDates([], terms);
  return {
    current_academic_year: year,
    active_terms: terms,
    term_dates: termDates,
    academic_years_registry: [],
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

function isAllYearTerm(termRaw) {
  const t = trimStr(termRaw).toLowerCase();
  return t === 'all year' || t === 'all-year' || t === 'allyear';
}

/** Gate / review date span: single term or full academic year from calendar term_dates. */
function resolveReviewDateRange(calendar, term, allYear) {
  const termDates = Array.isArray(calendar?.term_dates) ? calendar.term_dates : [];
  const today = new Date().toISOString().slice(0, 10);

  if (allYear && termDates.length) {
    let from = '';
    let to = today;
    for (const td of termDates) {
      if (!td) continue;
      const s = trimStr(td.start);
      const e = trimStr(td.end);
      if (s && (!from || s < from)) from = s;
      if (e && (!to || e > to)) to = e;
    }
    if (from) {
      if (to > today) to = today;
      return { from, to };
    }
  }

  const termCfg = termDates.find((t) => t && String(t.name || '').trim() === term);
  if (termCfg?.start && termCfg?.end) {
    let to = String(termCfg.end).trim();
    if (to > today) to = today;
    return { from: String(termCfg.start).trim(), to };
  }

  const d1 = new Date();
  d1.setDate(d1.getDate() - 89);
  return { from: d1.toISOString().slice(0, 10), to: today };
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
    await ensureStudentsTable();
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
// GET /api/dos/dashboard/today-timetable — school-wide today schedule (term filter)
// ════════════════════════════════════════════════════════════════
router.get('/dos/dashboard/today-timetable', requireRole(DOS_DASHBOARD_ROLES), async (req, res) => {
  try {
    await ensureAcademicTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) {
      return res.status(403).json({ success: false, message: 'No active school context' });
    }

    const settings = await getTeacherPeriodSettings(schoolId);
    const term = String(req.query.term || settings.term || '').trim();
    const academicYear = String(req.query.academic_year || settings.academic_year || '').trim();
    const currentDay = new Date().toLocaleString('en-US', { weekday: 'long' });
    const nowHm = new Date().toTimeString().slice(0, 5);
    const timeToMins = (t) => {
      const [h, m] = String(t || '00:00').slice(0, 5).split(':').map(Number);
      return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
    };
    const nowMins = timeToMins(nowHm);

    let sql = `SELECT subject_name, class_name, room, start_time, end_time
               FROM academic_timetables
               WHERE school_id = ? AND day_of_week = ?
                 AND (extra_activity_id IS NULL OR extra_activity_id = 0)`;
    const params = [schoolId, currentDay];
    if (term) { sql += ' AND TRIM(COALESCE(term,\'\')) = ?'; params.push(term); }
    if (academicYear) { sql += ' AND TRIM(COALESCE(academic_year,\'\')) = ?'; params.push(academicYear); }
    sql += ' ORDER BY start_time ASC';
    const [rows] = await promisePool.query(sql, params);

    const schedule = (rows || []).map((row) => {
      const start = String(row.start_time || '').slice(0, 5);
      const end = String(row.end_time || '').slice(0, 5);
      const startM = timeToMins(start);
      const endM = timeToMins(end);
      return {
        time: start,
        end_time: end,
        subject: row.subject_name || '—',
        class_name: row.class_name || '—',
        room: row.room || '—',
        active: nowMins >= startM && nowMins < endM,
      };
    });

    return res.json({
      success: true,
      data: {
        day: currentDay,
        term,
        academic_year: academicYear,
        schedule,
      },
    });
  } catch (err) {
    console.error('[GET /dos/dashboard/today-timetable]', err);
    return res.status(500).json({ success: false, message: 'Failed to load today timetable' });
  }
});

// ════════════════════════════════════════════════════════════════
// GET /api/dos/dashboard/academic-insights — performance charts data
// ════════════════════════════════════════════════════════════════
router.get('/dos/dashboard/academic-insights', requireRole(DOS_DASHBOARD_ROLES), async (req, res) => {
  try {
    await ensureAcademicTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) {
      return res.status(403).json({ success: false, message: 'No active school context' });
    }

    const settings = await getTeacherPeriodSettings(schoolId);
    const term = String(req.query.term || settings.term || '').trim();
    const academicYear = String(req.query.academic_year || settings.academic_year || '').trim();

    const termClause = term ? ' AND TRIM(COALESCE(a.term,\'\')) = ?' : '';
    const yearClause = academicYear ? ' AND TRIM(COALESCE(a.academic_year,\'\')) = ?' : '';
    const filterParams = [];
    if (term) filterParams.push(term);
    if (academicYear) filterParams.push(academicYear);

    const [classRows] = await promisePool.query(
      `SELECT
         COALESCE(NULLIF(TRIM(a.class_name), ''), 'Unknown') AS name,
         ROUND(AVG(m.score_obtained / NULLIF(a.max_score, 0) * 100), 1) AS avg_pct,
         COUNT(*) AS mark_count
       FROM academic_marks m
       INNER JOIN academic_assessments a ON m.assessment_id = a.id AND a.school_id = m.school_id
       WHERE m.school_id = ? AND a.max_score > 0${termClause}${yearClause}
       GROUP BY COALESCE(NULLIF(TRIM(a.class_name), ''), 'Unknown')
       HAVING mark_count >= 1
       ORDER BY avg_pct DESC`,
      [schoolId, ...filterParams]
    );

    const ranked = (classRows || []).map((r) => ({
      name: r.name,
      avg_pct: Number(r.avg_pct) || 0,
      mark_count: Number(r.mark_count) || 0,
    }));

    const bestPerformingClasses = ranked.slice(0, 6);
    const worstPerformingClasses = [...ranked].sort((a, b) => a.avg_pct - b.avg_pct).slice(0, 6);

    const [subjectRows] = await promisePool.query(
      `SELECT
         COALESCE(NULLIF(TRIM(a.subject_name), ''), 'Unknown') AS name,
         ROUND(AVG(m.score_obtained / NULLIF(a.max_score, 0) * 100), 1) AS avg_pct,
         COUNT(*) AS mark_count
       FROM academic_marks m
       INNER JOIN academic_assessments a ON m.assessment_id = a.id AND a.school_id = m.school_id
       WHERE m.school_id = ? AND a.max_score > 0${termClause}${yearClause}
       GROUP BY COALESCE(NULLIF(TRIM(a.subject_name), ''), 'Unknown')
       HAVING mark_count >= 1
       ORDER BY avg_pct DESC
       LIMIT 10`,
      [schoolId, ...filterParams]
    );

    const subjectPerformance = (subjectRows || []).map((r) => ({
      name: r.name,
      avg_pct: Number(r.avg_pct) || 0,
      mark_count: Number(r.mark_count) || 0,
    }));

    const catFilter = ` AND (
      LOWER(COALESCE(a.column_slug, '')) LIKE '%cat%'
      OR LOWER(COALESCE(a.assessment_name, '')) LIKE '%cat%'
      OR LOWER(COALESCE(a.assessment_name, '')) LIKE '%continuous%'
    )`;

    let [catRows] = await promisePool.query(
      `SELECT
         DATE_FORMAT(a.created_at, '%b %d') AS label,
         DATE(a.created_at) AS sort_date,
         ROUND(AVG(m.score_obtained / NULLIF(a.max_score, 0) * 100), 1) AS avg_pct,
         COUNT(*) AS mark_count
       FROM academic_marks m
       INNER JOIN academic_assessments a ON m.assessment_id = a.id AND a.school_id = m.school_id
       WHERE m.school_id = ? AND a.max_score > 0${catFilter}${termClause}${yearClause}
       GROUP BY DATE(a.created_at)
       ORDER BY sort_date ASC
       LIMIT 14`,
      [schoolId, ...filterParams]
    );

    if (!(catRows || []).length) {
      [catRows] = await promisePool.query(
        `SELECT
           DATE_FORMAT(a.created_at, '%b %d') AS label,
           DATE(a.created_at) AS sort_date,
           ROUND(AVG(m.score_obtained / NULLIF(a.max_score, 0) * 100), 1) AS avg_pct,
           COUNT(*) AS mark_count
         FROM academic_marks m
         INNER JOIN academic_assessments a ON m.assessment_id = a.id AND a.school_id = m.school_id
         WHERE m.school_id = ? AND a.max_score > 0${termClause}${yearClause}
         GROUP BY DATE(a.created_at)
         ORDER BY sort_date ASC
         LIMIT 14`,
        [schoolId, ...filterParams]
      );
    }

    const catTrends = (catRows || []).map((r) => ({
      label: r.label,
      avg_pct: Number(r.avg_pct) || 0,
      mark_count: Number(r.mark_count) || 0,
    }));

    return res.json({
      success: true,
      data: {
        term,
        academic_year: academicYear,
        bestPerformingClasses,
        worstPerformingClasses,
        subjectPerformance,
        catTrends,
        hasMarksData: ranked.length > 0,
      },
    });
  } catch (err) {
    console.error('[GET /dos/dashboard/academic-insights]', err);
    return res.status(500).json({ success: false, message: 'Failed to load academic insights' });
  }
});

// ════════════════════════════════════════════════════════════════
// GET /api/dos/class-enrollment — student count per class/section
// ════════════════════════════════════════════════════════════════
router.get('/dos/class-enrollment', requireRole(DOS_DASHBOARD_ROLES), async (req, res) => {
  try {
    await ensureStudentsTable();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'No active school context' });
    const [rows] = await promisePool.query(
      `SELECT
         COALESCE(NULLIF(TRIM(class_name), ''), 'Unknown') AS class_name,
         COUNT(*) AS student_count,
         SUM(CASE WHEN UPPER(TRIM(COALESCE(gender, ''))) = 'MALE' THEN 1 ELSE 0 END) AS boys_count,
         SUM(CASE WHEN UPPER(TRIM(COALESCE(gender, ''))) = 'FEMALE' THEN 1 ELSE 0 END) AS girls_count
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
        rows: rows.map((r) => ({
          class_name: r.class_name,
          student_count: Number(r.student_count || 0),
          boys_count: Number(r.boys_count || 0),
          girls_count: Number(r.girls_count || 0),
        })),
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
    const detail = err.message || '';
    return res.status(500).json({
      success: false,
      message: detail.includes('collation') ? detail : 'Failed to load academic settings',
    });
  }
});

router.put('/dos/academic-calendar-settings', requireRole(DOS_ACADEMIC_ADMIN), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    const userId   = resolveUserId(req);
    if (!schoolId || !userId) return res.status(400).json({ success: false, message: 'Invalid session.' });

    const termDatesRaw = Array.isArray(req.body?.term_dates) ? req.body.term_dates : [];
    const registry = await upsertAcademicYearRegistry(
      schoolId,
      {
        academic_year: req.body?.current_academic_year,
        active_terms: req.body?.active_terms,
        term_dates: termDatesRaw,
        set_as_current: true,
      },
      userId
    );
    const current = registry.find((r) => r.is_current) || registry[0];
    return res.json({
      success: true,
      data: {
        current_academic_year: current?.academic_year,
        active_terms: current?.active_terms,
        term_dates: current?.term_dates,
        academic_years_registry: registry,
      },
    });
  } catch (err) {
    console.error('PUT /dos/academic-calendar-settings:', err);
    const msg = err.message || 'Failed to save academic settings';
    const code = msg.includes('must') || msg.includes('required') || msg.includes('Invalid') ? 400 : 500;
    return res.status(code).json({ success: false, message: msg });
  }
});

// POST /api/dos/academic-years — register another academic year
router.post('/dos/academic-years', requireRole(DOS_ACADEMIC_ADMIN), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    const userId = resolveUserId(req);
    if (!schoolId || !userId) return res.status(400).json({ success: false, message: 'Invalid session.' });

    const registry = await upsertAcademicYearRegistry(schoolId, req.body || {}, userId);
    return res.status(201).json({ success: true, data: { academic_years_registry: registry } });
  } catch (err) {
    console.error('POST /dos/academic-years:', err);
    const msg = err.message || 'Failed to register academic year';
    const code = msg.includes('must') || msg.includes('required') || msg.includes('Invalid') ? 400 : 500;
    return res.status(code).json({ success: false, message: msg });
  }
});

// PUT /api/dos/academic-years/:year — update terms/dates for a registered year
router.put('/dos/academic-years/:year', requireRole(DOS_ACADEMIC_ADMIN), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    const userId = resolveUserId(req);
    if (!schoolId || !userId) return res.status(400).json({ success: false, message: 'Invalid session.' });

    const year = decodeURIComponent(trimStr(req.params.year));
    const registry = await upsertAcademicYearRegistry(
      schoolId,
      {
        academic_year: year,
        active_terms: req.body?.active_terms,
        term_dates: req.body?.term_dates,
        set_as_current: req.body?.set_as_current === true,
      },
      userId
    );
    return res.json({ success: true, data: { academic_years_registry: registry } });
  } catch (err) {
    console.error('PUT /dos/academic-years/:year:', err);
    const msg = err.message || 'Failed to update academic year';
    const code = msg.includes('must') || msg.includes('required') || msg.includes('Invalid') ? 400 : 500;
    return res.status(code).json({ success: false, message: msg });
  }
});

// PATCH /api/dos/academic-years/:year/current — set active school year
router.patch('/dos/academic-years/:year/current', requireRole(DOS_ACADEMIC_ADMIN), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    const userId = resolveUserId(req);
    if (!schoolId || !userId) return res.status(400).json({ success: false, message: 'Invalid session.' });

    const year = decodeURIComponent(trimStr(req.params.year));
    const registry = await setCurrentAcademicYearRegistry(schoolId, year, userId);
    const current = registry.find((r) => r.is_current);
    return res.json({
      success: true,
      data: {
        current_academic_year: current?.academic_year,
        active_terms: current?.active_terms,
        term_dates: current?.term_dates,
        academic_years_registry: registry,
      },
    });
  } catch (err) {
    console.error('PATCH /dos/academic-years/:year/current:', err);
    const msg = err.message || 'Failed to set current year';
    const code = msg.includes('not registered') || msg.includes('Invalid') ? 400 : 500;
    return res.status(code).json({ success: false, message: msg });
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

    await backfillSchoolEnrollments(schoolId);

    const yearScope = enrollmentYearFilter(academicYear, 'ey', 's');
    let where = `WHERE s.school_id = ?${yearScope.where}`;
    const whereParams = [schoolId, ...yearScope.params];
    if (className) {
      where += ` AND TRIM(COALESCE(${yearScope.classCol}, '')) = ?`;
      whereParams.push(className);
    }

    // total count
    const [[countRow]] = await promisePool.query(
      `SELECT COUNT(*) AS total
       FROM students s
       ${yearScope.join}
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
         ${yearScope.classCol} AS class_name,
         COALESCE(NULLIF(TRIM(ey.academic_year), ''), s.academic_year) AS academic_year,
         ${enrollmentClassSelect('ey')},

         r.status_code,
         r.status_label,
         r.marks_obtained,
         (? - COALESCE(r.marks_obtained,0)) AS marks_remaining,
         r.notes
       FROM students s
       ${yearScope.join}
       LEFT JOIN dos_student_academic_records r
         ON r.school_id = s.school_id
        AND r.student_id = s.id
        AND r.academic_year = ?
        AND r.term = ?
       ${where}
       ORDER BY ${yearScope.classCol} ASC, s.last_name ASC, s.first_name ASC
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
        class_name: r.roster_class_name || r.class_name,
        academic_year: r.roster_academic_year || r.academic_year,
        enrollment_status: r.enrollment_status || null,

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
// GET /api/dos/promotion/class-review-metrics
//   ?academic_year=&term=&student_ids=1,2,3&class_name=
// Discipline: case deductions for term, else students.discipline_marks from DB.
// Attendance: RFID gate morning/evening (+ DOS morning register fallback).
// ════════════════════════════════════════════════════════════════
router.get('/dos/promotion/class-review-metrics', requireRole(DOS_ONLY), async (req, res) => {
  try {
    await ensureDosTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School not found in session.' });

    const academicYearQ = trimStr(req.query.academic_year || req.query.year || '');
    const termQ = trimStr(req.query.term || '');
    const className = trimStr(req.query.class_name || req.query.class || '');
    const studentIds = String(req.query.student_ids || '')
      .split(',')
      .map((x) => Number(String(x).trim()))
      .filter((id) => Number.isFinite(id) && id > 0)
      .slice(0, 500);

    const calendar = await getAcademicCalendarSettings(schoolId);
    const terms = Array.isArray(calendar.active_terms) && calendar.active_terms.length
      ? calendar.active_terms
      : ['Term 1', 'Term 2', 'Term 3'];
    const academicYear =
      academicYearQ ||
      trimStr(calendar.current_academic_year) ||
      inferAcademicYearFromDate();
    const allYear = isAllYearTerm(termQ);
    const term = allYear ? 'All Year' : termQ || inferTermFromMonth(terms);

    const conductBounds = await getConductBoundsForSchool(schoolId);
    const disciplineTotal = conductBounds.max_marks;
    const disciplineDefault = disciplineTotal;
    const disciplineMinimum = conductBounds.minimum_marks;

    const { from, to } = resolveReviewDateRange(calendar, term, allYear);

    let studentRows = [];
    const baseParams = [schoolId];
    let where = 'WHERE s.school_id = ?';
    if (studentIds.length) {
      where += ` AND s.id IN (${studentIds.map(() => '?').join(',')})`;
      baseParams.push(...studentIds);
    } else if (className) {
      const groupPrefix = className.split(/\s+/)[0] || className;
      where += ` AND (
        ${sqlNormLabelEquals('s.class_name')}
        OR LOWER(TRIM(s.class_name)) LIKE LOWER(CONCAT(TRIM(?), '%'))
        OR LOWER(TRIM(s.class_name)) LIKE LOWER(CONCAT(TRIM(?), '%'))
      )`;
      baseParams.push(className, className, groupPrefix);
    }

    const disciplineDeductionJoin = allYear
      ? `SELECT student_id, SUM(marks_deducted) AS deducted
         FROM discipline_cases
         WHERE school_id = ? AND academic_year = ?
         GROUP BY student_id`
      : `SELECT student_id, SUM(marks_deducted) AS deducted
         FROM discipline_cases
         WHERE school_id = ? AND academic_year = ? AND term = ?
         GROUP BY student_id`;

    const disciplineSql = `
      SELECT
        s.id,
        s.discipline_marks AS student_discipline_marks,
        COALESCE(ded.deducted, 0) AS discipline_deducted,
        CASE
          WHEN COALESCE(ded.deducted, 0) > 0 THEN (? - COALESCE(ded.deducted, 0))
          ELSE COALESCE(s.discipline_marks, ?, ?)
        END AS discipline_remaining
      FROM students s
      LEFT JOIN (
        ${disciplineDeductionJoin}
      ) ded ON ded.student_id = s.id
      ${where}
    `;

    const disciplineParams = allYear
      ? [disciplineTotal, disciplineDefault, disciplineTotal, schoolId, academicYear, ...baseParams]
      : [
          disciplineTotal,
          disciplineDefault,
          disciplineTotal,
          schoolId,
          academicYear,
          term,
          ...baseParams,
        ];

    try {
      const [rows] = await promisePool.query(disciplineSql, disciplineParams);
      studentRows = rows || [];
    } catch (discErr) {
      console.warn('[promotion/class-review-metrics] discipline_cases:', discErr.message);
      const [rows] = await promisePool.query(
        `SELECT s.id, s.discipline_marks AS student_discipline_marks,
                0 AS discipline_deducted,
                COALESCE(s.discipline_marks, ?, ?) AS discipline_remaining
         FROM students s ${where}`,
        [disciplineDefault, disciplineTotal, ...baseParams]
      );
      studentRows = rows || [];
    }

    const gateByStudent = new Map();
    const dosMorningByStudent = new Map();
    const idList = studentIds.length
      ? studentIds
      : (studentRows || []).map((r) => Number(r.id)).filter((id) => id > 0);

    if (from && to && idList.length) {
      const idPh = idList.map(() => '?').join(',');
      try {
        const [gateRows] = await promisePool.query(
          `SELECT person_id AS student_id,
                  SUM(CASE WHEN morning_check_in IS NOT NULL THEN 1 ELSE 0 END) AS morning_days,
                  SUM(CASE WHEN evening_check_out IS NOT NULL THEN 1 ELSE 0 END) AS evening_days
           FROM school_gate_attendance_records
           WHERE school_id = ? AND person_type = 'STUDENT'
             AND attendance_date BETWEEN ? AND ?
             AND person_id IN (${idPh})
           GROUP BY person_id`,
          [schoolId, from, to, ...idList]
        );
        for (const g of gateRows || []) {
          const sid = Number(g.student_id);
          if (!Number.isFinite(sid) || sid <= 0) continue;
          gateByStudent.set(sid, {
            morning_days: Number(g.morning_days) || 0,
            evening_days: Number(g.evening_days) || 0,
            source: 'rfid_gate',
          });
        }
      } catch (gateErr) {
        console.warn('[promotion/class-review-metrics] gate:', gateErr.message);
      }

      try {
        const [morningRows] = await promisePool.query(
          `SELECT student_id,
                  COUNT(DISTINCT CASE WHEN status_in IN ('On time', 'Late') THEN attendance_date END) AS morning_days
           FROM attendance_student
           WHERE school_id = ? AND attendance_date BETWEEN ? AND ?
             AND student_id IN (${idPh})
           GROUP BY student_id`,
          [schoolId, from, to, ...idList]
        );
        for (const m of morningRows || []) {
          const sid = Number(m.student_id);
          if (!Number.isFinite(sid) || sid <= 0) continue;
          dosMorningByStudent.set(sid, Number(m.morning_days) || 0);
        }
      } catch (_) {
        /* attendance_student optional */
      }
    }

    let workingDays = 0;
    if (from && to) {
      const start = new Date(from);
      const end = new Date(to);
      if (!isNaN(start) && !isNaN(end)) {
        const cur = new Date(start);
        cur.setHours(0, 0, 0, 0);
        const fin = new Date(end);
        fin.setHours(0, 0, 0, 0);
        while (cur <= fin) {
          const d = cur.getDay();
          if (d !== 0 && d !== 6) workingDays++;
          cur.setDate(cur.getDate() + 1);
        }
      }
    }
    const expectedSlots = workingDays * 2;

    const byStudentId = {};
    for (const r of studentRows || []) {
      const sid = Number(r.id);
      const g = gateByStudent.get(sid);
      const dosMorning = dosMorningByStudent.get(sid) || 0;
      let morningDays = g?.morning_days ?? dosMorning;
      let eveningDays = g?.evening_days ?? 0;
      let attendanceSource = g?.source || (dosMorning > 0 ? 'dos_morning' : null);
      if (!g && dosMorning > 0) {
        morningDays = dosMorning;
      }
      const slotsFilled = morningDays + eveningDays;
      const gatePct =
        expectedSlots > 0 ? Math.min(100, Math.round((100 * slotsFilled) / expectedSlots)) : null;
      const remaining = Number(r.discipline_remaining);
      byStudentId[sid] = {
        discipline_total: disciplineTotal,
        discipline_default: disciplineDefault,
        discipline_minimum: disciplineMinimum,
        discipline_deducted: Number(r.discipline_deducted || 0),
        discipline_remaining: Number.isFinite(remaining) ? remaining : disciplineDefault,
        discipline_below_minimum:
          Number.isFinite(remaining) && Number.isFinite(disciplineMinimum)
            ? remaining < disciplineMinimum
            : false,
        discipline_marks: Number(r.student_discipline_marks ?? r.discipline_remaining ?? disciplineDefault),
        gate_morning_days: morningDays,
        gate_evening_days: eveningDays,
        gate_attendance_pct: gatePct,
        attendance_source: attendanceSource,
      };
    }

    return res.json({
      success: true,
      data: { by_student_id: byStudentId },
      meta: {
        academic_year: academicYear,
        term,
        all_year: allYear,
        class_name: className || null,
        student_count: Object.keys(byStudentId).length,
        discipline_total: disciplineTotal,
        discipline_default: disciplineDefault,
        discipline_minimum: disciplineMinimum,
        date_range: { from, to },
        working_days: workingDays,
        expected_gate_slots: expectedSlots,
      },
    });
  } catch (err) {
    console.error('GET /dos/promotion/class-review-metrics:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to load class review metrics' });
  }
});

// ════════════════════════════════════════════════════════════════
// GET /api/dos/promotion/history
//        ?academic_year=&limit=100
// ════════════════════════════════════════════════════════════════
router.get('/dos/promotion/history', requireRole(DOS_ONLY), async (req, res) => {
  try {
    await ensureDosTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School not found in session.' });

    const yearQ = trimStr(req.query.academic_year || req.query.year || '');
    const limit = Math.min(Math.max(Number(req.query.limit) || 200, 1), 500);

    let where = 'WHERE r.school_id = ? AND r.status_code IN (?, ?, ?)';
    const params = [schoolId, 'promoted', 'repeated', 'second_sitting'];
    if (yearQ) {
      where += ' AND r.academic_year = ?';
      params.push(yearQ);
    }

    const [rows] = await promisePool.query(
      `SELECT
         r.id,
         r.academic_year,
         r.term,
         r.class_name,
         r.status_code,
         r.status_label,
         r.created_at,
         r.updated_at,
         s.id AS student_id,
         s.student_uid,
         s.student_code,
         r.notes,
         r.term,
         s.first_name,
         s.last_name,
         s.class_name AS current_class_name
       FROM dos_student_academic_records r
       INNER JOIN students s ON s.id = r.student_id AND s.school_id = r.school_id
       ${where}
       ORDER BY r.updated_at DESC, r.id DESC
       LIMIT ?`,
      [...params, limit]
    );

    const data = (rows || []).map((r) => {
      const code = String(r.status_code || '').toLowerCase();
      let status = 'Promoted';
      if (code === 'repeated' || code === 'second_sitting') status = 'Repeated';
      const notes = trimStr(r.notes);
      let fromClass = trimStr(r.class_name) || trimStr(r.current_class_name);
      let toClass = trimStr(r.current_class_name);
      const arrow = notes.match(/→\s*([^|]+?)(?:\s*$|\s*\|)/) || notes.match(/→\s*(.+)$/);
      if (arrow) toClass = trimStr(arrow[1]);
      const pipeFrom = notes.match(/\|\s*([^→]+)\s*→/);
      if (pipeFrom) fromClass = trimStr(pipeFrom[1]);
      return {
        id: r.id,
        student: `${r.first_name || ''} ${r.last_name || ''}`.trim(),
        student_id: r.student_id,
        student_code: r.student_uid || r.student_code || null,
        fromClass,
        toClass,
        stream: '',
        year: r.academic_year,
        term: r.term,
        status,
        notes,
        doneBy: 'DOS',
        date: r.updated_at ? String(r.updated_at).slice(0, 10) : '',
      };
    });

    return res.json({ success: true, data });
  } catch (err) {
    console.error('GET /dos/promotion/history:', err);
    return res.status(500).json({ success: false, message: 'Failed to load promotion history' });
  }
});

function defaultPromotionSettings() {
  return {
    min_avg_marks: 50,
    min_attendance: 75,
    auto_suggest_repeaters: true,
    fees_required: false,
    discipline_block: true,
    parent_notify: true,
    lock_after_confirm: true,
    auto_stream: false,
    certificate_signatory: 'Head Teacher',
    certificate_headline: 'Certificate of Graduation',
    certificate_subtitle: 'This certifies successful completion of the academic programme',
  };
}

async function loadPromotionSettings(schoolId) {
  const [[row]] = await promisePool.query(
    'SELECT promotion_settings_json FROM school_dos_settings WHERE school_id = ? LIMIT 1',
    [schoolId]
  ).catch(() => [[null]]);
  const base = defaultPromotionSettings();
  if (!row?.promotion_settings_json) return base;
  try {
    const parsed =
      typeof row.promotion_settings_json === 'string'
        ? JSON.parse(row.promotion_settings_json)
        : row.promotion_settings_json;
    return { ...base, ...(parsed && typeof parsed === 'object' ? parsed : {}) };
  } catch (_) {
    return base;
  }
}

// GET /api/dos/promotion/certificate-branding — stamp & head signature from school registry
router.get('/dos/promotion/certificate-branding', requireRole(DOS_ONLY), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School not found in session.' });

    const [[school]] = await promisePool.query(
      `SELECT school_name, head_teacher_name, head_signature_url, school_stamp_url, logo_url
       FROM schools WHERE id = ? LIMIT 1`,
      [schoolId]
    );
    if (!school) {
      return res.status(404).json({ success: false, message: 'School not found.' });
    }

    return res.json({
      success: true,
      data: {
        school_name: trimStr(school.school_name) || '',
        head_teacher_name: trimStr(school.head_teacher_name) || '',
        head_signature_url: trimStr(school.head_signature_url) || null,
        stamp_url: trimStr(school.school_stamp_url) || null,
        logo_url: trimStr(school.logo_url) || null,
      },
    });
  } catch (err) {
    console.error('GET /dos/promotion/certificate-branding:', err);
    return res.status(500).json({ success: false, message: 'Failed to load certificate branding' });
  }
});

// GET /api/dos/promotion/settings
router.get('/dos/promotion/settings', requireRole(DOS_ONLY), async (req, res) => {
  try {
    await ensureDosTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School not found in session.' });
    const settings = await loadPromotionSettings(schoolId);
    return res.json({ success: true, data: settings });
  } catch (err) {
    console.error('GET /dos/promotion/settings:', err);
    return res.status(500).json({ success: false, message: 'Failed to load promotion settings' });
  }
});

// PUT /api/dos/promotion/settings
router.put('/dos/promotion/settings', requireRole(DOS_ONLY), async (req, res) => {
  try {
    await ensureDosTables();
    const schoolId = resolveSchoolId(req);
    const userId = resolveUserId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School not found in session.' });
    const body = req.body || {};
    const current = await loadPromotionSettings(schoolId);
    const next = {
      ...current,
      min_avg_marks: Number(body.min_avg_marks ?? current.min_avg_marks),
      min_attendance: Number(body.min_attendance ?? current.min_attendance),
      auto_suggest_repeaters: !!body.auto_suggest_repeaters,
      fees_required: !!body.fees_required,
      discipline_block: !!body.discipline_block,
      parent_notify: !!body.parent_notify,
      lock_after_confirm: !!body.lock_after_confirm,
      auto_stream: !!body.auto_stream,
      certificate_signatory: trimStr(body.certificate_signatory) || current.certificate_signatory,
      certificate_headline: trimStr(body.certificate_headline) || current.certificate_headline,
      certificate_subtitle: trimStr(body.certificate_subtitle) || current.certificate_subtitle,
    };
    await promisePool.query(
      `INSERT INTO school_dos_settings (school_id, total_marks, promotion_settings_json, updated_by_user_id)
       VALUES (?, 100, ?, ?)
       ON DUPLICATE KEY UPDATE
         promotion_settings_json = VALUES(promotion_settings_json),
         updated_by_user_id = VALUES(updated_by_user_id)`,
      [schoolId, JSON.stringify(next), userId]
    );
    return res.json({ success: true, data: next });
  } catch (err) {
    console.error('PUT /dos/promotion/settings:', err);
    return res.status(500).json({ success: false, message: 'Failed to save promotion settings' });
  }
});

// GET /api/dos/promotion/summary?academic_year=
router.get('/dos/promotion/summary', requireRole(DOS_ONLY), async (req, res) => {
  try {
    await ensureDosTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School not found in session.' });

    const yearQ = trimStr(req.query.academic_year || req.query.year || '');
    const calendar = await getAcademicCalendarSettings(schoolId);
    const academicYear = yearQ || trimStr(calendar.current_academic_year) || inferAcademicYearFromDate();

    const [[studentAgg]] = await promisePool.query(
      `SELECT COUNT(*) AS total FROM students WHERE school_id = ?`,
      [schoolId]
    );

    const [histRows] = await promisePool.query(
      `SELECT status_code, class_name, notes
       FROM dos_student_academic_records
       WHERE school_id = ? AND academic_year = ? AND status_code IN ('promoted','repeated','second_sitting')`,
      [schoolId, academicYear]
    );

    let promoted = 0;
    let repeated = 0;
    const byFromClass = {};
    for (const r of histRows || []) {
      const code = String(r.status_code || '').toLowerCase();
      if (code === 'promoted') promoted += 1;
      if (code === 'repeated' || code === 'second_sitting') repeated += 1;
      const from = trimStr(r.class_name) || '—';
      if (!byFromClass[from]) byFromClass[from] = { class_name: from, promote: 0, repeat: 0, total: 0 };
      byFromClass[from].total += 1;
      if (code === 'promoted') byFromClass[from].promote += 1;
      else byFromClass[from].repeat += 1;
    }

    const totalStudents = Number(studentAgg?.total || 0);
    const promotionRate = totalStudents ? Math.round((promoted / totalStudents) * 1000) / 10 : 0;
    const repeatRate = totalStudents ? Math.round((repeated / totalStudents) * 1000) / 10 : 0;

    return res.json({
      success: true,
      data: {
        academic_year: academicYear,
        total_students: totalStudents,
        promoted,
        repeated,
        promotion_rate: promotionRate,
        repeat_rate: repeatRate,
        by_class: Object.values(byFromClass).sort((a, b) => b.total - a.total),
      },
    });
  } catch (err) {
    console.error('GET /dos/promotion/summary:', err);
    return res.status(500).json({ success: false, message: 'Failed to load promotion summary' });
  }
});

// ════════════════════════════════════════════════════════════════
// POST /api/dos/promotion/apply
//   { student_ids: number[], repeater_ids?: number[],
//     destination_class_name: string, academic_year?, term?,
//     promotion_type?, source_class_name? }
// ════════════════════════════════════════════════════════════════
router.post('/dos/promotion/apply', requireRole(DOS_ONLY), async (req, res) => {
  const conn = await promisePool.getConnection();
  try {
    await ensureDosTables();
    const schoolId = resolveSchoolId(req);
    const userId = resolveUserId(req);
    if (!schoolId || !userId) {
      return res.status(400).json({ success: false, message: 'Invalid session.' });
    }

    const body = req.body || {};
    const destClass = trimStr(body.destination_class_name || body.destinationClassName || '');
    if (!destClass) {
      return res.status(400).json({ success: false, message: 'destination_class_name is required.' });
    }

    const promoteIds = Array.isArray(body.student_ids)
      ? body.student_ids.map((x) => Number(x)).filter((n) => Number.isFinite(n) && n > 0)
      : [];
    const repeaterIds = Array.isArray(body.repeater_ids)
      ? body.repeater_ids.map((x) => Number(x)).filter((n) => Number.isFinite(n) && n > 0)
      : [];

    if (!promoteIds.length && !repeaterIds.length) {
      return res.status(400).json({ success: false, message: 'student_ids or repeater_ids required.' });
    }

    const { academicYear, term } = await resolveAcademicContext(
      schoolId,
      body.academic_year || body.year || '',
      body.term || ''
    );
    const sourceClass = trimStr(body.source_class_name || body.sourceClassName || '');
    const destYear = trimStr(
      body.destination_academic_year || body.destinationAcademicYear || inferNextAcademicYear(academicYear)
    ) || academicYear;
    const promotionType = trimStr(body.promotion_type || body.promotionType || 'Normal Promotion');
    const totalMarks = await getTotalMarksForSchool(schoolId);
    const conductBounds = await getConductBoundsForSchool(schoolId);
    const promoSettings = await loadPromotionSettings(schoolId);

    if (promoSettings.discipline_block && promoteIds.length) {
      const floor = Number(conductBounds.minimum_marks ?? 0);
      const ph = promoteIds.map(() => '?').join(',');
      const [markRows] = await promisePool.query(
        `SELECT id, discipline_marks, first_name, last_name
         FROM students WHERE school_id = ? AND id IN (${ph})`,
        [schoolId, ...promoteIds]
      );
      const blocked = (markRows || []).filter((r) => {
        const marks = Number(r.discipline_marks ?? totalMarks);
        return marks < floor;
      });
      if (blocked.length) {
        const names = blocked
          .slice(0, 5)
          .map((r) => `${trimStr(r.first_name)} ${trimStr(r.last_name)}`.trim())
          .filter(Boolean)
          .join(', ');
        return res.status(400).json({
          success: false,
          message: `Cannot promote ${blocked.length} student(s) below conduct minimum (${floor} marks).${names ? ` e.g. ${names}` : ''}`,
          data: { blocked_student_ids: blocked.map((r) => r.id), discipline_minimum: floor },
        });
      }
    }

    await conn.beginTransaction();

    let promoted = 0;
    let repeated = 0;

    for (const studentId of promoteIds) {
      const [[row]] = await conn.query(
        'SELECT id, class_name, academic_year FROM students WHERE id = ? AND school_id = ? LIMIT 1',
        [studentId, schoolId]
      );
      if (!row) continue;

      const fromClass = sourceClass || row.class_name || '';
      const fromYear = academicYear || trimStr(row.academic_year) || destYear;

      await conn.query(
        'UPDATE students SET class_name = ?, academic_year = ?, updated_at = NOW() WHERE id = ? AND school_id = ?',
        [destClass, destYear, studentId, schoolId]
      );

      await recordStudentPromotion(conn, {
        schoolId,
        studentId,
        sourceYear: fromYear,
        sourceClass: fromClass,
        destYear,
        destClass,
        userId,
      });

      await conn.query(
        `INSERT INTO dos_student_academic_records (
           school_id, student_id, academic_year, term, class_name,
           status_code, status_label, marks_obtained, marks_remaining,
           notes, recorded_by_user_id
         ) VALUES (?,?,?,?,?,?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE
           class_name = VALUES(class_name),
           status_code = 'promoted',
           status_label = NULL,
           notes = VALUES(notes),
           recorded_by_user_id = VALUES(recorded_by_user_id),
           updated_at = NOW()`,
        [
          schoolId,
          studentId,
          academicYear,
          term,
          fromClass || null,
          'promoted',
          null,
          0,
          totalMarks,
          `${promotionType} | ${fromClass} → ${destClass} (${fromYear} → ${destYear})`,
          userId,
        ]
      );
      promoted += 1;
    }

    for (const studentId of repeaterIds) {
      if (promoteIds.includes(studentId)) continue;
      const [[row]] = await conn.query(
        'SELECT id, class_name, academic_year FROM students WHERE id = ? AND school_id = ? LIMIT 1',
        [studentId, schoolId]
      );
      if (!row) continue;

      await recordStudentRepeat(conn, {
        schoolId,
        studentId,
        academicYear: academicYear || trimStr(row.academic_year),
        className: row.class_name || sourceClass,
        userId,
      });

      await conn.query(
        `INSERT INTO dos_student_academic_records (
           school_id, student_id, academic_year, term, class_name,
           status_code, status_label, marks_obtained, marks_remaining,
           notes, recorded_by_user_id
         ) VALUES (?,?,?,?,?,?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE
           status_code = 'repeated',
           status_label = NULL,
           notes = VALUES(notes),
           recorded_by_user_id = VALUES(recorded_by_user_id),
           updated_at = NOW()`,
        [
          schoolId,
          studentId,
          academicYear,
          term,
          row.class_name || sourceClass || null,
          'repeated',
          null,
          0,
          totalMarks,
          `Repeat: ${promotionType}`,
          userId,
        ]
      );
      repeated += 1;
    }

    await conn.commit();
    return res.status(201).json({
      success: true,
      message: 'Promotion applied.',
      data: { promoted, repeated, destination_class_name: destClass },
    });
  } catch (err) {
    try {
      await conn.rollback();
    } catch (_) {}
    console.error('POST /dos/promotion/apply:', err);
    return res.status(500).json({ success: false, message: 'Failed to apply promotion' });
  } finally {
    conn.release();
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
      `SELECT u.id, u.first_name, u.last_name, u.email, u.username, UPPER(r.role_code) AS role_code, st.staff_id
       FROM users u
       INNER JOIN roles r ON r.id = u.role_id
       INNER JOIN staff st ON st.user_id = u.id AND st.school_id = u.school_id
       WHERE u.school_id = ? AND u.deleted_at IS NULL
         AND UPPER(r.role_code) = 'TEACHER'
       ORDER BY u.last_name ASC, u.first_name ASC`,
      [schoolId]
    );
    const { enrichTeacherPortalLogin } = require('../utils/teacherPortalLoginHints');
    return res.json({ success: true, data: rows.map(enrichTeacherPortalLogin) });
  } catch (err) {
    console.error('GET /dos/teaching-staff:', err);
    return res.status(500).json({ success: false, message: 'Failed to list teaching staff' });
  }
});

async function assertTeachingStaffForSchool(schoolId, staffUserId) {
  const [rows] = await promisePool.query(
    `SELECT u.id FROM users u
     INNER JOIN roles r ON r.id = u.role_id
     INNER JOIN staff st ON st.user_id = u.id AND st.school_id = u.school_id
     WHERE u.id = ? AND u.school_id = ? AND u.deleted_at IS NULL
       AND UPPER(r.role_code) = 'TEACHER'`,
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
        tt.extra_activity_id,
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
// PUT /api/dos/subjects/:id — update catalogue subject fields
// ════════════════════════════════════════════════════════════════
router.put('/dos/subjects/:id', requireRole(DOS_ACADEMIC_ADMIN), async (req, res) => {
  try {
    await ensureAcademicTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School not found in session.' });
    const id = Number(req.params.id);
    if (!id || Number.isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid id.' });

    const name = req.body?.name != null ? normalizeGradebookLabel(req.body.name) : null;
    const category = req.body?.category != null ? (trimStr(req.body.category) || null) : undefined;
    const subject_code = req.body?.subject_code != null ? (trimStr(req.body.subject_code) || null) : undefined;
    if (name !== null && !name) {
      return res.status(400).json({ success: false, message: 'Subject name cannot be empty.' });
    }

    const [[existing]] = await promisePool.query(
      'SELECT id, name, category, subject_code, is_active FROM school_subjects WHERE id = ? AND school_id = ? LIMIT 1',
      [id, schoolId]
    );
    if (!existing) return res.status(404).json({ success: false, message: 'Subject not found.' });

    const nextName = name !== null ? name : existing.name;
    const nextCategory = category !== undefined ? category : existing.category;
    const nextCode = subject_code !== undefined ? subject_code : existing.subject_code;

    await promisePool.query(
      'UPDATE school_subjects SET name = ?, category = ?, subject_code = ? WHERE id = ? AND school_id = ?',
      [nextName, nextCategory, nextCode, id, schoolId]
    );
    return res.json({
      success: true,
      message: 'Subject updated.',
      data: { id, name: nextName, category: nextCategory, subject_code: nextCode, is_active: existing.is_active },
    });
  } catch (err) {
    if (err && err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'A subject with this name already exists.' });
    }
    console.error('PUT /dos/subjects/:id:', err);
    return res.status(500).json({ success: false, message: 'Failed to update subject' });
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

    const teacherConflicts = await findTeacherPeriodConflicts(schoolId, {
      staffId: staff_id, dayOfWeek: day_of_week, startTime: start_time, endTime: end_time,
      term, academicYear: academic_year,
    });
    const crossClass = teacherConflicts.filter((c) => String(c.class_name) !== String(class_name));
    if (crossClass.length > 0) {
      const c = crossClass[0];
      const timeRange = `${String(start_time).slice(0, 5)}–${String(end_time).slice(0, 5)}`;
      return res.status(409).json({
        success: false,
        code: 'TEACHER_PERIOD_CONFLICT',
        message: formatTeacherConflictMessage(c, day_of_week, timeRange),
        conflicts: crossClass.map((row) => ({
          type: 'teacher_clash',
          teacher_name: row.teacher_name,
          class_name: row.class_name,
          subject_name: row.subject_name,
          day: day_of_week,
          time: timeRange,
          term: row.term,
          academic_year: row.academic_year,
        })),
      });
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
      `SELECT id, class_name, subject_name, staff_id, day_of_week, start_time, end_time, room, term, academic_year
       FROM academic_timetables WHERE id = ? AND school_id = ? LIMIT 1`,
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

    const nextClass = class_name || existing.class_name;
    const nextStaff = (staff_id != null && !Number.isNaN(staff_id)) ? staff_id : existing.staff_id;
    const nextDay = day_of_week || existing.day_of_week;
    const nextStart = start_time || existing.start_time;
    const nextEnd = end_time || existing.end_time;
    const nextTerm = term !== undefined ? term : existing.term;
    const nextYear = academic_year !== undefined ? academic_year : existing.academic_year;

    const teacherConflicts = await findTeacherPeriodConflicts(schoolId, {
      staffId: nextStaff, dayOfWeek: nextDay, startTime: nextStart, endTime: nextEnd,
      term: nextTerm, academicYear: nextYear, excludeId: id,
    });
    const crossClass = teacherConflicts.filter((c) => String(c.class_name) !== String(nextClass));
    if (crossClass.length > 0) {
      const c = crossClass[0];
      const timeRange = `${String(nextStart).slice(0, 5)}–${String(nextEnd).slice(0, 5)}`;
      return res.status(409).json({
        success: false,
        code: 'TEACHER_PERIOD_CONFLICT',
        message: formatTeacherConflictMessage(c, nextDay, timeRange),
        conflicts: crossClass.map((row) => ({
          type: 'teacher_clash',
          teacher_name: row.teacher_name,
          class_name: row.class_name,
          subject_name: row.subject_name,
          day: nextDay,
          time: timeRange,
          term: row.term,
          academic_year: row.academic_year,
        })),
      });
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

    return res.json({ success: true, message: 'Teacher period settings saved', data: await getTeacherPeriodSettings(schoolId) });
  } catch (err) {
    console.error('PUT /dos/teacher-period/settings:', err);
    return res.status(500).json({ success: false, message: 'Failed to save teacher period settings' });
  }
});

// ════════════════════════════════════════════════════════════════
// Alerts CRUD
// ════════════════════════════════════════════════════════════════
router.get('/dos/teacher-period/alerts', requireRole(DOS_DASHBOARD_ROLES), async (req, res) => {
  try {
    await ensureDosTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'Invalid session' });
    const readFilter = trimStr(req.query.is_read);
    const where = ['school_id = ?', 'deleted_at IS NULL'];
    const params = [schoolId];
    if (readFilter === '0' || readFilter === '1') { where.push('is_read = ?'); params.push(Number(readFilter)); }
    const [rows] = await promisePool.query(
      `SELECT id, alert_type, title, message, teacher_id, teacher_name, class_name, subject_name, period_date, is_read, created_at
       FROM dos_teacher_period_alerts WHERE ${where.join(' AND ')} ORDER BY created_at DESC LIMIT 200`,
      params
    );
    const [[{ unread_count }]] = await promisePool.query(
      'SELECT COUNT(*) AS unread_count FROM dos_teacher_period_alerts WHERE school_id = ? AND deleted_at IS NULL AND is_read = 0',
      [schoolId]
    );
    return res.json({ success: true, data: rows, unread_count });
  } catch (err) {
    console.error('GET /dos/teacher-period/alerts:', err);
    return res.status(500).json({ success: false, message: 'Failed to load alerts' });
  }
});

router.patch('/dos/teacher-period/alerts/:id/read', requireRole(DOS_DASHBOARD_ROLES), async (req, res) => {
  try {
    await ensureDosTables();
    const schoolId = resolveSchoolId(req);
    const id = Number(req.params.id);
    const isRead = req.body?.is_read != null ? (req.body.is_read ? 1 : 0) : 1;
    await promisePool.query('UPDATE dos_teacher_period_alerts SET is_read = ? WHERE id = ? AND school_id = ?', [isRead, id, schoolId]);
    return res.json({ success: true });
  } catch (err) {
    console.error('PATCH /dos/teacher-period/alerts/:id/read:', err);
    return res.status(500).json({ success: false, message: 'Failed to update alert' });
  }
});

router.patch('/dos/teacher-period/alerts/read-all', requireRole(DOS_DASHBOARD_ROLES), async (req, res) => {
  try {
    await ensureDosTables();
    const schoolId = resolveSchoolId(req);
    await promisePool.query('UPDATE dos_teacher_period_alerts SET is_read = 1 WHERE school_id = ? AND deleted_at IS NULL AND is_read = 0', [schoolId]);
    return res.json({ success: true });
  } catch (err) {
    console.error('PATCH /dos/teacher-period/alerts/read-all:', err);
    return res.status(500).json({ success: false, message: 'Failed to mark all read' });
  }
});

router.delete('/dos/teacher-period/alerts/:id', requireRole(DOS_ACADEMIC_ADMIN), async (req, res) => {
  try {
    await ensureDosTables();
    const schoolId = resolveSchoolId(req);
    const id = Number(req.params.id);
    await promisePool.query('UPDATE dos_teacher_period_alerts SET deleted_at = NOW() WHERE id = ? AND school_id = ?', [id, schoolId]);
    return res.json({ success: true });
  } catch (err) {
    console.error('DELETE /dos/teacher-period/alerts/:id:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete alert' });
  }
});

router.post('/dos/teacher-period/alerts/bulk-delete', requireRole(DOS_ACADEMIC_ADMIN), async (req, res) => {
  try {
    await ensureDosTables();
    const schoolId = resolveSchoolId(req);
    const ids = req.body?.ids;
    const deleteAll = req.body?.all === true;
    if (deleteAll) {
      await promisePool.query('UPDATE dos_teacher_period_alerts SET deleted_at = NOW() WHERE school_id = ? AND deleted_at IS NULL', [schoolId]);
    } else if (Array.isArray(ids) && ids.length > 0) {
      const placeholders = ids.map(() => '?').join(',');
      await promisePool.query(`UPDATE dos_teacher_period_alerts SET deleted_at = NOW() WHERE school_id = ? AND id IN (${placeholders})`, [schoolId, ...ids]);
    } else {
      return res.status(400).json({ success: false, message: 'Provide ids array or all:true' });
    }
    return res.json({ success: true });
  } catch (err) {
    console.error('POST /dos/teacher-period/alerts/bulk-delete:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete alerts' });
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
         tt.term,
         tt.academic_year,
         TRIM(CONCAT(COALESCE(u.first_name,''), ' ', COALESCE(u.last_name,''))) AS teacher_name
       FROM academic_timetables tt
       INNER JOIN users u ON u.id = tt.staff_id
       WHERE tt.school_id = ?
         AND LOWER(tt.day_of_week) = LOWER(?)
       ORDER BY tt.start_time ASC, tt.class_name ASC`,
      [schoolId, day]
    );

    if (rows.length === 0) {
      console.warn(`[teacher-period/timetable] No timetable found: school_id=${schoolId}, day=${day}`);
    }

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
              u.school_id AS user_school_id,
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

    const staffSchoolId = teacher.school_id;
    const userSchoolId = teacher.user_school_id;
    const sessionSchoolId = resolveSchoolId(req);
    const schoolCandidates = [...new Set([staffSchoolId, userSchoolId, sessionSchoolId].filter(Boolean))];
    const GRACE_MINUTES = 5;

    let schoolId = staffSchoolId;
    let settings = await getTeacherPeriodSettings(schoolId);
    const lateThreshold = Number(settings.late_threshold_minutes || 10);

    let slots = [];
    for (const sid of schoolCandidates) {
      if (slots.length > 0) break;
      const curSettings = sid === schoolId ? settings : await getTeacherPeriodSettings(sid);

      [slots] = await promisePool.query(
        `SELECT id, class_name, subject_name, day_of_week, start_time, end_time, staff_id
         FROM academic_timetables
         WHERE school_id = ?
           AND staff_id = ?
           AND LOWER(day_of_week) = LOWER(?)
           AND term = ?
           AND academic_year = ?
         ORDER BY start_time ASC`,
        [sid, teacher.teacher_id, day, curSettings.term, curSettings.academic_year]
      );

      if (!slots || slots.length === 0) {
        [slots] = await promisePool.query(
          `SELECT id, class_name, subject_name, day_of_week, start_time, end_time, staff_id
           FROM academic_timetables
           WHERE school_id = ?
             AND staff_id = ?
             AND LOWER(day_of_week) = LOWER(?)
           ORDER BY start_time ASC`,
          [sid, teacher.teacher_id, day]
        );
      }

      if (slots && slots.length > 0) {
        schoolId = sid;
        settings = curSettings;
      }
    }

    if (!slots || slots.length === 0) {
      [slots] = await promisePool.query(
        `SELECT id, class_name, subject_name, day_of_week, start_time, end_time, staff_id
         FROM academic_timetables
         WHERE staff_id = ?
           AND LOWER(day_of_week) = LOWER(?)
         ORDER BY start_time ASC`,
        [teacher.teacher_id, day]
      );
      if (slots && slots.length > 0) {
        schoolId = staffSchoolId;
      }
    }

    const currentSlot = (slots || []).find((s) => {
      const start = timeToMins(s.start_time);
      const end = timeToMins(s.end_time);
      const cur = timeToMins(nowHm);
      return cur >= (start - GRACE_MINUTES) && cur <= (end + GRACE_MINUTES);
    });

    if (!currentSlot) {
      const allSlots = (slots || []).map(s => `${String(s.start_time).slice(0,5)}-${String(s.end_time).slice(0,5)} ${s.subject_name}(${s.class_name})`);
      console.warn(`[teacher-period/scan] NO_CLASS_ASSIGNED: teacher_id=${teacher.teacher_id} (${teacher.teacher_name}), day=${day}, time=${nowHm}, school_id=${schoolId}, slots_found=${(slots||[]).length}, allSlots=[${allSlots.join(', ')}], schoolCandidates=[${schoolCandidates.join(',')}]`);
      promisePool.query(
        `INSERT INTO dos_teacher_period_alerts (school_id, alert_type, title, message, teacher_id, teacher_name, period_date)
         VALUES (?, 'missed', 'No Period Found', ?, ?, ?, ?)`,
        [schoolId, `${teacher.teacher_name} has no class now (${day} ${nowHm})`, teacher.teacher_id, teacher.teacher_name, date]
      ).catch(() => {});
      return res.status(200).json({
        success: false,
        code: 'NO_CLASS_ASSIGNED',
        message: 'No class assigned now',
        data: {
          teacher: teacher.teacher_name, card_uid: cardUid, day, time: nowHm,
          teacher_id: teacher.teacher_id, school_id: schoolId,
          today_slots: (slots || []).map(s => ({
            start: String(s.start_time).slice(0, 5),
            end: String(s.end_time).slice(0, 5),
            subject: s.subject_name,
            class: s.class_name,
          })),
          ...settings,
        },
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
      if (status === 'LATE') {
        promisePool.query(
          `INSERT INTO dos_teacher_period_alerts (school_id, alert_type, title, message, teacher_id, teacher_name, class_name, subject_name, period_date)
           VALUES (?, 'late', 'Late Entry', ?, ?, ?, ?, ?, ?)`,
          [schoolId, `${teacher.teacher_name} is ${lateMinutes} min late for ${currentSlot.subject_name} (${currentSlot.class_name})`, teacher.teacher_id, teacher.teacher_name, currentSlot.class_name, currentSlot.subject_name, date]
        ).catch(() => {});
      }
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
      if (exitIsBefore) {
        promisePool.query(
          `INSERT INTO dos_teacher_period_alerts (school_id, alert_type, title, message, teacher_id, teacher_name, class_name, subject_name, period_date)
           VALUES (?, 'before', 'Early Exit', ?, ?, ?, ?, ?, ?)`,
          [schoolId, `${teacher.teacher_name} left ${currentSlot.subject_name} (${currentSlot.class_name}) before period ended`, teacher.teacher_id, teacher.teacher_name, currentSlot.class_name, currentSlot.subject_name, date]
        ).catch(() => {});
      }
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
// Returns per-class attendance summary: period (timetable) marks + round roll call marks.
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

    const [rrRows] = await promisePool.query(
      `SELECT
         lg.class_name,
         COUNT(rr.id) AS total_marks,
         SUM(CASE WHEN LOWER(TRIM(rr.status)) IN ('present','late','permission','excused') THEN 1 ELSE 0 END) AS present_count,
         SUM(CASE WHEN LOWER(TRIM(rr.status)) IN ('absent','sick') THEN 1 ELSE 0 END) AS absent_count
       FROM teacher_round_roll_call_logs lg
       INNER JOIN teacher_round_roll_call_records rr ON rr.log_id = lg.id
       WHERE lg.school_id = ? AND lg.record_date BETWEEN ? AND ?
       GROUP BY lg.class_name`,
      [schoolId, from, to]
    ).catch(() => [[]]);

    const mergedByClass = mergeClassAttendanceBuckets(rows, rrRows);
    const classKeys = Array.from(mergedByClass.keys()).sort((a, b) => a.localeCompare(b));

    let totalPresent = 0, totalAbsent = 0;
    const classes = classKeys.map((k) => {
      const r = mergedByClass.get(k);
      const total   = Number(r.total_marks)   || 0;
      const present = Number(r.present_count) || 0;
      const absent  = Number(r.absent_count)  || 0;
      const rate    = total > 0 ? Math.round((present / total) * 100) : 0;
      totalPresent += present;
      totalAbsent  += absent;
      return {
        id:           k,
        class:        k,
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

    const [rrSessions] = await promisePool.query(
      `SELECT
         lg.class_name,
         lg.roll_label,
         COUNT(rr.id) AS total_marks,
         SUM(CASE WHEN LOWER(TRIM(rr.status)) IN ('present','late','permission','excused') THEN 1 ELSE 0 END) AS present_count,
         SUM(CASE WHEN LOWER(TRIM(rr.status)) IN ('absent','sick') THEN 1 ELSE 0 END) AS absent_count
       FROM teacher_round_roll_call_logs lg
       INNER JOIN teacher_round_roll_call_records rr ON rr.log_id = lg.id
       WHERE lg.school_id = ? AND lg.record_date BETWEEN ? AND ?
       GROUP BY lg.class_name, lg.roll_label
       ORDER BY lg.class_name ASC, lg.roll_label ASC`,
      [schoolId, from, to]
    ).catch(() => [[]]);

    const round_roll_sessions = (rrSessions || []).map((r) => {
      const total = Number(r.total_marks) || 0;
      const present = Number(r.present_count) || 0;
      const absent = Number(r.absent_count) || 0;
      const rate = total > 0 ? Math.round((present / total) * 100) : 0;
      return {
        class_name: normalizeGradebookLabel(r.class_name || ''),
        roll_label: String(r.roll_label ?? '').trim(),
        total_marks: total,
        present_count: present,
        absent_count: absent,
        presence_rate: rate,
      };
    });

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
        round_roll_sessions,
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
// Returns per-teacher summary: lesson roll-call + round roll call (recorded_by_user_id).
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

    const [rrTeach] = await promisePool.query(
      `SELECT
         lg.recorded_by_user_id AS staff_id,
         MAX(TRIM(CONCAT(COALESCE(u.first_name,''), ' ', COALESCE(u.last_name,'')))) AS teacher_name,
         MAX(COALESCE(r.role_code, 'TEACHER')) AS department,
         COUNT(rr.id) AS total_marks,
         SUM(CASE WHEN LOWER(TRIM(rr.status)) IN ('present','late','permission','excused') THEN 1 ELSE 0 END) AS present_count,
         SUM(CASE WHEN LOWER(TRIM(rr.status)) IN ('absent','sick') THEN 1 ELSE 0 END) AS absent_count
       FROM teacher_round_roll_call_logs lg
       INNER JOIN teacher_round_roll_call_records rr ON rr.log_id = lg.id
       LEFT JOIN users u ON u.id = lg.recorded_by_user_id
       LEFT JOIN roles r ON r.id = u.role_id
       WHERE lg.school_id = ? AND lg.record_date BETWEEN ? AND ?
       GROUP BY lg.recorded_by_user_id`,
      [schoolId, from, to]
    ).catch(() => [[]]);

    const mergedByTeacher = mergeTeacherAttendanceBuckets(rows, rrTeach);
    const staffSorted = Array.from(mergedByTeacher.values()).sort((a, b) =>
      String(a.teacher_name || '').localeCompare(String(b.teacher_name || ''))
    );

    let totalPresent = 0, totalAbsent = 0;
    const staff = staffSorted.map((r) => {
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
// GET /api/dos/reports/hr/staff-metrics
//   ?term=Term 1  OR  ?from=YYYY-MM-DD&to=YYYY-MM-DD
// Gate reliability: (morning check-ins + evening exits) / (2 × working days elapsed in range).
// Blends with lesson/round-roll presence for a single performance score /100.
// ════════════════════════════════════════════════════════════════
router.get('/dos/reports/hr/staff-metrics', requireRole(DOS_ATTENDANCE_ROLES), async (req, res) => {
  try {
    await ensureAcademicTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(403).json({ success: false, message: 'No active school context' });

    const todayStr = new Date().toISOString().slice(0, 10);
    const fromQ = trimStr(req.query.from);
    const toQ = trimStr(req.query.to);
    const termQ = trimStr(req.query.term);

    let from = fromQ;
    let to = toQ;
    let termLabel = termQ || '';
    let rangeSource = 'custom';

    if (!from || !to) {
      const calendar = await getAcademicCalendarSettings(schoolId);
      const termDates = Array.isArray(calendar.term_dates) ? calendar.term_dates : [];
      const pickTerm = termQ || (Array.isArray(calendar.active_terms) && calendar.active_terms[0]) || 'Term 1';
      const termCfg = termDates.find((t) => t && String(t.name || '').trim() === pickTerm);
      if (termCfg && termCfg.start && termCfg.end) {
        from = String(termCfg.start).trim();
        to = String(termCfg.end).trim();
        termLabel = String(termCfg.name || pickTerm).trim();
        rangeSource = 'term_calendar';
      } else {
        const d1 = new Date();
        d1.setDate(d1.getDate() - 89);
        from = d1.toISOString().slice(0, 10);
        to = todayStr;
        termLabel = termQ || 'Last 90 days';
        rangeSource = 'fallback_90d';
      }
    }

    if (!from || !to) {
      return res.json({
        success: true,
        data: {
          term: termLabel,
          range: { from: '', to: '', elapsed_to: '', expected_slots: 0, source: 'empty' },
          staff: [],
        },
      });
    }

    const elapsedTo = to < todayStr ? to : todayStr;
    const elapsedFrom = from;
    let expectedSlots = 0;
    if (elapsedFrom <= elapsedTo) {
      expectedSlots = countWorkingDays(elapsedFrom, elapsedTo) * 2;
    }

    const [lessonRows] = await promisePool.query(
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
       GROUP BY tt.staff_id`,
      [schoolId, from, elapsedTo]
    );

    const [rrTeach] = await promisePool.query(
      `SELECT
         lg.recorded_by_user_id AS staff_id,
         MAX(TRIM(CONCAT(COALESCE(u.first_name,''), ' ', COALESCE(u.last_name,'')))) AS teacher_name,
         MAX(COALESCE(r.role_code, 'TEACHER')) AS department,
         COUNT(rr.id) AS total_marks,
         SUM(CASE WHEN LOWER(TRIM(rr.status)) IN ('present','late','permission','excused') THEN 1 ELSE 0 END) AS present_count,
         SUM(CASE WHEN LOWER(TRIM(rr.status)) IN ('absent','sick') THEN 1 ELSE 0 END) AS absent_count
       FROM teacher_round_roll_call_logs lg
       INNER JOIN teacher_round_roll_call_records rr ON rr.log_id = lg.id
       LEFT JOIN users u ON u.id = lg.recorded_by_user_id
       LEFT JOIN roles r ON r.id = u.role_id
       WHERE lg.school_id = ? AND lg.record_date BETWEEN ? AND ?
       GROUP BY lg.recorded_by_user_id`,
      [schoolId, from, elapsedTo]
    ).catch(() => [[]]);

    const merged = mergeTeacherAttendanceBuckets(lessonRows, rrTeach);
    const lessonPctByUser = new Map();
    for (const v of merged.values()) {
      const tot = Number(v.total_marks) || 0;
      const pres = Number(v.present_count) || 0;
      lessonPctByUser.set(Number(v.staff_id), tot > 0 ? Math.round((pres / tot) * 100) : 0);
    }

    let gateRows = [];
    try {
      const [g] = await promisePool.query(
        `SELECT person_id AS user_id,
           SUM(CASE WHEN morning_check_in IS NOT NULL THEN 1 ELSE 0 END) AS morning_hits,
           SUM(CASE WHEN evening_check_out IS NOT NULL THEN 1 ELSE 0 END) AS evening_hits
         FROM school_gate_attendance_records
         WHERE school_id = ? AND person_type = 'STAFF'
           AND attendance_date BETWEEN ? AND ?
         GROUP BY person_id`,
        [schoolId, from, elapsedTo]
      );
      gateRows = g || [];
    } catch (_) {
      gateRows = [];
    }

    const gateMap = new Map();
    for (const row of gateRows) {
      const uid = Number(row.user_id);
      if (!Number.isFinite(uid) || uid <= 0) continue;
      gateMap.set(uid, {
        morning_hits: Number(row.morning_hits) || 0,
        evening_hits: Number(row.evening_hits) || 0,
      });
    }

    const allUserIds = new Set([...lessonPctByUser.keys(), ...gateMap.keys()]);
    const staff = [];
    for (const uid of allUserIds) {
      const g = gateMap.get(uid) || { morning_hits: 0, evening_hits: 0 };
      const slotsFilled = g.morning_hits + g.evening_hits;
      const reliabilityPct = expectedSlots > 0
        ? Math.min(100, Math.round((100 * slotsFilled) / expectedSlots))
        : 0;
      const lessonPresencePct = lessonPctByUser.get(uid) || 0;
      let performanceOutOf100 = 0;
      if (expectedSlots <= 0 && lessonPresencePct <= 0) {
        performanceOutOf100 = 0;
      } else if (expectedSlots <= 0) {
        performanceOutOf100 = lessonPresencePct;
      } else if (lessonPresencePct <= 0) {
        performanceOutOf100 = reliabilityPct;
      } else {
        performanceOutOf100 = Math.min(100, Math.round(reliabilityPct * 0.55 + lessonPresencePct * 0.45));
      }
      staff.push({
        user_id: uid,
        gate_morning_days: g.morning_hits,
        gate_evening_days: g.evening_hits,
        reliability_pct: reliabilityPct,
        lesson_presence_pct: lessonPresencePct,
        performance_out_of_100: performanceOutOf100,
      });
    }
    staff.sort((a, b) => a.user_id - b.user_id);

    res.json({
      success: true,
      data: {
        term: termLabel,
        range: {
          from,
          to,
          elapsed_to: elapsedTo,
          expected_slots: expectedSlots,
          source: rangeSource,
        },
        staff,
      },
    });
  } catch (err) {
    console.error('[GET /dos/reports/hr/staff-metrics]', err);
    res.status(500).json({ success: false, message: 'Failed to load HR staff metrics' });
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

// ════════════════════════════════════════════════════════════════
// SMART TIMETABLE SYSTEM — tables, CRUD, generator
// ════════════════════════════════════════════════════════════════
let smartTTTablesReady = false;
async function ensureSmartTimetableTables() {
  if (smartTTTablesReady) return;

  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS timetable_school_schedule (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      day_start_time VARCHAR(10) NOT NULL DEFAULT '08:00',
      day_end_time VARCHAR(10) NOT NULL DEFAULT '17:00',
      period_duration_mins INT UNSIGNED NOT NULL DEFAULT 40,
      active_days_json JSON NOT NULL,
      breaks_json JSON NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_schedule_school (school_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS timetable_teacher_profiles (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      teacher_user_id INT UNSIGNED NOT NULL,
      subjects_json JSON NULL,
      max_periods_per_day INT UNSIGNED NOT NULL DEFAULT 6,
      available_days_json JSON NULL,
      preferred_slots_json JSON NULL,
      department VARCHAR(120) NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_tp_school_teacher (school_id, teacher_user_id),
      KEY idx_tp_school (school_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS timetable_course_config (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      subject_name VARCHAR(200) NOT NULL,
      default_duration_mins INT UNSIGNED NOT NULL DEFAULT 40,
      requires_lab TINYINT(1) NOT NULL DEFAULT 0,
      is_double_period TINYINT(1) NOT NULL DEFAULT 0,
      priority_level ENUM('low','medium','high','critical') NOT NULL DEFAULT 'medium',
      department VARCHAR(120) NULL,
      periods_per_week INT UNSIGNED NOT NULL DEFAULT 3,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_cc_school_subject (school_id, subject_name),
      KEY idx_cc_school (school_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS timetable_assignments (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      class_name VARCHAR(120) NOT NULL,
      subject_name VARCHAR(200) NOT NULL,
      teacher_user_id INT UNSIGNED NOT NULL,
      periods_per_week INT UNSIGNED NOT NULL DEFAULT 3,
      room VARCHAR(64) NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_ta_class_subject_teacher (school_id, class_name, subject_name, teacher_user_id),
      KEY idx_ta_school (school_id),
      KEY idx_ta_teacher (school_id, teacher_user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await promisePool.query(
    'ALTER TABLE timetable_assignments DROP INDEX uq_ta_class_subject'
  ).catch(() => {});
  await promisePool.query(
    'ALTER TABLE timetable_assignments ADD UNIQUE KEY uq_ta_class_subject_teacher (school_id, class_name, subject_name, teacher_user_id)'
  ).catch(() => {});
  await promisePool.query(
    'ALTER TABLE timetable_course_config ADD COLUMN scheduling_rules_json JSON NULL'
  ).catch(() => {});

  await promisePool.query(
    'ALTER TABLE academic_timetables ADD COLUMN extra_activity_id INT UNSIGNED NULL'
  ).catch(() => {});
  await promisePool.query(
    'ALTER TABLE academic_timetables MODIFY staff_id INT UNSIGNED NULL'
  ).catch(() => {});
  await promisePool.query(
    'CREATE INDEX idx_tt_extra_activity ON academic_timetables (school_id, extra_activity_id)'
  ).catch(() => {});

  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS timetable_extra_activities (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      activity_name VARCHAR(120) NOT NULL,
      class_name VARCHAR(120) NOT NULL,
      days_json JSON NOT NULL,
      start_time VARCHAR(10) NOT NULL,
      end_time VARCHAR(10) NOT NULL,
      term VARCHAR(32) NULL,
      academic_year VARCHAR(32) NULL,
      notes VARCHAR(255) NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_tea_school (school_id),
      KEY idx_tea_class (school_id, class_name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  smartTTTablesReady = true;
}

function parseSchedulingRulesJson(raw) {
  if (raw == null || raw === '') return { time_preference: 'any' };
  if (typeof raw === 'object') return raw;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : { time_preference: 'any' };
  } catch {
    return { time_preference: 'any' };
  }
}

function getSchedulingRulesFromConfig(configRow) {
  if (!configRow) return { time_preference: 'any' };
  return parseSchedulingRulesJson(configRow.scheduling_rules_json);
}

function slotMatchesSchedulingRules(slot, rules = {}) {
  const pref = String(rules.time_preference || 'any').toLowerCase();
  const start = timeToMins(slot.start_time);
  const end = timeToMins(slot.end_time);
  if (pref === 'morning') {
    const latestEnd = timeToMins(rules.latest_end || '12:00');
    return end <= latestEnd;
  }
  if (pref === 'afternoon') {
    const earliestStart = timeToMins(rules.earliest_start || '12:00');
    return start >= earliestStart;
  }
  if (pref === 'custom') {
    const es = rules.earliest_start ? timeToMins(rules.earliest_start) : 0;
    const le = rules.latest_end ? timeToMins(rules.latest_end) : 24 * 60;
    return start >= es && end <= le;
  }
  return true;
}

function scoreSlotForSchedulingRules(slot, rules = {}) {
  if (!slotMatchesSchedulingRules(slot, rules)) return -1;
  const pref = String(rules.time_preference || 'any').toLowerCase();
  if (pref === 'custom' && rules.preferred_start) {
    return 1000 - Math.abs(timeToMins(slot.start_time) - timeToMins(rules.preferred_start));
  }
  if (pref === 'morning') return 1000 - timeToMins(slot.start_time);
  if (pref === 'afternoon') return timeToMins(slot.start_time);
  return 500;
}

function orderSlotsBySchedulingRules(slots, rules = {}) {
  const pref = String(rules.time_preference || 'any').toLowerCase();
  if (pref === 'any') return [...slots];
  const scored = slots
    .map((slot) => ({ slot, score: scoreSlotForSchedulingRules(slot, rules) }))
    .filter((x) => x.score >= 0)
    .sort((a, b) => b.score - a.score);
  if (scored.length) return scored.map((x) => x.slot);
  return [...slots];
}

function schedulingRuleLabel(rules = {}) {
  const pref = String(rules.time_preference || 'any').toLowerCase();
  if (pref === 'morning') return `Morning only (end by ${rules.latest_end || '12:00'})`;
  if (pref === 'afternoon') return `Afternoon only (from ${rules.earliest_start || '12:00'})`;
  if (pref === 'custom') {
    const parts = [];
    if (rules.earliest_start) parts.push(`from ${rules.earliest_start}`);
    if (rules.latest_end) parts.push(`until ${rules.latest_end}`);
    if (rules.preferred_start) parts.push(`prefer ${rules.preferred_start}`);
    return parts.length ? parts.join(', ') : 'Custom time window';
  }
  return 'Any time';
}

// ── School Schedule CRUD ──
router.get('/dos/timetable-system/schedule', requireRole(DOS_ACADEMIC_ADMIN), async (req, res) => {
  try {
    await ensureSmartTimetableTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'Invalid session' });
    const [[row]] = await promisePool.query('SELECT * FROM timetable_school_schedule WHERE school_id = ? LIMIT 1', [schoolId]);
    const schedule = row || {
      day_start_time: '08:00', day_end_time: '17:00', period_duration_mins: 40,
      active_days_json: JSON.stringify(['Monday','Tuesday','Wednesday','Thursday','Friday']),
      breaks_json: JSON.stringify([{ name:'Break', start:'10:30', end:'11:00' },{ name:'Lunch', start:'13:00', end:'14:00' }]),
    };
    if (typeof schedule.active_days_json === 'string') schedule.active_days = JSON.parse(schedule.active_days_json);
    else schedule.active_days = schedule.active_days_json || ['Monday','Tuesday','Wednesday','Thursday','Friday'];
    if (typeof schedule.breaks_json === 'string') schedule.breaks = JSON.parse(schedule.breaks_json);
    else schedule.breaks = schedule.breaks_json || [];

    const slots = generateTimeSlots(schedule);
    return res.json({ success: true, data: { ...schedule, generated_slots: slots } });
  } catch (err) {
    console.error('GET /dos/timetable-system/schedule:', err);
    return res.status(500).json({ success: false, message: 'Failed to load schedule' });
  }
});

function generateTimeSlots(schedule) {
  const startMins = timeToMins(schedule.day_start_time || '08:00');
  const endMins = timeToMins(schedule.day_end_time || '17:00');
  const duration = Number(schedule.period_duration_mins) || 40;
  const breaks = (schedule.breaks || []).map(b => ({ name: b.name, start: timeToMins(b.start), end: timeToMins(b.end) })).sort((a,b) => a.start - b.start);
  const slots = [];
  let cursor = startMins;
  let sortOrder = 1;
  let periodNum = 1;

  while (cursor < endMins) {
    const brk = breaks.find(b => cursor >= b.start && cursor < b.end);
    if (brk) {
      slots.push({ sort_order: sortOrder++, period_name: brk.name, start_time: minsToTime(brk.start), end_time: minsToTime(brk.end), is_break: true });
      cursor = brk.end;
      continue;
    }

    const nextBreak = breaks.find(b => b.start > cursor);
    let slotEnd = cursor + duration;

    if (nextBreak && slotEnd > nextBreak.start) {
      if (nextBreak.start - cursor >= 10) {
        slotEnd = nextBreak.start;
      } else {
        cursor = nextBreak.start;
        continue;
      }
    }

    if (slotEnd > endMins) slotEnd = endMins;
    if (slotEnd - cursor < 10) break;

    slots.push({ sort_order: sortOrder++, period_name: `Period ${periodNum}`, start_time: minsToTime(cursor), end_time: minsToTime(slotEnd), is_break: false });
    periodNum++;
    cursor = slotEnd;
  }
  return slots;
}

function minsToTime(m) {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

function parseExtraActivityDays(row) {
  if (Array.isArray(row?.days)) return row.days.filter(Boolean);
  if (typeof row?.days_json === 'string') {
    try { return JSON.parse(row.days_json).filter(Boolean); } catch { return []; }
  }
  return [];
}

function getTeachingSlotsFromSchedule(scheduleOrSlots) {
  const slots = Array.isArray(scheduleOrSlots)
    ? scheduleOrSlots
    : generateTimeSlots(scheduleOrSlots || {});
  return slots.filter((s) => !s.is_break && !String(s.period_name || '').toLowerCase().match(/break|lunch|correction|free/));
}

function extraActivityAppliesToClass(activity, className) {
  const cn = trimStr(activity?.class_name);
  if (!cn || cn === '*' || cn.toUpperCase() === 'ALL') return true;
  return cn === trimStr(className);
}

function slotsOverlappingTimeRange(teachingSlots, startTime, endTime) {
  const start = String(startTime || '').slice(0, 5);
  const end = String(endTime || '').slice(0, 5);
  return teachingSlots.filter((s) =>
    timeToMins(s.start_time) < timeToMins(end) && timeToMins(start) < timeToMins(s.end_time)
  );
}

function countExtraActivityWeeklySlots(activity, teachingSlots, activeDays) {
  const days = parseExtraActivityDays(activity);
  let count = 0;
  for (const day of days) {
    if (activeDays?.length && !activeDays.includes(day)) continue;
    count += slotsOverlappingTimeRange(teachingSlots, activity.start_time, activity.end_time).length;
  }
  return count;
}

function seedClassUsedFromExtraActivities(classUsedMaps, classNames, extraActivities, teachingSlots, activeDays) {
  for (const className of classNames) {
    const classUsed = classUsedMaps.get(className);
    if (!classUsed) continue;
    for (const act of extraActivities || []) {
      if (!extraActivityAppliesToClass(act, className)) continue;
      for (const day of parseExtraActivityDays(act)) {
        if (activeDays?.length && !activeDays.includes(day)) continue;
        for (const slot of slotsOverlappingTimeRange(teachingSlots, act.start_time, act.end_time)) {
          classUsed.set(`${className}__${day}__${slot.start_time}`, `__extra__${act.activity_name}`);
        }
      }
    }
  }
}

async function loadExtraActivitiesForSchool(schoolId, term, academicYear) {
  const params = [schoolId];
  let sql = 'SELECT * FROM timetable_extra_activities WHERE school_id = ?';
  if (term) { sql += ' AND (term IS NULL OR TRIM(term) = \'\' OR TRIM(term) = ?)'; params.push(trimStr(term)); }
  if (academicYear) { sql += ' AND (academic_year IS NULL OR TRIM(academic_year) = \'\' OR TRIM(academic_year) = ?)'; params.push(trimStr(academicYear)); }
  sql += ' ORDER BY class_name ASC, start_time ASC';
  const [rows] = await promisePool.query(sql, params);
  return (rows || []).map((r) => ({
    ...r,
    days: parseExtraActivityDays(r),
  }));
}

function validateExtraActivityPlacement({
  schoolId,
  className,
  days,
  startTime,
  endTime,
  activities,
  assignments,
  teachingSlots,
  activeDays,
  timetableRows,
  excludeId,
  excludeIds = [],
}) {
  const skipIds = new Set([...(excludeIds || []), ...(excludeId ? [Number(excludeId)] : [])].filter((id) => id > 0));
  const shouldSkipActivity = (actId) => skipIds.has(Number(actId));
  const shouldSkipTimetableRow = (row) => row.extra_activity_id != null && skipIds.has(Number(row.extra_activity_id));

  const assignedPeriods = (assignments || [])
    .filter((a) => trimStr(a.class_name) === trimStr(className))
    .reduce((s, a) => s + (Number(a.periods_per_week) || 0), 0);
  const teachingPerWeek = teachingSlots.length * (activeDays?.length || 5);
  let extraUsed = 0;
  for (const a of activities || []) {
    if (shouldSkipActivity(a.id)) continue;
    if (!extraActivityAppliesToClass(a, className)) continue;
    extraUsed += countExtraActivityWeeklySlots(a, teachingSlots, activeDays);
  }
  const slotsNeeded = (days || []).reduce(
    (s, day) => s + slotsOverlappingTimeRange(teachingSlots, startTime, endTime).length,
    0
  );
  const remaining = Math.max(0, teachingPerWeek - assignedPeriods - extraUsed);
  const conflicts = [];
  const start = String(startTime || '').slice(0, 5);
  const end = String(endTime || '').slice(0, 5);

  for (const day of days || []) {
    for (const act of activities || []) {
      if (shouldSkipActivity(act.id)) continue;
      if (!extraActivityAppliesToClass(act, className)) continue;
      if (!parseExtraActivityDays(act).includes(day)) continue;
      if (timeToMins(start) < timeToMins(act.end_time) && timeToMins(act.start_time) < timeToMins(end)) {
        conflicts.push({ type: 'extra_overlap', day, message: `Overlaps "${act.activity_name}"` });
      }
    }
    for (const row of timetableRows || []) {
      if (trimStr(row.class_name) !== trimStr(className)) continue;
      if (row.day_of_week !== day) continue;
      if (shouldSkipTimetableRow(row)) continue;
      if (timeToMins(start) < timeToMins(row.end_time) && timeToMins(row.start_time) < timeToMins(end)) {
        const label = row.extra_activity_id ? row.subject_name : `${row.subject_name} lesson`;
        conflicts.push({ type: row.extra_activity_id ? 'extra_overlap' : 'lesson_overlap', day, message: `Overlaps ${label}` });
      }
    }
  }

  const suggestions = [];
  if (slotsNeeded > remaining || conflicts.length || slotsNeeded === 0) {
    for (const day of activeDays || []) {
      for (const slot of teachingSlots) {
        const blocked = (timetableRows || []).some(
          (r) => trimStr(r.class_name) === trimStr(className) && r.day_of_week === day
            && !shouldSkipTimetableRow(r)
            && timeToMins(slot.start_time) < timeToMins(r.end_time) && timeToMins(r.start_time) < timeToMins(slot.end_time)
        ) || (activities || []).some((a) => {
          if (shouldSkipActivity(a.id)) return false;
          if (!extraActivityAppliesToClass(a, className)) return false;
          return parseExtraActivityDays(a).includes(day)
            && timeToMins(slot.start_time) < timeToMins(a.end_time) && timeToMins(a.start_time) < timeToMins(slot.end_time);
        });
        if (!blocked) {
          suggestions.push({
            day,
            start_time: slot.start_time,
            end_time: slot.end_time,
            period_name: slot.period_name,
          });
        }
        if (suggestions.length >= 8) break;
      }
      if (suggestions.length >= 8) break;
    }
  }

  const ok = conflicts.length === 0 && slotsNeeded > 0 && slotsNeeded <= remaining;
  return {
    ok,
    class_name: trimStr(className),
    slots_needed: slotsNeeded,
    capacity: {
      teaching_slots_per_week: teachingPerWeek,
      assigned_periods: assignedPeriods,
      extra_slots_used: extraUsed,
      remaining_for_extra: remaining,
      total_committed: assignedPeriods + extraUsed,
    },
    conflicts,
    suggestions,
    messages: [
      ...(slotsNeeded === 0 ? ['Time range does not match any teaching period slot.'] : []),
      ...(slotsNeeded > remaining ? [`Only ${remaining} slot(s) available for extra activities this week.`] : []),
      ...(conflicts.length ? [`${conflicts.length} conflict(s) on selected days.`] : []),
    ],
  };
}

function resolveExtraActivityClassNames(body = {}) {
  if (Array.isArray(body.class_names) && body.class_names.length) {
    return [...new Set(body.class_names.map((c) => trimStr(c)).filter(Boolean))];
  }
  const single = trimStr(body.class_name);
  return single ? [single] : [];
}

async function loadExtraActivityValidationContext(schoolId, term, academicYear) {
  const [[scheduleRow]] = await promisePool.query('SELECT * FROM timetable_school_schedule WHERE school_id = ? LIMIT 1', [schoolId]);
  const schedule = scheduleRow || { day_start_time: '08:00', day_end_time: '17:00', period_duration_mins: 40, breaks_json: '[]' };
  if (typeof schedule.breaks_json === 'string') schedule.breaks = JSON.parse(schedule.breaks_json);
  else schedule.breaks = schedule.breaks_json || [];
  const activeDays = typeof schedule.active_days_json === 'string'
    ? JSON.parse(schedule.active_days_json)
    : (schedule.active_days_json || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
  const teachingSlots = getTeachingSlotsFromSchedule(schedule);
  const activities = await loadExtraActivitiesForSchool(schoolId, term, academicYear);
  const [allAssignments] = await promisePool.query('SELECT * FROM timetable_assignments WHERE school_id = ?', [schoolId]);
  const ttWhere = ['school_id = ?'];
  const ttParams = [schoolId];
  if (term) { ttWhere.push('TRIM(COALESCE(term, \'\')) = ?'); ttParams.push(trimStr(term)); }
  if (academicYear) { ttWhere.push('TRIM(COALESCE(academic_year, \'\')) = ?'); ttParams.push(trimStr(academicYear)); }
  const [allTimetableRows] = await promisePool.query(
    `SELECT id, class_name, subject_name, day_of_week, start_time, end_time, extra_activity_id FROM academic_timetables WHERE ${ttWhere.join(' AND ')}`,
    ttParams
  );
  return { teachingSlots, activeDays, activities, allAssignments, allTimetableRows };
}

async function syncExtraActivityToTimetable(schoolId, activity) {
  const id = Number(activity.id);
  if (!id) return;
  const className = trimStr(activity.class_name);
  const activityName = trimStr(activity.activity_name);
  const days = parseExtraActivityDays(activity);
  const startTime = String(activity.start_time || '').slice(0, 5);
  const endTime = String(activity.end_time || '').slice(0, 5);
  const term = trimStr(activity.term) || null;
  const academicYear = trimStr(activity.academic_year) || null;

  const [[scheduleRow]] = await promisePool.query(
    'SELECT * FROM timetable_school_schedule WHERE school_id = ? LIMIT 1',
    [schoolId]
  );
  const schedule = scheduleRow || { day_start_time: '08:00', day_end_time: '17:00', period_duration_mins: 40, breaks_json: '[]' };
  if (typeof schedule.breaks_json === 'string') schedule.breaks = JSON.parse(schedule.breaks_json);
  const teachingSlots = getTeachingSlotsFromSchedule(schedule);
  const overlappingSlots = slotsOverlappingTimeRange(teachingSlots, startTime, endTime);

  await promisePool.query(
    'DELETE FROM academic_timetables WHERE school_id = ? AND extra_activity_id = ?',
    [schoolId, id]
  );

  for (const day of days) {
    const slotsToWrite = overlappingSlots.length
      ? overlappingSlots
      : [{ start_time: startTime, end_time: endTime }];

    for (const slot of slotsToWrite) {
      const slotStart = String(slot.start_time || '').slice(0, 5);
      const slotEnd = String(slot.end_time || '').slice(0, 5);
      await promisePool.query(
        `INSERT INTO academic_timetables
          (school_id, class_name, subject_name, staff_id, day_of_week, start_time, end_time, room, term, academic_year, extra_activity_id)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        [schoolId, className, activityName, null, day, slotStart, slotEnd, 'EXTRA', term, academicYear, id]
      );
    }
  }
}

async function removeExtraActivityFromTimetable(schoolId, extraActivityId) {
  await promisePool.query(
    'DELETE FROM academic_timetables WHERE school_id = ? AND extra_activity_id = ?',
    [schoolId, Number(extraActivityId)]
  );
}

async function resyncExtraActivitiesForClasses(schoolId, classNames, term, academicYear) {
  const names = [...new Set((classNames || []).map((c) => trimStr(c)).filter(Boolean))];
  if (!names.length) return;
  const activities = await loadExtraActivitiesForSchool(schoolId, term, academicYear);
  for (const act of activities) {
    if (!names.includes(trimStr(act.class_name))) continue;
    await syncExtraActivityToTimetable(schoolId, act);
  }
}

function resolveExcludeActivityIds(body = {}) {
  const ids = new Set();
  if (body.exclude_id != null) ids.add(Number(body.exclude_id));
  if (Array.isArray(body.exclude_ids)) {
    for (const id of body.exclude_ids) {
      if (id != null && !Number.isNaN(Number(id))) ids.add(Number(id));
    }
  }
  return [...ids].filter((id) => id > 0);
}

async function validateExtraActivityMultiClass(schoolId, {
  classNames, days, startTime, endTime, term, academicYear, excludeId, excludeIds = [],
}) {
  const skipIds = new Set([...(excludeIds || []), ...(excludeId ? [excludeId] : [])].filter((id) => id > 0));
  const names = [...new Set((classNames || []).map((c) => trimStr(c)).filter(Boolean))];
  if (!names.length) {
    return {
      ok: false,
      class_count: 0,
      by_class: {},
      ok_classes: [],
      failed_classes: [],
      messages: ['Select at least one class'],
    };
  }

  const ctx = await loadExtraActivityValidationContext(schoolId, term, academicYear);
  const by_class = {};
  const ok_classes = [];
  const failed_classes = [];

  for (const className of names) {
    const assignments = (ctx.allAssignments || []).filter((a) => trimStr(a.class_name) === className);
    const timetableRows = (ctx.allTimetableRows || []).filter((r) => trimStr(r.class_name) === className);
    const result = validateExtraActivityPlacement({
      schoolId,
      className,
      days,
      startTime,
      endTime,
      activities: ctx.activities,
      assignments,
      teachingSlots: ctx.teachingSlots,
      activeDays: ctx.activeDays,
      timetableRows,
      excludeId: skipIds.size === 1 ? [...skipIds][0] : null,
      excludeIds: [...skipIds],
    });
    by_class[className] = result;
    if (result.ok) ok_classes.push(className);
    else failed_classes.push(className);
  }

  const slotsNeeded = by_class[names[0]]?.slots_needed || 0;
  const ok = failed_classes.length === 0;
  const suggestions = failed_classes.length === 1 ? (by_class[failed_classes[0]]?.suggestions || []) : [];

  return {
    ok,
    class_count: names.length,
    ok_count: ok_classes.length,
    failed_count: failed_classes.length,
    slots_needed: slotsNeeded,
    by_class,
    ok_classes,
    failed_classes,
    conflicts: failed_classes.flatMap((c) => (by_class[c]?.conflicts || []).map((x) => ({ ...x, class_name: c }))),
    suggestions,
    messages: ok
      ? [`All ${names.length} selected class(es) can use this time slot`]
      : [
        `${failed_classes.length} of ${names.length} class(es) cannot use this slot: ${failed_classes.join(', ')}`,
        ...failed_classes.flatMap((c) => (by_class[c]?.messages || []).map((m) => `${c}: ${m}`)),
      ],
  };
}

router.put('/dos/timetable-system/schedule', requireRole(DOS_ACADEMIC_ADMIN), async (req, res) => {
  try {
    await ensureSmartTimetableTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'Invalid session' });
    const { day_start_time, day_end_time, period_duration_mins, active_days, breaks: breaksArr } = req.body || {};
    const activeDays = JSON.stringify(active_days || ['Monday','Tuesday','Wednesday','Thursday','Friday']);
    const breaksJson = JSON.stringify(breaksArr || []);
    await promisePool.query(
      `INSERT INTO timetable_school_schedule (school_id, day_start_time, day_end_time, period_duration_mins, active_days_json, breaks_json)
       VALUES (?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE day_start_time=VALUES(day_start_time), day_end_time=VALUES(day_end_time),
         period_duration_mins=VALUES(period_duration_mins), active_days_json=VALUES(active_days_json), breaks_json=VALUES(breaks_json)`,
      [schoolId, day_start_time || '08:00', day_end_time || '17:00', Number(period_duration_mins) || 40, activeDays, breaksJson]
    );
    const schedule = { day_start_time, day_end_time, period_duration_mins: Number(period_duration_mins) || 40, active_days: active_days || [], breaks: breaksArr || [] };
    const slots = generateTimeSlots(schedule);

    await promisePool.query('DELETE FROM school_periods WHERE school_id = ?', [schoolId]);
    for (const slot of slots) {
      await promisePool.query(
        'INSERT INTO school_periods (school_id, period_name, start_time, end_time, is_break, sort_order) VALUES (?,?,?,?,?,?)',
        [schoolId, slot.period_name, slot.start_time, slot.end_time, slot.is_break ? 1 : 0, slot.sort_order]
      );
    }
    return res.json({ success: true, message: 'Schedule saved', data: { generated_slots: slots } });
  } catch (err) {
    console.error('PUT /dos/timetable-system/schedule:', err);
    return res.status(500).json({ success: false, message: 'Failed to save schedule' });
  }
});

// ── Teacher Profiles CRUD ──
router.get('/dos/timetable-system/teacher-profiles', requireRole(DOS_ACADEMIC_ADMIN), async (req, res) => {
  try {
    await ensureSmartTimetableTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'Invalid session' });
    const [rows] = await promisePool.query(
      `SELECT tp.*, u.id AS user_id,
              TRIM(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))) AS teacher_name,
              u.email, u.is_active
       FROM timetable_teacher_profiles tp
       INNER JOIN users u ON u.id = tp.teacher_user_id
       WHERE tp.school_id = ? AND u.deleted_at IS NULL
       ORDER BY teacher_name ASC`, [schoolId]
    );
    const profiles = rows.map(r => ({
      ...r,
      subjects: typeof r.subjects_json === 'string' ? JSON.parse(r.subjects_json) : (r.subjects_json || []),
      available_days: typeof r.available_days_json === 'string' ? JSON.parse(r.available_days_json) : (r.available_days_json || []),
      preferred_slots: typeof r.preferred_slots_json === 'string' ? JSON.parse(r.preferred_slots_json) : (r.preferred_slots_json || []),
    }));
    return res.json({ success: true, data: profiles });
  } catch (err) {
    console.error('GET /dos/timetable-system/teacher-profiles:', err);
    return res.status(500).json({ success: false, message: 'Failed to load teacher profiles' });
  }
});

router.put('/dos/timetable-system/teacher-profiles/:teacherId', requireRole(DOS_ACADEMIC_ADMIN), async (req, res) => {
  try {
    await ensureSmartTimetableTables();
    const schoolId = resolveSchoolId(req);
    const teacherId = Number(req.params.teacherId);
    if (!schoolId || !teacherId) return res.status(400).json({ success: false, message: 'Invalid request' });
    if (!(await assertTeachingStaffForSchool(schoolId, teacherId))) {
      return res.status(400).json({ success: false, message: 'Selected user must have the Teacher role.' });
    }
    const { subjects, max_periods_per_day, available_days, preferred_slots, department } = req.body || {};
    await promisePool.query(
      `INSERT INTO timetable_teacher_profiles (school_id, teacher_user_id, subjects_json, max_periods_per_day, available_days_json, preferred_slots_json, department)
       VALUES (?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE subjects_json=VALUES(subjects_json), max_periods_per_day=VALUES(max_periods_per_day),
         available_days_json=VALUES(available_days_json), preferred_slots_json=VALUES(preferred_slots_json), department=VALUES(department)`,
      [schoolId, teacherId, JSON.stringify(subjects || []), Number(max_periods_per_day) || 6,
       JSON.stringify(available_days || []), JSON.stringify(preferred_slots || []), trimStr(department) || null]
    );
    return res.json({ success: true, message: 'Teacher profile saved' });
  } catch (err) {
    console.error('PUT /dos/timetable-system/teacher-profiles:', err);
    return res.status(500).json({ success: false, message: 'Failed to save profile' });
  }
});

// ── Course Config CRUD ──
router.get('/dos/timetable-system/course-config', requireRole(DOS_ACADEMIC_ADMIN), async (req, res) => {
  try {
    await ensureSmartTimetableTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'Invalid session' });
    const [rows] = await promisePool.query('SELECT * FROM timetable_course_config WHERE school_id = ? ORDER BY subject_name ASC', [schoolId]);
    const data = (rows || []).map((r) => ({
      ...r,
      scheduling_rules: getSchedulingRulesFromConfig(r),
    }));
    return res.json({ success: true, data });
  } catch (err) {
    console.error('GET /dos/timetable-system/course-config:', err);
    return res.status(500).json({ success: false, message: 'Failed to load course config' });
  }
});

router.put('/dos/timetable-system/course-config/:subjectName', requireRole(DOS_ACADEMIC_ADMIN), async (req, res) => {
  try {
    await ensureSmartTimetableTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'Invalid session' });
    const subjectName = decodeURIComponent(req.params.subjectName);
    const {
      default_duration_mins, requires_lab, is_double_period, priority_level, department, periods_per_week,
      scheduling_rules,
    } = req.body || {};
    const rulesJson = scheduling_rules != null ? JSON.stringify(scheduling_rules) : null;
    await promisePool.query(
      `INSERT INTO timetable_course_config (school_id, subject_name, default_duration_mins, requires_lab, is_double_period, priority_level, department, periods_per_week, scheduling_rules_json)
       VALUES (?,?,?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE default_duration_mins=VALUES(default_duration_mins), requires_lab=VALUES(requires_lab),
         is_double_period=VALUES(is_double_period), priority_level=VALUES(priority_level), department=VALUES(department),
         periods_per_week=VALUES(periods_per_week), scheduling_rules_json=VALUES(scheduling_rules_json)`,
      [schoolId, subjectName, Number(default_duration_mins) || 40, requires_lab ? 1 : 0, is_double_period ? 1 : 0,
       priority_level || 'medium', trimStr(department) || null, Number(periods_per_week) || 3, rulesJson]
    );
    return res.json({ success: true, message: 'Course config saved' });
  } catch (err) {
    console.error('PUT /dos/timetable-system/course-config:', err);
    return res.status(500).json({ success: false, message: 'Failed to save config' });
  }
});

// ── Timetable view: reads active teacher_assignments (source of truth) ──
router.get('/dos/timetable-system/assignments', requireRole(DOS_ACADEMIC_ADMIN), async (req, res) => {
  try {
    await ensureTeacherAssignmentsTable();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'Invalid session' });
    const ctx = await fetchSchoolAcademicContext(schoolId);
    const academicYear = trimStr(req.query.academic_year) || ctx.academicYear;
    const term = trimStr(req.query.term) || ctx.term;
    const { rows } = await listTeacherAssignmentsForSchool(schoolId, {
      academicYear, term, status: 'active', includeStats: false,
    });
    const data = rows.map((r) => ({
      id: r.id,
      teacher_assignment_id: r.id,
      school_id: r.school_id,
      class_name: r.class_name,
      subject_name: r.subject_name,
      teacher_user_id: r.teacher_user_id,
      teacher_name: r.teacher_name,
      periods_per_week: r.periods_per_week,
      room: r.room,
      academic_year: r.academic_year,
      term: r.term,
      status: r.status,
    }));
    return res.json({ success: true, data, source: 'teacher_assignments' });
  } catch (err) {
    console.error('GET /dos/timetable-system/assignments:', err);
    return res.status(500).json({ success: false, message: 'Failed to load assignments' });
  }
});

/** @deprecated — use POST /dos/teacher-assignments */
router.post('/dos/timetable-system/assignments', requireRole(DOS_ACADEMIC_ADMIN), async (req, res) => {
  try {
    await ensureTeacherAssignmentsTable();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'Invalid session' });
    const { class_name, subject_name, teacher_user_id, periods_per_week, room, academic_year, term } = req.body || {};
    if (!class_name || !subject_name || !teacher_user_id) {
      return res.status(400).json({ success: false, message: 'class_name, subject_name and teacher_user_id required' });
    }
    if (!(await assertTeachingStaffForSchool(schoolId, Number(teacher_user_id)))) {
      return res.status(400).json({ success: false, message: 'Selected user must have the Teacher role.' });
    }
    const created = await createTeacherAssignment(schoolId, {
      class_name, subject_name, teacher_user_id, periods_per_week, room, academic_year, term,
    }, resolveDosUserId(req));
    await syncTeacherAssignmentsToTimetable(schoolId).catch(() => {});
    return res.json({ success: true, message: 'Teacher assignment saved', data: created });
  } catch (err) {
    console.error('POST /dos/timetable-system/assignments:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to save assignment' });
  }
});

router.post('/dos/timetable-system/assignments/bulk', requireRole(DOS_ACADEMIC_ADMIN), async (req, res) => {
  try {
    await ensureTeacherAssignmentsTable();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'Invalid session' });
    const { class_name, subjects, teacher_ids, periods_per_week, academic_year, term } = req.body || {};
    if (!class_name || !Array.isArray(subjects) || !subjects.length || !Array.isArray(teacher_ids) || !teacher_ids.length) {
      return res.status(400).json({ success: false, message: 'class_name, subjects[] and teacher_ids[] required' });
    }
    let inserted = 0;
    for (const teacherId of teacher_ids) {
      if (!(await assertTeachingStaffForSchool(schoolId, Number(teacherId)))) {
        return res.status(400).json({ success: false, message: 'All selected teachers must have the Teacher role.' });
      }
    }
    for (const subjectName of subjects) {
      if (isClassTeacherSubject(subjectName)) continue;
      for (const teacherId of teacher_ids) {
        try {
          await createTeacherAssignment(schoolId, {
            class_name,
            subject_name: subjectName,
            teacher_user_id: teacherId,
            periods_per_week,
            academic_year,
            term,
          }, resolveDosUserId(req));
          inserted += 1;
        } catch { /* duplicate scope */ }
      }
    }
    await syncTeacherAssignmentsToTimetable(schoolId).catch(() => {});
    return res.json({ success: true, message: `Created ${inserted} assignments`, data: { inserted } });
  } catch (err) {
    console.error('POST /dos/timetable-system/assignments/bulk:', err);
    return res.status(500).json({ success: false, message: 'Failed to save assignments' });
  }
});

// ── Teacher Assignments (source of truth for marks + timetable) ──
router.get('/dos/teacher-assignments/overview', requireRole(DOS_ACADEMIC_ADMIN), async (req, res) => {
  try {
    await ensureTeacherAssignmentsTable();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'Invalid session' });
    const ctx = await fetchSchoolAcademicContext(schoolId);
    const academicYear = trimStr(req.query.academic_year) || ctx.academicYear;
    const term = trimStr(req.query.term) || ctx.term;
    const status = trimStr(req.query.status) || 'active';
    const result = await buildTeacherAssignmentsOverview(schoolId, { academicYear, term, status });
    return res.json({ success: true, data: result });
  } catch (err) {
    console.error('GET /dos/teacher-assignments/overview:', err);
    return res.status(500).json({ success: false, message: 'Failed to load teacher overview' });
  }
});

router.get('/dos/teacher-assignments', requireRole(DOS_ACADEMIC_ADMIN), async (req, res) => {
  try {
    await ensureTeacherAssignmentsTable();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'Invalid session' });
    const ctx = await fetchSchoolAcademicContext(schoolId);
    const academicYear = trimStr(req.query.academic_year) || ctx.academicYear;
    const term = trimStr(req.query.term) || ctx.term;
    const status = trimStr(req.query.status) || null;
    const result = await listTeacherAssignmentsForSchool(schoolId, { academicYear, term, status });
    return res.json({ success: true, data: result });
  } catch (err) {
    console.error('GET /dos/teacher-assignments:', err);
    return res.status(500).json({ success: false, message: 'Failed to load teacher assignments' });
  }
});

router.get('/dos/teaching-assignments', requireRole(DOS_ACADEMIC_ADMIN), async (req, res) => {
  try {
    await ensureTeacherAssignmentsTable();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'Invalid session' });
    const ctx = await fetchSchoolAcademicContext(schoolId);
    const academicYear = trimStr(req.query.academic_year) || ctx.academicYear;
    const term = trimStr(req.query.term) || ctx.term;
    const result = await listTeacherAssignmentsForSchool(schoolId, { academicYear, term });
    return res.json({ success: true, data: result });
  } catch (err) {
    console.error('GET /dos/teaching-assignments:', err);
    return res.status(500).json({ success: false, message: 'Failed to load teacher assignments' });
  }
});

router.post('/dos/teacher-assignments', requireRole(DOS_ACADEMIC_ADMIN), async (req, res) => {
  try {
    await ensureTeacherAssignmentsTable();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'Invalid session' });
    const {
      class_name,
      class_names,
      subject_name,
      teacher_user_id,
      academic_year,
      term,
      periods_per_week,
      room,
    } = req.body || {};

    const classList = Array.isArray(class_names) && class_names.length
      ? class_names.map((c) => trimStr(c)).filter(Boolean)
      : (class_name ? [trimStr(class_name)] : []);

    if (!classList.length || !subject_name || !teacher_user_id) {
      return res.status(400).json({
        success: false,
        message: 'At least one class, subject_name and teacher_user_id required',
      });
    }
    if (!(await assertTeachingStaffForSchool(schoolId, Number(teacher_user_id)))) {
      return res.status(400).json({ success: false, message: 'Selected user must have the Teacher role.' });
    }

    const created = [];
    const skipped = [];
    for (const cn of classList) {
      try {
        created.push(await createTeacherAssignment(schoolId, {
          class_name: cn,
          subject_name,
          teacher_user_id,
          academic_year,
          term,
          periods_per_week,
          room,
        }, resolveDosUserId(req)));
      } catch (err) {
        skipped.push({ class_name: cn, message: err.message || 'Failed' });
      }
    }

    if (!created.length) {
      return res.status(400).json({
        success: false,
        message: skipped[0]?.message || 'No assignments created',
        data: { created, skipped },
      });
    }

    await syncTeacherAssignmentsToTimetable(schoolId).catch(() => {});
    const msg = created.length === 1
      ? 'Teacher assignment saved'
      : `${created.length} assignments saved${skipped.length ? ` (${skipped.length} skipped)` : ''}`;
    return res.json({ success: true, message: msg, data: { created, skipped } });
  } catch (err) {
    console.error('POST /dos/teacher-assignments:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to save assignment' });
  }
});

router.put('/dos/teacher-assignments/:id', requireRole(DOS_ACADEMIC_ADMIN), async (req, res) => {
  try {
    await ensureTeacherAssignmentsTable();
    const schoolId = resolveSchoolId(req);
    const id = Number(req.params.id);
    const { periods_per_week, room, teacher_user_id, class_name, subject_name, supersede } = req.body || {};

    if (supersede || teacher_user_id != null || class_name || subject_name) {
      const result = await supersedeTeacherAssignment(schoolId, id, {
        teacher_user_id, class_name, subject_name, periods_per_week, room,
      }, resolveDosUserId(req));
      await syncTeacherAssignmentsToTimetable(schoolId).catch(() => {});
      return res.json({ success: true, ...result });
    }

    await updateTeacherAssignmentSafe(schoolId, id, { periods_per_week, room });
    await syncTeacherAssignmentsToTimetable(schoolId).catch(() => {});
    return res.json({ success: true, message: 'Assignment updated (timetable settings only — marks unchanged)' });
  } catch (err) {
    console.error('PUT /dos/teacher-assignments/:id:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to update assignment' });
  }
});

router.post('/dos/teacher-assignments/:id/archive', requireRole(DOS_ACADEMIC_ADMIN), async (req, res) => {
  try {
    await ensureTeacherAssignmentsTable();
    const schoolId = resolveSchoolId(req);
    const result = await archiveTeacherAssignment(schoolId, Number(req.params.id));
    await syncTeacherAssignmentsToTimetable(schoolId).catch(() => {});
    return res.json({ success: true, data: result, message: result.message });
  } catch (err) {
    console.error('POST archive teacher-assignment:', err);
    return res.status(500).json({ success: false, message: 'Failed to archive assignment' });
  }
});

router.get('/dos/teacher-assignments/:id/history', requireRole(DOS_ACADEMIC_ADMIN), async (req, res) => {
  try {
    await ensureTeacherAssignmentsTable();
    const schoolId = resolveSchoolId(req);
    const chain = await fetchAssignmentHistory(schoolId, Number(req.params.id));
    return res.json({ success: true, data: { history: chain } });
  } catch (err) {
    console.error('GET teacher-assignment history:', err);
    return res.status(500).json({ success: false, message: 'Failed to load history' });
  }
});

router.post('/dos/teacher-assignments/sync-to-timetable', requireRole(DOS_ACADEMIC_ADMIN), async (req, res) => {
  try {
    await ensureTeacherAssignmentsTable();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'Invalid session' });
    const result = await syncTeacherAssignmentsToTimetable(schoolId);
    return res.json({
      success: true,
      message: `Synced ${result.synced} assignment(s) to timetable for ${result.academic_year} · ${result.term}`,
      data: result,
    });
  } catch (err) {
    console.error('POST sync-to-timetable:', err);
    return res.status(500).json({ success: false, message: 'Failed to sync to timetable' });
  }
});

router.post('/dos/teacher-assignments/sync-from-timetable', requireRole(DOS_ACADEMIC_ADMIN), async (req, res) => {
  try {
    await ensureTeacherAssignmentsTable();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'Invalid session' });
    const result = await syncTeachingAssignmentsFromTimetable(schoolId, resolveDosUserId(req));
    return res.json({
      success: true,
      message: `Imported ${result.synced} assignment(s) from legacy timetable`,
      data: result,
    });
  } catch (err) {
    console.error('POST sync-from-timetable:', err);
    return res.status(500).json({ success: false, message: 'Failed to import from timetable' });
  }
});

router.post('/dos/teaching-assignments/sync-from-timetable', requireRole(DOS_ACADEMIC_ADMIN), async (req, res) => {
  try {
    await ensureTeacherAssignmentsTable();
    const schoolId = resolveSchoolId(req);
    const result = await syncTeachingAssignmentsFromTimetable(schoolId, resolveDosUserId(req));
    return res.json({
      success: true,
      message: `Synced ${result.synced} teaching assignment(s) for ${result.academic_year} · ${result.term}`,
      data: result,
    });
  } catch (err) {
    console.error('POST /dos/teaching-assignments/sync-from-timetable:', err);
    return res.status(500).json({ success: false, message: 'Failed to sync teaching assignments' });
  }
});

router.delete('/dos/teacher-assignments/:id', requireRole(DOS_ACADEMIC_ADMIN), async (req, res) => {
  try {
    await ensureTeacherAssignmentsTable();
    const schoolId = resolveSchoolId(req);
    const result = await removeOrArchiveAssignment(schoolId, Number(req.params.id));
    await syncTeacherAssignmentsToTimetable(schoolId).catch(() => {});
    return res.json({ success: true, data: result, message: result.message });
  } catch (err) {
    console.error('DELETE /dos/teacher-assignments/:id:', err);
    return res.status(500).json({ success: false, message: 'Failed to remove assignment' });
  }
});

router.delete('/dos/teaching-assignments/:id', requireRole(DOS_ACADEMIC_ADMIN), async (req, res) => {
  try {
    await ensureTeacherAssignmentsTable();
    const schoolId = resolveSchoolId(req);
    const result = await removeOrArchiveAssignment(schoolId, Number(req.params.id));
    await syncTeacherAssignmentsToTimetable(schoolId).catch(() => {});
    return res.json({ success: true, data: result, message: result.message });
  } catch (err) {
    console.error('DELETE /dos/teaching-assignments/:id:', err);
    return res.status(500).json({ success: false, message: 'Failed to remove assignment' });
  }
});

router.post('/dos/teaching-assignments', requireRole(DOS_ACADEMIC_ADMIN), async (req, res) => {
  try {
    await ensureTeacherAssignmentsTable();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'Invalid session' });
    const { class_name, subject_name, teacher_user_id, academic_year, term, periods_per_week, room } = req.body || {};
    if (!class_name || !subject_name || !teacher_user_id) {
      return res.status(400).json({ success: false, message: 'class_name, subject_name and teacher_user_id required' });
    }
    if (!(await assertTeachingStaffForSchool(schoolId, Number(teacher_user_id)))) {
      return res.status(400).json({ success: false, message: 'Selected user must have the Teacher role.' });
    }
    const created = await createTeacherAssignment(schoolId, {
      class_name, subject_name, teacher_user_id, academic_year, term, periods_per_week, room,
    }, resolveDosUserId(req));
    await syncTeacherAssignmentsToTimetable(schoolId).catch(() => {});
    return res.json({ success: true, message: 'Teacher assignment saved', data: created });
  } catch (err) {
    console.error('POST /dos/teaching-assignments:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to save assignment' });
  }
});

router.delete('/dos/timetable-system/assignments/:id', requireRole(DOS_ACADEMIC_ADMIN), async (req, res) => {
  try {
    await ensureTeacherAssignmentsTable();
    const schoolId = resolveSchoolId(req);
    const result = await removeOrArchiveAssignment(schoolId, Number(req.params.id));
    await syncTeacherAssignmentsToTimetable(schoolId).catch(() => {});
    return res.json({ success: true, message: result.message, data: result });
  } catch (err) {
    console.error('DELETE /dos/timetable-system/assignments:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete assignment' });
  }
});

router.put('/dos/timetable-system/assignments/:id', requireRole(DOS_ACADEMIC_ADMIN), async (req, res) => {
  try {
    await ensureSmartTimetableTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'Invalid session' });

    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid assignment id' });

    const [rows] = await promisePool.query(
      'SELECT * FROM timetable_assignments WHERE id = ? AND school_id = ? LIMIT 1',
      [id, schoolId]
    );
    if (!rows?.length) return res.status(404).json({ success: false, message: 'Assignment not found' });

    const existing = rows[0];
    const { teacher_user_id, periods_per_week, room } = req.body || {};
    const newTeacherId = teacher_user_id != null ? Number(teacher_user_id) : existing.teacher_user_id;
    const newPeriods = periods_per_week != null ? Math.max(1, Number(periods_per_week) || 1) : existing.periods_per_week;
    const newRoom = room !== undefined ? (trimStr(room) || null) : existing.room;

    if (!newTeacherId) return res.status(400).json({ success: false, message: 'teacher_user_id is required' });
    if (!(await assertTeachingStaffForSchool(schoolId, newTeacherId))) {
      return res.status(400).json({ success: false, message: 'Selected user must have the Teacher role.' });
    }

    if (newTeacherId !== existing.teacher_user_id) {
      const [dup] = await promisePool.query(
        `SELECT id FROM timetable_assignments
         WHERE school_id = ? AND class_name = ? AND subject_name = ? AND teacher_user_id = ? AND id != ?`,
        [schoolId, existing.class_name, existing.subject_name, newTeacherId, id]
      );
      if (dup?.length) {
        return res.status(409).json({
          success: false,
          message: 'That teacher is already assigned to this subject for this class. Edit that row or remove it first.',
        });
      }
      await promisePool.query('DELETE FROM timetable_assignments WHERE id = ? AND school_id = ?', [id, schoolId]);
      await promisePool.query(
        `INSERT INTO timetable_assignments (school_id, class_name, subject_name, teacher_user_id, periods_per_week, room)
         VALUES (?,?,?,?,?,?)`,
        [schoolId, existing.class_name, existing.subject_name, newTeacherId, newPeriods, newRoom]
      );
      return res.json({ success: true, message: 'Assignment updated — teacher changed' });
    }

    await promisePool.query(
      'UPDATE timetable_assignments SET periods_per_week = ?, room = ? WHERE id = ? AND school_id = ?',
      [newPeriods, newRoom, id, schoolId]
    );
    return res.json({ success: true, message: 'Assignment updated' });
  } catch (err) {
    console.error('PUT /dos/timetable-system/assignments/:id:', err);
    return res.status(500).json({ success: false, message: 'Failed to update assignment' });
  }
});

// ── Extra activities (homework, debate, etc.) — display-only, blocks generator slots ──
router.get('/dos/timetable-system/extra-activities', requireRole(DOS_ACADEMIC_ADMIN), async (req, res) => {
  try {
    await ensureSmartTimetableTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'Invalid session' });
    const term = trimStr(req.query?.term);
    const academicYear = trimStr(req.query?.academic_year);
    const className = trimStr(req.query?.class_name);
    const rows = await loadExtraActivitiesForSchool(schoolId, term, academicYear);
    const filtered = className
      ? rows.filter((r) => extraActivityAppliesToClass(r, className))
      : rows;
    return res.json({ success: true, data: filtered });
  } catch (err) {
    console.error('GET /dos/timetable-system/extra-activities:', err);
    return res.status(500).json({ success: false, message: 'Failed to load extra activities' });
  }
});

router.post('/dos/timetable-system/extra-activities/validate', requireRole(DOS_ACADEMIC_ADMIN), async (req, res) => {
  try {
    await ensureSmartTimetableTables();
    await ensureAcademicTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'Invalid session' });

    const body = req.body || {};
    const classNames = resolveExtraActivityClassNames(body);
    const days = Array.isArray(body.days) ? body.days.map((d) => trimStr(d)).filter(Boolean) : [];
    const startTime = trimStr(body.start_time);
    const endTime = trimStr(body.end_time);
    const term = trimStr(body.term);
    const academicYear = trimStr(body.academic_year);
    const excludeId = body.exclude_id != null ? Number(body.exclude_id) : null;
    const excludeIds = resolveExcludeActivityIds(body);

    if (!classNames.length || !days.length || !startTime || !endTime) {
      return res.status(400).json({ success: false, message: 'class_names[], days[], start_time and end_time required' });
    }

    const validation = await validateExtraActivityMultiClass(schoolId, {
      classNames,
      days,
      startTime,
      endTime,
      term,
      academicYear,
      excludeId,
      excludeIds,
    });

    return res.json({ success: true, data: validation });
  } catch (err) {
    console.error('POST /dos/timetable-system/extra-activities/validate:', err);
    return res.status(500).json({ success: false, message: 'Validation failed' });
  }
});

router.post('/dos/timetable-system/extra-activities', requireRole(DOS_ACADEMIC_ADMIN), async (req, res) => {
  try {
    await ensureSmartTimetableTables();
    await ensureAcademicTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'Invalid session' });

    const { activity_name, class_name, class_names, days, start_time, end_time, term, academic_year, notes } = req.body || {};
    const classNames = resolveExtraActivityClassNames({ class_name, class_names });
    const activityName = trimStr(activity_name);
    const dayList = Array.isArray(days) ? days.map((d) => trimStr(d)).filter(Boolean) : [];
    const startTime = trimStr(start_time);
    const endTime = trimStr(end_time);
    const useTerm = trimStr(term) || '';
    const useYear = trimStr(academic_year) || '';

    if (!activityName || !classNames.length || !dayList.length || !startTime || !endTime) {
      return res.status(400).json({ success: false, message: 'activity_name, class_names[], days[], start_time, end_time required' });
    }
    if (timeToMins(startTime) >= timeToMins(endTime)) {
      return res.status(400).json({ success: false, message: 'End time must be after start time' });
    }

    const validation = await validateExtraActivityMultiClass(schoolId, {
      classNames,
      days: dayList,
      startTime,
      endTime,
      term: useTerm,
      academicYear: useYear,
      excludeId: null,
    });
    if (!validation.ok) {
      return res.status(409).json({
        success: false,
        code: 'EXTRA_ACTIVITY_INVALID',
        message: validation.messages.join(' '),
        validation,
      });
    }

    const insertedIds = [];
    for (const className of classNames) {
      const [ins] = await promisePool.query(
        `INSERT INTO timetable_extra_activities (school_id, activity_name, class_name, days_json, start_time, end_time, term, academic_year, notes)
         VALUES (?,?,?,?,?,?,?,?,?)`,
        [schoolId, activityName, className, JSON.stringify(dayList), startTime, endTime, useTerm || null, useYear || null, trimStr(notes) || null]
      );
      const newId = ins.insertId;
      insertedIds.push(newId);
      await syncExtraActivityToTimetable(schoolId, {
        id: newId,
        activity_name: activityName,
        class_name: className,
        days_json: JSON.stringify(dayList),
        start_time: startTime,
        end_time: endTime,
        term: useTerm,
        academic_year: useYear,
      });
    }
    return res.json({
      success: true,
      message: `Extra activity saved for ${classNames.length} class(es) and added to timetables`,
      data: { ids: insertedIds, class_names: classNames, timetable_synced: true },
    });
  } catch (err) {
    console.error('POST /dos/timetable-system/extra-activities:', err);
    return res.status(500).json({ success: false, message: 'Failed to save extra activity' });
  }
});

router.put('/dos/timetable-system/extra-activities/:id', requireRole(DOS_ACADEMIC_ADMIN), async (req, res) => {
  try {
    await ensureSmartTimetableTables();
    await ensureAcademicTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'Invalid session' });
    const id = Number(req.params.id);
    const { activity_name, class_name, days, start_time, end_time, term, academic_year, notes } = req.body || {};
    const className = trimStr(class_name);
    const dayList = Array.isArray(days) ? days.map((d) => trimStr(d)).filter(Boolean) : [];
    const startTime = trimStr(start_time);
    const endTime = trimStr(end_time);
    const useTerm = trimStr(term) || '';
    const useYear = trimStr(academic_year) || '';

    const [[scheduleRow]] = await promisePool.query('SELECT * FROM timetable_school_schedule WHERE school_id = ? LIMIT 1', [schoolId]);
    const schedule = scheduleRow || { day_start_time: '08:00', day_end_time: '17:00', period_duration_mins: 40, breaks_json: '[]' };
    if (typeof schedule.breaks_json === 'string') schedule.breaks = JSON.parse(schedule.breaks_json);
    const activeDays = typeof schedule.active_days_json === 'string'
      ? JSON.parse(schedule.active_days_json)
      : (schedule.active_days_json || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
    const teachingSlots = getTeachingSlotsFromSchedule(schedule);
    const activities = await loadExtraActivitiesForSchool(schoolId, useTerm, useYear);
    const assignments = await fetchTeacherAssignmentsForClass(schoolId, className, useYear, useTerm);
    const ttWhere = ['school_id = ?', 'class_name = ?'];
    const ttParams = [schoolId, className];
    if (useTerm) { ttWhere.push('TRIM(COALESCE(term, \'\')) = ?'); ttParams.push(useTerm); }
    if (useYear) { ttWhere.push('TRIM(COALESCE(academic_year, \'\')) = ?'); ttParams.push(useYear); }
    const [timetableRows] = await promisePool.query(
      `SELECT id, class_name, subject_name, day_of_week, start_time, end_time, extra_activity_id FROM academic_timetables WHERE ${ttWhere.join(' AND ')}`,
      ttParams
    );

    const validation = validateExtraActivityPlacement({
      schoolId,
      className,
      days: dayList,
      startTime,
      endTime,
      activities,
      assignments,
      teachingSlots,
      activeDays,
      timetableRows,
      excludeId: id,
    });
    if (!validation.ok) {
      return res.status(409).json({
        success: false,
        code: 'EXTRA_ACTIVITY_INVALID',
        message: validation.messages.join(' '),
        validation,
      });
    }

    await promisePool.query(
      `UPDATE timetable_extra_activities SET activity_name=?, class_name=?, days_json=?, start_time=?, end_time=?, term=?, academic_year=?, notes=?
       WHERE id=? AND school_id=?`,
      [trimStr(activity_name), className, JSON.stringify(dayList), startTime, endTime, useTerm || null, useYear || null, trimStr(notes) || null, id, schoolId]
    );
    await syncExtraActivityToTimetable(schoolId, {
      id,
      activity_name: trimStr(activity_name),
      class_name: className,
      days_json: JSON.stringify(dayList),
      start_time: startTime,
      end_time: endTime,
      term: useTerm,
      academic_year: useYear,
    });
    return res.json({ success: true, message: 'Extra activity updated and timetable synced', data: { timetable_synced: true } });
  } catch (err) {
    console.error('PUT /dos/timetable-system/extra-activities/:id:', err);
    return res.status(500).json({ success: false, message: 'Failed to update extra activity' });
  }
});

router.delete('/dos/timetable-system/extra-activities/:id', requireRole(DOS_ACADEMIC_ADMIN), async (req, res) => {
  try {
    await ensureSmartTimetableTables();
    const schoolId = resolveSchoolId(req);
    const id = Number(req.params.id);
    await removeExtraActivityFromTimetable(schoolId, id);
    await promisePool.query('DELETE FROM timetable_extra_activities WHERE id = ? AND school_id = ?', [id, schoolId]);
    return res.json({ success: true, message: 'Extra activity removed from timetables' });
  } catch (err) {
    console.error('DELETE /dos/timetable-system/extra-activities/:id:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete extra activity' });
  }
});

router.get('/dos/timetable-system/extra-activities/capacity', requireRole(DOS_ACADEMIC_ADMIN), async (req, res) => {
  try {
    await ensureSmartTimetableTables();
    await ensureAcademicTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'Invalid session' });
    const className = trimStr(req.query?.class_name);
    const term = trimStr(req.query?.term);
    const academicYear = trimStr(req.query?.academic_year);
    if (!className) return res.status(400).json({ success: false, message: 'class_name required' });

    const [[scheduleRow]] = await promisePool.query('SELECT * FROM timetable_school_schedule WHERE school_id = ? LIMIT 1', [schoolId]);
    const schedule = scheduleRow || { day_start_time: '08:00', day_end_time: '17:00', period_duration_mins: 40, breaks_json: '[]' };
    if (typeof schedule.breaks_json === 'string') schedule.breaks = JSON.parse(schedule.breaks_json);
    const activeDays = typeof schedule.active_days_json === 'string'
      ? JSON.parse(schedule.active_days_json)
      : (schedule.active_days_json || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
    const teachingSlots = getTeachingSlotsFromSchedule(schedule);
    const activities = await loadExtraActivitiesForSchool(schoolId, term, academicYear);
    const assignments = await fetchTeacherAssignmentsForClass(schoolId, className, academicYear, term);
    let extraUsed = 0;
    for (const a of activities) {
      if (!extraActivityAppliesToClass(a, className)) continue;
      extraUsed += countExtraActivityWeeklySlots(a, teachingSlots, activeDays);
    }
    const assignedPeriods = assignments.reduce((s, a) => s + (Number(a.periods_per_week) || 0), 0);
    const teachingPerWeek = teachingSlots.length * activeDays.length;

    return res.json({
      success: true,
      data: {
        class_name: className,
        teaching_slots_per_week: teachingPerWeek,
        teaching_periods_per_day: teachingSlots.length,
        active_days: activeDays.length,
        assigned_periods: assignedPeriods,
        extra_slots_used: extraUsed,
        remaining_for_extra: Math.max(0, teachingPerWeek - assignedPeriods - extraUsed),
        total_committed: assignedPeriods + extraUsed,
        balanced: assignedPeriods + extraUsed <= teachingPerWeek,
      },
    });
  } catch (err) {
    console.error('GET /dos/timetable-system/extra-activities/capacity:', err);
    return res.status(500).json({ success: false, message: 'Failed to load capacity' });
  }
});

// ── Teacher Workload ──
router.get('/dos/timetable-system/workload', requireRole(DOS_ACADEMIC_ADMIN), async (req, res) => {
  try {
    await ensureSmartTimetableTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'Invalid session' });
    const [rows] = await promisePool.query(
      `SELECT tt.staff_id AS teacher_user_id,
              TRIM(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))) AS teacher_name,
              COUNT(*) AS total_periods,
              COUNT(DISTINCT tt.day_of_week) AS active_days,
              GROUP_CONCAT(DISTINCT tt.subject_name ORDER BY tt.subject_name) AS subjects_taught,
              GROUP_CONCAT(DISTINCT tt.class_name ORDER BY tt.class_name) AS classes_taught
       FROM academic_timetables tt
       INNER JOIN users u ON u.id = tt.staff_id
       WHERE tt.school_id = ?
       GROUP BY tt.staff_id, teacher_name
       ORDER BY total_periods DESC`, [schoolId]
    );
    const [profiles] = await promisePool.query(
      'SELECT teacher_user_id, max_periods_per_day FROM timetable_teacher_profiles WHERE school_id = ?', [schoolId]
    );
    const profileMap = new Map(profiles.map(p => [p.teacher_user_id, p.max_periods_per_day]));
    const workload = rows.map(r => {
      const maxPerDay = profileMap.get(r.teacher_user_id) || 6;
      const maxTotal = maxPerDay * (r.active_days || 5);
      return { ...r, max_periods_per_day: maxPerDay, utilization_pct: maxTotal > 0 ? Math.round((r.total_periods / maxTotal) * 100) : 0, overloaded: r.total_periods > maxTotal };
    });
    return res.json({ success: true, data: workload });
  } catch (err) {
    console.error('GET /dos/timetable-system/workload:', err);
    return res.status(500).json({ success: false, message: 'Failed to load workload' });
  }
});

function buildTeacherBusyMap(rows = []) {
  const teacherBusy = new Map();
  for (const row of rows) {
    teacherBusy.set(teacherSlotKey(row.staff_id, row.day_of_week, row.start_time), {
      class_name: row.class_name,
      subject_name: row.subject_name,
      staff_id: row.staff_id,
    });
  }
  return teacherBusy;
}

function entrySlotWeight() {
  return 1;
}

function rowSlotWeight() {
  return 1;
}

/** Always exactly periods_per_week slots — never multiplied */
function expandLessonUnits(assignment) {
  const ppw = Number(assignment.periods_per_week) || 3;
  return Array.from({ length: ppw }, () => ({ slot_weight: 1 }));
}

function consecutivePairDays(ppw) {
  if (ppw >= 8) return 2;
  if (ppw >= 3) return 1;
  return 0;
}

function getNextTeachingSlot(teachingSlots, slot) {
  const idx = teachingSlots.findIndex((s) => s.start_time === slot.start_time);
  if (idx < 0 || idx >= teachingSlots.length - 1) return null;
  const next = teachingSlots[idx + 1];
  if (timeToMins(next.start_time) !== timeToMins(slot.end_time)) return null;
  return next;
}

function getPreviousTeachingSlot(teachingSlots, slot) {
  const idx = teachingSlots.findIndex((s) => s.start_time === slot.start_time);
  if (idx <= 0) return null;
  const prev = teachingSlots[idx - 1];
  if (timeToMins(slot.start_time) !== timeToMins(prev.end_time)) return null;
  return prev;
}

function classDayOffset(className, availDays) {
  const m = String(className || '').match(/([A-H])$/i);
  const letter = m?.[1]?.toUpperCase();
  const idx = letter ? letter.charCodeAt(0) - 65 : 0;
  return idx % Math.max(availDays.length, 1);
}

function buildPlacementQueue(assignments, activeDays, profileMap, configMap, shuffle = false) {
  const sortedAssignments = [...assignments].sort((a, b) => {
    const cfgA = configMap.get(a.subject_name);
    const cfgB = configMap.get(b.subject_name);
    const prioOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return (prioOrder[cfgA?.priority_level] ?? 2) - (prioOrder[cfgB?.priority_level] ?? 2);
  });

  const placementQueue = [];
  for (const assignment of sortedAssignments) {
    const units = expandLessonUnits(assignment);
    const cfg = configMap.get(assignment.subject_name);
    const allowFollowed = Boolean(cfg?.is_double_period);
    const profile = profileMap.get(assignment.teacher_user_id);
    const availDays = (profile && profile.available_days.length > 0)
      ? activeDays.filter((d) => profile.available_days.includes(d))
      : [...activeDays];
    const classOffset = classDayOffset(assignment.class_name, availDays);
    const ppw = units.length;
    let idx = 0;

    if (allowFollowed && ppw >= 2) {
      const pairDays = consecutivePairDays(ppw);
      for (let p = 0; p < pairDays && idx + 1 < ppw; p++) {
        const day = availDays[(classOffset + p * 2) % availDays.length];
        placementQueue.push({ ...assignment, ...units[idx], target_day: day, slot_weight: 1 });
        idx += 1;
        placementQueue.push({
          ...assignment,
          ...units[idx],
          target_day: day,
          slot_weight: 1,
          follow_same_subject: true,
        });
        idx += 1;
      }
    }

    for (; idx < ppw; idx++) {
      placementQueue.push({
        ...assignment,
        ...units[idx],
        target_day: availDays[(classOffset + idx) % availDays.length],
        slot_weight: 1,
      });
    }
  }

  placementQueue.sort((a, b) => {
    if (a.follow_same_subject && !b.follow_same_subject) return 1;
    if (!a.follow_same_subject && b.follow_same_subject) return -1;
    const dayIdxA = activeDays.indexOf(a.target_day);
    const dayIdxB = activeDays.indexOf(b.target_day);
    if (dayIdxA !== dayIdxB) return dayIdxA - dayIdxB;
    return shuffle ? Math.random() - 0.5 : 0;
  });
  return placementQueue;
}

function countTeacherWeekBooked(teacherId, activeDays, teachingSlots, teacherBusy) {
  let booked = 0;
  for (const day of activeDays) {
    for (const slot of teachingSlots) {
      if (teacherBusy.has(teacherSlotKey(teacherId, day, slot.start_time))) booked += 1;
    }
  }
  return booked;
}

function diagnosePlacementFailure({
  class_name, item, preferredDay, teachingSlots, activeDays,
  classUsed, teacherBusy, teacherDayCount, profile, subjectCfg, teacherNameMap,
}) {
  const schedulingRules = getSchedulingRulesFromConfig(subjectCfg);
  const teacherId = item.teacher_user_id;
  const maxPd = profile?.max_periods_per_day || 6;
  const teacherName = teacherNameMap?.get(teacherId) || `Teacher #${teacherId}`;
  const slotsPerDay = teachingSlots.length;
  const teacherWeekCapacity = activeDays.length * maxPd;
  const teacherWeekBooked = countTeacherWeekBooked(teacherId, activeDays, teachingSlots, teacherBusy);
  const teacherUtilization = teacherWeekCapacity > 0
    ? Math.round((teacherWeekBooked / teacherWeekCapacity) * 100)
    : 100;

  let classBlocked = 0;
  let teacherBlocked = 0;
  let dayLimitBlocked = 0;
  let ruleBlocked = 0;
  const daysToTry = [preferredDay, ...activeDays.filter((d) => d !== preferredDay)];

  for (const tryDay of daysToTry) {
    for (const slot of teachingSlots) {
      const classKey = `${class_name}__${tryDay}__${slot.start_time}`;
      const teacherKey = teacherSlotKey(teacherId, tryDay, slot.start_time);
      const tdKey = `${teacherId}__${tryDay}`;
      const dayCount = teacherDayCount.get(tdKey) || 0;
      if (classUsed.has(classKey)) classBlocked += 1;
      if (teacherBusy.has(teacherKey)) teacherBlocked += 1;
      if (dayCount >= maxPd) dayLimitBlocked += 1;
      if (!slotMatchesSchedulingRules(slot, schedulingRules)) ruleBlocked += 1;
    }
  }

  const dos_actions = [];
  let reason = 'no_slot';
  let summary = `No free slot for ${item.subject_name} in ${class_name}`;

  if (teacherUtilization >= 95 || teacherWeekBooked >= teacherWeekCapacity) {
    reason = 'teacher_overloaded';
    summary = `${teacherName} is fully booked (${teacherWeekBooked}/${teacherWeekCapacity} periods this week, ${teacherUtilization}% used)`;
    dos_actions.push(`Assign a second teacher for ${item.subject_name} on ${class_name} (Assignments tab)`);
    dos_actions.push(`Split classes: give P5F–P5H subjects to another teacher — ${teacherName} covers too many classes`);
    dos_actions.push(`Increase max periods/day for ${teacherName} (Teachers tab → Edit profile, currently ${maxPd})`);
  } else if (teacherBlocked >= classBlocked && teacherBlocked > 0) {
    reason = 'teacher_busy';
    summary = `${teacherName} is busy in all ${teacherBlocked} candidate slots — teaching other classes at those times`;
    dos_actions.push(`Assign another teacher to ${item.subject_name} for ${class_name}`);
    dos_actions.push(`Reduce periods/week for subjects ${teacherName} teaches across multiple classes`);
  } else if (dayLimitBlocked > 0 && dayLimitBlocked >= teacherBlocked) {
    reason = 'teacher_daily_limit';
    summary = `${teacherName} hit the daily limit (${maxPd} periods/day) on every day ${class_name} still needs`;
    dos_actions.push(`Raise max periods/day for ${teacherName} in Teacher profiles (currently ${maxPd})`);
    dos_actions.push(`Spread ${item.subject_name} to more teachers so no single teacher exceeds ${maxPd}/day`);
  } else if (classBlocked > teacherBlocked) {
    reason = 'class_full';
    summary = `${class_name} already uses every time slot on the tried days (${classBlocked} slots blocked)`;
    dos_actions.push(`Extend the school day in Time Settings (more periods per day)`);
    dos_actions.push(`Reduce total periods/week for ${class_name} in course assignments`);
  }

  if (ruleBlocked > 0 && reason === 'no_slot') {
    reason = 'scheduling_rules';
    const pref = schedulingRules.time_preference || 'any';
    summary = `${item.subject_name} scheduling rule (${pref}) blocks ${ruleBlocked} slot(s) — no compliant slot left`;
    dos_actions.push(`Relax scheduling rules for ${item.subject_name} in Courses → Configure`);
  }

  if (!dos_actions.length) {
    dos_actions.push(`Assign a dedicated teacher for ${item.subject_name} on ${class_name}`);
    dos_actions.push('Add more teaching periods in Time Settings or enable Saturday');
  }

  return {
    reason,
    summary,
    teacher_name: teacherName,
    teacher_user_id: teacherId,
    teacher_week_booked: teacherWeekBooked,
    teacher_week_capacity: teacherWeekCapacity,
    teacher_utilization_pct: teacherUtilization,
    dos_actions,
  };
}

function findPlacementSlot({
  class_name, item, preferredDay, teachingSlots, activeDays,
  classUsed, teacherBusy, teacherDayCount, classDayCount, profile, subjectCfg,
  autoResolve = false,
}) {
  const schedulingRules = getSchedulingRulesFromConfig(subjectCfg);
  let daysToTry = autoResolve
    ? [preferredDay, ...activeDays.filter((d) => d !== preferredDay)]
    : [preferredDay];

  if (autoResolve && classDayCount) {
    daysToTry = [...new Set(daysToTry)].sort((a, b) => {
      const ca = classDayCount.get(`${class_name}__${a}`) || 0;
      const cb = classDayCount.get(`${class_name}__${b}`) || 0;
      if (ca !== cb) return ca - cb;
      if (a === preferredDay) return -1;
      if (b === preferredDay) return 1;
      return activeDays.indexOf(a) - activeDays.indexOf(b);
    });
  }
  const slotWeight = 1;

  if (item.follow_same_subject) {
    for (const tryDay of daysToTry) {
      for (const slot of teachingSlots) {
        if (!slotMatchesSchedulingRules(slot, schedulingRules)) continue;
        const prev = getPreviousTeachingSlot(teachingSlots, slot);
        if (!prev) continue;
        const prevKey = `${class_name}__${tryDay}__${prev.start_time}`;
        if (classUsed.get(prevKey) !== item.subject_name) continue;

        const classKey = `${class_name}__${tryDay}__${slot.start_time}`;
        if (classUsed.has(classKey)) continue;
        const teacherKey = teacherSlotKey(item.teacher_user_id, tryDay, slot.start_time);
        if (teacherBusy.has(teacherKey)) continue;
        const tdKey = `${item.teacher_user_id}__${tryDay}`;
        const dayCount = teacherDayCount.get(tdKey) || 0;
        const maxPd = profile?.max_periods_per_day || 6;
        if (dayCount + slotWeight > maxPd) continue;

        return {
          slot,
          slots: [slot],
          day: tryDay,
          preferredDay,
          slot_weight: 1,
          follow_same_subject: true,
        };
      }
    }
  }

  for (const tryDay of daysToTry) {
    const ruleMatching = teachingSlots.filter((s) => slotMatchesSchedulingRules(s, schedulingRules));
    const slotsToTry = orderSlotsBySchedulingRules(
      ruleMatching.length ? ruleMatching : teachingSlots,
      schedulingRules
    );

    for (const slot of slotsToTry) {
      const slotsNeeded = [slot];

      let blocked = false;
      for (const s of slotsNeeded) {
        const classKey = `${class_name}__${tryDay}__${s.start_time}`;
        if (classUsed.has(classKey)) { blocked = true; break; }
        const teacherKey = teacherSlotKey(item.teacher_user_id, tryDay, s.start_time);
        if (teacherBusy.has(teacherKey)) { blocked = true; break; }
      }
      if (blocked) continue;

      const tdKey = `${item.teacher_user_id}__${tryDay}`;
      const dayCount = teacherDayCount.get(tdKey) || 0;
      const maxPd = profile?.max_periods_per_day || 6;
      if (dayCount + slotWeight > maxPd) continue;

      return {
        slot,
        endSlot: slot,
        slots: slotsNeeded,
        day: tryDay,
        preferredDay,
        slot_weight: 1,
      };
    }
  }
  return null;
}

function commitPlacement({
  class_name, item, placement, useTerm, useYear, classUsed, teacherBusy, teacherDayCount, classDayCount,
}) {
  const { slot, day } = placement;
  const classKey = `${class_name}__${day}__${slot.start_time}`;
  const teacherKey = teacherSlotKey(item.teacher_user_id, day, slot.start_time);
  classUsed.set(classKey, item.subject_name);
  teacherBusy.set(teacherKey, { class_name, subject_name: item.subject_name, staff_id: item.teacher_user_id });

  const tdKey = `${item.teacher_user_id}__${day}`;
  teacherDayCount.set(tdKey, (teacherDayCount.get(tdKey) || 0) + 1);
  if (classDayCount) {
    const cdKey = `${class_name}__${day}`;
    classDayCount.set(cdKey, (classDayCount.get(cdKey) || 0) + 1);
  }

  return {
    class_name,
    subject_name: item.subject_name,
    staff_id: item.teacher_user_id,
    day_of_week: day,
    start_time: slot.start_time,
    end_time: slot.end_time,
    room: item.room || null,
    term: useTerm,
    academic_year: useYear,
    is_double_period: item.follow_same_subject ? 1 : 0,
    slot_weight: 1,
  };
}

function normalizeCommitResult(result) {
  if (!result) return [];
  return Array.isArray(result) ? result : [result];
}

function describeFixAction({ class_name, item, preferredDay, placement, subjectCfg }) {
  const timeLabel = String(placement.slot.start_time).slice(0, 5);
  const rules = getSchedulingRulesFromConfig(subjectCfg);
  const parts = [];
  if (placement.day !== preferredDay) {
    parts.push(`moved ${item.subject_name} from ${preferredDay} to ${placement.day} at ${timeLabel}`);
  } else {
    parts.push(`placed ${item.subject_name} on ${placement.day} at ${timeLabel}`);
  }
  if (rules.time_preference && rules.time_preference !== 'any') {
    parts.push(`respecting ${rules.time_preference} scheduling rule`);
  }
  return `${class_name}: ${parts.join(' — ')}`;
}

function generateTimetableForClass({
  class_name, useTerm, useYear, assignments, activeDays, teachingSlots,
  teacherBusy, profileMap, configMap, autoResolve = false, shuffle = false,
  teacherNameMap = new Map(), extraActivities = [],
}) {
  const generated = [];
  const conflicts = [];
  const fixActions = [];
  const classUsed = new Map();
  const classUsedMaps = new Map([[class_name, classUsed]]);
  seedClassUsedFromExtraActivities(classUsedMaps, [class_name], extraActivities, teachingSlots, activeDays);
  const teacherDayCount = new Map();
  const classDayCount = new Map();
  const placementQueue = buildPlacementQueue(assignments, activeDays, profileMap, configMap, shuffle);

  for (const item of placementQueue) {
    const preferredDay = item.target_day;
    const profile = profileMap.get(item.teacher_user_id);
    const subjectCfg = configMap.get(item.subject_name);

    if (!autoResolve) {
      let placed = false;
      const schedulingRules = getSchedulingRulesFromConfig(subjectCfg);
      const ruleMatching = teachingSlots.filter((s) => slotMatchesSchedulingRules(s, schedulingRules));
      const slotsToTry = orderSlotsBySchedulingRules(
        ruleMatching.length ? ruleMatching : teachingSlots,
        schedulingRules
      );

      for (const slot of slotsToTry) {
        const classKey = `${class_name}__${preferredDay}__${slot.start_time}`;
        if (classUsed.has(classKey)) continue;

        const teacherKey = teacherSlotKey(item.teacher_user_id, preferredDay, slot.start_time);
        if (teacherBusy.has(teacherKey)) {
          const busy = teacherBusy.get(teacherKey);
          conflicts.push({
            type: 'teacher_conflict',
            class_name,
            teacher_user_id: item.teacher_user_id,
            day: preferredDay,
            time: slot.start_time,
            subject: item.subject_name,
            conflicts_with_class: busy?.class_name || null,
          });
          continue;
        }

        const tdKey = `${item.teacher_user_id}__${preferredDay}`;
        const dayCount = teacherDayCount.get(tdKey) || 0;
        const maxPd = profile?.max_periods_per_day || 6;
        if (dayCount >= maxPd) {
          conflicts.push({ type: 'overload', class_name, teacher_user_id: item.teacher_user_id, day: preferredDay, subject: item.subject_name });
          continue;
        }

        const entry = {
          class_name,
          subject_name: item.subject_name,
          staff_id: item.teacher_user_id,
          day_of_week: preferredDay,
          start_time: slot.start_time,
          end_time: slot.end_time,
          room: item.room || null,
          term: useTerm,
          academic_year: useYear,
        };
        generated.push(entry);
        classUsed.set(classKey, item.subject_name);
        teacherBusy.set(teacherKey, { class_name, subject_name: item.subject_name, staff_id: item.teacher_user_id });
        teacherDayCount.set(tdKey, dayCount + 1);
        placed = true;
        break;
      }
      if (!placed) {
        conflicts.push({ type: 'insufficient_slots', class_name, subject: item.subject_name, day: preferredDay, message: `No free slot on ${preferredDay}` });
      }
      continue;
    }

    const placement = findPlacementSlot({
      class_name,
      item,
      preferredDay,
      teachingSlots,
      activeDays,
      classUsed,
      teacherBusy,
      teacherDayCount,
      profile,
      subjectCfg,
      autoResolve: true,
    });

    if (!placement) {
      const diagnosis = diagnosePlacementFailure({
        class_name,
        item,
        preferredDay,
        teachingSlots,
        activeDays,
        classUsed,
        teacherBusy,
        teacherDayCount,
        profile,
        subjectCfg,
        teacherNameMap,
      });
      conflicts.push({
        type: 'insufficient_slots',
        class_name,
        subject: item.subject_name,
        day: preferredDay,
        teacher_user_id: item.teacher_user_id,
        message: diagnosis.summary,
        diagnosis,
        dos_actions: diagnosis.dos_actions,
      });
      continue;
    }

    const committed = commitPlacement({
      class_name, item, placement, useTerm, useYear, classUsed, teacherBusy, teacherDayCount, classDayCount,
    });
    for (const entry of normalizeCommitResult(committed)) {
      generated.push(entry);
    }
    const { day } = placement;
    const { slot } = placement;

    if (day !== preferredDay) {
      fixActions.push({
        class_name,
        subject: item.subject_name,
        from_day: preferredDay,
        to_day: day,
        time: String(slot.start_time).slice(0, 5),
        action: 'moved_day',
        description: describeFixAction({ class_name, item, preferredDay, placement, subjectCfg }),
      });
    }
  }

  return { generated, conflicts, fix_actions: fixActions };
}

function tryPlaceLessonUnit({
  class_name, item, useTerm, useYear, teachingSlots, activeDays,
  classUsed, teacherBusy, teacherDayCount, classDayCount, profileMap, configMap, teacherNameMap,
}) {
  const profile = profileMap.get(item.teacher_user_id);
  const subjectCfg = configMap.get(item.subject_name);
  const preferredDay = item.target_day;

  const tryOne = (attemptItem) => {
    const placement = findPlacementSlot({
      class_name,
      item: attemptItem,
      preferredDay,
      teachingSlots,
      activeDays,
      classUsed,
      teacherBusy,
      teacherDayCount,
      classDayCount,
      profile,
      subjectCfg,
      autoResolve: true,
    });
    if (!placement) return null;
    const committed = commitPlacement({
      class_name,
      item: attemptItem,
      placement,
      useTerm,
      useYear,
      classUsed,
      teacherBusy,
      teacherDayCount,
      classDayCount,
    });
    const entries = normalizeCommitResult(committed);
    return { entry: entries[0], entries, placement, attemptItem };
  };

  const single = tryOne(item);
  if (single) return { ...single, preferredDay, subjectCfg };

  const diagnosis = diagnosePlacementFailure({
    class_name, item, preferredDay, teachingSlots, activeDays,
    classUsed, teacherBusy, teacherDayCount, profile, subjectCfg, teacherNameMap,
  });
  return {
    conflict: {
      type: 'insufficient_slots',
      class_name,
      subject: item.subject_name,
      day: preferredDay,
      teacher_user_id: item.teacher_user_id,
      message: diagnosis.summary,
      diagnosis,
      dos_actions: diagnosis.dos_actions,
    },
  };
}

function assignmentPlacementKey(className, subjectName, teacherUserId) {
  return `${trimStr(className)}__${trimStr(subjectName)}__${Number(teacherUserId) || 0}`;
}

function enrichAssignmentsWithTeacherNames(assignments, teacherNameMap) {
  return (assignments || []).map((a) => ({
    ...a,
    teacher_name: teacherNameMap?.get?.(a.teacher_user_id) || a.teacher_name || null,
  }));
}

function countPlacedForAssignment(byClass, className, assignment) {
  const teacherId = assignment?.teacher_user_id ?? assignment?.staff_id;
  return (byClass[className] || [])
    .filter((e) =>
      String(e.subject_name || '').trim() === String(assignment.subject_name || '').trim()
      && String(e.staff_id) === String(teacherId)
    )
    .reduce((sum, e) => sum + entrySlotWeight(e), 0);
}

function countPlacedSlotsForSubject(byClass, className, subjectName) {
  return (byClass[className] || [])
    .filter((e) => e.subject_name === subjectName)
    .reduce((sum, e) => sum + entrySlotWeight(e), 0);
}

function buildGapFillQueue(byClass, classNames, classAssignmentsMap, activeDays) {
  const gaps = [];
  for (const className of classNames) {
    for (const a of classAssignmentsMap.get(className) || []) {
      const expected = Number(a.periods_per_week) || 0;
      const placed = countPlacedForAssignment(byClass, className, a);
      const missing = expected - placed;
      const offset = classDayOffset(className, activeDays);
      for (let i = 0; i < missing; i++) {
        gaps.push({
          ...a,
          class_name: className,
          target_day: activeDays[(offset + placed + i) % activeDays.length],
          slot_weight: 1,
        });
      }
    }
  }
  return gaps;
}

function tryPlaceGapAggressive({
  class_name, item, useTerm, useYear, teachingSlots, activeDays,
  classUsed, teacherBusy, teacherDayCount, classDayCount, profileMap, configMap, teacherNameMap,
}) {
  const daysToTry = [...activeDays].sort((a, b) => {
    const ca = classDayCount.get(`${class_name}__${a}`) || 0;
    const cb = classDayCount.get(`${class_name}__${b}`) || 0;
    return ca - cb;
  });
  for (const day of daysToTry) {
    const attempt = { ...item, target_day: day, slot_weight: 1 };
    const result = tryPlaceLessonUnit({
      class_name,
      item: attempt,
      useTerm,
      useYear,
      teachingSlots,
      activeDays,
      classUsed,
      teacherBusy,
      teacherDayCount,
      classDayCount,
      profileMap,
      configMap,
      teacherNameMap,
    });
    if (!result.conflict) return result;
  }
  return null;
}

function fillMissingPeriodsPass(ctx) {
  const {
    classNames, classAssignmentsMap, activeDays, byClass, generated, conflicts, fixActions,
  } = ctx;
  let filled = 0;
  for (let round = 0; round < 6; round++) {
    const gaps = buildGapFillQueue(byClass, classNames, classAssignmentsMap, activeDays);
    if (!gaps.length) break;
    let progress = false;
    for (const gap of gaps) {
      const class_name = gap.class_name;
      const result = tryPlaceGapAggressive({
        class_name,
        item: gap,
        useTerm: ctx.useTerm,
        useYear: ctx.useYear,
        teachingSlots: ctx.teachingSlots,
        activeDays,
        classUsed: ctx.classUsedMaps.get(class_name),
        teacherBusy: ctx.teacherBusy,
        teacherDayCount: ctx.teacherDayCount,
        classDayCount: ctx.classDayCount,
        profileMap: ctx.profileMap,
        configMap: ctx.configMap,
        teacherNameMap: ctx.teacherNameMap,
      });
      if (!result) continue;
      progress = true;
      filled += 1;
      const entries = result.entries || (result.entry ? [result.entry] : []);
      for (const entry of entries) {
        generated.push(entry);
        byClass[class_name].push(entry);
      }
      const idx = conflicts.findIndex(
        (c) => c.class_name === class_name && c.subject === gap.subject_name && c.type === 'insufficient_slots'
      );
      if (idx >= 0) conflicts.splice(idx, 1);
      fixActions.push({
        class_name,
        subject: gap.subject_name,
        action: 'gap_fill',
        description: `${class_name}: filled missing ${gap.subject_name} period on ${entries[0]?.day_of_week}`,
      });
    }
    if (!progress) break;
  }
  return filled;
}

function generateTimetableGlobal({
  classNames, classAssignmentsMap, useTerm, useYear,
  activeDays, teachingSlots, teacherBusySeed, profileMap, configMap,
  teacherNameMap = new Map(), shuffle = false, extraActivities = [],
}) {
  const teacherBusy = new Map(teacherBusySeed);
  const classUsedMaps = new Map(classNames.map((cn) => [cn, new Map()]));
  seedClassUsedFromExtraActivities(classUsedMaps, classNames, extraActivities, teachingSlots, activeDays);
  const teacherDayCount = new Map();
  const classDayCount = new Map();
  const generated = [];
  const conflicts = [];
  const fixActions = [];
  const byClass = Object.fromEntries(classNames.map((cn) => [cn, []]));
  const skipped = [];
  const teacherPendingCount = new Map();
  const globalQueue = [];

  for (const className of classNames) {
    const assignments = classAssignmentsMap.get(className) || [];
    if (!assignments.length) {
      skipped.push({ class_name: className, reason: 'No course assignments found' });
      continue;
    }
    const queue = buildPlacementQueue(assignments, activeDays, profileMap, configMap, shuffle);
    for (const item of queue) {
      globalQueue.push({ ...item, class_name: className });
      teacherPendingCount.set(
        item.teacher_user_id,
        (teacherPendingCount.get(item.teacher_user_id) || 0) + 1
      );
    }
  }

  const prioOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  globalQueue.sort((a, b) => {
    if (a.class_name === b.class_name && a.subject_name === b.subject_name) {
      if (a.follow_same_subject && !b.follow_same_subject) return 1;
      if (!a.follow_same_subject && b.follow_same_subject) return -1;
    }
    const cfgA = configMap.get(a.subject_name);
    const cfgB = configMap.get(b.subject_name);
    const rulesA = getSchedulingRulesFromConfig(cfgA);
    const rulesB = getSchedulingRulesFromConfig(cfgB);
    const morningA = rulesA.time_preference === 'morning' ? 1 : 0;
    const morningB = rulesB.time_preference === 'morning' ? 1 : 0;
    if (morningB !== morningA) return morningB - morningA;
    const loadA = teacherPendingCount.get(a.teacher_user_id) || 0;
    const loadB = teacherPendingCount.get(b.teacher_user_id) || 0;
    if (loadB !== loadA) return loadB - loadA;
    const pA = prioOrder[cfgA?.priority_level] ?? 2;
    const pB = prioOrder[cfgB?.priority_level] ?? 2;
    if (pA !== pB) return pA - pB;
    const ppwA = Number(a.periods_per_week) || 3;
    const ppwB = Number(b.periods_per_week) || 3;
    if (ppwA !== ppwB) return ppwA - ppwB;
    const dayIdxA = activeDays.indexOf(a.target_day);
    const dayIdxB = activeDays.indexOf(b.target_day);
    if (dayIdxA !== dayIdxB) return dayIdxA - dayIdxB;
    return shuffle ? Math.random() - 0.5 : String(a.class_name).localeCompare(String(b.class_name));
  });

  for (const item of globalQueue) {
    const class_name = item.class_name;
    const preferredDay = item.target_day;

    const result = tryPlaceLessonUnit({
      class_name,
      item,
      useTerm,
      useYear,
      teachingSlots,
      activeDays,
      classUsed: classUsedMaps.get(class_name),
      teacherBusy,
      teacherDayCount,
      classDayCount,
      profileMap,
      configMap,
      teacherNameMap,
    });

    if (result.conflict) {
      if (result.partial_entries?.length) {
        for (const e of result.partial_entries) {
          generated.push(e);
          byClass[class_name].push(e);
        }
      }
      conflicts.push(result.conflict);
      continue;
    }

    const placedEntries = result.entries || (result.entry ? [result.entry] : []);
    for (const entry of placedEntries) {
      generated.push(entry);
      byClass[class_name].push(entry);
    }

    const subjectCfg = configMap.get(item.subject_name);
    const day = result.placement?.day || result.entries?.[0]?.day_of_week;
    const slot = result.placement?.slot;
    if (day && day !== preferredDay && slot) {
      fixActions.push({
        class_name,
        subject: item.subject_name,
        from_day: preferredDay,
        to_day: day,
        time: String(slot.start_time).slice(0, 5),
        action: 'moved_day',
        description: describeFixAction({
          class_name,
          item,
          preferredDay,
          placement: result.placement,
          subjectCfg,
        }),
      });
    }
  }

  fillMissingPeriodsPass({
    classNames,
    classAssignmentsMap,
    activeDays,
    teachingSlots,
    useTerm,
    useYear,
    byClass,
    generated,
    conflicts,
    fixActions,
    classUsedMaps,
    teacherBusy,
    teacherDayCount,
    classDayCount,
    profileMap,
    configMap,
    teacherNameMap,
  });

  const classStats = classNames.map((cn) => ({
    class_name: cn,
    total: (byClass[cn] || []).reduce((sum, e) => sum + entrySlotWeight(e), 0),
    entries: (byClass[cn] || []).length,
    conflicts: conflicts.filter((c) => c.class_name === cn).length,
  }));

  return {
    generated,
    by_class: byClass,
    conflicts,
    fix_actions: fixActions,
    skipped,
    stats: {
      total: generated.reduce((sum, e) => sum + entrySlotWeight(e), 0),
      entries: generated.length,
      conflicts: conflicts.length,
      classes: classNames.length,
      generated_classes: classStats.filter((c) => c.total > 0).length,
      by_class: classStats,
    },
  };
}

function generationScore(result, classAssignmentsMap, classNames) {
  const coverage = buildPeriodCoverage(result, classAssignmentsMap, classNames);
  return {
    missing: coverage.total_missing || 0,
    excess: coverage.total_excess || 0,
    conflicts: (result.conflicts || []).length,
    placed: coverage.total_placed || 0,
    coveragePct: coverage.coverage_pct || 0,
  };
}

function isBetterGeneration(candidate, current) {
  if (!current) return true;
  if (candidate.missing !== current.missing) return candidate.missing < current.missing;
  if (candidate.excess !== current.excess) return candidate.excess < current.excess;
  if (candidate.conflicts !== current.conflicts) return candidate.conflicts < current.conflicts;
  if (candidate.coveragePct !== current.coveragePct) return candidate.coveragePct > current.coveragePct;
  return candidate.placed > current.placed;
}

function runMultiClassGeneration({
  classNames, classAssignmentsMap, useTerm, useYear,
  activeDays, teachingSlots, teacherBusySeed, profileMap, configMap,
  autoResolve = false, teacherNameMap = new Map(), extraActivities = [],
}) {
  const useGlobal = autoResolve || classNames.length > 1;
  const MAX_ATTEMPTS = useGlobal ? 15 : 1;
  let bestResult = null;
  let bestScore = null;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    let result;
    if (useGlobal) {
      result = generateTimetableGlobal({
        classNames,
        classAssignmentsMap,
        useTerm,
        useYear,
        activeDays,
        teachingSlots,
        teacherBusySeed,
        profileMap,
        configMap,
        teacherNameMap,
        shuffle: attempt > 0,
        extraActivities,
      });
    } else {
      const teacherBusy = new Map(teacherBusySeed);
      const allGenerated = [];
      const allConflicts = [];
      const allFixActions = [];
      const byClass = {};
      const classStats = [];
      const skipped = [];

      for (const className of classNames) {
        const assignments = classAssignmentsMap.get(className) || [];
        if (!assignments.length) {
          skipped.push({ class_name: className, reason: 'No course assignments found' });
          byClass[className] = [];
          continue;
        }

        const { generated, conflicts, fix_actions = [] } = generateTimetableForClass({
          class_name: className,
          useTerm,
          useYear,
          assignments,
          activeDays,
          teachingSlots,
          teacherBusy,
          profileMap,
          configMap,
          autoResolve: false,
          shuffle: false,
          teacherNameMap,
          extraActivities,
        });

        byClass[className] = generated;
        allGenerated.push(...generated);
        allConflicts.push(...conflicts);
        allFixActions.push(...fix_actions);
        classStats.push({ class_name: className, total: generated.length, conflicts: conflicts.length });
      }

      result = {
        generated: allGenerated,
        by_class: byClass,
        conflicts: allConflicts,
        fix_actions: allFixActions,
        skipped,
        stats: {
          total: allGenerated.length,
          conflicts: allConflicts.length,
          classes: classNames.length,
          generated_classes: classStats.filter((c) => c.total > 0).length,
          by_class: classStats,
        },
      };
    }

    const score = generationScore(result, classAssignmentsMap, classNames);
    if (isBetterGeneration(score, bestScore)) {
      bestResult = result;
      bestScore = score;
    }
    if (score.missing === 0 && score.excess === 0 && score.conflicts === 0) break;
  }

  return bestResult;
}

function buildPeriodCoverage(generation, classAssignmentsMap, classNames = []) {
  const placedCounts = new Map();
  for (const entry of generation?.generated || []) {
    const k = assignmentPlacementKey(entry.class_name, entry.subject_name, entry.staff_id);
    placedCounts.set(k, (placedCounts.get(k) || 0) + entrySlotWeight(entry));
  }

  const byClass = [];
  let totalExpected = 0;
  let totalPlaced = 0;
  const gaps = [];
  const autoFixSuggestions = [];

  for (const className of classNames) {
    const assignments = classAssignmentsMap.get(className) || [];
    const subjects = [];
    let classExpected = 0;
    const classEntries = (generation?.generated || []).filter(
      (e) => String(e.class_name || '').trim() === String(className || '').trim()
    );
    const classPlaced = classEntries.reduce((sum, e) => sum + entrySlotWeight(e), 0);

    for (const a of assignments) {
      const expected = Number(a.periods_per_week) || 0;
      const k = assignmentPlacementKey(className, a.subject_name, a.teacher_user_id);
      const placed = placedCounts.get(k) || 0;
      const missing = Math.max(0, expected - placed);
      const excess = Math.max(0, placed - expected);
      classExpected += expected;
      totalExpected += expected;

      subjects.push({
        subject_name: a.subject_name,
        teacher_user_id: a.teacher_user_id,
        teacher_name: a.teacher_name || null,
        expected,
        placed,
        missing,
        excess,
        complete: missing === 0 && excess === 0,
      });

      if (missing > 0) {
        gaps.push({
          class_name: className,
          subject_name: a.subject_name,
          expected,
          placed,
          missing,
          excess: 0,
          teacher_user_id: a.teacher_user_id,
          teacher_name: a.teacher_name || null,
        });
        const teacherLabel = a.teacher_name ? ` (${a.teacher_name})` : '';
        autoFixSuggestions.push(
          `Add ${missing} more ${a.subject_name} period(s) for ${className}${teacherLabel} — check teacher availability or reduce other class load`
        );
      }
      if (excess > 0) {
        const teacherLabel = a.teacher_name ? ` (${a.teacher_name})` : '';
        autoFixSuggestions.push(
          `Remove ${excess} extra ${a.subject_name} period(s) from ${className}${teacherLabel} (${placed}/${expected} scheduled — regenerate or delete duplicates)`
        );
      }
    }

    totalPlaced += classPlaced;

    byClass.push({
      class_name: className,
      subjects,
      total_expected: classExpected,
      total_placed: classPlaced,
      total_missing: Math.max(0, classExpected - classPlaced),
      total_excess: Math.max(0, classPlaced - classExpected),
      fully_matched: classPlaced === classExpected,
      coverage_pct: classExpected > 0 ? Math.min(100, Math.round((classPlaced / classExpected) * 100)) : 100,
    });
  }

  const totalMissing = Math.max(0, totalExpected - totalPlaced);
  const totalExcess = Math.max(0, totalPlaced - totalExpected);
  const allFullyMatched = byClass.every((c) => c.fully_matched);

  return {
    all_fully_matched: allFullyMatched,
    total_expected: totalExpected,
    total_placed: totalPlaced,
    total_missing: totalMissing,
    total_excess: totalExcess,
    total_free_periods: totalMissing,
    coverage_pct: totalExpected > 0 ? Math.round((totalPlaced / totalExpected) * 100) : 100,
    by_class: byClass,
    gaps,
    auto_fix_suggestions: [...new Set(autoFixSuggestions)].slice(0, 15),
    can_apply_partial: totalPlaced > 0,
    apply_partial_message: allFullyMatched
      ? 'All courses match their weekly periods — safe to apply the full timetable'
      : `${totalMissing} period(s) could not be placed and will show as free time in the timetable grid`,
    dos_message: allFullyMatched
      ? null
      : 'Weekly period targets are not fully met for some classes. Assign more teachers or adjust periods/week before expecting a complete timetable.',
  };
}

function finalizePartialGeneration(generation, acceptPartial = false) {
  if (!acceptPartial) return generation;

  const insufficient = (generation.conflicts || []).filter((c) => c.type === 'insufficient_slots');
  const blocking = (generation.conflicts || []).filter((c) => c.type !== 'insufficient_slots');
  const skippedLessons = insufficient.map((c) => ({
    class_name: c.class_name,
    subject: c.subject,
    day: c.day,
    reason: c.message || 'No available slot — left as free time',
    becomes: 'free_period',
  }));

  return {
    ...generation,
    conflicts: blocking,
    skipped_lessons: [...(generation.skipped_lessons || []), ...skippedLessons],
    accept_partial: true,
    partial_summary: {
      unplaced_lessons: insufficient.length,
      free_periods: insufficient.length,
      blocking_conflicts: blocking.length,
    },
  };
}

function buildDosRecommendations(conflicts = [], classAssignmentsMap = new Map(), periodCoverage = null) {
  const unfixable = conflicts.filter((c) => c.type === 'insufficient_slots');
  if (!unfixable.length) return null;

  const byTeacher = new Map();
  const byClass = new Map();
  const actionSet = new Set();
  const conflictDetails = [];

  for (const c of unfixable) {
    const cls = c.class_name;
    byClass.set(cls, (byClass.get(cls) || 0) + 1);
    const d = c.diagnosis || {};
    const tid = c.teacher_user_id || d.teacher_user_id;
    if (tid) {
      const existing = byTeacher.get(tid) || {
        teacher_name: d.teacher_name || `Teacher #${tid}`,
        count: 0,
        utilization_pct: d.teacher_utilization_pct || 0,
        subjects: new Set(),
        classes: new Set(),
      };
      existing.count += 1;
      if (c.subject) existing.subjects.add(c.subject);
      if (cls) existing.classes.add(cls);
      byTeacher.set(tid, existing);
    }
    (c.dos_actions || d.dos_actions || []).forEach((a) => actionSet.add(a));
    conflictDetails.push({
      class_name: cls,
      subject: c.subject,
      day: c.day,
      reason: d.reason || 'no_slot',
      summary: c.message || d.summary || 'Could not place lesson',
      dos_actions: c.dos_actions || d.dos_actions || [],
    });
  }

  const overloadedTeachers = [...byTeacher.values()]
    .sort((a, b) => b.count - a.count)
    .map((t) => ({
      teacher_name: t.teacher_name,
      failed_lessons: t.count,
      subjects: [...t.subjects],
      classes: [...t.classes],
      utilization_pct: t.utilization_pct,
    }));

  const affectedClasses = [...byClass.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([class_name, count]) => ({ class_name, missing_lessons: count }));

  const priorityActions = [];
  if (periodCoverage && !periodCoverage.all_fully_matched) {
    priorityActions.push(
      `Period coverage is ${periodCoverage.coverage_pct}% — ${periodCoverage.total_missing} period(s) missing across selected classes`
    );
    (periodCoverage.auto_fix_suggestions || []).slice(0, 4).forEach((s) => priorityActions.push(s));
    priorityActions.push('You can still apply a partial timetable — missing periods will appear as free time');
  }
  if (overloadedTeachers.length) {
    const top = overloadedTeachers[0];
    priorityActions.push(
      `${top.teacher_name} teaches ${top.subjects.join(', ')} across ${top.classes.length} class(es) — assign a second teacher`
    );
  }
  priorityActions.push('Go to Assignments tab → reassign subjects on overloaded classes to another teacher');
  priorityActions.push('Or increase max periods/day for overloaded teachers in Teachers → Edit profile');
  priorityActions.push('Or extend the school day in Time Settings to add more periods');

  let rootCause = 'Not enough free time slots for all assigned lessons';
  if (periodCoverage && !periodCoverage.all_fully_matched) {
    rootCause = `Course periods/week are not fully matched (${periodCoverage.coverage_pct}% coverage) — teachers or time slots are insufficient`;
  } else if (overloadedTeachers.some((t) => t.utilization_pct >= 90)) {
    rootCause = 'One or more teachers are fully booked — the same teacher cannot be in two classes at once';
  }

  return {
    root_cause: rootCause,
    cannot_auto_fix: unfixable.length,
    period_coverage_pct: periodCoverage?.coverage_pct ?? null,
    all_periods_matched: periodCoverage?.all_fully_matched ?? null,
    total_free_periods: periodCoverage?.total_free_periods ?? 0,
    affected_classes: affectedClasses,
    overloaded_teachers: overloadedTeachers,
    period_gaps: (periodCoverage?.gaps || []).slice(0, 20),
    what_dos_can_do: [...new Set([...priorityActions, ...actionSet])].slice(0, 10),
    what_system_can_do: [
      'Apply placed lessons now — unplaced periods stay as free time in the timetable',
      'Auto-fix relocates lessons to other days/slots where teachers are available',
      'Re-run generator after you assign more teachers to fill missing periods',
    ],
    conflict_details: conflictDetails.slice(0, 30),
  };
}

function buildFixAdvice(generation, classAssignmentsMap, periodCoverage = null) {
  const actions = generation?.fix_actions || [];
  const remaining = generation?.conflicts?.length || 0;
  const dosRecommendations = buildDosRecommendations(generation?.conflicts || [], classAssignmentsMap, periodCoverage);
  const summary = {
    total_adjustments: actions.length,
    remaining_conflicts: remaining,
    strategy: [
      'Schedule all classes together (fair placement) so one class does not take all teacher slots',
      'Search all time slots on the preferred day, then other days if the teacher or class is busy',
      'Respect course scheduling rules (e.g. PE morning only, before 13:00)',
      'Retry up to 8 generation passes and keep the best conflict-free result',
    ],
  };

  const byType = {
    moved_day: actions.filter((a) => a.action === 'moved_day').length,
    placed_slot: actions.filter((a) => a.action === 'placed_slot').length,
  };

  const steps = [];
  if (actions.length) {
    steps.push(`Relocate ${byType.moved_day} lesson(s) to different days where the teacher is free`);
    steps.push(`Assign lessons to open time slots that satisfy course scheduling rules`);
  } else if (remaining === 0) {
    steps.push('Resolved all warnings by finding open time slots without changing the planned day');
  }
  if (remaining > 0) {
    steps.push(`${remaining} lesson(s) could not be placed automatically — see "What DOS can do" below`);
    if (dosRecommendations?.root_cause) {
      steps.push(`Root cause: ${dosRecommendations.root_cause}`);
    }
  } else {
    steps.push('All generation warnings resolved — you can apply the timetable safely');
  }

  return {
    summary,
    steps,
    actions: actions.slice(0, 50),
    dos_recommendations: dosRecommendations,
  };
}

// ── Smart Timetable Generator (single or multiple classes) ──
router.post('/dos/timetable-system/generate', requireRole(DOS_ACADEMIC_ADMIN), async (req, res) => {
  try {
    await ensureSmartTimetableTables();
    await ensureAcademicTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'Invalid session' });

    const body = req.body || {};
    const classNames = Array.isArray(body.class_names) && body.class_names.length
      ? body.class_names.map((c) => trimStr(c)).filter(Boolean)
      : (trimStr(body.class_name) ? [trimStr(body.class_name)] : []);
    if (!classNames.length) {
      return res.status(400).json({ success: false, message: 'class_name or class_names[] is required' });
    }

    const calendar = await getAcademicCalendarSettings(schoolId);
    const useTerm = trimStr(body.term) || (Array.isArray(calendar.active_terms) && calendar.active_terms.length ? calendar.active_terms[0] : 'Term 1');
    const useYear = trimStr(body.academic_year) || calendar.current_academic_year || '2025-2026';

    const [[scheduleRow]] = await promisePool.query('SELECT * FROM timetable_school_schedule WHERE school_id = ? LIMIT 1', [schoolId]);
    const schedule = scheduleRow || {
      day_start_time: '08:00', day_end_time: '17:00', period_duration_mins: 40,
      active_days_json: JSON.stringify(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']),
      breaks_json: JSON.stringify([]),
    };
    const activeDays = typeof schedule.active_days_json === 'string'
      ? JSON.parse(schedule.active_days_json)
      : (schedule.active_days_json || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
    schedule.breaks = typeof schedule.breaks_json === 'string'
      ? JSON.parse(schedule.breaks_json)
      : (schedule.breaks_json || []);
    const slots = generateTimeSlots(schedule);
    const teachingSlots = slots.filter((s) => !s.is_break);

    const [existingTimetable] = await promisePool.query(
      `SELECT staff_id, day_of_week, start_time, end_time, class_name, subject_name
       FROM academic_timetables
       WHERE school_id = ? AND TRIM(COALESCE(term, '')) = ? AND TRIM(COALESCE(academic_year, '')) = ?`,
      [schoolId, useTerm, useYear]
    );
    const teacherBusy = buildTeacherBusyMap(existingTimetable);

    const [profileRows] = await promisePool.query('SELECT * FROM timetable_teacher_profiles WHERE school_id = ?', [schoolId]);
    const profileMap = new Map(profileRows.map((p) => [p.teacher_user_id, {
      max_periods_per_day: p.max_periods_per_day || 6,
      available_days: typeof p.available_days_json === 'string' ? JSON.parse(p.available_days_json) : (p.available_days_json || []),
      preferred_slots: typeof p.preferred_slots_json === 'string' ? JSON.parse(p.preferred_slots_json) : (p.preferred_slots_json || []),
    }]));

    const [configRows] = await promisePool.query('SELECT * FROM timetable_course_config WHERE school_id = ?', [schoolId]);
    const configMap = new Map(configRows.map((c) => [c.subject_name, c]));

    const [teacherNameRows] = await promisePool.query(
      `SELECT id, TRIM(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))) AS full_name
       FROM users u WHERE u.school_id = ? AND u.deleted_at IS NULL`,
      [schoolId]
    );
    const teacherNameMap = new Map(
      (teacherNameRows || []).map((r) => [r.id, r.full_name || `Teacher #${r.id}`])
    );

    const classAssignmentsMap = new Map();
    for (const className of classNames) {
      const assignments = await fetchTeacherAssignmentsForClass(schoolId, className, useYear, useTerm);
      classAssignmentsMap.set(className, enrichAssignmentsWithTeacherNames(assignments, teacherNameMap));
    }

    const autoResolve = Boolean(body.auto_resolve);
    const acceptPartial = Boolean(body.accept_partial);
    const extraActivities = await loadExtraActivitiesForSchool(schoolId, useTerm, useYear);
    let generation = runMultiClassGeneration({
      classNames,
      classAssignmentsMap,
      useTerm,
      useYear,
      activeDays,
      teachingSlots,
      teacherBusySeed: teacherBusy,
      profileMap,
      configMap,
      autoResolve,
      teacherNameMap,
      extraActivities,
    });

    const periodCoverage = buildPeriodCoverage(generation, classAssignmentsMap, classNames);
    generation = finalizePartialGeneration(generation, acceptPartial || autoResolve);
    const dosRecommendations = buildDosRecommendations(generation.conflicts, classAssignmentsMap, periodCoverage);
    const fixAdvice = (autoResolve || acceptPartial)
      ? buildFixAdvice(generation, classAssignmentsMap, periodCoverage)
      : null;

    const blockingCount = (generation.conflicts || []).length;
    const freePeriods = periodCoverage.total_free_periods;

    return res.json({
      success: true,
      message: autoResolve || acceptPartial
        ? (periodCoverage.all_fully_matched && blockingCount === 0
          ? `All ${periodCoverage.total_placed} periods placed — ready to apply`
          : periodCoverage.all_fully_matched
            ? `${blockingCount} blocking conflict(s) remain`
            : `${freePeriods} period(s) will be free time — ${periodCoverage.coverage_pct}% coverage`)
        : undefined,
      data: {
        generated: generation.generated,
        by_class: generation.by_class,
        conflicts: generation.conflicts,
        skipped_lessons: generation.skipped_lessons || [],
        fix_actions: generation.fix_actions || [],
        fix_advice: fixAdvice,
        dos_recommendations: dosRecommendations,
        period_coverage: periodCoverage,
        accept_partial: generation.accept_partial || false,
        partial_summary: generation.partial_summary || null,
        auto_resolved: autoResolve,
        skipped: generation.skipped,
        term: useTerm,
        academic_year: useYear,
        class_names: classNames,
        stats: {
          ...generation.stats,
          period_coverage_pct: periodCoverage.coverage_pct,
          total_free_periods: periodCoverage.total_free_periods,
          all_fully_matched: periodCoverage.all_fully_matched,
        },
      },
    });
  } catch (err) {
    console.error('POST /dos/timetable-system/generate:', err);
    return res.status(500).json({ success: false, message: 'Failed to generate timetable' });
  }
});

router.post('/dos/timetable-system/apply', requireRole(DOS_ACADEMIC_ADMIN), async (req, res) => {
  try {
    await ensureSmartTimetableTables();
    await ensureAcademicTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'Invalid session' });
    const { entries, class_name, class_names, term, academic_year, clear_existing, skip_conflict_check } = req.body || {};
    if (!Array.isArray(entries) || entries.length === 0) return res.status(400).json({ success: false, message: 'No entries to apply' });

    const useTerm = trimStr(term) || trimStr(entries[0]?.term) || '';
    const useYear = trimStr(academic_year) || trimStr(entries[0]?.academic_year) || '';
    const classesToClear = Array.isArray(class_names) && class_names.length
      ? class_names.map((c) => trimStr(c)).filter(Boolean)
      : (trimStr(class_name) ? [trimStr(class_name)] : Array.from(new Set(entries.map((e) => trimStr(e.class_name)).filter(Boolean))));

    if (!skip_conflict_check) {
      const applyConflicts = [];
      for (const e of entries) {
        const conflicts = await findTeacherPeriodConflicts(schoolId, {
          staffId: e.staff_id,
          dayOfWeek: e.day_of_week,
          startTime: e.start_time,
          endTime: e.end_time,
          term: e.term || useTerm,
          academicYear: e.academic_year || useYear,
        });
        const crossClass = conflicts.filter((c) => String(c.class_name) !== String(e.class_name));
        if (crossClass.length > 0) {
          const c = crossClass[0];
          applyConflicts.push({
            type: 'teacher_clash',
            class_name: e.class_name,
            subject_name: e.subject_name,
            teacher_name: c.teacher_name,
            conflicts_with_class: c.class_name,
            conflicts_with_subject: c.subject_name,
            day: e.day_of_week,
            time: `${String(e.start_time).slice(0, 5)}–${String(e.end_time).slice(0, 5)}`,
            term: e.term || useTerm,
            academic_year: e.academic_year || useYear,
          });
        }
      }
      if (applyConflicts.length > 0) {
        return res.status(409).json({
          success: false,
          code: 'TEACHER_PERIOD_CONFLICT',
          message: `${applyConflicts.length} teacher time conflict(s) detected. Resolve conflicts before applying.`,
          conflicts: applyConflicts,
        });
      }
    }

    if (clear_existing && classesToClear.length) {
      for (const cls of classesToClear) {
        await promisePool.query(
          'DELETE FROM academic_timetables WHERE school_id = ? AND class_name = ? AND extra_activity_id IS NULL',
          [schoolId, cls]
        );
      }
    }

    const seenApplySlots = new Set();
    const sanitizedEntries = [];
    for (const e of entries) {
      const slotKey = `${trimStr(e.class_name)}__${trimStr(e.day_of_week)}__${String(e.start_time).slice(0, 5)}`;
      if (seenApplySlots.has(slotKey)) continue;
      seenApplySlots.add(slotKey);
      sanitizedEntries.push(e);
    }

    let inserted = 0;
    for (const e of sanitizedEntries) {
      try {
        await promisePool.query(
          `INSERT INTO academic_timetables (school_id, class_name, subject_name, staff_id, day_of_week, start_time, end_time, room, term, academic_year)
           VALUES (?,?,?,?,?,?,?,?,?,?)`,
          [schoolId, e.class_name, e.subject_name, e.staff_id, e.day_of_week, e.start_time, e.end_time, e.room || null, e.term || useTerm, e.academic_year || useYear]
        );
        inserted++;
      } catch (dupErr) {
        if (dupErr.code !== 'ER_DUP_ENTRY') throw dupErr;
      }
    }
    await resyncExtraActivitiesForClasses(schoolId, classesToClear, useTerm, useYear);

    const allowPartial = Boolean(req.body?.allow_partial);
    const freePeriods = Number(req.body?.expected_free_periods) || 0;

    return res.json({
      success: true,
      message: allowPartial && freePeriods > 0
        ? `Applied ${inserted} lessons — ${freePeriods} period(s) left as free time in the timetable`
        : `Applied ${inserted} timetable entries across ${classesToClear.length} class(es)`,
      data: { inserted, classes: classesToClear, term: useTerm, academic_year: useYear },
    });
  } catch (err) {
    console.error('POST /dos/timetable-system/apply:', err);
    return res.status(500).json({ success: false, message: 'Failed to apply timetable' });
  }
});

async function clearClassTimetables(schoolId, classNames, term, academicYear) {
  let deleted = 0;
  const names = (classNames || []).map((c) => trimStr(c)).filter(Boolean);
  if (!names.length) return 0;
  for (const cls of names) {
    const delWhere = ['school_id = ?', 'class_name = ?'];
    const delParams = [schoolId, cls];
    if (term) { delWhere.push('TRIM(COALESCE(term, \'\')) = ?'); delParams.push(trimStr(term)); }
    if (academicYear) { delWhere.push('TRIM(COALESCE(academic_year, \'\')) = ?'); delParams.push(trimStr(academicYear)); }
    delWhere.push('extra_activity_id IS NULL');
    const [res] = await promisePool.query(`DELETE FROM academic_timetables WHERE ${delWhere.join(' AND ')}`, delParams);
    deleted += res.affectedRows || 0;
  }
  return deleted;
}

router.post('/dos/timetable-system/seed-demo', requireRole(DOS_ACADEMIC_ADMIN), async (req, res) => {
  try {
    await ensureSmartTimetableTables();
    await ensureAcademicTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'Invalid session' });

    const clear = req.body?.clear !== false;
    const result = await runTimetableDemoSeed(schoolId, { clear });

    return res.json({
      success: true,
      message: `Imported ${result.teacher_count} teachers, ${result.subject_count} courses, and ${result.assignment_count} class assignments for ${result.classes.join(', ')}.`,
      data: result,
    });
  } catch (err) {
    console.error('POST /dos/timetable-system/seed-demo:', err);
    return res.status(500).json({
      success: false,
      message: err?.message || 'Failed to import timetable demo seed',
    });
  }
});

router.post('/dos/timetable-system/seed-wisdom-p5', requireRole(DOS_ACADEMIC_ADMIN), async (req, res) => {
  try {
    await ensureSmartTimetableTables();
    await ensureAcademicTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'Invalid session' });

    const { runWisdomP5TimetableSeed } = require('../utils/wisdomP5TimetableSeed');
    const fullClear = req.body?.full_clear !== false;
    const result = await runWisdomP5TimetableSeed(schoolId, {
      fullClear,
      syncTeacherAssignments: req.body?.sync_teacher_assignments !== false,
    });

    return res.json({
      success: true,
      message: `Imported ${result.teacher_count} teachers, ${result.courses.length} courses, and ${result.timetable_assignments} assignments for ${result.classes.join(', ')}. Timetables cleared.`,
      data: result,
    });
  } catch (err) {
    console.error('POST /dos/timetable-system/seed-wisdom-p5:', err);
    return res.status(500).json({
      success: false,
      message: err?.message || 'Failed to import P5 wisdom timetable seed',
    });
  }
});

router.post('/dos/timetable-system/clear-timetables', requireRole(DOS_ACADEMIC_ADMIN), async (req, res) => {
  try {
    await ensureAcademicTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'Invalid session' });
    const { class_names, class_name, term, academic_year } = req.body || {};
    const calendar = await getAcademicCalendarSettings(schoolId);
    const useTerm = trimStr(term) || (Array.isArray(calendar.active_terms) && calendar.active_terms.length ? calendar.active_terms[0] : 'Term 1');
    const useYear = trimStr(academic_year) || calendar.current_academic_year || '2025-2026';
    const classNames = Array.isArray(class_names) && class_names.length
      ? class_names.map((c) => trimStr(c)).filter(Boolean)
      : (trimStr(class_name) ? [trimStr(class_name)] : []);
    if (!classNames.length) {
      return res.status(400).json({ success: false, message: 'class_names[] or class_name is required' });
    }
    const deleted = await clearClassTimetables(schoolId, classNames, useTerm, useYear);
    return res.json({
      success: true,
      message: `Cleared ${deleted} timetable entry(ies) for ${classNames.length} class(es). Assignments and teachers unchanged.`,
      data: { deleted, class_names: classNames, term: useTerm, academic_year: useYear },
    });
  } catch (err) {
    console.error('POST /dos/timetable-system/clear-timetables:', err);
    return res.status(500).json({ success: false, message: 'Failed to clear timetables' });
  }
});

router.post('/dos/timetable-system/regenerate', requireRole(DOS_ACADEMIC_ADMIN), async (req, res) => {
  try {
    await ensureSmartTimetableTables();
    await ensureAcademicTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'Invalid session' });

    const body = req.body || {};
    const classNames = Array.isArray(body.class_names) && body.class_names.length
      ? body.class_names.map((c) => trimStr(c)).filter(Boolean)
      : (trimStr(body.class_name) ? [trimStr(body.class_name)] : []);
    if (!classNames.length) {
      return res.status(400).json({ success: false, message: 'class_names[] is required' });
    }

    const calendar = await getAcademicCalendarSettings(schoolId);
    const useTerm = trimStr(body.term) || (Array.isArray(calendar.active_terms) && calendar.active_terms.length ? calendar.active_terms[0] : 'Term 1');
    const useYear = trimStr(body.academic_year) || calendar.current_academic_year || '2025-2026';
    const autoApply = body.auto_apply !== false;

    const cleared = await clearClassTimetables(schoolId, classNames, useTerm, useYear);

    const [[scheduleRow]] = await promisePool.query('SELECT * FROM timetable_school_schedule WHERE school_id = ? LIMIT 1', [schoolId]);
    const schedule = scheduleRow || {
      day_start_time: '07:20', day_end_time: '16:20', period_duration_mins: 40,
      active_days_json: JSON.stringify(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']),
      breaks_json: JSON.stringify([]),
    };
    const activeDays = typeof schedule.active_days_json === 'string'
      ? JSON.parse(schedule.active_days_json)
      : (schedule.active_days_json || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
    schedule.breaks = typeof schedule.breaks_json === 'string'
      ? JSON.parse(schedule.breaks_json)
      : (schedule.breaks_json || []);
    const teachingSlots = generateTimeSlots(schedule).filter((s) => !s.is_break);

    const [profileRows] = await promisePool.query('SELECT * FROM timetable_teacher_profiles WHERE school_id = ?', [schoolId]);
    const profileMap = new Map(profileRows.map((p) => [p.teacher_user_id, {
      max_periods_per_day: p.max_periods_per_day || 6,
      available_days: typeof p.available_days_json === 'string' ? JSON.parse(p.available_days_json) : (p.available_days_json || []),
      preferred_slots: typeof p.preferred_slots_json === 'string' ? JSON.parse(p.preferred_slots_json) : (p.preferred_slots_json || []),
    }]));
    const [configRows] = await promisePool.query('SELECT * FROM timetable_course_config WHERE school_id = ?', [schoolId]);
    const configMap = new Map(configRows.map((c) => [c.subject_name, c]));
    const [teacherNameRows] = await promisePool.query(
      `SELECT id, TRIM(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))) AS full_name FROM users u WHERE u.school_id = ? AND u.deleted_at IS NULL`,
      [schoolId]
    );
    const teacherNameMap = new Map((teacherNameRows || []).map((r) => [r.id, r.full_name || `Teacher #${r.id}`]));
    const classAssignmentsMap = new Map();
    for (const className of classNames) {
      const assignments = await fetchTeacherAssignmentsForClass(schoolId, className, useYear, useTerm);
      classAssignmentsMap.set(className, enrichAssignmentsWithTeacherNames(assignments, teacherNameMap));
    }

    const extraActivities = await loadExtraActivitiesForSchool(schoolId, useTerm, useYear);
    const generation = runMultiClassGeneration({
      classNames,
      classAssignmentsMap,
      useTerm,
      useYear,
      activeDays,
      teachingSlots,
      teacherBusySeed: new Map(),
      profileMap,
      configMap,
      autoResolve: true,
      teacherNameMap,
      extraActivities,
    });
    const periodCoverage = buildPeriodCoverage(generation, classAssignmentsMap, classNames);

    let applied = 0;
    if (autoApply && generation.generated?.length) {
      for (const cls of classNames) {
        const delWhere = ['school_id = ?', 'class_name = ?'];
        const delParams = [schoolId, cls];
        if (useTerm) { delWhere.push('TRIM(COALESCE(term, \'\')) = ?'); delParams.push(useTerm); }
        if (useYear) { delWhere.push('TRIM(COALESCE(academic_year, \'\')) = ?'); delParams.push(useYear); }
        await promisePool.query(`DELETE FROM academic_timetables WHERE ${delWhere.join(' AND ')}`, delParams);
      }
      for (const e of generation.generated) {
        await promisePool.query(
          `INSERT INTO academic_timetables (school_id, class_name, subject_name, staff_id, day_of_week, start_time, end_time, room, term, academic_year)
           VALUES (?,?,?,?,?,?,?,?,?,?)`,
          [schoolId, e.class_name, e.subject_name, e.staff_id, e.day_of_week, e.start_time, e.end_time, e.room || null, useTerm, useYear]
        );
        applied++;
      }
    }

    return res.json({
      success: true,
      message: autoApply
        ? `Regenerated and applied ${applied} periods for ${classNames.length} class(es) — ${periodCoverage.coverage_pct}% coverage`
        : `Regenerated preview for ${classNames.length} class(es) — ${periodCoverage.coverage_pct}% coverage`,
      data: {
        cleared,
        applied,
        generated: generation.generated,
        by_class: generation.by_class,
        conflicts: generation.conflicts,
        period_coverage: periodCoverage,
        term: useTerm,
        academic_year: useYear,
        class_names: classNames,
        stats: generation.stats,
      },
    });
  } catch (err) {
    console.error('POST /dos/timetable-system/regenerate:', err);
    return res.status(500).json({ success: false, message: 'Failed to regenerate timetable' });
  }
});

async function scanTimetableConflicts(schoolId, { term, academicYear, className } = {}) {
  const where = ['tt.school_id = ?'];
  const params = [schoolId];
  if (term) { where.push('TRIM(COALESCE(tt.term, \'\')) = ?'); params.push(trimStr(term)); }
  if (academicYear) { where.push('TRIM(COALESCE(tt.academic_year, \'\')) = ?'); params.push(trimStr(academicYear)); }
  if (className) { where.push(`(${sqlNormLabelEquals('tt.class_name')})`); params.push(trimStr(className)); }

  const [rows] = await promisePool.query(
    `SELECT tt.id, tt.staff_id, tt.day_of_week, tt.start_time, tt.end_time, tt.class_name, tt.subject_name,
            tt.term, tt.academic_year,
            TRIM(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))) AS teacher_name
     FROM academic_timetables tt
     INNER JOIN users u ON u.id = tt.staff_id
     WHERE ${where.join(' AND ')}
     ORDER BY tt.staff_id, tt.day_of_week, tt.start_time`,
    params
  );

  const [configRows] = await promisePool.query(
    'SELECT subject_name, scheduling_rules_json FROM timetable_course_config WHERE school_id = ?',
    [schoolId]
  );
  const subjectRulesMap = new Map((configRows || []).map((c) => [c.subject_name, getSchedulingRulesFromConfig(c)]));

  const conflicts = [];
  const seen = new Set();

  for (const r of rows) {
    const rules = subjectRulesMap.get(r.subject_name) || { time_preference: 'any' };
    if (rules.time_preference !== 'any' && !slotMatchesSchedulingRules(r, rules)) {
      conflicts.push({
        id: `rv-${r.id}`,
        severity: 'critical',
        type: 'rule_violation',
        title: 'Rule Violation',
        message: `${r.class_name} ${r.subject_name} at ${String(r.start_time).slice(0, 5)} violates: ${schedulingRuleLabel(rules)}`,
        entry_id: r.id,
        class_name: r.class_name,
        subject_name: r.subject_name,
        teacher_name: r.teacher_name,
        teacher_id: r.staff_id,
        day: r.day_of_week,
        time: `${String(r.start_time).slice(0, 5)}–${String(r.end_time).slice(0, 5)}`,
        rule: schedulingRuleLabel(rules),
        scheduling_rules: rules,
        term: r.term,
        academic_year: r.academic_year,
        auto_fixable: true,
      });
    }
  }

  for (let i = 0; i < rows.length; i++) {
    for (let j = i + 1; j < rows.length; j++) {
      const a = rows[i];
      const b = rows[j];

      if (a.day_of_week === b.day_of_week && timesOverlap(a.start_time, a.end_time, b.start_time, b.end_time)) {
        if (a.staff_id === b.staff_id && a.class_name !== b.class_name) {
          const key = `tc-${Math.min(a.id, b.id)}-${Math.max(a.id, b.id)}`;
          if (!seen.has(key)) {
            seen.add(key);
            conflicts.push({
              id: key,
              severity: 'critical',
              type: 'teacher_clash',
              title: 'Teacher Clash',
              message: `${a.teacher_name} assigned to ${a.class_name} and ${b.class_name} at ${String(a.start_time).slice(0, 5)} on ${a.day_of_week}`,
              teacher_name: a.teacher_name,
              teacher_id: a.staff_id,
              entry_id_a: a.id,
              entry_id_b: b.id,
              move_entry_id: b.id,
              day: a.day_of_week,
              time: `${String(a.start_time).slice(0, 5)}–${String(a.end_time).slice(0, 5)}`,
              class_a: a.class_name,
              subject_a: a.subject_name,
              class_b: b.class_name,
              subject_b: b.subject_name,
              term: a.term,
              academic_year: a.academic_year,
              auto_fixable: true,
            });
          }
        }
        if (a.class_name === b.class_name) {
          const key = `cc-${Math.min(a.id, b.id)}-${Math.max(a.id, b.id)}`;
          if (!seen.has(key)) {
            seen.add(key);
            conflicts.push({
              id: key,
              severity: 'critical',
              type: 'class_clash',
              title: 'Class Double Booked',
              message: `${a.class_name} has ${a.subject_name} and ${b.subject_name} at the same time on ${a.day_of_week}`,
              class_name: a.class_name,
              entry_id_a: a.id,
              entry_id_b: b.id,
              move_entry_id: b.id,
              day: a.day_of_week,
              time: `${String(a.start_time).slice(0, 5)}–${String(a.end_time).slice(0, 5)}`,
              subject_a: a.subject_name,
              subject_b: b.subject_name,
              term: a.term,
              academic_year: a.academic_year,
              auto_fixable: true,
            });
          }
        }
      }
    }
  }

  const assignWhere = ['ta.school_id = ?'];
  const assignParams = [schoolId];
  if (className) { assignWhere.push(`(${sqlNormLabelEquals('ta.class_name')})`); assignParams.push(trimStr(className)); }
  const [assignments] = await promisePool.query(
    `SELECT ta.class_name, ta.subject_name, ta.teacher_user_id, ta.periods_per_week,
            TRIM(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))) AS teacher_name
     FROM timetable_assignments ta
     LEFT JOIN users u ON u.id = ta.teacher_user_id
     WHERE ${assignWhere.join(' AND ')}`,
    assignParams
  );

  const scheduledCounts = new Map();
  for (const r of rows) {
    const k = assignmentPlacementKey(r.class_name, r.subject_name, r.staff_id);
    scheduledCounts.set(k, (scheduledCounts.get(k) || 0) + rowSlotWeight(r));
  }

  for (const a of assignments) {
    const k = assignmentPlacementKey(a.class_name, a.subject_name, a.teacher_user_id);
    const expected = Number(a.periods_per_week) || 0;
    const actual = scheduledCounts.get(k) || 0;
    if (expected > 0 && actual < expected) {
      conflicts.push({
        id: `sm-${k}`,
        severity: 'warning',
        type: 'subject_missing',
        title: 'Subject Missing',
        message: `${a.class_name} missing ${expected - actual} ${a.subject_name} period(s) (${actual}/${expected} scheduled)`,
        class_name: a.class_name,
        subject_name: a.subject_name,
        teacher_name: a.teacher_name,
        expected,
        actual,
        missing: expected - actual,
        term: trimStr(term) || null,
        academic_year: trimStr(academicYear) || null,
        auto_fixable: false,
      });
    }
    if (expected > 0 && actual > expected) {
      conflicts.push({
        id: `so-${k}`,
        severity: 'warning',
        type: 'subject_over_scheduled',
        title: 'Too Many Periods',
        message: `${a.class_name} has ${actual - expected} extra ${a.subject_name} period(s) (${actual}/${expected} scheduled)`,
        class_name: a.class_name,
        subject_name: a.subject_name,
        teacher_name: a.teacher_name,
        expected,
        actual,
        excess: actual - expected,
        term: trimStr(term) || null,
        academic_year: trimStr(academicYear) || null,
        auto_fixable: false,
      });
    }
  }

  const critical = conflicts.filter((c) => c.severity === 'critical').length;
  const fixable = conflicts.filter((c) => c.auto_fixable).length;
  const warnings = conflicts.filter((c) => c.severity === 'warning').length;
  return {
    conflicts,
    summary: {
      total: conflicts.length,
      critical,
      warnings,
      fixable,
      ok: conflicts.length === 0,
    },
  };
}

async function loadTeachingSlotsForSchool(schoolId) {
  const [[scheduleRow]] = await promisePool.query(
    'SELECT * FROM timetable_school_schedule WHERE school_id = ? LIMIT 1',
    [schoolId]
  );
  const schedule = scheduleRow || {
    day_start_time: '08:00',
    day_end_time: '17:00',
    period_duration_mins: 40,
    active_days_json: JSON.stringify(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']),
    breaks_json: JSON.stringify([]),
  };
  schedule.breaks = typeof schedule.breaks_json === 'string'
    ? JSON.parse(schedule.breaks_json)
    : (schedule.breaks_json || []);
  const activeDays = typeof schedule.active_days_json === 'string'
    ? JSON.parse(schedule.active_days_json)
    : (schedule.active_days_json || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
  const slots = generateTimeSlots(schedule);
  return {
    activeDays,
    teachingSlots: slots.filter((s) => !s.is_break),
  };
}

async function findRelocatedSlotForEntry(schoolId, entry, teachingSlots, activeDays, excludeEntryId) {
  const term = trimStr(entry.term) || '';
  const year = trimStr(entry.academic_year) || '';
  const [allRows] = await promisePool.query(
    `SELECT id, staff_id, class_name, day_of_week, start_time, end_time, subject_name
     FROM academic_timetables
     WHERE school_id = ? AND TRIM(COALESCE(term, '')) = ? AND TRIM(COALESCE(academic_year, '')) = ?`,
    [schoolId, term, year]
  );

  const [[rulesRow]] = await promisePool.query(
    'SELECT scheduling_rules_json FROM timetable_course_config WHERE school_id = ? AND subject_name = ? LIMIT 1',
    [schoolId, entry.subject_name]
  );
  const rules = getSchedulingRulesFromConfig(rulesRow);

  const daysToTry = [entry.day_of_week, ...activeDays.filter((d) => d !== entry.day_of_week)];
  const orderedSlots = orderSlotsBySchedulingRules(
    teachingSlots.filter((s) => slotMatchesSchedulingRules(s, rules)),
    rules
  );
  const slotsToTry = orderedSlots.length ? orderedSlots : teachingSlots;

  for (const day of daysToTry) {
    for (const slot of slotsToTry) {
      if (!slotMatchesSchedulingRules(slot, rules)) continue;

      const classClash = (allRows || []).some(
        (r) => r.id !== excludeEntryId
          && r.class_name === entry.class_name
          && r.day_of_week === day
          && timesOverlap(slot.start_time, slot.end_time, r.start_time, r.end_time)
      );
      if (classClash) continue;

      const teacherClash = (allRows || []).some(
        (r) => r.id !== excludeEntryId
          && r.staff_id === entry.staff_id
          && r.day_of_week === day
          && timesOverlap(slot.start_time, slot.end_time, r.start_time, r.end_time)
      );
      if (teacherClash) continue;

      return { day_of_week: day, start_time: slot.start_time, end_time: slot.end_time };
    }
  }
  return null;
}

async function autoFixTimetableConflicts(schoolId, { term, academicYear, conflictIds } = {}) {
  const { activeDays, teachingSlots } = await loadTeachingSlotsForSchool(schoolId);
  const scan = await scanTimetableConflicts(schoolId, { term, academicYear });
  let toFix = (scan.conflicts || []).filter((c) => c.auto_fixable);
  if (Array.isArray(conflictIds) && conflictIds.length) {
    const idSet = new Set(conflictIds);
    toFix = toFix.filter((c) => idSet.has(c.id));
  }

  const fixed = [];
  const failed = [];
  const fixedEntryIds = new Set();

  for (const conflict of toFix) {
    const entryId = conflict.move_entry_id || conflict.entry_id;
    if (!entryId || fixedEntryIds.has(entryId)) continue;

    const [[entry]] = await promisePool.query(
      `SELECT id, class_name, subject_name, staff_id, day_of_week, start_time, end_time, term, academic_year
       FROM academic_timetables WHERE id = ? AND school_id = ? LIMIT 1`,
      [entryId, schoolId]
    );
    if (!entry) {
      failed.push({ conflict_id: conflict.id, reason: 'Entry not found' });
      continue;
    }

    const newSlot = await findRelocatedSlotForEntry(schoolId, entry, teachingSlots, activeDays, entryId);
    if (!newSlot) {
      failed.push({ conflict_id: conflict.id, reason: 'No free compliant slot found' });
      continue;
    }

    await promisePool.query(
      `UPDATE academic_timetables SET day_of_week = ?, start_time = ?, end_time = ? WHERE id = ? AND school_id = ?`,
      [newSlot.day_of_week, newSlot.start_time, newSlot.end_time, entryId, schoolId]
    );
    fixedEntryIds.add(entryId);
    fixed.push({
      conflict_id: conflict.id,
      type: conflict.type,
      entry_id: entryId,
      from: { day: entry.day_of_week, time: `${String(entry.start_time).slice(0, 5)}–${String(entry.end_time).slice(0, 5)}` },
      to: { day: newSlot.day_of_week, time: `${String(newSlot.start_time).slice(0, 5)}–${String(newSlot.end_time).slice(0, 5)}` },
      class_name: entry.class_name,
      subject_name: entry.subject_name,
    });
  }

  const afterScan = await scanTimetableConflicts(schoolId, { term, academicYear });
  return { fixed, failed, remaining: afterScan.conflicts, summary: afterScan.summary };
}

// ── Class weekly period coverage (applied timetables vs assignments) ──
router.get('/dos/timetable-system/class-coverage', requireRole(DOS_ACADEMIC_ADMIN), async (req, res) => {
  try {
    await ensureAcademicTables();
    await ensureSmartTimetableTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'Invalid session' });

    const term = trimStr(req.query?.term) || '';
    const academicYear = trimStr(req.query?.academic_year) || '';

    const ttWhere = ['school_id = ?'];
    const ttParams = [schoolId];
    if (term) { ttWhere.push('TRIM(COALESCE(term, \'\')) = ?'); ttParams.push(term); }
    if (academicYear) { ttWhere.push('TRIM(COALESCE(academic_year, \'\')) = ?'); ttParams.push(academicYear); }

    const [rows] = await promisePool.query(
      `SELECT id, class_name, subject_name, staff_id, day_of_week, start_time, end_time, term, academic_year
       FROM academic_timetables WHERE ${ttWhere.join(' AND ')}`,
      ttParams
    );

    const [assignments] = await promisePool.query(
      'SELECT * FROM timetable_assignments WHERE school_id = ? ORDER BY class_name, subject_name',
      [schoolId]
    );

    const classNames = [...new Set((assignments || []).map((a) => trimStr(a.class_name)).filter(Boolean))];
    const classAssignmentsMap = new Map();
    for (const a of assignments || []) {
      const cn = trimStr(a.class_name);
      if (!classAssignmentsMap.has(cn)) classAssignmentsMap.set(cn, []);
      classAssignmentsMap.get(cn).push(a);
    }

    const coverage = buildPeriodCoverage({ generated: rows || [] }, classAssignmentsMap, classNames);

    const slotSeen = new Map();
    const duplicateSlots = [];
    for (const r of rows || []) {
      const key = `${r.class_name}__${r.day_of_week}__${String(r.start_time).slice(0, 5)}`;
      if (slotSeen.has(key)) {
        duplicateSlots.push({
          class_name: r.class_name,
          day_of_week: r.day_of_week,
          start_time: r.start_time,
          subjects: [slotSeen.get(key).subject_name, r.subject_name],
        });
      } else {
        slotSeen.set(key, r);
      }
    }

    return res.json({
      success: true,
      data: {
        ...coverage,
        duplicate_slots: duplicateSlots,
        classes_without_assignments: classNames.filter((cn) => !(classAssignmentsMap.get(cn) || []).length),
      },
    });
  } catch (err) {
    console.error('GET /dos/timetable-system/class-coverage:', err);
    return res.status(500).json({ success: false, message: 'Failed to load class coverage' });
  }
});

// ── Conflict Center ──
router.get('/dos/timetable-system/conflict-center', requireRole(DOS_ACADEMIC_ADMIN), async (req, res) => {
  try {
    await ensureAcademicTables();
    await ensureSmartTimetableTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'Invalid session' });
    const term = trimStr(req.query?.term);
    const academicYear = trimStr(req.query?.academic_year);
    const className = trimStr(req.query?.class_name);
    const calendar = await getAcademicCalendarSettings(schoolId);
    const useTerm = term || (Array.isArray(calendar.active_terms) && calendar.active_terms.length ? calendar.active_terms[0] : 'Term 1');
    const useYear = academicYear || calendar.current_academic_year || '2025-2026';
    const result = await scanTimetableConflicts(schoolId, { term: useTerm, academicYear: useYear, className });
    return res.json({
      success: true,
      data: result.conflicts,
      summary: result.summary,
      filters: { term: useTerm, academic_year: useYear, class_name: className || null },
    });
  } catch (err) {
    console.error('GET /dos/timetable-system/conflict-center:', err);
    return res.status(500).json({ success: false, message: 'Failed to scan conflicts' });
  }
});

// ── Auto Fix Conflicts ──
router.post('/dos/timetable-system/auto-fix', requireRole(DOS_ACADEMIC_ADMIN), async (req, res) => {
  try {
    await ensureAcademicTables();
    await ensureSmartTimetableTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'Invalid session' });
    const { term, academic_year, conflict_ids } = req.body || {};
    const calendar = await getAcademicCalendarSettings(schoolId);
    const useTerm = trimStr(term) || (Array.isArray(calendar.active_terms) && calendar.active_terms.length ? calendar.active_terms[0] : 'Term 1');
    const useYear = trimStr(academic_year) || calendar.current_academic_year || '2025-2026';
    const result = await autoFixTimetableConflicts(schoolId, {
      term: useTerm,
      academicYear: useYear,
      conflictIds: conflict_ids,
    });
    return res.json({
      success: true,
      message: `Auto-fixed ${result.fixed.length} issue(s)${result.failed.length ? `, ${result.failed.length} could not be fixed` : ''}`,
      data: result,
    });
  } catch (err) {
    console.error('POST /dos/timetable-system/auto-fix:', err);
    return res.status(500).json({ success: false, message: 'Failed to auto-fix conflicts' });
  }
});

// ── Conflict Checker (legacy POST) ──
router.post('/dos/timetable-system/check-conflicts', requireRole(DOS_ACADEMIC_ADMIN), async (req, res) => {
  try {
    await ensureAcademicTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'Invalid session' });
    const { term, academic_year, class_name } = req.body || {};
    const result = await scanTimetableConflicts(schoolId, { term, academicYear: academic_year, className: class_name });
    return res.json({ success: true, data: result.conflicts, summary: result.summary });
  } catch (err) {
    console.error('POST /dos/timetable-system/check-conflicts:', err);
    return res.status(500).json({ success: false, message: 'Failed to check conflicts' });
  }
});

// ── Class teacher (homeroom) assignments ─────────────────────────
let classTeacherTablesReady = false;

async function ensureClassTeacherTables() {
  if (classTeacherTablesReady) return;
  await ensureSmartTimetableTables();
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS class_teacher_assignments (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      class_name VARCHAR(120) NOT NULL,
      teacher_user_id INT UNSIGNED NOT NULL,
      academic_year VARCHAR(64) NULL,
      assigned_by_user_id INT UNSIGNED NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_cta_school_class (school_id, class_name),
      KEY idx_cta_teacher (school_id, teacher_user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  classTeacherTablesReady = true;
}

async function syncClassTeacherTimetableRow(schoolId, className, teacherUserId) {
  const label = normalizeGradebookLabel(className);
  await promisePool.query(
    `DELETE FROM timetable_assignments
     WHERE school_id = ? AND (${sqlNormLabelEquals('class_name')}) AND subject_name = ?`,
    [schoolId, label, CLASS_TEACHER_SUBJECT]
  );
  if (teacherUserId) {
    await promisePool.query(
      `INSERT INTO timetable_assignments (school_id, class_name, subject_name, teacher_user_id, periods_per_week, room)
       VALUES (?,?,?,?,0,NULL)
       ON DUPLICATE KEY UPDATE periods_per_week = VALUES(periods_per_week)`,
      [schoolId, label, CLASS_TEACHER_SUBJECT, Number(teacherUserId)]
    );
  }
}

function resolveDosUserId(req) {
  return req.session?.userId || req.session?.user?.id || null;
}

router.get('/dos/class-teachers', requireRole(DOS_ACADEMIC_ADMIN), async (req, res) => {
  try {
    await ensureClassTeacherTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School not found in session.' });

    const [enrollmentRows] = await promisePool.query(
      `SELECT
         COALESCE(NULLIF(TRIM(class_name), ''), 'Unknown') AS class_name,
         COUNT(*) AS student_count
       FROM students
       WHERE school_id = ?
       GROUP BY COALESCE(NULLIF(TRIM(class_name), ''), 'Unknown')
       ORDER BY class_name ASC`,
      [schoolId]
    );

    const [assignmentRows] = await promisePool.query(
      `SELECT cta.id, cta.class_name, cta.teacher_user_id, cta.academic_year, cta.created_at, cta.updated_at,
              TRIM(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))) AS teacher_name,
              u.email AS teacher_email
       FROM class_teacher_assignments cta
       INNER JOIN users u ON u.id = cta.teacher_user_id AND u.deleted_at IS NULL
       WHERE cta.school_id = ?
       ORDER BY cta.class_name ASC`,
      [schoolId]
    );

    const assignmentByClass = new Map(
      assignmentRows.map((r) => [normalizeGradebookLabel(r.class_name).toLowerCase(), r])
    );

    const seen = new Set();
    const rows = [];
    for (const e of enrollmentRows) {
      const className = normalizeGradebookLabel(e.class_name);
      if (!className || className === 'Unknown') continue;
      const key = className.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      const a = assignmentByClass.get(key);
      rows.push({
        class_name: className,
        student_count: Number(e.student_count || 0),
        assignment_id: a?.id || null,
        teacher_user_id: a?.teacher_user_id || null,
        teacher_name: a?.teacher_name || null,
        teacher_email: a?.teacher_email || null,
        academic_year: a?.academic_year || null,
        assigned_at: a?.created_at || null,
      });
      assignmentByClass.delete(key);
    }

    for (const a of assignmentByClass.values()) {
      const className = normalizeGradebookLabel(a.class_name);
      rows.push({
        class_name: className,
        student_count: 0,
        assignment_id: a.id,
        teacher_user_id: a.teacher_user_id,
        teacher_name: a.teacher_name,
        teacher_email: a.teacher_email,
        academic_year: a.academic_year,
        assigned_at: a.created_at,
      });
    }

    rows.sort((a, b) => String(a.class_name).localeCompare(String(b.class_name)));

    const assigned_count = rows.filter((r) => r.teacher_user_id).length;
    return res.json({
      success: true,
      data: {
        rows,
        assigned_count,
        unassigned_count: rows.length - assigned_count,
      },
    });
  } catch (err) {
    console.error('GET /dos/class-teachers:', err);
    return res.status(500).json({ success: false, message: 'Failed to load class teachers' });
  }
});

router.post('/dos/class-teachers', requireRole(DOS_ACADEMIC_ADMIN), async (req, res) => {
  const conn = await promisePool.getConnection();
  try {
    await ensureClassTeacherTables();
    const schoolId = resolveSchoolId(req);
    const userId = resolveDosUserId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School not found in session.' });

    const className = normalizeGradebookLabel(req.body?.class_name);
    const teacherUserId = Number(req.body?.teacher_user_id);
    const academicYear = trimStr(req.body?.academic_year) || null;

    if (!className) {
      return res.status(400).json({ success: false, message: 'class_name is required' });
    }
    if (!teacherUserId) {
      return res.status(400).json({ success: false, message: 'teacher_user_id is required' });
    }
    if (!(await assertTeachingStaffForSchool(schoolId, teacherUserId))) {
      return res.status(400).json({ success: false, message: 'Selected user is not registered teaching staff.' });
    }

    await conn.beginTransaction();
    await conn.query(
      `DELETE FROM class_teacher_assignments
       WHERE school_id = ? AND (${sqlNormLabelEquals('class_name')})`,
      [schoolId, className]
    );
    const [ins] = await conn.query(
      `INSERT INTO class_teacher_assignments (school_id, class_name, teacher_user_id, academic_year, assigned_by_user_id)
       VALUES (?,?,?,?,?)`,
      [schoolId, className, teacherUserId, academicYear, userId]
    );
    await conn.commit();

    await syncClassTeacherTimetableRow(schoolId, className, teacherUserId);

    return res.json({
      success: true,
      message: 'Class teacher assigned successfully.',
      data: { id: ins.insertId, class_name: className, teacher_user_id: teacherUserId },
    });
  } catch (err) {
    try { await conn.rollback(); } catch (_) {}
    console.error('POST /dos/class-teachers:', err);
    return res.status(500).json({ success: false, message: 'Failed to assign class teacher' });
  } finally {
    conn.release();
  }
});

router.delete('/dos/class-teachers/:id', requireRole(DOS_ACADEMIC_ADMIN), async (req, res) => {
  try {
    await ensureClassTeacherTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School not found in session.' });

    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid assignment id' });

    const [[row]] = await promisePool.query(
      'SELECT class_name FROM class_teacher_assignments WHERE id = ? AND school_id = ? LIMIT 1',
      [id, schoolId]
    );
    if (!row) return res.status(404).json({ success: false, message: 'Assignment not found' });

    await promisePool.query('DELETE FROM class_teacher_assignments WHERE id = ? AND school_id = ?', [id, schoolId]);
    await syncClassTeacherTimetableRow(schoolId, row.class_name, null);

    return res.json({ success: true, message: 'Class teacher assignment removed.' });
  } catch (err) {
    console.error('DELETE /dos/class-teachers/:id:', err);
    return res.status(500).json({ success: false, message: 'Failed to remove class teacher' });
  }
});

// ════════════════════════════════════════════════════════════════
// Marks Academic — classes overview, class–subject map, assessment types
// ════════════════════════════════════════════════════════════════

router.get('/dos/marks-academic/classes', requireRole(DOS_ACADEMIC_ADMIN), async (req, res) => {
  try {
    await ensureAcademicTables();
    await ensureClassTeacherTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School not found in session.' });

    const [registryRows] = await promisePool.query(
      'SELECT id, group_name, stream_name, category, combination FROM school_classes WHERE school_id = ?',
      [schoolId]
    );
    const [studentRows] = await promisePool.query(
      `SELECT DISTINCT TRIM(class_name) AS class_name FROM students WHERE school_id = ? AND TRIM(IFNULL(class_name,'')) <> ''`,
      [schoolId]
    );
    const studentClassNames = studentRows.map((r) => r.class_name);
    const allClassNames = collectSchoolRegisteredClassNames({ registryRows, studentClassNames });

    const [enrollmentRows] = await promisePool.query(
      `SELECT COALESCE(NULLIF(TRIM(class_name), ''), 'Unknown') AS class_name, COUNT(*) AS student_count
       FROM students WHERE school_id = ? GROUP BY COALESCE(NULLIF(TRIM(class_name), ''), 'Unknown')`,
      [schoolId]
    );
    const enrollmentMap = new Map(
      enrollmentRows.map((r) => [normalizeGradebookLabel(r.class_name).toLowerCase(), Number(r.student_count || 0)])
    );

    const [assignmentRows] = await promisePool.query(
      `SELECT cta.id AS assignment_id, cta.class_name, cta.teacher_user_id, cta.academic_year, cta.created_at AS assigned_at,
              TRIM(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))) AS teacher_name,
              u.email AS teacher_email
       FROM class_teacher_assignments cta
       INNER JOIN users u ON u.id = cta.teacher_user_id AND u.deleted_at IS NULL
       WHERE cta.school_id = ?`,
      [schoolId]
    );
    const teacherMap = new Map(
      assignmentRows.map((r) => [normalizeGradebookLabel(r.class_name).toLowerCase(), r])
    );

    const registryMap = new Map();
    for (const r of registryRows) {
      const label = formatSchoolClassRow(r);
      if (label) registryMap.set(label.toLowerCase(), r);
    }

    const rows = allClassNames.map((className) => {
      const key = className.toLowerCase();
      const reg = registryMap.get(key);
      const t = teacherMap.get(key);
      return {
        class_name: className,
        registry_id: reg?.id || null,
        group_name: reg?.group_name || null,
        stream_name: reg?.stream_name || null,
        category: reg?.category || null,
        combination: reg?.combination || null,
        student_count: enrollmentMap.get(key) || 0,
        assignment_id: t?.assignment_id || null,
        teacher_user_id: t?.teacher_user_id || null,
        teacher_name: t?.teacher_name || null,
        teacher_email: t?.teacher_email || null,
        academic_year: t?.academic_year || null,
        assigned_at: t?.assigned_at || null,
      };
    });

    const assigned_count = rows.filter((r) => r.teacher_user_id).length;
    return res.json({
      success: true,
      data: {
        rows,
        total_classes: rows.length,
        assigned_count,
        unassigned_count: rows.length - assigned_count,
        total_students: rows.reduce((s, r) => s + r.student_count, 0),
      },
    });
  } catch (err) {
    console.error('GET /dos/marks-academic/classes:', err);
    return res.status(500).json({ success: false, message: 'Failed to load classes' });
  }
});

router.get('/dos/class-subjects', requireRole(DOS_ACADEMIC_ADMIN), async (req, res) => {
  try {
    await ensureSchoolMarksAcademicTables();
    await ensureSmartTimetableTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School not found in session.' });

    const classNameFilter = trimStr(req.query.class_name);

    const [catalogue] = await promisePool.query(
      'SELECT id, name, category, subject_code, is_active FROM school_subjects WHERE school_id = ?',
      [schoolId]
    );
    const subjectByName = new Map(
      catalogue.map((s) => [normalizeGradebookLabel(s.name).toLowerCase(), s])
    );

    const [scsRows] = await promisePool.query(
      `SELECT scs.id, scs.class_name, scs.subject_id, scs.created_at,
              ss.name AS subject_name, ss.category, ss.subject_code, ss.is_active
       FROM school_class_subjects scs
       INNER JOIN school_subjects ss ON ss.id = scs.subject_id AND ss.school_id = scs.school_id
       WHERE scs.school_id = ?
       ORDER BY scs.class_name ASC, ss.name ASC`,
      [schoolId]
    );

    const [ttRows] = await promisePool.query(
      `SELECT DISTINCT class_name, subject_name
       FROM timetable_assignments
       WHERE school_id = ?
         AND TRIM(IFNULL(subject_name, '')) <> ''
         AND LOWER(TRIM(subject_name)) NOT IN ('class teacher', 'class_teacher')`,
      [schoolId]
    );

    const mergedMap = new Map();

    for (const tt of ttRows) {
      const cn = normalizeGradebookLabel(tt.class_name);
      const sn = normalizeGradebookLabel(tt.subject_name);
      const sub = subjectByName.get(sn.toLowerCase());
      if (!cn || !sub) continue;
      const key = `${cn.toLowerCase()}|${sub.id}`;
      mergedMap.set(key, {
        id: null,
        class_name: cn,
        subject_id: sub.id,
        subject_name: sub.name,
        category: sub.category,
        subject_code: sub.subject_code,
        is_active: sub.is_active,
        source: 'timetable',
        from_timetable: true,
        created_at: null,
      });
    }

    for (const r of scsRows) {
      const cn = normalizeGradebookLabel(r.class_name);
      const key = `${cn.toLowerCase()}|${r.subject_id}`;
      if (mergedMap.has(key)) {
        const existing = mergedMap.get(key);
        existing.id = r.id;
        existing.source = 'both';
        existing.created_at = r.created_at;
      } else {
        mergedMap.set(key, {
          ...r,
          class_name: cn,
          source: 'manual',
          from_timetable: false,
        });
      }
    }

    let rows = Array.from(mergedMap.values());
    if (classNameFilter) {
      const filterKey = normalizeGradebookLabel(classNameFilter).toLowerCase();
      rows = rows.filter((r) => normalizeGradebookLabel(r.class_name).toLowerCase() === filterKey);
    }
    rows.sort((a, b) => {
      const c = String(a.class_name).localeCompare(String(b.class_name));
      if (c !== 0) return c;
      return String(a.subject_name).localeCompare(String(b.subject_name));
    });

    const byClass = {};
    for (const r of rows) {
      const cn = normalizeGradebookLabel(r.class_name);
      if (!byClass[cn]) byClass[cn] = [];
      byClass[cn].push(r);
    }

    return res.json({
      success: true,
      data: {
        rows,
        by_class: byClass,
        timetable_linked: true,
        timetable_assignment_count: ttRows.length,
      },
    });
  } catch (err) {
    console.error('GET /dos/class-subjects:', err);
    return res.status(500).json({ success: false, message: 'Failed to load class subjects' });
  }
});

router.put('/dos/class-subjects', requireRole(DOS_ACADEMIC_ADMIN), async (req, res) => {
  const conn = await promisePool.getConnection();
  try {
    await ensureSchoolMarksAcademicTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School not found in session.' });

    const className = normalizeGradebookLabel(req.body?.class_name);
    const subjectIds = Array.isArray(req.body?.subject_ids) ? req.body.subject_ids.map(Number).filter(Boolean) : [];
    if (!className) return res.status(400).json({ success: false, message: 'class_name is required' });

    await conn.beginTransaction();
    await conn.query(
      `DELETE FROM school_class_subjects WHERE school_id = ? AND (${sqlNormLabelEquals('class_name')})`,
      [schoolId, className]
    );
    for (const subjectId of subjectIds) {
      const [[sub]] = await conn.query(
        'SELECT id FROM school_subjects WHERE id = ? AND school_id = ? AND is_active = 1 LIMIT 1',
        [subjectId, schoolId]
      );
      if (!sub) continue;
      await conn.query(
        'INSERT INTO school_class_subjects (school_id, class_name, subject_id) VALUES (?,?,?)',
        [schoolId, className, subjectId]
      );
    }
    await conn.commit();
    return res.json({ success: true, message: 'Class subjects updated.', data: { class_name: className, count: subjectIds.length } });
  } catch (err) {
    try { await conn.rollback(); } catch (_) {}
    console.error('PUT /dos/class-subjects:', err);
    return res.status(500).json({ success: false, message: 'Failed to update class subjects' });
  } finally {
    conn.release();
  }
});

router.post('/dos/class-subjects', requireRole(DOS_ACADEMIC_ADMIN), async (req, res) => {
  try {
    await ensureSchoolMarksAcademicTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School not found in session.' });

    const className = normalizeGradebookLabel(req.body?.class_name);
    const subjectId = Number(req.body?.subject_id);
    if (!className || !subjectId) {
      return res.status(400).json({ success: false, message: 'class_name and subject_id are required' });
    }

    const [[sub]] = await promisePool.query(
      'SELECT id, name FROM school_subjects WHERE id = ? AND school_id = ? LIMIT 1',
      [subjectId, schoolId]
    );
    if (!sub) return res.status(404).json({ success: false, message: 'Subject not found' });

    const [ins] = await promisePool.query(
      `INSERT INTO school_class_subjects (school_id, class_name, subject_id) VALUES (?,?,?)
       ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)`,
      [schoolId, className, subjectId]
    );

    return res.status(201).json({
      success: true,
      message: 'Subject assigned to class.',
      data: { id: ins.insertId, class_name: className, subject_id: subjectId, subject_name: sub.name },
    });
  } catch (err) {
    console.error('POST /dos/class-subjects:', err);
    return res.status(500).json({ success: false, message: 'Failed to assign subject' });
  }
});

router.delete('/dos/class-subjects/:id', requireRole(DOS_ACADEMIC_ADMIN), async (req, res) => {
  try {
    await ensureSchoolMarksAcademicTables();
    const schoolId = resolveSchoolId(req);
    const id = Number(req.params.id);
    await promisePool.query('DELETE FROM school_class_subjects WHERE id = ? AND school_id = ?', [id, schoolId]);
    return res.json({ success: true, message: 'Subject removed from class.' });
  } catch (err) {
    console.error('DELETE /dos/class-subjects/:id:', err);
    return res.status(500).json({ success: false, message: 'Failed to remove class subject' });
  }
});

router.get('/dos/assessment-types', requireRole(DOS_ACADEMIC_ADMIN), async (req, res) => {
  try {
    await ensureSchoolMarksAcademicTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School not found in session.' });

    const schoolLevel = trimStr(req.query.school_level) || 'ALL';
    await seedDefaultAssessmentTypesIfEmpty(schoolId, schoolLevel);

    const [rows] = await promisePool.query(
      `SELECT id, name, slug, weight_percent, sort_order, is_active, school_level, created_at, updated_at
       FROM school_assessment_types
       WHERE school_id = ? AND school_level = ?
       ORDER BY sort_order ASC, id ASC`,
      [schoolId, schoolLevel]
    );

    const total_weight = rows.filter((r) => r.is_active).reduce((s, r) => s + Number(r.weight_percent || 0), 0);
    return res.json({ success: true, data: { rows, total_weight, school_level: schoolLevel } });
  } catch (err) {
    console.error('GET /dos/assessment-types:', err);
    return res.status(500).json({ success: false, message: 'Failed to load assessment types' });
  }
});

router.post('/dos/assessment-types', requireRole(DOS_ACADEMIC_ADMIN), async (req, res) => {
  try {
    await ensureSchoolMarksAcademicTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School not found in session.' });

    const name = trimStr(req.body?.name);
    const schoolLevel = trimStr(req.body?.school_level) || 'ALL';
    const weightPercent = Number(req.body?.weight_percent);
    const slug = trimStr(req.body?.slug) || slugifyAssessmentName(name);
    const sortOrder = Number(req.body?.sort_order) || 0;

    if (!name) return res.status(400).json({ success: false, message: 'name is required' });
    if (!Number.isFinite(weightPercent) || weightPercent < 0 || weightPercent > 100) {
      return res.status(400).json({ success: false, message: 'weight_percent must be between 0 and 100' });
    }

    const [ins] = await promisePool.query(
      `INSERT INTO school_assessment_types (school_id, name, slug, weight_percent, sort_order, is_active, school_level)
       VALUES (?,?,?,?,?,1,?)`,
      [schoolId, name, slug, weightPercent, sortOrder, schoolLevel]
    );
    await syncAssessmentTypesToGradebookColumns(schoolId);

    return res.status(201).json({
      success: true,
      message: 'Assessment type created.',
      data: { id: ins.insertId, name, slug, weight_percent: weightPercent, school_level: schoolLevel },
    });
  } catch (err) {
    if (String(err?.code) === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'An assessment type with this slug already exists for this level.' });
    }
    console.error('POST /dos/assessment-types:', err);
    return res.status(500).json({ success: false, message: 'Failed to create assessment type' });
  }
});

router.put('/dos/assessment-types/:id', requireRole(DOS_ACADEMIC_ADMIN), async (req, res) => {
  try {
    await ensureSchoolMarksAcademicTables();
    const schoolId = resolveSchoolId(req);
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid id' });

    const [[existing]] = await promisePool.query(
      'SELECT * FROM school_assessment_types WHERE id = ? AND school_id = ? LIMIT 1',
      [id, schoolId]
    );
    if (!existing) return res.status(404).json({ success: false, message: 'Assessment type not found' });

    const name = req.body?.name != null ? trimStr(req.body.name) : existing.name;
    const weightPercent = req.body?.weight_percent != null ? Number(req.body.weight_percent) : Number(existing.weight_percent);
    const sortOrder = req.body?.sort_order != null ? Number(req.body.sort_order) : existing.sort_order;
    const isActive = req.body?.is_active != null ? (req.body.is_active ? 1 : 0) : existing.is_active;

    if (!name) return res.status(400).json({ success: false, message: 'name is required' });
    if (!Number.isFinite(weightPercent) || weightPercent < 0 || weightPercent > 100) {
      return res.status(400).json({ success: false, message: 'weight_percent must be between 0 and 100' });
    }

    await promisePool.query(
      `UPDATE school_assessment_types SET name = ?, weight_percent = ?, sort_order = ?, is_active = ? WHERE id = ? AND school_id = ?`,
      [name, weightPercent, sortOrder, isActive, id, schoolId]
    );
    await syncAssessmentTypesToGradebookColumns(schoolId);

    return res.json({ success: true, message: 'Assessment type updated.' });
  } catch (err) {
    console.error('PUT /dos/assessment-types/:id:', err);
    return res.status(500).json({ success: false, message: 'Failed to update assessment type' });
  }
});

router.patch('/dos/assessment-types/reorder', requireRole(DOS_ACADEMIC_ADMIN), async (req, res) => {
  try {
    await ensureSchoolMarksAcademicTables();
    const schoolId = resolveSchoolId(req);
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (!items.length) return res.status(400).json({ success: false, message: 'items[] required' });

    for (const item of items) {
      const id = Number(item.id);
      const sortOrder = Number(item.sort_order);
      if (!id || !Number.isFinite(sortOrder)) continue;
      await promisePool.query(
        'UPDATE school_assessment_types SET sort_order = ? WHERE id = ? AND school_id = ?',
        [sortOrder, id, schoolId]
      );
    }
    await syncAssessmentTypesToGradebookColumns(schoolId);
    return res.json({ success: true, message: 'Order updated.' });
  } catch (err) {
    console.error('PATCH /dos/assessment-types/reorder:', err);
    return res.status(500).json({ success: false, message: 'Failed to reorder' });
  }
});

router.delete('/dos/assessment-types/:id', requireRole(DOS_ACADEMIC_ADMIN), async (req, res) => {
  try {
    await ensureSchoolMarksAcademicTables();
    const schoolId = resolveSchoolId(req);
    const id = Number(req.params.id);
    const [[row]] = await promisePool.query(
      'SELECT slug FROM school_assessment_types WHERE id = ? AND school_id = ? LIMIT 1',
      [id, schoolId]
    );
    if (!row) return res.status(404).json({ success: false, message: 'Not found' });

    await promisePool.query('DELETE FROM school_assessment_types WHERE id = ? AND school_id = ?', [id, schoolId]);
    await promisePool.query('DELETE FROM school_gradebook_columns WHERE school_id = ? AND slug = ?', [schoolId, row.slug]);
    return res.json({ success: true, message: 'Assessment type removed.' });
  } catch (err) {
    console.error('DELETE /dos/assessment-types/:id:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete assessment type' });
  }
});

const {
  getSchoolAcademicHealthWeights,
  saveSchoolAcademicHealthWeights,
} = require('../utils/academicHealthSchema');

router.get('/dos/academic-health-weights', requireRole(DOS_ACADEMIC_ADMIN), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    const data = await getSchoolAcademicHealthWeights(schoolId);
    return res.json({ success: true, data });
  } catch (err) {
    console.error('GET /dos/academic-health-weights:', err);
    return res.status(500).json({ success: false, message: 'Failed to load academic health weights' });
  }
});

router.put('/dos/academic-health-weights', requireRole(DOS_ACADEMIC_ADMIN), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    const data = await saveSchoolAcademicHealthWeights(schoolId, req.body || {});
    return res.json({ success: true, data, message: 'Academic health formula saved' });
  } catch (err) {
    console.error('PUT /dos/academic-health-weights:', err);
    return res.status(400).json({ success: false, message: err.message || 'Failed to save academic health weights' });
  }
});

// Gradebook columns (manager UI compatibility)
router.get('/dos/gradebook-columns', requireRole(DOS_ACADEMIC_ADMIN), async (req, res) => {
  try {
    await ensureSchoolGradebookSchema();
    const schoolId = resolveSchoolId(req);
    await seedDefaultGradebookColumnsIfEmpty(schoolId);
    const [rows] = await promisePool.query(
      'SELECT id, slug, label, sort_order, default_max_score FROM school_gradebook_columns WHERE school_id = ? ORDER BY sort_order ASC, id ASC',
      [schoolId]
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /dos/gradebook-columns:', err);
    return res.status(500).json({ success: false, message: 'Failed to load gradebook columns' });
  }
});

router.get('/dos/grading-system', requireRole(DOS_ACADEMIC_ADMIN), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School not found in session.' });
    const bands = await getSchoolGradingScale(schoolId);
    return res.json({ success: true, data: { bands, defaults: DEFAULT_GRADE_BANDS } });
  } catch (err) {
    console.error('GET /dos/grading-system:', err);
    return res.status(500).json({ success: false, message: 'Failed to load grading system' });
  }
});

router.put('/dos/grading-system', requireRole(DOS_ACADEMIC_ADMIN), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School not found in session.' });
    const bands = Array.isArray(req.body?.bands) ? req.body.bands : [];
    const saved = await saveSchoolGradingScale(schoolId, bands);
    return res.json({ success: true, message: 'Grading system saved.', data: { bands: saved } });
  } catch (err) {
    console.error('PUT /dos/grading-system:', err);
    return res.status(500).json({ success: false, message: err?.message || 'Failed to save grading system' });
  }
});

router.get('/dos/competency-categories', requireRole(DOS_ACADEMIC_ADMIN), async (req, res) => {
  try {
    await ensureCompetencyTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School not found in session.' });
    const rows = await listCompetencyCategories(schoolId, { activeOnly: false });
    return res.json({ success: true, data: { rows, rating_levels: RATING_LEVELS } });
  } catch (err) {
    console.error('GET /dos/competency-categories:', err);
    return res.status(500).json({ success: false, message: 'Failed to load competency categories' });
  }
});

router.post('/dos/competency-categories', requireRole(DOS_ACADEMIC_ADMIN), async (req, res) => {
  try {
    await ensureCompetencyTables();
    const schoolId = resolveSchoolId(req);
    const name = trimStr(req.body?.name);
    if (!schoolId || !name) {
      return res.status(400).json({ success: false, message: 'name is required' });
    }
    const sortOrder = Number(req.body?.sort_order) || 0;
    const [ins] = await promisePool.query(
      `INSERT INTO school_competency_categories (school_id, name, sort_order, is_active)
       VALUES (?,?,?,1)`,
      [schoolId, name, sortOrder],
    );
    return res.status(201).json({ success: true, data: { id: ins.insertId, name } });
  } catch (err) {
    if (String(err?.code) === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'Category already exists.' });
    }
    console.error('POST /dos/competency-categories:', err);
    return res.status(500).json({ success: false, message: 'Failed to create category' });
  }
});

router.put('/dos/competency-categories/:id', requireRole(DOS_ACADEMIC_ADMIN), async (req, res) => {
  try {
    await ensureCompetencyTables();
    const schoolId = resolveSchoolId(req);
    const id = Number(req.params.id);
    const name = req.body?.name != null ? trimStr(req.body.name) : null;
    const sortOrder = req.body?.sort_order != null ? Number(req.body.sort_order) : null;
    const isActive = req.body?.is_active != null ? (req.body.is_active ? 1 : 0) : null;
    const fields = [];
    const params = [];
    if (name) { fields.push('name = ?'); params.push(name); }
    if (sortOrder != null && Number.isFinite(sortOrder)) { fields.push('sort_order = ?'); params.push(sortOrder); }
    if (isActive != null) { fields.push('is_active = ?'); params.push(isActive); }
    if (!fields.length) return res.status(400).json({ success: false, message: 'Nothing to update' });
    params.push(id, schoolId);
    await promisePool.query(
      `UPDATE school_competency_categories SET ${fields.join(', ')} WHERE id = ? AND school_id = ?`,
      params,
    );
    return res.json({ success: true, message: 'Category updated.' });
  } catch (err) {
    console.error('PUT /dos/competency-categories/:id:', err);
    return res.status(500).json({ success: false, message: 'Failed to update category' });
  }
});

router.delete('/dos/competency-categories/:id', requireRole(DOS_ACADEMIC_ADMIN), async (req, res) => {
  try {
    await ensureCompetencyTables();
    const schoolId = resolveSchoolId(req);
    const id = Number(req.params.id);
    await promisePool.query(
      'DELETE FROM school_competency_categories WHERE id = ? AND school_id = ?',
      [id, schoolId],
    );
    return res.json({ success: true, message: 'Category removed.' });
  } catch (err) {
    console.error('DELETE /dos/competency-categories/:id:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete category' });
  }
});

module.exports = router;

