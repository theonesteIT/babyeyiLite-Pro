import { createElement } from 'react';
import { font } from '../utils/theme';

const pillClass = {
  muted: 'border border-white/20 bg-white/10 text-white',
  accent: 'border border-[#FEBF10]/40 bg-[#FEBF10]/15 text-[#FEBF10]',
  alert: 'border border-white/30 bg-white/15 text-white',
};

export default function NesaPageHero({
  config,
  loading = false,
  actions = null,
  onKpiClick,
}) {
  if (!config) return null;

  const Icon = config.icon;
  const kpis = config.kpis || [];
  const kpiCols = config.kpiCols || (kpis.length <= 4 ? kpis.length : 6);
  const gridClass =
    kpiCols <= 4
      ? 'grid-cols-2 sm:grid-cols-2 lg:grid-cols-4'
      : kpiCols === 5
        ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5'
        : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6';

  return (
    <>
      <section className="anim relative w-full min-h-[200px] overflow-hidden bg-[#c87800] sm:min-h-[220px]">
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full border border-white/5"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-12 -top-12 h-64 w-64 rounded-full border border-white/5"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-[#FEBF10]/30 to-transparent"
          aria-hidden
        />

        <div className="relative z-10 mx-auto flex max-w-[1600px] flex-col gap-5 px-4 pb-20 pt-10 sm:flex-row sm:items-center sm:gap-8 sm:px-6 sm:pb-24 sm:pt-12 lg:px-8">
          {Icon && (
            <div className="hidden h-20 w-20 shrink-0 items-center justify-center rounded-3xl border border-white/10 bg-white/5 shadow-sm backdrop-blur-xl md:flex">
              {createElement(Icon, {
                size: 40,
                style: { color: '#FEBF10' },
                strokeWidth: 1.75,
                'aria-hidden': true,
              })}
            </div>
          )}

          <div className="min-w-0 flex-1 space-y-1">
            <div className="mb-1 flex items-center gap-2">
              <span className="h-1 w-5 animate-pulse rounded-full bg-[#FEBF10]" aria-hidden />
              <p className="m-0 text-[9px] font-semibold uppercase tracking-[0.2em] text-[#FEBF10]">
                {config.eyebrow}
              </p>
            </div>
            <h1
              className="m-0 text-xl font-semibold uppercase leading-none tracking-tight text-white md:text-2xl lg:text-3xl"
              style={{ fontFamily: font }}
            >
              {config.title}
            </h1>
            {(config.subtitle || config.welcome) && (
              <p className="m-0 max-w-2xl pt-2 text-[10px] font-medium uppercase tracking-widest text-white/60 md:text-xs">
                {config.subtitle || config.welcome}
              </p>
            )}
          </div>

          <div className="flex flex-col items-stretch gap-3 sm:ml-auto sm:items-end">
            {config.pills?.length > 0 && (
              <div className="nesa-hero-pills flex flex-wrap gap-2 sm:justify-end">
                {config.pills.map((pill) => {
                  const PillIcon = pill.icon;
                  const cls = pillClass[pill.variant] || pillClass.muted;
                  return (
                    <span
                      key={pill.label}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-semibold ${cls} ${pill.pulse ? 'animate-pulse' : ''}`}
                    >
                      {PillIcon && <PillIcon size={13} />}
                      {pill.label}
                    </span>
                  );
                })}
              </div>
            )}
            {actions && <div className="flex flex-wrap gap-2 sm:justify-end">{actions}</div>}
          </div>
        </div>
      </section>

      {kpis.length > 0 && (
        <div className="relative z-20 mx-auto -mt-12 mb-6 max-w-[1600px] px-4 sm:-mt-14 sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-t-[32px] border border-black/10 bg-white shadow-sm">
            <div
              className={`nesa-stats-grid grid divide-x divide-y divide-black/5 lg:divide-y-0 ${gridClass}`}
            >
              {kpis.map((kpi) => {
                const KpiIcon = kpi.icon;
                const Tag = onKpiClick ? 'button' : 'div';
                return (
                  <Tag
                    key={kpi.key}
                    type={onKpiClick ? 'button' : undefined}
                    onClick={onKpiClick ? () => onKpiClick(kpi) : undefined}
                    className={`flex min-h-[6.75rem] flex-col items-center justify-center p-4 text-center sm:p-5 ${
                      onKpiClick ? 'cursor-pointer transition-colors hover:bg-[#F3F4F6]/80' : ''
                    }`}
                  >
                    <div className="mb-1.5 shrink-0 opacity-40" style={{ color: '#FEBF10' }}>
                      {KpiIcon && (
                        <KpiIcon size={12} className="mx-auto mb-1.5" strokeWidth={2} aria-hidden />
                      )}
                    </div>
                    <span className="text-sm font-semibold tabular-nums leading-snug tracking-tight text-[#000435] sm:text-lg">
                      {loading ? (
                        <span className="inline-block h-6 w-10 animate-pulse rounded bg-gray-100" />
                      ) : (
                        kpi.value ?? '—'
                      )}
                    </span>
                    <p className="mt-0.5 text-[7px] font-semibold uppercase tracking-[0.12em] text-[#000435]/55 sm:text-[8px]">
                      {kpi.label}
                    </p>
                  </Tag>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
