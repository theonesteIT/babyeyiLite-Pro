import {
  DEFAULT_MIN_STOCK,
  fmtDate,
  fmtMoney,
  fmtNum,
  itemCode,
  grnCode,
  inDateRange,
  stockStatusMeta,
  urgencyMeta,
  monthKey,
  monthLabel,
  filterRows,
} from './reportUtils'

function sum(arr, key) {
  return arr.reduce((s, r) => s + (Number(r[key]) || 0), 0)
}

function finishedGoodCostMap(goods) {
  const byId = new Map()
  const byName = new Map()
  for (const g of goods || []) {
    byId.set(Number(g.id), Number(g.purchase_cost) || 0)
    const label = `${g.uniform_name} (${g.size})`.trim().toLowerCase()
    byName.set(label, Number(g.purchase_cost) || 0)
    byName.set(String(g.uniform_name || '').trim().toLowerCase(), Number(g.purchase_cost) || 0)
  }
  return { byId, byName }
}

function unitCostForLine(line, costMaps) {
  const fromId = costMaps.byId.get(Number(line.finished_good_id))
  if (fromId != null && fromId > 0) return fromId
  const name = String(line.item_name || '').trim().toLowerCase()
  return costMaps.byName.get(name) || 0
}

function unitCostForItemName(itemName, costMaps) {
  const name = String(itemName || '').trim().toLowerCase()
  return costMaps.byName.get(name) || 0
}

function profitLossMeta(amount) {
  const n = Number(amount) || 0
  if (n > 0) {
    return { profit_loss: n, result: 'Profit', resultEmoji: '🟢', tone: 'profit' }
  }
  if (n < 0) {
    return { profit_loss: n, result: 'Loss', resultEmoji: '🔴', tone: 'loss' }
  }
  return { profit_loss: 0, result: 'Break-even', resultEmoji: '⚪', tone: 'neutral' }
}

function enrichSalesRow(base, qty, revenue, unitCost, soldUnitPrice) {
  const purchaseQty = Number(qty) || 0
  const soldQty = Number(qty) || 0
  const income = Number(revenue) || 0
  const purchasePrice = Number(unitCost) || 0
  const soldPrice = soldUnitPrice != null
    ? Number(soldUnitPrice) || 0
    : (soldQty ? Math.round(income / soldQty) : 0)
  const totalCost = purchaseQty * purchasePrice
  const pl = income - totalCost
  return {
    ...base,
    purchase_qty: purchaseQty,
    purchase_price: purchasePrice,
    sold_qty: soldQty,
    sold_price: soldPrice,
    unit: base.unit || 'pcs',
    unit_cost: purchasePrice,
    total_cost: totalCost,
    ...profitLossMeta(pl),
  }
}

function fabricStockInPeriod(fabrics, filters) {
  return fabrics.filter((f) => inDateRange(f.purchase_date, filters.from, filters.to))
}

function issuesInPeriod(issues, filters) {
  return issues.filter((i) => inDateRange(i.issue_date || i.created_at, filters.from, filters.to))
}

function buildInventoryStock(bundle, filters) {
  const minStock = Number(filters.minStock) || DEFAULT_MIN_STOCK
  const rows = bundle.finishedGoods.map((g) => {
    const status = stockStatusMeta(g.stock, minStock)
    const stockIn = Math.max(0, g.stock + g.sold_qty - g.opening_stock)
    return {
      code: itemCode(g.id),
      uniform_name: g.uniform_name,
      category: g.uniform_name,
      size: g.size,
      color: g.fabric_color || '—',
      opening_stock: g.opening_stock,
      stock_in: stockIn,
      stock_out: g.sold_qty,
      current_stock: g.stock,
      unit_price: g.purchase_cost || g.selling_price,
      stock_value: g.value || g.stock * (g.selling_price || g.purchase_cost),
      min_stock: minStock,
      supplier: g.fabric_type || '—',
      statusLabel: status.label,
      statusEmoji: status.emoji,
      status: status.label,
    }
  })
  const filtered = filterRows(rows, filters, ['code', 'uniform_name', 'category', 'size', 'color', 'supplier'])
  const columns = [
    { key: 'code', label: 'Item Code' },
    { key: 'uniform_name', label: 'Uniform Name' },
    { key: 'category', label: 'Category' },
    ...(filters.showSize ? [{ key: 'size', label: 'Size' }] : []),
    { key: 'color', label: 'Color' },
    { key: 'opening_stock', label: 'Opening Stock', align: 'right' },
    { key: 'stock_in', label: 'Stock In', align: 'right' },
    { key: 'stock_out', label: 'Stock Out', align: 'right' },
    { key: 'current_stock', label: 'Current Stock', align: 'right' },
    { key: 'unit_price', label: 'Unit Price', align: 'right', format: 'money' },
    { key: 'stock_value', label: 'Stock Value', align: 'right', format: 'money' },
    { key: 'min_stock', label: 'Minimum Stock', align: 'right' },
    { key: 'status', label: 'Status' },
  ]
  const kpis = [
    { key: 'items', label: 'Total Uniform Items', value: filtered.length },
    { key: 'stock', label: 'Current Stock', value: `${fmtNum(sum(filtered, 'current_stock'))} pcs` },
    { key: 'value', label: 'Inventory Value', value: fmtMoney(sum(filtered, 'stock_value')) },
    { key: 'low', label: 'Low Stock Items', value: filtered.filter((r) => r.current_stock < minStock).length, warn: true },
  ]
  const charts = [
    {
      id: 'category-value',
      title: 'Inventory Value by Category',
      type: 'pie',
      data: Object.entries(
        filtered.reduce((acc, r) => {
          const k = r.uniform_name || 'Other'
          acc[k] = (acc[k] || 0) + Number(r.stock_value || 0)
          return acc
        }, {})
      ).map(([name, value]) => ({ name, value })).slice(0, 8),
    },
    {
      id: 'stock-status',
      title: 'Stock Status',
      type: 'bar',
      data: [
        { name: 'In Stock', value: filtered.filter((r) => r.current_stock >= minStock * 2).length },
        { name: 'Low', value: filtered.filter((r) => r.current_stock >= minStock && r.current_stock < minStock * 2).length },
        { name: 'Critical', value: filtered.filter((r) => r.current_stock > 0 && r.current_stock < minStock).length },
        { name: 'Out', value: filtered.filter((r) => r.current_stock <= 0).length },
      ],
    },
  ]
  return { columns, rows: filtered, kpis, charts, summary: {} }
}

function finishedStockInPeriod(goods, filters) {
  return (goods || []).filter((g) => inDateRange(g.created_at, filters.from, filters.to))
}

function buildStockIn(bundle, filters) {
  const rows = []

  for (const f of fabricStockInPeriod(bundle.fabrics, filters)) {
    rows.push({
      date: fmtDate(f.purchase_date),
      stock_type: 'Fabric',
      grn: grnCode(f.id),
      supplier: f.supplier_name || '—',
      item: `${f.fabric_type}${f.color ? ` (${f.color})` : ''}`,
      size: '—',
      quantity: f.meters,
      unit: 'm',
      unit_cost: f.unit_cost,
      total_cost: f.total_cost,
      received_by: 'Store Manager',
      invoice: f.invoice_number || '—',
      remarks: f.note || '',
    })
  }

  for (const g of finishedStockInPeriod(bundle.finishedGoods, filters)) {
    const qty = Number(g.opening_stock) || Number(g.stock) || 0
    const unitCost = Number(g.purchase_cost) || Number(g.selling_price) || 0
    rows.push({
      date: fmtDate(g.created_at),
      stock_type: 'Finished uniform',
      grn: itemCode(g.id),
      supplier: g.fabric_type || 'Production',
      item: `${g.uniform_name}${filters.showSize && g.size ? ` (${g.size})` : ''}`,
      size: g.size || '—',
      quantity: qty,
      unit: 'pcs',
      unit_cost: unitCost,
      total_cost: qty * unitCost,
      received_by: 'Uniform Manager',
      invoice: itemCode(g.id),
      remarks: g.note || '',
    })
  }

  rows.sort((a, b) => String(a.date).localeCompare(String(b.date)))
  const filtered = filterRows(rows, filters, ['grn', 'supplier', 'item', 'invoice', 'stock_type'])
  const fabricQty = filtered.filter((r) => r.unit === 'm').reduce((s, r) => s + Number(r.quantity || 0), 0)
  const finishedQty = filtered.filter((r) => r.unit === 'pcs').reduce((s, r) => s + Number(r.quantity || 0), 0)
  const columns = [
    { key: 'date', label: 'Date' },
    { key: 'stock_type', label: 'Type' },
    { key: 'grn', label: 'GRN / Ref' },
    { key: 'supplier', label: 'Supplier' },
    { key: 'item', label: 'Item' },
    ...(filters.showSize ? [{ key: 'size', label: 'Size' }] : []),
    { key: 'quantity', label: 'Quantity', align: 'right' },
    { key: 'unit', label: 'Unit' },
    { key: 'unit_cost', label: 'Unit Cost', align: 'right', format: 'money' },
    { key: 'total_cost', label: 'Total Cost', align: 'right', format: 'money' },
    { key: 'received_by', label: 'Received By' },
    { key: 'invoice', label: 'Invoice' },
  ]
  const kpis = [
    { key: 'fabric', label: 'Fabric received', value: `${fmtNum(fabricQty)} m` },
    { key: 'finished', label: 'Uniforms registered', value: `${fmtNum(finishedQty)} pcs` },
    { key: 'total', label: 'Total cost', value: fmtMoney(sum(filtered, 'total_cost')) },
    { key: 'records', label: 'Records', value: filtered.length },
  ]
  return { columns, rows: filtered, kpis, charts: [], summary: {} }
}

function fabricUnitCost(bundle, receiptId) {
  const r = (bundle.fabrics || []).find((f) => Number(f.id) === Number(receiptId))
  return Number(r?.unit_cost) || 0
}

function buildStockOut(bundle, filters) {
  const rows = resolveIssueLines(bundle, filters).map((line) => ({
    date: fmtDate(line.issue_date || line.issue_created_at),
    issue_no: line.issue_no || '—',
    recipient: line.student_name || line.student_uid || '—',
    class_name: line.class_name || '—',
    item: line.item_name || 'Uniform',
    size: '—',
    qty: line.quantity,
    unit_price: line.unit_price,
    amount: line.amount,
    issued_by: line.issued_by_name || 'Uniform Manager',
    reason: 'Student issue',
    issue_type: 'Student',
  }))

  if (!rows.length) {
    for (const issue of issuesInPeriod(bundle.issues, filters)) {
      rows.push({
        date: fmtDate(issue.issue_date || issue.created_at),
        issue_no: issue.issue_no,
        recipient: issue.class_name || '—',
        class_name: issue.class_name,
        item: 'Uniform batch',
        size: '—',
        qty: issue.total_pieces || 0,
        unit_price: issue.total_pieces ? Math.round(Number(issue.total_amount || 0) / Number(issue.total_pieces)) : 0,
        amount: issue.total_amount || 0,
        issued_by: issue.issued_by_name || 'Uniform Manager',
        reason: 'Distribution',
        issue_type: 'Class',
      })
    }
  }

  for (const o of (bundle.stockouts || []).filter((s) => inDateRange(s.out_date, filters.from, filters.to))) {
    const unitCost = fabricUnitCost(bundle, o.fabric_receipt_id)
    const meters = Number(o.meters_out || 0)
    rows.push({
      date: fmtDate(o.out_date),
      issue_no: `FAB-OUT-${o.id}`,
      recipient: o.purpose || 'Production',
      class_name: '—',
      item: `${o.fabric_type || 'Fabric'}${o.color ? ` (${o.color})` : ''}`,
      size: '—',
      qty: meters,
      unit_price: unitCost,
      amount: meters * unitCost,
      issued_by: 'Storekeeper',
      reason: o.purpose || 'Fabric stock out',
      issue_type: 'Fabric',
    })
  }

  rows.sort((a, b) => String(a.date).localeCompare(String(b.date)))
  const filtered = filterRows(rows, filters, ['issue_no', 'recipient', 'item', 'class_name', 'issue_type'])
  const uniformQty = filtered.filter((r) => r.issue_type !== 'Fabric').reduce((s, r) => s + Number(r.qty || 0), 0)
  const fabricQty = filtered.filter((r) => r.issue_type === 'Fabric').reduce((s, r) => s + Number(r.qty || 0), 0)
  const columns = [
    { key: 'date', label: 'Date' },
    { key: 'issue_no', label: 'Reference' },
    { key: 'issue_type', label: 'Type' },
    { key: 'recipient', label: 'Student / Recipient' },
    { key: 'class_name', label: 'Class' },
    { key: 'item', label: 'Item' },
    ...(filters.showSize ? [{ key: 'size', label: 'Size' }] : []),
    { key: 'qty', label: 'Qty', align: 'right' },
    { key: 'amount', label: 'Amount', align: 'right', format: 'money' },
    { key: 'issued_by', label: 'Issued By' },
    { key: 'reason', label: 'Reason' },
  ]
  const kpis = [
    { key: 'uniform', label: 'Uniforms issued', value: `${fmtNum(uniformQty)} pcs` },
    { key: 'fabric', label: 'Fabric out', value: `${fmtNum(fabricQty)} m` },
    { key: 'records', label: 'Records', value: filtered.length },
    { key: 'classes', label: 'Classes', value: new Set(filtered.map((r) => r.class_name).filter((c) => c && c !== '—')).size },
  ]
  return { columns, rows: filtered, kpis, charts: [], summary: {} }
}

function buildStockMovement(bundle, filters) {
  const rows = []

  for (const g of finishedStockInPeriod(bundle.finishedGoods, filters)) {
    const qty = Number(g.opening_stock) || Number(g.stock) || 0
    rows.push({
      date: fmtDate(g.created_at),
      item: `${g.uniform_name}${g.size ? ` (${g.size})` : ''}`,
      type: 'Uniform In',
      reference: itemCode(g.id),
      in_qty: qty,
      out_qty: '',
      balance: qty,
      user: 'Uniform Manager',
    })
  }

  for (const f of fabricStockInPeriod(bundle.fabrics, filters)) {
    rows.push({
      date: fmtDate(f.purchase_date),
      item: `${f.fabric_type}${f.color ? ` (${f.color})` : ''}`,
      type: 'Fabric In',
      reference: grnCode(f.id),
      in_qty: f.meters,
      out_qty: '',
      balance: f.remaining_meters ?? '',
      user: 'Store Manager',
    })
  }

  for (const o of (bundle.stockouts || []).filter((s) => inDateRange(s.out_date, filters.from, filters.to))) {
    rows.push({
      date: fmtDate(o.out_date),
      item: `${o.fabric_type || 'Fabric'}${o.color ? ` (${o.color})` : ''}`,
      type: 'Fabric Out',
      reference: `OUT-${o.id}`,
      in_qty: '',
      out_qty: o.meters_out,
      balance: o.remaining_after,
      user: 'Storekeeper',
    })
  }

  for (const line of resolveIssueLines(bundle, filters)) {
    rows.push({
      date: fmtDate(line.issue_date || line.issue_created_at),
      item: line.item_name || 'Uniform',
      type: 'Uniform Out',
      reference: line.issue_no || `ISS-${line.issue_id}`,
      in_qty: '',
      out_qty: line.quantity,
      balance: '',
      user: line.issued_by_name || 'Uniform Manager',
    })
  }

  rows.sort((a, b) => String(a.date).localeCompare(String(b.date)))
  const filtered = filterRows(rows, filters, ['item', 'reference', 'type'])
  const inTotal = filtered.reduce((s, r) => s + (Number(r.in_qty) || 0), 0)
  const outTotal = filtered.reduce((s, r) => s + (Number(r.out_qty) || 0), 0)
  const columns = [
    { key: 'date', label: 'Date' },
    { key: 'item', label: 'Item' },
    { key: 'type', label: 'Type' },
    { key: 'reference', label: 'Reference' },
    { key: 'in_qty', label: 'In', align: 'right' },
    { key: 'out_qty', label: 'Out', align: 'right' },
    { key: 'balance', label: 'Balance', align: 'right' },
    { key: 'user', label: 'User' },
  ]
  const kpis = [
    { key: 'movements', label: 'Movements', value: filtered.length },
    { key: 'in', label: 'Total in (units)', value: fmtNum(inTotal) },
    { key: 'out', label: 'Total out (units)', value: fmtNum(outTotal) },
  ]
  return { columns, rows: filtered, kpis, charts: [], summary: {} }
}

function buildInventoryValuation(bundle, filters) {
  const rows = bundle.finishedGoods.map((g) => ({
    item: g.uniform_name + (filters.showSize && g.size ? ` (${g.size})` : ''),
    qty: g.stock,
    unit_price: g.purchase_cost || g.selling_price,
    total_value: g.value || g.stock * (g.selling_price || g.purchase_cost),
  }))
  const filtered = filterRows(rows, filters, ['item'])
  const total = sum(filtered, 'total_value')
  const columns = [
    { key: 'item', label: 'Item' },
    { key: 'qty', label: 'Qty', align: 'right' },
    { key: 'unit_price', label: 'Unit Price', align: 'right', format: 'money' },
    { key: 'total_value', label: 'Total Value', align: 'right', format: 'money' },
  ]
  const kpis = [{ key: 'total', label: 'Total Inventory Value', value: fmtMoney(total) }]
  const charts = [{
    id: 'value-bar',
    title: 'Inventory Value by Item',
    type: 'bar',
    data: filtered.slice(0, 10).map((r) => ({ name: r.item, value: r.total_value })),
  }]
  return { columns, rows: filtered, kpis, charts, summary: { totalInventoryValue: total } }
}

function buildLowStock(bundle, filters) {
  const minStock = Number(filters.minStock) || DEFAULT_MIN_STOCK
  const rows = bundle.finishedGoods
    .filter((g) => Number(g.stock) < minStock)
    .map((g) => {
      const needed = Math.max(0, minStock - Number(g.stock))
      const urg = urgencyMeta(needed)
      return {
        item: g.uniform_name + (filters.showSize && g.size ? ` (${g.size})` : ''),
        current_stock: g.stock,
        min_stock: minStock,
        needed,
        status: `${urg.emoji} ${urg.label}`,
        statusLabel: urg.label,
      }
    })
    .sort((a, b) => a.current_stock - b.current_stock)
  const filtered = filterRows(rows, filters, ['item'])
  const columns = [
    { key: 'item', label: 'Item' },
    { key: 'current_stock', label: 'Current Stock', align: 'right' },
    { key: 'min_stock', label: 'Minimum Stock', align: 'right' },
    { key: 'needed', label: 'Needed', align: 'right' },
    { key: 'status', label: 'Status' },
  ]
  const kpis = [{ key: 'low', label: 'Low Stock Items', value: filtered.length, warn: true }]
  return { columns, rows: filtered, kpis, charts: [], summary: {} }
}

function buildExpensiveItems(bundle, filters) {
  const rows = bundle.finishedGoods
    .map((g) => ({
      item: g.uniform_name + (filters.showSize && g.size ? ` (${g.size})` : ''),
      qty: g.stock,
      unit_price: g.selling_price || g.purchase_cost,
      total_value: g.value || g.stock * (g.selling_price || g.purchase_cost),
    }))
    .sort((a, b) => b.total_value - a.total_value)
  const filtered = filterRows(rows, filters, ['item']).slice(0, 50)
  const columns = [
    { key: 'item', label: 'Item' },
    { key: 'qty', label: 'Qty', align: 'right' },
    { key: 'unit_price', label: 'Unit Price', align: 'right', format: 'money' },
    { key: 'total_value', label: 'Total Value', align: 'right', format: 'money' },
  ]
  return { columns, rows: filtered, kpis: [], charts: [], summary: {} }
}

function buildSupplierPurchases(bundle, filters) {
  const map = new Map()
  for (const f of fabricStockInPeriod(bundle.fabrics, filters)) {
    const name = f.supplier_name || 'Unknown'
    const cur = map.get(name) || { supplier: name, purchases: 0, total_amount: 0, last_purchase: '' }
    cur.purchases += 1
    cur.total_amount += Number(f.total_cost) || 0
    const d = String(f.purchase_date || '')
    if (d > cur.last_purchase) cur.last_purchase = d
    map.set(name, cur)
  }
  const rows = [...map.values()]
    .map((r) => ({ ...r, last_purchase: fmtDate(r.last_purchase) }))
    .sort((a, b) => b.total_amount - a.total_amount)
  const filtered = filterRows(rows, filters, ['supplier'])
  const columns = [
    { key: 'supplier', label: 'Supplier' },
    { key: 'purchases', label: 'Purchases', align: 'right' },
    { key: 'total_amount', label: 'Total Amount', align: 'right', format: 'money' },
    { key: 'last_purchase', label: 'Last Purchase' },
  ]
  const kpis = [
    { key: 'suppliers', label: 'Suppliers', value: filtered.length },
    { key: 'total', label: 'Total Purchases', value: fmtMoney(sum(filtered, 'total_amount')) },
  ]
  return { columns, rows: filtered, kpis, charts: [], summary: {} }
}

function buildStudentDistribution(bundle, filters) {
  const rows = resolveIssueLines(bundle, filters).map((line) => ({
    student_id: line.student_uid || line.student_id,
    student_name: line.student_name,
    class_name: line.class_name,
    item: line.item_name || 'Uniform',
    qty: line.quantity,
    date: fmtDate(line.issue_date || line.issue_created_at),
  }))
  const filtered = filterRows(rows, filters, ['student_id', 'student_name', 'item', 'class_name'])
  const columns = [
    { key: 'student_id', label: 'Student ID' },
    { key: 'student_name', label: 'Student Name' },
    { key: 'class_name', label: 'Class' },
    { key: 'item', label: 'Item' },
    { key: 'qty', label: 'Qty', align: 'right' },
    { key: 'date', label: 'Date' },
  ]
  const kpis = [
    { key: 'students', label: 'Students Served', value: new Set(filtered.map((r) => r.student_id)).size },
    { key: 'pieces', label: 'Uniforms Issued', value: fmtNum(sum(filtered, 'qty')) },
  ]
  return { columns, rows: filtered, kpis, charts: [], summary: {} }
}

function buildPlaceholder(slug, title, columns) {
  return {
    columns,
    rows: [],
    kpis: [],
    charts: [],
    summary: {},
    placeholder: true,
    placeholderMessage: `No ${title.toLowerCase()} records yet. Data will appear here when ${title.toLowerCase()} entries are recorded in the system.`,
  }
}

function buildMonthlySummary(bundle, filters) {
  const months = new Map()
  const add = (key, field, val) => {
    const cur = months.get(key) || { month: monthLabel(key), opening: 0, purchased: 0, issued: 0, returned: 0, adjusted: 0, closing: 0 }
    cur[field] += Number(val) || 0
    months.set(key, cur)
  }
  for (const f of bundle.fabrics) {
    const k = monthKey(f.purchase_date)
    add(k, 'purchased', f.meters)
  }
  for (const issue of bundle.issues) {
    const k = monthKey(issue.issue_date || issue.created_at)
    add(k, 'issued', issue.total_pieces || 0)
  }
  const openingTotal = sum(bundle.finishedGoods, 'opening_stock')
  const closingTotal = sum(bundle.finishedGoods, 'stock')
  const rows = [...months.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, r]) => r)
  if (!rows.length) {
    rows.push({
      month: monthLabel(monthKey(filters.from)),
      opening: openingTotal,
      purchased: sum(fabricStockInPeriod(bundle.fabrics, filters), 'meters'),
      issued: sum(issuesInPeriod(bundle.issues, filters), 'total_pieces'),
      returned: 0,
      adjusted: 0,
      closing: closingTotal,
    })
  }
  const columns = [
    { key: 'month', label: 'Month' },
    { key: 'opening', label: 'Opening', align: 'right' },
    { key: 'purchased', label: 'Purchased', align: 'right' },
    { key: 'issued', label: 'Issued', align: 'right' },
    { key: 'returned', label: 'Returned', align: 'right' },
    { key: 'adjusted', label: 'Adjusted', align: 'right' },
    { key: 'closing', label: 'Closing', align: 'right' },
  ]
  return { columns, rows, kpis: [], charts: [], summary: {} }
}

function buildDashboard(bundle, filters) {
  const minStock = Number(filters.minStock) || DEFAULT_MIN_STOCK
  const stockIn = sum(fabricStockInPeriod(bundle.fabrics, filters), 'meters')
  const stockOut = sum(issuesInPeriod(bundle.issues, filters), 'total_pieces')
  const invValue = sum(bundle.finishedGoods, 'value')
  const lowCount = bundle.finishedGoods.filter((g) => g.stock < minStock).length
  const suppliers = new Set(bundle.fabrics.map((f) => f.supplier_name).filter(Boolean)).size
  const kpis = [
    { key: 'items', label: 'Total Uniform Items', value: bundle.finishedGoods.length, icon: 'package' },
    { key: 'stock', label: 'Current Stock', value: `${fmtNum(sum(bundle.finishedGoods, 'stock'))} pcs`, icon: 'shirt' },
    { key: 'in', label: 'Stock Received', value: `${fmtNum(stockIn)} m`, icon: 'in' },
    { key: 'out', label: 'Stock Issued', value: `${fmtNum(stockOut)} pcs`, icon: 'out' },
    { key: 'low', label: 'Low Stock Items', value: lowCount, warn: true, icon: 'alert' },
    { key: 'value', label: 'Inventory Value', value: fmtMoney(invValue), icon: 'money' },
    { key: 'suppliers', label: 'Suppliers', value: suppliers, icon: 'truck' },
    { key: 'students', label: 'Students Served', value: bundle.analytics?.students_served || 0, icon: 'users' },
  ]
  const inByMonth = {}
  const outByMonth = {}
  for (const f of bundle.fabrics) {
    const k = monthLabel(monthKey(f.purchase_date))
    inByMonth[k] = (inByMonth[k] || 0) + Number(f.meters || 0)
  }
  for (const issue of bundle.issues) {
    const k = monthLabel(monthKey(issue.issue_date || issue.created_at))
    outByMonth[k] = (outByMonth[k] || 0) + Number(issue.total_pieces || 0)
  }
  const months = [...new Set([...Object.keys(inByMonth), ...Object.keys(outByMonth)])].sort()
  const charts = [
    {
      id: 'in-out',
      title: 'Monthly Stock In vs Stock Out',
      type: 'movement',
      data: months.map((m) => ({ month: m, in: inByMonth[m] || 0, out: outByMonth[m] || 0 })),
    },
    {
      id: 'category',
      title: 'Uniform Distribution by Category',
      type: 'pie',
      data: (bundle.analytics?.top_items || []).map((t) => ({ name: t.item_name, value: t.pieces })),
    },
    {
      id: 'value-cat',
      title: 'Inventory Value by Category',
      type: 'bar',
      data: bundle.finishedGoods.slice(0, 8).map((g) => ({
        name: g.uniform_name,
        value: g.value || g.stock * g.selling_price,
      })),
    },
  ]
  return { columns: [], rows: [], kpis, charts, summary: {}, dashboard: true }
}

function buildSalesIncome(bundle, filters) {
  const costMaps = finishedGoodCostMap(bundle.finishedGoods)
  const rows = resolveIssueLines(bundle, filters).map((line) => enrichSalesRow({
    invoice_no: line.issue_no || `ISS-${line.issue_id}`,
    date: fmtDate(line.issue_date || line.issue_created_at),
    student: line.student_name || line.student_uid || '—',
    class_name: line.class_name || '—',
    item: line.item_name || 'Uniform',
    total_income: line.amount,
    payment_method: 'Student charge',
    cashier: line.issued_by_name || 'Uniform Manager',
    unit: 'pcs',
  }, line.quantity, line.amount, unitCostForLine(line, costMaps), line.unit_price))

  if (!rows.length && bundle.analytics?.top_items?.length) {
    for (const t of bundle.analytics.top_items) {
      const unitCost = unitCostForItemName(t.item_name, costMaps)
      rows.push(enrichSalesRow({
        invoice_no: '—',
        date: fmtDate(filters.to),
        student: '—',
        class_name: '—',
        item: t.item_name,
        total_income: t.revenue,
        payment_method: '—',
        cashier: 'Uniform Manager',
        unit: 'pcs',
      }, t.pieces, t.revenue, unitCost, t.pieces ? Math.round(t.revenue / t.pieces) : 0))
    }
  }

  rows.sort((a, b) => String(a.date).localeCompare(String(b.date)))
  const filtered = filterRows(rows, filters, ['invoice_no', 'student', 'item', 'class_name', 'result'])
  const a = bundle.analytics || {}
  const profitRows = filtered.filter((r) => r.result === 'Profit')
  const lossRows = filtered.filter((r) => r.result === 'Loss')
  const netPl = sum(filtered, 'profit_loss')
  const columns = [
    { key: 'item', label: 'Product' },
    { key: 'invoice_no', label: 'Reference' },
    { key: 'date', label: 'Date' },
    { key: 'student', label: 'Student' },
    { key: 'class_name', label: 'Class' },
    { key: 'purchase_qty', label: 'Purchase Qty', align: 'right' },
    { key: 'purchase_price', label: 'Purchase Price', align: 'right', format: 'money' },
    { key: 'sold_qty', label: 'Sold Qty', align: 'right' },
    { key: 'sold_price', label: 'Sold Price', align: 'right', format: 'money' },
    { key: 'unit', label: 'Unit' },
    { key: 'total_cost', label: 'Total Cost', align: 'right', format: 'money' },
    { key: 'total_income', label: 'Revenue', align: 'right', format: 'money' },
    { key: 'profit_loss', label: 'Profit / Loss', align: 'right', format: 'money' },
    { key: 'result', label: 'Status' },
    { key: 'payment_method', label: 'Payment Method' },
    { key: 'cashier', label: 'Issued By' },
  ]
  const kpis = [
    { key: 'sales', label: 'Total Sales', value: fmtMoney(sum(filtered, 'total_income') || a.total_sales) },
    { key: 'cost', label: 'Total Cost', value: fmtMoney(sum(filtered, 'total_cost')) },
    { key: 'net', label: 'Net Profit / Loss', value: fmtMoney(netPl), warn: netPl < 0 },
    { key: 'profit_lines', label: 'Profit rows', value: profitRows.length },
    { key: 'loss_lines', label: 'Loss rows', value: lossRows.length, warn: lossRows.length > 0 },
  ]
  return { columns, rows: filtered, kpis, charts: [], summary: { netProfitLoss: netPl } }
}

const PL_COLUMNS = [
  { key: 'item', label: 'Product' },
  { key: 'reference', label: 'Reference' },
  { key: 'purchase_qty', label: 'Purchase Qty', align: 'right' },
  { key: 'purchase_price', label: 'Purchase Price', align: 'right', format: 'money' },
  { key: 'sold_qty', label: 'Sold Qty', align: 'right' },
  { key: 'sold_price', label: 'Sold Price', align: 'right', format: 'money' },
  { key: 'unit', label: 'Unit' },
  { key: 'total_cost', label: 'Total Cost', align: 'right', format: 'money' },
  { key: 'revenue', label: 'Revenue', align: 'right', format: 'money' },
  { key: 'profit_loss', label: 'Profit / Loss', align: 'right', format: 'money' },
  { key: 'result', label: 'Status' },
]

function plRow({
  item,
  reference,
  unit,
  purchaseQty,
  purchasePrice,
  soldQty,
  soldPrice,
  revenue,
  totalCost,
}) {
  const pq = Number(purchaseQty) || 0
  const sq = Number(soldQty) || 0
  const pp = Number(purchasePrice) || 0
  const sp = Number(soldPrice) || 0
  const total_cost = totalCost != null ? Number(totalCost) : pq * pp
  const rev = revenue != null ? Number(revenue) : sq * sp
  const pl = rev - total_cost
  return {
    item,
    reference,
    unit,
    purchase_qty: pq || '',
    purchase_price: pp || '',
    sold_qty: sq || '',
    sold_price: sp || '',
    total_cost,
    revenue: rev,
    ...profitLossMeta(pl),
  }
}

function sectionSubtotal(label, rows) {
  const dataRows = rows.filter((r) => !r._isSubtotal)
  const pl = sum(dataRows, 'profit_loss')
  return {
    _isSubtotal: true,
    item: label,
    reference: '',
    purchase_qty: sum(dataRows, 'purchase_qty'),
    purchase_price: '',
    sold_qty: sum(dataRows, 'sold_qty'),
    sold_price: '',
    unit: '',
    total_cost: sum(dataRows, 'total_cost'),
    revenue: sum(dataRows, 'revenue'),
    profit_loss: pl,
    ...profitLossMeta(pl),
  }
}

function sectionKpis(rows, prefix = '') {
  const dataRows = rows.filter((r) => !r._isSubtotal)
  const pl = sum(dataRows, 'profit_loss')
  const profitCount = dataRows.filter((r) => r.result === 'Profit').length
  const lossCount = dataRows.filter((r) => r.result === 'Loss').length
  return [
    { key: 'rev', label: `${prefix}Revenue`, value: fmtMoney(sum(dataRows, 'revenue')) },
    { key: 'cost', label: `${prefix}Cost`, value: fmtMoney(sum(dataRows, 'total_cost')) },
    { key: 'pl', label: `${prefix}Profit / Loss`, value: fmtMoney(pl), warn: pl < 0 },
    { key: 'status', label: 'Profit / Loss rows', value: `${profitCount} / ${lossCount}` },
  ]
}

function resolveIssueLines(bundle, filters) {
  return (bundle.issueLines || []).filter((line) => {
    const date = line.issue_date || line.issue_created_at
    if (!inDateRange(date, filters.from, filters.to)) return false
    if (filters.className && String(line.class_name || '').trim() !== String(filters.className).trim()) {
      return false
    }
    return true
  })
}

function buildFinishedProfitRows(bundle, filters, costMaps) {
  const lines = resolveIssueLines(bundle, filters)
  if (lines.length) {
    return lines.map((line) => {
      const unitCost = unitCostForLine(line, costMaps)
      const qty = Number(line.quantity) || 0
      const revenue = Number(line.amount) || 0
      const totalCost = qty * unitCost
      return plRow({
        item: line.item_name || 'Uniform',
        reference: line.issue_no || `ISS-${line.issue_id}`,
        unit: 'pcs',
        purchaseQty: qty,
        purchasePrice: unitCost,
        soldQty: qty,
        soldPrice: line.unit_price,
        revenue,
        totalCost,
      })
    })
  }

  const rows = []
  for (const t of bundle.analytics?.top_items || []) {
    const unitCost = unitCostForItemName(t.item_name, costMaps)
    const qty = Number(t.pieces) || 0
    const revenue = Number(t.revenue) || 0
    if (!qty && !revenue) continue
    rows.push(plRow({
      item: t.item_name || 'Uniform',
      reference: 'Sales summary',
      unit: 'pcs',
      purchaseQty: qty,
      purchasePrice: unitCost,
      soldQty: qty,
      soldPrice: qty ? Math.round(revenue / qty) : 0,
      revenue,
      totalCost: qty * unitCost,
    }))
  }
  return rows
}

function buildFabricProfitRows(bundle, filters, fgById) {
  if (bundle.profit?.rows?.length) {
    return bundle.profit.rows.map((r) => plRow({
      item: `${r.fabric_type || 'Fabric'}${r.fabric_color ? ` (${r.fabric_color})` : ''}`.trim(),
      reference: r.meters_out ? `Stock-out · ${fmtNum(r.meters_out)} m` : 'Fabric stock',
      unit: 'm',
      purchaseQty: r.meters_out,
      purchasePrice: r.fabric_unit_cost_avg,
      soldQty: r.issue_qty,
      soldPrice: r.issue_unit_price_avg,
      revenue: r.total_issue_revenue,
      totalCost: r.total_fabric_cost,
    }))
  }

  const revenueByKey = new Map()
  for (const line of resolveIssueLines(bundle, filters)) {
    const fg = fgById.get(Number(line.finished_good_id))
    if (!fg) continue
    const key = `${String(fg.fabric_type || 'Fabric').trim()}||${String(fg.fabric_color || '').trim()}`
    const cur = revenueByKey.get(key) || { revenue: 0, soldQty: 0 }
    cur.revenue += Number(line.amount || 0)
    cur.soldQty += Number(line.quantity || 0)
    revenueByKey.set(key, cur)
  }

  const byKey = new Map()
  for (const o of (bundle.stockouts || []).filter((s) => inDateRange(s.out_date, filters.from, filters.to))) {
    const key = `${String(o.fabric_type || 'Fabric').trim()}||${String(o.color || '').trim()}`
    const unitCost = fabricUnitCost(bundle, o.fabric_receipt_id)
    const meters = Number(o.meters_out) || 0
    const cost = meters * unitCost
    const label = `${o.fabric_type || 'Fabric'}${o.color ? ` (${o.color})` : ''}`
    const cur = byKey.get(key) || { label, meters: 0, cost: 0 }
    cur.meters += meters
    cur.cost += cost
    byKey.set(key, cur)
  }

  const keys = new Set([...byKey.keys(), ...revenueByKey.keys()])
  return [...keys].map((key) => {
    const block = byKey.get(key) || { label: key.replace('||', ' · '), meters: 0, cost: 0 }
    const revBlock = revenueByKey.get(key) || { revenue: 0, soldQty: 0 }
    const revenue = revBlock.revenue
    const soldQty = revBlock.soldQty
    const purchasePrice = block.meters ? Math.round(block.cost / block.meters) : 0
    const soldPrice = soldQty ? Math.round(revenue / soldQty) : 0
    return plRow({
      item: block.label,
      reference: block.meters ? `Stock-out · ${fmtNum(block.meters)} m` : 'Fabric stock',
      unit: 'm',
      purchaseQty: block.meters,
      purchasePrice,
      soldQty: soldQty || '',
      soldPrice: soldQty ? soldPrice : '',
      revenue,
      totalCost: block.cost,
    })
  })
}

function buildProfitLoss(bundle, filters) {
  const costMaps = finishedGoodCostMap(bundle.finishedGoods)
  const fgById = new Map((bundle.finishedGoods || []).map((g) => [Number(g.id), g]))
  const plSearchKeys = ['item', 'reference', 'result']

  let finishedData = buildFinishedProfitRows(bundle, filters, costMaps)
  finishedData = filterRows(finishedData, filters, plSearchKeys)
  const finishedRows = [
    ...finishedData,
    ...(finishedData.length ? [sectionSubtotal('Finished uniforms total', finishedData)] : []),
  ]

  let fabricData = buildFabricProfitRows(bundle, filters, fgById)
  fabricData = filterRows(fabricData, filters, plSearchKeys)
  const fabricRows = [
    ...fabricData,
    ...(fabricData.length ? [sectionSubtotal('Fabric stock total', fabricData)] : []),
  ]

  const allData = [...finishedData, ...fabricData]
  const gross = sum(allData, 'profit_loss')
  const revenue = sum(allData, 'revenue')
  const cogs = sum(allData, 'total_cost')
  const profitRows = allData.filter((r) => r.result === 'Profit')
  const lossRows = allData.filter((r) => r.result === 'Loss')

  const kpis = [
    { key: 'finished_pl', label: 'Finished uniforms P/L', value: fmtMoney(sum(finishedData, 'profit_loss')), warn: sum(finishedData, 'profit_loss') < 0 },
    { key: 'fabric_pl', label: 'Fabric stock P/L', value: fmtMoney(sum(fabricData, 'profit_loss')), warn: sum(fabricData, 'profit_loss') < 0 },
    { key: 'revenue', label: 'Total revenue', value: fmtMoney(revenue) },
    { key: 'cost', label: 'Total cost', value: fmtMoney(cogs) },
    { key: 'net', label: 'Net profit / loss', value: fmtMoney(gross), warn: gross < 0 },
    { key: 'rows', label: 'Profit / Loss rows', value: `${profitRows.length} / ${lossRows.length}` },
  ]

  return {
    sections: [
      {
        id: 'finished',
        title: 'Finished uniforms',
        subtitle: 'Sales to students vs purchase cost on each finished item',
        columns: PL_COLUMNS,
        rows: finishedRows,
        kpis: sectionKpis(finishedData, 'Uniform '),
      },
      {
        id: 'fabric',
        title: 'Fabric stock',
        subtitle: 'Fabric used in production vs revenue from linked uniform sales',
        columns: PL_COLUMNS,
        rows: fabricRows,
        kpis: sectionKpis(fabricData, 'Fabric '),
      },
    ],
    columns: PL_COLUMNS,
    rows: allData,
    kpis,
    charts: [],
    summary: { revenue, cogs, grossProfit: gross, netProfit: gross },
    emptyMessage: allData.length
      ? undefined
      : 'No profit & loss data for this period. Register stock, issue uniforms, and record fabric stock-outs.',
  }
}

function buildInventoryValue(bundle, filters) {
  return buildInventoryValuation(bundle, filters)
}

function buildDailyIncome(bundle, filters) {
  const dayMap = new Map()
  for (const issue of issuesInPeriod(bundle.issues, filters)) {
    const d = fmtDate(issue.issue_date || issue.created_at)
    const cur = dayMap.get(d) || { date: d, sales: 0, expenses: 0, profit: 0 }
    cur.sales += Number(issue.total_amount) || 0
    dayMap.set(d, cur)
  }
  const rows = [...dayMap.values()]
    .map((r) => ({ ...r, profit: r.sales - r.expenses }))
    .sort((a, b) => a.date.localeCompare(b.date))
  const columns = [
    { key: 'date', label: 'Date' },
    { key: 'sales', label: 'Sales', align: 'right', format: 'money' },
    { key: 'expenses', label: 'Expenses', align: 'right', format: 'money' },
    { key: 'profit', label: 'Profit', align: 'right', format: 'money' },
  ]
  return { columns, rows, kpis: [], charts: [], summary: {} }
}

function buildMonthlyFinancial(bundle) {
  const rows = [{
    month: 'Current period',
    sales: bundle.analytics?.total_sales || 0,
    expenses: 0,
    profit: Math.max(0, (bundle.analytics?.total_sales || 0) - (bundle.profit?.summary?.total_fabric_cost || 0)),
    loss: Math.max(0, (bundle.profit?.summary?.total_fabric_cost || 0) - (bundle.analytics?.total_sales || 0)),
  }]
  const columns = [
    { key: 'month', label: 'Month' },
    { key: 'sales', label: 'Sales', align: 'right', format: 'money' },
    { key: 'expenses', label: 'Expenses', align: 'right', format: 'money' },
    { key: 'profit', label: 'Profit', align: 'right', format: 'money' },
    { key: 'loss', label: 'Loss', align: 'right', format: 'money' },
  ]
  return { columns, rows, kpis: [], charts: [], summary: {} }
}

function buildBestSelling(bundle) {
  const rows = (bundle.analytics?.top_items || [])
    .map((t, i) => ({
      rank: i + 1,
      item: t.item_name,
      qty_sold: t.pieces,
      revenue: t.revenue,
    }))
  const columns = [
    { key: 'rank', label: 'Rank', align: 'right' },
    { key: 'item', label: 'Item' },
    { key: 'qty_sold', label: 'Qty Sold', align: 'right' },
    { key: 'revenue', label: 'Revenue', align: 'right', format: 'money' },
  ]
  const charts = [{
    id: 'top10',
    title: 'Top 10 Most Issued Uniforms',
    type: 'bar',
    data: rows.slice(0, 10).map((r) => ({ name: r.item, value: r.qty_sold })),
  }]
  return { columns, rows, kpis: [], charts, summary: {} }
}

function buildSlowMoving(bundle) {
  const rows = bundle.finishedGoods
    .filter((g) => Number(g.sold_qty) === 0 && Number(g.stock) > 0)
    .map((g) => ({
      item: g.uniform_name + (g.size ? ` (${g.size})` : ''),
      current_stock: g.stock,
      last_sold: g.created_at ? fmtDate(g.created_at) : '—',
      days_unsold: g.created_at ? Math.floor((Date.now() - new Date(g.created_at).getTime()) / 86400000) : '—',
    }))
    .sort((a, b) => Number(b.current_stock) - Number(a.current_stock))
  const columns = [
    { key: 'item', label: 'Item' },
    { key: 'current_stock', label: 'Current Stock', align: 'right' },
    { key: 'last_sold', label: 'Last Sold' },
    { key: 'days_unsold', label: 'Days Unsold', align: 'right' },
  ]
  return { columns, rows, kpis: [], charts: [], summary: {} }
}

function buildFinancialDashboard(bundle, filters) {
  const a = bundle.analytics || {}
  const s = bundle.profit?.summary || {}
  const invValue = sum(bundle.finishedGoods, 'value')
  const lowCount = bundle.finishedGoods.filter((g) => g.stock < (filters.minStock || DEFAULT_MIN_STOCK)).length
  const best = a.top_items?.[0]?.item_name || '—'
  const gross = Number(s.total_profit_loss) || 0
  const kpis = [
    { key: 'revenue', label: 'Total Revenue', value: fmtMoney(a.total_sales), icon: 'money' },
    { key: 'inv', label: 'Inventory Value', value: fmtMoney(invValue), icon: 'package' },
    { key: 'gross', label: 'Gross Profit', value: fmtMoney(gross), icon: 'trend' },
    { key: 'loss', label: 'Total Loss', value: fmtMoney(Math.max(0, -gross)), icon: 'loss', warn: gross < 0 },
    { key: 'expenses', label: 'Expenses', value: fmtMoney(s.total_fabric_cost), icon: 'expense' },
    { key: 'net', label: 'Net Profit', value: fmtMoney(gross), icon: 'net' },
    { key: 'sold', label: 'Uniforms Sold', value: fmtNum(a.total_pieces), icon: 'shirt' },
    { key: 'stock', label: 'Current Stock', value: fmtNum(sum(bundle.finishedGoods, 'stock')), icon: 'box' },
    { key: 'low', label: 'Low Stock Items', value: lowCount, warn: true, icon: 'alert' },
    { key: 'best', label: 'Best Selling Item', value: best, icon: 'trophy' },
  ]
  const charts = [
    {
      id: 'revenue-trend',
      title: 'Sales Trend (Top Items)',
      type: 'bar',
      data: (a.top_items || []).slice(0, 6).map((t) => ({ name: t.item_name, value: t.revenue })),
    },
    {
      id: 'profit-pie',
      title: 'Revenue by Class',
      type: 'pie',
      data: (a.revenue_by_class || []).map((c) => ({ name: c.class_name, value: c.revenue })),
    },
  ]
  return { columns: [], rows: [], kpis, charts, summary: {}, dashboard: true }
}

const BUILDERS = {
  dashboard: buildDashboard,
  'inventory-stock': buildInventoryStock,
  'stock-in': buildStockIn,
  'stock-out': buildStockOut,
  'stock-movement': buildStockMovement,
  'inventory-valuation': buildInventoryValuation,
  'low-stock': buildLowStock,
  'expensive-items': buildExpensiveItems,
  'supplier-purchases': buildSupplierPurchases,
  'student-distribution': buildStudentDistribution,
  'returned-uniforms': () => buildPlaceholder('returned-uniforms', 'Returned Uniform', [
    { key: 'return_no', label: 'Return No' },
    { key: 'student', label: 'Student' },
    { key: 'item', label: 'Item' },
    { key: 'qty', label: 'Qty', align: 'right' },
    { key: 'condition', label: 'Condition' },
    { key: 'date', label: 'Date' },
  ]),
  'damaged-lost': () => buildPlaceholder('damaged-lost', 'Damaged/Lost', [
    { key: 'item', label: 'Item' },
    { key: 'qty', label: 'Qty', align: 'right' },
    { key: 'cause', label: 'Cause' },
    { key: 'reported_by', label: 'Reported By' },
    { key: 'date', label: 'Date' },
  ]),
  'inventory-adjustments': () => buildPlaceholder('inventory-adjustments', 'Inventory Adjustment', [
    { key: 'item', label: 'Item' },
    { key: 'previous_qty', label: 'Previous Qty', align: 'right' },
    { key: 'new_qty', label: 'New Qty', align: 'right' },
    { key: 'difference', label: 'Difference', align: 'right' },
    { key: 'reason', label: 'Reason' },
    { key: 'approved_by', label: 'Approved By' },
  ]),
  'monthly-summary': buildMonthlySummary,
  'sales-income': buildSalesIncome,
  'profit-loss': buildProfitLoss,
  'inventory-value': buildInventoryValue,
  cogs: () => buildPlaceholder('cogs', 'COGS', [
    { key: 'month', label: 'Month' },
    { key: 'opening_stock', label: 'Opening Stock', align: 'right', format: 'money' },
    { key: 'purchases', label: 'Purchases', align: 'right', format: 'money' },
    { key: 'closing_stock', label: 'Closing Stock', align: 'right', format: 'money' },
    { key: 'cogs', label: 'COGS', align: 'right', format: 'money' },
  ]),
  expenses: () => buildPlaceholder('expenses', 'Expense', [
    { key: 'date', label: 'Date' },
    { key: 'expense', label: 'Expense' },
    { key: 'category', label: 'Category' },
    { key: 'amount', label: 'Amount', align: 'right', format: 'money' },
  ]),
  'daily-income': buildDailyIncome,
  'monthly-financial': buildMonthlyFinancial,
  'best-selling': buildBestSelling,
  'slow-moving': buildSlowMoving,
  'payment-methods': () => buildPlaceholder('payment-methods', 'Payment Method', [
    { key: 'payment_method', label: 'Payment Method' },
    { key: 'amount', label: 'Amount', align: 'right', format: 'money' },
  ]),
  'student-debt': () => buildPlaceholder('student-debt', 'Student Debt', [
    { key: 'student', label: 'Student' },
    { key: 'amount_due', label: 'Amount Due', align: 'right', format: 'money' },
    { key: 'paid', label: 'Paid', align: 'right', format: 'money' },
    { key: 'balance', label: 'Balance', align: 'right', format: 'money' },
  ]),
  'financial-dashboard': buildFinancialDashboard,
}

export function buildUniformReport(slug, bundle, filters) {
  const builder = BUILDERS[slug]
  if (!builder) return { columns: [], rows: [], kpis: [], charts: [], summary: {} }
  return builder(bundle, filters)
}

export function formatCellValue(value, format) {
  if (value == null || value === '') return '—'
  if (format === 'money') return fmtMoney(value)
  if (typeof value === 'number') return fmtNum(value)
  return value
}

export function rowsForExport(rows, columns) {
  return rows.map((row) => {
    const out = {}
    for (const col of columns) {
      out[col.key] = formatCellValue(row[col.key], col.format)
    }
    return out
  })
}
