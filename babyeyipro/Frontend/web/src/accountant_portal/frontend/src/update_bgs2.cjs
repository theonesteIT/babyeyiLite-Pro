const fs = require('fs');
const path = require('path');
const dir = 'c:/Users/user/Desktop/Pro/babyeyipro/Frontend/web/src/accountant_portal/frontend/src/pages';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsx'));

files.forEach(file => {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    const original = content;

    // Most of the components use a block like:
    // <div className="absolute inset-0 bg-[#0a192f]/85 z-10 backdrop-blur-[2px]"></div>
    // <img src="/teacher.jpg" alt="Hero Background" className="absolute inset-0 w-full h-full object-cover scale-105" />
    // <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#000435]/40 via-transparent to-transparent z-10 max-w-[1600px] mx-auto"></div>

    content = content.replace(/<div className="absolute inset-0 bg-\[#0[aA]192[fF]\].*?<\/div>\s*<img src="\/teacher\.jpg".*?>\s*<div className="absolute inset-0 bg-\[radial-gradient.*?<\/div>/gs, '');

    content = content.replace(/<div className="absolute inset-0 bg-\[#0a192f\]\/80 z-10 backdrop-blur-\[2px\]"><\/div>\s*<img src="\/teacher\.jpg" alt="Hero Background" className="absolute inset-0 w-full h-full object-cover scale-105" \/>\s*<div className="absolute inset-0 bg-\[radial-gradient\(ellipse_at_top_right,_var\(--tw-gradient-stops\)\)\] from-\[#000435\]\/40 via-transparent to-transparent z-10 max-w-\[1600px\] mx-auto"><\/div>/gs, '');

    // Wait, the parent of those 3 divs is:
    // <div className="relative w-full min-h-[280px] overflow-hidden">
    // If I strip the 3 divs, it remains `overflow-hidden`. I should change its background to #000435 so the entire hero section is solid #000435.
    // Actually, I can replace the parent's `className` directly.

    content = content.replace(/<div className="relative w-full min-h-\[280px\] overflow-hidden( rounded-2xl)?( rounded-3xl)?( lg:rounded-3xl)?">/g, '<div className="relative w-full min-h-[280px] overflow-hidden bg-[#000435]$1$2$3">');
    // Also for Dashboard height
    content = content.replace(/<div className="relative w-full h-\[300px\] lg:h-\[340px\] bg-\[#000435\] overflow-hidden rounded-b-\[40px\] lg:rounded-b-\[60px\]">/g, '<div className="relative w-full h-[300px] lg:h-[340px] bg-[#000435] overflow-hidden rounded-b-[40px] lg:rounded-b-[60px]">');
    // Dashboard had: <img src="/teacher.jpg" ... /> inside it. Remove it:
    content = content.replace(/<img src="\/teacher\.jpg" alt="Hero Background" className="absolute inset-0 w-full h-full object-cover opacity-20 mix-blend-overlay" \/>/gs, '');

    if (content !== original) {
        fs.writeFileSync(filePath, content);
        console.log("Updated: " + file);
    }
});
console.log('Done');
