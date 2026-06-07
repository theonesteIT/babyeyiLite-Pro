/** Build per-fabric-sheet analytics for exports and detail views. */

export function computeFinishedGoodProfit(g) {
  const soldQty = Number(g.used_stock ?? g.sold_qty) || 0
  const purchaseCost = Number(g.purchase_cost) || 0
  const unitSold = Number(g.selling_cost ?? g.selling_price) || 0
  const totalSoldCost = Number(g.total_sold_cost) || soldQty * unitSold
  const totalPurchaseCost = soldQty * purchaseCost
  const profitLoss = totalSoldCost - totalPurchaseCost
  return { soldQty, purchaseCost, unitSold, totalSoldCost, totalPurchaseCost, profitLoss }
}

export function sheetLabel(receipt) {
  if (!receipt) return 'Fabric sheet'
  const type = receipt.fabric_type || 'Sheet'
  const color = receipt.color ? ` · ${receipt.color}` : ''
  return `${type}${color}`
}

export function buildFabricSheetReport(receipt, stockouts = [], finishedGoods = []) {
  if (!receipt) return null

  const id = receipt.id
  const metersIn = Number(receipt.meters) || 0
  const remaining = Number(receipt.remaining_meters ?? receipt.remaining) || 0
  const unitCost = Number(receipt.unit_cost) || 0
  const totalBought = Number(receipt.total_cost) || metersIn * unitCost

  const sheetStockouts = (stockouts || []).filter((s) => String(s.fabric_receipt_id) === String(id))
  const metersOutFromRows = sheetStockouts.reduce((sum, s) => sum + (Number(s.meters_out) || 0), 0)
  const metersOut = metersOutFromRows > 0 ? metersOutFromRows : Math.max(0, metersIn - remaining)
  const fabricCostOut = metersOut * unitCost

  const sheetGoods = (finishedGoods || []).filter((g) => String(g.fabric_receipt_id) === String(id))
  const finishedItems = sheetGoods.map((g) => {
    const p = computeFinishedGoodProfit(g)
    return {
      id: g.id,
      uniform_name: g.uniform_name,
      size: g.size,
      unit_price: p.unitSold,
      quantity: p.soldQty,
      stock_remaining: Number(g.remaining_stock ?? g.stock) || 0,
      opening_stock: Number(g.opening_stock) || 0,
      purchase_cost: p.purchaseCost,
      total_sold: p.totalSoldCost,
      total_purchase_cost: p.totalPurchaseCost,
      profit_loss: p.profitLoss,
    }
  })

  const totalSoldRevenue = finishedItems.reduce((s, i) => s + i.total_sold, 0)
  const totalSoldPurchaseCost = finishedItems.reduce((s, i) => s + i.total_purchase_cost, 0)
  const profitLoss = totalSoldRevenue - totalBought
  const netMargin = totalSoldRevenue - totalSoldPurchaseCost

  let resultLabel = 'Break-even'
  if (profitLoss > 0) resultLabel = 'Income'
  else if (profitLoss < 0) resultLabel = 'Loss'

  return {
    receipt,
    label: sheetLabel(receipt),
    metersIn,
    metersOut,
    remaining,
    unitCost,
    totalBought,
    fabricCostOut,
    stockoutRows: sheetStockouts,
    finishedItems,
    totalSoldRevenue,
    totalSoldPurchaseCost,
    profitLoss,
    netMargin,
    resultLabel,
  }
}

export function buildAllFabricSheetReports(receipts = [], stockouts = [], finishedGoods = []) {
  return (receipts || [])
    .map((r) => buildFabricSheetReport(r, stockouts, finishedGoods))
    .filter(Boolean)
}

export function sanitizeSheetName(name, index = 0) {
  const base = String(name || 'Sheet')
    .replace(/[\\/*?:\[\]]/g, '')
    .slice(0, 24)
  return base || `Sheet${index + 1}`
}
