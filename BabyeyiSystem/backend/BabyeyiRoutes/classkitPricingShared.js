// ================================================================
// Shared ClassKit pricing payload for parent portal + OTP share links
// Keeps totals / fee scoping aligned with GET /parent-portal/classkit-pricing
// ================================================================

'use strict';

const { promisePool } = require('../config/database');

const SQL_JOIN_STUDENT_REQ_BY_ITEM = `LEFT JOIN student_requirements sr ON CONVERT(TRIM(LOWER(sr.name)) USING utf8mb4) COLLATE utf8mb4_unicode_ci = CONVERT(TRIM(LOWER(bsr.item)) USING utf8mb4) COLLATE utf8mb4_unicode_ci`;

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

function parseRequirementQuantity(raw) {
  if (raw == null || raw === '') return 1;
  const s = String(raw).trim();
  const m = s.match(/(\d+(?:\.\d+)?)/);
  if (m) {
    const n = parseFloat(m[1]);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 1;
}

/**
 * Load classkit pricing for a student row already authorized by caller.
 * @param {number} studentId
 * @param {'FULL'|'LIMITED'} accessType
 */
async function fetchClasskitPricingForStudent(studentId, accessType) {
  const sid = Number(studentId);
  if (!Number.isFinite(sid) || sid <= 0) {
    return { ok: false, status: 400, message: 'Invalid student id' };
  }
  const at = accessType === 'LIMITED' ? 'LIMITED' : 'FULL';

  const [[st0]] = await promisePool.query(
    `SELECT s.id, s.school_id, s.class_name, s.academic_year, s.first_name, s.last_name,
            sc.school_name
     FROM students s
     LEFT JOIN schools sc ON sc.id = s.school_id
     WHERE s.id = ?
     LIMIT 1`,
    [sid]
  );

  if (!st0) {
    return { ok: false, status: 404, message: 'Student not found' };
  }
  if (!st0.school_id || !st0.class_name) {
    return {
      ok: false,
      status: 400,
      message: 'Student class or school is missing. Ask school manager to update learner class first.',
    };
  }

  const [babyeyiRows] = await promisePool.query(
    `SELECT id, school_id, class_name, classes_json, term, academic_year, status, total_fee
     FROM school_babyeyi
     WHERE school_id = ?
       AND is_active = 1
       AND status = 'approved'
     ORDER BY created_at DESC, id DESC
     LIMIT 200`,
    [st0.school_id]
  );

  const babyeyi = (babyeyiRows || []).find(
    (r) =>
      classMatchesBabyeyi(r, st0.class_name) &&
      yearMatchesRow(r.academic_year, st0.academic_year || '')
  );
  if (!babyeyi) {
    return {
      ok: false,
      status: 404,
      message: `No approved Babyeyi found for class ${st0.class_name}.`,
    };
  }

  const [feeRows] = await promisePool.query(
    `SELECT id, name, amount, sort_order
     FROM babyeyi_payments
     WHERE babyeyi_id = ?
     ORDER BY sort_order, id`,
    [babyeyi.id]
  );

  let reqLines;
  try {
    reqLines = (
      await promisePool.query(
        `SELECT bsr.id AS babyeyi_requirement_id, bsr.item AS requirement_name, bsr.description, bsr.quantity,
                rp.price AS stored_price,
                sr.default_price AS catalog_default_price,
                sr.image_url AS catalog_image_url,
                COALESCE(rp.price, sr.default_price, bsr.cost, 0) AS unit_price
         FROM babyeyi_student_requirements bsr
         LEFT JOIN requirement_prices rp ON rp.babyeyi_id = bsr.babyeyi_id AND rp.babyeyi_requirement_id = bsr.id
         ${SQL_JOIN_STUDENT_REQ_BY_ITEM}
         WHERE bsr.babyeyi_id = ?
         ORDER BY bsr.sort_order, bsr.id`,
        [babyeyi.id]
      )
    )[0];
  } catch (e) {
    if (e.code !== 'ER_BAD_FIELD_ERROR') throw e;
    reqLines = (
      await promisePool.query(
        `SELECT bsr.id AS babyeyi_requirement_id, bsr.item AS requirement_name, bsr.description, bsr.quantity,
                rp.price AS stored_price,
                sr.default_price AS catalog_default_price,
                sr.image_url AS catalog_image_url,
                COALESCE(rp.price, sr.default_price, 0) AS unit_price
         FROM babyeyi_student_requirements bsr
         LEFT JOIN requirement_prices rp ON rp.babyeyi_id = bsr.babyeyi_id AND rp.babyeyi_requirement_id = bsr.id
         ${SQL_JOIN_STUDENT_REQ_BY_ITEM}
         WHERE bsr.babyeyi_id = ?
         ORDER BY bsr.sort_order, bsr.id`,
        [babyeyi.id]
      )
    )[0];
  }

  const requirements = (reqLines || []).map((l) => {
    const unit = Number(l.unit_price ?? 0);
    const qty = parseRequirementQuantity(l.quantity);
    const lineTotal = Math.round(unit * qty * 100) / 100;
    return {
      ...l,
      unit_price_rwf: unit,
      quantity_value: qty,
      line_total_rwf: lineTotal,
    };
  });

  const canSeeSchoolFees = at === 'FULL';
  const feeRowsScoped = canSeeSchoolFees ? (feeRows || []) : [];
  const schoolFeesTotal = feeRowsScoped.reduce((s, f) => s + Number(f.amount || 0), 0);
  const requirementsTotal = requirements.reduce((s, r) => s + Number(r.line_total_rwf || 0), 0);
  const combinedTotal = Math.round((schoolFeesTotal + requirementsTotal) * 100) / 100;

  return {
    ok: true,
    data: {
      student: {
        id: st0.id,
        first_name: st0.first_name,
        last_name: st0.last_name,
        school_id: st0.school_id,
        school_name: st0.school_name,
        class_name: st0.class_name,
        academic_year: st0.academic_year,
      },
      babyeyi,
      access_type: at,
      limited_access: at === 'LIMITED',
      permissions:
        at === 'LIMITED'
          ? ['create_payment', 'purchase_items']
          : [
              'create_payment',
              'purchase_items',
              'get_fees_breakdown',
              'get_transactions',
              'get_reports',
              'get_attendance',
              'get_discipline',
            ],
      school_fees: feeRowsScoped,
      requirements,
      totals: {
        school_fees_rwf: Math.round(schoolFeesTotal * 100) / 100,
        requirements_rwf: Math.round(requirementsTotal * 100) / 100,
        combined_rwf: combinedTotal,
      },
    },
  };
}

module.exports = { fetchClasskitPricingForStudent };
