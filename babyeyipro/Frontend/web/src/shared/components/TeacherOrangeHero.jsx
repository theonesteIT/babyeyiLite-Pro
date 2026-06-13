import React from 'react';

const AMBER = '#c87800';
const GOLD = '#FEBF10';
const NAVY = '#000435';

/**
 * Amber hero — no background image (aligned with Manager dashboard).
 */
export default function TeacherOrangeHero({
  title,
  subtitle,
  eyebrow = null,
  badgeLabel = null,
  rightSlot = null,
  children = null,
  className = '',
}) {
  const label = eyebrow || badgeLabel;

  return (
    <section className={`relative w-full overflow-hidden ${className}`} style={{ backgroundColor: AMBER }}>
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

      <div className="relative z-10 max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-12 pt-10 sm:pt-12 pb-16 sm:pb-20">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl min-w-0">
            {label ? (
              <div className="flex items-center gap-2 mb-2">
                <span className="w-5 h-1 rounded-full" style={{ backgroundColor: GOLD }} aria-hidden />
                <p className="text-[9px] font-medium uppercase tracking-[0.2em] text-white/90">{label}</p>
              </div>
            ) : null}
            <h1
              className="text-xl sm:text-2xl md:text-[1.65rem] font-medium text-white tracking-tight leading-tight"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-2 max-w-2xl text-xs sm:text-sm font-normal text-white/75 leading-relaxed">
                {subtitle}
              </p>
            ) : null}
            {children ? <div className="mt-4 flex flex-wrap gap-2">{children}</div> : null}
          </div>
          {rightSlot ? (
            <div className="flex flex-wrap items-center gap-2.5 shrink-0 lg:pb-1">
              {rightSlot}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export { AMBER as DOS_AMBER, GOLD as DOS_GOLD, NAVY as DOS_NAVY };
