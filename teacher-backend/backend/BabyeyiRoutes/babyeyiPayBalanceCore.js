// Remaining balance for Babyeyi public pay: aggregates PAID intents per student / line item.
'use strict';

const db = require('../config/database');
const { loadApprovedBabyeyiPricing } = require('./babyeyiPublicPricingCore');

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

function studentRowKey(s) {
  if (!s || typeof s !== 'object') return '';
  const uid = String(s.student_uid || '').trim().toUpperCase();
  const code = String(s.student_code || '').trim();
  const sdm = String(s.sdm_code || '').trim().toUpperCase();
  if (uid) return `uid:${uid}`;
  if (code) return `code:${code}`;
  if (sdm) return `sdm:${sdm}`;
  return '';
}

function studentsFromPayload(payload) {
  const arr = Array.isArray(payload?.selected_students) && payload.selected_students.length
    ? payload.selected_students
    : (payload?.selected_student ? [payload.selected_student] : []);
  return arr;
}

function roundMoney(x) {
  return Math.round(Number(x || 0) * 100) / 100;
}

async function fetchBabyeyiMetaRow(babyeyiId, schoolId) {
  const [rows] = await db.promisePool.execute(
    `SELECT id, school_id, academic_year, term, class_name, status, total_fee
     FROM school_babyeyi
     WHERE id = ? AND school_id = ? AND is_active = 1
     LIMIT 1`,
    [babyeyiId, schoolId]
  );
  return rows?.[0] || null;
}

async function loadFeesForSelection(babyeyiId, feeIds, metaRow) {
  const ids = (Array.isArray(feeIds) ? feeIds : []).map((x) => Number(x)).filter((n) => Number.isFinite(n));
  const hasSynthetic = ids.includes(-1);
  const realIds = ids.filter((n) => n !== -1);
  let fees = [];
  if (realIds.length) {
    const ph = realIds.map(() => '?').join(',');
    const [feeRows] = await db.promisePool.execute(
      `SELECT id, name, amount FROM babyeyi_payments WHERE babyeyi_id = ? AND id IN (${ph}) ORDER BY sort_order, id`,
      [babyeyiId, ...realIds]
    );
    fees = feeRows || [];
  }
  if (hasSynthetic && metaRow && Number(metaRow.total_fee) > 0) {
    fees.push({
      id: -1,
      name: 'School fee (total on document)',
      amount: Number(metaRow.total_fee),
    });
  }
  return fees;
}

async function loadReqLinesForSelection(babyeyiId, reqIds) {
  const ids = (Array.isArray(reqIds) ? reqIds : []).map((x) => parseInt(x, 10)).filter((n) => n > 0);
  if (!ids.length) return [];
  const ph = ids.map(() => '?').join(',');
  let reqRows;
  try {
    const [rows] = await db.promisePool.execute(
      `SELECT bsr.id AS babyeyi_requirement_id, bsr.item AS requirement_name, bsr.description, bsr.quantity,
              COALESCE(rp.price, sr.default_price, bsr.cost, 0) AS unit_price
       FROM babyeyi_student_requirements bsr
       LEFT JOIN requirement_prices rp ON rp.babyeyi_id = bsr.babyeyi_id AND rp.babyeyi_requirement_id = bsr.id
       ${SQL_JOIN_STUDENT_REQ_BY_ITEM}
       WHERE bsr.babyeyi_id = ? AND bsr.id IN (${ph})
       ORDER BY bsr.sort_order, bsr.id`,
      [babyeyiId, ...ids]
    );
    reqRows = rows;
  } catch (e) {
    if (e.code !== 'ER_BAD_FIELD_ERROR') throw e;
    const [rows] = await db.promisePool.execute(
      `SELECT bsr.id AS babyeyi_requirement_id, bsr.item AS requirement_name, bsr.description, bsr.quantity,
              COALESCE(rp.price, sr.default_price, 0) AS unit_price
       FROM babyeyi_student_requirements bsr
       LEFT JOIN requirement_prices rp ON rp.babyeyi_id = bsr.babyeyi_id AND rp.babyeyi_requirement_id = bsr.id
       ${SQL_JOIN_STUDENT_REQ_BY_ITEM}
       WHERE bsr.babyeyi_id = ? AND bsr.id IN (${ph})
       ORDER BY bsr.sort_order, bsr.id`,
      [babyeyiId, ...ids]
    );
    reqRows = rows;
  }
  return (reqRows || []).map((r) => {
    const qty = parseRequirementQuantity(r.quantity);
    const unit = Number(r.unit_price || 0);
    const line = roundMoney(unit * qty);
    return { ...r, quantity_value: qty, unit_price_rwf: unit, line_total_rwf: line };
  });
}

async function computePayloadSelectionTotals(babyeyiId, schoolId, payload) {
  const metaRow = await fetchBabyeyiMetaRow(babyeyiId, schoolId);
  if (!metaRow || String(metaRow.status || '') !== 'approved') return null;
  let payloadObj = payload;
  if (typeof payloadObj === 'string') {
    try {
      payloadObj = JSON.parse(payloadObj || '{}');
    } catch {
      payloadObj = {};
    }
  }
  const feeIds = Array.isArray(payloadObj?.selected_fee_ids) ? payloadObj.selected_fee_ids : [];
  const reqIds = Array.isArray(payloadObj?.selected_requirement_ids) ? payloadObj.selected_requirement_ids : [];
  const fees = await loadFeesForSelection(babyeyiId, feeIds, metaRow);
  const requirements = await loadReqLinesForSelection(babyeyiId, reqIds);
  const feesTotal = roundMoney(fees.reduce((s, f) => s + Number(f.amount || 0), 0));
  const reqTotal = roundMoney(requirements.reduce((s, r) => s + Number(r.line_total_rwf || 0), 0));
  const perStudentTotal = roundMoney(feesTotal + reqTotal);
  const studs = studentsFromPayload(payloadObj);
  const studentCount = Math.max(1, studs.length);
  const selectedTotalRwF = roundMoney(perStudentTotal * studentCount);
  return {
    metaRow,
    fees,
    requirements,
    feesTotal,
    reqTotal,
    perStudentTotal,
    studentCount,
    selectedTotalRwF,
    studentKeys: studs.map(studentRowKey).filter(Boolean),
  };
}

async function fetchPaidIntentsForBabyeyi(babyeyiId, schoolId) {
  const [rows] = await db.promisePool.execute(
    `SELECT id, total_rwf, payload_json
     FROM babyeyi_payment_intents
     WHERE babyeyi_id = ? AND school_id = ?
       AND (
         UPPER(COALESCE(invoice_status, '')) = 'PAID'
         OR LOWER(COALESCE(status, '')) = 'paid'
       )
     ORDER BY id ASC`,
    [babyeyiId, schoolId]
  );
  return rows || [];
}

function ensureMapDeep(root, key) {
  if (!root[key]) root[key] = { fee: new Map(), req: new Map() };
  return root[key];
}

/**
 * Aggregate paid RWF per student key and per fee / requirement line from historical PAID intents.
 */
async function buildPaidAllocationsByStudent(babyeyiId, schoolId) {
  const paidIntents = await fetchPaidIntentsForBabyeyi(babyeyiId, schoolId);
  /** @type {Record<string, { fee: Map<number, number>, req: Map<number, number> }>} */
  const byStudent = {};

  for (const row of paidIntents) {
    const totals = await computePayloadSelectionTotals(babyeyiId, schoolId, row.payload_json);
    if (!totals || totals.selectedTotalRwF <= 0) continue;
    const P = roundMoney(row.total_rwf);
    if (P <= 0) continue;
    const T = totals.selectedTotalRwF;
    const keys = totals.studentKeys.length ? totals.studentKeys : [];
    if (!keys.length) continue;

    for (const f of totals.fees) {
      const fid = Number(f.id);
      const amt = roundMoney(Number(f.amount || 0));
      if (amt <= 0) continue;
      const perStudentLine = roundMoney((P * amt) / T);
      for (const sk of keys) {
        const slot = ensureMapDeep(byStudent, sk);
        slot.fee.set(fid, roundMoney((slot.fee.get(fid) || 0) + perStudentLine));
      }
    }
    for (const r of totals.requirements) {
      const rid = Number(r.babyeyi_requirement_id);
      const lt = roundMoney(Number(r.line_total_rwf || 0));
      if (rid <= 0 || lt <= 0) continue;
      const perStudentLine = roundMoney((P * lt) / T);
      for (const sk of keys) {
        const slot = ensureMapDeep(byStudent, sk);
        slot.req.set(rid, roundMoney((slot.req.get(rid) || 0) + perStudentLine));
      }
    }
  }

  return byStudent;
}

/**
 * @param {object} opts
 * @param {number} opts.schoolId
 * @param {number} opts.babyeyiId
 * @param {number[]} opts.selectedFeeIds
 * @param {number[]} opts.selectedReqIds
 * @param {object[]} opts.selectedStudents
 */
async function quoteBabyeyiPayBalance(opts) {
  const schoolId = parseInt(opts.schoolId, 10);
  const babyeyiId = parseInt(opts.babyeyiId, 10);
  const selectedFeeIds = Array.isArray(opts.selectedFeeIds) ? opts.selectedFeeIds : [];
  const selectedReqIds = Array.isArray(opts.selectedReqIds) ? opts.selectedReqIds : [];
  const selectedStudents = Array.isArray(opts.selectedStudents) ? opts.selectedStudents : [];

  if (!schoolId || !babyeyiId) {
    return { ok: false, status: 400, message: 'school_id and babyeyi_id are required' };
  }

  const pricing = await loadApprovedBabyeyiPricing(babyeyiId, schoolId);
  if (!pricing.ok) {
    return { ok: false, status: pricing.status, message: pricing.message };
  }

  const meta = pricing.data.babyeyi;
  const termLabel = [meta.term, meta.academic_year].filter(Boolean).join(' · ') || 'This term';
  const combinedTotal = roundMoney(pricing.data.combined_total_rwf || 0);

  const metaRow = await fetchBabyeyiMetaRow(babyeyiId, schoolId);
  const fees = await loadFeesForSelection(babyeyiId, selectedFeeIds, metaRow);
  const requirements = await loadReqLinesForSelection(babyeyiId, selectedReqIds);

  const feeMap = new Map(fees.map((f) => [Number(f.id), f]));
  const reqMap = new Map(requirements.map((r) => [Number(r.babyeyi_requirement_id), r]));

  const paidByStudent = await buildPaidAllocationsByStudent(babyeyiId, schoolId);

  const perStudentRows = [];
  let remainingRwF = 0;
  let selectionDueRwF = 0;

  if (!selectedStudents.length) {
    return {
      ok: true,
      data: {
        term_label: termLabel,
        class_name: meta.class_name || null,
        combined_total_rwf: combinedTotal,
        selection_due_rwf: 0,
        remaining_rwf: 0,
        per_student: [],
      },
    };
  }

  const studs = selectedStudents;
  for (const st of studs) {
    const sk = studentRowKey(st);
    const slot = sk ? paidByStudent[sk] : null;
    let subRemaining = 0;
    const lines = [];

    for (const fid of selectedFeeIds.map((x) => Number(x))) {
      const f = feeMap.get(fid);
      if (!f) continue;
      const owed = roundMoney(Number(f.amount || 0));
      const paid = roundMoney(sk && slot ? slot.fee.get(fid) || 0 : 0);
      const rem = roundMoney(Math.max(0, owed - paid));
      subRemaining += rem;
      lines.push({
        kind: 'fee',
        id: fid,
        label: f.name || 'Fee',
        amount_rwf: owed,
        paid_rwf: paid,
        remaining_rwf: rem,
      });
    }
    for (const rid of selectedReqIds.map((x) => parseInt(x, 10)).filter((n) => n > 0)) {
      const r = reqMap.get(rid);
      if (!r) continue;
      const owed = roundMoney(Number(r.line_total_rwf || 0));
      const paid = roundMoney(sk && slot ? slot.req.get(rid) || 0 : 0);
      const rem = roundMoney(Math.max(0, owed - paid));
      subRemaining += rem;
      lines.push({
        kind: 'requirement',
        id: rid,
        label: r.requirement_name || 'Requirement',
        amount_rwf: owed,
        paid_rwf: paid,
        remaining_rwf: rem,
      });
    }

    selectionDueRwF += roundMoney(
      fees.reduce((s, f) => s + Number(f.amount || 0), 0)
        + requirements.reduce((s, r) => s + Number(r.line_total_rwf || 0), 0)
    );
    remainingRwF += subRemaining;

    perStudentRows.push({
      student_key: sk || null,
      student_name: String(st.student_name || `${st.first_name || ''} ${st.last_name || ''}`.trim() || 'Student'),
      class_name: st.class_name || null,
      remaining_rwf: roundMoney(subRemaining),
      lines,
    });
  }

  return {
    ok: true,
    data: {
      term_label: termLabel,
      class_name: meta.class_name || null,
      combined_total_rwf: combinedTotal,
      selection_due_rwf: roundMoney(selectionDueRwF),
      remaining_rwf: roundMoney(remainingRwF),
      per_student: perStudentRows,
    },
  };
}

const OVERPAY_EPSILON = 1.5;

/**
 * @returns {Promise<{ ok: true } | { ok: false, status: number, message: string, code?: string, details?: object }>}
 */
async function validateBabyeyiPaymentAgainstBalance(body) {
  const payMode = String(body?.payment_plan?.payMode || '').trim().toLowerCase();
  const payMethod = String(body?.payment_plan?.method || '').trim().toLowerCase();
  if (payMode === 'loan' || payMethod === 'loan') {
    return { ok: true };
  }

  const schoolId = parseInt(body.school_id, 10);
  const babyeyiId = parseInt(body.babyeyi_id, 10);
  const totalRwf = roundMoney(body.total_rwf);
  const selectedFeeIds = body.selected_fee_ids || [];
  const selectedReqIds = body.selected_requirement_ids || [];
  const selectedStudents = Array.isArray(body.selected_students)
    ? body.selected_students
    : (body.selected_student ? [body.selected_student] : []);

  if (!schoolId || !babyeyiId || selectedStudents.length === 0) {
    return { ok: true };
  }

  const quote = await quoteBabyeyiPayBalance({
    schoolId,
    babyeyiId,
    selectedFeeIds,
    selectedReqIds,
    selectedStudents,
  });

  if (!quote.ok) return { ok: true };

  const remaining = roundMoney(quote.data.remaining_rwf);
  if (totalRwf <= remaining + OVERPAY_EPSILON) {
    return { ok: true };
  }

  const excess = roundMoney(totalRwf - remaining);
  const term = quote.data.term_label ? ` (${quote.data.term_label})` : '';
  const msg =
    remaining <= 0
      ? `This amount exceeds what is still owed for the selected items on this Babyeyi document${term}. Our records show no remaining balance for this selection. If you believe this is incorrect, please contact the school office with your proof of payment.`
      : `The amount you entered is higher than the remaining balance for this term${term}. For your current selection, the outstanding total is ${remaining.toLocaleString(
          'en-RW'
        )} RWF, while you are attempting to pay ${totalRwf.toLocaleString('en-RW')} RWF (${excess.toLocaleString(
          'en-RW'
        )} RWF above the balance). Please adjust the payment to the outstanding amount, or contact the school if you need a correction.`;

  return {
    ok: false,
    status: 400,
    code: 'BABYEYI_OVERPAY',
    message: msg,
    details: {
      remaining_rwf: remaining,
      attempted_rwf: totalRwf,
      excess_rwf: excess,
      term_label: quote.data.term_label,
    },
  };
}

module.exports = {
  quoteBabyeyiPayBalance,
  validateBabyeyiPaymentAgainstBalance,
  studentRowKey,
  buildPaidAllocationsByStudent,
};
