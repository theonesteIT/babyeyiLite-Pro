import { formatRwf, formatLocationValue, parseNum, computePurchaseTax } from './assetsCalculations';

function seedFromId(id, salt = 0) {
  const n = Number(id) || 1;
  return ((n * 9301 + salt * 49297) % 233280) / 233280;
}

export function buildDepreciationSeries(asset) {
  const total = parseNum(asset.total_balance);
  const rate = parseNum(asset.dep_rate) / 100;
  const accumulated = parseNum(asset.accumulated_depreciation);
  const years = Math.max(5, Math.min(12, parseNum(asset.dep_years) || 8));
  const points = [];
  let book = total;
  let acc = accumulated;

  points.push({ year: 'Opening', balance: Math.round(total), nbv: Math.round(Math.max(0, total - acc)) });

  for (let y = 1; y <= years; y += 1) {
    const annual = book * rate;
    acc += annual;
    book = Math.max(0, total - acc);
    points.push({
      year: `Y${y}`,
      balance: Math.round(total),
      nbv: Math.round(book),
      annual: Math.round(annual),
    });
  }
  return points;
}

export function buildMaintenanceHistory(asset) {
  const id = asset.id || 1;
  const base = asset.updated_at || asset.created_at || new Date().toISOString();
  const d0 = new Date(base);
  const types = ['Preventive', 'Corrective', 'Inspection', 'Calibration'];
  const statuses = ['Completed', 'Scheduled', 'In progress'];
  const count = 2 + Math.floor(seedFromId(id) * 3);

  return Array.from({ length: count }, (_, i) => {
    const dt = new Date(d0);
    dt.setMonth(dt.getMonth() - (i + 1) * 3);
    return {
      id: `${id}-m-${i}`,
      date: dt.toISOString().slice(0, 10),
      type: types[Math.floor(seedFromId(id, i) * types.length)],
      status: statuses[Math.floor(seedFromId(id, i + 2) * statuses.length)],
      note: i === 0
        ? `Routine service — ${asset.asset_type || 'asset'}`
        : `Follow-up check (${formatLocationValue(asset.location) || 'site'})`,
      cost: Math.round(50000 + seedFromId(id, i + 5) * 200000),
    };
  });
}

export function buildAssignedStaff(asset) {
  const id = asset.id || 1;
  const r = seedFromId(id, 7);
  if (r < 0.35) {
    return [];
  }
  const names = [
    { name: 'Jean Uwimana', department: 'Administration' },
    { name: 'Claudine Mukamana', department: 'ICT' },
    { name: 'Patrick Niyonzima', department: 'Maintenance' },
    { name: 'Vestine Umutoni', department: 'Store' },
  ];
  const pick = names[Math.floor(seedFromId(id, 9) * names.length)];
  const since = new Date(asset.created_at || Date.now());
  since.setMonth(since.getMonth() - 6);
  const list = [{ ...pick, role: 'Custodian', since: since.toISOString().slice(0, 10) }];
  if (r > 0.75) {
    const pick2 = names[Math.floor(seedFromId(id, 11) * names.length)];
    list.push({ ...pick2, role: 'Verifier', since: since.toISOString().slice(0, 10) });
  }
  return list;
}

export function buildImageGallery(asset) {
  const type = asset.asset_type || asset.type || 'ASSET';
  const palettes = {
    BUILDING: ['#000435', '#1e3a5f', '#3d5a80'],
    FURNITURE: ['#78350f', '#92400e', '#b45309'],
    'ICT & ELECTRONICS': ['#0f172a', '#1e293b', '#334155'],
    VEHICLES: ['#14532d', '#166534', '#15803d'],
    default: ['#000435', '#FEBF10', '#3d5a80'],
  };
  const colors = palettes[type] || palettes.default;
  return colors.map((color, i) => ({
    id: `${asset.id}-img-${i}`,
    label: i === 0 ? 'Primary view' : i === 1 ? 'Asset tag' : 'Location context',
    color,
    caption: `${type} — ${asset.asset_name || 'Asset'}`,
  }));
}

export function formatAssetDetailRows(asset) {
  const tax = asset.tax_amount != null
    ? {
        base: parseNum(asset.unit_price),
        taxAmount: parseNum(asset.tax_amount),
        priceInclTax: parseNum(asset.price_incl_tax),
      }
    : computePurchaseTax(asset.unit_price);

  return [
    { label: 'Asset code', value: asset.asset_code || asset.code },
    { label: 'Asset tag', value: asset.label_tag },
    { label: 'Serial number', value: asset.serial_number },
    { label: 'Type', value: asset.asset_type || asset.type },
    { label: 'Location', value: formatLocationValue(asset.location || asset.asset_location) },
    { label: 'Category', value: asset.category },
    { label: 'Health status', value: asset.asset_health_status || 'Used' },
    { label: 'Status', value: asset.assets_status || asset.status },
    { label: 'Condition', value: asset.condition_code || asset.condition },
    { label: 'Supplier', value: asset.supplier_name || asset.supplier },
    { label: 'SD Number', value: asset.sd_number },
    { label: 'Receipt Number', value: asset.receipt_number },
    { label: 'Reference No', value: asset.reference_no },
    { label: 'Invoice', value: asset.invoice_number },
    { label: 'Register year', value: asset.register_year != null ? String(asset.register_year) : '—' },
    { label: 'Recorded on', value: asset.created_at ? String(asset.created_at).replace('T', ' ').slice(0, 19) : '—' },
    { label: 'Purchase date', value: asset.purchase_date ? String(asset.purchase_date).slice(0, 10) : '—' },
    { label: 'Unit price (excl. tax)', value: tax.base > 0 ? `RWF ${formatRwf(tax.base)}` : '—' },
    { label: 'VAT 18%', value: tax.taxAmount > 0 ? `RWF ${formatRwf(tax.taxAmount)}` : '—' },
    { label: 'Price incl. tax', value: tax.priceInclTax > 0 ? `RWF ${formatRwf(tax.priceInclTax)}` : '—' },
    { label: 'Remain (excl. tax)', value: tax.base > 0 ? `RWF ${formatRwf(tax.base)}` : '—' },
    { label: 'Total balance', value: asset.total_balance != null ? `RWF ${formatRwf(asset.total_balance)}` : '—' },
    { label: 'Net book value', value: asset.net_book_value != null ? `RWF ${formatRwf(asset.net_book_value)}` : '—' },
    { label: 'Depreciation', value: asset.dep_rate != null ? `${asset.dep_rate}% ${asset.dep_mode || ''}` : '—' },
    { label: 'Quantity', value: `${asset.quantity ?? 1} ${asset.unit || ''}`.trim() },
  ].map((r) => ({
    ...r,
    value: r.value != null && typeof r.value === 'object' ? formatLocationValue(r.value) : r.value,
  })).filter((r) => r.value != null && r.value !== '');
}
