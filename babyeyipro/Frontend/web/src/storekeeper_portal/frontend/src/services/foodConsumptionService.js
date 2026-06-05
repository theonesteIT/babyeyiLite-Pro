import api from './api'

export const FOOD_ALLOCATIONS = [
  'Kitchen',
  'Teacher staff',
  'Student meals',
  'Boarding',
  'Events / Functions',
  'Other',
]

export const EMPTY_FOOD_CONSUME_FORM = {
  academic_year: '',
  term: '',
  food_stock_in_id: '',
  consumption_date: '',
  quantity: '',
  unit_type: '',
  allocated_to: '',
  allocated_other: '',
  note: '',
}

export function mapFoodConsumptionFromApi(row) {
  return {
    id: row.id,
    food_stock_in_id: row.food_stock_in_id,
    item_name: row.item_name || '',
    supplier_name: row.supplier_name || '',
    academic_year: row.academic_year || '',
    term: row.term || '',
    consumption_date: row.consumption_date ? String(row.consumption_date).slice(0, 10) : '',
    quantity: Number(row.quantity || 0),
    unit_type: row.unit_type || 'kg',
    allocated_to: row.allocated_to || '',
    allocated_other: row.allocated_other || '',
    note: row.note || '',
    remaining_after: Number(row.remaining_after ?? 0),
  }
}

export function mapFoodConsumptionToApi(form) {
  return {
    academic_year: String(form.academic_year || '').trim() || null,
    term: String(form.term || '').trim() || null,
    food_stock_in_id: Number(form.food_stock_in_id) || null,
    consumption_date: form.consumption_date || null,
    quantity: Number(form.quantity) || 0,
    unit_type: String(form.unit_type || '').trim() || null,
    allocated_to: String(form.allocated_to || '').trim(),
    allocated_other:
      form.allocated_to === 'Other' ? String(form.allocated_other || '').trim() || null : null,
    note: String(form.note || '').trim() || null,
  }
}

export async function fetchFoodConsumptions(filters = {}) {
  const params = {}
  if (filters.academic_year) params.academic_year = filters.academic_year
  if (filters.term) params.term = filters.term
  if (filters.from_date) params.from_date = filters.from_date
  if (filters.to_date) params.to_date = filters.to_date
  const res = await api.get('/store/food-consumptions', { params })
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load consumptions')
  return (res.data.data || []).map(mapFoodConsumptionFromApi)
}

export async function createFoodConsumption(payload) {
  const res = await api.post('/store/food-consumptions', payload)
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to save consumption')
  return res.data
}

export async function updateFoodConsumption(id, payload) {
  const res = await api.patch(`/store/food-consumptions/${id}`, payload)
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to update consumption')
  return res.data
}

/** Map API row to form fields (handles custom allocation labels). */
export function foodConsumptionToFormFields(row) {
  const isPreset = FOOD_ALLOCATIONS.includes(row.allocated_to)
  let allocated_to = row.allocated_to || ''
  let allocated_other = row.allocated_other || ''
  if (!isPreset && allocated_to) {
    allocated_other = allocated_to
    allocated_to = 'Other'
  }
  return {
    academic_year: row.academic_year || '',
    term: row.term || '',
    food_stock_in_id: row.food_stock_in_id ? String(row.food_stock_in_id) : '',
    consumption_date: row.consumption_date || '',
    quantity: String(row.quantity ?? ''),
    unit_type: row.unit_type || '',
    allocated_to,
    allocated_other,
    note: row.note || '',
  }
}

export async function deleteFoodConsumption(id) {
  const res = await api.delete(`/store/food-consumptions/${id}`)
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to delete consumption')
  return res.data
}
