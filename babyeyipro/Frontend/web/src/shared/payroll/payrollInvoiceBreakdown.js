const toAmount = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

function parseMaybeJson(value) {
  try {
    return Array.isArray(value) ? value : (typeof value === 'string' ? JSON.parse(value) || [] : []);
  } catch {
    return [];
  }
}

/**
 * Build line-item breakdown for payroll invoice UI + PDF.
 */
export function buildPayrollInvoiceBreakdown(row, staffPayroll = null, advanceData = null) {
  const pr = staffPayroll?.payroll;
  const basic = toAmount(row?.basic ?? pr?.basicSalary ?? staffPayroll?.salary?.basic);
  const bonus = 0;

  const allowanceLines = [];
  if (pr) {
    if (toAmount(pr.transportAllowance)) allowanceLines.push({ label: 'Transport allowance', amount: toAmount(pr.transportAllowance) });
    if (toAmount(pr.housingAllowance)) allowanceLines.push({ label: 'Housing allowance', amount: toAmount(pr.housingAllowance) });
    if (toAmount(pr.mealAllowance)) allowanceLines.push({ label: 'Meal allowance', amount: toAmount(pr.mealAllowance) });
    parseMaybeJson(pr.otherAllowances).forEach((item, idx) => {
      const amt = toAmount(item?.amount);
      if (amt > 0) allowanceLines.push({ label: item?.name || item?.key || `Other allowance ${idx + 1}`, amount: amt });
    });
    if (!allowanceLines.length && toAmount(row?.allowances)) {
      allowanceLines.push({ label: 'Allowances', amount: toAmount(row.allowances) });
    }
  } else if (toAmount(row?.allowances)) {
    allowanceLines.push({ label: 'Allowances', amount: toAmount(row.allowances) });
  }

  const allowancesTotal = allowanceLines.reduce((s, l) => s + l.amount, 0);
  const gross = basic + allowancesTotal + bonus;

  const deductionLines = [];
  if (pr) {
    const taxPct = toAmount(pr.taxPercent);
    const taxAmt = Math.round((gross * taxPct) / 100);
    if (taxAmt > 0) deductionLines.push({ label: `Tax (${taxPct}%)`, amount: taxAmt });
    if (toAmount(pr.pensionAmount)) deductionLines.push({ label: 'Pension / RSSB', amount: toAmount(pr.pensionAmount) });
    parseMaybeJson(pr.otherDeductions).forEach((item, idx) => {
      const amt = toAmount(item?.amount);
      if (amt > 0) deductionLines.push({ label: item?.name || item?.key || `Deduction ${idx + 1}`, amount: amt });
    });
  }
  const deductionsFromLines = deductionLines.reduce((s, l) => s + l.amount, 0);
  const deductionsTotal = deductionsFromLines > 0 ? deductionsFromLines : toAmount(row?.deductions);

  if (!deductionLines.length && deductionsTotal > 0) {
    deductionLines.push({ label: 'Tax & deductions', amount: deductionsTotal });
  }

  const approvedAdvances = Array.isArray(advanceData?.approvedAdvances) ? advanceData.approvedAdvances : [];
  const advanceLines = approvedAdvances
    .filter((a) => toAmount(a.monthlyPayment) > 0)
    .map((a, idx) => ({
      label: `Advance #${a.id || idx + 1} (monthly)`,
      amount: toAmount(a.monthlyPayment),
    }));

  const advanceApplied = toAmount(row?.advance) || advanceLines.reduce((s, l) => s + l.amount, 0);
  const netSalary = toAmount(row?.netSalary) || Math.max(0, gross - deductionsTotal);
  const finalPayable = toAmount(row?.finalPayable) || Math.max(0, netSalary - advanceApplied);

  return {
    basic,
    bonus,
    allowanceLines,
    allowancesTotal,
    gross,
    deductionLines,
    deductionsTotal,
    advanceLines,
    advanceApplied,
    advanceOutstanding: toAmount(advanceData?.totalOutstanding),
    monthlyAdvanceTotal: toAmount(advanceData?.totalMonthlyDeduction),
    netSalary,
    finalPayable,
  };
}

export function payrollInvoiceMeta(row) {
  const id = row?.id;
  const payrollId = row?.payrollId || (id ? `PAY-${id}` : '');
  return {
    ...row,
    payrollId,
    invoiceNo: `INV-${payrollId || id || 'DRAFT'}`,
  };
}
