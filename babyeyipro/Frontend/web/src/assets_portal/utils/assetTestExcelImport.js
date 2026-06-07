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
  type: ['type', 'category', 'asset_type', 'asset type', 'type or category'],
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
    if (canon) out[canon] = v;
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

export function excelRowToTestImportRow(row) {
  const r = mapRowKeys(row);
  const category = cellStr(r.type);
  const price = parseRegisterNum(r.purchase_unit_price);
  return {
    asset_name: cellStr(r.name),
    category,
    asset_type: category.toUpperCase() || null,
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

function validateRow(row) {
  const issues = [];
  if (!cellStr(row.asset_name)) issues.push('Name is required');
  if (!cellStr(row.category)) issues.push('Type / Category is required');
  if (!cellStr(row.sku)) issues.push('SKU is required');
  if (!row.unit_price || row.unit_price <= 0) issues.push('Purchase unit price is required');
  return issues;
}

function analyzeSku(row, existingSkus, fileSeenSkus, rowIndex) {
  const issues = [];
  const sku = cellStr(row.sku).toUpperCase();
  if (!sku) return issues;
  if (existingSkus.has(sku)) {
    issues.push(`SKU "${row.sku}" already exists in this register year`);
  }
  if (fileSeenSkus.has(sku)) {
    issues.push(`Duplicate SKU in file (row ${fileSeenSkus.get(sku)})`);
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
export function buildAssetTestImportPreview(parsedRows, openingByCategory = {}, depRateByCategory = {}, existingSkus = new Set()) {
  const categoryState = {};
  const fileSeenSkus = new Map();

  return parsedRows.map((row, idx) => {
    const rowIndex = idx + 1;
    const validationIssues = validateRow(row);
    const skuIssues = analyzeSku(row, existingSkus, fileSeenSkus, rowIndex);
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
        unitPrice: row.unit_price,
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
        asset_name: row.asset_name,
        category: row.category,
        asset_type: row.asset_type,
        location: row.location || 'Unspecified',
        label_tag: row.label_tag,
        supplier_name: row.supplier_name,
        upi: row.upi,
        sku: row.sku,
        material: row.material,
        purchase_date: row.purchase_date,
        purchase_price: row.unit_price,
        unit_price: row.unit_price,
        reference_no: row.cba || null,
      },
      name: row.asset_name,
      category: row.category,
      sku: row.sku,
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

export function parseAssetTestExcelFile(file) {
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
          .map((r) => excelRowToTestImportRow(r))
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
