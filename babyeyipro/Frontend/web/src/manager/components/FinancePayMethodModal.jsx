import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CreditCard, X, Loader2, AlertTriangle, Plus } from 'lucide-react';
import api from '../services/api';

const METHOD_OPTIONS = [
  { value: 'bank', label: 'Bank account' },
  { value: 'momo', label: 'Mobile money (MoMo)' },
  { value: 'card', label: 'Card / POS' },
  { value: 'cash', label: 'Cash / office' },
  { value: 'other', label: 'Other' },
];

const BLANK = {
  method_type: 'bank',
  title: '',
  institution: '',
  identifier: '',
  beneficiary: '',
  notes: '',
  is_primary: false,
};

const inputCls =
  'w-full h-9 bg-re-bg rounded-lg px-3 outline-none border border-transparent focus:border-[#1E3A5F]/20 focus:bg-white transition-all text-re-text text-[9px] sm:text-[10px] font-semibold tracking-tight shadow-inner placeholder:text-re-text-muted/40';
const selectCls = `${inputCls} cursor-pointer appearance-none`;
const labelCls = 'block text-[9px] font-semibold text-[#1E3A5F] uppercase tracking-[0.2em] mb-1.5 opacity-80';

function FormField({ label, required, children }) {
  return (
    <div>
      <label className={labelCls}>
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

/**
 * Add bank / MoMo / other payout instruction — same shell as StudentWizardModal
 * (portal, backdrop, navy header, scroll body, footer actions).
 */
export default function FinancePayMethodModal({ open, onClose, onSuccess }) {
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setForm({ ...BLANK });
      setError('');
    }
  }, [open]);

  const set = (key, val) => setForm((prev) => ({ ...prev, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setError('Title is required (e.g. “Main tuition — BK”).');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const { data } = await api.post('/accountant/finance-pay-methods', {
        method_type: form.method_type,
        title: form.title.trim(),
        institution: form.institution.trim() || undefined,
        identifier: form.identifier.trim() || undefined,
        beneficiary: form.beneficiary.trim() || undefined,
        notes: form.notes.trim() || undefined,
        is_primary: !!form.is_primary,
      });
      if (!data?.success) throw new Error(data?.message || 'Save failed');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      <div
        className="absolute inset-0 bg-[#0A192F]/60 backdrop-blur-xl animate-in fade-in duration-500"
        onClick={() => !saving && onClose()}
        aria-hidden
      />
      <div className="relative w-full max-w-lg max-h-[92vh] bg-re-bg rounded-3xl shadow-[0_32px_128px_-15px_rgba(30,58,95,0.4)] border border-white/20 flex flex-col overflow-hidden animate-in zoom-in-95 fade-in duration-500">
        {/* Header — matches StudentWizardModal */}
        <div className="relative z-10 bg-re-grad-navy px-5 py-3 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 text-re-gold shadow-md shadow-re-gold/10">
                <CreditCard size={16} />
              </div>
              <div>
                <h1 className="text-[11px] font-semibold text-white uppercase tracking-widest leading-none">
                  Add payment method
                </h1>
                <p className="text-[7px] font-bold text-white/40 uppercase tracking-tight mt-1">
                  Bank · MoMo · other instructions for parents
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="p-1.5 bg-white/5 hover:bg-white/10 rounded-xl transition-all text-white/40 hover:text-re-gold group disabled:opacity-50"
            >
              <X size={14} className="group-hover:rotate-90 transition-all duration-300" />
            </button>
          </div>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar bg-re-bg/50 px-4 sm:px-6 py-4">
            <div className="max-w-md mx-auto space-y-4">
              {error && (
                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 shadow-sm animate-in fade-in">
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs font-bold text-red-800 tracking-tight leading-relaxed">{error}</p>
                </div>
              )}

              <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-4 sm:p-5 space-y-4">
                <FormField label="Type" required>
                  <select
                    className={selectCls}
                    value={form.method_type}
                    onChange={(e) => set('method_type', e.target.value)}
                    disabled={saving}
                  >
                    {METHOD_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField label="Title" required>
                  <input
                    type="text"
                    className={inputCls}
                    placeholder="e.g. Tuition — Bank of Kigali"
                    value={form.title}
                    onChange={(e) => set('title', e.target.value)}
                    disabled={saving}
                  />
                </FormField>

                <FormField label="Bank / provider name">
                  <input
                    type="text"
                    className={inputCls}
                    placeholder="Bank of Kigali, MTN MoMo…"
                    value={form.institution}
                    onChange={(e) => set('institution', e.target.value)}
                    disabled={saving}
                  />
                </FormField>

                <FormField label="Account / MoMo number">
                  <input
                    type="text"
                    className={`${inputCls} font-mono`}
                    placeholder="Account no. or 07…"
                    value={form.identifier}
                    onChange={(e) => set('identifier', e.target.value)}
                    disabled={saving}
                  />
                </FormField>

                <FormField label="Account name">
                  <input
                    type="text"
                    className={inputCls}
                    placeholder="Registered beneficiary name"
                    value={form.beneficiary}
                    onChange={(e) => set('beneficiary', e.target.value)}
                    disabled={saving}
                  />
                </FormField>

                <FormField label="Notes">
                  <input
                    type="text"
                    className={inputCls}
                    placeholder="Reference text for parents (optional)"
                    value={form.notes}
                    onChange={(e) => set('notes', e.target.value)}
                    disabled={saving}
                  />
                </FormField>

                <label className="flex items-center gap-2 text-[10px] font-semibold text-re-navy cursor-pointer select-none pt-1">
                  <input
                    type="checkbox"
                    checked={form.is_primary}
                    onChange={(e) => set('is_primary', e.target.checked)}
                    disabled={saving}
                    className="rounded border-black/20"
                  />
                  Set as primary default
                </label>
              </div>
            </div>
          </div>

          {/* Footer — matches StudentWizardModal */}
          <div className="bg-white border-t border-black/5 px-5 sm:px-6 py-2 flex items-center justify-end gap-2 shrink-0 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="h-9 px-4 rounded-lg border border-black/5 text-re-navy font-medium text-[9px] uppercase tracking-widest hover:bg-re-bg transition-all active:scale-95 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="h-9 px-6 rounded-lg bg-re-grad-navy text-white font-medium text-[9px] uppercase tracking-widest shadow-re-premium-navy active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              {saving ? 'Saving…' : 'Add method'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
