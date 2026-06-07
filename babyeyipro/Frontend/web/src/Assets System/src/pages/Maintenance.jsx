import { useState, useEffect, useCallback, useMemo } from 'react'
import { Wrench, Plus, Search, Loader2, AlertCircle, CalendarClock } from 'lucide-react'
import MaintenanceRequestModal from '../components/MaintenanceRequestModal'
import ExtendMaintenanceModal from '../components/ExtendMaintenanceModal'
import MaintenanceScheduleCalendar from '../components/MaintenanceScheduleCalendar'
import ExportExcelButton from '../components/ExportExcelButton'
import assetsApi from '../../../assets_portal/services/assetsApi'
import { exportMaintenanceToExcel } from '../../../assets_portal/utils/assetModuleExcelExport'
import { localTodayIso, normalizeDateOnly, formatDateDisplay, isMaintenanceExtendable } from '../../../assets_portal/utils/assetsDateUtils'

const NAVY = '#000435'
const FONT = "'Montserrat', sans-serif"

function todayKey() {
  return localTodayIso()
}

export default function Maintenance() {
  const [modalOpen, setModalOpen] = useState(false)
  const [extendOpen, setExtendOpen] = useState(false)
  const [extendRecord, setExtendRecord] = useState(null)
  const [selectedAssignment, setSelectedAssignment] = useState(null)
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [selectedDate, setSelectedDate] = useState(todayKey())

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    assetsApi.listMaintenance()
      .then((rows) => setRecords(Array.isArray(rows) ? rows : []))
      .catch((err) => {
        setError(err.message || 'Failed to load maintenance records')
        setRecords([])
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const stats = [
    { label: 'Scheduled', value: records.filter((r) => r.status === 'Scheduled').length, color: 'bg-amber-500' },
    { label: 'Ongoing', value: records.filter((r) => r.status === 'Ongoing').length, color: 'bg-blue-500' },
    { label: 'Completed', value: records.filter((r) => r.status === 'Completed').length, color: 'bg-emerald-500' },
    { label: 'Overdue', value: records.filter((r) => r.status === 'Overdue').length, color: 'bg-red-500' },
  ]

  const tableRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return records.filter((r) => {
      const start = normalizeDateOnly(r.start_date || r.date)
      const end = normalizeDateOnly(r.end_date)
      if (q) {
        return (
          (r.asset || '').toLowerCase().includes(q)
          || (r.problem || r.description || '').toLowerCase().includes(q)
          || (r.technician || '').toLowerCase().includes(q)
        )
      }
      if (selectedDate) {
        return start === selectedDate || end === selectedDate
      }
      return true
    })
  }, [records, search, selectedDate])

  return (
    <div className="space-y-6 min-h-0" style={{ fontFamily: FONT }}>
      <MaintenanceRequestModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setSelectedAssignment(null) }}
        assignment={selectedAssignment}
        onSuccess={load}
      />
      <ExtendMaintenanceModal
        open={extendOpen}
        onClose={() => { setExtendOpen(false); setExtendRecord(null) }}
        record={extendRecord}
        onSuccess={load}
      />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: NAVY }}>Maintenance Management</h2>
          <p className="text-gray-500 text-sm mt-1 font-medium">Track repairs, schedule servicing, and view the maintenance calendar</p>
        </div>
        <button
          type="button"
          onClick={() => { setSelectedAssignment(null); setModalOpen(true) }}
          className="btn-primary flex items-center gap-2 shadow-lg shadow-amber-500/20"
        >
          <Plus size={18} /> Add Maintenance
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3 font-medium">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <div key={i} className="card">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${s.color}`} />
              <p className="text-sm text-gray-500 font-medium">{s.label}</p>
            </div>
            <p className="text-2xl font-bold mt-2" style={{ color: NAVY }}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        <div className="xl:col-span-2 order-2 xl:order-1">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold" style={{ color: NAVY }}>Maintenance Records</h3>
                {selectedDate && !search.trim() && (
                  <p className="text-xs text-gray-500 mt-0.5 font-medium">
                    Showing tickets for {formatDateDisplay(selectedDate)}
                    <button
                      type="button"
                      className="ml-2 text-amber-600 hover:underline"
                      onClick={() => setSelectedDate(null)}
                    >
                      Show all
                    </button>
                  </p>
                )}
              </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-48">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search records..."
                  className="input-field pl-9 text-sm py-1.5 w-full"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <ExportExcelButton
                count={tableRows.length}
                disabled={!tableRows.length}
                onClick={() => exportMaintenanceToExcel(tableRows)}
              />
            </div>
            </div>
            <div className="overflow-x-auto min-h-[240px]">
              {loading ? (
                <div className="flex items-center justify-center py-16 gap-2 text-gray-400 font-medium">
                  <Loader2 className="animate-spin" size={22} />
                  Loading…
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="table-header">Asset</th>
                      <th className="table-header">Problem</th>
                      <th className="table-header">Technician</th>
                      <th className="table-header">Cost (RWF)</th>
                      <th className="table-header">Start</th>
                      <th className="table-header">End</th>
                      <th className="table-header">Status</th>
                      <th className="table-header w-28">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {tableRows.map((r) => (
                      <tr key={r.id} className="hover:bg-amber-50/30 transition-colors">
                        <td className="table-cell font-semibold" style={{ color: NAVY }}>{r.asset}</td>
                        <td className="table-cell max-w-[200px] truncate">{r.problem || r.description}</td>
                        <td className="table-cell">{r.technician}</td>
                        <td className="table-cell tabular-nums font-medium">
                          {r.cost != null ? Number(r.cost).toLocaleString() : '—'}
                        </td>
                        <td className="table-cell text-sm">{formatDateDisplay(r.date || r.start_date) || '—'}</td>
                        <td className="table-cell text-sm">{formatDateDisplay(r.end_date) || '—'}</td>
                        <td className="table-cell">
                          <span
                            className={`badge text-[10px] font-semibold ${
                              r.status === 'Completed'
                                ? 'bg-emerald-100 text-emerald-700'
                                : r.status === 'Ongoing'
                                  ? 'bg-blue-100 text-blue-700'
                                  : r.status === 'Scheduled'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="table-cell">
                          {isMaintenanceExtendable(r) ? (
                            <button
                              type="button"
                              onClick={() => { setExtendRecord(r); setExtendOpen(true) }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100"
                              title="End date reached — extend with reason"
                            >
                              <CalendarClock size={12} /> Extend
                            </button>
                          ) : (
                            <span className="text-[10px] text-gray-300">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            {!loading && tableRows.length === 0 && (
              <p className="py-12 text-center text-sm text-gray-400 font-medium">
                {search.trim() ? 'No matching tickets.' : 'No maintenance tickets for this day.'}
              </p>
            )}
          </div>
        </div>

        <div className="xl:col-span-1 order-1 xl:order-2 min-h-[380px]">
          <MaintenanceScheduleCalendar
            records={records}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />
        </div>
      </div>

      <p className="text-xs text-gray-500 font-medium text-center pb-2">
        Tip: open a ticket from Assignments → View → Maintenance, or use Add Maintenance above.
      </p>
    </div>
  )
}
