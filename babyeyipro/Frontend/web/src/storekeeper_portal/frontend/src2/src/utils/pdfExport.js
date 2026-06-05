import { jsPDF } from 'jspdf';

export const exportTablePDF = async ({
  title,
  metaLines = [],
  headers = [],
  rows = [],
  filename = 'export.pdf',
  autoPrint = false,
  wrapColumns = [],
}) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210;
  const H = 297;
  const margin = 16;
  const contentW = W - margin * 2;

  // Portal theme (navy + yellow) to match UI
  const NAVY = [30, 58, 95];   // #1E3A5F
  const YELLOW = [254, 191, 16]; // #FEBF10

  let y = 0;
  let page = 0;

  const addPage = () => {
    if (page > 0) doc.addPage();
    page += 1;

    doc.setFillColor(...NAVY);
    doc.rect(0, 0, W, 14, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('DISCIPLINE STAFF PORTAL', margin, 9);
    doc.setFont('helvetica', 'normal');
    doc.text(String(title || '').toUpperCase(), W / 2, 9, { align: 'center' });
    doc.text(`Page ${page}`, W - margin, 9, { align: 'right' });

    doc.setFillColor(...NAVY);
    doc.rect(0, H - 12, W, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.text('Discipline Staff Portal · Internal report', margin, H - 5);

    y = 22;
  };

  const ensureSpace = (neededMm) => {
    if (y + neededMm > H - 18) {
      addPage();
      return true;
    }
    return false;
  };

  const drawTableHeaders = (colW) => {
    doc.setFillColor(...YELLOW);
    doc.rect(margin, y, contentW, 8, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...NAVY);
    let x = margin + 3;
    headers.forEach((h) => {
      doc.text(String(h || ''), x, y + 5.5);
      x += colW;
    });
    y += 8;
  };

  addPage();

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(String(title || 'Report'), margin, y);
  y += 6;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated: ${new Date().toLocaleString()}`, margin, y);
  doc.text(`Total Records: ${rows.length}`, W - margin, y, { align: 'right' });
  y += 7;

  metaLines.filter(Boolean).forEach((line) => {
    ensureSpace(6);
    doc.text(String(line), margin, y);
    y += 5;
  });
  y += 4;

  if (!headers.length) headers = ['DATA'];
  const colW = contentW / headers.length;

  drawTableHeaders(colW);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');

  const wrapSet = new Set(wrapColumns);
  const lineH = 3.8; // mm
  const basePadTop = 2.6;
  const baseRowH = 8;

  rows.forEach((row, i) => {
    const cells = Array.isArray(row) ? row : [row];

    // pre-calc wrapped lines + row height
    const cellLines = cells.map((cell, j) => {
      const text = String(cell ?? '');
      if (!wrapSet.has(j)) return [text];
      const maxW = Math.max(10, colW - 6);
      const lines = doc.splitTextToSize(text, maxW);
      return Array.isArray(lines) && lines.length ? lines : [''];
    });

    const maxLines = Math.max(1, ...cellLines.map((ls) => ls.length));
    const rowH = Math.max(baseRowH, basePadTop + maxLines * lineH + 1.8);

    if (ensureSpace(rowH)) {
      drawTableHeaders(colW);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
    }

    doc.setFillColor(...(i % 2 === 0 ? [255, 255, 255] : [248, 250, 252]));
    doc.rect(margin, y, contentW, rowH, 'F');

    doc.setTextColor(15, 23, 42);
    let x = margin + 3;

    cellLines.forEach((lines, j) => {
      if (wrapSet.has(j)) {
        lines.slice(0, 6).forEach((ln, k) => {
          doc.text(String(ln ?? ''), x, y + basePadTop + (k + 1) * lineH);
        });
      } else {
        let text = String(cells[j] ?? '');
        const textWidth = doc.getTextWidth(text);
        if (textWidth > colW - 5 && text.length > 3) {
          const approxChars = Math.max(3, Math.floor((colW - 6) / (textWidth / text.length)));
          text = text.substring(0, approxChars) + '...';
        }
        doc.text(text, x, y + 5.5);
      }
      x += colW;
    });

    y += rowH;
  });

  if (autoPrint) {
    doc.autoPrint();
    const blob = doc.output('blob');
    window.open(URL.createObjectURL(blob), '_blank');
    return;
  }

  doc.save(filename);
};

export const exportStudentDisciplineDetailsPDF = async ({
  student,
  academicYear = '',
  term = '',
  logs = [],
  filename = 'student_discipline_report.pdf',
  autoPrint = true,
}) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210;
  const H = 297;
  const margin = 16;
  const contentW = W - margin * 2;

  const NAVY = [30, 58, 95]; // #1E3A5F
  const YELLOW = [254, 191, 16]; // #FEBF10

  let y = 0;
  let page = 0;

  const addPage = () => {
    if (page > 0) doc.addPage();
    page += 1;

    doc.setFillColor(...NAVY);
    doc.rect(0, 0, W, 14, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('DISCIPLINE STAFF PORTAL', margin, 9);
    doc.setFont('helvetica', 'normal');
    doc.text('STUDENT DISCIPLINE REPORT', W / 2, 9, { align: 'center' });
    doc.text(`Page ${page}`, W - margin, 9, { align: 'right' });

    doc.setFillColor(...NAVY);
    doc.rect(0, H - 12, W, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.text('Discipline Staff Portal · Student report', margin, H - 5);

    y = 22;
  };

  const ensureSpace = (neededMm) => {
    if (y + neededMm > H - 18) {
      addPage();
      return true;
    }
    return false;
  };

  const sectionTitle = (text) => {
    ensureSpace(10);

    // Minimal section header (no background fill)
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...NAVY);
    doc.text(String(text || '').toUpperCase(), margin, y + 4.5);

    // Yellow accent underline
    doc.setDrawColor(...YELLOW);
    doc.setLineWidth(0.8);
    doc.line(margin, y + 6.5, margin + 36, y + 6.5);
    doc.setLineWidth(0.2);

    // subtle divider line to the right
    doc.setDrawColor(230, 230, 230);
    doc.line(margin + 40, y + 6.5, W - margin, y + 6.5);

    y += 10;
  };

  const labelValue = (label, value) => {
    ensureSpace(7);
    const l = String(label || '');
    const v = String(value ?? '—');
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(l, margin + 3, y);
    doc.setDrawColor(210, 210, 210);
    doc.setLineDashPattern([0.5, 1.5], 0);
    const lW = doc.getTextWidth(l);
    const vW = doc.getTextWidth(v);
    doc.line(margin + 3 + lW + 2, y - 1, W - margin - 3 - vW - 2, y - 1);
    doc.setLineDashPattern([], 0);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(v, W - margin - 3, y, { align: 'right' });
    y += 7;
  };

  const studentName = `${student?.first_name || ''} ${student?.last_name || ''}`.trim() || student?.name || 'Student';
  const uid = student?.student_uid || student?.student_code || student?.id || '—';
  const className = student?.class_name || '—';

  const total = Number(student?.discipline_total ?? 100);
  const remaining = Number(student?.discipline_remaining ?? 0);

  const totalRewards = (logs || []).reduce((sum, log) => {
    const pts = Number(log?.marks_deducted);
    return pts < 0 ? sum + Math.abs(pts) : sum;
  }, 0);
  const totalDeductions = (logs || []).reduce((sum, log) => {
    const pts = Number(log?.marks_deducted);
    return pts > 0 ? sum + pts : sum;
  }, 0);

  addPage();

  // Title block
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Student Discipline Report', margin, y);
  y += 6;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated: ${new Date().toLocaleString()}`, margin, y);
  doc.text(`Records: ${(logs || []).length}`, W - margin, y, { align: 'right' });
  y += 10;

  sectionTitle('Student Profile');
  labelValue('Name', studentName);
  labelValue('UID', uid);
  labelValue('Class', className);
  if (academicYear) labelValue('Academic Year', academicYear);
  if (term) labelValue('Term', term);

  sectionTitle('Conduct Summary');
  labelValue('Current Score', `${remaining.toFixed(0)}/${Number.isFinite(total) ? total : 100}`);
  labelValue('Rewarded (pts)', String(totalRewards));
  labelValue('Deducted (pts)', String(totalDeductions));

  sectionTitle('Activity Log');

  const colDate = 28;
  const colSubject = 34;
  const colPts = 16;
  const colDetails = Math.max(40, contentW - (colDate + colSubject + colPts));

  const drawLogHeader = () => {
    ensureSpace(10);
    doc.setFillColor(...YELLOW);
    doc.rect(margin, y, contentW, 8, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...NAVY);
    doc.text('DATE', margin + 3, y + 5.5);
    doc.text('SUBJECT', margin + 3 + colDate, y + 5.5);
    doc.text('DETAILS', margin + 3 + colDate + colSubject, y + 5.5);
    doc.text('PTS', margin + contentW - 3, y + 5.5, { align: 'right' });
    y += 8;
  };

  drawLogHeader();

  const lineH = 3.8;
  const padTop = 2.6;
  const baseRowMinH = 8;

  (logs || []).forEach((log, i) => {
    const d = new Date(log?.created_at);
    const dateStr = !Number.isNaN(d.getTime())
      ? d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      : '—';
    const subject = String(log?.lesson_subject || 'General');
    const details = String(log?.description || '—');
    const pts = Number(log?.marks_deducted ?? 0);
    const displayPts = pts < 0 ? `+${Math.abs(pts)}` : pts > 0 ? `-${pts}` : '0';

    const detailsLines = doc.splitTextToSize(details, colDetails - 6);
    const maxLines = Math.max(1, Array.isArray(detailsLines) ? detailsLines.length : 1);
    const rowH = Math.max(baseRowMinH, padTop + maxLines * lineH + 1.8);

    if (ensureSpace(rowH)) {
      drawLogHeader();
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
    }

    doc.setFillColor(...(i % 2 === 0 ? [255, 255, 255] : [248, 250, 252]));
    doc.rect(margin, y, contentW, rowH, 'F');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(dateStr, margin + 3, y + 5.5);
    doc.text(subject.length > 22 ? subject.substring(0, 22) + '…' : subject, margin + 3 + colDate, y + 5.5);

    // wrapped details
    (Array.isArray(detailsLines) ? detailsLines : [detailsLines]).slice(0, 10).forEach((ln, k) => {
      doc.text(String(ln ?? ''), margin + 3 + colDate + colSubject, y + padTop + (k + 1) * lineH);
    });

    // pts (color)
    const ptsColor = pts < 0 ? [22, 163, 74] : pts > 0 ? [220, 38, 38] : [37, 99, 235];
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...ptsColor);
    doc.text(displayPts, margin + contentW - 3, y + 5.5, { align: 'right' });

    y += rowH;
  });

  if (autoPrint) {
    doc.autoPrint();
    const blob = doc.output('blob');
    window.open(URL.createObjectURL(blob), '_blank');
    return;
  }

  doc.save(filename);
};

export const exportPermissionDetailsPDF = async ({
  permission,
  filename = 'permission.pdf',
  autoPrint = true,
}) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210;
  const H = 297;
  const margin = 16;
  const contentW = W - margin * 2;

  const NAVY = [30, 58, 95]; // #1E3A5F
  const YELLOW = [254, 191, 16]; // #FEBF10

  let y = 22;

  const headerFooter = () => {
    doc.setFillColor(...NAVY);
    doc.rect(0, 0, W, 14, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('DISCIPLINE STAFF PORTAL', margin, 9);
    doc.setFont('helvetica', 'normal');
    doc.text('PERMISSION SLIP', W / 2, 9, { align: 'center' });

    doc.setFillColor(...NAVY);
    doc.rect(0, H - 12, W, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.text('Student Permissions · Official permission window', margin, H - 5);
  };

  const sectionTitle = (text) => {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...NAVY);
    doc.text(String(text || '').toUpperCase(), margin, y);
    doc.setDrawColor(...YELLOW);
    doc.setLineWidth(0.8);
    doc.line(margin, y + 2, margin + 34, y + 2);
    doc.setLineWidth(0.2);
    doc.setDrawColor(230, 230, 230);
    doc.line(margin + 38, y + 2, W - margin, y + 2);
    y += 10;
  };

  const labelValue = (label, value) => {
    const l = String(label || '');
    const v = String(value ?? '—');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(l, margin + 3, y);
    doc.setDrawColor(210, 210, 210);
    doc.setLineDashPattern([0.5, 1.5], 0);
    const lW = doc.getTextWidth(l);
    const vW = doc.getTextWidth(v);
    doc.line(margin + 3 + lW + 2, y - 1, W - margin - 3 - vW - 2, y - 1);
    doc.setLineDashPattern([], 0);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(v, W - margin - 3, y, { align: 'right' });
    y += 7;
  };

  const fmtDT = (raw) => {
    if (!raw) return '—';
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return String(raw);
    return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  headerFooter();

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Permission Slip', margin, y);
  y += 6;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated: ${new Date().toLocaleString()}`, margin, y);
  y += 10;

  const name = `${permission?.first_name || ''} ${permission?.last_name || ''}`.trim() || '—';
  const uid = permission?.student_uid || '—';
  const cls = permission?.class_name || '—';

  sectionTitle('Student');
  labelValue('Name', name);
  labelValue('UID', uid);
  labelValue('Class', cls);

  sectionTitle('Permission window');
  labelValue('Type', permission?.permission_type || '—');
  labelValue('From', fmtDT(permission?.starts_at));
  labelValue('To', fmtDT(permission?.ends_at));
  labelValue('Status', permission?.status || '—');

  sectionTitle('Reason');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  const reason = String(permission?.reason || '—');
  const lines = doc.splitTextToSize(reason, contentW - 6);
  doc.text(lines, margin + 3, y);
  y += (Array.isArray(lines) ? lines.length : 1) * 5 + 2;

  if (autoPrint) {
    doc.autoPrint();
    const blob = doc.output('blob');
    window.open(URL.createObjectURL(blob), '_blank');
    return;
  }

  doc.save(filename);
};

