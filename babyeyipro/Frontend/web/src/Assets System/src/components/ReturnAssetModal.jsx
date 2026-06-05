import { useState, useRef, useEffect } from 'react'
import { X, ArrowLeftRight, Calendar, Camera, FileText, AlertTriangle, Loader2, Check } from 'lucide-react'
import assetsApi from '../../../assets_portal/services/assetsApi'
import { normalizeAssignment } from '../../../assets_portal/utils/assignmentHelpers'

const NAVY = '#000435'
const FONT = "'Montserrat', sans-serif"

export default function ReturnAssetModal({ open, onClose, assignment, onSuccess }) {
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0])
  const [condition, setCondition] = useState('Excellent')
  const [damageCost, setDamageCost] = useState('')
  const [notes, setNotes] = useState('')
  const [images, setImages] = useState([])
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef(null)

  const a = normalizeAssignment(assignment)

  useEffect(() => {
    if (open) {
      setReturnDate(new Date().toISOString().split('T')[0])
      setCondition('Excellent')
      setDamageCost('')
      setNotes('')
      setImages([])
      setError('')
      setSuccess(false)
    }
  }, [open, assignment?.id])

  const handleFile = (e) => {
    const files = Array.from(e.target.files || [])
    setImages((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))])
  }

  const conditionColors = {
    Excellent: 'border-emerald-500 bg-emerald-50 text-emerald-700',
    Good: 'border-amber-500 bg-amber-50 text-amber-700',
    Fair: 'border-orange-500 bg-orange-50 text-orange-700',
    Damaged: 'border-red-500 bg-red-50 text-red-700',
  }

  const isConditionWorse = condition !== 'Excellent' && a?.condition === 'Excellent'
  const isDamaged = condition === 'Damaged'

  const handleSubmit = async () => {
    if (!a?.id) return
    setSaving(true)
    setError('')
    try {
      await assetsApi.returnAssignment(a.id, {
        return_date: returnDate,
        condition,
        notes,
        damage_cost: damageCost || null,
      })
      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        onSuccess?.()
        onClose?.()
      }, 1200)
    } catch (err) {
      setError(err.message || 'Return failed')
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[110] flex items-start justify-center overflow-y-auto bg-black/50 backdrop-blur-sm py-6" style={{ fontFamily: FONT }}>
      <div className="relative w-full max-w-2xl mx-4 bg-[#F8F9FC] rounded-2xl shadow-2xl border border-gray-100 my-auto">
        <div className="sticky top-0 z-10 text-white rounded-t-2xl px-6 py-4 flex items-center justify-between" style={{ backgroundColor: NAVY }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-500 rounded-xl flex items-center justify-center">
              <ArrowLeftRight size={18} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Return Asset</h2>
              <p className="text-xs text-white/60">Process asset return and update condition</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex gap-2">
            <AlertTriangle size={16} className="shrink-0" />
            {error}
          </div>
        )}

        {success && (
          <div className="absolute inset-0 bg-white/90 flex items-center justify-center z-20 rounded-2xl">
            <div className="text-center">
              <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Check size={28} className="text-emerald-600" />
              </div>
              <p className="font-bold" style={{ color: NAVY }}>Return recorded</p>
            </div>
          </div>
        )}

        <div className="px-6 py-6 max-h-[55vh] overflow-y-auto space-y-5">
          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
            <p className="text-xs text-gray-500 uppercase font-semibold mb-3">Asset Summary</p>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
                <span className="font-bold text-lg" style={{ color: NAVY }}>{a?.asset?.charAt(0) || '?'}</span>
              </div>
              <div className="flex-1 text-sm">
                <p className="font-semibold" style={{ color: NAVY }}>{a?.asset}</p>
                <p className="text-xs font-mono mt-0.5 text-amber-600">{a?.assetCode}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 mt-2 text-xs text-gray-600">
                  <span>Assigned to: <strong style={{ color: NAVY }}>{a?.assignedTo}</strong></span>
                  <span>Date: {a?.date}</span>
                  <span>Expected return: {a?.expectedReturn || '—'}</span>
                  <span>
                    Condition:{' '}
                    <span className="badge text-[10px] bg-emerald-100 text-emerald-700">{a?.condition}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm space-y-4">
            <p className="text-xs text-gray-500 uppercase font-semibold">Return Details</p>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Return Date</label>
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-gray-400" />
                <input type="date" className="input-field text-sm flex-1" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Returned Condition</label>
              <div className="flex gap-2 flex-wrap">
                {['Excellent', 'Good', 'Fair', 'Damaged'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`flex-1 min-w-[70px] py-2.5 px-2 rounded-xl text-xs font-bold border-2 transition-all ${conditionColors[c]} ${condition === c ? '' : 'border-gray-200 text-gray-500 bg-transparent'}`}
                    onClick={() => setCondition(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
              {isConditionWorse && (
                <div className="mt-2 flex gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                  <AlertTriangle size={14} className="shrink-0" />
                  Condition has worsened since assignment.
                </div>
              )}
              {isDamaged && (
                <div className="mt-2 flex gap-2 p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                  <AlertTriangle size={14} className="shrink-0" />
                  Asset marked damaged — consider opening a maintenance ticket.
                </div>
              )}
            </div>
            {isDamaged && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Damage Cost (RWF)</label>
                <input type="number" className="input-field text-sm" placeholder="Estimated repair cost" value={damageCost} onChange={(e) => setDamageCost(e.target.value)} />
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Return Notes</label>
              <textarea className="input-field resize-none h-20 text-sm w-full" placeholder="Remarks or damage explanation…" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Upload Evidence (optional)</label>
              {images.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {images.map((img, i) => (
                    <div key={i} className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden border">
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-amber-500"
              >
                <Camera size={18} /> Upload Images
              </button>
              <input ref={fileRef} type="file" multiple accept="image/*" onChange={handleFile} className="hidden" />
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white rounded-b-2xl border-t border-gray-100 px-6 py-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={saving} className="text-sm font-medium text-gray-500 px-4 py-2 hover:bg-gray-100 rounded-lg">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium px-6 py-2 rounded-lg flex items-center gap-1.5 disabled:opacity-50"
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <ArrowLeftRight size={18} />}
            Confirm Return
          </button>
        </div>
      </div>
    </div>
  )
}
