'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { promisePool } = require('../config/database');

(async () => {
  try {
    const [r] = await promisePool.query(
      `INSERT INTO school_assets (
        school_id, asset_code, asset_name, asset_type, location,
        unit_price, opening_amount, total_balance, accumulated_depreciation,
        quantity, unit, condition_code, status, serial_number, label_tag
      ) VALUES (1,'AST-TEST-IMP','Test','BUILDING','Loc',1,2,3,0,1,'PCS','GOOD','Active','SN-T1','LBL-T1')`
    );
    console.log('OK', r.insertId);
    await promisePool.query(`DELETE FROM school_assets WHERE asset_code='AST-TEST-IMP'`);
  } catch (e) {
    console.error('FAIL', e.code, e.sqlMessage || e.message);
  }
  await promisePool.end();
})();
