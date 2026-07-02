import api from './api'

export const UNIFORM_TYPE_GROUPS = [
  {
    label: 'Standard uniforms',
    items: ['T-Shirt', 'Shirt', 'Tie', 'Short', 'Trouser', 'Skirt', 'Sweater', 'Track Suit'],
  },
  {
    label: 'Uniform clothing',
    items: [
      'Uniform Clothing', 'Blazer', 'Jacket', 'Vest', 'Waistcoat', 'Dress', 'Pinafore',
      'Polo Shirt', 'Sports Jersey', 'Raincoat', 'Lab Coat', 'Apron', 'Overalls',
    ],
  },
  {
    label: 'Footwear',
    items: ['Shoes', 'Sports Shoes', 'Boots', 'Sandals', 'Socks', 'Stockings', 'Shoe Laces'],
  },
  {
    label: 'Accessories',
    items: [
      'Belt', 'Cap', 'Hat', 'Beret', 'Scarf', 'Uniform Scarf', 'Neckerchief', 'Bow Tie',
      'Badge', 'Name Tag', 'ID Card', 'ID Card Holder', 'Epaulette', 'Gloves',
    ],
  },
  {
    label: 'Sports uniform items',
    items: ['Tracksuit Jacket', 'Tracksuit Pants', 'Sports Shorts', 'Sports Socks', 'Training Bib'],
  },
]

export const UNIFORM_TYPES = [
  ...new Set([...UNIFORM_TYPE_GROUPS.flatMap((g) => g.items), 'Other']),
]

const PRESET_UNIFORM_NAMES = UNIFORM_TYPES.filter((t) => t !== 'Other')

export const PRESET_SIZES = [
  'XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL',
  '4', '6', '8', '10', '12', '14', '16', '18', 'One',
]

export const UNIFORM_SIZES = [...PRESET_SIZES, 'Other']

export const EMPTY_FINISHED_FORM = {
  fabric_receipt_id: '',
  uniform_name: '',
  uniform_name_other: '',
  selected_sizes: ['M'],
  size_other: '',
  size: 'M',
  stock: '',
  purchase_cost: '',
  selling_price: '',
  academic_year: '',
  term: '',
  note: '',
}

export function resolveUniformNameFromForm(form) {
  if (form.uniform_name === 'Other') {
    return String(form.uniform_name_other || '').trim()
  }
  return String(form.uniform_name || '').trim()
}

export function uniformNameToFormFields(storedName) {
  const name = String(storedName || '').trim()
  if (!name) return { uniform_name: '', uniform_name_other: '' }
  if (PRESET_UNIFORM_NAMES.includes(name)) {
    return { uniform_name: name, uniform_name_other: '' }
  }
  return { uniform_name: 'Other', uniform_name_other: name }
}

export function resolveSizesFromForm(form, { single = false } = {}) {
  if (single) {
    if (form.size === 'Other' || form.selected_sizes?.includes?.('Other')) {
      const custom = String(form.size_other || '').trim()
      return custom ? [custom] : []
    }
    const one = String(form.size || form.selected_sizes?.[0] || '').trim()
    return one && one !== 'Other' ? [one] : []
  }
  const selected = Array.isArray(form.selected_sizes) ? form.selected_sizes : []
  const resolved = []
  for (const s of selected) {
    if (s === 'Other') {
      const custom = String(form.size_other || '').trim()
      if (custom) resolved.push(custom)
    } else if (s) {
      resolved.push(s)
    }
  }
  return [...new Set(resolved)]
}

export function sizeToFormFields(storedSize) {
  const size = String(storedSize || '').trim() || 'M'
  if (PRESET_SIZES.includes(size)) {
    return { selected_sizes: [size], size_other: '', size }
  }
  return { selected_sizes: ['Other'], size_other: size, size: 'Other' }
}

export function mapFinishedFromApi(row) {
  const stock = Number(row.remaining_stock ?? row.stock ?? 0)
  const soldQty = Number(row.sold_qty ?? row.used_stock ?? 0)
  const openingStock = Number(row.opening_stock ?? stock + soldQty)
  const sellingPrice = Number(row.selling_cost ?? row.selling_price ?? 0)
  const purchaseCost = Number(row.purchase_cost ?? row.avg_cost ?? 0)
  return {
    id: row.id,
    fabric_receipt_id: row.fabric_receipt_id || '',
    sheet_label: row.sheet_label || '',
    fabric_type: row.fabric_type || '',
    fabric_color: row.fabric_color || '',
    uniform_name: row.uniform_name || '',
    size: row.size || 'One',
    stock,
    opening_stock: openingStock,
    used_stock: soldQty,
    remaining_stock: stock,
    sold_qty: soldQty,
    purchase_cost: purchaseCost,
    selling_price: sellingPrice,
    selling_cost: sellingPrice,
    total_purchase_cost: Number(row.total_purchase_cost ?? openingStock * purchaseCost),
    total_estimated_cost: Number(row.total_estimated_cost ?? stock * sellingPrice),
    total_sold_cost: Number(row.total_sold_cost ?? 0),
    value: Number(row.value) || stock * sellingPrice,
    purchase_value: stock * purchaseCost,
    academic_year: row.academic_year || '',
    term: row.term || '',
    note: row.note || '',
    created_at: row.created_at || '',
  }
}

export function formatAmount(n) {
  return (Number(n) || 0).toLocaleString()
}

export function mapFinishedToApi(form) {
  const purchaseRaw = form.purchase_cost ?? form.avg_cost
  const uniformName = resolveUniformNameFromForm(form)
  const sizes = resolveSizesFromForm(form, { single: true })
  const size = sizes[0] || String(form.size || '').trim() || 'One'
  return {
    fabric_receipt_id: form.fabric_receipt_id ? Number(form.fabric_receipt_id) : null,
    uniform_name: uniformName,
    size,
    stock: Number(form.stock) || 0,
    avg_cost: purchaseRaw === '' || purchaseRaw == null ? null : Number(purchaseRaw),
    selling_price: form.selling_price === '' ? null : Number(form.selling_price),
    academic_year: String(form.academic_year || '').trim() || null,
    term: String(form.term || '').trim() || null,
    note: String(form.note || '').trim() || null,
  }
}

export function stockStatus(stock) {
  const s = Number(stock) || 0
  if (s >= 100) return { label: 'In Stock', className: 'bg-green-50 text-green-600' }
  if (s >= 50) return { label: 'Low', className: 'bg-amber-50 text-amber-600' }
  return { label: 'Critical', className: 'bg-red-50 text-red-600' }
}

export async function fetchFinishedGoods() {
  const res = await api.get('/store/finished-goods')
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load finished goods')
  return (res.data.data || []).map(mapFinishedFromApi)
}

export async function createFinishedGood(form) {
  const res = await api.post('/store/finished-goods', mapFinishedToApi(form))
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to save')
  return res.data
}

export async function createFinishedGoodsBatch(baseForm, sizes) {
  const results = []
  for (const size of sizes) {
    const res = await createFinishedGood({ ...baseForm, size, selected_sizes: [size] })
    results.push(res)
  }
  return results
}

export async function updateFinishedGood(id, form) {
  const res = await api.patch(`/store/finished-goods/${id}`, mapFinishedToApi(form))
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to update')
  return res.data
}

export async function deleteFinishedGood(id) {
  const res = await api.delete(`/store/finished-goods/${id}`)
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to delete')
  return res.data
}
