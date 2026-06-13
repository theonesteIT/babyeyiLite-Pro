// Shared: approved Babyeyi school fees + requirement lines (guest / public pay).
// Used by publicBabyeyiPay GET /pricing and publicPaySchoolFlow.
//
// When the school manager soft-deletes a Babyeyi, pricing falls back to
// accountant_babyeyi_fee_archive.snapshot_json so Public Pay / balance logic
// stays aligned with what was saved (and what accountants may edit).

'use strict';

const db = require('../config/database');
const { inferFeeCategory } = require('../utils/feeCategoryInfer');

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

/** Babyeyi rows may legitimately use id 0 in legacy DBs — do not treat 0 as missing. */
function isValidBabyeyiId(id) {
  const n = parseInt(id, 10);
  return Number.isFinite(n) && n >= 0;
}

function isValidSchoolId(id) {
  const n = parseInt(id, 10);
  return Number.isFinite(n) && n > 0;
}

function roundMoney(x) {
  return Math.round(Number(x || 0) * 100) / 100;
}

async function fetchAccountantArchive(babyeyiId, schoolId) {
  const [rows] = await db.promisePool
    .execute(
      `SELECT id, school_id, babyeyi_id, academic_year, term, class_name, classes_json, snapshot_json, babyeyi_is_active
       FROM accountant_babyeyi_fee_archive
       WHERE babyeyi_id = ? AND school_id = ?
       LIMIT 1`,
      [babyeyiId, schoolId]
    )
    .catch(() => [[]]);
  return rows?.[0] || null;
}

function finalizePricingPayload(meta, feeRows, feeRowsHavePayChannel, mappedLines) {
  const pasAtSchool = mappedLines.filter((l) => l.pay_channel === 'school');
  const requirements = mappedLines.filter((l) => l.pay_channel !== 'school');

  const pasFeeRows = pasAtSchool.map((l) => ({
    id: `pasreq:${l.babyeyi_requirement_id}`,
    selection_key: `pasreq:${l.babyeyi_requirement_id}`,
    name: l.requirement_name || 'Requirement',
    amount: l.line_total_rwf,
    unit_price_rwf: l.unit_price_rwf,
    quantity_value: l.quantity_value,
    pay_source: 'requirement_paid_at_school',
    fee_category: inferFeeCategory(l.requirement_name, 'requirement_paid_at_school'),
    babyeyi_requirement_id: l.babyeyi_requirement_id,
    sort_order: 900000 + l.babyeyi_requirement_id,
  }));

  const payLines = feeRowsHavePayChannel
    ? feeRows
    : (feeRows || []).map((f) => ({ ...f, pay_channel: 'babyeyi' }));
  const onlinePaymentRows = (payLines || []).filter(
    (f) => String(f.pay_channel || 'babyeyi').toLowerCase() !== 'school'
  );
  const schoolChannelPaymentRows = (payLines || []).filter(
    (f) => String(f.pay_channel || 'babyeyi').toLowerCase() === 'school'
  );
  const pasPayFeeRows = schoolChannelPaymentRows.map((f) => ({
    id: `paspay:${f.id}`,
    selection_key: `paspay:${f.id}`,
    name: f.name,
    amount: Number(f.amount || 0),
    pay_source: 'payment_paid_at_school',
    fee_category: inferFeeCategory(f.name, 'payment_paid_at_school'),
    babyeyi_payment_id: Number(f.id),
    sort_order: 850000 + Number(f.id),
  }));

  const requirementsTotal = requirements.reduce((s, l) => s + l.line_total_rwf, 0);
  const baseSchoolFeesTotal = onlinePaymentRows.reduce((s, f) => s + Number(f.amount || 0), 0);
  const pasSchoolTotal =
    pasFeeRows.reduce((s, f) => s + Number(f.amount || 0), 0) +
    pasPayFeeRows.reduce((s, f) => s + Number(f.amount || 0), 0);
  const schoolFeesTotal = baseSchoolFeesTotal + pasSchoolTotal;

  let onlinePayIdx = 0;
  const schoolFeesNormalized = [
    ...onlinePaymentRows.map((f) => {
      const sortOrd = f.sort_order != null ? Number(f.sort_order) : onlinePayIdx;
      const selectionKey = `pay:${onlinePayIdx}:${Number(f.id)}`;
      onlinePayIdx += 1;
      return {
        id: Number(f.id),
        selection_key: selectionKey,
        name: f.name,
        amount: Number(f.amount || 0),
        sort_order: sortOrd,
        pay_source: 'babyeyi_online',
        fee_category: inferFeeCategory(f.name),
      };
    }),
    ...pasFeeRows,
    ...pasPayFeeRows,
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

function mapSnapshotRequirementsToLines(snapshotReqs, hasPayChannelCol) {
  return (snapshotReqs || []).map((r) => {
    const ch = hasPayChannelCol
      ? String(r.pay_channel || 'babyeyi').toLowerCase() === 'school'
        ? 'school'
        : 'babyeyi'
      : 'babyeyi';
    const qty = parseRequirementQuantity(r.quantity);
    const storedSchoolLine = ch === 'school' ? Number(r.cost ?? r.school_line_rwf ?? 0) : 0;
    let unit;
    let lineTotal;
    if (storedSchoolLine > 0) {
      lineTotal = roundMoney(storedSchoolLine);
      unit = qty > 1 ? roundMoney(lineTotal / qty) : lineTotal;
    } else if (r.line_total_rwf != null && Number(r.line_total_rwf) >= 0) {
      lineTotal = roundMoney(Number(r.line_total_rwf));
      unit = qty > 1 ? roundMoney(lineTotal / qty) : lineTotal;
    } else {
      unit = Number(r.unit_price ?? 0);
      lineTotal = roundMoney(unit * qty);
    }
    return {
      babyeyi_requirement_id: Number(r.id),
      requirement_name: r.item,
      description: r.description,
      quantity: r.quantity,
      pay_channel: ch,
      unit_price_rwf: unit,
      quantity_value: qty,
      line_total_rwf: lineTotal,
      price: lineTotal,
      catalog_image_url: null,
    };
  });
}

function pricingMetaFromArchive(arch, liveRow, bid, sid, schoolExtras) {
  let snapshot = {};
  try {
    snapshot = arch.snapshot_json ? JSON.parse(arch.snapshot_json) : {};
  } catch (_) {
    snapshot = {};
  }
  const totalFromSnapshot =
    (snapshot.payments || []).reduce((s, p) => s + Number(p.amount || 0), 0) +
    (snapshot.requirements || []).reduce((s, r) => {
      const ch = String(r.pay_channel || 'babyeyi').toLowerCase();
      if (ch === 'school') return s + Number(r.cost || r.line_total_rwf || 0);
      return s + Number(r.line_total_rwf || 0);
    }, 0);

  return {
    id: bid,
    school_id: sid,
    academic_year: arch.academic_year,
    term: arch.term,
    class_name: arch.class_name,
    status: 'approved',
    total_fee: totalFromSnapshot || (liveRow ? Number(liveRow.total_fee || 0) : 0),
    school_name: schoolExtras?.school_name || liveRow?.school_name || null,
    district: schoolExtras?.district || liveRow?.district || null,
    sector: schoolExtras?.sector || liveRow?.sector || null,
    pricing_source: 'accountant_archive',
    live_babyeyi_active: !!(liveRow && Number(liveRow.is_active) === 1),
  };
}

async function buildPricingFromAccountantArchive(arch, liveRow, bid, sid) {
  let snapshot = {};
  try {
    snapshot = arch.snapshot_json ? JSON.parse(arch.snapshot_json) : {};
  } catch (_) {
    snapshot = {};
  }

  let schoolRow = null;
  try {
    const [schoolRows] = await db.promisePool.execute(
      `SELECT school_name, district, sector FROM schools WHERE id = ? LIMIT 1`,
      [sid]
    );
    schoolRow = schoolRows?.[0] || null;
  } catch (_) {
    schoolRow = null;
  }

  const meta = pricingMetaFromArchive(arch, liveRow, bid, sid, schoolRow || {});

  let feeRows = (snapshot.payments || []).map((p) => ({
    id: p.id,
    name: p.name,
    amount: Number(p.amount || 0),
    sort_order: p.sort_order != null ? p.sort_order : 0,
    pay_channel: String(p.pay_channel || 'babyeyi').toLowerCase() === 'school' ? 'school' : 'babyeyi',
  }));
  const feeRowsHavePayChannel = true;

  if (!feeRows.length && Number(meta.total_fee) > 0) {
    feeRows = [
      {
        id: -1,
        name: 'School fee (total on document)',
        amount: Number(meta.total_fee),
        sort_order: 0,
        pay_channel: 'babyeyi',
      },
    ];
  }

  const mappedLines = mapSnapshotRequirementsToLines(snapshot.requirements, true);
  return finalizePricingPayload(meta, feeRows, feeRowsHavePayChannel, mappedLines);
}

/**
 * @returns {Promise<{ ok: true, data: object } | { ok: false, status: number, message: string }>}
 */
async function loadApprovedBabyeyiPricing(babyeyiId, schoolId) {
  const bid = parseInt(babyeyiId, 10);
  const sid = parseInt(schoolId, 10);
  if (!isValidBabyeyiId(bid) || !isValidSchoolId(sid)) {
    return { ok: false, status: 400, message: 'babyeyiId and school_id are required' };
  }

  const [metaRows] = await db.promisePool.execute(
    `SELECT sb.id, sb.school_id, sb.academic_year, sb.term, sb.class_name, sb.status, sb.total_fee, sb.is_active,
            s.school_name, s.district, s.sector
     FROM school_babyeyi sb
     LEFT JOIN schools s ON s.id = sb.school_id
     WHERE sb.id = ? AND sb.school_id = ?
     LIMIT 1`,
    [bid, sid]
  );
  const liveRow = metaRows?.[0] || null;
  const archiveRow = await fetchAccountantArchive(bid, sid);

  const useLive = liveRow && Number(liveRow.is_active) === 1 && liveRow.status === 'approved';

  if (!useLive) {
    if (archiveRow) {
      return buildPricingFromAccountantArchive(archiveRow, liveRow, bid, sid);
    }
    if (!liveRow) {
      return { ok: false, status: 404, message: 'Babyeyi not found' };
    }
    return { ok: false, status: 404, message: 'Document not available' };
  }

  const meta = liveRow;

  let feeRows = [];
  let feeRowsHavePayChannel = true;
  try {
    feeRows = await db.query(
      `SELECT id, name, amount, sort_order, COALESCE(pay_channel, 'babyeyi') AS pay_channel
       FROM babyeyi_payments WHERE babyeyi_id = ? ORDER BY sort_order, id`,
      [bid]
    );
  } catch (e) {
    if (e.code !== 'ER_BAD_FIELD_ERROR') throw e;
    feeRowsHavePayChannel = false;
    feeRows = await db.query(
      `SELECT id, name, amount, sort_order FROM babyeyi_payments WHERE babyeyi_id = ? ORDER BY sort_order, id`,
      [bid]
    );
  }
  if ((!feeRows || feeRows.length === 0) && Number(meta.total_fee) > 0) {
    feeRows = [
      {
        id: -1,
        name: 'School fee (total on document)',
        amount: Number(meta.total_fee),
        sort_order: 0,
        pay_channel: 'babyeyi',
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

  meta.pricing_source = meta.pricing_source || 'live_babyeyi';
  return finalizePricingPayload(meta, feeRows, feeRowsHavePayChannel, mappedLines);
}

module.exports = { loadApprovedBabyeyiPricing, isValidBabyeyiId, isValidSchoolId };
