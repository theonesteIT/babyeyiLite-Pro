import * as XLSX from 'xlsx'
import { slotStateFromIssueDetail, mapStudentsFromIssueDetail } from '../components/uniform/UniformSlotGrid'

function formatAmount(n) {
  return (Number(n) || 0).toLocaleString()
}

function formatDate(d) {
  if (!d) return '—'
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return String(d)
  return dt.toLocaleDateString()
}

/**
 * Export filtered uniform issue list to Excel.
 */
export function exportUniformIssuesListExcel(issues, filters = {}) {
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

  const filterParts = []
  if (filters.academic_year) filterParts.push(`Year: ${filters.academic_year}`)
  if (filters.class_name) filterParts.push(`Class: ${filters.class_name}`)
  if (filters.student_q) filterParts.push(`Student: ${filters.student_q}`)

  const data = [
    ['Uniform Distribution — Issue Register'],
    filterParts.length ? [filterParts.join(' · ')] : ['All records'],
    [`Exported: ${new Date().toLocaleString()}`],
    [],
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
    { wch: 16 },
    { wch: 10 },
    { wch: 14 },
    { wch: 12 },
    { wch: 10 },
    { wch: 12 },
    { wch: 14 },
    { wch: 22 },
    { wch: 14 },
    { wch: 12 },
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Uniform Issues')
  const stamp = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(wb, `uniform-issues-${stamp}.xlsx`)
}

function qtyPerStudentForLine(line, studentsCount) {
  let q = Number(line.qty_per_student) || 0
  if (q <= 0 && studentsCount > 0) {
    q = Number(line.total_qty || 0) / studentsCount
  }
  return q
}

/**
 * Full issue export: summary sheet + per-student slot grid (matches issue detail view).
 */
export function exportUniformIssueDetailExcel(detail) {
  if (!detail) return
  const studentsCount = Number(detail.students_count) || (detail.students || []).length || 0
  const lines = detail.lines || []
  const issueStudents = detail.students || []

  const summaryData = [
    ['Uniform Issue — Full Report'],
    [],
    ['Issue No', detail.issue_no || ''],
    ['Class', detail.class_name || ''],
    ['Academic Year', detail.academic_year || ''],
    ['Term', detail.term || ''],
    ['Students', studentsCount],
    ['Total Pieces', Number(detail.total_pieces) || 0],
    ['Total Amount', Number(detail.total_amount) || 0],
    ['Issued By', detail.issued_by_name || ''],
    ['Created', formatDate(detail.created_at)],
    ['Exported', new Date().toLocaleString()],
    [],
    ['Distribution Summary'],
    ['Item', 'Qty / Student', 'Total Qty', 'Unit Price', 'Line Total'],
    ...lines.map((l) => [
      l.item_name || '',
      qtyPerStudentForLine(l, studentsCount),
      Number(l.total_qty) || 0,
      Number(l.unit_price) || 0,
      Number(l.line_total) || 0,
    ]),
    [],
    ['GRAND TOTAL', '', '', '', Number(detail.total_amount) || 0],
  ]

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData)
  wsSummary['!cols'] = [{ wch: 22 }, { wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 16 }]

  const { slotColumns, slotMatrix } = slotStateFromIssueDetail(detail)
  const gridStudents = mapStudentsFromIssueDetail(detail)

  const headerRow1 = ['Student Code', 'Student Name']
  const headerRow2 = ['', '']
  slotColumns.forEach((col) => {
    headerRow1.push(col.name, '', '')
    headerRow2.push('Item', 'Qty', 'Amount')
  })
  headerRow1.push('Total Qty', 'Total Amount')
  headerRow2.push('', '')

  const gridData = [
    [`Issue: ${detail.issue_no || ''}`, `Class: ${detail.class_name || ''}`],
    [`Year: ${detail.academic_year || ''}`, `Term: ${detail.term || ''}`],
    [],
    headerRow1,
    headerRow2,
  ]

  let grandQty = 0
  let grandAmount = 0
  const colTotals = Object.fromEntries(slotColumns.map((c) => [c.id, { qty: 0, amount: 0 }]))

  for (const st of gridStudents) {
    const code = st.student_code || st.student_uid || ''
    const row = [code, st.name || '']
    let rowQty = 0
    let rowAmount = 0
    for (const col of slotColumns) {
      const slot = slotMatrix[st.id]?.[col.id]
      const qty = slot?.label_name ? Number(slot.quantity) || 0 : 0
      const amt = slot?.label_name ? qty * (Number(slot.unit_price) || 0) : 0
      row.push(slot?.label_name || '—', qty || '', amt || '')
      rowQty += qty
      rowAmount += amt
      if (colTotals[col.id]) {
        colTotals[col.id].qty += qty
        colTotals[col.id].amount += amt
      }
    }
    row.push(rowQty, rowAmount)
    grandQty += rowQty
    grandAmount += rowAmount
    gridData.push(row)
  }

  gridData.push([])
  const totalsRow = ['TOTALS', '']
  slotColumns.forEach((col) => {
    const t = colTotals[col.id] || { qty: 0, amount: 0 }
    totalsRow.push('Σ', t.qty, t.amount)
  })
  totalsRow.push(grandQty, grandAmount)
  gridData.push(totalsRow)

  if (!gridStudents.length && issueStudents.length) {
    gridData.push([])
    gridData.push(['Per-student (compact)'])
    gridData.push(['Code', 'Name', 'Slots Detail', 'Total Qty', 'Total Amount'])
    issueStudents.forEach((st) => {
      const slotsText = (st.slots || [])
        .map((sl) => `${sl.slot_name ? `${sl.slot_name}: ` : ''}${sl.label_name} ×${sl.quantity}`)
        .join(' | ')
      gridData.push([
        st.student_uid || '',
        st.student_name || '',
        slotsText,
        Number(st.total_qty) || 0,
        Number(st.total_amount) || 0,
      ])
    })
  }

  const wsStudents = XLSX.utils.aoa_to_sheet(gridData)
  const colWidths = [{ wch: 14 }, { wch: 28 }]
  slotColumns.forEach(() => {
    colWidths.push({ wch: 16 }, { wch: 8 }, { wch: 12 })
  })
  colWidths.push({ wch: 10 }, { wch: 14 })
  wsStudents['!cols'] = colWidths

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary')
  XLSX.utils.book_append_sheet(wb, wsStudents, 'Per Student')
  const safeNo = String(detail.issue_no || 'issue').replace(/[^\w-]+/g, '-')
  XLSX.writeFile(wb, `uniform-issue-${safeNo}.xlsx`)
}
