'use strict';

/**
 * Permanent teacher assignments — source of truth for marks & timetable.
 * Marks link via academic_assessments.teacher_assignment_id (never deleted when assignment archived).
 */
const { promisePool } = require('../config/database');
const {
  normalizeGradebookLabel,
  resolveTimetableClassLabels,
  sqlNormLabelEquals,
} = require('./gradebookLabels');
const { loadSchoolAcademicCalendar } = require('./schoolAcademicCalendar');

let tableReady = false;

async function ensureTeacherAssignmentsTable() {
  if (tableReady) return;

  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS teacher_assignments (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      teacher_user_id INT UNSIGNED NOT NULL,
      class_name VARCHAR(120) NOT NULL,
      subject_name VARCHAR(200) NOT NULL,
      academic_year VARCHAR(32) NOT NULL,
      term VARCHAR(32) NOT NULL,
      status VARCHAR(16) NOT NULL DEFAULT 'active',
      periods_per_week INT UNSIGNED NOT NULL DEFAULT 3,
      room VARCHAR(64) NULL,
      superseded_by_id INT UNSIGNED NULL,
      archived_at DATETIME NULL,
      assigned_by_user_id INT UNSIGNED NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_ta_active_scope (
        school_id, teacher_user_id, class_name, subject_name, academic_year, term, status
      ),
      KEY idx_ta_teacher (school_id, teacher_user_id, academic_year, term, status),
      KEY idx_ta_class (school_id, class_name, subject_name),
      KEY idx_ta_superseded (superseded_by_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // Migrate legacy teacher_course_assignments → teacher_assignments (one-time)
  try {
    const [[legacyCount]] = await promisePool.query(
      'SELECT COUNT(*) AS c FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?',
      ['teacher_course_assignments'],
    );
    if (Number(legacyCount?.c) > 0) {
      const [[newCount]] = await promisePool.query('SELECT COUNT(*) AS c FROM teacher_assignments');
      if (Number(newCount?.c) === 0) {
        await promisePool.query(`
          INSERT IGNORE INTO teacher_assignments
            (school_id, teacher_user_id, class_name, subject_name, academic_year, term,
             status, assigned_by_user_id, created_at, updated_at)
          SELECT school_id, teacher_user_id, class_name, subject_name, academic_year, term,
                 IF(is_active = 1, 'active', 'archived'), assigned_by_user_id, created_at, updated_at
          FROM teacher_course_assignments
        `);
      }
    }
  } catch { /* ignore migration errors */ }

  try {
    await promisePool.query(
      'ALTER TABLE academic_assessments ADD COLUMN teacher_assignment_id INT UNSIGNED NULL',
    );
  } catch (e) {
    if (e.code !== 'ER_DUP_FIELDNAME') throw e;
  }
  try {
    await promisePool.query(
      'CREATE INDEX idx_aa_teacher_assignment ON academic_assessments (teacher_assignment_id)',
    );
  } catch { /* ignore */ }

  tableReady = true;
}

/** @deprecated alias */
const ensureTeacherCourseAssignmentsTable = ensureTeacherAssignmentsTable;

async function fetchSchoolAcademicContext(schoolId) {
  let academicYear = null;
  let terms = ['Term 1', 'Term 2', 'Term 3'];

  try {
    const [[reg]] = await promisePool.query(
      `SELECT academic_year, active_terms_json
       FROM school_academic_year_registry
       WHERE school_id = ? AND is_current = 1 LIMIT 1`,
      [schoolId],
    );
    if (reg?.academic_year) {
      academicYear = String(reg.academic_year).trim();
      if (reg.active_terms_json) {
        const parsed = typeof reg.active_terms_json === 'string'
          ? JSON.parse(reg.active_terms_json) : reg.active_terms_json;
        if (Array.isArray(parsed) && parsed.length) terms = parsed.map(String);
      }
    }
  } catch { /* ignore */ }

  if (!academicYear) {
    try {
      const [[legacy]] = await promisePool.query(
        `SELECT current_academic_year, active_terms_json
         FROM school_academic_settings WHERE school_id = ? LIMIT 1`,
        [schoolId],
      );
      if (legacy?.current_academic_year) {
        academicYear = String(legacy.current_academic_year).trim();
        if (legacy.active_terms_json) {
          const parsed = typeof legacy.active_terms_json === 'string'
            ? JSON.parse(legacy.active_terms_json) : legacy.active_terms_json;
          if (Array.isArray(parsed) && parsed.length) terms = parsed.map(String);
        }
      }
    } catch { /* ignore */ }
  }

  if (!academicYear) {
    const y = new Date().getFullYear();
    academicYear = `${y}-${y + 1}`;
  }

  let term = terms[0] || 'Term 1';
  try {
    const [[period]] = await promisePool.query(
      `SELECT term FROM school_teacher_period_settings
       WHERE school_id = ? AND academic_year = ? ORDER BY updated_at DESC LIMIT 1`,
      [schoolId, academicYear],
    );
    if (period?.term) term = String(period.term).trim();
  } catch { /* ignore */ }

  return { academicYear, term, terms };
}

function isClassTeacherSubject(subjectName) {
  const s = String(subjectName || '').trim().toLowerCase();
  return s === 'class teacher' || s === 'class_teacher';
}

async function countAssignmentMarks(assignmentId) {
  const [[row]] = await promisePool.query(
    `SELECT COUNT(DISTINCT am.id) AS marks_count,
            COUNT(DISTINCT aa.id) AS assessment_count
     FROM academic_assessments aa
     LEFT JOIN academic_marks am ON am.assessment_id = aa.id
     WHERE aa.teacher_assignment_id = ?`,
    [assignmentId],
  );
  return {
    marks_count: Number(row?.marks_count) || 0,
    assessment_count: Number(row?.assessment_count) || 0,
  };
}

async function getAssignmentById(schoolId, id) {
  await ensureTeacherAssignmentsTable();
  const [rows] = await promisePool.query(
    'SELECT * FROM teacher_assignments WHERE id = ? AND school_id = ? LIMIT 1',
    [id, schoolId],
  );
  return rows[0] || null;
}

async function createTeacherAssignment(schoolId, payload, assignedByUserId = null) {
  await ensureTeacherAssignmentsTable();
  const cn = normalizeGradebookLabel(payload.class_name);
  const sn = normalizeGradebookLabel(payload.subject_name);
  if (!cn || !sn || isClassTeacherSubject(sn) || !payload.teacher_user_id) {
    throw new Error('Invalid assignment data');
  }
  const ctx = await fetchSchoolAcademicContext(schoolId);
  const year = payload.academic_year || ctx.academicYear;
  const term = payload.term || ctx.term;

  const [r] = await promisePool.query(
    `INSERT INTO teacher_assignments
       (school_id, teacher_user_id, class_name, subject_name, academic_year, term,
        status, periods_per_week, room, assigned_by_user_id)
     VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)`,
    [
      schoolId,
      Number(payload.teacher_user_id),
      cn,
      sn,
      year,
      term,
      Number(payload.periods_per_week) || 3,
      payload.room ? String(payload.room).trim() : null,
      assignedByUserId,
    ],
  );
  return { id: r.insertId, class_name: cn, subject_name: sn, academic_year: year, term };
}

async function updateTeacherAssignmentSafe(schoolId, id, { periods_per_week, room }) {
  await ensureTeacherAssignmentsTable();
  await promisePool.query(
    `UPDATE teacher_assignments
     SET periods_per_week = COALESCE(?, periods_per_week),
         room = COALESCE(?, room),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND school_id = ? AND status = 'active'`,
    [
      periods_per_week != null ? Number(periods_per_week) : null,
      room != null ? String(room).trim() : null,
      id,
      schoolId,
    ],
  );
}

async function archiveTeacherAssignment(schoolId, id) {
  await ensureTeacherAssignmentsTable();
  const row = await getAssignmentById(schoolId, id);
  if (!row) return { archived: false, message: 'Not found' };
  await promisePool.query(
    `UPDATE teacher_assignments
     SET status = 'archived', archived_at = NOW(), updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND school_id = ?`,
    [id, schoolId],
  );
  const counts = await countAssignmentMarks(id);
  return {
    archived: true,
    marks_preserved: counts.marks_count,
    assessment_count: counts.assessment_count,
    message: counts.marks_count > 0
      ? `Assignment archived. ${counts.marks_count} mark(s) remain linked and safe.`
      : 'Assignment archived.',
  };
}

async function supersedeTeacherAssignment(schoolId, oldId, newPayload, assignedByUserId = null) {
  await ensureTeacherAssignmentsTable();
  const old = await getAssignmentById(schoolId, oldId);
  if (!old) throw new Error('Assignment not found');

  const created = await createTeacherAssignment(schoolId, {
    teacher_user_id: newPayload.teacher_user_id ?? old.teacher_user_id,
    class_name: newPayload.class_name ?? old.class_name,
    subject_name: newPayload.subject_name ?? old.subject_name,
    academic_year: newPayload.academic_year ?? old.academic_year,
    term: newPayload.term ?? old.term,
    periods_per_week: newPayload.periods_per_week ?? old.periods_per_week,
    room: newPayload.room ?? old.room,
  }, assignedByUserId);

  await promisePool.query(
    `UPDATE teacher_assignments
     SET status = 'archived', archived_at = NOW(), superseded_by_id = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND school_id = ?`,
    [created.id, oldId, schoolId],
  );

  const counts = await countAssignmentMarks(oldId);
  return {
    old_id: oldId,
    new_id: created.id,
    marks_preserved_on_old: counts.marks_count,
    message: 'New assignment created. Existing marks remain on the archived assignment.',
  };
}

async function removeOrArchiveAssignment(schoolId, id) {
  const counts = await countAssignmentMarks(id);
  if (counts.marks_count > 0 || counts.assessment_count > 0) {
    return archiveTeacherAssignment(schoolId, id);
  }
  await ensureTeacherAssignmentsTable();
  await promisePool.query(
    'DELETE FROM teacher_assignments WHERE id = ? AND school_id = ?',
    [id, schoolId],
  );
  return { archived: false, deleted: true, message: 'Assignment removed (no marks recorded).' };
}

async function fetchAssignmentHistory(schoolId, id) {
  await ensureTeacherAssignmentsTable();

  const enrich = async (row) => {
    const counts = await countAssignmentMarks(row.id);
    const [teacherRows] = await promisePool.query(
      `SELECT TRIM(CONCAT(COALESCE(first_name,''),' ',COALESCE(last_name,''))) AS name
       FROM users WHERE id = ? LIMIT 1`,
      [row.teacher_user_id],
    );
    return {
      ...row,
      teacher_name: teacherRows[0]?.name?.trim() || null,
      marks_count: counts.marks_count,
      assessment_count: counts.assessment_count,
    };
  };

  let rootId = id;
  const seenRoots = new Set();
  for (let i = 0; i < 20 && rootId && !seenRoots.has(rootId); i += 1) {
    seenRoots.add(rootId);
    const [pred] = await promisePool.query(
      'SELECT id FROM teacher_assignments WHERE superseded_by_id = ? AND school_id = ? LIMIT 1',
      [rootId, schoolId],
    );
    if (!pred.length) break;
    rootId = pred[0].id;
  }

  const chain = [];
  let currentId = rootId;
  const seen = new Set();
  for (let i = 0; i < 20 && currentId && !seen.has(currentId); i += 1) {
    seen.add(currentId);
    const row = await getAssignmentById(schoolId, currentId);
    if (!row) break;
    chain.push(await enrich(row));
    currentId = row.superseded_by_id || null;
  }
  return chain;
}

async function listTeacherAssignmentsForSchool(schoolId, {
  academicYear = null,
  term = null,
  status = null,
  includeStats = true,
} = {}) {
  await ensureTeacherAssignmentsTable();
  const ctx = await fetchSchoolAcademicContext(schoolId);
  const year = academicYear || ctx.academicYear;
  const termVal = term || ctx.term;

  let statusClause = '';
  const params = [schoolId, year, termVal];
  if (status) {
    statusClause = ' AND ta.status = ?';
    params.push(status);
  }

  const [rows] = await promisePool.query(
    `SELECT ta.*,
            TRIM(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))) AS teacher_name,
            u.email AS teacher_email
     FROM teacher_assignments ta
     INNER JOIN users u ON u.id = ta.teacher_user_id AND u.deleted_at IS NULL
     WHERE ta.school_id = ? AND ta.academic_year = ? AND ta.term = ?${statusClause}
     ORDER BY ta.status ASC, ta.class_name ASC, ta.subject_name ASC, teacher_name ASC`,
    params,
  );

  if (!includeStats) return { rows, academic_year: year, term: termVal, terms: ctx.terms };

  const enriched = [];
  for (const row of rows) {
    const counts = await countAssignmentMarks(row.id);
    enriched.push({ ...row, ...counts });
  }

  const stats = {
    total: enriched.length,
    active: enriched.filter((r) => r.status === 'active').length,
    archived: enriched.filter((r) => r.status === 'archived').length,
    with_marks: enriched.filter((r) => r.marks_count > 0).length,
    courses: new Set(enriched.map((r) => r.subject_name)).size,
    classes: new Set(enriched.map((r) => r.class_name)).size,
    teachers: new Set(enriched.map((r) => r.teacher_user_id)).size,
  };

  const calendar = await loadSchoolAcademicCalendar(schoolId);
  const yearTerms = calendar.termsByYear[year] || calendar.terms;

  return {
    rows: enriched,
    academic_year: year,
    term: termVal,
    terms: yearTerms,
    academic_years: calendar.academicYears,
    current_academic_year: calendar.currentAcademicYear,
    terms_by_year: calendar.termsByYear,
    stats,
  };
}

async function buildTeacherAssignmentsOverview(schoolId, {
  academicYear = null,
  term = null,
  status = 'active',
} = {}) {
  const data = await listTeacherAssignmentsForSchool(schoolId, {
    academicYear,
    term,
    status: status || 'active',
    includeStats: true,
  });

  const byTeacher = new Map();
  for (const row of data.rows || []) {
    const key = row.teacher_user_id;
    if (!byTeacher.has(key)) {
      byTeacher.set(key, {
        teacher_user_id: key,
        teacher_name: row.teacher_name,
        teacher_email: row.teacher_email,
        assignments: [],
        class_summaries: {},
        total_periods: 0,
        total_marks: 0,
        course_count: 0,
      });
    }
    const teacher = byTeacher.get(key);
    teacher.assignments.push(row);
    teacher.course_count += 1;
    teacher.total_periods += Number(row.periods_per_week) || 0;
    teacher.total_marks += Number(row.marks_count) || 0;

    const className = row.class_name;
    if (!teacher.class_summaries[className]) {
      teacher.class_summaries[className] = {
        class_name: className,
        courses: [],
        periods: 0,
      };
    }
    const classBucket = teacher.class_summaries[className];
    classBucket.courses.push({
      id: row.id,
      subject_name: row.subject_name,
      periods_per_week: Number(row.periods_per_week) || 0,
      room: row.room,
      marks_count: row.marks_count || 0,
      status: row.status,
    });
    classBucket.periods += Number(row.periods_per_week) || 0;
  }

  const teachers = [...byTeacher.values()]
    .map((t) => ({
      ...t,
      class_summaries: Object.values(t.class_summaries).sort((a, b) => a.class_name.localeCompare(b.class_name)),
      class_count: Object.keys(t.class_summaries).length,
    }))
    .sort((a, b) => String(a.teacher_name || '').localeCompare(String(b.teacher_name || '')));

  return {
    teachers,
    academic_year: data.academic_year,
    term: data.term,
    terms: data.terms,
    academic_years: data.academic_years,
    current_academic_year: data.current_academic_year,
    terms_by_year: data.terms_by_year,
    stats: data.stats,
  };
}

async function fetchTeachingAssignmentsForTeacher(schoolId, teacherUserId, {
  academicYear = null,
  term = null,
  activeOnly = true,
} = {}) {
  await ensureTeacherAssignmentsTable();
  const ctx = await fetchSchoolAcademicContext(schoolId);
  const year = academicYear || ctx.academicYear;
  const termVal = term || ctx.term;
  const statusClause = activeOnly ? " AND ta.status = 'active'" : '';

  const [rows] = await promisePool.query(
    `SELECT ta.id, ta.class_name, ta.subject_name, ta.academic_year, ta.term, ta.status,
            ta.periods_per_week, ta.room,
            TRIM(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))) AS teacher_name
     FROM teacher_assignments ta
     LEFT JOIN users u ON u.id = ta.teacher_user_id
     WHERE ta.school_id = ? AND ta.teacher_user_id = ?
       AND ta.academic_year = ? AND ta.term = ?${statusClause}
     ORDER BY ta.class_name ASC, ta.subject_name ASC`,
    [schoolId, teacherUserId, year, termVal],
  );

  const [stuCounts] = await promisePool.query(
    `SELECT class_name, COUNT(*) AS student_count
     FROM students WHERE school_id = ? AND class_name IS NOT NULL AND TRIM(class_name) <> ''
     GROUP BY class_name`,
    [schoolId],
  );
  const countByClass = {};
  for (const r of stuCounts || []) {
    const cn = normalizeGradebookLabel(r.class_name);
    if (cn) countByClass[cn.toLowerCase()] = Number(r.student_count) || 0;
  }

  return rows.map((r) => ({
    id: r.id,
    assignment_id: r.id,
    class_name: normalizeGradebookLabel(r.class_name),
    subject_name: normalizeGradebookLabel(r.subject_name),
    academic_year: r.academic_year,
    term: r.term,
    status: r.status,
    teacher_name: r.teacher_name?.trim() || null,
    student_count: countByClass[normalizeGradebookLabel(r.class_name).toLowerCase()] || 0,
    source: 'teacher_assignments',
  }));
}

async function teacherHasAssignment(schoolId, teacherUserId, class_name, subject_name, {
  academicYear = null,
  term = null,
  assignmentId = null,
} = {}) {
  await ensureTeacherAssignmentsTable();
  if (assignmentId) {
    const [rows] = await promisePool.query(
      `SELECT id FROM teacher_assignments
       WHERE id = ? AND school_id = ? AND teacher_user_id = ? AND status = 'active' LIMIT 1`,
      [assignmentId, schoolId, teacherUserId],
    );
    return rows.length > 0;
  }
  const ctx = await fetchSchoolAcademicContext(schoolId);
  const cn = normalizeGradebookLabel(class_name);
  const sn = normalizeGradebookLabel(subject_name);
  const [rows] = await promisePool.query(
    `SELECT id FROM teacher_assignments
     WHERE school_id = ? AND teacher_user_id = ? AND status = 'active'
       AND academic_year = ? AND term = ?
       AND (${sqlNormLabelEquals('class_name')})
       AND (${sqlNormLabelEquals('subject_name')})
     LIMIT 1`,
    [schoolId, teacherUserId, academicYear || ctx.academicYear, term || ctx.term, cn, sn],
  );
  return rows.length > 0;
}

/** Push active teacher_assignments → timetable_assignments for generator */
async function syncTeacherAssignmentsToTimetable(schoolId) {
  await ensureTeacherAssignmentsTable();
  const ctx = await fetchSchoolAcademicContext(schoolId);
  const [activeRows] = await promisePool.query(
    `SELECT * FROM teacher_assignments
     WHERE school_id = ? AND academic_year = ? AND term = ? AND status = 'active'`,
    [schoolId, ctx.academicYear, ctx.term],
  );

  await promisePool.query(
    `DELETE FROM timetable_assignments
     WHERE school_id = ?
       AND LOWER(TRIM(subject_name)) NOT IN ('class teacher', 'class_teacher')`,
    [schoolId],
  );

  let synced = 0;
  for (const row of activeRows) {
    await promisePool.query(
      `INSERT INTO timetable_assignments
         (school_id, class_name, subject_name, teacher_user_id, periods_per_week, room)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE periods_per_week = VALUES(periods_per_week), room = VALUES(room)`,
      [
        schoolId,
        row.class_name,
        row.subject_name,
        row.teacher_user_id,
        row.periods_per_week || 3,
        row.room || null,
      ],
    );
    synced += 1;
  }
  return { synced, academic_year: ctx.academicYear, term: ctx.term };
}

/** Import timetable_assignments → teacher_assignments (legacy one-time) */
async function syncTeachingAssignmentsFromTimetable(schoolId, assignedByUserId = null) {
  await ensureTeacherAssignmentsTable();
  const ctx = await fetchSchoolAcademicContext(schoolId);
  const [regResult, stuResult, assignRows] = await Promise.all([
    promisePool.query('SELECT group_name, stream_name, combination FROM school_classes WHERE school_id = ?', [schoolId]),
    promisePool.query(
      `SELECT DISTINCT class_name FROM students WHERE school_id = ? AND class_name IS NOT NULL AND TRIM(class_name) <> ''`,
      [schoolId],
    ),
    promisePool.query(
      `SELECT class_name, subject_name, teacher_user_id, periods_per_week, room
       FROM timetable_assignments WHERE school_id = ?
         AND LOWER(TRIM(subject_name)) NOT IN ('class teacher', 'class_teacher')`,
      [schoolId],
    ),
  ]);
  const regList = regResult[0] || [];
  const studentClassNames = (stuResult[0] || []).map((x) => x.class_name);
  let synced = 0;

  for (const row of assignRows[0] || []) {
    const subject_name = normalizeGradebookLabel(row.subject_name);
    if (!subject_name || isClassTeacherSubject(subject_name)) continue;
    const resolvedClasses = resolveTimetableClassLabels(row.class_name, studentClassNames, regList);
    for (const class_name of resolvedClasses) {
      try {
        await createTeacherAssignment(schoolId, {
          teacher_user_id: row.teacher_user_id,
          class_name,
          subject_name,
          academic_year: ctx.academicYear,
          term: ctx.term,
          periods_per_week: row.periods_per_week,
          room: row.room,
        }, assignedByUserId);
        synced += 1;
      } catch {
        /* duplicate active scope — skip */
      }
    }
  }
  return { synced, academic_year: ctx.academicYear, term: ctx.term };
}

async function resolveAssignmentIdForTeacher(schoolId, teacherUserId, class_name, subject_name, assignmentId) {
  if (assignmentId) {
    const ok = await teacherHasAssignment(schoolId, teacherUserId, null, null, { assignmentId });
    return ok ? Number(assignmentId) : null;
  }
  const ctx = await fetchSchoolAcademicContext(schoolId);
  const cn = normalizeGradebookLabel(class_name);
  const sn = normalizeGradebookLabel(subject_name);
  const [rows] = await promisePool.query(
    `SELECT id FROM teacher_assignments
     WHERE school_id = ? AND teacher_user_id = ? AND status = 'active'
       AND academic_year = ? AND term = ?
       AND (${sqlNormLabelEquals('class_name')})
       AND (${sqlNormLabelEquals('subject_name')})
     LIMIT 1`,
    [schoolId, teacherUserId, ctx.academicYear, ctx.term, cn, sn],
  );
  return rows[0]?.id || null;
}

module.exports = {
  ensureTeacherAssignmentsTable,
  ensureTeacherCourseAssignmentsTable,
  fetchSchoolAcademicContext,
  createTeacherAssignment,
  updateTeacherAssignmentSafe,
  archiveTeacherAssignment,
  supersedeTeacherAssignment,
  removeOrArchiveAssignment,
  fetchAssignmentHistory,
  listTeacherAssignmentsForSchool,
  buildTeacherAssignmentsOverview,
  fetchTeachingAssignmentsForTeacher,
  teacherHasAssignment,
  syncTeacherAssignmentsToTimetable,
  syncTeachingAssignmentsFromTimetable,
  countAssignmentMarks,
  getAssignmentById,
  resolveAssignmentIdForTeacher,
  isClassTeacherSubject,
};
