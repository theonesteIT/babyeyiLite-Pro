import { jsPDF } from 'jspdf';
import { WEEK_DAYS, paletteForSubject, normalizeTime, hexToRgb } from './masterTimetableShared';

export function exportClassTimetablePdf({
  className = '',
  rows = [],
  periods = [],
  activeDays = WEEK_DAYS,
  term = '',
  academicYear = '',
  schoolName = '',
}) {
  const displayDays = activeDays?.length
    ? activeDays.filter((d) => WEEK_DAYS.includes(d))
    : WEEK_DAYS;

  const classRows = rows.filter((r) => String(r.class_name || '').trim() === String(className || '').trim());
  const lessonMap = new Map();
  for (const r of classRows) {
    const k = `${r.day_of_week}__${normalizeTime(r.start_time)}`;
    lessonMap.set(k, r);
  }

  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pw = pdf.internal.pageSize.getWidth();
  const ph = pdf.internal.pageSize.getHeight();
  const margin = 8;
  const cols = displayDays.length;
  const pRows = periods;
  if (!pRows.length) throw new Error('No periods to export');

  const colW = (pw - margin * 2 - 28) / cols;
  const rowH = 14;
  const headerH = 10;
  const timeColW = 28;
  let y = margin;

  pdf.setFillColor(15, 23, 42);
  pdf.rect(0, 0, pw, 18, 'F');
  pdf.setFillColor(255, 140, 0);
  pdf.rect(0, 16, pw, 1, 'F');
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  pdf.text(String(schoolName || 'School Timetable').toUpperCase(), margin, 8);
  pdf.setFontSize(9);
  pdf.setTextColor(203, 213, 225);
  const meta = [className, term, academicYear].filter(Boolean).join('  ·  ');
  pdf.text(meta, margin, 13);
  y = 24;

  const drawHeader = () => {
    pdf.setFillColor(15, 23, 42);
    pdf.rect(margin, y, pw - margin * 2, headerH, 'F');
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(255, 255, 255);
    pdf.text('TIME', margin + timeColW / 2, y + headerH / 2 + 2, { align: 'center' });
    displayDays.forEach((day, i) => {
      pdf.text(day.toUpperCase(), margin + timeColW + i * colW + colW / 2, y + headerH / 2 + 2, { align: 'center' });
    });
    y += headerH;
  };

  const checkPageBreak = (needed) => {
    if (y + needed > ph - margin) {
      pdf.addPage();
      y = margin;
      drawHeader();
    }
  };

  drawHeader();

  pRows.forEach((period) => {
    const isBrk = Boolean(period.is_break) || String(period.period_name || '').toLowerCase().match(/break|lunch|free|correction/);

    if (isBrk) {
      checkPageBreak(rowH * 0.7);
      pdf.setFillColor(241, 245, 249);
      pdf.rect(margin, y, pw - margin * 2, rowH * 0.7, 'F');
      pdf.setDrawColor(226, 232, 240);
      pdf.rect(margin, y, pw - margin * 2, rowH * 0.7, 'S');
      pdf.setFontSize(6);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(148, 163, 184);
      pdf.text(
        `${String(period.period_name).toUpperCase()}  ${normalizeTime(period.start_time)}–${normalizeTime(period.end_time)}`,
        pw / 2,
        y + rowH * 0.35 + 1.5,
        { align: 'center' }
      );
      y += rowH * 0.7;
      return;
    }

    checkPageBreak(rowH);
    pdf.setFillColor(248, 250, 252);
    pdf.rect(margin, y, timeColW, rowH, 'F');
    pdf.setDrawColor(226, 232, 240);
    pdf.rect(margin, y, timeColW, rowH, 'S');
    pdf.setFontSize(5.5);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(100, 116, 139);
    pdf.text(period.period_name || 'Period', margin + timeColW / 2, y + 4, { align: 'center' });
    pdf.setFontSize(6);
    pdf.setTextColor(15, 23, 42);
    pdf.text(`${normalizeTime(period.start_time)}`, margin + timeColW / 2, y + 8, { align: 'center' });
    pdf.text(`${normalizeTime(period.end_time)}`, margin + timeColW / 2, y + 11.5, { align: 'center' });

    displayDays.forEach((day, i) => {
      const cellX = margin + timeColW + i * colW;
      const key = `${day}__${normalizeTime(period.start_time)}`;
      const lesson = lessonMap.get(key);
      const pal = lesson ? paletteForSubject(lesson.subject_name) : null;

      if (lesson) {
        pdf.setFillColor(...hexToRgb(pal.bg));
        pdf.rect(cellX, y, colW, rowH, 'F');
        pdf.setDrawColor(...hexToRgb(pal.border));
        pdf.rect(cellX, y, colW, rowH, 'S');
        pdf.setFontSize(7);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(...hexToRgb(pal.title));
        pdf.text(String(lesson.subject_name || '').toUpperCase(), cellX + colW / 2, y + 5, { align: 'center', maxWidth: colW - 3 });
        pdf.setFontSize(5.5);
        pdf.setTextColor(148, 163, 184);
        pdf.text(lesson.teacher_name || '', cellX + colW / 2, y + 10, { align: 'center', maxWidth: colW - 2 });
      } else {
        pdf.setFillColor(255, 255, 255);
        pdf.rect(cellX, y, colW, rowH, 'F');
        pdf.setDrawColor(226, 232, 240);
        pdf.rect(cellX, y, colW, rowH, 'S');
      }
    });
    y += rowH;
  });

  const safeName = String(className || 'class').replace(/\s+/g, '-');
  pdf.save(`timetable-${safeName}-${new Date().toISOString().slice(0, 10)}.pdf`);
}
