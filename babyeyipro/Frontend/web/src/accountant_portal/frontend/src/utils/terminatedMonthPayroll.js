import {
  calcProgressivePAYEBreakdown,
  DEFAULT_PAYE_BRACKETS,
} from './rwandaPayrollEngine';
import { buildPayrollRegisterRow, applyTerminatedMonthRegisterDashes } from './payrollRegister';
import { calcFinalSalaryDue, daysInMonth } from './terminationBenefitsCalc';

function toMoney(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

/**
 * Terminated-month payroll: base = gross, no allowance split, no RAMA/maternity.
 * Employee CSR 6% on gross; employer CSR 6% + occupational hazard 2% on base (= gross).
 * Net pay excludes Mutuelle; totalPayable = net pay − CBHI 0.5%.
 */
export function calcTerminatedPayrollFromGross(grossSalary, input = {}) {
  const gross = Math.max(0, toMoney(grossSalary));
  const baseSalary = gross;
  const payeRates = input.payeRates?.length ? input.payeRates : DEFAULT_PAYE_BRACKETS;
  const otherDeductions = toMoney(input.otherDeductions);

  const rssbEmployee = Math.round(gross * 0.06);
  const rssbEmployer = Math.round(gross * 0.06);
  const occupationalHazard = Math.round(baseSalary * 0.02);
  const paye = calcProgressivePAYEBreakdown(gross, payeRates).total;

  const netPay = Math.max(0, gross - paye - rssbEmployee - otherDeductions);
  const cbhi = Math.round(netPay * 0.005);
  const totalPayable = Math.max(0, netPay - cbhi);

  const csrEmployer8 = rssbEmployer + occupationalHazard;
  const totalCsr14 = rssbEmployee + rssbEmployer + occupationalHazard;

  return {
    mode: 'terminated_month',
    basicSalary: gross,
    grossSalary: gross,
    baseSalary,
    transportAmount: 0,
    allowanceBreakdown: [],
    registerAllowanceSplit: {
      others: 0,
      housing: 0,
      transport: 0,
      totalAllowances: 0,
    },
    paye,
    payeBreakdown: calcProgressivePAYEBreakdown(gross, payeRates).rows,
    rssbEmployee,
    rssbEmployer,
    maternityEmployee: 0,
    maternityEmployer: 0,
    ramaEmployee: 0,
    ramaEmployer: 0,
    occupationalHazard,
    maternityTotal: 0,
    csrEmployer8,
    totalCsr14,
    ramaTotal: 0,
    otherDeductions,
    incomeSalary: netPay,
    netBeforeCbhi: netPay,
    netPay,
    cbhi,
    finalNet: totalPayable,
    netPayFinal: totalPayable,
    netSalary: totalPayable,
    totalPayable,
    employerContributions: {
      rssb: rssbEmployer,
      maternity: 0,
      rama: 0,
      occupationalHazard,
      total: csrEmployer8,
    },
    totalCostToSchool: gross + csrEmployer8,
  };
}

/** Reverse gross from desired net pay (before Mutuelle), base = gross. */
export function calcTerminatedNetToGross(input = {}) {
  const monthlyNet = Math.max(0, toMoney(input.monthlyNetSalary));
  if (!monthlyNet) return null;

  const useDaysWorked = input.useDaysWorked !== false;
  const proratedNetPay = useDaysWorked
    ? calcFinalSalaryDue({
      netSalary: monthlyNet,
      terminationDate: input.terminationDate,
      useDaysWorked: true,
    })
    : monthlyNet;

  const desiredNetPay = Math.max(0, toMoney(input.desiredNetPay ?? proratedNetPay));
  if (!desiredNetPay) return null;

  const tolerance = input.tolerance ?? 1;
  const calcOpts = {
    payeRates: input.payeRates,
    otherDeductions: input.otherDeductions,
  };

  let low = desiredNetPay;
  let high = Math.max(Math.round(desiredNetPay * 1.6), 500_000);
  let probe = calcTerminatedPayrollFromGross(high, calcOpts);
  while (probe.netPay < desiredNetPay && high < desiredNetPay * 25) {
    high = Math.round(high * 1.5);
    probe = calcTerminatedPayrollFromGross(high, calcOpts);
  }
  if (probe.netPay < desiredNetPay) return null;

  let best = null;
  for (let i = 0; i < 64; i += 1) {
    if (low > high) break;
    const mid = Math.round((low + high) / 2);
    const result = calcTerminatedPayrollFromGross(mid, calcOpts);
    const diff = result.netPay - desiredNetPay;

    if (!best || Math.abs(diff) < Math.abs(best.difference)) {
      best = {
        ...result,
        desiredNetPay,
        verifiedNetPay: result.netPay,
        difference: diff,
        monthlyNetSalary: monthlyNet,
        proratedNetPay: desiredNetPay,
        useDaysWorked,
      };
    }

    if (Math.abs(diff) <= tolerance) {
      return {
        ...result,
        desiredNetPay,
        verifiedNetPay: result.netPay,
        difference: diff,
        monthlyNetSalary: monthlyNet,
        proratedNetPay: desiredNetPay,
        useDaysWorked,
      };
    }

    if (diff < 0) low = mid + 1;
    else high = mid - 1;
  }

  return best;
}

export function buildTerminatedPayrollSnapshot({
  record,
  staff = {},
  template = null,
  useDaysWorked,
  monthlyNetSalary,
}) {
  const terminationDate = record?.terminationDate;
  const d = terminationDate ? new Date(terminationDate) : null;
  const payMonth = d && !Number.isNaN(d.getTime()) ? d.getMonth() + 1 : null;
  const payYear = d && !Number.isNaN(d.getTime()) ? d.getFullYear() : null;
  const daysWorked = d ? d.getDate() : 0;
  const monthDays = d ? daysInMonth(d.getFullYear(), d.getMonth() + 1) : 30;
  const netMonthly = toMoney(monthlyNetSalary ?? record?.netSalary);

  const calcResult = calcTerminatedNetToGross({
    monthlyNetSalary: netMonthly,
    terminationDate,
    useDaysWorked: useDaysWorked ?? record?.useDaysWorked !== false,
    payeRates: template?.payeRates,
    otherDeductions: 0,
  });

  if (!calcResult) return null;

  const registerRow = buildPayrollRegisterRow(
    {
      fullName: record?.staffName || staff.fullName,
      rssbNumber: staff.rssbNumber || staff.rssb,
      nationalId: staff.nationalId || record?.staffCode,
      sex: staff.sex || staff.gender,
    },
    {
      ...calcResult,
      cbhi: calcResult.cbhi,
      netPayAfterMutuel: calcResult.totalPayable,
    },
  );

  return {
    version: 1,
    configuredAt: new Date().toISOString(),
    staffUserId: Number(record?.staffUserId),
    terminationId: Number(record?.id),
    terminationDate,
    payMonth,
    payYear,
    useDaysWorked: calcResult.useDaysWorked,
    daysWorked,
    monthDays,
    monthlyNetSalary: netMonthly,
    proratedNetPay: calcResult.proratedNetPay,
    totalPayable: calcResult.totalPayable,
    calc: calcResult,
    registerRow,
  };
}

export function terminationMatchesPayrollPeriod(terminationDate, monthLabel, year) {
  const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const d = terminationDate ? new Date(terminationDate) : null;
  if (!d || Number.isNaN(d.getTime())) return false;
  const monthNum = MONTHS.indexOf(String(monthLabel || '')) + 1;
  const y = Number(year);
  return monthNum > 0 && d.getMonth() + 1 === monthNum && d.getFullYear() === y;
}

export function registerRowFromTerminationSnapshot(snapshot, staffMeta = {}) {
  if (!snapshot?.registerRow) return null;
  const row = applyTerminatedMonthRegisterDashes({ ...snapshot.registerRow });
  if (staffMeta.fullName) {
    const parts = String(staffMeta.fullName).trim().split(/\s+/);
    row.firstName = parts[0] || row.firstName;
    row.familyName = parts.slice(1).join(' ') || row.familyName;
  }
  return row;
}

/** Use saved snapshot or build termination-month payroll on the fly. */
export function ensureTerminationPayrollSnapshot(term, template = null) {
  if (term?.payrollSnapshot?.registerRow && term?.payrollSnapshot?.calc) {
    return term.payrollSnapshot;
  }
  return buildTerminatedPayrollSnapshot({
    record: term,
    template,
    useDaysWorked: term?.useDaysWorked,
    monthlyNetSalary: term?.netSalary,
  });
}

export function terminatedStaffIdsForMonth(terminationPayrolls = []) {
  const ids = new Set();
  for (const term of terminationPayrolls || []) {
    const uid = Number(term?.staffUserId);
    if (uid) ids.add(uid);
  }
  return ids;
}
