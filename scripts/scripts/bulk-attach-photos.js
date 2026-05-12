#!/usr/bin/env node
/**
 * ================================================================
 * bulk-attach-photos.js
 * 
 * Fuzzy-match student names from JSON to DB students
 * Attach photos only if confidence > threshold
 * Skip low-confidence matches with logging
 * 
 * Usage:
 *   node bulk-attach-photos.js --school-code 01003 input-nursery1.json
 *   node bulk-attach-photos.js --school-code 01003
 *   node bulk-attach-photos.js input-nursery1.json          (defaults to school_id=1)
 *   node bulk-attach-photos.js                               (defaults to school_id=1 + input-students.json)
 * ================================================================
 */

'use strict';

const fs = require('fs');
const path = require('path');
const stringSimilarity = require('string-similarity');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// ════════════════════════════════════════════════════════════════
// PARSE CLI ARGS
// ════════════════════════════════════════════════════════════════

function parseArgs() {
  const args = process.argv.slice(2);
  let schoolCode = null;
  let inputFile = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--school-code' && args[i + 1]) {
      schoolCode = args[i + 1];
      i++;
    } else if (!args[i].startsWith('--')) {
      inputFile = args[i];
    }
  }

  return { schoolCode, inputFile };
}

const cliArgs = parseArgs();

// ════════════════════════════════════════════════════════════════
// CONFIG
// ════════════════════════════════════════════════════════════════

const CONFIG = {
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: parseInt(process.env.DB_PORT || 3306),
  DB_USER: process.env.DB_USER || 'root',
  DB_PASSWORD: process.env.DB_PASSWORD || '',
  DB_NAME: process.env.DB_NAME || 'babyeyi',

  SCHOOL_CODE: cliArgs.schoolCode,
  SCHOOL_ID: null, // resolved at runtime from school_code
  CONFIDENCE_THRESHOLD: 0.80,
  PHOTOS_BASE_DIR: path.join(__dirname, 'uploads', 'student-profile-photos'),
  INPUT_JSON: cliArgs.inputFile
    ? path.resolve(cliArgs.inputFile)
    : path.join(__dirname, 'input-students.json'),
  UPLOAD_DIR: path.join(__dirname, '../uploads/student-profile-photos'),
  RESULTS_DIR: path.join(__dirname, 'results-bulk-attach'),
};

// ════════════════════════════════════════════════════════════════
// LOGGER
// ════════════════════════════════════════════════════════════════

class Logger {
  constructor(resultsDir) {
    this.resultsDir = resultsDir;
    if (!fs.existsSync(resultsDir)) fs.mkdirSync(resultsDir, { recursive: true });

    this.attached = [];
    this.skipped = [];
    this.errors = [];
    this.startTime = new Date();
  }

  logAttached(record) {
    this.attached.push({
      ...record,
      timestamp: new Date().toISOString(),
    });
    console.log(`✅ ATTACHED: pic_id=${record.pic_id} → student_id=${record.student_id} (${record.student_name})`);
  }

  logSkipped(record, reason) {
    this.skipped.push({
      ...record,
      reason,
      timestamp: new Date().toISOString(),
    });
    console.log(`⏭️  SKIPPED: pic_id=${record.pic_id} (${record.json_name}) - ${reason}`);
  }

  logError(record, error) {
    this.errors.push({
      ...record,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
    console.error(`❌ ERROR: pic_id=${record.pic_id} - ${error.message}`);
  }

  saveReports() {
    const endTime = new Date();
    const duration = (endTime - this.startTime) / 1000;

    const summary = {
      started_at: this.startTime.toISOString(),
      completed_at: endTime.toISOString(),
      duration_seconds: Math.round(duration),
      total_processed: this.attached.length + this.skipped.length + this.errors.length,
      attached: this.attached.length,
      skipped: this.skipped.length,
      errors: this.errors.length,
      success_rate: `${((this.attached.length / (this.attached.length + this.skipped.length + this.errors.length)) * 100).toFixed(1)}%`,
    };

    console.log('\n' + '='.repeat(60));
    console.log('FINAL REPORT');
    console.log('='.repeat(60));
    console.log(JSON.stringify(summary, null, 2));

    fs.writeFileSync(
      path.join(this.resultsDir, 'attached.json'),
      JSON.stringify(this.attached, null, 2)
    );
    console.log(`📄 Saved: ${path.join(this.resultsDir, 'attached.json')} (${this.attached.length} records)`);

    fs.writeFileSync(
      path.join(this.resultsDir, 'skipped.json'),
      JSON.stringify(this.skipped, null, 2)
    );
    console.log(`📄 Saved: ${path.join(this.resultsDir, 'skipped.json')} (${this.skipped.length} records)`);

    fs.writeFileSync(
      path.join(this.resultsDir, 'errors.json'),
      JSON.stringify(this.errors, null, 2)
    );
    console.log(`📄 Saved: ${path.join(this.resultsDir, 'errors.json')} (${this.errors.length} records)`);

    const textReport = `
BULK PHOTO ATTACHMENT REPORT
=====================================
Date: ${new Date().toLocaleString()}
Duration: ${Math.floor(duration / 60)}m ${Math.round(duration % 60)}s

SUMMARY
-------
Total Processed: ${summary.total_processed}
✅ Successfully Attached: ${this.attached.length} (${summary.success_rate})
⏭️  Skipped (Low Confidence): ${this.skipped.length}
❌ Errors: ${this.errors.length}

ATTACHED RECORDS
----------------
${this.attached.map(r => `  • pic_id=${r.pic_id}, student_id=${r.student_id}, name="${r.student_name}", score=${r.match_score}`).join('\n')}

SKIPPED RECORDS (Low Confidence - Review Manually)
---------------------------------------------------
${this.skipped.map(r => `  • pic_id=${r.pic_id}, json_name="${r.json_name}", reason="${r.reason}"`).join('\n')}

ERRORS
------
${this.errors.map(r => `  • pic_id=${r.pic_id}, error="${r.error}"`).join('\n')}

NEXT STEPS
----------
1. Review skipped.json - decide if any should be manually matched
2. Review errors.json - address any file/database issues
3. Manual photo upload for skipped records if desired
`;

    fs.writeFileSync(
      path.join(this.resultsDir, 'report.txt'),
      textReport
    );
    console.log(`📄 Saved: ${path.join(this.resultsDir, 'report.txt')}`);
    console.log('='.repeat(60) + '\n');
  }
}

// ════════════════════════════════════════════════════════════════
// PHOTO MAPPER
// ════════════════════════════════════════════════════════════════

class PhotoMapper {
  constructor(baseDir) {
    this.baseDir = baseDir;
    this.photoMap = {};
  }

  scan() {
    console.log(`🔍 Scanning photo directory: ${this.baseDir}`);

    if (!fs.existsSync(this.baseDir)) {
      throw new Error(`Photo directory not found: ${this.baseDir}`);
    }

    const files = fs.readdirSync(this.baseDir);
    let count = 0;

    for (const file of files) {
      const match = file.match(/^2L7A(\d+)(?:_\d+)?\.jpg$/i);
      if (!match) continue;

      const picId = parseInt(match[1], 10);
      if (!this.photoMap[picId]) {
        this.photoMap[picId] = path.join(this.baseDir, file);
        count++;
      }
    }

    console.log(`✅ Found ${count} photos\n`);
    return count;
  }

  getPhoto(picId) {
    return this.photoMap[picId] || null;
  }

  hasPhoto(picId) {
    return picId in this.photoMap;
  }
}

// ════════════════════════════════════════════════════════════════
// FUZZY MATCHER
// ════════════════════════════════════════════════════════════════

class FuzzyMatcher {
  constructor(threshold = 0.80) {
    this.threshold = threshold;
  }

  normalize(name) {
    return (name || '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^a-z0-9\s]/g, '');
  }

  findBest(jsonName, dbStudents) {
    const normalized = this.normalize(jsonName);
    if (!normalized) return null;

    let best = { score: 0, student: null };

    for (const student of dbStudents) {
      const dbNorm = this.normalize(student.first_name + ' ' + student.last_name);
      const score = stringSimilarity.compareTwoStrings(normalized, dbNorm);

      if (score > best.score) {
        best = { score, student };
      }
    }

    if (best.score >= this.threshold) {
      return { student: best.student, score: best.score };
    }

    return null;
  }
}

// ════════════════════════════════════════════════════════════════
// DATABASE HANDLER
// ════════════════════════════════════════════════════════════════

class DatabaseHandler {
  constructor(config) {
    this.config = config;
    this.connection = null;
  }

  async connect() {
    this.connection = await mysql.createConnection({
      host: this.config.DB_HOST,
      port: this.config.DB_PORT,
      user: this.config.DB_USER,
      password: this.config.DB_PASSWORD,
      database: this.config.DB_NAME,
    });
    console.log('✅ Connected to database\n');
  }

  async close() {
    if (this.connection) await this.connection.end();
  }

  async getSchoolByCode(schoolCode) {
    const [rows] = await this.connection.query(
      `SELECT id, school_name, school_code, status
       FROM schools
       WHERE school_code = ?
       LIMIT 1`,
      [schoolCode]
    );
    return rows[0] || null;
  }

  async listSchools() {
    const [rows] = await this.connection.query(
      `SELECT id, school_name, school_code, status
       FROM schools
       WHERE status != 'deleted'
       ORDER BY school_code ASC`
    );
    return rows;
  }

  async getAllStudents(schoolId) {
    const [rows] = await this.connection.query(
      `SELECT id, first_name, last_name, class_name, student_uid, student_photo 
       FROM students 
       WHERE school_id = ?
       ORDER BY first_name ASC`,
      [schoolId]
    );
    return rows;
  }

  async attachPhoto(studentId, schoolId, photoFilename) {
    const [result] = await this.connection.query(
      `UPDATE students SET student_photo = ?, updated_at = NOW() 
       WHERE id = ? AND school_id = ?`,
      [photoFilename, studentId, schoolId]
    );
    return result.affectedRows > 0;
  }
}

// ════════════════════════════════════════════════════════════════
// RESOLVE SCHOOL
// ════════════════════════════════════════════════════════════════

async function resolveSchool(db, config) {
  if (!config.SCHOOL_CODE) {
    console.log('⚠️  No --school-code provided, defaulting to school_id=1');
    console.log('   Usage: node bulk-attach-photos.js --school-code 01003 [input.json]\n');
    return 1;
  }

  console.log(`🏫 Looking up school with code: ${config.SCHOOL_CODE}`);
  const school = await db.getSchoolByCode(config.SCHOOL_CODE);

  if (!school) {
    console.error(`\n❌ School not found with code: ${config.SCHOOL_CODE}\n`);
    console.log('Available schools:');
    console.log('-'.repeat(60));
    const schools = await db.listSchools();
    for (const s of schools) {
      console.log(`  ${s.school_code}  |  ${s.school_name}  (id=${s.id}, ${s.status})`);
    }
    console.log('-'.repeat(60));
    console.log(`\nUsage: node bulk-attach-photos.js --school-code <CODE> [input.json]\n`);
    process.exit(1);
  }

  console.log(`✅ Found: ${school.school_name} (id=${school.id}, code=${school.school_code}, status=${school.status})\n`);
  return school.id;
}

// ════════════════════════════════════════════════════════════════
// MAIN PROCESSOR
// ════════════════════════════════════════════════════════════════

async function main() {
  const logger = new Logger(CONFIG.RESULTS_DIR);
  const photoMapper = new PhotoMapper(CONFIG.PHOTOS_BASE_DIR);
  const matcher = new FuzzyMatcher(CONFIG.CONFIDENCE_THRESHOLD);
  const db = new DatabaseHandler(CONFIG);

  try {
    // 1. Scan photos
    console.log('📸 PHASE 1: Scanning Photos');
    console.log('='.repeat(60));
    photoMapper.scan();

    // 2. Load input JSON
    console.log('📋 PHASE 2: Loading Student Data');
    console.log('='.repeat(60));
    if (!fs.existsSync(CONFIG.INPUT_JSON)) {
      throw new Error(`Input JSON not found: ${CONFIG.INPUT_JSON}`);
    }
    const inputData = JSON.parse(fs.readFileSync(CONFIG.INPUT_JSON, 'utf-8'));
    const students = inputData.students || [];
    console.log(`✅ Loaded ${students.length} students from JSON\n`);

    // 3. Connect to DB & resolve school
    console.log('🔐 PHASE 3: Connecting to Database');
    console.log('='.repeat(60));
    await db.connect();

    console.log('🏫 PHASE 3b: Resolving School');
    console.log('='.repeat(60));
    CONFIG.SCHOOL_ID = await resolveSchool(db, CONFIG);

    // 4. Process each student
    console.log('⚙️  PHASE 4: Fuzzy Matching & Attaching Photos');
    console.log('='.repeat(60) + '\n');

    const byClass = {};
    for (const student of students) {
      if (!byClass[student.class]) byClass[student.class] = [];
      byClass[student.class].push(student);
    }

    let allDbStudents = [];
    try {
      allDbStudents = await db.getAllStudents(CONFIG.SCHOOL_ID);
      console.log(`✅ Loaded ${allDbStudents.length} students from database (school_id=${CONFIG.SCHOOL_ID})\n`);
    } catch (err) {
      console.error(`💥 FATAL ERROR loading students from DB: ${err.message}`);
      process.exit(1);
    }

    for (const [className, classStudents] of Object.entries(byClass)) {
      console.log(`\n📚 Class: ${className} (${classStudents.length} students)`);
      console.log('-'.repeat(40));

      let dbStudents = allDbStudents;

      if (dbStudents.length === 0) {
        console.warn(`⚠️  No students found in DB`);
        for (const student of classStudents) {
          logger.logSkipped(
            { pic_id: student.pic_id, json_name: student.student_name, class: className },
            `No students found in DB`
          );
        }
        continue;
      }

      for (const jsonStudent of classStudents) {
        try {
          const picId = jsonStudent.pic_id;
          const jsonName = jsonStudent.student_name;

          if (!picId) {
            logger.logSkipped(
              { pic_id: picId, json_name: jsonName, class: className },
              `No pic_id assigned`
            );
            continue;
          }

          if (!photoMapper.hasPhoto(picId)) {
            logger.logSkipped(
              { pic_id: picId, json_name: jsonName, class: className },
              `Photo file not found (pic_id=${picId})`
            );
            continue;
          }

          const match = matcher.findBest(jsonName, dbStudents);
          if (!match) {
            logger.logSkipped(
              { pic_id: picId, json_name: jsonName, class: className, best_score: 'N/A' },
              `No match found (confidence < ${Math.round(CONFIG.CONFIDENCE_THRESHOLD * 100)}%)`
            );
            continue;
          }

          const { student: dbStudent, score } = match;

          const sourcePhoto = photoMapper.getPhoto(picId);
          const destFileName = `student-${dbStudent.id}-${picId}-${Date.now()}.jpg`;
          const destPath = path.join(CONFIG.UPLOAD_DIR, destFileName);

          if (!fs.existsSync(CONFIG.UPLOAD_DIR)) {
            fs.mkdirSync(CONFIG.UPLOAD_DIR, { recursive: true });
          }

          fs.copyFileSync(sourcePhoto, destPath);

          await db.attachPhoto(dbStudent.id, CONFIG.SCHOOL_ID, destFileName);

          logger.logAttached({
            pic_id: picId,
            student_id: dbStudent.id,
            student_name: `${dbStudent.first_name} ${dbStudent.last_name}`,
            json_name: jsonName,
            match_score: (score * 100).toFixed(1) + '%',
            class: className,
            photo_filename: destFileName,
          });
        } catch (err) {
          logger.logError(
            { pic_id: jsonStudent.pic_id, json_name: jsonStudent.student_name, class: className },
            err
          );
        }
      }
    }

    // 5. Save reports
    console.log('\n📊 PHASE 5: Generating Reports');
    console.log('='.repeat(60));
    logger.saveReports();

  } catch (err) {
    console.error('💥 FATAL ERROR:', err.message);
    process.exit(1);
  } finally {
    await db.close();
  }
}

// ════════════════════════════════════════════════════════════════
// RUN
// ════════════════════════════════════════════════════════════════

main().catch(err => {
  console.error('UNCAUGHT ERROR:', err);
  process.exit(1);
});
