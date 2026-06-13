const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:5100').replace(/\/+$/, '');

export const STUDENT_AVATAR = '/student-avatar.png';
export const NAVY = '#000435';
export const AMBER = '#f59e0b';
export const MINT = '#ecfdf5';

export function resolveAssetUrl(path) {
  if (!path) return null;
  const raw = String(path).trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  return `${API_ORIGIN}${raw.startsWith('/') ? raw : `/${raw}`}`;
}

export function resolveStudentPhotoUrl(photoUrl) {
  const uploaded = resolveAssetUrl(photoUrl);
  if (uploaded) return uploaded;
  const base = String(import.meta.env.BASE_URL || '/').replace(/\/+$/, '');
  return base ? `${base}/student-avatar.png` : STUDENT_AVATAR;
}

export function formatSchoolAddress(school = {}) {
  if (school.address) return school.address;
  if (school.full_address) return school.full_address;
  const parts = [school.village, school.cell, school.sector, school.district, school.province].filter(Boolean);
  return parts.join(', ');
}

export function gradeStyle() {
  return 'text-slate-800 font-semibold';
}

/** Discipline conduct marks — current score out of DOS default maximum. */
export function formatDisciplineMarks(report) {
  const marks = report?.discipline_marks;
  const max = report?.discipline_marks_max;
  if (marks != null && max != null) {
    return `${marks}/${max}`;
  }
  return '—';
}

/** Resolve remark text for a letter grade from snapshot scale or defaults. */
export function resolveGradeRemark(grade, report) {
  if (!grade) return '—';
  const g = String(grade).toUpperCase().slice(0, 1);
  const bands = report?.grading_scale;
  if (Array.isArray(bands) && bands.length) {
    const band = bands.find((b) => String(b.letter).toUpperCase() === g);
    if (band?.remark) return band.remark;
  }
  const defaults = {
    A: 'EXCELLENT',
    B: 'VERY GOOD',
    C: 'GOOD',
    D: 'SATISFACTORY',
    E: 'ADEQUATE',
    F: 'FAIR',
  };
  return defaults[g] || '—';
}

export function scoreColor(value) {
  if (value == null) return 'text-slate-500';
  if (value >= 80) return 'text-emerald-600';
  if (value >= 65) return 'text-sky-600';
  if (value >= 50) return 'text-amber-600';
  return 'text-red-600';
}

export function buildTrendSeries(report) {
  const terms = ['Term 1', 'Term 2', 'Term 3'];
  const trendRows = [
    ...(report?.performance_trend || []),
    ...(report?.performance_timeline || []),
    ...(report?.term_snapshots || []).map((s) => ({ term: s.term, average: s.overall_average })),
  ];
  const fromTrend = Object.fromEntries(trendRows.map((t) => [t.term, t.average]));
  const ys = report?.year_summary || {};
  const fromYear = {
    'Term 1': ys.term_1,
    'Term 2': ys.term_2,
    'Term 3': ys.term_3,
  };

  return terms.map((term) => ({
    term,
    label: term,
    average: fromTrend[term] ?? fromYear[term] ?? null,
  }));
}

export function reportTypeLabel(reportType) {
  if (reportType === 'mid_term') return 'Mid-Term Report';
  if (reportType === 'annual') return 'Annual Report';
  return 'Final Report';
}

export function buildPublicReportUrl(snapshotId) {
  if (!snapshotId) return null;
  const configuredBase = String(
    import.meta.env.VITE_PUBLIC_REPORT_URL ||
    import.meta.env.VITE_BABYEYI_PUBLIC_URL ||
    import.meta.env.VITE_MAIN_PLATFORM_URL ||
    '',
  ).replace(/\/+$/, '');
  if (configuredBase) {
    return `${configuredBase}/student-mark-report/${snapshotId}`;
  }
  if (typeof window !== 'undefined') {
    const origin = window.location.origin.replace(/\/+$/, '');
    // Pro dev server (5174) — QR must point at main public site (5173), not /pro SPA paths.
    if (/:5174$/.test(origin)) {
      return `http://localhost:5173/student-mark-report/${snapshotId}`;
    }
    return `${origin}/student-mark-report/${snapshotId}`;
  }
  return `http://localhost:5173/student-mark-report/${snapshotId}`;
}

function isLegacyQrPayload(value) {
  if (!value || typeof value !== 'string') return false;
  const trimmed = value.trim();
  return trimmed.startsWith('{') && trimmed.includes('babyeyi_student_report');
}

export function buildReportQrValue(report) {
  const snapshotId = report?.snapshot_id;
  if (report?.qr_data) {
    if (report.qr_data.startsWith('http')) return report.qr_data;
    if (isLegacyQrPayload(report.qr_data) && snapshotId) return buildPublicReportUrl(snapshotId);
    if (snapshotId) return buildPublicReportUrl(snapshotId);
  }
  if (snapshotId) return buildPublicReportUrl(snapshotId);
  return '';
}

/** Filter subject rows — hide extra-activity courses unless toggled on. */
export function filterReportSubjects(subjects = [], showExtraActivities = false) {
  if (showExtraActivities) return subjects;
  return subjects.filter((s) => !s.is_extra_activity);
}

const ASSESSMENT_SHORT_LABELS = {
  homework: 'HW',
  quiz: 'Quiz',
  cat: 'CAT',
  project: 'Proj',
  practical: 'Prc',
  mid_term: 'Mid',
  end_term: 'Final',
};

export function isFinalAssessmentSlug(slug) {
  return /final|exam|end[_\-.]?term|eoy/i.test(String(slug || ''));
}

/** Column defs for assessment breakdown table (mid-term hides final-exam slugs). */
export function resolveReportAssessmentColumns(report, isMidReport) {
  let cols = Array.isArray(report?.assessment_columns) ? [...report.assessment_columns] : [];
  if (!cols.length) {
    const slugSet = new Set();
    for (const s of report?.subjects || []) {
      Object.keys(s.assessments || s.slugPercents || {}).forEach((slug) => slugSet.add(slug));
    }
    cols = [...slugSet].sort().map((slug) => ({
      slug,
      short_label: ASSESSMENT_SHORT_LABELS[slug] || slug,
      is_final: isFinalAssessmentSlug(slug),
    }));
  }
  if (isMidReport) {
    cols = cols.filter((c) => !c.is_final);
  }
  return cols;
}

export function assessmentTrendArrow(direction) {
  if (direction === 'up') return '↑';
  if (direction === 'down') return '↓';
  return '';
}

export function assessmentTrendClass(direction) {
  if (direction === 'up') return 'text-emerald-600';
  if (direction === 'down') return 'text-red-600';
  return 'text-slate-400';
}

/** Raw mark cell e.g. 8/10 */
export function formatAssessmentMark(assessments, slug) {
  const a = assessments?.[slug];
  if (!a) return '—';
  if (a.score != null && a.max != null) {
    const score = Number(a.score);
    const max = Number(a.max);
    if (Number.isFinite(score) && Number.isFinite(max)) {
      return `${Number.isInteger(score) ? score : score.toFixed(1)}/${max}`;
    }
  }
  if (a.percent != null) return `${a.percent}%`;
  return '—';
}

/** Student score only e.g. 8.5 (no "/max" in cell). */
export function formatAssessmentScoreOnly(assessments, slug) {
  const a = assessments?.[slug];
  if (!a) return '—';
  if (a.score != null) {
    const score = Number(a.score);
    if (Number.isFinite(score)) {
      return Number.isInteger(score) ? String(score) : score.toFixed(1);
    }
  }
  if (a.percent != null) return `${a.percent}%`;
  return '—';
}

/** Full marks for an assessment column (max across subjects). */
export function resolveAssessmentColumnMax(subjects, slug) {
  let max = null;
  for (const s of subjects || []) {
    const m = s.assessments?.[slug]?.max;
    if (m != null && Number(m) > 0) {
      max = Math.max(max ?? 0, Number(m));
    }
  }
  return max;
}

/** Sum raw marks per assessment column and overall across all subjects. */
export function computeMarksGrandTotals(subjects, assessmentColumns) {
  const columnTotals = {};
  let overallScore = 0;
  let overallMax = 0;

  for (const col of assessmentColumns) {
    columnTotals[col.slug] = null;
  }

  for (const s of subjects || []) {
    for (const col of assessmentColumns) {
      const a = s.assessments?.[col.slug];
      if (a?.score != null && Number.isFinite(Number(a.score))) {
        const score = Number(a.score);
        columnTotals[col.slug] = (columnTotals[col.slug] ?? 0) + score;
        overallScore += score;
      }
      if (a?.max != null && Number.isFinite(Number(a.max))) {
        overallMax += Number(a.max);
      }
    }
  }

  for (const slug of Object.keys(columnTotals)) {
    if (columnTotals[slug] != null) {
      const v = Math.round(columnTotals[slug] * 10) / 10;
      columnTotals[slug] = Number.isInteger(v) ? String(v) : v.toFixed(1);
    }
  }

  const fmt = (n) => {
    if (n == null || !Number.isFinite(n) || n <= 0) return null;
    const v = Math.round(n * 10) / 10;
    return Number.isInteger(v) ? String(v) : v.toFixed(1);
  };

  return {
    columnTotals,
    overallScore: fmt(overallScore),
    overallMax: fmt(overallMax),
    overallPercent: overallMax > 0
      ? Math.round((overallScore / overallMax) * 1000) / 10
      : null,
  };
}

export const DEFAULT_GRADING_BANDS = [
  { letter: 'A', min_percent: 80, max_percent: 100, remark: 'EXCELLENT' },
  { letter: 'B', min_percent: 75, max_percent: 79, remark: 'VERY GOOD' },
  { letter: 'C', min_percent: 70, max_percent: 74, remark: 'GOOD' },
  { letter: 'D', min_percent: 60, max_percent: 69, remark: 'SATISFACTORY' },
  { letter: 'E', min_percent: 50, max_percent: 59, remark: 'ADEQUATE' },
  { letter: 'F', min_percent: 0, max_percent: 49, remark: 'FAIR' },
];

export function resolveGradingBands(report) {
  const bands = report?.grading_scale;
  if (Array.isArray(bands) && bands.length) {
    return [...bands].sort((a, b) => (Number(b.min_percent) || 0) - (Number(a.min_percent) || 0));
  }
  return DEFAULT_GRADING_BANDS;
}

export const ACADEMIC_HEALTH_FORMULA = {
  title: 'Academic Health Formula',
  expression: 'Health = (Marks × 40%) + (Attendance × 20%) + (Behaviour × 15%) + (Homework × 15%) + (Participation × 10%)',
  note: 'Each factor uses the student\'s percentage for that area (0–100). Result is capped at 100%.',
};
