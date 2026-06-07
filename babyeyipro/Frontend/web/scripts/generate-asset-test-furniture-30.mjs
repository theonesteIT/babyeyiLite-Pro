/**
 * Generates public/asset-test-import-furniture-30.xlsx (30 furniture rows for Asset Add Test import).
 * Run: node scripts/generate-asset-test-furniture-30.mjs
 */
import * as XLSX from 'xlsx';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'public', 'asset-test-import-furniture-30.xlsx');

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

const FURNITURE_ITEMS = [
  'Executive Desk',
  'Office Chair',
  'Filing Cabinet',
  'Bookshelf',
  'Conference Table',
  'Student Desk',
  'Plastic Chair',
  'Wooden Stool',
  'Teacher Table',
  'Storage Cupboard',
  'Whiteboard Stand',
  'Computer Table',
  'Reception Counter',
  'Waiting Bench',
  'Library Table',
  'Metal Locker',
  'Drawer Unit',
  'Meeting Room Chair',
  'Office Sofa',
  'Coffee Table',
  'Wardrobe',
  'Bed Frame',
  'Mattress Stand',
  'Dining Table',
  'Kitchen Cabinet',
  'Display Shelf',
  'Notice Board Frame',
  'Exam Desk',
  'Lab Stool',
  'Office Partition',
];

const LOCATIONS = [
  'Main Campus - Admin Block',
  'Main Campus - Classroom A',
  'Main Campus - Classroom B',
  'Main Campus - Staff Room',
  'Main Campus - Library',
  'Main Campus - Laboratory',
  'Main Campus - Reception',
  'Annex Building - Floor 1',
  'Annex Building - Floor 2',
  'Sports Hall Store',
];

const SUPPLIERS = [
  'East Africa Furniture Ltd',
  'Kigali Office Supplies',
  'Rwanda Wood Works',
  'Prime Interiors Rwanda',
  'Smart Furnish Co',
];

const MATERIALS = ['Wood', 'Metal', 'Plastic', 'Wood & Metal', 'Plywood', 'Steel Frame'];

const rows = FURNITURE_ITEMS.map((itemName, i) => {
  const n = i + 1;
  const year = 2018 + (n % 4);
  const month = ((n * 2) % 12) + 1;
  const day = ((n * 3) % 28) + 1;
  const unitPrice = 85000 + n * 12500;

  return {
    location: LOCATIONS[n % LOCATIONS.length],
    label: `FUR-${String(n).padStart(3, '0')}`,
    type: CATEGORY,
    supplier: SUPPLIERS[n % SUPPLIERS.length],
    upi: `UPI-FUR-${year}-${String(n).padStart(3, '0')}`,
    sku: `FUR-SKU-${String(n).padStart(4, '0')}`,
    cba: n % 5 === 0 ? `CBA-FUR-${n}` : '',
    material: MATERIALS[n % MATERIALS.length],
    purchase_year: year,
    purchase_month: month,
    purchase_day: day,
    purchase_unit_price: unitPrice,
    name: `${itemName} ${String(n).padStart(2, '0')}`,
  };
});

const ws = XLSX.utils.json_to_sheet(rows, { header: HEADERS });
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Assets');
XLSX.writeFile(wb, OUT);
console.log(`Wrote ${rows.length} furniture rows → ${OUT}`);
