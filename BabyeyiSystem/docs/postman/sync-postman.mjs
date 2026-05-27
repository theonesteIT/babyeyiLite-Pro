/**
 * Sync Postman collection with backend routes:
 * - Enhances folder 10c (school-catalog, student-catalog, E2E tests)
 * - Adds folder 19 with routes missing from the collection
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const collectionPath = path.join(__dirname, 'BabyeyiSystem.postman_collection.json');
const missingPath = path.join(__dirname, '_missing_routes.json');

const JSON_HEADER = [{ key: 'Content-Type', value: 'application/json' }];

function makeRequest(name, method, apiPath, bodyRaw = null) {
  const req = {
    name,
    request: {
      method,
      header: method !== 'GET' ? [...JSON_HEADER] : [],
      url: `{{baseUrl}}${apiPath}`,
    },
  };
  if (bodyRaw != null) {
    req.request.body = { mode: 'raw', raw: bodyRaw };
  }
  return req;
}

function postmanUrlToKey(method, url) {
  const norm = String(url)
    .replace(/\{\{baseUrl\}\}/g, '')
    .replace(/https?:\/\/[^/]+/g, '')
    .split('?')[0]
    .replace(/\/\d+(?=\/|$)/g, '/:id');
  return `${method} ${norm}`;
}

function backendPathToPostmanUrl(p) {
  return p.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, (_, name) => {
    const map = {
      id: '1',
      babyeyiId: '{{babyeyiId}}',
      schoolId: '{{schoolId}}',
      formId: '{{formId}}',
      appId: '{{appId}}',
      studentId: '{{studentId}}',
      expenseId: '1',
      paymentId: '1',
      leaderId: '1',
      docId: 'DOC-1',
      referenceNo: 'REF-001',
      slug: 'school-slug',
      filename: 'photo.jpg',
    };
    return `/${map[name] ?? '1'}`;
  });
}

function walkItems(items, fn) {
  for (const it of items || []) {
    fn(it);
    if (it.item) walkItems(it.item, fn);
  }
}

function findFolder(items, folderName) {
  for (const it of items || []) {
    if (it.name === folderName) return it;
    if (it.item) {
      const f = findFolder(it.item, folderName);
      if (f) return f;
    }
  }
  return null;
}

function collectExistingKeys(col) {
  const keys = new Set();
  walkItems(col.item, (it) => {
    if (!it.request?.url) return;
    const url = typeof it.request.url === 'string' ? it.request.url : it.request.url.raw || '';
    keys.add(postmanUrlToKey(it.request.method, url));
  });
  return keys;
}

/** Valid JSON bodies — quoted IDs avoid `001` invalid JSON when schoolId was a directory code. */
const QUOTE_BALANCE_BODY = `{
  "school_code": "{{schoolCode}}",
  "babyeyi_id": "{{babyeyiId}}",
  "selected_fee_ids": {{selectedFeeIdsJson}},
  "selected_requirement_ids": {{selectedReqIdsJson}},
  "selected_students": {{selectedStudentsJson}},
  "school_counter_credits_rwf": {}
}`;

const INTENT_BODY_GUEST = `{
  "school_code": "{{schoolCode}}",
  "babyeyi_id": "{{babyeyiId}}",
  "total_rwf": 1000,
  "status": "submitted",
  "selected_fee_ids": {{selectedFeeIdsJson}},
  "selected_requirement_ids": {{selectedReqIdsJson}},
  "selected_student": {{selectedStudentSingleJson}},
  "selected_students": {{selectedStudentsJson}},
  "payer": { "name": "Test Parent", "phone": "{{parentPhone}}", "email": null },
  "payment_plan": { "method": "momo", "payMode": "full" },
  "public_pay_no_login": true
}`;

const e2eTestScripts = {
  studentCatalog: [
    "pm.test('HTTP 200', () => pm.response.to.have.status(200));",
    "const j = pm.response.json();",
    "pm.test('success', () => pm.expect(j.success).to.eql(true));",
    "if (j.data?.school?.school_code) pm.collectionVariables.set('schoolCode', String(j.data.school.school_code));",
    "if (j.data?.school?.id) pm.collectionVariables.set('schoolId', String(j.data.school.id));",
    "const combo = (j.data?.combinations || [])[0];",
    "if (combo?.babyeyi_id) pm.collectionVariables.set('babyeyiId', String(combo.babyeyi_id));",
    "if (j.data?.student?.student_uid) pm.collectionVariables.set('studentLookupCode', String(j.data.student.student_uid));",
    "const st = j.data?.student;",
    "if (st?.id) {",
    "  const row = { student_id: st.id, student_uid: st.student_uid, student_code: st.student_code, student_name: [st.first_name, st.last_name].filter(Boolean).join(' '), first_name: st.first_name, last_name: st.last_name, class_name: st.class_name, academic_year: st.academic_year, school_name: j.data?.school?.school_name };",
    "  pm.collectionVariables.set('selectedStudentsJson', JSON.stringify([row]));",
    "  pm.collectionVariables.set('selectedStudentSingleJson', JSON.stringify(row));",
    "  pm.collectionVariables.set('studentId', String(st.id));",
    "}",
    "pm.test('schoolCode set from catalog', () => {",
    "  pm.expect(pm.collectionVariables.get('schoolCode')).to.be.a('string').and.not.empty;",
    "});",
  ],
  pricing: [
    "pm.test('HTTP 200', () => pm.response.to.have.status(200));",
    "const j = pm.response.json();",
    "pm.test('success', () => pm.expect(j.success).to.eql(true));",
    "pm.test('combined_total_rwf present', () => pm.expect(j.data).to.have.property('combined_total_rwf'));",
    "if (j.data?.babyeyi?.id) pm.collectionVariables.set('babyeyiId', String(j.data.babyeyi.id));",
    "const feeIds = (j.data?.school_fees || []).map((f) => f.id);",
    "const reqIds = (j.data?.requirements || []).map((r) => r.babyeyi_requirement_id).filter(Boolean);",
    "pm.collectionVariables.set('selectedFeeIdsJson', JSON.stringify(feeIds));",
    "pm.collectionVariables.set('selectedReqIdsJson', JSON.stringify(reqIds));",
  ],
  quoteBalance: [
    "pm.test('HTTP 200', () => pm.response.to.have.status(200));",
    "const j = pm.response.json();",
    "pm.test('success', () => pm.expect(j.success).to.eql(true));",
    "if (j.data?.remaining_rwf != null) pm.collectionVariables.set('remainingRwf', String(j.data.remaining_rwf));",
  ],
  schoolCatalog: [
    "pm.test('HTTP 200', () => pm.response.to.have.status(200));",
    "const j = pm.response.json();",
    "pm.test('success', () => pm.expect(j.success).to.eql(true));",
    "if (j.data?.school?.id) pm.collectionVariables.set('schoolId', String(j.data.school.id));",
  ],
};

function withTests(reqItem, scriptLines) {
  reqItem.event = [
    {
      listen: 'test',
      script: { type: 'text/javascript', exec: scriptLines },
    },
  ];
  return reqItem;
}

function buildE2EFolder() {
  return {
    name: 'E2E — Combined tuition (student code → pricing → balance)',
    description:
      '**Run steps 1 → 2 → 3 → 6 in order.** Set `studentLookupCode`. Step 1 sets `schoolCode` (directory code e.g. `003`) — use that in pricing query and pay bodies (not numeric `schoolId`).',
    event: [
      {
        listen: 'prerequest',
        script: {
          type: 'text/javascript',
          exec: [
            "['selectedFeeIdsJson','selectedReqIdsJson','selectedStudentsJson','selectedStudentSingleJson'].forEach((k) => {",
            "  if (!pm.collectionVariables.get(k)) {",
            "    pm.collectionVariables.set(k, k.includes('StudentSingle') ? 'null' : '[]');",
            "  }",
            "});",
          ],
        },
      },
    ],
    item: [
      withTests(
        makeRequest(
          '1 — POST student-catalog',
          'POST',
          '/api/public/public-pay/student-catalog',
          '{\n  "code": "{{studentLookupCode}}"\n}'
        ),
        e2eTestScripts.studentCatalog
      ),
      withTests(
        {
          name: '2 — GET babyeyi-pay pricing',
          request: {
            method: 'GET',
            header: [],
            url: '{{baseUrl}}/api/public/babyeyi-pay/pricing/{{babyeyiId}}?school_code={{schoolCode}}',
          },
        },
        e2eTestScripts.pricing
      ),
      withTests(
        makeRequest(
          '3 — POST quote-balance',
          'POST',
          '/api/public/babyeyi-pay/quote-balance',
          QUOTE_BALANCE_BODY
        ),
        e2eTestScripts.quoteBalance
      ),
      withTests(
        makeRequest(
          '6 — POST intent (checkout / MoMo)',
          'POST',
          '/api/public/babyeyi-pay/intent',
          INTENT_BODY_GUEST
        ),
        [
          "pm.test('HTTP 200 or 201', () => pm.expect(pm.response.code).to.be.oneOf([200, 201]));",
          "const j = pm.response.json();",
          "if (j.data?.id) pm.collectionVariables.set('paymentIntentId', String(j.data.id));",
        ]
      ),
      makeRequest(
        '4 — POST student-code-lookup (PublicPage search)',
        'POST',
        '/api/public/student-code-lookup',
        '{\n  "code": "{{studentLookupCode}}"\n}'
      ),
      withTests(
        makeRequest(
          '5 — POST school-catalog (PublicPage school fallback)',
          'POST',
          '/api/public/public-pay/school-catalog',
          '{\n  "school_code": "{{schoolCode}}"\n}'
        ),
        e2eTestScripts.schoolCatalog
      ),
    ],
  };
}

const PUSH_SUB_BODY = `{
  "subscription": {
    "endpoint": "https://fcm.googleapis.com/fcm/send/example-endpoint",
    "keys": { "p256dh": "BASE64_P256DH", "auth": "BASE64_AUTH" }
  }
}`;

function buildNotificationsFolder() {
  return {
    name: '20 - Notifications (Web Push, Email, In-App)',
    description:
      '**Web Push:** subscribe after login (parent / DEO / NESA / school staff). **Email:** accountant fee-reminder campaigns (session). **In-App:** bell feeds per portal. Auth via `01` or parent login unless noted.',
    item: [
      {
        name: 'Web Push',
        item: [
          {
            name: 'Parent portal',
            item: [
              makeRequest('GET /api/parent-portal/push/vapid-key', 'GET', '/api/parent-portal/push/vapid-key'),
              makeRequest('GET /api/parent-portal/push/status', 'GET', '/api/parent-portal/push/status'),
              makeRequest(
                'POST /api/parent-portal/push/subscribe',
                'POST',
                '/api/parent-portal/push/subscribe',
                `${PUSH_SUB_BODY.slice(0, -1)},\n  "preferences": { "notify_fee_reminders": true, "notify_discipline": true, "notify_school_activity": true }\n}`
              ),
              makeRequest('POST /api/parent-portal/push/unsubscribe', 'POST', '/api/parent-portal/push/unsubscribe', '{ "endpoint": "https://fcm.googleapis.com/fcm/send/example-endpoint" }'),
              makeRequest(
                'PATCH /api/parent-portal/push/preferences',
                'PATCH',
                '/api/parent-portal/push/preferences',
                '{ "notify_fee_reminders": true, "notify_discipline": true, "notify_school_activity": true }'
              ),
            ],
          },
          {
            name: 'District DEO',
            item: [
              makeRequest('GET /api/district/babyeyi/push/vapid-key', 'GET', '/api/district/babyeyi/push/vapid-key'),
              makeRequest('POST /api/district/babyeyi/push/subscribe', 'POST', '/api/district/babyeyi/push/subscribe', PUSH_SUB_BODY),
              makeRequest('POST /api/district/babyeyi/push/unsubscribe', 'POST', '/api/district/babyeyi/push/unsubscribe', '{ "endpoint": "https://fcm.googleapis.com/fcm/send/example-endpoint" }'),
            ],
          },
          {
            name: 'NESA',
            item: [
              makeRequest('GET /api/nesa/babyeyi/push/vapid-key', 'GET', '/api/nesa/babyeyi/push/vapid-key'),
              makeRequest('POST /api/nesa/babyeyi/push/subscribe', 'POST', '/api/nesa/babyeyi/push/subscribe', PUSH_SUB_BODY),
              makeRequest('POST /api/nesa/babyeyi/push/unsubscribe', 'POST', '/api/nesa/babyeyi/push/unsubscribe', '{ "endpoint": "https://fcm.googleapis.com/fcm/send/example-endpoint" }'),
            ],
          },
          {
            name: 'School staff portal',
            item: [
              makeRequest('GET /api/portal/push/vapid-key', 'GET', '/api/portal/push/vapid-key'),
              makeRequest('POST /api/portal/push/subscribe', 'POST', '/api/portal/push/subscribe', PUSH_SUB_BODY),
              makeRequest('POST /api/portal/push/unsubscribe', 'POST', '/api/portal/push/unsubscribe', '{ "endpoint": "https://fcm.googleapis.com/fcm/send/example-endpoint" }'),
            ],
          },
          {
            name: 'Shule Avance applicant',
            item: [
              makeRequest('GET /api/services/shule-avance/applicant/push/vapid-key', 'GET', '/api/services/shule-avance/applicant/push/vapid-key'),
              makeRequest('POST /api/services/shule-avance/applicant/push/subscribe', 'POST', '/api/services/shule-avance/applicant/push/subscribe', PUSH_SUB_BODY),
              makeRequest('POST /api/services/shule-avance/applicant/push/unsubscribe', 'POST', '/api/services/shule-avance/applicant/push/unsubscribe', '{ "endpoint": "https://fcm.googleapis.com/fcm/send/example-endpoint" }'),
            ],
          },
        ],
      },
      {
        name: 'Email',
        item: [
          makeRequest('GET /api/accountant/fee-reminders/options', 'GET', '/api/accountant/fee-reminders/options'),
          makeRequest('GET /api/accountant/fee-reminders/students', 'GET', '/api/accountant/fee-reminders/students?academic_year={{academicYear}}&term=1'),
          makeRequest(
            'POST /api/accountant/fee-reminders/campaigns',
            'POST',
            '/api/accountant/fee-reminders/campaigns',
            '{\n  "academic_year": "{{academicYear}}",\n  "term": "1",\n  "template_key": "gentle",\n  "subject": "School fees reminder",\n  "body": "Please pay outstanding fees.",\n  "channels": ["email", "push", "in_system"],\n  "schedule_mode": "now"\n}'
          ),
          makeRequest(
            'POST /api/public/babyeyi-pay/admin-invoices/reminders/run',
            'POST',
            '/api/public/babyeyi-pay/admin-invoices/reminders/run',
            '{ "school_code": "{{schoolCode}}" }'
          ),
        ],
      },
      {
        name: 'In-App',
        item: [
          makeRequest('GET /api/parent-portal/notifications', 'GET', '/api/parent-portal/notifications'),
          makeRequest('GET /api/district/babyeyi/notifications', 'GET', '/api/district/babyeyi/notifications'),
          makeRequest('PATCH /api/district/babyeyi/notifications/1/read', 'PATCH', '/api/district/babyeyi/notifications/1/read'),
          makeRequest('POST /api/district/babyeyi/notifications/read-all', 'POST', '/api/district/babyeyi/notifications/read-all', '{}'),
          makeRequest('GET /api/nesa/babyeyi/notifications', 'GET', '/api/nesa/babyeyi/notifications'),
          makeRequest('PATCH /api/nesa/babyeyi/notifications/1/read', 'PATCH', '/api/nesa/babyeyi/notifications/1/read'),
          makeRequest('POST /api/nesa/babyeyi/notifications/read-all', 'POST', '/api/nesa/babyeyi/notifications/read-all', '{}'),
          makeRequest('GET /api/babyeyi/notifications', 'GET', '/api/babyeyi/notifications'),
          makeRequest('PATCH /api/babyeyi/notifications/1/read', 'PATCH', '/api/babyeyi/notifications/1/read'),
          makeRequest('POST /api/babyeyi/notifications/read-all', 'POST', '/api/babyeyi/notifications/read-all', '{}'),
          makeRequest('GET /api/accountant/action-plans/notifications', 'GET', '/api/accountant/action-plans/notifications'),
          makeRequest('PATCH /api/accountant/action-plans/notifications/1/read', 'PATCH', '/api/accountant/action-plans/notifications/1/read'),
          makeRequest('PATCH /api/accountant/action-plans/notifications/read-all', 'PATCH', '/api/accountant/action-plans/notifications/read-all', '{}'),
          makeRequest('GET /api/library/notifications', 'GET', '/api/library/notifications'),
          makeRequest('GET /api/student-transfers/notifications/unread-count', 'GET', '/api/student-transfers/notifications/unread-count'),
          makeRequest('GET /api/teacher-portal/attendance-module/parent-notifications', 'GET', '/api/teacher-portal/attendance-module/parent-notifications'),
          makeRequest(
            'POST /api/teacher-portal/attendance-module/parent-notifications/enqueue',
            'POST',
            '/api/teacher-portal/attendance-module/parent-notifications/enqueue',
            '{\n  "class_name": "{{className}}",\n  "message": "Attendance notice"\n}'
          ),
        ],
      },
    ],
  };
}

function buildMissingFolder(missing, existingKeys) {
  const byFile = new Map();
  for (const r of missing) {
    const key = `${r.method} ${r.path.replace(/\/\d+(?=\/|$)/g, '/:id')}`;
    const postmanUrl = backendPathToPostmanUrl(r.path);
    const pk = postmanUrlToKey(r.method, postmanUrl);
    if (existingKeys.has(pk)) continue;
    const file = r.file || 'unknown';
    if (!byFile.has(file)) byFile.set(file, []);
    byFile.get(file).push(r);
    existingKeys.add(pk);
  }

  const item = [];
  const sortedFiles = [...byFile.keys()].sort();
  for (const file of sortedFiles) {
    const routes = byFile.get(file).sort((a, b) => a.path.localeCompare(b.path));
    item.push({
      name: file,
      description: `Auto-synced from backend (${routes.length} requests). Session may be required.`,
      item: routes.map((r) => {
        const postmanPath = backendPathToPostmanUrl(r.path);
        const needsBody = ['POST', 'PUT', 'PATCH'].includes(r.method);
        const body = needsBody ? '{\n  \n}' : null;
        return makeRequest(`${r.method} ${r.path}`, r.method, postmanPath, body);
      }),
    });
  }

  const total = item.reduce((n, g) => n + (g.item?.length || 0), 0);
  return {
    name: '19 - Backend sync (missing routes)',
    description: `Auto-generated ${new Date().toISOString().slice(0, 10)} from \`sync-postman.mjs\`. **${total}** endpoints not found in folders 00–18. Set auth via \`01 - Auth & Session\` first for protected routes. Re-run \`node extract-routes.mjs\` + \`node sync-postman.mjs\` after backend changes.`,
    item,
  };
}

// --- main ---
const col = JSON.parse(fs.readFileSync(collectionPath, 'utf8'));
const missing = JSON.parse(fs.readFileSync(missingPath, 'utf8'));
const existingKeys = collectExistingKeys(col);

// Update collection info
col.info.description =
  (col.info.description || '') +
  '\n\n**10c E2E:** Run `E2E — Combined tuition` in order. **19 - Backend sync:** auto-added missing routes from backend scan.';

// Ensure collection variables
const varKeys = new Set((col.variable || []).map((v) => v.key));
for (const [key, value] of [
  ['studentLookupCode', 'STUDENT_UID_OR_CODE'],
  ['remainingRwf', '0'],
  ['serviceId', '1'],
  ['selectedFeeIdsJson', '[]'],
  ['selectedReqIdsJson', '[]'],
  ['selectedStudentsJson', '[]'],
  ['selectedStudentSingleJson', 'null'],
]) {
  if (!varKeys.has(key)) {
    col.variable.push({ key, value, type: 'string' });
  }
}

// Patch folder 10c
const folder10c = findFolder(col.item, '10c - Public pay by school code (no auth)');
if (folder10c) {
  folder10c.description =
    'No login. **Student-code flow (Pay Fees / PublicPage):** use **E2E** subfolder or `POST student-catalog` → `GET babyeyi-pay/pricing` → `POST quote-balance` → `POST intent` (folder 10b/12). **School-code flow:** `school-catalog` or `class-pricing` + `search-student`.';

  const names = new Set((folder10c.item || []).map((i) => i.name));
  const toAdd = [];

  if (!names.has('POST /api/public/public-pay/school-catalog')) {
    toAdd.push(
      makeRequest(
        'POST /api/public/public-pay/school-catalog',
        'POST',
        '/api/public/public-pay/school-catalog',
        '{\n  "school_code": "{{schoolCode}}"\n}'
      )
    );
  }
  if (!names.has('POST /api/public/public-pay/student-catalog')) {
    toAdd.push(
      makeRequest(
        'POST /api/public/public-pay/student-catalog',
        'POST',
        '/api/public/public-pay/student-catalog',
        '{\n  "code": "{{studentLookupCode}}"\n}'
      )
    );
  }
  const pricingReq = folder10c.item?.find((i) => i.name?.includes('pricing') && i.name?.includes('babyeyi'));
  if (pricingReq?.request) {
    pricingReq.name = 'GET /api/public/babyeyi-pay/pricing/:babyeyiId (school_code)';
    pricingReq.request.url = '{{baseUrl}}/api/public/babyeyi-pay/pricing/{{babyeyiId}}?school_code={{schoolCode}}';
  }
  if (!names.has('GET /api/public/babyeyi-pay/pricing/:babyeyiId (school_code)')) {
    toAdd.push({
      name: 'GET /api/public/babyeyi-pay/pricing/:babyeyiId (school_code)',
      request: {
        method: 'GET',
        header: [],
        url: '{{baseUrl}}/api/public/babyeyi-pay/pricing/{{babyeyiId}}?school_code={{schoolCode}}',
      },
    });
  }
  const quoteBal = folder10c.item?.find((i) => i.name?.includes('quote-balance'));
  if (quoteBal?.request?.body) quoteBal.request.body.raw = QUOTE_BALANCE_BODY;
  if (!names.has('POST /api/public/babyeyi-pay/quote-balance')) {
    toAdd.push(
      makeRequest(
        'POST /api/public/babyeyi-pay/quote-balance',
        'POST',
        '/api/public/babyeyi-pay/quote-balance',
        QUOTE_BALANCE_BODY
      )
    );
  }

  // Remove old E2E if re-running
  folder10c.item = (folder10c.item || []).filter(
    (i) => !i.name?.startsWith('E2E — Combined tuition')
  );
  folder10c.item.push(...toAdd, buildE2EFolder());
}

// Remove existing folder 19/20 if present, rebuild
col.item = col.item.filter(
  (i) => i.name !== '19 - Backend sync (missing routes)' && i.name !== '20 - Notifications (Web Push, Email, In-App)'
);
const existingAfter10c = collectExistingKeys(col);
const folder19 = buildMissingFolder(missing, existingAfter10c);
col.item.push(folder19);
col.item.push(buildNotificationsFolder());

/** Fix invalid JSON: unquoted {{schoolId}} becomes `001` which JSON.parse rejects. */
function fixJsonBodiesInCollection(items) {
  const fixes = [
    [/"school_id":\s*\{\{schoolId\}\}/g, '"school_code": "{{schoolCode}}"'],
    [/"school_id":\s*"\{\{schoolId\}\}"/g, '"school_code": "{{schoolCode}}"'],
    [/"babyeyi_id":\s*\{\{babyeyiId\}\}/g, '"babyeyi_id": "{{babyeyiId}}"'],
    [/"student_id":\s*\{\{studentId\}\}/g, '"student_id": "{{studentId}}"'],
    [/"school_id":\s*\{\{schoolId\}\},/g, '"school_id": "{{schoolId}}",'],
  ];
  walkItems(items, (it) => {
    const raw = it.request?.body?.raw;
    if (typeof raw !== 'string') return;
    let next = raw;
    for (const [re, rep] of fixes) next = next.replace(re, rep);
    if (next !== raw) it.request.body.raw = next;
  });
}

fixJsonBodiesInCollection(col.item);

fs.writeFileSync(collectionPath, JSON.stringify(col, null, 2));
const added = folder19.item.reduce((n, g) => n + (g.item?.length || 0), 0);
console.log('Updated', collectionPath);
console.log('10c enhanced; folder 19 added with', added, 'requests');
