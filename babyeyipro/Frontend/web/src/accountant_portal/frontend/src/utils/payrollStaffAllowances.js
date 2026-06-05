/** Per-employee allowance amounts stored on staff (import or HR profile). */

import { calcSchoolAllowancesFromBasic } from './rwandaPayrollEngine';

function toMoney(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function parseOtherAllowanceList(raw) {
  if (raw == null || raw === '') return [];
  let list = raw;
  if (typeof raw === 'string') {
    try {
      list = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(list)) return [];
  return list
    .map((item) => ({
      name: String(item?.name || item?.category || 'Allowance').trim() || 'Allowance',
      amount: toMoney(item?.amount ?? item?.value),
    }))
    .filter((item) => item.amount > 0);
}

export function parseOthersAllowanceAmount(raw) {
  return parseOtherAllowanceList(raw)
    .filter((item) => item.name.toLowerCase() === 'others')
    .reduce((sum, item) => sum + item.amount, 0);
}

/**
 * Full staff payroll allowance profile (register Others/H/A/T/A + custom items).
 */
export function parseStaffPayrollAllowanceProfile(staff = {}) {
  const p = staff.payroll || staff;
  const transport = toMoney(p.transportAllowance ?? p.payroll_transport_allowance);
  const housing = toMoney(p.housingAllowance ?? p.payroll_housing_allowance);
  const meal = toMoney(p.mealAllowance ?? p.payroll_meal_allowance);
  let others = 0;
  const customAllowances = [];

  for (const item of parseOtherAllowanceList(p.otherAllowances ?? p.payroll_other_allowances)) {
    if (item.name.toLowerCase() === 'others') others += item.amount;
    else customAllowances.push(item);
  }

  const customTotal = customAllowances.reduce((sum, item) => sum + item.amount, 0);
  const total = transport + housing + others + meal + customTotal;

  return {
    transport,
    housing,
    others,
    meal,
    customAllowances,
    total,
    hasStored: total > 0,
  };
}

/**
 * Read T/A, H/A, Others from staff payroll payload (accountant staff search / HR).
 * @returns {{ transport, housing, others, meal, customAllowances, total, hasStored }}
 */
export function getStaffAllowanceSplit(staff = {}) {
  const profile = parseStaffPayrollAllowanceProfile(staff);
  return {
    transport: profile.transport,
    housing: profile.housing,
    others: profile.others,
    meal: profile.meal,
    customAllowances: profile.customAllowances,
    total: profile.total,
    hasStored: profile.hasStored,
  };
}

export function hasExplicitRegisterSplit(profile = {}) {
  return toMoney(profile.transport) + toMoney(profile.housing) + toMoney(profile.others) > 0;
}

/**
 * Merge stored register columns with auto-from-basic when columns were not persisted.
 * Custom/meal extras do not replace Others/H/A/T/A.
 */
export function mergeRegisterAllowanceAmounts(basicSalary, storedProfile = {}, allowanceRules = {}) {
  const stored = {
    others: toMoney(storedProfile.others),
    housing: toMoney(storedProfile.housing),
    transport: toMoney(storedProfile.transport),
  };
  if (hasExplicitRegisterSplit(stored)) {
    return { ...stored, hasExplicitRegisterSplit: true, source: 'stored' };
  }
  const basic = toMoney(basicSalary);
  if (basic > 0) {
    const auto = calcSchoolAllowancesFromBasic(basic, allowanceRules);
    return {
      others: auto.registerAllowanceSplit.others,
      housing: auto.registerAllowanceSplit.housing,
      transport: auto.registerAllowanceSplit.transport,
      hasExplicitRegisterSplit: false,
      source: 'auto',
    };
  }
  return { ...stored, hasExplicitRegisterSplit: false, source: 'none' };
}

/** Run-level or import override split (same shape). */
export function normalizeAllowanceSplit(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const each = toMoney(raw.allowanceEach ?? raw.each);
  let transport = toMoney(raw.transport ?? raw.transportAllowance);
  let housing = toMoney(raw.housing ?? raw.housingAllowance);
  let others = toMoney(raw.others ?? raw.othersAllowance);
  if (each > 0) {
    transport = each;
    housing = each;
    others = each;
  }
  const total = transport + housing + others;
  if (!total) return null;
  return { transport, housing, others, total, hasStored: true };
}

export function allowanceSplitToEngineItems(split) {
  if (!split) return [];
  const registerTotal = toMoney(split.transport) + toMoney(split.housing) + toMoney(split.others);
  if (!registerTotal) return [];
  const items = [
    { category: 'Others', name: 'Others', amountType: 'Fixed Amount', value: split.others, status: 'Active' },
    { category: 'Housing Allowance', name: 'Housing Allowance', amountType: 'Fixed Amount', value: split.housing, status: 'Active' },
    { category: 'Transport Allowance', name: 'Transport Allowance', amountType: 'Fixed Amount', value: split.transport, status: 'Active' },
  ];
  return items.filter((item) => toMoney(item.value) > 0);
}

export function customAllowancesToEngineItems(customAllowances = [], meal = 0) {
  const items = (customAllowances || []).map((a) => ({
    category: a.name,
    name: a.name,
    amountType: 'Fixed Amount',
    value: toMoney(a.amount),
    status: 'Active',
  }));
  if (meal > 0) {
    items.push({
      category: 'Meal Allowance',
      name: 'Meal Allowance',
      amountType: 'Fixed Amount',
      value: meal,
      status: 'Active',
    });
  }
  return items.filter((item) => item.value > 0);
}

export function staffAllowancesToEngineItems(staff = {}, basicSalary = 0, allowanceRules = {}) {
  const profile = getStaffAllowanceSplit(staff);
  if (!profile.hasStored) return [];
  const basic = toMoney(basicSalary) || toMoney(staff?.payroll?.basicSalary ?? staff.basicSalary ?? staff.basic);
  const merged = mergeRegisterAllowanceAmounts(basic, profile, allowanceRules);
  return [
    ...allowanceSplitToEngineItems(merged),
    ...customAllowancesToEngineItems(profile.customAllowances, profile.meal),
  ];
}
