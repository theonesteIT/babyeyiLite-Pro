// =============================================================================
// scripts/seedTenant.js — Babyeyi Seed Tenant Provisioner
//
// Creates a full test school environment with:
//   - 1 School         (Babyeyi Seed Academy, code=999)
//   - 1 School Admin   (manager_999@seed.local)
//   - 1 DOS            (dos_999@seed.local)
//   - 2 Teachers       (teacher_999@seed.local, teacher2_999@seed.local)
//   - 1 Accountant     (accountant_999@seed.local)
//   - 1 HOD            (hod_999@seed.local)
//   - 20 Students      (10 in Senior 3A, 10 in Senior 5 Sci)
//   - 5 Timetable slots (linked to teacher)
//   - 1 DOS Standard Exam + grade data
//
// Run: node scripts/seedTenant.js
// =============================================================================

'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const mysql  = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const SCHOOL_CODE  = '999';
const SEED_SCHOOL  = 'Babyeyi Seed Academy';
const PASSWORD     = 'password123';
const HASH_ROUNDS  = 10;

// ── Connect directly (not the shared pool) so we can close at the end ─────────
async function getConn() {
  return mysql.createConnection({
    host:     process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT || '3306'),
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME     || 'babyeyi',
    charset:  'utf8mb4',
  });
}

function uid(prefix) {
  return `${prefix}-${Date.now().toString().slice(-6)}${Math.floor(Math.random()*1000).toString().padStart(3,'0')}`;
}

// ── Bootstrap academic tables (mirrors ensureTeacherTables in teacherPortal.js) ─
async function ensureAcademicTables(conn) {
  console.log('🔧  Ensuring academic tables exist...');
  await conn.query(`
    CREATE TABLE IF NOT EXISTS academic_timetables (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      class_name VARCHAR(120) NOT NULL,
      subject_name VARCHAR(120) NOT NULL,
      staff_id INT UNSIGNED NOT NULL,
      day_of_week VARCHAR(20) NOT NULL,
      start_time VARCHAR(20) NOT NULL,
      end_time VARCHAR(20) NOT NULL,
      room VARCHAR(64) NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_tt_school_staff (school_id, staff_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await conn.query(`
    CREATE TABLE IF NOT EXISTS academic_attendance_logs (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      timetable_id INT UNSIGNED NOT NULL,
      record_date DATE NOT NULL,
      session_status VARCHAR(32) DEFAULT 'Completed',
      recorded_by_user_id INT UNSIGNED NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_att_log_date (school_id, timetable_id, record_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await conn.query(`
    CREATE TABLE IF NOT EXISTS academic_attendance_records (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      log_id INT UNSIGNED NOT NULL,
      student_id INT UNSIGNED NOT NULL,
      status VARCHAR(32) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_att_rec (log_id, student_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await conn.query(`
    CREATE TABLE IF NOT EXISTS academic_assessments (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      class_name VARCHAR(120) NOT NULL,
      subject_name VARCHAR(120) NOT NULL,
      assessment_name VARCHAR(120) NOT NULL,
      max_score DECIMAL(8,2) NOT NULL DEFAULT 100,
      assessment_type VARCHAR(32) DEFAULT 'TEACHER_CUSTOM',
      created_by_user_id INT UNSIGNED NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_assess_school (school_id, class_name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await conn.query(`
    CREATE TABLE IF NOT EXISTS academic_marks (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      assessment_id INT UNSIGNED NOT NULL,
      student_id INT UNSIGNED NOT NULL,
      score_obtained DECIMAL(8,2) NOT NULL,
      recorded_by_user_id INT UNSIGNED NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_student_assessment (assessment_id, student_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  console.log('  ✅ Academic tables ready\n');
}

// ── Role lookup ──────────────────────────────────────────────────────────────
async function getRoleId(conn, code) {
  const [[row]] = await conn.query(
    'SELECT id FROM roles WHERE UPPER(role_code) = ? LIMIT 1', [code.toUpperCase()]
  );
  if (!row) throw new Error(`Role not found: ${code}. Make sure roles table is seeded first.`);
  return row.id;
}

// ── Create user helper ───────────────────────────────────────────────────────
async function createUser(conn, { email, username, firstName, lastName, roleCode, schoolId }) {
  const roleId = await getRoleId(conn, roleCode);
  const hash   = await bcrypt.hash(PASSWORD, HASH_ROUNDS);
  const userUid = uid(roleCode.substring(0, 2).toUpperCase());

  // Check for duplicate email
  const [[dup]] = await conn.query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
  if (dup) {
    console.log(`  ⚠️  User ${email} already exists (id=${dup.id}), skipping.`);
    return dup.id;
  }

  const [r] = await conn.query(
    `INSERT INTO users
       (user_uid, username, email, password_hash, first_name, last_name,
        role_id, school_id, is_active, is_verified, force_password_change,
        created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,1,1,0,NOW(),NOW())`,
    [userUid, username, email, hash, firstName, lastName, roleId, schoolId]
  );
  console.log(`  ✅ Created user [${roleCode}] ${email} (id=${r.insertId})`);
  return r.insertId;
}

// ── Create staff row (for DOS, Teacher, HOD, Accountant etc.) ────────────────
async function createStaff(conn, userId, schoolId, staffIdLabel) {
  const [[dup]] = await conn.query(
    'SELECT id FROM staff WHERE user_id = ? AND school_id = ? LIMIT 1', [userId, schoolId]
  );
  if (dup) return;
  await conn.query(
    'INSERT INTO staff (user_id, school_id, staff_id, username, created_at) VALUES (?,?,?,?,NOW())',
    [userId, schoolId, staffIdLabel, `staff_${userId}`]
  );
}

// ── Student seed data ────────────────────────────────────────────────────────
const FIRST_NAMES = ['Amina','Chloe','Daniel','Diane','Emmanuel','Fatima','Grace','Ivan','Jean','Kevin','Liliane','Manon','Noel','Olivia','Patrick','Queen','Richard','Sandra','Thomas','Uwimana'];
const LAST_NAMES  = ['Mugisha','Uwase','Nkurunziza','Habimana','Iradukunda','Kamana','Ntirenganya','Uwineza','Bizimana','Gakwaya','Hirwa','Ingabire','Juru','Kayitesi','Muhoza','Neza','Onyango','Rukundo','Sibomana','Tuyishime'];

async function seedStudents(conn, schoolId, schoolCode) {
  const classes = ['Senior 3A', 'Senior 5 Sci'];
  let studentNum = 1;

  for (const className of classes) {
    for (let i = 0; i < 10; i++) {
      const first = FIRST_NAMES[(studentNum - 1) % FIRST_NAMES.length];
      const last  = LAST_NAMES[(studentNum - 1) % LAST_NAMES.length];
      const gender = studentNum % 2 === 0 ? 'Male' : 'Female';
      // Generate a 12-digit student UID matching Urubuto format
      const studentUid = `2025${String(schoolCode).padStart(3, '0')}${String(studentNum).padStart(5, '0')}`;
      const fatherPhone = `07${Math.floor(Math.random() * 5 + 2)}${Math.floor(1000000 + Math.random() * 8999999)}`;
      const fatherEmail = `parent_${studentNum}_${schoolCode}@seed.local`;

      // Check if student already exists
      const [[dup]] = await conn.query(
        'SELECT id FROM students WHERE student_uid = ? LIMIT 1', [studentUid]
      );
      if (dup) {
        console.log(`  ⚠️  Student ${studentUid} exists, skipping.`);
        studentNum++;
        continue;
      }

      await conn.query(
        `INSERT INTO students
           (student_uid, first_name, last_name, gender, class_name, school_id,
            father_full_name, father_phone, father_email,
            nationality, province, district, sector,
            birth_year, academic_year,
            created_at, updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW(),NOW())`,
        [
          studentUid, first, last, gender, className, schoolId,
          `Parent of ${first}`, fatherPhone, fatherEmail,
          'Rwandan', 'Kigali City', 'Kicukiro', 'Niboye',
          2006 + (studentNum % 5), '2025-2026'
        ]
      );
      console.log(`  ✅ Student #${studentNum}: ${first} ${last} → ${className}`);
      studentNum++;
    }
  }
}

// ── Seed timetable ───────────────────────────────────────────────────────────
async function seedTimetable(conn, schoolId, teacherUserId) {
  const slots = [
    { class_name: 'Senior 3A',     subject_name: 'Mathematics',    day_of_week: 'Monday',    start_time: '08:00', end_time: '09:30', room: 'Room 101' },
    { class_name: 'Senior 5 Sci',  subject_name: 'Physics',         day_of_week: 'Monday',    start_time: '10:00', end_time: '11:30', room: 'Lab 1'   },
    { class_name: 'Senior 3A',     subject_name: 'Mathematics',    day_of_week: 'Wednesday', start_time: '08:00', end_time: '09:30', room: 'Room 101' },
    { class_name: 'Senior 5 Sci',  subject_name: 'Chemistry',       day_of_week: 'Thursday',  start_time: '10:00', end_time: '11:30', room: 'Lab 2'   },
    { class_name: 'Senior 3A',     subject_name: 'Mathematics',    day_of_week: 'Friday',    start_time: '08:00', end_time: '09:30', room: 'Room 101' },
  ];

  for (const s of slots) {
    // Check if it already exists
    const [[dup]] = await conn.query(
      'SELECT id FROM academic_timetables WHERE school_id = ? AND class_name = ? AND subject_name = ? AND day_of_week = ? LIMIT 1',
      [schoolId, s.class_name, s.subject_name, s.day_of_week]
    );
    if (dup) { console.log(`  ⚠️  Timetable slot exists for ${s.subject_name}/${s.day_of_week}, skipping.`); continue; }

    const [r] = await conn.query(
      'INSERT INTO academic_timetables (school_id, class_name, subject_name, staff_id, day_of_week, start_time, end_time, room) VALUES (?,?,?,?,?,?,?,?)',
      [schoolId, s.class_name, s.subject_name, teacherUserId, s.day_of_week, s.start_time, s.end_time, s.room]
    );
    console.log(`  ✅ Timetable: ${s.subject_name} → ${s.class_name} ${s.day_of_week} (id=${r.insertId})`);
  }
}

// ── Seed an assessment and sample marks ──────────────────────────────────────
async function seedAcademicData(conn, schoolId, dosUserId) {
  // Create a DOS_STANDARD assessment
  const [[dupAssess]] = await conn.query(
    'SELECT id FROM academic_assessments WHERE school_id = ? AND assessment_name = ? LIMIT 1',
    [schoolId, 'Term 1 Final Exam']
  );

  let assessmentId;
  if (dupAssess) {
    assessmentId = dupAssess.id;
    console.log(`  ⚠️  Assessment "Term 1 Final Exam" exists (id=${assessmentId}), skipping creation.`);
  } else {
    const [r] = await conn.query(
      'INSERT INTO academic_assessments (school_id, class_name, subject_name, assessment_name, max_score, assessment_type, created_by_user_id) VALUES (?,?,?,?,?,?,?)',
      [schoolId, 'Senior 3A', 'Mathematics', 'Term 1 Final Exam', 100, 'DOS_STANDARD', dosUserId]
    );
    assessmentId = r.insertId;
    console.log(`  ✅ Assessment created: Term 1 Final Exam (id=${assessmentId})`);
  }

  // Get students in Senior 3A and add marks
  const [students] = await conn.query(
    'SELECT id FROM students WHERE school_id = ? AND class_name = ? LIMIT 10', [schoolId, 'Senior 3A']
  );

  for (const s of students) {
    const score = Math.floor(55 + Math.random() * 40); // 55–95
    await conn.query(
      `INSERT INTO academic_marks (school_id, assessment_id, student_id, score_obtained, recorded_by_user_id)
       VALUES (?,?,?,?,?)
       ON DUPLICATE KEY UPDATE score_obtained = VALUES(score_obtained)`,
      [schoolId, assessmentId, s.id, score, dosUserId]
    );
  }
  console.log(`  ✅ Seeded marks for ${students.length} students in Senior 3A`);
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🌱  Babyeyi Seed Tenant Starting...\n');
  const conn = await getConn();

  try {
    // ── 0. Ensure academic tables exist ──────────────────────────────────
    // Must run BEFORE beginTransaction — DDL (CREATE TABLE) causes implicit
    // commit in MySQL, so we run it outside the transaction boundary.
    await ensureAcademicTables(conn);

    await conn.beginTransaction();

    // ── 1. Check/create school ────────────────────────────────────────────
    let schoolId;
    const [[existingSchool]] = await conn.query(
      'SELECT id FROM schools WHERE school_code = ? AND deleted_at IS NULL LIMIT 1', [SCHOOL_CODE]
    );

    if (existingSchool) {
      schoolId = existingSchool.id;
      console.log(`📚  School "${SEED_SCHOOL}" already exists (id=${schoolId}), reusing.\n`);
    } else {
      const [r] = await conn.query(
        `INSERT INTO schools
           (school_name, school_code, education_levels, school_category, ownership_type,
            year_established, province, district, sector, cell, village, full_address,
            phone, email, head_teacher_name, head_teacher_phone,
            status, created_at, updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'active',NOW(),NOW())`,
        [
          SEED_SCHOOL, SCHOOL_CODE, JSON.stringify(['o_level', 'a_level']),
          'Day & Boarding', 'Private', 2010,
          'Kigali City', 'Kicukiro', 'Niboye', 'Niboye', 'Niboye',
          'Niboye, Kicukiro, Kigali City',
          '0788999000', `info_${SCHOOL_CODE}@seed.local`,
          'Dr. Seed Headmaster', '0788999001',
        ]
      );
      schoolId = r.insertId;
      console.log(`📚  School "${SEED_SCHOOL}" created (id=${schoolId}, code=${SCHOOL_CODE})\n`);
    }

    // ── 2. Users ──────────────────────────────────────────────────────────
    console.log('👤  Provisioning users...');

    const managerId = await createUser(conn, {
      email: `manager_${SCHOOL_CODE}@seed.local`,
      username: `manager_${SCHOOL_CODE}`,
      firstName: 'School', lastName: 'Manager',
      roleCode: 'SCHOOL_ADMIN', schoolId
    });

    const dosId = await createUser(conn, {
      email: `dos_${SCHOOL_CODE}@seed.local`,
      username: `dos_${SCHOOL_CODE}`,
      firstName: 'Director', lastName: 'Studies',
      roleCode: 'DOS', schoolId
    });
    await createStaff(conn, dosId, schoolId, `DOS-${SCHOOL_CODE}`);

    const teacherId = await createUser(conn, {
      email: `teacher_${SCHOOL_CODE}@seed.local`,
      username: `teacher_${SCHOOL_CODE}`,
      firstName: 'Alice', lastName: 'Uwase',
      roleCode: 'TEACHER', schoolId
    });
    await createStaff(conn, teacherId, schoolId, `TCH-${SCHOOL_CODE}-01`);

    const teacher2Id = await createUser(conn, {
      email: `teacher2_${SCHOOL_CODE}@seed.local`,
      username: `teacher2_${SCHOOL_CODE}`,
      firstName: 'Bob', lastName: 'Mugisha',
      roleCode: 'TEACHER', schoolId
    });
    await createStaff(conn, teacher2Id, schoolId, `TCH-${SCHOOL_CODE}-02`);

    const hodId = await createUser(conn, {
      email: `hod_${SCHOOL_CODE}@seed.local`,
      username: `hod_${SCHOOL_CODE}`,
      firstName: 'Head', lastName: 'Department',
      roleCode: 'HOD', schoolId
    });
    await createStaff(conn, hodId, schoolId, `HOD-${SCHOOL_CODE}`);

    const accountantId = await createUser(conn, {
      email: `accountant_${SCHOOL_CODE}@seed.local`,
      username: `accountant_${SCHOOL_CODE}`,
      firstName: 'Finance', lastName: 'Officer',
      roleCode: 'ACCOUNTANT', schoolId
    });
    await createStaff(conn, accountantId, schoolId, `ACC-${SCHOOL_CODE}`);

    // ── 3. Students ───────────────────────────────────────────────────────
    console.log('\n🎓  Seeding students...');
    await seedStudents(conn, schoolId, SCHOOL_CODE);

    // ── 4. Timetable ──────────────────────────────────────────────────────
    console.log('\n📅  Seeding timetable...');
    await seedTimetable(conn, schoolId, teacherId);

    // ── 5. Academic data ──────────────────────────────────────────────────
    console.log('\n📝  Seeding academic assessments and marks...');
    await seedAcademicData(conn, schoolId, dosId);

    await conn.commit();

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('✅  SEED COMPLETE — Babyeyi Seed Academy (code: ' + SCHOOL_CODE + ')');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('\n  LOGIN CREDENTIALS (password for all: password123)\n');
    console.log(`  Role       Username / Email`);
    console.log(`  ─────────────────────────────────────────────────────`);
    console.log(`  Manager    manager_${SCHOOL_CODE} / manager_${SCHOOL_CODE}@seed.local`);
    console.log(`  DOS        dos_${SCHOOL_CODE}     / dos_${SCHOOL_CODE}@seed.local`);
    console.log(`  Teacher 1  teacher_${SCHOOL_CODE} / teacher_${SCHOOL_CODE}@seed.local`);
    console.log(`  Teacher 2  teacher2_${SCHOOL_CODE}/ teacher2_${SCHOOL_CODE}@seed.local`);
    console.log(`  HOD        hod_${SCHOOL_CODE}     / hod_${SCHOOL_CODE}@seed.local`);
    console.log(`  Accountant accountant_${SCHOOL_CODE}/ accountant_${SCHOOL_CODE}@seed.local`);
    console.log(`  Parents    Login via father_phone on Parent Portal`);
    console.log('\n════════════════════════════════════════════════════════════\n');

  } catch (err) {
    await conn.rollback();
    console.error('\n❌  Seed FAILED — rolled back:', err.message);
    console.error(err);
    process.exitCode = 1;
  } finally {
    await conn.end();
  }
}

main();
