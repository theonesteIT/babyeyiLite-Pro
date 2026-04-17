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

function roundMoney(x) {
  return Math.round(Number(x || 0) * 100) / 100;
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
  let hasPayChannelCol = true;
  try {
    reqLines = await db.query(
      `SELECT bsr.id AS babyeyi_requirement_id, bsr.item AS requirement_name, bsr.description, bsr.quantity,
              COALESCE(bsr.pay_channel, 'babyeyi') AS pay_channel,
              bsr.cost AS school_line_rwf,
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
    hasPayChannelCol = false;
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
  }

  const mappedLines = (reqLines || []).map((l) => {
    const ch = hasPayChannelCol ? String(l.pay_channel || 'babyeyi').toLowerCase() : 'babyeyi';
    const qty = parseRequirementQuantity(l.quantity);
    const storedSchoolLine =
      hasPayChannelCol && ch === 'school' ? Number(l.school_line_rwf ?? l.cost ?? 0) : 0;
    let unit;
    let lineTotal;
    if (storedSchoolLine > 0) {
      lineTotal = roundMoney(storedSchoolLine);
      unit = qty > 1 ? roundMoney(lineTotal / qty) : lineTotal;
    } else {
      unit = Number(l.unit_price ?? 0);
      lineTotal = roundMoney(unit * qty);
    }
    return {
      ...l,
      pay_channel: ch,
      babyeyi_requirement_id: Number(l.babyeyi_requirement_id),
      unit_price_rwf: unit,
      quantity_value: qty,
      line_total_rwf: lineTotal,
      price: lineTotal,
    };
  });

  const pasAtSchool = mappedLines.filter((l) => l.pay_channel === 'school');
  const requirements = mappedLines.filter((l) => l.pay_channel !== 'school');

  const pasFeeRows = pasAtSchool.map((l) => ({
    id: `pasreq:${l.babyeyi_requirement_id}`,
    name: l.requirement_name || 'Requirement',
    amount: l.line_total_rwf,
    unit_price_rwf: l.unit_price_rwf,
    quantity_value: l.quantity_value,
    pay_source: 'requirement_paid_at_school',
    babyeyi_requirement_id: l.babyeyi_requirement_id,
    sort_order: 900000 + l.babyeyi_requirement_id,
  }));

  const requirementsTotal = requirements.reduce((s, l) => s + l.line_total_rwf, 0);
  const baseSchoolFeesTotal = (feeRows || []).reduce((s, f) => s + Number(f.amount || 0), 0);
  const pasSchoolTotal = pasFeeRows.reduce((s, f) => s + Number(f.amount || 0), 0);
  const schoolFeesTotal = baseSchoolFeesTotal + pasSchoolTotal;

  const schoolFeesNormalized = [
    ...(feeRows || []).map((f) => ({
      id: Number(f.id),
      name: f.name,
      amount: Number(f.amount || 0),
      sort_order: f.sort_order != null ? Number(f.sort_order) : undefined,
    })),
    ...pasFeeRows,
  ];

  return {
    ok: true,
    data: {
      babyeyi: meta,
      school_fees: schoolFeesNormalized,
      school_fees_total_rwf: Math.round(schoolFeesTotal * 100) / 100,
      requirements,
      requirements_total_rwf: Math.round(requirementsTotal * 100) / 100,
      combined_total_rwf: Math.round((schoolFeesTotal + requirementsTotal) * 100) / 100,
    },
  };
}

module.exports = { loadApprovedBabyeyiPricing };
