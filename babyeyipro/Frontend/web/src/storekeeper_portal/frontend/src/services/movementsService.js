import api from './api'

export function mapMovementFromApi(row) {
  return {
    id: row.id,
    item_id: row.item_id,
    item_name: row.item_name || 'Unknown',
    item_category: row.item_category || '',
    type: row.type || 'adjusted',
    term: row.term || '',
    academic_year: row.academic_year || '',
    movement_date: row.movement_date || null,
    quantity: Number(row.quantity || 0),
    stock_after: Number(row.stock_after || 0),
    current_item_stock: Number(row.current_item_stock || 0),
    unit_cost: row.unit_cost != null ? Number(row.unit_cost) : null,
    ref: row.ref || '',
    note: row.note || '',
    supplier_id: row.supplier_id || null,
    supplier_name: row.supplier_name || '',
    date: row.date || row.created_at,
    created_at: row.created_at,
  }
}

export async function fetchMovements(params = {}) {
  const res = await api.get('/store/movements', { params })
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load movements')
  return { data: (res.data.data || []).map(mapMovementFromApi), meta: res.data.meta }
}

export async function createMovement(payload) {
  const res = await api.post('/store/movements', payload)
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to record movement')
  return res.data
}

export const MOVEMENT_TYPES = ['stock_in', 'stock_out', 'adjusted', 'returned']
