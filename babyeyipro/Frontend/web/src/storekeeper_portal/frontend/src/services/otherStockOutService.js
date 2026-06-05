import api from './api'

export const OTHER_ISSUED_TO = [
  'Administration',
  'Science Department',
  'Sports',
  'Library',
  'ICT Lab',
  'Maintenance',
  'Events',
  'Other',
]

export const EMPTY_OTHER_ISSUE_FORM = {
  academic_year: '',
  term: '',
  other_stock_in_id: '',
  issue_date: '',
  quantity: '',
  unit_type: '',
  issued_to: '',
  issued_other: '',
  note: '',
}

export function mapOtherStockOutFromApi(row) {
  return {
    id: row.id,
    other_stock_in_id: row.other_stock_in_id,
    item_name: row.item_name || '',
    category: row.category || '',
    supplier_name: row.supplier_name || '',
    academic_year: row.academic_year || '',
    term: row.term || '',
    issue_date: row.issue_date ? String(row.issue_date).slice(0, 10) : '',
    quantity: Number(row.quantity || 0),
    unit_type: row.unit_type || 'pcs',
    issued_to: row.issued_to || '',
    issued_other: row.issued_other || '',
    note: row.note || '',
    remaining_after: Number(row.remaining_after ?? 0),
  }
}

export function mapOtherStockOutToApi(form) {
  return {
    academic_year: String(form.academic_year || '').trim() || null,
    term: String(form.term || '').trim() || null,
    other_stock_in_id: Number(form.other_stock_in_id) || null,
    issue_date: form.issue_date || null,
    quantity: Number(form.quantity) || 0,
    unit_type: String(form.unit_type || '').trim() || null,
    issued_to: String(form.issued_to || '').trim(),
    issued_other:
      form.issued_to === 'Other' ? String(form.issued_other || '').trim() || null : null,
    note: String(form.note || '').trim() || null,
  }
}

export function otherStockOutToFormFields(row) {
  const isPreset = OTHER_ISSUED_TO.includes(row.issued_to)
  let issued_to = row.issued_to || ''
  let issued_other = row.issued_other || ''
  if (!isPreset && issued_to) {
    issued_other = issued_to
    issued_to = 'Other'
  }
  return {
    academic_year: row.academic_year || '',
    term: row.term || '',
    other_stock_in_id: row.other_stock_in_id ? String(row.other_stock_in_id) : '',
    issue_date: row.issue_date || '',
    quantity: String(row.quantity ?? ''),
    unit_type: row.unit_type || '',
    issued_to,
    issued_other,
    note: row.note || '',
  }
}

export async function fetchOtherStockOuts(filters = {}) {
  const params = {}
  if (filters.academic_year) params.academic_year = filters.academic_year
  if (filters.term) params.term = filters.term
  if (filters.from_date) params.from_date = filters.from_date
  if (filters.to_date) params.to_date = filters.to_date
  const res = await api.get('/store/other-stock-outs', { params })
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load stock outs')
  return (res.data.data || []).map(mapOtherStockOutFromApi)
}

export async function createOtherStockOut(payload) {
  const res = await api.post('/store/other-stock-outs', payload)
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to record issue')
  return res.data
}

export async function updateOtherStockOut(id, payload) {
  const res = await api.patch(`/store/other-stock-outs/${id}`, payload)
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to update issue')
  return res.data
}

export async function deleteOtherStockOut(id) {
  const res = await api.delete(`/store/other-stock-outs/${id}`)
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to delete issue')
  return res.data
}
