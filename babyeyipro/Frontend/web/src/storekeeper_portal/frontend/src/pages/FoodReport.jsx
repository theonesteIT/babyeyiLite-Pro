import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  FileBarChart, Loader2, RefreshCw, Package, UtensilsCrossed, DollarSign,
  AlertTriangle, TrendingUp, Truck, Users,
} from 'lucide-react'
import StorekeeperPageShell from '../components/StorekeeperPageShell'
import StoreExportBar from '../components/StoreExportBar'
import { fetchStoreAcademicSettings } from '../services/academicSettingsService'
import { fetchFoodStockIns, aggregateFoodLevels } from '../services/foodStockService'
import { fetchFoodConsumptions } from '../services/foodConsumptionService'
import { fetchFoodAlerts } from '../services/foodAlertService'
import { exportFoodInventoryExcel, exportFoodInventoryPdf } from '../utils/foodInventoryExport'
import {
  buildFoodItemSummary,
  buildMonthlyPurchaseTotals,
  buildAllocationSummary,
  buildDailyConsumptionSeries,
  buildForecastRows,
  sumTotals,
} from '../utils/foodReportData'

const TABS = [
  { id: 'balance', label: 'Stock Balance' },
  { id: 'purchases', label: 'Purchases' },
  { id: 'consumption', label: 'Consumption' },
  { id: 'allocation', label: 'Allocation' },
  { id: 'cost', label: 'Cost Analysis' },
  { id: 'forecast', label: 'Forecast' },
]

const inputClass =
  'w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-[#000435] focus:bg-white focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 outline-none'

function fmt(n) {
  return (Number(n) || 0).toLocaleString()
}

function fmtMoney(n) {
  return `RWF ${fmt(Math.round(Number(n) || 0))}`
}

function Kpi({ icon: Icon, label, value, sub, warn }) {
  return (
    <div className={`rounded-2xl border p-4 bg-gradient-to-br ${warn ? 'from-amber-50 to-white border-amber-100' : 'from-gray-50/80 to-white border-gray-100'}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase text-gray-400">{label}</p>
          <p className={`text-xl font-bold mt-1 ${warn ? 'text-amber-700' : 'text-[#000435]'}`}>{value}</p>
          {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
        </div>
        {Icon && (
          <div className={`p-2 rounded-xl ${warn ? 'bg-amber-100 text-amber-600' : 'bg-[#000435]/5 text-[#000435]'}`}>
            <Icon size={18} />
          </div>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status }) {
  const styles =
    status === 'out'
      ? 'bg-red-50 text-red-700'
      : status === 'low'
        ? 'bg-amber-50 text-amber-800'
        : 'bg-emerald-50 text-emerald-700'
  const label = status === 'out' ? 'Low / Out' : status === 'low' ? 'Medium' : 'Healthy'
  return <span className={`inline-flex px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase ${styles}`}>{label}</span>
}

function MiniBar({ value, max, color = 'bg-emerald-500' }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden min-w-[80px]">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

function Panel({ title, children, action }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50 bg-gray-50/50">
        <h3 className="text-sm font-bold text-[#000435]">{title}</h3>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

export function FoodReport() {
  const [activeTab, setActiveTab] = useState('balance')
  const [stockRows, setStockRows] = useState([])
  const [consumptions, setConsumptions] = useState([])
  const [lowAlertCount, setLowAlertCount] = useState(0)
  const [academic, setAcademic] = useState({ academicYears: [], activeTerms: [], academicYear: '', currentTerm: '' })
  const [filterYear, setFilterYear] = useState('')
  const [filterTerm, setFilterTerm] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    const filters = {
      academic_year: filterYear || undefined,
      term: filterTerm || undefined,
      from_date: dateFrom || undefined,
      to_date: dateTo || undefined,
    }
    try {
      const [stock, cons, acad, alertsRes] = await Promise.all([
        fetchFoodStockIns(filters),
        fetchFoodConsumptions(filters),
        fetchStoreAcademicSettings().catch(() => null),
        fetchFoodAlerts().catch(() => ({ alerts: [] })),
      ])
      setStockRows(stock)
      setConsumptions(cons)
      if (acad) {
        setAcademic(acad)
        setFilterYear((prev) => prev || acad.academicYear || '')
        setFilterTerm((prev) => prev || acad.currentTerm || '')
      }
      const alerts = alertsRes?.alerts || []
      setLowAlertCount(
        alerts.filter((a) => a.type === 'low-stock' || a.type === 'out-of-stock').length
      )
    } catch (e) {
      setError(e.message || 'Failed to load food report data')
      setStockRows([])
      setConsumptions([])
    } finally {
      setLoading(false)
    }
  }, [filterYear, filterTerm, dateFrom, dateTo])

  useEffect(() => {
    loadData()
  }, [loadData])

  const items = useMemo(() => buildFoodItemSummary(stockRows, consumptions), [stockRows, consumptions])
  const levels = useMemo(() => aggregateFoodLevels(stockRows), [stockRows])
  const totals = useMemo(() => sumTotals(items, stockRows, consumptions), [items, stockRows, consumptions])
  const monthlyPurchases = useMemo(() => buildMonthlyPurchaseTotals(stockRows), [stockRows])
  const allocations = useMemo(() => buildAllocationSummary(consumptions), [consumptions])
  const dailySeries = useMemo(() => buildDailyConsumptionSeries(consumptions), [consumptions])
  const forecastRows = useMemo(() => buildForecastRows(levels, items), [levels, items])

  const exportPayload = useMemo(() => ({
    stockRows,
    consumptions,
    levels,
    filters: {
      academicYear: filterYear,
      term: filterTerm,
      dateFrom,
      dateTo,
    },
  }), [stockRows, consumptions, levels, filterYear, filterTerm, dateFrom, dateTo])

  const maxMonthly = Math.max(...monthlyPurchases.map((m) => m.value), 1)
  const maxDaily = Math.max(...dailySeries.map((d) => d.value), 1)
  const topConsumed = [...items].sort((a, b) => b.consumed - a.consumed).slice(0, 8)
  const maxConsumed = topConsumed[0]?.consumed || 1

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="min-w-[140px]">
            <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Academic year</label>
            <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} className={inputClass}>
              <option value="">All years</option>
              {academic.academicYears.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div className="min-w-[120px]">
            <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Term</label>
            <select value={filterTerm} onChange={(e) => setFilterTerm(e.target.value)} className={inputClass}>
              <option value="">All terms</option>
              {academic.activeTerms.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="min-w-[130px]">
            <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1">From</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={inputClass} />
          </div>
          <div className="min-w-[130px]">
            <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1">To</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={inputClass} />
          </div>
          <StoreExportBar
            variant="panel"
            loading={loading}
            disabled={!stockRows.length && !consumptions.length}
            onRefresh={loadData}
            onExportPdf={() => exportFoodInventoryPdf(exportPayload)}
            onExportExcel={() => exportFoodInventoryExcel(exportPayload)}
          />
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm">{error}</div>
      )}

      {loading ? (
        <div className="py-20 flex justify-center text-gray-400">
          <Loader2 className="animate-spin" size={32} />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <Kpi icon={Package} label="On hand (units)" value={fmt(totals.totalRemaining)} sub="Remaining qty" />
            <Kpi icon={DollarSign} label="Stock value" value={fmtMoney(totals.stockValue)} />
            <Kpi icon={UtensilsCrossed} label="Consumed" value={fmt(totals.totalConsumed)} sub="This filter" />
            <Kpi icon={Truck} label="Purchases" value={fmtMoney(totals.purchaseValue)} sub={`${totals.receiptCount} receipts`} />
            <Kpi icon={TrendingUp} label="Avg daily use" value={fmt(Math.round(totals.avgDaily))} sub="Units / day" />
            <Kpi icon={AlertTriangle} label="Stock alerts" value={String(lowAlertCount)} sub="Low / out" warn={lowAlertCount > 0} />
          </div>

          <div className="flex overflow-x-auto gap-1 border-b border-gray-100 pb-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`whitespace-nowrap px-4 py-2.5 text-sm rounded-xl transition ${
                  activeTab === t.id
                    ? 'bg-[#000435] text-white font-bold'
                    : 'text-gray-400 hover:bg-gray-50'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {activeTab === 'balance' && (
            <Panel title="Stock balance by item">
              {items.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No food stock data for selected filters.</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-100">
                  <table className="w-full text-sm min-w-[720px]">
                    <thead>
                      <tr className="bg-gray-50 text-[10px] font-bold uppercase text-gray-400">
                        {['Item', 'Unit', 'Received', 'Consumed', 'Remaining', '% left', 'Stock value', 'Status'].map((h) => (
                          <th key={h} className={`p-3 ${h !== 'Item' && h !== 'Unit' && h !== 'Status' ? 'text-right' : 'text-left'}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => (
                        <tr key={`${item.name}-${item.unit}`} className="border-t border-gray-50 hover:bg-emerald-50/20">
                          <td className="p-3 font-bold text-[#000435]">{item.name}</td>
                          <td className="p-3 text-gray-500">{item.unit}</td>
                          <td className="p-3 text-right">{fmt(item.received)}</td>
                          <td className="p-3 text-right">{fmt(item.consumed)}</td>
                          <td className="p-3 text-right font-semibold text-emerald-700">{fmt(item.remaining)}</td>
                          <td className="p-3 text-right">
                            <MiniBar
                              value={item.remaining}
                              max={item.received}
                              color={item.status === 'out' ? 'bg-red-500' : item.status === 'low' ? 'bg-amber-500' : 'bg-emerald-500'}
                            />
                            <span className="text-[10px] text-gray-400 ml-1">{item.pctRemaining}%</span>
                          </td>
                          <td className="p-3 text-right">{fmtMoney(item.stockValue)}</td>
                          <td className="p-3"><StatusBadge status={item.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          )}

          {activeTab === 'purchases' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Kpi icon={DollarSign} label="Total purchased" value={fmtMoney(totals.purchaseValue)} />
                <Kpi icon={Package} label="Receipts" value={String(totals.receiptCount)} />
                <Kpi icon={Truck} label="Suppliers" value={String(totals.supplierCount)} />
                <Kpi icon={TrendingUp} label="Months tracked" value={String(monthlyPurchases.length)} />
              </div>
              {monthlyPurchases.length > 0 && (
                <Panel title="Monthly purchase value (from stock in)">
                  <div className="flex items-end gap-2 h-24">
                    {monthlyPurchases.map((m) => (
                      <div key={m.month} className="flex-1 flex flex-col items-center gap-1 min-w-[32px]">
                        <div
                          className="w-full rounded-t bg-[#000435]/80 min-h-[4px]"
                          style={{ height: `${Math.max(8, (m.value / maxMonthly) * 72)}px` }}
                          title={fmtMoney(m.value)}
                        />
                        <span className="text-[9px] text-gray-400 font-medium">{m.label}</span>
                      </div>
                    ))}
                  </div>
                </Panel>
              )}
              <Panel title="Purchase history (stock in)">
                {stockRows.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">No purchases in range.</p>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-gray-100">
                    <table className="w-full text-sm min-w-[800px]">
                      <thead>
                        <tr className="bg-gray-50 text-[10px] font-bold uppercase text-gray-400">
                          {['Date', 'Supplier', 'Item', 'Qty', 'Unit', 'Unit cost', 'Total', 'Invoice'].map((h) => (
                            <th key={h} className="p-3 text-left">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[...stockRows]
                          .sort((a, b) => String(b.receive_date).localeCompare(String(a.receive_date)))
                          .map((r) => (
                            <tr key={r.id} className="border-t border-gray-50">
                              <td className="p-3 text-gray-500">{r.receive_date || '—'}</td>
                              <td className="p-3">{r.supplier_name || '—'}</td>
                              <td className="p-3 font-medium text-[#000435]">{r.item_name}</td>
                              <td className="p-3">{fmt(r.quantity)}</td>
                              <td className="p-3">{r.unit_type}</td>
                              <td className="p-3">{r.unit_cost !== '' ? fmtMoney(r.unit_cost) : '—'}</td>
                              <td className="p-3 font-medium">{fmtMoney(r.total_cost)}</td>
                              <td className="p-3 text-gray-500">{r.invoice_number || '—'}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Panel>
            </div>
          )}

          {activeTab === 'consumption' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Kpi icon={UtensilsCrossed} label="Total consumed" value={fmt(totals.totalConsumed)} />
                <Kpi icon={DollarSign} label="Consumption cost" value={fmtMoney(totals.consumptionCost)} />
                <Kpi icon={TrendingUp} label="Records" value={String(totals.consumptionCount)} />
                <Kpi icon={DollarSign} label="Avg daily cost" value={fmtMoney(totals.avgDailyCost)} />
              </div>
              {dailySeries.length > 0 && (
                <Panel title="Daily consumption (last 14 days with data)">
                  <div className="flex items-end gap-1 h-20">
                    {dailySeries.map((d) => (
                      <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                        <div
                          className="w-full rounded-t bg-amber-400 min-h-[4px]"
                          style={{ height: `${Math.max(6, (d.value / maxDaily) * 64)}px` }}
                          title={`${d.date}: ${fmt(d.value)}`}
                        />
                        <span className="text-[8px] text-gray-400">{d.label}</span>
                      </div>
                    ))}
                  </div>
                </Panel>
              )}
              <Panel title="Top consumed items">
                {topConsumed.length === 0 ? (
                  <p className="text-sm text-gray-400">No consumption data.</p>
                ) : (
                  <div className="space-y-3">
                    {topConsumed.map((f, i) => (
                      <div key={`${f.name}-${f.unit}`}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-bold text-[#000435]">#{i + 1} {f.name}</span>
                          <span className="text-gray-500">{fmt(f.consumed)} {f.unit}</span>
                        </div>
                        <MiniBar value={f.consumed} max={maxConsumed} color="bg-[#000435]" />
                      </div>
                    ))}
                  </div>
                )}
              </Panel>
              <Panel title="Consumption detail">
                {consumptions.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">No consumption records.</p>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-gray-100">
                    <table className="w-full text-sm min-w-[640px]">
                      <thead>
                        <tr className="bg-gray-50 text-[10px] font-bold uppercase text-gray-400">
                          {['Date', 'Item', 'Allocated to', 'Qty', 'Unit'].map((h) => (
                            <th key={h} className="p-3 text-left">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {consumptions.map((c) => (
                          <tr key={c.id} className="border-t border-gray-50">
                            <td className="p-3 text-gray-500">{c.consumption_date}</td>
                            <td className="p-3 font-medium">{c.item_name}</td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded-lg bg-blue-50 text-blue-800 text-xs font-bold">{c.allocated_to}</span>
                            </td>
                            <td className="p-3">{fmt(c.quantity)}</td>
                            <td className="p-3">{c.unit_type}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Panel>
            </div>
          )}

          {activeTab === 'allocation' && (
            <Panel title="Consumption by allocation (from database)">
              <p className="text-xs text-gray-500 mb-4">
                Breakdown of where food was allocated (Kitchen, Student meals, Boarding, etc.) — from consumption records.
              </p>
              {allocations.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No allocation data.</p>
              ) : (
                <div className="space-y-4">
                  {allocations.map((a) => (
                    <div key={a.label}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-bold text-[#000435] flex items-center gap-2">
                          <Users size={14} className="text-amber-500" />
                          {a.label}
                        </span>
                        <span className="text-gray-500">{fmt(a.quantity)} units · {a.count} records</span>
                      </div>
                      <MiniBar value={a.quantity} max={allocations[0]?.quantity || 1} color="bg-blue-500" />
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          )}

          {activeTab === 'cost' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Kpi icon={DollarSign} label="Purchase cost" value={fmtMoney(totals.purchaseValue)} />
                <Kpi icon={UtensilsCrossed} label="Consumption cost" value={fmtMoney(totals.consumptionCost)} />
                <Kpi icon={Package} label="Remaining value" value={fmtMoney(totals.stockValue)} />
              </div>
              <Panel title="Cost by item (estimated from unit cost × qty)">
                <div className="overflow-x-auto rounded-xl border border-gray-100">
                  <table className="w-full text-sm min-w-[560px]">
                    <thead>
                      <tr className="bg-gray-50 text-[10px] font-bold uppercase text-gray-400">
                        {['Item', 'Consumed', 'Unit cost', 'Consumption cost', '% of total'].map((h) => (
                          <th key={h} className="p-3 text-left">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[...items]
                        .filter((i) => i.consumptionCost > 0)
                        .sort((a, b) => b.consumptionCost - a.consumptionCost)
                        .map((i) => (
                          <tr key={`${i.name}-${i.unit}`} className="border-t border-gray-50">
                            <td className="p-3 font-medium">{i.name} ({i.unit})</td>
                            <td className="p-3">{fmt(i.consumed)}</td>
                            <td className="p-3">{fmtMoney(i.unitCost)}</td>
                            <td className="p-3 font-semibold">{fmtMoney(i.consumptionCost)}</td>
                            <td className="p-3 text-gray-500">
                              {totals.consumptionCost > 0
                                ? `${Math.round((i.consumptionCost / totals.consumptionCost) * 100)}%`
                                : '—'}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </Panel>
            </div>
          )}

          {activeTab === 'forecast' && (
            <Panel title="Restock forecast (from min levels & remaining stock)">
              <p className="text-xs text-gray-500 mb-4">
                Based on current stock levels and min alert levels set on food batches in Stock In.
              </p>
              {forecastRows.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No stock levels to forecast.</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-100">
                  <table className="w-full text-sm min-w-[640px]">
                    <thead>
                      <tr className="bg-gray-50 text-[10px] font-bold uppercase text-gray-400">
                        {['Item', 'On hand', 'Target level', 'To order', 'Est. cost', 'Status'].map((h) => (
                          <th key={h} className="p-3 text-left">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {forecastRows.map((row) => (
                        <tr key={`${row.item}-${row.unit}`} className="border-t border-gray-50">
                          <td className="p-3 font-bold text-[#000435]">{row.item}</td>
                          <td className="p-3">{fmt(row.current)} {row.unit}</td>
                          <td className="p-3">{fmt(row.forecast)} {row.unit}</td>
                          <td className={`p-3 font-semibold ${row.toOrder > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                            {row.toOrder > 0 ? `+${fmt(row.toOrder)}` : 'OK'}
                          </td>
                          <td className="p-3">{row.toOrder > 0 ? fmtMoney(row.estCost) : '—'}</td>
                          <td className="p-3">
                            <StatusBadge status={row.priority === 'out' ? 'out' : row.priority === 'low' ? 'low' : 'normal'} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          )}
        </>
      )}
    </div>
  )
}

export default function FoodReportPage() {
  return (
    <StorekeeperPageShell
      titleLine="Food Reports"
      subtitle="Live reports from food stock in and consumption records"
      icon={FileBarChart}
    >
      <div className="store-panel-sheet p-4 sm:p-6">
        <FoodReport />
      </div>
    </StorekeeperPageShell>
  )
}
