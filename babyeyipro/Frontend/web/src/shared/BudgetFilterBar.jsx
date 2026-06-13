import { Search, SlidersHorizontal, X } from 'lucide-react';

/**
 * Horizontal budget filter bar — academic year, term, status, department, search.
 */
export default function BudgetFilterBar({
  filters,
  setFilters,
  years = [],
  terms = ['Term 1', 'Term 2', 'Term 3'],
  statuses = [],
  departments = [],
  onClear,
  searchPlaceholder = 'Search budgets, lines, usage…',
  navy = '#000435',
  amber = '#F59E0B',
}) {
  const activeCount = Object.values(filters).filter(Boolean).length;

  const fieldClass =
    'w-full min-w-0 px-3 py-2.5 text-[12px] font-semibold border border-slate-200/90 rounded-xl bg-white text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:border-transparent transition-shadow';

  const selectStyle = { focusRingColor: `${navy}25` };

  return (
    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
      <div
        className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-slate-100"
        style={{ background: `linear-gradient(90deg, ${navy}06 0%, transparent 100%)` }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: `${navy}10` }}
          >
            <SlidersHorizontal size={16} style={{ color: navy }} />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: navy }}>
              Filters
            </p>
            <p className="text-[10px] text-slate-400 font-medium">
              {activeCount ? `${activeCount} active — results update live` : 'Refine budgets and related records'}
            </p>
          </div>
        </div>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={onClear || (() => setFilters({ search: '', academicYear: '', term: '', status: '', department: '' }))}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase text-red-600 hover:bg-red-50 transition-colors"
          >
            <X size={12} />
            Clear all
          </button>
        )}
      </div>

      <div className="p-4 space-y-3">
        <div className="relative">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            value={filters.search || ''}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            placeholder={searchPlaceholder}
            className={`${fieldClass} pl-10`}
            style={{ '--tw-ring-color': selectStyle.focusRingColor }}
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <select
            value={filters.academicYear || ''}
            onChange={(e) => setFilters((f) => ({ ...f, academicYear: e.target.value }))}
            className={fieldClass}
            style={{ focusRing: `2px solid ${navy}25` }}
          >
            <option value="">All years</option>
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          <select
            value={filters.term || ''}
            onChange={(e) => setFilters((f) => ({ ...f, term: e.target.value }))}
            className={fieldClass}
          >
            <option value="">All terms</option>
            {terms.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          <select
            value={filters.status || ''}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
            className={fieldClass}
          >
            <option value="">All statuses</option>
            {statuses.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>

          <select
            value={filters.department || ''}
            onChange={(e) => setFilters((f) => ({ ...f, department: e.target.value }))}
            className={fieldClass}
          >
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        {activeCount > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {filters.academicYear && (
              <FilterChip label={filters.academicYear} onRemove={() => setFilters((f) => ({ ...f, academicYear: '' }))} navy={navy} />
            )}
            {filters.term && (
              <FilterChip label={filters.term} onRemove={() => setFilters((f) => ({ ...f, term: '' }))} navy={navy} />
            )}
            {filters.status && (
              <FilterChip
                label={statuses.find((s) => s.value === filters.status)?.label || filters.status}
                onRemove={() => setFilters((f) => ({ ...f, status: '' }))}
                amber
              />
            )}
            {filters.department && (
              <FilterChip label={filters.department} onRemove={() => setFilters((f) => ({ ...f, department: '' }))} muted />
            )}
            {filters.search && (
              <FilterChip label={`"${filters.search}"`} onRemove={() => setFilters((f) => ({ ...f, search: '' }))} muted />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function FilterChip({ label, onRemove, navy, amber, muted }) {
  const bg = amber ? '#FEF3C7' : muted ? '#F3F4F6' : `${navy}12`;
  const color = amber ? '#92400E' : muted ? '#4B5563' : navy;
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase"
      style={{ background: bg, color }}
    >
      {label}
      <button type="button" onClick={onRemove} className="hover:opacity-70 p-0.5" aria-label="Remove filter">
        <X size={10} />
      </button>
    </span>
  );
}
