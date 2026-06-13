import * as XLSX from 'xlsx'

export const NAVY = [0, 4, 53]
export const AMBER = [254, 191, 16]

export function formatExportDate(d) {
  if (!d) return '—'
  return String(d).slice(0, 10)
}

export function stamp() {
  return new Date().toISOString().slice(0, 10)
}

export function fmtRwf(n) {
  return `${(Number(n) || 0).toLocaleString()} RWF`
}

export function metaRows(title, extra = [], orgName = '') {
  const rows = [
    [title],
    [`Exported: ${new Date().toLocaleString()}`],
  ]
  if (orgName) rows.push([`School / Store: ${orgName}`])
  extra.filter(Boolean).forEach((line) => rows.push([line]))
  rows.push([])
  return rows
}

export function downloadWorkbook(wb, filename) {
  XLSX.writeFile(wb, filename)
}

export function pdfHeader(doc, title, subtitle = '', landscape = false) {
  const w = landscape ? 297 : 210
  doc.setFillColor(...NAVY)
  doc.rect(0, 0, w, 32, 'F')
  doc.setFillColor(...AMBER)
  doc.rect(0, 32, w, 2, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(landscape ? 14 : 15)
  doc.text(title, 14, 14)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(subtitle || `Exported ${new Date().toLocaleString()}`, 14, 23)
  return 38
}
