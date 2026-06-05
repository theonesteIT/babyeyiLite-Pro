'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { promisePool } = require('../config/database');
(async () => {
  const [cols] = await promisePool.query('SHOW COLUMNS FROM school_assets');
  cols.forEach((c) => console.log(c.Field, c.Type));
  await promisePool.end();
})();
