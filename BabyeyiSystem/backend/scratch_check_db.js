'use strict';

const mysql = require('mysql2/promise');
require('dotenv').config();

async function main() {
  const connectionConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'school_db',
  };

  try {
    const connection = await mysql.createConnection(connectionConfig);
    console.log('✅ Connected to school_db!');

    const [rows] = await connection.query('SELECT * FROM schema_migrations');
    console.log('\nExecuted Migrations inside schema_migrations:');
    if (rows.length === 0) {
      console.log('  (No migrations found)');
    } else {
      rows.forEach(row => {
        console.log(`  - ${row.name || row.migration_name || Object.values(row).join(', ')}`);
      });
    }

    await connection.end();
  } catch (err) {
    console.error('❌ Failed:', err.message);
  }
}

main();
