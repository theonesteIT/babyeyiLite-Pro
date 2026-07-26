import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  buildAllFabricSheetReports,
  buildFabricSheetReport,
  computeFinishedGoodProfit,
  sanitizeSheetName,
} from './fabricSheetReport'
import {
  AMBER,
  NAVY,
  fmtRwf,
  pdfHeader,
  pdfTable,
  savePdf,
  stamp,
} from './storeReportExportCommon'
import { mergeSchoolPdfMeta } from './schoolPdfBranding'

async function pdfHeaderWithSchool(doc, title, subtitle = '', landscape = false) {
  const branding = await mergeSchoolPdfMeta()
  return pdfHeader(doc, title, subtitle, landscape, branding)
}

function formatDate(d) {
  if (!d) return '—'
  return String(d).slice(0, 10)
}

function metaRows(title, extra = []) {
  return [
    [title],
    [`Exported: ${new Date().toLocaleString()}`],
    ...extra.map((line) => [line]),
    [],
  ]
}

function downloadWorkbook(wb, filename) {
  XLSX.writeFile(wb, filename)
}

function sheetReportExcelRows(report) {
  if (!report) return []
  const r = report.receipt
  return [
    ...metaRows(report.label, [
      `Supplier: ${r.supplier_name || '—'}`,
      `Invoice: ${r.invoice_number || '—'}`,
    ]),
    ['Fabric stock summary'],
    ['Meters in', 'Meters out', 'Remaining', 'Unit cost / m', 'Total bought'],
    [report.metersIn, report.metersOut, report.remaining, report.unitCost, report.totalBought],
    [],
    ['Finished goods on this sheet'],
    ['Uniform', 'Size', 'Unit price sold', 'Qty sold', 'Total sold', 'Purchase / unit', 'Profit / loss'],
    ...report.finishedItems.map((it) => [
      it.uniform_name,
      it.size,
      it.unit_price,
      it.quantity,
      it.total_sold,
      it.purchase_cost,
      it.profit_loss,
    ]),
    [],
    ['Profit / loss summary'],
    ['Total bought (fabric)', 'Total sold revenue', 'Net result', 'Status'],
    [report.totalBought, report.totalSoldRevenue, report.profitLoss, report.resultLabel],
  ]
}

function addSheetReportToPdf(doc, report, startY = 36) {
  if (!report) return startY
  const r = report.receipt
  let y = startY
  doc.setTextColor(...NAVY)
  doc.setFontSize(11)
  doc.setFont(undefined, 'bold')
  doc.text(report.label, 14, y)
  y += 6
  doc.setFontSize(9)
  doc.setFont(undefined, 'normal')
  doc.text(`${r.supplier_name || '—'} · ${formatDate(r.purchase_date)} · ${r.academic_year || ''} ${r.term || ''}`, 14, y)
  y += 8

  autoTable(doc, {
    startY: y,
    head: [['Meters in', 'Meters out', 'Remaining', 'Unit cost/m', 'Total bought']],
    body: [[
      `${report.metersIn} m`,
      `${report.metersOut} m`,
      `${report.remaining} m`,
      fmtRwf(report.unitCost),
      fmtRwf(report.totalBought),
    ]],
    styles: { fontSize: 9, textColor: NAVY },
    headStyles: { fillColor: NAVY, textColor: AMBER },
    theme: 'grid',
    margin: { left: 14, right: 14 },
  })

  y = doc.lastAutoTable.finalY + 6

  if (report.finishedItems.length) {
    autoTable(doc, {
      startY: y,
      head: [['Finished good', 'Size', 'Unit price', 'Qty', 'Total sold']],
      body: report.finishedItems.map((it) => [
        it.uniform_name,
        it.size,
        fmtRwf(it.unit_price),
        String(it.quantity),
        fmtRwf(it.total_sold),
      ]),
      styles: { fontSize: 8, textColor: NAVY },
      headStyles: { fillColor: AMBER, textColor: NAVY },
      alternateRowStyles: { fillColor: [255, 251, 235] },
      margin: { left: 14, right: 14 },
    })
    y = doc.lastAutoTable.finalY + 6
  }

  const resultColor = report.profitLoss > 0 ? [16, 185, 129] : report.profitLoss < 0 ? [239, 68, 68] : NAVY
  autoTable(doc, {
    startY: y,
    head: [['Total bought', 'Total sold', 'Profit / loss', 'Result']],
    body: [[
      fmtRwf(report.totalBought),
      fmtRwf(report.totalSoldRevenue),
      fmtRwf(report.profitLoss),
      report.resultLabel,
    ]],
    styles: { fontSize: 9, textColor: NAVY },
    headStyles: { fillColor: NAVY, textColor: AMBER },
    bodyStyles: { fontStyle: 'bold' },
    columnStyles: { 3: { textColor: resultColor } },
    margin: { left: 14, right: 14 },
  })
  return doc.lastAutoTable.finalY + 12
}

export function exportFabricStockInExcel(rows, filters = {}) {
  const filterParts = []
  if (filters.search) filterParts.push(`Search: ${filters.search}`)
  if (filters.fabric_type) filterParts.push(`Fabric: ${filters.fabric_type}`)

  const data = [
    ...metaRows('Fabric Stock In', filterParts),
    ['Date', 'Academic Year', 'Term', 'Supplier', 'Invoice', 'Fabric', 'Color', 'Meters', 'Unit Cost', 'Total Cost', 'Remaining'],
    ...(rows || []).map((r) => [
      formatDate(r.purchase_date),
      r.academic_year || '',
      r.term || '',
      r.supplier_name || '',
      r.invoice_number || '',
      r.fabric_type || '',
      r.color || '',
      Number(r.meters) || 0,
      Number(r.unit_cost) || 0,
      Number(r.total_cost) || 0,
      Number(r.remaining_meters) || 0,
    ]),
    [],
    [
      'Summary',
      '',
      '',
      '',
      '',
      '',
      '',
      rows.reduce((s, r) => s + (Number(r.meters) || 0), 0),
      '',
      rows.reduce((s, r) => s + (Number(r.total_cost) || 0), 0),
      rows.reduce((s, r) => s + (Number(r.remaining_meters) || 0), 0),
    ],
  ]

  const ws = XLSX.utils.aoa_to_sheet(data)
  ws['!cols'] = [
    { wch: 12 }, { wch: 14 }, { wch: 10 }, { wch: 18 }, { wch: 14 },
    { wch: 16 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
  ]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Fabric Stock In')
  downloadWorkbook(wb, `fabric-stock-in-${stamp()}.xlsx`)
}

export function exportFabricStockInExcelBySheet(receipts, stockouts = [], finishedGoods = [], filters = {}) {
  const reports = buildAllFabricSheetReports(receipts, stockouts, finishedGoods)
  const filterParts = []
  if (filters.search) filterParts.push(`Search: ${filters.search}`)
  if (filters.fabric_type) filterParts.push(`Fabric: ${filters.fabric_type}`)

  const wb = XLSX.utils.book_new()
  const summaryData = [
    ...metaRows('Fabric Stock In — By Sheet', filterParts),
    ['Fabric sheet', 'Supplier', 'Meters in', 'Meters out', 'Remaining', 'Unit cost/m', 'Total bought', 'Total sold', 'Profit / loss', 'Result'],
    ...reports.map((rep) => [
      rep.label,
      rep.receipt.supplier_name || '',
      rep.metersIn,
      rep.metersOut,
      rep.remaining,
      rep.unitCost,
      rep.totalBought,
      rep.totalSoldRevenue,
      rep.profitLoss,
      rep.resultLabel,
    ]),
  ]
  const summaryWs = XLSX.utils.aoa_to_sheet(summaryData)
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary')

  reports.forEach((rep, i) => {
    const ws = XLSX.utils.aoa_to_sheet(sheetReportExcelRows(rep))
    XLSX.utils.book_append_sheet(wb, ws, sanitizeSheetName(rep.label, i))
  })

  downloadWorkbook(wb, `fabric-stock-in-by-sheet-${stamp()}.xlsx`)
}

export async function exportFabricStockInPdf(receipts, stockouts = [], finishedGoods = [], filters = {}) {
  const reports = buildAllFabricSheetReports(receipts, stockouts, finishedGoods)
  const filterText = [
    filters.search && `Search: ${filters.search}`,
    filters.fabric_type && `Fabric: ${filters.fabric_type}`,
  ].filter(Boolean).join(' · ')
  const doc = new jsPDF()
  let y = await pdfHeaderWithSchool(doc, 'Fabric Stock In — Sheet Reports', filterText)

  reports.forEach((rep, idx) => {
    if (idx > 0 && y > 220) {
      doc.addPage()
      y = 20
    }
    y = addSheetReportToPdf(doc, rep, y)
  })
  savePdf(doc, `fabric-stock-in-${stamp()}.pdf`)
}

export function exportFabricSheetDetailExcel(receipt, stockouts = [], finishedGoods = []) {
  const report = buildFabricSheetReport(receipt, stockouts, finishedGoods)
  if (!report) return
  const ws = XLSX.utils.aoa_to_sheet(sheetReportExcelRows(report))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sanitizeSheetName(report.label))
  downloadWorkbook(wb, `fabric-sheet-${sanitizeSheetName(report.label).toLowerCase()}-${stamp()}.xlsx`)
}

export async function exportFabricSheetDetailPdf(receipt, stockouts = [], finishedGoods = []) {
  const report = buildFabricSheetReport(receipt, stockouts, finishedGoods)
  if (!report) return
  const doc = new jsPDF()
  const y = await pdfHeaderWithSchool(doc, report.label, `${report.receipt.supplier_name || ''} · ${formatDate(report.receipt.purchase_date)}`)
  addSheetReportToPdf(doc, report, y)
  savePdf(doc, `fabric-sheet-${sanitizeSheetName(report.label).toLowerCase()}-${stamp()}.pdf`)
}

export function exportFabricStockOutExcel(stockouts, receipts = [], filters = {}) {
  const receiptMap = new Map((receipts || []).map((r) => [r.id, r]))
  const filterParts = []
  if (filters.search) filterParts.push(`Search: ${filters.search}`)

  const data = [
    ...metaRows('Fabric Stock Out', filterParts),
    ['Date', 'Fabric', 'Color', 'Meters Out', 'Unit Cost', 'Fabric Cost Out', 'Remaining After', 'Purpose', 'Note', 'Supplier'],
    ...(stockouts || []).map((s) => {
      const receipt = receiptMap.get(s.fabric_receipt_id)
      const unitCost = Number(receipt?.unit_cost) || 0
      const metersOut = Number(s.meters_out) || 0
      return [
        formatDate(s.out_date),
        s.fabric_type || '',
        s.color || '',
        metersOut,
        unitCost,
        metersOut * unitCost,
        Number(s.remaining_after) || 0,
        s.purpose || '',
        s.note || '',
        s.supplier_name || receipt?.supplier_name || '',
      ]
    }),
    [],
    [
      'Summary',
      '',
      '',
      stockouts.reduce((sum, s) => sum + (Number(s.meters_out) || 0), 0),
      '',
      stockouts.reduce((sum, s) => {
        const receipt = receiptMap.get(s.fabric_receipt_id)
        const unitCost = Number(receipt?.unit_cost) || 0
        return sum + (Number(s.meters_out) || 0) * unitCost
      }, 0),
      '',
      '',
      '',
      '',
    ],
  ]

  const ws = XLSX.utils.aoa_to_sheet(data)
  ws['!cols'] = [
    { wch: 12 }, { wch: 16 }, { wch: 10 }, { wch: 12 }, { wch: 12 },
    { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 20 }, { wch: 18 },
  ]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'All Stock Outs')
  downloadWorkbook(wb, `fabric-stock-out-${stamp()}.xlsx`)
}

export function exportFabricStockOutExcelBySheet(receipts, stockouts = [], finishedGoods = [], filters = {}) {
  const reports = buildAllFabricSheetReports(receipts, stockouts, finishedGoods)
  const filterParts = []
  if (filters.search) filterParts.push(`Search: ${filters.search}`)

  const wb = XLSX.utils.book_new()

  const summaryData = [
    ...metaRows('Fabric Stock Out — By Sheet', filterParts),
    ['Fabric sheet', 'Meters in', 'Meters out', 'Remaining', 'Unit cost', 'Total bought', 'Total sold', 'Profit / loss', 'Result'],
    ...reports.map((rep) => [
      rep.label,
      rep.metersIn,
      rep.metersOut,
      rep.remaining,
      rep.unitCost,
      rep.totalBought,
      rep.totalSoldRevenue,
      rep.profitLoss,
      rep.resultLabel,
    ]),
  ]
  const summaryWs = XLSX.utils.aoa_to_sheet(summaryData)
  summaryWs['!cols'] = [
    { wch: 22 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 },
    { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 10 },
  ]
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary')

  reports.forEach((rep, i) => {
    const ws = XLSX.utils.aoa_to_sheet(sheetReportExcelRows(rep))
    ws['!cols'] = [
      { wch: 18 }, { wch: 8 }, { wch: 14 }, { wch: 10 }, { wch: 14 },
      { wch: 14 }, { wch: 14 },
    ]
    XLSX.utils.book_append_sheet(wb, ws, sanitizeSheetName(rep.label, i))
  })

  downloadWorkbook(wb, `fabric-stock-out-by-sheet-${stamp()}.xlsx`)
}

export async function exportFabricStockOutPdf(receipts, stockouts = [], finishedGoods = [], filters = {}) {
  const reports = buildAllFabricSheetReports(
    receipts.filter((r) => stockouts.some((s) => String(s.fabric_receipt_id) === String(r.id)) || finishedGoods.some((g) => String(g.fabric_receipt_id) === String(r.id))),
    stockouts,
    finishedGoods
  )
  const filterText = filters.search ? `Search: ${filters.search}` : ''
  const doc = new jsPDF()
  let y = await pdfHeaderWithSchool(doc, 'Fabric Stock Out — Sheet Analysis', filterText)

  reports.forEach((rep, idx) => {
    if (idx > 0 && y > 220) {
      doc.addPage()
      y = 20
    }
    y = addSheetReportToPdf(doc, rep, y)
  })

  if (!reports.length) {
    doc.setTextColor(...NAVY)
    doc.setFontSize(10)
    doc.text('No fabric sheet data for export.', 14, 50)
  }

  savePdf(doc, `fabric-stock-out-${stamp()}.pdf`)
}

export function exportFabricStockExcel(rows) {
  const data = [
    ...metaRows('Fabric Stock — Current Levels'),
    ['Fabric', 'Color', 'Received (m)', 'Used (m)', 'Remaining (m)', 'Usage %', 'Unit Cost', 'Stock Value', 'Status'],
    ...(rows || []).map((f) => {
      const received = Number(f.meters) || 0
      const remaining = Number(f.remaining ?? f.remaining_meters) || 0
      const used = Math.max(0, received - remaining)
      const usagePct = received > 0 ? (used / received) * 100 : 0
      const unitCost = Number(f.unitCost ?? f.unit_cost) || 0
      return [
        f.type ?? f.fabric_type ?? '',
        f.color || '—',
        received,
        used,
        remaining,
        Number(usagePct.toFixed(1)),
        unitCost,
        remaining * unitCost,
        usagePct > 70 ? 'High usage' : usagePct > 40 ? 'Moderate' : 'Healthy',
      ]
    }),
    [],
    [
      'Summary',
      '',
      rows.reduce((s, f) => s + (Number(f.meters) || 0), 0),
      rows.reduce((s, f) => {
        const received = Number(f.meters) || 0
        const remaining = Number(f.remaining ?? f.remaining_meters) || 0
        return s + Math.max(0, received - remaining)
      }, 0),
      rows.reduce((s, f) => s + (Number(f.remaining ?? f.remaining_meters) || 0), 0),
      '',
      '',
      rows.reduce((s, f) => {
        const remaining = Number(f.remaining ?? f.remaining_meters) || 0
        const unitCost = Number(f.unitCost ?? f.unit_cost) || 0
        return s + remaining * unitCost
      }, 0),
      `${rows.length} fabric batch(es)`,
    ],
  ]

  const ws = XLSX.utils.aoa_to_sheet(data)
  ws['!cols'] = [
    { wch: 18 }, { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 12 },
    { wch: 10 }, { wch: 12 }, { wch: 14 }, { wch: 12 },
  ]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Fabric Stock')
  downloadWorkbook(wb, `fabric-stock-${stamp()}.xlsx`)
}

export async function exportFabricStockPdf(rows) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  let y = await pdfHeaderWithSchool(doc, 'Uniform Inventory — Fabric Stock', `${rows.length} fabric batch(es)`, true)

  const body = (rows || []).map((f) => {
    const received = Number(f.meters) || 0
    const remaining = Number(f.remaining ?? f.remaining_meters) || 0
    const used = Math.max(0, received - remaining)
    const usagePct = received > 0 ? (used / received) * 100 : 0
    const unitCost = Number(f.unitCost ?? f.unit_cost) || 0
    return [
      f.type ?? f.fabric_type ?? '',
      f.color || '—',
      `${received} m`,
      `${used} m`,
      `${remaining} m`,
      `${usagePct.toFixed(0)}%`,
      fmtRwf(unitCost),
      fmtRwf(remaining * unitCost),
      usagePct > 70 ? 'High usage' : usagePct > 40 ? 'Moderate' : 'Healthy',
    ]
  })

  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [['Fabric', 'Color', 'Received', 'Used', 'Remaining', 'Usage', 'Unit cost', 'Stock value', 'Status']],
    body,
    styles: { fontSize: 8, textColor: NAVY },
    headStyles: { fillColor: NAVY, textColor: AMBER, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [255, 251, 235] },
    theme: 'grid',
  })

  const totalReceived = rows.reduce((s, f) => s + (Number(f.meters) || 0), 0)
  const totalRemaining = rows.reduce((s, f) => s + (Number(f.remaining ?? f.remaining_meters) || 0), 0)
  const totalUsed = Math.max(0, totalReceived - totalRemaining)
  const totalValue = rows.reduce((s, f) => {
    const remaining = Number(f.remaining ?? f.remaining_meters) || 0
    const unitCost = Number(f.unitCost ?? f.unit_cost) || 0
    return s + remaining * unitCost
  }, 0)

  y = doc.lastAutoTable.finalY + 6
  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [['Total received', 'Total used', 'Total remaining', 'Stock value', 'Batches']],
    body: [[
      `${totalReceived} m`,
      `${totalUsed} m`,
      `${totalRemaining} m`,
      fmtRwf(totalValue),
      String(rows.length),
    ]],
    styles: { fontSize: 9, textColor: NAVY, fontStyle: 'bold' },
    headStyles: { fillColor: AMBER, textColor: NAVY },
    theme: 'grid',
  })

  savePdf(doc, `fabric-stock-${stamp()}.pdf`)
}

function finishedGoodsProfitSummary(rows) {
  return (rows || []).reduce(
    (acc, g) => {
      const p = computeFinishedGoodProfit(g)
      return {
        totalSold: acc.totalSold + p.totalSoldCost,
        totalPurchase: acc.totalPurchase + p.totalPurchaseCost,
        profitLoss: acc.profitLoss + p.profitLoss,
        soldQty: acc.soldQty + p.soldQty,
        stock: acc.stock + (Number(g.stock) || 0),
        stockValue: acc.stockValue + (Number(g.value) || (Number(g.stock) || 0) * (Number(g.selling_price) || 0)),
      }
    },
    { totalSold: 0, totalPurchase: 0, profitLoss: 0, soldQty: 0, stock: 0, stockValue: 0 }
  )
}

export function exportFinishedGoodsExcel(rows, filters = {}) {
  const filterParts = []
  if (filters.search) filterParts.push(`Search: ${filters.search}`)
  if (filters.uniform) filterParts.push(`Uniform: ${filters.uniform}`)
  const summary = finishedGoodsProfitSummary(rows)

  const data = [
    ...metaRows('Finished Goods — Stock & Profit / Loss', filterParts),
    ['Uniform', 'Size', 'Fabric sheet', 'Opening', 'Sold qty', 'Remaining', 'Purchase / unit', 'Selling / unit', 'Total sold', 'Total purchase (sold)', 'Profit / loss', 'Status'],
    ...(rows || []).map((g) => {
      const p = computeFinishedGoodProfit(g)
      const status = !p.soldQty ? 'No sales' : p.profitLoss > 0 ? 'Income' : p.profitLoss < 0 ? 'Loss' : 'Break-even'
      return [
        g.uniform_name || '',
        g.size || '',
        g.sheet_label || g.fabric_type || '',
        Number(g.opening_stock) || 0,
        p.soldQty,
        Number(g.remaining_stock ?? g.stock) || 0,
        p.purchaseCost,
        p.unitSold,
        p.totalSoldCost,
        p.totalPurchaseCost,
        p.profitLoss,
        status,
      ]
    }),
    [],
    ['Summary', '', '', '', summary.soldQty, summary.stock, '', '', summary.totalSold, summary.totalPurchase, summary.profitLoss, summary.profitLoss >= 0 ? 'Income' : 'Loss'],
  ]

  const ws = XLSX.utils.aoa_to_sheet(data)
  ws['!cols'] = [
    { wch: 18 }, { wch: 8 }, { wch: 18 }, { wch: 10 }, { wch: 10 },
    { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 12 },
  ]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Finished Goods')
  downloadWorkbook(wb, `finished-goods-${stamp()}.xlsx`)
}

export async function exportFinishedGoodsPdf(rows, filters = {}) {
  const summary = finishedGoodsProfitSummary(rows)
  const doc = new jsPDF({ orientation: 'landscape' })
  const filterText = [filters.search && `Search: ${filters.search}`, filters.uniform && `Uniform: ${filters.uniform}`].filter(Boolean).join(' · ')
  const y = await pdfHeaderWithSchool(doc, 'Finished Goods — Profit / Loss Report', filterText, true)

  autoTable(doc, {
    startY: y,
    head: [['Uniform', 'Size', 'Fabric', 'Sold', 'Rem.', 'Sell/unit', 'Total sold', 'Purchase (sold)', 'P/L', 'Status']],
    body: (rows || []).map((g) => {
      const p = computeFinishedGoodProfit(g)
      const status = !p.soldQty ? 'No sales' : p.profitLoss > 0 ? 'Income' : p.profitLoss < 0 ? 'Loss' : 'Break-even'
      return [
        g.uniform_name,
        g.size,
        (g.sheet_label || g.fabric_type || '—').slice(0, 18),
        String(p.soldQty),
        String(g.remaining_stock ?? g.stock ?? 0),
        fmtRwf(p.unitSold),
        fmtRwf(p.totalSoldCost),
        fmtRwf(p.totalPurchaseCost),
        fmtRwf(p.profitLoss),
        status,
      ]
    }),
    styles: { fontSize: 7.5, textColor: NAVY },
    headStyles: { fillColor: NAVY, textColor: AMBER },
    alternateRowStyles: { fillColor: [255, 251, 235] },
    margin: { left: 14, right: 14 },
  })

  const summaryY = doc.lastAutoTable.finalY + 8
  autoTable(doc, {
    startY: summaryY,
    head: [['Total sold revenue', 'Total purchase (sold)', 'Net profit / loss', 'Result']],
    body: [[
      fmtRwf(summary.totalSold),
      fmtRwf(summary.totalPurchase),
      fmtRwf(summary.profitLoss),
      summary.profitLoss > 0 ? 'Income' : summary.profitLoss < 0 ? 'Loss' : 'Break-even',
    ]],
    styles: { fontSize: 10, textColor: NAVY, fontStyle: 'bold' },
    headStyles: { fillColor: AMBER, textColor: NAVY },
    margin: { left: 14, right: 14 },
  })

  savePdf(doc, `finished-goods-${stamp()}.pdf`)
}

export function exportProfitCalculationExcel(rows, summary = {}, filters = {}) {
  const filterParts = [
    filters.academic_year,
    filters.term,
    filters.class_name,
    filters.from_date && filters.to_date ? `${filters.from_date} → ${filters.to_date}` : '',
  ].filter(Boolean)

  const data = [
    ...metaRows('Uniform Profit / Loss by Fabric', filterParts),
    [
      'Fabric',
      'Color',
      'Meters Out',
      'Fabric Unit Cost (avg)',
      'Total Fabric Cost Out',
      'Issue Qty',
      'Issue Unit Price (avg)',
      'Total Issue Revenue',
      'Profit / Loss',
    ],
    ...(rows || []).map((r) => [
      r.fabric_type || '',
      r.fabric_color || '',
      Number(r.meters_out) || 0,
      Number(r.fabric_unit_cost_avg) || 0,
      Number(r.total_fabric_cost) || 0,
      Number(r.issue_qty) || 0,
      Number(r.issue_unit_price_avg) || 0,
      Number(r.total_issue_revenue) || 0,
      Number(r.profit_loss) || 0,
    ]),
    [],
    [
      'GRAND TOTAL',
      '',
      Number(summary.total_meters_out) || 0,
      '',
      Number(summary.total_fabric_cost) || 0,
      Number(summary.total_issue_qty) || 0,
      '',
      Number(summary.total_issue_revenue) || 0,
      Number(summary.total_profit_loss) || 0,
    ],
  ]

  const ws = XLSX.utils.aoa_to_sheet(data)
  ws['!cols'] = [
    { wch: 18 }, { wch: 10 }, { wch: 12 }, { wch: 16 }, { wch: 18 },
    { wch: 12 }, { wch: 18 }, { wch: 18 }, { wch: 14 },
  ]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Profit Calculation')
  downloadWorkbook(wb, `uniform-profit-calculation-${stamp()}.xlsx`)
}
