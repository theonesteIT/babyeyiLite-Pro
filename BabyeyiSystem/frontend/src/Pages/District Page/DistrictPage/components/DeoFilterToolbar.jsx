import { SlidersHorizontal } from 'lucide-react';
import { formatDeoFilterSummary } from '../utils/districtPortalFilters';

/**
 * Per-page filter summary + open drawer (All Babyeyi, Requests, Schools, Analytics, Dashboard).
 */
export default function DeoFilterToolbar({
  portalFilters,
  districtName = '',
  activeFilterCount = 0,
  onOpenFilters,
  className = '',
}) {
  const summary = formatDeoFilterSummary(portalFilters, districtName);

  return (
    <div
      className={`mb-4 flex flex-col gap-2 rounded-xl border border-[#fde68a]/80 bg-white/90 px-3 py-2.5 shadow-sm sm:flex-row sm:items-center sm:gap-3 sm:px-4 ${className}`}
    >
      <p className="m-0 min-w-0 flex-1 text-[11px] font-medium leading-snug text-[#000435]/60 sm:text-xs">
        {summary}
      </p>
      {onOpenFilters && (
        <button
          type="button"
          onClick={onOpenFilters}
          className="relative inline-flex w-full shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#fde68a] bg-amber-50 px-4 py-2.5 text-[12px] font-bold text-[#000435] transition-colors hover:border-amber-400 hover:bg-amber-100 sm:w-auto"
        >
          <SlidersHorizontal size={15} className="text-amber-700" />
          Filters
          {activeFilterCount > 0 && (
            <span className="flex h-5 min-w-[18px] items-center justify-center rounded-full bg-[#c87800] px-1 text-[10px] font-black text-white">
              {activeFilterCount}
            </span>
          )}
        </button>
      )}
    </div>
  );
}
