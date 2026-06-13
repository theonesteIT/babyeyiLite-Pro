import { Filter } from 'lucide-react';

export default function MarksAnalyticsFilters({ filters, selected, onChange }) {
  const years = filters?.academic_years || [];
  const terms = filters?.terms || [];
  const value = {
    academic_year: selected?.academic_year || years[0] || '',
    term: selected?.term || terms[0] || '',
  };

  if (!years.length && !terms.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[#000435]/10 bg-[#000435]/[0.03] px-3 py-2">
      <Filter size={14} className="text-amber-500 shrink-0" />
      <select
        value={value.academic_year}
        onChange={(e) => onChange({ ...value, academic_year: e.target.value })}
        className="h-8 rounded-lg border border-gray-200 bg-white px-2 text-xs font-medium text-[#000435]"
      >
        {years.map((y) => <option key={y} value={y}>{y}</option>)}
      </select>
      <select
        value={value.term}
        onChange={(e) => onChange({ ...value, term: e.target.value })}
        className="h-8 rounded-lg border border-gray-200 bg-white px-2 text-xs font-medium text-[#000435]"
      >
        {terms.map((t) => <option key={t} value={t}>{t}</option>)}
      </select>
    </div>
  );
}
