'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { promisePool } = require('../config/database');

const SCHOOL_ID = Number(process.argv[2] || 1);
const YEAR = Number(process.argv[3] || 2018);
const CATEGORY = process.argv[4] || 'Furniture';

function toMoney(v) {
  const n = Number(String(v ?? '').replace(/,/g, ''));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

function computeAssetRegisterMath({
  openingAmount = 0,
  unitPrice = 0,
  accumulatedDepreciation = 0,
  depRatePercent = 0,
}) {
  const opening = toMoney(openingAmount);
  const purchase = toMoney(unitPrice);
  const accumulated = toMoney(accumulatedDepreciation);
  const rate = toMoney(depRatePercent);
  const decimalDep = rate > 0 ? rate / 100 : 0;
  const totalBalance = opening + purchase;
  const annualDep = Math.round(totalBalance * decimalDep);
  const totalDep = Math.max(0, totalBalance - annualDep);
  return { opening, purchase, accumulated, totalBalance, annualDep, totalDep, decimalDep };
}

async function repairYearStart(schoolId, year, category) {
  const [[bal]] = await promisePool.query(
    `SELECT b.* FROM school_asset_year_category_balances b
     JOIN school_asset_financial_years fy ON fy.id = b.financial_year_id
     WHERE b.school_id = ? AND fy.year = ? AND b.category_name = ? LIMIT 1`,
    [schoolId, year, category]
  );
  if (!bal) {
    console.log('No category balance row found');
    return;
  }
  const opening = toMoney(bal.opening_balance);
  let start = toMoney(bal.accumulated_depreciation_start ?? bal.accumulated_depreciation);
  if (start > opening) {
    const rate = toMoney(bal.depreciation_rate ?? 25);
    const inferred = Math.round(opening * (rate / 100));
    const acc = toMoney(bal.accumulated_depreciation);
    const repaired = acc > 0 && acc <= opening ? acc : inferred;
    await promisePool.query(
      `UPDATE school_asset_year_category_balances SET
        accumulated_depreciation_start = ?, accumulated_depreciation = ?
       WHERE id = ?`,
      [repaired, repaired, bal.id]
    );
    console.log(`Repaired year-start accumulated: ${start} -> ${repaired}`);
    start = repaired;
  } else {
    console.log(`Year-start accumulated OK: ${start}`);
  }
  return start;
}

async function recalcChain(schoolId, year, category) {
  const [[priorYear]] = await promisePool.query(
    `SELECT id FROM school_asset_financial_years
     WHERE school_id = ? AND year = ? AND deleted_at IS NULL LIMIT 1`,
    [schoolId, year - 1]
  );
  let rollingOpening = 0;
  let rollingAccumulated = 0;

  if (priorYear) {
    const [[lastPrev]] = await promisePool.query(
      `SELECT opening_amount, unit_price, total_balance, total_dep, dep_rate
       FROM school_assets
       WHERE school_id = ? AND deleted_at IS NULL AND status != 'Draft'
         AND register_year = ? AND category = ?
       ORDER BY id DESC LIMIT 1`,
      [schoolId, year - 1, category]
    );
    if (lastPrev) {
      rollingOpening = toMoney(lastPrev.total_balance) || toMoney(lastPrev.opening_amount) + toMoney(lastPrev.unit_price);
      rollingAccumulated = toMoney(lastPrev.total_dep);
    }
  }

  if (!rollingOpening && !rollingAccumulated) {
    const [[bal]] = await promisePool.query(
      `SELECT b.opening_balance, b.accumulated_depreciation_start, b.accumulated_depreciation
       FROM school_asset_year_category_balances b
       JOIN school_asset_financial_years fy ON fy.id = b.financial_year_id
       WHERE b.school_id = ? AND fy.year = ? AND b.category_name = ? LIMIT 1`,
      [schoolId, year, category]
    );
    if (bal) {
      rollingOpening = toMoney(bal.opening_balance);
      rollingAccumulated = toMoney(bal.accumulated_depreciation_start ?? bal.accumulated_depreciation);
    }
  }

  const [rows] = await promisePool.query(
    `SELECT id, unit_price, dep_rate, asset_name FROM school_assets
     WHERE school_id = ? AND deleted_at IS NULL AND status != 'Draft'
       AND register_year = ? AND category = ?
     ORDER BY id ASC`,
    [schoolId, year, category]
  );

  console.log(`Recalculating ${rows.length} asset(s) — start opening=${rollingOpening}, accumulated=${rollingAccumulated}`);

  for (const row of rows) {
    const math = computeAssetRegisterMath({
      openingAmount: rollingOpening,
      unitPrice: row.unit_price,
      accumulatedDepreciation: rollingAccumulated,
      depRatePercent: row.dep_rate ?? 25,
    });
    await promisePool.query(
      `UPDATE school_assets SET
        opening_amount = ?, total_balance = ?, accumulated_depreciation = ?,
        annual_dep = ?, total_dep = ?, net_book_value = ?, decimal_dep = ?
       WHERE id = ?`,
      [
        math.opening, math.totalBalance, math.accumulated,
        math.annualDep, math.totalDep, math.totalDep, math.decimalDep,
        row.id,
      ]
    );
    console.log(
      `  ${row.asset_name}: balance=${math.totalBalance}, annual=${math.annualDep}, total_dep=${math.totalDep}`
    );
    rollingOpening = math.totalBalance;
    rollingAccumulated = math.totalDep;
  }
}

async function main() {
  console.log(`Repair + recalc school=${SCHOOL_ID} year=${YEAR} category=${CATEGORY}`);
  await repairYearStart(SCHOOL_ID, YEAR, CATEGORY);
  await recalcChain(SCHOOL_ID, YEAR, CATEGORY);
  await promisePool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
