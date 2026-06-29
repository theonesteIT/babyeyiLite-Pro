import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import {
  TAX_REGISTER_HEADERS,
  buildTaxRegisterHeaders,
  buildBankRegisterHeaders,
  buildRunRegisterHeaders,
  taxRowToValues,
  bankRowToValues,
  runRowToValues,
  taxTotalRowToValues,
  bankTotalRowToValues,
  runTotalRowToValues,
} from './payrollReportTables';
import { PAYROLL_REGISTER_TEXT_COL_COUNT } from './payrollRegister';

function stamp() {
  return new Date().toLocaleString();
}

function fmtNum(v, columnIndex) {
  if (columnIndex != null && columnIndex < PAYROLL_REGISTER_TEXT_COL_COUNT) {
    if (v === '-' || v === '' || v == null) return v === '-' ? '-' : '';
    return String(v);
  }
  if (v === '-' || v === '' || v == null) return v === '-' ? '-' : '';
  const n = Number(v);
  return Number.isFinite(n) ? n : String(v);
}

function mapBodyRows(rows, rowMapper) {
  return rows.map((r) => rowMapper(r).map((v, i) => fmtNum(v, i)));
}

function buildSheetAoa({ schoolName, periodLabel, runStatus, note, headers, bodyRows }) {
  return [
    [String(schoolName || 'School').toUpperCase(), periodLabel, `Status: ${runStatus}`, `Generated ${stamp()}`],
    [note || ''],
    [],
    headers,
    ...bodyRows,
  ];
}

function downloadExcelFromAoa(aoa, sheetName, filename) {
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, filename);
}

export function downloadTaxPayrollReportPdf({
  rows = [],
  totalRow = null,
  schoolName = 'School',
  periodLabel = 'Tax Payroll',
  runStatus = 'Processing',
  filename,
}) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const margin = 36;
  const pageW = doc.internal.pageSize.getWidth();

  doc.setFillColor(0, 4, 53);
  doc.rect(0, 0, pageW, 56, 'F');
  doc.setTextColor(254, 191, 16);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Tax Payroll Report', margin, 28);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(
    `${schoolName} · ${periodLabel} · Status: ${runStatus} · Generated ${stamp()}`,
    margin,
    44
  );
  doc.text('Income net excludes Mutuelle (CBHI 0.5%). Template tax/both columns shown separately.', margin, 54);

  const taxColumns = rows[0]?.taxColumns || totalRow?.taxColumns || [];
  const taxHeaders = buildTaxRegisterHeaders(taxColumns);
  const rowMapper = (row) => taxRowToValues(row, taxColumns);
  const body = mapBodyRows(rows, rowMapper);
  if (totalRow) body.push(taxTotalRowToValues(totalRow, taxColumns).map((v, i) => fmtNum(v, i)));

  autoTable(doc, {
    startY: 64,
    head: [taxHeaders],
    body,
    styles: { fontSize: 6, cellPadding: 2, overflow: 'linebreak' },
    headStyles: { fillColor: [0, 4, 53], textColor: [254, 191, 16], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: margin, right: margin },
  });

  doc.save(filename || `tax-payroll-${Date.now()}.pdf`);
}

export function downloadBankPayrollReportPdf({
  rows = [],
  totalRow = null,
  schoolName = 'School',
  periodLabel = 'Bank Payroll',
  runStatus = 'Processing',
  filename,
}) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const margin = 36;
  const pageW = doc.internal.pageSize.getWidth();

  doc.setFillColor(0, 4, 53);
  doc.rect(0, 0, pageW, 56, 'F');
  doc.setTextColor(254, 191, 16);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Bank Payroll Report', margin, 28);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(
    `${schoolName} · ${periodLabel} · Status: ${runStatus} · Generated ${stamp()}`,
    margin,
    44
  );
  doc.text('Includes Mutuelle (CBHI), bank template items, other deductions · Final net = bank payable', margin, 54);

  const bankColumns = rows[0]?.dynamicColumns || totalRow?.dynamicColumns || [];
  const bankHeaders = buildBankRegisterHeaders(bankColumns);
  const rowMapper = (row) => bankRowToValues(row, bankColumns);
  const body = mapBodyRows(rows, rowMapper);
  if (totalRow) body.push(bankTotalRowToValues(totalRow, bankColumns).map((v, i) => fmtNum(v, i)));

  autoTable(doc, {
    startY: 64,
    head: [bankHeaders],
    body,
    styles: { fontSize: 6, cellPadding: 2, overflow: 'linebreak' },
    headStyles: { fillColor: [0, 4, 53], textColor: [254, 191, 16], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: margin, right: margin },
  });

  doc.save(filename || `bank-payroll-${Date.now()}.pdf`);
}

export function downloadTaxPayrollReportExcel({
  rows = [],
  totalRow = null,
  schoolName = 'School',
  periodLabel = 'Tax Payroll',
  runStatus = 'Processing',
  filename,
}) {
  const taxColumns = rows[0]?.taxColumns || totalRow?.taxColumns || [];
  const taxHeaders = buildTaxRegisterHeaders(taxColumns);
  const rowMapper = (row) => taxRowToValues(row, taxColumns);
  const body = mapBodyRows(rows, rowMapper);
  if (totalRow) body.push(taxTotalRowToValues(totalRow, taxColumns).map((v, i) => fmtNum(v, i)));
  const aoa = buildSheetAoa({
    schoolName,
    periodLabel,
    runStatus,
    note: 'Tax payroll — income net excludes Mutuelle. Tax & Both template items shown as columns; Bank-only items excluded.',
    headers: taxHeaders,
    bodyRows: body,
  });
  downloadExcelFromAoa(aoa, 'Tax Payroll', filename || `tax-payroll-${Date.now()}.xlsx`);
}

export function downloadBankPayrollReportExcel({
  rows = [],
  totalRow = null,
  schoolName = 'School',
  periodLabel = 'Bank Payroll',
  runStatus = 'Processing',
  filename,
}) {
  const bankColumns = rows[0]?.dynamicColumns || totalRow?.dynamicColumns || [];
  const bankHeaders = buildBankRegisterHeaders(bankColumns);
  const rowMapper = (row) => bankRowToValues(row, bankColumns);
  const body = mapBodyRows(rows, rowMapper);
  if (totalRow) body.push(bankTotalRowToValues(totalRow, bankColumns).map((v, i) => fmtNum(v, i)));
  const aoa = buildSheetAoa({
    schoolName,
    periodLabel,
    runStatus,
    note: 'Bank payroll — includes Mutuelle (CBHI), template bank items, other deductions, final net salary, bank & account.',
    headers: bankHeaders,
    bodyRows: body,
  });
  downloadExcelFromAoa(aoa, 'Bank Payroll', filename || `bank-payroll-${Date.now()}.xlsx`);
}

export function downloadRunPayrollRegisterExcel({
  rows = [],
  totalRow = null,
  schoolName = 'School',
  periodLabel = 'Payroll Run',
  runStatus = 'Processing',
  netPayLabel = 'BANK NET',
  filename,
}) {
  const runColumns = rows[0]?.runColumns || totalRow?.runColumns || [];
  const runHeaders = buildRunRegisterHeaders(runColumns, netPayLabel);
  const rowMapper = (row) => runRowToValues(row, runColumns);
  const body = mapBodyRows(rows, rowMapper);
  if (totalRow) body.push(runTotalRowToValues(totalRow, runColumns).map((v, i) => fmtNum(v, i)));
  const aoa = buildSheetAoa({
    schoolName,
    periodLabel,
    runStatus,
    note: 'Payroll run register with template allowance/deduction columns and bank net.',
    headers: runHeaders,
    bodyRows: body,
  });
  downloadExcelFromAoa(aoa, 'Payroll Run', filename || `payroll-run-${Date.now()}.xlsx`);
}
