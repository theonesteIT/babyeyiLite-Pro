import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'
import {
  Plus, Apple, AlertTriangle, Loader2, RefreshCw, Search, X, Building2, Calendar,
  GraduationCap, Package, Ruler, DollarSign, Hash, BadgeCheck, Trash2, Pencil,
  UtensilsCrossed, AlertCircle, MapPin, CalendarClock, ChevronDown,
  TrendingDown, BarChart3, Layers, FileSpreadsheet, FileText, Download, TrendingUp,
  ShoppingCart, Boxes, AlertOctagon, ArrowDownRight, ArrowUpRight,
} from 'lucide-react'
import { exportFoodInventoryExcel, exportFoodInventoryPdf } from '../utils/foodInventoryExport'
import StorekeeperPageShell from '../components/StorekeeperPageShell'
import StoreExportBar from '../components/StoreExportBar'
import StorekeeperToast from '../components/StorekeeperToast'
import { fetchSuppliers } from '../services/suppliersService'
import { fetchStoreAcademicSettings } from '../services/academicSettingsService'
import {
  EMPTY_FOOD_STOCK_FORM, FOOD_UNIT_TYPES, FOOD_STORE_LOCATIONS,
  foodUnitToFormFields, isExpirySoon, isExpired, resolveFoodUnitFromForm,
  fetchFoodStockIns, createFoodStockIn, updateFoodStockIn, deleteFoodStockIn,
  mapFoodStockToApi, aggregateFoodLevels,
} from '../services/foodStockService'
import {
  EMPTY_FOOD_CONSUME_FORM, FOOD_ALLOCATIONS,
  fetchFoodConsumptions, createFoodConsumption, updateFoodConsumption,
  deleteFoodConsumption, mapFoodConsumptionToApi, foodConsumptionToFormFields,
} from '../services/foodConsumptionService'

/* ─── Shared input ─────────────────────────────────────────────── */
const input = 'w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-300 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 outline-none transition-all font-medium'

/* ─── Micro-components ──────────────────────────────────────────── */
function Field({ icon: Icon, label, children }) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">
        {Icon && <Icon size={11} className="text-amber-500" />}{label}
      </label>
      {children}
    </div>
  )
}

function Badge({ children, color = 'gray' }) {
  const map = { gray:'bg-gray-100 text-gray-600', amber:'bg-amber-50 text-amber-700', emerald:'bg-emerald-50 text-emerald-700', rose:'bg-rose-50 text-rose-600', sky:'bg-sky-50 text-sky-700' }
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${map[color]}`}>{children}</span>
}

function EmptyState({ icon: Icon, title, hint }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-6">
      <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4"><Icon size={24} className="text-gray-300" /></div>
      <p className="text-sm font-semibold text-gray-400">{title}</p>
      {hint && <p className="text-xs text-gray-300 mt-1 max-w-xs">{hint}</p>}
    </div>
  )
}

/* ─── Helpers ───────────────────────────────────────────────────── */
function fmt$(n) { return (Number(n) || 0).toLocaleString() }
function fmtDate(d) { return d ? String(d).slice(0, 10) : '—' }

const CHART_COLORS = ['#0B1340','#F59E0B','#059669','#0284C7','#E11D48','#7C3AED','#D97706','#0D9488']

/* ─── Custom Tooltip ────────────────────────────────────────────── */
function ChartTooltip({ active, payload, label, prefix = '', suffix = '' }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#0B1340] text-white text-xs rounded-xl px-3 py-2.5 shadow-xl border border-white/10">
      <p className="font-bold mb-1 text-white/60">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="font-bold" style={{ color: p.color || '#F59E0B' }}>
          {p.name}: {prefix}{Number(p.value).toLocaleString()}{suffix}
        </p>
      ))}
    </div>
  )
}

/* ─── KPI Card ──────────────────────────────────────────────────── */
function KpiCard({ icon: Icon, label, value, sub, trend, color = 'default' }) {
  const schemes = {
    default: 'bg-white border-gray-100',
    amber: 'bg-amber-50 border-amber-100',
    emerald: 'bg-emerald-50 border-emerald-100',
    rose: 'bg-rose-50 border-rose-100',
    sky: 'bg-sky-50 border-sky-100',
  }
  const iconSchemes = {
    default: 'bg-gray-100 text-gray-500',
    amber: 'bg-amber-100 text-amber-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    rose: 'bg-rose-100 text-rose-500',
    sky: 'bg-sky-100 text-sky-600',
  }
  return (
    <div className={`rounded-2xl border p-4 ${schemes[color]}`}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconSchemes[color]}`}>
          <Icon size={16} />
        </div>
        {trend !== undefined && (
          <span className={`flex items-center gap-0.5 text-[10px] font-bold ${trend >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
            {trend >= 0 ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">{label}</p>
      <p className={`text-2xl font-black tracking-tight ${color === 'rose' ? 'text-rose-600' : color === 'amber' ? 'text-amber-600' : 'text-[#0B1340]'}`}>{value}</p>
      {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

/* ─── Chart section wrapper ─────────────────────────────────────── */
function ChartCard({ title, subtitle, action, children }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
      <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-50">
        <div>
          <p className="text-sm font-bold text-[#0B1340]">{title}</p>
          {subtitle && <p className="text-[11px] text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

/* ─── Tabs ──────────────────────────────────────────────────────── */
const TABS = [
  { id: 'stock-in', label: 'Stock In', icon: Package },
  { id: 'consumption', label: 'Consumption', icon: UtensilsCrossed },
  { id: 'levels', label: 'Levels', icon: BarChart3 },
  { id: 'reports', label: 'Reports', icon: TrendingDown },
]

/* ─── Date range ────────────────────────────────────────────────── */
function DateRange({ from, to, onFrom, onTo }) {
  return (
    <div className="flex flex-wrap gap-3 items-end pt-3 border-t border-gray-100 mt-3">
      <Field icon={Calendar} label="From"><input type="date" value={from} onChange={e => onFrom(e.target.value)} className={input} /></Field>
      <Field icon={Calendar} label="To"><input type="date" value={to} onChange={e => onTo(e.target.value)} className={input} /></Field>
      {(from || to) && (
        <button type="button" onClick={() => { onFrom(''); onTo('') }}
          className="px-3 py-2.5 rounded-xl text-xs font-bold text-gray-400 border border-gray-200 hover:bg-gray-50 transition">Clear</button>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════
   REPORTS TAB — full standalone component
══════════════════════════════════════════════════════════════════ */
function ReportsTab({ stockRows, consumptions, levels, filters = {} }) {
  const [chartView, setChartView] = useState('spend') // spend | consumption | allocation | levels
  const exportPayload = { stockRows, consumptions, levels, filters }

  /* ── Derived data ── */
  const kpi = useMemo(() => ({
    purchased: stockRows.reduce((s, r) => s + (Number(r.total_cost) || 0), 0),
    consumedQty: consumptions.reduce((s, c) => s + Number(c.quantity || 0), 0),
    batches: stockRows.length,
    low: levels.filter(l => l.status !== 'Normal').length,
    expired: stockRows.filter(r => r.expiry_date && isExpired(r.expiry_date)).length,
    expirySoon: stockRows.filter(r => r.expiry_date && isExpirySoon(r.expiry_date)).length,
  }), [stockRows, consumptions, levels])

  /* spend by item (bar) */
  const spendByItem = useMemo(() => {
    const m = {}
    stockRows.forEach(r => { m[r.item_name] = (m[r.item_name] || 0) + (Number(r.total_cost) || 0) })
    return Object.entries(m).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10)
  }, [stockRows])

  /* consumption over time (line) */
  const consumptionOverTime = useMemo(() => {
    const m = {}
    consumptions.forEach(c => {
      const d = fmtDate(c.consumption_date)
      m[d] = (m[d] || 0) + Number(c.quantity || 0)
    })
    return Object.entries(m).sort((a, b) => a[0].localeCompare(b[0])).map(([date, qty]) => ({ date: date.slice(5), qty }))
  }, [consumptions])

  /* allocation breakdown (pie + bar) */
  const allocationData = useMemo(() => {
    const m = {}
    consumptions.forEach(c => { m[c.allocated_to] = (m[c.allocated_to] || 0) + Number(c.quantity || 0) })
    return Object.entries(m).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
  }, [consumptions])

  /* stock levels bar */
  const levelsChartData = useMemo(() =>
    levels.map(l => ({ name: l.item_name, remaining: l.remaining, min: l.min_level || 0, unit: l.unit_type }))
  , [levels])

  const CHART_TABS = [
    { id: 'spend', label: 'Spend' },
    { id: 'consumption', label: 'Usage' },
    { id: 'allocation', label: 'Allocation' },
    { id: 'levels', label: 'Levels' },
  ]

  return (
    <div className="p-4 space-y-5">

      {/* ── KPI row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <KpiCard icon={DollarSign} label="Purchase value" value={`${fmt$(kpi.purchased)}`} sub="Total spend" color="default" />
        <KpiCard icon={UtensilsCrossed} label="Units consumed" value={kpi.consumedQty.toLocaleString()} sub="All records" color="sky" />
        <KpiCard icon={Boxes} label="Stock batches" value={String(kpi.batches)} sub="Receipts" color="emerald" />
        <KpiCard icon={AlertOctagon} label="Low / Out" value={String(kpi.low)} sub={kpi.low > 0 ? 'Needs attention' : 'All good'} color={kpi.low > 0 ? 'rose' : 'default'} />
        <KpiCard icon={CalendarClock} label="Expired" value={String(kpi.expired)} sub="batches" color={kpi.expired > 0 ? 'rose' : 'default'} />
        <KpiCard icon={AlertTriangle} label="Expiring soon" value={String(kpi.expirySoon)} sub="batches" color={kpi.expirySoon > 0 ? 'amber' : 'default'} />
      </div>

      {/* ── Export ── */}
      <StoreExportBar
        variant="panel"
        disabled={!stockRows.length && !consumptions.length}
        onExportPdf={() => exportFoodInventoryPdf(exportPayload)}
        onExportExcel={() => exportFoodInventoryExcel(exportPayload)}
      />

      {/* ── Chart navigator ── */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-2xl w-full sm:w-auto sm:inline-flex">
        {CHART_TABS.map(t => (
          <button key={t.id} type="button" onClick={() => setChartView(t.id)}
            className={`flex-1 sm:flex-none px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${chartView === t.id ? 'bg-white text-[#0B1340] shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Charts ── */}
      <AnimatePresence mode="wait">
        <motion.div key={chartView} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>

          {/* SPEND BY ITEM — horizontal bar */}
          {chartView === 'spend' && (
            <ChartCard title="Spend by item" subtitle="Top 10 items by total purchase cost">
              {spendByItem.length === 0 ? (
                <EmptyState icon={DollarSign} title="No spend data" hint="Receive food with costs to see spend analysis." />
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={spendByItem} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F3F4F6" />
                    <XAxis type="number" tickFormatter={v => fmt$(v)} tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#374151', fontWeight: 600 }} axisLine={false} tickLine={false} width={100} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: '#F9FAFB' }} />
                    <Bar dataKey="value" name="Cost" radius={[0, 8, 8, 0]}>
                      {spendByItem.map((_, i) => <Cell key={i} fill={i === 0 ? '#F59E0B' : i === 1 ? '#0B1340' : '#E5E7EB'} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          )}

          {/* CONSUMPTION OVER TIME — line */}
          {chartView === 'consumption' && (
            <div className="space-y-4">
              <ChartCard title="Consumption over time" subtitle="Daily usage trend across all items">
                {consumptionOverTime.length === 0 ? (
                  <EmptyState icon={UtensilsCrossed} title="No consumption data" hint="Record consumption to see usage trends." />
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={consumptionOverTime} margin={{ left: 0, right: 16, top: 8, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                      <Tooltip content={<ChartTooltip suffix=" units" />} />
                      <Line type="monotone" dataKey="qty" name="Qty" stroke="#F59E0B" strokeWidth={2.5} dot={{ fill: '#F59E0B', strokeWidth: 0, r: 4 }} activeDot={{ r: 6, fill: '#0B1340' }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              {/* Top consumed items */}
              {(() => {
                const byItem = {}
                consumptions.forEach(c => { byItem[c.item_name] = (byItem[c.item_name] || 0) + Number(c.quantity || 0) })
                const data = Object.entries(byItem).map(([name, value]) => ({ name, value })).sort((a,b)=>b.value-a.value).slice(0,8)
                return data.length > 0 && (
                  <ChartCard title="Top consumed items" subtitle="Highest usage by quantity">
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={data} margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                        <Tooltip content={<ChartTooltip suffix=" units" />} cursor={{ fill: '#F9FAFB' }} />
                        <Bar dataKey="value" name="Qty" radius={[6, 6, 0, 0]}>
                          {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>
                )
              })()}
            </div>
          )}

          {/* ALLOCATION — pie + bar */}
          {chartView === 'allocation' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ChartCard title="Allocation breakdown" subtitle="Consumption by allocation category">
                {allocationData.length === 0 ? (
                  <EmptyState icon={Layers} title="No allocation data" />
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={allocationData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100}
                        innerRadius={55} paddingAngle={3} label={({ name, percent }) => `${(percent*100).toFixed(0)}%`}
                        labelLine={false}>
                        {allocationData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                      <Tooltip content={<ChartTooltip suffix=" units" />} />
                      <Legend formatter={v => <span style={{ fontSize: 11, fontWeight: 600, color: '#374151' }}>{v}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              <ChartCard title="Allocation quantity" subtitle="Units consumed per category">
                {allocationData.length === 0 ? (
                  <EmptyState icon={UtensilsCrossed} title="No data" />
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={allocationData} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F3F4F6" />
                      <XAxis type="number" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#374151', fontWeight: 600 }} axisLine={false} tickLine={false} width={110} />
                      <Tooltip content={<ChartTooltip suffix=" units" />} cursor={{ fill: '#F9FAFB' }} />
                      <Bar dataKey="value" name="Qty" radius={[0, 8, 8, 0]}>
                        {allocationData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>
            </div>
          )}

          {/* LEVELS — grouped bar */}
          {chartView === 'levels' && (
            <div className="space-y-4">
              <ChartCard title="Stock levels vs. minimum" subtitle="Current remaining quantity against minimum threshold">
                {levelsChartData.length === 0 ? (
                  <EmptyState icon={BarChart3} title="No levels data" hint="Receive food to see stock levels." />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={levelsChartData} margin={{ left: 8, right: 16, top: 8, bottom: 24 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6B7280', fontWeight: 600 }} axisLine={false} tickLine={false} angle={-25} textAnchor="end" />
                      <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                      <Tooltip content={<ChartTooltip />} cursor={{ fill: '#F9FAFB' }} />
                      <Legend formatter={v => <span style={{ fontSize: 11, fontWeight: 600, color: '#6B7280' }}>{v}</span>} />
                      <Bar dataKey="remaining" name="Remaining" radius={[6, 6, 0, 0]} fill="#0B1340" />
                      <Bar dataKey="min" name="Min level" radius={[6, 6, 0, 0]} fill="#FCD34D" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              {/* Level status table */}
              <ChartCard title="Level status" subtitle="Quick overview of all items">
                <div className="space-y-2">
                  {levelsChartData.length === 0 ? (
                    <p className="text-sm text-gray-300 text-center py-4">No data</p>
                  ) : levelsChartData.map((l, i) => {
                    const pct = l.min > 0 ? Math.min(100, (l.remaining / l.min) * 100) : 100
                    const color = pct >= 100 ? 'bg-emerald-400' : pct >= 50 ? 'bg-amber-400' : 'bg-rose-400'
                    const textColor = pct >= 100 ? 'text-emerald-700 bg-emerald-50' : pct >= 50 ? 'text-amber-700 bg-amber-50' : 'text-rose-600 bg-rose-50'
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <p className="text-xs font-bold text-[#0B1340] w-28 shrink-0 truncate">{l.name}</p>
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${textColor}`}>
                          {l.remaining} / {l.min || '?'} {l.unit}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </ChartCard>
            </div>
          )}

        </motion.div>
      </AnimatePresence>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════ */
export default function FoodInventory() {
  const [activeTab, setActiveTab] = useState('stock-in')
  const [stockRows, setStockRows] = useState([])
  const [consumptions, setConsumptions] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [academic, setAcademic] = useState({ academicYears: [], activeTerms: [], academicYear: '', currentTerm: '' })
  const [filterYear, setFilterYear] = useState('')
  const [filterTerm, setFilterTerm] = useState('')
  const [stockDateFrom, setStockDateFrom] = useState('')
  const [stockDateTo, setStockDateTo] = useState('')
  const [consumeDateFrom, setConsumeDateFrom] = useState('')
  const [consumeDateTo, setConsumeDateTo] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [stockForm, setStockForm] = useState(EMPTY_FOOD_STOCK_FORM)
  const [consumeForm, setConsumeForm] = useState(EMPTY_FOOD_CONSUME_FORM)
  const [editingStockId, setEditingStockId] = useState(null)
  const [editingConsumptionId, setEditingConsumptionId] = useState(null)
  const [toast, setToast] = useState(null)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const showToast = (msg, type = 'success') => setToast({ message: msg, type })

  const reportFilters = useMemo(() => ({
    academicYear: filterYear,
    term: filterTerm,
    dateFrom: stockDateFrom || consumeDateFrom || '',
    dateTo: stockDateTo || consumeDateTo || '',
  }), [filterYear, filterTerm, stockDateFrom, stockDateTo, consumeDateFrom, consumeDateTo])

  const loadAll = useCallback(async ({ silent = false, year, term: termVal, stockFrom, stockTo, consumeFrom, consumeTo } = {}) => {
    if (!silent) setLoading(true)
    setError('')
    const y = year ?? filterYear; const t = termVal ?? filterTerm
    const stockF = { academic_year: y || undefined, term: t || undefined, from_date: (stockFrom ?? stockDateFrom) || undefined, to_date: (stockTo ?? stockDateTo) || undefined }
    const conF = { academic_year: y || undefined, term: t || undefined, from_date: (consumeFrom ?? consumeDateFrom) || undefined, to_date: (consumeTo ?? consumeDateTo) || undefined }
    try {
      const [stock, cons] = await Promise.all([fetchFoodStockIns(stockF), fetchFoodConsumptions(conF)])
      setStockRows(stock); setConsumptions(cons)
      try { setSuppliers(await fetchSuppliers()) } catch {}
      try { setAcademic(await fetchStoreAcademicSettings()) } catch {}
    } catch (e) { setError(e.message || 'Failed to load food inventory') }
    finally { if (!silent) setLoading(false) }
  }, [filterYear, filterTerm, stockDateFrom, stockDateTo, consumeDateFrom, consumeDateTo])

  useEffect(() => { loadAll() }, [loadAll])
  useEffect(() => {
    if (!academic.academicYear) return
    setFilterYear(p => p || academic.academicYear || '')
    setFilterTerm(p => p || academic.currentTerm || '')
  }, [academic.academicYear, academic.currentTerm])

  const defaultStockForm = useMemo(() => ({ ...EMPTY_FOOD_STOCK_FORM, academic_year: filterYear || academic.academicYear || '', term: filterTerm || academic.currentTerm || '', receive_date: new Date().toISOString().slice(0,10) }), [filterYear, filterTerm, academic])
  const defaultConsumeForm = useMemo(() => ({ ...EMPTY_FOOD_CONSUME_FORM, academic_year: filterYear || academic.academicYear || '', term: filterTerm || academic.currentTerm || '', consumption_date: new Date().toISOString().slice(0,10) }), [filterYear, filterTerm, academic])

  const levels = useMemo(() => aggregateFoodLevels(stockRows), [stockRows])
  const filteredStock = useMemo(() => { const q = search.trim().toLowerCase(); return q ? stockRows.filter(r => r.item_name.toLowerCase().includes(q) || (r.supplier_name||'').toLowerCase().includes(q)) : stockRows }, [stockRows, search])
  const availableBatches = useMemo(() => stockRows.filter(r => Number(r.remaining_quantity) > 0), [stockRows])
  const consumeBatchOptions = useMemo(() => { const eId = editingConsumptionId ? consumeForm.food_stock_in_id : null; return stockRows.filter(r => Number(r.remaining_quantity) > 0 || String(r.id) === String(eId)) }, [stockRows, editingConsumptionId, consumeForm.food_stock_in_id])
  const editingConsumptionRow = useMemo(() => consumptions.find(c => c.id === editingConsumptionId) || null, [consumptions, editingConsumptionId])

  const openStockModal = (row = null) => {
    if (row) { setEditingStockId(row.id); setStockForm({ academic_year: row.academic_year, term: row.term, supplier_id: row.supplier_id ? String(row.supplier_id) : '', receive_date: row.receive_date, invoice_number: row.invoice_number, item_name: row.item_name, quantity: String(row.quantity), unit_cost: row.unit_cost !== '' ? String(row.unit_cost) : '', min_level: row.min_level ? String(row.min_level) : '', expiry_date: row.expiry_date || '', store_location: row.store_location || '', note: row.note, ...foodUnitToFormFields(row.unit_type) }) }
    else { setEditingStockId(null); setStockForm({ ...EMPTY_FOOD_STOCK_FORM, academic_year: filterYear || academic.academicYear || '', term: filterTerm || academic.currentTerm || '', receive_date: new Date().toISOString().slice(0,10) }) }
    setModal('stockin')
  }
  const openConsumeModal = (row = null) => {
    if (row) { setEditingConsumptionId(row.id); setConsumeForm(foodConsumptionToFormFields(row)) }
    else { setEditingConsumptionId(null); setConsumeForm({ ...defaultConsumeForm }) }
    setModal('consume')
  }

  const onStockChange = e => { const { name, value } = e.target; setStockForm(f => ({ ...f, [name]: value })) }
  const onConsumeChange = e => {
    const { name, value } = e.target
    setConsumeForm(f => { const next = { ...f, [name]: value }; if (name === 'food_stock_in_id' && value) { const b = stockRows.find(r => String(r.id) === String(value)); if (b) next.unit_type = b.unit_type } return next })
  }

  const handleSaveStock = async () => {
    if (!stockForm.item_name.trim() || !stockForm.quantity) return
    if (!stockForm.academic_year || !stockForm.term) { setError('Select academic year and term.'); return }
    setSaving(true); setError('')
    try {
      const payload = mapFoodStockToApi(stockForm)
      if (editingStockId) await updateFoodStockIn(editingStockId, payload)
      else await createFoodStockIn(payload)
      const y = stockForm.academic_year; const t = stockForm.term
      setFilterYear(y); setFilterTerm(t); setModal(null); setActiveTab('stock-in')
      await loadAll({ silent: true, year: y, term: t })
      showToast(editingStockId ? `Updated ${stockForm.item_name.trim()}` : `Received ${stockForm.quantity} ${resolveFoodUnitFromForm(stockForm)} of ${stockForm.item_name.trim()}`)
    } catch (e) { const msg = e.response?.data?.message || e.message || 'Failed'; setError(msg); showToast(msg,'error') }
    finally { setSaving(false) }
  }

  const handleSaveConsume = async () => {
    if (!consumeForm.food_stock_in_id || !consumeForm.quantity || !consumeForm.allocated_to) return
    if (consumeForm.allocated_to === 'Other' && !consumeForm.allocated_other.trim()) { setError('Specify allocation'); return }
    setSaving(true); setError('')
    try {
      const payload = mapFoodConsumptionToApi(consumeForm); const wasEdit = editingConsumptionId
      if (wasEdit) await updateFoodConsumption(wasEdit, payload); else await createFoodConsumption(payload)
      setModal(null); setEditingConsumptionId(null)
      await loadAll({ silent: true, year: consumeForm.academic_year || filterYear, term: consumeForm.term || filterTerm })
      showToast(wasEdit ? 'Consumption updated' : 'Consumption recorded')
    } catch (e) { const msg = e.response?.data?.message || e.message || 'Failed'; setError(msg); showToast(msg,'error') }
    finally { setSaving(false) }
  }

  const handleDeleteStock = async () => {
    if (!deleteTarget?.stockId) return; setSaving(true)
    try { await deleteFoodStockIn(deleteTarget.stockId); setDeleteTarget(null); await loadAll({ silent: true }); showToast('Receipt deleted') }
    catch (e) { showToast(e.message || 'Failed','error') } finally { setSaving(false) }
  }
  const handleDeleteConsumption = async () => {
    if (!deleteTarget?.consumptionId) return; setSaving(true)
    try { await deleteFoodConsumption(deleteTarget.consumptionId); setDeleteTarget(null); await loadAll({ silent: true }); showToast('Consumption reversed') }
    catch (e) { showToast(e.message || 'Failed','error') } finally { setSaving(false) }
  }

  const selectedBatch = stockRows.find(r => String(r.id) === String(consumeForm.food_stock_in_id))
  const maxConsumeQty = useMemo(() => {
    if (!selectedBatch) return 0
    const rem = Number(selectedBatch.remaining_quantity) || 0
    if (editingConsumptionRow && String(editingConsumptionRow.food_stock_in_id) === String(selectedBatch.id)) return rem + Number(editingConsumptionRow.quantity || 0)
    return rem
  }, [selectedBatch, editingConsumptionRow])

  return (
    <StorekeeperPageShell titleLine="Food Inventory" subtitle="Receive food, track consumption, monitor levels" icon={Apple}>
      <StorekeeperToast message={toast?.message} type={toast?.type} onDismiss={() => setToast(null)} />

      <div className="space-y-4 pb-8">
        {/* Hero */}
        <div className="rounded-2xl bg-[#0B1340] p-5 text-white relative overflow-hidden">
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-amber-400/10 blur-2xl pointer-events-none" />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <div className="w-5 h-5 rounded-md bg-amber-400 flex items-center justify-center"><Apple size={11} className="text-[#0B1340]" /></div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400/80">Food Store</span>
              </div>
              <h1 className="text-xl font-black tracking-tight">Food Inventory</h1>
              <p className="text-[11px] text-white/40 mt-0.5">Suppliers · Academic year · Stock levels</p>
            </div>
            <button type="button" onClick={loadAll} disabled={loading} className="shrink-0 p-2.5 rounded-xl bg-white/8 border border-white/10 hover:bg-white/15 transition">
              <RefreshCw size={15} className={loading ? 'animate-spin text-amber-400' : 'text-white/60'} />
            </button>
          </div>
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity:0, y:-4 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
              className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-rose-50 border border-rose-100 text-rose-700 text-sm">
              <AlertCircle size={15} className="shrink-0" />
              <span className="flex-1 text-xs font-medium">{error}</span>
              <button type="button" onClick={() => setError('')}><X size={14} /></button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filters */}
        <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
          <div className="flex gap-2 p-3">
            <div className="flex-1 relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search item or supplier…"
                className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm placeholder:text-gray-300 focus:bg-white focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 outline-none transition-all" />
            </div>
            <button type="button" onClick={() => setFiltersOpen(o => !o)}
              className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-xs font-bold uppercase transition ${filtersOpen ? 'bg-[#0B1340] text-white border-[#0B1340]' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
              Filters <ChevronDown size={12} className={`transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>
          <AnimatePresence>
            {filtersOpen && (
              <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }} exit={{ height:0, opacity:0 }} className="overflow-hidden">
                <div className="px-3 pb-3 space-y-3 border-t border-gray-50 pt-3">
                  <div className="grid grid-cols-2 gap-2">
                    <Field icon={GraduationCap} label="Year">
                      <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className={input}>
                        <option value="">All years</option>
                        {academic.academicYears.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </Field>
                    <Field icon={Calendar} label="Term">
                      <select value={filterTerm} onChange={e => setFilterTerm(e.target.value)} className={input}>
                        <option value="">All terms</option>
                        {academic.activeTerms.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </Field>
                  </div>
                  {activeTab === 'stock-in' && <DateRange from={stockDateFrom} to={stockDateTo} onFrom={setStockDateFrom} onTo={setStockDateTo} />}
                  {activeTab === 'consumption' && <DateRange from={consumeDateFrom} to={consumeDateTo} onFrom={setConsumeDateFrom} onTo={setConsumeDateTo} />}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-gray-100 rounded-2xl">
          {TABS.map(t => { const Icon = t.icon; return (
            <button key={t.id} type="button" onClick={() => setActiveTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-1 rounded-xl text-xs font-bold transition-all ${activeTab === t.id ? 'bg-white text-[#0B1340] shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
              <Icon size={13} /><span className="hidden sm:inline">{t.label}</span>
            </button>
          )})}
        </div>

        {/* Content */}
        <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden min-h-[320px]">
          {loading ? (
            <div className="flex items-center justify-center py-20"><Loader2 size={28} className="animate-spin text-gray-200" /></div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div key={activeTab} initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ duration:0.15 }}>

                {/* STOCK IN */}
                {activeTab === 'stock-in' && (
                  <div>
                    <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-50">
                      <p className="text-sm font-bold text-[#0B1340]">{filteredStock.length} receipts</p>
                      <button type="button" onClick={() => openStockModal()} className="flex items-center gap-2 bg-amber-400 text-[#0B1340] px-4 py-2 rounded-xl text-xs font-black uppercase shadow-sm hover:bg-amber-300 active:scale-95 transition-all">
                        <Plus size={14} /> Receive Food
                      </button>
                    </div>
                    {filteredStock.length === 0 ? (
                      <EmptyState icon={Package} title="No stock receipts" hint="Receive food to get started, or adjust your filters." />
                    ) : (
                      <>
                        <div className="sm:hidden divide-y divide-gray-50">
                          {filteredStock.map(row => (
                            <div key={row.id} className="px-4 py-3.5">
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div><p className="font-bold text-[#0B1340] text-sm">{row.item_name}</p><p className="text-[11px] text-gray-400 mt-0.5">{fmtDate(row.receive_date)} · {row.academic_year} {row.term}</p></div>
                                <div className="flex gap-1 shrink-0">
                                  <button type="button" onClick={() => openStockModal(row)} className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600 transition"><Pencil size={13} /></button>
                                  <button type="button" onClick={() => setDeleteTarget({ stockId: row.id, label: row.item_name })} className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-500 transition"><Trash2 size={13} /></button>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                <Badge color="emerald">{row.remaining_quantity} {row.unit_type} left</Badge>
                                {row.supplier_name && <Badge color="gray">{row.supplier_name}</Badge>}
                                {row.store_location && <Badge color="sky"><MapPin size={9} className="mr-0.5" />{row.store_location}</Badge>}
                                {row.expiry_date && (isExpired(row.expiry_date) ? <Badge color="rose">Expired {fmtDate(row.expiry_date)}</Badge> : isExpirySoon(row.expiry_date) ? <Badge color="amber">Exp {fmtDate(row.expiry_date)}</Badge> : <Badge color="gray">Exp {fmtDate(row.expiry_date)}</Badge>)}
                              </div>
                              <div className="flex gap-4 mt-2.5">
                                <div><p className="text-[10px] text-gray-400 uppercase font-bold">Received</p><p className="text-xs font-semibold text-gray-700">{row.quantity} {row.unit_type}</p></div>
                                <div><p className="text-[10px] text-gray-400 uppercase font-bold">Unit cost</p><p className="text-xs font-semibold text-gray-700">{row.unit_cost !== '' ? fmt$(row.unit_cost) : '—'}</p></div>
                                <div><p className="text-[10px] text-gray-400 uppercase font-bold">Total</p><p className="text-xs font-bold text-[#0B1340]">{fmt$(row.total_cost)}</p></div>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="hidden sm:block overflow-x-auto">
                          <table className="w-full text-sm min-w-[860px]">
                            <thead>
                              <tr className="border-b border-gray-50 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                {['Date','Item','Location','Expiry','Supplier','Year/Term','Received','Remaining','Unit cost','Total',''].map((h,i) => (
                                  <th key={i} className={`px-4 py-3 font-bold ${i >= 6 ? 'text-right' : 'text-left'}`}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {filteredStock.map(row => (
                                <tr key={row.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors">
                                  <td className="px-4 py-3 text-gray-400 text-xs">{fmtDate(row.receive_date)}</td>
                                  <td className="px-4 py-3 font-bold text-[#0B1340]">{row.item_name}</td>
                                  <td className="px-4 py-3">{row.store_location ? <span className="flex items-center gap-1 text-xs text-gray-500"><MapPin size={11} className="text-emerald-500" />{row.store_location}</span> : <span className="text-gray-200">—</span>}</td>
                                  <td className="px-4 py-3">{!row.expiry_date ? <span className="text-gray-200 text-xs">—</span> : isExpired(row.expiry_date) ? <Badge color="rose">{fmtDate(row.expiry_date)}</Badge> : isExpirySoon(row.expiry_date) ? <Badge color="amber">{fmtDate(row.expiry_date)}</Badge> : <span className="text-xs text-gray-500">{fmtDate(row.expiry_date)}</span>}</td>
                                  <td className="px-4 py-3 text-gray-600 text-xs">{row.supplier_name || <span className="text-gray-200">—</span>}</td>
                                  <td className="px-4 py-3"><span className="text-xs text-gray-400">{row.academic_year} · {row.term}</span></td>
                                  <td className="px-4 py-3 text-right text-xs text-gray-600">{row.quantity} <span className="text-gray-400">{row.unit_type}</span></td>
                                  <td className="px-4 py-3 text-right"><span className="font-bold text-emerald-700 text-xs">{row.remaining_quantity}</span> <span className="text-gray-400 text-xs">{row.unit_type}</span></td>
                                  <td className="px-4 py-3 text-right text-xs text-gray-600">{row.unit_cost !== '' ? fmt$(row.unit_cost) : <span className="text-gray-200">—</span>}</td>
                                  <td className="px-4 py-3 text-right font-bold text-[#0B1340] text-xs">{fmt$(row.total_cost)}</td>
                                  <td className="px-4 py-3"><div className="flex justify-end gap-1">
                                    <button type="button" onClick={() => openStockModal(row)} className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600 transition"><Pencil size={13} /></button>
                                    <button type="button" onClick={() => setDeleteTarget({ stockId: row.id, label: row.item_name })} className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-400 transition"><Trash2 size={13} /></button>
                                  </div></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* CONSUMPTION */}
                {activeTab === 'consumption' && (
                  <div>
                    <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-50">
                      <p className="text-sm font-bold text-[#0B1340]">{consumptions.length} records</p>
                      <button type="button" onClick={openConsumeModal} disabled={!availableBatches.length}
                        className="flex items-center gap-2 bg-[#0B1340] text-white px-4 py-2 rounded-xl text-xs font-black uppercase hover:bg-[#1C2A6E] active:scale-95 disabled:opacity-30 transition-all">
                        <UtensilsCrossed size={14} /> Record
                      </button>
                    </div>
                    {consumptions.length === 0 ? (
                      <EmptyState icon={UtensilsCrossed} title="No consumption recorded" hint="Record food consumption to track usage." />
                    ) : (
                      <>
                        <div className="sm:hidden divide-y divide-gray-50">
                          {consumptions.map(c => (
                            <div key={c.id} className="px-4 py-3.5">
                              <div className="flex items-start justify-between gap-2">
                                <div><p className="font-bold text-[#0B1340] text-sm">{c.item_name}</p><p className="text-[11px] text-gray-400 mt-0.5">{fmtDate(c.consumption_date)} · {c.academic_year} {c.term}</p></div>
                                <div className="flex gap-1 shrink-0">
                                  <button type="button" onClick={() => openConsumeModal(c)} className="p-1.5 rounded-lg hover:bg-sky-50 text-sky-600 transition"><Pencil size={13} /></button>
                                  <button type="button" onClick={() => setDeleteTarget({ consumptionId: c.id, label: c.item_name })} className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-400 transition"><Trash2 size={13} /></button>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 mt-2"><Badge color="sky">{c.allocated_to}</Badge><span className="text-xs font-bold text-gray-700">{c.quantity} {c.unit_type}</span></div>
                            </div>
                          ))}
                        </div>
                        <div className="hidden sm:block overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-gray-50 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                {['Date','Item','Allocated to','Year/Term','Quantity',''].map((h,i) => (
                                  <th key={i} className={`px-4 py-3 font-bold ${i===4 ? 'text-right' : 'text-left'}`}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {consumptions.map(c => (
                                <tr key={c.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors">
                                  <td className="px-4 py-3 text-gray-400 text-xs">{fmtDate(c.consumption_date)}</td>
                                  <td className="px-4 py-3 font-semibold text-[#0B1340]">{c.item_name}</td>
                                  <td className="px-4 py-3"><Badge color="sky">{c.allocated_to}</Badge></td>
                                  <td className="px-4 py-3 text-xs text-gray-400">{c.academic_year} · {c.term}</td>
                                  <td className="px-4 py-3 text-right font-bold text-[#0B1340] text-xs">{c.quantity} <span className="font-normal text-gray-400">{c.unit_type}</span></td>
                                  <td className="px-4 py-3"><div className="flex justify-end gap-1">
                                    <button type="button" onClick={() => openConsumeModal(c)} className="p-1.5 rounded-lg hover:bg-sky-50 text-sky-600 transition"><Pencil size={13} /></button>
                                    <button type="button" onClick={() => setDeleteTarget({ consumptionId: c.id, label: c.item_name })} className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-400 transition"><Trash2 size={13} /></button>
                                  </div></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* LEVELS */}
                {activeTab === 'levels' && (
                  <div>
                    <div className="px-4 py-3.5 border-b border-gray-50"><p className="text-sm font-bold text-[#0B1340]">Stock levels</p></div>
                    {levels.length === 0 ? (
                      <EmptyState icon={BarChart3} title="No levels to display" hint="Receive food to see stock levels." />
                    ) : (
                      <div className="divide-y divide-gray-50">
                        {levels.map(s => {
                          const pct = s.min_level ? Math.min(100,(s.remaining/s.min_level)*100) : 100
                          const statusColor = s.status==='Normal' ? 'emerald' : s.status==='Low Stock' ? 'amber' : 'rose'
                          return (
                            <div key={`${s.item_name}-${s.unit_type}`} className="px-4 py-4">
                              <div className="flex items-center justify-between mb-2">
                                <p className="font-bold text-[#0B1340] text-sm">{s.item_name}</p>
                                <Badge color={statusColor}>{s.status}</Badge>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full transition-all ${s.status==='Normal' ? 'bg-emerald-400' : s.status==='Low Stock' ? 'bg-amber-400' : 'bg-rose-400'}`} style={{ width:`${pct}%` }} />
                                </div>
                                <span className="text-xs text-gray-500 shrink-0 font-medium">{s.remaining} / {s.min_level||'?'} {s.unit_type}</span>
                              </div>
                            </div>
                          )
                        })}
                        {levels.filter(s => s.status !== 'Normal').length > 0 && (
                          <div className="px-4 py-3 bg-amber-50/50">
                            {levels.filter(s => s.status !== 'Normal').map(s => (
                              <div key={s.item_name} className="flex items-center gap-2 text-xs text-amber-700 py-1">
                                <AlertTriangle size={12} className="shrink-0" />
                                <span><strong>{s.item_name}</strong>: {s.remaining} {s.unit_type} remaining (min {s.min_level})</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* REPORTS */}
                {activeTab === 'reports' && (
                  <ReportsTab
                    stockRows={stockRows}
                    consumptions={consumptions}
                    levels={levels}
                    filters={reportFilters}
                  />
                )}

              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* MODALS */}
      {/* Receive Food Modal */}
      <AnimatePresence>
        {modal === 'stockin' && (
          <>
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={() => setModal(null)} />
            <motion.div initial={{ opacity:0, y:32 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:16 }} transition={{ type:'spring', stiffness:400, damping:35 }}
              className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-none">
              <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-lg pointer-events-auto flex flex-col max-h-[92vh]" onClick={e => e.stopPropagation()}>
                <div className="px-6 py-5 bg-[#0B1340] text-white rounded-t-3xl shrink-0">
                  <div className="flex items-center justify-between">
                    <div><p className="text-[10px] font-bold uppercase tracking-widest text-amber-400/80">Food stock in</p><h2 className="text-lg font-black mt-0.5">{editingStockId ? 'Edit receipt' : 'Receive Food'}</h2></div>
                    <button type="button" onClick={() => setModal(null)} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition"><X size={16} /></button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  <div className="rounded-2xl bg-gray-50 border border-gray-100 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Period</p>
                    <div className="grid grid-cols-2 gap-3">
                      <Field icon={GraduationCap} label="Year *">
                        <select name="academic_year" value={stockForm.academic_year} onChange={onStockChange} className={input}>
                          {academic.academicYears.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                      </Field>
                      <Field icon={Calendar} label="Term *">
                        <select name="term" value={stockForm.term} onChange={onStockChange} className={input}>
                          {academic.activeTerms.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </Field>
                    </div>
                  </div>
                  <Field icon={Package} label="Item name *"><input name="item_name" value={stockForm.item_name} onChange={onStockChange} placeholder="e.g. Beans, Rice" className={input} /></Field>
                  <Field icon={Building2} label="Supplier">
                    <select name="supplier_id" value={stockForm.supplier_id} onChange={onStockChange} className={input}>
                      <option value="">— Select supplier —</option>
                      {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field icon={Calendar} label="Receive date"><input type="date" name="receive_date" value={stockForm.receive_date} onChange={onStockChange} className={input} /></Field>
                    <Field icon={Hash} label="Invoice no."><input name="invoice_number" value={stockForm.invoice_number} onChange={onStockChange} className={input} /></Field>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field icon={Ruler} label="Quantity *"><input type="number" min={0} step="any" name="quantity" value={stockForm.quantity} onChange={onStockChange} className={input} /></Field>
                    <Field icon={Ruler} label="Unit *">
                      <select name="unit_type" value={stockForm.unit_type} onChange={onStockChange} className={input}>
                        {FOOD_UNIT_TYPES.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </Field>
                  </div>
                  {stockForm.unit_type === 'Other' && <Field label="Specify unit"><input name="unit_type_other" value={stockForm.unit_type_other} onChange={onStockChange} placeholder="e.g. tins" className={input} /></Field>}
                  <div className="grid grid-cols-2 gap-3">
                    <Field icon={CalendarClock} label="Expiry date"><input type="date" name="expiry_date" value={stockForm.expiry_date} onChange={onStockChange} className={input} /></Field>
                    <Field icon={MapPin} label="Store location">
                      {(() => {
                        const presets = FOOD_STORE_LOCATIONS.filter(l => l !== 'Other')
                        const selectVal = presets.includes(stockForm.store_location) ? stockForm.store_location : stockForm.store_location ? 'Other' : ''
                        return (<>
                          <select value={selectVal} onChange={e => { const v = e.target.value; setStockForm(f => ({ ...f, store_location: v === 'Other' ? (presets.includes(f.store_location) ? '' : f.store_location) : v })) }} className={input}>
                            <option value="">— Select —</option>
                            {FOOD_STORE_LOCATIONS.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                          </select>
                          {selectVal === 'Other' && <input name="store_location" value={presets.includes(stockForm.store_location) ? '' : stockForm.store_location} onChange={onStockChange} placeholder="e.g. Annex" className={`${input} mt-2`} />}
                        </>)
                      })()}
                    </Field>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field icon={DollarSign} label="Unit cost"><input type="number" min={0} name="unit_cost" value={stockForm.unit_cost} onChange={onStockChange} className={input} /></Field>
                    <Field icon={AlertTriangle} label="Min level (alert)"><input type="number" min={0} name="min_level" value={stockForm.min_level} onChange={onStockChange} placeholder="Alert below" className={input} /></Field>
                  </div>
                </div>
                <div className="shrink-0 px-5 py-4 border-t border-gray-100 flex gap-2">
                  <button type="button" onClick={() => setModal(null)} className="flex-1 py-3 rounded-xl border border-gray-200 text-xs font-bold uppercase text-gray-500 hover:bg-gray-50 transition">Cancel</button>
                  <button type="button" onClick={handleSaveStock} disabled={saving || !stockForm.item_name.trim() || !stockForm.quantity}
                    className="flex-1 py-3 rounded-xl bg-[#0B1340] text-white text-xs font-bold uppercase flex items-center justify-center gap-2 disabled:opacity-40 hover:bg-[#1C2A6E] transition">
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <BadgeCheck size={14} />}
                    {editingStockId ? 'Update' : 'Save'}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Consumption Modal */}
      <AnimatePresence>
        {modal === 'consume' && (
          <>
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={() => { setModal(null); setEditingConsumptionId(null) }} />
            <motion.div initial={{ opacity:0, y:32 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:16 }} transition={{ type:'spring', stiffness:400, damping:35 }}
              className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-none">
              <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-lg pointer-events-auto overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="px-6 py-5 bg-[#0B1340] text-white rounded-t-3xl">
                  <div className="flex items-center justify-between">
                    <div><p className="text-[10px] font-bold uppercase tracking-widest text-sky-300/80">Consumption</p><h2 className="text-lg font-black mt-0.5">{editingConsumptionId ? 'Edit consumption' : 'Record Consumption'}</h2></div>
                    <button type="button" onClick={() => { setModal(null); setEditingConsumptionId(null) }} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition"><X size={16} /></button>
                  </div>
                </div>
                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <Field icon={GraduationCap} label="Year"><select name="academic_year" value={consumeForm.academic_year} onChange={onConsumeChange} className={input}>{academic.academicYears.map(y => <option key={y} value={y}>{y}</option>)}</select></Field>
                    <Field icon={Calendar} label="Term"><select name="term" value={consumeForm.term} onChange={onConsumeChange} className={input}>{academic.activeTerms.map(t => <option key={t} value={t}>{t}</option>)}</select></Field>
                  </div>
                  <Field icon={Package} label="Food batch *">
                    <select name="food_stock_in_id" value={consumeForm.food_stock_in_id} onChange={onConsumeChange} className={input}>
                      <option value="">Select batch</option>
                      {consumeBatchOptions.map(b => <option key={b.id} value={b.id}>{b.item_name} — {b.remaining_quantity} {b.unit_type} ({fmtDate(b.receive_date)})</option>)}
                    </select>
                  </Field>
                  {selectedBatch && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-100">
                      <Layers size={13} className="text-emerald-600 shrink-0" />
                      <span className="text-xs font-bold text-emerald-700">{maxConsumeQty} {selectedBatch.unit_type} available{editingConsumptionId ? ' (includes this record)' : ''}</span>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <Field icon={Ruler} label="Quantity *"><input type="number" min={0} step="any" name="quantity" value={consumeForm.quantity} onChange={onConsumeChange} className={input} /></Field>
                    <Field icon={Calendar} label="Date *"><input type="date" name="consumption_date" value={consumeForm.consumption_date} onChange={onConsumeChange} className={input} /></Field>
                  </div>
                  <Field icon={UtensilsCrossed} label="Allocated to *">
                    <select name="allocated_to" value={consumeForm.allocated_to} onChange={onConsumeChange} className={input}>
                      <option value="">Select</option>
                      {FOOD_ALLOCATIONS.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </Field>
                  {consumeForm.allocated_to === 'Other' && <Field label="Specify allocation *"><input name="allocated_other" value={consumeForm.allocated_other} onChange={onConsumeChange} placeholder="e.g. Staff canteen" className={input} /></Field>}
                </div>
                <div className="px-5 py-4 border-t border-gray-100 flex gap-2">
                  <button type="button" onClick={() => { setModal(null); setEditingConsumptionId(null) }} className="flex-1 py-3 rounded-xl border border-gray-200 text-xs font-bold uppercase text-gray-500 hover:bg-gray-50 transition">Cancel</button>
                  <button type="button" onClick={handleSaveConsume} disabled={saving || !consumeForm.food_stock_in_id || !consumeForm.quantity}
                    className="flex-1 py-3 rounded-xl bg-[#0B1340] text-white text-xs font-bold uppercase flex items-center justify-center gap-2 disabled:opacity-40 hover:bg-[#1C2A6E] transition">
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <BadgeCheck size={14} />}
                    {editingConsumptionId ? 'Update' : 'Save'}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Delete confirm */}
      <AnimatePresence>
        {deleteTarget && (
          <>
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} className="fixed inset-0 bg-black/40 z-[60]" onClick={() => !saving && setDeleteTarget(null)} />
            <motion.div initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0, scale:0.95 }} className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none">
              <div className="bg-white rounded-2xl shadow-2xl max-w-xs w-full p-6 pointer-events-auto">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center mb-4"><Trash2 size={18} className="text-rose-500" /></div>
                <h3 className="font-black text-[#0B1340]">Delete {deleteTarget.stockId ? 'receipt' : 'consumption'}?</h3>
                <p className="text-sm text-gray-400 mt-1">{deleteTarget.label}</p>
                <div className="flex gap-2 mt-5">
                  <button type="button" onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs font-bold uppercase text-gray-500 hover:bg-gray-50 transition">Cancel</button>
                  <button type="button" onClick={deleteTarget.stockId ? handleDeleteStock : handleDeleteConsumption} disabled={saving}
                    className="flex-1 py-2.5 rounded-xl bg-rose-500 text-white text-xs font-bold uppercase hover:bg-rose-600 disabled:opacity-40 transition">
                    {saving ? <Loader2 size={13} className="animate-spin mx-auto" /> : 'Delete'}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </StorekeeperPageShell>
  )
}