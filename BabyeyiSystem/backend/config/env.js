'use strict';

const REQUIRED_IN_PRODUCTION = [
  'DB_HOST',
  'DB_PORT',
  'DB_USER',
  'DB_NAME',
  'SESSION_SECRET',
  'BABYEYI_HASH_SECRET',
];

function validateEnvironment() {
  const isProduction = (process.env.NODE_ENV || '').toLowerCase() === 'production';
  const missing = REQUIRED_IN_PRODUCTION.filter((key) => !String(process.env[key] || '').trim());

  if (missing.length === 0) return;

  if (isProduction) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  console.warn(`[env] Missing recommended variables for local development: ${missing.join(', ')}`);
}

module.exports = {
  validateEnvironment,
};
