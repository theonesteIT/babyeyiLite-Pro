const bcrypt = require('bcryptjs');
const { promisePool } = require('./config/database');

async function testLogin(identifier, password) {
  const id = identifier.trim().toLowerCase();
  const sql = `
    SELECT u.id, u.email, u.password_hash, u.is_active, r.role_code
    FROM users u
    LEFT JOIN roles r ON u.role_id = r.id
    LEFT JOIN staff st ON u.id = st.user_id
    WHERE (u.email = ? OR u.user_uid = ? OR st.staff_id = ? OR st.username = ?)
    AND u.deleted_at IS NULL
    LIMIT 1
  `;
  try {
    const [rows] = await promisePool.query(sql, [id, id, id, id]);
    if (rows.length === 0) {
      console.log('User not found');
      return;
    }
    const user = rows[0];
    console.log('User found:', user.email, 'Role:', user.role_code);
    const valid = await bcrypt.compare(password, user.password_hash);
    console.log('Password valid:', valid);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

// Replace with the credentials you are testing
const testEmail = process.argv[2];
const testPass = process.argv[3];

if (!testEmail || !testPass) {
  console.log('Usage: node test_auth.js <email/username> <password>');
  process.exit(1);
}

testLogin(testEmail, testPass);
