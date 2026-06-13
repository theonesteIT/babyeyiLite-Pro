/** Demo student used for sample fee-reminder push previews. */
export const SAMPLE_REMINDER_STUDENT_CODE = "040030013";

export const FEE_REMINDER_PAY_PATH = "/remainder-student-pay-fees";

/** Parse ?remain= / ?amount= for reminder deep links into public pay flows. */
export function parseRemainAmount(searchParams) {
  const raw = searchParams.get("remain") || searchParams.get("amount") || searchParams.get("pay_remain") || "";
  const n = parseFloat(String(raw).replace(/,/g, ""));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
}

export function isFeeReminderEntry(searchParams) {
  if (!searchParams) return false;
  if (searchParams.get("reminder") === "1") return true;
  const code = (searchParams.get("code") || searchParams.get("student_code") || "").trim();
  const step = parseInt(searchParams.get("step"), 10);
  return Boolean(code) && step === 4;
}

export function buildRemainPayHref(basePath, { code, remain, year, term, babyeyiId } = {}) {
  const p = new URLSearchParams();
  if (code) p.set("code", code);
  if (remain != null) p.set("remain", String(remain));
  if (year) p.set("year", year);
  if (term) p.set("term", term);
  if (babyeyiId != null) p.set("babyeyi_id", String(babyeyiId));
  p.set("step", "4");
  return `${basePath}?${p.toString()}`;
}

/** Fee-reminder push / email link — dedicated remainder pay page. */
export function buildFeeReminderHref(basePath = FEE_REMINDER_PAY_PATH, { code, remain, year, term, babyeyiId } = {}) {
  const p = new URLSearchParams();
  if (code) p.set("code", code);
  if (remain != null) p.set("remain", String(remain));
  if (year) p.set("year", year);
  if (term) p.set("term", term);
  if (babyeyiId != null) p.set("babyeyi_id", String(babyeyiId));
  return `${basePath}?${p.toString()}`;
}
