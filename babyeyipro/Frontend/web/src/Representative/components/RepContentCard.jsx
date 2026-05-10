import React from 'react';

/** Shared white card for representative pages (below hero KPI strip). */
export function RepSection({ title, subtitle, action, children, className = '' }) {
  return (
    <section className={`px-4 sm:px-6 lg:px-8 pb-8 ${className}`}>
      <div className="max-w-[1600px] mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm font-bold text-[#000435] tracking-tight uppercase">{title}</h2>
            {subtitle ? <p className="text-xs text-re-text-muted mt-1 max-w-2xl">{subtitle}</p> : null}
          </div>
          {action}
        </div>
        {children}
      </div>
    </section>
  );
}

export function RepCardGrid({ children }) {
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{children}</div>;
}

export function RepStatCard({ icon: Icon, label, value, hint, tone = 'default' }) {
  const ring =
    tone === 'critical'
      ? 'ring-red-200/80'
      : tone === 'warn'
        ? 'ring-amber-200/90'
        : 'ring-black/[0.06]';
  return (
    <div
      className={`rounded-2xl border border-black/[0.06] bg-white p-5 shadow-sm hover:shadow-md transition-shadow ring-1 ${ring}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-re-text-muted">{label}</p>
          <p className="text-xl font-bold text-[#000435] tabular-nums mt-2">{value}</p>
          {hint ? <p className="text-[11px] text-re-text-muted mt-2 leading-snug">{hint}</p> : null}
        </div>
        {Icon ? (
          <div className="shrink-0 w-11 h-11 rounded-xl bg-[#000435]/[0.06] flex items-center justify-center ring-1 ring-amber-400/25">
            <Icon size={20} className="text-amber-500" strokeWidth={1.75} aria-hidden />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function RepListCard({ title, rows = [] }) {
  return (
    <div className="rounded-2xl border border-black/[0.06] bg-white overflow-hidden shadow-sm ring-1 ring-black/[0.04]">
      <div className="px-5 py-3.5 border-b border-black/[0.06] bg-[#000435] text-white">
        <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-amber-400/95">{title}</h3>
      </div>
      <ul className="divide-y divide-black/[0.05]">
        {rows.map((r, i) => (
          <li key={i} className="px-5 py-3.5 flex items-center justify-between gap-3 text-sm">
            <span className="text-[#000435] font-medium truncate">{r.label}</span>
            <span className="text-re-text-muted text-xs shrink-0 font-semibold tabular-nums">{r.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
