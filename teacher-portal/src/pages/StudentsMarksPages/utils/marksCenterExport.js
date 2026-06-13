import * as XLSX from 'xlsx';

function cellDisplay(mark) {
  if (!mark) return '';
  if (mark.mark_code) return mark.mark_code;
  if (mark.value != null) return mark.value;
  return '';
}

function buildGradebookRows(data) {
  const columns = data?.assessment_columns || [];
  const students = data?.students || [];
  const header = ['Student', 'Student ID', ...columns.map((c) => c.short_label || c.assessment_name), 'Average %', 'Grade', 'Position'];
  const rows = students.map((row) => [
    row.name,
    row.student_uid || '',
    ...columns.map((c) => cellDisplay(row.marks?.[c.id])),
    row.average_percent != null ? row.average_percent : '',
    row.grade || '',
    row.position ?? '',
  ]);
  return { header, rows };
}

function fileSlug(filters = {}) {
  const parts = [filters.className, filters.course, filters.term].filter(Boolean);
  return (parts.join('-') || 'gradebook').replace(/[^\w-]+/g, '_').slice(0, 80);
}

export function exportMarksCenterExcel(data, filters = {}) {
  const { header, rows } = buildGradebookRows(data);
  const meta = [
    ['Marks Center Export'],
    ['Class', filters.className || data?.selected?.class_name || ''],
    ['Course', filters.course || data?.selected?.subject_name || ''],
    ['Academic year', filters.academicYear || data?.selected?.academic_year || ''],
    ['Term', filters.term || data?.selected?.term || ''],
    ['Exported', new Date().toLocaleString()],
    [],
  ];
  const sheet = XLSX.utils.aoa_to_sheet([...meta, header, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, 'Gradebook');

  const categories = data?.category_averages || [];
  if (categories.length) {
    const catSheet = XLSX.utils.aoa_to_sheet([
      ['Category', 'Weight %', 'Class average %'],
      ...categories.map((c) => [c.name, c.weight_percent, c.average_percent ?? '']),
    ]);
    XLSX.utils.book_append_sheet(wb, catSheet, 'Categories');
  }

  XLSX.writeFile(wb, `marks-center-${fileSlug(filters)}.xlsx`);
}

export async function exportMarksCenterPdf(data, filters = {}) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const margin = 12;
  let y = margin;

  const title = 'Marks Center — Gradebook';
  const sub = [
    filters.className || data?.selected?.class_name,
    filters.course || data?.selected?.subject_name,
    [filters.academicYear || data?.selected?.academic_year, filters.term || data?.selected?.term].filter(Boolean).join(' · '),
  ].filter(Boolean).join(' · ');

  doc.setFillColor(0, 4, 53);
  doc.rect(0, 0, W, 22, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(title, margin, 10);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(sub || 'Assigned classes', margin, 17);

  y = 30;
  doc.setTextColor(0, 4, 53);
  const kpis = data?.kpis || {};
  const kpiLine = [
    `Students: ${kpis.total_students ?? '—'}`,
    `Avg: ${kpis.average_percent != null ? `${kpis.average_percent}%` : '—'}`,
    `Pass: ${kpis.pass_rate != null ? `${kpis.pass_rate}%` : '—'}`,
  ].join('   |   ');
  doc.setFontSize(8);
  doc.text(kpiLine, margin, y);
  y += 8;

  const { header, rows } = buildGradebookRows(data);
  const colCount = header.length;
  const usable = W - margin * 2;
  const colW = usable / colCount;
  const rowH = 6;
  const fontSize = colCount > 10 ? 6 : 7;

  const drawRow = (cells, isHeader = false) => {
    if (y > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage();
      y = margin;
    }
    if (isHeader) {
      doc.setFillColor(244, 245, 248);
      doc.rect(margin, y - 4, usable, rowH, 'F');
      doc.setFont('helvetica', 'bold');
    } else {
      doc.setFont('helvetica', 'normal');
    }
    doc.setFontSize(fontSize);
    cells.forEach((cell, i) => {
      const text = String(cell ?? '').slice(0, 14);
      doc.text(text, margin + i * colW + 1, y);
    });
    y += rowH;
  };

  drawRow(header, true);
  rows.forEach((row) => drawRow(row));

  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text(`Generated ${new Date().toLocaleString()}`, margin, doc.internal.pageSize.getHeight() - 6);

  doc.save(`marks-center-${fileSlug(filters)}.pdf`);
}
