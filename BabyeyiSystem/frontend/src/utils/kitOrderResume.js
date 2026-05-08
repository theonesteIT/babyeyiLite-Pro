// ================================================================
// kitOrderResume — portable ClassKit / ShuleKit resume links (SPA)
// Same-device: ?resume=TOKEN + localStorage
// Shareable:  #d=BASE64URL(JSON) minimal payload → refetch pricing
// ================================================================

export const HOME_DELIVERY_FEE = 7000;

const STORAGE_KEY = "babyeyi_classkit_resume_v1";

function utf8ToB64(jsonStr) {
  return btoa(unescape(encodeURIComponent(jsonStr)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function b64ToUtf8(b64url) {
  let s = String(b64url || "").trim();
  if (!s) return "";
  const pad = s.length % 4 === 2 ? "==" : s.length % 4 === 3 ? "=" : "";
  s = `${s.replace(/-/g, "+").replace(/_/g, "/")}${pad}`;
  try {
    return decodeURIComponent(escape(atob(s)));
  } catch {
    return "";
  }
}

export function encodeKitResumePayload(payload) {
  return utf8ToB64(JSON.stringify(payload));
}

export function decodeKitResumePayload(encoded) {
  const raw = b64ToUtf8(encoded);
  if (!raw) return null;
  try {
    const p = JSON.parse(raw);
    if (!p || p.v !== 1 || p.flow !== "classkit") return null;
    return p;
  } catch {
    return null;
  }
}

/** @returns {string} Absolute URL parents can paste or share */
export function buildClasskitResumeShareUrl(origin, pathname, encodedPayload) {
  const base = `${origin || (typeof window !== "undefined" ? window.location.origin : "")}${pathname || "/parents/classkit"}`;
  return `${base}#d=${encodedPayload}`;
}

export function parseHashResumeParam(hash) {
  const h = String(hash || "");
  if (h.startsWith("#d=")) return h.slice(3);
  const m = h.match(/[#&]d=([^&]+)/);
  return m ? m[1] : null;
}

export function saveResumePayloadToDisk(token, payload) {
  if (!token || !payload) return;
  try {
    const prev = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    if (typeof prev !== "object" || prev === null) return;
    prev[token] = { ...payload, savedAt: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prev));
  } catch {
    /* ignore */
  }
}

export function loadResumePayloadFromDisk(token) {
  if (!token) return null;
  try {
    const prev = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    const row = prev[token];
    if (!row || row.v !== 1 || row.flow !== "classkit") return null;
    return row;
  } catch {
    return null;
  }
}

/** @param {URLSearchParams} searchParams */
export function resolveResumePayload(searchParams, locationHash) {
  const token = (searchParams.get("resume") || "").trim();
  if (token) {
    const fromDisk = loadResumePayloadFromDisk(token);
    if (fromDisk) return { payload: fromDisk, token, source: "storage" };
  }
  const enc =
    parseHashResumeParam(locationHash) ||
    (searchParams.get("d") || "").trim() ||
    (searchParams.get("kitResume") || "").trim();
  if (enc) {
    const payload = decodeKitResumePayload(enc);
    if (payload) return { payload, token: token || null, source: "encoded" };
  }
  return null;
}

export function stripResumeHashFromUrl() {
  if (typeof window === "undefined") return;
  const { pathname, search } = window.location;
  if (!window.location.hash) return;
  window.history.replaceState(null, "", `${pathname}${search}`);
}

/** @param {{ useGuestShare?: boolean }} [opts] — guest OTP cookie session (same origin) */
export async function fetchClasskitPricingSnapshot(studentId, apiBase, opts = {}) {
  const useGuest = !!opts.useGuestShare;
  const url = useGuest
    ? `${apiBase}/api/public/classkit-share/pricing?student_id=${encodeURIComponent(studentId)}`
    : `${apiBase}/api/parent-portal/classkit-pricing?student_id=${encodeURIComponent(studentId)}`;
  const res = await fetch(url, { credentials: "include" });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) {
    throw new Error(json.message || "Could not load classkit pricing");
  }
  return {
    babyeyi: json.data?.babyeyi || null,
    school_fees: json.data?.school_fees || [],
    requirements: json.data?.requirements || [],
    totals: json.data?.totals || {},
    student: json.data?.student || null,
  };
}

function computeGrandTotal(pricingSnapshot, feeIds, reqIds, delivery) {
  const feeSet = new Set((feeIds || []).map((x) => Number(x)).filter(Number.isFinite));
  const reqSet = new Set((reqIds || []).map((x) => parseInt(x, 10)).filter((n) => Number.isFinite(n) && n > 0));
  let subtotal = 0;
  for (const f of pricingSnapshot.school_fees || []) {
    const id = Number(f.id);
    if (Number.isFinite(id) && feeSet.has(id)) subtotal += Number(f.amount || 0);
  }
  for (const r of pricingSnapshot.requirements || []) {
    const id = parseInt(r.babyeyi_requirement_id, 10);
    if (Number.isFinite(id) && id > 0 && reqSet.has(id)) subtotal += Number(r.line_total_rwf || 0);
  }
  subtotal = Math.round(subtotal * 100) / 100;
  const deliveryFee = delivery === "home" ? HOME_DELIVERY_FEE : 0;
  const grandTotal = Math.round((subtotal + deliveryFee) * 100) / 100;
  return { subtotal, grandTotal, deliveryFee };
}

function studentRowToSelectedStudent(studentRow, studentId) {
  const sid = Number(studentId);
  if (!studentRow) {
    return {
      student_id: Number.isFinite(sid) ? sid : null,
      student_name: "Student",
      first_name: null,
      last_name: null,
      class_name: null,
      academic_year: null,
      school_name: null,
    };
  }
  const name = [studentRow.first_name, studentRow.last_name].filter(Boolean).join(" ").trim();
  return {
    student_id: Number.isFinite(sid) ? sid : studentRow.id || null,
    student_name: name || "Student",
    first_name: studentRow.first_name || null,
    last_name: studentRow.last_name || null,
    class_name: studentRow.class_name || null,
    academic_year: studentRow.academic_year || null,
    school_name: studentRow.school_name || null,
  };
}

/**
 * Rebuild /payments location.state from minimal resume payload (after refetch).
 * @param {object} payer — { name, phone?, email? }
 */
export async function buildPaymentsStateFromResumePayload(payload, apiBase, payer, opts = {}) {
  const studentId = Number(payload.studentId);
  if (!Number.isFinite(studentId) || studentId <= 0) return null;
  const pricingSnapshot = await fetchClasskitPricingSnapshot(studentId, apiBase, {
    useGuestShare: !!opts.useGuestShare,
  });
  if (!pricingSnapshot?.babyeyi) return null;
  const { grandTotal } = computeGrandTotal(
    pricingSnapshot,
    payload.feeIds || [],
    payload.reqIds || [],
    payload.delivery || "school",
  );
  const selectedStudent = studentRowToSelectedStudent(pricingSnapshot.student, studentId);
  const babyeyi = pricingSnapshot.babyeyi;
  const docLabel = `${babyeyi.class_name || ""} · ${babyeyi.term || ""} · ${babyeyi.academic_year || ""}`;
  const payState = {
    schoolId: babyeyi.school_id,
    babyeyiId: babyeyi.id,
    schoolName: selectedStudent.school_name || "",
    schoolSlug: "",
    docLabel: docLabel.trim(),
    grandTotal,
    selectedFeeIds: payload.feeIds || [],
    selectedReqIds: payload.reqIds || [],
    pricingSnapshot: {
      babyeyi: pricingSnapshot.babyeyi,
      school_fees: pricingSnapshot.school_fees,
      requirements: pricingSnapshot.requirements,
      totals: pricingSnapshot.totals,
    },
    payer: {
      name: payer?.name || "Parent",
      phone: payer?.phone ?? null,
      email: payer?.email ?? null,
    },
    selectedStudent,
  };
  if (opts.useGuestShare) {
    payState.classkitGuestCheckout = true;
  }
  return payState;
}

export function minimalResumePayload(values) {
  return {
    v: 1,
    flow: "classkit",
    kitLabel: values.kitLabel || "classkit",
    phase: values.phase || "kit",
    step: Math.min(4, Math.max(1, Number(values.step) || 1)),
    studentId: Number(values.studentId),
    feeIds: Array.isArray(values.feeIds) ? values.feeIds : [],
    reqIds: Array.isArray(values.reqIds) ? values.reqIds : [],
    delivery: values.delivery === "home" ? "home" : "school",
    payment: values.payment === "loan" ? "loan" : "momo",
  };
}
