'use strict';

const {
  calcProgressivePAYEBreakdown,
  DEFAULT_PAYE_BRACKETS,
} = require('./rwandaPayrollEngine');

function toMoney(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

function parseDate(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function daysInMonth(year, month) {
  return new Date(Number(year), Number(month), 0).getDate();
}

function calcFinalSalaryDue(netSalary, terminationDate, useDaysWorked) {
  const net = toMoney(netSalary);
  if (!useDaysWorked) return Math.round(net);
  const d = parseDate(terminationDate);
  if (!d) return Math.round(net);
  const daysWorked = d.getDate();
  const monthDays = daysInMonth(d.getFullYear(), d.getMonth() + 1);
  if (!monthDays) return Math.round(net);
  return Math.round((net / monthDays) * daysWorked);
}

function enrichPayrollCalc(calc = {}) {
  const rssbEmployee = toMoney(calc.rssbEmployee);
  const rssbEmployer = toMoney(calc.rssbEmployer);
  const occupationalHazard = toMoney(calc.occupationalHazard);
  const maternityEmployee = toMoney(calc.maternityEmployee);
  const maternityEmployer = toMoney(calc.maternityEmployer);
  const ramaEmployee = toMoney(calc.ramaEmployee);
  const ramaEmployer = toMoney(calc.ramaEmployer);
  const maternityTotal = maternityEmployee + maternityEmployer;
  const csrEmployer8 = rssbEmployer + occupationalHazard;
  const totalCsr14 = rssbEmployee + rssbEmployer + occupationalHazard;
  const ramaTotal = ramaEmployee + ramaEmployer;
  return {
    ...calc,
    maternityTotal,
    csrEmployer8,
    totalCsr14,
    ramaTotal,
    netPay: toMoney(calc.incomeSalary ?? calc.netBeforeCbhi),
    netPayAfterMutuel: toMoney(calc.finalNet ?? calc.totalPayable),
  };
}

function buildPayrollRegisterRow(staff = {}, calcInput = {}) {
  const calc = enrichPayrollCalc(calcInput);
  const split = calc.registerAllowanceSplit || {
    totalAllowances: 0,
    housing: 0,
    transport: 0,
    others: 0,
  };
  const fullName = staff.fullName || staff.staffName || '';
  const parts = String(fullName).trim().split(/\s+/).filter(Boolean);
  const firstName = staff.firstName || parts[0] || '';
  const familyName = staff.familyName || (parts.length > 1 ? parts.slice(1).join(' ') : '');
  const hasRama = toMoney(calc.ramaEmployee) > 0 || toMoney(calc.ramaEmployer) > 0;
  const dashIfZero = (n) => (!hasRama && toMoney(n) === 0 ? '-' : toMoney(n));
  const isTerminated = calcInput.mode === 'terminated_month';

  const row = {
    rssbNumber: staff.rssbNumber || staff.rssb || '',
    nationalId: staff.nationalId || staff.idNumber || staff.staffCode || '',
    firstName,
    familyName,
    sex: staff.sex || staff.gender || '',
    basicSalary: toMoney(calc.basicSalary),
    totalAllowances: toMoney(split.totalAllowances),
    othersAllowance: toMoney(split.others),
    housingAllowance: toMoney(split.housing),
    transportAllowance: toMoney(split.transport),
    gross: toMoney(calc.grossSalary),
    paye: toMoney(calc.paye),
    base: toMoney(calc.baseSalary),
    csrEmployee6: toMoney(calc.rssbEmployee),
    maternityEmployee: toMoney(calc.maternityEmployee),
    maternityEmployer: toMoney(calc.maternityEmployer),
    maternityTotal: calc.maternityTotal,
    csrEmployer6: toMoney(calc.rssbEmployer),
    csrOccupational2: toMoney(calc.occupationalHazard),
    csrEmployer8: calc.csrEmployer8,
    totalCsr14: calc.totalCsr14,
    ramaEmployee: dashIfZero(calc.ramaEmployee),
    ramaEmployer: dashIfZero(calc.ramaEmployer),
    ramaTotal: hasRama ? calc.ramaTotal : '-',
    netPay: calc.netPay,
    netPayDuplicate: calc.netPay,
    mutuel: toMoney(calc.cbhi),
    netPayFinal: calc.netPayAfterMutuel,
  };

  if (!isTerminated) return row;
  return {
    ...row,
    basicSalary: '-',
    totalAllowances: '-',
    othersAllowance: '-',
    housingAllowance: '-',
    transportAllowance: '-',
    maternityEmployee: '-',
    maternityEmployer: '-',
    maternityTotal: '-',
    ramaEmployee: '-',
    ramaEmployer: '-',
    ramaTotal: '-',
  };
}

function calcTerminatedPayrollFromGross(grossSalary, input = {}) {
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

function calcTerminatedNetToGross(input = {}) {
  const monthlyNet = Math.max(0, toMoney(input.monthlyNetSalary));
  if (!monthlyNet) return null;

  const useDaysWorked = input.useDaysWorked !== false;
  const proratedNetPay = useDaysWorked
    ? calcFinalSalaryDue(monthlyNet, input.terminationDate, true)
    : monthlyNet;

  const desiredNetPay = Math.max(0, toMoney(input.desiredNetPay ?? proratedNetPay));
  if (!desiredNetPay) return null;

  const tolerance = input.tolerance ?? 1;
  const calcOpts = {
    payeRates: input.payeRates,
    otherDeductions: input.otherDeductions,
  };

  let low = desiredNetPay;
  let high = Math.max(Math.round(desiredNetPay * 1.6), 500000);
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

function buildTerminatedPayrollSnapshot({
  record,
  staff = {},
  payeRates = null,
  useDaysWorked,
  monthlyNetSalary,
}) {
  const terminationDate = record?.terminationDate || record?.termination_date;
  const d = parseDate(terminationDate);
  const payMonth = d ? d.getMonth() + 1 : null;
  const payYear = d ? d.getFullYear() : null;
  const daysWorked = d ? d.getDate() : 0;
  const monthDays = d ? daysInMonth(d.getFullYear(), d.getMonth() + 1) : 30;
  const netMonthly = toMoney(monthlyNetSalary ?? record?.netSalary ?? record?.net_salary);
  const useDays = useDaysWorked ?? record?.useDaysWorked !== false;

  const calcResult = calcTerminatedNetToGross({
    monthlyNetSalary: netMonthly,
    terminationDate,
    useDaysWorked: useDays,
    payeRates: payeRates?.length ? payeRates : undefined,
    otherDeductions: 0,
  });

  if (!calcResult) return null;

  const registerRow = buildPayrollRegisterRow(
    {
      fullName: record?.staffName || record?.staff_name || staff.fullName,
      rssbNumber: staff.rssbNumber || staff.rssb,
      nationalId: staff.nationalId || record?.staffCode || record?.staff_code,
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
    staffUserId: Number(record?.staffUserId || record?.staff_user_id),
    terminationId: Number(record?.id),
    terminationDate: terminationDate ? String(terminationDate).slice(0, 10) : null,
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

function ensureTerminationPayrollSnapshot(record, payeRates = null) {
  const existing = record?.payrollSnapshot || record?.payroll_snapshot_json;
  if (existing?.registerRow && existing?.calc) return existing;
  return buildTerminatedPayrollSnapshot({ record, payeRates });
}

module.exports = {
  calcTerminatedPayrollFromGross,
  calcTerminatedNetToGross,
  buildTerminatedPayrollSnapshot,
  ensureTerminationPayrollSnapshot,
  buildPayrollRegisterRow,
};
