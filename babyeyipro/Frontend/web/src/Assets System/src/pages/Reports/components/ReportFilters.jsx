import { Filter, RotateCcw } from 'lucide-react';
import { NAVY, GOLD } from '../reportConfig';
import { ASSET_HEALTH_STATUS_OPTIONS } from '../../../../../assets_portal/utils/assetsConstants';
import { EMPTY_DATE_PERIOD } from '../../../../../assets_portal/utils/assetsDateUtils';
import AssetDatePeriodFilter from '../../../components/AssetDatePeriodFilter';

export default function ReportFilters({ filters, value, onChange, onApply, loading }) {
  const meta = filters || {};
  const v = value || {};

  const set = (key, val) => onChange?.({ ...v, [key]: val });

  const reset = () => onChange?.({
    year: 'all',
    category: 'all',
    location: 'all',
    status: 'all',
    health: 'all',
    datePeriod: { ...EMPTY_DATE_PERIOD },
  });

  return (
    <div className="rounded-2xl border border-black/5 bg-white p-4 sm:p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Filter size={16} style={{ color: NAVY }} />
          <h3 className="text-sm font-bold" style={{ color: NAVY }}>Global Filters</h3>
        </div>
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800"
        >
          <RotateCcw size={13} /> Reset
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <label className="block">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 block">Financial Year</span>
          <select
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium"
            value={v.year ?? 'all'}
            onChange={(e) => set('year', e.target.value)}
          >
            <option value="all">All Years</option>
            {(meta.years || []).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 block">Category</span>
          <select className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" value={v.category ?? 'all'} onChange={(e) => set('category', e.target.value)}>
            <option value="all">All Categories</option>
            {(meta.categories || []).map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 block">Location</span>
          <select className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" value={v.location ?? 'all'} onChange={(e) => set('location', e.target.value)}>
            <option value="all">All Locations</option>
            {(meta.locations || []).map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 block">Status</span>
          <select className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" value={v.status ?? 'all'} onChange={(e) => set('status', e.target.value)}>
            <option value="all">All Statuses</option>
            {(meta.statuses || ['Active', 'Assigned', 'Maintenance', 'Damaged', 'Retired']).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 block">Health Status</span>
          <select className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" value={v.health ?? 'all'} onChange={(e) => set('health', e.target.value)}>
            <option value="all">All</option>
            {ASSET_HEALTH_STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
      </div>

      <AssetDatePeriodFilter
        value={v.datePeriod || EMPTY_DATE_PERIOD}
        onChange={(datePeriod) => set('datePeriod', datePeriod)}
        label="Purchase / register date"
      />

      {onApply && (
        <div className="flex justify-end">
          <button
            type="button"
            disabled={loading}
            onClick={onApply}
            className="px-5 py-2 rounded-xl text-sm font-bold text-[#000435] disabled:opacity-50"
            style={{ background: GOLD }}
          >
            Apply Filters
          </button>
        </div>
      )}
    </div>
  );
}
