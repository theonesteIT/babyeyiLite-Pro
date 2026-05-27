'use strict';

const express = require('express');
const crypto = require('crypto');
const { promisePool } = require('../config/database');
const fs = require('fs');
const path = require('path');
const {
  ensureShuleAvanceTeacherCatalogTable,
  fetchActiveCatalogMaps,
} = require('./shuleAvanceCatalogStore');
const {
  ensureWebPushTable,
  upsertSubscription,
  removeSubscription,
  sendWebPushToUser,
  getVapidPublicKey,
  isWebPushConfigured,
} = require('./webPushSubscriptions');
const { computeProAccessEffective } = require('../utils/schoolSubscription');

const router = express.Router();

const ROLE_ACCOUNTANT = 'ACCOUNTANT';
/** School leadership that can approve Shule Avance after finance (manager queue). */
const MANAGER_ROLES = ['SCHOOL_ADMIN', 'SCHOOL_MANAGER', 'MANAGER', 'DOS'];
const DEAL_PRODUCT_ADMIN_ROLES = ['SUPER_ADMIN'];
/** Teachers, school staff (HOD/DOS), accountants, and other staff portals using applicant UI */
const APPLICANT_ROLES = [
  'TEACHER',
  'HOD',
  'DOS',
  'ACCOUNTANT',
  'LIBRARIAN',
  'STOREKEEPER',
  'STORE_MANAGER',
  'DISCIPLINE',
  'DISCIPLINE_STAFF',
  'HEAD_OF_DISCIPLINE',
  'GATE_OFFICER',
  'GATE_KEEPER',
  'SECRETARY',
  'HR',
];
const LEGACY_APPLICANT_ROLES = [
  'TEACHER',
  'HOD',
  'DOS',
  'SCHOOL_ADMIN',
  'SCHOOL_MANAGER',
  'ACCOUNTANT',
  'LIBRARIAN',
  'STOREKEEPER',
  'STORE_MANAGER',
  'DISCIPLINE',
  'DISCIPLINE_STAFF',
  'HEAD_OF_DISCIPLINE',
];

const STATUS = {
  PENDING_ACCOUNTANT: 'pending_accountant',
  SENT_TO_MANAGER: 'sent_to_manager',
  APPROVED: 'approved',
  REJECTED_BY_ACCOUNTANT: 'rejected_by_accountant',
  REJECTED_BY_MANAGER: 'rejected_by_manager',
};
const DEFAULT_ADVANCE_MAX_PERCENT = 25;
/** Fallback ratio when caller omits school policy (same as default max %, not a separate 40% cap). */
const DEFAULT_ADVANCE_RATIO = DEFAULT_ADVANCE_MAX_PERCENT / 100;

/** Shared money parser for policy + payroll helpers */
function toMoney(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

let tableReady = false;
let teacherDealProductsReady = false;

function toRoleCode(req) {
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

function resolveUserId(req) {
  return req.session?.userId || req.session?.user?.id || req.user?.id || null;
}

function authGuard(req, res, next) {
  const userId = resolveUserId(req);
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Not authenticated' });
  }
  const schoolId = resolveSchoolId(req);
  if (!schoolId) {
    return res.status(400).json({ success: false, message: 'No school linked to this account' });
  }
  req.ctx = { userId, schoolId, roleCode: toRoleCode(req) };
  next();
}

function requireRole(allowedRoles) {
  const accepted = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  return (req, res, next) => {
    const roleCode = req.ctx?.roleCode || '';
    if (!accepted.includes(roleCode)) {
      return res.status(403).json({
        success: false,
        message: `Access denied for role "${roleCode || 'UNKNOWN'}"`,
      });
    }
    next();
  };
}

/** Any logged-in user (including Super Admin preview); catalog has no school scope */
function requireLoggedIn(req, res, next) {
  const userId = resolveUserId(req);
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Not authenticated' });
  }
  next();
}

function requireDealProductAdmin(req, res, next) {
  const roleCode = toRoleCode(req);
  if (!DEAL_PRODUCT_ADMIN_ROLES.includes(roleCode)) {
    return res.status(403).json({ success: false, message: 'Only Super Admin can manage deal products' });
  }
  return next();
}

async function ensureTable() {
  if (tableReady) return;
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
      KEY idx_sa_school (school_id),
      KEY idx_sa_teacher (teacher_user_id),
      KEY idx_sa_status (status),
      KEY idx_sa_submitted (submitted_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  const cols = [
    ['request_type', "VARCHAR(20) NOT NULL DEFAULT 'service'"],
    ['service_category', 'VARCHAR(64) NULL'],
    ['cashout_reason', 'TEXT NULL'],
    ['cashout_category_slug', 'VARCHAR(64) NULL'],
    ['deal_product_ids_json', 'TEXT NULL'],
    ['deal_products_snapshot_json', 'LONGTEXT NULL'],
    ['deal_products_total_rwf', 'DECIMAL(14,2) NULL'],
    ['cashout_month_key', 'VARCHAR(7) NULL'],
    ['net_salary_baseline_rwf', 'DECIMAL(14,2) NULL'],
    ['auto_approval_limit_rwf', 'DECIMAL(14,2) NULL'],
    ['monthly_requested_total_rwf', 'DECIMAL(14,2) NULL'],
    ['monthly_remaining_net_rwf', 'DECIMAL(14,2) NULL'],
    ['auto_approved', 'TINYINT(1) NOT NULL DEFAULT 0'],
    ['auto_approved_at', 'DATETIME NULL'],
    ['exceeds_monthly_cap', 'TINYINT(1) NOT NULL DEFAULT 0'],
  ];
  const failedAlters = [];
  for (const [name, def] of cols) {
    try {
      await promisePool.query(`ALTER TABLE shule_avance_requests ADD COLUMN ${name} ${def}`);
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') continue;
      console.warn(`[shule-avance] ALTER add ${name}:`, e.message);
      failedAlters.push({ name, message: e.message, code: e.code });
    }
  }
  if (failedAlters.length) {
    throw new Error(
      `[shule-avance] shule_avance_requests is missing column(s): ${failedAlters.map((f) => f.name).join(', ')}. ` +
        'Grant ALTER on this table to the app DB user or run the migrations manually. ' +
        `First error: ${failedAlters[0].message}`
    );
  }

  await ensureShuleAvanceTeacherCatalogTable();
  await ensureTeacherDealProductsTable();
  tableReady = true;
}

async function ensureTeacherDealProductsTable() {
  if (teacherDealProductsReady) return;
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS shule_avance_teacher_deal_products (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(180) NOT NULL,
      price_rwf DECIMAL(14,2) NOT NULL DEFAULT 0,
      image_url VARCHAR(500) NULL,
      description TEXT NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_by_user_id INT UNSIGNED NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL,
      KEY idx_sadp_active (is_active),
      KEY idx_sadp_deleted (deleted_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  teacherDealProductsReady = true;
}

function toDealProductDto(r) {
  return {
    id: Number(r.id),
    name: r.name || '',
    price_rwf: Number(r.price_rwf || 0),
    image_url: r.image_url || '',
    description: r.description || '',
    is_active: Number(r.is_active || 0) === 1,
  };
}

async function listTeacherDealProducts({ includeInactive = false } = {}) {
  await ensureTeacherDealProductsTable();
  const where = ['deleted_at IS NULL'];
  if (!includeInactive) where.push('is_active = 1');
  const [rows] = await promisePool.query(
    `SELECT id, name, price_rwf, image_url, description, is_active
     FROM shule_avance_teacher_deal_products
     WHERE ${where.join(' AND ')}
     ORDER BY id DESC`
  );
  return (rows || []).map(toDealProductDto);
}

function normalizeProductIdList(raw) {
  if (Array.isArray(raw)) {
    return [...new Set(raw.map((x) => Number(x)).filter((n) => Number.isFinite(n) && n > 0))];
  }
  if (typeof raw === 'string') {
    const t = raw.trim();
    if (!t) return [];
    try {
      const parsed = JSON.parse(t);
      if (Array.isArray(parsed)) return normalizeProductIdList(parsed);
    } catch (_) {
      // ignore parse error and fallback to CSV parsing
    }
    return normalizeProductIdList(t.split(',').map((x) => x.trim()));
  }
  return [];
}

async function fetchTeacherDealProductsByIds(ids) {
  const cleanIds = normalizeProductIdList(ids);
  if (!cleanIds.length) return [];
  await ensureTeacherDealProductsTable();
  const [rows] = await promisePool.query(
    `SELECT id, name, price_rwf, image_url, description, is_active
     FROM shule_avance_teacher_deal_products
     WHERE deleted_at IS NULL AND is_active = 1 AND id IN (?)`,
    [cleanIds]
  );
  return (rows || []).map(toDealProductDto);
}

let schoolAdvanceColumnReady = false;

async function ensureSchoolAdvancePolicyColumn() {
  if (schoolAdvanceColumnReady) return;
  await promisePool
    .query(
      `ALTER TABLE schools ADD COLUMN shule_avance_max_percent DECIMAL(5,2) NOT NULL DEFAULT ${DEFAULT_ADVANCE_MAX_PERCENT}`
    )
    .catch(() => {});
  schoolAdvanceColumnReady = true;
}

async function getSchoolShuleAvanceMaxPercent(schoolId) {
  await ensureSchoolAdvancePolicyColumn();
  const [[row]] = await promisePool.query(
    `SELECT shule_avance_max_percent FROM schools WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
    [schoolId]
  );
  const pct = Number(row?.shule_avance_max_percent);
  if (!Number.isFinite(pct) || pct <= 0 || pct > 100) return DEFAULT_ADVANCE_MAX_PERCENT;
  return pct;
}

async function isSchoolProEnabled(schoolId) {
  const [[row]] = await promisePool.query(
    `SELECT subscription_plan, pro_enabled, pro_end_date FROM schools WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
    [schoolId]
  );
  return computeProAccessEffective(row || null);
}

/** Deep-link for staff push notifications (BabyeyiSystem Lite vs Pro portal). */
function staffShuleAvancePortalPath(isPro) {
  return isPro ? '/shule-avance' : '/lite/shule-avance';
}

async function getStaffAllowAdvance(schoolId, userId) {
  const [[row]] = await promisePool.query(
    `SELECT st.allow_advance
     FROM staff st
     WHERE st.school_id = ? AND st.user_id = ?
     LIMIT 1`,
    [schoolId, userId]
  );
  return Number(row?.allow_advance) === 1;
}

async function buildStaffAdvanceEligibility(schoolId, userId) {
  const allowed = await getStaffAllowAdvance(schoolId, userId);
  const maxPercent = await getSchoolShuleAvanceMaxPercent(schoolId);
  const netSalary = await getTeacherNetSalaryFromStaff(schoolId, userId);
  const ratio = maxPercent / 100;
  const policy = await getTeacherMonthlyCashoutPolicy(schoolId, userId, netSalary, monthKeyNow(), ratio);
  const monthlyCap = Math.floor(policy.baseline_net_salary * ratio);
  const remainingCap = Math.max(0, monthlyCap - policy.monthly_requested_total);

  if (!allowed) {
    return {
      allowed: false,
      allow_advance: false,
      max_percent: maxPercent,
      net_salary_rwf: Math.round(netSalary),
      monthly_cap_rwf: monthlyCap,
      monthly_requested_rwf: policy.monthly_requested_total,
      remaining_cap_rwf: 0,
      message: 'You are not allowed to use Shule Avance. Contact your school manager.',
    };
  }

  return {
    allowed: true,
    allow_advance: true,
    max_percent: maxPercent,
    net_salary_rwf: Math.round(netSalary),
    monthly_cap_rwf: monthlyCap,
    monthly_requested_rwf: policy.monthly_requested_total,
    remaining_cap_rwf: remainingCap,
    auto_approval_percent: maxPercent,
    auto_approval_limit_rwf: policy.auto_approval_limit,
    auto_approval_used_rwf: policy.auto_approval_used,
    auto_approval_remaining_rwf: policy.auto_approval_remaining,
    message:
      netSalary > 0
        ? `You may request up to ${maxPercent}% of net salary per month (${remainingCap.toLocaleString()} RWF remaining). Cashouts up to ${policy.auto_approval_remaining.toLocaleString()} RWF are auto-approved instantly.`
        : 'Your salary baseline is not set in HR — cashout limits may not apply until payroll is configured.',
  };
}

/** Compute net salary from the staff HR table (same logic as teacher-portal payroll endpoint). */
async function getTeacherNetSalaryFromStaff(schoolId, userId) {
  try {
    const [[row]] = await promisePool.query(
      `SELECT st.payroll_basic_salary, st.payroll_transport_allowance, st.payroll_housing_allowance,
              st.payroll_meal_allowance, st.payroll_other_allowances, st.payroll_tax_percent,
              st.payroll_pension_amount, st.payroll_other_deductions
       FROM staff st
       WHERE st.school_id = ? AND st.user_id = ?
       LIMIT 1`,
      [schoolId, userId]
    );
    if (!row) return 0;
    const parseList = (raw) => {
      if (Array.isArray(raw)) return raw;
      if (typeof raw !== 'string' || !raw.trim()) return [];
      try { const p = JSON.parse(raw); return Array.isArray(p) ? p : []; } catch { return []; }
    };
    const basic = toMoney(row.payroll_basic_salary);
    const allowances =
      toMoney(row.payroll_transport_allowance) +
      toMoney(row.payroll_housing_allowance) +
      toMoney(row.payroll_meal_allowance) +
      parseList(row.payroll_other_allowances).reduce((s, i) => s + toMoney(i?.amount), 0);
    const gross = basic + allowances;
    const tax = (gross * toMoney(row.payroll_tax_percent)) / 100;
    const pension = toMoney(row.payroll_pension_amount);
    const otherDed = parseList(row.payroll_other_deductions).reduce((s, i) => s + toMoney(i?.amount), 0);
    return Math.max(0, gross - tax - pension - otherDed);
  } catch (e) {
    console.warn('[shule-avance] getTeacherNetSalaryFromStaff:', e.message);
    return 0;
  }
}

function monthKeyNow() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

async function getTeacherMonthlyCashoutPolicy(
  schoolId,
  userId,
  netSalary,
  monthKey = monthKeyNow(),
  advanceRatio = DEFAULT_ADVANCE_RATIO
) {
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
  const ratio =
    Number(advanceRatio) > 0 && Number(advanceRatio) <= 1 ? Number(advanceRatio) : DEFAULT_ADVANCE_RATIO;
  const autoApprovalLimit = Math.floor(baseline * ratio);
  const monthlyRequestedTotal = toMoney(stats.monthly_requested_total);
  const monthlyAutoApprovedTotal = toMoney(stats.monthly_auto_approved_total);
  return {
    month_key: monthKey,
    baseline_net_salary: Math.round(baseline),
    monthly_requested_total: Math.round(monthlyRequestedTotal),
    monthly_remaining_net: Math.max(0, Math.round(baseline - monthlyRequestedTotal)),
    auto_approval_ratio: ratio,
    auto_approval_limit: autoApprovalLimit,
    auto_approval_used: Math.round(monthlyAutoApprovedTotal),
    auto_approval_remaining: Math.max(0, Math.round(autoApprovalLimit - monthlyAutoApprovedTotal)),
  };
}

/** Send a web-push notification to every subscribed user matching any of the given role codes in a school. */
async function sendWebPushToSchoolRoles(schoolId, roleCodes, payload) {
  if (!isWebPushConfigured()) return;
  const accepted = Array.isArray(roleCodes) ? roleCodes : [roleCodes];
  if (!accepted.length) return;
  try {
    const placeholders = accepted.map(() => '?').join(',');
    const [rows] = await promisePool.query(
      `SELECT DISTINCT u.id
       FROM users u
       LEFT JOIN roles r ON r.id = u.role_id
       WHERE u.school_id = ? AND r.role_code IN (${placeholders}) AND u.deleted_at IS NULL`,
      [schoolId, ...accepted]
    );
    for (const row of rows || []) {
      const uid = Number(row.id);
      if (!uid) continue;
      setImmediate(() => {
        sendWebPushToUser(uid, payload).catch((e) =>
          console.warn('[shule-avance] push to role:', e.message)
        );
      });
    }
  } catch (e) {
    console.warn('[shule-avance] sendWebPushToSchoolRoles:', e.message);
  }
}

function pickUploadedImage(req) {
  const files = Array.isArray(req.files) ? req.files : [];
  return files.find((f) => String(f.mimetype || '').toLowerCase().startsWith('image/')) || null;
}

async function persistProductImage(file) {
  if (!file?.path) return null;
  const ext = (path.extname(file.originalname || '') || '.jpg').toLowerCase();
  const safeExt = /^[.](jpg|jpeg|png|webp|gif)$/i.test(ext) ? ext : '.jpg';
  const relDir = path.join('uploads', 'shule-avance-deals');
  const absDir = path.join(__dirname, '..', relDir);
  fs.mkdirSync(absDir, { recursive: true });
  const name = `deal-${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`;
  const absPath = path.join(absDir, name);
  await fs.promises.rename(file.path, absPath);
  return `/${relDir.replace(/\\/g, '/')}/${name}`;
}

const ROW_SELECT = `r.id, r.school_id, r.teacher_user_id, r.amount_rwf, r.purpose, r.repayment_term_months,
              r.vendor_label, r.details, r.invoice_file_name, r.status, r.accountant_note, r.manager_feedback,
              r.submitted_at, r.accountant_reviewed_at, r.manager_reviewed_at, r.created_at, r.updated_at,
              r.request_type, r.service_category, r.cashout_reason, r.cashout_category_slug,
              r.deal_product_ids_json, r.deal_products_snapshot_json, r.deal_products_total_rwf,
              r.exceeds_monthly_cap, r.auto_approved, r.net_salary_baseline_rwf, r.auto_approval_limit_rwf,
              r.monthly_requested_total_rwf, r.monthly_remaining_net_rwf`;

async function parseCreateBody(req, maps) {
  const { servicesBySlug, cashoutsBySlug } = maps;
  if (!servicesBySlug.size && !cashoutsBySlug.size) {
    return { error: 'ShuleAvance catalog is empty. Ask your platform administrator to configure services and cashout types.' };
  }

  const requestType = String(req.body?.request_type || 'service').toLowerCase();
  if (!['service', 'cashout'].includes(requestType)) {
    return { error: 'request_type must be service or cashout' };
  }
  let amount = Number(req.body?.amount_requested ?? req.body?.amount_rwf);
  // Cashouts are always deducted in a single payroll cycle — no repayment term needed
  const repayment = requestType === 'cashout'
    ? 1
    : Number(req.body?.repayment_term_months ?? req.body?.repayment_term ?? 6);

  if (!amount || amount <= 0) {
    return { error: 'amount_requested must be greater than zero' };
  }
  if (requestType !== 'cashout' && (!Number.isInteger(repayment) || repayment < 1 || repayment > 12)) {
    return { error: 'repayment_term_months must be between 1 and 12' };
  }

  let purpose = '';
  let details = String(req.body?.details || '').trim() || null;
  let vendorLabel = String(req.body?.vendor_label || '').trim() || null;
  let serviceCategory = null;
  let cashoutReason = null;
  let cashoutCategorySlug = null;
  let dealProductIdsJson = null;
  let dealProductsSnapshotJson = null;
  let dealProductsTotalRwf = null;
  const invoiceFileName = String(req.body?.invoice_file_name || '').trim() || null;

  if (requestType === 'service') {
    if (!servicesBySlug.size) {
      return { error: 'No service categories are configured' };
    }
    serviceCategory = String(req.body?.service_category || '').trim();
    if (!servicesBySlug.has(serviceCategory)) {
      return { error: 'Select a valid service category' };
    }
    const cat = servicesBySlug.get(serviceCategory);
    if (serviceCategory === 'teacher_deals') {
      const selectedIds = normalizeProductIdList(
        req.body?.selected_deal_product_ids || req.body?.deal_product_ids || req.body?.product_ids
      );
      if (!selectedIds.length) {
        return { error: 'Select at least one Teacher Deal product' };
      }
      const selectedProducts = await fetchTeacherDealProductsByIds(selectedIds);
      if (!selectedProducts.length || selectedProducts.length !== selectedIds.length) {
        return { error: 'One or more selected Teacher Deal products are not available' };
      }
      const total = Number(
        selectedProducts.reduce((sum, p) => sum + Number(p.price_rwf || 0), 0).toFixed(2)
      );
      if (total <= 0) {
        return { error: 'Selected Teacher Deal products have invalid pricing' };
      }
      amount = total;
      dealProductsTotalRwf = total;
      const userDesc = String(req.body?.description || req.body?.purpose || '').trim();
      const lineItems = selectedProducts.map((p) => `${p.name} (${Number(p.price_rwf).toLocaleString()} RWF)`).join(', ');
      purpose = userDesc || `Teacher Deals purchase (${selectedProducts.length} item${selectedProducts.length > 1 ? 's' : ''})`;
      details = lineItems;
      vendorLabel = 'Teacher Deals Catalog';
      dealProductIdsJson = JSON.stringify(selectedProducts.map((p) => p.id));
      dealProductsSnapshotJson = JSON.stringify(selectedProducts);
    } else {
      const userDesc = String(req.body?.description || req.body?.purpose || '').trim();
      purpose = userDesc || `Service — ${cat.label}`;
      vendorLabel = cat.label;
    }
  } else {
    // Removed strict cashout category validation per user request
    cashoutCategorySlug = String(
      req.body?.cashout_category || req.body?.cashout_category_slug || 'general'
    ).trim();
    
    cashoutReason = String(req.body?.reason || req.body?.cashout_reason || req.body?.purpose || '').trim();
    if (!cashoutReason) {
      return { error: 'reason is required for cashout requests' };
    }
    
    // Get label if exists, otherwise fallback
    const co = cashoutsBySlug.has(cashoutCategorySlug) ? cashoutsBySlug.get(cashoutCategorySlug) : { label: 'General Cashout' };
    purpose = `Cashout [${co.label}]: ${cashoutReason}`;
    details = String(req.body?.description || '').trim() || null;
  }

  return {
    value: {
      requestType,
      amount,
      repayment,
      purpose,
      details,
      vendorLabel,
      serviceCategory,
      cashoutReason,
      cashoutCategorySlug,
      invoiceFileName,
      dealProductIdsJson,
      dealProductsSnapshotJson,
      dealProductsTotalRwf,
    },
  };
}

async function handleApplicantEligibility(req, res) {
  try {
    const { schoolId, userId } = req.ctx;
    const data = await buildStaffAdvanceEligibility(schoolId, userId);
    return res.json({ success: true, data });
  } catch (error) {
    console.error('[shule-avance] eligibility:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to load eligibility.' });
  }
}

async function handleApplicantCreate(req, res) {
  try {
    const { schoolId, userId } = req.ctx;
    const eligibility = await buildStaffAdvanceEligibility(schoolId, userId);
    if (!eligibility.allowed) {
      return res.status(403).json({ success: false, code: 'ADVANCE_NOT_ALLOWED', message: eligibility.message });
    }

    await ensureShuleAvanceTeacherCatalogTable();
    const maps = await fetchActiveCatalogMaps();
    const parsed = await parseCreateBody(req, maps);
    if (parsed.error) {
      return res.status(400).json({ success: false, message: parsed.error });
    }
    const v = parsed.value;

    const maxPercent = eligibility.max_percent;
    const advanceRatio = maxPercent / 100;
    const monthlyCap = eligibility.monthly_cap_rwf;
    const projectedTotal = eligibility.monthly_requested_rwf + v.amount;
    const exceedsMonthlyCap = monthlyCap > 0 && projectedTotal > monthlyCap;

    const isPro = await isSchoolProEnabled(schoolId);
    const isLite = !isPro;

    // ── Monthly cap + optional auto-approval for cashouts within school % ─────
    // Pro: over-limit requests go accountant → school manager (Babyeyi Pro). Lite: straight to manager.
    let initialStatus = isPro ? STATUS.PENDING_ACCOUNTANT : STATUS.SENT_TO_MANAGER;
    let autoApproved = false;
    let cashoutPolicy = null;
    let requestedTotalAfter = null;
    let remainingAfter = null;
    if (v.requestType === 'cashout') {
      const netSalary = await getTeacherNetSalaryFromStaff(schoolId, userId);
      cashoutPolicy = await getTeacherMonthlyCashoutPolicy(schoolId, userId, netSalary, monthKeyNow(), advanceRatio);
      const canAutoApprove =
        !exceedsMonthlyCap
        && cashoutPolicy.baseline_net_salary > 0
        && v.amount <= cashoutPolicy.auto_approval_remaining;
      if (canAutoApprove) {
        initialStatus = STATUS.APPROVED;
        autoApproved = true;
      } else {
        initialStatus = isPro ? STATUS.PENDING_ACCOUNTANT : STATUS.SENT_TO_MANAGER;
        autoApproved = false;
      }
      requestedTotalAfter = Math.round(cashoutPolicy.monthly_requested_total + v.amount);
      remainingAfter = Math.max(0, Math.round(cashoutPolicy.baseline_net_salary - requestedTotalAfter));
    } else if (isLite) {
      initialStatus = STATUS.SENT_TO_MANAGER;
      autoApproved = false;
    }
    // ─────────────────────────────────────────────────────────────────────────

    const [result] = await promisePool.query(
      `INSERT INTO shule_avance_requests
       (school_id, teacher_user_id, amount_rwf, purpose, repayment_term_months, vendor_label, details,
        invoice_file_name, status, request_type, service_category, cashout_reason, cashout_category_slug,
        deal_product_ids_json, deal_products_snapshot_json, deal_products_total_rwf,
        cashout_month_key, net_salary_baseline_rwf, auto_approval_limit_rwf, monthly_requested_total_rwf, monthly_remaining_net_rwf,
        auto_approved, auto_approved_at, exceeds_monthly_cap)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        schoolId,
        userId,
        v.amount,
        v.purpose,
        v.repayment,
        v.vendorLabel,
        v.details,
        v.invoiceFileName,
        initialStatus,
        v.requestType,
        v.requestType === 'service' ? v.serviceCategory : null,
        v.requestType === 'cashout' ? v.cashoutReason : null,
        v.requestType === 'cashout' ? v.cashoutCategorySlug : null,
        v.requestType === 'service' ? v.dealProductIdsJson : null,
        v.requestType === 'service' ? v.dealProductsSnapshotJson : null,
        v.requestType === 'service' ? v.dealProductsTotalRwf : null,
        v.requestType === 'cashout' ? cashoutPolicy?.month_key : null,
        v.requestType === 'cashout' ? cashoutPolicy?.baseline_net_salary : null,
        v.requestType === 'cashout' ? cashoutPolicy?.auto_approval_limit : null,
        v.requestType === 'cashout' ? requestedTotalAfter : null,
        v.requestType === 'cashout' ? remainingAfter : null,
        autoApproved ? 1 : 0,
        autoApproved ? new Date() : null,
        exceedsMonthlyCap ? 1 : 0,
      ]
    );

    const reqId = result.insertId;
    const responseMsg = autoApproved
      ? 'Cashout auto-approved — will be deducted from your next payroll'
      : exceedsMonthlyCap && isPro
        ? `This request exceeds your ${maxPercent}% monthly limit (${monthlyCap.toLocaleString()} RWF cap). It was sent to finance for review, then to your school manager for approval.`
        : exceedsMonthlyCap && isLite
          ? `This request exceeds your ${maxPercent}% monthly limit and was sent to your school manager for approval.`
          : (v.requestType === 'cashout'
            ? (isPro
              ? `Cashout sent for finance review (within ${maxPercent}% monthly cap).`
              : `Cashout sent to your school manager for approval.`)
            : (isPro ? 'Request submitted to accountant' : 'Request sent to your school manager'));
    res.status(201).json({
      success: true,
      message: responseMsg,
      id: reqId,
      auto_approved: autoApproved,
      exceeds_monthly_cap: exceedsMonthlyCap,
      requires_manager_approval: initialStatus === STATUS.SENT_TO_MANAGER,
      requested_at: new Date().toISOString(),
      cashout_policy: cashoutPolicy ? {
        ...cashoutPolicy,
        monthly_requested_total_after: requestedTotalAfter,
        monthly_remaining_net_after: remainingAfter,
      } : null,
    });

    // ── Fire-and-forget push notifications ───────────────────────────────────
    const staffPortalUrl = staffShuleAvancePortalPath(isPro);
    if (autoApproved) {
      // Notify the teacher that their cashout was instantly approved
      setImmediate(() => {
        sendWebPushToUser(userId, {
          title: 'Ticha Avance — Auto-approved ✓',
          body: `Your cashout of ${Math.round(v.amount).toLocaleString()} RWF was automatically approved and will be deducted from your next payroll.`,
          tag: `sa-${reqId}-auto-approved`,
          url: staffPortalUrl,
        }).catch((e) => console.warn('[shule-avance] push auto-approved:', e.message));
      });
    } else if (initialStatus === STATUS.SENT_TO_MANAGER) {
      setImmediate(() => {
        sendWebPushToSchoolRoles(schoolId, MANAGER_ROLES, {
          title: exceedsMonthlyCap ? 'Ticha Avance — Over monthly limit' : 'Ticha Avance — Approval needed',
          body: exceedsMonthlyCap
            ? `Staff request of ${Math.round(v.amount).toLocaleString()} RWF exceeds the ${maxPercent}% monthly cap and needs your decision.`
            : `A new ${v.requestType === 'cashout' ? 'cashout' : 'advance'} request of ${Math.round(v.amount).toLocaleString()} RWF needs your approval.`,
          tag: `sa-${reqId}-manager`,
          url: '/school-manager',
        });
      });
    } else {
      setImmediate(() => {
        sendWebPushToSchoolRoles(schoolId, [ROLE_ACCOUNTANT], {
          title: exceedsMonthlyCap ? 'Ticha Avance — Over monthly limit' : 'Ticha Avance — New Request',
          body: exceedsMonthlyCap
            ? `Staff request of ${Math.round(v.amount).toLocaleString()} RWF exceeds the ${maxPercent}% monthly cap. Review and forward to the school manager if approved.`
            : `A new ${v.requestType === 'cashout' ? 'cashout' : 'advance'} request of ${Math.round(v.amount).toLocaleString()} RWF needs your review.`,
          tag: `sa-${reqId}-new`,
          url: '/shule-avance',
        });
      });
    }
    // ─────────────────────────────────────────────────────────────────────────
  } catch (error) {
    console.error('[shule-avance] applicant create:', error.code || '', error.message);
    if (process.env.NODE_ENV !== 'production') {
      console.error(error.stack);
    }
    res.status(500).json({
      success: false,
      message: 'Failed to submit request',
      ...(process.env.NODE_ENV !== 'production' && error.message
        ? { detail: error.message }
        : {}),
    });
  }
}

async function handleApplicantList(req, res) {
  try {
    const { schoolId, userId } = req.ctx;
    const [rows] = await promisePool.query(
      `SELECT ${ROW_SELECT}
       FROM shule_avance_requests r
       WHERE r.school_id = ? AND r.teacher_user_id = ?
       ORDER BY r.id DESC`,
      [schoolId, userId]
    );
    const netSalary = await getTeacherNetSalaryFromStaff(schoolId, userId);
    const maxPercent = await getSchoolShuleAvanceMaxPercent(schoolId);
    const monthlyCashoutPolicy = await getTeacherMonthlyCashoutPolicy(
      schoolId,
      userId,
      netSalary,
      monthKeyNow(),
      maxPercent / 100
    );
    res.json({
      success: true,
      data: rows,
      summary: {
        generated_at: new Date().toISOString(),
        monthly_cashout_policy: monthlyCashoutPolicy,
      },
    });
  } catch (error) {
    console.error('[shule-avance] applicant list:', error.message);
    if (error.sqlMessage) console.error('[shule-avance] applicant list sql:', error.sqlMessage);
    if (error.code) console.error('[shule-avance] applicant list code:', error.code);
    console.error(error.stack);
    res.status(500).json({ success: false, message: 'Failed to load your ShuleAvance requests' });
  }
}

async function handleApplicantUpdate(req, res) {
  try {
    const { schoolId, userId } = req.ctx;
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid request id' });

    const [[existing]] = await promisePool.query(
      `SELECT id, status, request_type, cashout_category_slug, service_category
       FROM shule_avance_requests WHERE id = ? AND school_id = ? AND teacher_user_id = ? LIMIT 1`,
      [id, schoolId, userId]
    );
    if (!existing) return res.status(404).json({ success: false, message: 'Request not found' });
    if (existing.status !== STATUS.PENDING_ACCOUNTANT) {
      return res.status(400).json({ success: false, message: 'Only pending requests can be edited' });
    }

    if (
      String(existing.request_type || '').toLowerCase() === 'cashout' &&
      !String(req.body?.cashout_category || req.body?.cashout_category_slug || '').trim() &&
      existing.cashout_category_slug
    ) {
      req.body = { ...req.body, cashout_category: existing.cashout_category_slug };
    }
    if (
      String(existing.request_type || '').toLowerCase() === 'service' &&
      !String(req.body?.service_category || '').trim() &&
      existing.service_category
    ) {
      req.body = { ...req.body, service_category: existing.service_category };
    }

    await ensureShuleAvanceTeacherCatalogTable();
    const maps = await fetchActiveCatalogMaps();
    const parsed = await parseCreateBody(req, maps);
    if (parsed.error) {
      return res.status(400).json({ success: false, message: parsed.error });
    }
    const v = parsed.value;

    await promisePool.query(
      `UPDATE shule_avance_requests
       SET amount_rwf = ?, purpose = ?, repayment_term_months = ?, vendor_label = ?, details = ?,
           invoice_file_name = ?, request_type = ?, service_category = ?, cashout_reason = ?, cashout_category_slug = ?,
           deal_product_ids_json = ?, deal_products_snapshot_json = ?, deal_products_total_rwf = ?
       WHERE id = ? AND school_id = ? AND teacher_user_id = ?`,
      [
        v.amount,
        v.purpose,
        v.repayment,
        v.vendorLabel,
        v.details,
        v.invoiceFileName,
        v.requestType,
        v.requestType === 'service' ? v.serviceCategory : null,
        v.requestType === 'cashout' ? v.cashoutReason : null,
        v.requestType === 'cashout' ? v.cashoutCategorySlug : null,
        v.requestType === 'service' ? v.dealProductIdsJson : null,
        v.requestType === 'service' ? v.dealProductsSnapshotJson : null,
        v.requestType === 'service' ? v.dealProductsTotalRwf : null,
        id,
        schoolId,
        userId,
      ]
    );

    res.json({ success: true, message: 'Request updated successfully' });
  } catch (error) {
    console.error('[shule-avance] applicant update:', error.message);
    res.status(500).json({ success: false, message: 'Failed to update request' });
  }
}

async function handleApplicantDelete(req, res) {
  try {
    const { schoolId, userId } = req.ctx;
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid request id' });

    const [result] = await promisePool.query(
      `DELETE FROM shule_avance_requests
       WHERE id = ? AND school_id = ? AND teacher_user_id = ? AND status = ?`,
      [id, schoolId, userId, STATUS.PENDING_ACCOUNTANT]
    );

    if (!result.affectedRows) {
      return res.status(400).json({
        success: false,
        message: 'Request not found or cannot be deleted after review',
      });
    }
    res.json({ success: true, message: 'Request deleted successfully' });
  } catch (error) {
    console.error('[shule-avance] applicant delete:', error.message);
    res.status(500).json({ success: false, message: 'Failed to delete request' });
  }
}

router.get('/shule-avance/catalog', requireLoggedIn, async (req, res) => {
  try {
    await ensureShuleAvanceTeacherCatalogTable();
    const [rows] = await promisePool.query(
      `SELECT item_kind, slug, label, description, income_rate_percent, sort_order
       FROM shule_avance_teacher_catalog
       WHERE is_active = 1
       ORDER BY item_kind ASC, sort_order ASC, id ASC`
    );
    const services = [];
    const cashouts = [];
    for (const r of rows || []) {
      const x = {
        slug: r.slug,
        label: r.label,
        description: r.description,
        income_rate_percent: Number(r.income_rate_percent),
        sort_order: r.sort_order,
      };
      if (r.item_kind === 'service') services.push(x);
      else cashouts.push(x);
    }
    res.json({ success: true, data: { services, cashouts } });
  } catch (error) {
    console.error('[shule-avance] catalog:', error.message);
    res.status(500).json({ success: false, message: 'Failed to load catalog' });
  }
});

router.get('/shule-avance/teacher-deal-products', requireLoggedIn, async (_req, res) => {
  try {
    const data = await listTeacherDealProducts();
    res.json({ success: true, data });
  } catch (error) {
    console.error('[shule-avance] teacher deal products:', error.message);
    res.status(500).json({ success: false, message: 'Failed to load Teacher Deal products' });
  }
});

router.get('/shule-avance/admin/teacher-deal-products', requireLoggedIn, requireDealProductAdmin, async (req, res) => {
  try {
    const includeInactive = String(req.query?.include_inactive || '').trim() === '1';
    const data = await listTeacherDealProducts({ includeInactive });
    res.json({ success: true, data });
  } catch (error) {
    console.error('[shule-avance] admin list teacher deal products:', error.message);
    res.status(500).json({ success: false, message: 'Failed to load Teacher Deal products' });
  }
});

router.post('/shule-avance/admin/teacher-deal-products', requireLoggedIn, requireDealProductAdmin, async (req, res) => {
  try {
    await ensureTeacherDealProductsTable();
    const userId = resolveUserId(req);
    const name = String(req.body?.name || '').trim();
    const description = String(req.body?.description || '').trim() || null;
    const price = Number(req.body?.price_rwf);
    const isActive = req.body?.is_active === undefined ? true : !!req.body.is_active;
    if (!name) return res.status(400).json({ success: false, message: 'name is required' });
    if (!Number.isFinite(price) || price <= 0) {
      return res.status(400).json({ success: false, message: 'price_rwf must be greater than zero' });
    }
    const imageFile = pickUploadedImage(req);
    const imageUrl = imageFile ? await persistProductImage(imageFile) : null;
    const [r] = await promisePool.query(
      `INSERT INTO shule_avance_teacher_deal_products
       (name, price_rwf, image_url, description, is_active, created_by_user_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, Number(price.toFixed(2)), imageUrl, description, isActive ? 1 : 0, userId]
    );
    res.status(201).json({ success: true, id: r.insertId, message: 'Teacher Deal product created' });
  } catch (error) {
    console.error('[shule-avance] admin create teacher deal product:', error.message);
    res.status(500).json({ success: false, message: 'Failed to create Teacher Deal product' });
  }
});

router.put('/shule-avance/admin/teacher-deal-products/:id', requireLoggedIn, requireDealProductAdmin, async (req, res) => {
  try {
    await ensureTeacherDealProductsTable();
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid product id' });
    const [[existing]] = await promisePool.query(
      `SELECT id, image_url
       FROM shule_avance_teacher_deal_products
       WHERE id = ? AND deleted_at IS NULL
       LIMIT 1`,
      [id]
    );
    if (!existing) return res.status(404).json({ success: false, message: 'Product not found' });

    const fields = [];
    const vals = [];
    if (req.body?.name !== undefined) {
      const name = String(req.body.name || '').trim();
      if (!name) return res.status(400).json({ success: false, message: 'name cannot be empty' });
      fields.push('name = ?');
      vals.push(name);
    }
    if (req.body?.price_rwf !== undefined) {
      const price = Number(req.body.price_rwf);
      if (!Number.isFinite(price) || price <= 0) {
        return res.status(400).json({ success: false, message: 'price_rwf must be greater than zero' });
      }
      fields.push('price_rwf = ?');
      vals.push(Number(price.toFixed(2)));
    }
    if (req.body?.description !== undefined) {
      fields.push('description = ?');
      vals.push(String(req.body.description || '').trim() || null);
    }
    if (req.body?.is_active !== undefined) {
      fields.push('is_active = ?');
      vals.push(req.body.is_active ? 1 : 0);
    }
    const imageFile = pickUploadedImage(req);
    if (imageFile) {
      const imageUrl = await persistProductImage(imageFile);
      fields.push('image_url = ?');
      vals.push(imageUrl);
    }
    if (!fields.length) {
      return res.status(400).json({ success: false, message: 'No changes provided' });
    }
    vals.push(id);
    await promisePool.query(
      `UPDATE shule_avance_teacher_deal_products
       SET ${fields.join(', ')}
       WHERE id = ? AND deleted_at IS NULL`,
      vals
    );
    res.json({ success: true, message: 'Teacher Deal product updated' });
  } catch (error) {
    console.error('[shule-avance] admin update teacher deal product:', error.message);
    res.status(500).json({ success: false, message: 'Failed to update Teacher Deal product' });
  }
});

router.delete('/shule-avance/admin/teacher-deal-products/:id', requireLoggedIn, requireDealProductAdmin, async (req, res) => {
  try {
    await ensureTeacherDealProductsTable();
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid product id' });
    const [r] = await promisePool.query(
      `UPDATE shule_avance_teacher_deal_products
       SET deleted_at = NOW(), is_active = 0
       WHERE id = ? AND deleted_at IS NULL`,
      [id]
    );
    if (!r.affectedRows) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, message: 'Teacher Deal product deleted' });
  } catch (error) {
    console.error('[shule-avance] admin delete teacher deal product:', error.message);
    res.status(500).json({ success: false, message: 'Failed to delete Teacher Deal product' });
  }
});

// ── Teacher Deal → main site MTN MoMo (payments.jsx bridge; public payload + execute) ──
let teacherDealPayTokenReady = false;
async function ensureTeacherDealPayTokensTable() {
  if (teacherDealPayTokenReady) return;
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS shule_avance_teacher_deal_pay_tokens (
      token VARCHAR(64) NOT NULL PRIMARY KEY,
      payload_json LONGTEXT NOT NULL,
      teacher_user_id INT UNSIGNED NOT NULL,
      consumed TINYINT(1) NOT NULL DEFAULT 0,
      expires_at DATETIME NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_expires (expires_at),
      KEY idx_teacher (teacher_user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  teacherDealPayTokenReady = true;
}

function normalizeRwPhoneDeal(raw) {
  let v = String(raw || '').trim().replace(/[\s\-()]/g, '');
  if (v.startsWith('+250')) v = `0${v.slice(4)}`;
  else if (v.startsWith('250') && v.length === 12) v = `0${v.slice(3)}`;
  if (/^[27]\d{8}$/.test(v)) v = `0${v}`;
  if (/^07[2389]\d{7}$/.test(v)) return v;
  return null;
}

function toMsisdn250Deal(raw) {
  const local = normalizeRwPhoneDeal(raw);
  if (!local) return null;
  return `250${local.slice(1)}`;
}

/** Map MTN GET requesttopay status to success / fail / still waiting (202 RTP is only "prompt sent"). */
const internalMomo = require('./internalMomoGateway');

/** Prefer mtnMomoCollection; fall back to /api/momo (same as payments.jsx). */
function resolveTeacherDealMomoGateway() {
  let collection = null;
  try {
    collection = require('./mtnMomoCollection');
  } catch (e) {
    console.warn('[teacher-deal-momo] mtnMomoCollection load:', e.message);
  }
  if (collection?.mtnMomoEnabled?.()) {
    return { mode: 'collection', mtnMomo: collection };
  }
  if (internalMomo.isInternalMomoConfigured()) {
    return { mode: 'internal', mtnMomo: internalMomo.internalMomoStatusMapper };
  }
  return { mode: 'none', mtnMomo: null };
}

async function teacherDealMomoRequestToPay(gateway, params) {
  if (gateway.mode === 'collection') {
    return gateway.mtnMomo.requestToPay(params);
  }
  const json = await internalMomo.startInternalMomoRequestToPay({
    phoneMsisdn250: params.msisdn250,
    amountRwf: params.amount,
    externalId: params.externalId,
    payerMessage: params.payerMessage,
    payeeNote: params.payeeNote,
  });
  return { referenceId: json.referenceId, statusCode: 202 };
}

async function teacherDealMomoGetStatus(gateway, referenceId) {
  if (gateway.mode === 'collection') {
    return gateway.mtnMomo.getRequestToPayStatus(referenceId);
  }
  return internalMomo.getInternalMomoRequestToPayStatus(referenceId);
}

function teacherDealMomoUnavailableDetail(gateway) {
  if (gateway.mode !== 'none') return '';
  let collectionReason = '';
  try {
    const c = require('./mtnMomoCollection');
    if (typeof c.mtnMomoDisabledReason === 'function') collectionReason = c.mtnMomoDisabledReason();
  } catch (_) { /* ignore */ }
  const internalReason = internalMomo.internalMomoDisabledReason();
  return collectionReason || internalReason || 'Configure MoMo credentials in backend .env (same as public payments page).';
}

function classifyTeacherDealMtnStatus(stData, mtnMomo) {
  if (stData && stData.mtnNotFound) {
    return { kind: 'pending', providerStatus: 'PENDING' };
  }
  const raw = mtnMomo.mapMtnStatusToUpper(stData && stData.status);
  const s = String(raw || '').toUpperCase();
  if (['SUCCESSFUL', 'SUCCESS', 'COMPLETED'].includes(s)) {
    return { kind: 'ok', providerStatus: s };
  }
  if (['FAILED', 'REJECTED', 'CANCELLED'].includes(s)) {
    return { kind: 'fail', providerStatus: s };
  }
  return { kind: 'pending', providerStatus: s || 'PENDING' };
}

function stripTeacherDealMtnPendingFields(payload) {
  const p = { ...payload };
  delete p.mtn_pending_reference_id;
  delete p.mtn_pending_external_id;
  delete p.mtn_pending_started_at;
  return p;
}

router.get('/shule-avance/public/teacher-deal-pay-payload', async (req, res) => {
  try {
    await ensureTeacherDealPayTokensTable();
    const token = String(req.query.token || '').trim();
    if (!token) return res.status(400).json({ success: false, message: 'token is required' });
    const [[row]] = await promisePool.query(
      `SELECT payload_json, consumed, expires_at FROM shule_avance_teacher_deal_pay_tokens WHERE token = ?`,
      [token]
    );
    if (!row) return res.status(404).json({ success: false, message: 'Invalid or expired link' });
    if (new Date(row.expires_at) < new Date()) {
      return res.status(410).json({ success: false, message: 'This payment link has expired' });
    }
    let payload;
    try {
      payload = JSON.parse(row.payload_json);
    } catch {
      return res.status(500).json({ success: false, message: 'Invalid payment data' });
    }
    return res.json({ success: true, data: payload });
  } catch (error) {
    console.error('[teacher-deal-pay-payload]', error.message);
    res.status(500).json({ success: false, message: 'Could not load payment' });
  }
});

let teacherDealAltIntentReady = false;
async function ensureTeacherDealAltIntentsTable() {
  if (teacherDealAltIntentReady) return;
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS shule_avance_teacher_deal_pay_alt_intents (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      token VARCHAR(64) NOT NULL,
      channel VARCHAR(32) NOT NULL,
      payload_json LONGTEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_token (token),
      KEY idx_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  teacherDealAltIntentReady = true;
}

/** Non-MTN channels: records payer intent (bank / visa / airtel follow-up) without consuming the pay token */
router.post('/shule-avance/public/teacher-deal-pay-alt-intent', async (req, res) => {
  try {
    await ensureTeacherDealPayTokensTable();
    await ensureTeacherDealAltIntentsTable();
    const token = String(req.body.token || '').trim();
    const channel = String(req.body.channel || '').trim().toLowerCase();
    const allowed = ['airtel_money', 'bank_transfer', 'visa_card'];
    if (!token || !allowed.includes(channel)) {
      return res.status(400).json({
        success: false,
        message: 'token and channel (airtel_money | bank_transfer | visa_card) are required',
      });
    }
    const [[row]] = await promisePool.query(
      `SELECT expires_at, consumed FROM shule_avance_teacher_deal_pay_tokens WHERE token = ?`,
      [token]
    );
    if (!row) return res.status(404).json({ success: false, message: 'Invalid payment token' });
    if (new Date(row.expires_at) < new Date()) {
      return res.status(410).json({ success: false, message: 'This payment link has expired' });
    }
    if (Number(row.consumed)) {
      return res.status(409).json({
        success: false,
        message: 'This session was already used for an MTN payment.',
      });
    }
    const payload = {
      ...req.body,
      channel,
      recorded_at: new Date().toISOString(),
    };
    await promisePool.query(
      `INSERT INTO shule_avance_teacher_deal_pay_alt_intents (token, channel, payload_json) VALUES (?,?,?)`,
      [token, channel, JSON.stringify(payload)]
    );
    return res.json({
      success: true,
      message: 'Preference recorded. Complete the steps shown for your chosen method.',
    });
  } catch (error) {
    console.error('[teacher-deal-pay-alt-intent]', error.message);
    res.status(500).json({ success: false, message: error.message || 'Failed to save' });
  }
});

router.post('/shule-avance/public/teacher-deal-pay-momo', async (req, res) => {
  let mtnMomo = null;
  let mtnRequireErr = null;
  try {
    mtnMomo = require('./mtnMomoCollection');
  } catch (e) {
    mtnRequireErr = e;
    console.error('[teacher-deal-pay-momo] require mtnMomoCollection failed:', e && e.message);
  }
  if (!mtnMomo || !mtnMomo.mtnMomoEnabled || !mtnMomo.mtnMomoEnabled()) {
    const detail = mtnRequireErr
      ? `Could not load MTN module: ${mtnRequireErr.message}`
      : typeof mtnMomo?.mtnMomoDisabledReason === 'function'
        ? mtnMomo.mtnMomoDisabledReason()
        : '';
    return res.status(503).json({
      success: false,
      message: 'Mobile Money collection is not available right now.',
      detail:
        detail ||
        'Set MTN_MOMO_SUBSCRIPTION_KEY, MTN_MOMO_API_USER, MTN_MOMO_API_KEY on the API server (same as main Babyeyi payments page).',
    });
  }
  try {
    await ensureTeacherDealPayTokensTable();
    const token = String(req.body.token || '').trim();
    const momoPhoneRaw = String(req.body.momo_phone || '').trim();
    const msisdn = toMsisdn250Deal(momoPhoneRaw);
    if (!token || !msisdn) {
      return res.status(400).json({ success: false, message: 'Valid payment token and MTN Rwanda phone are required' });
    }

    const conn = await promisePool.getConnection();
    try {
      await conn.beginTransaction();
      const [[row]] = await conn.query(
        `SELECT payload_json, consumed, expires_at FROM shule_avance_teacher_deal_pay_tokens WHERE token = ? LIMIT 1`,
        [token]
      );
      if (!row) {
        await conn.rollback();
        return res.status(404).json({ success: false, message: 'Invalid payment token' });
      }
      if (new Date(row.expires_at) < new Date()) {
        await conn.rollback();
        return res.status(410).json({ success: false, message: 'This payment link has expired' });
      }
      let payload;
      try {
        payload = JSON.parse(row.payload_json);
      } catch {
        await conn.rollback();
        return res.status(500).json({ success: false, message: 'Invalid payment data' });
      }

      const amount = Math.round(Number(payload.amount_rwf));
      if (!amount || amount < 100) {
        await conn.rollback();
        return res.status(400).json({ success: false, message: 'Invalid amount' });
      }

      if (Number(row.consumed)) {
        await conn.rollback();
        return res.status(409).json({ success: false, message: 'This payment session was already completed' });
      }

      // Idempotent: same session may re-hit POST while MTN RTP is still pending on the phone
      if (payload.mtn_pending_reference_id) {
        let stData;
        try {
          stData = await teacherDealMomoGetStatus(gateway, payload.mtn_pending_reference_id);
        } catch (gateErr) {
          await conn.rollback();
          return res.json({
            success: true,
            data: {
              phase: 'awaiting_device',
              mtn_status: 'PENDING',
              mtn_reference_id: payload.mtn_pending_reference_id,
              order_number: payload.mtn_pending_external_id,
              amount_rwf: amount,
              status_check_deferred: true,
              message:
                'Could not refresh payment status yet. Approve the MTN MoMo prompt on your phone if you still see it.',
            },
          });
        }

        const cls = classifyTeacherDealMtnStatus(stData, mtnMomo);
        if (cls.kind === 'ok') {
          const orderNumber = String(payload.mtn_pending_external_id || '').trim();
          const clean = stripTeacherDealMtnPendingFields(payload);
          await conn.query(
            `UPDATE shule_avance_teacher_deal_pay_tokens SET consumed = 1, payload_json = ? WHERE token = ?`,
            [JSON.stringify(clean), token]
          );
          await conn.commit();
          return res.json({
            success: true,
            data: {
              phase: 'complete',
              mtn_status: 'SUCCESSFUL',
              order_number: orderNumber,
              amount_rwf: amount,
              message: 'Payment successful.',
            },
          });
        }
        if (cls.kind === 'pending') {
          await conn.rollback();
          return res.json({
            success: true,
            data: {
              phase: 'awaiting_device',
              mtn_status: 'PENDING',
              mtn_reference_id: payload.mtn_pending_reference_id,
              order_number: payload.mtn_pending_external_id,
              amount_rwf: amount,
              message: 'Request sent to your phone. Approve the MTN MoMo prompt to complete payment.',
            },
          });
        }
        // Failed / rejected on device — clear pending so a new RTP can be created
        payload = stripTeacherDealMtnPendingFields(payload);
        await conn.query(
          `UPDATE shule_avance_teacher_deal_pay_tokens SET payload_json = ? WHERE token = ?`,
          [JSON.stringify(payload), token]
        );
      }

      const externalId = `td-${token.slice(0, 10)}-${Date.now()}`.slice(0, 64);
      const mtn = await teacherDealMomoRequestToPay(gateway, {
        amount,
        currency: 'RWF',
        externalId,
        msisdn250: msisdn,
        payerMessage: String(payload.product_name || 'Teacher deal').slice(0, 80),
        payeeNote: `Teacher deal - ${String(payload.payer_name || '').slice(0, 60)}`,
      });

      const refId = mtn.referenceId;
      const nextPayload = {
        ...payload,
        mtn_pending_reference_id: refId,
        mtn_pending_external_id: externalId,
        mtn_pending_started_at: new Date().toISOString(),
      };
      await conn.query(
        `UPDATE shule_avance_teacher_deal_pay_tokens SET payload_json = ? WHERE token = ?`,
        [JSON.stringify(nextPayload), token]
      );
      await conn.commit();

      return res.json({
        success: true,
        data: {
          phase: 'awaiting_device',
          mtn_status: 'PENDING',
          mtn_reference_id: refId,
          order_number: externalId,
          amount_rwf: amount,
          message: 'Request sent to your phone. Approve the MTN MoMo prompt to complete payment.',
        },
      });
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  } catch (error) {
    const mtnStatus = error.mtnStatus;
    const mtnBody = error.mtnBody;
    console.error('[teacher-deal-pay-momo]', error.message, mtnStatus != null ? `(MTN HTTP ${mtnStatus})` : '', mtnBody || '');

    let detail = '';
    if (mtnBody != null && typeof mtnBody === 'object') {
      try {
        detail = JSON.stringify(mtnBody).slice(0, 600);
      } catch (_) {
        detail = '';
      }
    } else if (typeof mtnBody === 'string') {
      detail = mtnBody.slice(0, 600);
    }

    const body = {
      success: false,
      message: error.message || 'Payment failed',
      ...(detail ? { detail } : {}),
    };
    // MoMo API returned 4xx/5xx — surface as 502 so clients know upstream payment provider failed
    if (mtnStatus >= 400 && mtnStatus < 600) {
      return res.status(502).json(body);
    }
    res.status(500).json(body);
  }
});

/** Poll MTN until the customer approves — token stays unconsumed until SUCCESSFUL. */
router.post('/shule-avance/public/teacher-deal-pay-momo-status', async (req, res) => {
  const gateway = resolveTeacherDealMomoGateway();
  if (gateway.mode === 'none') {
    return res.status(503).json({
      success: false,
      message: 'Mobile Money collection is not available right now.',
      detail: teacherDealMomoUnavailableDetail(gateway),
    });
  }
  const { mtnMomo } = gateway;
  try {
    await ensureTeacherDealPayTokensTable();
    const token = String(req.body.token || '').trim();
    const referenceId = String(req.body.reference_id || '').trim().toLowerCase();
    if (!token || !referenceId) {
      return res.status(400).json({ success: false, message: 'token and reference_id are required' });
    }

    const [[row]] = await promisePool.query(
      `SELECT payload_json, consumed, expires_at FROM shule_avance_teacher_deal_pay_tokens WHERE token = ? LIMIT 1`,
      [token]
    );
    if (!row) {
      return res.status(404).json({ success: false, message: 'Invalid payment token' });
    }
    if (new Date(row.expires_at) < new Date()) {
      return res.status(410).json({ success: false, message: 'This payment link has expired' });
    }

    let payload;
    try {
      payload = JSON.parse(row.payload_json);
    } catch {
      return res.status(500).json({ success: false, message: 'Invalid payment data' });
    }

    const expected = String(payload.mtn_pending_reference_id || '').trim().toLowerCase();
    if (!expected || expected !== referenceId) {
      return res.status(403).json({ success: false, message: 'Invalid reference for this payment session' });
    }

    const amount = Math.round(Number(payload.amount_rwf));
    const orderNumber = String(payload.mtn_pending_external_id || '').trim();

    if (Number(row.consumed)) {
      return res.json({
        success: true,
        data: {
          phase: 'complete',
          mtn_status: 'SUCCESSFUL',
          already_finalized: true,
          order_number: orderNumber,
          amount_rwf: amount,
          message: 'Payment already recorded.',
        },
      });
    }

    let stData;
    try {
      stData = await teacherDealMomoGetStatus(gateway, referenceId);
    } catch (gateErr) {
      const mtnStatus = gateErr.mtnStatus || gateErr.httpStatus;
      const msg = String(gateErr.message || '');
      const transient =
        !!gateErr.networkError
        || mtnStatus === 429
        || (mtnStatus >= 500 && mtnStatus < 600)
        || /timeout|ECONNRESET|ENOTFOUND|ETIMEDOUT|ECONNREFUSED|socket/i.test(msg);
      if (transient) {
        return res.json({
          success: true,
          data: {
            phase: 'awaiting_device',
            mtn_status: 'PENDING',
            status_check_deferred: true,
            message: 'Could not reach MTN yet; payment may still complete on your phone.',
          },
        });
      }
      return res.status(502).json({
        success: false,
        message: gateErr.message || 'MTN status check failed',
      });
    }

    const cls = classifyTeacherDealMtnStatus(stData, mtnMomo);
    if (cls.kind === 'ok') {
      const clean = stripTeacherDealMtnPendingFields(payload);
      await promisePool.query(
        `UPDATE shule_avance_teacher_deal_pay_tokens SET consumed = 1, payload_json = ? WHERE token = ?`,
        [JSON.stringify(clean), token]
      );
      return res.json({
        success: true,
        data: {
          phase: 'complete',
          mtn_status: 'SUCCESSFUL',
          order_number: orderNumber,
          amount_rwf: amount,
          message: 'Payment successful.',
        },
      });
    }

    if (cls.kind === 'fail') {
      const clean = stripTeacherDealMtnPendingFields(payload);
      await promisePool.query(
        `UPDATE shule_avance_teacher_deal_pay_tokens SET payload_json = ? WHERE token = ?`,
        [JSON.stringify(clean), token]
      );
      return res.json({
        success: true,
        data: {
          phase: 'failed',
          mtn_status: cls.providerStatus,
          payment_failed: true,
          order_number: orderNumber,
          message: 'This payment was declined or cancelled on the phone. You can try again.',
        },
      });
    }

    return res.json({
      success: true,
      data: {
        phase: 'awaiting_device',
        mtn_status: 'PENDING',
        message: 'Waiting for approval on your phone.',
      },
    });
  } catch (error) {
    console.error('[teacher-deal-pay-momo-status]', error.message);
    res.status(500).json({ success: false, message: error.message || 'Status check failed' });
  }
});

const TEACHER_DEAL_PORTAL_ROLES = ['SUPER_ADMIN', 'FULL_SYSTEM_CONTROLLER', 'AGENT'];

function requireTeacherDealPortal(req, res, next) {
  const userId = resolveUserId(req);
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Not authenticated' });
  }
  const rc = toRoleCode(req);
  if (!TEACHER_DEAL_PORTAL_ROLES.includes(rc)) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }
  req.teacherDealPortal = { userId, roleCode: rc };
  next();
}

function parseJsonSafe(s, fallback = {}) {
  try {
    return typeof s === 'string' ? JSON.parse(s) : s && typeof s === 'object' ? s : fallback;
  } catch {
    return fallback;
  }
}

function teacherDealPayloadMatchesAgent(payload, agentRow) {
  if (!agentRow) return false;
  const prov = String(payload.province || '').trim();
  const dist = String(payload.district || '').trim();
  const sec = String(payload.sector || '').trim();
  if (!prov || !dist) return false;
  if (String(agentRow.province || '').trim() !== prov || String(agentRow.district || '').trim() !== dist) {
    return false;
  }
  if (Number(agentRow.all_sectors) === 1) return true;
  let sectors = [];
  try {
    sectors =
      typeof agentRow.sectors_json === 'string'
        ? JSON.parse(agentRow.sectors_json || '[]')
        : agentRow.sectors_json || [];
  } catch {
    sectors = [];
  }
  if (!Array.isArray(sectors)) sectors = [];
  if (!sec) return true;
  return sectors.map((x) => String(x).trim()).includes(sec);
}

/**
 * Super Admin / Full Controller: all teacher-deal pay sessions & alt-payment intents.
 * Agent: same rows filtered by province/district (+ optional sector) vs agent profile.
 */
router.get('/shule-avance/portal/teacher-deal-payment-requests', requireTeacherDealPortal, async (req, res) => {
  try {
    await ensureTeacherDealPayTokensTable();
    await ensureTeacherDealAltIntentsTable();

    const { userId, roleCode } = req.teacherDealPortal || {};
    let agentProfile = null;
    if (roleCode === 'AGENT') {
      const [[row]] = await promisePool.query(
        `SELECT province, district, all_sectors, sectors_json
         FROM field_agent_profiles WHERE user_id = ? LIMIT 1`,
        [userId]
      );
      agentProfile = row || null;
    }

    const [tokenRows] = await promisePool.query(
      `SELECT token, payload_json, teacher_user_id, consumed, expires_at, created_at
       FROM shule_avance_teacher_deal_pay_tokens
       ORDER BY created_at DESC
       LIMIT 400`
    );

    const [intentRows] = await promisePool.query(
      `SELECT id, token, channel, payload_json, created_at
       FROM shule_avance_teacher_deal_pay_alt_intents
       ORDER BY created_at DESC
       LIMIT 400`
    );

    const teacherIds = [...new Set(tokenRows.map((r) => Number(r.teacher_user_id)).filter(Boolean))];
    let teacherMap = {};
    if (teacherIds.length) {
      const [uRows] = await promisePool.query(
        `SELECT id, first_name, last_name, email FROM users WHERE id IN (${teacherIds.map(() => '?').join(',')})`,
        teacherIds
      );
      teacherMap = Object.fromEntries(
        uRows.map((u) => [
          u.id,
          {
            id: u.id,
            name: `${u.first_name || ''} ${u.last_name || ''}`.trim(),
            email: u.email || null,
          },
        ])
      );
    }

    const schoolIds = [];
    for (const r of tokenRows) {
      const p = parseJsonSafe(r.payload_json);
      if (p.school_id) schoolIds.push(Number(p.school_id));
    }
    const uniqSchools = [...new Set(schoolIds.filter(Boolean))];
    let schoolMap = {};
    if (uniqSchools.length) {
      const [sRows] = await promisePool.query(
        `SELECT id, school_name FROM schools WHERE id IN (${uniqSchools.map(() => '?').join(',')})`,
        uniqSchools
      );
      schoolMap = Object.fromEntries(sRows.map((s) => [s.id, s.school_name]));
    }

    const out = [];

    for (const r of tokenRows) {
      const p = parseJsonSafe(r.payload_json);
      const row = {
        kind: 'pay_session',
        token: r.token,
        created_at: r.created_at,
        expires_at: r.expires_at,
        consumed: !!Number(r.consumed),
        amount_rwf: p.amount_rwf != null ? Number(p.amount_rwf) : null,
        product_name: p.product_name || null,
        deal_product_id: p.deal_product_id || null,
        payer_name: p.payer_name || null,
        payer_phone: p.payer_phone || p.payer_msisdn || null,
        province: p.province || null,
        district: p.district || null,
        sector: p.sector || null,
        delivery_method: p.delivery_method || null,
        agent_user_id: p.agent_user_id || null,
        school_id: p.school_id || null,
        school_name: p.school_id ? schoolMap[Number(p.school_id)] || null : null,
        teacher: teacherMap[r.teacher_user_id] || null,
        mtn_status: p.mtn_status || p.mtn_last_status || null,
      };
      if (roleCode === 'AGENT') {
        if (!agentProfile || !teacherDealPayloadMatchesAgent(p, agentProfile)) continue;
      }
      out.push(row);
    }

    for (const r of intentRows) {
      const p = parseJsonSafe(r.payload_json);
      const row = {
        kind: 'payment_intent',
        intent_id: r.id,
        channel: r.channel || p.channel || null,
        token: r.token,
        created_at: r.created_at,
        payer_hint: p.account_holder || p.phone || p.cardholder || null,
        bank_name: p.bank_name || null,
        bank_code: p.bank_code || null,
        babyeyi_account_number: p.babyeyi_account_number || null,
        province: p.province || null,
        district: p.district || null,
        sector: p.sector || null,
        transfer_note: p.transfer_note || null,
        bank_reference: p.bank_reference || null,
      };
      if (roleCode === 'AGENT') {
        if (!agentProfile || !teacherDealPayloadMatchesAgent(p, agentProfile)) continue;
      }
      out.push(row);
    }

    out.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return res.json({ success: true, data: out });
  } catch (error) {
    console.error('[teacher-deal-payment-requests]', error.message);
    res.status(500).json({ success: false, message: error.message || 'Failed to load requests' });
  }
});

router.use(authGuard);
router.use(async (_req, res, next) => {
  try {
    await ensureTable();
    await ensureWebPushTable();
    next();
  } catch (error) {
    console.error('[shule-avance] ensureTable failed:', error.message);
    res.status(500).json({ success: false, message: 'Failed to initialize ShuleAvance storage' });
  }
});

// Applicant CRUD (teachers, HOD, DOS, accountants)
router.get('/shule-avance/applicant/eligibility', requireRole(APPLICANT_ROLES), handleApplicantEligibility);
router.get('/shule-avance/applicant/my-requests', requireRole(APPLICANT_ROLES), handleApplicantList);
router.post('/shule-avance/applicant/requests', requireRole(APPLICANT_ROLES), handleApplicantCreate);
router.put('/shule-avance/applicant/requests/:id', requireRole(APPLICANT_ROLES), handleApplicantUpdate);
router.delete('/shule-avance/applicant/requests/:id', requireRole(APPLICANT_ROLES), handleApplicantDelete);

router.get('/shule-avance/applicant/push/vapid-key', requireRole(APPLICANT_ROLES), (req, res) => {
  const ok = isWebPushConfigured();
  const publicKey = getVapidPublicKey();
  res.json({
    success: ok && !!publicKey,
    configured: ok && !!publicKey,
    publicKey: ok ? publicKey : null,
    message: ok ? undefined : 'Server Web Push (VAPID) is not configured',
  });
});

router.post('/shule-avance/applicant/push/subscribe', requireRole(APPLICANT_ROLES), async (req, res) => {
  try {
    if (!isWebPushConfigured()) {
      return res.status(503).json({ success: false, message: 'Web Push is not configured on this server' });
    }
    const userId = req.ctx.userId;
    await upsertSubscription(userId, req.body);
    res.json({ success: true, message: 'Push subscription saved' });
  } catch (error) {
    console.error('[shule-avance] push subscribe:', error.message);
    const status = error.status === 400 ? 400 : 500;
    res.status(status).json({ success: false, message: error.message || 'Failed to save subscription' });
  }
});

router.post('/shule-avance/applicant/push/unsubscribe', requireRole(APPLICANT_ROLES), async (req, res) => {
  try {
    const endpoint = req.body?.endpoint;
    await removeSubscription(req.ctx.userId, endpoint);
    res.json({ success: true, message: 'Subscription removed' });
  } catch (error) {
    console.error('[shule-avance] push unsubscribe:', error.message);
    res.status(500).json({ success: false, message: 'Failed to remove subscription' });
  }
});

router.get('/shule-avance/teacher/my-requests', requireRole(APPLICANT_ROLES), handleApplicantList);
router.post('/shule-avance/teacher/requests', requireRole(APPLICANT_ROLES), handleApplicantCreate);
router.put('/shule-avance/teacher/requests/:id', requireRole(APPLICANT_ROLES), handleApplicantUpdate);
router.delete('/shule-avance/teacher/requests/:id', requireRole(APPLICANT_ROLES), handleApplicantDelete);

/** Creates a one-time token; teacher portal redirects to main app /payments?tdt=... */
router.post('/shule-avance/applicant/teacher-deal-pay-token', requireRole(APPLICANT_ROLES), async (req, res) => {
  try {
    await ensureTeacherDealPayTokensTable();
    const body = req.body || {};
    const dealProductId = parseInt(body.deal_product_id, 10);
    const qty = Math.max(1, parseInt(body.quantity, 10) || 1);
    const agentUserId = body.agent_user_id != null ? parseInt(body.agent_user_id, 10) : null;
    const payerName = String(body.payer_name || '').trim();
    const payerPhone = String(body.payer_phone || '').trim();
    const province = String(body.province || '').trim();
    const district = String(body.district || '').trim();
    const sector = String(body.sector || '').trim();
    const deliveryMethod = String(body.delivery_method || '').trim();
    const homeLocation = String(body.home_location || '').trim();
    const village = String(body.village || '').trim();
    const cell = String(body.cell || '').trim();
    const streetNumber = String(body.street_number || '').trim();

    if (!dealProductId || !payerName || !payerPhone) {
      return res.status(400).json({ success: false, message: 'deal_product_id, payer_name, and payer_phone are required' });
    }
    const msisdn = toMsisdn250Deal(payerPhone);
    if (!msisdn) {
      return res.status(400).json({ success: false, message: 'Enter a valid Rwanda MTN number for the payer' });
    }

    const [[product]] = await promisePool.query(
      `SELECT id, name, price_rwf, image_url FROM shule_avance_teacher_deal_products
       WHERE id = ? AND deleted_at IS NULL AND is_active = 1 LIMIT 1`,
      [dealProductId]
    );
    if (!product) {
      return res.status(404).json({ success: false, message: 'Deal product not found' });
    }

    const amount_rwf = Math.round(Number(product.price_rwf) * qty);
    if (amount_rwf < 100) {
      return res.status(400).json({ success: false, message: 'Invalid amount' });
    }

    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 20 * 60 * 1000);

    const payload = {
      deal_product_id: dealProductId,
      product_name: product.name,
      quantity: qty,
      amount_rwf,
      image_url: product.image_url || null,
      agent_user_id: Number.isFinite(agentUserId) ? agentUserId : null,
      payer_name: payerName,
      payer_phone: payerPhone,
      payer_msisdn: msisdn,
      province,
      district,
      sector,
      delivery_method: deliveryMethod,
      home_location: homeLocation || null,
      village: village || null,
      cell: cell || null,
      street_number: streetNumber || null,
      teacher_user_id: req.ctx.userId,
      school_id: req.ctx.schoolId,
    };

    await promisePool.query(
      `INSERT INTO shule_avance_teacher_deal_pay_tokens (token, payload_json, teacher_user_id, expires_at)
       VALUES (?,?,?,?)`,
      [token, JSON.stringify(payload), req.ctx.userId, expiresAt]
    );

    return res.json({
      success: true,
      data: {
        token,
        expires_at: expiresAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('[teacher-deal-pay-token]', error.message);
    res.status(500).json({ success: false, message: 'Could not start payment session' });
  }
});

// Accountant: finance queue (all school requests from staff)
router.get('/shule-avance/finance/requests', requireRole(ROLE_ACCOUNTANT), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const raw = String(req.query?.status || 'all').toLowerCase();
    const allowed = [
      'all',
      STATUS.PENDING_ACCOUNTANT,
      STATUS.SENT_TO_MANAGER,
      STATUS.APPROVED,
      'rejected',
    ];
    if (!allowed.includes(raw)) {
      return res.status(400).json({ success: false, message: 'Invalid status filter' });
    }

    let where = 'r.school_id = ?';
    const params = [schoolId];
    if (raw === STATUS.PENDING_ACCOUNTANT) {
      where += ' AND r.status = ?';
      params.push(STATUS.PENDING_ACCOUNTANT);
    } else if (raw === STATUS.SENT_TO_MANAGER) {
      where += ' AND r.status = ?';
      params.push(STATUS.SENT_TO_MANAGER);
    } else if (raw === STATUS.APPROVED) {
      where += ' AND r.status = ?';
      params.push(STATUS.APPROVED);
    } else if (raw === 'rejected') {
      where += ' AND r.status IN (?, ?)';
      params.push(STATUS.REJECTED_BY_ACCOUNTANT, STATUS.REJECTED_BY_MANAGER);
    }

    const [rows] = await promisePool.query(
      `SELECT ${ROW_SELECT},
              TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))) AS staff_name,
              u.email AS staff_email,
              COALESCE(rl.role_code, '') AS submitter_role_code
       FROM shule_avance_requests r
       LEFT JOIN users u ON u.id = r.teacher_user_id
       LEFT JOIN roles rl ON rl.id = u.role_id
       WHERE ${where}
       ORDER BY r.id DESC`,
      params
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('[shule-avance] finance requests:', error.message);
    res.status(500).json({ success: false, message: 'Failed to load requests' });
  }
});

router.get('/shule-avance/finance/pending-invoices', requireRole(ROLE_ACCOUNTANT), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const [rows] = await promisePool.query(
      `SELECT ${ROW_SELECT},
              TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))) AS staff_name,
              u.email AS staff_email,
              COALESCE(rl.role_code, '') AS submitter_role_code
       FROM shule_avance_requests r
       LEFT JOIN users u ON u.id = r.teacher_user_id
       LEFT JOIN roles rl ON rl.id = u.role_id
       WHERE r.school_id = ? AND r.status = ?
       ORDER BY r.id DESC`,
      [schoolId, STATUS.PENDING_ACCOUNTANT]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('[shule-avance] finance pending:', error.message);
    res.status(500).json({ success: false, message: 'Failed to load pending finance queue' });
  }
});

router.patch('/shule-avance/finance/invoice-requests/:id/send-to-manager', requireRole(ROLE_ACCOUNTANT), async (req, res) => {
  try {
    const { schoolId, userId } = req.ctx;
    const id = Number(req.params.id);
    const note = String(req.body?.note || req.body?.comment || '').trim();
    if (!id) return res.status(400).json({ success: false, message: 'Invalid request id' });

    const [before] = await promisePool.query(
      `SELECT teacher_user_id FROM shule_avance_requests
       WHERE id = ? AND school_id = ? AND status = ? LIMIT 1`,
      [id, schoolId, STATUS.PENDING_ACCOUNTANT]
    );
    if (!before?.length) {
      return res.status(400).json({ success: false, message: 'Request not found or already handled' });
    }
    const teacherUserId = Number(before[0].teacher_user_id);

    const [result] = await promisePool.query(
      `UPDATE shule_avance_requests
       SET status = ?, accountant_note = ?, accountant_reviewed_at = NOW(), accountant_reviewed_by = ?
       WHERE id = ? AND school_id = ? AND status = ?`,
      [STATUS.SENT_TO_MANAGER, note || null, userId, id, schoolId, STATUS.PENDING_ACCOUNTANT]
    );
    if (!result.affectedRows) {
      return res.status(400).json({ success: false, message: 'Request not found or already handled' });
    }
    res.json({ success: true, message: 'Request sent to school manager for decision' });

    // Notify the teacher their request has been forwarded
    if (Number.isFinite(teacherUserId) && teacherUserId > 0) {
      const isPro = await isSchoolProEnabled(schoolId);
      const staffPortalUrl = staffShuleAvancePortalPath(isPro);
      setImmediate(() => {
        sendWebPushToUser(teacherUserId, {
          title: 'Ticha Avance',
          body: `Request #${id} was sent to your school manager for review.`,
          tag: `sa-${id}-to-manager`,
          url: staffPortalUrl,
        }).catch((e) => console.warn('[shule-avance] web push send:', e.message));
      });
    }
    // Notify all school managers that action is required
    setImmediate(() => {
      sendWebPushToSchoolRoles(schoolId, MANAGER_ROLES, {
        title: 'Ticha Avance — Approval Required',
        body: `Finance forwarded request #${id} to you for final approval.`,
        tag: `sa-${id}-manager-action`,
        url: '/avance',
      });
    });
  } catch (error) {
    console.error('[shule-avance] finance send-to-manager:', error.message);
    res.status(500).json({ success: false, message: 'Failed to send request to manager' });
  }
});

router.patch('/shule-avance/finance/invoice-requests/:id/reject', requireRole(ROLE_ACCOUNTANT), async (req, res) => {
  try {
    const { schoolId, userId } = req.ctx;
    const id = Number(req.params.id);
    const note = String(req.body?.note || '').trim();
    if (!id) return res.status(400).json({ success: false, message: 'Invalid request id' });

    const [result] = await promisePool.query(
      `UPDATE shule_avance_requests
       SET status = ?, accountant_note = ?, accountant_reviewed_at = NOW(), accountant_reviewed_by = ?
       WHERE id = ? AND school_id = ? AND status = ?`,
      [STATUS.REJECTED_BY_ACCOUNTANT, note || null, userId, id, schoolId, STATUS.PENDING_ACCOUNTANT]
    );
    if (!result.affectedRows) {
      return res.status(400).json({ success: false, message: 'Request not found or already handled' });
    }
    res.json({ success: true, message: 'Request rejected' });
  } catch (error) {
    console.error('[shule-avance] finance reject:', error.message);
    res.status(500).json({ success: false, message: 'Failed to reject request' });
  }
});

const MANAGER_REQUEST_JOINS = `
       FROM shule_avance_requests r
       LEFT JOIN users u ON u.id = r.teacher_user_id
       LEFT JOIN roles rl ON rl.id = u.role_id`;

function buildManagerRequestsWhere(schoolId, query = {}) {
  let where = 'r.school_id = ?';
  const params = [schoolId];
  const raw = String(query?.status || 'needs_action').toLowerCase();
  const requestType = String(query?.request_type || 'all').toLowerCase();
  const search = String(query?.q || query?.search || '').trim();
  const dateFrom = String(query?.date_from || '').trim();
  const dateTo = String(query?.date_to || '').trim();
  const exceedsCap = String(query?.exceeds_cap || 'all').toLowerCase();

  if (raw === 'sent_to_manager' || raw === 'pending') {
    where += ' AND r.status = ?';
    params.push(STATUS.SENT_TO_MANAGER);
  } else if (raw === 'pending_accountant' || raw === 'finance') {
    where += ' AND r.status = ?';
    params.push(STATUS.PENDING_ACCOUNTANT);
  } else if (raw === 'awaiting' || raw === 'needs_action') {
    where += ' AND r.status IN (?, ?)';
    params.push(STATUS.PENDING_ACCOUNTANT, STATUS.SENT_TO_MANAGER);
  } else if (raw === STATUS.APPROVED || raw === 'approved') {
    where += ' AND r.status = ?';
    params.push(STATUS.APPROVED);
  } else if (raw === 'rejected') {
    where += ' AND r.status IN (?, ?)';
    params.push(STATUS.REJECTED_BY_MANAGER, STATUS.REJECTED_BY_ACCOUNTANT);
  } else if (raw === 'auto_approved') {
    where += ' AND r.auto_approved = 1 AND r.status = ?';
    params.push(STATUS.APPROVED);
  } else if (raw !== 'all') {
    where += ' AND r.status = ?';
    params.push(STATUS.SENT_TO_MANAGER);
  }

  if (requestType === 'cashout' || requestType === 'service') {
    where += ' AND r.request_type = ?';
    params.push(requestType);
  }

  if (search) {
    where += ` AND (
      CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) LIKE ?
      OR u.email LIKE ?
      OR CAST(r.id AS CHAR) LIKE ?
    )`;
    const like = `%${search}%`;
    params.push(like, like, like);
  }

  if (dateFrom) {
    where += ' AND DATE(COALESCE(r.submitted_at, r.created_at)) >= ?';
    params.push(dateFrom);
  }
  if (dateTo) {
    where += ' AND DATE(COALESCE(r.submitted_at, r.created_at)) <= ?';
    params.push(dateTo);
  }

  if (exceedsCap === '1' || exceedsCap === 'yes' || exceedsCap === 'true') {
    where += ' AND COALESCE(r.exceeds_monthly_cap, 0) = 1';
  } else if (exceedsCap === '0' || exceedsCap === 'no' || exceedsCap === 'false') {
    where += ' AND COALESCE(r.exceeds_monthly_cap, 0) = 0';
  }

  return { where, params, filters: { raw, requestType, search, dateFrom, dateTo, exceedsCap } };
}

// Manager: list all advances with filters (status, type, dates, search)
router.get('/shule-avance/manager/requests', requireRole(MANAGER_ROLES), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const { where, params } = buildManagerRequestsWhere(schoolId, req.query);
    const sort = String(req.query?.sort || 'newest').toLowerCase();
    const orderBy =
      sort === 'oldest' ? 'r.id ASC' :
      sort === 'amount_high' ? 'r.amount_rwf DESC, r.id DESC' :
      sort === 'amount_low' ? 'r.amount_rwf ASC, r.id DESC' :
      'r.id DESC';

    const [rows] = await promisePool.query(
      `SELECT ${ROW_SELECT},
              TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))) AS staff_name,
              u.email AS staff_email,
              COALESCE(rl.role_code, '') AS submitter_role_code
       ${MANAGER_REQUEST_JOINS}
       WHERE ${where}
       ORDER BY ${orderBy}`,
      params
    );
    res.json({ success: true, data: rows, count: rows.length });
  } catch (error) {
    console.error('[shule-avance] manager requests:', error.message);
    res.status(500).json({ success: false, message: 'Failed to load manager queue' });
  }
});

// Manager: aggregated reports for dashboard & exports (same filters as list)
router.get('/shule-avance/manager/reports/summary', requireRole(MANAGER_ROLES), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const { where, params } = buildManagerRequestsWhere(schoolId, req.query);

    const [[totals]] = await promisePool.query(
      `SELECT
          COUNT(*) AS total_count,
          COALESCE(SUM(r.amount_rwf), 0) AS total_amount_rwf,
          SUM(CASE WHEN r.status IN (?, ?) THEN 1 ELSE 0 END) AS pending_count,
          COALESCE(SUM(CASE WHEN r.status IN (?, ?) THEN r.amount_rwf ELSE 0 END), 0) AS pending_amount_rwf,
          SUM(CASE WHEN r.status = ? THEN 1 ELSE 0 END) AS approved_count,
          COALESCE(SUM(CASE WHEN r.status = ? THEN r.amount_rwf ELSE 0 END), 0) AS approved_amount_rwf,
          SUM(CASE WHEN r.status IN (?, ?) THEN 1 ELSE 0 END) AS rejected_count,
          COALESCE(SUM(CASE WHEN r.status IN (?, ?) THEN r.amount_rwf ELSE 0 END), 0) AS rejected_amount_rwf,
          SUM(CASE WHEN COALESCE(r.exceeds_monthly_cap, 0) = 1 THEN 1 ELSE 0 END) AS over_limit_count,
          SUM(CASE WHEN COALESCE(r.auto_approved, 0) = 1 THEN 1 ELSE 0 END) AS auto_approved_count
       ${MANAGER_REQUEST_JOINS}
       WHERE ${where}`,
      [
        STATUS.PENDING_ACCOUNTANT,
        STATUS.SENT_TO_MANAGER,
        STATUS.PENDING_ACCOUNTANT,
        STATUS.SENT_TO_MANAGER,
        STATUS.APPROVED,
        STATUS.APPROVED,
        STATUS.REJECTED_BY_MANAGER,
        STATUS.REJECTED_BY_ACCOUNTANT,
        STATUS.REJECTED_BY_MANAGER,
        STATUS.REJECTED_BY_ACCOUNTANT,
        ...params,
      ]
    );

    const [byStatus] = await promisePool.query(
      `SELECT r.status, COUNT(*) AS count, COALESCE(SUM(r.amount_rwf), 0) AS amount_rwf
       ${MANAGER_REQUEST_JOINS}
       WHERE ${where}
       GROUP BY r.status
       ORDER BY count DESC`,
      params
    );

    const [byType] = await promisePool.query(
      `SELECT COALESCE(r.request_type, 'service') AS request_type,
              COUNT(*) AS count,
              COALESCE(SUM(r.amount_rwf), 0) AS amount_rwf
       ${MANAGER_REQUEST_JOINS}
       WHERE ${where}
       GROUP BY COALESCE(r.request_type, 'service')
       ORDER BY count DESC`,
      params
    );

    const [byMonth] = await promisePool.query(
      `SELECT DATE_FORMAT(COALESCE(r.submitted_at, r.created_at), '%Y-%m') AS month_key,
              COUNT(*) AS count,
              COALESCE(SUM(r.amount_rwf), 0) AS amount_rwf
       ${MANAGER_REQUEST_JOINS}
       WHERE ${where}
       GROUP BY DATE_FORMAT(COALESCE(r.submitted_at, r.created_at), '%Y-%m')
       ORDER BY month_key DESC
       LIMIT 12`,
      params
    );

    const [byRole] = await promisePool.query(
      `SELECT COALESCE(rl.role_code, 'UNKNOWN') AS role_code,
              COUNT(*) AS count,
              COALESCE(SUM(r.amount_rwf), 0) AS amount_rwf
       ${MANAGER_REQUEST_JOINS}
       WHERE ${where}
       GROUP BY COALESCE(rl.role_code, 'UNKNOWN')
       ORDER BY count DESC
       LIMIT 20`,
      params
    );

    res.json({
      success: true,
      data: {
        totals: totals || {},
        by_status: byStatus || [],
        by_type: byType || [],
        by_month: (byMonth || []).reverse(),
        by_role: byRole || [],
        generated_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[shule-avance] manager reports:', error.message);
    res.status(500).json({ success: false, message: 'Failed to load reports' });
  }
});

router.get('/shule-avance/manager/pending-requests', requireRole(MANAGER_ROLES), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const [rows] = await promisePool.query(
      `SELECT ${ROW_SELECT},
              TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))) AS staff_name,
              u.email AS staff_email,
              COALESCE(rl.role_code, '') AS submitter_role_code
       FROM shule_avance_requests r
       LEFT JOIN users u ON u.id = r.teacher_user_id
       LEFT JOIN roles rl ON rl.id = u.role_id
       WHERE r.school_id = ? AND r.status = ?
       ORDER BY r.id DESC`,
      [schoolId, STATUS.SENT_TO_MANAGER]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('[shule-avance] manager pending:', error.message);
    res.status(500).json({ success: false, message: 'Failed to load manager queue' });
  }
});

router.patch('/shule-avance/manager/invoice-requests/:id/decision', requireRole(MANAGER_ROLES), async (req, res) => {
  try {
    const { schoolId, userId } = req.ctx;
    const id = Number(req.params.id);
    const decision = String(req.body?.decision || '').toLowerCase();
    const feedback = String(req.body?.feedback || req.body?.comment || '').trim();
    if (!id) return res.status(400).json({ success: false, message: 'Invalid request id' });
    if (!['approved', 'rejected'].includes(decision)) {
      return res.status(400).json({ success: false, message: 'decision must be approved or rejected' });
    }

    const isPro = await isSchoolProEnabled(schoolId);
    const statusFilter = isPro
      ? [STATUS.SENT_TO_MANAGER]
      : [STATUS.SENT_TO_MANAGER, STATUS.PENDING_ACCOUNTANT];
    const placeholders = statusFilter.map(() => '?').join(', ');

    const [before] = await promisePool.query(
      `SELECT teacher_user_id, status FROM shule_avance_requests
       WHERE id = ? AND school_id = ? AND status IN (${placeholders}) LIMIT 1`,
      [id, schoolId, ...statusFilter]
    );
    if (!before?.length) {
      return res.status(400).json({ success: false, message: 'Request not found or already handled' });
    }
    const teacherUserId = Number(before[0].teacher_user_id);
    const priorStatus = before[0].status;

    const nextStatus = decision === 'approved' ? STATUS.APPROVED : STATUS.REJECTED_BY_MANAGER;
    const [result] = await promisePool.query(
      `UPDATE shule_avance_requests
       SET status = ?, manager_feedback = ?, manager_reviewed_at = NOW(), manager_reviewed_by = ?
       WHERE id = ? AND school_id = ? AND status = ?`,
      [nextStatus, feedback || null, userId, id, schoolId, priorStatus]
    );
    if (!result.affectedRows) {
      return res.status(400).json({ success: false, message: 'Request not found or already handled' });
    }
    res.json({ success: true, message: decision === 'approved' ? 'Request approved' : 'Request rejected' });

    if (Number.isFinite(teacherUserId) && teacherUserId > 0) {
      const isPro = await isSchoolProEnabled(schoolId);
      const staffPortalUrl = staffShuleAvancePortalPath(isPro);
      if (decision === 'approved') {
        setImmediate(() => {
          sendWebPushToUser(teacherUserId, {
            title: 'Ticha Avance',
            body: `Request #${id} was approved by your school manager.`,
            tag: `sa-${id}-approved`,
            url: staffPortalUrl,
          }).catch((e) => console.warn('[shule-avance] web push send:', e.message));
        });
      } else if (decision === 'rejected') {
        setImmediate(() => {
          sendWebPushToUser(teacherUserId, {
            title: 'Ticha Avance',
            body: `Request #${id} was not approved by your school manager.`,
            tag: `sa-${id}-rejected`,
            url: staffPortalUrl,
          }).catch((e) => console.warn('[shule-avance] web push send:', e.message));
        });
      }
    }
  } catch (error) {
    console.error('[shule-avance] manager decision:', error.message);
    res.status(500).json({ success: false, message: 'Failed to save manager decision' });
  }
});

// Legacy endpoints
router.get('/shule-avance/status', async (req, res) => {
  try {
    const { schoolId, userId } = req.ctx;
    const [rows] = await promisePool.query(
      `SELECT id, amount_rwf AS amount_requested, repayment_term_months, purpose, status, submitted_at AS created_at,
              request_type, service_category, details, vendor_label, cashout_reason, cashout_category_slug,
              accountant_note, manager_feedback, deal_product_ids_json, deal_products_snapshot_json, deal_products_total_rwf
       FROM shule_avance_requests
       WHERE school_id = ? AND teacher_user_id = ?
       ORDER BY id DESC`,
      [schoolId, userId]
    );
    const active = rows.find((r) =>
      [STATUS.PENDING_ACCOUNTANT, STATUS.SENT_TO_MANAGER].includes(r.status)
    );
    res.json({
      success: true,
      has_active_application: !!active,
      active_loan: active || null,
      history: rows,
    });
  } catch (error) {
    console.error('[shule-avance] legacy status:', error.message);
    res.status(500).json({ success: false, message: 'Failed to load status' });
  }
});

router.post('/shule-avance/apply', requireRole(LEGACY_APPLICANT_ROLES), async (req, res) => {
  try {
    await ensureShuleAvanceTeacherCatalogTable();
    const maps = await fetchActiveCatalogMaps();
    const firstCash = maps.cashoutsBySlug.keys().next().value;
    if (!firstCash) {
      return res.status(400).json({ success: false, message: 'No cashout types configured' });
    }
    req.body = {
      ...req.body,
      request_type: 'cashout',
      cashout_category: req.body?.cashout_category || req.body?.cashout_category_slug || firstCash,
      reason: req.body?.reason || req.body?.purpose,
      description: req.body?.details,
    };
    return handleApplicantCreate(req, res);
  } catch (error) {
    console.error('[shule-avance] legacy apply:', error.message);
    res.status(500).json({ success: false, message: 'Failed to submit request' });
  }
});

router.delete('/shule-avance/cancel/:id', requireRole(APPLICANT_ROLES), (req, res) =>
  handleApplicantDelete(req, res)
);

module.exports = router;
