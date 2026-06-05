import api from './api'

export const ADJUSTMENT_REASONS = ['Damaged', 'Expired', 'Lost', 'Returned', 'Correction', 'Other']
export const ADJUSTMENT_MODES = [
  { id: 'decrease', label: 'Decrease (remove stock)' },
  { id: 'increase', label: 'Increase (add stock)' },
  { id: 'set', label: 'Set exact quantity' },
]

export const EMPTY_ADJUSTMENT_FORM = {
  source_key: '',
  source_type: '',
  source_id: '',
  mode: 'decrease',
  quantity: '',
  reason: 'Damaged',
  reason_other: '',
  note: '',
  adjustment_date: '',
  academic_year: '',
  term: '',
}

export function mapAdjustmentFromApi(row) {
  return {
    id: row.id,
    source_type: row.source_type,
    source_id: row.source_id,
    item_name: row.item_name || '',
    category: row.category || '',
    unit: row.unit || '',
    mode: row.mode,
    reason: row.reason || '',
    note: row.note || '',
    quantity: Number(row.quantity || 0),
    quantity_before: Number(row.quantity_before || 0),
    quantity_after: Number(row.quantity_after || 0),
    academic_year: row.academic_year || '',
    term: row.term || '',
    adjustment_date: row.adjustment_date ? String(row.adjustment_date).slice(0, 10) : '',
    created_at: row.created_at,
  }
}

export function mapAdjustmentToApi(form) {
  const [sourceType, sourceId] = form.source_key
    ? form.source_key.split(':')
    : [form.source_type, form.source_id]
  let reason = form.reason
  if (reason === 'Other') reason = String(form.reason_other || '').trim() || 'Other'
  return {
    source_type: sourceType,
    source_id: Number(sourceId),
    mode: form.mode,
    quantity: Number(form.quantity) || 0,
    reason,
    note: String(form.note || '').trim() || null,
    adjustment_date: form.adjustment_date || null,
    academic_year: String(form.academic_year || '').trim() || null,
    term: String(form.term || '').trim() || null,
  }
}

export async function fetchStockAdjustments(filters = {}) {
  const params = {}
  if (filters.academic_year) params.academic_year = filters.academic_year
  if (filters.term) params.term = filters.term
  if (filters.from_date) params.from_date = filters.from_date
  if (filters.to_date) params.to_date = filters.to_date
  const res = await api.get('/store/stock-adjustments', { params })
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load adjustments')
  return {
    rows: (res.data.data || []).map(mapAdjustmentFromApi),
    reasons: res.data.reasons || ADJUSTMENT_REASONS,
    modes: res.data.modes || ADJUSTMENT_MODES.map((m) => m.id),
  }
}

export async function fetchAdjustmentSources() {
  const res = await api.get('/store/stock-adjustments/sources')
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load stock sources')
  const d = res.data.data || {}
  const flat = []
  for (const group of ['inventory', 'food', 'other']) {
    for (const item of d[group] || []) {
      flat.push({
        ...item,
        source_key: `${item.source_type}:${item.source_id}`,
        group,
      })
    }
  }
  return { grouped: d, flat }
}

export async function createStockAdjustment(payload) {
  const res = await api.post('/store/stock-adjustments', payload)
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to save adjustment')
  return res.data
}

export async function revertStockAdjustment(id) {
  const res = await api.delete(`/store/stock-adjustments/${id}`)
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to revert adjustment')
  return res.data
}
