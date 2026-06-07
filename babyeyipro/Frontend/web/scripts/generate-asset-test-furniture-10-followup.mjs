/**
 * 10 follow-up furniture rows — import AFTER the 30-row batch to test rolling opening.
 * SKUs FUR-SKU-0031 … FUR-SKU-0040 (no overlap with first batch).
 * Run: node scripts/generate-asset-test-furniture-10-followup.mjs
 */
import * as XLSX from 'xlsx';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'public', 'asset-test-import-furniture-10-followup.xlsx');

const HEADERS = [
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

const CATEGORY = 'Furniture';

const ITEMS = [
  'Boardroom Table',
  'Visitor Chair',
  'Office Credenza',
  'Standing Desk',
  'Coat Rack',
  'Document Tray Set',
  'Mobile Whiteboard',
  'Break Room Table',
  'Stackable Chair',
  'Reception Sofa',
];

const LOCATIONS = [
  'Main Campus - Admin Block',
  'Main Campus - Staff Room',
  'Main Campus - Reception',
  'Annex Building - Floor 1',
  'Main Campus - Library',
];

const SUPPLIERS = [
  'East Africa Furniture Ltd',
  'Kigali Office Supplies',
  'Rwanda Wood Works',
  'Prime Interiors Rwanda',
];

const MATERIALS = ['Wood', 'Metal', 'Plastic', 'Wood & Metal', 'Steel Frame'];

const rows = ITEMS.map((itemName, i) => {
  const n = i + 31; // continues after first batch SKUs 0001–0030
  const batchIdx = i + 1;
  const year = 2018;
  const month = ((batchIdx * 2) % 12) + 1;
  const day = ((batchIdx * 3) % 28) + 1;
  const unitPrice = 120000 + batchIdx * 18000;

  return {
    location: LOCATIONS[batchIdx % LOCATIONS.length],
    label: `FUR-${String(n).padStart(3, '0')}`,
    type: CATEGORY,
    supplier: SUPPLIERS[batchIdx % SUPPLIERS.length],
    upi: `UPI-FUR-${year}-${String(n).padStart(3, '0')}`,
    sku: `FUR-SKU-${String(n).padStart(4, '0')}`,
    cba: '',
    material: MATERIALS[batchIdx % MATERIALS.length],
    purchase_year: year,
    purchase_month: month,
    purchase_day: day,
    purchase_unit_price: unitPrice,
    name: `${itemName} (Batch 2)`,
  };
});

const ws = XLSX.utils.json_to_sheet(rows, { header: HEADERS });
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Assets');
XLSX.writeFile(wb, OUT);
console.log(`Wrote ${rows.length} follow-up furniture rows → ${OUT}`);
console.log('SKUs: FUR-SKU-0031 … FUR-SKU-0040 — import into the SAME year as your first 30 rows.');
