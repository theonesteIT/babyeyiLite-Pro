const { promisePool: db } = require('./config/database');

async function testLoad() {
  const id = 1;
  try {
    await db.query(`
      UPDATE schools SET 
      school_category = 'O-Level,A-Level',
      boarding_type = 'Mixed',
      a_level_combinations = '["PCM","PCB"]'
      WHERE id = ?
    `, [id]);
    
    await db.query('DELETE FROM school_groups WHERE school_id = ?', [id]);
    await db.query(`
      INSERT INTO school_groups (school_id, group_name, stream_name, category, combination)
      VALUES 
      (?, 'S1', 'A', 'O-Level', NULL),
      (?, 'S4', 'A', 'A-Level', 'PCM')
    `, [id, id]);
    
    console.log('Seeded school ID 1 successfully.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

testLoad();
