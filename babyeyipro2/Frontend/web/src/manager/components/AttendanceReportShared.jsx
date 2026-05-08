import React from 'react';

export function rowSessionTotals(row) {
  const ab = Number(row.absences) || 0;
  const r = Math.min(100, Math.max(0, Number(row.presenceRate) || 0));
  if (ab === 0 && r === 0) return { total: 0, present: 0, absent: 0 };
  // No absent marks → cannot infer total session count from rate alone.
  if (ab === 0) return { total: 0, present: 0, absent: 0 };
  const rate = Math.min(99.999, r);
  if (rate <= 0) return { total: ab, present: 0, absent: ab };
  const total = Math.max(ab, Math.round(ab / (1 - rate / 100)));
  return { total, present: Math.max(0, total - ab), absent: ab };
}

/** Derive present/absent totals from per-row absence counts and rounded presence rate (matches DOS roll-call aggregation). */
export function computeRollMixFromRows(rows) {
  let absent = 0;
  let present = 0;
  for (const row of rows) {
    const t = rowSessionTotals(row);
    present += t.present;
    absent += t.absent;
  }
  return { present, absent, total: present + absent };
}

/**
 * Donut + legend for roll-call mix (present includes late/permission per backend rules).
 */
export function AttendanceDonutSummaryCard({ present, absent, title = 'Attendance overview', footnote }) {
  const total = present + absent;
  const pPct = total ? Math.round((present / total) * 100) : 0;
  const aPct = total ? Math.max(0, 100 - pPct) : 0;

  return (
    <section className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-[0_8px_40px_-28px_rgba(15,34,66,0.35)] flex flex-col min-h-[220px]">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <div className="mt-4 flex flex-col sm:flex-row items-center gap-6 flex-1">
        <div className="relative w-[140px] h-[140px] sm:w-[160px] sm:h-[160px] shrink-0">
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: total
                ? `conic-gradient(#059669 0 ${pPct}%, #e11d48 ${pPct}% 100%)`
                : '#e2e8f0',
            }}
          />
          <div className="absolute inset-[14px] sm:inset-[16px] rounded-full bg-white flex flex-col items-center justify-center shadow-inner border border-slate-100">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900 tabular-nums">{total ? `${pPct}%` : '—'}</span>
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mt-0.5">Presence</span>
          </div>
        </div>
        <ul className="flex-1 w-full space-y-2.5 text-sm">
          <li className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-slate-600">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
              Present
            </span>
            <span className="font-semibold tabular-nums text-slate-900">
              {total ? `${present.toLocaleString()} (${pPct}%)` : '—'}
            </span>
          </li>
          <li className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-slate-600">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-600" />
              Absent
            </span>
            <span className="font-semibold tabular-nums text-slate-900">
              {total ? `${absent.toLocaleString()} (${aPct}%)` : '—'}
            </span>
          </li>
          <li className="flex items-center justify-between gap-3 text-slate-400">
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
              Late / excused
            </span>
            <span className="text-xs font-medium">Incl. in present</span>
          </li>
        </ul>
      </div>
      {footnote && <p className="mt-4 text-xs text-slate-500 leading-relaxed">{footnote}</p>}
    </section>
  );
}
