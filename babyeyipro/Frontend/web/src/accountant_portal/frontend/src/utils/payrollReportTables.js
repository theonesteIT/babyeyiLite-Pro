import {
  PAYROLL_REGISTER_HEADERS,
  mapApiLineToRegisterRow,
  registerRowToValues,
  sumPayrollRegisterRows,
} from './payrollRegister';
import { mapLineToPaymentRow } from '../services/payrollDisbursementService';
import { isPayrollRunPaid } from '../services/payrollRunService';

/** Tax register — same as payroll run register but excludes MUTUEL and post-Mutuelle NET PAY. */
export const TAX_REGISTER_HEADERS = [
  ...PAYROLL_REGISTER_HEADERS.slice(0, 26),
  'STATUS',
];

/** Bank register — full register plus other deductions and final bank net. */
export const BANK_REGISTER_HEADERS = [
  ...PAYROLL_REGISTER_HEADERS,
  'OTHER DEDUCTIONS',
  'OTHER DED. DETAIL',
  'FINAL NET SALARY',
  'BANK',
  'ACCOUNT',
  'STATUS',
];

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function runStatusLabel(status) {
  return isPayrollRunPaid(status) ? 'Paid' : 'Processing';
}

export function otherDeductionsFromLine(line = {}) {
  const payment = mapLineToPaymentRow(line);
  const disbursement = (payment.disbursementDeductions || []).reduce((s, d) => s + toNum(d.amount), 0);
  return toNum(payment.extraDeduction) + disbursement;
}

export function enrichRegisterRowForReports(registerRow, line = null, runStatus = 'processing') {
  const status = runStatusLabel(runStatus);
  const payment = line ? mapLineToPaymentRow(line) : null;
  const otherDeductions = line ? otherDeductionsFromLine(line) : 0;
  const finalNetPay = payment
    ? toNum(payment.finalPayable)
    : toNum(registerRow.netPayFinal ?? registerRow.netPay);

  return {
    registerRow,
    status,
    otherDeductions,
    otherDeductionLabels: payment?.deductionNames || '',
    finalNetPay,
    bankAccount: line?.bankAccount || '',
    bankName: line?.bankName || '',
    staffUserId: line?.staffUserId || null,
  };
}

export function registerRowsFromRunDetail(runDetail) {
  const lines = runDetail?.lines || [];
  const runStatus = runDetail?.status || 'processing';
  return lines.map((line) => {
    const registerRow = mapApiLineToRegisterRow(line);
    return enrichRegisterRowForReports(registerRow, line, runStatus);
  });
}

export function taxRowToValues(row) {
  const reg = row.registerRow || row;
  const base = registerRowToValues(reg).slice(0, 26);
  return [...base, row.status || runStatusLabel('processing')];
}

export function bankRowToValues(row) {
  const reg = row.registerRow || row;
  return [
    ...registerRowToValues(reg),
    toNum(row.otherDeductions),
    row.otherDeductionLabels || '',
    toNum(row.finalNetPay ?? reg.netPayFinal),
    row.bankName || '',
    row.bankAccount || '',
    row.status || runStatusLabel('processing'),
  ];
}

export function sumTaxReportRows(rows = []) {
  const regRows = rows.map((r) => r.registerRow || r);
  const totals = sumPayrollRegisterRows(regRows);
  return {
    ...totals,
    status: rows[0]?.status || '',
  };
}

export function sumBankReportRows(rows = []) {
  const regRows = rows.map((r) => r.registerRow || r);
  const totals = sumPayrollRegisterRows(regRows);
  let otherDeductions = 0;
  let finalNetPay = 0;
  for (const row of rows) {
    otherDeductions += toNum(row.otherDeductions);
    finalNetPay += toNum(row.finalNetPay);
  }
  return {
    registerRow: totals,
    otherDeductions,
    finalNetPay,
    status: '',
  };
}

export function taxTotalRowToValues(totalRow) {
  const base = registerRowToValues(totalRow).slice(0, 26);
  return [...base, ''];
}

export function bankTotalRowToValues(totalRow) {
  const reg = totalRow.registerRow || totalRow;
  return [
    ...registerRowToValues(reg),
    toNum(totalRow.otherDeductions),
    '',
    toNum(totalRow.finalNetPay),
    '',
    '',
    '',
  ];
}

export function computeReportAnalytics(rows = [], runDetail = null) {
  const regRows = rows.map((r) => r.registerRow || r);
  const totals = regRows.length ? sumPayrollRegisterRows(regRows) : null;
  const paid = isPayrollRunPaid(runDetail?.status);
  const otherDedTotal = rows.reduce((s, r) => s + toNum(r.otherDeductions), 0);
  const bankNetTotal = rows.reduce((s, r) => s + toNum(r.finalNetPay), 0);

  return {
    employeeCount: rows.length,
    grossTotal: toNum(totals?.gross),
    payeTotal: toNum(totals?.paye),
    csrTotal: toNum(totals?.totalCsr14),
    ramaTotal: totals?.ramaTotal === '-' ? 0 : toNum(totals?.ramaTotal),
    taxNetTotal: toNum(totals?.netPay),
    mutuelTotal: toNum(totals?.mutuel),
    bankNetTotal: bankNetTotal || toNum(totals?.netPayFinal),
    otherDedTotal,
    runStatus: runDetail?.status || 'preview',
    runStatusLabel: runDetail ? runStatusLabel(runDetail.status) : 'Preview',
    isPaid: paid,
  };
}
