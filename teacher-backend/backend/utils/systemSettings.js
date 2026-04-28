'use strict';

const { promisePool } = require('../config/database');

let tableReady = false;

async function ensureTable() {
  if (tableReady) return;
  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS system_settings (
      \`key\` VARCHAR(64) NOT NULL PRIMARY KEY,
      \`value\` VARCHAR(255) NOT NULL DEFAULT '0',
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  tableReady = true;
}

function parseBool(v) {
  return v === '1' || v === 'true' || v === 1;
}

async function getSettings() {
  await ensureTable();
  const [rows] = await promisePool.query(
    'SELECT `key`, `value` FROM system_settings WHERE `key` IN (?, ?)',
    ['maintenance_mode', 'block_non_super_writes']
  );
  const map = Object.fromEntries(rows.map(r => [r.key, r.value]));
  return {
    maintenance_mode: parseBool(map.maintenance_mode),
    block_non_super_writes: parseBool(map.block_non_super_writes),
  };
}

async function setSetting(key, value) {
  await ensureTable();
  const v = value ? '1' : '0';
  await promisePool.query(
    'INSERT INTO system_settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)',
    [key, v]
  );
}

module.exports = {
  ensureTable,
  getSettings,
  setSetting,
};
