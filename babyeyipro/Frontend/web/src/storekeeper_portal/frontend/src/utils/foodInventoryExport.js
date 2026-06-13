import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  buildAllocationSummary,
  buildFoodItemSummary,
  sumTotals,
} from './foodReportData'
import {
  AMBER,
  NAVY,
  downloadWorkbook,
  fmtRwf,
  formatExportDate,
  metaRows,
  pdfHeader,
  stamp,
} from './storeReportExportCommon'

function buildReportContext({ stockRows = [], consumptions = [], levels = [], filters = {} }) {
  const items = buildFoodItemSummary(stockRows, consumptions)
  const totals = sumTotals(items, stockRows, consumptions)
  const allocation = buildAllocationSummary(consumptions)
  const filterLines = [
    filters.academicYear ? `Academic year: ${filters.academicYear}` : '',
    filters.term ? `Term: ${filters.term}` : '',
    filters.dateFrom || filters.dateTo
      ? `Period: ${filters.dateFrom || '…'} → ${filters.dateTo || '…'}`
      : '',
  ].filter(Boolean)

  const kpi = {
    purchased: totals.purchaseValue,
    consumedQty: totals.totalConsumed,
    batches: totals.receiptCount,
    low: levels.filter((l) => l.status !== 'Normal').length,
    expired: stockRows.filter((r) => r.expiry_date && new Date(r.expiry_date) < new Date()).length,
    stockValue: totals.stockValue,
    consumptionCost: totals.consumptionCost,
  }

  return { items, totals, allocation, filterLines, kpi }
}

export function exportFoodInventoryExcel({ stockRows = [], consumptions = [], levels = [], filters = {} }) {
  const { items, totals, allocation, filterLines, kpi } = buildReportContext({
    stockRows,
    consumptions,
    levels,
    filters,
  })

  const wb = XLSX.utils.book_new()

  const summarySheet = XLSX.utils.aoa_to_sheet([
    ...metaRows('Food Inventory Report', filterLines),
    ['Metric', 'Value'],
    ['Total purchase value', kpi.purchased],
    ['Total consumed (units)', kpi.consumedQty],
    ['Stock batches', kpi.batches],
    ['Stock on hand value', kpi.stockValue],
    ['Consumption cost', kpi.consumptionCost],
    ['Low / out items', kpi.low],
    ['Expired batches', kpi.expired],
    ['Consumption records', totals.consumptionCount],
  ])
  summarySheet['!cols'] = [{ wch: 28 }, { wch: 18 }]
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary')

  const stockSheet = XLSX.utils.aoa_to_sheet([
    ...metaRows('Stock In', filterLines),
    ['Date', 'Item', 'Supplier', 'Location', 'Year', 'Term', 'Qty', 'Unit', 'Unit cost', 'Total', 'Remaining', 'Expiry', 'Invoice'],
    ...stockRows.map((r) => [
      formatExportDate(r.receive_date),
      r.item_name,
      r.supplier_name || '',
      r.store_location || '',
      r.academic_year,
      r.term,
      r.quantity,
      r.unit_type,
      r.unit_cost || 0,
      r.total_cost || 0,
      r.remaining_quantity,
      formatExportDate(r.expiry_date),
      r.invoice_number || '',
    ]),
  ])
  stockSheet['!cols'] = [
    { wch: 12 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 12 }, { wch: 10 },
    { wch: 8 }, { wch: 8 }, { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 14 },
  ]
  XLSX.utils.book_append_sheet(wb, stockSheet, 'Stock In')

  const outSheet = XLSX.utils.aoa_to_sheet([
    ...metaRows('Stock Out (Consumption)', filterLines),
    ['Date', 'Item', 'Allocated to', 'Qty', 'Unit', 'Year', 'Term', 'Remaining after', 'Note'],
    ...consumptions.map((c) => [
      formatExportDate(c.consumption_date),
      c.item_name,
      c.allocated_to,
      c.quantity,
      c.unit_type,
      c.academic_year,
      c.term,
      c.remaining_after ?? '',
      c.note || '',
    ]),
  ])
  outSheet['!cols'] = [
    { wch: 12 }, { wch: 16 }, { wch: 16 }, { wch: 8 }, { wch: 8 },
    { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 20 },
  ]
  XLSX.utils.book_append_sheet(wb, outSheet, 'Stock Out')

  const levelsSheet = XLSX.utils.aoa_to_sheet([
    ...metaRows('Stock Levels', filterLines),
    ['Item', 'Unit', 'Remaining', 'Min level', 'Status'],
    ...levels.map((l) => [l.item_name, l.unit_type, l.remaining, l.min_level || 0, l.status]),
  ])
  levelsSheet['!cols'] = [{ wch: 18 }, { wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 14 }]
  XLSX.utils.book_append_sheet(wb, levelsSheet, 'Stock Levels')

  const itemSheet = XLSX.utils.aoa_to_sheet([
    ...metaRows('Item Analysis', filterLines),
    ['Item', 'Unit', 'Received', 'Consumed', 'Remaining', 'Unit cost', 'Stock value', 'Status'],
    ...items.map((i) => [
      i.name,
      i.unit,
      i.received,
      i.consumed,
      i.remaining,
      Math.round(i.unitCost),
      Math.round(i.stockValue),
      i.status,
    ]),
  ])
  itemSheet['!cols'] = [
    { wch: 16 }, { wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 10 },
  ]
  XLSX.utils.book_append_sheet(wb, itemSheet, 'Item Analysis')

  if (allocation.length) {
    const allocSheet = XLSX.utils.aoa_to_sheet([
      ...metaRows('Allocation Breakdown', filterLines),
      ['Category', 'Quantity', 'Records'],
      ...allocation.map((a) => [a.label, a.quantity, a.count]),
    ])
    XLSX.utils.book_append_sheet(wb, allocSheet, 'Allocation')
  }

  downloadWorkbook(wb, `food-inventory-report-${stamp()}.xlsx`)
}

export function exportFoodInventoryPdf({ stockRows = [], consumptions = [], levels = [], filters = {} }) {
  const { items, allocation, filterLines, kpi } = buildReportContext({
    stockRows,
    consumptions,
    levels,
    filters,
  })

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const subtitle = filterLines.join(' · ') || 'All periods'
  let y = pdfHeader(doc, 'Food Inventory Report', subtitle)

  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [['Metric', 'Value']],
    body: [
      ['Total purchase value', fmtRwf(kpi.purchased)],
      ['Units consumed', String(kpi.consumedQty)],
      ['Stock batches', String(kpi.batches)],
      ['Stock on hand value', fmtRwf(kpi.stockValue)],
      ['Low / out items', String(kpi.low)],
      ['Expired batches', String(kpi.expired)],
    ],
    styles: { fontSize: 9, textColor: NAVY },
    headStyles: { fillColor: NAVY, textColor: AMBER, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    theme: 'grid',
  })

  y = doc.lastAutoTable.finalY + 8
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...NAVY)
  doc.text('Stock In (recent)', 14, y)
  y += 4

  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [['Date', 'Item', 'Qty', 'Unit', 'Total', 'Remaining']],
    body: stockRows.slice(0, 12).map((r) => [
      formatExportDate(r.receive_date),
      r.item_name,
      String(r.quantity),
      r.unit_type,
      fmtRwf(r.total_cost),
      String(r.remaining_quantity),
    ]),
    styles: { fontSize: 8, textColor: NAVY },
    headStyles: { fillColor: NAVY, textColor: AMBER },
    alternateRowStyles: { fillColor: [255, 251, 235] },
    theme: 'grid',
  })

  y = doc.lastAutoTable.finalY + 8
  doc.text('Stock Out / Consumption (recent)', 14, y)
  y += 4

  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [['Date', 'Item', 'Allocated to', 'Qty', 'Unit']],
    body: consumptions.slice(0, 12).map((c) => [
      formatExportDate(c.consumption_date),
      c.item_name,
      c.allocated_to,
      String(c.quantity),
      c.unit_type,
    ]),
    styles: { fontSize: 8, textColor: NAVY },
    headStyles: { fillColor: NAVY, textColor: AMBER },
    theme: 'grid',
  })

  if (items.length && doc.lastAutoTable.finalY < 250) {
    y = doc.lastAutoTable.finalY + 8
    doc.text('Stock levels', 14, y)
    autoTable(doc, {
      startY: y + 4,
      margin: { left: 14, right: 14 },
      head: [['Item', 'Remaining', 'Min', 'Status']],
      body: items.slice(0, 10).map((i) => [
        i.name,
        `${i.remaining} ${i.unit}`,
        String(levels.find((l) => l.item_name === i.name)?.min_level || '—'),
        i.status,
      ]),
      styles: { fontSize: 8, textColor: NAVY },
      headStyles: { fillColor: AMBER, textColor: NAVY },
      theme: 'grid',
    })
  }

  if (allocation.length && doc.lastAutoTable.finalY < 265) {
    y = doc.lastAutoTable.finalY + 6
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 116, 139)
    const allocText = allocation.slice(0, 4).map((a) => `${a.label}: ${a.quantity}`).join(' · ')
    doc.text(`Top allocations: ${allocText}`, 14, y)
  }

  doc.save(`food-inventory-report-${stamp()}.pdf`)
}
