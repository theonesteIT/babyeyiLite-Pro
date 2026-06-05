'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const XLSX = require('xlsx');
const { readFileSync } = require('fs');
const { join } = require('path');
const { promisePool } = require('../config/database');

function trimStr(v) { return String(v ?? '').trim(); }
function toMoney(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
function buildPurchaseDate(body) {
  const y = trimStr(body.purchase_year);
  const m = trimStr(body.purchase_month);
  const d = trimStr(body.purchase_day);
  if (y && m && d) return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  return null;
}
function applyDepreciationMath(p) {
  const totalBalance = toMoney(p.total_balance) || toMoney(p.unit_price) + toMoney(p.opening_amount);
  const accumulated = toMoney(p.accumulated_depreciation);
  const rate = toMoney(p.dep_rate);
  const decimalDep = p.decimal_dep != null && p.decimal_dep !== '' ? toMoney(p.decimal_dep) : (rate > 0 ? rate / 100 : 0);
  const annualDep = p.annual_dep != null && toMoney(p.annual_dep) > 0 ? toMoney(p.annual_dep) : totalBalance * decimalDep;
  const totalDep = p.total_dep != null && toMoney(p.total_dep) > 0 ? toMoney(p.total_dep) : accumulated + annualDep;
  const netBookValue = p.net_book_value != null && toMoney(p.net_book_value) > 0 ? toMoney(p.net_book_value) : Math.max(0, totalBalance - totalDep);
  return { ...p, total_balance: totalBalance || null, accumulated_depreciation: accumulated, decimal_dep: decimalDep || null, annual_dep: annualDep || null, total_dep: totalDep || null, net_book_value: netBookValue || null };
}
function payloadFromBody(body) {
  const typeRaw = trimStr(body.asset_type || body.type).toUpperCase();
  const typeOther = trimStr(body.asset_type_other || body.typeOther || body.type_other);
  const assetType = typeRaw === 'OTHER' && typeOther ? 'OTHER' : typeRaw;
  return applyDepreciationMath({
    asset_code: trimStr(body.asset_code) || null,
    asset_name: trimStr(body.asset_name || body.assetName),
    label_tag: trimStr(body.label_tag || body.labelTag) || null,
    asset_type: assetType || null,
    location: trimStr(body.location) || null,
    purchase_date: buildPurchaseDate(body),
    unit_price: toMoney(body.unit_price || body.unitPrice) || null,
    opening_amount: toMoney(body.opening_amount ?? body.openingAmount) || null,
    total_balance: toMoney(body.total_balance ?? body.totalBalance) || toMoney(body.unit_price) + toMoney(body.opening_amount),
    accumulated_depreciation: toMoney(body.accumulated_depreciation ?? body.accumulatedDepreciation),
    dep_mode: trimStr(body.dep_mode || body.depMode) || null,
    dep_rate: toMoney(body.dep_rate ?? body.depRate) || null,
    decimal_dep: toMoney(body.decimal_dep ?? body.decimalDep) || null,
    annual_dep: toMoney(body.annual_dep ?? body.annualDep) || null,
    total_dep: toMoney(body.total_dep ?? body.totalDep) || null,
    net_book_value: toMoney(body.net_book_value ?? body.netBookValue) || null,
    quantity: Math.max(1, toMoney(body.quantity || 1)),
    unit: trimStr(body.unit) || 'PCS',
    condition_code: trimStr(body.condition_code || body.condition) || 'GOOD',
    serial_number: trimStr(body.serial_number || body.serialNumber) || null,
    status: 'Active',
  });
}

async function nextAssetCode(schoolId) {
  const [[row]] = await promisePool.query(
    `SELECT asset_code FROM school_assets WHERE school_id = ? AND asset_code LIKE 'AST-%' ORDER BY id DESC LIMIT 1`,
    [schoolId]
  );
  let seq = 1;
  if (row?.asset_code) {
    const m = String(row.asset_code).match(/AST-(\d+)/i);
    if (m) seq = Number(m[1]) + 1;
  }
  return `AST-${String(seq).padStart(5, '0')}`;
}

(async () => {
  const buf = readFileSync(join(__dirname, '../../../babyeyipro/Frontend/web/public/asset-import-sample-30.xlsx'));
  const wb = XLSX.read(buf);
  const json = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '', raw: true });

  // mimic frontend excelRowToImportPayload - simplified
  const rows = json.map((raw) => ({
    asset_name: String(raw.name || '').trim(),
    asset_type: String(raw.type || '').trim().toUpperCase(),
    location: String(raw.location || '').trim(),
    label_tag: String(raw.label || '').trim() || null,
    purchase_year: raw.purchase_year,
    purchase_month: raw.purchase_month,
    purchase_day: raw.purchase_day,
    unit_price: raw.purchase_unit_price,
    opening_amount: raw.openingamount,
    accumulated_depreciation: raw['accumulated DEPRECIATION'],
    dep_mode: raw.depreciation_mode,
    dep_rate: raw.depreciation_rate,
    serial_number: raw.serial_number,
    unit: raw.unit,
    condition_code: String(raw.condition || '').toUpperCase(),
  }));

  const schoolId = 1;
  let ok = 0;
  for (let i = 0; i < rows.length; i++) {
    const p = payloadFromBody(rows[i]);
    if (!p.asset_name || !p.location || !p.asset_type) {
      console.log('row', i + 1, 'VALIDATION FAIL', p.asset_name, p.location, p.asset_type);
      continue;
    }
    const code = await nextAssetCode(schoolId);
    try {
      await promisePool.query(
        `INSERT INTO school_assets (school_id, asset_code, asset_name, label_tag, asset_type, location, purchase_date, unit_price, opening_amount, total_balance, accumulated_depreciation, dep_mode, dep_rate, decimal_dep, annual_dep, total_dep, net_book_value, quantity, unit, condition_code, serial_number, status)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [schoolId, code, p.asset_name, p.label_tag, p.asset_type, p.location, p.purchase_date, p.unit_price, p.opening_amount, p.total_balance, p.accumulated_depreciation, p.dep_mode, p.dep_rate, p.decimal_dep, p.annual_dep, p.total_dep, p.net_book_value, p.quantity, p.unit, p.condition_code, p.serial_number, p.status]
      );
      ok++;
    } catch (e) {
      console.log('row', i + 1, 'INSERT FAIL', e.code, e.sqlMessage);
      break;
    }
  }
  console.log('inserted', ok);
  await promisePool.end();
})();
