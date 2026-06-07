import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function TablePagination({
  page,
  totalPages,
  total,
  pageSize,
  itemCount,
  pageStartIndex = 0,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50],
  className = '',
}) {
  if (total === 0) return null;

  const pageButtons = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
    .reduce((acc, p, i, arr) => {
      if (i > 0 && p - arr[i - 1] > 1) acc.push('…');
      acc.push(p);
      return acc;
    }, []);

  return (
    <div className={`px-5 py-4 border-t border-black/[0.06] flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50 ${className}`}>
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-xs text-[#000435]/55 tabular-nums">
          Showing {pageStartIndex + 1}–{pageStartIndex + itemCount} of {total}
        </p>
        {onPageSizeChange && (
          <label className="flex items-center gap-2 text-xs text-[#000435]/55">
            Per page
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="py-1 px-2 rounded-lg border border-black/[0.08] text-[#000435] text-xs"
            >
              {pageSizeOptions.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
        )}
      </div>
      {totalPages > 1 && (
        <div className="flex items-center gap-1 flex-wrap justify-center">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(Math.max(1, page - 1))}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border border-black/[0.08] bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-[#000435]"
          >
            <ChevronLeft size={14} /> Prev
          </button>
          {pageButtons.map((p, i) => (p === '…' ? (
            <span key={`gap-${i}`} className="px-1 text-[#000435]/40 text-xs">…</span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              className={`min-w-[2rem] px-2 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                page === p
                  ? 'border-amber-400 bg-amber-100 text-[#000435]'
                  : 'border-black/[0.08] bg-white hover:bg-slate-50 text-[#000435]/70'
              }`}
            >
              {p}
            </button>
          )))}
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border border-black/[0.08] bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-[#000435]"
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
