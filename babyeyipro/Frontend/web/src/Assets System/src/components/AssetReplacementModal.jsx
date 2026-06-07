import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  X, Loader2, Search, ChevronRight, ChevronLeft, RefreshCw, CheckCircle2,
  MapPin, Tag, Hash, Sparkles, User, Wrench, Calendar, AlertCircle,
  ArrowRightLeft, FileText, Shield, Pencil, Percent, Receipt,
} from 'lucide-react'
import assetsApi from '../../../assets_portal/services/assetsApi'
import { formatRwfPlain } from '../../../assets_portal/utils/financialYearUtils'
import { abbreviateSchoolName, previewAutoSku } from '../../../assets_portal/utils/assetSkuUtils'
import AssetPickerSearch from './AssetPickerSearch'

const NAVY = '#000435'
const AMBER = '#FEBF10'

const EMPTY = {
  reason: '', reasonOther: '',
  assetName: '', category: '', location: '', locationLabel: '', assetLabel: '',
  purchasePrice: '', purchaseDate: new Date().toISOString().slice(0, 10),
  sdNumber: '', receiptNumber: '', referenceNo: '',
  skuMode: 'auto', tagSku: '',
  applyTax: true,
  transferAssignment: true,
  approvedBy: '', approvalRole: 'Asset Manager',
  warrantyStart: '', warrantyEnd: '', invoiceReference: '', notes: '',
  saveAsPending: false,
}

function fmt(v) {
  return v != null && v !== '' ? `RWF ${formatRwfPlain(v)}` : '—'
}

export default function AssetReplacementModal({ open, onClose, onSuccess }) {
  const [step, setStep] = useState(1)
  const [meta, setMeta] = useState(null)
  const [selected, setSelected] = useState(null)
  const [preview, setPreview] = useState(null)
  const [form, setForm] = useState({ ...EMPTY })
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }))
  const schoolName = meta?.school?.name || ''
  const schoolAbbr = meta?.school?.abbreviation || abbreviateSchoolName(schoolName)

  const loadPreview = useCallback(async (assetId) => {
    if (!assetId) { setPreview(null); return }
    setLoadingPreview(true)
    try {
      const data = await assetsApi.getReplacementOldAssetPreview(assetId)
      setPreview(data)
    } catch {
      setPreview(null)
    } finally {
      setLoadingPreview(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    setStep(1)
    setSelected(null)
    setPreview(null)
    setForm({ ...EMPTY, purchaseDate: new Date().toISOString().slice(0, 10) })
    setError('')
    assetsApi.getReplacementMeta().then(setMeta).catch(() => setMeta(null))
  }, [open])

  useEffect(() => {
    if (selected?.id) loadPreview(selected.id)
    else setPreview(null)
  }, [selected?.id, loadPreview])

  useEffect(() => {
    if (!selected || !preview?.asset) return
    const a = preview.asset
    setForm((f) => ({
      ...f,
      category: a.category || selected.category || '',
      location: a.location || selected.location || '',
      locationLabel: a.location_label || f.locationLabel,
      assetLabel: a.label_tag || f.assetLabel,
    }))
  }, [preview?.asset?.id, selected?.id])

  const autoSkuPreview = useMemo(() => previewAutoSku({
    schoolName,
    locationLabel: form.locationLabel,
    assetLabel: form.assetLabel || form.assetName,
    sequence: 1,
  }), [schoolName, form.locationLabel, form.assetLabel, form.assetName])

  const price = Number(form.purchasePrice) || 0
  const taxAmount = form.applyTax ? Math.round(price * 0.18) : 0
  const priceInclTax = price + taxAmount
  const oldNbv = preview?.asset?.net_book_value ?? preview?.depreciation?.net_book_value ?? 0
  const costDiff = price - Number(oldNbv || 0)

  const skuAutoReady = form.locationLabel.trim() && (form.assetLabel.trim() || form.assetName.trim())
  const skuManualReady = Boolean(form.tagSku.trim())
  const skuReady = form.skuMode === 'auto' ? skuAutoReady : skuManualReady

  const canStep1 = selected && form.reason && (form.reason !== 'Other' || form.reasonOther.trim())
  const canStep2 = form.assetName && form.category && form.location && form.purchasePrice && skuReady
  const canComplete = canStep1 && canStep2

  const displayTagSku = form.skuMode === 'auto' ? autoSkuPreview : form.tagSku

  const handleSelectAsset = (asset) => {
    setSelected(asset)
    setError('')
  }

  const handleComplete = async () => {
    setSaving(true)
    setError('')
    try {
      await assetsApi.createReplacement({
        old_asset_id: selected.id,
        reason: form.reason,
        reason_other: form.reason === 'Other' ? form.reasonOther : null,
        asset_name: form.assetName,
        category: form.category,
        location: form.location,
        location_label: form.locationLabel,
        label_tag: form.assetLabel,
        sku_mode: form.skuMode,
        tag_sku: form.skuMode === 'manual' ? form.tagSku.trim() : null,
        purchase_price: form.purchasePrice,
        purchase_date: form.purchaseDate,
        sd_number: form.sdNumber || null,
        receipt_number: form.receiptNumber || null,
        reference_no: form.referenceNo || null,
        apply_tax: form.applyTax,
        transfer_assignment: form.transferAssignment,
        approved_by: form.approvedBy || null,
        approval_role: form.approvalRole || null,
        warranty_start: form.warrantyStart || null,
        warranty_end: form.warrantyEnd || null,
        invoice_reference: form.invoiceReference || null,
        notes: form.notes || null,
        status: form.saveAsPending ? 'Pending' : 'Completed',
        register_year: meta?.active_financial_year?.year || new Date().getFullYear(),
      })
      onSuccess?.()
      onClose?.()
    } catch (err) {
      setError(err?.message || 'Replacement failed')
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  const reasons = meta?.reasons || []
  const approvalRoles = meta?.approval_roles || []

  return (
    <div className="fixed inset-0 z-[150] flex items-start justify-center overflow-y-auto bg-black/55 backdrop-blur-sm py-6">
      <div className="relative w-full max-w-3xl mx-4 bg-[#F8F9FC] rounded-2xl shadow-2xl border border-gray-100 my-auto" style={{ fontFamily: "'Montserrat', sans-serif" }}>
        <div className="sticky top-0 z-10 rounded-t-2xl px-6 py-4 flex items-center justify-between text-white" style={{ background: NAVY }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: AMBER }}>
              <RefreshCw size={20} style={{ color: NAVY }} />
            </div>
            <div>
              <h2 className="text-lg font-bold">Create Asset Replacement</h2>
              <p className="text-xs text-white/60">Step {step} of 3 — {step === 1 ? 'Select asset' : step === 2 ? 'New asset' : 'Summary'}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={saving} className="p-1.5 hover:bg-white/10 rounded-lg"><X size={20} /></button>
        </div>

        <div className="px-6 pt-4">
          <div className="flex gap-2">
            {[1, 2, 3].map((s) => (
              <div key={s} className={`h-1 flex-1 rounded-full transition-all ${s <= step ? 'bg-amber-400' : 'bg-gray-200'}`} />
            ))}
          </div>
        </div>

        <div className="px-6 py-5 max-h-[62vh] overflow-y-auto space-y-4">
          {step === 1 && (
            <>
              <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm space-y-4">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                  <Search size={14} /> Select existing asset
                </p>
                <AssetPickerSearch
                  value={selected}
                  onChange={handleSelectAsset}
                  label="Search asset"
                  hint="Asset name, tag, code, serial, SKU, or UPI"
                />
              </div>

              {loadingPreview && (
                <div className="flex items-center justify-center gap-2 py-8 text-gray-400">
                  <Loader2 className="animate-spin" size={20} /> Loading asset details…
                </div>
              )}

              {preview?.asset && !loadingPreview && (
                <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50/80 to-white p-5 space-y-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-blue-900">Selected asset preview</p>
                  <div className="grid sm:grid-cols-2 gap-3 text-sm">
                    <InfoRow label="Asset Name" value={preview.asset.asset_name} />
                    <InfoRow label="Asset Tag / SKU" value={preview.asset.label_tag || preview.asset.sku || preview.asset.serial_number} mono />
                    <InfoRow label="Category" value={preview.asset.category} />
                    <InfoRow label="Current Status" value={preview.asset.status} badge />
                    <InfoRow label="Health Status" value={preview.asset.asset_health_status || 'Used'} />
                    <InfoRow label="Location" value={preview.asset.location} />
                    <InfoRow label="Purchase Price" value={fmt(preview.asset.unit_price)} />
                    <InfoRow label="Net Book Value" value={fmt(preview.asset.net_book_value)} highlight />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3 pt-2 border-t border-blue-100">
                    <InfoRow label="Current Assignment" value={preview.assignments?.[0]?.name || 'Unassigned'} icon={User} />
                    <InfoRow label="Last Maintenance" value={preview.last_maintenance?.end_date || preview.last_maintenance?.start_date || '—'} icon={Wrench} />
                    <InfoRow label="Condition" value={preview.asset.condition_code || preview.asset.condition || '—'} />
                    <InfoRow label="Asset Age" value={preview.asset_age_years != null ? `${preview.asset_age_years} year(s)` : '—'} icon={Calendar} />
                    <InfoRow label="Depreciation Rate" value={preview.depreciation?.rate != null ? `${preview.depreciation.rate}%` : '—'} />
                    <InfoRow label="Annual Depreciation" value={fmt(preview.depreciation?.annual_dep)} />
                  </div>
                </div>
              )}

              <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600">Replacement reason *</label>
                <select className="assets-wizard-input w-full text-sm" value={form.reason} onChange={(e) => set('reason', e.target.value)}>
                  <option value="">Select reason…</option>
                  {reasons.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                {form.reason === 'Other' && (
                  <input type="text" className="assets-wizard-input w-full text-sm" placeholder="Specify reason…"
                    value={form.reasonOther} onChange={(e) => set('reasonOther', e.target.value)} />
                )}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm space-y-4">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Basic information</p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Asset Name *</label>
                    <input type="text" className="assets-wizard-input w-full text-sm" value={form.assetName}
                      onChange={(e) => set('assetName', e.target.value)} placeholder="Dell Latitude 7450" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Category *</label>
                    <input type="text" className="assets-wizard-input w-full text-sm" value={form.category}
                      onChange={(e) => set('category', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Location *</label>
                    <input type="text" className="assets-wizard-input w-full text-sm" value={form.location}
                      onChange={(e) => set('location', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1"><MapPin size={11} /> Location Label *</label>
                    <input type="text" className="assets-wizard-input w-full text-sm font-mono uppercase" value={form.locationLabel}
                      onChange={(e) => set('locationLabel', e.target.value)} placeholder="LAB-2" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1"><Tag size={11} /> Asset Label *</label>
                    <input type="text" className="assets-wizard-input w-full text-sm font-mono uppercase" value={form.assetLabel}
                      onChange={(e) => set('assetLabel', e.target.value)} placeholder="LAPTOP" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm space-y-4">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                  <Receipt size={14} /> Financial information
                </p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Purchase Price (RWF) *</label>
                    <input type="number" className="assets-wizard-input w-full text-sm" value={form.purchasePrice}
                      onChange={(e) => set('purchasePrice', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Purchase Date *</label>
                    <input type="date" className="assets-wizard-input w-full text-sm" value={form.purchaseDate}
                      onChange={(e) => set('purchaseDate', e.target.value)} />
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
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
                {form.purchasePrice && (
                  <div className="rounded-lg bg-amber-50/80 border border-amber-100 px-4 py-3 text-sm space-y-1">
                    <div className="flex justify-between"><span className="text-gray-600">Purchase price</span><span className="font-mono">{fmt(price)}</span></div>
                    {form.applyTax && (
                      <div className="flex justify-between"><span className="text-gray-600">VAT 18%</span><span className="font-mono text-red-600">{fmt(taxAmount)}</span></div>
                    )}
                    <div className="flex justify-between font-semibold border-t border-amber-200/60 pt-1">
                      <span>Price incl. tax</span><span className="font-mono">{fmt(priceInclTax)}</span>
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Reference No. (optional)</label>
                  <input type="text" className="assets-wizard-input w-full text-sm" value={form.referenceNo}
                    onChange={(e) => set('referenceNo', e.target.value)} />
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-slate-50 to-white p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                      <Hash size={14} className="text-amber-600" /> Asset Tag / SKU
                    </p>
                    <p className="text-[10px] text-gray-500 mt-0.5">Tag, SKU, and serial number use the same value.</p>
                  </div>
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
                          form.skuMode === id ? 'bg-[#000435] text-white shadow-sm' : 'text-gray-500 hover:text-gray-800'
                        }`}
                      >
                        <Icon size={12} /> {label}
                      </button>
                    ))}
                  </div>
                </div>

                {form.skuMode === 'manual' ? (
                  <input type="text" className="assets-wizard-input w-full text-sm font-mono"
                    placeholder="Enter asset tag / SKU"
                    value={form.tagSku} onChange={(e) => set('tagSku', e.target.value)} />
                ) : (
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-100 text-amber-900">{schoolAbbr || 'SCH'}</span>
                      <span>/</span>
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-100 text-blue-900">{form.locationLabel.trim().toUpperCase() || 'LOCATION'}</span>
                      <span>/</span>
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-100 text-emerald-900">{(form.assetLabel || form.assetName).trim().toUpperCase() || 'ASSET'}</span>
                      <span>/</span>
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-gray-200 text-gray-800 font-mono">00001</span>
                    </div>
                    <p className="text-[10px] text-gray-500">
                      From school register: <strong>{schoolName || 'School name'}</strong>
                      {schoolAbbr ? ` → ${schoolAbbr}` : ''}
                      {' · '}Skips numbers already used on another asset’s tag, SKU, or serial.
                    </p>
                    <p className="text-xs font-mono text-[#000435] break-all">{autoSkuPreview}</p>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm space-y-4">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5"><Shield size={14} /> Additional</p>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={form.transferAssignment} onChange={(e) => set('transferAssignment', e.target.checked)}
                    className="rounded border-gray-300 text-amber-500 focus:ring-amber-400" />
                  <span className="text-sm text-gray-700">Transfer assignment to new asset automatically</span>
                </label>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Warranty Start</label>
                    <input type="date" className="assets-wizard-input w-full text-sm" value={form.warrantyStart}
                      onChange={(e) => set('warrantyStart', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Warranty End</label>
                    <input type="date" className="assets-wizard-input w-full text-sm" value={form.warrantyEnd}
                      onChange={(e) => set('warrantyEnd', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Approved By</label>
                    <input type="text" className="assets-wizard-input w-full text-sm" value={form.approvedBy}
                      onChange={(e) => set('approvedBy', e.target.value)} placeholder="Asset Manager" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Approval Role</label>
                    <select className="assets-wizard-input w-full text-sm" value={form.approvalRole}
                      onChange={(e) => set('approvalRole', e.target.value)}>
                      {approvalRoles.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1"><FileText size={11} /> Invoice Reference</label>
                    <input type="text" className="assets-wizard-input w-full text-sm" value={form.invoiceReference}
                      onChange={(e) => set('invoiceReference', e.target.value)} placeholder="Invoice / receipt number" />
                  </div>
                </div>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="grid md:grid-cols-2 gap-4">
                <CompareCard title="Old Asset" accent="red" asset={preview?.asset} selected={selected}
                  status="Replaced" healthStatus="Not Used (Old)" />
                <CompareCard title="New Asset" accent="emerald" name={form.assetName} tag={displayTagSku}
                  status="Active" healthStatus="Used" category={form.category} location={form.location} />
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-5 space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-amber-900">Cost comparison</p>
                <div className="grid sm:grid-cols-3 gap-4 text-sm">
                  <div><p className="text-gray-500 text-xs">Old net book value</p><p className="font-bold font-mono">{fmt(oldNbv)}</p></div>
                  <div><p className="text-gray-500 text-xs">Replacement cost</p><p className="font-bold font-mono">{fmt(price)}</p></div>
                  <div><p className="text-gray-500 text-xs">Difference</p><p className="font-bold font-mono text-amber-800">{fmt(costDiff)}</p></div>
                </div>
                {form.applyTax && (
                  <p className="text-xs text-amber-800/80">VAT 18% on purchase: {fmt(taxAmount)} · Total incl. tax: {fmt(priceInclTax)}</p>
                )}
                {(form.sdNumber || form.receiptNumber || form.referenceNo) && (
                  <div className="grid sm:grid-cols-3 gap-3 text-xs pt-1 border-t border-amber-200/60">
                    {form.sdNumber && <div><span className="text-gray-500">SD Number</span><p className="font-medium">{form.sdNumber}</p></div>}
                    {form.receiptNumber && <div><span className="text-gray-500">Receipt Number</span><p className="font-medium">{form.receiptNumber}</p></div>}
                    {form.referenceNo && <div><span className="text-gray-500">Reference No</span><p className="font-medium">{form.referenceNo}</p></div>}
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-2 text-sm text-gray-600">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-700">System actions after save</p>
                <ul className="space-y-1.5 list-disc list-inside text-xs">
                  <li>Create new asset with status <strong>Active</strong> · health <strong>Used</strong></li>
                  <li>Mark old asset as <strong>Replaced</strong> · health <strong>Not Used (Old)</strong></li>
                  <li>Link old → new replacement relationship</li>
                  {form.transferAssignment && <li>Transfer active assignment to new asset</li>}
                  <li>Copy location to new asset</li>
                  <li>Write audit log entry</li>
                </ul>
                <label className="flex items-center gap-2 mt-3 cursor-pointer">
                  <input type="checkbox" checked={form.saveAsPending} onChange={(e) => set('saveAsPending', e.target.checked)} />
                  <span className="text-xs">Save as pending (approval required before completing)</span>
                </label>
              </div>
            </>
          )}

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5" /> {error}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-white rounded-b-2xl border-t border-gray-100 px-6 py-4 flex items-center justify-between">
          <button type="button" onClick={() => (step > 1 ? setStep(step - 1) : onClose())} disabled={saving}
            className="text-sm font-medium text-gray-500 px-4 py-2 hover:bg-gray-100 rounded-lg flex items-center gap-1">
            <ChevronLeft size={16} /> {step === 1 ? 'Cancel' : 'Back'}
          </button>
          <div className="flex gap-2">
            {step < 3 ? (
              <button type="button" onClick={() => setStep(step + 1)} disabled={(step === 1 && !canStep1) || (step === 2 && !canStep2)}
                className="font-medium px-5 py-2 rounded-lg text-sm text-[#0B1530] disabled:opacity-40 flex items-center gap-1" style={{ background: AMBER }}>
                Continue <ChevronRight size={16} />
              </button>
            ) : (
              <button type="button" onClick={handleComplete} disabled={saving || !canComplete}
                className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white font-medium px-6 py-2 rounded-lg text-sm flex items-center gap-1.5">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                {form.saveAsPending ? 'Save Pending' : 'Complete Replacement'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoRow({ label, value, mono, badge, highlight, icon: Icon }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-gray-400 flex items-center gap-1">
        {Icon && <Icon size={10} />} {label}
      </p>
      <p className={`text-sm mt-0.5 ${mono ? 'font-mono' : ''} ${highlight ? 'font-bold text-red-700' : 'font-medium'}`} style={{ color: highlight ? undefined : NAVY }}>
        {badge ? <span className="inline-flex px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-800">{value || '—'}</span> : (value || '—')}
      </p>
    </div>
  )
}

function CompareCard({ title, accent, asset, selected, name, tag, status, healthStatus, category, location }) {
  const isOld = accent === 'red'
  const border = isOld ? 'border-red-200 bg-red-50/40' : 'border-emerald-200 bg-emerald-50/40'
  return (
    <div className={`rounded-xl border p-5 ${border}`}>
      <p className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5">
        <ArrowRightLeft size={14} /> {title}
      </p>
      <p className="font-semibold text-base" style={{ color: NAVY }}>{asset?.asset_name || name || selected?.name}</p>
      <p className="text-xs text-gray-500 mt-2">Status: <strong>{isOld ? 'Replaced' : status}</strong></p>
      {healthStatus && <p className="text-xs text-gray-500">Health: <strong>{healthStatus}</strong></p>}
      <p className="text-xs font-mono text-gray-600 mt-1">Tag / SKU: {asset?.label_tag || tag || '—'}</p>
      {!isOld && (
        <>
          <p className="text-xs text-gray-500 mt-1">Category: {category}</p>
          <p className="text-xs text-gray-500">Location: {location}</p>
        </>
      )}
    </div>
  )
}
