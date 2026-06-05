import { useState, useEffect, useCallback } from 'react'
import { Undo2, Search, Loader2, AlertCircle } from 'lucide-react'
import ReturnAssetModal from '../components/ReturnAssetModal'
import ExportExcelButton from '../components/ExportExcelButton'
import assetsApi from '../../../assets_portal/services/assetsApi'
import { exportReturnsToExcel } from '../../../assets_portal/utils/assetModuleExcelExport'
import { normalizeAssignment } from '../../../assets_portal/utils/assignmentHelpers'

const FONT = "'Montserrat', sans-serif"

export default function Returns() {
  const [returnOpen, setReturnOpen] = useState(false)
  const [selected, setSelected] = useState(null)
  const [search, setSearch] = useState('')
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    assetsApi.listAssignments()
      .then((rows) => {
        const list = (Array.isArray(rows) ? rows : []).map(normalizeAssignment)
        setAssignments(list.filter((a) => a.status === 'Active' || a.status === 'Overdue'))
      })
      .catch((err) => {
        setError(err.message || 'Failed to load')
        setAssignments([])
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filtered = assignments.filter((a) => {
    const q = search.toLowerCase()
    return (
      (a.asset || '').toLowerCase().includes(q) ||
      (a.assignedTo || '').toLowerCase().includes(q) ||
      (a.assetCode || '').toLowerCase().includes(q)
    )
  })

  const openReturn = (row) => {
    setSelected(row)
    setReturnOpen(true)
  }

  return (
    <div className="space-y-6" style={{ fontFamily: FONT }}>
      <ReturnAssetModal
        open={returnOpen}
        onClose={() => { setReturnOpen(false); setSelected(null) }}
        assignment={selected}
        onSuccess={load}
      />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-navy">Asset Returns</h2>
          <p className="text-gray-500 text-sm mt-1 font-medium">Receive and process returned assets</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search active assignments..."
              className="input-field pl-10 text-sm w-full"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <ExportExcelButton
            count={filtered.length}
            disabled={!filtered.length}
            label="Export Returns"
            onClick={() => exportReturnsToExcel(filtered)}
          />
        </div>
        <div className="overflow-x-auto min-h-[180px]">
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-2 text-gray-400">
              <Loader2 className="animate-spin" size={22} />
              Loading…
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="table-header">Asset</th>
                  <th className="table-header">Assigned To</th>
                  <th className="table-header">Department</th>
                  <th className="table-header">Assigned Date</th>
                  <th className="table-header">Expected Return</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="table-cell font-medium text-navy">
                      {a.asset}
                      <br />
                      <span className="text-xs text-gray-400 font-mono">{a.assetCode}</span>
                    </td>
                    <td className="table-cell">{a.assignedTo}</td>
                    <td className="table-cell">{a.department}</td>
                    <td className="table-cell text-sm">{a.date}</td>
                    <td className="table-cell text-sm">{a.expectedReturn || '—'}</td>
                    <td className="table-cell">
                      <span className={`badge text-[10px] ${a.status === 'Overdue' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="table-cell">
                      <button type="button" onClick={() => openReturn(a)} className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1">
                        <Undo2 size={14} /> Return
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {!loading && filtered.length === 0 && (
          <p className="py-12 text-center text-sm text-gray-400 font-medium">No active assignments to return.</p>
        )}
      </div>
    </div>
  )
}
