import { createElement } from 'react';

const AMBER = '#c87800';
const GOLD = '#FEBF10';

/** Page hero — solid amber background (manager-aligned). */
export default function DosOchreHero({ eyebrow, titleLine, titleAccent, subtitle, icon: Icon, rightSlot }) {
  const title = [titleLine, titleAccent].filter(Boolean).join(' ').trim();

  return (
    <div className="relative w-full min-h-[180px] sm:min-h-[200px] overflow-hidden" style={{ backgroundColor: AMBER }}>
      <div
        className="absolute -top-28 -right-28 w-[22rem] h-[22rem] rounded-full border border-white/[0.07] pointer-events-none"
        aria-hidden
      />
      <div
        className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#FEBF10]/30 to-transparent pointer-events-none"
        aria-hidden
      />

      <div className="relative z-10 max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-12 pt-8 sm:pt-10 pb-16 sm:pb-20">
        <div className="flex flex-col gap-4 sm:gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-start min-w-0">
            {Icon ? (
              <div className="hidden sm:flex shrink-0 w-14 h-14 md:w-16 md:h-16 rounded-2xl border border-white/15 bg-white/10 items-center justify-center">
                {createElement(Icon, {
                  size: 28,
                  className: 'text-white/90',
                  strokeWidth: 1.5,
                })}
              </div>
            ) : null}
            <div className="space-y-1 max-w-3xl min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-5 h-1 rounded-full" style={{ backgroundColor: GOLD }} aria-hidden />
                <p className="text-[10px] font-medium uppercase tracking-widest text-white/85">{eyebrow}</p>
              </div>
              <h1 className="text-xl sm:text-2xl md:text-[1.65rem] font-medium text-white tracking-tight leading-tight capitalize">
                {title}
              </h1>
              <p className="text-xs sm:text-sm font-normal text-white/75 max-w-xl leading-relaxed">{subtitle}</p>
            </div>
          </div>
          {rightSlot ? (
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">{rightSlot}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
