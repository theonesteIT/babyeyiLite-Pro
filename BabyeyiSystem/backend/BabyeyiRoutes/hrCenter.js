// ================================================================
// hrCenter.js — HR Center: departments + directory helpers
//
//   GET    /api/school/hr/departments
//   POST   /api/school/hr/departments/seed-defaults
//   POST   /api/school/hr/departments
//   PATCH  /api/school/hr/departments/:deptId
//   DELETE /api/school/hr/departments/:deptId
//   GET    /api/school/hr/directory
// ================================================================

const express = require('express');
const path = require('path');
const fs = require('fs');
const fsp = require('fs').promises;
const multer = require('multer');
const { promisePool } = require('../config/database');
const { requireRole } = require('../middleware/deoAuth');
const { computeProAccessEffective } = require('../utils/schoolSubscription');

const router = express.Router();

const HR_DOC_KEYS = new Set([
  'cv',
  'application_letter',
  'national_id_copy',
  'degree',
  'contract',
  'passport_copy',
  'certificates',
  'other',
]);

const HR_DOCS_ROOT = path.join(__dirname, '..', 'uploads', 'hr-staff-documents');

const HR_DOC_MIMES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const hrDocUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 12 },
});

function extFromMime(mime, originalName) {
  const fromName = path.extname(originalName || '').toLowerCase();
  if (fromName && fromName.length <= 8) return fromName;
  const map = {
    'application/pdf': '.pdf',
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  };
  return map[mime] || '';
}

async function ensureHrDocsDir(schoolId, userId) {
  const dir = path.join(HR_DOCS_ROOT, String(schoolId), String(userId));
  await fsp.mkdir(dir, { recursive: true });
  return dir;
}

async function getStaffHrProfile(schoolId, userId) {
  const [[row]] = await promisePool.query(
    `SELECT st.hr_profile_json
     FROM staff st
     INNER JOIN users u ON u.id = st.user_id AND u.deleted_at IS NULL
     WHERE st.school_id = ? AND u.id = ?
     LIMIT 1`,
    [schoolId, userId]
  );
  if (!row) return null;
  return parseJsonField(row.hr_profile_json) || {};
}

async function saveStaffHrProfile(schoolId, userId, hr) {
  await promisePool.query(
    `UPDATE staff st
     INNER JOIN users u ON u.id = st.user_id AND u.deleted_at IS NULL
     SET st.hr_profile_json = ?
     WHERE st.school_id = ? AND u.id = ?`,
    [JSON.stringify(hr), schoolId, userId]
  );
}

const CREATOR_ROLES = ['SCHOOL_ADMIN', 'SCHOOL_MANAGER', 'DOS', 'ACCOUNTANT'];
const READ_ROLES = [...CREATOR_ROLES, 'SUPER_ADMIN', 'FULL_SYSTEM_CONTROLLER'];

const DEFAULT_DEPARTMENTS = [
  'Leadership',
  'Teaching Staff',
  'Student Welfare',
  'Administration',
  'Finance',
  'ICT',
  'Laboratory',
  'Library',
  'Boarding',
  'Support Staff',
  'Sports & Clubs',
];

function trimStr(v) {
  if (v === undefined || v === null) return '';
  return String(v).trim();
}

function resolveSchoolId(req) {
  return (
    req.ctx?.schoolId ||
    req.session?.school_id ||
    req.session?.schoolId ||
    req.session?.user?.school_id ||
    req.session?.user?.schoolId ||
    req.session?.user?.school?.id ||
    req.user?.school_id ||
    req.user?.schoolId ||
    null
  );
}

function resolveRequesterRole(req) {
  return String(
    req.user?.role_code ||
    req.session?.user?.role?.code ||
    req.session?.user?.role_code ||
    req.session?.roleCode ||
    ''
  ).toUpperCase();
}

async function ensureHrDepartmentsTable() {
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS hr_departments (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      school_id INT UNSIGNED NOT NULL,
      name VARCHAR(120) NOT NULL,
      parent_id INT UNSIGNED NULL,
      head_name VARCHAR(180) NULL,
      budget_rwf DECIMAL(14,2) NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_hr_dept_school_name (school_id, name),
      KEY idx_hr_dept_school (school_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `).catch(() => {});
}

async function ensureStaffHrExtras() {
  await promisePool.query('ALTER TABLE staff ADD COLUMN hr_profile_json JSON NULL').catch(() => {});
  await promisePool.query('ALTER TABLE staff ADD COLUMN payroll_account_holder VARCHAR(180) NULL').catch(() => {});
}

async function ensureProSchool(req, res) {
  const role = resolveRequesterRole(req);
  const elevated = role === 'SUPER_ADMIN' || role === 'FULL_SYSTEM_CONTROLLER';
  let schoolId = resolveSchoolId(req);
  if (elevated) {
    const raw = req.query.school_id ?? req.headers['x-babyeyi-school-id'];
    const id = Number(raw);
    if (Number.isFinite(id) && id > 0) schoolId = id;
  }
  if (!schoolId) {
    res.status(400).json({
      success: false,
      message: elevated ? 'school_id is required.' : 'School not found in session.',
    });
    return null;
  }
  const [[schoolRow]] = await promisePool.query(
    `SELECT id, school_name, subscription_plan, pro_enabled, pro_end_date
     FROM schools WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
    [schoolId]
  );
  const isPro = computeProAccessEffective(schoolRow || null);
  const liteHr = CREATOR_ROLES.includes(role);
  if (!isPro && !elevated && !liteHr) {
    res.status(403).json({
      success: false,
      code: 'PRO_REQUIRED',
      message: 'HR Center is available for Pro schools only.',
    });
    return null;
  }
  return { schoolId, schoolName: schoolRow?.school_name || 'Your school' };
}

async function countStaffByDepartment(schoolId) {
  const [rows] = await promisePool.query(
    `SELECT COALESCE(NULLIF(TRIM(st.department), ''), 'Unassigned') AS department,
            COUNT(*) AS cnt,
            SUM(CASE WHEN LOWER(COALESCE(st.gender, '')) IN ('male', 'm') THEN 1 ELSE 0 END) AS male_cnt,
            SUM(CASE WHEN LOWER(COALESCE(st.gender, '')) IN ('female', 'f') THEN 1 ELSE 0 END) AS female_cnt
     FROM staff st
     INNER JOIN users u ON u.id = st.user_id AND u.deleted_at IS NULL
     WHERE st.school_id = ?
     GROUP BY COALESCE(NULLIF(TRIM(st.department), ''), 'Unassigned')`,
    [schoolId]
  );
  const map = {};
  for (const r of rows || []) {
    map[r.department] = {
      employees: Number(r.cnt) || 0,
      male: Number(r.male_cnt) || 0,
      female: Number(r.female_cnt) || 0,
    };
  }
  return map;
}

// GET /api/school/hr/departments
router.get('/school/hr/departments', requireRole(READ_ROLES), async (req, res) => {
  try {
    await ensureHrDepartmentsTable();
    const ctx = await ensureProSchool(req, res);
    if (!ctx) return;
    const { schoolId } = ctx;
    const staffCounts = await countStaffByDepartment(schoolId);

    const [rows] = await promisePool.query(
      `SELECT id, school_id, name, parent_id, head_name, budget_rwf, is_active, created_at, updated_at
       FROM hr_departments
       WHERE school_id = ? AND is_active = 1
       ORDER BY name ASC`,
      [schoolId]
    );

    const data = (rows || []).map((d) => {
      const stats = staffCounts[d.name] || { employees: 0, male: 0, female: 0 };
      return {
        ...d,
        employees: stats.employees,
        male: stats.male,
        female: stats.female,
      };
    });

    return res.json({ success: true, data });
  } catch (err) {
    console.error('GET /api/school/hr/departments:', err);
    return res.status(500).json({ success: false, message: 'Failed to load departments' });
  }
});

// POST /api/school/hr/departments/seed-defaults
router.post('/school/hr/departments/seed-defaults', requireRole(CREATOR_ROLES), async (req, res) => {
  try {
    await ensureHrDepartmentsTable();
    const ctx = await ensureProSchool(req, res);
    if (!ctx) return;
    const { schoolId } = ctx;

    let inserted = 0;
    for (const name of DEFAULT_DEPARTMENTS) {
      const [result] = await promisePool.query(
        `INSERT IGNORE INTO hr_departments (school_id, name) VALUES (?, ?)`,
        [schoolId, name]
      );
      if (result?.affectedRows > 0) inserted += 1;
    }

    const [rows] = await promisePool.query(
      `SELECT id, name FROM hr_departments WHERE school_id = ? AND is_active = 1 ORDER BY name`,
      [schoolId]
    );

    return res.json({
      success: true,
      message: inserted > 0 ? `Added ${inserted} default department(s).` : 'Default departments already exist.',
      data: rows,
      inserted,
    });
  } catch (err) {
    console.error('POST /api/school/hr/departments/seed-defaults:', err);
    return res.status(500).json({ success: false, message: 'Failed to seed departments' });
  }
});

// POST /api/school/hr/departments
router.post('/school/hr/departments', requireRole(CREATOR_ROLES), async (req, res) => {
  try {
    await ensureHrDepartmentsTable();
    const ctx = await ensureProSchool(req, res);
    if (!ctx) return;
    const { schoolId } = ctx;
    const name = trimStr(req.body?.name);
    if (!name) {
      return res.status(400).json({ success: false, message: 'Department name is required.' });
    }
    const headName = trimStr(req.body?.head_name) || null;
    const budget = req.body?.budget_rwf != null && req.body.budget_rwf !== ''
      ? Number(req.body.budget_rwf)
      : null;
    const parentId = req.body?.parent_id ? Number(req.body.parent_id) : null;

    const [result] = await promisePool.query(
      `INSERT INTO hr_departments (school_id, name, parent_id, head_name, budget_rwf)
       VALUES (?, ?, ?, ?, ?)`,
      [schoolId, name, parentId, headName, budget]
    );

    return res.status(201).json({
      success: true,
      data: { id: result.insertId, name, head_name: headName, budget_rwf: budget },
    });
  } catch (err) {
    const raw = String(err?.message || '');
    if (raw.includes('Duplicate')) {
      return res.status(409).json({ success: false, message: 'This department already exists.' });
    }
    console.error('POST /api/school/hr/departments:', err);
    return res.status(500).json({ success: false, message: 'Failed to create department' });
  }
});

// PATCH /api/school/hr/departments/:deptId
router.patch('/school/hr/departments/:deptId', requireRole(CREATOR_ROLES), async (req, res) => {
  try {
    await ensureHrDepartmentsTable();
    const ctx = await ensureProSchool(req, res);
    if (!ctx) return;
    const deptId = Number(req.params.deptId);
    if (!Number.isFinite(deptId) || deptId <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid department id.' });
    }

    const fields = [];
    const params = [];
    if (req.body?.name != null) {
      fields.push('name = ?');
      params.push(trimStr(req.body.name));
    }
    if (req.body?.head_name != null) {
      fields.push('head_name = ?');
      params.push(trimStr(req.body.head_name) || null);
    }
    if (req.body?.budget_rwf != null) {
      fields.push('budget_rwf = ?');
      params.push(req.body.budget_rwf === '' ? null : Number(req.body.budget_rwf));
    }
    if (!fields.length) {
      return res.status(400).json({ success: false, message: 'No fields to update.' });
    }
    params.push(deptId, ctx.schoolId);

    const [result] = await promisePool.query(
      `UPDATE hr_departments SET ${fields.join(', ')} WHERE id = ? AND school_id = ?`,
      params
    );
    if (!result.affectedRows) {
      return res.status(404).json({ success: false, message: 'Department not found.' });
    }
    return res.json({ success: true, message: 'Department updated.' });
  } catch (err) {
    console.error('PATCH /api/school/hr/departments/:deptId:', err);
    return res.status(500).json({ success: false, message: 'Failed to update department' });
  }
});

// DELETE /api/school/hr/departments/:deptId
router.delete('/school/hr/departments/:deptId', requireRole(CREATOR_ROLES), async (req, res) => {
  try {
    await ensureHrDepartmentsTable();
    const ctx = await ensureProSchool(req, res);
    if (!ctx) return;
    const deptId = Number(req.params.deptId);

    const [result] = await promisePool.query(
      'UPDATE hr_departments SET is_active = 0 WHERE id = ? AND school_id = ?',
      [deptId, ctx.schoolId]
    );
    if (!result.affectedRows) {
      return res.status(404).json({ success: false, message: 'Department not found.' });
    }
    return res.json({ success: true, message: 'Department removed.' });
  } catch (err) {
    console.error('DELETE /api/school/hr/departments/:deptId:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete department' });
  }
});

function mapEmploymentStatus(row) {
  const status = trimStr(row.employment_status) || (row.is_active ? 'Active' : 'Inactive');
  if (/leave/i.test(status)) return 'On Leave';
  if (/probation/i.test(status)) return 'Probation';
  if (/suspend/i.test(status)) return 'Suspended';
  if (/terminat/i.test(status)) return 'Terminated';
  if (row.is_active) return 'Active';
  return status || 'Inactive';
}

function isTeacherRole(roleCode) {
  const r = String(roleCode || '').toUpperCase();
  return r === 'TEACHER' || r === 'DOS' || r === 'HOD';
}

function isSupportRole(roleCode) {
  const r = String(roleCode || '').toUpperCase();
  return ['STORE_MANAGER', 'ASSETS_MANAGER', 'LIBRARIAN', 'GATE_KEEPER', 'GATE_OFFICER', 'SECRETARY'].includes(r);
}

// GET /api/school/hr/directory
router.get('/school/hr/directory', requireRole(READ_ROLES), async (req, res) => {
  try {
    await ensureStaffHrExtras();
    const ctx = await ensureProSchool(req, res);
    if (!ctx) return;
    const { schoolId } = ctx;

    const search = trimStr(req.query.search).toLowerCase();
    const department = trimStr(req.query.department);
    const status = trimStr(req.query.status);
    const contract = trimStr(req.query.contract);
    const position = trimStr(req.query.position);
    const year = trimStr(req.query.year);
    const month = trimStr(req.query.month);

    const [rows] = await promisePool.query(
      `SELECT
         u.id,
         u.user_uid,
         u.email,
         u.phone,
         u.first_name,
         u.last_name,
         u.is_active,
         u.created_at,
         u.photo,
         r.role_code,
         r.role_name,
         st.staff_id,
         st.full_name,
         st.gender,
         st.date_of_employment,
         st.contract_start_date,
         st.contract_end_date,
         st.employment_status,
         st.employment_type,
         st.department,
         st.job_title,
         st.address,
         st.termination_date,
         st.account_enabled,
         st.payroll_basic_salary,
         st.payroll_payment_method,
         st.payroll_bank_name,
         st.payroll_account_number,
         st.payroll_account_holder,
         st.payroll_mobile_money_phone,
         st.hr_profile_json
       FROM staff st
       INNER JOIN users u ON u.id = st.user_id AND u.deleted_at IS NULL
       INNER JOIN roles r ON r.id = u.role_id
       WHERE st.school_id = ?
       ORDER BY u.created_at DESC`,
      [schoolId]
    );

    let list = (rows || []).map((s) => {
      const name = s.full_name || `${s.first_name || ''} ${s.last_name || ''}`.trim();
      const empStatus = mapEmploymentStatus(s);
      const contractType = trimStr(s.employment_type) || 'Permanent';
      const positionLabel = s.job_title || s.role_name || s.role_code || '';
      const hr = parseJsonField(s.hr_profile_json) || {};
      const res = hr.residence || {};
      const residenceAddr = [res.village, res.cell, res.sector, res.district, res.province].filter(Boolean).join(', ');
      const address = trimStr(s.address) || residenceAddr || null;
      return {
        id: s.id,
        employee_id: s.staff_id || s.user_uid,
        name,
        email: s.email,
        phone: s.phone,
        photo: s.photo,
        address,
        department: s.department || 'Unassigned',
        position: positionLabel,
        role_code: s.role_code,
        role_name: s.role_name,
        status: empStatus,
        contract: contractType,
        employment_type: contractType,
        contract_start: s.contract_start_date || null,
        contract_end: s.contract_end_date || null,
        payroll_basic_salary: s.payroll_basic_salary,
        payroll_payment_method: s.payroll_payment_method,
        payroll_bank_name: s.payroll_bank_name,
        payroll_account_number: s.payroll_account_number,
        payroll_account_holder: s.payroll_account_holder,
        payroll_mobile_money_phone: s.payroll_mobile_money_phone,
        hire_date: s.date_of_employment || s.contract_start_date || s.created_at,
        termination_date: s.termination_date || null,
        account_enabled: s.account_enabled !== 0 && s.account_enabled !== false,
        gender: s.gender,
        is_active: !!s.is_active,
        hr_profile: hr,
      };
    });

    if (search) {
      list = list.filter(
        (e) =>
          e.name.toLowerCase().includes(search) ||
          String(e.employee_id || '').toLowerCase().includes(search) ||
          e.position.toLowerCase().includes(search) ||
          (e.email || '').toLowerCase().includes(search)
      );
    }
    if (department && department !== 'All') {
      list = list.filter((e) => e.department === department);
    }
    if (status && status !== 'All') {
      list = list.filter((e) => e.status === status);
    }
    if (contract && contract !== 'All') {
      list = list.filter((e) => e.contract === contract);
    }
    if (position && position !== 'All') {
      list = list.filter(
        (e) =>
          e.position === position ||
          e.role_code === position ||
          e.position.toLowerCase().includes(position.toLowerCase())
      );
    }
    if ((year && year !== 'All') || (month && month !== 'All')) {
      const statusForDate = status && status !== 'All' ? status : 'All';
      list = list.filter((e) => {
        const useTermination = statusForDate === 'Terminated';
        const raw = useTermination ? (e.termination_date || e.hire_date) : e.hire_date;
        if (!raw) return false;
        const d = new Date(raw);
        if (Number.isNaN(d.getTime())) return false;
        if (year && year !== 'All' && d.getFullYear() !== Number(year)) return false;
        if (month && month !== 'All' && d.getMonth() + 1 !== Number(month)) return false;
        return true;
      });
    }

    const total = list.length;
    const active = list.filter((e) => e.status === 'Active').length;
    const teachers = list.filter((e) => isTeacherRole(e.role_code)).length;
    const support = list.filter((e) => isSupportRole(e.role_code)).length;
    const onLeave = list.filter((e) => e.status === 'On Leave').length;
    const terminated = list.filter((e) => e.status === 'Terminated').length;

    return res.json({
      success: true,
      data: list,
      stats: {
        total,
        active,
        teachers,
        support,
        on_leave: onLeave,
        terminated,
        active_pct: total > 0 ? Math.round((active / total) * 1000) / 10 : 0,
        teachers_pct: total > 0 ? Math.round((teachers / total) * 1000) / 10 : 0,
        support_pct: total > 0 ? Math.round((support / total) * 1000) / 10 : 0,
        on_leave_pct: total > 0 ? Math.round((onLeave / total) * 1000) / 10 : 0,
      },
    });
  } catch (err) {
    console.error('GET /api/school/hr/directory:', err);
    return res.status(500).json({ success: false, message: 'Failed to load employee directory' });
  }
});

function parseJsonField(raw) {
  if (raw == null || raw === '') return null;
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function ensureLeaveTables() {
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS hr_leave_requests (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      school_id INT UNSIGNED NOT NULL,
      staff_user_id INT UNSIGNED NOT NULL,
      leave_type VARCHAR(80) NOT NULL,
      leave_type_other VARCHAR(120) NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      total_days DECIMAL(5,1) NOT NULL DEFAULT 0,
      exclude_weekends TINYINT(1) NOT NULL DEFAULT 0,
      exclude_holidays TINYINT(1) NOT NULL DEFAULT 0,
      half_day TINYINT(1) NOT NULL DEFAULT 0,
      reason TEXT NULL,
      emergency_phone VARCHAR(30) NULL,
      alt_contact VARCHAR(120) NULL,
      leave_address TEXT NULL,
      attachments_json JSON NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'Pending',
      approver_name VARCHAR(120) NULL,
      approver_position VARCHAR(120) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_leave_school (school_id),
      KEY idx_leave_staff (staff_user_id),
      KEY idx_leave_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `).catch(() => {});

  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS hr_leave_balances (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      school_id INT UNSIGNED NOT NULL,
      staff_user_id INT UNSIGNED NOT NULL,
      leave_type VARCHAR(80) NOT NULL DEFAULT 'Annual Leave',
      year INT NOT NULL,
      entitlement DECIMAL(5,1) NOT NULL DEFAULT 21,
      used_days DECIMAL(5,1) NOT NULL DEFAULT 0,
      PRIMARY KEY (id),
      UNIQUE KEY uq_leave_balance (school_id, staff_user_id, leave_type, year)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `).catch(() => {});
}

function calcBusinessDays(startStr, endStr, opts = {}) {
  const start = new Date(startStr);
  const end = new Date(endStr);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0;
  let days = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const dow = cur.getDay();
    const isWeekend = dow === 0 || dow === 6;
    if (!opts.excludeWeekends || !isWeekend) days += 1;
    cur.setDate(cur.getDate() + 1);
  }
  if (opts.halfDay && days > 0) return 0.5;
  return days;
}

async function getOrCreateLeaveBalance(schoolId, staffUserId, leaveType, year) {
  const lt = leaveType || 'Annual Leave';
  const [[row]] = await promisePool.query(
    `SELECT entitlement, used_days FROM hr_leave_balances
     WHERE school_id = ? AND staff_user_id = ? AND leave_type = ? AND year = ? LIMIT 1`,
    [schoolId, staffUserId, lt, year]
  );
  if (row) return row;
  const entitlement = /annual/i.test(lt) ? 21 : /sick/i.test(lt) ? 15 : 10;
  await promisePool.query(
    `INSERT INTO hr_leave_balances (school_id, staff_user_id, leave_type, year, entitlement, used_days)
     VALUES (?, ?, ?, ?, ?, 0)`,
    [schoolId, staffUserId, lt, year, entitlement]
  );
  return { entitlement, used_days: 0 };
}

function mapStaffProfileRow(s) {
  const hr = parseJsonField(s.hr_profile_json) || {};
  const name = s.full_name || `${s.first_name || ''} ${s.last_name || ''}`.trim();
  return {
    id: s.id,
    user_uid: s.user_uid,
    employee_id: s.staff_id || s.user_uid,
    name,
    first_name: s.first_name,
    last_name: s.last_name,
    email: s.email,
    username: s.username || s.staff_login_username || null,
    account_enabled: s.account_enabled == null ? true : Number(s.account_enabled) === 1,
    phone: s.phone,
    photo: s.photo,
    gender: s.gender,
    date_of_birth: s.date_of_birth,
    national_id: s.national_id,
    passport_number: s.passport_number,
    address: s.address,
    department: s.department,
    sub_department: s.sub_department,
    position: s.job_title || s.role_name || s.role_code,
    role_code: s.role_code,
    role_name: s.role_name,
    employment_type: s.employment_type,
    employment_status: mapEmploymentStatus(s),
    hire_date: s.date_of_employment || s.contract_start_date || s.created_at,
    contract_start: s.contract_start_date,
    contract_end: s.contract_end_date,
    is_active: !!s.is_active,
    payroll_basic_salary: s.payroll_basic_salary,
    payroll_bank_name: s.payroll_bank_name,
    payroll_account_number: s.payroll_account_number,
    payroll_account_holder: s.payroll_account_holder,
    payroll_mobile_money_phone: s.payroll_mobile_money_phone,
    payroll_payment_method: s.payroll_payment_method,
    hr_profile: hr,
  };
}

// GET /api/school/hr/employees/:userId
router.get('/school/hr/employees/:userId', requireRole(READ_ROLES), async (req, res) => {
  try {
    await ensureStaffHrExtras();
    const ctx = await ensureProSchool(req, res);
    if (!ctx) return;
    const userId = Number(req.params.userId);
    if (!Number.isFinite(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid employee id.' });
    }

    const [rows] = await promisePool.query(
      `SELECT
         u.id, u.user_uid, u.email, u.username, u.phone, u.first_name, u.last_name, u.is_active, u.created_at, u.photo,
         r.role_code, r.role_name,
         st.staff_id, st.username AS staff_login_username, st.account_enabled,
         st.full_name, st.gender, st.date_of_birth, st.national_id, st.passport_number, st.address,
         st.employment_type, st.job_title, st.date_of_employment, st.contract_start_date, st.contract_end_date,
         st.employment_status, st.department, st.sub_department,
         st.payroll_basic_salary, st.payroll_bank_name, st.payroll_account_number, st.payroll_account_holder,
         st.payroll_mobile_money_phone, st.payroll_payment_method, st.hr_profile_json
       FROM staff st
       INNER JOIN users u ON u.id = st.user_id AND u.deleted_at IS NULL
       INNER JOIN roles r ON r.id = u.role_id
       WHERE st.school_id = ? AND u.id = ?
       LIMIT 1`,
      [ctx.schoolId, userId]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }
    return res.json({ success: true, data: mapStaffProfileRow(rows[0]) });
  } catch (err) {
    console.error('GET /api/school/hr/employees/:userId:', err);
    return res.status(500).json({ success: false, message: 'Failed to load employee profile' });
  }
});

// POST /api/school/hr/employees/:userId/documents — multipart fields named by doc key (cv, national_id_copy, …)
router.post(
  '/school/hr/employees/:userId/documents',
  requireRole(CREATOR_ROLES),
  (req, res, next) => {
    hrDocUpload.any()(req, res, (err) => {
      if (err) {
        const msg = err.code === 'LIMIT_FILE_SIZE'
          ? 'File too large (max 5 MB per document).'
          : (err.message || 'Upload failed');
        return res.status(400).json({ success: false, message: msg });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      await ensureStaffHrExtras();
      const ctx = await ensureProSchool(req, res);
      if (!ctx) return;

      const userId = Number(req.params.userId);
      if (!Number.isFinite(userId)) {
        return res.status(400).json({ success: false, message: 'Invalid employee id.' });
      }

      const files = Array.isArray(req.files) ? req.files : [];
      if (!files.length) {
        return res.status(400).json({ success: false, message: 'No document files received.' });
      }

      const hr = await getStaffHrProfile(ctx.schoolId, userId);
      if (hr === null) {
        return res.status(404).json({ success: false, message: 'Employee not found.' });
      }

      const docsDir = await ensureHrDocsDir(ctx.schoolId, userId);
      const documents = { ...(hr.documents || {}) };
      const saved = {};

      for (const file of files) {
        const docKey = String(file.fieldname || '').trim();
        if (!HR_DOC_KEYS.has(docKey)) continue;

        const mime = String(file.mimetype || '').toLowerCase();
        if (!HR_DOC_MIMES.has(mime)) {
          return res.status(400).json({
            success: false,
            message: `Unsupported file type for ${docKey}. Use PDF, JPG, PNG, or Word.`,
          });
        }

        const ext = extFromMime(mime, file.originalname);
        const filename = `${docKey}_${Date.now()}${ext}`;
        const absPath = path.join(docsDir, filename);
        await fsp.writeFile(absPath, file.buffer);

        const publicPath = `/uploads/hr-staff-documents/${ctx.schoolId}/${userId}/${filename}`;
        const entry = {
          name: file.originalname || filename,
          path: publicPath,
        };
        documents[docKey] = entry;
        saved[docKey] = entry;
      }

      if (!Object.keys(saved).length) {
        return res.status(400).json({ success: false, message: 'No valid document fields (use cv, application_letter, etc.).' });
      }

      hr.documents = documents;
      await saveStaffHrProfile(ctx.schoolId, userId, hr);

      return res.json({
        success: true,
        message: 'Documents saved.',
        data: { documents: saved },
      });
    } catch (err) {
      console.error('POST /api/school/hr/employees/:userId/documents:', err);
      return res.status(500).json({ success: false, message: err.message || 'Failed to upload documents' });
    }
  }
);

// GET /api/school/hr/leave/stats
router.get('/school/hr/leave/stats', requireRole(READ_ROLES), async (req, res) => {
  try {
    await ensureLeaveTables();
    const ctx = await ensureProSchool(req, res);
    if (!ctx) return;
    const year = new Date().getFullYear();

    const [[counts]] = await promisePool.query(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) AS pending,
         SUM(CASE WHEN status = 'Approved' THEN 1 ELSE 0 END) AS approved,
         SUM(CASE WHEN status = 'Rejected' THEN 1 ELSE 0 END) AS rejected,
         SUM(CASE WHEN status = 'Draft' THEN 1 ELSE 0 END) AS draft
       FROM hr_leave_requests WHERE school_id = ? AND YEAR(created_at) = ?`,
      [ctx.schoolId, year]
    );

    const [[onLeave]] = await promisePool.query(
      `SELECT COUNT(DISTINCT staff_user_id) AS cnt FROM hr_leave_requests
       WHERE school_id = ? AND status = 'Approved'
         AND CURDATE() BETWEEN start_date AND end_date`,
      [ctx.schoolId]
    );

    const [balRows] = await promisePool.query(
      `SELECT SUM(entitlement - used_days) AS remaining FROM hr_leave_balances
       WHERE school_id = ? AND leave_type = 'Annual Leave' AND year = ?`,
      [ctx.schoolId, year]
    );

    return res.json({
      success: true,
      data: {
        total: Number(counts?.total) || 0,
        pending: Number(counts?.pending) || 0,
        approved: Number(counts?.approved) || 0,
        rejected: Number(counts?.rejected) || 0,
        on_leave: Number(onLeave?.cnt) || 0,
        annual_balance: Number(balRows[0]?.remaining) || 0,
      },
    });
  } catch (err) {
    console.error('GET /api/school/hr/leave/stats:', err);
    return res.status(500).json({ success: false, message: 'Failed to load leave stats' });
  }
});

// GET /api/school/hr/leave/balance/:userId
router.get('/school/hr/leave/balance/:userId', requireRole(READ_ROLES), async (req, res) => {
  try {
    await ensureLeaveTables();
    const ctx = await ensureProSchool(req, res);
    if (!ctx) return;
    const userId = Number(req.params.userId);
    const leaveType = trimStr(req.query.leave_type) || 'Annual Leave';
    const year = Number(req.query.year) || new Date().getFullYear();
    const bal = await getOrCreateLeaveBalance(ctx.schoolId, userId, leaveType, year);
    const remaining = Number(bal.entitlement) - Number(bal.used_days);
    return res.json({
      success: true,
      data: {
        leave_type: leaveType,
        year,
        entitlement: Number(bal.entitlement),
        used: Number(bal.used_days),
        remaining,
      },
    });
  } catch (err) {
    console.error('GET /api/school/hr/leave/balance/:userId:', err);
    return res.status(500).json({ success: false, message: 'Failed to load leave balance' });
  }
});

// GET /api/school/hr/leave
router.get('/school/hr/leave', requireRole(READ_ROLES), async (req, res) => {
  try {
    await ensureLeaveTables();
    const ctx = await ensureProSchool(req, res);
    if (!ctx) return;

    const status = trimStr(req.query.status);
    const department = trimStr(req.query.department);
    const leaveType = trimStr(req.query.leave_type);
    const staffUserId = Number(req.query.staff_user_id) || 0;
    const dateFrom = trimStr(req.query.date_from);
    const dateTo = trimStr(req.query.date_to);
    const search = trimStr(req.query.search).toLowerCase();

    let sql = `
      SELECT lr.*, st.staff_id, st.full_name, st.department, st.job_title, u.email, u.photo
      FROM hr_leave_requests lr
      INNER JOIN users u ON u.id = lr.staff_user_id AND u.deleted_at IS NULL
      INNER JOIN staff st ON st.user_id = u.id AND st.school_id = lr.school_id
      WHERE lr.school_id = ?`;
    const params = [ctx.schoolId];

    if (status && status !== 'All') {
      sql += ' AND lr.status = ?';
      params.push(status);
    }
    if (department && department !== 'All') {
      sql += ' AND st.department = ?';
      params.push(department);
    }
    if (leaveType && leaveType !== 'All') {
      sql += ' AND lr.leave_type = ?';
      params.push(leaveType);
    }
    if (staffUserId > 0) {
      sql += ' AND lr.staff_user_id = ?';
      params.push(staffUserId);
    }
    if (dateFrom) {
      sql += ' AND lr.start_date >= ?';
      params.push(dateFrom);
    }
    if (dateTo) {
      sql += ' AND lr.end_date <= ?';
      params.push(dateTo);
    }
    sql += ' ORDER BY lr.created_at DESC';

    const [rows] = await promisePool.query(sql, params);
    let list = (rows || []).map((r) => ({
      id: r.id,
      staff_user_id: r.staff_user_id,
      employee_id: r.staff_id,
      employee_name: r.full_name,
      department: r.department,
      position: r.job_title,
      email: r.email,
      photo: r.photo,
      leave_type: r.leave_type_other ? `${r.leave_type} (${r.leave_type_other})` : r.leave_type,
      leave_type_code: r.leave_type,
      start_date: r.start_date,
      end_date: r.end_date,
      total_days: Number(r.total_days),
      status: r.status,
      reason: r.reason,
      applied_at: r.created_at,
      updated_at: r.updated_at,
      approver_name: r.approver_name,
      approver_position: r.approver_position,
      emergency_phone: r.emergency_phone,
      alt_contact: r.alt_contact,
      leave_address: r.leave_address,
      attachments: parseJsonField(r.attachments_json) || [],
    }));

    if (search) {
      list = list.filter(
        (r) =>
          r.employee_name?.toLowerCase().includes(search) ||
          String(r.employee_id || '').toLowerCase().includes(search) ||
          String(r.id).includes(search)
      );
    }

    return res.json({ success: true, data: list });
  } catch (err) {
    console.error('GET /api/school/hr/leave:', err);
    return res.status(500).json({ success: false, message: 'Failed to load leave requests' });
  }
});

// POST /api/school/hr/leave
router.post('/school/hr/leave', requireRole(CREATOR_ROLES), async (req, res) => {
  try {
    await ensureLeaveTables();
    const ctx = await ensureProSchool(req, res);
    if (!ctx) return;

    const body = req.body || {};
    const staffUserId = Number(body.staff_user_id);
    if (!Number.isFinite(staffUserId) || staffUserId <= 0) {
      return res.status(400).json({ success: false, message: 'Employee is required.' });
    }

    const leaveType = trimStr(body.leave_type);
    const leaveTypeOther = trimStr(body.leave_type_other) || null;
    const startDate = trimStr(body.start_date);
    const endDate = trimStr(body.end_date);
    if (!leaveType || !startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'Leave type and dates are required.' });
    }

    const excludeWeekends = !!body.exclude_weekends;
    const excludeHolidays = !!body.exclude_holidays;
    const halfDay = !!body.half_day;
    const totalDays = calcBusinessDays(startDate, endDate, { excludeWeekends, halfDay });
    const status = body.save_draft ? 'Draft' : 'Pending';
    const year = new Date(startDate).getFullYear();
    const balanceType = /annual/i.test(leaveType) ? 'Annual Leave' : leaveType;

    if (status === 'Pending' && /annual/i.test(leaveType)) {
      const bal = await getOrCreateLeaveBalance(ctx.schoolId, staffUserId, balanceType, year);
      const remaining = Number(bal.entitlement) - Number(bal.used_days);
      if (totalDays > remaining) {
        return res.status(400).json({
          success: false,
          message: `Insufficient leave balance. You only have ${remaining} day(s) remaining.`,
          code: 'INSUFFICIENT_BALANCE',
          remaining,
        });
      }
    }

    const attachments = body.attachments || null;
    const [result] = await promisePool.query(
      `INSERT INTO hr_leave_requests (
         school_id, staff_user_id, leave_type, leave_type_other, start_date, end_date, total_days,
         exclude_weekends, exclude_holidays, half_day, reason, emergency_phone, alt_contact, leave_address,
         attachments_json, status, approver_name, approver_position
       ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        ctx.schoolId, staffUserId, leaveType, leaveTypeOther, startDate, endDate, totalDays,
        excludeWeekends ? 1 : 0, excludeHolidays ? 1 : 0, halfDay ? 1 : 0,
        trimStr(body.reason) || null, trimStr(body.emergency_phone) || null,
        trimStr(body.alt_contact) || null, trimStr(body.leave_address) || null,
        attachments ? JSON.stringify(attachments) : null,
        status, trimStr(body.approver_name) || 'HR Manager', trimStr(body.approver_position) || 'HR',
      ]
    );

    if (status === 'Pending' && /annual/i.test(leaveType)) {
      await promisePool.query(
        `UPDATE hr_leave_balances SET used_days = used_days + ?
         WHERE school_id = ? AND staff_user_id = ? AND leave_type = ? AND year = ?`,
        [totalDays, ctx.schoolId, staffUserId, balanceType, year]
      );
    }

    return res.status(201).json({
      success: true,
      message: status === 'Draft' ? 'Leave request saved as draft.' : 'Leave request submitted.',
      data: { id: result.insertId, total_days: totalDays, status },
    });
  } catch (err) {
    console.error('POST /api/school/hr/leave:', err);
    return res.status(500).json({ success: false, message: 'Failed to submit leave request' });
  }
});

// PATCH /api/school/hr/leave/:id
router.patch('/school/hr/leave/:id', requireRole(CREATOR_ROLES), async (req, res) => {
  try {
    await ensureLeaveTables();
    const ctx = await ensureProSchool(req, res);
    if (!ctx) return;
    const id = Number(req.params.id);
    const newStatus = trimStr(req.body?.status);
    if (!['Approved', 'Rejected', 'Pending'].includes(newStatus)) {
      return res.status(400).json({ success: false, message: 'Invalid status.' });
    }

    const [result] = await promisePool.query(
      'UPDATE hr_leave_requests SET status = ?, updated_at = NOW() WHERE id = ? AND school_id = ?',
      [newStatus, id, ctx.schoolId]
    );
    if (!result.affectedRows) {
      return res.status(404).json({ success: false, message: 'Leave request not found.' });
    }
    return res.json({ success: true, message: `Leave request ${newStatus.toLowerCase()}.` });
  } catch (err) {
    console.error('PATCH /api/school/hr/leave/:id:', err);
    return res.status(500).json({ success: false, message: 'Failed to update leave request' });
  }
});

module.exports = router;
module.exports.DEFAULT_DEPARTMENTS = DEFAULT_DEPARTMENTS;
module.exports.ensureHrDepartmentsTable = ensureHrDepartmentsTable;
module.exports.ensureStaffHrExtras = ensureStaffHrExtras;
module.exports.ensureLeaveTables = ensureLeaveTables;
