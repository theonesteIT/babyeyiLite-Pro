// ================================================================
// discipline.js — Head of Discipline (HOD): settings, cases, reports
//
//   GET  /api/discipline/settings
//   PUT  /api/discipline/settings          { total_marks }
//   GET  /api/discipline/students-summary  ?academic_year=&term=&class_name=
//   POST /api/discipline/cases             { student_id, academic_year, term, lesson_subject, description?, marks_deducted }
//   GET  /api/discipline/cases             ?academic_year=&term=&class_name=&limit=
//   GET  /api/discipline/report-summary    ?academic_year=&term=
// ════════════════════════════════════════════════════════════════

const express = require('express');
const { promisePool } = require('../config/database');
const { requireRole } = require('../middleware/deoAuth');

const router = express.Router();
const HOD_ONLY = ['HOD', 'SCHOOL_ADMIN', 'SCHOOL_MANAGER'];

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
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      updated_by_user_id INT UNSIGNED NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
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

async function getTotalMarksForSchool(schoolId) {
  const [[row]] = await promisePool.query(
    'SELECT total_marks FROM school_discipline_settings WHERE school_id = ? LIMIT 1',
    [schoolId]
  );
  if (row && row.total_marks != null) return Number(row.total_marks);
  return 100;
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
    const total = await getTotalMarksForSchool(schoolId);
    return res.json({ success: true, data: { total_marks: total } });
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
    if (!schoolId || !userId) {
      return res.status(400).json({ success: false, message: 'Invalid session.' });
    }
    const totalMarks = Number(req.body?.total_marks);
    if (Number.isNaN(totalMarks) || totalMarks < 1 || totalMarks > 10000) {
      return res.status(400).json({
        success: false,
        message: 'total_marks must be a number between 1 and 10000.',
      });
    }
    await promisePool.query(
      `INSERT INTO school_discipline_settings (school_id, total_marks, updated_by_user_id)
       VALUES (?,?,?)
       ON DUPLICATE KEY UPDATE total_marks = VALUES(total_marks), updated_by_user_id = VALUES(updated_by_user_id)`,
      [schoolId, totalMarks, userId]
    );
    return res.json({ success: true, data: { total_marks: totalMarks } });
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

    const totalMarks = await getTotalMarksForSchool(schoolId);

    let sql = `
      SELECT
        s.id,
        s.student_uid,
        s.student_code,
        s.first_name,
        s.last_name,
        s.class_name,
        s.academic_year,
        COALESCE(ded.deducted, 0) AS discipline_deducted,
        (? - COALESCE(ded.deducted, 0)) AS discipline_remaining
      FROM students s
      LEFT JOIN (
        SELECT student_id, SUM(marks_deducted) AS deducted
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

    const totalMarks = await getTotalMarksForSchool(schoolId);
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
    await ensureDisciplineTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) {
      return res.status(400).json({ success: false, message: 'School not found in session.' });
    }

    const academicYear = trimStr(req.query.academic_year || '');
    const term = trimStr(req.query.term || '');

    const totalMarks = await getTotalMarksForSchool(schoolId);

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

    return res.json({
      success: true,
      data: {
        total_marks_default: totalMarks,
        case_count: Number(agg?.case_count || 0),
        students_affected: Number(agg?.students_affected || 0),
        total_marks_removed: Number(agg?.total_marks_removed || 0),
        by_class: byClass || [],
      },
    });
  } catch (err) {
    console.error('GET /discipline/report-summary:', err);
    return res.status(500).json({ success: false, message: 'Failed to load report summary' });
  }
});

module.exports = router;
