/** Infer Rwanda-style academic year from calendar date (Sep–Aug). */
export function inferAcademicYearFromDate(date = new Date()) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  return m >= 9 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
}

/** Build descending year labels from a starting year (e.g. 2026-2027 → 2026-2027, 2025-2026, …). */
export function buildAcademicYearList(currentYear, count = 5) {
  const [aStr] = String(currentYear || "").split("-");
  const a = Number(aStr);
  if (!a) return currentYear ? [String(currentYear)] : [];
  return Array.from({ length: count }, (_, i) => `${a - i}-${a - i + 1}`);
}

/**
 * All saved years for dropdowns — current year first, then others newest-first.
 * @param {Array<{ academic_year?: string, is_current?: boolean }>} registry
 * @param {string} currentYear
 */
export function buildAcademicYearOptions(registry = [], currentYear = "") {
  const cur = String(currentYear || "").trim();
  const fromRegistry = (registry || [])
    .map((r) => String(r?.academic_year || "").trim())
    .filter(Boolean);
  const currentFromRegistry = (registry || []).find((r) => r?.is_current)?.academic_year;
  const anchor = String(currentFromRegistry || cur || "").trim();

  let years = fromRegistry.length
    ? [...new Set(fromRegistry)]
    : buildAcademicYearList(anchor || inferAcademicYearFromDate(), 5);

  if (anchor && !years.includes(anchor)) {
    years = [anchor, ...years];
  }

  years.sort((a, b) => {
    const aStart = Number(String(a).split("-")[0]) || 0;
    const bStart = Number(String(b).split("-")[0]) || 0;
    return bStart - aStart;
  });

  if (anchor) {
    years = [anchor, ...years.filter((y) => y !== anchor)];
  }

  return years;
}

export const ACADEMIC_SETTINGS_UPDATED_EVENT = "babyeyi-academic-settings-updated";

export function notifyAcademicSettingsUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(ACADEMIC_SETTINGS_UPDATED_EVENT));
  }
}
