/**
 * ================================================================
 * config-bulk-attach.js
 * 
 * Easy-to-edit configuration for bulk photo attachment
 * Edit this file to customize the script behavior
 * ================================================================
 */

module.exports = {
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // DATABASE SETTINGS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    name: process.env.DB_NAME || 'babyeyi',
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SCHOOL SETTINGS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  school: {
    id: 1, // Change this to your school ID if different
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // FUZZY MATCHING SETTINGS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  matching: {
    // Confidence threshold: only match if similarity >= this value
    // Values: 0.0 to 1.0
    // - 0.70 = More relaxed (70% = match)   → more matches, possibly some errors
    // - 0.80 = Balanced (80% = match)       → recommended
    // - 0.90 = Strict (90% = match)         → fewer matches, more false negatives
    confidenceThreshold: 0.80,
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // FILE & DIRECTORY SETTINGS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  paths: {
    // Path to WISDOM PHOTOS folder (flat structure: IMG_5592.JPG, IMG_5595.JPG, etc.)
    photosBaseDir: './scripts/uploads/student-profile-photos',

    // Input JSON file with student list
    inputJson: './scripts/input-students.json',

    // Where to save uploaded photos
    uploadDir: './uploads/student-profile-photos',

    // Where to save reports
    resultsDir: './results-bulk-attach',
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // BEHAVIOR SETTINGS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  behavior: {
    // Stop on first error? (true = stop, false = continue)
    stopOnError: false,

    // Overwrite existing photos? (true = yes, false = skip)
    overwriteExisting: true,

    // Verbosity level: 'debug', 'info', 'warn'
    logLevel: 'info',
  },
};
