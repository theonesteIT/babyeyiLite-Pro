import { formatDashboardFilterSummary } from '../utils/dashboardFilters';

/**
 * Filter summary strip shown below the hero on NESA data tabs.
 */
export default function NesaFilterToolbar({ portalFilters, className = '' }) {
  const summary = formatDashboardFilterSummary(portalFilters);

  return (
    <div
      className={`mb-4 flex min-h-[2.25rem] items-center rounded-xl border border-[#fde68a]/80 bg-white/90 px-3 py-2 shadow-sm sm:px-4 ${className}`}
    >
      <p className="m-0 min-w-0 flex-1 text-[11px] font-medium leading-snug text-[#000435]/60 sm:text-xs">
        {summary}
      </p>
    </div>
  );
}
