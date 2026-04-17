// ================================================================
// discipline.js — Head of Discipline (HOD): settings, cases, reports
//
//   GET  /api/discipline/settings
//   PUT  /api/discipline/settings          { total_marks }
//   GET  /api/discipline/students-summary  ?academic_year=&term=&class_name=
//   POST /api/discipline/cases             { student_id, academic_year, term, lesson_subject, description?, marks_deducted }
//   GET  /api/discipline/cases             ?academic_year=&term=&class_name=&limit=
//   GET  /api/discipline/report-summary    ?academic_year=&term=
//   GET  /api/discipline/dashboard         ?academic_year=&term=  — HoD home (summary + recent cases + pending permissions)
// ════════════════════════════════════════════════════════════════

const express = require('express');
const { promisePool } = require('../config/database');
const { requireRole } = require('../middleware/deoAuth');

const router = express.Router();
const HOD_ONLY = ['HOD', 'SCHOOL_ADMIN', 'SCHOOL_MANAGER', 'TEACHER', 'DOS', 'ACCOUNTANT'];

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

let tablesReady = false;
async function ensureDisciplineTables() {
  if (tablesReady) return;
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS school_discipline_settings (
      school_id INT UNSIGNED NOT NULL PRIMARY KEY,
      total_marks DECIMAL(8,2) NOT NULL DEFAULT 100.00,
      starting_marks DECIMAL(8,2) NOT NULL DEFAULT 100.00,
      permissions_enabled TINYINT(1) NOT NULL DEFAULT 1,
      cases_book_status ENUM('ACTIVE', 'ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      updated_by_user_id INT UNSIGNED NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // Migration: Add missing columns if table already existed
  const [cols] = await promisePool.query('SHOW COLUMNS FROM school_discipline_settings');
  const colNames = cols.map(c => c.Field);
  
  if (!colNames.includes('starting_marks')) {
    await promisePool.query('ALTER TABLE school_discipline_settings ADD COLUMN starting_marks DECIMAL(8,2) NOT NULL DEFAULT 100.00 AFTER total_marks');
  }
  if (!colNames.includes('permissions_enabled')) {
    await promisePool.query('ALTER TABLE school_discipline_settings ADD COLUMN permissions_enabled TINYINT(1) NOT NULL DEFAULT 1 AFTER starting_marks');
  }
  if (!colNames.includes('cases_book_status')) {
    await promisePool.query("ALTER TABLE school_discipline_settings ADD COLUMN cases_book_status ENUM('ACTIVE', 'ARCHIVED') NOT NULL DEFAULT 'ACTIVE' AFTER permissions_enabled");
  }
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
  tablesReady = true;
}

async function getSettingsForSchool(schoolId) {
  const [[row]] = await promisePool.query(
    'SELECT total_marks, starting_marks, permissions_enabled, cases_book_status FROM school_discipline_settings WHERE school_id = ? LIMIT 1',
    [schoolId]
  );
  if (row) return {
    total_marks: Number(row.total_marks),
    starting_marks: Number(row.starting_marks),
    permissions_enabled: !!row.permissions_enabled,
    cases_book_status: row.cases_book_status
  };
  return { total_marks: 100, starting_marks: 100, permissions_enabled: true, cases_book_status: 'ACTIVE' };
}

// ════════════════════════════════════════════════════════════════
// GET /api/discipline/settings
// ════════════════════════════════════════════════════════════════
router.get('/discipline/settings', requireRole(HOD_ONLY), async (req, res) => {
  try {
    await ensureDisciplineTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) {
      return res.status(400).json({ success: false, message: 'School not found in session.' });
    }
    const settings = await getSettingsForSchool(schoolId);
    return res.json({ success: true, data: settings });
  } catch (err) {
    console.error('GET /discipline/settings:', err);
    return res.status(500).json({ success: false, message: 'Failed to load settings' });
  }
});

// ════════════════════════════════════════════════════════════════
// PUT /api/discipline/settings
// ════════════════════════════════════════════════════════════════
router.put('/discipline/settings', requireRole(HOD_ONLY), async (req, res) => {
  try {
    await ensureDisciplineTables();
    const schoolId = resolveSchoolId(req);
    const userId = resolveUserId(req);
    if (!schoolId) {
      return res.status(400).json({ success: false, message: 'School not found in session.' });
    }

    const { total_marks, starting_marks, permissions_enabled, cases_book_status } = req.body;
    
    // Update all settings fields with optional fallback
    const sql = `
      INSERT INTO school_discipline_settings 
        (school_id, total_marks, starting_marks, permissions_enabled, cases_book_status, updated_by_user_id)
      VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        total_marks = VALUES(total_marks),
        starting_marks = VALUES(starting_marks),
        permissions_enabled = VALUES(permissions_enabled),
        cases_book_status = VALUES(cases_book_status),
        updated_by_user_id = VALUES(updated_by_user_id)
    `;

    const current = await getSettingsForSchool(schoolId);
    const params = [
      schoolId,
      total_marks ?? current.total_marks,
      starting_marks ?? current.starting_marks,
      permissions_enabled !== undefined ? permissions_enabled : current.permissions_enabled,
      cases_book_status ?? current.cases_book_status,
      userId
    ];

    await promisePool.query(sql, params);
    
    const updated = await getSettingsForSchool(schoolId);
    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error('PUT /discipline/settings:', err);
    return res.status(500).json({ success: false, message: 'Failed to save settings' });
  }
});

// ════════════════════════════════════════════════════════════════
// GET /api/discipline/students-summary
// ════════════════════════════════════════════════════════════════
router.get('/discipline/students-summary', requireRole(HOD_ONLY), async (req, res) => {
  try {
    await ensureDisciplineTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) {
      return res.status(400).json({ success: false, message: 'School not found in session.' });
    }

    const academicYear = trimStr(req.query.academic_year || req.query.year || '');
    const term = trimStr(req.query.term || '');
    const className = trimStr(req.query.class_name || req.query.class || '');

    if (!academicYear || !term) {
      return res.status(400).json({
        success: false,
        message: 'academic_year and term are required to show discipline marks.',
      });
    }

    const settings = await getSettingsForSchool(schoolId);
    const totalMarks = settings.total_marks;

    let sql = `
      SELECT
        s.id,
        s.student_uid,
        s.student_code,
        s.first_name,
        s.last_name,
        s.father_full_name,
        s.mother_full_name,
        s.father_phone,
        s.mother_phone,
        s.residency_status,
        s.province,
        s.district,
        COALESCE(s.class_name, ded.last_class) AS class_name,
        s.academic_year,
        COALESCE(ded.deducted, 0) AS discipline_deducted,
        (? - COALESCE(ded.deducted, 0)) AS discipline_remaining
      FROM students s
      LEFT JOIN (
        SELECT 
          student_id, 
          SUM(marks_deducted) AS deducted,
          SUBSTRING_INDEX(GROUP_CONCAT(class_name ORDER BY created_at DESC), ',', 1) AS last_class
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
      father_full_name: r.father_full_name || null,
      mother_full_name: r.mother_full_name || null,
      father_phone: r.father_phone || null,
      mother_phone: r.mother_phone || null,
      residency_status: r.residency_status || 'DAY',
      province: r.province || null,
      district: r.district || null,
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
router.post('/discipline/cases', requireRole(HOD_ONLY), async (req, res) => {
  try {
    await ensureDisciplineTables();
    const schoolId = resolveSchoolId(req);
    const userId = resolveUserId(req);
    if (!schoolId || !userId) {
      return res.status(400).json({ success: false, message: 'Invalid session.' });
    }

    const body = req.body || {};
    const studentId = Number(body.student_id);
    const academicYear = trimStr(body.academic_year);
    const term = trimStr(body.term);
    const lessonSubject = trimStr(body.lesson_subject || body.lesson || body.case_lesson);
    const description = trimStr(body.description) || null;
    const marksDeducted = Number(body.marks_deducted);

    if (!studentId || Number.isNaN(studentId)) {
      return res.status(400).json({ success: false, message: 'student_id is required.' });
    }
    if (!academicYear || !term) {
      return res.status(400).json({ success: false, message: 'academic_year and term are required.' });
    }
    if (!lessonSubject) {
      return res.status(400).json({ success: false, message: 'lesson_subject (case lesson) is required.' });
    }
    if (Number.isNaN(marksDeducted) || marksDeducted === 0) {
      return res.status(400).json({ success: false, message: 'marks_deducted must be a non-zero number.' });
    }

    const [[st]] = await promisePool.query(
      'SELECT id, class_name FROM students WHERE id = ? AND school_id = ? LIMIT 1',
      [studentId, schoolId]
    );
    if (!st) {
      return res.status(404).json({ success: false, message: 'Student not found in this school.' });
    }

    const settings = await getSettingsForSchool(schoolId);
    const totalMarks = settings.total_marks;
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
router.get('/discipline/cases', requireRole(HOD_ONLY), async (req, res) => {
  try {
    await ensureDisciplineTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) {
      return res.status(400).json({ success: false, message: 'School not found in session.' });
    }

    const academicYear = trimStr(req.query.academic_year || '');
    const term = trimStr(req.query.term || '');
    const className = trimStr(req.query.class_name || '');
    const studentId = Number(req.query.student_id) || null;
    const limit = Math.min(500, Math.max(10, Number(req.query.limit) || 200));

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

    if (academicYear) {
      sql += ' AND c.academic_year = ?';
      params.push(academicYear);
    }
    if (term) {
      sql += ' AND c.term = ?';
      params.push(term);
    }
    if (className) {
      sql += ' AND c.class_name = ?';
      params.push(className);
    }
    if (studentId) {
      sql += ' AND c.student_id = ?';
      params.push(studentId);
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
router.get('/discipline/report-summary', requireRole(HOD_ONLY), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    if (!schoolId) {
      return res.status(400).json({ success: false, message: 'School not found in session.' });
    }

    const academicYear = trimStr(req.query.academic_year || '');
    const term = trimStr(req.query.term || '');

    const settings = await getSettingsForSchool(schoolId);
    const totalMarks = settings.total_marks;

    let caseWhere = 'WHERE school_id = ?';
    const caseParams = [schoolId];
    if (academicYear) {
      caseWhere += ' AND academic_year = ?';
      caseParams.push(academicYear);
    }
    if (term) {
      caseWhere += ' AND term = ?';
      caseParams.push(term);
    }

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

    const [[genderCounts]] = await promisePool.query(
      `SELECT 
        SUM(CASE WHEN gender = 'Male' THEN 1 ELSE 0 END) AS boys,
        SUM(CASE WHEN gender = 'Female' THEN 1 ELSE 0 END) AS girls
      FROM students WHERE school_id = ?`,
      [schoolId]
    );

    const [[attendanceStats]] = await promisePool.query(
      `SELECT 
        SUM(CASE WHEN status IN ('Absent', 'Excused') THEN 1 ELSE 0 END) AS absent_today,
        SUM(CASE WHEN remarks LIKE '%Missed Classes%' THEN 1 ELSE 0 END) AS missed_courses
      FROM daily_attendance_summary 
      WHERE school_id = ? AND attendance_date = CURDATE() AND person_type = 'STUDENT'`,
      [schoolId]
    );

    return res.json({
      success: true,
      data: {
        meta: { academic_year: academicYear, term },
        total_marks_default: totalMarks,
        case_count: Number(agg?.case_count || 0),
        students_affected: Number(agg?.students_affected || 0),
        total_marks_removed: Number(agg?.total_marks_removed || 0),
        by_class: byClass || [],
        demographics: {
          boys: Number(genderCounts?.boys || 0),
          girls: Number(genderCounts?.girls || 0)
        },
        attendance_today: {
          absent: Number(attendanceStats?.absent_today || 0),
          missed_courses: Number(attendanceStats?.missed_courses || 0)
        }
      },
    });
  } catch (err) {
    console.error('GET /discipline/report-summary:', err);
    return res.status(500).json({ success: false, message: 'Failed to load report summary' });
  }
});

// ════════════════════════════════════════════════════════════════
// GET /api/discipline/attendance-today-details?kind=absent|missed
// - absent: students with status Absent/Excused today
// - missed: students in school but missed classes (best-effort timetable scan)
// ════════════════════════════════════════════════════════════════
router.get('/discipline/attendance-today-details', requireRole(HOD_ONLY), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School not found in session.' });

    const kind = trimStr(req.query.kind || 'absent').toLowerCase();
    const dayShort = new Date().toLocaleDateString('en-US', { weekday: 'short' }); // Mon
    const dayLong = new Date().toLocaleDateString('en-US', { weekday: 'long' });  // Monday

    if (kind === 'absent') {
      const [rows] = await promisePool.query(
        `SELECT
           s.id,
           s.student_uid,
           s.student_code,
           s.first_name,
           s.last_name,
           s.class_name,
           s.father_phone,
           s.mother_phone,
           das.status,
           das.remarks,
           das.first_in,
           das.last_out
         FROM daily_attendance_summary das
         INNER JOIN students s ON s.id = das.person_id AND s.school_id = das.school_id
         WHERE das.school_id = ?
           AND das.person_type = 'STUDENT'
           AND das.attendance_date = CURDATE()
           AND das.status IN ('Absent','Excused')
         ORDER BY s.class_name ASC, s.first_name ASC, s.last_name ASC`,
        [schoolId]
      );
      return res.json({ success: true, data: rows || [] });
    }

    if (kind === 'missed') {
      const [base] = await promisePool.query(
        `SELECT
           s.id,
           s.student_uid,
           s.student_code,
           s.first_name,
           s.last_name,
           s.class_name,
           s.rfid_uid,
           s.father_phone,
           s.mother_phone,
           das.status,
           das.remarks,
           das.first_in,
           das.last_out
         FROM daily_attendance_summary das
         INNER JOIN students s ON s.id = das.person_id AND s.school_id = das.school_id
         WHERE das.school_id = ?
           AND das.person_type = 'STUDENT'
           AND das.attendance_date = CURDATE()
           AND das.remarks LIKE '%Missed Classes%'
         ORDER BY s.class_name ASC, s.first_name ASC, s.last_name ASC`,
        [schoolId]
      );

      // Preload timetable rows once (today only)
      const [ttAll] = await promisePool.query(
        `SELECT id, class_name, subject_name, staff_id, day_of_week, start_time, end_time, room
         FROM academic_timetables
         WHERE school_id = ? AND (day_of_week = ? OR day_of_week = ?)
         ORDER BY start_time ASC`,
        [schoolId, dayShort, dayLong]
      );

      // Preload logs once (today only)
      const [logsAll] = await promisePool.query(
        `SELECT rfid_uid, scan_timestamp, device_uid
         FROM biometric_logs_raw
         WHERE school_id = ? AND DATE(scan_timestamp) = CURDATE()`,
        [schoolId]
      );

      const toTimeStr = (dt) => new Date(dt).toTimeString().split(' ')[0];

      const enriched = (base || []).map((row) => {
        const rfid = row.rfid_uid;
        if (!rfid) return { ...row, missed_periods: [], missed_periods_note: 'No RFID registered' };

        const className = row.class_name || '';
        const tt = ttAll.filter((t) => String(t.class_name || '').toLowerCase() === String(className).toLowerCase());
        if (!tt.length) return { ...row, missed_periods: [], missed_periods_note: 'No timetable found for class' };

        const myLogs = logsAll.filter((l) => l.rfid_uid === rfid);
        const missed = [];

        for (const period of tt) {
          const found = myLogs.some((l) => {
            const t = toTimeStr(l.scan_timestamp);
            return t >= period.start_time && t <= period.end_time;
          });
          if (!found) {
            missed.push({
              subject_name: period.subject_name,
              start_time: period.start_time,
              end_time: period.end_time,
              room: period.room || null,
            });
          }
        }

        return { ...row, missed_periods: missed };
      });

      return res.json({ success: true, data: enriched });
    }

    return res.status(400).json({ success: false, message: 'Invalid kind. Use kind=absent or kind=missed.' });
  } catch (err) {
    console.error('GET /discipline/attendance-today-details:', err);
    return res.status(500).json({ success: false, message: 'Failed to load attendance details' });
  }
});

// ════════════════════════════════════════════════════════════════
// GET /api/discipline/dashboard — term-scoped summary for HoD home
// ════════════════════════════════════════════════════════════════
router.get('/discipline/dashboard', requireRole(HOD_ONLY), async (req, res) => {
  try {
    await ensureDisciplineTables();
    const permRouter = require('./studentPermissions');
    if (typeof permRouter.ensureStudentPermissionTables === 'function') {
      await permRouter.ensureStudentPermissionTables();
    }

    const schoolId = resolveSchoolId(req);
    if (!schoolId) {
      return res.status(400).json({ success: false, message: 'School not found in session.' });
    }

    const academicYear = trimStr(req.query.academic_year || '2025-2026');
    const term = trimStr(req.query.term || 'Term 1');

    const settings = await getSettingsForSchool(schoolId);
    const totalMarks = settings.total_marks;

    const caseWhere = 'WHERE school_id = ? AND academic_year = ? AND term = ?';
    const caseParams = [schoolId, academicYear, term];

    const [[agg]] = await promisePool.query(
      `SELECT
         COUNT(*) AS case_count,
         COUNT(DISTINCT student_id) AS students_affected,
         COALESCE(SUM(marks_deducted), 0) AS total_marks_removed
       FROM discipline_cases ${caseWhere}`,
      caseParams
    );

    const [recentCases] = await promisePool.query(
      `SELECT
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
      ${caseWhere}
      ORDER BY c.created_at DESC
      LIMIT 10`,
      caseParams
    );

    const [[permPending]] = await promisePool.query(
      `SELECT COUNT(*) AS c FROM student_permissions WHERE school_id = ? AND status = 'PENDING'`,
      [schoolId]
    );

    return res.json({
      success: true,
      data: {
        meta: {
          academic_year: academicYear,
          term,
          total_marks: totalMarks,
        },
        summary: {
          case_count: Number(agg?.case_count || 0),
          students_affected: Number(agg?.students_affected || 0),
          total_marks_removed: Number(agg?.total_marks_removed || 0),
        },
        pending_permissions: Number(permPending?.c || 0),
        recent_cases: recentCases || [],
      },
    });
  } catch (err) {
    console.error('GET /discipline/dashboard:', err);
    return res.status(500).json({ success: false, message: 'Failed to load dashboard' });
  }
});

module.exports = router;
