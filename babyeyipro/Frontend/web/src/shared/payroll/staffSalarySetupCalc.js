import {
  DEFAULT_PAYE_BRACKETS,
  calcProgressivePAYEBreakdown,
  normalizeStatutoryRates,
} from '../../accountant_portal/frontend/src/utils/rwandaPayrollEngine';
import {
  getStaffAllowanceSplit,
  mergeRegisterAllowanceAmounts,
} from '../../accountant_portal/frontend/src/utils/payrollStaffAllowances';

function toMoney(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

const KNOWN_OTHER_ALLOWANCES = {
  'communication allowance': 'communication',
  'responsibility allowance': 'responsibility',
};

function parseOtherAllowanceList(raw) {
  if (!raw) return [];
  let list = raw;
  if (typeof raw === 'string') {
    try { list = JSON.parse(raw); } catch { return []; }
  }
  if (!Array.isArray(list)) return [];
  return list
    .map((item, i) => ({
      id: item.id || `oa-${i}`,
      name: item.name || item.category || 'Allowance',
      amount: toMoney(item?.amount ?? item?.value),
    }))
    .filter((a) => a.amount > 0);
}

/** Mirror StaffSalarySetup.parseStaffPayrollAllowances for certificate totals. */
export function parseEmployeeSupplementalAllowances(employee = {}) {
  const transport = toMoney(employee.payroll_transport_allowance);
  const housing = toMoney(employee.payroll_housing_allowance);
  const meal = toMoney(employee.payroll_meal_allowance);
  let others = 0;
  let communication = 0;
  let responsibility = 0;
  const customAllowances = [];

  for (const item of parseOtherAllowanceList(employee.payroll_other_allowances)) {
    const nameLower = item.name?.toLowerCase?.()?.trim();
    if (nameLower === 'others') {
      others += item.amount;
    } else if (KNOWN_OTHER_ALLOWANCES[nameLower] === 'communication') {
      communication = item.amount;
    } else if (KNOWN_OTHER_ALLOWANCES[nameLower] === 'responsibility') {
      responsibility = item.amount;
    } else {
      customAllowances.push(item);
    }
  }

  return {
    transport,
    housing,
    others,
    meal,
    communication,
    responsibility,
    customAllowances,
  };
}

function sumCustomAllowances(customAllowances = []) {
  return customAllowances.reduce((sum, item) => sum + toMoney(item.amount), 0);
}

function sumActiveDeductions(rows = []) {
  return rows
    .filter((d) => String(d.status || 'Active').toLowerCase() !== 'inactive')
    .reduce((sum, d) => sum + toMoney(d.monthlyInstallment ?? d.amount), 0);
}

function sumActiveAdvanceMonthly(advances = []) {
  return advances.reduce((sum, adv) => {
    if (String(adv.status || 'Active').toLowerCase() === 'inactive') return sum;
    const months = Math.max(1, Number(adv.repaymentMonths || adv.months || 1));
    const paid = Number(adv.paidMonths || 0);
    if (paid >= months) return sum;
    return sum + toMoney(adv.monthlyInstallment ?? Math.round(toMoney(adv.totalAmount) / months));
  }, 0);
}

/**
 * Same gross / deduction / net logic as Staff Salary Setup (normal payroll mode).
 */
export function calcStaffSalarySetupTotals(employee = {}, options = {}) {
  const basic = toMoney(employee.payroll_basic_salary);
  const allowanceRules = options.allowanceRules || {};
  const payeRates = options.payeRates?.length ? options.payeRates : DEFAULT_PAYE_BRACKETS;
  const statutory = normalizeStatutoryRates(options.statutory || {});

  const supplemental = parseEmployeeSupplementalAllowances(employee);
  const storedProfile = getStaffAllowanceSplit({
    payroll: {
      basicSalary: basic,
      transportAllowance: supplemental.transport,
      housingAllowance: supplemental.housing,
      mealAllowance: supplemental.meal,
      otherAllowances: employee.payroll_other_allowances,
    },
  });

  const register = mergeRegisterAllowanceAmounts(basic, storedProfile, allowanceRules);
  const others = toMoney(register.others);
  const housing = toMoney(register.housing);
  const transport = toMoney(register.transport);
  const customAllowanceTotal = sumCustomAllowances(supplemental.customAllowances);

  const gross = basic + others + housing + transport
    + supplemental.communication + supplemental.responsibility + supplemental.meal + customAllowanceTotal;

  const paye = calcProgressivePAYEBreakdown(gross, payeRates).total;
  const rssb = Math.round(basic * (statutory.rssbEmployee ?? 6) / 100);
  const rama = Math.round(basic * (statutory.ramaEmployee ?? 7.5) / 100);
  const cbhi = Math.round(basic * (statutory.cbhi ?? 0.5) / 100);

  const customDeductionTotal = sumActiveDeductions(options.customDeductions || []);
  const advanceMonthly = sumActiveAdvanceMonthly(options.advances || []);
  const otherDeductions = customDeductionTotal + advanceMonthly;

  const deductions = paye + rssb + rama + cbhi + otherDeductions;
  const net = Math.max(0, gross - deductions);

  const deductionRows = [];
  if (paye > 0) deductionRows.push(['PAYE (Tax)', paye]);
  if (rssb > 0) deductionRows.push(['CSR / Pension (6%)', rssb]);
  if (rama > 0) deductionRows.push(['RAMA (7.5%)', rama]);
  if (cbhi > 0) deductionRows.push(['Mutuelle / CBHI (0.5%)', cbhi]);
  for (const d of (options.customDeductions || []).filter((x) => String(x.status || 'Active').toLowerCase() !== 'inactive')) {
    const amt = toMoney(d.monthlyInstallment ?? d.amount);
    if (amt > 0) {
      deductionRows.push([d.customName || d.deductionType || d.name || 'Deduction', amt]);
    }
  }
  if (advanceMonthly > 0) deductionRows.push(['Salary Advance', advanceMonthly]);

  const otherBenefits = supplemental.meal + supplemental.communication + customAllowanceTotal;

  return {
    basic,
    others,
    housing,
    transport,
    responsibility: supplemental.responsibility,
    otherBenefits,
    gross,
    paye,
    pension: rssb,
    rama,
    maternity: 0,
    mutuelle: cbhi,
    otherDeductions,
    deductions,
    deductionRows,
    net,
    registerSource: register.source,
  };
}
