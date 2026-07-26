import * as XLSX from 'xlsx'
import {
  formatMatrixQty,
  formatMatrixAmount,
  slotColumnHeaderLabel,
  applyExcelMatrixHeaderMerges,
  matrixExcelColWidths,
} from './uniformIssueSlotGroups'

function slotLineTotal(slot) {
  if (!slot?.label_name) return 0
  return (Number(slot.quantity) || 0) * (Number(slot.unit_price) || 0)
}

/**
 * Export uniform distribution grid — same column layout as Issue Uniform table.
 */
export function exportUniformDistributionExcel({
  students,
  slotColumns,
  slotMatrix,
  meta = {},
}) {
  const columns = slotColumns.map((col) => ({
    key: col.id,
    label: col.name,
    unitPrice: 0,
  }))

  slotColumns.forEach((col, i) => {
    for (const st of students) {
      const slot = slotMatrix[st.id]?.[col.id]
      if (slot?.unit_price) {
        columns[i].unitPrice = Number(slot.unit_price) || 0
        break
      }
    }
  })

  const row1 = ['Code', 'Student name']
  const row2 = ['', '']
  columns.forEach((col) => {
    row1.push(slotColumnHeaderLabel(col), '')
    row2.push('Qty', 'Amount')
  })
  row1.push('Row total', '')
  row2.push('Qty', 'Amount')

  const data = [row1, row2]
  const colTotals = Object.fromEntries(slotColumns.map((c) => [c.id, { qty: 0, amount: 0 }]))
  let grandQty = 0
  let grandAmount = 0

  for (const st of students) {
    const code = st.student_code || st.student_uid || ''
    const row = [code, st.name || '']
    let rowQty = 0
    let rowAmount = 0

    for (const col of slotColumns) {
      const slot = slotMatrix[st.id]?.[col.id]
      const qty = slot?.label_name ? Number(slot.quantity) || 0 : 0
      const amt = slotLineTotal(slot)
      row.push(formatMatrixQty(qty), formatMatrixAmount(amt))
      rowQty += qty
      rowAmount += amt
      colTotals[col.id].qty += qty
      colTotals[col.id].amount += amt
    }
    row.push(formatMatrixQty(rowQty), formatMatrixAmount(rowAmount))
    grandQty += rowQty
    grandAmount += rowAmount
    data.push(row)
  }

  const totalsRow = ['Column totals', '']
  slotColumns.forEach((col) => {
    const t = colTotals[col.id]
    totalsRow.push(formatMatrixQty(t.qty), formatMatrixAmount(t.amount))
  })
  totalsRow.push(formatMatrixQty(grandQty), formatMatrixAmount(grandAmount))
  data.push(totalsRow)

  let headerStartRow = 0
  if (meta.class_name || meta.academic_year) {
    data.unshift(
      ['Uniform Distribution Export'],
      [`Class: ${meta.class_name || '—'}`, `Year: ${meta.academic_year || '—'}`, `Term: ${meta.term || '—'}`],
      [`Exported: ${new Date().toLocaleString()}`],
      []
    )
    headerStartRow = 4
  }

  const ws = XLSX.utils.aoa_to_sheet(data)
  ws['!cols'] = matrixExcelColWidths(columns)
  applyExcelMatrixHeaderMerges(ws, headerStartRow, columns)

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Student Distribution')
  const safeClass = String(meta.class_name || 'class').replace(/[^\w-]+/g, '-')
  const stamp = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(wb, `uniform-distribution-${safeClass}-${stamp}.xlsx`)
}
