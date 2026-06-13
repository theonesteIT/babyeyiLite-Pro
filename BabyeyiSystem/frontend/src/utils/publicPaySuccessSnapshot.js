const KEY = "babyeyi_public_pay_success";

/** Remember last successful public school-fee payment for balance refresh on return. */
export function savePublicPaySuccess(draft, { intentId, amountRwf, invoiceStatus } = {}) {
  if (!draft?.fromPublicSchoolPay || draft?.fromCustomShuleKit) return;
  const status = String(invoiceStatus || "PAID").toUpperCase();
  if (status !== "PAID") return;
  const amount = Math.max(0, Number(amountRwf ?? draft.grandTotal ?? 0));
  const student = draft.selectedStudent || {};
  const snap = {
    at: Date.now(),
    schoolId: draft.schoolId,
    babyeyiId: draft.babyeyiId,
    studentCode: String(student.student_code || student.student_uid || "").trim(),
    amountRwf: amount,
    intentId: intentId || null,
    selectedFeeIds: draft.selectedFeeIds || [],
    selectedReqIds: draft.selectedReqIds || [],
    docLabel: draft.docLabel || "",
    payScope: draft.payScope || "tuition_school",
  };
  try {
    sessionStorage.setItem(KEY, JSON.stringify(snap));
  } catch { /* ignore */ }
}

export function loadPublicPaySuccess() {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const snap = JSON.parse(raw);
    if (!snap?.schoolId || snap.babyeyiId == null) return null;
    if (Date.now() - Number(snap.at || 0) > 7 * 24 * 60 * 60 * 1000) {
      sessionStorage.removeItem(KEY);
      return null;
    }
    return snap;
  } catch {
    return null;
  }
}

export function clearPublicPaySuccess() {
  try {
    sessionStorage.removeItem(KEY);
  } catch { /* ignore */ }
}

export function buildPaidReturnHref(snap) {
  if (!snap?.studentCode) return "/paid-at-school?paidSuccess=1&step=4";
  const q = new URLSearchParams();
  q.set("code", snap.studentCode);
  q.set("paidSuccess", "1");
  q.set("step", "4");
  return `/paid-at-school?${q.toString()}`;
}
