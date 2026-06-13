'use strict';

const { promisePool } = require('../config/database');

function trimStr(v) {
  return String(v ?? '').trim();
}

function markCodeLabel(code) {
  const c = trimStr(code).toUpperCase();
  if (c === 'A') return 'Absent';
  if (c === 'E') return 'Exempt';
  if (c === 'M') return 'Missing';
  return null;
}

/** Normalize term labels so "Term 3", "term 3", "T3" match loosely. */
function normalizeTermKey(term) {
  const t = trimStr(term).toLowerCase().replace(/\s+/g, ' ');
  if (!t) return '';
  const m = t.match(/term\s*(\d+)/i) || t.match(/^t\s*(\d+)$/i) || t.match(/^(\d+)$/);
  if (m) return `term${m[1]}`;
  return t;
}

function termSqlMatchClause(columnExpr, termParam) {
  const key = normalizeTermKey(termParam);
  if (!key) return { clause: '', params: [] };
  const num = key.replace('term', '');
  return {
    clause: ` AND (
      TRIM(COALESCE(${columnExpr}, '')) = ''
      OR LOWER(REPLACE(TRIM(${columnExpr}), ' ', '')) = ?
      OR LOWER(REPLACE(TRIM(${columnExpr}), ' ', '')) LIKE ?
      OR LOWER(TRIM(${columnExpr})) = ?
    )`,
    params: [
      key,
      `%term${num}%`,
      `term ${num}`,
    ],
  };
}

function mapMarkRows(rows) {
  return (rows || []).map((r) => {
    const max = Number(r.max_score) || 100;
    const code = trimStr(r.mark_code).toUpperCase();
    const codeLabel = markCodeLabel(code);
    const score = r.score_obtained != null ? Number(r.score_obtained) : null;
    const percent = codeLabel ? null : (score != null && max > 0 ? Math.round((score / max) * 1000) / 10 : null);
    const teacher = trimStr(r.teacher_name);
    return {
      assessment_id: r.assessment_id,
      subject_name: r.subject_name || 'Subject',
      subject: r.subject_name || 'Subject',
      assessment_name: r.assessment_name || 'Assessment',
      score_obtained: score,
      score,
      max_score: max,
      max,
      percent,
      mark_code: code || null,
      mark_code_label: codeLabel,
      remark: codeLabel || (percent != null ? (percent >= 75 ? 'Strong' : percent >= 50 ? 'On track' : 'Needs support') : ''),
      assessment_date: r.assessment_date || r.assessment_created_at || null,
      recorded_at: r.mark_recorded_at || r.assessment_created_at || null,
      term: r.term || null,
      academic_year: r.academic_year || null,
      column_slug: r.column_slug || null,
      teacher_name: teacher || 'Teacher',
    };
  });
}

function aggregateMarksData(assessments) {
  const latestBySubject = {};
  const subjectAgg = {};
  for (const a of assessments) {
    const subj = a.subject_name;
    if (!latestBySubject[subj]) latestBySubject[subj] = a;
    if (a.percent != null) {
      if (!subjectAgg[subj]) subjectAgg[subj] = { sum: 0, count: 0, max: a.max_score };
      subjectAgg[subj].sum += a.percent;
      subjectAgg[subj].count += 1;
    }
  }

  const subjects = Object.entries(subjectAgg).map(([subject, v]) => {
    const avgPct = Math.round((v.sum / v.count) * 10) / 10;
    const latest = latestBySubject[subject];
    return {
      subject,
      score: latest?.score ?? Math.round((avgPct / 100) * (latest?.max_score || 100)),
      max: latest?.max_score || 100,
      average_percent: avgPct,
      remark: latest?.remark || '',
      teacher_name: latest?.teacher_name || 'Teacher',
      latest_assessment: latest?.assessment_name || null,
    };
  }).sort((a, b) => a.subject.localeCompare(b.subject));

  const numericPercents = assessments.map((a) => a.percent).filter((p) => p != null);
  const overall = numericPercents.length
    ? Math.round((numericPercents.reduce((s, p) => s + p, 0) / numericPercents.length) * 10) / 10
    : null;

  return {
    overall_gpa_percent: overall,
    average_grade: overall,
    class_rank: null,
    subjects,
    assessments,
    latest_by_subject: Object.values(latestBySubject).slice(0, 20),
    assessment_count: assessments.length,
  };
}

/** Distinct academic years / terms from published teacher marks for a student. */
async function fetchPublishedMarksPeriods(schoolId, studentId) {
  const sid = Number(studentId);
  const sch = Number(schoolId);
  if (!sid || !sch) return { years: [], terms: [], pairs: [] };
  const [rows] = await promisePool.query(
    `SELECT DISTINCT
       TRIM(a.academic_year) AS academic_year,
       TRIM(a.term) AS term
     FROM academic_marks m
     INNER JOIN academic_assessments a ON a.id = m.assessment_id AND a.school_id = m.school_id
     WHERE m.student_id = ? AND m.school_id = ?
       AND (a.status IS NULL OR a.status = 'published')
       AND TRIM(COALESCE(a.academic_year, '')) <> ''
       AND TRIM(COALESCE(a.term, '')) <> ''`,
    [sid, sch],
  ).catch(() => [[]]);
  const pairs = (rows || []).map((r) => ({
    academic_year: trimStr(r.academic_year),
    term: trimStr(r.term),
  })).filter((p) => p.academic_year && p.term);
  const years = [...new Set(pairs.map((p) => p.academic_year))];
  const terms = [...new Set(pairs.map((p) => p.term))];
  return { years, terms, pairs };
}

async function queryPublishedMarks(schoolId, studentId, { academicYear = '', term = '' } = {}) {
  const params = [studentId, schoolId];
  let sql = `
    SELECT
      a.id AS assessment_id,
      a.subject_name,
      a.assessment_name,
      a.max_score,
      a.assessment_date,
      a.created_at AS assessment_created_at,
      a.term,
      a.academic_year,
      a.column_slug,
      m.score_obtained,
      m.mark_code,
      m.created_at AS mark_recorded_at,
      CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) AS teacher_name
    FROM academic_marks m
    INNER JOIN academic_assessments a ON a.id = m.assessment_id AND a.school_id = m.school_id
    LEFT JOIN users u ON u.id = m.recorded_by_user_id
    WHERE m.student_id = ? AND m.school_id = ?
      AND (a.status IS NULL OR a.status = 'published')`;

  if (academicYear) {
    sql += " AND (TRIM(COALESCE(a.academic_year, '')) = '' OR TRIM(a.academic_year) = ?)";
    params.push(academicYear);
  }
  const termMatch = termSqlMatchClause('a.term', term);
  sql += termMatch.clause;
  params.push(...termMatch.params);
  sql += ' ORDER BY COALESCE(a.assessment_date, a.created_at) DESC, m.id DESC LIMIT 300';

  const [rows] = await promisePool.query(sql, params);
  return mapMarkRows(rows);
}

/**
 * Published teacher marks for a student — used by parent portal, ShuleCard, and QR academics.
 * Falls back to all published marks when term/year filter returns nothing.
 */
async function fetchStudentPublishedMarks(schoolId, studentId, {
  academicYear = '', term = '', strict = false,
} = {}) {
  const sid = Number(studentId);
  const sch = Number(schoolId);
  const empty = {
    overall_gpa_percent: null,
    class_rank: null,
    subjects: [],
    assessments: [],
    latest_by_subject: [],
    average_grade: null,
    assessment_count: 0,
  };
  if (!sid || !sch) return empty;

  let assessments = await queryPublishedMarks(sch, sid, { academicYear, term });
  if (!assessments.length && (academicYear || term)) {
    assessments = await queryPublishedMarks(sch, sid, { academicYear: academicYear || '', term: '' });
  }
  if (!assessments.length && !strict) {
    assessments = await queryPublishedMarks(sch, sid, {});
  }

  return aggregateMarksData(assessments);
}

module.exports = {
  fetchStudentPublishedMarks,
  fetchPublishedMarksPeriods,
  markCodeLabel,
  normalizeTermKey,
};
