import { Calendar, CalendarRange } from 'lucide-react'
import { EMPTY_DATE_PERIOD, yearOptionsFrom } from '../../../assets_portal/utils/assetsDateUtils'

const NAVY = '#000435'

const MODES = [
  { id: 'all', label: 'All dates' },
  { id: 'week', label: 'This week' },
  { id: 'month', label: 'By month' },
  { id: 'year', label: 'By year' },
  { id: 'range', label: 'Custom range' },
]

export default function AssetDatePeriodFilter({
  value = EMPTY_DATE_PERIOD,
  onChange,
  label = 'Date period',
  compact = false,
  className = '',
}) {
  const v = { ...EMPTY_DATE_PERIOD, ...value }
  const set = (patch) => onChange?.({ ...v, ...patch })
  const years = yearOptionsFrom(2018)

  return (
    <div className={`rounded-xl border border-slate-200/80 bg-gradient-to-br from-slate-50 to-white p-4 space-y-3 ${className}`}>
      <div className="flex items-center gap-2">
        <CalendarRange size={15} className="text-amber-600 shrink-0" />
        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: NAVY }}>{label}</p>
      </div>

      <div className={`flex flex-wrap gap-1.5 ${compact ? '' : ''}`}>
        {MODES.map(({ id, label: modeLabel }) => (
          <button
            key={id}
            type="button"
            onClick={() => set({ mode: id })}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
              v.mode === id
                ? 'border-[#000435] bg-[#000435] text-white shadow-sm'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            {modeLabel}
          </button>
        ))}
      </div>

      {v.mode === 'month' && (
        <label className="block">
          <span className="text-[10px] font-semibold text-slate-500 mb-1 flex items-center gap-1">
            <Calendar size={11} /> Select month
          </span>
          <input
            type="month"
            className="assets-wizard-input w-full sm:max-w-xs text-sm"
            value={v.month}
            onChange={(e) => set({ month: e.target.value })}
          />
        </label>
      )}

      {v.mode === 'year' && (
        <label className="block">
          <span className="text-[10px] font-semibold text-slate-500 mb-1">Select year</span>
          <select
            className="assets-wizard-input w-full sm:max-w-xs text-sm"
            value={v.year}
            onChange={(e) => set({ year: e.target.value })}
          >
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </label>
      )}

      {v.mode === 'range' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-[10px] font-semibold text-slate-500 mb-1">From</span>
            <input type="date" className="assets-wizard-input w-full text-sm" value={v.dateFrom}
              onChange={(e) => set({ dateFrom: e.target.value })} />
          </label>
          <label className="block">
            <span className="text-[10px] font-semibold text-slate-500 mb-1">To</span>
            <input type="date" className="assets-wizard-input w-full text-sm" value={v.dateTo}
              min={v.dateFrom || undefined}
              onChange={(e) => set({ dateTo: e.target.value })} />
          </label>
        </div>
      )}

      {v.mode === 'week' && (
        <p className="text-[11px] text-slate-500 font-medium">Showing records from the current calendar week (Mon–Sun).</p>
      )}
    </div>
  )
}
