import { Search, SlidersHorizontal, X } from 'lucide-react'
import { countActiveFilters } from '../../../assets_portal/utils/assetFilters'
import { registerYearOptions } from '../../../assets_portal/utils/assetFormMapper'

export default function AssetSearchToolbar({
  filters,
  onChange,
  onOpenAdvanced,
  resultCount = 0,
  filterOptions = {},
}) {
  const active = countActiveFilters(filters)

  const registerYears = [...new Set([
    ...(filterOptions.registerYears || []),
    ...registerYearOptions(),
  ])].sort((a, b) => b - a)

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm space-y-3">
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="flex-1 flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1 min-w-0">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-re-text-muted" />
            <input
              type="text"
              className="assets-wizard-input pl-10 pr-10 w-full font-medium"
              placeholder="Search by asset code, serial number, or name…"
              value={filters.q}
              onChange={(e) => onChange({ ...filters, q: e.target.value })}
            />
            {filters.q && (
              <button
                type="button"
                onClick={() => onChange({ ...filters, q: '' })}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded text-re-text-muted hover:text-[#000435]"
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div className="sm:w-52 shrink-0 space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#000435]/70">
              Register year
            </label>
            <select
              className="assets-wizard-input w-full text-sm font-semibold text-[#000435]"
              value={filters.registerYear}
              onChange={(e) => onChange({ ...filters, registerYear: e.target.value })}
            >
              <option value="">All register years</option>
              {registerYears.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenAdvanced}
          className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-bold transition-all ${
            active > 0
              ? 'border-[#000435] bg-[#000435] text-[#FEBF10]'
              : 'border-black/10 bg-white text-[#000435] hover:bg-[#FEBF10]/20'
          }`}
        >
          <SlidersHorizontal size={16} />
          Advanced filters
          {active > 0 && (
            <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-[#FEBF10] text-[#000435] text-xs flex items-center justify-center">
              {active}
            </span>
          )}
        </button>
      </div>

      <p className="text-xs text-re-text-muted font-medium">
        Search matches asset code, serial number, or name.{' '}
        {filters.registerYear ? (
          <>Showing register year <span className="text-[#000435] font-bold">{filters.registerYear}</span>. </>
        ) : null}
        <span className="text-[#000435] font-bold">{resultCount}</span> assets match
      </p>
    </div>
  )
}
