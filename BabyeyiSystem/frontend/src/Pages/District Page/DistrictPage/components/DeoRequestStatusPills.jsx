import { DEO_REQUEST_STATUS_PILLS } from '../utils/districtPortalFilters';

export function getRequestStatusCount(key, summary = {}) {
  if (!key) return summary.total ?? 0;
  if (key === 'pending') return summary.pending ?? 0;
  if (key === 'recommended') return summary.recommended ?? 0;
  if (key === 'approved') return summary.approved ?? 0;
  if (key === 'rejected') return summary.rejected ?? 0;
  return 0;
}

/**
 * Horizontal status pills — page toolbar or filter drawer (touch-friendly, scroll on narrow screens).
 */
export default function DeoRequestStatusPills({
  value = '',
  onChange,
  summary = {},
  variant = 'page',
  className = '',
  showLabel = true,
}) {
  const isDrawer = variant === 'drawer';

  return (
    <div className={className}>
      {showLabel && (
        <p
          className={`m-0 font-bold uppercase tracking-widest text-amber-800/75 ${
            isDrawer ? 'mb-3 text-[11px]' : 'mb-2 text-[10px]'
          }`}
        >
          Filter
        </p>
      )}
      <div
        className={`-mx-1 flex gap-2 overflow-x-auto overscroll-x-contain px-1 pb-0.5 [-webkit-overflow-scrolling:touch] ${
          isDrawer ? 'flex-nowrap snap-x snap-mandatory' : 'flex-wrap sm:flex-nowrap'
        }`}
        role="group"
        aria-label="Filter by request status"
      >
        {DEO_REQUEST_STATUS_PILLS.map((pill) => {
          const active = (value ?? '') === pill.key;
          const count = getRequestStatusCount(pill.key, summary);
          return (
            <button
              key={pill.key || 'all'}
              type="button"
              onClick={() => onChange?.(pill.key)}
              aria-pressed={active}
              className={`inline-flex shrink-0 snap-start cursor-pointer items-center gap-2 rounded-full border-2 px-3.5 py-2 text-[12px] font-bold transition-all sm:px-4 ${
                active
                  ? 'border-[#000435] bg-[#000435] text-amber-400 shadow-[0_4px_14px_rgba(0,4,53,0.2)]'
                  : 'border-[#fde68a] bg-white text-[#000435]/75 hover:border-amber-300 hover:bg-amber-50/80'
              } ${isDrawer ? 'min-h-[44px]' : 'min-h-[40px]'}`}
            >
              <span className="whitespace-nowrap">{pill.label}</span>
              <span
                className={`min-w-[1.35rem] rounded-full px-1.5 py-0.5 text-center text-[10px] font-black tabular-nums leading-none ${
                  active ? 'bg-amber-400 text-[#000435]' : 'bg-amber-100 text-amber-900'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
