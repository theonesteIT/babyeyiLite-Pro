// ================================================================
// BACKEND FIX: generateDocuments — unsupported number: auto
// ================================================================
// Root cause: jsPDF does NOT accept 'auto' as a page format/height.
// The fix: always calculate pixel->mm conversion manually and use
// a fixed A4 width (210mm). For height, derive from canvas ratio
// rather than passing 'auto'.
//
// Drop this function into routes/BabyeyiRoutes/babyeyi.js
// replacing the existing generateDocuments function.
// ================================================================

const puppeteer  = require('puppeteer');
const QRCode     = require('qrcode');
const path       = require('path');
const fs         = require('fs');
const { createHmac } = require('crypto');

// ── helper: resolve upload dirs ────────────────────────────────
function uploadsDir(...parts) {
  return path.join(__dirname, '..', '..', 'uploads', ...parts);
}
function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// ── HMAC helpers ───────────────────────────────────────────────
const HASH_SECRET = process.env.BABYEYI_HASH_SECRET || 'babyeyi_secret_2025';

function buildCanonicalString(rec) {
  const payments = Array.isArray(rec.payments) ? rec.payments : [];
  const total    = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
  return [
    rec.doc_id || '',
    rec.school_name || '',
    rec.class_name  || '',
    rec.term        || '',
    rec.academic_year || '',
    total,
    rec.status || '',
  ].join('|');
}

function generateHmacHash(rec) {
  const canonical = buildCanonicalString(rec);
  return createHmac('sha256', HASH_SECRET)
    .update(canonical)
    .digest('hex')
    .slice(0, 16); // 64-bit truncated hex
}

// ── QR payload format: BY-2025-00001|8d91f7c3a91e4f2b ──────────
function buildQRPayload(docId, hash) {
  return `${docId}|${hash}`;
}

// ── Generate QR PNG to disk ─────────────────────────────────────
async function generateQRImage(payload, outPath) {
  await QRCode.toFile(outPath, payload, {
    errorCorrectionLevel: 'M',
    type: 'png',
    width: 300,
    margin: 2,
  });
}

// ================================================================
// MAIN FUNCTION — replaces the broken generateDocuments
// ================================================================
async function generateDocuments(babyeyiId, db) {
  // 1. Fetch record
  const [rows] = await db.query(
    `SELECT b.*,
            s.name      AS school_name,
            s.logo_url  AS school_logo_url,
            s.district  AS school_district,
            s.sector    AS school_sector,
            sig.director_sig_path,
            sig.stamp_path,
            sig.school_logo_path
     FROM   school_babyeyi b
     JOIN   schools s   ON b.school_id = s.id
     LEFT JOIN babyeyi_signatures sig ON sig.school_id = b.school_id
     WHERE  b.id = ?`,
    [babyeyiId]
  );
  if (!rows.length) throw new Error(`Babyeyi #${babyeyiId} not found`);
  const rec = rows[0];

  // 2. Fetch related rows
  const [[paymentsRows], [reqsRows], [classReqRows]] = await Promise.all([
    db.query('SELECT * FROM babyeyi_payments WHERE babyeyi_id = ?', [babyeyiId]),
    db.query('SELECT * FROM babyeyi_student_requirements WHERE babyeyi_id = ?', [babyeyiId]),
    db.query('SELECT * FROM babyeyi_class_requirements WHERE babyeyi_id = ?', [babyeyiId]),
  ]);

  const payments = paymentsRows.map(p => ({ name: p.name, amount: Number(p.amount || 0) }));
  const totalFee = payments.reduce((s, p) => s + p.amount, 0);
  rec.payments   = payments;

  // 3. Ensure doc_id
  if (!rec.doc_id) {
    const year = new Date().getFullYear();
    const [[cntRow]] = await db.query(
      'SELECT COUNT(*) AS cnt FROM school_babyeyi WHERE YEAR(created_at) = ?', [year]
    );
    const seq   = String(cntRow.cnt + 1).padStart(5, '0');
    rec.doc_id  = `BY-${year}-${seq}`;
    await db.query('UPDATE school_babyeyi SET doc_id = ? WHERE id = ?', [rec.doc_id, babyeyiId]);
  }

  // 4. Generate HMAC hash & update DB
  const integrityHash = generateHmacHash(rec);
  await db.query(
    'UPDATE school_babyei SET integrity_hash = ? WHERE id = ?',
    [integrityHash, babyeyiId]
  );

  // 5. QR payload = docId|hash
  const qrPayload = buildQRPayload(rec.doc_id, integrityHash);

  // 6. Write QR image
  const qrDir  = uploadsDir('babyeyi', 'qr');
  ensureDir(qrDir);
  const qrFile = path.join(qrDir, `qr-${babyeyiId}.png`);
  await generateQRImage(qrPayload, qrFile);

  const qrDbPath = `/uploads/babyeyi/qr/qr-${babyeyiId}.png`;
  await db.query(
    'UPDATE school_babyeyi SET qr_code_url = ?, qr_view_url = ? WHERE id = ?',
    [qrDbPath, `/babyeyi/verify/${rec.doc_id}`, babyeyiId]
  );

  // 7. Build HTML for PDF (inline base64 images)
  const toBase64File = (filePath) => {
    if (!filePath) return null;
    const abs = filePath.startsWith('/') ? path.join(__dirname, '..', '..', filePath) : filePath;
    if (!fs.existsSync(abs)) return null;
    const ext  = path.extname(abs).slice(1).toLowerCase();
    const mime = ext === 'jpg' ? 'jpeg' : ext;
    return `data:image/${mime};base64,${fs.readFileSync(abs).toString('base64')}`;
  };

  const logoB64  = toBase64File(rec.school_logo_path || rec.school_logo_url);
  const sigB64   = toBase64File(rec.director_sig_path);
  const stampB64 = toBase64File(rec.stamp_path);
  const qrB64    = `data:image/png;base64,${fs.readFileSync(qrFile).toString('base64')}`;

  const today = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

  // Parse banks
  let banks = [];
  if (rec.banks_json) {
    try { banks = JSON.parse(rec.banks_json); } catch {}
  }
  if (!banks.length && rec.bank_name) {
    banks = [{ bankName: rec.bank_name, accountNumber: rec.bank_account_no || '', accountName: rec.bank_account_name || '' }];
  }

  const banksHtml = banks.length
    ? banks.map((bk, i) => `
      <div class="bank-card">
        ${banks.length > 1 ? `<p class="bank-label">Banque ${i + 1}${bk.isPrimary ? ' (Principale)' : ''}</p>` : ''}
        <div class="bank-grid">
          <div><p class="field-label">Banque</p><p class="field-val">${bk.bankName || bk.bank_name || '—'}</p></div>
          <div><p class="field-label">N° Compte</p><p class="field-val">${bk.accountNumber || bk.bank_account_no || '—'}</p></div>
          <div><p class="field-label">Nom Compte</p><p class="field-val">${bk.accountName || bk.bank_account_name || '—'}</p></div>
        </div>
      </div>`).join('')
    : '';

  const paymentRows = payments.map((p, i) => `
    <tr class="${i % 2 === 0 ? 'even' : 'odd'}">
      <td class="center">${i + 1}</td>
      <td>${p.name}</td>
      <td class="right mono">${p.amount.toLocaleString()} RWF</td>
    </tr>`).join('');

  const reqsHtml = reqsRows.length
    ? reqsRows.map((r, i) => `
      <div class="req-item">
        <span class="req-num">${i + 1}</span>
        <span>${r.item || r.information || ''}</span>
      </div>`).join('')
    : '';

  const classReqHtml = classReqRows.length
    ? `<table class="data-table"><thead><tr class="thead-blue">
        <th class="w30 center">#</th><th>Item</th><th>Détails</th>
       </tr></thead><tbody>
       ${classReqRows.map((r, i) => `
         <tr class="${i % 2 === 0 ? 'even' : 'odd'}">
           <td class="center">${i + 1}</td>
           <td class="bold">${r.item || r.information || ''}</td>
           <td>${r.details || '—'}</td>
         </tr>`).join('')}
       </tbody></table>`
    : '';

  const frontendOrigin = process.env.FRONTEND_URL || 'http://localhost:5174';
  const verifyUrl = `${frontendOrigin}/babyeyi/verify/${rec.doc_id}`;

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: Georgia, 'Times New Roman', serif; }
  body { width: 794px; background: #fff; color: #000; }
  .top-bar { height: 5px; background: linear-gradient(90deg,#1e3a5f,#2563eb,#1e3a5f); }
  .header  { padding: 12px 28px 9px; border-bottom: 2px double #1e3a5f; }
  .header-row { display: flex; align-items: flex-start; gap: 10px; }
  .logo-box { width:66px;height:66px;border:1.5px solid #e2e8f0;border-radius:4px;display:flex;align-items:center;justify-content:center;overflow:hidden;background:#f8fafc;flex-shrink:0; }
  .logo-box img { width:62px;height:62px;object-fit:contain; }
  .header-info { flex:1; }
  .gov-line  { font-size:9.5px;font-weight:700;color:#0f172a; }
  .school-name { font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:.03em;color:#0f172a;margin:1px 0; }
  .location  { font-size:9.5px;color:#475569;margin-bottom:3px; }
  .meta-row  { display:flex;gap:14px;align-items:center;flex-wrap:wrap; }
  .meta-item { display:flex;gap:5px;align-items:center; }
  .meta-label{ color:#94a3b8;font-size:8px;font-weight:700;text-transform:uppercase; }
  .meta-val  { color:#000;font-size:9.5px;font-weight:900; }
  .doc-id    { background:#e0e7ff;border-radius:4px;padding:1px 7px;font-size:8px;font-weight:900;color:#3730a3;font-family:monospace; }
  .date      { color:#94a3b8;font-size:8px;flex-shrink:0; }
  .body      { padding: 11px 28px; }
  .section   { margin-bottom: 11px; }
  .section-hr{ display:flex;align-items:center;gap:8px;margin-bottom:6px; }
  .hr-line   { flex:1;height:1px;background:#e2e8f0; }
  .hr-label  { font-size:7.5px;font-weight:900;text-transform:uppercase;letter-spacing:.18em;color:#64748b;white-space:nowrap; }
  .parent-msg{ border-left:3px solid #2563eb;background:#eff6ff;padding:9px 11px 9px 14px;border-radius:0 7px 7px 0; }
  .parent-msg p { font-size:10px;line-height:1.75;color:#374151;white-space:pre-line; }
  .data-table { width:100%;border-collapse:collapse;font-size:9.5px; }
  .data-table th { padding:5px 9px;color:white;font-size:9px;text-transform:uppercase;font-weight:900; }
  .data-table td { padding:4px 9px;border-bottom:1px solid #e2e8f0; }
  .thead-navy { background:#1e3a5f; }
  .thead-blue { background:#0284c7; }
  .even { background:#fff; }
  .odd  { background:#f8fafc; }
  .center { text-align:center; }
  .right  { text-align:right; }
  .mono   { font-family:monospace; }
  .bold   { font-weight:700; }
  .w30    { width:30px; }
  .tfoot-navy td { background:#1e3a5f;padding:6px 9px;font-weight:900;color:#fbbf24;font-family:monospace;font-size:11px; }
  .tfoot-label   { text-transform:uppercase; }
  .banks-grid { display:grid;gap:7px; }
  .bank-card  { border:1px solid #bfdbfe;border-radius:6px;padding:8px 10px;background:#eff6ff; }
  .bank-label { font-size:7px;font-weight:900;color:#1e40af;text-transform:uppercase;margin-bottom:4px; }
  .bank-grid  { display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px; }
  .field-label{ font-size:6.5px;color:#64748b;font-weight:700;text-transform:uppercase;margin-bottom:1px; }
  .field-val  { font-size:8.5px;font-weight:700;color:#0f172a; }
  .reqs-grid  { display:grid;grid-template-columns:1fr 1fr;gap:4px 12px; }
  .req-item   { display:flex;align-items:flex-start;gap:5px; }
  .req-num    { width:13px;height:13px;background:#1e3a5f;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:7px;font-weight:900;color:white;flex-shrink:0;margin-top:1px; }
  .req-item span:last-child { font-size:9px;color:#374151;line-height:1.4; }
  .auth-row   { display:flex;align-items:flex-end;justify-content:space-between;min-height:110px;margin-top:9px; }
  .sig-block  { display:flex;flex-direction:column;align-items:flex-start; }
  .sig-title  { font-size:9.5px;font-weight:900;color:#1e3a5f;text-transform:uppercase;margin-bottom:3px; }
  .sig-img    { height:55px;display:flex;align-items:flex-end;padding-bottom:3px; }
  .sig-img img{ max-height:51px;max-width:160px;object-fit:contain; }
  .sig-line   { width:190px;border-top:1.5px solid #334155;padding-top:2px; }
  .sig-line p { font-size:8.5px;color:#475569;text-align:center; }
  .qr-block   { display:flex;flex-direction:column;align-items:center;gap:3px; }
  .qr-frame   { background:white;border-radius:9px;padding:4px;border:2px solid #e0e7ff;box-shadow:0 2px 10px rgba(30,58,95,.12); }
  .qr-frame img { width:88px;height:88px;display:block; }
  .qr-label   { font-size:6.5px;color:#1e3a5f;font-weight:900;text-transform:uppercase;letter-spacing:.08em;text-align:center; }
  .qr-docid   { font-size:6.5px;color:#64748b;font-family:monospace; }
  .qr-url     { font-size:5.5px;color:#4f46e5;text-align:center;max-width:120px;word-break:break-all; }
  .stamp-block{ display:flex;flex-direction:column;align-items:center; }
  .stamp-circle{ width:95px;height:95px;border-radius:50%;border:2px dashed #e2e8f0;display:flex;align-items:center;justify-content:center;overflow:hidden;background:#f8fafc;margin-bottom:4px; }
  .stamp-circle img { width:91px;height:91px;object-fit:contain;border-radius:50%; }
  .stamp-label { font-size:8.5px;color:#475569;font-weight:700;text-align:center; }
  .footer     { border-top:2px solid #1e3a5f;background:#f8fafc;padding:5px 28px;display:flex;justify-content:space-between;align-items:center; }
  .footer span{ font-size:7.5px;color:#64748b; }
  .footer .center-text { color:#1e3a5f;font-weight:900;text-transform:uppercase; }
</style>
</head>
<body>
<div class="top-bar"></div>

<div class="header">
  <div class="header-row">
    <div class="logo-box">
      ${logoB64 ? `<img src="${logoB64}"/>` : '<span style="font-size:7px;color:#64748b;font-weight:700;text-align:center">LOGO</span>'}
    </div>
    <div class="header-info">
      <p class="gov-line">Republic of Rwanda · Ministry of Education</p>
      <p class="school-name">${rec.school_name}</p>
      <p class="location">District: ${rec.school_district || '—'} · Sector: ${rec.school_sector || '—'}</p>
      <div class="meta-row">
        <div class="meta-item"><span class="meta-label">Academic Year:</span><span class="meta-val">${rec.academic_year}</span></div>
        <div class="meta-item"><span class="meta-label">Term:</span><span class="meta-val">${rec.term}</span></div>
        <div class="meta-item"><span class="meta-label">Class:</span><span class="meta-val">${rec.class_name}</span></div>
        <span class="doc-id">${rec.doc_id}</span>
      </div>
    </div>
    <span class="date">Kigali, le ${today}</span>
  </div>
</div>

<div class="body">
  ${rec.parent_message ? `
  <div class="section">
    <div class="section-hr"><div class="hr-line"></div><span class="hr-label">Message aux Parents</span><div class="hr-line"></div></div>
    <div class="parent-msg"><p>${rec.parent_message}</p></div>
  </div>` : ''}

  <div class="section">
    <div class="section-hr"><div class="hr-line"></div><span class="hr-label">School Fees</span><div class="hr-line"></div></div>
    <table class="data-table">
      <thead><tr class="thead-navy">
        <th class="w30 center">N°</th><th style="text-align:left">Désignation</th><th style="text-align:right">Montant (RWF)</th>
      </tr></thead>
      <tbody>${paymentRows}</tbody>
      <tfoot><tr>
        <td colspan="2" class="tfoot-navy tfoot-label">TOTAL</td>
        <td class="tfoot-navy right">${totalFee.toLocaleString()} RWF</td>
      </tr></tfoot>
    </table>
  </div>

  ${banksHtml ? `
  <div class="section">
    <div class="section-hr"><div class="hr-line"></div><span class="hr-label">Compte(s) Bancaire(s)</span><div class="hr-line"></div></div>
    <div class="banks-grid" style="grid-template-columns:${banks.length > 1 ? '1fr 1fr' : '1fr'}">${banksHtml}</div>
  </div>` : ''}

  ${reqsHtml ? `
  <div class="section">
    <div class="section-hr"><div class="hr-line"></div><span class="hr-label">Matériels Requis</span><div class="hr-line"></div></div>
    <div class="reqs-grid">${reqsHtml}</div>
  </div>` : ''}

  ${classReqHtml ? `
  <div class="section">
    <div class="section-hr"><div class="hr-line"></div><span class="hr-label">Notes de Classe</span><div class="hr-line"></div></div>
    ${classReqHtml}
  </div>` : ''}

  <div class="section">
    <div class="section-hr"><div class="hr-line"></div><span class="hr-label">Autorisation Officielle</span><div class="hr-line"></div></div>
    <div class="auth-row">
      <div class="sig-block">
        <p class="sig-title">Directeur / Head Teacher</p>
        <div class="sig-img">${sigB64 ? `<img src="${sigB64}"/>` : '<span style="font-size:28px;opacity:.08">✍️</span>'}</div>
        <div class="sig-line"><p>Directeur / Head Teacher</p></div>
      </div>

      <div class="qr-block">
        <div class="qr-frame"><img src="${qrB64}"/></div>
        <p class="qr-label">Scan to Verify</p>
        <p class="qr-docid">ID: ${rec.doc_id}</p>
        <p class="qr-url">${verifyUrl}</p>
      </div>

      <div class="stamp-block">
        <div class="stamp-circle">${stampB64 ? `<img src="${stampB64}"/>` : '<span style="font-size:27px;opacity:.08">🔏</span>'}</div>
        <p class="stamp-label">Cachet Officiel</p>
      </div>
    </div>
  </div>
</div>

<div class="footer">
  <span>${rec.school_name} · ${rec.academic_year} · ${rec.term}</span>
  <span class="center-text">Document Officiel — NE PAS FALSIFIER</span>
  <span>Page 1/1</span>
</div>
<div class="top-bar"></div>
</body>
</html>`;

  // 8. Generate PDF with Puppeteer (NO jsPDF — eliminates "unsupported number: auto")
  const pdfDir  = uploadsDir('babyeyi', 'pdf');
  ensureDir(pdfDir);
  const pdfFile = path.join(pdfDir, `babyeyi-${babyeyiId}.pdf`);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.emulateMediaType('screen');

    // ── FIX: use A4 format string — NEVER 'auto' ──────────────────
    // Puppeteer accepts 'A4' natively; height is auto-calculated by content.
    // If content is short, we get 1 page. If tall, it paginates correctly.
    await page.pdf({
      path: pdfFile,
      format: 'A4',          // ← 'A4', never 'auto'
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    });
  } finally {
    await browser.close();
  }

  const pdfDbPath = `/uploads/babyeyi/pdf/babyeyi-${babyeyiId}.pdf`;
  await db.query(
    'UPDATE school_babyeyi SET pdf_url = ? WHERE id = ?',
    [pdfDbPath, babyeyiId]
  );

  return {
    docId:      rec.doc_id,
    qrCodeUrl:  qrDbPath,
    qrViewUrl:  `/babyeyi/verify/${rec.doc_id}`,
    pdfUrl:     pdfDbPath,
    integrityHash,
  };
}

module.exports = { generateDocuments };

// ================================================================
// USAGE IN babyeyi.js router:
//
// const { generateDocuments } = require('./babyeyi-generate-docs-fix');
//
// router.post('/:id/regenerate-docs', authenticate, async (req, res) => {
//   try {
//     const data = await generateDocuments(req.params.id, db);
//     res.json({ success: true, data });
//   } catch (err) {
//     console.error('[generateDocuments] Error:', err.message);
//     res.status(500).json({ success: false, message: 'Document generation failed' });
//   }
// });
// ================================================================