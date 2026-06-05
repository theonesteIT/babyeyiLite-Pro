import * as XLSX from 'xlsx'

function slotLineTotal(slot) {
  if (!slot?.label_name) return 0
  return (Number(slot.quantity) || 0) * (Number(slot.unit_price) || 0)
}

/**
 * Export uniform distribution grid to a styled workbook.
 */
export function exportUniformDistributionExcel({
  students,
  slotColumns,
  slotMatrix,
  meta = {},
}) {
  const headerRow1 = ['Student Code', 'Student Name']
  const headerRow2 = ['', '']

  slotColumns.forEach((col) => {
    headerRow1.push(col.name, '', '')
    headerRow2.push('Item', 'Qty', 'Amount (RWF)')
  })
  headerRow1.push('Row Total Qty', 'Row Total (RWF)')
  headerRow2.push('', '')

  const data = [headerRow1, headerRow2]

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
      row.push(slot?.label_name || '—', qty || '', amt || '')
      rowQty += qty
      rowAmount += amt
      colTotals[col.id].qty += qty
      colTotals[col.id].amount += amt
    }
    row.push(rowQty, rowAmount)
    grandQty += rowQty
    grandAmount += rowAmount
    data.push(row)
  }

  const summaryLabel = ['COLUMN TOTALS', '']
  slotColumns.forEach((col) => {
    const t = colTotals[col.id]
    summaryLabel.push('Total', t.qty, t.amount)
  })
  summaryLabel.push(grandQty, grandAmount)
  data.push([])
  data.push(summaryLabel)

  if (meta.class_name || meta.academic_year) {
    data.unshift(
      ['Uniform Distribution Export'],
      [`Class: ${meta.class_name || '—'}`, `Year: ${meta.academic_year || '—'}`, `Term: ${meta.term || '—'}`],
      [`Exported: ${new Date().toLocaleString()}`],
      []
    )
  }

  const ws = XLSX.utils.aoa_to_sheet(data)
  const colWidths = [{ wch: 14 }, { wch: 28 }]
  slotColumns.forEach(() => {
    colWidths.push({ wch: 16 }, { wch: 8 }, { wch: 14 })
  })
  colWidths.push({ wch: 12 }, { wch: 14 })
  ws['!cols'] = colWidths

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Uniform Distribution')
  const safeClass = String(meta.class_name || 'class').replace(/[^\w-]+/g, '-')
  const stamp = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(wb, `uniform-distribution-${safeClass}-${stamp}.xlsx`)
}
