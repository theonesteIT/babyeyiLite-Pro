import React from 'react';

/**
 * Manager ochre hero + overlapping KPI strip (aligned with `Dashboard.jsx`).
 * - `cardBody`: rendered inside the white card below the KPI grid (e.g. tabs + tables).
 * - `pageBody`: rendered below the white card (e.g. main content on grey bg).
 */
export default function ManagerOchreHeroShell({
  eyebrow,
  title,
  subtitle,
  HeroIcon = null,
  headerRight = null,
  kpiTiles = [],
  kpiGridClassName = '',
  cardBody = null,
  pageBody = null,
  outerClassName = 'animate-in fade-in duration-500 bg-re-bg min-h-screen pb-20',
  overlapClassName = 'max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 -mt-4 sm:-mt-5 pt-2 relative z-20 mb-6',
}) {
  const n = kpiTiles.length;
  const defaultGrid =
    n <= 4
      ? 'grid-cols-2 lg:grid-cols-4'
      : n === 5
      ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5'
      : 'grid-cols-2 md:grid-cols-3 xl:grid-cols-6';

  return (
    <div className={outerClassName}>
      <div className="relative w-full min-h-[200px] sm:min-h-[220px] overflow-hidden bg-[#c87800]">
        <div className="absolute -top-28 -right-28 w-[22rem] h-[22rem] rounded-full border border-white/[0.07] pointer-events-none" aria-hidden />
        <div className="absolute -top-14 -right-14 w-[15rem] h-[15rem] rounded-full border border-white/[0.06] pointer-events-none" aria-hidden />
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#FEBF10]/30 to-transparent pointer-events-none" aria-hidden />

        <div className="relative z-10 max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-12 pt-10 sm:pt-12 pb-20 sm:pb-24 flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-6">
          {HeroIcon ? (
            <div className="hidden md:flex shrink-0 w-20 h-20 rounded-3xl border border-white/10 bg-white/5 items-center justify-center backdrop-blur-xl shadow-sm relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-[#FEBF10]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
              <HeroIcon size={40} style={{ color: '#FEBF10' }} aria-hidden />
            </div>
          ) : null}

          <div className="space-y-1 max-w-3xl flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-5 h-1 rounded-full bg-[#FEBF10]" aria-hidden />
            </div>
            {eyebrow ? (
              <p className="text-[9px] font-semibold uppercase tracking-[0.2em]" style={{ color: '#FEBF10' }}>
                {eyebrow}
              </p>
            ) : null}
            <h1
              className="text-xl md:text-2xl font-semibold text-white tracking-tight leading-none mb-1 mt-0.5 uppercase"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              {title}
            </h1>
            {subtitle ? (
              <p className="text-[10px] md:text-xs font-medium text-white/60 uppercase tracking-widest max-w-2xl leading-relaxed">
                {subtitle}
              </p>
            ) : null}
          </div>

          {headerRight ? <div className="flex flex-wrap gap-2 items-center sm:ml-auto">{headerRight}</div> : null}
        </div>
      </div>

      <div className={overlapClassName}>
        <div className="bg-white rounded-t-[32px] shadow-sm border border-black/10 overflow-hidden flex flex-col">
          {kpiTiles.length > 0 ? (
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
                    <span className="text-sm sm:text-lg font-semibold text-re-text tabular-nums tracking-tight leading-snug">
                      {t.value}
                    </span>
                    <p className="text-[7px] sm:text-[8px] font-semibold text-re-text-muted uppercase tracking-[0.12em] mt-0.5 opacity-65">
                      {t.label}
                    </p>
                    {t.subValue ? (
                      <p className="text-[6px] sm:text-[7px] font-semibold uppercase tracking-[0.14em] mt-1 opacity-80 max-w-[11rem] text-[#1E3A5F]">
                        {t.subValue}
                      </p>
                    ) : null}
                  </>
                );
                const cellClass =
                  `p-4 sm:p-5 flex flex-col items-center justify-center text-center min-h-[6.75rem] ${t.selected ? 'ring-2 ring-inset ring-[#FEBF10]/35 bg-[#FEBF10]/06' : ''}`;
                if (t.onClick) {
                  return (
                    <button
                      key={t.key ?? i}
                      type="button"
                      onClick={t.onClick}
                      className={`${cellClass} hover:bg-re-bg/40 transition-all cursor-pointer group`}
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
          ) : null}
          {cardBody}
        </div>
      </div>

      {pageBody}
    </div>
  );
}
