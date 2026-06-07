import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X, SlidersHorizontal, CalendarRange, GraduationCap, BookOpen,
  Calendar, CalendarDays, RotateCcw,
} from 'lucide-react';
import {
  EMPTY_PROCUREMENT_DATE_FILTER,
  PROCUREMENT_FILTER_MODES,
  countActiveProcurementFilters,
  describeProcurementFilter,
} from './procurementDateFilter';

const NAVY = '#000435';

function FieldLabel({ icon: Icon, children }) {
  return (
    <span className="text-[10px] font-bold uppercase tracking-wider text-[#000435]/60 flex items-center gap-1.5 mb-2">
      {Icon && <Icon size={12} className="text-amber-600 shrink-0" />}
      {children}
    </span>
  );
}

export default function ProcurementDateFilterDrawer({
  open,
  onClose,
  value = EMPTY_PROCUREMENT_DATE_FILTER,
  onApply,
  academicOptions = {},
}) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (open) setDraft({ ...EMPTY_PROCUREMENT_DATE_FILTER, ...value });
  }, [open, value]);

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));
  const active = countActiveProcurementFilters(draft);
  const years = academicOptions.academicYears?.length
    ? academicOptions.academicYears
    : [academicOptions.academicYear].filter(Boolean);
  const terms = academicOptions.activeTerms?.length
    ? academicOptions.activeTerms
    : ['Term 1', 'Term 2', 'Term 3'];

  const apply = () => {
    onApply?.({ ...EMPTY_PROCUREMENT_DATE_FILTER, ...draft });
    onClose?.();
  };

  const reset = () => {
    const cleared = { ...EMPTY_PROCUREMENT_DATE_FILTER };
    setDraft(cleared);
    onApply?.(cleared);
    onClose?.();
  };

  return createPortal(
    <div className="fixed inset-0 z-[350] flex justify-end">
      <button
        type="button"
        aria-label="Close filters"
        className="absolute inset-0 bg-[#000435]/45 backdrop-blur-[3px] animate-in fade-in duration-200"
        onClick={onClose}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="proc-filter-title"
        className="relative h-full w-full max-w-[min(100vw,420px)] bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300"
      >
        {/* Header */}
        <div className="shrink-0 px-5 sm:px-6 pt-5 pb-4 border-b border-black/5 bg-gradient-to-br from-[#FEBF10]/15 via-white to-[#F7F8FC]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-2 rounded-xl bg-[#000435] text-white shadow-sm">
                  <SlidersHorizontal size={16} />
                </div>
                <div>
                  <h2 id="proc-filter-title" className="text-base sm:text-lg font-bold text-[#000435]">
                    Filter by period
                  </h2>
                  <p className="text-[11px] text-black/45 mt-0.5">
                    {active ? describeProcurementFilter(draft, academicOptions) : 'No period filter applied'}
                  </p>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl border border-black/8 bg-white text-black/50 hover:text-[#000435] hover:bg-black/5 shrink-0"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-6">
          {/* Mode pills */}
          <div>
            <FieldLabel icon={CalendarRange}>Period type</FieldLabel>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PROCUREMENT_FILTER_MODES.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => set({
                    mode: id,
                    ...(id === 'academic_year' && !draft.academicYear
                      ? { academicYear: academicOptions.academicYear || years[0] || '' }
                      : {}),
                    ...(id === 'term' && !draft.academicYear
                      ? {
                        academicYear: academicOptions.academicYear || years[0] || '',
                        term: academicOptions.currentTerm || terms[0] || '',
                      }
                      : {}),
                    ...(id === 'month' && !draft.month
                      ? { month: new Date().toISOString().slice(0, 7) }
                      : {}),
                  })}
                  className={`px-3 py-2.5 rounded-xl text-[11px] font-bold border transition-all text-left ${
                    draft.mode === id
                      ? 'border-[#000435] bg-[#000435] text-white shadow-md'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {draft.mode === 'academic_year' && (
            <div className="rounded-2xl border border-amber-200/60 bg-amber-50/40 p-4 space-y-3">
              <FieldLabel icon={GraduationCap}>Academic year</FieldLabel>
              <select
                className="w-full h-11 px-3 rounded-xl border border-black/10 bg-white text-sm font-medium text-[#000435] focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                value={draft.academicYear || academicOptions.academicYear || ''}
                onChange={(e) => set({ academicYear: e.target.value })}
              >
                <option value="">Select year</option>
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
              <p className="text-[11px] text-amber-900/70 leading-relaxed">
                Includes records from September through August of the selected academic year.
              </p>
            </div>
          )}

          {draft.mode === 'term' && (
            <div className="rounded-2xl border border-blue-200/60 bg-blue-50/30 p-4 space-y-4">
              <div>
                <FieldLabel icon={GraduationCap}>Academic year</FieldLabel>
                <select
                  className="w-full h-11 px-3 rounded-xl border border-black/10 bg-white text-sm font-medium text-[#000435] focus:outline-none focus:ring-2 focus:ring-blue-400/40"
                  value={draft.academicYear || academicOptions.academicYear || ''}
                  onChange={(e) => set({ academicYear: e.target.value })}
                >
                  <option value="">Select year</option>
                  {years.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div>
                <FieldLabel icon={BookOpen}>Term</FieldLabel>
                <div className="flex flex-wrap gap-2">
                  {terms.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => set({ term: t })}
                      className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                        draft.term === t
                          ? 'border-[#000435] bg-[#000435] text-white'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {draft.mode === 'month' && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
              <FieldLabel icon={Calendar}>Select month</FieldLabel>
              <input
                type="month"
                className="w-full h-11 px-3 rounded-xl border border-black/10 bg-white text-sm font-medium text-[#000435] focus:outline-none focus:ring-2 focus:ring-slate-300"
                value={draft.month}
                onChange={(e) => set({ month: e.target.value })}
              />
            </div>
          )}

          {draft.mode === 'week' && (
            <div className="rounded-2xl border border-emerald-200/60 bg-emerald-50/40 p-4">
              <FieldLabel icon={CalendarDays}>This week</FieldLabel>
              <p className="text-sm text-emerald-900/80 leading-relaxed">
                Shows records from Monday through Sunday of the current calendar week.
              </p>
            </div>
          )}

          {draft.mode === 'range' && (
            <div className="rounded-2xl border border-violet-200/60 bg-violet-50/30 p-4 space-y-4">
              <FieldLabel icon={CalendarRange}>Custom date range</FieldLabel>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-[10px] font-semibold text-black/45 mb-1 block">From</span>
                  <input
                    type="date"
                    className="w-full h-11 px-3 rounded-xl border border-black/10 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-300/50"
                    value={draft.dateFrom}
                    onChange={(e) => set({ dateFrom: e.target.value })}
                  />
                </label>
                <label className="block">
                  <span className="text-[10px] font-semibold text-black/45 mb-1 block">To</span>
                  <input
                    type="date"
                    className="w-full h-11 px-3 rounded-xl border border-black/10 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-300/50"
                    value={draft.dateTo}
                    min={draft.dateFrom || undefined}
                    onChange={(e) => set({ dateTo: e.target.value })}
                  />
                </label>
              </div>
            </div>
          )}

          {draft.mode === 'all' && (
            <div className="rounded-2xl border border-dashed border-black/10 p-5 text-center">
              <CalendarRange size={28} className="mx-auto text-black/20 mb-2" />
              <p className="text-sm text-black/50">All records will be shown regardless of date.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 px-5 sm:px-6 py-4 border-t border-black/5 bg-[#FAFBFD] flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
          <button
            type="button"
            onClick={reset}
            className="flex items-center justify-center gap-2 h-11 px-4 rounded-xl border border-black/10 text-xs font-bold uppercase text-black/55 hover:bg-white"
          >
            <RotateCcw size={14} /> Clear all
          </button>
          <button
            type="button"
            onClick={apply}
            className="flex-1 h-11 rounded-xl text-xs font-bold uppercase tracking-wide text-white shadow-lg"
            style={{ background: `linear-gradient(135deg, ${NAVY}, #0D2644)` }}
          >
            Apply filters
          </button>
        </div>
      </aside>
    </div>,
    document.body
  );
}

/** Compact filter trigger button with active-count badge. */
export function ProcurementFilterButton({ activeCount = 0, onClick, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative inline-flex items-center gap-2 h-10 px-3 sm:px-4 rounded-xl border text-xs font-bold uppercase tracking-wide transition-all ${
        activeCount
          ? 'border-[#000435] bg-[#000435]/5 text-[#000435]'
          : 'border-black/10 text-[#000435] hover:bg-black/5'
      } ${className}`}
    >
      <SlidersHorizontal size={14} />
      <span className="hidden sm:inline">Filter</span>
      {activeCount > 0 && (
        <span className="min-w-[1.125rem] h-[1.125rem] px-1 rounded-full bg-amber-500 text-[#000435] text-[9px] font-black flex items-center justify-center">
          {activeCount}
        </span>
      )}
    </button>
  );
}
