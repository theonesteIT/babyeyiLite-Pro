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
let categoriesTableReady = false;

const DEFAULT_CATEGORY_SEEDS = [
  { name: 'IT Equipment', icon: 'Monitor', description: 'Computers, laptops, printers, servers' },
  { name: 'Furniture', icon: 'Armchair', description: 'Desks, chairs, cabinets, tables' },
  { name: 'Vehicles', icon: 'Car', description: 'Cars, trucks, vans, motorcycles' },
  { name: 'Electronics', icon: 'Smartphone', description: 'Phones, cameras, projectors' },
  { name: 'Machinery', icon: 'Wrench', description: 'Industrial and workshop machinery' },
  { name: 'Laboratory Equipment', icon: 'FlaskConical', description: 'Microscopes, lab instruments' },
  { name: 'Buildings', icon: 'Building2', description: 'Structures and facilities' },
  { name: 'Land', icon: 'LandPlot', description: 'Land parcels and plots' },
  { name: 'Office Equipment', icon: 'Boxes', description: 'General office assets' },
];

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
    const y = val.getUTCFullYear();
    const m = String(val.getUTCMonth() + 1).padStart(2, '0');
    const d = String(val.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const s = trimStr(val);
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
        `INSERT INTO school_asset_categories (school_id, name, icon, description) VALUES (?,?,?,?)`,
        [schoolId, seed.name, seed.icon, seed.description]
      );
    } catch (e) {
      if (e.code !== 'ER_DUP_ENTRY') throw e;
    }
  }
}

async function loadCategoriesWithCounts(schoolId) {
  await seedDefaultCategoriesIfEmpty(schoolId);
  const [rows] = await promisePool.query(
    `SELECT c.id, c.name, c.icon, c.description, c.created_at,
       (SELECT COUNT(*) FROM school_assets a
        WHERE a.school_id = c.school_id AND a.deleted_at IS NULL AND a.category = c.name) AS asset_count
     FROM school_asset_categories c
     WHERE c.school_id = ? AND c.deleted_at IS NULL
     ORDER BY c.name`,
    [schoolId]
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    icon: r.icon || 'Monitor',
    description: r.description || '',
    asset_count: Number(r.asset_count || 0),
    count: Number(r.asset_count || 0),
    created_at: r.created_at,
  }));
}

function mapCategoryRow(row, assetCount = 0) {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon || 'Monitor',
    description: row.description || '',
    asset_count: assetCount,
    count: assetCount,
    created_at: row.created_at,
  };
}

function currentCalendarYear() {
  return new Date().getFullYear();
}

function resolveRegisterYear(body, fallback) {
  const raw = body?.register_year ?? body?.registerYear;
  const n = Number(raw);
  if (Number.isFinite(n) && n >= 1990 && n <= 2100) return Math.floor(n);
  return fallback ?? currentCalendarYear();
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
      created_by INT UNSIGNED NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_sam_school (school_id),
      KEY idx_sam_asset (asset_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
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
  };
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
    opening_amount: row.opening_amount != null ? Number(row.opening_amount) : null,
    invoice_number: row.invoice_number,
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

function applyDepreciationMath(p) {
  const totalBalance = toMoney(p.total_balance) || toMoney(p.unit_price) + toMoney(p.opening_amount);
  const accumulated = toMoney(p.accumulated_depreciation);
  const rate = toMoney(p.dep_rate);
  const decimalDep = p.decimal_dep != null && p.decimal_dep !== ''
    ? toMoney(p.decimal_dep)
    : (rate > 0 ? rate / 100 : 0);
  const annualDep = p.annual_dep != null && toMoney(p.annual_dep) > 0
    ? toMoney(p.annual_dep)
    : totalBalance * decimalDep;
  const totalDep = p.total_dep != null && toMoney(p.total_dep) > 0
    ? toMoney(p.total_dep)
    : accumulated + annualDep;
  const netBookValue = p.net_book_value != null && toMoney(p.net_book_value) > 0
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

function payloadFromBody(body, { draft = false, defaultRegisterYear } = {}) {
  const assetName = trimStr(body.asset_name || body.assetName);
  const location = formatLocationValue(body.location);
  const typeRaw = trimStr(body.asset_type || body.type).toUpperCase();
  const typeOther = trimStr(body.asset_type_other || body.typeOther || body.type_other);
  const assetType = typeRaw || null;
  const qty = Math.max(1, toMoney(body.quantity || 1));
  const unitPrice = toMoney(body.unit_price || body.unitPrice);
  const opening = toMoney(body.opening_amount ?? body.openingAmount);
  const totalBalance = toMoney(body.total_balance ?? body.totalBalance)
    || unitPrice + opening;
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
    supplier_name: trimStr(body.supplier_name || body.supplier) || null,
    upi: trimStr(body.upi) || null,
    sku: trimStr(body.sku) || null,
    serial_number: trimStr(body.serial_number || body.serialNumber) || null,
    brand: trimStr(body.brand) || null,
    material: trimStr(body.material) || null,
    size_label: trimStr(body.size_label || body.size) || null,
    purchase_date: buildPurchaseDate(body),
    unit_price: unitPrice || null,
    opening_amount: opening || null,
    total_balance: totalBalance || null,
    accumulated_depreciation: toMoney(body.accumulated_depreciation ?? body.accumulatedDepreciation),
    invoice_number: trimStr(body.invoice_number || body.invoice) || null,
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
    register_year: resolveRegisterYear(body, defaultRegisterYear),
  };
  return applyDepreciationMath(base);
}

async function insertAssetRecord(schoolId, userId, p) {
  const assetCode = p.asset_code || await nextAssetCode(schoolId);
  const [result] = await promisePool.query(
    `INSERT INTO school_assets (
      school_id, asset_code, asset_name, label_tag, asset_type, asset_type_other, category, description, location,
      supplier_name, upi, sku, serial_number, brand, material, size_label,
      purchase_date, unit_price, opening_amount, total_balance, accumulated_depreciation,
      invoice_number, funding_source, funding_source_other,
      dep_mode, dep_rate, dep_years, decimal_dep, annual_dep, total_dep, net_book_value,
      quantity, unit, condition_code, notes, status, register_year, created_by
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      schoolId, assetCode, p.asset_name, p.label_tag, p.asset_type, p.asset_type_other, p.category, p.description, p.location,
      p.supplier_name, p.upi, p.sku, p.serial_number, p.brand, p.material, p.size_label,
      p.purchase_date, p.unit_price, p.opening_amount, p.total_balance, p.accumulated_depreciation,
      p.invoice_number, p.funding_source, p.funding_source_other,
      p.dep_mode, p.dep_rate, p.dep_years, p.decimal_dep, p.annual_dep, p.total_dep, p.net_book_value,
      p.quantity, p.unit, p.condition_code, p.notes, p.status, p.register_year, userId,
    ]
  );
  const [[row]] = await promisePool.query(`SELECT * FROM school_assets WHERE id = ? LIMIT 1`, [result.insertId]);
  return mapAssetRow(row);
}

async function nextAssetCode(schoolId) {
  const prefix = 'AST';
  const [rows] = await promisePool.query(
    `SELECT asset_code FROM school_assets
     WHERE school_id = ? AND deleted_at IS NULL
       AND asset_code REGEXP '^AST-[0-9]+$'`,
    [schoolId]
  );
  let maxSeq = 0;
  rows.forEach((r) => {
    const m = String(r.asset_code || '').match(/^AST-(\d+)$/i);
    if (m) maxSeq = Math.max(maxSeq, Number(m[1]));
  });
  return `${prefix}-${String(maxSeq + 1).padStart(5, '0')}`;
}

async function loadSchoolIdentifierSets(schoolId, registerYear = null) {
  let sql = `SELECT asset_code, label_tag, serial_number FROM school_assets
     WHERE school_id = ? AND deleted_at IS NULL`;
  const params = [schoolId];
  const yr = Number(registerYear);
  if (Number.isFinite(yr) && yr >= 1990 && yr <= 2100) {
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
    if (!name) return res.status(400).json({ success: false, message: 'Category name is required' });
    if (!VALID_CATEGORY_ICONS.includes(icon)) {
      return res.status(400).json({ success: false, message: 'Invalid icon' });
    }
    const [result] = await promisePool.query(
      `INSERT INTO school_asset_categories (school_id, name, icon, description) VALUES (?,?,?,?)`,
      [schoolId, name, icon, description]
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
    const [[existing]] = await promisePool.query(
      `SELECT * FROM school_asset_categories WHERE id = ? AND school_id = ? AND deleted_at IS NULL LIMIT 1`,
      [id, schoolId]
    );
    if (!existing) return res.status(404).json({ success: false, message: 'Category not found' });
    const newName = name || existing.name;
    const newIcon = icon && VALID_CATEGORY_ICONS.includes(icon) ? icon : existing.icon;
    const newDesc = description !== undefined ? (description || null) : existing.description;
    await promisePool.query(
      `UPDATE school_asset_categories SET name = ?, icon = ?, description = ?, updated_at = NOW()
       WHERE id = ? AND school_id = ?`,
      [newName, newIcon, newDesc, id, schoolId]
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
    const location = trimStr(req.query.location);
    const assetType = trimStr(req.query.asset_type || req.query.assetType);
    const condition = trimStr(req.query.condition || req.query.condition_code).toUpperCase();
    const purchaseYear = trimStr(req.query.purchase_year || req.query.purchaseYear);
    const registerYear = trimStr(req.query.register_year || req.query.registerYear);
    const valueMin = toMoney(req.query.value_min ?? req.query.valueMin);
    const valueMax = toMoney(req.query.value_max ?? req.query.valueMax);

    let sql = `SELECT * FROM school_assets WHERE school_id = ? AND deleted_at IS NULL`;
    const params = [schoolId];

    if (status) {
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
        const p = payloadFromBody(rows[i], { defaultRegisterYear: batchRegisterYear });
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

router.get('/school/assets/:id/panel', requireRole(ASSETS_READ_ROLES), async (req, res) => {
  try {
    const { schoolId } = req.ctx;
    const id = Number(req.params.id);
    const [[row]] = await promisePool.query(
      `SELECT * FROM school_assets WHERE id = ? AND school_id = ? AND deleted_at IS NULL LIMIT 1`,
      [id, schoolId]
    );
    if (!row) return res.status(404).json({ success: false, message: 'Asset not found' });
    const [assignRows] = await promisePool.query(
      `SELECT assignee_name, staff_department, place_label, assign_type, assignment_date
       FROM school_asset_assignments
       WHERE asset_id = ? AND school_id = ? AND status = 'Active'
       ORDER BY created_at DESC LIMIT 5`,
      [id, schoolId]
    );
    const panel = buildPanelPayload(row);
    panel.assignments = (assignRows || []).map((r) => ({
      name: r.assignee_name,
      department: r.staff_department || r.place_label || '—',
      role: r.assign_type,
      since: r.assignment_date,
    }));
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
    const p = payloadFromBody(req.body, { draft, defaultRegisterYear: currentCalendarYear() });

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
        purchase_date = ?, unit_price = ?, opening_amount = ?, total_balance = ?, accumulated_depreciation = ?,
        invoice_number = ?, funding_source = ?, funding_source_other = ?,
        dep_mode = ?, dep_rate = ?, dep_years = ?, decimal_dep = ?, annual_dep = ?, total_dep = ?, net_book_value = ?,
        quantity = ?, unit = ?, condition_code = ?, notes = ?, status = COALESCE(NULLIF(?, ''), status),
        register_year = COALESCE(?, register_year),
        updated_at = NOW()
       WHERE id = ? AND school_id = ?`,
      [
        p.asset_name, p.label_tag, p.asset_type, p.asset_type_other, p.category, p.description, p.location,
        p.supplier_name, p.upi, p.sku, p.serial_number, p.brand, p.material, p.size_label,
        p.purchase_date, p.unit_price, p.opening_amount, p.total_balance, p.accumulated_depreciation,
        p.invoice_number, p.funding_source, p.funding_source_other,
        p.dep_mode, p.dep_rate, p.dep_years, p.decimal_dep, p.annual_dep, p.total_dep, p.net_book_value,
        p.quantity, p.unit, p.condition_code, p.notes, p.status, p.register_year,
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
