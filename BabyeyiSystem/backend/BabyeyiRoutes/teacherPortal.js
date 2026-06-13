const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { promisePool } = require('../config/database');
const {
  ensureSchoolGradebookSchema,
  seedDefaultGradebookColumnsIfEmpty,
} = require('../utils/schoolGradebookSchema');
const { ensureSchoolMarksAcademicTables } = require('../utils/schoolMarksAcademicSchema');
const { ensureAcademicMarksSchemaIntegrity } = require('../utils/academicMarksSchemaRepair');
const { loadSchoolAcademicCalendar } = require('../utils/schoolAcademicCalendar');
const {
    ensureTeacherAssignmentsTable,
    fetchSchoolAcademicContext,
    fetchTeachingAssignmentsForTeacher,
    syncTeachingAssignmentsFromTimetable,
    teacherHasAssignment: schemaTeacherHasAssignment,
    resolveAssignmentIdForTeacher,
} = require('../utils/teacherAssignmentsSchema');
const {
    normalizeGradebookLabel,
    sqlNormLabelEquals,
    sqlNormColumnsEqual,
    resolveTimetableClassLabels,
    collectSchoolRegisteredClassNames,
} = require('../utils/gradebookLabels');
const {
    ensureCompetencyTables,
    listCompetencyCategories,
    RATING_LEVELS,
} = require('../utils/competencySchema');
const { notifyStudentParentsMarks } = require('./parentStudentNotifications');
const { markCodeLabel } = require('../utils/parentStudentMarks');

const accountantFeesRoutes = require('./accountantFees');

const router = express.Router();
const USSD_AUTO_APPROVAL_RATIO = 0.4;
const USSD_SESSION_TTL_MINUTES = Math.max(5, Number(process.env.TEACHER_USSD_SESSION_TTL_MINUTES || 30));

function requireTeacherRole(req, res, next) {
    if (!req.session?.userId) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    // Specific role filtering optionally added here
    next();
}

function resolveSchoolId(req) {
    return (
        req.query?.school_id ||
        req.body?.school_id ||
        req.session?.school_id ||
        req.session?.user?.school_id ||
        req.user?.school_id ||
        null
    );
}

function resolveUserId(req) {
    return req.session?.userId || req.session?.user?.id || req.user?.id || null;
}

function queueMarksParentNotify({
    schoolId, userId, studentId, assessment, score, maxScore, markCodeLabel: codeLabel,
}) {
    setImmediate(async () => {
        try {
            const sid = Number(studentId);
            if (!sid || !assessment) return;
            const [[schoolRow]] = await promisePool.query(
                'SELECT school_name FROM schools WHERE id = ? LIMIT 1',
                [schoolId],
            );
            const [[teacherRow]] = await promisePool.query(
                'SELECT first_name, last_name FROM users WHERE id = ? LIMIT 1',
                [userId],
            );
            const [[stu]] = await promisePool.query(
                'SELECT first_name, last_name, student_uid, student_code FROM students WHERE id = ? LIMIT 1',
                [sid],
            );
            const teacherName = `${teacherRow?.first_name || ''} ${teacherRow?.last_name || ''}`.trim() || 'Teacher';
            const studentName = `${stu?.first_name || ''} ${stu?.last_name || ''}`.trim() || 'Student';
            const studentRef = stu?.student_code || stu?.student_uid || String(sid);
            await notifyStudentParentsMarks(sid, {
                studentName,
                schoolName: schoolRow?.school_name || 'School',
                subject: assessment.subject_name,
                assessmentName: assessment.assessment_name,
                score: score != null ? Number(score) : null,
                maxScore: maxScore != null ? Number(maxScore) : Number(assessment.max_score) || 100,
                markCodeLabel: codeLabel || null,
                teacherName,
                studentRef,
                schoolId,
                assessmentId: assessment.id,
            });
        } catch (e) {
            console.warn('[marks-cell/parent-notify]', e.message);
        }
    });
}

function hashToken(raw) {
    return crypto.createHash('sha256').update(String(raw || ''), 'utf8').digest('hex');
}

function readBearerToken(req) {
    const auth = String(req.headers?.authorization || '').trim();
    if (auth.toLowerCase().startsWith('bearer ')) return auth.slice(7).trim();
    return '';
}

function toMoney(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
}

function parseJsonList(raw) {
    if (Array.isArray(raw)) return raw;
    if (typeof raw !== 'string' || !raw.trim()) return [];
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
        return [];
    }
}

let classTeacherAssignmentsReady = false;
async function ensureClassTeacherAssignmentsTable() {
    if (classTeacherAssignmentsReady) return;
    await promisePool.query(`
      CREATE TABLE IF NOT EXISTS class_teacher_assignments (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        school_id INT UNSIGNED NOT NULL,
        class_name VARCHAR(120) NOT NULL,
        teacher_user_id INT UNSIGNED NOT NULL,
        academic_year VARCHAR(64) NULL,
        assigned_by_user_id INT UNSIGNED NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_cta_school_class (school_id, class_name),
        KEY idx_cta_teacher (school_id, teacher_user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    classTeacherAssignmentsReady = true;
}

let academicMarksExtrasReady = false;
async function ensureAcademicMarksExtras() {
    if (academicMarksExtrasReady) return;
    const alters = [
        ['academic_assessments', 'assessment_date', 'DATE NULL'],
        ['academic_assessments', 'description', 'VARCHAR(500) NULL'],
        ['academic_assessments', 'status', "VARCHAR(20) NOT NULL DEFAULT 'published'"],
        ['academic_assessments', 'teacher_assignment_id', 'INT UNSIGNED NULL'],
        ['academic_assessments', 'term', 'VARCHAR(32) NULL'],
        ['academic_assessments', 'academic_year', 'VARCHAR(32) NULL'],
        ['academic_marks', 'mark_code', 'VARCHAR(4) NULL'],
    ];
    for (const [table, col, def] of alters) {
        try {
            await promisePool.query(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`);
        } catch (e) {
            if (e.code !== 'ER_DUP_FIELDNAME') throw e;
        }
    }
    try {
        await promisePool.query('ALTER TABLE academic_marks MODIFY score_obtained DECIMAL(8,2) NULL');
    } catch (_) { /* already nullable */ }
    await ensureAcademicMarksSchemaIntegrity();
    academicMarksExtrasReady = true;
}

function letterGradeFromPercent(pct) {
    if (pct == null || !Number.isFinite(pct)) return null;
    if (pct >= 80) return 'A';
    if (pct >= 70) return 'B';
    if (pct >= 60) return 'C';
    if (pct >= 50) return 'D';
    return 'F';
}

async function fetchSchoolAcademicYear(schoolId) {
    try {
        const [rows] = await promisePool.query(
            `SELECT setting_value FROM school_settings
             WHERE school_id = ? AND setting_key = 'current_academic_year' LIMIT 1`,
            [schoolId]
        );
        if (rows[0]?.setting_value) return String(rows[0].setting_value).trim();
    } catch (_) { /* ignore */ }
    const y = new Date().getFullYear();
    return `${y}-${y + 1}`;
}

async function fetchActiveAssessmentTypes(schoolId) {
    await ensureSchoolMarksAcademicTables();
    await seedDefaultGradebookColumnsIfEmpty(schoolId);
    const [rows] = await promisePool.query(
        `SELECT sat.id, sat.name, sat.slug, sat.weight_percent, sat.sort_order, sat.is_active,
                sgc.default_max_score
         FROM school_assessment_types sat
         LEFT JOIN school_gradebook_columns sgc ON sgc.school_id = sat.school_id AND sgc.slug = sat.slug
         WHERE sat.school_id = ? AND sat.is_active = 1 AND sat.school_level IN ('ALL')
         ORDER BY sat.sort_order ASC, sat.id ASC`,
        [schoolId]
    );
    return rows;
}

async function fetchTeacherAssignmentPairsLegacy(schoolId, userId) {
    const [ttResult, regResult, stuResult, assignResult] = await Promise.all([
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
        promisePool.query(
            `SELECT DISTINCT class_name, subject_name
             FROM timetable_assignments
             WHERE school_id = ? AND teacher_user_id = ?
               AND TRIM(IFNULL(subject_name, '')) <> ''
               AND LOWER(TRIM(subject_name)) NOT IN ('class teacher', 'class_teacher')`,
            [schoolId, userId]
        ).catch(() => [[], []]),
    ]);
    const regList = regResult[0] || [];
    const studentClassNames = (stuResult[0] || []).map((x) => x.class_name);
    const seen = new Set();
    const pairs = [];
    const allRows = [...(ttResult[0] || []), ...(assignResult[0] || [])];
    for (const r of allRows) {
        const subject_name = normalizeGradebookLabel(r.subject_name);
        if (!subject_name) continue;
        const resolvedClasses = resolveTimetableClassLabels(r.class_name, studentClassNames, regList);
        for (const class_name of resolvedClasses) {
            const cn = normalizeGradebookLabel(class_name);
            if (!cn) continue;
            const key = `${cn.toLowerCase()}|${subject_name.toLowerCase()}`;
            if (seen.has(key)) continue;
            seen.add(key);
            pairs.push({ class_name: cn, subject_name });
        }
    }
    pairs.sort((a, b) => a.class_name.localeCompare(b.class_name) || a.subject_name.localeCompare(b.subject_name));
    return pairs;
}

async function fetchTeacherAssignmentPairs(schoolId, userId, { academicYear = null, term = null } = {}) {
    await ensureTeacherAssignmentsTable();
    let permanent = await fetchTeachingAssignmentsForTeacher(schoolId, userId, { academicYear, term });
    if (!permanent.length) {
        await syncTeachingAssignmentsFromTimetable(schoolId).catch(() => {});
        permanent = await fetchTeachingAssignmentsForTeacher(schoolId, userId, { academicYear, term });
    }
    if (permanent.length) {
        return permanent.map((a) => ({
            class_name: a.class_name,
            subject_name: a.subject_name,
            assignment_id: a.id,
            academic_year: a.academic_year,
            term: a.term,
        }));
    }
    return fetchTeacherAssignmentPairsLegacy(schoolId, userId);
}

/** Homeroom / class-teacher classes only (DOS Class Teachers assignment). */
async function fetchTeacherClassTeacherClassNames(schoolId, teacherUserId) {
    await ensureClassTeacherAssignmentsTable();
    const [ctaRows] = await promisePool.query(
        `SELECT DISTINCT class_name
         FROM class_teacher_assignments
         WHERE school_id = ?
           AND teacher_user_id = ?
           AND class_name IS NOT NULL
           AND TRIM(class_name) <> ''
         ORDER BY class_name ASC`,
        [schoolId, teacherUserId],
    );
    return (ctaRows || [])
        .map((r) => normalizeGradebookLabel(r.class_name))
        .filter(Boolean);
}

/** Class names for subject teaching: DOS teacher_assignments + timetable legacy (+ homeroom). */
async function fetchTeacherAssignedClassNames(schoolId, teacherUserId, { academicYear = null, term = null } = {}) {
    await ensureClassTeacherAssignmentsTable();
    const classSet = new Set();

    const pairs = await fetchTeacherAssignmentPairs(schoolId, teacherUserId, { academicYear, term });
    for (const p of pairs) {
        const cn = normalizeGradebookLabel(p.class_name);
        if (cn) classSet.add(cn);
    }

    for (const cn of await fetchTeacherClassTeacherClassNames(schoolId, teacherUserId)) {
        classSet.add(cn);
    }

    return [...classSet].sort((a, b) => a.localeCompare(b));
}

function assignmentPairKey(class_name, subject_name) {
    return `${normalizeGradebookLabel(class_name).toLowerCase()}|${normalizeGradebookLabel(subject_name).toLowerCase()}`;
}

async function teacherHasAssignment(schoolId, userId, class_name, subject_name, assignmentId = null) {
    return schemaTeacherHasAssignment(schoolId, userId, class_name, subject_name, {
        assignmentId: assignmentId || null,
    });
}

function shortAssessmentLabel(name, index, columnSlug) {
    const slug = String(columnSlug || '').toLowerCase();
    const slugLabels = {
        homework: 'HW',
        quiz: 'QZ',
        cat: 'CAT',
        project: 'PRJ',
        practical: 'PRC',
        mid_term: 'MID',
        end_term: 'FIN',
    };
    if (slug && slugLabels[slug]) {
        return `${slugLabels[slug]}${index + 1}`;
    }
    let n = String(name || '').trim();
    n = n.replace(/^\[demo\]\s*/i, '').replace(/^term\s+\d+\s+/i, '');
    if (n.length <= 8) return n || `A${index + 1}`;
    const parts = n.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
        const label = `${parts[0].slice(0, 3)}${parts[parts.length - 1].slice(0, 3)}`;
        return label.length <= 8 ? label : label.slice(0, 8);
    }
    return n.slice(0, 8);
}

async function computeStudentSubjectAverage(schoolId, class_name, subject_name, studentId, typeWeights) {
    const [marksRows] = await promisePool.query(
        `SELECT m.score_obtained, m.mark_code, a.max_score, a.column_slug
         FROM academic_marks m
         INNER JOIN academic_assessments a ON a.id = m.assessment_id AND a.school_id = m.school_id
         WHERE m.school_id = ? AND m.student_id = ?
           AND (${sqlNormLabelEquals('a.class_name')})
           AND (${sqlNormLabelEquals('a.subject_name')})
           AND a.column_slug IS NOT NULL AND TRIM(a.column_slug) <> ''`,
        [schoolId, studentId, class_name, subject_name]
    );
    const bySlug = {};
    for (const r of marksRows) {
        if (r.mark_code) continue;
        const slug = String(r.column_slug).toLowerCase();
        if (!bySlug[slug]) bySlug[slug] = { sum: 0, max: 0 };
        bySlug[slug].sum += Number(r.score_obtained) || 0;
        bySlug[slug].max += Number(r.max_score) || 0;
    }
    let weighted = 0;
    let usedWeight = 0;
    for (const t of typeWeights) {
        const slug = String(t.slug).toLowerCase();
        const bucket = bySlug[slug];
        if (!bucket || bucket.max <= 0) continue;
        const pct = (bucket.sum / bucket.max) * 100;
        const w = Number(t.weight_percent) || 0;
        weighted += (pct * w) / 100;
        usedWeight += w;
    }
    if (usedWeight <= 0) return null;
    return Math.round(weighted * 10) / 10;
}

function buildWeightedSummary(students, columns, typeWeights) {
    const weightMap = {};
    let totalConfiguredWeight = 0;
    for (const t of typeWeights) {
        weightMap[t.slug] = Number(t.weight_percent) || 0;
        totalConfiguredWeight += Number(t.weight_percent) || 0;
    }
    return students.map((s) => {
        let weighted = 0;
        const category_breakdown = {};
        for (const col of columns) {
            const slug = col.slug;
            const pct = s.category_percent?.[slug];
            const w = weightMap[slug] || 0;
            if (pct != null && w > 0) {
                weighted += (pct * w) / 100;
                category_breakdown[slug] = { percent: Math.round(pct * 100) / 100, weight_percent: w };
            }
        }
        const finalPct = totalConfiguredWeight > 0 ? Math.round(weighted * 100) / 100 : null;
        return {
            ...s,
            category_breakdown,
            weighted_average: finalPct,
            grade: letterGradeFromPercent(finalPct),
        };
    });
}

let avanceUssdTablesReady = false;
async function ensureTeacherAvanceUssdTables() {
    if (avanceUssdTablesReady) return;
    await promisePool.query(`
      CREATE TABLE IF NOT EXISTS teacher_avance_ussd_sessions (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        token_hash CHAR(64) NOT NULL,
        teacher_user_id INT UNSIGNED NOT NULL,
        school_id INT UNSIGNED NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        last_used_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        expires_at DATETIME NOT NULL,
        revoked_at DATETIME NULL,
        UNIQUE KEY uq_teacher_ussd_token_hash (token_hash),
        KEY idx_teacher_ussd_actor (teacher_user_id, school_id),
        KEY idx_teacher_ussd_expiry (expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await promisePool.query(`
      CREATE TABLE IF NOT EXISTS shule_avance_requests (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        school_id INT UNSIGNED NOT NULL,
        teacher_user_id INT UNSIGNED NOT NULL,
        amount_rwf DECIMAL(14,2) NOT NULL,
        purpose TEXT NOT NULL,
        repayment_term_months INT UNSIGNED NOT NULL,
        vendor_label VARCHAR(160) NULL,
        details TEXT NULL,
        invoice_file_name VARCHAR(255) NULL,
        status VARCHAR(40) NOT NULL DEFAULT 'pending_accountant',
        accountant_note TEXT NULL,
        manager_feedback TEXT NULL,
        submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        accountant_reviewed_at DATETIME NULL,
        accountant_reviewed_by INT UNSIGNED NULL,
        manager_reviewed_at DATETIME NULL,
        manager_reviewed_by INT UNSIGNED NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        request_type VARCHAR(20) NOT NULL DEFAULT 'service',
        service_category VARCHAR(64) NULL,
        cashout_reason TEXT NULL,
        cashout_category_slug VARCHAR(64) NULL,
        deal_product_ids_json TEXT NULL,
        deal_products_snapshot_json LONGTEXT NULL,
        deal_products_total_rwf DECIMAL(14,2) NULL,
        KEY idx_sa_school (school_id),
        KEY idx_sa_teacher (teacher_user_id),
        KEY idx_sa_status (status),
        KEY idx_sa_submitted (submitted_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    const cols = [
        ['cashout_month_key', 'VARCHAR(7) NULL'],
        ['net_salary_baseline_rwf', 'DECIMAL(14,2) NULL'],
        ['auto_approval_limit_rwf', 'DECIMAL(14,2) NULL'],
        ['monthly_requested_total_rwf', 'DECIMAL(14,2) NULL'],
        ['monthly_remaining_net_rwf', 'DECIMAL(14,2) NULL'],
        ['auto_approved', 'TINYINT(1) NOT NULL DEFAULT 0'],
        ['auto_approved_at', 'DATETIME NULL'],
    ];
    for (const [name, def] of cols) {
        try {
            await promisePool.query(`ALTER TABLE shule_avance_requests ADD COLUMN ${name} ${def}`);
        } catch (e) {
            if (e.code !== 'ER_DUP_FIELDNAME') {
                console.warn(`[teacher-portal/ussd] ALTER add ${name}:`, e.message);
            }
        }
    }
    avanceUssdTablesReady = true;
}

async function getTeacherNetSalaryFromStaff(schoolId, userId) {
    const [[row]] = await promisePool.query(
        `SELECT payroll_basic_salary, payroll_transport_allowance, payroll_housing_allowance,
                payroll_meal_allowance, payroll_other_allowances, payroll_tax_percent,
                payroll_pension_amount, payroll_other_deductions
         FROM staff
         WHERE school_id = ? AND user_id = ?
         LIMIT 1`,
        [schoolId, userId]
    );
    if (!row) return 0;
    const basic = toMoney(row.payroll_basic_salary);
    const allowances =
        toMoney(row.payroll_transport_allowance) +
        toMoney(row.payroll_housing_allowance) +
        toMoney(row.payroll_meal_allowance) +
        parseJsonList(row.payroll_other_allowances).reduce((sum, item) => sum + toMoney(item?.amount), 0);
    const gross = basic + allowances;
    const tax = (gross * toMoney(row.payroll_tax_percent)) / 100;
    const pension = toMoney(row.payroll_pension_amount);
    const others = parseJsonList(row.payroll_other_deductions).reduce((sum, item) => sum + toMoney(item?.amount), 0);
    return Math.max(0, gross - tax - pension - others);
}

function monthKeyNow() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
}

async function getTeacherMonthlyCashoutPolicy(schoolId, userId, netSalary, monthKey = monthKeyNow()) {
    const [rows] = await promisePool.query(
        `SELECT
            COALESCE(
              MIN(
                CASE
                  WHEN COALESCE(cashout_month_key, DATE_FORMAT(submitted_at, '%Y-%m')) = ?
                  THEN net_salary_baseline_rwf
                  ELSE NULL
                END
              ),
              0
            ) AS baseline_snapshot,
            COALESCE(
              SUM(
                CASE
                  WHEN COALESCE(cashout_month_key, DATE_FORMAT(submitted_at, '%Y-%m')) = ?
                   AND LOWER(COALESCE(status, '')) NOT IN ('rejected_by_accountant', 'rejected_by_manager', 'cancelled')
                  THEN amount_rwf
                  ELSE 0
                END
              ),
              0
            ) AS monthly_requested_total,
            COALESCE(
              SUM(
                CASE
                  WHEN COALESCE(cashout_month_key, DATE_FORMAT(submitted_at, '%Y-%m')) = ?
                   AND auto_approved = 1
                   AND LOWER(COALESCE(status, '')) NOT IN ('rejected_by_accountant', 'rejected_by_manager', 'cancelled')
                  THEN amount_rwf
                  ELSE 0
                END
              ),
              0
            ) AS monthly_auto_approved_total
         FROM shule_avance_requests
         WHERE school_id = ? AND teacher_user_id = ? AND request_type = 'cashout'`,
        [monthKey, monthKey, monthKey, schoolId, userId]
    );
    const stats = rows?.[0] || {};
    const baseline = Math.max(0, toMoney(stats.baseline_snapshot) || toMoney(netSalary));
    const autoApprovalLimit = Math.floor(baseline * USSD_AUTO_APPROVAL_RATIO);
    const monthlyRequestedTotal = toMoney(stats.monthly_requested_total);
    const monthlyAutoApprovedTotal = toMoney(stats.monthly_auto_approved_total);
    return {
        month_key: monthKey,
        baseline_net_salary: Math.round(baseline),
        monthly_requested_total: Math.round(monthlyRequestedTotal),
        monthly_remaining_net: Math.max(0, Math.round(baseline - monthlyRequestedTotal)),
        auto_approval_ratio: USSD_AUTO_APPROVAL_RATIO,
        auto_approval_limit: autoApprovalLimit,
        auto_approval_used: Math.round(monthlyAutoApprovedTotal),
        auto_approval_remaining: Math.max(0, Math.round(autoApprovalLimit - monthlyAutoApprovedTotal)),
    };
}

async function requireUssdTeacherSession(req, res, next) {
    try {
        await ensureTeacherAvanceUssdTables();
        const token =
            String(req.body?.access_token || req.query?.access_token || readBearerToken(req) || '').trim();
        if (!token) {
            return res.status(401).json({ success: false, message: 'access_token is required' });
        }
        const tokenHash = hashToken(token);
        const [[sessionRow]] = await promisePool.query(
            `SELECT id, teacher_user_id, school_id, expires_at, revoked_at
             FROM teacher_avance_ussd_sessions
             WHERE token_hash = ?
             LIMIT 1`,
            [tokenHash]
        );
        if (!sessionRow || sessionRow.revoked_at) {
            return res.status(401).json({ success: false, message: 'Invalid session token' });
        }
        if (new Date(sessionRow.expires_at) <= new Date()) {
            return res.status(401).json({ success: false, message: 'Session token expired. Login again.' });
        }
        await promisePool.query(
            `UPDATE teacher_avance_ussd_sessions
             SET last_used_at = NOW()
             WHERE id = ?`,
            [sessionRow.id]
        );
        req.ussdAuth = {
            sessionId: Number(sessionRow.id),
            userId: Number(sessionRow.teacher_user_id),
            schoolId: Number(sessionRow.school_id),
        };
        next();
    } catch (err) {
        console.error('[teacher-portal/avance/ussd auth]:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to authenticate USSD session' });
    }
}

function inferTermFromMonth(terms = [], date = new Date()) {
    const month = date.getMonth() + 1;
    if (!Array.isArray(terms) || !terms.length) return 'Term 1';
    if (terms.length >= 3) {
        if (month >= 9 && month <= 12) return terms[0];
        if (month >= 1 && month <= 4) return terms[1] || terms[0];
        return terms[2] || terms[terms.length - 1];
    }
    if (terms.length === 2) return month >= 9 || month <= 2 ? terms[0] : terms[1];
    return terms[0];
}

function inferAcademicYearFromDate(date = new Date()) {
    const y = date.getFullYear();
    const m = date.getMonth() + 1;
    return m >= 9 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
}

async function getSchoolAcademicCalendarSettings(schoolId) {
    const [[row]] = await promisePool.query(
        `SELECT current_academic_year, active_terms_json
         FROM school_academic_settings
         WHERE school_id = ?
         LIMIT 1`,
        [schoolId]
    ).catch(() => [[null]]);
    let terms = ['Term 1', 'Term 2', 'Term 3'];
    try {
        if (row?.active_terms_json) {
            const parsed = Array.isArray(row.active_terms_json)
                ? row.active_terms_json
                : JSON.parse(row.active_terms_json);
            if (Array.isArray(parsed) && parsed.length) {
                terms = parsed.map((x) => String(x || '').trim()).filter(Boolean);
            }
        }
    } catch (_) {}
    return {
        current_academic_year: String(row?.current_academic_year || '').trim(),
        active_terms: terms,
    };
}

async function resolveAcademicContext(schoolId, academicYearRaw, termRaw) {
    const explicitYear = String(academicYearRaw || '').trim();
    const explicitTerm = String(termRaw || '').trim();
    if (explicitYear && explicitTerm) {
        return { academicYear: explicitYear, term: explicitTerm };
    }
    const calendar = await getSchoolAcademicCalendarSettings(schoolId);
    return {
        academicYear: explicitYear || calendar.current_academic_year || inferAcademicYearFromDate(),
        term: explicitTerm || inferTermFromMonth(calendar.active_terms),
    };
}

function getRoleCode(req) {
    return String(req.user?.role_code || req.session?.user?.role?.code || '').toUpperCase();
}

function isDosRole(req) {
    return getRoleCode(req) === 'DOS';
}

/** DOS / managers / HoD see the full school timetable; class teachers only their own periods. */
function isSchoolWideTimetableRole(req) {
    return ['SCHOOL_ADMIN', 'SCHOOL_MANAGER', 'DOS', 'HOD'].includes(getRoleCode(req));
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
    if (teacherTablesReady) {
        const required = [
            'attendance_class',
            'attendance_class_details',
            'attendance_student',
            'attendance_teacher',
            'attendance_teacher_class',
            'parent_notification_queue',
            'teacher_round_roll_call_logs',
            'teacher_round_roll_call_records',
        ];
        try {
            const [rows] = await promisePool.query(
                `SELECT LOWER(TABLE_NAME) AS table_name
                 FROM information_schema.tables
                 WHERE table_schema = DATABASE()`
            );
            const existing = new Set((rows || []).map((r) => String(r.table_name || '').toLowerCase()));
            const missing = required.some((t) => !existing.has(t));
            if (!missing) return;
            teacherTablesReady = false;
            console.warn('[attendance-module] Missing tables detected, running ensureTeacherTables migration.');
        } catch (e) {
            console.warn('[attendance-module] Could not verify table existence, forcing migration:', e.message);
            teacherTablesReady = false;
        }
    }

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
    await promisePool.query('ALTER TABLE academic_timetables ADD COLUMN term VARCHAR(32) NULL').catch(() => {});
    await promisePool.query('ALTER TABLE academic_timetables ADD COLUMN academic_year VARCHAR(32) NULL').catch(() => {});
    await promisePool.query(
        `UPDATE academic_timetables
         SET term = CASE
             WHEN term IS NULL OR TRIM(term) = '' THEN 'Term 1'
             ELSE term
         END,
         academic_year = CASE
             WHEN academic_year IS NULL OR TRIM(academic_year) = '' THEN '2025-2026'
             ELSE academic_year
         END
         WHERE term IS NULL OR TRIM(term) = '' OR academic_year IS NULL OR TRIM(academic_year) = ''`
    ).catch((e) => {
        console.warn('[migration] Backfill academic_timetables term/year skipped:', e.message);
    });

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
    await promisePool.query(
        'ALTER TABLE academic_attendance_logs ADD UNIQUE KEY uq_attendance_single (school_id, timetable_id, record_date)'
    ).catch(() => {});

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
    await promisePool.query('ALTER TABLE academic_attendance_records ADD COLUMN remarks VARCHAR(255) NULL').catch(() => {});

    await promisePool.query(`
      CREATE TABLE IF NOT EXISTS teacher_attendance_logs (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        school_id INT UNSIGNED NOT NULL,
        teacher_user_id INT UNSIGNED NOT NULL,
        record_date DATE NOT NULL,
        status ENUM('Present', 'Absent', 'Late', 'Excused') NOT NULL DEFAULT 'Present',
        remarks VARCHAR(255) NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_teacher_day (school_id, teacher_user_id, record_date),
        INDEX idx_teacher_day (school_id, record_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await promisePool.query(`
      CREATE TABLE IF NOT EXISTS attendance_class (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        school_id INT UNSIGNED NOT NULL,
        class_id VARCHAR(120) NOT NULL,
        attendance_date DATE NOT NULL,
        term VARCHAR(32) NOT NULL,
        academic_year VARCHAR(32) NOT NULL,
        created_by_user_id INT UNSIGNED NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_attendance_class_scope (school_id, class_id, attendance_date, term, academic_year),
        INDEX idx_attendance_class_date (school_id, attendance_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await promisePool.query(`
      CREATE TABLE IF NOT EXISTS attendance_class_details (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        attendance_id INT UNSIGNED NOT NULL,
        student_id INT UNSIGNED NOT NULL,
        period VARCHAR(24) NOT NULL,
        status ENUM('Present', 'Absent', 'Late', 'Excused') NOT NULL DEFAULT 'Present',
        remarks VARCHAR(255) NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_attendance_class_detail (attendance_id, student_id, period),
        INDEX idx_attendance_class_student (student_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await promisePool.query(`
      CREATE TABLE IF NOT EXISTS attendance_student (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        school_id INT UNSIGNED NOT NULL,
        student_id INT UNSIGNED NOT NULL,
        attendance_date DATE NOT NULL,
        check_in DATETIME NULL,
        check_out DATETIME NULL,
        status_in ENUM('On time', 'Late', 'Absent') DEFAULT 'Absent',
        status_out ENUM('Checked out', 'Missing') DEFAULT 'Missing',
        source_in ENUM('MANUAL', 'RFID') DEFAULT 'MANUAL',
        source_out ENUM('MANUAL', 'RFID') DEFAULT 'MANUAL',
        notes VARCHAR(255) NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_attendance_student_day (school_id, student_id, attendance_date),
        INDEX idx_attendance_student_date (school_id, attendance_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await promisePool.query(`
      CREATE TABLE IF NOT EXISTS attendance_teacher (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        school_id INT UNSIGNED NOT NULL,
        teacher_id INT UNSIGNED NOT NULL,
        attendance_date DATE NOT NULL,
        check_in DATETIME NULL,
        check_out DATETIME NULL,
        status_in ENUM('Present', 'Late', 'Absent', 'Excused') DEFAULT 'Absent',
        status_out ENUM('Checked out', 'Missing') DEFAULT 'Missing',
        source_in ENUM('MANUAL', 'RFID') DEFAULT 'MANUAL',
        source_out ENUM('MANUAL', 'RFID') DEFAULT 'MANUAL',
        remarks VARCHAR(255) NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_attendance_teacher_day (school_id, teacher_id, attendance_date),
        INDEX idx_attendance_teacher_date (school_id, attendance_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await promisePool.query(`
      CREATE TABLE IF NOT EXISTS attendance_teacher_class (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        school_id INT UNSIGNED NOT NULL,
        teacher_id INT UNSIGNED NOT NULL,
        class_id VARCHAR(120) NOT NULL,
        period VARCHAR(24) NOT NULL,
        course VARCHAR(120) NULL,
        attendance_date DATE NOT NULL,
        check_time DATETIME NULL,
        status ENUM('Present', 'Missed', 'Late') DEFAULT 'Missed',
        source ENUM('MANUAL', 'RFID', 'AUTO') DEFAULT 'AUTO',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_attendance_teacher_class_day (school_id, teacher_id, class_id, period, attendance_date),
        INDEX idx_attendance_teacher_class_date (school_id, attendance_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await promisePool.query(`
      CREATE TABLE IF NOT EXISTS parent_notification_queue (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        school_id INT UNSIGNED NOT NULL,
        student_id INT UNSIGNED NOT NULL,
        attendance_date DATE NOT NULL,
        channel ENUM('IN_APP', 'WEB') NOT NULL DEFAULT 'IN_APP',
        category ENUM('ABSENT', 'LATE', 'MISSING_CHECKOUT', 'MANUAL') NOT NULL DEFAULT 'MANUAL',
        title VARCHAR(180) NOT NULL,
        body TEXT NOT NULL,
        status ENUM('PENDING', 'SENT', 'FAILED') NOT NULL DEFAULT 'PENDING',
        metadata_json JSON NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        sent_at DATETIME NULL,
        INDEX idx_parent_notification_school (school_id, attendance_date),
        INDEX idx_parent_notification_status (status, created_at)
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
    await ensureAcademicMarksExtras();

    await promisePool.query(`
      CREATE TABLE IF NOT EXISTS school_classes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        school_id INT UNSIGNED NOT NULL,
        group_name VARCHAR(100) NOT NULL,
        stream_name VARCHAR(100) NULL,
        category VARCHAR(50) NULL,
        combination JSON NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        KEY idx_school_id (school_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await promisePool.query(`
      CREATE TABLE IF NOT EXISTS school_subjects (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        school_id INT UNSIGNED NOT NULL,
        name VARCHAR(120) NOT NULL,
        category VARCHAR(64) NULL,
        subject_code VARCHAR(32) NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_school_subject (school_id, name),
        KEY idx_school_subjects_school (school_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await promisePool.query(`
      CREATE TABLE IF NOT EXISTS student_permissions (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        school_id INT UNSIGNED NOT NULL,
        student_id INT UNSIGNED NOT NULL,
        starts_at DATETIME NOT NULL,
        ends_at DATETIME NOT NULL,
        reason TEXT NULL,
        permission_type ENUM('MEDICAL', 'FAMILY', 'OFFICIAL', 'OTHER') DEFAULT 'OTHER',
        status ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED') DEFAULT 'PENDING',
        requested_by_user_id INT UNSIGNED NOT NULL,
        approved_by_user_id INT UNSIGNED NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_perm_school (school_id),
        INDEX idx_perm_student (student_id),
        INDEX idx_perm_dates (starts_at, ends_at),
        INDEX idx_perm_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await promisePool.query(`
      CREATE TABLE IF NOT EXISTS teacher_round_roll_call_logs (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        school_id INT UNSIGNED NOT NULL,
        class_name VARCHAR(160) NOT NULL,
        record_date DATE NOT NULL,
        roll_label VARCHAR(160) NOT NULL DEFAULT '',
        recorded_by_user_id INT UNSIGNED NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_rrc_day_class_roll (school_id, class_name, record_date, roll_label),
        INDEX idx_rrc_school_date (school_id, record_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await promisePool.query(
        'ALTER TABLE teacher_round_roll_call_logs ADD COLUMN roll_label VARCHAR(160) NOT NULL DEFAULT \'\''
    ).catch(() => {});
    await promisePool.query('ALTER TABLE teacher_round_roll_call_logs DROP INDEX uq_rrc_day_class').catch(() => {});
    await promisePool.query(
        'ALTER TABLE teacher_round_roll_call_logs ADD UNIQUE KEY uq_rrc_day_class_roll (school_id, class_name, record_date, roll_label)'
    ).catch(() => {});

    await promisePool.query(`
      CREATE TABLE IF NOT EXISTS teacher_round_roll_call_records (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        log_id INT UNSIGNED NOT NULL,
        student_id INT UNSIGNED NOT NULL,
        status VARCHAR(32) NOT NULL,
        remarks VARCHAR(255) NULL,
        UNIQUE KEY uq_rrc_student (log_id, student_id),
        INDEX idx_rrc_student (student_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    teacherTablesReady = true;
}

/** Round roll — DB → UI (present | absent | excused) */
function roundRollDbToUi(dbStatus) {
    const s = String(dbStatus || '').toLowerCase().trim();
    if (s === 'present') return 'present';
    if (s === 'absent' || s === 'sick') return 'absent';
    if (s === 'excused' || s === 'permission') return 'excused';
    return 'present';
}

function normalizeRollLabel(raw) {
    return String(raw ?? '').trim().slice(0, 160);
}

function normalizePeriodLabel(startTime) {
    const [hRaw, mRaw] = String(startTime || '00:00').split(':');
    const h = Number(hRaw || 0);
    const m = Number(mRaw || 0);
    const total = h * 60 + m;
    if (total < 540) return 'P1';
    if (total < 600) return 'P2';
    if (total < 660) return 'P3';
    if (total < 720) return 'P4';
    if (total < 780) return 'P5';
    if (total < 840) return 'P6';
    return 'P7';
}

function toSqlDate(dateStr) {
    const raw = String(dateStr || '').trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw.slice(0, 10))) return raw.slice(0, 10);
    const d = dateStr ? new Date(dateStr) : new Date();
    return d.toISOString().slice(0, 10);
}

function toDayName(dateStr) {
    return new Date(`${dateStr}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long' });
}

function toClassStatusValue(v) {
    const key = String(v || '').toLowerCase().trim();
    if (key === 'present') return 'Present';
    if (key === 'absent') return 'Absent';
    if (key === 'late') return 'Late';
    return 'Excused';
}

function fromTeacherRecordStatus(v) {
    const s = String(v || '').toLowerCase().trim();
    if (s === 'present') return 'Present';
    if (s === 'absent' || s === 'sick') return 'Absent';
    if (s === 'late') return 'Late';
    if (s === 'excused' || s === 'permission') return 'Excused';
    return 'Present';
}

// Ensure attendance schema exists before any route handler executes.
router.use(async (req, res, next) => {
    try {
        await ensureTeacherTables();
        next();
    } catch (e) {
        console.error('Failed to init teacher tables:', e);
        res.status(500).json({ success: false, message: 'Database initialization failed.' });
    }
});

async function enqueueParentNotification({
    schoolId,
    studentId,
    attendanceDate,
    channel = 'IN_APP',
    category = 'MANUAL',
    title,
    body,
    metadata = null,
}) {
    if (!schoolId || !studentId || !attendanceDate || !title || !body) return;
    await promisePool.query(
        `INSERT INTO parent_notification_queue
         (school_id, student_id, attendance_date, channel, category, title, body, status, metadata_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)`,
        [schoolId, studentId, attendanceDate, channel, category, title, body, metadata ? JSON.stringify(metadata) : null]
    );
}

router.get('/attendance-module/meta', requireTeacherRole, async (req, res) => {
    try {
        const schoolId = resolveSchoolId(req);
        const userId = resolveUserId(req);
        if (!schoolId) return res.status(400).json({ success: false, message: 'No school linked' });
        const wide = isSchoolWideTimetableRole(req);
        const where = wide ? 'WHERE school_id = ?' : 'WHERE school_id = ? AND staff_id = ?';
        const params = wide ? [schoolId] : [schoolId, userId];
        const [rows] = await promisePool.query(
            `SELECT DISTINCT class_name, term, academic_year
             FROM academic_timetables ${where}
             ORDER BY class_name ASC`,
            params
        );
        const [studentClassRows] = await promisePool.query(
            `SELECT DISTINCT class_name
             FROM students
             WHERE school_id = ? AND class_name IS NOT NULL AND TRIM(class_name) <> ''
             ORDER BY class_name ASC`,
            [schoolId]
        );
        const timetableClasses = rows.map((r) => normalizeGradebookLabel(r.class_name)).filter(Boolean);
        const studentClasses = (studentClassRows || []).map((r) => normalizeGradebookLabel(r.class_name)).filter(Boolean);
        const classes = Array.from(new Set([...studentClasses, ...timetableClasses]));
        const terms = Array.from(new Set(rows.map((r) => String(r.term || '').trim()).filter(Boolean)));
        const years = Array.from(new Set(rows.map((r) => String(r.academic_year || '').trim()).filter(Boolean)));
        res.json({
            success: true,
            data: {
                classes,
                timetableClasses: Array.from(new Set(timetableClasses)),
                studentClasses: Array.from(new Set(studentClasses)),
                terms,
                years,
            },
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to load attendance metadata' });
    }
});

router.get('/attendance-module/class-period', requireTeacherRole, async (req, res) => {
    try {
        const schoolId = resolveSchoolId(req);
        const userId = resolveUserId(req);
        if (!schoolId) return res.status(400).json({ success: false, message: 'No school linked' });
        const className = normalizeGradebookLabel(req.query.class_name || '');
        const termQ = String(req.query.term || '').trim();
        const academicYearQ = String(req.query.academic_year || '').trim();
        const date = toSqlDate(req.query.date);
        if (!className) {
            return res.status(400).json({ success: false, message: 'class_name is required' });
        }
        const { term, academicYear } = await resolveAcademicContext(schoolId, academicYearQ, termQ);
        const dayName = toDayName(date);
        const wide = isSchoolWideTimetableRole(req);
        let [ttRows] = await promisePool.query(
            `SELECT t.id, t.class_name, t.subject_name, t.start_time, t.end_time, t.staff_id,
                    t.day_of_week,
                    TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))) AS teacher_name
             FROM academic_timetables t
             LEFT JOIN users u ON u.id = t.staff_id
             WHERE t.school_id = ?
               AND (${sqlNormLabelEquals('t.class_name')})
               AND t.term = ?
               AND t.academic_year = ?
               AND t.day_of_week = ?
               ${wide ? '' : 'AND t.staff_id = ?'}
             ORDER BY t.start_time ASC`,
            wide ? [schoolId, className, term, academicYear, dayName] : [schoolId, className, term, academicYear, dayName, userId]
        );
        let timetableMode = 'exact_day';
        if (!ttRows.length) {
            // Fallback: if selected date has no exact day timetable, still load available class periods.
            [ttRows] = await promisePool.query(
                `SELECT t.id, t.class_name, t.subject_name, t.start_time, t.end_time, t.staff_id,
                        t.day_of_week,
                        TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))) AS teacher_name
                 FROM academic_timetables t
                 LEFT JOIN users u ON u.id = t.staff_id
                 WHERE t.school_id = ?
                   AND (${sqlNormLabelEquals('t.class_name')})
                   AND t.term = ?
                   AND t.academic_year = ?
                   ${wide ? '' : 'AND t.staff_id = ?'}
                 ORDER BY t.day_of_week ASC, t.start_time ASC`,
                wide ? [schoolId, className, term, academicYear] : [schoolId, className, term, academicYear, userId]
            );
            timetableMode = 'fallback_any_day';
        }
        if (!ttRows.length) {
            // Fallback 2: class + academic year (ignore term/day)
            [ttRows] = await promisePool.query(
                `SELECT t.id, t.class_name, t.subject_name, t.start_time, t.end_time, t.staff_id,
                        t.day_of_week,
                        TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))) AS teacher_name
                 FROM academic_timetables t
                 LEFT JOIN users u ON u.id = t.staff_id
                 WHERE t.school_id = ?
                   AND (${sqlNormLabelEquals('t.class_name')})
                   AND t.academic_year = ?
                   ${wide ? '' : 'AND t.staff_id = ?'}
                 ORDER BY t.day_of_week ASC, t.start_time ASC`,
                wide ? [schoolId, className, academicYear] : [schoolId, className, academicYear, userId]
            );
            timetableMode = 'fallback_year_only';
        }
        if (!ttRows.length) {
            // Fallback 3: class only (ignore term/year/day) so DOS still sees period structure.
            [ttRows] = await promisePool.query(
                `SELECT t.id, t.class_name, t.subject_name, t.start_time, t.end_time, t.staff_id,
                        t.day_of_week,
                        TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))) AS teacher_name
                 FROM academic_timetables t
                 LEFT JOIN users u ON u.id = t.staff_id
                 WHERE t.school_id = ?
                   AND (${sqlNormLabelEquals('t.class_name')})
                   ${wide ? '' : 'AND t.staff_id = ?'}
                 ORDER BY t.day_of_week ASC, t.start_time ASC`,
                wide ? [schoolId, className] : [schoolId, className, userId]
            );
            timetableMode = 'fallback_class_only';
        }
        // Build dense period labels from actual timetable rows (P1..Pn), not fixed time buckets.
        const uniqueStarts = Array.from(
            new Set(
                (ttRows || [])
                    .map((r) => String(r.start_time || '').trim())
                    .filter(Boolean)
            )
        ).sort();
        const periodByStart = new Map(uniqueStarts.map((start, idx) => [start, `P${idx + 1}`]));

        const seenPeriod = new Set();
        const periods = ttRows.map((r) => {
            const period = periodByStart.get(String(r.start_time || '').trim()) || normalizePeriodLabel(r.start_time);
            if (seenPeriod.has(period)) return null;
            seenPeriod.add(period);
            return {
                period,
                subject: r.subject_name,
                start_time: r.start_time,
                end_time: r.end_time,
                day_of_week: r.day_of_week,
                timetable_id: r.id,
                teacher_name: r.teacher_name || '',
            };
        }).filter(Boolean);
        const [students] = await promisePool.query(
            `SELECT id, student_uid, CONCAT(first_name, ' ', last_name) AS student_name
             FROM students
             WHERE school_id = ? AND (${sqlNormLabelEquals('class_name')})
             ORDER BY first_name ASC, last_name ASC`,
            [schoolId, className]
        );
        const [masterRows] = await promisePool.query(
            `SELECT id FROM attendance_class
             WHERE school_id = ? AND class_id = ? AND attendance_date = ? AND term = ? AND academic_year = ?
             LIMIT 1`,
            [schoolId, className, date, term, academicYear]
        );
        let detailRows = [];
        if (masterRows.length) {
            const [dRows] = await promisePool.query(
                `SELECT student_id, period, status, remarks
                 FROM attendance_class_details
                 WHERE attendance_id = ?`,
                [masterRows[0].id]
            );
            detailRows = dRows;
        }
        if (!detailRows.length) {
            // Fallback to teacher-marked period attendance so DOS sees the same data as teacher page.
            const [teacherRows] = await promisePool.query(
                `SELECT ar.student_id, ar.status, ar.remarks, tt.start_time
                 FROM academic_attendance_logs al
                 INNER JOIN academic_attendance_records ar ON ar.log_id = al.id
                 INNER JOIN academic_timetables tt ON tt.id = al.timetable_id AND tt.school_id = al.school_id
                 WHERE al.school_id = ?
                   AND al.record_date = ?
                   AND (${sqlNormLabelEquals('tt.class_name')})
                   AND tt.term = ?
                   AND tt.academic_year = ?
                 ORDER BY al.id DESC, ar.id DESC`,
                [schoolId, date, className, term, academicYear]
            );
            const used = new Set();
            detailRows = (teacherRows || []).map((r) => ({
                student_id: r.student_id,
                period: periodByStart.get(String(r.start_time || '').trim()) || normalizePeriodLabel(r.start_time),
                status: fromTeacherRecordStatus(r.status),
                remarks: r.remarks || '',
            })).filter((r) => {
                const k = `${r.student_id}:${r.period}`;
                if (used.has(k)) return false;
                used.add(k);
                return true;
            });
        }

        // If teacher marked a period that is not part of the selected-day timetable slots,
        // keep it visible in DOS by extending the periods list with those captured period keys.
        const existingPeriods = new Set(periods.map((p) => p.period));
        const extraPeriods = Array.from(
            new Set((detailRows || []).map((r) => String(r.period || '').trim()).filter(Boolean))
        ).filter((p) => !existingPeriods.has(p));
        for (const p of extraPeriods) {
            periods.push({
                period: p,
                subject: 'Recorded',
                start_time: null,
                end_time: null,
                day_of_week: dayName,
                timetable_id: null,
                teacher_name: '',
            });
        }
        periods.sort((a, b) => {
            const na = Number(String(a.period || '').replace(/[^\d]/g, ''));
            const nb = Number(String(b.period || '').replace(/[^\d]/g, ''));
            if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
            return String(a.period || '').localeCompare(String(b.period || ''));
        });
        const byKey = new Map(detailRows.map((r) => [`${r.student_id}:${r.period}`, r]));
        const roster = students.map((s) => {
            const periodStatuses = {};
            const remarks = [];
            periods.forEach((p) => {
                const row = byKey.get(`${s.id}:${p.period}`);
                periodStatuses[p.period] = row ? row.status : 'NotMarked';
                if (row?.remarks) remarks.push(`${p.period}: ${row.remarks}`);
            });
            return {
                student_id: s.id,
                student_uid: s.student_uid,
                student_name: s.student_name,
                period_statuses: periodStatuses,
                remarks: remarks.join(' | '),
            };
        });
        res.json({
            success: true,
            data: {
                class_name: className,
                term,
                academic_year: academicYear,
                date,
                selected_day: dayName,
                timetable_mode: timetableMode,
                periods,
                roster,
            },
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to load class period attendance' });
    }
});

router.post('/attendance-module/class-period', requireTeacherRole, async (req, res) => {
    const conn = await promisePool.getConnection();
    try {
        const schoolId = resolveSchoolId(req);
        const userId = resolveUserId(req);
        const { class_name, term: termRaw, academic_year: academicYearRaw, date, records } = req.body || {};
        const className = normalizeGradebookLabel(class_name || '');
        const recordDate = toSqlDate(date);
        if (!schoolId || !className || !Array.isArray(records)) {
            return res.status(400).json({ success: false, message: 'Invalid payload' });
        }
        const { term, academicYear } = await resolveAcademicContext(schoolId, academicYearRaw, termRaw);
        await conn.beginTransaction();
        const [existing] = await conn.query(
            `SELECT id FROM attendance_class
             WHERE school_id = ? AND class_id = ? AND attendance_date = ? AND term = ? AND academic_year = ?
             LIMIT 1`,
            [schoolId, className, recordDate, term, academicYear]
        );
        let attendanceId = existing[0]?.id;
        if (!attendanceId) {
            const [ins] = await conn.query(
                `INSERT INTO attendance_class (school_id, class_id, attendance_date, term, academic_year, created_by_user_id)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [schoolId, className, recordDate, term, academicYear, userId]
            );
            attendanceId = ins.insertId;
        } else {
            await conn.query('DELETE FROM attendance_class_details WHERE attendance_id = ?', [attendanceId]);
        }
        for (const row of records) {
            const studentId = Number(row.student_id || 0);
            if (!studentId || !row.period) continue;
            await conn.query(
                `INSERT INTO attendance_class_details (attendance_id, student_id, period, status, remarks)
                 VALUES (?, ?, ?, ?, ?)`,
                [attendanceId, studentId, String(row.period).trim(), toClassStatusValue(row.status), row.remarks ? String(row.remarks).slice(0, 255) : null]
            );
        }
        await conn.commit();
        res.json({ success: true, message: 'Class attendance saved' });
    } catch (err) {
        await conn.rollback().catch(() => {});
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to save class attendance' });
    } finally {
        conn.release();
    }
});

router.get('/attendance-module/student-entry-exit', requireTeacherRole, async (req, res) => {
    try {
        const schoolId = resolveSchoolId(req);
        if (!schoolId) return res.status(400).json({ success: false, message: 'No school linked' });
        const date = toSqlDate(req.query.date);
        const className = normalizeGradebookLabel(req.query.class_name || '');
        const [rows] = await promisePool.query(
            `SELECT s.id AS student_id, s.student_uid, CONCAT(s.first_name, ' ', s.last_name) AS student_name,
                    a.check_in, a.check_out, a.status_in, a.status_out
             FROM students s
             LEFT JOIN attendance_student a
               ON a.school_id = s.school_id AND a.student_id = s.id AND a.attendance_date = ?
             WHERE s.school_id = ? ${className ? `AND (${sqlNormLabelEquals('s.class_name')})` : ''}
             ORDER BY s.first_name ASC, s.last_name ASC`,
            className ? [date, schoolId, className] : [date, schoolId]
        );
        const totals = {
            total_students: rows.length,
            on_time: rows.filter((r) => r.status_in === 'On time').length,
            late: rows.filter((r) => r.status_in === 'Late').length,
            absent: rows.filter((r) => r.status_in === 'Absent' || !r.status_in).length,
            checked_out: rows.filter((r) => r.status_out === 'Checked out').length,
            missing: rows.filter((r) => r.status_out === 'Missing' || !r.status_out).length,
        };
        res.json({ success: true, data: { rows, totals, date } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to load student entry/exit' });
    }
});

router.post('/attendance-module/student-entry-exit/simulate-scan', requireTeacherRole, async (req, res) => {
    try {
        const schoolId = resolveSchoolId(req);
        const { student_id, direction, date } = req.body || {};
        if (!schoolId || !student_id || !direction) {
            return res.status(400).json({ success: false, message: 'student_id and direction are required' });
        }
        const recordDate = toSqlDate(date);
        const now = new Date();
        const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`;
        const statusIn = hhmm <= '07:30:00' ? 'On time' : 'Late';
        if (String(direction).toUpperCase() === 'IN') {
            await promisePool.query(
                `INSERT INTO attendance_student (school_id, student_id, attendance_date, check_in, status_in, source_in)
                 VALUES (?, ?, ?, NOW(), ?, 'RFID')
                 ON DUPLICATE KEY UPDATE check_in = VALUES(check_in), status_in = VALUES(status_in), source_in = 'RFID'`,
                [schoolId, student_id, recordDate, statusIn]
            );
            if (statusIn === 'Late') {
                await enqueueParentNotification({
                    schoolId,
                    studentId: Number(student_id),
                    attendanceDate: recordDate,
                    channel: 'IN_APP',
                    category: 'LATE',
                    title: 'Late arrival alert',
                    body: 'Your student arrived late today.',
                    metadata: { source: 'RFID_SIMULATION', direction: 'IN' },
                });
            }
        } else {
            await promisePool.query(
                `INSERT INTO attendance_student (school_id, student_id, attendance_date, check_out, status_out, source_out)
                 VALUES (?, ?, ?, NOW(), 'Checked out', 'RFID')
                 ON DUPLICATE KEY UPDATE check_out = VALUES(check_out), status_out = 'Checked out', source_out = 'RFID'`,
                [schoolId, student_id, recordDate]
            );
        }
        res.json({ success: true, message: 'RFID scan simulated' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to simulate student RFID scan' });
    }
});

router.get('/attendance-module/student-entry-exit/monthly-grid', requireTeacherRole, async (req, res) => {
    try {
        const schoolId = resolveSchoolId(req);
        if (!schoolId) return res.status(400).json({ success: false, message: 'No school linked' });
        const className = normalizeGradebookLabel(req.query.class_name || '');
        const month = Math.min(Math.max(Number(req.query.month || new Date().getMonth() + 1), 1), 12);
        const year = Number(req.query.year || new Date().getFullYear());
        const firstDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const lastDate = `${year}-${String(month).padStart(2, '0')}-30`;

        const [rows] = await promisePool.query(
            `SELECT s.id AS student_id, s.student_uid, CONCAT(s.first_name, ' ', s.last_name) AS student_name,
                    a.attendance_date, a.status_in
             FROM students s
             LEFT JOIN attendance_student a
               ON a.school_id = s.school_id
              AND a.student_id = s.id
              AND a.attendance_date BETWEEN ? AND ?
             WHERE s.school_id = ? ${className ? `AND (${sqlNormLabelEquals('s.class_name')})` : ''}
             ORDER BY s.first_name ASC, s.last_name ASC, a.attendance_date ASC`,
            className ? [firstDate, lastDate, schoolId, className] : [firstDate, lastDate, schoolId]
        );

        const byStudent = new Map();
        for (const r of rows) {
            if (!byStudent.has(r.student_id)) {
                byStudent.set(r.student_id, {
                    student_id: r.student_id,
                    student_uid: r.student_uid,
                    student_name: r.student_name,
                    days: {},
                    present_days: 0,
                    late_days: 0,
                    absent_days: 0,
                });
            }
            if (!r.attendance_date) continue;
            const dayNum = new Date(r.attendance_date).getDate();
            if (dayNum > 30) continue;
            const dayKey = String(dayNum).padStart(2, '0');
            const statusIn = String(r.status_in || 'Absent');
            const symbol = statusIn === 'On time' ? 'Present' : statusIn === 'Late' ? 'Late' : 'Absent';
            const bucket = byStudent.get(r.student_id);
            bucket.days[dayKey] = symbol;
        }

        const grid = Array.from(byStudent.values()).map((r) => {
            for (let d = 1; d <= 30; d += 1) {
                const k = String(d).padStart(2, '0');
                const value = r.days[k] || 'Absent';
                if (value === 'Present') r.present_days += 1;
                else if (value === 'Late') r.late_days += 1;
                else r.absent_days += 1;
            }
            return r;
        });

        res.json({ success: true, data: { month, year, grid } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to load monthly student grid' });
    }
});

router.get('/attendance-module/teacher', requireTeacherRole, async (req, res) => {
    try {
        const schoolId = resolveSchoolId(req);
        if (!schoolId) return res.status(400).json({ success: false, message: 'No school linked' });
        const date = toSqlDate(req.query.date);
        const [rows] = await promisePool.query(
            `SELECT u.id AS teacher_id, TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))) AS teacher_name,
                    a.check_in, a.check_out, a.status_in, a.status_out, a.remarks
             FROM users u
             INNER JOIN roles r ON r.id = u.role_id
             LEFT JOIN attendance_teacher a
               ON a.school_id = u.school_id AND a.teacher_id = u.id AND a.attendance_date = ?
             WHERE u.school_id = ? AND UPPER(r.role_code) = 'TEACHER' AND u.deleted_at IS NULL
             ORDER BY teacher_name ASC`,
            [date, schoolId]
        );
        res.json({ success: true, data: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to load teacher attendance' });
    }
});

router.get('/attendance-module/teacher/monthly-grid', requireTeacherRole, async (req, res) => {
    try {
        const schoolId = resolveSchoolId(req);
        if (!schoolId) return res.status(400).json({ success: false, message: 'No school linked' });
        const month = Math.min(Math.max(Number(req.query.month || new Date().getMonth() + 1), 1), 12);
        const year = Number(req.query.year || new Date().getFullYear());
        const firstDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const lastDate = `${year}-${String(month).padStart(2, '0')}-30`;
        const [rows] = await promisePool.query(
            `SELECT u.id AS teacher_id, TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))) AS teacher_name,
                    a.attendance_date, a.status_in
             FROM users u
             INNER JOIN roles r ON r.id = u.role_id
             LEFT JOIN attendance_teacher a
               ON a.school_id = u.school_id
              AND a.teacher_id = u.id
              AND a.attendance_date BETWEEN ? AND ?
             WHERE u.school_id = ? AND UPPER(r.role_code) = 'TEACHER' AND u.deleted_at IS NULL
             ORDER BY teacher_name ASC, a.attendance_date ASC`,
            [firstDate, lastDate, schoolId]
        );
        const byTeacher = new Map();
        for (const r of rows) {
            if (!byTeacher.has(r.teacher_id)) {
                byTeacher.set(r.teacher_id, {
                    teacher_id: r.teacher_id,
                    teacher_name: r.teacher_name,
                    days: {},
                    present_days: 0,
                    late_days: 0,
                    absent_days: 0,
                });
            }
            if (!r.attendance_date) continue;
            const d = new Date(r.attendance_date).getDate();
            if (d > 30) continue;
            const dayKey = String(d).padStart(2, '0');
            const st = String(r.status_in || 'Absent');
            const value = st === 'Present' ? 'Present' : st === 'Late' ? 'Late' : 'Absent';
            byTeacher.get(r.teacher_id).days[dayKey] = value;
        }
        const grid = Array.from(byTeacher.values()).map((r) => {
            for (let d = 1; d <= 30; d += 1) {
                const k = String(d).padStart(2, '0');
                const value = r.days[k] || 'Absent';
                if (value === 'Present') r.present_days += 1;
                else if (value === 'Late') r.late_days += 1;
                else r.absent_days += 1;
            }
            return r;
        });
        res.json({ success: true, data: { month, year, grid } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to load monthly teacher grid' });
    }
});

router.post('/attendance-module/teacher/manual', requireTeacherRole, async (req, res) => {
    try {
        const schoolId = resolveSchoolId(req);
        const { teacher_id, date, status_in, remarks } = req.body || {};
        const recordDate = toSqlDate(date);
        if (!schoolId || !teacher_id) return res.status(400).json({ success: false, message: 'teacher_id is required' });
        const status = ['Present', 'Absent', 'Late', 'Excused'].includes(status_in) ? status_in : 'Present';
        await promisePool.query(
            `INSERT INTO attendance_teacher (school_id, teacher_id, attendance_date, check_in, status_in, remarks, source_in)
             VALUES (?, ?, ?, NOW(), ?, ?, 'MANUAL')
             ON DUPLICATE KEY UPDATE status_in = VALUES(status_in), remarks = VALUES(remarks), check_in = COALESCE(check_in, VALUES(check_in)), source_in = 'MANUAL'`,
            [schoolId, teacher_id, recordDate, status, remarks ? String(remarks).slice(0, 255) : null]
        );
        res.json({ success: true, message: 'Teacher attendance saved' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to save teacher attendance' });
    }
});

router.post('/attendance-module/teacher/simulate-scan', requireTeacherRole, async (req, res) => {
    try {
        const schoolId = resolveSchoolId(req);
        const { teacher_id, date } = req.body || {};
        const recordDate = toSqlDate(date);
        if (!schoolId || !teacher_id) return res.status(400).json({ success: false, message: 'teacher_id is required' });
        const hhmm = new Date().toTimeString().slice(0, 8);
        const status = hhmm <= '09:00:00' ? 'Present' : 'Late';
        await promisePool.query(
            `INSERT INTO attendance_teacher (school_id, teacher_id, attendance_date, check_in, status_in, source_in)
             VALUES (?, ?, ?, NOW(), ?, 'RFID')
             ON DUPLICATE KEY UPDATE check_in = VALUES(check_in), status_in = VALUES(status_in), source_in = 'RFID'`,
            [schoolId, teacher_id, recordDate, status]
        );
        res.json({ success: true, message: 'Teacher RFID scan simulated' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to simulate teacher RFID scan' });
    }
});

router.get('/attendance-module/teacher-class-checkin', requireTeacherRole, async (req, res) => {
    try {
        await ensureTeacherTables();
        const schoolId = resolveSchoolId(req);
        if (!schoolId) return res.status(400).json({ success: false, message: 'No school linked' });
        const date = toSqlDate(req.query.date);
        const dayName = toDayName(date);
        const [expected] = await promisePool.query(
            `SELECT t.staff_id AS teacher_id, t.class_name AS class_id, t.subject_name AS course,
                    t.start_time, t.end_time,
                    TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))) AS teacher_name
             FROM academic_timetables t
             LEFT JOIN users u ON u.id = t.staff_id
             WHERE t.school_id = ?
               AND LOWER(TRIM(t.day_of_week)) = LOWER(TRIM(?))
               AND (t.extra_activity_id IS NULL OR t.extra_activity_id = 0)
             ORDER BY t.start_time ASC, t.class_name ASC`,
            [schoolId, dayName]
        ).catch(async () => {
            const [rows] = await promisePool.query(
                `SELECT t.staff_id AS teacher_id, t.class_name AS class_id, t.subject_name AS course,
                        t.start_time, t.end_time,
                        TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))) AS teacher_name
                 FROM academic_timetables t
                 LEFT JOIN users u ON u.id = t.staff_id
                 WHERE t.school_id = ?
                   AND LOWER(TRIM(t.day_of_week)) = LOWER(TRIM(?))
                 ORDER BY t.start_time ASC, t.class_name ASC`,
                [schoolId, dayName]
            );
            return [rows];
        });

        const slots = (expected || []).filter((row) => row.teacher_id && normalizeGradebookLabel(row.class_id));
        const slotsByTeacher = new Map();
        for (const row of slots) {
            if (!slotsByTeacher.has(row.teacher_id)) slotsByTeacher.set(row.teacher_id, []);
            slotsByTeacher.get(row.teacher_id).push(row);
        }
        for (const teacherSlots of slotsByTeacher.values()) {
            teacherSlots.sort((a, b) => String(a.start_time || '').localeCompare(String(b.start_time || '')));
            for (let i = 0; i < teacherSlots.length; i += 1) {
                const row = teacherSlots[i];
                const period = `P${i + 1}`;
                const classId = normalizeGradebookLabel(row.class_id);
                await promisePool.query(
                    `INSERT INTO attendance_teacher_class
                     (school_id, teacher_id, class_id, period, course, attendance_date, status, source)
                     VALUES (?, ?, ?, ?, ?, ?, 'Missed', 'AUTO')
                     ON DUPLICATE KEY UPDATE course = VALUES(course)`,
                    [schoolId, row.teacher_id, classId, period, row.course || null, date]
                ).catch((insErr) => {
                    console.warn('[teacher-class-checkin] skip insert:', insErr.message);
                });
            }
        }
        const [rows] = await promisePool.query(
            `SELECT c.teacher_id, c.class_id, c.period, c.course, c.attendance_date,
                    c.check_time, c.status, c.source,
                    TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))) AS teacher_name
             FROM attendance_teacher_class c
             LEFT JOIN users u ON u.id = c.teacher_id
             WHERE c.school_id = ? AND c.attendance_date = ?
             ORDER BY teacher_name ASC, c.period ASC`,
            [schoolId, date]
        );
        const byTeacher = {};
        for (const r of rows) {
            if (!byTeacher[r.teacher_id]) byTeacher[r.teacher_id] = { teacher_name: r.teacher_name, total: 0, attended: 0, missed: 0, late: 0 };
            byTeacher[r.teacher_id].total += 1;
            if (r.status === 'Present') byTeacher[r.teacher_id].attended += 1;
            else if (r.status === 'Late') byTeacher[r.teacher_id].late += 1;
            else byTeacher[r.teacher_id].missed += 1;
        }
        res.json({ success: true, data: { rows, summary: Object.values(byTeacher) } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to load teacher class check-ins' });
    }
});

router.post('/attendance-module/teacher-class-checkin/simulate-scan', requireTeacherRole, async (req, res) => {
    try {
        const schoolId = resolveSchoolId(req);
        const { teacher_id, class_id, period, date } = req.body || {};
        if (!schoolId || !teacher_id || !class_id || !period) {
            return res.status(400).json({ success: false, message: 'teacher_id, class_id and period are required' });
        }
        const recordDate = toSqlDate(date);
        const hhmm = new Date().toTimeString().slice(0, 8);
        const status = hhmm > '09:00:00' ? 'Late' : 'Present';
        await promisePool.query(
            `INSERT INTO attendance_teacher_class
             (school_id, teacher_id, class_id, period, attendance_date, check_time, status, source)
             VALUES (?, ?, ?, ?, ?, NOW(), ?, 'RFID')
             ON DUPLICATE KEY UPDATE check_time = VALUES(check_time), status = VALUES(status), source = 'RFID'`,
            [schoolId, teacher_id, normalizeGradebookLabel(class_id), String(period).trim(), recordDate, status]
        );
        res.json({ success: true, message: 'Teacher class RFID check-in simulated' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to simulate class check-in' });
    }
});

router.post('/attendance-module/teacher-class-checkin/override', requireTeacherRole, async (req, res) => {
    try {
        if (!isDosRole(req)) {
            return res.status(403).json({ success: false, message: 'DOS only override' });
        }
        const schoolId = resolveSchoolId(req);
        const { teacher_id, class_id, period, date, status, course } = req.body || {};
        if (!schoolId || !teacher_id || !class_id || !period || !date) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }
        const safeStatus = ['Present', 'Missed', 'Late'].includes(status) ? status : 'Present';
        await promisePool.query(
            `INSERT INTO attendance_teacher_class
             (school_id, teacher_id, class_id, period, course, attendance_date, status, source)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'MANUAL')
             ON DUPLICATE KEY UPDATE status = VALUES(status), source = 'MANUAL', course = COALESCE(VALUES(course), course)`,
            [schoolId, teacher_id, normalizeGradebookLabel(class_id), String(period).trim(), course || null, toSqlDate(date), safeStatus]
        );
        res.json({ success: true, message: 'Teacher class check-in overridden' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to override class check-in' });
    }
});

router.get('/attendance-module/parent-notifications', requireTeacherRole, async (req, res) => {
    try {
        const schoolId = resolveSchoolId(req);
        if (!schoolId) return res.status(400).json({ success: false, message: 'No school linked' });
        const date = toSqlDate(req.query.date);
        const [rows] = await promisePool.query(
            `SELECT q.id, q.student_id, q.attendance_date, q.channel, q.category, q.title, q.body, q.status, q.created_at,
                    CONCAT(COALESCE(s.first_name, ''), ' ', COALESCE(s.last_name, '')) AS student_name
             FROM parent_notification_queue q
             LEFT JOIN students s ON s.id = q.student_id
             WHERE q.school_id = ? AND q.attendance_date = ?
             ORDER BY q.created_at DESC`,
            [schoolId, date]
        );
        res.json({ success: true, data: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to load parent notification queue' });
    }
});

router.post('/attendance-module/parent-notifications/enqueue', requireTeacherRole, async (req, res) => {
    try {
        const schoolId = resolveSchoolId(req);
        const { student_id, attendance_date, channel, category, title, body } = req.body || {};
        if (!schoolId || !student_id || !attendance_date || !title || !body) {
            return res.status(400).json({ success: false, message: 'Missing queue fields' });
        }
        await enqueueParentNotification({
            schoolId,
            studentId: Number(student_id),
            attendanceDate: toSqlDate(attendance_date),
            channel: channel === 'WEB' ? 'WEB' : 'IN_APP',
            category: ['ABSENT', 'LATE', 'MISSING_CHECKOUT', 'MANUAL'].includes(category) ? category : 'MANUAL',
            title: String(title).slice(0, 180),
            body: String(body).slice(0, 1200),
        });
        res.json({ success: true, message: 'Notification queued' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to queue notification' });
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
        const nowHm = new Date().toTimeString().slice(0, 5);
        const timeToMinsDash = (t) => {
            const [h, m] = String(t || '00:00').slice(0, 5).split(':').map(Number);
            return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
        };
        const nowMinsDash = timeToMinsDash(nowHm);

        const [[periodSettings]] = await promisePool.query(
            'SELECT term, academic_year FROM school_teacher_period_settings WHERE school_id = ? LIMIT 1',
            [schoolId]
        ).catch(() => [[null]]);
        const dashTerm = String(periodSettings?.term || '').trim();
        const dashYear = String(periodSettings?.academic_year || '').trim();

        const scheduleBase = isSchoolWideTimetableRole(req)
            ? `SELECT subject_name as subject, class_name as \`group\`, room, start_time, end_time
               FROM academic_timetables WHERE school_id = ? AND day_of_week = ?
                 AND (extra_activity_id IS NULL OR extra_activity_id = 0)`
            : `SELECT subject_name as subject, class_name as \`group\`, room, start_time, end_time
               FROM academic_timetables WHERE school_id = ? AND staff_id = ? AND day_of_week = ?
                 AND (extra_activity_id IS NULL OR extra_activity_id = 0)`;
        const scheduleParams = isSchoolWideTimetableRole(req)
            ? [schoolId, currentDay]
            : [schoolId, userId, currentDay];
        let scheduleSql = scheduleBase;
        if (dashTerm) { scheduleSql += ' AND TRIM(COALESCE(term,\'\')) = ?'; scheduleParams.push(dashTerm); }
        if (dashYear) { scheduleSql += ' AND TRIM(COALESCE(academic_year,\'\')) = ?'; scheduleParams.push(dashYear); }
        scheduleSql += ' ORDER BY start_time ASC';
        const [todayScheduleRows] = await promisePool.query(scheduleSql, scheduleParams);

        const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
        let weeklySql = isSchoolWideTimetableRole(req)
            ? `SELECT subject_name as subject, class_name as \`group\`, room, start_time, end_time, day_of_week as day
               FROM academic_timetables WHERE school_id = ? AND day_of_week IN (?,?,?,?,?)
                 AND (extra_activity_id IS NULL OR extra_activity_id = 0)`
            : `SELECT subject_name as subject, class_name as \`group\`, room, start_time, end_time, day_of_week as day
               FROM academic_timetables WHERE school_id = ? AND staff_id = ? AND day_of_week IN (?,?,?,?,?)
                 AND (extra_activity_id IS NULL OR extra_activity_id = 0)`;
        const weeklyParams = isSchoolWideTimetableRole(req)
            ? [schoolId, ...weekDays]
            : [schoolId, userId, ...weekDays];
        if (dashTerm) { weeklySql += ' AND TRIM(COALESCE(term,\'\')) = ?'; weeklyParams.push(dashTerm); }
        if (dashYear) { weeklySql += ' AND TRIM(COALESCE(academic_year,\'\')) = ?'; weeklyParams.push(dashYear); }
        weeklySql += ' ORDER BY FIELD(day_of_week, "Monday","Tuesday","Wednesday","Thursday","Friday"), start_time ASC';
        const [weeklyRows] = await promisePool.query(weeklySql, weeklyParams);

        const [periodLogsToday] = await promisePool.query(
            `SELECT class_name, subject_name, start_time, end_time, entry_time, exit_time, status,
                    TIME_FORMAT(entry_time, '%H:%i') AS entry_hm
             FROM teacher_period_attendance
             WHERE school_id = ? AND teacher_id = ? AND period_date = CURDATE()`,
            [schoolId, userId]
        ).catch(() => [[]]);

        const logMap = new Map((periodLogsToday || []).map((l) => [
            `${l.class_name}__${String(l.start_time).slice(0, 5)}`, l,
        ]));

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

        const schedule = (todayScheduleRows || []).map((row) => {
            const start = String(row.start_time || '').slice(0, 5);
            const end = String(row.end_time || '').slice(0, 5);
            const startM = timeToMinsDash(start);
            const endM = timeToMinsDash(end);
            const active = nowMinsDash >= startM && nowMinsDash < endM;
            const log = logMap.get(`${row.group}__${start}`);
            return {
                time: start,
                end_time: end,
                title: `${row.subject} · ${row.group}`,
                subject: row.subject,
                class_name: row.group,
                room: row.room || '—',
                active,
                period_checked_in: Boolean(log?.entry_time),
                period_status: log?.status || null,
                entry_time: log?.entry_hm || null,
            };
        });

        const weeklySchedule = (weeklyRows || []).map((row) => ({
            day: row.day,
            time: String(row.start_time || '').slice(0, 5),
            end_time: String(row.end_time || '').slice(0, 5),
            title: `${row.subject} · ${row.group}`,
            subject: row.subject,
            class_name: row.group,
            room: row.room || '—',
        }));

        await ensureClassTeacherAssignmentsTable();
        await ensureTeacherAssignmentsTable();

        const roleCode = String(req.session?.user?.role_code || req.user?.role_code || '').toUpperCase();
        const homeroomClasses = roleCode === 'TEACHER'
            ? await fetchTeacherClassTeacherClassNames(schoolId, userId)
            : [];

        let genderAgg = { total: 0, girls: 0, boys: 0 };
        let assignedStudentCount = Number(studentCount?.c ?? 0);

        if (roleCode === 'TEACHER') {
            if (homeroomClasses.length) {
                const classOr = homeroomClasses.map(() => sqlNormLabelEquals('class_name')).join(' OR ');
                const [[scopedGender]] = await promisePool.query(
                    `SELECT
                       COUNT(*) AS total,
                       SUM(CASE WHEN LOWER(TRIM(COALESCE(gender, ''))) IN ('female', 'f', 'girl', 'girls') THEN 1 ELSE 0 END) AS girls,
                       SUM(CASE WHEN LOWER(TRIM(COALESCE(gender, ''))) IN ('male', 'm', 'boy', 'boys') THEN 1 ELSE 0 END) AS boys
                     FROM students
                     WHERE school_id = ? AND (${classOr})`,
                    [schoolId, ...homeroomClasses],
                ).catch(() => [[{ total: 0, girls: 0, boys: 0 }]]);
                genderAgg = scopedGender || genderAgg;
                assignedStudentCount = Number(scopedGender?.total ?? 0);
            }
        } else {
            const [[schoolGender]] = await promisePool.query(
                `SELECT
                   COUNT(*) AS total,
                   SUM(CASE WHEN LOWER(TRIM(COALESCE(gender, ''))) IN ('female', 'f', 'girl', 'girls') THEN 1 ELSE 0 END) AS girls,
                   SUM(CASE WHEN LOWER(TRIM(COALESCE(gender, ''))) IN ('male', 'm', 'boy', 'boys') THEN 1 ELSE 0 END) AS boys
                 FROM students
                 WHERE school_id = ?`,
                [schoolId],
            ).catch(() => [[{ total: studentCount?.c || 0, girls: 0, boys: 0 }]]);
            genderAgg = schoolGender || genderAgg;
            assignedStudentCount = Number(schoolGender?.total ?? studentCount?.c ?? 0);
        }

        if (stats[1]?.label === 'Active Students') {
            stats[1].value = String(assignedStudentCount);
        }

        const schoolOverview = {
            students: Number(genderAgg?.total ?? 0),
            girls: Number(genderAgg?.girls ?? 0),
            boys: Number(genderAgg?.boys ?? 0),
            classNames: homeroomClasses,
        };

        res.json({ success: true, data: { stats, schedule, weeklySchedule, schoolOverview } });
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
        await ensureClassTeacherAssignmentsTable();
        await ensureTeacherAssignmentsTable();
        const schoolId = resolveSchoolId(req);
        if (!schoolId) return res.status(400).json({ success: false, message: 'No school linked' });

        const { class_name, date, class_labels: classLabelsRaw, scope } = req.query;
        const lookupDate = date || new Date().toISOString().split('T')[0];
        const teacherUserId = resolveUserId(req);
        if (!teacherUserId) return res.status(403).json({ success: false, message: 'Teacher not resolved' });
        const roleCode = String(req.session?.user?.role_code || req.user?.role_code || '').toUpperCase();
        const restrictToAssignedClasses = roleCode === 'TEACHER';
        const forAttendance = String(scope || '').trim().toLowerCase() === 'attendance';
        if (restrictToAssignedClasses && forAttendance && !class_name && !classLabelsRaw) {
            return res.status(400).json({ success: false, message: 'class_name is required for attendance roster' });
        }
        const classLabelList = classLabelsRaw
            ? String(classLabelsRaw)
                  .split(',')
                  .map((x) => normalizeGradebookLabel(x))
                  .filter(Boolean)
            : class_name
              ? [normalizeGradebookLabel(class_name)]
              : [];

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

        if (restrictToAssignedClasses) {
            if (forAttendance && classLabelList.length) {
                const ttMatch = classLabelList.map(() => sqlNormLabelEquals('tt.class_name')).join(' OR ');
                const taMatch = classLabelList.map(() => sqlNormLabelEquals('ta.class_name')).join(' OR ');
                const dosMatch = classLabelList.map(() => sqlNormLabelEquals('ta_dos.class_name')).join(' OR ');
                query += `
              AND (
                EXISTS (
                  SELECT 1
                  FROM academic_timetables tt
                  WHERE tt.school_id = ?
                    AND tt.staff_id = ?
                    AND (${ttMatch})
                )
                OR EXISTS (
                  SELECT 1
                  FROM timetable_assignments ta
                  WHERE ta.school_id = ?
                    AND ta.teacher_user_id = ?
                    AND (${taMatch})
                )
                OR EXISTS (
                  SELECT 1
                  FROM teacher_assignments ta_dos
                  WHERE ta_dos.school_id = ?
                    AND ta_dos.teacher_user_id = ?
                    AND ta_dos.status = 'active'
                    AND (${dosMatch})
                )
              )`;
                params.push(
                    schoolId, teacherUserId, ...classLabelList,
                    schoolId, teacherUserId, ...classLabelList,
                    schoolId, teacherUserId, ...classLabelList,
                );
            } else if (!forAttendance) {
                const rosterScope = String(scope || '').trim().toLowerCase();
                const assignedClasses = rosterScope === 'teaching'
                    ? await fetchTeacherAssignedClassNames(schoolId, teacherUserId)
                    : await fetchTeacherClassTeacherClassNames(schoolId, teacherUserId);
                if (!assignedClasses.length) {
                    query += ' AND 1=0';
                } else {
                    const classOr = assignedClasses.map(() => sqlNormLabelEquals('s.class_name')).join(' OR ');
                    query += ` AND (${classOr})`;
                    params.push(...assignedClasses);
                }
            }
        }

        if (classLabelList.length === 1) {
            query += ` AND (${sqlNormLabelEquals('s.class_name')})`;
            params.push(classLabelList[0]);
        } else if (classLabelList.length > 1) {
            const classOr = classLabelList.map(() => sqlNormLabelEquals('s.class_name')).join(' OR ');
            query += ` AND (${classOr})`;
            params.push(...classLabelList);
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
                // Used by DOS/teacher UIs as an optional portrait.
                student_photo_url: r.student_photo ? `/uploads/student-profile-photos/${r.student_photo}` : null,
                photo_url: r.student_photo ? `/uploads/student-profile-photos/${r.student_photo}` : null,
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
        await ensureClassTeacherAssignmentsTable();
        await ensureTeacherAssignmentsTable();
        const schoolId = resolveSchoolId(req);
        if (!schoolId) return res.status(400).json({ success: false, message: 'No school linked' });

        const teacherUserId = resolveUserId(req);
        if (!teacherUserId) return res.status(403).json({ success: false, message: 'Teacher not resolved' });
        const roleCode = String(req.session?.user?.role_code || req.user?.role_code || '').toUpperCase();
        const scope = String(req.query.scope || '').trim().toLowerCase();
        const wantAllSchool = scope === 'school' || scope === 'all' || roleCode !== 'TEACHER';

        if (wantAllSchool) {
            const [registryRows, studentClassRows, timetableClassRows] = await Promise.all([
                promisePool.query(
                    'SELECT group_name, stream_name, combination FROM school_classes WHERE school_id = ?',
                    [schoolId]
                ).then(([rows]) => rows || []),
                promisePool.query(
                    `SELECT DISTINCT class_name FROM students
                     WHERE school_id = ? AND class_name IS NOT NULL AND TRIM(class_name) <> ''`,
                    [schoolId]
                ).then(([rows]) => (rows || []).map((r) => r.class_name)),
                promisePool.query(
                    `SELECT DISTINCT class_name FROM academic_timetables
                     WHERE school_id = ? AND class_name IS NOT NULL AND TRIM(class_name) <> ''`,
                    [schoolId]
                ).then(([rows]) => (rows || []).map((r) => r.class_name)),
            ]);
            const classes = collectSchoolRegisteredClassNames({
                registryRows,
                studentClassNames: studentClassRows,
                timetableClassNames: timetableClassRows,
            });
            return res.json({ success: true, data: classes });
        }

        const classScope = String(req.query.class_scope || scope || '').trim().toLowerCase();
        const classes = classScope === 'teaching'
            ? await fetchTeacherAssignedClassNames(schoolId, teacherUserId)
            : await fetchTeacherClassTeacherClassNames(schoolId, teacherUserId);
        res.json({ success: true, data: classes });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to fetch classes' });
    }
});

// ============================================================
// GET /api/teacher-portal/round-roll-call/sessions  ?class_name=&date=
// Saved roll names for this class + date (for picker / switching)
// ============================================================
router.get('/round-roll-call/sessions', requireTeacherRole, async (req, res) => {
    try {
        await ensureTeacherTables();
        const schoolId = resolveSchoolId(req);
        if (!schoolId) return res.status(400).json({ success: false, message: 'No school linked' });

        const className = normalizeGradebookLabel(req.query.class_name || '');
        const recordDate = toSqlDate(req.query.date || new Date().toISOString().slice(0, 10));
        if (!className) {
            return res.status(400).json({ success: false, message: 'class_name is required' });
        }

        const [rows] = await promisePool.query(
            `SELECT lg.roll_label,
                    lg.id AS log_id,
                    (SELECT COUNT(*) FROM teacher_round_roll_call_records r WHERE r.log_id = lg.id) AS record_count
             FROM teacher_round_roll_call_logs lg
             WHERE lg.school_id = ?
               AND (${sqlNormLabelEquals('lg.class_name')})
               AND lg.record_date = ?
             ORDER BY lg.roll_label ASC`,
            [schoolId, className, recordDate]
        );

        const sessions = (rows || []).map((r) => ({
            roll_label: String(r.roll_label ?? ''),
            log_exists: Number(r.record_count) > 0,
            record_count: Number(r.record_count) || 0,
            log_id: r.log_id,
        }));

        res.json({ success: true, data: { sessions } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to list round roll sessions' });
    }
});

// ============================================================
// GET /api/teacher-portal/round-roll-call  ?class_name=&date=&roll_label=
// Full-class roll (no period) — present / absent / excused
// ============================================================
router.get('/round-roll-call', requireTeacherRole, async (req, res) => {
    try {
        await ensureTeacherTables();
        const schoolId = resolveSchoolId(req);
        if (!schoolId) return res.status(400).json({ success: false, message: 'No school linked' });

        const className = normalizeGradebookLabel(req.query.class_name || '');
        const recordDate = toSqlDate(req.query.date || new Date().toISOString().slice(0, 10));
        const rollLabel = normalizeRollLabel(req.query.roll_label);
        if (!className) {
            return res.status(400).json({ success: false, message: 'class_name is required' });
        }

        const lookupDate = recordDate;
        const [stuRows] = await promisePool.query(
            `SELECT s.id AS row_id, s.student_uid,
                    TRIM(CONCAT(COALESCE(s.first_name, ''), ' ', COALESCE(s.last_name, ''))) AS student_name,
                    s.gender, s.class_name,
                    (SELECT permission_type FROM student_permissions
                     WHERE student_id = s.id AND status = 'APPROVED'
                     AND (DATE(starts_at) = ? OR DATE(ends_at) = ? OR (? BETWEEN DATE(starts_at) AND DATE(ends_at)))
                     LIMIT 1) AS active_permission
             FROM students s
             WHERE s.school_id = ? AND (${sqlNormLabelEquals('s.class_name')})
             ORDER BY s.first_name ASC, s.last_name ASC
             LIMIT 500`,
            [lookupDate, lookupDate, lookupDate, schoolId, className]
        );

        const [logs] = await promisePool.query(
            `SELECT id FROM teacher_round_roll_call_logs
             WHERE school_id = ? AND (${sqlNormLabelEquals('class_name')}) AND record_date = ? AND roll_label = ?
             LIMIT 1`,
            [schoolId, className, recordDate, rollLabel]
        );
        let byStudentId = {};
        if (logs.length) {
            const logId = logs[0].id;
            const [recs] = await promisePool.query(
                'SELECT student_id, status, remarks FROM teacher_round_roll_call_records WHERE log_id = ?',
                [logId]
            );
            byStudentId = Object.fromEntries(
                recs.map((r) => [r.student_id, { status: r.status, remarks: r.remarks || '' }])
            );
        }

        const roster = (stuRows || []).map((s) => {
            const saved = byStudentId[s.row_id];
            const statusUi = saved ? roundRollDbToUi(saved.status) : 'present';
            return {
                id: s.row_id,
                adm: s.student_uid,
                name: String(s.student_name || '').trim() || '—',
                gender: s.gender === 'Male' ? 'M' : s.gender === 'Female' ? 'F' : '—',
                status: statusUi,
                remarks: saved?.remarks || '',
                active_permission: s.active_permission,
            };
        });

        res.json({
            success: true,
            data: {
                class_name: className,
                date: recordDate,
                roll_label: rollLabel,
                log_exists: !!logs.length,
                roster,
            },
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to load round roll call' });
    }
});

// ============================================================
// POST /api/teacher-portal/round-roll-call
// Body: { class_name, date, roll_label, records: [{ student_id, status, remarks? }] }
// ============================================================
router.post('/round-roll-call', requireTeacherRole, async (req, res) => {
    const conn = await promisePool.getConnection();
    try {
        await ensureTeacherTables();
        const schoolId = resolveSchoolId(req);
        const userId = resolveUserId(req);
        if (!schoolId) return res.status(400).json({ success: false, message: 'No school linked' });

        const className = normalizeGradebookLabel(req.body?.class_name || '');
        const recordDate = toSqlDate(req.body?.date || new Date().toISOString().slice(0, 10));
        const rollLabel = normalizeRollLabel(req.body?.roll_label);
        const records = req.body?.records;
        if (!className || !Array.isArray(records)) {
            return res.status(400).json({ success: false, message: 'class_name and records[] are required' });
        }
        if (!rollLabel) {
            return res.status(400).json({ success: false, message: 'roll_label is required (e.g. Morning Prep)' });
        }

        await conn.beginTransaction();

        const [existing] = await conn.query(
            `SELECT id FROM teacher_round_roll_call_logs
             WHERE school_id = ? AND (${sqlNormLabelEquals('class_name')}) AND record_date = ? AND roll_label = ?
             LIMIT 1`,
            [schoolId, className, recordDate, rollLabel]
        );

        let logId = existing[0]?.id;
        if (!logId) {
            const [ins] = await conn.query(
                `INSERT INTO teacher_round_roll_call_logs (school_id, class_name, record_date, roll_label, recorded_by_user_id)
                 VALUES (?, ?, ?, ?, ?)`,
                [schoolId, className, recordDate, rollLabel, userId]
            );
            logId = ins.insertId;
        } else {
            await conn.query(
                'UPDATE teacher_round_roll_call_logs SET recorded_by_user_id = ? WHERE id = ?',
                [userId, logId]
            );
            await conn.query('DELETE FROM teacher_round_roll_call_records WHERE log_id = ?', [logId]);
        }

        for (const r of records) {
            const sid = Number(r.student_id || 0);
            if (!sid) continue;
            const rawStatus = String(r.status || 'present').toLowerCase();
            let st = 'Present';
            if (rawStatus === 'absent') st = 'Absent';
            else if (rawStatus === 'excused' || rawStatus === 'permission') st = 'Excused';
            else st = normalizeAttendanceStatusDb(r.status);
            await conn.query(
                `INSERT INTO teacher_round_roll_call_records (log_id, student_id, status, remarks)
                 VALUES (?, ?, ?, ?)`,
                [logId, sid, st, r.remarks ? String(r.remarks).slice(0, 255) : null]
            );
        }

        await conn.commit();
        res.json({ success: true, message: 'Round roll call saved', data: { log_id: logId } });
    } catch (err) {
        await conn.rollback().catch(() => {});
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to save round roll call' });
    } finally {
        conn.release();
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

        const { day, class_name, term, academic_year } = req.query;
        const wide = isSchoolWideTimetableRole(req);
        let query = `
            SELECT tt.id, tt.subject_name AS subject, tt.class_name AS \`group\`, tt.room,
                   CONCAT(tt.start_time, " - ", tt.end_time) AS time, tt.day_of_week AS day, tt.staff_id,
                   tt.term, tt.academic_year,
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
        if (class_name) {
            query += ` AND (${sqlNormLabelEquals('tt.class_name')})`;
            params.push(normalizeGradebookLabel(class_name));
        }
        if (term) {
            query += ' AND TRIM(COALESCE(tt.term, "")) = ?';
            params.push(String(term).trim());
        }
        if (academic_year) {
            query += ' AND TRIM(COALESCE(tt.academic_year, "")) = ?';
            params.push(String(academic_year).trim());
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

router.get('/timetable-filters', requireTeacherRole, async (req, res) => {
    try {
        const schoolId = resolveSchoolId(req);
        const userId = resolveUserId(req);
        if (!schoolId) return res.status(400).json({ success: false, message: 'No school linked' });

        const wide = isSchoolWideTimetableRole(req);
        const whereClause = wide ? 'WHERE school_id = ?' : 'WHERE school_id = ? AND staff_id = ?';
        const whereParams = wide ? [schoolId] : [schoolId, userId];
        const [rows] = await promisePool.query(
            `SELECT DISTINCT class_name, term, academic_year
             FROM academic_timetables
             ${whereClause}
             ORDER BY class_name ASC`,
            whereParams
        );

        const classes = Array.from(
            new Set((rows || []).map((r) => normalizeGradebookLabel(r.class_name)).filter(Boolean))
        );
        const terms = Array.from(new Set((rows || []).map((r) => String(r.term || '').trim()).filter(Boolean)));
        const academicYears = Array.from(
            new Set((rows || []).map((r) => String(r.academic_year || '').trim()).filter(Boolean))
        );

        const [[settingsRow]] = await promisePool.query(
            `SELECT current_academic_year, active_terms_json
             FROM school_academic_settings
             WHERE school_id = ?
             LIMIT 1`,
            [schoolId]
        ).catch(() => [[null]]);
        if (settingsRow?.current_academic_year && !academicYears.includes(settingsRow.current_academic_year)) {
            academicYears.unshift(String(settingsRow.current_academic_year).trim());
        }
        if (settingsRow?.active_terms_json) {
            try {
                const parsed = Array.isArray(settingsRow.active_terms_json)
                    ? settingsRow.active_terms_json
                    : JSON.parse(settingsRow.active_terms_json);
                for (const t of parsed || []) {
                    const term = String(t || '').trim();
                    if (term && !terms.includes(term)) terms.push(term);
                }
            } catch (_) {
                /* ignore malformed settings */
            }
        }

        res.json({ success: true, data: { classes, terms, academicYears } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to load timetable filters' });
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
            'SELECT student_id, status, remarks FROM academic_attendance_records WHERE log_id = ?',
            [logId]
        );
        const records = recs.map((r) => ({
            student_id: r.student_id,
            status: attendanceDbToUi(r.status),
            remarks: r.remarks || '',
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
               'INSERT INTO academic_attendance_records (log_id, student_id, status, remarks) VALUES (?, ?, ?, ?)',
               [logId, r.student_id, st, r.remarks ? String(r.remarks).slice(0, 255) : null]
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

router.get('/attendance-summary/daily', requireTeacherRole, async (req, res) => {
    try {
        const schoolId = resolveSchoolId(req);
        const userId = resolveUserId(req);
        if (!schoolId) return res.status(400).json({ success: false, message: 'No school linked' });

        const date = req.query.date || new Date().toISOString().slice(0, 10);
        const className = req.query.class_name ? normalizeGradebookLabel(req.query.class_name) : null;
        let classSql = '';
        const params = [schoolId, date, userId];
        if (className) {
            classSql = ` AND (${sqlNormLabelEquals('tt.class_name')})`;
            params.push(className);
        }

        const [rows] = await promisePool.query(
            `SELECT tt.class_name, tt.subject_name,
                    COUNT(ar.id) AS total_students,
                    SUM(CASE WHEN LOWER(TRIM(ar.status)) = 'present' THEN 1 ELSE 0 END) AS present_count,
                    SUM(CASE WHEN LOWER(TRIM(ar.status)) = 'absent' THEN 1 ELSE 0 END) AS absent_count,
                    SUM(CASE WHEN LOWER(TRIM(ar.status)) = 'late' THEN 1 ELSE 0 END) AS late_count,
                    SUM(CASE WHEN LOWER(TRIM(ar.status)) = 'excused' THEN 1 ELSE 0 END) AS excused_count
             FROM academic_attendance_logs al
             INNER JOIN academic_timetables tt ON tt.id = al.timetable_id AND tt.school_id = al.school_id
             INNER JOIN academic_attendance_records ar ON ar.log_id = al.id
             WHERE al.school_id = ? AND al.record_date = ? AND al.recorded_by_user_id = ?${classSql}
             GROUP BY tt.class_name, tt.subject_name
             ORDER BY tt.class_name ASC, tt.subject_name ASC`,
            params
        );

        res.json({ success: true, data: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to load daily summary' });
    }
});

router.get('/attendance-summary/weekly', requireTeacherRole, async (req, res) => {
    try {
        const schoolId = resolveSchoolId(req);
        const userId = resolveUserId(req);
        if (!schoolId) return res.status(400).json({ success: false, message: 'No school linked' });

        const anchor = req.query.date ? new Date(req.query.date) : new Date();
        const day = anchor.getDay();
        const monday = new Date(anchor);
        monday.setDate(anchor.getDate() - ((day + 6) % 7));
        const friday = new Date(monday);
        friday.setDate(monday.getDate() + 4);
        const toIso = (d) => d.toISOString().slice(0, 10);

        const [rows] = await promisePool.query(
            `SELECT s.student_uid, CONCAT(s.first_name, ' ', s.last_name) AS student_name,
                    al.record_date, ar.status
             FROM academic_attendance_logs al
             INNER JOIN academic_attendance_records ar ON ar.log_id = al.id
             INNER JOIN students s ON s.student_uid = ar.student_id AND s.school_id = al.school_id
             WHERE al.school_id = ? AND al.recorded_by_user_id = ?
               AND al.record_date BETWEEN ? AND ?
             ORDER BY student_name ASC, al.record_date ASC`,
            [schoolId, userId, toIso(monday), toIso(friday)]
        );

        res.json({ success: true, data: { start: toIso(monday), end: toIso(friday), rows } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to load weekly summary' });
    }
});

router.get('/teacher-attendance', requireTeacherRole, async (req, res) => {
    try {
        const schoolId = resolveSchoolId(req);
        const userId = resolveUserId(req);
        if (!schoolId) return res.status(400).json({ success: false, message: 'No school linked' });
        const date = req.query.date || new Date().toISOString().slice(0, 10);
        const [[row]] = await promisePool.query(
            `SELECT id, record_date, status, remarks
             FROM teacher_attendance_logs
             WHERE school_id = ? AND teacher_user_id = ? AND record_date = ?
             LIMIT 1`,
            [schoolId, userId, date]
        );
        res.json({ success: true, data: row || null });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to load teacher attendance' });
    }
});

router.post('/teacher-attendance', requireTeacherRole, async (req, res) => {
    try {
        const schoolId = resolveSchoolId(req);
        const userId = resolveUserId(req);
        if (!schoolId) return res.status(400).json({ success: false, message: 'No school linked' });

        const recordDate = req.body.date || new Date().toISOString().slice(0, 10);
        const statusRaw = String(req.body.status || 'Present').toLowerCase();
        const statusMap = {
            present: 'Present',
            absent: 'Absent',
            late: 'Late',
            excused: 'Excused',
        };
        const status = statusMap[statusRaw] || 'Present';
        const remarks = req.body.remarks ? String(req.body.remarks).slice(0, 255) : null;

        await promisePool.query(
            `INSERT INTO teacher_attendance_logs (school_id, teacher_user_id, record_date, status, remarks)
             VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE status = VALUES(status), remarks = VALUES(remarks), updated_at = CURRENT_TIMESTAMP`,
            [schoolId, userId, recordDate, status, remarks]
        );

        res.json({ success: true, message: 'Teacher attendance saved' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to save teacher attendance' });
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
                    SUM(CASE WHEN m.mark_code IS NULL OR TRIM(m.mark_code) = '' THEN m.score_obtained ELSE 0 END) AS score_sum,
                    SUM(CASE WHEN m.mark_code IS NULL OR TRIM(m.mark_code) = '' THEN a.max_score ELSE 0 END) AS max_sum
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
        const percentMap = {};
        for (const row of agg) {
            const key = `${row.student_id}:${row.slug}`;
            scoreMap[key] = Number(row.score_sum);
            const maxSum = Number(row.max_sum);
            percentMap[key] = maxSum > 0 ? (Number(row.score_sum) / maxSum) * 100 : null;
        }

        const typeWeights = await fetchActiveAssessmentTypes(schoolId);

        const matrix = students.map((s) => {
            const scores = {};
            const category_percent = {};
            for (const col of columns) {
                const k = `${s.id}:${col.slug}`;
                scores[col.slug] = Object.prototype.hasOwnProperty.call(scoreMap, k) ? scoreMap[k] : null;
                category_percent[col.slug] = Object.prototype.hasOwnProperty.call(percentMap, k) ? percentMap[k] : null;
            }
            return {
                student_id: s.id,
                student_uid: s.student_uid,
                name: `${s.first_name} ${s.last_name}`.trim(),
                gender: s.gender,
                scores,
                category_percent,
            };
        });

        const studentsWithWeights = buildWeightedSummary(matrix, columns, typeWeights);

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
                assessment_types: typeWeights.map((t) => ({
                    id: t.id,
                    name: t.name,
                    slug: t.slug,
                    weight_percent: Number(t.weight_percent),
                    default_max_score: t.default_max_score != null ? Number(t.default_max_score) : null,
                })),
                students: studentsWithWeights,
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

// ============================================================
// GET /api/teacher-portal/teaching-assignments
// Cards for Record Marks wizard — class + subject + counts
// ============================================================
router.get('/teaching-assignments', requireTeacherRole, async (req, res) => {
    try {
        const schoolId = resolveSchoolId(req);
        const userId = resolveUserId(req);
        if (!schoolId || !userId) {
            return res.status(400).json({ success: false, message: 'No school linked' });
        }
        const calendar = await loadSchoolAcademicCalendar(schoolId);
        const academicYear = String(req.query.academic_year || '').trim()
            || calendar.currentAcademicYear;
        const yearTerms = calendar.termsByYear[academicYear] || calendar.terms;
        const term = String(req.query.term || '').trim()
            || inferTermFromMonth(yearTerms);

        await ensureTeacherAssignmentsTable();
        let assignments = await fetchTeachingAssignmentsForTeacher(schoolId, userId, { academicYear, term });
        let syncedFromTimetable = false;

        if (!assignments.length) {
            await syncTeachingAssignmentsFromTimetable(schoolId).catch(() => {});
            syncedFromTimetable = true;
            assignments = await fetchTeachingAssignmentsForTeacher(schoolId, userId, { academicYear, term });
        }

        if (!assignments.length) {
            const legacyPairs = await fetchTeacherAssignmentPairsLegacy(schoolId, userId);
            const [stuResult] = await promisePool.query(
                `SELECT class_name, COUNT(*) AS student_count
                 FROM students
                 WHERE school_id = ? AND class_name IS NOT NULL AND TRIM(class_name) <> ''
                 GROUP BY class_name`,
                [schoolId],
            );
            const countByClass = {};
            for (const r of stuResult || []) {
                const cn = normalizeGradebookLabel(r.class_name);
                if (cn) countByClass[cn.toLowerCase()] = Number(r.student_count) || 0;
            }
            assignments = legacyPairs.map((p) => ({
                id: `${p.class_name}\0${p.subject_name}`,
                assignment_id: null,
                class_name: p.class_name,
                subject_name: p.subject_name,
                academic_year: academicYear,
                term,
                student_count: countByClass[p.class_name.toLowerCase()] || 0,
                source: 'timetable_legacy',
            }));
        }

        res.json({
            success: true,
            data: {
                assignments,
                academic_year: academicYear,
                current_academic_year: calendar.currentAcademicYear,
                academic_years: calendar.academicYears,
                term,
                terms: yearTerms,
                synced_from_timetable: syncedFromTimetable,
                source: assignments[0]?.source || 'permanent',
            },
        });
    } catch (err) {
        console.error('GET /teacher-portal/teaching-assignments:', err);
        res.status(500).json({ success: false, message: 'Failed to load teaching assignments' });
    }
});

// ============================================================
// GET /api/teacher-portal/assessment-types
// Read-only DOS assessment framework for teachers
// ============================================================
router.get('/assessment-types', requireTeacherRole, async (req, res) => {
    try {
        const schoolId = resolveSchoolId(req);
        if (!schoolId) return res.status(400).json({ success: false, message: 'No school linked' });
        const rows = await fetchActiveAssessmentTypes(schoolId);
        const totalWeight = rows.reduce((s, r) => s + (Number(r.weight_percent) || 0), 0);
        res.json({
            success: true,
            data: {
                rows: rows.map((r) => ({
                    id: r.id,
                    name: r.name,
                    slug: r.slug,
                    weight_percent: Number(r.weight_percent),
                    sort_order: r.sort_order,
                    default_max_score: r.default_max_score != null ? Number(r.default_max_score) : null,
                })),
                total_weight: totalWeight,
            },
        });
    } catch (err) {
        console.error('GET /teacher-portal/assessment-types:', err);
        res.status(500).json({ success: false, message: 'Failed to load assessment types' });
    }
});

// ============================================================
// GET /api/teacher-portal/assessment-context
// Suggestions, duplicate check, type stats for wizard step 2
// ============================================================
router.get('/assessment-context', requireTeacherRole, async (req, res) => {
    try {
        const schoolId = resolveSchoolId(req);
        if (!schoolId) return res.status(400).json({ success: false, message: 'No school linked' });
        const class_name = normalizeGradebookLabel(req.query.class_name);
        const subject_name = normalizeGradebookLabel(req.query.subject_name);
        const column_slug = req.query.column_slug ? String(req.query.column_slug).trim().toLowerCase() : '';
        if (!class_name || !subject_name) {
            return res.status(400).json({ success: false, message: 'class_name and subject_name required' });
        }

        const [assessments] = await promisePool.query(
            `SELECT id, assessment_name, max_score, column_slug, status, created_at
             FROM academic_assessments
             WHERE school_id = ?
               AND (${sqlNormLabelEquals('class_name')})
               AND (${sqlNormLabelEquals('subject_name')})
             ORDER BY created_at DESC, id DESC`,
            [schoolId, class_name, subject_name]
        );

        const typeRows = await fetchActiveAssessmentTypes(schoolId);
        const typeInfo = column_slug
            ? typeRows.find((t) => t.slug === column_slug)
            : null;

        const filtered = column_slug
            ? assessments.filter((a) => String(a.column_slug || '').toLowerCase() === column_slug)
            : assessments;

        const typeName = typeInfo?.name || column_slug || 'Assessment';
        const existingNames = filtered.map((a) => String(a.assessment_name).trim().toLowerCase());
        const suggestions = [];
        for (let i = 1; i <= 5; i += 1) {
            const name = `${typeName} ${i}`;
            if (!existingNames.includes(name.toLowerCase())) suggestions.push(name);
        }

        res.json({
            success: true,
            data: {
                assessments: filtered,
                assessment_count: filtered.length,
                type_weight_percent: typeInfo ? Number(typeInfo.weight_percent) : null,
                type_name: typeInfo?.name || null,
                default_max_score: typeInfo?.default_max_score != null ? Number(typeInfo.default_max_score) : 20,
                suggestions,
            },
        });
    } catch (err) {
        console.error('GET /teacher-portal/assessment-context:', err);
        res.status(500).json({ success: false, message: 'Failed to load assessment context' });
    }
});

// ============================================================
// POST /api/teacher-portal/register-marks
// Atomic: create/update assessment + bulk marks (draft or published)
// ============================================================
router.post('/register-marks', requireTeacherRole, async (req, res) => {
    try {
        await ensureAcademicMarksExtras();
        const schoolId = resolveSchoolId(req);
        const userId = resolveUserId(req);
        if (!schoolId || !userId) {
            return res.status(400).json({ success: false, message: 'No school linked' });
        }

        const {
            assessment_id: existingId,
            teacher_assignment_id: bodyAssignmentId,
            class_name: rawClass,
            subject_name: rawSubj,
            assessment_name,
            max_score,
            column_slug,
            assessment_date,
            description,
            status,
            marks,
            term: bodyTerm,
            academic_year: bodyAcademicYear,
        } = req.body;

        const class_name = normalizeGradebookLabel(rawClass);
        const subject_name = normalizeGradebookLabel(rawSubj);
        const name = String(assessment_name || '').trim();
        const publishStatus = status === 'draft' ? 'draft' : 'published';

        if (!class_name || !subject_name || !name) {
            return res.status(400).json({ success: false, message: 'class_name, subject_name, and assessment_name required' });
        }
        const hasAssignment = await teacherHasAssignment(
            schoolId, userId, class_name, subject_name, bodyAssignmentId,
        );
        if (!hasAssignment) {
            return res.status(403).json({
                success: false,
                message: 'You are not assigned to teach this class and subject. Contact DOS.',
            });
        }
        const teacherAssignmentId = await resolveAssignmentIdForTeacher(
            schoolId, userId, class_name, subject_name, bodyAssignmentId,
        );
        if (!marks || !Array.isArray(marks)) {
            return res.status(400).json({ success: false, message: 'marks array required' });
        }

        const slug = column_slug != null && String(column_slug).trim() !== ''
            ? String(column_slug).trim().toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 40)
            : null;

        const calendar = await getSchoolAcademicCalendarSettings(schoolId);
        const assessmentTerm = String(bodyTerm || '').trim()
            || inferTermFromMonth(calendar.active_terms);
        const assessmentYear = String(bodyAcademicYear || '').trim()
            || calendar.current_academic_year
            || await fetchSchoolAcademicYear(schoolId);

        let assessmentId = existingId ? Number(existingId) : null;

        if (!assessmentId) {
            const [dup] = await promisePool.query(
                `SELECT id FROM academic_assessments
                 WHERE school_id = ?
                   AND (${sqlNormLabelEquals('class_name')})
                   AND (${sqlNormLabelEquals('subject_name')})
                   AND LOWER(TRIM(assessment_name)) = LOWER(TRIM(?))
                 LIMIT 1`,
                [schoolId, class_name, subject_name, name]
            );
            if (dup.length) {
                return res.status(409).json({
                    success: false,
                    message: `"${name}" already exists for this class and subject.`,
                    duplicate: true,
                    assessment_id: dup[0].id,
                });
            }

            const [r] = await promisePool.query(
                `INSERT INTO academic_assessments
                 (school_id, class_name, subject_name, assessment_name, max_score, assessment_type, column_slug,
                  assessment_date, description, status, created_by_user_id, teacher_assignment_id, term, academic_year)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    schoolId,
                    class_name,
                    subject_name,
                    name,
                    max_score || 100,
                    'TEACHER_CUSTOM',
                    slug,
                    assessment_date || null,
                    description || null,
                    publishStatus,
                    userId,
                    teacherAssignmentId,
                    assessmentTerm || null,
                    assessmentYear || null,
                ]
            );
            assessmentId = Number(r.insertId);
            if (!assessmentId) {
                return res.status(500).json({
                    success: false,
                    message: 'Failed to create assessment — database id not generated. Contact administrator.',
                });
            }
        } else {
            await promisePool.query(
                `UPDATE academic_assessments
                 SET max_score = ?, assessment_date = ?, description = ?, status = ?, column_slug = COALESCE(?, column_slug)
                 WHERE id = ? AND school_id = ?`,
                [max_score || 100, assessment_date || null, description || null, publishStatus, slug, assessmentId, schoolId]
            );
        }

        const maxVal = Number(max_score) || 100;
        let saved = 0;
        const atRisk = [];

        for (const m of marks) {
            const studentId = Number(m.student_id);
            if (!studentId) continue;
            const code = m.mark_code ? String(m.mark_code).trim().toUpperCase() : null;
            let score = null;

            if (code && ['A', 'E', 'M'].includes(code)) {
                await promisePool.query(
                    `INSERT INTO academic_marks (school_id, assessment_id, student_id, score_obtained, mark_code, recorded_by_user_id)
                     VALUES (?, ?, ?, NULL, ?, ?)
                     ON DUPLICATE KEY UPDATE score_obtained = NULL, mark_code = VALUES(mark_code)`,
                    [schoolId, assessmentId, studentId, code, userId]
                );
                saved += 1;
                continue;
            }

            if (m.value === '' || m.value == null) continue;
            score = Number(m.value);
            if (!Number.isFinite(score)) continue;
            if (score > maxVal) {
                return res.status(400).json({
                    success: false,
                    message: `Maximum marks is ${maxVal}`,
                    student_id: studentId,
                });
            }

            await promisePool.query(
                `INSERT INTO academic_marks (school_id, assessment_id, student_id, score_obtained, mark_code, recorded_by_user_id)
                 VALUES (?, ?, ?, ?, NULL, ?)
                 ON DUPLICATE KEY UPDATE score_obtained = VALUES(score_obtained), mark_code = NULL`,
                [schoolId, assessmentId, studentId, score, userId]
            );
            saved += 1;
            const pct = maxVal > 0 ? (score / maxVal) * 100 : 0;
            if (pct < 40) atRisk.push({ student_id: studentId, percent: Math.round(pct * 10) / 10 });
        }

        const numericMarks = marks.filter((m) => {
            const code = m.mark_code ? String(m.mark_code).trim().toUpperCase() : '';
            if (code && ['A', 'E', 'M'].includes(code)) return false;
            return m.value !== '' && m.value != null && Number.isFinite(Number(m.value));
        });
        const values = numericMarks.map((m) => Number(m.value));
        const stats = values.length
            ? {
                highest: Math.max(...values),
                lowest: Math.min(...values),
                average: Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10,
                pass_rate: Math.round((values.filter((v) => (v / maxVal) * 100 >= 50).length / values.length) * 1000) / 10,
                filled: values.length,
            }
            : { highest: null, lowest: null, average: null, pass_rate: null, filled: 0 };

        res.json({
            success: true,
            assessment_id: assessmentId,
            status: publishStatus,
            marks_saved: saved,
            statistics: stats,
            at_risk: atRisk,
            message: publishStatus === 'draft' ? 'Draft saved' : 'Marks published successfully',
        });

        if (publishStatus === 'published' && saved > 0) {
            setImmediate(async () => {
                try {
                    const [[schoolRow]] = await promisePool.query(
                        'SELECT school_name FROM schools WHERE id = ? LIMIT 1',
                        [schoolId],
                    );
                    const [[teacherRow]] = await promisePool.query(
                        'SELECT first_name, last_name FROM users WHERE id = ? LIMIT 1',
                        [userId],
                    );
                    const teacherName = `${teacherRow?.first_name || ''} ${teacherRow?.last_name || ''}`.trim() || 'Teacher';
                    const schoolName = schoolRow?.school_name || 'School';
                    const notified = new Set();
                    for (const m of marks) {
                        const studentId = Number(m.student_id);
                        if (!studentId || notified.has(studentId)) continue;
                        const code = m.mark_code ? String(m.mark_code).trim().toUpperCase() : null;
                        const hasValue = code && ['A', 'E', 'M'].includes(code)
                            ? true
                            : m.value !== '' && m.value != null && Number.isFinite(Number(m.value));
                        if (!hasValue) continue;
                        notified.add(studentId);
                        const [[stu]] = await promisePool.query(
                            'SELECT first_name, last_name, student_uid, student_code FROM students WHERE id = ? LIMIT 1',
                            [studentId],
                        );
                        const studentName = `${stu?.first_name || ''} ${stu?.last_name || ''}`.trim() || 'Student';
                        const studentRef = stu?.student_code || stu?.student_uid || String(studentId);
                        await notifyStudentParentsMarks(studentId, {
                            studentName,
                            schoolName,
                            subject: subject_name,
                            assessmentName: name,
                            score: code ? null : Number(m.value),
                            maxScore: maxVal,
                            markCodeLabel: code ? markCodeLabel(code) : null,
                            teacherName,
                            studentRef,
                            schoolId,
                            assessmentId,
                        });
                    }
                } catch (notifyErr) {
                    console.warn('[register-marks/parent-notify]', notifyErr.message);
                }
            });
        }
    } catch (err) {
        console.error('POST /teacher-portal/register-marks:', err);
        res.status(500).json({ success: false, message: 'Failed to register marks' });
    }
});

// ============================================================
// GET /api/teacher-portal/marks-center
// Gradebook hub — scoped to teacher timetable assignments only
// ============================================================
router.get('/marks-center', requireTeacherRole, async (req, res) => {
    try {
        await ensureAcademicMarksExtras();
        const schoolId = resolveSchoolId(req);
        const userId = resolveUserId(req);
        if (!schoolId || !userId) {
            return res.status(400).json({ success: false, message: 'No school linked' });
        }

        const pairs = await fetchTeacherAssignmentPairs(schoolId, userId);
        if (!pairs.length) {
            return res.json({
                success: true,
                data: {
                    filters: { academic_years: [], terms: [], classes: [], courses: [], assessment_types: [], assessments: [] },
                    empty_reason: 'No teaching assignments on your timetable. Contact DOS to assign classes.',
                },
            });
        }

        const calendar = await loadSchoolAcademicCalendar(schoolId);
        const academicYear = String(req.query.academic_year || '').trim()
            || calendar.currentAcademicYear;
        const yearTerms = calendar.termsByYear[academicYear] || calendar.terms;
        const term = String(req.query.term || '').trim()
            || inferTermFromMonth(yearTerms);

        const class_name = normalizeGradebookLabel(req.query.class_name);
        const subject_name = normalizeGradebookLabel(req.query.subject_name);
        const column_slug = req.query.column_slug ? String(req.query.column_slug).trim().toLowerCase() : '';
        const assessment_id = req.query.assessment_id ? Number(req.query.assessment_id) : null;
        const student_search = String(req.query.student_search || '').trim().toLowerCase();

        const classes = [...new Set(pairs.map((p) => p.class_name))].sort();
        const selClass = class_name && classes.some((c) => c.toLowerCase() === class_name.toLowerCase())
            ? classes.find((c) => c.toLowerCase() === class_name.toLowerCase())
            : classes[0];
        const coursesForClass = pairs
            .filter((p) => p.class_name.toLowerCase() === selClass.toLowerCase())
            .map((p) => p.subject_name);
        const selSubject = subject_name && coursesForClass.some((s) => s.toLowerCase() === subject_name.toLowerCase())
            ? coursesForClass.find((s) => s.toLowerCase() === subject_name.toLowerCase())
            : coursesForClass[0];

        if (!selClass || !selSubject) {
            return res.json({ success: true, data: { filters: { classes, courses: [] }, empty_reason: 'Select a class and course.' } });
        }

        const allowed = await teacherHasAssignment(schoolId, userId, selClass, selSubject);
        if (!allowed) {
            return res.status(403).json({ success: false, message: 'You are not assigned to this class and course.' });
        }

        const typeWeights = await fetchActiveAssessmentTypes(schoolId);
        const typeMap = Object.fromEntries(typeWeights.map((t) => [String(t.slug).toLowerCase(), t]));

        let assessmentSql = `
            SELECT id, assessment_name, max_score, column_slug, status, assessment_date, created_at
            FROM academic_assessments
            WHERE school_id = ?
              AND (${sqlNormLabelEquals('class_name')})
              AND (${sqlNormLabelEquals('subject_name')})
              AND (status IS NULL OR status = 'published' OR status = 'draft')`;
        const assessmentParams = [schoolId, selClass, selSubject];
        if (column_slug) {
            assessmentSql += ' AND LOWER(TRIM(column_slug)) = ?';
            assessmentParams.push(column_slug);
        }
        if (academicYear) {
            assessmentSql += ' AND (academic_year IS NULL OR TRIM(academic_year) = ? OR TRIM(academic_year) = \'\')';
            assessmentParams.push(academicYear);
        }
        if (term) {
            assessmentSql += ' AND (term IS NULL OR TRIM(term) = ? OR TRIM(term) = \'\')';
            assessmentParams.push(term);
        }
        assessmentSql += ' ORDER BY created_at ASC, id ASC';
        const [assessmentRows] = await promisePool.query(assessmentSql, assessmentParams);

        const slugCounts = {};
        const assessments = assessmentRows.map((a, i) => {
            const slugKey = String(a.column_slug || '').toLowerCase();
            slugCounts[slugKey] = (slugCounts[slugKey] || 0) + 1;
            return {
                id: a.id,
                assessment_name: a.assessment_name,
                short_label: shortAssessmentLabel(a.assessment_name, slugCounts[slugKey] - 1, a.column_slug),
                max_score: Number(a.max_score),
                column_slug: a.column_slug,
                type_name: typeMap[String(a.column_slug || '').toLowerCase()]?.name || a.column_slug || 'Other',
                status: a.status || 'published',
                assessment_date: a.assessment_date,
                created_at: a.created_at,
            };
        });

        const selAssessment = assessment_id
            ? assessments.find((a) => a.id === assessment_id) || assessments[assessments.length - 1]
            : assessments[assessments.length - 1] || null;

        const [students] = await promisePool.query(
            `SELECT id, student_uid, first_name, last_name, gender, class_name
             FROM students
             WHERE school_id = ? AND (${sqlNormLabelEquals('class_name')})
             ORDER BY first_name ASC, last_name ASC`,
            [schoolId, selClass]
        );

        const assessmentIds = assessments.map((a) => a.id);
        let marksRows = [];
        if (assessmentIds.length) {
            const [mr] = await promisePool.query(
                `SELECT m.student_id, m.assessment_id, m.score_obtained, m.mark_code, a.max_score
                 FROM academic_marks m
                 INNER JOIN academic_assessments a ON a.id = m.assessment_id
                 WHERE m.school_id = ? AND m.assessment_id IN (?)`,
                [schoolId, assessmentIds]
            );
            marksRows = mr;
        }

        const markLookup = {};
        for (const m of marksRows) {
            markLookup[`${m.student_id}:${m.assessment_id}`] = m;
        }

        const classSubjects = pairs.filter((p) => p.class_name.toLowerCase() === selClass.toLowerCase());

        const studentRows = [];
        for (const s of students) {
            const name = `${s.first_name} ${s.last_name}`.trim();
            if (student_search && !name.toLowerCase().includes(student_search) && !String(s.student_uid || '').toLowerCase().includes(student_search)) {
                continue;
            }
            const marks = {};
            const percents = [];
            let missing = 0;
            for (const a of assessments) {
                const cell = markLookup[`${s.id}:${a.id}`];
                if (!cell || (cell.score_obtained == null && !cell.mark_code)) {
                    marks[a.id] = null;
                    missing += 1;
                    continue;
                }
                if (cell.mark_code) {
                    marks[a.id] = { value: null, percent: null, mark_code: cell.mark_code, max_score: a.max_score };
                    continue;
                }
                const val = Number(cell.score_obtained);
                const pct = a.max_score > 0 ? Math.round((val / a.max_score) * 1000) / 10 : null;
                marks[a.id] = { value: val, percent: pct, mark_code: null, max_score: a.max_score };
                if (pct != null) percents.push(pct);
            }
            const average_percent = percents.length
                ? Math.round((percents.reduce((x, y) => x + y, 0) / percents.length) * 10) / 10
                : null;

            studentRows.push({
                student_id: s.id,
                student_uid: s.student_uid,
                name,
                gender: s.gender,
                marks,
                average_percent,
                grade: letterGradeFromPercent(average_percent),
                missing_count: missing,
            });
        }

        let student_detail = null;
        const detailStudentId = req.query.student_id ? Number(req.query.student_id) : null;
        if (detailStudentId) {
            const base = studentRows.find((r) => r.student_id === detailStudentId);
            if (base) {
                const subject_averages = [];
                for (const sub of classSubjects) {
                    const avg = await computeStudentSubjectAverage(schoolId, selClass, sub.subject_name, detailStudentId, typeWeights);
                    if (avg != null) subject_averages.push({ subject_name: sub.subject_name, average_percent: avg });
                }
                student_detail = { ...base, subject_averages };
            }
        }

        studentRows.sort((a, b) => (b.average_percent ?? -1) - (a.average_percent ?? -1));
        studentRows.forEach((row, i) => { row.position = row.average_percent != null ? i + 1 : null; });

        const allPercents = [];
        for (const row of studentRows) {
            for (const a of assessments) {
                const m = row.marks[a.id];
                if (m?.percent != null) allPercents.push(m.percent);
            }
        }

        const kpis = {
            total_students: studentRows.length,
            average_percent: allPercents.length
                ? Math.round((allPercents.reduce((x, y) => x + y, 0) / allPercents.length) * 10) / 10
                : null,
            highest: allPercents.length ? Math.max(...allPercents) : null,
            lowest: allPercents.length ? Math.min(...allPercents) : null,
            pass_rate: allPercents.length
                ? Math.round((allPercents.filter((p) => p >= 50).length / allPercents.length) * 1000) / 10
                : null,
        };

        const grade_distribution = { A: 0, B: 0, C: 0, D: 0, F: 0 };
        for (const row of studentRows) {
            const g = row.grade;
            if (g && grade_distribution[g] != null) grade_distribution[g] += 1;
        }

        const categoryMap = {};
        for (const a of assessments) {
            const slug = String(a.column_slug || 'other').toLowerCase();
            if (!categoryMap[slug]) {
                categoryMap[slug] = {
                    slug,
                    name: typeMap[slug]?.name || slug,
                    weight_percent: typeMap[slug] ? Number(typeMap[slug].weight_percent) : 0,
                    percents: [],
                };
            }
        }
        for (const row of studentRows) {
            for (const a of assessments) {
                const slug = String(a.column_slug || 'other').toLowerCase();
                const m = row.marks[a.id];
                if (m?.percent != null && categoryMap[slug]) categoryMap[slug].percents.push(m.percent);
            }
        }
        const category_averages = Object.values(categoryMap).map((c) => ({
            slug: c.slug,
            name: c.name,
            weight_percent: c.weight_percent,
            average_percent: c.percents.length
                ? Math.round((c.percents.reduce((x, y) => x + y, 0) / c.percents.length) * 10) / 10
                : null,
        }));

        const trend = category_averages
            .filter((c) => c.average_percent != null)
            .map((c) => ({ label: c.name, average: c.average_percent }));

        const top_performers = studentRows
            .filter((r) => r.average_percent != null)
            .slice(0, 5)
            .map((r) => ({ student_id: r.student_id, name: r.name, average_percent: r.average_percent }));

        const missing_students = studentRows.filter((r) => r.missing_count > 0);
        const below50 = studentRows.filter((r) => r.average_percent != null && r.average_percent < 50);

        const insights = [];
        if (kpis.average_percent != null && kpis.average_percent >= 70) {
            insights.push({ type: 'success', text: 'Class average is strong for this selection.' });
        }
        if (below50.length) {
            insights.push({ type: 'warning', text: `${below50.length} student${below50.length !== 1 ? 's' : ''} scored below 50%.` });
        }
        if (missing_students.length) {
            insights.push({ type: 'warning', text: `${missing_students.length} student${missing_students.length !== 1 ? 's have' : ' has'} missing marks.` });
        }
        const hwCat = category_averages.find((c) => /homework/i.test(c.name));
        if (hwCat?.average_percent != null && hwCat.average_percent >= 75) {
            insights.push({ type: 'success', text: 'Homework performance is strong.' });
        }

        let selected_assessment = null;
        if (selAssessment) {
            let submitted = 0;
            for (const row of studentRows) {
                const m = row.marks[selAssessment.id];
                if (m && (m.value != null || m.mark_code)) submitted += 1;
            }
            selected_assessment = {
                ...selAssessment,
                submitted_count: submitted,
                total_students: studentRows.length,
            };
        }

        res.json({
            success: true,
            data: {
                filters: {
                    academic_years: calendar.academicYears,
                    current_academic_year: calendar.currentAcademicYear,
                    terms: yearTerms,
                    classes,
                    courses: coursesForClass,
                    assessment_types: typeWeights.map((t) => ({
                        slug: t.slug,
                        name: t.name,
                        weight_percent: Number(t.weight_percent),
                    })),
                    assessments: assessments.map((a) => ({
                        id: a.id,
                        assessment_name: a.assessment_name,
                        column_slug: a.column_slug,
                        type_name: a.type_name,
                    })),
                },
                selected: {
                    academic_year: academicYear,
                    term,
                    class_name: selClass,
                    subject_name: selSubject,
                    column_slug: column_slug || null,
                    assessment_id: selAssessment?.id || null,
                },
                kpis,
                assessment_columns: assessments,
                students: studentRows,
                category_averages,
                grade_distribution,
                trend,
                top_performers,
                insights,
                missing_marks_count: missing_students.reduce((s, r) => s + r.missing_count, 0),
                missing_students: missing_students.map((r) => ({ student_id: r.student_id, name: r.name, missing_count: r.missing_count })),
                selected_assessment,
                student_detail,
            },
        });
    } catch (err) {
        console.error('GET /teacher-portal/marks-center:', err);
        res.status(500).json({ success: false, message: 'Failed to load marks center' });
    }
});

// GET /api/teacher-portal/marks-analytics — dashboard / class / student / at-risk hub
router.get('/marks-analytics', requireTeacherRole, async (req, res) => {
    try {
        await ensureAcademicMarksExtras();
        const schoolId = resolveSchoolId(req);
        const userId = resolveUserId(req);
        if (!schoolId || !userId) {
            return res.status(400).json({ success: false, message: 'No school linked' });
        }

        const calendar = await loadSchoolAcademicCalendar(schoolId);
        const academicYear = String(req.query.academic_year || '').trim()
            || calendar.currentAcademicYear;
        const yearTerms = calendar.termsByYear[academicYear] || calendar.terms;
        const term = String(req.query.term || '').trim()
            || inferTermFromMonth(yearTerms);

        const pairs = await fetchTeacherAssignmentPairs(schoolId, userId, { academicYear, term });
        if (!pairs.length) {
            return res.json({
                success: true,
                data: {
                    filters: { academic_years: calendar.academicYears, terms: yearTerms },
                    selected: { academic_year: academicYear, term },
                    empty_reason: 'No teaching assignments. Contact DOS.',
                },
            });
        }

        const typeWeights = await fetchActiveAssessmentTypes(schoolId);
        const classes = [...new Set(pairs.map((p) => p.class_name))].sort();
        const classPerformance = [];
        const studentMap = {};
        const allPercents = [];
        const terms = ['Term 1', 'Term 2', 'Term 3'];
        const termTrendMap = {};

        for (const cn of classes) {
            const classSubjects = [...new Set(
                pairs.filter((p) => p.class_name === cn).map((p) => p.subject_name),
            )];
            const [students] = await promisePool.query(
                `SELECT id, student_uid, first_name, last_name, gender, class_name
                 FROM students WHERE school_id = ? AND (${sqlNormLabelEquals('class_name')})
                 ORDER BY first_name, last_name`,
                [schoolId, cn],
            );
            const classPercents = [];
            for (const s of students) {
                const subjectAvgs = [];
                for (const subj of classSubjects) {
                    const avg = await computeStudentSubjectAverage(
                        schoolId, cn, subj, s.id, typeWeights,
                    );
                    if (avg != null) subjectAvgs.push(avg);
                }
                const average_percent = subjectAvgs.length
                    ? Math.round((subjectAvgs.reduce((a, b) => a + b, 0) / subjectAvgs.length) * 10) / 10
                    : null;
                const name = `${s.first_name || ''} ${s.last_name || ''}`.trim();
                const key = s.id;
                if (!studentMap[key]) {
                    studentMap[key] = {
                        student_id: s.id,
                        student_uid: s.student_uid,
                        name,
                        class_name: cn,
                        gender: s.gender,
                        average_percent,
                        grade: letterGradeFromPercent(average_percent),
                        subject_averages: classSubjects.map((subj, i) => ({
                            subject_name: subj,
                            average_percent: subjectAvgs[i] ?? null,
                        })).filter((x) => x.average_percent != null),
                    };
                }
                if (average_percent != null) {
                    classPercents.push(average_percent);
                    allPercents.push(average_percent);
                }
            }
            const classAvg = classPercents.length
                ? Math.round((classPercents.reduce((a, b) => a + b, 0) / classPercents.length) * 10) / 10
                : null;
            classPerformance.push({
                name: cn,
                class_name: cn,
                average: classAvg,
                passRate: classPercents.length
                    ? Math.round((classPercents.filter((p) => p >= 50).length / classPercents.length) * 1000) / 10
                    : null,
                student_count: students.length,
                subject_count: classSubjects.length,
                status: classAvg == null ? 'no_data' : classAvg >= 75 ? 'top' : classAvg >= 60 ? 'good' : 'attention',
            });
        }

        classPerformance.sort((a, b) => (b.average ?? 0) - (a.average ?? 0));
        classPerformance.forEach((c, i) => { c.rank = i + 1; });

        const students = Object.values(studentMap)
            .sort((a, b) => (b.average_percent ?? -1) - (a.average_percent ?? -1));
        students.forEach((s, i) => { s.rank = s.average_percent != null ? i + 1 : null; });

        const atRiskStudents = students
            .filter((s) => s.average_percent != null && s.average_percent < 50)
            .map((s) => ({
                student_id: s.student_id,
                name: s.name,
                class: s.class_name,
                average: s.average_percent,
                risk: s.average_percent < 40 ? 'Critical' : 'High',
                reason: s.average_percent < 40 ? 'Below 40%' : 'Below 50%',
            }));

        const studentIds = Object.keys(studentMap).map(Number).filter(Boolean);
        if (studentIds.length) {
            const [trendRows] = await promisePool.query(
                `SELECT TRIM(COALESCE(a.term, '')) AS term_label,
                        AVG(CASE WHEN m.mark_code IS NULL AND m.score_obtained IS NOT NULL AND a.max_score > 0
                            THEN (m.score_obtained / a.max_score) * 100 ELSE NULL END) AS avg_pct
                 FROM academic_marks m
                 INNER JOIN academic_assessments a ON a.id = m.assessment_id AND a.school_id = m.school_id
                 WHERE m.school_id = ? AND m.student_id IN (?)
                   AND (a.status IS NULL OR a.status = 'published')
                 GROUP BY TRIM(COALESCE(a.term, ''))`,
                [schoolId, studentIds],
            ).catch(() => [[]]);
            for (const row of trendRows || []) {
                const label = String(row.term_label || '').trim();
                const match = terms.find((t) => label.toLowerCase().includes(t.replace('Term ', '').toLowerCase())
                  || t.toLowerCase() === label.toLowerCase());
                if (match && row.avg_pct != null) {
                    termTrendMap[match] = Math.round(Number(row.avg_pct) * 10) / 10;
                }
            }
        }
        const termTrend = terms.filter((t) => termTrendMap[t] != null).map((t) => ({
            term: t,
            average: termTrendMap[t],
        }));

        const kpis = {
            total_classes: classes.length,
            total_students: students.length,
            average_percent: allPercents.length
                ? Math.round((allPercents.reduce((a, b) => a + b, 0) / allPercents.length) * 10) / 10
                : null,
            pass_rate: allPercents.length
                ? Math.round((allPercents.filter((p) => p >= 50).length / allPercents.length) * 1000) / 10
                : null,
            at_risk_count: atRiskStudents.length,
            pending_assessments: 0,
        };

        const insights = [];
        if (atRiskStudents.length) {
            insights.push({
                type: 'warning',
                text: `${atRiskStudents.length} student(s) below 50% across your classes`,
            });
        }
        if (kpis.average_percent != null && kpis.average_percent >= 70) {
            insights.push({ type: 'success', text: `Strong overall average (${kpis.average_percent}%)` });
        }

        res.json({
            success: true,
            data: {
                filters: {
                    academic_years: calendar.academicYears,
                    terms: yearTerms,
                },
                selected: { academic_year: academicYear, term },
                kpis,
                class_performance: classPerformance,
                students,
                at_risk_students: atRiskStudents,
                term_trend: termTrend,
                insights,
            },
        });
    } catch (err) {
        console.error('GET /teacher-portal/marks-analytics:', err);
        res.status(500).json({ success: false, message: 'Failed to load marks analytics' });
    }
});

// PATCH /api/teacher-portal/marks-cell — inline gradebook edit
router.patch('/marks-cell', requireTeacherRole, async (req, res) => {
    try {
        await ensureAcademicMarksExtras();
        const schoolId = resolveSchoolId(req);
        const userId = resolveUserId(req);
        if (!schoolId || !userId) {
            return res.status(400).json({ success: false, message: 'No school linked' });
        }

        const assessment_id = Number(req.body.assessment_id);
        const student_id = Number(req.body.student_id);
        const rawValue = req.body.value;
        const mark_code = req.body.mark_code ? String(req.body.mark_code).trim().toUpperCase() : null;

        if (!assessment_id || !student_id) {
            return res.status(400).json({ success: false, message: 'assessment_id and student_id required' });
        }

        const [[assessment]] = await promisePool.query(
            `SELECT id, class_name, subject_name, assessment_name, max_score, status
             FROM academic_assessments
             WHERE id = ? AND school_id = ? LIMIT 1`,
            [assessment_id, schoolId]
        );
        if (!assessment) {
            return res.status(404).json({ success: false, message: 'Assessment not found' });
        }

        const allowed = await teacherHasAssignment(schoolId, userId, assessment.class_name, assessment.subject_name);
        if (!allowed) {
            return res.status(403).json({ success: false, message: 'Not assigned to this class and course' });
        }

        const maxVal = Number(assessment.max_score) || 100;

        if (mark_code && ['A', 'E', 'M'].includes(mark_code)) {
            await promisePool.query(
                `INSERT INTO academic_marks (school_id, assessment_id, student_id, score_obtained, mark_code, recorded_by_user_id)
                 VALUES (?, ?, ?, NULL, ?, ?)
                 ON DUPLICATE KEY UPDATE score_obtained = NULL, mark_code = VALUES(mark_code)`,
                [schoolId, assessment_id, student_id, mark_code, userId]
            );
            if (assessment.status === 'published') {
                queueMarksParentNotify({
                    schoolId, userId, studentId: student_id, assessment,
                    markCodeLabel: markCodeLabel(mark_code),
                });
            }
            return res.json({ success: true, mark_code, percent: null });
        }

        if (rawValue === '' || rawValue == null) {
            await promisePool.query(
                'DELETE FROM academic_marks WHERE school_id = ? AND assessment_id = ? AND student_id = ?',
                [schoolId, assessment_id, student_id]
            );
            return res.json({ success: true, value: null, percent: null });
        }

        const score = Number(rawValue);
        if (!Number.isFinite(score) || score < 0 || score > maxVal) {
            return res.status(400).json({ success: false, message: `Maximum marks is ${maxVal}` });
        }

        await promisePool.query(
            `INSERT INTO academic_marks (school_id, assessment_id, student_id, score_obtained, mark_code, recorded_by_user_id)
             VALUES (?, ?, ?, ?, NULL, ?)
             ON DUPLICATE KEY UPDATE score_obtained = VALUES(score_obtained), mark_code = NULL`,
            [schoolId, assessment_id, student_id, score, userId]
        );

        const percent = maxVal > 0 ? Math.round((score / maxVal) * 1000) / 10 : null;
        if (assessment.status === 'published') {
            queueMarksParentNotify({
                schoolId, userId, studentId: student_id, assessment,
                score, maxScore: maxVal,
            });
        }
        res.json({ success: true, value: score, percent });
    } catch (err) {
        console.error('PATCH /teacher-portal/marks-cell:', err);
        res.status(500).json({ success: false, message: 'Failed to update mark' });
    }
});

// GET /api/teacher-portal/staff/payroll/my
// Returns payroll dashboard data for the logged-in teacher only.
router.get('/staff/payroll/my', requireTeacherRole, async (req, res) => {
    try {
        const schoolId = resolveSchoolId(req);
        const teacherUserId = resolveUserId(req);
        if (!schoolId || !teacherUserId) {
            return res.status(400).json({ success: false, message: 'Missing school or user context' });
        }

        const [[teacherRow]] = await promisePool.query(
            `SELECT u.id, u.user_uid, u.first_name, u.last_name, u.email, u.phone,
                    r.role_code,
                    st.department, st.date_of_employment,
                    st.payroll_basic_salary, st.payroll_transport_allowance, st.payroll_housing_allowance, st.payroll_meal_allowance,
                    st.payroll_other_allowances, st.payroll_tax_percent, st.payroll_pension_amount, st.payroll_other_deductions,
                    st.advance_deduction_type, st.advance_deduction_value
             FROM users u
             LEFT JOIN roles r ON r.id = u.role_id
             LEFT JOIN staff st ON st.school_id = u.school_id AND st.user_id = u.id
             WHERE u.school_id = ? AND u.id = ? AND u.deleted_at IS NULL
             LIMIT 1`,
            [schoolId, teacherUserId]
        );
        if (!teacherRow) {
            return res.status(404).json({ success: false, message: 'Teacher profile not found' });
        }

        const parseList = (raw) => {
            if (Array.isArray(raw)) return raw;
            if (typeof raw !== 'string' || !raw.trim()) return [];
            try {
                const p = JSON.parse(raw);
                return Array.isArray(p) ? p : [];
            } catch {
                return [];
            }
        };
        const toMoney = (v) => {
            const n = Number(v);
            return Number.isFinite(n) ? n : 0;
        };
        const monthName = (n) => {
            const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
            return months[Math.max(0, Number(n || 1) - 1)] || String(n || '');
        };

        const basic = toMoney(teacherRow.payroll_basic_salary);
        const fixedAllowances =
            toMoney(teacherRow.payroll_transport_allowance) +
            toMoney(teacherRow.payroll_housing_allowance) +
            toMoney(teacherRow.payroll_meal_allowance);
        const extraAllowances = parseList(teacherRow.payroll_other_allowances)
            .reduce((sum, item) => sum + toMoney(item?.amount), 0);
        const allowances = fixedAllowances + extraAllowances;
        const gross = basic + allowances;
        const taxPercent = toMoney(teacherRow.payroll_tax_percent);
        const tax = (gross * taxPercent) / 100;
        const pension = toMoney(teacherRow.payroll_pension_amount);
        const otherDeductions = parseList(teacherRow.payroll_other_deductions)
            .reduce((sum, item) => sum + toMoney(item?.amount), 0);
        const deductions = tax + pension + otherDeductions;
        const net = Math.max(0, gross - deductions);
        const monthlyCashoutPolicy = await getTeacherMonthlyCashoutPolicy(schoolId, teacherUserId, net);

        const teacherStaffCode = String(teacherRow.user_uid || '').trim();
        const [payRows] = await promisePool.query(
            `SELECT r.id, r.month, r.term, r.year, r.amount, r.status, r.created_at, r.approved_at, r.paid_at,
                    d.basic, d.allowances, d.deductions, d.net_salary, d.advance, d.final_payable,
                    TRIM(CONCAT(COALESCE(cu.first_name, ''), ' ', COALESCE(cu.last_name, ''))) AS submit_actor_name,
                    TRIM(CONCAT(COALESCE(apu.first_name, ''), ' ', COALESCE(apu.last_name, ''))) AS approved_actor_name
             FROM payroll_requests r
             LEFT JOIN payroll_details d ON d.request_id = r.id AND d.school_id = r.school_id
             LEFT JOIN users cu ON cu.id = r.created_by_user_id
             LEFT JOIN users apu ON apu.id = r.approved_by_user_id
             WHERE r.school_id = ?
               AND (
                    r.staff_user_id = ?
                    OR (? <> '' AND r.staff_code = ?)
               )
               AND r.deleted_at IS NULL
             ORDER BY r.year DESC, r.month DESC, r.id DESC
             LIMIT 80`,
            [schoolId, teacherUserId, teacherStaffCode, teacherStaffCode]
        );

        const history = (payRows || []).map((r) => {
            const status = String(r.status || 'Pending');
            const paidAmount = status === 'Paid' ? toMoney(r.amount) : 0;
            const deductionsAmount = toMoney(r.deductions);
            const amountRequested = toMoney(r.amount);
            const finalPayable = toMoney(r.final_payable || r.net_salary || r.amount);
            return {
                id: Number(r.id),
                payrollId: `PAY-${r.id}`,
                month: monthName(r.month),
                term: r.term || '',
                year: Number(r.year || 0),
                basic: toMoney(r.basic),
                allowances: toMoney(r.allowances),
                rssb: 0,
                tax: deductionsAmount,
                deductions: deductionsAmount,
                advance: toMoney(r.advance),
                net: toMoney(r.net_salary || r.amount),
                finalPayable,
                amountRequested,
                paid: paidAmount,
                status,
                submittedAt: r.created_at || null,
                paidDate: r.paid_at || null,
                submittedBy: r.submit_actor_name || null,
                approvedBy: r.approved_actor_name || null,
            };
        });

        const [advanceRows] = await promisePool.query(
            `SELECT id, amount_rwf, status, submitted_at
             FROM shule_avance_requests
             WHERE school_id = ? AND teacher_user_id = ?
             ORDER BY id DESC
             LIMIT 120`,
            [schoolId, teacherUserId]
        );
        const [[schoolRow]] = await promisePool.query(
            `SELECT id, school_name, logo_url, school_stamp_url, head_signature_url
             FROM schools
             WHERE id = ?
             LIMIT 1`,
            [schoolId]
        );
        const totalLoan = (advanceRows || []).reduce((sum, row) => sum + toMoney(row.amount_rwf), 0);
        const remaining = (advanceRows || [])
            .filter((row) => ['pending_accountant', 'sent_to_manager', 'approved'].includes(String(row.status || '').toLowerCase()))
            .reduce((sum, row) => sum + toMoney(row.amount_rwf), 0);
        const totalPaid = Math.max(0, totalLoan - remaining);
        const monthlyDeduction = remaining > 0
            ? (String(teacherRow.advance_deduction_type || '').toLowerCase() === 'fixed'
                ? toMoney(teacherRow.advance_deduction_value)
                : Math.round((net * toMoney(teacherRow.advance_deduction_value || 10)) / 100))
            : 0;
        const firstDisbursed = (advanceRows || []).find((row) => row.submitted_at)?.submitted_at || null;

        return res.json({
            success: true,
            data: {
                staff: {
                    staffUserId: Number(teacherRow.id),
                    staffCode: teacherRow.user_uid || `STF-${teacherRow.id}`,
                    fullName: `${teacherRow.first_name || ''} ${teacherRow.last_name || ''}`.trim(),
                    role: String(teacherRow.role_code || 'TEACHER').toUpperCase(),
                    department: teacherRow.department || String(teacherRow.role_code || 'TEACHER').toUpperCase(),
                    email: teacherRow.email || '',
                    phone: teacherRow.phone || '',
                    joinDate: teacherRow.date_of_employment || null,
                    avatar: null,
                },
                school: {
                    schoolId: Number(schoolRow?.id || schoolId),
                    schoolName: schoolRow?.school_name || null,
                    logoUrl: schoolRow?.logo_url || null,
                    stampUrl: schoolRow?.school_stamp_url || null,
                    signatureUrl: schoolRow?.head_signature_url || null,
                },
                currentSalary: {
                    basic,
                    allowances,
                    rssb: pension,
                    tax,
                    net,
                    monthlyCashoutBaselineNet: monthlyCashoutPolicy.baseline_net_salary,
                    monthlyCashoutRemainingNet: monthlyCashoutPolicy.monthly_remaining_net,
                },
                advance: {
                    totalLoan,
                    totalPaid,
                    remaining,
                    monthlyDeduction,
                    disbursedDate: firstDisbursed,
                    expectedEndDate: null,
                    cashoutPolicy: monthlyCashoutPolicy,
                },
                history,
                notifications: [],
            },
        });
    } catch (err) {
        console.error('[teacher-portal/staff/payroll/my GET]:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to load staff payroll' });
    }
});

// POST /api/teacher-portal/avance/ussd/login
// Body: { identifier, password, school_code? } — identifier matches staff.staff_id (HR Central / HRCentral staff code), user_uid, or staff.username
router.post('/avance/ussd/login', async (req, res) => {
    try {
        await ensureTeacherAvanceUssdTables();
        const identifier = String(req.body?.identifier || req.body?.teacher_code || req.body?.staff_code || '').trim().toLowerCase();
        const password = String(req.body?.password || '');
        const schoolCode = String(req.body?.school_code || '').trim().toUpperCase();
        if (!identifier || !password) {
            return res.status(400).json({ success: false, message: 'identifier and password are required' });
        }

        const [rows] = await promisePool.query(
            `SELECT
                u.id, u.user_uid, u.password_hash, u.is_active, u.deleted_at,
                u.first_name, u.last_name, u.email,
                r.role_code,
                st.staff_id, st.username AS staff_username, st.account_enabled,
                COALESCE(st.school_id, u.school_id) AS school_id,
                sc.school_code, sc.school_name
             FROM users u
             LEFT JOIN roles r ON r.id = u.role_id
             LEFT JOIN staff st ON st.user_id = u.id
             LEFT JOIN schools sc ON sc.id = COALESCE(st.school_id, u.school_id)
             WHERE u.deleted_at IS NULL
               AND (
                 LOWER(TRIM(COALESCE(st.staff_id, ''))) = ?
                 OR LOWER(TRIM(COALESCE(u.user_uid, ''))) = ?
                 OR LOWER(TRIM(COALESCE(st.username, ''))) = ?
               )
               ${schoolCode ? 'AND UPPER(TRIM(COALESCE(sc.school_code, ""))) = ?' : ''}
             LIMIT 1`,
            schoolCode ? [identifier, identifier, identifier, schoolCode] : [identifier, identifier, identifier]
        );
        const teacher = rows[0];
        if (!teacher) {
            return res.status(401).json({ success: false, message: 'Invalid teacher/staff code or password' });
        }
        if (String(teacher.role_code || '').toUpperCase() !== 'TEACHER') {
            return res.status(403).json({ success: false, message: 'Only TEACHER accounts are allowed on this endpoint' });
        }
        if (!teacher.is_active || Number(teacher.account_enabled || 1) === 0) {
            return res.status(403).json({ success: false, message: 'Teacher account is inactive' });
        }
        if (!teacher.school_id) {
            return res.status(400).json({ success: false, message: 'Teacher account is not linked to a school' });
        }
        const ok = await bcrypt.compare(password, String(teacher.password_hash || ''));
        if (!ok) {
            return res.status(401).json({ success: false, message: 'Invalid teacher/staff code or password' });
        }

        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = hashToken(rawToken);
        const ttl = Number.isFinite(USSD_SESSION_TTL_MINUTES) ? USSD_SESSION_TTL_MINUTES : 30;
        await promisePool.query(
            `INSERT INTO teacher_avance_ussd_sessions (token_hash, teacher_user_id, school_id, expires_at)
             VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))`,
            [tokenHash, teacher.id, teacher.school_id, ttl]
        );
        const netSalary = await getTeacherNetSalaryFromStaff(teacher.school_id, teacher.id);
        const monthlyCashoutPolicy = await getTeacherMonthlyCashoutPolicy(
            Number(teacher.school_id),
            Number(teacher.id),
            netSalary
        );
        return res.json({
            success: true,
            message: 'Teacher login successful',
            data: {
                access_token: rawToken,
                token_type: 'Bearer',
                expires_in_minutes: ttl,
                teacher: {
                    id: Number(teacher.id),
                    code: teacher.staff_id || teacher.user_uid || `STF-${teacher.id}`,
                    full_name: `${teacher.first_name || ''} ${teacher.last_name || ''}`.trim(),
                    email: teacher.email || null,
                    school_id: Number(teacher.school_id),
                    school_code: teacher.school_code || null,
                    school_name: teacher.school_name || null,
                },
                avance_policy: {
                    ...monthlyCashoutPolicy,
                    net_salary: Math.round(netSalary),
                },
            },
        });
    } catch (err) {
        console.error('[teacher-portal/avance/ussd login]:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to sign in teacher' });
    }
});

// POST /api/teacher-portal/avance/ussd/cashout-request
// Body: { access_token, amount_requested, reason, cashout_category_slug? }
router.post('/avance/ussd/cashout-request', requireUssdTeacherSession, async (req, res) => {
    try {
        await ensureTeacherAvanceUssdTables();
        const { userId, schoolId } = req.ussdAuth;
        const amountRequested = Number(req.body?.amount_requested ?? req.body?.amount);
        const reason = String(req.body?.reason || '').trim();
        const cashoutCategorySlug = String(req.body?.cashout_category_slug || req.body?.cashout_category || 'general').trim() || 'general';
        if (!Number.isFinite(amountRequested) || amountRequested <= 0) {
            return res.status(400).json({ success: false, message: 'amount_requested must be greater than 0' });
        }
        if (!reason) {
            return res.status(400).json({ success: false, message: 'reason is required' });
        }

        const netSalary = await getTeacherNetSalaryFromStaff(schoolId, userId);
        const policy = await getTeacherMonthlyCashoutPolicy(schoolId, userId, netSalary);
        const autoApproved = policy.baseline_net_salary > 0 && amountRequested <= policy.auto_approval_remaining;
        const status = autoApproved ? 'approved' : 'pending_accountant';
        const amount = Number(amountRequested.toFixed(2));
        const purpose = `Cashout [${cashoutCategorySlug}]: ${reason}`;
        const requestedTotalAfter = Math.round(policy.monthly_requested_total + amount);
        const remainingAfter = Math.max(0, Math.round(policy.baseline_net_salary - requestedTotalAfter));
        const [ins] = await promisePool.query(
            `INSERT INTO shule_avance_requests
             (school_id, teacher_user_id, amount_rwf, purpose, repayment_term_months, status, request_type, cashout_reason, cashout_category_slug, submitted_at,
              cashout_month_key, net_salary_baseline_rwf, auto_approval_limit_rwf, monthly_requested_total_rwf, monthly_remaining_net_rwf,
              auto_approved, auto_approved_at)
             VALUES (?, ?, ?, ?, 1, ?, 'cashout', ?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?)` ,
            [
                schoolId, userId, amount, purpose, status, reason, cashoutCategorySlug,
                policy.month_key,
                policy.baseline_net_salary,
                policy.auto_approval_limit,
                requestedTotalAfter,
                remainingAfter,
                autoApproved ? 1 : 0,
                autoApproved ? new Date() : null,
            ]
        );

        return res.status(201).json({
            success: true,
            message: autoApproved
                ? 'Cashout auto-approved (<= 40% of monthly baseline net salary)'
                : 'Cashout request submitted to accountant and manager workflow',
            data: {
                request_id: Number(ins.insertId),
                status,
                amount_rwf: amount,
                auto_approved: autoApproved,
                requested_at: new Date().toISOString(),
                net_salary: Math.round(netSalary),
                month_key: policy.month_key,
                baseline_net_salary: policy.baseline_net_salary,
                monthly_requested_total_before: policy.monthly_requested_total,
                monthly_requested_total_after: requestedTotalAfter,
                monthly_remaining_net_after: remainingAfter,
                auto_approval_limit: policy.auto_approval_limit,
                auto_approval_used_before: policy.auto_approval_used,
                auto_approval_remaining_before: policy.auto_approval_remaining,
                auto_approval_remaining_after: Math.max(0, Math.round(policy.auto_approval_remaining - (autoApproved ? amount : 0))),
            },
        });
    } catch (err) {
        console.error('[teacher-portal/avance/ussd cashout-request]:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to create cashout request' });
    }
});

// GET /api/teacher-portal/examination-list?class_name=&academic_year=&term=
// Published examination eligibility (same fee rules + accountant overrides as accountant portal).
router.get('/examination-list', requireTeacherRole, async (req, res) => {
    try {
        const schoolId = resolveSchoolId(req);
        if (!schoolId) return res.status(400).json({ success: false, message: 'No school linked' });

        const className = String(req.query.class_name || '').trim();
        const academicYear = String(req.query.academic_year || req.query.year || '').trim();
        const term = String(req.query.term || '').trim();
        if (!className) {
            return res.status(400).json({ success: false, message: 'class_name is required' });
        }

        const data = await accountantFeesRoutes.examinationListPayload(
            schoolId,
            academicYear,
            term,
            className,
            { audience: 'teacher' }
        );
        return res.json({ success: true, data });
    } catch (err) {
        console.error('[teacher-portal/examination-list]', err);
        return res.status(500).json({
            success: false,
            message: err.message || 'Failed to load examination list',
        });
    }
});

// GET /api/teacher-portal/avance/ussd/requests
// Query: access_token
router.get('/avance/ussd/requests', requireUssdTeacherSession, async (req, res) => {
    try {
        const { userId, schoolId } = req.ussdAuth;
        const [rows] = await promisePool.query(
            `SELECT
                id, amount_rwf, status, request_type, cashout_reason, cashout_category_slug,
                submitted_at, accountant_note, manager_feedback
             FROM shule_avance_requests
             WHERE school_id = ? AND teacher_user_id = ?
             ORDER BY id DESC
             LIMIT 200`,
            [schoolId, userId]
        );
        const data = (rows || []).map((r) => ({
            request_id: Number(r.id),
            request_type: String(r.request_type || '').toLowerCase(),
            amount_rwf: Number(r.amount_rwf || 0),
            status: String(r.status || ''),
            reason: r.cashout_reason || null,
            cashout_category_slug: r.cashout_category_slug || null,
            submitted_at: r.submitted_at || null,
            accountant_note: r.accountant_note || null,
            manager_feedback: r.manager_feedback || null,
        }));
        const netSalary = await getTeacherNetSalaryFromStaff(schoolId, userId);
        const monthlyCashoutPolicy = await getTeacherMonthlyCashoutPolicy(schoolId, userId, netSalary);
        return res.json({
            success: true,
            data,
            summary: {
                generated_at: new Date().toISOString(),
                monthly_cashout_policy: monthlyCashoutPolicy,
            },
        });
    } catch (err) {
        console.error('[teacher-portal/avance/ussd requests]:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to load requests' });
    }
});

const {
  trimStr: trimStrCls,
  dayOfWeekName: dayNameCls,
  timeToMins: timeMinsCls,
  toDateSql: toDateSqlCls,
  getTeacherPeriodSettings: getTeacherPeriodSettingsCls,
  processTeacherClassRoomCheckIn,
} = require('../lib/classRoomScan');

// GET /api/teacher-portal/class-period/active — current timetable lesson + check-in state
router.get('/class-period/active', requireTeacherRole, async (req, res) => {
  try {
    await ensureTeacherTables();
    const schoolId = req.session?.user?.school_id || req.session?.school_id;
    const teacherId = req.session?.userId || req.session?.user?.id;
    if (!schoolId || !teacherId) return res.status(400).json({ success: false, message: 'Invalid session' });

    const now = new Date();
    const day = dayNameCls(now);
    const nowHm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const nowMins = timeMinsCls(nowHm);
    const date = toDateSqlCls(now);

    const settings = await getTeacherPeriodSettingsCls(promisePool, schoolId);

    const [rows] = await promisePool.query(
      `SELECT id, class_name, subject_name, start_time, end_time, room
       FROM academic_timetables
       WHERE school_id = ? AND staff_id = ? AND LOWER(day_of_week) = LOWER(?)
         AND TRIM(COALESCE(term,'')) = ? AND TRIM(COALESCE(academic_year,'')) = ?
         AND (extra_activity_id IS NULL OR extra_activity_id = 0)
       ORDER BY start_time ASC`,
      [schoolId, teacherId, day, settings.term, settings.academic_year]
    );

    const GRACE = 5;
    const current = (rows || []).find((s) => {
      const start = timeMinsCls(s.start_time) - GRACE;
      const end = timeMinsCls(s.end_time) + GRACE;
      return nowMins >= start && nowMins <= end;
    });
    const next = (rows || []).find((s) => timeMinsCls(s.start_time) > nowMins);

    let periodLog = null;
    if (current) {
      const [[log]] = await promisePool.query(
        `SELECT id, entry_time, exit_time, status, scan_source,
                TIME_FORMAT(entry_time, '%H:%i') AS entry_hm,
                TIME_FORMAT(exit_time, '%H:%i') AS exit_hm
         FROM teacher_period_attendance
         WHERE school_id = ? AND teacher_id = ? AND period_date = ?
           AND class_name = ? AND start_time = ? AND end_time = ?
         LIMIT 1`,
        [schoolId, teacherId, date, current.class_name, current.start_time, current.end_time]
      );
      periodLog = log || null;
    }

    return res.json({
      success: true,
      data: {
        current_lesson: current ? {
          id: current.id,
          class_name: current.class_name,
          subject_name: current.subject_name,
          start_time: String(current.start_time).slice(0, 5),
          end_time: String(current.end_time).slice(0, 5),
          room: current.room,
        } : null,
        next_lesson: next ? {
          class_name: next.class_name,
          subject_name: next.subject_name,
          start_time: String(next.start_time).slice(0, 5),
          end_time: String(next.end_time).slice(0, 5),
          minutes_until: timeMinsCls(next.start_time) - nowMins,
        } : null,
        period_log: periodLog ? {
          checked_in: Boolean(periodLog.entry_time),
          checked_out: Boolean(periodLog.exit_time),
          status: periodLog.status,
          entry_time: periodLog.entry_hm,
          exit_time: periodLog.exit_hm,
          scan_source: periodLog.scan_source,
        } : null,
        today_lessons: (rows || []).map((r) => ({
          class_name: r.class_name,
          subject_name: r.subject_name,
          start_time: String(r.start_time).slice(0, 5),
          end_time: String(r.end_time).slice(0, 5),
        })),
      },
    });
  } catch (err) {
    console.error('GET /teacher-portal/class-period/active:', err);
    return res.status(500).json({ success: false, message: 'Failed to load active lesson' });
  }
});

// GET /api/teacher-portal/class-period/history — period attendance logs for teacher
router.get('/class-period/history', requireTeacherRole, async (req, res) => {
  try {
    await ensureTeacherTables();
    const schoolId = req.session?.user?.school_id || req.session?.school_id;
    const teacherId = req.session?.userId || req.session?.user?.id;
    const date = trimStrCls(req.query?.date) || toDateSqlCls(new Date());
    if (!schoolId || !teacherId) return res.status(400).json({ success: false, message: 'Invalid session' });

    const [rows] = await promisePool.query(
      `SELECT id, class_name, subject_name, day_of_week, start_time, end_time, status,
              TIME_FORMAT(entry_time, '%H:%i') AS entry_hm,
              TIME_FORMAT(exit_time, '%H:%i') AS exit_hm,
              late_minutes, scan_source, exit_status
       FROM teacher_period_attendance
       WHERE school_id = ? AND teacher_id = ? AND period_date = ?
       ORDER BY start_time ASC`,
      [schoolId, teacherId, date]
    );
    return res.json({ success: true, data: rows || [] });
  } catch (err) {
    console.error('GET /teacher-portal/class-period/history:', err);
    return res.status(500).json({ success: false, message: 'Failed to load period history' });
  }
});

// GET /api/teacher-portal/upcoming-lesson — next period + 10-min warning
router.get('/upcoming-lesson', requireTeacherRole, async (req, res) => {
  try {
    await ensureTeacherTables();
    const schoolId = req.session?.user?.school_id || req.session?.school_id;
    const teacherId = req.session?.userId || req.session?.user?.id;
    if (!schoolId || !teacherId) return res.status(400).json({ success: false, message: 'Invalid session' });

    const now = new Date();
    const day = dayNameCls(now);
    const nowMins = timeMinsCls(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);

    const [rows] = await promisePool.query(
      `SELECT id, class_name, subject_name, start_time, end_time, room, term, academic_year
       FROM academic_timetables
       WHERE school_id = ? AND staff_id = ? AND LOWER(day_of_week) = LOWER(?)
         AND (extra_activity_id IS NULL OR extra_activity_id = 0)
       ORDER BY start_time ASC`,
      [schoolId, teacherId, day]
    );

    const upcoming = (rows || []).filter((r) => timeMinsCls(r.end_time) > nowMins);
    const next = upcoming[0] || null;
    if (!next) {
      return res.json({ success: true, data: { has_lesson: false, minutes_until: null } });
    }

    const startMins = timeMinsCls(next.start_time);
    const minutesUntil = startMins - nowMins;
    return res.json({
      success: true,
      data: {
        has_lesson: true,
        minutes_until: minutesUntil,
        warn_soon: minutesUntil > 0 && minutesUntil <= 10,
        lesson: {
          id: next.id,
          class_name: next.class_name,
          subject_name: next.subject_name,
          start_time: String(next.start_time).slice(0, 5),
          end_time: String(next.end_time).slice(0, 5),
          room: next.room,
        },
      },
    });
  } catch (err) {
    console.error('GET /teacher-portal/upcoming-lesson:', err);
    return res.status(500).json({ success: false, message: 'Failed to load upcoming lesson' });
  }
});

// POST /api/teacher-portal/class-room/scan — QR check-in/out at classroom
router.post('/class-room/scan', requireTeacherRole, async (req, res) => {
  try {
    await ensureTeacherTables();
    const schoolId = req.session?.user?.school_id || req.session?.school_id;
    const teacherId = req.session?.userId || req.session?.user?.id;
    const teacherName = trimStrCls(`${req.session?.user?.first_name || ''} ${req.session?.user?.last_name || ''}`);
    if (!schoolId || !teacherId) return res.status(400).json({ success: false, message: 'Invalid session' });

    let qrToken = trimStrCls(req.body?.qr_token);
    const raw = trimStrCls(req.body?.raw);
    if (!qrToken && raw) {
      const m = raw.match(/BABYEYICLS:([a-f0-9]+)/i);
      if (m) qrToken = m[1];
    }
    if (!qrToken) return res.status(400).json({ success: false, message: 'qr_token required' });

    const [[qrRow]] = await promisePool.query(
      'SELECT class_name, school_id FROM class_room_qr_codes WHERE qr_token = ? LIMIT 1',
      [qrToken]
    );
    if (!qrRow || Number(qrRow.school_id) !== Number(schoolId)) {
      return res.status(404).json({ success: false, message: 'Invalid class QR code' });
    }

    const result = await processTeacherClassRoomCheckIn(promisePool, {
      schoolId,
      teacherId,
      teacherName,
      className: qrRow.class_name,
      scanSource: 'QR_CLASS',
    });

    if (!result.ok) {
      return res.status(409).json({ success: false, code: result.code, message: result.message, data: result.data });
    }
    return res.json({ success: true, action: result.action, message: result.message, data: result.data });
  } catch (err) {
    console.error('POST /teacher-portal/class-room/scan:', err);
    return res.status(500).json({ success: false, message: 'Scan failed' });
  }
});

// ============================================================
// Competency analysis — class-scoped ratings per DOS categories
// ============================================================
router.get('/competency-categories', requireTeacherRole, async (req, res) => {
    try {
        await ensureCompetencyTables();
        const schoolId = resolveSchoolId(req);
        if (!schoolId) return res.status(400).json({ success: false, message: 'No school linked' });
        const rows = await listCompetencyCategories(schoolId);
        res.json({ success: true, data: { categories: rows, rating_levels: RATING_LEVELS } });
    } catch (err) {
        console.error('GET /teacher-portal/competency-categories:', err);
        res.status(500).json({ success: false, message: 'Failed to load competency categories' });
    }
});

router.get('/competency-ratings', requireTeacherRole, async (req, res) => {
    try {
        await ensureCompetencyTables();
        const schoolId = resolveSchoolId(req);
        const userId = resolveUserId(req);
        const className = normalizeGradebookLabel(req.query.class_name);
        const academicYear = String(req.query.academic_year || '').trim();
        const term = String(req.query.term || '').trim();
        if (!schoolId || !className || !academicYear || !term) {
            return res.status(400).json({ success: false, message: 'class_name, academic_year, term required' });
        }

        const allowed = await fetchTeacherAssignmentPairs(schoolId, userId);
        const canAccess = allowed.some((p) => p.class_name.toLowerCase() === className.toLowerCase());
        if (!canAccess) {
            return res.status(403).json({ success: false, message: 'You are not assigned to this class.' });
        }

        const [students] = await promisePool.query(
            `SELECT id, student_uid, first_name, last_name FROM students
             WHERE school_id = ? AND (${sqlNormLabelEquals('class_name')})
             ORDER BY first_name, last_name`,
            [schoolId, className],
        );
        const categories = await listCompetencyCategories(schoolId);
        const [ratings] = await promisePool.query(
            `SELECT student_id, category_id, rating FROM student_competency_ratings
             WHERE school_id = ? AND class_name = ? AND academic_year = ? AND term = ?`,
            [schoolId, className, academicYear, term],
        );
        const ratingMap = {};
        for (const r of ratings) {
            if (!ratingMap[r.student_id]) ratingMap[r.student_id] = {};
            ratingMap[r.student_id][r.category_id] = r.rating;
        }

        res.json({
            success: true,
            data: {
                students,
                categories,
                ratings: ratingMap,
                academic_year: academicYear,
                term,
                class_name: className,
            },
        });
    } catch (err) {
        console.error('GET /teacher-portal/competency-ratings:', err);
        res.status(500).json({ success: false, message: 'Failed to load competency ratings' });
    }
});

router.post('/competency-ratings', requireTeacherRole, async (req, res) => {
    try {
        await ensureCompetencyTables();
        const schoolId = resolveSchoolId(req);
        const userId = resolveUserId(req);
        const className = normalizeGradebookLabel(req.body?.class_name);
        const academicYear = String(req.body?.academic_year || '').trim();
        const term = String(req.body?.term || '').trim();
        const ratings = Array.isArray(req.body?.ratings) ? req.body.ratings : [];
        if (!schoolId || !className || !academicYear || !term || !ratings.length) {
            return res.status(400).json({ success: false, message: 'class_name, academic_year, term, ratings[] required' });
        }

        const allowed = await fetchTeacherAssignmentPairs(schoolId, userId);
        const canAccess = allowed.some((p) => p.class_name.toLowerCase() === className.toLowerCase());
        if (!canAccess) {
            return res.status(403).json({ success: false, message: 'You are not assigned to this class.' });
        }

        const validLevels = new Set(RATING_LEVELS.map((l) => l.toLowerCase()));
        let saved = 0;
        for (const row of ratings) {
            const studentId = Number(row.student_id);
            const categoryId = Number(row.category_id);
            const rating = String(row.rating || '').trim();
            if (!studentId || !categoryId || !rating) continue;
            if (!validLevels.has(rating.toLowerCase())) continue;
            await promisePool.query(
                `INSERT INTO student_competency_ratings
                 (school_id, student_id, category_id, academic_year, term, class_name, rating, teacher_user_id, recorded_by_user_id)
                 VALUES (?,?,?,?,?,?,?,?,?)
                 ON DUPLICATE KEY UPDATE rating = VALUES(rating), teacher_user_id = VALUES(teacher_user_id),
                   recorded_by_user_id = VALUES(recorded_by_user_id), updated_at = CURRENT_TIMESTAMP`,
                [schoolId, studentId, categoryId, academicYear, term, className, rating, userId, userId],
            );
            saved += 1;
        }

        res.json({ success: true, message: `Saved ${saved} competency rating(s).`, data: { saved } });
    } catch (err) {
        console.error('POST /teacher-portal/competency-ratings:', err);
        res.status(500).json({ success: false, message: 'Failed to save competency ratings' });
    }
});

module.exports = router;
module.exports.ensureAcademicTables = ensureTeacherTables;
