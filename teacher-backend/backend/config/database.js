'use strict';

// ================================================================
// config/database.js
//
// FIX: Removed `acquireTimeout` — not a valid mysql2 pool option.
//      Valid mysql2 pool options: waitForConnections, connectionLimit,
//      queueLimit, enableKeepAlive, keepAliveInitialDelay, connectTimeout.
// ================================================================

const mysql = require('mysql2');
require('dotenv').config();

// ── Connection pool ──────────────────────────────────────────────
const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '3306'),
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'babyeyi_teacher',

  // Pool settings
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,          // 0 = unlimited queue

  // Keep-alive (prevents dropped idle connections)
  enableKeepAlive:        true,
  keepAliveInitialDelay:  10000,  // ms before first keepalive ping

  // ⚠️  connectTimeout is valid; acquireTimeout is NOT (removed)
  connectTimeout: 10000,

  // Timezone & charset
  timezone:   'local',
  charset:    'utf8mb4',
});

// Promise wrapper — used by all route files
const promisePool = pool.promise();

// ── Test connection ──────────────────────────────────────────────
const testConnection = async () => {
  try {
    const conn = await promisePool.getConnection();
    console.log('✅  Database connected');
    console.log(`    DB   : ${process.env.DB_NAME || 'babyeyi'}`);
    console.log(`    Host : ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 3306}`);
    conn.release();
    return true;
  } catch (err) {
    console.error('❌  Database connection failed:', err.message);
    console.error('    Check .env — DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT');
    return false;
  }
};

// ── Simple query helper ──────────────────────────────────────────
const executeQuery = async (sql, params = []) => {
  try {
    const [rows] = await promisePool.execute(sql, params);
    return rows;
  } catch (err) {
    console.error('❌  Query error:', err.message);
    console.error('    SQL:', sql.substring(0, 120));
    throw err;
  }
};

// ── Transaction helper ───────────────────────────────────────────
const executeTransaction = async (queries) => {
  const conn = await promisePool.getConnection();
  try {
    await conn.beginTransaction();
    const results = [];
    for (const { query, params = [] } of queries) {
      const [result] = await conn.execute(query, params);
      results.push(result);
    }
    await conn.commit();
    return results;
  } catch (err) {
    await conn.rollback();
    console.error('❌  Transaction rolled back:', err.message);
    throw err;
  } finally {
    conn.release();
  }
};

// ── Pool error guard ─────────────────────────────────────────────
pool.on('error', err => {
  console.error('❌  Unexpected pool error:', err.message);
});

module.exports = {
  pool,
  promisePool,
  testConnection,
  executeQuery,
  executeTransaction,
  query: executeQuery,   // alias for legacy callers
};