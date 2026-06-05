import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  X, Search, User, Building2, MapPin, Check, AlertTriangle, ArrowLeftRight,
  Loader2, Package, Calendar, CheckCircle2,
} from 'lucide-react'
import assetsApi from '../../../assets_portal/services/assetsApi'
import { formatRwf, formatLocationValue } from '../../../assets_portal/utils/assetsCalculations'

const NAVY = '#000435'
const GOLD = '#FEBF10'
const STEPS = ['Select Asset', 'From → To Location', 'Transfer Details', 'Confirmation']
const CONDITION_OPTIONS = ['Excellent', 'Good', 'Fair', 'Poor']

function normalizeAsset(row) {
  const value = row.total_balance ?? row.unit_price ?? 0
  return {
    id: row.id,
    name: row.asset_name || row.name || 'Asset',
    code: row.asset_code || row.code || '',
    serialNumber: row.serial_number || '',
    category: row.category || row.asset_type || '—',
    location: formatLocationValue(row.location) || '—',
    status: row.status || 'Active',
    value: Number(value) || 0,
    department: '',
    assignedTo: 'Unassigned',
  }
}

function buildPayload(form) {
  const {
    selectedAsset, destType, selDept, deptOther, locationText, staffName,
    reason, reasonOther, transferDate, approvedBy, condition, notes,
  } = form
  const payload = {
    asset_id: selectedAsset?.id,
    dest_type: destType,
    transfer_reason: reason,
    transfer_reason_other: reason === 'Other' ? reasonOther : null,
    transfer_date: transferDate,
    approved_by: approvedBy || null,
    condition_code: condition,
    notes: notes || null,
  }
  if (destType === 'department') {
    payload.to_department = selDept
    payload.to_department_other = selDept === 'Other' ? deptOther : null
  }
  if (destType === 'location') payload.to_location = locationText.trim()
  if (destType === 'staff') payload.to_staff_name = staffName.trim()
  return payload
}

function destinationLabel(form) {
  const { destType, selDept, deptOther, locationText, staffName } = form
  if (destType === 'department') {
    if (selDept === 'Other' && deptOther) return `Other: ${deptOther}`
    return selDept || '—'
  }
  if (destType === 'location') return formatLocationValue(locationText) || '—'
  if (destType === 'staff') return staffName.trim() || '—'
  return '—'
}

export default function AssetTransferModal({ open, onClose, onSuccess }) {
  const [step, setStep] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [showResults, setShowResults] = useState(false)
  const [assetResults, setAssetResults] = useState([])
  const [assetsLoading, setAssetsLoading] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState(null)
  const [destType, setDestType] = useState('department')
  const [selDept, setSelDept] = useState('')
  const [deptOther, setDeptOther] = useState('')
  const [locationText, setLocationText] = useState('')
  const [staffName, setStaffName] = useState('')
  const [reason, setReason] = useState('')
  const [reasonOther, setReasonOther] = useState('')
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0])
  const [approvedBy, setApprovedBy] = useState('')
  const [condition, setCondition] = useState('Excellent')
  const [notes, setNotes] = useState('')
  const [departments, setDepartments] = useState([])
  const [transferReasons, setTransferReasons] = useState([])
  const [approvedOptions, setApprovedOptions] = useState([])
  const [metaLoading, setMetaLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [apiError, setApiError] = useState('')
  const [success, setSuccess] = useState(false)
  const [saving, setSaving] = useState(false)
  const searchRef = useRef(null)
  const searchTimer = useRef(null)

  const loadMeta = useCallback(() => {
    setMetaLoading(true)
    assetsApi.getTransferMeta()
      .then((data) => {
        setDepartments([...(data?.departments || [])].sort())
        setTransferReasons(data?.transfer_reasons || [])
        setApprovedOptions(data?.approved_by_options || ['Admin', 'Manager', 'Director', 'Department Head', 'Assets Manager'])
      })
      .catch(() => {
        setDepartments([])
        setTransferReasons([])
      })
      .finally(() => setMetaLoading(false))
  }, [])

  useEffect(() => {
    if (open) {
      loadMeta()
      setStep(1)
    }
  }, [open, loadMeta])

  useEffect(() => {
    if (!open) return undefined
    const q = searchQuery.trim()
    if (!q || selectedAsset) {
      setAssetResults([])
      return undefined
    }
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      setAssetsLoading(true)
      assetsApi.listAssets({ q, limit: 20 })
        .then((rows) => setAssetResults((rows || []).map(normalizeAsset)))
        .catch(() => setAssetResults([]))
        .finally(() => setAssetsLoading(false))
    }, 280)
    return () => clearTimeout(searchTimer.current)
  }, [searchQuery, open, selectedAsset])

  useEffect(() => {
    const handleClick = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowResults(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const enrichAsset = async (asset) => {
    try {
      const panel = await assetsApi.getAssetPanel(asset.id)
      const active = panel?.assignments?.[0]
      return {
        ...asset,
        department: active?.department && active.department !== '—' ? formatLocationValue(active.department) : '',
        assignedTo: active?.name || 'Unassigned',
        location: formatLocationValue(panel?.asset?.location) || asset.location,
      }
    } catch {
      return asset
    }
  }

  const selectAsset = async (asset) => {
    const enriched = await enrichAsset(asset)
    setSelectedAsset(enriched)
    setSearchQuery(enriched.name)
    setShowResults(false)
    setErrors((e) => ({ ...e, asset: undefined }))
  }

  const resetForm = () => {
    setStep(1)
    setSearchQuery('')
    setSelectedAsset(null)
    setDestType('department')
    setSelDept('')
    setDeptOther('')
    setLocationText('')
    setStaffName('')
    setReason('')
    setReasonOther('')
    setTransferDate(new Date().toISOString().split('T')[0])
    setApprovedBy('')
    setCondition('Excellent')
    setNotes('')
    setErrors({})
    setApiError('')
    setAssetResults([])
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const validateStep = (s) => {
    const errs = {}
    if (s === 1 && !selectedAsset) errs.asset = 'Please select an asset'
    if (s === 2) {
      if (destType === 'department') {
        if (!selDept) errs.dept = 'Select a department'
        if (selDept === 'Other' && !deptOther.trim()) errs.deptOther = 'Specify the department'
      }
      if (destType === 'location' && !locationText.trim()) errs.location = 'Enter destination location'
      if (destType === 'staff' && !staffName.trim()) errs.staff = 'Enter staff name'
    }
    if (s === 3) {
      if (!reason) errs.reason = 'Select transfer reason'
      if (reason === 'Other' && !reasonOther.trim()) errs.reasonOther = 'Specify transfer reason'
      if (!transferDate) errs.transferDate = 'Transfer date is required'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const goNext = () => {
    if (!validateStep(step)) return
    setStep((n) => Math.min(4, n + 1))
  }

  const goBack = () => setStep((n) => Math.max(1, n - 1))

  const submit = async () => {
    if (!validateStep(3)) {
      setStep(3)
      return
    }
    setApiError('')
    setSaving(true)
    try {
      const payload = buildPayload({
        selectedAsset, destType, selDept, deptOther, locationText, staffName,
        reason, reasonOther, transferDate, approvedBy, condition, notes,
      })
      await assetsApi.createTransfer(payload)
      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        handleClose()
        onSuccess?.()
      }, 1400)
    } catch (err) {
      setApiError(err.message || 'Transfer failed')
    } finally {
      setSaving(false)
    }
  }

  const toLabel = useMemo(
    () => destinationLabel({ destType, selDept, deptOther, locationText, staffName }),
    [destType, selDept, deptOther, locationText, staffName],
  )

  const reasonDisplay = reason === 'Other' && reasonOther ? `Other: ${reasonOther}` : reason

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/55 backdrop-blur-sm py-6 px-4"
      style={{ fontFamily: "'Montserrat', system-ui, sans-serif" }}
    >
      <div className="relative w-full max-w-3xl bg-[#F8F9FC] rounded-2xl shadow-2xl border border-gray-100 my-auto overflow-hidden">
        <div
          className="sticky top-0 z-10 text-white px-6 lg:px-8 py-4 flex items-center justify-between rounded-t-2xl"
          style={{ backgroundColor: NAVY }}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: GOLD }}>
              <ArrowLeftRight size={18} style={{ color: NAVY }} />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">New Asset Transfer</h2>
              <p className="text-xs text-white/55 mt-0.5">
                Step {step} of 4 — {STEPS[step - 1]}
              </p>
            </div>
          </div>
          <button type="button" onClick={handleClose} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 lg:px-8 pt-5 pb-2 bg-white border-b border-gray-100">
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center gap-1 flex-1">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    s < step ? 'bg-emerald-500 text-white' : s === step ? 'text-[#000435]' : 'bg-gray-200 text-gray-500'
                  }`}
                  style={s === step ? { backgroundColor: GOLD } : undefined}
                >
                  {s < step ? <Check size={14} /> : s}
                </div>
                {s < 4 && <div className={`flex-1 h-0.5 rounded ${s < step ? 'bg-emerald-400' : 'bg-gray-200'}`} />}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-1 text-[10px] text-gray-400 font-medium">
            <span>Asset</span><span>Location</span><span>Details</span><span>Confirm</span>
          </div>
        </div>

        {apiError && (
          <div className="mx-6 mt-4 flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <AlertTriangle size={16} />
            {apiError}
          </div>
        )}

        <div className="px-6 lg:px-8 py-4 max-h-[min(58vh,520px)] overflow-y-auto space-y-4 relative">
          {success && (
            <div className="absolute inset-0 bg-white/95 backdrop-blur-sm flex items-center justify-center z-20 rounded-b-2xl">
              <div className="text-center">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check size={32} className="text-emerald-600" />
                </div>
                <p className="text-xl font-bold" style={{ color: NAVY }}>Transfer Recorded</p>
                <p className="text-sm text-gray-500 mt-1">{selectedAsset?.name} → {toLabel}</p>
              </div>
            </div>
          )}

          {step === 2 && selectedAsset && (
            <div className="bg-white rounded-xl px-4 py-3 border border-gray-100 text-sm flex flex-wrap gap-x-6 gap-y-1">
              <span className="font-semibold" style={{ color: NAVY }}>{selectedAsset.name}</span>
              <span className="text-gray-500">{selectedAsset.department || '—'}</span>
              <span className="text-gray-500">{selectedAsset.location}</span>
              <span className="text-gray-500">{selectedAsset.assignedTo}</span>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">Search Asset</p>
                <div className="relative" ref={searchRef}>
                  <div className="flex items-center border-2 border-gray-200 rounded-xl focus-within:border-[#FEBF10] transition-all">
                    <Search size={18} className="ml-3 text-gray-400 shrink-0" />
                    <input
                      type="text"
                      className="w-full px-3 py-3 text-sm bg-transparent outline-none"
                      placeholder="Search by name, code, serial, SKU, UPI..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value)
                        setShowResults(true)
                        if (selectedAsset) setSelectedAsset(null)
                      }}
                      onFocus={() => setShowResults(true)}
                    />
                    {assetsLoading && <Loader2 size={16} className="mr-3 animate-spin text-gray-400" />}
                  </div>
                  {errors.asset && <p className="text-xs text-red-600 mt-1">{errors.asset}</p>}
                  {showResults && assetResults.length > 0 && !selectedAsset && (
                    <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                      {assetResults.map((a) => (
                        <button
                          key={a.id}
                          type="button"
                          className="w-full text-left px-4 py-3 hover:bg-amber-50 border-b border-gray-50 last:border-0"
                          onClick={() => selectAsset(a)}
                        >
                          <p className="text-sm font-medium" style={{ color: NAVY }}>{a.name}</p>
                          <p className="text-[10px] text-gray-400 font-mono">{a.code} · {a.category}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {selectedAsset ? (
                <div className="bg-white rounded-xl p-5 border-2 shadow-sm" style={{ borderColor: `${GOLD}88` }}>
                  <p className="text-[10px] uppercase font-bold tracking-wider mb-3 flex items-center gap-1.5" style={{ color: NAVY }}>
                    <CheckCircle2 size={12} style={{ color: GOLD }} /> Selected Asset
                  </p>
                  <h3 className="font-semibold text-base" style={{ color: NAVY }}>{selectedAsset.name}</h3>
                  <p className="text-xs font-mono mt-0.5 opacity-70" style={{ color: NAVY }}>{selectedAsset.code}</p>
                  <div className="grid grid-cols-3 gap-3 mt-3 text-xs">
                    <div className="bg-gray-50 rounded-lg p-2"><span className="text-gray-500">Category</span><p className="font-medium mt-0.5" style={{ color: NAVY }}>{selectedAsset.category}</p></div>
                    <div className="bg-gray-50 rounded-lg p-2"><span className="text-gray-500">Location</span><p className="font-medium mt-0.5" style={{ color: NAVY }}>{selectedAsset.location}</p></div>
                    <div className="bg-gray-50 rounded-lg p-2"><span className="text-gray-500">Value</span><p className="font-medium mt-0.5" style={{ color: NAVY }}>{formatRwf(selectedAsset.value)} RWF</p></div>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-xl p-8 text-center text-gray-400 text-sm border-2 border-dashed border-gray-200">
                  <Package size={32} className="mx-auto mb-2 opacity-40" />
                  <p>Search and select an asset to transfer</p>
                </div>
              )}
            </div>
          )}

          {step === 2 && selectedAsset && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3 flex items-center gap-1.5">
                  <Building2 size={14} /> From (Current Location)
                </p>
                <div className="bg-gray-50 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                  <div><span className="text-xs text-gray-500">Department</span><p className="font-medium mt-0.5" style={{ color: NAVY }}>{selectedAsset.department || '—'}</p></div>
                  <div><span className="text-xs text-gray-500">Location</span><p className="font-medium mt-0.5" style={{ color: NAVY }}>{selectedAsset.location || '—'}</p></div>
                  <div><span className="text-xs text-gray-500">Assigned To</span><p className="font-medium mt-0.5" style={{ color: NAVY }}>{selectedAsset.assignedTo}</p></div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3 flex items-center gap-1.5">
                  <MapPin size={14} /> To (Destination)
                </p>
                <div className="flex gap-2 mb-4">
                  {[
                    { key: 'department', icon: Building2, label: 'Department' },
                    { key: 'location', icon: MapPin, label: 'Location' },
                    { key: 'staff', icon: User, label: 'Staff' },
                  ].map((d) => (
                    <button
                      key={d.key}
                      type="button"
                      onClick={() => { setDestType(d.key); setErrors({}) }}
                      className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold border-2 transition-all ${
                        destType === d.key ? 'border-[#FEBF10] bg-amber-50 text-amber-800' : 'border-gray-200 text-gray-500'
                      }`}
                    >
                      <d.icon size={14} className="mx-auto mb-1" />
                      {d.label}
                    </button>
                  ))}
                </div>

                {destType === 'department' && (
                  <div className="space-y-3">
                    <select
                      className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#FEBF10]"
                      value={selDept}
                      onChange={(e) => setSelDept(e.target.value)}
                      disabled={metaLoading}
                    >
                      <option value="">Select department…</option>
                      {departments.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                      <option value="Other">Other (specify)</option>
                    </select>
                    {selDept === 'Other' && (
                      <input
                        type="text"
                        className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#FEBF10]"
                        placeholder="Specify department name…"
                        value={deptOther}
                        onChange={(e) => setDeptOther(e.target.value)}
                      />
                    )}
                    {(errors.dept || errors.deptOther) && (
                      <p className="text-xs text-red-600">{errors.dept || errors.deptOther}</p>
                    )}
                  </div>
                )}

                {destType === 'location' && (
                  <div>
                    <div className="flex items-center border-2 border-gray-200 rounded-xl focus-within:border-[#FEBF10]">
                      <MapPin size={16} className="ml-3 text-gray-400 shrink-0" />
                      <input
                        type="text"
                        className="w-full px-3 py-2.5 text-sm bg-transparent outline-none"
                        placeholder="Enter destination location (e.g. Building B - Floor 1 - Room 105)"
                        value={locationText}
                        onChange={(e) => setLocationText(e.target.value)}
                      />
                    </div>
                    {errors.location && <p className="text-xs text-red-600 mt-1">{errors.location}</p>}
                  </div>
                )}

                {destType === 'staff' && (
                  <div>
                    <div className="flex items-center border-2 border-gray-200 rounded-xl focus-within:border-[#FEBF10]">
                      <User size={16} className="ml-3 text-gray-400 shrink-0" />
                      <input
                        type="text"
                        className="w-full px-3 py-2.5 text-sm bg-transparent outline-none"
                        placeholder="Enter staff member name…"
                        value={staffName}
                        onChange={(e) => setStaffName(e.target.value)}
                      />
                    </div>
                    {errors.staff && <p className="text-xs text-red-600 mt-1">{errors.staff}</p>}
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm space-y-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Transfer Information</p>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Transfer Reason</label>
                <select
                  className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#FEBF10]"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                >
                  <option value="">Select reason…</option>
                  {(transferReasons.length ? transferReasons : [
                    'Reallocation', 'Department Transfer', 'New Assignment', 'Maintenance',
                    'Upgrade', 'Damage Replacement', 'Relocation', 'Other',
                  ]).map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                {reason === 'Other' && (
                  <input
                    type="text"
                    className="w-full mt-2 border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#FEBF10]"
                    placeholder="Specify reason…"
                    value={reasonOther}
                    onChange={(e) => setReasonOther(e.target.value)}
                  />
                )}
                {(errors.reason || errors.reasonOther) && (
                  <p className="text-xs text-red-600 mt-1">{errors.reason || errors.reasonOther}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Transfer Date</label>
                  <div className="flex items-center border-2 border-gray-200 rounded-xl focus-within:border-[#FEBF10]">
                    <Calendar size={16} className="ml-3 text-gray-400" />
                    <input type="date" className="w-full px-3 py-2.5 text-sm bg-transparent outline-none" value={transferDate} onChange={(e) => setTransferDate(e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Approved By</label>
                  <select className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#FEBF10]" value={approvedBy} onChange={(e) => setApprovedBy(e.target.value)}>
                    <option value="">Select…</option>
                    {approvedOptions.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Condition at Transfer</label>
                <div className="flex gap-2 flex-wrap">
                  {CONDITION_OPTIONS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCondition(c)}
                      className={`flex-1 min-w-[4.5rem] py-2.5 rounded-xl text-xs font-bold border-2 transition-all ${
                        condition === c ? 'border-[#FEBF10] bg-amber-50 text-amber-800' : 'border-gray-200 text-gray-500'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Notes (optional)</label>
                <textarea className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm resize-none h-20 outline-none focus:border-[#FEBF10]" placeholder="Explain reason for transfer…" value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </div>
          )}

          {step === 4 && selectedAsset && (
            <div className="bg-white rounded-xl p-5 border-2 shadow-sm space-y-4" style={{ borderColor: `${GOLD}88` }}>
              <p className="text-xs uppercase font-bold tracking-wider flex items-center gap-1.5" style={{ color: NAVY }}>
                <CheckCircle2 size={14} style={{ color: GOLD }} /> Transfer Summary
              </p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-50 rounded-lg p-3"><span className="text-xs text-gray-500">Asset</span><p className="font-medium mt-0.5" style={{ color: NAVY }}>{selectedAsset.name}</p></div>
                <div className="bg-gray-50 rounded-lg p-3"><span className="text-xs text-gray-500">Code</span><p className="font-medium mt-0.5 font-mono text-xs" style={{ color: NAVY }}>{selectedAsset.code}</p></div>
                <div className="bg-gray-50 rounded-lg p-3"><span className="text-xs text-gray-500">From</span><p className="font-medium mt-0.5" style={{ color: NAVY }}>{[selectedAsset.department, selectedAsset.location].filter(Boolean).join(' — ') || '—'}</p></div>
                <div className="bg-gray-50 rounded-lg p-3"><span className="text-xs text-gray-500">To</span><p className="font-medium mt-0.5" style={{ color: NAVY }}>{toLabel}</p></div>
                <div className="bg-gray-50 rounded-lg p-3"><span className="text-xs text-gray-500">Reason</span><p className="font-medium mt-0.5" style={{ color: NAVY }}>{reasonDisplay || '—'}</p></div>
                <div className="bg-gray-50 rounded-lg p-3"><span className="text-xs text-gray-500">Date</span><p className="font-medium mt-0.5" style={{ color: NAVY }}>{transferDate}</p></div>
                <div className="bg-gray-50 rounded-lg p-3"><span className="text-xs text-gray-500">Approved By</span><p className="font-medium mt-0.5" style={{ color: NAVY }}>{approvedBy || '—'}</p></div>
                <div className="bg-gray-50 rounded-lg p-3"><span className="text-xs text-gray-500">Condition</span><p className="font-medium mt-0.5" style={{ color: NAVY }}>{condition}</p></div>
              </div>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 lg:px-8 py-4 flex items-center justify-between rounded-b-2xl">
          <button
            type="button"
            onClick={goBack}
            disabled={step === 1}
            className={`text-sm font-medium px-4 py-2 rounded-lg ${step === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            Back
          </button>
          <div className="flex items-center gap-2">
            <button type="button" onClick={handleClose} className="text-sm font-medium text-gray-500 px-4 py-2 hover:bg-gray-100 rounded-lg">
              Cancel
            </button>
            {step < 4 ? (
              <button
                type="button"
                onClick={goNext}
                disabled={step === 1 && !selectedAsset}
                className="font-medium px-5 py-2 rounded-lg text-sm text-[#000435] disabled:bg-gray-300 disabled:text-gray-500 shadow-lg transition-all"
                style={{ backgroundColor: step === 1 && !selectedAsset ? undefined : GOLD }}
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                onClick={submit}
                disabled={saving}
                className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white font-medium px-6 py-2 rounded-lg text-sm flex items-center gap-1.5"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <ArrowLeftRight size={16} />}
                Submit Transfer
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
