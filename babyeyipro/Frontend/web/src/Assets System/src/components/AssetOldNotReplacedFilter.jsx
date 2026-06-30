import { Archive } from 'lucide-react'

/**
 * Toggle filter: health "Not Used (Old)" assets with no replacement link.
 * Pill style aligned with AssetDatePeriodFilter.
 */
export default function AssetOldNotReplacedFilter({
  active = false,
  onChange,
  className = '',
}) {
  const toggle = () => onChange?.(!active)

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0">
        Quick filter
      </span>
      <button
        type="button"
        onClick={toggle}
        aria-pressed={active}
        title="Show Not Used (Old) assets that have not been linked to a replacement"
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
          active
            ? 'border-[#000435] bg-[#000435] text-white shadow-sm'
            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
        }`}
      >
        <Archive
          size={13}
          className={active ? 'text-amber-300' : 'text-slate-400'}
          strokeWidth={2.25}
        />
        <span>Old · not replaced</span>
      </button>
      <p className={`text-[10px] leading-snug max-w-md ${active ? 'text-slate-600' : 'text-slate-400'}`}>
        {active
          ? 'Showing Not Used (Old) assets with no replacement link'
          : 'Filter assets marked old that still need a replacement record'}
      </p>
    </div>
  )
}
