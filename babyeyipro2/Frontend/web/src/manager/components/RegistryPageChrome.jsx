import React from 'react';
import { ChevronDown, Download } from 'lucide-react';

/**
 * Shared shell for Students + HR Central (manager): page header, stat cards, content area.
 * Matches Babyeyi Manager reference: navy/gold accents, soft shadows, mobile-first.
 */
export function RegistryPageShell({ children, className = '' }) {
  return (
    <div className={`animate-in fade-in duration-500 bg-re-bg min-h-full pb-20 lg:pb-12 ${className}`}>
      <div className="max-w-[1480px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {children}
      </div>
    </div>
  );
}

export function RegistryPageHeader({
  overline = 'Registry',
  title,
  subtitle,
  secondaryAction,
  primaryAction,
}) {
  return (
    <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
      <div className="min-w-0 space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{overline}</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{title}</h1>
        {subtitle && (
          <p className="text-sm sm:text-[15px] text-slate-600 max-w-2xl leading-relaxed">{subtitle}</p>
        )}
      </div>
      <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3 shrink-0">
        {secondaryAction}
        {primaryAction}
      </div>
    </header>
  );
}

const STAT_TONES = {
  navy: 'bg-[#1E3A5F] text-white',
  gold: 'bg-re-gold text-[#0b1530]',
  emerald: 'bg-emerald-600 text-white',
  violet: 'bg-violet-600 text-white',
};

export function RegistryStatGrid({ items = [], columns = 'sm:grid-cols-2 xl:grid-cols-4' }) {
  return (
    <section className={`grid grid-cols-1 ${columns} gap-4`}>
      {items.map((card, i) => {
        const Icon = card.icon;
        const tone = card.tone || (i % 2 === 0 ? 'navy' : 'gold');
        return (
          <div
            key={card.label}
            className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_8px_30px_-22px_rgba(15,34,66,0.28)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{card.label}</p>
                <p className="mt-2 text-xl sm:text-2xl font-bold text-slate-900 tabular-nums truncate">{card.value}</p>
                {card.trend != null && card.trend !== '' && (
                  <p
                    className={`mt-1.5 text-xs font-semibold tabular-nums ${
                      String(card.trend).startsWith('-') ? 'text-rose-600' : 'text-emerald-600'
                    }`}
                  >
                    {card.trend}
                  </p>
                )}
              </div>
              {Icon && (
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full shadow-inner ${STAT_TONES[tone] || STAT_TONES.navy}`}
                >
                  <Icon size={20} strokeWidth={2} aria-hidden />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </section>
  );
}

/** White card wrapping filters + table */
export function RegistryCard({ children, className = '' }) {
  return (
    <section
      className={`rounded-2xl border border-slate-200/90 bg-white shadow-[0_8px_40px_-28px_rgba(15,34,66,0.35)] overflow-hidden ${className}`}
    >
      {children}
    </section>
  );
}

export function ExportSplitButton({ open, onOpen, onClose, children }) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => onOpen(!open)}
        className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[13px] font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-all"
      >
        <Download size={16} className="text-slate-500" />
        Export
        <ChevronDown size={16} className={`transition-transform shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <>
          <button type="button" className="fixed inset-0 z-30 cursor-default" aria-label="Close menu" onClick={onClose} />
          <div className="absolute right-0 z-40 mt-2 min-w-[200px] rounded-2xl border border-slate-200 bg-white py-2 shadow-xl">{children}</div>
        </>
      )}
    </div>
  );
}
