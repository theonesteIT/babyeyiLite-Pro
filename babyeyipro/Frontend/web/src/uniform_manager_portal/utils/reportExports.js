import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { exportCSV } from '../../storekeeper_portal/frontend/src/components/reports/StoreReportPrimitives'
import { mergeSchoolPdfMeta } from '../../storekeeper_portal/frontend/src/utils/schoolPdfBranding'
import {
  NAVY,
  AMBER,
  SLATE,
  pdfHeader,
  pdfKpiStrip,
  pdfTable,
  pdfSectionTitle,
  reportRef,
  savePdf,
  metaRows,
  downloadWorkbook,
} from '../../storekeeper_portal/frontend/src/utils/storeReportExportCommon'

const PORTAL_META = {
  portalLabel: 'Uniform Manager Portal',
  footerLeft: 'Babyeyi · Uniform Inventory Management',
}

function slugify(title) {
  return (title || 'report').replace(/\s+/g, '-').toLowerCase()
}

function buildSubtitle({ periodLabel, generatedBy, branding }) {
  return [
    'Uniform Inventory Management Report',
    periodLabel ? `Period: ${periodLabel}` : '',
    generatedBy ? `Prepared by: ${generatedBy}` : '',
    [branding?.location, branding?.phone, branding?.email].filter(Boolean).join(' · '),
  ].filter(Boolean).join(' · ')
}

function pdfSignatureBlock(doc, startY, landscape = false) {
  const w = doc.internal.pageSize.getWidth()
  const h = doc.internal.pageSize.getHeight()
  let y = startY + 6
  if (y > h - 42) {
    doc.addPage()
    y = 20
  }

  y = pdfSectionTitle(doc, 'Authorization', y)
  const colW = (w - 28) / 3
  const labels = ['Prepared By', 'Approved By', 'Signature']
  labels.forEach((label, i) => {
    const x = 14 + i * colW
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(...SLATE)
    doc.text(label.toUpperCase(), x, y)
    doc.setDrawColor(...NAVY)
    doc.setLineWidth(0.3)
    doc.line(x, y + 14, x + colW - 6, y + 14)
  })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...SLATE)
  doc.text(`Generated on ${new Date().toLocaleString()}`, w / 2, y + 24, { align: 'center' })
  return y + 28
}

export async function exportReportExcel({
  title,
  schoolName,
  periodLabel,
  columns,
  rows,
  generatedBy,
  kpis = [],
}) {
  const branding = await mergeSchoolPdfMeta({ orgName: schoolName })
  const org = branding.orgName || schoolName || 'School'
  const ref = reportRef('UMR')

  const headerBlock = metaRows(
    title || 'Uniform Report',
    [
      periodLabel ? `Period: ${periodLabel}` : '',
      generatedBy ? `Prepared by: ${generatedBy}` : '',
      branding.location ? `Location: ${branding.location}` : '',
      [branding.phone, branding.email].filter(Boolean).join(' · '),
      `Reference: ${ref}`,
    ],
    org
  )

  const kpiBlock = kpis.length
    ? [
        [],
        ['Summary'],
        ...kpis.slice(0, 6).map((k) => [k.label, String(k.value ?? '')]),
      ]
    : []

  const data = [
    ...headerBlock,
    ...kpiBlock,
    columns.map((c) => c.label),
    ...rows.map((row) => columns.map((c) => row[c.key] ?? '')),
  ]

  const ws = XLSX.utils.aoa_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Report')

  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
  for (let c = range.s.c; c <= range.e.c; c += 1) {
    const addr = XLSX.utils.encode_cell({ r: 0, c })
    if (ws[addr]) ws[addr].s = { font: { bold: true, sz: 14 } }
  }

  downloadWorkbook(wb, `${slugify(title)}.xlsx`)
}

export function exportReportCsv({ title, columns, rows }) {
  exportCSV(
    columns.map((c) => c.label),
    rows.map((row) => columns.map((c) => row[c.key] ?? '')),
    `${slugify(title)}.csv`
  )
}

export async function exportReportPdf({
  title,
  schoolName,
  periodLabel,
  columns,
  rows,
  generatedBy,
  kpis = [],
}) {
  const branding = await mergeSchoolPdfMeta({ orgName: schoolName })
  const landscape = columns.length > 6
  const doc = new jsPDF({ orientation: landscape ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' })
  const meta = {
    ...branding,
    ...PORTAL_META,
    ref: reportRef('UMR'),
    orgName: branding.orgName || schoolName || 'School',
  }

  const subtitle = buildSubtitle({ periodLabel, generatedBy, branding: meta })
  let y = pdfHeader(doc, title || 'Uniform Report', subtitle, landscape, meta)

  if (kpis.length) {
    y = pdfKpiStrip(doc, kpis, y, landscape)
    y += 2
  }

  if (columns.length && rows.length) {
    y = pdfTable(doc, autoTable, {
      startY: y,
      head: [columns.map((c) => c.label)],
      body: rows.map((row) => columns.map((c) => String(row[c.key] ?? ''))),
      columnStyles: columns.reduce((acc, col, idx) => {
        if (col.align === 'right') acc[idx] = { halign: 'right' }
        return acc
      }, {}),
    })
    y = (doc.lastAutoTable?.finalY ?? y) + 6
  } else if (!kpis.length) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...SLATE)
    doc.text('No tabular data for the selected filters.', 14, y + 4)
    y += 12
  }

  pdfSignatureBlock(doc, y, landscape)
  savePdf(doc, `${slugify(title)}.pdf`)
}

export async function printReportSection(elementId, title, { schoolName, periodLabel, generatedBy } = {}) {
  const el = document.getElementById(elementId)
  if (!el) return

  const branding = await mergeSchoolPdfMeta({ orgName: schoolName }).catch(() => ({}))
  const org = branding.orgName || schoolName || 'School'
  const logoHtml = branding.logoDataUrl
    ? `<img src="${branding.logoDataUrl}" alt="" style="width:56px;height:56px;object-fit:contain;border-radius:8px;background:#fff;padding:4px" />`
    : `<div style="width:56px;height:56px;border-radius:8px;background:#FEBF10;display:flex;align-items:center;justify-content:center;font-weight:700;color:#000435">B</div>`

  const win = window.open('', '_blank')
  win.document.write(`<!DOCTYPE html><html><head><title>${title}</title><style>
    @page { margin: 16mm; }
    body{font-family:Montserrat,Segoe UI,sans-serif;padding:0;color:#000435;font-size:12px}
    .brand{display:flex;align-items:center;gap:16px;padding:18px 20px;background:linear-gradient(135deg,#000435 0%,#0a1654 100%);color:#fff;border-radius:12px;margin-bottom:20px}
    .brand h1{font-size:16px;margin:0;text-transform:uppercase;letter-spacing:.04em}
    .brand h2{font-size:12px;margin:4px 0 0;font-weight:600;color:#FEBF10}
    .brand p{font-size:10px;margin:4px 0 0;color:rgba(255,255,255,.75)}
    .meta{display:flex;flex-wrap:wrap;gap:12px;margin-bottom:16px;font-size:11px;color:#64748b}
    .meta span{background:#f8fafc;border:1px solid #e2e8f0;padding:6px 10px;border-radius:8px}
    table{width:100%;border-collapse:collapse;margin-top:8px}
    th,td{padding:8px 10px;text-align:left;border:1px solid #e5e7eb}
    th{background:#000435;color:#FEBF10;font-size:10px;text-transform:uppercase;letter-spacing:.05em}
    tr:nth-child(even) td{background:#f8fafc}
    .footer{margin-top:32px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:24px;font-size:11px}
    .sig label{font-size:9px;text-transform:uppercase;color:#94a3b8;display:block;margin-bottom:28px}
    .sig div{border-top:1px solid #000;padding-top:6px}
  </style></head><body>
    <div class="brand">
      ${logoHtml}
      <div>
        <h1>${org}</h1>
        <h2>${title || 'Uniform Report'}</h2>
        <p>Uniform Manager Portal · ${periodLabel || ''}${generatedBy ? ` · ${generatedBy}` : ''}</p>
        ${[branding.location, branding.phone, branding.email].filter(Boolean).length ? `<p>${[branding.location, branding.phone, branding.email].filter(Boolean).join(' · ')}</p>` : ''}
      </div>
    </div>
    <div class="meta">
      ${periodLabel ? `<span>Period: ${periodLabel}</span>` : ''}
      <span>Printed: ${new Date().toLocaleString()}</span>
    </div>
    ${el.innerHTML}
    <div class="footer">
      <div class="sig"><label>Prepared By</label><div></div></div>
      <div class="sig"><label>Approved By</label><div></div></div>
      <div class="sig"><label>Signature</label><div></div></div>
    </div>
  </body></html>`)
  win.document.close()
  win.focus()
  setTimeout(() => win.print(), 400)
}
