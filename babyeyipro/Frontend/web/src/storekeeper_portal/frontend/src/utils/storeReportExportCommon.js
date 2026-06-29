import * as XLSX from 'xlsx'

/** Babyeyi storekeeper brand colors (RGB) */
export const NAVY = [0, 4, 53]
export const AMBER = [254, 191, 16]
export const SLATE = [100, 116, 139]
export const ROW_ALT = [248, 250, 252]
export const ROW_WARM = [255, 251, 235]

export const PDF_TABLE_THEME = {
  styles: {
    fontSize: 8.5,
    textColor: NAVY,
    cellPadding: 2.8,
    lineColor: [226, 232, 240],
    lineWidth: 0.2,
  },
  headStyles: {
    fillColor: NAVY,
    textColor: AMBER,
    fontStyle: 'bold',
    fontSize: 8,
  },
  alternateRowStyles: { fillColor: ROW_ALT },
  theme: 'grid',
  margin: { left: 14, right: 14 },
}

export function formatExportDate(d) {
  if (!d) return '—'
  return String(d).slice(0, 10)
}

export function stamp() {
  return new Date().toISOString().slice(0, 10)
}

export function fmtRwf(n) {
  return `RWF ${(Number(n) || 0).toLocaleString()}`
}

export function reportRef(prefix = 'STR') {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${prefix}-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`
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

/**
 * Modern PDF header — navy band, amber rule, school logo left when available.
 * Pass meta.logoDataUrl from mergeSchoolPdfMeta() / loadSchoolPdfBranding().
 * @returns {number} Y position to start body content
 */
export function pdfHeader(doc, title, subtitle = '', landscape = false, meta = {}) {
  const w = landscape ? 297 : 210
  const hasLogo = !!meta.logoDataUrl
  const h = landscape ? (hasLogo ? 40 : 36) : (hasLogo ? 42 : 38)
  const ref = meta.ref || reportRef()
  const margin = 14
  let textX = margin

  doc.setFillColor(...NAVY)
  doc.rect(0, 0, w, h, 'F')
  doc.setFillColor(...AMBER)
  doc.rect(0, h, w, 1.8, 'F')

  if (hasLogo) {
    const logoSize = landscape ? 24 : 26
    const logoY = landscape ? 7 : 8
    try {
      doc.addImage(meta.logoDataUrl, 'PNG', margin, logoY, logoSize, logoSize)
      textX = margin + logoSize + 5
    } catch {
      try {
        doc.addImage(meta.logoDataUrl, 'JPEG', margin, logoY, logoSize, logoSize)
        textX = margin + logoSize + 5
      } catch {
        textX = margin
      }
    }
  }

  const schoolLabel = String(meta.orgName || meta.schoolName || '').trim()
  if (schoolLabel) {
    doc.setTextColor(...AMBER)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    const schoolLines = doc.splitTextToSize(schoolLabel.toUpperCase(), w - textX - 50)
    doc.text(schoolLines[0] || schoolLabel.toUpperCase(), textX, hasLogo ? 11 : 9)
  } else {
    doc.setTextColor(...AMBER)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.text('BABYEYI · STOREKEEPER PORTAL', textX, hasLogo ? 11 : 9)
  }

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(landscape ? 12 : 13)
  doc.text(title, textX, hasLogo ? 19 : (landscape ? 17 : 18))

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(220, 225, 235)
  const sub = subtitle || `Generated ${new Date().toLocaleString()}`
  const subLines = doc.splitTextToSize(sub, w - textX - 45)
  doc.text(subLines[0] || sub, textX, hasLogo ? 26 : (landscape ? 24 : 25))
  if (subLines[1]) {
    doc.text(subLines[1], textX, hasLogo ? 31 : (landscape ? 29 : 30))
  }

  if (meta.location && !subtitle) {
    doc.setFontSize(7)
    doc.text(meta.location, textX, hasLogo ? 34 : 32)
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...AMBER)
  doc.text(ref, w - margin, 9, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(200, 205, 215)
  doc.text('Babyeyi Storekeeper Portal', w - margin, hasLogo ? 18 : 16, { align: 'right' })
  doc.text('Confidential — school use only', w - margin, hasLogo ? 34 : (landscape ? 30 : 31), { align: 'right' })

  doc._storePdfMeta = { ...meta, ref }
  return h + 6
}

/** Section heading inside PDF body */
export function pdfSectionTitle(doc, text, y) {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...NAVY)
  doc.text(text, 14, y)
  return y + 5
}

/** Footer on every page — call via installPdfFooters after all content */
export function pdfFooter(doc, pageNum, pageCount, meta = {}) {
  const w = doc.internal.pageSize.getWidth()
  const h = doc.internal.pageSize.getHeight()
  const m = meta.ref || doc._storePdfMeta?.ref || ''

  doc.setDrawColor(...AMBER)
  doc.setLineWidth(0.4)
  doc.line(14, h - 12, w - 14, h - 12)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...SLATE)
  doc.text('Babyeyi School Store Management', 14, h - 7)
  doc.text(`Page ${pageNum} of ${pageCount}`, w / 2, h - 7, { align: 'center' })
  doc.text(m, w - 14, h - 7, { align: 'right' })
}

export function installPdfFooters(doc, meta = {}) {
  const total = doc.internal.getNumberOfPages()
  const merged = { ...doc._storePdfMeta, ...meta }
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    pdfFooter(doc, i, total, merged)
  }
}

/** KPI summary row (2–4 metrics) */
export function pdfKpiStrip(doc, kpis, startY, landscape = false) {
  const w = landscape ? 297 : 210
  const count = Math.min(kpis.length, 4)
  if (!count) return startY
  const gap = 4
  const boxW = (w - 28 - gap * (count - 1)) / count
  let x = 14

  kpis.slice(0, 4).forEach((k) => {
    doc.setFillColor(...ROW_WARM)
    doc.setDrawColor(254, 228, 160)
    doc.setLineWidth(0.2)
    doc.roundedRect(x, startY, boxW, 16, 2, 2, 'FD')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.5)
    doc.setTextColor(...SLATE)
    doc.text(String(k.label || '').toUpperCase(), x + 3, startY + 5)
    doc.setFontSize(9)
    doc.setTextColor(...NAVY)
    doc.text(String(k.value ?? '—'), x + 3, startY + 12)
    x += boxW + gap
  })

  return startY + 20
}

/**
 * Wrapper around jspdf-autotable with consistent Babyeyi theme.
 * Import autoTable in the caller or pass as second arg after dynamic import.
 */
export function pdfTable(doc, autoTable, options) {
  autoTable(doc, {
    ...PDF_TABLE_THEME,
    ...options,
    styles: { ...PDF_TABLE_THEME.styles, ...(options.styles || {}) },
    headStyles: { ...PDF_TABLE_THEME.headStyles, ...(options.headStyles || {}) },
    margin: { ...PDF_TABLE_THEME.margin, ...(options.margin || {}) },
  })
  return doc.lastAutoTable?.finalY ?? options.startY ?? 40
}

export function savePdf(doc, filename) {
  installPdfFooters(doc)
  doc.save(filename)
}
