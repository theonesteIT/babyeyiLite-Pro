import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function TablePagination({
  page,
  totalPages,
  total,
  pageSize,
  itemCount,
  pageStartIndex = 0,
  onPageChange,
  className = '',
}) {
  if (totalPages <= 1 && total <= pageSize) return null

  const pageButtons = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
    .reduce((acc, p, i, arr) => {
      if (i > 0 && p - arr[i - 1] > 1) acc.push('…')
      acc.push(p)
      return acc
    }, [])

  return (
    <div className={`px-5 py-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-gray-50/40 ${className}`}>
      <p className="text-xs text-gray-500 tabular-nums">
        Showing {pageStartIndex + 1}–{pageStartIndex + itemCount} of {total}
      </p>
      <div className="flex items-center gap-1 flex-wrap justify-center">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={14} /> Prev
        </button>
        {pageButtons.map((p, i) => (p === '…' ? (
          <span key={`gap-${i}`} className="px-1 text-gray-400 text-xs">…</span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p)}
            className={`min-w-[2rem] px-2 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
              page === p
                ? 'border-amber-400 bg-amber-100 text-amber-900'
                : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
            }`}
          >
            {p}
          </button>
        )))}
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Next <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}
