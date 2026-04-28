const { promisePool } = require('./config/database');

async function checkSchema() {
  try {
    const [tables] = await promisePool.query('SHOW TABLES');
    console.log('Tables:', JSON.stringify(tables, null, 2));
    
    for (const tableRow of tables) {
      const tableName = Object.values(tableRow)[0];
      if (tableName.includes('staff') || tableName.includes('attendance') || tableName.includes('performance') || tableName.includes('appraisal') || tableName.includes('role')) {
        const [columns] = await promisePool.query(`DESCRIBE ${tableName}`);
        console.log(`\n--- Schema for ${tableName} ---`);
        console.log(JSON.stringify(columns, null, 2));
      }
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkSchema();
