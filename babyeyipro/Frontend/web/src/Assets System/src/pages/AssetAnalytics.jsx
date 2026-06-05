import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  BarChart, Bar,
  AreaChart, Area,
} from 'recharts'
import {
  DollarSign, Boxes, TrendingDown, Wrench, Clock, Heart,
  ChevronDown, AlertCircle, Loader2, RefreshCw,
} from 'lucide-react'
import assetsApi from '../../../assets_portal/services/assetsApi'
import { formatRwf } from '../../../assets_portal/utils/assetsCalculations'
import { assetsHref } from '../../../assets_portal/config/portal'

const NAVY = '#000435'
const GOLD = '#FEBF10'
const HERO_BG = '#c87800'
const FONT = "'Montserrat', system-ui, sans-serif"

const iconMap = { DollarSign, Boxes, TrendingDown, Wrench, Clock, Heart }

function formatRwfShort(n) {
  const v = Number(n) || 0
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}B`
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`
  return String(Math.round(v))
}

function buildHeroStats(data, yearFilter) {
  const k = data?.kpis || {}
  return [
    {
      key: 'value',
      label: 'Total value',
      value: `${formatRwf(k.total_value)} RWF`,
      subValue: 'School register',
      icon: DollarSign,
    },
    {
      key: 'assets',
      label: 'Total assets',
      value: String(k.total_assets ?? 0),
      subValue: 'Active records',
      icon: Boxes,
    },
    {
      key: 'dep',
      label: 'Depreciation',
      value: `${formatRwf(k.depreciation_ytd)} RWF`,
      subValue: `YTD ${yearFilter}`,
      icon: TrendingDown,
    },
    {
      key: 'health',
      label: 'Health score',
      value: `${k.health_pct ?? 0}%`,
      subValue: `${k.under_maintenance ?? 0} under maintenance`,
      icon: Heart,
    },
  ]
}

function ChartCard({ title, description, children, action }) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-medium tracking-tight" style={{ color: NAVY }}>{title}</h3>
          {description && (
            <p className="text-[11px] text-gray-500 mt-0.5 font-normal">{description}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

function EmptyChart({ message }) {
  return <p className="text-xs text-gray-400 text-center py-16 font-normal">{message}</p>
}

export default function AssetAnalytics() {
  const currentYear = new Date().getFullYear()
  const [yearFilter, setYearFilter] = useState(String(currentYear))
  const [depMethod, setDepMethod] = useState('straightLine')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadAnalytics = useCallback(() => {
    setLoading(true)
    setError('')
    assetsApi.getAnalytics({ year: yearFilter })
      .then(setData)
      .catch((err) => {
        setData(null)
        setError(err.message || 'Failed to load analytics')
      })
      .finally(() => setLoading(false))
  }, [yearFilter])

  useEffect(() => {
    loadAnalytics()
  }, [loadAnalytics])

  const heroStats = useMemo(() => buildHeroStats(data, yearFilter), [data, yearFilter])
  const pieChartData = data?.by_category?.length
    ? data.by_category
    : [{ name: 'No data', value: 1, color: '#E5E7EB' }]
  const valueOverTimeData = data?.value_over_time?.length ? data.value_over_time : []
  const depreciationTrendData = data?.depreciation_trend?.length ? data.depreciation_trend : []
  const maintenanceFrequencyData = data?.maintenance_by_category?.length
    ? data.maintenance_by_category
    : []
  const conditionData = data?.condition_data?.length
    ? data.condition_data
    : [{ name: 'No data', value: 100, color: '#E5E7EB' }]
  const healthScore = data?.health_score ?? 0
  const yearOptions = data?.available_years?.length
    ? data.available_years.map(String)
    : [String(currentYear), String(currentYear - 1)]
  const liveOk = !loading && !error && data

  const depToggle = (
    <div className="flex gap-1 shrink-0">
      {[{ key: 'straightLine', label: 'Annual' }, { key: 'diminishing', label: 'Accum.' }, { key: 'doubleDeclining', label: 'Total' }].map((m) => (
        <button
          key={m.key}
          type="button"
          className="text-[10px] px-2 py-1 rounded-md font-medium transition-all"
          style={
            depMethod === m.key
              ? { backgroundColor: NAVY, color: '#fff' }
              : { backgroundColor: '#f3f4f6', color: '#6b7280' }
          }
          onClick={() => setDepMethod(m.key)}
        >
          {m.label}
        </button>
      ))}
    </div>
  )

  return (
    <div className="space-y-5 pb-8" style={{ fontFamily: FONT }}>
      {/* Full-width hero + stats (break out of main padding) */}
      <div className="-mx-4 lg:-mx-6 -mt-4 lg:-mt-6">
        <div className="relative w-full min-h-[168px] sm:min-h-[180px] overflow-hidden" style={{ backgroundColor: HERO_BG }}>
          <div className="absolute -top-28 -right-28 w-[22rem] h-[22rem] rounded-full border border-white/[0.07] pointer-events-none" aria-hidden />
          <div className="absolute -top-14 -right-14 w-[15rem] h-[15rem] rounded-full border border-white/[0.06] pointer-events-none" aria-hidden />
          <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#FEBF10]/35 to-transparent pointer-events-none" aria-hidden />

          <div className="relative z-10 px-4 sm:px-6 lg:px-8 pt-8 sm:pt-9 pb-16 sm:pb-[4.5rem]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-1 max-w-3xl min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="w-4 h-0.5 rounded-full" style={{ backgroundColor: GOLD }} aria-hidden />
                </div>
                <h1 className="text-base sm:text-lg font-medium text-white tracking-tight uppercase leading-snug">
                  Asset analytics
                </h1>
                <p className="text-[9px] sm:text-[10px] font-normal uppercase tracking-[0.14em] text-white/80 max-w-xl leading-relaxed">
                  Value · depreciation · maintenance · condition — school asset register
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <div className="flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-2.5 py-1.5 backdrop-blur-sm">
                  <span className="text-[9px] font-normal uppercase tracking-widest text-white/90">
                    {loading ? 'Updating…' : liveOk ? 'Live data' : 'Offline'}
                  </span>
                </div>
                <div className="relative">
                  <select
                    className="appearance-none rounded-lg border border-white/25 bg-white/10 pl-3 pr-7 py-1.5 text-[10px] font-normal uppercase tracking-wider text-white outline-none"
                    value={yearFilter}
                    onChange={(e) => setYearFilter(e.target.value)}
                    aria-label="Filter year"
                  >
                    {yearOptions.map((y) => (
                      <option key={y} value={y} className="text-[#000435]">{y}</option>
                    ))}
                  </select>
                  <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/70 pointer-events-none" />
                </div>
                <button
                  type="button"
                  onClick={loadAnalytics}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#FEBF10]/35 bg-[#FEBF10]/15 px-3 py-1.5 text-[9px] font-normal uppercase tracking-widest text-white hover:bg-[#FEBF10]/25 transition-all disabled:opacity-60"
                >
                  <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                  Refresh
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Overlapping stats strip */}
        <div className="px-4 sm:px-6 lg:px-8 -mt-3 sm:-mt-4 relative z-20 mb-5">
          <div className="bg-white rounded-t-2xl sm:rounded-t-[1.75rem] shadow-sm border border-black/10 overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-4">
              <div className="lg:col-span-3 grid grid-cols-2 xl:grid-cols-4 divide-x divide-y xl:divide-y-0 divide-black/5">
                {heroStats.map((stat) => {
                  const Icon = stat.icon
                  return (
                    <div
                      key={stat.key}
                      className="p-4 sm:p-4 flex flex-col items-center justify-center text-center min-h-[5.5rem] sm:min-h-[6rem]"
                    >
                      {loading ? (
                        <Loader2 size={16} className="animate-spin text-gray-300 mb-2" />
                      ) : (
                        <>
                          <div className="mb-1 opacity-50" style={{ color: GOLD }}>
                            <Icon size={11} strokeWidth={1.75} aria-hidden />
                          </div>
                          <span className="text-xs sm:text-base font-medium tabular-nums leading-snug" style={{ color: NAVY }}>
                            {stat.value}
                          </span>
                          <p className="text-[7px] sm:text-[8px] font-normal text-slate-500 uppercase tracking-[0.14em] mt-0.5">
                            {stat.label}
                          </p>
                          {stat.subValue && (
                            <p className="text-[6px] sm:text-[7px] font-normal uppercase tracking-wider mt-0.5 text-slate-400 max-w-[10rem]">
                              {stat.subValue}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  )
                })}
              </div>

              <div className="hidden lg:flex flex-col border-t lg:border-t-0 lg:border-l border-black/5 bg-slate-50/80 p-4 justify-center gap-2">
                <Link
                  to={assetsHref('/inventory')}
                  className="w-full h-9 flex items-center justify-center text-white rounded-lg text-[8px] font-normal uppercase tracking-[0.12em] border border-black/10 shadow-sm hover:opacity-95 transition-opacity"
                  style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #0a0230 100%)` }}
                >
                  Asset inventory
                </Link>
                <Link
                  to={assetsHref('/transfers')}
                  className="w-full h-9 flex items-center justify-center bg-white border border-black/10 rounded-lg text-[8px] font-normal uppercase tracking-[0.12em] hover:bg-gray-50 transition-colors"
                  style={{ color: NAVY }}
                >
                  Transfers
                </Link>
                <Link
                  to={assetsHref('/maintenance')}
                  className="w-full h-9 flex items-center justify-center rounded-lg text-[8px] font-normal uppercase tracking-[0.12em] border transition-colors hover:opacity-90"
                  style={{ color: NAVY, borderColor: `${GOLD}66`, backgroundColor: `${GOLD}22` }}
                >
                  Maintenance
                </Link>
              </div>

              <div className="lg:hidden grid grid-cols-3 gap-1.5 p-3 border-t border-black/5 bg-white">
                <Link to={assetsHref('/inventory')} className="h-8 rounded-lg text-[8px] font-normal uppercase tracking-wider text-white text-center leading-8" style={{ background: NAVY }}>
                  Inventory
                </Link>
                <Link to={assetsHref('/transfers')} className="h-8 rounded-lg text-[8px] font-normal uppercase tracking-wider text-center leading-8 border border-black/10" style={{ color: NAVY }}>
                  Transfers
                </Link>
                <Link to={assetsHref('/maintenance')} className="h-8 rounded-lg text-[8px] font-normal uppercase tracking-wider text-center leading-8 border" style={{ color: NAVY, borderColor: `${GOLD}55`, backgroundColor: `${GOLD}18` }}>
                  Maint.
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 font-normal">
          <AlertCircle size={14} />
          {error}
          <button type="button" onClick={loadAnalytics} className="ml-1 underline text-red-800">
            Retry
          </button>
        </div>
      )}

      {!loading && (
        <div className="space-y-5">
          {/* Secondary KPIs — lighter row */}
          {data?.kpis && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: 'Maintenance cost', value: `${formatRwf(data.kpis.maintenance_cost_ytd)} RWF`, icon: Wrench },
                { label: 'Maint. jobs', value: String(data.kpis.maintenance_records_ytd ?? 0), icon: Clock },
                { label: 'Dep. (all time)', value: `${formatRwf(data.kpis.depreciation_total)} RWF`, icon: TrendingDown },
              ].map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.label} className="rounded-xl border border-black/5 bg-white px-3 py-3 flex items-center gap-3">
                    <Icon size={14} className="text-gray-400 shrink-0" strokeWidth={1.5} />
                    <div className="min-w-0">
                      <p className="text-xs font-medium tabular-nums truncate" style={{ color: NAVY }}>{item.value}</p>
                      <p className="text-[10px] text-gray-500 font-normal">{item.label}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <ChartCard title="By category" description="Asset count per category">
              <ResponsiveContainer width="100%" height={260} minWidth={0}>
                <PieChart>
                  <Pie
                    data={pieChartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={82}
                    innerRadius={44}
                    label={({ name, percent }) => (percent > 0.05 ? `${name} ${(percent * 100).toFixed(0)}%` : '')}
                  >
                    {pieChartData.map((entry, i) => (
                      <Cell key={i} fill={entry.color || GOLD} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, fontFamily: FONT, fontSize: 11 }} />
                  <Legend verticalAlign="bottom" height={28} iconType="circle" wrapperStyle={{ fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Value over time" description="Cumulative register value by year">
              {valueOverTimeData.length === 0 ? (
                <EmptyChart message="No value data for selected years." />
              ) : (
                <ResponsiveContainer width="100%" height={260} minWidth={0}>
                  <AreaChart data={valueOverTimeData}>
                    <defs>
                      <linearGradient id="valueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={NAVY} stopOpacity={0.1} />
                        <stop offset="95%" stopColor={NAVY} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="acqGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={GOLD} stopOpacity={0.15} />
                        <stop offset="95%" stopColor={GOLD} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="year" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickFormatter={formatRwfShort} />
                    <Tooltip formatter={(v) => `${formatRwf(v)} RWF`} contentStyle={{ borderRadius: 8, fontFamily: FONT, fontSize: 11 }} />
                    <Area type="monotone" dataKey="value" stroke={NAVY} strokeWidth={1.5} fill="url(#valueGrad)" name="Cumulative" />
                    <Area type="monotone" dataKey="acquisition" stroke={GOLD} strokeWidth={1.5} fill="url(#acqGrad)" name="Year spend" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <ChartCard title="Depreciation trend" description="Grouped by purchase year" action={depToggle}>
              {depreciationTrendData.length === 0 ? (
                <EmptyChart message="No depreciation data yet." />
              ) : (
                <ResponsiveContainer width="100%" height={260} minWidth={0}>
                  <LineChart data={depreciationTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="year" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickFormatter={formatRwfShort} />
                    <Tooltip formatter={(v) => `${formatRwf(v)} RWF`} contentStyle={{ borderRadius: 8, fontFamily: FONT, fontSize: 11 }} />
                    <Legend verticalAlign="bottom" height={24} wrapperStyle={{ fontSize: 10 }} />
                    {depMethod === 'straightLine' && (
                      <Line type="monotone" dataKey="straightLine" stroke={NAVY} strokeWidth={1.5} dot={{ r: 2 }} name="Annual dep" />
                    )}
                    {depMethod === 'diminishing' && (
                      <Line type="monotone" dataKey="diminishing" stroke={GOLD} strokeWidth={1.5} dot={{ r: 2 }} name="Accumulated" />
                    )}
                    {depMethod === 'doubleDeclining' && (
                      <Line type="monotone" dataKey="doubleDeclining" stroke="#ef4444" strokeWidth={1.5} dot={{ r: 2 }} name="Total dep" />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title="Maintenance by category" description="Job count and estimated cost">
              {maintenanceFrequencyData.length === 0 ? (
                <EmptyChart message="No maintenance records yet." />
              ) : (
                <ResponsiveContainer width="100%" height={260} minWidth={0}>
                  <BarChart data={maintenanceFrequencyData} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="category" tick={{ fontSize: 9, fill: '#9ca3af' }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#9ca3af' }} tickFormatter={formatRwfShort} />
                    <Tooltip contentStyle={{ borderRadius: 8, fontFamily: FONT, fontSize: 11 }} />
                    <Legend verticalAlign="bottom" height={24} wrapperStyle={{ fontSize: 10 }} />
                    <Bar yAxisId="left" dataKey="frequency" fill={GOLD} radius={[3, 3, 0, 0]} name="Jobs" />
                    <Bar yAxisId="right" dataKey="cost" fill={NAVY} radius={[3, 3, 0, 0]} name="Cost (RWF)" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>

          <ChartCard title="Asset condition" description={`Overall health score: ${healthScore}%`}>
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="w-full md:w-1/2 max-w-xs">
                <ResponsiveContainer width="100%" height={240} minWidth={0}>
                  <PieChart>
                    <Pie
                      data={conditionData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={82}
                      innerRadius={52}
                      label={({ percent }) => (percent > 0.08 ? `${(percent * 100).toFixed(0)}%` : '')}
                    >
                      {conditionData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 8, fontFamily: FONT, fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-2">
                {conditionData.map((c) => (
                  <div
                    key={c.name}
                    className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 border border-gray-100"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                      <span className="text-xs font-normal text-gray-600 truncate">{c.name}</span>
                    </div>
                    <span className="text-xs font-medium shrink-0 ml-2" style={{ color: NAVY }}>{c.value}%</span>
                  </div>
                ))}
                <div className="sm:col-span-2 rounded-lg px-3 py-2 border" style={{ borderColor: `${GOLD}44`, backgroundColor: `${GOLD}12` }}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-normal" style={{ color: NAVY }}>Health score</span>
                    <span className="text-sm font-medium text-emerald-600">{healthScore}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/80 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${Math.min(100, healthScore)}%`, backgroundColor: NAVY }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </ChartCard>
        </div>
      )}

      {loading && !error && (
        <div className="flex items-center justify-center gap-2 py-12 text-gray-400">
          <Loader2 size={20} className="animate-spin" style={{ color: GOLD }} />
          <span className="text-xs font-normal">Loading charts…</span>
        </div>
      )}
    </div>
  )
}
