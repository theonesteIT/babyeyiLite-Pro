const fs = require('fs');
const path = require('path');

const srcDir = __dirname;

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function (file) {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else {
            if (file.endsWith('.jsx') || file.endsWith('.js') || file.endsWith('.css')) {
                results.push(file);
            }
        }
    });
    return results;
}

let updatedFiles = [];
walk(srcDir).forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;

    if (/#1E3A5F/i.test(content)) {
        content = content.replace(/#1E3A5F/gi, '#000435');
        changed = true;
    }

    if (changed) {
        fs.writeFileSync(file, content);
        updatedFiles.push(path.relative(srcDir, file));
    }
});
console.log('Updated ' + updatedFiles.length + ' files:');
console.log(updatedFiles.join('\n'));
