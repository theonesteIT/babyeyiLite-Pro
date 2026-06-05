import * as XLSX from 'xlsx';
import { computeTotalBalance, computeDepreciation, parseNum } from './assetsCalculations';
import { buildAssetQrValue } from './assetsQr';

/** Excel register columns — aligned with AssetRegisterTable + import fields */
export const ASSET_EXCEL_HEADERS = [
  'asset_code',
  'location',
  'name',
  'label',
  'type',
  'type_other',
  'category',
  'description',
  'supplier',
  'upi',
  'sku',
  'serial_number',
  'brand',
  'material',
  'size',
  'purchase_year',
  'purchase_month',
  'purchase_day',
  'purchase_unit_price',
  'openingamount',
  'TOTAL BALANCE',
  'accumulated DEPRECIATION',
  'decimal depr',
  'Annual depreciation',
  'TOTAL DEPRECIATION',
  'NET BOOK VALUE',
  'depreciation_mode',
  'depreciation_rate',
  'quantity',
  'unit',
  'condition',
  'invoice_number',
  'funding_source',
  'notes',
];

const HEADER_ALIASES = {
  asset_code: ['asset_code', 'code', 'asset code'],
  location: ['location'],
  name: ['name', 'asset_name', 'asset name'],
  label: ['label', 'label_tag', 'label tag'],
  type: ['type', 'asset_type', 'asset type'],
  type_other: ['type_other', 'asset_type_other', 'type other'],
  category: ['category'],
  description: ['description', 'desc'],
  supplier: ['supplier', 'supplier_name'],
  upi: ['upi'],
  sku: ['sku'],
  serial_number: ['serial_number', 'serial', 'serial number'],
  brand: ['brand'],
  material: ['material'],
  size: ['size', 'size_label'],
  purchase_year: ['purchase_year', 'purchase year'],
  purchase_month: ['purchase_month', 'purchase month'],
  purchase_day: ['purchase_day', 'purchase day'],
  purchase_unit_price: ['purchase_unit_price', 'unit_price', 'unit price', 'purchase unit price'],
  openingamount: ['openingamount', 'opening_amount', 'opening amount'],
  'TOTAL BALANCE': ['total balance', 'total_balance'],
  'accumulated DEPRECIATION': ['accumulated depreciation', 'accumulated_depreciation', 'accumulated dep'],
  'decimal depr': ['decimal depr', 'decimal_dep', 'decimal depreciation'],
  'Annual depreciation': ['annual depreciation', 'annual_dep', 'annual dep'],
  'TOTAL DEPRECIATION': ['total depreciation', 'total_dep', 'total dep'],
  'NET BOOK VALUE': ['net book value', 'net_book_value', 'net book'],
  depreciation_mode: ['depreciation_mode', 'dep_mode', 'depreciation mode', 'dep mode'],
  depreciation_rate: ['depreciation_rate', 'dep_rate', 'depreciation rate', 'dep rate'],
  quantity: ['quantity', 'qty'],
  unit: ['unit'],
  condition: ['condition', 'condition_code'],
  invoice_number: ['invoice_number', 'invoice'],
  funding_source: ['funding_source', 'funding source'],
  notes: ['notes'],
};

function normKey(k) {
  return String(k ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
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
  ASSET_EXCEL_HEADERS.forEach((h) => {
    if (raw[h] !== undefined && out[h] === undefined) out[h] = raw[h];
  });
  return out;
}

function cellStr(v) {
  if (v === undefined || v === null) return '';
  return String(v).trim();
}

export function buildExistingIdentifierSets(existing = {}) {
  const norm = (arr) => new Set((arr || []).map((x) => cellStr(x).toUpperCase()).filter(Boolean));
  return {
    codes: norm(existing.asset_codes),
    labels: norm(existing.label_tags),
    serials: norm(existing.serial_numbers),
  };
}

export function analyzeImportRow(payload, sets, fileSeen, rowIndex) {
  const issues = [];
  if (!cellStr(payload.asset_name)) issues.push('Name is required');
  if (!cellStr(payload.location)) issues.push('Location is required');
  if (!cellStr(payload.asset_type)) issues.push('Type is required');

  const code = cellStr(payload.asset_code).toUpperCase();
  const label = cellStr(payload.label_tag).toUpperCase();
  const serial = cellStr(payload.serial_number).toUpperCase();

  if (code) {
    if (sets.codes.has(code)) issues.push(`Asset code "${payload.asset_code}" exists in this register year`);
    if (fileSeen.codes.has(code)) issues.push(`Duplicate code in file (row ${fileSeen.codes.get(code)})`);
    else fileSeen.codes.set(code, rowIndex);
  }
  if (label) {
    if (sets.labels.has(label)) issues.push(`Asset tag "${payload.label_tag}" exists in this register year`);
    if (fileSeen.labels.has(label)) issues.push(`Duplicate tag in file (row ${fileSeen.labels.get(label)})`);
    else fileSeen.labels.set(label, rowIndex);
  }
  if (serial) {
    if (sets.serials.has(serial)) issues.push(`Serial "${payload.serial_number}" exists in this register year`);
    if (fileSeen.serials.has(serial)) issues.push(`Duplicate serial in file (row ${fileSeen.serials.get(serial)})`);
    else fileSeen.serials.set(serial, rowIndex);
  }

  let status = 'ready';
  if (issues.length) status = issues.some((m) => m.includes('exists') || m.includes('Duplicate')) ? 'duplicate' : 'invalid';
  if (issues.length && status !== 'duplicate') status = 'invalid';

  const previewCode = code || `AST-NEW-${rowIndex}`;
  const qr_value = buildAssetQrValue({
    asset_code: previewCode,
    label_tag: payload.label_tag,
    serial_number: payload.serial_number,
  });

  return { status, issues, qr_value };
}

export function buildImportPreview(parsedPayloads, existingIdentifiers = {}) {
  const sets = buildExistingIdentifierSets(existingIdentifiers);
  const fileSeen = { codes: new Map(), labels: new Map(), serials: new Map() };
  return parsedPayloads.map((payload, idx) => {
    const rowIndex = idx + 1;
    const analysis = analyzeImportRow(payload, sets, fileSeen, rowIndex);
    return {
      rowIndex,
      payload,
      name: payload.asset_name,
      location: payload.location,
      type: payload.asset_type,
      asset_code: payload.asset_code || '',
      label_tag: payload.label_tag || '',
      serial_number: payload.serial_number || '',
      status: analysis.status,
      issues: analysis.issues,
      qr_value: analysis.qr_value,
    };
  });
}

function parsePurchaseParts(dateStr) {
  if (!dateStr) return { y: '', m: '', d: '' };
  const s = String(dateStr).slice(0, 10);
  const [y, m, d] = s.split('-');
  return { y: y || '', m: m ? String(Number(m)) : '', d: d ? String(Number(d)) : '' };
}

export function assetToExcelRow(asset) {
  const parts = parsePurchaseParts(asset.purchase_date);
  const unitPrice = parseNum(asset.unit_price);
  const opening = parseNum(asset.opening_amount);
  const totalBalance = asset.total_balance != null
    ? parseNum(asset.total_balance)
    : computeTotalBalance({ unitPrice, openingAmount: opening });
  const depRate = parseNum(asset.dep_rate);
  const accumulated = parseNum(asset.accumulated_depreciation);
  const dep = computeDepreciation({
    totalBalance,
    depRatePercent: depRate,
    accumulatedDepreciation: accumulated,
  });
  return {
    asset_code: asset.asset_code || asset.code || '',
    location: asset.location || '',
    name: asset.asset_name || asset.name || '',
    label: asset.label_tag || '',
    type: asset.asset_type || asset.type || '',
    type_other: asset.asset_type_other || '',
    category: asset.category || '',
    description: asset.description || '',
    supplier: asset.supplier_name || asset.supplier || '',
    upi: asset.upi || '',
    sku: asset.sku || '',
    serial_number: asset.serial_number || '',
    brand: asset.brand || '',
    material: asset.material || '',
    size: asset.size_label || asset.size || '',
    purchase_year: parts.y,
    purchase_month: parts.m,
    purchase_day: parts.d,
    purchase_unit_price: asset.unit_price ?? '',
    openingamount: asset.opening_amount ?? '',
    'TOTAL BALANCE': totalBalance,
    'accumulated DEPRECIATION': asset.accumulated_depreciation ?? '',
    'decimal depr': asset.decimal_dep != null ? Number(asset.decimal_dep).toFixed(4) : dep.decimalDep,
    'Annual depreciation': asset.annual_dep ?? dep.annualDep,
    'TOTAL DEPRECIATION': asset.total_dep ?? dep.totalDep,
    'NET BOOK VALUE': asset.net_book_value ?? dep.netBookValue,
    depreciation_mode: asset.dep_mode || '',
    depreciation_rate: asset.dep_rate ?? '',
    quantity: asset.quantity ?? 1,
    unit: asset.unit || '',
    condition: asset.condition_code || asset.condition || '',
    invoice_number: asset.invoice_number || '',
    funding_source: asset.funding_source || '',
    notes: asset.notes || '',
  };
}

export function excelRowToImportPayload(row) {
  const r = mapRowKeys(row);
  const unitPrice = parseNum(r.purchase_unit_price);
  const openingAmount = parseNum(r.openingamount);
  const totalBalance = computeTotalBalance({ unitPrice, openingAmount });
  const accumulated = parseNum(r['accumulated DEPRECIATION']);
  const depRate = parseNum(r.depreciation_rate);
  const dep = computeDepreciation({
    totalBalance,
    depRatePercent: depRate,
    accumulatedDepreciation: accumulated,
  });

  const typeRaw = String(r.type || '').trim().toUpperCase();
  const typeOther = String(r.type_other || '').trim();

  return {
    asset_code: String(r.asset_code || '').trim() || undefined,
    asset_name: String(r.name || '').trim(),
    label_tag: String(r.label || '').trim() || null,
    asset_type: typeRaw,
    asset_type_other: typeRaw === 'OTHER' ? typeOther || null : null,
    category: String(r.category || '').trim() || null,
    description: String(r.description || '').trim() || null,
    location: String(r.location || '').trim(),
    supplier_name: String(r.supplier || '').trim() || null,
    upi: String(r.upi || '').trim() || null,
    sku: String(r.sku || '').trim() || null,
    serial_number: String(r.serial_number || '').trim() || null,
    brand: String(r.brand || '').trim() || null,
    material: String(r.material || '').trim() || null,
    size_label: String(r.size || '').trim() || null,
    purchase_year: r.purchase_year,
    purchase_month: r.purchase_month,
    purchase_day: r.purchase_day,
    unit_price: unitPrice || null,
    opening_amount: openingAmount || null,
    total_balance: totalBalance,
    accumulated_depreciation: accumulated,
    invoice_number: String(r.invoice_number || '').trim() || null,
    funding_source: String(r.funding_source || '').trim() || null,
    dep_mode: String(r.depreciation_mode || '').trim() || 'Diminishing',
    dep_rate: depRate || null,
    decimal_dep: dep.decimalDep,
    annual_dep: dep.annualDep,
    total_dep: dep.totalDep,
    net_book_value: dep.netBookValue,
    quantity: Math.max(1, parseNum(r.quantity) || 1),
    unit: String(r.unit || '').trim() || 'PCS',
    condition_code: String(r.condition || '').trim().toUpperCase() || 'GOOD',
    notes: String(r.notes || '').trim() || null,
  };
}

export function exportAssetsToExcel(assets = [], filename = 'school-asset-register') {
  const rows = assets.map(assetToExcelRow);
  const ws = XLSX.utils.json_to_sheet(rows, { header: ASSET_EXCEL_HEADERS });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Asset Register');
  const stamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `${filename}-${stamp}.xlsx`);
}

export function parseAssetsExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: 'array' });
        const sheetName = wb.SheetNames.find((n) => /asset/i.test(n)) || wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(ws, { defval: '', raw: true });
        const payloads = json
          .map((row) => excelRowToImportPayload(row))
          .filter((p) => cellStr(p.asset_name) || cellStr(p.location) || cellStr(p.asset_type));
        resolve({ payloads, fileName: file.name, sheetName, rowCount: payloads.length });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

export function downloadAssetImportTemplate(filename = 'asset-import-template') {
  const sample = {
    asset_code: '',
    location: 'Kimironko Main Office',
    name: 'Sample Classroom Block',
    label: 'BLD-01',
    type: 'BUILDING',
    type_other: '',
    category: 'Buildings',
    description: 'Sample row — delete before import or replace with your data',
    supplier: 'Prime Builders',
    upi: 'UPI-BLD-2018-001',
    sku: 'BLD-SKU-0001',
    serial_number: 'SN-BLD-00001',
    brand: 'Local Craft',
    material: 'CONCRETE',
    size: '120m²',
    purchase_year: 2018,
    purchase_month: 3,
    purchase_day: 15,
    purchase_unit_price: 175274669,
    openingamount: 3694267000,
    'accumulated DEPRECIATION': 184713000,
    depreciation_mode: 'Diminishing',
    depreciation_rate: 5,
    quantity: 1,
    unit: 'LOT',
    condition: 'GOOD',
    invoice_number: 'INV-001',
    funding_source: 'Government Budget',
    notes: '',
  };
  const ws = XLSX.utils.json_to_sheet([sample], { header: ASSET_EXCEL_HEADERS });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Asset Register');
  XLSX.writeFile(wb, `${filename}.xlsx`);
}
