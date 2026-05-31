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
  return String(s || 'report').replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 64);
}

function statusLabel(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'paid') return 'Paid';
  if (s === 'sent') return 'Sent';
  if (s === 'overdue') return 'Overdue';
  if (s === 'draft') return 'Draft';
  return s || '—';
}

/**
 * Landscape PDF — invoice registry for accountant portal (filtered list).
 */
export function buildInvoicesReportPdf({
  schoolName = 'School',
  statusFilterLabel = 'All statuses',
  dateFilterLabel = '',
  searchNote = '',
  stats = {},
  invoices = [],
}) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const margin = 12;
  const contentW = W - margin * 2;
  let page = 0;

  const drawPageChrome = () => {
    if (page > 0) doc.addPage();
    page += 1;

    doc.setFillColor(...NAVY);
    doc.rect(0, 0, W, 16, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('ACCOUNTANT PORTAL', margin, 10);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text('INVOICE REGISTRY REPORT', W / 2, 10, { align: 'center' });
    doc.text(`Page ${page}`, W - margin, 10, { align: 'right' });

    doc.setFillColor(...NAVY);
    doc.rect(0, H - 10, W, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(6.5);
    doc.text(`${schoolName} · Confidential billing report`, margin, H - 4);
    doc.text(new Date().toLocaleString(), W - margin, H - 4, { align: 'right' });
  };

  const ensureSpace = (y, need, redrawTableHead) => {
    if (y + need > H - 14) {
      drawPageChrome();
      return redrawTableHead ? redrawTableHead() : 24;
    }
    return y;
  };

  drawPageChrome();

  let y = 22;

  doc.setTextColor(...INK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Invoice Registry', margin, y);
  y += 7;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...NAVY);
  doc.text(String(schoolName), margin, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...SLATE);
  doc.setFontSize(8);
  const meta = [
    `Status filter: ${statusFilterLabel}`,
    dateFilterLabel ? `Date filter: ${dateFilterLabel}` : 'Date filter: All dates',
    `Generated: ${new Date().toLocaleString()}`,
    `Invoices in report: ${invoices.length}`,
  ];
  if (searchNote) meta.push(searchNote);
  meta.forEach((line) => {
    doc.text(line, margin, y);
    y += 4.2;
  });

  y += 3;
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.8);
  doc.line(margin, y, W - margin, y);
  y += 6;

  const kpiW = (contentW - 9) / 4;
  const kpis = [
    { label: 'Outstanding', value: fmtRwf(stats.totalOutstanding), accent: [239, 68, 68] },
    { label: 'Overdue', value: fmtRwf(stats.overdue), accent: [245, 158, 11] },
    { label: 'Paid (total)', value: fmtRwf(stats.paid), accent: [16, 185, 129] },
    { label: 'Invoice count', value: String(stats.count ?? invoices.length), accent: [59, 130, 246] },
  ];

  kpis.forEach((k, i) => {
    const x = margin + i * (kpiW + 3);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, y, kpiW, 18, 2, 2, 'FD');
    doc.setFillColor(...k.accent);
    doc.rect(x, y, kpiW, 2.5, 'F');
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...SLATE);
    doc.text(k.label.toUpperCase(), x + 3, y + 7);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...INK);
    doc.text(String(k.value), x + 3, y + 14);
    if (k.label !== 'Invoice count' && String(k.value) !== '—') {
      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...SLATE);
      doc.text('RWF', x + 3 + doc.getTextWidth(String(k.value)) + 1.5, y + 14);
    }
  });

  y += 24;

  const cols = [
    { key: 'idx', label: '#', w: 8, align: 'center' },
    { key: 'inv', label: 'Invoice #', w: 32 },
    { key: 'customer', label: 'Customer', w: 38 },
    { key: 'meta', label: 'Student / class', w: 36 },
    { key: 'issued', label: 'Issued', w: 22 },
    { key: 'due', label: 'Due', w: 22 },
    { key: 'amount', label: 'Amount (RWF)', w: 28, align: 'right' },
    { key: 'status', label: 'Status', w: 22 },
  ];

  const tableW = cols.reduce((s, c) => s + c.w, 0);
  const scale = tableW > contentW ? contentW / tableW : 1;
  const colW = cols.map((c) => c.w * scale);

  const drawHead = () => {
    let x = margin;
    doc.setFillColor(...NAVY);
    doc.rect(margin, y, contentW, 7.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(255, 255, 255);
    cols.forEach((c, i) => {
      const txt = c.label.toUpperCase();
      if (c.align === 'right') doc.text(txt, x + colW[i] - 2, y + 5, { align: 'right' });
      else if (c.align === 'center') doc.text(txt, x + colW[i] / 2, y + 5, { align: 'center' });
      else doc.text(txt, x + 2, y + 5);
      x += colW[i];
    });
    y += 7.5;
    return y;
  };

  if (!invoices.length) {
    doc.setFontSize(10);
    doc.setTextColor(...SLATE);
    doc.text('No invoices match the selected filters.', margin, y + 6);
    return doc;
  }

  y = drawHead();

  const rowH = 6.8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);

  let sumTotal = 0;

  invoices.forEach((inv, idx) => {
    y = ensureSpace(y, rowH, () => {
      y = 24;
      return drawHead();
    });

    if (idx % 2 === 0) {
      doc.setFillColor(255, 255, 255);
    } else {
      doc.setFillColor(248, 250, 252);
    }
    doc.rect(margin, y, contentW, rowH, 'F');

    const total = Number(inv.totals?.total ?? inv.total) || 0;
    sumTotal += total;
    const metaLine = (inv.billTo?.metaLines || []).join(' · ') || '—';

    const cells = [
      String(idx + 1),
      String(inv.invoiceNo || '—').slice(0, 22),
      String(inv.billTo?.name || '—').slice(0, 28),
      String(metaLine).slice(0, 26),
      String(inv.issueDate || '—'),
      String(inv.dueDate || '—'),
      fmtRwf(total),
      statusLabel(inv.status),
    ];

    let x = margin;
    doc.setTextColor(...INK);
    cells.forEach((cell, i) => {
      const c = cols[i];
      if (c.align === 'right') doc.text(cell, x + colW[i] - 2, y + 4.6, { align: 'right' });
      else if (c.align === 'center') doc.text(cell, x + colW[i] / 2, y + 4.6, { align: 'center' });
      else doc.text(cell, x + 2, y + 4.6);
      x += colW[i];
    });

    y += rowH;
  });

  y = ensureSpace(y, 10, null);
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(226, 232, 240);
  doc.rect(margin, y, contentW, 9, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...NAVY);
  doc.text(`TOTAL — ${invoices.length} invoice${invoices.length === 1 ? '' : 's'}`, margin + 2, y + 5.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...SLATE);
  const totalLine = `Listed amount ${fmtRwf(sumTotal)} RWF  ·  Outstanding ${fmtRwf(stats.totalOutstanding)} RWF  ·  Overdue ${fmtRwf(stats.overdue)} RWF  ·  Paid total ${fmtRwf(stats.paid)} RWF`;
  doc.text(totalLine, W - margin - 2, y + 5.5, { align: 'right' });

  return doc;
}

export function downloadInvoicesReportPdf(options) {
  const {
    statusFilterLabel = 'all',
    filename,
  } = options;

  const doc = buildInvoicesReportPdf(options);
  const fname =
    filename ||
    `invoices-registry-${safeFilePart(statusFilterLabel)}-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fname);
  return fname;
}
