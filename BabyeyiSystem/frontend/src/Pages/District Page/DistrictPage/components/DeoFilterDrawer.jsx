import { useEffect, useState } from 'react';
import { X, Calendar, Filter } from 'lucide-react';
import { font } from '../utils/theme';
import {
  DEO_BABYEYI_STATUS_OPTIONS,
  DEO_REQUEST_STATUS_OPTIONS,
  DEO_EXCEEDS_OPTIONS,
  DEO_CATEGORY_OPTIONS,
  DEO_LEVEL_OPTIONS,
  ALL_TERMS_LABEL,
  ALL_TERMS_VALUE,
} from '../utils/districtPortalFilters';
import { TERM_OPTIONS } from '../../../../utils/babyeyiAcademicPeriod';
import DeoRequestStatusPills from './DeoRequestStatusPills';

function SectionTitle({ children }) {
  return (
    <h4 className="m-0 mb-3 text-[11px] font-black uppercase tracking-widest text-[#000435]/55">
      {children}
    </h4>
  );
}

function FieldLabel({ children }) {
  return (
    <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-amber-800/80">
      {children}
    </span>
  );
}

const inputClass =
  'w-full rounded-xl border border-[#e5e7eb] bg-white px-3 py-2.5 text-[13px] font-semibold text-[#000435] outline-none transition-shadow focus:border-amber-500 focus:ring-2 focus:ring-amber-400/30';

const selectClass = inputClass;

/**
 * District DEO portal — right-side filter panel (NESA-style, mobile-friendly).
 */
export default function DeoFilterDrawer({
  open,
  onClose,
  draft,
  onDraftChange,
  onApply,
  onReset,
  yearOptions = [],
  termOptions = [],
  schoolOptions = [],
  sectorOptions = [],
  applyLabel = 'Apply Filters',
  showRequestStatus = false,
  requestSummary = null,
}) {
  const [tab, setTab] = useState('quick');
  const terms = termOptions.length ? termOptions : TERM_OPTIONS;

  useEffect(() => {
    if (open && showRequestStatus) setTab('quick');
  }, [open, showRequestStatus]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const set = (patch) => onDraftChange?.({ ...draft, ...patch });

  const toggleStatus = (id) => {
    if (id === 'all') {
      set({ babyeyiStatuses: ['all'] });
      return;
    }
    let next = (draft?.babyeyiStatuses || ['all']).filter((s) => s !== 'all');
    if (next.includes(id)) next = next.filter((s) => s !== id);
    else next = [...next, id];
    if (!next.length) next = ['all'];
    set({ babyeyiStatuses: next });
  };

  const isStatusChecked = (id) => {
    const st = draft?.babyeyiStatuses || ['all'];
    if (id === 'all') return st.includes('all') || st.length === 0;
    return st.includes(id);
  };

  return (
    <>
      <style>{`
        @keyframes deoFilterSlideIn {
          from { transform: translateX(100%); opacity: 0.6; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
      <button
        type="button"
        className="fixed inset-0 z-[110] cursor-default bg-[#000435]/40 backdrop-blur-[2px]"
        aria-label="Close filters"
        onClick={onClose}
      />
      <aside
        className="fixed inset-y-0 right-0 z-[111] flex w-full max-w-[min(100%,420px)] flex-col bg-white shadow-[-8px_0_40px_rgba(0,4,53,0.12)] animate-[deoFilterSlideIn_0.28s_ease-out]"
        style={{ fontFamily: font }}
        role="dialog"
        aria-modal="true"
        aria-label="Filters"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[#f3f4f6] px-4 py-4 sm:px-5">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
              <Filter className="h-4 w-4" />
            </span>
            <h2 className="m-0 text-lg font-black text-[#000435]">Filters</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-[#e5e7eb] bg-white text-[#000435]/60 transition-colors hover:bg-[#f9fafb] hover:text-[#000435]"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="shrink-0 border-b border-[#f3f4f6] px-4 py-3 sm:px-5">
          <div className="flex gap-2 rounded-xl bg-[#f3f4f6] p-1">
            {[
              { id: 'quick', label: 'Quick Filters' },
              { id: 'advanced', label: 'Advanced Filters' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`flex-1 cursor-pointer rounded-lg px-3 py-2.5 text-[12px] font-bold transition-all ${
                  tab === t.id
                    ? 'bg-white text-[#000435] shadow-sm ring-1 ring-[#fde68a]'
                    : 'text-[#000435]/50 hover:text-[#000435]/75'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-5">
          {tab === 'quick' && (
            <div className="space-y-6">
              <section>
                <SectionTitle>Academic Period</SectionTitle>
                <div className="space-y-4">
                  <label className="block">
                    <FieldLabel>Academic Year</FieldLabel>
                    <div className="relative">
                      <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-600" />
                      <input
                        type="text"
                        value={draft?.academicYear || ''}
                        onChange={(e) => set({ academicYear: e.target.value })}
                        placeholder="e.g. 2027-2028 or leave empty"
                        list="deo-filter-years"
                        className={`${inputClass} pl-10`}
                      />
                      <datalist id="deo-filter-years">
                        {(yearOptions || []).map((y) => (
                          <option key={y} value={y} />
                        ))}
                      </datalist>
                    </div>
                    <p className="m-0 mt-1.5 text-[10px] font-medium text-[#000435]/45">
                      Format YYYY-YYYY — second year = first + 1
                    </p>
                  </label>
                  <label className="block">
                    <FieldLabel>Term</FieldLabel>
                    <select
                      value={draft?.term ?? ''}
                      onChange={(e) => set({ term: e.target.value })}
                      className={selectClass}
                    >
                      <option value={ALL_TERMS_VALUE}>{ALL_TERMS_LABEL}</option>
                      {terms.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </section>

              {showRequestStatus ? (
                <section className="rounded-2xl border border-[#fde68a]/80 bg-gradient-to-b from-amber-50/50 to-white p-4">
                  <SectionTitle>Increase request status</SectionTitle>
                  <DeoRequestStatusPills
                    variant="drawer"
                    value={draft?.requestStatus ?? ''}
                    onChange={(key) => set({ requestStatus: key })}
                    summary={requestSummary || {}}
                  />
                  <p className="m-0 mt-3 text-[10px] leading-relaxed text-[#000435]/45">
                    Tap a status, then Apply. Counts reflect your current academic period and school filters.
                  </p>
                </section>
              ) : (
                <section>
                  <SectionTitle>Babyeyi Status</SectionTitle>
                  <ul className="m-0 flex flex-col gap-1 p-0">
                    {DEO_BABYEYI_STATUS_OPTIONS.map((opt) => (
                      <li key={opt.id} className="list-none">
                        <label className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-amber-50/60">
                          <input
                            type="checkbox"
                            checked={isStatusChecked(opt.id)}
                            onChange={() => toggleStatus(opt.id)}
                            className="h-4 w-4 shrink-0 cursor-pointer rounded border-[#d1d5db] text-amber-600 focus:ring-amber-500"
                          />
                          <span className="text-[13px] font-semibold text-[#000435]">{opt.label}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          )}

          {tab === 'advanced' && (
            <div className="space-y-6">
              <section>
                <SectionTitle>School</SectionTitle>
                <label className="block">
                  <FieldLabel>Select School</FieldLabel>
                  <select
                    value={draft?.schoolId || ''}
                    onChange={(e) => set({ schoolId: e.target.value })}
                    className={selectClass}
                  >
                    <option value="">All Schools</option>
                    {(schoolOptions || []).map((s) => (
                      <option key={s.id} value={String(s.id)}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
              </section>

              <section>
                <SectionTitle>Location & Type</SectionTitle>
                <div className="space-y-4">
                  <label className="block">
                    <FieldLabel>Sector</FieldLabel>
                    <select
                      value={draft?.sector || ''}
                      onChange={(e) => set({ sector: e.target.value })}
                      className={selectClass}
                    >
                      <option value="">All sectors</option>
                      {(sectorOptions || []).map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <FieldLabel>Category</FieldLabel>
                    <select
                      value={draft?.category || ''}
                      onChange={(e) => set({ category: e.target.value })}
                      className={selectClass}
                    >
                      {DEO_CATEGORY_OPTIONS.map((o) => (
                        <option key={o.value || 'all'} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <FieldLabel>Education Level</FieldLabel>
                    <select
                      value={draft?.level || ''}
                      onChange={(e) => set({ level: e.target.value })}
                      className={selectClass}
                    >
                      {DEO_LEVEL_OPTIONS.map((o) => (
                        <option key={o.value || 'all'} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </section>

              <section>
                <SectionTitle>Compliance</SectionTitle>
                <div className="space-y-4">
                  <label className="block">
                    <FieldLabel>Fee Limit</FieldLabel>
                    <select
                      value={draft?.exceedsLimit || 'all'}
                      onChange={(e) => set({ exceedsLimit: e.target.value })}
                      className={selectClass}
                    >
                      {DEO_EXCEEDS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  {!showRequestStatus && (
                    <label className="block">
                      <FieldLabel>Increase Request Status</FieldLabel>
                      <select
                        value={draft?.requestStatus || ''}
                        onChange={(e) => set({ requestStatus: e.target.value })}
                        className={selectClass}
                      >
                        {DEO_REQUEST_STATUS_OPTIONS.map((o) => (
                          <option key={o.value || 'all'} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                </div>
              </section>

              <section className="rounded-xl border border-dashed border-[#fde68a] bg-amber-50/40 p-4">
                <p className="m-0 text-[11px] leading-relaxed text-amber-900/80">
                  Filters apply across Dashboard, All Babyeyi, Increase Requests, Schools, and Analytics.
                  Use Settings to save a default academic year for your district.
                </p>
              </section>
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-[#f3f4f6] bg-[#fafafa] px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={onReset}
              className="order-2 w-full cursor-pointer rounded-xl border border-[#e5e7eb] bg-white py-3 text-[13px] font-bold text-[#000435] transition-colors hover:bg-[#f9fafb] sm:order-1 sm:flex-1"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={onApply}
              className="order-1 w-full cursor-pointer rounded-xl border-none bg-[#c87800] py-3 text-[13px] font-bold text-white shadow-md transition-opacity hover:opacity-95 sm:order-2 sm:flex-[1.4]"
            >
              {applyLabel}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
