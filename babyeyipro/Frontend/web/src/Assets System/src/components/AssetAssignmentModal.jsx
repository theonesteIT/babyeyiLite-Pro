import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import {
  X, Search, User, Building2, Users, Check, AlertTriangle, ArrowLeftRight, Lock, Loader2,
} from 'lucide-react'
import assetsApi from '../../../assets_portal/services/assetsApi'
import { formatRwf, formatLocationValue } from '../../../assets_portal/utils/assetsCalculations'

const NAVY = '#000435'
const GOLD = '#FEBF10'

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
  }
}

function normalizeRoom(r, index) {
  const label = formatLocationValue(r?.label ?? r?.location ?? r)
  const building = formatLocationValue(r?.building) || label.split(' - ')[0] || label || 'Site'
  const roomParts = label.split(' - ').slice(1)
  const room = formatLocationValue(r?.room) || (roomParts.length ? roomParts.join(' - ') : 'Main')
  return {
    id: r?.id ?? index + 1,
    building,
    room,
    label: label || `${building} - ${room}`,
  }
}

function normalizeDepartments(list = []) {
  return [...new Set(
    list.map((d) => (typeof d === 'string' ? d.trim() : formatLocationValue(d))).filter(Boolean),
  )].sort()
}

function buildPayload(form, { draft = false } = {}) {
  const {
    selectedAsset, assignType, returnable, assignmentDate, returnDate, condition, notes,
    personName, personContact, staffName, staffDepartment, selectedRoom,
  } = form
  const payload = {
    asset_id: selectedAsset?.id,
    assign_type: assignType,
    returnable,
    assignment_date: assignmentDate,
    expected_return_date: returnable ? returnDate : null,
    condition,
    notes: notes || null,
    save_as_draft: draft,
  }
  if (assignType === 'personal') {
    payload.assignee_name = personName
    payload.assignee_contact = personContact || null
  }
  if (assignType === 'staff') {
    payload.assignee_name = staffName
    payload.staff_department = staffDepartment
  }
  if (assignType === 'place' && selectedRoom) {
    payload.place_label = selectedRoom.label
    payload.place_building = selectedRoom.building
    payload.place_room = selectedRoom.room
  }
  return payload
}

export default function AssetAssignmentModal({ open, onClose, onSuccess }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [showResults, setShowResults] = useState(false)
  const [assetResults, setAssetResults] = useState([])
  const [assetsLoading, setAssetsLoading] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState(null)
  const [assignType, setAssignType] = useState('staff')
  const [returnable, setReturnable] = useState(true)
  const [assignmentDate, setAssignmentDate] = useState(new Date().toISOString().split('T')[0])
  const [returnDate, setReturnDate] = useState('')
  const [condition, setCondition] = useState('Excellent')
  const [notes, setNotes] = useState('')
  const [personName, setPersonName] = useState('')
  const [personContact, setPersonContact] = useState('')
  const [staffName, setStaffName] = useState('')
  const [staffDepartment, setStaffDepartment] = useState('')
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [buildingFilter, setBuildingFilter] = useState('')
  const [errors, setErrors] = useState({})
  const [apiError, setApiError] = useState('')
  const [success, setSuccess] = useState(false)
  const [saving, setSaving] = useState(false)
  const [rooms, setRooms] = useState([])
  const [departments, setDepartments] = useState([])
  const [metaLoading, setMetaLoading] = useState(false)
  const searchRef = useRef(null)
  const searchTimer = useRef(null)

  const uniqueBuildings = [...new Set(rooms.map((r) => formatLocationValue(r.building)).filter(Boolean))]
  const filteredRooms = rooms.filter((r) => !buildingFilter || r.building === buildingFilter)

  const loadMeta = useCallback(() => {
    setMetaLoading(true)
    assetsApi.getAssignmentMeta()
      .then((data) => {
        setRooms((data?.rooms || []).map(normalizeRoom))
        setDepartments(normalizeDepartments(data?.departments || []))
      })
      .catch(() => {
        setRooms([])
        setDepartments([])
      })
      .finally(() => setMetaLoading(false))
  }, [])

  useEffect(() => {
    if (open) loadMeta()
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

  const resetForm = () => {
    setSearchQuery('')
    setSelectedAsset(null)
    setAssignType('staff')
    setReturnable(true)
    setReturnDate('')
    setCondition('Excellent')
    setNotes('')
    setPersonName('')
    setPersonContact('')
    setStaffName('')
    setStaffDepartment('')
    setSelectedRoom(null)
    setBuildingFilter('')
    setErrors({})
    setApiError('')
    setAssetResults([])
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const highlightMatch = (text, query) => {
    if (!query.trim()) return text
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    const parts = String(text).split(regex)
    return parts.map((part, i) =>
      regex.test(part) ? (
        <span key={i} className="font-semibold rounded px-0.5" style={{ color: NAVY, backgroundColor: `${GOLD}33` }}>
          {part}
        </span>
      ) : part
    )
  }

  const selectAsset = (asset) => {
    setSelectedAsset(asset)
    setSearchQuery(asset.name)
    setShowResults(false)
    setErrors((e) => ({ ...e, asset: undefined }))
  }

  const validate = (draft = false) => {
    const errs = {}
    if (!selectedAsset) errs.asset = 'Please select an asset'
    if (!draft) {
      if (!assignType) errs.assignType = 'Select assignment type'
      if (assignType === 'personal' && !personName.trim()) errs.personName = 'Required'
      if (assignType === 'staff') {
        if (!staffName.trim()) errs.staffName = 'Enter staff name'
        if (!staffDepartment) errs.staffDepartment = 'Select department'
      }
      if (assignType === 'place' && !selectedRoom) errs.room = 'Select a location'
      if (returnable && !returnDate) errs.returnDate = 'Required for returnable assignments'
      if (!assignmentDate) errs.assignmentDate = 'Required'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const submit = async (draft = false) => {
    setApiError('')
    if (!validate(draft)) return
    setSaving(true)
    try {
      const payload = buildPayload(
        {
          selectedAsset, assignType, returnable, assignmentDate, returnDate, condition, notes,
          personName, personContact, staffName: staffName.trim(), staffDepartment, selectedRoom,
        },
        { draft },
      )
      await assetsApi.createAssignment(payload)
      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        handleClose()
        onSuccess?.()
      }, 1400)
    } catch (err) {
      setApiError(err.message || 'Assignment failed')
    } finally {
      setSaving(false)
    }
  }

  const getStatusColor = (status) => {
    const map = {
      Active: 'bg-emerald-500/20 text-emerald-200',
      'Under Maintenance': 'bg-amber-500/20 text-amber-200',
      Damaged: 'bg-red-500/20 text-red-200',
      Assigned: 'bg-sky-500/20 text-sky-200',
    }
    return map[status] || 'bg-white/10 text-white/80'
  }

  const conditionColors = {
    Excellent: 'border-emerald-500 bg-emerald-50 text-emerald-700',
    Good: 'border-amber-500 bg-amber-50 text-amber-700',
    Fair: 'border-orange-500 bg-orange-50 text-orange-700',
    Poor: 'border-red-500 bg-red-50 text-red-700',
  }

  const assigneeLabel = useMemo(() => {
    if (assignType === 'personal') return personName || 'Personal'
    if (assignType === 'place') return selectedRoom?.label || 'Place'
    return staffName || 'Staff'
  }, [assignType, personName, selectedRoom, staffName])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/55 backdrop-blur-sm py-6 px-4">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-gray-100 my-auto overflow-hidden">
        <div
          className="sticky top-0 z-10 text-white px-6 lg:px-8 py-5 flex items-center justify-between rounded-t-2xl"
          style={{ backgroundColor: NAVY }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: GOLD }}
            >
              <ArrowLeftRight size={20} style={{ color: NAVY }} />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">Create Asset Assignment</h2>
              <p className="text-xs text-white/55 mt-0.5">Assign assets to staff, individuals, or locations</p>
            </div>
          </div>
          <button type="button" onClick={handleClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
            <X size={20} />
          </button>
        </div>

        {apiError && (
          <div className="mx-6 mt-4 flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <AlertTriangle size={16} />
            {apiError}
          </div>
        )}

        <div className="px-6 lg:px-8 py-6 max-h-[min(68vh,640px)] overflow-y-auto relative">
          {success && (
            <div className="absolute inset-0 bg-white/95 backdrop-blur-sm flex items-center justify-center z-20">
              <div className="text-center">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check size={32} className="text-emerald-600" />
                </div>
                <p className="text-xl font-bold" style={{ color: NAVY }}>Asset Assigned Successfully!</p>
                <p className="text-sm text-gray-500 mt-1">
                  {selectedAsset?.name} → {assigneeLabel}
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3 space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className="w-7 h-7 text-[#000435] rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ backgroundColor: GOLD }}
                  >
                    1
                  </span>
                  <h3 className="font-semibold text-sm" style={{ color: NAVY }}>Select Asset</h3>
                  {selectedAsset && (
                    <span className="text-xs text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1">
                      <Check size={12} /> Selected
                    </span>
                  )}
                </div>
                <div className="relative" ref={searchRef}>
                  <div
                    className={`flex items-center border-2 rounded-xl transition-all ${
                      errors.asset ? 'border-red-400' : selectedAsset ? 'border-emerald-500 bg-emerald-50/40' : 'border-gray-200 focus-within:border-[#FEBF10]'
                    }`}
                  >
                    <Search size={18} className="ml-3 text-gray-400 shrink-0" />
                    <input
                      type="text"
                      className="w-full px-3 py-3.5 text-sm bg-transparent outline-none placeholder:text-gray-400"
                      placeholder="Search by name, code, or serial number…"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value)
                        setShowResults(true)
                        setSelectedAsset(null)
                      }}
                      onFocus={() => setShowResults(true)}
                    />
                    {assetsLoading && <Loader2 size={18} className="mr-3 animate-spin text-gray-400" />}
                    {selectedAsset && !assetsLoading && <Check size={18} className="mr-3 text-emerald-500" />}
                  </div>
                  {errors.asset && <p className="text-xs text-red-500 mt-1">{errors.asset}</p>}
                  {showResults && searchQuery.trim() && !selectedAsset && (
                    <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl max-h-56 overflow-y-auto">
                      {assetsLoading ? (
                        <p className="p-4 text-center text-sm text-gray-400">Searching…</p>
                      ) : assetResults.length === 0 ? (
                        <p className="p-4 text-center text-sm text-gray-400">No assets found</p>
                      ) : (
                        assetResults.map((a) => (
                          <button
                            key={a.id}
                            type="button"
                            className="w-full text-left px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-amber-50/60 transition-colors"
                            onClick={() => selectAsset(a)}
                          >
                            <p className="text-sm font-medium" style={{ color: NAVY }}>
                              {highlightMatch(a.name, searchQuery)}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5 font-mono">
                              {highlightMatch(a.code, searchQuery)}
                              {a.serialNumber ? ` · ${a.serialNumber}` : ''}
                            </p>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className="w-7 h-7 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ backgroundColor: NAVY }}
                  >
                    2
                  </span>
                  <h3 className="font-semibold text-sm" style={{ color: NAVY }}>Assign To</h3>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {[
                    { value: 'personal', icon: User, label: 'Personal' },
                    { value: 'place', icon: Building2, label: 'Place' },
                    { value: 'staff', icon: Users, label: 'Staff' },
                  ].map((opt) => {
                    const Icon = opt.icon
                    const active = assignType === opt.value
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        className={`flex flex-col sm:flex-row items-center justify-center gap-2 px-3 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                          active ? 'border-[#FEBF10] shadow-sm' : 'border-gray-200 text-gray-600 hover:border-gray-300 bg-white'
                        }`}
                        style={active ? { backgroundColor: `${GOLD}22`, color: NAVY } : undefined}
                        onClick={() => setAssignType(opt.value)}
                      >
                        <Icon size={20} />
                        {opt.label}
                      </button>
                    )
                  })}
                </div>

                {assignType === 'personal' && (
                  <div className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-100">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Person Name *</label>
                      <input
                        type="text"
                        className="input-field text-sm w-full"
                        placeholder="Full name"
                        value={personName}
                        onChange={(e) => setPersonName(e.target.value)}
                      />
                      {errors.personName && <p className="text-xs text-red-500 mt-0.5">Required</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">ID / Contact (optional)</label>
                      <input
                        type="text"
                        className="input-field text-sm w-full"
                        value={personContact}
                        onChange={(e) => setPersonContact(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {assignType === 'place' && (
                  <div className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-100">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Building</label>
                      <select
                        className="select-field text-sm w-full"
                        value={buildingFilter}
                        onChange={(e) => setBuildingFilter(e.target.value)}
                      >
                        <option value="">All buildings</option>
                        {uniqueBuildings.map((b) => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Room / Location *</label>
                      {metaLoading ? (
                        <p className="text-xs text-gray-400">Loading locations…</p>
                      ) : filteredRooms.length === 0 ? (
                        <p className="text-xs text-gray-500">No locations found in asset register.</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-36 overflow-y-auto">
                          {filteredRooms.map((r) => (
                            <button
                              key={r.id}
                              type="button"
                              className={`text-left px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                                selectedRoom?.id === r.id
                                  ? 'border-[#FEBF10] bg-amber-50'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                              onClick={() => setSelectedRoom(r)}
                            >
                              {formatLocationValue(r.label)}
                            </button>
                          ))}
                        </div>
                      )}
                      {errors.room && <p className="text-xs text-red-500 mt-1">Select a location</p>}
                    </div>
                  </div>
                )}

                {assignType === 'staff' && (
                  <div className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-100">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Staff Name *</label>
                      <input
                        type="text"
                        className={`input-field text-sm w-full ${errors.staffName ? 'border-red-400' : ''}`}
                        placeholder="Enter staff full name"
                        value={staffName}
                        onChange={(e) => {
                          setStaffName(e.target.value)
                          setErrors((prev) => ({ ...prev, staffName: undefined }))
                        }}
                      />
                      {errors.staffName && <p className="text-xs text-red-500 mt-0.5">{errors.staffName}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Department *</label>
                      <select
                        className={`select-field text-sm w-full ${errors.staffDepartment ? 'border-red-400' : ''}`}
                        value={staffDepartment}
                        onChange={(e) => {
                          setStaffDepartment(e.target.value)
                          setErrors((prev) => ({ ...prev, staffDepartment: undefined }))
                        }}
                        disabled={metaLoading}
                      >
                        <option value="">Select department</option>
                        {departments.map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                      {errors.staffDepartment && (
                        <p className="text-xs text-red-500 mt-0.5">{errors.staffDepartment}</p>
                      )}
                      {!metaLoading && departments.length === 0 && (
                        <p className="text-xs text-amber-700 mt-1">No departments in HR — add departments in HR Center first.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Assignment date *</label>
                  <input
                    type="date"
                    className="input-field text-sm w-full"
                    value={assignmentDate}
                    onChange={(e) => setAssignmentDate(e.target.value)}
                  />
                </div>
                {returnable && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Expected return *</label>
                    <input
                      type="date"
                      className={`input-field text-sm w-full ${errors.returnDate ? 'border-red-400' : ''}`}
                      value={returnDate}
                      onChange={(e) => setReturnDate(e.target.value)}
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border-2 ${returnable ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200'}`}
                  onClick={() => setReturnable(true)}
                >
                  Returnable
                </button>
                <button
                  type="button"
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border-2 flex items-center justify-center gap-1 ${!returnable ? 'text-white' : 'border-gray-200'}`}
                  style={!returnable ? { backgroundColor: NAVY, borderColor: NAVY } : undefined}
                  onClick={() => setReturnable(false)}
                >
                  <Lock size={14} /> Fixed
                </button>
              </div>

              <div className="flex gap-2">
                {['Excellent', 'Good', 'Fair', 'Poor'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`flex-1 py-2 rounded-xl text-[10px] font-bold border-2 transition-all ${
                      condition === c ? conditionColors[c] : 'border-gray-200 text-gray-500 bg-transparent'
                    }`}
                    onClick={() => setCondition(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Notes</label>
                <textarea
                  className="input-field resize-none h-16 text-sm w-full"
                  placeholder="Optional notes…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="rounded-2xl p-5 text-white sticky top-0" style={{ backgroundColor: NAVY }}>
                <p className="text-[10px] uppercase tracking-widest text-white/45 font-bold mb-4">Selected Asset</p>
                {!selectedAsset ? (
                  <div className="flex flex-col items-center py-10 text-white/25">
                    <Search size={32} className="mb-2" />
                    <p className="text-xs">Search and select an asset</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div
                      className="w-14 h-14 rounded-xl flex items-center justify-center font-bold text-xl"
                      style={{ backgroundColor: GOLD, color: NAVY }}
                    >
                      {selectedAsset.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-lg leading-tight">{selectedAsset.name}</p>
                      <p className="text-sm font-mono mt-1" style={{ color: GOLD }}>
                        {selectedAsset.code}
                      </p>
                    </div>
                    <dl className="space-y-2 text-xs text-white/65">
                      <div className="flex justify-between gap-2">
                        <dt>Serial</dt>
                        <dd className="text-white/90 font-mono">{selectedAsset.serialNumber || 'N/A'}</dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt>Category</dt>
                        <dd className="text-white/90">{selectedAsset.category}</dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt>Location</dt>
                        <dd className="text-white/90 text-right max-w-[55%]">
                          {formatLocationValue(selectedAsset.location) || '—'}
                        </dd>
                      </div>
                      <div className="flex justify-between items-center gap-2">
                        <dt>Status</dt>
                        <dd>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getStatusColor(selectedAsset.status)}`}>
                            {selectedAsset.status}
                          </span>
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt>Value</dt>
                        <dd className="font-semibold text-white">RWF {formatRwf(selectedAsset.value)}</dd>
                      </div>
                    </dl>
                  </div>
                )}
              </div>

              {selectedAsset?.status === 'Assigned' && (
                <div className="mt-3 flex gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                  This asset is already assigned. A new assignment will mark it assigned again.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 lg:px-8 py-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleClose}
            className="text-sm font-medium text-gray-500 hover:text-gray-800 px-3 py-2 rounded-lg"
            disabled={saving}
          >
            Cancel
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => submit(true)}
              disabled={saving}
              className="px-4 py-2.5 text-sm font-semibold text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50"
            >
              Save Draft
            </button>
            <button
              type="button"
              onClick={() => submit(false)}
              disabled={saving}
              className="font-semibold px-6 py-2.5 rounded-xl transition-all flex items-center gap-2 text-[#000435] disabled:opacity-50 shadow-lg"
              style={{ backgroundColor: GOLD }}
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <ArrowLeftRight size={18} />}
              Assign Asset
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
