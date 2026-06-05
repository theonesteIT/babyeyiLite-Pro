import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Package, AlertTriangle, Loader2, RefreshCw, Search, X, Building2, Calendar,
  GraduationCap, Ruler, DollarSign, Hash, BadgeCheck, Trash2, Pencil, ArrowUpRight,
  AlertCircle, Sparkles, MapPin, Layers,
} from 'lucide-react'
import StorekeeperPageShell from '../components/StorekeeperPageShell'
import StorekeeperToast from '../components/StorekeeperToast'
import { fetchSuppliers } from '../services/suppliersService'
import { fetchStoreAcademicSettings } from '../services/academicSettingsService'
import {
  EMPTY_OTHER_STOCK_FORM,
  OTHER_CATEGORIES,
  OTHER_UNIT_TYPES,
  OTHER_STORE_LOCATIONS,
  otherUnitToFormFields,
  otherCategoryToFormFields,
  resolveOtherUnitFromForm,
  resolveOtherCategoryFromForm,
  fetchOtherStockIns,
  createOtherStockIn,
  updateOtherStockIn,
  deleteOtherStockIn,
  mapOtherStockToApi,
  aggregateOtherLevels,
} from '../services/otherStockService'
import {
  EMPTY_OTHER_ISSUE_FORM,
  OTHER_ISSUED_TO,
  fetchOtherStockOuts,
  createOtherStockOut,
  updateOtherStockOut,
  deleteOtherStockOut,
  mapOtherStockOutToApi,
  otherStockOutToFormFields,
} from '../services/otherStockOutService'

const inputClass =
  'w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-[#000435] placeholder:text-gray-300 focus:bg-white focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 outline-none transition-all'

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

function fmtMoney(n) {
  return (Number(n) || 0).toLocaleString()
}

function fmtDate(d) {
  if (!d) return '—'
  return String(d).slice(0, 10)
}

const TABS = [
  { id: 'stock-in', label: 'Stock In' },
  { id: 'stock-out', label: 'Stock Out' },
  { id: 'categories', label: 'Categories' },
  { id: 'levels', label: 'Stock Levels' },
]

function DateRangeBar({ label, from, to, onFrom, onTo }) {
  return (
    <div className="w-full rounded-xl border border-sky-100/80 bg-gradient-to-r from-sky-50/40 to-white p-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">{label}</p>
      <div className="flex flex-wrap gap-3 items-end">
        <FormField icon={Calendar} label="From">
          <input type="date" value={from} onChange={(e) => onFrom(e.target.value)} className={inputClass} />
        </FormField>
        <FormField icon={Calendar} label="To">
          <input type="date" value={to} onChange={(e) => onTo(e.target.value)} className={inputClass} />
        </FormField>
        {(from || to) && (
          <button type="button" onClick={() => { onFrom(''); onTo('') }} className="px-3 py-2.5 rounded-xl border text-[10px] font-bold uppercase text-gray-500 hover:bg-gray-50">
            Clear
          </button>
        )}
      </div>
    </div>
  )
}

export default function OtherInventory() {
  const [activeTab, setActiveTab] = useState('stock-in')
  const [stockRows, setStockRows] = useState([])
  const [stockOuts, setStockOuts] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [academic, setAcademic] = useState({ academicYears: [], activeTerms: [], academicYear: '', currentTerm: '' })
  const [filterYear, setFilterYear] = useState('')
  const [filterTerm, setFilterTerm] = useState('')
  const [stockDateFrom, setStockDateFrom] = useState('')
  const [stockDateTo, setStockDateTo] = useState('')
  const [outDateFrom, setOutDateFrom] = useState('')
  const [outDateTo, setOutDateTo] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [stockForm, setStockForm] = useState(EMPTY_OTHER_STOCK_FORM)
  const [issueForm, setIssueForm] = useState(EMPTY_OTHER_ISSUE_FORM)
  const [editingStockId, setEditingStockId] = useState(null)
  const [editingIssueId, setEditingIssueId] = useState(null)
  const [toast, setToast] = useState(null)

  const showToast = (message, type = 'success') => setToast({ message, type })

  const loadAll = useCallback(async ({ silent = false, year, term: termVal } = {}) => {
    if (!silent) setLoading(true)
    setError('')
    const y = year ?? filterYear
    const t = termVal ?? filterTerm
    try {
      const [stock, outs] = await Promise.all([
        fetchOtherStockIns({
          academic_year: y || undefined,
          term: t || undefined,
          from_date: stockDateFrom || undefined,
          to_date: stockDateTo || undefined,
        }),
        fetchOtherStockOuts({
          academic_year: y || undefined,
          term: t || undefined,
          from_date: outDateFrom || undefined,
          to_date: outDateTo || undefined,
        }),
      ])
      setStockRows(stock)
      setStockOuts(outs)
      try {
        setSuppliers(await fetchSuppliers())
      } catch { /* optional */ }
      try {
        const acad = await fetchStoreAcademicSettings()
        setAcademic(acad)
      } catch { /* keep prior */ }
    } catch (e) {
      setError(e.message || 'Failed to load other inventory')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [filterYear, filterTerm, stockDateFrom, stockDateTo, outDateFrom, outDateTo])

  useEffect(() => { loadAll() }, [loadAll])

  useEffect(() => {
    if (!academic.academicYear) return
    setFilterYear((prev) => prev || academic.academicYear || '')
    setFilterTerm((prev) => prev || academic.currentTerm || '')
  }, [academic.academicYear, academic.currentTerm])

  const levels = useMemo(() => aggregateOtherLevels(stockRows), [stockRows])

  const filteredStock = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return stockRows
    return stockRows.filter(
      (r) =>
        r.item_name.toLowerCase().includes(q) ||
        (r.supplier_name || '').toLowerCase().includes(q) ||
        (r.category || '').toLowerCase().includes(q)
    )
  }, [stockRows, search])

  const availableBatches = useMemo(
    () => stockRows.filter((r) => Number(r.remaining_quantity) > 0),
    [stockRows]
  )

  const issueBatchOptions = useMemo(() => {
    const editId = editingIssueId ? issueForm.other_stock_in_id : null
    return stockRows.filter(
      (r) => Number(r.remaining_quantity) > 0 || String(r.id) === String(editId)
    )
  }, [stockRows, editingIssueId, issueForm.other_stock_in_id])

  const categoryStats = useMemo(() => {
    const map = new Map()
    for (const r of stockRows) {
      const cat = r.category || 'Other'
      const cur = map.get(cat) || { category: cat, items: 0, remaining: 0, value: 0 }
      cur.items += 1
      cur.remaining += Number(r.remaining_quantity) || 0
      cur.value += Number(r.total_cost) || 0
      map.set(cat, cur)
    }
    return [...map.values()].sort((a, b) => b.items - a.items)
  }, [stockRows])

  const openStockModal = (row = null) => {
    if (row) {
      setEditingStockId(row.id)
      setStockForm({
        ...otherCategoryToFormFields(row.category),
        ...otherUnitToFormFields(row.unit_type),
        academic_year: row.academic_year,
        term: row.term,
        supplier_id: row.supplier_id ? String(row.supplier_id) : '',
        receive_date: row.receive_date,
        invoice_number: row.invoice_number,
        item_name: row.item_name,
        quantity: String(row.quantity),
        unit_cost: row.unit_cost !== '' ? String(row.unit_cost) : '',
        min_level: row.min_level ? String(row.min_level) : '',
        store_location: row.store_location || '',
        note: row.note,
      })
    } else {
      setEditingStockId(null)
      setStockForm({
        ...EMPTY_OTHER_STOCK_FORM,
        academic_year: filterYear || academic.academicYear || '',
        term: filterTerm || academic.currentTerm || '',
        receive_date: new Date().toISOString().slice(0, 10),
      })
    }
    setModal('stockin')
  }

  const openIssueModal = (row = null) => {
    if (row) {
      setEditingIssueId(row.id)
      setIssueForm(otherStockOutToFormFields(row))
    } else {
      setEditingIssueId(null)
      setIssueForm({
        ...EMPTY_OTHER_ISSUE_FORM,
        academic_year: filterYear || academic.academicYear || '',
        term: filterTerm || academic.currentTerm || '',
        issue_date: new Date().toISOString().slice(0, 10),
      })
    }
    setModal('issue')
  }

  const onStockChange = (e) => {
    const { name, value } = e.target
    setStockForm((f) => ({ ...f, [name]: value }))
  }

  const onIssueChange = (e) => {
    const { name, value } = e.target
    setIssueForm((f) => {
      const next = { ...f, [name]: value }
      if (name === 'other_stock_in_id' && value) {
        const batch = stockRows.find((r) => String(r.id) === String(value))
        if (batch) next.unit_type = batch.unit_type
      }
      return next
    })
  }

  const handleSaveStock = async () => {
    if (!stockForm.item_name.trim() || !stockForm.quantity) return
    if (!stockForm.academic_year || !stockForm.term) {
      setError('Select academic year and term before saving.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const payload = mapOtherStockToApi(stockForm)
      if (editingStockId) await updateOtherStockIn(editingStockId, payload)
      else await createOtherStockIn(payload)
      const savedYear = stockForm.academic_year
      const savedTerm = stockForm.term
      setFilterYear(savedYear)
      setFilterTerm(savedTerm)
      setModal(null)
      setActiveTab('stock-in')
      await loadAll({ silent: true, year: savedYear, term: savedTerm })
      showToast(editingStockId ? 'Stock receipt updated' : `Received ${stockForm.quantity} ${resolveOtherUnitFromForm(stockForm)} of ${stockForm.item_name.trim()}`)
    } catch (e) {
      const msg = e.response?.data?.message || e.message || 'Failed to save'
      setError(msg)
      showToast(msg, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveIssue = async () => {
    if (!issueForm.other_stock_in_id || !issueForm.quantity || !issueForm.issued_to) return
    if (issueForm.issued_to === 'Other' && !issueForm.issued_other.trim()) {
      setError('Specify who received the items')
      return
    }
    setSaving(true)
    setError('')
    try {
      const payload = mapOtherStockOutToApi(issueForm)
      const wasEdit = editingIssueId
      if (wasEdit) await updateOtherStockOut(wasEdit, payload)
      else await createOtherStockOut(payload)
      setModal(null)
      setEditingIssueId(null)
      await loadAll({ silent: true })
      showToast(wasEdit ? 'Issue updated' : 'Issue recorded')
    } catch (e) {
      const msg = e.response?.data?.message || e.message || 'Failed to save issue'
      setError(msg)
      showToast(msg, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteStock = async () => {
    if (!deleteTarget?.stockId) return
    setSaving(true)
    try {
      await deleteOtherStockIn(deleteTarget.stockId)
      setDeleteTarget(null)
      await loadAll({ silent: true })
      showToast('Receipt deleted')
    } catch (e) {
      const msg = e.message || 'Failed to delete'
      setError(msg)
      showToast(msg, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteIssue = async () => {
    if (!deleteTarget?.issueId) return
    setSaving(true)
    try {
      await deleteOtherStockOut(deleteTarget.issueId)
      setDeleteTarget(null)
      await loadAll({ silent: true })
      showToast('Issue reversed — stock restored')
    } catch (e) {
      const msg = e.message || 'Failed to delete'
      setError(msg)
      showToast(msg, 'error')
    } finally {
      setSaving(false)
    }
  }

  const selectedBatch = stockRows.find((r) => String(r.id) === String(issueForm.other_stock_in_id))
  const editingIssueRow = stockOuts.find((c) => c.id === editingIssueId) || null
  const maxIssueQty = useMemo(() => {
    if (!selectedBatch) return 0
    const rem = Number(selectedBatch.remaining_quantity) || 0
    if (editingIssueRow && String(editingIssueRow.other_stock_in_id) === String(selectedBatch.id)) {
      return rem + Number(editingIssueRow.quantity || 0)
    }
    return rem
  }, [selectedBatch, editingIssueRow])

  return (
    <StorekeeperPageShell
      titleLine="Other Inventory"
      subtitle="Stationery, cleaning, lab, sports, and general school supplies"
      icon={Package}
    >
      <StorekeeperToast message={toast?.message} type={toast?.type} onDismiss={() => setToast(null)} />

      <div className="space-y-4">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#000435] via-[#0d1654] to-[#1a2876] p-5 text-white shadow-lg">
          <div className="absolute top-0 right-0 w-40 h-40 bg-sky-400/10 rounded-full blur-3xl" />
          <div className="relative flex flex-wrap justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-sky-300/90 flex items-center gap-1">
                <Sparkles size={10} /> Storekeeper · Other stock
              </p>
              <h2 className="text-lg font-bold mt-1">Non-food & non-uniform inventory</h2>
              <p className="text-xs text-white/60 mt-1">Batch receipts with supplier, location, and issue tracking</p>
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

        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap gap-3 items-end">
            <FormField icon={GraduationCap} label="Academic year">
              <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} className={inputClass}>
                <option value="">All years</option>
                {academic.academicYears.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </FormField>
            <FormField icon={Calendar} label="Term">
              <select value={filterTerm} onChange={(e) => setFilterTerm(e.target.value)} className={inputClass}>
                <option value="">All terms</option>
                {academic.activeTerms.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </FormField>
            <div className="flex-1 min-w-[180px]">
              <FormField icon={Search} label="Search">
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Item, category, supplier…" className={inputClass} />
              </FormField>
            </div>
          </div>
          {(activeTab === 'stock-in' || activeTab === 'stock-out') && (
            <div className="mt-3">
              {activeTab === 'stock-in' ? (
                <DateRangeBar label="Filter stock in by receive date" from={stockDateFrom} to={stockDateTo} onFrom={setStockDateFrom} onTo={setStockDateTo} />
              ) : (
                <DateRangeBar label="Filter issues by date" from={outDateFrom} to={outDateTo} onFrom={setOutDateFrom} onTo={setOutDateTo} />
              )}
            </div>
          )}
        </div>

        <div className="flex overflow-x-auto gap-1 border-b border-gray-100">
          {TABS.map((t) => (
            <button key={t.id} type="button" onClick={() => setActiveTab(t.id)}
              className={`whitespace-nowrap px-4 py-2.5 text-sm rounded-t-xl transition ${activeTab === t.id ? 'bg-[#000435] text-white font-bold' : 'text-gray-400 hover:bg-gray-50'}`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="py-16 flex justify-center text-gray-400"><Loader2 className="animate-spin" size={28} /></div>
          ) : activeTab === 'stock-in' ? (
            <div className="p-4 sm:p-5">
              <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
                <h3 className="text-sm font-bold text-[#000435]">{filteredStock.length} receipts</h3>
                <button type="button" onClick={() => openStockModal()} className="inline-flex items-center gap-2 bg-amber-400 text-[#000435] px-4 py-2.5 rounded-xl text-xs font-bold uppercase shadow-sm hover:bg-amber-300">
                  <Plus size={16} /> Stock In
                </button>
              </div>
              {filteredStock.length === 0 ? (
                <p className="text-center py-12 text-sm text-gray-400">No stock receipts yet. Use Stock In to add items.</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-100">
                  <table className="w-full text-sm min-w-[960px]">
                    <thead>
                      <tr className="bg-gradient-to-r from-gray-50 to-sky-50/40 text-[10px] font-bold uppercase text-gray-400">
                        {['Date', 'Item', 'Category', 'Location', 'Supplier', 'Year / Term', 'Received', 'Remaining', 'Total', ''].map((h) => (
                          <th key={h} className="text-left p-3">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStock.map((row) => (
                        <tr key={row.id} className="border-t border-gray-50 hover:bg-sky-50/20">
                          <td className="p-3 text-gray-500">{fmtDate(row.receive_date)}</td>
                          <td className="p-3 font-bold text-[#000435]">{row.item_name}</td>
                          <td className="p-3"><span className="px-2 py-0.5 rounded-lg bg-gray-100 text-gray-700 text-xs font-bold">{row.category}</span></td>
                          <td className="p-3 text-xs text-gray-600">{row.store_location ? <span className="inline-flex items-center gap-1"><MapPin size={11} className="text-sky-600" />{row.store_location}</span> : '—'}</td>
                          <td className="p-3 text-gray-600">{row.supplier_name || '—'}</td>
                          <td className="p-3 text-xs text-gray-500">{row.academic_year} · {row.term}</td>
                          <td className="p-3 text-right">{row.quantity} {row.unit_type}</td>
                          <td className="p-3 text-right font-semibold text-sky-700">{row.remaining_quantity} {row.unit_type}</td>
                          <td className="p-3 text-right font-medium">{fmtMoney(row.total_cost)}</td>
                          <td className="p-3">
                            <div className="flex justify-end gap-1">
                              <button type="button" onClick={() => openStockModal(row)} className="p-2 rounded-lg hover:bg-amber-50 text-amber-700" title="Edit"><Pencil size={14} /></button>
                              <button type="button" onClick={() => setDeleteTarget({ stockId: row.id, label: row.item_name })} className="p-2 rounded-lg hover:bg-red-50 text-red-500" title="Delete"><Trash2 size={14} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : activeTab === 'stock-out' ? (
            <div className="p-4 sm:p-5">
              <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
                <h3 className="text-sm font-bold text-[#000435]">{stockOuts.length} issue records</h3>
                <button type="button" onClick={() => openIssueModal()} disabled={!availableBatches.length}
                  className="inline-flex items-center gap-2 bg-[#000435] text-white px-4 py-2.5 rounded-xl text-xs font-bold uppercase disabled:opacity-40">
                  <ArrowUpRight size={16} /> Issue Item
                </button>
              </div>
              {stockOuts.length === 0 ? (
                <p className="text-center py-12 text-sm text-gray-400">No issues recorded yet.</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-100">
                  <table className="w-full text-sm min-w-[720px]">
                    <thead>
                      <tr className="bg-gradient-to-r from-gray-50 to-indigo-50/40 text-[10px] font-bold uppercase text-gray-400">
                        {['Date', 'Item', 'Issued to', 'Category', 'Year / Term', 'Qty', ''].map((h) => (
                          <th key={h} className={`p-3 ${h === 'Qty' ? 'text-right' : 'text-left'}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {stockOuts.map((c) => (
                        <tr key={c.id} className="border-t border-gray-50 hover:bg-indigo-50/20">
                          <td className="p-3 text-gray-500">{fmtDate(c.issue_date)}</td>
                          <td className="p-3 font-medium text-[#000435]">{c.item_name}</td>
                          <td className="p-3"><span className="inline-flex px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-800 text-xs font-bold">{c.issued_to}</span></td>
                          <td className="p-3 text-xs text-gray-500">{c.category}</td>
                          <td className="p-3 text-xs text-gray-500">{c.academic_year} · {c.term}</td>
                          <td className="p-3 text-right font-semibold">{c.quantity} {c.unit_type}</td>
                          <td className="p-3">
                            <div className="flex justify-end gap-1">
                              <button type="button" onClick={() => openIssueModal(c)} className="p-2 rounded-lg hover:bg-sky-50 text-sky-700"><Pencil size={14} /></button>
                              <button type="button" onClick={() => setDeleteTarget({ issueId: c.id, label: c.item_name })} className="p-2 rounded-lg hover:bg-red-50 text-red-500"><Trash2 size={14} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : activeTab === 'categories' ? (
            <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {categoryStats.length === 0 ? (
                <p className="col-span-full text-center py-12 text-sm text-gray-400">No categories yet.</p>
              ) : (
                categoryStats.map((cat) => (
                  <div key={cat.category} className="rounded-2xl border border-gray-100 p-5 bg-gradient-to-br from-gray-50/80 to-white hover:shadow-md transition">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-bold text-[#000435]">{cat.category}</p>
                        <p className="text-xs text-gray-400 mt-1">{cat.items} batch{cat.items !== 1 ? 'es' : ''}</p>
                      </div>
                      <div className="p-2 rounded-xl bg-sky-100 text-sky-600"><Layers size={18} /></div>
                    </div>
                    <p className="text-lg font-bold text-sky-700 mt-3">{cat.remaining.toLocaleString()} units on hand</p>
                    <p className="text-[10px] text-gray-400 mt-1">Receipt value RWF {fmtMoney(cat.value)}</p>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="p-4 sm:p-5">
              {levels.length === 0 ? (
                <p className="text-center py-12 text-sm text-gray-400">No stock levels to display.</p>
              ) : (
                <>
                  <div className="overflow-x-auto rounded-xl border border-gray-100">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 text-[10px] font-bold uppercase text-gray-400">
                          <th className="text-left p-3">Item</th>
                          <th className="text-left p-3">Category</th>
                          <th className="text-right p-3">On hand</th>
                          <th className="text-right p-3">Min level</th>
                          <th className="text-right p-3">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {levels.map((s) => (
                          <tr key={`${s.item_name}-${s.unit_type}-${s.category}`} className="border-t border-gray-50">
                            <td className="p-3 font-bold text-[#000435]">{s.item_name}</td>
                            <td className="p-3 text-gray-500">{s.category}</td>
                            <td className="p-3 text-right">{s.remaining} {s.unit_type}</td>
                            <td className="p-3 text-right text-gray-500">{s.min_level} {s.unit_type}</td>
                            <td className="p-3 text-right">
                              <span className={`px-2 py-1 rounded-full text-xs font-bold ${s.status === 'Normal' ? 'bg-green-50 text-green-700' : s.status === 'Low Stock' ? 'bg-amber-50 text-amber-800' : 'bg-red-50 text-red-600'}`}>{s.status}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {levels.filter((s) => s.status !== 'Normal').map((s) => (
                    <div key={`${s.item_name}-${s.category}`} className="mt-3 flex items-center gap-2 text-sm text-amber-800 bg-amber-50 px-3 py-2 rounded-xl">
                      <AlertTriangle size={14} />
                      {s.item_name} ({s.category}): {s.remaining} {s.unit_type} left (min {s.min_level})
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Stock In modal */}
      <AnimatePresence>
        {modal === 'stockin' && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-[#000435]/60 backdrop-blur-md z-50" onClick={() => setModal(null)} />
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-none">
              <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-lg pointer-events-auto overflow-hidden max-h-[92vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="px-6 py-5 bg-gradient-to-br from-[#000435] via-[#0d1654] to-[#1a2876] text-white shrink-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-sky-300">Other stock in</p>
                  <h2 className="text-lg font-bold mt-1">{editingStockId ? 'Edit receipt' : 'Receive Items'}</h2>
                  <p className="text-[11px] text-white/60 mt-1">Supplier, category, location, quantity & unit</p>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  <section className="rounded-2xl border border-gray-100 bg-gray-50/50 p-4 space-y-3">
                    <p className="text-[10px] font-bold uppercase text-gray-400">Period</p>
                    <div className="grid grid-cols-2 gap-3">
                      <FormField icon={GraduationCap} label="Academic year *">
                        <select name="academic_year" value={stockForm.academic_year} onChange={onStockChange} className={inputClass}>
                          {academic.academicYears.map((y) => <option key={y} value={y}>{y}</option>)}
                        </select>
                      </FormField>
                      <FormField icon={Calendar} label="Term *">
                        <select name="term" value={stockForm.term} onChange={onStockChange} className={inputClass}>
                          {academic.activeTerms.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </FormField>
                    </div>
                  </section>
                  <FormField icon={Package} label="Item name *">
                    <input name="item_name" value={stockForm.item_name} onChange={onStockChange} placeholder="e.g. A4 Paper, Brooms" className={inputClass} />
                  </FormField>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Category *">
                      <select name="category" value={stockForm.category} onChange={onStockChange} className={inputClass}>
                        {OTHER_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </FormField>
                    {stockForm.category === 'Other' && (
                      <FormField label="Specify category">
                        <input name="category_other" value={stockForm.category_other} onChange={onStockChange} className={inputClass} placeholder="Custom category" />
                      </FormField>
                    )}
                  </div>
                  <FormField icon={Building2} label="Supplier">
                    <select name="supplier_id" value={stockForm.supplier_id} onChange={onStockChange} className={inputClass}>
                      <option value="">— Select supplier —</option>
                      {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </FormField>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField icon={Calendar} label="Receive date">
                      <input type="date" name="receive_date" value={stockForm.receive_date} onChange={onStockChange} className={inputClass} />
                    </FormField>
                    <FormField icon={Hash} label="Invoice no.">
                      <input name="invoice_number" value={stockForm.invoice_number} onChange={onStockChange} className={inputClass} />
                    </FormField>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField icon={Ruler} label="Quantity *">
                      <input type="number" min={0} step="any" name="quantity" value={stockForm.quantity} onChange={onStockChange} className={inputClass} />
                    </FormField>
                    <FormField icon={Ruler} label="Unit type *">
                      <select name="unit_type" value={stockForm.unit_type} onChange={onStockChange} className={inputClass}>
                        {OTHER_UNIT_TYPES.map((u) => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </FormField>
                  </div>
                  {stockForm.unit_type === 'Other' && (
                    <FormField label="Specify unit">
                      <input name="unit_type_other" value={stockForm.unit_type_other} onChange={onStockChange} className={inputClass} />
                    </FormField>
                  )}
                  <FormField icon={MapPin} label="Store location">
                    {(() => {
                      const presets = OTHER_STORE_LOCATIONS.filter((l) => l !== 'Other')
                      const selectVal = presets.includes(stockForm.store_location) ? stockForm.store_location : stockForm.store_location ? 'Other' : ''
                      return (
                        <>
                          <select value={selectVal} onChange={(e) => {
                            const v = e.target.value
                            setStockForm((f) => ({ ...f, store_location: v === 'Other' ? (presets.includes(f.store_location) ? '' : f.store_location) : v }))
                          }} className={inputClass}>
                            <option value="">— Select —</option>
                            {OTHER_STORE_LOCATIONS.map((loc) => <option key={loc} value={loc}>{loc}</option>)}
                          </select>
                          {selectVal === 'Other' && (
                            <input name="store_location" value={presets.includes(stockForm.store_location) ? '' : stockForm.store_location} onChange={onStockChange} placeholder="e.g. Annex" className={`${inputClass} mt-2`} />
                          )}
                        </>
                      )
                    })()}
                  </FormField>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField icon={DollarSign} label="Unit cost">
                      <input type="number" min={0} name="unit_cost" value={stockForm.unit_cost} onChange={onStockChange} className={inputClass} />
                    </FormField>
                    <FormField icon={AlertTriangle} label="Min stock level">
                      <input type="number" min={0} name="min_level" value={stockForm.min_level} onChange={onStockChange} placeholder="Reorder alert" className={inputClass} />
                    </FormField>
                  </div>
                </div>
                <div className="shrink-0 px-6 py-4 border-t bg-gray-50/80 flex gap-2">
                  <button type="button" onClick={() => setModal(null)} className="flex-1 py-3 rounded-xl border text-xs font-bold uppercase text-gray-600">Cancel</button>
                  <button type="button" onClick={handleSaveStock} disabled={saving || !stockForm.item_name.trim() || !stockForm.quantity}
                    className="flex-1 py-3 rounded-xl bg-[#000435] text-white text-xs font-bold uppercase inline-flex items-center justify-center gap-2 disabled:opacity-50">
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <BadgeCheck size={14} />}
                    {editingStockId ? 'Update' : 'Save'}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Issue modal */}
      <AnimatePresence>
        {modal === 'issue' && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-[#000435]/60 backdrop-blur-md z-50" onClick={() => { setModal(null); setEditingIssueId(null) }} />
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-none">
              <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-lg pointer-events-auto overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="px-6 py-5 bg-gradient-to-br from-[#000435] to-[#1a2876] text-white">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-300">Stock out</p>
                  <h2 className="text-lg font-bold mt-1">{editingIssueId ? 'Edit issue' : 'Issue Item'}</h2>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <FormField icon={GraduationCap} label="Academic year">
                      <select name="academic_year" value={issueForm.academic_year} onChange={onIssueChange} className={inputClass}>
                        {academic.academicYears.map((y) => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </FormField>
                    <FormField icon={Calendar} label="Term">
                      <select name="term" value={issueForm.term} onChange={onIssueChange} className={inputClass}>
                        {academic.activeTerms.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </FormField>
                  </div>
                  <FormField icon={Package} label="Stock batch *">
                    <select name="other_stock_in_id" value={issueForm.other_stock_in_id} onChange={onIssueChange} className={inputClass}>
                      <option value="">Select batch</option>
                      {issueBatchOptions.map((b) => (
                        <option key={b.id} value={b.id}>{b.item_name} — {b.remaining_quantity} {b.unit_type} left ({fmtDate(b.receive_date)})</option>
                      ))}
                    </select>
                  </FormField>
                  {selectedBatch && (
                    <p className="text-xs text-sky-700 bg-sky-50 px-3 py-2 rounded-xl font-medium">
                      Available: {maxIssueQty} {selectedBatch.unit_type}{editingIssueId ? ' (includes this record)' : ''}
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <FormField icon={Ruler} label="Quantity *">
                      <input type="number" min={0} step="any" name="quantity" value={issueForm.quantity} onChange={onIssueChange} className={inputClass} />
                    </FormField>
                    <FormField icon={Calendar} label="Date *">
                      <input type="date" name="issue_date" value={issueForm.issue_date} onChange={onIssueChange} className={inputClass} />
                    </FormField>
                  </div>
                  <FormField label="Issued to *">
                    <select name="issued_to" value={issueForm.issued_to} onChange={onIssueChange} className={inputClass}>
                      <option value="">Select</option>
                      {OTHER_ISSUED_TO.map((a) => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </FormField>
                  {issueForm.issued_to === 'Other' && (
                    <FormField label="Specify recipient *">
                      <input name="issued_other" value={issueForm.issued_other} onChange={onIssueChange} className={inputClass} placeholder="e.g. Science lab" />
                    </FormField>
                  )}
                </div>
                <div className="px-6 py-4 border-t bg-gray-50/80 flex gap-2">
                  <button type="button" onClick={() => { setModal(null); setEditingIssueId(null) }} className="flex-1 py-3 rounded-xl border text-xs font-bold uppercase text-gray-600">Cancel</button>
                  <button type="button" onClick={handleSaveIssue} disabled={saving || !issueForm.other_stock_in_id || !issueForm.quantity}
                    className="flex-1 py-3 rounded-xl bg-[#000435] text-white text-xs font-bold uppercase inline-flex items-center justify-center gap-2 disabled:opacity-50">
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <BadgeCheck size={14} />}
                    {editingIssueId ? 'Update' : 'Save Issue'}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteTarget && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-[#000435]/50 z-[60]" onClick={() => !saving && setDeleteTarget(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none">
              <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 pointer-events-auto">
                <h3 className="font-bold text-[#000435]">Delete {deleteTarget.stockId ? 'receipt' : 'issue'}?</h3>
                <p className="text-sm text-gray-500 mt-2">{deleteTarget.label}</p>
                <div className="flex gap-2 mt-6">
                  <button type="button" onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 rounded-xl border text-xs font-bold uppercase">Cancel</button>
                  <button type="button" onClick={deleteTarget.stockId ? handleDeleteStock : handleDeleteIssue} disabled={saving}
                    className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-xs font-bold uppercase">Delete</button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </StorekeeperPageShell>
  )
}
