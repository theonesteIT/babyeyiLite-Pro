import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import {
  Layers, Lock, Ruler, Shirt, Users, AlertTriangle, TrendingUp, Plus, Package,
  Play, Send, FileSpreadsheet, RefreshCw, Loader2, AlertCircle, Scissors,
  CheckCircle2, LayoutDashboard, Table2,
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

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            <div className="xl:col-span-2 space-y-5">
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
                  <h3 className="text-xs font-bold text-[#000435] uppercase tracking-wider mb-4">Uniform demand by class</h3>
                  <div className="h-48">
                    {(dashboard?.demandByClass || []).length ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={dashboard.demandByClass} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2}>
                            {dashboard.demandByClass.map((_, i) => (
                              <Cell key={`cell-${i}`} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v, n, p) => [`${v} students (${p.payload.percent}%)`, p.payload.name]} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-xs text-[#000435]/40 text-center py-16">No class data</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <h3 className="text-xs font-bold text-[#000435] uppercase tracking-wider mb-4">Most produced uniforms</h3>
                <div className="h-52">
                  {(dashboard?.mostProduced || []).length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dashboard.mostProduced} layout="vertical" margin={{ left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 10, fill: '#000435' }} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#000435' }} width={70} />
                        <Tooltip />
                        <Bar dataKey="qty" fill="#000435" radius={[0, 6, 6, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-xs text-[#000435]/40 text-center py-16">Record production to see stats</p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <h3 className="text-xs font-bold text-[#000435] uppercase tracking-wider mb-4 flex items-center gap-2">
                  <AlertTriangle size={14} className="text-[#FEBF10]" /> Smart alerts
                </h3>
                <div className="space-y-2">
                  {(dashboard?.alerts || []).length ? dashboard.alerts.map((a, i) => (
                    <div key={`alert-${i}`} className={`flex items-start gap-2 text-xs rounded-xl px-3 py-2.5 ${
                      a.type === 'danger' ? 'bg-red-50 text-red-700' : a.type === 'warning' ? 'bg-amber-50 text-amber-800' : 'bg-blue-50 text-blue-700'
                    }`}>
                      <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                      <span className="font-medium">{a.message}</span>
                    </div>
                  )) : (
                    <p className="text-xs text-[#000435]/40 flex items-center gap-2">
                      <CheckCircle2 size={14} className="text-[#FEBF10]" /> All clear — no alerts
                    </p>
                  )}
                </div>
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
