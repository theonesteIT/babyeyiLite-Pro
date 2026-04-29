// ================================================================
// BabyeyiVerify.jsx — v8
//
// PDF download now delegates 100% to the BabyeyiPdf pipeline:
//   1. Resolve the numeric record id (from verify response or
//      via doc_id/docId query fallback — same as v7 enrichment)
//   2. Call downloadPdfById(id) — identical fetch + build + render
//      logic as BabyeyiPdf.jsx handleDownloadPDF
//   3. No more inline generatePDF / buildWordDocHTML in this file
// ================================================================

import { useState, useEffect, useRef } from "react";
import { API_BASE, SERVER_BASE as ASSET_BASE, FRONTEND_ORIGIN } from '../../lib/schoolLiteApi';
const makeVerifyUrl   = (docId) => docId ? `${FRONTEND_ORIGIN}/babyeyi/verify/${docId}` : "";

// ── URL helpers ───────────────────────────────────────────────
function getDocIdFromUrl() {
  const parts = window.location.pathname.split("/").filter(Boolean);
  const last  = (parts[parts.length - 1] || "").toUpperCase();
  return /^BY-\d{4}-\d{5}$/.test(last) ? last : null;
}
function getQrHashFromUrl() {
  const h = new URLSearchParams(window.location.search).get("h") || "";
  return /^[0-9a-f]{16}$/i.test(h) ? h.toLowerCase() : null;
}
function normaliseDocId(v) {
  const s = v.trim().toUpperCase().replace(/\s+/g, "");
  if (/^BY-\d{4}-\d{5}$/.test(s)) return s;
  const m = s.match(/^BY[-]?(\d{4})[-]?(\d{5})$/);
  if (m) return `BY-${m[1]}-${m[2]}`;
  return s;
}

const pick = (...args) => { for (const v of args) if (v) return v; return null; };
const normPath = (p) => p ? p.replace(/\\/g, "/") : null;

function parseClasses(raw) {
  try {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.filter(Boolean);
    if (typeof raw === "string" && raw.trim().startsWith("[")) {
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr.filter(Boolean) : [];
    }
  } catch {}
  return [];
}

function getClassLabel(d) {
  const classes = parseClasses(d?.classes_json || d?.classesJson || d?.classes);
  const primary = pick(d?.class_name, d?.className, d?.class, classes[0], "");
  const list = (classes.length ? classes : [primary]).filter(Boolean);
  return list.join(", ");
}

// ── Asset helpers ─────────────────────────────────────────────
function toAssetUrl(path) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${ASSET_BASE}${normPath(path).replace(/^\/?/, "/")}`;
}

async function toBase64(url) {
  if (!url) return null;
  try {
    const abs = url.startsWith("http")
      ? url
      : `${ASSET_BASE}${url.startsWith("/") ? "" : "/"}${url}`;
    const res = await fetch(abs, { credentials: "include" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise(r => {
      const fr = new FileReader();
      fr.onloadend = () => r(fr.result);
      fr.readAsDataURL(blob);
    });
  } catch { return null; }
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement("script");
    s.src = src; s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });
}

function parseBanks(rec) {
  for (const key of ["banksJson", "banks_json"]) {
    if (rec[key]) {
      try {
        const raw = typeof rec[key] === "string" ? JSON.parse(rec[key]) : rec[key];
        if (Array.isArray(raw) && raw.length > 0) return raw;
      } catch {}
    }
  }
  if (Array.isArray(rec.banks) && rec.banks.length > 0) return rec.banks;
  if (rec.bankName || rec.bank_name) {
    return [{
      bankName:      rec.bankName       || rec.bank_name        || "",
      accountNumber: rec.bankAccountNo  || rec.bank_account_no  || "",
      accountName:   rec.bankAccountName|| rec.bank_account_name|| "",
      isPrimary:     true,
    }];
  }
  return [];
}

// ════════════════════════════════════════════════════════════
// resolveNumericId
// Given the raw verify API response, resolve the numeric DB id
// needed by GET /api/babyeyi/:id (the BabyeyiPdf endpoint).
//
// Strategy A — id is directly in the verify response
// Strategy B — fetch /api/babyeyi?doc_id=BY-… and read id from row
// Strategy C — fetch /api/babyeyi?docId=BY-… (camelCase fallback)
// ════════════════════════════════════════════════════════════
async function resolveNumericId(data) {
  // Strategy A: id already in verify response
  const direct = pick(
    data.id, data.record_id, data.recordId,
    data.babyeyi_id, data.babyeyiId, data.fee_document_id,
  );
  if (direct) {
    console.log("[Verify] resolveNumericId → Strategy A:", direct);
    return direct;
  }

  const docId = data.docId || data.doc_id;
  if (!docId) return null;

  // Strategy B: doc_id query param
  try {
    console.log("[Verify] resolveNumericId → Strategy B: ?doc_id=" + docId);
    const res  = await fetch(`${API_BASE}/babyeyi?doc_id=${docId}&limit=1`, { credentials: "include" });
    const json = await res.json();
    const row  = json.data?.[0] || (json.success && !Array.isArray(json.data) ? json.data : null);
    const id   = pick(row?.id, row?.record_id, row?.recordId, row?.babyeyi_id);
    if (id) { console.log("[Verify] Strategy B found id:", id); return id; }
  } catch {}

  // Strategy C: docId query param (camelCase)
  try {
    console.log("[Verify] resolveNumericId → Strategy C: ?docId=" + docId);
    const res  = await fetch(`${API_BASE}/babyeyi?docId=${docId}&limit=1`, { credentials: "include" });
    const json = await res.json();
    const row  = json.data?.[0] || (json.success && !Array.isArray(json.data) ? json.data : null);
    const id   = pick(row?.id, row?.record_id, row?.recordId, row?.babyeyi_id);
    if (id) { console.log("[Verify] Strategy C found id:", id); return id; }
  } catch {}

  console.warn("[Verify] resolveNumericId — all strategies failed");
  return null;
}

// ════════════════════════════════════════════════════════════
// buildWordDocHTML — copied verbatim from BabyeyiPdf.jsx
// ════════════════════════════════════════════════════════════
function buildWordDocHTML({ rec, totalFee, today, schoolLogoB64, otherLogoB64, sigB64, stampB64, qrB64, vUrl }) {
  const payments   = Array.isArray(rec.payments)     ? rec.payments     : [];
  const classNotes = Array.isArray(rec.classNotes)   ? rec.classNotes   : [];
  const reqs       = Array.isArray(rec.requirements) ? rec.requirements : [];
  const otherInfos = Array.isArray(rec.otherInfos)   ? rec.otherInfos   : [];
  const leaders    = Array.isArray(rec.leaders)      ? rec.leaders      : [];
  const banks      = parseBanks(rec);

  const tbl = `width:100%;border-collapse:collapse;margin-top:8px`;
  const th  = `padding:8px 12px;font-size:12px;font-weight:700;color:#1e3a5f;border-bottom:2px solid #1e3a5f;text-align:left;background:transparent`;
  const td  = `padding:7px 12px;font-size:12px;color:#1e293b;border-bottom:1px solid #e2e8f0;background:transparent`;
  const hd  = `font-size:14px;font-weight:700;color:#1e3a5f;text-transform:uppercase;letter-spacing:0.05em`;
  const rule = (t) => `<div style="border-bottom:1.5px solid #1e3a5f;padding-bottom:5px;margin-bottom:12px;margin-top:20px"><span style="${hd}">${t}</span></div>`;

  const parentSection = rec.parentMessage ? `
    <div style="margin-bottom:22px">
      ${rule("")}
      <div style="padding-left:16px;margin-top:4px">
        <p style="font-size:12px;color:#1e293b;line-height:1.7;white-space:pre-line;margin:0">${rec.parentMessage}</p>
      </div>
    </div>` : "";

  const payRows = payments.map((p,i) => `
    <tr>
      <td style="${td};text-align:center;color:#64748b;width:42px">${i+1}</td>
      <td style="${td}">${p.name||""}</td>
      <td style="${td};text-align:right;font-family:monospace;font-weight:600">${Number(p.amount||0).toLocaleString()}</td>
    </tr>`).join("");

  const paySection = payments.length > 0 ? `
    <div style="margin-bottom:22px">
      ${rule("Fee Payment Breakdown")}
      <table style="${tbl}">
        <thead><tr>
          <th style="${th};width:42px;text-align:center">N°</th>
          <th style="${th}">Payment Item</th>
          <th style="${th};text-align:right">Amount (RWF)</th>
        </tr></thead>
        <tbody>${payRows}</tbody>
        <tfoot><tr>
          <td colspan="2" style="padding:9px 12px;font-size:14px;font-weight:700;color:#1e3a5f;border-top:2px solid #1e3a5f">TOTAL</td>
          <td style="padding:9px 12px;font-size:14px;font-weight:700;color:#1e3a5f;border-top:2px solid #1e3a5f;text-align:right;font-family:monospace">RWF ${totalFee.toLocaleString()}</td>
        </tr></tfoot>
      </table>
    </div>` : "";

  const bankRows = banks.map((bk,i) => `
    <tr>
      <td style="${td};text-align:center;color:#64748b;width:40px">${i+1}</td>
      <td style="${td};font-weight:600">${bk.bankName||bk.bank_name||"—"}</td>
      <td style="${td};font-family:monospace">${bk.accountNumber||bk.bank_account_no||"—"}</td>
      <td style="${td}">${bk.accountName||bk.bank_account_name||"—"}</td>
      <td style="${td};text-align:center;color:#059669;font-weight:700">${bk.isPrimary||i===0?"✓":""}</td>
    </tr>`).join("");

  const banksSection = banks.length > 0 ? `
    <div style="margin-bottom:22px">
      ${rule("Banking Information")}
      <table style="${tbl}">
        <thead><tr>
          <th style="${th};width:40px;text-align:center">#</th>
          <th style="${th}">Bank Name</th>
          <th style="${th}">Account Number</th>
          <th style="${th}">Account Name</th>
          <th style="${th};text-align:center;width:70px">Primary</th>
        </tr></thead>
        <tbody>${bankRows}</tbody>
      </table>
    </div>` : "";

  const reqRows = reqs.map((r,i) => `
    <tr>
      <td style="${td};text-align:center;color:#64748b;width:42px">${i+1}</td>
      <td style="${td}">${(r && r.item) || r || ""}</td>
      <td style="${td}">${(r && r.description) || ""}</td>
      <td style="${td};text-align:center">${(r && r.quantity) || ""}</td>
    </tr>`).join("");

  const reqSection = reqs.length > 0 ? `
    <div style="margin-bottom:22px">
      ${rule("Student Requirements")}
      <table style="${tbl}">
        <thead><tr>
          <th style="${th};width:42px;text-align:center">#</th>
          <th style="${th}">Item</th>
          <th style="${th}">Description</th>
          <th style="${th};text-align:center;width:80px">Quantity</th>
        </tr></thead>
        <tbody>${reqRows}</tbody>
      </table>
    </div>` : "";

  const otherRows = otherInfos.map((n,i) => `
    <tr>
      <td style="${td};text-align:center;color:#64748b;width:42px">${i+1}</td>
      <td style="${td};font-weight:600">${n.item||""}</td>
      <td style="${td}">${n.details||""}</td>
    </tr>`).join("");

  const otherSection = otherInfos.length > 0 ? `
    <div style="margin-bottom:22px">
      ${rule("Other Information")}
      <table style="${tbl}">
        <thead><tr>
          <th style="${th};width:42px;text-align:center">#</th>
          <th style="${th}">Item</th>
          <th style="${th}">Details</th>
        </tr></thead>
        <tbody>${otherRows}</tbody>
      </table>
    </div>` : "";

  const leaderRows = leaders.map((l,i) => `
    <tr>
      <td style="${td};text-align:center;color:#64748b;width:36px;font-size:11px">${i+1}</td>
      <td style="${td}">
        <div style="display:flex;align-items:center;gap:8px">
          <div style="width:26px;height:26px;border-radius:50%;border:1.5px solid #1e3a5f;display:flex;align-items:center;justify-content:center;flex-shrink:0">
            <span style="font-size:10px;font-weight:700;color:#1e3a5f">${(l.name||"?").charAt(0).toUpperCase()}</span>
          </div>
          <span style="font-weight:700;color:#1e3a5f;font-size:12px">${l.name||"—"}</span>
        </div>
      </td>
      <td style="${td};color:#475569;font-style:italic">${l.role||l.leader_role||"—"}</td>
      <td style="${td};font-family:monospace;font-size:11px">${l.phone?"+250 "+l.phone:"—"}</td>
      <td style="${td};font-size:11px;color:#2563eb">${l.email||"—"}</td>
    </tr>`).join("");

  const leadersSection = leaders.length > 0 ? `
    <div style="margin-bottom:22px">
      ${rule("School Leadership Contacts")}
      <table style="${tbl}">
        <thead><tr>
          <th style="${th};width:36px;text-align:center">#</th>
          <th style="${th}">Full Name</th>
          <th style="${th}">Role / Title</th>
          <th style="${th}">Phone</th>
          <th style="${th}">Email</th>
        </tr></thead>
        <tbody>${leaderRows}</tbody>
      </table>
    </div>` : "";

  const notesRows = classNotes.map((n,i) => `
    <tr>
      <td style="${td};text-align:center;color:#64748b;width:42px">${i+1}</td>
      <td style="${td};font-weight:600">${n.item||""}</td>
      <td style="${td}">${n.details||"—"}</td>
    </tr>`).join("");

  const notesSection = classNotes.length > 0 ? `
    <div style="margin-bottom:22px">
      ${rule("Class Requirements & Notes")}
      <table style="${tbl}">
        <thead><tr>
          <th style="${th};width:42px;text-align:center">#</th>
          <th style="${th}">Item</th>
          <th style="${th}">Details</th>
        </tr></thead>
        <tbody>${notesRows}</tbody>
      </table>
    </div>` : "";

  const qrBlock = qrB64 ? `
    <div style="display:flex;flex-direction:column;align-items:center;gap:4px">
      <div style="background:white;border:1px solid #e2e8f0;padding:6px;border-radius:6px">
        <img src="${qrB64}" style="width:80px;height:80px;object-fit:contain;display:block"/>
      </div>
      <p style="font-size:10px;color:#1e3a5f;font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin:0;text-align:center">Scan to Verify</p>
      ${rec.docId ? `<p style="font-size:10px;color:#64748b;font-family:monospace;margin:0">ID: ${rec.docId}</p>` : ""}
      ${vUrl ? `<p style="font-size:9px;color:#4f46e5;margin:0;text-align:center;max-width:110px;word-break:break-all">${vUrl}</p>` : ""}
    </div>` : `
    <div style="display:flex;flex-direction:column;align-items:center;gap:4px">
      <div style="width:80px;height:80px;border:1px dashed #e2e8f0;display:flex;align-items:center;justify-content:center">
        <span style="font-size:20px;opacity:.1">▣</span>
      </div>
      <p style="font-size:10px;color:#94a3b8;margin:0">QR Pending</p>
    </div>`;

  const schoolLogoHtml = schoolLogoB64
    ? `<img src="${schoolLogoB64}" style="width:70px;height:70px;object-fit:contain;display:block"/>`
    : `<div style="width:70px;height:70px;display:flex;align-items:center;justify-content:center;border:1px dashed #e2e8f0"><span style="font-size:8px;color:#64748b;text-align:center;font-weight:700">SCHOOL LOGO</span></div>`;

  const otherLogoHtml = otherLogoB64
    ? `<img src="${otherLogoB64}" style="width:70px;height:70px;object-fit:contain;display:block"/>`
    : `<div style="width:70px;height:70px;border:1px solid #e2e8f0;border-radius:4px;overflow:hidden;display:flex;align-items:center;justify-content:center"><span style="font-size:7px;color:#006400;font-weight:700;text-align:center;padding:4px">RW GOVT</span></div>`;

  return `
<div style="width:794px;background:#fff;font-family:Georgia,'Times New Roman',serif;color:#1e293b">
  <div style="height:3px;background:#1e3a5f"></div>
  <div style="padding:20px 40px 16px;border-bottom:2px solid #1e3a5f">
    <div style="display:flex;align-items:center;gap:20px">
      <div style="flex-shrink:0;width:80px;height:80px;display:flex;align-items:center;justify-content:center">${otherLogoHtml}</div>
      <div style="flex:1;text-align:center">
        <p style="font-size:10px;color:#64748b;margin:0 0 2px;letter-spacing:0.08em;text-transform:uppercase;font-weight:600">Republic of Rwanda · Ministry of Education — NESA</p>
        <p style="font-size:9px;color:#64748b;margin:0 0 2px">District: ${rec.district||"—"}</p>
        <p style="font-size:9px;color:#64748b;margin:0 0 6px">Sector: ${rec.sector||"—"}</p>
        <h1 style="font-size:17px;font-weight:700;color:#1e3a5f;margin:0 0 6px;text-transform:uppercase;letter-spacing:.03em">${rec.schoolName||""}</h1>
        <div style="display:flex;flex-wrap:wrap;gap:16px;align-items:center;justify-content:center">
          ${[["Academic Year",rec.academicYear],["Term",rec.term],["Class",rec.class]].map(([l,v])=>`
          <span style="font-size:12px;color:#1e293b"><strong style="color:#1e3a5f">${l}:</strong> ${v||"—"}</span>`).join("")}
          ${rec.docId ? `<span style="font-size:11px;font-family:monospace;font-weight:700;color:#3730a3;border:1px solid #c7d2fe;padding:1px 8px">${rec.docId}</span>` : ""}
        </div>
        <div style="margin-top:8px;display:inline-flex;align-items:center;gap:12px;background:#f0f9ff;border:1px solid #bfdbfe;padding:4px 16px;border-radius:4px">
          <span style="font-size:11px;color:#1e3a5f;font-weight:600">Total Fee:</span>
          <span style="font-size:16px;font-weight:700;color:#1e3a5f;font-family:monospace">RWF ${totalFee.toLocaleString()}</span>
          <span style="font-size:11px;color:#64748b">Kigali, le ${today}</span>
        </div>
      </div>
      <div style="flex-shrink:0;width:80px;height:80px;display:flex;align-items:center;justify-content:center;border:1px solid #e2e8f0;overflow:hidden">${schoolLogoHtml}</div>
    </div>
  </div>
  <div style="padding:20px 40px 28px">
    ${parentSection}
    ${paySection}
    ${banksSection}
    ${reqSection}
    ${otherSection}
    ${leadersSection}
    ${notesSection}
    <div style="margin-bottom:22px">
      <div style="border-bottom:1.5px solid #1e3a5f;padding-bottom:5px;margin-bottom:12px;margin-top:20px">
        <span style="font-size:14px;font-weight:700;color:#1e3a5f;text-transform:uppercase;letter-spacing:0.05em">Authorization &amp; Signatures</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;margin-top:12px">
        <div style="border:1px solid #e2e8f0;padding:14px;text-align:center">
          <p style="font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;margin:0 0 8px">Head Teacher</p>
          <div style="height:52px;display:flex;align-items:flex-end;justify-content:center;padding-bottom:4px">
            ${sigB64 ? `<img src="${sigB64}" style="max-height:48px;max-width:140px;object-fit:contain"/>` : `<div style="width:100%;height:1px;border-bottom:1px solid #cbd5e1"></div>`}
          </div>
          <p style="font-size:11px;color:#94a3b8;margin:4px 0 0">${sigB64?"✓ Signed":"Signature Required"}</p>
        </div>
        <div style="border:1px solid #e2e8f0;padding:14px;display:flex;flex-direction:column;align-items:center;justify-content:center">${qrBlock}</div>
        <div style="border:1px solid #e2e8f0;padding:14px;text-align:center">
          <p style="font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;margin:0 0 8px">Official Stamp</p>
          <div style="width:80px;height:80px;border:1px dashed #e2e8f0;border-radius:50%;display:flex;align-items:center;justify-content:center;overflow:hidden;margin:0 auto 6px">
            ${stampB64 ? `<img src="${stampB64}" style="width:76px;height:76px;object-fit:contain;border-radius:50%"/>` : `<span style="font-size:22px;opacity:.08">🔏</span>`}
          </div>
          <p style="font-size:11px;color:#94a3b8;margin:0">Cachet Officiel</p>
        </div>
      </div>
    </div>
  </div>
  <div style="border-top:1px solid #1e3a5f;padding:8px 40px;display:flex;justify-content:space-between;align-items:center">
    <span style="font-size:11px;color:#64748b">${rec.schoolName||""} · ${rec.district||""}</span>
    <span style="font-size:11px;color:#1e3a5f;font-weight:700;text-transform:uppercase">Document Officiel — NE PAS FALSIFIER</span>
    <span style="font-size:11px;color:#64748b">Doc: ${rec.docId||"—"} · ${today}</span>
  </div>
  <div style="height:3px;background:#1e3a5f"></div>
</div>`;
}

// ════════════════════════════════════════════════════════════
// downloadPdfById  ← the BabyeyiPdf.jsx handleDownloadPDF logic
//
// Given a numeric record id, fetches the full record from
// /api/babyeyi/:id (same as BabyeyiPdf), builds the HTML,
// renders with html2canvas, saves with jsPDF.
// ════════════════════════════════════════════════════════════
async function downloadPdfById(id, fallbackDocId) {
  await loadScript("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js");
  await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");

  // Fetch full record — identical to BabyeyiPdf.jsx useEffect
  const res  = await fetch(`${API_BASE}/babyeyi/${id}`, { credentials: "include" });
  const json = await res.json();
  if (!json.success) throw new Error(json.message || "Failed to load record");

  const d   = json.data;
  const sig = d.signatures || d.signature || {};

  let payments = (d.payments || []).map(p => ({ name: p.name, amount: Number(p.amount || 0) }));
  if (!payments.length && d.payments_json) {
    try { payments = JSON.parse(d.payments_json); } catch {}
  }

  const norm = (p) => p ? p.replace(/\\/g, "/") : null;

  const allReqs    = (d.class_requirements || []).map(r => ({ item: r.item || r.information || "", details: r.details || "" }));
  const classNotes = allReqs.filter(r => r.details && r.details.trim());
  const otherInfos = allReqs.filter(r => !r.details || !r.details.trim());

  // Leaders — prefer inline, fallback to dedicated endpoint
  let leaders = Array.isArray(d.leaders) ? d.leaders : [];
  if (!leaders.length) {
    try {
      const lr  = await fetch(`${API_BASE}/babyeyi/${d.id || id}/leaders`, { credentials: "include" });
      const lj  = await lr.json();
      if (lj.success && Array.isArray(lj.data)) leaders = lj.data;
    } catch {}
  }

  const rec = {
    id:             d.id,
    class:          getClassLabel(d),
    level:          d.education_level || d.level         || "Primary",
    term:           d.term            || "",
    academicYear:   d.academic_year   || "",
    status:         d.status          || "approved",
    schoolName:     d.school_name     || "",
    district:       d.school_district || d.district      || "",
    sector:         d.school_sector   || d.sector        || "",
    bankName:       d.bank_name       || "",
    bankAccountNo:  d.bank_account_no || "",
    bankAccountName:d.bank_account_name || "",
    banksJson:      d.banks_json      || null,
    parentMessage:  d.parent_message  || "",
    docId:          d.doc_id          || fallbackDocId    || null,
    totalFee:       Number(d.total_fee || d.total_amount || payments.reduce((s,p) => s+Number(p.amount||0), 0) || 0),
    schoolLogoPath: norm(sig.school_logo_path) || null,
    otherLogoPath:  norm(sig.other_logo_path)  || null,
    signaturePath:  norm(sig.director_sig_path) || null,
    stampPath:      norm(sig.stamp_path)        || null,
    qrCodeUrl:      norm(sig.qr_code_path) || norm(d.qr_code_path) || norm(d.qr_code_url) || null,
    qrViewUrl:      sig.qr_view_url || d.qr_view_url || null,
    payments,
    requirements:   (d.student_requirements || []).map(r => ({
      item: r.item,
      description: r.description || "",
      quantity: r.quantity || "",
    })),
    classNotes,
    otherInfos,
    leaders,
  };

  console.log("[Verify→PDF] Full record loaded. Asset paths:", {
    schoolLogoPath: rec.schoolLogoPath,
    otherLogoPath:  rec.otherLogoPath,
    signaturePath:  rec.signaturePath,
    stampPath:      rec.stampPath,
    qrCodeUrl:      rec.qrCodeUrl,
  });

  // Load all images in parallel
  const [schoolLogoB64, otherLogoB64, sigB64, stampB64] = await Promise.all([
    toBase64(toAssetUrl(rec.schoolLogoPath)),
    toBase64(toAssetUrl(rec.otherLogoPath)),
    toBase64(toAssetUrl(rec.signaturePath)),
    toBase64(toAssetUrl(rec.stampPath)),
  ]);

  // QR — use existing path or fetch from dedicated endpoint
  let qrB64  = await toBase64(toAssetUrl(rec.qrCodeUrl));
  let vUrl   = rec.qrViewUrl || makeVerifyUrl(rec.docId);
  if (!qrB64) {
    try {
      const qr  = await fetch(`${API_BASE}/babyeyi/${rec.id}/qrcode`, { credentials: "include" });
      const qrj = await qr.json();
      if (qrj.success && qrj.data?.qr_code_url) {
        qrB64 = await toBase64(toAssetUrl(qrj.data.qr_code_url));
        vUrl  = qrj.data.qr_view_url || makeVerifyUrl(rec.docId);
      }
    } catch {}
  }

  console.log("[Verify→PDF] Base64 results:", {
    schoolLogo: schoolLogoB64 ? "✓" : "✗ null",
    otherLogo:  otherLogoB64  ? "✓" : "✗ null",
    signature:  sigB64        ? "✓" : "✗ null",
    stamp:      stampB64      ? "✓" : "✗ null",
    qr:         qrB64         ? "✓" : "✗ null",
  });

  const totalFee = rec.totalFee > 0
    ? rec.totalFee
    : payments.reduce((s,p) => s+Number(p.amount||0), 0);

  const today = new Date().toLocaleDateString("fr-FR", { day:"2-digit", month:"long", year:"numeric" });
  const html  = buildWordDocHTML({ rec, totalFee, today, schoolLogoB64, otherLogoB64, sigB64, stampB64, qrB64, vUrl });

  // Render hidden DOM node → canvas → PDF (identical to BabyeyiPdf)
  const styleEl = document.createElement("style");
  styleEl.textContent = `#__bp__ * { box-sizing:border-box; color-scheme:light only; } #__bp__ { all:initial;display:block;background:#fff; }`;
  document.head.appendChild(styleEl);

  const host = document.createElement("div");
  host.style.cssText = "position:fixed;left:-9999px;top:0;width:794px;background:#fff;z-index:-9999;";
  const root = document.createElement("div");
  root.id = "__bp__";
  root.innerHTML = html;
  host.appendChild(root);
  document.body.appendChild(host);

  try {
    await new Promise(r => setTimeout(r, 500));
    const canvas = await window.html2canvas(root, {
      scale:2, useCORS:true, allowTaint:false,
      backgroundColor:"#fff", logging:false, windowWidth:794,
      onclone:(d) => { const s=d.createElement("style"); s.textContent="*{color-scheme:light only!important}"; d.head.appendChild(s); },
    });

    const { jsPDF } = window.jspdf;
    const pdf  = new jsPDF({ orientation:"portrait", unit:"mm", format:"a4" });
    const pW   = 210, pH = 297;
    const imgH = (canvas.height / canvas.width) * pW;

    if (imgH <= pH) {
      pdf.addImage(canvas.toDataURL("image/jpeg", 0.95), "JPEG", 0, 0, pW, imgH);
    } else {
      let yPos = 0, page = 0;
      while (yPos < imgH) {
        if (page > 0) pdf.addPage();
        const srcYPx   = Math.floor((yPos / imgH) * canvas.height);
        const sliceHPx = Math.min(Math.ceil((pH / imgH) * canvas.height), canvas.height - srcYPx);
        if (sliceHPx <= 0) break;
        const sl = document.createElement("canvas");
        sl.width  = canvas.width; sl.height = sliceHPx;
        sl.getContext("2d").drawImage(canvas, 0, srcYPx, canvas.width, sliceHPx, 0, 0, canvas.width, sliceHPx);
        pdf.addImage(sl.toDataURL("image/jpeg", 0.95), "JPEG", 0, 0, pW, (sliceHPx/canvas.height)*imgH);
        yPos += pH; page++;
      }
    }
    pdf.save(`Babyeyi-${rec.docId||rec.class}-${rec.term}.pdf`);
  } finally {
    document.body.removeChild(host);
    document.head.removeChild(styleEl);
  }
}

// ── Icon set ──────────────────────────────────────────────────
const PATH = {
  check:    "M20 6L9 17l-5-5",
  x:        "M18 6L6 18M6 6l12 12",
  warn:     "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01",
  shield:   "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  copy:     "M8 17.929H6c-1.105 0-2-.912-2-2.036V5.036C4 3.91 4.895 3 6 3h8c1.105 0 2 .911 2 2.036v1.866m-6 .17h8c1.105 0 2 .91 2 2.035v10.857C20 21.09 19.105 22 18 22h-8c-1.105 0-2-.911-2-2.036V9.107c0-1.124.895-2.036 2-2.036z",
  link:     "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71",
  download: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3",
  search:   "M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z",
  back:     "M19 12H5M12 5l-7 7 7 7",
  doc:      "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8",
};
const Ic = ({ n, s=18, c="currentColor", sw=2 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c}
       strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    <path d={PATH[n]||PATH.shield}/>
  </svg>
);

const Coat = ({ size=60 }) => (
  <svg viewBox="0 0 80 80" width={size} height={size}>
    <circle cx="40" cy="40" r="38" fill="#006400" stroke="#ffd700" strokeWidth="2"/>
    <circle cx="40" cy="40" r="28" fill="#006400" stroke="#ffd700" strokeWidth="1"/>
    <text x="40" y="35" textAnchor="middle" fontSize="9" fill="#ffd700" fontWeight="bold">RWANDA</text>
    <text x="40" y="46" textAnchor="middle" fontSize="6" fill="#ffd700">UBUMWE · UMURIMO</text>
    <text x="40" y="56" textAnchor="middle" fontSize="5" fill="#ffd700">GUKUNDA IGIHUGU</text>
    <circle cx="40" cy="21" r="5" fill="#ffd700"/>
    {[0,45,90,135,180,225,270,315].map((a,i)=>{
      const r=(a*Math.PI)/180;
      return <line key={i} x1={40+7*Math.cos(r)} y1={21+7*Math.sin(r)} x2={40+11*Math.cos(r)} y2={21+11*Math.sin(r)} stroke="#ffd700" strokeWidth="1.5"/>;
    })}
  </svg>
);

const RwandaCoatSVG = () => (
  <svg viewBox="0 0 80 80" style={{ width:"100%", height:"100%" }}>
    <circle cx="40" cy="40" r="38" fill="#006400" stroke="#ffd700" strokeWidth="2"/>
    <circle cx="40" cy="40" r="28" fill="#006400" stroke="#ffd700" strokeWidth="1"/>
    <text x="40" y="36" textAnchor="middle" fontSize="10" fill="#ffd700" fontWeight="bold">RWANDA</text>
    <text x="40" y="48" textAnchor="middle" fontSize="7"  fill="#ffd700">UBUMWE</text>
    <text x="40" y="57" textAnchor="middle" fontSize="6"  fill="#ffd700">UMURIMO</text>
    <text x="40" y="65" textAnchor="middle" fontSize="6"  fill="#ffd700">GUKUNDA IGIHUGU</text>
    <circle cx="40" cy="22" r="6" fill="#ffd700"/>
    {[0,45,90,135,180,225,270,315].map((angle,i)=>{
      const rad=(angle*Math.PI)/180;
      return <line key={i} x1={40+8*Math.cos(rad)} y1={22+8*Math.sin(rad)} x2={40+12*Math.cos(rad)} y2={22+12*Math.sin(rad)} stroke="#ffd700" strokeWidth="1.5"/>;
    })}
  </svg>
);

const STATUS_CFG = {
  approved:    { label:"Approved",    bg:"#d1fae5", text:"#065f46", border:"#6ee7b7", dot:"#10b981" },
  pending:     { label:"Pending",     bg:"#fef3c7", text:"#92400e", border:"#fcd34d", dot:"#f59e0b" },
  recommended: { label:"Recommended", bg:"#eff6ff", text:"#1e40af", border:"#bfdbfe", dot:"#3b82f6" },
  rejected:    { label:"Rejected",    bg:"#fee2e2", text:"#991b1b", border:"#fca5a5", dot:"#ef4444" },
  draft:       { label:"Draft",       bg:"#f1f5f9", text:"#475569", border:"#cbd5e1", dot:"#94a3b8" },
};

// ── Integrity card ────────────────────────────────────────────
function IntegrityCard({ integrity, hasHash }) {
  const { status, detail, serverHash, qrHash } = integrity;
  const [copiedField, setCopiedField] = useState(null);
  const copy = (val, key) => {
    navigator.clipboard.writeText(val).then(() => { setCopiedField(key); setTimeout(() => setCopiedField(null), 1800); });
  };
  const cfg = {
    valid:    { icon:"check", iconC:"#059669", bg:"linear-gradient(135deg,#ecfdf5,#d1fae5)", border:"#6ee7b7", title:"✓  Document Authentic",    titleC:"#065f46" },
    tampered: { icon:"x",     iconC:"#dc2626", bg:"linear-gradient(135deg,#fef2f2,#fee2e2)", border:"#fca5a5", title:"✗  Integrity Check Failed", titleC:"#991b1b" },
    no_hash:  { icon:"warn",  iconC:"#d97706", bg:"linear-gradient(135deg,#fffbeb,#fef3c7)", border:"#fcd34d", title:"⚠  Legacy Document",         titleC:"#92400e" },
  }[status] || { icon:"warn", iconC:"#6366f1", bg:"linear-gradient(135deg,#f5f3ff,#ede9fe)", border:"#c4b5fd", title:"Status Unknown", titleC:"#4c1d95" };

  const HashRow = ({ label, val, k }) => (
    <div style={{ display:"flex", alignItems:"center", gap:"8px", padding:"6px 0", borderBottom:"1px solid rgba(0,0,0,0.05)" }}>
      <span style={{ fontSize:"11px", color:"#64748b", fontWeight:600, width:"90px", flexShrink:0 }}>{label}</span>
      <span style={{ fontFamily:"monospace", fontSize:"12px", color:"#1e3a5f", fontWeight:700, flex:1, wordBreak:"break-all" }}>{val}</span>
      <button onClick={() => copy(val, k)} style={{ border:"none", background:"none", cursor:"pointer", padding:"2px 4px", borderRadius:"4px", color:copiedField===k?"#059669":"#94a3b8" }}>
        <Ic n={copiedField===k?"check":"copy"} s={12} c="currentColor"/>
      </button>
    </div>
  );

  return (
    <div style={{ background:cfg.bg, border:`1.5px solid ${cfg.border}`, borderRadius:"16px", padding:"18px", marginBottom:"14px" }}>
      <div style={{ display:"flex", alignItems:"center", gap:"12px", marginBottom:"14px" }}>
        <div style={{ width:"42px", height:"42px", borderRadius:"50%", background:"white", border:`2px solid ${cfg.border}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, boxShadow:"0 2px 8px rgba(0,0,0,0.08)" }}>
          <Ic n={cfg.icon} s={20} c={cfg.iconC} sw={2.5}/>
        </div>
        <div>
          <p style={{ fontSize:"15px", fontWeight:800, color:cfg.titleC, margin:0 }}>{cfg.title}</p>
          <p style={{ fontSize:"12px", color:"#475569", margin:"3px 0 0", lineHeight:1.5 }}>{detail}</p>
        </div>
      </div>
      <div style={{ background:"rgba(255,255,255,0.65)", borderRadius:"10px", padding:"4px 12px 2px" }}>
        {qrHash && <HashRow label="QR Hash" val={qrHash} k="qr"/>}
        <HashRow label="Server Hash" val={serverHash} k="srv"/>
        <div style={{ padding:"6px 0" }}>
          <span style={{ fontSize:"11px", color:"#94a3b8" }}>Algorithm: </span>
          <span style={{ fontSize:"11px", color:"#64748b", fontWeight:600 }}>HMAC-SHA256 (64-bit)</span>
        </div>
        {!hasHash && <p style={{ fontSize:"11px", color:"#6b7280", margin:"0 0 6px", fontStyle:"italic" }}>💡 Scan the QR code on the printed document for full cryptographic verification.</p>}
      </div>
    </div>
  );
}

// ── PDF Download button ───────────────────────────────────────
// Calls resolveNumericId → downloadPdfById (the BabyeyiPdf pipeline)
function PdfDownloadBtn({ data }) {
  const [state,  setState]  = useState("idle");
  const [status, setStatus] = useState("");   // progress message

  const handleClick = async () => {
    if (state !== "idle") return;
    setState("loading");
    try {
      setStatus("Resolving record…");
      const numericId = await resolveNumericId(data);
      if (!numericId) throw new Error("Could not resolve record ID — check console for details");

      const docId = data.docId || data.doc_id;
      setStatus("Loading full record…");
      await downloadPdfById(numericId, docId);

      setState("done");
      setStatus("");
      setTimeout(() => setState("idle"), 2500);
    } catch (e) {
      console.error("[Verify] PDF download error:", e);
      setStatus(e.message || "Unknown error");
      setState("error");
      setTimeout(() => { setState("idle"); setStatus(""); }, 4000);
    }
  };

  const configs = {
    idle:    { label:"Download Official PDF",  icon:"download", bg:"linear-gradient(135deg,#1e3a5f,#1d4ed8)", border:"transparent",          color:"white",   shadow:"0 4px 20px rgba(30,58,95,0.5)" },
    loading: { label:status||"Generating PDF…",icon:null,       bg:"rgba(30,58,95,0.55)",                     border:"transparent",          color:"white",   shadow:"none" },
    done:    { label:"PDF Downloaded!",        icon:"check",    bg:"rgba(52,211,153,0.15)",                   border:"rgba(52,211,153,0.4)", color:"#34d399", shadow:"none" },
    error:   { label:"Generation Failed",      icon:"x",        bg:"rgba(239,68,68,0.12)",                   border:"rgba(239,68,68,0.35)", color:"#f87171", shadow:"none" },
  };
  const cfg = configs[state];

  return (
    <div style={{ marginBottom:"14px" }}>
      <button onClick={handleClick} disabled={state !== "idle"}
        style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:"10px", padding:"14px 18px", background:cfg.bg, border:`1.5px solid ${cfg.border}`, borderRadius:"14px", color:cfg.color, fontSize:"15px", fontWeight:800, cursor:state==="idle"?"pointer":"not-allowed", boxShadow:cfg.shadow, transition:"all .22s" }}>
        {state==="loading"
          ? <div style={{ width:"18px", height:"18px", border:"2.5px solid rgba(255,255,255,0.3)", borderTopColor:"white", borderRadius:"50%", animation:"spin .8s linear infinite" }}/>
          : cfg.icon && <Ic n={cfg.icon} s={18} c="currentColor" sw={2.5}/>}
        {cfg.label}
        {state==="idle" && <span style={{ marginLeft:"auto", fontSize:"11px", color:"rgba(255,255,255,0.4)", fontFamily:"monospace", fontWeight:500 }}>{data.docId||data.doc_id}</span>}
      </button>
      {state==="error" && status && (
        <p style={{ color:"#f87171", fontSize:"11px", margin:"6px 0 0", textAlign:"center", fontWeight:600 }}>{status}</p>
      )}
    </div>
  );
}

// ── Official document preview card ────────────────────────────
function OfficialDocCard({ data }) {
  const NAVY     = "#1e3a5f";
  const payments = Array.isArray(data.payments) ? data.payments : [];
  const classLabel = getClassLabel(data);
  const DOC = {
    heading: { fontSize:"14px", fontWeight:700, color:NAVY, textTransform:"uppercase", letterSpacing:"0.05em" },
    th: { padding:"8px 12px", fontSize:"12px", fontWeight:700, color:NAVY, borderBottom:`2px solid ${NAVY}`, textAlign:"left", background:"transparent" },
    td: { padding:"7px 12px", fontSize:"12px", color:"#1e293b", borderBottom:"1px solid #e2e8f0", background:"transparent" },
  };
  return (
    <div style={{ background:"white", borderRadius:"16px", overflow:"hidden", marginBottom:"14px", boxShadow:"0 8px 32px rgba(0,0,0,0.22)", fontFamily:"Georgia,'Times New Roman',serif" }}>
      <div style={{ height:"3px", background:NAVY }}/>
      <div style={{ padding:"18px 22px 14px", borderBottom:`2px solid ${NAVY}` }}>
        <div style={{ display:"flex", alignItems:"center", gap:"16px" }}>
          <div style={{ flexShrink:0, width:"60px", height:"60px", border:"1px solid #e2e8f0", borderRadius:"6px", overflow:"hidden", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <img src="../assets/edu-logo.png" alt="" /> 
          </div>
          <div style={{ flex:1, textAlign:"center" }}>
            <p style={{ fontSize:"10px", color:"#64748b", margin:"0 0 2px", letterSpacing:"0.08em", textTransform:"uppercase", fontWeight:600 }}>Republic of Rwanda · Ministry of Education — NESA</p>
            {data.district && <p style={{ fontSize:"10px", color:"#64748b", margin:"0 0 1px" }}>District: <strong style={{ color:NAVY }}>{data.district}</strong>{data.sector && <> &nbsp;·&nbsp; Sector: <strong style={{ color:NAVY }}>{data.sector}</strong></>}</p>}
            <h2 style={{ fontSize:"16px", fontWeight:700, color:NAVY, margin:"6px 0 6px", textTransform:"uppercase", letterSpacing:".03em" }}>{data.schoolName}</h2>
            <div style={{ display:"flex", flexWrap:"wrap", gap:"12px", alignItems:"center", justifyContent:"center", marginBottom:"6px" }}>
              {[["Academic Year",data.academicYear],["Term",data.term],["Class",classLabel]].filter(([,v])=>v).map(([l,v],i)=>(
                <span key={i} style={{ fontSize:"12px", color:"#1e293b" }}><strong style={{ color:NAVY }}>{l}:</strong> {v}</span>
              ))}
              {data.docId && <span style={{ fontSize:"11px", fontFamily:"monospace", fontWeight:700, color:"#3730a3", border:"1px solid #c7d2fe", padding:"1px 8px" }}>{data.docId}</span>}
            </div>
          </div>
          <div style={{ flexShrink:0, width:"60px", height:"60px", border:"1px dashed #e2e8f0", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <span style={{ fontSize:"8px", color:"#94a3b8", textAlign:"center", lineHeight:1.4 }}>SCHOOL<br/>LOGO</span>
          </div>
        </div>
      </div>
      {payments.length > 0 && (
        <div style={{ padding:"16px 22px 0" }}>
          <div style={{ borderBottom:`1.5px solid ${NAVY}`, paddingBottom:"5px", marginBottom:"12px" }}><span style={DOC.heading}>Fee Payment Breakdown</span></div>
          <table style={{ width:"100%", borderCollapse:"collapse", marginTop:"8px", marginBottom:"8px" }}>
            <thead><tr>
              <th style={{ ...DOC.th, width:"42px", textAlign:"center" }}>N°</th>
              <th style={DOC.th}>Payment Item</th>
              <th style={{ ...DOC.th, textAlign:"right" }}>Amount (RWF)</th>
            </tr></thead>
            <tbody>{payments.map((p,i)=>(<tr key={i}><td style={{ ...DOC.td, textAlign:"center", color:"#64748b" }}>{i+1}</td><td style={DOC.td}>{p.name}</td><td style={{ ...DOC.td, textAlign:"right", fontFamily:"monospace", fontWeight:600 }}>{Number(p.amount||0).toLocaleString()}</td></tr>))}</tbody>
            <tfoot><tr>
              <td colSpan={2} style={{ padding:"9px 12px", fontSize:"14px", fontWeight:700, color:NAVY, borderTop:`2px solid ${NAVY}` }}>TOTAL</td>
              <td style={{ padding:"9px 12px", fontSize:"14px", fontWeight:700, color:NAVY, borderTop:`2px solid ${NAVY}`, textAlign:"right", fontFamily:"monospace" }}>RWF {data.totalFee.toLocaleString()}</td>
            </tr></tfoot>
          </table>
          {data.exceedsLimit && <div style={{ background:"#fef2f2", border:"1px solid #fca5a5", borderRadius:"6px", padding:"7px 12px", marginBottom:"12px" }}><p style={{ margin:0, fontSize:"11px", color:"#991b1b", fontWeight:600 }}>⚠ Total exceeds NESA limit{data.nesaLimit?` (max: RWF ${Number(data.nesaLimit).toLocaleString()})`:""}</p></div>}
        </div>
      )}
      <div style={{ borderTop:`1px solid ${NAVY}`, padding:"8px 22px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <span style={{ fontSize:"10px", color:"#64748b" }}>{data.schoolName} · {data.district||""}</span>
        <span style={{ fontSize:"10px", color:NAVY, fontWeight:700, textTransform:"uppercase" }}>Document Officiel — NE PAS FALSIFIER</span>
        <span style={{ fontSize:"10px", color:"#64748b", fontFamily:"monospace" }}>{data.docId} · {new Date().toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit",year:"numeric"})}</span>
      </div>
      <div style={{ height:"3px", background:NAVY }}/>
    </div>
  );
}

// ── Search form ───────────────────────────────────────────────
function SearchForm({ onSearch, loading, prevError }) {
  const [input, setInput]   = useState("");
  const [fmtErr, setFmtErr] = useState("");
  const inputRef = useRef(null);
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 80); }, []);
  const submit = () => {
    setFmtErr("");
    const v = normaliseDocId(input);
    if (!/^BY-\d{4}-\d{5}$/.test(v)) { setFmtErr("Enter a valid document ID — e.g. BY-2025-00026"); return; }
    onSearch(v);
  };
  const showErr = fmtErr || prevError;
  return (
    <div style={{ maxWidth:"420px", margin:"0 auto", padding:"0 16px" }}>
      <div style={{ textAlign:"center", marginBottom:"28px" }} className="anim-up">
        <div style={{ display:"flex", justifyContent:"center", marginBottom:"14px" }}>
          <div style={{ width:"72px", height:"72px", borderRadius:"50%", border:"2px solid rgba(255,215,0,0.35)", padding:"4px", background:"rgba(0,100,0,0.2)" }}><Coat size={64}/></div>
        </div>
        <p style={{ color:"rgba(255,255,255,0.4)", fontSize:"10px", letterSpacing:"0.14em", textTransform:"uppercase", margin:"0 0 6px", fontWeight:700 }}>Republic of Rwanda · Ministry of Education — NESA</p>
        <h1 style={{ color:"white", fontSize:"22px", fontWeight:900, margin:"0 0 8px", lineHeight:1.2 }}>Fee Document Verification</h1>
        <p style={{ color:"rgba(255,255,255,0.4)", fontSize:"13px", margin:0, lineHeight:1.7 }}>Enter a Babyeyi document ID to verify its authenticity<br/>and download the official fee document</p>
      </div>
      <div className="anim-up" style={{ background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.13)", borderRadius:"20px", padding:"22px 20px", backdropFilter:"blur(14px)" }}>
        <label style={{ display:"block", color:"rgba(255,255,255,0.55)", fontSize:"11px", fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"8px" }}>Document ID</label>
        <div style={{ position:"relative" }}>
          <div style={{ position:"absolute", left:"13px", top:"50%", transform:"translateY(-50%)", pointerEvents:"none" }}><Ic n="doc" s={17} c="rgba(255,255,255,0.3)"/></div>
          <input ref={inputRef} value={input} onChange={e=>{setFmtErr(""); setInput(e.target.value.toUpperCase());}} onKeyDown={e=>e.key==="Enter"&&submit()} placeholder="BY-2025-00026" maxLength={14} spellCheck={false} autoComplete="off"
            style={{ width:"100%", boxSizing:"border-box", padding:"13px 14px 13px 42px", background:"rgba(255,255,255,0.08)", border:`1.5px solid ${showErr?"rgba(239,68,68,0.55)":"rgba(255,255,255,0.18)"}`, borderRadius:"12px", color:"white", fontSize:"18px", fontFamily:"monospace", fontWeight:700, letterSpacing:"0.06em", outline:"none", caretColor:"#60a5fa" }}/>
        </div>
        {showErr && <p style={{ color:"#f87171", fontSize:"12px", margin:"6px 0 0", fontWeight:600 }}>{fmtErr||prevError}</p>}
        <p style={{ color:"rgba(255,255,255,0.28)", fontSize:"11px", margin:"7px 0 18px" }}>Format: BY-YYYY-NNNNN</p>
        <button onClick={submit} disabled={loading}
          style={{ width:"100%", padding:"13px", background:loading?"rgba(99,102,241,0.35)":"linear-gradient(135deg,#4f46e5,#2563eb)", border:"none", borderRadius:"12px", color:"white", fontSize:"15px", fontWeight:800, cursor:loading?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:"10px", boxShadow:loading?"none":"0 4px 18px rgba(99,102,241,0.4)", transition:"all .2s" }}>
          {loading ? <div style={{ width:"18px", height:"18px", border:"2.5px solid rgba(255,255,255,0.3)", borderTopColor:"white", borderRadius:"50%", animation:"spin .8s linear infinite" }}/> : <Ic n="search" s={18} c="white" sw={2.5}/>}
          {loading ? "Verifying…" : "Verify Document"}
        </button>
      </div>
      <p style={{ color:"rgba(255,255,255,0.18)", fontSize:"11px", textAlign:"center", marginTop:"16px", lineHeight:1.8 }}>You can also scan the QR code on any printed Babyeyi document<br/>to open this page automatically.</p>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════
export default function BabyeyiVerify() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [copied,  setCopied]  = useState(false);
  const [view,    setView]    = useState("search");

  const urlDocId  = getDocIdFromUrl();
  const urlQrHash = getQrHashFromUrl();

  useEffect(() => { if (urlDocId) doFetch(urlDocId, urlQrHash); }, []);

  const doFetch = async (docId, qrHash=null) => {
    setLoading(true); setError(null);
    try {
      const url  = `${API_BASE}/babyeyi/verify/${docId}${qrHash?`?h=${qrHash}`:""}`;
      const res  = await fetch(url);
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Document not found");
      console.log("[Verify] Raw API keys:", Object.keys(json.data));
      console.log("[Verify] Raw API data:", json.data);
      setData(json.data);
      setView("result");
    } catch (e) {
      setError(e.message);
      setView("search");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (docId) => doFetch(docId, null);
  const handleReset  = () => { setData(null); setError(null); setView("search"); };
  const copyUrl = (url) => { navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); };

  const BG = "linear-gradient(160deg,#0f172a 0%,#1e3a5f 50%,#0c4a6e 100%)";
  const GLOBAL = `
    @keyframes spin{to{transform:rotate(360deg)}}
    @keyframes animup{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
    .anim-up{animation:animup .38s ease-out both}
    input:focus{border-color:rgba(96,165,250,0.65)!important;box-shadow:0 0 0 3px rgba(96,165,250,0.12)!important;}
    button:hover:not(:disabled){opacity:.87;transform:translateY(-1px);}
    button:active:not(:disabled){transform:translateY(0);}
  `;

  if (urlDocId && loading && !data) return (
    <div style={{ minHeight:"100vh", background:BG, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:"16px" }}>
      <style>{GLOBAL}</style>
      <div style={{ width:"52px", height:"52px", border:"4px solid rgba(255,255,255,0.15)", borderTopColor:"#60a5fa", borderRadius:"50%", animation:"spin .9s linear infinite" }}/>
      <p style={{ color:"rgba(255,255,255,0.55)", fontSize:"14px", fontWeight:600 }}>Verifying document…</p>
    </div>
  );

  if (view === "search" || !data) return (
    <div style={{ minHeight:"100vh", background:BG, paddingTop:"48px", paddingBottom:"48px" }}>
      <style>{GLOBAL}</style>
      {loading && (
        <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.7)", backdropFilter:"blur(4px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:99 }}>
          <div style={{ textAlign:"center" }}>
            <div style={{ width:"44px", height:"44px", border:"4px solid rgba(255,255,255,0.15)", borderTopColor:"#60a5fa", borderRadius:"50%", animation:"spin .9s linear infinite", margin:"0 auto 12px" }}/>
            <p style={{ color:"rgba(255,255,255,0.6)", fontSize:"13px", fontWeight:600 }}>Verifying…</p>
          </div>
        </div>
      )}
      <SearchForm onSearch={handleSearch} loading={loading} prevError={error}/>
    </div>
  );

  const st      = STATUS_CFG[data.status] || STATUS_CFG.pending;
  const pageUrl = data.verifyUrl || window.location.href;

  return (
    <div style={{ minHeight:"100vh", background:BG, paddingBottom:"48px" }}>
      <style>{GLOBAL}</style>

      {/* Header */}
      <div style={{ background:"rgba(0,0,0,0.3)", backdropFilter:"blur(14px)", padding:"22px 20px 18px", textAlign:"center", borderBottom:"1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ display:"flex", justifyContent:"center", marginBottom:"10px" }}>
          <div style={{ width:"58px", height:"58px", borderRadius:"50%", border:"2px solid rgba(255,215,0,0.3)", padding:"3px", background:"rgba(0,100,0,0.2)" }}><Coat size={52}/></div>
        </div>
        <p style={{ color:"rgba(255,255,255,0.38)", fontSize:"10px", letterSpacing:"0.12em", textTransform:"uppercase", margin:"0 0 2px", fontWeight:600 }}>Republic of Rwanda · Ministry of Education — NESA</p>
        <h1 style={{ color:"white", fontSize:"18px", fontWeight:900, margin:"8px 0 6px" }}>Fee Document Verification</h1>
        <div style={{ display:"inline-flex", alignItems:"center", gap:"8px", background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.17)", borderRadius:"100px", padding:"6px 16px", margin:"6px 0 10px" }}>
          <Ic n="shield" s={12} c="rgba(255,255,255,0.6)"/>
          <span style={{ fontFamily:"monospace", color:"white", fontSize:"14px", fontWeight:800, letterSpacing:"0.06em" }}>{data.docId||data.doc_id}</span>
        </div>
        <div style={{ display:"flex", justifyContent:"center" }}>
          <span style={{ display:"inline-flex", alignItems:"center", gap:"6px", background:st.bg, color:st.text, border:`1.5px solid ${st.border}`, borderRadius:"100px", padding:"5px 14px", fontSize:"12px", fontWeight:800 }}>
            <span style={{ width:"7px", height:"7px", borderRadius:"50%", background:st.dot }}/>{st.label}
          </span>
        </div>
      </div>

      {/* Body */}
      <div style={{ maxWidth:"520px", margin:"20px auto 0", padding:"0 16px" }} className="anim-up">

        {/* ① PDF — delegates to BabyeyiPdf pipeline */}
        <PdfDownloadBtn data={data}/>

        {/* ② Integrity */}
        <IntegrityCard integrity={data.integrity} hasHash={!!urlQrHash}/>

        {/* ③ Doc preview */}
        <OfficialDocCard data={data}/>

        {/* ④ Verify URL */}
        <div style={{ background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.11)", borderRadius:"14px", padding:"14px 15px", marginBottom:"14px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"7px", marginBottom:"8px" }}>
            <Ic n="link" s={12} c="rgba(255,255,255,0.45)"/>
            <span style={{ color:"rgba(255,255,255,0.4)", fontSize:"10px", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.1em" }}>Verification URL</span>
          </div>
          <p style={{ fontFamily:"monospace", fontSize:"11px", color:"#93c5fd", wordBreak:"break-all", margin:"0 0 10px", lineHeight:1.8 }}>{pageUrl}</p>
          <button onClick={() => copyUrl(pageUrl)}
            style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:"7px", padding:"10px", background:copied?"rgba(52,211,153,0.15)":"rgba(99,102,241,0.15)", border:`1px solid ${copied?"rgba(52,211,153,0.4)":"rgba(99,102,241,0.35)"}`, borderRadius:"10px", color:copied?"#34d399":"#a5b4fc", fontSize:"13px", fontWeight:700, cursor:"pointer", transition:"all .2s" }}>
            <Ic n={copied?"check":"copy"} s={14} c="currentColor"/>
            {copied ? "Copied to clipboard!" : "Copy verification link"}
          </button>
        </div>

        {/* ⑤ Timestamps */}
        <div style={{ display:"flex", gap:"10px", marginBottom:"16px" }}>
          {data.createdAt && (
            <div style={{ flex:1, background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:"12px", padding:"10px 13px" }}>
              <p style={{ color:"rgba(255,255,255,0.3)", fontSize:"10px", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", margin:"0 0 3px" }}>Created</p>
              <p style={{ color:"rgba(255,255,255,0.75)", fontSize:"12px", fontWeight:600, margin:0 }}>{new Date(data.createdAt).toLocaleDateString("en-RW",{day:"2-digit",month:"short",year:"numeric"})}</p>
            </div>
          )}
          <div style={{ flex:1, background:"rgba(52,211,153,0.08)", border:"1px solid rgba(52,211,153,0.2)", borderRadius:"12px", padding:"10px 13px" }}>
            <p style={{ color:"rgba(52,211,153,0.55)", fontSize:"10px", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", margin:"0 0 3px" }}>Verified at</p>
            <p style={{ color:"#34d399", fontSize:"12px", fontWeight:700, margin:0 }}>{new Date(data.verifiedAt).toLocaleTimeString("en-RW",{hour:"2-digit",minute:"2-digit",second:"2-digit"})}</p>
          </div>
        </div>

        <button onClick={handleReset}
          style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:"8px", padding:"12px", background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:"12px", color:"rgba(255,255,255,0.6)", fontSize:"13px", fontWeight:700, cursor:"pointer", marginBottom:"22px", transition:"all .2s" }}>
          <Ic n="back" s={14} c="currentColor"/> Verify another document
        </button>

        <p style={{ color:"rgba(255,255,255,0.2)", fontSize:"11px", textAlign:"center", lineHeight:1.8 }}>
          Verified by Ministry of Education — NESA, Republic of Rwanda.<br/>
          Integrity validated using HMAC-SHA256 cryptographic signing.
        </p>
      </div>
    </div>
  );
}
