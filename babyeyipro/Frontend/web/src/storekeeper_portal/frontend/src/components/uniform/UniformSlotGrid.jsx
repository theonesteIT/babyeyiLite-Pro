import { Fragment, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Settings, Shirt, AlertTriangle, Copy, ChevronDown, ChevronRight,
  X, Package, DollarSign, Layers, Download, Pencil, Trash2,
  Users, Ruler, Tag,
} from 'lucide-react'
import { UNIFORM_PRESET_ITEMS, formatRwf } from '../../services/uniformIssueService'
import { exportUniformDistributionExcel } from '../../utils/uniformSlotExport'
import { ModalField, modalInputClass, UniformModalHeader, UniformModalFooter, UniformModalBackdrop } from './uniformModalUi'

/** @typedef {{ id: string, name: string }} SlotColumn */
/** @typedef {{ label_name: string, finished_good_id: string|number, quantity: number, unit_price: number }} SlotConfig */

const DEFAULT_SLOT_NAMES = ['Shirts', 'Trousers', 'Tie', 'Skirt', 'Sweater', 'Sports Uniform', 'Shorts', 'Socks']

export function createDefaultSlotColumns(count = 4) {
  const n = Math.min(12, Math.max(1, count))
  return Array.from({ length: n }, (_, i) => ({
    id: `slot-${i}-${Date.now()}`,
    name: DEFAULT_SLOT_NAMES[i] || `Item ${i + 1}`,
  }))
}

function newSlotId() {
  return `slot-${Math.random().toString(36).slice(2, 9)}-${Date.now()}`
}

function slotTotal(slot) {
  if (!slot) return 0
  return (Number(slot.quantity) || 0) * (Number(slot.unit_price) || 0)
}

function formatNum(n) {
  return (Number(n) || 0).toLocaleString()
}

/** Warehouse stock minus quantities already saved in the slot grid */
export function getFinishedGoodRemaining(fgId, stockUsage, finishedGoods, stockCredit = null) {
  const fg = finishedGoods.find((g) => g.id === fgId)
  if (!fg) return { warehouse: 0, reserved: 0, remaining: 0, credit: 0 }
  const credit = stockCredit?.get?.(fgId) || 0
  const warehouse = Number(fg.stock) || 0
  const effectiveWarehouse = warehouse + credit
  const reserved = stockUsage?.get(fgId) || 0
  return {
    warehouse: effectiveWarehouse,
    reserved,
    remaining: Math.max(0, effectiveWarehouse - reserved),
    credit,
  }
}

function SlotCell({ slot, status, onConfigure }) {
  if (status === 'stock') {
    return (
      <button
        type="button"
        onClick={onConfigure}
        className="w-full min-w-[118px] p-2.5 rounded-xl border border-red-200 bg-red-50 text-left hover:bg-red-100 transition shadow-sm"
      >
        <p className="text-[10px] font-bold text-red-600 flex items-center gap-1">
          <AlertTriangle size={12} /> Insufficient
        </p>
        {slot?.label_name && <p className="text-[10px] text-red-600 mt-1 truncate">{slot.label_name}</p>}
        <p className="text-[10px] text-red-500">Qty: {slot.quantity}</p>
      </button>
    )
  }
  if (!slot?.label_name) {
    return (
      <button
        type="button"
        onClick={onConfigure}
        className="w-full min-w-[118px] p-3 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/90 text-gray-400 hover:border-amber-400 hover:bg-amber-50/40 hover:text-amber-700 transition text-center group"
      >
        <span className="text-[10px] font-bold uppercase tracking-wide group-hover:text-amber-700">➕ Set item</span>
      </button>
    )
  }
  return (
    <button
      type="button"
      onClick={onConfigure}
      className="w-full min-w-[118px] p-2.5 rounded-xl border border-blue-200/80 bg-gradient-to-br from-blue-50 to-white text-left hover:shadow-md hover:border-blue-300 transition"
    >
      <p className="text-[10px] font-bold text-blue-900 flex items-center gap-1">
        <Shirt size={11} className="text-blue-600" /> {slot.label_name}
      </p>
      <p className="text-[10px] text-blue-700 mt-1 font-medium">Qty: {slot.quantity}</p>
      <p className="text-[10px] font-bold text-[#000435] mt-0.5">{formatRwf(slotTotal(slot))}</p>
    </button>
  )
}

export default function UniformSlotGrid({
  students,
  finishedGoods,
  slotColumns,
  onSlotColumnsChange,
  slotMatrix,
  onSlotMatrixChange,
  stockUsage,
  stockCredit = null,
  exportMeta = {},
}) {
  const [showManageSlots, setShowManageSlots] = useState(false)
  const [manageDraft, setManageDraft] = useState([])
  const [configureTarget, setConfigureTarget] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [clipboard, setClipboard] = useState(null)
  const [form, setForm] = useState({ preset: '', finished_good_id: '', custom_name: '', quantity: '1', unit_price: '' })

  const getSlot = (studentId, slotId) => slotMatrix[studentId]?.[slotId] || null

  const setSlot = (studentId, slotId, config) => {
    onSlotMatrixChange((prev) => ({
      ...prev,
      [studentId]: { ...(prev[studentId] || {}), [slotId]: config },
    }))
  }

  const columnTotals = useMemo(() => {
    const totals = {}
    for (const col of slotColumns) {
      let qty = 0
      let amount = 0
      for (const st of students) {
        const slot = slotMatrix[st.id]?.[col.id]
        if (slot?.label_name) {
          qty += Number(slot.quantity) || 0
          amount += slotTotal(slot)
        }
      }
      totals[col.id] = { qty, amount }
    }
    return totals
  }, [students, slotMatrix, slotColumns])

  const getCellStatus = (studentId, slotId) => {
    const slot = getSlot(studentId, slotId)
    if (!slot?.label_name) return 'empty'
    const fgId = Number(slot.finished_good_id)
    if (!fgId) return 'configured'
    const { warehouse, reserved } = getFinishedGoodRemaining(fgId, stockUsage, finishedGoods, stockCredit)
    if (reserved > warehouse) return 'stock'
    return 'configured'
  }

  const rowTotals = (studentId) => {
    let qty = 0
    let amount = 0
    for (const col of slotColumns) {
      const slot = getSlot(studentId, col.id)
      if (slot?.label_name) {
        qty += Number(slot.quantity) || 0
        amount += slotTotal(slot)
      }
    }
    return { qty, amount }
  }

  const footer = useMemo(() => {
    let pieces = 0
    let value = 0
    for (const st of students) {
      const t = rowTotals(st.id)
      pieces += t.qty
      value += t.amount
    }
    return { count: students.length, pieces, value }
  }, [students, slotMatrix, slotColumns])

  const openManageSlots = () => {
    setManageDraft(slotColumns.map((c) => ({ ...c })))
    setShowManageSlots(true)
  }

  const saveManageSlots = () => {
    const cleaned = manageDraft
      .map((c) => ({ ...c, name: String(c.name || '').trim() }))
      .filter((c) => c.name)
    if (!cleaned.length) return
    const removedIds = slotColumns.filter((c) => !cleaned.find((x) => x.id === c.id)).map((c) => c.id)
    if (removedIds.length) {
      onSlotMatrixChange((prev) => {
        const next = { ...prev }
        for (const sid of Object.keys(next)) {
          const row = { ...next[sid] }
          removedIds.forEach((rid) => delete row[rid])
          next[sid] = row
        }
        return next
      })
    }
    onSlotColumnsChange(cleaned)
    setShowManageSlots(false)
  }

  const addManageSlotRow = () => {
    if (manageDraft.length >= 12) return
    setManageDraft((d) => [...d, { id: newSlotId(), name: `Item ${d.length + 1}` }])
  }

  const openConfigure = (target) => {
    setConfigureTarget(target)
    const col = slotColumns.find((c) => c.id === target.slotId)
    const slot = target.bulk ? null : getSlot(target.studentId, target.slotId)
    setForm({
      preset: slot?.label_name || col?.name || '',
      finished_good_id: slot?.finished_good_id ? String(slot.finished_good_id) : '',
      custom_name: slot?.label_name || '',
      quantity: slot ? String(slot.quantity) : '1',
      unit_price: slot ? String(slot.unit_price) : '',
    })
  }

  const configureCol = configureTarget ? slotColumns.find((c) => c.id === configureTarget.slotId) : null

  const configureStudent = useMemo(() => {
    if (!configureTarget || configureTarget.bulk) return null
    return students.find((s) => s.id === configureTarget.studentId) || null
  }, [configureTarget, students])

  const isEditingExistingSlot = useMemo(() => {
    if (!configureTarget || configureTarget.bulk) return false
    const slot = getSlot(configureTarget.studentId, configureTarget.slotId)
    return Boolean(slot?.label_name)
  }, [configureTarget, slotMatrix, slotColumns, students])

  const stockPreview = useMemo(() => {
    const fgId = Number(form.finished_good_id)
    if (!fgId) return null
    const fg = finishedGoods.find((g) => g.id === fgId)
    if (!fg) return null
    const available = Number(fg.stock) || 0
    const qty = Number(form.quantity) || 0
    let allocated = stockUsage?.get(fgId) || 0

    if (configureTarget && !configureTarget.bulk) {
      const existing = getSlot(configureTarget.studentId, configureTarget.slotId)
      if (existing?.finished_good_id && Number(existing.finished_good_id) === fgId) {
        allocated -= Number(existing.quantity) || 0
      }
    } else if (configureTarget?.bulk) {
      for (const st of students) {
        const existing = getSlot(st.id, configureTarget.slotId)
        if (existing?.finished_good_id && Number(existing.finished_good_id) === fgId) {
          allocated -= Number(existing.quantity) || 0
        }
      }
    }

    const neededIfSave = configureTarget?.bulk
      ? allocated + qty * students.length
      : allocated + qty

    return {
      available,
      allocated,
      neededIfSave,
      remaining: available - neededIfSave,
      ok: neededIfSave <= available,
    }
  }, [form, finishedGoods, stockUsage, configureTarget, students, slotMatrix, slotColumns])

  const buildConfigFromForm = () => {
    const fg = finishedGoods.find((g) => String(g.id) === String(form.finished_good_id))
    let label = form.preset === 'Other' ? form.custom_name.trim() : form.preset
    if (fg) label = fg.uniform_name
    if (!label && form.custom_name) label = form.custom_name.trim()
    if (!label && configureCol?.name) label = configureCol.name
    if (!label) return null
    const qty = Number(form.quantity) || 0
    const price = Number(form.unit_price) || 0
    if (qty <= 0) return null
    return {
      label_name: label,
      finished_good_id: form.finished_good_id || '',
      quantity: qty,
      unit_price: price,
    }
  }

  const saveConfigure = () => {
    const config = buildConfigFromForm()
    if (!config || !configureTarget) return
    if (stockPreview && !stockPreview.ok) return
    if (configureTarget.bulk) {
      onSlotMatrixChange((prev) => {
        const next = { ...prev }
        for (const st of students) {
          next[st.id] = { ...(next[st.id] || {}), [configureTarget.slotId]: { ...config } }
        }
        return next
      })
    } else {
      setSlot(configureTarget.studentId, configureTarget.slotId, { ...config })
    }
    setConfigureTarget(null)
  }

  const copyRow = (studentId) => {
    const row = {}
    for (const col of slotColumns) {
      const slot = getSlot(studentId, col.id)
      if (slot) row[col.id] = { ...slot }
    }
    setClipboard(row)
  }

  const pasteRow = (studentId) => {
    if (!clipboard) return
    onSlotMatrixChange((prev) => ({ ...prev, [studentId]: { ...clipboard } }))
  }

  const handleExport = () => {
    exportUniformDistributionExcel({
      students,
      slotColumns,
      slotMatrix,
      meta: exportMeta,
    })
  }

  const previewTotal = buildConfigFromForm()
  const previewAmountPerStudent = previewTotal ? slotTotal(previewTotal) : 0
  const previewAmountBulk = configureTarget?.bulk
    ? previewAmountPerStudent * students.length
    : previewAmountPerStudent
  const previewAmount = previewAmountBulk

  const selectedFgRemaining = form.finished_good_id
    ? getFinishedGoodRemaining(Number(form.finished_good_id), stockUsage, finishedGoods, stockCredit)
    : null

  const liveReserveQty = useMemo(() => {
    if (!form.finished_good_id) return 0
    const fgId = Number(form.finished_good_id)
    const qty = Number(form.quantity) || 0
    let base = stockUsage?.get(fgId) || 0
    if (configureTarget && !configureTarget.bulk) {
      const ex = getSlot(configureTarget.studentId, configureTarget.slotId)
      if (ex?.finished_good_id && Number(ex.finished_good_id) === fgId) base -= Number(ex.quantity) || 0
    } else if (configureTarget?.bulk) {
      for (const st of students) {
        const ex = getSlot(st.id, configureTarget.slotId)
        if (ex?.finished_good_id && Number(ex.finished_good_id) === fgId) base -= Number(ex.quantity) || 0
      }
    }
    const add = configureTarget?.bulk ? qty * students.length : qty
    return { reserved: base + add, add }
  }, [form, stockUsage, configureTarget, students, slotMatrix])

  const stockBarItems = useMemo(() => {
    return finishedGoods
      .filter((g) => (stockUsage?.get(g.id) || 0) > 0 || Number(g.stock) > 0)
      .map((g) => {
        const { warehouse, reserved, remaining } = getFinishedGoodRemaining(g.id, stockUsage, finishedGoods, stockCredit)
        return { ...g, warehouse, reserved, remaining }
      })
      .slice(0, 8)
  }, [finishedGoods, stockUsage])

  return (
    <div className="space-y-4">
      {stockBarItems.length > 0 && (
        <div className="flex flex-wrap gap-2 p-3 rounded-2xl border border-gray-100 bg-slate-50/80">
          <span className="text-[10px] font-bold uppercase text-gray-400 w-full mb-0.5">Live stock (reserved in this issue)</span>
          {stockBarItems.map((g) => (
            <div
              key={g.id}
              className={`px-3 py-2 rounded-xl border text-[10px] font-semibold ${
                g.remaining <= 0 ? 'bg-red-50 border-red-200 text-red-700' : 'bg-white border-gray-200 text-[#000435]'
              }`}
            >
              {g.uniform_name} ({g.size})
              <span className="block text-gray-500 font-medium mt-0.5">
                {g.remaining} left · {g.reserved} reserved / {g.warehouse} in store
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl border border-gray-100 bg-gradient-to-r from-white to-amber-50/30 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={openManageSlots}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#000435] text-white text-[10px] font-bold uppercase tracking-wider shadow-md hover:bg-[#0a116b] transition"
          >
            <Layers size={14} /> Edit slot columns
          </button>
          <button
            type="button"
            onClick={() => onSlotColumnsChange([...slotColumns, { id: newSlotId(), name: `Item ${slotColumns.length + 1}` }])}
            disabled={slotColumns.length >= 12}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 border border-gray-200 rounded-xl text-[10px] font-bold uppercase text-[#000435] bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            <Plus size={14} /> Add column
          </button>
        </div>
        <button
          type="button"
          onClick={handleExport}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-[10px] font-bold uppercase tracking-wider hover:bg-emerald-100 transition"
        >
          <Download size={14} /> Download Excel
        </button>
      </div>

      <div className="flex flex-wrap gap-2 px-1">
        {slotColumns.map((col) => (
          <span
            key={col.id}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100/80 border border-amber-200 text-[10px] font-bold text-amber-900 uppercase tracking-wide"
          >
            {col.name}
            <span className="text-amber-700/80 font-medium normal-case">
              · {columnTotals[col.id]?.qty || 0} pcs · {formatRwf(columnTotals[col.id]?.amount || 0)}
            </span>
          </span>
        ))}
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[min(560px,65vh)] overflow-y-auto">
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 z-20 bg-gray-50/98 backdrop-blur-sm">
              <tr className="text-[10px] font-bold uppercase text-gray-400 border-b border-gray-100">
                <th rowSpan={2} className="sticky left-0 z-30 bg-gray-50 p-3 text-left min-w-[96px] border-r border-gray-100 align-bottom">
                  Student code
                </th>
                <th rowSpan={2} className="sticky left-[96px] z-30 bg-gray-50 p-3 text-left min-w-[150px] border-r border-gray-100 align-bottom">
                  Student name
                </th>
                {slotColumns.map((col) => (
                  <th key={col.id} colSpan={1} className="p-2 text-center min-w-[124px] align-bottom border-l border-gray-100/80">
                    <div className="rounded-xl bg-white border border-gray-100 px-2 py-2 shadow-sm">
                      <p className="text-[11px] font-bold text-[#000435] normal-case tracking-normal">{col.name}</p>
                      <p className="text-[9px] text-gray-500 mt-1 font-semibold">
                        Σ Qty <span className="text-amber-700">{columnTotals[col.id]?.qty || 0}</span>
                        {' · '}
                        <span className="text-green-700">{formatRwf(columnTotals[col.id]?.amount || 0)}</span>
                      </p>
                      <button
                        type="button"
                        onClick={() => openConfigure({ bulk: true, slotId: col.id })}
                        className="mt-2 inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-50 text-amber-800 text-[9px] font-bold uppercase hover:bg-amber-100"
                      >
                        <Settings size={10} /> Apply all
                      </button>
                    </div>
                  </th>
                ))}
                <th rowSpan={2} className="p-3 text-right min-w-[72px] align-bottom border-l border-gray-100">Total qty</th>
                <th rowSpan={2} className="p-3 text-right min-w-[108px] align-bottom">Total amount</th>
                <th rowSpan={2} className="p-2 w-14 align-bottom" />
              </tr>
            </thead>
            <tbody>
              {students.map((st) => {
                const totals = rowTotals(st.id)
                const expanded = expandedId === st.id
                const code = st.student_code || st.student_uid
                return (
                  <Fragment key={st.id}>
                    <tr className="border-t border-gray-50 hover:bg-amber-50/15 transition-colors">
                      <td className="sticky left-0 z-10 bg-white p-3 text-xs font-mono font-bold text-[#000435] border-r border-gray-50">
                        {code}
                      </td>
                      <td className="sticky left-[96px] z-10 bg-white p-3 border-r border-gray-50">
                        <button
                          type="button"
                          onClick={() => setExpandedId(expanded ? null : st.id)}
                          className="flex items-center gap-1 text-xs font-bold text-[#000435] text-left hover:text-amber-700"
                        >
                          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                          {st.name}
                        </button>
                      </td>
                      {slotColumns.map((col) => (
                        <td key={col.id} className="p-2 align-top border-l border-gray-50/80">
                          <SlotCell
                            slot={getSlot(st.id, col.id)}
                            status={getCellStatus(st.id, col.id)}
                            onConfigure={() => openConfigure({ studentId: st.id, slotId: col.id })}
                          />
                        </td>
                      ))}
                      <td className="p-3 text-right text-xs font-bold text-gray-600 border-l border-gray-50">{totals.qty}</td>
                      <td className="p-3 text-right text-xs font-bold text-[#000435]">{formatRwf(totals.amount)}</td>
                      <td className="p-2">
                        <button type="button" title="Copy row" onClick={() => copyRow(st.id)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                          <Copy size={12} />
                        </button>
                        {clipboard && (
                          <button type="button" title="Paste" onClick={() => pasteRow(st.id)} className="text-[9px] font-bold text-amber-600 block mt-1">
                            Paste
                          </button>
                        )}
                      </td>
                    </tr>
                    {expanded && (
                      <tr className="bg-slate-50/60">
                        <td colSpan={slotColumns.length + 5} className="p-3">
                          <div className="flex flex-wrap gap-2">
                            {slotColumns.map((col) => {
                              const slot = getSlot(st.id, col.id)
                              if (!slot?.label_name) return null
                              return (
                                <div key={col.id} className="text-[10px] bg-white border border-gray-100 rounded-lg px-2.5 py-1.5 shadow-sm">
                                  <strong className="text-amber-800">{col.name}:</strong> {slot.label_name} · Qty {slot.quantity} · {formatRwf(slotTotal(slot))}
                                </div>
                              )
                            })}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
            <tfoot className="sticky bottom-0 z-10">
              <tr className="bg-[#000435] text-white text-xs">
                <td colSpan={2} className="p-3 font-bold uppercase tracking-wider">Grand totals</td>
                {slotColumns.map((col) => (
                  <td key={col.id} className="p-2 text-center border-l border-white/10">
                    <div className="text-[9px] opacity-80">{col.name}</div>
                    <div className="font-bold">{columnTotals[col.id]?.qty || 0} pcs</div>
                    <div className="text-[10px] text-amber-300">{formatRwf(columnTotals[col.id]?.amount || 0)}</div>
                  </td>
                ))}
                <td className="p-3 text-right font-bold border-l border-white/10">{footer.pieces}</td>
                <td className="p-3 text-right font-bold">{formatRwf(footer.value)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="grid grid-cols-3 gap-4 p-4 border-t border-gray-100 bg-gradient-to-r from-amber-50/40 to-white text-center text-xs">
          <div>
            <p className="text-gray-400 font-bold uppercase text-[10px]">Students</p>
            <p className="text-lg font-bold text-[#000435]">{footer.count}</p>
          </div>
          <div>
            <p className="text-gray-400 font-bold uppercase text-[10px]">Total pieces</p>
            <p className="text-lg font-bold text-[#000435]">{footer.pieces}</p>
          </div>
          <div>
            <p className="text-gray-400 font-bold uppercase text-[10px]">Total selling value</p>
            <p className="text-lg font-bold text-green-700">{formatRwf(footer.value)}</p>
          </div>
        </div>
      </div>

      {/* Manage slot column names */}
      <AnimatePresence>
        {showManageSlots && (
          <>
            <UniformModalBackdrop onClose={() => setShowManageSlots(false)} className="z-[60]" />
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-none"
            >
              <div
                className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-lg pointer-events-auto overflow-hidden max-h-[90vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                <UniformModalHeader
                  eyebrow="Slot layout"
                  title="Uniform slot columns"
                  subtitle="Name each column — Shirts, Trousers, Tie, etc."
                  icon={Layers}
                  onClose={() => setShowManageSlots(false)}
                />
                <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-3">
                  {manageDraft.map((col, idx) => (
                    <div key={col.id} className="flex items-center gap-2 rounded-2xl border border-gray-100 bg-gray-50/50 p-2">
                      <span className="w-8 h-8 rounded-xl bg-[#000435]/5 text-[#000435] text-xs font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <input
                        value={col.name}
                        onChange={(e) => setManageDraft((d) => d.map((c) => (c.id === col.id ? { ...c, name: e.target.value } : c)))}
                        placeholder="Column name"
                        className={modalInputClass}
                      />
                      <button
                        type="button"
                        disabled={manageDraft.length <= 1}
                        onClick={() => setManageDraft((d) => d.filter((c) => c.id !== col.id))}
                        className="p-2 rounded-xl text-red-400 hover:bg-red-50 disabled:opacity-30"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addManageSlotRow}
                    disabled={manageDraft.length >= 12}
                    className="w-full py-3 border-2 border-dashed border-gray-200 rounded-2xl text-xs font-bold uppercase text-gray-500 hover:border-amber-400 hover:text-amber-700 transition"
                  >
                    + Add column
                  </button>
                </div>
                <UniformModalFooter
                  onCancel={() => setShowManageSlots(false)}
                  onPrimary={saveManageSlots}
                  primaryLabel="Save columns"
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Configure slot / Apply all */}
      <AnimatePresence>
        {configureTarget && (
          <>
            <UniformModalBackdrop onClose={() => setConfigureTarget(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-none"
            >
              <div
                className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-lg pointer-events-auto overflow-hidden max-h-[92vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                <UniformModalHeader
                  eyebrow={configureTarget.bulk ? 'Configure uniform' : isEditingExistingSlot ? 'Edit uniform' : 'Add uniform'}
                  title={configureCol?.name || 'Slot'}
                  subtitle={
                    configureTarget.bulk
                      ? null
                      : configureStudent
                        ? `${configureStudent.student_code || configureStudent.student_uid} · ${configureStudent.name}`
                        : 'One student'
                  }
                  badge={
                    configureTarget.bulk
                      ? `Apply to all ${students.length} students`
                      : isEditingExistingSlot
                        ? 'Updating existing slot'
                        : 'New slot for student'
                  }
                  icon={configureTarget.bulk ? Users : isEditingExistingSlot ? Pencil : Shirt}
                  onClose={() => setConfigureTarget(null)}
                />

                <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
                  <section className="rounded-2xl border border-gray-100 bg-gray-50/50 p-4 space-y-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Item details</p>
                    <ModalField icon={Tag} label="Item label">
                      <select
                        value={form.preset}
                        onChange={(e) => setForm((f) => ({ ...f, preset: e.target.value }))}
                        className={modalInputClass}
                      >
                        <option value="">Select preset</option>
                        {UNIFORM_PRESET_ITEMS.map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </ModalField>
                    {form.preset === 'Other' && (
                      <input
                        placeholder="Specify item name"
                        value={form.custom_name}
                        onChange={(e) => setForm((f) => ({ ...f, custom_name: e.target.value }))}
                        className={modalInputClass}
                      />
                    )}
                    <ModalField icon={Package} label="Finished good (from stock)">
                      <select
                        value={form.finished_good_id}
                        onChange={(e) => {
                          const id = e.target.value
                          const fg = finishedGoods.find((g) => String(g.id) === id)
                          setForm((f) => ({
                            ...f,
                            finished_good_id: id,
                            unit_price: fg ? String(fg.selling_price ?? '') : f.unit_price,
                            preset: fg ? fg.uniform_name : f.preset || configureCol?.name || '',
                          }))
                        }}
                        className={modalInputClass}
                      >
                        <option value="">— No stock link —</option>
                        {finishedGoods.map((g) => {
                          const { remaining } = getFinishedGoodRemaining(g.id, stockUsage, finishedGoods, stockCredit)
                          return (
                            <option
                              key={g.id}
                              value={g.id}
                              disabled={remaining <= 0 && String(form.finished_good_id) !== String(g.id)}
                            >
                              {g.uniform_name} ({g.size}) — {remaining} available
                            </option>
                          )
                        })}
                      </select>
                    </ModalField>
                  </section>

                  <section className="rounded-2xl border border-gray-100 bg-white p-4 space-y-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Quantity & pricing</p>
                    <div className="grid grid-cols-2 gap-3">
                      <ModalField icon={Ruler} label="Qty per student">
                        <input
                          type="number"
                          min={1}
                          value={form.quantity}
                          onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                          className={`${modalInputClass} font-bold text-lg`}
                        />
                      </ModalField>
                      <ModalField icon={DollarSign} label="Unit price">
                        <input
                          type="number"
                          min={0}
                          value={form.unit_price}
                          onChange={(e) => setForm((f) => ({ ...f, unit_price: e.target.value }))}
                          className={`${modalInputClass} font-bold`}
                        />
                      </ModalField>
                    </div>
                  </section>

                  {form.finished_good_id && selectedFgRemaining && stockPreview && (
                    <section
                      className={`rounded-2xl border p-4 space-y-3 ${
                        stockPreview.ok ? 'bg-gradient-to-br from-emerald-50/90 to-white border-emerald-200/80' : 'bg-red-50 border-red-200'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-bold text-[#000435] flex items-center gap-1.5">
                          <Layers size={14} className={stockPreview.ok ? 'text-emerald-600' : 'text-red-500'} />
                          Stock preview
                        </p>
                        {!stockPreview.ok && (
                          <span className="text-[10px] font-bold uppercase text-red-600 bg-red-100 px-2 py-0.5 rounded-lg">
                            Insufficient
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { label: 'Warehouse', value: selectedFgRemaining.warehouse, tone: 'text-[#000435]' },
                          { label: 'Reserved', value: selectedFgRemaining.reserved, tone: 'text-gray-600' },
                          {
                            label: 'Adds now',
                            value: `+${liveReserveQty.add}`,
                            tone: 'text-amber-700',
                          },
                        ].map((stat) => (
                          <div key={stat.label} className="rounded-xl bg-white/80 border border-white px-2 py-2 text-center shadow-sm">
                            <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">{stat.label}</p>
                            <p className={`text-sm font-bold mt-0.5 ${stat.tone}`}>{stat.value}</p>
                          </div>
                        ))}
                      </div>
                      <div>
                        <div className="flex justify-between text-[10px] font-bold text-gray-500 mb-1">
                          <span>After this save</span>
                          <span className={stockPreview.remaining >= 0 ? 'text-emerald-700' : 'text-red-600'}>
                            {stockPreview.remaining} pcs left
                          </span>
                        </div>
                        <div className="h-2.5 bg-gray-200/80 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{
                              width: `${Math.min(100, Math.max(0, (stockPreview.remaining / Math.max(selectedFgRemaining.warehouse, 1)) * 100))}%`,
                            }}
                            className={`h-full rounded-full ${stockPreview.ok ? 'bg-emerald-500' : 'bg-red-500'}`}
                          />
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-500 leading-relaxed">
                        Quantities reserve here in the grid. Warehouse stock is deducted when you save the full distribution.
                      </p>
                    </section>
                  )}

                  {previewTotal && (
                    <div className="rounded-2xl bg-gradient-to-r from-amber-50 to-amber-100/50 border border-amber-200/80 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800/80">
                            {configureTarget.bulk ? 'Total for all students' : 'Line total'}
                          </p>
                          {configureTarget.bulk && (
                            <p className="text-[11px] text-amber-900/70 mt-0.5">
                              {formatNum(previewAmountPerStudent)} × {students.length} students
                            </p>
                          )}
                        </div>
                        <p className="text-xl font-bold text-[#000435] tabular-nums">{formatNum(previewAmount)}</p>
                      </div>
                    </div>
                  )}
                </div>

                <UniformModalFooter
                  onCancel={() => setConfigureTarget(null)}
                  onPrimary={saveConfigure}
                  primaryDisabled={!previewTotal || (stockPreview && !stockPreview.ok)}
                  primaryLabel={
                    configureTarget.bulk
                      ? `Apply to ${students.length} students`
                      : isEditingExistingSlot
                        ? 'Update slot'
                        : 'Save slot'
                  }
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

export function buildSlotPayload(students, slotMatrix, slotColumns) {
  return students
    .map((st) => {
      const slots = []
      slotColumns.forEach((col, idx) => {
        const slot = slotMatrix[st.id]?.[col.id]
        if (slot?.label_name && Number(slot.quantity) > 0) {
          slots.push({
            slot_number: idx + 1,
            slot_name: col.name,
            label_name: slot.label_name,
            finished_good_id: slot.finished_good_id ? Number(slot.finished_good_id) : null,
            quantity: Number(slot.quantity),
            unit_price: Number(slot.unit_price) || 0,
          })
        }
      })
      return slots.length ? { student_id: st.id, slots } : null
    })
    .filter(Boolean)
}

export function computeStockUsage(students, slotMatrix, slotColumns) {
  const map = new Map()
  for (const st of students) {
    for (const col of slotColumns) {
      const slot = slotMatrix[st.id]?.[col.id]
      const fgId = Number(slot?.finished_good_id)
      if (fgId && slot?.label_name) {
        map.set(fgId, (map.get(fgId) || 0) + (Number(slot.quantity) || 0))
      }
    }
  }
  return map
}

export function hasAnyConfiguredSlot(students, slotMatrix, slotColumns) {
  return students.some((st) => slotColumns.some((col) => slotMatrix[st.id]?.[col.id]?.label_name))
}

/** Restore grid state from the most recent saved issue for this class */
export function slotStateFromIssueDetail(detail) {
  const issueStudents = detail?.students || []
  const slotNumMap = new Map()

  for (const st of issueStudents) {
    for (const sl of st.slots || []) {
      const num = Number(sl.slot_number) || 0
      if (!num) continue
      if (!slotNumMap.has(num)) {
        const name = sl.slot_name || `Item ${num}`
        slotNumMap.set(num, {
          id: `slot-loaded-${num}-${name.replace(/\s+/g, '-').toLowerCase()}`,
          name,
        })
      }
    }
  }

  const slotColumns = [...slotNumMap.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([num, col]) => ({ ...col, slotNumber: num }))

  if (!slotColumns.length) {
    return {
      slotColumns: createDefaultSlotColumns(4),
      slotMatrix: {},
      studentIds: [],
      stockCredit: new Map(),
    }
  }

  const slotMatrix = {}
  const stockCredit = new Map()

  for (const st of issueStudents) {
    const sid = Number(st.student_id)
    if (!sid) continue
    if (!slotMatrix[sid]) slotMatrix[sid] = {}
    for (const sl of st.slots || []) {
      const num = Number(sl.slot_number) || 0
      const col = slotColumns.find((c) => c.slotNumber === num)
      if (!col) continue
      const fgId = sl.finished_good_id ? Number(sl.finished_good_id) : null
      const qty = Number(sl.quantity) || 0
      slotMatrix[sid][col.id] = {
        label_name: sl.label_name || '',
        finished_good_id: fgId,
        quantity: qty,
        unit_price: Number(sl.unit_price) || 0,
      }
      if (fgId && qty > 0) {
        stockCredit.set(fgId, (stockCredit.get(fgId) || 0) + qty)
      }
    }
  }

  const studentIds = issueStudents.map((s) => Number(s.student_id)).filter((id) => id > 0)
  return { slotColumns, slotMatrix, studentIds, stockCredit }
}

/** Grid student rows from saved issue (IDs match slot matrix keys) */
export function mapStudentsFromIssueDetail(detail) {
  return (detail?.students || [])
    .map((st) => ({
      id: Number(st.student_id),
      student_uid: st.student_uid || String(st.student_id || ''),
      student_code: st.student_uid || st.student_code || '',
      name: st.student_name || '',
    }))
    .filter((s) => s.id > 0)
}

/** Issue students first; merge class roster for adding more students */
export function mergeStudentsForIssueEdit(detail, rosterRows = []) {
  const fromIssue = mapStudentsFromIssueDetail(detail)
  const byId = new Map()
  fromIssue.forEach((s) => byId.set(s.id, s))
  ;(rosterRows || []).forEach((s) => {
    if (s?.id && !byId.has(s.id)) byId.set(s.id, s)
  })
  return {
    students: Array.from(byId.values()),
    selectedIds: fromIssue.map((s) => s.id),
  }
}
