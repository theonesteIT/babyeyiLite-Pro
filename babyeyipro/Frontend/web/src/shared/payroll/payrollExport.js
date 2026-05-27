import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { fmtRwf, fmtRwfLabel } from './payrollHelpers';

function stamp() {
  return new Date().toLocaleString();
}

function downloadWorkbook(wb, filename) {
  XLSX.writeFile(wb, filename);
}

export function exportPayrollRequestsExcel({ rows, portalLabel, filename }) {
  const data = (rows || []).map((r) => ({
    Staff: r.staffName || '',
    'Staff code': r.staffCode || '',
    Role: r.role || '',
    Department: r.department || '',
    Month: r.month || '',
    Term: r.term || '',
    Year: r.year || '',
    'Net salary (RWF)': Number(r.netSalary || 0),
    'Amount (RWF)': Number(r.amount || 0),
    'Final payable (RWF)': Number(r.finalPayable || 0),
    Status: r.status || '',
    'Submitted at': r.submittedAt || r.createdAt || '',
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Payroll requests');
  const meta = XLSX.utils.aoa_to_sheet([
    [portalLabel || 'Payroll export'],
    [`Generated ${stamp()}`],
    [`Records ${data.length}`],
  ]);
  XLSX.utils.book_append_sheet(wb, meta, 'Info');
  downloadWorkbook(wb, filename || `payroll-requests-${Date.now()}.xlsx`);
}

export function exportPaymentTrackerExcel({ rows, portalLabel, filename }) {
  const data = (rows || []).map((r) => ({
    Staff: r.staffName || '',
    'Staff code': r.staffCode || '',
    Month: r.month || '',
    Term: r.term || '',
    'Academic year': r.academicYear || r.year || '',
    'Final payable (RWF)': Number(r.finalPayable || 0),
    'Paid (RWF)': Number(r.paidAmount || 0),
    'Remaining (RWF)': Number(r.remaining || 0),
    Status: r.status || '',
    'Last activity': r.lastActivityAt ? new Date(r.lastActivityAt).toLocaleString() : '',
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Payment tracker');
  const meta = XLSX.utils.aoa_to_sheet([
    [portalLabel || 'Payment tracker'],
    [`Generated ${stamp()}`],
    [`Rows ${data.length}`],
  ]);
  XLSX.utils.book_append_sheet(wb, meta, 'Info');
  downloadWorkbook(wb, filename || `payroll-tracker-${Date.now()}.xlsx`);
}

export function exportPayrollRequestsPdf({ rows, portalLabel, schoolName, filename }) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const margin = 40;
  doc.setFillColor(0, 4, 53);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 52, 'F');
  doc.setTextColor(254, 191, 16);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(portalLabel || 'Payroll requests', margin, 28);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(`${schoolName || 'School'} · Generated ${stamp()}`, margin, 42);

  autoTable(doc, {
    startY: 60,
    head: [['Staff', 'Code', 'Role', 'Period', 'Net (RWF)', 'Amount (RWF)', 'Status']],
    body: (rows || []).map((r) => [
      r.staffName || '—',
      r.staffCode || '—',
      r.role || '—',
      `${r.month || ''} ${r.year || ''} · ${r.term || ''}`,
      fmtRwf(r.netSalary),
      fmtRwf(r.amount),
      r.status || '—',
    ]),
    styles: { fontSize: 8, cellPadding: 5, overflow: 'linebreak' },
    headStyles: { fillColor: [0, 4, 53], textColor: [254, 191, 16], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: margin, right: margin },
  });

  const finalY = doc.lastAutoTable?.finalY || 60;
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Total records: ${(rows || []).length} · Total amount: ${fmtRwfLabel((rows || []).reduce((s, r) => s + Number(r.amount || 0), 0))}`, margin, finalY + 16);
  doc.save(filename || `payroll-requests-${Date.now()}.pdf`);
}

export function exportPaymentTrackerPdf({ rows, portalLabel, schoolName, filename }) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const margin = 40;
  doc.setFillColor(200, 120, 0);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 52, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(portalLabel || 'Payroll payment tracker', margin, 28);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`${schoolName || 'School'} · Generated ${stamp()}`, margin, 42);

  autoTable(doc, {
    startY: 60,
    head: [['Staff', 'Period', 'Final payable', 'Paid', 'Remaining', 'Status', 'Last activity']],
    body: (rows || []).map((r) => [
      `${r.staffName || '—'}\n${r.staffCode || ''}`,
      `${r.month || ''} ${r.year || ''} · ${r.term || ''}`,
      fmtRwfLabel(r.finalPayable),
      fmtRwfLabel(r.paidAmount),
      fmtRwfLabel(r.remaining),
      r.status || '—',
      r.lastActivityAt ? new Date(r.lastActivityAt).toLocaleDateString() : '—',
    ]),
    styles: { fontSize: 8, cellPadding: 5, overflow: 'linebreak' },
    headStyles: { fillColor: [0, 4, 53], textColor: [254, 191, 16], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: margin, right: margin },
  });

  doc.save(filename || `payroll-tracker-${Date.now()}.pdf`);
}
