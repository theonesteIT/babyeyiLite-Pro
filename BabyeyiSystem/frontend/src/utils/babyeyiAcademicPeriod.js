/**
 * Academic year / term — aligned with School Manager Babyeyi lite & NESA fee limits API.
 * Format: YYYY-YYYY where the second year = first year + 1 (e.g. 2027-2028).
 */

export const TERM_OPTIONS = ['Term 1', 'Term 2', 'Term 3'];
export const ALL_TERMS_VALUE = '';
export const ALL_TERMS_LABEL = 'All Terms';
export const ALL_YEARS_VALUE = '';
export const ALL_YEARS_LABEL = 'All years';

/** Matches backend Fee_limits.js validatePayload */
export const ACADEMIC_YEAR_REGEX = /^\d{4}-\d{4}$/;

export const STORAGE_KEYS = {
  nesa: 'nesa_portal_academic_period',
  district: 'district_portal_academic_period',
};

/**
 * Smart checker — same rule as school Babyeyi when saving Babyeyi / NESA fee limits.
 */
export function validateAcademicYear(value) {
  const raw = String(value ?? '').trim();
  if (!raw) {
    return { valid: true, normalized: '', empty: true };
  }
  if (!ACADEMIC_YEAR_REGEX.test(raw)) {
    return {
      valid: false,
      normalized: raw,
      message: 'Academic year must be YYYY-YYYY (e.g. 2027-2028)',
    };
  }
  const [startStr, endStr] = raw.split('-');
  const start = Number(startStr);
  const end = Number(endStr);
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return { valid: false, normalized: raw, message: 'Invalid academic year' };
  }
  if (end !== start + 1) {
    return {
      valid: false,
      normalized: raw,
      message: `Second year must be ${start + 1} (use ${start}-${start + 1})`,
    };
  }
  return { valid: true, normalized: raw, empty: false };
}

export function loadAcademicPeriod(storageKey, fallback = {}) {
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        academicYear: parsed.academicYear ?? parsed.academic_year ?? fallback.academicYear ?? '',
        term: parsed.term ?? fallback.term ?? '',
      };
    }
  } catch {
    /* ignore */
  }
  return {
    academicYear: fallback.academicYear ?? '',
    term: fallback.term ?? '',
  };
}

export function saveAcademicPeriod(storageKey, { academicYear, term }) {
  try {
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        academicYear: academicYear || '',
        term: term || '',
      }),
    );
  } catch {
    /* ignore */
  }
}

/** Infer Rwanda-style academic year from calendar date (Sep–Aug). */
export function inferAcademicYearFromDate(date = new Date()) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  return m >= 9 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
}

/** Only years NESA has registered (fee limits + manual registry) — no hardcoded mock list. */
export function mergeYearOptions(apiYears = []) {
  return [...new Set((apiYears || []).map((y) => String(y).trim()).filter(Boolean))].sort((a, b) =>
    String(b).localeCompare(String(a)),
  );
}

/** Current portal year first, then others newest-first (manager preferences style). */
export function sortYearOptionsCurrentFirst(years = [], currentYear = '') {
  const cur = String(currentYear || '').trim();
  const list = [...new Set((years || []).map((y) => String(y).trim()).filter(Boolean))];
  list.sort((a, b) => String(b).localeCompare(String(a)));
  if (cur && !list.includes(cur)) list.unshift(cur);
  if (cur) return [cur, ...list.filter((y) => y !== cur)];
  return list;
}

/** Dropdown options for NESA — always includes current/inferred year at the top. */
export function buildNesaYearSelectOptions(apiYears = [], currentYear = '') {
  const cur = String(currentYear || '').trim() || inferAcademicYearFromDate();
  const sorted = sortYearOptionsCurrentFirst(apiYears, cur);
  return sorted.length ? sorted : [cur];
}

export function mergeTermOptions(apiTerms = []) {
  const fromApi = (apiTerms || []).filter(Boolean);
  const set = new Set([...TERM_OPTIONS, ...fromApi]);
  return [...set];
}
