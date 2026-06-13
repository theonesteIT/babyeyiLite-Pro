'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { ensureSchoolMiniWebsitesSchema } = require('../utils/schoolMiniWebsitesSchema');
const { testConnection } = require('../config/database');

(async () => {
  const ok = await testConnection();
  if (!ok) {
    console.error('Database connection failed');
    process.exit(1);
  }
  await ensureSchoolMiniWebsitesSchema();
  console.log('school_mini_websites table is ready.');
  process.exit(0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
