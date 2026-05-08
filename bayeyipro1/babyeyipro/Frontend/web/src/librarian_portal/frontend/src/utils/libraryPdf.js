import { jsPDF } from 'jspdf';

/**
 * Landscape A4 table PDF matching librarian portal styling.
 * @param {object} opts
 * @param {string} opts.title
 * @param {string} [opts.subtitle]
 * @param {{ key: string, label: string, w: number, format?: (row: object) => string }[]} opts.columns
 * @param {object[]} opts.rows
 * @param {string} [opts.fileName]
 */
export function exportLibraryReportPdf({ title, subtitle, columns, rows, fileName }) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  doc.setFillColor(30, 58, 95);
  doc.rect(0, 0, W, 56, 'F');
  doc.setFillColor(254, 191, 16);
  doc.rect(0, 53, W, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(title, 40, 36);
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(subtitle || '', 40, 72);

  let y = 96;
  let x = 40;
  doc.setFillColor(241, 245, 249);
  doc.rect(40, y - 12, W - 80, 20, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  columns.forEach((c) => {
    doc.text(c.label, x, y);
    x += c.w;
  });
  y += 18;
  doc.setFont('helvetica', 'normal');

  const cell = (row, col) => {
    if (col.format) return col.format(row);
    const v = row[col.key];
    return v == null ? '' : String(v);
  };

  rows.forEach((row) => {
    if (y > 520) {
      doc.addPage();
      y = 40;
    }
    x = 40;
    columns.forEach((c) => {
      doc.text(cell(row, c).substring(0, 32), x, y);
      x += c.w;
    });
    y += 15;
  });

  doc.save(fileName || 'library-report.pdf');
}
