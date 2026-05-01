const fs = require('fs');
const file = 'C:/Users/user/Desktop/Pro/BabyeyiSystem/frontend/src/Pages/Public Page/PublicShuleCard.jsx';
const lines = fs.readFileSync(file, 'utf8').split('\n');
const fixedLines = lines.slice(940); // 0-indexed, drop first 940 lines
fs.writeFileSync(file, fixedLines.join('\n'), 'utf8');
console.log('Fixed file');
