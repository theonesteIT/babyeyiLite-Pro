import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Search, ArrowLeftRight, Plus, CheckCircle2, Clock, Ban, Truck,
  Eye, AlertCircle, Loader2,
} from 'lucide-react'
import assetsApi from '../../../assets_portal/services/assetsApi'
import { formatLocationValue } from '../../../assets_portal/utils/assetsCalculations'
import AssetTransferModal from '../components/AssetTransferModal'
import ViewTransferModal from '../components/ViewTransferModal'
import ExportExcelButton from '../components/ExportExcelButton'
import { exportTransfersToExcel } from '../../../assets_portal/utils/assetModuleExcelExport'

const FONT = "'Montserrat', sans-serif"

function normalizeTransfer(row) {
  return {
    id: row.id,
    asset: row.asset || 'Asset',
    assetCode: row.assetCode || row.asset_code || '',
    from: formatLocationValue(row.from) || row.from || '—',
    to: formatLocationValue(row.to) || row.to || '—',
    reason: row.reason || '—',
    status: row.status || 'Completed',
    date: row.date || row.transfer_date || '—',
    approvedBy: row.approvedBy || row.approved_by || '—',
    condition: row.condition || '—',
    notes: row.notes || '',
    dest_type: row.dest_type,
  }
}

function getStatusBadge(status) {
  const map = {
    Pending: 'bg-amber-100 text-amber-700',
    Completed: 'bg-emerald-100 text-emerald-700',
    Rejected: 'bg-red-100 text-red-700',
    'In Transit': 'bg-blue-100 text-blue-700',
  }
  return map[status] || 'bg-gray-100 text-gray-600'
}

export default function Transfers() {
  const [createOpen, setCreateOpen] = useState(false)
  const [viewOpen, setViewOpen] = useState(false)
  const [selected, setSelected] = useState(null)
  const [transfers, setTransfers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  const loadTransfers = useCallback(() => {
    setLoading(true)
    setError('')
    assetsApi.listTransfers()
      .then((rows) => {
        const list = Array.isArray(rows) ? rows : []
        setTransfers(list.map(normalizeTransfer))
      })
      .catch((err) => {
        setTransfers([])
        setError(err.message || 'Failed to load transfers')
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadTransfers()
  }, [loadTransfers])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return transfers
    return transfers.filter((t) =>
      t.asset.toLowerCase().includes(q)
      || t.assetCode.toLowerCase().includes(q)
      || String(t.from).toLowerCase().includes(q)
      || String(t.to).toLowerCase().includes(q)
      || String(t.reason).toLowerCase().includes(q),
    )
  }, [transfers, search])

  const completedCount = transfers.filter((t) => t.status === 'Completed').length
  const pendingCount = transfers.filter((t) => t.status === 'Pending').length
  const inTransitCount = transfers.filter((t) => t.status === 'In Transit').length

  const openView = (row) => {
    setSelected(row)
    setViewOpen(true)
  }

  return (
    <div className="space-y-6" style={{ fontFamily: FONT }}>
      <AssetTransferModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={loadTransfers}
      />

      <ViewTransferModal
        open={viewOpen}
        onClose={() => { setViewOpen(false); setSelected(null) }}
        transfer={selected}
      />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-navy">Asset Transfers</h2>
          <p className="text-gray-500 text-sm mt-1 font-medium">
            Move assets between departments, locations, and staff
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="btn-primary flex items-center gap-2 shadow-lg shadow-amber-500/20"
        >
          <Plus size={18} /> New Transfer
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
          <p className="text-2xl font-bold text-navy">{transfers.length}</p>
          <p className="text-xs text-gray-500 font-medium">Total Transfers</p>
        </div>
        <div className="card py-4 px-5">
          <p className="text-2xl font-bold text-emerald-600">{completedCount}</p>
          <p className="text-xs text-gray-500 font-medium">Completed</p>
        </div>
        <div className="card py-4 px-5">
          <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
          <p className="text-xs text-gray-500 font-medium">Pending</p>
        </div>
        <div className="card py-4 px-5">
          <p className="text-2xl font-bold text-blue-600">{inTransitCount}</p>
          <p className="text-xs text-gray-500 font-medium">In Transit</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search transfers..."
              className="input-field pl-10 text-sm w-full"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <ExportExcelButton
              count={filtered.length}
              disabled={!filtered.length}
              onClick={() => exportTransfersToExcel(filtered)}
            />
            <div className="flex items-center gap-3 text-xs text-gray-500 font-medium">
              <Clock size={14} className="text-amber-500" />
              {loading ? 'Loading…' : 'Synced with school register'}
              <button
                type="button"
                onClick={loadTransfers}
                className="text-amber-600 hover:text-amber-700 font-semibold"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto min-h-[200px]">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-400 gap-2">
              <Loader2 size={22} className="animate-spin" />
              Loading transfers…
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="table-header">Asset</th>
                  <th className="table-header">From</th>
                  <th className="table-header">To</th>
                  <th className="table-header">Reason</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Date</th>
                  <th className="table-header">Approved By</th>
                  <th className="table-header w-20">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                    <td className="table-cell font-medium text-navy">
                      {t.asset}
                      <br />
                      <span className="text-xs text-gray-400 font-mono">{t.assetCode}</span>
                    </td>
                    <td className="table-cell text-sm max-w-[200px] truncate" title={t.from}>{t.from}</td>
                    <td className="table-cell text-sm max-w-[200px] truncate" title={t.to}>{t.to}</td>
                    <td className="table-cell text-sm text-gray-500">{t.reason}</td>
                    <td className="table-cell">
                      <span className={`badge text-[10px] ${getStatusBadge(t.status)}`}>{t.status}</span>
                    </td>
                    <td className="table-cell text-sm">{t.date}</td>
                    <td className="table-cell text-sm">{t.approvedBy}</td>
                    <td className="table-cell">
                      <button
                        type="button"
                        onClick={() => openView(t)}
                        className="p-1.5 hover:bg-amber-50 rounded-lg text-amber-600 transition-all"
                        title="View transfer"
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
            No transfers yet. Record one to get started.
          </div>
        )}
      </div>

      {!loading && transfers.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-base font-bold text-navy flex items-center gap-2 mb-4">
            <Truck size={18} className="text-amber-500" /> Recent Activity
          </h3>
          <div className="space-y-4">
            {transfers.slice(0, 5).map((t) => (
              <div key={t.id} className="flex items-start gap-3 text-sm border-b border-gray-50 last:border-0 pb-4 last:pb-0">
                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                  t.status === 'Completed' ? 'bg-emerald-500'
                    : t.status === 'Pending' ? 'bg-amber-500'
                      : t.status === 'Rejected' ? 'bg-red-500' : 'bg-blue-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-navy truncate">
                    {t.asset}
                    <span className={`badge text-[10px] ml-2 ${getStatusBadge(t.status)}`}>{t.status}</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">
                    {t.from} <span className="text-amber-500">→</span> {t.to}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{t.date} · {t.reason}</p>
                </div>
                <button
                  type="button"
                  onClick={() => openView(t)}
                  className="text-xs text-amber-600 hover:text-amber-700 font-medium shrink-0"
                >
                  View
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
