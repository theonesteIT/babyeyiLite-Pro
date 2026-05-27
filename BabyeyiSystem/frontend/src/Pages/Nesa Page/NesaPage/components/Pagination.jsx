import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { font } from '../utils/theme';

export default function Pagination({
  current = 1,
  total = 1,
  onChange,
  totalItems = 0,
  pageSize = 12,
  loading = false,
  className = '',
}) {
  if (total <= 1 && totalItems <= pageSize) return null;

  const count = Math.min(total, 5);
  const start = total <= 5 ? 1 : current <= 3 ? 1 : current >= total - 2 ? total - 4 : current - 2;
  const from = totalItems === 0 ? 0 : (current - 1) * pageSize + 1;
  const to = Math.min(current * pageSize, totalItems);

  const btnBase =
    'inline-flex h-9 min-w-[2.25rem] items-center justify-center rounded-xl border text-[13px] font-bold transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-40';
  const btnIdle = 'border-[#fde68a] bg-white text-amber-800 hover:bg-amber-50 cursor-pointer';
  const btnActive = 'border-[#000435] bg-[#000435] text-amber-400 shadow-[0_4px_12px_rgba(0,4,53,0.18)]';

  return (
    <div
      className={`flex flex-col items-stretch gap-3 rounded-2xl border border-[#fde68a] bg-white/90 px-3 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-4 ${className}`}
      style={{ fontFamily: font }}
    >
      <p className="m-0 text-center text-[11px] font-semibold text-amber-800 sm:text-left">
        {loading ? (
          <span className="inline-block h-4 w-32 animate-pulse rounded bg-amber-100" />
        ) : totalItems > 0 ? (
          <>
            Showing <span className="font-bold text-[#000435]">{from}–{to}</span> of{' '}
            <span className="font-bold text-[#000435]">{totalItems}</span>
            <span className="hidden sm:inline"> · Page {current} of {total}</span>
          </>
        ) : (
          'No results'
        )}
      </p>
      <div className="flex items-center justify-center gap-1.5 sm:gap-2">
        <button type="button" aria-label="First page" disabled={current === 1 || loading} onClick={() => onChange(1)} className={`${btnBase} ${btnIdle} hidden sm:inline-flex`}>
          <ChevronsLeft className="h-4 w-4" />
        </button>
        <button type="button" aria-label="Previous" disabled={current === 1 || loading} onClick={() => onChange(current - 1)} className={`${btnBase} ${btnIdle}`}>
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-1">
          {Array.from({ length: count }, (_, i) => {
            const page = start + i;
            return (
              <button
                key={page}
                type="button"
                disabled={loading}
                onClick={() => onChange(page)}
                className={`${btnBase} ${page === current ? btnActive : btnIdle}`}
              >
                {page}
              </button>
            );
          })}
        </div>
        <button type="button" aria-label="Next" disabled={current === total || loading} onClick={() => onChange(current + 1)} className={`${btnBase} ${btnIdle}`}>
          <ChevronRight className="h-4 w-4" />
        </button>
        <button type="button" aria-label="Last page" disabled={current === total || loading} onClick={() => onChange(total)} className={`${btnBase} ${btnIdle} hidden sm:inline-flex`}>
          <ChevronsRight className="h-4 w-4" />
        </button>
      </div>
      <p className="m-0 text-center text-[10px] font-bold uppercase tracking-wider text-amber-800/80 sm:hidden">
        Page {current} / {total}
      </p>
    </div>
  );
}
