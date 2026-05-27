import { createElement } from 'react';

/**
 * Compact KPI row — matches Action Plan Dashboard / accountant Dashboard stats strip.
 */
export default function ActionPlanKpiStrip({
  tiles = [],
  gridClassName = 'grid-cols-2 sm:grid-cols-4 xl:grid-cols-8',
  className = '',
}) {
  if (!tiles.length) return null;

  return (
    <div className={`bg-white rounded-t-[32px] shadow-sm border border-black/10 overflow-hidden ${className}`}>
      <div className={`grid ${gridClassName} divide-x divide-y sm:divide-y-0 divide-black/5`}>
        {tiles.map((t, i) => {
          const Icon = t.icon;
          const inner = (
            <>
              {Icon ? (
                <div className="mb-1 sm:mb-1.5 opacity-40 shrink-0" style={{ color: '#FEBF10' }}>
                  {createElement(Icon, { size: 12, className: 'mx-auto', strokeWidth: 2, 'aria-hidden': true })}
                </div>
              ) : null}
              <span className="text-sm sm:text-xl font-semibold text-[#000435] tabular-nums tracking-tight leading-snug">
                {t.value}
              </span>
              <p className="text-[7px] sm:text-[8px] font-medium text-slate-500 uppercase tracking-[0.16em] mt-0.5 opacity-70">
                {t.label}
              </p>
              {t.subValue ? (
                <p className="text-[6px] sm:text-[7px] font-medium uppercase tracking-widest mt-1 text-[#1E3A5F] max-w-[11rem] opacity-85">
                  {t.subValue}
                </p>
              ) : null}
            </>
          );
          const cellClass =
            'p-4 sm:p-5 flex flex-col items-center justify-center text-center min-h-[6.75rem]';
          if (t.onClick) {
            return (
              <button
                key={t.key ?? i}
                type="button"
                onClick={t.onClick}
                className={`${cellClass} hover:bg-slate-50/80 transition-all`}
              >
                {inner}
              </button>
            );
          }
          return (
            <div key={t.key ?? i} className={cellClass}>
              {inner}
            </div>
          );
        })}
      </div>
    </div>
  );
}
