import { useMemo } from 'react';
import { Filter } from 'lucide-react';

export default function AnalyticsFilters({ filters, selected, onChange }) {
  const years = filters?.academic_years || [];
  const terms = filters?.terms || [];
  const reportTypes = filters?.report_types || ['mid_term', 'final'];

  const value = useMemo(() => ({
    academic_year: selected?.academic_year || years[0] || '',
    term: selected?.term || terms[0] || '',
    report_type: selected?.report_type || 'final',
  }), [selected, years, terms]);

  const set = (key, v) => onChange?.({ ...value, [key]: v });

  if (!years.length && !terms.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl border border-[#000435]/8 bg-[#000435]/[0.02]">
      <Filter size={14} className="text-amber-500 shrink-0" />
      <select
        value={value.academic_year}
        onChange={(e) => set('academic_year', e.target.value)}
        className="h-8 rounded-lg border border-[#000435]/10 bg-white px-2 text-xs text-[#000435] focus:outline-none focus:ring-2 focus:ring-amber-400/40"
      >
        {years.map((y) => <option key={y} value={y}>{y}</option>)}
      </select>
      <select
        value={value.term}
        onChange={(e) => set('term', e.target.value)}
        className="h-8 rounded-lg border border-[#000435]/10 bg-white px-2 text-xs text-[#000435] focus:outline-none focus:ring-2 focus:ring-amber-400/40"
      >
        {terms.map((t) => <option key={t} value={t}>{t}</option>)}
      </select>
      <select
        value={value.report_type}
        onChange={(e) => set('report_type', e.target.value)}
        className="h-8 rounded-lg border border-[#000435]/10 bg-white px-2 text-xs text-[#000435] focus:outline-none focus:ring-2 focus:ring-amber-400/40"
      >
        {reportTypes.map((rt) => (
          <option key={rt} value={rt}>{rt.replace('_', ' ')}</option>
        ))}
      </select>
    </div>
  );
}
