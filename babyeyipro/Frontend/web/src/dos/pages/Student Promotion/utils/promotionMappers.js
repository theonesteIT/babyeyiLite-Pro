/** @typedef {'Eligible'|'Risky'|'Repeat Recommended'|'Graduating'} PromotionUiStatus */

export function formatCombination(combo) {
  if (combo == null || combo === '') return '';
  if (Array.isArray(combo)) return combo.map((x) => String(x).trim()).filter(Boolean).join(' ');
  if (typeof combo === 'object') {
    try {
      const vals = Object.values(combo).filter((v) => v != null && String(v).trim() !== '');
      if (vals.length) return vals.map((v) => String(v).trim()).join(' ');
    } catch (_) {}
    return '';
  }
  return String(combo).trim();
}

export function schoolClassRowToLabel(c) {
  if (!c) return '';
  if (c._from_students) return String(c.group_name || '').trim();
  const stream = c.stream_name && String(c.stream_name).trim() !== '' ? c.stream_name : '';
  const combo = formatCombination(c.combination);
  const parts = [c.group_name, stream, combo].filter((p) => p != null && String(p).trim() !== '');
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

export function buildClassNameFromParts(group, stream) {
  const parts = [String(group || '').trim(), String(stream || '').trim()].filter(Boolean);
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

/**
 * Parse a stored class_name into group + stream (best effort).
 */
export function parseClassName(className) {
  const cn = String(className || '').trim();
  if (!cn) return { group: '', stream: '', full: '' };
  const tokens = cn.split(/\s+/);
  if (tokens.length === 1) return { group: tokens[0], stream: '', full: cn };
  return { group: tokens[0], stream: tokens.slice(1).join(' '), full: cn };
}

export function studentDisplayName(s) {
  return `${s.first_name || ''} ${s.last_name || ''}`.trim() || '—';
}

export function normalizeGender(g) {
  const g0 = String(g || '').toLowerCase();
  if (g0 === 'male' || g0 === 'm') return 'M';
  if (g0 === 'female' || g0 === 'f') return 'F';
  return g0 ? String(g).charAt(0).toUpperCase() : '';
}

/** Map API progress status_code to promotion UI status. */
export function mapProgressToUiStatus(statusCode) {
  const code = String(statusCode || '').toLowerCase();
  if (code === 'repeated' || code === 'second_sitting' || code === 'dropped') return 'Repeat Recommended';
  if (code === 'other') return 'Risky';
  return 'Eligible';
}

/**
 * Map a students table row (+ optional progress) to promotion list shape.
 */
export function mapApiStudentToPromotion(row, progressByStudentId = {}, reviewMetrics = null) {
  const parsed = parseClassName(row.class_name);
  const prog = progressByStudentId[row.id];
  const status = prog ? mapProgressToUiStatus(prog.status_code) : 'Eligible';
  const avgMarks =
    prog?.marks_obtained != null && !Number.isNaN(Number(prog.marks_obtained))
      ? Math.round(Number(prog.marks_obtained))
      : null;

  const m = reviewMetrics?.[row.id];
  let attendance = '—';
  let discipline = '—';
  let disciplineRemaining = null;
  let disciplineDeducted = null;
  let disciplineTotal = null;
  let gateMorning = null;
  let gateEvening = null;

  if (m) {
    disciplineRemaining = Number(m.discipline_remaining);
    disciplineDeducted = Number(m.discipline_deducted);
    disciplineTotal = Number(m.discipline_total);
    discipline =
      Number.isFinite(disciplineRemaining) ? `${disciplineRemaining}` : '—';
    gateMorning = Number(m.gate_morning_days) || 0;
    gateEvening = Number(m.gate_evening_days) || 0;
    attendance =
      m.gate_attendance_pct != null ? Number(m.gate_attendance_pct) : '—';
  }

  return {
    id: row.id,
    code: row.student_uid || row.student_code || String(row.id),
    name: studentDisplayName(row),
    gender: normalizeGender(row.gender),
    avgMarks: avgMarks ?? '—',
    attendance,
    discipline,
    disciplineRemaining,
    disciplineDeducted,
    disciplineTotal,
    gateMorning,
    gateEvening,
    fees: '—',
    status,
    stream: parsed.stream,
    class: parsed.group,
    class_name: row.class_name || parsed.full,
    academic_year: row.academic_year || '',
    _raw: row,
  };
}

export function studentMatchesClassFilter(student, { group, stream, fullLabel }) {
  const cn = String(student.class_name || student._raw?.class_name || '').trim();
  if (!cn) return false;
  if (fullLabel && cn === fullLabel) return true;
  const built = buildClassNameFromParts(group, stream);
  if (built && cn === built) return true;
  if (group && cn.startsWith(group)) {
    if (!stream) return true;
    return cn.includes(stream);
  }
  return false;
}

/**
 * Build dropdown options from school_classes + class_name_options.
 */
export function buildClassCatalog(classRows = [], classNameOptions = []) {
  const groups = new Set();
  const streamsGlobal = new Set();
  const streamsByGroup = new Map();
  const fullLabels = new Set();

  for (const row of classRows) {
    const g = String(row.group_name || '').trim();
    const stream =
      (row.stream_name && String(row.stream_name).trim()) || formatCombination(row.combination) || '';
    if (g) {
      groups.add(g);
      if (!streamsByGroup.has(g)) streamsByGroup.set(g, new Set());
      if (stream) streamsByGroup.get(g).add(stream);
    }
    const label = schoolClassRowToLabel(row);
    if (label) fullLabels.add(label);
  }

  for (const label of classNameOptions) {
    const t = String(label || '').trim();
    if (!t) continue;
    fullLabels.add(t);
    const p = parseClassName(t);
    if (p.group) {
      groups.add(p.group);
      if (!streamsByGroup.has(p.group)) streamsByGroup.set(p.group, new Set());
      if (p.stream) streamsByGroup.get(p.group).add(p.stream);
    }
  }

  const sortedGroups = [...groups].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  for (const set of streamsByGroup.values()) {
    for (const s of set) streamsGlobal.add(s);
  }
  const sortedStreams = [...streamsGlobal].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const sortedFullLabels = [...fullLabels].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  return {
    groups: sortedGroups.length ? sortedGroups : sortedFullLabels.map((l) => parseClassName(l).group).filter(Boolean),
    streams: sortedStreams,
    streamsByGroup: Object.fromEntries(
      [...streamsByGroup.entries()].map(([g, set]) => [g, [...set].sort()])
    ),
    fullLabels: sortedFullLabels,
  };
}

export function collectAcademicYears(students = []) {
  const years = new Set();
  for (const s of students) {
    const y = String(s.academic_year || s._raw?.academic_year || '').trim();
    if (y) years.add(y);
  }
  const sorted = [...years].sort((a, b) => b.localeCompare(a));
  if (sorted.length) return sorted;
  const y = new Date().getFullYear();
  return [`${y - 1}-${y}`, `${y}-${y + 1}`];
}

export const DEFAULT_TERMS = ['Term 1', 'Term 2', 'Term 3'];
export const ALL_YEAR_TERM = 'All Year';

export function isAllYearTerm(term) {
  const t = String(term || '').trim().toLowerCase();
  return t === 'all year' || t === 'all-year' || t === 'allyear';
}

/** School terms plus combined full-year option for promotion review. */
export function appendAllYearTerm(terms = []) {
  const base = Array.isArray(terms) ? [...terms] : [];
  if (!base.some((x) => isAllYearTerm(x))) base.push(ALL_YEAR_TERM);
  return base;
}

/** National exit / final cohort class codes (group or class_name prefix). */
export const FINAL_YEAR_CLASS_CODES = ['P6', 'S3', 'S6'];

export function isFinalYearClassLabel(classNameOrGroup) {
  const raw = String(classNameOrGroup || '').trim().toUpperCase();
  if (!raw) return false;
  const group = raw.split(/\s+/)[0];
  return FINAL_YEAR_CLASS_CODES.some(
    (code) => group === code || raw === code || raw.startsWith(`${code} `)
  );
}

export function isFinalYearPromotionStudent(student) {
  const group = String(student?.class || '').trim();
  const full = String(student?.class_name || student?._raw?.class_name || '').trim();
  return isFinalYearClassLabel(group) || isFinalYearClassLabel(full);
}
