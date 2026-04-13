const { promisePool } = require('./config/database');

async function checkLatestStaff() {
  try {
    const [rows] = await promisePool.query(`
      SELECT u.id, u.email, u.username as user_username, st.username as staff_username, st.staff_id, u.password_hash, u.is_active, r.role_code
      FROM users u
      LEFT JOIN staff st ON u.id = st.user_id
      LEFT JOIN roles r ON u.role_id = r.id
      ORDER BY u.id DESC
      LIMIT 5
    `);
    console.log(JSON.stringify(rows, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkLatestStaff();
