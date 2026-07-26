import { useState, useCallback, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileBarChart, Loader2,
  Package, Shirt, Apple, Box, AlertTriangle, TrendingUp, TrendingDown,
  ArrowDownUp, Wrench, DollarSign, BarChart3, Layers,
} from 'lucide-react'
import StorekeeperPageShell from '../components/StorekeeperPageShell'
import StoreExportBar from '../components/StoreExportBar'
import { loadStorekeeperAnalytics } from '../services/storekeeperAnalyticsService'
import { exportStoreReportsPdf } from '../utils/storeReportsPdfExport'
import { formatMoneyRounded as formatNum } from '../utils/formatMoney'
import {
  KpiCard, ReportPanel, ReportTable, StatusPill, SectionTabBar,
  MonthlyMovementChart, CategoryPieChart, ValueBarChart,
  exportCSV, printSection, fmtMoney, REPORT_COLORS,
} from '../components/reports/StoreReportPrimitives'

const SECTIONS = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'valuation', label: 'Valuation', icon: DollarSign },
  { id: 'movements', label: 'Movements', icon: ArrowDownUp },
  { id: 'uniform', label: 'Uniform', icon: Shirt },
  { id: 'food', label: 'Food', icon: Apple },
  { id: 'other', label: 'Other', icon: Box },
  { id: 'low-stock', label: 'Low Stock', icon: AlertTriangle },
  { id: 'adjustments', label: 'Adjustments', icon: Wrench },
]

const TYPE_LABELS = {
  stock_in: 'Stock In',
  stock_out: 'Stock Out',
  returned: 'Returned',
  adjusted: 'Adjusted',
}

function movementTone(type) {
  if (type === 'stock_in' || type === 'returned') return 'in'
  if (type === 'stock_out') return 'out'
  return 'neutral'
}

export default function Reports() {
  const [activeSection, setActiveSection] = useState('overview')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await loadStorekeeperAnalytics()
      setData(res)
    } catch (e) {
      setError(e.message || 'Failed to load report data')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const summary = data?.summary
  const charts = data?.charts

  const uniformValue = useMemo(
    () => (data?.finishedGoods || []).reduce((s, f) => s + Number(f.value || 0), 0),
    [data?.finishedGoods]
  )

  const foodValue = useMemo(
    () => (data?.foodStock || []).reduce((s, r) => s + (Number(r.total_cost) || 0), 0),
    [data?.foodStock]
  )

  const otherValue = useMemo(
    () => (data?.otherStock || []).reduce((s, r) => s + (Number(r.total_cost) || 0), 0),
    [data?.otherStock]
  )

  const invValue = useMemo(
    () => (data?.inventory || []).reduce((s, i) => s + Number(i.quantity || 0) * (Number(i.unit_cost) || 0), 0),
    [data?.inventory]
  )

  const lowStockRows = useMemo(() => {
    if (!data) return []
    const rows = []
    for (const i of data.inventory || []) {
      if (i.reorder_level > 0 && i.quantity <= i.reorder_level) {
        rows.push({ area: 'General', name: i.name, qty: i.quantity, min: i.reorder_level, unit: i.unit, status: i.quantity <= 0 ? 'out' : 'low' })
      }
    }
    for (const l of data.foodLevels || []) {
      if (l.status !== 'Normal') {
        rows.push({ area: 'Food', name: l.item_name, qty: l.remaining, min: l.reorder_level, unit: l.unit_type, status: l.status === 'Out of Stock' ? 'out' : 'low' })
      }
    }
    for (const l of data.otherLevels || []) {
      if (l.status !== 'Normal') {
        rows.push({ area: 'Other', name: l.item_name, qty: l.remaining, min: l.reorder_level, unit: l.unit_type, status: l.status === 'Out of Stock' ? 'out' : 'low' })
      }
    }
    return rows
  }, [data])

  const summaryKpis = useMemo(() => {
    if (!summary) return []
    const alertTotal = summary.foodLow + summary.otherLow + summary.invLow + summary.invOut
    return [
      { label: 'Total stock value', value: fmtMoney(summary.totalStockValue), icon: DollarSign, sub: 'All store areas' },
      { label: 'Uniform value', value: fmtMoney(uniformValue), icon: Shirt, sub: `${(data?.finishedGoods || []).length} SKUs` },
      { label: 'Food on hand', value: `${formatNum(summary.foodRemaining)} units`, icon: Apple, sub: fmtMoney(foodValue) },
      { label: 'Other supplies', value: `${formatNum(summary.otherRemaining)} units`, icon: Box, sub: fmtMoney(otherValue) },
      { label: 'Stock movements', value: formatNum((data?.movements || []).length), icon: ArrowDownUp, sub: 'Recorded events' },
      { label: 'Alerts & low stock', value: String(alertTotal), icon: AlertTriangle, warn: alertTotal > 0, sub: `${summary.foodAlertCount} food alerts` },
    ]
  }, [summary, uniformValue, foodValue, otherValue, data])

  const handleExport = () => {
    if (!data) return
    const rows = [
      ['Area', 'Metric', 'Value'],
      ['All', 'Total stock value', summary?.totalStockValue ?? 0],
      ['Uniform', 'Stock value', uniformValue],
      ['Food', 'On hand (units)', summary?.foodRemaining ?? 0],
      ['Food', 'Purchase value', foodValue],
      ['Other', 'On hand (units)', summary?.otherRemaining ?? 0],
      ['Other', 'Purchase value', otherValue],
      ['General', 'Inventory value', invValue],
      ['All', 'Low / out items', lowStockRows.length],
      ['All', 'Adjustments', summary?.adjustmentCount ?? 0],
    ]
    exportCSV(['Area', 'Metric', 'Value'], rows.slice(1), `store-reports-${new Date().toISOString().slice(0, 10)}.csv`)
  }

  const renderOverview = () => (
    <div id="report-overview" className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {summaryKpis.map((k) => (
          <KpiCard key={k.label} {...k} />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ReportPanel title="Monthly stock activity" subtitle="Stock in vs stock out — last 6 months">
          <div className="h-64">
            <MonthlyMovementChart data={charts?.monthlyMovementChart} />
          </div>
        </ReportPanel>
        <ReportPanel title="Stock by area" subtitle="Units on hand across store categories">
          <div className="h-64 flex items-center">
            <div className="flex-1 h-full">
              <CategoryPieChart data={charts?.categoryPie} />
            </div>
            <div className="hidden sm:flex flex-col gap-2 pr-2">
              {(charts?.categoryPie || []).map((d, i) => (
                <div key={d.name} className="flex items-center gap-2 text-[10px] font-bold text-gray-500">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: REPORT_COLORS[i % REPORT_COLORS.length] }} />
                  <span>{d.name}</span>
                  <span className="text-[#000435]">{formatNum(d.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </ReportPanel>
        <ReportPanel title="Purchase value by month" subtitle="Food + other receipts">
          <div className="h-56">
            <ValueBarChart data={charts?.purchaseMonthly} dataKey="value" nameKey="month" color="#000435" formatter={(v) => fmtMoney(v)} />
          </div>
        </ReportPanel>
        <ReportPanel title="Stock health" subtitle="Healthy vs low vs out of stock">
          <div className="h-56">
            <ValueBarChart data={charts?.stockHealth} dataKey="value" nameKey="name" color="#FEBF10" />
          </div>
        </ReportPanel>
      </div>
    </div>
  )

  const renderValuation = () => (
    <div id="report-valuation" className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Total inventory value" value={fmtMoney(summary?.totalStockValue)} icon={DollarSign} />
        <KpiCard label="Uniform" value={fmtMoney(uniformValue)} icon={Shirt} accent="navy" />
        <KpiCard label="Food stock" value={fmtMoney(foodValue)} icon={Apple} accent="emerald" />
        <KpiCard label="Other supplies" value={fmtMoney(otherValue)} icon={Box} />
      </div>
      <ReportPanel title="Valuation breakdown" subtitle="Estimated value by inventory area">
        <ReportTable
          headers={['Area', 'Items / SKUs', 'Quantity', 'Est. value']}
          rows={[
            { area: 'Uniform (finished goods)', count: (data?.finishedGoods || []).length, qty: (data?.finishedGoods || []).reduce((s, f) => s + Number(f.stock || 0), 0), value: uniformValue },
            { area: 'Food inventory', count: (data?.foodStock || []).length, qty: summary?.foodRemaining, value: foodValue },
            { area: 'Other supplies', count: (data?.otherStock || []).length, qty: summary?.otherRemaining, value: otherValue },
            { area: 'General inventory', count: (data?.inventory || []).length, qty: (data?.inventory || []).reduce((s, i) => s + Number(i.quantity || 0), 0), value: invValue },
          ]}
          renderRow={(row) => (
            <tr key={row.area} className="border-b border-gray-50 hover:bg-amber-50/20 transition-colors">
              <td className="py-3 px-4 text-xs font-bold text-[#000435]">{row.area}</td>
              <td className="py-3 px-4 text-xs text-gray-600">{row.count}</td>
              <td className="py-3 px-4 text-xs font-semibold text-gray-700">{formatNum(row.qty)}</td>
              <td className="py-3 px-4 text-xs font-bold text-amber-700">{fmtMoney(row.value)}</td>
            </tr>
          )}
        />
      </ReportPanel>
    </div>
  )

  const renderMovements = () => (
    <div id="report-movements" className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Total events" value={formatNum((data?.movements || []).length)} icon={ArrowDownUp} />
        <KpiCard label="Stock in" value={formatNum((data?.movements || []).filter((m) => m.type === 'stock_in').length)} icon={TrendingUp} accent="emerald" />
        <KpiCard label="Stock out" value={formatNum((data?.movements || []).filter((m) => m.type === 'stock_out').length)} icon={TrendingDown} accent="red" />
        <KpiCard label="Adjusted" value={formatNum((data?.movements || []).filter((m) => m.type === 'adjusted').length)} icon={Wrench} />
      </div>
      <ReportPanel
        title="Recent stock movements"
        subtitle="Latest inventory transactions"
        action={
          <button
            type="button"
            onClick={() => {
              const rows = (data?.movements || []).map((m) => [
                m.movement_date || m.created_at || '',
                m.item_name,
                TYPE_LABELS[m.type] || m.type,
                m.quantity,
                m.stock_after ?? '',
              ])
              exportCSV(['Date', 'Item', 'Type', 'Qty', 'After'], rows, `movements-${new Date().toISOString().slice(0, 10)}.csv`)
            }}
            className="text-[10px] font-bold uppercase tracking-wider text-amber-700 hover:text-amber-800"
          >
            Export CSV
          </button>
        }
      >
        <ReportTable
          headers={['Date', 'Item', 'Type', 'Qty', 'Balance after', 'Reference']}
          rows={(data?.movements || []).slice(0, 50)}
          emptyMessage="No movements recorded yet"
          renderRow={(m) => (
            <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50/80 transition-colors">
              <td className="py-3 px-4 text-xs text-gray-500">{String(m.movement_date || m.created_at || '—').slice(0, 10)}</td>
              <td className="py-3 px-4 text-xs font-bold text-[#000435]">{m.item_name || '—'}</td>
              <td className="py-3 px-4"><StatusPill label={TYPE_LABELS[m.type] || m.type} tone={movementTone(m.type)} /></td>
              <td className="py-3 px-4 text-xs font-bold text-[#000435]">{formatNum(m.quantity)}</td>
              <td className="py-3 px-4 text-xs text-gray-600">{m.stock_after != null ? formatNum(m.stock_after) : '—'}</td>
              <td className="py-3 px-4 text-xs text-gray-500 max-w-[180px] truncate">{m.ref || m.note || '—'}</td>
            </tr>
          )}
        />
      </ReportPanel>
    </div>
  )

  const renderUniform = () => {
    const ua = data?.uniformAnalytics || {}
    const revenue = Number(ua.total_sales || ua.total_revenue || ua.totalRevenue || 0)
    const pieces = Number(ua.total_pieces || ua.total_issues || data?.summary?.uniformIssueCount || 0)
    return (
      <div id="report-uniform" className="space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard label="Finished goods SKUs" value={formatNum((data?.finishedGoods || []).length)} icon={Shirt} />
          <KpiCard label="Stock value" value={fmtMoney(uniformValue)} icon={DollarSign} />
          <KpiCard label="Pieces issued" value={formatNum(pieces)} icon={Package} />
          <KpiCard label="Sales revenue" value={fmtMoney(revenue)} icon={TrendingUp} accent="emerald" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ReportPanel title="Finished goods register" subtitle="Current uniform stock on hand">
            <ReportTable
              headers={['Item', 'Size', 'Stock', 'Unit price', 'Value']}
              rows={data?.finishedGoods || []}
              emptyMessage="No finished goods in stock"
              renderRow={(f) => (
                <tr key={`${f.uniform_name}-${f.size}`} className="border-b border-gray-50 hover:bg-amber-50/20">
                  <td className="py-3 px-4 text-xs font-bold text-[#000435]">{f.uniform_name}</td>
                  <td className="py-3 px-4 text-xs text-gray-600">{f.size || '—'}</td>
                  <td className="py-3 px-4 text-xs font-semibold">{formatNum(f.stock)}</td>
                  <td className="py-3 px-4 text-xs text-gray-600">{fmtMoney(f.selling_price)}</td>
                  <td className="py-3 px-4 text-xs font-bold text-amber-700">{fmtMoney(f.value)}</td>
                </tr>
              )}
            />
          </ReportPanel>
          <ReportPanel title="Uniform stock by item" subtitle="Quantity on hand">
            <div className="h-72">
              <ValueBarChart
                data={(data?.finishedGoods || []).slice(0, 8).map((f) => ({ name: `${f.uniform_name} ${f.size || ''}`.trim(), stock: Number(f.stock || 0) }))}
                dataKey="stock"
                nameKey="name"
                color="#000435"
              />
            </div>
          </ReportPanel>
        </div>
      </div>
    )
  }

  const renderFood = () => (
    <div id="report-food" className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Food batches" value={formatNum((data?.foodStock || []).length)} icon={Apple} />
        <KpiCard label="On hand" value={formatNum(summary?.foodRemaining)} icon={Package} />
        <KpiCard label="Consumed" value={formatNum(summary?.foodConsumed)} icon={TrendingDown} />
        <KpiCard label="Low items" value={formatNum(summary?.foodLow)} icon={AlertTriangle} warn={summary?.foodLow > 0} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ReportPanel title="Stock vs consumed by item">
          <div className="h-72">
            <ValueBarChart
              data={(charts?.foodByItem || []).slice(0, 10)}
              dataKey="stock"
              nameKey="name"
              color="#FEBF10"
            />
          </div>
        </ReportPanel>
        <ReportPanel title="Food stock levels">
          <ReportTable
            headers={['Item', 'On hand', 'Status']}
            rows={data?.foodLevels || []}
            emptyMessage="No food stock data"
            renderRow={(l) => (
              <tr key={l.item_name} className="border-b border-gray-50">
                <td className="py-3 px-4 text-xs font-bold text-[#000435]">{l.item_name}</td>
                <td className="py-3 px-4 text-xs font-semibold">{formatNum(l.remaining)} {l.unit_type}</td>
                <td className="py-3 px-4">
                  <StatusPill label={l.status} tone={l.status === 'Normal' ? 'ok' : l.status === 'Out of Stock' ? 'out' : 'low'} />
                </td>
              </tr>
            )}
          />
        </ReportPanel>
      </div>
    </div>
  )

  const renderOther = () => (
    <div id="report-other" className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Batches" value={formatNum((data?.otherStock || []).length)} icon={Box} />
        <KpiCard label="On hand" value={formatNum(summary?.otherRemaining)} icon={Layers} />
        <KpiCard label="Issued" value={formatNum(summary?.otherIssued)} icon={TrendingDown} />
        <KpiCard label="Low items" value={formatNum(summary?.otherLow)} icon={AlertTriangle} warn={summary?.otherLow > 0} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ReportPanel title="By category (remaining units)">
          <div className="h-72">
            <CategoryPieChart data={(charts?.otherByCategory || []).map((c) => ({ name: c.name, value: c.remaining }))} />
          </div>
        </ReportPanel>
        <ReportPanel title="Category receipt value">
          <div className="h-72">
            <ValueBarChart data={charts?.otherByCategory} dataKey="value" nameKey="name" color="#3b82f6" formatter={(v) => fmtMoney(v)} />
          </div>
        </ReportPanel>
      </div>
    </div>
  )

  const renderLowStock = () => (
    <div id="report-low-stock" className="space-y-5">
      <KpiCard
        label="Items needing attention"
        value={String(lowStockRows.length)}
        icon={AlertTriangle}
        warn={lowStockRows.length > 0}
        sub={lowStockRows.length === 0 ? 'All stock levels are healthy' : 'Below reorder level or out of stock'}
      />
      {lowStockRows.length === 0 ? (
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-10 text-center">
          <p className="text-sm font-bold text-emerald-700">All stock levels are within healthy ranges</p>
          <p className="text-xs text-emerald-600/80 mt-1">No low or out-of-stock items detected</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {lowStockRows.map((item, i) => (
            <motion.div
              key={`${item.area}-${item.name}-${i}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className={`rounded-2xl border p-4 ${item.status === 'out' ? 'border-red-200 bg-red-50/60' : 'border-amber-200 bg-amber-50/50'}`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <p className="text-[10px] font-bold uppercase text-gray-400">{item.area}</p>
                  <p className="text-sm font-bold text-[#000435] mt-0.5">{item.name}</p>
                </div>
                <StatusPill label={item.status === 'out' ? 'Out' : 'Low'} tone={item.status === 'out' ? 'out' : 'low'} />
              </div>
              <div className="flex gap-4 text-xs font-semibold">
                <span className={item.status === 'out' ? 'text-red-600' : 'text-amber-700'}>
                  Current: {formatNum(item.qty)} {item.unit}
                </span>
                <span className="text-gray-400">Min: {formatNum(item.min)}</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )

  const renderAdjustments = () => (
    <div id="report-adjustments" className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <KpiCard label="Total adjustments" value={formatNum(summary?.adjustmentCount)} icon={Wrench} />
        <KpiCard
          label="Decreases"
          value={formatNum((data?.adjustments || []).filter((a) => a.mode === 'decrease').length)}
          icon={TrendingDown}
          accent="red"
        />
        <KpiCard label="Reason categories" value={formatNum((charts?.adjByReason || []).length)} icon={Layers} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ReportPanel title="Adjustments by reason">
          <div className="h-64">
            <ValueBarChart data={charts?.adjByReason} dataKey="qty" nameKey="reason" color="#ef4444" />
          </div>
        </ReportPanel>
        <ReportPanel title="Adjustment log">
          <ReportTable
            headers={['Date', 'Item', 'Mode', 'Qty', 'Reason']}
            rows={(data?.adjustments || []).slice(0, 30)}
            emptyMessage="No adjustments recorded"
            renderRow={(a) => (
              <tr key={a.id} className="border-b border-gray-50">
                <td className="py-3 px-4 text-xs text-gray-500">{String(a.adjustment_date || a.created_at || '—').slice(0, 10)}</td>
                <td className="py-3 px-4 text-xs font-bold text-[#000435]">{a.item_name || '—'}</td>
                <td className="py-3 px-4"><StatusPill label={a.mode || '—'} tone={a.mode === 'decrease' ? 'out' : 'in'} /></td>
                <td className="py-3 px-4 text-xs font-semibold">{formatNum(a.quantity)}</td>
                <td className="py-3 px-4 text-xs text-gray-500">{a.reason || '—'}</td>
              </tr>
            )}
          />
        </ReportPanel>
      </div>
    </div>
  )

  const sectionContent = {
    overview: renderOverview,
    valuation: renderValuation,
    movements: renderMovements,
    uniform: renderUniform,
    food: renderFood,
    other: renderOther,
    'low-stock': renderLowStock,
    adjustments: renderAdjustments,
  }

  return (
    <StorekeeperPageShell
      titleLine="Reports"
      titleAccent="& Analytics"
      subtitle="Professional inventory insights across uniform, food, and general stock"
      icon={FileBarChart}
      rightSlot={
        <StoreExportBar
          variant="hero"
          loading={loading}
          disabled={!data}
          onRefresh={loadData}
          onExportCsv={handleExport}
          onExportPdf={() => exportStoreReportsPdf(data, activeSection)}
          onPrint={() => printSection(`report-${activeSection}`, 'Store Reports')}
        />
      }
    >
      <div className="store-panel-sheet p-0 overflow-hidden">
        <SectionTabBar sections={SECTIONS} active={activeSection} onChange={setActiveSection} />

        <div className="p-4 sm:p-6 min-h-[420px]">
          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 text-red-700 text-sm border border-red-100">{error}</div>
          )}

          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center gap-3 text-gray-400">
              <Loader2 size={32} className="animate-spin" />
              <p className="text-sm font-medium">Loading report data…</p>
            </div>
          ) : !data ? (
            <p className="text-center py-24 text-gray-400 text-sm">No report data available.</p>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSection}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
              >
                {sectionContent[activeSection]?.()}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>
    </StorekeeperPageShell>
  )
}
