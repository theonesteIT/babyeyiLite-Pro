'use strict';

const { promisePool } = require('../config/database');

const DEFAULT_TERMS = ['Term 1', 'Term 2', 'Term 3'];

function trimStr(v) {
  return String(v || '').trim();
}

function parseTermsJson(raw, fallback = DEFAULT_TERMS) {
  if (!raw) return [...fallback];
  try {
    const parsed = Array.isArray(raw) ? raw : JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length) {
      return parsed.map((x) => String(x).trim()).filter(Boolean);
    }
  } catch (_) { /* keep fallback */ }
  return [...fallback];
}

function inferTermFromMonth(terms = DEFAULT_TERMS, date = new Date()) {
  const month = date.getMonth() + 1;
  if (!Array.isArray(terms) || !terms.length) return DEFAULT_TERMS[0];
  if (terms.length >= 3) {
    if (month >= 9 && month <= 12) return terms[0];
    if (month >= 1 && month <= 4) return terms[1] || terms[0];
    return terms[2] || terms[terms.length - 1];
  }
  if (terms.length === 2) return month >= 9 || month <= 2 ? terms[0] : terms[1];
  return terms[0];
}

function inferAcademicYearFromDate(date = new Date()) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  return m >= 9 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
}

async function collectDistinctYears(schoolId, sql) {
  const [rows] = await promisePool.query(sql, [schoolId]).catch(() => [[]]);
  return (rows || []).map((r) => trimStr(r.academic_year || r.v)).filter(Boolean);
}

/**
 * All academic years configured by DOS (Academic & Term) or Manager (Preferences),
 * plus years found on assignments, timetables, and students.
 */
async function loadSchoolAcademicCalendar(schoolId) {
  const yearsSet = new Set();
  const termsByYear = {};

  const [registryRows] = await promisePool
    .query(
      `SELECT academic_year, active_terms_json, is_current
       FROM school_academic_year_registry
       WHERE school_id = ?
       ORDER BY academic_year DESC`,
      [schoolId],
    )
    .catch(() => [[]]);

  let currentAcademicYear = '';
  for (const row of registryRows || []) {
    const year = trimStr(row.academic_year);
    if (!year) continue;
    yearsSet.add(year);
    termsByYear[year] = parseTermsJson(row.active_terms_json, DEFAULT_TERMS);
    if (Number(row.is_current) === 1) currentAcademicYear = year;
  }

  const [[legacy]] = await promisePool
    .query(
      `SELECT current_academic_year, active_terms_json
       FROM school_academic_settings WHERE school_id = ? LIMIT 1`,
      [schoolId],
    )
    .catch(() => [[null]]);

  const legacyYear = trimStr(legacy?.current_academic_year);
  const legacyTerms = parseTermsJson(legacy?.active_terms_json, DEFAULT_TERMS);
  if (legacyYear) {
    yearsSet.add(legacyYear);
    if (!termsByYear[legacyYear]) termsByYear[legacyYear] = legacyTerms;
    if (!currentAcademicYear) currentAcademicYear = legacyYear;
  }

  const extraYearSources = await Promise.all([
    collectDistinctYears(
      schoolId,
      `SELECT DISTINCT TRIM(academic_year) AS academic_year
       FROM teacher_assignments
       WHERE school_id = ? AND academic_year IS NOT NULL AND TRIM(academic_year) <> ''`,
    ),
    collectDistinctYears(
      schoolId,
      `SELECT DISTINCT TRIM(academic_year) AS v
       FROM academic_timetables
       WHERE school_id = ? AND academic_year IS NOT NULL AND TRIM(academic_year) <> ''`,
    ),
    collectDistinctYears(
      schoolId,
      `SELECT DISTINCT TRIM(academic_year) AS academic_year
       FROM students
       WHERE school_id = ? AND academic_year IS NOT NULL AND TRIM(academic_year) <> ''`,
    ),
    collectDistinctYears(
      schoolId,
      `SELECT DISTINCT TRIM(academic_year) AS academic_year
       FROM academic_assessments
       WHERE school_id = ? AND academic_year IS NOT NULL AND TRIM(academic_year) <> ''`,
    ),
  ]);

  for (const list of extraYearSources) {
    for (const year of list) {
      yearsSet.add(year);
      if (!termsByYear[year]) termsByYear[year] = [...DEFAULT_TERMS];
    }
  }

  const y = new Date().getFullYear();
  for (let i = -2; i <= 2; i += 1) {
    const start = y + i;
    const rangeYear = `${start}-${start + 1}`;
    yearsSet.add(rangeYear);
    if (!termsByYear[rangeYear]) termsByYear[rangeYear] = [...DEFAULT_TERMS];
  }

  if (!currentAcademicYear) {
    currentAcademicYear = legacyYear || inferAcademicYearFromDate();
    yearsSet.add(currentAcademicYear);
    if (!termsByYear[currentAcademicYear]) {
      termsByYear[currentAcademicYear] = legacyTerms;
    }
  }

  const academicYears = [...yearsSet].filter(Boolean).sort((a, b) => String(b).localeCompare(String(a)));
  const terms = termsByYear[currentAcademicYear] || legacyTerms || DEFAULT_TERMS;
  const defaultTerm = inferTermFromMonth(terms);

  return {
    currentAcademicYear,
    academicYears,
    terms,
    termsByYear,
    defaultTerm,
  };
}

module.exports = {
  loadSchoolAcademicCalendar,
  inferTermFromMonth,
  inferAcademicYearFromDate,
  parseTermsJson,
  DEFAULT_TERMS,
};
