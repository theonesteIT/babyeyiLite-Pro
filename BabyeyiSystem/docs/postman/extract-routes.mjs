import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.join(__dirname, '../../backend');
const serverJs = path.join(backendRoot, 'server.js');

const MOUNTS = [
  ['/api/auth', 'authPages/auth.js'],
  ['/api/shule-avance-partner', 'BabyeyiRoutes/shuleAvanceOrgPortal.js'],
  ['/api/babyeyi', 'BabyeyiRoutes/babyeyi-deo.js'],
  ['/api/babyeyi', 'BabyeyiRoutes/babyeyi.js'],
  ['/api/babyeyi', 'BabyeyiRoutes/babyeyi-hash-patch.js'],
  ['/api/fee-limits', 'BabyeyiRoutes/Fee_limits.js'],
  ['/api/public/schools', 'BabyeyiRoutes/publicSchoolRegistration.js'],
  ['/api/district/babyeyi', 'BabyeyiRoutes/DistrictBabyeyi.js'],
  ['/api/nesa/babyeyi', 'BabyeyiRoutes/nesaBabyeyi.js'],
  ['/api/mini-websites', 'BabyeyiRoutes/miniWebsites.js'],
  ['/api/admissions', 'BabyeyiRoutes/admissionRoutes.js'],
  ['/api/requirement-prices', 'BabyeyiRoutes/requirementPrice.js'],
  ['/api/student-services', 'BabyeyiRoutes/studentServicesRoutes.js'],
  ['/api/standard-shule-kits', 'BabyeyiRoutes/standardShuleKitRoutes.js'],
  ['/api/uniform-vouchers', 'BabyeyiRoutes/uniformVoucherRoutes.js'],
  ['/api/public/babyeyi-pay', 'BabyeyiRoutes/publicBabyeyiPay.js'],
  ['/api/public/classkit-share', 'BabyeyiRoutes/classkitShareRoutes.js'],
  ['/api/momo', 'BabyeyiRoutes/momoRoutes.js'],
  ['/api/public/public-pay', 'BabyeyiRoutes/publicPaySchoolFlow.js'],
  ['/api', 'BabyeyiRoutes/library.js'],
  ['/api', 'BabyeyiRoutes/parentPortal.js'],
  ['/api', 'BabyeyiRoutes/onlineServiceRoutes.js'],
  ['/api', 'BabyeyiRoutes/studentCards.js'],
  ['/api/parent-portal/public/babyeyi-finder', 'BabyeyiRoutes/publicBabyeyiPay.js'],
  ['/api', 'BabyeyiRoutes/students.js'],
  ['/api', 'BabyeyiRoutes/schoolStaff.js'],
  ['/api', 'BabyeyiRoutes/accountantFees.js'],
  ['/api', 'BabyeyiRoutes/discipline.js'],
  ['/api', 'BabyeyiRoutes/dosAcademic.js'],
  ['/api', 'BabyeyiRoutes/schoolClasses.js'],
  ['/api/teacher-portal', 'BabyeyiRoutes/teacherPortal.js'],
  ['/api', 'BabyeyiRoutes/schoolRoleOperations.js'],
  ['/api', 'BabyeyiRoutes/portalOperations.js'],
  ['/api', 'BabyeyiRoutes/chatRoutes.js'],
  ['/api', 'BabyeyiRoutes/studentPermissions.js'],
  ['/api/services', 'BabyeyiRoutes/shuleAvanceServices.js'],
  ['/api', 'BabyeyiRoutes/studentTransfer.js'],
  ['/api/locations', 'locationsRoutes/locationRoutes.js'],
  ['/api', 'BabyeyiRoutes/school-add.js'],
];

function extractRouterPaths(filePath) {
  const full = path.join(backendRoot, filePath);
  if (!fs.existsSync(full)) return [];
  const t = fs.readFileSync(full, 'utf8');
  const out = [];
  const re = /router\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/gi;
  let m;
  while ((m = re.exec(t))) {
    out.push({ method: m[1].toUpperCase(), path: m[2] });
  }
  return out;
}

function extractNamedRouterPaths(filePath, routerVar) {
  const full = path.join(backendRoot, filePath);
  if (!fs.existsSync(full)) return [];
  const t = fs.readFileSync(full, 'utf8');
  const out = [];
  const escaped = routerVar.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(
    `${escaped}\\.(get|post|put|patch|delete)\\s*\\(\\s*['"\`]([^'"\`]+)['"\`]`,
    'gi'
  );
  let m;
  while ((m = re.exec(t))) {
    out.push({ method: m[1].toUpperCase(), path: m[2] });
  }
  return out;
}

const NAMED_ROUTER_MOUNTS = [
  ['/api/field-agents', 'BabyeyiRoutes/fieldAgentsRoutes.js', 'adminRouter'],
  ['/api/agent', 'BabyeyiRoutes/fieldAgentsRoutes.js', 'agentRouter'],
  ['/api/public/agents', 'BabyeyiRoutes/fieldAgentsRoutes.js', 'publicRouter'],
  ['/api/representatives', 'BabyeyiRoutes/representativesRoutes.js', 'adminRouter'],
  ['/api/representative', 'BabyeyiRoutes/representativesRoutes.js', 'repRouter'],
  ['/api', 'BabyeyiRoutes/chatRoutes.js', 'router'],
];

function joinPath(prefix, routePath) {
  const p = prefix.replace(/\/$/, '');
  const r = routePath.startsWith('/') ? routePath : `/${routePath}`;
  if (r === '/') return p || '/';
  return `${p}${r}`.replace(/\/+/g, '/');
}

const routes = [];
for (const row of MOUNTS) {
  const [mount, file] = row;
  for (const r of extractRouterPaths(file)) {
    routes.push({ mount, file, method: r.method, path: joinPath(mount, r.path), routePath: r.path });
  }
}
for (const [mount, file, routerVar] of NAMED_ROUTER_MOUNTS) {
  for (const r of extractNamedRouterPaths(file, routerVar)) {
    routes.push({ mount, file: `${file}#${routerVar}`, method: r.method, path: joinPath(mount, r.path), routePath: r.path });
  }
}

// server.js direct
const srv = fs.readFileSync(serverJs, 'utf8');
const appRe = /app\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/gi;
let m;
while ((m = appRe.exec(srv))) {
  if (m[2].startsWith('/api') || m[2] === '/') {
    routes.push({ mount: 'server.js', file: 'server.js', method: m[1].toUpperCase(), path: m[2], routePath: m[2] });
  }
}

// Dedupe by method+path
const seen = new Set();
const unique = [];
for (const r of routes) {
  const k = `${r.method} ${r.path}`;
  if (seen.has(k)) continue;
  seen.add(k);
  unique.push(r);
}
unique.sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));

const postmanPath = path.join(__dirname, 'BabyeyiSystem.postman_collection.json');
const col = JSON.parse(fs.readFileSync(postmanPath, 'utf8'));

function walk(items, out) {
  for (const it of items || []) {
    if (it.request?.url) {
      const u = typeof it.request.url === 'string' ? it.request.url : it.request.url.raw || '';
      const norm = u
        .replace(/\{\{baseUrl\}\}/g, '')
        .replace(/https?:\/\/[^/]+/g, '')
        .split('?')[0]
        .replace(/\/\d+(?=\/|$)/g, '/:id')
        .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id');
      out.push({ name: it.name, method: it.request.method, path: norm });
    }
    if (it.item) walk(it.item, out);
  }
}

const postmanReqs = [];
walk(col.item, postmanReqs);

function normBackend(p) {
  return p.replace(/\/\d+(?=\/|$)/g, '/:id');
}

const postmanSet = new Set(postmanReqs.map((r) => `${r.method} ${r.path}`));

const missing = [];
for (const r of unique) {
  const np = normBackend(r.path);
  const key = `${r.method} ${np}`;
  // also try without :id segments matching numbers in postman
  let found = postmanSet.has(key);
  if (!found) {
    for (const pr of postmanReqs) {
      if (pr.method !== r.method) continue;
      const a = np.replace(/:id/g, '');
      const b = pr.path.replace(/:id/g, '');
      if (a === b || pr.path === np) {
        found = true;
        break;
      }
    }
  }
  if (!found) missing.push(r);
}

fs.writeFileSync(path.join(__dirname, '_backend_routes.json'), JSON.stringify(unique, null, 2));
fs.writeFileSync(path.join(__dirname, '_missing_routes.json'), JSON.stringify(missing, null, 2));
console.log('Backend routes:', unique.length);
console.log('Postman requests:', postmanReqs.length);
console.log('Missing from Postman:', missing.length);
console.log('--- Missing (first 80) ---');
missing.slice(0, 80).forEach((r) => console.log(r.method, r.path, `(${r.file})`));
