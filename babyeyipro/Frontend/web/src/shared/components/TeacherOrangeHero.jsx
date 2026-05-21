import React from 'react';

/**
 * Orange hero + teacher imagery — matches teacher-portal Dashboard (ShuleTicha · Secure pill).
 */
export default function TeacherOrangeHero({
  title,
  subtitle,
  badgeLabel = 'ShuleTicha · Secure',
  rightSlot = null,
  children = null,
  className = '',
}) {
  return (
    <section
      className={`relative flex min-h-[260px] items-center overflow-hidden bg-[#FF8C00] text-white md:min-h-[300px] shadow-none ${className}`}
    >
      <div className="absolute inset-0 z-[1]">
        <img
          src="/teacher.png"
          alt=""
          className="block h-full w-full object-cover object-top transition-transform duration-[8s] ease-in-out hover:scale-[1.04]"
        />
        <div className="absolute inset-0 z-[2] bg-black/25" aria-hidden />
      </div>

      {badgeLabel ? (
        <div className="absolute left-6 top-6 z-10 hidden md:flex items-center gap-2 rounded-full border border-white/25 bg-black/25 px-4 py-1.5 text-[10px] font-semibold tracking-[0.14em] text-white/95 backdrop-blur-md">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-white" />
          {badgeLabel}
        </div>
      ) : null}

      {rightSlot ? (
        <div className="absolute right-6 top-6 z-10 hidden md:flex flex-wrap items-center justify-end gap-2 max-w-[min(100%-12rem,28rem)]">
          {rightSlot}
        </div>
      ) : null}

      <div className="relative z-10 w-full max-w-4xl px-7 pb-10 pt-14 md:px-10 md:pb-12 md:pt-12">
        <h1 className="mb-2 font-sans text-2xl font-extrabold tracking-tight md:text-3xl">{title}</h1>
        {subtitle ? (
          <p className="max-w-2xl text-sm font-semibold text-white/90 md:text-base">{subtitle}</p>
        ) : null}
        {children ? <div className="mt-4 flex flex-wrap gap-2">{children}</div> : null}
      </div>
    </section>
  );
}
