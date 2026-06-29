/**
 * Build slot-grouped distribution data from a uniform issue detail record.
 * Each group = one item/slot heading (e.g. Dress, T-Shirt) with per-student rows.
 */
export function buildIssueSlotGroups(detail) {
  if (!detail) return { groups: [], grandTotalQty: 0, grandTotalAmount: 0 }

  const lines = detail.lines || []
  const students = detail.students || []
  const lineByItem = new Map(
    lines.map((l) => [String(l.item_name || '').trim().toLowerCase(), l])
  )

  const groupsMap = new Map()

  const ensureGroup = (key, label, line) => {
    if (!groupsMap.has(key)) {
      groupsMap.set(key, {
        key,
        label,
        unitPrice: Number(line?.unit_price) || 0,
        qtyPerStudent: 0,
        lineTotal: Number(line?.line_total) || 0,
        lineQty: Number(line?.total_qty) || 0,
        rows: [],
        totalQty: 0,
        totalAmount: 0,
      })
    }
    return groupsMap.get(key)
  }

  lines.forEach((l) => {
    const label = String(l.item_name || '').trim()
    if (!label) return
    const key = label.toLowerCase()
    const g = ensureGroup(key, label, l)
    const sc = Number(detail.students_count) || students.length || 0
    let qps = Number(l.qty_per_student) || 0
    if (qps <= 0 && sc > 0) qps = Number(l.total_qty || 0) / sc
    g.qtyPerStudent = qps
    g.unitPrice = Number(l.unit_price) || g.unitPrice
    g.lineTotal = Number(l.line_total) || g.lineTotal
    g.lineQty = Number(l.total_qty) || g.lineQty
  })

  for (const st of students) {
    for (const sl of st.slots || []) {
      const label = String(sl.label_name || sl.slot_name || '').trim()
      if (!label) continue
      const key = label.toLowerCase()
      const line = lineByItem.get(key) || lineByItem.get(String(sl.slot_name || '').trim().toLowerCase())
      const g = ensureGroup(key, label, line)
      const qty = Number(sl.quantity) || 0
      const unitPrice = Number(sl.unit_price) || g.unitPrice || 0
      const amount = qty * unitPrice
      g.rows.push({
        studentId: st.student_id,
        code: st.student_uid || '',
        name: st.student_name || '',
        slotName: sl.slot_name || '',
        qty,
        unitPrice,
        amount,
      })
      g.totalQty += qty
      g.totalAmount += amount
    }
  }

  const groups = [...groupsMap.values()]
    .filter((g) => g.rows.length > 0 || g.lineQty > 0)
    .sort((a, b) => a.label.localeCompare(b.label))

  let grandTotalQty = 0
  let grandTotalAmount = 0
  groups.forEach((g) => {
    if (g.totalQty === 0 && g.lineQty > 0) g.totalQty = g.lineQty
    if (g.totalAmount === 0 && g.lineTotal > 0) g.totalAmount = g.lineTotal
    grandTotalQty += g.totalQty
    grandTotalAmount += g.totalAmount
  })

  if (grandTotalAmount === 0) {
    grandTotalAmount = Number(detail.total_amount) || 0
  }

  return { groups, grandTotalQty, grandTotalAmount }
}

/**
 * Matrix layout: one column group per slot (Qty + Amount), one row per student.
 */
export function buildIssueSlotMatrix(detail) {
  const { groups, grandTotalQty, grandTotalAmount } = buildIssueSlotGroups(detail)

  const columns = groups.map((g) => ({
    key: g.key,
    label: g.label,
    unitPrice: g.unitPrice,
    totalQty: g.totalQty,
    totalAmount: g.totalAmount,
  }))

  const studentMap = new Map()

  const ensureStudent = (row) => {
    if (!studentMap.has(row.studentId)) {
      studentMap.set(row.studentId, {
        studentId: row.studentId,
        code: row.code,
        name: row.name,
        cells: {},
        rowTotalQty: 0,
        rowTotalAmount: 0,
      })
    }
    return studentMap.get(row.studentId)
  }

  for (const group of groups) {
    for (const row of group.rows) {
      const st = ensureStudent(row)
      st.cells[group.key] = {
        qty: row.qty,
        amount: row.amount,
        unitPrice: row.unitPrice,
      }
    }
  }

  for (const st of detail?.students || []) {
    if (!studentMap.has(st.student_id)) {
      studentMap.set(st.student_id, {
        studentId: st.student_id,
        code: st.student_uid || '',
        name: st.student_name || '',
        cells: {},
        rowTotalQty: Number(st.total_qty) || 0,
        rowTotalAmount: Number(st.total_amount) || 0,
      })
    }
  }

  const students = [...studentMap.values()]
    .map((st) => {
      let rowQty = 0
      let rowAmount = 0
      columns.forEach((col) => {
        const cell = st.cells[col.key]
        if (cell) {
          rowQty += Number(cell.qty) || 0
          rowAmount += Number(cell.amount) || 0
        }
      })
      return {
        ...st,
        rowTotalQty: rowQty || st.rowTotalQty,
        rowTotalAmount: rowAmount || st.rowTotalAmount,
      }
    })
    .sort((a, b) => String(a.name).localeCompare(String(b.name)))

  return { columns, students, grandTotalQty, grandTotalAmount }
}

/**
 * Shared formatters — match Issue Uniform UI table exactly.
 */
export function formatMatrixQty(n) {
  const v = Number(n) || 0
  if (v === 0) return '—'
  return Number.isInteger(v) ? String(v) : v.toFixed(2)
}

export function formatMatrixAmount(n) {
  const v = Number(n) || 0
  if (v === 0) return '—'
  return v.toLocaleString()
}

export function slotColumnHeaderLabel(col) {
  const label = String(col.label || '').toUpperCase()
  const price = Number(col.unitPrice) || 0
  if (price > 0) return `${label} @ ${formatMatrixAmount(price)}`
  return label
}

/** Two-row header matching the Issue Uniform UI table. */
export function buildSlotMatrixTableHeaders(columns) {
  const row1 = ['Code', 'Student name']
  const row2 = ['', '']

  columns.forEach((col) => {
    row1.push(slotColumnHeaderLabel(col), '')
    row2.push('Qty', 'Amount')
  })
  row1.push('Row total', '')
  row2.push('Qty', 'Amount')

  return { row1, row2 }
}

/** Student rows + column totals row — same cell values as the UI table. */
export function buildSlotMatrixTableRows(students, columns, grandTotalQty, grandTotalAmount) {
  const rows = []
  const colTotals = Object.fromEntries(columns.map((c) => [c.key, { qty: 0, amount: 0 }]))
  let calcGrandQty = 0
  let calcGrandAmount = 0

  for (const st of students) {
    const row = [st.code, st.name]
    let rowQty = 0
    let rowAmount = 0

    columns.forEach((col) => {
      const cell = st.cells[col.key]
      const qty = cell ? Number(cell.qty) || 0 : 0
      const amt = cell ? Number(cell.amount) || 0 : 0
      row.push(formatMatrixQty(qty), formatMatrixAmount(amt))
      rowQty += qty
      rowAmount += amt
      colTotals[col.key].qty += qty
      colTotals[col.key].amount += amt
    })

    row.push(formatMatrixQty(rowQty), formatMatrixAmount(rowAmount))
    calcGrandQty += rowQty
    calcGrandAmount += rowAmount
    rows.push(row)
  }

  const totalsRow = ['Column totals', '']
  columns.forEach((col) => {
    const t = colTotals[col.key]
    totalsRow.push(formatMatrixQty(t.qty), formatMatrixAmount(t.amount))
  })
  totalsRow.push(
    formatMatrixQty(grandTotalQty ?? calcGrandQty),
    formatMatrixAmount(grandTotalAmount ?? calcGrandAmount)
  )

  return { rows, totalsRow, colTotals, calcGrandQty, calcGrandAmount }
}

/** @deprecated use buildSlotMatrixTableHeaders */
export function buildSlotMatrixExcelHeaders(columns) {
  return buildSlotMatrixTableHeaders(columns)
}

/** @deprecated use buildSlotMatrixTableRows */
export function buildSlotMatrixExcelBody(students, columns, grandTotalQty, grandTotalAmount) {
  const { rows, totalsRow, colTotals, calcGrandQty, calcGrandAmount } = buildSlotMatrixTableRows(
    students,
    columns,
    grandTotalQty,
    grandTotalAmount
  )
  return {
    rows,
    totalsRow,
    grandQty: calcGrandQty,
    grandAmount: calcGrandAmount,
    colTotals,
  }
}

/** Apply merged cells for the two-row matrix header (matches UI colspan/rowspan). */
export function applyExcelMatrixHeaderMerges(ws, headerStartRow, columns) {
  const merges = []
  merges.push({ s: { r: headerStartRow, c: 0 }, e: { r: headerStartRow + 1, c: 0 } })
  merges.push({ s: { r: headerStartRow, c: 1 }, e: { r: headerStartRow + 1, c: 1 } })

  let col = 2
  columns.forEach(() => {
    merges.push({ s: { r: headerStartRow, c: col }, e: { r: headerStartRow, c: col + 1 } })
    col += 2
  })
  merges.push({ s: { r: headerStartRow, c: col }, e: { r: headerStartRow, c: col + 1 } })

  ws['!merges'] = [...(ws['!merges'] || []), ...merges]
}

export function matrixExcelColWidths(columns) {
  const colWidths = [{ wch: 14 }, { wch: 30 }]
  columns.forEach(() => {
    colWidths.push({ wch: 8 }, { wch: 14 })
  })
  colWidths.push({ wch: 10 }, { wch: 16 })
  return colWidths
}

export function buildSlotMatrixExportSheet(issueMeta, columns, students, grandTotalQty, grandTotalAmount) {
  const { row1, row2 } = buildSlotMatrixTableHeaders(columns)
  const { rows, totalsRow } = buildSlotMatrixTableRows(students, columns, grandTotalQty, grandTotalAmount)
  const metaLines = issueMeta.length ? issueMeta.map((line) => [line]) : []
  const headerStartRow = metaLines.length + 2

  const data = [
    ['STUDENT DISTRIBUTION'],
    ...metaLines,
    [],
    row1,
    row2,
    ...rows,
    totalsRow,
  ]

  return { data, headerStartRow }
}

export function buildSlotMatrixPdfHead(columns) {
  const row1 = [
    { content: 'Code', rowSpan: 2, styles: { halign: 'left', valign: 'middle' } },
    { content: 'Student name', rowSpan: 2, styles: { halign: 'left', valign: 'middle' } },
    ...columns.map((col) => ({
      content: slotColumnHeaderLabel(col),
      colSpan: 2,
      styles: { halign: 'center', valign: 'middle' },
    })),
    { content: 'Row total', colSpan: 2, styles: { halign: 'center', valign: 'middle' } },
  ]

  const row2 = [
    ...columns.flatMap(() => [
      { content: 'Qty', styles: { halign: 'right' } },
      { content: 'Amount', styles: { halign: 'right' } },
    ]),
    { content: 'Qty', styles: { halign: 'right' } },
    { content: 'Amount', styles: { halign: 'right' } },
  ]

  return [row1, row2]
}

export function buildSlotMatrixPdfBody(students, columns, grandTotalQty, grandTotalAmount) {
  const { rows, totalsRow } = buildSlotMatrixTableRows(students, columns, grandTotalQty, grandTotalAmount)
  return [...rows, totalsRow]
}

export function sanitizeExcelSheetName(name, index = 0) {
  const base = String(name || 'Sheet')
    .replace(/[\\/?*[\]:]/g, '')
    .slice(0, 28)
  return base || `Slot ${index + 1}`
}
