import { useCallback, useEffect, useState } from 'react'
import {
  Search, Eye, Edit2, Trash2, FileSpreadsheet, FileText, Loader2,
  AlertCircle, Plus, Filter,
} from 'lucide-react'
import {
  fetchFabricPlannerPlans,
  deleteFabricPlan,
} from '../../services/fabricPlannerService'
import {
  exportFabricPlannerPlansExcel,
  exportFabricPlannerPlansPdf,
} from '../../utils/fabricPlannerExport'
import UniformFabricPlannerDetailDrawer from './UniformFabricPlannerDetailDrawer'

const STATUS_STYLES = {
  draft: 'bg-gray-100 text-[#000435]',
  approved: 'bg-blue-50 text-blue-700',
  in_production: 'bg-amber-50 text-amber-800',
  completed: 'bg-emerald-50 text-emerald-700',
  distributed: 'bg-purple-50 text-purple-700',
}

const STATUS_OPTIONS = ['', 'draft', 'approved', 'in_production', 'completed', 'distributed']

export default function UniformFabricPlannerReports({
  academicYear,
  onNewPlan,
  onEditPlan,
  onRefresh,
}) {
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedPlanId, setSelectedPlanId] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  const loadPlans = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const rows = await fetchFabricPlannerPlans({
        academicYear,
        status: statusFilter || undefined,
      })
      setPlans(rows)
    } catch (e) {
      setError(e.message || 'Failed to load plans')
    } finally {
      setLoading(false)
    }
  }, [academicYear, statusFilter])

  useEffect(() => {
    loadPlans()
  }, [loadPlans])

  const filtered = plans.filter((p) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return (
      String(p.planNo || '').toLowerCase().includes(q)
      || String(p.fabricType || p.fabricRollName || '').toLowerCase().includes(q)
      || String(p.supplierName || '').toLowerCase().includes(q)
      || String(p.status || '').toLowerCase().includes(q)
    )
  })

  const openDetail = (id) => {
    setSelectedPlanId(id)
    setDrawerOpen(true)
  }

  const handleDelete = async (plan) => {
    if (!window.confirm(`Delete plan ${plan.planNo}?`)) return
    setDeletingId(plan.id)
    try {
      await deleteFabricPlan(plan.id)
      setDrawerOpen(false)
      loadPlans()
      onRefresh?.()
    } catch (e) {
      setError(e.message)
    } finally {
      setDeletingId(null)
    }
  }

  const handleEdit = (plan) => {
    setDrawerOpen(false)
    onEditPlan?.(plan)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-[#000435]">Production plans report</h3>
          <p className="text-[11px] text-[#000435]/50 mt-0.5">{filtered.length} plan{filtered.length === 1 ? '' : 's'}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => exportFabricPlannerPlansExcel(filtered, academicYear)}
            disabled={!filtered.length}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-[10px] font-bold uppercase hover:bg-emerald-100 disabled:opacity-40"
          >
            <FileSpreadsheet size={14} /> Excel
          </button>
          <button
            type="button"
            onClick={() => exportFabricPlannerPlansPdf(filtered, academicYear)}
            disabled={!filtered.length}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 bg-red-50 text-red-800 text-[10px] font-bold uppercase hover:bg-red-100 disabled:opacity-40"
          >
            <FileText size={14} /> PDF
          </button>
          <button
            type="button"
            onClick={onNewPlan}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#000435] text-white text-[10px] font-bold uppercase hover:bg-[#000435]/90"
          >
            <Plus size={14} /> New plan
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#000435]/30" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search plan, fabric, supplier…"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm text-[#000435] bg-white focus:border-amber-400 outline-none"
          />
        </div>
        <div className="relative">
          <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#000435]/30" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="pl-9 pr-8 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-[#000435] bg-white appearance-none"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s || 'all'} value={s}>{s ? s.replace('_', ' ') : 'All statuses'}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="bg-gray-50/90 border-b border-gray-100">
                {['Plan', 'Fabric', 'Supplier', 'Students', 'Required', 'Reserved', 'Status', 'Created', 'Actions'].map((h) => (
                  <th key={h} className="text-left py-3.5 px-4 text-[10px] font-bold text-[#000435]/50 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-[#000435]/40">
                    <Loader2 size={20} className="animate-spin inline mr-2" /> Loading plans…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-[#000435]/40 text-xs">No production plans found</td>
                </tr>
              ) : (
                filtered.map((plan) => (
                  <tr
                    key={plan.id}
                    className="border-b border-gray-50 hover:bg-amber-50/30 cursor-pointer transition-colors"
                    onClick={() => openDetail(plan.id)}
                  >
                    <td className="py-3.5 px-4 text-xs font-bold text-[#000435] whitespace-nowrap">{plan.planNo}</td>
                    <td className="py-3.5 px-4 text-xs text-[#000435]">{plan.fabricRollName || plan.fabricType || '—'}</td>
                    <td className="py-3.5 px-4 text-xs text-[#000435]/70">{plan.supplierName || '—'}</td>
                    <td className="py-3.5 px-4 text-xs font-bold text-[#000435] tabular-nums">{plan.students}</td>
                    <td className="py-3.5 px-4 text-xs font-bold text-amber-600 tabular-nums whitespace-nowrap">{plan.requiredFabric ? `${plan.requiredFabric} m` : '—'}</td>
                    <td className="py-3.5 px-4 text-xs text-[#000435] tabular-nums whitespace-nowrap">{plan.reservedFabric ? `${plan.reservedFabric} m` : '—'}</td>
                    <td className="py-3.5 px-4">
                      <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg whitespace-nowrap ${STATUS_STYLES[plan.status] || STATUS_STYLES.draft}`}>
                        {plan.status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-[10px] text-[#000435]/50 whitespace-nowrap">
                      {plan.createdAt ? new Date(plan.createdAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <button type="button" title="View" onClick={() => openDetail(plan.id)} className="p-1.5 rounded-lg hover:bg-amber-100 text-amber-600">
                          <Eye size={14} />
                        </button>
                        <button type="button" title="Edit" onClick={() => handleEdit(plan)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600">
                          <Edit2 size={14} />
                        </button>
                        <button
                          type="button"
                          title="Delete"
                          disabled={plan.status !== 'draft' || deletingId === plan.id}
                          onClick={() => handleDelete(plan)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 disabled:opacity-30"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <UniformFabricPlannerDetailDrawer
        planId={selectedPlanId}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  )
}
