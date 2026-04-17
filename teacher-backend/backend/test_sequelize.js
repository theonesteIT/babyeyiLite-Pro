'use strict';

require('dotenv').config();
const db = require('./models');

async function testSequelize() {
  try {
    console.log('🔄  Testing Sequelize connection...');
    await db.sequelize.authenticate();
    console.log('✅  Connection has been established successfully.');

    // Fetch the first 5 records from the roles table
    console.log('\n🔄  Fetching first 5 roles...');
    const roles = await db.Role.findAll({
      limit: 5,
      logging: console.log // Print the generated SQL query
    });

    console.log(`\n✅  Successfully fetched ${roles.length} roles.`);
    roles.forEach(role => {
      console.log(`- ID: ${role.id}, Name: ${role.role_name}, Code: ${role.role_code}`);
    });

  } catch (error) {
    console.error('❌  Unable to connect to the database or fetch data:', error);
  } finally {
    await db.sequelize.close();
  }
}

testSequelize();
