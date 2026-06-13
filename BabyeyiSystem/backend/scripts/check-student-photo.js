require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { promisePool } = require('../config/database');

const PHOTO_DIR = path.join(__dirname, '..', 'uploads', 'student-profile-photos');
const uid = process.argv[2] || '040030013';

(async () => {
  const [rows] = await promisePool.query(
    `SELECT id, first_name, last_name, student_uid, student_photo
     FROM students WHERE student_uid = ? OR last_name LIKE ? LIMIT 5`,
    [uid, '%MUKAMANA%'],
  );
  console.log(JSON.stringify(rows, null, 2));
  for (const s of rows) {
    if (!s.student_photo) {
      console.log(`[${s.id}] ${s.first_name} ${s.last_name}: no photo in DB`);
      continue;
    }
    const fp = path.join(PHOTO_DIR, s.student_photo);
    console.log(`[${s.id}] ${s.student_photo} → ${fs.existsSync(fp) ? 'EXISTS' : 'MISSING on disk'}`);
  }
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
