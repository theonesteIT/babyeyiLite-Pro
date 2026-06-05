import api from './api'

export function mapInventoryFromApi(row) {
  return {
    id: row.id,
    name: row.name || '',
    category: row.category || 'Other',
    term: row.term || '',
    academic_year: row.academic_year || '',
    unit: row.unit || 'pcs',
    quantity: Number(row.quantity || 0),
    reorder_level: Number(row.reorder_level || 0),
    unit_cost: row.unit_cost != null ? Number(row.unit_cost) : null,
    location: row.location || '',
    note: row.note || '',
    updated_at: row.updated_at,
  }
}

export function mapInventoryToApi(form) {
  return {
    name: String(form.name || '').trim(),
    category: String(form.category || '').trim() || 'Other',
    term: String(form.term || '').trim() || null,
    academic_year: String(form.academic_year || '').trim() || null,
    unit: String(form.unit || '').trim() || 'pcs',
    quantity: Number(form.quantity) || 0,
    reorder_level: Number(form.reorder_level) || 0,
    unit_cost: form.unit_cost === '' ? null : Number(form.unit_cost),
    location: String(form.location || '').trim() || null,
    note: String(form.note || '').trim() || null,
  }
}

export async function fetchInventory(params = {}) {
  const res = await api.get('/store/inventory', { params })
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load inventory')
  return { data: (res.data.data || []).map(mapInventoryFromApi), meta: res.data.meta }
}

export async function createInventoryItem(form) {
  const res = await api.post('/store/inventory', mapInventoryToApi(form))
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to create item')
  return res.data
}

export async function updateInventoryItem(id, form) {
  const res = await api.patch(`/store/inventory/${id}`, mapInventoryToApi(form))
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to update item')
  return res.data
}

export async function deleteInventoryItem(id) {
  const res = await api.delete(`/store/inventory/${id}`)
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to delete item')
  return res.data
}
