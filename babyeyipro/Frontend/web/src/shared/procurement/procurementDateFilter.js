/** Shared procurement date / academic period filtering. */

export const EMPTY_PROCUREMENT_DATE_FILTER = {
  mode: 'all',
  academicYear: '',
  term: '',
  month: '',
  dateFrom: '',
  dateTo: '',
};

export const PROCUREMENT_FILTER_MODES = [
  { id: 'all', label: 'All dates' },
  { id: 'academic_year', label: 'Academic year' },
  { id: 'term', label: 'Term' },
  { id: 'month', label: 'Month' },
  { id: 'week', label: 'This week' },
  { id: 'range', label: 'Date range' },
];

function normalizeDateOnly(value) {
  if (value == null || value === '') return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const s = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const iso = s.includes('T') ? s.split('T')[0] : s;
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return '';
}

function toIsoDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function academicYearBounds(yearStr) {
  const [startY] = String(yearStr || '').split('-').map(Number);
  if (!startY) return null;
  return { from: `${startY}-09-01`, to: `${startY + 1}-08-31` };
}

function inferTermSliceBounds(academicYear, term, activeTerms = []) {
  const bounds = academicYearBounds(academicYear);
  if (!bounds) return null;
  const terms = activeTerms.length ? activeTerms : ['Term 1', 'Term 2', 'Term 3'];
  const idx = Math.max(0, terms.indexOf(term));
  const [fromY, fromM, fromD] = bounds.from.split('-').map(Number);
  const [toY, toM, toD] = bounds.to.split('-').map(Number);
  const start = new Date(fromY, fromM - 1, fromD);
  const end = new Date(toY, toM - 1, toD);
  const totalDays = Math.round((end - start) / 86400000) + 1;
  const slice = Math.floor(totalDays / terms.length);
  const sliceStart = new Date(start);
  sliceStart.setDate(start.getDate() + idx * slice);
  const sliceEnd = idx === terms.length - 1
    ? end
    : new Date(sliceStart.getFullYear(), sliceStart.getMonth(), sliceStart.getDate() + slice - 1);
  return { from: toIsoDate(sliceStart), to: toIsoDate(sliceEnd) };
}

function resolveTermBounds(filter, academicOptions = {}) {
  const { termDates = [], activeTerms = [], academicYearsRegistry = [] } = academicOptions;
  const year = filter.academicYear || academicOptions.academicYear;
  const term = filter.term;
  if (!year || !term) return null;

  const configured = termDates.find((t) => t.name === term);
  if (configured?.start && configured?.end) {
    return {
      from: normalizeDateOnly(configured.start),
      to: normalizeDateOnly(configured.end),
    };
  }

  const reg = academicYearsRegistry.find((r) => r.academic_year === year);
  const regTerm = reg?.terms?.find((t) => (t.name || t.term) === term);
  if (regTerm?.start && regTerm?.end) {
    return {
      from: normalizeDateOnly(regTerm.start),
      to: normalizeDateOnly(regTerm.end),
    };
  }

  return inferTermSliceBounds(year, term, activeTerms);
}

function weekBounds() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = today.getDay();
  const diffToMon = day === 0 ? -6 : 1 - day;
  const mon = new Date(today);
  mon.setDate(today.getDate() + diffToMon);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return { from: toIsoDate(mon), to: toIsoDate(sun) };
}

function monthBounds(monthStr) {
  if (!monthStr || !/^\d{4}-\d{2}$/.test(monthStr)) return null;
  const [y, m] = monthStr.split('-').map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const mm = String(m).padStart(2, '0');
  return {
    from: `${y}-${mm}-01`,
    to: `${y}-${mm}-${String(lastDay).padStart(2, '0')}`,
  };
}

/** Resolve filter state to { from, to } inclusive bounds, or null for "all". */
export function resolveProcurementDateBounds(filter, academicOptions = {}) {
  if (!filter || filter.mode === 'all') return null;

  if (filter.mode === 'academic_year') {
    const year = filter.academicYear || academicOptions.academicYear;
    return academicYearBounds(year);
  }

  if (filter.mode === 'term') {
    return resolveTermBounds(filter, academicOptions);
  }

  if (filter.mode === 'month') {
    return monthBounds(filter.month);
  }

  if (filter.mode === 'week') {
    return weekBounds();
  }

  if (filter.mode === 'range') {
    const from = normalizeDateOnly(filter.dateFrom);
    const to = normalizeDateOnly(filter.dateTo);
    if (!from && !to) return null;
    return { from: from || to, to: to || from };
  }

  return null;
}

export function dateWithinBounds(dateStr, bounds) {
  if (!bounds) return true;
  const date = normalizeDateOnly(dateStr);
  if (!date) return false;
  if (bounds.from && date < bounds.from) return false;
  if (bounds.to && date > bounds.to) return false;
  return true;
}

export function getProcurementRecordDate(record, dateField) {
  return normalizeDateOnly(
    record?.[dateField] || record?.created_at || record?.updated_at
  );
}

export function matchesProcurementDateFilter(record, dateField, filter, academicOptions = {}) {
  const bounds = resolveProcurementDateBounds(filter, academicOptions);
  if (!bounds) return true;
  return dateWithinBounds(getProcurementRecordDate(record, dateField), bounds);
}

export function filterProcurementList(list, dateField, filter, academicOptions = {}) {
  if (!filter || filter.mode === 'all') return list;
  return (list || []).filter((row) => matchesProcurementDateFilter(row, dateField, filter, academicOptions));
}

export function countActiveProcurementFilters(filter) {
  if (!filter || filter.mode === 'all') return 0;
  if (filter.mode === 'range') {
    return [filter.dateFrom, filter.dateTo].filter(Boolean).length || 1;
  }
  if (filter.mode === 'term') {
    return (filter.academicYear ? 1 : 0) + (filter.term ? 1 : 0) || 1;
  }
  return 1;
}

function fmtShort(iso) {
  const key = normalizeDateOnly(iso);
  if (!key) return '';
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

/** Human-readable summary for filter chips / drawer subtitle. */
export function describeProcurementFilter(filter, academicOptions = {}) {
  if (!filter || filter.mode === 'all') return 'All dates';

  if (filter.mode === 'academic_year') {
    const year = filter.academicYear || academicOptions.academicYear;
    return year ? `Academic year ${year}` : 'Academic year';
  }

  if (filter.mode === 'term') {
    const year = filter.academicYear || academicOptions.academicYear;
    const term = filter.term || academicOptions.currentTerm;
    if (year && term) return `${year} · ${term}`;
    return term || 'Term';
  }

  if (filter.mode === 'month' && filter.month) {
    const [y, m] = filter.month.split('-');
    const label = new Date(Number(y), Number(m) - 1, 1)
      .toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    return label;
  }

  if (filter.mode === 'week') {
    const b = weekBounds();
    return `This week (${fmtShort(b.from)} – ${fmtShort(b.to)})`;
  }

  if (filter.mode === 'range') {
    const from = normalizeDateOnly(filter.dateFrom);
    const to = normalizeDateOnly(filter.dateTo);
    if (from && to && from === to) return fmtShort(from);
    if (from && to) return `${fmtShort(from)} – ${fmtShort(to)}`;
    if (from) return `From ${fmtShort(from)}`;
    if (to) return `Until ${fmtShort(to)}`;
    return 'Date range';
  }

  return 'Filtered';
}
