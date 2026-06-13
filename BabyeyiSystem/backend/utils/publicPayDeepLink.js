'use strict';

const FEE_REMINDER_PAY_PATH = '/remainder-student-pay-fees';

/** Build public pay URL with pre-filled remain balance (used in reminder push/email links). */
function buildRemainPayHref(basePath, { code, remain, year, term, babyeyiId } = {}) {
  const path = String(basePath || FEE_REMINDER_PAY_PATH).replace(/\?.*$/, '');
  const params = new URLSearchParams();
  if (code) params.set('code', String(code).trim());
  const n = remain == null ? NaN : Number(remain);
  if (Number.isFinite(n) && n > 0) params.set('remain', String(Math.round(n * 100) / 100));
  if (year) params.set('year', String(year).trim());
  if (term != null && String(term).trim() !== '') params.set('term', String(term).trim());
  if (babyeyiId != null && String(babyeyiId).trim() !== '') params.set('babyeyi_id', String(babyeyiId));
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

module.exports = { buildRemainPayHref, FEE_REMINDER_PAY_PATH };