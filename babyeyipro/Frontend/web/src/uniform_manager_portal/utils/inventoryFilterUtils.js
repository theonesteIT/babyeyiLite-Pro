import { inDateRange } from './reportUtils'

function matchesSearch(row, q, keys) {
  if (!q) return true
  const hay = keys.map((k) => String(row[k] ?? '')).join(' ').toLowerCase()
  return hay.includes(q)
}

export function applyFabricReceiptFilters(rows, filters) {
  const q = String(filters.search || '').trim().toLowerCase()
  return (rows || []).filter((row) => {
    if (filters.uniformType && row.fabric_type !== filters.uniformType) return false
    if (filters.color && row.color !== filters.color) return false
    if (filters.supplier && row.supplier_name !== filters.supplier) return false
    if (filters.academicYear && row.academic_year !== filters.academicYear) return false
    if (filters.term && row.term !== filters.term) return false
    if (!inDateRange(row.purchase_date, filters.from, filters.to)) return false
    return matchesSearch(row, q, ['fabric_type', 'color', 'supplier_name', 'invoice_number'])
  })
}

export function applyFabricStockoutFilters(rows, filters) {
  const q = String(filters.search || '').trim().toLowerCase()
  return (rows || []).filter((row) => {
    if (filters.uniformType && row.fabric_type !== filters.uniformType) return false
    if (filters.color && row.color !== filters.color) return false
    if (!inDateRange(row.out_date, filters.from, filters.to)) return false
    return matchesSearch(row, q, ['fabric_type', 'color', 'purpose', 'notes'])
  })
}

export function applyFinishedGoodFilters(rows, filters) {
  const q = String(filters.search || '').trim().toLowerCase()
  return (rows || []).filter((row) => {
    if (filters.uniformType && row.uniform_name !== filters.uniformType) return false
    if (filters.size && row.size !== filters.size) return false
    if (filters.color && row.fabric_color !== filters.color) return false
    if (!inDateRange(row.created_at, filters.from, filters.to)) return false
    if (filters.status === 'low') {
      const stock = Number(row.remaining_stock ?? row.stock) || 0
      if (stock >= 50) return false
    }
    if (filters.status === 'out') {
      const stock = Number(row.remaining_stock ?? row.stock) || 0
      if (stock > 0) return false
    }
    if (filters.status === 'available') {
      const stock = Number(row.remaining_stock ?? row.stock) || 0
      if (stock <= 0) return false
    }
    return matchesSearch(row, q, ['uniform_name', 'size', 'fabric_type', 'fabric_color'])
  })
}

export function buildInventoryFilterOptions({
  fabrics = [],
  finishedGoods = [],
  suppliers = [],
  academicSettings = null,
} = {}) {
  return {
    uniformTypes: [
      ...new Set([
        ...fabrics.map((f) => f.fabric_type).filter(Boolean),
        ...finishedGoods.map((g) => g.uniform_name).filter(Boolean),
      ]),
    ].sort(),
    sizes: [...new Set(finishedGoods.map((g) => g.size).filter(Boolean))].sort(),
    colors: [
      ...new Set([
        ...fabrics.map((f) => f.color).filter(Boolean),
        ...finishedGoods.map((g) => g.fabric_color).filter(Boolean),
      ]),
    ].sort(),
    suppliers: [
      ...new Set([
        ...suppliers.map((s) => s.name || s.supplier_name).filter(Boolean),
        ...fabrics.map((f) => f.supplier_name).filter(Boolean),
      ]),
    ].sort(),
    classes: [],
    academicYears: academicSettings?.academicYears || [],
    terms: academicSettings?.activeTerms || ['Term 1', 'Term 2', 'Term 3'],
  }
}
