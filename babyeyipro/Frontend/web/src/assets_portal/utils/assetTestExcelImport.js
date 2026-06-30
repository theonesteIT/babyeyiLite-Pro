import * as XLSX from 'xlsx';
import { computeAssetRegisterMath, parseRegisterNum, rollCategoryStateAfterAsset } from './assetRegisterMath';

/** Minimal import columns (matches user spreadsheet layout) */
export const ASSET_TEST_IMPORT_HEADERS = [
  'location',
  'label',
  'type',
  'supplier',
  'upi',
  'sku',
  'cba',
  'material',
  'purchase_year',
  'purchase_month',
  'purchase_day',
  'purchase_unit_price',
  'name',
];

const HEADER_ALIASES = {
  location: ['location'],
  label: ['label', 'label_tag', 'label tag'],
  type: ['type', 'asset_type', 'asset type'],
  category: ['category', 'type or category'],
  supplier: ['supplier', 'supplier_name'],
  upi: ['upi'],
  sku: ['sku'],
  cba: ['cba'],
  material: ['material'],
  purchase_year: ['purchase_year', 'purchase year'],
  purchase_month: ['purchase_month', 'purchase month'],
  purchase_day: ['purchase_day', 'purchase day'],
  purchase_unit_price: [
    'purchase_unit_price',
    'purchase unit price',
    'purchasing price',
    'unit_price',
    'unit price',
    'price',
  ],
  name: ['name', 'asset_name', 'asset name'],
};

/** Map asset-type codes (Excel) → Year Setup category names */
const IMPORT_TYPE_TO_CATEGORY = {
  BUILDING: 'Buildings',
  BUILDINGS: 'Buildings',
  FURNITURE: 'Furniture',
  VEHICLE: 'Vehicles',
  VEHICLES: 'Vehicles',
  'ICT & ELECTRONICS': 'IT Equipment',
  'ICT AND ELECTRONICS': 'IT Equipment',
  'LAB EQUIPMENT': 'Laboratory Equipment',
  MACHINERY: 'Machinery',
  'OFFICE EQUIPMENT': 'Office Equipment',
  ELECTRONICS: 'Electronics',
  LAND: 'Land',
};

function normalizeCategoryToken(s) {
  return String(s || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Resolve register category — prefers explicit category column, then type → Year Setup name */
export function resolveImportCategoryName({ type, category, knownCategories = [] } = {}) {
  const explicit = cellStr(category);
  if (explicit) return explicit;

  const typeRaw = cellStr(type);
  if (!typeRaw) return '';

  const typeUpper = typeRaw.toUpperCase();
  if (IMPORT_TYPE_TO_CATEGORY[typeUpper]) return IMPORT_TYPE_TO_CATEGORY[typeUpper];

  const typeNorm = normalizeCategoryToken(typeRaw);
  for (const name of knownCategories) {
    const nameNorm = normalizeCategoryToken(name);
    if (!nameNorm) continue;
    if (nameNorm === typeNorm) return name;
    if (nameNorm === `${typeNorm}s` || `${nameNorm}s` === typeNorm) return name;
    if (nameNorm.replace(/s$/, '') === typeNorm.replace(/s$/, '')) return name;
  }

  return typeRaw;
}

function normKey(k) {
  return String(k ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function cellStr(v) {
  if (v === undefined || v === null) return '';
  return String(v).trim();
}

function mapRowKeys(raw) {
  const out = {};
  const aliasToCanonical = {};
  Object.entries(HEADER_ALIASES).forEach(([canonical, aliases]) => {
    aliases.forEach((a) => { aliasToCanonical[normKey(a)] = canonical; });
    aliasToCanonical[normKey(canonical)] = canonical;
  });
  Object.entries(raw).forEach(([k, v]) => {
    const canon = aliasToCanonical[normKey(k)];
    if (!canon) return;
    const existing = out[canon];
    if (cellStr(existing) && !cellStr(v)) return;
    out[canon] = v;
  });
  ASSET_TEST_IMPORT_HEADERS.forEach((h) => {
    if (raw[h] !== undefined && out[h] === undefined) out[h] = raw[h];
  });
  return out;
}

function buildPurchaseDate(y, m, d) {
  const yr = cellStr(y);
  const mo = cellStr(m);
  const da = cellStr(d);
  if (!yr || !mo || !da) return null;
  const mm = String(Number(mo)).padStart(2, '0');
  const dd = String(Number(da)).padStart(2, '0');
  if (!/^\d{4}$/.test(yr)) return null;
  return `${yr}-${mm}-${dd}`;
}

export function excelRowToTestImportRow(row, knownCategories = []) {
  const r = mapRowKeys(row);
  const category = resolveImportCategoryName({
    type: r.type,
    category: r.category,
    knownCategories,
  });
  const price = parseRegisterNum(r.purchase_unit_price);
  return {
    asset_name: cellStr(r.name),
    category,
    asset_type: cellStr(r.type).toUpperCase() || category || null,
    location: cellStr(r.location) || null,
    label_tag: cellStr(r.label) || null,
    supplier_name: cellStr(r.supplier) || null,
    upi: cellStr(r.upi) || null,
    sku: cellStr(r.sku) || null,
    material: cellStr(r.material) || null,
    purchase_year: r.purchase_year,
    purchase_month: r.purchase_month,
    purchase_day: r.purchase_day,
    purchase_date: buildPurchaseDate(r.purchase_year, r.purchase_month, r.purchase_day),
    unit_price: price > 0 ? price : null,
    cba: cellStr(r.cba) || null,
  };
}

function sanitizeSkuSegment(value, fallback = 'X') {
  const cleaned = String(value || '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^A-Za-z0-9-]/g, '')
    .toUpperCase();
  return cleaned || fallback;
}

/** Mirrors backend buildAutoSkuPrefix — used for import preview when SKU is missing */
export function buildAutoSkuPrefix(schoolAbbr, locationLabel, assetLabel) {
  return [
    sanitizeSkuSegment(schoolAbbr, 'SCH'),
    sanitizeSkuSegment(locationLabel, 'LOC'),
    sanitizeSkuSegment(assetLabel, 'AST'),
  ].join('/');
}

export function formatSkuWithSequence(prefix, sequence) {
  return `${prefix}/${String(sequence).padStart(5, '0')}`;
}

/**
 * Allocate preview SKUs for rows missing SKU (same prefix/sequence rules as backend import).
 * @param {Map<string, number>} prefixCounters — rolling seq per prefix within the file batch
 */
export function allocateImportPreviewSku(row, {
  schoolAbbr = 'SCH',
  prefixCounters,
  existingSkus,
  fileSeenSkus,
}) {
  const prefix = buildAutoSkuPrefix(
    schoolAbbr,
    row.location || 'Unspecified',
    row.label_tag || row.asset_name,
  );
  let seq = (prefixCounters.get(prefix) ?? 0) + 1;
  let sku = formatSkuWithSequence(prefix, seq);
  let attempts = 0;
  while (attempts < 10000) {
    const key = sku.toUpperCase();
    if (!existingSkus.has(key) && !fileSeenSkus.has(key)) break;
    seq += 1;
    sku = formatSkuWithSequence(prefix, seq);
    attempts += 1;
  }
  prefixCounters.set(prefix, seq);
  fileSeenSkus.set(sku.toUpperCase(), row.rowIndex ?? seq);
  return sku;
}

function validateRow(row, { autoGenerateSku = false } = {}) {
  const issues = [];
  if (!cellStr(row.asset_name)) issues.push('Name is required');
  if (!cellStr(row.category)) issues.push('Type / Category is required');
  if (!autoGenerateSku && !cellStr(row.sku)) issues.push('SKU is required');
  if (!row.unit_price || row.unit_price <= 0) issues.push('Purchase unit price is required');
  return issues;
}

function analyzeSku(row, existingSkus, fileSeenSkus, rowIndex, { autoGenerateSku = false } = {}) {
  const issues = [];
  const sku = cellStr(row.sku).toUpperCase();
  if (!sku) {
    if (!autoGenerateSku) issues.push('SKU is required');
    return issues;
  }
  if (existingSkus.has(sku)) {
    issues.push(`SKU "${row.sku}" already exists in this register year`);
  }
  if (fileSeenSkus.has(sku)) {
    if (fileSeenSkus.get(sku) !== rowIndex) {
      issues.push(`Duplicate SKU in file (row ${fileSeenSkus.get(sku)})`);
    }
  } else {
    fileSeenSkus.set(sku, rowIndex);
  }
  return issues;
}

/**
 * Build preview with rolling opening / depreciation per category (file row order).
 * @param {object[]} parsedRows
 * @param {Record<string, { effective_opening, effective_accumulated_depreciation, depreciation_rate? }>} openingByCategory
 * @param {Record<string, number>} depRateByCategory
 * @param {Set<string>} existingSkus — uppercase SKUs already in DB for selected year
 */
export function buildAssetTestImportPreview(
  parsedRows,
  openingByCategory = {},
  depRateByCategory = {},
  existingSkus = new Set(),
  options = {},
) {
  const {
    autoGenerateSku = true,
    schoolAbbr = 'SCH',
  } = options;
  const categoryState = {};
  const fileSeenSkus = new Map();
  const prefixCounters = new Map();

  return parsedRows.map((row, idx) => {
    const rowIndex = idx + 1;
    let effectiveRow = row;
    let autoSku = false;
    if (autoGenerateSku && !cellStr(row.sku)) {
      const generated = allocateImportPreviewSku(
        { ...row, rowIndex },
        { schoolAbbr, prefixCounters, existingSkus, fileSeenSkus },
      );
      effectiveRow = { ...row, sku: generated };
      autoSku = true;
    }
    const validationIssues = validateRow(effectiveRow, { autoGenerateSku });
    const skuIssues = analyzeSku(effectiveRow, existingSkus, fileSeenSkus, rowIndex, { autoGenerateSku });
    const issues = [...validationIssues, ...skuIssues];

    const cat = cellStr(row.category);
    const rate = depRateByCategory[cat] ?? openingByCategory[cat]?.depreciation_rate ?? 5;

    if (!categoryState[cat]) {
      const ctx = openingByCategory[cat] || {};
      categoryState[cat] = {
        opening: parseRegisterNum(
          ctx.effective_opening ?? ctx.year_setup_opening ?? ctx.year_opening_balance
        ),
        accumulated: parseRegisterNum(
          ctx.effective_accumulated_depreciation
          ?? ctx.year_setup_accumulated_depreciation
          ?? ctx.accumulated_depreciation
        ),
      };
    }

    const state = categoryState[cat];
    let math = null;
    if (!validationIssues.length) {
      math = computeAssetRegisterMath({
        openingAmount: state.opening,
        unitPrice: effectiveRow.unit_price,
        accumulatedDepreciation: state.accumulated,
        depRatePercent: rate,
      });
      categoryState[cat] = rollCategoryStateAfterAsset(math);
    }

    let status = 'ready';
    if (issues.length) {
      status = skuIssues.length ? 'duplicate' : 'invalid';
    }

    return {
      rowIndex,
      row,
      payload: {
        asset_name: effectiveRow.asset_name,
        category: effectiveRow.category,
        asset_type: effectiveRow.asset_type,
        location: effectiveRow.location || 'Unspecified',
        label_tag: effectiveRow.label_tag,
        supplier_name: effectiveRow.supplier_name,
        upi: effectiveRow.upi,
        sku: effectiveRow.sku || null,
        sku_mode: autoSku ? 'auto' : 'manual',
        material: effectiveRow.material,
        purchase_date: effectiveRow.purchase_date,
        purchase_price: effectiveRow.unit_price,
        unit_price: effectiveRow.unit_price,
        reference_no: effectiveRow.cba || null,
      },
      name: effectiveRow.asset_name,
      category: effectiveRow.category,
      sku: effectiveRow.sku,
      autoSku,
      location: row.location || '—',
      unit_price: row.unit_price,
      opening_amount: math?.openingAmount ?? null,
      accumulated_depreciation: math?.accumulatedDepreciation ?? null,
      total_balance: math?.totalBalance ?? null,
      total_dep: math?.totalDep ?? null,
      net_book_value: math?.netBookValue ?? null,
      annual_dep: math?.annualDep ?? null,
      dep_rate: rate,
      status,
      issues,
    };
  });
}

export function parseAssetTestExcelFile(file, { knownCategories = [] } = {}) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: 'array' });
        const sheetName = wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(ws, { defval: '', raw: true });
        const rows = json
          .map((r) => excelRowToTestImportRow(r, knownCategories))
          .filter((r) => cellStr(r.asset_name) || cellStr(r.sku) || cellStr(r.category));
        resolve({ rows, fileName: file.name, sheetName, rowCount: rows.length });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

export function downloadAssetTestImportTemplate(filename = 'asset-test-import-template') {
  const sample = {
    location: 'Main Campus',
    label: 'BLD-01',
    type: 'Buildings',
    supplier: 'Prime Builders',
    upi: 'UPI-001',
    sku: 'BLD-SKU-0001',
    cba: '',
    material: 'Concrete',
    purchase_year: 2019,
    purchase_month: 3,
    purchase_day: 15,
    purchase_unit_price: 5000000,
    name: 'Classroom Block A',
  };
  const ws = XLSX.utils.json_to_sheet([sample], { header: ASSET_TEST_IMPORT_HEADERS });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Assets');
  XLSX.writeFile(wb, `${filename}.xlsx`);
}
