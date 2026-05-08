'use strict';

require('dotenv').config();

const shared = {
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'school_db',
  },
  migrations: {
    directory: './migrations',
    tableName: 'schema_migrations',
  },
};

module.exports = {
  development: shared,
  production: shared,
};
