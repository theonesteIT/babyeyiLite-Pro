import { createElement } from 'react';

/**
 * Ochre hero + overlapping KPI strip — matches accountant Dashboard layout.
 */
export default function AccountantBudgetHeroShell({
  eyebrow,
  title,
  subtitle,
  HeroIcon = null,
  headerRight = null,
  kpiTiles = [],
  kpiGridClassName = '',
  pageBody = null,
  outerClassName = 'bg-slate-100 min-h-full',
}) {
  const n = kpiTiles.length;
  const defaultGrid =
    n <= 4
      ? 'grid-cols-2 lg:grid-cols-4'
      : n === 5
        ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5'
        : 'grid-cols-2 sm:grid-cols-3 xl:grid-cols-6';

  return (
    <div className={outerClassName} style={{ fontFamily: "'Montserrat', sans-serif" }}>
      <div className="relative w-full min-h-[200px] sm:min-h-[220px] overflow-hidden bg-[#c87800]">
        <div
          className="absolute -top-28 -right-28 w-[22rem] h-[22rem] rounded-full border border-white/[0.07] pointer-events-none"
          aria-hidden
        />
        <div
          className="absolute -top-14 -right-14 w-[15rem] h-[15rem] rounded-full border border-white/[0.06] pointer-events-none"
          aria-hidden
        />
        <div
          className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#FEBF10]/30 to-transparent pointer-events-none"
          aria-hidden
        />

        <div className="relative z-10 max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-12 pt-10 sm:pt-12 pb-20 sm:pb-24 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5">
          <div className="flex flex-col sm:flex-row gap-5 sm:gap-6 items-start flex-1 min-w-0">
            {HeroIcon ? (
              <div className="hidden sm:flex shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-3xl border border-white/10 bg-white/5 items-center justify-center backdrop-blur-sm">
                {createElement(HeroIcon, { size: 32, className: 'text-[#FEBF10]', strokeWidth: 1.75 })}
              </div>
            ) : null}
            <div className="space-y-1 max-w-3xl min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-5 h-1 rounded-full bg-[#FEBF10]" aria-hidden />
                {eyebrow ? (
                  <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#FEBF10]">{eyebrow}</p>
                ) : null}
              </div>
              <h1 className="text-xl md:text-2xl font-semibold text-white tracking-tight leading-none uppercase">
                {title}
              </h1>
              {subtitle ? (
                <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.16em] text-white/85 max-w-xl leading-relaxed">
                  {subtitle}
                </p>
              ) : null}
            </div>
          </div>
          {headerRight ? <div className="flex flex-wrap items-center gap-2 shrink-0">{headerRight}</div> : null}
        </div>
      </div>

      {kpiTiles.length > 0 ? (
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 -mt-4 sm:-mt-5 pt-2 relative z-20 mb-6">
          <div className="bg-white rounded-t-[32px] shadow-sm border border-black/10 overflow-hidden">
            <div className={`grid ${kpiGridClassName || defaultGrid} divide-x divide-y divide-black/5`}>
              {kpiTiles.map((t, i) => {
                const Icon = t.icon;
                const inner = (
                  <>
                    {Icon ? (
                      <div className="mb-1 sm:mb-1.5 opacity-40 shrink-0" style={{ color: '#FEBF10' }}>
                        <Icon size={12} className="mb-1.5 mx-auto" strokeWidth={2} aria-hidden />
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
        </div>
      ) : null}

      {pageBody}
    </div>
  );
}
