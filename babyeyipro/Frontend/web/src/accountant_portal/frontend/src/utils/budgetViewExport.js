import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { getPresetForSource } from './budgetIncomeConfig';
import { formatBudgetDate, formatBudgetPeriod } from './budgetReportFormat';
function incomeLabel(row) {
  const src = row.incomeSource || row.incomeSourceKey || '';
  if (String(src).toLowerCase() === 'other') return row.customSourceName || 'Other Income';
  return getPresetForSource(src)?.label || src || '—';
}

function incomeGross(row) {
  return Number(row.config?.grossAmount ?? row.expectedAmount ?? 0);
}

function incomeDeductions(row) {
  return Number(row.config?.totalDeductions ?? 0);
}

function incomeNet(row) {
  return Number(row.expectedAmount ?? row.config?.netAmount ?? 0);
}

function budgetTotals(incomes) {
  const gross = incomes.reduce((s, r) => s + incomeGross(r), 0);
  const deductions = incomes.reduce((s, r) => s + incomeDeductions(r), 0);
  const net = incomes.reduce((s, r) => s + incomeNet(r), 0);
  return { gross, deductions, net };
}

function safeFileName(code) {
  return String(code || 'budget').replace(/[^\w\-]+/g, '_');
}

export function exportBudgetPdf(budget, fmt) {
  if (!budget) return;
  const incomes = budget.incomeSources || [];
  const totals = budgetTotals(incomes);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const navy = [0, 4, 53];
  const amber = [245, 158, 11];

  doc.setFillColor(...navy);
  doc.rect(0, 0, 595, 56, 'F');
  doc.setTextColor(...amber);
  doc.setFontSize(16);
  doc.text('School Budget Report', 40, 34);
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text(`${budget.budgetCode || ''} · ${budget.title || ''}`, 40, 48);

  doc.setTextColor(...navy);
  doc.setFontSize(10);
  let y = 72;
  const metaRows = [
    ['Budget code', budget.budgetCode],
    ['Title', budget.title],
    ['Academic year', budget.academicYear],
    ['Term', budget.term],
    ['Type', budget.budgetType],
    ['Status', budget.statusLabel || budget.status],
    ['Prepared by', budget.preparedByName || '—'],
    ['Period', formatBudgetPeriod(budget.startDate, budget.endDate)],
  ];
  metaRows.forEach(([k, v]) => {
    doc.setFont(undefined, 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`${k}:`, 40, y);
    doc.setTextColor(...navy);
    doc.text(String(v ?? '—'), 140, y);
    y += 14;
  });

  if (budget.description) {
    y += 6;
    doc.setFont(undefined, 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Description:', 40, y);
    y += 14;
    doc.setTextColor(...navy);
    const lines = doc.splitTextToSize(budget.description, 515);
    doc.text(lines, 40, y);
    y += lines.length * 12 + 8;
  }
  y += 4;
  autoTable(doc, {
    startY: y,
    head: [['Metric', 'Amount (RWF)']],
    body: [
      ['Total gross income', fmt(totals.gross)],
      ['Total deductions', fmt(totals.deductions)],
      ['Total net budget income', fmt(totals.net)],
      ['Allocated', fmt(budget.totalAllocated || 0)],
      ['Remaining balance', fmt(budget.remainingBalance ?? totals.net - (budget.totalAllocated || 0))],
    ],
    headStyles: { fillColor: navy, textColor: amber, fontStyle: 'normal' },
    styles: { fontSize: 9, fontStyle: 'normal' },  });

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 16,
    head: [['Income source', 'Gross (RWF)', 'Deductions (RWF)', 'Net (RWF)', 'Frequency']],
    body: incomes.map((row) => [
      incomeLabel(row),
      fmt(incomeGross(row)),
      fmt(incomeDeductions(row)),
      fmt(incomeNet(row)),
      row.collectionFrequency || '—',
    ]),
    headStyles: { fillColor: navy, textColor: amber, fontStyle: 'normal' },
    styles: { fontSize: 8, fontStyle: 'normal' },  });

  const allDeductions = [];
  incomes.forEach((row) => {
    (row.config?.deductions || []).forEach((d) => {
      allDeductions.push([
        incomeLabel(row),
        d.category || d.name || '—',
        d.quantity ? String(d.quantity) : '—',
        d.unitAmount ? fmt(d.unitAmount) : '—',
        fmt(d.amount ?? d.value ?? 0),
        d.description || '—',
      ]);
    });
  });

  if (allDeductions.length) {
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 16,
      head: [['Source', 'Category', 'Qty', 'Unit (RWF)', 'Amount (RWF)', 'Notes']],
      body: allDeductions,
      headStyles: { fillColor: navy, textColor: amber, fontStyle: 'normal' },
      styles: { fontSize: 8, fontStyle: 'normal' },    });
  }

  doc.save(`${safeFileName(budget.budgetCode)}_budget.pdf`);
}

export function exportBudgetExcel(budget, fmt) {
  if (!budget) return;
  const incomes = budget.incomeSources || [];
  const totals = budgetTotals(incomes);

  const summaryRows = [
    ['Field', 'Value'],
    ['Budget Code', budget.budgetCode],
    ['Title', budget.title],
    ['Academic Year', budget.academicYear],
    ['Term', budget.term],
    ['Budget Type', budget.budgetType],
    ['Status', budget.statusLabel || budget.status],
    ['Prepared By', budget.preparedByName || ''],
    ['Period', formatBudgetPeriod(budget.startDate, budget.endDate)],
    ['Start Date', formatBudgetDate(budget.startDate)],
    ['End Date', formatBudgetDate(budget.endDate)],    ['Description', budget.description || ''],
    ['Total Gross Income (RWF)', totals.gross],
    ['Total Deductions (RWF)', totals.deductions],
    ['Total Net Budget Income (RWF)', totals.net],
    ['Allocated (RWF)', budget.totalAllocated || 0],
    ['Remaining (RWF)', budget.remainingBalance ?? totals.net - (budget.totalAllocated || 0)],
  ];

  const incomeRows = [
    ['Income Source', 'Gross (RWF)', 'Deductions (RWF)', 'Net (RWF)', 'Frequency', 'Category', 'Notes'],
    ...incomes.map((row) => [
      incomeLabel(row),
      incomeGross(row),
      incomeDeductions(row),
      incomeNet(row),
      row.collectionFrequency || '',
      row.incomeCategory || '',
      row.description || '',
    ]),
  ];

  const deductionRows = [
    ['Income Source', 'Deduction Category', 'Quantity', 'Unit (RWF)', 'Amount (RWF)', 'Description'],
  ];
  incomes.forEach((row) => {
    (row.config?.deductions || []).forEach((d) => {
      deductionRows.push([
        incomeLabel(row),
        d.category || d.name || '',
        d.quantity ?? '',
        d.unitAmount ?? '',
        d.amount ?? d.value ?? 0,
        d.description || '',
      ]);
    });
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryRows), 'Summary');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(incomeRows), 'Income Sources');
  if (deductionRows.length > 1) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(deductionRows), 'Deductions');
  }
  XLSX.writeFile(wb, `${safeFileName(budget.budgetCode)}_budget.xlsx`);
}

export { incomeLabel, incomeGross, incomeDeductions, incomeNet, budgetTotals };
