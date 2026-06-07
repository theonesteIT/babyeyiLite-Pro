import { calcRwandaPayroll, shouldUseSchoolAutoAllowances } from './rwandaPayrollEngine';
import { buildPayrollRegisterRow } from './payrollRegister';
import {
  customAllowancesToEngineItems,
  getStaffAllowanceSplit,
  mergeRegisterAllowanceAmounts,
  normalizeAllowanceSplit,
} from './payrollStaffAllowances';
import { employeeDeductionsForEngine } from './payrollEmployeeDeductions';

function toMoney(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function mapAllowanceForEngine(a) {
  return {
    category: a.category || a.name,
    name: a.name || a.category,
    amountType: a.amountType || 'Fixed Amount',
    value: a.value,
    status: a.status || 'Active',
  };
}

function mapDeductionForEngine(d) {
  return {
    amountType: d.amountType || 'Fixed Amount',
    value: d.value,
    status: d.status || 'Active',
  };
}

function mapExtraAllowanceForEngine(a) {
  return {
    category: a.label || a.name || a.category || 'Other',
    name: a.label || a.name || a.category || 'Other',
    amountType: 'Fixed Amount',
    value: Number(a.amount || a.value || 0),
    status: 'Active',
  };
}

export function mergeAllowancesWithExtras(templateAllowances = [], extraAllowances = []) {
  const base = (templateAllowances || []).map(mapAllowanceForEngine);
  for (const extra of extraAllowances || []) {
    const amt = Number(extra.amount || extra.value || 0);
    if (!amt) continue;
    base.push(mapExtraAllowanceForEngine(extra));
  }
  return base;
}

export function mergeEmployeeDeductionsWithExtras(stored = [], extraDeductions = []) {
  const base = employeeDeductionsForEngine(stored).map((d) => ({
    id: d.id,
    monthlyInstallment: d.monthlyInstallment,
    deductionType: d.deductionType,
    customName: d.customName,
    repaymentMonths: d.repaymentMonths,
    remainingBalance: d.remainingBalance,
  }));
  for (const extra of extraDeductions || []) {
    const amt = Number(extra.amount || extra.value || 0);
    if (!amt) continue;
    base.push({ monthlyInstallment: amt });
  }
  return base;
}

/**
 * Build school-format register rows for all staff using active template + stored basic salaries.
 * @param {Object} employeeAdjustments - map staffUserId -> { extraAllowances: [{label, amount}], extraDeductions: [{label, amount}] }
 */
export function buildPayrollPreviewRows(
  staffList = [],
  template = null,
  employeeDeductions = [],
  employeeAdjustments = {},
  runOverrides = null,
  terminationPayrolls = [],
) {
  const allowanceRules = template?.rules?.allowanceAuto || template?.allowanceAuto || {};
  const runAllowances = runOverrides?.allowances;
  const useSchoolAuto = shouldUseSchoolAutoAllowances([], allowanceRules, { runAllowances });
  const templateAllowances = useSchoolAuto
    ? []
    : (runOverrides?.allowances ?? template?.allowances ?? []);
  const deductions = (runOverrides?.deductions ?? template?.deductions ?? []).map(mapDeductionForEngine);
  const statutory = template?.statutory || {};
  const payeRates = template?.payeRates?.length ? template.payeRates : undefined;

  const dedByStaff = new Map();
  for (const d of employeeDeductions) {
    const id = Number(d.staffUserId || d.staff_user_id);
    if (!id) continue;
    if (!dedByStaff.has(id)) dedByStaff.set(id, []);
    dedByStaff.get(id).push(d);
  }

  const rows = [];
  const missingBasicStaff = [];
  for (const s of staffList) {
    const staffUserId = Number(s.staffUserId || s.id);
    const adj = employeeAdjustments[staffUserId] || employeeAdjustments[String(staffUserId)] || {};
    const basicOverride = Number(adj.basicSalaryOverride ?? adj.basicSalary ?? 0);
    const basic = basicOverride > 0
      ? basicOverride
      : Number(s?.payroll?.basicSalary ?? s.basicSalary ?? s.basic ?? 0);
    const fullName = s.fullName || s.name || `Staff ${staffUserId}`;
    if (!basic) {
      missingBasicStaff.push({ staffUserId, fullName, dept: s.department || s.role || 'Staff' });
      continue;
    }

    const runSplit = normalizeAllowanceSplit(adj.allowanceSplit);
    const staffSplit = getStaffAllowanceSplit(s);
    const mergedRegister = runSplit || mergeRegisterAllowanceAmounts(basic, staffSplit, allowanceRules);
    const registerTotal = toMoney(mergedRegister.transport) + toMoney(mergedRegister.housing) + toMoney(mergedRegister.others);
    const useStoredAllowances = !!runSplit || staffSplit.hasStored;
    const storedAllowanceSplit = registerTotal > 0
      ? {
        transport: mergedRegister.transport,
        housing: mergedRegister.housing,
        others: mergedRegister.others,
        hasStored: true,
      }
      : undefined;

    const profileAllowanceItems = useStoredAllowances
      ? customAllowancesToEngineItems(
        runSplit ? [] : staffSplit.customAllowances,
        runSplit ? 0 : staffSplit.meal
      )
      : [];

    const allowances = useStoredAllowances
      ? mergeAllowancesWithExtras(profileAllowanceItems, adj.extraAllowances)
      : mergeAllowancesWithExtras(templateAllowances, adj.extraAllowances);
    const employeeSpecific = mergeEmployeeDeductionsWithExtras(
      dedByStaff.get(staffUserId) || [],
      adj.extraDeductions
    );

    const hr = s.hr_profile || s.payroll || {};
    const calc = calcRwandaPayroll({
      basicSalary: basic,
      allowances,
      storedAllowanceSplit,
      templateDeductions: deductions,
      employeeDeductions: employeeSpecific,
      statutory,
      payeRates,
      allowanceRules,
      runAllowances: useStoredAllowances ? [] : runAllowances,
      forceManualAllowances: useStoredAllowances,
    });

    const nameParts = String(s.fullName || s.name || '').trim().split(/\s+/).filter(Boolean);
    rows.push({
      ...buildPayrollRegisterRow({
        fullName: s.fullName || s.name,
        firstName: nameParts[0],
        familyName: nameParts.slice(1).join(' '),
        rssbNumber: s.rssbNumber || hr.rssb_number || hr.rssb || '',
        nationalId: s.nationalId || s.national_id || s.staffCode || '',
        sex: s.sex || s.gender || hr.gender || '',
      }, calc),
      staffUserId,
      fullName: s.fullName || s.name || '',
      basicSalaryRaw: basic,
      calcSnapshot: calc,
      appliedEmployeeDeductions: employeeSpecific.filter((d) => d.id),
      appliedAllowanceSource: useStoredAllowances ? 'staff_profile' : (useSchoolAuto ? 'auto' : 'template'),
    });
  }

  for (const term of terminationPayrolls || []) {
    const snap = term?.payrollSnapshot;
    if (!snap?.registerRow || !snap?.calc) continue;
    const staffUserId = Number(term.staffUserId);
    const existingIdx = rows.findIndex((r) => Number(r.staffUserId) === staffUserId);
    if (existingIdx >= 0) rows.splice(existingIdx, 1);

    rows.push({
      ...snap.registerRow,
      staffUserId,
      fullName: term.staffName || snap.registerRow.firstName || '',
      basicSalaryRaw: toMoney(snap.registerRow.basicSalary ?? snap.calc.grossSalary),
      calcSnapshot: snap.calc,
      appliedEmployeeDeductions: [],
      appliedAllowanceSource: 'terminated_month',
      isTerminationPayroll: true,
      terminationId: term.id,
    });
  }

  const missingBasicWarning = missingBasicStaff.length
    ? `${missingBasicStaff.length} staff excluded from preview (no basic salary). Payroll can still run — default role rates apply for them.`
    : null;

  return {
    rows,
    error: null,
    missingBasicStaff,
    warning: missingBasicWarning,
  };
}
