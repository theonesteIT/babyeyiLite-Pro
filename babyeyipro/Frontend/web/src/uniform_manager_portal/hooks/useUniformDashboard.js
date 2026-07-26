import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchFabricReceipts } from '../../storekeeper_portal/frontend/src/services/fabricReceiptsService'
import { fetchFabricStockouts } from '../../storekeeper_portal/frontend/src/services/fabricStockoutsService'
import { fetchFinishedGoods } from '../../storekeeper_portal/frontend/src/services/finishedGoodsService'
import {
  fetchUniformIssues,
  fetchUniformIssueAnalytics,
  fetchUniformIssueReportLines,
  fetchUniformProfitCalculation,
} from '../../storekeeper_portal/frontend/src/services/uniformIssueService'
import { fetchSuppliers } from '../../storekeeper_portal/frontend/src/services/suppliersService'
import { fetchStoreAcademicSettings } from '../../storekeeper_portal/frontend/src/services/academicSettingsService'

const MIN_STOCK = 50

function localDateStr(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function monthStart(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

function monthKey(dateStr) {
  return String(dateStr || '').slice(0, 7)
}

function monthLabel(key) {
  if (!key) return '—'
  const [y, m] = key.split('-')
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const mi = Number(m) - 1
  return mi >= 0 && mi < 12 ? `${names[mi]} ${y}` : key
}

function lastNMonthKeys(n = 6) {
  const keys = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i -= 1) {
    const dt = new Date(now.getFullYear(), now.getMonth() - i, 1)
    keys.push(`${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`)
  }
  return keys
}

function isToday(dateStr) {
  return String(dateStr || '').slice(0, 10) === localDateStr()
}

function isThisMonth(dateStr) {
  return monthKey(dateStr) === localDateStr().slice(0, 7)
}

function lineDate(line) {
  return String(line.issue_date || line.issue_created_at || '').slice(0, 10)
}

function buildCostMap(goods) {
  const map = new Map()
  for (const g of goods || []) {
    map.set(Number(g.id), Number(g.purchase_cost) || 0)
  }
  return map
}

function aggregateBestSelling(lines, analyticsTop = []) {
  if (analyticsTop?.length) {
    return analyticsTop.slice(0, 5).map((t, i) => ({
      rank: i + 1,
      name: t.item_name || 'Uniform',
      sold: Number(t.pieces) || 0,
      revenue: Number(t.revenue) || 0,
    }))
  }
  const itemMap = new Map()
  for (const line of lines || []) {
    const name = line.item_name || 'Uniform'
    const cur = itemMap.get(name) || { pieces: 0, revenue: 0 }
    cur.pieces += Number(line.quantity) || 0
    cur.revenue += Number(line.amount) || 0
    itemMap.set(name, cur)
  }
  return [...itemMap.entries()]
    .map(([name, stats]) => ({ name, ...stats }))
    .sort((a, b) => b.pieces - a.pieces)
    .slice(0, 5)
    .map((row, i) => ({ rank: i + 1, name: row.name, sold: row.pieces, revenue: row.revenue }))
}

function computeProfitFromLines(lines, costMap) {
  let revenue = 0
  let cost = 0
  for (const line of lines || []) {
    revenue += Number(line.amount) || 0
    const unitCost = costMap.get(Number(line.finished_good_id)) || 0
    cost += (Number(line.quantity) || 0) * unitCost
  }
  return { revenue, cost, profit: revenue - cost }
}

export function useUniformDashboard() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [finishedGoods, setFinishedGoods] = useState([])
  const [fabrics, setFabrics] = useState([])
  const [stockouts, setStockouts] = useState([])
  const [issues, setIssues] = useState([])
  const [issueLines, setIssueLines] = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [profit, setProfit] = useState(null)
  const [suppliers, setSuppliers] = useState([])
  const [academic, setAcademic] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    const today = localDateStr()
    const monthFrom = monthStart()
    try {
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5)
      sixMonthsAgo.setDate(1)
      const fromDate = localDateStr(sixMonthsAgo)
      const rangeParams = { from_date: fromDate, to_date: today }

      const [
        goods,
        fabricRows,
        outRows,
        issueRows,
        linesRange,
        analyticsData,
        profitData,
        supplierRows,
        settings,
      ] = await Promise.all([
        fetchFinishedGoods(),
        fetchFabricReceipts(),
        fetchFabricStockouts(),
        fetchUniformIssues(),
        fetchUniformIssueReportLines(rangeParams).catch(() => []),
        fetchUniformIssueAnalytics(rangeParams).catch(() => null),
        fetchUniformProfitCalculation(rangeParams).catch(() => null),
        fetchSuppliers().catch(() => []),
        fetchStoreAcademicSettings().catch(() => null),
      ])

      let lines = linesRange || []
      if (!lines.length) {
        lines = await fetchUniformIssueReportLines({}).catch(() => [])
      }

      setFinishedGoods(goods || [])
      setFabrics(fabricRows || [])
      setStockouts(outRows || [])
      setIssues(issueRows || [])
      setIssueLines(lines)
      setAnalytics(analyticsData)
      setProfit(profitData)
      setSuppliers(supplierRows || [])
      setAcademic(settings)
    } catch (e) {
      setError(e.message || 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const costMap = useMemo(() => buildCostMap(finishedGoods), [finishedGoods])

  const metrics = useMemo(() => {
    const uniformTypes = new Set(finishedGoods.map((g) => g.uniform_name).filter(Boolean))
    const currentStock = finishedGoods.reduce((s, g) => s + Number(g.stock || 0), 0)
    const inventoryValue = finishedGoods.reduce((s, g) => s + Number(g.value || 0), 0)
    const fabricMeters = fabrics.reduce((s, f) => s + Number(f.remaining_meters || 0), 0)

    const todayFabricIn = fabrics.filter((f) => isToday(f.purchase_date))
    const todayStockInQty = todayFabricIn.reduce((s, f) => s + Number(f.meters || 0), 0)
      + finishedGoods.filter((g) => isToday(g.created_at)).reduce((s, g) => s + Number(g.stock || 0), 0)

    const todayStockOutMeters = stockouts.filter((s) => isToday(s.out_date)).reduce((s, o) => s + Number(o.meters_out || 0), 0)
    const todayIssueLines = issueLines.filter((l) => isToday(lineDate(l)))
    const todayIssuedQty = todayIssueLines.reduce((s, l) => s + Number(l.quantity || 0), 0)
    const todaySales = todayIssueLines.reduce((s, l) => s + Number(l.amount || 0), 0)

    const monthLines = issueLines.filter((l) => isThisMonth(lineDate(l)))
    const monthCalc = computeProfitFromLines(monthLines, costMap)
    const monthlyRevenue = Number(analytics?.total_sales) || monthCalc.revenue
      || monthLines.reduce((s, l) => s + Number(l.amount || 0), 0)

    const apiProfit = Number(profit?.summary?.total_profit_loss ?? profit?.summary?.total_profit)
    const monthlyProfit = Number.isFinite(apiProfit) && apiProfit !== 0
      ? apiProfit
      : computeProfitFromLines(issueLines.filter((l) => isThisMonth(lineDate(l))), costMap).profit
    const monthlyLoss = monthlyProfit < 0 ? Math.abs(monthlyProfit) : 0

    const lowStockItems = finishedGoods.filter((g) => {
      const stock = Number(g.remaining_stock ?? g.stock) || 0
      return stock > 0 && stock < MIN_STOCK
    })
    const outOfStockItems = finishedGoods.filter((g) => (Number(g.remaining_stock ?? g.stock) || 0) <= 0)
    const studentsServed = Number(analytics?.students_served)
      || new Set(issueLines.map((l) => l.student_id || l.student_uid).filter(Boolean)).size

    const todayFabricCost = todayFabricIn.reduce((s, f) => s + Number(f.total_cost || 0), 0)
    const todayLineProfit = computeProfitFromLines(todayIssueLines, costMap)
    const todayProfit = todayLineProfit.profit

    return {
      uniformTypes: uniformTypes.size,
      currentStock,
      fabricMeters,
      inventoryValue,
      todayStockInQty,
      todayStockOutQty: todayIssuedQty,
      todayFabricOutMeters: todayStockOutMeters,
      todaySales,
      todayProfit,
      todayExpenses: todayFabricCost + todayLineProfit.cost,
      monthlyRevenue,
      monthlyProfit,
      monthlyLoss,
      lowStockCount: lowStockItems.length,
      outOfStockCount: outOfStockItems.length,
      supplierCount: suppliers.length,
      studentsServed,
      issueCount: issues.length,
      lowStockItems,
      outOfStockItems,
    }
  }, [finishedGoods, fabrics, stockouts, issues, issueLines, analytics, profit, suppliers, costMap])

  const charts = useMemo(() => {
    const monthMap = new Map()
    for (const key of lastNMonthKeys(6)) {
      monthMap.set(key, { key, month: monthLabel(key), in: 0, out: 0, sales: 0 })
    }
    for (const f of fabrics) {
      const key = monthKey(f.purchase_date)
      if (!monthMap.has(key)) continue
      monthMap.get(key).in += Number(f.meters || 0)
    }
    for (const o of stockouts) {
      const key = monthKey(o.out_date)
      if (!monthMap.has(key)) continue
      monthMap.get(key).out += Number(o.meters_out || 0)
    }
    for (const line of issueLines) {
      const key = monthKey(lineDate(line))
      if (!monthMap.has(key)) continue
      const cur = monthMap.get(key)
      cur.out += Number(line.quantity || 0)
      cur.sales += Number(line.amount || 0)
    }

    const movement = [...monthMap.values()].sort((a, b) => a.key.localeCompare(b.key))

    const categoryMap = new Map()
    for (const g of finishedGoods) {
      const name = g.uniform_name || 'Other'
      categoryMap.set(name, (categoryMap.get(name) || 0) + Number(g.value || g.stock * (g.selling_price || g.purchase_cost) || 0))
    }
    const byCategory = [...categoryMap.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)

    const bestSelling = aggregateBestSelling(issueLines, analytics?.top_items)

    const periodProfit = Number(profit?.summary?.total_profit_loss)
    const lineProfit = computeProfitFromLines(issueLines, costMap)
    const netProfit = Number.isFinite(periodProfit) ? periodProfit : lineProfit.profit
    const profitVsLoss = [
      { name: 'Profit', value: Math.max(0, netProfit), fill: '#10b981' },
      { name: 'Loss', value: netProfit < 0 ? Math.abs(netProfit) : 0, fill: '#ef4444' },
    ]

    const stockCompare = [
      { name: 'Stock in', value: fabrics.reduce((s, f) => s + Number(f.meters || 0), 0) },
      { name: 'Stock out', value: stockouts.reduce((s, o) => s + Number(o.meters_out || 0), 0) },
      { name: 'Current', value: metrics.fabricMeters },
    ]

    return {
      movement,
      byCategory,
      bestSelling,
      profitVsLoss,
      stockCompare,
      monthlySales: movement.map((m) => ({ name: m.month, value: m.sales, key: m.key })),
      hasSalesData: movement.some((m) => m.sales > 0) || issueLines.length > 0,
      hasProfitData: profitVsLoss.some((p) => p.value > 0),
    }
  }, [fabrics, stockouts, issueLines, finishedGoods, analytics, profit, costMap, metrics.fabricMeters])

  const recent = useMemo(() => {
    const stockIn = [...fabrics]
      .sort((a, b) => String(b.purchase_date).localeCompare(String(a.purchase_date)))
      .slice(0, 8)
      .map((f) => ({
        date: String(f.purchase_date || '').slice(0, 10),
        item: `${f.fabric_type || 'Fabric'}${f.color ? ` · ${f.color}` : ''}`,
        supplier: f.supplier_name || '—',
        qty: `${Number(f.meters || 0).toLocaleString()} m`,
      }))

    const sortedLines = [...issueLines].sort((a, b) => lineDate(b).localeCompare(lineDate(a)))

    const sales = sortedLines
      .filter((l) => Number(l.amount) > 0)
      .slice(0, 8)
      .map((l) => ({
        invoice: l.issue_no || `ISS-${l.issue_id}`,
        student: l.student_name || l.student_uid || '—',
        amount: Number(l.amount || 0),
        status: 'Paid',
        date: lineDate(l),
      }))

    const stockOut = sortedLines
      .slice(0, 8)
      .map((l) => ({
        date: lineDate(l),
        student: l.student_name || l.student_uid || '—',
        uniform: l.item_name || 'Uniform',
        qty: Number(l.quantity || 0),
        class_name: l.class_name || '—',
      }))

    return { stockIn, sales, stockOut, returns: [] }
  }, [fabrics, issueLines])

  const calendarEvents = useMemo(() => {
    const stockIn = new Set()
    const stockOut = new Set()
    const sales = new Set()
    for (const f of fabrics) {
      const d = String(f.purchase_date || '').slice(0, 10)
      if (d) stockIn.add(d)
    }
    for (const o of stockouts) {
      const d = String(o.out_date || '').slice(0, 10)
      if (d) stockOut.add(d)
    }
    for (const line of issueLines) {
      const d = lineDate(line)
      if (!d) continue
      stockOut.add(d)
      if (Number(line.amount) > 0) sales.add(d)
    }
    return { stockIn, stockOut, sales }
  }, [fabrics, stockouts, issueLines])

  const notifications = useMemo(() => {
    const items = []
    for (const g of metrics.lowStockItems.slice(0, 3)) {
      items.push({
        tone: 'critical',
        text: `${g.uniform_name}${g.size ? ` (${g.size})` : ''} is running low — ${Number(g.stock || 0)} pcs left`,
      })
    }
    for (const g of metrics.outOfStockItems.slice(0, 2)) {
      items.push({
        tone: 'critical',
        text: `${g.uniform_name}${g.size ? ` (${g.size})` : ''} is out of stock`,
      })
    }
    if (metrics.todayStockInQty > 0) {
      items.push({ tone: 'success', text: `New stock received today (${metrics.todayStockInQty.toLocaleString()} units / meters)` })
    }
    if (metrics.monthlyRevenue > 0) {
      items.push({ tone: 'info', text: `Monthly revenue: RWF ${metrics.monthlyRevenue.toLocaleString()}` })
    }
    if (!items.length) {
      items.push({ tone: 'info', text: 'All stock levels look healthy. Keep monitoring finished goods.' })
    }
    return items
  }, [metrics])

  return {
    loading,
    error,
    reload: load,
    metrics,
    charts,
    recent,
    notifications,
    academic,
    calendarEvents,
  }
}

export function fmtRwf(n) {
  return `RWF ${(Number(n) || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}

export function fmtDateShort(d) {
  if (!d) return '—'
  const s = String(d).slice(0, 10)
  const [y, m, day] = s.split('-')
  return `${day}/${m}/${y}`
}
