/** Active employee deductions/advances applied on payroll runs. */

function toMoney(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function mapEmployeeDeductionRow(d = {}) {
  return {
    id: Number(d.id || 0),
    staffUserId: Number(d.staffUserId || d.staff_user_id || 0),
    deductionType: d.deductionType || d.deduction_type || '',
    customName: d.customName || d.custom_name || '',
    totalAmount: toMoney(d.totalAmount ?? d.total_amount_rwf),
    monthlyInstallment: toMoney(d.monthlyInstallment ?? d.monthly_installment_rwf),
    repaymentMonths: d.repaymentMonths ?? d.repayment_months ?? null,
    remainingBalance: toMoney(d.remainingBalance ?? d.remaining_balance_rwf),
    status: d.status || 'Active',
    deletedAt: d.deletedAt || d.deleted_at || null,
  };
}

/** Include only deductions that should apply to the current payroll run. */
export function isEmployeeDeductionActiveForPayroll(raw = {}) {
  const d = mapEmployeeDeductionRow(raw);
  if (d.deletedAt) return false;
  if (String(d.status || '').toLowerCase() !== 'active') return false;
  if (d.monthlyInstallment <= 0) return false;

  if (String(d.deductionType) === 'Salary Advance') {
    if (d.remainingBalance <= 0) return false;
    const months = Number(d.repaymentMonths || 0);
    if (months > 0 && d.monthlyInstallment > 0) {
      const paidInstallments = Math.max(
        0,
        Math.ceil((d.totalAmount - d.remainingBalance) / d.monthlyInstallment)
      );
      if (paidInstallments >= months) return false;
    }
  }
  return true;
}

export function filterPayrollEmployeeDeductions(rows = []) {
  return (rows || []).filter(isEmployeeDeductionActiveForPayroll);
}

export function employeeDeductionsForEngine(rows = []) {
  return filterPayrollEmployeeDeductions(rows).map((d) => {
    const mapped = mapEmployeeDeductionRow(d);
    return {
      id: mapped.id,
      monthlyInstallment: mapped.monthlyInstallment,
      deductionType: mapped.deductionType,
      customName: mapped.customName,
      repaymentMonths: mapped.repaymentMonths,
      remainingBalance: mapped.remainingBalance,
    };
  });
}

export function snapshotAppliedEmployeeDeductions(rows = []) {
  return employeeDeductionsForEngine(rows).map((d) => ({
    id: d.id,
    deductionType: d.deductionType,
    customName: d.customName,
    monthlyInstallment: d.monthlyInstallment,
    repaymentMonths: d.repaymentMonths,
    remainingBalance: d.remainingBalance,
  }));
}
