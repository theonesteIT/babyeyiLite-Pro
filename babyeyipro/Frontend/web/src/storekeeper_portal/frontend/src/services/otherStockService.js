import api from './api'

export const OTHER_CATEGORIES = [
  'Stationery',
  'Cleaning',
  'Laboratory',
  'Sports',
  'Books',
  'ICT Equipment',
  'Office Supplies',
  'Other',
]

export const OTHER_UNIT_TYPES = ['pcs', 'boxes', 'packs', 'liters', 'kg', 'reams', 'sets', 'rolls', 'Other']

export const OTHER_STORE_LOCATIONS = [
  'Main Store',
  'Office Store',
  'Lab Store',
  'Sports Store',
  'Library Store',
  'Other',
]

export const EMPTY_OTHER_STOCK_FORM = {
  academic_year: '',
  term: '',
  supplier_id: '',
  receive_date: '',
  invoice_number: '',
  category: 'Stationery',
  category_other: '',
  item_name: '',
  quantity: '',
  unit_type: 'pcs',
  unit_type_other: '',
  unit_cost: '',
  min_level: '',
  store_location: '',
  note: '',
}

export function resolveOtherCategoryFromForm(form) {
  if (form.category === 'Other') return String(form.category_other || '').trim() || 'Other'
  return String(form.category || 'Other').trim() || 'Other'
}

export function resolveOtherUnitFromForm(form) {
  if (form.unit_type === 'Other') return String(form.unit_type_other || '').trim() || 'pcs'
  return String(form.unit_type || 'pcs').trim() || 'pcs'
}

export function otherUnitToFormFields(stored) {
  const u = String(stored || '').trim()
  if (!u) return { unit_type: 'pcs', unit_type_other: '' }
  if (OTHER_UNIT_TYPES.filter((t) => t !== 'Other').includes(u)) {
    return { unit_type: u, unit_type_other: '' }
  }
  return { unit_type: 'Other', unit_type_other: u }
}

export function otherCategoryToFormFields(stored) {
  const c = String(stored || '').trim()
  if (!c) return { category: 'Stationery', category_other: '' }
  if (OTHER_CATEGORIES.filter((t) => t !== 'Other').includes(c)) {
    return { category: c, category_other: '' }
  }
  return { category: 'Other', category_other: c }
}

export function mapOtherStockFromApi(row) {
  const qty = Number(row.quantity || 0)
  const remaining = Number(row.remaining_quantity ?? qty)
  return {
    id: row.id,
    academic_year: row.academic_year || '',
    term: row.term || '',
    supplier_id: row.supplier_id || '',
    supplier_name: row.supplier_name || '',
    receive_date: row.receive_date ? String(row.receive_date).slice(0, 10) : '',
    invoice_number: row.invoice_number || '',
    category: row.category || 'Other',
    item_name: row.item_name || '',
    quantity: qty,
    unit_type: row.unit_type || 'pcs',
    unit_cost: row.unit_cost != null ? Number(row.unit_cost) : '',
    total_cost: row.total_cost != null ? Number(row.total_cost) : qty * (Number(row.unit_cost) || 0),
    remaining_quantity: remaining,
    min_level: Number(row.min_level || 0),
    store_location: row.store_location || '',
    note: row.note || '',
  }
}

export function mapOtherStockToApi(form) {
  const quantity = Number(form.quantity) || 0
  const unitCost = form.unit_cost === '' ? null : Number(form.unit_cost)
  return {
    academic_year: String(form.academic_year || '').trim() || null,
    term: String(form.term || '').trim() || null,
    supplier_id: form.supplier_id ? Number(form.supplier_id) : null,
    receive_date: form.receive_date || null,
    invoice_number: String(form.invoice_number || '').trim() || null,
    category: resolveOtherCategoryFromForm(form),
    item_name: String(form.item_name || '').trim(),
    quantity,
    unit_type: resolveOtherUnitFromForm(form),
    unit_cost: unitCost,
    min_level: Number(form.min_level) || 0,
    store_location: String(form.store_location || '').trim() || null,
    note: String(form.note || '').trim() || null,
  }
}

export async function fetchOtherStockIns(filters = {}) {
  const params = {}
  if (filters.academic_year) params.academic_year = filters.academic_year
  if (filters.term) params.term = filters.term
  if (filters.from_date) params.from_date = filters.from_date
  if (filters.to_date) params.to_date = filters.to_date
  const res = await api.get('/store/other-stock-ins', { params })
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load other stock')
  return (res.data.data || []).map(mapOtherStockFromApi)
}

export async function createOtherStockIn(payload) {
  const res = await api.post('/store/other-stock-ins', payload)
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to save stock in')
  return res.data
}

export async function updateOtherStockIn(id, payload) {
  const res = await api.patch(`/store/other-stock-ins/${id}`, payload)
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to update stock in')
  return res.data
}

export async function deleteOtherStockIn(id) {
  const res = await api.delete(`/store/other-stock-ins/${id}`)
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to delete stock in')
  return res.data
}

export function aggregateOtherLevels(stockRows) {
  const map = new Map()
  for (const row of stockRows || []) {
    const key = `${row.item_name}::${row.unit_type}::${row.category}`
    const cur = map.get(key) || {
      item_name: row.item_name,
      unit_type: row.unit_type,
      category: row.category,
      remaining: 0,
      min_level: 0,
    }
    cur.remaining += Number(row.remaining_quantity) || 0
    cur.min_level = Math.max(cur.min_level, Number(row.min_level) || 0)
    map.set(key, cur)
  }
  return [...map.values()].map((r) => ({
    ...r,
    status:
      r.remaining <= 0 ? 'Out of Stock' : r.remaining < r.min_level ? 'Low Stock' : 'Normal',
  }))
}
