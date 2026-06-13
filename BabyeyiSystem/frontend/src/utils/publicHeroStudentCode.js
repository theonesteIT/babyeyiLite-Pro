const LAST_KEY = "babyeyi_hero_student_code";
const RECENT_KEY = "babyeyi_hero_recent_codes";
const MAX_RECENT = 5;

function safeParse(json, fallback) {
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v : fallback;
  } catch {
    return fallback;
  }
}

/** Last student code typed in the public hero search. */
export function loadHeroStudentCode() {
  try {
    return String(localStorage.getItem(LAST_KEY) || "").trim();
  } catch {
    return "";
  }
}

/** Recent codes (newest first) for quick-fill chips. */
export function loadRecentHeroStudentCodes() {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) {
      const last = loadHeroStudentCode();
      return last ? [last] : [];
    }
    return safeParse(raw, [])
      .map((c) => String(c || "").trim())
      .filter(Boolean)
      .slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

/** Save code when user types or submits lookup. */
export function saveHeroStudentCode(code) {
  const c = String(code || "").trim();
  if (!c) return;
  try {
    localStorage.setItem(LAST_KEY, c);
    const prev = loadRecentHeroStudentCodes().filter((x) => x !== c);
    const next = [c, ...prev].slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch { /* ignore */ }
}
