import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { formatBudgetDate, formatBudgetPeriod } from './budgetReportFormat';
const NAVY = [0, 4, 53];
const AMBER = [245, 158, 11];

function safeFileName(code) {
  return String(code || 'expenses').replace(/[^\w\-]+/g, '_');
}

function num(v) {
  return Number(v || 0);
}

function allocationPct(part, total) {
  if (!total || total <= 0) return 0;
  return Math.round((part / total) * 1000) / 10;
}

function buildReportData(budget, lines, fmt) {
  const totalExpected = num(budget?.totalExpectedIncome);
  const linesPlanned = lines.reduce((s, l) => s + num(l.plannedAmount), 0);
  const linesUsed = lines.reduce((s, l) => s + num(l.usedAmount), 0);
  const linesRemaining = lines.reduce((s, l) => s + num(l.remaining ?? l.plannedAmount - l.usedAmount), 0);
  const unallocated = Math.max(0, totalExpected - linesPlanned);

  return {
    totalExpected,
    linesPlanned,
    linesUsed,
    linesRemaining,
    unallocated,
    allocatedPct: allocationPct(linesPlanned, totalExpected),
    unallocatedPct: allocationPct(unallocated, totalExpected),
    expenseRows: lines.map((l) => ({
      name: l.lineName || '—',
      department: l.department || '—',
      category: l.budgetCategory || '—',
      planned: num(l.plannedAmount),
      used: num(l.usedAmount),
      remaining: num(l.remaining ?? l.plannedAmount - l.usedAmount),
      usagePct: num(l.usagePct),
      status: l.statusLabel || l.status || '—',
      budgetPct: allocationPct(l.plannedAmount, totalExpected),
    })),
    fmt,
  };
}

export function exportExpensesPdf(budget, lines, fmt) {
  if (!budget) return;
  const data = buildReportData(budget, lines || [], fmt);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });

  doc.setFillColor(...NAVY);
  doc.rect(0, 0, 595, 58, 'F');
  doc.setTextColor(...AMBER);
  doc.setFontSize(16);
  doc.text('Budget Expenses Report', 40, 32);
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text(`${budget.budgetCode || ''} · ${budget.title || ''}`, 40, 48);

  doc.setTextColor(...NAVY);
  doc.setFontSize(10);
  let y = 76;
  const metaRows = [
    ['Budget code', budget.budgetCode],
    ['Title', budget.title],
    ['Academic year', budget.academicYear],
    ['Term', budget.term],
    ['Status', budget.statusLabel || budget.status],
    ['Period', formatBudgetPeriod(budget.startDate, budget.endDate)],
  ];
  metaRows.forEach(([k, v]) => {
    doc.setFont(undefined, 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`${k}:`, 40, y);
    doc.setTextColor(...NAVY);
    doc.text(String(v ?? '—'), 130, y);
    y += 14;
  });
  y += 6;
  autoTable(doc, {
    startY: y,
    head: [['Budget allocation summary', 'Amount (RWF)', '% of budget']],
    body: [
      ['Expected school budget income', fmt(data.totalExpected), '100%'],
      ['Allocated to expenses', fmt(data.linesPlanned), `${data.allocatedPct}%`],
      ['Remaining to allocate', fmt(data.unallocated), `${data.unallocatedPct}%`],
    ],
    headStyles: { fillColor: NAVY, textColor: AMBER, fontSize: 9, fontStyle: 'normal' },
    styles: { fontSize: 9, fontStyle: 'normal' },    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
  });

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 14,
    head: [['Expense summary', 'Amount (RWF)']],
    body: [
      ['Total planned (expenses)', fmt(data.linesPlanned)],
      ['Total spent', fmt(data.linesUsed)],
      ['Total remaining (expenses)', fmt(data.linesRemaining)],
    ],
    headStyles: { fillColor: NAVY, textColor: AMBER, fontSize: 9, fontStyle: 'normal' },
    styles: { fontSize: 9, fontStyle: 'normal' },    columnStyles: { 1: { halign: 'right' } },
  });

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 16,
    head: [['Expense', 'Department', 'Category', 'Planned (RWF)', 'Spent (RWF)', 'Remaining (RWF)', 'Usage %', 'Status']],
    body: data.expenseRows.map((r) => [
      r.name,
      r.department,
      r.category,
      fmt(r.planned),
      fmt(r.used),
      fmt(r.remaining),
      `${r.usagePct}%`,
      r.status,
    ]),
    foot: data.expenseRows.length
      ? [[
          'Totals',
          '',
          '',
          fmt(data.linesPlanned),
          fmt(data.linesUsed),
          fmt(data.linesRemaining),
          data.linesPlanned > 0 ? `${Math.round((data.linesUsed / data.linesPlanned) * 100)}%` : '0%',
          '',
        ]]
      : undefined,
    headStyles: { fillColor: NAVY, textColor: AMBER, fontSize: 8, fontStyle: 'normal' },
    footStyles: { fillColor: [243, 244, 246], textColor: NAVY, fontStyle: 'normal', fontSize: 8 },
    styles: { fontSize: 8, cellPadding: 4, fontStyle: 'normal' },    columnStyles: {
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'center' },
    },
  });

  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(
    `Generated ${new Date().toLocaleString()} · Babyeyi School Budget`,
    40,
    doc.internal.pageSize.getHeight() - 24,
  );

  doc.save(`${safeFileName(budget.budgetCode)}_expenses.pdf`);
}

export function exportExpensesExcel(budget, lines, fmt) {
  if (!budget) return;
  const data = buildReportData(budget, lines || [], fmt);

  const summarySheet = [
    ['Budget Expenses Report', ''],
    ['Budget Code', budget.budgetCode],
    ['Title', budget.title],
    ['Academic Year', budget.academicYear],
    ['Term', budget.term],
    ['Status', budget.statusLabel || budget.status],
    ['Period', formatBudgetPeriod(budget.startDate, budget.endDate)],
    ['Start date', formatBudgetDate(budget.startDate)],
    ['End date', formatBudgetDate(budget.endDate)],    [],
    ['Allocation Summary', 'Amount (RWF)', '% of Budget'],
    ['Expected School Budget Income', data.totalExpected, 100],
    ['Allocated to Expenses', data.linesPlanned, data.allocatedPct],
    ['Remaining to Allocate', data.unallocated, data.unallocatedPct],
    [],
    ['Expense Totals', 'Amount (RWF)'],
    ['Total Planned', data.linesPlanned],
    ['Total Spent', data.linesUsed],
    ['Total Remaining', data.linesRemaining],
  ];

  const expensesSheet = [
    ['Expense', 'Department', 'Category', 'Planned (RWF)', 'Spent (RWF)', 'Remaining (RWF)', 'Usage %', '% of Budget', 'Status'],
    ...data.expenseRows.map((r) => [
      r.name,
      r.department,
      r.category,
      r.planned,
      r.used,
      r.remaining,
      r.usagePct,
      r.budgetPct,
      r.status,
    ]),
    [],
    ['Totals', '', '', data.linesPlanned, data.linesUsed, data.linesRemaining,
      data.linesPlanned > 0 ? Math.round((data.linesUsed / data.linesPlanned) * 100) : 0, '', ''],
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summarySheet), 'Summary');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(expensesSheet), 'Expenses');
  XLSX.writeFile(wb, `${safeFileName(budget.budgetCode)}_expenses.xlsx`);
}
