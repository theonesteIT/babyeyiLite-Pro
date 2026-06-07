import { Search, RefreshCw } from 'lucide-react';
import { TERMINATION_STATUSES } from '../../accountant_portal/frontend/src/utils/terminationBenefitsCalc';
import {
  TERMINATION_MONTHS,
  TERMINATION_DEPARTMENT_OPTIONS,
  TERMINATION_CONTRACT_OPTIONS,
  buildYearOptions,
} from '../utils/terminationFilters';

const selectClass = 'text-sm py-2.5 px-3 rounded-xl border border-black/[0.08] text-[#000435] min-w-[130px]';

export default function TerminationFiltersBar({
  listQuery,
  onListQueryChange,
  statusFilter,
  onStatusFilterChange,
  yearFilter,
  onYearFilterChange,
  monthFilter,
  onMonthFilterChange,
  departmentFilter,
  onDepartmentFilterChange,
  contractFilter,
  onContractFilterChange,
  records = [],
  onRefresh,
  loading = false,
}) {
  const yearOptions = buildYearOptions(records);

  return (
    <div className="rounded-2xl border border-black/[0.06] bg-white shadow-sm px-4 sm:px-5 py-4">
      <div className="flex flex-col gap-3">
        <p className="text-xs font-bold uppercase tracking-wider text-[#000435]/45">Filters</p>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[180px] max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#000435]/40" />
            <input
              value={listQuery}
              onChange={(e) => onListQueryChange(e.target.value)}
              placeholder="Search employee..."
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-black/[0.08] text-sm text-[#000435]"
            />
          </div>
          <select value={yearFilter} onChange={(e) => onYearFilterChange(e.target.value)} className={selectClass}>
            {yearOptions.map((o) => (
              <option key={o.value || 'all'} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select value={monthFilter} onChange={(e) => onMonthFilterChange(e.target.value)} className={selectClass}>
            {TERMINATION_MONTHS.map((o) => (
              <option key={o.value || 'all'} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select value={departmentFilter} onChange={(e) => onDepartmentFilterChange(e.target.value)} className={selectClass}>
            <option value="">All departments</option>
            {TERMINATION_DEPARTMENT_OPTIONS.filter(Boolean).map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <select value={contractFilter} onChange={(e) => onContractFilterChange(e.target.value)} className={selectClass}>
            <option value="">All contract types</option>
            {TERMINATION_CONTRACT_OPTIONS.filter(Boolean).map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select value={statusFilter} onChange={(e) => onStatusFilterChange(e.target.value)} className={selectClass}>
            <option value="">All statuses</option>
            {Object.entries(TERMINATION_STATUSES).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-black/[0.08] text-sm font-semibold text-[#000435] hover:bg-slate-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-amber-500' : 'text-amber-500'} />
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
}
