'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { promisePool } = require('../config/database');

(async () => {
  const schoolId = 1;
  const [rows] = await promisePool.query(
    `SELECT asset_code FROM school_assets WHERE school_id = ? AND deleted_at IS NULL AND asset_code REGEXP '^AST-[0-9]+$'`,
    [schoolId]
  );
  let maxSeq = 0;
  rows.forEach((r) => {
    const m = String(r.asset_code || '').match(/^AST-(\d+)$/i);
    if (m) maxSeq = Math.max(maxSeq, Number(m[1]));
  });
  console.log('maxSeq', maxSeq, 'next', `AST-${String(maxSeq + 1).padStart(5, '0')}`, 'count', rows.length);
  await promisePool.end();
})();
