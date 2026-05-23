import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const NAVY = [0, 4, 53];
const GOLD = [254, 191, 16];

function slugPart(value) {
  return String(value || 'all')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'all';
}

function fileStamp() {
  return new Date().toISOString().slice(0, 10);
}

/** Flat rows for PDF table body and Excel data sheet */
export function buildHrStaffExportRows(staffList = []) {
  return staffList.map((s, index) => ({
    '#': index + 1,
    'Staff ID': s.staffId || s.id || '—',
    'Full Name': s.name || '—',
    Role: s.role || '—',
    Department: s.department || '—',
    Phone: s.phone && s.phone !== 'N/A' ? s.phone : '—',
    Email: s.email || '—',
    Status: s.status === 'Inactive' ? 'Inactive' : s.employmentStatus || s.status || 'Active',
    'Shule Avance': s.allowAdvance ? 'Enabled' : 'Off',
    'Reliability %': s.reliabilityPct != null ? `${s.reliabilityPct}%` : '—',
    'Performance': s.performanceOutOf100 != null ? `${s.performanceOutOf100}/100` : '—',
    'Joined': s.joinedDate || '—',
  }));
}

const TABLE_HEADERS = [
  '#',
  'Staff ID',
  'Full Name',
  'Role',
  'Department',
  'Phone',
  'Email',
  'Status',
  'Shule Avance',
  'Reliability %',
  'Performance',
  'Joined',
];

function buildFilename(schoolName, term, department, ext) {
  const school = slugPart(schoolName).slice(0, 24);
  const termPart = slugPart(term);
  const deptPart = slugPart(department);
  return `hr-personnel-${school}-${termPart}-${deptPart}-${fileStamp()}.${ext}`;
}

function pdfSubtitle({ schoolName, term, department, stats, recordCount }) {
  const parts = [
    schoolName || 'School',
    term ? `Term: ${term}` : null,
    department ? `Filter: ${department}` : null,
    stats?.totalStaff != null ? `Total staff: ${stats.totalStaff}` : null,
    `Exported records: ${recordCount}`,
    `Generated ${new Date().toLocaleString()}`,
  ].filter(Boolean);
  return parts.join(' · ');
}

/**
 * @param {{ schoolName?: string, term?: string, department?: string, stats?: object, rows: object[] }} opts
 */
export function exportHrStaffPdf({ schoolName = '', term = '', department = 'All Departments', stats = {}, rows = [] }) {
  if (!rows.length) {
    throw new Error('No staff records to export. Adjust filters or add personnel first.');
  }

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;

  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageWidth, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('HR Central — Personnel Roster', margin, 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...GOLD);
  doc.text(schoolName || 'School personnel report', margin, 19);

  doc.setTextColor(80, 90, 110);
  doc.setFontSize(8);
  const subtitle = pdfSubtitle({ schoolName, term, department, stats, recordCount: rows.length });
  const subtitleLines = doc.splitTextToSize(subtitle, pageWidth - margin * 2);
  doc.text(subtitleLines, margin, 34);

  const body = rows.map((row) => TABLE_HEADERS.map((h) => String(row[h] ?? '—')));

  autoTable(doc, {
    startY: 40 + (subtitleLines.length - 1) * 4,
    head: [TABLE_HEADERS],
    body,
    theme: 'striped',
    styles: { fontSize: 7, cellPadding: 2.2, overflow: 'linebreak', minCellHeight: 6 },
    headStyles: {
      fillColor: NAVY,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7,
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 8 },
      1: { cellWidth: 18 },
      2: { cellWidth: 28 },
      5: { cellWidth: 22 },
      6: { cellWidth: 32 },
    },
    margin: { left: margin, right: margin },
    didDrawPage: (data) => {
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(7);
      doc.setTextColor(120, 130, 150);
      doc.text(
        `Page ${data.pageNumber} of ${pageCount}`,
        pageWidth - margin,
        doc.internal.pageSize.getHeight() - 6,
        { align: 'right' }
      );
    },
  });

  doc.save(buildFilename(schoolName, term, department, 'pdf'));
}

/**
 * @param {{ schoolName?: string, term?: string, department?: string, rows: object[] }} opts
 */
export function exportHrStaffExcel({ schoolName = '', term = '', department = 'All Departments', rows = [] }) {
  if (!rows.length) {
    throw new Error('No staff records to export. Adjust filters or add personnel first.');
  }

  const meta = [
    ['HR Central — Personnel Roster'],
    ['School', schoolName || '—'],
    ['Academic term', term || '—'],
    ['Department filter', department || 'All Departments'],
    ['Generated', new Date().toLocaleString()],
    ['Record count', rows.length],
    [],
    TABLE_HEADERS,
    ...rows.map((row) => TABLE_HEADERS.map((h) => row[h] ?? '—')),
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(meta);
  worksheet['!cols'] = [
    { wch: 6 },
    { wch: 14 },
    { wch: 26 },
    { wch: 18 },
    { wch: 16 },
    { wch: 14 },
    { wch: 28 },
    { wch: 12 },
    { wch: 14 },
    { wch: 12 },
    { wch: 14 },
    { wch: 12 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Personnel');
  XLSX.writeFile(workbook, buildFilename(schoolName, term, department, 'xlsx'));
}
