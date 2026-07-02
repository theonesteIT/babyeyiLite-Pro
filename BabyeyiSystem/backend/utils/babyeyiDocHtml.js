/**
 * Shared Babyeyi document HTML — same layout as frontend buildWordDocHTML / babyeyiPdfExport.
 * Used by Puppeteer PDF generation and the /print route.
 */
const { getDocStrings } = require("./babyeyiDocI18n");
const {
  formatBabyeyiDocumentClassLabel,
  buildBabyeyiDocumentClassHeaderHtml,
} = require("./classStreamLabels");
const { wrapBabyeyiDocHtml, BABYEYI_DOC_FRAME_PRINT_CSS } = require("./babyeyiDocFrame");

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function parseBanks(rec) {
  if (rec.banksJson) {
    try {
      const raw = typeof rec.banksJson === "string" ? JSON.parse(rec.banksJson) : rec.banksJson;
      if (Array.isArray(raw) && raw.length) return raw;
    } catch (_) {}
  }
  if (rec.bankName) {
    return [{
      bankName: rec.bankName,
      accountNumber: rec.bankAccountNo || "",
      accountName: rec.bankAccountName || "",
      isPrimary: true,
    }];
  }
  return [];
}

function splitClassReqs(classNotesRaw) {
  const all = Array.isArray(classNotesRaw) ? classNotesRaw : [];
  const classNotes = all.filter((r) => r.details && String(r.details).trim());
  const otherInfos = all.filter((r) => !r.details || !String(r.details).trim());
  return { classNotes, otherInfos };
}

function showParentMessageEnabled(rec) {
  if (rec?.showParentMessage != null) return !!rec.showParentMessage;
  if (rec?.show_parent_message != null) return !!Number(rec.show_parent_message);
  return !!(String(rec?.parentMessage || rec?.parent_message || "").trim());
}

/** Header meta — class is large and prominent; year/term/level stay compact. */
function buildBabyeyiDocHeaderMetaHtml({ T, rec, levelLabel, classesArr }) {
  const metaItems = [[T.academicYear, rec.academicYear], [T.termLabel, rec.term], [T.levelLabel, levelLabel]];
  const metaHtml = metaItems
    .map(([l, v]) => `<span style="font-size:12px;color:#1e293b"><strong style="color:#1e3a5f">${esc(l)}:</strong> ${esc(v || "—")}</span>`)
    .join("");
  const docIdHtml = rec.docId
    ? `<span style="font-size:11px;font-family:monospace;font-weight:700;color:#3730a3;padding:1px 8px">${esc(rec.docId)}</span>`
    : "";
  const classHtml = buildBabyeyiDocumentClassHeaderHtml(classesArr, T.classLabel || "Class", esc);
  return `<div style="display:flex;flex-direction:column;align-items:center;gap:6px">${classHtml}<div style="display:flex;flex-wrap:wrap;gap:14px;align-items:center;justify-content:center">${metaHtml}${docIdHtml}</div></div>`;
}

function buildBabyeyiAuthBlockHtml({ T, rec, today, sigB64, stampB64, qrB64 }) {
  const qrBlock = qrB64
    ? `<div style="display:flex;flex-direction:column;align-items:center;gap:2px"><div style="background:white;border:1px solid #e2e8f0;padding:4px;border-radius:4px"><img src="${qrB64}" style="width:64px;height:64px;object-fit:contain;display:block"/></div><p style="font-size:9px;color:#1e3a5f;font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin:0">${esc(T.sigScanVerify)}</p>${rec.docId ? `<p style="font-size:9px;color:#64748b;font-family:monospace;margin:0">ID: ${esc(rec.docId)}</p>` : ""}</div>`
    : `<div style="width:64px;height:64px;border:1px dashed #e2e8f0;display:flex;align-items:center;justify-content:center"><span style="font-size:16px;opacity:.1">&#9635;</span></div>`;

  const footerLeft = T.docFooterLeft != null ? T.docFooterLeft : "Doc";

  return `<div id="babyeyi-pdf-auth-block" style="margin-top:14px;padding-top:4px;page-break-inside:avoid;break-inside:avoid;page-break-before:avoid;break-before:avoid;-webkit-column-break-inside:avoid">
    <div style="margin-bottom:10px">
      <div style="border-bottom:1.5px solid #1e3a5f;padding-bottom:4px;margin-bottom:8px">
        <span style="font-size:13px;font-weight:700;color:#1e3a5f;text-transform:uppercase;letter-spacing:0.05em">${esc(T.secAuth)}</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-top:8px">
        <div style="border:1px solid #e2e8f0;padding:10px 8px;text-align:center;min-height:96px;box-sizing:border-box">
          <p style="font-size:10px;color:#64748b;font-weight:600;text-transform:uppercase;margin:0 0 6px">${esc(T.sigHeadTeacher)}</p>
          <div style="height:44px;display:flex;align-items:flex-end;justify-content:center;padding-bottom:2px">${sigB64 ? `<img src="${sigB64}" style="max-height:40px;max-width:120px;object-fit:contain"/>` : `<div style="width:100%;height:1px;border-bottom:1px solid #cbd5e1"></div>`}</div>
          <p style="font-size:10px;color:#94a3b8;margin:2px 0 0">${sigB64 ? esc(T.sigSigned) : esc(T.sigRequired)}</p>
        </div>
        <div style="border:1px solid #e2e8f0;padding:10px 8px;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:96px;box-sizing:border-box">${qrBlock}</div>
        <div style="border:1px solid #e2e8f0;padding:10px 8px;text-align:center;min-height:96px;box-sizing:border-box">
          <p style="font-size:10px;color:#64748b;font-weight:600;text-transform:uppercase;margin:0 0 6px">${esc(T.sigStamp)}</p>
          <div style="width:64px;height:64px;border:1px dashed #e2e8f0;border-radius:50%;display:flex;align-items:center;justify-content:center;overflow:hidden;margin:0 auto 4px">${stampB64 ? `<img src="${stampB64}" style="width:60px;height:60px;object-fit:contain;border-radius:50%"/>` : `<span style="font-size:18px;opacity:.08">&#128271;</span>`}</div>
          <p style="font-size:10px;color:#94a3b8;margin:0">${esc(T.sigCachet)}</p>
        </div>
      </div>
    </div>
    <div style="border-top:1px solid #1e3a5f;padding:6px 40px;display:flex;justify-content:space-between;align-items:center">
      <span style="font-size:10px;color:#64748b">${esc(rec.schoolName || "")} · ${esc(rec.district || "")}</span>
      <span style="font-size:10px;color:#1e3a5f;font-weight:700;text-transform:uppercase">${esc(T.docOfficial)}</span>
      <span style="font-size:10px;color:#64748b">${esc(footerLeft)} ${esc(rec.docId || "")} · ${esc(today)}</span>
    </div>
    <div style="height:3px;background:#1e3a5f"></div>
  </div>`;
}

/**
 * @param {object} opts
 * @param {object} opts.rec
 * @param {number} opts.totalFee
 * @param {string} opts.today
 * @param {string|null} opts.schoolLogoB64
 * @param {string|null} opts.otherLogoB64
 * @param {string|null} opts.sigB64
 * @param {string|null} opts.stampB64
 * @param {string|null} opts.qrB64
 * @param {string} [opts.lang]
 * @param {object} [opts.T]
 * @param {string} [opts.parentMsgOverride]
 */
function buildBabyeyiDocHtml({
  rec,
  totalFee,
  today,
  schoolLogoB64,
  otherLogoB64,
  sigB64,
  stampB64,
  qrB64,
  lang = "en",
  T: TOverride,
  parentMsgOverride,
}) {
  const T = TOverride || getDocStrings(lang);
  const parentMsg = parentMsgOverride != null ? parentMsgOverride : (rec.parentMessage || "");
  const payments = Array.isArray(rec.payments) ? rec.payments : [];
  const { classNotes, otherInfos } = splitClassReqs(rec.classNotes);
  const reqs = Array.isArray(rec.requirements) ? rec.requirements : [];
  const leaders = Array.isArray(rec.leaders) ? rec.leaders : [];
  const extraOther = Array.isArray(rec.otherInfos) ? rec.otherInfos : [];
  const allOtherInfos = [...otherInfos, ...extraOther];
  const banks = parseBanks(rec);
  const classesArr = Array.isArray(rec.classes) && rec.classes.length ? rec.classes : [rec.class];
  const classLabel = formatBabyeyiDocumentClassLabel(classesArr);
  const levelLabel = rec.level || rec.education_level || "";

  const tblStyle = "width:100%;border-collapse:collapse;margin-top:8px";
  const thS = "padding:8px 12px;font-size:12px;font-weight:700;color:#1e3a5f;border-bottom:2px solid #1e3a5f;text-align:left;background:transparent";
  const tdS = "padding:7px 12px;font-size:12px;color:#1e293b;border-bottom:1px solid #e2e8f0;background:transparent";
  const hdg = (title) => `<div style="padding-bottom:4px;margin-bottom:8px;margin-top:12px"><span style="font-size:13px;font-weight:700;color:#1e3a5f;text-transform:uppercase;letter-spacing:0.05em">${esc(title)}</span></div>`;

  const parentSection = showParentMessageEnabled(rec) && parentMsg
    ? `<div data-babyeyi-pdf-section="parent" style="margin-bottom:14px">${hdg(T.parentMessageHeading)}<div style="padding-left:16px;margin-top:2px"><p style="font-size:12px;color:#1e293b;line-height:1.6;white-space:pre-line;margin:0">${esc(parentMsg)}</p></div></div>`
    : "";

  const payRows = payments.map((p, i) => `<tr><td style="${tdS};text-align:center;color:#64748b;width:42px">${i + 1}</td><td style="${tdS}">${esc(p.name || "")}</td><td style="${tdS};text-align:right;font-family:monospace;font-weight:600">${Number(p.amount || 0).toLocaleString()}</td></tr>`).join("");
  const paySection = payments.length > 0
    ? `<div data-babyeyi-pdf-section="fees" style="margin-bottom:14px">${hdg(T.secFee)}<table style="${tblStyle}"><thead><tr><th style="${thS};width:42px;text-align:center">${esc(T.thNo || "#")}</th><th style="${thS}">${esc(T.thPaymentItem)}</th><th style="${thS};text-align:right">${esc(T.thAmount)}</th></tr></thead><tbody>${payRows}</tbody><tfoot><tr><td colspan="2" style="padding:9px 12px;font-size:14px;font-weight:700;color:#1e3a5f;border-top:2px solid #1e3a5f">${esc(T.thTotalLabel)}</td><td style="padding:9px 12px;font-size:14px;font-weight:700;color:#1e3a5f;border-top:2px solid #1e3a5f;text-align:right;font-family:monospace">RWF ${totalFee.toLocaleString()}</td></tr></tfoot></table></div>`
    : "";

  const bankRows = banks.map((bk, i) => `<tr><td style="${tdS};text-align:center;color:#64748b;width:40px">${i + 1}</td><td style="${tdS};font-weight:600">${esc(bk.bankName || "—")}</td><td style="${tdS};font-family:monospace">${esc(bk.accountNumber || "—")}</td><td style="${tdS}">${esc(bk.accountName || "—")}</td><td style="${tdS};text-align:center;color:#059669;font-weight:700">${bk.isPrimary || i === 0 ? "✓" : ""}</td></tr>`).join("");
  const banksSection = banks.length > 0
    ? `<div data-babyeyi-pdf-section="banking" style="margin-bottom:14px">${hdg(T.secBanking)}<table style="${tblStyle}"><thead><tr><th style="${thS};width:40px;text-align:center">#</th><th style="${thS}">${esc(T.thBank || "Bank")}</th><th style="${thS}">${esc(T.thAccount || "Account")}</th><th style="${thS}">${esc(T.thAccountName || "Name")}</th><th style="${thS};text-align:center;width:70px">${esc(T.thPrimary || "Primary")}</th></tr></thead><tbody>${bankRows}</tbody></table></div>`
    : "";

  const reqRows = reqs.map((r, i) => `<tr><td style="${tdS};text-align:center;color:#64748b;width:42px">${i + 1}</td><td style="${tdS}">${esc((r && r.item) || r || "")}</td><td style="${tdS}">${esc((r && r.description) || "")}</td><td style="${tdS};text-align:center">${esc((r && r.quantity) || "")}</td></tr>`).join("");
  const reqSection = reqs.length > 0
    ? `<div data-babyeyi-pdf-section="requirements" style="margin-bottom:14px">${hdg(T.secRequirements)}<table style="${tblStyle}"><thead><tr><th style="${thS};width:42px;text-align:center">#</th><th style="${thS}">${esc(T.thItem || "Item")}</th><th style="${thS}">${esc(T.thDescription || "Description")}</th><th style="${thS};text-align:center;width:80px">${esc(T.thQuantity || "Qty")}</th></tr></thead><tbody>${reqRows}</tbody></table></div>`
    : "";

  const otherRows = allOtherInfos.map((n, i) => `<tr><td style="${tdS};text-align:center;color:#64748b;width:42px">${i + 1}</td><td style="${tdS};font-weight:600">${esc(n.item || "")}</td><td style="${tdS}">${esc(n.details || "")}</td></tr>`).join("");
  const otherSection = allOtherInfos.length > 0
    ? `<div data-babyeyi-pdf-section="other" style="margin-bottom:14px">${hdg(T.secOtherInfo)}<table style="${tblStyle}"><thead><tr><th style="${thS};width:42px;text-align:center">#</th><th style="${thS}">${esc(T.thItem || "Item")}</th><th style="${thS}">${esc(T.thDetails || "Details")}</th></tr></thead><tbody>${otherRows}</tbody></table></div>`
    : "";

  const leaderRows = leaders.map((l, i) => `<tr><td style="${tdS};text-align:center;color:#64748b;width:36px;font-size:11px">${i + 1}</td><td style="${tdS};font-weight:700;color:#1e3a5f">${esc(l.name || "—")}</td><td style="${tdS};color:#475569;font-style:italic">${esc(l.role || "—")}</td><td style="${tdS};font-family:monospace;font-size:11px">${l.phone ? esc(`+250 ${l.phone}`) : "—"}</td><td style="${tdS};font-size:11px;color:#2563eb">${esc(l.email || "—")}</td></tr>`).join("");
  const leadersSection = leaders.length > 0
    ? `<div data-babyeyi-pdf-section="leadership" style="margin-bottom:14px">${hdg(T.secLeadership)}<table style="${tblStyle}"><thead><tr><th style="${thS};width:36px;text-align:center">#</th><th style="${thS}">${esc(T.thFullName || "Full Name")}</th><th style="${thS}">${esc(T.thRole || "Role")}</th><th style="${thS}">${esc(T.thPhone || "Phone")}</th><th style="${thS}">${esc(T.thEmail || "Email")}</th></tr></thead><tbody>${leaderRows}</tbody></table></div>`
    : "";

  const noteRows = classNotes.map((n, i) => `<tr><td style="${tdS};text-align:center;color:#64748b;width:42px">${i + 1}</td><td style="${tdS};font-weight:600">${esc(n.item || "")}</td><td style="${tdS}">${esc(n.details || "—")}</td></tr>`).join("");
  const notesSection = classNotes.length > 0
    ? `<div data-babyeyi-pdf-section="notes" style="margin-bottom:14px">${hdg(T.secClassNotes)}<table style="${tblStyle}"><thead><tr><th style="${thS};width:42px;text-align:center">#</th><th style="${thS}">${esc(T.thItem || "Item")}</th><th style="${thS}">${esc(T.thDetails || "Details")}</th></tr></thead><tbody>${noteRows}</tbody></table></div>`
    : "";

  const schoolLogoHtml = schoolLogoB64
    ? `<img src="${schoolLogoB64}" style="width:110px;height:110px;object-fit:contain;display:block"/>`
    : `<div style="width:110px;height:110px;display:flex;align-items:center;justify-content:center;border:1px dashed #e2e8f0"><span style="font-size:8px;color:#64748b;text-align:center;font-weight:700">SCHOOL LOGO</span></div>`;
  const otherLogoHtml = otherLogoB64
    ? `<img src="${otherLogoB64}" style="width:80px;height:80px;object-fit:contain;display:block"/>`
    : "";

  const authBlock = buildBabyeyiAuthBlockHtml({ T, rec, today, sigB64, stampB64, qrB64 });

  const headerMeta = buildBabyeyiDocHeaderMetaHtml({ T, rec, levelLabel, classesArr });
  return wrapBabyeyiDocHtml(`<div id="babyeyi-pdf-header" style="padding:16px 40px 12px;border-bottom:2px solid #1e3a5f"><div style="display:flex;align-items:center;gap:20px"><div style="flex-shrink:0;width:110px;height:110px;border:1px solid #e2e8f0;display:flex;align-items:center;justify-content:center;overflow:hidden">${schoolLogoHtml}</div><div style="flex:1;text-align:center"><p style="font-size:10px;color:#64748b;margin:0 0 2px;letter-spacing:0.08em;text-transform:uppercase;font-weight:600">${esc(T.republic)}</p><p style="font-size:9px;color:#64748b;margin:0 0 2px">${esc(T.district)}: ${esc(rec.district || "—")}</p><p style="font-size:9px;color:#64748b;margin:0 0 6px">${esc(T.sector)}: ${esc(rec.sector || "—")}</p><h1 style="font-size:17px;font-weight:700;color:#1e3a5f;margin:0 0 4px;text-transform:uppercase;letter-spacing:.03em">${esc(rec.schoolName || "")}</h1>${headerMeta}</div><div style="flex-shrink:0;width:84px;height:84px;display:flex;align-items:center;justify-content:center;overflow:hidden">${otherLogoHtml}</div></div></div><div id="babyeyi-pdf-body" style="padding:16px 40px 20px">${parentSection}${paySection}${banksSection}${reqSection}${otherSection}${leadersSection}${notesSection}${authBlock}</div>`);
}

const PRINT_STYLES = `
  @page { size: A4; margin: 0; }
  html, body { margin: 0; padding: 0; background: #fff; color: #1e293b; }
  body { display: flex; justify-content: center; }
  #babyeyi-pdf-doc { width: 210mm; max-width: 100%; box-sizing: border-box; position: relative; }
  ${BABYEYI_DOC_FRAME_PRINT_CSS}
  /* Stay on same page as content when space allows — never force a new page */
  #babyeyi-pdf-auth-block {
    page-break-inside: avoid;
    break-inside: avoid;
    page-break-before: avoid;
    break-before: avoid;
  }
  [data-babyeyi-pdf-section] { page-break-inside: auto; break-inside: auto; }
  table { page-break-inside: auto; }
  tr { page-break-inside: avoid; page-break-after: auto; }
  thead { display: table-header-group; }
  img { max-width: 100%; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
`;

/**
 * Full HTML page for Puppeteer PDF or browser print.
 * @param {object} opts — same as buildBabyeyiDocHtml
 * @param {boolean} [opts.autoPrint]
 */
function buildBabyeyiPrintPageHtml(opts, { autoPrint = false } = {}) {
  const docHtml = buildBabyeyiDocHtml(opts);
  const printScript = autoPrint
    ? `<script>window.addEventListener('load',function(){setTimeout(function(){window.print();},400);});</script>`
    : "";
  return `<!DOCTYPE html>
<html lang="${esc(opts.lang || "en")}">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Babyeyi ${esc(opts.rec?.docId || "")}</title>
<style>${PRINT_STYLES}</style>
</head>
<body>
${docHtml}
${printScript}
</body>
</html>`;
}

module.exports = {
  esc,
  parseBanks,
  splitClassReqs,
  showParentMessageEnabled,
  buildBabyeyiDocHeaderMetaHtml,
  buildBabyeyiDocHtml,
  buildBabyeyiAuthBlockHtml,
  buildBabyeyiPrintPageHtml,
};
