const { promisePool: db } = require('./config/database');

async function verify() {
  try {
    const [rows] = await db.query('SELECT * FROM schools WHERE id = 1');
    console.log('School Row:', JSON.stringify(rows[0], null, 2));
    
    const [gRows] = await db.query('SELECT * FROM school_groups WHERE school_id = 1');
    console.log('Groups Rows:', JSON.stringify(gRows, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

verify();
