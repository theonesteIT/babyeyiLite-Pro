const express = require('express');
const { promisePool } = require('../config/database');
const {
  ensureSchoolGradebookSchema,
  seedDefaultGradebookColumnsIfEmpty,
} = require('../utils/schoolGradebookSchema');
const {
    normalizeGradebookLabel,
    sqlNormLabelEquals,
    resolveTimetableClassLabels,
} = require('../utils/gradebookLabels');

const router = express.Router();

function requireTeacherRole(req, res, next) {
    if (!req.session?.userId) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    // Specific role filtering optionally added here
    next();
}

function resolveSchoolId(req) {
    return (
        req.session?.school_id ||
        req.session?.user?.school_id ||
        req.user?.school_id ||
        null
    );
}

function resolveUserId(req) {
    return req.session?.userId || req.session?.user?.id || req.user?.id || null;
}

function getRoleCode(req) {
    return String(req.user?.role_code || req.session?.user?.role?.code || '').toUpperCase();
}

/** DOS / managers / HoD / accountant see the full school timetable; class teachers only their own periods. */
function isSchoolWideTimetableRole(req) {
    return ['SCHOOL_ADMIN', 'SCHOOL_MANAGER', 'DOS', 'HOD', 'ACCOUNTANT'].includes(getRoleCode(req));
}

/** Align with dashboards that expect Title Case statuses. */
function normalizeAttendanceStatusDb(raw) {
    const key = String(raw || '').toLowerCase().trim();
    const map = {
        present: 'Present',
        absent: 'Absent',
        late: 'Late',
        permission: 'Excused',
        excused: 'Excused',
        none: 'Absent',
        sick: 'Sick',
    };
    if (map[key]) return map[key];
    if (!raw) return 'Absent';
    const s = String(raw).trim();
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function attendanceDbToUi(dbStatus) {
    const s = String(dbStatus || '').toLowerCase();
    if (s === 'present') return 'present';
    if (s === 'absent' || s === 'sick') return 'absent';
    if (s === 'late') return 'late';
    if (s === 'excused') return 'permission';
    return 'present';
}

let teacherTablesReady = false;
async function ensureTeacherTables() {
    if (teacherTablesReady) return;

    await promisePool.query(`
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

    await promisePool.query(`
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

    await promisePool.query(`
      CREATE TABLE IF NOT EXISTS academic_attendance_records (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        log_id INT UNSIGNED NOT NULL,
        student_id INT UNSIGNED NOT NULL,
        status VARCHAR(32) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_att_rec (log_id, student_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await promisePool.query(`
      CREATE TABLE IF NOT EXISTS academic_assessments (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        school_id INT UNSIGNED NOT NULL,
        class_name VARCHAR(120) NOT NULL,
        subject_name VARCHAR(120) NOT NULL,
        assessment_name VARCHAR(120) NOT NULL,
        max_score DECIMAL(8,2) NOT NULL DEFAULT 100,
        assessment_type VARCHAR(32) DEFAULT 'TEACHER_CUSTOM',
        column_slug VARCHAR(40) NULL,
        created_by_user_id INT UNSIGNED NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_assess_school (school_id, class_name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await promisePool.query(`
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

    await ensureSchoolGradebookSchema();

    teacherTablesReady = true;
}

// Ensure middleware hook runs for routes
router.use(async (req, res, next) => {
    try {
        await ensureTeacherTables();
        next();
    } catch (e) {
        console.error('Failed to init teacher tables:', e);
        res.status(500).json({ success: false, message: 'Database initialization failed.' });
    }
});

// ============================================================
// GET /api/teacher-portal/dashboard
// ============================================================
router.get('/dashboard', requireTeacherRole, async (req, res) => {
    try {
        const schoolId = resolveSchoolId(req);
        const userId = resolveUserId(req);
        if (!schoolId) return res.status(400).json({ success: false, message: 'No school linked' });

        const [[studentCount]] = await promisePool.query('SELECT COUNT(*) as c FROM students WHERE school_id = ?', [schoolId]);

        const currentDay = new Date().toLocaleString('en-US', { weekday: 'long' });
        const scheduleSql = isSchoolWideTimetableRole(req)
            ? `SELECT subject_name as subject, class_name as \`group\`, room, CONCAT(start_time, " - ", end_time) as time
               FROM academic_timetables WHERE school_id = ? AND day_of_week = ? ORDER BY start_time ASC`
            : `SELECT subject_name as subject, class_name as \`group\`, room, CONCAT(start_time, " - ", end_time) as time
               FROM academic_timetables WHERE school_id = ? AND staff_id = ? AND day_of_week = ? ORDER BY start_time ASC`;
        const scheduleParams = isSchoolWideTimetableRole(req)
            ? [schoolId, currentDay]
            : [schoolId, userId, currentDay];
        const [todayScheduleRows] = await promisePool.query(scheduleSql, scheduleParams);

        const [[attAgg]] = await promisePool.query(
            `SELECT
               SUM(CASE WHEN LOWER(TRIM(ar.status)) IN ('present','late') THEN 1 ELSE 0 END) AS present_like,
               COUNT(*) AS total
             FROM academic_attendance_records ar
             INNER JOIN academic_attendance_logs al ON ar.log_id = al.id
             WHERE al.school_id = ? AND al.recorded_by_user_id = ? AND al.record_date = CURDATE()`,
            [schoolId, userId]
        );
        const todayPct = attAgg && attAgg.total > 0
            ? `${Math.round((100 * Number(attAgg.present_like)) / Number(attAgg.total))}%`
            : '—';

        const [[lessonsDoneRow]] = await promisePool.query(
            `SELECT COUNT(DISTINCT al.id) AS c FROM academic_attendance_logs al
             WHERE al.school_id = ? AND al.recorded_by_user_id = ? AND al.record_date = CURDATE()`,
            [schoolId, userId]
        );

        const stats = [
            { label: 'Total Classes', value: todayScheduleRows.length },
            { label: 'Active Students', value: String(studentCount?.c || 0) },
            { label: 'Today Attendance', value: todayPct },
            { label: 'Lessons Done', value: String(lessonsDoneRow?.c ?? 0) },
        ];

        res.json({ success: true, data: { stats, schedule: todayScheduleRows } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to fetch dashboard stats' });
    }
});

// ============================================================
// ============================================================
// GET /api/teacher-portal/students
// ============================================================
router.get('/students', requireTeacherRole, async (req, res) => {
    try {
        const schoolId = resolveSchoolId(req);
        if (!schoolId) return res.status(400).json({ success: false, message: 'No school linked' });

        const { class_name, date } = req.query;
        const lookupDate = date || new Date().toISOString().split('T')[0];

        let query = `
            SELECT s.*,
                   (SELECT permission_type FROM student_permissions
                    WHERE student_id = s.id AND status = 'APPROVED'
                    AND (DATE(starts_at) = ? OR DATE(ends_at) = ? OR (? BETWEEN DATE(starts_at) AND DATE(ends_at)))
                    LIMIT 1) AS active_permission,
                   COALESCE(att.pct, 0) AS attendance_pct
            FROM students s
            LEFT JOIN (
              SELECT ar.student_id,
                     ROUND(100 * SUM(CASE WHEN LOWER(TRIM(ar.status)) IN ('present','late') THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0)) AS pct
              FROM academic_attendance_records ar
              INNER JOIN academic_attendance_logs al ON ar.log_id = al.id
              WHERE al.school_id = ?
                AND al.record_date >= DATE_SUB(CURDATE(), INTERVAL 120 DAY)
              GROUP BY ar.student_id
            ) att ON att.student_id = s.id
            WHERE s.school_id = ?`;
        const params = [lookupDate, lookupDate, lookupDate, schoolId, schoolId];

        if (class_name) {
            query += ` AND (${sqlNormLabelEquals('s.class_name')})`;
            params.push(normalizeGradebookLabel(class_name));
        }

        query += ' ORDER BY s.first_name ASC LIMIT 500';
        const [rows] = await promisePool.query(query, params);

        const data = rows.map((r) => {
            const att = r.attendance_pct != null ? Number(r.attendance_pct) : 0;
            return {
                row_id: r.id,
                id: r.student_uid,
                name: `${r.first_name} ${r.last_name}`,
                grade: r.class_name || 'Unassigned',
                stream: '',
                gpa: null,
                attendance: att,
                status: r.active_permission ? 'On leave' : 'Registered',
                active_permission: r.active_permission,
                gender: r.gender || null,
                residency_status: r.residency_status || 'DAY',
                parent: r.father_full_name || 'Not provided',
                phone: r.father_phone || 'Not provided',
                email: r.father_email || 'Not provided',
                province: r.province || 'N/A',
                district: r.district || 'N/A',
                sector: r.sector || 'N/A',
                cell: r.cell || 'N/A',
                created_at: r.created_at,
            };
        });

        let male = 0;
        let female = 0;
        for (const d of data) {
            if (d.gender === 'Male') male += 1;
            else if (d.gender === 'Female') female += 1;
        }
        const withLeave = data.filter((d) => !!d.active_permission).length;

        const [[schoolAtt]] = await promisePool.query(
            `SELECT ROUND(100 * SUM(CASE WHEN LOWER(TRIM(ar.status)) IN ('present','late') THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0)) AS pct
             FROM academic_attendance_records ar
             INNER JOIN academic_attendance_logs al ON ar.log_id = al.id
             WHERE al.school_id = ? AND al.record_date >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)`,
            [schoolId]
        );
        const avgAttendance = schoolAtt && schoolAtt.pct != null ? Number(schoolAtt.pct).toFixed(1) : '0';

        const stats = {
            totalEnrolled: data.length,
            malePercent: data.length ? Math.round((male / data.length) * 100) : 0,
            femalePercent: data.length ? Math.round((female / data.length) * 100) : 0,
            avgAttendance,
            activePermissions: withLeave,
        };

        res.json({ success: true, data, stats });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to fetch students' });
    }
});

// ============================================================
// GET /api/teacher-portal/english-club/resources
// ============================================================
router.get('/english-club/resources', requireTeacherRole, (req, res) => {
    // Mocked curated resources for English Club
    const resources = [
        {
            id: 1,
            title: 'Modern Pedagogy Essentials',
            description: 'A comprehensive guide to task-based language teaching in Rwandan schools.',
            content_type: 'pdf',
            thumbnail_url: null,
            resource_url: '#'
        },
        {
            id: 2,
            title: 'Classroom Management in EFL',
            description: 'Effective strategies for maintaining engagement during large language sessions.',
            content_type: 'video',
            thumbnail_url: null,
            resource_url: '#'
        },
        {
            id: 3,
            title: 'Grammar Instruction Masterclass',
            description: 'Techniques for teaching complex tenses without losing students interest.',
            content_type: 'video',
            thumbnail_url: null,
            resource_url: '#'
        },
        {
            id: 4,
            title: 'Phonetics & Pronunciation Hub',
            description: 'Audio resources and exercises for improving students oral proficiency.',
            content_type: 'quiz',
            thumbnail_url: null,
            resource_url: '#'
        }
    ];

    const { type } = req.query;
    const filtered = type && type !== 'all' 
        ? resources.filter(r => r.content_type === type)
        : resources;

    res.json({ success: true, resources: filtered });
});

// ============================================================
// GET /api/teacher-portal/classes
// ============================================================
router.get('/classes', requireTeacherRole, async (req, res) => {
    try {
        const schoolId = resolveSchoolId(req);
        if (!schoolId) return res.status(400).json({ success: false, message: 'No school linked' });

        const [rows] = await promisePool.query(
            'SELECT DISTINCT class_name FROM students WHERE school_id = ? AND class_name IS NOT NULL AND class_name != "" ORDER BY class_name ASC', 
            [schoolId]
        );

        const classes = rows.map(r => r.class_name);
        res.json({ success: true, data: classes });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to fetch classes' });
    }
});

// ============================================================
// GET /api/teacher-portal/timetable
// ============================================================
router.get('/timetable', requireTeacherRole, async (req, res) => {
    try {
        const schoolId = resolveSchoolId(req);
        const userId = resolveUserId(req);
        if (!schoolId) return res.status(400).json({ success: false, message: 'No school linked' });

        const { day } = req.query;
        const wide = isSchoolWideTimetableRole(req);
        let query = `
            SELECT tt.id, tt.subject_name AS subject, tt.class_name AS \`group\`, tt.room,
                   CONCAT(tt.start_time, " - ", tt.end_time) AS time, tt.day_of_week AS day, tt.staff_id,
                   TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))) AS teacher_name
            FROM academic_timetables tt
            LEFT JOIN users u ON u.id = tt.staff_id
            WHERE tt.school_id = ?`;
        const params = [schoolId];

        if (!wide) {
            query += ' AND tt.staff_id = ?';
            params.push(userId);
        }

        if (day) {
            query += ' AND tt.day_of_week = ?';
            params.push(day);
        }

        query += ' ORDER BY tt.start_time ASC';
        const [rows] = await promisePool.query(query, params);

        const [regResult, stuResult] = await Promise.all([
            promisePool.query(
                'SELECT group_name, stream_name, combination FROM school_classes WHERE school_id = ?',
                [schoolId]
            ),
            promisePool.query(
                `SELECT DISTINCT class_name FROM students
                 WHERE school_id = ? AND class_name IS NOT NULL AND TRIM(class_name) <> ''`,
                [schoolId]
            ),
        ]);
        const regList = regResult[0] || [];
        const studentClassNames = (stuResult[0] || []).map((x) => x.class_name);

        const data = rows.map((row) => {
            const labels = resolveTimetableClassLabels(row.group, studentClassNames, regList);
            const base = normalizeGradebookLabel(row.group);
            let group = base;
            let roster_class_name = null;
            let class_alternatives = null;
            if (labels.length === 1) {
                group = labels[0];
                roster_class_name = labels[0];
            } else if (labels.length > 1) {
                class_alternatives = labels;
            }
            return {
                ...row,
                group,
                roster_class_name,
                class_alternatives,
            };
        });

        res.json({ success: true, data });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to fetch timetable' });
    }
});

// ============================================================
// GET /api/teacher-portal/attendance  ?timetable_id=&date=
// Returns saved roll for that period/date (if any).
// ============================================================
router.get('/attendance', requireTeacherRole, async (req, res) => {
    try {
        const schoolId = resolveSchoolId(req);
        const { timetable_id, date } = req.query;
        if (!schoolId) return res.status(400).json({ success: false, message: 'No school linked' });
        if (!timetable_id || !date) {
            return res.status(400).json({ success: false, message: 'timetable_id and date are required' });
        }

        const [logs] = await promisePool.query(
            `SELECT id FROM academic_attendance_logs
             WHERE school_id = ? AND timetable_id = ? AND record_date = ? LIMIT 1`,
            [schoolId, timetable_id, date]
        );
        if (!logs.length) {
            return res.json({ success: true, data: { log_id: null, records: [] } });
        }
        const logId = logs[0].id;
        const [recs] = await promisePool.query(
            'SELECT student_id, status FROM academic_attendance_records WHERE log_id = ?',
            [logId]
        );
        const records = recs.map((r) => ({
            student_id: r.student_id,
            status: attendanceDbToUi(r.status),
        }));
        res.json({ success: true, data: { log_id: logId, records } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to load attendance' });
    }
});

// ============================================================
// POST /api/teacher-portal/attendance
// ============================================================
router.post('/attendance', requireTeacherRole, async (req, res) => {
    const conn = await promisePool.getConnection();
    try {
        const schoolId = resolveSchoolId(req);
        const userId = resolveUserId(req);
        if (!schoolId) return res.status(400).json({ success: false, message: 'No school linked' });

        /** HoD uses the conduct portal for oversight only; period rolls are recorded by class teachers. */
        if (getRoleCode(req) === 'HOD') {
            return res.status(403).json({
                success: false,
                code: 'ATTENDANCE_RECORDING_FORBIDDEN',
                message:
                    'Head of discipline cannot record period attendance. Use the read-only attendance view for oversight.',
            });
        }

        const { timetable_id, date, records } = req.body;
        if (!timetable_id || !date || !records || !Array.isArray(records)) {
             return res.status(400).json({ success: false, message: 'Invalid specific payload format' });
        }

        await conn.beginTransaction();

        const [existing] = await conn.query(
            `SELECT id FROM academic_attendance_logs
             WHERE school_id = ? AND timetable_id = ? AND record_date = ? LIMIT 1`,
            [schoolId, timetable_id, date]
        );

        let logId;
        if (existing.length) {
            logId = existing[0].id;
            await conn.query('DELETE FROM academic_attendance_records WHERE log_id = ?', [logId]);
            await conn.query(
                'UPDATE academic_attendance_logs SET recorded_by_user_id = ? WHERE id = ?',
                [userId, logId]
            );
        } else {
            const [logRes] = await conn.query(
                'INSERT INTO academic_attendance_logs (school_id, timetable_id, record_date, recorded_by_user_id) VALUES (?, ?, ?, ?)',
                [schoolId, timetable_id, date, userId]
            );
            logId = logRes.insertId;
        }

        for (const r of records) {
            const st = normalizeAttendanceStatusDb(r.status);
            await conn.query(
               'INSERT INTO academic_attendance_records (log_id, student_id, status) VALUES (?, ?, ?)',
               [logId, r.student_id, st]
            );
        }

        await conn.commit();
        res.json({ success: true, message: 'Attendance registered successfully', data: { log_id: logId } });
    } catch (err) {
        await conn.rollback().catch(()=>{});
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to register attendance' });
    } finally {
        conn.release();
    }
});

// ============================================================
// GET /api/teacher-portal/gradebook-filters
// Distinct class + subject from this teacher's timetable (what they actually teach).
// ============================================================
router.get('/gradebook-filters', requireTeacherRole, async (req, res) => {
    try {
        const schoolId = resolveSchoolId(req);
        const userId = resolveUserId(req);
        if (!schoolId || !userId) {
            return res.status(400).json({ success: false, message: 'No school linked' });
        }
        const [ttResult, regResult, stuResult] = await Promise.all([
            promisePool.query(
                `SELECT DISTINCT class_name, subject_name
                 FROM academic_timetables
                 WHERE school_id = ? AND staff_id = ?
                 ORDER BY class_name ASC, subject_name ASC`,
                [schoolId, userId]
            ),
            promisePool.query(
                'SELECT group_name, stream_name, combination FROM school_classes WHERE school_id = ?',
                [schoolId]
            ),
            promisePool.query(
                `SELECT DISTINCT class_name FROM students
                 WHERE school_id = ? AND class_name IS NOT NULL AND TRIM(class_name) <> ''`,
                [schoolId]
            ),
        ]);
        const rows = ttResult[0] || [];
        const regList = regResult[0] || [];
        const studentClassNames = (stuResult[0] || []).map((x) => x.class_name);

        const seen = new Set();
        const pairs = [];
        for (const r of rows) {
            const subject_name = normalizeGradebookLabel(r.subject_name);
            if (!subject_name) continue;
            const resolvedClasses = resolveTimetableClassLabels(
                r.class_name,
                studentClassNames,
                regList
            );
            for (const class_name of resolvedClasses) {
                const cn = normalizeGradebookLabel(class_name);
                if (!cn) continue;
                const key = `${cn}\0${subject_name}`;
                if (seen.has(key)) continue;
                seen.add(key);
                pairs.push({ class_name: cn, subject_name });
            }
        }
        pairs.sort(
            (a, b) =>
                a.class_name.localeCompare(b.class_name) || a.subject_name.localeCompare(b.subject_name)
        );
        res.json({
            success: true,
            data: {
                pairs,
                from_timetable: pairs.length > 0,
            },
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to load gradebook filters' });
    }
});

// ============================================================
// GET /api/teacher-portal/gradebook-matrix
// class_name + subject_name → students + aggregated scores per column_slug
// ============================================================
router.get('/gradebook-matrix', requireTeacherRole, async (req, res) => {
    try {
        const schoolId = resolveSchoolId(req);
        if (!schoolId) return res.status(400).json({ success: false, message: 'No school linked' });

        const class_name = normalizeGradebookLabel(req.query.class_name);
        const subject_name = normalizeGradebookLabel(req.query.subject_name);
        if (!class_name || !subject_name) {
            return res.status(400).json({ success: false, message: 'class_name and subject_name required' });
        }

        await seedDefaultGradebookColumnsIfEmpty(schoolId);
        const [columns] = await promisePool.query(
            `SELECT id, slug, label, sort_order, default_max_score
             FROM school_gradebook_columns WHERE school_id = ? ORDER BY sort_order ASC, id ASC`,
            [schoolId]
        );

        const [students] = await promisePool.query(
            `SELECT id, student_uid, first_name, last_name, gender, class_name
             FROM students
             WHERE school_id = ? AND (${sqlNormLabelEquals('class_name')})
             ORDER BY first_name ASC, last_name ASC`,
            [schoolId, class_name]
        );

        const [agg] = await promisePool.query(
            `SELECT m.student_id, a.column_slug AS slug,
                    SUM(m.score_obtained) AS score_sum
             FROM academic_marks m
             INNER JOIN academic_assessments a ON a.id = m.assessment_id AND a.school_id = m.school_id
             WHERE m.school_id = ?
               AND (${sqlNormLabelEquals('a.class_name')})
               AND (${sqlNormLabelEquals('a.subject_name')})
               AND a.column_slug IS NOT NULL AND TRIM(a.column_slug) <> ''
             GROUP BY m.student_id, a.column_slug`,
            [schoolId, class_name, subject_name]
        );

        const scoreMap = {};
        for (const row of agg) {
            const key = `${row.student_id}:${row.slug}`;
            scoreMap[key] = Number(row.score_sum);
        }

        const matrix = students.map((s) => {
            const scores = {};
            for (const col of columns) {
                const k = `${s.id}:${col.slug}`;
                scores[col.slug] = Object.prototype.hasOwnProperty.call(scoreMap, k) ? scoreMap[k] : null;
            }
            return {
                student_id: s.id,
                student_uid: s.student_uid,
                name: `${s.first_name} ${s.last_name}`.trim(),
                gender: s.gender,
                scores,
            };
        });

        let student_class_name = null;
        if (students.length > 0) {
            const raw = students[0].class_name;
            if (raw != null && String(raw).trim() !== class_name) {
                student_class_name = String(raw).trim();
            }
        }

        res.json({
            success: true,
            data: {
                columns,
                students: matrix,
                class_name,
                subject_name,
                student_class_name,
            },
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to load gradebook matrix' });
    }
});

// ============================================================
// GET /api/teacher-portal/gradebook-assessments
// ============================================================
router.get('/gradebook-assessments', requireTeacherRole, async (req, res) => {
    try {
        const schoolId = resolveSchoolId(req);
        if (!schoolId) return res.status(400).json({ success: false, message: 'No school linked' });
        const class_name = normalizeGradebookLabel(req.query.class_name);
        const subject_name = normalizeGradebookLabel(req.query.subject_name);
        if (!class_name || !subject_name) {
            return res.status(400).json({ success: false, message: 'class_name and subject_name required' });
        }
        const [rows] = await promisePool.query(
            `SELECT id, assessment_name, max_score, column_slug, assessment_type, created_at
             FROM academic_assessments
             WHERE school_id = ?
              AND (${sqlNormLabelEquals('class_name')})
              AND (${sqlNormLabelEquals('subject_name')})
             ORDER BY created_at DESC, id DESC`,
            [schoolId, class_name, subject_name]
        );
        res.json({ success: true, data: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to list assessments' });
    }
});

// ============================================================
// POST /api/teacher-portal/assessments
// body: column_slug optional — ties marks to a gradebook column (CAT 1, Exam, …)
// ============================================================
router.post('/assessments', requireTeacherRole, async (req, res) => {
    try {
        const schoolId = resolveSchoolId(req);
        const userId = resolveUserId(req);
        if (!schoolId) return res.status(400).json({ success: false, message: 'No school linked' });

        const { class_name: rawClass, subject_name: rawSubj, assessment_name, max_score, column_slug } = req.body;
        const class_name = normalizeGradebookLabel(rawClass);
        const subject_name = normalizeGradebookLabel(rawSubj);
        if (!class_name || !subject_name || !assessment_name) {
            return res.status(400).json({ success: false, message: 'Missing fields' });
        }

        const slug = column_slug != null && String(column_slug).trim() !== ''
            ? String(column_slug).trim().toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 40)
            : null;

        const [r] = await promisePool.query(
            `INSERT INTO academic_assessments
             (school_id, class_name, subject_name, assessment_name, max_score, assessment_type, column_slug, created_by_user_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                schoolId,
                class_name,
                subject_name,
                assessment_name,
                max_score || 100,
                'TEACHER_CUSTOM',
                slug,
                userId,
            ]
        );

        res.json({ success: true, assessment_id: r.insertId, message: 'Assessment created' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to create assessment' });
    }
});

// ============================================================
// POST /api/teacher-portal/marks
// ============================================================
router.post('/marks', requireTeacherRole, async (req, res) => {
    try {
        const schoolId = resolveSchoolId(req);
        const userId = resolveUserId(req);
        if (!schoolId) return res.status(400).json({ success: false, message: 'No school linked' });

        const { assessment_id, marks } = req.body;
        if (!assessment_id || !marks || !Array.isArray(marks)) {
             return res.status(400).json({ success: false, message: 'Invalid payload format' });
        }

        for (const m of marks) {
             await promisePool.query(
                 'INSERT INTO academic_marks (school_id, assessment_id, student_id, score_obtained, recorded_by_user_id) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE score_obtained = VALUES(score_obtained)',
                 [schoolId, assessment_id, m.student_id, m.value, userId]
             );
        }

        res.json({ success: true, message: 'Marks saved successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to record marks' });
    }
});

// ═══════════════════════════════════════════════════════════════
// REQUISITIONS (staff submit — same school_requisitions as accountant)
//   GET  /api/teacher-portal/requisitions  — rows created by this user
//   POST /api/teacher-portal/requisitions — new pending request
// ═══════════════════════════════════════════════════════════════

let teacherReqTableReady = false;
async function ensureTeacherRequisitionsTable() {
    if (teacherReqTableReady) return;
    await promisePool.query(`
    CREATE TABLE IF NOT EXISTS school_requisitions (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      req_code VARCHAR(40) NOT NULL,
      dept VARCHAR(120) NOT NULL,
      requester VARCHAR(180) NOT NULL,
      items TEXT NOT NULL,
      amount DECIMAL(14,2) NOT NULL DEFAULT 0,
      submitted_date DATE NOT NULL,
      status ENUM('pending','approved','rejected','issued') NOT NULL DEFAULT 'pending',
      attachment_name VARCHAR(255) NULL,
      note TEXT NULL,
      created_by_user_id INT UNSIGNED NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      approved_by_user_id INT UNSIGNED NULL,
      approved_at DATETIME NULL,
      INDEX idx_sr_school (school_id),
      INDEX idx_sr_status (status),
      INDEX idx_sr_creator (school_id, created_by_user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
    try {
        await promisePool.query(`
      ALTER TABLE school_requisitions
      MODIFY COLUMN status ENUM('pending','approved','rejected','issued') NOT NULL DEFAULT 'pending'
    `);
    } catch (_) { /* already migrated */ }
    teacherReqTableReady = true;
}

function trimReqStr(v) {
    if (v === undefined || v === null) return '';
    return String(v).trim();
}

router.get('/requisitions', requireTeacherRole, async (req, res) => {
    try {
        const schoolId = resolveSchoolId(req);
        const userId = resolveUserId(req);
        if (!schoolId || !userId) {
            return res.status(400).json({ success: false, message: 'School or user not found in session.' });
        }
        await ensureTeacherRequisitionsTable();
        const [rows] = await promisePool.query(
            `SELECT id, req_code, dept, requester, items, amount, submitted_date, status, attachment_name, note
       FROM school_requisitions
       WHERE school_id = ? AND created_by_user_id = ?
       ORDER BY submitted_date DESC, id DESC
       LIMIT 200`,
            [schoolId, userId]
        );
        const data = rows.map((r) => ({
            id: r.req_code || `REQ-${String(r.id).padStart(4, '0')}`,
            db_id: r.id,
            dept: r.dept,
            requester: r.requester,
            items: r.items,
            amount: Number(r.amount || 0),
            submitted: r.submitted_date,
            status: r.status,
            attachmentName: r.attachment_name || '',
            note: r.note || '',
        }));
        return res.json({ success: true, data });
    } catch (err) {
        console.error('GET /teacher-portal/requisitions:', err);
        return res.status(500).json({ success: false, message: 'Failed to load requisitions' });
    }
});

router.post('/requisitions', requireTeacherRole, async (req, res) => {
    try {
        const schoolId = resolveSchoolId(req);
        const userId = resolveUserId(req);
        if (!schoolId || !userId) {
            return res.status(400).json({ success: false, message: 'School or user not found in session.' });
        }
        await ensureTeacherRequisitionsTable();
        const body = req.body || {};
        const u = req.session?.user || {};
        const defaultName = [u.first_name, u.last_name].filter(Boolean).join(' ').trim() || u.full_name || u.email || 'Staff';
        const dept = trimReqStr(body.dept);
        const requester = trimReqStr(body.requester) || defaultName;
        const items = trimReqStr(body.items);
        const amount = Number(body.amount);
        const submitted = trimReqStr(body.submitted) || new Date().toISOString().slice(0, 10);
        if (!dept || !items || Number.isNaN(amount) || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'dept, items and a positive amount are required.',
            });
        }
        const [[cnt]] = await promisePool.query('SELECT COUNT(*) AS c FROM school_requisitions WHERE school_id = ?', [schoolId]);
        const reqCode = `REQ-${String(Number(cnt?.c || 0) + 1001)}`;
        const [ins] = await promisePool.query(
            `INSERT INTO school_requisitions
         (school_id, req_code, dept, requester, items, amount, submitted_date, status, attachment_name, note, created_by_user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)`,
            [
                schoolId,
                reqCode,
                dept,
                requester,
                items,
                amount,
                submitted,
                trimReqStr(body.attachmentName) || null,
                trimReqStr(body.note) || null,
                userId,
            ]
        );
        return res.status(201).json({ success: true, data: { id: ins.insertId, req_code: reqCode } });
    } catch (err) {
        console.error('POST /teacher-portal/requisitions:', err);
        return res.status(500).json({ success: false, message: 'Failed to create requisition' });
    }
});

module.exports = router;
