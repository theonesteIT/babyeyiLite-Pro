import { X, Eye, MapPin, Building2, User, Calendar } from 'lucide-react'
import { formatLocationValue } from '../../../assets_portal/utils/assetsCalculations'

const NAVY = '#000435'
const GOLD = '#FEBF10'
const FONT = "'Montserrat', sans-serif"

function display(val) {
  if (val == null || val === '') return '—'
  return formatLocationValue(val) || String(val)
}

export default function ViewTransferModal({ open, onClose, transfer }) {
  if (!open || !transfer) return null

  const destIcon = transfer.dest_type === 'department' ? Building2
    : transfer.dest_type === 'staff' ? User : MapPin

  const statusClass = {
    Pending: 'bg-amber-100 text-amber-700',
    Completed: 'bg-emerald-100 text-emerald-700',
    Rejected: 'bg-red-100 text-red-700',
    'In Transit': 'bg-blue-100 text-blue-700',
  }[transfer.status] || 'bg-gray-100 text-gray-700'

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/50 backdrop-blur-sm py-6" style={{ fontFamily: FONT }}>
      <div className="relative w-full max-w-2xl mx-4 bg-[#F8F9FC] rounded-2xl shadow-2xl border border-gray-100 my-auto">
        <div className="sticky top-0 z-10 text-white rounded-t-2xl px-6 py-4 flex items-center justify-between" style={{ backgroundColor: NAVY }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: GOLD }}>
              <Eye size={18} style={{ color: NAVY }} />
            </div>
            <div>
              <h2 className="text-lg font-bold">Transfer Details</h2>
              <p className="text-xs text-white/60">TRF-{String(transfer.id).padStart(4, '0')}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg transition-all">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-6 space-y-4">
          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">Asset</p>
            <h3 className="font-semibold text-base" style={{ color: NAVY }}>{transfer.asset}</h3>
            <p className="text-xs font-mono mt-0.5 text-gray-500">{transfer.assetCode}</p>
            <span className={`badge text-[10px] mt-2 inline-block ${statusClass}`}>{transfer.status}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl p-4 border border-gray-100">
              <p className="text-xs text-gray-500 uppercase font-semibold mb-2">From</p>
              <p className="text-sm font-medium" style={{ color: NAVY }}>{display(transfer.from)}</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-amber-100 ring-1 ring-amber-100">
              <p className="text-xs text-gray-500 uppercase font-semibold mb-2 flex items-center gap-1">
                <destIcon size={12} /> To
              </p>
              <p className="text-sm font-medium" style={{ color: NAVY }}>{display(transfer.to)}</p>
              {transfer.dest_type && (
                <p className="text-[10px] text-gray-400 mt-1 capitalize">{transfer.dest_type}</p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 border border-gray-100 space-y-3 text-sm">
            <div className="flex justify-between gap-2">
              <span className="text-gray-500">Reason</span>
              <span className="font-medium text-right" style={{ color: NAVY }}>{display(transfer.reason)}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-gray-500 flex items-center gap-1"><Calendar size={12} /> Date</span>
              <span className="font-medium" style={{ color: NAVY }}>{transfer.date}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-gray-500">Approved by</span>
              <span className="font-medium" style={{ color: NAVY }}>{transfer.approvedBy}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-gray-500">Condition</span>
              <span className="font-medium" style={{ color: NAVY }}>{transfer.condition}</span>
            </div>
            {transfer.notes && (
              <div className="pt-2 border-t border-gray-100">
                <span className="text-gray-500 text-xs block mb-1">Notes</span>
                <p className="text-gray-700">{transfer.notes}</p>
              </div>
            )}
          </div>
        </div>

        <div className="sticky bottom-0 bg-white rounded-b-2xl border-t border-gray-100 px-6 py-3 flex justify-end">
          <button type="button" onClick={onClose} className="text-sm font-medium text-gray-500 hover:text-navy px-4 py-2 hover:bg-gray-100 rounded-lg">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
