import { jsPDF } from 'jspdf';
import {
  WEEK_DAYS,
  SLOT_STYLES,
  classifySlot,
  sortPeriodsChronologically,
  buildLessonLookup,
  paletteForSubject,
  abbrSubject,
  teacherInitials,
  normalizeTime,
  fmt12Long,
  hexToRgb,
} from './masterTimetableShared';

function drawPageHeader(pdf, pw, { schoolName, groupLabel, term, academicYear, day, pageNum, totalPages }) {
  pdf.setFillColor(15, 23, 42);
  pdf.rect(0, 0, pw, 22, 'F');
  pdf.setFillColor(255, 140, 0);
  pdf.rect(0, 20, pw, 1.2, 'F');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(255, 255, 255);
  pdf.text(String(schoolName || 'School Timetable').toUpperCase(), 10, 9);

  pdf.setFontSize(9);
  pdf.setTextColor(203, 213, 225);
  const meta = [
    `${groupLabel || 'Class'} — All Streams`,
    term,
    academicYear,
    day,
  ].filter(Boolean).join('  ·  ');
  pdf.text(meta, 10, 15);

  pdf.setFontSize(7);
  pdf.setTextColor(148, 163, 184);
  pdf.text(`Page ${pageNum} of ${totalPages}`, pw - 10, 9, { align: 'right' });
  pdf.text('Master Timetable', pw - 10, 15, { align: 'right' });

  return 26;
}

function drawLegend(pdf, margin, y, pw) {
  const items = [
    { label: 'Extra', pdf: [253, 244, 255], title: '#86198f' },
    { label: 'Break', ...SLOT_STYLES.break },
    { label: 'Lunch', ...SLOT_STYLES.lunch },
    { label: 'Correction', ...SLOT_STYLES.correction },
  ];
  pdf.setFontSize(6);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(100, 116, 139);
  pdf.text('LEGEND:', margin, y);
  let x = margin + 16;
  for (const item of items) {
    if (item.pdf) pdf.setFillColor(...item.pdf);
    pdf.roundedRect(x, y - 3, 14, 5, 1, 1, 'F');
    pdf.setTextColor(51, 65, 85);
    pdf.text(item.label, x + 16, y);
    x += 38;
  }
  pdf.setTextColor(148, 163, 184);
  pdf.text('Subject cells show abbreviation + teacher initials', pw - margin, y, { align: 'right' });
}

export function exportMasterTimetablePdf({
  rows = [],
  periods = [],
  streams = [],
  groupLabel = '',
  activeDays = WEEK_DAYS,
  term = '',
  academicYear = '',
  schoolName = '',
}) {
  const displayDays = activeDays?.length
    ? activeDays.filter((d) => WEEK_DAYS.includes(d))
    : WEEK_DAYS;

  const allPeriods = sortPeriodsChronologically(periods);
  const teachingPeriods = allPeriods.filter((p) => classifySlot(p) === 'teaching');
  const lessonLookup = buildLessonLookup(rows, streams, teachingPeriods);

  if (!streams.length || !allPeriods.length) {
    throw new Error('No timetable data to export');
  }

  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' });
  const pw = pdf.internal.pageSize.getWidth();
  const ph = pdf.internal.pageSize.getHeight();
  const margin = 8;
  const totalPages = displayDays.length;

  const dayColW = 14;
  const streamColW = 10;
  const slotCount = allPeriods.length;
  const dataColW = (pw - margin * 2 - dayColW - streamColW) / slotCount;
  const rowH = Math.min(10, (ph - 50) / (streams.length + 2));

  displayDays.forEach((day, pageIdx) => {
    if (pageIdx > 0) pdf.addPage();
    let y = drawPageHeader(pdf, pw, {
      schoolName,
      groupLabel,
      term,
      academicYear,
      day,
      pageNum: pageIdx + 1,
      totalPages,
    });

    // Column headers
    const headerH = 14;
    pdf.setFillColor(248, 250, 252);
    pdf.rect(margin, y, pw - margin * 2, headerH, 'F');
    pdf.setDrawColor(226, 232, 240);
    pdf.rect(margin, y, pw - margin * 2, headerH, 'S');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(6);
    pdf.setTextColor(100, 116, 139);
    pdf.text('DAY', margin + dayColW / 2, y + 5, { align: 'center' });
    pdf.text('STR', margin + dayColW + streamColW / 2, y + 5, { align: 'center' });

    allPeriods.forEach((period, i) => {
      const x = margin + dayColW + streamColW + i * dataColW;
      const slotType = classifySlot(period);
      if (slotType !== 'teaching') {
        const st = SLOT_STYLES[slotType];
        pdf.setFillColor(...st.pdf);
        pdf.rect(x, y, dataColW, headerH, 'F');
      }
      pdf.setFontSize(5);
      pdf.setTextColor(71, 85, 105);
      const name = slotType !== 'teaching'
        ? SLOT_STYLES[slotType].label
        : String(period.period_name || 'Period').slice(0, 8);
      pdf.text(name, x + dataColW / 2, y + 4.5, { align: 'center', maxWidth: dataColW - 1 });
      pdf.setFontSize(4.5);
      pdf.setTextColor(15, 23, 42);
      pdf.text(
        `${fmt12Long(normalizeTime(period.start_time)).replace(' ', '')}`,
        x + dataColW / 2,
        y + 8.5,
        { align: 'center' }
      );
      pdf.setTextColor(100, 116, 139);
      pdf.text(
        `${fmt12Long(normalizeTime(period.end_time)).replace(' ', '')}`,
        x + dataColW / 2,
        y + 11.5,
        { align: 'center' }
      );
      pdf.setDrawColor(226, 232, 240);
      pdf.rect(x, y, dataColW, headerH, 'S');
    });

    y += headerH;

    streams.forEach((stream, streamIdx) => {
      const rowY = y + streamIdx * rowH;

      if (streamIdx === 0) {
        pdf.setFillColor(255, 247, 237);
        pdf.rect(margin, rowY, dayColW, rowH * streams.length, 'F');
        pdf.setDrawColor(226, 232, 240);
        pdf.rect(margin, rowY, dayColW, rowH * streams.length, 'S');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(7);
        pdf.setTextColor(15, 23, 42);
        pdf.text(day.slice(0, 3).toUpperCase(), margin + dayColW / 2, rowY + (rowH * streams.length) / 2 - 1, { align: 'center' });
        pdf.setFontSize(5);
        pdf.setTextColor(148, 163, 184);
        pdf.text(day, margin + dayColW / 2, rowY + (rowH * streams.length) / 2 + 3, { align: 'center' });
      }

      // Stream badge
      const sx = margin + dayColW;
      pdf.setFillColor(255, 140, 0);
      pdf.roundedRect(sx + 1.5, rowY + 1.5, streamColW - 3, rowH - 3, 1.5, 1.5, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.setTextColor(255, 255, 255);
      pdf.text(stream.stream, sx + streamColW / 2, rowY + rowH / 2 + 1, { align: 'center' });
      pdf.setDrawColor(226, 232, 240);
      pdf.rect(sx, rowY, streamColW, rowH, 'S');

      allPeriods.forEach((period, colIdx) => {
        const x = margin + dayColW + streamColW + colIdx * dataColW;
        const slotType = classifySlot(period);

        if (slotType !== 'teaching') {
          if (streamIdx === 0) {
            const st = SLOT_STYLES[slotType];
            pdf.setFillColor(...st.pdf);
            pdf.rect(x, rowY, dataColW, rowH * streams.length, 'F');
            pdf.setDrawColor(148, 163, 184);
            pdf.rect(x, rowY, dataColW, rowH * streams.length, 'S');
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(7);
            pdf.setTextColor(...hexToRgb(st.title).map((c) => Math.max(0, c - 20)));
            const label = st.label;
            pdf.text(label, x + dataColW / 2, rowY + (rowH * streams.length) / 2 - 2, { align: 'center' });
            pdf.setFontSize(5);
            pdf.setTextColor(71, 85, 105);
            pdf.text(
              `${normalizeTime(period.start_time)} – ${normalizeTime(period.end_time)}`,
              x + dataColW / 2,
              rowY + (rowH * streams.length) / 2 + 3,
              { align: 'center', maxWidth: dataColW - 1 }
            );
          }
          return;
        }

        const key = `${day}__${stream.stream}__${normalizeTime(period.start_time)}`;
        const lesson = lessonLookup.get(key);
        pdf.setDrawColor(226, 232, 240);
        pdf.rect(x, rowY, dataColW, rowH, 'S');

        if (lesson) {
          const isExtra = Boolean(lesson.extra_activity_id);
          const pal = isExtra
            ? { bg: '#fdf4ff', title: '#86198f' }
            : paletteForSubject(lesson.subject_name);
          const bg = hexToRgb(pal.bg);
          pdf.setFillColor(...bg);
          pdf.rect(x + 0.3, rowY + 0.3, dataColW - 0.6, rowH - 0.6, 'F');
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(6);
          pdf.setTextColor(...hexToRgb(pal.title));
          pdf.text(abbrSubject(lesson.subject_name), x + dataColW / 2, rowY + rowH / 2 - (isExtra ? 1 : 0.5), { align: 'center', maxWidth: dataColW - 1 });
          if (isExtra) {
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(4);
            pdf.setTextColor(134, 25, 143);
            pdf.text(fmt12Long(normalizeTime(lesson.start_time)).replace(' AM', 'a').replace(' PM', 'p'), x + dataColW / 2, rowY + rowH / 2 + 3, { align: 'center' });
          } else if (lesson.teacher_name) {
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(4.5);
            pdf.setTextColor(100, 116, 139);
            pdf.text(teacherInitials(lesson.teacher_name), x + dataColW / 2, rowY + rowH / 2 + 3, { align: 'center' });
          }
        } else {
          pdf.setFillColor(248, 250, 252);
          pdf.rect(x + 0.3, rowY + 0.3, dataColW - 0.6, rowH - 0.6, 'F');
        }
      });
    });

    y += streams.length * rowH + 4;
    drawLegend(pdf, margin, ph - 6, pw);
  });

  const safeGroup = String(groupLabel || 'class').replace(/[^\w-]+/g, '-');
  pdf.save(`master-timetable-${safeGroup}-${new Date().toISOString().slice(0, 10)}.pdf`);
}
