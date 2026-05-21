import { createElement } from 'react';

/**
 * Manager-parity ochre hero (#c87800) — matches babyeyipro Manager dashboard band.
 */
export default function LiteOchreHero({
  eyebrow = 'School operations',
  titleLine = '',
  titleAccent = '',
  /** Single uppercase title (e.g. "Conduct dashboard") — used when titleLine empty */
  title,
  subtitle = '',
  icon: Icon,
  rightSlot,
  className = '',
}) {
  const displayTitle = titleLine
    ? `${titleLine}${titleAccent ? ` ${titleAccent}` : ''}`.trim()
    : title || '';

  return (
    <div
      className={`relative w-full min-h-[200px] sm:min-h-[220px] overflow-hidden bg-[#c87800] ${className}`}
    >
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

      <div className="relative z-10 max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-12 pt-10 sm:pt-12 pb-20 sm:pb-24">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-col sm:flex-row gap-5 sm:gap-6 lg:gap-8 items-start flex-1 min-w-0">
            {Icon ? (
              <div className="hidden sm:flex shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-[24px] md:rounded-[28px] border border-white/10 bg-white/5 items-center justify-center backdrop-blur-sm shadow-sm">
                {createElement(Icon, {
                  size: 32,
                  className: 'text-[#FEBF10]',
                  strokeWidth: 1.75,
                })}
              </div>
            ) : null}
            <div className="space-y-1 max-w-3xl min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-5 h-1 rounded-full bg-[#FEBF10]" aria-hidden />
                {eyebrow ? (
                  <p
                    className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-[0.2em] text-[#FEBF10]"
                    style={{ fontFamily: "'Montserrat', sans-serif" }}
                  >
                    {eyebrow}
                  </p>
                ) : null}
              </div>
              <h1
                className="text-xl sm:text-2xl md:text-3xl font-semibold text-white tracking-tight leading-tight uppercase"
                style={{ fontFamily: "'Montserrat', sans-serif" }}
              >
                {title ? (
                  title
                ) : (
                  <>
                    {titleLine}
                    {titleAccent ? (
                      <>
                        {' '}
                        <span className="text-[#FEBF10]">{titleAccent}</span>
                      </>
                    ) : null}
                  </>
                )}
              </h1>
              {subtitle ? (
                <p
                  className="text-[10px] md:text-xs font-medium text-white/60 uppercase tracking-widest max-w-2xl leading-relaxed"
                  style={{ fontFamily: "'Montserrat', sans-serif" }}
                >
                  {subtitle}
                </p>
              ) : null}
            </div>
          </div>
          {rightSlot ? (
            <div className="flex flex-wrap items-center gap-3 shrink-0">{rightSlot}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
