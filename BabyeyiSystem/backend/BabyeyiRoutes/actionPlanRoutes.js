'use strict';

const express = require('express');
const { promisePool } = require('../config/database');

const router = express.Router();

const ACCOUNTANT_READ = ['ACCOUNTANT', 'SCHOOL_ADMIN', 'SCHOOL_MANAGER'];
const ACCOUNTANT_WRITE = ['ACCOUNTANT', 'SCHOOL_ADMIN', 'SCHOOL_MANAGER'];
const MANAGER_REVIEW = ['SCHOOL_MANAGER', 'SCHOOL_ADMIN', 'FULL_SYSTEM_CONTROLLER', 'SUPER_ADMIN'];

const PLAN_STATUSES = ['draft', 'pending_approval', 'approved', 'ongoing', 'completed', 'cancelled'];
const ACTIVITY_STATUSES = ['not_started', 'ongoing', 'delayed', 'completed', 'cancelled'];
const FUNDING_SOURCES = ['Student Fees', 'Government Grants', 'Donations', 'Projects', 'PTA Contributions', 'Sponsors', 'School Income', 'Other'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
const ACTIVITY_CATEGORIES = [
  'Academic Activities', 'Infrastructure', 'ICT Development', 'Sports Activities', 'Student Welfare',
  'Teacher Training', 'Procurement', 'Maintenance', 'Security', 'Health Activities',
  'Community Outreach', 'Discipline Activities', 'Environmental Activities',
];
const DEPARTMENTS = [
  'Administration', 'Finance', 'Academics', 'ICT', 'Kitchen', 'Transport', 'Sports',
  'Library', 'Security', 'Maintenance', 'Procurement', 'Boarding',
];

let tablesReady = false;

function resolveUserId(req) {
  return req.session?.userId || req.session?.user?.id || req.user?.id || null;
}
function resolveRoleCode(req) {
  return String(req.user?.role_code || req.session?.user?.role?.code || '').toUpperCase();
}
function resolveSchoolId(req) {
  return req.session?.school_id || req.session?.user?.school_id || req.session?.user?.school?.id || req.user?.school_id || null;
}
function requireAuth(req, res, next) {
  const userId = resolveUserId(req);
  const schoolId = resolveSchoolId(req);
  if (!userId) return res.status(401).json({ success: false, message: 'Not authenticated' });
  if (!schoolId) return res.status(400).json({ success: false, message: 'No school linked' });
  req.ctx = { userId, schoolId, roleCode: resolveRoleCode(req) };
  next();
}
function requireRole(allowed) {
  return (req, res, next) => {
    if (!allowed.includes(req.ctx?.roleCode)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    next();
  };
}
function toMoney(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function parseDate(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}
function statusLabel(s) {
  const m = {
    draft: 'Draft', pending_approval: 'Pending', approved: 'Approved', ongoing: 'Ongoing',
    completed: 'Completed', cancelled: 'Cancelled', not_started: 'Not Started', delayed: 'Delayed',
  };
  return m[String(s || '').toLowerCase()] || s;
}

function inferAcademicYearFromDate(date = new Date()) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  return m >= 9 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
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

/** Same source as Manager → System Configuration → Preferences (school_academic_settings). */
async function loadSchoolAcademicCalendar(schoolId) {
  const [[row]] = await promisePool.query(
    `SELECT current_academic_year, active_terms_json, term_dates_json
     FROM school_academic_settings
     WHERE school_id = ?
     LIMIT 1`,
    [schoolId]
  ).catch(() => [[null]]);

  let activeTerms = ['Term 1', 'Term 2', 'Term 3'];
  if (row?.active_terms_json) {
    try {
      const parsed = Array.isArray(row.active_terms_json)
        ? row.active_terms_json
        : JSON.parse(row.active_terms_json);
      if (Array.isArray(parsed) && parsed.length) {
        activeTerms = parsed.map((x) => String(x).trim()).filter(Boolean);
      }
    } catch (_) { /* keep defaults */ }
  }

  let termDates = [];
  if (row?.term_dates_json) {
    try {
      const parsed = Array.isArray(row.term_dates_json)
        ? row.term_dates_json
        : JSON.parse(row.term_dates_json);
      if (Array.isArray(parsed)) {
        termDates = parsed
          .filter((d) => d && d.name)
          .map((d) => ({
            name: String(d.name).trim(),
            start: d.start ? String(d.start).trim() : '',
            end: d.end ? String(d.end).trim() : '',
          }));
      }
    } catch (_) { /* keep empty */ }
  }

  const currentAcademicYear = String(row?.current_academic_year || '').trim() || inferAcademicYearFromDate();
  const defaultTerm = inferTermFromMonth(activeTerms);
  const terms = [...activeTerms, 'Full Academic Year'];

  return {
    currentAcademicYear,
    academicYears: [currentAcademicYear],
    activeTerms,
    terms,
    defaultTerm,
    termDates,
  };
}

async function ensureActionPlanTables() {
  if (tablesReady) return;
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS school_action_plans (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      created_by_user_id INT UNSIGNED NOT NULL,
      plan_code VARCHAR(32) NOT NULL,
      title VARCHAR(220) NOT NULL,
      academic_year VARCHAR(64) NOT NULL,
      term VARCHAR(64) NOT NULL,
      department VARCHAR(64) NOT NULL,
      strategic_objective TEXT NULL,
      start_date DATE NULL,
      end_date DATE NULL,
      responsible_user_id INT UNSIGNED NULL,
      responsible_name VARCHAR(200) NULL,
      estimated_budget_rwf DECIMAL(16,2) NOT NULL DEFAULT 0,
      funding_source VARCHAR(64) NULL,
      priority_level VARCHAR(32) NOT NULL DEFAULT 'Medium',
      status VARCHAR(32) NOT NULL DEFAULT 'draft',
      budget_line_id INT UNSIGNED NULL,
      manager_review_notes TEXT NULL,
      manager_reviewed_at DATETIME NULL,
      submitted_at DATETIME NULL,
      deleted_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_action_plan_code (school_id, plan_code),
      KEY idx_ap_school (school_id, deleted_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS school_action_plan_activities (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      action_plan_id INT UNSIGNED NOT NULL,
      activity_name VARCHAR(220) NOT NULL,
      category VARCHAR(120) NULL,
      description TEXT NULL,
      department VARCHAR(64) NULL,
      responsible_user_id INT UNSIGNED NULL,
      responsible_name VARCHAR(200) NULL,
      planned_start DATE NULL,
      planned_end DATE NULL,
      estimated_cost_rwf DECIMAL(16,2) NOT NULL DEFAULT 0,
      used_amount_rwf DECIMAL(16,2) NOT NULL DEFAULT 0,
      expected_outcome TEXT NULL,
      performance_indicator VARCHAR(255) NULL,
      progress_pct TINYINT UNSIGNED NOT NULL DEFAULT 0,
      status VARCHAR(32) NOT NULL DEFAULT 'not_started',
      budget_line_id INT UNSIGNED NULL,
      is_frozen TINYINT(1) NOT NULL DEFAULT 0,
      deleted_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_apa_plan (action_plan_id, deleted_at),
      KEY idx_apa_school (school_id, deleted_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS school_action_plan_expenses (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      activity_id INT UNSIGNED NOT NULL,
      created_by_user_id INT UNSIGNED NOT NULL,
      amount_rwf DECIMAL(16,2) NOT NULL,
      expense_date DATE NOT NULL,
      description TEXT NULL,
      payment_method VARCHAR(32) NULL,
      reference_no VARCHAR(64) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_ape_activity (activity_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  const migrations = [
    'ALTER TABLE school_action_plans ADD COLUMN deleted_at DATETIME NULL',
    'ALTER TABLE school_action_plans ADD COLUMN strategic_objective TEXT NULL',
    'ALTER TABLE school_action_plans ADD COLUMN manager_review_notes TEXT NULL',
    'ALTER TABLE school_action_plans ADD COLUMN manager_reviewed_at DATETIME NULL',
    'ALTER TABLE school_action_plans ADD COLUMN submitted_at DATETIME NULL',
    'ALTER TABLE school_action_plans ADD COLUMN budget_line_id INT UNSIGNED NULL',
    'ALTER TABLE school_action_plans ADD COLUMN responsible_user_id INT UNSIGNED NULL',
    'ALTER TABLE school_action_plans ADD COLUMN responsible_name VARCHAR(200) NULL',
    'ALTER TABLE school_action_plan_activities ADD COLUMN deleted_at DATETIME NULL',
    'ALTER TABLE school_action_plan_activities ADD COLUMN used_amount_rwf DECIMAL(16,2) NOT NULL DEFAULT 0',
    'ALTER TABLE school_action_plan_activities ADD COLUMN progress_pct TINYINT UNSIGNED NOT NULL DEFAULT 0',
    'ALTER TABLE school_action_plan_activities ADD COLUMN is_frozen TINYINT(1) NOT NULL DEFAULT 0',
    'ALTER TABLE school_action_plan_activities ADD COLUMN budget_line_id INT UNSIGNED NULL',
  ];
  for (const sql of migrations) {
    await promisePool.query(sql).catch(() => {});
  }
  tablesReady = true;
}

function normalizePlanStatus(raw, submit) {
  if (submit) return 'pending_approval';
  const s = String(raw || 'draft').toLowerCase().trim().replace(/\s+/g, '_');
  const map = {
    draft: 'draft',
    pending: 'pending_approval',
    pending_approval: 'pending_approval',
    approved: 'approved',
    ongoing: 'ongoing',
    completed: 'completed',
    cancelled: 'cancelled',
    canceled: 'cancelled',
  };
  const normalized = map[s] || s;
  return PLAN_STATUSES.includes(normalized) ? normalized : 'draft';
}

function mapPlanRow(r, activityStats = {}) {
  return {
    id: r.id,
    planCode: r.plan_code,
    title: r.title,
    academicYear: r.academic_year,
    term: r.term,
    department: r.department,
    strategicObjective: r.strategic_objective || '',
    startDate: r.start_date,
    endDate: r.end_date,
    responsibleUserId: r.responsible_user_id,
    responsibleName: r.responsible_name || '',
    estimatedBudget: Number(r.estimated_budget_rwf || 0),
    fundingSource: r.funding_source || '',
    priorityLevel: r.priority_level,
    status: r.status,
    statusLabel: statusLabel(r.status),
    budgetLineId: r.budget_line_id,
    managerReviewNotes: r.manager_review_notes,
    submittedAt: r.submitted_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    activityCount: Number(activityStats.count || 0),
    usedBudget: Number(activityStats.used || 0),
    completedActivities: Number(activityStats.completed_cnt || activityStats.completed || 0),
    delayedActivities: Number(activityStats.delayed_cnt || activityStats.delayed || 0),
  };
}

function mapActivityRow(r) {
  const est = Number(r.estimated_cost_rwf || 0);
  const used = Number(r.used_amount_rwf || 0);
  return {
    id: r.id,
    actionPlanId: r.action_plan_id,
    activityName: r.activity_name,
    category: r.category || '',
    description: r.description || '',
    department: r.department || '',
    responsibleName: r.responsible_name || '',
    plannedStart: r.planned_start,
    plannedEnd: r.planned_end,
    estimatedCost: est,
    usedAmount: used,
    remaining: Math.max(0, est - used),
    expectedOutcome: r.expected_outcome || '',
    performanceIndicator: r.performance_indicator || '',
    progressPct: Number(r.progress_pct || 0),
    status: r.status,
    statusLabel: statusLabel(r.status),
    budgetLineId: r.budget_line_id,
    isFrozen: Boolean(r.is_frozen),
    usagePct: est > 0 ? Math.round((used / est) * 100) : 0,
  };
}

async function activityStatsForPlan(planId, schoolId) {
  try {
    const [[row]] = await promisePool.query(
      `SELECT COUNT(*) AS count,
              COALESCE(SUM(used_amount_rwf), 0) AS used,
              SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed_cnt,
              SUM(CASE WHEN status = 'delayed' THEN 1 ELSE 0 END) AS delayed_cnt,
              SUM(CASE WHEN status = 'ongoing' THEN 1 ELSE 0 END) AS ongoing_cnt
       FROM school_action_plan_activities
       WHERE action_plan_id = ? AND school_id = ? AND deleted_at IS NULL`,
      [planId, schoolId]
    );
    return row || {};
  } catch (e) {
    try {
      const [[row]] = await promisePool.query(
        `SELECT COUNT(*) AS count,
                COALESCE(SUM(estimated_cost_rwf), 0) AS used,
                0 AS completed_cnt, 0 AS delayed_cnt, 0 AS ongoing_cnt
         FROM school_action_plan_activities
         WHERE action_plan_id = ? AND school_id = ?`,
        [planId, schoolId]
      );
      return row || {};
    } catch (e2) {
      console.warn('[activityStatsForPlan]', planId, e2.message);
      return {};
    }
  }
}

async function mapPlanRowSafe(r, schoolId) {
  try {
    const stats = await activityStatsForPlan(r.id, schoolId);
    return mapPlanRow(r, stats);
  } catch (e) {
    console.warn('[mapPlanRow]', r?.id, e.message);
    return mapPlanRow(r, {});
  }
}

router.use(requireAuth);
router.use(async (_req, res, next) => {
  try {
    await ensureActionPlanTables();
    next();
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to init action plan storage' });
  }
});

router.get('/accountant/action-plans/options', requireRole(ACCOUNTANT_READ), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    let budgetLines = [];
    try {
      const [rows] = await promisePool.query(
        `SELECT id, line_name_key, custom_line_name, department, planned_amount_rwf, used_amount_rwf
         FROM school_budget_lines WHERE school_id = ? AND deleted_at IS NULL ORDER BY id DESC LIMIT 200`,
        [schoolId]
      );
      budgetLines = rows;
    } catch (e) {
      console.warn('[action-plans/options] budget lines:', e.message);
    }
    const [staff] = await promisePool.query(
      `SELECT id, TRIM(CONCAT(COALESCE(first_name,''), ' ', COALESCE(last_name,''))) AS full_name
       FROM users WHERE school_id = ? ORDER BY first_name LIMIT 100`,
      [schoolId]
    ).catch(() => [[]]);
    const [plans] = await promisePool.query(
      `SELECT id, title, plan_code, term, academic_year, status FROM school_action_plans
       WHERE school_id = ? AND deleted_at IS NULL ORDER BY updated_at DESC LIMIT 50`,
      [schoolId]
    );
    const calendar = await loadSchoolAcademicCalendar(schoolId);
    const academicYears = new Set(calendar.academicYears);
    plans.forEach((p) => {
      const y = String(p.academic_year || '').trim();
      if (y) academicYears.add(y);
    });

    res.json({
      success: true,
      data: {
        academicYears: [...academicYears],
        currentAcademicYear: calendar.currentAcademicYear,
        defaultTerm: calendar.defaultTerm,
        termDates: calendar.termDates,
        terms: calendar.terms,
        departments: DEPARTMENTS,
        fundingSources: FUNDING_SOURCES,
        priorities: PRIORITIES,
        planStatuses: [
          { value: 'draft', label: 'Draft' },
          { value: 'pending_approval', label: 'Pending' },
          { value: 'approved', label: 'Approved' },
          { value: 'ongoing', label: 'Ongoing' },
          { value: 'completed', label: 'Completed' },
          { value: 'cancelled', label: 'Cancelled' },
        ],
        activityStatuses: ACTIVITY_STATUSES.map((s) => ({ value: s, label: statusLabel(s) })),
        activityCategories: ACTIVITY_CATEGORIES,
        budgetLines: budgetLines.map((l) => ({
          id: l.id,
          name: String(l.line_name_key).toLowerCase() === 'other' ? l.custom_line_name : l.line_name_key,
          department: l.department,
          planned: Number(l.planned_amount_rwf || 0),
          used: Number(l.used_amount_rwf || 0),
        })),
        staff: (staff || []).map((u) => ({ id: u.id, name: String(u.full_name || '').trim() })).filter((u) => u.name),
        plans,
      },
    });
  } catch (e) {
    console.error('[action-plans/options]:', e.message);
    res.status(500).json({ success: false, message: 'Failed to load options' });
  }
});

router.get('/accountant/action-plans/dashboard', requireRole(ACCOUNTANT_READ), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const planId = Number(req.query?.action_plan_id) || null;

    const [[schoolStats]] = await promisePool.query(
      `SELECT COUNT(*) AS total_plans FROM school_action_plans WHERE school_id = ? AND deleted_at IS NULL`,
      [schoolId]
    );
    const [[actStats]] = await promisePool.query(
      `SELECT COUNT(*) AS total_activities,
              COALESCE(SUM(estimated_cost_rwf), 0) AS planned_budget,
              COALESCE(SUM(used_amount_rwf), 0) AS used_budget,
              SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed_cnt,
              SUM(CASE WHEN status = 'ongoing' THEN 1 ELSE 0 END) AS ongoing_cnt,
              SUM(CASE WHEN status = 'delayed' THEN 1 ELSE 0 END) AS delayed_cnt
       FROM school_action_plan_activities WHERE school_id = ? AND deleted_at IS NULL`,
      [schoolId]
    );

    let activePlan = null;
    let activities = [];
    let notifications = [];

    if (planId) {
      const [[plan]] = await promisePool.query(
        `SELECT * FROM school_action_plans WHERE id = ? AND school_id = ? AND deleted_at IS NULL LIMIT 1`,
        [planId, schoolId]
      );
      if (plan) {
        activePlan = await mapPlanRowSafe(plan, schoolId);
        const [actRows] = await promisePool.query(
          `SELECT * FROM school_action_plan_activities WHERE action_plan_id = ? AND school_id = ? AND deleted_at IS NULL ORDER BY planned_start ASC`,
          [planId, schoolId]
        );
        activities = actRows.map(mapActivityRow);
        activities.forEach((a) => {
          if (a.usagePct >= 100) notifications.push({ id: `b-${a.id}`, type: 'warning', message: `${a.activityName} exceeded budget.` });
          if (a.status === 'delayed') notifications.push({ id: `d-${a.id}`, type: 'danger', message: `${a.activityName} is delayed.` });
        });
        if (plan.status === 'pending_approval') {
          notifications.unshift({ id: 'pending', type: 'info', message: 'Action plan awaiting approval.' });
        }
      }
    }

    const [recentPlans] = await promisePool.query(
      `SELECT * FROM school_action_plans WHERE school_id = ? AND deleted_at IS NULL ORDER BY updated_at DESC LIMIT 8`,
      [schoolId]
    );
    const planned = Number(actStats?.planned_budget || 0);
    const used = Number(actStats?.used_budget || 0);

    res.json({
      success: true,
      data: {
        totals: {
          totalPlans: Number(schoolStats?.total_plans || 0),
          totalActivities: Number(actStats?.total_activities || 0),
          plannedBudget: planned,
          usedBudget: used,
          remainingBudget: Math.max(0, planned - used),
          completedActivities: Number(actStats?.completed_cnt || actStats?.completed || 0),
          ongoingActivities: Number(actStats?.ongoing_cnt || actStats?.ongoing || 0),
          delayedActivities: Number(actStats?.delayed_cnt || actStats?.delayed || 0),
        },
        activePlan,
        activities,
        recentPlans: await Promise.all(recentPlans.map((p) => mapPlanRowSafe(p, schoolId))),
        notifications,
        departmentUsage: await (async () => {
          const [rows] = await promisePool.query(
            `SELECT department, COALESCE(SUM(estimated_cost_rwf),0) AS planned, COALESCE(SUM(used_amount_rwf),0) AS used
             FROM school_action_plan_activities WHERE school_id = ? AND deleted_at IS NULL
             GROUP BY department ORDER BY used DESC LIMIT 10`,
            [schoolId]
          );
          return rows.map((r) => ({ department: r.department || 'Other', planned: Number(r.planned), used: Number(r.used) }));
        })(),
        monthlyTimeline: await (async () => {
          const [rows] = await promisePool.query(
            `SELECT DATE_FORMAT(planned_start, '%b %Y') AS month_label, COUNT(*) AS count
             FROM school_action_plan_activities
             WHERE school_id = ? AND deleted_at IS NULL AND planned_start IS NOT NULL
             GROUP BY YEAR(planned_start), MONTH(planned_start)
             ORDER BY YEAR(planned_start) ASC, MONTH(planned_start) ASC
             LIMIT 12`,
            [schoolId]
          );
          return rows;
        })(),
      },
    });
  } catch (e) {
    console.error('[action-plans/dashboard]:', e.message, e.stack);
    res.status(500).json({ success: false, message: e.message || 'Failed to load dashboard' });
  }
});

router.get('/accountant/action-plans', requireRole(ACCOUNTANT_READ), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    let rows;
    try {
      [rows] = await promisePool.query(
        `SELECT * FROM school_action_plans WHERE school_id = ? AND deleted_at IS NULL ORDER BY updated_at DESC`,
        [schoolId]
      );
    } catch (qErr) {
      console.warn('[action-plans GET] soft-delete filter:', qErr.message);
      [rows] = await promisePool.query(
        `SELECT * FROM school_action_plans WHERE school_id = ? ORDER BY updated_at DESC`,
        [schoolId]
      );
    }
    const data = await Promise.all(rows.map((r) => mapPlanRowSafe(r, schoolId)));
    res.json({ success: true, data });
  } catch (e) {
    console.error('[action-plans GET]:', e.message, e.stack);
    res.status(500).json({ success: false, message: e.message || 'Failed to load action plans' });
  }
});

router.post('/accountant/action-plans', requireRole(ACCOUNTANT_WRITE), async (req, res) => {
  try {
    const { schoolId, userId } = req.ctx;
    const p = req.body || {};
    const title = String(p.title || '').trim();
    if (!title) return res.status(400).json({ success: false, message: 'Title is required' });
    const calendar = await loadSchoolAcademicCalendar(schoolId);
    const academicYear = String(p.academicYear || p.academic_year || '').trim()
      || calendar.currentAcademicYear
      || inferAcademicYearFromDate();
    const term = String(p.term || '').trim() || calendar.defaultTerm || 'Term 1';
    const code = `AP-${Date.now().toString(36).toUpperCase().slice(-6)}`;
    const status = normalizePlanStatus(p.status, Boolean(p.submit));

    const [ins] = await promisePool.query(
      `INSERT INTO school_action_plans
       (school_id, created_by_user_id, plan_code, title, academic_year, term, department, strategic_objective,
        start_date, end_date, responsible_user_id, responsible_name, estimated_budget_rwf, funding_source,
        priority_level, status, budget_line_id, submitted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        schoolId, userId, code, title, academicYear, term,
        String(p.department || 'Administration').trim(),
        String(p.strategicObjective || p.strategic_objective || '').trim() || null,
        parseDate(p.startDate || p.start_date),
        parseDate(p.endDate || p.end_date),
        Number(p.responsibleUserId || p.responsible_user_id) || null,
        String(p.responsibleName || p.responsible_name || '').trim() || null,
        toMoney(p.estimatedBudget ?? p.estimated_budget_rwf),
        String(p.fundingSource || p.funding_source || '').trim() || null,
        String(p.priorityLevel || p.priority_level || 'Medium').trim(),
        status,
        Number(p.budgetLineId || p.budget_line_id) || null,
        p.submit ? new Date() : null,
      ]
    );
    const [[row]] = await promisePool.query(`SELECT * FROM school_action_plans WHERE id = ?`, [ins.insertId]);
    res.status(201).json({ success: true, data: mapPlanRow(row, {}) });
  } catch (e) {
    console.error('[action-plans POST]:', e.message, e.stack);
    res.status(500).json({ success: false, message: e.message || 'Failed to create action plan' });
  }
});

router.patch('/accountant/action-plans/:id', requireRole(ACCOUNTANT_WRITE), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const id = Number(req.params.id);
    const p = req.body || {};
    const fields = [];
    const params = [];
    const map = {
      title: 'title', department: 'department', strategic_objective: 'strategicObjective',
      start_date: 'startDate', end_date: 'endDate', responsible_name: 'responsibleName',
      estimated_budget_rwf: 'estimatedBudget', funding_source: 'fundingSource',
      priority_level: 'priorityLevel', status: 'status', budget_line_id: 'budgetLineId',
    };
    Object.entries(map).forEach(([col, key]) => {
      if (p[key] !== undefined || p[col] !== undefined) {
        fields.push(`${col} = ?`);
        const v = p[key] !== undefined ? p[key] : p[col];
        params.push(col.includes('date') ? parseDate(v) : col.includes('rwf') || col.includes('line_id') ? (col.includes('rwf') ? toMoney(v) : Number(v) || null) : String(v || '').trim());
      }
    });
    if (!fields.length) return res.status(400).json({ success: false, message: 'No fields to update' });
    params.push(id, schoolId);
    await promisePool.query(`UPDATE school_action_plans SET ${fields.join(', ')} WHERE id = ? AND school_id = ?`, params);
    const [[row]] = await promisePool.query(`SELECT * FROM school_action_plans WHERE id = ? AND school_id = ?`, [id, schoolId]);
    res.json({ success: true, data: await mapPlanRowSafe(row, schoolId) });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to update action plan' });
  }
});

router.post('/accountant/action-plan-activities', requireRole(ACCOUNTANT_WRITE), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const p = req.body || {};
    const planId = Number(p.actionPlanId || p.action_plan_id);
    const name = String(p.activityName || p.activity_name || '').trim();
    if (!planId || !name) return res.status(400).json({ success: false, message: 'Plan and activity name required' });
    const [ins] = await promisePool.query(
      `INSERT INTO school_action_plan_activities
       (school_id, action_plan_id, activity_name, category, description, department, responsible_name,
        planned_start, planned_end, estimated_cost_rwf, expected_outcome, performance_indicator, status, budget_line_id, progress_pct)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        schoolId, planId, name,
        String(p.category || '').trim() || null,
        String(p.description || '').trim() || null,
        String(p.department || '').trim() || null,
        String(p.responsibleName || '').trim() || null,
        parseDate(p.plannedStart || p.planned_start),
        parseDate(p.plannedEnd || p.planned_end),
        toMoney(p.estimatedCost ?? p.estimated_cost_rwf),
        String(p.expectedOutcome || '').trim() || null,
        String(p.performanceIndicator || '').trim() || null,
        ACTIVITY_STATUSES.includes(String(p.status || 'not_started')) ? String(p.status) : 'not_started',
        Number(p.budgetLineId) || null,
        Math.min(100, Math.max(0, Number(p.progressPct || 0))),
      ]
    );
    const [[row]] = await promisePool.query(`SELECT * FROM school_action_plan_activities WHERE id = ?`, [ins.insertId]);
    res.status(201).json({ success: true, data: mapActivityRow(row) });
  } catch (e) {
    console.error('[action-plan-activities POST]:', e.message, e.stack);
    res.status(500).json({ success: false, message: e.message || 'Failed to create activity' });
  }
});

router.patch('/accountant/action-plan-activities/:id', requireRole(ACCOUNTANT_WRITE), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const id = Number(req.params.id);
    const p = req.body || {};
    const fields = [];
    const params = [];
    if (p.progressPct !== undefined) { fields.push('progress_pct = ?'); params.push(Math.min(100, Math.max(0, Number(p.progressPct)))); }
    if (p.status !== undefined) { fields.push('status = ?'); params.push(String(p.status)); }
    if (p.estimatedCost !== undefined) { fields.push('estimated_cost_rwf = ?'); params.push(toMoney(p.estimatedCost)); }
    if (p.usedAmount !== undefined) { fields.push('used_amount_rwf = ?'); params.push(toMoney(p.usedAmount)); }
    if (!fields.length) return res.status(400).json({ success: false, message: 'No updates' });
    params.push(id, schoolId);
    await promisePool.query(`UPDATE school_action_plan_activities SET ${fields.join(', ')} WHERE id = ? AND school_id = ?`, params);
    const [[row]] = await promisePool.query(`SELECT * FROM school_action_plan_activities WHERE id = ?`, [id]);
    res.json({ success: true, data: mapActivityRow(row) });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to update activity' });
  }
});

router.post('/accountant/action-plan-activities/:id/expenses', requireRole(ACCOUNTANT_WRITE), async (req, res) => {
  const conn = await promisePool.getConnection();
  try {
    const { schoolId, userId } = req.ctx;
    const activityId = Number(req.params.id);
    const amount = toMoney(req.body?.amount ?? req.body?.amount_rwf);
    if (amount <= 0) return res.status(400).json({ success: false, message: 'Amount required' });

    const [[act]] = await conn.query(
      `SELECT id, estimated_cost_rwf, used_amount_rwf, budget_line_id, activity_name FROM school_action_plan_activities
       WHERE id = ? AND school_id = ? AND deleted_at IS NULL`,
      [activityId, schoolId]
    );
    if (!act) return res.status(404).json({ success: false, message: 'Activity not found' });
    const newUsed = Number(act.used_amount_rwf || 0) + amount;
    if (newUsed > Number(act.estimated_cost_rwf || 0) && Number(act.estimated_cost_rwf) > 0) {
      return res.status(400).json({ success: false, message: 'Expense exceeds activity budget' });
    }

    await conn.beginTransaction();
    await conn.query(
      `INSERT INTO school_action_plan_expenses (school_id, activity_id, created_by_user_id, amount_rwf, expense_date, description, payment_method, reference_no)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        schoolId, activityId, userId, amount,
        parseDate(req.body?.expenseDate) || new Date(),
        String(req.body?.description || '').trim() || null,
        String(req.body?.paymentMethod || '').trim() || null,
        String(req.body?.referenceNo || '').trim() || `APE-${Date.now()}`,
      ]
    );

    if (act.budget_line_id) {
      const [[line]] = await conn.query(
        `SELECT planned_amount_rwf, used_amount_rwf FROM school_budget_lines WHERE id = ? AND school_id = ?`,
        [act.budget_line_id, schoolId]
      );
      if (line && Number(line.used_amount_rwf || 0) + amount > Number(line.planned_amount_rwf || 0)) {
        await conn.rollback();
        return res.status(400).json({ success: false, message: 'Expense exceeds linked budget line' });
      }
      await conn.query(
        `UPDATE school_budget_lines SET used_amount_rwf = used_amount_rwf + ? WHERE id = ? AND school_id = ?`,
        [amount, act.budget_line_id, schoolId]
      );
      await conn.query(
        `INSERT INTO school_budget_line_usage (school_id, budget_line_id, created_by_user_id, usage_amount_rwf, usage_date, description)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [schoolId, act.budget_line_id, userId, amount, parseDate(req.body?.expenseDate) || new Date(), `Action plan: ${act.activity_name}`]
      );
    }

    await conn.query(`UPDATE school_action_plan_activities SET used_amount_rwf = ? WHERE id = ?`, [newUsed, activityId]);
    await conn.commit();
    res.json({ success: true, message: 'Expense recorded', usedAmount: newUsed });
  } catch (e) {
    await conn.rollback().catch(() => {});
    console.error('[activity expense]:', e.message);
    res.status(500).json({ success: false, message: 'Failed to record expense' });
  } finally {
    conn.release();
  }
});

router.get('/accountant/action-plan-activities/:id/expenses', requireRole(ACCOUNTANT_READ), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const activityId = Number(req.params.id);
    const [rows] = await promisePool.query(
      `SELECT * FROM school_action_plan_expenses WHERE activity_id = ? AND school_id = ? ORDER BY id DESC`,
      [activityId, schoolId]
    );
    res.json({
      success: true,
      data: rows.map((r) => ({
        id: r.id, amount: Number(r.amount_rwf), expenseDate: r.expense_date,
        description: r.description, paymentMethod: r.payment_method, referenceNo: r.reference_no,
      })),
    });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to load expenses' });
  }
});

router.patch('/accountant/action-plans/:id/review', requireRole(MANAGER_REVIEW), async (req, res) => {
  try {
    const { schoolId, userId } = req.ctx;
    const id = Number(req.params.id);
    const decision = String(req.body?.decision || '').toLowerCase();
    const notes = String(req.body?.notes || '').trim();
    const map = { approve: 'approved', approved: 'approved', reject: 'cancelled', rejected: 'cancelled', ongoing: 'ongoing' };
    const status = map[decision];
    if (!status) return res.status(400).json({ success: false, message: 'Invalid decision' });
    await promisePool.query(
      `UPDATE school_action_plans SET status = ?, manager_review_notes = ?, manager_reviewed_at = NOW() WHERE id = ? AND school_id = ?`,
      [status, notes || null, id, schoolId]
    );
    const [[row]] = await promisePool.query(`SELECT * FROM school_action_plans WHERE id = ?`, [id]);
    res.json({ success: true, data: await mapPlanRowSafe(row, schoolId) });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to review plan' });
  }
});

module.exports = router;
