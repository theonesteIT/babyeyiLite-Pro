'use strict';

const { promisePool } = require('../config/database');
const { getConductBoundsForSchool } = require('../BabyeyiRoutes/conductMarksSettings');
const { normalizeGradebookLabel, sqlNormLabelEquals } = require('./gradebookLabels');

const RATING_SCORES = {
  excellent: 100,
  'very good': 85,
  good: 70,
  'needs improvement': 50,
  developing: 45,
};

function ratingToScore(rating) {
  const key = String(rating || '').trim().toLowerCase();
  return RATING_SCORES[key] ?? null;
}

function trendDirection(percents) {
  const vals = (percents || []).filter((v) => v != null && Number.isFinite(v));
  if (vals.length < 2) return 'stable';
  const first = vals[0];
  const last = vals[vals.length - 1];
  const diff = last - first;
  if (diff >= 3) return 'up';
  if (diff <= -3) return 'down';
  return 'stable';
}

async function fetchDisciplineMarksInfo(schoolId, studentId) {
  const bounds = await getConductBoundsForSchool(schoolId);
  const max = Number(bounds.default_marks) || 40;
  const min = Number(bounds.minimum_marks) || 0;
  const [[row]] = await promisePool.query(
    'SELECT discipline_marks FROM students WHERE id = ? AND school_id = ? LIMIT 1',
    [studentId, schoolId],
  );
  const marks = Number(row?.discipline_marks ?? max);
  let percent = 100;
  if (max > min) {
    percent = Math.round(Math.min(100, Math.max(0, ((marks - min) / (max - min)) * 100)) * 10) / 10;
  }
  return {
    discipline_marks: marks,
    discipline_marks_max: max,
    discipline_marks_min: min,
    behaviour_percent: percent,
  };
}

async function fetchBehaviourPercent(schoolId, studentId) {
  const info = await fetchDisciplineMarksInfo(schoolId, studentId);
  return info.behaviour_percent;
}

async function fetchGateAttendancePercent(schoolId, studentId) {
  try {
    const [rows] = await promisePool.query(
      `SELECT
         COUNT(DISTINCT attendance_date) AS school_days,
         SUM(CASE WHEN morning_check_in IS NOT NULL THEN 1 ELSE 0 END) AS morning_days
       FROM school_gate_attendance_records
       WHERE school_id = ? AND person_type = 'STUDENT' AND person_id = ?`,
      [schoolId, studentId],
    );
    const schoolDays = Number(rows[0]?.school_days) || 0;
    const morningDays = Number(rows[0]?.morning_days) || 0;
    if (schoolDays <= 0) return null;
    return Math.round((morningDays / schoolDays) * 1000) / 10;
  } catch {
    return null;
  }
}

async function fetchClassPeriodAttendancePercent(schoolId, studentId) {
  try {
    const [rows] = await promisePool.query(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN LOWER(TRIM(ar.status)) IN ('present', 'late') THEN 1 ELSE 0 END) AS present
       FROM academic_attendance_records ar
       INNER JOIN academic_attendance_logs al ON al.id = ar.log_id
       WHERE al.school_id = ? AND ar.student_id = ?`,
      [schoolId, studentId],
    );
    const total = Number(rows[0]?.total) || 0;
    const present = Number(rows[0]?.present) || 0;
    if (total <= 0) return null;
    return Math.round((present / total) * 1000) / 10;
  } catch {
    return null;
  }
}

async function fetchDosMorningAttendancePercent(schoolId, studentId) {
  try {
    const [rows] = await promisePool.query(
      `SELECT
         COUNT(DISTINCT attendance_date) AS total_days,
         COUNT(DISTINCT CASE WHEN status_in IN ('On time', 'Late') THEN attendance_date END) AS present_days
       FROM attendance_student
       WHERE school_id = ? AND student_id = ?`,
      [schoolId, studentId],
    );
    const total = Number(rows[0]?.total_days) || 0;
    const present = Number(rows[0]?.present_days) || 0;
    if (total <= 0) return null;
    return Math.round((present / total) * 1000) / 10;
  } catch {
    return null;
  }
}

/** Blend gate + class period + DOS morning attendance (average of available sources). */
async function fetchBlendedAttendancePercent(schoolId, studentId) {
  const [gate, classPeriod, dosMorning] = await Promise.all([
    fetchGateAttendancePercent(schoolId, studentId),
    fetchClassPeriodAttendancePercent(schoolId, studentId),
    fetchDosMorningAttendancePercent(schoolId, studentId),
  ]);
  const parts = [gate, classPeriod, dosMorning].filter((v) => v != null && Number.isFinite(v));
  if (!parts.length) return null;
  return Math.round((parts.reduce((a, b) => a + b, 0) / parts.length) * 10) / 10;
}

async function fetchStudentCompetencyAverage(schoolId, studentId, academicYear, term) {
  try {
    const [rows] = await promisePool.query(
      `SELECT r.rating
       FROM student_competency_ratings r
       WHERE r.school_id = ? AND r.student_id = ?
         AND r.academic_year = ? AND r.term = ?`,
      [schoolId, studentId, academicYear, term],
    );
    const scores = rows.map((r) => ratingToScore(r.rating)).filter((v) => v != null);
    if (!scores.length) return null;
    return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
  } catch {
    return null;
  }
}

function computeAcademicHealthScore(ctx, weights = null) {
  const w = weights || {
    marks_weight: 40,
    attendance_weight: 20,
    behaviour_weight: 15,
    homework_weight: 15,
    participation_weight: 10,
  };
  const marks = ctx.overall_average ?? 0;
  const attendance = ctx.attendance ?? 0;
  const behaviour = ctx.behaviour ?? 0;
  const homework = ctx.homework_completion ?? 80;
  const participation = ctx.assessment_participation ?? 75;
  const score = (marks * (w.marks_weight / 100))
    + (attendance * (w.attendance_weight / 100))
    + (behaviour * (w.behaviour_weight / 100))
    + (homework * (w.homework_weight / 100))
    + (participation * (w.participation_weight / 100));
  return Math.round(Math.min(100, Math.max(0, score)) * 10) / 10;
}

function computeSuccessScore(ctx) {
  const marks = ctx.overall_average ?? 0;
  const attendance = ctx.attendance ?? 0;
  const homework = ctx.homework_completion ?? 0;
  const behaviour = ctx.behaviour ?? 0;
  const competencies = ctx.competencies_avg ?? 0;
  const score = (marks * 0.5) + (attendance * 0.2) + (homework * 0.1)
    + (behaviour * 0.1) + (competencies * 0.1);
  return Math.round(Math.min(100, Math.max(0, score)) * 10) / 10;
}

async function bulkFetchAssessmentTrends(schoolId, className, studentIds, { academicYear = null, term = null } = {}) {
  if (!studentIds.length) return {};
  const cn = normalizeGradebookLabel(className);
  let sql = `SELECT m.student_id, a.subject_name, a.column_slug, a.id AS assessment_id,
                    m.score_obtained, a.max_score, a.created_at
             FROM academic_marks m
             INNER JOIN academic_assessments a ON a.id = m.assessment_id AND a.school_id = m.school_id
             WHERE m.school_id = ? AND m.student_id IN (?)
               AND (${sqlNormLabelEquals('a.class_name')})
               AND (m.mark_code IS NULL OR TRIM(m.mark_code) = '')`;
  const params = [schoolId, studentIds, cn];
  if (academicYear) {
    sql += ' AND TRIM(COALESCE(a.academic_year, \'\')) = ?';
    params.push(String(academicYear).trim());
  }
  if (term) {
    sql += ' AND TRIM(COALESCE(a.term, \'\')) = ?';
    params.push(String(term).trim());
  }
  sql += ' ORDER BY a.subject_name ASC, a.column_slug ASC, a.created_at ASC, a.id ASC';
  const [rows] = await promisePool.query(sql, params);

  const seq = {};
  for (const r of rows) {
    if (!r.max_score) continue;
    const sid = r.student_id;
    const subj = normalizeGradebookLabel(r.subject_name);
    const slug = String(r.column_slug || 'other').toLowerCase();
    if (!seq[sid]) seq[sid] = {};
    if (!seq[sid][subj]) seq[sid][subj] = {};
    if (!seq[sid][subj][slug]) seq[sid][subj][slug] = [];
    const pct = Math.round((Number(r.score_obtained) / Number(r.max_score)) * 1000) / 10;
    seq[sid][subj][slug].push(pct);
  }

  const out = {};
  for (const [sid, subjects] of Object.entries(seq)) {
    out[sid] = {};
    for (const [subj, slugs] of Object.entries(subjects)) {
      out[sid][subj] = {};
      for (const [slug, percents] of Object.entries(slugs)) {
        out[sid][subj][slug] = trendDirection(percents);
      }
    }
  }
  return out;
}

module.exports = {
  trendDirection,
  ratingToScore,
  fetchBehaviourPercent,
  fetchDisciplineMarksInfo,
  fetchBlendedAttendancePercent,
  fetchStudentCompetencyAverage,
  computeAcademicHealthScore,
  computeSuccessScore,
  bulkFetchAssessmentTrends,
};
