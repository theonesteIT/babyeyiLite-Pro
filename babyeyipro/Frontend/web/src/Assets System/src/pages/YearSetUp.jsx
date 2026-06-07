import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Search, X, Calendar, TrendingDown, ShieldCheck, CheckCircle2, Clock, Ban, Lock, Unlock,
  Upload, Eye, Edit3, AlertTriangle, Banknote, Layers, BookOpen, Loader2, Plus, Trash2,
} from 'lucide-react'
import assetsApi from '../../../assets_portal/services/assetsApi'
import CategoryFormModal from '../components/CategoryFormModal'
import { yearOptionsFrom1900, defaultYearDates, formatRwfPlain } from '../../../assets_portal/utils/financialYearUtils'
import { computeYearStartAnnualDep } from '../../../assets_portal/utils/assetRegisterMath'

const NAVY = '#000435'
const AMBER = '#FEBF10'
const METHODS = ['Diminishing', 'Straight Line']
const statusColors = { Active: 'bg-emerald-100 text-emerald-700', Closed: 'bg-gray-100 text-gray-600', Draft: 'bg-amber-100 text-amber-700' }
const statusIcons = { Active: CheckCircle2, Closed: Ban, Draft: Clock }
const STEP_LABELS = ['Year Info', 'Opening Balances', 'Rules & Depreciation Settings', 'Confirmation']

export default function YearSetUp() {
  const [years, setYears] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)

  const [yearName, setYearName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [description, setDescription] = useState('')
  const [deprMethod, setDeprMethod] = useState('Diminishing')
  const [autoCarry, setAutoCarry] = useState(true)
  const [lockPrev, setLockPrev] = useState(true)
  const [categoryBalances, setCategoryBalances] = useState([])
  const [prevYearSummary, setPrevYearSummary] = useState(null)

  const [tableSearch, setTableSearch] = useState('')
  const [selectedYear, setSelectedYear] = useState(null)
  const [editingYear, setEditingYear] = useState(null)
  const [categories, setCategories] = useState([])
  const [categoryModalOpen, setCategoryModalOpen] = useState(false)
  const [savingCategory, setSavingCategory] = useState(false)
  const [deletingYearId, setDeletingYearId] = useState(null)

  const yearOptions = useMemo(() => yearOptionsFrom1900(), [])
  const usedYears = useMemo(() => new Set(years.map((y) => String(y.year))), [years])

  const loadYears = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await assetsApi.listFinancialYears()
      setYears(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err?.message || 'Failed to load financial years')
      setYears([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadYears() }, [loadYears])

  const loadCategories = useCallback(async () => {
    try {
      const data = await assetsApi.listCategories()
      setCategories(Array.isArray(data) ? data : [])
    } catch {
      setCategories([])
    }
  }, [])

  useEffect(() => { loadCategories() }, [loadCategories])

  const mergeOpeningPreview = useCallback((previewCats, prevRows = []) => {
    const prevMap = new Map(prevRows.map((b) => [b.category_name || b.category, b]))
    return (previewCats || []).map((nc) => {
      const name = nc.category_name || nc.category
      const saved = prevMap.get(name)
      return saved ? { ...nc, ...saved, category_name: name, category: name } : { ...nc, category_name: name, category: name }
    })
  }, [])

  const refreshCategoryBalances = useCallback(async (year, prevRows = []) => {
    if (!year) return
    const data = await assetsApi.getFinancialYearOpeningPreview(Number(year))
    setCategoryBalances(mergeOpeningPreview(data?.categories || [], prevRows))
    setPrevYearSummary(data?.previous_year || null)
  }, [mergeOpeningPreview])

  const loadOpeningPreview = useCallback(async (year) => {
    if (!year) return
    setPreviewLoading(true)
    try {
      const data = await assetsApi.getFinancialYearOpeningPreview(Number(year))
      setCategoryBalances(data?.categories || [])
      setPrevYearSummary(data?.previous_year || null)
    } catch (err) {
      setError(err?.message || 'Failed to load opening balances')
      setCategoryBalances([])
      setPrevYearSummary(null)
    } finally {
      setPreviewLoading(false)
    }
  }, [])

  function reset() {
    setStep(1)
    setEditingYear(null)
    setYearName('')
    setStartDate('')
    setEndDate('')
    setDescription('')
    setDeprMethod('Diminishing')
    setAutoCarry(true)
    setLockPrev(true)
    setCategoryBalances([])
    setPrevYearSummary(null)
    setError('')
  }

  const openCreate = () => {
    reset()
    const next = yearOptions.find((y) => !usedYears.has(String(y)))
    if (next) handleYearSelect(String(next))
    setModalOpen(true)
  }

  const openEdit = (y) => {
    reset()
    setEditingYear(y)
    setYearName(String(y.year))
    setStartDate(y.start_date || y.start || '')
    setEndDate(y.end_date || y.end || '')
    setDescription(y.description || '')
    setDeprMethod(y.dep_method || 'Diminishing')
    setAutoCarry(y.auto_carry_forward !== false)
    setLockPrev(y.lock_previous_year !== false)
    setCategoryBalances((y.category_balances || []).map((b) => ({ ...b })))
    setModalOpen(true)
  }

  const handleYearSelect = (y) => {
    setYearName(y)
    const { startDate: s, endDate: e } = defaultYearDates(y)
    setStartDate(s)
    setEndDate(e)
    loadOpeningPreview(y)
  }

  const updateBalanceField = (categoryName, field, value) => {
    const num = Number(value) || 0
    setCategoryBalances((rows) => rows.map((r) => {
      if (r.category_name !== categoryName && r.category !== categoryName) return r
      const next = { ...r, [field]: num }
      if (field === 'opening_balance') next.opening = num
      if (field === 'accumulated_depreciation') next.total_depreciation_start = num
      return next
    }))
  }

  const balancePayload = () => categoryBalances.map((b) => ({
    category_id: b.category_id,
    category: b.category_name || b.category,
    opening_balance: b.opening_balance ?? b.opening,
    last_year_closing: b.last_year_closing ?? b.lastYearClosing,
    depreciation_rate: b.depreciation_rate,
    accumulated_depreciation: b.accumulated_depreciation ?? b.previous_accumulated_depreciation ?? b.total_depreciation_start,
    total_depreciation_start: b.total_depreciation_start ?? b.accumulated_depreciation ?? b.previous_accumulated_depreciation,
  }))

  const handleSave = async () => {
    setSaving(true)
    setError('')
    const payload = {
      start_date: startDate,
      end_date: endDate,
      description,
      dep_method: deprMethod,
      auto_carry_forward: autoCarry,
      lock_previous_year: lockPrev,
      category_balances: balancePayload(),
    }
    try {
      if (editingYear) {
        await assetsApi.updateFinancialYear(editingYear.id, payload)
      } else {
        await assetsApi.createFinancialYear({ year: Number(yearName), ...payload })
      }
      setModalOpen(false)
      reset()
      await loadYears()
    } catch (err) {
      setError(err?.message || `Failed to ${editingYear ? 'update' : 'create'} financial year`)
    } finally {
      setSaving(false)
    }
  }

  const handleCloseYear = async (id) => {
    if (!window.confirm('Close this financial year? You can reopen it later from Year Setup.')) return
    try {
      await assetsApi.closeFinancialYear(id)
      if (selectedYear?.id === id) setSelectedYear(null)
      await loadYears()
    } catch (err) {
      setError(err?.message || 'Failed to close year')
    }
  }

  const handleReopenYear = async (id) => {
    if (!window.confirm('Reopen this financial year? It will become the active year for new asset entries.')) return
    try {
      await assetsApi.reopenFinancialYear(id)
      if (selectedYear?.id === id) setSelectedYear(null)
      await loadYears()
    } catch (err) {
      setError(err?.message || 'Failed to reopen year')
    }
  }

  const handleDeleteYear = async (y) => {
    const label = `${y.year} / ${y.year + 1}`
    if (!window.confirm(`Delete financial year ${label}? Category balances for this year will be removed. This cannot be undone.`)) return
    setDeletingYearId(y.id)
    setError('')
    try {
      await assetsApi.deleteFinancialYear(y.id)
      if (selectedYear?.id === y.id) setSelectedYear(null)
      if (editingYear?.id === y.id) {
        setModalOpen(false)
        reset()
      }
      await loadYears()
    } catch (err) {
      setError(err?.message || 'Failed to delete year')
    } finally {
      setDeletingYearId(null)
    }
  }

  const handleSaveCategory = async (payload) => {
    setSavingCategory(true)
    setError('')
    try {
      await assetsApi.createCategory(payload)
      setCategoryModalOpen(false)
      await loadCategories()
      if (modalOpen && yearName) {
        setPreviewLoading(true)
        try {
          await refreshCategoryBalances(yearName, categoryBalances)
        } finally {
          setPreviewLoading(false)
        }
      }
    } catch (err) {
      setError(err?.message || 'Failed to add category')
    } finally {
      setSavingCategory(false)
    }
  }

  const handleContinue = async () => {
    if (step === 1 && yearName && !categoryBalances.length && !previewLoading) {
      await loadOpeningPreview(yearName)
    }
    setStep(step + 1)
  }

  const filteredYears = years.filter((y) => {
    const q = tableSearch.trim().toLowerCase()
    if (!q) return true
    return String(y.year).includes(q) || String(y.description || '').toLowerCase().includes(q)
  })

  const activeYear = years.find((y) => y.status === 'Active')
  const closedCount = years.filter((y) => y.status === 'Closed').length
  const totalValue = years.reduce((s, y) => s + Number(y.total_assets || 0), 0)
  const totalDep = years.reduce((s, y) => s + Number(y.accumulated_depreciation || 0), 0)

  return (
    <div className="space-y-6" style={{ fontFamily: "'Montserrat', sans-serif" }}>
      <CategoryFormModal
        open={categoryModalOpen}
        onClose={() => !savingCategory && setCategoryModalOpen(false)}
        onSave={handleSaveCategory}
        saving={savingCategory}
      />

      {modalOpen && (
        <div className="fixed inset-0 z-[150] flex items-start justify-center overflow-y-auto bg-black/50 backdrop-blur-sm py-6">
          <div className="relative w-full max-w-3xl mx-4 bg-[#F8F9FC] rounded-2xl shadow-2xl border border-gray-100 my-auto">
            <div className="sticky top-0 z-10 rounded-t-2xl px-6 py-4 flex items-center justify-between text-white" style={{ background: NAVY }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: AMBER }}>
                  <Banknote size={18} style={{ color: NAVY }} />
                </div>
                <div>
                  <h2 className="text-lg font-bold">{editingYear ? 'Edit Financial Year' : 'Create Financial Year'}</h2>
                  <p className="text-xs text-white/60">
                    Step {step} of 4 — {STEP_LABELS[step - 1]}
                    {editingYear ? ` · ${editingYear.year} / ${editingYear.year + 1}` : ''}
                  </p>
                </div>
              </div>
              <button type="button" onClick={() => { setModalOpen(false); reset() }} className="p-1.5 hover:bg-white/10 rounded-lg"><X size={20} /></button>
            </div>

            <div className="px-6 pt-5 pb-2">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4].map((s) => (
                  <div key={s} className="flex items-center gap-1 flex-1">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      s < step ? 'bg-emerald-500 text-white' : s === step ? 'text-[#0B1530]' : 'bg-gray-200 text-gray-500'
                    }`} style={s === step ? { background: AMBER } : undefined}>
                      {s < step ? <CheckCircle2 size={14} /> : s}
                    </div>
                    {s < 4 && <div className={`flex-1 h-0.5 rounded ${s < step ? 'bg-emerald-400' : 'bg-gray-200'}`} />}
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-1 text-[10px] text-gray-400 font-medium px-0.5">
                {STEP_LABELS.map((l) => <span key={l}>{l.split(' ')[0]}</span>)}
              </div>
            </div>

            <div className="px-6 py-4 max-h-[55vh] overflow-y-auto space-y-4">
              {step === 1 && (
                <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm space-y-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold flex items-center gap-1.5"><Calendar size={14} /> Financial Year Information</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Financial Year *</label>
                      <select className="assets-wizard-input w-full text-sm" value={yearName}
                        onChange={(e) => handleYearSelect(e.target.value)} disabled={!!editingYear}>
                        <option value="">Select year…</option>
                        {yearOptions.map((y) => (
                          <option key={y} value={y} disabled={!editingYear && usedYears.has(String(y))}>{y} / {y + 1}</option>
                        ))}
                      </select>
                      {editingYear && <p className="text-[10px] text-gray-500 mt-1">Year cannot be changed when editing.</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Description (optional)</label>
                      <input type="text" className="assets-wizard-input w-full text-sm" value={description} onChange={(e) => setDescription(e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Start Date *</label>
                      <input type="date" className="assets-wizard-input w-full text-sm" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">End Date *</label>
                      <input type="date" className="assets-wizard-input w-full text-sm" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                    </div>
                  </div>
                  {prevYearSummary && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
                      <BookOpen size={16} className="text-amber-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-amber-700">Previous year detected ({prevYearSummary.year})</p>
                        <p className="text-[10px] text-amber-600 mt-0.5">
                          Opening stock RWF {formatRwfPlain(prevYearSummary.closing_balance)} and total depreciation
                          RWF {formatRwfPlain(prevYearSummary.accumulated_depreciation)} carry forward per category.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-blue-200 bg-blue-50/60 px-4 py-3 text-[11px] text-blue-900 space-y-1">
                    <p className="font-bold uppercase tracking-wider">Depreciation engine</p>
                    <p><strong>TOTAL BALANCE</strong> = Opening stock + Purchase price</p>
                    <p><strong>Annual depreciation</strong> = Accumulated depreciation start × category rate</p>
                    <p><strong>TOTAL DEPRECIATION</strong> = Total balance − Annual depreciation (closing balance)</p>
                    <p><strong>Next asset</strong> opening = prior total balance; accumulated start = prior total depreciation</p>
                    <p className="text-blue-700">First asset in year uses Opening stock &amp; Accumulated dep. start from Year Setup (Step 2).</p>
                  </div>
                  <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                      <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold flex items-center gap-1.5">
                        <Layers size={14} /> Opening Balance &amp; Depreciation Start
                      </p>
                      <button
                        type="button"
                        onClick={() => setCategoryModalOpen(true)}
                        disabled={!yearName || savingCategory}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 disabled:opacity-40"
                      >
                        <Plus size={14} /> Add Category
                      </button>
                    </div>
                    {!yearName ? (
                      <p className="text-sm text-gray-400 text-center py-6">Select a financial year in Step 1 first.</p>
                    ) : previewLoading ? (
                      <div className="flex items-center justify-center gap-2 py-8 text-gray-500"><Loader2 className="animate-spin" size={20} /> Loading…</div>
                    ) : categoryBalances.length === 0 ? (
                      <div className="text-center py-6 space-y-3">
                        <p className="text-sm text-gray-400">No categories yet.</p>
                        <button
                          type="button"
                          onClick={() => setCategoryModalOpen(true)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold"
                          style={{ background: AMBER, color: NAVY }}
                        >
                          <Plus size={16} /> Add your first category
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2 overflow-x-auto">
                        <div className="grid grid-cols-6 gap-2 min-w-[720px] text-[10px] font-semibold text-gray-500 px-3 pb-2 border-b uppercase">
                          <span>Category</span><span>Opening stock</span><span>Last yr closing</span>
                          <span>Acc. dep. start</span><span>Rate</span><span>Year-start annual</span>
                        </div>
                        {categoryBalances.map((b) => {
                          const name = b.category_name || b.category
                          const opening = b.opening_balance ?? b.opening ?? 0
                          const lastClose = b.last_year_closing ?? b.lastYearClosing ?? 0
                          const accDep = b.accumulated_depreciation ?? b.total_depreciation_start ?? b.previous_accumulated_depreciation ?? 0
                          const rate = b.depreciation_rate ?? 5
                          const yearStartAnnual = computeYearStartAnnualDep(accDep, rate)
                          return (
                            <div key={name} className="grid grid-cols-6 gap-2 min-w-[720px] items-center px-3 py-2.5 hover:bg-gray-50 rounded-lg">
                              <span className="text-sm font-medium" style={{ color: NAVY }}>{name}</span>
                              <input type="number" className="assets-wizard-input text-sm" value={opening}
                                onChange={(e) => updateBalanceField(name, 'opening_balance', e.target.value)} />
                              <span className="text-xs text-gray-500 font-mono tabular-nums">RWF {formatRwfPlain(lastClose)}</span>
                              <input type="number" className="assets-wizard-input text-sm" value={accDep}
                                onChange={(e) => updateBalanceField(name, 'accumulated_depreciation', e.target.value)} />
                              <span className="text-sm font-mono text-amber-600">{rate}%</span>
                              <span className="text-xs font-mono text-red-600 tabular-nums">RWF {formatRwfPlain(yearStartAnnual)}</span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm space-y-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold flex items-center gap-1.5"><ShieldCheck size={14} /> Depreciation Settings</p>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-2">Default Depreciation Method</label>
                      <div className="flex gap-2">
                        {METHODS.map((m) => (
                          <button key={m} type="button" onClick={() => setDeprMethod(m)}
                            className={`flex-1 py-2.5 rounded-xl text-xs font-bold border-2 ${deprMethod === m ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-gray-200 text-gray-500'}`}>
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-3">Rates by category (from database)</label>
                      <div className="space-y-2">
                        {categoryBalances.map((b) => (
                          <div key={b.category_name || b.category} className="flex justify-between px-3 py-2 bg-gray-50 rounded-lg text-sm">
                            <span className="font-medium" style={{ color: NAVY }}>{b.category_name || b.category}</span>
                            <span className="font-mono text-amber-600 font-bold">{b.depreciation_rate ?? 5}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm space-y-3">
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold flex items-center gap-1.5"><Lock size={14} /> Year Rules</p>
                    {[
                      { label: 'Auto Carry Forward', desc: 'Opening = previous year closing per category', on: autoCarry, set: setAutoCarry, icon: Unlock },
                      { label: 'Lock Previous Year', desc: 'Prevents edits to closed years (recommended)', on: lockPrev, set: setLockPrev, icon: Lock },
                    ].map((rule) => (
                      <div key={rule.label} className="flex items-center justify-between px-3 py-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <rule.icon size={16} className={rule.on ? 'text-emerald-500' : 'text-gray-400'} />
                          <div><p className="text-sm font-medium" style={{ color: NAVY }}>{rule.label}</p><p className="text-[10px] text-gray-500">{rule.desc}</p></div>
                        </div>
                        <button type="button" onClick={() => rule.set(!rule.on)} className={`relative w-10 h-5 rounded-full ${rule.on ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                          <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${rule.on ? 'left-[22px]' : 'left-0.5'}`} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-4">
                  <div className="bg-white rounded-xl p-5 border border-amber-200 ring-2 ring-amber-200/40">
                    <p className="text-xs text-amber-700 uppercase font-bold tracking-wider mb-4 flex items-center gap-1.5"><CheckCircle2 size={14} /> Year Summary</p>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-gray-50 rounded-lg p-3"><span className="text-[10px] text-gray-500">Financial Year</span><p className="font-semibold mt-0.5">{yearName} / {Number(yearName) + 1}</p></div>
                      <div className="bg-gray-50 rounded-lg p-3"><span className="text-[10px] text-gray-500">Duration</span><p className="font-semibold mt-0.5">{startDate} → {endDate}</p></div>
                      <div className="bg-gray-50 rounded-lg p-3"><span className="text-[10px] text-gray-500">Method</span><p className="font-semibold mt-0.5">{deprMethod}</p></div>
                      <div className="bg-gray-50 rounded-lg p-3"><span className="text-[10px] text-gray-500">Carry forward</span><p className="font-semibold mt-0.5">{autoCarry ? 'Auto' : 'Manual'}</p></div>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-5 border border-gray-100">
                    <p className="text-xs text-gray-500 uppercase font-semibold mb-3">Opening balances by category</p>
                    {categoryBalances.map((b) => {
                      const acc = b.accumulated_depreciation ?? b.total_depreciation_start ?? 0
                      return (
                        <div key={b.category_name || b.category} className="px-3 py-2 bg-gray-50 rounded-lg text-sm mb-2">
                          <div className="flex justify-between font-medium">
                            <span>{b.category_name || b.category}</span>
                            <span className="font-mono text-amber-600">Opening RWF {formatRwfPlain(b.opening_balance ?? b.opening)}</span>
                          </div>
                          <div className="flex justify-between text-[11px] text-gray-500 mt-1">
                            <span>Accumulated dep. start</span>
                            <span className="font-mono text-red-600">RWF {formatRwfPlain(acc)}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                    <AlertTriangle size={16} className="text-amber-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-amber-700">
                      {editingYear
                        ? 'Saving updates dates, rules, and opening balances. Only the active year allows new asset entries.'
                        : 'You can edit opening balances later. Only the active year allows new asset entries.'}
                    </p>
                  </div>
                </div>
              )}
              {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}
            </div>

            <div className="sticky bottom-0 bg-white rounded-b-2xl border-t px-6 py-4 flex items-center justify-between">
              <button type="button" onClick={() => step > 1 && setStep(step - 1)} disabled={step === 1 || saving}
                className={`text-sm font-medium px-4 py-2 rounded-lg ${step === 1 ? 'text-gray-300' : 'text-gray-500 hover:bg-gray-100'}`}>Back</button>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => { setModalOpen(false); reset() }} disabled={saving} className="text-sm text-gray-500 px-4 py-2 hover:bg-gray-100 rounded-lg">Cancel</button>
                {step < 4 ? (
                  <button type="button" onClick={handleContinue} disabled={!yearName || saving}
                    className="font-medium px-5 py-2 rounded-lg text-sm text-[#0B1530]" style={{ background: AMBER }}>Continue</button>
                ) : (
                  <button type="button" onClick={handleSave} disabled={saving}
                    className="bg-emerald-500 text-white font-medium px-6 py-2 rounded-lg text-sm flex items-center gap-1.5 disabled:opacity-50">
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                    {editingYear ? 'Save Changes' : 'Create Year'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedYear && (
        <div className="fixed inset-0 z-[160] flex items-start justify-center overflow-y-auto bg-black/50 backdrop-blur-sm py-6">
          <div className="relative w-full max-w-lg mx-4 bg-white rounded-2xl shadow-2xl my-auto">
            <div className="rounded-t-2xl px-6 py-4 flex items-center justify-between text-white" style={{ background: NAVY }}>
              <div><h2 className="text-lg font-bold">Year {selectedYear.year}</h2><p className="text-xs text-white/60">Financial year overview</p></div>
              <button type="button" onClick={() => setSelectedYear(null)} className="p-1.5 hover:bg-white/10 rounded-lg"><X size={20} /></button>
            </div>
            <div className="px-6 py-6 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-50 rounded-lg p-3"><span className="text-[10px] text-gray-500">Start</span><p className="font-medium mt-0.5">{selectedYear.start_date || selectedYear.start}</p></div>
                <div className="bg-gray-50 rounded-lg p-3"><span className="text-[10px] text-gray-500">End</span><p className="font-medium mt-0.5">{selectedYear.end_date || selectedYear.end}</p></div>
                <div className="bg-gray-50 rounded-lg p-3"><span className="text-[10px] text-gray-500">Opening</span><p className="font-medium mt-0.5">RWF {formatRwfPlain(selectedYear.opening_balance)}</p></div>
                <div className="bg-gray-50 rounded-lg p-3"><span className="text-[10px] text-gray-500">Closing</span><p className="font-medium mt-0.5">RWF {formatRwfPlain(selectedYear.closing_balance)}</p></div>
                <div className="bg-gray-50 rounded-lg p-3 col-span-2"><span className="text-[10px] text-gray-500">Total Depreciation</span><p className="font-medium mt-0.5 text-red-700">RWF {formatRwfPlain(selectedYear.accumulated_depreciation)}</p></div>
              </div>
              {(selectedYear.category_balances || []).map((b) => (
                <div key={b.category_name || b.category} className="text-sm border-b border-gray-100 py-2 space-y-1">
                  <div className="flex justify-between font-medium"><span>{b.category_name || b.category}</span><span className="font-mono">Closing RWF {formatRwfPlain(b.closing_balance)}</span></div>
                  <div className="flex justify-between text-[11px] text-gray-500">
                    <span>Opening · Acc. dep · Annual</span>
                    <span className="font-mono">RWF {formatRwfPlain(b.opening_balance)} · RWF {formatRwfPlain(b.accumulated_depreciation)} · RWF {formatRwfPlain(b.annual_depreciation)}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t px-6 py-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => { openEdit(selectedYear); setSelectedYear(null) }}
                  className="text-sm font-medium px-4 py-2 rounded-lg flex items-center gap-1.5 hover:bg-amber-50 text-amber-700">
                  <Edit3 size={15} /> Edit
                </button>
                {selectedYear.status === 'Closed' && (
                  <button type="button" onClick={() => handleReopenYear(selectedYear.id)}
                    className="text-sm font-medium px-4 py-2 rounded-lg flex items-center gap-1.5 bg-emerald-500 text-white hover:bg-emerald-600">
                    <Unlock size={15} /> Reopen Year
                  </button>
                )}
                {selectedYear.status === 'Active' && (
                  <button type="button" onClick={() => handleCloseYear(selectedYear.id)}
                    className="text-sm font-medium px-4 py-2 rounded-lg flex items-center gap-1.5 hover:bg-red-50 text-red-600">
                    <Ban size={15} /> Close Year
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleDeleteYear(selectedYear)}
                  disabled={deletingYearId === selectedYear.id}
                  className="text-sm font-medium px-4 py-2 rounded-lg flex items-center gap-1.5 hover:bg-red-50 text-red-600 disabled:opacity-40"
                >
                  {deletingYearId === selectedYear.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                  Delete
                </button>
              </div>
              <button type="button" onClick={() => setSelectedYear(null)} className="text-sm text-gray-500 px-4 py-2 hover:bg-gray-100 rounded-lg">Dismiss</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2" style={{ color: NAVY }}><Banknote size={24} className="text-amber-500" /> Financial Year Setup</h2>
          <p className="text-gray-500 text-sm mt-1">Manage financial years, carry-forward balances, and depreciation rules</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setCategoryModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border border-gray-200 bg-white hover:bg-gray-50"
            style={{ color: NAVY }}
          >
            <Plus size={18} /> Add Category
          </button>
          <button type="button" onClick={openCreate} className="btn-primary flex items-center gap-2">
            <Plus size={18} /> Create Year
          </button>
        </div>
      </div>

      {error && !modalOpen && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Years', value: years.length, icon: Layers },
          { label: 'Active Year', value: activeYear?.year || '—', icon: CheckCircle2 },
          { label: 'Closed Years', value: closedCount, icon: Ban },
          { label: 'Total Asset Value', value: `RWF ${formatRwfPlain(totalValue)}`, icon: Banknote },
          { label: 'Total Depreciation', value: `RWF ${formatRwfPlain(totalDep)}`, icon: TrendingDown },
        ].map((k) => (
          <div key={k.label} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <k.icon size={20} className="text-amber-500 mb-2" />
            <p className="text-xl font-bold tabular-nums" style={{ color: NAVY }}>{k.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-20"><Loader2 className="animate-spin text-amber-500" size={24} /></div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b flex flex-col sm:flex-row gap-3 justify-between">
            <div className="relative w-full sm:w-72">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Search years…" className="assets-wizard-input pl-10 w-full text-sm" value={tableSearch} onChange={(e) => setTableSearch(e.target.value)} />
            </div>
            <div className="text-xs text-gray-500 flex items-center gap-1"><Clock size={14} className="text-amber-500" /> Active: {activeYear?.year || 'None'}</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['Year', 'Start Date', 'End Date', 'Status', 'Total Assets', 'Opening Balance', 'Total Depreciation', 'Closing Balance', 'Actions'].map((h) => (
                    <th key={h} className="table-header">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredYears.map((y) => {
                  const StatusIcon = statusIcons[y.status] || Clock
                  return (
                    <tr key={y.id} className="hover:bg-gray-50">
                      <td className="table-cell font-bold text-sm">{y.year} / {y.year + 1}</td>
                      <td className="table-cell text-sm">{y.start_date || y.start}</td>
                      <td className="table-cell text-sm">{y.end_date || y.end}</td>
                      <td className="table-cell"><span className={`badge text-[10px] inline-flex items-center gap-1 ${statusColors[y.status] || statusColors.Draft}`}><StatusIcon size={12} /> {y.status}</span></td>
                      <td className="table-cell font-mono text-sm">RWF {formatRwfPlain(y.total_assets)}</td>
                      <td className="table-cell font-mono text-sm">RWF {formatRwfPlain(y.opening_balance)}</td>
                      <td className="table-cell font-mono text-sm text-red-700">RWF {formatRwfPlain(y.accumulated_depreciation)}</td>
                      <td className="table-cell font-mono text-sm">RWF {formatRwfPlain(y.closing_balance)}</td>
                      <td className="table-cell">
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => setSelectedYear(y)} className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-600" title="View"><Eye size={15} /></button>
                          <button type="button" onClick={() => openEdit(y)} className="p-1.5 hover:bg-amber-50 rounded-lg text-amber-600" title="Edit"><Edit3 size={15} /></button>
                          {y.status === 'Closed' ? (
                            <button type="button" onClick={() => handleReopenYear(y.id)} className="p-1.5 hover:bg-emerald-50 rounded-lg text-emerald-600" title="Reopen year"><Unlock size={15} /></button>
                          ) : (
                            <button type="button" onClick={() => handleCloseYear(y.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-500" title="Close year"><Ban size={15} /></button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteYear(y)}
                            disabled={deletingYearId === y.id}
                            className="p-1.5 hover:bg-red-50 rounded-lg text-red-600 disabled:opacity-40"
                            title="Delete year"
                          >
                            {deletingYearId === y.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {filteredYears.length === 0 && <p className="py-12 text-center text-gray-400 text-sm">No financial years yet. Create your first year.</p>}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h3 className="text-base font-bold mb-4 flex items-center gap-2" style={{ color: NAVY }}><ShieldCheck size={18} className="text-amber-500" /> Year Logic Engine</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div className="rounded-xl p-4 border border-amber-200 bg-amber-50/50">
            <p className="font-bold mb-1">Carry-Forward</p>
            <p className="text-gray-600 text-xs">Opening stock (Year N) = Closing balance from last assets in Year N−1 per category.</p>
          </div>
          <div className="rounded-xl p-4 border border-purple-200 bg-purple-50/50">
            <p className="font-bold mb-1">Depreciation Rollover</p>
            <p className="text-gray-600 text-xs">Total depreciation from last year carries to accumulated depreciation start. Each asset: Total balance = opening + purchase; Total dep = accumulated + annual; Net book = balance − total dep.</p>
          </div>
          <div className="rounded-xl p-4 border border-red-200 bg-red-50/50">
            <p className="font-bold mb-1">Rules Engine</p>
            <p className="text-gray-600 text-xs">Closed years can be reopened or edited. Only the active year allows asset entry.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
