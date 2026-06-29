import {
  PAYROLL_REGISTER_HEADERS,
  mapApiLineToRegisterRow,
  registerRowToValues,
  sumPayrollRegisterRows,
} from './payrollRegister';
import { mapLineToPaymentRow } from '../services/payrollDisbursementService';
import { isPayrollRunPaid } from '../services/payrollRunService';
import {
  getActiveBankPayrollColumns,
  getActiveTaxPayrollColumns,
  getActiveRunTemplateColumns,
  taxItemAmountForColumn,
  bankItemAmountForColumn,
  mergeBankColumnsFromItems,
  mergeTaxColumnsFromItems,
  bankPayrollNetAdjust,
  resolveStaffPayrollItems,
  allTemplateItemsForRow,
  payrollItemAmountForColumn,
} from '../../../../shared/payroll/payrollTemplateChannels';

/** Tax register base columns (before dynamic template columns). */
export const TAX_REGISTER_BASE_COUNT = 26;

/** Bank register base columns (before dynamic template columns). */
export const BANK_REGISTER_BASE_COUNT = PAYROLL_REGISTER_HEADERS.length;

/** Tax register — register columns + optional template columns + status. */
export const TAX_REGISTER_HEADERS = [
  ...PAYROLL_REGISTER_HEADERS.slice(0, TAX_REGISTER_BASE_COUNT),
  'STATUS',
];

/** Bank register — full register plus other deductions and final bank net. */
export const BANK_REGISTER_HEADERS = [
  ...PAYROLL_REGISTER_HEADERS,
  'OTHER DEDUCTIONS',
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

function resolveLineBankFields(line = {}, payment = null) {
  return {
    bankName: String(
      line?.bankName
      || line?.payroll_bank_name
      || payment?.bankName
      || payment?.bank
      || '',
    ).trim(),
    bankAccount: String(
      line?.bankAccount
      || line?.payroll_account_number
      || payment?.account
      || '',
    ).trim(),
  };
}

function resolveFinalNetPay({
  registerRow,
  line,
  payment,
  afterTemplateBank,
  otherDeductions,
  bankTemplateAdjust,
}) {
  const computed = Math.max(0, afterTemplateBank - otherDeductions);
  if (computed > 0) return computed;

  const bankNet = toNum(
    line?.bankNetPay
    ?? line?.calcSnapshot?.bankNetPay
    ?? registerRow?.bankNetPay
    ?? payment?.raw?.bankNetPay,
  );
  if (bankNet > 0) return Math.max(0, bankNet - otherDeductions);

  const paymentFinal = payment ? toNum(payment.finalPayable) : 0;
  if (paymentFinal > 0) return paymentFinal;

  return Math.max(
    0,
    toNum(registerRow?.netPayFinal ?? registerRow?.netPay) + bankTemplateAdjust - otherDeductions,
  );
}

export function resolveTaxReportColumns(reportRows = [], template = null) {
  const allItems = (reportRows || []).flatMap((row) => row.taxPayrollItems || []);
  return mergeTaxColumnsFromItems(allItems, getActiveTaxPayrollColumns(template));
}

export function resolveBankReportColumns(reportRows = [], template = null) {
  const allItems = (reportRows || []).flatMap((row) => row.bankPayrollItems || []);
  return mergeBankColumnsFromItems(allItems, getActiveBankPayrollColumns(template));
}

export function buildTaxRegisterHeaders(dynamicColumns = []) {
  const dynHeaders = (dynamicColumns || []).map((col) => String(col.name || '').toUpperCase());
  return [
    ...PAYROLL_REGISTER_HEADERS.slice(0, TAX_REGISTER_BASE_COUNT),
    ...dynHeaders,
    'STATUS',
  ];
}

export function buildBankRegisterHeaders(dynamicColumns = []) {
  const dynHeaders = (dynamicColumns || []).map((col) => String(col.name || '').toUpperCase());
  return [
    ...PAYROLL_REGISTER_HEADERS,
    ...dynHeaders,
    'OTHER DEDUCTIONS',
    'FINAL NET SALARY',
    'BANK',
    'ACCOUNT',
    'STATUS',
  ];
}

export function resolveRunReportColumns(template = null) {
  return getActiveRunTemplateColumns(template);
}

export function buildRunRegisterHeaders(dynamicColumns = [], netPayLabel = 'BANK NET') {
  const dynHeaders = (dynamicColumns || []).map((col) => String(col.name || '').toUpperCase());
  return [
    ...PAYROLL_REGISTER_HEADERS,
    ...dynHeaders,
    netPayLabel,
    'STATUS',
  ];
}

export function enrichRegisterRowForReports(registerRow, line = null, runStatus = 'processing', template = null) {
  const status = runStatusLabel(runStatus);
  const payment = line ? mapLineToPaymentRow(line) : null;
  const { taxPayrollItems, bankPayrollItems } = resolveStaffPayrollItems({
    registerRow,
    line,
    template,
    calcSnapshot: line?.calcSnapshot,
  });
  const bankTemplateAdjust = bankPayrollNetAdjust(bankPayrollItems);
  const taxNetPay = toNum(registerRow.netPayFinal ?? registerRow.netPay);
  const afterTemplateBank = taxNetPay + bankTemplateAdjust;
  const otherDeductions = line ? otherDeductionsFromLine(line) : 0;
  const finalNetPay = resolveFinalNetPay({
    registerRow,
    line,
    payment,
    afterTemplateBank,
    otherDeductions,
    bankTemplateAdjust,
  });
  const { bankName, bankAccount } = resolveLineBankFields(line, payment);

  return {
    registerRow,
    status,
    taxPayrollItems,
    bankPayrollItems,
    bankTemplateAdjust,
    otherDeductions,
    otherDeductionLabels: payment?.deductionNames || '',
    finalNetPay,
    taxNetPay,
    bankName,
    bankAccount,
    staffUserId: line?.staffUserId || null,
  };
}

export function registerRowsFromRunDetail(runDetail, template = null) {
  const lines = runDetail?.lines || [];
  const runStatus = runDetail?.status || 'processing';
  const rows = lines.map((line) => {
    const registerRow = mapApiLineToRegisterRow(line);
    return enrichRegisterRowForReports(registerRow, line, runStatus, template);
  });
  const taxColumns = resolveTaxReportColumns(rows, template);
  const bankColumns = resolveBankReportColumns(rows, template);
  const runColumns = resolveRunReportColumns(template);
  return rows.map((row) => ({ ...row, taxColumns, dynamicColumns: bankColumns, runColumns }));
}

function signedColumnValue(amount, kind) {
  if (!amount) return 0;
  return kind === 'allowance' ? amount : -amount;
}

export function taxRowToValues(row, dynamicColumns = row?.taxColumns || []) {
  const reg = row.registerRow || row;
  const base = registerRowToValues(reg).slice(0, TAX_REGISTER_BASE_COUNT);
  const dynValues = (dynamicColumns || []).map((col) => signedColumnValue(
    taxItemAmountForColumn(row.taxPayrollItems, col),
    col.kind,
  ));
  return [...base, ...dynValues, row.status || runStatusLabel('processing')];
}

export function bankRowToValues(row, dynamicColumns = row?.dynamicColumns || []) {
  const reg = row.registerRow || row;
  const dynValues = (dynamicColumns || []).map((col) => signedColumnValue(
    bankItemAmountForColumn(row.bankPayrollItems, col),
    col.kind,
  ));
  const finalNetFallback = Math.max(
    0,
    toNum(reg.netPayFinal ?? reg.netPay) + toNum(row.bankTemplateAdjust) - toNum(row.otherDeductions),
  );
  const finalNetPay = toNum(row.finalNetPay) || finalNetFallback;

  return [
    ...registerRowToValues(reg),
    ...dynValues,
    toNum(row.otherDeductions),
    finalNetPay,
    row.bankName || '',
    row.bankAccount || '',
    row.status || runStatusLabel('processing'),
  ];
}

export function sumTaxReportRows(rows = [], dynamicColumns = rows?.[0]?.taxColumns || []) {
  const regRows = rows.map((r) => r.registerRow || r);
  const totals = sumPayrollRegisterRows(regRows);
  const colTotals = (dynamicColumns || []).map((col) => ({
    ...col,
    total: rows.reduce(
      (sum, row) => sum + signedColumnValue(taxItemAmountForColumn(row.taxPayrollItems, col), col.kind),
      0,
    ),
  }));
  return {
    ...totals,
    taxColumns: colTotals,
    status: rows[0]?.status || '',
  };
}

export function sumBankReportRows(rows = [], dynamicColumns = rows?.[0]?.dynamicColumns || []) {
  const regRows = rows.map((r) => r.registerRow || r);
  const totals = sumPayrollRegisterRows(regRows);
  let otherDeductions = 0;
  let finalNetPay = 0;
  const colTotals = (dynamicColumns || []).map((col) => ({
    ...col,
    total: rows.reduce(
      (sum, row) => sum + signedColumnValue(bankItemAmountForColumn(row.bankPayrollItems, col), col.kind),
      0,
    ),
  }));
  for (const row of rows) {
    otherDeductions += toNum(row.otherDeductions);
    finalNetPay += toNum(row.finalNetPay);
  }
  return {
    registerRow: totals,
    dynamicColumns: colTotals,
    otherDeductions,
    finalNetPay,
    status: '',
  };
}

export function taxTotalRowToValues(totalRow, dynamicColumns = totalRow?.taxColumns || []) {
  const base = registerRowToValues(totalRow).slice(0, TAX_REGISTER_BASE_COUNT);
  const dynValues = (dynamicColumns || []).map((col) => {
    const match = (totalRow.taxColumns || []).find(
      (c) => normalizeCol(c) === normalizeCol(col),
    );
    return toNum(match?.total);
  });
  return [...base, ...dynValues, ''];
}

export function bankTotalRowToValues(totalRow, dynamicColumns = totalRow?.dynamicColumns || []) {
  const reg = totalRow.registerRow || totalRow;
  const dynValues = (dynamicColumns || []).map((col) => {
    const match = (totalRow.dynamicColumns || []).find(
      (c) => normalizeCol(c) === normalizeCol(col),
    );
    return toNum(match?.total);
  });
  return [
    ...registerRowToValues(reg),
    ...dynValues,
    toNum(totalRow.otherDeductions),
    toNum(totalRow.finalNetPay),
    '',
    '',
    '',
  ];
}

export function runRowToValues(row, dynamicColumns = row?.runColumns || []) {
  const reg = row.registerRow || row;
  const items = allTemplateItemsForRow(row);
  const dynValues = (dynamicColumns || []).map((col) => signedColumnValue(
    payrollItemAmountForColumn(items, col),
    col.kind,
  ));
  const bankNet = toNum(row.finalNetPay ?? row.bankNetPay ?? (toNum(reg.netPayFinal) + toNum(row.bankTemplateAdjust)));
  return [
    ...registerRowToValues(reg),
    ...dynValues,
    bankNet,
    row.status || runStatusLabel('processing'),
  ];
}

export function runTotalRowToValues(totalRow, dynamicColumns = totalRow?.runColumns || []) {
  const reg = totalRow.registerRow || totalRow;
  const dynValues = (dynamicColumns || []).map((col) => {
    const match = (totalRow.runColumns || []).find((c) => normalizeCol(c) === normalizeCol(col));
    return toNum(match?.total);
  });
  return [
    ...registerRowToValues(reg),
    ...dynValues,
    toNum(totalRow.finalNetPay),
    '',
  ];
}

function normalizeCol(col) {
  return String(col?.id || col?.name || '').toLowerCase();
}

export function sumRunReportRows(rows = [], dynamicColumns = rows?.[0]?.runColumns || []) {
  const base = sumBankReportRows(rows, dynamicColumns);
  const colTotals = (dynamicColumns || []).map((col) => ({
    ...col,
    total: rows.reduce((sum, row) => {
      const items = allTemplateItemsForRow(row);
      return sum + signedColumnValue(payrollItemAmountForColumn(items, col), col.kind);
    }, 0),
  }));
  return {
    ...base,
    runColumns: colTotals,
    finalNetPay: rows.reduce((s, r) => s + toNum(r.finalNetPay), 0),
  };
}

export function enrichPreviewRowForReports(previewRow, template = null, runStatus = 'Processing') {
  const taxNet = toNum(previewRow.netPayFinal ?? previewRow.calcSnapshot?.finalNet);
  return enrichRegisterRowForReports(
    previewRow,
    {
      calcSnapshot: previewRow.calcSnapshot,
      staffUserId: previewRow.staffUserId,
      taxPayrollItems: previewRow.calcSnapshot?.taxPayrollItems,
      bankPayrollItems: previewRow.calcSnapshot?.bankPayrollItems,
      bankNetPay: previewRow.calcSnapshot?.bankNetPay ?? taxNet,
      net: taxNet,
      netSalary: taxNet,
      netPayFinal: taxNet,
      bankName: previewRow.bankName || previewRow.payroll?.bankName || '',
      bankAccount: previewRow.bankAccount || previewRow.payroll?.bankAccount || '',
    },
    runStatus,
    template,
  );
}

export function buildPreviewReportRows(previewRows = [], template = null) {
  const enriched = previewRows.map((row) => enrichPreviewRowForReports(row, template));
  const taxColumns = resolveTaxReportColumns(enriched, template);
  const bankColumns = resolveBankReportColumns(enriched, template);
  const runColumns = resolveRunReportColumns(template);
  return enriched.map((row) => ({ ...row, taxColumns, dynamicColumns: bankColumns, runColumns }));
}

export function computeReportAnalytics(rows = [], runDetail = null) {
  const regRows = rows.map((r) => r.registerRow || r);
  const totals = regRows.length ? sumPayrollRegisterRows(regRows) : null;
  const paid = isPayrollRunPaid(runDetail?.status);
  const otherDedTotal = rows.reduce((s, r) => s + toNum(r.otherDeductions), 0);
  const bankNetTotal = rows.reduce((s, r) => s + toNum(r.finalNetPay), 0);
  const bankTemplateAdjustTotal = rows.reduce((s, r) => s + toNum(r.bankTemplateAdjust), 0);

  return {
    employeeCount: rows.length,
    grossTotal: toNum(totals?.gross),
    payeTotal: toNum(totals?.paye),
    csrTotal: toNum(totals?.totalCsr14),
    ramaTotal: totals?.ramaTotal === '-' ? 0 : toNum(totals?.ramaTotal),
    taxNetTotal: toNum(totals?.netPay),
    mutuelTotal: toNum(totals?.mutuel),
    bankNetTotal: bankNetTotal || toNum(totals?.netPayFinal),
    bankTemplateAdjustTotal,
    otherDedTotal,
    runStatus: runDetail?.status || 'preview',
    runStatusLabel: runDetail ? runStatusLabel(runDetail.status) : 'Preview',
    isPaid: paid,
  };
}
