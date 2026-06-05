import { useEffect, useState } from 'react'
import {
  X, Eye, ArrowLeftRight, Wrench, Clock, User, CheckCircle2, Loader2,
} from 'lucide-react'
import QRCode from 'react-qr-code'
import assetsApi from '../../../assets_portal/services/assetsApi'
import { formatRwf, formatLocationValue } from '../../../assets_portal/utils/assetsCalculations'
import { normalizeAssignment } from '../../../assets_portal/utils/assignmentHelpers'

const NAVY = '#000435'
const GOLD = '#FEBF10'
const FONT = "'Montserrat', sans-serif"

export default function ViewAssignmentModal({ open, onClose, assignment, onReturn, onMaintenance }) {
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !assignment?.id) {
      setDetail(null)
      return undefined
    }
    let cancelled = false
    setLoading(true)
    assetsApi.getAssignment(assignment.id)
      .then((data) => { if (!cancelled) setDetail(normalizeAssignment(data)) })
      .catch(() => { if (!cancelled) setDetail(normalizeAssignment(assignment)) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [open, assignment])

  const a = detail || normalizeAssignment(assignment)

  const statusConfig = {
    Active: { class: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500', label: 'Active Assignment' },
    Overdue: { class: 'bg-red-100 text-red-700', dot: 'bg-red-500', label: 'Overdue Return' },
    Returned: { class: 'bg-gray-100 text-gray-700', dot: 'bg-gray-500', label: 'Returned' },
    Draft: { class: 'bg-amber-100 text-amber-800', dot: 'bg-amber-500', label: 'Draft' },
  }
  const status = statusConfig[a?.status] || statusConfig.Active

  const timeline = [
    {
      date: a?.date,
      action: 'Asset Assigned',
      user: 'Assets Manager',
      detail: `Assigned to ${a?.assignedTo}`,
      type: 'assign',
    },
    ...(a?.status === 'Returned'
      ? [{ date: '—', action: 'Asset Returned', user: 'System', detail: 'Return processed', type: 'check' }]
      : [{ date: '—', action: 'In Use', user: 'System', detail: 'Asset currently assigned', type: 'use' }]),
  ]

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/50 backdrop-blur-sm py-6" style={{ fontFamily: FONT }}>
      <div className="relative w-full max-w-4xl mx-4 bg-[#F8F9FC] rounded-2xl shadow-2xl border border-gray-100 my-auto">
        <div className="sticky top-0 z-10 text-white rounded-t-2xl px-6 lg:px-8 py-4 flex items-center justify-between" style={{ backgroundColor: NAVY }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: GOLD }}>
              <Eye size={18} style={{ color: NAVY }} />
            </div>
            <div>
              <h2 className="text-lg font-bold">Asset Assignment Details</h2>
              <p className="text-xs text-white/60">View complete assignment information</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg transition-all">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 lg:px-8 py-6 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-gray-500">
              <Loader2 className="animate-spin" size={22} />
              Loading assignment…
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="space-y-4">
                  <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-4 flex items-center gap-2">
                      <Eye size={14} /> Asset Information
                    </p>
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${GOLD}44` }}>
                        <span className="text-xl font-bold" style={{ color: NAVY }}>{a?.asset?.charAt(0) || '?'}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base" style={{ color: NAVY }}>{a?.asset}</h3>
                        <p className="text-xs font-mono mt-0.5" style={{ color: GOLD }}>{a?.assetCode}</p>
                        <span className="badge text-[10px] bg-gray-100 text-gray-600 mt-2 inline-block">{a?.assign_type || '—'}</span>
                      </div>
                    </div>
                    <div className="mt-4 space-y-2.5 text-sm">
                      <div className="flex justify-between gap-2">
                        <span className="text-gray-500">Serial</span>
                        <span className="font-mono text-xs" style={{ color: NAVY }}>{a?.serial_number || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-gray-500">Location</span>
                        <span className="text-right" style={{ color: NAVY }}>{formatLocationValue(a?.asset_location) || '—'}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-gray-500">Department</span>
                        <span style={{ color: NAVY }}>{a?.department || '—'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm flex items-center justify-center">
                    <div className="text-center">
                      <QRCode value={a?.assetCode || 'N/A'} size={100} bgColor="#ffffff" fgColor={NAVY} />
                      <p className="text-xs text-gray-400 mt-2 font-mono">{a?.assetCode}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className={`rounded-xl px-5 py-4 border flex items-center gap-3 ${status.class}`}>
                    <div className={`w-3 h-3 rounded-full ${status.dot}`} />
                    <div>
                      <p className="font-semibold text-sm">{status.label}</p>
                      <p className="text-xs opacity-75">
                        {a?.status === 'Overdue'
                          ? `Was due on ${a?.expectedReturn || '—'}`
                          : `Since ${a?.date || '—'}`}
                      </p>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-4 flex items-center gap-2">
                      <User size={14} /> Assignment Details
                    </p>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-lg">
                        <User size={16} style={{ color: GOLD }} />
                        <div>
                          <p className="font-medium" style={{ color: NAVY }}>{a?.assignedTo}</p>
                          <p className="text-xs text-gray-400">{a?.department}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-2.5 bg-gray-50 rounded-lg">
                          <p className="text-xs text-gray-500">Assignment Date</p>
                          <p className="font-medium text-sm mt-0.5" style={{ color: NAVY }}>{a?.date || '—'}</p>
                        </div>
                        <div className="p-2.5 bg-gray-50 rounded-lg">
                          <p className="text-xs text-gray-500">Expected Return</p>
                          <p className="font-medium text-sm mt-0.5" style={{ color: NAVY }}>{a?.expectedReturn || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="flex justify-between p-2.5 bg-gray-50 rounded-lg">
                        <span className="text-xs text-gray-500">Condition</span>
                        <span
                          className={`badge text-[10px] ${
                            a?.condition === 'Excellent'
                              ? 'bg-emerald-100 text-emerald-700'
                              : a?.condition === 'Good'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {a?.condition}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm mt-5">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-4 flex items-center gap-2">
                  <Clock size={14} /> Activity Timeline
                </p>
                <div className="space-y-0 relative before:absolute before:left-[11px] before:top-3 before:bottom-3 before:w-0.5 before:bg-gray-200">
                  {timeline.map((t, i) => (
                    <div key={i} className="flex items-start gap-4 pb-5 relative">
                      <div
                        className={`w-[23px] h-[23px] rounded-full flex items-center justify-center ring-4 ring-white shrink-0 ${
                          t.type === 'assign' ? 'bg-amber-500' : t.type === 'check' ? 'bg-emerald-500' : 'bg-blue-500'
                        }`}
                      >
                        {t.type === 'assign' ? (
                          <ArrowLeftRight size={12} className="text-white" />
                        ) : t.type === 'check' ? (
                          <CheckCircle2 size={12} className="text-white" />
                        ) : (
                          <Clock size={12} className="text-white" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium" style={{ color: NAVY }}>{t.action}</p>
                        <p className="text-xs text-gray-500">{t.detail}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{t.date} — {t.user}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="sticky bottom-0 bg-white rounded-b-2xl border-t border-gray-100 px-6 lg:px-8 py-4 flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} className="text-sm font-medium text-gray-500 hover:text-gray-800 px-4 py-2 hover:bg-gray-100 rounded-lg">
            Close
          </button>
          {a?.status !== 'Returned' && (
            <>
              <button
                type="button"
                onClick={onMaintenance}
                className="px-4 py-2 text-sm font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 flex items-center gap-1.5"
              >
                <Wrench size={16} /> Maintenance
              </button>
              <button
                type="button"
                onClick={onReturn}
                className="px-4 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 flex items-center gap-1.5"
              >
                <ArrowLeftRight size={16} /> Return Asset
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
