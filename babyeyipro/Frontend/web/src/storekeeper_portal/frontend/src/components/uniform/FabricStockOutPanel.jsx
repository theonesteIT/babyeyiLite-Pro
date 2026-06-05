import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Search, X, Package, Ruler, Calendar, Loader2, Trash2, RefreshCw,
  AlertCircle, ArrowUpFromLine, Layers, FileSpreadsheet,
} from 'lucide-react'
import { exportFabricStockOutExcel } from '../../utils/uniformInventoryExport'
import { fetchFabricReceipts } from '../../services/fabricReceiptsService'
import {
  EMPTY_STOCKOUT_FORM,
  STOCKOUT_PURPOSES,
  fetchFabricStockouts,
  createFabricStockout,
  deleteFabricStockout,
} from '../../services/fabricStockoutsService'

function formatDate(d) {
  if (!d) return '—'
  return String(d).slice(0, 10)
}

export default function FabricStockOutPanel({ onFabricsChange }) {
  const [stockouts, setStockouts] = useState([])
  const [receipts, setReceipts] = useState([])
  const [allReceipts, setAllReceipts] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [form, setForm] = useState({ ...EMPTY_STOCKOUT_FORM })

  const loadAll = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [outRows, rcptRows] = await Promise.all([fetchFabricStockouts(), fetchFabricReceipts()])
      setStockouts(outRows)
      setAllReceipts(rcptRows)
      setReceipts(rcptRows.filter((r) => Number(r.remaining_meters) > 0))
      onFabricsChange?.(rcptRows)
    } catch (e) {
      setError(e.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [onFabricsChange])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const availableReceipts = useMemo(
    () => receipts.filter((r) => Number(r.remaining_meters) > 0),
    [receipts]
  )

  const selectedReceipt = useMemo(
    () => availableReceipts.find((r) => String(r.id) === String(form.fabric_receipt_id)),
    [availableReceipts, form.fabric_receipt_id]
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return stockouts
    return stockouts.filter(
      (s) =>
        s.fabric_type?.toLowerCase().includes(q) ||
        s.color?.toLowerCase().includes(q) ||
        s.purpose?.toLowerCase().includes(q) ||
        s.supplier_name?.toLowerCase().includes(q)
    )
  }, [stockouts, search])

  const totalOut = useMemo(() => stockouts.reduce((sum, s) => sum + s.meters_out, 0), [stockouts])

  const openCreate = () => {
    setForm({
      ...EMPTY_STOCKOUT_FORM,
      out_date: new Date().toISOString().slice(0, 10),
      fabric_receipt_id: availableReceipts[0]?.id ? String(availableReceipts[0].id) : '',
    })
    setModalOpen(true)
  }

  const closeForm = () => {
    setModalOpen(false)
    setForm({ ...EMPTY_STOCKOUT_FORM })
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.fabric_receipt_id) {
      setError('Select a fabric batch')
      return
    }
    const max = Number(selectedReceipt?.remaining_meters || 0)
    const out = Number(form.meters_out) || 0
    if (out <= 0) {
      setError('Enter meters to remove')
      return
    }
    if (out > max) {
      setError(`Only ${max}m available on this batch`)
      return
    }
    setSaving(true)
    setError('')
    try {
      await createFabricStockout(form)
      closeForm()
      await loadAll()
    } catch (err) {
      setError(err.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setSaving(true)
    setError('')
    try {
      await deleteFabricStockout(deleteTarget.id)
      setDeleteTarget(null)
      await loadAll()
    } catch (err) {
      setError(err.message || 'Delete failed')
    } finally {
      setSaving(false)
    }
  }

  const previewRemaining =
    selectedReceipt && form.meters_out
      ? Math.max(0, Number(selectedReceipt.remaining_meters) - (Number(form.meters_out) || 0))
      : selectedReceipt?.remaining_meters

  return (
    <div>
      {error && (
        <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm font-medium">
          <AlertCircle size={16} className="shrink-0" />
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200/80 rounded-xl px-3 py-2">
          <ArrowUpFromLine size={14} className="text-amber-600" />
          <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">
            {totalOut.toLocaleString()}m issued out
          </span>
        </div>
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm">
          <Layers size={14} className="text-gray-300" />
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
            {availableReceipts.length} batch{availableReceipts.length === 1 ? '' : 'es'} in stock
          </span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-400/20 transition-all">
            <Search size={14} className="text-gray-300" />
            <input
              type="text"
              placeholder="Search fabric, purpose…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent border-none outline-none text-sm w-40 sm:w-52 text-[#000435] font-medium"
            />
          </div>
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
          <button
            type="button"
            onClick={() => exportFabricStockOutExcel(filtered, allReceipts, { search })}
            disabled={!filtered.length}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold uppercase hover:bg-emerald-100 disabled:opacity-40 transition"
          >
            <FileSpreadsheet size={14} /> Export Excel
          </button>
          <button
            type="button"
            onClick={openCreate}
            disabled={availableReceipts.length === 0}
            className="flex items-center justify-center gap-2 bg-[#000435] text-white px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider hover:bg-[#0a116b] transition-all shadow-lg shadow-[#000435]/20 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
          >
            <Plus size={14} /> Record Stock Out
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 gap-3 text-gray-400">
          <Loader2 size={22} className="animate-spin" />
          <span className="text-sm font-medium">Loading stock out history…</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-dashed border-gray-200 bg-gray-50/50">
          <ArrowUpFromLine size={36} className="mx-auto text-gray-200 mb-3" />
          <p className="text-sm font-medium text-gray-400">No fabric stock outs yet</p>
          <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
            Record meters sent to production or removed from a fabric batch.
          </p>
          {availableReceipts.length > 0 && (
            <button type="button" onClick={openCreate} className="mt-3 text-xs font-bold text-amber-600 hover:underline">
              + Record first stock out
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
          <table className="w-full text-sm min-w-[880px]">
            <thead>
              <tr className="bg-gray-50/90 border-b border-gray-100">
                {['Date', 'Fabric', 'Color', 'Meters out', 'Remaining', 'Purpose', 'Note', ''].map((h) => (
                  <th
                    key={h || 'actions'}
                    className="text-left py-3.5 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => (
                <motion.tr
                  key={row.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  className="border-b border-gray-50 hover:bg-amber-50/30 transition-colors"
                >
                  <td className="py-3.5 px-4 text-xs text-gray-500 whitespace-nowrap">{formatDate(row.out_date)}</td>
                  <td className="py-3.5 px-4 text-xs font-bold text-[#000435]">{row.fabric_type}</td>
                  <td className="py-3.5 px-4 text-xs text-gray-500">{row.color || '—'}</td>
                  <td className="py-3.5 px-4 text-xs font-bold text-red-600">−{row.meters_out}m</td>
                  <td className="py-3.5 px-4 text-xs">
                    <span className="text-amber-600 font-bold bg-amber-50 px-2 py-1 rounded-lg">{row.remaining_after}m</span>
                  </td>
                  <td className="py-3.5 px-4 text-xs font-medium text-gray-600">{row.purpose || '—'}</td>
                  <td className="py-3.5 px-4 text-xs text-gray-400 max-w-[140px] truncate">{row.note || '—'}</td>
                  <td className="py-3.5 px-4">
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(row)}
                      className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"
                      aria-label="Reverse stock out"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AnimatePresence>
        {modalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-[#000435]/60 backdrop-blur-sm z-[60]"
              onClick={closeForm}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 z-[60] flex items-start justify-center pt-8 pb-8 overflow-y-auto pointer-events-none"
            >
              <form
                onSubmit={handleSubmit}
                className="bg-white rounded-3xl shadow-2xl w-full max-w-lg mx-4 pointer-events-auto overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-red-50/40 to-white">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-red-100 flex items-center justify-center">
                      <ArrowUpFromLine size={18} className="text-red-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-[#000435]">Fabric stock out</h2>
                      <p className="text-[11px] font-medium text-gray-400">Remove meters from a batch</p>
                    </div>
                  </div>
                  <button type="button" onClick={closeForm} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400">
                    <X size={18} />
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 block">
                      Fabric batch *
                    </label>
                    <select
                      name="fabric_receipt_id"
                      value={form.fabric_receipt_id}
                      onChange={handleChange}
                      required
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium text-[#000435] bg-white"
                    >
                      <option value="">Select fabric…</option>
                      {availableReceipts.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.fabric_type} ({r.color || '—'}) — {r.remaining_meters}m left
                          {r.supplier_name ? ` · ${r.supplier_name}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  {selectedReceipt && (
                    <div className="rounded-2xl border border-amber-100 bg-amber-50/60 px-4 py-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-amber-800">
                        <Package size={14} />
                        On hand
                      </div>
                      <span className="text-lg font-bold text-amber-700">{selectedReceipt.remaining_meters}m</span>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 block">
                        Out date *
                      </label>
                      <div className="relative">
                        <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
                        <input
                          type="date"
                          name="out_date"
                          value={form.out_date}
                          onChange={handleChange}
                          required
                          className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 block">
                        Meters out *
                      </label>
                      <div className="relative">
                        <Ruler size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
                        <input
                          type="number"
                          name="meters_out"
                          min="0.01"
                          step="0.01"
                          max={selectedReceipt?.remaining_meters}
                          value={form.meters_out}
                          onChange={handleChange}
                          required
                          placeholder="0"
                          className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 text-sm font-bold text-[#000435]"
                        />
                      </div>
                    </div>
                  </div>
                  {previewRemaining != null && form.meters_out && (
                    <p className="text-xs font-medium text-gray-500">
                      After issue: <span className="font-bold text-[#000435]">{previewRemaining}m</span> remaining
                    </p>
                  )}
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 block">
                      Purpose
                    </label>
                    <select
                      name="purpose"
                      value={form.purpose}
                      onChange={handleChange}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium text-[#000435]"
                    >
                      {STOCKOUT_PURPOSES.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 block">
                      Note
                    </label>
                    <textarea
                      name="note"
                      value={form.note}
                      onChange={handleChange}
                      rows={2}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none"
                      placeholder="Optional details…"
                    />
                  </div>
                </div>
                <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2 bg-gray-50/50">
                  <button type="button" onClick={closeForm} className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-100">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving || !selectedReceipt}
                    className="flex items-center gap-2 bg-[#000435] text-white px-5 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider disabled:opacity-50"
                  >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <ArrowUpFromLine size={14} />}
                    Confirm stock out
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteTarget && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 z-[70]" onClick={() => setDeleteTarget(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed inset-0 z-[70] flex items-center justify-center p-4 pointer-events-none"
            >
              <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 pointer-events-auto">
                <p className="text-sm font-bold text-[#000435]">Reverse this stock out?</p>
                <p className="text-xs text-gray-500 mt-2">
                  {deleteTarget.meters_out}m will be restored to {deleteTarget.fabric_type}.
                </p>
                <div className="flex gap-2 mt-5 justify-end">
                  <button type="button" onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-xs font-bold text-gray-500">
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={saving}
                    className="px-4 py-2 rounded-xl bg-red-500 text-white text-xs font-bold"
                  >
                    {saving ? '…' : 'Reverse'}
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
