'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { promisePool } = require('../config/database');

(async () => {
  try {
    await promisePool.query(
      "ALTER TABLE school_assets ADD COLUMN asset_health_status VARCHAR(40) NULL DEFAULT 'Used' AFTER assets_status"
    );
    console.log('Column asset_health_status added');
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME') console.log('Column already exists');
    else throw e;
  }
  await promisePool.query(
    "UPDATE school_assets SET asset_health_status = 'Used' WHERE asset_health_status IS NULL OR asset_health_status = ''"
  );
  await promisePool.end();
})();
