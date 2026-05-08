import { PORTAL } from '../config/portal';
import StorekeeperOchreHero from './StorekeeperOchreHero';

/**
 * Shared shell: ochre hero + overlapping white card + stats strip + toolbar + content.
 */
export default function PortalListPageLayout({
  eyebrow,
  title,
  titleHighlight,
  subtitle,
  heroIcon: HeroIcon,
  stats = [],
  statGridClassName,
  rightColumn,
  toolbar,
  children,
}) {
  const eb = eyebrow ?? PORTAL.loginEyebrow ?? 'School store';

  let titleLine = title;
  let titleAccent = '';
  let titleSuffix = '';
  const hl = titleHighlight || '';
  if (hl && title.includes(hl)) {
    const i = title.indexOf(hl);
    titleLine = title.slice(0, i).trimEnd();
    titleAccent = hl;
    titleSuffix = title.slice(i + hl.length).trimStart();
  }

  const innerGrid =
    stats.length === 2
      ? 'grid-cols-2'
      : stats.length <= 3
        ? 'grid-cols-2 md:grid-cols-3'
        : 'grid-cols-2 md:grid-cols-4';

  return (
    <div className="animate-in fade-in duration-700 bg-re-bg min-h-screen" style={{ fontFamily: "'Montserrat', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />

      <StorekeeperOchreHero
        eyebrow={eb}
        titleLine={titleLine}
        titleAccent={titleAccent}
        titleSuffix={titleSuffix}
        subtitle={subtitle}
        icon={HeroIcon}
      />

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 -mt-4 sm:-mt-5 pt-2 relative z-20 pb-16 md:pb-20">
        <div className="bg-white rounded-t-[28px] md:rounded-t-[32px] shadow-sm border border-black/10 overflow-hidden flex flex-col min-h-[400px]">
          <div className={`grid grid-cols-1 lg:grid-cols-4 border-b border-black/5 ${statGridClassName || ''}`}>
            <div className={`${rightColumn ? 'lg:col-span-3' : 'lg:col-span-4'} grid ${innerGrid} divide-x divide-y md:divide-y-0 divide-black/5`}>
              {stats.map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={i}
                    className="p-4 sm:p-6 md:p-8 flex flex-col items-center justify-center text-center group hover:bg-re-bg/20 transition-all cursor-default min-h-[100px]"
                  >
                    {Icon ? (
                      <div className="mb-1.5 sm:mb-2 opacity-50 shrink-0 text-[#1E3A5F]">
                        <Icon size={14} strokeWidth={2.5} />
                      </div>
                    ) : null}
                    <span className="text-sm sm:text-lg md:text-xl font-semibold text-re-text tabular-nums tracking-tight group-hover:text-[#1E3A5F] transition-colors break-all px-1 leading-snug">
                      {stat.value}
                    </span>
                    <p className="text-[6px] sm:text-[8px] font-semibold text-re-text-muted uppercase tracking-[0.14em] mt-0.5 sm:mt-1 opacity-70">
                      {stat.label}
                    </p>
                  </div>
                );
              })}
            </div>

            {rightColumn ? (
              <div className="flex flex-col border-t lg:border-t-0 lg:border-l border-black/5 bg-re-bg/30 p-5 md:p-6 justify-center gap-2 md:gap-3 relative min-h-[100px] lg:min-h-[120px]">
                {rightColumn}
              </div>
            ) : null}
          </div>

          {toolbar ? (
            <div className="flex flex-wrap px-3 py-3 md:px-4 md:py-2 border-b border-black/5 items-center gap-2 bg-re-bg/20">
              {toolbar}
            </div>
          ) : null}

          <div className="overflow-x-auto bg-white flex-1 min-h-[280px]">{children}</div>
        </div>
      </div>
    </div>
  );
}
