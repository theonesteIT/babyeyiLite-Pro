import api from './api';
import { getPayrollRuns, getPayrollRun } from './payrollRunService';

export { getPayrollRuns, getPayrollRun };

export function isPayrollRunApproved(status) {
  const s = String(status || '').toLowerCase();
  return s === 'processing' || s === 'processed';
}

export function isPayrollRunPaid(status) {
  return String(status || '').toLowerCase() === 'paid';
}

export function isPayrollRunLocked(status) {
  return isPayrollRunPaid(status);
}

export function disbursementStatusLabel(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'paid') return 'Paid';
  if (isPayrollRunApproved(s)) return 'Approved';
  if (s === 'draft') return 'Draft';
  if (s === 'rejected') return 'Rejected';
  return status || 'Unknown';
}

export function bankShortName(name) {
  const n = String(name || '').trim().toLowerCase();
  if (!n) return '—';
  if (n.includes('kigali') || n === 'bk' || n.includes('bok')) return 'BK';
  if (n.includes('equity')) return 'Equity';
  if (n.includes('bpr')) return 'BPR';
  if (n.includes('i&m') || n.includes('im bank')) return 'I&M';
  if (n.includes('ecobank')) return 'Ecobank';
  return String(name).trim();
}

export async function getApprovedPayrollRuns(params = {}) {
  return getPayrollRuns({ ...params, status: 'approved' });
}

export async function getPaidPayrollRuns(params = {}) {
  return getPayrollRuns({ ...params, status: 'paid' });
}

export async function getDisbursementDeductionRules(params = {}) {
  const res = await api.get('/accountant/payroll/disbursement-deduction-rules', { params });
  return Array.isArray(res.data?.data) ? res.data.data : [];
}

export async function createDisbursementDeductionRule(payload) {
  const res = await api.post('/accountant/payroll/disbursement-deduction-rules', payload);
  return res.data || null;
}

export async function updateDisbursementDeductionRule(id, payload) {
  const ruleId = Number(id);
  if (!ruleId) throw new Error('Invalid deduction rule id');
  const res = await api.patch(`/accountant/payroll/disbursement-deduction-rules/${ruleId}`, payload);
  const body = res.data || {};
  if (body.success === false) throw new Error(body.message || 'Failed to update deduction rule');
  return body;
}

export async function deleteDisbursementDeductionRule(id) {
  const ruleId = Number(id);
  if (!ruleId) throw new Error('Invalid deduction rule id');
  const res = await api.delete(`/accountant/payroll/disbursement-deduction-rules/${ruleId}`);
  const body = res.data || {};
  if (body.success === false) throw new Error(body.message || 'Failed to delete deduction rule');
  return body;
}

export async function deletePayrollRun(id) {
  const runId = Number(id);
  if (!runId) throw new Error('Invalid payroll run id');
  const res = await api.delete(`/accountant/payroll/runs/${runId}`);
  const body = res.data || {};
  if (body.success === false) throw new Error(body.message || 'Failed to delete payroll run');
  return body;
}

export async function applyScheduledDeductions(runId) {
  const res = await api.post(`/accountant/payroll/runs/${runId}/apply-scheduled-deductions`);
  return res.data || null;
}

export async function applyDisbursementDeductions(runId, payload) {
  const res = await api.post(`/accountant/payroll/runs/${runId}/disbursement-deductions`, {
    saveAsRule: true,
    ...payload,
  });
  return res.data || null;
}

export async function markPayrollRunPaidWithDetails(runId, payload) {
  const res = await api.patch(`/accountant/payroll/runs/${runId}/status`, {
    status: 'paid',
    ...payload,
  });
  return res.data || null;
}

export async function getPayrollRunAuditTrail(runId) {
  const res = await api.get(`/accountant/payroll/runs/${runId}/audit-trail`);
  return Array.isArray(res.data?.data) ? res.data.data : [];
}

function parseDisbursementOnlyDeductions(line = {}) {
  let items = [];
  if (Array.isArray(line.extraDeductions)) {
    items = line.extraDeductions;
  } else if (line.register_json) {
    try {
      const snap = typeof line.register_json === 'string' ? JSON.parse(line.register_json) : line.register_json;
      items = Array.isArray(snap?.extraDeductions) ? snap.extraDeductions : [];
    } catch {
      items = [];
    }
  }
  return items
    .map((d) => ({
      name: String(d?.type || d?.deductionType || 'Deduction').trim(),
      amount: Number(d?.amount || 0),
      reason: String(d?.reason || '').trim(),
    }))
    .filter((d) => d.amount > 0);
}

export function mapLineToPaymentRow(line = {}) {
  const name = line.staff || `${line.firstName || ''} ${line.familyName || ''}`.trim();
  const parts = name.split(/\s+/).filter(Boolean);
  const photo = parts.length >= 2
    ? `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase()
    : (parts[0]?.slice(0, 2) || '??').toUpperCase();
  const netSalary = Number(line.netSalary ?? line.net ?? line.netPayFinal ?? 0);
  const bankNetPay = Number(line.bankNetPay ?? line.raw?.bankNetPay ?? netSalary);
  const extraDeduction = Number(line.extraDeduction || 0);
  const computedFinal = Math.max(0, bankNetPay - extraDeduction);
  const storedFinal = Number(line.finalPayable);
  const finalPayable = Number.isFinite(storedFinal) && storedFinal > 0
    ? storedFinal
    : computedFinal;
  const disbursementDeductions = parseDisbursementOnlyDeductions(line);
  const deductionNames = disbursementDeductions.map((d) => d.name).join('; ');
  const deductionAmounts = disbursementDeductions.map((d) => d.amount).join('; ');
  return {
    lineDbId: line.lineDbId,
    staffUserId: line.staffUserId,
    id: line.staffCode || line.nationalId || line.id || '',
    name,
    photo,
    dept: line.dept || '',
    bank: bankShortName(line.bankName || line.payroll_bank_name),
    bankName: line.bankName || line.payroll_bank_name || '',
    account: line.bankAccount || line.payroll_account_number || '',
    netSalary,
    extraDeduction,
    disbursementDeductions,
    deductionNames,
    deductionAmounts,
    finalPayable,
    gross: Number(line.gross || 0),
    basic: Number(line.basic || 0),
    allowances: Number(line.allowances || line.totalAllowances || 0),
    paye: Number(line.paye || 0),
    rssb: Number(line.rssb || line.csrEmployee6 || 0),
    rama: Number(line.rama || line.ramaEmployee || 0),
    cbhi: Number(line.cbhi || line.mutuel || 0),
    housingAllowance: Number(line.housingAllowance || 0),
    transportAllowance: Number(line.transportAllowance || 0),
    othersAllowance: Number(line.othersAllowance || 0),
    raw: line,
  };
}

export function groupPaymentsByBank(rows = []) {
  const map = new Map();
  for (const row of rows) {
    const key = row.bank || '—';
    const prev = map.get(key) || { name: key, employees: 0, amount: 0 };
    prev.employees += 1;
    prev.amount += Number(row.finalPayable || 0);
    map.set(key, prev);
  }
  return [...map.values()].sort((a, b) => b.amount - a.amount);
}

export function downloadDisbursementExcel({ rows, filename, runNumber }) {
  const header = ['Staff ID', 'Employee', 'Department', 'Bank', 'Account Number', 'Net Salary', 'Extra Deduction', 'Final Payable'];
  const lines = [
    header,
    ...rows.map((r) => [
      r.id,
      r.name,
      r.dept,
      r.bankName || r.bank,
      r.account,
      r.netSalary,
      r.extraDeduction,
      r.finalPayable,
    ]),
  ];
  const csv = `\uFEFF${lines.map((line) => line.map((v) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(',')).join('\n')}\n`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `payroll-disbursement-${runNumber || Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function buildBankFileRows(bankName, rows, runNumber) {
  const ref = runNumber || 'PAYROLL';
  return rows
    .filter((r) => bankShortName(r.bankName || r.bank) === bankShortName(bankName))
    .filter((r) => String(r.account || '').trim())
    .map((r) => {
      const staffRef = String(r.id || 'STAFF').replace(/\s+/g, '-');
      return {
        accountNumber: String(r.account || '').trim(),
        accountName: String(r.name || '').trim().toUpperCase(),
        amount: Math.round(Number(r.finalPayable || 0)),
        deductionName: r.deductionNames || '',
        deductionAmount: r.deductionAmounts || (r.extraDeduction ? String(r.extraDeduction) : ''),
        reference: `${ref}-${staffRef}`,
      };
    });
}

export function downloadBankPaymentFile({ bankName, rows, runNumber, monthLabel }) {
  const bankRows = buildBankFileRows(bankName, rows, runNumber);
  const header = ['Account Number', 'Account Name', 'Amount', 'Deduction Name', 'Deduction Amount', 'Reference'];
  const lines = [
    header,
    ...bankRows.map((r) => [
      r.accountNumber,
      r.accountName,
      r.amount,
      r.deductionName,
      r.deductionAmount,
      r.reference,
    ]),
  ];
  const csv = `\uFEFF${lines.map((line) => line.map((v) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(',')).join('\n')}\n`;
  const blob = new Blob([csv], { type: 'text/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeBank = bankShortName(bankName).replace(/\s+/g, '_');
  const safeMonth = String(monthLabel || 'payroll').replace(/\s+/g, '_');
  a.download = `${safeMonth}_${safeBank}_${runNumber || Date.now()}.xls`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadBankPaymentExcel({ bankName, rows, runNumber, monthLabel }) {
  const XLSX = await import('xlsx');
  const bankRows = buildBankFileRows(bankName, rows, runNumber);
  const aoa = [
    ['Account Number', 'Account Name', 'Amount', 'Deduction Name', 'Deduction Amount', 'Reference'],
    ...bankRows.map((r) => [
      r.accountNumber,
      r.accountName,
      r.amount,
      r.deductionName,
      r.deductionAmount,
      r.reference,
    ]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Bank Transfer');
  const safeBank = bankShortName(bankName).replace(/\s+/g, '_');
  const safeMonth = String(monthLabel || 'payroll').replace(/\s+/g, '_');
  XLSX.writeFile(wb, `${safeMonth}_${safeBank}_${runNumber || Date.now()}.xlsx`);
}

export function employeePaymentStatus(runStatus) {
  const s = String(runStatus || '').toLowerCase();
  return s === 'paid' ? 'Paid' : 'Processing';
}

export function formatPayrollPaymentDate(run = {}) {
  const raw = run.paymentDate || run.paidAt || run.paid_at;
  if (!raw) return '—';
  try {
    return new Date(raw).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return String(raw);
  }
}

function filterRowsByBank(bankName, rows = []) {
  return rows.filter((r) => bankShortName(r.bankName || r.bank) === bankShortName(bankName));
}

/**
 * Modern bank payroll report — employee, amount paid, status, date (+ account for bank file).
 */
export async function downloadBankPayrollReportExcel({
  bankName,
  rows = [],
  runDetail = {},
  schoolName = '',
}) {
  const XLSX = await import('xlsx');
  const bankRows = filterRowsByBank(bankName, rows);
  const meta = bankMetaLabel(bankName);
  const period = runDetail.monthLabel && runDetail.payYear
    ? `${runDetail.monthLabel} ${runDetail.payYear}`
    : (runDetail.period || '—');
  const paymentDate = formatPayrollPaymentDate(runDetail);
  const total = bankRows.reduce((s, r) => s + Number(r.finalPayable || 0), 0);

  const aoa = [
    ['Bank Payroll Report'],
    ['School', schoolName || '—'],
    ['Bank', meta],
    ['Payroll Run', runDetail.runNumber || '—'],
    ['Period', period],
    ['Payment Date', paymentDate],
    ['Generated', new Date().toLocaleString('en-GB')],
    [],
    ['Staff ID', 'Employee Name', 'Account Number', 'Amount Paid (RWF)', 'Status', 'Payment Date'],
    ...bankRows.map((r) => [
      r.id || '',
      r.name || '',
      r.account || '',
      Math.round(Number(r.finalPayable || 0)),
      r.paymentStatus || employeePaymentStatus(runDetail.status),
      r.paymentDate || paymentDate,
    ]),
    [],
    ['TOTAL', '', '', Math.round(total), `${bankRows.length} employees`, ''],
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [
    { wch: 14 },
    { wch: 28 },
    { wch: 18 },
    { wch: 16 },
    { wch: 12 },
    { wch: 14 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Bank Payroll');
  const safeBank = bankShortName(bankName).replace(/\s+/g, '_');
  const safeMonth = String(runDetail.monthLabel || 'payroll').replace(/\s+/g, '_');
  XLSX.writeFile(wb, `${safeMonth}_${safeBank}_Payroll_${runDetail.runNumber || Date.now()}.xlsx`);
}

function bankMetaLabel(name) {
  const n = String(name || '').trim();
  if (!n || n === '—') return 'Unassigned';
  return n;
}
