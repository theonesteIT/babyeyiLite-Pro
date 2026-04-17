const { promisePool: db } = require('./config/database');

// Mocks of the ensure functions from the routes
async function ensureSchoolsExtraColumns(conn) {
  await conn.query('ALTER TABLE schools ADD COLUMN district_code VARCHAR(2) NULL').catch(() => {});
  await conn.query('ALTER TABLE schools ADD COLUMN a_level_combinations JSON NULL').catch(() => {});
  await conn.query('ALTER TABLE schools ADD COLUMN is_skeleton TINYINT(1) NOT NULL DEFAULT 0').catch(() => {});
  await conn.query('ALTER TABLE schools ADD COLUMN boarding_type VARCHAR(50) NULL').catch(() => {});
  await conn.query('ALTER TABLE schools ADD COLUMN vision TEXT NULL').catch(() => {});
}

async function ensureGroupsTable(conn) {
    await conn.query(`
        CREATE TABLE IF NOT EXISTS school_groups (
            id INT AUTO_INCREMENT PRIMARY KEY,
            school_id INT UNSIGNED NOT NULL,
            group_name VARCHAR(100) NOT NULL,
            stream_name VARCHAR(100) NULL,
            category VARCHAR(50) NULL,
            combination VARCHAR(100) NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            KEY idx_school_id (school_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    // Also try adding columns if table already exists
    await conn.query('ALTER TABLE school_groups ADD COLUMN category VARCHAR(50) NULL').catch(() => {});
    await conn.query('ALTER TABLE school_groups ADD COLUMN combination VARCHAR(100) NULL').catch(() => {});
}

async function runMigrate() {
  const conn = await db.getConnection();
  try {
    await ensureSchoolsExtraColumns(conn);
    await ensureGroupsTable(conn);
    console.log('Migration successful');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    conn.release();
  }
}

runMigrate();
