import { termsForYear } from '../../utils/academicRegistry';

export default function ReportFilters({ filters, onChange, options, disabled, hideReportType = false, hideTerm = false }) {
  const registry = options?.academic_years_registry || [];

  const set = (key, value) => {
    const next = { ...filters, [key]: value };
    if (key === 'academicYear') {
      const terms = termsForYear(registry, value);
      if (terms.length) next.term = terms[0];
    }
    onChange(next);
  };

  const termList = termsForYear(registry, filters.academicYear);
  const yearList = options?.academic_years?.length
    ? options.academic_years
    : (options?.academic_years_registry || []).map((r) => r.academic_year).filter(Boolean);

  const fields = [
    { key: 'academicYear', label: 'Academic year', opts: yearList.map((y) => ({ value: y, label: y })) },
    !hideTerm && { key: 'term', label: 'Term', opts: termList.map((t) => ({ value: t, label: t })) },
    !hideReportType && { key: 'reportType', label: 'Report type', opts: [
      { value: '', label: 'All types' },
      ...(options?.report_types || []).map((t) => ({ value: t, label: t === 'mid_term' ? 'Mid-Term Report' : 'Final Report' })),
    ] },
    { key: 'className', label: 'Class', opts: [
      { value: '', label: 'All classes' },
      ...(options?.classes || []).map((c) => ({ value: c, label: c })),
    ] },
    { key: 'status', label: 'Status', opts: [
      { value: '', label: 'All statuses' },
      { value: 'generated', label: 'Generated' },
      { value: 'ready', label: 'Ready' },
      { value: 'pending_approval', label: 'Pending approval' },
      { value: 'published', label: 'Published' },
    ] },
  ];

  return (
    <div className="marks-panel rounded-2xl p-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {fields.filter(Boolean).map((f) => (
          <div key={f.key}>
            <label className="text-[10px] font-medium uppercase tracking-wide text-[#000435]/45 block mb-1">{f.label}</label>
            <select
              value={filters[f.key] || ''}
              onChange={(e) => set(f.key, e.target.value)}
              disabled={disabled}
              className="w-full h-9 rounded-lg border border-black/10 bg-white px-2.5 text-xs text-[#000435] focus:ring-2 focus:ring-amber-400/30 focus:outline-none disabled:opacity-50"
            >
              {f.opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}
