import { useEffect, useMemo, useState } from 'react'
import { X, CalendarClock, Loader2, AlertCircle, Calendar } from 'lucide-react'
import assetsApi from '../../../assets_portal/services/assetsApi'
import {
  formatDateModern, normalizeDateOnly, addDaysToDateOnly,
} from '../../../assets_portal/utils/assetsDateUtils'

const NAVY = '#000435'
const GOLD = '#FEBF10'

export default function ExtendMaintenanceModal({ open, onClose, onSuccess, record }) {
  const [days, setDays] = useState('1')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const currentEnd = normalizeDateOnly(record?.end_date)
  const additionalDays = Math.max(1, Number(days) || 0)
  const newEnd = useMemo(
    () => (currentEnd ? addDaysToDateOnly(currentEnd, additionalDays) : ''),
    [currentEnd, additionalDays],
  )

  useEffect(() => {
    if (!open) return
    setDays('1')
    setReason('')
    setError('')
  }, [open, record?.id])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!record?.id) return
    if (!reason.trim()) {
      setError('Please provide a reason for extending the deadline')
      return
    }
    setSaving(true)
    setError('')
    try {
      await assetsApi.extendMaintenance(record.id, {
        additional_days: additionalDays,
        reason: reason.trim(),
      })
      onSuccess?.()
      onClose?.()
    } catch (err) {
      setError(err?.message || 'Failed to extend maintenance')
    } finally {
      setSaving(false)
    }
  }

  if (!open || !record) return null

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden" style={{ fontFamily: "'Montserrat', sans-serif" }}>
        <div className="px-6 py-4 text-white flex items-center justify-between" style={{ background: NAVY }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: GOLD }}>
              <CalendarClock size={18} style={{ color: NAVY }} />
            </div>
            <div>
              <h2 className="text-base font-bold">Extend maintenance</h2>
              <p className="text-xs text-white/60 truncate max-w-[220px]">{record.asset}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={saving} className="p-1.5 hover:bg-white/10 rounded-lg">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 text-sm text-amber-900">
            <p className="font-semibold">Completion date reached</p>
            <p className="text-xs mt-1 text-amber-800/90">
              The scheduled end date has passed. Add more days and document why the work continues.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
              <p className="text-[10px] font-bold uppercase text-slate-400">Current end</p>
              <p className="font-semibold mt-1 flex items-center gap-1" style={{ color: NAVY }}>
                <Calendar size={13} /> {formatDateModern(currentEnd) || '—'}
              </p>
            </div>
            <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3">
              <p className="text-[10px] font-bold uppercase text-emerald-700">New end</p>
              <p className="font-semibold mt-1 flex items-center gap-1 text-emerald-800">
                <Calendar size={13} /> {formatDateModern(newEnd) || '—'}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Additional days *</label>
            <input
              type="number"
              min={1}
              max={365}
              className="assets-wizard-input w-full text-sm"
              value={days}
              onChange={(e) => setDays(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Reason / comment *</label>
            <textarea
              className="assets-wizard-input w-full text-sm min-h-[100px]"
              placeholder="Explain why maintenance needs more time (e.g. parts delayed, additional repairs found…)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5" /> {error}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} disabled={saving}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">
              Cancel
            </button>
            <button type="submit" disabled={saving || !reason.trim()}
              className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-[#0B1530] disabled:opacity-50"
              style={{ background: GOLD }}>
              {saving ? <Loader2 size={16} className="animate-spin" /> : <CalendarClock size={16} />}
              Extend {additionalDays} day{additionalDays !== 1 ? 's' : ''}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
