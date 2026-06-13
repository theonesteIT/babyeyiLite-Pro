'use strict';

const bcrypt = require('bcryptjs');
const { promisePool } = require('../config/database');
const { ensureCoreAuthSchema } = require('./coreAuthSchema');

const SEED_TAG = 'timetable-seed';
const DEFAULT_PASSWORD = 'Timetable123';

const CLASSES = ['P5A', 'P5B', 'P5C', 'P5D', 'P5E', 'P5F', 'P5G', 'P5H'];

const SUBJECTS = [
  { name: 'MATH', category: 'Core', code: 'MATH', periods: 5, priority: 'high' },
  { name: 'ENG', category: 'Languages', code: 'ENG', periods: 4, priority: 'high' },
  { name: 'EST', category: 'Core', code: 'EST', periods: 3, priority: 'medium' },
  { name: 'SST', category: 'Core', code: 'SST', periods: 3, priority: 'medium' },
  { name: 'RE', category: 'Core', code: 'RE', periods: 2, priority: 'low' },
  { name: 'KINY', category: 'Languages', code: 'KINY', periods: 3, priority: 'medium' },
  { name: 'FRE', category: 'Languages', code: 'FRE', periods: 3, priority: 'medium' },
  { name: 'DELF', category: 'Languages', code: 'DELF', periods: 2, priority: 'low' },
  { name: 'PE', category: 'Sports', code: 'PE', periods: 2, priority: 'medium', rules: { time_preference: 'morning', latest_end: '13:00' } },
  { name: 'CA', category: 'Arts', code: 'CA', periods: 2, priority: 'low' },
  { name: 'COMPUTER', category: 'ICT', code: 'COMPUTER', periods: 2, priority: 'medium', requires_lab: true },
];

const EXTRA_SUBJECT = { name: 'SET', category: 'Core', code: 'SET', periods: 3, priority: 'high' };

const TEACHERS = [
  { key: 't1', first: 'Jean', last: 'Mukama', email: 'jean.mukama@timetable-seed.local', username: 'tch_jmukama', staff_id: 'TCH001', subjects: ['SET', 'EST'] },
  { key: 't2', first: 'Marie', last: 'Uwase', email: 'marie.uwase@timetable-seed.local', username: 'tch_muwase', staff_id: 'TCH002', subjects: ['MATH'], classes: ['P5A', 'P5B', 'P5C'] },
  { key: 't3', first: 'Paul', last: 'Niyonzima', email: 'paul.niyonzima@timetable-seed.local', username: 'tch_pniyo', staff_id: 'TCH003', subjects: ['MATH'], classes: ['P5D', 'P5E'] },
  { key: 't4', first: 'Grace', last: 'Keza', email: 'grace.keza@timetable-seed.local', username: 'tch_gkeza', staff_id: 'TCH004', subjects: ['MATH'], classes: ['P5F', 'P5G', 'P5H'] },
  { key: 't5', first: 'David', last: 'Habimana', email: 'david.habimana@timetable-seed.local', username: 'tch_dhabi', staff_id: 'TCH005', subjects: ['PE'] },
  { key: 't6', first: 'Claire', last: 'Mugisha', email: 'claire.mugisha@timetable-seed.local', username: 'tch_cmugi', staff_id: 'TCH006', subjects: ['FRE', 'DELF'] },
  { key: 't7', first: 'Eric', last: 'Nshimiyimana', email: 'eric.nshimiyimana@timetable-seed.local', username: 'tch_enshi', staff_id: 'TCH007', subjects: ['ENG'] },
  { key: 't8', first: 'Alice', last: 'Umutoni', email: 'alice.umutoni@timetable-seed.local', username: 'tch_aumut', staff_id: 'TCH008', subjects: ['KINY', 'SST', 'RE', 'CA', 'COMPUTER'] },
];

async function ensureSeedColumns() {
  await promisePool.query(
    'ALTER TABLE timetable_course_config ADD COLUMN scheduling_rules_json JSON NULL',
  ).catch(() => {});
}

async function getTeacherRoleId(conn) {
  const [[row]] = await conn.query(
    "SELECT id FROM roles WHERE UPPER(role_code) = 'TEACHER' AND is_active = 1 LIMIT 1",
  );
  if (row?.id != null) return Number(row.id);

  const [[maxRow]] = await conn.query('SELECT COALESCE(MAX(id), 0) AS m FROM roles');
  const nextId = Number(maxRow?.m || 0) + 1;
  await conn.query(
    `INSERT INTO roles (id, role_name, role_code, description, permissions, is_active, is_system_role)
     VALUES (?, 'Teacher', 'TEACHER', 'Teaching staff', '[]', 1, 1)`,
    [nextId],
  );
  return nextId;
}

async function clearDemoSeedData(schoolId) {
  const emails = TEACHERS.map((t) => t.email);
  const [users] = await promisePool.query(
    `SELECT id FROM users WHERE school_id = ? AND email IN (${emails.map(() => '?').join(',')})`,
    [schoolId, ...emails],
  );
  const userIds = users.map((u) => u.id);
  if (userIds.length) {
    await promisePool.query('DELETE FROM timetable_assignments WHERE school_id = ?', [schoolId]);
    await promisePool.query('DELETE FROM timetable_teacher_profiles WHERE school_id = ?', [schoolId]);
    await promisePool.query('DELETE FROM timetable_course_config WHERE school_id = ?', [schoolId]);
    await promisePool.query(
      `DELETE FROM school_subjects WHERE school_id = ? AND subject_code IN (${[...SUBJECTS, EXTRA_SUBJECT].map(() => '?').join(',')})`,
      [schoolId, ...[...SUBJECTS, EXTRA_SUBJECT].map((s) => s.code)],
    );
    await promisePool.query(`DELETE FROM staff WHERE user_id IN (${userIds.map(() => '?').join(',')})`, userIds);
    await promisePool.query(`DELETE FROM users WHERE id IN (${userIds.map(() => '?').join(',')})`, userIds);
  } else {
    await promisePool.query('DELETE FROM timetable_assignments WHERE school_id = ?', [schoolId]);
    await promisePool.query('DELETE FROM timetable_teacher_profiles WHERE school_id = ?', [schoolId]);
    await promisePool.query('DELETE FROM timetable_course_config WHERE school_id = ?', [schoolId]);
  }
}

async function upsertTeacher(conn, schoolId, roleId, teacher, passwordHash) {
  const [[existing]] = await conn.query(
    'SELECT id FROM users WHERE LOWER(email) = ? AND deleted_at IS NULL LIMIT 1',
    [teacher.email.toLowerCase()],
  );
  if (existing?.id) return Number(existing.id);

  const userUid = `ST-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 900 + 100)}`;
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

function teacherForSubject(subjectName) {
  if (subjectName === 'SET') return 't1';
  if (subjectName === 'MATH') return null;
  if (subjectName === 'PE') return 't5';
  if (subjectName === 'FRE' || subjectName === 'DELF') return 't6';
  if (subjectName === 'ENG') return 't7';
  if (['KINY', 'SST', 'RE', 'CA', 'COMPUTER', 'EST'].includes(subjectName)) {
    if (subjectName === 'EST') return 't1';
    return 't8';
  }
  return 't8';
}

function mathTeacherForClass(className) {
  if (['P5A', 'P5B', 'P5C'].includes(className)) return 't2';
  if (['P5D', 'P5E'].includes(className)) return 't3';
  return 't4';
}

/**
 * Seed 8 demo teachers, 12 courses, course configs, teacher profiles, and P5 assignments.
 * @param {number} schoolId
 * @param {{ clear?: boolean }} options
 */
async function runTimetableDemoSeed(schoolId, { clear = false } = {}) {
  if (!schoolId) throw new Error('schoolId is required');

  await ensureCoreAuthSchema();
  await ensureSeedColumns();
  if (clear) await clearDemoSeedData(schoolId);

  const conn = await promisePool.getConnection();
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 12);
  const teacherUserIds = new Map();
  let assignmentCount = 0;

  try {
    await conn.beginTransaction();
    const roleId = await getTeacherRoleId(conn);

    for (const t of TEACHERS) {
      const uid = await upsertTeacher(conn, schoolId, roleId, t, passwordHash);
      teacherUserIds.set(t.key, uid);
    }

    const allSubjects = [...SUBJECTS, EXTRA_SUBJECT];
    for (const sub of allSubjects) {
      const [[existingSub]] = await conn.query(
        'SELECT id FROM school_subjects WHERE school_id = ? AND name = ? LIMIT 1',
        [schoolId, sub.name],
      );
      if (existingSub?.id) {
        await conn.query(
          'UPDATE school_subjects SET category = ?, subject_code = ?, is_active = 1 WHERE id = ?',
          [sub.category, sub.code, existingSub.id],
        );
      } else {
        await conn.query(
          'INSERT INTO school_subjects (school_id, name, category, subject_code, is_active) VALUES (?,?,?,?,1)',
          [schoolId, sub.name, sub.category, sub.code],
        );
      }

      const rulesJson = sub.rules ? JSON.stringify(sub.rules) : JSON.stringify({ time_preference: 'any' });
      await conn.query(
        `INSERT INTO timetable_course_config (school_id, subject_name, default_duration_mins, requires_lab, is_double_period, priority_level, department, periods_per_week, scheduling_rules_json)
         VALUES (?,?,?,?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE periods_per_week=VALUES(periods_per_week), priority_level=VALUES(priority_level),
           requires_lab=VALUES(requires_lab), scheduling_rules_json=VALUES(scheduling_rules_json)`,
        [schoolId, sub.name, 40, sub.requires_lab ? 1 : 0, 0, sub.priority, sub.category, sub.periods, rulesJson],
      );
    }

    for (const t of TEACHERS) {
      const uid = teacherUserIds.get(t.key);
      await conn.query(
        `INSERT INTO timetable_teacher_profiles (school_id, teacher_user_id, subjects_json, max_periods_per_day, available_days_json, preferred_slots_json, department)
         VALUES (?,?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE subjects_json=VALUES(subjects_json), max_periods_per_day=VALUES(max_periods_per_day)`,
        [schoolId, uid, JSON.stringify(t.subjects), 6, JSON.stringify([]), JSON.stringify([]), 'Academic'],
      );
    }

    await conn.query('DELETE FROM timetable_assignments WHERE school_id = ?', [schoolId]);

    for (const className of CLASSES) {
      for (const sub of allSubjects) {
        let teacherKey = teacherForSubject(sub.name);
        if (sub.name === 'MATH') teacherKey = mathTeacherForClass(className);
        const teacherId = teacherUserIds.get(teacherKey);
        if (!teacherId) continue;

        const cfg = allSubjects.find((s) => s.name === sub.name);
        await conn.query(
          `INSERT INTO timetable_assignments (school_id, class_name, subject_name, teacher_user_id, periods_per_week, room)
           VALUES (?,?,?,?,?,NULL)
           ON DUPLICATE KEY UPDATE periods_per_week=VALUES(periods_per_week)`,
          [schoolId, className, sub.name, teacherId, cfg?.periods || 3],
        );
        assignmentCount += 1;
      }
    }

    await conn.commit();

    return {
      tag: SEED_TAG,
      school_id: schoolId,
      classes: CLASSES,
      subjects: allSubjects.map((s) => s.name),
      teachers: TEACHERS.map((t) => ({
        staff_id: t.staff_id,
        name: `${t.first} ${t.last}`,
        email: t.email,
        user_id: teacherUserIds.get(t.key),
      })),
      teacher_count: TEACHERS.length,
      subject_count: allSubjects.length,
      assignment_count: assignmentCount,
      default_password: DEFAULT_PASSWORD,
      cleared: !!clear,
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
  SUBJECTS,
  EXTRA_SUBJECT,
  TEACHERS,
  runTimetableDemoSeed,
  clearDemoSeedData,
};
