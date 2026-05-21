import fs from 'fs';
import path from 'path';

const root = path.resolve('src/lite/teacher/pages');
const skip = new Set(['Login.jsx', 'PublicTempplate.jsx', 'LoginFix.jsx', 'FeaturePlaceholders.jsx']);

for (const f of fs.readdirSync(root)) {
  if (!f.endsWith('.jsx') || skip.has(f)) continue;
  const fp = path.join(root, f);
  let c = fs.readFileSync(fp, 'utf8');
  if (!c.includes("navigate('/") && !c.includes('navigate("/') && !c.includes('to="/') && !c.includes("to='/")) continue;
  if (!c.includes("from '../utils/href'")) {
    c = c.replace(/^(import React[^\n]*\n)/m, "$1import { h } from '../utils/href';\n");
  }
  c = c.replace(/navigate\((['"])\/([^'"]*)\1/g, "navigate(h('/$2')");
  c = c.replace(/to=(['"])\/([^'"]*)\1/g, "to={h('/$2')}");
  fs.writeFileSync(fp, c);
}

console.log('done');
