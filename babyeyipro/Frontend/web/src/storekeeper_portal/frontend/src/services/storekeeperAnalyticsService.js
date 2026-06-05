import { fetchInventory } from './inventoryService'
import { fetchMovements } from './movementsService'
import { fetchFinishedGoods } from './finishedGoodsService'
import { fetchFoodStockIns } from './foodStockService'
import { fetchFoodConsumptions } from './foodConsumptionService'
import { fetchOtherStockIns } from './otherStockService'
import { fetchOtherStockOuts } from './otherStockOutService'
import { fetchStockAdjustments } from './stockAdjustmentService'
import { fetchFoodAlerts } from './foodAlertService'
import { fetchSuppliers } from './suppliersService'
import { fetchUniformIssueAnalytics } from './uniformIssueService'
import { aggregateFoodLevels } from './foodStockService'
import { aggregateOtherLevels } from './otherStockService'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function monthKey(d) {
  if (!d) return ''
  return String(d).slice(0, 7)
}

function buildMonthlySeries(rows, dateField, valueFn) {
  const map = new Map()
  for (const r of rows) {
    const k = monthKey(r[dateField])
    if (!k) continue
    map.set(k, (map.get(k) || 0) + valueFn(r))
  }
  const keys = [...map.keys()].sort()
  const last6 = keys.slice(-6)
  return last6.map((k) => {
    const m = Number(k.slice(5, 7)) - 1
    return { month: MONTHS[m] || k, key: k, value: map.get(k) || 0 }
  })
}

export async function loadStorekeeperAnalytics(filters = {}) {
  const [
    inventoryRes,
    movementsRes,
    finishedGoodsRes,
    foodStock,
    foodCons,
    otherStock,
    otherOut,
    adjustmentsRes,
    foodAlertsRes,
    suppliers,
    uniformAnalytics,
  ] = await Promise.all([
    fetchInventory(filters).catch(() => ({ data: [] })),
    fetchMovements({ limit: 500, ...filters }).catch(() => ({ data: [] })),
    fetchFinishedGoods().catch(() => ({ data: [] })),
    fetchFoodStockIns(filters).catch(() => []),
    fetchFoodConsumptions(filters).catch(() => []),
    fetchOtherStockIns(filters).catch(() => []),
    fetchOtherStockOuts(filters).catch(() => []),
    fetchStockAdjustments(filters).catch(() => ({ rows: [] })),
    fetchFoodAlerts().catch(() => ({ alerts: [] })),
    fetchSuppliers().catch(() => []),
    fetchUniformIssueAnalytics(filters).catch(() => null),
  ])

  const inventory = inventoryRes.data || []
  const movements = movementsRes.data || []
  const finishedGoods = finishedGoodsRes.data || []
  const adjustments = adjustmentsRes.rows || []

  const foodLevels = aggregateFoodLevels(foodStock)
  const otherLevels = aggregateOtherLevels(otherStock)

  const foodStockValue = foodStock.reduce((s, r) => s + (Number(r.total_cost) || 0), 0)
  const foodRemaining = foodStock.reduce((s, r) => s + Number(r.remaining_quantity || 0), 0)
  const foodConsumed = foodCons.reduce((s, c) => s + Number(c.quantity || 0), 0)

  const otherStockValue = otherStock.reduce((s, r) => s + (Number(r.total_cost) || 0), 0)
  const otherRemaining = otherStock.reduce((s, r) => s + Number(r.remaining_quantity || 0), 0)
  const otherIssued = otherOut.reduce((s, c) => s + Number(c.quantity || 0), 0)

  const invValue = inventory.reduce((s, i) => s + Number(i.quantity || 0) * (Number(i.unit_cost) || 0), 0)
  const invLow = inventory.filter((i) => i.reorder_level > 0 && i.quantity > 0 && i.quantity < i.reorder_level).length
  const invOut = inventory.filter((i) => i.reorder_level > 0 && i.quantity <= 0).length

  const foodLow = foodLevels.filter((l) => l.status !== 'Normal').length
  const otherLow = otherLevels.filter((l) => l.status !== 'Normal').length

  const stockInMonthly = buildMonthlySeries(
    [
      ...foodStock.map((r) => ({ d: r.receive_date, v: Number(r.quantity || 0) })),
      ...otherStock.map((r) => ({ d: r.receive_date, v: Number(r.quantity || 0) })),
      ...movements.filter((m) => m.type === 'stock_in').map((m) => ({ d: m.movement_date, v: Number(m.quantity || 0) })),
    ],
    'd',
    (r) => r.v
  )

  const stockOutMonthly = buildMonthlySeries(
    [
      ...foodCons.map((r) => ({ d: r.consumption_date, v: Number(r.quantity || 0) })),
      ...otherOut.map((r) => ({ d: r.issue_date, v: Number(r.quantity || 0) })),
      ...movements.filter((m) => m.type === 'stock_out').map((m) => ({ d: m.movement_date, v: Number(m.quantity || 0) })),
    ],
    'd',
    (r) => r.v
  )

  const monthlyMovementChart = stockInMonthly.map((row, i) => ({
    month: row.month,
    in: row.value,
    out: stockOutMonthly[i]?.value ?? 0,
  }))

  const purchaseMonthly = buildMonthlySeries(
    [...foodStock, ...otherStock].map((r) => ({
      d: r.receive_date,
      v: Number(r.total_cost) || 0,
    })),
    'd',
    (r) => r.v
  )

  const foodByItem = {}
  for (const r of foodStock) {
    const k = r.item_name
    if (!foodByItem[k]) foodByItem[k] = { name: k, stock: 0, consumed: 0, unit: r.unit_type }
    foodByItem[k].stock += Number(r.remaining_quantity || 0)
  }
  for (const c of foodCons) {
    const k = c.item_name
    if (!foodByItem[k]) foodByItem[k] = { name: k, stock: 0, consumed: 0, unit: c.unit_type }
    foodByItem[k].consumed += Number(c.quantity || 0)
  }

  const otherByCategory = {}
  for (const r of otherStock) {
    const c = r.category || 'Other'
    if (!otherByCategory[c]) otherByCategory[c] = { name: c, items: 0, remaining: 0, value: 0 }
    otherByCategory[c].items += 1
    otherByCategory[c].remaining += Number(r.remaining_quantity || 0)
    otherByCategory[c].value += Number(r.total_cost || 0)
  }

  const adjByReason = {}
  for (const a of adjustments) {
    const r = a.reason || 'Other'
    adjByReason[r] = (adjByReason[r] || 0) + Number(a.quantity || 0)
  }

  const categoryPie = [
    { name: 'Food', value: foodRemaining },
    { name: 'Other supplies', value: otherRemaining },
    { name: 'General inventory', value: inventory.reduce((s, i) => s + Number(i.quantity || 0), 0) },
  ].filter((x) => x.value > 0)

  return {
    inventory,
    movements,
    finishedGoods,
    foodStock,
    foodCons,
    otherStock,
    otherOut,
    adjustments,
    foodAlerts: foodAlertsRes.alerts || [],
    suppliers,
    uniformAnalytics,
    foodLevels,
    otherLevels,
    summary: {
      totalStockValue: invValue + foodStockValue + otherStockValue,
      foodRemaining,
      foodConsumed,
      otherRemaining,
      otherIssued,
      invLow,
      invOut,
      foodLow,
      otherLow,
      adjustmentCount: adjustments.length,
      supplierCount: suppliers.length,
      foodAlertCount: (foodAlertsRes.alerts || []).length,
      uniformIssueCount: uniformAnalytics?.issue_student_slots ?? uniformAnalytics?.total_issues ?? uniformAnalytics?.issues_count ?? 0,
    },
    charts: {
      monthlyMovementChart,
      purchaseMonthly,
      categoryPie,
      foodByItem: Object.values(foodByItem),
      otherByCategory: Object.values(otherByCategory),
      adjByReason: Object.entries(adjByReason).map(([reason, qty]) => ({ reason, qty })),
      stockHealth: [
        { name: 'Healthy', value: foodLevels.filter((l) => l.status === 'Normal').length + otherLevels.filter((l) => l.status === 'Normal').length + inventory.filter((i) => !i.reorder_level || i.quantity >= i.reorder_level).length },
        { name: 'Low', value: foodLow + otherLow + invLow },
        { name: 'Out', value: foodLevels.filter((l) => l.status === 'Out of Stock').length + otherLevels.filter((l) => l.status === 'Out of Stock').length + invOut },
      ].filter((d) => d.value > 0),
    },
  }
}
