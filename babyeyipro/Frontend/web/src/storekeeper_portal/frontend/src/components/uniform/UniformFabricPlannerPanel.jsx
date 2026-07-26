import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import {
  Layers, Lock, Ruler, Shirt, Users, AlertTriangle, TrendingUp, Plus, Package,
  Play, Send, FileSpreadsheet, RefreshCw, Loader2, AlertCircle, Scissors,
  LayoutDashboard, Table2,
} from 'lucide-react'
import { fetchStoreAcademicSettings } from '../../services/academicSettingsService'
import { fetchFabricReceipts } from '../../services/fabricReceiptsService'
import {
  fetchFabricPlannerDashboard,
  fetchFabricPlanner,
} from '../../services/fabricPlannerService'
import UniformFabricPlannerWizard from './UniformFabricPlannerWizard'
import UniformFabricPlannerReports from './UniformFabricPlannerReports'

const CHART_COLORS = ['#FEBF10', '#000435', '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#06b6d4', '#ec4899']

const PANEL_TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'reports', label: 'Reports', icon: Table2 },
]

function fmtM(v) {
  const n = Number(v) || 0
  return `${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 })} m`
}

function fmtNum(v) {
  return Number(v || 0).toLocaleString()
}

function ClassDemandTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload
  return (
    <div className="bg-white border border-gray-100 rounded-xl px-3 py-2 shadow-lg text-xs">
      <p className="font-bold text-[#000435]">{row.name}</p>
      <p className="text-[#000435]/70 mt-0.5">{fmtNum(row.value)} students · {row.percent}%</p>
    </div>
  )
}

function ProducedTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload
  return (
    <div className="bg-white border border-gray-100 rounded-xl px-3 py-2 shadow-lg text-xs">
      <p className="font-bold text-[#000435]">{row.name}</p>
      <p className="text-[#000435]/70 mt-0.5">{fmtNum(row.qty)} produced</p>
    </div>
  )
}

function KpiCard({ label, value, sub, icon: Icon, alert }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative rounded-2xl border border-gray-100 bg-white p-4 sm:p-5 shadow-sm min-w-0"
    >
      {Icon && (
        <div className="absolute top-4 right-4 w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white border border-amber-100 flex items-center justify-center shadow-sm">
          <Icon size={17} className="text-[#FEBF10]" strokeWidth={2.25} />
        </div>
      )}
      <div className="pr-11 sm:pr-12">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#000435]/50 leading-tight">{label}</p>
        <p className={`text-base sm:text-lg font-bold mt-1.5 tabular-nums leading-tight whitespace-nowrap ${alert ? 'text-red-600' : 'text-[#000435]'}`}>
          {value}
        </p>
        {sub && <p className="text-[10px] sm:text-[11px] text-[#000435]/45 mt-1 leading-snug">{sub}</p>}
      </div>
    </motion.div>
  )
}

export default function UniformFabricPlannerPanel({ onFabricsChange, onNavigateTab }) {
  const [panelTab, setPanelTab] = useState('dashboard')
  const [academicYear, setAcademicYear] = useState('')
  const [academicYears, setAcademicYears] = useState([])
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [wizardOpen, setWizardOpen] = useState(false)
  const [editPlanner, setEditPlanner] = useState(null)

  const loadDashboard = useCallback(async (year) => {
    if (!year) return
    setLoading(true)
    setError('')
    try {
      const data = await fetchFabricPlannerDashboard(year)
      setDashboard(data)
    } catch (e) {
      setError(e.message || 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStoreAcademicSettings()
      .then((acad) => {
        setAcademicYears(acad.academicYears || [])
        const year = acad.academicYear
        setAcademicYear(year)
        if (year) loadDashboard(year)
      })
      .catch(() => setLoading(false))
  }, [loadDashboard])

  const handleRefresh = async () => {
    loadDashboard(academicYear)
    try {
      const rows = await fetchFabricReceipts()
      onFabricsChange?.(rows)
    } catch {
      /* ignore */
    }
  }

  const openNewPlan = () => {
    setEditPlanner(null)
    setWizardOpen(true)
  }

  const openEditPlan = async (plan) => {
    try {
      const planner = await fetchFabricPlanner(plan.academicYear || academicYear)
      setEditPlanner(planner)
      setWizardOpen(true)
    } catch (e) {
      setError(e.message || 'Failed to load plan for editing')
    }
  }

  const kpis = dashboard?.kpis || {}

  const demandByClass = useMemo(() => {
    const rows = (dashboard?.demandByClass || [])
      .map((row) => ({
        name: String(row.name || row.class_name || '').trim(),
        value: Number(row.value ?? row.count ?? 0),
        percent: Number(row.percent ?? 0),
      }))
      .filter((row) => row.name && row.value > 0)

    if (rows.length) {
      const total = rows.reduce((s, r) => s + r.value, 0) || 1
      return rows.map((r) => ({
        ...r,
        percent: r.percent || Math.round((r.value / total) * 100),
      }))
    }

    const classCounts = dashboard?.planner?.classCounts || {}
    const fallback = Object.entries(classCounts)
      .map(([name, count]) => ({ name: String(name).trim(), value: Number(count || 0) }))
      .filter((r) => r.name && r.value > 0)
    const total = fallback.reduce((s, r) => s + r.value, 0) || 1
    return fallback
      .sort((a, b) => b.value - a.value)
      .slice(0, 12)
      .map((r) => ({ ...r, percent: Math.round((r.value / total) * 100) }))
  }, [dashboard])

  const mostProduced = useMemo(() => {
    const rows = (dashboard?.mostProduced || [])
      .map((row) => ({
        name: String(row.name || row.uniform || '').trim(),
        qty: Number(row.qty ?? row.produced ?? row.quantity ?? 0),
      }))
      .filter((row) => row.name && row.qty > 0)

    if (rows.length) return rows.sort((a, b) => b.qty - a.qty).slice(0, 8)

    const agg = {}
    for (const rec of dashboard?.planner?.consumptionRecords || []) {
      const name = String(rec.uniform || '').trim()
      if (!name) continue
      agg[name] = (agg[name] || 0) + Number(rec.produced || 0)
    }
    const fromConsumption = Object.entries(agg)
      .map(([name, qty]) => ({ name, qty: Number(qty || 0) }))
      .filter((r) => r.qty > 0)
    if (fromConsumption.length) return fromConsumption.sort((a, b) => b.qty - a.qty).slice(0, 8)

    return (dashboard?.planner?.productionPlan?.items || [])
      .map((it) => ({ name: String(it.name || '').trim(), qty: Number(it.quantity || 0) }))
      .filter((r) => r.name && r.qty > 0)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 8)
  }, [dashboard])

  if (loading && !dashboard) {
    return (
      <div className="flex items-center justify-center py-24 text-[#000435]/40 gap-2">
        <Loader2 size={22} className="animate-spin text-[#FEBF10]" />
        <span className="text-sm font-medium text-[#000435]">Loading fabric planner…</span>
      </div>
    )
  }

  return (
    <div className="space-y-6" style={{ fontFamily: "'Montserrat', sans-serif" }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[#000435] flex items-center gap-2">
            <Scissors size={20} className="text-[#FEBF10]" />
            Uniform Fabric Planner
          </h2>
          <p className="text-[11px] text-[#000435]/45 mt-0.5">Production planning, yield analytics & distribution</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={academicYear}
            onChange={(e) => { setAcademicYear(e.target.value); loadDashboard(e.target.value) }}
            className="border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-[#000435] bg-white"
          >
            {academicYears.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <button type="button" onClick={handleRefresh} className="p-2 rounded-xl border border-gray-200 text-[#000435]/50 hover:bg-gray-50">
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      <div className="flex gap-1 border-b border-gray-100">
        {PANEL_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setPanelTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider rounded-t-xl transition ${
              panelTab === tab.id
                ? 'bg-amber-400/15 text-[#000435] border-b-2 border-[#FEBF10]'
                : 'text-[#000435]/40 hover:text-[#000435]/70'
            }`}
          >
            <tab.icon size={13} className={panelTab === tab.id ? 'text-[#FEBF10]' : ''} />
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {panelTab === 'dashboard' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 2xl:grid-cols-6 gap-3 sm:gap-4">
            <KpiCard label="Total fabric in stock" value={fmtM(kpis.totalFabricStock)} sub="All available fabric" icon={Layers} />
            <KpiCard label="Fabric reserved" value={fmtM(kpis.fabricReserved)} sub="Allocated to plans" icon={Lock} />
            <KpiCard label="Fabric available" value={fmtM(kpis.fabricAvailable)} sub="Remaining usable" icon={Ruler} />
            <KpiCard label="Expected uniforms" value={fmtNum(kpis.expectedUniforms)} sub="From current stock" icon={Shirt} />
            <KpiCard label="Students requiring uniforms" value={fmtNum(kpis.studentsRequiring)} sub="Across all classes" icon={Users} />
            <KpiCard
              label="Fabric shortage alert"
              value={kpis.fabricShortage > 0 ? `${fmtM(kpis.fabricShortage).replace(' m', '')} needed` : 'None'}
              sub={kpis.fabricShortage > 0 ? 'Stock insufficient' : 'Stock sufficient'}
              icon={AlertTriangle}
              alert={kpis.fabricShortage > 0}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { label: 'New fabric plan', icon: Plus, action: openNewPlan, primary: true },
              { label: 'Add fabric stock', icon: Package, action: () => onNavigateTab?.('fabric-in') },
              { label: 'Start production', icon: Play, action: openNewPlan },
              { label: 'Distribute uniforms', icon: Send, action: () => onNavigateTab?.('issue') },
              { label: 'View all plans', icon: FileSpreadsheet, action: () => setPanelTab('reports') },
            ].map((btn) => (
              <button
                key={btn.label}
                type="button"
                onClick={btn.action}
                className={`flex flex-col items-center justify-center gap-2 p-4 sm:p-5 rounded-2xl border transition hover:shadow-md ${
                  btn.primary ? 'bg-[#000435] text-white border-[#000435]' : 'bg-white border-gray-100 hover:border-amber-200'
                }`}
              >
                <btn.icon size={22} className={btn.primary ? 'text-[#FEBF10]' : 'text-[#FEBF10]'} />
                <span className={`text-[10px] sm:text-xs font-bold uppercase text-center leading-tight ${btn.primary ? 'text-white' : 'text-[#000435]'}`}>{btn.label}</span>
              </button>
            ))}
          </div>

          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <h3 className="text-xs font-bold text-[#000435] uppercase tracking-wider mb-4 flex items-center gap-2">
                  <TrendingUp size={14} className="text-[#FEBF10]" /> Fabric consumption trend
                </h3>
                <div className="h-48">
                  {(dashboard?.consumptionTrend || []).length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dashboard.consumptionTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#000435' }} />
                        <YAxis tick={{ fontSize: 10, fill: '#000435' }} />
                        <Tooltip formatter={(v) => [`${v} m`, 'Usage']} />
                        <Bar dataKey="meters" fill="#FEBF10" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-xs text-[#000435]/40 text-center py-16">No consumption data yet</p>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <h3 className="text-xs font-bold text-[#000435] uppercase tracking-wider mb-1">Uniform demand by class</h3>
                <p className="text-[10px] text-[#000435]/45 mb-4">Students per class for {academicYear || 'selected year'}</p>
                {demandByClass.length ? (
                  <>
                    <div className="h-44">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={demandByClass}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={42}
                            outerRadius={68}
                            paddingAngle={2}
                          >
                            {demandByClass.map((_, i) => (
                              <Cell key={`cell-${i}`} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="#fff" strokeWidth={2} />
                            ))}
                          </Pie>
                          <Tooltip content={<ClassDemandTooltip />} />
                          <Legend
                            verticalAlign="bottom"
                            height={36}
                            formatter={(value) => <span className="text-[10px] font-semibold text-[#000435]">{value}</span>}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-3 space-y-1.5 max-h-28 overflow-y-auto">
                      {demandByClass.map((row, i) => (
                        <div key={row.name} className="flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                            <span className="font-semibold text-[#000435] truncate">{row.name}</span>
                          </div>
                          <span className="text-[#000435]/55 font-bold tabular-nums shrink-0 ml-2">
                            {fmtNum(row.value)} · {row.percent}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-[#000435]/40 text-center py-16">
                    No class data — add students with class names or save a fabric plan with selected classes.
                  </p>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <h3 className="text-xs font-bold text-[#000435] uppercase tracking-wider mb-1">Most produced uniforms</h3>
              <p className="text-[10px] text-[#000435]/45 mb-4">From production records, plans, or issues</p>
              <div className="h-52">
                {mostProduced.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={mostProduced} layout="vertical" margin={{ left: 8, right: 12 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10, fill: '#000435' }} allowDecimals={false} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fontSize: 10, fill: '#000435' }}
                        width={Math.min(120, Math.max(70, ...mostProduced.map((r) => String(r.name).length * 6)))}
                      />
                      <Tooltip content={<ProducedTooltip />} />
                      <Bar dataKey="qty" fill="#FEBF10" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-xs text-[#000435]/40 text-center py-16">
                    Record production in a fabric plan or add finished goods to see stats.
                  </p>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {panelTab === 'reports' && (
        <UniformFabricPlannerReports
          academicYear={academicYear}
          onNewPlan={openNewPlan}
          onEditPlan={openEditPlan}
          onRefresh={handleRefresh}
        />
      )}

      <UniformFabricPlannerWizard
        open={wizardOpen}
        onClose={() => { setWizardOpen(false); setEditPlanner(null) }}
        academicYear={editPlanner?.academicYear || academicYear}
        initialPlanner={editPlanner || dashboard?.planner}
        onSaved={() => {
          handleRefresh()
          setWizardOpen(false)
          setEditPlanner(null)
        }}
      />
    </div>
  )
}
