const fs = require('fs');

const skipped = JSON.parse(fs.readFileSync('c:/Users/HP/Documents/ny/babyeyiLite-Pro-main/BabyeyiSystem/backend/results-bulk-attach/skipped.json', 'utf8'));

let missingPhotos = 0;
let lowConfidence = 0;
let otherReasons = 0;

const lowConfidenceExamples = [];

skipped.forEach(record => {
  if (record.reason.includes('Photo file not found')) {
    missingPhotos++;
  } else if (record.reason.includes('No match found')) {
    lowConfidence++;
    if (lowConfidenceExamples.length < 10) {
      lowConfidenceExamples.push(`Name in Excel/JSON: "${record.json_name}" (Class: ${record.class})`);
    }
  } else {
    otherReasons++;
  }
});

console.log('=== SKIPPED RECORDS ANALYSIS ===');
console.log(`Total Skipped: ${skipped.length}`);
console.log(`1. Missing Photo Files: ${missingPhotos}`);
console.log(`2. Name Match Confidence < 80%: ${lowConfidence}`);
if (otherReasons > 0) {
  console.log(`3. Other Reasons: ${otherReasons}`);
}

console.log('\n--- Examples of Names with Low Match Confidence ---');
lowConfidenceExamples.forEach(ex => console.log(ex));
