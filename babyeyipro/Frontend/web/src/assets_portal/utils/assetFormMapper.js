import { formatLocationValue } from './assetsCalculations';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function currentRegisterYear() {
  return new Date().getFullYear();
}

export function registerYearOptions(past = 8, future = 5) {
  const y = currentRegisterYear();
  return Array.from({ length: past + future + 1 }, (_, i) => y + future - i);
}

function parsePurchaseParts(asset) {
  const raw = asset?.purchase_date;
  if (!raw) return { purchaseYear: '', purchaseMonth: '', purchaseDay: '' };
  const s = String(raw).slice(0, 10);
  const [y, m, d] = s.split('-');
  return {
    purchaseYear: y || '',
    purchaseMonth: m ? String(Number(m)) : '',
    purchaseDay: d ? String(Number(d)) : '',
  };
}

function splitFunding(asset) {
  const src = asset?.funding_source || '';
  if (asset?.funding_source_other) {
    return { fundingSource: 'Other', fundingOther: asset.funding_source_other };
  }
  if (String(src).startsWith('Other:')) {
    return { fundingSource: 'Other', fundingOther: String(src).replace(/^Other:\s*/i, '').trim() };
  }
  return { fundingSource: src, fundingOther: '' };
}

const MATERIAL_OPTIONS = ['WOOD', 'METAL', 'PLASTIC', 'GLASS', 'FABRIC', 'LEATHER', 'OTHER'];

function parseMaterial(asset) {
  const raw = trimMaterial(asset?.material);
  if (!raw) return { material: '', materialOther: '' };
  if (MATERIAL_OPTIONS.includes(raw)) {
    return { material: raw, materialOther: '' };
  }
  return { material: 'OTHER', materialOther: raw };
}

function trimMaterial(v) {
  return String(v ?? '').trim().toUpperCase();
}

/** Resolve category type fields for API payload */
export function categoryTypeToPayload(form) {
  const isOther = form.categoryType === 'OTHER';
  const label = isOther
    ? String(form.categoryTypeOther || '').trim()
    : String(form.categoryType || '').trim();
  return {
    category: label || null,
    asset_type: isOther ? 'OTHER' : label || null,
    asset_type_other: isOther ? label || null : null,
  };
}

export function categoryTypeLabel(form) {
  if (form.categoryType === 'OTHER') return form.categoryTypeOther || 'Other';
  return form.categoryType || '';
}

/** Map API asset row → AddAssetWizard form state */
export function assetToForm(asset) {
  if (!asset) return null;
  const parts = parsePurchaseParts(asset);
  const { fundingSource, fundingOther } = splitFunding(asset);
  const type = asset.asset_type || asset.type || '';
  const typeOther = asset.asset_type_other || '';
  const categoryName = asset.category || '';
  let categoryType = categoryName || type || '';
  let categoryTypeOther = '';
  if (type === 'OTHER' || categoryType === 'OTHER') {
    categoryType = 'OTHER';
    categoryTypeOther = typeOther || categoryName || '';
  }
  const { material, materialOther } = parseMaterial(asset);

  return {
    location: formatLocationValue(asset.location) || '',
    assetName: asset.asset_name || asset.name || '',
    labelTag: asset.label_tag || '',
    categoryType,
    categoryTypeOther,
    description: asset.description || '',
    supplier: asset.supplier_name || asset.supplier || '',
    upi: asset.upi || '',
    sku: asset.sku || '',
    serialNumber: asset.serial_number || '',
    brand: asset.brand || '',
    material,
    materialOther,
    size: asset.size_label || asset.size || '',
    purchaseYear: parts.purchaseYear,
    purchaseMonth: parts.purchaseMonth,
    purchaseDay: parts.purchaseDay,
    unitPrice: asset.unit_price ?? '',
    openingAmount: asset.opening_amount ?? '',
    invoice: asset.invoice_number || '',
    sdNumber: asset.sd_number || '',
    receiptNumber: asset.receipt_number || '',
    referenceNo: asset.reference_no || '',
    assetsStatus: asset.assets_status || 'Active',
    fundingSource,
    fundingOther,
    depMode: asset.dep_mode || 'Diminishing',
    depRate: asset.dep_rate ?? '',
    accumulatedDep: asset.accumulated_depreciation ?? '',
    decimalDep: asset.decimal_dep ?? 0,
    annualDep: asset.annual_dep ?? 0,
    totalDep: asset.total_dep ?? 0,
    netBookValue: asset.net_book_value ?? 0,
    depYears: asset.dep_years ?? '',
    quantity: asset.quantity ?? 1,
    unit: asset.unit || '',
    condition: asset.condition_code || asset.condition || 'GOOD',
    notes: asset.notes || '',
    registerYear: asset.register_year ?? currentRegisterYear(),
    assetCode: asset.asset_code || asset.code || '',
    createdAt: asset.created_at || null,
  };
}

export function formatRegisterTimestamp(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return String(iso);
  }
}

export { MONTHS };
