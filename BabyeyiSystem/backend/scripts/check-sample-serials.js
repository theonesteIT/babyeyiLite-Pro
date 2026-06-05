'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { promisePool } = require('../config/database');
(async () => {
  const [rows] = await promisePool.query(
    `SELECT asset_code, label_tag, serial_number FROM school_assets
     WHERE serial_number LIKE 'SN-SAMPLE%' OR label_tag LIKE 'BLD-%' LIMIT 10`
  );
  console.log('count sample', rows.length, rows);
  await promisePool.end();
})();
