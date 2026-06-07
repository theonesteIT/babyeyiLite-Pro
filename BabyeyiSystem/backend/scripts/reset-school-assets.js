'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { promisePool } = require('../config/database');

const SCHOOL_ID = Number(process.argv[2] || 1);

async function main() {
  const conn = await promisePool.getConnection();
  try {
    await conn.beginTransaction();

    const [[beforeRow]] = await conn.query(
      'SELECT COUNT(*) AS c FROM school_assets WHERE school_id = ?',
      [SCHOOL_ID]
    );
    console.log(`Database: ${process.env.DB_NAME || 'babyeyi'}`);
    console.log(`School ID: ${SCHOOL_ID}`);
    console.log(`Before: school_assets = ${beforeRow.c}`);

    const steps = [
      ['school_asset_assignments', 'DELETE FROM school_asset_assignments WHERE school_id = ?'],
      ['school_asset_maintenance', 'DELETE FROM school_asset_maintenance WHERE school_id = ?'],
      ['school_asset_transfers', 'DELETE FROM school_asset_transfers WHERE school_id = ?'],
      ['school_asset_year_category_balances', 'DELETE FROM school_asset_year_category_balances WHERE school_id = ?'],
      ['school_assets', 'DELETE FROM school_assets WHERE school_id = ?'],
    ];

    for (const [label, sql] of steps) {
      const [result] = await conn.query(sql, [SCHOOL_ID]);
      console.log(`Deleted ${label}: ${result.affectedRows}`);
    }

    const [fyResult] = await conn.query(
      `UPDATE school_asset_financial_years
       SET total_assets = 0,
           opening_balance = 0,
           closing_balance = 0,
           accumulated_depreciation = 0,
           updated_at = NOW()
       WHERE school_id = ? AND deleted_at IS NULL`,
      [SCHOOL_ID]
    );
    console.log(`Reset financial_years rows: ${fyResult.affectedRows}`);

    const [[afterRow]] = await conn.query(
      'SELECT COUNT(*) AS c FROM school_assets WHERE school_id = ?',
      [SCHOOL_ID]
    );
    console.log(`After: school_assets = ${afterRow.c}`);

    await conn.commit();
    console.log('Done.');
  } catch (err) {
    await conn.rollback();
    console.error('FAILED:', err.message);
    process.exitCode = 1;
  } finally {
    conn.release();
    await promisePool.end();
  }
}

main();
