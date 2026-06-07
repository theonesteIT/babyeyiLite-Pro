import {
  LayoutGrid, Layers, Calendar, HeartPulse, UserCheck, Undo2, ArrowLeftRight,
  Wrench, TrendingDown, AlertTriangle, MapPin, Package,
} from 'lucide-react';

export const NAVY = '#000435';
export const GOLD = '#FFB300';
export const FONT = "'Montserrat', sans-serif";

export const REPORT_NAV = [
  { slug: '', name: 'Overview', icon: LayoutGrid },
  { slug: 'all-assets', name: 'All Assets', icon: Package },
  { slug: 'categories', name: 'Categories', icon: Layers },
  { slug: 'financial-years', name: 'Financial Years', icon: Calendar },
  { slug: 'health', name: 'Health', icon: HeartPulse },
  { slug: 'assignments', name: 'Assignments', icon: UserCheck },
  { slug: 'returns', name: 'Returns', icon: Undo2 },
  { slug: 'transfers', name: 'Transfers', icon: ArrowLeftRight },
  { slug: 'maintenance', name: 'Maintenance', icon: Wrench },
  { slug: 'depreciation', name: 'Depreciation', icon: TrendingDown },
  { slug: 'damaged-lost', name: 'Damaged & Lost', icon: AlertTriangle },
  { slug: 'locations', name: 'Locations', icon: MapPin },
];

export const REPORT_CARDS = [
  { slug: 'all-assets', title: 'All Assets Report', desc: 'Full register table with QR codes', icon: Package },
  { slug: 'categories', title: 'Assets by Category', desc: 'Quantity, cost & value by category', icon: Layers },
  { slug: 'financial-years', title: 'Financial Years', desc: 'Assets added per register year', icon: Calendar },
  { slug: 'health', title: 'Asset Health', desc: 'Used vs Not Used (Old) utilization', icon: HeartPulse },
  { slug: 'assignments', title: 'Assigned Assets', desc: 'Staff & department assignments', icon: UserCheck },
  { slug: 'returns', title: 'Returned Assets', desc: 'Return history & damage tracking', icon: Undo2 },
  { slug: 'transfers', title: 'Transfer Report', desc: 'Location & department movements', icon: ArrowLeftRight },
  { slug: 'maintenance', title: 'Maintenance', desc: 'Tickets, costs & completion', icon: Wrench },
  { slug: 'depreciation', title: 'Depreciation', desc: 'FY engine category summary', icon: TrendingDown },
  { slug: 'damaged-lost', title: 'Damaged & Lost', desc: 'Exceptions for audit', icon: AlertTriangle },
  { slug: 'locations', title: 'Location Report', desc: 'Assets by campus & room', icon: MapPin },
];

export function tableColumnsFromReport(table) {
  if (!table?.rows?.length) {
    return (table?.columns || []).map((label) => ({ label, field: label }));
  }
  const keys = Object.keys(table.rows[0]);
  if (table?.columns?.length) {
    return table.columns.map((label, i) => ({
      label,
      field: keys[i] || keys.find((k) => label.toLowerCase().replace(/\s+/g, '_').includes(k)) || keys[0],
    }));
  }
  return keys.map((k) => ({
    label: k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    field: k,
  }));
}

export function formatRwfShort(n) {
  const v = Number(n) || 0;
  if (v >= 1_000_000_000) return `RWF ${(v / 1_000_000_000).toFixed(1)}B`;
  if (v >= 1_000_000) return `RWF ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `RWF ${(v / 1_000).toFixed(0)}K`;
  return `RWF ${Math.round(v).toLocaleString()}`;
}

/** All Assets report — matches Asset Add Test register columns + QR */
export const ALL_ASSETS_REPORT_COLUMNS = [
  { label: 'S/N', field: 'sn' },
  { label: 'ASSET NAME', field: 'asset_name' },
  { label: 'CATEGORY', field: 'category' },
  { label: 'OPENING STOCK', field: 'opening_stock', money: true },
  { label: 'PURCHASE PRICE', field: 'purchase_price', money: true },
  { label: 'TOTAL BALANCE', field: 'total_balance', money: true },
  { label: 'ACCUMULATED DEPRECIATION', field: 'accumulated_depreciation', money: true },
  { label: 'DEPRECIATION RATE', field: 'dep_rate' },
  { label: 'ANNUAL DEPRECIATION', field: 'annual_depreciation', money: true },
  { label: 'TOTAL DEPRECIATION', field: 'total_depreciation', money: true },
  { label: 'NET BOOK VALUE', field: 'net_book_value', money: true },
  { label: 'HEALTH STATUS', field: 'asset_health_status' },
  { label: 'QUANTITY', field: 'quantity' },
  { label: 'QR CODE', field: 'qr_code' },
];

export function allAssetsExportRows(rows = []) {
  return rows.map((row) => ({
    ...row,
    opening_stock: Number(row.opening_stock || 0),
    purchase_price: Number(row.purchase_price || 0),
    total_balance: Number(row.total_balance || 0),
    accumulated_depreciation: Number(row.accumulated_depreciation || 0),
    annual_depreciation: Number(row.annual_depreciation || 0),
    total_depreciation: Number(row.total_depreciation || 0),
    net_book_value: Number(row.net_book_value || 0),
    qr_code: row.qr_code || '',
  }));
}
