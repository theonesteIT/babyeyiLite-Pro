/** ERP register math — opening stock + purchase, depreciation carry-forward */

import {
  isBuildingsCategory,
  isBuildingWorkingProgress,
  isLandCategory,
} from './assetsConstants'

export function parseRegisterNum(v) {

  const n = Number(String(v ?? '').replace(/,/g, ''))

  return Number.isFinite(n) ? n : 0

}



/**

 * Buildings category — business rules (Finished / Working Progress).
 *
 * Working Progress NBV:
 *   Case 1 (year-carry / opening stock exists): NBV = Opening − TD − Annual
 *   Case 2 (first Progress, no opening):        NBV = TB − PP − TD
 *   Case 3 (previous still Progress):           NBV = TB − PP − TD − Prior Progress PP
 *
 * Working Progress annual:
 *   Year-carry (first WIP row in year): prior-year NBV × rate (KPS)
 *   Case 1 (no prior Progress same year): max(0, PP − TD) × rate
 *   Case 2 (prior Progress same year only): max(0, PP − Prior Progress PP − TD) × rate
 *
 * Finished / other categories: annual = (TB − TD) × rate, NBV = TB − total depreciation.
 */

/** Annual depreciation base for Buildings category rows. */
export function resolveBuildingAnnualDepreciableBase({
  unitPrice = 0,
  opening = 0,
  totalBalance = 0,
  accumulated = 0,
  buildingStatus = null,
  previousProgressPurchase = null,
  priorYearNetBookValue = null,
} = {}) {
  const PP = parseRegisterNum(unitPrice)
  const open = parseRegisterNum(opening)
  const TB = parseRegisterNum(totalBalance) || open + PP
  const TD = parseRegisterNum(accumulated)
  const PTP = previousProgressPurchase != null ? parseRegisterNum(previousProgressPurchase) : 0
  const priorNBV = priorYearNetBookValue != null ? parseRegisterNum(priorYearNetBookValue) : 0

  if (isBuildingWorkingProgress(buildingStatus)) {
    // KPS year-carry — first WIP row in a new year (not same-year Case 2).
    if (open > 0 && priorNBV > 0) {
      return Math.max(0, priorNBV)
    }
    if (PTP > 0) {
      // Case 2 — another Progress building earlier in the SAME year.
      return Math.max(0, PP - PTP - TD)
    }
    const purchaseBase = PP - TD
    if (purchaseBase > 0) {
      return purchaseBase
    }
    if (open > 0) {
      return Math.max(0, open - TD)
    }
    return 0
  }

  // Finished — use purchase base when valid; otherwise total balance (yearly register).
  const purchaseBase = PP - TD
  if (purchaseBase > 0) {
    return purchaseBase
  }
  return Math.max(0, TB - TD)
}

/** Net book value for Buildings category rows. */
export function resolveBuildingNetBookValue({
  totalBalance = 0,
  unitPrice = 0,
  opening = 0,
  accumulated = 0,
  buildingStatus = null,
  previousProgressPurchase = null,
  annualDep = 0,
  priorYearNetBookValue = null,
} = {}) {
  const TB = parseRegisterNum(totalBalance)
  const PP = parseRegisterNum(unitPrice)
  const open = parseRegisterNum(opening)
  const TD = parseRegisterNum(accumulated)
  const annual = parseRegisterNum(annualDep)
  const PTP = previousProgressPurchase != null ? parseRegisterNum(previousProgressPurchase) : 0
  const priorNBV = priorYearNetBookValue != null ? parseRegisterNum(priorYearNetBookValue) : 0

  if (isBuildingWorkingProgress(buildingStatus)) {
    if (open > 0 && priorNBV > 0) {
      // KPS year-carry rows: depreciate prior year's NBV.
      return Math.max(0, priorNBV - annual)
    }
    if (PTP > 0) {
      // Case 2 — previous Progress building earlier in the SAME year.
      return Math.max(0, TB - PP - TD - PTP)
    }
    if (open > 0) {
      // KPS year-carry rows.
      return Math.max(0, open - TD - annual)
    }
    // First Progress, no opening stock.
    return Math.max(0, TB - PP - TD)
  }

  // Finished — NBV = total balance minus full total depreciation.
  return Math.max(0, TB - TD - annual)
}

export function computeBuildingRegisterMath({
  totalBalance = 0,
  unitPrice = 0,
  openingAmount = 0,
  accumulatedDepreciation = 0,
  depRatePercent = 0,
  buildingStatus = null,
  previousProgressPurchase = null,
  priorYearNetBookValue = null,
} = {}) {
  const TB = parseRegisterNum(totalBalance)
  const PP = parseRegisterNum(unitPrice)
  const open = parseRegisterNum(openingAmount)
  const TD = parseRegisterNum(accumulatedDepreciation)
  const rate = parseRegisterNum(depRatePercent)
  const decimalDep = rate > 0 ? rate / 100 : 0
  const PTP = previousProgressPurchase != null ? parseRegisterNum(previousProgressPurchase) : 0
  const priorNBV = priorYearNetBookValue != null ? parseRegisterNum(priorYearNetBookValue) : 0

  const depreciableBase = resolveBuildingAnnualDepreciableBase({
    unitPrice: PP,
    opening: open,
    totalBalance: TB,
    accumulated: TD,
    buildingStatus,
    previousProgressPurchase: PTP > 0 ? PTP : null,
    priorYearNetBookValue: priorNBV > 0 ? priorNBV : null,
  })

  const annualDep = Math.round(depreciableBase * decimalDep)

  const netBookValue = resolveBuildingNetBookValue({
    totalBalance: TB,
    unitPrice: PP,
    opening: open,
    accumulated: TD,
    buildingStatus,
    previousProgressPurchase: PTP > 0 ? PTP : null,
    annualDep,
    priorYearNetBookValue: priorNBV > 0 ? priorNBV : null,
  })

  const totalDep = (isBuildingWorkingProgress(buildingStatus) && PTP <= 0 && open > 0)
    || !isBuildingWorkingProgress(buildingStatus)
    ? TD + annualDep
    : Math.max(0, TB - netBookValue)

  return {
    decimalDep,
    annualDep,
    totalDep,
    netBookValue,
    depreciableBase,
    previousProgressPurchase: PTP > 0 ? PTP : null,
    constructionCost: PTP > 0 ? Math.max(0, PP - PTP) : null,
  }
}

export function resolveRegisterDepreciableBase({
  opening = 0,
  totalBalance = 0,
  accumulated = 0,
  unitPrice = 0,
  category = null,
  buildingStatus = null,
  previousProgressPurchase = null,
} = {}) {
  if (isBuildingsCategory(category)) {
    return resolveBuildingAnnualDepreciableBase({
      unitPrice,
      opening,
      totalBalance,
      accumulated,
      buildingStatus,
      previousProgressPurchase,
    })
  }
  return Math.max(0, parseRegisterNum(totalBalance) - parseRegisterNum(accumulated))
}

export function computeAssetRegisterMath({

  openingAmount = 0,

  unitPrice = 0,

  accumulatedDepreciation = 0,

  depRatePercent = 0,

  category = null,

  buildingStatus = null,

  previousProgressPurchase = null,

  priorYearNetBookValue = null,

}) {

  const opening = parseRegisterNum(openingAmount)

  const purchase = parseRegisterNum(unitPrice)

  const accumulated = parseRegisterNum(accumulatedDepreciation)

  // Land never depreciates — ignore any stored rate / year-setup fallback.
  const rate = isLandCategory(category) ? 0 : parseRegisterNum(depRatePercent)

  const decimalDep = rate > 0 ? rate / 100 : 0

  const totalBalance = opening + purchase

  let annualDep = 0
  let totalDep = 0
  let netBookValue = 0
  let constructionCost = null
  let depreciableBase = 0

  if (isLandCategory(category)) {
    annualDep = 0
    totalDep = 0
    netBookValue = Math.max(0, totalBalance)
    depreciableBase = 0
  } else if (isBuildingsCategory(category)) {
    const buildingMath = computeBuildingRegisterMath({
      totalBalance,
      unitPrice: purchase,
      accumulatedDepreciation: accumulated,
      depRatePercent: rate,
      buildingStatus,
      previousProgressPurchase,
      openingAmount: opening,
      priorYearNetBookValue,
    })
    annualDep = buildingMath.annualDep
    totalDep = buildingMath.totalDep
    netBookValue = buildingMath.netBookValue
    constructionCost = buildingMath.constructionCost
    depreciableBase = buildingMath.depreciableBase
  } else {
    depreciableBase = resolveRegisterDepreciableBase({
      opening,
      totalBalance,
      accumulated,
      unitPrice: purchase,
      category,
      buildingStatus,
      previousProgressPurchase,
    })
    annualDep = Math.round(depreciableBase * decimalDep)
    totalDep = accumulated + annualDep
    netBookValue = Math.max(0, totalBalance - totalDep)
  }

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

    constructionCost,

  }

}



/** Next row in same category/year: opening = prior TOTAL BALANCE; accumulated fixed for that purchase year */

export function rollCategoryStateAfterAsset(math, priorState = {}, assetMeta = {}) {

  const fixedAccumulated = priorState.fixedAccumulated ?? priorState.accumulated ?? 0
  const category = assetMeta.category ?? null
  const buildingStatus = assetMeta.buildingStatus ?? null
  const unitPrice = assetMeta.unitPrice ?? math?.unitPrice ?? 0

  let lastProgressPurchase = priorState.lastProgressPurchase ?? null
  if (isBuildingsCategory(category) && isBuildingWorkingProgress(buildingStatus)) {
    lastProgressPurchase = parseRegisterNum(unitPrice)
  } else if (isBuildingsCategory(category)) {
    lastProgressPurchase = null
  }

  if (!math) {
    return {
      opening: 0,
      accumulated: fixedAccumulated,
      fixedAccumulated,
      lastProgressPurchase,
    }
  }

  return {

    opening: math.totalBalance,

    accumulated: fixedAccumulated,

    fixedAccumulated,

    lastProgressPurchase,

    priorYearNetBook: null,

  }

}



/**
 * KPS register year-start: prior year TOTAL DEP → accumulated; prior year TOTAL BALANCE → opening.
 * Within the same year, accumulated stays fixed; opening chains per asset.
 */
export function resolveCategoryYearStartState({ priorYearEnd, openingContext, category = null } = {}) {
  const cat = category ?? openingContext?.category ?? null
  const isLand = isLandCategory(cat)
  const priorBal = parseRegisterNum(priorYearEnd?.totalBalance);
  const priorDep = isLand ? 0 : parseRegisterNum(priorYearEnd?.totalDep);
  if (priorYearEnd && (priorBal > 0 || priorDep > 0 || (isLand && priorBal >= 0))) {
    return {
      // Land & all: next-year opening = prior TOTAL BALANCE.
      opening: priorBal,
      fixedAccumulated: isLand ? 0 : priorDep,
      accumulated: isLand ? 0 : priorDep,
      lastProgressPurchase: null,
      priorYearNetBook: isLand
        ? null
        : (priorYearEnd.netBook != null
          ? parseRegisterNum(priorYearEnd.netBook)
          : (openingContext?.prior_asset_net_book != null
            ? parseRegisterNum(openingContext.prior_asset_net_book)
            : null)),
      source: 'prior_year_carry',
    };
  }
  const fixedAccumulated = isLand
    ? 0
    : parseRegisterNum(
      openingContext?.category_year_accumulated_depreciation
      ?? openingContext?.effective_accumulated_depreciation
      ?? openingContext?.year_setup_accumulated_depreciation
      ?? openingContext?.accumulated_depreciation
    );
  return {
    opening: parseRegisterNum(
      openingContext?.effective_opening
      ?? openingContext?.year_setup_opening
      ?? openingContext?.year_opening_balance
    ),
    fixedAccumulated,
    accumulated: fixedAccumulated,
    lastProgressPurchase: null,
    priorYearNetBook: isLand
      ? null
      : (openingContext?.prior_asset_net_book != null
        ? parseRegisterNum(openingContext.prior_asset_net_book)
        : null),
    source: 'year_setup',
  };
}



export function categoryYearPriorKey(registerYear, category) {
  const yr = Number(registerYear);
  const cat = String(category ?? '').trim().toLowerCase();
  if (!Number.isFinite(yr) || !cat) return '';
  return `${yr - 1}:${cat}`;
}



export function categoryYearRollKey(registerYear, category) {
  const yr = Number(registerYear);
  const cat = String(category ?? '').trim().toLowerCase();
  if (!Number.isFinite(yr) || !cat) return '';
  return `${yr}:${cat}`;
}



/** Normalize register row for display — always derive totals from register math when possible */

export function enrichRegisterFinancials(asset, options = {}) {

  if (!asset) return null

  const opening = parseRegisterNum(asset.opening_amount)

  const purchase = parseRegisterNum(asset.unit_price)

  const accumulated = parseRegisterNum(asset.accumulated_depreciation)

  const depRate = parseRegisterNum(asset.dep_rate ?? asset.depRate ?? 0)

  const category = asset.category ?? asset.categoryType ?? null

  const buildingStatus = asset.building_status ?? asset.buildingStatus ?? null

  const previousProgressPurchase = options.previousProgressPurchase ?? null
  const priorYearNetBookValue = options.priorYearNetBookValue ?? null

  const computedBalance = opening + purchase

  if (computedBalance > 0) {

    const math = computeAssetRegisterMath({

      openingAmount: opening,

      unitPrice: purchase,

      accumulatedDepreciation: accumulated,

      depRatePercent: depRate,

      category,

      buildingStatus,

      previousProgressPurchase,

      priorYearNetBookValue,

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
  const totalDep = storedTotalDep > 0 ? storedTotalDep : accumulated + annualDep
  const netBookValue = parseRegisterNum(asset.net_book_value) || Math.max(0, totalBalance - totalDep)

  return {
    ...asset,
    opening_amount: opening,
    unit_price: purchase,
    total_balance: totalBalance,
    accumulated_depreciation: accumulated,
    annual_dep: annualDep,
    total_dep: totalDep,
    net_book_value: netBookValue,
  }
}

/**
 * Recompute register financials for a list in register order (id / row order).
 * Uses the same category-year chain as import/edit (resolveCategoryYearStartState +
 * rollCategoryStateAfterAsset) so the display table matches the edit preview.
 * Returns a Map of asset id → enriched row.
 */
export function enrichRegisterChainFinancials(assets = []) {
  const out = new Map()
  if (!assets?.length) return out

  const sorted = [...assets].sort((a, b) => {
    const catCmp = String(a?.category ?? '').localeCompare(String(b?.category ?? ''))
    if (catCmp !== 0) return catCmp
    const yr = Number(a?.register_year ?? 0) - Number(b?.register_year ?? 0)
    if (yr !== 0) return yr
    return Number(a?.id ?? 0) - Number(b?.id ?? 0)
  })

  const yearEndByKey = {}
  const categoryState = {}

  for (const asset of sorted) {
    const category = asset?.category ?? asset?.categoryType ?? ''
    const year = Number(asset?.register_year)
    const rollKey = categoryYearRollKey(year, category)
    const priorKey = categoryYearPriorKey(year, category)
    const priorYearEnd = priorKey ? yearEndByKey[priorKey] : null

    if (!categoryState[rollKey]) {
      const start = resolveCategoryYearStartState({ priorYearEnd, category })
      const storedOpening = parseRegisterNum(asset.opening_amount)
      const storedAccumulated = isLandCategory(category)
        ? 0
        : parseRegisterNum(asset.accumulated_depreciation)
      if (!priorYearEnd && (storedOpening > 0 || storedAccumulated > 0)) {
        categoryState[rollKey] = {
          opening: storedOpening,
          fixedAccumulated: storedAccumulated,
          accumulated: storedAccumulated,
          lastProgressPurchase: null,
          priorYearNetBook: null,
          source: 'ledger',
        }
      } else {
        categoryState[rollKey] = start
      }
    }

    const state = categoryState[rollKey]
    const purchase = parseRegisterNum(asset.unit_price)
    const depRate = isLandCategory(category)
      ? 0
      : parseRegisterNum(asset.dep_rate ?? asset.depRate ?? 0)
    const buildingStatus = asset?.building_status ?? asset?.buildingStatus ?? null

    const math = computeAssetRegisterMath({
      openingAmount: state.opening,
      unitPrice: purchase,
      accumulatedDepreciation: state.fixedAccumulated,
      depRatePercent: depRate,
      category,
      buildingStatus,
      previousProgressPurchase: state.lastProgressPurchase,
      priorYearNetBookValue: state.priorYearNetBook ?? null,
    })

    const enriched = {
      ...asset,
      opening_amount: math.openingAmount,
      unit_price: math.unitPrice,
      total_balance: math.totalBalance,
      accumulated_depreciation: math.accumulatedDepreciation,
      annual_dep: math.annualDep,
      total_dep: math.totalDep,
      net_book_value: math.netBookValue,
    }

    categoryState[rollKey] = rollCategoryStateAfterAsset(math, state, {
      category,
      buildingStatus,
      unitPrice: math.unitPrice,
    })

    yearEndByKey[rollKey] = {
      totalBalance: math.totalBalance,
      totalDep: math.totalDep,
      netBook: math.netBookValue,
    }

    if (enriched && asset?.id != null) {
      const idKey = Number(asset.id)
      out.set(Number.isFinite(idKey) ? idKey : asset.id, enriched)
      if (String(asset.id) !== String(idKey)) out.set(asset.id, enriched)
    }
  }

  return out
}

export function getEnrichedRegisterRow(asset, chainMap) {
  if (!asset) return null
  if (chainMap?.get) {
    const id = asset.id
    const hit = chainMap.get(id) ?? chainMap.get(Number(id))
    if (hit) return hit
  }
  return enrichRegisterFinancials(asset) || asset
}



/** Year-start preview: annual charge on (opening/total balance − accumulated) */
export function computeYearStartAnnualDep(totalBalanceOrOpening, accumulatedDepreciation, depRatePercent) {
  const totalBalance = parseRegisterNum(totalBalanceOrOpening)
  const accumulated = parseRegisterNum(accumulatedDepreciation)
  const decimalDep = parseRegisterNum(depRatePercent) / 100
  const depreciableBase = Math.max(0, totalBalance - accumulated)
  return Math.round(depreciableBase * decimalDep)
}


