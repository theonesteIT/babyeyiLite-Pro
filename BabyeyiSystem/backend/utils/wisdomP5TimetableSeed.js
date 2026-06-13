'use strict';

/**
 * ST THEO / Wisdom-style P5A–P5H real staffing & course periods (41/week per class).
 */
const bcrypt = require('bcryptjs');
const { promisePool } = require('../config/database');
const { ensureCoreAuthSchema } = require('./coreAuthSchema');
const {
  ensureTeacherAssignmentsTable,
  createTeacherAssignment,
  fetchSchoolAcademicContext,
  syncTeacherAssignmentsToTimetable,
} = require('./teacherAssignmentsSchema');

const SEED_TAG = 'wisdom-p5';
const DEFAULT_PASSWORD = 'Wisdom2026';
const CLASSES = ['P5A', 'P5B', 'P5C', 'P5D', 'P5E', 'P5F', 'P5G', 'P5H'];
const SEED_EMAIL_DOMAIN = '@wisdom-p5-seed.local';

/** Catalogue defaults — periods/week per class (before per-assignment overrides) */
const COURSES = [
  { name: 'MATH', code: 'MATH', category: 'Core', periods: 9, priority: 'critical', double: true },
  { name: 'ENG', code: 'ENG', category: 'Languages', periods: 5, priority: 'high', double: true },
  { name: 'EST', code: 'EST', category: 'Core', periods: 7, priority: 'high', double: true },
  { name: 'SST', code: 'SST', category: 'Core', periods: 4, priority: 'medium', double: true },
  { name: 'RE', code: 'RE', category: 'Core', periods: 1, priority: 'low', double: false },
  { name: 'KINY', code: 'KINY', category: 'Languages', periods: 6, priority: 'high', double: true },
  { name: 'FRE', code: 'FRE', category: 'Languages', periods: 3, priority: 'medium', double: true },
  { name: 'DELF', code: 'DELF', category: 'Languages', periods: 2, priority: 'medium', double: false },
  { name: 'PE', code: 'PE', category: 'Sports', periods: 1, priority: 'critical', double: false, rules: { time_preference: 'morning', latest_end: '13:00' } },
  { name: 'CA', code: 'CA', category: 'Arts', periods: 1, priority: 'low', double: false },
  { name: 'COMPUTER', code: 'COMPUTER', category: 'ICT', periods: 2, priority: 'medium', double: false, requires_lab: true },
];

const TEACHERS = [
  { key: 'mayanja', first: 'Leone', last: 'Mayanja', email: `leone.mayanja${SEED_EMAIL_DOMAIN}`, username: 'tch_mayanja', staff_id: 'P5001', max_pd: 8, subjects: ['COMPUTER'] },
  { key: 'kitasimbwa', first: 'Rashid', last: 'Kitasimbwa', email: `rashid.kitasimbwa${SEED_EMAIL_DOMAIN}`, username: 'tch_kitas', staff_id: 'P5002', max_pd: 7, subjects: ['MATH'] },
  { key: 'kamuzinzi', first: 'Samuel', last: 'Kamuzinzi', email: `samuel.kamuzinzi${SEED_EMAIL_DOMAIN}`, username: 'tch_kamuz', staff_id: 'P5003', max_pd: 7, subjects: ['MATH'] },
  { key: 'muhire', first: 'Maximilien', last: 'Muhire', email: `maximilien.muhire${SEED_EMAIL_DOMAIN}`, username: 'tch_muhire', staff_id: 'P5004', max_pd: 9, subjects: ['MATH', 'PE'] },
  { key: 'ndayishimiye', first: 'Prime', last: 'Ndayishimiye', email: `prime.ndayishimiye${SEED_EMAIL_DOMAIN}`, username: 'tch_ndayi', staff_id: 'P5005', max_pd: 7, subjects: ['FRE', 'DELF'] },
  { key: 'uwikunda', first: 'Pasteur', last: 'Uwikunda', email: `pasteur.uwikunda${SEED_EMAIL_DOMAIN}`, username: 'tch_uwiki', staff_id: 'P5006', max_pd: 6, subjects: ['FRE', 'DELF'] },
  { key: 'turyatemba', first: 'Rogers', last: 'Turyatemba', email: `rogers.turyatemba${SEED_EMAIL_DOMAIN}`, username: 'tch_turya', staff_id: 'P5007', max_pd: 7, subjects: ['ENG'] },
  { key: 'gasengayire', first: 'Joan', last: 'Gasengayire', email: `joan.gasengayire${SEED_EMAIL_DOMAIN}`, username: 'tch_gasen', staff_id: 'P5008', max_pd: 6, subjects: ['ENG'] },
  { key: 'gumiriza', first: 'JMV', last: 'Gumiriza', email: `jmv.gumiriza${SEED_EMAIL_DOMAIN}`, username: 'tch_gumir', staff_id: 'P5009', max_pd: 8, subjects: ['KINY'] },
  { key: 'ukuriyimfura', first: 'Jean Bosco', last: 'UkuriYimfura', email: `jeanbosco.ukuriyimfura${SEED_EMAIL_DOMAIN}`, username: 'tch_ukuri', staff_id: 'P5010', max_pd: 8, subjects: ['KINY'] },
  { key: 'bakunda', first: 'Oliva', last: 'Bakunda', email: `oliva.bakunda${SEED_EMAIL_DOMAIN}`, username: 'tch_bakun', staff_id: 'P5011', max_pd: 6, subjects: ['SST', 'CA'] },
  { key: 'mugabe', first: 'Didas', last: 'Mugabe', email: `didas.mugabe${SEED_EMAIL_DOMAIN}`, username: 'tch_mugab', staff_id: 'P5012', max_pd: 6, subjects: ['SST', 'CA'] },
  { key: 'kagame', first: 'Mike', last: 'Kagame', email: `mike.kagame${SEED_EMAIL_DOMAIN}`, username: 'tch_kagam', staff_id: 'P5013', max_pd: 8, subjects: ['RE'] },
  { key: 'elemu', first: 'Bob Mike', last: 'Elemu', email: `bob.elemu${SEED_EMAIL_DOMAIN}`, username: 'tch_elemu', staff_id: 'P5014', max_pd: 7, subjects: ['EST'] },
  { key: 'agaba', first: 'Albert', last: 'Agaba', email: `albert.agaba${SEED_EMAIL_DOMAIN}`, username: 'tch_agaba', staff_id: 'P5015', max_pd: 7, subjects: ['EST'] },
  { key: 'ayo', first: 'Innocent', last: 'Ayo', email: `innocent.ayo${SEED_EMAIL_DOMAIN}`, username: 'tch_ayo', staff_id: 'P5016', max_pd: 7, subjects: ['EST'] },
];

/** Per-class teacher + periods (split EST on P5D: Elemu 3 + Agaba 4) */
const ASSIGNMENTS = [
  // MATH 9/week
  ...['P5A', 'P5B', 'P5C'].map((c) => ({ class: c, subject: 'MATH', teacher: 'kitasimbwa', periods: 9 })),
  ...['P5D', 'P5E', 'P5F'].map((c) => ({ class: c, subject: 'MATH', teacher: 'kamuzinzi', periods: 9 })),
  ...['P5G', 'P5H'].map((c) => ({ class: c, subject: 'MATH', teacher: 'muhire', periods: 9 })),

  // ENG 5/week
  ...['P5A', 'P5B', 'P5C', 'P5D', 'P5E'].map((c) => ({ class: c, subject: 'ENG', teacher: 'turyatemba', periods: 5 })),
  ...['P5F', 'P5G', 'P5H'].map((c) => ({ class: c, subject: 'ENG', teacher: 'gasengayire', periods: 5 })),

  // EST 7/week total per class
  { class: 'P5A', subject: 'EST', teacher: 'elemu', periods: 7 },
  { class: 'P5B', subject: 'EST', teacher: 'elemu', periods: 7 },
  { class: 'P5C', subject: 'EST', teacher: 'elemu', periods: 7 },
  { class: 'P5D', subject: 'EST', teacher: 'elemu', periods: 3 },
  { class: 'P5D', subject: 'EST', teacher: 'agaba', periods: 4 },
  ...['P5E', 'P5F', 'P5G'].map((c) => ({ class: c, subject: 'EST', teacher: 'agaba', periods: 7 })),
  { class: 'P5H', subject: 'EST', teacher: 'ayo', periods: 7 },

  // SST 4/week
  ...['P5A', 'P5B', 'P5C', 'P5D'].map((c) => ({ class: c, subject: 'SST', teacher: 'bakunda', periods: 4 })),
  ...['P5E', 'P5F', 'P5G', 'P5H'].map((c) => ({ class: c, subject: 'SST', teacher: 'mugabe', periods: 4 })),

  // RE 1/week
  ...CLASSES.map((c) => ({ class: c, subject: 'RE', teacher: 'kagame', periods: 1 })),

  // KINY 6/week
  ...['P5A', 'P5B', 'P5C', 'P5D'].map((c) => ({ class: c, subject: 'KINY', teacher: 'gumiriza', periods: 6 })),
  ...['P5E', 'P5F', 'P5G', 'P5H'].map((c) => ({ class: c, subject: 'KINY', teacher: 'ukuriyimfura', periods: 6 })),

  // FRE 3/week
  ...['P5A', 'P5B', 'P5C', 'P5D', 'P5E'].map((c) => ({ class: c, subject: 'FRE', teacher: 'ndayishimiye', periods: 3 })),
  ...['P5F', 'P5G', 'P5H'].map((c) => ({ class: c, subject: 'FRE', teacher: 'uwikunda', periods: 3 })),

  // DELF 2/week — Prime P5A-P5E; Uwikunda P5G-P5H only
  ...['P5A', 'P5B', 'P5C', 'P5D', 'P5E'].map((c) => ({ class: c, subject: 'DELF', teacher: 'ndayishimiye', periods: 2 })),
  ...['P5G', 'P5H'].map((c) => ({ class: c, subject: 'DELF', teacher: 'uwikunda', periods: 2 })),

  // PE 1/week — Muhire all P5
  ...CLASSES.map((c) => ({ class: c, subject: 'PE', teacher: 'muhire', periods: 1 })),

  // CA 1/week
  ...['P5A', 'P5B', 'P5C', 'P5D'].map((c) => ({ class: c, subject: 'CA', teacher: 'bakunda', periods: 1 })),
  ...['P5E', 'P5F', 'P5G', 'P5H'].map((c) => ({ class: c, subject: 'CA', teacher: 'mugabe', periods: 1 })),

  // COMPUTER 2/week — Mayanja P5A-P5G
  ...['P5A', 'P5B', 'P5C', 'P5D', 'P5E', 'P5F', 'P5G'].map((c) => ({ class: c, subject: 'COMPUTER', teacher: 'mayanja', periods: 2 })),
];

async function getTeacherRoleId(conn) {
  const [[row]] = await conn.query(
    "SELECT id FROM roles WHERE UPPER(role_code) = 'TEACHER' AND is_active = 1 LIMIT 1",
  );
  if (row?.id) return Number(row.id);
  const [ins] = await conn.query(
    `INSERT INTO roles (role_name, role_code, description, permissions, is_active, is_system_role)
     VALUES ('Teacher', 'TEACHER', 'Teaching staff', '[]', 1, 1)`,
  );
  return ins.insertId;
}

async function upsertTeacher(conn, schoolId, roleId, teacher, passwordHash) {
  const [[existing]] = await conn.query(
    'SELECT id FROM users WHERE LOWER(email) = ? AND deleted_at IS NULL LIMIT 1',
    [teacher.email.toLowerCase()],
  );
  if (existing?.id) return Number(existing.id);

  const userUid = `P5-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 900 + 100)}`;
  const [userRes] = await conn.query(
    `INSERT INTO users (user_uid, username, email, phone, password_hash, first_name, last_name, role_id, school_id, is_active, is_verified, force_password_change, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,1,1,0,NOW(),NOW())`,
    [userUid, teacher.username, teacher.email, '0788000000', passwordHash, teacher.first, teacher.last, roleId, schoolId],
  );
  const userId = userRes.insertId;
  await conn.query(
    `INSERT INTO staff (user_id, school_id, staff_id, username, created_at, full_name, employment_status, job_title, date_of_employment, account_enabled)
     VALUES (?,?,?,?,NOW(),?,?,?,CURDATE(),1)`,
    [userId, schoolId, teacher.staff_id, teacher.username, `${teacher.first} ${teacher.last}`, 'Active', 'Teacher'],
  );
  return userId;
}

/** Wipe timetables, courses, assignments, and all teaching-staff users for the school */
async function fullClearSchoolTimetableData(schoolId) {
  await promisePool.query('DELETE FROM academic_timetables WHERE school_id = ?', [schoolId]);
  await promisePool.query('DELETE FROM timetable_assignments WHERE school_id = ?', [schoolId]).catch(() => {});
  await promisePool.query('DELETE FROM teacher_assignments WHERE school_id = ?', [schoolId]).catch(() => {});
  await promisePool.query('DELETE FROM timetable_teacher_profiles WHERE school_id = ?', [schoolId]).catch(() => {});
  await promisePool.query('DELETE FROM timetable_course_config WHERE school_id = ?', [schoolId]).catch(() => {});
  await promisePool.query('DELETE FROM school_class_subjects WHERE school_id = ?', [schoolId]).catch(() => {});
  await promisePool.query('DELETE FROM school_subjects WHERE school_id = ?', [schoolId]).catch(() => {});

  const [teacherUsers] = await promisePool.query(
    `SELECT u.id FROM users u
     INNER JOIN roles r ON r.id = u.role_id
     WHERE u.school_id = ? AND UPPER(r.role_code) = 'TEACHER' AND u.deleted_at IS NULL`,
    [schoolId],
  );
  const ids = teacherUsers.map((u) => u.id);
  if (ids.length) {
    await promisePool.query(`DELETE FROM staff WHERE user_id IN (${ids.map(() => '?').join(',')})`, ids).catch(() => {});
    await promisePool.query(
      `UPDATE users SET deleted_at = NOW(), is_active = 0 WHERE id IN (${ids.map(() => '?').join(',')})`,
      ids,
    ).catch(async () => {
      await promisePool.query(`DELETE FROM staff WHERE user_id IN (${ids.map(() => '?').join(',')})`, ids).catch(() => {});
      await promisePool.query(`DELETE FROM users WHERE id IN (${ids.map(() => '?').join(',')})`, ids).catch(() => {});
    });
  }
}

async function seedSchedule(conn, schoolId) {
  await conn.query(
    `INSERT INTO timetable_school_schedule (school_id, day_start_time, day_end_time, period_duration_mins, active_days_json, breaks_json)
     VALUES (?, '07:20', '16:20', 40, ?, ?)
     ON DUPLICATE KEY UPDATE day_start_time=VALUES(day_start_time), day_end_time=VALUES(day_end_time),
       period_duration_mins=VALUES(period_duration_mins), active_days_json=VALUES(active_days_json), breaks_json=VALUES(breaks_json)`,
    [
      schoolId,
      JSON.stringify(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']),
      JSON.stringify([
        { name: 'Short Break', start: '10:00', end: '10:20' },
        { name: 'Lunch', start: '12:40', end: '13:20' },
      ]),
    ],
  );
}

async function syncPermanentAssignments(schoolId, teacherUserIds, assignedByUserId) {
  await ensureTeacherAssignmentsTable();
  const ctx = await fetchSchoolAcademicContext(schoolId);
  const terms = ctx.terms?.length ? ctx.terms : ['Term 1', 'Term 2', 'Term 3'];
  let synced = 0;

  for (const term of terms) {
    for (const a of ASSIGNMENTS) {
      const teacherId = teacherUserIds.get(a.teacher);
      if (!teacherId) continue;
      try {
        await createTeacherAssignment(schoolId, {
          class_name: a.class,
          subject_name: a.subject,
          teacher_user_id: teacherId,
          academic_year: ctx.academicYear,
          term,
          periods_per_week: a.periods,
        }, assignedByUserId);
        synced += 1;
      } catch {
        /* duplicate active scope */
      }
    }
  }
  await syncTeacherAssignmentsToTimetable(schoolId).catch(() => {});
  return synced;
}

async function runWisdomP5TimetableSeed(schoolId, { fullClear = true, syncTeacherAssignments = true } = {}) {
  if (!schoolId) throw new Error('schoolId is required');

  await ensureCoreAuthSchema();
  await promisePool.query(
    'ALTER TABLE timetable_course_config ADD COLUMN scheduling_rules_json JSON NULL',
  ).catch(() => {});

  if (fullClear) await fullClearSchoolTimetableData(schoolId);

  const conn = await promisePool.getConnection();
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 12);
  const teacherUserIds = new Map();

  try {
    await conn.beginTransaction();
    const roleId = await getTeacherRoleId(conn);

    for (const t of TEACHERS) {
      const uid = await upsertTeacher(conn, schoolId, roleId, t, passwordHash);
      teacherUserIds.set(t.key, uid);
    }

    for (const course of COURSES) {
      await conn.query(
        `INSERT INTO school_subjects (school_id, name, category, subject_code, is_active) VALUES (?,?,?,?,1)
         ON DUPLICATE KEY UPDATE category=VALUES(category), subject_code=VALUES(subject_code), is_active=1`,
        [schoolId, course.name, course.category, course.code],
      );

      const rulesJson = JSON.stringify(course.rules || { time_preference: 'any' });
      await conn.query(
        `INSERT INTO timetable_course_config (school_id, subject_name, default_duration_mins, requires_lab, is_double_period, priority_level, department, periods_per_week, scheduling_rules_json)
         VALUES (?,?,?,?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE periods_per_week=VALUES(periods_per_week), is_double_period=VALUES(is_double_period),
           priority_level=VALUES(priority_level), requires_lab=VALUES(requires_lab), scheduling_rules_json=VALUES(scheduling_rules_json)`,
        [schoolId, course.name, 40, course.requires_lab ? 1 : 0, course.double ? 1 : 0, course.priority, course.category, course.periods, rulesJson],
      );
    }

    for (const t of TEACHERS) {
      const uid = teacherUserIds.get(t.key);
      await conn.query(
        `INSERT INTO timetable_teacher_profiles (school_id, teacher_user_id, subjects_json, max_periods_per_day, available_days_json, preferred_slots_json, department)
         VALUES (?,?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE subjects_json=VALUES(subjects_json), max_periods_per_day=VALUES(max_periods_per_day)`,
        [schoolId, uid, JSON.stringify(t.subjects), t.max_pd || 7, JSON.stringify([]), JSON.stringify([]), 'Academic'],
      );
    }

    await conn.query('DELETE FROM timetable_assignments WHERE school_id = ?', [schoolId]);

    let assignmentCount = 0;
    for (const a of ASSIGNMENTS) {
      const teacherId = teacherUserIds.get(a.teacher);
      if (!teacherId) continue;
      await conn.query(
        `INSERT INTO timetable_assignments (school_id, class_name, subject_name, teacher_user_id, periods_per_week, room)
         VALUES (?,?,?,?,?,NULL)`,
        [schoolId, a.class, a.subject, teacherId, a.periods],
      );
      assignmentCount += 1;
    }

    await seedSchedule(conn, schoolId);
    await conn.commit();

    let permanentSynced = 0;
    if (syncTeacherAssignments) {
      const dosUser = [...teacherUserIds.values()][0] || null;
      permanentSynced = await syncPermanentAssignments(schoolId, teacherUserIds, dosUser);
    }

    const totalPerClass = COURSES.reduce((s, c) => s + c.periods, 0) - 2; // P5H has no COMPUTER in this seed

    return {
      tag: SEED_TAG,
      school_id: schoolId,
      classes: CLASSES,
      courses: COURSES.map((c) => c.name),
      periods_per_class: totalPerClass,
      teachers: TEACHERS.map((t) => ({
        staff_id: t.staff_id,
        name: `${t.first} ${t.last}`,
        email: t.email,
        user_id: teacherUserIds.get(t.key),
      })),
      teacher_count: TEACHERS.length,
      timetable_assignments: assignmentCount,
      teacher_assignments_synced: permanentSynced,
      default_password: DEFAULT_PASSWORD,
      full_clear: !!fullClear,
    };
  } catch (err) {
    await conn.rollback().catch(() => {});
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = {
  SEED_TAG,
  DEFAULT_PASSWORD,
  CLASSES,
  COURSES,
  TEACHERS,
  ASSIGNMENTS,
  runWisdomP5TimetableSeed,
  fullClearSchoolTimetableData,
};
