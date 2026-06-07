import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, ChevronLeft, ChevronRight, CheckCircle2, Layers, Users, Shirt,
  Calculator, Sparkles, Plus, Trash2, Loader2, AlertCircle,
} from 'lucide-react'
import { fetchStoreAcademicSettings } from '../../services/academicSettingsService'
import { fetchUniformIssueClasses, fetchUniformClassStats } from '../../services/uniformIssueService'
import { fetchFabricReceipts } from '../../services/fabricReceiptsService'
import {
  saveFabricPlanner,
  createFabricProductionPlan,
  normalizeClassList,
} from '../../services/fabricPlannerService'
import {
  roundMeters,
  buildForecastRows,
  totalStudents,
  totalFabricDemand,
  totalFabricDemandWithWaste,
  fabricStatus,
  buildProductionPlan,
  fabricUsagePercent,
  quantityPossible,
  averageMetersPerChild,
  UNIFORM_PACKAGES,
  classGroup,
} from '../../utils/fabricPlannerCalculations'

const STEPS = [
  { id: 1, label: 'Fabric', icon: Layers },
  { id: 2, label: 'Classes', icon: Users },
  { id: 3, label: 'Uniforms', icon: Shirt },
  { id: 4, label: 'Preview', icon: Calculator },
  { id: 5, label: 'Plan', icon: Sparkles },
]

const ALL_YEAR_TERM = 'All Year'

const inputClass =
  'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium text-[#000435] bg-gray-50/80 focus:bg-white focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 outline-none transition-all'

function uid() {
  return `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function fabricLabel(row) {
  const type = row.fabric_type || row.type || 'Fabric'
  const color = row.color && row.color !== '—' ? ` (${row.color})` : ''
  return `${type}${color}`
}

function emptyForm(academicYear = '', term = '') {
  return {
    academicYear,
    term: term || ALL_YEAR_TERM,
    fabricRollName: '',
    fabricType: '',
    availableFabric: '',
    fabricReceiptId: '',
    supplierName: '',
    costPerMeter: '',
    wasteAllowance: 5,
    selectedClasses: [],
    classCounts: {},
    uniformTypes: [{ id: uid(), name: 'Dress', metersPerChild: 1.5, perClassMode: false, classMeters: {} }],
    colorAllocations: {},
  }
}

function formFromPlanner(planner, academicYear, term) {
  if (!planner) return emptyForm(academicYear, term)
  return {
    academicYear: planner.academicYear || academicYear,
    term: planner.term || term || ALL_YEAR_TERM,
    fabricRollName: planner.fabricRollName || '',
    fabricType: planner.fabricType || '',
    availableFabric: planner.availableFabric ?? '',
    fabricReceiptId: planner.fabricReceiptId ? String(planner.fabricReceiptId) : '',
    supplierName: planner.supplierName || '',
    costPerMeter: planner.costPerMeter ?? '',
    wasteAllowance: planner.wasteAllowance ?? 5,
    selectedClasses: planner.selectedClasses || [],
    classCounts: planner.classCounts || {},
    uniformTypes: planner.uniformTypes?.length
      ? planner.uniformTypes.map((u) => ({ ...u, id: u.id || uid() }))
      : emptyForm().uniformTypes,
    colorAllocations: planner.colorAllocations || {},
  }
}

function ReadOnlyField({ label, value }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/80 px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
      <p className="text-sm font-bold text-[#000435] mt-1">{value || '—'}</p>
    </div>
  )
}

export default function UniformFabricPlannerWizard({
  open,
  onClose,
  academicYear,
  initialPlanner = null,
  onSaved,
}) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState(emptyForm(academicYear))
  const [allClasses, setAllClasses] = useState([])
  const [fabricStock, setFabricStock] = useState([])
  const [academicSettings, setAcademicSettings] = useState({
    academicYear: '',
    currentTerm: '',
    academicYears: [],
    activeTerms: [],
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const yearOptions = useMemo(() => {
    const current = academicSettings.academicYear || academicYear
    const rest = (academicSettings.academicYears || []).filter((y) => y !== current)
    return current ? [current, ...rest] : rest
  }, [academicSettings, academicYear])

  const termOptions = useMemo(() => {
    const current = academicSettings.currentTerm
    const terms = academicSettings.activeTerms || []
    const rest = terms.filter((t) => t !== current)
    return [ALL_YEAR_TERM, ...(current ? [current] : []), ...rest.filter((t) => t !== ALL_YEAR_TERM)]
  }, [academicSettings])

  const loadClasses = useCallback(async (year) => {
    if (!year) return
    const cls = await fetchUniformIssueClasses(year)
    setAllClasses(normalizeClassList(cls))
  }, [])

  useEffect(() => {
    if (!open) return
    setStep(1)
    setError('')
    setSuccess('')
    setLoading(true)

    fetchStoreAcademicSettings()
      .then(async (acad) => {
        setAcademicSettings(acad)
        const year = initialPlanner?.academicYear || acad.academicYear || academicYear
        const term = initialPlanner?.term || acad.currentTerm || ALL_YEAR_TERM
        setForm(formFromPlanner(initialPlanner, year, term))

        const [stock] = await Promise.all([
          fetchFabricReceipts(),
          loadClasses(year),
        ])
        setFabricStock(stock || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [open, academicYear, initialPlanner, loadClasses])

  const patch = (p) => setForm((f) => ({ ...f, ...p }))

  const linkFabric = (id) => {
    if (!id) {
      patch({
        fabricReceiptId: '',
        fabricRollName: '',
        fabricType: '',
        availableFabric: '',
        supplierName: '',
        costPerMeter: '',
      })
      return
    }
    const row = fabricStock.find((f) => String(f.id) === String(id))
    if (!row) {
      patch({ fabricReceiptId: id })
      return
    }
    patch({
      fabricReceiptId: String(row.id),
      fabricRollName: fabricLabel(row),
      fabricType: row.fabric_type || '',
      availableFabric: row.remaining_meters ?? row.remaining ?? '',
      supplierName: row.supplier_name || row.supplier || '',
      costPerMeter: row.unit_cost != null && row.unit_cost !== '' ? row.unit_cost : '',
    })
  }

  const handleAcademicYearChange = async (year) => {
    patch({ academicYear: year, selectedClasses: [], classCounts: {} })
    setLoading(true)
    try {
      await loadClasses(year)
    } finally {
      setLoading(false)
    }
  }

  const studentTotal = totalStudents(form.selectedClasses, form.classCounts)
  const availMeters = Number(form.availableFabric) || 0
  const forecastRows = useMemo(
    () => buildForecastRows({
      uniformTypes: form.uniformTypes,
      selectedClasses: form.selectedClasses,
      classCounts: form.classCounts,
      availableMeters: availMeters,
    }),
    [form.uniformTypes, form.selectedClasses, form.classCounts, availMeters]
  )
  const baseDemand = totalFabricDemand(forecastRows)
  const totalDemand = totalFabricDemandWithWaste(forecastRows, form.wasteAllowance)
  const status = fabricStatus(availMeters, totalDemand)
  const primaryUniform = form.uniformTypes[0]
  const primaryAvg = primaryUniform
    ? averageMetersPerChild({
        selectedClasses: form.selectedClasses,
        classCounts: form.classCounts,
        metersPerChild: primaryUniform.metersPerChild,
        perClassMode: primaryUniform.perClassMode,
        classMeters: primaryUniform.classMeters,
      })
    : 0
  const maxPossiblePrimary = primaryUniform ? quantityPossible(availMeters, primaryAvg) : 0
  const primaryDemandRow = forecastRows[0]
  const dressFabricNeeded = primaryDemandRow?.fabricNeeded || 0
  const expectedPrimary = studentTotal > 0
    ? Math.min(studentTotal, maxPossiblePrimary)
    : maxPossiblePrimary
  const usagePct = fabricUsagePercent(totalDemand, availMeters)

  const toggleClass = async (name) => {
    if (form.selectedClasses.includes(name)) {
      patch({ selectedClasses: form.selectedClasses.filter((c) => c !== name) })
      return
    }
    let count = form.classCounts[name]
    if (count == null) {
      const row = allClasses.find((c) => c.class_name === name)
      count = row?.count ?? 0
      if (!count) {
        try {
          const stats = await fetchUniformClassStats(name, form.academicYear)
          count = Number(stats?.total || 0)
        } catch {
          count = 0
        }
      }
    }
    patch({
      selectedClasses: [...form.selectedClasses, name],
      classCounts: { ...form.classCounts, [name]: count },
    })
  }

  const selectGroup = (group) => {
    const inGroup = allClasses.filter((c) => classGroup(c.class_name) === group)
    const names = inGroup.map((c) => c.class_name)
    const counts = { ...form.classCounts }
    inGroup.forEach((c) => { counts[c.class_name] = c.count })
    patch({
      selectedClasses: [...new Set([...form.selectedClasses, ...names])],
      classCounts: counts,
    })
  }

  const applyPackage = (key) => {
    const pkg = UNIFORM_PACKAGES[key]
    if (!pkg) return
    patch({
      uniformTypes: pkg.map((u) => ({
        id: uid(),
        name: u.name,
        metersPerChild: u.metersPerChild,
        perClassMode: false,
        classMeters: {},
      })),
    })
  }

  const persist = useCallback(async () => {
    return saveFabricPlanner({
      academicYear: form.academicYear,
      term: form.term === ALL_YEAR_TERM ? '' : form.term,
      fabricRollName: form.fabricRollName,
      fabricType: form.fabricType,
      availableFabric: form.availableFabric,
      fabricReceiptId: form.fabricReceiptId || null,
      supplierName: form.supplierName,
      costPerMeter: form.costPerMeter,
      wasteAllowance: form.wasteAllowance,
      colorAllocations: form.colorAllocations,
      selectedClasses: form.selectedClasses,
      classCounts: form.classCounts,
      uniformTypes: form.uniformTypes,
    })
  }, [form])

  const submitPlan = async (planStatus, reserveFabric = false) => {
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      await persist()
      const items = buildProductionPlan({
        uniformTypes: form.uniformTypes,
        selectedClasses: form.selectedClasses,
        classCounts: form.classCounts,
      })
      await createFabricProductionPlan({
        academicYear: form.academicYear,
        reservedFabric: reserveFabric ? totalDemand : 0,
        requiredFabric: totalDemand,
        remainingFabric: status.enough ? status.remaining : 0,
        studentTotal,
        fabricReceiptId: form.fabricReceiptId || null,
        fabricType: form.fabricType || form.fabricRollName,
        status: planStatus,
        reserveFabric,
        selectedClasses: form.selectedClasses,
        items,
      })
      setSuccess(planStatus === 'draft' ? 'Draft saved successfully.' : 'Production plan approved.')
      onSaved?.()
      setTimeout(() => onClose(), 1200)
    } catch (e) {
      setError(e.message || 'Failed to save plan')
    } finally {
      setSaving(false)
    }
  }

  const canNext = () => {
    if (step === 1) return form.fabricReceiptId && Number(form.availableFabric) > 0 && form.academicYear
    if (step === 2) return studentTotal > 0
    if (step === 3) return form.uniformTypes.some((u) => String(u.name).trim())
    return true
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-[#000435]/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full sm:max-w-[1200px] max-h-[100dvh] sm:max-h-[92vh] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden"
      >
        <div className="relative px-5 sm:px-8 pt-6 pb-5 bg-gradient-to-br from-[#000435] via-[#0d1654] to-[#1a2876] text-white shrink-0">
          <div className="absolute top-0 right-0 w-48 h-48 bg-[#FEBF10]/15 rounded-full blur-3xl" />
          <div className="relative flex justify-between items-start gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#FEBF10]/90">Uniform fabric planner</p>
              <h2 className="text-xl font-bold mt-1">New fabric production plan</h2>
              <p className="text-xs text-white/60 mt-1">Step {step} of 5 — {STEPS[step - 1].label}</p>
            </div>
            <button type="button" onClick={onClose} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition">
              <X size={18} />
            </button>
          </div>
          <div className="relative flex gap-1 mt-5 overflow-x-auto pb-1">
            {STEPS.map((s) => (
              <div
                key={s.id}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-bold uppercase whitespace-nowrap transition ${
                  step === s.id ? 'bg-[#FEBF10] text-[#000435]' : step > s.id ? 'bg-white/20 text-white' : 'bg-white/5 text-white/50'
                }`}
              >
                <s.icon size={12} />
                {s.label}
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 sm:px-8 py-6">
          {loading ? (
            <div className="flex justify-center py-16 text-gray-400 gap-2"><Loader2 className="animate-spin" /> Loading…</div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div key={step} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
                {step === 1 && (
                  <div className="space-y-5">
                    <div>
                      <label className="text-[10px] font-bold uppercase text-gray-400">Link fabric roll *</label>
                      <p className="text-[11px] text-gray-400 mb-2">Select fabric from stock-in — details fill in automatically</p>
                      <select
                        value={form.fabricReceiptId}
                        onChange={(e) => linkFabric(e.target.value)}
                        className={`${inputClass} mt-1`}
                      >
                        <option value="">Select from fabric stock-in</option>
                        {fabricStock.map((f) => (
                          <option key={`w-f-${f.id}`} value={f.id}>
                            {fabricLabel(f)} — {f.remaining_meters ?? f.remaining}m left
                            {f.supplier_name ? ` · ${f.supplier_name}` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    {form.fabricReceiptId ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        <ReadOnlyField label="Fabric roll" value={form.fabricRollName} />
                        <ReadOnlyField label="Available fabric (m)" value={`${form.availableFabric} m`} />
                        <ReadOnlyField label="Supplier" value={form.supplierName} />
                        <ReadOnlyField label="Cost per meter (RWF)" value={form.costPerMeter ? Number(form.costPerMeter).toLocaleString() : '—'} />
                        <ReadOnlyField label="Fabric type" value={form.fabricType} />
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-amber-200 bg-amber-50/40 px-4 py-6 text-center text-xs text-amber-800">
                        Select a fabric roll from stock-in to continue
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold uppercase text-gray-400">Academic year</label>
                        <select
                          value={form.academicYear}
                          onChange={(e) => handleAcademicYearChange(e.target.value)}
                          className={`${inputClass} mt-1`}
                        >
                          {yearOptions.map((y) => (
                            <option key={`yr-${y}`} value={y}>{y}{y === academicSettings.academicYear ? ' (current)' : ''}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase text-gray-400">Term</label>
                        <select
                          value={form.term}
                          onChange={(e) => patch({ term: e.target.value })}
                          className={`${inputClass} mt-1`}
                        >
                          {termOptions.map((t) => (
                            <option key={`term-${t}`} value={t}>
                              {t}{t === academicSettings.currentTerm ? ' (current)' : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase text-gray-400">Waste allowance (%)</label>
                        <input type="number" min="0" max="30" step="0.5" value={form.wasteAllowance} onChange={(e) => patch({ wasteAllowance: e.target.value })} className={`${inputClass} mt-1`} />
                      </div>
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div>
                    <div className="flex flex-wrap gap-2 mb-4">
                      <button type="button" onClick={() => patch({ selectedClasses: allClasses.map((c) => c.class_name), classCounts: Object.fromEntries(allClasses.map((c) => [c.class_name, c.count])) })} className="text-[10px] font-bold uppercase px-3 py-1.5 rounded-lg bg-amber-100 text-amber-800">Select all</button>
                      {['nursery', 'primary', 'secondary'].map((g) => (
                        <button key={g} type="button" onClick={() => selectGroup(g)} className="text-[10px] font-bold uppercase px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
                          All {g}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                      {allClasses.map((cls) => {
                        const checked = form.selectedClasses.includes(cls.class_name)
                        return (
                          <button key={`w-cls-${cls.class_name}`} type="button" onClick={() => toggleClass(cls.class_name)}
                            className={`p-3 rounded-xl border text-left transition ${checked ? 'bg-amber-50 border-amber-300' : 'bg-gray-50 border-gray-100 hover:border-gray-200'}`}>
                            <div className="flex items-center gap-2">
                              <span className={`w-4 h-4 rounded border flex items-center justify-center ${checked ? 'bg-amber-400 border-amber-500 text-white' : 'border-gray-300'}`}>
                                {checked && <CheckCircle2 size={10} />}
                              </span>
                              <span className="text-xs font-bold text-[#000435]">{cls.class_name}</span>
                            </div>
                            <p className="text-[10px] text-gray-400 mt-1 ml-6">{cls.count} students</p>
                          </button>
                        )
                      })}
                    </div>
                    <div className="mt-4 p-4 rounded-xl bg-[#000435]/5 text-sm font-bold text-[#000435]">
                      Selected students: <span className="text-amber-600">{studentTotal}</span>
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {Object.keys(UNIFORM_PACKAGES).map((key) => (
                        <button key={key} type="button" onClick={() => applyPackage(key)} className="text-[10px] font-bold uppercase px-3 py-2 rounded-xl border border-amber-200 text-amber-700 hover:bg-amber-50">
                          {key} package
                        </button>
                      ))}
                      <button type="button" onClick={() => patch({ uniformTypes: [...form.uniformTypes, { id: uid(), name: '', metersPerChild: 1, perClassMode: false, classMeters: {} }] })} className="text-[10px] font-bold uppercase px-3 py-2 rounded-xl bg-amber-400 text-[#000435] flex items-center gap-1">
                        <Plus size={12} /> Add uniform
                      </button>
                    </div>
                    <div className="space-y-2">
                      {form.uniformTypes.map((u) => (
                        <div key={`w-u-${u.id}`} className="flex flex-wrap gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50/50 items-end">
                          <div className="flex-1 min-w-[120px]">
                            <label className="text-[10px] font-bold uppercase text-gray-400">Uniform</label>
                            <input value={u.name} onChange={(e) => patch({ uniformTypes: form.uniformTypes.map((x) => x.id === u.id ? { ...x, name: e.target.value } : x) })} className={`${inputClass} mt-1`} />
                          </div>
                          <div className="w-28">
                            <label className="text-[10px] font-bold uppercase text-gray-400">M / child</label>
                            <input type="number" step="0.1" value={u.metersPerChild} onChange={(e) => patch({ uniformTypes: form.uniformTypes.map((x) => x.id === u.id ? { ...x, metersPerChild: e.target.value } : x) })} className={`${inputClass} mt-1`} />
                          </div>
                          <button type="button" onClick={() => patch({ uniformTypes: form.uniformTypes.map((x) => x.id === u.id ? { ...x, perClassMode: !x.perClassMode } : x) })} className={`px-3 py-2.5 rounded-xl text-[10px] font-bold uppercase ${u.perClassMode ? 'bg-[#000435] text-white' : 'border border-gray-200'}`}>Per-class</button>
                          <button type="button" onClick={() => patch({ uniformTypes: form.uniformTypes.filter((x) => x.id !== u.id) })} className="p-2 text-red-400"><Trash2 size={15} /></button>
                          {u.perClassMode && form.selectedClasses.length > 0 && (
                            <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-gray-100">
                              {form.selectedClasses.map((name) => (
                                <div key={`w-cm-${u.id}-${name}`}>
                                  <label className="text-[9px] font-bold text-gray-400 uppercase">{name}</label>
                                  <input type="number" step="0.1" value={u.classMeters[name] ?? u.metersPerChild} onChange={(e) => patch({ uniformTypes: form.uniformTypes.map((x) => x.id === u.id ? { ...x, classMeters: { ...x.classMeters, [name]: e.target.value } } : x) })} className="w-full mt-0.5 border rounded-lg px-2 py-1 text-xs" />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {step === 4 && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                      {[
                        { label: 'Total students', value: studentTotal },
                        { label: 'Fabric required', value: `${totalDemand}m`, sub: `incl. ${form.wasteAllowance}% waste` },
                        { label: 'Fabric available', value: `${roundMeters(availMeters)}m` },
                        { label: 'Remaining', value: `${status.enough ? status.remaining : 0}m`, danger: !status.enough },
                        {
                          label: `Expected ${primaryUniform?.name || 'uniforms'}`,
                          value: expectedPrimary,
                          sub: studentTotal > 0
                            ? `${studentTotal} students · max ${maxPossiblePrimary} from fabric`
                            : `Max ${maxPossiblePrimary} from ${roundMeters(availMeters)}m`,
                        },
                      ].map((c) => (
                        <div key={c.label} className={`rounded-2xl border p-4 ${c.danger ? 'border-red-200 bg-red-50' : 'border-gray-100 bg-white'}`}>
                          <p className="text-[10px] font-bold uppercase text-gray-400">{c.label}</p>
                          <p className="text-xl font-bold text-[#000435] mt-1">{c.value}</p>
                          {c.sub && <p className="text-[10px] text-gray-400 mt-0.5">{c.sub}</p>}
                        </div>
                      ))}
                    </div>

                    {primaryUniform && (
                      <div className="rounded-xl border border-amber-100 bg-amber-50/40 px-4 py-3 text-xs text-amber-900">
                        <span className="font-bold">{primaryUniform.name} plan:</span>{' '}
                        {expectedPrimary} pcs for students · needs {dressFabricNeeded}m fabric
                        {Number(form.wasteAllowance) > 0 && ` (+${form.wasteAllowance}% waste → ${roundMeters(dressFabricNeeded * (1 + Number(form.wasteAllowance) / 100))}m)`}
                      </div>
                    )}

                    <div className="rounded-2xl border border-gray-100 p-5 bg-white">
                      <div className="flex justify-between text-xs font-bold mb-2">
                        <span className="text-gray-500">Fabric usage</span>
                        <span className="text-[#000435]">{usagePct}%</span>
                      </div>
                      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${usagePct}%` }} className={`h-full rounded-full ${usagePct > 90 ? 'bg-red-400' : 'bg-amber-400'}`} />
                      </div>
                      <p className="text-[11px] text-gray-400 mt-2">Base demand {baseDemand}m + waste → {totalDemand}m</p>
                    </div>
                    {!status.enough && (
                      <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                        <AlertCircle size={16} /> Short {status.shortfall}m — adjust classes or add fabric
                      </div>
                    )}
                  </div>
                )}

                {step === 5 && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="rounded-2xl border border-gray-100 p-5 space-y-3 text-sm">
                      <h3 className="font-bold text-[#000435]">Plan summary</h3>
                      {[
                        ['Fabric', form.fabricRollName || form.fabricType],
                        ['Academic year', form.academicYear],
                        ['Term', form.term],
                        ['Classes', form.selectedClasses.join(', ') || '—'],
                        ['Students', studentTotal],
                        [`Expected ${primaryUniform?.name || 'uniforms'}`, expectedPrimary],
                        ['Required', `${totalDemand}m`],
                        ['Remaining', `${status.enough ? status.remaining : 0}m`],
                        ['Status', status.enough ? 'Ready' : 'Insufficient fabric'],
                      ].map(([k, v]) => (
                        <div key={k} className="flex justify-between border-b border-gray-50 pb-2">
                          <span className="text-gray-500">{k}</span>
                          <span className="font-bold text-[#000435]">{v}</span>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-3">
                      <p className="text-xs text-gray-400">After approval, fabric is reserved and a production order is created for the tailor.</p>
                      {error && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={14} />{error}</p>}
                      {success && <p className="text-xs text-emerald-600 flex items-center gap-1"><CheckCircle2 size={14} />{success}</p>}
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        <div className="shrink-0 px-5 sm:px-8 py-4 border-t border-gray-100 bg-gray-50/80 flex flex-wrap items-center justify-between gap-3">
          <button type="button" onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1 || saving} className="inline-flex items-center gap-1 px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold uppercase disabled:opacity-40">
            <ChevronLeft size={14} /> Back
          </button>
          <div className="flex flex-wrap gap-2">
            {step === 5 ? (
              <>
                <button type="button" disabled={saving} onClick={() => submitPlan('draft')} className="px-4 py-2.5 rounded-xl border border-gray-300 text-xs font-bold uppercase">Save draft</button>
                <button type="button" disabled={saving || !status.enough} onClick={() => submitPlan('approved', true)} className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold uppercase disabled:opacity-50">Approve plan</button>
                <button type="button" disabled={saving || !status.enough} onClick={() => submitPlan('in_production', true)} className="px-4 py-2.5 rounded-xl bg-[#000435] text-white text-xs font-bold uppercase disabled:opacity-50">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : 'Generate production order'}
                </button>
              </>
            ) : (
              <button type="button" disabled={!canNext()} onClick={() => setStep((s) => Math.min(5, s + 1))} className="inline-flex items-center gap-1 px-5 py-2.5 rounded-xl bg-amber-400 text-[#000435] text-xs font-bold uppercase disabled:opacity-40">
                Next <ChevronRight size={14} />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
