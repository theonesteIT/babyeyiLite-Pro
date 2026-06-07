import { SAVED_FILTERS_STORAGE_KEY } from './assetsConstants';
import { formatLocationValue } from './assetsCalculations';

export const EMPTY_FILTERS = {
  q: '',
  searchField: 'all',
  assetType: '',
  location: '',
  status: '',
  condition: '',
  purchaseYear: '',
  registerYear: '',
  valueMin: '',
  valueMax: '',
  category: '',
};

export function loadSavedFilters() {
  try {
    const raw = localStorage.getItem(SAVED_FILTERS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function persistSavedFilters(list) {
  localStorage.setItem(SAVED_FILTERS_STORAGE_KEY, JSON.stringify(list.slice(0, 12)));
}

export function filtersToQueryParams(filters) {
  const p = {};
  if (filters.q?.trim()) {
    p.q = filters.q.trim();
    p.search_field = 'all';
  }
  if (filters.assetType) p.asset_type = filters.assetType;
  if (filters.location) p.location = filters.location;
  if (filters.status) p.assets_status = filters.status;
  if (filters.condition) p.condition = filters.condition;
  if (filters.purchaseYear) p.purchase_year = filters.purchaseYear;
  if (filters.registerYear) p.register_year = filters.registerYear;
  if (filters.valueMin !== '' && filters.valueMin != null) p.value_min = filters.valueMin;
  if (filters.valueMax !== '' && filters.valueMax != null) p.value_max = filters.valueMax;
  if (filters.category) p.category = filters.category;
  return p;
}

export function countActiveFilters(filters) {
  return Object.entries(filters).filter(([k, v]) => {
    if (k === 'searchField') return false;
    return v !== '' && v != null;
  }).length;
}

export function applyClientFilters(assets, filters) {
  let list = [...assets];
  const q = String(filters.q || '').trim().toLowerCase();

  if (q) {
    list = list.filter((a) => {
      const code = String(a.asset_code || a.code || '').trim().toLowerCase();
      const serial = String(a.serial_number || '').trim().toLowerCase();
      const name = String(a.asset_name || a.name || '').toLowerCase();
      const label = String(a.label_tag || '').toLowerCase();
      return code.includes(q) || serial.includes(q) || name.includes(q) || label.includes(q);
    });
  }

  if (filters.assetType) {
    list = list.filter((a) => (a.asset_type || a.type) === filters.assetType);
  }
  if (filters.location) {
    list = list.filter((a) => formatLocationValue(a.location) === filters.location);
  }
  if (filters.status) {
    list = list.filter((a) => (a.assets_status || a.status) === filters.status);
  }
  if (filters.condition) {
    list = list.filter((a) => (a.condition_code || a.condition) === filters.condition);
  }
  if (filters.purchaseYear) {
    const y = String(filters.purchaseYear);
    list = list.filter((a) => String(a.purchase_date || '').slice(0, 4) === y);
  }
  if (filters.registerYear) {
    const y = String(filters.registerYear);
    list = list.filter((a) => String(a.register_year ?? '') === y);
  }
  if (filters.category) {
    list = list.filter((a) => a.category === filters.category);
  }
  const min = Number(filters.valueMin);
  const max = Number(filters.valueMax);
  if (Number.isFinite(min) && min > 0) {
    list = list.filter((a) => Number(a.total_balance || 0) >= min);
  }
  if (Number.isFinite(max) && max > 0) {
    list = list.filter((a) => Number(a.total_balance || 0) <= max);
  }

  return list;
}

export function extractFilterOptions(assets = []) {
  const locations = [...new Set(assets.map((a) => formatLocationValue(a.location)).filter(Boolean))].sort();
  const categories = [...new Set(assets.map((a) => a.category).filter(Boolean))].sort();
  const years = [...new Set(
    assets.map((a) => String(a.purchase_date || '').slice(0, 4)).filter((y) => y && y !== 'undefined')
  )].sort((a, b) => b - a);
  const registerYears = [...new Set(
    assets.map((a) => String(a.register_year ?? '')).filter((y) => y && y !== 'undefined')
  )].sort((a, b) => b - a);
  return { locations, categories, years, registerYears };
}
