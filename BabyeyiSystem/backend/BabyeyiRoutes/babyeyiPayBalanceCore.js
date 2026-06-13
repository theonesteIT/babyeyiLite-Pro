// Remaining balance for Babyeyi public pay: aggregates PAID intents per student / line item.
'use strict';

const db = require('../config/database');
const { loadApprovedBabyeyiPricing, isValidBabyeyiId, isValidSchoolId } = require('./babyeyiPublicPricingCore');
const { resolveSchoolIdFromInput } = require('./schoolResolvePublic');

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

/** Fee id keys: "pay:<idx>:<id>", numeric babyeyi_payments.id, "pasreq:<bsr_id>", or "paspay:<payment_id>". */
function feeRowKeyFromId(id) {
  if (id == null) return id;
  const s = String(id);
  if (s.startsWith('pasreq:') || s.startsWith('paspay:') || s.startsWith('pay:')) return s;
  const n = Number(id);
  return Number.isFinite(n) ? n : s;
}

function feeRowKeyFromPricingRow(f) {
  if (!f) return null;
  if (f.selection_key) return feeRowKeyFromId(f.selection_key);
  return feeRowKeyFromId(f.id);
}

function feePaidFromSlot(slot, fid, feeRow) {
  if (!slot) return 0;
  const k = feeRowKeyFromId(fid);
  let paid = roundMoney(slot.fee.get(k) || 0);
  if (paid <= 0 && feeRow && feeRow.id != null && String(k).startsWith('pay:')) {
    paid = roundMoney(slot.fee.get(feeRowKeyFromId(feeRow.id)) || 0);
  }
  return paid;
}

/**
 * Meta row for balance math — mirrors live school_babyeyi when possible, otherwise synthetic
 * when pricing is served from accountant archive (manager deleted Babyeyi).
 */
async function fetchBabyeyiMetaRow(babyeyiId, schoolId) {
  const pr = await loadApprovedBabyeyiPricing(babyeyiId, schoolId);
  if (pr.ok) {
    const b = pr.data.babyeyi;
    const inactive = b.live_babyeyi_active === false;
    return {
      id: babyeyiId,
      school_id: schoolId,
      academic_year: b.academic_year,
      term: b.term,
      class_name: b.class_name,
      status: 'approved',
      total_fee: b.total_fee,
      is_active: inactive ? 0 : 1,
    };
  }
  const [rows] = await db.promisePool.execute(
    `SELECT id, school_id, academic_year, term, class_name, status, total_fee, is_active
     FROM school_babyeyi WHERE id = ? AND school_id = ? LIMIT 1`,
    [babyeyiId, schoolId]
  );
  return rows?.[0] || null;
}

/** Resolve selected fee lines using the same JSON as GET /public/babyeyi-pay/pricing (live or archive). */
async function loadFeesForSelection(babyeyiId, feeIds, metaRow) {
  const rawList = Array.isArray(feeIds) ? feeIds : [];
  const schoolId = metaRow?.school_id != null ? parseInt(metaRow.school_id, 10) : null;
  if (!schoolId) return [];

  const pr = await loadApprovedBabyeyiPricing(babyeyiId, schoolId);
  if (!pr.ok) return [];

  const map = new Map();
  for (const f of pr.data.school_fees || []) {
    map.set(feeRowKeyFromPricingRow(f), f);
  }

  const fees = [];
  for (const raw of rawList) {
    let k = feeRowKeyFromId(raw);
    let f = map.get(k);
    if (!f && Number.isFinite(Number(raw)) && !String(raw).startsWith('pay:')) {
      f = (pr.data.school_fees || []).find((row) => Number(row.id) === Number(raw));
      if (f) k = feeRowKeyFromPricingRow(f);
    }
    if (!f) continue;
    fees.push({
      id: k,
      selection_key: f.selection_key || k,
      legacy_id: f.id,
      name: f.name || 'Fee item',
      amount: roundMoney(Number(f.amount || 0)),
      fee_category: f.fee_category || null,
      pay_source: f.pay_source || null,
    });
  }
  return fees;
}

async function loadReqLinesForSelection(babyeyiId, reqIds, schoolId) {
  const ids = (Array.isArray(reqIds) ? reqIds : []).map((x) => parseInt(x, 10)).filter((n) => Number.isFinite(n) && n >= 0);
  if (!ids.length || !schoolId) return [];

  const pr = await loadApprovedBabyeyiPricing(babyeyiId, schoolId);
  if (!pr.ok) return [];

  const byId = new Map(
    (pr.data.requirements || []).map((r) => [Number(r.babyeyi_requirement_id), r])
  );
  return ids.map((id) => byId.get(id)).filter(Boolean);
}

/**
 * Fee + requirement rows exactly as on GET /babyeyi-pay/pricing (what parents see).
 * Using this for “whole document” remaining avoids DB round-trips drifting from that payload.
 */
function normalizeCatalogFromPricing(pricingData) {
  const feeIds = [];
  const feeRows = [];
  for (const f of pricingData?.school_fees || []) {
    const key = feeRowKeyFromPricingRow(f);
    if (key == null || key === '') continue;
    feeIds.push(key);
    feeRows.push({
      id: key,
      selection_key: f?.selection_key || key,
      legacy_id: f?.id,
      name: f?.name,
      amount: roundMoney(Number(f?.amount || 0)),
      fee_category: f?.fee_category || null,
    });
  }
  const reqIds = [];
  const reqRows = [];
  for (const r of pricingData?.requirements || []) {
    const rid = Number(r?.babyeyi_requirement_id);
    if (!Number.isFinite(rid) || rid < 0) continue;
    reqIds.push(rid);
    reqRows.push({
      babyeyi_requirement_id: rid,
      requirement_name: r?.requirement_name || r?.item,
      line_total_rwf: roundMoney(Number(r?.line_total_rwf ?? r?.price ?? 0)),
    });
  }
  return { feeIds, reqIds, feeRows, reqRows };
}

function paidOnCatalogLines(sk, slot, catalogFeeIds, catalogReqIds) {
  if (!sk || !slot) return 0;
  let s = 0;
  for (const fid of catalogFeeIds) {
    const k = feeRowKeyFromId(fid);
    s += roundMoney(slot.fee.get(k) || 0);
  }
  for (const rid of catalogReqIds) {
    s += roundMoney(slot.req.get(Number(rid)) || 0);
  }
  return roundMoney(s);
}

async function computePayloadSelectionTotals(babyeyiId, schoolId, payload) {
  const prCheck = await loadApprovedBabyeyiPricing(babyeyiId, schoolId);
  if (!prCheck.ok) return null;
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
  const feeMeta = { school_id: schoolId };
  const fees = await loadFeesForSelection(babyeyiId, feeIds, feeMeta);
  const requirements = await loadReqLinesForSelection(babyeyiId, reqIds, schoolId);
  const feesTotal = roundMoney(fees.reduce((s, f) => s + Number(f.amount || 0), 0));
  const reqTotal = roundMoney(requirements.reduce((s, r) => s + Number(r.line_total_rwf || 0), 0));
  const perStudentTotal = roundMoney(feesTotal + reqTotal);
  const studs = studentsFromPayload(payloadObj);
  const studentCount = Math.max(1, studs.length);
  const selectedTotalRwF = roundMoney(perStudentTotal * studentCount);
  return {
    metaRow: await fetchBabyeyiMetaRow(babyeyiId, schoolId),
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
      const fid = feeRowKeyFromId(f.selection_key || f.id);
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

/** Sum remaining RWF for one student across given fee + requirement lines (catalog ids). */
function sumRemainingForOneStudent(st, feeIdArr, reqIdArr, feeRows, reqRows, paidByStudent) {
  const feeMap = new Map((feeRows || []).map((f) => [feeRowKeyFromId(f.id), f]));
  const reqMap = new Map((reqRows || []).map((r) => [Number(r.babyeyi_requirement_id), r]));
  const sk = studentRowKey(st);
  const slot = sk ? paidByStudent[sk] : null;
  let sub = 0;
  for (const raw of feeIdArr) {
    const fid = feeRowKeyFromId(raw);
    const f = feeMap.get(fid);
    if (!f) continue;
    const owed = roundMoney(Number(f.amount || 0));
    const paid = roundMoney(sk && slot ? slot.fee.get(fid) || 0 : 0);
    sub += roundMoney(Math.max(0, owed - paid));
  }
  for (const rid of reqIdArr.map((x) => parseInt(x, 10)).filter((n) => Number.isFinite(n) && n >= 0)) {
    const r = reqMap.get(rid);
    if (!r) continue;
    const owed = roundMoney(Number(r.line_total_rwf || 0));
    const paid = roundMoney(sk && slot ? slot.req.get(rid) || 0 : 0);
    sub += roundMoney(Math.max(0, owed - paid));
  }
  return roundMoney(sub);
}

/**
 * @param {object} opts
 * @param {number} opts.schoolId
 * @param {number} opts.babyeyiId
 * @param {number[]} opts.selectedFeeIds
 * @param {number[]} opts.selectedReqIds
 * @param {object[]} opts.selectedStudents
 */
/** Parent-declared cash already paid at school counter (this session), keyed like fee ids e.g. "pasreq:12". Reduces quoted remaining only for those lines. */
function schoolCounterCreditsMap(opts) {
  const raw = opts?.school_counter_credits_rwf ?? opts?.schoolCounterCreditsRwf ?? null;
  if (!raw || typeof raw !== 'object') return new Map();
  const m = new Map();
  for (const [k0, v] of Object.entries(raw)) {
    const k = String(k0 || '').trim();
    if (!k.startsWith('pasreq:') && !k.startsWith('paspay:')) continue;
    const n = roundMoney(Number(v));
    if (n > 0) m.set(k, n);
  }
  return m;
}

async function quoteBabyeyiPayBalance(opts) {
  let schoolId = parseInt(opts.schoolId, 10);
  if (!schoolId && (opts.school_code || opts.schoolCode)) {
    const resolved = await resolveSchoolIdFromInput(opts);
    schoolId = resolved.schoolId;
  }
  const babyeyiId = parseInt(opts.babyeyiId, 10);
  const selectedFeeIds = Array.isArray(opts.selectedFeeIds) ? opts.selectedFeeIds : [];
  const selectedReqIds = Array.isArray(opts.selectedReqIds) ? opts.selectedReqIds : [];
  const selectedStudents = Array.isArray(opts.selectedStudents) ? opts.selectedStudents : [];
  const schoolCredits = schoolCounterCreditsMap(opts);

  if (!isValidSchoolId(schoolId) || !isValidBabyeyiId(babyeyiId)) {
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
  const requirements = await loadReqLinesForSelection(babyeyiId, selectedReqIds, schoolId);

  const feeMap = new Map(fees.map((f) => [feeRowKeyFromId(f.id), f]));
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
        remaining_full_document_rwf: 0,
        remaining_unselected_lines_rwf: 0,
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

    for (const raw of selectedFeeIds) {
      const fid = feeRowKeyFromId(raw);
      const f = feeMap.get(fid);
      if (!f) continue;
      const owed = roundMoney(Number(f.amount || 0));
      const paid = roundMoney(sk && slot ? feePaidFromSlot(slot, fid, f) : 0);
      const declared =
        String(fid).startsWith('pasreq:') || String(fid).startsWith('paspay:')
          ? roundMoney(Math.min(owed, schoolCredits.get(String(fid)) || 0))
          : 0;
      const rem = roundMoney(Math.max(0, owed - paid - declared));
      subRemaining += rem;
      lines.push({
        kind: 'fee',
        id: fid,
        label: f.name || 'Fee',
        amount_rwf: owed,
        paid_rwf: paid,
        school_counter_declared_rwf: declared > 0 ? declared : undefined,
        remaining_rwf: rem,
      });
    }
    for (const rid of selectedReqIds.map((x) => parseInt(x, 10)).filter((n) => Number.isFinite(n) && n >= 0)) {
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

  const { feeIds: catalogFeeIds, reqIds: catalogReqIds, feeRows: allCatalogFees, reqRows: allCatalogReqs } =
    normalizeCatalogFromPricing(pricing.data);
  const grossOneStudentCatalog = roundMoney(
    allCatalogFees.reduce((s, f) => s + Number(f.amount || 0), 0) +
      allCatalogReqs.reduce((s, r) => s + Number(r.line_total_rwf || 0), 0)
  );
  let remainingFullDocumentRwF = 0;
  for (const st of studs) {
    const sk = studentRowKey(st);
    const slot = sk ? paidByStudent[sk] : null;
    const lineRem = sumRemainingForOneStudent(
      st,
      catalogFeeIds,
      catalogReqIds,
      allCatalogFees,
      allCatalogReqs,
      paidByStudent
    );
    const paidCat = paidOnCatalogLines(sk, slot, catalogFeeIds, catalogReqIds);
    const floorRem = roundMoney(Math.max(0, grossOneStudentCatalog - paidCat));
    remainingFullDocumentRwF += roundMoney(Math.max(lineRem, floorRem));
  }
  remainingFullDocumentRwF = roundMoney(remainingFullDocumentRwF);
  const allStudentsZeroPaidOnCatalog = studs.every((st) => {
    const sk0 = studentRowKey(st);
    const slot0 = sk0 ? paidByStudent[sk0] : null;
    return paidOnCatalogLines(sk0, slot0, catalogFeeIds, catalogReqIds) < 0.01;
  });
  if (combinedTotal > 0 && allStudentsZeroPaidOnCatalog) {
    const floorTotal = roundMoney(combinedTotal * studs.length);
    remainingFullDocumentRwF = roundMoney(Math.max(remainingFullDocumentRwF, floorTotal));
  }
  const remainingUnselectedLinesRwF = roundMoney(Math.max(0, remainingFullDocumentRwF - roundMoney(remainingRwF)));

  let selectionPaidRwF = 0;
  for (const row of perStudentRows) {
    for (const line of row.lines || []) {
      selectionPaidRwF += roundMoney(Number(line.paid_rwf || 0));
    }
  }
  selectionPaidRwF = roundMoney(selectionPaidRwF);

  return {
    ok: true,
    data: {
      term_label: termLabel,
      class_name: meta.class_name || null,
      combined_total_rwf: combinedTotal,
      selection_due_rwf: roundMoney(selectionDueRwF),
      selection_paid_rwf: selectionPaidRwF,
      remaining_rwf: roundMoney(remainingRwF),
      /** All published fee + requirement lines on this Babyeyi (not only checked items). */
      remaining_full_document_rwf: remainingFullDocumentRwF,
      /** Portion of document still owed on lines you did not include in this payment’s selection. */
      remaining_unselected_lines_rwf: remainingUnselectedLinesRwF,
      per_student: perStudentRows,
    },
  };
}

/**
 * @returns {Promise<{ ok: true } | { ok: false, status: number, message: string, code?: string, details?: object }>}
 */
async function validateBabyeyiPaymentAgainstBalance(body) {
  const payMode = String(body?.payment_plan?.payMode || '').trim().toLowerCase();
  const payMethod = String(body?.payment_plan?.method || '').trim().toLowerCase();
  if (payMode === 'loan' || payMethod === 'loan' || payMethod === 'shule_avance') {
    return { ok: true };
  }

  const resolved = await resolveSchoolIdFromInput(body);
  const schoolId = resolved.schoolId;
  const babyeyiId = parseInt(body.babyeyi_id, 10);
  const selectedFeeIds = body.selected_fee_ids || [];
  const selectedReqIds = body.selected_requirement_ids || [];
  const selectedStudents = Array.isArray(body.selected_students)
    ? body.selected_students
    : (body.selected_student ? [body.selected_student] : []);

  if (!isValidSchoolId(schoolId) || !isValidBabyeyiId(babyeyiId) || selectedStudents.length === 0) {
    return { ok: true };
  }

  const quote = await quoteBabyeyiPayBalance({
    schoolId,
    babyeyiId,
    selectedFeeIds,
    selectedReqIds,
    selectedStudents,
    school_counter_credits_rwf: body.school_counter_credits_rwf ?? body.schoolCounterCreditsRwf ?? null,
  });

  if (!quote.ok) return { ok: true };

  // Allow top-up amounts above current remaining balance.
  // Frontend still enforces minimum selected requirements/items amount.
  return { ok: true };
}

async function buildSelectedFeeLines(babyeyiId, feeIds, schoolId) {
  const metaRow = { school_id: schoolId };
  const fees = await loadFeesForSelection(babyeyiId, feeIds, metaRow);
  return fees.map((f) => ({
    selection_key: f.selection_key || feeRowKeyFromId(f.id),
    id: f.legacy_id != null ? f.legacy_id : f.id,
    name: f.name || 'Fee item',
    amount_rwf: f.amount,
    fee_category: f.fee_category || 'School fees',
    pay_source: f.pay_source || null,
  }));
}

module.exports = {
  buildSelectedFeeLines,
  feeRowKeyFromId,
  feeRowKeyFromPricingRow,
  quoteBabyeyiPayBalance,
  validateBabyeyiPaymentAgainstBalance,
  studentRowKey,
  buildPaidAllocationsByStudent,
  loadFeesForSelection,
};
