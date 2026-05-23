import { jsPDF } from 'jspdf';
import { prepareCertificateImageAssets } from './certificateAssetLoader';

const NAVY = [0, 4, 53];
const GOLD = [231, 166, 26];
const CREAM = [253, 251, 247];
const GRAY = [85, 85, 85];

function drawCornerDecor(doc, W, H) {
  doc.setFillColor(...NAVY);
  doc.triangle(0, 0, 52, 0, 0, 36, 'F');
  doc.triangle(W, H, W - 52, H, W, H - 36, 'F');
  doc.setFillColor(...GOLD);
  doc.triangle(0, 0, 44, 0, 0, 30, 'F');
  doc.triangle(W, H, W - 44, H, W, H - 30, 'F');
}

function formatClassLabel(className) {
  const raw = String(className || '').trim();
  if (!raw) return '';
  return /^class of/i.test(raw) ? raw : `Class of ${raw}`;
}

/**
 * @param {import('jspdf').jsPDF} doc
 * @param {object} opts
 */
function drawCertificatePage(doc, opts) {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const name = String(opts.studentName || 'Student').trim();
  const school = String(opts.schoolName || 'School').trim();
  const year = String(opts.academicYear || '').trim();
  const classLabel = formatClassLabel(opts.className);
  const subtitle =
    opts.subtitle ||
    'This certifies successful completion of the academic programme and is proudly presented to';
  const issued =
    opts.issuedDate ||
    new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  doc.setFillColor(...CREAM);
  doc.rect(0, 0, W, H, 'F');

  doc.setDrawColor(...GOLD);
  doc.setLineWidth(1.2);
  doc.roundedRect(6, 6, W - 12, H - 12, 3, 3, 'S');
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.5);
  doc.roundedRect(9, 9, W - 18, H - 18, 2.5, 2.5, 'S');

  drawCornerDecor(doc, W, H);

  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('BABYEYI', W / 2, 28, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(68, 68, 68);
  doc.text(school.toUpperCase(), W / 2, 35, { align: 'center' });

  doc.setFont('times', 'bold');
  doc.setFontSize(34);
  doc.setTextColor(...NAVY);
  doc.text('Certificate', W / 2, 52, { align: 'center' });
  doc.setFontSize(17);
  doc.setTextColor(...GOLD);
  doc.text('OF GRADUATION', W / 2, 61, { align: 'center' });

  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.7);
  doc.line(55, 64, W - 55, 64);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...GRAY);
  const subLines = doc.splitTextToSize(subtitle, W - 50);
  doc.text(subLines, W / 2, 72, { align: 'center' });

  const nameY = 78 + subLines.length * 4.5;
  doc.setFont('times', 'italic');
  doc.setFontSize(30);
  doc.setTextColor(...NAVY);
  const nameLines = doc.splitTextToSize(name, W - 44);
  doc.text(nameLines, W / 2, nameY + 14, { align: 'center' });

  const classY = nameY + 14 + nameLines.length * 11;
  if (classLabel) {
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.35);
    doc.line(48, classY, 88, classY);
    doc.line(W - 88, classY, W - 48, classY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...NAVY);
    doc.text(classLabel, W / 2, classY + 6, { align: 'center' });
  }

  const badgeY = classY + (classLabel ? 14 : 6);
  if (year) {
    const badgeW = Math.min(88, W - 40);
    const badgeX = (W - badgeW) / 2;
    doc.setFillColor(...GOLD);
    doc.roundedRect(badgeX, badgeY, badgeW, 11, 5.5, 5.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...NAVY);
    doc.text(`Academic Year ${year}`, W / 2, badgeY + 7.5, { align: 'center' });
  }

  const sigCx = W / 2;
  const sigLineY = H - 48;

  if (opts.signatureDataUrl) {
    try {
      doc.addImage(opts.signatureDataUrl, 'PNG', sigCx - 30, sigLineY - 18, 60, 14);
    } catch {
      /* line only */
    }
  }

  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.35);
  doc.line(sigCx - 38, sigLineY + 2, sigCx + 38, sigLineY + 2);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...NAVY);
  const headTitle = opts.headTeacherTitle || 'Head Teacher';
  const headName = opts.headTeacherName ? String(opts.headTeacherName).trim() : '';
  const labelY = sigLineY + 8;
  doc.text(headTitle, sigCx, labelY, { align: 'center' });
  if (headName) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.text(headName, sigCx, labelY + 4.5, { align: 'center' });
  }
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(102, 102, 102);
  doc.text(school, sigCx, labelY + (headName ? 9 : 4.5), { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...NAVY);
  doc.text(`Issued on ${issued}`, W / 2, H - 12, { align: 'center' });
}

function buildCertOpts(baseOpts, imageAssets) {
  return {
    ...baseOpts,
    signatureDataUrl: imageAssets?.signatureDataUrl || null,
    schoolName: baseOpts.schoolName || baseOpts.branding?.school_name || 'School',
    headTeacherName:
      baseOpts.headTeacherName || baseOpts.branding?.head_teacher_name || '',
    headTeacherTitle: baseOpts.headTeacherTitle || 'Head Teacher',
  };
}

export async function generateGraduationCertificatePdf(opts) {
  const imageAssets =
    opts.imageAssets ||
    (opts.branding ? await prepareCertificateImageAssets(opts.branding) : await prepareCertificateImageAssets({}));
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  drawCertificatePage(doc, buildCertOpts(opts, imageAssets));
  const slug = String(opts.studentName || 'student')
    .replace(/[^a-z0-9]+/gi, '-')
    .slice(0, 40);
  const filename = `graduation-certificate-${slug}-${opts.academicYear || 'school'}.pdf`;
  return { doc, filename };
}

export async function downloadGraduationCertificate(opts) {
  const { doc, filename } = await generateGraduationCertificatePdf(opts);
  doc.save(filename);
  return filename;
}

export async function downloadGraduationCertificatesBatch({
  schoolName,
  academicYear,
  students = [],
  settings = {},
  branding = null,
  imageAssets: preloadedAssets = null,
}) {
  if (!students.length) throw new Error('Select at least one graduate.');
  const imageAssets =
    preloadedAssets || (branding ? await prepareCertificateImageAssets(branding) : await prepareCertificateImageAssets({}));

  const merged = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const shared = {
    schoolName: schoolName || branding?.school_name,
    academicYear,
    subtitle: settings.certificate_subtitle,
    branding,
    imageAssets,
    headTeacherName: branding?.head_teacher_name,
    headTeacherTitle: settings.certificate_signatory || 'Head Teacher',
  };

  students.forEach((s, i) => {
    if (i > 0) merged.addPage();
    drawCertificatePage(
      merged,
      buildCertOpts(
        {
          ...shared,
          studentName: s.name,
          className: s.class_name || `${s.class || ''} ${s.stream || ''}`.trim(),
        },
        imageAssets
      )
    );
  });
  const filename = `graduation-certificates-${students.length}-students.pdf`;
  merged.save(filename);
  return filename;
}
