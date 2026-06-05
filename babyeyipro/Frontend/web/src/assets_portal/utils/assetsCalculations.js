/** Excel-style depreciation — TOTAL BALANCE base for annual charge */

export function parseNum(v) {
  const n = Number(String(v ?? '').replace(/,/g, ''))
  return Number.isFinite(n) ? n : 0
}

/** TOTAL BALANCE = purchase unit price + opening amount (Excel register) */
export function computeTotalBalance({ unitPrice, openingAmount }) {
  return parseNum(unitPrice) + parseNum(openingAmount)
}

export function computeDepreciation({
  totalBalance,
  depRatePercent,
  accumulatedDepreciation = 0,
}) {
  const balance = parseNum(totalBalance)
  const accumulated = parseNum(accumulatedDepreciation)
  const ratePct = parseNum(depRatePercent)
  const decimalDep = ratePct > 0 ? ratePct / 100 : 0
  const annualDep = balance * decimalDep
  const totalDep = accumulated + annualDep
  const netBookValue = Math.max(0, balance - totalDep)

  return {
    decimalDep,
    annualDep,
    totalDep,
    netBookValue,
    totalBalance: balance,
    accumulatedDepreciation: accumulated,
  }
}

export function formatRwf(amount) {
  const n = Math.round(parseNum(amount))
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

/** Normalize location from string, JSON string, or `{ location: "..." }` objects */
export function formatLocationValue(loc) {
  if (loc == null || loc === '') return ''
  if (typeof loc === 'string') {
    const s = loc.trim()
    if (s.startsWith('{') || s.startsWith('[')) {
      try {
        const parsed = JSON.parse(s)
        return formatLocationValue(parsed)
      } catch {
        return s
      }
    }
    return s
  }
  if (typeof loc === 'object') {
    if (typeof loc.location === 'string') return loc.location.trim()
    if (typeof loc.label === 'string') return loc.label.trim()
    if (typeof loc.name === 'string') return loc.name.trim()
    const first = Object.values(loc).find((v) => typeof v === 'string' && v.trim())
    return first ? String(first).trim() : ''
  }
  return String(loc).trim()
}

export function groupAssetsByType(assets = []) {
  const order = []
  const map = new Map()
  assets.forEach((a) => {
    const type = a.asset_type || a.type || 'UNCATEGORIZED'
    if (!map.has(type)) {
      map.set(type, [])
      order.push(type)
    }
    map.get(type).push(a)
  })
  return order.map((type) => ({ type, rows: map.get(type) }))
}
