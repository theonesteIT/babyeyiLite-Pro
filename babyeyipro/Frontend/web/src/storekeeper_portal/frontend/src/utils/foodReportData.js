/** Build food report aggregates from API stock + consumption rows. */

export function buildFoodItemSummary(stockRows = [], consumptions = []) {
  const map = new Map()

  for (const row of stockRows) {
    const key = `${row.item_name}::${row.unit_type}`
    const cur = map.get(key) || {
      name: row.item_name,
      unit: row.unit_type,
      received: 0,
      remaining: 0,
      consumed: 0,
      unitCostTotal: 0,
      unitCostWeight: 0,
    }
    cur.received += Number(row.quantity) || 0
    cur.remaining += Number(row.remaining_quantity) || 0
    const uc = Number(row.unit_cost)
    if (uc > 0) {
      cur.unitCostTotal += uc * (Number(row.quantity) || 0)
      cur.unitCostWeight += Number(row.quantity) || 0
    }
    map.set(key, cur)
  }

  for (const c of consumptions) {
    const key = `${c.item_name}::${c.unit_type}`
    const cur = map.get(key) || {
      name: c.item_name,
      unit: c.unit_type,
      received: 0,
      remaining: 0,
      consumed: 0,
      unitCostTotal: 0,
      unitCostWeight: 0,
    }
    cur.consumed += Number(c.quantity) || 0
    map.set(key, cur)
  }

  return [...map.values()]
    .map((r) => {
      const unitCost = r.unitCostWeight > 0 ? r.unitCostTotal / r.unitCostWeight : 0
      const consumed = r.consumed > 0 ? r.consumed : Math.max(0, r.received - r.remaining)
      const pctRemaining = r.received > 0 ? Math.round((r.remaining / r.received) * 100) : 0
      const pctUsed = r.received > 0 ? Math.round((consumed / r.received) * 100) : 0
      let status = 'normal'
      if (r.remaining <= 0) status = 'out'
      else if (pctRemaining <= 20) status = 'low'
      return {
        ...r,
        consumed,
        unitCost,
        stockValue: r.remaining * unitCost,
        consumptionCost: consumed * unitCost,
        pctRemaining,
        pctUsed,
        status,
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function buildMonthlyPurchaseTotals(stockRows = []) {
  const byMonth = new Map()
  for (const row of stockRows) {
    const d = row.receive_date ? String(row.receive_date).slice(0, 7) : ''
    if (!d) continue
    byMonth.set(d, (byMonth.get(d) || 0) + (Number(row.total_cost) || 0))
  }
  return [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, value]) => ({
      month,
      label: formatMonthLabel(month),
      value,
    }))
}

function formatMonthLabel(ym) {
  const [y, m] = ym.split('-').map(Number)
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${names[(m || 1) - 1]} ${String(y).slice(2)}`
}

export function buildAllocationSummary(consumptions = []) {
  const map = new Map()
  for (const c of consumptions) {
    const label = c.allocated_to || 'Unknown'
    const cur = map.get(label) || { label, quantity: 0, cost: 0, count: 0 }
    cur.quantity += Number(c.quantity) || 0
    cur.count += 1
    map.set(label, cur)
  }
  return [...map.values()].sort((a, b) => b.quantity - a.quantity)
}

export function buildDailyConsumptionSeries(consumptions = []) {
  const byDate = new Map()
  for (const c of consumptions) {
    const d = c.consumption_date ? String(c.consumption_date).slice(0, 10) : ''
    if (!d) continue
    byDate.set(d, (byDate.get(d) || 0) + (Number(c.quantity) || 0))
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-14)
    .map(([date, value]) => ({
      date,
      label: date.slice(5),
      value,
    }))
}

export function buildForecastRows(levels = [], items = []) {
  const byName = new Map(items.map((i) => [`${i.name}::${i.unit}`, i]))
  return levels.map((l) => {
    const key = `${l.item_name}::${l.unit_type}`
    const item = byName.get(key)
    const avgConsumed = item?.consumed > 0 ? item.consumed : 0
    const forecastNeed = Math.max(l.min_level || 0, Math.ceil(avgConsumed * 0.25))
    const toOrder = Math.max(0, forecastNeed - l.remaining)
    const unitCost = item?.unitCost || 0
    let priority = 'normal'
    if (l.status === 'Out of Stock' || l.remaining <= 0) priority = 'out'
    else if (l.status === 'Low Stock' || toOrder > 0) priority = 'low'
    return {
      item: l.item_name,
      unit: l.unit_type,
      current: l.remaining,
      forecast: forecastNeed,
      toOrder,
      estCost: toOrder * unitCost,
      priority,
      status: l.status,
    }
  })
}

export function sumTotals(items = [], stockRows = [], consumptions = []) {
  const totalReceived = items.reduce((s, i) => s + i.received, 0)
  const totalRemaining = items.reduce((s, i) => s + i.remaining, 0)
  const totalConsumed = items.reduce((s, i) => s + i.consumed, 0)
  const stockValue = items.reduce((s, i) => s + i.stockValue, 0)
  const consumptionCost = items.reduce((s, i) => s + i.consumptionCost, 0)
  const purchaseValue = stockRows.reduce((s, r) => s + (Number(r.total_cost) || 0), 0)
  const supplierIds = new Set(stockRows.map((r) => r.supplier_id).filter(Boolean))
  const days = new Set(consumptions.map((c) => c.consumption_date?.slice?.(0, 10)).filter(Boolean))
  const avgDaily =
    days.size > 0 ? totalConsumed / days.size : consumptions.length ? totalConsumed / consumptions.length : 0
  return {
    totalReceived,
    totalRemaining,
    totalConsumed,
    stockValue,
    consumptionCost,
    purchaseValue,
    supplierCount: supplierIds.size,
    receiptCount: stockRows.length,
    consumptionCount: consumptions.length,
    avgDaily,
    avgDailyCost: days.size > 0 ? consumptionCost / days.size : 0,
  }
}
