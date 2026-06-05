'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { promisePool } = require('../config/database');

const row = {
  asset_name: 'BUILDING Sample 01',
  label_tag: 'BLD-1',
  asset_type: 'BUILDING',
  location: 'Remera Block A',
  purchase_year: 2016,
  purchase_month: 2,
  purchase_day: 2,
  unit_price: 175000,
  opening_amount: 350000,
  total_balance: 525000,
  accumulated_depreciation: 10000,
  dep_mode: 'Diminishing',
  dep_rate: 6,
  decimal_dep: 0.06,
  annual_dep: 31500,
  total_dep: 41500,
  net_book_value: 483500,
  quantity: 2,
  unit: 'SET',
  condition_code: 'FAIR',
  serial_number: 'SN-SAMPLE-0001',
  status: 'Active',
};

function trimStr(v) { return String(v ?? '').trim(); }
function toMoney(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
function buildPurchaseDate(body) {
  const y = trimStr(body.purchase_year);
  const m = trimStr(body.purchase_month);
  const d = trimStr(body.purchase_day);
  if (y && m && d) return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  return null;
}

const typeRaw = trimStr(row.asset_type).toUpperCase();
const p = {
  asset_name: trimStr(row.asset_name),
  asset_type: typeRaw,
  location: trimStr(row.location),
  label_tag: row.label_tag,
  purchase_date: buildPurchaseDate(row),
  unit_price: toMoney(row.unit_price),
  opening_amount: toMoney(row.opening_amount),
  total_balance: toMoney(row.total_balance),
  accumulated_depreciation: toMoney(row.accumulated_depreciation),
  dep_mode: row.dep_mode,
  dep_rate: toMoney(row.dep_rate),
  decimal_dep: row.decimal_dep,
  annual_dep: row.annual_dep,
  total_dep: row.total_dep,
  net_book_value: row.net_book_value,
  quantity: row.quantity,
  unit: row.unit,
  condition_code: row.condition_code,
  serial_number: row.serial_number,
  status: 'Active',
};

(async () => {
  try {
    const vals = [
      1, 'AST-TEST-FULL', p.asset_name, p.label_tag, p.asset_type, null, null, null, p.location,
      null, null, null, p.serial_number, null, null, null,
      p.purchase_date, p.unit_price, p.opening_amount, p.total_balance, p.accumulated_depreciation,
      null, null, null,
      p.dep_mode, p.dep_rate, null, p.decimal_dep, p.annual_dep, p.total_dep, p.net_book_value,
      p.quantity, p.unit, p.condition_code, null, p.status, null,
    ];
    const [r] = await promisePool.query(
      `INSERT INTO school_assets (
        school_id, asset_code, asset_name, label_tag, asset_type, asset_type_other, category, description, location,
        supplier_name, upi, sku, serial_number, brand, material, size_label,
        purchase_date, unit_price, opening_amount, total_balance, accumulated_depreciation,
        invoice_number, funding_source, funding_source_other,
        dep_mode, dep_rate, dep_years, decimal_dep, annual_dep, total_dep, net_book_value,
        quantity, unit, condition_code, notes, status, created_by
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      vals
    );
    console.log('OK', r.insertId);
    await promisePool.query(`DELETE FROM school_assets WHERE asset_code='AST-TEST-FULL'`);
  } catch (e) {
    console.error('FAIL', e.code, e.sqlMessage || e.message);
  }
  await promisePool.end();
})();
