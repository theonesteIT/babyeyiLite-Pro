import { useState, useEffect, useRef } from 'react'
import { X, Wrench, FileText, AlertTriangle, Loader2, Check, Paperclip, Trash2 } from 'lucide-react'
import assetsApi from '../../../assets_portal/services/assetsApi'
import { normalizeAssignment } from '../../../assets_portal/utils/assignmentHelpers'
import AssetPickerSearch from './AssetPickerSearch'
import AssetDateInput from './AssetDateInput'
import { localTodayIso } from '../../../assets_portal/utils/assetsDateUtils'

const NAVY = '#000435'
const AMBER = '#FEBF10'
const FONT = "'Montserrat', sans-serif"

export default function MaintenanceRequestModal({ open, onClose, assignment, onSuccess }) {
  const [maintType, setMaintType] = useState('Repair')
  const [startDate, setStartDate] = useState(localTodayIso())
  const [endDate, setEndDate] = useState('')
  const [technician, setTechnician] = useState('')
  const [cost, setCost] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('Medium')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [selectedAsset, setSelectedAsset] = useState(null)
  const [assetError, setAssetError] = useState('')
  const [attachments, setAttachments] = useState([])
  const fileRef = useRef(null)

  const a = assignment ? normalizeAssignment(assignment) : null

  useEffect(() => {
    if (open) {
      setMaintType('Repair')
      setStartDate(localTodayIso())
      setEndDate('')
      setTechnician('')
      setCost('')
      setDescription('')
      setPriority('Medium')
      setError('')
      setAssetError('')
      setSuccess(false)
      setAttachments([])
      setSelectedAsset(null)
    }
  }, [open, assignment])

  const priorityConfig = {
    Low: 'border-emerald-500 bg-emerald-50 text-emerald-700',
    Medium: 'border-amber-500 bg-amber-50 text-amber-800',
    High: 'border-red-500 bg-red-50 text-red-700',
    Critical: 'border-red-800 bg-red-100 text-red-800',
  }

  const typeSelected = 'border-2 font-bold'
  const typeIdle = 'border-2 border-gray-200 text-gray-500 bg-white'

  const addFiles = (fileList) => {
    const next = Array.from(fileList || []).filter((f) => f && f.size > 0)
    if (!next.length) return
    setAttachments((prev) => [...prev, ...next].slice(0, 5))
  }

  const removeFile = (index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (!description.trim()) {
      setError('Please describe the problem')
      return
    }
    if (endDate && startDate && endDate < startDate) {
      setError('Expected completion cannot be before start date')
      return
    }
    const assetId = a?.asset_id || selectedAsset?.id || null
    const assetName = a?.asset || selectedAsset?.name || ''
    const assetCode = a?.assetCode || selectedAsset?.code || null

    if (!assetId && !assetName.trim()) {
      setAssetError('Select an asset from the register')
      setError('Please select an asset for this maintenance ticket')
      return
    }

    setSaving(true)
    setError('')
    setAssetError('')
    try {
      await assetsApi.createMaintenance({
        asset_id: assetId,
        assignment_id: a?.id || null,
        asset_name: assetName.trim(),
        asset_code: assetCode || null,
        maint_type: maintType,
        description: description.trim(),
        technician: technician.trim() || null,
        priority,
        estimated_cost: cost || null,
        start_date: startDate,
        end_date: endDate || null,
      })
      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        onSuccess?.()
        onClose?.()
      }, 1200)
    } catch (err) {
      setError(err.message || 'Failed to create ticket')
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto bg-black/50 backdrop-blur-sm py-6" style={{ fontFamily: FONT }}>
      <div className="relative w-full max-w-2xl mx-4 bg-[#F8F9FC] rounded-2xl shadow-2xl border border-black/10 my-auto">
        <div className="sticky top-0 z-10 text-white rounded-t-2xl px-6 py-4 flex items-center justify-between" style={{ backgroundColor: NAVY }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: AMBER }}>
              <Wrench size={18} style={{ color: NAVY }} />
            </div>
            <div>
              <h2 className="text-lg font-bold">Maintenance Request</h2>
              <p className="text-xs text-white/60">Create a maintenance ticket for an asset</p>
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
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: `${AMBER}40` }}>
                <Check size={28} style={{ color: NAVY }} />
              </div>
              <p className="font-bold" style={{ color: NAVY }}>Maintenance ticket created</p>
            </div>
          </div>
        )}

        <div className="px-6 py-6 max-h-[min(58vh,520px)] overflow-y-auto overflow-x-visible space-y-5">
          <div className="bg-white rounded-xl p-5 border border-black/10 shadow-sm space-y-3">
            {a ? (
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${AMBER}33` }}>
                  <span className="font-bold text-lg" style={{ color: NAVY }}>{a.asset?.charAt(0) || '?'}</span>
                </div>
                <div className="flex-1 text-sm">
                  <p className="font-semibold" style={{ color: NAVY }}>{a.asset}</p>
                  <p className="text-xs font-mono" style={{ color: '#c87800' }}>{a.assetCode}</p>
                  <p className="text-xs text-gray-600 mt-1">Assigned to: <strong style={{ color: NAVY }}>{a.assignedTo}</strong></p>
                </div>
              </div>
            ) : (
              <AssetPickerSearch
                value={selectedAsset}
                onChange={(asset) => {
                  setSelectedAsset(asset)
                  setAssetError('')
                }}
                error={assetError}
              />
            )}
          </div>

          <div className="bg-white rounded-xl p-5 border border-black/10 shadow-sm space-y-4">
            <p className="text-xs uppercase font-bold tracking-wider" style={{ color: `${NAVY}99` }}>Maintenance Details</p>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Maintenance Type</label>
              <div className="grid grid-cols-2 gap-2">
                {['Repair', 'Inspection', 'Replacement', 'Upgrade'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={`py-2.5 px-3 rounded-xl text-xs transition-all ${
                      maintType === t
                        ? `${typeSelected} bg-[#FEBF10]/20 text-[#000435]`
                        : typeIdle
                    }`}
                    style={maintType === t ? { borderColor: AMBER } : undefined}
                    onClick={() => setMaintType(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-[5]">
              <AssetDateInput
                label="Start Date"
                value={startDate}
                onChange={setStartDate}
                required
              />
              <AssetDateInput
                label="Expected Completion"
                value={endDate}
                onChange={setEndDate}
                optional
                min={startDate || undefined}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Assigned Technician</label>
              <input
                type="text"
                className="assets-wizard-input text-sm w-full"
                placeholder="Enter technician name"
                value={technician}
                onChange={(e) => setTechnician(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Estimated Cost (RWF)</label>
              <input type="number" className="assets-wizard-input text-sm w-full" placeholder="Optional" value={cost} onChange={(e) => setCost(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Problem Description *</label>
              <textarea
                className="assets-wizard-input resize-none h-20 text-sm w-full"
                placeholder="Describe the issue clearly…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Priority</label>
              <div className="grid grid-cols-4 gap-2">
                {['Low', 'Medium', 'High', 'Critical'].map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={`py-2.5 px-2 rounded-xl text-xs font-bold border-2 ${priority === p ? priorityConfig[p] : 'border-gray-200 text-gray-500 bg-transparent'}`}
                    onClick={() => setPriority(p)}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-medium text-gray-700 flex items-center gap-1.5">
                  <Paperclip size={14} className="text-gray-400" />
                  Attachments
                </label>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Optional</span>
              </div>
              <input
                ref={fileRef}
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                className="hidden"
                onChange={(e) => {
                  addFiles(e.target.files)
                  e.target.value = ''
                }}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-[#FEBF10] hover:bg-[#FEBF10]/5 transition-all"
              >
                <FileText size={18} className="text-gray-400" />
                Add photos or documents (max 5)
              </button>
              {attachments.length > 0 && (
                <ul className="space-y-1.5">
                  {attachments.map((file, i) => (
                    <li key={`${file.name}-${i}`} className="flex items-center justify-between gap-2 text-xs bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                      <span className="truncate font-medium text-gray-700">{file.name}</span>
                      <button type="button" onClick={() => removeFile(i)} className="p-1 text-gray-400 hover:text-red-600 shrink-0">
                        <Trash2 size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-[10px] text-gray-400">Files are kept locally for reference; upload to server coming soon.</p>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-black/10 px-6 py-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={saving} className="text-sm font-medium text-gray-500 px-4 py-2 hover:bg-gray-100 rounded-lg">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="font-bold px-6 py-2.5 rounded-xl flex items-center gap-1.5 disabled:opacity-50"
            style={{ backgroundColor: NAVY, color: AMBER }}
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Wrench size={18} />}
            Create Maintenance Ticket
          </button>
        </div>
      </div>
    </div>
  )
}
