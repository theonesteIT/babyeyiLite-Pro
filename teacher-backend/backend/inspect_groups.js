const { promisePool: db } = require('./config/database');

async function checkSchema() {
  try {
    const [rows] = await db.query('DESCRIBE school_groups');
    console.log('Columns in school_groups table:', rows.map(r => r.Field));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkSchema();
