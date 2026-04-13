const { promisePool: db } = require('./config/database');

async function revertTable() {
  const conn = await db.getConnection();
  try {
    console.log('Reverting school_classes to school_groups...');
    
    // Check if school_groups already exists
    const [existing] = await conn.query("SHOW TABLES LIKE 'school_groups'");
    if (existing.length === 0) {
      // Try to rename school_classes to school_groups
      const [classesTable] = await conn.query("SHOW TABLES LIKE 'school_classes'");
      if (classesTable.length > 0) {
        await conn.query('RENAME TABLE school_classes TO school_groups');
      }
    }
    
    console.log('Table name reverted.');
    process.exit(0);
  } catch (err) {
    console.error('Revert failed:', err);
    process.exit(1);
  } finally {
    conn.release();
  }
}

revertTable();
