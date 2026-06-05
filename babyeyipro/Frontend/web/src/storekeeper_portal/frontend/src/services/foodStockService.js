import api from './api'

export const FOOD_UNIT_TYPES = ['kg', 'pcs', 'liters', 'bags', 'boxes', 'bunches', 'crates', 'Other']

export const EMPTY_FOOD_STOCK_FORM = {
  academic_year: '',
  term: '',
  supplier_id: '',
  receive_date: '',
  invoice_number: '',
  item_name: '',
  quantity: '',
  unit_type: 'kg',
  unit_type_other: '',
  unit_cost: '',
  min_level: '',
  expiry_date: '',
  store_location: '',
  note: '',
}

export const FOOD_STORE_LOCATIONS = [
  'Main Store',
  'Kitchen Store',
  'Cold Room',
  'Dry Store',
  'Boarding Store',
  'Other',
]

export function resolveFoodUnitFromForm(form) {
  if (form.unit_type === 'Other') return String(form.unit_type_other || '').trim()
  return String(form.unit_type || 'kg').trim() || 'kg'
}

export function foodUnitToFormFields(stored) {
  const u = String(stored || '').trim()
  if (!u) return { unit_type: 'kg', unit_type_other: '' }
  if (FOOD_UNIT_TYPES.filter((t) => t !== 'Other').includes(u)) {
    return { unit_type: u, unit_type_other: '' }
  }
  return { unit_type: 'Other', unit_type_other: u }
}

export function mapFoodStockFromApi(row) {
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
    item_name: row.item_name || '',
    quantity: qty,
    unit_type: row.unit_type || 'kg',
    unit_cost: row.unit_cost != null ? Number(row.unit_cost) : '',
    total_cost: row.total_cost != null ? Number(row.total_cost) : qty * (Number(row.unit_cost) || 0),
    remaining_quantity: remaining,
    min_level: Number(row.min_level || 0),
    expiry_date: row.expiry_date ? String(row.expiry_date).slice(0, 10) : '',
    store_location: row.store_location || '',
    note: row.note || '',
  }
}

export function isExpirySoon(expiryDate, days = 14) {
  if (!expiryDate) return false
  const exp = new Date(expiryDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  exp.setHours(0, 0, 0, 0)
  const limit = new Date(today)
  limit.setDate(limit.getDate() + days)
  return exp >= today && exp <= limit
}

export function isExpired(expiryDate) {
  if (!expiryDate) return false
  const exp = new Date(expiryDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  exp.setHours(0, 0, 0, 0)
  return exp < today
}

export function mapFoodStockToApi(form) {
  const quantity = Number(form.quantity) || 0
  const unitCost = form.unit_cost === '' ? null : Number(form.unit_cost)
  return {
    academic_year: String(form.academic_year || '').trim() || null,
    term: String(form.term || '').trim() || null,
    supplier_id: form.supplier_id ? Number(form.supplier_id) : null,
    receive_date: form.receive_date || null,
    invoice_number: String(form.invoice_number || '').trim() || null,
    item_name: String(form.item_name || '').trim(),
    quantity,
    unit_type: resolveFoodUnitFromForm(form),
    unit_cost: unitCost,
    min_level: Number(form.min_level) || 0,
    expiry_date: form.expiry_date || null,
    store_location: String(form.store_location || '').trim() || null,
    note: String(form.note || '').trim() || null,
  }
}

export async function fetchFoodStockIns(filters = {}) {
  const params = {}
  if (filters.academic_year) params.academic_year = filters.academic_year
  if (filters.term) params.term = filters.term
  if (filters.from_date) params.from_date = filters.from_date
  if (filters.to_date) params.to_date = filters.to_date
  const res = await api.get('/store/food-stock-ins', { params })
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load food stock')
  return (res.data.data || []).map(mapFoodStockFromApi)
}

export async function createFoodStockIn(payload) {
  const res = await api.post('/store/food-stock-ins', payload)
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to save food stock')
  return res.data
}

export async function updateFoodStockIn(id, payload) {
  const res = await api.patch(`/store/food-stock-ins/${id}`, payload)
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to update food stock')
  return res.data
}

export async function deleteFoodStockIn(id) {
  const res = await api.delete(`/store/food-stock-ins/${id}`)
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to delete food stock')
  return res.data
}

/** Aggregate stock levels by item + unit */
export function aggregateFoodLevels(stockRows) {
  const map = new Map()
  for (const row of stockRows || []) {
    const key = `${row.item_name}::${row.unit_type}`
    const cur = map.get(key) || {
      item_name: row.item_name,
      unit_type: row.unit_type,
      remaining: 0,
      received: 0,
      min_level: 0,
    }
    cur.remaining += Number(row.remaining_quantity) || 0
    cur.received += Number(row.quantity) || 0
    cur.min_level = Math.max(cur.min_level, Number(row.min_level) || 0)
    map.set(key, cur)
  }
  return [...map.values()].map((r) => ({
    ...r,
    status:
      r.remaining <= 0 ? 'Out of Stock' : r.remaining < r.min_level ? 'Low Stock' : 'Normal',
  }))
}
