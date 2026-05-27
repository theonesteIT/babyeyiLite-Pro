import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const NAVY = [0, 4, 53];
const GOLD = [254, 191, 16];

function slugPart(value) {
  return String(value || 'all')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'all';
}

function formatMarksCell(student) {
  const v = student.avgMarks;
  if (typeof v === 'number' && Number.isFinite(v)) return `${v}%`;
  if (v != null && v !== '—') return String(v);
  return '—';
}

function formatAttendanceCell(student) {
  if (student.hasGateData || student.gateMorning != null) {
    const pct = typeof student.attendance === 'number' ? `${student.attendance}%` : '0%';
    return `${pct} (AM ${student.gateMorning ?? 0} · PM ${student.gateEvening ?? 0})`;
  }
  return '—';
}

function formatDisciplineCell(student, schoolMax) {
  const rem = student.disciplineRemaining;
  const total = student.disciplineTotal ?? schoolMax;
  if (!Number.isFinite(rem)) return '—';
  if (Number.isFinite(total) && total > 0) return `${rem} / ${total}`;
  return String(rem);
}

function studentTableRows(students, schoolMax) {
  return (students || []).map((s, i) => [
    i + 1,
    s.code || '—',
    s.name || '—',
    s.gender || '—',
    formatMarksCell(s),
    formatAttendanceCell(s),
    formatDisciplineCell(s, schoolMax),
  ]);
}

export function buildPromotionReportFilename(report) {
  const school = slugPart(report.schoolName).slice(0, 20);
  const from = slugPart(report.sourceClass);
  const to = slugPart(report.destinationClass);
  const year = slugPart(report.academicYear);
  const date = new Date(report.generatedAt || Date.now()).toISOString().slice(0, 10);
  return `promotion-report-${school}-${from}-to-${to}-${year}-${date}.pdf`;
}

/**
 * @typedef {Object} PromotionReportPayload
 * @property {string} schoolName
 * @property {string} academicYear
 * @property {string} term
 * @property {string} promotionType
 * @property {string} sourceClass
 * @property {string} destinationClass
 * @property {string} [performedBy]
 * @property {string} [generatedAt]
 * @property {number} [disciplineMax]
 * @property {import('../utils/promotionMappers').PromotionStudent[]} promoted
 * @property {import('../utils/promotionMappers').PromotionStudent[]} repeaters
 */

/**
 * @param {PromotionReportPayload} report
 * @returns {{ doc: import('jspdf').jsPDF, filename: string }}
 */
export function generatePromotionClassPdf(report) {
  const promoted = report.promoted || [];
  const repeaters = report.repeaters || [];
  const schoolMax = report.disciplineMax ?? null;
  const filename = buildPromotionReportFilename(report);

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = 0;

  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageWidth, 32, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('Class Promotion Report', margin, 13);
  doc.setFontSize(10);
  doc.setTextColor(...GOLD);
  doc.text(report.schoolName || 'School', margin, 21);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(220, 220, 230);
  doc.text('Babyeyi · DOS Student Promotion', pageWidth - margin, 21, { align: 'right' });

  y = 40;
  doc.setTextColor(30, 30, 40);
  doc.setFontSize(9);

  const metaLines = [
    `Academic year: ${report.academicYear || '—'} · Term: ${report.term || '—'}`,
    `From: ${report.sourceClass || '—'}  →  To: ${report.destinationClass || '—'}`,
    `Promotion type: ${report.promotionType || 'Normal Promotion'}`,
    `Promoted: ${promoted.length} · Repeaters: ${repeaters.length}`,
    report.performedBy ? `Recorded by: ${report.performedBy}` : null,
    `Generated: ${new Date(report.generatedAt || Date.now()).toLocaleString()}`,
  ].filter(Boolean);

  metaLines.forEach((line) => {
    doc.text(line, margin, y);
    y += 5;
  });

  const tableHead = [['#', 'Code', 'Student name', 'Gender', 'Avg marks', 'Gate attendance', 'Discipline']];
  const tableOpts = {
    head: tableHead,
    theme: 'striped',
    styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
    headStyles: { fillColor: NAVY, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: margin, right: margin },
  };

  if (promoted.length) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...NAVY);
    doc.text(`Promoted (${promoted.length})`, margin, y + 4);
    autoTable(doc, {
      ...tableOpts,
      startY: y + 7,
      body: studentTableRows(promoted, schoolMax),
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  if (repeaters.length) {
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(180, 40, 40);
    doc.text(`Repeaters / not promoted (${repeaters.length})`, margin, y);
    autoTable(doc, {
      ...tableOpts,
      startY: y + 7,
      body: studentTableRows(repeaters, schoolMax),
      headStyles: { fillColor: [120, 30, 30], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7 },
    });
  }

  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFontSize(7);
    doc.setTextColor(140, 140, 150);
    doc.text(`Page ${p} of ${pageCount}`, pageWidth - margin, doc.internal.pageSize.getHeight() - 8, {
      align: 'right',
    });
  }

  return { doc, filename };
}

/** @param {PromotionReportPayload} report */
export function downloadPromotionClassPdf(report) {
  const { doc, filename } = generatePromotionClassPdf(report);
  doc.save(filename);
  return filename;
}

/** @param {PromotionReportPayload} report */
export function buildPromotionShareText(report) {
  const promoted = report.promoted?.length ?? 0;
  const repeaters = report.repeaters?.length ?? 0;
  const lines = [
    `${report.schoolName || 'School'} — Class Promotion Report`,
    `${report.academicYear || '—'} · ${report.term || '—'}`,
    `${report.sourceClass || '—'} → ${report.destinationClass || '—'}`,
    `Type: ${report.promotionType || 'Normal Promotion'}`,
    `Promoted: ${promoted} | Repeaters: ${repeaters}`,
    report.performedBy ? `By: ${report.performedBy}` : null,
    `Date: ${new Date(report.generatedAt || Date.now()).toLocaleString()}`,
    '',
    'Full student list is attached as PDF from Babyeyi DOS.',
  ].filter(Boolean);
  return lines.join('\n');
}

/** @param {PromotionReportPayload} report */
export function openWhatsAppShare(report) {
  const text = buildPromotionShareText(report);
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
}

/** @param {PromotionReportPayload} report */
export async function sharePromotionClassPdf(report) {
  const { doc, filename } = generatePromotionClassPdf(report);
  const text = buildPromotionShareText(report);

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      const blob = doc.output('blob');
      const file = new File([blob], filename, { type: 'application/pdf' });
      const shareData = { title: 'Class Promotion Report', text, files: [file] };
      if (navigator.canShare && !navigator.canShare(shareData)) {
        await navigator.share({ title: shareData.title, text });
        return { method: 'text-only' };
      }
      await navigator.share(shareData);
      return { method: 'file' };
    } catch (err) {
      if (err?.name === 'AbortError') return { method: 'cancelled' };
    }
  }

  openWhatsAppShare(report);
  return { method: 'whatsapp-fallback' };
}

/** @param {PromotionReportPayload} report */
export async function copyPromotionShareText(report) {
  const text = buildPromotionShareText(report);
  await navigator.clipboard.writeText(text);
  return text;
}

/** Single-student promotion report (Promote by Student success). */
export function buildStudentPromotionReport({
  schoolName,
  academicYear,
  term,
  promotionType,
  sourceClass,
  destinationClass,
  performedBy,
  student,
}) {
  return {
    schoolName,
    academicYear,
    term,
    promotionType,
    sourceClass,
    destinationClass,
    performedBy,
    generatedAt: new Date().toISOString(),
    disciplineMax: student?.disciplineTotal ?? null,
    promoted: student ? [student] : [],
    repeaters: [],
  };
}

export function downloadHistoryPdf({ schoolName, academicYear, rows = [] }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const margin = 14;
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageWidth, 26, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Promotion History', margin, 12);
  doc.setFontSize(9);
  doc.setTextColor(...GOLD);
  doc.text(`${schoolName || 'School'} · ${academicYear || 'All years'}`, margin, 19);
  autoTable(doc, {
    startY: 32,
    head: [['Student', 'From', 'To', 'Year', 'Term', 'Status', 'Date']],
    body: (rows || []).map((r) => [
      r.student || '—',
      r.fromClass || '—',
      r.toClass || '—',
      r.year || '—',
      r.term || '—',
      r.status || '—',
      r.date || '—',
    ]),
    theme: 'striped',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: NAVY },
    margin: { left: margin, right: margin },
  });
  const filename = `promotion-history-${slugPart(schoolName)}-${slugPart(academicYear)}.pdf`;
  doc.save(filename);
  return filename;
}

export function downloadRepeatersReportPdf({ schoolName, academicYear, repeaters = [] }) {
  const report = {
    schoolName,
    academicYear,
    term: '—',
    promotionType: 'Repeaters report',
    sourceClass: 'All flagged',
    destinationClass: '—',
    generatedAt: new Date().toISOString(),
    promoted: [],
    repeaters,
  };
  return downloadPromotionClassPdf(report);
}

export function downloadPromotionSummaryPdf({ schoolName, academicYear, summary, history = [] }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const margin = 14;
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageWidth, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('Promotion Summary Report', margin, 14);
  doc.setFontSize(9);
  doc.setTextColor(...GOLD);
  doc.text(`${schoolName} · ${academicYear}`, margin, 21);
  let y = 36;
  doc.setTextColor(40, 40, 50);
  doc.setFontSize(10);
  const stats = [
    `Total students: ${summary?.total_students ?? '—'}`,
    `Promoted (records): ${summary?.promoted ?? '—'}`,
    `Repeated (records): ${summary?.repeated ?? '—'}`,
    `Promotion rate: ${summary?.promotion_rate ?? '—'}%`,
    `Repeat rate: ${summary?.repeat_rate ?? '—'}%`,
  ];
  stats.forEach((line) => {
    doc.text(line, margin, y);
    y += 6;
  });
  if (summary?.by_class?.length) {
    autoTable(doc, {
      startY: y + 4,
      head: [['Class', 'Promoted', 'Repeat', 'Total']],
      body: summary.by_class.map((r) => [
        r.class_name,
        String(r.promote),
        String(r.repeat),
        String(r.total),
      ]),
      theme: 'striped',
      styles: { fontSize: 8 },
      headStyles: { fillColor: NAVY },
      margin: { left: margin, right: margin },
    });
    y = doc.lastAutoTable.finalY + 8;
  }
  if (history.length) {
    doc.setFont('helvetica', 'bold');
    doc.text('Recent promotions', margin, y);
    autoTable(doc, {
      startY: y + 4,
      head: [['Student', 'From', 'To', 'Status']],
      body: history.slice(0, 40).map((r) => [r.student, r.fromClass, r.toClass, r.status]),
      styles: { fontSize: 7 },
      headStyles: { fillColor: NAVY },
      margin: { left: margin, right: margin },
    });
  }
  const filename = `promotion-summary-${slugPart(academicYear)}.pdf`;
  doc.save(filename);
  return filename;
}
