/**
 * DOS Student Marks Reports — snapshot-based report generation
 * Fast downloads: compute once, store JSON + PDF on disk.
 */
const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const PDFDocument = require('pdfkit');
const archiver = require('archiver');
const { promisePool } = require('../config/database');
const { requireRole } = require('../middleware/deoAuth');
const { normalizeGradebookLabel, sqlNormLabelEquals } = require('../utils/gradebookLabels');
const {
  ensureSchoolMarksAcademicTables,
  seedDefaultAssessmentTypesIfEmpty,
} = require('../utils/schoolMarksAcademicSchema');
const { generateModernSnapshotPdf } = require('../utils/reportCardPdfKit');
const { ensureSchoolGradebookSchema } = require('../utils/schoolGradebookSchema');
const { getSchoolAcademicHealthWeights } = require('../utils/academicHealthSchema');
const {
  bulkFetchAssessmentTrends,
  computeAcademicHealthScore,
  computeSuccessScore,
  fetchBehaviourPercent,
  fetchDisciplineMarksInfo,
  fetchBlendedAttendancePercent,
  fetchStudentCompetencyAverage,
} = require('../utils/studentReportMetrics');
const { listCompetencyCategories } = require('../utils/competencySchema');
const {
  getSchoolGradingScale,
  gradeFromPercent,
  gradeRemark,
} = require('../utils/schoolGradingSchema');

const router = express.Router();
const DOS_ROLES = ['DOS', 'SCHOOL_ADMIN', 'SCHOOL_MANAGER'];
const REPORT_TYPES = ['mid_term', 'final', 'annual'];
const ANNUAL_TERM_LABEL = 'Annual';
const ANNUAL_TERMS = ['Term 1', 'Term 2', 'Term 3'];
const REPORT_STATUSES = ['draft', 'generated', 'pending_approval', 'ready', 'published'];

let tablesReady = false;
const PDF_DIR = path.join(__dirname, '..', 'uploads', 'student-reports');
const STUDENT_PHOTO_DIR = path.join(__dirname, '..', 'uploads', 'student-profile-photos');

function resolveSchoolId(req) {
  return req.query?.school_id || req.body?.school_id || req.session?.school_id
    || req.session?.user?.school_id || req.session?.user?.school?.id || null;
}

function resolveUserId(req) {
  return req.session?.user?.id || req.session?.user_id || null;
}

function letterGrade(pct, gradingScale = null) {
  return gradeFromPercent(pct, gradingScale);
}

function isFinalSlug(slug) {
  return /final|exam|end[_\-.]?term|end.of.year|eoy/i.test(String(slug || ''));
}

function isMidSlug(slug) {
  return /mid|cat|continuous|homework|quiz|assignment|project|practical/i.test(String(slug || ''));
}

function isLessonSlug(slug) {
  return !isFinalSlug(slug);
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

function buildAssessmentsFromSlugBuckets(slugBuckets) {
  const assessments = {};
  for (const [slug, b] of Object.entries(slugBuckets || {})) {
    if (!b || b.max <= 0) continue;
    assessments[slug] = {
      score: Math.round(Number(b.sum) * 100) / 100,
      max: Number(b.max),
      percent: Math.round((Number(b.sum) / Number(b.max)) * 1000) / 10,
    };
  }
  return assessments;
}

function buildAssessmentColumnsMeta(typeWeights, reportType) {
  let cols = (typeWeights || []).map((t) => {
    const slug = String(t.slug || '').toLowerCase();
    return {
      slug,
      name: t.name,
      short_label: ASSESSMENT_SHORT_LABELS[slug] || String(t.name || slug).slice(0, 8),
      weight_percent: Number(t.weight_percent) || 0,
      is_final: isFinalSlug(slug),
    };
  });
  if (reportType === 'mid_term') {
    cols = cols.filter((c) => !c.is_final);
  }
  return cols;
}

function avgOfPercents(slugPercents, slugs) {
  const vals = slugs.map((s) => slugPercents[s]).filter((v) => v != null && Number.isFinite(v));
  return vals.length
    ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10
    : null;
}

function weightedAverageFromSlugs(slugPercents, typeWeights, { includeFinal = true } = {}) {
  if (!typeWeights?.length) return null;
  let weighted = 0;
  let usedWeight = 0;
  for (const t of typeWeights) {
    const slug = String(t.slug || '').toLowerCase();
    if (!includeFinal && isFinalSlug(slug)) continue;
    const pct = slugPercents[slug];
    if (pct == null) continue;
    const w = Number(t.weight_percent) || 0;
    if (w <= 0) continue;
    weighted += (pct * w) / 100;
    usedWeight += w;
  }
  if (usedWeight <= 0) return null;
  return Math.round(weighted * 10) / 10;
}

async function ensureReportTables() {
  if (tablesReady) return;
  await ensureSchoolMarksAcademicTables();
  await ensureSchoolGradebookSchema();
  await fs.ensureDir(PDF_DIR);

  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS dos_report_batches (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      school_id INT UNSIGNED NOT NULL,
      academic_year VARCHAR(32) NOT NULL,
      term VARCHAR(32) NOT NULL,
      report_type VARCHAR(20) NOT NULL,
      class_name VARCHAR(120) NULL,
      status VARCHAR(24) NOT NULL DEFAULT 'generated',
      total_students INT UNSIGNED NOT NULL DEFAULT 0,
      generated_count INT UNSIGNED NOT NULL DEFAULT 0,
      school_average DECIMAL(6,2) NULL,
      class_average DECIMAL(6,2) NULL,
      created_by_user_id INT UNSIGNED NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      published_at DATETIME NULL,
      INDEX idx_batch_school (school_id, academic_year, term, report_type)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS dos_student_report_snapshots (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      batch_id INT UNSIGNED NOT NULL,
      school_id INT UNSIGNED NOT NULL,
      student_id INT UNSIGNED NOT NULL,
      academic_year VARCHAR(32) NOT NULL,
      term VARCHAR(32) NOT NULL,
      report_type VARCHAR(20) NOT NULL,
      class_name VARCHAR(120) NOT NULL,
      status VARCHAR(24) NOT NULL DEFAULT 'generated',
      snapshot_json LONGTEXT NOT NULL,
      pdf_path VARCHAR(500) NULL,
      overall_average DECIMAL(6,2) NULL,
      overall_grade VARCHAR(4) NULL,
      class_position INT UNSIGNED NULL,
      academic_health_score DECIMAL(6,2) NULL,
      generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      published_at DATETIME NULL,
      UNIQUE KEY uq_report_student_scope (school_id, student_id, academic_year, term, report_type),
      INDEX idx_snapshot_batch (batch_id),
      INDEX idx_snapshot_status (school_id, status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  tablesReady = true;
}

async function getCalendar(schoolId) {
  let registry = [];
  try {
    const [rows] = await promisePool.query(
      `SELECT academic_year, active_terms_json, is_current
       FROM school_academic_year_registry
       WHERE school_id = ?
       ORDER BY is_current DESC, academic_year DESC`,
      [schoolId],
    );
    registry = (rows || []).map((row) => {
      let terms = ['Term 1', 'Term 2', 'Term 3'];
      try {
        const parsed = row?.active_terms_json
          ? (Array.isArray(row.active_terms_json) ? row.active_terms_json : JSON.parse(row.active_terms_json))
          : null;
        if (Array.isArray(parsed) && parsed.length) {
          terms = parsed.map((t) => String(t).trim()).filter(Boolean);
        }
      } catch (_) { /* ignore */ }
      return {
        academic_year: String(row.academic_year || '').trim(),
        terms,
        active_terms: terms,
        is_current: Number(row.is_current) === 1,
      };
    }).filter((r) => r.academic_year);
  } catch (_) { /* table may not exist yet */ }

  if (!registry.length) {
    const [legacy] = await promisePool.query(
      `SELECT current_academic_year, active_terms_json FROM school_academic_settings WHERE school_id = ? LIMIT 1`,
      [schoolId],
    ).catch(() => [[], []]);
    const row = legacy[0];
    let terms = ['Term 1', 'Term 2', 'Term 3'];
    try {
      const parsed = row?.active_terms_json
        ? (Array.isArray(row.active_terms_json) ? row.active_terms_json : JSON.parse(row.active_terms_json))
        : null;
      if (Array.isArray(parsed) && parsed.length) terms = parsed.map((t) => String(t).trim()).filter(Boolean);
    } catch (_) { /* ignore */ }
    const year = String(row?.current_academic_year || '').trim() || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
    registry = [{ academic_year: year, terms, active_terms: terms, is_current: true }];
  }

  const current = registry.find((r) => r.is_current) || registry[0];
  return {
    academic_year: current.academic_year,
    terms: current.terms,
    academic_years: registry.map((r) => r.academic_year),
    registry,
  };
}

/**
 * Mid-term column: lesson assessment percents (display buckets).
 * Final column: end-term / final exam percent only.
 * Mid-term report average: DOS-weighted lesson marks (excludes final exam slugs).
 * Final report average: weighted term mark (lessons + final exam using school assessment weights).
 */
function subjectAverageFromSlugs(slugPercents, reportType, typeWeights = [], gradingScale = null) {
  const lessonSlugs = Object.keys(slugPercents).filter((s) => isLessonSlug(s));
  const finalSlugs = Object.keys(slugPercents).filter((s) => isFinalSlug(s));

  const mid = avgOfPercents(slugPercents, lessonSlugs);
  const fin = avgOfPercents(slugPercents, finalSlugs);

  let average;
  if (reportType === 'mid_term') {
    const weightedMid = weightedAverageFromSlugs(slugPercents, typeWeights, { includeFinal: false });
    average = weightedMid ?? mid;
  } else {
    const weighted = weightedAverageFromSlugs(slugPercents, typeWeights, { includeFinal: true });
    if (weighted != null) {
      average = weighted;
    } else if (mid != null && fin != null) {
      average = Math.round((mid * 0.75 + fin * 0.25) * 10) / 10;
    } else {
      average = fin ?? mid;
    }
  }

  const grade = letterGrade(average, gradingScale);
  return {
    mid_term: mid,
    final: fin,
    average,
    grade,
    grade_remark: gradeRemark(grade, gradingScale),
    slugPercents,
  };
}

async function bulkFetchMarksTree(schoolId, className, studentIds, { academicYear = null, term = null } = {}) {
  if (!studentIds.length) return {};
  const cn = normalizeGradebookLabel(className);
  let sql = `SELECT m.student_id, m.score_obtained, m.mark_code, a.max_score, a.column_slug, a.subject_name
     FROM academic_marks m
     INNER JOIN academic_assessments a ON a.id = m.assessment_id AND a.school_id = m.school_id
     WHERE m.school_id = ? AND m.student_id IN (?)
       AND (${sqlNormLabelEquals('a.class_name')})`;
  const params = [schoolId, studentIds, cn];
  if (academicYear) {
    sql += ' AND TRIM(COALESCE(a.academic_year, \'\')) = ?';
    params.push(String(academicYear).trim());
  }
  if (term) {
    sql += ' AND TRIM(COALESCE(a.term, \'\')) = ?';
    params.push(String(term).trim());
  }
  const [marksRows] = await promisePool.query(sql, params);
  const tree = {};
  for (const m of marksRows) {
    if (m.mark_code) continue;
    const sid = m.student_id;
    const subj = normalizeGradebookLabel(m.subject_name);
    const slug = String(m.column_slug || 'other').toLowerCase();
    if (!tree[sid]) tree[sid] = {};
    if (!tree[sid][subj]) tree[sid][subj] = {};
    if (!tree[sid][subj][slug]) tree[sid][subj][slug] = { sum: 0, max: 0 };
    tree[sid][subj][slug].sum += Number(m.score_obtained) || 0;
    tree[sid][subj][slug].max += Number(m.max_score) || 0;
  }
  return tree;
}

function subjectRowsFromTree(studentId, subjects, tree, reportType, extraNames, typeWeights = [], assessmentTrends = null, gradingScale = null) {
  const rows = [];
  for (const subj of subjects) {
    const slugs = tree[studentId]?.[subj] || {};
    const slugPercents = {};
    for (const [slug, b] of Object.entries(slugs)) {
      if (b.max > 0) slugPercents[slug] = Math.round((b.sum / b.max) * 1000) / 10;
    }
    const assessments = buildAssessmentsFromSlugBuckets(slugs);
    const sm = subjectAverageFromSlugs(slugPercents, reportType, typeWeights, gradingScale);
    rows.push({
      subject_name: subj,
      mid_term: sm.mid_term,
      final: sm.final,
      average: sm.average,
      grade: sm.grade,
      grade_remark: sm.grade_remark,
      assessments,
      slugPercents: sm.slugPercents,
      assessment_trends: assessmentTrends?.[studentId]?.[subj] || {},
      is_extra_activity: extraNames ? isExtraActivitySubject(subj, extraNames) : false,
    });
  }
  return rows;
}

async function bulkComputeClassAverages(schoolId, className, reportType, {
  includeExtraActivities = false,
  academicYear = null,
  term = null,
} = {}) {
  const students = await fetchStudents(schoolId, className);
  const extraNames = await fetchExtraActivityNameSet(schoolId);
  const subjects = await fetchClassSubjects(schoolId, className, { includeExtraActivities });
  const [typeWeights, gradingScale] = await Promise.all([
    fetchAssessmentTypes(schoolId),
    getSchoolGradingScale(schoolId),
  ]);
  const studentIds = students.map((s) => s.id);
  const tree = await bulkFetchMarksTree(schoolId, className, studentIds, { academicYear, term });
  const assessmentTrends = await bulkFetchAssessmentTrends(schoolId, className, studentIds, { academicYear, term });

  const averages = students.map((s) => {
    const subjectRows = subjectRowsFromTree(
      s.id, subjects, tree, reportType, extraNames, typeWeights, assessmentTrends, gradingScale,
    );
    const scored = subjectRows.filter((r) => r.average != null);
    const overall_average = scored.length
      ? Math.round((scored.reduce((a, b) => a + b.average, 0) / scored.length) * 10) / 10
      : null;
    return { student_id: s.id, overall_average, subjectRows };
  });

  return {
    students, subjects, averages, marksTree: tree, extraNames, assessmentTrends, typeWeights, gradingScale,
  };
}

async function fetchAssessmentTypes(schoolId) {
  await seedDefaultAssessmentTypesIfEmpty(schoolId);
  const [rows] = await promisePool.query(
    `SELECT id, name, slug, weight_percent, sort_order
     FROM school_assessment_types
     WHERE school_id = ? AND is_active = 1 AND school_level IN ('ALL')
     ORDER BY sort_order ASC`,
    [schoolId],
  );
  return rows;
}

async function fetchExtraActivityNameSet(schoolId) {
  const names = new Set();
  try {
    const [eaRows] = await promisePool.query(
      `SELECT DISTINCT activity_name FROM timetable_extra_activities WHERE school_id = ?`,
      [schoolId],
    );
    for (const r of eaRows || []) {
      const n = normalizeGradebookLabel(r.activity_name).toLowerCase();
      if (n) names.add(n);
    }
    const [ttRows] = await promisePool.query(
      `SELECT DISTINCT subject_name FROM academic_timetables
       WHERE school_id = ? AND extra_activity_id IS NOT NULL AND TRIM(subject_name) <> ''`,
      [schoolId],
    );
    for (const r of ttRows || []) {
      const n = normalizeGradebookLabel(r.subject_name).toLowerCase();
      if (n) names.add(n);
    }
    const [catRows] = await promisePool.query(
      `SELECT DISTINCT name FROM school_subjects
       WHERE school_id = ? AND is_active = 1
         AND LOWER(TRIM(category)) IN ('extra activity', 'extra-activity', 'extra activities', 'extracurricular')`,
      [schoolId],
    );
    for (const r of catRows || []) {
      const n = normalizeGradebookLabel(r.name).toLowerCase();
      if (n) names.add(n);
    }
  } catch (_) { /* tables may not exist */ }
  return names;
}

function isExtraActivitySubject(subjectName, extraNames) {
  return extraNames.has(normalizeGradebookLabel(subjectName).toLowerCase());
}

function filterSubjectsList(subjects, extraNames, includeExtraActivities) {
  if (includeExtraActivities) return subjects;
  return subjects.filter((s) => !isExtraActivitySubject(s, extraNames));
}

function analyzeSubjectPerformance(subjectRows) {
  const academic = subjectRows.filter((s) => !s.is_extra_activity);
  const scored = academic.filter((s) => s.average != null);
  const sorted = [...scored].sort((a, b) => b.average - a.average);

  const strong = scored.filter((s) => s.average >= 75).map((s) => s.subject_name);
  const weakByMark = scored.filter((s) => s.average < 55).map((s) => s.subject_name);
  const bottomWeak = sorted.slice(-2).filter((s) => s.average < 65).map((s) => s.subject_name);
  const weak = [...new Set([...weakByMark, ...bottomWeak])];

  return { strong_subjects: strong, weak_subjects: weak };
}

const SQL_SCHOOL_BRANDING = `SELECT school_name, logo_url, full_address AS address, phone, email,
  province, district, sector, cell, village, school_code,
  head_teacher_name, deputy_head_name, head_signature_url, school_stamp_url
FROM schools WHERE id = ? LIMIT 1`;

function buildPublicReportUrl(snapshotId) {
  // Public reports live on the main Babyeyi site (no /pro prefix) — same pattern as /v/:studentId QR links.
  const base = String(
    process.env.PUBLIC_REPORT_URL ||
    process.env.FRONTEND_URL ||
    'http://localhost:5173',
  ).replace(/\/+$/, '');
  return `${base}/student-mark-report/${snapshotId}`;
}

async function fetchSchoolBrandingRow(schoolId) {
  const [rows] = await promisePool.query(SQL_SCHOOL_BRANDING, [schoolId]).catch(() => [[]]);
  return rows[0] || null;
}

async function fetchClassTeacherName(schoolId, className, academicYear) {
  const cn = normalizeGradebookLabel(className);
  if (!cn) return null;
  const params = [schoolId, cn];
  let yearClause = '';
  if (academicYear) {
    yearClause = ' AND (cta.academic_year = ? OR cta.academic_year IS NULL OR TRIM(cta.academic_year) = \'\')';
    params.push(String(academicYear).trim());
  }
  const [rows] = await promisePool.query(
    `SELECT TRIM(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))) AS teacher_name
     FROM class_teacher_assignments cta
     INNER JOIN users u ON u.id = cta.teacher_user_id AND u.deleted_at IS NULL
     WHERE cta.school_id = ? AND (${sqlNormLabelEquals('cta.class_name')})${yearClause}
     ORDER BY cta.created_at DESC LIMIT 1`,
    params,
  ).catch(() => [[]]);
  const name = rows[0]?.teacher_name?.trim();
  return name || null;
}

function applySnapshotQrData(snapshot, snapshotId) {
  const fixed = { ...snapshot };
  if (!fixed.qr_data || isLegacyQrData(fixed.qr_data)) {
    fixed.qr_data = buildReportQrData(snapshotId);
  }
  fixed.snapshot_id = snapshotId;
  return fixed;
}

function isLegacyQrData(value) {
  if (!value || typeof value !== 'string') return false;
  const trimmed = value.trim();
  return trimmed.startsWith('{') && trimmed.includes('babyeyi_student_report');
}

function buildReportQrData(snapshotId) {
  if (snapshotId) return buildPublicReportUrl(snapshotId);
  return null;
}

async function fetchClassSubjects(schoolId, className, { includeExtraActivities = false } = {}) {
  const cn = normalizeGradebookLabel(className);
  const [manual] = await promisePool.query(
    `SELECT ss.name AS subject_name, ss.category
     FROM school_class_subjects scs
     INNER JOIN school_subjects ss ON ss.id = scs.subject_id AND ss.school_id = scs.school_id
     WHERE scs.school_id = ? AND (${sqlNormLabelEquals('scs.class_name')})
     ORDER BY ss.name ASC`,
    [schoolId, cn],
  );
  const extraNames = await fetchExtraActivityNameSet(schoolId);
  if (manual.length) {
    const names = manual
      .filter((r) => {
        const cat = String(r.category || '').toLowerCase();
        const isExtraCat = ['extra activity', 'extra-activity', 'extra activities', 'extracurricular'].includes(cat);
        if (isExtraCat && !includeExtraActivities) return false;
        return includeExtraActivities || !isExtraActivitySubject(r.subject_name, extraNames);
      })
      .map((r) => normalizeGradebookLabel(r.subject_name))
      .filter(Boolean);
    return names;
  }
  const [tt] = await promisePool.query(
    `SELECT DISTINCT subject_name, extra_activity_id FROM academic_timetables
     WHERE school_id = ? AND (${sqlNormLabelEquals('class_name')}) AND TRIM(subject_name) <> ''
     ORDER BY subject_name`,
    [schoolId, cn],
  );
  const names = tt
    .filter((r) => includeExtraActivities || !r.extra_activity_id)
    .map((r) => normalizeGradebookLabel(r.subject_name))
    .filter(Boolean);
  return filterSubjectsList(names, extraNames, includeExtraActivities);
}

function studentPhotoUrl(filename) {
  if (!filename) return null;
  return `/uploads/student-profile-photos/${String(filename).trim()}`;
}

function photoFilenameFromUrl(photoUrl) {
  if (!photoUrl) return null;
  const base = path.basename(String(photoUrl).trim());
  return /^[a-zA-Z0-9._-]+$/.test(base) ? base : null;
}

function studentPhotoFileExists(filename) {
  if (!filename) return false;
  const safe = path.basename(String(filename));
  if (!/^[a-zA-Z0-9._-]+$/.test(safe)) return false;
  return fs.existsSync(path.join(STUDENT_PHOTO_DIR, safe));
}

/** Prefer live students.student_photo; fall back to cached snapshot URL only if file exists on disk. */
async function resolveLiveStudentPhotoUrl(schoolId, studentId, cachedPhotoUrl = null) {
  if (!schoolId || !studentId) return null;
  try {
    const [[row]] = await promisePool.query(
      'SELECT student_photo FROM students WHERE id = ? AND school_id = ? LIMIT 1',
      [Number(studentId), Number(schoolId)],
    );
    const live = row?.student_photo ? String(row.student_photo).trim() : '';
    if (live && studentPhotoFileExists(live)) {
      return studentPhotoUrl(live);
    }
    const cached = photoFilenameFromUrl(cachedPhotoUrl);
    if (cached && studentPhotoFileExists(cached)) {
      return studentPhotoUrl(cached);
    }
  } catch (_) { /* ignore */ }
  return null;
}

async function hydrateSnapshotPhoto(snapshot, schoolId, studentId) {
  if (!snapshot) return snapshot;
  const photo_url = await resolveLiveStudentPhotoUrl(schoolId, studentId, snapshot.photo_url);
  if (photo_url === snapshot.photo_url) return snapshot;
  return { ...snapshot, photo_url };
}

async function fetchStudents(schoolId, className, studentId = null) {
  const cn = normalizeGradebookLabel(className);
  let sql = `SELECT id, student_uid, first_name, last_name, gender, class_name, student_photo
             FROM students WHERE school_id = ? AND (${sqlNormLabelEquals('class_name')})`;
  const params = [schoolId, cn];
  if (studentId) {
    sql += ' AND id = ?';
    params.push(Number(studentId));
  }
  sql += ' ORDER BY first_name ASC, last_name ASC';
  const [rows] = await promisePool.query(sql, params);
  return rows;
}

async function fetchSubjectMarks(schoolId, className, subjectName, studentId, reportType, {
  academicYear = null, term = null, typeWeights = [], gradingScale = null,
} = {}) {
  let sql = `SELECT m.score_obtained, m.mark_code, a.max_score, a.column_slug, a.assessment_name
     FROM academic_marks m
     INNER JOIN academic_assessments a ON a.id = m.assessment_id AND a.school_id = m.school_id
     WHERE m.school_id = ? AND m.student_id = ?
       AND (${sqlNormLabelEquals('a.class_name')})
       AND (${sqlNormLabelEquals('a.subject_name')})`;
  const params = [schoolId, studentId, className, subjectName];
  if (academicYear) {
    sql += ' AND TRIM(COALESCE(a.academic_year, \'\')) = ?';
    params.push(String(academicYear).trim());
  }
  if (term) {
    sql += ' AND TRIM(COALESCE(a.term, \'\')) = ?';
    params.push(String(term).trim());
  }
  const [rows] = await promisePool.query(sql, params);

  const bySlug = {};
  for (const r of rows) {
    if (r.mark_code) continue;
    const slug = String(r.column_slug || 'other').toLowerCase();
    if (!bySlug[slug]) bySlug[slug] = { sum: 0, max: 0 };
    bySlug[slug].sum += Number(r.score_obtained) || 0;
    bySlug[slug].max += Number(r.max_score) || 0;
  }

  const slugPercents = {};
  for (const [slug, b] of Object.entries(bySlug)) {
    if (b.max > 0) slugPercents[slug] = Math.round((b.sum / b.max) * 1000) / 10;
  }

  if (!typeWeights.length) {
    typeWeights = await fetchAssessmentTypes(schoolId);
  }
  const assessments = buildAssessmentsFromSlugBuckets(bySlug);
  return { ...subjectAverageFromSlugs(slugPercents, reportType, typeWeights, gradingScale), assessments };
}

async function fetchAttendancePercent(schoolId, studentId) {
  try {
    const [rows] = await promisePool.query(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN status IN ('present','late') THEN 1 ELSE 0 END) AS present
       FROM attendance_student
       WHERE school_id = ? AND student_id = ?`,
      [schoolId, studentId],
    );
    const total = Number(rows[0]?.total) || 0;
    const present = Number(rows[0]?.present) || 0;
    if (total > 0) return Math.round((present / total) * 1000) / 10;
  } catch (_) { /* table may not exist */ }
  return null;
}

async function fetchTermTrends(schoolId, studentId, academicYear, currentTerm) {
  const terms = ['Term 1', 'Term 2', 'Term 3'];
  try {
    const [rows] = await promisePool.query(
      `SELECT term, overall_average FROM dos_student_report_snapshots
       WHERE school_id = ? AND student_id = ? AND academic_year = ?
         AND overall_average IS NOT NULL
       ORDER BY FIELD(term, 'Term 1', 'Term 2', 'Term 3')`,
      [schoolId, studentId, academicYear],
    );
    const map = {};
    for (const r of rows) map[r.term] = Number(r.overall_average);
    return terms.map((t) => ({ term: t, average: map[t] ?? null })).filter((x) => x.average != null);
  } catch (_) {
    return [];
  }
}

function buildBadges(ctx) {
  const badges = [];
  if (ctx.class_position && ctx.class_size && ctx.class_position <= 10) badges.push({ icon: '🏆', label: 'Top 10 Student' });
  if (ctx.attendance >= 95) badges.push({ icon: '⭐', label: 'Excellent Attendance' });
  if (ctx.most_improved) badges.push({ icon: '📈', label: 'Most Improved Student' });
  const topSubject = (ctx.subjects || []).find((s) => s.average >= 85);
  if (topSubject) badges.push({ icon: '🎯', label: `${topSubject.subject_name} Champion` });
  return badges;
}

function buildRecommendations(ctx) {
  const lines = [];
  const strong = (ctx.subjects || []).filter((s) => s.average >= 80).map((s) => s.subject_name);
  const weak = (ctx.subjects || []).filter((s) => s.average != null && s.average < 55).map((s) => s.subject_name);
  if (strong.length >= 2) lines.push('Student demonstrates strong analytical skills across multiple subjects.');
  for (const w of weak.slice(0, 2)) lines.push(`Additional support is recommended in ${w}.`);
  if (strong.includes('Mathematics') || strong.some((s) => /math/i.test(s))) {
    lines.push('Eligible for advanced mathematics enrichment.');
  }
  if (!lines.length) lines.push('Continue consistent study habits and regular assessment participation.');
  return lines;
}

async function buildCompetenciesFromDb(schoolId, studentId, academicYear, term) {
  const categories = await listCompetencyCategories(schoolId);
  if (!categories.length) return [];
  const [rows] = await promisePool.query(
    `SELECT category_id, rating FROM student_competency_ratings
     WHERE school_id = ? AND student_id = ? AND academic_year = ? AND term = ?`,
    [schoolId, studentId, academicYear, term],
  );
  const ratingByCat = {};
  for (const r of rows) ratingByCat[r.category_id] = r.rating;
  return categories.map((c) => ({
    name: c.name,
    rating: ratingByCat[c.id] || 'Good',
  }));
}

async function computeStudentSnapshot(schoolId, student, opts) {
  const {
    reportType, academicYear, term, subjects, classSize, rankings, marksTree, extraNames,
    classTeacherName = null, assessmentTrends = null, typeWeights: optsTypeWeights = null,
    gradingScale: optsGradingScale = null, healthWeights: optsHealthWeights = null,
  } = opts;
  const className = normalizeGradebookLabel(student.class_name);
  const name = `${student.first_name || ''} ${student.last_name || ''}`.trim();

  let subjectRows = [];
  let homeworkFilled = 0;
  let homeworkTotal = 0;
  let assessFilled = 0;
  let assessTotal = 0;

  const typeWeights = optsTypeWeights || await fetchAssessmentTypes(schoolId);
  const gradingScale = optsGradingScale || await getSchoolGradingScale(schoolId);

  if (marksTree) {
    subjectRows = subjectRowsFromTree(
      student.id, subjects, marksTree, reportType, extraNames, typeWeights, assessmentTrends, gradingScale,
    );
    for (const sm of subjectRows) {
      const hw = Object.entries(sm.slugPercents || {}).filter(([s]) => /homework|assignment/i.test(s));
      homeworkTotal += hw.length || 1;
      homeworkFilled += hw.filter(([, v]) => v != null).length;
      assessTotal += Object.keys(sm.slugPercents || {}).length || 1;
      assessFilled += Object.values(sm.slugPercents || {}).filter((v) => v != null).length;
    }
  } else {
    for (const subj of subjects) {
      const sm = await fetchSubjectMarks(schoolId, className, subj, student.id, reportType, {
        academicYear, term, typeWeights, gradingScale,
      });
      subjectRows.push({
        subject_name: subj,
        mid_term: sm.mid_term,
        final: sm.final,
        average: sm.average,
        grade: sm.grade,
        grade_remark: sm.grade_remark,
        assessments: sm.assessments || {},
        slugPercents: sm.slugPercents || {},
        is_extra_activity: extraNames ? isExtraActivitySubject(subj, extraNames) : false,
      });
      const hw = Object.entries(sm.slugPercents || {}).filter(([s]) => /homework|assignment/i.test(s));
      homeworkTotal += hw.length || 1;
      homeworkFilled += hw.filter(([, v]) => v != null).length;
      assessTotal += Object.keys(sm.slugPercents || {}).length || 1;
      assessFilled += Object.values(sm.slugPercents || {}).filter((v) => v != null).length;
    }
  }

  const scored = subjectRows.filter((s) => s.average != null);
  const overall_average = scored.length
    ? Math.round((scored.reduce((a, b) => a + b.average, 0) / scored.length) * 10) / 10
    : null;

  const [attendanceRaw, disciplineInfo, competenciesAvg] = await Promise.all([
    fetchBlendedAttendancePercent(schoolId, student.id),
    fetchDisciplineMarksInfo(schoolId, student.id),
    fetchStudentCompetencyAverage(schoolId, student.id, academicYear, term),
  ]);
  const attendance = attendanceRaw ?? 0;
  const behaviour = disciplineInfo.behaviour_percent ?? 0;
  const trend = await fetchTermTrends(schoolId, student.id, academicYear, term);
  if (overall_average != null && !trend.find((t) => t.term === term)) {
    trend.push({ term, average: overall_average });
  }

  const rank = rankings[student.id] || {};
  const { strong_subjects, weak_subjects } = analyzeSubjectPerformance(subjectRows);

  const homework_completion = homeworkTotal ? Math.round((homeworkFilled / homeworkTotal) * 100) : 0;
  const assessment_participation = assessTotal ? Math.round((assessFilled / assessTotal) * 100) : 0;

  const ctx = {
    overall_average,
    class_position: rank.class_position,
    class_size: classSize,
    attendance,
    behaviour,
    subjects: subjectRows,
    most_improved: rank.most_improved,
    homework_completion,
    assessment_participation,
    competencies_avg: competenciesAvg ?? 0,
  };

  const competencies = await buildCompetenciesFromDb(schoolId, student.id, academicYear, term);
  const academic_health_score = computeAcademicHealthScore(ctx, optsHealthWeights);
  const success_score = computeSuccessScore(ctx);
  const overall_grade = letterGrade(overall_average, gradingScale);
  const overall_grade_remark = gradeRemark(overall_grade, gradingScale);

  const snapshot = {
    student_id: student.id,
    student_uid: student.student_uid,
    name,
    photo_url: studentPhotoUrl(student.student_photo),
    class_name: className,
    academic_year: academicYear,
    term,
    report_type: reportType,
    overall_average,
    overall_grade,
    overall_grade_remark,
    grading_scale: gradingScale,
    class_position: rank.class_position,
    class_size: classSize,
    stream_position: rank.stream_position,
    stream_size: rank.stream_size,
    school_position: rank.school_position,
    school_size: rank.school_size,
    attendance_percent: attendance,
    behaviour_percent: behaviour,
    discipline_marks: disciplineInfo.discipline_marks,
    discipline_marks_max: disciplineInfo.discipline_marks_max,
    discipline_marks_min: disciplineInfo.discipline_marks_min,
    homework_completion_percent: homework_completion,
    assessment_participation_percent: assessment_participation,
    competencies_avg: competenciesAvg,
    assessment_columns: buildAssessmentColumnsMeta(typeWeights, reportType),
    subjects: subjectRows,
    performance_trend: trend,
    strong_subjects,
    weak_subjects,
    badges: buildBadges(ctx),
    recommendations: buildRecommendations({ subjects: subjectRows }),
    competencies,
    academic_health_score,
    success_score,
    class_teacher_name: classTeacherName || null,
    teacher_comment: '',
    dos_comment: '',
    parent_feedback: '',
    promotion_status: reportType === 'final'
      ? (overall_average >= 50 ? 'Promoted' : overall_average >= 40 ? 'Conditional Promotion' : 'Retained')
      : null,
    year_summary: reportType === 'final' ? {
      term_1: trend.find((t) => t.term === 'Term 1')?.average ?? null,
      term_2: trend.find((t) => t.term === 'Term 2')?.average ?? null,
      term_3: trend.find((t) => t.term === 'Term 3')?.average ?? null,
      annual_average: overall_average,
    } : null,
  };

  return snapshot;
}

function assignStandardCompetitionRanks(sortedItems, idKey = 'student_id', avgKey = 'overall_average') {
  const rankMap = {};
  let rank = 0;
  let prevAvg = null;
  for (let i = 0; i < sortedItems.length; i += 1) {
    const item = sortedItems[i];
    const avg = item[avgKey];
    if (avg == null || !Number.isFinite(Number(avg))) continue;
    if (prevAvg === null || Number(avg) !== Number(prevAvg)) {
      rank = i + 1;
      prevAvg = Number(avg);
    }
    rankMap[item[idKey]] = rank;
  }
  return rankMap;
}

function assignStandardCompetitionRanksByAverage(sortedItems, idKey = 'student_id', avgKey = 'average') {
  return assignStandardCompetitionRanks(sortedItems, idKey, avgKey);
}

async function computeClassRankings(schoolId, className, reportType, academicYear, term, { includeSchoolRankings = true, includeExtraActivities = false } = {}) {
  const {
    students, subjects, averages, marksTree, extraNames, assessmentTrends, typeWeights, gradingScale,
  } = await bulkComputeClassAverages(
    schoolId, className, reportType, { includeExtraActivities, academicYear, term },
  );

  const ranked = averages
    .filter((x) => x.overall_average != null)
    .sort((a, b) => b.overall_average - a.overall_average);

  const classRank = assignStandardCompetitionRanks(ranked);

  let schoolScores = ranked.map((r) => ({
    student_id: r.student_id,
    class_name: className,
    average: r.overall_average,
  }));

  if (includeSchoolRankings) {
    const [classRows] = await promisePool.query(
      `SELECT DISTINCT class_name FROM students WHERE school_id = ? AND TRIM(class_name) <> ''`,
      [schoolId],
    );
    schoolScores = [];
    for (const row of classRows) {
      const cn = normalizeGradebookLabel(row.class_name);
      if (!cn) continue;
      const { averages: classAvgs } = await bulkComputeClassAverages(schoolId, cn, reportType, {
        includeExtraActivities, academicYear, term,
      });
      for (const a of classAvgs) {
        if (a.overall_average != null) {
          schoolScores.push({ student_id: a.student_id, class_name: cn, average: a.overall_average });
        }
      }
    }
    schoolScores.sort((a, b) => b.average - a.average);
  }

  const schoolRank = assignStandardCompetitionRanksByAverage(schoolScores);

  const streamKey = (cn) => cn.split(/\s+/)[0] || cn;
  const streamGroups = {};
  for (const r of schoolScores) {
    const sk = streamKey(r.class_name);
    if (!streamGroups[sk]) streamGroups[sk] = [];
    streamGroups[sk].push(r);
  }
  const streamRank = {};
  for (const list of Object.values(streamGroups)) {
    list.sort((a, b) => b.average - a.average);
    const groupRanks = assignStandardCompetitionRanksByAverage(list);
    Object.assign(streamRank, groupRanks);
  }

  const rankings = {};
  for (const s of students) {
    rankings[s.id] = {
      class_position: classRank[s.id] || null,
      school_position: schoolRank[s.id] || null,
      school_size: schoolScores.length,
      stream_position: streamRank[s.id] || null,
      stream_size: streamGroups[streamKey(className)]?.length || schoolScores.length,
      most_improved: false,
    };
  }
  return {
    students, subjects, rankings, schoolScores, marksTree, extraNames, assessmentTrends, typeWeights, gradingScale,
  };
}

async function buildPreviewStats(schoolId, className, reportType, academicYear, term, { includeExtraActivities = false } = {}) {
  const { students, averages } = await bulkComputeClassAverages(schoolId, className, reportType, {
    includeExtraActivities, academicYear, term,
  });
  const avgs = averages.map((a) => a.overall_average).filter((v) => v != null);
  const atRisk = avgs.filter((v) => v < 50).length;

  return {
    class_average: avgs.length ? Math.round((avgs.reduce((a, b) => a + b, 0) / avgs.length) * 10) / 10 : null,
    highest: avgs.length ? Math.max(...avgs) : null,
    lowest: avgs.length ? Math.min(...avgs) : null,
    pass_rate: avgs.length ? Math.round((avgs.filter((v) => v >= 50).length / avgs.length) * 1000) / 10 : null,
    students_at_risk: atRisk,
    total_students: students.length,
    has_marks: avgs.length > 0,
  };
}

function pdfPathForSnapshot(schoolId, snapshotId) {
  return path.join(PDF_DIR, String(schoolId), `report-${snapshotId}-modern-v6.pdf`);
}

async function generateSnapshotPdf(snapshot, outPath, school = null) {
  return generateModernSnapshotPdf(snapshot, outPath, { school: school || snapshot.school || null });
}

async function buildSchoolAnalytics(schoolId, { academicYear, term, reportType = 'final', className = null }) {
  const [classRows] = await promisePool.query(
    `SELECT DISTINCT class_name FROM students WHERE school_id = ? AND TRIM(class_name) <> '' ORDER BY class_name`,
    [schoolId],
  );
  const allClasses = classRows.map((r) => normalizeGradebookLabel(r.class_name)).filter(Boolean);
  const targetClasses = className ? [normalizeGradebookLabel(className)] : allClasses;

  const classPerformance = [];
  const subjectAgg = {};
  const studentScores = [];
  let totalStudents = 0;

  for (const cn of targetClasses) {
    const { students, averages } = await bulkComputeClassAverages(schoolId, cn, reportType, { academicYear, term });
    const avgs = averages.map((a) => a.overall_average).filter((v) => v != null);
    const classAvg = avgs.length
      ? Math.round((avgs.reduce((a, b) => a + b, 0) / avgs.length) * 10) / 10
      : null;
    const passRate = avgs.length
      ? Math.round((avgs.filter((v) => v >= 50).length / avgs.length) * 1000) / 10
      : null;
    classPerformance.push({
      name: cn,
      average: classAvg,
      passRate,
      student_count: students.length,
      status: classAvg == null ? 'no_data' : classAvg >= 75 ? 'top' : classAvg >= 60 ? 'good' : 'attention',
    });
    totalStudents += students.length;

    for (const a of averages) {
      const stu = students.find((s) => s.id === a.student_id);
      if (stu && a.overall_average != null) {
        studentScores.push({
          student_id: a.student_id,
          name: `${stu.first_name || ''} ${stu.last_name || ''}`.trim(),
          class: cn,
          average: a.overall_average,
        });
      }
      for (const row of a.subjectRows || []) {
        if (row.average == null) continue;
        const subj = row.subject_name;
        if (!subjectAgg[subj]) subjectAgg[subj] = { sum: 0, count: 0 };
        subjectAgg[subj].sum += row.average;
        subjectAgg[subj].count += 1;
      }
    }
  }

  classPerformance.sort((a, b) => (b.average ?? 0) - (a.average ?? 0));
  classPerformance.forEach((c, i) => { c.rank = i + 1; });

  const subjectPerformance = Object.entries(subjectAgg).map(([subject, v]) => {
    const average = Math.round((v.sum / v.count) * 10) / 10;
    let level = 'medium';
    if (average < 55) level = 'critical';
    else if (average >= 75) level = 'good';
    return { subject, average, target: 65, level };
  }).sort((a, b) => a.average - b.average);

  studentScores.sort((a, b) => b.average - a.average);
  const schoolRankings = studentScores.slice(0, 50).map((s, i) => ({
    rank: i + 1,
    name: s.name,
    class: s.class,
    average: s.average,
    trend: 'stable',
  }));

  const atRiskStudents = studentScores
    .filter((s) => s.average < 50)
    .sort((a, b) => a.average - b.average)
    .slice(0, 50)
    .map((s) => ({
      student_id: s.student_id,
      name: s.name,
      class: s.class,
      average: s.average,
      risk: s.average < 40 ? 'Critical' : s.average < 45 ? 'High' : 'Medium',
      reason: s.average < 40 ? 'Below 40%' : s.average < 50 ? 'Below 50%' : 'Borderline pass',
      trend: 'declining',
      missing: 0,
    }));

  const allAvgs = studentScores.map((s) => s.average);
  const schoolAverage = allAvgs.length
    ? Math.round((allAvgs.reduce((a, b) => a + b, 0) / allAvgs.length) * 10) / 10
    : null;
  const passRate = allAvgs.length
    ? Math.round((allAvgs.filter((v) => v >= 50).length / allAvgs.length) * 1000) / 10
    : null;

  const terms = ['Term 1', 'Term 2', 'Term 3'];
  const termTrend = [];
  for (const t of terms) {
    const [snapRows] = await promisePool.query(
      `SELECT AVG(overall_average) AS avg_score
       FROM dos_student_report_snapshots
       WHERE school_id = ? AND academic_year = ? AND term = ? AND report_type = ?
         AND overall_average IS NOT NULL`,
      [schoolId, academicYear, t, reportType],
    );
    const avg = snapRows[0]?.avg_score != null ? Math.round(Number(snapRows[0].avg_score) * 10) / 10 : null;
    if (avg != null) {
      const [passRows] = await promisePool.query(
        `SELECT COUNT(*) AS total,
                SUM(CASE WHEN overall_average >= 50 THEN 1 ELSE 0 END) AS passed
         FROM dos_student_report_snapshots
         WHERE school_id = ? AND academic_year = ? AND term = ? AND report_type = ?
           AND overall_average IS NOT NULL`,
        [schoolId, academicYear, t, reportType],
      );
      const total = Number(passRows[0]?.total) || 0;
      const passed = Number(passRows[0]?.passed) || 0;
      termTrend.push({
        term: t,
        average: avg,
        passRate: total ? Math.round((passed / total) * 1000) / 10 : null,
      });
    }
  }

  const weakSubjects = subjectPerformance.filter((s) => s.average < 55).length;
  const topClasses = classPerformance.filter((c) => (c.average ?? 0) >= 75).length;

  const smartInsights = [];
  if (weakSubjects) {
    const worst = subjectPerformance[0];
    smartInsights.push({
      type: 'warning',
      text: `${weakSubjects} subject(s) below 55% average`,
      action: worst ? `Review ${worst.subject}` : 'View subjects',
    });
  }
  if (atRiskStudents.length) {
    smartInsights.push({
      type: 'error',
      text: `${atRiskStudents.length} students need urgent support`,
      action: 'Open at-risk list',
    });
  }
  if (schoolAverage != null && schoolAverage >= 70) {
    smartInsights.push({
      type: 'success',
      text: `School average at ${schoolAverage}% this term`,
      action: 'View performance trends',
    });
  }

  const examReadiness = classPerformance
    .filter((c) => c.average != null)
    .map((c) => ({
      class: c.name,
      readiness: c.average,
      status: c.average >= 70 ? 'Ready' : c.average >= 55 ? 'Risk' : 'Critical',
      label: c.average >= 70 ? 'On track' : c.average >= 55 ? 'Needs revision plan' : 'Urgent support needed',
    }));

  let teacherPerformance = [];
  try {
    const [taRows] = await promisePool.query(
      `SELECT ta.class_name, ta.subject_name, u.first_name, u.last_name
       FROM teacher_assignments ta
       LEFT JOIN users u ON u.id = ta.teacher_user_id
       WHERE ta.school_id = ? AND ta.is_active = 1`,
      [schoolId],
    );
    const teacherMap = {};
    for (const ta of taRows || []) {
      const cn = normalizeGradebookLabel(ta.class_name);
      const subj = normalizeGradebookLabel(ta.subject_name);
      const key = `${cn}\0${subj}`;
      const name = `${ta.first_name || ''} ${ta.last_name || ''}`.trim() || 'Teacher';
      if (!teacherMap[key]) teacherMap[key] = { name, class_name: cn, subject_name: subj, scores: [] };
      const cp = classPerformance.find((c) => c.name === cn);
      if (cp?.average != null) teacherMap[key].scores.push(cp.average);
    }
    teacherPerformance = Object.values(teacherMap)
      .map((t) => {
        const average = t.scores.length
          ? Math.round((t.scores.reduce((a, b) => a + b, 0) / t.scores.length) * 10) / 10
          : null;
        return {
          name: t.name,
          subject: t.subject_name,
          classes: t.class_name,
          average,
          trend: 0,
        };
      })
      .filter((t) => t.average != null)
      .sort((a, b) => b.average - a.average)
      .slice(0, 30)
      .map((t, i) => ({ ...t, rank: i + 1 }));
  } catch (_) { /* teacher_assignments may not exist */ }

  return {
    school_kpis: {
      passRate,
      schoolAverage,
      totalStudents,
      atRiskStudents: atRiskStudents.length,
      topPerformingClasses: topClasses,
      weakSubjects,
      termLabel: `${term}, ${academicYear}`,
    },
    class_performance: classPerformance,
    subject_performance: subjectPerformance,
    teacher_performance: teacherPerformance,
    school_rankings: schoolRankings,
    at_risk_students: atRiskStudents,
    term_trend: termTrend,
    exam_readiness: examReadiness,
    smart_insights: smartInsights,
    live_alerts: smartInsights.slice(0, 4).map((s, i) => ({
      time: i === 0 ? 'Just now' : 'Today',
      message: s.text,
      severity: s.type === 'error' ? 'critical' : s.type === 'warning' ? 'warning' : 'info',
    })),
    comparative_terms: subjectPerformance.slice(0, 8).map((s) => ({
      subject: s.subject,
      change: 0,
      direction: s.level === 'critical' ? 'down' : 'up',
    })),
    decision_actions: [
      { label: 'Review at-risk students', count: atRiskStudents.length, urgent: atRiskStudents.length > 0 },
      { label: 'Flag weak subjects', count: weakSubjects, urgent: weakSubjects > 0 },
    ],
  };
}

// ── Routes ────────────────────────────────────────────────────

router.get('/dos/student-reports/analytics', requireRole(DOS_ROLES), async (req, res) => {
  try {
    await ensureReportTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'No school linked' });

    const calendar = await getCalendar(schoolId);
    const reportType = REPORT_TYPES.includes(req.query.report_type) ? req.query.report_type : 'final';
    const className = normalizeGradebookLabel(req.query.class_name) || null;
    const academicYear = String(req.query.academic_year || '').trim() || calendar.academic_year;
    const yearEntry = calendar.registry.find((r) => r.academic_year === academicYear) || calendar.registry[0];
    const term = String(req.query.term || '').trim() || yearEntry?.terms?.[0] || calendar.terms[0];

    const data = await buildSchoolAnalytics(schoolId, { academicYear, term, reportType, className });
    res.json({
      success: true,
      data: {
        filters: {
          academic_years: calendar.academic_years,
          terms: yearEntry?.terms || calendar.terms,
          report_types: REPORT_TYPES,
        },
        selected: { academic_year: academicYear, term, report_type: reportType, class_name: className },
        ...data,
      },
    });
  } catch (err) {
    console.error('GET /dos/student-reports/analytics:', err);
    res.status(500).json({ success: false, message: 'Failed to load analytics' });
  }
});

router.get('/dos/student-reports/dashboard', requireRole(DOS_ROLES), async (req, res) => {
  try {
    await ensureReportTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'No school linked' });

    const calendar = await getCalendar(schoolId);
    const reportType = REPORT_TYPES.includes(req.query.report_type) ? req.query.report_type : '';
    const className = normalizeGradebookLabel(req.query.class_name);
    const status = String(req.query.status || '').trim();
    const academicYear = String(req.query.academic_year || '').trim() || calendar.academic_year;
    const yearEntry = calendar.registry.find((r) => r.academic_year === academicYear) || calendar.registry[0];
    const term = reportType === 'annual'
      ? (String(req.query.term || '').trim() || ANNUAL_TERM_LABEL)
      : (String(req.query.term || '').trim() || yearEntry?.terms?.[0] || calendar.terms[0]);

    const [classRows] = await promisePool.query(
      `SELECT DISTINCT class_name FROM students WHERE school_id = ? AND TRIM(class_name) <> '' ORDER BY class_name`,
      [schoolId],
    );
    const classes = classRows.map((r) => normalizeGradebookLabel(r.class_name)).filter(Boolean);

    let batchSql = `SELECT COUNT(*) AS c FROM dos_student_report_snapshots WHERE school_id = ? AND academic_year = ? AND term = ?`;
    const batchParams = [schoolId, academicYear, term];
    if (reportType) { batchSql += ' AND report_type = ?'; batchParams.push(reportType); }
    if (className) { batchSql += ` AND (${sqlNormLabelEquals('class_name')})`; batchParams.push(className); }
    const [[{ c: totalGenerated }]] = await promisePool.query(batchSql, batchParams);

    let pubSql = batchSql + " AND status = 'published'";
    const [[{ c: published }]] = await promisePool.query(pubSql, batchParams);

    let readySql = batchSql + " AND status IN ('generated','ready')";
    const [[{ c: ready }]] = await promisePool.query(readySql, batchParams);

    let pendSql = batchSql + " AND status = 'pending_approval'";
    const [[{ c: pending }]] = await promisePool.query(pendSql, batchParams);

    const [avgRows] = await promisePool.query(
      `SELECT AVG(overall_average) AS avg_score FROM dos_student_report_snapshots
       WHERE school_id = ? AND academic_year = ? AND term = ? AND overall_average IS NOT NULL
       ${reportType ? 'AND report_type = ?' : ''}`,
      reportType ? [schoolId, academicYear, term, reportType] : [schoolId, academicYear, term],
    );
    const schoolAverage = avgRows[0]?.avg_score != null
      ? Math.round(Number(avgRows[0].avg_score) * 10) / 10 : null;

    const [topClass] = await promisePool.query(
      `SELECT class_name, AVG(overall_average) AS avg_score, COUNT(*) AS cnt
       FROM dos_student_report_snapshots
       WHERE school_id = ? AND academic_year = ? AND term = ? AND overall_average IS NOT NULL
       ${reportType ? 'AND report_type = ?' : ''}
       GROUP BY class_name ORDER BY avg_score DESC LIMIT 1`,
      reportType ? [schoolId, academicYear, term, reportType] : [schoolId, academicYear, term],
    );

    let listSql = `
      SELECT s.id, s.student_id, s.class_name, s.status, s.overall_average, s.overall_grade,
             s.class_position, s.academic_health_score, s.report_type, s.term, s.academic_year,
             st.student_uid, st.first_name, st.last_name
      FROM dos_student_report_snapshots s
      INNER JOIN students st ON st.id = s.student_id
      WHERE s.school_id = ? AND s.academic_year = ? AND s.term = ?`;
    const listParams = [schoolId, academicYear, term];
    if (reportType) { listSql += ' AND s.report_type = ?'; listParams.push(reportType); }
    if (className) { listSql += ` AND (${sqlNormLabelEquals('s.class_name')})`; listParams.push(className); }
    if (status) { listSql += ' AND s.status = ?'; listParams.push(status); }
    if (req.query.student_id) { listSql += ' AND s.student_id = ?'; listParams.push(Number(req.query.student_id)); }
    listSql += ' ORDER BY s.class_name ASC, s.class_position ASC, st.first_name ASC LIMIT 500';
    const [students] = await promisePool.query(listSql, listParams);

    let classStats = null;
    if (className) {
      classStats = await buildPreviewStats(schoolId, className, reportType || 'final', academicYear, term);
      const [genderRows] = await promisePool.query(
        `SELECT gender, COUNT(*) AS c FROM students
         WHERE school_id = ? AND (${sqlNormLabelEquals('class_name')})
         GROUP BY gender`,
        [schoolId, className],
      );
      let boys = 0;
      let girls = 0;
      for (const g of genderRows) {
        const label = String(g.gender || '').toLowerCase();
        if (label === 'm' || label === 'male' || label === 'boy') boys += Number(g.c) || 0;
        else if (label === 'f' || label === 'female' || label === 'girl') girls += Number(g.c) || 0;
      }
      classStats = { ...classStats, boys, girls };
    }

    const mappedStudents = students.map((r) => ({
          snapshot_id: r.id,
          student_id: r.student_id,
          student_uid: r.student_uid,
          name: `${r.first_name} ${r.last_name}`.trim(),
          class_name: r.class_name,
          report_type: r.report_type,
          status: r.status,
          average: r.overall_average != null ? Number(r.overall_average) : null,
          grade: r.overall_grade,
          position: r.class_position,
          health_score: r.academic_health_score != null ? Number(r.academic_health_score) : null,
        }));

    const withAvg = mappedStudents.filter((s) => s.average != null);
    const highestStudent = withAvg.length
      ? withAvg.reduce((a, b) => (b.average > a.average ? b : a)) : null;
    const lowestStudent = withAvg.length
      ? withAvg.reduce((a, b) => (b.average < a.average ? b : a)) : null;

    const schoolRow = await fetchSchoolBrandingRow(schoolId);

    res.json({
      success: true,
      data: {
        filters: {
          academic_years: calendar.academic_years,
          academic_years_registry: calendar.registry,
          terms: yearEntry?.terms || calendar.terms,
          classes,
          report_types: REPORT_TYPES,
        },
        selected: { academic_year: academicYear, term, report_type: reportType || null, class_name: className || null, status: status || null },
        school: schoolRow,
        kpis: {
          reports_generated: Number(totalGenerated) || 0,
          ready_for_publishing: Number(ready) || 0,
          pending_approval: Number(pending) || 0,
          published: Number(published) || 0,
          top_performing_class: topClass[0]?.class_name || null,
          school_average: schoolAverage,
          class_average: classStats?.class_average ?? null,
          highest_score: classStats?.highest ?? highestStudent?.average ?? null,
          highest_student_name: highestStudent?.name ?? null,
          lowest_score: classStats?.lowest ?? lowestStudent?.average ?? null,
          lowest_student_name: lowestStudent?.name ?? null,
          pass_rate: classStats?.pass_rate ?? null,
        },
        class_stats: classStats,
        students: mappedStudents,
      },
    });
  } catch (err) {
    console.error('GET /dos/student-reports/dashboard:', err);
    res.status(500).json({ success: false, message: 'Failed to load reports dashboard' });
  }
});

router.get('/dos/student-reports/preview', requireRole(DOS_ROLES), async (req, res) => {
  try {
    await ensureReportTables();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'No school linked' });
    const className = normalizeGradebookLabel(req.query.class_name);
    const reportType = REPORT_TYPES.includes(req.query.report_type) ? req.query.report_type : 'final';
    const calendar = await getCalendar(schoolId);
    const academicYear = String(req.query.academic_year || '').trim() || calendar.academic_year;
    const yearEntry = calendar.registry.find((r) => r.academic_year === academicYear) || calendar.registry[0];
    const term = reportType === 'annual'
      ? (String(req.query.term || '').trim() || ANNUAL_TERM_LABEL)
      : (String(req.query.term || '').trim() || yearEntry?.terms?.[0] || calendar.terms[0]);
    if (!className) return res.status(400).json({ success: false, message: 'class_name required' });
    const includeExtra = req.query.include_extra_activities === '1' || req.query.include_extra_activities === 'true';

    const stats = reportType === 'annual'
      ? await buildPreviewStats(schoolId, className, 'final', academicYear, 'Term 3', { includeExtraActivities: includeExtra })
      : await buildPreviewStats(schoolId, className, reportType, academicYear, term, { includeExtraActivities: includeExtra });
    res.json({ success: true, data: stats });
  } catch (err) {
    console.error('GET /dos/student-reports/preview:', err);
    res.status(500).json({
      success: false,
      message: err?.message || String(err) || 'Failed to preview statistics',
    });
  }
});

async function generateClassReportsBatch(schoolId, userId, {
  academicYear, term, reportType, className,
  studentIds = null, includeExtraActivities = false,
}) {
  await ensureReportTables();
  const schoolInfo = await fetchSchoolBrandingRow(schoolId);
  const classTeacherName = await fetchClassTeacherName(schoolId, className, academicYear);

  const {
    students, subjects, rankings, marksTree, extraNames, assessmentTrends, typeWeights, gradingScale,
  } = await computeClassRankings(
    schoolId, className, reportType, academicYear, term, { includeExtraActivities },
  );
  const healthWeights = await getSchoolAcademicHealthWeights(schoolId);
  const targetStudents = Array.isArray(studentIds) && studentIds.length
    ? students.filter((s) => studentIds.includes(s.id))
    : students;

  const [batchRes] = await promisePool.query(
    `INSERT INTO dos_report_batches
     (school_id, academic_year, term, report_type, class_name, status, total_students, created_by_user_id)
     VALUES (?, ?, ?, ?, ?, 'generated', ?, ?)`,
    [schoolId, academicYear, term, reportType, className, targetStudents.length, userId],
  );
  const batchId = batchRes.insertId;

  let generated = 0;
  const allAvgs = [];

  for (const student of targetStudents) {
    const snapshot = await computeStudentSnapshot(schoolId, student, {
      reportType, academicYear, term, subjects,
      classSize: students.length, rankings, marksTree, extraNames,
      classTeacherName, assessmentTrends, typeWeights, gradingScale, healthWeights,
    });
    snapshot.school = schoolInfo;
    snapshot.include_extra_activities = includeExtraActivities;
    if (snapshot.overall_average != null) allAvgs.push(snapshot.overall_average);

    await promisePool.query(
      `INSERT INTO dos_student_report_snapshots
       (batch_id, school_id, student_id, academic_year, term, report_type, class_name, status,
        snapshot_json, overall_average, overall_grade, class_position, academic_health_score)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'generated', ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         batch_id = VALUES(batch_id), snapshot_json = VALUES(snapshot_json),
         overall_average = VALUES(overall_average), overall_grade = VALUES(overall_grade),
         class_position = VALUES(class_position), academic_health_score = VALUES(academic_health_score),
         status = 'generated', generated_at = CURRENT_TIMESTAMP`,
      [
        batchId, schoolId, student.id, academicYear, term, reportType, className,
        '{}', snapshot.overall_average, snapshot.overall_grade,
        snapshot.class_position, snapshot.academic_health_score,
      ],
    );

    const [[snapRow]] = await promisePool.query(
      `SELECT id FROM dos_student_report_snapshots
       WHERE school_id = ? AND student_id = ? AND academic_year = ? AND term = ? AND report_type = ? LIMIT 1`,
      [schoolId, student.id, academicYear, term, reportType],
    );
    snapshot.qr_data = buildReportQrData(snapRow?.id);
    await promisePool.query(
      `UPDATE dos_student_report_snapshots SET snapshot_json = ?, pdf_path = NULL WHERE id = ?`,
      [JSON.stringify(snapshot), snapRow.id],
    );
    generated += 1;
  }

  const classAvg = allAvgs.length
    ? Math.round((allAvgs.reduce((a, b) => a + b, 0) / allAvgs.length) * 10) / 10 : null;

  await promisePool.query(
    `UPDATE dos_report_batches SET generated_count = ?, class_average = ?, school_average = ? WHERE id = ?`,
    [generated, classAvg, classAvg, batchId],
  );

  return { batch_id: batchId, generated, class_average: classAvg };
}

router.post('/dos/student-reports/generate', requireRole(DOS_ROLES), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    const userId = resolveUserId(req);
    const {
      academic_year, term, report_type, class_name: rawClass,
      student_ids: studentIds,
      include_extra_activities: includeExtraRaw,
    } = req.body;

    const includeExtra = includeExtraRaw === true || includeExtraRaw === 1 || includeExtraRaw === '1';
    const reportType = REPORT_TYPES.includes(report_type) ? report_type : 'final';
    const className = normalizeGradebookLabel(rawClass);
    const calendar = await getCalendar(schoolId);
    const academicYear = String(academic_year || '').trim() || calendar.academic_year;
    const yearEntry = calendar.registry.find((r) => r.academic_year === academicYear) || calendar.registry[0];
    const termVal = reportType === 'annual'
      ? (String(term || '').trim() || ANNUAL_TERM_LABEL)
      : (String(term || '').trim() || yearEntry?.terms?.[0] || calendar.terms[0]);

    if (!className) return res.status(400).json({ success: false, message: 'class_name required' });

    const result = reportType === 'annual'
      ? await generateAnnualClassReportsBatch(schoolId, userId, {
        academicYear, className, studentIds,
      })
      : await generateClassReportsBatch(schoolId, userId, {
        academicYear, term: termVal, reportType, className,
        studentIds, includeExtraActivities: includeExtra,
      });

    res.json({
      success: true,
      data: result,
      message: `Generated ${result.generated} report${result.generated !== 1 ? 's' : ''}`,
    });
  } catch (err) {
    console.error('POST /dos/student-reports/generate:', err);
    res.status(500).json({ success: false, message: err?.message || 'Failed to generate reports' });
  }
});

router.post('/dos/student-reports/seed-demo', requireRole(DOS_ROLES), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    const userId = resolveUserId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'No school linked' });

    const { runMarksReportsDemoSeed } = require('../utils/marksReportsDemoSeed');
    const result = await runMarksReportsDemoSeed(schoolId, userId, {
      clear: req.body?.clear !== false,
      seedTimetable: req.body?.seed_timetable !== false,
      generateReports: req.body?.generate_reports !== false,
      classes: req.body?.classes,
    });

    return res.json({ success: true, message: result.summary, data: result });
  } catch (err) {
    console.error('POST /dos/student-reports/seed-demo:', err);
    return res.status(500).json({ success: false, message: err?.message || 'Demo seed failed' });
  }
});

router.post('/dos/student-reports/seed-term-marks', requireRole(DOS_ROLES), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    const userId = resolveUserId(req);
    if (!schoolId) return res.status(400).json({ success: false, message: 'No school linked' });

    const { runTermMarksSeed } = require('../utils/marksReportsDemoSeed');
    const clearAllMarks = req.body?.clear_all_marks === true;
    const result = await runTermMarksSeed(schoolId, userId, {
      clearAllMarks,
      clearDemoMarks: clearAllMarks ? false : req.body?.clear_demo_marks !== false,
      clearReports: clearAllMarks || req.body?.clear_reports === true,
      generateReports: req.body?.generate_reports !== false,
      term: req.body?.term || null,
      terms: req.body?.terms || null,
      academicYear: req.body?.academic_year || null,
      classes: req.body?.classes || null,
    });

    return res.json({ success: true, message: result.summary, data: result });
  } catch (err) {
    console.error('POST /dos/student-reports/seed-term-marks:', err);
    return res.status(500).json({ success: false, message: err?.message || 'Failed to seed term marks' });
  }
});

router.get('/dos/student-reports/snapshots/:id', requireRole(DOS_ROLES), async (req, res) => {
  try {
    await ensureReportTables();
    const schoolId = resolveSchoolId(req);
    const id = Number(req.params.id);
    const [rows] = await promisePool.query(
      `SELECT * FROM dos_student_report_snapshots WHERE id = ? AND school_id = ? LIMIT 1`,
      [id, schoolId],
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Report not found' });
    const row = rows[0];
    const snapshotBeforeHydrate = JSON.parse(row.snapshot_json);
    let snapshot = snapshotBeforeHydrate;
    const needsQrFix = !snapshot.qr_data || isLegacyQrData(snapshot.qr_data);
    snapshot = applySnapshotQrData(snapshot, row.id);
    if (!snapshot.class_teacher_name && snapshot.class_name) {
      snapshot.class_teacher_name = await fetchClassTeacherName(
        schoolId, snapshot.class_name, snapshot.academic_year,
      );
    }
    snapshot = await hydrateSnapshotPhoto(snapshot, schoolId, row.student_id);
    if (needsQrFix || snapshot.photo_url !== snapshotBeforeHydrate.photo_url) {
      await promisePool.query(
        'UPDATE dos_student_report_snapshots SET snapshot_json = ? WHERE id = ? AND school_id = ?',
        [JSON.stringify(snapshot), row.id, schoolId],
      ).catch(() => {});
    }
    const schoolRow = await fetchSchoolBrandingRow(schoolId);
    res.json({
      success: true,
      data: {
        snapshot_id: row.id,
        batch_id: row.batch_id,
        status: row.status,
        school: schoolRow || snapshot.school || null,
        ...snapshot,
      },
    });
  } catch (err) {
    console.error('GET snapshot:', err);
    res.status(500).json({ success: false, message: 'Failed to load report' });
  }
});

router.patch('/dos/student-reports/snapshots/:id/comments', requireRole(DOS_ROLES), async (req, res) => {
  try {
    await ensureReportTables();
    const schoolId = resolveSchoolId(req);
    const id = Number(req.params.id);
    const dos_comment = req.body?.dos_comment != null ? String(req.body.dos_comment).trim() : null;
    const teacher_comment = req.body?.teacher_comment != null ? String(req.body.teacher_comment).trim() : null;

    const [rows] = await promisePool.query(
      `SELECT id, snapshot_json, status FROM dos_student_report_snapshots WHERE id = ? AND school_id = ? LIMIT 1`,
      [id, schoolId],
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Report not found' });

    const snapshot = JSON.parse(rows[0].snapshot_json);
    if (dos_comment !== null) snapshot.dos_comment = dos_comment;
    if (teacher_comment !== null) snapshot.teacher_comment = teacher_comment;

    await promisePool.query(
      `UPDATE dos_student_report_snapshots
       SET snapshot_json = ?, pdf_path = NULL
       WHERE id = ? AND school_id = ?`,
      [JSON.stringify(snapshot), id, schoolId],
    );

    res.json({
      success: true,
      data: { snapshot_id: id, dos_comment: snapshot.dos_comment, teacher_comment: snapshot.teacher_comment },
      message: 'Comments saved',
    });
  } catch (err) {
    console.error('PATCH snapshot comments:', err);
    res.status(500).json({ success: false, message: 'Failed to save comments' });
  }
});

router.post('/dos/student-reports/batches/:id/publish', requireRole(DOS_ROLES), async (req, res) => {
  try {
    await ensureReportTables();
    const schoolId = resolveSchoolId(req);
    const batchId = Number(req.params.id);
    const [r] = await promisePool.query(
      `UPDATE dos_student_report_snapshots SET status = 'published', published_at = NOW()
       WHERE batch_id = ? AND school_id = ? AND status IN ('generated','ready','pending_approval')`,
      [batchId, schoolId],
    );
    await promisePool.query(
      `UPDATE dos_report_batches SET status = 'published', published_at = NOW() WHERE id = ? AND school_id = ?`,
      [batchId, schoolId],
    );
    res.json({ success: true, message: `Published ${r.affectedRows} reports` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to publish' });
  }
});

router.patch('/dos/student-reports/snapshots/:id/publish', requireRole(DOS_ROLES), async (req, res) => {
  try {
    await ensureReportTables();
    const schoolId = resolveSchoolId(req);
    await promisePool.query(
      `UPDATE dos_student_report_snapshots SET status = 'published', published_at = NOW()
       WHERE id = ? AND school_id = ?`,
      [Number(req.params.id), schoolId],
    );
    res.json({ success: true, message: 'Report published to parent portal' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to publish report' });
  }
});

router.get('/dos/student-reports/snapshots/:id/pdf', requireRole(DOS_ROLES), async (req, res) => {
  try {
    await ensureReportTables();
    const schoolId = resolveSchoolId(req);
    const id = Number(req.params.id);
    const [rows] = await promisePool.query(
      `SELECT * FROM dos_student_report_snapshots WHERE id = ? AND school_id = ? LIMIT 1`,
      [id, schoolId],
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Not found' });
    const row = rows[0];
    let snapshot = JSON.parse(row.snapshot_json);
    snapshot = await hydrateSnapshotPhoto(snapshot, schoolId, row.student_id);
    const schoolRow = await fetchSchoolBrandingRow(schoolId);
    let pdfFile = row.pdf_path;
    const expected = pdfPathForSnapshot(schoolId, id);

    if (!pdfFile || pdfFile !== expected || !(await fs.pathExists(pdfFile))) {
      await generateSnapshotPdf(snapshot, expected, schoolRow);
      pdfFile = expected;
      await promisePool.query('UPDATE dos_student_report_snapshots SET pdf_path = ? WHERE id = ?', [pdfFile, id]);
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="report-${snapshot.student_uid || id}.pdf"`);
    fs.createReadStream(pdfFile).pipe(res);
  } catch (err) {
    console.error('PDF export:', err);
    res.status(500).json({ success: false, message: 'Failed to generate PDF' });
  }
});

router.get('/dos/student-reports/batches', requireRole(DOS_ROLES), async (req, res) => {
  try {
    await ensureReportTables();
    const schoolId = resolveSchoolId(req);
    const [rows] = await promisePool.query(
      `SELECT b.*, COUNT(s.id) AS snapshot_count,
              SUM(CASE WHEN s.status = 'published' THEN 1 ELSE 0 END) AS published_count
       FROM dos_report_batches b
       LEFT JOIN dos_student_report_snapshots s ON s.batch_id = b.id
       WHERE b.school_id = ?
       GROUP BY b.id ORDER BY b.created_at DESC LIMIT 100`,
      [schoolId],
    );
    res.json({ success: true, data: { batches: rows } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to list batches' });
  }
});

router.get('/dos/student-reports/batches/:id/zip', requireRole(DOS_ROLES), async (req, res) => {
  try {
    await ensureReportTables();
    const schoolId = resolveSchoolId(req);
    const batchId = Number(req.params.id);
    if (!batchId) return res.status(400).json({ success: false, message: 'Invalid batch id' });

    const [batchRows] = await promisePool.query(
      `SELECT id FROM dos_report_batches WHERE id = ? AND school_id = ? LIMIT 1`,
      [batchId, schoolId],
    );
    if (!batchRows.length) return res.status(404).json({ success: false, message: 'Batch not found' });

    const [snaps] = await promisePool.query(
      `SELECT id, snapshot_json, pdf_path, student_id FROM dos_student_report_snapshots
       WHERE batch_id = ? AND school_id = ?`,
      [batchId, schoolId],
    );
    if (!snaps.length) return res.status(404).json({ success: false, message: 'No reports in batch' });

    const schoolRow = await fetchSchoolBrandingRow(schoolId);
    const pdfEntries = [];
    for (const snap of snaps) {
      try {
        let data = JSON.parse(snap.snapshot_json || '{}');
        data = await hydrateSnapshotPhoto(data, schoolId, snap.student_id);
        const expected = pdfPathForSnapshot(schoolId, snap.id);
        let pdfFile = snap.pdf_path;
        if (!pdfFile || pdfFile !== expected || !(await fs.pathExists(pdfFile))) {
          await generateSnapshotPdf(data, expected, schoolRow);
          pdfFile = expected;
          await promisePool.query(
            'UPDATE dos_student_report_snapshots SET pdf_path = ? WHERE id = ?',
            [pdfFile, snap.id],
          );
        }
        if (!(await fs.pathExists(pdfFile))) continue;
        const fname = `${data.class_name || 'class'}_${data.student_uid || snap.student_id}.pdf`.replace(/[^\w.-]+/g, '_');
        pdfEntries.push({ pdfFile, fname });
      } catch (snapErr) {
        console.error(`ZIP prep snapshot ${snap.id}:`, snapErr.message);
      }
    }
    if (!pdfEntries.length) {
      return res.status(500).json({ success: false, message: 'Could not prepare any PDFs for this batch' });
    }

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="reports-batch-${batchId}.zip"`);

    const archive = archiver('zip', { zlib: { level: 5 } });
    await new Promise((resolve, reject) => {
      archive.on('error', reject);
      res.on('close', resolve);
      archive.pipe(res);
      for (const { pdfFile, fname } of pdfEntries) {
        archive.file(pdfFile, { name: fname });
      }
      archive.finalize().catch(reject);
    });
  } catch (err) {
    console.error('ZIP export:', err);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: err.message || 'Failed to create ZIP' });
    } else {
      res.destroy();
    }
  }
});

const PUBLIC_REPORT_STATUSES = ['generated', 'pending_approval', 'ready', 'published'];

/** Public read-only report view — opened when scanning QR on printed report cards. */
router.get('/public/student-mark-reports/:id', async (req, res) => {
  try {
    await ensureReportTables();
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid report id' });

    const placeholders = PUBLIC_REPORT_STATUSES.map(() => '?').join(', ');
    const [rows] = await promisePool.query(
      `SELECT s.*, st.first_name, st.last_name, st.student_uid
       FROM dos_student_report_snapshots s
       INNER JOIN students st ON st.id = s.student_id
       WHERE s.id = ? AND s.status IN (${placeholders})
       LIMIT 1`,
      [id, ...PUBLIC_REPORT_STATUSES],
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Report not found or not available' });
    }

    const row = rows[0];
    let snapshot = JSON.parse(row.snapshot_json || '{}');
    snapshot = applySnapshotQrData(snapshot, row.id);
    if (!snapshot.class_teacher_name && snapshot.class_name) {
      snapshot.class_teacher_name = await fetchClassTeacherName(
        row.school_id, snapshot.class_name, snapshot.academic_year,
      );
    }
    snapshot = await hydrateSnapshotPhoto(snapshot, row.school_id, row.student_id);
    const schoolRow = await fetchSchoolBrandingRow(row.school_id);

    res.json({
      success: true,
      data: {
        snapshot_id: row.id,
        status: row.status,
        published_at: row.published_at,
        generated_at: row.generated_at,
        school: schoolRow || snapshot.school || null,
        ...snapshot,
      },
    });
  } catch (err) {
    console.error('GET /public/student-mark-reports/:id:', err);
    res.status(500).json({ success: false, message: 'Failed to load report' });
  }
});

async function computeAnnualStudentSnapshot(schoolId, student, {
  academicYear, className, classTeacherName, schoolInfo, healthWeights, includeExtraActivities = false,
}) {
  const termSnapshots = [];
  for (const term of ANNUAL_TERMS) {
    try {
      const {
        students, subjects, rankings, marksTree, extraNames, assessmentTrends, typeWeights, gradingScale,
      } = await computeClassRankings(
        schoolId, className, 'final', academicYear, term, { includeExtraActivities },
      );
      const stu = students.find((s) => s.id === student.id);
      if (!stu) continue;
      const snap = await computeStudentSnapshot(schoolId, stu, {
        reportType: 'final',
        academicYear,
        term,
        subjects,
        classSize: students.length,
        rankings,
        marksTree,
        extraNames,
        classTeacherName,
        assessmentTrends,
        typeWeights,
        gradingScale,
        healthWeights,
      });
      termSnapshots.push(snap);
    } catch (_) { /* skip term without data */ }
  }

  const base = termSnapshots[termSnapshots.length - 1] || null;
  const timeline = termSnapshots
    .filter((s) => s.overall_average != null)
    .map((s) => ({ term: s.term, average: s.overall_average, pass_rate: null }));

  const annualAverage = timeline.length
    ? Math.round((timeline.reduce((a, t) => a + t.average, 0) / timeline.length) * 10) / 10
    : base?.overall_average ?? null;

  const improvement = timeline.length >= 2
    ? Math.round((timeline[timeline.length - 1].average - timeline[0].average) * 10) / 10
    : 0;

  const subjectNames = new Set();
  for (const snap of termSnapshots) {
    for (const sub of snap.subjects || []) subjectNames.add(sub.subject_name);
  }

  const annualSubjects = [...subjectNames].map((subject) => {
    const byTerm = {};
    for (const snap of termSnapshots) {
      const row = (snap.subjects || []).find((s) => s.subject_name === subject);
      byTerm[snap.term] = row?.average ?? null;
    }
    const vals = Object.values(byTerm).filter((v) => v != null);
    const annualAvg = vals.length
      ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10
      : null;
    const t1 = byTerm['Term 1'];
    const t3 = byTerm['Term 3'];
    const growth = t1 != null && t3 != null ? Math.round((t3 - t1) * 10) / 10 : null;
    return {
      subject,
      term1: byTerm['Term 1'],
      term2: byTerm['Term 2'],
      term3: byTerm['Term 3'],
      annual_avg: annualAvg,
      grade: letterGrade(annualAvg, base?.grading_scale),
      growth,
      growth_label: growth != null ? (growth >= 0 ? `Improved +${growth}%` : `Declined ${growth}%`) : null,
    };
  }).sort((a, b) => (a.subject || '').localeCompare(b.subject || ''));

  const strongSubjects = annualSubjects.filter((s) => (s.annual_avg ?? 0) >= 75).map((s) => s.subject);
  const weakSubjects = annualSubjects.filter((s) => s.annual_avg != null && s.annual_avg < 55).map((s) => s.subject);

  const achievements = [];
  if (base?.school_position != null && base.school_position <= 10) achievements.push('Top 10 Student');
  if (improvement >= 10) achievements.push('Most Improved Student');
  if (annualAverage != null && annualAverage >= 85) achievements.push('Academic Excellence Award');
  for (const s of annualSubjects.filter((x) => (x.annual_avg ?? 0) >= 88).slice(0, 2)) {
    achievements.push(`${s.subject} Excellence`);
  }
  if ((base?.attendance_percent ?? 0) >= 95) achievements.push('Excellent Attendance');

  const name = base?.name || `${student.first_name || ''} ${student.last_name || ''}`.trim();
  const subjectRows = annualSubjects.map((s) => ({
    subject_name: s.subject,
    term_1: s.term1,
    term_2: s.term2,
    term_3: s.term3,
    mid_term: s.term1,
    final: s.term3,
    average: s.annual_avg,
    grade: s.grade,
    grade_remark: gradeRemark(s.grade, base?.grading_scale),
    growth: s.growth,
    growth_label: s.growth_label,
  }));

  const performanceTrend = timeline.map((t) => ({ term: t.term, average: t.average }));
  const overallGrade = letterGrade(annualAverage, base?.grading_scale);

  const ctx = {
    overall_average: annualAverage,
    class_position: base?.class_position,
    class_size: base?.class_size,
    attendance: base?.attendance_percent ?? 0,
    behaviour: base?.behaviour_percent ?? 0,
    subjects: subjectRows,
    homework_completion: base?.homework_completion_percent ?? 0,
    assessment_participation: base?.assessment_participation_percent ?? 0,
    competencies_avg: base?.competencies_avg ?? 0,
    most_improved: improvement >= 8,
  };

  return {
    student_id: student.id,
    student_uid: student.student_uid,
    name,
    photo_url: base?.photo_url || studentPhotoUrl(student.student_photo),
    class_name: className,
    academic_year: academicYear,
    term: ANNUAL_TERM_LABEL,
    report_type: 'annual',
    overall_average: annualAverage,
    overall_grade: overallGrade,
    overall_grade_remark: gradeRemark(overallGrade, base?.grading_scale),
    grading_scale: base?.grading_scale,
    class_position: base?.class_position,
    class_size: base?.class_size,
    stream_position: base?.stream_position,
    stream_size: base?.stream_size,
    school_position: base?.school_position,
    school_size: base?.school_size,
    attendance_percent: base?.attendance_percent,
    behaviour_percent: base?.behaviour_percent,
    discipline_marks: base?.discipline_marks,
    discipline_marks_max: base?.discipline_marks_max,
    discipline_marks_min: base?.discipline_marks_min,
    homework_completion_percent: base?.homework_completion_percent,
    assessment_participation_percent: base?.assessment_participation_percent,
    competencies_avg: base?.competencies_avg,
    assessment_columns: [],
    subjects: subjectRows,
    performance_trend: performanceTrend,
    performance_timeline: timeline,
    year_summary: {
      term_1: timeline.find((t) => t.term === 'Term 1')?.average ?? null,
      term_2: timeline.find((t) => t.term === 'Term 2')?.average ?? null,
      term_3: timeline.find((t) => t.term === 'Term 3')?.average ?? null,
      annual_average: annualAverage,
    },
    performance_insight: improvement >= 0
      ? `Performance improved by ${improvement}% across the year.`
      : `Performance declined by ${Math.abs(improvement)}% — review intervention plan.`,
    annual_subjects: annualSubjects,
    strong_subjects: strongSubjects,
    weak_subjects: weakSubjects,
    badges: base?.badges || buildBadges(ctx),
    recommendations: buildRecommendations({ subjects: subjectRows }),
    competencies: base?.competencies || [],
    academic_health_score: computeAcademicHealthScore(ctx, healthWeights),
    success_score: computeSuccessScore(ctx),
    achievements,
    intervention_history: weakSubjects.slice(0, 3).map((subj) => ({
      term: 'Term 1',
      issue: `Weak ${subj}`,
      intervention: 'Extra coaching recommended',
      result: annualSubjects.find((s) => s.subject === subj)?.growth_label || 'Monitoring',
    })),
    term_snapshots: termSnapshots.map((s) => ({
      term: s.term,
      overall_average: s.overall_average,
      class_position: s.class_position,
    })),
    class_teacher_name: classTeacherName,
    teacher_comment: base?.teacher_comment || '',
    dos_comment: base?.dos_comment || '',
    parent_feedback: base?.parent_feedback || '',
    promotion_status: annualAverage != null
      ? (annualAverage >= 50 ? 'Promoted' : annualAverage >= 40 ? 'Conditional Promotion' : 'Retained')
      : null,
    school: schoolInfo,
  };
}

async function generateAnnualClassReportsBatch(schoolId, userId, { academicYear, className, studentIds = null }) {
  await ensureReportTables();
  const schoolInfo = await fetchSchoolBrandingRow(schoolId);
  const classTeacherName = await fetchClassTeacherName(schoolId, className, academicYear);
  const healthWeights = await getSchoolAcademicHealthWeights(schoolId);
  const [students] = await promisePool.query(
    `SELECT id, student_uid, first_name, last_name, student_photo, class_name
     FROM students WHERE school_id = ? AND (${sqlNormLabelEquals('class_name')})`,
    [schoolId, className],
  );
  const targetStudents = Array.isArray(studentIds) && studentIds.length
    ? students.filter((s) => studentIds.includes(s.id))
    : students;

  const [batchRes] = await promisePool.query(
    `INSERT INTO dos_report_batches
     (school_id, academic_year, term, report_type, class_name, status, total_students, created_by_user_id)
     VALUES (?, ?, ?, 'annual', ?, 'generated', ?, ?)`,
    [schoolId, academicYear, ANNUAL_TERM_LABEL, className, targetStudents.length, userId],
  );
  const batchId = batchRes.insertId;
  let generated = 0;
  const allAvgs = [];

  for (const student of targetStudents) {
    const snapshot = await computeAnnualStudentSnapshot(schoolId, student, {
      academicYear, className, classTeacherName, schoolInfo, healthWeights,
    });
    if (snapshot.overall_average != null) allAvgs.push(snapshot.overall_average);

    await promisePool.query(
      `INSERT INTO dos_student_report_snapshots
       (batch_id, school_id, student_id, academic_year, term, report_type, class_name, status,
        snapshot_json, overall_average, overall_grade, class_position, academic_health_score)
       VALUES (?, ?, ?, ?, ?, 'annual', ?, 'generated', '{}', ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE batch_id = VALUES(batch_id), snapshot_json = VALUES(snapshot_json),
         overall_average = VALUES(overall_average), overall_grade = VALUES(overall_grade),
         class_position = VALUES(class_position), academic_health_score = VALUES(academic_health_score),
         status = 'generated', generated_at = CURRENT_TIMESTAMP`,
      [
        batchId, schoolId, student.id, academicYear, ANNUAL_TERM_LABEL, className,
        snapshot.overall_average, snapshot.overall_grade,
        snapshot.class_position, snapshot.academic_health_score,
      ],
    );
    const [[snapRow]] = await promisePool.query(
      `SELECT id FROM dos_student_report_snapshots
       WHERE school_id = ? AND student_id = ? AND academic_year = ? AND term = ? AND report_type = 'annual' LIMIT 1`,
      [schoolId, student.id, academicYear, ANNUAL_TERM_LABEL],
    );
    snapshot.qr_data = buildReportQrData(snapRow?.id);
    await promisePool.query(
      `UPDATE dos_student_report_snapshots SET snapshot_json = ?, pdf_path = NULL WHERE id = ?`,
      [JSON.stringify(snapshot), snapRow.id],
    );
    generated += 1;
  }

  const classAvg = allAvgs.length
    ? Math.round((allAvgs.reduce((a, b) => a + b, 0) / allAvgs.length) * 10) / 10 : null;
  await promisePool.query(
    `UPDATE dos_report_batches SET generated_count = ?, class_average = ? WHERE id = ?`,
    [generated, classAvg, batchId],
  );
  return { batch_id: batchId, generated, class_average: classAvg };
}

router.get('/dos/student-reports/annual/preview', requireRole(DOS_ROLES), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    const className = normalizeGradebookLabel(req.query.class_name);
    const studentId = Number(req.query.student_id);
    const calendar = await getCalendar(schoolId);
    const academicYear = String(req.query.academic_year || '').trim() || calendar.academic_year;
    if (!className || !studentId) {
      return res.status(400).json({ success: false, message: 'class_name and student_id required' });
    }
    const [[student]] = await promisePool.query(
      'SELECT * FROM students WHERE id = ? AND school_id = ? LIMIT 1',
      [studentId, schoolId],
    );
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    const schoolInfo = await fetchSchoolBrandingRow(schoolId);
    const classTeacherName = await fetchClassTeacherName(schoolId, className, academicYear);
    const healthWeights = await getSchoolAcademicHealthWeights(schoolId);
    const snapshot = await computeAnnualStudentSnapshot(schoolId, student, {
      academicYear, className, classTeacherName, schoolInfo, healthWeights,
    });
    res.json({ success: true, data: snapshot });
  } catch (err) {
    console.error('GET annual/preview:', err);
    res.status(500).json({ success: false, message: 'Failed to preview annual report' });
  }
});

router.post('/dos/student-reports/annual/generate', requireRole(DOS_ROLES), async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    const userId = resolveUserId(req);
    const className = normalizeGradebookLabel(req.body.class_name);
    const calendar = await getCalendar(schoolId);
    const academicYear = String(req.body.academic_year || '').trim() || calendar.academic_year;
    if (!className) return res.status(400).json({ success: false, message: 'class_name required' });
    const result = await generateAnnualClassReportsBatch(schoolId, userId, {
      academicYear, className, studentIds: req.body.student_ids,
    });
    res.json({
      success: true,
      data: result,
      message: `Generated ${result.generated} annual report(s)`,
    });
  } catch (err) {
    console.error('POST annual/generate:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to generate annual reports' });
  }
});

module.exports = router;
module.exports.ensureReportTables = ensureReportTables;
module.exports.buildPublicReportUrl = buildPublicReportUrl;
module.exports.isLegacyQrData = isLegacyQrData;
module.exports.buildReportQrData = buildReportQrData;
module.exports.generateClassReportsBatch = generateClassReportsBatch;
module.exports.getCalendar = getCalendar;
