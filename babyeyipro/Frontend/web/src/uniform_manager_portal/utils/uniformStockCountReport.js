import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { mergeSchoolPdfMeta } from '../../storekeeper_portal/frontend/src/utils/schoolPdfBranding'
import {
  pdfHeader,
  pdfKpiStrip,
  reportRef,
  savePdf,
  metaRows,
  downloadWorkbook,
  NAVY,
  SLATE,
  PDF_TABLE_THEME,
} from '../../storekeeper_portal/frontend/src/utils/storeReportExportCommon'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export const STOCK_COUNT_QTY_HELP = {
  fabric: {
    title: 'Fabric stock count',
    primary:
      'Primary Qty (meters) — quantity saved when you register Fabric Stock In (meters on each receipt).',
    dateIn:
      'Date In — purchase date on the fabric receipt when stock was received.',
    unit: 'm',
  },
  finished: {
    title: 'Finished uniform stock count',
    primary:
      'Primary Qty (pcs) — pieces saved when you register Finished Goods (stock quantity on each item).',
    dateIn:
      'Date In — date the finished good was registered in inventory.',
    unit: 'pcs',
  },
}

export function localDateStr(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function lastSixMonthsRange(now = new Date()) {
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const start = new Date(now.getFullYear(), now.getMonth() - 5, 1)
  return {
    from: localDateStr(start),
    to: localDateStr(end),
    label: `${fmtDate(localDateStr(start))} → ${fmtDate(localDateStr(end))}`,
  }
}

export function monthBounds(year, month) {
  const y = Number(year)
  const m = Number(month)
  const from = `${y}-${String(m).padStart(2, '0')}-01`
  const last = new Date(y, m, 0).getDate()
  const to = `${y}-${String(m).padStart(2, '0')}-${String(last).padStart(2, '0')}`
  const label = `${MONTHS[m - 1]?.toUpperCase() || ''} ${y}`
  return { from, to, label }
}

/** Resolve period from custom date range or month/year fallback. */
export function resolvePeriodRange({ from, to, year, month }) {
  if (from && to && from <= to) {
    return {
      from,
      to,
      label: `${fmtDate(from)} → ${fmtDate(to)}`,
    }
  }
  return monthBounds(year, month)
}

function dateInRange(d, from, to) {
  if (!d) return false
  const s = String(d).slice(0, 10)
  return s >= from && s <= to
}

function fmtDate(d) {
  if (!d) return ''
  const s = String(d).slice(0, 10)
  const [y, m, day] = s.split('-')
  if (!y || !m || !day) return s
  return `${day}/${m}/${y}`
}

function qtyCell(n) {
  const v = Number(n) || 0
  return v === 0 ? '' : v
}

function moneyCell(n) {
  const v = Number(n) || 0
  return v === 0 ? '' : Math.round(v)
}

function emptyStockBlock() {
  return {
    primaryQty: '',
    totalQty: '',
    unitPrice: '',
    amount: '',
    date: '',
  }
}

function stockBlock({ primaryQty = '', totalQty = 0, unitPrice = 0, amount = 0, date = '' } = {}) {
  const p = primaryQty !== '' ? primaryQty : totalQty
  const qty = qtyCell(p)
  return {
    primaryQty: qty,
    totalQty: qty,
    unitPrice: qtyCell(unitPrice),
    amount: moneyCell(amount),
    date: date ? fmtDate(date) : '',
  }
}

function matchItemName(good, itemName) {
  const base = String(good.uniform_name || '').trim().toLowerCase()
  const withSize = `${base} (${String(good.size || '').trim().toLowerCase()})`
  const raw = String(itemName || '').trim().toLowerCase()
  return raw === base || raw === withSize || raw.includes(base)
}

function periodArgs(opts) {
  return resolvePeriodRange(opts)
}

export function buildFinishedUniformRows(goods, analyticsTopItems, periodOpts) {
  const { from, to } = periodArgs(periodOpts)
  const outByName = new Map()
  for (const item of analyticsTopItems || []) {
    outByName.set(String(item.item_name || '').trim().toLowerCase(), {
      qty: Number(item.pieces || 0),
      amount: Number(item.revenue || 0),
      date: item.last_issue_date || '',
    })
  }

  return (goods || []).map((g, idx) => {
    const productName = `${g.uniform_name} (${g.size})`
    const unitPrice = Number(g.purchase_cost) || Number(g.selling_price) || 0
    const closingQty = Number(g.stock) || 0
    const lifetimeOut = Number(g.sold_qty) || 0

    let periodOutQty = 0
    let periodOutAmount = 0
    let periodOutDate = ''
    for (const [name, val] of outByName.entries()) {
      if (matchItemName(g, name)) {
        periodOutQty += val.qty
        periodOutAmount += val.amount
        if (val.date && (!periodOutDate || String(val.date) > String(periodOutDate))) {
          periodOutDate = val.date
        }
      }
    }
    if (!periodOutQty && lifetimeOut) {
      periodOutQty = lifetimeOut
      periodOutAmount = Number(g.total_sold_cost) || lifetimeOut * Number(g.selling_price || 0)
    }

    const createdInPeriod = dateInRange(g.created_at, from, to)
    const stockInQty = createdInPeriod ? Number(g.opening_stock ?? g.stock) || 0 : 0
    const openingPeriod = Math.max(0, closingQty + periodOutQty - stockInQty)

    return {
      no: idx + 1,
      productName,
      opening: stockBlock({
        primaryQty: openingPeriod,
        totalQty: openingPeriod,
        unitPrice,
        amount: openingPeriod * unitPrice,
      }),
      stockIn: stockBlock({
        date: createdInPeriod ? g.created_at : '',
        primaryQty: stockInQty,
        totalQty: stockInQty,
        unitPrice,
        amount: stockInQty * unitPrice,
      }),
      stockOut: stockBlock({
        date: periodOutDate,
        primaryQty: periodOutQty,
        totalQty: periodOutQty,
        unitPrice: Number(g.selling_price) || unitPrice,
        amount: periodOutAmount,
      }),
      closing: stockBlock({
        primaryQty: closingQty,
        totalQty: closingQty,
        unitPrice,
        amount: closingQty * unitPrice,
      }),
    }
  })
}

export function buildFabricRows(fabrics, stockouts, periodOpts) {
  const { from, to } = periodArgs(periodOpts)
  const byKey = new Map()

  for (const f of fabrics || []) {
    const key = `${f.fabric_type}||${f.color || ''}`
    if (!byKey.has(key)) {
      byKey.set(key, {
        productName: `${f.fabric_type}${f.color ? ` (${f.color})` : ''}`,
        receipts: [],
        stockouts: [],
      })
    }
    byKey.get(key).receipts.push(f)
  }

  for (const o of stockouts || []) {
    const key = `${o.fabric_type}||${o.color || ''}`
    if (!byKey.has(key)) {
      byKey.set(key, {
        productName: `${o.fabric_type}${o.color ? ` (${o.color})` : ''}`,
        receipts: [],
        stockouts: [],
      })
    }
    byKey.get(key).stockouts.push(o)
  }

  const rows = []
  let no = 0
  for (const group of byKey.values()) {
    no += 1
    const unitPrice = group.receipts.reduce((s, r) => s + Number(r.unit_cost || 0), 0)
      / Math.max(1, group.receipts.filter((r) => r.unit_cost).length)

    const totalRemaining = group.receipts.reduce((s, r) => s + Number(r.remaining_meters || 0), 0)

    const periodIns = group.receipts.filter((r) => dateInRange(r.purchase_date, from, to))
    const stockInQty = periodIns.reduce((s, r) => s + Number(r.meters || 0), 0)
    const stockInDate = periodIns.length
      ? periodIns.sort((a, b) => String(a.purchase_date).localeCompare(String(b.purchase_date))).slice(-1)[0].purchase_date
      : ''

    const periodOuts = group.stockouts.filter((s) => dateInRange(s.out_date, from, to))
    const stockOutQty = periodOuts.reduce((s, o) => s + Number(o.meters_out || 0), 0)
    const stockOutDate = periodOuts.length
      ? periodOuts.sort((a, b) => String(a.out_date).localeCompare(String(b.out_date))).slice(-1)[0].out_date
      : ''
    const stockOutAmount = periodOuts.reduce((s, o) => {
      const receipt = group.receipts.find((r) => r.id === o.fabric_receipt_id)
      const cost = Number(receipt?.unit_cost || unitPrice) || 0
      return s + Number(o.meters_out || 0) * cost
    }, 0)

    const closingQty = totalRemaining
    const openingQty = Math.max(0, closingQty + stockOutQty - stockInQty)

    rows.push({
      no,
      productName: group.productName,
      opening: stockBlock({
        primaryQty: openingQty,
        totalQty: openingQty,
        unitPrice,
        amount: openingQty * unitPrice,
      }),
      stockIn: stockBlock({
        date: stockInDate,
        primaryQty: stockInQty,
        totalQty: stockInQty,
        unitPrice,
        amount: stockInQty * unitPrice,
      }),
      stockOut: stockBlock({
        date: stockOutDate,
        primaryQty: stockOutQty,
        totalQty: stockOutQty,
        unitPrice,
        amount: stockOutAmount,
      }),
      closing: stockBlock({
        primaryQty: closingQty,
        totalQty: closingQty,
        unitPrice,
        amount: closingQty * unitPrice,
      }),
    })
  }

  return rows.sort((a, b) => a.productName.localeCompare(b.productName))
}

export function sumReportRows(rows) {
  const sumBlock = (pick) => rows.reduce(
    (acc, row) => {
      const block = pick(row)
      acc.primaryQty += Number(block.primaryQty) || 0
      acc.totalQty += Number(block.totalQty) || 0
      acc.amount += Number(block.amount) || 0
      return acc
    },
    { primaryQty: 0, totalQty: 0, unitPrice: '', amount: 0, date: '' },
  )

  const fmtSum = (b) => ({
    ...b,
    primaryQty: b.primaryQty || '',
    totalQty: b.totalQty || '',
    amount: b.amount ? Math.round(b.amount) : '',
  })

  return {
    no: '',
    productName: 'TOTAL',
    opening: fmtSum(sumBlock((r) => r.opening)),
    stockIn: fmtSum(sumBlock((r) => r.stockIn)),
    stockOut: fmtSum(sumBlock((r) => r.stockOut)),
    closing: fmtSum(sumBlock((r) => r.closing)),
  }
}

export function computeStockCountKpis(rows, totals, reportType) {
  const unit = STOCK_COUNT_QTY_HELP[reportType]?.unit || ''
  const t = totals || sumReportRows(rows)
  return [
    { label: 'Products', value: rows.length },
    { label: 'Opening', value: `${Number(t.opening.totalQty || 0).toLocaleString()} ${unit}`.trim() },
    { label: 'Stock in', value: `${Number(t.stockIn.totalQty || 0).toLocaleString()} ${unit}`.trim() },
    { label: 'Stock out', value: `${Number(t.stockOut.totalQty || 0).toLocaleString()} ${unit}`.trim() },
    { label: 'Closing', value: `${Number(t.closing.totalQty || 0).toLocaleString()} ${unit}`.trim() },
    { label: 'Closing value', value: `RWF ${Number(t.closing.amount || 0).toLocaleString()}` },
  ]
}

function rowToExportArray(r) {
  return [
    r.no,
    r.productName,
    r.opening.primaryQty, r.opening.totalQty, r.opening.unitPrice, r.opening.amount,
    r.stockIn.date, r.stockIn.primaryQty, r.stockIn.totalQty, r.stockIn.unitPrice, r.stockIn.amount,
    r.stockOut.date, r.stockOut.primaryQty, r.stockOut.totalQty, r.stockOut.unitPrice, r.stockOut.amount,
    r.closing.primaryQty, r.closing.totalQty, r.closing.unitPrice, r.closing.amount,
  ]
}

const HEADER1 = [
  'No.', 'PRODUCT NAMES',
  'OPENING STOCK', '', '', '',
  'STOCK IN', '', '', '', '',
  'STOCK OUT', '', '', '', '',
  'CLOSING STOCK', '', '', '',
]

const HEADER2 = [
  '', '',
  'PRIMARY QTY', 'TOTAL QTY', 'U.PRICE', 'AMOUNT',
  'DATE IN', 'PRIMARY QTY', 'TOTAL QTY', 'U.PRICE', 'AMOUNT',
  'DATE OUT', 'PRIMARY QTY', 'TOTAL QTY', 'U.PRICE', 'AMOUNT',
  'PRIMARY QTY', 'TOTAL QTY', 'U.PRICE', 'AMOUNT',
]

export function exportStockCountExcel({
  schoolName,
  periodLabel,
  reportTitle,
  rows,
  filename,
  generatedBy,
  reportType,
}) {
  const help = STOCK_COUNT_QTY_HELP[reportType] || STOCK_COUNT_QTY_HELP.finished
  const title = `${String(schoolName || 'SCHOOL').toUpperCase()} ${reportTitle} / ${periodLabel}`
  const meta = metaRows(reportTitle, [
    `Period: ${periodLabel}`,
    generatedBy ? `Prepared by: ${generatedBy}` : '',
    help.primary,
  ], schoolName)

  const body = rows.map(rowToExportArray)
  const ws = XLSX.utils.aoa_to_sheet([...meta, [title], [], HEADER1, HEADER2, ...body])
  ws['!merges'] = [
    { s: { r: meta.length, c: 0 }, e: { r: meta.length, c: 19 } },
    { s: { r: meta.length + 2, c: 2 }, e: { r: meta.length + 2, c: 5 } },
    { s: { r: meta.length + 2, c: 6 }, e: { r: meta.length + 2, c: 10 } },
    { s: { r: meta.length + 2, c: 11 }, e: { r: meta.length + 2, c: 15 } },
    { s: { r: meta.length + 2, c: 16 }, e: { r: meta.length + 2, c: 19 } },
  ]
  ws['!cols'] = [{ wch: 4 }, { wch: 28 }, ...Array(18).fill({ wch: 11 })]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Stock Count')
  downloadWorkbook(wb, filename || `stock-count-${periodLabel.replace(/\s+/g, '-').replace(/→/g, 'to')}.xlsx`)
}

export async function exportStockCountPdf({
  schoolName,
  periodLabel,
  reportTitle,
  rows,
  generatedBy,
  reportType,
  kpis = [],
}) {
  const branding = await mergeSchoolPdfMeta({ orgName: schoolName })
  const help = STOCK_COUNT_QTY_HELP[reportType] || STOCK_COUNT_QTY_HELP.finished
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const meta = {
    ...branding,
    orgName: branding.orgName || schoolName || 'School',
    portalLabel: 'Uniform Manager Portal',
    footerLeft: 'Babyeyi · General Stock Count',
    ref: reportRef('GSC'),
  }

  const subtitle = [
    reportTitle,
    `Period: ${periodLabel}`,
    generatedBy ? `Prepared by: ${generatedBy}` : '',
  ].filter(Boolean).join(' · ')

  let y = pdfHeader(doc, 'General Stock Count', subtitle, true, meta)
  if (kpis.length) y = pdfKpiStrip(doc, kpis, y, true)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...SLATE)
  const note = doc.splitTextToSize(`${help.primary} ${help.dateIn}`, 269)
  doc.text(note, 14, y + 2)
  y += note.length * 3.5 + 4

  autoTable(doc, {
    startY: y,
    head: [
      [
        { content: 'No.', rowSpan: 2, styles: { halign: 'center' } },
        { content: 'Product names', rowSpan: 2 },
        { content: 'Opening stock', colSpan: 4, styles: { halign: 'center' } },
        { content: 'Stock in', colSpan: 5, styles: { halign: 'center' } },
        { content: 'Stock out', colSpan: 5, styles: { halign: 'center' } },
        { content: 'Closing stock', colSpan: 4, styles: { halign: 'center' } },
      ],
      HEADER2.slice(2),
    ],
    body: rows.map(rowToExportArray),
    styles: { ...PDF_TABLE_THEME.styles, fontSize: 6.5, cellPadding: 1.5 },
    headStyles: { ...PDF_TABLE_THEME.headStyles, fontSize: 6 },
    alternateRowStyles: PDF_TABLE_THEME.alternateRowStyles,
    theme: 'grid',
    margin: { left: 8, right: 8 },
  })

  y = (doc.lastAutoTable?.finalY ?? y) + 8
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...NAVY)
  doc.text('Prepared By', 14, y)
  doc.text('Approved By', 110, y)
  doc.text('Signature', 206, y)
  doc.setDrawColor(...NAVY)
  doc.line(14, y + 10, 90, y + 10)
  doc.line(110, y + 10, 186, y + 10)
  doc.line(206, y + 10, 282, y + 10)

  savePdf(doc, `general-stock-count-${periodLabel.replace(/\s+/g, '-').replace(/→/g, 'to')}.pdf`)
}

export { emptyStockBlock, MONTHS, fmtDate }
