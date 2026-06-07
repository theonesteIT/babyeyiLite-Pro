import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Search, X, Shirt, Calendar, Package, DollarSign,
  BadgeCheck, Loader2, Edit2, Trash2, Eye, RefreshCw, AlertCircle, Box, Layers, FileSpreadsheet, FileText,
  Calculator, TrendingUp, TrendingDown, Minus,
} from 'lucide-react'
import { exportFinishedGoodsExcel, exportFinishedGoodsPdf } from '../../utils/uniformInventoryExport'
import { fetchStoreAcademicSettings } from '../../services/academicSettingsService'
import { fetchFabricReceipts } from '../../services/fabricReceiptsService'
import {
  EMPTY_FINISHED_FORM,
  UNIFORM_TYPES,
  fetchFinishedGoods,
  createFinishedGood,
  createFinishedGoodsBatch,
  updateFinishedGood,
  deleteFinishedGood,
  stockStatus,
  formatAmount,
  resolveUniformNameFromForm,
  resolveSizesFromForm,
  uniformNameToFormFields,
  sizeToFormFields,
} from '../../services/finishedGoodsService'
import UniformNameSearchSelect from './UniformNameSearchSelect'
import SizeMultiSelect from './SizeMultiSelect'

function FormField({ icon: Icon, label, name, type = 'text', value, onChange, placeholder, disabled }) {
  return (
    <div className="group">
      <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 block">{label}</label>
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-300 group-focus-within:text-amber-500 transition-colors">
            <Icon size={15} />
          </div>
        )}
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-[#000435] placeholder:text-gray-300 focus:bg-white focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 outline-none transition-all disabled:opacity-60"
        />
      </div>
    </div>
  )
}

function SelectField({ icon: Icon, label, name, value, onChange, children, disabled }) {
  return (
    <div className="group">
      <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 block">{label}</label>
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-300 group-focus-within:text-amber-500 z-10">
            <Icon size={15} />
          </div>
        )}
        <select
          name={name}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-[#000435] focus:bg-white focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 outline-none appearance-none disabled:opacity-60"
        >
          {children}
        </select>
      </div>
    </div>
  )
}

function sheetOptionLabel(f) {
  const type = f.fabric_type || 'Sheet'
  const color = f.color ? ` · ${f.color}` : ''
  const rem = Number(f.remaining_meters ?? f.meters ?? 0)
  return `${type}${color} · ${rem}m left`
}

function computeFinishedGoodProfit(g) {
  const soldQty = Number(g.used_stock ?? g.sold_qty) || 0
  const purchaseCost = Number(g.purchase_cost) || 0
  const totalSoldCost = Number(g.total_sold_cost) || 0
  const totalPurchaseCost = soldQty * purchaseCost
  const profitLoss = totalSoldCost - totalPurchaseCost
  const marginPct = totalSoldCost > 0 ? (profitLoss / totalSoldCost) * 100 : 0
  return { soldQty, purchaseCost, totalSoldCost, totalPurchaseCost, profitLoss, marginPct }
}

function ProfitStatusBadge({ value, soldQty }) {
  if (!soldQty) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-lg bg-gray-50 text-gray-500">
        <Minus size={12} /> No sales
      </span>
    )
  }
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

export default function FinishedGoodsStockPanel({ onGoodsChange }) {
  const [goods, setGoods] = useState([])
  const [sheets, setSheets] = useState([])
  const [academic, setAcademic] = useState({ academicYears: [], activeTerms: [], academicYear: '', currentTerm: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filterUniform, setFilterUniform] = useState('')
  const [modal, setModal] = useState(null)
  const [viewRow, setViewRow] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [profitModal, setProfitModal] = useState(null)
  const [form, setForm] = useState(EMPTY_FINISHED_FORM)

  const loadAll = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [rows, fabricRows, acad] = await Promise.all([
        fetchFinishedGoods(),
        fetchFabricReceipts(),
        fetchStoreAcademicSettings(),
      ])
      setGoods(rows)
      setSheets(fabricRows)
      setAcademic(acad)
      onGoodsChange?.(rows)
    } catch (e) {
      setError(e.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [onGoodsChange])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const defaultForm = useMemo(
    () => ({
      ...EMPTY_FINISHED_FORM,
      academic_year: academic.academicYear,
      term: academic.currentTerm,
    }),
    [academic]
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return goods.filter((g) => {
      if (filterUniform && g.uniform_name !== filterUniform) return false
      if (!q) return true
      return (
        g.uniform_name.toLowerCase().includes(q) ||
        (g.sheet_label || '').toLowerCase().includes(q) ||
        (g.size || '').toLowerCase().includes(q)
      )
    })
  }, [goods, search, filterUniform])

  const lowStockCount = useMemo(
    () => goods.filter((g) => Number(g.stock) < 50).length,
    [goods]
  )

  const profitRows = useMemo(
    () =>
      filtered.map((g) => ({
        ...g,
        profit: computeFinishedGoodProfit(g),
      })),
    [filtered]
  )

  const profitSummary = useMemo(
    () =>
      profitRows.reduce(
        (acc, row) => ({
          totalSoldCost: acc.totalSoldCost + row.profit.totalSoldCost,
          totalPurchaseCost: acc.totalPurchaseCost + row.profit.totalPurchaseCost,
          profitLoss: acc.profitLoss + row.profit.profitLoss,
          soldQty: acc.soldQty + row.profit.soldQty,
        }),
        { totalSoldCost: 0, totalPurchaseCost: 0, profitLoss: 0, soldQty: 0 }
      ),
    [profitRows]
  )

  const openCreate = () => {
    setViewRow(null)
    setForm(defaultForm)
    setModal('form')
  }

  const openEdit = (row) => {
    const nameFields = uniformNameToFormFields(row.uniform_name)
    const sizeFields = sizeToFormFields(row.size)
    setForm({
      fabric_receipt_id: row.fabric_receipt_id ? String(row.fabric_receipt_id) : '',
      ...nameFields,
      ...sizeFields,
      stock: String(row.remaining_stock ?? row.stock),
      purchase_cost:
        row.purchase_cost === '' || row.purchase_cost == null ? '' : String(row.purchase_cost),
      selling_price: row.selling_price === '' || row.selling_price == null ? '' : String(row.selling_price),
      academic_year: row.academic_year,
      term: row.term,
      note: row.note || '',
    })
    setViewRow(row)
    setModal('form')
  }

  const closeForm = () => {
    if (saving) return
    setModal(null)
    setViewRow(null)
    setForm({ ...EMPTY_FINISHED_FORM, selected_sizes: ['M'] })
  }

  const onChange = (e) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
  }

  const handleSave = async () => {
    const uniformName = resolveUniformNameFromForm(form)
    const sizes = resolveSizesFromForm(form, { single: Boolean(viewRow?.id) })
    if (!uniformName) {
      setError(form.uniform_name === 'Other' ? 'Specify the uniform name' : 'Uniform name is required')
      return
    }
    if (!sizes.length) {
      setError('Select at least one size')
      return
    }
    if (!form.stock || Number(form.stock) <= 0) {
      setError('Stock quantity is required')
      return
    }
    setSaving(true)
    setError('')
    try {
      if (viewRow?.id) {
        await updateFinishedGood(viewRow.id, { ...form, uniform_name: uniformName, size: sizes[0] })
      } else if (sizes.length === 1) {
        await createFinishedGood({ ...form, uniform_name: uniformName, size: sizes[0] })
      } else {
        await createFinishedGoodsBatch({ ...form, uniform_name: uniformName }, sizes)
      }
      closeForm()
      await loadAll()
    } catch (e) {
      setError(e.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget?.id) return
    setSaving(true)
    setError('')
    try {
      await deleteFinishedGood(deleteTarget.id)
      setDeleteTarget(null)
      await loadAll()
    } catch (e) {
      setError(e.message || 'Delete failed')
    } finally {
      setSaving(false)
    }
  }

  const previewSellingValue = (Number(form.stock) || 0) * (Number(form.selling_price) || 0)
  const previewPurchaseValue = (Number(form.stock) || 0) * (Number(form.purchase_cost) || 0)

  return (
    <div>
      {error && (
        <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm font-medium">
          <AlertCircle size={16} className="shrink-0" />
          {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-400/20 transition-all">
            <Search size={14} className="text-gray-300" />
            <input
              type="text"
              placeholder="Search uniform, sheet…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent border-none outline-none text-sm w-40 sm:w-52 text-[#000435] font-medium"
            />
          </div>
          <select
            value={filterUniform}
            onChange={(e) => setFilterUniform(e.target.value)}
            className="text-xs font-bold border border-gray-200 rounded-xl px-3 py-2.5 text-gray-600 bg-white uppercase tracking-wider"
          >
            <option value="">All uniforms</option>
            {UNIFORM_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={loadAll}
            disabled={loading}
            className="p-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition"
            aria-label="Refresh"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin text-amber-500' : 'text-gray-400'} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          {lowStockCount > 0 && (
            <span className="text-[10px] font-bold uppercase tracking-wider px-3 py-2 rounded-xl bg-red-50 text-red-600 border border-red-100">
              {lowStockCount} low stock
            </span>
          )}
          <button
            type="button"
            onClick={() => setProfitModal('all')}
            disabled={!filtered.length}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold uppercase hover:bg-amber-100 disabled:opacity-40 transition"
          >
            <Calculator size={14} /> Profit / Loss
          </button>
          <button
            type="button"
            onClick={() => exportFinishedGoodsExcel(filtered, { search, uniform: filterUniform })}
            disabled={!filtered.length}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold uppercase hover:bg-emerald-100 disabled:opacity-40 transition"
          >
            <FileSpreadsheet size={14} /> Excel
          </button>
          <button
            type="button"
            onClick={() => exportFinishedGoodsPdf(filtered, { search, uniform: filterUniform })}
            disabled={!filtered.length}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-[10px] font-bold uppercase hover:bg-red-100 disabled:opacity-40 transition"
          >
            <FileText size={14} /> PDF
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center justify-center gap-2 bg-[#000435] text-white px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider hover:bg-[#0a116b] transition-all shadow-lg shadow-[#000435]/20 active:scale-95"
          >
            <Plus size={14} /> Add Stock
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 gap-3 text-gray-400">
          <Loader2 size={22} className="animate-spin" />
          <span className="text-sm font-medium">Loading finished goods…</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-dashed border-gray-200 bg-gray-50/50">
          <Box size={36} className="mx-auto text-gray-200 mb-3" />
          <p className="text-sm font-medium text-gray-400">No finished goods stock yet</p>
          <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
            Register fabric sheets under Fabric Stock In, then add finished uniforms here.
          </p>
          <button type="button" onClick={openCreate} className="mt-3 text-xs font-bold text-amber-600 hover:underline">
            + Add first stock entry
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
          <table className="w-full text-sm min-w-[1280px]">
            <thead>
              <tr className="bg-gray-50/90 border-b border-gray-100">
                {[
                  'Uniform',
                  'Size',
                  'Fabric sheet',
                  'Opening stock',
                  'Used stock',
                  'Remaining stock',
                  'Purchase cost',
                  'Total purchase cost',
                  'Selling cost',
                  'Total estimated cost',
                  'Total sold cost',
                  'Status',
                  'Actions',
                ].map((h) => (
                  <th key={h} className="text-left py-3.5 px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((g, i) => {
                const st = stockStatus(g.remaining_stock ?? g.stock)
                return (
                  <motion.tr
                    key={g.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b border-gray-50 hover:bg-amber-50/30 transition-colors"
                  >
                    <td className="py-3.5 px-3 text-xs font-bold text-[#000435]">{g.uniform_name}</td>
                    <td className="py-3.5 px-3 text-xs text-gray-500">{g.size}</td>
                    <td className="py-3.5 px-3 text-xs text-gray-600 max-w-[140px] truncate" title={g.sheet_label}>
                      {g.sheet_label ? (
                        <span className="inline-flex items-center gap-1">
                          <Layers size={12} className="text-amber-500 shrink-0" />
                          {g.sheet_label}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-xs font-medium text-gray-600">{formatAmount(g.opening_stock)}</td>
                    <td className="py-3.5 px-3 text-xs font-medium text-red-600">{formatAmount(g.used_stock ?? g.sold_qty)}</td>
                    <td className="py-3.5 px-3 text-xs font-bold text-amber-700">{formatAmount(g.remaining_stock ?? g.stock)}</td>
                    <td className="py-3.5 px-3 text-xs text-gray-600 whitespace-nowrap">{formatAmount(g.purchase_cost)}</td>
                    <td className="py-3.5 px-3 text-xs text-gray-600 whitespace-nowrap">{formatAmount(g.total_purchase_cost)}</td>
                    <td className="py-3.5 px-3 text-xs text-gray-600 whitespace-nowrap">{formatAmount(g.selling_cost ?? g.selling_price)}</td>
                    <td className="py-3.5 px-3 text-xs font-medium text-[#000435] whitespace-nowrap">{formatAmount(g.total_estimated_cost)}</td>
                    <td className="py-3.5 px-3 text-xs font-bold text-emerald-700 whitespace-nowrap">{formatAmount(g.total_sold_cost)}</td>
                    <td className="py-3.5 px-3">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg ${st.className}`}>{st.label}</span>
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => setProfitModal(g)} className="p-2 rounded-lg hover:bg-emerald-50 text-gray-400 hover:text-emerald-700" aria-label="Profit or loss">
                          <Calculator size={14} />
                        </button>
                        <button type="button" onClick={() => { setViewRow(g); setModal(null) }} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-[#000435]" aria-label="View">
                          <Eye size={14} />
                        </button>
                        <button type="button" onClick={() => openEdit(g)} className="p-2 rounded-lg hover:bg-amber-50 text-gray-400 hover:text-amber-600" aria-label="Edit">
                          <Edit2 size={14} />
                        </button>
                        <button type="button" onClick={() => setDeleteTarget(g)} className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500" aria-label="Delete">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <AnimatePresence>
        {modal === 'form' && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-[#000435]/60 backdrop-blur-sm z-[60]" onClick={closeForm} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 z-[60] flex items-start justify-center pt-8 pb-8 overflow-y-auto pointer-events-none"
            >
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl mx-4 pointer-events-auto overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-amber-50/50 to-white">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-400/20 flex items-center justify-center">
                      <Box size={18} className="text-amber-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-[#000435]">{viewRow?.id ? 'Edit finished stock' : 'Add Finished Good'}</h2>
                      <p className="text-[11px] font-medium text-gray-400">Link to a registered fabric sheet</p>
                    </div>
                  </div>
                  <button type="button" onClick={closeForm} className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
                    <X size={16} className="text-gray-400" />
                  </button>
                </div>
                <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <SelectField icon={Calendar} label="Academic year" name="academic_year" value={form.academic_year} onChange={onChange}>
                      <option value="">Select year</option>
                      {academic.academicYears.map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </SelectField>
                    <SelectField icon={Calendar} label="Term" name="term" value={form.term} onChange={onChange}>
                      <option value="">Select term</option>
                      {academic.activeTerms.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </SelectField>
                  </div>
                  <SelectField icon={Layers} label="Fabric sheet (from registered stock)" name="fabric_receipt_id" value={form.fabric_receipt_id} onChange={onChange}>
                    <option value="">— No sheet linked —</option>
                    {sheets.length === 0 ? (
                      <option value="" disabled>Receive fabric first under Fabric Stock In</option>
                    ) : (
                      sheets.map((f) => (
                        <option key={f.id} value={f.id}>
                          {sheetOptionLabel(f)}
                        </option>
                      ))
                    )}
                  </SelectField>
                  <div className="border-t border-gray-100 pt-5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-2">
                      <Shirt size={14} /> Uniform details
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2">
                        <UniformNameSearchSelect
                          value={form.uniform_name}
                          otherValue={form.uniform_name_other}
                          onChange={onChange}
                          onOtherChange={onChange}
                          disabled={saving}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <SizeMultiSelect
                          selected={form.selected_sizes || []}
                          otherValue={form.size_other}
                          onToggle={(sizes) => setForm((f) => ({ ...f, selected_sizes: sizes, size: sizes[0] || f.size }))}
                          onOtherChange={onChange}
                          single={Boolean(viewRow?.id)}
                          disabled={saving}
                        />
                      </div>
                      <FormField icon={Package} label="Stock quantity *" name="stock" type="number" value={form.stock} onChange={onChange} placeholder="0" />
                      <FormField
                        icon={DollarSign}
                        label="Purchase cost per unit (RWF)"
                        name="purchase_cost"
                        type="number"
                        value={form.purchase_cost}
                        onChange={onChange}
                        placeholder="0"
                      />
                      <FormField
                        icon={DollarSign}
                        label="Selling cost per unit (RWF)"
                        name="selling_price"
                        type="number"
                        value={form.selling_price}
                        onChange={onChange}
                        placeholder="0"
                      />
                    </div>
                    {(previewPurchaseValue > 0 || previewSellingValue > 0) && (
                      <div className="mt-3 space-y-1">
                        {previewPurchaseValue > 0 && (
                          <p className="text-xs font-medium text-gray-500">
                            Purchase value: <span className="font-bold text-[#000435]">{formatAmount(previewPurchaseValue)}</span>
                          </p>
                        )}
                        {previewSellingValue > 0 && (
                          <p className="text-xs font-bold text-[#000435]">
                            Estimated value (selling): {formatAmount(previewSellingValue)}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 px-4 py-3 bg-amber-50/50 rounded-2xl border border-amber-200/50">
                    <BadgeCheck size={16} className="text-amber-500 shrink-0" />
                    <p className="text-[11px] font-medium text-amber-700">Finished goods are saved to your school database for issuing and analytics.</p>
                  </div>
                </div>
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
                  <button type="button" onClick={closeForm} disabled={saving} className="px-5 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider rounded-xl hover:bg-white">
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={
                      saving ||
                      !resolveUniformNameFromForm(form) ||
                      !form.stock ||
                      resolveSizesFromForm(form, { single: Boolean(viewRow?.id) }).length === 0
                    }
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-[11px] font-bold text-white bg-[#000435] rounded-xl uppercase tracking-wider disabled:opacity-50"
                  >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                    {viewRow?.id
                      ? 'Update'
                      : (form.selected_sizes?.length || 0) > 1
                        ? `Save ${resolveSizesFromForm(form).length} sizes`
                        : 'Save stock'}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {profitModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-[#000435]/60 backdrop-blur-sm z-[60]"
              onClick={() => setProfitModal(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 8 }}
              className="fixed inset-0 z-[60] flex items-start justify-center pt-6 pb-8 px-4 overflow-y-auto pointer-events-none"
            >
              <div
                className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-4xl pointer-events-auto overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-5 sm:px-6 py-5 border-b border-gray-100 flex items-start justify-between gap-4 bg-gradient-to-r from-amber-50/50 to-white">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-amber-400/20 flex items-center justify-center shrink-0">
                      <Calculator size={18} className="text-amber-600" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-lg font-bold text-[#000435]">
                        {profitModal === 'all' ? 'Finished goods — profit / loss' : profitModal.uniform_name}
                      </h2>
                      <p className="text-[11px] font-medium text-gray-400 mt-0.5">
                        {profitModal === 'all'
                          ? 'Total sold cost minus total purchase cost (on sold quantity) for each item.'
                          : `${profitModal.size || '—'} · ${profitModal.sheet_label || 'No fabric linked'}`}
                      </p>
                    </div>
                  </div>
                  <button type="button" onClick={() => setProfitModal(null)} className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center shrink-0">
                    <X size={16} className="text-gray-400" />
                  </button>
                </div>

                {profitModal === 'all' ? (
                  <div className="p-4 sm:p-6 space-y-5 max-h-[70vh] overflow-y-auto">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {[
                        { label: 'Total sold cost', value: formatAmount(profitSummary.totalSoldCost) },
                        { label: 'Total purchase cost', value: formatAmount(profitSummary.totalPurchaseCost) },
                        {
                          label: 'Net profit / loss',
                          value: formatAmount(profitSummary.profitLoss),
                          highlight: profitSummary.profitLoss >= 0 ? 'profit' : 'loss',
                        },
                        { label: 'Units sold', value: formatAmount(profitSummary.soldQty) },
                      ].map((card) => (
                        <div
                          key={card.label}
                          className={`rounded-2xl border p-4 ${
                            card.highlight === 'profit'
                              ? 'border-emerald-100 bg-emerald-50/30'
                              : card.highlight === 'loss'
                                ? 'border-red-100 bg-red-50/30'
                                : 'border-gray-100 bg-gray-50/30'
                          }`}
                        >
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{card.label}</p>
                          <p
                            className={`text-xl font-bold mt-1 ${
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

                    <div className="overflow-x-auto rounded-2xl border border-gray-100">
                      <table className="w-full text-sm min-w-[720px]">
                        <thead>
                          <tr className="bg-gray-50/80 border-b border-gray-100">
                            {['Uniform', 'Size', 'Sold qty', 'Total sold cost', 'Total purchase cost', 'Profit / loss', 'Status'].map((h) => (
                              <th key={h} className="text-left py-3 px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {profitRows.map((row) => (
                            <tr key={row.id} className="border-b border-gray-50 hover:bg-amber-50/20">
                              <td className="py-3 px-3 text-xs font-bold text-[#000435]">{row.uniform_name}</td>
                              <td className="py-3 px-3 text-xs text-gray-500">{row.size}</td>
                              <td className="py-3 px-3 text-xs text-gray-600">{formatAmount(row.profit.soldQty)}</td>
                              <td className="py-3 px-3 text-xs font-medium text-emerald-700">{formatAmount(row.profit.totalSoldCost)}</td>
                              <td className="py-3 px-3 text-xs font-medium text-red-600">{formatAmount(row.profit.totalPurchaseCost)}</td>
                              <td className={`py-3 px-3 text-xs font-bold ${row.profit.profitLoss >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                {formatAmount(row.profit.profitLoss)}
                              </td>
                              <td className="py-3 px-3">
                                <ProfitStatusBadge value={row.profit.profitLoss} soldQty={row.profit.soldQty} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  (() => {
                    const p = computeFinishedGoodProfit(profitModal)
                    return (
                      <div className="p-5 sm:p-6 space-y-5">
                        <div className="rounded-2xl border border-amber-100 bg-amber-50/40 px-4 py-3 text-xs text-amber-900">
                          <span className="font-bold">Formula:</span> Total sold cost − Total purchase cost = Profit / loss
                          <span className="block mt-1 text-amber-800/80">
                            Purchase cost = used stock ({formatAmount(p.soldQty)}) × purchase cost per unit ({formatAmount(p.purchaseCost)})
                          </span>
                        </div>

                        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {[
                            ['Used / sold stock', formatAmount(p.soldQty)],
                            ['Purchase cost per unit', formatAmount(p.purchaseCost)],
                            ['Total purchase cost', formatAmount(p.totalPurchaseCost)],
                            ['Total sold cost', formatAmount(p.totalSoldCost)],
                          ].map(([label, value]) => (
                            <div key={label} className="rounded-xl border border-gray-100 bg-gray-50/50 px-4 py-3">
                              <dt className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</dt>
                              <dd className="text-lg font-bold text-[#000435] mt-1">{value}</dd>
                            </div>
                          ))}
                        </dl>

                        <div
                          className={`rounded-2xl border p-5 text-center ${
                            p.profitLoss > 0
                              ? 'border-emerald-200 bg-emerald-50/50'
                              : p.profitLoss < 0
                                ? 'border-red-200 bg-red-50/50'
                                : 'border-gray-200 bg-gray-50/50'
                          }`}
                        >
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Profit / loss</p>
                          <p
                            className={`text-3xl font-bold mt-2 ${
                              p.profitLoss > 0 ? 'text-emerald-600' : p.profitLoss < 0 ? 'text-red-500' : 'text-[#000435]'
                            }`}
                          >
                            {formatAmount(p.profitLoss)}
                          </p>
                          <div className="mt-3 flex justify-center">
                            <ProfitStatusBadge value={p.profitLoss} soldQty={p.soldQty} />
                          </div>
                          {p.totalSoldCost > 0 && (
                            <p className="text-xs text-gray-500 mt-3">
                              Margin: {p.marginPct.toFixed(1)}% of sold revenue
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })()
                )}

                <div className="px-5 sm:px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex flex-wrap justify-end gap-2">
                  {profitModal === 'all' && (
                    <>
                      <button
                        type="button"
                        onClick={() => exportFinishedGoodsExcel(filtered, { search, uniform: filterUniform })}
                        className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-[10px] font-bold uppercase hover:bg-emerald-100"
                      >
                        <FileSpreadsheet size={14} /> Excel
                      </button>
                      <button
                        type="button"
                        onClick={() => exportFinishedGoodsPdf(filtered, { search, uniform: filterUniform })}
                        className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-red-200 bg-red-50 text-red-800 text-[10px] font-bold uppercase hover:bg-red-100"
                      >
                        <FileText size={14} /> PDF
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => setProfitModal(null)}
                    className="px-5 py-2.5 rounded-xl border border-gray-200 text-[10px] font-bold uppercase tracking-wider text-gray-600 hover:bg-white"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewRow && modal !== 'form' && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-[#000435]/60 backdrop-blur-sm z-[60]" onClick={() => setViewRow(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none">
              <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-bold text-[#000435]">{viewRow.uniform_name}</h3>
                  <button type="button" onClick={() => setViewRow(null)} className="p-2 rounded-lg hover:bg-gray-100"><X size={16} /></button>
                </div>
                <dl className="space-y-2 text-sm">
                  {[
                    ['Size', viewRow.size],
                    ['Fabric sheet', viewRow.sheet_label || '—'],
                    ['Opening stock', formatAmount(viewRow.opening_stock)],
                    ['Used stock', formatAmount(viewRow.used_stock ?? viewRow.sold_qty)],
                    ['Remaining stock', formatAmount(viewRow.remaining_stock ?? viewRow.stock)],
                    ['Purchase cost / unit', formatAmount(viewRow.purchase_cost)],
                    ['Total purchase cost', formatAmount(viewRow.total_purchase_cost)],
                    ['Selling cost / unit', formatAmount(viewRow.selling_cost ?? viewRow.selling_price)],
                    ['Total estimated cost', formatAmount(viewRow.total_estimated_cost)],
                    ['Total sold cost', formatAmount(viewRow.total_sold_cost)],
                    ['Academic year', viewRow.academic_year],
                    ['Term', viewRow.term],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4 border-b border-gray-50 py-2">
                      <dt className="text-gray-400 font-medium">{k}</dt>
                      <dd className="font-bold text-[#000435] text-right">{v ?? '—'}</dd>
                    </div>
                  ))}
                </dl>
                {(() => {
                  const p = computeFinishedGoodProfit(viewRow)
                  return (
                    <div
                      className={`mt-4 rounded-xl border px-4 py-3 flex items-center justify-between gap-3 ${
                        p.profitLoss > 0
                          ? 'border-emerald-100 bg-emerald-50/40'
                          : p.profitLoss < 0
                            ? 'border-red-100 bg-red-50/40'
                            : 'border-gray-100 bg-gray-50/40'
                      }`}
                    >
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Profit / loss</p>
                        <p className={`text-sm font-bold ${p.profitLoss >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                          {formatAmount(p.profitLoss)}
                        </p>
                      </div>
                      <ProfitStatusBadge value={p.profitLoss} soldQty={p.soldQty} />
                    </div>
                  )
                })()}
                <div className="mt-4 flex gap-2">
                  <button type="button" onClick={() => { setProfitModal(viewRow); setViewRow(null) }} className="flex-1 py-2.5 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 text-xs font-bold uppercase tracking-wider">
                    Profit detail
                  </button>
                  <button type="button" onClick={() => { const row = viewRow; setViewRow(null); openEdit(row) }} className="flex-1 py-2.5 rounded-xl bg-[#000435] text-white text-xs font-bold uppercase tracking-wider">
                    Edit
                  </button>
                  <button type="button" onClick={() => setViewRow(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs font-bold uppercase tracking-wider text-gray-600">
                    Close
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
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-[#000435]/60 backdrop-blur-sm z-[70]" onClick={() => !saving && setDeleteTarget(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] flex items-center justify-center p-4 pointer-events-none">
              <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 pointer-events-auto text-center" onClick={(e) => e.stopPropagation()}>
                <Trash2 size={24} className="mx-auto text-red-500 mb-3" />
                <h3 className="font-bold text-[#000435] mb-2">Delete this stock entry?</h3>
                <p className="text-sm text-gray-500 mb-6">{deleteTarget.uniform_name} · {deleteTarget.size} · {deleteTarget.stock} pcs</p>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setDeleteTarget(null)} disabled={saving} className="flex-1 py-2.5 rounded-xl border text-sm font-medium">Cancel</button>
                  <button type="button" onClick={handleDelete} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium inline-flex items-center justify-center gap-2">
                    {saving && <Loader2 size={14} className="animate-spin" />}
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
