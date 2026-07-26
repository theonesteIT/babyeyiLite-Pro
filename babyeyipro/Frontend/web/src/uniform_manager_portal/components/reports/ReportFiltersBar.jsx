import { useState } from 'react'
import { SlidersHorizontal, X, FilterX, RotateCcw } from 'lucide-react'
import { HrSearch, HrSelect, HrBtnOutline } from '../uniformUi'
import { defaultDateRange } from '../../utils/reportUtils'
import ReportFiltersDrawer, {
  FINANCIAL_ADVANCED_KEYS,
  INVENTORY_ADVANCED_KEYS,
  countActiveFilters,
  activeFilterChips,
} from './ReportFiltersDrawer'

function localDateStr(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const DATE_PRESETS = [
  {
    id: '6m',
    label: 'Last 6 months',
    range: () => defaultDateRange(),
  },
  {
    id: 'month',
    label: 'This month',
    range: () => {
      const now = new Date()
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      return { from: localDateStr(start), to: localDateStr(end) }
    },
  },
  {
    id: '30d',
    label: 'Last 30 days',
    range: () => {
      const end = new Date()
      const start = new Date()
      start.setDate(start.getDate() - 29)
      return { from: localDateStr(start), to: localDateStr(end) }
    },
  },
  {
    id: 'year',
    label: 'This year',
    range: () => {
      const now = new Date()
      return {
        from: `${now.getFullYear()}-01-01`,
        to: `${now.getFullYear()}-12-31`,
      }
    },
  },
]

function FilterChip({ label, onRemove }) {
  return (
    <button
      type="button"
      onClick={onRemove}
      className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full bg-white border border-[#000435]/10 text-[11px] font-semibold text-[#000435] shadow-sm hover:border-[#FEBF10]/50 hover:bg-amber-50/40 transition-all"
    >
      {label}
      <span className="flex items-center justify-center w-4 h-4 rounded-full bg-slate-100 text-slate-500">
        <X size={10} strokeWidth={2.5} />
      </span>
    </button>
  )
}

function FilterActionButton({ children, onClick, disabled = false, variant = 'neutral' }) {
  const styles = variant === 'danger'
    ? 'border-red-100 bg-white text-red-600 hover:border-red-200 hover:bg-red-50 disabled:text-red-300 disabled:border-red-50 disabled:bg-red-50/30'
    : 'border-slate-200 bg-white text-slate-600 hover:border-[#FEBF10]/50 hover:bg-amber-50/50 hover:text-[#000435] disabled:text-slate-300 disabled:border-slate-100 disabled:bg-slate-50'

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[11px] font-semibold shadow-sm transition-all disabled:cursor-not-allowed disabled:shadow-none ${styles}`}
    >
      {children}
    </button>
  )
}

function ActiveFiltersBar({ chips, activeCount, onClearChip, onClearAdvanced, onResetAll }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-50 via-white to-amber-50/20 p-3 sm:p-3.5">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
        <div className="flex flex-wrap items-center gap-2 min-w-0 flex-1">
          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#000435] text-[9px] font-bold uppercase tracking-wider text-white shrink-0">
            Active
          </span>
          {chips.length > 0 ? (
            chips.map((chip) => (
              <FilterChip
                key={chip.key}
                label={chip.label}
                onRemove={() => onClearChip(chip.key)}
              />
            ))
          ) : (
            <span className="text-[11px] text-slate-400 font-medium">No advanced filters selected</span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0 sm:pl-2">
          <FilterActionButton
            onClick={onClearAdvanced}
            disabled={activeCount === 0}
            variant="neutral"
          >
            <FilterX size={13} strokeWidth={2} />
            Clear advanced
          </FilterActionButton>
          <FilterActionButton onClick={onResetAll} variant="danger">
            <RotateCcw size={13} strokeWidth={2} />
            Reset all filters
          </FilterActionButton>
        </div>
      </div>
    </div>
  )
}

function DateRangeInputs({ filters, setFilter }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-2 py-1.5">
      <input
        type="date"
        value={filters.from}
        onChange={(e) => setFilter('from', e.target.value)}
        className="rounded-lg border-0 bg-transparent px-2 py-1 text-xs font-medium text-gray-700 focus:ring-0"
        aria-label="From date"
      />
      <span className="text-gray-300 text-xs">→</span>
      <input
        type="date"
        value={filters.to}
        onChange={(e) => setFilter('to', e.target.value)}
        className="rounded-lg border-0 bg-transparent px-2 py-1 text-xs font-medium text-gray-700 focus:ring-0"
        aria-label="To date"
      />
    </div>
  )
}

function CompactFiltersBar({
  filters,
  setFilter,
  onReset,
  extraOptions,
  drawerVariant = 'financial',
  showSizeToggle = true,
  searchPlaceholder = 'Search product, student, reference…',
}) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const advancedKeys = drawerVariant === 'financial' ? FINANCIAL_ADVANCED_KEYS : INVENTORY_ADVANCED_KEYS
  const activeCount = countActiveFilters(filters, advancedKeys)
  const chips = activeFilterChips(filters, advancedKeys)

  const applyPreset = (preset) => {
    const { from, to } = preset.range()
    setFilter('from', from)
    setFilter('to', to)
  }

  const clearChip = (key) => setFilter(key, '')

  const resetAdvanced = () => {
    for (const key of advancedKeys) {
      setFilter(key, '')
    }
  }

  return (
    <>
      <div className="space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="flex-1 min-w-[180px]">
            <HrSearch
              value={filters.search}
              onChange={(e) => setFilter('search', e.target.value)}
              placeholder={searchPlaceholder}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <DateRangeInputs filters={filters} setFilter={setFilter} />

            <HrBtnOutline
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="inline-flex items-center gap-2 shrink-0"
            >
              <SlidersHorizontal size={14} strokeWidth={1.75} />
              More filters
              {activeCount > 0 ? (
                <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-[#FEBF10] text-[#000435] text-[10px] font-bold">
                  {activeCount}
                </span>
              ) : null}
            </HrBtnOutline>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {DATE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPreset(preset)}
              className="px-3 py-1.5 rounded-full text-[11px] font-semibold border border-slate-200 bg-white text-slate-600 hover:border-[#FEBF10]/60 hover:bg-amber-50/50 transition-colors"
            >
              {preset.label}
            </button>
          ))}
        </div>

        <ActiveFiltersBar
          chips={chips}
          activeCount={activeCount}
          onClearChip={clearChip}
          onClearAdvanced={resetAdvanced}
          onResetAll={onReset}
        />
      </div>

      <ReportFiltersDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        filters={filters}
        setFilter={setFilter}
        onResetAdvanced={resetAdvanced}
        extraOptions={extraOptions}
        variant={drawerVariant}
        showSizeToggle={showSizeToggle}
      />
    </>
  )
}

function FullFiltersBar({
  filters,
  setFilter,
  onReset,
  showSizeToggle,
  extraOptions,
}) {
  const { uniformTypes = [], sizes = [], colors = [], suppliers = [], classes = [], academicYears = [], terms = [] } = extraOptions

  return (
    <div className="space-y-3">
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="flex-1 min-w-[200px]">
          <HrSearch
            value={filters.search}
            onChange={(e) => setFilter('search', e.target.value)}
            placeholder="Search report…"
          />
        </div>
        <DateRangeInputs filters={filters} setFilter={setFilter} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-8 gap-2">
        <HrSelect
          value={filters.academicYear}
          onChange={(e) => setFilter('academicYear', e.target.value)}
        >
          <option value="">Academic year</option>
          {academicYears.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </HrSelect>
        <HrSelect
          value={filters.term}
          onChange={(e) => setFilter('term', e.target.value)}
        >
          <option value="">All terms</option>
          {terms.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </HrSelect>
        <HrSelect
          value={filters.uniformType}
          onChange={(e) => setFilter('uniformType', e.target.value)}
        >
          <option value="">All types</option>
          {uniformTypes.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </HrSelect>
        {showSizeToggle && filters.showSize !== false && (
          <HrSelect
            value={filters.size}
            onChange={(e) => setFilter('size', e.target.value)}
          >
            <option value="">All sizes</option>
            {sizes.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </HrSelect>
        )}
        <HrSelect
          value={filters.color}
          onChange={(e) => setFilter('color', e.target.value)}
        >
          <option value="">All colors</option>
          {colors.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </HrSelect>
        <HrSelect
          value={filters.supplier}
          onChange={(e) => setFilter('supplier', e.target.value)}
        >
          <option value="">All suppliers</option>
          {suppliers.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </HrSelect>
        <HrSelect
          value={filters.className}
          onChange={(e) => setFilter('className', e.target.value)}
        >
          <option value="">All classes</option>
          {classes.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </HrSelect>
        <HrSelect
          value={filters.status}
          onChange={(e) => setFilter('status', e.target.value)}
        >
          <option value="">All status</option>
          <option value="available">In stock</option>
          <option value="low">Low stock</option>
          <option value="out">Out of stock</option>
        </HrSelect>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs">
        {showSizeToggle && (
          <label className="inline-flex items-center gap-2 text-gray-600 font-medium cursor-pointer">
            <input
              type="checkbox"
              checked={filters.showSize !== false}
              onChange={(e) => setFilter('showSize', e.target.checked)}
              className="rounded border-gray-300 text-[#FEBF10] focus:ring-[#FEBF10]"
            />
            Show size column
          </label>
        )}
        <button
          type="button"
          onClick={onReset}
          className="text-[#000435]/70 hover:text-[#000435] font-semibold underline-offset-2 hover:underline"
        >
          Reset filters
        </button>
      </div>
    </div>
  )
}

export default function ReportFiltersBar({
  filters,
  setFilter,
  onReset,
  showSizeToggle = true,
  extraOptions = {},
  layout = 'full',
  drawerVariant = 'financial',
  searchPlaceholder,
}) {
  if (layout === 'compact') {
    return (
      <CompactFiltersBar
        filters={filters}
        setFilter={setFilter}
        onReset={onReset}
        extraOptions={extraOptions}
        drawerVariant={drawerVariant}
        showSizeToggle={showSizeToggle}
        searchPlaceholder={searchPlaceholder}
      />
    )
  }

  return (
    <FullFiltersBar
      filters={filters}
      setFilter={setFilter}
      onReset={onReset}
      showSizeToggle={showSizeToggle}
      extraOptions={extraOptions}
    />
  )
}
