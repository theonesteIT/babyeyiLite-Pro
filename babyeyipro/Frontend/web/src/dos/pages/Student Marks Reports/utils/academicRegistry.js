const DEFAULT_TERMS = ['Term 1', 'Term 2', 'Term 3'];

/** Normalize DOS / Manager calendar registry rows to a single shape. */
export function normalizeAcademicRegistry(raw = []) {
  const byYear = new Map();
  for (const row of raw || []) {
    const academic_year = String(row?.academic_year || '').trim();
    if (!academic_year) continue;
    const terms = (row?.terms || row?.active_terms || DEFAULT_TERMS)
      .map((t) => String(t).trim())
      .filter(Boolean);
    byYear.set(academic_year, {
      ...row,
      academic_year,
      terms: terms.length ? terms : DEFAULT_TERMS,
      active_terms: terms.length ? terms : DEFAULT_TERMS,
      is_current: Boolean(row?.is_current),
    });
  }
  return [...byYear.values()].sort((a, b) => {
    if (a.is_current !== b.is_current) return a.is_current ? -1 : 1;
    return b.academic_year.localeCompare(a.academic_year);
  });
}

export function mergeAcademicRegistries(...lists) {
  return normalizeAcademicRegistry(lists.flat().filter(Boolean));
}

export function termsForYear(registry, academicYear) {
  const entry = registry.find((r) => r.academic_year === academicYear);
  return entry?.terms || entry?.active_terms || DEFAULT_TERMS;
}

export function currentAcademicYear(registry) {
  return registry.find((r) => r.is_current)?.academic_year || registry[0]?.academic_year || '';
}
