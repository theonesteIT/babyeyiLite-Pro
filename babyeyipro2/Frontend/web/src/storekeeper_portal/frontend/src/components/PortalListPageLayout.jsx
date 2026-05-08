import { PORTAL } from '../config/portal';

/**
 * Shared shell for list-style pages: hero + overlapping white card + stats strip + toolbar + content.
 * Matches accountant / discipline portal patterns (Fees, etc.).
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
  const hl = titleHighlight || '';
  const renderTitle = () => {
    if (!hl || !title.includes(hl)) {
      return (
        <>
          <span className="text-white">{title}</span>
        </>
      );
    }
    const i = title.indexOf(hl);
    return (
      <>
        <span className="text-white">{title.slice(0, i)}</span>
        <span style={{ color: '#FEBF10' }}>{hl}</span>
        <span className="text-white">{title.slice(i + hl.length)}</span>
      </>
    );
  };

  const innerGrid =
    stats.length === 2
      ? 'grid-cols-2'
      : stats.length <= 3
        ? 'grid-cols-2 md:grid-cols-3'
        : 'grid-cols-2 md:grid-cols-4';

  return (
    <div className="animate-in fade-in duration-700 bg-re-bg min-h-screen" style={{ fontFamily: "'Montserrat', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />

      <div className="relative w-full min-h-[240px] md:min-h-[280px] overflow-hidden">
        <div className="absolute inset-0 bg-[#0a192f]/85 z-10 backdrop-blur-[2px]" />
        <img src={PORTAL.heroImage || '/teacher.jpg'} alt="" className="absolute inset-0 w-full h-full object-cover scale-105" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#1E3A5F]/40 via-transparent to-transparent z-10 max-w-[1600px] mx-auto" />

        <div className="relative z-20 max-w-[1600px] mx-auto px-6 md:px-12 pt-12 md:pt-16 pb-20 md:pb-24 flex items-center gap-6 md:gap-8">
          <div className="hidden md:flex shrink-0 w-20 h-20 md:w-24 md:h-24 rounded-[28px] md:rounded-[32px] border border-white/10 bg-white/5 items-center justify-center backdrop-blur-xl shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-[#FEBF10]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            {HeroIcon ? (
              <HeroIcon size={36} style={{ color: '#FEBF10' }} className="md:w-10 md:h-10 group-hover:scale-110 transition-transform duration-500" />
            ) : null}
          </div>

          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-1 rounded-full animate-pulse" style={{ background: '#FEBF10' }} />
              <p className="text-[10px] font-black uppercase tracking-[0.3em]" style={{ color: '#FEBF10' }}>
                {eb}
              </p>
            </div>
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tighter leading-none mb-2 mt-1 uppercase">
              {renderTitle()}
            </h1>
            {subtitle ? (
              <p className="text-[8px] sm:text-[10px] md:text-xs font-bold text-white/40 max-w-lg leading-relaxed uppercase tracking-widest italic opacity-80">
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 md:px-12 -mt-20 md:-mt-24 relative z-20 pb-16 md:pb-20">
        <div className="bg-white rounded-t-[28px] md:rounded-t-[32px] shadow-2xl border border-black/5 overflow-hidden flex flex-col min-h-[400px]">
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
                    <span className="text-sm sm:text-xl md:text-2xl font-black text-re-text tracking-tighter group-hover:text-[#1E3A5F] transition-colors break-all px-1">
                      {stat.value}
                    </span>
                    <p className="text-[6px] sm:text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] mt-0.5 sm:mt-1 opacity-60">
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
