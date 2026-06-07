/** ERP register math — opening stock + purchase, depreciation carry-forward */



export function parseRegisterNum(v) {

  const n = Number(String(v ?? '').replace(/,/g, ''))

  return Number.isFinite(n) ? n : 0

}



/**

 * TOTAL BALANCE = opening stock + purchase price

 * ANNUAL DEPRECIATION = total balance × (rate ÷ 100)

 * TOTAL DEPRECIATION (closing) = total balance − annual depreciation

 * NET BOOK VALUE = total depreciation (closing balance)

 */

export function computeAssetRegisterMath({

  openingAmount = 0,

  unitPrice = 0,

  accumulatedDepreciation = 0,

  depRatePercent = 0,

}) {

  const opening = parseRegisterNum(openingAmount)

  const purchase = parseRegisterNum(unitPrice)

  const accumulated = parseRegisterNum(accumulatedDepreciation)

  const rate = parseRegisterNum(depRatePercent)

  const decimalDep = rate > 0 ? rate / 100 : 0

  const totalBalance = opening + purchase

  const annualDep = Math.round(totalBalance * decimalDep)

  const totalDep = Math.max(0, totalBalance - annualDep)

  const netBookValue = totalDep

  const newAccumulatedDep = totalDep



  return {

    openingAmount: opening,

    unitPrice: purchase,

    accumulatedDepreciation: accumulated,

    depRatePercent: rate,

    decimalDep,

    totalBalance,

    annualDep,

    totalDep,

    netBookValue,

    newAccumulatedDep,

  }

}



/** Next row in same category: opening = prior TOTAL BALANCE, accumulated = prior TOTAL DEPRECIATION */

export function rollCategoryStateAfterAsset(math) {

  if (!math) return { opening: 0, accumulated: 0 }

  return {

    opening: math.totalBalance,

    accumulated: math.totalDep,

  }

}



/** Normalize register row for display — always derive totals from register math when possible */

export function enrichRegisterFinancials(asset) {

  if (!asset) return null

  const opening = parseRegisterNum(asset.opening_amount)

  const purchase = parseRegisterNum(asset.unit_price)

  const accumulated = parseRegisterNum(asset.accumulated_depreciation)

  const depRate = parseRegisterNum(asset.dep_rate ?? asset.depRate ?? 0)

  const computedBalance = opening + purchase

  if (computedBalance > 0) {

    const math = computeAssetRegisterMath({

      openingAmount: opening,

      unitPrice: purchase,

      accumulatedDepreciation: accumulated,

      depRatePercent: depRate,

    })

    return {

      ...asset,

      opening_amount: math.openingAmount,

      unit_price: math.unitPrice,

      total_balance: math.totalBalance,

      accumulated_depreciation: math.accumulatedDepreciation,

      annual_dep: math.annualDep,

      total_dep: math.totalDep,

      net_book_value: math.netBookValue,

    }

  }

  const totalBalance = parseRegisterNum(asset.total_balance)

  const annualDep = parseRegisterNum(asset.annual_dep)

  const storedTotalDep = parseRegisterNum(asset.total_dep)

  const totalDep = storedTotalDep > 0 ? storedTotalDep : Math.max(0, totalBalance - annualDep)

  return {

    ...asset,

    opening_amount: opening,

    unit_price: purchase,

    total_balance: totalBalance,

    accumulated_depreciation: accumulated,

    annual_dep: annualDep,

    total_dep: totalDep,

    net_book_value: totalDep,

  }

}



/** Year-start preview: annual charge on carried accumulated (informational) */

export function computeYearStartAnnualDep(accumulatedDepreciation, depRatePercent) {

  const accumulated = parseRegisterNum(accumulatedDepreciation)

  const decimalDep = parseRegisterNum(depRatePercent) / 100

  return Math.round(accumulated * decimalDep)

}


