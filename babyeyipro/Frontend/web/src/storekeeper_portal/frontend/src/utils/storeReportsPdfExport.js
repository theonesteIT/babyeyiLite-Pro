import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  fmtRwf,
  pdfHeader,
  pdfKpiStrip,
  pdfSectionTitle,
  pdfTable,
  reportRef,
  savePdf,
  stamp,
} from './storeReportExportCommon'
import { mergeSchoolPdfMeta } from './schoolPdfBranding'

const SECTION_TITLES = {
  overview: 'Store Reports — Overview',
  valuation: 'Inventory Valuation Report',
  movements: 'Stock Movement Report',
  uniform: 'Uniform Stock Report',
  food: 'Food Inventory Report',
  other: 'Other Supplies Report',
  'low-stock': 'Low Stock & Alerts Report',
  adjustments: 'Stock Adjustments Report',
}

export async function exportStoreReportsPdf(data, section = 'overview', meta = {}) {
  if (!data) return

  const branding = await mergeSchoolPdfMeta(meta)
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const title = SECTION_TITLES[section] || 'Store Reports'
  const s = data.summary || {}
  const charts = data.charts || {}

  let y = pdfHeader(doc, title, `Section: ${section.replace(/-/g, ' ')}`, false, {
    ref: reportRef('RPT'),
    ...branding,
  })

  const uniformValue = (data.finishedGoods || []).reduce((sum, f) => sum + Number(f.value || 0), 0)
  const foodValue = (data.foodStock || []).reduce((sum, r) => sum + (Number(r.total_cost) || 0), 0)
  const otherValue = (data.otherStock || []).reduce((sum, r) => sum + (Number(r.total_cost) || 0), 0)

  y = pdfKpiStrip(doc, [
    { label: 'Total value', value: fmtRwf(s.totalStockValue) },
    { label: 'Food on hand', value: `${(s.foodRemaining || 0).toLocaleString()} u` },
    { label: 'Other on hand', value: `${(s.otherRemaining || 0).toLocaleString()} u` },
    { label: 'Alerts', value: String((s.foodLow || 0) + (s.otherLow || 0) + (s.invLow || 0)) },
  ], y)

  if (section === 'overview' || section === 'valuation') {
    y = pdfSectionTitle(doc, 'Valuation by area', y)
    y = pdfTable(doc, autoTable, {
      startY: y,
      head: [['Area', 'SKUs / batches', 'Est. value']],
      body: [
        ['Uniform (finished goods)', String((data.finishedGoods || []).length), fmtRwf(uniformValue)],
        ['Food inventory', String((data.foodStock || []).length), fmtRwf(foodValue)],
        ['Other supplies', String((data.otherStock || []).length), fmtRwf(otherValue)],
        ['General inventory', String((data.inventory || []).length), fmtRwf(
          (data.inventory || []).reduce((sum, i) => sum + Number(i.quantity || 0) * (Number(i.unit_cost) || 0), 0)
        )],
      ],
    }) + 6
  }

  if (section === 'movements' || section === 'overview') {
    y = pdfSectionTitle(doc, 'Recent movements', y)
    y = pdfTable(doc, autoTable, {
      startY: y,
      head: [['Date', 'Item', 'Type', 'Qty', 'Balance']],
      body: (data.movements || []).slice(0, 25).map((m) => [
        String(m.movement_date || m.created_at || '').slice(0, 10),
        m.item_name || '—',
        (m.type || '').replace(/_/g, ' '),
        String(m.quantity ?? ''),
        m.stock_after != null ? String(m.stock_after) : '—',
      ]),
    }) + 6
  }

  if (section === 'uniform' || section === 'overview') {
    if (y > 240) { doc.addPage(); y = 20 }
    y = pdfSectionTitle(doc, 'Finished goods', y)
    y = pdfTable(doc, autoTable, {
      startY: y,
      head: [['Uniform', 'Size', 'Stock', 'Price', 'Value']],
      body: (data.finishedGoods || []).slice(0, 20).map((f) => [
        f.uniform_name,
        f.size || '—',
        String(f.stock ?? ''),
        fmtRwf(f.selling_price),
        fmtRwf(f.value),
      ]),
    }) + 6
  }

  if (section === 'food' || section === 'overview') {
    if (y > 240) { doc.addPage(); y = 20 }
    y = pdfSectionTitle(doc, 'Food stock levels', y)
    y = pdfTable(doc, autoTable, {
      startY: y,
      head: [['Item', 'Remaining', 'Status']],
      body: (data.foodLevels || []).slice(0, 15).map((l) => [
        l.item_name,
        `${l.remaining} ${l.unit_type || ''}`,
        l.status,
      ]),
    }) + 6
  }

  if (section === 'other' || section === 'overview') {
    if (y > 240) { doc.addPage(); y = 20 }
    y = pdfSectionTitle(doc, 'Other supplies by category', y)
    y = pdfTable(doc, autoTable, {
      startY: y,
      head: [['Category', 'Items', 'Remaining', 'Value']],
      body: (charts.otherByCategory || []).map((c) => [
        c.name,
        String(c.items ?? ''),
        String(c.remaining ?? ''),
        fmtRwf(c.value),
      ]),
    }) + 6
  }

  if (section === 'low-stock') {
    const lowRows = []
    for (const i of data.inventory || []) {
      if (i.reorder_level > 0 && i.quantity <= i.reorder_level) {
        lowRows.push(['General', i.name, String(i.quantity), String(i.reorder_level)])
      }
    }
    for (const l of data.foodLevels || []) {
      if (l.status !== 'Normal') lowRows.push(['Food', l.item_name, String(l.remaining), String(l.reorder_level || '—')])
    }
    for (const l of data.otherLevels || []) {
      if (l.status !== 'Normal') lowRows.push(['Other', l.item_name, String(l.remaining), String(l.reorder_level || '—')])
    }
    y = pdfSectionTitle(doc, 'Items below reorder level', y)
    pdfTable(doc, autoTable, {
      startY: y,
      head: [['Area', 'Item', 'Current', 'Min level']],
      body: lowRows.length ? lowRows : [['—', 'No low stock items', '—', '—']],
    })
  }

  if (section === 'adjustments') {
    y = pdfSectionTitle(doc, 'Adjustment log', y)
    pdfTable(doc, autoTable, {
      startY: y,
      head: [['Date', 'Item', 'Mode', 'Qty', 'Reason']],
      body: (data.adjustments || []).slice(0, 30).map((a) => [
        String(a.adjustment_date || a.created_at || '').slice(0, 10),
        a.item_name || '—',
        a.mode || '—',
        String(a.quantity ?? ''),
        a.reason || '—',
      ]),
    })
  }

  savePdf(doc, `store-${section}-report-${stamp()}.pdf`)
}
