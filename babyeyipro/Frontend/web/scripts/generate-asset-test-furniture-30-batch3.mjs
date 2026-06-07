/**
 * Minimal 30-row Furniture import — only name, type, sku, purchase_unit_price.
 * SKUs FUR-SKU-0041 … FUR-SKU-0070 (continues after batches 1 & 2).
 * Run: node scripts/generate-asset-test-furniture-30-batch3.mjs
 */
import * as XLSX from 'xlsx';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'public', 'asset-test-import-furniture-30-batch3.xlsx');

const HEADERS = ['name', 'type', 'sku', 'purchase_unit_price'];

const CATEGORY = 'Furniture';

const ITEMS = [
  'Ergonomic Office Chair',
  'L-Shaped Workstation',
  'Pedestal Desk',
  'Tambour Door Cabinet',
  'Mobile Pedestal',
  'Corner Desk Unit',
  'High Back Chair',
  'Foldable Training Table',
  'Cable Management Desk',
  'Reception Desk',
  'Modular Sofa Set',
  'Bar Stool',
  'Side Table',
  'TV Stand Cabinet',
  'Shoe Rack Cabinet',
  'Pantry Cupboard',
  'Glass Display Case',
  'Folding Screen Divider',
  'Adjustable Drafting Table',
  'Heavy Duty Shelf',
  'Steel Filing Drawer',
  'Visitor Bench',
  'Task Chair',
  'Round Meeting Table',
  'Executive Bookcase',
  'Dual Monitor Stand Desk',
  'Storage Ottoman',
  'Wall Mounted Cabinet',
  'Compact Study Desk',
  'Rolling Utility Cart',
];

const rows = ITEMS.map((itemName, i) => {
  const n = i + 41;
  const batchIdx = i + 1;
  const unitPrice = 92000 + batchIdx * 13250;

  return {
    name: `${itemName} B3-${String(batchIdx).padStart(2, '0')}`,
    type: CATEGORY,
    sku: `FUR-SKU-${String(n).padStart(4, '0')}`,
    purchase_unit_price: unitPrice,
  };
});

const ws = XLSX.utils.json_to_sheet(rows, { header: HEADERS });
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Assets');
XLSX.writeFile(wb, OUT);
console.log(`Wrote ${rows.length} rows → ${OUT}`);
console.log('Columns: name, type, sku, purchase_unit_price only');
console.log('SKUs: FUR-SKU-0041 … FUR-SKU-0070');
console.log('Import mode: First time (Year Setup) if starting fresh, or normal if continuing same FY.');
