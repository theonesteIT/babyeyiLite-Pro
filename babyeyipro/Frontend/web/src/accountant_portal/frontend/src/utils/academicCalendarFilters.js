/** Shared helpers — same source as Manager → Settings → Preferences (`/dos/academic-calendar-settings`). */

export function normalizeUiTerm(v) {
  const t = String(v || '').trim();
  const low = t.toLowerCase();
  if (!t) return '';
  if (low.includes('annual')) return 'Annual Review';
  if (/\b1\b/.test(low) || low === 't1') return 'Term 1';
  if (/\b2\b/.test(low) || low === 't2') return 'Term 2';
  if (/\b3\b/.test(low) || low === 't3') return 'Term 3';
  return t;
}

/** Infer active term from calendar month (matches manager AcademicContext). */
export function inferCurrentTerm(activeTerms) {
  const terms = Array.isArray(activeTerms) ? activeTerms.filter(Boolean) : [];
  if (!terms.length) return 'Term 1';
  const m = new Date().getMonth();
  const n = terms.length;
  const pos = m >= 8 ? m - 8 : m + 4;
  const idx = Math.min(Math.floor((pos / 12) * n), n - 1);
  return terms[idx];
}

export function sortAcademicYears(years) {
  return [...new Set((years || []).map((y) => String(y).trim()).filter(Boolean))].sort((a, b) => {
    const ay = parseInt(String(a).split('-')[0], 10) || 0;
    const by = parseInt(String(b).split('-')[0], 10) || 0;
    return by - ay;
  });
}

export function termsForRegistryYear(registry, academicYear) {
  const row = (registry || []).find((r) => String(r.academic_year) === String(academicYear));
  const raw = row?.active_terms?.length ? row.active_terms : [];
  const terms = raw.map(normalizeUiTerm).filter(Boolean);
  return terms.length ? terms : ['Term 1', 'Term 2', 'Term 3'];
}

/**
 * Parse GET /dos/academic-calendar-settings for filter dropdowns.
 */
export function parseManagerAcademicSettings(data) {
  const registry = Array.isArray(data?.academic_years_registry) ? data.academic_years_registry : [];
  const currentYear = String(data?.current_academic_year || '').trim();
  const currentRow =
    registry.find((r) => r.is_current) ||
    registry.find((r) => String(r.academic_year) === currentYear) ||
    registry[0] ||
    null;

  let years = registry.length
    ? sortAcademicYears(registry.map((r) => r.academic_year))
    : sortAcademicYears(currentYear ? [currentYear] : []);

  if (currentYear && !years.includes(currentYear)) {
    years = sortAcademicYears([currentYear, ...years]);
  }

  const defaultTerms = termsForRegistryYear(registry, currentRow?.academic_year || currentYear);
  const defaultTerm = inferCurrentTerm(defaultTerms);

  return {
    registry,
    years,
    currentYear: currentRow?.academic_year || currentYear || years[0] || '',
    currentRow,
    defaultTerms,
    defaultTerm,
  };
}

export function yearOptionLabel(row) {
  if (!row) return '';
  const y = row.academic_year || '';
  return row.is_current ? `${y} (current)` : y;
}

const MONTH_LABELS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function monthNameToNumber(month) {
  if (typeof month === 'number' && month >= 1 && month <= 12) return month;
  const raw = String(month || '').trim();
  const n = Number(raw);
  if (n >= 1 && n <= 12) return n;
  const idx = MONTH_LABELS.findIndex((m) => m.toLowerCase() === raw.toLowerCase());
  return idx >= 0 ? idx + 1 : 0;
}

export function parseAcademicYearBounds(academicYear) {
  const txt = String(academicYear || '').trim();
  const range = txt.match(/^(19\d{2}|20\d{2})\s*[-–]\s*(19\d{2}|20\d{2})$/);
  if (range) {
    return { startYear: Number(range[1]), endYear: Number(range[2]) };
  }
  const single = txt.match(/\b(19\d{2}|20\d{2})\b/);
  if (single) {
    const y = Number(single[1]);
    return { startYear: y, endYear: y };
  }
  const n = Number(txt);
  if (Number.isFinite(n) && n >= 1900) return { startYear: n, endYear: n };
  const now = new Date().getFullYear();
  return { startYear: now, endYear: now };
}

/**
 * Calendar year for payroll month within an academic year.
 * Typical Sep–Jun cycle: Sep–Dec → start year (e.g. 2025), Jan–Aug → end year (e.g. 2026).
 */
export function resolvePayrollCalendarYear(academicYear, month) {
  const monthNum = monthNameToNumber(month);
  const { startYear, endYear } = parseAcademicYearBounds(academicYear);
  if (!monthNum) return startYear;
  return monthNum >= 9 ? startYear : endYear;
}
