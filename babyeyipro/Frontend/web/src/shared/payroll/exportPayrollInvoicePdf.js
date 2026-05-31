import { jsPDF } from 'jspdf';

const NAVY = [0, 4, 53];
const GOLD = [254, 191, 36];
const SLATE = [100, 116, 139];
const INK = [15, 23, 42];

function fmtRwf(n) {
  if (n == null || Number.isNaN(Number(n))) return '—';
  return new Intl.NumberFormat('en-RW', { maximumFractionDigits: 0 }).format(Math.round(Number(n)));
}

function safeFilePart(s) {
  return String(s || 'invoice').replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 48);
}

function statusLabel(status) {
  const s = String(status || 'Pending');
  if (s === 'Paid') return 'PAID';
  if (s === 'Approved') return 'APPROVED';
  if (s === 'Rejected') return 'REJECTED';
  return 'PENDING';
}

/**
 * Portrait payroll payment invoice — one request per PDF.
 */
export function buildPayrollInvoicePdf({
  schoolName = 'School',
  invoice = {},
  breakdown = {},
}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const margin = 14;
  const contentW = W - margin * 2;
  let y = 0;

  const invNo = invoice.invoiceNo || `INV-${invoice.payrollId || invoice.id || '—'}`;
  const staffName = invoice.staffName || '—';
  const staffCode = invoice.staffCode || '—';
  const period = `${invoice.month || '—'} · ${invoice.term || '—'} · ${invoice.year || '—'}`;
  const st = statusLabel(invoice.status);

  doc.setFillColor(...NAVY);
  doc.rect(0, 0, W, 42, 'F');
  doc.setFillColor(...GOLD);
  doc.rect(0, 42, W, 1.2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('PAYROLL PAYMENT INVOICE', margin, 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(String(schoolName), margin, 21);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(invNo, margin, 32);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated ${new Date().toLocaleString()}`, W - margin, 14, { align: 'right' });
  doc.text(period, W - margin, 21, { align: 'right' });

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  const badgeW = 28;
  doc.roundedRect(W - margin - badgeW, 24, badgeW, 8, 2, 2, 'FD');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...NAVY);
  doc.text(st, W - margin - badgeW / 2, 29.5, { align: 'center' });

  y = 52;

  doc.setTextColor(...INK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Bill to', margin, y);
  y += 6;
  doc.setFontSize(10);
  doc.text(staffName, margin, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...SLATE);
  doc.text(`${staffCode} · ${invoice.role || 'STAFF'} · ${invoice.department || ''}`.trim(), margin, y);
  y += 10;

  const drawSection = (title) => {
    doc.setFillColor(...NAVY);
    doc.rect(margin, y, contentW, 6.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text(title.toUpperCase(), margin + 2, y + 4.5);
    y += 8;
  };

  const drawLine = (label, value, opts = {}) => {
    const { bold = false, accent = false } = opts;
    doc.setFillColor(255, 255, 255);
    if (Math.floor((y - 52) / 6) % 2 === 1) doc.setFillColor(248, 250, 252);
    doc.rect(margin, y - 1, contentW, 6, 'F');
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...(accent ? NAVY : SLATE));
    doc.text(label, margin + 2, y + 3.5);
    doc.setTextColor(...(accent ? INK : INK));
    doc.text(String(value), W - margin - 2, y + 3.5, { align: 'right' });
    y += 6;
  };

  drawSection('Earnings');
  drawLine('Basic salary', `${fmtRwf(breakdown.basic)} RWF`);
  (breakdown.allowanceLines || []).forEach((line) => {
    drawLine(line.label, `${fmtRwf(line.amount)} RWF`);
  });
  if (breakdown.bonus > 0) drawLine('Bonus', `${fmtRwf(breakdown.bonus)} RWF`);
  drawLine('Gross earnings', `${fmtRwf(breakdown.gross)} RWF`, { bold: true });

  y += 2;
  drawSection('Tax & statutory deductions');
  (breakdown.deductionLines || []).forEach((line) => {
    drawLine(line.label, `− ${fmtRwf(line.amount)} RWF`);
  });
  if (!breakdown.deductionLines?.length && breakdown.deductionsTotal > 0) {
    drawLine('Deductions (total)', `− ${fmtRwf(breakdown.deductionsTotal)} RWF`);
  }

  y += 2;
  drawSection('Advance deductions (Shule Avance)');
  if ((breakdown.advanceLines || []).length) {
    breakdown.advanceLines.forEach((line) => {
      drawLine(line.label, `− ${fmtRwf(line.amount)} RWF`);
    });
  } else if (breakdown.advanceApplied > 0) {
    drawLine('Advance repayment', `− ${fmtRwf(breakdown.advanceApplied)} RWF`);
  } else {
    drawLine('No advance deduction', '—');
  }

  y += 4;
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.6);
  doc.line(margin, y, W - margin, y);
  y += 6;

  drawLine('Net salary (before payment)', `${fmtRwf(breakdown.netSalary)} RWF`);
  drawLine('Final payable (period)', `${fmtRwf(breakdown.finalPayable)} RWF`);
  drawLine('This payment amount', `${fmtRwf(invoice.amount)} RWF`, { bold: true, accent: true });

  y += 4;
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, y, contentW, 22, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...NAVY);
  doc.text('Amount due on this invoice', margin + 4, y + 8);
  doc.setFontSize(14);
  doc.text(`${fmtRwf(invoice.amount)} RWF`, margin + 4, y + 16);

  y += 28;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...SLATE);
  const notes = [
    invoice.submittedBy ? `Submitted by: ${invoice.submittedBy}` : null,
    invoice.approvedBy ? `Approved by: ${invoice.approvedBy}` : null,
    invoice.paidBy ? `Paid by: ${invoice.paidBy}` : null,
    invoice.managerNote ? `Note: ${String(invoice.managerNote).slice(0, 120)}` : null,
  ].filter(Boolean);
  notes.forEach((line) => {
    doc.text(line, margin, y);
    y += 4;
  });

  doc.setFillColor(...NAVY);
  doc.rect(0, doc.internal.pageSize.getHeight() - 10, W, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(6.5);
  doc.text(`${schoolName} · Confidential payroll document`, margin, doc.internal.pageSize.getHeight() - 4);
  doc.text(invNo, W - margin, doc.internal.pageSize.getHeight() - 4, { align: 'right' });

  return doc;
}

export function downloadPayrollInvoicePdf(options) {
  const doc = buildPayrollInvoicePdf(options);
  const inv = options.invoice || {};
  const fname =
    options.filename ||
    `payroll-invoice-${safeFilePart(inv.payrollId || inv.id)}-${safeFilePart(inv.staffName)}.pdf`;
  doc.save(fname);
  return fname;
}

export function printPayrollInvoicePdf(options) {
  const doc = buildPayrollInvoicePdf(options);
  doc.autoPrint();
  const blob = doc.output('blob');
  window.open(URL.createObjectURL(blob), '_blank', 'noopener,noreferrer');
}

export function buildPayrollInvoiceWhatsAppText({ schoolName, invoice, breakdown }) {
  const invNo = invoice?.invoiceNo || `INV-${invoice?.payrollId || invoice?.id}`;
  const lines = [
    `*${schoolName || 'School'} — Payroll Invoice*`,
    `Invoice: ${invNo}`,
    `Staff: ${invoice?.staffName} (${invoice?.staffCode})`,
    `Period: ${invoice?.month} · ${invoice?.term} · ${invoice?.year}`,
    `Status: ${invoice?.status || 'Pending'}`,
    '',
    `Basic: ${fmtRwf(breakdown?.basic)} RWF`,
    `Allowances: ${fmtRwf(breakdown?.allowancesTotal)} RWF`,
    `Deductions: ${fmtRwf(breakdown?.deductionsTotal)} RWF`,
    `Advance: ${fmtRwf(breakdown?.advanceApplied)} RWF`,
    `*Payment amount: ${fmtRwf(invoice?.amount)} RWF*`,
  ];
  return lines.join('\n');
}

export function sharePayrollInvoiceWhatsApp(options, phone) {
  const text = buildPayrollInvoiceWhatsAppText(options);
  const digits = String(phone || '').replace(/\D/g, '');
  const base = digits ? `https://wa.me/${digits}` : 'https://wa.me/';
  const url = `${base}?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}
