export function disciplineFromStudentRow(student) {
  const raw = student._raw || {};
  const marks = raw.discipline_marks;
  if (marks != null && marks !== '' && !Number.isNaN(Number(marks))) {
    return Number(marks);
  }
  return null;
}

export function resolveDisciplineMax(metrics, schoolMax) {
  const fromMetrics = Number(metrics?.discipline_total ?? metrics?.discipline_default);
  if (Number.isFinite(fromMetrics) && fromMetrics > 0) return fromMetrics;
  const fromSchool = Number(schoolMax);
  if (Number.isFinite(fromSchool) && fromSchool > 0) return fromSchool;
  return null;
}

export function resolveDisciplineMin(metrics, schoolMin) {
  const fromMetrics = Number(metrics?.discipline_minimum);
  if (Number.isFinite(fromMetrics) && fromMetrics >= 0) return fromMetrics;
  const fromSchool = Number(schoolMin);
  if (Number.isFinite(fromSchool) && fromSchool >= 0) return fromSchool;
  return 0;
}

export function mergeReviewMetrics(student, metrics, schoolDisciplineMax = null, schoolDisciplineMin = null) {
  const conductMax = resolveDisciplineMax(metrics, schoolDisciplineMax);
  const conductMin = resolveDisciplineMin(metrics, schoolDisciplineMin);
  const rawDiscipline = disciplineFromStudentRow(student);
  if (!metrics) {
    if (rawDiscipline == null) return student;
    return {
      ...student,
      disciplineRemaining: rawDiscipline,
      disciplineTotal: conductMax,
      discipline: String(rawDiscipline),
      disciplineDeducted: 0,
    };
  }
  const remaining = Number(metrics.discipline_remaining);
  const deducted = Number(metrics.discipline_deducted);
  const total = resolveDisciplineMax(metrics, schoolDisciplineMax);
  const morning = metrics.gate_morning_days != null ? Number(metrics.gate_morning_days) : null;
  const evening = metrics.gate_evening_days != null ? Number(metrics.gate_evening_days) : null;
  const pct = metrics.gate_attendance_pct;
  const finalRemaining = Number.isFinite(remaining)
    ? remaining
    : rawDiscipline != null
      ? rawDiscipline
      : null;
  const belowMinimum =
    metrics?.discipline_below_minimum === true ||
    (Number.isFinite(finalRemaining) && finalRemaining < conductMin);
  return {
    ...student,
    disciplineRemaining: finalRemaining,
    disciplineDeducted: Number.isFinite(deducted) ? deducted : 0,
    disciplineTotal: total,
    disciplineMinimum: conductMin,
    disciplineBelowMinimum: belowMinimum,
    discipline: finalRemaining != null ? String(finalRemaining) : student.discipline,
    gateMorning: morning,
    gateEvening: evening,
    attendance: pct != null ? pct : student.attendance,
    hasGateData: metrics != null,
  };
}

export function disciplineColor(remaining, total) {
  if (!Number.isFinite(remaining) || !Number.isFinite(total) || total <= 0) return 'text-gray-600';
  const pct = (remaining / total) * 100;
  if (pct >= 70) return 'text-green-600';
  if (pct >= 40) return 'text-amber-600';
  return 'text-red-600';
}
