import * as XLSX from 'xlsx'

function formatDate(d) {
  if (!d) return '—'
  return String(d).slice(0, 10)
}

function stamp() {
  return new Date().toISOString().slice(0, 10)
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
  XLSX.utils.book_append_sheet(wb, ws, 'Fabric Stock Out')
  downloadWorkbook(wb, `fabric-stock-out-${stamp()}.xlsx`)
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

export function exportFinishedGoodsExcel(rows, filters = {}) {
  const filterParts = []
  if (filters.search) filterParts.push(`Search: ${filters.search}`)
  if (filters.uniform) filterParts.push(`Uniform: ${filters.uniform}`)

  const data = [
    ...metaRows('Finished Goods Stock', filterParts),
    ['Uniform', 'Size', 'Fabric', 'Color', 'Stock', 'Purchase Cost', 'Selling Price', 'Stock Value', 'Academic Year', 'Term'],
    ...(rows || []).map((g) => [
      g.uniform_name || '',
      g.size || '',
      g.fabric_type || g.sheet_label || '',
      g.fabric_color || '',
      Number(g.stock) || 0,
      Number(g.purchase_cost) || 0,
      Number(g.selling_price) || 0,
      Number(g.value) || (Number(g.stock) || 0) * (Number(g.selling_price) || 0),
      g.academic_year || '',
      g.term || '',
    ]),
    [],
    [
      'Summary',
      '',
      '',
      '',
      rows.reduce((s, g) => s + (Number(g.stock) || 0), 0),
      '',
      '',
      rows.reduce((s, g) => s + (Number(g.value) || (Number(g.stock) || 0) * (Number(g.selling_price) || 0)), 0),
      '',
      `${rows.length} item(s)`,
    ],
  ]

  const ws = XLSX.utils.aoa_to_sheet(data)
  ws['!cols'] = [
    { wch: 18 }, { wch: 8 }, { wch: 16 }, { wch: 10 }, { wch: 10 },
    { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 10 },
  ]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Finished Goods')
  downloadWorkbook(wb, `finished-goods-${stamp()}.xlsx`)
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
