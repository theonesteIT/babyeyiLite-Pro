const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export { MONTHS };

export const PAYROLL_TERMS = ['All', 'T1', 'T2', 'T3'];

export function fmtRwf(v) {
  return new Intl.NumberFormat('en-RW', { maximumFractionDigits: 0 }).format(Number(v) || 0);
}

export function fmtRwfLabel(v) {
  return `${fmtRwf(v)} RWF`;
}

export function normalizeTerm(t) {
  const raw = String(t || '').trim().toUpperCase().replace(/\s+/g, '');
  if (!raw || raw === 'ALL') return '';
  if (raw.includes('1') || raw === 'T1' || raw === 'TERM1') return 'T1';
  if (raw.includes('3') || raw === 'T3' || raw === 'TERM3') return 'T3';
  if (raw.includes('2') || raw === 'T2' || raw === 'TERM2') return 'T2';
  return raw;
}

export function parseDateOnly(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function dateToInputValue(d) {
  if (!d) return '';
  const x = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(x.getTime())) return '';
  return x.toISOString().slice(0, 10);
}

export function buildPaymentTrackerRows(requests = []) {
  const map = new Map();
  (requests || []).forEach((r) => {
    const key = `${r.staffUserId}__${r.month}__${r.term}__${r.year}`;
    const activity = parseDateOnly(r.paidAt || r.approvedAt || r.submittedAt || r.createdAt);
    const cur = map.get(key) || {
      key,
      staffUserId: r.staffUserId,
      staffName: r.staffName,
      staffCode: r.staffCode,
      month: r.month,
      term: r.term,
      year: String(r.year || ''),
      academicYear: String(r.academicYear || r.year || ''),
      finalPayable: 0,
      paidAmount: 0,
      hasPending: false,
      hasApproved: false,
      hasRejected: false,
      lastActivityAt: null,
    };
    cur.finalPayable = Math.max(cur.finalPayable, Number(r.finalPayable || 0));
    if (r.status === 'Paid') cur.paidAmount += Number(r.amount || 0);
    if (r.status === 'Pending') cur.hasPending = true;
    if (r.status === 'Approved') cur.hasApproved = true;
    if (r.status === 'Rejected') cur.hasRejected = true;
    if (activity && (!cur.lastActivityAt || activity > cur.lastActivityAt)) {
      cur.lastActivityAt = activity;
    }
    map.set(key, cur);
  });

  return Array.from(map.values()).map((r) => {
    const remaining = Math.max(0, r.finalPayable - r.paidAmount);
    let status = 'Pending Approval';
    if (r.hasPending) status = 'Pending Approval';
    else if (r.hasApproved) status = 'Approved';
    else if (remaining === 0 && r.paidAmount > 0) status = 'Fully Paid';
    else if (r.paidAmount > 0 && remaining > 0) status = 'Partially Paid';
    else if (r.hasRejected) status = 'Rejected';
    return { ...r, remaining, status };
  });
}

export function filterPaymentTrackerRows(rows, filters = {}) {
  const q = String(filters.search || '').trim().toLowerCase();
  const year = String(filters.academicYear || '').trim();
  const term = normalizeTerm(filters.term);
  const dateStr = String(filters.specificDate || '').trim();

  return (rows || []).filter((r) => {
    if (q) {
      const hay = `${r.staffName} ${r.staffCode} ${r.month} ${r.term}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (year && year !== 'All') {
      const y = String(r.year || '');
      const ay = String(r.academicYear || '');
      if (y !== year && !ay.includes(year) && year !== y) return false;
    }
    if (term && filters.term && filters.term !== 'All' && normalizeTerm(r.term) !== term) return false;
    if (dateStr) {
      const rowDate = dateToInputValue(r.lastActivityAt);
      if (rowDate !== dateStr) return false;
    }
    return true;
  });
}

export function collectAcademicYears(requests = [], extra = []) {
  const set = new Set(['All', ...extra.filter(Boolean)]);
  requests.forEach((r) => {
    if (r.year) set.add(String(r.year));
    if (r.academicYear) set.add(String(r.academicYear));
  });
  return [...set].sort((a, b) => {
    if (a === 'All') return -1;
    if (b === 'All') return 1;
    return String(b).localeCompare(String(a));
  });
}

export function trackerStatusForBadge(status) {
  if (status === 'Pending Approval') return 'Pending';
  if (status === 'Fully Paid') return 'Paid';
  if (status === 'Partially Paid') return 'Approved';
  return status;
}

/** Match payroll rows to a payment-tracker period row. */
export function payrollPeriodMatches(request, trackerRow) {
  if (!request || !trackerRow) return false;
  return (
    Number(request.staffUserId) === Number(trackerRow.staffUserId)
    && String(request.month || '') === String(trackerRow.month || '')
    && normalizeTerm(request.term) === normalizeTerm(trackerRow.term)
    && String(request.year || '') === String(trackerRow.year || '')
  );
}

/** Best existing payroll row to copy salary fields when submitting a payment request. */
export function findPayrollPeriodTemplate(requests = [], trackerRow) {
  const matches = (requests || []).filter((r) => payrollPeriodMatches(r, trackerRow));
  if (!matches.length) return null;
  return matches.reduce((best, r) => (
    Number(r.finalPayable || 0) >= Number(best?.finalPayable || 0) ? r : best
  ), matches[0]);
}

export function canRequestTrackerPayment(trackerRow) {
  if (!trackerRow) return false;
  if (Number(trackerRow.remaining || 0) <= 0) return false;
  if (trackerRow.status === 'Pending Approval' || trackerRow.status === 'Approved') return false;
  return true;
}
