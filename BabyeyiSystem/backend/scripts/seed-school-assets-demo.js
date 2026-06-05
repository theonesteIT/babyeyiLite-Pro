'use strict';

/**
 * Seeds 20 complete fixed assets per asset type (260 total) for school asset register demos.
 *
 * Usage:
 *   node scripts/seed-school-assets-demo.js
 *   node scripts/seed-school-assets-demo.js --school-id=1
 *   node scripts/seed-school-assets-demo.js --clear
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { promisePool } = require('../config/database');

const SEED_NOTE = '[assets-seed]';
const PER_TYPE = 20;

const ASSET_TYPES = [
  'BUILDING', 'FURNITURE', 'ICT & ELECTRONICS', 'LAB EQUIPMENT', 'VEHICLES', 'MACHINERY',
  'EDUCATIONAL MATERIALS', 'CLEANING TOOLS', 'OFFICE EQUIPMENT', 'UTILITIES', 'SPORTS',
  'INTANGIBLE ASSETS', 'OTHER',
];

const TYPE_PREFIX = {
  BUILDING: 'BLD', FURNITURE: 'FUR', 'ICT & ELECTRONICS': 'ICT', 'LAB EQUIPMENT': 'LAB',
  VEHICLES: 'VEH', MACHINERY: 'MCH', 'EDUCATIONAL MATERIALS': 'EDU', 'CLEANING TOOLS': 'CLN',
  'OFFICE EQUIPMENT': 'OFF', UTILITIES: 'UTL', SPORTS: 'SPT', 'INTANGIBLE ASSETS': 'INT', OTHER: 'OTH',
};

const LOCATIONS = [
  'Kimironko Main Office', 'Remera Block A', 'Nyamirambo Store', 'Kacyiru Lab Wing',
  'Gikondo Workshop', 'Nyarutarama Sports Hall', 'CBD Admin Block', 'Musanze Annex',
];
const SUPPLIERS = ['Kigali Supplies Ltd', 'Rwanda Tech Co', 'East Africa Furniture', 'Global ICT Rwanda', 'Prime Builders'];
const MATERIALS = ['WOOD', 'METAL', 'PLASTIC', 'GLASS', 'FABRIC', 'CONCRETE'];
const UNITS = ['PCS', 'SET', 'METER', 'KG', 'LOT', 'UNIT'];
const FUNDING = ['Government Budget', 'Donor Funded', 'Internal Revenue', 'Grant'];
const CONDITIONS = ['GOOD', 'FAIR', 'DAMAGED'];

function parseArgs() {
  let schoolId = null;
  let clear = false;
  for (const a of process.argv.slice(2)) {
    if (a === '--clear') clear = true;
    const m = a.match(/^--school-id=(\d+)$/i);
    if (m) schoolId = Number(m[1]);
  }
  if (!schoolId && process.env.SEED_SCHOOL_ID) schoolId = Number(process.env.SEED_SCHOOL_ID);
  return { schoolId, clear };
}

async function resolveSchoolId(explicit) {
  if (explicit && explicit > 0) return explicit;
  const [rows] = await promisePool.query('SELECT id FROM schools ORDER BY id ASC LIMIT 1');
  if (rows.length) return rows[0].id;
  const [alt] = await promisePool.query(
    'SELECT school_id AS id FROM users WHERE school_id IS NOT NULL GROUP BY school_id ORDER BY school_id LIMIT 1'
  );
  if (alt.length) return alt[0].id;
  throw new Error('No school found. Pass --school-id=N');
}

async function ensureColumns() {
  const alters = [
    'ADD COLUMN total_balance DECIMAL(14,2) NULL AFTER opening_amount',
    'ADD COLUMN accumulated_depreciation DECIMAL(14,2) NULL DEFAULT 0 AFTER total_balance',
    'ADD COLUMN asset_type_other VARCHAR(120) NULL AFTER asset_type',
    'ADD COLUMN funding_source_other VARCHAR(120) NULL AFTER funding_source',
  ];
  for (const clause of alters) {
    try {
      await promisePool.query(`ALTER TABLE school_assets ${clause}`);
    } catch (e) {
      if (e.code !== 'ER_DUP_FIELDNAME') throw e;
    }
  }
}

function financials(unitPrice, opening, accumulated, depRate) {
  const totalBalance = unitPrice + opening;
  const decimalDep = depRate / 100;
  const annualDep = totalBalance * decimalDep;
  const totalDep = accumulated + annualDep;
  const netBookValue = Math.max(0, totalBalance - totalDep);
  return { totalBalance, decimalDep, annualDep, totalDep, netBookValue };
}

function buildRecord(schoolId, type, index, globalSeq) {
  const i = index;
  const typeIdx = ASSET_TYPES.indexOf(type);
  const prefix = TYPE_PREFIX[type] || 'AST';
  const unitPrice = 250000 + typeIdx * 85000 + i * 12000;
  const openingAmount = unitPrice * 2;
  const accumulated = 5000 * i + typeIdx * 1000;
  const depRate = 5 + (typeIdx % 6);
  const fin = financials(unitPrice, openingAmount, accumulated, depRate);
  const year = 2012 + (i % 12);
  const month = ((i % 12) + 1);
  const day = (i % 28) + 1;
  const purchaseDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const isOther = type === 'OTHER';
  const name = isOther
    ? `Custom Asset ${prefix}-${String(i).padStart(2, '0')}`
    : `${type.replace(/ & /g, ' ')} Item ${String(i).padStart(2, '0')}`;

  return {
    school_id: schoolId,
    asset_code: `AST-SEED-${String(globalSeq).padStart(5, '0')}`,
    asset_name: name,
    label_tag: `${prefix}-${i}`,
    asset_type: type,
    asset_type_other: isOther ? `Misc ${prefix}` : null,
    category: type === 'OTHER' ? 'General' : type.replace(/ & /g, ' '),
    description: `Demo seed asset — ${type} #${i}. ${SEED_NOTE}`,
    location: LOCATIONS[(typeIdx + i) % LOCATIONS.length],
    supplier_name: SUPPLIERS[i % SUPPLIERS.length],
    upi: `UPI-${prefix}-${year}-${String(i).padStart(3, '0')}`,
    sku: `${prefix}-SKU-${String(i).padStart(4, '0')}`,
    serial_number: `SN-${prefix}-${globalSeq}`,
    brand: ['Samsung', 'HP', 'Toyota', 'Local Craft', 'Generic'][i % 5],
    material: MATERIALS[(typeIdx + i) % MATERIALS.length],
    size_label: `${10 + i}m²`,
    purchase_date: purchaseDate,
    unit_price: unitPrice,
    opening_amount: openingAmount,
    total_balance: fin.totalBalance,
    accumulated_depreciation: accumulated,
    invoice_number: `INV-${prefix}-${year}-${i}`,
    funding_source: FUNDING[i % FUNDING.length],
    funding_source_other: null,
    dep_mode: i % 2 === 0 ? 'Diminishing' : 'Straight Line',
    dep_rate: depRate,
    dep_years: 5 + (i % 10),
    decimal_dep: fin.decimalDep,
    annual_dep: fin.annualDep,
    total_dep: fin.totalDep,
    net_book_value: fin.netBookValue,
    quantity: 1 + (i % 3),
    unit: UNITS[(typeIdx + i) % UNITS.length],
    condition_code: CONDITIONS[i % CONDITIONS.length],
    notes: SEED_NOTE,
    status: 'Active',
    created_by: null,
  };
}

async function clearSeed(schoolId) {
  const [r] = await promisePool.query(
    `DELETE FROM school_assets WHERE school_id = ? AND (notes = ? OR asset_code LIKE 'AST-SEED-%')`,
    [schoolId, SEED_NOTE]
  );
  return r.affectedRows;
}

async function insertBatch(records) {
  const sql = `INSERT INTO school_assets (
    school_id, asset_code, asset_name, label_tag, asset_type, asset_type_other, category, description, location,
    supplier_name, upi, sku, serial_number, brand, material, size_label,
    purchase_date, unit_price, opening_amount, total_balance, accumulated_depreciation,
    invoice_number, funding_source, funding_source_other,
    dep_mode, dep_rate, dep_years, decimal_dep, annual_dep, total_dep, net_book_value,
    quantity, unit, condition_code, notes, status, created_by
  ) VALUES ?`;

  const values = records.map((r) => [
    r.school_id, r.asset_code, r.asset_name, r.label_tag, r.asset_type, r.asset_type_other,
    r.category, r.description, r.location, r.supplier_name, r.upi, r.sku, r.serial_number,
    r.brand, r.material, r.size_label, r.purchase_date, r.unit_price, r.opening_amount,
    r.total_balance, r.accumulated_depreciation, r.invoice_number, r.funding_source,
    r.funding_source_other, r.dep_mode, r.dep_rate, r.dep_years, r.decimal_dep, r.annual_dep,
    r.total_dep, r.net_book_value, r.quantity, r.unit, r.condition_code, r.notes, r.status,
    r.created_by,
  ]);

  await promisePool.query(sql, [values]);
}

(async () => {
  const { schoolId: argSchool, clear } = parseArgs();
  console.log(`Database: ${process.env.DB_NAME} @ ${process.env.DB_HOST}`);
  await ensureColumns();
  const schoolId = await resolveSchoolId(argSchool);
  console.log(`School ID: ${schoolId}`);

  if (clear && !process.argv.includes('--seed')) {
    const n = await clearSeed(schoolId);
    console.log(`Cleared ${n} seed assets.`);
    await promisePool.end();
    return;
  }

  if (clear) {
    const n = await clearSeed(schoolId);
    console.log(`Cleared ${n} seed assets before re-seed.`);
  }

  const records = [];
  let seq = 1;
  for (const type of ASSET_TYPES) {
    for (let i = 1; i <= PER_TYPE; i += 1) {
      records.push(buildRecord(schoolId, type, i, seq));
      seq += 1;
    }
  }

  const CHUNK = 50;
  for (let off = 0; off < records.length; off += CHUNK) {
    await insertBatch(records.slice(off, off + CHUNK));
    console.log(`Inserted ${Math.min(off + CHUNK, records.length)} / ${records.length}`);
  }

  console.log(`OK: ${records.length} assets (${PER_TYPE} per type × ${ASSET_TYPES.length} types)`);
  await promisePool.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
