// Shared: approved Babyeyi school fees + requirement lines (guest / public pay).
// Used by publicBabyeyiPay GET /pricing and publicPaySchoolFlow.

'use strict';

const db = require('../config/database');

const SQL_JOIN_STUDENT_REQ_BY_ITEM = `LEFT JOIN student_requirements sr ON CONVERT(TRIM(LOWER(sr.name)) USING utf8mb4) COLLATE utf8mb4_unicode_ci = CONVERT(TRIM(LOWER(bsr.item)) USING utf8mb4) COLLATE utf8mb4_unicode_ci`;

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
 * @returns {Promise<{ ok: true, data: object } | { ok: false, status: number, message: string }>}
 */
async function loadApprovedBabyeyiPricing(babyeyiId, schoolId) {
  const bid = parseInt(babyeyiId, 10);
  const sid = parseInt(schoolId, 10);
  if (!bid || !sid) {
    return { ok: false, status: 400, message: 'babyeyiId and school_id are required' };
  }

  const [metaRows] = await db.promisePool.execute(
    `SELECT sb.id, sb.school_id, sb.academic_year, sb.term, sb.class_name, sb.status, sb.total_fee,
            s.school_name, s.district, s.sector
     FROM school_babyeyi sb
     LEFT JOIN schools s ON s.id = sb.school_id
     WHERE sb.id = ? AND sb.school_id = ? AND sb.is_active = 1 LIMIT 1`,
    [bid, sid]
  );
  if (!metaRows.length) {
    return { ok: false, status: 404, message: 'Babyeyi not found' };
  }
  const meta = metaRows[0];
  if (meta.status !== 'approved') {
    return { ok: false, status: 404, message: 'Document not available' };
  }

  let feeRows = await db.query(
    `SELECT id, name, amount, sort_order FROM babyeyi_payments WHERE babyeyi_id = ? ORDER BY sort_order, id`,
    [bid]
  );
  if ((!feeRows || feeRows.length === 0) && Number(meta.total_fee) > 0) {
    feeRows = [
      {
        id: -1,
        name: 'School fee (total on document)',
        amount: Number(meta.total_fee),
        sort_order: 0,
      },
    ];
  }

  let reqLines;
  try {
    reqLines = await db.query(
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
      [bid]
    );
  } catch (e) {
    if (e.code !== 'ER_BAD_FIELD_ERROR') throw e;
    reqLines = await db.query(
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
      [bid]
    );
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
      price: lineTotal,
    };
  });

  const requirementsTotal = requirements.reduce((s, l) => s + l.line_total_rwf, 0);
  const schoolFeesTotal = (feeRows || []).reduce((s, f) => s + Number(f.amount || 0), 0);

  return {
    ok: true,
    data: {
      babyeyi: meta,
      school_fees: feeRows || [],
      school_fees_total_rwf: Math.round(schoolFeesTotal * 100) / 100,
      requirements,
      requirements_total_rwf: Math.round(requirementsTotal * 100) / 100,
      combined_total_rwf: Math.round((schoolFeesTotal + requirementsTotal) * 100) / 100,
    },
  };
}

module.exports = { loadApprovedBabyeyiPricing };
