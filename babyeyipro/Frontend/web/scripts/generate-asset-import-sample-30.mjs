/**
 * Generates public/asset-import-sample-30.xlsx (30 rows for Asset Inventory import).
 * Run: node scripts/generate-asset-import-sample-30.mjs
 */
import * as XLSX from 'xlsx';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'public', 'asset-import-sample-30.xlsx');

const HEADERS = [
  'asset_code', 'location', 'name', 'label', 'type', 'type_other', 'category', 'description',
  'supplier', 'upi', 'sku', 'serial_number', 'brand', 'material', 'size',
  'purchase_year', 'purchase_month', 'purchase_day',
  'purchase_unit_price', 'openingamount', 'TOTAL BALANCE', 'accumulated DEPRECIATION',
  'decimal depr', 'Annual depreciation', 'TOTAL DEPRECIATION', 'NET BOOK VALUE',
  'depreciation_mode', 'depreciation_rate', 'quantity', 'unit', 'condition',
  'invoice_number', 'funding_source', 'notes',
];

const TYPES = [
  'BUILDING', 'FURNITURE', 'ICT & ELECTRONICS', 'LAB EQUIPMENT', 'VEHICLES', 'MACHINERY',
  'EDUCATIONAL MATERIALS', 'CLEANING TOOLS', 'OFFICE EQUIPMENT', 'UTILITIES', 'SPORTS',
  'INTANGIBLE ASSETS', 'OTHER',
];

const PREFIX = {
  BUILDING: 'BLD', FURNITURE: 'FUR', 'ICT & ELECTRONICS': 'ICT', 'LAB EQUIPMENT': 'LAB',
  VEHICLES: 'VEH', MACHINERY: 'MCH', 'EDUCATIONAL MATERIALS': 'EDU', 'CLEANING TOOLS': 'CLN',
  'OFFICE EQUIPMENT': 'OFF', UTILITIES: 'UTL', SPORTS: 'SPT', 'INTANGIBLE ASSETS': 'INT', OTHER: 'OTH',
};

const LOCATIONS = [
  'Kimironko Main Office', 'Remera Block A', 'Kacyiru Lab Wing', 'Gikondo Workshop',
  'Nyarutarama Sports Hall', 'CBD Admin Block', 'Musanze Annex', 'Nyamirambo Store',
];
const SUPPLIERS = ['Kigali Supplies Ltd', 'Rwanda Tech Co', 'East Africa Furniture', 'Prime Builders', 'Global ICT Rwanda'];
const FUNDING = ['Government Budget', 'Donor Funded', 'Internal Revenue', 'Grant'];

function fin(unitPrice, opening, accumulated, depRate) {
  const totalBalance = unitPrice + opening;
  const decimalDep = depRate / 100;
  const annualDep = Math.round(totalBalance * decimalDep);
  const totalDep = accumulated + annualDep;
  const netBookValue = Math.max(0, totalBalance - totalDep);
  return { totalBalance, decimalDep, annualDep, totalDep, netBookValue };
}

const rows = [];
for (let i = 1; i <= 30; i += 1) {
  const type = TYPES[(i - 1) % TYPES.length];
  const prefix = PREFIX[type] || 'AST';
  const unitPrice = 150000 + i * 25000;
  const opening = unitPrice * 2;
  const accumulated = 10000 * i;
  const depRate = 5 + (i % 5);
  const f = fin(unitPrice, opening, accumulated, depRate);
  const year = 2015 + (i % 8);
  const month = (i % 12) + 1;
  const day = (i % 28) + 1;
  const isOther = type === 'OTHER';

  rows.push({
    asset_code: '',
    location: LOCATIONS[i % LOCATIONS.length],
    name: isOther ? `Custom Asset Sample ${i}` : `${type} Sample ${String(i).padStart(2, '0')}`,
    label: `IMP-${prefix}-${String(i).padStart(2, '0')}`,
    type,
    type_other: isOther ? `Miscellaneous ${i}` : '',
    category: isOther ? 'General' : type.replace(/ & /g, ' '),
    description: `Sample import row ${i} for testing Excel import`,
    supplier: SUPPLIERS[i % SUPPLIERS.length],
    upi: `UPI-${prefix}-${year}-${String(i).padStart(3, '0')}`,
    sku: `${prefix}-SKU-${String(i).padStart(4, '0')}`,
    serial_number: `SN-IMP-${String(i).padStart(4, '0')}`,
    brand: ['Samsung', 'HP', 'Toyota', 'Local Craft', 'Generic'][i % 5],
    material: ['WOOD', 'METAL', 'PLASTIC', 'GLASS', 'CONCRETE'][i % 5],
    size: `${20 + i}m²`,
    purchase_year: year,
    purchase_month: month,
    purchase_day: day,
    purchase_unit_price: unitPrice,
    openingamount: opening,
    'TOTAL BALANCE': f.totalBalance,
    'accumulated DEPRECIATION': accumulated,
    'decimal depr': f.decimalDep.toFixed(4),
    'Annual depreciation': f.annualDep,
    'TOTAL DEPRECIATION': f.totalDep,
    'NET BOOK VALUE': f.netBookValue,
    depreciation_mode: i % 2 ? 'Diminishing' : 'Straight Line',
    depreciation_rate: depRate,
    quantity: 1 + (i % 3),
    unit: ['PCS', 'SET', 'METER', 'LOT'][i % 4],
    condition: ['GOOD', 'FAIR', 'DAMAGED'][i % 3],
    invoice_number: `INV-SAMPLE-${year}-${i}`,
    funding_source: FUNDING[i % FUNDING.length],
    notes: `Sample row ${i} — safe to import (leave asset_code empty for new codes)`,
  });
}

const ws = XLSX.utils.json_to_sheet(rows, { header: HEADERS });
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Asset Register');
XLSX.writeFile(wb, OUT);
console.log(`Wrote ${rows.length} rows → ${OUT}`);
