// ================================================================
// publicPaySchoolFlow.js — Public parent pay by school code + class,
// and student lookup scoped to a school (no auth).
// Mounted at /api/public/public-pay
// ================================================================

'use strict';

const express = require('express');
const rateLimit = require('express-rate-limit');
const db = require('../config/database');
const { loadApprovedBabyeyiPricing } = require('./babyeyiPublicPricingCore');

const router = express.Router();

const flowLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests — try again later' },
});

function trimStr(v) {
  if (v === undefined || v === null) return '';
  return String(v).trim();
}

function yearMatchesRow(rowYear, inputLabel) {
  const a = rowYear === null || rowYear === undefined ? '' : String(rowYear);
  const b = trimStr(inputLabel);
  if (!b) return true;
  if (a === b) return true;
  const num = parseInt(a, 10);
  if (!Number.isNaN(num) && b.startsWith(String(num))) return true;
  if (b.includes('-')) {
    const first = b.split('-')[0];
    if (a === first) return true;
  }
  return false;
}

function termMatchesRow(rowTerm, inputTerm) {
  const b = trimStr(inputTerm);
  if (!b) return true;
  const a = rowTerm === null || rowTerm === undefined ? '' : String(rowTerm).trim();
  return a.toLowerCase() === b.toLowerCase();
}

function classMatchesBabyeyi(row, className) {
  const c = trimStr(className);
  if (!c) return false;
  const primary = trimStr(row.class_name);
  if (primary && primary.toLowerCase() === c.toLowerCase()) return true;
  try {
    const arr = typeof row.classes_json === 'string' ? JSON.parse(row.classes_json) : row.classes_json;
    if (Array.isArray(arr)) {
      return arr.some((x) => String(x).trim().toLowerCase() === c.toLowerCase());
    }
  } catch (_) {}
  return false;
}

async function resolveSchoolByCode(raw) {
  const code = trimStr(raw).toUpperCase();
  if (!code) return null;
  const [rows] = await db.promisePool.query(
    `SELECT s.id, s.school_name, s.school_code, s.status,
            s.province, s.district, s.sector, s.phone, s.email,
            s.education_levels, s.school_category,
            (SELECT m.slug FROM school_mini_websites m
             WHERE m.school_id = s.id AND m.status = 'published'
             ORDER BY m.id DESC LIMIT 1) AS mini_website_slug
     FROM schools s
     WHERE s.deleted_at IS NULL AND TRIM(UPPER(s.school_code)) = ?
     LIMIT 1`,
    [code]
  );
  return rows[0] || null;
}

function schoolPublicPayload(school) {
  if (!school) return null;
  return {
    id: school.id,
    school_name: school.school_name,
    school_code: school.school_code,
    province: school.province || null,
    district: school.district || null,
    sector: school.sector || null,
    phone: school.phone || null,
    email: school.email || null,
    education_levels: school.education_levels || null,
    school_category: school.school_category || null,
    mini_website_slug: school.mini_website_slug || null,
  };
}

async function findApprovedBabyeyiForSchoolClass(schoolId, className, academicYearLabel, termLabel) {
  const [rows] = await db.promisePool.query(
    `SELECT id, school_id, academic_year, term, class_name, classes_json, status, total_fee
     FROM school_babyeyi
     WHERE school_id = ? AND is_active = 1 AND status = 'approved'
     ORDER BY created_at DESC, id DESC
     LIMIT 200`,
    [schoolId]
  );
  for (const r of rows || []) {
    if (
      classMatchesBabyeyi(r, className)
      && yearMatchesRow(r.academic_year, academicYearLabel || '')
      && termMatchesRow(r.term, termLabel || '')
    ) {
      return r;
    }
  }
  return null;
}

function expandClassNamesFromRow(row) {
  const out = new Set();
  const primary = trimStr(row.class_name);
  if (primary) out.add(primary);
  try {
    const arr = typeof row.classes_json === 'string' ? JSON.parse(row.classes_json) : row.classes_json;
    if (Array.isArray(arr)) {
      arr.forEach((x) => {
        const c = trimStr(x);
        if (c) out.add(c);
      });
    }
  } catch (_) {}
  return [...out];
}

/** Learner lookup restricted to one school (UID, official code, or SDM id). */
async function findStudentInSchool(schoolId, raw) {
  const code = String(raw || '').trim();
  if (!code || code.length < 2) return null;
  const upper = code.toUpperCase();
  const [rows] = await db.promisePool.query(
    `SELECT s.id, s.school_id, s.student_uid, s.student_code, s.sdm_code,
            s.first_name, s.last_name, s.class_name, s.academic_year,
            sc.school_name, sc.school_code
     FROM students s
     LEFT JOIN schools sc ON sc.id = s.school_id
     WHERE s.school_id = ?
       AND (
         TRIM(UPPER(s.student_uid)) = ?
         OR TRIM(s.student_uid) = ?
         OR (s.student_code IS NOT NULL AND TRIM(s.student_code) = ?)
         OR (s.sdm_code IS NOT NULL AND TRIM(UPPER(s.sdm_code)) = ?)
       )
     ORDER BY s.id ASC
     LIMIT 1`,
    [schoolId, upper, code, code, upper]
  );
  return rows[0] || null;
}

function discoveryPayload() {
  return {
    service: 'public_pay_by_school',
    description: 'Guest pay: school code + class pricing, or student search within a school, then POST babyeyi-pay/intent.',
    steps: [
      {
        name: 'school_catalog',
        method: 'POST',
        path: '/api/public/public-pay/school-catalog',
        body: { school_code: 'required' },
        returns: 'school, combinations (class_name, term, academic_year, babyeyi_id), dropdown lists',
      },
      {
        name: 'class_pricing',
        method: 'POST',
        path: '/api/public/public-pay/class-pricing',
        body: {
          school_code: 'directory code e.g. 003',
          class_name: 'e.g. P1',
          academic_year: 'optional — narrows approved Babyeyi row',
          term: 'optional — narrows to that term on the document',
        },
        returns: 'school, babyeyi_id, school_id, school_fees, requirements, combined_total_rwf (same shape as babyeyi-pay/pricing)',
      },
      {
        name: 'search_student',
        method: 'POST',
        path: '/api/public/public-pay/search-student',
        body: {
          school_code: 'required',
          babyeyi_id: 'optional — pin the same document as class-pricing when multiple exist',
          code: 'optional — student_uid, student_code, or sdm_code',
          student_uid: 'optional alias',
          sdm_code: 'optional',
          sdmCode: 'optional camelCase',
        },
        returns: 'student row for that school only + pricing if Babyeyi exists + next_step payload hints for intent',
      },
      {
        name: 'payment_intent',
        method: 'POST',
        path: '/api/public/babyeyi-pay/intent',
        note: 'Use school_id and babyeyi_id from previous responses; set selected_student from search-student next_step',
      },
    ],
  };
}

router.get('/', (_req, res) => {
  res.json(discoveryPayload());
});

// POST /api/public/public-pay/school-catalog
router.post('/school-catalog', flowLimiter, async (req, res) => {
  try {
    const schoolCode = trimStr(req.body?.school_code ?? req.body?.schoolCode);
    if (!schoolCode) {
      return res.status(400).json({ success: false, message: 'school_code is required' });
    }

    const school = await resolveSchoolByCode(schoolCode);
    if (!school) {
      return res.status(404).json({ success: false, message: 'School not found for this code' });
    }

    const [rows] = await db.promisePool.query(
      `SELECT id, class_name, classes_json, term, academic_year
       FROM school_babyeyi
       WHERE school_id = ? AND is_active = 1 AND status = 'approved'
       ORDER BY academic_year DESC, term, class_name, id DESC`,
      [school.id]
    );

    const combinations = [];
    const yearSet = new Set();
    const termSet = new Set();
    const classSet = new Set();

    for (const r of rows || []) {
      const year = r.academic_year != null && String(r.academic_year).trim() !== '' ? String(r.academic_year).trim() : '';
      const term = r.term != null && String(r.term).trim() !== '' ? String(r.term).trim() : '';
      if (year) yearSet.add(year);
      if (term) termSet.add(term);
      const names = expandClassNamesFromRow(r);
      names.forEach((cn) => classSet.add(cn));
      names.forEach((cn) => {
        combinations.push({
          babyeyi_id: r.id,
          class_name: cn,
          term: term || null,
          academic_year: year || null,
        });
      });
    }

    return res.json({
      success: true,
      data: {
        school: schoolPublicPayload(school),
        academic_years: [...yearSet].sort((a, b) => String(b).localeCompare(String(a))),
        terms: [...termSet].sort((a, b) => String(a).localeCompare(String(b))),
        class_names: [...classSet].sort((a, b) => String(a).localeCompare(String(b))),
        combinations,
      },
    });
  } catch (err) {
    console.error('[public-pay/school-catalog]', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
});

// POST /api/public/public-pay/class-pricing
router.post('/class-pricing', flowLimiter, async (req, res) => {
  try {
    const schoolCode = trimStr(req.body?.school_code ?? req.body?.schoolCode);
    const className = trimStr(req.body?.class_name ?? req.body?.className);
    const academicYear = trimStr(req.body?.academic_year ?? req.body?.academicYear);
    const term = trimStr(req.body?.term ?? req.body?.term_label);
    if (!schoolCode || !className) {
      return res.status(400).json({ success: false, message: 'school_code and class_name are required' });
    }

    const school = await resolveSchoolByCode(schoolCode);
    if (!school) {
      return res.status(404).json({ success: false, message: 'School not found for this code' });
    }

    const babyeyi = await findApprovedBabyeyiForSchoolClass(school.id, className, academicYear, term);
    if (!babyeyi) {
      return res.status(404).json({
        success: false,
        message: `No approved Babyeyi for class "${className}" at this school (check academic year, term, or class name).`,
        data: {
          school: { id: school.id, school_name: school.school_name, school_code: school.school_code },
          class_name: className,
          academic_year: academicYear || null,
          term: term || null,
        },
      });
    }

    const pr = await loadApprovedBabyeyiPricing(babyeyi.id, school.id);
    if (!pr.ok) {
      return res.status(pr.status).json({ success: false, message: pr.message });
    }

    return res.json({
      success: true,
      data: {
        school: { id: school.id, school_name: school.school_name, school_code: school.school_code },
        class_name: className,
        academic_year: academicYear || null,
        term: babyeyi.term ?? (term || null),
        babyeyi_id: babyeyi.id,
        school_id: school.id,
        ...pr.data,
        next_step: {
          post_intent: '/api/public/babyeyi-pay/intent',
          example_body: {
            school_id: school.id,
            babyeyi_id: babyeyi.id,
            total_rwf: pr.data.combined_total_rwf,
            status: 'draft',
          },
        },
      },
    });
  } catch (err) {
    console.error('[public-pay/class-pricing]', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
});

// POST /api/public/public-pay/search-student
router.post('/search-student', flowLimiter, async (req, res) => {
  try {
    const schoolCode = trimStr(req.body?.school_code ?? req.body?.schoolCode);
    const raw =
      req.body?.code ??
      req.body?.student_uid ??
      req.body?.sdm_code ??
      req.body?.sdmCode;
    if (!schoolCode || !trimStr(raw)) {
      return res.status(400).json({
        success: false,
        message: 'school_code and one of code, student_uid, or sdm_code are required',
      });
    }

    const school = await resolveSchoolByCode(schoolCode);
    if (!school) {
      return res.status(404).json({ success: false, message: 'School not found for this code' });
    }

    const st = await findStudentInSchool(school.id, raw);
    if (!st) {
      return res.status(404).json({
        success: false,
        message: 'No student matched in this school for that code',
        data: { school: { id: school.id, school_name: school.school_name, school_code: school.school_code } },
      });
    }

    const babyeyiIdOpt = parseInt(req.body?.babyeyi_id ?? req.body?.babyeyiId, 10);
    let babyeyi = null;
    if (Number.isFinite(babyeyiIdOpt) && babyeyiIdOpt > 0) {
      const [bRows] = await db.promisePool.query(
        `SELECT id, school_id, academic_year, term, class_name, classes_json, status, total_fee
         FROM school_babyeyi
         WHERE id = ? AND school_id = ? AND is_active = 1 AND status = 'approved'
         LIMIT 1`,
        [babyeyiIdOpt, school.id]
      );
      babyeyi = bRows[0] || null;
    } else {
      const className = trimStr(st.class_name);
      babyeyi = className
        ? await findApprovedBabyeyiForSchoolClass(school.id, className, st.academic_year || '', '')
        : null;
    }

    if (Number.isFinite(babyeyiIdOpt) && babyeyiIdOpt > 0 && !babyeyi) {
      return res.status(404).json({
        success: false,
        message: 'Babyeyi document not found for this school (check babyeyi_id).',
      });
    }

    let pricing = null;
    if (babyeyi) {
      const pr = await loadApprovedBabyeyiPricing(babyeyi.id, school.id);
      if (pr.ok) pricing = pr.data;
    }

    const studentName = `${trimStr(st.first_name)} ${trimStr(st.last_name)}`.trim();

    return res.json({
      success: true,
      data: {
        school: { id: school.id, school_name: school.school_name, school_code: school.school_code },
        student: {
          id: st.id,
          student_uid: st.student_uid,
          student_code: st.student_code,
          sdm_code: st.sdm_code,
          first_name: st.first_name,
          last_name: st.last_name,
          class_name: st.class_name,
          academic_year: st.academic_year,
        },
        babyeyi_id: babyeyi?.id ?? null,
        school_id: school.id,
        pricing,
        next_step: {
          post_intent: '/api/public/babyeyi-pay/intent',
          selected_student: {
            student_id: st.id,
            student_name: studentName || 'Student',
            student_uid: st.student_uid,
            student_code: st.student_code || null,
          },
          example_body: {
            school_id: school.id,
            babyeyi_id: babyeyi?.id || null,
            total_rwf: pricing?.combined_total_rwf ?? 0,
            status: 'draft',
            selected_student: {
              student_id: st.id,
              student_name: studentName || 'Student',
              student_uid: st.student_uid,
              student_code: st.student_code || null,
            },
          },
        },
      },
    });
  } catch (err) {
    console.error('[public-pay/search-student]', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
});

module.exports = router;
