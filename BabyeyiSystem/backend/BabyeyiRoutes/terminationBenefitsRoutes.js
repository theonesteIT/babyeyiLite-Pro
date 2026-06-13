'use strict';

const express = require('express');
const { promisePool } = require('../config/database');
const { calcRwandaPayroll } = require('../utils/rwandaPayrollEngine');
const {
  buildTerminatedPayrollSnapshot,
  ensureTerminationPayrollSnapshot,
} = require('../utils/terminatedMonthPayroll');

const router = express.Router();

const ACCOUNTANT_READ = ['ACCOUNTANT', 'SCHOOL_ADMIN', 'SCHOOL_MANAGER'];
const ACCOUNTANT_WRITE = ['ACCOUNTANT', 'SCHOOL_ADMIN', 'SCHOOL_MANAGER'];
const MANAGER_REVIEW = ['SCHOOL_MANAGER', 'SCHOOL_ADMIN'];

const DEFAULT_SEVERANCE_RATES = [
  { minYears: 0, maxYears: 4, multiplier: 2, label: 'Less than 5' },
  { minYears: 5, maxYears: 10, multiplier: 3, label: '5 – 10' },
  { minYears: 11, maxYears: 15, multiplier: 4, label: '10 – 15' },
  { minYears: 16, maxYears: 20, multiplier: 5, label: '15 – 20' },
  { minYears: 21, maxYears: 25, multiplier: 6, label: '20 – 25' },
  { minYears: 26, maxYears: null, multiplier: 7, label: 'Above 25' },
];

const CBHI_TERMINATION_RATE = 0.005;
const TERMINATION_STATUSES = ['draft', 'pending_approval', 'approved', 'paid', 'rejected'];

let tablesReady = false;

function resolveUserId(req) {
  return req.session?.userId || req.session?.user?.id || req.user?.id || null;
}
function resolveRoleCode(req) {
  return String(req.user?.role_code || req.session?.user?.role?.code || '').toUpperCase();
}
function resolveSchoolId(req) {
  return (
    req.session?.school_id ||
    req.session?.user?.school_id ||
    req.session?.user?.school?.id ||
    req.user?.school_id ||
    null
  );
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
function toIsoDate(v) {
  const d = parseDate(v);
  if (!d) return null;
  return d.toISOString().slice(0, 10);
}
function parseJsonSafe(v, fb = {}) {
  if (v == null || v === '') return fb;
  if (typeof v === 'object') return v;
  try { return JSON.parse(v); } catch { return fb; }
}

function calcYearsOfService(employmentDate, terminationDate) {
  const start = parseDate(employmentDate);
  const end = parseDate(terminationDate);
  if (!start || !end || end < start) return 0;
  let years = end.getFullYear() - start.getFullYear();
  const monthDiff = end.getMonth() - start.getMonth();
  const dayDiff = end.getDate() - start.getDate();
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) years -= 1;
  return Math.max(0, years);
}

function getSeveranceMultiplier(yearsWorked, rateTable) {
  const y = Number(yearsWorked) || 0;
  const table = rateTable?.length ? rateTable : DEFAULT_SEVERANCE_RATES;
  for (const row of table) {
    const min = Number(row.minYears ?? 0);
    const max = row.maxYears == null ? null : Number(row.maxYears);
    if (y >= min && (max == null || y <= max)) return Number(row.multiplier) || 0;
  }
  return table[table.length - 1]?.multiplier ?? 2;
}

function daysInMonth(year, month) {
  return new Date(Number(year), Number(month), 0).getDate();
}

function calcFinalSalaryDue(netSalary, terminationDate, useDaysWorked) {
  const net = toMoney(netSalary);
  if (!useDaysWorked) return Math.round(net);
  const d = parseDate(terminationDate);
  if (!d) return Math.round(net);
  const daysWorked = d.getDate();
  const monthDays = daysInMonth(d.getFullYear(), d.getMonth() + 1);
  if (!monthDays) return Math.round(net);
  return Math.round((net / monthDays) * daysWorked);
}

function calcSettlement({
  netSalary,
  employmentDate,
  terminationDate,
  useDaysWorked,
  outstandingDeductions,
  rateTable,
}) {
  const yearsWorked = calcYearsOfService(employmentDate, terminationDate);
  const multiplier = getSeveranceMultiplier(yearsWorked, rateTable);
  const severanceBenefit = Math.round(toMoney(netSalary) * multiplier);
  const grossSettlement = severanceBenefit;
  const outstanding = Math.round(toMoney(outstandingDeductions));
  const totalPayable = severanceBenefit;
  const d = parseDate(terminationDate);

  return {
    yearsWorked,
    multiplier,
    severanceBenefit,
    finalSalaryDue: 0,
    grossSettlement,
    cbhiDeduction: 0,
    cbhiRate: 0,
    outstandingDeductions: outstanding,
    totalPayable,
    daysWorked: d ? d.getDate() : 0,
    monthDays: d ? daysInMonth(d.getFullYear(), d.getMonth() + 1) : 30,
    useDaysWorked: !!useDaysWorked,
  };
}

async function ensureStaffTerminationColumns() {
  const alters = [
    'ALTER TABLE staff ADD COLUMN termination_date DATE NULL',
    'ALTER TABLE staff ADD COLUMN termination_reason TEXT NULL',
    'ALTER TABLE staff ADD COLUMN terminated_at DATETIME NULL',
    'ALTER TABLE staff ADD COLUMN terminated_by_user_id INT UNSIGNED NULL',
  ];
  for (const sql of alters) {
    await promisePool.query(sql).catch(() => {});
  }
}

async function ensureTables() {
  if (tablesReady) return;
  await ensureStaffTerminationColumns();

  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS hr_severance_rate_settings (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      min_years INT NOT NULL DEFAULT 0,
      max_years INT NULL,
      multiplier DECIMAL(4,2) NOT NULL DEFAULT 2,
      label VARCHAR(64) NULL,
      sort_order INT NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_school_tier (school_id, min_years, max_years),
      KEY idx_school (school_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS hr_termination_benefits (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      staff_user_id INT UNSIGNED NOT NULL,
      staff_code VARCHAR(64) NULL,
      staff_name VARCHAR(180) NULL,
      position VARCHAR(120) NULL,
      department VARCHAR(120) NULL,
      employment_date DATE NULL,
      termination_date DATE NOT NULL,
      years_worked INT NOT NULL DEFAULT 0,
      net_salary DECIMAL(14,2) NOT NULL DEFAULT 0,
      multiplier DECIMAL(4,2) NOT NULL DEFAULT 0,
      use_days_worked TINYINT(1) NOT NULL DEFAULT 1,
      days_worked INT NULL,
      month_days INT NULL,
      severance_benefit DECIMAL(14,2) NOT NULL DEFAULT 0,
      final_salary_due DECIMAL(14,2) NOT NULL DEFAULT 0,
      gross_settlement DECIMAL(14,2) NOT NULL DEFAULT 0,
      cbhi_deduction DECIMAL(14,2) NOT NULL DEFAULT 0,
      outstanding_deductions DECIMAL(14,2) NOT NULL DEFAULT 0,
      total_payable DECIMAL(14,2) NOT NULL DEFAULT 0,
      termination_reason TEXT NULL,
      notes TEXT NULL,
      payroll_snapshot_json JSON NULL,
      status VARCHAR(32) NOT NULL DEFAULT 'draft',
      prepared_by_user_id INT UNSIGNED NULL,
      submitted_at DATETIME NULL,
      reviewed_by_user_id INT UNSIGNED NULL,
      reviewed_at DATETIME NULL,
      review_note TEXT NULL,
      payment_date DATE NULL,
      payment_method VARCHAR(32) NULL,
      payment_bank VARCHAR(120) NULL,
      payment_account_number VARCHAR(120) NULL,
      payment_reference VARCHAR(180) NULL,
      paid_at DATETIME NULL,
      paid_by_user_id INT UNSIGNED NULL,
      deleted_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_school_status (school_id, status),
      KEY idx_school_staff (school_id, staff_user_id),
      KEY idx_termination_date (school_id, termination_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  tablesReady = true;
}

async function getActivePayeRates(schoolId) {
  try {
    const [rows] = await promisePool.query(
      `SELECT paye_rates_json FROM accountant_payroll_templates
       WHERE school_id = ? AND deleted_at IS NULL
       ORDER BY is_active DESC, version_no DESC, id DESC
       LIMIT 1`,
      [schoolId]
    );
    const raw = rows?.[0]?.paye_rates_json;
    const parsed = parseJsonSafe(raw, []);
    return Array.isArray(parsed) && parsed.length ? parsed : null;
  } catch {
    return null;
  }
}

async function buildAutoPayrollSnapshot(schoolId, recordLike) {
  const payeRates = await getActivePayeRates(schoolId);
  return buildTerminatedPayrollSnapshot({
    record: recordLike,
    payeRates,
    useDaysWorked: recordLike?.useDaysWorked ?? recordLike?.use_days_worked,
    monthlyNetSalary: recordLike?.netSalary ?? recordLike?.net_salary,
  });
}

async function getSeveranceRates(schoolId) {
  await ensureTables();
  const [rows] = await promisePool.query(
    `SELECT min_years AS minYears, max_years AS maxYears, multiplier, label, sort_order
     FROM hr_severance_rate_settings
     WHERE school_id = ?
     ORDER BY sort_order ASC, min_years ASC`,
    [schoolId]
  );
  if (!rows.length) return DEFAULT_SEVERANCE_RATES;
  return rows.map((r) => ({
    minYears: Number(r.minYears),
    maxYears: r.maxYears == null ? null : Number(r.maxYears),
    multiplier: Number(r.multiplier),
    label: r.label || '',
  }));
}

async function seedDefaultSeveranceRates(schoolId) {
  for (let i = 0; i < DEFAULT_SEVERANCE_RATES.length; i++) {
    const r = DEFAULT_SEVERANCE_RATES[i];
    await promisePool.query(
      `INSERT IGNORE INTO hr_severance_rate_settings
       (school_id, min_years, max_years, multiplier, label, sort_order)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [schoolId, r.minYears, r.maxYears, r.multiplier, r.label, i]
    );
  }
}

function computeNetSalaryFromStaff(staffRow) {
  const basic = toMoney(staffRow.payroll_basic_salary);
  const transport = toMoney(staffRow.payroll_transport_allowance);
  const housing = toMoney(staffRow.payroll_housing_allowance);
  const meal = toMoney(staffRow.payroll_meal_allowance);
  let otherAllowances = [];
  try {
    otherAllowances = typeof staffRow.payroll_other_allowances === 'string'
      ? JSON.parse(staffRow.payroll_other_allowances || '[]')
      : (staffRow.payroll_other_allowances || []);
  } catch { otherAllowances = []; }
  const otherTotal = otherAllowances.reduce((s, a) => s + toMoney(a?.amount || a?.value), 0);
  const gross = basic + transport + housing + meal + otherTotal;
  if (!gross) return 0;

  const result = calcRwandaPayroll({
    basicSalary: basic,
    storedAllowanceSplit: {
      transport,
      housing,
      others: meal + otherTotal,
    },
    employeeDeductions: [],
  });
  return toMoney(result.finalNet ?? result.netSalary ?? result.netPayFinal);
}

async function loadStaffForTermination(schoolId, userId) {
  const [rows] = await promisePool.query(
    `SELECT u.id, u.user_uid, u.first_name, u.last_name, u.is_active,
            r.role_code, r.role_name,
            st.job_title, st.department, st.sub_department,
            st.date_of_employment, st.contract_start_date, st.employment_status,
            st.termination_date,
            st.payroll_basic_salary, st.payroll_transport_allowance,
            st.payroll_housing_allowance, st.payroll_meal_allowance,
            st.payroll_other_allowances,
            st.payroll_bank_name, st.payroll_account_number,
            st.payroll_payment_method, st.payroll_mobile_money_phone
     FROM users u
     INNER JOIN staff st ON st.school_id = u.school_id AND st.user_id = u.id
     LEFT JOIN roles r ON r.id = u.role_id
     WHERE u.school_id = ? AND u.id = ? AND u.deleted_at IS NULL
     LIMIT 1`,
    [schoolId, userId]
  );
  if (!rows.length) return null;
  const r = rows[0];
  const employmentDate = r.date_of_employment || r.contract_start_date || null;
  const netSalary = computeNetSalaryFromStaff(r);
  return {
    staffUserId: Number(r.id),
    staffCode: r.user_uid || `STF-${r.id}`,
    fullName: `${r.first_name || ''} ${r.last_name || ''}`.trim() || `User ${r.id}`,
    position: r.job_title || r.role_name || r.role_code || '',
    department: r.department || r.sub_department || r.role_code || '',
    employmentDate: employmentDate ? toIsoDate(employmentDate) : null,
    employmentStatus: r.employment_status || (r.is_active ? 'Active' : 'Inactive'),
    terminationDate: r.termination_date ? toIsoDate(r.termination_date) : null,
    netSalary,
    paymentBank: r.payroll_bank_name || '',
    paymentAccountNumber: r.payroll_account_number || r.payroll_mobile_money_phone || '',
    paymentMethod: r.payroll_payment_method || 'Bank Transfer',
  };
}

function normalizedTerminationAmounts(row) {
  const netSalary = toMoney(row.net_salary);
  const multiplier = Number(row.multiplier) || 0;
  const severanceBenefit = Math.round(netSalary * multiplier);
  return {
    severanceBenefit,
    finalSalaryDue: 0,
    grossSettlement: severanceBenefit,
    cbhiDeduction: 0,
    totalPayable: severanceBenefit,
  };
}

function mapTerminationRow(row) {
  const amounts = normalizedTerminationAmounts(row);
  return {
    id: Number(row.id),
    staffUserId: Number(row.staff_user_id),
    staffCode: row.staff_code,
    staffName: row.staff_name,
    position: row.position,
    department: row.department,
    contractType: row.employment_type || row.contract_type || '',
    employmentType: row.employment_type || row.contract_type || '',
    employmentDate: row.employment_date ? toIsoDate(row.employment_date) : null,
    terminationDate: row.termination_date ? toIsoDate(row.termination_date) : null,
    yearsWorked: Number(row.years_worked),
    netSalary: toMoney(row.net_salary),
    multiplier: Number(row.multiplier),
    useDaysWorked: !!row.use_days_worked,
    daysWorked: row.days_worked != null ? Number(row.days_worked) : null,
    monthDays: row.month_days != null ? Number(row.month_days) : null,
    severanceBenefit: amounts.severanceBenefit,
    finalSalaryDue: amounts.finalSalaryDue,
    grossSettlement: amounts.grossSettlement,
    cbhiDeduction: amounts.cbhiDeduction,
    outstandingDeductions: toMoney(row.outstanding_deductions),
    totalPayable: amounts.totalPayable,
    terminationReason: row.termination_reason || '',
    notes: row.notes || '',
    payrollSnapshot: parseJsonSafe(row.payroll_snapshot_json, null),
    status: row.status,
    preparedByUserId: row.prepared_by_user_id ? Number(row.prepared_by_user_id) : null,
    submittedAt: row.submitted_at,
    reviewedByUserId: row.reviewed_by_user_id ? Number(row.reviewed_by_user_id) : null,
    reviewedAt: row.reviewed_at,
    reviewNote: row.review_note || '',
    paymentDate: row.payment_date ? toIsoDate(row.payment_date) : null,
    paymentMethod: row.payment_method || '',
    paymentBank: row.payment_bank || '',
    paymentAccountNumber: row.payment_account_number || '',
    paymentReference: row.payment_reference || '',
    paidAt: row.paid_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

router.use(requireAuth);

// ── Analytics ─────────────────────────────────────────────────
router.get('/accountant/termination-benefits/analytics', requireRole(ACCOUNTANT_READ), async (req, res) => {
  try {
    await ensureTables();
    const { schoolId } = req.ctx;
    const [[terminated]] = await promisePool.query(
      `SELECT COUNT(*) AS cnt FROM staff st
       INNER JOIN users u ON u.id = st.user_id AND u.deleted_at IS NULL
       WHERE st.school_id = ? AND st.employment_status LIKE '%terminat%'`,
      [schoolId]
    );
    const [[paid]] = await promisePool.query(
      `SELECT COALESCE(SUM(total_payable), 0) AS total, COUNT(*) AS cnt
       FROM hr_termination_benefits
       WHERE school_id = ? AND status = 'paid' AND deleted_at IS NULL`,
      [schoolId]
    );
    const [[pending]] = await promisePool.query(
      `SELECT COUNT(*) AS cnt FROM hr_termination_benefits
       WHERE school_id = ? AND status IN ('pending_approval', 'approved') AND deleted_at IS NULL`,
      [schoolId]
    );
    const [[avg]] = await promisePool.query(
      `SELECT COALESCE(AVG(total_payable), 0) AS avgPay FROM hr_termination_benefits
       WHERE school_id = ? AND status = 'paid' AND deleted_at IS NULL`,
      [schoolId]
    );
    res.json({
      success: true,
      data: {
        terminatedEmployees: Number(terminated?.cnt || 0),
        totalBenefitsPaid: toMoney(paid?.total),
        pendingPayments: Number(pending?.cnt || 0),
        averageSettlement: Math.round(toMoney(avg?.avgPay)),
        paidCount: Number(paid?.cnt || 0),
      },
    });
  } catch (e) {
    console.error('[termination-benefits/analytics]:', e.message);
    res.status(500).json({ success: false, message: 'Failed to load analytics' });
  }
});

// ── Severance rate settings ─────────────────────────────────────
router.get('/accountant/termination-benefits/severance-rates', requireRole(ACCOUNTANT_READ), async (req, res) => {
  try {
    await ensureTables();
    const rates = await getSeveranceRates(req.ctx.schoolId);
    res.json({ success: true, data: rates });
  } catch (e) {
    console.error('[termination-benefits/severance-rates GET]:', e.message);
    res.status(500).json({ success: false, message: 'Failed to load severance rates' });
  }
});

router.put('/accountant/termination-benefits/severance-rates', requireRole(ACCOUNTANT_WRITE), async (req, res) => {
  try {
    await ensureTables();
    const { schoolId } = req.ctx;
    const rates = Array.isArray(req.body?.rates) ? req.body.rates : [];
    if (!rates.length) {
      return res.status(400).json({ success: false, message: 'Rates array is required' });
    }
    await promisePool.query('DELETE FROM hr_severance_rate_settings WHERE school_id = ?', [schoolId]);
    for (let i = 0; i < rates.length; i++) {
      const r = rates[i];
      await promisePool.query(
        `INSERT INTO hr_severance_rate_settings
         (school_id, min_years, max_years, multiplier, label, sort_order)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          schoolId,
          Number(r.minYears ?? 0),
          r.maxYears == null ? null : Number(r.maxYears),
          Number(r.multiplier ?? 2),
          String(r.label || '').slice(0, 64),
          i,
        ]
      );
    }
    const saved = await getSeveranceRates(schoolId);
    res.json({ success: true, data: saved });
  } catch (e) {
    console.error('[termination-benefits/severance-rates PUT]:', e.message);
    res.status(500).json({ success: false, message: 'Failed to save severance rates' });
  }
});

// ── Staff search for termination ────────────────────────────────
router.get('/accountant/termination-benefits/staff/search', requireRole(ACCOUNTANT_READ), async (req, res) => {
  try {
    await ensureTables();
    const { schoolId } = req.ctx;
    const qRaw = String(req.query?.query || req.query?.q || '').trim();
    const dept = String(req.query?.department || '').trim();
    const position = String(req.query?.position || '').trim();
    const q = `%${qRaw}%`;
    const limit = Math.min(100, Math.max(1, Number(req.query?.limit) || 25));

    const where = [
      'u.school_id = ?',
      'u.deleted_at IS NULL',
      "(st.employment_status IS NULL OR st.employment_status NOT LIKE '%terminat%')",
    ];
    const params = [schoolId];

    if (qRaw) {
      where.push(`(
        CONCAT(COALESCE(u.first_name,''), ' ', COALESCE(u.last_name,'')) LIKE ?
        OR COALESCE(u.user_uid,'') LIKE ?
        OR COALESCE(st.job_title,'') LIKE ?
        OR COALESCE(st.department,'') LIKE ?
      )`);
      params.push(q, q, q, q);
    }
    if (dept) {
      where.push('(st.department LIKE ? OR st.sub_department LIKE ?)');
      params.push(`%${dept}%`, `%${dept}%`);
    }
    if (position) {
      where.push('(st.job_title LIKE ? OR r.role_name LIKE ?)');
      params.push(`%${position}%`, `%${position}%`);
    }

    const [rows] = await promisePool.query(
      `SELECT u.id, u.user_uid, u.first_name, u.last_name,
              st.job_title, st.department, st.date_of_employment, st.contract_start_date,
              st.employment_status,
              st.payroll_basic_salary, st.payroll_transport_allowance,
              st.payroll_housing_allowance, st.payroll_meal_allowance, st.payroll_other_allowances,
              r.role_code, r.role_name
       FROM users u
       INNER JOIN staff st ON st.school_id = u.school_id AND st.user_id = u.id
       LEFT JOIN roles r ON r.id = u.role_id
       WHERE ${where.join(' AND ')}
       ORDER BY u.first_name, u.last_name
       LIMIT ?`,
      [...params, limit]
    );

    res.json({
      success: true,
      data: rows.map((r) => {
        const employmentDate = r.date_of_employment || r.contract_start_date || null;
        const netSalary = computeNetSalaryFromStaff(r);
        return {
          staffUserId: Number(r.id),
          staffCode: r.user_uid || `STF-${r.id}`,
          fullName: `${r.first_name || ''} ${r.last_name || ''}`.trim(),
          position: r.job_title || r.role_name || r.role_code || '',
          department: r.department || r.role_code || '',
          employmentDate: employmentDate ? toIsoDate(employmentDate) : null,
          employmentStatus: r.employment_status || 'Active',
          netSalary,
        };
      }),
    });
  } catch (e) {
    console.error('[termination-benefits/staff/search]:', e.message);
    res.status(500).json({ success: false, message: 'Failed to search staff' });
  }
});

// ── Calculate preview ───────────────────────────────────────────
router.post('/accountant/termination-benefits/calculate', requireRole(ACCOUNTANT_READ), async (req, res) => {
  try {
    await ensureTables();
    const { schoolId } = req.ctx;
    const staffUserId = Number(req.body?.staffUserId);
    const terminationDate = req.body?.terminationDate;
    const useDaysWorked = req.body?.useDaysWorked !== false;
    const outstandingDeductions = toMoney(req.body?.outstandingDeductions);
    const netSalaryOverride = req.body?.netSalary != null ? toMoney(req.body.netSalary) : null;

    if (!Number.isFinite(staffUserId)) {
      return res.status(400).json({ success: false, message: 'staffUserId is required' });
    }
    const staff = await loadStaffForTermination(schoolId, staffUserId);
    if (!staff) return res.status(404).json({ success: false, message: 'Employee not found' });
    if (!staff.employmentDate) {
      return res.status(400).json({ success: false, message: 'Employment date not set in employee register' });
    }
    if (!terminationDate) {
      return res.status(400).json({ success: false, message: 'Termination date is required' });
    }

    const netSalary = netSalaryOverride != null ? netSalaryOverride : staff.netSalary;
    const rates = await getSeveranceRates(schoolId);
    const calc = calcSettlement({
      netSalary,
      employmentDate: staff.employmentDate,
      terminationDate,
      useDaysWorked,
      outstandingDeductions,
      rateTable: rates,
    });

    res.json({
      success: true,
      data: {
        employee: staff,
        calculation: { ...calc, netSalary },
      },
    });
  } catch (e) {
    console.error('[termination-benefits/calculate]:', e.message);
    res.status(500).json({ success: false, message: 'Calculation failed' });
  }
});

// ── List terminations ───────────────────────────────────────────
router.get('/accountant/termination-benefits', requireRole(ACCOUNTANT_READ), async (req, res) => {
  try {
    await ensureTables();
    const { schoolId } = req.ctx;
    const status = String(req.query?.status || '').trim();
    const where = ['tb.school_id = ?', 'tb.deleted_at IS NULL'];
    const params = [schoolId];
    if (status) {
      where.push('tb.status = ?');
      params.push(status);
    }
    const [rows] = await promisePool.query(
      `SELECT tb.*, st.employment_type
       FROM hr_termination_benefits tb
       LEFT JOIN staff st ON st.school_id = tb.school_id AND st.user_id = tb.staff_user_id
       WHERE ${where.join(' AND ')}
       ORDER BY tb.created_at DESC
       LIMIT 200`,
      params
    );
    res.json({ success: true, data: rows.map(mapTerminationRow) });
    for (const row of rows || []) {
      if (row.status === 'paid') continue;
      const amounts = normalizedTerminationAmounts(row);
      const stale =
        toMoney(row.severance_benefit) !== amounts.severanceBenefit
        || toMoney(row.gross_settlement) !== amounts.grossSettlement
        || toMoney(row.total_payable) !== amounts.totalPayable
        || toMoney(row.cbhi_deduction) !== 0
        || toMoney(row.final_salary_due) !== 0;
      if (!stale) continue;
      await promisePool.query(
        `UPDATE hr_termination_benefits SET
          severance_benefit = ?, final_salary_due = 0, gross_settlement = ?,
          cbhi_deduction = 0, total_payable = ?
         WHERE id = ? AND school_id = ?`,
        [amounts.severanceBenefit, amounts.grossSettlement, amounts.totalPayable, row.id, schoolId]
      ).catch(() => {});
    }
  } catch (e) {
    console.error('[termination-benefits GET]:', e.message);
    res.status(500).json({ success: false, message: 'Failed to load terminations' });
  }
});

router.get('/accountant/termination-benefits/for-payroll', requireRole(ACCOUNTANT_READ), async (req, res) => {
  try {
    await ensureTables();
    const { schoolId } = req.ctx;
    const month = Number(req.query?.month) || 0;
    const year = Number(req.query?.year) || 0;
    if (!month || !year) {
      return res.status(400).json({ success: false, message: 'month and year are required' });
    }
    const [rows] = await promisePool.query(
      `SELECT tb.*, st.employment_type
       FROM hr_termination_benefits tb
       LEFT JOIN staff st ON st.school_id = tb.school_id AND st.user_id = tb.staff_user_id
       WHERE tb.school_id = ? AND tb.deleted_at IS NULL
         AND MONTH(tb.termination_date) = ? AND YEAR(tb.termination_date) = ?
         AND tb.status NOT IN ('rejected')
       ORDER BY tb.termination_date DESC`,
      [schoolId, month, year]
    );
    const payeRates = await getActivePayeRates(schoolId);
    const data = [];
    for (const row of rows || []) {
      const mapped = mapTerminationRow(row);
      if (!mapped.payrollSnapshot?.registerRow) {
        const built = ensureTerminationPayrollSnapshot(mapped, payeRates);
        if (built) {
          mapped.payrollSnapshot = built;
          if (row.status !== 'paid') {
            await promisePool.query(
              'UPDATE hr_termination_benefits SET payroll_snapshot_json = ? WHERE id = ? AND school_id = ?',
              [JSON.stringify(built), row.id, schoolId]
            ).catch(() => {});
          }
        }
      }
      data.push(mapped);
    }
    res.json({ success: true, data });
  } catch (e) {
    console.error('[termination-benefits/for-payroll GET]:', e.message);
    res.status(500).json({ success: false, message: 'Failed to load termination payroll records' });
  }
});

router.get('/accountant/termination-benefits/:id', requireRole(ACCOUNTANT_READ), async (req, res) => {
  try {
    await ensureTables();
    const id = Number(req.params.id);
    const [rows] = await promisePool.query(
      `SELECT * FROM hr_termination_benefits WHERE id = ? AND school_id = ? AND deleted_at IS NULL LIMIT 1`,
      [id, req.ctx.schoolId]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: mapTerminationRow(rows[0]) });
  } catch (e) {
    console.error('[termination-benefits/:id GET]:', e.message);
    res.status(500).json({ success: false, message: 'Failed to load termination' });
  }
});

// ── Create / update ─────────────────────────────────────────────
router.post('/accountant/termination-benefits', requireRole(ACCOUNTANT_WRITE), async (req, res) => {
  try {
    await ensureTables();
    const { schoolId, userId } = req.ctx;
    const b = req.body || {};
    const staffUserId = Number(b.staffUserId);
    if (!Number.isFinite(staffUserId)) {
      return res.status(400).json({ success: false, message: 'staffUserId is required' });
    }
    const staff = await loadStaffForTermination(schoolId, staffUserId);
    if (!staff) return res.status(404).json({ success: false, message: 'Employee not found' });

    const terminationDate = b.terminationDate;
    if (!terminationDate) return res.status(400).json({ success: false, message: 'Termination date required' });
    const useDaysWorked = b.useDaysWorked !== false;
    const netSalary = b.netSalary != null ? toMoney(b.netSalary) : staff.netSalary;
    const rates = await getSeveranceRates(schoolId);
    const calc = calcSettlement({
      netSalary,
      employmentDate: staff.employmentDate,
      terminationDate,
      useDaysWorked,
      outstandingDeductions: b.outstandingDeductions,
      rateTable: rates,
    });

    const draftRecord = {
      staffUserId,
      staffName: staff.fullName,
      staffCode: staff.staffCode,
      terminationDate: toIsoDate(terminationDate),
      useDaysWorked,
      netSalary,
    };
    const payrollSnapshot = b.payrollSnapshot && typeof b.payrollSnapshot === 'object'
      ? b.payrollSnapshot
      : await buildAutoPayrollSnapshot(schoolId, draftRecord);

    const [result] = await promisePool.query(
      `INSERT INTO hr_termination_benefits
       (school_id, staff_user_id, staff_code, staff_name, position, department,
        employment_date, termination_date, years_worked, net_salary, multiplier,
        use_days_worked, days_worked, month_days,
        severance_benefit, final_salary_due, gross_settlement, cbhi_deduction,
        outstanding_deductions, total_payable, termination_reason, notes,
        payroll_snapshot_json, status, prepared_by_user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?)`,
      [
        schoolId, staffUserId, staff.staffCode, staff.fullName, staff.position, staff.department,
        staff.employmentDate, toIsoDate(terminationDate), calc.yearsWorked, netSalary, calc.multiplier,
        useDaysWorked ? 1 : 0, calc.daysWorked, calc.monthDays,
        calc.severanceBenefit, calc.finalSalaryDue, calc.grossSettlement, calc.cbhiDeduction,
        calc.outstandingDeductions, calc.totalPayable,
        String(b.terminationReason || '').slice(0, 2000) || null,
        String(b.notes || '').slice(0, 2000) || null,
        payrollSnapshot ? JSON.stringify(payrollSnapshot) : null,
        userId,
      ]
    );
    const [rows] = await promisePool.query(
      'SELECT * FROM hr_termination_benefits WHERE id = ? LIMIT 1',
      [result.insertId]
    );
    res.status(201).json({ success: true, data: mapTerminationRow(rows[0]) });
  } catch (e) {
    console.error('[termination-benefits POST]:', e.message);
    res.status(500).json({ success: false, message: 'Failed to create termination record' });
  }
});

router.patch('/accountant/termination-benefits/:id', requireRole(ACCOUNTANT_WRITE), async (req, res) => {
  try {
    await ensureTables();
    const { schoolId, userId } = req.ctx;
    const id = Number(req.params.id);
    const [existing] = await promisePool.query(
      'SELECT * FROM hr_termination_benefits WHERE id = ? AND school_id = ? AND deleted_at IS NULL LIMIT 1',
      [id, schoolId]
    );
    if (!existing.length) return res.status(404).json({ success: false, message: 'Not found' });
    const row = existing[0];
    if (!['draft', 'rejected'].includes(row.status)) {
      return res.status(400).json({ success: false, message: 'Only draft or rejected records can be edited' });
    }

    const b = req.body || {};
    const staffUserId = Number(b.staffUserId || row.staff_user_id);
    const staff = await loadStaffForTermination(schoolId, staffUserId);
    if (!staff) return res.status(404).json({ success: false, message: 'Employee not found' });

    const terminationDate = b.terminationDate || row.termination_date;
    const useDaysWorked = b.useDaysWorked != null ? !!b.useDaysWorked : !!row.use_days_worked;
    const netSalary = b.netSalary != null ? toMoney(b.netSalary) : toMoney(row.net_salary);
    const rates = await getSeveranceRates(schoolId);
    const calc = calcSettlement({
      netSalary,
      employmentDate: staff.employmentDate,
      terminationDate,
      useDaysWorked,
      outstandingDeductions: b.outstandingDeductions ?? row.outstanding_deductions,
      rateTable: rates,
    });

    const draftRecord = {
      id,
      staffUserId,
      staffName: staff.fullName,
      staffCode: staff.staffCode,
      terminationDate: toIsoDate(terminationDate),
      useDaysWorked,
      netSalary,
    };
    const payrollSnapshot = b.payrollSnapshot && typeof b.payrollSnapshot === 'object'
      ? b.payrollSnapshot
      : await buildAutoPayrollSnapshot(schoolId, draftRecord);

    await promisePool.query(
      `UPDATE hr_termination_benefits SET
        staff_user_id = ?, staff_code = ?, staff_name = ?, position = ?, department = ?,
        employment_date = ?, termination_date = ?, years_worked = ?, net_salary = ?, multiplier = ?,
        use_days_worked = ?, days_worked = ?, month_days = ?,
        severance_benefit = ?, final_salary_due = ?, gross_settlement = ?, cbhi_deduction = ?,
        outstanding_deductions = ?, total_payable = ?,
        termination_reason = ?, notes = ?,
        payroll_snapshot_json = ?,
        status = 'draft', prepared_by_user_id = ?
       WHERE id = ? AND school_id = ?`,
      [
        staffUserId, staff.staffCode, staff.fullName, staff.position, staff.department,
        staff.employmentDate, toIsoDate(terminationDate), calc.yearsWorked, netSalary, calc.multiplier,
        useDaysWorked ? 1 : 0, calc.daysWorked, calc.monthDays,
        calc.severanceBenefit, calc.finalSalaryDue, calc.grossSettlement, calc.cbhiDeduction,
        calc.outstandingDeductions, calc.totalPayable,
        b.terminationReason ?? row.termination_reason,
        b.notes ?? row.notes,
        payrollSnapshot ? JSON.stringify(payrollSnapshot) : null,
        userId, id, schoolId,
      ]
    );
    const [rows] = await promisePool.query('SELECT * FROM hr_termination_benefits WHERE id = ? LIMIT 1', [id]);
    res.json({ success: true, data: mapTerminationRow(rows[0]) });
  } catch (e) {
    console.error('[termination-benefits PATCH]:', e.message);
    res.status(500).json({ success: false, message: 'Failed to update termination' });
  }
});

// ── Submit for approval ─────────────────────────────────────────
router.post('/accountant/termination-benefits/:id/submit', requireRole(ACCOUNTANT_WRITE), async (req, res) => {
  try {
    await ensureTables();
    const { schoolId } = req.ctx;
    const id = Number(req.params.id);
    const [existing] = await promisePool.query(
      'SELECT * FROM hr_termination_benefits WHERE id = ? AND school_id = ? AND deleted_at IS NULL LIMIT 1',
      [id, schoolId]
    );
    if (!existing.length) return res.status(404).json({ success: false, message: 'Not found' });
    if (!['draft', 'rejected'].includes(existing[0].status)) {
      return res.status(400).json({ success: false, message: 'Record cannot be submitted in current status' });
    }
    await promisePool.query(
      `UPDATE hr_termination_benefits SET status = 'pending_approval', submitted_at = NOW() WHERE id = ?`,
      [id]
    );
    const [rows] = await promisePool.query('SELECT * FROM hr_termination_benefits WHERE id = ? LIMIT 1', [id]);
    res.json({ success: true, data: mapTerminationRow(rows[0]) });
  } catch (e) {
    console.error('[termination-benefits/submit]:', e.message);
    res.status(500).json({ success: false, message: 'Failed to submit for approval' });
  }
});

// ── Mark paid ───────────────────────────────────────────────────
router.post('/accountant/termination-benefits/:id/mark-paid', requireRole(ACCOUNTANT_WRITE), async (req, res) => {
  try {
    await ensureTables();
    const { schoolId, userId } = req.ctx;
    const id = Number(req.params.id);
    const b = req.body || {};
    const [existing] = await promisePool.query(
      'SELECT * FROM hr_termination_benefits WHERE id = ? AND school_id = ? AND deleted_at IS NULL LIMIT 1',
      [id, schoolId]
    );
    if (!existing.length) return res.status(404).json({ success: false, message: 'Not found' });
    if (existing[0].status !== 'approved') {
      return res.status(400).json({ success: false, message: 'Only approved records can be marked paid' });
    }

    await promisePool.query(
      `UPDATE hr_termination_benefits SET
        status = 'paid',
        payment_date = ?, payment_method = ?, payment_bank = ?,
        payment_account_number = ?, payment_reference = ?,
        paid_at = NOW(), paid_by_user_id = ?
       WHERE id = ?`,
      [
        b.paymentDate ? toIsoDate(b.paymentDate) : toIsoDate(new Date()),
        String(b.paymentMethod || '').slice(0, 32) || null,
        String(b.paymentBank || '').slice(0, 120) || null,
        String(b.paymentAccountNumber || '').slice(0, 120) || null,
        String(b.paymentReference || '').slice(0, 180) || null,
        userId, id,
      ]
    );
    const [rows] = await promisePool.query('SELECT * FROM hr_termination_benefits WHERE id = ? LIMIT 1', [id]);
    res.json({ success: true, data: mapTerminationRow(rows[0]) });
  } catch (e) {
    console.error('[termination-benefits/mark-paid]:', e.message);
    res.status(500).json({ success: false, message: 'Failed to record payment' });
  }
});

// ── Manager: list pending ───────────────────────────────────────
router.get('/manager/termination-benefits', requireRole(MANAGER_REVIEW), async (req, res) => {
  try {
    await ensureTables();
    const { schoolId } = req.ctx;
    const status = String(req.query?.status || 'pending_approval').trim();
    const where = ['tb.school_id = ?', 'tb.deleted_at IS NULL'];
    const params = [schoolId];
    if (status && status !== 'all') {
      where.push('tb.status = ?');
      params.push(status);
    }
    const [rows] = await promisePool.query(
      `SELECT tb.*, st.employment_type
       FROM hr_termination_benefits tb
       LEFT JOIN staff st ON st.school_id = tb.school_id AND st.user_id = tb.staff_user_id
       WHERE ${where.join(' AND ')}
       ORDER BY tb.submitted_at DESC, tb.created_at DESC LIMIT 200`,
      params
    );
    res.json({ success: true, data: rows.map(mapTerminationRow) });
  } catch (e) {
    console.error('[manager/termination-benefits GET]:', e.message);
    res.status(500).json({ success: false, message: 'Failed to load terminations' });
  }
});

router.get('/manager/termination-benefits/:id', requireRole(MANAGER_REVIEW), async (req, res) => {
  try {
    await ensureTables();
    const id = Number(req.params.id);
    const [rows] = await promisePool.query(
      'SELECT * FROM hr_termination_benefits WHERE id = ? AND school_id = ? AND deleted_at IS NULL LIMIT 1',
      [id, req.ctx.schoolId]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: mapTerminationRow(rows[0]) });
  } catch (e) {
    console.error('[manager/termination-benefits/:id GET]:', e.message);
    res.status(500).json({ success: false, message: 'Failed to load termination' });
  }
});

async function finalizeEmployeeTermination(schoolId, staffUserId, terminationDate, userId) {
  await promisePool.query(
    `UPDATE staff SET
      employment_status = 'Terminated',
      termination_date = ?,
      terminated_at = NOW(),
      terminated_by_user_id = ?,
      account_enabled = 0
     WHERE school_id = ? AND user_id = ?`,
    [toIsoDate(terminationDate), userId, schoolId, staffUserId]
  );
  await promisePool.query(
    'UPDATE users SET is_active = 0 WHERE id = ? AND school_id = ?',
    [staffUserId, schoolId]
  );
}

router.post('/manager/termination-benefits/:id/approve', requireRole(MANAGER_REVIEW), async (req, res) => {
  try {
    await ensureTables();
    const { schoolId, userId } = req.ctx;
    const id = Number(req.params.id);
    const [existing] = await promisePool.query(
      'SELECT * FROM hr_termination_benefits WHERE id = ? AND school_id = ? AND deleted_at IS NULL LIMIT 1',
      [id, schoolId]
    );
    if (!existing.length) return res.status(404).json({ success: false, message: 'Not found' });
    const row = existing[0];
    if (row.status !== 'pending_approval') {
      return res.status(400).json({ success: false, message: 'Only pending records can be approved' });
    }

    await promisePool.query(
      `UPDATE hr_termination_benefits SET
        status = 'approved', reviewed_by_user_id = ?, reviewed_at = NOW(),
        review_note = ?
       WHERE id = ?`,
      [userId, String(req.body?.reviewNote || '').slice(0, 500) || null, id]
    );

    await finalizeEmployeeTermination(schoolId, row.staff_user_id, row.termination_date, userId);

    const [rows] = await promisePool.query('SELECT * FROM hr_termination_benefits WHERE id = ? LIMIT 1', [id]);
    res.json({ success: true, data: mapTerminationRow(rows[0]) });
  } catch (e) {
    console.error('[manager/termination-benefits/approve]:', e.message);
    res.status(500).json({ success: false, message: 'Failed to approve termination' });
  }
});

router.post('/manager/termination-benefits/:id/reject', requireRole(MANAGER_REVIEW), async (req, res) => {
  try {
    await ensureTables();
    const { schoolId, userId } = req.ctx;
    const id = Number(req.params.id);
    const [existing] = await promisePool.query(
      'SELECT * FROM hr_termination_benefits WHERE id = ? AND school_id = ? AND deleted_at IS NULL LIMIT 1',
      [id, schoolId]
    );
    if (!existing.length) return res.status(404).json({ success: false, message: 'Not found' });
    if (existing[0].status !== 'pending_approval') {
      return res.status(400).json({ success: false, message: 'Only pending records can be rejected' });
    }

    await promisePool.query(
      `UPDATE hr_termination_benefits SET
        status = 'rejected', reviewed_by_user_id = ?, reviewed_at = NOW(),
        review_note = ?
       WHERE id = ?`,
      [userId, String(req.body?.reviewNote || 'Rejected').slice(0, 500), id]
    );
    const [rows] = await promisePool.query('SELECT * FROM hr_termination_benefits WHERE id = ? LIMIT 1', [id]);
    res.json({ success: true, data: mapTerminationRow(rows[0]) });
  } catch (e) {
    console.error('[manager/termination-benefits/reject]:', e.message);
    res.status(500).json({ success: false, message: 'Failed to reject termination' });
  }
});

router.post('/accountant/termination-benefits/:id/configure-payroll', requireRole(ACCOUNTANT_WRITE), async (req, res) => {
  try {
    await ensureTables();
    const { schoolId, userId } = req.ctx;
    const id = Number(req.params.id);
    const [existing] = await promisePool.query(
      'SELECT * FROM hr_termination_benefits WHERE id = ? AND school_id = ? AND deleted_at IS NULL LIMIT 1',
      [id, schoolId]
    );
    if (!existing.length) return res.status(404).json({ success: false, message: 'Not found' });
    const row = existing[0];
    if (row.status === 'paid') {
      return res.status(400).json({ success: false, message: 'Cannot configure payroll for a paid termination' });
    }

    const b = req.body || {};
    const payrollSnapshot = b.payrollSnapshot;
    if (!payrollSnapshot || typeof payrollSnapshot !== 'object') {
      return res.status(400).json({ success: false, message: 'payrollSnapshot is required' });
    }

    const netSalary = b.netSalary != null ? toMoney(b.netSalary) : toMoney(row.net_salary);
    const useDaysWorked = b.useDaysWorked != null ? !!b.useDaysWorked : !!row.use_days_worked;

    const rates = await getSeveranceRates(schoolId);
    const calc = calcSettlement({
      netSalary,
      employmentDate: row.employment_date,
      terminationDate: row.termination_date,
      useDaysWorked,
      outstandingDeductions: row.outstanding_deductions,
      rateTable: rates,
    });

    await promisePool.query(
      `UPDATE hr_termination_benefits SET
        net_salary = ?, use_days_worked = ?, days_worked = ?, month_days = ?,
        final_salary_due = ?, severance_benefit = ?, gross_settlement = ?, cbhi_deduction = ?, total_payable = ?,
        payroll_snapshot_json = ?, prepared_by_user_id = ?
       WHERE id = ? AND school_id = ?`,
      [
        netSalary,
        useDaysWorked ? 1 : 0,
        calc.daysWorked,
        calc.monthDays,
        0,
        calc.severanceBenefit,
        calc.grossSettlement,
        calc.cbhiDeduction,
        calc.totalPayable,
        JSON.stringify(payrollSnapshot),
        userId,
        id,
        schoolId,
      ]
    );

    const [rows] = await promisePool.query(
      `SELECT tb.*, st.employment_type
       FROM hr_termination_benefits tb
       LEFT JOIN staff st ON st.school_id = tb.school_id AND st.user_id = tb.staff_user_id
       WHERE tb.id = ? LIMIT 1`,
      [id]
    );
    res.json({ success: true, data: mapTerminationRow(rows[0]) });
  } catch (e) {
    console.error('[termination-benefits/configure-payroll POST]:', e.message);
    res.status(500).json({ success: false, message: 'Failed to configure termination payroll' });
  }
});

async function ensureTerminationBenefitsSchema() {
  tablesReady = false;
  await ensureTables();
  const [schools] = await promisePool.query('SELECT DISTINCT school_id FROM users WHERE school_id IS NOT NULL LIMIT 500').catch(() => [[]]);
  for (const s of schools || []) {
    if (s.school_id) await seedDefaultSeveranceRates(s.school_id).catch(() => {});
  }
}

module.exports = router;
module.exports.ensureTerminationBenefitsSchema = ensureTerminationBenefitsSchema;
