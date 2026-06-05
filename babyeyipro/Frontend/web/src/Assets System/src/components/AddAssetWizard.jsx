import { useState, useEffect, useRef, useMemo } from 'react'
import { X, Check, ChevronLeft, ChevronRight, Save, Plus, AlertCircle, Loader2, Boxes } from 'lucide-react'
import QRCode from '../../../assets_portal/components/AssetQrCode'
import assetsApi, { formToAssetPayload } from '../../../assets_portal/services/assetsApi'
import { FUNDING_SOURCES, DEPRECIATION_MODES } from '../../../assets_portal/utils/assetsConstants'
import { computeTotalBalance, computeDepreciation, formatRwf } from '../../../assets_portal/utils/assetsCalculations'
import { buildAssetQrValue } from '../../../assets_portal/utils/assetsQr'
import {
  assetToForm,
  currentRegisterYear,
  formatRegisterTimestamp,
  categoryTypeLabel,
} from '../../../assets_portal/utils/assetFormMapper'
import RegisterYearPickStep from './RegisterYearPickStep'

const WIZARD_INPUT = 'assets-wizard-input'
const formatCurrency = formatRwf

const STEPS = [
  { id: 1, label: 'Basic Info', color: 'border-amber-500' },
  { id: 2, label: 'Supplier', color: 'border-emerald-500' },
  { id: 3, label: 'Purchase', color: 'border-blue-500' },
  { id: 4, label: 'Depreciation', color: 'border-purple-500' },
  { id: 5, label: 'Quantity', color: 'border-rose-500' },
  { id: 6, label: 'Summary', color: 'border-cyan-500' },
  { id: 7, label: 'Review', color: 'border-amber-500' },
]

const FALLBACK_CATEGORIES = ['IT Equipment', 'Furniture', 'Vehicles', 'Electronics', 'Machinery', 'Laboratory Equipment']
const MATERIALS = ['WOOD', 'METAL', 'PLASTIC', 'GLASS', 'FABRIC', 'LEATHER', 'OTHER']
const CONDITIONS = ['GOOD', 'FAIR', 'DAMAGED']

const PURCHASE_YEARS = (() => {
  const end = currentRegisterYear() + 2
  return Array.from({ length: 35 }, (_, i) => end - i)
})()
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1)

function ReadonlyRwfLabel({ label, value, accent }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-re-text-muted mb-1.5">{label}</p>
      <div
        className={`rounded-xl border px-4 py-3 text-lg font-bold tabular-nums ${
          accent ? 'bg-[#000435] text-[#FEBF10] border-[#000435]' : 'bg-re-bg border-black/10 text-re-text'
        }`}
      >
        RWF {formatRwf(value)}
      </div>
    </div>
  )
}

const EMPTY_FORM = {
  location: '', assetName: '', labelTag: '', categoryType: '', categoryTypeOther: '', description: '',
  supplier: '', upi: '', sku: '', serialNumber: '', brand: '', material: '', materialOther: '', size: '',
  purchaseYear: '', purchaseMonth: '', purchaseDay: '', unitPrice: '', openingAmount: '', invoice: '',
  fundingSource: '', fundingOther: '',
  depMode: 'Diminishing', depRate: '', accumulatedDep: '', decimalDep: 0, annualDep: 0, totalDep: 0, netBookValue: 0, depYears: '',
  quantity: 1, unit: '', condition: 'GOOD', notes: '',
}

export default function AddAssetWizard({
  open,
  onClose,
  onSuccess,
  mode = 'create',
  assetId = null,
}) {
  const isEdit = mode === 'edit' && assetId != null
  const [step, setStep] = useState(0)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [activeRegisterYear, setActiveRegisterYear] = useState(
    () => String(currentRegisterYear())
  )
  const [loadingAsset, setLoadingAsset] = useState(false)
  const [recordedAt, setRecordedAt] = useState(null)
  const [errors, setErrors] = useState({})
  const [success, setSuccess] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [savedCode, setSavedCode] = useState('')
  const [meta, setMeta] = useState(null)

  const previewCode = savedCode || `AST-${Date.now().toString(36).toUpperCase().slice(-8)}`
  const previewQrValue = buildAssetQrValue({
    asset_code: previewCode,
    label_tag: form.labelTag,
    serial_number: form.serialNumber,
  })

  const categories = meta?.categories?.length ? meta.categories : FALLBACK_CATEGORIES

  const totalBalance = useMemo(
    () => computeTotalBalance({ unitPrice: form.unitPrice, openingAmount: form.openingAmount }),
    [form.unitPrice, form.openingAmount, form.quantity]
  )

  const depCalc = useMemo(
    () => computeDepreciation({
      totalBalance,
      depRatePercent: form.depRate,
      accumulatedDepreciation: form.accumulatedDep,
    }),
    [totalBalance, form.depRate, form.accumulatedDep]
  )

  useEffect(() => {
    if (!open) return
    setSaveError('')
    setSuccess(false)
    setStep(0)
    setErrors({})
    const yr = String(currentRegisterYear())
    setActiveRegisterYear(yr)
    Promise.all([
      assetsApi.getMeta().catch(() => null),
      assetsApi.listCategories().catch(() => []),
    ]).then(([metaData, catList]) => {
      const names = (Array.isArray(catList) ? catList : []).map((c) => c.name).filter(Boolean)
      setMeta(metaData ? { ...metaData, categories: names.length ? names : metaData.categories } : null)
    })

    if (isEdit) {
      setLoadingAsset(true)
      assetsApi.getAsset(assetId)
        .then((asset) => {
          const mapped = assetToForm(asset)
          if (mapped) {
            setForm({ ...EMPTY_FORM, ...mapped })
            setActiveRegisterYear(String(mapped.registerYear || yr))
            setRecordedAt(mapped.createdAt)
            setSavedCode(mapped.assetCode || '')
          }
        })
        .catch((err) => setSaveError(err?.message || 'Failed to load asset'))
        .finally(() => setLoadingAsset(false))
    } else {
      setForm({
        ...EMPTY_FORM,
        purchaseYear: yr,
        purchaseMonth: String(new Date().getMonth() + 1),
        purchaseDay: String(new Date().getDate()),
      })
      setRecordedAt(null)
      setSavedCode('')
    }
  }, [open, isEdit, assetId])

  useEffect(() => {
    setForm((f) => ({
      ...f,
      decimalDep: depCalc.decimalDep,
      annualDep: depCalc.annualDep,
      totalDep: depCalc.totalDep,
      netBookValue: depCalc.netBookValue,
    }))
  }, [depCalc.decimalDep, depCalc.annualDep, depCalc.totalDep, depCalc.netBookValue])

  const updateField = (field, value) => {
    setForm(f => ({ ...f, [field]: value }))
    if (errors[field]) setErrors(e => ({ ...e, [field]: undefined }))
  }

  const validateStep = (s) => {
    const errs = {}
    if (s === 1) {
      if (!form.location.trim()) errs.location = 'Required'
      if (!form.assetName.trim()) errs.assetName = 'Required'
      if (!form.categoryType) errs.categoryType = 'Required'
      if (form.categoryType === 'OTHER' && !form.categoryTypeOther.trim()) errs.categoryTypeOther = 'Specify category type'
    }
    if (s === 3) {
      if (!form.purchaseYear) errs.purchaseYear = 'Required'
      if (!form.purchaseMonth) errs.purchaseMonth = 'Required'
      if (!form.purchaseDay) errs.purchaseDay = 'Required'
      if (!form.unitPrice && !form.openingAmount) errs.unitPrice = 'Enter unit price or opening amount'
      if (form.fundingSource === 'Other' && !form.fundingOther.trim()) errs.fundingOther = 'Specify funding source'
    }
    if (s === 4) {
      if (!form.depRate) errs.depRate = 'Required'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const nextStep = () => {
    if (validateStep(step)) setStep(s => Math.min(s + 1, 7))
  }
  const prevStep = () => setStep((s) => Math.max(s - 1, 0))

  const goToStep = (s) => {
    if (s <= 0) {
      setStep(0)
      return
    }
    if (s < step) setStep(s)
    else {
      let valid = true
      for (let i = step; i < s; i++) {
        if (!validateStep(i)) { valid = false; break }
      }
      if (valid) setStep(s)
    }
  }

  const persistAsset = async (draft = false) => {
    setSaving(true)
    setSaveError('')
    try {
      const payload = formToAssetPayload(form, {
        draft,
        registerYear: Number(activeRegisterYear) || currentRegisterYear(),
      })
      const data = isEdit
        ? await assetsApi.updateAsset(assetId, payload)
        : await assetsApi.createAsset(payload)
      setSavedCode(data.asset_code || data.code || previewCode)
      if (data.created_at) setRecordedAt(data.created_at)
      setSuccess(true)
      onSuccess?.(data)
      return true
    } catch (err) {
      setSaveError(err?.message || (isEdit ? 'Failed to update asset' : 'Failed to save asset'))
      return false
    } finally {
      setSaving(false)
    }
  }

  const handleSaveDraft = async () => {
    const ok = await persistAsset(true)
    if (ok) {
      setTimeout(() => {
        setSuccess(false)
        onClose()
      }, 1200)
    }
  }

  const handleSave = async () => {
    if (!validateStep(1) || !validateStep(3) || !validateStep(4)) {
      setSaveError('Complete required fields before saving.')
      return
    }
    const ok = await persistAsset(false)
    if (ok) {
      setTimeout(() => {
        setSuccess(false)
        setSavedCode('')
        onClose()
      }, 1500)
    }
  }

  const handleSaveAndAdd = async () => {
    if (!validateStep(1) || !validateStep(3) || !validateStep(4)) {
      setSaveError('Complete required fields before saving.')
      return
    }
    const ok = await persistAsset(false)
    if (ok) {
      setTimeout(() => {
        setSuccess(false)
        setSavedCode('')
        setForm({ ...EMPTY_FORM })
        setStep(1)
        setErrors({})
      }, 1200)
    }
  }

  const nbvPercent = totalBalance > 0 ? (form.netBookValue / totalBalance) * 100 : 100
  const depPercent = totalBalance > 0 ? (form.totalDep / totalBalance) * 100 : 0

  const generateSKU = () => {
    const prefix = categoryTypeLabel(form).substring(0, 3).toUpperCase() || 'AST'
    const num = Math.floor(1000 + Math.random() * 9000)
    updateField('sku', `${prefix}-${num}`)
  }

  const requiredStyle = (field) => `block text-sm font-semibold mb-1.5 ${errors[field] ? 'text-red-600' : 'text-re-text'}`

  const fieldCls = (field) => `${WIZARD_INPUT} ${errors[field] ? 'assets-wizard-input-error' : ''}`

  const AnimatedNumber = ({ value, suffix = '' }) => {
    const [display, setDisplay] = useState(0)
    const animRef = useRef(null)

    useEffect(() => {
      const target = parseFloat(value) || 0
      if (animRef.current) cancelAnimationFrame(animRef.current)
      const start = display
      const duration = 800
      const startTime = performance.now()
      const animate = (time) => {
        const elapsed = time - startTime
        const progress = Math.min(elapsed / duration, 1)
        const eased = 1 - Math.pow(1 - progress, 3)
        setDisplay(start + (target - start) * eased)
        if (progress < 1) animRef.current = requestAnimationFrame(animate)
      }
      animRef.current = requestAnimationFrame(animate)
      return () => { if (animRef.current) cancelAnimationFrame(animRef.current) }
    }, [value])

    return <span>{formatCurrency(Math.round(display))}{suffix}</span>
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-[#0B1530]/60 backdrop-blur-md overflow-y-auto">
      <div
        className="relative flex flex-col w-full max-w-[min(96vw,1280px)] h-[min(88vh,900px)] max-h-[calc(100vh-2rem)] min-h-[520px] bg-re-bg rounded-[28px] shadow-2xl border border-black/10 overflow-hidden my-auto"
        style={{ fontFamily: "'Montserrat', sans-serif" }}
      >
        <div className="shrink-0 bg-[#000435] px-5 sm:px-8 py-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="h-12 w-12 shrink-0 rounded-2xl bg-[#FEBF10] flex items-center justify-center shadow-lg shadow-[#FEBF10]/20">
              <Boxes size={22} className="text-[#0B1530]" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                {isEdit ? 'Edit Asset' : 'Register New Asset'}
              </h2>
              <p className="text-[11px] sm:text-xs text-white/55 mt-0.5 font-medium">
                {step === 0
                  ? 'Choose register year to continue'
                  : `Step ${step} of 7 · ${STEPS.find((s) => s.id === step)?.label}`}
                {isEdit && savedCode && step > 0 ? ` · ${savedCode}` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="p-2.5 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-all shrink-0"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {step > 0 && (
        <div className="shrink-0 bg-white border-b border-black/5 px-4 sm:px-8 py-3 overflow-x-auto">
          <div className="flex items-center gap-1 min-w-[720px] w-full max-w-5xl mx-auto">
            {STEPS.map((s, i) => {
              const isActive = s.id === step
              const isCompleted = s.id < step
              return (
                <div key={s.id} className="flex items-center flex-1 last:flex-none">
                  <button type="button" onClick={() => goToStep(s.id)} className="flex flex-col items-center gap-1 group">
                    <div
                      className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        isActive
                          ? 'bg-[#FEBF10] text-[#0B1530] ring-4 ring-[#FEBF10]/25'
                          : isCompleted
                            ? 'bg-[#000435] text-[#FEBF10]'
                            : 'bg-re-bg text-re-text-muted ring-1 ring-black/5'
                      }`}
                    >
                      {isCompleted ? <Check size={14} strokeWidth={3} /> : s.id}
                    </div>
                    <span
                      className={`text-[9px] sm:text-[10px] font-semibold whitespace-nowrap hidden md:block ${
                        isActive ? 'text-[#000435]' : isCompleted ? 'text-[#000435]/70' : 'text-re-text-muted'
                      }`}
                    >
                      {s.label}
                    </span>
                  </button>
                  {i < STEPS.length - 1 && (
                    <div className={`flex-1 h-px mx-1 sm:mx-2 ${s.id < step ? 'bg-[#FEBF10]' : 'bg-black/10'}`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 sm:px-10 py-6">
          {step === 0 && (
            <RegisterYearPickStep
              value={activeRegisterYear}
              onChange={setActiveRegisterYear}
              onContinue={() => setStep(1)}
              continueLabel={isEdit ? 'Continue to edit asset' : 'Continue to register asset'}
              title={isEdit ? 'Asset register year' : 'Which register year are you adding to?'}
              subtitle="Calendar year for this asset register. Duplicates are checked within the same year only."
              disabled={loadingAsset}
              footerNote={
                isEdit && recordedAt
                  ? `Originally recorded: ${formatRegisterTimestamp(recordedAt)}`
                  : 'Date and time are stamped automatically when you save.'
              }
            />
          )}
          {step > 0 && loadingAsset && (
            <div className="flex items-center justify-center gap-2 py-16 text-re-text-muted">
              <Loader2 size={22} className="animate-spin text-[#FEBF10]" />
              <span className="text-sm font-medium">Loading asset…</span>
            </div>
          )}
          {step > 0 && !loadingAsset && saveError && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <span>{saveError}</span>
            </div>
          )}
          {step > 0 && !loadingAsset && success && (
            <div className="absolute inset-0 bg-white/90 backdrop-blur-sm rounded-2xl flex items-center justify-center z-20">
              <div className="text-center">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check size={32} className="text-emerald-600" />
                </div>
                <p className="text-xl font-bold text-re-text">{isEdit ? 'Asset updated successfully' : 'Asset saved successfully'}</p>
                <p className="text-sm text-re-text-muted mt-1 font-mono">Code: {savedCode || previewCode}</p>
              </div>
            </div>
          )}

          {/* STEP 1: Basic Information */}
          {step > 0 && !loadingAsset && step === 1 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-5">
                <h3 className="text-lg font-semibold text-navy flex items-center gap-2">
                  <span className="w-7 h-7 bg-amber-500 text-white rounded-lg flex items-center justify-center text-sm font-bold">1</span>
                  Asset Basic Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={requiredStyle('location')}>Location *</label>
                    <input
                      type="text"
                      className={fieldCls('location')}
                      placeholder="e.g. KIMIRONKO, P1 MC, Main Office"
                      value={form.location}
                      onChange={(e) => updateField('location', e.target.value)}
                    />
                    {errors.location && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle size={12} /> Required</p>}
                  </div>
                  <div>
                    <label className={requiredStyle('assetName')}>Asset Name *</label>
                    <input type="text" className={fieldCls('assetName')}
                      placeholder="e.g. Dell Latitude 5420" value={form.assetName} onChange={e => updateField('assetName', e.target.value)} />
                    {errors.assetName && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle size={12} /> Required</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Label / Tag</label>
                    <input type="text" className={WIZARD_INPUT} placeholder="e.g. IT-LAP-001" value={form.labelTag} onChange={e => updateField('labelTag', e.target.value)} />
                  </div>
                  <div className={form.categoryType === 'OTHER' ? 'sm:col-span-2' : ''}>
                    <label className={requiredStyle('categoryType')}>Category type *</label>
                    <select
                      className={fieldCls('categoryType')}
                      value={form.categoryType}
                      onChange={(e) => updateField('categoryType', e.target.value)}
                    >
                      <option value="">Select category type</option>
                      {categories.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                      <option value="OTHER">Other (specify)</option>
                    </select>
                    {errors.categoryType && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle size={12} /> Required</p>}
                  </div>
                  {form.categoryType === 'OTHER' && (
                    <div>
                      <label className={requiredStyle('categoryTypeOther')}>Specify category type *</label>
                      <input
                        type="text"
                        className={fieldCls('categoryTypeOther')}
                        placeholder="e.g. Sports equipment"
                        value={form.categoryTypeOther}
                        onChange={(e) => updateField('categoryTypeOther', e.target.value)}
                      />
                      {errors.categoryTypeOther && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle size={12} /> Required</p>}
                    </div>
                  )}
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea className={`${WIZARD_INPUT} resize-none h-20`} placeholder="Optional description..." value={form.description} onChange={e => updateField('description', e.target.value)} />
                  </div>
                </div>
              </div>
              {/* Live Preview */}
              <div className="rounded-2xl bg-[#000435] text-white p-5 space-y-3 ring-1 ring-white/10 shadow-xl">
                <p className="text-[10px] text-[#FEBF10] uppercase tracking-widest font-bold">Live preview</p>
                <div className="space-y-2">
                  <div className="w-12 h-12 bg-[#FEBF10] rounded-xl flex items-center justify-center">
                    <span className="text-[#0B1530] font-bold text-lg">{form.assetName ? form.assetName.charAt(0).toUpperCase() : '?'}</span>
                  </div>
                  <p className="font-semibold text-base">{form.assetName || 'Asset name'}</p>
                  <p className="text-xs text-white/60">Code: <span className="font-mono text-[#FEBF10]">{previewCode}</span></p>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="px-2 py-0.5 bg-white/10 rounded-lg">{categoryTypeLabel(form) || 'Category type'}</span>
                  </div>
                  <p className="text-xs text-white/40 mt-2">{form.location || 'No location set'}</p>
                  <div className="pt-3 border-t border-white/10 flex justify-center rounded-xl bg-white/5 p-3">
                    <QRCode value={previewQrValue} size={88} bgColor="#000435" fgColor="#FEBF10" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Supplier & Identifiers */}
          {step > 0 && !loadingAsset && step === 2 && (
            <div className="max-w-3xl space-y-5">
              <h3 className="text-lg font-semibold text-[#000435] flex items-center gap-2">
                <span className="w-7 h-7 bg-emerald-500 text-white rounded-lg flex items-center justify-center text-sm font-bold">2</span>
                Supplier & Identifiers
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-[#000435] mb-1.5">Supplier</label>
                  <input
                    type="text"
                    className={WIZARD_INPUT}
                    placeholder="Enter supplier name manually"
                    value={form.supplier}
                    onChange={(e) => updateField('supplier', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#000435] mb-1.5">UPI (Unique Product ID)</label>
                  <input type="text" className={WIZARD_INPUT} placeholder="UPI-..." value={form.upi} onChange={(e) => updateField('upi', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#000435] mb-1.5">SKU</label>
                  <div className="flex gap-2">
                    <input type="text" className={WIZARD_INPUT} placeholder="Auto or manual" value={form.sku} onChange={(e) => updateField('sku', e.target.value)} />
                    <button type="button" onClick={generateSKU} className="px-3 py-2 rounded-xl border border-black/10 bg-re-bg text-sm font-semibold text-[#000435] hover:bg-[#FEBF10]/20 transition-colors shrink-0">
                      Generate
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#000435] mb-1.5">Serial Number</label>
                  <input type="text" className={WIZARD_INPUT} placeholder="SN-..." value={form.serialNumber} onChange={(e) => updateField('serialNumber', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#000435] mb-1.5">Brand / Manufacturer</label>
                  <input type="text" className={WIZARD_INPUT} placeholder="e.g. Dell" value={form.brand} onChange={(e) => updateField('brand', e.target.value)} />
                </div>
                <div className={form.material === 'OTHER' ? 'sm:col-span-2' : ''}>
                  <label className="block text-sm font-semibold text-[#000435] mb-1.5">Material</label>
                  <select className={WIZARD_INPUT} value={form.material} onChange={(e) => updateField('material', e.target.value)}>
                    <option value="">Select material</option>
                    {MATERIALS.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                {form.material === 'OTHER' && (
                  <div>
                    <label className="block text-sm font-semibold text-[#000435] mb-1.5">Specify material</label>
                    <input
                      type="text"
                      className={WIZARD_INPUT}
                      placeholder="e.g. Composite, Ceramic"
                      value={form.materialOther}
                      onChange={(e) => updateField('materialOther', e.target.value)}
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-semibold text-[#000435] mb-1.5">Size</label>
                  <input type="text" className={WIZARD_INPUT} placeholder="e.g. 15.6 inch" value={form.size} onChange={(e) => updateField('size', e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Purchase Details */}
          {step > 0 && !loadingAsset && step === 3 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-5">
                <h3 className="text-lg font-semibold text-navy flex items-center gap-2">
                  <span className="w-7 h-7 bg-blue-500 text-white rounded-lg flex items-center justify-center text-sm font-bold">3</span>
                  Purchase Details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Purchase Date</label>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Year *</label>
                        <select className={`select-field ${errors.purchaseYear ? 'border-red-400' : ''}`} value={form.purchaseYear} onChange={e => updateField('purchaseYear', e.target.value)}>
                          <option value="">Year</option>
                          {PURCHASE_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Month *</label>
                        <select className={`select-field ${errors.purchaseMonth ? 'border-red-400' : ''}`} value={form.purchaseMonth} onChange={e => updateField('purchaseMonth', e.target.value)}>
                          <option value="">Month</option>
                          {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Day *</label>
                        <select className={`select-field ${errors.purchaseDay ? 'border-red-400' : ''}`} value={form.purchaseDay} onChange={e => updateField('purchaseDay', e.target.value)}>
                          <option value="">Day</option>
                          {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <ReadonlyRwfLabel label="Purchase Unit Price (RWF)" value={form.unitPrice || 0} />
                    <ReadonlyRwfLabel label="Opening Amount (RWF)" value={form.openingAmount || 0} />
                  </div>
                  <p className="text-xs text-re-text-muted sm:col-span-2 -mt-2">
                    Enter values below — TOTAL BALANCE = purchase unit price + opening amount.
                  </p>
                  <div>
                    <label className={`block text-sm font-semibold mb-1 ${errors.unitPrice ? 'text-red-600' : 'text-re-text-muted'}`}>
                      Enter purchase unit price (RWF)
                    </label>
                    <input
                      type="number"
                      className={fieldCls('unitPrice')}
                      placeholder="0"
                      value={form.unitPrice}
                      onChange={(e) => updateField('unitPrice', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-re-text-muted mb-1">Enter opening amount (RWF)</label>
                    <input
                      type="number"
                      className={WIZARD_INPUT}
                      placeholder="0"
                      value={form.openingAmount}
                      onChange={(e) => updateField('openingAmount', e.target.value)}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <ReadonlyRwfLabel label="TOTAL BALANCE" value={totalBalance} accent />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Number</label>
                    <input type="text" className={WIZARD_INPUT} placeholder="INV-001" value={form.invoice} onChange={e => updateField('invoice', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Funding Source</label>
                    <select className={WIZARD_INPUT} value={form.fundingSource} onChange={(e) => updateField('fundingSource', e.target.value)}>
                      <option value="">Select source</option>
                      {FUNDING_SOURCES.map((f) => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>
                  {form.fundingSource === 'Other' && (
                    <div className="sm:col-span-2">
                      <label className={requiredStyle('fundingOther')}>Specify funding source *</label>
                      <input
                        type="text"
                        className={fieldCls('fundingOther')}
                        value={form.fundingOther}
                        onChange={(e) => updateField('fundingOther', e.target.value)}
                      />
                      {errors.fundingOther && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle size={12} /> Required</p>}
                    </div>
                  )}
                  {errors.unitPrice && <p className="text-xs text-red-500 sm:col-span-2 flex items-center gap-1"><AlertCircle size={12} /> {errors.unitPrice}</p>}
                </div>
              </div>
              <div className="space-y-4">
                <div className="rounded-2xl bg-[#000435] text-white p-5 ring-1 ring-white/10">
                  <p className="text-[10px] text-[#FEBF10] font-bold uppercase tracking-widest mb-3">Purchase summary</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-white/60">Unit price</span><span className="font-semibold">RWF {formatRwf(form.unitPrice)}</span></div>
                    <div className="flex justify-between"><span className="text-white/60">Opening amount</span><span className="font-semibold">RWF {formatRwf(form.openingAmount)}</span></div>
                    <div className="flex justify-between border-t border-white/10 pt-2"><span className="text-[#FEBF10]">Total balance</span><span className="font-bold text-[#FEBF10]">RWF {formatRwf(totalBalance)}</span></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Depreciation */}
          {step > 0 && !loadingAsset && step === 4 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-5">
                <h3 className="text-lg font-semibold text-navy flex items-center gap-2">
                  <span className="w-7 h-7 bg-purple-500 text-white rounded-lg flex items-center justify-center text-sm font-bold">4</span>
                  Depreciation & Financial Calculation
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <ReadonlyRwfLabel label="TOTAL BALANCE" value={totalBalance} accent />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-re-text mb-1">accumulated DEPRECIATION (RWF)</label>
                    <input
                      type="number"
                      className={WIZARD_INPUT}
                      placeholder="0"
                      value={form.accumulatedDep}
                      onChange={(e) => updateField('accumulatedDep', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-semibold mb-1 ${errors.depRate ? 'text-red-600' : 'text-re-text'}`}>
                      Depreciation rate (%) *
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        className={`${fieldCls('depRate')} pr-8`}
                        placeholder="e.g. 5 for buildings, 25 for furniture"
                        value={form.depRate}
                        onChange={(e) => updateField('depRate', e.target.value)}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-re-text-muted">%</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-re-text-muted mb-1">Depreciation mode</label>
                    <select className={WIZARD_INPUT} value={form.depMode} onChange={(e) => updateField('depMode', e.target.value)}>
                      {DEPRECIATION_MODES.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-re-text-muted mb-1">decimal depr</label>
                    <input type="text" className={`${WIZARD_INPUT} bg-re-bg`} readOnly value={form.decimalDep.toFixed(4)} />
                  </div>
                  <ReadonlyRwfLabel label="Annual depreciation" value={Math.round(form.annualDep)} />
                  <ReadonlyRwfLabel label="TOTAL DEPRECIATION" value={Math.round(form.totalDep)} />
                  <ReadonlyRwfLabel label="NET BOOK VALUE" value={Math.round(form.netBookValue)} />
                </div>
              </div>
              <div className="space-y-4">
                <div className="rounded-2xl border border-[#FEBF10]/30 bg-[#FEBF10]/10 p-5">
                  <p className="text-xs text-[#000435] font-bold uppercase tracking-wider mb-3">Formulas (Excel)</p>
                  <ul className="text-xs text-re-text space-y-1.5 font-medium">
                    <li>Annual depreciation = TOTAL BALANCE × decimal depr</li>
                    <li>TOTAL DEPRECIATION = accumulated + Annual depreciation</li>
                    <li>NET BOOK VALUE = TOTAL BALANCE − TOTAL DEPRECIATION</li>
                  </ul>
                  <div className="mt-4 space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-re-text-muted">Total balance</span><span className="font-semibold">RWF {formatRwf(totalBalance)}</span></div>
                    <div className="flex justify-between"><span className="text-re-text-muted">Annual depreciation</span><span className="font-semibold text-amber-700">RWF {formatRwf(form.annualDep)}</span></div>
                    <div className="flex justify-between"><span className="text-re-text-muted">Total depreciation</span><span className="font-semibold">RWF {formatRwf(form.totalDep)}</span></div>
                    <div className="border-t border-[#FEBF10]/30 pt-2 flex justify-between">
                      <span className="font-medium">Net book value</span>
                      <span className={`font-bold ${nbvPercent > 50 ? 'text-emerald-600' : 'text-amber-700'}`}>RWF {formatRwf(form.netBookValue)}</span>
                    </div>
                  </div>
                  <div className="mt-4">
                    {/* Progress Bar */}
                    <div className="pt-2">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Asset Value</span>
                        <span>{Math.round(nbvPercent)}% remaining</span>
                      </div>
                      <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-500 ${
                          nbvPercent > 50 ? 'bg-emerald-500' : nbvPercent > 25 ? 'bg-amber-500' : 'bg-red-500'
                        }`} style={{ width: `${nbvPercent}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: Quantity & Inventory */}
          {step > 0 && !loadingAsset && step === 5 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-5">
                <h3 className="text-lg font-semibold text-navy flex items-center gap-2">
                  <span className="w-7 h-7 bg-rose-500 text-white rounded-lg flex items-center justify-center text-sm font-bold">5</span>
                  Quantity & Inventory
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => updateField('quantity', Math.max(1, (parseInt(form.quantity) || 1) - 1))}
                        className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center text-lg font-bold text-gray-600 transition-colors">−</button>
                      <input type="number" className={`${WIZARD_INPUT} text-center font-bold text-lg`} value={form.quantity} onChange={e => updateField('quantity', Math.max(1, parseInt(e.target.value) || 1))} />
                      <button type="button" onClick={() => updateField('quantity', (parseInt(form.quantity) || 1) + 1)}
                        className="w-10 h-10 bg-amber-500 hover:bg-amber-600 text-white rounded-lg flex items-center justify-center text-lg font-bold transition-colors">+</button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                    <input
                      type="text"
                      className={WIZARD_INPUT}
                      placeholder="e.g. PCS, SET, METER"
                      value={form.unit}
                      onChange={(e) => updateField('unit', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Condition</label>
                    <div className="flex gap-2">
                      {CONDITIONS.map(c => {
                        const colors = { GOOD: 'bg-emerald-100 text-emerald-700 border-emerald-500', FAIR: 'bg-amber-100 text-amber-700 border-amber-500', DAMAGED: 'bg-red-100 text-red-700 border-red-500' }
                        return (
                          <button key={c} type="button"
                            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold border-2 transition-all ${
                              form.condition === c ? colors[c] : 'border-gray-200 text-gray-500 hover:border-gray-300'
                            }`}
                            onClick={() => updateField('condition', c)}>
                            {c}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <textarea className={`${WIZARD_INPUT} resize-none h-20`} placeholder="Additional notes..." value={form.notes} onChange={e => updateField('notes', e.target.value)} />
                  </div>
                </div>
                <div className="bg-amber-50 rounded-xl p-4 border border-amber-200 flex items-center gap-3 cursor-pointer hover:bg-amber-100 transition-colors">
                  <Plus size={18} className="text-amber-600" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">Quick Bulk Add</p>
                    <p className="text-xs text-amber-700">Add multiple identical assets at once</p>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-rose-50 to-rose-100 rounded-xl p-5 border border-rose-200">
                <p className="text-xs text-rose-600 font-semibold uppercase tracking-wider">Inventory Summary</p>
                <div className="mt-4 space-y-3">
                  <div className="text-center">
                    <p className="text-4xl font-bold text-navy">{form.quantity || 1}</p>
                    <p className="text-sm text-gray-500">{form.unit || '—'}</p>
                  </div>
                  <div className="border-t border-rose-200 pt-3 space-y-2">
                    <div className="flex justify-between text-sm"><span className="text-gray-600">Total Value</span><span className="font-bold text-navy">RWF {formatCurrency((parseFloat(form.unitPrice) || 0) * (parseInt(form.quantity) || 1))}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-gray-600">Condition</span><span className={`font-semibold ${form.condition === 'GOOD' ? 'text-emerald-600' : form.condition === 'FAIR' ? 'text-amber-600' : 'text-red-600'}`}>{form.condition}</span></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: Balance & Summary */}
          {step > 0 && !loadingAsset && step === 6 && (
            <div className="rounded-2xl border border-[#FEBF10]/60 bg-gradient-to-br from-[#FEBF10]/25 via-amber-100 to-[#FEBF10]/40 p-5 sm:p-6 shadow-inner space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-lg font-bold text-[#000435] flex items-center gap-2">
                  <span className="w-8 h-8 bg-[#000435] text-[#FEBF10] rounded-xl flex items-center justify-center text-sm font-bold shadow-md">6</span>
                  Balance & Financial Summary
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#000435]/70 bg-white/70 px-3 py-1 rounded-full border border-[#000435]/10">
                  Purchase + opening = total balance
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 lg:gap-5">
                <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { label: 'Opening Amount', value: form.openingAmount },
                    { label: 'Purchase Unit Price', value: form.unitPrice },
                    { label: 'Total Balance', value: totalBalance, highlight: true },
                    { label: 'Total Depreciation', value: Math.round(form.totalDep) },
                  ].map((card) => (
                    <div
                      key={card.label}
                      className={`rounded-2xl p-5 border shadow-md transition-shadow hover:shadow-lg ${
                        card.highlight
                          ? 'bg-white border-[#000435]/20 ring-2 ring-[#000435]/15'
                          : 'bg-white/95 border-[#000435]/10 backdrop-blur-sm'
                      }`}
                    >
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#000435]/55">{card.label}</p>
                      <p className="text-xs text-[#000435]/40 mt-0.5 mb-2">RWF</p>
                      <p className="text-2xl sm:text-3xl font-bold tabular-nums text-[#000435] leading-tight">
                        <AnimatedNumber value={card.value} />
                      </p>
                    </div>
                  ))}
                  <div className="sm:col-span-2 rounded-2xl p-5 bg-white border-2 border-[#000435]/20 shadow-lg ring-1 ring-[#FEBF10]">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#000435]/55">Net Book Value</p>
                    <p className="text-xs text-[#000435]/40 mt-0.5 mb-2">RWF</p>
                    <p className="text-3xl sm:text-4xl font-bold tabular-nums text-[#000435] leading-tight">
                      <AnimatedNumber value={Math.round(form.netBookValue)} />
                    </p>
                    <p className="text-xs font-medium text-[#000435]/55 mt-2">{Math.round(nbvPercent)}% of total balance remaining</p>
                  </div>
                </div>

                <div className="lg:col-span-2 rounded-2xl bg-white/90 backdrop-blur border border-[#000435]/15 p-5 sm:p-6 shadow-md flex flex-col justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#000435]/55">Financial snapshot</p>
                    <p className="text-xs text-[#000435]/45 mt-1 mb-4">Live totals from steps 3–4</p>
                    <div className="space-y-4">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#000435]/50">Total balance</p>
                        <p className="text-2xl font-bold tabular-nums text-[#000435] mt-1">
                          RWF <AnimatedNumber value={Math.round(totalBalance)} />
                        </p>
                      </div>
                      <div className="h-px bg-[#000435]/10" />
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#000435]/50">Net book value</p>
                        <p className="text-2xl font-bold tabular-nums text-[#000435] mt-1">
                          RWF <AnimatedNumber value={Math.round(form.netBookValue)} />
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-5 pt-4 border-t border-[#000435]/10">
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-[#000435]/55 mb-2">
                      <span>Depreciation applied</span>
                      <span className="text-[#000435]">{Math.round(depPercent)}%</span>
                    </div>
                    <div className="w-full h-3 bg-[#000435]/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#000435] rounded-full transition-all duration-700"
                        style={{ width: `${Math.min(depPercent, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-[#FEBF10]/35 border border-[#000435]/10 px-3 py-2.5 text-center">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#000435]/55">Opening</p>
                      <p className="text-sm font-bold tabular-nums text-[#000435] mt-1">RWF {formatCurrency(form.openingAmount || 0)}</p>
                    </div>
                    <div className="rounded-xl bg-[#FEBF10]/35 border border-[#000435]/10 px-3 py-2.5 text-center">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#000435]/55">Annual dep.</p>
                      <p className="text-sm font-bold tabular-nums text-[#000435] mt-1">RWF {formatCurrency(Math.round(form.annualDep))}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 7: Review & Confirm */}
          {step > 0 && !loadingAsset && step === 7 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-navy flex items-center gap-2">
                <span className="w-7 h-7 bg-amber-500 text-white rounded-lg flex items-center justify-center text-sm font-bold">7</span>
                Review & Confirm
              </h3>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Asset Info */}
                <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-navy text-sm">Asset Information</h4>
                    <button onClick={() => setStep(1)} className="text-xs text-amber-600 hover:text-amber-700 font-medium">Edit</button>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-gray-500">Name</span><span className="font-medium text-navy">{form.assetName || '—'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Code</span><span className="font-mono text-xs text-navy">{previewCode}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Category type</span><span>{categoryTypeLabel(form) || '—'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Location</span><span className="text-right max-w-[200px]">{form.location || '—'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Register year</span><span className="font-semibold text-navy">{activeRegisterYear}</span></div>
                    {isEdit && recordedAt && (
                      <div className="flex justify-between"><span className="text-gray-500">Recorded on</span><span className="text-xs">{formatRegisterTimestamp(recordedAt)}</span></div>
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-navy text-sm">Supplier & Identifiers</h4>
                    <button onClick={() => setStep(2)} className="text-xs text-amber-600 hover:text-amber-700 font-medium">Edit</button>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-gray-500">Supplier</span><span>{form.supplier || '—'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">SKU</span><span className="font-mono text-xs">{form.sku || '—'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Serial</span><span className="font-mono text-xs">{form.serialNumber || '—'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Brand</span><span>{form.brand || '—'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Material</span><span>{form.material === 'OTHER' ? form.materialOther || 'Other' : form.material || '—'}</span></div>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-navy text-sm">Purchase & Depreciation</h4>
                    <button onClick={() => setStep(3)} className="text-xs text-amber-600 hover:text-amber-700 font-medium">Edit</button>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-gray-500">Purchase Date</span><span>{form.purchaseDay}/{form.purchaseMonth}/{form.purchaseYear || '—'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Unit Price</span><span className="font-medium">RWF {formatCurrency(form.unitPrice || 0)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Dep. Mode</span><span>{form.depMode}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Annual Dep.</span><span className="text-amber-600 font-medium">RWF {formatCurrency(Math.round(form.annualDep))}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Net Book Value</span><span className={`font-bold ${nbvPercent > 50 ? 'text-emerald-600' : 'text-amber-600'}`}>RWF {formatCurrency(Math.round(form.netBookValue))}</span></div>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-navy text-sm">Quantity & Inventory</h4>
                    <button onClick={() => setStep(5)} className="text-xs text-amber-600 hover:text-amber-700 font-medium">Edit</button>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-gray-500">Quantity</span><span className="font-bold text-lg text-navy">{form.quantity || 1}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Unit</span><span>{form.unit}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Condition</span><span className={`font-semibold ${form.condition === 'GOOD' ? 'text-emerald-600' : form.condition === 'FAIR' ? 'text-amber-600' : 'text-red-600'}`}>{form.condition}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Total Value</span><span className="font-bold text-navy">RWF {formatCurrency((parseFloat(form.unitPrice) || 0) * (parseInt(form.quantity) || 1))}</span></div>
                  </div>
                </div>
              </div>

              {/* Missing Fields Warning */}
              {Object.keys(errors).length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                  <AlertCircle size={20} className="text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-red-800 text-sm">Missing required fields</p>
                    <p className="text-xs text-red-700 mt-1">Please go back and fill in all required fields marked with *</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {step === 0 && (
        <div className="shrink-0 z-20 bg-[#000435] px-6 sm:px-10 py-4 flex justify-start border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-5 py-2.5 text-sm font-semibold text-white border border-white/30 rounded-xl hover:bg-white/10"
          >
            Cancel
          </button>
        </div>
        )}

        {step > 0 && (
        <div className="shrink-0 z-20 bg-[#000435] px-6 sm:px-10 py-4 sm:py-5 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 shadow-[0_-12px_32px_rgba(0,4,53,0.25)]">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2.5 text-sm font-semibold text-white/90 border border-white/30 rounded-xl hover:bg-white/10 transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            {step >= 1 && (
              <button
                type="button"
                onClick={prevStep}
                disabled={saving}
                className="flex items-center gap-1.5 text-sm font-semibold text-white px-4 py-2.5 hover:bg-white/10 rounded-xl transition-all border border-transparent hover:border-white/20"
              >
                <ChevronLeft size={18} /> {step === 1 ? 'Register year' : 'Back'}
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3 ml-auto shrink-0">
            {!isEdit && (
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={saving || loadingAsset}
                className="px-5 py-2.5 text-sm font-semibold text-white border border-white/30 rounded-xl hover:bg-white/10 transition-all disabled:opacity-50"
              >
                Save draft
              </button>
            )}
            {step < 7 ? (
              <button
                type="button"
                onClick={nextStep}
                disabled={saving || loadingAsset}
                className="inline-flex items-center gap-2 min-w-[160px] justify-center px-8 py-3.5 rounded-xl bg-[#FEBF10] text-[#000435] text-sm font-bold shadow-lg shadow-black/20 hover:bg-[#FFD24D] transition-all disabled:opacity-50"
              >
                Next <ChevronRight size={20} strokeWidth={2.5} />
              </button>
            ) : (
              <>
                {!isEdit && (
                  <button
                    type="button"
                    onClick={handleSaveAndAdd}
                    disabled={saving || loadingAsset}
                    className="px-4 py-2.5 text-sm font-semibold text-[#000435] bg-white/90 border border-white/30 rounded-xl hover:bg-white transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                    Save &amp; add another
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || loadingAsset}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#FEBF10] text-[#000435] text-sm font-bold shadow-lg hover:bg-[#FFD24D] transition-all disabled:opacity-50"
                >
                  {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  {isEdit ? 'Update asset' : 'Save asset'}
                </button>
              </>
            )}
          </div>
        </div>
        )}
      </div>
    </div>
  )
}
