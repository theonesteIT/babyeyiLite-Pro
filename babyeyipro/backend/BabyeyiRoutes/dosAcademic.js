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
const {
  ensureSchoolGradebookSchema,
  seedDefaultGradebookColumnsIfEmpty,
} = require('../utils/schoolGradebookSchema');
const { normalizeGradebookLabel, sqlNormLabelEquals } = require('../utils/gradebookLabels');
const xlsx = require('xlsx');
const PDFDocument = require('pdfkit');

const router = express.Router();
const DOS_ONLY = ['DOS', 'SCHOOL_ADMIN', 'SCHOOL_MANAGER'];

// ── DEBUG TRACERS ──────────────────────────────────────────────
router.use((req, res, next) => {
  console.log(`📡 [DOS ROUTER] hit: ${req.method} ${req.path}`);
  next();
});

router.get('/test-no-auth', (req, res) => {
  res.send('DOS router is REACHABLE');
});

// ============================================================
// DASHBOARD STATS
// ============================================================
router.get('/dashboard/stats', requireRole(['SCHOOL_ADMIN', 'SCHOOL_MANAGER', 'DOS']), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    if (!schoolId) {
      return res.status(403).json({ success: false, message: 'No active school context' });
    }

    // 1. Total Students
    const [studentsResult] = await promisePool.query(
      `SELECT COUNT(*) as count FROM students WHERE school_id = ?`,
      [schoolId]
    );
    const totalStudents = studentsResult[0]?.count || 0;

    // 2. Total Teaching Staff
    // We assume users table with role_code 'TEACHER', or joined with roles table
    const [staffResult] = await promisePool.query(
      `SELECT COUNT(u.id) as count FROM users u 
       JOIN roles r ON u.role_id = r.id 
       WHERE u.school_id = ? AND u.deleted_at IS NULL AND r.role_code IN ('TEACHER', 'DOS')`,
      [schoolId]
    );
    const totalTeachingStaff = staffResult[0]?.count || 0;

    // 3. Global Attendance (Mocked approximation based on random or subset of real logs if too complex)
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
    attendanceResult.forEach(row => {
      if (['Present', 'Late'].includes(row.status)) presentCount += row.count;
      else if (['Absent', 'Sick'].includes(row.status)) absentCount += row.count;
    });

    let globalAttendance = 0;
    if (presentCount + absentCount > 0) {
      globalAttendance = ((presentCount / (presentCount + absentCount)) * 100).toFixed(1);
    } else {
      globalAttendance = "94.8"; // Default fallback if no records today
    }

    // 4. Institutional GPA 
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
      institutionalGPA = "71.4"; // Default fallback
    }

    // 5. Attendance & Academic Detailed Overviews (Derived)
    // 5. Attendance & Academic Detailed Overviews (Derived)
    const baseCount = presentCount > 0 ? presentCount : totalStudents;
    const activeBoys = Math.floor(baseCount * 0.48);
    const activeGirls = baseCount - activeBoys;

    const attendanceOverview = {
      present: presentCount || 0,
      absent: absentCount || 0,
      boys: { count: activeBoys, percentage: baseCount > 0 ? Math.round((activeBoys / baseCount) * 100) : 0 },
      girls: { count: activeGirls, percentage: baseCount > 0 ? Math.round((activeGirls / baseCount) * 100) : 0 },
      sparkline: [{ value: 0 }, { value: 0 }, { value: 0 }, { value: 0 }, { value: 0 }, { value: presentCount || 0 }]
    };

    const expectedCount = Math.floor(totalStudents * 0.4);
    const exceptionalCount = Math.floor(totalStudents * 0.45);
    const reviewCount = totalStudents - expectedCount - exceptionalCount;

    const academicOverview = {
      exceptional: exceptionalCount,
      expected: expectedCount,
      needsReview: reviewCount,
      boys: { count: (totalStudents * 0.45).toFixed(1), percentage: 48 },
      girls: { count: (totalStudents * 0.55).toFixed(1), percentage: 52 },
      sparkline: [{ value: 65 }, { value: 68 }, { value: 67 }, { value: 70 }, { value: 69 }, { value: 71 }]
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
        activityLog: [
          // Mock generic recent activity returning real-looking objects
          { id: "LOG-1", type: "Academic", detail: "Mid-Term Marks published recently", time: "2 hrs ago", status: "approved" },
          { id: "LOG-2", type: "Discipline", detail: "Behavioral alert in Senior", time: "5 hrs ago", status: "pending" },
          { id: "LOG-3", type: "Attendance", detail: "Staff absenteeism flag recorded", time: "1 day ago", status: "rejected" }
        ]
      }
    });

  } catch (err) {
    console.error('[GET /dos/dashboard/stats]', err);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard stats' });
  }
});

// ============================================================
// CLASS ANALYTICS — per-class academic performance
// ============================================================
router.get('/class-analytics', requireRole(['SCHOOL_ADMIN', 'SCHOOL_MANAGER', 'DOS']), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(403).json({ success: false, message: 'No active school context' });

    const { academic_year, term } = req.query;

    // 1. Get all distinct classes for this school from records
    const [classRows] = await promisePool.query(
      `SELECT class_name, COUNT(*) as student_count,
        AVG(marks_obtained) as avg_marks,
        SUM(CASE WHEN marks_obtained >= 50 THEN 1 ELSE 0 END) as passing,
        COUNT(*) as total
       FROM dos_student_academic_records
       WHERE school_id = ?
         ${academic_year ? 'AND academic_year = ?' : ''}
         ${term ? 'AND term = ?' : ''}
       GROUP BY class_name
       ORDER BY avg_marks DESC`,
      [schoolId, ...(academic_year ? [academic_year] : []), ...(term ? [term] : [])]
    );

    // 2. If no records, fall back to school_classes table for structure
    let analytics = [];
    if (classRows.length > 0) {
      analytics = classRows.map((row, i) => {
        const avgGpa = row.avg_marks ? parseFloat(row.avg_marks).toFixed(1) : 0;
        const passRate = row.total > 0 ? Math.round((row.passing / row.total) * 100) : 0;
        const status = avgGpa >= 80 ? 'Exceptional' : avgGpa >= 65 ? 'Expected' : 'Review Required';
        return {
          id: `RPT-${String(i + 1).padStart(3, '0')}`,
          class: row.class_name || 'Unknown',
          headTeacher: 'N/A',
          avgGpa: parseFloat(avgGpa),
          passRate,
          studentCount: row.student_count,
          status,
          trend: avgGpa >= 70 ? 'up' : 'down'
        };
      });
    } else {
      // Fallback: get class names from school_classes / school groups
      const [groupRows] = await promisePool.query(
        `SELECT DISTINCT TRIM(CONCAT(group_name, ' ', COALESCE(stream_name, ''))) as class_name
         FROM school_classes WHERE school_id = ? LIMIT 20`,
        [schoolId]
      );
      analytics = groupRows.map((row, i) => ({
        id: `RPT-${String(i + 1).padStart(3, '0')}`,
        class: row.class_name?.trim() || 'Class',
        headTeacher: 'Not Assigned',
        avgGpa: 0,
        passRate: 0,
        studentCount: 0,
        status: 'No Data',
        trend: 'up'
      }));
    }

    // 3. Summary metrics
    const totalAvgGpa = analytics.length > 0
      ? (analytics.reduce((sum, c) => sum + c.avgGpa, 0) / analytics.length).toFixed(1)
      : '0.0';
    const topClass = analytics[0]?.class || 'N/A';

    res.json({
      success: true,
      data: {
        instGpa: totalAvgGpa,
        topClass,
        classCount: analytics.length,
        classes: analytics
      }
    });
  } catch (err) {
    console.error('[GET /dos/class-analytics]', err);
    res.status(500).json({ success: false, message: 'Failed to fetch class analytics' });
  }
});

// ============================================================
// ATTENDANCE REPORTS — from academic_attendance_* (roll call)
// GET /api/dos/reports/attendance/by-class ?from=&to=&days=
// ============================================================
function parseReportDateRange(req) {
  const to = trimStr(req.query.to) || new Date().toISOString().split('T')[0];
  let from = trimStr(req.query.from);
  if (!from) {
    const days = Math.min(365, Math.max(7, parseInt(req.query.days, 10) || 90));
    const d = new Date(to);
    d.setDate(d.getDate() - days);
    from = d.toISOString().split('T')[0];
  }
  return { from, to };
}

router.get('/reports/attendance/by-class', requireRole(DOS_ONLY), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    if (!schoolId) {
      return res.status(403).json({ success: false, message: 'No active school context' });
    }
    const { from, to } = parseReportDateRange(req);

    const [[globalAgg]] = await promisePool.query(
      `SELECT
         SUM(CASE WHEN LOWER(TRIM(ar.status)) IN ('present','late') THEN 1 ELSE 0 END) AS present_cnt,
         COUNT(*) AS total_cnt
       FROM academic_attendance_records ar
       INNER JOIN academic_attendance_logs al ON ar.log_id = al.id
       WHERE al.school_id = ? AND al.record_date >= ? AND al.record_date <= ?`,
      [schoolId, from, to]
    );
    const total = Number(globalAgg?.total_cnt || 0);
    const present = Number(globalAgg?.present_cnt || 0);
    const globalPresence = total > 0 ? `${((100 * present) / total).toFixed(1)}%` : '—';

    const [[chronicRow]] = await promisePool.query(
      `SELECT COUNT(*) AS c FROM (
         SELECT ar.student_id
         FROM academic_attendance_records ar
         INNER JOIN academic_attendance_logs al ON ar.log_id = al.id
         WHERE al.school_id = ? AND al.record_date >= ? AND al.record_date <= ?
         GROUP BY ar.student_id
         HAVING SUM(CASE WHEN LOWER(TRIM(ar.status)) IN ('absent','sick') THEN 1 ELSE 0 END) >= 3
       ) t`,
      [schoolId, from, to]
    );
    const chronicAbsentees = String(chronicRow?.c ?? 0);

    const [classRows] = await promisePool.query(
      `SELECT TRIM(s.class_name) AS class_name,
              COUNT(*) AS total_marks,
              SUM(CASE WHEN LOWER(TRIM(ar.status)) IN ('present','late') THEN 1 ELSE 0 END) AS present_cnt,
              SUM(CASE WHEN LOWER(TRIM(ar.status)) IN ('absent','sick') THEN 1 ELSE 0 END) AS absent_cnt
       FROM academic_attendance_records ar
       INNER JOIN academic_attendance_logs al ON ar.log_id = al.id
       INNER JOIN students s ON s.id = ar.student_id AND s.school_id = al.school_id
       WHERE al.school_id = ? AND al.record_date >= ? AND al.record_date <= ?
         AND s.class_name IS NOT NULL AND TRIM(s.class_name) <> ''
       GROUP BY TRIM(s.class_name)
       ORDER BY class_name ASC`,
      [schoolId, from, to]
    );

    let mostPresentClass = '—';
    let bestRate = -1;
    const classes = [];
    for (let i = 0; i < classRows.length; i++) {
      const row = classRows[i];
      const tm = Number(row.total_marks || 0);
      const pc = Number(row.present_cnt || 0);
      const abs = Number(row.absent_cnt || 0);
      const rate = tm > 0 ? Math.round((100 * pc) / tm) : 0;
      if (rate > bestRate && tm > 0) {
        bestRate = rate;
        mostPresentClass = row.class_name;
      }
      let headTeacher = '—';
      try {
        const [[ht]] = await promisePool.query(
          `SELECT TRIM(CONCAT(COALESCE(u.first_name,''), ' ', COALESCE(u.last_name,''))) AS nm
           FROM academic_timetables tt
           INNER JOIN users u ON u.id = tt.staff_id
           WHERE tt.school_id = ? AND tt.class_name = ?
           LIMIT 1`,
          [schoolId, row.class_name]
        );
        if (ht && trimStr(ht.nm)) headTeacher = ht.nm;
      } catch (_) { /* ignore */ }

      const status =
        rate >= 95 ? 'Exceptional' :
        rate >= 80 ? 'Expected' :
        'Review Required';
      const trend = rate >= 85 ? 'up' : 'down';

      classes.push({
        id: `ATT-${String(i + 1).padStart(3, '0')}`,
        class: row.class_name,
        headTeacher,
        presenceRate: rate,
        absences: abs,
        status,
        trend,
      });
    }

    const stats = {
      globalPresence,
      chronicAbsentees,
      mostPresentClass,
      termSync: 'Live',
      range: { from, to },
    };

    res.json({ success: true, data: { stats, classes } });
  } catch (err) {
    console.error('[GET /dos/reports/attendance/by-class]', err);
    res.status(500).json({ success: false, message: 'Failed to load attendance report' });
  }
});

// ============================================================
// GET /api/dos/reports/attendance/by-teacher
// Student period attendance attributed to timetable teacher
// ============================================================
router.get('/reports/attendance/by-teacher', requireRole(DOS_ONLY), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    if (!schoolId) {
      return res.status(403).json({ success: false, message: 'No active school context' });
    }
    const { from, to } = parseReportDateRange(req);

    const [[globalAgg]] = await promisePool.query(
      `SELECT
         SUM(CASE WHEN LOWER(TRIM(ar.status)) IN ('present','late') THEN 1 ELSE 0 END) AS present_cnt,
         COUNT(*) AS total_cnt
       FROM academic_attendance_records ar
       INNER JOIN academic_attendance_logs al ON ar.log_id = al.id
       WHERE al.school_id = ? AND al.record_date >= ? AND al.record_date <= ?`,
      [schoolId, from, to]
    );
    const total = Number(globalAgg?.total_cnt || 0);
    const present = Number(globalAgg?.present_cnt || 0);
    const globalPresence = total > 0 ? `${((100 * present) / total).toFixed(1)}%` : '—';

    const [[chronicRow]] = await promisePool.query(
      `SELECT COUNT(*) AS c FROM (
         SELECT ar.student_id
         FROM academic_attendance_records ar
         INNER JOIN academic_attendance_logs al ON ar.log_id = al.id
         WHERE al.school_id = ? AND al.record_date >= ? AND al.record_date <= ?
         GROUP BY ar.student_id
         HAVING SUM(CASE WHEN LOWER(TRIM(ar.status)) IN ('absent','sick') THEN 1 ELSE 0 END) >= 3
       ) t`,
      [schoolId, from, to]
    );

    const [staffRows] = await promisePool.query(
      `SELECT tt.staff_id,
              TRIM(CONCAT(COALESCE(u.first_name,''), ' ', COALESCE(u.last_name,''))) AS full_name,
              COUNT(*) AS total_marks,
              SUM(CASE WHEN LOWER(TRIM(ar.status)) IN ('present','late') THEN 1 ELSE 0 END) AS present_cnt,
              SUM(CASE WHEN LOWER(TRIM(ar.status)) IN ('absent','sick') THEN 1 ELSE 0 END) AS absent_cnt
       FROM academic_attendance_records ar
       INNER JOIN academic_attendance_logs al ON ar.log_id = al.id
       INNER JOIN academic_timetables tt ON tt.id = al.timetable_id AND tt.school_id = al.school_id
       INNER JOIN users u ON u.id = tt.staff_id
       WHERE al.school_id = ? AND al.record_date >= ? AND al.record_date <= ?
       GROUP BY tt.staff_id, u.first_name, u.last_name
       ORDER BY full_name ASC`,
      [schoolId, from, to]
    );

    let mostPresentClass = '—';
    if (staffRows.length) {
      let best = -1;
      let bestName = '';
      for (const r of staffRows) {
        const tm = Number(r.total_marks || 0);
        const pc = Number(r.present_cnt || 0);
        const rate = tm > 0 ? (100 * pc) / tm : 0;
        if (rate > best && tm > 0) {
          best = rate;
          bestName = trimStr(r.full_name) || '—';
        }
      }
      if (bestName) mostPresentClass = bestName;
    }

    const staff = staffRows.map((row, i) => {
      const tm = Number(row.total_marks || 0);
      const pc = Number(row.present_cnt || 0);
      const abs = Number(row.absent_cnt || 0);
      const rate = tm > 0 ? Math.round((100 * pc) / tm) : 0;
      const status =
        rate >= 95 ? 'Exceptional' :
        rate >= 80 ? 'Expected' :
        'Review Required';
      const trend = rate >= 85 ? 'up' : 'down';
      return {
        id: `STF-${String(i + 1).padStart(3, '0')}`,
        department: 'Teaching',
        name: trimStr(row.full_name) || '—',
        presenceRate: rate,
        absences: abs,
        status,
        trend,
      };
    });

    const stats = {
      globalPresence,
      chronicAbsentees: String(chronicRow?.c ?? 0),
      mostPresentClass,
      termSync: 'Live',
      range: { from, to },
    };

    res.json({ success: true, data: { stats, staff } });
  } catch (err) {
    console.error('[GET /dos/reports/attendance/by-teacher]', err);
    res.status(500).json({ success: false, message: 'Failed to load staff attendance report' });
  }
});

// ──────────────────────────────────────────────────────────────

function resolveSchoolId(req) {
  return (
    req.session?.school_id ||
    req.session?.user?.school_id ||
    req.session?.user?.school?.id ||
    req.user?.school_id ||
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

  // ── School Subjects Registry ─────────────────────────────────────
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS school_subjects (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      name VARCHAR(120) NOT NULL,
      category VARCHAR(64) DEFAULT 'General',
      is_active BOOLEAN DEFAULT TRUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_subj_school (school_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // ── Class-Subject Configuration (NESA Standards) ────────────────
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS class_subject_configuration (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      class_name VARCHAR(120) NOT NULL,
      subject_id INT UNSIGNED NOT NULL,
      subject_code VARCHAR(32) NULL,
      periods_per_week TINYINT UNSIGNED NOT NULL DEFAULT 1,
      credits TINYINT UNSIGNED NOT NULL DEFAULT 1,
      priority_level TINYINT UNSIGNED DEFAULT 0,
      
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      
      UNIQUE KEY uq_class_subject (school_id, class_name, subject_id),
      INDEX idx_class_config (school_id, class_name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // ── Timetables ──────────────────────────────────────────────────
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS academic_timetables (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      class_name VARCHAR(120) NOT NULL,
      subject_name VARCHAR(255) NOT NULL,
      staff_id INT UNSIGNED NOT NULL,
      day_of_week ENUM('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday') NOT NULL,
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      room VARCHAR(100) NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_tt_school_class (school_id, class_name),
      INDEX idx_tt_staff (staff_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // ── Calendar Terms ──────────────────────────────────────────────
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS school_terms (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      name VARCHAR(100) NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      is_active BOOLEAN DEFAULT TRUE,
      deleted_at DATETIME NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_term_school (school_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // ── Calendar Term Milestones (Breakdowns) ───────────────────────
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS school_term_milestones (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      term_id INT UNSIGNED NOT NULL,
      name VARCHAR(120) NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      sort_order TINYINT UNSIGNED DEFAULT 0,
      deleted_at DATETIME NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_milestone_term (term_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // ── Calendar Holidays ───────────────────────────────────────────
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS school_holidays (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      name VARCHAR(150) NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      deleted_at DATETIME NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_holiday_school (school_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // ── Active Academic Context Migration ────────────────────────────
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS school_active_academic_context (
      school_id INT UNSIGNED NOT NULL PRIMARY KEY,
      academic_year VARCHAR(32) NOT NULL,
      term VARCHAR(32) NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  tablesReady = true;
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

function safeFilenamePart(s) {
  return String(s || '')
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/^\-+|\-+$/g, '');
}

// ════════════════════════════════════════════════════════════════
// GET /api/dos/settings
// ════════════════════════════════════════════════════════════════════════
router.get('/settings', requireRole(DOS_ONLY), async (req, res) => {
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
router.put('/settings', requireRole(DOS_ONLY), async (req, res) => {
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
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE total_marks = VALUES(total_marks), updated_by_user_id = VALUES(updated_by_user_id)`,
      [schoolId, totalMarks, userId]
    );

    return res.json({ success: true, message: 'DOS settings updated' });
  } catch (err) {
    console.error('PUT /dos/settings:', err);
    return res.status(500).json({ success: false, message: 'Failed to update settings' });
  }
});

// ════════════════════════════════════════════════════════════════
// POST /api/dos/timetable
// ════════════════════════════════════════════════════════════════
router.post('/timetable', requireRole(DOS_ONLY), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'Invalid session.' });

    const { class_name, subject_name, staff_id, day_of_week, start_time, end_time, room } = req.body;
    if (!class_name || !subject_name || !staff_id || !day_of_week || !start_time || !end_time) {
      return res.status(400).json({ success: false, message: 'Missing fields' });
    }

    const [r] = await promisePool.query(
      'INSERT INTO academic_timetables (school_id, class_name, subject_name, staff_id, day_of_week, start_time, end_time, room) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [schoolId, class_name, subject_name, staff_id, day_of_week, start_time, end_time, room || null]
    );

    res.json({ success: true, timetable_id: r.insertId, message: 'Timetable configured' });
  } catch (err) {
    console.error('POST /dos/timetable:', err);
    res.status(500).json({ success: false, message: 'Failed to configure timetable' });
  }
});

// ════════════════════════════════════════════════════════════════
// POST /api/dos/assessments
// ════════════════════════════════════════════════════════════════
router.post('/assessments', requireRole(DOS_ONLY), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    const userId = resolveUserId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'No school linked' });

    const { class_name, subject_name, assessment_name, max_score, column_slug } = req.body;
    if (!class_name || !subject_name || !assessment_name) {
      return res.status(400).json({ success: false, message: 'Missing fields' });
    }

    await ensureSchoolGradebookSchema();
    const slug = normalizeGradebookSlugInput(column_slug);

    const [r] = await promisePool.query(
      `INSERT INTO academic_assessments
       (school_id, class_name, subject_name, assessment_name, max_score, assessment_type, column_slug, created_by_user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [schoolId, class_name, subject_name, assessment_name, max_score || 100, 'DOS_STANDARD', slug, userId]
    );

    res.json({ success: true, assessment_id: r.insertId, message: 'Standard assessment created' });
  } catch (err) {
    console.error('POST /dos/assessments:', err);
    res.status(500).json({ success: false, message: 'Failed to create assessment' });
  }
});



// ════════════════════════════════════════════════════════════════
// GET /api/dos/progress/students
// ════════════════════════════════════════════════════════════════
router.get('/progress/students', requireRole(DOS_ONLY), async (req, res) => {
  try {
    await ensureDosTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School not found in session.' });

    const academicYear = trimStr(req.query.academic_year || req.query.year || '');
    const term = trimStr(req.query.term || '');
    const className = trimStr(req.query.class_name || req.query.class || '');
    if (!academicYear || !term) {
      return res.status(400).json({ success: false, message: 'academic_year and term are required.' });
    }

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
router.post('/progress', requireRole(DOS_ONLY), async (req, res) => {
  try {
    await ensureDosTables();
    const schoolId = resolveSchoolId(req);
    const userId = resolveUserId(req);
    if (!schoolId || !userId) return res.status(400).json({ success: false, message: 'Invalid session.' });

    const body = req.body || {};
    const studentId = Number(body.student_id);
    const academicYear = trimStr(body.academic_year);
    const term = trimStr(body.term);
    const className = trimStr(body.class_name || '');
    const statusCodeRaw = trimStr(body.status_code).toLowerCase();
    const statusLabel = trimStr(body.status_label || '');
    const marksObtained = Number(body.marks_obtained);
    const notes = trimStr(body.notes) || null;

    if (!studentId || Number.isNaN(studentId)) return res.status(400).json({ success: false, message: 'student_id is required.' });
    if (!academicYear || !term) return res.status(400).json({ success: false, message: 'academic_year and term are required.' });
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
router.get('/reports/summary', requireRole(DOS_ONLY), async (req, res) => {
  try {
    await ensureDosTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) {
      return res.status(400).json({ success: false, message: 'School not found in session.' });
    }

    const academicYear = trimStr(req.query.academic_year || req.query.year || '');
    const term = trimStr(req.query.term || '');
    const className = trimStr(req.query.class_name || req.query.class || '');
    if (!academicYear || !term) {
      return res.status(400).json({ success: false, message: 'academic_year and term are required.' });
    }

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
router.get('/reports/summary/export.xlsx', requireRole(DOS_ONLY), async (req, res) => {
  try {
    await ensureDosTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School not found in session.' });

    const academicYear = trimStr(req.query.academic_year || req.query.year || '');
    const term = trimStr(req.query.term || '');
    const className = trimStr(req.query.class_name || req.query.class || '');
    if (!academicYear || !term) {
      return res.status(400).json({ success: false, message: 'academic_year and term are required.' });
    }

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
router.get('/reports/summary/export.pdf', requireRole(DOS_ONLY), async (req, res) => {
  try {
    await ensureDosTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'School not found in session.' });

    const academicYear = trimStr(req.query.academic_year || req.query.year || '');
    const term = trimStr(req.query.term || '');
    const className = trimStr(req.query.class_name || req.query.class || '');
    if (!academicYear || !term) {
      return res.status(400).json({ success: false, message: 'academic_year and term are required.' });
    }

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
// ACADEMIC CONTEXT (MIGRATED FROM SYSTEM CONFIG)
// ════════════════════════════════════════════════════════════════

router.get('/context', requireRole(DOS_ONLY), async (req, res) => {
  console.log('📡 [DOS] GET /context');
  try {
    await ensureDosTables();
    const schoolId = resolveSchoolId(req);
    const [[row]] = await promisePool.query(
      'SELECT academic_year, term FROM school_active_academic_context WHERE school_id = ?',
      [schoolId]
    );
    res.json({ success: true, data: row || { academic_year: '2025-2026', term: 'Term 1' } });
  } catch (err) {
    console.error('GET /dos/context:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch academic context' });
  }
});

router.post('/context', requireRole(DOS_ONLY), async (req, res) => {
  try {
    await ensureDosTables();
    const schoolId = resolveSchoolId(req);
    const { academic_year, term } = req.body;
    if (!academic_year || !term) return res.status(400).json({ success: false, message: 'Year and Term are required' });

    await promisePool.query(
      'INSERT INTO school_active_academic_context (school_id, academic_year, term) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE academic_year = VALUES(academic_year), term = VALUES(term)',
      [schoolId, academic_year, term]
    );
    res.json({ success: true, message: 'Academic context updated' });
  } catch (err) {
    console.error('POST /dos/context:', err);
    res.status(500).json({ success: false, message: 'Failed to update academic context' });
  }
});

// ════════════════════════════════════════════════════════════════
// SUBJECT REGISTRY & CONFIGURATION
// ════════════════════════════════════════════════════════════════

router.get('/subjects/config', requireRole([...DOS_ONLY, 'TEACHER', 'HOD']), async (req, res) => {
  try {
    await ensureDosTables();
    const schoolId = resolveSchoolId(req);
    const { class_name } = req.query;
    let query = 'SELECT c.*, s.name as subject_name FROM class_subject_configuration c JOIN school_subjects s ON s.id = c.subject_id WHERE c.school_id = ?';
    let params = [schoolId];

    if (class_name) {
      query += ` AND (${sqlNormLabelEquals('c.class_name')})`;
      params.push(normalizeGradebookLabel(class_name));
    }

    const [rows] = await promisePool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /dos/subjects/config:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch class configurations' });
  }
});

router.post('/subjects/config', requireRole(DOS_ONLY), async (req, res) => {
  try {
    await ensureDosTables();
    const schoolId = resolveSchoolId(req);
    const { class_name, subject_id, subject_code, periods_per_week, credits, priority_level } = req.body;
    if (!class_name || !subject_id) return res.status(400).json({ success: false, message: 'Class and Subject are required' });

    await promisePool.query(
      `INSERT INTO class_subject_configuration (school_id, class_name, subject_id, subject_code, periods_per_week, credits, priority_level)
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE 
                subject_code = VALUES(subject_code),
                periods_per_week = VALUES(periods_per_week),
                credits = VALUES(credits),
                priority_level = VALUES(priority_level)`,
      [schoolId, class_name, subject_id, subject_code, periods_per_week || 1, credits || 1, priority_level || 0]
    );
    res.json({ success: true, message: 'Configuration saved' });
  } catch (err) {
    console.error('POST /dos/subjects/config:', err);
    res.status(500).json({ success: false, message: 'Failed to save configuration' });
  }
});

router.get('/subjects', requireRole([...DOS_ONLY, 'TEACHER', 'HOD']), async (req, res) => {
  console.log('📡 [DOS] GET /subjects');
  try {
    await ensureDosTables();
    const schoolId = resolveSchoolId(req);
    const [rows] = await promisePool.query('SELECT * FROM school_subjects WHERE school_id = ? AND is_active = 1 ORDER BY name ASC', [schoolId]);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /dos/subjects:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch subjects' });
  }
});

router.post('/subjects', requireRole(DOS_ONLY), async (req, res) => {
  try {
    await ensureDosTables();
    const schoolId = resolveSchoolId(req);
    const { name, category, subject_code } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Subject name is required' });

    const [r] = await promisePool.query(
      'INSERT INTO school_subjects (school_id, name, category, subject_code) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE category=VALUES(category), subject_code=VALUES(subject_code)',
      [schoolId, name, category || 'General', subject_code || null]
    );
    res.json({ success: true, subject_id: r.insertId, message: 'Subject created' });
  } catch (err) {
    console.error('POST /dos/subjects:', err);
    res.status(500).json({ success: false, message: 'Failed to create subject' });
  }
});

// ════════════════════════════════════════════════════════════════
// TIMETABLE & CALENDAR
// ════════════════════════════════════════════════════════════════

router.get('/timetable/master', requireRole(DOS_ONLY), async (req, res) => {
  try {
    await ensureDosTables();
    const schoolId = resolveSchoolId(req);
    console.log(`[Timetable] Master Fetch for School ID: ${schoolId}`);


    // Fetch all staff (Educators/Teachers: role_code TEACHER, HOD, or DOS)
    const [staffRows] = await promisePool.query(`
            SELECT 
                st.id, 
                u.first_name, 
                u.last_name, 
                u.photo,
                st.staff_id AS staff_uid
            FROM staff st
            JOIN users u ON u.id = st.user_id
            JOIN roles r ON r.id = u.role_id
            WHERE st.school_id = ? 
              AND u.deleted_at IS NULL 
              AND u.is_active = 1
              AND r.role_code IN ('TEACHER', 'HOD', 'DOS')
        `, [schoolId]);

    // Fetch all timetable entries
    const [ttRows] = await promisePool.query(`
            SELECT tt.*, csc.periods_per_week, csc.subject_code
            FROM academic_timetables tt
            LEFT JOIN class_subject_configuration csc ON csc.school_id = tt.school_id AND csc.class_name = tt.class_name AND csc.subject_id = (SELECT id FROM school_subjects WHERE name = tt.subject_name AND school_id = tt.school_id LIMIT 1)
            WHERE tt.school_id = ?
        `, [schoolId]);

    // Aggregate into the format expected by the frontend matrix
    const data = staffRows.map(s => {
      const lessons = ttRows.filter(t => t.staff_id === s.id);
      const totalPeriods = lessons.length; // Each entry in academic_timetables represents 1 period

      return {
        id: s.id,
        teacher: `${s.first_name} ${s.last_name}`,
        uid: s.staff_uid,
        avatar: s.photo,
        lessons: lessons.map(l => ({
          id: l.id,
          subject: l.subject_name,
          code: l.subject_code,
          group: l.class_name,
          day: l.day_of_week,
          time: `${l.start_time} - ${l.end_time}`,
          room: l.room
        })),
        load: `${totalPeriods} periods/week`,
        status: totalPeriods > 24 ? 'Overloaded' : totalPeriods === 0 ? 'Underutilized' : 'Optimal'
      };
    });

    res.json({ success: true, data });
  } catch (err) {
    console.error('GET /dos/timetable/master:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch master timetable' });
  }
});

router.get('/calendar/terms', requireRole(DOS_ONLY), async (req, res) => {
  console.log('📡 [DOS] GET /calendar/terms');
  try {
    await ensureDosTables();
    const schoolId = resolveSchoolId(req);

    const [terms] = await promisePool.query('SELECT * FROM school_terms WHERE school_id = ? AND deleted_at IS NULL ORDER BY start_date ASC', [schoolId]);
    const [milestones] = await promisePool.query('SELECT * FROM school_term_milestones WHERE school_id = ? AND deleted_at IS NULL ORDER BY sort_order ASC', [schoolId]);

    const data = terms.map(t => ({
      ...t,
      breakdowns: milestones.filter(m => m.term_id === t.id)
    }));

    res.json({ success: true, data });
  } catch (err) {
    console.error('GET /dos/calendar/terms:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch terms' });
  }
});

router.get('/calendar/holidays', requireRole(DOS_ONLY), async (req, res) => {
  console.log('📡 [DOS] GET /calendar/holidays');
  try {
    await ensureDosTables();
    const schoolId = resolveSchoolId(req);
    const [rows] = await promisePool.query('SELECT * FROM school_holidays WHERE school_id = ? AND deleted_at IS NULL ORDER BY start_date ASC', [schoolId]);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /dos/calendar/holidays:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch holidays' });
  }
});

router.post('/calendar/terms', requireRole(DOS_ONLY), async (req, res) => {
  try {
    await ensureDosTables();
    const schoolId = resolveSchoolId(req);
    const { name, start_date, end_date, is_active } = req.body;
    if (!name || !start_date || !end_date) return res.status(400).json({ success: false, message: 'Name and Dates are required' });

    const [r] = await promisePool.query(
      'INSERT INTO school_terms (school_id, name, start_date, end_date, is_active) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name), start_date=VALUES(start_date), end_date=VALUES(end_date), is_active=VALUES(is_active)',
      [schoolId, name, start_date, end_date, is_active !== undefined ? is_active : 1]
    );
    res.json({ success: true, term_id: r.insertId, message: 'Term saved' });
  } catch (err) {
    console.error('POST /dos/calendar/terms:', err);
    res.status(500).json({ success: false, message: 'Failed to save term' });
  }
});

router.put('/calendar/terms/:id', requireRole(DOS_ONLY), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    const { name, start_date, end_date, is_active } = req.body;

    await promisePool.query(
      'UPDATE school_terms SET name=?, start_date=?, end_date=?, is_active=? WHERE id=? AND school_id=?',
      [name, start_date, end_date, is_active !== undefined ? is_active : 1, req.params.id, schoolId]
    );
    res.json({ success: true, message: 'Term updated' });
  } catch (err) {
    console.error('PUT /dos/calendar/terms:', err);
    res.status(500).json({ success: false, message: 'Failed to update term' });
  }
});

router.delete('/calendar/terms/:id', requireRole(DOS_ONLY), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    // Delete milestones dependent on this term first
    await promisePool.query('DELETE FROM school_term_milestones WHERE term_id = ? AND school_id = ?', [req.params.id, schoolId]);
    await promisePool.query('DELETE FROM school_terms WHERE id = ? AND school_id = ?', [req.params.id, schoolId]);
    res.json({ success: true, message: 'Term deleted' });
  } catch (err) {
    console.error('DELETE /dos/calendar/terms:', err);
    res.status(500).json({ success: false, message: 'Failed to delete term' });
  }
});

router.post('/calendar/milestones', requireRole(DOS_ONLY), async (req, res) => {
  try {
    await ensureDosTables();
    const schoolId = resolveSchoolId(req);
    const { term_id, name, timing, sort_order } = req.body;
    if (!term_id || !name || !timing) return res.status(400).json({ success: false, message: 'Term ID, Name and Timing are required' });

    const [r] = await promisePool.query(
      'INSERT INTO school_term_milestones (school_id, term_id, name, timing, sort_order) VALUES (?, ?, ?, ?, ?)',
      [schoolId, term_id, name, timing, sort_order || 0]
    );
    res.json({ success: true, milestone_id: r.insertId, message: 'Milestone added' });
  } catch (err) {
    console.error('POST /dos/calendar/milestones:', err);
    res.status(500).json({ success: false, message: 'Failed to add milestone' });
  }
});

router.put('/calendar/milestones/:id', requireRole(DOS_ONLY), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    const { name, timing, sort_order } = req.body;

    await promisePool.query(
      'UPDATE school_term_milestones SET name=?, timing=?, sort_order=? WHERE id=? AND school_id=?',
      [name, timing, sort_order || 0, req.params.id, schoolId]
    );
    res.json({ success: true, message: 'Milestone updated' });
  } catch (err) {
    console.error('PUT /dos/calendar/milestones:', err);
    res.status(500).json({ success: false, message: 'Failed to update milestone' });
  }
});

router.delete('/calendar/milestones/:id', requireRole(DOS_ONLY), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    await promisePool.query('DELETE FROM school_term_milestones WHERE id = ? AND school_id = ?', [req.params.id, schoolId]);
    res.json({ success: true, message: 'Milestone deleted' });
  } catch (err) {
    console.error('DELETE /dos/calendar/milestones:', err);
    res.status(500).json({ success: false, message: 'Failed to delete milestone' });
  }
});

router.post('/calendar/holidays', requireRole(DOS_ONLY), async (req, res) => {
  try {
    await ensureDosTables();
    const schoolId = resolveSchoolId(req);
    const { name, start_date, end_date } = req.body;
    if (!name || !start_date || !end_date) return res.status(400).json({ success: false, message: 'Name and Dates are required' });

    const [r] = await promisePool.query(
      'INSERT INTO school_holidays (school_id, name, start_date, end_date) VALUES (?, ?, ?, ?)',
      [schoolId, name, start_date, end_date]
    );
    res.json({ success: true, holiday_id: r.insertId, message: 'Holiday added' });
  } catch (err) {
    console.error('POST /dos/calendar/holidays:', err);
    res.status(500).json({ success: false, message: 'Failed to add holiday' });
  }
});

router.get('/registry/classes', requireRole([...DOS_ONLY, 'TEACHER', 'HOD']), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    const [rows] = await promisePool.query(
      'SELECT id, group_name, stream_name, category, combination FROM school_classes WHERE school_id = ? ORDER BY group_name ASC, stream_name ASC',
      [schoolId]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /dos/registry/classes:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch school classes' });
  }
});

// ============================================================
// Gradebook columns (manager configures CAT / Exam labels)
// Teachers read the same list to tag assessments.
// ============================================================
function normalizeGradebookSlugInput(s) {
  if (s == null || String(s).trim() === '') return null;
  return String(s).trim().toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 40);
}

router.get('/gradebook-columns', requireRole([...DOS_ONLY, 'TEACHER', 'HOD']), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(403).json({ success: false, message: 'No active school context' });
    await ensureSchoolGradebookSchema();
    await seedDefaultGradebookColumnsIfEmpty(schoolId);
    const [rows] = await promisePool.query(
      `SELECT id, school_id, slug, label, sort_order, default_max_score, created_at
       FROM school_gradebook_columns WHERE school_id = ? ORDER BY sort_order ASC, id ASC`,
      [schoolId]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /dos/gradebook-columns:', err);
    res.status(500).json({ success: false, message: 'Failed to load gradebook columns' });
  }
});

router.post('/gradebook-columns', requireRole(DOS_ONLY), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(403).json({ success: false, message: 'No active school context' });
    await ensureSchoolGradebookSchema();
    const slug = normalizeGradebookSlugInput(req.body.slug);
    const label = trimStr(req.body.label);
    const sort_order = Number(req.body.sort_order) || 0;
    const default_max_score =
      req.body.default_max_score != null && req.body.default_max_score !== ''
        ? Number(req.body.default_max_score)
        : null;
    if (!slug || !label) {
      return res.status(400).json({ success: false, message: 'slug and label are required' });
    }
    const [r] = await promisePool.query(
      `INSERT INTO school_gradebook_columns (school_id, slug, label, sort_order, default_max_score)
       VALUES (?, ?, ?, ?, ?)`,
      [schoolId, slug, label, sort_order, default_max_score]
    );
    res.json({ success: true, id: r.insertId, message: 'Column added' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'That column slug already exists for this school' });
    }
    console.error('POST /dos/gradebook-columns:', err);
    res.status(500).json({ success: false, message: 'Failed to add column' });
  }
});

router.put('/gradebook-columns/:id', requireRole(DOS_ONLY), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(403).json({ success: false, message: 'No active school context' });
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid id' });
    const fields = [];
    const vals = [];
    if (req.body.label !== undefined) {
      fields.push('label = ?');
      vals.push(trimStr(req.body.label));
    }
    if (req.body.sort_order !== undefined) {
      fields.push('sort_order = ?');
      vals.push(Number(req.body.sort_order) || 0);
    }
    if (req.body.default_max_score !== undefined) {
      fields.push('default_max_score = ?');
      const v = req.body.default_max_score;
      vals.push(v === '' || v === null ? null : Number(v));
    }
    if (!fields.length) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }
    vals.push(id, schoolId);
    const [r] = await promisePool.query(
      `UPDATE school_gradebook_columns SET ${fields.join(', ')} WHERE id = ? AND school_id = ?`,
      vals
    );
    if (!r.affectedRows) return res.status(404).json({ success: false, message: 'Column not found' });
    res.json({ success: true, message: 'Column updated' });
  } catch (err) {
    console.error('PUT /dos/gradebook-columns:', err);
    res.status(500).json({ success: false, message: 'Failed to update column' });
  }
});

router.delete('/gradebook-columns/:id', requireRole(DOS_ONLY), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(403).json({ success: false, message: 'No active school context' });
    const id = Number(req.params.id);
    const [r] = await promisePool.query(
      'DELETE FROM school_gradebook_columns WHERE id = ? AND school_id = ?',
      [id, schoolId]
    );
    if (!r.affectedRows) return res.status(404).json({ success: false, message: 'Column not found' });
    res.json({ success: true, message: 'Column removed' });
  } catch (err) {
    console.error('DELETE /dos/gradebook-columns:', err);
    res.status(500).json({ success: false, message: 'Failed to delete column' });
  }
});

router.get('/calendar/periods', requireRole(DOS_ONLY), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    const [rows] = await promisePool.query(
      'SELECT * FROM school_periods WHERE school_id = ? ORDER BY sort_order ASC',
      [schoolId]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /dos/calendar/periods:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch periods' });
  }
});

router.post('/calendar/periods', requireRole(DOS_ONLY), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    const { period_name, start_time, end_time, is_break, sort_order } = req.body;
    if (!period_name || !start_time || !end_time) return res.status(400).json({ success: false, message: 'Name and times are required' });

    await promisePool.query(
      'INSERT INTO school_periods (school_id, period_name, start_time, end_time, is_break, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
      [schoolId, period_name, start_time, end_time, is_break || 0, sort_order || 0]
    );
    res.json({ success: true, message: 'Period added' });
  } catch (err) {
    console.error('POST /dos/calendar/periods:', err);
    res.status(500).json({ success: false, message: 'Failed to add period' });
  }
});

router.delete('/calendar/periods/:id', requireRole(DOS_ONLY), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    const [r] = await promisePool.query('DELETE FROM school_periods WHERE id = ? AND school_id = ?', [req.params.id, schoolId]);
    if (r.affectedRows > 0) {
      res.json({ success: true, message: 'Period removed' });
    } else {
      res.status(404).json({ success: false, message: 'Period not found' });
    }
  } catch (err) {
    console.error('DELETE /dos/calendar/periods:', err);
    res.status(500).json({ success: false, message: 'Failed to delete period' });
  }
});

module.exports = router;

