#!/usr/bin/env node
/**
 * ================================================================
 * backup-database.js
 * 
 * Create database backup before bulk photo attachment
 * Generates SQL dump file for easy rollback
 * ================================================================
 */

'use strict';

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function backupDatabase() {
  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'babyeyi',
  };

  console.log('\n🔐 DATABASE BACKUP');
  console.log('='.repeat(60));
  console.log(`Host: ${config.host}`);
  console.log(`Database: ${config.database}`);

  let connection;

  try {
    // Connect
    connection = await mysql.createConnection(config);
    console.log('✅ Connected to database\n');

    // Get all students with photos (only those we might modify)
    console.log('📋 Backing up student photo records...');
    const [students] = await connection.query(
      `SELECT id, student_uid, first_name, last_name, student_photo, school_id 
       FROM students 
       WHERE school_id = 'oo1' AND deleted_at IS NULL
       ORDER BY id ASC`
    );

    console.log(`✅ Found ${students.length} student records`);

    // Create backup directory
    const backupDir = path.join(__dirname, '../backups-bulk-attach');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const backupFile = path.join(backupDir, `student-photos-backup-${timestamp}.json`);

    // Save backup
    const backup = {
      timestamp: new Date().toISOString(),
      database: config.database,
      school_id: 'oo1',
      total_records: students.length,
      students: students.map(s => ({
        id: s.id,
        student_uid: s.student_uid,
        first_name: s.first_name,
        last_name: s.last_name,
        student_photo: s.student_photo,
      })),
    };

    fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
    console.log(`✅ Backup saved: ${backupFile}\n`);

    // Generate rollback script
    const rollbackFile = path.join(backupDir, `rollback-photos-${timestamp}.sql`);
    const rollbackSql = generateRollbackSql(students);
    fs.writeFileSync(rollbackFile, rollbackSql);
    console.log(`✅ Rollback script: ${rollbackFile}\n`);

    console.log('='.repeat(60));
    console.log('✅ BACKUP COMPLETE');
    console.log('='.repeat(60));
    console.log('\n📌 To rollback after bulk attach, run:');
    console.log(`   mysql -u${config.user} ${config.database} < ${rollbackFile}\n`);

    return { backupFile, rollbackFile, studentCount: students.length };

  } catch (err) {
    console.error('❌ BACKUP FAILED:', err.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

/**
 * Generate SQL to restore all student_photo fields to their pre-backup state
 */
function generateRollbackSql(students) {
  const updates = students.map(s => {
    const photoValue = s.student_photo ? `'${s.student_photo.replace(/'/g, "''")}'` : 'NULL';
    return `UPDATE students SET student_photo = ${photoValue} WHERE id = ${s.id};`;
  });

  return `-- ================================================================
-- ROLLBACK SCRIPT: Restore student photos to pre-backup state
-- ================================================================
-- Generated: ${new Date().toISOString()}
-- Total records to restore: ${students.length}
--
-- TO USE:
--   mysql -uroot babyeyi < rollback-photos-TIMESTAMP.sql
--
-- ================================================================

BEGIN;

${updates.join('\n')}

COMMIT;

-- ✅ Rollback complete! All student photos restored.
`;
}

// Run
backupDatabase().catch(console.error);
