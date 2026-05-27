/**
 * Per-academic-year class enrollment snapshots.
 * Promotion updates the live `students` row but keeps historical roster rows here.
 */
const { promisePool } = require('../config/database');

let tableReady = false;

function trimStr(v) {
  if (v === undefined || v === null) return '';
  return String(v).trim();
}

const SQL_YEAR_EQ = (leftCol, rightCol) =>
  `CONVERT(TRIM(COALESCE(${leftCol}, '')) USING utf8mb4) COLLATE utf8mb4_unicode_ci = CONVERT(TRIM(${rightCol}) USING utf8mb4) COLLATE utf8mb4_unicode_ci`;

const SQL_YEAR_PARAM = (col) =>
  `CONVERT(TRIM(COALESCE(${col}, '')) USING utf8mb4) COLLATE utf8mb4_unicode_ci = CONVERT(? USING utf8mb4) COLLATE utf8mb4_unicode_ci`;

function inferNextAcademicYear(fromYear) {
  const y = trimStr(fromYear);
  const m = y.match(/^(\d{4})-(\d{4})$/);
  if (!m) return y;
  return `${Number(m[1]) + 1}-${Number(m[2]) + 1}`;
}

async function ensureStudentYearEnrollmentsTable() {
  if (tableReady) return;
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS student_year_enrollments (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      student_id INT UNSIGNED NOT NULL,
      academic_year VARCHAR(32) NOT NULL,
      class_name VARCHAR(120) NULL,
      status VARCHAR(32) NOT NULL DEFAULT 'active',
      is_current TINYINT(1) NOT NULL DEFAULT 0,
      promoted_to_class VARCHAR(120) NULL,
      promoted_to_year VARCHAR(32) NULL,
      recorded_by_user_id INT UNSIGNED NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_student_year (school_id, student_id, academic_year),
      INDEX idx_school_year_class (school_id, academic_year, class_name),
      INDEX idx_school_student_current (school_id, student_id, is_current)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  tableReady = true;
}

async function resolveSchoolCurrentYear(schoolId) {
  if (!schoolId) return '';
  const [[row]] = await promisePool
    .query(
      `SELECT current_academic_year FROM school_academic_settings WHERE school_id = ? LIMIT 1`,
      [schoolId]
    )
    .catch(() => [[null]]);
  let year = trimStr(row?.current_academic_year);
  if (year) return year;
  const [[reg]] = await promisePool
    .query(
      `SELECT academic_year FROM school_academic_year_registry
       WHERE school_id = ? AND is_current = 1 LIMIT 1`,
      [schoolId]
    )
    .catch(() => [[null]]);
  return trimStr(reg?.academic_year);
}

async function backfillSchoolEnrollments(schoolId, options = {}) {
  if (!schoolId) return;
  await ensureStudentYearEnrollmentsTable();
  const currentYear = trimStr(options.currentYear) || (await resolveSchoolCurrentYear(schoolId));

  await promisePool.query(
    `INSERT INTO student_year_enrollments
       (school_id, student_id, academic_year, class_name, status, is_current)
     SELECT s.school_id, s.id,
            TRIM(s.academic_year),
            NULLIF(TRIM(s.class_name), ''),
            'active', 1
     FROM students s
     WHERE s.school_id = ?
       AND TRIM(COALESCE(s.academic_year, '')) <> ''
       AND NOT EXISTS (
         SELECT 1 FROM student_year_enrollments e
         WHERE e.school_id = s.school_id
           AND e.student_id = s.id
           AND ${SQL_YEAR_EQ('e.academic_year', 's.academic_year')}
       )`,
    [schoolId]
  );

  await promisePool.query(
    `INSERT INTO student_year_enrollments
       (school_id, student_id, academic_year, class_name, status, is_current)
     SELECT r.school_id, r.student_id,
            TRIM(r.academic_year),
            NULLIF(TRIM(r.class_name), ''),
            CASE
              WHEN LOWER(TRIM(r.status_code)) = 'repeated' THEN 'repeated'
              WHEN LOWER(TRIM(r.status_code)) = 'promoted' THEN 'promoted'
              ELSE 'active'
            END,
            0
     FROM dos_student_academic_records r
     WHERE r.school_id = ?
       AND TRIM(COALESCE(r.academic_year, '')) <> ''
       AND TRIM(COALESCE(r.class_name, '')) <> ''
     ON DUPLICATE KEY UPDATE
       class_name = COALESCE(NULLIF(TRIM(VALUES(class_name)), ''), class_name),
       status = CASE
         WHEN VALUES(status) IN ('promoted', 'repeated') THEN VALUES(status)
         ELSE status
       END,
       updated_at = NOW()`,
    [schoolId]
  ).catch(() => {});

  if (currentYear) {
    await promisePool.query(
      `INSERT INTO student_year_enrollments
         (school_id, student_id, academic_year, class_name, status, is_current)
       SELECT s.school_id, s.id, ?, NULLIF(TRIM(s.class_name), ''), 'active', 1
       FROM students s
       WHERE s.school_id = ?
         AND NOT EXISTS (
           SELECT 1 FROM student_year_enrollments e
           WHERE e.school_id = s.school_id
             AND e.student_id = s.id
             AND ${SQL_YEAR_PARAM('e.academic_year')}
         )`,
      [currentYear, schoolId, currentYear]
    );
  }
}

async function upsertYearEnrollment(connOrPool, {
  schoolId,
  studentId,
  academicYear,
  className,
  status = 'active',
  isCurrent = false,
  promotedToClass = null,
  promotedToYear = null,
  userId = null,
}) {
  const pool = connOrPool || promisePool;
  const year = trimStr(academicYear);
  if (!schoolId || !studentId || !year) return;

  await ensureStudentYearEnrollmentsTable();

  await pool.query(
    `INSERT INTO student_year_enrollments (
       school_id, student_id, academic_year, class_name, status, is_current,
       promoted_to_class, promoted_to_year, recorded_by_user_id
     ) VALUES (?,?,?,?,?,?,?,?,?)
     ON DUPLICATE KEY UPDATE
       class_name = COALESCE(NULLIF(TRIM(VALUES(class_name)), ''), class_name),
       status = VALUES(status),
       is_current = VALUES(is_current),
       promoted_to_class = VALUES(promoted_to_class),
       promoted_to_year = VALUES(promoted_to_year),
       recorded_by_user_id = COALESCE(VALUES(recorded_by_user_id), recorded_by_user_id),
       updated_at = NOW()`,
    [
      schoolId,
      studentId,
      year,
      trimStr(className) || null,
      trimStr(status) || 'active',
      isCurrent ? 1 : 0,
      promotedToClass ? trimStr(promotedToClass) : null,
      promotedToYear ? trimStr(promotedToYear) : null,
      userId || null,
    ]
  );
}

async function clearCurrentEnrollments(connOrPool, schoolId, studentId) {
  const pool = connOrPool || promisePool;
  await pool.query(
    `UPDATE student_year_enrollments SET is_current = 0, updated_at = NOW()
     WHERE school_id = ? AND student_id = ?`,
    [schoolId, studentId]
  );
}

async function recordStudentPromotion(conn, {
  schoolId,
  studentId,
  sourceYear,
  sourceClass,
  destYear,
  destClass,
  userId,
}) {
  const fromYear = trimStr(sourceYear);
  const toYear = trimStr(destYear) || inferNextAcademicYear(fromYear);
  const fromClass = trimStr(sourceClass);
  const toClass = trimStr(destClass);

  await upsertYearEnrollment(conn, {
    schoolId,
    studentId,
    academicYear: fromYear,
    className: fromClass,
    status: 'promoted',
    isCurrent: false,
    promotedToClass: toClass,
    promotedToYear: toYear,
    userId,
  });

  await clearCurrentEnrollments(conn, schoolId, studentId);

  await upsertYearEnrollment(conn, {
    schoolId,
    studentId,
    academicYear: toYear,
    className: toClass,
    status: 'active',
    isCurrent: true,
    userId,
  });
}

async function recordStudentRepeat(conn, {
  schoolId,
  studentId,
  academicYear,
  className,
  userId,
}) {
  await upsertYearEnrollment(conn, {
    schoolId,
    studentId,
    academicYear: trimStr(academicYear),
    className: trimStr(className),
    status: 'repeated',
    isCurrent: true,
    userId,
  });
}

async function syncEnrollmentFromStudent(connOrPool, {
  schoolId,
  studentId,
  academicYear,
  className,
  userId,
}) {
  const year = trimStr(academicYear);
  if (!year) return;
  await clearCurrentEnrollments(connOrPool, schoolId, studentId);
  await upsertYearEnrollment(connOrPool, {
    schoolId,
    studentId,
    academicYear: year,
    className,
    status: 'active',
    isCurrent: true,
    userId,
  });
}

/**
 * Year-scoped roster: prefer enrollment row; fall back to live students.academic_year
 * so schools without enrollment rows yet still see learners.
 */
function enrollmentYearFilter(yearFilter, enrollAlias = 'ey', studentAlias = 's') {
  if (!trimStr(yearFilter)) {
    return {
      join: '',
      where: '',
      params: [],
      classCol: `${studentAlias}.class_name`,
    };
  }
  return {
    join: `LEFT JOIN student_year_enrollments ${enrollAlias}
      ON ${enrollAlias}.school_id = ${studentAlias}.school_id
     AND ${enrollAlias}.student_id = ${studentAlias}.id
     AND ${SQL_YEAR_PARAM(`${enrollAlias}.academic_year`)}`,
    where: ` AND (
      ${enrollAlias}.id IS NOT NULL
      OR ${SQL_YEAR_PARAM(`${studentAlias}.academic_year`)}
    )`,
    params: [yearFilter, yearFilter],
    classCol: `COALESCE(NULLIF(TRIM(${enrollAlias}.class_name), ''), ${studentAlias}.class_name)`,
  };
}

/** @deprecated use enrollmentYearFilter */
function enrollmentJoinSql(yearFilter, alias = 'ey') {
  const f = enrollmentYearFilter(yearFilter, alias, 's');
  return { join: f.join, params: f.params.slice(0, 1), yearCol: alias };
}

function enrollmentClassSelect(alias = 'ey') {
  return `${alias}.class_name AS roster_class_name,
          ${alias}.academic_year AS roster_academic_year,
          ${alias}.status AS enrollment_status`;
}

module.exports = {
  ensureStudentYearEnrollmentsTable,
  backfillSchoolEnrollments,
  inferNextAcademicYear,
  upsertYearEnrollment,
  syncEnrollmentFromStudent,
  recordStudentPromotion,
  recordStudentRepeat,
  enrollmentJoinSql,
  enrollmentYearFilter,
  enrollmentClassSelect,
  resolveSchoolCurrentYear,
  SQL_YEAR_PARAM,
  SQL_YEAR_EQ,
};
