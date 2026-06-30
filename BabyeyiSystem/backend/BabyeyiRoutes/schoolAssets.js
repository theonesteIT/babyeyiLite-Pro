// ================================================================
// schoolAssets.js — School fixed-asset register (Assets Manager portal)
//
//   GET    /api/school/assets/meta
//   GET    /api/school/assets/dashboard
//   GET    /api/school/assets
//   GET    /api/school/assets/:id
//   POST   /api/school/assets
//   PATCH  /api/school/assets/:id
//   DELETE /api/school/assets/:id
// ================================================================

const express = require('express');
const { promisePool } = require('../config/database');
const { requireRole } = require('../middleware/deoAuth');

function buildQrValue(row) {
  const code = trimStr(row?.asset_code || '');
  const tag = trimStr(row?.label_tag || '');
  const serial = trimStr(row?.serial_number || '');
  const id = row?.id != null ? String(row.id) : '';
  return `CODE:${code}|TAG:${tag}|SN:${serial}|ID:${id}`;
}

const router = express.Router();

const ASSETS_READ_ROLES = [
  'ASSETS_MANAGER', 'ASSET_MANAGER', 'SCHOOL_ADMIN', 'SCHOOL_MANAGER', 'DOS', 'ACCOUNTANT',
  'SUPER_ADMIN', 'FULL_SYSTEM_CONTROLLER',
];
const ASSETS_WRITE_ROLES = [
  'ASSETS_MANAGER', 'ASSET_MANAGER', 'SCHOOL_ADMIN', 'SCHOOL_MANAGER', 'DOS',
  'SUPER_ADMIN', 'FULL_SYSTEM_CONTROLLER',
];

const DEFAULT_CATEGORIES = [
  'IT Equipment', 'Furniture', 'Vehicles', 'Electronics', 'Machinery', 'Laboratory Equipment',
  'Buildings', 'Land', 'Office Equipment',
];

let tablesReady = false;
let assignmentsTableReady = false;
let maintenanceTableReady = false;
let transfersTableReady = false;
let replacementsTableReady = false;
let categoriesTableReady = false;
let financialYearsTableReady = false;

const DEFAULT_CATEGORY_SEEDS = [
  { name: 'IT Equipment', icon: 'Monitor', description: 'Computers, laptops, printers, servers', depreciation_rate: 25 },
  { name: 'Furniture', icon: 'Armchair', description: 'Desks, chairs, cabinets, tables', depreciation_rate: 10 },
  { name: 'Vehicles', icon: 'Car', description: 'Cars, trucks, vans, motorcycles', depreciation_rate: 20 },
  { name: 'Electronics', icon: 'Smartphone', description: 'Phones, cameras, projectors', depreciation_rate: 25 },
  { name: 'Machinery', icon: 'Wrench', description: 'Industrial and workshop machinery', depreciation_rate: 15 },
  { name: 'Laboratory Equipment', icon: 'FlaskConical', description: 'Microscopes, lab instruments', depreciation_rate: 15 },
  { name: 'Buildings', icon: 'Building2', description: 'Structures and facilities', depreciation_rate: 5 },
  { name: 'Land', icon: 'LandPlot', description: 'Land parcels and plots', depreciation_rate: 0 },
  { name: 'Office Equipment', icon: 'Boxes', description: 'General office assets', depreciation_rate: 20 },
];

function parseDepreciationRate(body) {
  const raw = body?.depreciation_rate ?? body?.depreciationRate;
  if (raw === undefined || raw === null || raw === '') return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || n > 100) return null;
  return n;
}

const VALID_CATEGORY_ICONS = [
  'Monitor', 'Armchair', 'Car', 'Building2', 'Smartphone', 'FlaskConical', 'Boxes', 'Wrench', 'LandPlot',
];

const TRANSFER_REASONS = [
  'Reallocation',
  'Department Transfer',
  'New Assignment',
  'Maintenance',
  'Upgrade',
  'Damage Replacement',
  'Relocation',
  'Other',
];

const REPLACEMENT_REASONS = [
  'Damaged', 'Obsolete', 'Lost', 'Stolen', 'Upgrade', 'End of Life', 'Beyond Repair', 'Other',
];

const REPLACEMENT_APPROVAL_ROLES = [
  'Asset Manager', 'Finance Manager', 'Principal',
];

const PURCHASE_TAX_RATE = 0.18;

const VALID_ASSETS_STATUSES = [
  'Active', 'Assigned', 'Operational', 'Deployed',
  'Idle', 'Available', 'In Storage', 'Standby', 'Unassigned',
];

const VALID_ASSET_HEALTH_STATUSES = ['Used', 'Not Used (Old)'];
const DEFAULT_ASSET_HEALTH_STATUS = 'Used';

function computePurchaseTax(unitPrice) {
  const base = toMoney(unitPrice);
  const taxAmount = Math.round(base * PURCHASE_TAX_RATE);
  return {
    tax_amount: taxAmount || null,
    price_incl_tax: base > 0 ? base + taxAmount : null,
  };
}

function trimStr(v) {
  if (v === undefined || v === null) return '';
  return String(v).trim();
}

function localDateIso() {
  const t = new Date();
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, '0');
  const d = String(t.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** DATE columns → YYYY-MM-DD string (no timezone shift in JSON). */
function toDateOnly(val) {
  if (val == null || val === '') return null;
  if (val instanceof Date && !Number.isNaN(val.getTime())) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const s = trimStr(val);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

function formatLocationValue(loc) {
  if (loc == null || loc === '') return null;
  if (typeof loc === 'string') {
    const s = trimStr(loc);
    if (s.startsWith('{') || s.startsWith('[')) {
      try {
        return formatLocationValue(JSON.parse(s));
      } catch {
        return s || null;
      }
    }
    return s || null;
  }
  if (typeof loc === 'object') {
    if (typeof loc.location === 'string') return trimStr(loc.location) || null;
    if (typeof loc.label === 'string') return trimStr(loc.label) || null;
    const first = Object.values(loc).find((v) => typeof v === 'string' && trimStr(v));
    return first ? trimStr(first) : null;
  }
  return trimStr(String(loc)) || null;
}

function toMoney(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
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
    null
  );
}

function resolveUserId(req) {
  return req.ctx?.userId || req.session?.userId || req.session?.user?.id || req.user?.id || null;
}

async function ensureAssetsTable() {
  if (tablesReady) return;
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS school_assets (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      asset_code VARCHAR(40) NOT NULL,
      asset_name VARCHAR(200) NOT NULL,
      label_tag VARCHAR(80) NULL,
      asset_type VARCHAR(32) NULL,
      category VARCHAR(120) NULL,
      description TEXT NULL,
      location VARCHAR(200) NULL,
      supplier_name VARCHAR(160) NULL,
      upi VARCHAR(80) NULL,
      sku VARCHAR(80) NULL,
      serial_number VARCHAR(120) NULL,
      brand VARCHAR(120) NULL,
      material VARCHAR(40) NULL,
      size_label VARCHAR(80) NULL,
      purchase_date DATE NULL,
      unit_price DECIMAL(14,2) NULL,
      opening_amount DECIMAL(14,2) NULL,
      invoice_number VARCHAR(80) NULL,
      funding_source VARCHAR(120) NULL,
      dep_mode VARCHAR(40) NULL,
      dep_rate DECIMAL(8,4) NULL,
      dep_years DECIMAL(8,2) NULL,
      decimal_dep DECIMAL(12,6) NULL,
      annual_dep DECIMAL(14,2) NULL,
      total_dep DECIMAL(14,2) NULL,
      net_book_value DECIMAL(14,2) NULL,
      quantity DECIMAL(14,2) NOT NULL DEFAULT 1,
      unit VARCHAR(20) NOT NULL DEFAULT 'PCS',
      condition_code VARCHAR(20) NOT NULL DEFAULT 'GOOD',
      notes TEXT NULL,
      status VARCHAR(40) NOT NULL DEFAULT 'Active',
      created_by INT UNSIGNED NULL,
      deleted_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_school_asset_code (school_id, asset_code),
      KEY idx_school_assets_school (school_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  const alters = [
    'ADD COLUMN total_balance DECIMAL(14,2) NULL AFTER opening_amount',
    'ADD COLUMN accumulated_depreciation DECIMAL(14,2) NULL DEFAULT 0 AFTER total_balance',
    'ADD COLUMN asset_type_other VARCHAR(120) NULL AFTER asset_type',
    'ADD COLUMN funding_source_other VARCHAR(120) NULL AFTER funding_source',
    'ADD COLUMN register_year SMALLINT UNSIGNED NULL AFTER status',
    'ADD COLUMN sd_number VARCHAR(80) NULL AFTER invoice_number',
    'ADD COLUMN receipt_number VARCHAR(80) NULL AFTER sd_number',
    'ADD COLUMN reference_no VARCHAR(80) NULL AFTER receipt_number',
    'ADD COLUMN tax_amount DECIMAL(14,2) NULL AFTER unit_price',
    'ADD COLUMN price_incl_tax DECIMAL(14,2) NULL AFTER tax_amount',
    'ADD COLUMN assets_status VARCHAR(40) NULL DEFAULT \'Active\' AFTER status',
    'ADD COLUMN asset_health_status VARCHAR(40) NULL DEFAULT \'Used\' AFTER assets_status',
    'ADD COLUMN location_label VARCHAR(80) NULL AFTER location',
    'ADD COLUMN replaced_by_asset_id INT UNSIGNED NULL AFTER register_year',
    'ADD COLUMN replaces_asset_id INT UNSIGNED NULL AFTER replaced_by_asset_id',
    'ADD COLUMN replacement_id INT UNSIGNED NULL AFTER replaces_asset_id',
    'ADD COLUMN warranty_start DATE NULL AFTER replacement_id',
    'ADD COLUMN warranty_end DATE NULL AFTER warranty_start',
  ];
  for (const clause of alters) {
    try {
      await promisePool.query(`ALTER TABLE school_assets ${clause}`);
    } catch (e) {
      if (e.code !== 'ER_DUP_FIELDNAME') throw e;
    }
  }
  try {
    await promisePool.query(`
      UPDATE school_assets
      SET register_year = YEAR(COALESCE(purchase_date, created_at))
      WHERE register_year IS NULL
    `);
  } catch (_) { /* column may not exist yet on first boot */ }
  try {
    await promisePool.query(`
      UPDATE school_assets SET assets_status = 'Active' WHERE assets_status IS NULL OR assets_status = ''
    `);
  } catch (_) { /* column may not exist yet on first boot */ }
  try {
    await promisePool.query(`
      UPDATE school_assets SET asset_health_status = 'Used'
      WHERE asset_health_status IS NULL OR asset_health_status = ''
    `);
  } catch (_) { /* column may not exist yet on first boot */ }
  try {
    await promisePool.query('ALTER TABLE school_assets DROP INDEX uq_school_asset_code');
  } catch (e) {
    if (e.code !== 'ER_CANT_DROP_FIELD_OR_KEY') { /* index may not exist */ }
  }
  try {
    await promisePool.query(
      'ALTER TABLE school_assets ADD UNIQUE KEY uq_school_asset_code_year (school_id, asset_code, register_year)'
    );
  } catch (e) {
    if (e.code !== 'ER_DUP_KEYNAME') throw e;
  }
  tablesReady = true;
}

async function ensureCategoriesTable() {
  if (categoriesTableReady) return;
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS school_asset_categories (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      name VARCHAR(120) NOT NULL,
      icon VARCHAR(40) NOT NULL DEFAULT 'Monitor',
      description VARCHAR(500) NULL,
      deleted_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_school_asset_category (school_id, name),
      KEY idx_sac_school (school_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  try {
    await promisePool.query(
      'ALTER TABLE school_asset_categories ADD COLUMN depreciation_rate DECIMAL(8,4) NULL AFTER description'
    );
  } catch (e) {
    if (e.code !== 'ER_DUP_FIELDNAME') throw e;
  }
  categoriesTableReady = true;
}

async function seedDefaultCategoriesIfEmpty(schoolId) {
  await ensureCategoriesTable();
  const [[row]] = await promisePool.query(
    `SELECT COUNT(*) AS c FROM school_asset_categories WHERE school_id = ? AND deleted_at IS NULL`,
    [schoolId]
  );
  if (Number(row?.c || 0) > 0) return;
  for (const seed of DEFAULT_CATEGORY_SEEDS) {
    try {
      await promisePool.query(
        `INSERT INTO school_asset_categories (school_id, name, icon, description, depreciation_rate) VALUES (?,?,?,?,?)`,
        [schoolId, seed.name, seed.icon, seed.description, seed.depreciation_rate ?? 5]
      );
    } catch (e) {
      if (e.code !== 'ER_DUP_ENTRY') throw e;
    }
  }
}

async function loadCategoriesWithCounts(schoolId) {
  await seedDefaultCategoriesIfEmpty(schoolId);
  const [rows] = await promisePool.query(
    `SELECT c.id, c.name, c.icon, c.description, c.depreciation_rate, c.created_at,
       (SELECT COUNT(*) FROM school_assets a
        WHERE a.school_id = c.school_id AND a.deleted_at IS NULL AND a.category = c.name) AS asset_count
     FROM school_asset_categories c
     WHERE c.school_id = ? AND c.deleted_at IS NULL
     ORDER BY c.name`,
    [schoolId]
  );
  return rows.map((r) => mapCategoryRow(r, Number(r.asset_count || 0)));
}

function mapCategoryRow(row, assetCount = 0) {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon || 'Monitor',
    description: row.description || '',
    depreciation_rate: row.depreciation_rate != null ? Number(row.depreciation_rate) : null,
    asset_count: assetCount,
    count: assetCount,
    created_at: row.created_at,
  };
}

async function ensureFinancialYearsTable() {
  if (financialYearsTableReady) return;
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS school_asset_financial_years (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      year SMALLINT UNSIGNED NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      description VARCHAR(500) NULL,
      dep_method VARCHAR(40) NOT NULL DEFAULT 'Diminishing',
      auto_carry_forward TINYINT(1) NOT NULL DEFAULT 1,
      lock_previous_year TINYINT(1) NOT NULL DEFAULT 1,
      status VARCHAR(20) NOT NULL DEFAULT 'Draft',
      total_assets DECIMAL(14,2) NOT NULL DEFAULT 0,
      opening_balance DECIMAL(14,2) NOT NULL DEFAULT 0,
      closing_balance DECIMAL(14,2) NOT NULL DEFAULT 0,
      accumulated_depreciation DECIMAL(14,2) NOT NULL DEFAULT 0,
      locked_at DATETIME NULL,
      created_by INT UNSIGNED NULL,
      deleted_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_school_fin_year (school_id, year),
      KEY idx_safy_school (school_id),
      KEY idx_safy_status (school_id, status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS school_asset_year_category_balances (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      financial_year_id INT UNSIGNED NOT NULL,
      school_id INT UNSIGNED NOT NULL,
      category_id INT UNSIGNED NULL,
      category_name VARCHAR(120) NOT NULL,
      depreciation_rate DECIMAL(8,4) NULL,
      opening_balance DECIMAL(14,2) NOT NULL DEFAULT 0,
      last_year_closing DECIMAL(14,2) NOT NULL DEFAULT 0,
      purchases DECIMAL(14,2) NOT NULL DEFAULT 0,
      accumulated_depreciation DECIMAL(14,2) NOT NULL DEFAULT 0,
      accumulated_depreciation_start DECIMAL(14,2) NULL,
      annual_depreciation DECIMAL(14,2) NOT NULL DEFAULT 0,
      closing_balance DECIMAL(14,2) NOT NULL DEFAULT 0,
      UNIQUE KEY uq_fy_category (financial_year_id, category_name),
      KEY idx_fycb_school (school_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  try {
    await promisePool.query(
      `ALTER TABLE school_asset_year_category_balances
       ADD COLUMN accumulated_depreciation_start DECIMAL(14,2) NULL
       AFTER accumulated_depreciation`
    );
  } catch (err) {
    if (err?.code !== 'ER_DUP_FIELDNAME') throw err;
  }
  await promisePool.query(
    `UPDATE school_asset_year_category_balances
     SET accumulated_depreciation_start = accumulated_depreciation
     WHERE accumulated_depreciation_start IS NULL`
  );
  financialYearsTableReady = true;
}

function mapFinancialYearRow(row, categoryBalances = []) {
  if (!row) return null;
  const opening = Number(row.opening_balance || 0);
  const closing = Number(row.closing_balance || 0);
  return {
    id: row.id,
    year: Number(row.year),
    start_date: toDateOnly(row.start_date),
    end_date: toDateOnly(row.end_date),
    start: toDateOnly(row.start_date),
    end: toDateOnly(row.end_date),
    description: row.description || '',
    dep_method: row.dep_method || 'Diminishing',
    auto_carry_forward: !!row.auto_carry_forward,
    lock_previous_year: !!row.lock_previous_year,
    status: row.status || 'Draft',
    total_assets: Number(row.total_assets || 0),
    opening_balance: opening,
    openingBalance: opening,
    closing_balance: closing,
    closingBalance: closing,
    accumulated_depreciation: Number(row.accumulated_depreciation || 0),
    locked_at: row.locked_at,
    created_at: row.created_at,
    category_balances: categoryBalances,
  };
}

async function loadCategoryBalancesForYear(financialYearId, schoolId) {
  const [rows] = await promisePool.query(
    `SELECT * FROM school_asset_year_category_balances
     WHERE financial_year_id = ? AND school_id = ?
     ORDER BY category_name`,
    [financialYearId, schoolId]
  );
  return rows.map((r) => ({
    id: r.id,
    category_id: r.category_id,
    category: r.category_name,
    category_name: r.category_name,
    depreciation_rate: r.depreciation_rate != null ? Number(r.depreciation_rate) : null,
    opening_balance: Number(r.opening_balance || 0),
    opening: Number(r.opening_balance || 0),
    last_year_closing: Number(r.last_year_closing || 0),
    lastYearClosing: Number(r.last_year_closing || 0),
    purchases: Number(r.purchases || 0),
    accumulated_depreciation: Number(r.accumulated_depreciation || 0),
    accumulated_depreciation_start: Number(
      r.accumulated_depreciation_start ?? r.accumulated_depreciation ?? 0
    ),
    total_depreciation_start: Number(
      r.accumulated_depreciation_start ?? r.accumulated_depreciation ?? 0
    ),
    annual_depreciation: Number(r.annual_depreciation || 0),
    closing_balance: Number(r.closing_balance || 0),
  }));
}

async function recalcFinancialYearTotals(financialYearId, schoolId) {
  const [[sums]] = await promisePool.query(
    `SELECT
       COALESCE(SUM(opening_balance), 0) AS opening_balance,
       COALESCE(SUM(purchases), 0) AS purchases,
       COALESCE(SUM(accumulated_depreciation), 0) AS accumulated_depreciation,
       COALESCE(SUM(closing_balance), 0) AS closing_balance
     FROM school_asset_year_category_balances
     WHERE financial_year_id = ? AND school_id = ?`,
    [financialYearId, schoolId]
  );
  const opening = toMoney(sums?.opening_balance);
  const purchases = toMoney(sums?.purchases);
  const accDep = toMoney(sums?.accumulated_depreciation);
  const closing = toMoney(sums?.closing_balance);
  await promisePool.query(
    `UPDATE school_asset_financial_years SET
      opening_balance = ?, total_assets = ?, accumulated_depreciation = ?,
      closing_balance = ?, updated_at = NOW()
     WHERE id = ? AND school_id = ?`,
    [opening, opening + purchases, accDep, closing, financialYearId, schoolId]
  );
}

async function getActiveFinancialYear(schoolId) {
  await ensureFinancialYearsTable();
  const [[row]] = await promisePool.query(
    `SELECT * FROM school_asset_financial_years
     WHERE school_id = ? AND deleted_at IS NULL AND status = 'Active'
     ORDER BY year DESC LIMIT 1`,
    [schoolId]
  );
  if (!row) return null;
  const balances = await loadCategoryBalancesForYear(row.id, schoolId);
  return mapFinancialYearRow(row, balances);
}

async function getFinancialYearByYear(schoolId, year) {
  await ensureFinancialYearsTable();
  const yr = Number(year);
  if (!Number.isFinite(yr)) return null;
  const [[row]] = await promisePool.query(
    `SELECT * FROM school_asset_financial_years
     WHERE school_id = ? AND deleted_at IS NULL AND year = ? LIMIT 1`,
    [schoolId, yr]
  );
  if (!row) return null;
  const balances = await loadCategoryBalancesForYear(row.id, schoolId);
  return mapFinancialYearRow(row, balances);
}

function categoryYearStartFromBalance(bal) {
  if (!bal) return { opening: 0, accumulated: 0 };
  return {
    opening: toMoney(bal.opening_balance),
    accumulated: toMoney(bal.accumulated_depreciation_start ?? bal.accumulated_depreciation),
  };
}

async function getYearSetupCategoryBalance(schoolId, year, categoryName) {
  const yr = Number(year);
  const cat = trimStr(categoryName);
  if (!Number.isFinite(yr) || !cat) return null;
  const finYear = await getFinancialYearByYear(schoolId, yr);
  if (!finYear?.id) return null;
  const [[bal]] = await promisePool.query(
    `SELECT * FROM school_asset_year_category_balances
     WHERE financial_year_id = ? AND school_id = ?
       AND LOWER(TRIM(category_name)) = LOWER(TRIM(?))
     LIMIT 1`,
    [finYear.id, schoolId, cat]
  );
  return bal || null;
}

async function resolveCategoryOpeningContext(schoolId, year, categoryName) {
  await ensureFinancialYearsTable();
  const yr = Number(year);
  const cat = trimStr(categoryName);
  if (!Number.isFinite(yr) || !cat) return null;

  const finYear = await getFinancialYearByYear(schoolId, yr);
  const setupBal = await getYearSetupCategoryBalance(schoolId, yr, cat);
  const rolling = await resolveRegisterRollingOpening(schoolId, yr, cat);
  const assetsInYear = rolling?.assets_in_year ?? 0;

  let lastYearClosing = toMoney(setupBal?.last_year_closing);
  let prevAccDep = toMoney(setupBal?.accumulated_depreciation);
  let lastYearTotalDep = prevAccDep;
  let yearOpening = toMoney(setupBal?.opening_balance);
  let currentClosing = toMoney(setupBal?.closing_balance);
  let purchases = toMoney(setupBal?.purchases);
  let annualDepInYear = toMoney(setupBal?.annual_depreciation);

  const [[prevYearRow]] = await promisePool.query(
    `SELECT id FROM school_asset_financial_years
     WHERE school_id = ? AND deleted_at IS NULL AND year = ? LIMIT 1`,
    [schoolId, yr - 1]
  );
  if (prevYearRow && !setupBal) {
    const [[prevBal]] = await promisePool.query(
      `SELECT closing_balance, accumulated_depreciation FROM school_asset_year_category_balances
       WHERE financial_year_id = ? AND school_id = ?
         AND LOWER(TRIM(category_name)) = LOWER(TRIM(?)) LIMIT 1`,
      [prevYearRow.id, schoolId, cat]
    );
    lastYearClosing = toMoney(prevBal?.closing_balance);
    prevAccDep = toMoney(prevBal?.accumulated_depreciation);
    lastYearTotalDep = prevAccDep;
    yearOpening = lastYearClosing;
    currentClosing = lastYearClosing;
  }

  let effectiveOpening;
  let effectiveAccumulated;
  let source;
  let sourceLabel;

  if (assetsInYear > 0 && rolling?.prior_asset_id) {
    effectiveOpening = rolling.effective_opening;
    effectiveAccumulated = rolling.effective_accumulated_depreciation;
    source = rolling.source;
    sourceLabel = rolling.source_label;
  } else if (assetsInYear === 0 && rolling?.prior_asset_id) {
    effectiveOpening = rolling.effective_opening;
    effectiveAccumulated = rolling.effective_accumulated_depreciation;
    source = rolling.source;
    sourceLabel = rolling.source_label;
  } else if (setupBal) {
    const yearStart = categoryYearStartFromBalance(setupBal);
    effectiveOpening = yearStart.opening;
    effectiveAccumulated = yearStart.accumulated;
    source = 'year_setup';
    sourceLabel = 'First asset in year — opening & accumulated from Year Setup';
  } else {
    effectiveOpening = yearOpening || lastYearClosing;
    effectiveAccumulated = prevAccDep;
    source = 'none';
    sourceLabel = 'No Year Setup balance for this category — configure in Year Setup Step 2';
  }

  return {
    year: yr,
    category: cat,
    financial_year_id: finYear?.id ?? null,
    financial_year_status: finYear?.status ?? null,
    last_year_closing: lastYearClosing,
    last_year_total_depreciation: lastYearTotalDep,
    year_opening_balance: yearOpening || effectiveOpening,
    year_setup_opening: categoryYearStartFromBalance(setupBal).opening,
    year_setup_accumulated_depreciation: categoryYearStartFromBalance(setupBal).accumulated,
    effective_opening: effectiveOpening,
    effective_accumulated_depreciation: effectiveAccumulated,
    current_closing: currentClosing,
    purchases_in_year: purchases,
    assets_in_year: assetsInYear,
    accumulated_depreciation: effectiveAccumulated,
    annual_depreciation_in_year: annualDepInYear,
    source,
    source_label: sourceLabel,
    prior_asset_id: rolling?.prior_asset_id ?? null,
    prior_asset_name: rolling?.prior_asset_name ?? null,
    prior_asset_code: rolling?.prior_asset_code ?? null,
  };
}

async function buildOpeningPreview(schoolId, year) {
  await ensureFinancialYearsTable();
  await seedDefaultCategoriesIfEmpty(schoolId);
  const categories = await loadCategoriesWithCounts(schoolId);
  const [[prevYear]] = await promisePool.query(
    `SELECT * FROM school_asset_financial_years
     WHERE school_id = ? AND deleted_at IS NULL AND year = ? LIMIT 1`,
    [schoolId, year - 1]
  );
  let prevBalances = [];
  if (prevYear) {
    prevBalances = await loadCategoryBalancesForYear(prevYear.id, schoolId);
  }
  const prevMap = new Map(prevBalances.map((b) => [b.category_name, b]));
  return categories.map((cat) => {
    const prev = prevMap.get(cat.name);
    const lastClosing = prev ? prev.closing_balance : 0;
    const prevAccDep = prev ? prev.accumulated_depreciation : 0;
    const rate = cat.depreciation_rate ?? 5;
    const yearStartAnnual = Math.round(prevAccDep * (rate / 100));
    return {
      category_id: cat.id,
      category: cat.name,
      category_name: cat.name,
      depreciation_rate: rate,
      opening_balance: lastClosing,
      opening: lastClosing,
      last_year_closing: lastClosing,
      lastYearClosing: lastClosing,
      last_year_total_depreciation: prevAccDep,
      previous_accumulated_depreciation: prevAccDep,
      purchases: 0,
      accumulated_depreciation: prevAccDep,
      total_depreciation_start: prevAccDep,
      year_start_annual_depreciation: yearStartAnnual,
      annual_depreciation: 0,
      closing_balance: lastClosing,
    };
  });
}

function normalizeDepMethod(method) {
  const m = trimStr(method).toLowerCase();
  if (m.includes('straight')) return 'Straight Line';
  if (m.includes('diminish')) return 'Diminishing';
  return trimStr(method) || 'Diminishing';
}

function mapSimpleCondition(code) {
  const c = trimStr(code).toLowerCase();
  if (c === 'excellent' || c === 'good') return 'GOOD';
  if (c === 'fair') return 'FAIR';
  if (c === 'poor' || c === 'damaged') return 'DAMAGED';
  return 'GOOD';
}

function currentCalendarYear() {
  return new Date().getFullYear();
}

function resolveRegisterYear(body, fallback) {
  const raw = body?.register_year ?? body?.registerYear;
  const n = Number(raw);
  if (Number.isFinite(n) && n >= 1900 && n <= 2100) return Math.floor(n);
  return fallback ?? currentCalendarYear();
}

function resolveAssetEntryMode(body) {
  const raw = trimStr(body?.entry_mode || body?.entryMode).toLowerCase();
  if (raw === 'legacy' || raw === 'free_year' || raw === 'free') return 'legacy';
  if (raw === 'year_setup' || raw === 'first_time') return 'year_setup';
  if (body?.first_time === false || body?.firstTime === false || body?.is_first_entry === false) {
    return 'legacy';
  }
  return 'year_setup';
}

function registerTotalsFromDbRow(row) {
  if (!row) return null;
  const opening = toMoney(row.opening_amount);
  const purchase = toMoney(row.unit_price);
  const totalBalance = toMoney(row.total_balance) || opening + purchase;
  const accumulated = toMoney(row.accumulated_depreciation);
  const annualDep = toMoney(row.annual_dep);
  const storedTotalDep = toMoney(row.total_dep);
  const totalDep = storedTotalDep > 0
    ? storedTotalDep
    : Math.max(0, totalBalance - annualDep);
  return { totalBalance, totalDep };
}

async function getLastRegisterAssetInCategory(schoolId, year, categoryName) {
  const yr = Number(year);
  const cat = trimStr(categoryName);
  if (!Number.isFinite(yr) || !cat) return null;
  const [[row]] = await promisePool.query(
    `SELECT * FROM school_assets
     WHERE school_id = ? AND deleted_at IS NULL AND status != 'Draft'
       AND register_year = ? AND LOWER(TRIM(category)) = LOWER(TRIM(?))
     ORDER BY id DESC LIMIT 1`,
    [schoolId, yr, cat]
  );
  if (!row) return null;
  const mapped = mapAssetRow(row);
  if (!mapped) return null;
  const totals = registerTotalsFromDbRow(row);
  return enrichRegisterFinancialsRow({
    ...mapped,
    total_balance: totals.totalBalance,
    total_dep: totals.totalDep,
  });
}

async function countRegisterAssetsInCategory(schoolId, year, categoryName) {
  const yr = Number(year);
  const cat = trimStr(categoryName);
  if (!Number.isFinite(yr) || !cat) return 0;
  const [[countRow]] = await promisePool.query(
    `SELECT COUNT(*) AS c FROM school_assets
     WHERE school_id = ? AND deleted_at IS NULL AND status != 'Draft'
       AND register_year = ? AND LOWER(TRIM(category)) = LOWER(TRIM(?))`,
    [schoolId, yr, cat]
  );
  return Number(countRow?.c || 0);
}

/** Opening for the first asset in a year/category (year setup or prior-year last asset). */
async function resolveYearStartOpening(schoolId, year, categoryName) {
  const yr = Number(year);
  const cat = trimStr(categoryName);
  if (!Number.isFinite(yr) || !cat) return { opening: 0, accumulated: 0, source: 'none' };

  const priorLast = await getLastRegisterAssetInCategory(schoolId, yr - 1, cat);
  if (priorLast) {
    return {
      opening: toMoney(priorLast.total_balance),
      accumulated: toMoney(priorLast.total_dep),
      source: 'prior_year_last_asset',
      prior_asset_id: priorLast.id,
      prior_asset_name: priorLast.asset_name,
      prior_asset_code: priorLast.asset_code,
    };
  }

  await ensureFinancialYearsTable();
  const finYear = await getFinancialYearByYear(schoolId, yr);
  let opening = 0;
  let accumulated = 0;
  if (finYear) {
    const [[bal]] = await promisePool.query(
      `SELECT opening_balance, accumulated_depreciation, accumulated_depreciation_start
       FROM school_asset_year_category_balances
       WHERE financial_year_id = ? AND school_id = ?
         AND LOWER(TRIM(category_name)) = LOWER(TRIM(?)) LIMIT 1`,
      [finYear.id, schoolId, cat]
    );
    const yearStart = categoryYearStartFromBalance(bal);
    opening = yearStart.opening;
    accumulated = yearStart.accumulated;
  }
  return { opening, accumulated, source: 'year_setup' };
}

/** Fix category year-start accumulated when old ledger logic inflated it past opening. */
async function repairCorruptedCategoryYearStart(schoolId, year, categoryName) {
  const setupBal = await getYearSetupCategoryBalance(schoolId, year, categoryName);
  if (!setupBal) return false;

  const priorLast = await getLastRegisterAssetInCategory(schoolId, Number(year) - 1, categoryName);
  if (priorLast) return false;

  const opening = toMoney(setupBal.opening_balance);
  let start = toMoney(setupBal.accumulated_depreciation_start ?? setupBal.accumulated_depreciation);
  if (opening <= 0 || start <= opening) return false;

  const rate = toMoney(setupBal.depreciation_rate ?? 25);
  const acc = toMoney(setupBal.accumulated_depreciation);
  const inferred = Math.round(opening * (rate / 100));
  const repaired = acc > 0 && acc <= opening ? acc : inferred;
  if (repaired >= start || repaired > opening) return false;

  await promisePool.query(
    `UPDATE school_asset_year_category_balances SET
      accumulated_depreciation_start = ?,
      accumulated_depreciation = ?
     WHERE id = ? AND school_id = ?`,
    [repaired, repaired, setupBal.id, schoolId]
  );
  return true;
}

/** Recompute opening → totals chain for all assets in a year/category (register order by id). */
async function recalcRegisterChainInCategory(schoolId, year, categoryName) {
  const yr = Number(year);
  const cat = trimStr(categoryName);
  if (!Number.isFinite(yr) || !cat) return 0;

  await repairCorruptedCategoryYearStart(schoolId, yr, cat);

  const [rows] = await promisePool.query(
    `SELECT id, unit_price, dep_rate FROM school_assets
     WHERE school_id = ? AND deleted_at IS NULL AND status != 'Draft'
       AND register_year = ? AND LOWER(TRIM(category)) = LOWER(TRIM(?))
     ORDER BY id ASC`,
    [schoolId, yr, cat]
  );
  if (!rows.length) return 0;

  const yearStart = await resolveYearStartOpening(schoolId, yr, cat);
  let rollingOpening = yearStart.opening;
  let rollingAccumulated = yearStart.accumulated;

  for (const row of rows) {
    const depRate = toMoney(row.dep_rate ?? 5);
    const math = computeAssetRegisterMath({
      openingAmount: rollingOpening,
      unitPrice: row.unit_price,
      accumulatedDepreciation: rollingAccumulated,
      depRatePercent: depRate,
    });

    await promisePool.query(
      `UPDATE school_assets SET
        opening_amount = ?, total_balance = ?, accumulated_depreciation = ?,
        annual_dep = ?, total_dep = ?, net_book_value = ?, decimal_dep = ?
       WHERE id = ? AND school_id = ?`,
      [
        math.openingAmount,
        math.totalBalance,
        math.accumulatedDepreciation,
        math.annualDep,
        math.totalDep,
        math.netBookValue,
        math.decimalDep,
        row.id,
        schoolId,
      ]
    );

    rollingOpening = math.totalBalance;
    rollingAccumulated = math.totalDep;
  }

  return rows.length;
}

/** Opening for next asset — always from last register row when any exist in year/category. */
async function resolveRegisterRollingOpening(schoolId, year, categoryName) {
  const yr = Number(year);
  const cat = trimStr(categoryName);
  if (!Number.isFinite(yr) || !cat) return null;

  const assetsInYear = await countRegisterAssetsInCategory(schoolId, yr, cat);
  const lastAsset = assetsInYear > 0
    ? await getLastRegisterAssetInCategory(schoolId, yr, cat)
    : await getLastRegisterAssetInCategory(schoolId, yr - 1, cat);

  const effectiveOpening = lastAsset ? toMoney(lastAsset.total_balance) : 0;
  const effectiveAccumulated = lastAsset ? toMoney(lastAsset.total_dep) : 0;

  return {
    year: yr,
    category: cat,
    assets_in_year: assetsInYear,
    effective_opening: effectiveOpening,
    effective_accumulated_depreciation: effectiveAccumulated,
    last_year_total_depreciation: assetsInYear === 0 ? effectiveAccumulated : 0,
    prior_asset_id: lastAsset?.id ?? null,
    prior_asset_name: lastAsset?.asset_name ?? null,
    prior_asset_code: lastAsset?.asset_code ?? null,
    prior_asset_total_balance: effectiveOpening,
    prior_asset_total_dep: effectiveAccumulated,
    source: assetsInYear > 0 ? 'ledger' : (lastAsset ? 'last_year' : 'none'),
    source_label: assetsInYear > 0
      ? `Continues from last asset (${lastAsset?.asset_name || 'register'}) — opening = TOTAL BALANCE, accumulated = TOTAL DEPRECIATION`
      : lastAsset
        ? `Carried from ${yr - 1} last asset — opening = TOTAL BALANCE, accumulated = TOTAL DEPRECIATION`
        : 'First asset in this category — opening from Year Setup',
  };
}

/** Opening from prior register assets — falls back to Year Setup when no register history. */
async function resolveAssetBasedOpeningContext(schoolId, year, categoryName) {
  const ctx = await resolveCategoryOpeningContext(schoolId, year, categoryName);
  if (!ctx) return null;
  return { ...ctx, entry_mode: 'legacy' };
}

async function ensureAssignmentsTable() {
  if (assignmentsTableReady) return;
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS school_asset_assignments (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      asset_id INT UNSIGNED NOT NULL,
      assign_type VARCHAR(20) NOT NULL,
      assignee_name VARCHAR(200) NOT NULL,
      assignee_contact VARCHAR(120) NULL,
      staff_user_id INT UNSIGNED NULL,
      staff_department VARCHAR(120) NULL,
      place_label VARCHAR(200) NULL,
      place_building VARCHAR(120) NULL,
      place_room VARCHAR(120) NULL,
      returnable TINYINT(1) NOT NULL DEFAULT 1,
      assignment_date DATE NOT NULL,
      expected_return_date DATE NULL,
      condition_code VARCHAR(20) NOT NULL DEFAULT 'GOOD',
      notes TEXT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'Active',
      created_by INT UNSIGNED NULL,
      returned_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_saa_school (school_id),
      KEY idx_saa_asset (asset_id),
      KEY idx_saa_status (school_id, status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  assignmentsTableReady = true;
}

async function ensureMaintenanceTable() {
  if (maintenanceTableReady) return;
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS school_asset_maintenance (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      asset_id INT UNSIGNED NULL,
      assignment_id INT UNSIGNED NULL,
      asset_name VARCHAR(200) NULL,
      asset_code VARCHAR(80) NULL,
      maint_type VARCHAR(40) NOT NULL DEFAULT 'Repair',
      description TEXT NULL,
      technician VARCHAR(120) NULL,
      priority VARCHAR(20) NOT NULL DEFAULT 'Medium',
      estimated_cost DECIMAL(14,2) NULL,
      start_date DATE NULL,
      end_date DATE NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'Scheduled',
      notes TEXT NULL,
      extension_log JSON NULL,
      created_by INT UNSIGNED NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_sam_school (school_id),
      KEY idx_sam_asset (asset_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  for (const clause of [
    'ADD COLUMN notes TEXT NULL AFTER status',
    'ADD COLUMN extension_log JSON NULL AFTER notes',
  ]) {
    try {
      await promisePool.query(`ALTER TABLE school_asset_maintenance ${clause}`);
    } catch (e) {
      if (e.code !== 'ER_DUP_FIELDNAME') throw e;
    }
  }
  maintenanceTableReady = true;
}

function mapAssignmentRow(row, assetRow) {
  const assetName = assetRow?.asset_name || 'Asset';
  const assetCode = assetRow?.asset_code || '';
  const assignee = row.assignee_name || '—';
  const isOverdue = row.status === 'Active' && row.returnable
    && row.expected_return_date
    && new Date(row.expected_return_date) < new Date(new Date().toDateString());
  const status = isOverdue ? 'Overdue' : row.status;
  return {
    id: row.id,
    asset_id: row.asset_id,
    asset: assetName,
    assetCode,
    asset_code: assetCode,
    assignedTo: assignee,
    assignee_name: assignee,
    department: row.staff_department || row.place_building || '—',
    assign_type: row.assign_type,
    date: row.assignment_date,
    assignment_date: row.assignment_date,
    expectedReturn: row.expected_return_date,
    expected_return_date: row.expected_return_date,
    status,
    condition: mapConditionLabel(row.condition_code),
    condition_code: row.condition_code,
    returnable: !!row.returnable,
    notes: row.notes,
    assignee_contact: row.assignee_contact,
    staff_user_id: row.staff_user_id,
    place_label: row.place_label,
    asset_location: formatLocationValue(assetRow?.asset_location || row.asset_location),
    serial_number: assetRow?.serial_number || row.serial_number || null,
  };
}

async function ensureTransfersTable() {
  if (transfersTableReady) return;
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS school_asset_transfers (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      asset_id INT UNSIGNED NOT NULL,
      from_department VARCHAR(120) NULL,
      from_location VARCHAR(200) NULL,
      from_assignee VARCHAR(200) NULL,
      dest_type VARCHAR(20) NOT NULL,
      to_department VARCHAR(120) NULL,
      to_department_other VARCHAR(120) NULL,
      to_location VARCHAR(200) NULL,
      to_staff_name VARCHAR(200) NULL,
      transfer_reason VARCHAR(80) NOT NULL,
      transfer_reason_other VARCHAR(120) NULL,
      transfer_date DATE NOT NULL,
      approved_by VARCHAR(120) NULL,
      condition_code VARCHAR(20) NULL,
      notes TEXT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'Completed',
      created_by INT UNSIGNED NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_sat_school (school_id),
      KEY idx_sat_asset (asset_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  transfersTableReady = true;
}

async function ensureReplacementsTable() {
  if (replacementsTableReady) return;
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS school_asset_replacements (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      replacement_code VARCHAR(40) NOT NULL,
      old_asset_id INT UNSIGNED NOT NULL,
      new_asset_id INT UNSIGNED NULL,
      category VARCHAR(120) NULL,
      replacement_date DATE NOT NULL,
      reason VARCHAR(80) NOT NULL,
      reason_other VARCHAR(200) NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'Completed',
      approved_by VARCHAR(120) NULL,
      approval_role VARCHAR(80) NULL,
      replacement_cost DECIMAL(14,2) NULL,
      old_net_book_value DECIMAL(14,2) NULL,
      cost_difference DECIMAL(14,2) NULL,
      transfer_assignment TINYINT(1) NOT NULL DEFAULT 1,
      warranty_start DATE NULL,
      warranty_end DATE NULL,
      invoice_reference VARCHAR(200) NULL,
      notes TEXT NULL,
      audit_log TEXT NULL,
      pending_payload JSON NULL,
      created_by INT UNSIGNED NULL,
      completed_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_replacement_code (school_id, replacement_code),
      KEY idx_sar_school (school_id),
      KEY idx_sar_old_asset (old_asset_id),
      KEY idx_sar_new_asset (new_asset_id),
      KEY idx_sar_status (school_id, status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  replacementsTableReady = true;
}

async function nextReplacementCode(schoolId) {
  const [rows] = await promisePool.query(
    `SELECT replacement_code FROM school_asset_replacements
     WHERE school_id = ? AND replacement_code REGEXP '^REP-[0-9]+$'`,
    [schoolId]
  );
  let maxSeq = 0;
  rows.forEach((r) => {
    const m = String(r.replacement_code || '').match(/^REP-(\d+)$/i);
    if (m) maxSeq = Math.max(maxSeq, Number(m[1]));
  });
  return `REP-${String(maxSeq + 1).padStart(5, '0')}`;
}

function resolveReplacementFinancialRefs(row) {
  let sd = row.new_sd_number ?? null;
  let receipt = row.new_receipt_number ?? null;
  let ref = row.new_reference_no ?? null;
  if (row.pending_payload) {
    try {
      const p = typeof row.pending_payload === 'string'
        ? JSON.parse(row.pending_payload)
        : row.pending_payload;
      sd = sd || p.sd_number || null;
      receipt = receipt || p.receipt_number || null;
      ref = ref || p.reference_no || null;
    } catch {
      /* ignore invalid pending payload */
    }
  }
  return { sd_number: sd, receipt_number: receipt, reference_no: ref };
}

function mapReplacementRow(row, oldAsset, newAsset) {
  const reason = row.reason === 'Other' && row.reason_other
    ? `Other: ${row.reason_other}`
    : row.reason;
  return {
    id: row.id,
    replacement_id: row.replacement_code,
    replacement_code: row.replacement_code,
    old_asset_id: row.old_asset_id,
    new_asset_id: row.new_asset_id,
    old_asset: oldAsset?.asset_name || '—',
    old_asset_name: oldAsset?.asset_name || '—',
    old_asset_code: oldAsset?.asset_code || '—',
    old_label_tag: oldAsset?.label_tag || '—',
    old_status: oldAsset?.status || '—',
    new_asset: newAsset?.asset_name || '—',
    new_asset_name: newAsset?.asset_name || '—',
    new_asset_code: newAsset?.asset_code || '—',
    new_label_tag: newAsset?.label_tag || '—',
    new_status: newAsset?.status || '—',
    category: row.category || oldAsset?.category || '—',
    replacement_date: toDateOnly(row.replacement_date),
    date: toDateOnly(row.replacement_date),
    reason,
    reason_raw: row.reason,
    reason_other: row.reason_other,
    status: row.status || 'Completed',
    approved_by: row.approved_by,
    approvedBy: row.approved_by,
    approval_role: row.approval_role,
    approvalRole: row.approval_role,
    replacement_cost: row.replacement_cost != null ? Number(row.replacement_cost) : null,
    old_net_book_value: row.old_net_book_value != null ? Number(row.old_net_book_value) : null,
    cost_difference: row.cost_difference != null ? Number(row.cost_difference) : null,
    transfer_assignment: row.transfer_assignment === 1,
    warranty_start: toDateOnly(row.warranty_start),
    warranty_end: toDateOnly(row.warranty_end),
    invoice_reference: row.invoice_reference,
    notes: row.notes,
    ...resolveReplacementFinancialRefs(row),
    audit_log: row.audit_log,
    completed_at: row.completed_at,
    created_at: row.created_at,
  };
}

async function loadReplacementById(schoolId, id) {
  const replacementId = Number(id);
  if (!Number.isFinite(replacementId)) return null;
  const [[row]] = await promisePool.query(
    `SELECT r.*,
      oa.asset_name AS old_asset_name, oa.asset_code AS old_asset_code,
      oa.label_tag AS old_label_tag, oa.status AS old_status,
      na.asset_name AS new_asset_name, na.asset_code AS new_asset_code,
      na.label_tag AS new_label_tag, na.status AS new_status,
      na.sd_number AS new_sd_number, na.receipt_number AS new_receipt_number,
      na.reference_no AS new_reference_no
     FROM school_asset_replacements r
     LEFT JOIN school_assets oa ON oa.id = r.old_asset_id AND oa.school_id = r.school_id
     LEFT JOIN school_assets na ON na.id = r.new_asset_id AND na.school_id = r.school_id
     WHERE r.id = ? AND r.school_id = ? LIMIT 1`,
    [replacementId, schoolId]
  );
  if (!row) return null;
  return mapReplacementRow(row, {
    asset_name: row.old_asset_name,
    asset_code: row.old_asset_code,
    label_tag: row.old_label_tag,
    status: row.old_status,
    category: row.category,
  }, {
    asset_name: row.new_asset_name,
    asset_code: row.new_asset_code,
    label_tag: row.new_label_tag,
    status: row.new_status,
  });
}

async function updateReplacementRecord(schoolId, id, body) {
  const existing = await loadReplacementById(schoolId, id);
  if (!existing) {
    const err = new Error('Replacement not found');
    err.status = 404;
    throw err;
  }

  const reason = body.reason != null ? trimStr(body.reason) : existing.reason_raw;
  const reasonOther = body.reason_other != null
    ? trimStr(body.reason_other || body.reasonOther)
    : existing.reason_other;
  if (!reason || !REPLACEMENT_REASONS.includes(reason)) {
    const err = new Error('Valid replacement reason is required');
    err.status = 400;
    throw err;
  }
  if (reason === 'Other' && !reasonOther) {
    const err = new Error('Please specify replacement reason');
    err.status = 400;
    throw err;
  }

  let status = body.status != null ? trimStr(body.status) : existing.status;
  if (!['Pending', 'Completed', 'Rejected'].includes(status)) {
    const err = new Error('Invalid replacement status');
    err.status = 400;
    throw err;
  }
  if (existing.status === 'Completed' && status !== 'Completed') {
    const err = new Error('Completed replacements cannot change status');
    err.status = 400;
    throw err;
  }

  const replacementDate = body.replacement_date != null
    ? toDateOnly(body.replacement_date || body.replacementDate)
    : existing.replacement_date;
  const approvedBy = body.approved_by !== undefined
    ? (trimStr(body.approved_by || body.approvedBy) || null)
    : existing.approved_by;
  const approvalRole = body.approval_role !== undefined
    ? (trimStr(body.approval_role || body.approvalRole) || null)
    : existing.approval_role;
  const warrantyStart = body.warranty_start !== undefined
    ? (toDateOnly(body.warranty_start || body.warrantyStart) || null)
    : existing.warranty_start;
  const warrantyEnd = body.warranty_end !== undefined
    ? (toDateOnly(body.warranty_end || body.warrantyEnd) || null)
    : existing.warranty_end;
  const invoiceReference = body.invoice_reference !== undefined
    ? (trimStr(body.invoice_reference || body.invoiceReference) || null)
    : existing.invoice_reference;
  const notes = body.notes !== undefined ? (trimStr(body.notes) || null) : existing.notes;
  const replacementCost = body.replacement_cost != null
    ? toMoney(body.replacement_cost ?? body.replacementCost)
    : existing.replacement_cost;
  const oldNetBook = existing.old_net_book_value;
  const costDifference = replacementCost != null && oldNetBook != null
    ? replacementCost - oldNetBook
    : existing.cost_difference;

  await promisePool.query(
    `UPDATE school_asset_replacements SET
      replacement_date = ?, reason = ?, reason_other = ?, status = ?,
      approved_by = ?, approval_role = ?, replacement_cost = ?,
      cost_difference = ?, warranty_start = ?, warranty_end = ?,
      invoice_reference = ?, notes = ?, updated_at = NOW()
     WHERE id = ? AND school_id = ?`,
    [
      replacementDate,
      reason,
      reasonOther || null,
      status,
      approvedBy,
      approvalRole,
      replacementCost,
      costDifference,
      warrantyStart,
      warrantyEnd,
      invoiceReference,
      notes,
      Number(id),
      schoolId,
    ]
  );

  return loadReplacementById(schoolId, id);
}

async function deleteReplacementRecord(schoolId, id) {
  const [[row]] = await promisePool.query(
    `SELECT id, status, replacement_code FROM school_asset_replacements
     WHERE id = ? AND school_id = ? LIMIT 1`,
    [Number(id), schoolId]
  );
  if (!row) {
    const err = new Error('Replacement not found');
    err.status = 404;
    throw err;
  }
  if (row.status === 'Completed') {
    const err = new Error('Completed replacements cannot be deleted. Assets remain linked in the register.');
    err.status = 409;
    throw err;
  }

  await promisePool.query(
    `DELETE FROM school_asset_replacements WHERE id = ? AND school_id = ?`,
    [row.id, schoolId]
  );
  return { id: row.id, replacement_code: row.replacement_code };
}

async function approvePendingReplacement(schoolId, userId, id, body = {}) {
  const replacementId = Number(id);
  const [[row]] = await promisePool.query(
    `SELECT * FROM school_asset_replacements WHERE id = ? AND school_id = ? LIMIT 1`,
    [replacementId, schoolId]
  );
  if (!row) {
    const err = new Error('Replacement not found');
    err.status = 404;
    throw err;
  }
  if (row.status !== 'Pending') {
    const err = new Error('Only pending replacements can be approved');
    err.status = 409;
    throw err;
  }

  let payload = {};
  if (row.pending_payload) {
    try {
      payload = typeof row.pending_payload === 'string'
        ? JSON.parse(row.pending_payload)
        : row.pending_payload;
    } catch {
      const err = new Error('Invalid pending replacement data');
      err.status = 400;
      throw err;
    }
  }
  if (!payload?.asset_name) {
    const err = new Error('Pending replacement is missing new asset details');
    err.status = 400;
    throw err;
  }

  const oldAssetId = row.old_asset_id;
  const [[oldAsset]] = await promisePool.query(
    `SELECT * FROM school_assets WHERE id = ? AND school_id = ? AND deleted_at IS NULL LIMIT 1`,
    [oldAssetId, schoolId]
  );
  if (!oldAsset) {
    const err = new Error('Old asset not found');
    err.status = 404;
    throw err;
  }
  if (oldAsset.status === 'Replaced' || oldAsset.replaced_by_asset_id) {
    const err = new Error('This asset has already been replaced');
    err.status = 409;
    throw err;
  }

  const newAssetName = trimStr(payload.asset_name);
  const categoryName = trimStr(payload.category || row.category || oldAsset.category);
  const location = formatLocationValue(payload.location || oldAsset.location);
  const purchasePrice = toMoney(payload.purchase_price ?? row.replacement_cost);
  const purchaseDate = toDateOnly(payload.purchase_date) || localDateIso();
  const skuMode = trimStr(payload.sku_mode || 'auto').toLowerCase();
  const manualTagSku = trimStr(payload.tag_sku || payload.sku);
  const applyTax = payload.apply_tax !== false;
  const transferAssignment = row.transfer_assignment === 1;
  const replacementDate = toDateOnly(row.replacement_date) || localDateIso();
  const approvedBy = trimStr(body.approved_by || body.approvedBy || row.approved_by) || null;
  const approvalRole = trimStr(body.approval_role || body.approvalRole || row.approval_role) || null;
  const warrantyStart = toDateOnly(row.warranty_start);
  const warrantyEnd = toDateOnly(row.warranty_end);
  const registerYear = Number(payload.register_year) || Number(oldAsset.register_year) || new Date().getFullYear();

  if (skuMode === 'manual' && manualTagSku) {
    await assertManualTagSkuAvailable(schoolId, registerYear, manualTagSku);
  }

  const finYear = await getFinancialYearByYear(schoolId, registerYear);
  const entryMode = finYear?.status === 'Active' ? 'year_setup' : 'legacy';
  const locationLabel = payload.location_label || oldAsset.location_label;
  const labelTag = trimStr(payload.label_tag);

  let resolvedSku = skuMode === 'manual' ? manualTagSku : trimStr(payload.sku);
  let resolvedLabelTag = labelTag || resolvedSku;
  if (skuMode === 'auto') {
    const autoSku = await resolveAutoSkuForBody(schoolId, registerYear, {
      location_label: locationLabel,
      locationLabel,
      label_tag: labelTag || newAssetName,
      labelTag: labelTag || newAssetName,
      asset_name: newAssetName,
      assetName: newAssetName,
      location,
    });
    resolvedSku = autoSku.sku;
    resolvedLabelTag = resolvedLabelTag || autoSku.sku;
  }

  const tagSkuValue = resolvedSku || resolvedLabelTag;
  const createBody = {
    register_year: registerYear,
    entry_mode: entryMode,
    first_time: entryMode === 'year_setup',
    asset_name: newAssetName,
    category: categoryName,
    location,
    location_label: locationLabel,
    label_tag: resolvedLabelTag || tagSkuValue,
    sku_mode: skuMode,
    sku: tagSkuValue,
    serial_number: tagSkuValue,
    purchase_price: purchasePrice,
    purchase_date: purchaseDate,
    apply_tax: applyTax,
    asset_health_status: 'Used',
    sd_number: trimStr(payload.sd_number) || null,
    receipt_number: trimStr(payload.receipt_number) || null,
    reference_no: trimStr(payload.reference_no) || null,
  };
  const result = await registerAssetWithLedger(schoolId, userId, createBody);
  const newAssetRecord = result.asset;

  await promisePool.query(
    `UPDATE school_assets SET
      replaces_asset_id = ?, warranty_start = ?, warranty_end = ?, updated_at = NOW()
     WHERE id = ? AND school_id = ?`,
    [oldAssetId, warrantyStart, warrantyEnd, newAssetRecord.id, schoolId]
  );

  await promisePool.query(
    `UPDATE school_assets SET
      status = 'Replaced', replaced_by_asset_id = ?, assets_status = 'Replaced',
      asset_health_status = 'Not Used (Old)', updated_at = NOW()
     WHERE id = ? AND school_id = ?`,
    [newAssetRecord.id, oldAssetId, schoolId]
  );

  let assignmentTransferred = false;
  if (transferAssignment) {
    const [[activeAssign]] = await promisePool.query(
      `SELECT * FROM school_asset_assignments
       WHERE asset_id = ? AND school_id = ? AND status = 'Active' ORDER BY created_at DESC LIMIT 1`,
      [oldAssetId, schoolId]
    );
    if (activeAssign) {
      await promisePool.query(
        `INSERT INTO school_asset_assignments (
          school_id, asset_id, assign_type, assignee_name, assignee_contact,
          staff_user_id, staff_department, place_label, place_building, place_room,
          returnable, assignment_date, expected_return_date, condition_code, notes, status, created_by
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          schoolId, newAssetRecord.id, activeAssign.assign_type, activeAssign.assignee_name,
          activeAssign.assignee_contact, activeAssign.staff_user_id, activeAssign.staff_department,
          activeAssign.place_label, activeAssign.place_building, activeAssign.place_room,
          activeAssign.returnable, replacementDate, activeAssign.expected_return_date,
          activeAssign.condition_code, `Transferred from replacement ${row.replacement_code}`,
          'Active', userId,
        ]
      );
      await promisePool.query(
        `UPDATE school_assets SET status = 'Assigned', updated_at = NOW() WHERE id = ? AND school_id = ?`,
        [newAssetRecord.id, schoolId]
      );
      assignmentTransferred = true;
    }
  }

  const auditEntry = {
    at: new Date().toISOString(),
    event: 'replacement_approved',
    old_asset_code: oldAsset.asset_code,
    new_asset_code: newAssetRecord.asset_code,
    reason: row.reason,
    approved_by: approvedBy,
    assignment_transferred: assignmentTransferred,
    user_id: userId,
  };

  await promisePool.query(
    `UPDATE school_asset_replacements SET
      new_asset_id = ?, status = 'Completed', approved_by = ?, approval_role = ?,
      audit_log = ?, pending_payload = NULL, completed_at = NOW(), updated_at = NOW()
     WHERE id = ? AND school_id = ?`,
    [
      newAssetRecord.id,
      approvedBy,
      approvalRole,
      JSON.stringify([auditEntry]),
      replacementId,
      schoolId,
    ]
  );

  await promisePool.query(
    `UPDATE school_assets SET replacement_id = ? WHERE id IN (?, ?) AND school_id = ?`,
    [replacementId, oldAssetId, newAssetRecord.id, schoolId]
  );

  return loadReplacementById(schoolId, replacementId);
}

async function rejectReplacementRecord(schoolId, id, body = {}) {
  const existing = await loadReplacementById(schoolId, id);
  if (!existing) {
    const err = new Error('Replacement not found');
    err.status = 404;
    throw err;
  }
  if (existing.status !== 'Pending') {
    const err = new Error('Only pending replacements can be rejected');
    err.status = 409;
    throw err;
  }
  const notes = body.notes != null ? trimStr(body.notes) || null : existing.notes;
  const approvedBy = body.approved_by != null
    ? (trimStr(body.approved_by || body.approvedBy) || null)
    : existing.approved_by;

  await promisePool.query(
    `UPDATE school_asset_replacements SET
      status = 'Rejected', approved_by = ?, notes = ?, updated_at = NOW()
     WHERE id = ? AND school_id = ?`,
    [approvedBy, notes, Number(id), schoolId]
  );

  return loadReplacementById(schoolId, id);
}

async function loadReplacementStats(schoolId) {
  const [[totals]] = await promisePool.query(
    `SELECT
       COUNT(*) AS total,
       SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) AS pending,
       SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) AS completed,
       SUM(CASE WHEN status = 'Completed' THEN COALESCE(replacement_cost, 0) ELSE 0 END) AS replacement_cost
     FROM school_asset_replacements WHERE school_id = ?`,
    [schoolId]
  );
  const [[awaiting]] = await promisePool.query(
    `SELECT COUNT(*) AS cnt FROM school_assets
     WHERE school_id = ? AND deleted_at IS NULL
       AND asset_health_status = 'Not Used (Old)'
       AND (replaced_by_asset_id IS NULL OR replaced_by_asset_id = 0)
       AND COALESCE(status, '') != 'Replaced'`,
    [schoolId]
  );
  return {
    total: Number(totals?.total || 0),
    pending: Number(totals?.pending || 0),
    completed: Number(totals?.completed || 0),
    replacement_cost: Number(totals?.replacement_cost || 0),
    awaiting_replacement: Number(awaiting?.cnt || 0),
  };
}

async function loadOldNotReplacedAssets(schoolId) {
  const [rows] = await promisePool.query(
    `SELECT id, asset_code, asset_name, label_tag, category, location, location_label,
            asset_health_status, status, replaced_by_asset_id, net_book_value, register_year,
            assets_status, updated_at
     FROM school_assets
     WHERE school_id = ? AND deleted_at IS NULL
       AND asset_health_status = 'Not Used (Old)'
       AND (replaced_by_asset_id IS NULL OR replaced_by_asset_id = 0)
       AND COALESCE(status, '') != 'Replaced'
     ORDER BY updated_at DESC LIMIT 200`,
    [schoolId]
  );
  return (rows || []).map(mapAssetTestListRow).filter(Boolean);
}

async function completeAssetReplacement(schoolId, userId, body) {
  const oldAssetId = Number(body.old_asset_id || body.oldAssetId);
  if (!oldAssetId) {
    const err = new Error('Old asset is required');
    err.status = 400;
    throw err;
  }

  const reason = trimStr(body.reason || body.replacement_reason);
  const reasonOther = trimStr(body.reason_other || body.reasonOther);
  if (!reason || !REPLACEMENT_REASONS.includes(reason)) {
    const err = new Error('Valid replacement reason is required');
    err.status = 400;
    throw err;
  }
  if (reason === 'Other' && !reasonOther) {
    const err = new Error('Please specify replacement reason');
    err.status = 400;
    throw err;
  }

  const [[oldAsset]] = await promisePool.query(
    `SELECT * FROM school_assets WHERE id = ? AND school_id = ? AND deleted_at IS NULL LIMIT 1`,
    [oldAssetId, schoolId]
  );
  if (!oldAsset) {
    const err = new Error('Old asset not found');
    err.status = 404;
    throw err;
  }
  if (oldAsset.status === 'Replaced' || oldAsset.replaced_by_asset_id) {
    const err = new Error('This asset has already been replaced');
    err.status = 409;
    throw err;
  }

  const newAssetName = trimStr(body.asset_name || body.new_asset_name || body.assetName);
  const categoryName = trimStr(body.category || oldAsset.category);
  const location = formatLocationValue(body.location || oldAsset.location);
  const purchasePrice = toMoney(body.purchase_price ?? body.purchasePrice);
  const purchaseDate = toDateOnly(body.purchase_date || body.purchaseDate) || localDateIso();
  const skuMode = trimStr(body.sku_mode || body.skuMode || 'auto').toLowerCase();
  const manualTagSku = trimStr(body.tag_sku || body.tagSku || body.serial_number || body.serialNumber || body.sku);

  if (!newAssetName) {
    const err = new Error('New asset name is required');
    err.status = 400;
    throw err;
  }
  if (!location) {
    const err = new Error('Location is required');
    err.status = 400;
    throw err;
  }
  if (purchasePrice <= 0) {
    const err = new Error('Purchase price is required');
    err.status = 400;
    throw err;
  }
  if (skuMode === 'manual' && !manualTagSku) {
    const err = new Error('Asset tag / SKU is required in manual mode');
    err.status = 400;
    throw err;
  }

  const applyTax = body.apply_tax !== false && body.applyTax !== false;
  const status = trimStr(body.status) === 'Pending' ? 'Pending' : 'Completed';
  const transferAssignment = body.transfer_assignment !== false && body.transferAssignment !== false;
  const replacementDate = toDateOnly(body.replacement_date || body.replacementDate) || localDateIso();
  const approvedBy = trimStr(body.approved_by || body.approvedBy) || null;
  const approvalRole = trimStr(body.approval_role || body.approvalRole) || null;
  const warrantyStart = toDateOnly(body.warranty_start || body.warrantyStart) || null;
  const warrantyEnd = toDateOnly(body.warranty_end || body.warrantyEnd) || null;
  const invoiceReference = trimStr(body.invoice_reference || body.invoiceReference) || null;
  const sdNumber = trimStr(body.sd_number || body.sdNumber) || null;
  const receiptNumber = trimStr(body.receipt_number || body.receiptNumber) || null;
  const referenceNo = trimStr(body.reference_no || body.referenceNo) || null;
  const notes = trimStr(body.notes) || null;
  const oldNetBook = toMoney(oldAsset.net_book_value ?? oldAsset.total_dep ?? 0);
  const costDifference = purchasePrice - oldNetBook;

  const replacementCode = await nextReplacementCode(schoolId);
  const registerYear = Number(body.register_year ?? body.registerYear)
    || Number(oldAsset.register_year)
    || new Date().getFullYear();

  if (skuMode === 'manual') {
    await assertManualTagSkuAvailable(schoolId, registerYear, manualTagSku);
  }

  if (status === 'Pending') {
    const pendingPayload = {
      asset_name: newAssetName,
      category: categoryName,
      location,
      location_label: body.location_label || body.locationLabel || oldAsset.location_label,
      label_tag: body.label_tag || body.labelTag,
      purchase_price: purchasePrice,
      purchase_date: purchaseDate,
      tag_sku: manualTagSku || null,
      sku_mode: skuMode,
      apply_tax: applyTax,
      quantity: Math.min(100, Math.max(1, Number(body.quantity) || 1)),
      register_year: registerYear,
      warranty_start: warrantyStart,
      warranty_end: warrantyEnd,
      sd_number: sdNumber,
      receipt_number: receiptNumber,
      reference_no: referenceNo,
    };
    const [ins] = await promisePool.query(
      `INSERT INTO school_asset_replacements (
        school_id, replacement_code, old_asset_id, category, replacement_date,
        reason, reason_other, status, approved_by, approval_role,
        replacement_cost, old_net_book_value, cost_difference, transfer_assignment,
        warranty_start, warranty_end, invoice_reference, notes, pending_payload, created_by
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        schoolId, replacementCode, oldAssetId, categoryName, replacementDate,
        reason, reasonOther || null, 'Pending', approvedBy, approvalRole,
        purchasePrice, oldNetBook, costDifference, transferAssignment ? 1 : 0,
        warrantyStart, warrantyEnd, invoiceReference, notes,
        JSON.stringify(pendingPayload), userId,
      ]
    );
    const [[row]] = await promisePool.query(
      `SELECT * FROM school_asset_replacements WHERE id = ? LIMIT 1`, [ins.insertId]
    );
    return mapReplacementRow(row, oldAsset, null);
  }

  const finYear = await getFinancialYearByYear(schoolId, registerYear);
  const entryMode = finYear?.status === 'Active' ? 'year_setup' : 'legacy';
  const locationLabel = body.location_label || body.locationLabel || oldAsset.location_label;
  const labelTag = trimStr(body.label_tag || body.labelTag || body.assetLabel);

  let resolvedSku = skuMode === 'manual' ? manualTagSku : trimStr(body.sku);
  let resolvedLabelTag = labelTag || resolvedSku;
  if (skuMode === 'auto') {
    const autoSku = await resolveAutoSkuForBody(schoolId, registerYear, {
      location_label: locationLabel,
      locationLabel,
      label_tag: labelTag || newAssetName,
      labelTag: labelTag || newAssetName,
      asset_name: newAssetName,
      assetName: newAssetName,
      location,
    });
    resolvedSku = autoSku.sku;
    resolvedLabelTag = resolvedLabelTag || autoSku.sku;
  }

  let newAssetRecord = null;
  let lastCalculation = null;

  const tagSkuValue = resolvedSku || resolvedLabelTag;
  const createBody = {
    register_year: registerYear,
    entry_mode: entryMode,
    first_time: entryMode === 'year_setup',
    asset_name: newAssetName,
    category: categoryName,
    location,
    location_label: locationLabel,
    label_tag: resolvedLabelTag || tagSkuValue,
    sku_mode: skuMode,
    sku: tagSkuValue,
    serial_number: tagSkuValue,
    purchase_price: purchasePrice,
    purchase_date: purchaseDate,
    apply_tax: applyTax,
    asset_health_status: 'Used',
    sd_number: sdNumber,
    receipt_number: receiptNumber,
    reference_no: referenceNo,
  };
  const result = await registerAssetWithLedger(schoolId, userId, createBody);
  newAssetRecord = result.asset;
  lastCalculation = result.calculation;
  await promisePool.query(
    `UPDATE school_assets SET
      replaces_asset_id = ?, warranty_start = ?, warranty_end = ?, updated_at = NOW()
     WHERE id = ? AND school_id = ?`,
    [oldAssetId, warrantyStart, warrantyEnd, newAssetRecord.id, schoolId]
  );

  if (!newAssetRecord) {
    const err = new Error('Failed to create replacement asset');
    err.status = 500;
    throw err;
  }

  await promisePool.query(
    `UPDATE school_assets SET
      status = 'Replaced', replaced_by_asset_id = ?, assets_status = 'Replaced',
      asset_health_status = 'Not Used (Old)', updated_at = NOW()
     WHERE id = ? AND school_id = ?`,
    [newAssetRecord.id, oldAssetId, schoolId]
  );

  let assignmentTransferred = false;
  if (transferAssignment) {
    const [[activeAssign]] = await promisePool.query(
      `SELECT * FROM school_asset_assignments
       WHERE asset_id = ? AND school_id = ? AND status = 'Active' ORDER BY created_at DESC LIMIT 1`,
      [oldAssetId, schoolId]
    );
    if (activeAssign) {
      await promisePool.query(
        `INSERT INTO school_asset_assignments (
          school_id, asset_id, assign_type, assignee_name, assignee_contact,
          staff_user_id, staff_department, place_label, place_building, place_room,
          returnable, assignment_date, expected_return_date, condition_code, notes, status, created_by
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          schoolId, newAssetRecord.id, activeAssign.assign_type, activeAssign.assignee_name,
          activeAssign.assignee_contact, activeAssign.staff_user_id, activeAssign.staff_department,
          activeAssign.place_label, activeAssign.place_building, activeAssign.place_room,
          activeAssign.returnable, replacementDate, activeAssign.expected_return_date,
          activeAssign.condition_code, `Transferred from replacement ${replacementCode}`,
          'Active', userId,
        ]
      );
      await promisePool.query(
        `UPDATE school_assets SET status = 'Assigned', updated_at = NOW() WHERE id = ? AND school_id = ?`,
        [newAssetRecord.id, schoolId]
      );
      assignmentTransferred = true;
    }
  }

  const auditEntry = {
    at: new Date().toISOString(),
    event: 'replacement_completed',
    old_asset_code: oldAsset.asset_code,
    new_asset_code: newAssetRecord.asset_code,
    reason,
    approved_by: approvedBy,
    assignment_transferred: assignmentTransferred,
    user_id: userId,
  };

  const [ins] = await promisePool.query(
    `INSERT INTO school_asset_replacements (
      school_id, replacement_code, old_asset_id, new_asset_id, category, replacement_date,
      reason, reason_other, status, approved_by, approval_role,
      replacement_cost, old_net_book_value, cost_difference, transfer_assignment,
      warranty_start, warranty_end, invoice_reference, notes, audit_log, created_by, completed_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW())`,
    [
      schoolId, replacementCode, oldAssetId, newAssetRecord.id, categoryName, replacementDate,
      reason, reasonOther || null, 'Completed', approvedBy, approvalRole,
      purchasePrice, oldNetBook, costDifference, transferAssignment ? 1 : 0,
      warrantyStart, warrantyEnd, invoiceReference, notes,
      JSON.stringify([auditEntry]), userId,
    ]
  );

  await promisePool.query(
    `UPDATE school_assets SET replacement_id = ? WHERE id IN (?, ?) AND school_id = ?`,
    [ins.insertId, oldAssetId, newAssetRecord.id, schoolId]
  );

  const [[replacementRow]] = await promisePool.query(
    `SELECT * FROM school_asset_replacements WHERE id = ? LIMIT 1`, [ins.insertId]
  );
  const [[freshOld]] = await promisePool.query(
    `SELECT asset_name, asset_code, label_tag, status, category FROM school_assets WHERE id = ? LIMIT 1`,
    [oldAssetId]
  );
  const [[freshNew]] = await promisePool.query(
    `SELECT asset_name, asset_code, label_tag, status, category FROM school_assets WHERE id = ? LIMIT 1`,
    [newAssetRecord.id]
  );

  return {
    replacement: mapReplacementRow(replacementRow, freshOld, freshNew),
    new_asset: mapAssetTestListRow(newAssetRecord) || newAssetRecord,
    calculation: lastCalculation,
  };
}

function buildToLabel(row) {
  const type = row.dest_type;
  if (type === 'department') {
    const d = row.to_department || row.to_department_other;
    if (row.to_department === 'Other' && row.to_department_other) {
      return `Other: ${row.to_department_other}`;
    }
    return d || '—';
  }
  if (type === 'location') return formatLocationValue(row.to_location) || '—';
  if (type === 'staff') return trimStr(row.to_staff_name) || '—';
  return '—';
}

function mapTransferRow(row, assetRow) {
  const fromParts = [
    row.from_department,
    formatLocationValue(row.from_location || assetRow?.location),
  ].filter(Boolean);
  const from = fromParts.length ? fromParts.join(' — ') : formatLocationValue(assetRow?.location) || '—';
  const to = buildToLabel(row);
  return {
    id: row.id,
    asset_id: row.asset_id,
    asset: row.asset_name || assetRow?.asset_name || 'Asset',
    assetCode: row.asset_code || assetRow?.asset_code || '',
    asset_code: row.asset_code || assetRow?.asset_code || '',
    from,
    from_department: row.from_department,
    from_location: formatLocationValue(row.from_location || assetRow?.location),
    from_assignee: row.from_assignee,
    to,
    dest_type: row.dest_type,
    to_department: row.to_department,
    to_department_other: row.to_department_other,
    to_location: formatLocationValue(row.to_location),
    to_staff_name: row.to_staff_name,
    reason: row.transfer_reason === 'Other' && row.transfer_reason_other
      ? `Other: ${row.transfer_reason_other}`
      : row.transfer_reason,
    transfer_reason: row.transfer_reason,
    transfer_reason_other: row.transfer_reason_other,
    date: row.transfer_date,
    transfer_date: row.transfer_date,
    approvedBy: row.approved_by,
    approved_by: row.approved_by,
    condition: mapConditionLabel(row.condition_code),
    condition_code: row.condition_code,
    notes: row.notes,
    status: row.status || 'Completed',
  };
}

function mapMaintenanceRow(row) {
  return {
    id: row.id,
    asset: row.asset_name || 'Asset',
    asset_id: row.asset_id,
    assignment_id: row.assignment_id,
    problem: row.description,
    description: row.description,
    technician: row.technician || '—',
    cost: row.estimated_cost != null ? Number(row.estimated_cost) : null,
    date: toDateOnly(row.start_date),
    start_date: toDateOnly(row.start_date),
    end_date: toDateOnly(row.end_date),
    status: row.status || 'Scheduled',
    maint_type: row.maint_type,
    priority: row.priority,
    notes: row.notes,
    extension_log: row.extension_log,
  };
}

async function extendMaintenanceRecord(schoolId, userId, id, body = {}) {
  const maintId = Number(id);
  if (!Number.isFinite(maintId)) {
    const err = new Error('Invalid maintenance id');
    err.status = 400;
    throw err;
  }
  const additionalDays = Number(body.additional_days ?? body.additionalDays);
  const reason = trimStr(body.reason || body.comment || body.notes);
  if (!Number.isFinite(additionalDays) || additionalDays < 1 || additionalDays > 365) {
    const err = new Error('Additional days must be between 1 and 365');
    err.status = 400;
    throw err;
  }
  if (!reason) {
    const err = new Error('Reason or comment is required to extend maintenance');
    err.status = 400;
    throw err;
  }

  const [[row]] = await promisePool.query(
    `SELECT * FROM school_asset_maintenance WHERE id = ? AND school_id = ? LIMIT 1`,
    [maintId, schoolId]
  );
  if (!row) {
    const err = new Error('Maintenance record not found');
    err.status = 404;
    throw err;
  }
  if (row.status === 'Completed') {
    const err = new Error('Completed maintenance cannot be extended');
    err.status = 409;
    throw err;
  }

  const currentEnd = toDateOnly(row.end_date) || localDateIso();
  const base = new Date(`${currentEnd}T12:00:00`);
  base.setDate(base.getDate() + additionalDays);
  const newEnd = toDateOnly(base);

  let log = [];
  if (row.extension_log) {
    try {
      log = typeof row.extension_log === 'string' ? JSON.parse(row.extension_log) : row.extension_log;
      if (!Array.isArray(log)) log = [];
    } catch {
      log = [];
    }
  }
  log.push({
    at: new Date().toISOString(),
    from_end: currentEnd,
    to_end: newEnd,
    additional_days: additionalDays,
    reason,
    user_id: userId,
  });

  const noteAppend = `[${localDateIso()}] Extended ${additionalDays} day(s): ${reason}`;
  const mergedNotes = row.notes ? `${row.notes}\n${noteAppend}` : noteAppend;
  const newStatus = row.status === 'Scheduled' ? 'Ongoing' : row.status;

  await promisePool.query(
    `UPDATE school_asset_maintenance SET
      end_date = ?, status = ?, notes = ?, extension_log = ?, updated_at = NOW()
     WHERE id = ? AND school_id = ?`,
    [newEnd, newStatus, mergedNotes, JSON.stringify(log), maintId, schoolId]
  );

  const [[updated]] = await promisePool.query(
    `SELECT * FROM school_asset_maintenance WHERE id = ? LIMIT 1`, [maintId]
  );
  return mapMaintenanceRow(updated);
}

function mapConditionLabel(code) {
  const c = String(code || '').toUpperCase();
  if (c === 'GOOD') return 'Excellent';
  if (c === 'FAIR') return 'Good';
  if (c === 'DAMAGED') return 'Poor';
  return code || 'Good';
}

function mapConditionToCode(label) {
  const l = String(label || '').trim();
  if (l === 'Excellent') return 'GOOD';
  if (l === 'Good') return 'FAIR';
  if (l === 'Fair') return 'FAIR';
  if (l === 'Poor') return 'DAMAGED';
  return l.toUpperCase() || 'GOOD';
}

function mapAssetRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    asset_code: row.asset_code,
    code: row.asset_code,
    name: row.asset_name,
    asset_name: row.asset_name,
    label_tag: row.label_tag,
    type: row.asset_type,
    asset_type: row.asset_type,
    asset_type_other: row.asset_type_other,
    total_balance: row.total_balance != null ? Number(row.total_balance) : null,
    accumulated_depreciation: row.accumulated_depreciation != null ? Number(row.accumulated_depreciation) : 0,
    funding_source_other: row.funding_source_other,
    category: row.category,
    description: row.description,
    location: formatLocationValue(row.location) || formatLocationValue(row.asset_location),
    location_label: row.location_label || null,
    supplier: row.supplier_name,
    supplier_name: row.supplier_name,
    upi: row.upi,
    sku: row.sku,
    serial_number: row.serial_number,
    brand: row.brand,
    material: row.material,
    size: row.size_label,
    purchase_date: row.purchase_date,
    unit_price: row.unit_price != null ? Number(row.unit_price) : null,
    tax_amount: row.tax_amount != null ? Number(row.tax_amount) : null,
    price_incl_tax: row.price_incl_tax != null ? Number(row.price_incl_tax) : null,
    opening_amount: row.opening_amount != null ? Number(row.opening_amount) : null,
    invoice_number: row.invoice_number,
    sd_number: row.sd_number,
    receipt_number: row.receipt_number,
    reference_no: row.reference_no,
    funding_source: row.funding_source,
    dep_mode: row.dep_mode,
    dep_rate: row.dep_rate != null ? Number(row.dep_rate) : null,
    dep_years: row.dep_years != null ? Number(row.dep_years) : null,
    decimal_dep: row.decimal_dep != null ? Number(row.decimal_dep) : null,
    annual_dep: row.annual_dep != null ? Number(row.annual_dep) : null,
    total_dep: row.total_dep != null ? Number(row.total_dep) : null,
    net_book_value: row.net_book_value != null ? Number(row.net_book_value) : null,
    quantity: Number(row.quantity || 1),
    unit: row.unit,
    condition: row.condition_code,
    condition_code: row.condition_code,
    notes: row.notes,
    status: row.status,
    assets_status: row.assets_status || 'Active',
    asset_health_status: row.asset_health_status || DEFAULT_ASSET_HEALTH_STATUS,
    register_year: row.register_year != null ? Number(row.register_year) : null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    qr_value: buildQrValue(row),
  };
}

function buildPurchaseDate(body) {
  const y = trimStr(body.purchase_year || body.purchaseYear);
  const m = trimStr(body.purchase_month || body.purchaseMonth);
  const d = trimStr(body.purchase_day || body.purchaseDay);
  if (body.purchase_date) return body.purchase_date;
  if (y && m && d) {
    const mm = String(m).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    return `${y}-${mm}-${dd}`;
  }
  return null;
}

function computeAssetRegisterMath({
  openingAmount = 0,
  unitPrice = 0,
  accumulatedDepreciation = 0,
  depRatePercent = 0,
}) {
  const opening = toMoney(openingAmount);
  const purchase = toMoney(unitPrice);
  const accumulated = toMoney(accumulatedDepreciation);
  const rate = toMoney(depRatePercent);
  const decimalDep = rate > 0 ? rate / 100 : 0;
  const totalBalance = opening + purchase;
  const annualDep = Math.round(totalBalance * decimalDep);
  const totalDep = Math.max(0, totalBalance - annualDep);
  const netBookValue = totalDep;
  const newAccumulatedDep = totalDep;
  return {
    openingAmount: opening,
    unitPrice: purchase,
    accumulatedDepreciation: accumulated,
    depRatePercent: rate,
    decimalDep,
    totalBalance,
    annualDep,
    totalDep,
    netBookValue,
    newAccumulatedDep,
  };
}

function applyDepreciationMath(p) {
  const totalBalance = toMoney(p.total_balance) || toMoney(p.unit_price) + toMoney(p.opening_amount);
  const accumulated = toMoney(p.accumulated_depreciation);
  const rate = toMoney(p.dep_rate);
  const decimalDep = p.decimal_dep != null && p.decimal_dep !== ''
    ? toMoney(p.decimal_dep)
    : (rate > 0 ? rate / 100 : 0);
  const annualDep = p.annual_dep != null && toMoney(p.annual_dep) > 0
    ? toMoney(p.annual_dep)
    : Math.round(totalBalance * decimalDep);
  const totalDep = p.total_dep != null && toMoney(p.total_dep) > 0
    ? toMoney(p.total_dep)
    : accumulated + annualDep;
  const netBookValue = p.net_book_value != null && toMoney(p.net_book_value) >= 0
    ? toMoney(p.net_book_value)
    : Math.max(0, totalBalance - totalDep);
  return {
    ...p,
    total_balance: totalBalance || null,
    accumulated_depreciation: accumulated,
    decimal_dep: decimalDep || null,
    annual_dep: annualDep || null,
    total_dep: totalDep || null,
    net_book_value: netBookValue || null,
  };
}

function resolveAssetsStatus(body, { isCreate = false } = {}) {
  const raw = body.assets_status ?? body.assetsStatus;
  if (raw !== undefined && raw !== null && String(raw).trim() !== '') {
    const s = trimStr(raw);
    return VALID_ASSETS_STATUSES.includes(s) ? s : (isCreate ? 'Active' : null);
  }
  return isCreate ? 'Active' : null;
}

function resolveAssetHealthStatus(body, { isCreate = false } = {}) {
  const raw = body.asset_health_status ?? body.assetHealthStatus ?? body.health_status ?? body.healthStatus;
  if (raw !== undefined && raw !== null && String(raw).trim() !== '') {
    const s = trimStr(raw);
    return VALID_ASSET_HEALTH_STATUSES.includes(s) ? s : (isCreate ? DEFAULT_ASSET_HEALTH_STATUS : null);
  }
  return isCreate ? DEFAULT_ASSET_HEALTH_STATUS : null;
}

function payloadFromBody(body, { draft = false, defaultRegisterYear, isCreate = false } = {}) {
  const assetName = trimStr(body.asset_name || body.assetName);
  const location = formatLocationValue(body.location);
  const typeRaw = trimStr(body.asset_type || body.type).toUpperCase();
  const typeOther = trimStr(body.asset_type_other || body.typeOther || body.type_other);
  const assetType = typeRaw || null;
  const qty = Math.max(1, toMoney(body.quantity || 1));
  const unitPrice = toMoney(body.unit_price || body.unitPrice);
  const taxFromBody = body.tax_amount != null ? toMoney(body.tax_amount) : toMoney(body.taxAmount);
  const priceInclFromBody = body.price_incl_tax != null
    ? toMoney(body.price_incl_tax)
    : toMoney(body.priceInclTax);
  const computedTax = computePurchaseTax(unitPrice);
  const taxAmount = taxFromBody || computedTax.tax_amount;
  const priceInclTax = priceInclFromBody || computedTax.price_incl_tax;
  const opening = toMoney(body.opening_amount ?? body.openingAmount);
  const totalBalance = toMoney(body.total_balance ?? body.totalBalance)
    || unitPrice + opening;
  const assetsStatus = resolveAssetsStatus(body, { isCreate });
  const fundingRaw = trimStr(body.funding_source || body.fundingSource);
  const fundingOther = trimStr(body.funding_source_other || body.fundingOther);

  const base = {
    asset_code: trimStr(body.asset_code) || null,
    asset_name: assetName,
    label_tag: trimStr(body.label_tag || body.labelTag) || null,
    asset_type: assetType || null,
    asset_type_other: typeRaw === 'OTHER' ? typeOther || null : null,
    category: trimStr(body.category) || null,
    description: trimStr(body.description) || null,
    location: location || null,
    location_label: trimStr(body.location_label || body.locationLabel) || null,
    supplier_name: trimStr(body.supplier_name || body.supplier) || null,
    upi: trimStr(body.upi) || null,
    sku: trimStr(body.sku) || null,
    serial_number: trimStr(body.serial_number || body.serialNumber) || null,
    brand: trimStr(body.brand) || null,
    material: trimStr(body.material) || null,
    size_label: trimStr(body.size_label || body.size) || null,
    purchase_date: buildPurchaseDate(body),
    unit_price: unitPrice || null,
    tax_amount: taxAmount,
    price_incl_tax: priceInclTax,
    opening_amount: opening || null,
    total_balance: totalBalance || null,
    accumulated_depreciation: toMoney(body.accumulated_depreciation ?? body.accumulatedDepreciation),
    invoice_number: trimStr(body.invoice_number || body.invoice) || null,
    sd_number: trimStr(body.sd_number || body.sdNumber) || null,
    receipt_number: trimStr(body.receipt_number || body.receiptNumber) || null,
    reference_no: trimStr(body.reference_no || body.referenceNo) || null,
    funding_source: fundingRaw || null,
    funding_source_other: fundingRaw === 'Other' ? fundingOther || null : null,
    dep_mode: trimStr(body.dep_mode || body.depMode) || null,
    dep_rate: body.dep_rate != null ? toMoney(body.dep_rate) : toMoney(body.depRate) || null,
    dep_years: body.dep_years != null ? toMoney(body.dep_years) : toMoney(body.depYears) || null,
    decimal_dep: toMoney(body.decimal_dep ?? body.decimalDep) || null,
    annual_dep: toMoney(body.annual_dep ?? body.annualDep) || null,
    total_dep: toMoney(body.total_dep ?? body.totalDep) || null,
    net_book_value: toMoney(body.net_book_value ?? body.netBookValue) || null,
    quantity: qty,
    unit: trimStr(body.unit) || 'PCS',
    condition_code: trimStr(body.condition_code || body.condition) || 'GOOD',
    notes: trimStr(body.notes) || null,
    status: draft ? 'Draft' : trimStr(body.status) || 'Active',
    assets_status: assetsStatus,
    asset_health_status: resolveAssetHealthStatus(body, { isCreate }),
    register_year: resolveRegisterYear(body, defaultRegisterYear),
  };
  return applyDepreciationMath(base);
}

async function insertAssetRecord(schoolId, userId, p) {
  const assetCode = p.asset_code || await nextAssetCode(schoolId);
  const record = {
    school_id: schoolId,
    asset_code: assetCode,
    asset_name: p.asset_name,
    label_tag: p.label_tag ?? null,
    asset_type: p.asset_type ?? null,
    asset_type_other: p.asset_type_other ?? null,
    category: p.category ?? null,
    description: p.description ?? null,
    location: p.location ?? null,
    location_label: p.location_label ?? null,
    supplier_name: p.supplier_name ?? null,
    upi: p.upi ?? null,
    sku: p.sku ?? null,
    serial_number: p.serial_number ?? null,
    brand: p.brand ?? null,
    material: p.material ?? null,
    size_label: p.size_label ?? null,
    purchase_date: p.purchase_date ?? null,
    unit_price: p.unit_price ?? null,
    tax_amount: p.tax_amount ?? 0,
    price_incl_tax: p.price_incl_tax ?? null,
    opening_amount: p.opening_amount ?? null,
    total_balance: p.total_balance ?? null,
    accumulated_depreciation: p.accumulated_depreciation ?? 0,
    invoice_number: p.invoice_number ?? null,
    sd_number: p.sd_number ?? null,
    receipt_number: p.receipt_number ?? null,
    reference_no: p.reference_no ?? null,
    funding_source: p.funding_source ?? null,
    funding_source_other: p.funding_source_other ?? null,
    dep_mode: p.dep_mode ?? null,
    dep_rate: p.dep_rate ?? null,
    dep_years: p.dep_years ?? null,
    decimal_dep: p.decimal_dep ?? null,
    annual_dep: p.annual_dep ?? null,
    total_dep: p.total_dep ?? null,
    net_book_value: p.net_book_value ?? null,
    quantity: p.quantity ?? 1,
    unit: p.unit ?? 'PCS',
    condition_code: p.condition_code ?? 'GOOD',
    notes: p.notes ?? null,
    status: p.status ?? 'Active',
    assets_status: p.assets_status ?? 'Active',
    asset_health_status: p.asset_health_status ?? DEFAULT_ASSET_HEALTH_STATUS,
    register_year: p.register_year ?? null,
    created_by: userId ?? null,
  };
  const columns = Object.keys(record);
  const placeholders = columns.map(() => '?').join(', ');
  const values = columns.map((col) => record[col]);
  const [result] = await promisePool.query(
    `INSERT INTO school_assets (${columns.join(', ')}) VALUES (${placeholders})`,
    values
  );
  const [[row]] = await promisePool.query(`SELECT * FROM school_assets WHERE id = ? LIMIT 1`, [result.insertId]);
  return mapAssetRow(row);
}

function enrichRegisterFinancialsRow(base) {
  if (!base) return null;
  const opening = toMoney(base.opening_amount);
  const purchase = toMoney(base.unit_price);
  const computedBalance = opening + purchase;
  const accumulated = toMoney(base.accumulated_depreciation);
  const depRate = toMoney(base.dep_rate ?? 0);
  if (computedBalance > 0) {
    const math = computeAssetRegisterMath({
      openingAmount: opening,
      unitPrice: purchase,
      accumulatedDepreciation: accumulated,
      depRatePercent: depRate,
    });
    return {
      ...base,
      opening_amount: math.openingAmount,
      unit_price: math.unitPrice,
      total_balance: math.totalBalance,
      accumulated_depreciation: math.accumulatedDepreciation,
      annual_dep: math.annualDep,
      total_dep: math.totalDep,
      net_book_value: math.netBookValue,
    };
  }
  const totalBalance = toMoney(base.total_balance);
  const annualDep = toMoney(base.annual_dep);
  const storedTotalDep = toMoney(base.total_dep);
  const totalDep = storedTotalDep > 0 ? storedTotalDep : Math.max(0, totalBalance - annualDep);
  return {
    ...base,
    opening_amount: opening,
    unit_price: purchase,
    total_balance: totalBalance,
    accumulated_depreciation: accumulated,
    annual_dep: annualDep,
    total_dep: totalDep,
    net_book_value: totalDep,
  };
}

function mapAssetTestListRow(row) {
  const base = mapAssetRow(row);
  if (!base) return null;
  return enrichRegisterFinancialsRow({
    id: base.id,
    asset_code: base.asset_code,
    code: base.asset_code,
    asset_name: base.asset_name,
    name: base.asset_name,
    label_tag: base.label_tag,
    location_label: base.location_label,
    category: base.category,
    location: base.location,
    register_year: base.register_year,
    unit_price: base.unit_price,
    tax_amount: base.tax_amount,
    price_incl_tax: base.price_incl_tax,
    net_book_value: base.net_book_value,
    annual_dep: base.annual_dep,
    total_dep: base.total_dep,
    dep_rate: base.dep_rate,
    opening_amount: base.opening_amount,
    total_balance: base.total_balance,
    accumulated_depreciation: base.accumulated_depreciation,
    quantity: base.quantity,
    decimal_dep: base.decimal_dep,
    serial_number: base.serial_number,
    sku: base.sku,
    assets_status: base.assets_status,
    asset_health_status: base.asset_health_status,
    status: base.status,
    purchase_date: base.purchase_date,
    sd_number: base.sd_number,
    receipt_number: base.receipt_number,
    reference_no: base.reference_no,
    created_at: base.created_at,
    qr_value: base.qr_value,
  });
}

async function updateTestAssetWithLedger(schoolId, userId, assetId, body) {
  const id = Number(assetId);
  if (!Number.isFinite(id) || id <= 0) {
    const err = new Error('Valid asset id is required');
    err.status = 400;
    throw err;
  }

  const [[existing]] = await promisePool.query(
    `SELECT * FROM school_assets WHERE id = ? AND school_id = ? AND deleted_at IS NULL LIMIT 1`,
    [id, schoolId]
  );
  if (!existing) {
    const err = new Error('Asset not found');
    err.status = 404;
    throw err;
  }

  const oldYear = Number(existing.register_year);
  const oldCategory = trimStr(existing.category);

  const assetName = trimStr(body.asset_name || body.assetName);
  const categoryName = trimStr(body.category || body.categoryType || body.category_name);
  const location = formatLocationValue(body.location);
  if (!assetName) {
    const err = new Error('Asset name is required');
    err.status = 400;
    throw err;
  }
  if (!categoryName) {
    const err = new Error('Category is required');
    err.status = 400;
    throw err;
  }
  if (!location) {
    const err = new Error('Location is required');
    err.status = 400;
    throw err;
  }

  const purchasePrice = toMoney(body.purchase_price ?? body.purchasePrice ?? body.unitPrice);
  if (purchasePrice <= 0) {
    const err = new Error('Purchase price is required');
    err.status = 400;
    throw err;
  }

  const registerYear = Number(body.register_year ?? body.registerYear ?? existing.register_year);
  if (!Number.isFinite(registerYear)) {
    const err = new Error('Register year is required');
    err.status = 400;
    throw err;
  }

  const applyTax = body.apply_tax !== false && body.applyTax !== false;
  const taxAmount = applyTax ? Math.round(purchasePrice * PURCHASE_TAX_RATE) : 0;
  const priceInclTax = purchasePrice + taxAmount;
  const purchaseDate = toDateOnly(body.purchase_date || body.purchaseDate) || existing.purchase_date;

  const [[catRow]] = await promisePool.query(
    `SELECT id, name, depreciation_rate FROM school_asset_categories
     WHERE school_id = ? AND deleted_at IS NULL AND name = ? LIMIT 1`,
    [schoolId, categoryName]
  );
  const depRate = toMoney(catRow?.depreciation_rate ?? existing.dep_rate ?? 5);
  const healthStatus = resolveAssetHealthStatus(body, { isCreate: false })
    ?? existing.asset_health_status
    ?? DEFAULT_ASSET_HEALTH_STATUS;

  const nextTagSku = trimStr(
    body.sku || body.serial_number || body.serialNumber || body.label_tag || body.labelTag
  );
  if (nextTagSku) {
    await assertManualTagSkuAvailable(schoolId, registerYear, nextTagSku, id);
  }

  await promisePool.query(
    `UPDATE school_assets SET
      asset_name = ?, category = ?, location = ?, location_label = ?, label_tag = ?,
      serial_number = ?, sku = ?,
      purchase_date = ?, unit_price = ?, tax_amount = ?, price_incl_tax = ?,
      condition_code = ?, sd_number = ?, receipt_number = ?, reference_no = ?,
      asset_health_status = ?, register_year = ?, dep_rate = ?, updated_at = NOW()
     WHERE id = ? AND school_id = ?`,
    [
      assetName,
      categoryName,
      location,
      trimStr(body.location_label || body.locationLabel) || null,
      trimStr(body.label_tag || body.labelTag) || null,
      trimStr(body.serial_number || body.serialNumber) || null,
      trimStr(body.sku || body.serial_number || body.serialNumber) || null,
      purchaseDate,
      purchasePrice,
      taxAmount,
      priceInclTax,
      mapSimpleCondition(body.condition || body.condition_code),
      trimStr(body.sd_number || body.sdNumber) || null,
      trimStr(body.receipt_number || body.receiptNumber) || null,
      trimStr(body.reference_no || body.referenceNo) || null,
      healthStatus,
      registerYear,
      depRate,
      id,
      schoolId,
    ]
  );

  await recalcRegisterChainInCategory(schoolId, registerYear, categoryName);
  if (oldYear !== registerYear || oldCategory !== categoryName) {
    await recalcRegisterChainInCategory(schoolId, oldYear, oldCategory);
  }

  const finYear = await getFinancialYearByYear(schoolId, registerYear);
  if (finYear?.id) await recalcFinancialYearTotals(finYear.id, schoolId);
  if (oldYear !== registerYear) {
    const oldFin = await getFinancialYearByYear(schoolId, oldYear);
    if (oldFin?.id) await recalcFinancialYearTotals(oldFin.id, schoolId);
  }

  const [[row]] = await promisePool.query(`SELECT * FROM school_assets WHERE id = ? LIMIT 1`, [id]);
  return mapAssetTestListRow(row);
}

async function registerAssetWithLedger(schoolId, userId, body, options = {}) {
  await ensureFinancialYearsTable();
  const entryMode = resolveAssetEntryMode(body);
  const yearRaw = body.register_year ?? body.registerYear ?? body.financial_year ?? body.financialYear;
  let finYear = null;
  let registerYear = null;

  if (entryMode === 'legacy') {
    registerYear = resolveRegisterYear(body, null);
    if (!registerYear) {
      const err = new Error('Register year is required (1900–2100).');
      err.status = 400;
      throw err;
    }
    finYear = await getFinancialYearByYear(schoolId, registerYear);
  } else if (yearRaw != null && yearRaw !== '') {
    finYear = await getFinancialYearByYear(schoolId, Number(yearRaw));
    if (!finYear) {
      const err = new Error(`Financial year ${yearRaw} not found. Create it in Year Setup first.`);
      err.status = 400;
      throw err;
    }
    registerYear = finYear.year;
  } else {
    finYear = await getActiveFinancialYear(schoolId);
    registerYear = finYear?.year ?? null;
  }

  if (entryMode === 'year_setup') {
    if (!finYear) {
      const err = new Error('No financial year selected. Create one in Year Setup first.');
      err.status = 400;
      throw err;
    }
    if (finYear.status === 'Closed') {
      const err = new Error('Cannot add assets to a closed financial year.');
      err.status = 400;
      throw err;
    }
    if (finYear.status !== 'Active') {
      const err = new Error('Only the active financial year allows new asset entries.');
      err.status = 400;
      throw err;
    }
  } else if (finYear?.status === 'Closed') {
    const err = new Error('Cannot add assets to a closed financial year.');
    err.status = 400;
    throw err;
  }

  const activeYear = {
    id: finYear?.id ?? null,
    year: registerYear,
    status: finYear?.status ?? 'Legacy',
    dep_method: finYear?.dep_method || trimStr(body.dep_mode || body.depMode) || 'Diminishing',
  };

  const assetName = trimStr(body.asset_name || body.assetName);
  const categoryName = trimStr(body.category || body.categoryType || body.category_name);
  const location = formatLocationValue(body.location);
  if (!assetName) {
    const err = new Error('Asset name is required');
    err.status = 400;
    throw err;
  }
  if (!categoryName) {
    const err = new Error('Category is required');
    err.status = 400;
    throw err;
  }
  if (!location) {
    const err = new Error('Location is required');
    err.status = 400;
    throw err;
  }

  const purchasePrice = toMoney(body.purchase_price ?? body.purchasePrice ?? body.unitPrice);
  if (purchasePrice <= 0) {
    const err = new Error('Purchase price is required');
    err.status = 400;
    throw err;
  }

  const applyTax = body.apply_tax !== false && body.applyTax !== false;
  const taxAmount = applyTax ? Math.round(purchasePrice * PURCHASE_TAX_RATE) : 0;
  const priceInclTax = purchasePrice + taxAmount;
  const purchaseDate = toDateOnly(body.purchase_date || body.purchaseDate) || localDateIso();

  const [[catRow]] = await promisePool.query(
    `SELECT id, name, depreciation_rate FROM school_asset_categories
     WHERE school_id = ? AND deleted_at IS NULL AND name = ? LIMIT 1`,
    [schoolId, categoryName]
  );
  const depRate = toMoney(catRow?.depreciation_rate ?? body.dep_rate ?? 5);

  let catBalance = null;
  if (activeYear.id) {
    const [[row]] = await promisePool.query(
      `SELECT * FROM school_asset_year_category_balances
       WHERE financial_year_id = ? AND school_id = ? AND category_name = ? LIMIT 1`,
      [activeYear.id, schoolId, categoryName]
    );
    catBalance = row || null;
  }

  const openingCtx = entryMode === 'legacy'
    ? await resolveAssetBasedOpeningContext(schoolId, activeYear.year, categoryName)
    : await resolveCategoryOpeningContext(schoolId, activeYear.year, categoryName);

  const useBatchRolling = body.rolling_opening != null || body._batch_rolling === true;
  let categoryOpening;
  let accumulatedStart;

  if (useBatchRolling) {
    categoryOpening = toMoney(body.rolling_opening);
    accumulatedStart = toMoney(body.rolling_accumulated_dep ?? body.rolling_accumulated);
  } else {
    categoryOpening = toMoney(openingCtx?.effective_opening);
    accumulatedStart = toMoney(
      openingCtx?.effective_accumulated_depreciation
      ?? openingCtx?.accumulated_depreciation
      ?? catBalance?.accumulated_depreciation
    );
  }
  const assetsInYearBefore = Number(openingCtx?.assets_in_year ?? 0);

  const math = computeAssetRegisterMath({
    openingAmount: categoryOpening,
    unitPrice: purchasePrice,
    accumulatedDepreciation: accumulatedStart,
    depRatePercent: depRate,
  });

  const skuMode = trimStr(body.sku_mode || body.skuMode || 'manual').toLowerCase();
  let resolvedSku = trimStr(body.sku);
  let resolvedSerial = trimStr(body.serial_number || body.serialNumber);
  const excludeAssetId = body.exclude_asset_id ?? body.excludeAssetId ?? null;

  if (skuMode === 'auto' && !resolvedSku && !resolvedSerial) {
    const autoSku = await resolveAutoSkuForBody(schoolId, activeYear.year, body);
    resolvedSku = autoSku.sku;
    resolvedSerial = autoSku.serial_number;
  } else if (!resolvedSku && resolvedSerial) {
    resolvedSku = resolvedSerial;
  } else if (resolvedSku && !resolvedSerial) {
    resolvedSerial = resolvedSku;
  }

  if (skuMode === 'manual' && resolvedSku) {
    await assertManualTagSkuAvailable(schoolId, activeYear.year, resolvedSku, excludeAssetId);
  } else if (skuMode === 'auto' && resolvedSku) {
    if (await isTagSkuTaken(schoolId, activeYear.year, resolvedSku, excludeAssetId)) {
      const autoSku = await resolveAutoSkuForBody(schoolId, activeYear.year, body);
      resolvedSku = autoSku.sku;
      resolvedSerial = autoSku.serial_number;
    }
  }

  const p = payloadFromBody({
    asset_code: body.asset_code || body.assetCode,
    asset_name: assetName,
    label_tag: body.label_tag || body.labelTag,
    location_label: body.location_label || body.locationLabel,
    category: categoryName,
    asset_type: categoryName,
    location,
    serial_number: resolvedSerial,
    supplier_name: body.supplier_name || body.supplier,
    upi: body.upi,
    sku: resolvedSku,
    material: body.material,
    purchase_date: purchaseDate,
    unit_price: purchasePrice,
    tax_amount: taxAmount,
    price_incl_tax: priceInclTax,
    opening_amount: math.openingAmount,
    total_balance: math.totalBalance,
    accumulated_depreciation: math.accumulatedDepreciation,
    dep_mode: activeYear.dep_method || 'Diminishing',
    dep_rate: depRate,
    annual_dep: math.annualDep,
    total_dep: math.totalDep,
    net_book_value: math.netBookValue,
    decimal_dep: math.decimalDep,
    quantity: 1,
    unit: 'PCS',
    condition_code: mapSimpleCondition(body.condition || body.condition_code),
    sd_number: body.sd_number || body.sdNumber,
    receipt_number: body.receipt_number || body.receiptNumber,
    reference_no: body.reference_no || body.referenceNo,
    register_year: activeYear.year,
  }, { isCreate: true, defaultRegisterYear: activeYear.year });

  const asset = await insertAssetRecord(schoolId, userId, p);

  if (activeYear.id) {
    let balanceRow = catBalance;
    if (!balanceRow) {
      const setupBal = await getYearSetupCategoryBalance(schoolId, activeYear.year, categoryName);
      const yearStart = categoryYearStartFromBalance(setupBal);
      const insOpening = yearStart.opening || categoryOpening;
      const insAccStart = yearStart.accumulated || accumulatedStart;
      const [ins] = await promisePool.query(
        `INSERT INTO school_asset_year_category_balances (
          financial_year_id, school_id, category_id, category_name, depreciation_rate,
          opening_balance, last_year_closing, purchases, accumulated_depreciation,
          accumulated_depreciation_start, annual_depreciation, closing_balance
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          activeYear.id, schoolId, catRow?.id || null, categoryName, depRate,
          insOpening, insOpening, 0, insAccStart, insAccStart, 0, insOpening - insAccStart,
        ]
      );
      const [[created]] = await promisePool.query(
        `SELECT * FROM school_asset_year_category_balances WHERE id = ? LIMIT 1`,
        [ins.insertId]
      );
      balanceRow = created;
    }

    if (balanceRow) {
      const opening = toMoney(balanceRow.opening_balance);
      const accStart = toMoney(balanceRow.accumulated_depreciation_start ?? balanceRow.accumulated_depreciation);
      const newPurchases = toMoney(balanceRow.purchases) + purchasePrice;
      const newAnnualDep = toMoney(balanceRow.annual_depreciation) + math.annualDep;
      const newClosing = Math.max(0, opening + newPurchases - accStart - newAnnualDep);
      await promisePool.query(
        `UPDATE school_asset_year_category_balances SET
          purchases = ?, annual_depreciation = ?, closing_balance = ?
         WHERE id = ?`,
        [newPurchases, newAnnualDep, newClosing, balanceRow.id]
      );
    }

    if (!options.deferRecalc) {
      await recalcFinancialYearTotals(activeYear.id, schoolId);
    }
  }

  if (!options.skipChainRecalc) {
    await recalcRegisterChainInCategory(schoolId, activeYear.year, categoryName);
  }

  const calculation = {
    entry_mode: entryMode,
    financial_year: activeYear.year,
    category: categoryName,
    opening_stock: math.openingAmount,
    category_opening: categoryOpening,
    accumulated_depreciation_start: math.accumulatedDepreciation,
    opening_source: openingCtx?.source,
    opening_source_label: openingCtx?.source_label,
    last_year_total_depreciation: openingCtx?.last_year_total_depreciation ?? 0,
    assets_in_year_before: openingCtx?.assets_in_year ?? 0,
    purchase_price: purchasePrice,
    total_balance: math.totalBalance,
    tax_amount: taxAmount,
    price_incl_tax: priceInclTax,
    depreciation_rate: depRate,
    decimal_depreciation: math.decimalDep,
    annual_depreciation: math.annualDep,
    total_depreciation: math.totalDep,
    accumulated_depreciation_after: math.newAccumulatedDep,
    net_book_value: math.netBookValue,
  };

  return { asset, calculation };
}

async function getMaxAssetCodeSeq(schoolId) {
  const [rows] = await promisePool.query(
    `SELECT asset_code FROM school_assets
     WHERE school_id = ? AND asset_code REGEXP '^AST-[0-9]+$'`,
    [schoolId]
  );
  let maxSeq = 0;
  rows.forEach((r) => {
    const m = String(r.asset_code || '').match(/^AST-(\d+)$/i);
    if (m) maxSeq = Math.max(maxSeq, Number(m[1]));
  });
  return maxSeq;
}

async function nextAssetCode(schoolId) {
  const maxSeq = await getMaxAssetCodeSeq(schoolId);
  return `AST-${String(maxSeq + 1).padStart(5, '0')}`;
}

function abbreviateSchoolName(name) {
  return String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join('')
    .toUpperCase() || 'SCH';
}

function sanitizeSkuSegment(value, fallback = 'X') {
  const cleaned = String(value || '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^A-Za-z0-9-]/g, '')
    .toUpperCase();
  return cleaned || fallback;
}

function buildAutoSkuPrefix(schoolAbbr, locationLabel, assetLabel) {
  return [
    sanitizeSkuSegment(schoolAbbr, 'SCH'),
    sanitizeSkuSegment(locationLabel, 'LOC'),
    sanitizeSkuSegment(assetLabel, 'AST'),
  ].join('/');
}

function formatSkuWithSequence(prefix, sequence) {
  return `${prefix}/${String(sequence).padStart(5, '0')}`;
}

async function loadSchoolProfile(schoolId) {
  try {
    const [[row]] = await promisePool.query(
      `SELECT school_name, school_code FROM schools WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
      [schoolId]
    );
    return row || null;
  } catch (_) {
    return null;
  }
}

async function getNextSkuSequenceForPrefix(schoolId, registerYear, prefix) {
  const safePrefix = trimStr(prefix);
  if (!safePrefix) return 1;
  const like = `${safePrefix}/%`;
  const [rows] = await promisePool.query(
    `SELECT sku, serial_number, label_tag FROM school_assets
     WHERE school_id = ? AND deleted_at IS NULL AND register_year = ?
       AND (sku LIKE ? OR serial_number LIKE ? OR label_tag LIKE ?)`,
    [schoolId, registerYear, like, like, like]
  );
  let maxSeq = 0;
  const re = new RegExp(`^${safePrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/(\\d+)$`, 'i');
  rows.forEach((row) => {
    [row.sku, row.serial_number, row.label_tag].forEach((val) => {
      const m = String(val || '').trim().match(re);
      if (m) maxSeq = Math.max(maxSeq, Number(m[1]));
    });
  });
  return maxSeq + 1;
}

async function isTagSkuTaken(schoolId, registerYear, tagSku, excludeAssetId = null) {
  const value = trimStr(tagSku);
  if (!value) return false;
  const upper = value.toUpperCase();
  let sql = `SELECT id FROM school_assets
     WHERE school_id = ? AND deleted_at IS NULL AND register_year = ?
       AND (
         UPPER(TRIM(COALESCE(sku, ''))) = ?
         OR UPPER(TRIM(COALESCE(serial_number, ''))) = ?
         OR UPPER(TRIM(COALESCE(label_tag, ''))) = ?
       )`;
  const params = [schoolId, registerYear, upper, upper, upper];
  if (excludeAssetId != null && Number.isFinite(Number(excludeAssetId))) {
    sql += ' AND id != ?';
    params.push(Number(excludeAssetId));
  }
  sql += ' LIMIT 1';
  const [[row]] = await promisePool.query(sql, params);
  return Boolean(row);
}

async function resolveAutoSkuForBody(schoolId, registerYear, body) {
  const school = await loadSchoolProfile(schoolId);
  const schoolAbbr = abbreviateSchoolName(school?.school_name);
  const locationLabel = body.location_label || body.locationLabel || body.location;
  const assetLabel = body.label_tag || body.labelTag || body.asset_name || body.assetName;
  const prefix = buildAutoSkuPrefix(schoolAbbr, locationLabel, assetLabel);
  const excludeAssetId = body.exclude_asset_id ?? body.excludeAssetId ?? null;
  let seq = body._sku_start_sequence != null
    ? Number(body._sku_start_sequence) + Number(body._sku_index_offset || 0)
    : await getNextSkuSequenceForPrefix(schoolId, registerYear, prefix);

  let sku = formatSkuWithSequence(prefix, seq);
  let attempts = 0;
  while (await isTagSkuTaken(schoolId, registerYear, sku, excludeAssetId) && attempts < 10000) {
    seq += 1;
    sku = formatSkuWithSequence(prefix, seq);
    attempts += 1;
  }
  if (await isTagSkuTaken(schoolId, registerYear, sku, excludeAssetId)) {
    const err = new Error('Could not allocate a unique asset tag / SKU. Try manual mode or adjust labels.');
    err.status = 409;
    throw err;
  }
  return { sku, serial_number: sku, prefix, sequence: seq };
}

async function assertManualTagSkuAvailable(schoolId, registerYear, tagSku, excludeAssetId = null) {
  const value = trimStr(tagSku);
  if (!value) return;
  if (await isTagSkuTaken(schoolId, registerYear, value, excludeAssetId)) {
    const err = new Error(`Asset tag / SKU "${value}" is already used by another asset in FY ${registerYear}.`);
    err.status = 409;
    throw err;
  }
}

async function registerAssetsBulkWithLedger(schoolId, userId, body, quantity) {
  const qty = Math.min(Math.max(1, Number(quantity) || 1), 100);
  const skuMode = trimStr(body.sku_mode || body.skuMode || 'auto').toLowerCase();
  const categoryName = trimStr(body.category || body.categoryType || body.category_name);
  let registerYear = Number(body.register_year ?? body.registerYear);
  if (!Number.isFinite(registerYear)) {
    const entryMode = resolveAssetEntryMode(body);
    if (entryMode === 'legacy') {
      registerYear = resolveRegisterYear(body, null);
    } else {
      const finYear = await getActiveFinancialYear(schoolId);
      registerYear = finYear?.year ?? null;
    }
  }

  let skuPrefix = null;
  let skuStartSeq = 1;
  if (skuMode === 'auto') {
    const school = await loadSchoolProfile(schoolId);
    const schoolAbbr = abbreviateSchoolName(school?.school_name);
    skuPrefix = buildAutoSkuPrefix(
      schoolAbbr,
      body.location_label || body.locationLabel || body.location,
      body.label_tag || body.labelTag || body.asset_name || body.assetName,
    );
    skuStartSeq = await getNextSkuSequenceForPrefix(schoolId, registerYear, skuPrefix);
  }

  const manualBase = trimStr(body.serial_number || body.serialNumber || body.sku);
  if (skuMode !== 'auto' && !manualBase) {
    const err = new Error('Serial number / SKU is required in manual mode.');
    err.status = 400;
    throw err;
  }

  const created = [];
  let rollingOpening = null;
  let rollingAccumulated = null;

  for (let i = 0; i < qty; i += 1) {
    const itemBody = { ...body, quantity: 1 };
    if (skuMode === 'auto') {
      itemBody.sku_mode = 'auto';
      itemBody._sku_start_sequence = skuStartSeq;
      itemBody._sku_index_offset = i;
    } else if (qty > 1) {
      const suffix = String(i + 1).padStart(5, '0');
      const sku = `${manualBase}-${suffix}`;
      itemBody.sku = sku;
      itemBody.serial_number = sku;
    } else {
      itemBody.sku = manualBase;
      itemBody.serial_number = manualBase;
    }

    if (i > 0 && rollingOpening != null) {
      itemBody.rolling_opening = rollingOpening;
      itemBody.rolling_accumulated_dep = rollingAccumulated;
      itemBody._batch_rolling = true;
    }

    const result = await registerAssetWithLedger(schoolId, userId, itemBody, {
      deferRecalc: true,
      skipChainRecalc: true,
    });
    rollingOpening = result.calculation?.total_balance ?? result.calculation?.totalBalance;
    rollingAccumulated = result.calculation?.total_depreciation ?? result.calculation?.totalDep;
    created.push(result);
  }

  if (categoryName && Number.isFinite(registerYear)) {
    await recalcRegisterChainInCategory(schoolId, registerYear, categoryName);
    const finYear = await getFinancialYearByYear(schoolId, registerYear);
    if (finYear?.id) await recalcFinancialYearTotals(finYear.id, schoolId);
  }

  return created;
}

async function loadSchoolIdentifierSets(schoolId, registerYear = null) {
  let sql = `SELECT asset_code, label_tag, serial_number FROM school_assets
     WHERE school_id = ? AND deleted_at IS NULL`;
  const params = [schoolId];
  const yr = Number(registerYear);
  if (Number.isFinite(yr) && yr >= 1900 && yr <= 2100) {
    sql += ' AND register_year = ?';
    params.push(yr);
  }
  const [rows] = await promisePool.query(sql, params);
  const codes = new Set();
  const labels = new Set();
  const serials = new Set();
  rows.forEach((r) => {
    const c = trimStr(r.asset_code).toUpperCase();
    const l = trimStr(r.label_tag).toUpperCase();
    const s = trimStr(r.serial_number).toUpperCase();
    if (c) codes.add(c);
    if (l) labels.add(l);
    if (s) serials.add(s);
  });
  return { codes, labels, serials };
}

async function loadSchoolSkuSet(schoolId, registerYear) {
  const yr = Number(registerYear);
  if (!Number.isFinite(yr)) return new Set();
  const [rows] = await promisePool.query(
    `SELECT sku FROM school_assets
     WHERE school_id = ? AND deleted_at IS NULL AND register_year = ? AND sku IS NOT NULL AND sku != ''`,
    [schoolId, yr]
  );
  const skus = new Set();
  rows.forEach((r) => {
    const s = trimStr(r.sku).toUpperCase();
    if (s) skus.add(s);
  });
  return skus;
}

function resolveImportCategoryName(rawCategory, rawType, knownCategories = []) {
  const explicit = trimStr(rawCategory);
  if (explicit) return explicit;

  const typeRaw = trimStr(rawType);
  if (!typeRaw) return '';

  const typeUpper = typeRaw.toUpperCase();
  const typeMap = {
    BUILDING: 'Buildings',
    BUILDINGS: 'Buildings',
    FURNITURE: 'Furniture',
    VEHICLE: 'Vehicles',
    VEHICLES: 'Vehicles',
    'ICT & ELECTRONICS': 'IT Equipment',
    'LAB EQUIPMENT': 'Laboratory Equipment',
    MACHINERY: 'Machinery',
    'OFFICE EQUIPMENT': 'Office Equipment',
    ELECTRONICS: 'Electronics',
    LAND: 'Land',
  };
  if (typeMap[typeUpper]) return typeMap[typeUpper];

  const norm = (s) => String(s || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const typeNorm = norm(typeRaw);
  for (const name of knownCategories) {
    const nameNorm = norm(name);
    if (!nameNorm) continue;
    if (nameNorm === typeNorm || nameNorm === `${typeNorm}s` || `${nameNorm}s` === typeNorm) return name;
    if (nameNorm.replace(/s$/, '') === typeNorm.replace(/s$/, '')) return name;
  }
  return typeRaw;
}

function findSkuDuplicateIssues(p, skuSet, fileSeenSkus, { allowMissingSku = false } = {}) {
  const issues = [];
  const sku = trimStr(p.sku).toUpperCase();
  if (!sku) {
    if (!allowMissingSku) issues.push('SKU is required');
    return issues;
  }
  if (skuSet.has(sku)) issues.push(`SKU "${p.sku}" already exists in this register year`);
  if (fileSeenSkus.has(sku)) issues.push(`Duplicate SKU in file: ${p.sku}`);
  else fileSeenSkus.add(sku);
  return issues;
}

function findDuplicateIssues(p, sets, fileSeen) {
  const issues = [];
  const code = trimStr(p.asset_code).toUpperCase();
  const label = trimStr(p.label_tag).toUpperCase();
  const serial = trimStr(p.serial_number).toUpperCase();

  if (code) {
    if (sets.codes.has(code)) issues.push(`Asset code "${p.asset_code}" already exists in this register year`);
    if (fileSeen.codes.has(code)) issues.push(`Duplicate asset code in file: ${p.asset_code}`);
    fileSeen.codes.add(code);
  }
  if (label) {
    if (sets.labels.has(label)) issues.push(`Asset tag "${p.label_tag}" already exists in this register year`);
    if (fileSeen.labels.has(label)) issues.push(`Duplicate asset tag in file: ${p.label_tag}`);
    fileSeen.labels.add(label);
  }
  if (serial) {
    if (sets.serials.has(serial)) issues.push(`Serial number "${p.serial_number}" already exists in this register year`);
    if (fileSeen.serials.has(serial)) issues.push(`Duplicate serial in file: ${p.serial_number}`);
    fileSeen.serials.add(serial);
  }
  return issues;
}

async function loadPublicAssetScan({ id, code }) {
  let assetId = Number(id);
  const codeStr = trimStr(code || '');
  if (!Number.isFinite(assetId) && codeStr) {
    const [[row]] = await promisePool.query(
      `SELECT id FROM school_assets
       WHERE deleted_at IS NULL AND asset_code = ? LIMIT 1`,
      [codeStr]
    );
    assetId = row?.id;
  }
  if (!Number.isFinite(assetId)) return null;
  const [[row]] = await promisePool.query(
    `SELECT id, asset_code, asset_name, label_tag, serial_number, category, asset_health_status
     FROM school_assets WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
    [assetId]
  );
  if (!row) return null;
  return {
    id: row.id,
    asset_name: row.asset_name,
    asset_code: row.asset_code,
    label_tag: row.label_tag,
    serial_number: row.serial_number,
    category: row.category,
    asset_health_status: row.asset_health_status || DEFAULT_ASSET_HEALTH_STATUS,
    qr_payload: buildQrValue(row),
  };
}

/** Public QR lookup — no auth; name + asset code payload only */
router.get('/public/school/assets/scan', async (req, res) => {
  try {
    await ensureAssetsTable();
    const id = req.query.id || req.query.asset;
    const code = req.query.code || req.query.asset_code;
    const data = await loadPublicAssetScan({ id, code });
    if (!data) {
      return res.status(404).json({ success: false, message: 'Asset not found for this QR code' });
    }
    res.json({ success: true, data });
  } catch (err) {
    console.error('GET /public/school/assets/scan:', err);
    res.status(500).json({ success: false, message: err.message || 'Scan lookup failed' });
  }
});

/** Only handle /api/school/assets/* — pass other /api traffic to later routers (e.g. schools, locations). */
function isSchoolAssetsPath(req) {
  const orig = String(req.originalUrl || '').split('?')[0];
  if (/^\/api\/school\/assets(\/|$)/i.test(orig)) return true;
  const p = String(req.path || req.url || '').split('?')[0];
  return /^\/school\/assets(\/|$)/i.test(p);
}

router.use((req, res, next) => {
  if (!isSchoolAssetsPath(req)) return next('router');
  next();
});

router.use(async (req, res, next) => {
  try {
    await ensureAssetsTable();
    await ensureCategoriesTable();
    await ensureAssignmentsTable();
    await ensureMaintenanceTable();
    await ensureTransfersTable();
    await ensureReplacementsTable();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) {
      return res.status(400).json({ success: false, message: 'No school linked to this account' });
    }
    req.ctx = {
      ...(req.ctx || {}),
      schoolId,
      userId: resolveUserId(req),
    };
    next();
  } catch (err) {
    console.error('[schoolAssets] middleware:', err);
    res.status(500).json({ success: false, message: 'Assets module unavailable' });
  }
});

router.get('/school/assets/meta', requireRole(ASSETS_READ_ROLES), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const [locRows] = await promisePool.query(
      `SELECT DISTINCT location FROM school_assets
       WHERE school_id = ? AND deleted_at IS NULL AND location IS NOT NULL AND location != ''
       ORDER BY location LIMIT 200`,
      [schoolId]
    );
    const [supRows] = await promisePool.query(
      `SELECT DISTINCT supplier_name FROM school_assets
       WHERE school_id = ? AND deleted_at IS NULL AND supplier_name IS NOT NULL AND supplier_name != ''
       ORDER BY supplier_name LIMIT 200`,
      [schoolId]
    );
    const categoryList = await loadCategoriesWithCounts(schoolId);
    const categories = categoryList.map((c) => c.name);
    const [yearRows] = await promisePool.query(
      `SELECT DISTINCT register_year AS y FROM school_assets
       WHERE school_id = ? AND deleted_at IS NULL AND register_year IS NOT NULL
       ORDER BY y DESC LIMIT 30`,
      [schoolId]
    );
    const dbYears = yearRows.map((r) => Number(r.y)).filter((y) => y > 0);
    const cy = currentCalendarYear();
    const registerYears = [...new Set([cy, cy + 1, ...dbYears])].sort((a, b) => b - a);
    res.json({
      success: true,
      data: {
        locations: locRows.map((r) => formatLocationValue(r.location)).filter(Boolean),
        suppliers: supRows.map((r) => r.supplier_name),
        categories,
        category_list: categoryList,
        category_icons: VALID_CATEGORY_ICONS,
        register_years: registerYears,
        current_register_year: cy,
        types: [
          'BUILDING', 'FURNITURE', 'ICT & ELECTRONICS', 'LAB EQUIPMENT', 'VEHICLES', 'MACHINERY',
          'EDUCATIONAL MATERIALS', 'CLEANING TOOLS', 'OFFICE EQUIPMENT', 'UTILITIES', 'SPORTS',
          'INTANGIBLE ASSETS', 'OTHER',
        ],
        units: ['PCS', 'SET', 'BOX', 'KG', 'METER'],
        conditions: ['GOOD', 'FAIR', 'DAMAGED'],
        funding_sources: ['Government Budget', 'Donor Funded', 'Internal Revenue', 'Grant', 'Other'],
        depreciation_modes: ['Straight Line', 'Diminishing'],
      },
    });
  } catch (err) {
    console.error('GET /school/assets/meta:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to load meta' });
  }
});

router.get('/school/assets/categories', requireRole(ASSETS_READ_ROLES), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const data = await loadCategoriesWithCounts(schoolId);
    res.json({ success: true, data });
  } catch (err) {
    console.error('GET /school/assets/categories:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to load categories' });
  }
});

router.post('/school/assets/categories', requireRole(ASSETS_WRITE_ROLES), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const name = trimStr(req.body?.name);
    const icon = trimStr(req.body?.icon) || 'Monitor';
    const description = trimStr(req.body?.description) || null;
    const depRate = parseDepreciationRate(req.body);
    if (!name) return res.status(400).json({ success: false, message: 'Category name is required' });
    if (!VALID_CATEGORY_ICONS.includes(icon)) {
      return res.status(400).json({ success: false, message: 'Invalid icon' });
    }
    if (req.body?.depreciation_rate != null || req.body?.depreciationRate != null) {
      if (depRate === null) {
        return res.status(400).json({ success: false, message: 'Depreciation rate must be between 0 and 100' });
      }
    }
    const [result] = await promisePool.query(
      `INSERT INTO school_asset_categories (school_id, name, icon, description, depreciation_rate) VALUES (?,?,?,?,?)`,
      [schoolId, name, icon, description, depRate ?? 5]
    );
    const [[row]] = await promisePool.query(
      `SELECT * FROM school_asset_categories WHERE id = ? AND school_id = ? LIMIT 1`,
      [result.insertId, schoolId]
    );
    res.status(201).json({ success: true, message: 'Category created', data: mapCategoryRow(row, 0) });
  } catch (err) {
    if (err?.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'Category name already exists' });
    }
    console.error('POST /school/assets/categories:', err);
    res.status(500).json({ success: false, message: err.message || 'Create failed' });
  }
});

router.patch('/school/assets/categories/:id', requireRole(ASSETS_WRITE_ROLES), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const id = Number(req.params.id);
    const name = trimStr(req.body?.name);
    const icon = trimStr(req.body?.icon);
    const description = req.body?.description != null ? trimStr(req.body.description) : undefined;
    const depRateInput = req.body?.depreciation_rate ?? req.body?.depreciationRate;
    const depRate = depRateInput !== undefined ? parseDepreciationRate(req.body) : undefined;
    const [[existing]] = await promisePool.query(
      `SELECT * FROM school_asset_categories WHERE id = ? AND school_id = ? AND deleted_at IS NULL LIMIT 1`,
      [id, schoolId]
    );
    if (!existing) return res.status(404).json({ success: false, message: 'Category not found' });
    const newName = name || existing.name;
    const newIcon = icon && VALID_CATEGORY_ICONS.includes(icon) ? icon : existing.icon;
    const newDesc = description !== undefined ? (description || null) : existing.description;
    if (depRateInput !== undefined && depRate === null) {
      return res.status(400).json({ success: false, message: 'Depreciation rate must be between 0 and 100' });
    }
    const newDepRate = depRate !== undefined ? depRate : existing.depreciation_rate;
    await promisePool.query(
      `UPDATE school_asset_categories SET name = ?, icon = ?, description = ?, depreciation_rate = ?, updated_at = NOW()
       WHERE id = ? AND school_id = ?`,
      [newName, newIcon, newDesc, newDepRate, id, schoolId]
    );
    if (newName !== existing.name) {
      await promisePool.query(
        `UPDATE school_assets SET category = ? WHERE school_id = ? AND category = ? AND deleted_at IS NULL`,
        [newName, schoolId, existing.name]
      );
    }
    const list = await loadCategoriesWithCounts(schoolId);
    const updated = list.find((c) => c.id === id);
    res.json({ success: true, message: 'Category updated', data: updated || mapCategoryRow({ ...existing, name: newName, icon: newIcon, description: newDesc }) });
  } catch (err) {
    if (err?.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'Category name already exists' });
    }
    console.error('PATCH /school/assets/categories/:id:', err);
    res.status(500).json({ success: false, message: err.message || 'Update failed' });
  }
});

router.delete('/school/assets/categories/:id', requireRole(ASSETS_WRITE_ROLES), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const id = Number(req.params.id);
    const [[existing]] = await promisePool.query(
      `SELECT name FROM school_asset_categories WHERE id = ? AND school_id = ? AND deleted_at IS NULL LIMIT 1`,
      [id, schoolId]
    );
    if (!existing) return res.status(404).json({ success: false, message: 'Category not found' });
    const [[{ c }]] = await promisePool.query(
      `SELECT COUNT(*) AS c FROM school_assets WHERE school_id = ? AND deleted_at IS NULL AND category = ?`,
      [schoolId, existing.name]
    );
    if (Number(c) > 0) {
      return res.status(409).json({
        success: false,
        message: `Cannot delete — ${c} asset(s) use this category. Reassign them first.`,
      });
    }
    await promisePool.query(
      `UPDATE school_asset_categories SET deleted_at = NOW() WHERE id = ? AND school_id = ?`,
      [id, schoolId]
    );
    res.json({ success: true, message: 'Category removed' });
  } catch (err) {
    console.error('DELETE /school/assets/categories/:id:', err);
    res.status(500).json({ success: false, message: err.message || 'Delete failed' });
  }
});

router.get('/school/assets/financial-years', requireRole(ASSETS_READ_ROLES), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    await ensureFinancialYearsTable();
    const [rows] = await promisePool.query(
      `SELECT * FROM school_asset_financial_years
       WHERE school_id = ? AND deleted_at IS NULL
       ORDER BY year DESC`,
      [schoolId]
    );
    const data = [];
    for (const row of rows) {
      const balances = await loadCategoryBalancesForYear(row.id, schoolId);
      data.push(mapFinancialYearRow(row, balances));
    }
    res.json({ success: true, data });
  } catch (err) {
    console.error('GET /school/assets/financial-years:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to load financial years' });
  }
});

router.get('/school/assets/financial-years/active', requireRole(ASSETS_READ_ROLES), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const active = await getActiveFinancialYear(schoolId);
    res.json({ success: true, data: active });
  } catch (err) {
    console.error('GET /school/assets/financial-years/active:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to load active year' });
  }
});

router.get('/school/assets/financial-years/category-opening', requireRole(ASSETS_READ_ROLES), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const year = Number(req.query.year);
    const category = trimStr(req.query.category || req.query.category_name);
    if (!Number.isFinite(year) || year < 1900 || year > 2100) {
      return res.status(400).json({ success: false, message: 'Valid year is required' });
    }
    if (!category) {
      return res.status(400).json({ success: false, message: 'Category is required' });
    }
    const ctx = await resolveCategoryOpeningContext(schoolId, year, category);
    const [[catRow]] = await promisePool.query(
      `SELECT depreciation_rate FROM school_asset_categories
       WHERE school_id = ? AND deleted_at IS NULL AND name = ? LIMIT 1`,
      [schoolId, category]
    );
    res.json({
      success: true,
      data: {
        ...ctx,
        depreciation_rate: catRow?.depreciation_rate != null ? Number(catRow.depreciation_rate) : 5,
      },
    });
  } catch (err) {
    console.error('GET /school/assets/financial-years/category-opening:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to load opening context' });
  }
});

router.get('/school/assets/financial-years/opening-preview', requireRole(ASSETS_READ_ROLES), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const year = Number(req.query.year);
    if (!Number.isFinite(year) || year < 1900 || year > 2100) {
      return res.status(400).json({ success: false, message: 'Valid year is required' });
    }
    const preview = await buildOpeningPreview(schoolId, year);
    const [[prevYear]] = await promisePool.query(
      `SELECT * FROM school_asset_financial_years
       WHERE school_id = ? AND deleted_at IS NULL AND year = ? LIMIT 1`,
      [schoolId, year - 1]
    );
    res.json({
      success: true,
      data: {
        year,
        previous_year: prevYear ? mapFinancialYearRow(prevYear) : null,
        categories: preview,
      },
    });
  } catch (err) {
    console.error('GET /school/assets/financial-years/opening-preview:', err);
    res.status(500).json({ success: false, message: err.message || 'Preview failed' });
  }
});

async function purgeSoftDeletedFinancialYearSlot(schoolId, year) {
  const yr = Number(year);
  if (!Number.isFinite(yr)) return;
  const [ghostRows] = await promisePool.query(
    `SELECT id FROM school_asset_financial_years
     WHERE school_id = ? AND year = ? AND deleted_at IS NOT NULL`,
    [schoolId, yr]
  );
  for (const ghost of ghostRows) {
    await promisePool.query(
      `DELETE FROM school_asset_year_category_balances WHERE financial_year_id = ? AND school_id = ?`,
      [ghost.id, schoolId]
    );
    await promisePool.query(
      `DELETE FROM school_asset_financial_years WHERE id = ? AND school_id = ?`,
      [ghost.id, schoolId]
    );
  }
}

router.post('/school/assets/financial-years', requireRole(ASSETS_WRITE_ROLES), async (req, res) => {
  try {
    const { schoolId, userId } = req.ctx;
    await ensureFinancialYearsTable();
    const body = req.body || {};
    const year = Number(body.year);
    const startDate = toDateOnly(body.start_date || body.startDate);
    const endDate = toDateOnly(body.end_date || body.endDate);
    if (!Number.isFinite(year) || year < 1900 || year > 2100) {
      return res.status(400).json({ success: false, message: 'Valid financial year is required' });
    }
    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'Start and end dates are required' });
    }
    const [[exists]] = await promisePool.query(
      `SELECT id FROM school_asset_financial_years WHERE school_id = ? AND year = ? AND deleted_at IS NULL LIMIT 1`,
      [schoolId, year]
    );
    if (exists) return res.status(409).json({ success: false, message: 'Financial year already exists' });

    await purgeSoftDeletedFinancialYearSlot(schoolId, year);

    const autoCarry = body.auto_carry_forward !== false && body.autoCarryForward !== false;
    const lockPrev = body.lock_previous_year !== false && body.lockPreviousYear !== false;
    const depMethod = normalizeDepMethod(body.dep_method || body.depMethod);
    const description = trimStr(body.description) || null;
    const balancesInput = Array.isArray(body.category_balances) ? body.category_balances
      : Array.isArray(body.categoryBalances) ? body.categoryBalances : [];
    const preview = await buildOpeningPreview(schoolId, year);
    const previewMap = new Map(preview.map((p) => [p.category_name, p]));

    const [result] = await promisePool.query(
      `INSERT INTO school_asset_financial_years (
        school_id, year, start_date, end_date, description, dep_method,
        auto_carry_forward, lock_previous_year, status, created_by
      ) VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [schoolId, year, startDate, endDate, description, depMethod, autoCarry ? 1 : 0, lockPrev ? 1 : 0, 'Active', userId]
    );
    const financialYearId = result.insertId;

    await promisePool.query(
      `UPDATE school_asset_financial_years SET status = 'Closed', locked_at = NOW()
       WHERE school_id = ? AND id != ? AND status = 'Active' AND deleted_at IS NULL`,
      [schoolId, financialYearId]
    );

    if (lockPrev) {
      await promisePool.query(
        `UPDATE school_asset_financial_years SET status = 'Closed', locked_at = COALESCE(locked_at, NOW())
         WHERE school_id = ? AND year < ? AND deleted_at IS NULL`,
        [schoolId, year]
      );
    }

    const balanceRows = balancesInput.length ? balancesInput : preview;
    for (const b of balanceRows) {
      const catName = trimStr(b.category || b.category_name);
      if (!catName) continue;
      const fromPreview = previewMap.get(catName);
      const opening = autoCarry
        ? toMoney(b.opening_balance ?? b.opening ?? fromPreview?.opening_balance)
        : toMoney(b.opening_balance ?? b.opening);
      const lastClosing = toMoney(b.last_year_closing ?? b.lastYearClosing ?? fromPreview?.last_year_closing);
      const rate = toMoney(b.depreciation_rate ?? fromPreview?.depreciation_rate ?? 5);
      const prevAccDep = toMoney(b.previous_accumulated_depreciation ?? b.accumulated_depreciation ?? fromPreview?.accumulated_depreciation);
      await promisePool.query(
        `INSERT INTO school_asset_year_category_balances (
          financial_year_id, school_id, category_id, category_name, depreciation_rate,
          opening_balance, last_year_closing, purchases, accumulated_depreciation,
          accumulated_depreciation_start, annual_depreciation, closing_balance
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          financialYearId, schoolId, b.category_id || fromPreview?.category_id || null, catName, rate,
          opening, lastClosing, 0, prevAccDep, prevAccDep, 0, opening - prevAccDep,
        ]
      );
    }

    await recalcFinancialYearTotals(financialYearId, schoolId);
    const [[row]] = await promisePool.query(
      `SELECT * FROM school_asset_financial_years WHERE id = ? LIMIT 1`,
      [financialYearId]
    );
    const balances = await loadCategoryBalancesForYear(financialYearId, schoolId);
    res.status(201).json({
      success: true,
      message: 'Financial year created',
      data: mapFinancialYearRow(row, balances),
    });
  } catch (err) {
    if (err?.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'Financial year already exists' });
    }
    console.error('POST /school/assets/financial-years:', err);
    res.status(500).json({ success: false, message: err.message || 'Create failed' });
  }
});

router.patch('/school/assets/financial-years/:id', requireRole(ASSETS_WRITE_ROLES), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const id = Number(req.params.id);
    await ensureFinancialYearsTable();
    const body = req.body || {};
    const [[row]] = await promisePool.query(
      `SELECT * FROM school_asset_financial_years WHERE id = ? AND school_id = ? AND deleted_at IS NULL LIMIT 1`,
      [id, schoolId]
    );
    if (!row) return res.status(404).json({ success: false, message: 'Financial year not found' });

    const startDate = toDateOnly(body.start_date ?? body.startDate) || toDateOnly(row.start_date);
    const endDate = toDateOnly(body.end_date ?? body.endDate) || toDateOnly(row.end_date);
    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'Start and end dates are required' });
    }

    const depMethod = body.dep_method != null || body.depMethod != null
      ? normalizeDepMethod(body.dep_method || body.depMethod)
      : row.dep_method;
    const description = body.description !== undefined ? (trimStr(body.description) || null) : row.description;
    const autoCarry = body.auto_carry_forward !== undefined
      ? (body.auto_carry_forward !== false && body.autoCarryForward !== false)
      : !!row.auto_carry_forward;
    const lockPrev = body.lock_previous_year !== undefined
      ? (body.lock_previous_year !== false && body.lockPreviousYear !== false)
      : !!row.lock_previous_year;

    await promisePool.query(
      `UPDATE school_asset_financial_years SET
        start_date = ?, end_date = ?, description = ?, dep_method = ?,
        auto_carry_forward = ?, lock_previous_year = ?, updated_at = NOW()
       WHERE id = ? AND school_id = ?`,
      [startDate, endDate, description, depMethod, autoCarry ? 1 : 0, lockPrev ? 1 : 0, id, schoolId]
    );

    const balancesInput = Array.isArray(body.category_balances) ? body.category_balances
      : Array.isArray(body.categoryBalances) ? body.categoryBalances : null;
    if (balancesInput?.length) {
      for (const b of balancesInput) {
        const catName = trimStr(b.category || b.category_name);
        if (!catName) continue;
        const opening = toMoney(b.opening_balance ?? b.opening);
        const lastClosing = toMoney(b.last_year_closing ?? b.lastYearClosing);
        const rate = b.depreciation_rate != null ? toMoney(b.depreciation_rate) : null;
        const [[existing]] = await promisePool.query(
          `SELECT * FROM school_asset_year_category_balances
           WHERE financial_year_id = ? AND school_id = ? AND category_name = ? LIMIT 1`,
          [id, schoolId, catName]
        );
        const accDepInput = toMoney(
          b.accumulated_depreciation ?? b.previous_accumulated_depreciation ?? b.total_depreciation_start
        );
        if (existing) {
          const purchases = toMoney(existing.purchases);
          const accDep = accDepInput || toMoney(existing.accumulated_depreciation);
          const newClosing = opening + purchases - accDep;
          await promisePool.query(
            `UPDATE school_asset_year_category_balances SET
              opening_balance = ?,
              last_year_closing = COALESCE(?, last_year_closing),
              depreciation_rate = COALESCE(?, depreciation_rate),
              accumulated_depreciation = ?,
              accumulated_depreciation_start = ?,
              closing_balance = ?
             WHERE id = ?`,
            [opening, lastClosing || null, rate, accDep, accDep, newClosing, existing.id]
          );
        } else {
          const accDep = accDepInput;
          await promisePool.query(
            `INSERT INTO school_asset_year_category_balances (
              financial_year_id, school_id, category_id, category_name, depreciation_rate,
              opening_balance, last_year_closing, purchases, accumulated_depreciation,
              accumulated_depreciation_start, annual_depreciation, closing_balance
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
            [
              id, schoolId, b.category_id || null, catName, rate ?? 5,
              opening, lastClosing, 0, accDep, accDep, 0, opening + 0 - accDep,
            ]
          );
        }
      }
    }

    await recalcFinancialYearTotals(id, schoolId);
    const [[updated]] = await promisePool.query(`SELECT * FROM school_asset_financial_years WHERE id = ?`, [id]);
    const balances = await loadCategoryBalancesForYear(id, schoolId);
    res.json({ success: true, message: 'Financial year updated', data: mapFinancialYearRow(updated, balances) });
  } catch (err) {
    console.error('PATCH /school/assets/financial-years/:id:', err);
    res.status(500).json({ success: false, message: err.message || 'Update failed' });
  }
});

router.patch('/school/assets/financial-years/:id/reopen', requireRole(ASSETS_WRITE_ROLES), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const id = Number(req.params.id);
    await ensureFinancialYearsTable();
    const [[row]] = await promisePool.query(
      `SELECT * FROM school_asset_financial_years WHERE id = ? AND school_id = ? AND deleted_at IS NULL LIMIT 1`,
      [id, schoolId]
    );
    if (!row) return res.status(404).json({ success: false, message: 'Financial year not found' });
    if (row.status === 'Active') {
      return res.status(400).json({ success: false, message: 'Year is already active' });
    }

    await promisePool.query(
      `UPDATE school_asset_financial_years SET status = 'Closed', locked_at = COALESCE(locked_at, NOW()), updated_at = NOW()
       WHERE school_id = ? AND id != ? AND status = 'Active' AND deleted_at IS NULL`,
      [schoolId, id]
    );
    await promisePool.query(
      `UPDATE school_asset_financial_years SET status = 'Active', locked_at = NULL, updated_at = NOW()
       WHERE id = ? AND school_id = ?`,
      [id, schoolId]
    );

    const [[updated]] = await promisePool.query(`SELECT * FROM school_asset_financial_years WHERE id = ?`, [id]);
    const balances = await loadCategoryBalancesForYear(id, schoolId);
    res.json({ success: true, message: 'Financial year reopened', data: mapFinancialYearRow(updated, balances) });
  } catch (err) {
    console.error('PATCH /school/assets/financial-years/:id/reopen:', err);
    res.status(500).json({ success: false, message: err.message || 'Reopen failed' });
  }
});

router.patch('/school/assets/financial-years/:id/close', requireRole(ASSETS_WRITE_ROLES), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const id = Number(req.params.id);
    await ensureFinancialYearsTable();
    const [[row]] = await promisePool.query(
      `SELECT * FROM school_asset_financial_years WHERE id = ? AND school_id = ? AND deleted_at IS NULL LIMIT 1`,
      [id, schoolId]
    );
    if (!row) return res.status(404).json({ success: false, message: 'Financial year not found' });
    if (row.status === 'Closed') {
      return res.status(400).json({ success: false, message: 'Year is already closed' });
    }
    await recalcFinancialYearTotals(id, schoolId);
    await promisePool.query(
      `UPDATE school_asset_financial_years SET status = 'Closed', locked_at = NOW(), updated_at = NOW()
       WHERE id = ? AND school_id = ?`,
      [id, schoolId]
    );
    const [[updated]] = await promisePool.query(`SELECT * FROM school_asset_financial_years WHERE id = ?`, [id]);
    const balances = await loadCategoryBalancesForYear(id, schoolId);
    res.json({ success: true, message: 'Financial year closed', data: mapFinancialYearRow(updated, balances) });
  } catch (err) {
    console.error('PATCH /school/assets/financial-years/:id/close:', err);
    res.status(500).json({ success: false, message: err.message || 'Close failed' });
  }
});

router.delete('/school/assets/financial-years/:id', requireRole(ASSETS_WRITE_ROLES), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const id = Number(req.params.id);
    await ensureFinancialYearsTable();
    const [[row]] = await promisePool.query(
      `SELECT * FROM school_asset_financial_years WHERE id = ? AND school_id = ? AND deleted_at IS NULL LIMIT 1`,
      [id, schoolId]
    );
    if (!row) return res.status(404).json({ success: false, message: 'Financial year not found' });

    const [[assetRow]] = await promisePool.query(
      `SELECT COUNT(*) AS c FROM school_assets
       WHERE school_id = ? AND deleted_at IS NULL AND status != 'Draft' AND register_year = ?`,
      [schoolId, row.year]
    );
    const assetCount = Number(assetRow?.c || 0);
    if (assetCount > 0) {
      return res.status(409).json({
        success: false,
        message: `Cannot delete — ${assetCount} asset(s) are registered in FY ${row.year}. Remove or reassign them first.`,
      });
    }

    await promisePool.query(
      `DELETE FROM school_asset_year_category_balances WHERE financial_year_id = ? AND school_id = ?`,
      [id, schoolId]
    );
    await promisePool.query(
      `DELETE FROM school_asset_financial_years WHERE id = ? AND school_id = ?`,
      [id, schoolId]
    );

    res.json({
      success: true,
      message: `Financial year ${row.year} / ${row.year + 1} deleted`,
      data: { id, year: row.year },
    });
  } catch (err) {
    console.error('DELETE /school/assets/financial-years/:id:', err);
    res.status(500).json({ success: false, message: err.message || 'Delete failed' });
  }
});

router.post('/school/assets/simple', requireRole(ASSETS_WRITE_ROLES), async (req, res) => {
  try {
    const { schoolId, userId } = req.ctx;
    const data = await registerAssetWithLedger(schoolId, userId, req.body || {});
    res.status(201).json({ success: true, message: 'Asset registered', data });
  } catch (err) {
    if (err?.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'Asset code already exists' });
    }
    if (err?.status) return res.status(err.status).json({ success: false, message: err.message });
    console.error('POST /school/assets/simple:', err);
    res.status(500).json({ success: false, message: err.message || 'Create failed' });
  }
});

router.get('/school/assets/test/stats', requireRole(ASSETS_READ_ROLES), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    await ensureFinancialYearsTable();
    const [[totals]] = await promisePool.query(
      `SELECT
         COUNT(*) AS total_count,
         COALESCE(SUM(unit_price), 0) AS total_purchase,
         COALESCE(SUM(net_book_value), 0) AS total_net_book,
         COALESCE(SUM(tax_amount), 0) AS total_tax
       FROM school_assets WHERE school_id = ? AND deleted_at IS NULL AND status != 'Draft'`,
      [schoolId]
    );
    const [byYear] = await promisePool.query(
      `SELECT register_year AS year, COUNT(*) AS count, COALESCE(SUM(unit_price), 0) AS purchase_value
       FROM school_assets WHERE school_id = ? AND deleted_at IS NULL AND status != 'Draft'
       GROUP BY register_year ORDER BY register_year DESC LIMIT 10`,
      [schoolId]
    );
    const [byCategory] = await promisePool.query(
      `SELECT category, COUNT(*) AS count, COALESCE(SUM(unit_price), 0) AS purchase_value
       FROM school_assets WHERE school_id = ? AND deleted_at IS NULL AND status != 'Draft'
       GROUP BY category ORDER BY count DESC LIMIT 12`,
      [schoolId]
    );
    const activeYear = await getActiveFinancialYear(schoolId);
    res.json({
      success: true,
      data: {
        total_count: Number(totals?.total_count || 0),
        total_purchase: toMoney(totals?.total_purchase),
        total_net_book: toMoney(totals?.total_net_book),
        total_tax: toMoney(totals?.total_tax),
        active_financial_year: activeYear?.year ?? null,
        active_year_status: activeYear?.status ?? null,
        by_year: byYear.map((r) => ({
          year: Number(r.year),
          count: Number(r.count),
          purchase_value: toMoney(r.purchase_value),
        })),
        by_category: byCategory.map((r) => ({
          category: r.category,
          count: Number(r.count),
          purchase_value: toMoney(r.purchase_value),
        })),
      },
    });
  } catch (err) {
    console.error('GET /school/assets/test/stats:', err);
    res.status(500).json({ success: false, message: err.message || 'Stats failed' });
  }
});

router.get('/school/assets/test/meta', requireRole(ASSETS_READ_ROLES), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    await ensureFinancialYearsTable();
    await seedDefaultCategoriesIfEmpty(schoolId);
    const categories = await loadCategoriesWithCounts(schoolId);
    const [yearRows] = await promisePool.query(
      `SELECT * FROM school_asset_financial_years
       WHERE school_id = ? AND deleted_at IS NULL ORDER BY year DESC`,
      [schoolId]
    );
    const activeYear = await getActiveFinancialYear(schoolId);
    const schoolProfile = await loadSchoolProfile(schoolId);
    res.json({
      success: true,
      data: {
        categories,
        financial_years: yearRows.map((r) => mapFinancialYearRow(r)),
        active_financial_year: activeYear,
        school: schoolProfile
          ? {
            name: schoolProfile.school_name,
            code: schoolProfile.school_code,
            abbreviation: abbreviateSchoolName(schoolProfile.school_name),
          }
          : null,
      },
    });
  } catch (err) {
    console.error('GET /school/assets/test/meta:', err);
    res.status(500).json({ success: false, message: err.message || 'Meta failed' });
  }
});

router.get('/school/assets/test/opening', requireRole(ASSETS_READ_ROLES), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const year = Number(req.query.year);
    const category = trimStr(req.query.category || req.query.category_name);
    const entryMode = resolveAssetEntryMode({
      entry_mode: req.query.entry_mode || req.query.mode,
      first_time: req.query.first_time === 'false' ? false : undefined,
    });
    if (!Number.isFinite(year) || !category) {
      return res.status(400).json({ success: false, message: 'Year and category are required' });
    }
    const ctx = entryMode === 'legacy'
      ? await resolveAssetBasedOpeningContext(schoolId, year, category)
      : await resolveCategoryOpeningContext(schoolId, year, category);
    const [[catRow]] = await promisePool.query(
      `SELECT depreciation_rate FROM school_asset_categories
       WHERE school_id = ? AND deleted_at IS NULL AND name = ? LIMIT 1`,
      [schoolId, category]
    );
    res.json({
      success: true,
      data: {
        ...ctx,
        depreciation_rate: catRow?.depreciation_rate != null ? Number(catRow.depreciation_rate) : 5,
      },
    });
  } catch (err) {
    console.error('GET /school/assets/test/opening:', err);
    res.status(500).json({ success: false, message: err.message || 'Opening failed' });
  }
});

function buildTestAssetsFilterClause(query, schoolId) {
  const qRaw = trimStr(query.q);
  const category = trimStr(query.category);
  const assetsStatus = trimStr(query.assets_status || query.assetsStatus);
  const healthStatus = trimStr(query.asset_health_status || query.assetHealthStatus);
  const registerYear = trimStr(query.register_year || query.registerYear);
  const oldNotReplaced = ['1', 'true', 'yes'].includes(
    String(query.old_not_replaced || query.oldNotReplaced || '').toLowerCase()
  );

  let clause = `school_id = ? AND deleted_at IS NULL AND status != 'Draft'`;
  const params = [schoolId];
  if (category) { clause += ' AND category = ?'; params.push(category); }
  if (assetsStatus) { clause += ' AND assets_status = ?'; params.push(assetsStatus); }
  if (healthStatus) { clause += ' AND asset_health_status = ?'; params.push(healthStatus); }
  if (oldNotReplaced) {
    clause += ` AND asset_health_status = 'Not Used (Old)'
      AND (replaced_by_asset_id IS NULL OR replaced_by_asset_id = 0)
      AND COALESCE(status, '') != 'Replaced'`;
  }
  if (registerYear) { clause += ' AND register_year = ?'; params.push(Number(registerYear) || registerYear); }
  const dateParts = [];
  appendSqlDateFilter(dateParts, params, query, 'DATE(COALESCE(purchase_date, created_at))');
  if (dateParts.length) clause += ` AND ${dateParts.join(' AND ')}`;
  if (qRaw) {
    const like = `%${qRaw.toLowerCase()}%`;
    clause += ` AND (
      LOWER(asset_name) LIKE ? OR LOWER(asset_code) LIKE ?
      OR LOWER(label_tag) LIKE ? OR LOWER(serial_number) LIKE ?
    )`;
    params.push(like, like, like, like);
  }
  return { clause, params };
}

function appendSqlDateFilter(parts, params, query, dateColumnSql) {
  const dateFrom = trimStr(query.date_from || query.dateFrom);
  const dateTo = trimStr(query.date_to || query.dateTo);
  const dateMonth = trimStr(query.date_month || query.dateMonth);
  const dateYear = trimStr(query.date_year || query.dateYear);
  const dateRange = trimStr(query.date_range || query.dateRange);

  if (dateFrom && dateTo) {
    parts.push(`${dateColumnSql} >= ? AND ${dateColumnSql} <= ?`);
    params.push(dateFrom, dateTo);
  } else if (dateFrom) {
    parts.push(`${dateColumnSql} >= ?`);
    params.push(dateFrom);
  } else if (dateTo) {
    parts.push(`${dateColumnSql} <= ?`);
    params.push(dateTo);
  } else if (dateMonth && /^\d{4}-\d{2}$/.test(dateMonth)) {
    parts.push(`YEAR(${dateColumnSql}) = ? AND MONTH(${dateColumnSql}) = ?`);
    params.push(Number(dateMonth.slice(0, 4)), Number(dateMonth.slice(5, 7)));
  } else if (dateYear && /^\d{4}$/.test(dateYear)) {
    parts.push(`YEAR(${dateColumnSql}) = ?`);
    params.push(Number(dateYear));
  } else if (dateRange === 'week') {
    parts.push(`YEARWEEK(${dateColumnSql}, 1) = YEARWEEK(CURDATE(), 1)`);
  } else if (dateRange === 'month') {
    parts.push(`YEAR(${dateColumnSql}) = YEAR(CURDATE()) AND MONTH(${dateColumnSql}) = MONTH(CURDATE())`);
  } else if (dateRange === 'quarter') {
    parts.push(`YEAR(${dateColumnSql}) = YEAR(CURDATE()) AND QUARTER(${dateColumnSql}) = QUARTER(CURDATE())`);
  } else if (dateRange === 'year') {
    parts.push(`YEAR(${dateColumnSql}) = YEAR(CURDATE())`);
  }
}

function buildReplacementsListClause(query, schoolId) {
  let clause = 'r.school_id = ?';
  const params = [schoolId];
  const category = trimStr(query.category);
  const reason = trimStr(query.reason);
  if (category) {
    clause += ' AND r.category = ?';
    params.push(category);
  }
  if (reason) {
    clause += ' AND r.reason = ?';
    params.push(reason);
  }
  const dateParts = [];
  appendSqlDateFilter(dateParts, params, query, 'DATE(r.replacement_date)');
  if (dateParts.length) clause += ` AND ${dateParts.join(' AND ')}`;
  const qRaw = trimStr(query.q);
  if (qRaw) {
    const like = `%${qRaw.toLowerCase()}%`;
    clause += ` AND (
      LOWER(r.replacement_code) LIKE ?
      OR LOWER(COALESCE(oa.asset_name, '')) LIKE ?
      OR LOWER(COALESCE(na.asset_name, '')) LIKE ?
      OR LOWER(COALESCE(oa.asset_code, '')) LIKE ?
      OR LOWER(COALESCE(na.asset_code, '')) LIKE ?
      OR LOWER(COALESCE(r.category, '')) LIKE ?
      OR LOWER(COALESCE(r.reason, '')) LIKE ?
    )`;
    params.push(like, like, like, like, like, like, like);
  }
  return { clause, params };
}

async function loadAssetPanelById(schoolId, id) {
  const assetId = Number(id);
  if (!Number.isFinite(assetId)) return null;
  const [[row]] = await promisePool.query(
    `SELECT * FROM school_assets WHERE id = ? AND school_id = ? AND deleted_at IS NULL LIMIT 1`,
    [assetId, schoolId]
  );
  if (!row) return null;
  const [assignRows] = await promisePool.query(
    `SELECT assignee_name, staff_department, place_label, assign_type, assignment_date
     FROM school_asset_assignments
     WHERE asset_id = ? AND school_id = ? AND status = 'Active'
     ORDER BY created_at DESC LIMIT 5`,
    [assetId, schoolId]
  );
  const panel = buildPanelPayload(row);
  panel.assignments = (assignRows || []).map((r) => ({
    name: r.assignee_name,
    department: r.staff_department || r.place_label || '—',
    role: r.assign_type,
    since: r.assignment_date,
  }));
  return panel;
}

router.get('/school/assets/test', requireRole(ASSETS_READ_ROLES), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 30));
    const offset = (page - 1) * limit;

    const { clause, params } = buildTestAssetsFilterClause(req.query, schoolId);

    const [[countRow]] = await promisePool.query(
      `SELECT COUNT(*) AS total FROM school_assets WHERE ${clause}`,
      params
    );
    const total = Number(countRow?.total || 0);

    const [rows] = await promisePool.query(
      `SELECT * FROM school_assets WHERE ${clause} ORDER BY id ASC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    res.json({
      success: true,
      data: {
        items: rows.map(mapAssetTestListRow).filter(Boolean),
        count: rows.length,
        total,
        page,
        limit,
        total_pages: total > 0 ? Math.ceil(total / limit) : 0,
      },
    });
  } catch (err) {
    console.error('GET /school/assets/test:', err);
    res.status(500).json({ success: false, message: err.message || 'List failed' });
  }
});

router.post('/school/assets/test', requireRole(ASSETS_WRITE_ROLES), async (req, res) => {
  try {
    const { schoolId, userId } = req.ctx;
    const body = req.body || {};
    const quantity = Math.min(Math.max(1, Number(body.quantity) || 1), 100);

    if (quantity > 1) {
      const results = await registerAssetsBulkWithLedger(schoolId, userId, body, quantity);
      return res.status(201).json({
        success: true,
        message: `Registered ${results.length} assets via Asset Test`,
        data: {
          count: results.length,
          assets: results.map((r) => mapAssetTestListRow(r.asset) || r.asset),
          calculation: results[results.length - 1]?.calculation ?? null,
        },
      });
    }

    const result = await registerAssetWithLedger(schoolId, userId, body);
    res.status(201).json({
      success: true,
      message: 'Asset registered via Asset Test',
      data: {
        asset: mapAssetTestListRow(result.asset) || result.asset,
        calculation: result.calculation,
      },
    });
  } catch (err) {
    if (err?.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'Asset code already exists' });
    }
    if (err?.status) return res.status(err.status).json({ success: false, message: err.message });
    console.error('POST /school/assets/test:', err);
    res.status(500).json({ success: false, message: err.message || 'Create failed' });
  }
});

router.get('/school/assets/test/identifiers', requireRole(ASSETS_READ_ROLES), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const registerYear = resolveRegisterYear(req.query, null);
    if (!registerYear) {
      return res.status(400).json({ success: false, message: 'register_year is required' });
    }
    const skuSet = await loadSchoolSkuSet(schoolId, registerYear);
    res.json({
      success: true,
      data: {
        register_year: registerYear,
        skus: [...skuSet],
      },
    });
  } catch (err) {
    console.error('GET /school/assets/test/identifiers:', err);
    res.status(500).json({ success: false, message: err.message || 'Identifiers failed' });
  }
});

router.post('/school/assets/test/import', requireRole(ASSETS_WRITE_ROLES), async (req, res) => {
  try {
    const { schoolId, userId } = req.ctx;
    const body = req.body || {};
    const rows = Array.isArray(body.rows) ? body.rows : [];
    const skipDuplicates = body.skip_duplicates !== false;
    const autoGenerateSku = body.auto_generate_sku !== false;
    const entryMode = resolveAssetEntryMode(body);
    const registerYear = resolveRegisterYear(body, null);

    if (!registerYear) {
      return res.status(400).json({ success: false, message: 'register_year is required' });
    }
    if (!rows.length) {
      return res.status(400).json({ success: false, message: 'No rows to import' });
    }
    if (rows.length > 500) {
      return res.status(400).json({ success: false, message: 'Maximum 500 rows per import' });
    }

    const skuSet = await loadSchoolSkuSet(schoolId, registerYear);
    const fileSeenSkus = new Set();
    const schoolCategories = await loadCategoriesWithCounts(schoolId);
    const knownCategoryNames = schoolCategories.map((c) => c.name).filter(Boolean);
    const created = [];
    const errors = [];
    const skipped = [];
    const categoriesTouched = new Set();
    let finYearIdForRecalc = null;
    let assetCodeSeq = await getMaxAssetCodeSeq(schoolId);
    const batchRollingByCategory = {};

    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i] || {};
      const rowNo = i + 1;
      try {
        const assetName = trimStr(row.asset_name || row.name);
        const categoryName = resolveImportCategoryName(
          row.category,
          row.type || row.asset_type,
          knownCategoryNames,
        );
        let sku = trimStr(row.sku);
        const purchasePrice = toMoney(row.purchase_price ?? row.purchase_unit_price ?? row.unit_price);
        const rowLocation = formatLocationValue(row.location) || 'Unspecified';

        const validationIssues = [];
        if (!assetName) validationIssues.push('Name is required');
        if (!categoryName) validationIssues.push('Type / Category is required');
        if (!sku && !autoGenerateSku) validationIssues.push('SKU is required');
        if (purchasePrice <= 0) validationIssues.push('Purchase unit price is required');

        if (validationIssues.length) {
          errors.push({ row: rowNo, message: validationIssues.join('; ') });
          continue;
        }

        if (!sku && autoGenerateSku) {
          const autoSku = await resolveAutoSkuForBody(schoolId, registerYear, {
            location: rowLocation,
            label_tag: row.label_tag || row.label || null,
            asset_name: assetName,
          });
          sku = autoSku.sku;
        }

        const dupIssues = findSkuDuplicateIssues({ sku }, skuSet, fileSeenSkus);
        if (dupIssues.length) {
          if (skipDuplicates) {
            skipped.push({ row: rowNo, message: dupIssues.join('; '), duplicate: true });
            continue;
          }
          errors.push({ row: rowNo, message: dupIssues.join('; '), duplicate: true });
          continue;
        }

        assetCodeSeq += 1;
        const catKey = categoryName.toLowerCase();
        if (!batchRollingByCategory[catKey]) {
          const openingCtx = entryMode === 'legacy'
            ? await resolveAssetBasedOpeningContext(schoolId, registerYear, categoryName)
            : await resolveCategoryOpeningContext(schoolId, registerYear, categoryName);
          batchRollingByCategory[catKey] = {
            opening: toMoney(openingCtx?.effective_opening),
            accumulated: toMoney(
              openingCtx?.effective_accumulated_depreciation
              ?? openingCtx?.accumulated_depreciation
            ),
          };
        }
        const rollState = batchRollingByCategory[catKey];

        const importBody = {
          asset_code: `AST-${String(assetCodeSeq).padStart(5, '0')}`,
          register_year: registerYear,
          entry_mode: entryMode,
          first_time: entryMode === 'year_setup',
          _batch_rolling: true,
          rolling_opening: rollState.opening,
          rolling_accumulated_dep: rollState.accumulated,
          asset_name: assetName,
          category: categoryName,
          location: rowLocation,
          label_tag: row.label_tag || row.label || null,
          supplier_name: row.supplier_name || row.supplier || null,
          upi: row.upi || null,
          sku,
          material: row.material || null,
          purchase_price: purchasePrice,
          purchase_date: row.purchase_date || buildPurchaseDate(row),
          reference_no: row.reference_no || row.cba || null,
          apply_tax: row.apply_tax !== false && row.applyTax !== false,
          condition: row.condition || 'Good',
        };

        const result = await registerAssetWithLedger(schoolId, userId, importBody, {
          deferRecalc: true,
          skipChainRecalc: true,
        });
        if (result?.calculation) {
          batchRollingByCategory[catKey] = {
            opening: toMoney(result.calculation.total_balance),
            accumulated: toMoney(result.calculation.total_depreciation),
          };
        }
        categoriesTouched.add(categoryName);
        if (result?.calculation?.financial_year) {
          const fy = await getFinancialYearByYear(schoolId, registerYear);
          if (fy?.id) finYearIdForRecalc = fy.id;
        }
        created.push({
          id: result.asset?.id,
          asset_name: result.asset?.asset_name,
          sku: result.asset?.sku,
          asset_code: result.asset?.asset_code,
        });
        const skuKey = trimStr(sku).toUpperCase();
        if (skuKey) skuSet.add(skuKey);
      } catch (rowErr) {
        if (rowErr?.code === 'ER_DUP_ENTRY') {
          const detail = rowErr.sqlMessage || rowErr.message || '';
          errors.push({
            row: rowNo,
            message: detail.includes('asset_code')
              ? `Asset code already exists (${detail})`
              : detail.includes('sku')
                ? `SKU already exists in database (${detail})`
                : `Duplicate in database — ${detail || 'asset code or identifier'}`,
            duplicate: true,
          });
        } else {
          errors.push({ row: rowNo, message: rowErr.message || 'Insert failed' });
        }
      }
    }

    if (finYearIdForRecalc) {
      await recalcFinancialYearTotals(finYearIdForRecalc, schoolId);
    }

    for (const cat of categoriesTouched) {
      await recalcRegisterChainInCategory(schoolId, registerYear, cat);
    }

    res.json({
      success: true,
      message: `Imported ${created.length} of ${rows.length} assets into FY ${registerYear}`,
      data: {
        register_year: registerYear,
        created: created.length,
        failed: errors.length,
        skipped: skipped.length,
        assets: created,
        errors: errors.slice(0, 50),
        skipped_rows: skipped.slice(0, 50),
      },
    });
  } catch (err) {
    if (err?.status) return res.status(err.status).json({ success: false, message: err.message });
    console.error('POST /school/assets/test/import:', err);
    res.status(500).json({ success: false, message: err.message || 'Import failed' });
  }
});

router.post('/school/assets/test/recalc-chain', requireRole(ASSETS_WRITE_ROLES), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const body = req.body || {};
    const year = Number(body.register_year ?? body.registerYear ?? req.query.register_year);
    const category = trimStr(body.category ?? req.query.category);
    if (!Number.isFinite(year)) {
      return res.status(400).json({ success: false, message: 'register_year is required' });
    }

    if (category) {
      const count = await recalcRegisterChainInCategory(schoolId, year, category);
      return res.json({
        success: true,
        message: `Recalculated ${count} asset(s) in ${category} for FY ${year}`,
        data: { register_year: year, categories: [category], assets_recalculated: count },
      });
    }

    const [catRows] = await promisePool.query(
      `SELECT DISTINCT category FROM school_assets
       WHERE school_id = ? AND deleted_at IS NULL AND status != 'Draft' AND register_year = ?
       ORDER BY category ASC`,
      [schoolId, year]
    );
    let total = 0;
    const categories = [];
    for (const row of catRows) {
      const cat = trimStr(row.category);
      if (!cat) continue;
      const n = await recalcRegisterChainInCategory(schoolId, year, cat);
      total += n;
      categories.push(cat);
    }

    res.json({
      success: true,
      message: `Recalculated ${total} asset(s) across ${categories.length} categor${categories.length === 1 ? 'y' : 'ies'} for FY ${year}`,
      data: { register_year: year, categories, assets_recalculated: total },
    });
  } catch (err) {
    console.error('POST /school/assets/test/recalc-chain:', err);
    res.status(500).json({ success: false, message: err.message || 'Recalc failed' });
  }
});

router.post('/school/assets/test/bulk-delete', requireRole(ASSETS_WRITE_ROLES), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const body = req.body || {};
    const ids = Array.isArray(body.ids) ? body.ids.map(Number).filter((n) => Number.isFinite(n) && n > 0) : [];
    const deleteAll = body.all === true || body.delete_all === true;

    let affected = 0;
    if (deleteAll) {
      const [r] = await promisePool.query(
        `UPDATE school_assets SET deleted_at = NOW()
         WHERE school_id = ? AND deleted_at IS NULL AND status != 'Draft'`,
        [schoolId]
      );
      affected = r.affectedRows;
    } else if (ids.length) {
      const placeholders = ids.map(() => '?').join(',');
      const [r] = await promisePool.query(
        `UPDATE school_assets SET deleted_at = NOW()
         WHERE school_id = ? AND deleted_at IS NULL AND id IN (${placeholders})`,
        [schoolId, ...ids]
      );
      affected = r.affectedRows;
    } else {
      return res.status(400).json({ success: false, message: 'Provide ids array or all: true' });
    }

    res.json({
      success: true,
      message: deleteAll ? 'All assets removed' : `${affected} asset(s) removed`,
      data: { deleted_count: affected },
    });
  } catch (err) {
    console.error('POST /school/assets/test/bulk-delete:', err);
    res.status(500).json({ success: false, message: err.message || 'Bulk delete failed' });
  }
});

router.patch('/school/assets/test/:id', requireRole(ASSETS_WRITE_ROLES), async (req, res) => {
  try {
    const { schoolId, userId } = req.ctx;
    const id = Number(req.params.id);
    const data = await updateTestAssetWithLedger(schoolId, userId, id, req.body || {});
    res.json({ success: true, message: 'Asset updated', data });
  } catch (err) {
    if (err?.status) return res.status(err.status).json({ success: false, message: err.message });
    console.error('PATCH /school/assets/test/:id:', err);
    res.status(500).json({ success: false, message: err.message || 'Update failed' });
  }
});

router.delete('/school/assets/test/:id', requireRole(ASSETS_WRITE_ROLES), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ success: false, message: 'Valid asset id is required' });
    }
    const [r] = await promisePool.query(
      `UPDATE school_assets SET deleted_at = NOW()
       WHERE id = ? AND school_id = ? AND deleted_at IS NULL`,
      [id, schoolId]
    );
    if (!r.affectedRows) return res.status(404).json({ success: false, message: 'Asset not found' });
    res.json({ success: true, message: 'Asset removed', data: { id } });
  } catch (err) {
    console.error('DELETE /school/assets/test/:id:', err);
    res.status(500).json({ success: false, message: err.message || 'Delete failed' });
  }
});

router.get('/school/assets/dashboard', requireRole(ASSETS_READ_ROLES), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const [[stats]] = await promisePool.query(
      `SELECT
         COUNT(*) AS total_assets,
         COALESCE(SUM(opening_amount), 0) AS total_value,
         SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END) AS active_count,
         SUM(CASE WHEN status = 'Under Maintenance' THEN 1 ELSE 0 END) AS maintenance_count
       FROM school_assets
       WHERE school_id = ? AND deleted_at IS NULL AND status != 'Draft'`,
      [schoolId]
    );
    const [byCategory] = await promisePool.query(
      `SELECT COALESCE(category, 'Uncategorized') AS name, COUNT(*) AS value
       FROM school_assets
       WHERE school_id = ? AND deleted_at IS NULL AND status != 'Draft'
       GROUP BY COALESCE(category, 'Uncategorized')
       ORDER BY value DESC LIMIT 8`,
      [schoolId]
    );
    const [recent] = await promisePool.query(
      `SELECT id, asset_code, asset_name, category, status, created_at
       FROM school_assets
       WHERE school_id = ? AND deleted_at IS NULL
       ORDER BY created_at DESC LIMIT 8`,
      [schoolId]
    );
    res.json({
      success: true,
      data: {
        stats: {
          total_assets: Number(stats?.total_assets || 0),
          total_value: Number(stats?.total_value || 0),
          active_count: Number(stats?.active_count || 0),
          maintenance_count: Number(stats?.maintenance_count || 0),
        },
        by_category: byCategory.map((r, i) => ({
          name: r.name,
          value: Number(r.value),
          color: ['#000435', '#FEBF10', '#3D5A80', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4'][i % 8],
        })),
        recent: recent.map(mapAssetRow),
      },
    });
  } catch (err) {
    console.error('GET /school/assets/dashboard:', err);
    res.status(500).json({ success: false, message: err.message || 'Dashboard failed' });
  }
});

const CHART_COLORS = ['#000435', '#FEBF10', '#3D5A80', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4'];

function mapConditionToAnalyticsLabel(code) {
  const c = String(code || 'GOOD').toUpperCase();
  if (c === 'GOOD') return { name: 'Excellent', color: '#10b981' };
  if (c === 'FAIR') return { name: 'Good', color: '#3b82f6' };
  if (c === 'DAMAGED') return { name: 'Poor', color: '#ef4444' };
  return { name: 'Fair', color: '#f59e0b' };
}

router.get('/school/assets/analytics', requireRole(ASSETS_READ_ROLES), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const year = Number(req.query.year) || new Date().getFullYear();

    const [[kpi]] = await promisePool.query(
      `SELECT
         COUNT(*) AS total_assets,
         COALESCE(SUM(COALESCE(total_balance, opening_amount, 0)), 0) AS total_value,
         COALESCE(SUM(COALESCE(accumulated_depreciation, 0)), 0) AS depreciation_total,
         COALESCE(SUM(COALESCE(annual_dep, 0)), 0) AS annual_dep_total,
         SUM(CASE WHEN status = 'Under Maintenance' THEN 1 ELSE 0 END) AS under_maintenance,
         SUM(CASE WHEN UPPER(condition_code) = 'GOOD' THEN 1 ELSE 0 END) AS good_condition,
         SUM(CASE WHEN COALESCE(net_book_value, 0) <= 0 AND COALESCE(total_balance, opening_amount, 0) > 0 THEN 1 ELSE 0 END) AS fully_depreciated,
         SUM(CASE WHEN UPPER(condition_code) = 'DAMAGED' OR status = 'Damaged' THEN 1 ELSE 0 END) AS replacement_candidates
       FROM school_assets
       WHERE school_id = ? AND deleted_at IS NULL AND status != 'Draft'`,
      [schoolId]
    );

    let maintenanceCostYtd = 0;
    let maintenanceRecordsYtd = 0;
    try {
      await ensureMaintenanceTable();
      const [[mc]] = await promisePool.query(
        `SELECT COALESCE(SUM(estimated_cost), 0) AS cost, COUNT(*) AS cnt
         FROM school_asset_maintenance
         WHERE school_id = ? AND YEAR(COALESCE(start_date, created_at)) = ?`,
        [schoolId, year]
      );
      maintenanceCostYtd = Number(mc?.cost || 0);
      maintenanceRecordsYtd = Number(mc?.cnt || 0);
    } catch {
      maintenanceCostYtd = 0;
      maintenanceRecordsYtd = 0;
    }

    const [[depYtd]] = await promisePool.query(
      `SELECT COALESCE(SUM(COALESCE(annual_dep, accumulated_depreciation, 0)), 0) AS dep_ytd
       FROM school_assets
       WHERE school_id = ? AND deleted_at IS NULL AND status != 'Draft'
         AND COALESCE(YEAR(purchase_date), YEAR(created_at)) = ?`,
      [schoolId, year]
    );

    const [byCategory] = await promisePool.query(
      `SELECT COALESCE(category, 'Uncategorized') AS name, COUNT(*) AS value
       FROM school_assets
       WHERE school_id = ? AND deleted_at IS NULL AND status != 'Draft'
       GROUP BY COALESCE(category, 'Uncategorized')
       ORDER BY value DESC LIMIT 8`,
      [schoolId]
    );

    const [byYear] = await promisePool.query(
      `SELECT COALESCE(YEAR(purchase_date), YEAR(created_at)) AS yr,
         COALESCE(SUM(COALESCE(total_balance, opening_amount, 0)), 0) AS value,
         COUNT(*) AS acquisitions
       FROM school_assets
       WHERE school_id = ? AND deleted_at IS NULL AND status != 'Draft'
       GROUP BY COALESCE(YEAR(purchase_date), YEAR(created_at))
       ORDER BY yr ASC`,
      [schoolId]
    );

    let runningValue = 0;
    const valueOverTimeSimple = (byYear || []).map((r) => {
      const yearSpend = Number(r.value || 0);
      runningValue += yearSpend;
      return {
        year: String(r.yr),
        value: runningValue,
        acquisition: yearSpend,
      };
    });

    const [depByYear] = await promisePool.query(
      `SELECT COALESCE(YEAR(purchase_date), YEAR(created_at)) AS year,
         COALESCE(SUM(accumulated_depreciation), 0) AS diminishing,
         COALESCE(SUM(annual_dep), 0) AS straight_line,
         COALESCE(SUM(total_dep), 0) AS double_declining
       FROM school_assets
       WHERE school_id = ? AND deleted_at IS NULL AND status != 'Draft'
       GROUP BY COALESCE(YEAR(purchase_date), YEAR(created_at))
       ORDER BY year ASC`,
      [schoolId]
    );

    let maintenanceByCategory = [];
    try {
      await ensureMaintenanceTable();
      const [rows] = await promisePool.query(
        `SELECT COALESCE(sa.category, m.asset_name, 'Uncategorized') AS category,
           COUNT(*) AS frequency,
           COALESCE(SUM(m.estimated_cost), 0) AS cost
         FROM school_asset_maintenance m
         LEFT JOIN school_assets sa ON sa.id = m.asset_id AND sa.school_id = m.school_id
         WHERE m.school_id = ?
         GROUP BY COALESCE(sa.category, m.asset_name, 'Uncategorized')
         ORDER BY frequency DESC LIMIT 8`,
        [schoolId]
      );
      maintenanceByCategory = rows || [];
    } catch {
      maintenanceByCategory = [];
    }

    const [byCondition] = await promisePool.query(
      `SELECT condition_code, COUNT(*) AS cnt
       FROM school_assets
       WHERE school_id = ? AND deleted_at IS NULL AND status != 'Draft'
       GROUP BY condition_code`,
      [schoolId]
    );

    const totalAssets = Number(kpi?.total_assets || 0);
    const goodCount = Number(kpi?.good_condition || 0);
    const healthPct = totalAssets > 0 ? Math.round((goodCount / totalAssets) * 100) : 0;

    const conditionTotal = (byCondition || []).reduce((s, r) => s + Number(r.cnt || 0), 0) || 1;
    const conditionData = (byCondition || []).map((r) => {
      const mapped = mapConditionToAnalyticsLabel(r.condition_code);
      const cnt = Number(r.cnt || 0);
      return {
        name: mapped.name,
        value: Math.round((cnt / conditionTotal) * 100),
        count: cnt,
        color: mapped.color,
      };
    });
    if (!conditionData.length) {
      conditionData.push({ name: 'No data', value: 100, count: 0, color: '#E5E7EB' });
    }

    let activeAssignments = 0;
    try {
      await ensureAssignmentsTable();
      const [[aa]] = await promisePool.query(
        `SELECT COUNT(*) AS cnt FROM school_asset_assignments
         WHERE school_id = ? AND status = 'Active'`,
        [schoolId]
      );
      activeAssignments = Number(aa?.cnt || 0);
    } catch {
      activeAssignments = 0;
    }
    const utilizationPct = totalAssets > 0
      ? Math.round((activeAssignments / totalAssets) * 100)
      : 0;

    const [yearRows] = await promisePool.query(
      `SELECT DISTINCT COALESCE(YEAR(purchase_date), YEAR(created_at)) AS yr
       FROM school_assets WHERE school_id = ? AND deleted_at IS NULL
       ORDER BY yr DESC LIMIT 10`,
      [schoolId]
    );
    const availableYears = (yearRows || []).map((r) => Number(r.yr)).filter(Boolean);
    if (!availableYears.includes(year)) availableYears.unshift(year);
    if (!availableYears.length) availableYears.push(new Date().getFullYear());

    res.json({
      success: true,
      data: {
        year,
        available_years: [...new Set(availableYears)].sort((a, b) => b - a),
        kpis: {
          total_value: Number(kpi?.total_value || 0),
          total_assets: totalAssets,
          depreciation_ytd: Number(depYtd?.dep_ytd || 0),
          depreciation_total: Number(kpi?.depreciation_total || 0),
          maintenance_cost_ytd: maintenanceCostYtd,
          maintenance_records_ytd: maintenanceRecordsYtd,
          under_maintenance: Number(kpi?.under_maintenance || 0),
          health_pct: healthPct,
        },
        by_category: (byCategory || []).map((r, i) => ({
          name: r.name,
          value: Number(r.value),
          color: CHART_COLORS[i % CHART_COLORS.length],
        })),
        value_over_time: valueOverTimeSimple,
        depreciation_trend: (depByYear || []).map((r) => ({
          year: String(r.year),
          straightLine: Number(r.straight_line || 0),
          diminishing: Number(r.diminishing || 0),
          doubleDeclining: Number(r.double_declining || 0),
        })),
        maintenance_by_category: (maintenanceByCategory || []).map((r) => ({
          category: r.category,
          frequency: Number(r.frequency || 0),
          cost: Number(r.cost || 0),
        })),
        condition_data: conditionData,
        health_score: healthPct,
        insights: {
          needs_maintenance: Number(kpi?.under_maintenance || 0),
          fully_depreciated: Number(kpi?.fully_depreciated || 0),
          replacement_recommended: Number(kpi?.replacement_candidates || 0),
          utilization_pct: utilizationPct,
          active_assignments: activeAssignments,
        },
      },
    });
  } catch (err) {
    console.error('GET /school/assets/analytics:', err);
    res.status(500).json({ success: false, message: err.message || 'Analytics failed' });
  }
});

require('./schoolAssetsReports')(router, {
  promisePool,
  requireRole,
  ASSETS_READ_ROLES,
  trimStr,
  toMoney,
  mapAssetRow,
  mapAssetTestListRow,
  buildQrValue,
  CHART_COLORS,
  ensureAssignmentsTable,
  ensureMaintenanceTable,
  ensureTransfersTable,
  mapConditionToAnalyticsLabel,
});

router.get('/school/assets/assignments/meta', requireRole(ASSETS_READ_ROLES), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const [staffRows] = await promisePool.query(
      `SELECT u.id, st.full_name AS name, st.department, st.job_title AS role
       FROM staff st
       INNER JOIN users u ON u.id = st.user_id AND u.deleted_at IS NULL
       WHERE st.school_id = ?
       ORDER BY st.full_name ASC
       LIMIT 300`,
      [schoolId]
    );
    const [locRows] = await promisePool.query(
      `SELECT DISTINCT location FROM school_assets
       WHERE school_id = ? AND deleted_at IS NULL AND location IS NOT NULL AND location != ''
       ORDER BY location LIMIT 200`,
      [schoolId]
    );
    let hrDeptNames = [];
    try {
      const [hrDepts] = await promisePool.query(
        `SELECT name FROM hr_departments WHERE school_id = ? AND is_active = 1 ORDER BY name ASC`,
        [schoolId]
      );
      hrDeptNames = (hrDepts || []).map((d) => trimStr(d.name)).filter(Boolean);
    } catch {
      hrDeptNames = [];
    }
    const departments = [...new Set([
      ...hrDeptNames,
      ...staffRows.map((r) => trimStr(r.department)).filter(Boolean),
    ])].sort();
    const rooms = locRows.map((row, i) => {
      const locStr = formatLocationValue(row.location) || '';
      const parts = locStr.split(' - ').map((p) => p.trim()).filter(Boolean);
      const building = parts[0] || locStr || 'Site';
      const room = parts.length > 1 ? parts.slice(1).join(' - ') : 'Main';
      return {
        id: i + 1,
        building,
        room,
        label: locStr,
      };
    });
    res.json({
      success: true,
      data: {
        departments,
        rooms,
      },
    });
  } catch (err) {
    console.error('GET /school/assets/assignments/meta:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to load meta' });
  }
});

router.get('/school/assets/assignments', requireRole(ASSETS_READ_ROLES), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const status = trimStr(req.query.status);
    let sql = `
      SELECT a.*, sa.asset_name, sa.asset_code, sa.serial_number, sa.location AS asset_location
      FROM school_asset_assignments a
      INNER JOIN school_assets sa ON sa.id = a.asset_id AND sa.school_id = a.school_id AND sa.deleted_at IS NULL
      WHERE a.school_id = ?
    `;
    const params = [schoolId];
    if (status) {
      sql += ' AND a.status = ?';
      params.push(status);
    } else {
      sql += " AND a.status != 'Draft'";
    }
    sql += ' ORDER BY a.created_at DESC LIMIT 500';
    const [rows] = await promisePool.query(sql, params);
    res.json({
      success: true,
      data: rows.map((r) => mapAssignmentRow(r, r)),
    });
  } catch (err) {
    console.error('GET /school/assets/assignments:', err);
    res.status(500).json({ success: false, message: err.message || 'List failed' });
  }
});

router.get('/school/assets/assignments/:assignmentId', requireRole(ASSETS_READ_ROLES), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const assignmentId = Number(req.params.assignmentId);
    const [[row]] = await promisePool.query(
      `SELECT a.*, sa.asset_name, sa.asset_code, sa.serial_number, sa.location AS asset_location,
              sa.category, sa.total_balance, sa.unit_price, sa.status AS asset_status
       FROM school_asset_assignments a
       INNER JOIN school_assets sa ON sa.id = a.asset_id AND sa.school_id = a.school_id AND sa.deleted_at IS NULL
       WHERE a.id = ? AND a.school_id = ? LIMIT 1`,
      [assignmentId, schoolId]
    );
    if (!row) return res.status(404).json({ success: false, message: 'Assignment not found' });
    res.json({ success: true, data: mapAssignmentRow(row, row) });
  } catch (err) {
    console.error('GET /school/assets/assignments/:id:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to load assignment' });
  }
});

router.patch('/school/assets/assignments/:assignmentId/return', requireRole(ASSETS_WRITE_ROLES), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const assignmentId = Number(req.params.assignmentId);
    const body = req.body || {};
    const [[row]] = await promisePool.query(
      `SELECT id, asset_id, status FROM school_asset_assignments WHERE id = ? AND school_id = ? LIMIT 1`,
      [assignmentId, schoolId]
    );
    if (!row) return res.status(404).json({ success: false, message: 'Assignment not found' });
    if (row.status === 'Returned') {
      return res.status(400).json({ success: false, message: 'Assignment already returned' });
    }

    const returnDate = body.return_date || body.returnDate || new Date().toISOString().slice(0, 10);
    const conditionCode = mapConditionToCode(body.condition_code || body.condition);
    const returnNotes = trimStr(body.notes) || null;
    const damageCost = body.damage_cost != null ? toMoney(body.damage_cost) : null;

    await promisePool.query(
      `UPDATE school_asset_assignments SET
        status = 'Returned', returned_at = NOW(), condition_code = ?,
        notes = CONCAT(COALESCE(notes, ''), ?)
       WHERE id = ? AND school_id = ?`,
      [
        conditionCode,
        returnNotes ? `\n[Return ${returnDate}] ${returnNotes}${damageCost ? ` (damage RWF ${damageCost})` : ''}` : '',
        assignmentId,
        schoolId,
      ]
    );

    const assetStatus = conditionCode === 'DAMAGED' ? 'Under Maintenance' : 'Active';
    await promisePool.query(
      `UPDATE school_assets SET status = ?, condition_code = ?, updated_at = NOW() WHERE id = ? AND school_id = ?`,
      [assetStatus, conditionCode, row.asset_id, schoolId]
    );

    const [[updated]] = await promisePool.query(
      `SELECT a.*, sa.asset_name, sa.asset_code, sa.serial_number, sa.location AS asset_location
       FROM school_asset_assignments a
       INNER JOIN school_assets sa ON sa.id = a.asset_id WHERE a.id = ? LIMIT 1`,
      [assignmentId]
    );
    res.json({
      success: true,
      message: 'Asset returned successfully',
      data: mapAssignmentRow(updated, updated),
    });
  } catch (err) {
    console.error('PATCH /school/assets/assignments/:id/return:', err);
    res.status(500).json({ success: false, message: err.message || 'Return failed' });
  }
});

router.get('/school/assets/maintenance', requireRole(ASSETS_READ_ROLES), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const [rows] = await promisePool.query(
      `SELECT * FROM school_asset_maintenance WHERE school_id = ? ORDER BY created_at DESC LIMIT 200`,
      [schoolId]
    );
    res.json({ success: true, data: (rows || []).map(mapMaintenanceRow) });
  } catch (err) {
    console.error('GET /school/assets/maintenance:', err);
    res.status(500).json({ success: false, message: err.message || 'List failed' });
  }
});

router.post('/school/assets/maintenance', requireRole(ASSETS_WRITE_ROLES), async (req, res) => {
  try {
    const { schoolId, userId } = req.ctx;
    const body = req.body || {};
    const assetId = Number(body.asset_id || body.assetId) || null;
    const assignmentId = Number(body.assignment_id || body.assignmentId) || null;
    const description = trimStr(body.description || body.problem);
    if (!description) return res.status(400).json({ success: false, message: 'Description is required' });

    let assetName = trimStr(body.asset_name || body.asset);
    let assetCode = trimStr(body.asset_code || body.assetCode);
    if (assetId) {
      const [[a]] = await promisePool.query(
        `SELECT asset_name, asset_code FROM school_assets WHERE id = ? AND school_id = ? LIMIT 1`,
        [assetId, schoolId]
      );
      if (a) {
        assetName = assetName || a.asset_name;
        assetCode = assetCode || a.asset_code;
      }
    }

    const [result] = await promisePool.query(
      `INSERT INTO school_asset_maintenance (
        school_id, asset_id, assignment_id, asset_name, asset_code,
        maint_type, description, technician, priority, estimated_cost,
        start_date, end_date, status, created_by
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        schoolId, assetId, assignmentId, assetName, assetCode,
        trimStr(body.maint_type || body.maintType) || 'Repair',
        description,
        trimStr(body.technician) || null,
        trimStr(body.priority) || 'Medium',
        body.estimated_cost != null || body.cost != null ? toMoney(body.estimated_cost ?? body.cost) : null,
        toDateOnly(body.start_date || body.startDate) || localDateIso(),
        toDateOnly(body.end_date || body.endDate) || null,
        trimStr(body.status) || 'Scheduled',
        userId,
      ]
    );

    if (assetId) {
      await promisePool.query(
        `UPDATE school_assets SET status = 'Under Maintenance', updated_at = NOW() WHERE id = ? AND school_id = ?`,
        [assetId, schoolId]
      );
    }

    const [[row]] = await promisePool.query(
      `SELECT * FROM school_asset_maintenance WHERE id = ? LIMIT 1`,
      [result.insertId]
    );
    res.status(201).json({
      success: true,
      message: 'Maintenance ticket created',
      data: mapMaintenanceRow(row),
    });
  } catch (err) {
    console.error('POST /school/assets/maintenance:', err);
    res.status(500).json({ success: false, message: err.message || 'Create failed' });
  }
});

router.patch('/school/assets/maintenance/:id/extend', requireRole(ASSETS_WRITE_ROLES), async (req, res) => {
  try {
    await ensureMaintenanceTable();
    const { schoolId, userId } = req.ctx;
    const data = await extendMaintenanceRecord(schoolId, userId, req.params.id, req.body || {});
    res.json({ success: true, message: 'Maintenance deadline extended', data });
  } catch (err) {
    if (err?.status) return res.status(err.status).json({ success: false, message: err.message });
    console.error('PATCH /school/assets/maintenance/:id/extend:', err);
    res.status(500).json({ success: false, message: err.message || 'Extend failed' });
  }
});

router.get('/school/assets/transfers/meta', requireRole(ASSETS_READ_ROLES), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    let hrDeptNames = [];
    try {
      const [hrDepts] = await promisePool.query(
        `SELECT name FROM hr_departments WHERE school_id = ? AND is_active = 1 ORDER BY name ASC`,
        [schoolId]
      );
      hrDeptNames = (hrDepts || []).map((d) => trimStr(d.name)).filter(Boolean);
    } catch {
      hrDeptNames = [];
    }
    const [staffRows] = await promisePool.query(
      `SELECT DISTINCT st.department FROM staff st
       WHERE st.school_id = ? AND st.department IS NOT NULL AND st.department != ''`,
      [schoolId]
    );
    const departments = [...new Set([
      ...hrDeptNames,
      ...staffRows.map((r) => trimStr(r.department)).filter(Boolean),
    ])].sort();
    res.json({
      success: true,
      data: {
        departments,
        transfer_reasons: TRANSFER_REASONS,
        approved_by_options: ['Admin', 'Manager', 'Director', 'Department Head', 'Assets Manager'],
      },
    });
  } catch (err) {
    console.error('GET /school/assets/transfers/meta:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to load meta' });
  }
});

router.get('/school/assets/transfers', requireRole(ASSETS_READ_ROLES), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const [rows] = await promisePool.query(
      `SELECT t.*, sa.asset_name, sa.asset_code, sa.location AS asset_location
       FROM school_asset_transfers t
       INNER JOIN school_assets sa ON sa.id = t.asset_id AND sa.school_id = t.school_id AND sa.deleted_at IS NULL
       WHERE t.school_id = ?
       ORDER BY t.created_at DESC LIMIT 300`,
      [schoolId]
    );
    res.json({
      success: true,
      data: (rows || []).map((r) => mapTransferRow(r, r)),
    });
  } catch (err) {
    console.error('GET /school/assets/transfers:', err);
    res.status(500).json({ success: false, message: err.message || 'List failed' });
  }
});

router.post('/school/assets/transfers', requireRole(ASSETS_WRITE_ROLES), async (req, res) => {
  try {
    const { schoolId, userId } = req.ctx;
    const body = req.body || {};
    const assetId = Number(body.asset_id || body.assetId);
    if (!assetId) return res.status(400).json({ success: false, message: 'Asset is required' });

    const destType = trimStr(body.dest_type || body.destType).toLowerCase();
    if (!['department', 'location', 'staff'].includes(destType)) {
      return res.status(400).json({ success: false, message: 'Invalid destination type' });
    }

    const [[asset]] = await promisePool.query(
      `SELECT id, asset_name, asset_code, location, status FROM school_assets
       WHERE id = ? AND school_id = ? AND deleted_at IS NULL LIMIT 1`,
      [assetId, schoolId]
    );
    if (!asset) return res.status(404).json({ success: false, message: 'Asset not found' });

    const [[activeAssign]] = await promisePool.query(
      `SELECT assignee_name, staff_department FROM school_asset_assignments
       WHERE asset_id = ? AND school_id = ? AND status = 'Active' ORDER BY created_at DESC LIMIT 1`,
      [assetId, schoolId]
    );

    let toDepartment = null;
    let toDepartmentOther = null;
    let toLocation = null;
    let toStaffName = null;

    if (destType === 'department') {
      toDepartment = trimStr(body.to_department || body.department);
      toDepartmentOther = trimStr(body.to_department_other || body.departmentOther);
      if (!toDepartment) return res.status(400).json({ success: false, message: 'Department is required' });
      if (toDepartment === 'Other' && !toDepartmentOther) {
        return res.status(400).json({ success: false, message: 'Please specify the department' });
      }
    } else if (destType === 'location') {
      toLocation = formatLocationValue(body.to_location || body.locationText);
      if (!toLocation) return res.status(400).json({ success: false, message: 'Destination location is required' });
    } else if (destType === 'staff') {
      toStaffName = trimStr(body.to_staff_name || body.staffName);
      if (!toStaffName) return res.status(400).json({ success: false, message: 'Staff name is required' });
    }

    let transferReason = trimStr(body.transfer_reason || body.reason);
    const transferReasonOther = trimStr(body.transfer_reason_other || body.reasonOther);
    if (!transferReason || !TRANSFER_REASONS.includes(transferReason)) {
      return res.status(400).json({ success: false, message: 'Valid transfer reason is required' });
    }
    if (transferReason === 'Other' && !transferReasonOther) {
      return res.status(400).json({ success: false, message: 'Please specify transfer reason' });
    }

    const transferDate = body.transfer_date || body.transferDate || new Date().toISOString().slice(0, 10);
    const conditionCode = mapConditionToCode(body.condition_code || body.condition);
    const approvedBy = trimStr(body.approved_by || body.approvedBy) || null;
    const notes = trimStr(body.notes) || null;
    const status = trimStr(body.status) || 'Completed';

    const fromDepartment = activeAssign?.staff_department || null;
    const fromLocation = formatLocationValue(asset.location);
    const fromAssignee = activeAssign?.assignee_name || 'Unassigned';

    const [result] = await promisePool.query(
      `INSERT INTO school_asset_transfers (
        school_id, asset_id, from_department, from_location, from_assignee,
        dest_type, to_department, to_department_other, to_location, to_staff_name,
        transfer_reason, transfer_reason_other, transfer_date, approved_by,
        condition_code, notes, status, created_by
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        schoolId, assetId, fromDepartment, fromLocation, fromAssignee,
        destType, toDepartment, toDepartmentOther, toLocation, toStaffName,
        transferReason, transferReasonOther, transferDate, approvedBy,
        conditionCode, notes, status, userId,
      ]
    );

    if (destType === 'location' && toLocation) {
      await promisePool.query(
        `UPDATE school_assets SET location = ?, updated_at = NOW() WHERE id = ? AND school_id = ?`,
        [toLocation, assetId, schoolId]
      );
    }

    const [[row]] = await promisePool.query(
      `SELECT t.*, sa.asset_name, sa.asset_code FROM school_asset_transfers t
       INNER JOIN school_assets sa ON sa.id = t.asset_id WHERE t.id = ? LIMIT 1`,
      [result.insertId]
    );
    res.status(201).json({
      success: true,
      message: 'Transfer recorded successfully',
      data: mapTransferRow(row, row),
    });
  } catch (err) {
    console.error('POST /school/assets/transfers:', err);
    res.status(500).json({ success: false, message: err.message || 'Transfer failed' });
  }
});

router.get('/school/assets/replacements/stats', requireRole(ASSETS_READ_ROLES), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const stats = await loadReplacementStats(schoolId);
    res.json({ success: true, data: stats });
  } catch (err) {
    console.error('GET /school/assets/replacements/stats:', err);
    res.status(500).json({ success: false, message: err.message || 'Stats failed' });
  }
});

router.get('/school/assets/replacements/awaiting-assets', requireRole(ASSETS_READ_ROLES), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const items = await loadOldNotReplacedAssets(schoolId);
    res.json({ success: true, data: items, total: items.length });
  } catch (err) {
    console.error('GET /school/assets/replacements/awaiting-assets:', err);
    res.status(500).json({ success: false, message: err.message || 'List failed' });
  }
});

router.get('/school/assets/replacements/meta', requireRole(ASSETS_READ_ROLES), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const schoolProfile = await loadSchoolProfile(schoolId);
    const activeYear = await getActiveFinancialYear(schoolId);
    const [catRows] = await promisePool.query(
      `SELECT DISTINCT name FROM school_asset_categories
       WHERE school_id = ? AND deleted_at IS NULL ORDER BY name ASC`,
      [schoolId]
    );
    res.json({
      success: true,
      data: {
        reasons: REPLACEMENT_REASONS,
        approval_roles: REPLACEMENT_APPROVAL_ROLES,
        approved_by_options: ['Admin', 'Manager', 'Director', 'Asset Manager', 'Finance Manager'],
        categories: catRows.map((r) => r.name),
        active_financial_year: activeYear,
        school: schoolProfile
          ? {
            name: schoolProfile.school_name,
            code: schoolProfile.school_code,
            abbreviation: abbreviateSchoolName(schoolProfile.school_name),
          }
          : null,
      },
    });
  } catch (err) {
    console.error('GET /school/assets/replacements/meta:', err);
    res.status(500).json({ success: false, message: err.message || 'Meta failed' });
  }
});

router.get('/school/assets/replacements/old-asset/:assetId', requireRole(ASSETS_READ_ROLES), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const assetId = Number(req.params.assetId);
    const panel = await loadAssetPanelById(schoolId, assetId);
    if (!panel) return res.status(404).json({ success: false, message: 'Asset not found' });

    const [[maint]] = await promisePool.query(
      `SELECT start_date, end_date, maint_type, status FROM school_asset_maintenance
       WHERE school_id = ? AND asset_id = ? ORDER BY COALESCE(end_date, start_date) DESC LIMIT 1`,
      [schoolId, assetId]
    );

    const asset = panel.asset;
    let assetAgeYears = null;
    if (asset?.purchase_date) {
      const purchased = new Date(asset.purchase_date);
      if (!Number.isNaN(purchased.getTime())) {
        assetAgeYears = Math.max(0, Math.floor((Date.now() - purchased.getTime()) / (365.25 * 24 * 3600 * 1000)));
      }
    }

    res.json({
      success: true,
      data: {
        asset,
        assignments: panel.assignments || [],
        last_maintenance: maint || null,
        asset_age_years: assetAgeYears,
        depreciation: {
          rate: asset?.dep_rate,
          annual_dep: asset?.annual_dep,
          total_dep: asset?.total_dep,
          net_book_value: asset?.net_book_value,
          accumulated_depreciation: asset?.accumulated_depreciation,
        },
      },
    });
  } catch (err) {
    console.error('GET /school/assets/replacements/old-asset:', err);
    res.status(500).json({ success: false, message: err.message || 'Preview failed' });
  }
});

router.get('/school/assets/replacements', requireRole(ASSETS_READ_ROLES), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const { clause, params } = buildReplacementsListClause(req.query, schoolId);

    const [[countRow]] = await promisePool.query(
      `SELECT COUNT(*) AS total
       FROM school_asset_replacements r
       LEFT JOIN school_assets oa ON oa.id = r.old_asset_id AND oa.school_id = r.school_id
       LEFT JOIN school_assets na ON na.id = r.new_asset_id AND na.school_id = r.school_id
       WHERE ${clause}`,
      params
    );
    const total = Number(countRow?.total || 0);

    const [rows] = await promisePool.query(
      `SELECT r.*,
        oa.asset_name AS old_asset_name, oa.asset_code AS old_asset_code,
        oa.label_tag AS old_label_tag, oa.status AS old_status,
        na.asset_name AS new_asset_name, na.asset_code AS new_asset_code,
        na.label_tag AS new_label_tag, na.status AS new_status,
        na.sd_number AS new_sd_number, na.receipt_number AS new_receipt_number,
        na.reference_no AS new_reference_no
       FROM school_asset_replacements r
       LEFT JOIN school_assets oa ON oa.id = r.old_asset_id AND oa.school_id = r.school_id
       LEFT JOIN school_assets na ON na.id = r.new_asset_id AND na.school_id = r.school_id
       WHERE ${clause}
       ORDER BY r.created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    res.json({
      success: true,
      data: {
        items: (rows || []).map((r) => mapReplacementRow(r, {
          asset_name: r.old_asset_name,
          asset_code: r.old_asset_code,
          label_tag: r.old_label_tag,
          status: r.old_status,
          category: r.category,
        }, {
          asset_name: r.new_asset_name,
          asset_code: r.new_asset_code,
          label_tag: r.new_label_tag,
          status: r.new_status,
        })),
        total,
        page,
        limit,
        total_pages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (err) {
    console.error('GET /school/assets/replacements:', err);
    res.status(500).json({ success: false, message: err.message || 'List failed' });
  }
});

router.get('/school/assets/replacements/:id', requireRole(ASSETS_READ_ROLES), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const id = Number(req.params.id);
    const [[row]] = await promisePool.query(
      `SELECT r.*,
        oa.asset_name AS old_asset_name, oa.asset_code AS old_asset_code,
        oa.label_tag AS old_label_tag, oa.status AS old_status, oa.location AS old_location,
        oa.unit_price AS old_unit_price, oa.net_book_value AS old_net_book,
        na.asset_name AS new_asset_name, na.asset_code AS new_asset_code,
        na.label_tag AS new_label_tag, na.status AS new_status, na.location AS new_location,
        na.unit_price AS new_unit_price, na.serial_number AS new_serial, na.sku AS new_sku,
        na.sd_number AS new_sd_number, na.receipt_number AS new_receipt_number,
        na.reference_no AS new_reference_no
       FROM school_asset_replacements r
       LEFT JOIN school_assets oa ON oa.id = r.old_asset_id AND oa.school_id = r.school_id
       LEFT JOIN school_assets na ON na.id = r.new_asset_id AND na.school_id = r.school_id
       WHERE r.id = ? AND r.school_id = ? LIMIT 1`,
      [id, schoolId]
    );
    if (!row) return res.status(404).json({ success: false, message: 'Replacement not found' });
    const data = mapReplacementRow(row, {
      asset_name: row.old_asset_name,
      asset_code: row.old_asset_code,
      label_tag: row.old_label_tag,
      status: row.old_status,
      location: row.old_location,
      unit_price: row.old_unit_price,
      net_book_value: row.old_net_book,
    }, {
      asset_name: row.new_asset_name,
      asset_code: row.new_asset_code,
      label_tag: row.new_label_tag,
      status: row.new_status,
      location: row.new_location,
      unit_price: row.new_unit_price,
      serial_number: row.new_serial,
      sku: row.new_sku,
    });
    res.json({ success: true, data });
  } catch (err) {
    console.error('GET /school/assets/replacements/:id:', err);
    res.status(500).json({ success: false, message: err.message || 'Load failed' });
  }
});

router.post('/school/assets/replacements', requireRole(ASSETS_WRITE_ROLES), async (req, res) => {
  try {
    const { schoolId, userId } = req.ctx;
    const result = await completeAssetReplacement(schoolId, userId, req.body || {});
    const replacement = result.replacement || result;
    const isPending = replacement.status === 'Pending';
    res.status(201).json({
      success: true,
      message: isPending ? 'Replacement request saved as pending' : 'Asset replacement completed',
      data: result.replacement ? result : { replacement: result },
    });
  } catch (err) {
    if (err?.status) return res.status(err.status).json({ success: false, message: err.message });
    console.error('POST /school/assets/replacements:', err);
    res.status(500).json({ success: false, message: err.message || 'Replacement failed' });
  }
});

router.patch('/school/assets/replacements/:id', requireRole(ASSETS_WRITE_ROLES), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const data = await updateReplacementRecord(schoolId, req.params.id, req.body || {});
    res.json({ success: true, message: 'Replacement updated', data });
  } catch (err) {
    if (err?.status) return res.status(err.status).json({ success: false, message: err.message });
    console.error('PATCH /school/assets/replacements/:id:', err);
    res.status(500).json({ success: false, message: err.message || 'Update failed' });
  }
});

router.post('/school/assets/replacements/:id/approve', requireRole(ASSETS_WRITE_ROLES), async (req, res) => {
  try {
    const { schoolId, userId } = req.ctx;
    const data = await approvePendingReplacement(schoolId, userId, req.params.id, req.body || {});
    res.json({ success: true, message: 'Replacement approved and completed', data });
  } catch (err) {
    if (err?.status) return res.status(err.status).json({ success: false, message: err.message });
    console.error('POST /school/assets/replacements/:id/approve:', err);
    res.status(500).json({ success: false, message: err.message || 'Approve failed' });
  }
});

router.post('/school/assets/replacements/:id/reject', requireRole(ASSETS_WRITE_ROLES), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const data = await rejectReplacementRecord(schoolId, req.params.id, req.body || {});
    res.json({ success: true, message: 'Replacement rejected', data });
  } catch (err) {
    if (err?.status) return res.status(err.status).json({ success: false, message: err.message });
    console.error('POST /school/assets/replacements/:id/reject:', err);
    res.status(500).json({ success: false, message: err.message || 'Reject failed' });
  }
});

router.delete('/school/assets/replacements/:id', requireRole(ASSETS_WRITE_ROLES), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const data = await deleteReplacementRecord(schoolId, req.params.id);
    res.json({ success: true, message: 'Replacement deleted', data });
  } catch (err) {
    if (err?.status) return res.status(err.status).json({ success: false, message: err.message });
    console.error('DELETE /school/assets/replacements/:id:', err);
    res.status(500).json({ success: false, message: err.message || 'Delete failed' });
  }
});

router.post('/school/assets/assignments', requireRole(ASSETS_WRITE_ROLES), async (req, res) => {
  try {
    const { schoolId, userId } = req.ctx;
    const body = req.body || {};
    const draft = body.save_as_draft === true || body.status === 'Draft';
    const assetId = Number(body.asset_id || body.assetId);
    let assignType = trimStr(body.assign_type || body.assignType).toLowerCase();
    if (!assetId) return res.status(400).json({ success: false, message: 'Asset is required' });
    if (draft && !assignType) assignType = 'personal';
    if (!['personal', 'place', 'staff'].includes(assignType)) {
      return res.status(400).json({ success: false, message: 'Invalid assignment type' });
    }

    const [[asset]] = await promisePool.query(
      `SELECT id, asset_name, status FROM school_assets WHERE id = ? AND school_id = ? AND deleted_at IS NULL LIMIT 1`,
      [assetId, schoolId]
    );
    if (!asset) return res.status(404).json({ success: false, message: 'Asset not found' });

    let assigneeName = '';
    let staffUserId = null;
    let staffDepartment = null;
    let placeLabel = null;
    let placeBuilding = null;
    let placeRoom = null;
    let assigneeContact = trimStr(body.assignee_contact || body.personContact) || null;

    if (assignType === 'personal') {
      assigneeName = trimStr(body.assignee_name || body.personName);
      if (!assigneeName && !draft) return res.status(400).json({ success: false, message: 'Person name is required' });
      if (!assigneeName) assigneeName = 'Draft — personal';
    } else if (assignType === 'staff') {
      staffUserId = Number(body.staff_user_id || body.staffUserId);
      assigneeName = trimStr(body.assignee_name || body.staffName);
      staffDepartment = trimStr(body.staff_department || body.department);
      if (staffUserId) {
        const [[st]] = await promisePool.query(
          `SELECT st.full_name, st.department FROM staff st
           INNER JOIN users u ON u.id = st.user_id WHERE st.user_id = ? AND st.school_id = ? LIMIT 1`,
          [staffUserId, schoolId]
        );
        if (st) {
          assigneeName = assigneeName || st.full_name;
          staffDepartment = staffDepartment || st.department;
        }
      }
      if (!assigneeName && !draft) return res.status(400).json({ success: false, message: 'Staff member is required' });
      if (!assigneeName) assigneeName = 'Draft — staff';
    } else if (assignType === 'place') {
      placeLabel = trimStr(body.place_label || body.placeLabel);
      placeBuilding = trimStr(body.place_building || body.building);
      placeRoom = trimStr(body.place_room || body.room);
      assigneeName = placeLabel || `${placeBuilding} ${placeRoom}`.trim();
      if (!assigneeName && !draft) return res.status(400).json({ success: false, message: 'Location is required' });
      if (!assigneeName) assigneeName = 'Draft — place';
    }

    const returnable = body.returnable !== false && body.returnable !== 0;
    const assignmentDate = body.assignment_date || body.assignmentDate || new Date().toISOString().slice(0, 10);
    const expectedReturn = returnable ? (body.expected_return_date || body.returnDate || null) : null;
    if (!draft && returnable && !expectedReturn) {
      return res.status(400).json({ success: false, message: 'Expected return date is required' });
    }

    const conditionCode = mapConditionToCode(body.condition_code || body.condition);
    const status = draft ? 'Draft' : 'Active';

    const [result] = await promisePool.query(
      `INSERT INTO school_asset_assignments (
        school_id, asset_id, assign_type, assignee_name, assignee_contact,
        staff_user_id, staff_department, place_label, place_building, place_room,
        returnable, assignment_date, expected_return_date, condition_code, notes, status, created_by
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        schoolId, assetId, assignType, assigneeName, assigneeContact,
        staffUserId || null, staffDepartment, placeLabel, placeBuilding, placeRoom,
        returnable ? 1 : 0, assignmentDate, expectedReturn, conditionCode,
        trimStr(body.notes) || null, status, userId,
      ]
    );

    if (!draft) {
      await promisePool.query(
        `UPDATE school_assets SET status = 'Assigned', updated_at = NOW() WHERE id = ? AND school_id = ?`,
        [assetId, schoolId]
      );
    }

    const [[row]] = await promisePool.query(
      `SELECT a.*, sa.asset_name, sa.asset_code FROM school_asset_assignments a
       INNER JOIN school_assets sa ON sa.id = a.asset_id WHERE a.id = ? LIMIT 1`,
      [result.insertId]
    );
    res.status(201).json({
      success: true,
      message: draft ? 'Draft saved' : 'Asset assigned successfully',
      data: mapAssignmentRow(row, row),
    });
  } catch (err) {
    console.error('POST /school/assets/assignments:', err);
    res.status(500).json({ success: false, message: err.message || 'Assignment failed' });
  }
});

router.get('/school/assets', requireRole(ASSETS_READ_ROLES), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const qRaw = trimStr(req.query.q);
    const searchField = trimStr(req.query.search_field || req.query.searchField) || 'all';
    const category = trimStr(req.query.category);
    const status = trimStr(req.query.status);
    const assetsStatus = trimStr(req.query.assets_status || req.query.assetsStatus);
    const location = trimStr(req.query.location);
    const assetType = trimStr(req.query.asset_type || req.query.assetType);
    const condition = trimStr(req.query.condition || req.query.condition_code).toUpperCase();
    const purchaseYear = trimStr(req.query.purchase_year || req.query.purchaseYear);
    const registerYear = trimStr(req.query.register_year || req.query.registerYear);
    const valueMin = toMoney(req.query.value_min ?? req.query.valueMin);
    const valueMax = toMoney(req.query.value_max ?? req.query.valueMax);

    let sql = `SELECT * FROM school_assets WHERE school_id = ? AND deleted_at IS NULL`;
    const params = [schoolId];

    if (assetsStatus) {
      sql += ' AND assets_status = ?';
      params.push(assetsStatus);
    } else if (status) {
      sql += ' AND status = ?';
      params.push(status);
    } else {
      sql += " AND status != 'Draft'";
    }
    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }
    if (location) {
      sql += ' AND location = ?';
      params.push(location);
    }
    if (assetType) {
      sql += ' AND asset_type = ?';
      params.push(assetType);
    }
    if (condition) {
      sql += ' AND condition_code = ?';
      params.push(condition);
    }
    if (purchaseYear) {
      sql += ' AND YEAR(purchase_date) = ?';
      params.push(Number(purchaseYear) || purchaseYear);
    }
    if (registerYear) {
      sql += ' AND register_year = ?';
      params.push(Number(registerYear) || registerYear);
    }
    if (valueMin > 0) {
      sql += ' AND COALESCE(total_balance, 0) >= ?';
      params.push(valueMin);
    }
    if (valueMax > 0) {
      sql += ' AND COALESCE(total_balance, 0) <= ?';
      params.push(valueMax);
    }
    if (qRaw) {
      if (searchField === 'code') {
        sql += ' AND LOWER(TRIM(asset_code)) = LOWER(TRIM(?))';
        params.push(qRaw);
      } else if (searchField === 'serial') {
        sql += ' AND LOWER(TRIM(serial_number)) = LOWER(TRIM(?))';
        params.push(qRaw);
      } else if (searchField === 'name') {
        sql += ' AND LOWER(TRIM(asset_name)) LIKE LOWER(TRIM(?))';
        params.push(`%${qRaw}%`);
      } else {
        const like = `%${qRaw.toLowerCase()}%`;
        sql += ` AND (
          LOWER(asset_name) LIKE ? OR LOWER(asset_code) LIKE ?
          OR LOWER(label_tag) LIKE ? OR LOWER(serial_number) LIKE ?
          OR LOWER(sku) LIKE ?
        )`;
        params.push(like, like, like, like, like);
      }
    }
    sql += ' ORDER BY created_at DESC LIMIT 500';

    const [rows] = await promisePool.query(sql, params);
    res.json({ success: true, data: rows.map(mapAssetRow) });
  } catch (err) {
    console.error('GET /school/assets:', err);
    res.status(500).json({ success: false, message: err.message || 'List failed' });
  }
});

router.get('/school/assets/identifiers', requireRole(ASSETS_READ_ROLES), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const registerYear = trimStr(req.query.register_year || req.query.registerYear) || null;
    const sets = await loadSchoolIdentifierSets(schoolId, registerYear);
    res.json({
      success: true,
      data: {
        asset_codes: [...sets.codes],
        label_tags: [...sets.labels],
        serial_numbers: [...sets.serials],
      },
    });
  } catch (err) {
    console.error('GET /school/assets/identifiers:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to load identifiers' });
  }
});

router.post('/school/assets/import', requireRole(ASSETS_WRITE_ROLES), async (req, res) => {
  try {
    const { schoolId, userId } = req.ctx;
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
    const skipDuplicates = req.body?.skip_duplicates !== false;
    const batchRegisterYear = resolveRegisterYear(req.body, currentCalendarYear());
    if (!rows.length) {
      return res.status(400).json({ success: false, message: 'No rows to import' });
    }
    if (rows.length > 500) {
      return res.status(400).json({ success: false, message: 'Maximum 500 rows per import' });
    }

    const sets = await loadSchoolIdentifierSets(schoolId, batchRegisterYear);
    const fileSeen = { codes: new Set(), labels: new Set(), serials: new Set() };
    const created = [];
    const errors = [];
    const skipped = [];

    for (let i = 0; i < rows.length; i += 1) {
      try {
        const p = payloadFromBody(rows[i], { defaultRegisterYear: batchRegisterYear, isCreate: true });
        if (!p.asset_name) {
          errors.push({ row: i + 1, message: 'Asset name is required' });
          continue;
        }
        if (!p.location) {
          errors.push({ row: i + 1, message: 'Location is required' });
          continue;
        }
        if (!p.asset_type) {
          errors.push({ row: i + 1, message: 'Asset type is required' });
          continue;
        }

        const dupIssues = findDuplicateIssues(p, sets, fileSeen);
        if (dupIssues.length) {
          if (skipDuplicates) {
            skipped.push({ row: i + 1, message: dupIssues.join('; '), duplicate: true });
            continue;
          }
          errors.push({ row: i + 1, message: dupIssues.join('; '), duplicate: true });
          continue;
        }

        if (p.asset_code && sets.codes.has(trimStr(p.asset_code).toUpperCase())) {
          p.asset_code = null;
        }

        const data = await insertAssetRecord(schoolId, userId, p);
        created.push(data);
        const c = trimStr(data.asset_code).toUpperCase();
        const l = trimStr(data.label_tag).toUpperCase();
        const s = trimStr(data.serial_number).toUpperCase();
        if (c) sets.codes.add(c);
        if (l) sets.labels.add(l);
        if (s) sets.serials.add(s);
      } catch (rowErr) {
        if (rowErr?.code === 'ER_DUP_ENTRY') {
          errors.push({ row: i + 1, message: 'Duplicate asset code, tag, or serial in database', duplicate: true });
        } else {
          errors.push({ row: i + 1, message: rowErr.sqlMessage || rowErr.message || 'Insert failed' });
        }
      }
    }

    res.json({
      success: true,
      message: `Imported ${created.length} of ${rows.length} assets`,
      data: {
        created: created.length,
        failed: errors.length,
        skipped: skipped.length,
        assets: created,
        errors,
        skipped_rows: skipped,
      },
    });
  } catch (err) {
    console.error('POST /school/assets/import:', err);
    res.status(500).json({ success: false, message: err.message || 'Import failed' });
  }
});

function buildPanelPayload(row) {
  const asset = mapAssetRow(row);
  const id = asset.id || 1;
  const seed = (salt) => ((id * 9301 + salt * 49297) % 1000) / 1000;
  const maintenance = [];
  for (let i = 0; i < 2 + Math.floor(seed(1) * 2); i += 1) {
    const dt = new Date(row.updated_at || row.created_at || Date.now());
    dt.setMonth(dt.getMonth() - (i + 1) * 4);
    maintenance.push({
      id: `${id}-m${i}`,
      date: dt.toISOString().slice(0, 10),
      type: ['Preventive', 'Corrective', 'Inspection'][i % 3],
      status: ['Completed', 'Scheduled'][i % 2],
      note: `Maintenance record ${i + 1} — ${asset.asset_name || 'asset'}`,
    });
  }
  const assignments = [];
  return {
    asset,
    maintenance,
    assignments,
    images: [
      { id: `${id}-0`, label: 'Primary view', color: '#000435' },
      { id: `${id}-1`, label: 'Asset tag', color: '#FEBF10' },
      { id: `${id}-2`, label: 'Location', color: '#3d5a80' },
    ],
  };
}

router.get('/school/assets/scan-lookup', requireRole(ASSETS_READ_ROLES), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    let assetId = Number(req.query.id);
    const code = trimStr(req.query.code || req.query.asset_code);

    if (!Number.isFinite(assetId) && code) {
      const [[row]] = await promisePool.query(
        `SELECT id FROM school_assets
         WHERE school_id = ? AND deleted_at IS NULL AND asset_code = ? LIMIT 1`,
        [schoolId, code]
      );
      assetId = row?.id;
    }

    if (!Number.isFinite(assetId)) {
      return res.status(404).json({ success: false, message: 'Asset not found for this QR code' });
    }

    const panel = await loadAssetPanelById(schoolId, assetId);
    if (!panel) return res.status(404).json({ success: false, message: 'Asset not found' });
    res.json({ success: true, data: panel });
  } catch (err) {
    console.error('GET /school/assets/scan-lookup:', err);
    res.status(500).json({ success: false, message: err.message || 'Scan lookup failed' });
  }
});

router.get('/school/assets/:id/panel', requireRole(ASSETS_READ_ROLES), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const id = Number(req.params.id);
    const panel = await loadAssetPanelById(schoolId, id);
    if (!panel) return res.status(404).json({ success: false, message: 'Asset not found' });
    res.json({ success: true, data: panel });
  } catch (err) {
    console.error('GET /school/assets/:id/panel:', err);
    res.status(500).json({ success: false, message: err.message || 'Panel load failed' });
  }
});

router.get('/school/assets/:id', requireRole(ASSETS_READ_ROLES), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const id = Number(req.params.id);
    const [[row]] = await promisePool.query(
      `SELECT * FROM school_assets WHERE id = ? AND school_id = ? AND deleted_at IS NULL LIMIT 1`,
      [id, schoolId]
    );
    if (!row) return res.status(404).json({ success: false, message: 'Asset not found' });
    res.json({ success: true, data: mapAssetRow(row) });
  } catch (err) {
    console.error('GET /school/assets/:id:', err);
    res.status(500).json({ success: false, message: err.message || 'Load failed' });
  }
});

router.post('/school/assets', requireRole(ASSETS_WRITE_ROLES), async (req, res) => {
  try {
    const { schoolId, userId } = req.ctx;
    const draft = req.body?.save_as_draft === true || req.body?.status === 'Draft';
    const p = payloadFromBody(req.body, { draft, defaultRegisterYear: currentCalendarYear(), isCreate: true });

    if (!draft) {
      if (!p.asset_name) return res.status(400).json({ success: false, message: 'Asset name is required' });
      if (!p.location) return res.status(400).json({ success: false, message: 'Location is required' });
      if (!p.asset_type) return res.status(400).json({ success: false, message: 'Asset type is required' });
    } else if (!p.asset_name) {
      p.asset_name = 'Draft Asset';
    }

    const data = await insertAssetRecord(schoolId, userId, p);
    res.status(201).json({ success: true, message: draft ? 'Draft saved' : 'Asset registered', data });
  } catch (err) {
    if (err?.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'Asset code already exists' });
    }
    console.error('POST /school/assets:', err);
    res.status(500).json({ success: false, message: err.message || 'Create failed' });
  }
});

router.patch('/school/assets/:id', requireRole(ASSETS_WRITE_ROLES), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const id = Number(req.params.id);
    const p = payloadFromBody(req.body);

    const [[existing]] = await promisePool.query(
      `SELECT id FROM school_assets WHERE id = ? AND school_id = ? AND deleted_at IS NULL LIMIT 1`,
      [id, schoolId]
    );
    if (!existing) return res.status(404).json({ success: false, message: 'Asset not found' });

    await promisePool.query(
      `UPDATE school_assets SET
        asset_name = COALESCE(NULLIF(?, ''), asset_name),
        label_tag = ?, asset_type = ?, asset_type_other = ?, category = ?, description = ?, location = ?,
        supplier_name = ?, upi = ?, sku = ?, serial_number = ?, brand = ?, material = ?, size_label = ?,
        purchase_date = ?, unit_price = ?, tax_amount = ?, price_incl_tax = ?, opening_amount = ?, total_balance = ?, accumulated_depreciation = ?,
        invoice_number = ?, sd_number = ?, receipt_number = ?, reference_no = ?,
        funding_source = ?, funding_source_other = ?,
        dep_mode = ?, dep_rate = ?, dep_years = ?, decimal_dep = ?, annual_dep = ?, total_dep = ?, net_book_value = ?,
        quantity = ?, unit = ?, condition_code = ?, notes = ?, status = COALESCE(NULLIF(?, ''), status),
        assets_status = COALESCE(NULLIF(?, ''), assets_status),
        register_year = COALESCE(?, register_year),
        updated_at = NOW()
       WHERE id = ? AND school_id = ?`,
      [
        p.asset_name, p.label_tag, p.asset_type, p.asset_type_other, p.category, p.description, p.location,
        p.supplier_name, p.upi, p.sku, p.serial_number, p.brand, p.material, p.size_label,
        p.purchase_date, p.unit_price, p.tax_amount, p.price_incl_tax, p.opening_amount, p.total_balance, p.accumulated_depreciation,
        p.invoice_number, p.sd_number, p.receipt_number, p.reference_no,
        p.funding_source, p.funding_source_other,
        p.dep_mode, p.dep_rate, p.dep_years, p.decimal_dep, p.annual_dep, p.total_dep, p.net_book_value,
        p.quantity, p.unit, p.condition_code, p.notes, p.status, p.assets_status,
        p.register_year,
        id, schoolId,
      ]
    );

    const [[row]] = await promisePool.query(`SELECT * FROM school_assets WHERE id = ? LIMIT 1`, [id]);
    res.json({ success: true, message: 'Asset updated', data: mapAssetRow(row) });
  } catch (err) {
    console.error('PATCH /school/assets/:id:', err);
    res.status(500).json({ success: false, message: err.message || 'Update failed' });
  }
});

router.patch('/school/assets/:id/health-status', requireRole(ASSETS_WRITE_ROLES), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const id = Number(req.params.id);
    const healthStatus = trimStr(
      req.body.asset_health_status ?? req.body.assetHealthStatus ?? req.body.health_status
    );
    if (!VALID_ASSET_HEALTH_STATUSES.includes(healthStatus)) {
      return res.status(400).json({ success: false, message: 'Invalid asset health status' });
    }
    const [[existing]] = await promisePool.query(
      `SELECT id FROM school_assets WHERE id = ? AND school_id = ? AND deleted_at IS NULL LIMIT 1`,
      [id, schoolId]
    );
    if (!existing) return res.status(404).json({ success: false, message: 'Asset not found' });

    await promisePool.query(
      `UPDATE school_assets SET asset_health_status = ?, updated_at = NOW() WHERE id = ? AND school_id = ?`,
      [healthStatus, id, schoolId]
    );
    const [[row]] = await promisePool.query(`SELECT * FROM school_assets WHERE id = ? LIMIT 1`, [id]);
    res.json({ success: true, message: 'Health status updated', data: mapAssetRow(row) });
  } catch (err) {
    console.error('PATCH /school/assets/:id/health-status:', err);
    res.status(500).json({ success: false, message: err.message || 'Health status update failed' });
  }
});

router.patch('/school/assets/:id/assets-status', requireRole(ASSETS_WRITE_ROLES), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const id = Number(req.params.id);
    const assetsStatus = trimStr(req.body.assets_status || req.body.assetsStatus);
    if (!VALID_ASSETS_STATUSES.includes(assetsStatus)) {
      return res.status(400).json({ success: false, message: 'Invalid assets status' });
    }
    const [[existing]] = await promisePool.query(
      `SELECT id FROM school_assets WHERE id = ? AND school_id = ? AND deleted_at IS NULL LIMIT 1`,
      [id, schoolId]
    );
    if (!existing) return res.status(404).json({ success: false, message: 'Asset not found' });

    await promisePool.query(
      `UPDATE school_assets SET assets_status = ?, updated_at = NOW() WHERE id = ? AND school_id = ?`,
      [assetsStatus, id, schoolId]
    );
    const [[row]] = await promisePool.query(`SELECT * FROM school_assets WHERE id = ? LIMIT 1`, [id]);
    res.json({ success: true, message: 'Status updated', data: mapAssetRow(row) });
  } catch (err) {
    console.error('PATCH /school/assets/:id/assets-status:', err);
    res.status(500).json({ success: false, message: err.message || 'Status update failed' });
  }
});

router.delete('/school/assets/:id', requireRole(ASSETS_WRITE_ROLES), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const id = Number(req.params.id);
    const [r] = await promisePool.query(
      `UPDATE school_assets SET deleted_at = NOW() WHERE id = ? AND school_id = ? AND deleted_at IS NULL`,
      [id, schoolId]
    );
    if (!r.affectedRows) return res.status(404).json({ success: false, message: 'Asset not found' });
    res.json({ success: true, message: 'Asset removed' });
  } catch (err) {
    console.error('DELETE /school/assets/:id:', err);
    res.status(500).json({ success: false, message: err.message || 'Delete failed' });
  }
});

module.exports = router;
