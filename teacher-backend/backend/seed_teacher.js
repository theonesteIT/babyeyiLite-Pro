const bcrypt = require('bcryptjs');
const { promisePool } = require('./config/database');

async function createTestTeacher() {
  const email = 'test.teacher@test.local';
  const password = 'Password123!';
  const firstName = 'Test';
  const lastName = 'Teacher';
  const username = 'test.teacher';
  const roleCode = 'TEACHER';
  
  try {
    const [[roleRow]] = await promisePool.query('SELECT id FROM roles WHERE role_code = ? LIMIT 1', [roleCode]);
    const hash = await bcrypt.hash(password, 12);
    
    // Check if school 1 exists
    const [[school]] = await promisePool.query('SELECT id FROM schools LIMIT 1');
    if (!school) {
        console.log('No school found in DB');
        process.exit(1);
    }
    const schoolId = school.id;

    const [user] = await promisePool.query(
      'INSERT INTO users (user_uid, email, username, password_hash, first_name, last_name, role_id, school_id, is_active, is_verified) VALUES (?,?,?,?,?,?,?,?,1,1)',
      ['ST-TEST001', email, username, hash, firstName, lastName, roleRow.id, schoolId]
    );
    
    await promisePool.query(
      'INSERT INTO staff (user_id, school_id, staff_id, username) VALUES (?,?,?,?)',
      [user.insertId, schoolId, 'ST-001-TEST', username]
    );
    
    console.log('Test teacher created');
    console.log('Email:', email);
    console.log('Password:', password);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

createTestTeacher();
