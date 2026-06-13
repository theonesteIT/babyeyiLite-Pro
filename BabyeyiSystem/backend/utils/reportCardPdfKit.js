const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

const NAVY = '#000435';
const UPLOADS_ROOT = path.join(__dirname, '..', 'uploads');
const { gradeRemark } = require('./schoolGradingSchema');

function esc(s) {
  return String(s ?? '').trim() || '—';
}

function resolveUploadFile(relUrl) {
  if (!relUrl) return null;
  let rel = String(relUrl).trim().replace(/\\/g, '/');
  if (!rel || /^https?:\/\//i.test(rel)) return null;
  rel = rel.replace(/^\/+/, '');
  if (rel.startsWith('uploads/')) rel = rel.slice('uploads/'.length);
  const fp = path.join(UPLOADS_ROOT, rel);
  return fs.existsSync(fp) ? fp : null;
}

function formatSchoolAddress(school = {}) {
  if (school.address) return school.address;
  const parts = [school.village, school.cell, school.sector, school.district, school.province].filter(Boolean);
  return parts.join(', ');
}

function reportTypeLabel(reportType) {
  return reportType === 'final' ? 'Final Report' : 'Mid-Term Report';
}

function formatAssessmentScoreOnly(assessments, slug) {
  const a = assessments?.[slug];
  if (!a || a.score == null) return '—';
  const score = Number(a.score);
  if (!Number.isFinite(score)) return '—';
  return Number.isInteger(score) ? String(score) : score.toFixed(1);
}

function resolveAssessmentColumnMax(subjects, slug) {
  let max = null;
  for (const s of subjects || []) {
    const m = s.assessments?.[slug]?.max;
    if (m != null && Number(m) > 0) max = Math.max(max ?? 0, Number(m));
  }
  return max;
}

function computeMarksGrandTotals(subjects, assessmentColumns) {
  const columnTotals = {};
  let overallScore = 0;
  let overallMax = 0;
  for (const col of assessmentColumns) columnTotals[col.slug] = null;
  for (const s of subjects || []) {
    for (const col of assessmentColumns) {
      const a = s.assessments?.[col.slug];
      if (a?.score != null && Number.isFinite(Number(a.score))) {
        columnTotals[col.slug] = (columnTotals[col.slug] ?? 0) + Number(a.score);
        overallScore += Number(a.score);
      }
      if (a?.max != null && Number.isFinite(Number(a.max))) overallMax += Number(a.max);
    }
  }
  for (const slug of Object.keys(columnTotals)) {
    if (columnTotals[slug] != null) {
      const v = Math.round(columnTotals[slug] * 10) / 10;
      columnTotals[slug] = Number.isInteger(v) ? String(v) : v.toFixed(1);
    }
  }
  const fmt = (n) => {
    if (!Number.isFinite(n) || n <= 0) return null;
    const v = Math.round(n * 10) / 10;
    return Number.isInteger(v) ? String(v) : v.toFixed(1);
  };
  return {
    columnTotals,
    overallScore: fmt(overallScore),
    overallMax: fmt(overallMax),
    overallPercent: overallMax > 0 ? Math.round((overallScore / overallMax) * 1000) / 10 : null,
  };
}

function drawStatBox(doc, x, y, w, h, label, value, sub = null) {
  doc.roundedRect(x, y, w, h, 4).lineWidth(0.75).strokeColor('#cbd5e1').stroke();
  doc.fillColor('#64748b').fontSize(5).font('Helvetica-Bold')
    .text(label.toUpperCase(), x + 3, y + 4, { width: w - 6, align: 'center', lineBreak: false });
  doc.fillColor(NAVY).fontSize(8.5).font('Helvetica-Bold')
    .text(esc(value), x + 3, y + 14, { width: w - 6, align: 'center', lineBreak: false });
  if (sub) {
    doc.fillColor('#94a3b8').fontSize(4.8).font('Helvetica')
      .text(esc(sub), x + 3, y + 25, { width: w - 6, align: 'center', lineBreak: false });
  }
}

function formatDisciplineMarks(snapshot) {
  if (snapshot.discipline_marks != null && snapshot.discipline_marks_max != null) {
    return `${snapshot.discipline_marks}/${snapshot.discipline_marks_max}`;
  }
  return '—';
}

function resolveSubjectRemark(s, snapshot) {
  if (s.grade_remark) return s.grade_remark;
  return gradeRemark(s.grade, snapshot.grading_scale) || '—';
}

function drawMiniTrendChart(doc, x, y, w, h, trend) {
  const points = (trend || []).filter((t) => t.average != null).slice(0, 3);
  if (!points.length) return;
  doc.roundedRect(x, y, w, h, 3).lineWidth(0.5).strokeColor('#e2e8f0').stroke();
  const pad = 8;
  const plotW = w - pad * 2;
  const plotH = h - pad * 2 - 8;
  const step = points.length > 1 ? plotW / (points.length - 1) : 0;
  const coords = points.map((p, i) => ({
    x: x + pad + (points.length > 1 ? i * step : plotW / 2),
    y: y + pad + plotH - (Number(p.average) / 100) * plotH,
    label: p.term || `T${i + 1}`,
    val: p.average,
  }));
  doc.strokeColor('#e2e8f0').lineWidth(0.5);
  for (let i = 0; i <= 4; i += 1) {
    const gy = y + pad + (plotH * i) / 4;
    doc.moveTo(x + pad, gy).lineTo(x + w - pad, gy).stroke();
  }
  if (coords.length > 1) {
    doc.strokeColor(NAVY).lineWidth(1.5);
    doc.moveTo(coords[0].x, coords[0].y);
    for (let i = 1; i < coords.length; i += 1) doc.lineTo(coords[i].x, coords[i].y);
    doc.stroke();
  }
  coords.forEach((c) => {
    doc.circle(c.x, c.y, 2.5).fill(NAVY);
    doc.fillColor(NAVY).fontSize(6).font('Helvetica-Bold')
      .text(`${c.val}%`, c.x - 16, c.y - 11, { width: 32, align: 'center' });
    doc.fillColor('#64748b').fontSize(5).font('Helvetica')
      .text(c.label, c.x - 14, y + h - 7, { width: 28, align: 'center' });
  });
}

const DEFAULT_BANDS = [
  { letter: 'A', min_percent: 80, max_percent: 100, remark: 'EXCELLENT' },
  { letter: 'B', min_percent: 75, max_percent: 79, remark: 'VERY GOOD' },
  { letter: 'C', min_percent: 70, max_percent: 74, remark: 'GOOD' },
  { letter: 'D', min_percent: 60, max_percent: 69, remark: 'SATISFACTORY' },
  { letter: 'E', min_percent: 50, max_percent: 59, remark: 'ADEQUATE' },
  { letter: 'F', min_percent: 0, max_percent: 49, remark: 'FAIR' },
];

async function generateModernSnapshotPdf(snapshot, outPath, { school = null } = {}) {
  await fs.promises.mkdir(path.dirname(outPath), { recursive: true });
  const sch = school || snapshot.school || {};
  const isMid = snapshot.report_type === 'mid_term';
  const assessmentColumns = Array.isArray(snapshot.assessment_columns)
    ? snapshot.assessment_columns.filter((c) => isMid || !/final|exam|eoy/i.test(String(c.slug || '')))
    : [];
  const subjects = (snapshot.subjects || []).filter((s) => !s.is_extra_activity);
  const grandTotals = computeMarksGrandTotals(subjects, assessmentColumns);

  const qrPayload = snapshot.qr_data || snapshot.snapshot_id || '';
  let qrBuffer = null;
  if (qrPayload) {
    try {
      qrBuffer = await QRCode.toBuffer(String(qrPayload), { margin: 1, width: 160, errorCorrectionLevel: 'H' });
    } catch { /* skip */ }
  }

  return new Promise((resolve, reject) => {
    const M = 28;
    const doc = new PDFDocument({ margin: M, size: 'A4' });
    const stream = fs.createWriteStream(outPath);
    doc.pipe(stream);

    const pageW = doc.page.width - M * 2;
    const pageBottom = doc.page.height - M;
    let y = M;

    const rowH = subjects.length > 10 ? 10 : 11;
    const tableFont = subjects.length > 10 ? 6 : 6.5;

    // ── Header (matches on-screen clean layout) ──
    const logoPath = resolveUploadFile(sch.logo_url);
    const logoSize = 64;
    if (logoPath) {
      try { doc.image(logoPath, M, y, { width: logoSize, height: logoSize, fit: [logoSize, logoSize] }); } catch { /* */ }
    }

    const centerX = M + logoSize + 10;
    const centerW = pageW - logoSize - 90;
    doc.fillColor(NAVY).fontSize(11).font('Helvetica-Bold')
      .text(esc(sch.school_name || 'School').toUpperCase(), centerX, y + 4, { width: centerW, align: 'center' });
    const addr = formatSchoolAddress(sch);
    if (addr) {
      doc.fillColor('#64748b').fontSize(7).font('Helvetica')
        .text(addr, centerX, y + 20, { width: centerW, align: 'center' });
    }
    const contact = [sch.phone ? `Tel: ${sch.phone}` : null, sch.email].filter(Boolean).join(' · ');
    if (contact) {
      doc.fillColor('#94a3b8').fontSize(6).text(contact, centerX, y + 30, { width: centerW, align: 'center' });
    }
    doc.fillColor('#334155').fontSize(7).font('Helvetica-Bold')
      .text(`Student Progress Report — ${esc(snapshot.term)} — ${reportTypeLabel(snapshot.report_type)}`, centerX, y + 42, { width: centerW, align: 'center' });

    if (qrBuffer) {
      doc.image(qrBuffer, M + pageW - 58, y, { width: 52, height: 52 });
    }

    y += logoSize + 6;
    doc.moveTo(M, y).lineTo(M + pageW, y).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
    y += 8;

    // ── Profile (left) + summary cards (right) ──
    const boxH = 34;
    const statsGap = 4;
    const profileBottom = y + boxH * 2 + statsGap + 4;
    const photoPath = resolveUploadFile(snapshot.photo_url);
    const photoR = 30;
    const photoCx = M + photoR + 2;
    const photoCy = y + photoR + 4;
    doc.circle(photoCx, photoCy, photoR + 2).fill('#ffffff');
    if (photoPath) {
      try {
        doc.save();
        doc.circle(photoCx, photoCy, photoR).clip();
        doc.image(photoPath, photoCx - photoR, photoCy - photoR, { width: photoR * 2, height: photoR * 2, fit: [photoR * 2, photoR * 2] });
        doc.restore();
      } catch { /* */ }
    }
    doc.circle(photoCx, photoCy, photoR).lineWidth(1.5).strokeColor('#cbd5e1').stroke();
    doc.circle(photoCx, photoCy, photoR + 2).lineWidth(0.5).strokeColor('#e2e8f0').stroke();

    const infoX = M + (photoR + 2) * 2 + 12;
    doc.fillColor(NAVY).fontSize(11).font('Helvetica-Bold').text(esc(snapshot.name), infoX, y + 2, { width: pageW * 0.38 });
    doc.fillColor('#64748b').fontSize(6.5).font('Helvetica');
    doc.text(`Admission: ${esc(snapshot.student_uid)}    Class: ${esc(snapshot.class_name)}`, infoX, y + 18);
    doc.text(`Year: ${esc(snapshot.academic_year)}    Term: ${esc(snapshot.term)}`, infoX, y + 28);

    const statsX = M + pageW * 0.46;
    const statsW = pageW * 0.54 - 4;
    const gap = statsGap;
    const boxW = (statsW - gap * 2) / 3;
    const overallRemark = snapshot.overall_grade_remark
      || gradeRemark(snapshot.overall_grade, snapshot.grading_scale);

    const row1 = [
      { label: 'Position', value: snapshot.class_position != null ? `${snapshot.class_position}/${snapshot.class_size}` : '—', sub: 'Class rank' },
      { label: isMid ? 'Mid-term average' : 'Term average', value: snapshot.overall_average != null ? `${snapshot.overall_average}%` : '—' },
      { label: 'Grade', value: snapshot.overall_grade || '—', sub: overallRemark || null },
    ];
    const row2 = [
      { label: 'Attendance', value: snapshot.attendance_percent != null ? `${snapshot.attendance_percent}%` : '—' },
      { label: 'Health', value: snapshot.academic_health_score != null ? `${snapshot.academic_health_score}%` : '—', sub: 'Academic health' },
      { label: 'Discipline', value: formatDisciplineMarks(snapshot), sub: snapshot.discipline_marks_max != null ? `Out of ${snapshot.discipline_marks_max}` : 'Conduct marks' },
    ];

    row1.forEach((c, i) => drawStatBox(doc, statsX + i * (boxW + gap), y, boxW, boxH, c.label, c.value, c.sub));
    row2.forEach((c, i) => drawStatBox(doc, statsX + i * (boxW + gap), y + boxH + gap, boxW, boxH, c.label, c.value, c.sub));

    y = profileBottom + 6;
    doc.moveTo(M, y).lineTo(M + pageW, y).strokeColor('#f1f5f9').stroke();
    y += 6;

    // ── Subject results table (modern card style) ──
    doc.fillColor('#1e293b').fontSize(7.5).font('Helvetica-Bold').text('SUBJECT RESULTS', M, y);
    y += 9;

    const tableX = M;
    const tableW = pageW;
    const subjectW = 42;
    const colW = Math.max(14, (pageW - 10 - subjectW - 50) / Math.max(assessmentColumns.length + (isMid ? 3 : 5), 4));
    const headerH = 16;
    const tableStartY = y;

    doc.roundedRect(tableX, tableStartY, tableW, headerH + 2, 4).lineWidth(0.75).strokeColor('#e2e8f0').stroke();
    doc.rect(tableX, tableStartY, tableW, headerH).fill('#1e293b').fillOpacity(1);

    let cx = tableX + 4;
    doc.fillColor('#ffffff').fontSize(5.5).font('Helvetica-Bold');
    const fixedHeaders = ['#', 'Subject'];
    fixedHeaders.forEach((label, i) => {
      const w = i === 1 ? subjectW : 10;
      doc.text(label, cx, tableStartY + 5, { width: w, align: i === 0 ? 'left' : 'left', lineBreak: false });
      cx += w + 1;
    });

    assessmentColumns.forEach((col) => {
      const max = resolveAssessmentColumnMax(subjects, col.slug);
      doc.fillColor('#ffffff').fontSize(5.5).font('Helvetica-Bold')
        .text(col.short_label || col.slug, cx, tableStartY + 3, { width: colW, align: 'center', lineBreak: false });
      doc.fillColor('#cbd5e1').fontSize(4.8).font('Helvetica')
        .text(max != null ? `out of ${max}` : '—', cx, tableStartY + 9, { width: colW, align: 'center', lineBreak: false });
      cx += colW + 1;
    });

    const tailHeaders = [isMid ? 'Total %' : 'Mid %'];
    if (!isMid) tailHeaders.push('Final %', 'Term %');
    tailHeaders.push('Grd', 'Remarks');
    tailHeaders.forEach((label) => {
      doc.fillColor('#ffffff').fontSize(5.5).font('Helvetica-Bold')
        .text(label, cx, tableStartY + 5, { width: colW, align: 'center', lineBreak: false });
      cx += colW + 1;
    });
    y = tableStartY + headerH + 2;

    doc.font('Helvetica').fontSize(tableFont).fillColor('#334155');
    subjects.forEach((s, i) => {
      if (i % 2 === 1) {
        doc.rect(tableX, y - 1, tableW, rowH + 1).fill('#f8fafc').fillOpacity(1);
      }
      cx = tableX + 4;
      const row = [
        String(i + 1),
        s.subject_name || '—',
        ...assessmentColumns.map((c) => formatAssessmentScoreOnly(s.assessments, c.slug)),
        (isMid ? s.average : s.mid_term) != null ? `${isMid ? s.average : s.mid_term}%` : '—',
      ];
      if (!isMid) {
        row.push(s.final != null ? `${s.final}%` : '—');
        row.push(s.average != null ? `${s.average}%` : '—');
      }
      row.push(s.grade || '—', resolveSubjectRemark(s, snapshot));

      row.forEach((cell, ci) => {
        const w = ci === 1 ? subjectW : (ci === 0 ? 10 : colW);
        const isRemark = ci === row.length - 1;
        doc.fillColor(isRemark ? '#64748b' : '#334155')
          .font(ci === 1 ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(isRemark ? 5 : tableFont)
          .text(String(cell), cx, y, { width: w, align: ci <= 1 ? 'left' : 'center', lineBreak: false });
        cx += w + 1;
      });
      y += rowH;
    });

    if (subjects.length) {
      cx = M;
      const totalMid = grandTotals.overallScore != null && grandTotals.overallMax != null
        ? `${grandTotals.overallScore} / ${grandTotals.overallMax}`
        : (grandTotals.overallPercent != null ? `${grandTotals.overallPercent}%` : '—');
      const totalRow = [
        '',
        'Grand Total',
        ...assessmentColumns.map((c) => grandTotals.columnTotals[c.slug] ?? '—'),
        totalMid,
      ];
      if (!isMid) totalRow.push('—', '—');
      totalRow.push('—', grandTotals.overallPercent != null ? `${grandTotals.overallPercent}% raw` : '—');
      doc.rect(tableX, y - 1, tableW, rowH + 2).fill('#e2e8f0').fillOpacity(1);
      doc.moveTo(tableX, y - 1).lineTo(tableX + tableW, y - 1).strokeColor('#94a3b8').lineWidth(1).stroke();
      totalRow.forEach((cell, ci) => {
        const w = ci === 1 ? subjectW : (ci === 0 ? 10 : colW);
        doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(tableFont)
          .text(String(cell), cx, y, { width: w, align: ci <= 1 ? 'left' : 'center', lineBreak: false });
        cx += w + 1;
      });
      y += rowH + 4;
    }

    // ── Grading schema ──
    const bands = Array.isArray(snapshot.grading_scale) && snapshot.grading_scale.length
      ? snapshot.grading_scale : DEFAULT_BANDS;
    doc.fillColor('#334155').fontSize(6.5).font('Helvetica-Bold').text('GRADING SCHEMA', M, y);
    y += 8;
    const bandW = (pageW - 10) / Math.min(bands.length, 6);
    bands.slice(0, 6).forEach((b, i) => {
      const bx = M + i * (bandW + 2);
      doc.roundedRect(bx, y, bandW, 22, 2).lineWidth(0.5).strokeColor('#e2e8f0').stroke();
      doc.fillColor(NAVY).fontSize(6).font('Helvetica-Bold')
        .text(`${b.min_percent}–${b.max_percent} ${b.letter}`, bx + 2, y + 4, { width: bandW - 4, align: 'center' });
      doc.fillColor('#64748b').fontSize(5).font('Helvetica')
        .text(esc(b.remark), bx + 2, y + 13, { width: bandW - 4, align: 'center' });
    });
    y += 22;

    // ── Competencies ──
    const competencies = snapshot.competencies || [];
    if (competencies.length) {
      doc.fillColor('#334155').fontSize(6.5).font('Helvetica-Bold').text('COMPETENCIES', M, y);
      y += 8;
      doc.font('Helvetica').fontSize(5.5).fillColor('#475569');
      const compText = competencies.map((c) => `${c.name}: ${c.rating}`).join('   ·   ');
      doc.text(compText, M, y, { width: pageW });
      y += 12;
    }

    // ── Trend + strengths (compact, single page) ──
    const half = (pageW - 6) / 2;
    const panelH = 52;
    if (y + panelH + 50 < pageBottom) {
      doc.fillColor('#334155').fontSize(6).font('Helvetica-Bold').text('PERFORMANCE TRENDS', M, y);
      const trend = snapshot.performance_trend || [];
      drawMiniTrendChart(doc, M, y + 8, half - 4, panelH - 8, trend);

      doc.fillColor('#334155').fontSize(6).font('Helvetica-Bold').text('STRENGTHS', M + half + 6, y);
      (snapshot.strong_subjects || []).slice(0, 3).forEach((s, i) => {
        doc.fillColor('#475569').font('Helvetica').fontSize(5.5).text(`• ${s}`, M + half + 10, y + 10 + i * 8);
      });
      y += panelH;
    }

    // ── Signatures (compact, no card boxes) ──
    if (y + 36 < pageBottom) {
      const sigPath = resolveUploadFile(sch.head_signature_url);
      const stampPath = resolveUploadFile(sch.school_stamp_url);
      doc.fillColor('#94a3b8').fontSize(5.5).font('Helvetica-Bold').text('CLASS TEACHER', M, y);
      doc.fillColor(NAVY).fontSize(7).font('Helvetica-Bold').text(esc(snapshot.class_teacher_name), M, y + 9);
      doc.moveTo(M, y + 28).lineTo(M + half - 12, y + 28).strokeColor('#64748b').lineWidth(0.75).stroke();
      doc.fillColor('#94a3b8').fontSize(5).font('Helvetica').text('Signature', M, y + 30);

      doc.fillColor('#94a3b8').fontSize(5.5).font('Helvetica-Bold').text('SCHOOL MANAGER', M + half + 6, y);
      doc.fillColor(NAVY).fontSize(7).font('Helvetica-Bold')
        .text(esc(sch.head_teacher_name || sch.deputy_head_name), M + half + 6, y + 9);
      if (sigPath) {
        try { doc.image(sigPath, M + half + 6, y + 16, { height: 12, fit: [90, 12] }); } catch { /* */ }
      }
      doc.moveTo(M + half + 6, y + 28).lineTo(M + pageW - (stampPath ? 40 : 8), y + 28).strokeColor('#64748b').lineWidth(0.75).stroke();
      doc.fillColor('#94a3b8').fontSize(5).font('Helvetica').text('Signature', M + half + 6, y + 30);
      if (stampPath) {
        try { doc.image(stampPath, M + pageW - 32, y + 8, { width: 26, height: 26, fit: [26, 26] }); } catch { /* */ }
      }
    }

    doc.fillColor('#94a3b8').fontSize(5.5).font('Helvetica')
      .text('Generated by Babyeyi Academic Reporting System', M, pageBottom - 8, { width: pageW, align: 'center' });

    doc.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
}

module.exports = { generateModernSnapshotPdf };
