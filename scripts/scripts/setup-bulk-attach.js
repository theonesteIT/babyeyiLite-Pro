#!/usr/bin/env node
/**
 * ================================================================
 * setup-bulk-attach.js
 * 
 * Install dependencies and validate setup
 * ================================================================
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SCRIPT_DIR = __dirname;
const BACKEND_DIR = path.resolve(SCRIPT_DIR, '..');

console.log('🔧 SETUP: Bulk Photo Attachment');
console.log('='.repeat(60));

// 1. Check dependencies
console.log('\n1️⃣  Checking npm dependencies...');
const packageJson = require(path.join(BACKEND_DIR, 'package.json'));
const required = ['string-similarity', 'mysql2'];
const missing = [];

for (const pkg of required) {
  if (!packageJson.dependencies[pkg]) {
    missing.push(pkg);
  }
}

if (missing.length > 0) {
  console.log(`⚠️  Missing packages: ${missing.join(', ')}`);
  console.log('📦 Installing...');
  try {
    execSync(`npm install ${missing.join(' ')}`, { cwd: BACKEND_DIR, stdio: 'inherit' });
    console.log('✅ Dependencies installed');
  } catch (err) {
    console.error('❌ Failed to install dependencies:', err.message);
    process.exit(1);
  }
} else {
  console.log('✅ All dependencies present');
}

// 2. Ensure upload directory exists
console.log('\n2️⃣  Setting up upload directory...');
const uploadDir = path.join(BACKEND_DIR, 'uploads', 'student-profile-photos');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log(`✅ Created: ${uploadDir}`);
} else {
  console.log(`✅ Already exists: ${uploadDir}`);
}

// 3. Ensure results directory exists
console.log('\n3️⃣  Setting up results directory...');
const resultsDir = path.join(BACKEND_DIR, 'results-bulk-attach');
if (!fs.existsSync(resultsDir)) {
  fs.mkdirSync(resultsDir, { recursive: true });
  console.log(`✅ Created: ${resultsDir}`);
} else {
  console.log(`✅ Already exists: ${resultsDir}`);
}

// 4. Create input JSON template if not exists
console.log('\n4️⃣  Checking input JSON...');
const inputPath = path.join(BACKEND_DIR, 'input-students.json');
if (!fs.existsSync(inputPath)) {
  console.log('⚠️  input-students.json not found');
  console.log('📝 Creating template...');
  const template = {
    total: 0,
    students: [
      {
        student_name: "GWIZA NOLAN",
        class: "P1B",
        pic_id: 5592,
        flag: "confirmed"
      }
    ],
    flag_summary: {
      confirmed: 0,
      flagged: 0,
      new_from_book1: 0,
      total: 0
    }
  };
  fs.writeFileSync(inputPath, JSON.stringify(template, null, 2));
  console.log(`✅ Created template: ${inputPath}`);
  console.log('   ⚠️  Update with your actual student data!');
} else {
  console.log(`✅ Found: ${inputPath}`);
}

console.log('\n' + '='.repeat(60));
console.log('✅ SETUP COMPLETE');
console.log('='.repeat(60));
console.log('\n📌 NEXT STEPS:');
console.log('1. Update input-students.json with your student data');
console.log('2. Run: node scripts/bulk-attach-photos.js');
console.log('3. Check results-bulk-attach/ for reports\n');
