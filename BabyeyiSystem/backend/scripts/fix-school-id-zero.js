/**
 * One-off: move schools.id=0 to the next available id (legacy bad row).
 * Run: node scripts/fix-school-id-zero.js
 */
const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  const [[bad]] = await pool.query(
    'SELECT id, school_name, school_code FROM schools WHERE id = 0 LIMIT 1'
  );
  if (!bad) {
    console.log('No school with id=0 — nothing to fix.');
    await pool.end();
    return;
  }

  const [[maxRow]] = await pool.query('SELECT COALESCE(MAX(id), 0) AS max_id FROM schools WHERE id > 0');
  const newId = Number(maxRow.max_id) + 1;

  console.log(`Reassigning school "${bad.school_name}" (${bad.school_code}) id 0 → ${newId}`);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    await conn.query('UPDATE users SET school_id = ? WHERE school_id = 0', [newId]);
    await conn.query('UPDATE schools SET id = ? WHERE id = 0', [newId]);
    await conn.query('ALTER TABLE schools AUTO_INCREMENT = ?', [newId + 1]);
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    await conn.commit();
    console.log('Done.');
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
    await pool.end();
  }
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
