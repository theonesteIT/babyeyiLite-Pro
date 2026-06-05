import api from './api'

export const STOCKOUT_PURPOSES = ['Production', 'Cutting', 'Damaged', 'Adjustment', 'Other']

export const EMPTY_STOCKOUT_FORM = {
  fabric_receipt_id: '',
  out_date: '',
  meters_out: '',
  purpose: 'Production',
  note: '',
}

export function mapStockoutFromApi(row) {
  return {
    id: row.id,
    fabric_receipt_id: row.fabric_receipt_id,
    fabric_type: row.fabric_type || '',
    color: row.color || '',
    supplier_name: row.supplier_name || '',
    academic_year: row.academic_year || '',
    term: row.term || '',
    out_date: row.out_date ? String(row.out_date).slice(0, 10) : '',
    meters_out: Number(row.meters_out || 0),
    purpose: row.purpose || '',
    note: row.note || '',
    remaining_after: Number(row.remaining_after ?? 0),
    receipt_remaining_meters: row.receipt_remaining_meters != null ? Number(row.receipt_remaining_meters) : null,
  }
}

export function mapStockoutToApi(form) {
  return {
    fabric_receipt_id: Number(form.fabric_receipt_id) || null,
    out_date: form.out_date || null,
    meters_out: Number(form.meters_out) || 0,
    purpose: String(form.purpose || '').trim() || null,
    note: String(form.note || '').trim() || null,
  }
}

export async function fetchFabricStockouts() {
  const res = await api.get('/store/fabric-stockouts')
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load fabric stock outs')
  return (res.data.data || []).map(mapStockoutFromApi)
}

export async function createFabricStockout(form) {
  const res = await api.post('/store/fabric-stockouts', mapStockoutToApi(form))
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to record stock out')
  return res.data
}

export async function deleteFabricStockout(id) {
  const res = await api.delete(`/store/fabric-stockouts/${id}`)
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to delete stock out')
  return res.data
}
