import React, { useMemo, useState } from 'react';
import {
  Calendar, ChevronDown, Filter, Loader2, Search, SlidersHorizontal, Wallet,
} from 'lucide-react';
import PayrollExportBar from './PayrollExportBar';
import {
  PAYROLL_TERMS,
  buildPaymentTrackerRows,
  collectAcademicYears,
  canRequestTrackerPayment,
  filterPaymentTrackerRows,
  fmtRwfLabel,
  trackerStatusForBadge,
} from './payrollHelpers';
import {
  exportPaymentTrackerExcel,
  exportPaymentTrackerPdf,
} from './payrollExport';

const STATUS_STYLES = {
  Pending: 'bg-amber-100 text-amber-800 border-amber-200',
  Approved: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Paid: 'bg-blue-100 text-blue-800 border-blue-200',
  Rejected: 'bg-red-100 text-red-800 border-red-200',
};

function TrackerStatusBadge({ status }) {
  const key = trackerStatusForBadge(status);
  const cls = STATUS_STYLES[key] || 'bg-slate-100 text-slate-700 border-slate-200';
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider border ${cls}`}>
      {status}
    </span>
  );
}

const EMPTY_TRACKER_FILTERS = {
  search: '',
  academicYear: 'All',
  term: 'All',
  specificDate: '',
};

/**
 * Payment tracker tab — filters, export, desktop table + mobile cards.
 */
export default function PayrollPaymentTrackerPanel({
  requests = [],
  loading = false,
  portalLabel = 'Payroll payment tracker',
  schoolName = '',
  academicYearOptions = [],
  onFinishPayment = null,
  canFinishPayment = false,
  showFinishAction = true,
  finishActionLabel = 'Finish payment',
  finishActionHint = '',
}) {
  const [filters, setFilters] = useState(EMPTY_TRACKER_FILTERS);
  const [showFilters, setShowFilters] = useState(true);

  const allTrackerRows = useMemo(() => buildPaymentTrackerRows(requests), [requests]);
  const yearOptions = useMemo(
    () => collectAcademicYears(requests, academicYearOptions),
    [requests, academicYearOptions],
  );
  const filteredRows = useMemo(
    () => filterPaymentTrackerRows(allTrackerRows, filters),
    [allTrackerRows, filters],
  );

  const totals = useMemo(() => ({
    final: filteredRows.reduce((s, r) => s + Number(r.finalPayable || 0), 0),
    paid: filteredRows.reduce((s, r) => s + Number(r.paidAmount || 0), 0),
    remaining: filteredRows.reduce((s, r) => s + Number(r.remaining || 0), 0),
  }), [filteredRows]);

  const fieldClass =
    'h-10 w-full min-w-0 rounded-xl border border-slate-200/90 bg-white px-3 text-[11px] font-semibold text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FEBF10]/30 focus:border-[#c87800]/40';

  return (
    <div className="flex flex-col">
      <div className="px-4 sm:px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-amber-50/60 via-white to-slate-50/80">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-[#c87800]/15 flex items-center justify-center shrink-0">
              <Wallet size={18} style={{ color: '#c87800' }} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Payment progress</p>
              <h3 className="text-base font-semibold text-[#000435]">Payroll payment tracker</h3>
              <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                {filteredRows.length} period{filteredRows.length !== 1 ? 's' : ''} · Remaining {fmtRwfLabel(totals.remaining)}
              </p>
            </div>
          </div>
          <PayrollExportBar
            compact
            disabled={!filteredRows.length}
            onExportExcel={() => exportPaymentTrackerExcel({
              rows: filteredRows,
              portalLabel,
              filename: `payroll-tracker-${Date.now()}.xlsx`,
            })}
            onExportPdf={() => exportPaymentTrackerPdf({
              rows: filteredRows,
              portalLabel,
              schoolName,
              filename: `payroll-tracker-${Date.now()}.pdf`,
            })}
          />
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
          {[
            { label: 'Final payable', value: totals.final, accent: 'text-emerald-700' },
            { label: 'Paid', value: totals.paid, accent: 'text-blue-700' },
            { label: 'Remaining', value: totals.remaining, accent: 'text-orange-600' },
          ].map((t) => (
            <div key={t.label} className="rounded-xl border border-slate-100 bg-white/90 p-3 text-center shadow-sm">
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">{t.label}</p>
              <p className={`text-xs sm:text-sm font-bold tabular-nums mt-1 ${t.accent}`}>{fmtRwfLabel(t.value)}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 sm:px-5 py-3 border-b border-slate-100 space-y-3">
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <div className="relative flex-1 min-w-0">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={filters.search}
              onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
              placeholder="Search by staff name or code…"
              className={`${fieldClass} pl-9`}
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className={`h-10 px-4 rounded-xl border text-[10px] font-bold uppercase tracking-wider inline-flex items-center justify-center gap-2 shrink-0 transition ${
              showFilters ? 'bg-[#000435] border-[#000435] text-white' : 'border-slate-200 text-slate-600 bg-white hover:border-[#c87800]/40'
            }`}
          >
            <SlidersHorizontal size={14} />
            Filters
            <ChevronDown size={12} className={`transition ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 p-3 rounded-2xl bg-slate-50/90 border border-slate-100">
            <label className="block">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Academic year</span>
              <select
                value={filters.academicYear}
                onChange={(e) => setFilters((p) => ({ ...p, academicYear: e.target.value }))}
                className={fieldClass}
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Term</span>
              <select
                value={filters.term}
                onChange={(e) => setFilters((p) => ({ ...p, term: e.target.value }))}
                className={fieldClass}
              >
                {PAYROLL_TERMS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </label>
            <label className="block sm:col-span-2 lg:col-span-1">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Specific date</span>
              <div className="relative">
                <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="date"
                  value={filters.specificDate}
                  onChange={(e) => setFilters((p) => ({ ...p, specificDate: e.target.value }))}
                  className={`${fieldClass} pl-9`}
                />
              </div>
            </label>
            <div className="flex items-end sm:col-span-2 lg:col-span-1">
              <button
                type="button"
                onClick={() => setFilters(EMPTY_TRACKER_FILTERS)}
                className="h-10 w-full rounded-xl border border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-red-600 hover:border-red-200 bg-white transition"
              >
                Clear filters
              </button>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-400">
          <Loader2 size={24} className="animate-spin mx-auto mb-2" />
          <p className="text-[11px] font-semibold uppercase tracking-wider">Loading tracker…</p>
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="py-16 text-center px-6">
          <Filter size={32} className="mx-auto text-slate-200 mb-3" />
          <p className="text-sm font-semibold text-slate-500">No tracker rows match your filters</p>
          <p className="text-[11px] text-slate-400 mt-1">Adjust name, year, term, or date filters.</p>
        </div>
      ) : (
        <>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm text-left min-w-[640px]">
              <thead className="bg-slate-50 text-[9px] uppercase tracking-[0.14em] text-slate-400 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Staff</th>
                  <th className="px-4 py-3">Period</th>
                  <th className="px-4 py-3">Final payable</th>
                  <th className="px-4 py-3">Paid</th>
                  <th className="px-4 py-3">Remaining</th>
                  <th className="px-4 py-3">Status</th>
                  {showFinishAction && <th className="px-4 py-3 text-right">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.map((r) => (
                  <tr key={r.key} className="hover:bg-slate-50/70 transition">
                    <td className="px-4 py-3.5">
                      <p className="font-bold text-[#000435] text-xs">{r.staffName}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{r.staffCode}</p>
                    </td>
                    <td className="px-4 py-3.5 text-xs font-semibold text-slate-700">
                      {r.month} {r.year}
                      <span className="block text-[10px] text-slate-400 font-medium">{r.term}</span>
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-emerald-700 text-xs tabular-nums">{fmtRwfLabel(r.finalPayable)}</td>
                    <td className="px-4 py-3.5 font-semibold text-blue-700 text-xs tabular-nums">{fmtRwfLabel(r.paidAmount)}</td>
                    <td className="px-4 py-3.5 font-semibold text-orange-600 text-xs tabular-nums">{fmtRwfLabel(r.remaining)}</td>
                    <td className="px-4 py-3.5">
                      <TrackerStatusBadge status={r.status} />
                    </td>
                    {showFinishAction && (
                      <td className="px-4 py-3.5 text-right">
                        {onFinishPayment && canFinishPayment ? (
                          canRequestTrackerPayment(r) ? (
                            <button
                              type="button"
                              onClick={() => onFinishPayment(r)}
                              className="h-8 px-3 rounded-lg bg-[#FEBF10] hover:bg-amber-400 text-[#000435] text-[10px] font-bold uppercase tracking-wider transition active:scale-[0.98]"
                            >
                              {finishActionLabel}
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-semibold uppercase max-w-[8rem] inline-block text-right leading-tight">
                              {r.status === 'Pending Approval' ? 'With manager' : r.status === 'Approved' ? 'Ready to pay' : '—'}
                            </span>
                          )
                        ) : (
                          <span className="text-[10px] text-slate-400 font-semibold uppercase">View only</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden p-3 space-y-3">
            {filteredRows.map((r) => (
              <article
                key={r.key}
                className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-[#000435] text-sm truncate">{r.staffName}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{r.staffCode}</p>
                    <p className="text-[11px] font-semibold text-slate-600 mt-1">
                      {r.month} {r.year} · {r.term}
                    </p>
                  </div>
                  <TrackerStatusBadge status={r.status} />
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-emerald-50/80 p-2 border border-emerald-100">
                    <p className="text-[8px] font-bold text-emerald-700/70 uppercase">Final</p>
                    <p className="text-[10px] font-bold text-emerald-800 tabular-nums">{fmtRwfLabel(r.finalPayable)}</p>
                  </div>
                  <div className="rounded-xl bg-blue-50/80 p-2 border border-blue-100">
                    <p className="text-[8px] font-bold text-blue-700/70 uppercase">Paid</p>
                    <p className="text-[10px] font-bold text-blue-800 tabular-nums">{fmtRwfLabel(r.paidAmount)}</p>
                  </div>
                  <div className="rounded-xl bg-orange-50/80 p-2 border border-orange-100">
                    <p className="text-[8px] font-bold text-orange-700/70 uppercase">Left</p>
                    <p className="text-[10px] font-bold text-orange-800 tabular-nums">{fmtRwfLabel(r.remaining)}</p>
                  </div>
                </div>
                {showFinishAction && onFinishPayment && canFinishPayment && (
                  canRequestTrackerPayment(r) ? (
                    <button
                      type="button"
                      onClick={() => onFinishPayment(r)}
                      className="w-full h-10 rounded-xl bg-[#000435] text-[#FEBF10] text-[10px] font-bold uppercase tracking-wider transition active:scale-[0.98]"
                    >
                      {finishActionLabel}
                    </button>
                  ) : (
                    <p className="text-[10px] text-center text-slate-400 font-semibold uppercase tracking-wider">
                      {r.status === 'Pending Approval'
                        ? 'Awaiting school manager approval'
                        : r.status === 'Approved'
                          ? 'Approved — manager will release payment'
                          : finishActionHint || 'No action available'}
                    </p>
                  )
                )}
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
