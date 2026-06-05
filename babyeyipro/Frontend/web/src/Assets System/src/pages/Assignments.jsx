import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, Eye, ArrowLeftRight, Clock, AlertCircle, Loader2 } from 'lucide-react'
import AssetAssignmentModal from '../components/AssetAssignmentModal'
import ViewAssignmentModal from '../components/ViewAssignmentModal'
import ReturnAssetModal from '../components/ReturnAssetModal'
import MaintenanceRequestModal from '../components/MaintenanceRequestModal'
import ExportExcelButton from '../components/ExportExcelButton'
import assetsApi from '../../../assets_portal/services/assetsApi'
import { exportAssignmentsToExcel } from '../../../assets_portal/utils/assetModuleExcelExport'
import { normalizeAssignment } from '../../../assets_portal/utils/assignmentHelpers'

const FONT = "'Montserrat', sans-serif"

export default function Assignments() {
  const [createOpen, setCreateOpen] = useState(false)
  const [viewOpen, setViewOpen] = useState(false)
  const [returnOpen, setReturnOpen] = useState(false)
  const [maintOpen, setMaintOpen] = useState(false)
  const [selected, setSelected] = useState(null)
  const [search, setSearch] = useState('')
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadAssignments = useCallback(() => {
    setLoading(true)
    setError('')
    assetsApi.listAssignments()
      .then((rows) => setAssignments((Array.isArray(rows) ? rows : []).map(normalizeAssignment)))
      .catch((err) => {
        setError(err.message || 'Failed to load assignments')
        setAssignments([])
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadAssignments()
  }, [loadAssignments])

  const filtered = assignments.filter((a) => {
    const q = search.toLowerCase()
    return (
      (a.asset || '').toLowerCase().includes(q) ||
      (a.assignedTo || '').toLowerCase().includes(q) ||
      (a.department || '').toLowerCase().includes(q) ||
      (a.assetCode || '').toLowerCase().includes(q)
    )
  })

  const overdueCount = assignments.filter((a) => a.status === 'Overdue').length
  const activeCount = assignments.filter((a) => a.status === 'Active').length

  const openView = (row) => {
    setSelected(row)
    setViewOpen(true)
  }

  const openReturn = (row) => {
    setSelected(row || selected)
    setViewOpen(false)
    setReturnOpen(true)
  }

  const openMaintenance = (row) => {
    setSelected(row || selected)
    setViewOpen(false)
    setMaintOpen(true)
  }

  return (
    <div className="space-y-6" style={{ fontFamily: FONT }}>
      <AssetAssignmentModal open={createOpen} onClose={() => setCreateOpen(false)} onSuccess={loadAssignments} />

      <ViewAssignmentModal
        open={viewOpen}
        onClose={() => { setViewOpen(false); setSelected(null) }}
        assignment={selected}
        onReturn={() => openReturn(selected)}
        onMaintenance={() => openMaintenance(selected)}
      />

      <ReturnAssetModal
        open={returnOpen}
        onClose={() => setReturnOpen(false)}
        assignment={selected}
        onSuccess={loadAssignments}
      />

      <MaintenanceRequestModal
        open={maintOpen}
        onClose={() => setMaintOpen(false)}
        assignment={selected}
        onSuccess={loadAssignments}
      />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-navy">Asset Assignments</h2>
          <p className="text-gray-500 text-sm mt-1 font-medium">Assign assets to staff, individuals, or locations</p>
        </div>
        <button type="button" onClick={() => setCreateOpen(true)} className="btn-primary flex items-center gap-2 shadow-lg shadow-amber-500/20">
          <Plus size={18} /> New Assignment
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card py-4 px-5">
          <p className="text-2xl font-bold text-navy">{assignments.length}</p>
          <p className="text-xs text-gray-500 font-medium">Total Assignments</p>
        </div>
        <div className="card py-4 px-5">
          <p className="text-2xl font-bold text-emerald-600">{activeCount}</p>
          <p className="text-xs text-gray-500 font-medium">Active</p>
        </div>
        <div className="card py-4 px-5">
          <p className="text-2xl font-bold text-amber-600">{overdueCount}</p>
          <p className="text-xs text-gray-500 font-medium">Overdue</p>
        </div>
        <div className="card py-4 px-5">
          <p className="text-2xl font-bold text-blue-600">
            {assignments.filter((a) => a.condition === 'Excellent').length}
          </p>
          <p className="text-xs text-gray-500 font-medium">Excellent Condition</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search assignments..."
              className="input-field pl-10 text-sm w-full"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <ExportExcelButton
              count={filtered.length}
              disabled={!filtered.length}
              onClick={() => exportAssignmentsToExcel(filtered)}
            />
            <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
              <Clock size={14} className="text-amber-500" />
              {loading ? 'Loading…' : 'Synced with school register'}
            </div>
          </div>
        </div>
        <div className="overflow-x-auto min-h-[200px]">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-400 gap-2">
              <Loader2 size={22} className="animate-spin" />
              Loading assignments…
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="table-header">Asset</th>
                  <th className="table-header">Assigned To</th>
                  <th className="table-header">Department</th>
                  <th className="table-header">Date</th>
                  <th className="table-header">Expected Return</th>
                  <th className="table-header">Condition</th>
                  <th className="table-header">Status</th>
                  <th className="table-header w-20">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                    <td className="table-cell font-medium text-navy">
                      {a.asset}
                      <br />
                      <span className="text-xs text-gray-400 font-mono">{a.assetCode}</span>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-amber-100 rounded-full flex items-center justify-center text-xs font-bold text-amber-700">
                          {(a.assignedTo || '?').split(' ').map((w) => w[0]).join('').slice(0, 2)}
                        </div>
                        <span>{a.assignedTo}</span>
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className="bg-gray-100 text-gray-600 text-xs font-medium px-2 py-0.5 rounded">
                        {a.department || '—'}
                      </span>
                    </td>
                    <td className="table-cell text-sm">{a.date}</td>
                    <td className="table-cell text-sm">{a.expectedReturn || '—'}</td>
                    <td className="table-cell">
                      <span
                        className={`badge text-[10px] ${
                          a.condition === 'Excellent'
                            ? 'bg-emerald-100 text-emerald-700'
                            : a.condition === 'Good'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {a.condition}
                      </span>
                    </td>
                    <td className="table-cell">
                      <span
                        className={`badge text-[10px] ${
                          a.status === 'Active'
                            ? 'bg-emerald-100 text-emerald-700'
                            : a.status === 'Overdue'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {a.status}
                      </span>
                    </td>
                    <td className="table-cell">
                      <button
                        type="button"
                        onClick={() => openView(a)}
                        className="p-1.5 hover:bg-amber-50 rounded-lg text-amber-600 transition-all"
                        title="View assignment"
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {!loading && filtered.length === 0 && (
          <div className="py-12 text-center text-gray-400 text-sm flex flex-col items-center gap-2">
            <ArrowLeftRight size={28} className="opacity-30" />
            No assignments yet. Create one to get started.
          </div>
        )}
      </div>
    </div>
  )
}
