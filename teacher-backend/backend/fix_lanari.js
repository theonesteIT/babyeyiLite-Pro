const bcrypt = require('bcryptjs');
const { promisePool } = require('./config/database');

async function resetTeacher() {
  try {
    const email = 'lanari.rw@gmail.com';
    const newPassword = 'Password123!';
    const hash = await bcrypt.hash(newPassword, 12);

    const [result] = await promisePool.query(
      'UPDATE users SET password_hash = ?, force_password_change = 0, is_active = 1 WHERE email = ?',
      [hash, email]
    );

    if (result.affectedRows > 0) {
      console.log(`✅  Successfully reset password for ${email} to "Password123!"`);
      
      // Also ensure they have a staff record for login join
      const [[user]] = await promisePool.query('SELECT id FROM users WHERE email = ?', [email]);
      if (user) {
        const [[staff]] = await promisePool.query('SELECT id FROM staff WHERE user_id = ?', [user.id]);
        if (!staff) {
          console.log('⚠️  Warning: User exists but has no staff record. Creating one...');
          await promisePool.query(
            'INSERT INTO staff (user_id, staff_id, username, role_id) VALUES (?, ?, ?, ?)',
            [user.id, 'ST-FIXED', 'lanari', 1] // Assuming role 1 or suitable default
          );
        }
      }
    } else {
      console.log(`❌  User ${email} not found in database.`);
    }
    process.exit(0);
  } catch (err) {
    console.error('❌ Error resetting password:', err);
    process.exit(1);
  }
}

resetTeacher();
