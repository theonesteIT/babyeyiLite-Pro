import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import {
  TrendingUp, Shirt, Loader2, AlertCircle, RefreshCw, Filter,
  BarChart3, Calendar, GraduationCap, Calculator, FileSpreadsheet,
  TrendingDown, Minus,
} from 'lucide-react'
import { fetchStoreAcademicSettings } from '../../services/academicSettingsService'
import {
  fetchUniformIssueAnalytics,
  fetchUniformIssueClasses,
  fetchUniformProfitCalculation,
  formatRwf,
} from '../../services/uniformIssueService'
import { fetchFinishedGoods } from '../../services/finishedGoodsService'
import { exportProfitCalculationExcel } from '../../utils/uniformInventoryExport'

const CHART_COLORS = ['#FEBF10', '#000435', '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#06b6d4', '#ec4899']

const ANALYTICS_TABS = [
  { id: 'overview', label: 'Sales overview', icon: BarChart3 },
  { id: 'profit', label: 'Profit calculation', icon: Calculator },
]

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white/95 backdrop-blur-md border border-gray-100 rounded-xl shadow-xl px-3 py-2.5 text-xs">
      <p className="font-bold text-[#000435] mb-1.5">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="text-gray-600">
          <span className="font-medium text-[#000435]">{p.name}: </span>
          {typeof p.value === 'number' && (p.dataKey === 'revenue' || p.name === 'Revenue')
            ? formatRwf(p.value)
            : Number(p.value || 0).toLocaleString()}
        </p>
      ))}
    </div>
  )
}

function ProfitBadge({ value }) {
  const n = Number(value) || 0
  if (n > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700">
        <TrendingUp size={12} /> Profit
      </span>
    )
  }
  if (n < 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-lg bg-red-50 text-red-600">
        <TrendingDown size={12} /> Loss
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-lg bg-gray-50 text-gray-500">
      <Minus size={12} /> Break-even
    </span>
  )
}

export default function UniformSalesAnalytics() {
  const [activeTab, setActiveTab] = useState('overview')
  const [academic, setAcademic] = useState({ academicYears: [], activeTerms: [], academicYear: '', currentTerm: '' })
  const [classes, setClasses] = useState([])
  const [finishedGoods, setFinishedGoods] = useState([])
  const [filters, setFilters] = useState({
    academic_year: '',
    term: '',
    class_name: '',
    from_date: '',
    to_date: '',
    finished_good_id: '',
  })
  const [data, setData] = useState(null)
  const [profitData, setProfitData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [profitLoading, setProfitLoading] = useState(false)
  const [error, setError] = useState('')
  const [profitError, setProfitError] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(true)

  const loadMeta = useCallback(async () => {
    const [acad, cls, goods] = await Promise.all([
      fetchStoreAcademicSettings(),
      fetchUniformIssueClasses(filters.academic_year),
      fetchFinishedGoods(),
    ])
    setAcademic(acad)
    setClasses(cls)
    setFinishedGoods(goods)
    if (!filters.academic_year) {
      setFilters((f) => ({ ...f, academic_year: acad.academicYear, term: acad.currentTerm }))
    }
  }, [filters.academic_year])

  const loadAnalytics = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = {}
      if (filters.academic_year) params.academic_year = filters.academic_year
      if (filters.term) params.term = filters.term
      if (filters.class_name) params.class_name = filters.class_name
      if (filters.from_date) params.from_date = filters.from_date
      if (filters.to_date) params.to_date = filters.to_date
      if (filters.finished_good_id) params.finished_good_id = filters.finished_good_id
      const res = await fetchUniformIssueAnalytics(params)
      setData(res)
    } catch (e) {
      setError(e.message || 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }, [filters])

  const loadProfit = useCallback(async () => {
    setProfitLoading(true)
    setProfitError('')
    try {
      const params = {}
      if (filters.academic_year) params.academic_year = filters.academic_year
      if (filters.term) params.term = filters.term
      if (filters.class_name) params.class_name = filters.class_name
      if (filters.from_date) params.from_date = filters.from_date
      if (filters.to_date) params.to_date = filters.to_date
      const res = await fetchUniformProfitCalculation(params)
      setProfitData(res)
    } catch (e) {
      setProfitError(e.message || 'Failed to load profit calculation')
    } finally {
      setProfitLoading(false)
    }
  }, [filters])

  const refreshAll = useCallback(() => {
    loadAnalytics()
    if (activeTab === 'profit') loadProfit()
  }, [loadAnalytics, loadProfit, activeTab])

  useEffect(() => { loadMeta().catch(() => {}) }, [loadMeta])

  useEffect(() => {
    if (filters.academic_year) loadAnalytics()
  }, [filters, loadAnalytics])

  useEffect(() => {
    if (activeTab === 'profit' && filters.academic_year) loadProfit()
  }, [activeTab, filters, loadProfit])

  const topItemsChart = useMemo(
    () =>
      (data?.top_items || []).slice(0, 8).map((item) => ({
        name: item.item_name?.length > 14 ? `${item.item_name.slice(0, 12)}…` : item.item_name,
        fullName: item.item_name,
        pieces: Number(item.pieces) || 0,
        revenue: Number(item.revenue) || 0,
      })),
    [data?.top_items]
  )

  const classChart = useMemo(
    () =>
      (data?.revenue_by_class || []).slice(0, 10).map((row) => ({
        name: row.class_name || '—',
        revenue: Number(row.revenue) || 0,
      })),
    [data?.revenue_by_class]
  )

  const filterSummary = [filters.academic_year, filters.term, filters.class_name].filter(Boolean).join(' · ')

  const profitSummaryCards = useMemo(() => {
    const s = profitData?.summary || {}
    return [
      { label: 'Fabric meters out', value: `${Number(s.total_meters_out || 0).toLocaleString()} m` },
      { label: 'Total fabric cost out', value: formatRwf(s.total_fabric_cost) },
      { label: 'Issue quantity', value: `${Number(s.total_issue_qty || 0).toLocaleString()} pcs` },
      { label: 'Total issue revenue', value: formatRwf(s.total_issue_revenue) },
      {
        label: 'Net profit / loss',
        value: formatRwf(s.total_profit_loss),
        highlight: Number(s.total_profit_loss) >= 0 ? 'profit' : 'loss',
      },
    ]
  }, [profitData?.summary])

  const resetFilters = () => {
    setFilters({
      academic_year: academic.academicYear,
      term: academic.currentTerm,
      class_name: '',
      from_date: '',
      to_date: '',
      finished_good_id: '',
    })
  }

  const handleExportProfit = () => {
    exportProfitCalculationExcel(profitData?.rows || [], profitData?.summary || {}, filters)
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#000435]/5 flex items-center justify-center shrink-0">
            <TrendingUp size={18} className="text-amber-600" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600">Uniform sales</p>
            <h2 className="text-base sm:text-lg font-bold text-[#000435] tracking-tight">Sales analytics</h2>
            <p className="text-xs text-gray-400 mt-1 max-w-md">
              Revenue, issuance volume, and profit by fabric from distribution records.
            </p>
            {filterSummary && (
              <p className="text-[11px] font-medium text-gray-500 mt-2 flex items-center gap-1.5">
                <Calendar size={12} className="text-amber-500" />
                {filterSummary}
              </p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={refreshAll}
          disabled={loading || profitLoading}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-[10px] font-bold uppercase tracking-wider text-gray-600 hover:bg-gray-50 transition-all"
        >
          <RefreshCw size={14} className={loading || profitLoading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="flex overflow-x-auto gap-1 border-b border-gray-100">
        {ANALYTICS_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 whitespace-nowrap px-3.5 py-2.5 text-[10px] font-bold uppercase tracking-wider rounded-t-xl transition-all ${
              activeTab === tab.id
                ? 'bg-amber-400/10 text-amber-700 border-b-2 border-amber-400'
                : 'text-gray-400 hover:text-gray-600 hover:bg-white/60'
            }`}
          >
            <tab.icon size={13} />
            {tab.label}
          </button>
        ))}
      </div>

      {(error || profitError) && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm font-medium">
          <AlertCircle size={16} className="shrink-0" />
          {error || profitError}
        </div>
      )}

      <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
        <button
          type="button"
          onClick={() => setFiltersOpen((o) => !o)}
          className="w-full flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
        >
          <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-500">
            <Filter size={14} className="text-amber-500" />
            Filters
          </span>
          <span className="text-[10px] font-bold text-amber-600 uppercase">{filtersOpen ? 'Hide' : 'Show'}</span>
        </button>
        {filtersOpen && (
          <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-1.5">Academic year</label>
              <select
                value={filters.academic_year}
                onChange={(e) => setFilters((f) => ({ ...f, academic_year: e.target.value }))}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 font-medium text-[#000435] focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 outline-none"
              >
                <option value="">All years</option>
                {academic.academicYears.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-1.5">Term</label>
              <select
                value={filters.term}
                onChange={(e) => setFilters((f) => ({ ...f, term: e.target.value }))}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 font-medium text-[#000435] focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 outline-none"
              >
                <option value="">All terms</option>
                {academic.activeTerms.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-1.5">Class</label>
              <select
                value={filters.class_name}
                onChange={(e) => setFilters((f) => ({ ...f, class_name: e.target.value }))}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 font-medium text-[#000435] focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 outline-none"
              >
                <option value="">All classes</option>
                {classes.map((c) => (
                  <option key={c.class_name} value={c.class_name}>{c.class_name}</option>
                ))}
              </select>
            </div>
            {activeTab === 'overview' && (
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-1.5">Finished good</label>
                <select
                  value={filters.finished_good_id}
                  onChange={(e) => setFilters((f) => ({ ...f, finished_good_id: e.target.value }))}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 font-medium text-[#000435] focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 outline-none"
                >
                  <option value="">All items</option>
                  {finishedGoods.map((g) => (
                    <option key={g.id} value={g.id}>{g.uniform_name} ({g.size})</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-1.5">From date</label>
              <input
                type="date"
                value={filters.from_date}
                onChange={(e) => setFilters((f) => ({ ...f, from_date: e.target.value }))}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-1.5">To date</label>
              <input
                type="date"
                value={filters.to_date}
                onChange={(e) => setFilters((f) => ({ ...f, to_date: e.target.value }))}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 outline-none"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-1 flex items-end">
              <button
                type="button"
                onClick={resetFilters}
                className="w-full py-2.5 rounded-xl border border-gray-200 text-[10px] font-bold uppercase tracking-wider text-gray-500 hover:bg-gray-50 transition-colors"
              >
                Reset filters
              </button>
            </div>
          </div>
        )}
      </div>

      {activeTab === 'overview' && (
        loading && !data ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
            <Loader2 className="animate-spin" size={28} />
            <span className="text-sm font-medium">Loading sales analytics…</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
                  <BarChart3 size={18} className="text-amber-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#000435]">Top selling items</h3>
                  <p className="text-[10px] text-gray-400 font-medium">By pieces issued</p>
                </div>
              </div>
              {!topItemsChart.length ? (
                <div className="text-center py-12 rounded-xl border border-dashed border-gray-200 bg-gray-50/50">
                  <Shirt size={32} className="mx-auto text-gray-200 mb-2" />
                  <p className="text-xs text-gray-400 font-medium">No issue data for these filters.</p>
                </div>
              ) : (
                <div className="h-64 sm:h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topItemsChart} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={36} />
                      <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(254,191,16,0.08)' }} />
                      <Bar dataKey="pieces" name="Pieces" radius={[6, 6, 0, 0]} maxBarSize={40}>
                        {topItemsChart.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-9 h-9 rounded-xl bg-[#000435]/5 flex items-center justify-center">
                  <GraduationCap size={18} className="text-[#000435]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#000435]">Revenue by class</h3>
                  <p className="text-[10px] text-gray-400 font-medium">Distribution billing total</p>
                </div>
              </div>
              {!classChart.length ? (
                <div className="text-center py-12 rounded-xl border border-dashed border-gray-200 bg-gray-50/50">
                  <GraduationCap size={32} className="mx-auto text-gray-200 mb-2" />
                  <p className="text-xs text-gray-400 font-medium">No class breakdown yet.</p>
                </div>
              ) : (
                <div className="h-64 sm:h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={classChart} layout="vertical" margin={{ top: 4, right: 12, left: 4, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                      <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <YAxis type="category" dataKey="name" width={48} tick={{ fontSize: 10, fontWeight: 600, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(0,4,53,0.04)' }} />
                      <Bar dataKey="revenue" name="Revenue" fill="#000435" radius={[0, 6, 6, 0]} maxBarSize={22} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        )
      )}

      {activeTab === 'profit' && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-amber-100 bg-amber-50/40 px-4 py-3 text-xs text-amber-900">
            <p className="font-medium">
              <span className="font-bold">Formula per fabric:</span>{' '}
              Fabric stock-in unit cost × meters stock-out = total fabric cost. Issue unit price × total quantity = issue revenue.
              Profit / loss = issue revenue − fabric cost out.
            </p>
          </div>

          {profitLoading && !profitData ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
              <Loader2 className="animate-spin" size={28} />
              <span className="text-sm font-medium">Calculating profit by fabric…</span>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {profitSummaryCards.map((card) => (
                  <div
                    key={card.label}
                    className={`bg-white rounded-2xl border p-5 hover:shadow-lg transition-all duration-300 ${
                      card.highlight === 'profit'
                        ? 'border-emerald-100 bg-emerald-50/20'
                        : card.highlight === 'loss'
                          ? 'border-red-100 bg-red-50/20'
                          : 'border-gray-100'
                    }`}
                  >
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{card.label}</p>
                    <p
                      className={`text-xl font-bold mt-2 ${
                        card.highlight === 'profit'
                          ? 'text-emerald-600'
                          : card.highlight === 'loss'
                            ? 'text-red-500'
                            : 'text-[#000435]'
                      }`}
                    >
                      {card.value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-sm font-bold text-[#000435] flex items-center gap-2">
                  <Calculator size={16} className="text-amber-500" />
                  Profit / loss by fabric
                </h3>
                <button
                  type="button"
                  onClick={handleExportProfit}
                  disabled={!profitData?.rows?.length}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold uppercase hover:bg-emerald-100 disabled:opacity-40 transition"
                >
                  <FileSpreadsheet size={14} />
                  Export Excel
                </button>
              </div>

              {!profitData?.rows?.length ? (
                <div className="text-center py-14 rounded-2xl border border-dashed border-gray-200 bg-white">
                  <Calculator size={36} className="mx-auto text-gray-200 mb-3" />
                  <p className="text-sm font-medium text-gray-500">No fabric stock-out or issue data for these filters.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
                  <table className="w-full text-sm min-w-[960px]">
                    <thead>
                      <tr className="bg-gray-50/80 border-b border-gray-100">
                        {[
                          'Fabric', 'Color', 'Meters out', 'Fabric unit cost', 'Fabric cost out',
                          'Issue qty', 'Issue unit price', 'Issue revenue', 'Profit / loss', 'Status',
                        ].map((h) => (
                          <th key={h} className="text-left py-3.5 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {profitData.rows.map((row, i) => (
                        <tr key={`${row.fabric_type}-${row.fabric_color}-${i}`} className="border-b border-gray-50 hover:bg-amber-50/30 transition-colors">
                          <td className="py-3.5 px-4 text-xs font-bold text-[#000435]">{row.fabric_type}</td>
                          <td className="py-3.5 px-4 text-xs text-gray-500">{row.fabric_color || '—'}</td>
                          <td className="py-3.5 px-4 text-xs text-gray-600">{Number(row.meters_out || 0).toLocaleString()} m</td>
                          <td className="py-3.5 px-4 text-xs text-gray-600">{formatRwf(row.fabric_unit_cost_avg)}</td>
                          <td className="py-3.5 px-4 text-xs font-medium text-red-600">{formatRwf(row.total_fabric_cost)}</td>
                          <td className="py-3.5 px-4 text-xs text-gray-600">{Number(row.issue_qty || 0).toLocaleString()}</td>
                          <td className="py-3.5 px-4 text-xs text-gray-600">{formatRwf(row.issue_unit_price_avg)}</td>
                          <td className="py-3.5 px-4 text-xs font-medium text-emerald-700">{formatRwf(row.total_issue_revenue)}</td>
                          <td className={`py-3.5 px-4 text-xs font-bold ${Number(row.profit_loss) >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                            {formatRwf(row.profit_loss)}
                          </td>
                          <td className="py-3.5 px-4">
                            <ProfitBadge value={row.profit_loss} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
