'use strict';

const db = require('../config/database');

function trimStr(v) {
  return String(v ?? '').trim();
}

async function resolveSchoolById(schoolId) {
  const id = parseInt(schoolId, 10);
  if (!Number.isFinite(id) || id <= 0) return null;
  const [rows] = await db.promisePool.query(
    `SELECT s.id, s.school_name, s.school_code, s.status,
            s.province, s.district, s.sector, s.phone, s.email,
            s.education_levels, s.school_category,
            (SELECT m.slug FROM school_mini_websites m
             WHERE m.school_id = s.id AND m.status = 'published'
             ORDER BY m.id DESC LIMIT 1) AS mini_website_slug
     FROM schools s
     WHERE s.deleted_at IS NULL AND s.id = ?
     LIMIT 1`,
    [id]
  );
  return rows[0] || null;
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

/**
 * Accept school_id (numeric) or school_code (directory code e.g. 001 / 003).
 * @returns {{ schoolId: number|null, school: object|null, message?: string }}
 */
async function resolveSchoolIdFromInput(input = {}) {
  const id = parseInt(input.school_id ?? input.schoolId, 10);
  if (Number.isFinite(id) && id > 0) {
    const school = await resolveSchoolById(id);
    if (!school) {
      return { schoolId: null, school: null, message: 'School not found for that school_id' };
    }
    return { schoolId: id, school };
  }
  const code = trimStr(input.school_code ?? input.schoolCode);
  if (!code) {
    return { schoolId: null, school: null, message: 'school_id or school_code is required' };
  }
  const school = await resolveSchoolByCode(code);
  if (!school) {
    return { schoolId: null, school: null, message: `No school found for school_code "${code}"` };
  }
  return { schoolId: school.id, school };
}

module.exports = {
  trimStr,
  resolveSchoolById,
  resolveSchoolByCode,
  resolveSchoolIdFromInput,
};
