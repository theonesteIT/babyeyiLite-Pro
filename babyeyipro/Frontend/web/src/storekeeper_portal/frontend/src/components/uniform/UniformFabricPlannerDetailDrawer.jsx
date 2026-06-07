import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Edit2, Trash2, FileSpreadsheet, FileText, Users, Layers, Ruler,
  Shirt, Package, Loader2, AlertCircle, CheckCircle2, Clock,
} from 'lucide-react'
import { fetchFabricPlanDetail } from '../../services/fabricPlannerService'
import {
  exportFabricPlannerPlanDetailExcel,
  exportFabricPlannerPlanDetailPdf,
} from '../../utils/fabricPlannerExport'

const STATUS_STYLES = {
  draft: 'bg-gray-100 text-[#000435]',
  approved: 'bg-blue-50 text-blue-700',
  in_production: 'bg-amber-50 text-amber-800',
  completed: 'bg-emerald-50 text-emerald-700',
  distributed: 'bg-purple-50 text-purple-700',
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between gap-3 py-2 border-b border-gray-50 text-sm">
      <span className="text-[#000435]/60 font-medium shrink-0">{label}</span>
      <span className="font-bold text-[#000435] text-right">{value ?? '—'}</span>
    </div>
  )
}

export default function UniformFabricPlannerDetailDrawer({
  planId,
  open,
  onClose,
  onEdit,
  onDelete,
}) {
  const [plan, setPlan] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open || !planId) return
    setLoading(true)
    setError('')
    fetchFabricPlanDetail(planId)
      .then(setPlan)
      .catch((e) => setError(e.message || 'Failed to load plan'))
      .finally(() => setLoading(false))
  }, [open, planId])

  if (!open) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[85] flex justify-end">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-[#000435]/50 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.aside
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          className="relative w-full max-w-md sm:max-w-lg h-full bg-white shadow-2xl flex flex-col overflow-hidden"
        >
          <div className="shrink-0 px-5 py-5 bg-gradient-to-br from-[#000435] to-[#1a2876] text-white">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#FEBF10]">Production plan</p>
                <h2 className="text-lg font-bold mt-0.5 truncate">{plan?.planNo || 'Loading…'}</h2>
                {plan && (
                  <span className={`inline-block mt-2 text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg ${STATUS_STYLES[plan.status] || STATUS_STYLES.draft}`}>
                    {plan.status?.replace('_', ' ')}
                  </span>
                )}
              </div>
              <button type="button" onClick={onClose} className="p-2 rounded-xl bg-white/10 hover:bg-white/20">
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
            {loading && (
              <div className="flex justify-center py-16 text-gray-400 gap-2">
                <Loader2 className="animate-spin" size={20} /> Loading plan…
              </div>
            )}
            {error && (
              <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2">
                <AlertCircle size={14} /> {error}
              </div>
            )}
            {plan && !loading && (
              <>
                <section className="rounded-2xl border border-gray-100 p-4 bg-white">
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#000435] mb-3 flex items-center gap-2">
                    <Layers size={12} className="text-amber-500" /> Fabric
                  </h3>
                  <InfoRow label="Fabric roll" value={plan.fabricRollName || plan.fabricType} />
                  <InfoRow label="Available" value={plan.availableFabric != null ? `${plan.availableFabric} m` : '—'} />
                  <InfoRow label="Required" value={`${plan.requiredFabric || 0} m`} />
                  <InfoRow label="Reserved" value={`${plan.reservedFabric || 0} m`} />
                  <InfoRow label="Remaining" value={`${plan.remainingFabric || 0} m`} />
                  <InfoRow label="Supplier" value={plan.supplierName} />
                  <InfoRow label="Cost / meter" value={plan.costPerMeter ? `${Number(plan.costPerMeter).toLocaleString()} RWF` : '—'} />
                  <InfoRow label="Waste allowance" value={plan.wasteAllowance != null ? `${plan.wasteAllowance}%` : '—'} />
                </section>

                <section className="rounded-2xl border border-gray-100 p-4">
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#000435] mb-3 flex items-center gap-2">
                    <Users size={12} className="text-amber-500" /> Classes & students
                  </h3>
                  <p className="text-2xl font-bold text-[#000435] tabular-nums">{plan.students}</p>
                  <p className="text-[10px] text-[#000435]/50 mb-2">Total students</p>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {(plan.classDetails || []).map((c) => (
                      <div key={c.className} className="flex justify-between text-xs">
                        <span className="font-bold text-[#000435]">{c.className}</span>
                        <span className="text-[#000435]/60">{c.studentCount}</span>
                      </div>
                    ))}
                  </div>
                  <InfoRow label="Academic year" value={plan.academicYear} />
                  <InfoRow label="Term" value={plan.term || 'All Year'} />
                </section>

                <section className="rounded-2xl border border-gray-100 p-4">
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#000435] mb-3 flex items-center gap-2">
                    <Shirt size={12} className="text-amber-500" /> Uniform items
                  </h3>
                  {(plan.items || []).length ? (
                    <div className="space-y-2">
                      {plan.items.map((it) => (
                        <div key={it.name} className="flex justify-between items-center rounded-xl bg-amber-50/50 px-3 py-2 text-xs">
                          <span className="font-bold text-[#000435]">{it.name}</span>
                          <span className="text-[#000435]/70">{it.quantity} pcs · {it.metersPerChild}m</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-[#000435]/40">No items</p>
                  )}
                </section>

                {(plan.consumptionRecords || []).length > 0 && (
                  <section className="rounded-2xl border border-gray-100 p-4">
                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#000435] mb-3 flex items-center gap-2">
                      <Package size={12} className="text-amber-500" /> Distribution
                    </h3>
                    {plan.consumptionRecords.map((r) => (
                      <div key={r.id} className="flex justify-between text-xs py-1.5 border-b border-gray-50">
                        <span className="font-bold text-[#000435]">{r.uniform}</span>
                        <span className="text-[#000435]/60">Prod {r.produced} · Dist {r.distributed}</span>
                      </div>
                    ))}
                  </section>
                )}

                <div className="flex items-center gap-2 text-[10px] text-[#000435]/50">
                  <Clock size={12} />
                  Created {plan.createdAt ? new Date(plan.createdAt).toLocaleString() : '—'}
                </div>
              </>
            )}
          </div>

          {plan && (
            <div className="shrink-0 px-5 py-4 border-t border-gray-100 bg-gray-50/80 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => exportFabricPlannerPlanDetailExcel(plan)}
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-[10px] font-bold uppercase hover:bg-emerald-100"
                >
                  <FileSpreadsheet size={14} /> Excel
                </button>
                <button
                  type="button"
                  onClick={() => exportFabricPlannerPlanDetailPdf(plan)}
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-red-200 bg-red-50 text-red-800 text-[10px] font-bold uppercase hover:bg-red-100"
                >
                  <FileText size={14} /> PDF
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onEdit?.(plan)}
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-amber-400 text-[#000435] text-[10px] font-bold uppercase hover:bg-amber-500"
                >
                  <Edit2 size={14} /> Edit
                </button>
                <button
                  type="button"
                  onClick={() => onDelete?.(plan)}
                  disabled={plan.status !== 'draft'}
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-red-200 text-red-600 text-[10px] font-bold uppercase hover:bg-red-50 disabled:opacity-40"
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </div>
          )}
        </motion.aside>
      </div>
    </AnimatePresence>
  )
}
