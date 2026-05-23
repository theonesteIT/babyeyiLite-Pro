import { RefreshCw } from 'lucide-react';
import '../dosPortalHero.css';
import { PORTAL } from '../config/portal';

const NAVY = '#000435';

/** Combine legacy DosOchreHero title parts into one heading. */
export function dosHeroTitle(titleLine = '', titleAccent = '') {
  return [titleLine, titleAccent].filter(Boolean).join(' ').trim();
}

/**
 * Orange hero + overlapping stats — matches DOS dashboard style (no teacher photo).
 */
export default function DosOrangePageHero({
  title,
  subtitle,
  heroStats = [],
  onRefresh,
  refreshing = false,
  liveOk = true,
  badgeLabel = PORTAL.loginBadge?.replace(' | ', ' · ') || 'Babyeyi · Secure',
  children = null,
  className = '',
}) {
  const hasStats = heroStats.length > 0;

  return (
    <section className={`dos-page-hero relative ${className}`}>
      <div className="dos-hero-orange relative flex min-h-[220px] items-center overflow-hidden text-white sm:min-h-[260px] md:min-h-[280px]">
        <div className="absolute left-4 top-4 z-10 sm:left-6 sm:top-6 md:left-8">
          <div className="inline-flex items-center rounded-full border border-white/25 bg-black/25 px-4 py-1.5 text-[10px] font-semibold tracking-[0.14em] text-white/95 backdrop-blur-md">
            {badgeLabel}
          </div>
        </div>

        <div className="absolute right-4 top-4 z-10 flex items-center gap-2 sm:right-6 sm:top-6 md:right-8">
          <div className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-black/25 px-3 py-2 text-[10px] font-medium uppercase tracking-widest text-white">
            {refreshing ? 'Updating…' : liveOk ? 'Live data' : 'Offline'}
          </div>
          {onRefresh ? (
            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshing}
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/25 bg-white/10 text-white transition hover:bg-white/20 active:scale-95 disabled:opacity-60"
              title="Refresh"
              aria-label="Refresh data"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            </button>
          ) : null}
        </div>

        <div
          className={`relative z-10 w-full max-w-4xl px-7 md:px-10 ${
            hasStats ? 'pb-16 pt-14 sm:pb-20 sm:pt-16' : 'pb-12 pt-14 sm:pt-16'
          }`}
        >
          <h1 className="mb-2 font-sans text-2xl font-extrabold tracking-tight md:text-3xl">{title}</h1>
          {subtitle ? (
            <p className="max-w-2xl text-sm font-semibold text-white/90 md:text-base">{subtitle}</p>
          ) : null}
          {children ? <div className="mt-4 flex flex-wrap gap-2.5">{children}</div> : null}
        </div>
      </div>

      {hasStats ? (
        <div className="relative z-20 mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 -mt-10 pt-2 pb-8">
          <div className="dos-hero-stats-panel rounded-t-[32px] bg-white">
            <div className="grid grid-cols-2 divide-x divide-y divide-black/5 sm:grid-cols-4 sm:divide-y-0">
              {heroStats.map((stat) => (
                <div
                  key={stat.label}
                  className="flex min-h-[6.5rem] flex-col items-center justify-center p-5 text-center transition-colors hover:bg-slate-50"
                >
                  <span
                    className="text-xl font-semibold tabular-nums tracking-tight sm:text-2xl"
                    style={{ color: NAVY }}
                  >
                    {stat.value}
                  </span>
                  <p className="mt-1 text-[8px] font-medium uppercase tracking-wider text-re-text-muted opacity-70 sm:text-[9px]">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

/** Content below hero — same spacing as DOS dashboard. */
export function DosPageBody({ children, className = '', maxWidth = 'max-w-[1600px]' }) {
  return (
    <div
      className={`relative z-10 mx-auto w-full space-y-5 px-4 pb-10 pt-2 sm:px-6 lg:px-8 ${maxWidth} ${className}`}
    >
      {children}
    </div>
  );
}
