import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  X, Plus, CheckCircle2, AlertCircle, Loader2, Receipt, Percent, Calculator,
  Calendar, Layers, TrendingUp, Pencil, Hash, MapPin, Tag, Sparkles, Copy,
} from 'lucide-react'
import assetTestApi from '../../../assets_portal/services/assetTestApi'
import { formatRwfPlain, yearOptionsFrom1900 } from '../../../assets_portal/utils/financialYearUtils'
import { computeAssetRegisterMath } from '../../../assets_portal/utils/assetRegisterMath'
import { ASSET_HEALTH_STATUS_OPTIONS, DEFAULT_ASSET_HEALTH_STATUS } from '../../../assets_portal/utils/assetsConstants'
import {
  abbreviateSchoolName,
  manualSkuForIndex,
  previewAutoSku,
} from '../../../assets_portal/utils/assetSkuUtils'

const NAVY = '#000435'
const AMBER = '#FEBF10'
const CONDITIONS = ['Excellent', 'Good', 'Fair', 'Poor']

const EMPTY = {
  assetName: '', category: '', location: '', locationLabel: '', labelTag: '', serialNumber: '',
  skuMode: 'auto', quantity: '1',
  purchasePrice: '', purchaseDate: '', condition: 'Good',
  sdNumber: '', receiptNumber: '', referenceNo: '', applyTax: true,
  selectedYear: '', isFirstEntry: true, assetHealthStatus: DEFAULT_ASSET_HEALTH_STATUS,
}

function conditionFromDb(code) {
  const c = String(code || '').toUpperCase()
  if (c === 'EXCELLENT') return 'Excellent'
  if (c === 'GOOD') return 'Good'
  if (c === 'FAIR') return 'Fair'
  if (c === 'DAMAGED' || c === 'POOR') return 'Poor'
  return 'Good'
}

function assetToForm(asset) {
  const applyTax = asset?.tax_amount != null ? Number(asset.tax_amount) > 0 : true
  const sku = asset?.sku || asset?.serial_number || ''
  return {
    assetName: asset?.asset_name || '',
    category: asset?.category || '',
    location: asset?.location || '',
    locationLabel: asset?.location_label || '',
    labelTag: asset?.label_tag || '',
    serialNumber: sku,
    skuMode: 'manual',
    quantity: '1',
    purchasePrice: asset?.unit_price != null ? String(asset.unit_price) : '',
    purchaseDate: asset?.purchase_date
      ? String(asset.purchase_date).slice(0, 10)
      : new Date().toISOString().slice(0, 10),
    condition: conditionFromDb(asset?.condition_code || asset?.condition),
    sdNumber: asset?.sd_number || '',
    receiptNumber: asset?.receipt_number || '',
    referenceNo: asset?.reference_no || '',
    applyTax,
    selectedYear: asset?.register_year != null ? String(asset.register_year) : '',
    isFirstEntry: true,
    assetHealthStatus: asset?.asset_health_status || DEFAULT_ASSET_HEALTH_STATUS,
  }
}

export default function AddAsset2({ open, onClose, onSuccess, editAssetId = null }) {
  const isEdit = editAssetId != null
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({ ...EMPTY })
  const [editAsset, setEditAsset] = useState(null)
  const [loadingAsset, setLoadingAsset] = useState(false)
  const [categories, setCategories] = useState([])
  const [financialYears, setFinancialYears] = useState([])
  const [schoolInfo, setSchoolInfo] = useState(null)
  const [openingContext, setOpeningContext] = useState(null)
  const [loadingMeta, setLoadingMeta] = useState(false)
  const [loadingOpening, setLoadingOpening] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const activeYears = useMemo(
    () => financialYears.filter((y) => y.status === 'Active'),
    [financialYears]
  )

  const selectedFinYear = useMemo(
    () => financialYears.find((y) => String(y.year) === String(form.selectedYear)),
    [financialYears, form.selectedYear]
  )

  const legacyYears = useMemo(() => yearOptionsFrom1900(), [])

  const loadOpeningContext = useCallback(async (year, category, isFirstEntry) => {
    if (!year || !category) {
      setOpeningContext(null)
      return
    }
    setLoadingOpening(true)
    try {
      const ctx = await assetTestApi.getOpening(year, category, {
        firstTime: isFirstEntry,
        entryMode: isFirstEntry ? 'year_setup' : 'legacy',
      })
      setOpeningContext(ctx)
    } catch {
      setOpeningContext(null)
    } finally {
      setLoadingOpening(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    setStep(1)
    setError('')
    setEditAsset(null)

    if (isEdit) {
      setLoadingAsset(true)
      setLoadingMeta(true)
      Promise.all([
        assetTestApi.getMeta().catch(() => ({ categories: [], financial_years: [] })),
        assetTestApi.getAsset(editAssetId).catch(() => null),
      ])
        .then(([meta, asset]) => {
          const cats = meta?.categories ?? []
          const yrList = meta?.financial_years ?? []
          setCategories(Array.isArray(cats) ? cats : [])
          setFinancialYears(Array.isArray(yrList) ? yrList : [])
          setSchoolInfo(meta?.school ?? null)
          if (asset) {
            setEditAsset(asset)
            const mapped = assetToForm(asset)
            const finYear = yrList.find((y) => String(y.year) === mapped.selectedYear)
            mapped.isFirstEntry = finYear?.status === 'Active'
            setForm({ ...EMPTY, ...mapped })
          }
        })
        .finally(() => {
          setLoadingMeta(false)
          setLoadingAsset(false)
        })
      return
    }

    setForm({ ...EMPTY, purchaseDate: new Date().toISOString().slice(0, 10) })
    setOpeningContext(null)
    setLoadingMeta(true)
    assetTestApi.getMeta()
      .then((meta) => {
        const cats = meta?.categories ?? []
        const yrList = meta?.financial_years ?? []
        const active = meta?.active_financial_year ?? null
        setCategories(Array.isArray(cats) ? cats : [])
        setFinancialYears(Array.isArray(yrList) ? yrList : [])
        setSchoolInfo(meta?.school ?? null)
        const defaultYear = active?.year ?? yrList.find((y) => y.status === 'Active')?.year ?? ''
        setForm((f) => ({
          ...f,
          selectedYear: defaultYear ? String(defaultYear) : '',
          isFirstEntry: true,
        }))
      })
      .catch(() => {
        setCategories([])
        setFinancialYears([])
      })
      .finally(() => setLoadingMeta(false))
  }, [open, isEdit, editAssetId])

  useEffect(() => {
    if (!open) return
    loadOpeningContext(form.selectedYear, form.category, form.isFirstEntry)
  }, [open, form.selectedYear, form.category, form.isFirstEntry, loadOpeningContext])

  const rate = Number(openingContext?.depreciation_rate ?? 5)

  const calc = useMemo(() => {
    const price = Number(form.purchasePrice) || 0
    const taxAmount = form.applyTax ? Math.round(price * 0.18) : 0
    const priceInclTax = price + taxAmount

    const useStoredOpening = isEdit && editAsset
      && String(form.selectedYear) === String(editAsset.register_year)
      && form.category === editAsset.category

    const accumulatedStart = useStoredOpening
      ? Number(editAsset.accumulated_depreciation ?? 0)
      : Number(
        openingContext?.effective_accumulated_depreciation
        ?? openingContext?.year_setup_accumulated_depreciation
        ?? openingContext?.accumulated_depreciation ?? 0
      )
    const lastYearTotalDep = useStoredOpening
      ? Number(editAsset.total_dep ?? 0)
      : Number(openingContext?.last_year_total_depreciation ?? 0)
    const categoryOpening = useStoredOpening
      ? Number(editAsset.opening_amount ?? 0)
      : Number(
        openingContext?.effective_opening
        ?? openingContext?.year_setup_opening
        ?? openingContext?.year_opening_balance
        ?? 0
      )

    const math = computeAssetRegisterMath({
      openingAmount: categoryOpening,
      unitPrice: price,
      accumulatedDepreciation: accumulatedStart,
      depRatePercent: rate,
    })
    return {
      rate,
      taxAmount,
      priceInclTax,
      categoryOpening,
      lastYearClosing: Number(openingContext?.last_year_closing ?? 0),
      lastYearTotalDep,
      accumulatedStart,
      totalBalance: math.totalBalance,
      annualDep: math.annualDep,
      totalDep: math.totalDep,
      netBook: math.netBookValue,
      newAccDep: math.newAccumulatedDep,
      decimalDep: math.decimalDep,
      assetsInYear: openingContext?.assets_in_year ?? 0,
      priorAssetName: openingContext?.prior_asset_name ?? null,
      source: useStoredOpening ? 'ledger' : openingContext?.source,
      sourceLabel: useStoredOpening
        ? 'Current row opening from register chain'
        : openingContext?.source_label,
    }
  }, [form, openingContext, rate, isEdit, editAsset])

  const schoolName = schoolInfo?.name || ''
  const schoolAbbr = schoolInfo?.abbreviation || abbreviateSchoolName(schoolName)
  const quantityNum = Math.min(100, Math.max(1, Number(form.quantity) || 1))

  const skuPreview = useMemo(() => {
    if (form.skuMode !== 'auto') {
      const base = form.serialNumber.trim()
      if (!base) return []
      if (quantityNum <= 1) return [base]
      return Array.from({ length: Math.min(quantityNum, 3) }, (_, i) => manualSkuForIndex(base, i + 1, quantityNum))
    }
    const first = previewAutoSku({
      schoolName,
      locationLabel: form.locationLabel,
      assetLabel: form.labelTag || form.assetName,
      sequence: 1,
    })
    if (quantityNum <= 1) return [first]
    const samples = [first]
    if (quantityNum > 1) {
      samples.push(previewAutoSku({
        schoolName,
        locationLabel: form.locationLabel,
        assetLabel: form.labelTag || form.assetName,
        sequence: 2,
      }))
    }
    if (quantityNum > 2) {
      samples.push(previewAutoSku({
        schoolName,
        locationLabel: form.locationLabel,
        assetLabel: form.labelTag || form.assetName,
        sequence: quantityNum,
      }))
    }
    return samples
  }, [form.skuMode, form.serialNumber, form.locationLabel, form.labelTag, form.assetName, schoolName, quantityNum])

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }))

  const handleEntryModeToggle = (isFirstEntry) => {
    setForm((f) => {
      let nextYear = f.selectedYear
      if (isFirstEntry) {
        const active = financialYears.find((y) => y.status === 'Active')
        nextYear = active ? String(active.year) : ''
      } else if (!nextYear) {
        nextYear = String(new Date().getFullYear())
      }
      return { ...f, isFirstEntry, selectedYear: nextYear }
    })
  }

  const handleYearChange = (year) => {
    set('selectedYear', year)
  }

  const handleCategoryChange = (name) => {
    set('category', name)
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      const payload = {
        register_year: Number(form.selectedYear),
        entry_mode: form.isFirstEntry ? 'year_setup' : 'legacy',
        first_time: form.isFirstEntry,
        asset_name: form.assetName,
        category: form.category,
        location: form.location,
        location_label: form.locationLabel || null,
        label_tag: form.labelTag || null,
        sku_mode: form.skuMode,
        serial_number: form.skuMode === 'manual' ? (form.serialNumber || null) : null,
        sku: form.skuMode === 'manual' ? (form.serialNumber || null) : null,
        quantity: isEdit ? 1 : quantityNum,
        purchase_price: form.purchasePrice,
        purchase_date: form.purchaseDate,
        condition: form.condition,
        sd_number: form.sdNumber || null,
        receipt_number: form.receiptNumber || null,
        reference_no: form.referenceNo || null,
        apply_tax: form.applyTax,
        asset_health_status: form.assetHealthStatus || 'Used',
      }
      if (isEdit) {
        await assetTestApi.updateAsset(editAssetId, payload)
      } else {
        await assetTestApi.createAsset(payload)
      }
      onSuccess?.()
      onClose?.()
    } catch (err) {
      setError(err?.message || `Failed to ${isEdit ? 'update' : 'save'} asset`)
    } finally {
      setSaving(false)
    }
  }

  const yearValid = form.isFirstEntry
    ? selectedFinYear?.status === 'Active'
    : Boolean(form.selectedYear)
  const skuAutoReady = form.locationLabel.trim() && (form.labelTag.trim() || form.assetName.trim())
  const skuManualReady = Boolean(form.serialNumber.trim())
  const skuReady = isEdit
    ? true
    : form.skuMode === 'auto'
      ? skuAutoReady
      : skuManualReady
  const canSave = form.selectedYear && yearValid && form.purchasePrice && (isEdit || skuReady)
  const canContinueStep1 = form.assetName && form.category && form.location && form.selectedYear && yearValid && (isEdit || skuReady)

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[150] flex items-start justify-center overflow-y-auto bg-black/50 backdrop-blur-sm py-6">
      <div
        className="relative w-full max-w-2xl mx-4 bg-[#F8F9FC] rounded-2xl shadow-2xl border border-gray-100 my-auto"
        style={{ fontFamily: "'Montserrat', sans-serif" }}
      >
        <div className="sticky top-0 z-10 rounded-t-2xl px-6 py-4 flex items-center justify-between text-white" style={{ background: NAVY }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: AMBER }}>
              {isEdit ? <Pencil size={18} style={{ color: NAVY }} /> : <Plus size={18} style={{ color: NAVY }} />}
            </div>
            <div>
              <h2 className="text-lg font-bold">{isEdit ? 'Edit Asset' : 'Add New Asset'}</h2>
              <p className="text-xs text-white/60">
                Step {step} of 2 — {step === 1 ? 'Basic Info' : 'Financial Info'}
                {form.selectedYear ? ` · FY ${form.selectedYear}` : ''}
                {isEdit && editAsset?.asset_code ? ` · ${editAsset.asset_code}` : ''}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={saving} className="p-1.5 hover:bg-white/10 rounded-lg">
            <X size={20} />
          </button>
        </div>

        {!loadingMeta && form.isFirstEntry && activeYears.length === 0 && (
          <div className="mx-6 mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 flex items-start gap-2">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <span>No active financial year. Create one in <strong>Year Setup</strong>, or switch to <strong>Not first time</strong> to register any year from 1900.</span>
          </div>
        )}

        <div className="px-6 pt-5 pb-2">
          <div className="flex items-center gap-1">
            {[1, 2].map((s) => (
              <div key={s} className="flex items-center gap-1 flex-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  s < step ? 'bg-emerald-500 text-white' : s === step ? 'text-[#0B1530]' : 'bg-gray-200 text-gray-500'
                }`} style={s === step ? { background: AMBER } : undefined}>
                  {s < step ? <CheckCircle2 size={14} /> : s}
                </div>
                {s < 2 && <div className={`flex-1 h-0.5 rounded ${s < step ? 'bg-emerald-400' : 'bg-gray-200'}`} />}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-1 text-[10px] text-gray-400 font-medium">
            <span>Basic Info</span><span>Financial Info</span>
          </div>
        </div>

        <div className="px-6 py-4 max-h-[55vh] overflow-y-auto space-y-4">
          {(loadingMeta || loadingAsset) ? (
            <div className="flex items-center justify-center gap-2 py-12 text-gray-500">
              <Loader2 className="animate-spin" size={22} /> Loading…
            </div>
          ) : step === 1 ? (
            <div className="space-y-4">
              <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm space-y-4">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold flex items-center gap-1.5">
                  <Calendar size={14} /> Register mode
                </p>
                <div className="flex items-center justify-between px-3 py-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium" style={{ color: NAVY }}>
                      {form.isFirstEntry ? 'First time (Year Setup)' : 'Not first time (any year)'}
                    </p>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      {form.isFirstEntry
                        ? 'Pick an Active financial year from Year Setup.'
                        : 'Pick any year from 1900 — opening from last asset in the previous year.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleEntryModeToggle(!form.isFirstEntry)}
                    className={`relative w-11 h-6 rounded-full transition-all shrink-0 ${form.isFirstEntry ? 'bg-emerald-500' : 'bg-blue-500'}`}
                    title={form.isFirstEntry ? 'Switch to not first time' : 'Switch to first time'}
                  >
                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${form.isFirstEntry ? 'left-[22px]' : 'left-0.5'}`} />
                  </button>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {form.isFirstEntry ? 'Financial year (Active only) *' : 'Register year *'}
                  </label>
                  {form.isFirstEntry ? (
                    <select
                      className="assets-wizard-input w-full text-sm font-semibold"
                      value={form.selectedYear}
                      onChange={(e) => handleYearChange(e.target.value)}
                    >
                      <option value="">Choose financial year…</option>
                      {financialYears.map((y) => (
                        <option key={y.id} value={y.year} disabled={y.status === 'Closed'}>
                          {y.year} / {y.year + 1} — {y.status}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <select
                      className="assets-wizard-input w-full text-sm font-semibold"
                      value={form.selectedYear}
                      onChange={(e) => handleYearChange(e.target.value)}
                    >
                      <option value="">Choose year…</option>
                      {legacyYears.map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  )}
                  <p className="text-[10px] text-gray-500 mt-1">
                    {form.isFirstEntry
                      ? <>Only <strong>Active</strong> years accept new assets.</>
                      : <>Year does not need to be in Year Setup. Opening = last asset net book in {form.selectedYear ? Number(form.selectedYear) - 1 : 'prior year'}; accumulated = its total depreciation.</>}
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm space-y-4">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Basic Information</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Asset Name *</label>
                    <input type="text" className="assets-wizard-input w-full text-sm" placeholder="e.g. Dell Latitude 5420"
                      value={form.assetName} onChange={(e) => set('assetName', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Category *</label>
                    <select className="assets-wizard-input w-full text-sm" value={form.category}
                      onChange={(e) => handleCategoryChange(e.target.value)}>
                      <option value="">Select category…</option>
                      {categories.map((c) => (
                        <option key={c.id || c.name} value={c.name}>
                          {c.name}{c.depreciation_rate != null ? ` (${c.depreciation_rate}% dep.)` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Location *</label>
                    <input type="text" className="assets-wizard-input w-full text-sm" placeholder="Building A - Room 201"
                      value={form.location} onChange={(e) => set('location', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
                      <MapPin size={12} className="text-amber-600" /> Label of Location *
                    </label>
                    <input type="text" className="assets-wizard-input w-full text-sm font-mono uppercase"
                      placeholder="e.g. BLDA-201"
                      value={form.locationLabel} onChange={(e) => set('locationLabel', e.target.value)} />
                    <p className="text-[10px] text-gray-500 mt-1">Short code used in auto SKU (e.g. room or block label).</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
                      <Tag size={12} className="text-amber-600" /> Label of Asset *
                    </label>
                    <input type="text" className="assets-wizard-input w-full text-sm font-mono uppercase"
                      placeholder="e.g. DESK, CHAIR"
                      value={form.labelTag} onChange={(e) => set('labelTag', e.target.value)} />
                  </div>
                  {!isEdit && (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Quantity</label>
                      <input type="number" min={1} max={100} className="assets-wizard-input w-full text-sm"
                        value={form.quantity} onChange={(e) => set('quantity', e.target.value)} />
                      <p className="text-[10px] text-gray-500 mt-1">
                        Creates separate register rows — each with its own SKU, QR code, and rolling depreciation.
                      </p>
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-slate-50 to-white p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                        <Hash size={14} className="text-amber-600" /> Serial Number / SKU
                      </p>
                      <p className="text-[10px] text-gray-500 mt-0.5">
                        {isEdit ? 'Edit the identifier for this asset.' : 'Choose manual entry or auto-generate from school register.'}
                      </p>
                    </div>
                    {!isEdit && (
                      <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5 shrink-0">
                        {[
                          { id: 'auto', label: 'Automatic', icon: Sparkles },
                          { id: 'manual', label: 'Manual', icon: Pencil },
                        ].map(({ id, label, icon: Icon }) => (
                          <button
                            key={id}
                            type="button"
                            onClick={() => set('skuMode', id)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold transition-all ${
                              form.skuMode === id
                                ? 'bg-[#000435] text-white shadow-sm'
                                : 'text-gray-500 hover:text-gray-800'
                            }`}
                          >
                            <Icon size={12} /> {label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {form.skuMode === 'manual' || isEdit ? (
                    <input type="text" className="assets-wizard-input w-full text-sm font-mono"
                      placeholder="Enter serial number or SKU"
                      value={form.serialNumber} onChange={(e) => set('serialNumber', e.target.value)} />
                  ) : (
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-100 text-amber-900">
                          {schoolAbbr || 'SCH'}
                        </span>
                        <span>/</span>
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-100 text-blue-900">
                          {form.locationLabel.trim().toUpperCase() || 'LOCATION'}
                        </span>
                        <span>/</span>
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-100 text-emerald-900">
                          {(form.labelTag || form.assetName).trim().toUpperCase() || 'ASSET'}
                        </span>
                        <span>/</span>
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-gray-200 text-gray-800 font-mono">
                          00001
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-500">
                        From school register: <strong>{schoolName || 'School name'}</strong>
                        {schoolAbbr ? ` → ${schoolAbbr}` : ''}
                        {' · '}Skips numbers already used on another asset’s tag, SKU, or serial.
                      </p>
                    </div>
                  )}

                  {!isEdit && skuPreview.length > 0 && (
                    <div className="rounded-lg border border-dashed border-gray-200 bg-white/80 px-3 py-2.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5 flex items-center gap-1">
                        <Copy size={11} /> Preview {quantityNum > 1 ? `(${quantityNum} assets)` : ''}
                      </p>
                      <div className="space-y-1">
                        {skuPreview.map((sku, idx) => (
                          <p key={sku} className="text-xs font-mono text-[#000435] truncate">
                            {skuPreview.length > 1 && idx === skuPreview.length - 1 && quantityNum > 3
                              ? `… ${sku}`
                              : sku}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {form.selectedYear && form.category && (
                <OpeningStockCard loading={loadingOpening} calc={calc} year={form.selectedYear} />
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {form.category && <OpeningStockCard loading={loadingOpening} calc={calc} year={form.selectedYear} compact showAccumulated />}

              <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm space-y-4">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold flex items-center gap-1.5">
                  <Receipt size={14} /> Financial Information
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Purchase Price (RWF) *</label>
                    <input type="number" className="assets-wizard-input w-full text-sm" placeholder="0"
                      value={form.purchasePrice} onChange={(e) => set('purchasePrice', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Purchase Date</label>
                    <input type="date" className="assets-wizard-input w-full text-sm"
                      value={form.purchaseDate} onChange={(e) => set('purchaseDate', e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">Condition</label>
                  <div className="flex gap-2 flex-wrap">
                    {CONDITIONS.map((c) => (
                      <button key={c} type="button" onClick={() => set('condition', c)}
                        className={`flex-1 min-w-[70px] py-2 rounded-xl text-xs font-bold border-2 transition-all ${
                          form.condition === c ? 'border-amber-500 bg-amber-50 text-amber-800' : 'border-gray-200 text-gray-500'
                        }`}>{c}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">Health status</label>
                  <div className="flex gap-2 flex-wrap">
                    {ASSET_HEALTH_STATUS_OPTIONS.map((o) => (
                      <button
                        key={o.value}
                        type="button"
                        onClick={() => set('assetHealthStatus', o.value)}
                        className={`flex-1 min-w-[120px] py-2 px-3 rounded-xl text-xs font-bold border-2 transition-all ${
                          form.assetHealthStatus === o.value
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                            : 'border-gray-200 text-gray-500'
                        }`}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">SD Number (optional)</label>
                    <input type="text" className="assets-wizard-input w-full text-sm" value={form.sdNumber}
                      onChange={(e) => set('sdNumber', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Receipt Number (optional)</label>
                    <input type="text" className="assets-wizard-input w-full text-sm" value={form.receiptNumber}
                      onChange={(e) => set('receiptNumber', e.target.value)} />
                  </div>
                </div>
                <div className="flex items-center justify-between px-3 py-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Percent size={16} className="text-amber-500" />
                    <div>
                      <p className="text-sm font-medium" style={{ color: NAVY }}>Apply VAT 18%</p>
                      <p className="text-[10px] text-gray-500">On purchase price (default ON)</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => set('applyTax', !form.applyTax)}
                    className={`relative w-10 h-5 rounded-full transition-all ${form.applyTax ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${form.applyTax ? 'left-[22px]' : 'left-0.5'}`} />
                  </button>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Reference No. (optional)</label>
                  <input type="text" className="assets-wizard-input w-full text-sm" value={form.referenceNo}
                    onChange={(e) => set('referenceNo', e.target.value)} />
                </div>
              </div>

              {form.category && (
                <div className="rounded-xl p-5 border border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100/40">
                  <p className="text-xs text-amber-800 uppercase font-bold tracking-wider mb-3 flex items-center gap-1.5">
                    <Calculator size={14} /> Auto-Calculation Engine
                  </p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-gray-600">Financial year</span><span className="font-medium">{form.selectedYear}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">Opening stock</span><span className="font-mono font-semibold">RWF {formatRwfPlain(calc.categoryOpening)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">Accumulated dep. (start)</span><span className="font-mono text-red-700">RWF {formatRwfPlain(calc.accumulatedStart)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">Last year total dep.</span><span className="font-mono text-gray-500">RWF {formatRwfPlain(calc.lastYearTotalDep)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">Decimal rate</span><span className="font-mono">{calc.decimalDep}</span></div>
                    <div className="h-px bg-amber-200/60 my-1" />
                    <div className="flex justify-between"><span className="text-gray-600">+ Purchase price</span><span className="font-mono">RWF {formatRwfPlain(form.purchasePrice)}</span></div>
                    <div className="flex justify-between font-bold"><span>TOTAL BALANCE</span><span className="font-mono">RWF {formatRwfPlain(calc.totalBalance)}</span></div>
                    {form.applyTax && (
                      <div className="flex justify-between"><span className="text-gray-600">VAT 18% (on purchase)</span><span className="font-mono">RWF {formatRwfPlain(calc.taxAmount)}</span></div>
                    )}
                    <div className="h-px bg-amber-200/60 my-1" />
                    <div className="flex justify-between"><span className="text-gray-600">Annual depreciation</span><span className="font-mono text-red-600">RWF {formatRwfPlain(calc.annualDep)}</span></div>
                    <p className="text-[10px] text-amber-800/70 text-right -mt-1">
                      = Total balance ({formatRwfPlain(calc.totalBalance)}) × {calc.rate}%
                    </p>
                    <div className="flex justify-between font-semibold"><span>TOTAL DEPRECIATION</span><span className="font-mono text-red-600">RWF {formatRwfPlain(calc.totalDep)}</span></div>
                    <p className="text-[10px] text-amber-800/70 text-right -mt-1">
                      = Total balance ({formatRwfPlain(calc.totalBalance)}) − Annual ({formatRwfPlain(calc.annualDep)})
                    </p>
                    <div className="flex justify-between"><span className="text-gray-600">Closing / next accumulated</span><span className="font-mono">RWF {formatRwfPlain(calc.newAccDep)}</span></div>
                    <div className="flex justify-between bg-amber-100/60 rounded-lg p-2 -mx-1">
                      <span className="font-semibold">NET BOOK VALUE</span>
                      <span className="font-bold font-mono">RWF {formatRwfPlain(calc.netBook)}</span>
                    </div>
                    <p className="text-[10px] text-amber-800/80 text-center pt-1">
                      CLOSING / NET BOOK = TOTAL DEPRECIATION ({formatRwfPlain(calc.totalDep)})
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
          )}
        </div>

        <div className="sticky bottom-0 bg-white rounded-b-2xl border-t border-gray-100 px-6 py-4 flex items-center justify-between">
          <button type="button" onClick={() => step > 1 && setStep(1)} disabled={step === 1 || saving}
            className={`text-sm font-medium px-4 py-2 rounded-lg ${step === 1 ? 'text-gray-300' : 'text-gray-500 hover:bg-gray-100'}`}>
            Back
          </button>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} disabled={saving} className="text-sm font-medium text-gray-500 px-4 py-2 hover:bg-gray-100 rounded-lg">Cancel</button>
            {step === 1 ? (
              <button type="button" onClick={() => setStep(2)}
                disabled={!canContinueStep1}
                className="font-medium px-5 py-2 rounded-lg text-sm text-[#0B1530] disabled:opacity-40" style={{ background: AMBER }}>
                Continue
              </button>
            ) : (
              <button type="button" onClick={handleSave} disabled={saving || !canSave}
                className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white font-medium px-6 py-2 rounded-lg text-sm flex items-center gap-1.5">
                {saving ? <Loader2 size={16} className="animate-spin" /> : (isEdit ? <Pencil size={16} /> : <Plus size={16} />)}
                {isEdit ? 'Save Changes' : quantityNum > 1 ? `Save ${quantityNum} Assets` : 'Save Asset'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function OpeningStockCard({ loading, calc, year, compact = false, showAccumulated = false }) {
  const isRolling = calc.source === 'ledger'
  return (
    <div className={`rounded-xl border overflow-hidden ${isRolling ? 'border-emerald-200 bg-emerald-50/60' : 'border-blue-200 bg-blue-50/60'}`}>
      <div className="px-4 py-3 flex items-center gap-2 border-b border-black/5" style={{ background: isRolling ? 'rgba(16,185,129,0.12)' : 'rgba(59,130,246,0.12)' }}>
        <Layers size={16} className={isRolling ? 'text-emerald-600' : 'text-blue-600'} />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: NAVY }}>
            Opening stock · FY {year}
          </p>
          <p className="text-[10px] text-gray-600 truncate">
            {calc.priorAssetName
              ? `After ${calc.priorAssetName} · ${calc.sourceLabel || 'Auto from register'}`
              : (calc.sourceLabel || 'Auto from financial year engine')}
          </p>
        </div>
        {loading && <Loader2 size={16} className="animate-spin text-gray-400 shrink-0" />}
      </div>
      <div className={`grid ${compact ? (showAccumulated ? 'grid-cols-3' : 'grid-cols-2') : 'grid-cols-2 sm:grid-cols-4'} gap-3 p-4`}>
        <StatPill label="Opening stock" value={`RWF ${formatRwfPlain(calc.categoryOpening)}`} accent />
        {(showAccumulated || !compact) && (
          <StatPill label="Acc. dep. start" value={`RWF ${formatRwfPlain(calc.accumulatedStart)}`} />
        )}
        {!compact && (
          <>
            <StatPill label="Last year closing" value={`RWF ${formatRwfPlain(calc.lastYearClosing)}`} />
            <StatPill label="Assets this year" value={String(calc.assetsInYear)} />
            <StatPill label="Source" value={isRolling ? 'Rolling' : 'Carry-forward'} icon={TrendingUp} />
          </>
        )}
        {compact && !showAccumulated && (
          <StatPill label="Last year closing" value={`RWF ${formatRwfPlain(calc.lastYearClosing)}`} />
        )}
      </div>
      {!compact && isRolling && (
        <p className="px-4 pb-3 text-[10px] text-emerald-800">
          Opening = prior asset <strong>TOTAL BALANCE</strong> · Acc. dep. start = prior <strong>TOTAL DEPRECIATION</strong>
          {calc.assetsInYear > 0 ? ` (${calc.assetsInYear} asset${calc.assetsInYear !== 1 ? 's' : ''} already in this category)` : ''}.
        </p>
      )}
    </div>
  )
}

function StatPill({ label, value, accent, icon: Icon }) {
  return (
    <div className={`rounded-lg px-3 py-2.5 ${accent ? 'bg-white ring-1 ring-amber-200/80' : 'bg-white/80'}`}>
      <p className="text-[10px] text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-sm font-bold tabular-nums mt-0.5 flex items-center gap-1" style={{ color: NAVY }}>
        {Icon && <Icon size={12} className="text-emerald-500" />}
        {value}
      </p>
    </div>
  )
}
