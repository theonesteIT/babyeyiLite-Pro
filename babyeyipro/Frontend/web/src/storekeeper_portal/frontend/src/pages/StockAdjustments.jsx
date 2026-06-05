import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, AlertTriangle, Loader2, RefreshCw, Download, X, Calendar, GraduationCap,
  Package, Search, BadgeCheck, Trash2, Sparkles, AlertCircle, RotateCcw,
} from 'lucide-react'
import StorekeeperPageShell from '../components/StorekeeperPageShell'
import StorekeeperToast from '../components/StorekeeperToast'
import { fetchStoreAcademicSettings } from '../services/academicSettingsService'
import {
  ADJUSTMENT_MODES,
  ADJUSTMENT_REASONS,
  EMPTY_ADJUSTMENT_FORM,
  fetchStockAdjustments,
  fetchAdjustmentSources,
  createStockAdjustment,
  revertStockAdjustment,
  mapAdjustmentToApi,
} from '../services/stockAdjustmentService'

const inputClass =
  'w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-[#000435] focus:bg-white focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 outline-none transition-all'

const REASON_STYLES = {
  Damaged: 'bg-red-50 text-red-700',
  Expired: 'bg-amber-50 text-amber-800',
  Lost: 'bg-purple-50 text-purple-700',
  Returned: 'bg-emerald-50 text-emerald-700',
  Correction: 'bg-sky-50 text-sky-700',
}

function FormField({ icon: Icon, label, children }) {
  return (
    <div>
      <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 flex items-center gap-1">
        {Icon && <Icon size={12} className="text-amber-500" />}
        {label}
      </label>
      {children}
    </div>
  )
}

function fmtDate(d) {
  return d ? String(d).slice(0, 10) : '—'
}

function modeLabel(mode) {
  return ADJUSTMENT_MODES.find((m) => m.id === mode)?.label || mode
}

export default function StockAdjustments() {
  const [rows, setRows] = useState([])
  const [sources, setSources] = useState({ flat: [], grouped: {} })
  const [academic, setAcademic] = useState({ academicYears: [], activeTerms: [], academicYear: '', currentTerm: '' })
  const [filterYear, setFilterYear] = useState('')
  const [filterTerm, setFilterTerm] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [modal, setModal] = useState(false)
  const [revertTarget, setRevertTarget] = useState(null)
  const [form, setForm] = useState(EMPTY_ADJUSTMENT_FORM)
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)

  const showToast = (message, type = 'success') => setToast({ message, type })

  const loadAll = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true)
    setError('')
    try {
      const [adj, src, acad] = await Promise.all([
        fetchStockAdjustments({
          academic_year: filterYear || undefined,
          term: filterTerm || undefined,
          from_date: dateFrom || undefined,
          to_date: dateTo || undefined,
        }),
        fetchAdjustmentSources(),
        fetchStoreAcademicSettings().catch(() => null),
      ])
      setRows(adj.rows)
      setSources(src)
      if (acad) {
        setAcademic(acad)
        setFilterYear((p) => p || acad.academicYear || '')
        setFilterTerm((p) => p || acad.currentTerm || '')
      }
    } catch (e) {
      setError(e.message || 'Failed to load adjustments')
      setRows([])
    } finally {
      if (!silent) setLoading(false)
    }
  }, [filterYear, filterTerm, dateFrom, dateTo])

  useEffect(() => { loadAll() }, [loadAll])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(
      (r) =>
        r.item_name.toLowerCase().includes(q) ||
        r.reason.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q)
    )
  }, [rows, search])

  const stats = useMemo(() => {
    const decreases = rows.filter((r) => r.mode === 'decrease').length
    const uniqueItems = new Set(rows.map((r) => `${r.source_type}:${r.item_name}`)).size
    const byReason = {}
    for (const r of rows) {
      byReason[r.reason] = (byReason[r.reason] || 0) + 1
    }
    const topReason = Object.entries(byReason).sort((a, b) => b[1] - a[1])[0]?.[0] || '—'
    return { total: rows.length, decreases, uniqueItems, topReason }
  }, [rows])

  const selectedSource = sources.flat.find((s) => s.source_key === form.source_key)

  const openModal = () => {
    setForm({
      ...EMPTY_ADJUSTMENT_FORM,
      academic_year: filterYear || academic.academicYear || '',
      term: filterTerm || academic.currentTerm || '',
      adjustment_date: new Date().toISOString().slice(0, 10),
    })
    setModal(true)
  }

  const handleSubmit = async () => {
    if (!form.source_key || !form.quantity) return
    if (form.reason === 'Other' && !form.reason_other.trim()) {
      setError('Specify adjustment reason')
      return
    }
    setSaving(true)
    setError('')
    try {
      await createStockAdjustment(mapAdjustmentToApi(form))
      setModal(false)
      await loadAll({ silent: true })
      showToast('Stock adjustment saved')
    } catch (e) {
      const msg = e.response?.data?.message || e.message || 'Failed to save'
      setError(msg)
      showToast(msg, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleRevert = async () => {
    if (!revertTarget) return
    setSaving(true)
    try {
      await revertStockAdjustment(revertTarget.id)
      setRevertTarget(null)
      await loadAll({ silent: true })
      showToast('Adjustment reverted — stock restored')
    } catch (e) {
      const msg = e.message || 'Failed to revert'
      showToast(msg, 'error')
    } finally {
      setSaving(false)
    }
  }

  const exportCsv = () => {
    const header = ['Date', 'Item', 'Category', 'Source', 'Mode', 'Reason', 'Qty', 'Before', 'After', 'Note']
    const lines = filtered.map((r) => [
      r.adjustment_date,
      r.item_name,
      r.category,
      r.source_type,
      r.mode,
      r.reason,
      r.quantity,
      r.quantity_before,
      r.quantity_after,
      (r.note || '').replace(/,/g, ';'),
    ])
    const csv = [header, ...lines].map((row) => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `stock-adjustments-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <StorekeeperPageShell
      titleLine="Stock Adjustments"
      subtitle="Record damaged, expired, lost, returned, or correction adjustments"
      icon={AlertTriangle}
      rightSlot={
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={exportCsv} disabled={!filtered.length}
            className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-[10px] font-bold uppercase text-white hover:bg-white/15 disabled:opacity-40">
            <Download size={14} /> Export
          </button>
          <button type="button" onClick={openModal}
            className="inline-flex items-center gap-2 rounded-xl border border-[#FEBF10]/35 bg-[#FEBF10]/20 px-4 py-2 text-[10px] font-bold uppercase text-white hover:bg-[#FEBF10]/30">
            <Plus size={14} /> Adjust Stock
          </button>
        </div>
      }
    >
      <StorekeeperToast message={toast?.message} type={toast?.type} onDismiss={() => setToast(null)} />

      <div className="space-y-4">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#000435] via-[#0d1654] to-[#1a2876] p-5 text-white shadow-lg">
          <div className="absolute top-0 right-0 w-40 h-40 bg-red-400/10 rounded-full blur-3xl" />
          <div className="relative flex flex-wrap justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-red-300/90 flex items-center gap-1">
                <Sparkles size={10} /> Storekeeper · Adjustments
              </p>
              <h2 className="text-lg font-bold mt-1">Stock correction & write-offs</h2>
              <p className="text-xs text-white/60 mt-1">Applies to general inventory, food batches, and other supplies</p>
            </div>
            <button type="button" onClick={loadAll} disabled={loading} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 border border-white/10 text-[10px] font-bold uppercase">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm">
            <AlertCircle size={16} />{error}
            <button type="button" onClick={() => setError('')} className="ml-auto"><X size={14} /></button>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total adjustments', value: stats.total, accent: 'text-[#000435]' },
            { label: 'Decreases', value: stats.decreases, accent: 'text-red-600' },
            { label: 'Items affected', value: stats.uniqueItems, accent: 'text-sky-700' },
            { label: 'Top reason', value: stats.topReason, accent: 'text-amber-700', small: true },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <p className="text-[10px] font-bold uppercase text-gray-400">{s.label}</p>
              <p className={`mt-2 font-bold ${s.small ? 'text-sm' : 'text-2xl'} ${s.accent}`}>{s.value}</p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap gap-3 items-end">
            <FormField icon={GraduationCap} label="Year">
              <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} className={inputClass}>
                <option value="">All</option>
                {academic.academicYears.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </FormField>
            <FormField icon={Calendar} label="Term">
              <select value={filterTerm} onChange={(e) => setFilterTerm(e.target.value)} className={inputClass}>
                <option value="">All</option>
                {academic.activeTerms.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </FormField>
            <FormField icon={Calendar} label="From">
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={inputClass} />
            </FormField>
            <FormField icon={Calendar} label="To">
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={inputClass} />
            </FormField>
            <div className="flex-1 min-w-[160px]">
              <FormField icon={Search} label="Search">
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Item or reason…" className={inputClass} />
              </FormField>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="py-16 flex justify-center"><Loader2 className="animate-spin text-gray-400" size={28} /></div>
          ) : filtered.length === 0 ? (
            <p className="text-center py-16 text-sm text-gray-400">No adjustments for selected filters.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[900px]">
                <thead>
                  <tr className="bg-gradient-to-r from-gray-50 to-red-50/30 text-[10px] font-bold uppercase text-gray-400">
                    {['Date', 'Item', 'Source', 'Mode', 'Reason', 'Change', 'Before → After', 'Note', ''].map((h) => (
                      <th key={h} className="p-3 text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id} className="border-t border-gray-50 hover:bg-gray-50/80">
                      <td className="p-3 text-gray-500">{fmtDate(r.adjustment_date)}</td>
                      <td className="p-3">
                        <p className="font-bold text-[#000435]">{r.item_name}</p>
                        <p className="text-[10px] text-gray-400">{r.category}</p>
                      </td>
                      <td className="p-3 capitalize text-xs font-medium text-gray-600">{r.source_type}</td>
                      <td className="p-3 text-xs">{modeLabel(r.mode)}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${REASON_STYLES[r.reason] || 'bg-gray-100 text-gray-600'}`}>
                          {r.reason}
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-red-600">
                        {r.mode === 'increase' ? '+' : r.mode === 'decrease' ? '−' : '='}{r.quantity} {r.unit}
                      </td>
                      <td className="p-3 text-xs text-gray-600">
                        {r.quantity_before} → <strong className="text-[#000435]">{r.quantity_after}</strong> {r.unit}
                      </td>
                      <td className="p-3 text-xs text-gray-500 max-w-[140px] truncate">{r.note || '—'}</td>
                      <td className="p-3">
                        <button type="button" onClick={() => setRevertTarget(r)} title="Revert"
                          className="p-2 rounded-lg hover:bg-amber-50 text-amber-700">
                          <RotateCcw size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {modal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-[#000435]/60 backdrop-blur-md z-50" onClick={() => setModal(false)} />
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-none">
              <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-lg pointer-events-auto max-h-[92vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="px-6 py-5 bg-gradient-to-br from-[#000435] to-[#1a2876] text-white shrink-0">
                  <p className="text-[10px] font-bold uppercase text-red-300">Stock adjustment</p>
                  <h2 className="text-lg font-bold mt-1">Record adjustment</h2>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <FormField icon={GraduationCap} label="Year *">
                      <select name="academic_year" value={form.academic_year} onChange={(e) => setForm((f) => ({ ...f, academic_year: e.target.value }))} className={inputClass}>
                        {academic.academicYears.map((y) => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </FormField>
                    <FormField icon={Calendar} label="Term *">
                      <select name="term" value={form.term} onChange={(e) => setForm((f) => ({ ...f, term: e.target.value }))} className={inputClass}>
                        {academic.activeTerms.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </FormField>
                  </div>
                  <FormField icon={Package} label="Stock item *">
                    <select value={form.source_key} onChange={(e) => setForm((f) => ({ ...f, source_key: e.target.value }))} className={inputClass}>
                      <option value="">Select item</option>
                      <optgroup label="Food batches">
                        {(sources.grouped.food || []).map((s) => <option key={s.source_key} value={s.source_key}>{s.label}</option>)}
                      </optgroup>
                      <optgroup label="Other supplies">
                        {(sources.grouped.other || []).map((s) => <option key={s.source_key} value={s.source_key}>{s.label}</option>)}
                      </optgroup>
                      <optgroup label="General inventory">
                        {(sources.grouped.inventory || []).map((s) => <option key={s.source_key} value={s.source_key}>{s.label}</option>)}
                      </optgroup>
                    </select>
                  </FormField>
                  {selectedSource && (
                    <p className="text-xs text-sky-700 bg-sky-50 px-3 py-2 rounded-xl">
                      Current on hand: <strong>{selectedSource.quantity} {selectedSource.unit}</strong>
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Adjustment type *">
                      <select value={form.mode} onChange={(e) => setForm((f) => ({ ...f, mode: e.target.value }))} className={inputClass}>
                        {ADJUSTMENT_MODES.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                      </select>
                    </FormField>
                    <FormField icon={Calendar} label="Date *">
                      <input type="date" value={form.adjustment_date} onChange={(e) => setForm((f) => ({ ...f, adjustment_date: e.target.value }))} className={inputClass} />
                    </FormField>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Quantity *">
                      <input type="number" min={0} step="any" value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} className={inputClass} />
                    </FormField>
                    <FormField label="Reason *">
                      <select value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} className={inputClass}>
                        {ADJUSTMENT_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </FormField>
                  </div>
                  {form.reason === 'Other' && (
                    <FormField label="Specify reason">
                      <input value={form.reason_other} onChange={(e) => setForm((f) => ({ ...f, reason_other: e.target.value }))} className={inputClass} />
                    </FormField>
                  )}
                  <FormField label="Notes">
                    <textarea rows={3} value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} className={`${inputClass} resize-none`} placeholder="Additional details…" />
                  </FormField>
                </div>
                <div className="shrink-0 px-6 py-4 border-t bg-gray-50/80 flex gap-2">
                  <button type="button" onClick={() => setModal(false)} className="flex-1 py-3 rounded-xl border text-xs font-bold uppercase text-gray-600">Cancel</button>
                  <button type="button" onClick={handleSubmit} disabled={saving || !form.source_key || !form.quantity}
                    className="flex-1 py-3 rounded-xl bg-[#000435] text-white text-xs font-bold uppercase inline-flex items-center justify-center gap-2 disabled:opacity-50">
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <BadgeCheck size={14} />}
                    Save
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {revertTarget && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-[#000435]/50 z-[60]" onClick={() => !saving && setRevertTarget(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none">
              <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 pointer-events-auto">
                <h3 className="font-bold text-[#000435]">Revert adjustment?</h3>
                <p className="text-sm text-gray-500 mt-2">
                  Restore <strong>{revertTarget.item_name}</strong> from {revertTarget.quantity_after} back to {revertTarget.quantity_before} {revertTarget.unit}.
                </p>
                <div className="flex gap-2 mt-6">
                  <button type="button" onClick={() => setRevertTarget(null)} className="flex-1 py-2.5 rounded-xl border text-xs font-bold uppercase">Cancel</button>
                  <button type="button" onClick={handleRevert} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-amber-600 text-white text-xs font-bold uppercase">Revert</button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </StorekeeperPageShell>
  )
}
