import { useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Upload, FileText, Save, Loader2 } from 'lucide-react';
import { font, inp as themeInp } from '../NesaPage/utils/theme';
import {
  NESA_FEE_EDUCATION_LEVELS,
  NESA_SMART_CHECKER_CATEGORIES,
  NESA_CATEGORY_META,
  NESA_FEE_TERMS,
} from './nesaFeeLimitShared';

const inp = {
  ...themeInp,
  background: 'rgba(248, 250, 252, 0.9)',
  border: '1px solid rgba(0, 0, 0, 0.08)',
  borderRadius: 14,
};

const labelCls =
  'block text-[10px] font-bold uppercase tracking-[0.12em] text-[#92400e] mb-1.5';

/**
 * Modern centered modal for creating / editing national fee limits.
 * Education levels match school Babyeyi smart checker (Nursery · Primary · Secondary · TSS).
 */
export default function NesaFeeLimitFormModal({
  open,
  editItem,
  form,
  setForm,
  pdfFile,
  setPdfFile,
  saving,
  onClose,
  onSave,
  yearOptions = [],
}) {
  const pdfInputRef = useRef(null);
  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6"
      style={{ fontFamily: font }}
    >
      <button
        type="button"
        className="absolute inset-0 bg-[#000435]/50 backdrop-blur-md"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-black/[0.08] bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="nesa-fee-limit-title"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-black/[0.06] bg-gradient-to-r from-[#000435] to-[#0a1142] px-5 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#FEBF10]/80">
              National fee regulation
            </p>
            <h2 id="nesa-fee-limit-title" className="text-base font-semibold text-white sm:text-lg">
              {editItem ? `Edit fee limit #${editItem.id}` : 'Set new fee limit'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-white/80 hover:bg-white/20"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          <div className="mb-5 rounded-xl border border-amber-100 bg-amber-50/60 px-4 py-3">
            <p className="text-[11px] leading-relaxed text-amber-950/90">
              <strong>Smart checker alignment:</strong> use the same education level labels schools pick in the
              Babyeyi wizard — Nursery, Primary, Secondary, or TSS — so the national cap matches each school&apos;s
              fee checker.
            </p>
          </div>

          <div className="mb-5">
            <p className={labelCls}>
              Education level <span className="text-red-500">*</span>
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {NESA_FEE_EDUCATION_LEVELS.map((opt) => {
                const active = form.level === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, level: opt.id }))}
                    className={`rounded-xl border px-3.5 py-3 text-left transition-all ${
                      active
                        ? 'border-[#c87800] bg-gradient-to-br from-amber-50 to-white ring-2 ring-[#FEBF10]/25 shadow-md shadow-amber-500/10'
                        : 'border-slate-200 bg-white hover:border-[#c87800]/35 hover:bg-amber-50/40'
                    }`}
                  >
                    <p className={`text-sm font-bold ${active ? 'text-[#000435]' : 'text-slate-700'}`}>
                      {opt.label}
                    </p>
                    <p className="mt-0.5 text-[10px] text-slate-500">School checker: {opt.nesaLevel}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mb-5">
            <p className={labelCls}>
              School category <span className="text-red-500">*</span>
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {NESA_SMART_CHECKER_CATEGORIES.map((cat) => {
                const meta = NESA_CATEGORY_META[cat] || { label: cat, desc: '' };
                const active = form.category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, category: cat }))}
                    className={`rounded-xl border px-3 py-3 text-left transition-all ${
                      active
                        ? 'border-[#c87800] bg-gradient-to-br from-amber-50 to-white ring-2 ring-[#FEBF10]/25 shadow-md shadow-amber-500/10'
                        : 'border-slate-200 bg-white hover:border-[#c87800]/35 hover:bg-amber-50/40'
                    }`}
                  >
                    <p className={`text-sm font-bold ${active ? 'text-[#000435]' : 'text-slate-700'}`}>
                      {meta.label}
                    </p>
                    <p className="mt-0.5 text-[10px] leading-snug text-slate-500">{meta.desc}</p>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
              Same categories as the school Babyeyi wizard — Public, Boarding, or TVET (private schools skip the checker).
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Term</label>
              <select
                value={form.term}
                onChange={(e) => setForm((f) => ({ ...f, term: e.target.value }))}
                style={inp}
              >
                {NESA_FEE_TERMS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
              {form.term === 'Full Year' && (
                <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
                  Applies to Term 1, Term 2, and Term 3 for this category, level, and academic year.
                </p>
              )}
            </div>

            <div>
              <label className={labelCls}>
                Academic year <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.academic_year}
                onChange={(e) => setForm((f) => ({ ...f, academic_year: e.target.value }))}
                placeholder="e.g. 2025-2026"
                list="nesa-fee-limit-years-modal"
                style={inp}
              />
              <datalist id="nesa-fee-limit-years-modal">
                {(yearOptions || []).map((y) => (
                  <option key={y} value={y} />
                ))}
              </datalist>
              <p className="mt-1.5 text-[10px] text-slate-500">Format YYYY-YYYY (e.g. 2027-2028)</p>
            </div>

            <div>
              <label className={labelCls}>
                Maximum amount (RWF) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="500"
                value={form.max_amount}
                onChange={(e) => setForm((f) => ({ ...f, max_amount: e.target.value }))}
                placeholder="e.g. 150000"
                style={inp}
              />
            </div>

            <div>
              <label className={labelCls}>Regulation reference</label>
              <input
                type="text"
                value={form.regulation_ref}
                onChange={(e) => setForm((f) => ({ ...f, regulation_ref: e.target.value }))}
                placeholder="e.g. MoE/2024/001"
                style={inp}
              />
            </div>

            <div>
              <label className={labelCls}>Effective date</label>
              <input
                type="date"
                value={form.effective_date}
                onChange={(e) => setForm((f) => ({ ...f, effective_date: e.target.value }))}
                style={inp}
              />
            </div>

            {form.max_amount ? (
              <div className="sm:col-span-2">
                <div className="rounded-2xl bg-gradient-to-br from-[#000435] to-[#0a1142] px-5 py-4 text-center shadow-lg">
                  <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#FEBF10]/80">Preview</p>
                  <p className="mt-1 text-2xl font-black text-[#FEBF10]">
                    RWF {Number(form.max_amount).toLocaleString()}
                  </p>
                  <p className="mt-1 text-[11px] text-white/70">
                    {form.category} · {form.level} · {form.term}
                  </p>
                  <p className="text-[10px] text-white/45">{form.academic_year || '—'}</p>
                </div>
              </div>
            ) : null}

            <div className="sm:col-span-2">
              <label className={labelCls}>Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={2}
                placeholder="Any additional notes about this fee limit…"
                style={{ ...inp, resize: 'none', lineHeight: 1.6 }}
              />
            </div>

            <div className="sm:col-span-2">
              <label className={labelCls}>Official regulation PDF (optional)</label>
              <input
                ref={pdfInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
              />
              <button
                type="button"
                onClick={() => pdfInputRef.current?.click()}
                className={`w-full rounded-xl border-2 border-dashed px-4 py-5 text-center transition-colors ${
                  pdfFile
                    ? 'border-emerald-200 bg-emerald-50'
                    : 'border-amber-200 bg-amber-50/40 hover:bg-amber-50/70'
                }`}
              >
                {pdfFile ? (
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-800">
                    <FileText size={16} />
                    {pdfFile.name}
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        setPdfFile(null);
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && setPdfFile(null)}
                      className="ml-1 text-red-500"
                    >
                      <X size={14} />
                    </span>
                  </span>
                ) : (
                  <>
                    <Upload className="mx-auto mb-2 text-amber-400" size={22} />
                    <span className="text-xs font-semibold text-slate-600">Click to upload regulation PDF</span>
                    {editItem?.document_name ? (
                      <p className="mt-1 text-[10px] text-slate-400">
                        Current: {editItem.document_name} — leave empty to keep
                      </p>
                    ) : null}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 gap-3 border-t border-black/[0.06] bg-slate-50/80 px-5 py-4 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#c87800] to-[#FEBF10] py-2.5 text-xs font-bold uppercase tracking-wider text-[#000435] shadow-md disabled:opacity-60"
          >
            {saving ? (
              <>
                <Loader2 size={15} className="animate-spin" /> Saving…
              </>
            ) : (
              <>
                <Save size={15} /> {editItem ? 'Update limit' : 'Create limit'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
