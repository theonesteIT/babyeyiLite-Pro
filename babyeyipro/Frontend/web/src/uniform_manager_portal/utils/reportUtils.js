export const DEFAULT_MIN_STOCK = 20

export function fmtMoney(n) {
  return `RWF ${(Number(n) || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}

export function fmtNum(n) {
  return (Number(n) || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })
}

export function fmtDate(d) {
  if (!d) return '—'
  const s = String(d).slice(0, 10)
  const [y, m, day] = s.split('-')
  if (!y || !m || !day) return s
  return `${day}/${m}/${y}`
}

export function itemCode(id, prefix = 'UNI') {
  const n = Number(id) || 0
  return `${prefix}${String(n).padStart(3, '0')}`
}

export function grnCode(id) {
  return `GRN-${String(Number(id) || 0).padStart(3, '0')}`
}

export function inDateRange(dateStr, from, to) {
  if (!dateStr) return true
  const d = String(dateStr).slice(0, 10)
  if (from && d < from) return false
  if (to && d > to) return false
  return true
}

/** Match 2025/2026 and 2025-2026 as the same academic year. */
export function normalizeAcademicYear(value) {
  return String(value || '').trim().replace(/\//g, '-')
}

export function stockStatusMeta(stock, minStock = DEFAULT_MIN_STOCK) {
  const s = Number(stock) || 0
  const min = Number(minStock) || DEFAULT_MIN_STOCK
  if (s <= 0) return { label: 'Out of Stock', emoji: '⚫', tone: 'out', className: 'bg-gray-100 text-gray-700' }
  if (s < min) return { label: 'Low Stock', emoji: '🔴', tone: 'low', className: 'bg-red-50 text-red-700' }
  if (s < min * 2) return { label: 'Low', emoji: '🟠', tone: 'warn', className: 'bg-amber-50 text-amber-700' }
  return { label: 'In Stock', emoji: '🟢', tone: 'ok', className: 'bg-emerald-50 text-emerald-700' }
}

export function urgencyMeta(needed) {
  const n = Number(needed) || 0
  if (n >= 15) return { label: 'Urgent', emoji: '🔴', className: 'bg-red-50 text-red-700' }
  if (n >= 5) return { label: 'Low', emoji: '🟠', className: 'bg-amber-50 text-amber-700' }
  return { label: 'Watch', emoji: '🟡', className: 'bg-yellow-50 text-yellow-800' }
}

export function monthKey(dateStr) {
  const s = String(dateStr || '').slice(0, 7)
  return s || 'Unknown'
}

export function monthLabel(key) {
  if (!key || key === 'Unknown') return 'Unknown'
  const [y, m] = key.split('-')
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const mi = Number(m) - 1
  return mi >= 0 && mi < 12 ? `${names[mi]} ${y}` : key
}

export function uniqueValues(rows, key) {
  return [...new Set(rows.map((r) => r[key]).filter(Boolean))].sort()
}

export function filterRows(rows, filters, searchKeys = []) {
  const q = String(filters.search || '').trim().toLowerCase()
  return rows.filter((row) => {
    if (filters.category && row.category && row.category !== filters.category) return false
    if (filters.uniformType) {
      const name = row.item || row.uniform_name || ''
      if (name && name !== filters.uniformType) return false
    }
    if (filters.size && row.size && row.size !== filters.size) return false
    if (filters.color && row.color && row.color !== filters.color) return false
    if (filters.supplier && row.supplier && row.supplier !== filters.supplier) return false
    if (filters.className && row.class_name && row.class_name !== filters.className) return false
    if (filters.profitStatus && row.result && row.result !== filters.profitStatus) return false
    if (filters.status) {
      const st = row.statusLabel || row.status || ''
      if (filters.status === 'low' && !/low|urgent|critical/i.test(st)) return false
      if (filters.status === 'available' && /low|urgent|critical|out/i.test(st)) return false
      if (filters.status === 'out' && !/out/i.test(st)) return false
    }
    if (q && searchKeys.length) {
      const hay = searchKeys.map((k) => String(row[k] ?? '')).join(' ').toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })
}

function localDateStr(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function defaultDateRange() {
  const now = new Date()
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const start = new Date(now.getFullYear(), now.getMonth() - 5, 1)
  return {
    from: localDateStr(start),
    to: localDateStr(end),
  }
}

export function monthBounds(year, month) {
  const y = Number(year)
  const m = Number(month)
  const from = `${y}-${String(m).padStart(2, '0')}-01`
  const lastDay = new Date(y, m, 0).getDate()
  const to = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  const names = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  return { from, to, label: `${names[m - 1] || ''} ${y}` }
}
