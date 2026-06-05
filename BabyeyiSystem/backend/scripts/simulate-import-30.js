'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const path = require('path');

// Load route helpers by requiring schoolAssets internals — duplicate minimal logic
const { promisePool } = require('../config/database');

async function ensureAssetsTable() {
  await promisePool.query(`CREATE TABLE IF NOT EXISTS school_assets (id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY) ENGINE=InnoDB`);
}

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
  const base = {
    asset_name: trimStr(body.asset_name || body.assetName),
    location: trimStr(body.location) || null,
    asset_type: assetType || null,
    purchase_date: buildPurchaseDate(body),
    unit_price: toMoney(body.unit_price || body.unitPrice) || null,
    opening_amount: toMoney(body.opening_amount ?? body.openingAmount) || null,
    total_balance: toMoney(body.total_balance ?? body.totalBalance) || toMoney(body.unit_price) + toMoney(body.opening_amount),
    accumulated_depreciation: toMoney(body.accumulated_depreciation ?? body.accumulatedDepreciation),
    dep_rate: toMoney(body.dep_rate ?? body.depRate) || null,
    decimal_dep: toMoney(body.decimal_dep ?? body.decimalDep) || null,
    annual_dep: toMoney(body.annual_dep ?? body.annualDep) || null,
    total_dep: toMoney(body.total_dep ?? body.totalDep) || null,
    net_book_value: toMoney(body.net_book_value ?? body.netBookValue) || null,
    quantity: Math.max(1, toMoney(body.quantity || 1)),
    unit: trimStr(body.unit) || 'PCS',
    condition_code: trimStr(body.condition_code || body.condition) || 'GOOD',
    serial_number: trimStr(body.serial_number || body.serialNumber) || null,
    label_tag: trimStr(body.label_tag || body.labelTag) || null,
    status: 'Active',
  };
  return applyDepreciationMath(base);
}

const row = {
  asset_name: 'BUILDING Sample 01',
  asset_type: 'BUILDING',
  location: 'Remera Block A',
  purchase_year: 2016,
  purchase_month: 2,
  purchase_day: 2,
  unit_price: 175000,
  opening_amount: 350000,
  total_balance: 525000,
  accumulated_depreciation: 10000,
  dep_rate: 6,
  decimal_dep: 0.06,
  annual_dep: 31500,
  total_dep: 41500,
  net_book_value: 483500,
  quantity: 2,
  unit: 'SET',
  condition_code: 'FAIR',
  serial_number: 'SN-SAMPLE-0001',
  label_tag: 'BLD-1',
};

(async () => {
  const p = payloadFromBody(row);
  console.log('payload', p);
  console.log('valid', !!p.asset_name, !!p.location, !!p.asset_type);
  await promisePool.end();
})();
