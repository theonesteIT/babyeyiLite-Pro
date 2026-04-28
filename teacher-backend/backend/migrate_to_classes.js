const { promisePool: db } = require('./config/database');

async function migrate() {
  const conn = await db.getConnection();
  try {
    console.log('--- Database Migration Started ---');
    
    // 1. Check if school_groups exists
    const [groupsExist] = await conn.query("SHOW TABLES LIKE 'school_groups'");
    const [classesExist] = await conn.query("SHOW TABLES LIKE 'school_classes'");

    if (groupsExist.length > 0) {
      if (classesExist.length > 0) {
        console.log('⚠️ school_classes already exists. Merging/Deleting old table.');
        await conn.query('DROP TABLE school_groups');
      } else {
        console.log('🚀 Renaming school_groups to school_classes...');
        await conn.query('RENAME TABLE school_groups TO school_classes');
      }
    } else if (classesExist.length > 0) {
      console.log('✅ school_classes already exists. No rename needed.');
    } else {
      console.log('💡 No school_groups found. Creating school_classes...');
      await conn.query(`
        CREATE TABLE IF NOT EXISTS school_classes (
          id INT AUTO_INCREMENT PRIMARY KEY,
          school_id INT UNSIGNED NOT NULL,
          group_name VARCHAR(100) NOT NULL,
          stream_name VARCHAR(100) NULL,
          category VARCHAR(50) NULL,
          combination JSON NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          KEY idx_school_id (school_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    }

    // 2. Ensure schema is correct (JSON combination)
    console.log('⚙️ Ensuring JSON combination column...');
    await conn.query("ALTER TABLE school_classes MODIFY COLUMN combination JSON NULL").catch(() => {});

    console.log('--- Database Migration Complete ---');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    conn.release();
  }
}

migrate();
