import api from './api'

export const FABRIC_TYPES = ['White Sheet', 'Blue Sheet', 'Khaki Sheet', 'Green Sheet', 'Other']

export const EMPTY_FABRIC_FORM = {
  academic_year: '',
  term: '',
  supplier_id: '',
  purchase_date: '',
  invoice_number: '',
  fabric_type: '',
  fabric_type_other: '',
  color: '',
  meters: '',
  unit_cost: '',
}

const PRESET_FABRIC_TYPES = FABRIC_TYPES.filter((t) => t !== 'Other')

export function resolveFabricTypeFromForm(form) {
  if (form.fabric_type === 'Other') {
    return String(form.fabric_type_other || '').trim()
  }
  return String(form.fabric_type || '').trim()
}

export function fabricTypeToFormFields(storedType) {
  const type = String(storedType || '').trim()
  if (!type) return { fabric_type: '', fabric_type_other: '' }
  if (PRESET_FABRIC_TYPES.includes(type)) {
    return { fabric_type: type, fabric_type_other: '' }
  }
  return { fabric_type: 'Other', fabric_type_other: type }
}

export function mapFabricFromApi(row) {
  const meters = Number(row.meters || 0)
  const remaining = Number(row.remaining_meters ?? meters)
  return {
    id: row.id,
    academic_year: row.academic_year || '',
    term: row.term || '',
    supplier_id: row.supplier_id || '',
    supplier_name: row.supplier_name || '',
    purchase_date: row.purchase_date ? String(row.purchase_date).slice(0, 10) : '',
    invoice_number: row.invoice_number || '',
    fabric_type: row.fabric_type || '',
    color: row.color || '',
    meters,
    unit_cost: row.unit_cost != null ? Number(row.unit_cost) : '',
    total_cost: row.total_cost != null ? Number(row.total_cost) : meters * (Number(row.unit_cost) || 0),
    remaining_meters: remaining,
    note: row.note || '',
  }
}

export function mapFabricToApi(form) {
  const meters = Number(form.meters) || 0
  const unitCost = form.unit_cost === '' ? null : Number(form.unit_cost)
  return {
    academic_year: String(form.academic_year || '').trim() || null,
    term: String(form.term || '').trim() || null,
    supplier_id: form.supplier_id ? Number(form.supplier_id) : null,
    purchase_date: form.purchase_date || null,
    invoice_number: String(form.invoice_number || '').trim() || null,
    fabric_type: resolveFabricTypeFromForm(form),
    color: String(form.color || '').trim() || null,
    meters,
    unit_cost: unitCost,
    remaining_meters: meters,
  }
}

export async function fetchFabricReceipts() {
  const res = await api.get('/store/fabric-receipts')
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load fabric receipts')
  return (res.data.data || []).map(mapFabricFromApi)
}

export async function fetchFabricReceipt(id) {
  const res = await api.get(`/store/fabric-receipts/${id}`)
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load fabric receipt')
  return mapFabricFromApi(res.data.data)
}

export async function createFabricReceipt(form) {
  const res = await api.post('/store/fabric-receipts', mapFabricToApi(form))
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to save fabric')
  return res.data
}

export async function updateFabricReceipt(id, form) {
  const res = await api.patch(`/store/fabric-receipts/${id}`, mapFabricToApi(form))
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to update fabric')
  return res.data
}

export async function deleteFabricReceipt(id) {
  const res = await api.delete(`/store/fabric-receipts/${id}`)
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to delete fabric')
  return res.data
}
