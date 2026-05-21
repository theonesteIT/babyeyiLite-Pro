import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

function money(v) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'RWF', maximumFractionDigits: 0 }).format(Number(v || 0));
}

function dateOnly(v) {
  if (!v) return '';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString();
}

function slug(name) {
  return String(name || 'report').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function downloadBudgetPdf({ filename, title, subtitle, headers, rows }) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  const margin = 40;
  let y = 54;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(title, margin, y);
  y += 16;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(subtitle || '', margin, y);
  y += 20;
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  const headerLine = headers.join(' | ');
  const headerWrapped = doc.splitTextToSize(headerLine, width - margin * 2);
  headerWrapped.forEach((part) => {
    doc.text(part, margin, y);
    y += 11;
  });
  y += 6;
  doc.setFont('helvetica', 'normal');
  rows.forEach((row) => {
    const line = headers.map((h) => String(row[h] ?? '')).join(' | ');
    const wrapped = doc.splitTextToSize(line, width - margin * 2);
    wrapped.forEach((part) => {
      if (y > height - 36) {
        doc.addPage();
        y = 50;
      }
      doc.text(part, margin, y);
      y += 11;
    });
    y += 4;
  });
  doc.save(filename);
}

export function downloadBudgetExcel({ filename, sheetName, rows }) {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName || 'Report');
  XLSX.writeFile(wb, filename);
}

/**
 * Build export rows for a named budget report.
 */
export function buildBudgetReport(reportName, { budgets = [], lines = [], usage = [], overview = null } = {}) {
  const stamp = new Date().toLocaleString();
  const subtitle = `Generated ${stamp}`;

  if (reportName === 'Budget Summary Report') {
    return {
      title: 'Budget Summary Report',
      subtitle,
      sheetName: 'Budget Summary',
      headers: ['title', 'academicYear', 'term', 'status', 'expectedIncome', 'allocated', 'remaining', 'usagePct'],
      rows: budgets.map((b) => ({
        title: b.title,
        academicYear: b.academicYear,
        term: b.term,
        status: b.statusLabel || b.status,
        expectedIncome: money(b.totalExpectedIncome),
        allocated: money(b.totalAllocated),
        remaining: money(b.remainingBalance),
        usagePct: `${b.budgetUsagePct ?? 0}%`,
      })),
    };
  }

  if (reportName === 'Budget vs Actual Report') {
    return {
      title: 'Budget vs Actual Report',
      subtitle,
      sheetName: 'Budget vs Actual',
      headers: ['lineName', 'department', 'planned', 'used', 'remaining', 'variance', 'usagePct'],
      rows: lines.map((l) => ({
        lineName: l.lineName,
        department: l.department || '',
        planned: money(l.plannedAmount),
        used: money(l.usedAmount),
        remaining: money(l.remaining),
        variance: money((l.plannedAmount || 0) - (l.usedAmount || 0)),
        usagePct: `${l.usagePct ?? 0}%`,
      })),
    };
  }

  if (reportName === 'Department Spending Report') {
    const byDept = {};
    lines.forEach((l) => {
      const d = l.department || 'Unassigned';
      if (!byDept[d]) byDept[d] = { planned: 0, used: 0 };
      byDept[d].planned += Number(l.plannedAmount || 0);
      byDept[d].used += Number(l.usedAmount || 0);
    });
    return {
      title: 'Department Spending Report',
      subtitle,
      sheetName: 'Departments',
      headers: ['department', 'planned', 'used', 'remaining', 'usagePct'],
      rows: Object.entries(byDept)
        .sort((a, b) => b[1].used - a[1].used)
        .map(([department, v]) => {
          const pct = v.planned > 0 ? Math.round((v.used / v.planned) * 100) : 0;
          return {
            department,
            planned: money(v.planned),
            used: money(v.used),
            remaining: money(v.planned - v.used),
            usagePct: `${pct}%`,
          };
        }),
    };
  }

  if (reportName === 'Budget Usage Report') {
    return {
      title: 'Budget Usage Report',
      subtitle,
      sheetName: 'Usage',
      headers: ['date', 'lineName', 'amount', 'category', 'paymentMethod', 'description'],
      rows: usage.map((u) => ({
        date: dateOnly(u.usageDate),
        lineName: u.lineName,
        amount: money(u.usageAmount),
        category: u.expenseCategory || '',
        paymentMethod: u.paymentMethod || '',
        description: u.description || '',
      })),
    };
  }

  if (reportName === 'Budget Approval Report') {
    return {
      title: 'Budget Approval Report',
      subtitle,
      sheetName: 'Approvals',
      headers: ['title', 'code', 'term', 'status', 'submittedAt', 'expectedIncome'],
      rows: budgets
        .filter((b) => ['pending_approval', 'approved', 'rejected', 'closed'].includes(String(b.status || '').toLowerCase()))
        .map((b) => ({
          title: b.title,
          code: b.budgetCode || '',
          term: b.term,
          status: b.statusLabel || b.status,
          submittedAt: dateOnly(b.submittedAt),
          expectedIncome: money(b.totalExpectedIncome),
        })),
    };
  }

  if (reportName === 'Balance Sheet') {
    const assets = overview?.totalAllocatedBudget ?? 0;
    const liabilities = overview?.totalUsedBudget ?? 0;
    const equity = (overview?.remainingBalance ?? 0);
    return {
      title: 'Balance Sheet (Budget Summary)',
      subtitle,
      sheetName: 'Balance Sheet',
      headers: ['section', 'amount'],
      rows: [
        { section: 'Total expected income', amount: money(overview?.totalExpectedIncome) },
        { section: 'Total allocated (assets)', amount: money(assets) },
        { section: 'Total used (liabilities)', amount: money(liabilities) },
        { section: 'Remaining balance (equity)', amount: money(equity) },
      ],
    };
  }

  if (reportName === 'Income Statement') {
    return {
      title: 'Income Statement (Budget)',
      subtitle,
      sheetName: 'Income',
      headers: ['item', 'amount'],
      rows: [
        { item: 'Total expected income', amount: money(overview?.totalExpectedIncome) },
        { item: 'Total expenses (used)', amount: money(overview?.totalUsedBudget) },
        { item: 'Net position', amount: money((overview?.totalExpectedIncome || 0) - (overview?.totalUsedBudget || 0)) },
      ],
    };
  }

  if (reportName === 'Cash Flow Statement') {
    return {
      title: 'Cash Flow Statement (Usage)',
      subtitle,
      sheetName: 'Cash Flow',
      headers: ['date', 'lineName', 'outflow', 'category'],
      rows: usage.slice(0, 200).map((u) => ({
        date: dateOnly(u.usageDate),
        lineName: u.lineName,
        outflow: money(u.usageAmount),
        category: u.expenseCategory || '',
      })),
    };
  }

  if (reportName === 'Trial Balance') {
    return {
      title: 'Trial Balance (Budget Lines)',
      subtitle,
      sheetName: 'Trial Balance',
      headers: ['lineName', 'debit_planned', 'credit_used', 'balance'],
      rows: lines.map((l) => ({
        lineName: l.lineName,
        debit_planned: money(l.plannedAmount),
        credit_used: money(l.usedAmount),
        balance: money(l.remaining),
      })),
    };
  }

  if (reportName === 'General Ledger') {
    return {
      title: 'General Ledger (Usage Detail)',
      subtitle,
      sheetName: 'Ledger',
      headers: ['date', 'lineName', 'debit', 'credit', 'memo'],
      rows: usage.map((u) => ({
        date: dateOnly(u.usageDate),
        lineName: u.lineName,
        debit: '',
        credit: money(u.usageAmount),
        memo: u.description || u.expenseCategory || '',
      })),
    };
  }

  return {
    title: reportName,
    subtitle,
    sheetName: 'Report',
    headers: ['note'],
    rows: [{ note: 'No data available for this report.' }],
  };
}

export function exportBudgetReportPdf(reportName, context) {
  const cfg = buildBudgetReport(reportName, context);
  downloadBudgetPdf({
    filename: `${slug(reportName)}-${Date.now()}.pdf`,
    title: cfg.title,
    subtitle: cfg.subtitle,
    headers: cfg.headers,
    rows: cfg.rows,
  });
  return cfg;
}

export function exportBudgetReportExcel(reportName, context) {
  const cfg = buildBudgetReport(reportName, context);
  const sheetRows = cfg.rows.map((row) => {
    const out = {};
    cfg.headers.forEach((h) => {
      out[h] = row[h];
    });
    return out;
  });
  downloadBudgetExcel({
    filename: `${slug(reportName)}-${Date.now()}.xlsx`,
    sheetName: cfg.sheetName,
    rows: sheetRows,
  });
  return cfg;
}
