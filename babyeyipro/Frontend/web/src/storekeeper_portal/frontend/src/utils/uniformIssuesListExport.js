import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  buildIssueSlotGroups,
  buildIssueSlotMatrix,
  buildSlotMatrixExportSheet,
  buildSlotMatrixPdfHead,
  buildSlotMatrixPdfBody,
  applyExcelMatrixHeaderMerges,
  matrixExcelColWidths,
} from './uniformIssueSlotGroups'
import { loadSchoolPdfBranding } from './schoolPdfBranding'
import {
  downloadWorkbook,
  metaRows,
  pdfHeader,
  pdfSectionTitle,
  savePdf,
  stamp,
  reportRef,
  NAVY,
  AMBER,
} from './storeReportExportCommon'

function formatAmount(n) {
  return (Number(n) || 0).toLocaleString()
}

function formatDate(d) {
  if (!d) return '—'
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return String(d)
  return dt.toLocaleDateString()
}

function qtyPerStudentForLine(line, studentsCount) {
  let q = Number(line.qty_per_student) || 0
  if (q <= 0 && studentsCount > 0) {
    q = Number(line.total_qty || 0) / studentsCount
  }
  return q
}

async function schoolExcelMeta(title, extra = []) {
  const branding = await loadSchoolPdfBranding()
  const contact = [branding.phone, branding.email].filter(Boolean).join(' · ')
  return metaRows(title, [
    branding.orgName ? `School: ${branding.orgName}` : '',
    branding.location ? `Location: ${branding.location}` : '',
    contact ? `Contact: ${contact}` : '',
    ...extra,
  ], branding.orgName)
}

function buildIssueMetaLines(detail, branding) {
  return [
    branding.orgName ? `School: ${branding.orgName}` : '',
    branding.location ? `Location: ${branding.location}` : '',
    [branding.phone, branding.email].filter(Boolean).join(' · '),
    `Issue No: ${detail.issue_no || '—'}`,
    `Class: ${detail.class_name || '—'} · Year: ${detail.academic_year || '—'} · Term: ${detail.term || '—'}`,
    `Issued by: ${detail.issued_by_name || '—'} · Created: ${formatDate(detail.created_at)}`,
    `Exported: ${new Date().toLocaleString()}`,
  ].filter(Boolean)
}

function matrixPdfColumnStyles(columns) {
  const styles = {
    0: { halign: 'left', cellWidth: 22 },
    1: { halign: 'left', cellWidth: 38 },
  }
  let idx = 2
  columns.forEach(() => {
    styles[idx] = { halign: 'right', cellWidth: 12 }
    styles[idx + 1] = { halign: 'right', cellWidth: 18 }
    idx += 2
  })
  styles[idx] = { halign: 'right', cellWidth: 12, fontStyle: 'bold', textColor: [180, 83, 9] }
  styles[idx + 1] = { halign: 'right', cellWidth: 18, fontStyle: 'bold' }
  return styles
}

/**
 * Export filtered uniform issue list to Excel with school header.
 */
export async function exportUniformIssuesListExcel(issues, filters = {}) {
  const filterParts = []
  if (filters.academic_year) filterParts.push(`Year: ${filters.academic_year}`)
  if (filters.class_name) filterParts.push(`Class: ${filters.class_name}`)
  if (filters.student_q) filterParts.push(`Student: ${filters.student_q}`)

  const header = [
    'Issue No',
    'Class',
    'Academic Year',
    'Term',
    'Students',
    'Total Pieces',
    'Total Amount',
    'Issued By',
    'Created',
    'Status',
  ]

  const rows = (issues || []).map((row) => [
    row.issue_no || '',
    row.class_name || '',
    row.academic_year || '',
    row.term || '',
    Number(row.students_count) || 0,
    Number(row.total_pieces) || 0,
    Number(row.total_amount) || 0,
    row.issued_by_name || '',
    formatDate(row.created_at),
    row.status || 'posted',
  ])

  const meta = await schoolExcelMeta('Uniform Distribution — Issue Register', [
    filterParts.length ? filterParts.join(' · ') : 'All records',
  ])

  const data = [
    ...meta,
    header,
    ...rows,
    [],
    [
      'Summary',
      '',
      '',
      '',
      rows.reduce((s, r) => s + (Number(r[4]) || 0), 0),
      '',
      formatAmount(rows.reduce((s, r) => s + (Number(r[6]) || 0), 0)),
      '',
      '',
      `${rows.length} issue(s)`,
    ],
  ]

  const ws = XLSX.utils.aoa_to_sheet(data)
  ws['!cols'] = [
    { wch: 16 }, { wch: 10 }, { wch: 14 }, { wch: 12 }, { wch: 10 },
    { wch: 12 }, { wch: 14 }, { wch: 22 }, { wch: 14 }, { wch: 12 },
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Uniform Issues')
  downloadWorkbook(wb, `uniform-issues-${stamp()}.xlsx`)
}

/**
 * Issue export — primary sheet matches Issue Uniform UI table exactly.
 */
export async function exportUniformIssueDetailExcel(detail) {
  if (!detail) return

  const branding = await loadSchoolPdfBranding()
  const studentsCount = Number(detail.students_count) || (detail.students || []).length || 0
  const lines = detail.lines || []
  const { groups, grandTotalQty, grandTotalAmount } = buildIssueSlotGroups(detail)
  const { columns, students } = buildIssueSlotMatrix(detail)
  const issueMeta = buildIssueMetaLines(detail, branding)

  const wb = XLSX.utils.book_new()

  if (columns.length && students.length) {
    const { data, headerStartRow } = buildSlotMatrixExportSheet(
      issueMeta,
      columns,
      students,
      grandTotalQty,
      grandTotalAmount
    )
    const wsMatrix = XLSX.utils.aoa_to_sheet(data)
    wsMatrix['!cols'] = matrixExcelColWidths(columns)
    applyExcelMatrixHeaderMerges(wsMatrix, headerStartRow, columns)
    XLSX.utils.book_append_sheet(wb, wsMatrix, 'Student Distribution')
  }

  const summaryData = [
    ['UNIFORM DISTRIBUTION REPORT'],
    ...issueMeta.map((line) => [line]),
    [],
    ['Distribution Summary'],
    ['Item', 'Qty / Student', 'Total Qty', 'Unit Price', 'Line Total'],
    ...lines.map((l) => [
      l.item_name || '',
      qtyPerStudentForLine(l, studentsCount),
      Number(l.total_qty) || 0,
      formatAmount(Number(l.unit_price) || 0),
      formatAmount(Number(l.line_total) || 0),
    ]),
    [],
    ['GRAND TOTAL', '', grandTotalQty, '', formatAmount(grandTotalAmount || Number(detail.total_amount) || 0)],
    [],
    ['Students', studentsCount],
    ['Total pieces', Number(detail.total_pieces) || 0],
    ['Total amount', formatAmount(Number(detail.total_amount) || 0)],
    ['Distribution slots', groups.length],
  ]

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData)
  wsSummary['!cols'] = [{ wch: 24 }, { wch: 16 }, { wch: 14 }, { wch: 16 }, { wch: 18 }]
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary')

  const safeNo = String(detail.issue_no || 'issue').replace(/[^\w-]+/g, '-')
  downloadWorkbook(wb, `uniform-issue-${safeNo}-${stamp()}.xlsx`)
}

/**
 * PDF — landscape student matrix identical to the Issue Uniform table.
 */
export async function exportUniformIssueDetailPdf(detail) {
  if (!detail) return

  const branding = await loadSchoolPdfBranding()
  const studentsCount = Number(detail.students_count) || (detail.students || []).length || 0
  const { grandTotalQty, grandTotalAmount } = buildIssueSlotGroups(detail)
  const { columns, students } = buildIssueSlotMatrix(detail)
  const lines = detail.lines || []

  const landscape = columns.length > 2
  const doc = new jsPDF({
    orientation: landscape ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const subtitle = [
    branding.orgName || '',
    `Issue ${detail.issue_no || '—'}`,
    `Class ${detail.class_name || '—'}`,
    `${detail.academic_year || '—'} · ${detail.term || '—'}`,
    `${studentsCount} students`,
  ].filter(Boolean).join(' · ')

  let y = pdfHeader(doc, 'Uniform Distribution Report', subtitle, landscape, {
    ref: reportRef('UIF'),
    ...branding,
  })

  if (lines.length) {
    y = pdfSectionTitle(doc, 'Distribution summary', y)
    autoTable(doc, {
      startY: y,
      head: [['Item', 'Qty / student', 'Total qty', 'Unit price', 'Line total']],
      body: lines.map((l) => [
        l.item_name || '',
        String(qtyPerStudentForLine(l, studentsCount)),
        String(Number(l.total_qty) || 0),
        formatAmount(Number(l.unit_price) || 0),
        formatAmount(Number(l.line_total) || 0),
      ]),
      styles: { fontSize: 8, textColor: NAVY },
      headStyles: { fillColor: NAVY, textColor: AMBER, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      theme: 'grid',
      margin: { left: 14, right: 14 },
    })
    y = doc.lastAutoTable.finalY + 6
  }

  if (columns.length && students.length) {
    if (lines.length && y > (landscape ? 160 : 220)) {
      doc.addPage('a4', landscape ? 'landscape' : 'portrait')
      y = 16
    }

    y = pdfSectionTitle(doc, 'Student distribution', y)

    const body = buildSlotMatrixPdfBody(students, columns, grandTotalQty, grandTotalAmount)
    const totalRowIndex = body.length - 1

    autoTable(doc, {
      startY: y,
      head: buildSlotMatrixPdfHead(columns),
      body,
      columnStyles: matrixPdfColumnStyles(columns),
      styles: {
        fontSize: 7.5,
        textColor: NAVY,
        cellPadding: 2,
        lineColor: [226, 232, 240],
        lineWidth: 0.2,
      },
      headStyles: {
        fillColor: NAVY,
        textColor: AMBER,
        fontStyle: 'bold',
        fontSize: 7,
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      theme: 'grid',
      margin: { left: landscape ? 10 : 14, right: landscape ? 10 : 14 },
      didParseCell(hook) {
        if (hook.section === 'head' && hook.row.index === 1) {
          hook.cell.styles.fillColor = [248, 250, 252]
          hook.cell.styles.textColor = [100, 116, 139]
          hook.cell.styles.fontSize = 6.5
        }
        if (hook.section === 'body' && hook.row.index === totalRowIndex) {
          hook.cell.styles.fillColor = [255, 251, 235]
          hook.cell.styles.fontStyle = 'bold'
          if (hook.column.index >= 2) {
            hook.cell.styles.textColor = hook.column.index % 2 === 0 ? [180, 83, 9] : NAVY
          }
        }
      },
    })
  }

  const safeNo = String(detail.issue_no || 'issue').replace(/[^\w-]+/g, '-')
  savePdf(doc, `uniform-issue-${safeNo}-${stamp()}.pdf`)
}

export function exportUniformIssuesListExcelSync(issues, filters) {
  exportUniformIssuesListExcel(issues, filters).catch(() => {})
}

export function exportUniformIssueDetailExcelSync(detail) {
  exportUniformIssueDetailExcel(detail).catch(() => {})
}
