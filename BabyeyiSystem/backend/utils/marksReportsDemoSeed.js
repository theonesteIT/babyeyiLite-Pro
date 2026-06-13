'use strict';

/**
 * Demo seed: teacher assignments, term-scoped marks (Term 1–3), and optional report generation.
 */
const { promisePool } = require('../config/database');
const { normalizeGradebookLabel } = require('./gradebookLabels');
const {
  ensureTeacherAssignmentsTable,
  createTeacherAssignment,
  fetchSchoolAcademicContext,
} = require('./teacherAssignmentsSchema');
const {
  ensureSchoolMarksAcademicTables,
  seedDefaultAssessmentTypesIfEmpty,
} = require('./schoolMarksAcademicSchema');
const { runTimetableDemoSeed, CLASSES, SUBJECTS, EXTRA_SUBJECT } = require('./timetableDemoSeed');

const SEED_TAG = 'marks-reports-demo';
const DEMO_PREFIX = '[demo]';
const STUDENTS_PER_CLASS = 12;
const TERMS = ['Term 1', 'Term 2', 'Term 3'];

const CORE_SUBJECTS = [...SUBJECTS.map((s) => s.name), EXTRA_SUBJECT.name];

/** One assessment row per lesson type — matches school_assessment_types slugs. */
const ASSESSMENT_COLUMNS = [
  { slug: 'homework', label: 'Homework', max: 10 },
  { slug: 'quiz', label: 'Quiz', max: 10 },
  { slug: 'cat', label: 'CAT', max: 20 },
  { slug: 'project', label: 'Project', max: 10 },
  { slug: 'practical', label: 'Practical', max: 10 },
  { slug: 'mid_term', label: 'Mid-Term Exam', max: 15 },
  { slug: 'end_term', label: 'End-Term Exam', max: 25 },
];

const FIRST_NAMES = {
  M: ['Kevin', 'Eric', 'Patrick', 'Emmanuel', 'Fabrice', 'Olivier', 'Jean Paul', 'Samuel', 'Didier', 'Moise', 'Innocent', 'Cedric'],
  F: ['Grace', 'Claire', 'Alice', 'Chantal', 'Diane', 'Sandrine', 'Yvette', 'Ange', 'Joselyne', 'Mariam', 'Divine', 'Liliane'],
};
const LAST_NAMES = ['Mukamana', 'Uwase', 'Niyonzima', 'Habimana', 'Keza', 'Mugisha', 'Nshimiyimana', 'Umutoni', 'Bizimana', 'Nyirahabimana', 'Gasana', 'Iradukunda'];

function hashScore(...parts) {
  let h = 0;
  for (const p of parts) {
    const s = String(p);
    for (let i = 0; i < s.length; i += 1) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function scoreForStudent(studentId, subjectIdx, termIdx, slug, maxScore) {
  const h = hashScore(studentId, subjectIdx, termIdx, slug);
  let pct = 0.52 + (h % 38) / 100 + termIdx * 0.025;
  if (slug === 'homework') pct += 0.06;
  if (slug === 'cat') pct += 0.02;
  if (slug === 'end_term') pct -= 0.04;
  pct = Math.min(0.97, Math.max(0.35, pct));
  return Math.round(pct * maxScore * 100) / 100;
}

async function ensureAssessmentTermColumns() {
  for (const [col, def] of [
    ['term', 'VARCHAR(32) NULL'],
    ['academic_year', 'VARCHAR(32) NULL'],
  ]) {
    try {
      await promisePool.query(`ALTER TABLE academic_assessments ADD COLUMN ${col} ${def}`);
    } catch (e) {
      if (e.code !== 'ER_DUP_FIELDNAME') throw e;
    }
  }
}

async function ensureStudentsTableMinimal() {
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS students (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      student_uid VARCHAR(50) NOT NULL,
      school_id INT UNSIGNED NOT NULL,
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      gender ENUM('Male','Female') NULL,
      class_name VARCHAR(120) NULL,
      academic_year VARCHAR(32) NULL,
      province VARCHAR(100) NULL,
      district VARCHAR(100) NULL,
      sector VARCHAR(100) NULL,
      cell VARCHAR(100) NULL,
      village VARCHAR(100) NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_student_uid_school (student_uid, school_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await promisePool.query('ALTER TABLE students ADD COLUMN class_name VARCHAR(120) NULL').catch(() => {});
  await promisePool.query('ALTER TABLE students ADD COLUMN academic_year VARCHAR(32) NULL').catch(() => {});
}

async function clearDemoMarksData(schoolId) {
  const [assessRows] = await promisePool.query(
    `SELECT id FROM academic_assessments
     WHERE school_id = ? AND assessment_name LIKE ?`,
    [schoolId, `${DEMO_PREFIX}%`],
  );
  const ids = assessRows.map((r) => r.id);
  if (ids.length) {
    await promisePool.query('DELETE FROM academic_marks WHERE school_id = ? AND assessment_id IN (?)', [schoolId, ids]);
    await promisePool.query('DELETE FROM academic_assessments WHERE id IN (?)', [ids]);
  }
}

/** Remove every mark + assessment row for a school (teacher-recorded and demo). */
async function clearAllSchoolMarksData(schoolId) {
  const [marksRes] = await promisePool.query(
    'DELETE FROM academic_marks WHERE school_id = ?',
    [schoolId],
  );
  const [assessRes] = await promisePool.query(
    'DELETE FROM academic_assessments WHERE school_id = ?',
    [schoolId],
  );
  return {
    marks_deleted: marksRes.affectedRows || 0,
    assessments_deleted: assessRes.affectedRows || 0,
  };
}

/** Remove generated report snapshots and batches so lists regenerate cleanly. */
async function clearAllSchoolReportSnapshots(schoolId) {
  const [snapRes] = await promisePool.query(
    'DELETE FROM dos_student_report_snapshots WHERE school_id = ?',
    [schoolId],
  );
  const [batchRes] = await promisePool.query(
    'DELETE FROM dos_report_batches WHERE school_id = ?',
    [schoolId],
  );
  return {
    snapshots_deleted: snapRes.affectedRows || 0,
    batches_deleted: batchRes.affectedRows || 0,
  };
}

async function seedDemoStudents(schoolId, classes, academicYear) {
  await ensureStudentsTableMinimal();
  let inserted = 0;

  for (let classIdx = 0; classIdx < classes.length; classIdx += 1) {
    const className = classes[classIdx];
    const [[countRow]] = await promisePool.query(
      `SELECT COUNT(*) AS c FROM students WHERE school_id = ? AND TRIM(class_name) = ?`,
      [schoolId, className],
    );
    if (Number(countRow?.c || 0) >= 5) continue;

    for (let i = 0; i < STUDENTS_PER_CLASS; i += 1) {
      const gender = i % 2 === 0 ? 'Female' : 'Male';
      const first = FIRST_NAMES[gender === 'Male' ? 'M' : 'F'][i % 12];
      const last = LAST_NAMES[(classIdx + i) % LAST_NAMES.length];
      const studentUid = `P5${String.fromCharCode(65 + classIdx)}${String(i + 1).padStart(3, '0')}`;

      const [[exists]] = await promisePool.query(
        'SELECT id FROM students WHERE school_id = ? AND student_uid = ? LIMIT 1',
        [schoolId, studentUid],
      );
      if (exists?.id) continue;

      await promisePool.query(
        `INSERT INTO students
           (student_uid, school_id, first_name, last_name, gender, class_name, academic_year,
            province, district, sector, cell, village)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          studentUid, schoolId, first, last, gender, className, academicYear,
          'Kigali City', 'Gasabo', 'Remera', 'Rukiri', 'Amahoro',
        ],
      );
      inserted += 1;
    }
  }
  return inserted;
}

async function linkClassSubjects(schoolId, classes) {
  await ensureSchoolMarksAcademicTables();
  let linked = 0;
  let subjectNames = [];
  try {
    const { COURSES } = require('./wisdomP5TimetableSeed');
    subjectNames = COURSES.map((c) => c.name);
  } catch {
    subjectNames = CORE_SUBJECTS;
  }
  for (const className of classes) {
    for (const subjectName of subjectNames) {
      const [[sub]] = await promisePool.query(
        'SELECT id FROM school_subjects WHERE school_id = ? AND name = ? LIMIT 1',
        [schoolId, subjectName],
      );
      if (!sub?.id) continue;
      await promisePool.query(
        `INSERT IGNORE INTO school_class_subjects (school_id, class_name, subject_id) VALUES (?,?,?)`,
        [schoolId, className, sub.id],
      );
      linked += 1;
    }
  }
  return linked;
}

async function copyTimetableAssignmentsToTeacherAssignments(schoolId, academicYear, term, assignedByUserId) {
  await ensureTeacherAssignmentsTable();
  const [rows] = await promisePool.query(
    `SELECT class_name, subject_name, teacher_user_id, periods_per_week, room
     FROM timetable_assignments WHERE school_id = ?
       AND LOWER(TRIM(subject_name)) NOT IN ('class teacher', 'class_teacher')`,
    [schoolId],
  );
  let created = 0;
  for (const row of rows || []) {
    try {
      await createTeacherAssignment(schoolId, {
        class_name: row.class_name,
        subject_name: row.subject_name,
        teacher_user_id: row.teacher_user_id,
        academic_year: academicYear,
        term,
        periods_per_week: row.periods_per_week,
        room: row.room,
      }, assignedByUserId);
      created += 1;
    } catch {
      /* duplicate scope — already exists */
    }
  }
  return created;
}

async function seedMarksFromTeacherAssignments(schoolId, { academicYear, term }) {
  await ensureAssessmentTermColumns();
  await seedDefaultAssessmentTypesIfEmpty(schoolId);

  const [assignments] = await promisePool.query(
    `SELECT id, teacher_user_id, class_name, subject_name
     FROM teacher_assignments
     WHERE school_id = ? AND academic_year = ? AND term = ? AND status = 'active'
     ORDER BY class_name, subject_name`,
    [schoolId, academicYear, term],
  );

  let assessmentCount = 0;
  let markCount = 0;
  let assignmentRows = 0;

  for (const a of assignments) {
    const cn = normalizeGradebookLabel(a.class_name);
    const sn = normalizeGradebookLabel(a.subject_name);
    if (!cn || !sn) continue;
    assignmentRows += 1;

    const [students] = await promisePool.query(
      `SELECT id FROM students WHERE school_id = ? AND TRIM(class_name) = ? ORDER BY id ASC`,
      [schoolId, cn],
    );
    if (!students.length) continue;

    const subjectIdx = sn.split('').reduce((s, c) => s + c.charCodeAt(0), 0);

    for (const col of ASSESSMENT_COLUMNS) {
      const assessmentName = `${DEMO_PREFIX} ${term} ${sn} ${col.label}`;
      const [[existing]] = await promisePool.query(
        `SELECT id FROM academic_assessments
         WHERE school_id = ? AND TRIM(class_name) = ? AND TRIM(subject_name) = ?
           AND assessment_name = ? LIMIT 1`,
        [schoolId, cn, sn, assessmentName],
      );
      let assessmentId = existing?.id;
      if (!assessmentId) {
        const [ins] = await promisePool.query(
          `INSERT INTO academic_assessments
             (school_id, class_name, subject_name, assessment_name, max_score, assessment_type,
              column_slug, status, created_by_user_id, teacher_assignment_id, term, academic_year)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
          [
            schoolId, cn, sn, assessmentName, col.max, 'TEACHER_CUSTOM',
            col.slug, 'published', a.teacher_user_id, a.id, term, academicYear,
          ],
        );
        assessmentId = ins.insertId;
        assessmentCount += 1;
      }

      for (const student of students) {
        const score = scoreForStudent(student.id, subjectIdx, TERMS.indexOf(term), col.slug, col.max);
        await promisePool.query(
          `INSERT INTO academic_marks (school_id, assessment_id, student_id, score_obtained, recorded_by_user_id)
           VALUES (?,?,?,?,?)
           ON DUPLICATE KEY UPDATE score_obtained = VALUES(score_obtained)`,
          [schoolId, assessmentId, student.id, score, a.teacher_user_id],
        );
        markCount += 1;
      }
    }
  }

  return { assessmentCount, markCount, assignment_rows: assignmentRows };
}

async function seedMarksForScope(schoolId, userId, {
  academicYear, term, classes,
}) {
  await ensureAssessmentTermColumns();
  await seedDefaultAssessmentTypesIfEmpty(schoolId);

  let assessmentCount = 0;
  let markCount = 0;

  for (const className of classes) {
    const cn = normalizeGradebookLabel(className);
    const [students] = await promisePool.query(
      `SELECT id FROM students WHERE school_id = ? AND TRIM(class_name) = ? ORDER BY id ASC`,
      [schoolId, cn],
    );
    if (!students.length) continue;

    for (let subjectIdx = 0; subjectIdx < CORE_SUBJECTS.length; subjectIdx += 1) {
      const subjectName = CORE_SUBJECTS[subjectIdx];
      const [[assignment]] = await promisePool.query(
        `SELECT id, teacher_user_id FROM teacher_assignments
         WHERE school_id = ? AND TRIM(class_name) = ? AND TRIM(subject_name) = ?
           AND academic_year = ? AND term = ? AND status = 'active' LIMIT 1`,
        [schoolId, cn, subjectName, academicYear, term],
      );
      const teacherUserId = assignment?.teacher_user_id || userId;
      const assignmentId = assignment?.id || null;

      for (const col of ASSESSMENT_COLUMNS) {
        const assessmentName = `${DEMO_PREFIX} ${term} ${subjectName} ${col.label}`;
        const [[existing]] = await promisePool.query(
          `SELECT id FROM academic_assessments
           WHERE school_id = ? AND TRIM(class_name) = ? AND TRIM(subject_name) = ?
             AND assessment_name = ? LIMIT 1`,
          [schoolId, cn, subjectName, assessmentName],
        );
        let assessmentId = existing?.id;
        if (!assessmentId) {
          const [ins] = await promisePool.query(
            `INSERT INTO academic_assessments
               (school_id, class_name, subject_name, assessment_name, max_score, assessment_type,
                column_slug, status, created_by_user_id, teacher_assignment_id, term, academic_year)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
            [
              schoolId, cn, subjectName, assessmentName, col.max, 'TEACHER_CUSTOM',
              col.slug, 'published', teacherUserId, assignmentId, term, academicYear,
            ],
          );
          assessmentId = ins.insertId;
          assessmentCount += 1;
        }

        for (const student of students) {
          const score = scoreForStudent(student.id, subjectIdx, TERMS.indexOf(term), col.slug, col.max);
          await promisePool.query(
            `INSERT INTO academic_marks (school_id, assessment_id, student_id, score_obtained, recorded_by_user_id)
             VALUES (?,?,?,?,?)
             ON DUPLICATE KEY UPDATE score_obtained = VALUES(score_obtained)`,
            [schoolId, assessmentId, student.id, score, teacherUserId],
          );
          markCount += 1;
        }
      }
    }
  }

  return { assessmentCount, markCount };
}

async function generateAllDemoReports(schoolId, userId, { academicYear, terms, classes }) {
  const {
    generateClassReportsBatch,
    ensureReportTables,
  } = require('../BabyeyiRoutes/dosStudentReports');

  await ensureReportTables();
  const reportTypes = ['mid_term', 'final'];
  const batches = [];

  for (const term of terms) {
    for (const className of classes) {
      for (const reportType of reportTypes) {
        try {
          const result = await generateClassReportsBatch(schoolId, userId, {
            academicYear,
            term,
            reportType,
            className,
            includeExtraActivities: false,
          });
          batches.push({ term, className, reportType, ...result });
        } catch (err) {
          batches.push({ term, className, reportType, error: err.message });
        }
      }
    }
  }
  return batches;
}

async function runMarksReportsDemoSeed(schoolId, userId = null, options = {}) {
  const {
    clear = true,
    seedTimetable = true,
    generateReports = true,
    classes: classesOpt,
  } = options;

  if (!schoolId) throw new Error('schoolId is required');

  const classes = Array.isArray(classesOpt) && classesOpt.length ? classesOpt : CLASSES;
  const ctx = await fetchSchoolAcademicContext(schoolId);
  const academicYear = ctx.academicYear;
  const terms = ctx.terms?.length ? ctx.terms.slice(0, 3) : TERMS;

  if (clear) await clearDemoMarksData(schoolId);

  let timetableResult = null;
  if (seedTimetable) {
    timetableResult = await runTimetableDemoSeed(schoolId, { clear: false });
  }

  const studentsInserted = await seedDemoStudents(schoolId, classes, academicYear);
  const classSubjectsLinked = await linkClassSubjects(schoolId, classes);

  let assignmentsCreated = 0;
  for (const term of terms) {
    assignmentsCreated += await copyTimetableAssignmentsToTeacherAssignments(
      schoolId, academicYear, term, userId,
    );
  }

  let totalAssessments = 0;
  let totalMarks = 0;
  for (const term of terms) {
    const { assessmentCount, markCount } = await seedMarksForScope(schoolId, userId || 1, {
      academicYear, term, classes,
    });
    totalAssessments += assessmentCount;
    totalMarks += markCount;
  }

  let reportBatches = [];
  if (generateReports && userId) {
    reportBatches = await generateAllDemoReports(schoolId, userId, { academicYear, terms, classes });
  }

  const reportsGenerated = reportBatches.reduce((s, b) => s + (b.generated || 0), 0);

  const summary = [
    `Demo marks seed (${SEED_TAG}) for ${academicYear}.`,
    `${studentsInserted} students added, ${assignmentsCreated} teacher assignments (×${terms.length} terms).`,
    `${totalAssessments} assessments, ${totalMarks} marks across ${terms.join(', ')}.`,
    generateReports ? `${reportsGenerated} mid-term & final reports generated.` : 'Reports not generated (no userId).',
  ].join(' ');

  return {
    tag: SEED_TAG,
    school_id: schoolId,
    academic_year: academicYear,
    terms,
    classes,
    students_inserted: studentsInserted,
    class_subjects_linked: classSubjectsLinked,
    teacher_assignments_created: assignmentsCreated,
    assessments_created: totalAssessments,
    marks_created: totalMarks,
    reports_generated: reportsGenerated,
    report_batches: reportBatches,
    timetable: timetableResult,
    summary,
  };
}

async function discoverSeedClasses(schoolId, academicYear) {
  const [rows] = await promisePool.query(
    `SELECT DISTINCT class_name FROM teacher_assignments
     WHERE school_id = ? AND academic_year = ? AND status = 'active'
       AND class_name IS NOT NULL AND TRIM(class_name) <> ''
     ORDER BY class_name ASC`,
    [schoolId, academicYear],
  );
  const fromAssignments = (rows || [])
    .map((r) => normalizeGradebookLabel(r.class_name))
    .filter(Boolean);
  if (fromAssignments.length) return fromAssignments;

  try {
    const { CLASSES } = require('./wisdomP5TimetableSeed');
    return CLASSES;
  } catch {
    const { CLASSES } = require('./timetableDemoSeed');
    return CLASSES;
  }
}

/** Seed marks from active teacher_assignments for one or more terms (Wisdom P5 / any school) */
async function runTermMarksSeed(schoolId, userId = null, options = {}) {
  const {
    clearDemoMarks = true,
    clearAllMarks = false,
    clearReports = false,
    generateReports = true,
    term: termOpt = null,
    terms: termsOpt = null,
    academicYear: yearOpt = null,
    classes: classesOpt = null,
  } = options;

  if (!schoolId) throw new Error('schoolId is required');

  await ensureTeacherAssignmentsTable();
  const ctx = await fetchSchoolAcademicContext(schoolId);
  const academicYear = yearOpt || ctx.academicYear;
  const terms = termsOpt?.length
    ? termsOpt
    : (termOpt ? [termOpt] : (ctx.terms?.length ? ctx.terms.slice(0, 3) : TERMS));

  const classes = classesOpt?.length ? classesOpt : await discoverSeedClasses(schoolId, academicYear);

  let cleared = null;
  let clearedReports = null;
  if (clearAllMarks) {
    cleared = await clearAllSchoolMarksData(schoolId);
  } else if (clearDemoMarks) {
    await clearDemoMarksData(schoolId);
  }
  if (clearAllMarks || clearReports) {
    clearedReports = await clearAllSchoolReportSnapshots(schoolId);
  }

  await linkClassSubjects(schoolId, classes);

  let totalAssessments = 0;
  let totalMarks = 0;
  let assignmentRows = 0;

  for (const term of terms) {
    const r = await seedMarksFromTeacherAssignments(schoolId, { academicYear, term });
    totalAssessments += r.assessmentCount;
    totalMarks += r.markCount;
    assignmentRows += r.assignment_rows;
  }

  let reportBatches = [];
  let reportsGenerated = 0;
  if (generateReports && userId) {
    reportBatches = await generateAllDemoReports(schoolId, userId, {
      academicYear, terms, classes,
    });
    reportsGenerated = reportBatches.reduce((s, b) => s + (b.generated || 0), 0);
  }

  const summary = [
    `Term marks seeded for ${academicYear} (${terms.join(', ')}).`,
    `${assignmentRows} assignment(s), ${totalAssessments} assessments, ${totalMarks} marks.`,
    generateReports ? `${reportsGenerated} Mid-Term & Final reports generated.` : '',
  ].filter(Boolean).join(' ');

  return {
    tag: SEED_TAG,
    school_id: schoolId,
    academic_year: academicYear,
    terms,
    classes,
    cleared,
    cleared_reports: clearedReports,
    assignment_rows: assignmentRows,
    assessments_created: totalAssessments,
    marks_created: totalMarks,
    reports_generated: reportsGenerated,
    report_batches: reportBatches,
    summary,
  };
}

module.exports = {
  SEED_TAG,
  DEMO_PREFIX,
  runMarksReportsDemoSeed,
  runTermMarksSeed,
  seedMarksFromTeacherAssignments,
  clearDemoMarksData,
  clearAllSchoolMarksData,
  clearAllSchoolReportSnapshots,
};
