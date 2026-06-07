import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Search, X, Building2, Calendar, Hash, Package, Ruler, DollarSign,
  BadgeCheck, Loader2, Edit2, Trash2, Eye, RefreshCw, AlertCircle, ShoppingCart,
  FileSpreadsheet, FileText,
} from 'lucide-react'
import {
  exportFabricStockInExcel,
  exportFabricStockInExcelBySheet,
  exportFabricStockInPdf,
} from '../../utils/uniformInventoryExport'
import { fetchFabricStockouts } from '../../services/fabricStockoutsService'
import { fetchFinishedGoods } from '../../services/finishedGoodsService'
import FabricStockInDetailDrawer from './FabricStockInDetailDrawer'
import { formatMoney } from '../../utils/formatMoney'
import { fetchSuppliers } from '../../services/suppliersService'
import { fetchStoreAcademicSettings } from '../../services/academicSettingsService'
import {
  EMPTY_FABRIC_FORM,
  FABRIC_TYPES,
  fabricTypeToFormFields,
  resolveFabricTypeFromForm,
  fetchFabricReceipts,
  createFabricReceipt,
  updateFabricReceipt,
  deleteFabricReceipt,
  mapFabricFromApi,
} from '../../services/fabricReceiptsService'

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

function formatDate(d) {
  if (!d) return '—'
  return String(d).slice(0, 10)
}

export default function FabricStockInPanel({ onFabricsChange }) {
  const [fabrics, setFabrics] = useState([])
  const [stockouts, setStockouts] = useState([])
  const [finishedGoods, setFinishedGoods] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [academic, setAcademic] = useState({ academicYears: [], activeTerms: [], academicYear: '', currentTerm: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [modal, setModal] = useState(null)
  const [detailReceipt, setDetailReceipt] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [form, setForm] = useState(EMPTY_FABRIC_FORM)

  const loadAll = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [rows, outRows, goods, sups, acad] = await Promise.all([
        fetchFabricReceipts(),
        fetchFabricStockouts(),
        fetchFinishedGoods(),
        fetchSuppliers(),
        fetchStoreAcademicSettings(),
      ])
      setFabrics(rows)
      setStockouts(outRows)
      setFinishedGoods(goods)
      setSuppliers(sups)
      setAcademic(acad)
      onFabricsChange?.(rows)
    } catch (e) {
      setError(e.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [onFabricsChange])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const defaultForm = useMemo(
    () => ({
      ...EMPTY_FABRIC_FORM,
      academic_year: academic.academicYear,
      term: academic.currentTerm,
      purchase_date: new Date().toISOString().slice(0, 10),
    }),
    [academic]
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return fabrics.filter((f) => {
      if (filterType && f.fabric_type !== filterType) return false
      if (!q) return true
      return (
        f.fabric_type.toLowerCase().includes(q) ||
        f.color.toLowerCase().includes(q) ||
        f.supplier_name.toLowerCase().includes(q) ||
        f.invoice_number.toLowerCase().includes(q)
      )
    })
  }, [fabrics, search, filterType])

  const openDetail = (row) => {
    setDetailReceipt(row)
    setDrawerOpen(true)
  }

  const openCreate = () => {
    setDetailReceipt(null)
    setDrawerOpen(false)
    setForm(defaultForm)
    setModal('form')
  }

  const openEdit = (row) => {
    const { fabric_type, fabric_type_other } = fabricTypeToFormFields(row.fabric_type)
    setForm({
      academic_year: row.academic_year,
      term: row.term,
      supplier_id: row.supplier_id ? String(row.supplier_id) : '',
      purchase_date: row.purchase_date,
      invoice_number: row.invoice_number,
      fabric_type,
      fabric_type_other,
      color: row.color,
      meters: String(row.meters),
      unit_cost: row.unit_cost === '' ? '' : String(row.unit_cost),
    })
    setDrawerOpen(false)
    setModal('form')
    setDetailReceipt(row)
  }

  const closeForm = () => {
    if (saving) return
    setModal(null)
    setDetailReceipt(null)
    setForm(EMPTY_FABRIC_FORM)
  }

  const onChange = (e) => {
    const { name, value } = e.target
    setForm((f) => {
      const next = { ...f, [name]: value }
      if (name === 'fabric_type' && value !== 'Other') next.fabric_type_other = ''
      return next
    })
  }

  const resolvedFabricType = resolveFabricTypeFromForm(form)
  const fabricTypeValid = Boolean(resolvedFabricType)

  const handleSave = async () => {
    if (!fabricTypeValid || !form.meters || Number(form.meters) <= 0) {
      setError(
        form.fabric_type === 'Other' && !resolvedFabricType
          ? 'Specify the fabric type when Other is selected'
          : 'Fabric type and meters are required'
      )
      return
    }
    setSaving(true)
    setError('')
    try {
      if (detailReceipt?.id) await updateFabricReceipt(detailReceipt.id, form)
      else await createFabricReceipt(form)
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
      await deleteFabricReceipt(deleteTarget.id)
      setDeleteTarget(null)
      await loadAll()
    } catch (e) {
      setError(e.message || 'Delete failed')
    } finally {
      setSaving(false)
    }
  }

  const previewTotal =
    (Number(form.meters) || 0) * (Number(form.unit_cost) || 0)

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
              placeholder="Search fabric, supplier, invoice…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent border-none outline-none text-sm w-40 sm:w-52 text-[#000435] font-medium"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="text-xs font-bold border border-gray-200 rounded-xl px-3 py-2.5 text-gray-600 bg-white uppercase tracking-wider"
          >
            <option value="">All fabrics</option>
            {FABRIC_TYPES.map((t) => (
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
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => exportFabricStockInExcelBySheet(filtered, stockouts, finishedGoods, { search, fabric_type: filterType })}
            disabled={!filtered.length}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold uppercase hover:bg-emerald-100 disabled:opacity-40 transition"
          >
            <FileSpreadsheet size={14} /> Excel (by sheet)
          </button>
          <button
            type="button"
            onClick={() => exportFabricStockInPdf(filtered, stockouts, finishedGoods, { search, fabric_type: filterType })}
            disabled={!filtered.length}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-[10px] font-bold uppercase hover:bg-red-100 disabled:opacity-40 transition"
          >
            <FileText size={14} /> PDF
          </button>
          <button
            type="button"
            onClick={() => exportFabricStockInExcel(filtered, { search, fabric_type: filterType })}
            disabled={!filtered.length}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-gray-200 text-[#000435] text-[10px] font-bold uppercase hover:bg-gray-50 disabled:opacity-40 transition"
          >
            <FileSpreadsheet size={14} /> List Excel
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center justify-center gap-2 bg-[#000435] text-white px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider hover:bg-[#0a116b] transition-all shadow-lg shadow-[#000435]/20 active:scale-95"
          >
            <Plus size={14} /> Receive Fabric
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 gap-3 text-gray-400">
          <Loader2 size={22} className="animate-spin" />
          <span className="text-sm font-medium">Loading fabric receipts…</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-dashed border-gray-200 bg-gray-50/50">
          <Package size={36} className="mx-auto text-gray-200 mb-3" />
          <p className="text-sm font-medium text-gray-400">No fabric receipts yet</p>
          <button type="button" onClick={openCreate} className="mt-3 text-xs font-bold text-amber-600 hover:underline">
            + Receive first fabric batch
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="bg-gray-50/90 border-b border-gray-100">
                {['Date', 'Year / Term', 'Supplier', 'Fabric', 'Color', 'Meters', 'Unit cost', 'Total', 'Remaining', 'Actions'].map((h) => (
                  <th key={h} className="text-left py-3.5 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((f, i) => (
                <motion.tr
                  key={f.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  className="border-b border-gray-50 hover:bg-amber-50/30 transition-colors cursor-pointer"
                  onClick={() => openDetail(f)}
                >
                  <td className="py-3.5 px-4 text-xs text-gray-500 whitespace-nowrap">{formatDate(f.purchase_date)}</td>
                  <td className="py-3.5 px-4 text-xs text-gray-500 whitespace-nowrap">
                    <span className="font-bold text-[#000435]">{f.academic_year || '—'}</span>
                    <span className="text-gray-400"> · {f.term || '—'}</span>
                  </td>
                  <td className="py-3.5 px-4 text-xs font-medium text-[#000435] max-w-[120px] truncate">{f.supplier_name || '—'}</td>
                  <td className="py-3.5 px-4 text-xs font-bold text-[#000435]">{f.fabric_type}</td>
                  <td className="py-3.5 px-4 text-xs text-gray-500">{f.color || '—'}</td>
                  <td className="py-3.5 px-4 text-xs font-medium text-gray-600">{f.meters}</td>
                  <td className="py-3.5 px-4 text-xs text-gray-600 whitespace-nowrap">{formatMoney(f.unit_cost)}</td>
                  <td className="py-3.5 px-4 text-xs font-medium text-gray-600 whitespace-nowrap">{formatMoney(f.total_cost)}</td>
                  <td className="py-3.5 px-4 text-xs">
                    <span className="text-amber-600 font-bold bg-amber-50 px-2 py-1 rounded-lg">{f.remaining_meters}m</span>
                  </td>
                  <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => openDetail(f)} className="p-2 rounded-lg hover:bg-amber-100 text-amber-600" aria-label="View">
                        <Eye size={14} />
                      </button>
                      <button type="button" onClick={() => openEdit(f)} className="p-2 rounded-lg hover:bg-amber-50 text-gray-400 hover:text-amber-600" aria-label="Edit">
                        <Edit2 size={14} />
                      </button>
                      <button type="button" onClick={() => setDeleteTarget(f)} className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500" aria-label="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Form modal */}
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
                      <ShoppingCart size={18} className="text-amber-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-[#000435]">{detailReceipt?.id ? 'Edit fabric receipt' : 'Receive Fabric'}</h2>
                      <p className="text-[11px] font-medium text-gray-400">New purchase — stock in</p>
                    </div>
                  </div>
                  <button type="button" onClick={closeForm} className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
                    <X size={16} className="text-gray-400" />
                  </button>
                </div>
                <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <SelectField icon={Calendar} label="Academic year *" name="academic_year" value={form.academic_year} onChange={onChange}>
                      <option value="">Select year</option>
                      {academic.academicYears.map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </SelectField>
                    <SelectField icon={Calendar} label="Term *" name="term" value={form.term} onChange={onChange}>
                      <option value="">Select term</option>
                      {academic.activeTerms.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </SelectField>
                    <SelectField icon={Building2} label="Supplier" name="supplier_id" value={form.supplier_id} onChange={onChange}>
                      <option value="">Select supplier</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </SelectField>
                    <FormField icon={Calendar} label="Purchase date" name="purchase_date" type="date" value={form.purchase_date} onChange={onChange} />
                  </div>
                  <FormField icon={Hash} label="Invoice number" name="invoice_number" value={form.invoice_number} onChange={onChange} placeholder="INV-001" />
                  <div className="border-t border-gray-100 pt-5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-2">
                      <Package size={14} /> Fabric details
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <SelectField icon={Ruler} label="Fabric type *" name="fabric_type" value={form.fabric_type} onChange={onChange}>
                        <option value="">Select</option>
                        {FABRIC_TYPES.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </SelectField>
                      {form.fabric_type === 'Other' ? (
                        <FormField
                          icon={Ruler}
                          label="Specify fabric type *"
                          name="fabric_type_other"
                          value={form.fabric_type_other}
                          onChange={onChange}
                          placeholder="e.g. Red sheet, Polyester blend"
                        />
                      ) : (
                        <FormField icon={Package} label="Color" name="color" value={form.color} onChange={onChange} placeholder="e.g. White" />
                      )}
                      {form.fabric_type === 'Other' && (
                        <div className="sm:col-span-2">
                          <FormField icon={Package} label="Color" name="color" value={form.color} onChange={onChange} placeholder="e.g. White" />
                        </div>
                      )}
                      <FormField icon={Ruler} label="Meters *" name="meters" type="number" value={form.meters} onChange={onChange} placeholder="0" />
                      <FormField icon={DollarSign} label="Unit cost (RWF)" name="unit_cost" type="number" value={form.unit_cost} onChange={onChange} placeholder="0" />
                    </div>
                    {previewTotal > 0 && (
                      <p className="mt-3 text-xs font-bold text-[#000435]">Total: {formatMoney(previewTotal)}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 px-4 py-3 bg-amber-50/50 rounded-2xl border border-amber-200/50">
                    <BadgeCheck size={16} className="text-amber-500 shrink-0" />
                    <p className="text-[11px] font-medium text-amber-700">Fabric is saved to your school database and available for production.</p>
                  </div>
                </div>
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
                  <button type="button" onClick={closeForm} disabled={saving} className="px-5 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider rounded-xl hover:bg-white">
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving || !fabricTypeValid || !form.meters || !form.academic_year || !form.term}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-[11px] font-bold text-white bg-[#000435] rounded-xl uppercase tracking-wider disabled:opacity-50"
                  >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                    {detailReceipt?.id ? 'Update' : 'Save fabric'}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <FabricStockInDetailDrawer
        receipt={detailReceipt}
        stockouts={stockouts}
        finishedGoods={finishedGoods}
        open={drawerOpen && modal !== 'form'}
        onClose={() => { setDrawerOpen(false); setDetailReceipt(null) }}
        onEdit={(row) => openEdit(row)}
      />

      {/* Delete confirm */}
      <AnimatePresence>
        {deleteTarget && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-[#000435]/60 backdrop-blur-sm z-[70]" onClick={() => !saving && setDeleteTarget(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] flex items-center justify-center p-4 pointer-events-none">
              <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 pointer-events-auto text-center" onClick={(e) => e.stopPropagation()}>
                <Trash2 size={24} className="mx-auto text-red-500 mb-3" />
                <h3 className="font-bold text-[#000435] mb-2">Delete this receipt?</h3>
                <p className="text-sm text-gray-500 mb-6">{deleteTarget.fabric_type} · {deleteTarget.meters}m</p>
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
