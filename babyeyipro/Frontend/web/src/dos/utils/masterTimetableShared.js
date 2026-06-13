export const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export const SUBJECT_PALETTES = [
  { bg: '#fff1f2', border: '#fecaca', title: '#be123c', abbr: '#9f1239' },
  { bg: '#eff6ff', border: '#bfdbfe', title: '#1d4ed8', abbr: '#1e40af' },
  { bg: '#ecfdf5', border: '#bbf7d0', title: '#047857', abbr: '#065f46' },
  { bg: '#fff7ed', border: '#fed7aa', title: '#c2410c', abbr: '#9a3412' },
  { bg: '#f5f3ff', border: '#ddd6fe', title: '#6d28d9', abbr: '#5b21b6' },
  { bg: '#f0fdfa', border: '#99f6e4', title: '#0f766e', abbr: '#115e59' },
  { bg: '#fefce8', border: '#fde68a', title: '#a16207', abbr: '#854d0e' },
  { bg: '#eef2ff', border: '#c7d2fe', title: '#3730a3', abbr: '#312e81' },
  { bg: '#fdf2f8', border: '#fbcfe8', title: '#be185d', abbr: '#9d174d' },
  { bg: '#f0f9ff', border: '#bae6fd', title: '#0369a1', abbr: '#075985' },
];

export const SLOT_STYLES = {
  break: { bg: '#e2e8f0', border: '#94a3b8', title: '#334155', label: 'BREAK', pdf: [226, 232, 240] },
  lunch: { bg: '#fef3c7', border: '#fbbf24', title: '#92400e', label: 'LUNCH', pdf: [254, 243, 199] },
  correction: { bg: '#e0e7ff', border: '#818cf8', title: '#3730a3', label: 'CORR.', pdf: [224, 231, 255] },
};

export const SUBJECT_ABBR = {
  MATH: 'MTC', MATHEMATICS: 'MTC', MTC: 'MTC',
  ENG: 'ENG', ENGLISH: 'ENG',
  EST: 'EST', SCIENCE: 'EST',
  SST: 'SST', 'SOCIAL STUDIES': 'SST',
  KINY: 'KINY', KINYARWANDA: 'KINY',
  FRE: 'FRE', FRENCH: 'FRE',
  DELF: 'DELF',
  PE: 'P.E', 'PHYSICAL EDUCATION': 'P.E',
  CA: 'CA', 'CREATIVE ARTS': 'CA',
  COMPUTER: 'ICT', ICT: 'ICT',
  RE: 'R.E', 'RELIGIOUS EDUCATION': 'R.E',
};

export const normalizeTime = (v) => {
  const r = String(v || '').trim();
  if (!r) return '';
  const p = r.split(':');
  return p.length < 2 ? r : `${p[0].padStart(2, '0')}:${p[1].padStart(2, '0')}`;
};

export const fmt12 = (t) => {
  if (!t) return '—';
  const [h, m] = t.split(':').map(Number);
  return `${((h % 12) || 12)}:${String(m).padStart(2, '0')}${h >= 12 ? 'p' : 'a'}`;
};

export const fmt12Long = (t) => {
  if (!t) return '—';
  const [h, m] = t.split(':').map(Number);
  return `${((h % 12) || 12)}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};

export const paletteForSubject = (subject = '') => {
  const value = String(subject || '').trim().toLowerCase();
  if (!value) return SUBJECT_PALETTES[0];
  let hash = 0;
  for (let i = 0; i < value.length; i++) hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  return SUBJECT_PALETTES[hash % SUBJECT_PALETTES.length];
};

export const abbrSubject = (name) => {
  const u = String(name || '').trim().toUpperCase();
  if (SUBJECT_ABBR[u]) return SUBJECT_ABBR[u];
  if (u.length <= 5) return u;
  return u.replace(/[^A-Z]/g, '').slice(0, 4) || u.slice(0, 3);
};

export const teacherInitials = (name) => {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const timeToMins = (t) => {
  const [h, m] = String(t || '00:00').slice(0, 5).split(':').map(Number);
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
};

export const timesOverlap = (startA, endA, startB, endB) =>
  timeToMins(startA) < timeToMins(endB) && timeToMins(startB) < timeToMins(endA);

function overlapMinutes(startA, endA, startB, endB) {
  const start = Math.max(timeToMins(startA), timeToMins(startB));
  const end = Math.min(timeToMins(endA), timeToMins(endB));
  return Math.max(0, end - start);
}

/** Pick the teaching period column that best fits a lesson/extra row */
export function bestPeriodForRow(row, teachingPeriods = []) {
  let best = null;
  let bestScore = -1;
  const rowStart = normalizeTime(row.start_time);
  const rowEnd = normalizeTime(row.end_time);

  for (const p of teachingPeriods) {
    const pStart = normalizeTime(p.start_time);
    const pEnd = normalizeTime(p.end_time);
    const overlap = overlapMinutes(pStart, pEnd, rowStart, rowEnd);
    if (overlap <= 0) continue;
    const exactStart = rowStart === pStart ? 10000 : 0;
    const exactEnd = rowEnd === pEnd ? 1000 : 0;
    const score = overlap + exactStart + exactEnd;
    if (score > bestScore) {
      bestScore = score;
      best = p;
    }
  }
  return best;
}

/** Classify a slot: teaching | break | lunch | correction */
export function classifySlot(period) {
  const n = String(period?.period_name || '').toLowerCase().trim();
  if (n.includes('correction') || n.includes('corr.')) return 'correction';
  if (n.includes('lunch')) return 'lunch';
  if (period?.is_break || n.includes('break')) return 'break';
  return 'teaching';
}

export function sortPeriodsChronologically(periods = []) {
  return [...periods].sort(
    (a, b) => timeToMins(a.start_time) - timeToMins(b.start_time)
      || timeToMins(a.end_time) - timeToMins(b.end_time)
  );
}

export function buildLessonLookup(rows, streams, teachingPeriods) {
  const m = new Map();
  const sorted = [...rows].sort((a, b) => {
    const aExtra = a.extra_activity_id ? 1 : 0;
    const bExtra = b.extra_activity_id ? 1 : 0;
    return aExtra - bExtra;
  });

  for (const r of sorted) {
    const stream = streams.find((s) => s.fullName === String(r.class_name || '').trim());
    if (!stream) continue;
    const period = bestPeriodForRow(r, teachingPeriods);
    if (!period) continue;
    const pStart = normalizeTime(period.start_time);
    const key = `${r.day_of_week}__${stream.stream}__${pStart}`;
    m.set(key, { ...r, _period_start: pStart, _period_end: normalizeTime(period.end_time) });
  }
  return m;
}

function parseExtraDays(activity) {
  if (Array.isArray(activity?.days)) return activity.days.filter(Boolean);
  if (typeof activity?.days_json === 'string') {
    try { return JSON.parse(activity.days_json).filter(Boolean); } catch { return []; }
  }
  return [];
}

/** Merge timetable rows with extra-activity definitions for master view */
export function mergeMasterRowsWithExtras(rows = [], extraActivities = [], streams = [], { term = '', academicYear = '' } = {}) {
  const streamNames = new Set(streams.map((s) => s.fullName));
  const merged = [...rows];
  const seen = new Set(
    rows
      .filter((r) => r.extra_activity_id)
      .map((r) => `${r.class_name}__${r.day_of_week}__${r.extra_activity_id}`)
  );

  for (const act of extraActivities || []) {
    const cls = String(act.class_name || '').trim();
    if (!streamNames.has(cls)) continue;
    const actTerm = String(act.term || '').trim();
    const actYear = String(act.academic_year || '').trim();
    if (term && actTerm && actTerm !== term) continue;
    if (academicYear && actYear && actYear !== academicYear) continue;

    for (const day of parseExtraDays(act)) {
      const dedupeKey = `${cls}__${day}__${act.id}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      merged.push({
        id: `extra-${act.id}-${day}`,
        class_name: cls,
        subject_name: act.activity_name,
        day_of_week: day,
        start_time: act.start_time,
        end_time: act.end_time,
        extra_activity_id: act.id,
        term: act.term,
        academic_year: act.academic_year,
        room: 'EXTRA',
      });
    }
  }
  return merged;
}

export function parseClassGroup(className) {
  const s = String(className || '').trim();
  const m = s.match(/^(.+?)([A-H])$/i);
  if (m) return { group: m[1].toUpperCase(), stream: m[2].toUpperCase(), fullName: s };
  return { group: s.toUpperCase(), stream: '—', fullName: s };
}

export function buildClassGroups(classNames = []) {
  const groups = new Map();
  for (const name of classNames) {
    const parsed = parseClassGroup(name);
    if (!groups.has(parsed.group)) groups.set(parsed.group, []);
    const list = groups.get(parsed.group);
    if (!list.some((x) => x.fullName === parsed.fullName)) {
      list.push({ fullName: parsed.fullName, stream: parsed.stream });
    }
  }
  for (const [, list] of groups) {
    list.sort((a, b) => {
      if (a.stream === '—') return 1;
      if (b.stream === '—') return -1;
      return a.stream.localeCompare(b.stream);
    });
  }
  return groups;
}

export const hexToRgb = (hex) => {
  const h = String(hex || '#cccccc').replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16) || 200,
    parseInt(h.slice(2, 4), 16) || 200,
    parseInt(h.slice(4, 6), 16) || 200,
  ];
};
