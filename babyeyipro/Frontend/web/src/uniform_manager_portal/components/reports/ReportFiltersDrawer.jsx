import { FilterX } from 'lucide-react'
import { HrDrawer, HrBtnPrimary, HrBtnOutline, HrField, HrSelect } from '../uniformUi'

const PROFIT_STATUS_OPTIONS = [
  { value: '', label: 'All results' },
  { value: 'Profit', label: 'Profit only' },
  { value: 'Loss', label: 'Loss only' },
  { value: 'Break-even', label: 'Break-even only' },
]

function FilterSection({ title, description, children }) {
  return (
    <section className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 space-y-3">
      <div>
        <p className="text-xs font-semibold text-[#000435]">{title}</p>
        {description ? (
          <p className="text-[11px] text-slate-500 mt-0.5">{description}</p>
        ) : null}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>
    </section>
  )
}

export default function ReportFiltersDrawer({
  open,
  onClose,
  filters,
  setFilter,
  onResetAdvanced,
  extraOptions = {},
  variant = 'financial',
  showSizeToggle = true,
}) {
  const {
    uniformTypes = [],
    classes = [],
    academicYears = [],
    terms = [],
    colors = [],
    suppliers = [],
    sizes = [],
  } = extraOptions

  const isFinancial = variant === 'financial'

  return (
    <HrDrawer
      open={open}
      onClose={onClose}
      title={isFinancial ? 'Advanced report filters' : 'More filters'}
      className="max-w-md"
      footer={(
        <>
          <HrBtnOutline type="button" onClick={onResetAdvanced} className="flex-1 inline-flex items-center justify-center gap-1.5">
            <FilterX size={14} strokeWidth={2} />
            Clear advanced
          </HrBtnOutline>
          <HrBtnPrimary type="button" onClick={onClose} className="flex-1">
            Done
          </HrBtnPrimary>
        </>
      )}
    >
      {isFinancial ? (
        <>
          <FilterSection
            title="Academic period"
            description="Optional — date range still drives the main report data."
          >
            <HrField label="Academic year">
              <HrSelect
                value={filters.academicYear}
                onChange={(e) => setFilter('academicYear', e.target.value)}
              >
                <option value="">All academic years</option>
                {academicYears.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </HrSelect>
            </HrField>
            <HrField label="Term">
              <HrSelect
                value={filters.term}
                onChange={(e) => setFilter('term', e.target.value)}
              >
                <option value="">All terms</option>
                {terms.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </HrSelect>
            </HrField>
          </FilterSection>

          <FilterSection
            title="Product & class"
            description="Narrow rows by uniform type or student class."
          >
            <HrField label="Product type">
              <HrSelect
                value={filters.uniformType}
                onChange={(e) => setFilter('uniformType', e.target.value)}
              >
                <option value="">All products</option>
                {uniformTypes.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </HrSelect>
            </HrField>
            <HrField label="Class">
              <HrSelect
                value={filters.className}
                onChange={(e) => setFilter('className', e.target.value)}
              >
                <option value="">All classes</option>
                {classes.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </HrSelect>
            </HrField>
          </FilterSection>

          <FilterSection
            title="Profit & loss"
            description="Show only rows with a specific result."
          >
            <div className="sm:col-span-2">
              <HrField label="Result status">
                <HrSelect
                  value={filters.profitStatus}
                  onChange={(e) => setFilter('profitStatus', e.target.value)}
                >
                  {PROFIT_STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value || 'all'} value={opt.value}>{opt.label}</option>
                  ))}
                </HrSelect>
              </HrField>
            </div>
          </FilterSection>
        </>
      ) : (
        <>
          <FilterSection title="Category & product">
            <HrField label="Academic year">
              <HrSelect
                value={filters.academicYear}
                onChange={(e) => setFilter('academicYear', e.target.value)}
              >
                <option value="">All academic years</option>
                {academicYears.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </HrSelect>
            </HrField>
            <HrField label="Term">
              <HrSelect
                value={filters.term}
                onChange={(e) => setFilter('term', e.target.value)}
              >
                <option value="">All terms</option>
                {terms.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </HrSelect>
            </HrField>
            <HrField label="Product type">
              <HrSelect
                value={filters.uniformType}
                onChange={(e) => setFilter('uniformType', e.target.value)}
              >
                <option value="">All types</option>
                {uniformTypes.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </HrSelect>
            </HrField>
            <HrField label="Size">
              <HrSelect
                value={filters.size}
                onChange={(e) => setFilter('size', e.target.value)}
              >
                <option value="">All sizes</option>
                {sizes.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </HrSelect>
            </HrField>
            <HrField label="Color">
              <HrSelect
                value={filters.color}
                onChange={(e) => setFilter('color', e.target.value)}
              >
                <option value="">All colors</option>
                {colors.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </HrSelect>
            </HrField>
            <HrField label="Supplier">
              <HrSelect
                value={filters.supplier}
                onChange={(e) => setFilter('supplier', e.target.value)}
              >
                <option value="">All suppliers</option>
                {suppliers.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </HrSelect>
            </HrField>
            <HrField label="Class">
              <HrSelect
                value={filters.className}
                onChange={(e) => setFilter('className', e.target.value)}
              >
                <option value="">All classes</option>
                {classes.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </HrSelect>
            </HrField>
            <HrField label="Stock status">
              <HrSelect
                value={filters.status}
                onChange={(e) => setFilter('status', e.target.value)}
              >
                <option value="">All status</option>
                <option value="available">In stock</option>
                <option value="low">Low stock</option>
                <option value="out">Out of stock</option>
              </HrSelect>
            </HrField>
          </FilterSection>

          {showSizeToggle ? (
            <section className="rounded-2xl border border-slate-100 bg-white p-4">
              <label className="inline-flex items-center gap-2.5 text-sm text-[#000435] font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.showSize !== false}
                  onChange={(e) => setFilter('showSize', e.target.checked)}
                  className="rounded border-slate-300 text-[#FEBF10] focus:ring-[#FEBF10]"
                />
                Show size column in tables
              </label>
            </section>
          ) : null}
        </>
      )}
    </HrDrawer>
  )
}

export const FINANCIAL_ADVANCED_KEYS = [
  'academicYear',
  'term',
  'uniformType',
  'className',
  'profitStatus',
]

export const INVENTORY_ADVANCED_KEYS = [
  'academicYear',
  'term',
  'uniformType',
  'size',
  'color',
  'supplier',
  'className',
  'status',
]

export function countActiveFilters(filters, keys) {
  return keys.filter((key) => {
    const val = filters[key]
    return val != null && String(val).trim() !== ''
  }).length
}

export function activeFilterChips(filters, keys, labels = {}) {
  const defaultLabels = {
    academicYear: 'Year',
    term: 'Term',
    uniformType: 'Product',
    className: 'Class',
    profitStatus: 'Result',
    size: 'Size',
    color: 'Color',
    supplier: 'Supplier',
    status: 'Status',
  }
  const merged = { ...defaultLabels, ...labels }
  return keys
    .filter((key) => filters[key] != null && String(filters[key]).trim() !== '')
    .map((key) => ({
      key,
      label: `${merged[key] || key}: ${filters[key]}`,
    }))
}
