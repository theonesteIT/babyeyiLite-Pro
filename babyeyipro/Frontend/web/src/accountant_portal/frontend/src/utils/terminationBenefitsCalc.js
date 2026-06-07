/** Severance multiplier tiers (default when settings not loaded). */
export const DEFAULT_SEVERANCE_RATES = [
  { minYears: 0, maxYears: 4, multiplier: 2, label: 'Less than 5' },
  { minYears: 5, maxYears: 10, multiplier: 3, label: '5 – 10' },
  { minYears: 11, maxYears: 15, multiplier: 4, label: '10 – 15' },
  { minYears: 16, maxYears: 20, multiplier: 5, label: '15 – 20' },
  { minYears: 21, maxYears: 25, multiplier: 6, label: '20 – 25' },
  { minYears: 26, maxYears: null, multiplier: 7, label: 'Above 25' },
];

export const CBHI_TERMINATION_RATE = 0.005;

export function parseIsoDate(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDisplayDate(v) {
  const d = parseIsoDate(v);
  if (!d) return '—';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

/** Whole years between employment and termination dates. */
export function calcYearsOfService(employmentDate, terminationDate) {
  const start = parseIsoDate(employmentDate);
  const end = parseIsoDate(terminationDate);
  if (!start || !end || end < start) return 0;
  let years = end.getFullYear() - start.getFullYear();
  const monthDiff = end.getMonth() - start.getMonth();
  const dayDiff = end.getDate() - start.getDate();
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) years -= 1;
  return Math.max(0, years);
}

export function getSeveranceMultiplier(yearsWorked, rateTable = DEFAULT_SEVERANCE_RATES) {
  const y = Number(yearsWorked) || 0;
  const table = rateTable?.length ? rateTable : DEFAULT_SEVERANCE_RATES;
  for (const row of table) {
    const min = Number(row.minYears ?? 0);
    const max = row.maxYears == null ? null : Number(row.maxYears);
    if (y >= min && (max == null || y <= max)) return Number(row.multiplier) || 0;
  }
  return table[table.length - 1]?.multiplier ?? 2;
}

export function daysInMonth(year, month) {
  return new Date(Number(year), Number(month), 0).getDate();
}

export function calcFinalSalaryDue({
  netSalary = 0,
  terminationDate,
  useDaysWorked = true,
}) {
  const net = Number(netSalary) || 0;
  if (!useDaysWorked) return Math.round(net);
  const d = parseIsoDate(terminationDate);
  if (!d) return Math.round(net);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const daysWorked = d.getDate();
  const monthDays = daysInMonth(year, month);
  if (!monthDays) return Math.round(net);
  return Math.round((net / monthDays) * daysWorked);
}

/** Ensure display/API amounts = severance only (no month salary, CBHI, or deductions). */
export function normalizeTerminationRecord(record) {
  if (!record) return record;
  const netSalary = Number(record.netSalary) || 0;
  const multiplier = Number(record.multiplier) || 0;
  const severanceBenefit = Math.round(netSalary * multiplier);
  return {
    ...record,
    severanceBenefit,
    finalSalaryDue: 0,
    grossSettlement: severanceBenefit,
    cbhiDeduction: 0,
    totalPayable: severanceBenefit,
  };
}

export function calcTerminationSettlement({
  netSalary = 0,
  employmentDate,
  terminationDate,
  useDaysWorked = true,
  outstandingDeductions = 0,
  rateTable = DEFAULT_SEVERANCE_RATES,
}) {
  const yearsWorked = calcYearsOfService(employmentDate, terminationDate);
  const multiplier = getSeveranceMultiplier(yearsWorked, rateTable);
  const severanceBenefit = Math.round((Number(netSalary) || 0) * multiplier);
  const grossSettlement = severanceBenefit;
  const outstanding = Math.round(Number(outstandingDeductions) || 0);
  const totalPayable = severanceBenefit;

  const d = parseIsoDate(terminationDate);
  const daysWorked = d ? d.getDate() : 0;
  const monthDays = d ? daysInMonth(d.getFullYear(), d.getMonth() + 1) : 30;

  return {
    yearsWorked,
    multiplier,
    severanceBenefit,
    finalSalaryDue: 0,
    grossSettlement,
    cbhiDeduction: 0,
    cbhiRate: 0,
    outstandingDeductions: outstanding,
    totalPayable,
    daysWorked,
    monthDays,
    useDaysWorked: !!useDaysWorked,
  };
}

export const TERMINATION_STATUSES = {
  draft: { label: 'Draft', color: 'slate' },
  pending_approval: { label: 'Pending Approval', color: 'amber' },
  approved: { label: 'Approved', color: 'blue' },
  paid: { label: 'Paid', color: 'green' },
  rejected: { label: 'Rejected', color: 'red' },
};

export const PAYMENT_METHODS = ['Bank Transfer', 'Mobile Money', 'Cash'];
