import { useEffect, useState } from 'react'
import { X, Loader2, Pencil, AlertCircle } from 'lucide-react'
import assetsApi from '../../../assets_portal/services/assetsApi'
import { normalizeDateOnly } from '../../../assets_portal/utils/assetsDateUtils'
import AssetDateInput from './AssetDateInput'

const NAVY = '#000435'
const AMBER = '#FEBF10'

export default function EditReplacementModal({ open, onClose, onSuccess, replacement, meta }) {
  const [form, setForm] = useState({
    replacementDate: '',
    reason: '',
    reasonOther: '',
    status: 'Pending',
    approvedBy: '',
    approvalRole: 'Asset Manager',
    replacementCost: '',
    warrantyStart: '',
    warrantyEnd: '',
    invoiceReference: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const isCompleted = replacement?.status === 'Completed'
  const reasons = meta?.reasons || []

  useEffect(() => {
    if (!open || !replacement) return
    setForm({
      replacementDate: normalizeDateOnly(replacement.replacement_date || replacement.date),
      reason: replacement.reason_raw || replacement.reason || '',
      reasonOther: replacement.reason_other || '',
      status: replacement.status || 'Pending',
      approvedBy: replacement.approved_by || replacement.approvedBy || '',
      approvalRole: replacement.approval_role || replacement.approvalRole || 'Asset Manager',
      replacementCost: replacement.replacement_cost != null ? String(replacement.replacement_cost) : '',
      warrantyStart: normalizeDateOnly(replacement.warranty_start),
      warrantyEnd: normalizeDateOnly(replacement.warranty_end),
      invoiceReference: replacement.invoice_reference || '',
      notes: replacement.notes || '',
    })
    setError('')
  }, [open, replacement])

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }))

  const handleSave = async () => {
    if (!replacement?.id) return
    setSaving(true)
    setError('')
    try {
      await assetsApi.updateReplacement(replacement.id, {
        replacement_date: form.replacementDate,
        reason: form.reason,
        reason_other: form.reason === 'Other' ? form.reasonOther : null,
        status: form.status,
        approved_by: form.approvedBy || null,
        approval_role: form.approvalRole || null,
        replacement_cost: form.replacementCost || null,
        warranty_start: form.warrantyStart || null,
        warranty_end: form.warrantyEnd || null,
        invoice_reference: form.invoiceReference || null,
        notes: form.notes || null,
      })
      onSuccess?.()
      onClose?.()
    } catch (err) {
      setError(err?.message || 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  if (!open || !replacement) return null

  return (
    <div className="fixed inset-0 z-[150] flex items-start justify-center overflow-y-auto bg-black/55 backdrop-blur-sm py-6">
      <div className="relative w-full max-w-lg mx-4 bg-[#F8F9FC] rounded-2xl shadow-2xl border border-gray-100 my-auto" style={{ fontFamily: "'Montserrat', sans-serif" }}>
        <div className="rounded-t-2xl px-6 py-4 flex items-center justify-between text-white" style={{ background: NAVY }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: AMBER }}>
              <Pencil size={18} style={{ color: NAVY }} />
            </div>
            <div>
              <h2 className="text-lg font-bold">Edit Replacement</h2>
              <p className="text-xs text-white/60 font-mono">{replacement.replacement_code || replacement.replacement_id}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={saving} className="p-1.5 hover:bg-white/10 rounded-lg"><X size={20} /></button>
        </div>

        <div className="px-6 py-5 space-y-4 max-h-[65vh] overflow-y-auto">
          <div className="rounded-lg bg-white border border-gray-100 px-4 py-3 text-sm">
            <p className="text-xs text-gray-500">Old → New</p>
            <p className="font-medium text-navy mt-0.5">{replacement.old_asset} → {replacement.new_asset || 'Pending'}</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <AssetDateInput label="Replacement date" value={form.replacementDate}
                onChange={(v) => set('replacementDate', v)} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
              <select className="assets-wizard-input w-full text-sm" value={form.status}
                onChange={(e) => set('status', e.target.value)} disabled={isCompleted}>
                {isCompleted ? (
                  <option value="Completed">Completed</option>
                ) : (
                  <>
                    <option value="Pending">Pending</option>
                    <option value="Rejected">Rejected</option>
                  </>
                )}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Reason *</label>
              <select className="assets-wizard-input w-full text-sm" value={form.reason} onChange={(e) => set('reason', e.target.value)}>
                <option value="">Select reason…</option>
                {reasons.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            {form.reason === 'Other' && (
              <div className="sm:col-span-2">
                <input type="text" className="assets-wizard-input w-full text-sm" placeholder="Specify reason…"
                  value={form.reasonOther} onChange={(e) => set('reasonOther', e.target.value)} />
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Replacement cost (RWF)</label>
              <input type="number" className="assets-wizard-input w-full text-sm" value={form.replacementCost}
                onChange={(e) => set('replacementCost', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Approved by</label>
              <input type="text" className="assets-wizard-input w-full text-sm" value={form.approvedBy}
                onChange={(e) => set('approvedBy', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Approval role</label>
              <select className="assets-wizard-input w-full text-sm" value={form.approvalRole}
                onChange={(e) => set('approvalRole', e.target.value)}>
                {(meta?.approval_roles || ['Asset Manager']).map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <AssetDateInput label="Warranty start" value={form.warrantyStart} optional
                onChange={(v) => set('warrantyStart', v)} />
            </div>
            <div>
              <AssetDateInput label="Warranty end" value={form.warrantyEnd} optional
                onChange={(v) => set('warrantyEnd', v)} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Invoice reference</label>
              <input type="text" className="assets-wizard-input w-full text-sm" value={form.invoiceReference}
                onChange={(e) => set('invoiceReference', e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
              <textarea className="assets-wizard-input w-full text-sm min-h-[80px]" value={form.notes}
                onChange={(e) => set('notes', e.target.value)} />
            </div>
          </div>

          {isCompleted && (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              Completed replacements: you can update notes, approval, warranty, and dates. Asset links cannot be changed here.
            </p>
          )}

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5" /> {error}
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 px-6 py-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={saving} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg">Cancel</button>
          <button type="button" onClick={handleSave} disabled={saving || !form.reason}
            className="px-5 py-2 text-sm font-medium text-[#0B1530] rounded-lg disabled:opacity-40 flex items-center gap-1.5" style={{ background: AMBER }}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Pencil size={16} />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}
