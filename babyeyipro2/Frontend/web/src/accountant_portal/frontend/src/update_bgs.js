const fs = require('fs');
const path = require('path');
const dir = 'c:/Users/user/Desktop/Pro/babyeyipro/Frontend/web/src/accountant_portal/frontend/src/pages';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsx'));

files.forEach(file => {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    const original = content;

    // Regex to match the typical image and overlay divs we used.
    // It handles <div class="absolute inset-0 bg-[#0a192f]...*/div>
    // <img src="/teacher.jpg".../>
    // <div class="absolute inset-0 bg-[radial-gradient...</div>
    // We'll replace it with a single <div className="absolute inset-0 bg-[#000435]"></div>

    content = content.replace(/<div className="absolute inset-0 bg-\[#0[aA]192[fF]\].*?<\/div>\s*<img src="\/teacher\.jpg".*?>\s*<div className="absolute inset-0 bg-\[radial-gradient.*?<\/div>/s, '<div className="absolute inset-0 bg-[#000435]"></div>');

    if (content !== original) {
        fs.writeFileSync(filePath, content);
        console.log("Updated: " + file);
    }
});
console.log('Done');
