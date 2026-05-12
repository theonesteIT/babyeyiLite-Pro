/**
 * check-photo-status.js
 * Run: node scripts/check-photo-status.js
 *
 * Diagnoses why student photos are missing on /superadmin/student-card-template-2
 * by checking how many students have student_photo set vs NULL in the DB.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { promisePool } = require('../config/database');
const path = require('path');
const fs   = require('fs');

const UPLOAD_DIR = path.join(__dirname, '../uploads/student-profile-photos');

async function run() {
  console.log('\n=== STUDENT PHOTO STATUS CHECK ===\n');

  // 1. DB summary
  const [[summary]] = await promisePool.query(`
    SELECT
      COUNT(*)                                                              AS total_students,
      SUM(student_photo IS NOT NULL AND TRIM(student_photo) != '')         AS db_has_photo,
      SUM(student_photo IS NULL OR TRIM(student_photo) = '')               AS db_no_photo
    FROM students
  `);
  console.log('--- Database summary ---');
  console.log(`  Total students  : ${summary.total_students}`);
  console.log(`  WITH  photo set : ${summary.db_has_photo}`);
  console.log(`  WITHOUT photo   : ${summary.db_no_photo}`);

  // 2. Files on disk
  let diskFiles = [];
  if (fs.existsSync(UPLOAD_DIR)) {
    diskFiles = fs.readdirSync(UPLOAD_DIR).filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f));
  }
  console.log(`\n--- Disk (uploads/student-profile-photos/) ---`);
  console.log(`  Files on disk   : ${diskFiles.length}`);

  // 3. Cross-check: DB has photo but file missing
  const [withPhoto] = await promisePool.query(`
    SELECT id, CONCAT(first_name,' ',last_name) AS name, student_photo
    FROM students
    WHERE student_photo IS NOT NULL AND TRIM(student_photo) != ''
    LIMIT 200
  `);

  let missingFile = 0;
  for (const row of withPhoto) {
    const filePath = path.join(UPLOAD_DIR, row.student_photo);
    if (!fs.existsSync(filePath)) missingFile++;
  }
  console.log(`\n--- Cross-check ---`);
  console.log(`  DB has photo, file also EXISTS  : ${withPhoto.length - missingFile}`);
  console.log(`  DB has photo but FILE MISSING   : ${missingFile}  ← broken URLs`);

  // 4. Sample students with photos
  if (withPhoto.length > 0) {
    console.log('\n--- Sample students WITH photo (first 5) ---');
    withPhoto.slice(0, 5).forEach(r => {
      const exists = fs.existsSync(path.join(UPLOAD_DIR, r.student_photo));
      console.log(`  [${r.id}] ${r.name} → ${r.student_photo} ${exists ? '✅' : '❌ FILE MISSING'}`);
    });
  }

  // 5. Sample students WITHOUT photos
  const [noPhoto] = await promisePool.query(`
    SELECT id, CONCAT(first_name,' ',last_name) AS name, school_id
    FROM students
    WHERE student_photo IS NULL OR TRIM(student_photo) = ''
    LIMIT 5
  `);
  if (noPhoto.length > 0) {
    console.log('\n--- Sample students WITHOUT photo (first 5) ---');
    noPhoto.forEach(r => console.log(`  [${r.id}] ${r.name} (school_id=${r.school_id})`));
  }

  console.log('\n=== DONE ===\n');
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
