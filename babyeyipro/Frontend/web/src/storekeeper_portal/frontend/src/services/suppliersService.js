import api from './api'

function formatDateLabel(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10)
  return d.toISOString().slice(0, 10)
}

/** API row → UI card */
export function mapSupplierFromApi(row) {
  return {
    id: row.id,
    name: row.name || '',
    contact: row.contact_person || '',
    phone: row.phone || '',
    email: row.email || '',
    tin: row.tin || '',
    website: row.website || '',
    address: row.address || '',
    items: row.categories || '',
    status: row.status === 'Inactive' ? 'Inactive' : 'Active',
    lastPurchase: formatDateLabel(row.last_purchase_date),
    last_purchase_date: row.last_purchase_date || '',
    note: row.note || '',
  }
}

/** UI form → API body */
export function mapSupplierToApi(form) {
  return {
    name: String(form.name || '').trim(),
    contact_person: String(form.contact || '').trim() || null,
    phone: String(form.phone || '').trim() || null,
    email: String(form.email || '').trim() || null,
    tin: String(form.tin || '').trim() || null,
    website: String(form.website || '').trim() || null,
    address: String(form.address || '').trim() || null,
    categories: null,
    status: form.status === 'Inactive' ? 'Inactive' : 'Active',
    last_purchase_date: null,
    note: String(form.note || '').trim() || null,
  }
}

export const EMPTY_SUPPLIER_FORM = {
  name: '',
  contact: '',
  phone: '',
  email: '',
  tin: '',
  website: '',
  address: '',
  status: 'Active',
  note: '',
}

export async function fetchSuppliers() {
  const res = await api.get('/store/suppliers')
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load suppliers')
  return (res.data.data || []).map(mapSupplierFromApi)
}

export async function createSupplier(form) {
  const res = await api.post('/store/suppliers', mapSupplierToApi(form))
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to create supplier')
  return res.data
}

export async function updateSupplier(id, form) {
  const res = await api.patch(`/store/suppliers/${id}`, mapSupplierToApi(form))
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to update supplier')
  return res.data
}

export async function deleteSupplier(id) {
  const res = await api.delete(`/store/suppliers/${id}`)
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to delete supplier')
  return res.data
}
