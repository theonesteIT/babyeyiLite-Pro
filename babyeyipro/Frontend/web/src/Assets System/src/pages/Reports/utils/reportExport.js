import * as XLSX from 'xlsx';

function cellExportValue(row, col) {
  const val = row[col.field];
  if (val == null || val === '') return '';
  if (col.money && typeof val === 'number') return val;
  return val;
}

export async function exportReportExcel({ title, columns, rows, filename }) {
  const cols = columns || [];
  const headerLabels = cols.map((c) => (typeof c === 'object' ? c.label : c));
  const data = (rows || []).map((row) => cols.map((col) => {
    if (typeof col !== 'object') return row[col] ?? '';
    if (col.exportValue) return col.exportValue(row);
    return cellExportValue(row, col);
  }));
  const ws = XLSX.utils.aoa_to_sheet([headerLabels, ...data]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Report');
  const stamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `${filename || title || 'asset-report'}-${stamp}.xlsx`);
}

export async function exportReportPdf({ title, subtitle, columns, rows, filename }) {
  const { jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const NAVY = [0, 4, 53];
  const GOLD = [255, 179, 0];

  doc.setFillColor(...NAVY);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 56, 'F');
  doc.setTextColor(...GOLD);
  doc.setFontSize(14);
  doc.text(String(title || 'Asset Report'), 40, 34);
  if (subtitle) {
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.text(String(subtitle), 40, 48);
  }

  const head = [(columns || []).map((c) => (typeof c === 'object' ? c.label : c))];
  const body = (rows || []).map((row) => (columns || []).map((col) => {
    if (typeof col !== 'object') {
      const val = row[col];
      return val == null ? '—' : String(val);
    }
    let val;
    if (col.exportValue) val = col.exportValue(row);
    else val = cellExportValue(row, col);
    if (val == null || val === '') return '—';
    if (typeof val === 'number') return val.toLocaleString();
    return String(val);
  }));

  autoTable(doc, {
    startY: 68,
    head,
    body,
    styles: { fontSize: 7, cellPadding: 3, overflow: 'linebreak' },
    headStyles: { fillColor: NAVY, textColor: GOLD, fontSize: 7 },
    alternateRowStyles: { fillColor: [248, 249, 252] },
    columnStyles: body[0]?.length > 10 ? { 0: { cellWidth: 22 } } : {},
  });

  const stamp = new Date().toISOString().slice(0, 10);
  doc.save(`${filename || 'asset-report'}-${stamp}.pdf`);
}

export function exportReportCsv({ columns, rows, filename }) {
  const headerLabels = (columns || []).map((c) => (typeof c === 'object' ? c.label : c));
  const escape = (v) => {
    const s = v == null ? '' : String(v);
    return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [
    headerLabels.map(escape).join(','),
    ...(rows || []).map((row) => (columns || []).map((col) => {
      if (typeof col !== 'object') return escape(row[col]);
      const val = col.exportValue ? col.exportValue(row) : cellExportValue(row, col);
      return escape(val);
    }).join(',')),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename || 'report'}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function printReportTable(tableId) {
  const el = document.getElementById(tableId);
  if (!el) {
    window.print();
    return;
  }
  const w = window.open('', '_blank');
  w.document.write(`<html><head><title>Print Report</title>
    <style>body{font-family:Montserrat,sans-serif;padding:24px}table{width:100%;border-collapse:collapse;font-size:11px}
    th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#000435;color:#FFB300}</style></head><body>`);
  w.document.write(el.outerHTML);
  w.document.write('</body></html>');
  w.document.close();
  w.focus();
  w.print();
}
