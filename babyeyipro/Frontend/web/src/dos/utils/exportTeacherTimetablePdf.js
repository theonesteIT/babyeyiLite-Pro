import { jsPDF } from 'jspdf';
import {
  WEEK_DAYS,
  paletteForSubject,
  normalizeTime,
  abbrSubject,
  hexToRgb,
  classifySlot,
  sortPeriodsChronologically,
} from './masterTimetableShared';

export function exportTeacherTimetablePdf({
  teacherName = '',
  rows = [],
  periods = [],
  streams = [],
  activeDays = WEEK_DAYS,
  term = '',
  academicYear = '',
  schoolName = '',
  classLabel = '',
}) {
  const displayDays = activeDays?.length
    ? activeDays.filter((d) => WEEK_DAYS.includes(d))
    : WEEK_DAYS;

  const allPeriods = sortPeriodsChronologically(periods);
  const teachingPeriods = allPeriods.filter((p) => classifySlot(p) === 'teaching');
  const multiStream = streams.length > 1;

  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: multiStream ? 'a3' : 'a4' });
  const pw = pdf.internal.pageSize.getWidth();
  const ph = pdf.internal.pageSize.getHeight();
  const margin = 8;
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
  const meta = [teacherName, classLabel, term, academicYear].filter(Boolean).join('  ·  ');
  pdf.text(meta, margin, 13);
  y = 24;

  if (!multiStream) {
    const lessonMap = new Map();
    for (const r of rows) {
      lessonMap.set(`${r.day_of_week}__${normalizeTime(r.start_time)}`, r);
    }
    const cols = displayDays.length;
    const colW = (pw - margin * 2 - 28) / cols;
    const rowH = 14;
    const headerH = 10;
    const timeColW = 28;

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

    drawHeader();
    for (const period of allPeriods) {
      const slotType = classifySlot(period);
      if (slotType !== 'teaching') {
        pdf.setFillColor(241, 245, 249);
        pdf.rect(margin, y, pw - margin * 2, 8, 'F');
        pdf.setFontSize(6);
        pdf.setTextColor(148, 163, 184);
        pdf.text(`${period.period_name}  ${normalizeTime(period.start_time)}–${normalizeTime(period.end_time)}`, pw / 2, y + 5, { align: 'center' });
        y += 8;
        continue;
      }
      if (y + 14 > ph - margin) { pdf.addPage(); y = margin; drawHeader(); }
      pdf.setFillColor(248, 250, 252);
      pdf.rect(margin, y, 28, 14, 'F');
      pdf.setFontSize(6);
      pdf.setTextColor(15, 23, 42);
      pdf.text(`${normalizeTime(period.start_time)}`, margin + 14, y + 8, { align: 'center' });
      displayDays.forEach((day, i) => {
        const cellX = margin + 28 + i * colW;
        const lesson = lessonMap.get(`${day}__${normalizeTime(period.start_time)}`);
        if (lesson) {
          const pal = paletteForSubject(lesson.subject_name);
          pdf.setFillColor(...hexToRgb(pal.bg));
          pdf.rect(cellX, y, colW, 14, 'F');
          pdf.setDrawColor(...hexToRgb(pal.border));
          pdf.rect(cellX, y, colW, 14, 'S');
          pdf.setFontSize(7);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(...hexToRgb(pal.title));
          pdf.text(abbrSubject(lesson.subject_name), cellX + colW / 2, y + 6, { align: 'center' });
          pdf.setFontSize(5.5);
          pdf.setTextColor(100, 116, 139);
          pdf.text(String(lesson.class_name || ''), cellX + colW / 2, y + 11, { align: 'center' });
        } else {
          pdf.setFillColor(255, 255, 255);
          pdf.rect(cellX, y, colW, 14, 'F');
          pdf.setDrawColor(226, 232, 240);
          pdf.rect(cellX, y, colW, 14, 'S');
        }
      });
      y += 14;
    }
  } else {
    const streamCols = streams.length;
    const dayColW = 22;
    const streamColW = (pw - margin * 2 - dayColW - 24) / streamCols;
    const rowH = 10;
    const periodColW = 24;

    for (const day of displayDays) {
      if (y + 20 > ph - margin) { pdf.addPage(); y = margin; }
      pdf.setFillColor(255, 247, 237);
      pdf.rect(margin, y, pw - margin * 2, 8, 'F');
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(194, 65, 12);
      pdf.text(day.toUpperCase(), margin + 4, y + 5.5);
      y += 10;

      pdf.setFillColor(15, 23, 42);
      pdf.rect(margin, y, pw - margin * 2, 7, 'F');
      pdf.setFontSize(6);
      pdf.setTextColor(255, 255, 255);
      pdf.text('TIME', margin + periodColW / 2, y + 4.5, { align: 'center' });
      streams.forEach((s, i) => {
        pdf.text(s.stream, margin + periodColW + i * streamColW + streamColW / 2, y + 4.5, { align: 'center' });
      });
      y += 7;

      for (const period of teachingPeriods) {
        if (y + rowH > ph - margin) { pdf.addPage(); y = margin; }
        pdf.setFillColor(248, 250, 252);
        pdf.rect(margin, y, periodColW, rowH, 'F');
        pdf.setFontSize(5);
        pdf.setTextColor(100, 116, 139);
        pdf.text(normalizeTime(period.start_time), margin + periodColW / 2, y + 6, { align: 'center' });
        streams.forEach((s, i) => {
          const cellX = margin + periodColW + i * streamColW;
          const lesson = rows.find(
            (r) => r.class_name === s.fullName
              && r.day_of_week === day
              && normalizeTime(r.start_time) === normalizeTime(period.start_time)
          );
          if (lesson) {
            const pal = paletteForSubject(lesson.subject_name);
            pdf.setFillColor(...hexToRgb(pal.bg));
            pdf.rect(cellX, y, streamColW, rowH, 'F');
            pdf.setFontSize(6);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(...hexToRgb(pal.title));
            pdf.text(abbrSubject(lesson.subject_name), cellX + streamColW / 2, y + 6, { align: 'center' });
          } else {
            pdf.setFillColor(255, 255, 255);
            pdf.rect(cellX, y, streamColW, rowH, 'F');
            pdf.setDrawColor(226, 232, 240);
            pdf.rect(cellX, y, streamColW, rowH, 'S');
          }
        });
        y += rowH;
      }
      y += 4;
    }
  }

  const safeTeacher = String(teacherName || 'teacher').replace(/\s+/g, '-').slice(0, 30);
  pdf.save(`teacher-timetable-${safeTeacher}-${new Date().toISOString().slice(0, 10)}.pdf`);
}
