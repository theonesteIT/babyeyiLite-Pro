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

/**
 * Modern landscape PDF — student fees registry for accountant portal.
 */
export function buildStudentFeesReportPdf({
  schoolName = 'School',
  academicYear = '',
  term = '',
  classLabel = 'All Classes',
  statusFilterLabel = 'All statuses',
  stats = {},
  students = [],
  searchNote = '',
  statusLabelFn = (s) => s,
}) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const margin = 12;
  const contentW = W - margin * 2;
  let page = 0;

  const drawPageChrome = (titleRight = '') => {
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
    doc.text('STUDENT FEES REPORT', W / 2, 10, { align: 'center' });
    doc.text(`Page ${page}`, W - margin, 10, { align: 'right' });
    if (titleRight) {
      doc.setFontSize(6.5);
      doc.text(titleRight, W - margin, 6, { align: 'right' });
    }

    doc.setFillColor(...NAVY);
    doc.rect(0, H - 10, W, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(6.5);
    doc.text(`${schoolName} · Confidential finance report`, margin, H - 4);
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
  doc.text('Student Fees Report', margin, y);
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
    `Academic year: ${academicYear || '—'}`,
    `Term: ${term || '—'}`,
    `Class: ${classLabel || 'All classes'}`,
    `Status: ${statusFilterLabel}`,
    `Generated: ${new Date().toLocaleString()}`,
    `Learners in report: ${students.length}`,
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
    { label: 'Total expected', value: fmtRwf(stats.expected), accent: [59, 130, 246] },
    { label: 'Collected', value: fmtRwf(stats.collected), accent: [16, 185, 129] },
    { label: 'Outstanding', value: fmtRwf(stats.balance), accent: [239, 68, 68] },
    { label: 'Collection rate', value: stats.rate || '0%', accent: GOLD },
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
    if (String(k.value) !== '—' && k.label !== 'Collection rate') {
      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...SLATE);
      doc.text('RWF', x + 3 + doc.getTextWidth(String(k.value)) + 1.5, y + 14);
    }
  });

  y += 24;

  const cols = [
    { key: 'idx', label: '#', w: 8, align: 'center' },
    { key: 'id', label: 'Learner ID', w: 24 },
    { key: 'name', label: 'Name', w: 36 },
    { key: 'class', label: 'Class', w: 16 },
    { key: 'guardian', label: 'Guardian', w: 32 },
    { key: 'phone', label: 'Parent phone', w: 26 },
    { key: 'due', label: 'Amount due', w: 24, align: 'right' },
    { key: 'paid', label: 'Paid', w: 22, align: 'right' },
    { key: 'rem', label: 'Remaining', w: 24, align: 'right' },
    { key: 'status', label: 'Status', w: 26 },
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

  if (!students.length) {
    doc.setFontSize(10);
    doc.setTextColor(...SLATE);
    doc.text('No learners match the selected filters.', margin, y + 6);
    return doc;
  }

  y = drawHead();

  const rowH = 6.8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);

  students.forEach((s, idx) => {
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

    const due = s.amountToPay;
    const paid = Number(s.paidThisTerm || 0);
    const rem = s.remaining;
    const cells = [
      String(idx + 1),
      String(s.id || '—').slice(0, 18),
      String(s.name || '—').slice(0, 28),
      String(s.class || '—').slice(0, 10),
      String(s.guardian || '—').slice(0, 24),
      String(s.parentPhone || '—').slice(0, 16),
      due == null ? '—' : fmtRwf(due),
      fmtRwf(paid),
      rem == null ? '—' : fmtRwf(rem),
      statusLabelFn(s.status).slice(0, 18),
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
  doc.text(`TOTAL — ${students.length} learner${students.length === 1 ? '' : 's'}`, margin + 2, y + 5.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...SLATE);
  const totalLine = `Expected ${fmtRwf(stats.expected)} RWF  ·  Collected ${fmtRwf(stats.collected)} RWF  ·  Outstanding ${fmtRwf(stats.balance)} RWF  ·  Rate ${stats.rate || '0%'}`;
  doc.text(totalLine, W - margin - 2, y + 5.5, { align: 'right' });

  return doc;
}

export function downloadStudentFeesReportPdf(options) {
  const {
    academicYear = '',
    term = '',
    classLabel = 'all-classes',
    statusFilterLabel = 'all',
    filename,
  } = options;

  const doc = buildStudentFeesReportPdf(options);
  const classPart = safeFilePart(classLabel);
  const fname =
    filename ||
    `student-fees-${safeFilePart(academicYear)}-${safeFilePart(term)}-${classPart}-${safeFilePart(statusFilterLabel)}.pdf`;
  doc.save(fname);
  return fname;
}

export function printStudentFeesReportPdf(options) {
  const doc = buildStudentFeesReportPdf(options);
  doc.autoPrint();
  const blob = doc.output('blob');
  window.open(URL.createObjectURL(blob), '_blank');
}
