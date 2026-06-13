const FAV_KEY = 'recordMarks:favorites';
const RECENT_KEY = 'recordMarks:recent';

export function getGrade(percent) {
  if (percent >= 80) return 'A';
  if (percent >= 70) return 'B';
  if (percent >= 60) return 'C';
  if (percent >= 50) return 'D';
  return 'F';
}

export function loadFavorites() {
  try {
    const raw = localStorage.getItem(FAV_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveFavorites(ids) {
  localStorage.setItem(FAV_KEY, JSON.stringify(ids));
}

export function loadRecent() {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function pushRecent(id) {
  const list = loadRecent().filter((x) => x !== id);
  list.unshift(id);
  localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 8)));
}

export function draftKey(assignment, slug) {
  return `recordMarks:draft:${assignment.class_name}:${assignment.subject_name}:${slug}`;
}

export function saveDraft(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({ ...data, savedAt: Date.now() }));
  } catch { /* quota */ }
}

export function loadDraft(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearDraft(key) {
  localStorage.removeItem(key);
}

export function computeLiveStats(students, marks, maxScore) {
  const numeric = [];
  let filled = 0;
  for (const s of students) {
    const entry = marks[s.student_id];
    if (!entry) continue;
    if (entry.code) {
      filled += 1;
      continue;
    }
    const v = entry.value?.trim();
    if (v === '') continue;
    const n = Number(v);
    if (!Number.isFinite(n)) continue;
    filled += 1;
    numeric.push(n);
  }
  const missing = students.length - filled;
  if (!numeric.length) {
    return { highest: null, lowest: null, average: null, passRate: null, filled, missing };
  }
  const sum = numeric.reduce((a, b) => a + b, 0);
  const pass = numeric.filter((v) => maxScore > 0 && (v / maxScore) * 100 >= 50).length;
  return {
    highest: Math.max(...numeric),
    lowest: Math.min(...numeric),
    average: Math.round((sum / numeric.length) * 10) / 10,
    passRate: Math.round((pass / numeric.length) * 1000) / 10,
    filled,
    missing,
  };
}

export function parseBulkPaste(text) {
  return text
    .split(/[\n\r,;\t]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function isValidMarkValue(raw, maxScore) {
  const upper = raw.trim().toUpperCase();
  if (['A', 'E', 'M'].includes(upper)) return true;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 && n <= maxScore;
}
