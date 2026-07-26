// ================================================================
// BabyeyiList.jsx — v12 redesign
// #000435 navy + amber-400 · MTN font · Tailwind only · Mobile-first
// ================================================================

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { CreateBabyeyiModal } from "./UpdateBabyeyi";
import { parseTranslationsJson } from '../../schoolLiteSupport/utils/applyBabyeyiTranslations';
import { getLegacyBabyeyiUI, getParentMessageForDisplay, getParentMessageForMachineTranslation, getStatusLabelSafe } from '../../schoolLiteSupport/i18n/index.js';
import { BABYEYI_AUTO_LANG_OPTIONS, isCoreBabyeyiLang, normalizeBabyeyiLang } from '../../schoolLiteSupport/babyeyiTranslateLangs.js';
import { useBabyeyiUiT } from '../../schoolLiteSupport/hooks/useBabyeyiUiT.js';
import { translateLongText, translateWithLingvaCached } from '../../schoolLiteSupport/lib/lingvaTranslate.js';
import { API_BASE, SERVER_BASE as ASSET_BASE, babyeyiVerifyScanUrl } from '../../lib/schoolLiteApi';
import { renderBabyeyiPdfFromRoot, buildBabyeyiAuthBlockHtml, BABYEYI_PDF_CAPTURE_HOST_STYLE } from './babyeyiPdfExport';
import {
  uniqueClassGradesFromLabels,
  formatBabyeyiDocumentClassLabel,
  buildBabyeyiDocumentClassHeaderHtml,
} from '../../../utils/classStreamGroups';
import { wrapBabyeyiDocHtml } from './babyeyiDocFrame';
import BabyeyiDocFrame from './babyeyiDocFrameView.jsx';

export { addCanvasToPdfAndSave, renderBabyeyiPdfFromRoot } from './babyeyiPdfExport';
import {
  Eye,
  Pencil,
  Lock,
  Trash2,
  ClipboardList,
  X,
  SlidersHorizontal,
  CircleCheck,
  Info,
  CircleX,
  QrCode,
  ChevronDown,
  Search,
  FileText,
  RefreshCw,
  Check,
  Printer,
  Stamp as StampLucide,
} from 'lucide-react';

const FONT = `"MTN Brighter Sans","Nunito","Varela Round",sans-serif`;
/** Apply ensureQRCode result to state (client data URL or server PNG). */
export async function applyQrToState(result, setQrB64, setVUrl) {
  if (!result) return;
  if (result.qrDataUrl) {
    setQrB64(result.qrDataUrl);
    setVUrl(result.vUrl);
  } else if (result.qrUrl) {
    const b64 = await toBase64(toAssetUrl(result.qrUrl));
    setQrB64(b64);
    setVUrl(result.vUrl);
  }
}

// ── QR helpers ────────────────────────────────────────────────
export async function ensureQRCode(rec) {
  if (!rec?.id) return null;
  const vUrlFallback = babyeyiVerifyScanUrl(rec.docId, rec.integrityHash);
  if (rec.docId) {
    try {
      const scanUrl = babyeyiVerifyScanUrl(rec.docId, rec.integrityHash);
      const QRCode = (await import("qrcode")).default;
      const qrDataUrl = await QRCode.toDataURL(scanUrl, {
        errorCorrectionLevel: "M",
        width: 240,
        margin: 1,
        color: { dark: "#0f172a", light: "#ffffff" },
      });
      return { qrDataUrl, vUrl: scanUrl };
    } catch (e) {
      console.warn("[ensureQRCode] client QR:", e?.message || e);
    }
  }
  try {
    const res = await fetch(`${API_BASE}/babyeyi/${rec.id}/qrcode`, { credentials: "include" });
    const json = await res.json();
    if (json.success && json.data?.qr_code_url) {
      return {
        qrUrl: json.data.qr_code_url,
        vUrl: json.data.qr_view_url || vUrlFallback,
      };
    }
  } catch {}
  try {
    const res = await fetch(`${API_BASE}/babyeyi/${rec.id}/regenerate-docs`, { method: "POST", credentials: "include" });
    const json = await res.json();
    if (json.success) {
      const qrRes = await fetch(`${API_BASE}/babyeyi/${rec.id}/qrcode`, { credentials: "include" });
      const qrJson = await qrRes.json();
      if (qrJson.success && qrJson.data?.qr_code_url) {
        return {
          qrUrl: qrJson.data.qr_code_url,
          vUrl: qrJson.data.qr_view_url || vUrlFallback,
        };
      }
    }
  } catch {}
  return null;
}

/** `session.userRole` values allowed to PATCH Kinyarwanda `content_i18n` (extend if your API uses other codes). */
const BABYEYI_RW_EDITOR_ROLE_CODES = new Set([
  "MANAGER",
  "SCHOOL_MANAGER",
  // Pro manager portal: PORTAL_ROLES.manager = SCHOOL_ADMIN + SCHOOL_MANAGER
  "SCHOOL_ADMIN",
  "HEAD_TEACHER",
  "DIRECTOR",
  "PRINCIPAL",
  "ADMIN",
  "SUPER_ADMIN",
]);

function normalizeSessionRoleCode(raw) {
  return String(raw ?? "")
    .trim()
    .toUpperCase()
    .replace(/-/g, "_")
    .replace(/\s+/g, "_");
}

/** @param {{ schoolId?: unknown, userRole?: string | null } | null | undefined} session */
export function canSessionEditKinyarwandaRw(session) {
  if (!session?.schoolId) return false;
  const code = normalizeSessionRoleCode(session.userRole);
  if (!code) return true;
  return BABYEYI_RW_EDITOR_ROLE_CODES.has(code);
}

// ── Language picker (official JSON + Lingva machine translate) ─
const CORE_LANG_OPTIONS = [
  { code: "en", flag: "🇬🇧", name: "English" },
  { code: "rw", flag: "🇷🇼", name: "Kinyarwanda" },
  { code: "fr", flag: "🇫🇷", name: "Français" },
];
const ALL_LANG_OPTIONS = [...CORE_LANG_OPTIONS, ...BABYEYI_AUTO_LANG_OPTIONS];
function langMeta(code) {
  const n = normalizeBabyeyiLang(code);
  return ALL_LANG_OPTIONS.find((x) => x.code === n) || { code: n, flag: "🌐", name: String(n || "en").toUpperCase() };
}

// ── Shared helpers ────────────────────────────────────────────
const toAssetUrl = (path) => {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${ASSET_BASE}${path.replace(/\\/g, "/").replace(/^\/?/, "/")}`;
};

async function toBase64(url) {
  if (!url) return null;
  try {
    const abs = url.startsWith("http") ? url : `${ASSET_BASE}${url.startsWith("/") ? "" : "/"}${url}`;
    const res = await fetch(abs, { credentials: "include" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise(r => { const fr = new FileReader(); fr.onloadend = () => r(fr.result); fr.readAsDataURL(blob); });
  } catch { return null; }
}

export async function downloadBabyeyiServerPdf({ babyeyiId, apiLang = "en", fileName, onRegenerate }) {
  const pdfUrl = `${API_BASE}/babyeyi/${babyeyiId}/pdf?download=1&lang=${encodeURIComponent(apiLang)}`;
  let res = await fetch(pdfUrl, { credentials: "include" });
  if (!res.ok) {
    if (onRegenerate) await onRegenerate();
    else {
      await fetch(`${API_BASE}/babyeyi/${babyeyiId}/regenerate-docs?lang=${encodeURIComponent(apiLang)}`, {
        method: "POST",
        credentials: "include",
      });
    }
    res = await fetch(pdfUrl, { credentials: "include" });
  }
  if (!res.ok) throw new Error("PDF not ready — try Regenerate, then download again.");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName || "Babyeyi.pdf";
  a.click();
  URL.revokeObjectURL(url);
}

/** WYSIWYG PDF — captures the same HTML shown in the View modal (not legacy PDFKit). */
export async function downloadBabyeyiClientPdf({ rootEl, fileName }) {
  if (!rootEl) throw new Error("Document not ready — open View first.");
  await loadScript("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js");
  await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");
  await renderBabyeyiPdfFromRoot(rootEl, null, fileName, babyeyiDocHtml2CanvasOptions());
}

export function openBabyeyiPrintPage({ babyeyiId, apiLang = "en" }) {
  const printUrl = `${API_BASE}/babyeyi/${babyeyiId}/print?lang=${encodeURIComponent(apiLang)}&autoprint=1`;
  window.open(printUrl, "_blank", "noopener,noreferrer");
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement("script"); s.src = src; s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });
}

/** html2canvas: force light white document (no UI chrome / dark-mode tint); matches on-screen View. */
export function babyeyiDocHtml2CanvasOptions(rootId) {
  return {
    scale: 3,
    useCORS: true,
    allowTaint: false,
    backgroundColor: "#ffffff",
    logging: false,
    windowWidth: 794,
    onclone: (doc) => {
      doc.documentElement.style.backgroundColor = "#ffffff";
      doc.body.style.backgroundColor = "#ffffff";
      doc.querySelectorAll("button").forEach((btn) => {
        btn.style.display = "none";
      });
      if (rootId) {
        const el = doc.getElementById(rootId);
        if (el) {
          el.style.backgroundColor = "#ffffff";
          el.style.color = "#1e293b";
        }
      }
    },
  };
}

function parseBanks(rec) {
  if (rec.banksJson) { try { const raw = typeof rec.banksJson === "string" ? JSON.parse(rec.banksJson) : rec.banksJson; if (Array.isArray(raw) && raw.length) return raw; } catch {} }
  if (rec.bankName) return [{ bankName: rec.bankName, accountNumber: rec.bankAccountNo || "", accountName: rec.bankAccountName || "", isPrimary: true }];
  return [];
}

// ── Doc HTML builder (re-exported for BabyeyiPdf.jsx) ────────
const DOC = {
  heading: { fontSize:"14px", fontWeight:700, color:"#1e3a5f", textTransform:"uppercase", letterSpacing:"0.05em" },
  body:    { fontSize:"12px", color:"#1e293b", lineHeight:"1.7" },
  label:   { fontSize:"12px", color:"#64748b", fontWeight:600 },
  th:      { padding:"8px 12px", fontSize:"12px", fontWeight:700, color:"#1e3a5f", borderBottom:"2px solid #1e3a5f", textAlign:"left", background:"transparent" },
  td:      { padding:"7px 12px", fontSize:"12px", color:"#1e293b", borderBottom:"1px solid #e2e8f0", background:"transparent" },
  section: { marginBottom:"22px" },
};

const STATUS_CFG = {
  approved:    { label:"Approved",    bg:"bg-amber-50",  text:"text-[#000435]", dot:"bg-amber-500", border:"border-amber-200" },
  pending:     { label:"Pending",     bg:"bg-amber-50",  text:"text-[#000435]", dot:"bg-amber-500", border:"border-amber-200" },
  recommended: { label:"Recommended", bg:"bg-amber-50",  text:"text-[#000435]", dot:"bg-amber-500", border:"border-amber-200" },
  rejected:    { label:"Rejected",    bg:"bg-amber-50",  text:"text-[#000435]", dot:"bg-amber-500", border:"border-amber-200" },
  draft:       { label:"Draft",       bg:"bg-amber-50",  text:"text-[#000435]", dot:"bg-amber-500", border:"border-amber-200" },
  submitted:   { label:"Submitted",   bg:"bg-amber-50",  text:"text-[#000435]", dot:"bg-amber-500", border:"border-amber-200" },
};

const BLOCKED_STATUSES = new Set(["pending","draft","submitted"]);
const isBlocked = (s) => BLOCKED_STATUSES.has(s);

function BabyeyiClassChips({ labels, max = 6, size = "sm" }) {
  const grades = uniqueClassGradesFromLabels(labels);
  const shown = grades.slice(0, max);
  const extra = grades.length - shown.length;
  const chipCls =
    size === "md"
      ? "inline-flex px-2.5 py-1 rounded-full bg-[#eff6ff] border border-[#bfdbfe] text-[11px] font-bold text-[#1e3a5f]"
      : "inline-flex px-2 py-0.5 rounded-full bg-[#eff6ff] border border-[#bfdbfe] text-[10px] font-bold text-[#1e3a5f]";
  if (!grades.length) return <span className="text-slate-400 text-[10px]">—</span>;
  return (
    <div className="flex flex-wrap gap-1 justify-center">
      {shown.map((g) => (
        <span key={g} className={chipCls}>{g}</span>
      ))}
      {extra > 0 && <span className="text-[10px] font-semibold text-slate-500 self-center">+{extra}</span>}
    </div>
  );
}

export function buildWordDocHTML({ rec, totalFee, today, schoolLogoB64, otherLogoB64, sigB64, stampB64, qrB64, vUrl, lang = "en", T: TOverride, parentMsgOverride }) {
  const T = TOverride || getLegacyBabyeyiUI(lang);
  const parentMsg = parentMsgOverride != null ? parentMsgOverride : getParentMessageForDisplay(rec, lang, T);
  const payments = Array.isArray(rec.payments) ? rec.payments : [];
  const classNotes = Array.isArray(rec.classNotes) ? rec.classNotes : [];
  const reqs = Array.isArray(rec.requirements) ? rec.requirements : [];
  const otherInfos = Array.isArray(rec.otherInfos) ? rec.otherInfos : [];
  const leaders = Array.isArray(rec.leaders) ? rec.leaders : [];
  const banks = parseBanks(rec);
  const classesArr = Array.isArray(rec.classes) && rec.classes.length ? rec.classes : [rec.class];
  const classLabel = formatBabyeyiDocumentClassLabel(classesArr);
  const classHeaderHtml = buildBabyeyiDocumentClassHeaderHtml(classesArr, T.classLabel || "Class");
  const levelLabel = rec.level || rec.education_level || "";
  const metaHtml = [[T.academicYear, rec.academicYear], [T.termLabel, rec.term], [T.levelLabel, levelLabel]]
    .map(([l, v]) => `<span style="font-size:12px;color:#1e293b"><strong style="color:#1e3a5f">${l}:</strong> ${v || "—"}</span>`)
    .join("");
  const tblStyle = `width:100%;border-collapse:collapse;margin-top:8px`;
  const thS = `padding:8px 12px;font-size:12px;font-weight:700;color:#1e3a5f;border-bottom:2px solid #1e3a5f;text-align:left;background:transparent`;
  const tdS = `padding:7px 12px;font-size:12px;color:#1e293b;border-bottom:1px solid #e2e8f0;background:transparent`;
  const hdg = (title) => `<div style="padding-bottom:5px;margin-bottom:12px;margin-top:20px"><span style="font-size:14px;font-weight:700;color:#1e3a5f;text-transform:uppercase;letter-spacing:0.05em">${title}</span></div>`;

  const parentSection = parentMsg ? `<div data-babyeyi-pdf-section="parent" style="margin-bottom:22px">${hdg(T.parentMessageHeading)}<div style="padding-left:16px;margin-top:4px"><p style="font-size:12px;color:#1e293b;line-height:1.7;white-space:pre-line;margin:0">${parentMsg}</p></div></div>` : "";
  const payRows = payments.map((p,i) => `<tr><td style="${tdS};text-align:center;color:#64748b;width:42px">${i+1}</td><td style="${tdS}">${p.name||""}</td><td style="${tdS};text-align:right;font-family:monospace;font-weight:600">${Number(p.amount||0).toLocaleString()}</td></tr>`).join("");
  const paySection = payments.length > 0 ? `<div data-babyeyi-pdf-section="fees" style="margin-bottom:22px">${hdg(T.secFee)}<table style="${tblStyle}"><thead><tr><th style="${thS};width:42px;text-align:center">${T.thNo}</th><th style="${thS}">${T.thPaymentItem}</th><th style="${thS};text-align:right">${T.thAmount}</th></tr></thead><tbody>${payRows}</tbody><tfoot><tr><td colspan="2" style="padding:9px 12px;font-size:14px;font-weight:700;color:#1e3a5f;border-top:2px solid #1e3a5f">${T.thTotalLabel}</td><td style="padding:9px 12px;font-size:14px;font-weight:700;color:#1e3a5f;border-top:2px solid #1e3a5f;text-align:right;font-family:monospace">RWF ${totalFee.toLocaleString()}</td></tr></tfoot></table></div>` : "";
  const bankRows = banks.map((bk,i) => `<tr><td style="${tdS};text-align:center;color:#64748b;width:40px">${i+1}</td><td style="${tdS};font-weight:600">${bk.bankName||"—"}</td><td style="${tdS};font-family:monospace">${bk.accountNumber||"—"}</td><td style="${tdS}">${bk.accountName||"—"}</td><td style="${tdS};text-align:center;color:#059669;font-weight:700">${bk.isPrimary||i===0?"✓":""}</td></tr>`).join("");
  const banksSection = banks.length > 0 ? `<div data-babyeyi-pdf-section="banking" style="margin-bottom:22px">${hdg(T.secBanking)}<table style="${tblStyle}"><thead><tr><th style="${thS};width:40px;text-align:center">#</th><th style="${thS}">Bank</th><th style="${thS}">Account</th><th style="${thS}">Name</th><th style="${thS};text-align:center;width:70px">Primary</th></tr></thead><tbody>${bankRows}</tbody></table></div>` : "";
  const reqRows = reqs.map((r,i) => `<tr><td style="${tdS};text-align:center;color:#64748b;width:42px">${i+1}</td><td style="${tdS}">${(r&&r.item)||r||""}</td><td style="${tdS}">${(r&&r.description)||""}</td><td style="${tdS};text-align:center">${(r&&r.quantity)||""}</td></tr>`).join("");
  const reqSection = reqs.length > 0 ? `<div data-babyeyi-pdf-section="requirements" style="margin-bottom:22px">${hdg(T.secRequirements)}<table style="${tblStyle}"><thead><tr><th style="${thS};width:42px;text-align:center">#</th><th style="${thS}">Item</th><th style="${thS}">Description</th><th style="${thS};text-align:center;width:80px">Qty</th></tr></thead><tbody>${reqRows}</tbody></table></div>` : "";
  const otherRows = otherInfos.map((n,i) => `<tr><td style="${tdS};text-align:center;color:#64748b;width:42px">${i+1}</td><td style="${tdS};font-weight:600">${n.item||""}</td><td style="${tdS}">${n.details||""}</td></tr>`).join("");
  const otherSection = otherInfos.length > 0 ? `<div data-babyeyi-pdf-section="other" style="margin-bottom:22px">${hdg(T.secOtherInfo)}<table style="${tblStyle}"><thead><tr><th style="${thS};width:42px;text-align:center">#</th><th style="${thS}">Item</th><th style="${thS}">Details</th></tr></thead><tbody>${otherRows}</tbody></table></div>` : "";
  const leaderRows = leaders.map((l,i) => `<tr><td style="${tdS};text-align:center;color:#64748b;width:36px;font-size:11px">${i+1}</td><td style="${tdS};font-weight:700;color:#1e3a5f">${l.name||"—"}</td><td style="${tdS};color:#475569;font-style:italic">${l.role||"—"}</td><td style="${tdS};font-family:monospace;font-size:11px">${l.phone?`+250 ${l.phone}`:"—"}</td><td style="${tdS};font-size:11px;color:#2563eb">${l.email||"—"}</td></tr>`).join("");
  const leadersSection = leaders.length > 0 ? `<div data-babyeyi-pdf-section="leadership" style="margin-bottom:22px">${hdg(T.secLeadership)}<table style="${tblStyle}"><thead><tr><th style="${thS};width:36px;text-align:center">#</th><th style="${thS}">Full Name</th><th style="${thS}">Role</th><th style="${thS}">Phone</th><th style="${thS}">Email</th></tr></thead><tbody>${leaderRows}</tbody></table></div>` : "";
  const noteRows = classNotes.map((n,i) => `<tr><td style="${tdS};text-align:center;color:#64748b;width:42px">${i+1}</td><td style="${tdS};font-weight:600">${n.item||""}</td><td style="${tdS}">${n.details||"—"}</td></tr>`).join("");
  const notesSection = classNotes.length > 0 ? `<div data-babyeyi-pdf-section="notes" style="margin-bottom:22px">${hdg(T.secClassNotes)}<table style="${tblStyle}"><thead><tr><th style="${thS};width:42px;text-align:center">#</th><th style="${thS}">Item</th><th style="${thS}">Details</th></tr></thead><tbody>${noteRows}</tbody></table></div>` : "";
  const schoolLogoHtml = schoolLogoB64 ? `<img src="${schoolLogoB64}" style="width:110px;height:110px;object-fit:contain;display:block"/>` : `<div style="width:110px;height:110px;display:flex;align-items:center;justify-content:center;border:1px dashed #e2e8f0"><span style="font-size:8px;color:#64748b;text-align:center;font-weight:700">SCHOOL LOGO</span></div>`;
  const otherLogoHtml = otherLogoB64 ? `<img src="${otherLogoB64}" style="width:80px;height:80px;object-fit:contain;display:block"/>` : "";
  const authBlock = buildBabyeyiAuthBlockHtml({ T, rec, today, sigB64, stampB64, qrB64 });
  return wrapBabyeyiDocHtml(`<div id="babyeyi-pdf-header" style="padding:20px 40px 16px;border-bottom:2px solid #1e3a5f"><div style="display:flex;align-items:center;gap:20px"><div style="flex-shrink:0;width:110px;height:110px;border:1px solid #e2e8f0;display:flex;align-items:center;justify-content:center;overflow:hidden">${schoolLogoHtml}</div><div style="flex-1;text-align:center"><p style="font-size:10px;color:#64748b;margin:0 0 2px;letter-spacing:0.08em;text-transform:uppercase;font-weight:600">${T.republic}</p><p style="font-size:9px;color:#64748b;margin:0 0 2px">${T.district}: ${rec.district||"—"}</p><p style="font-size:9px;color:#64748b;margin:0 0 6px">${T.sector}: ${rec.sector||"—"}</p><h1 style="font-size:17px;font-weight:700;color:#1e3a5f;margin:0 0 4px;text-transform:uppercase;letter-spacing:.03em">${rec.schoolName||""}</h1>${classHeaderHtml}<div style="display:flex;flex-wrap:wrap;gap:14px;align-items:center;justify-content:center;margin-top:6px">${metaHtml}${rec.docId?`<span style="font-size:11px;font-family:monospace;font-weight:700;color:#3730a3;padding:1px 8px">${rec.docId}</span>`:""}</div></div><div style="flex-shrink:0;width:84px;height:84px;display:flex;align-items:center;justify-content:center;overflow:hidden">${otherLogoHtml}</div></div></div><div id="babyeyi-pdf-body" style="padding:20px 40px 28px">${parentSection}${paySection}${banksSection}${reqSection}${otherSection}${leadersSection}${notesSection}${authBlock}</div>`);
}

// ── Capture doc image ─────────────────────────────────────────
async function captureDocAsImage({ rec, schoolLogoB64, otherLogoB64, sigB64, stampB64, qrB64, vUrl, lang = "en", T, parentMsgOverride }) {
  await loadScript("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js");
  const payments = Array.isArray(rec.payments) ? rec.payments : [];
  const totalFee = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
  const today = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  const html = buildWordDocHTML({ rec, totalFee, today, schoolLogoB64, otherLogoB64, sigB64, stampB64, qrB64, vUrl, lang, T, parentMsgOverride });
  const style = document.createElement("style");
  style.textContent = `#__by_c__ * { box-sizing:border-box; color-scheme:light only; } #__by_c__ { all:initial;display:block;background:#fff; }`;
  document.head.appendChild(style);
  const host = document.createElement("div");
  host.style.cssText = BABYEYI_PDF_CAPTURE_HOST_STYLE;
  const root = document.createElement("div"); root.id = "__by_c__"; root.innerHTML = html;
  host.appendChild(root); document.body.appendChild(host);
  try {
    await new Promise(r => setTimeout(r, 500));
    const canvas = await window.html2canvas(root, babyeyiDocHtml2CanvasOptions("__by_c__"));
    return canvas.toDataURL("image/jpeg", 0.95);
  } finally { document.body.removeChild(host); document.head.removeChild(style); }
}

async function patchRwContentI18n(babyeyiId, body) {
  const res = await fetch(`${API_BASE}/babyeyi/${babyeyiId}/content-i18n/rw`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) throw new Error(json.message || "Save failed");
  return json;
}

// ── Language switcher ─────────────────────────────────────────
function LangSwitcher({ lang, setLang, compact = false, mtLoading = false, moreHint, searchPlaceholder = "Search language…" }) {
  const [open, setOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const ref = useRef(null);
  useEffect(() => {
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);
  useEffect(() => { if (!open) setSearchQ(""); }, [open]);
  const current = langMeta(lang);
  const q = searchQ.trim().toLowerCase();
  const match = (opt) =>
    !q || `${opt.name} ${opt.code}`.toLowerCase().includes(q);
  const coreFiltered = CORE_LANG_OPTIONS.filter(match);
  const autoFiltered = BABYEYI_AUTO_LANG_OPTIONS.filter(match);
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-[12px] font-semibold transition-all border ${
          open ? "bg-amber-400 text-[#000435] border-amber-400" : "bg-white/8 text-white border-white/15 hover:bg-white/14"
        }`}
        style={{ fontFamily: FONT }}>
        {mtLoading ? (
          <span className="w-3.5 h-3.5 border-2 border-white/25 border-t-amber-400 rounded-full animate-spin shrink-0" />
        ) : (
          <span className="text-[13px]">{current.flag}</span>
        )}
        <span className="inline max-w-[90px] truncate">{current.code}</span>
        <span className="hidden md:inline max-w-[140px] truncate">{current.name}</span>
        <ChevronDown className="w-2 h-2 shrink-0 opacity-70" aria-hidden strokeWidth={3} />
      </button>
      {open && (
        <div className="absolute top-full mt-1.5 left-1/2 -translate-x-1/2 sm:left-auto sm:right-0 sm:translate-x-0 rounded-2xl shadow-sm z-[90] w-[min(100vw-1rem,340px)] sm:w-[min(100vw-2rem,320px)] flex flex-col bg-[#000435] border border-amber-400/30 max-h-[min(72vh,460px)]">
          <div className="p-2 border-b border-white/10 shrink-0 sticky top-0 bg-[#000435] rounded-t-2xl">
            <input
              type="search"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full px-3 py-2 rounded-xl bg-white/8 border border-white/15 text-[12px] text-white placeholder:text-white/35 outline-none focus:border-amber-400/50"
              style={{ fontFamily: FONT }}
              autoFocus
            />
          </div>
          <div className="overflow-y-auto flex-1 min-h-0 py-1">
            {coreFiltered.map((l) => (
              <button type="button" key={l.code} onClick={() => { setLang(l.code); setOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-[12px] font-bold transition-all text-left ${
                  lang === l.code ? "bg-amber-400/15 text-amber-400" : "text-white/70 hover:bg-white/8"
                }`} style={{ fontFamily: FONT }}>
                <span className="text-[14px]">{l.flag}</span>
                <span className="flex-1 min-w-0"><span className="font-mono text-[10px] text-white/40 mr-1">{l.code}</span>{l.name}</span>
                {lang === l.code && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />}
              </button>
            ))}
            {moreHint && autoFiltered.length > 0 && (
              <p className="px-4 pt-2 pb-1 text-[9px] font-semibold uppercase tracking-widest text-white/30 border-t border-white/10">{moreHint}</p>
            )}
            {autoFiltered.map((l) => (
              <button type="button" key={l.code} onClick={() => { setLang(l.code); setOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-4 py-2 text-[11px] font-bold transition-all text-left ${
                  lang === l.code ? "bg-amber-400/15 text-amber-400" : "text-white/60 hover:bg-white/8"
                }`} style={{ fontFamily: FONT }}>
                <span className="text-[13px]">{l.flag}</span>
                <span className="flex-1 min-w-0"><span className="font-mono text-[10px] text-white/40 mr-1">{l.code}</span>{l.name}</span>
                {lang === l.code && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />}
              </button>
            ))}
            {q && coreFiltered.length === 0 && autoFiltered.length === 0 && (
              <p className="px-4 py-6 text-center text-[11px] text-white/40 font-bold">No matches</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Best-effort single-string MT; keeps original English if Lingva fails. */
async function safeTranslateString(text, source, target) {
  const s = String(text ?? "").trim();
  if (!s) return text;
  try {
    return await translateWithLingvaCached(s, source, target);
  } catch {
    return text;
  }
}

async function safeTranslateLong(text, source, target) {
  const s = String(text ?? "").trim();
  if (!s) return "";
  try {
    return await translateLongText(s, source, target);
  } catch {
    return s;
  }
}

/** Machine-translate dynamic document fields (parent letter, fees, tables) for non-core languages. */
function useMachineDocBody(lang, rec) {
  const [state, setState] = useState(() => ({
    parentMsg: getParentMessageForMachineTranslation(rec, lang),
    merged: rec,
    banks: parseBanks(rec),
    busy: false,
  }));

  useEffect(() => {
    const pm0 = getParentMessageForMachineTranslation(rec, lang);
    if (isCoreBabyeyiLang(lang)) {
      setState({ parentMsg: pm0, merged: rec, banks: parseBanks(rec), busy: false });
      return;
    }
    let cancelled = false;
    setState((s) => ({ ...s, busy: true }));
    (async () => {
      try {
        const parentMsg = pm0.trim() ? await safeTranslateLong(pm0, "en", lang) : "";
        const payments = await Promise.all(
          (rec.payments || []).map(async (p) => ({
            ...p,
            name: p.name ? await safeTranslateString(String(p.name), "en", lang) : p.name,
          }))
        );
        const requirements = await Promise.all(
          (rec.requirements || []).map(async (r) => ({
            ...r,
            item: r.item ? await safeTranslateString(String(r.item), "en", lang) : r.item,
            description: r.description ? await safeTranslateString(String(r.description), "en", lang) : r.description,
          }))
        );
        const otherInfos = await Promise.all(
          (rec.otherInfos || []).map(async (n) => ({
            ...n,
            item: n.item ? await safeTranslateString(String(n.item), "en", lang) : n.item,
            details: n.details ? await safeTranslateString(String(n.details), "en", lang) : n.details,
          }))
        );
        const classNotes = await Promise.all(
          (rec.classNotes || []).map(async (n) => ({
            ...n,
            item: n.item ? await safeTranslateString(String(n.item), "en", lang) : n.item,
            details: n.details ? await safeTranslateString(String(n.details), "en", lang) : n.details,
          }))
        );
        const leaders = await Promise.all(
          (rec.leaders || []).map(async (l) => ({
            ...l,
            name: l.name ? await safeTranslateString(String(l.name), "en", lang) : l.name,
            role: l.role ? await safeTranslateString(String(l.role), "en", lang) : l.role,
          }))
        );
        const br = parseBanks(rec);
        const banks = await Promise.all(
          br.map(async (bk) => ({
            ...bk,
            bankName:
              bk.bankName && String(bk.bankName).trim() && bk.bankName !== "—"
                ? await safeTranslateString(String(bk.bankName), "en", lang)
                : bk.bankName,
            accountName:
              bk.accountName && String(bk.accountName).trim() && bk.accountName !== "—"
                ? await safeTranslateString(String(bk.accountName), "en", lang)
                : bk.accountName,
          }))
        );
        const merged = {
          ...rec,
          payments,
          requirements,
          otherInfos,
          classNotes,
          leaders,
          banksJson: JSON.stringify(banks),
        };
        if (!cancelled) setState({ parentMsg, merged, banks, busy: false });
      } catch {
        if (!cancelled) setState({ parentMsg: pm0, merged: rec, banks: parseBanks(rec), busy: false });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lang, rec]);

  return state;
}

// ── Share modal ───────────────────────────────────────────────
function ShareModal({ rec, onClose, schoolLogoB64, otherLogoB64, sigB64, stampB64, qrB64, vUrl, lang = "en", T, parentMsgOverride }) {
  const [step, setStep] = useState("capturing");
  const [imgUrl, setImgUrl] = useState(null);
  const [errMsg, setErrMsg] = useState(null);
  const shareVerifyUrl = vUrl || babyeyiVerifyScanUrl(rec.docId, rec.integrityHash);

  useEffect(() => {
    setStep("capturing");
    setImgUrl(null);
    setErrMsg(null);
    captureDocAsImage({
      rec,
      schoolLogoB64,
      otherLogoB64,
      sigB64,
      stampB64,
      qrB64,
      vUrl: shareVerifyUrl,
      lang,
      T,
      parentMsgOverride,
    })
      .then(url => { setImgUrl(url); setStep("ready"); })
      .catch(e => { setErrMsg(e.message); setStep("error"); });
  }, [rec.id, shareVerifyUrl, lang, T, schoolLogoB64, otherLogoB64, sigB64, stampB64, qrB64, parentMsgOverride]);

  const downloadImage = () => {
    if (!imgUrl) return;
    const a = document.createElement("a");
    a.href = imgUrl;
    a.download = `Babyeyi-${rec.docId || rec.class}-${rec.term}.jpg`;
    a.click();
  };

  const shareWhatsApp = async () => {
    if (!imgUrl || step !== "ready") return;
    const res = await fetch(imgUrl);
    const blob = await res.blob();
    const file = new File([blob], `Babyeyi-${rec.docId || rec.id}.jpg`, { type: "image/jpeg" });
    const caption = `Verify: ${shareVerifyUrl}`;
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: "Babyeyi Document", text: caption }); return; } catch (e) { if (e.name === "AbortError") return; }
    }
    downloadImage();
    setTimeout(() => window.open(`https://wa.me/?text=${encodeURIComponent(caption)}`, "_blank"), 700);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm">
      <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-sm bg-[#000435] border-2 border-amber-400/30 flex flex-col max-h-[92vh]" style={{ fontFamily: FONT }}>
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between shrink-0 bg-[#000435]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-400/15 flex items-center justify-center text-xl">📤</div>
            <div>
              <p className="font-semibold text-white text-[14px]">{T.shareDoc || "Share Document"}</p>
              <p className="text-[10px] text-white/40">{rec.class} · {rec.docId || rec.id} · {langMeta(lang).flag}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/8 border border-white/15 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/14">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          <div className="rounded-2xl overflow-hidden border border-white/10 bg-white/4 min-h-[120px] flex items-center justify-center">
            {step === "capturing" && (
              <div className="text-center p-6">
                <div className="w-8 h-8 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin mx-auto mb-3" />
                <p className="text-white/50 text-[12px]">{T.capturing || "Rendering document…"}</p>
              </div>
            )}
            {step === "error" && (
              <p className="text-red-400 text-[12px] text-center p-4 flex items-center justify-center gap-2">
                <CircleX className="w-4 h-4 shrink-0" strokeWidth={2.5} aria-hidden />
                {errMsg}
              </p>
            )}
            {step === "ready" && imgUrl && (
              <img src={imgUrl} className="w-full max-h-[250px] object-cover object-top" alt="Preview" />
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={shareWhatsApp} disabled={step !== "ready"}
              className="flex items-center justify-center gap-2 py-3.5 rounded-xl text-[13px] font-semibold text-white disabled:opacity-40 transition-all"
              style={{ background: step === "ready" ? "linear-gradient(135deg,#25D366,#128C7E)" : "#1a2035" }}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              {T.whatsapp || "WhatsApp"}
            </button>
            <button onClick={downloadImage} disabled={step !== "ready"}
              className="flex items-center justify-center gap-2 py-3.5 rounded-xl text-[13px] font-semibold text-[#000435] bg-amber-400 hover:bg-amber-300 disabled:opacity-40 transition-all">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
              {T.saveImage || "Save Image"}
            </button>
          </div>
        </div>
        <div className="p-4 border-t border-white/10 shrink-0">
          <button onClick={onClose} className="w-full py-3 rounded-xl border border-white/15 text-white/70 font-bold text-[13px] hover:bg-white/8 transition-all">
            {T.cancelBtn || "Cancel"}
          </button>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

/** Modal: edit a single Kinyarwanda narrative slice; PATCH server bundle + PDF regen */
function KinyarwandaSectionEditModal({ target, recId, docId, onClose, onSaved, T }) {
  const [saving, setSaving] = useState(false);
  const [v, setV] = useState(() => ({}));
  useEffect(() => {
    if (!target?.type) return;
    if (target.type === "parent") setV({ text: target.text ?? "" });
    else if (target.type === "payment") setV({ name: target.name ?? "" });
    else if (target.type === "requirement") setV({ item: target.item ?? "", description: target.description ?? "" });
    else if (target.type === "otherInfo") setV({ item: target.item ?? "" });
    else if (target.type === "classNote") setV({ item: target.item ?? "", details: target.details ?? "" });
    else if (target.type === "leader") setV({ role: target.role ?? "" });
  }, [target]);

  const previewRw =
    target?.type === "parent"
      ? v.text
      : target?.type === "payment"
        ? v.name
        : target?.type === "requirement"
          ? `${v.item || ""}${v.description ? `\n${v.description}` : ""}`
          : target?.type === "otherInfo"
            ? v.item
            : target?.type === "classNote"
              ? `${v.item || ""}${v.details ? `\n${v.details}` : ""}`
              : target?.type === "leader"
                ? v.role
                : "";

  const handleSave = async () => {
    if (!target || saving) return;
    setSaving(true);
    try {
      let body = {};
      if (target.type === "parent") body = { parentMessage: v.text ?? "" };
      else if (target.type === "payment") body = { payments: [{ index: target.index, name: v.name ?? "" }] };
      else if (target.type === "requirement") {
        body = { requirements: [{ index: target.index, item: v.item ?? "", description: v.description ?? "" }] };
      } else if (target.type === "otherInfo") body = { otherInfos: [{ index: target.index, item: v.item ?? "" }] };
      else if (target.type === "classNote") {
        body = { classNotes: [{ index: target.index, item: v.item ?? "", details: v.details ?? "" }] };
      }       else if (target.type === "leader") body = { leaders: [{ index: target.index, role: v.role ?? "" }] };
      await patchRwContentI18n(recId, body);
      await onSaved?.();
      onClose();
    } catch (e) {
      alert(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (!target) return null;

  const title =
    target.type === "parent"
      ? T.parentMessageHeading || "Parent message"
      : target.type === "payment"
        ? `${T.thPaymentItem || "Payment"} #${(target.index ?? 0) + 1}`
        : target.type === "requirement"
          ? `${T.secRequirements || "Requirements"} #${(target.index ?? 0) + 1}`
          : target.type === "otherInfo"
            ? `${T.secOtherInfo || "Other information"} #${(target.index ?? 0) + 1}`
            : target.type === "classNote"
              ? `${T.secClassNotes || "Class notes"} #${(target.index ?? 0) + 1}`
              : target.type === "leader"
                ? `${T.thRole || "Role"} #${(target.index ?? 0) + 1}`
                : "Edit";

  return createPortal(
    <div
      className="fixed inset-0 z-[120] overflow-y-auto overscroll-contain bg-black/70 backdrop-blur-sm px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]"
      onClick={(e) => e.target === e.currentTarget && !saving && onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div className="flex min-h-full w-full items-center justify-center py-4">
        <div
          className="w-full max-w-lg rounded-2xl border border-amber-400/30 bg-[#000435] shadow-sm p-4 sm:p-5 max-h-[min(85dvh,720px)] overflow-y-auto shrink-0"
          style={{ fontFamily: FONT }}
          onClick={(e) => e.stopPropagation()}
        >
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-400/80 mb-0.5">Kinyarwanda</p>
            <p className="text-white font-semibold text-[15px] leading-tight">{title}</p>
          </div>
          <button
            type="button"
            onClick={() => !saving && onClose()}
            className="w-8 h-8 rounded-xl bg-white/8 border border-white/15 flex items-center justify-center text-white/60 hover:text-white"
          >
            ×
          </button>
        </div>

        <div className="space-y-3">
          {target.type === "parent" && (
            <textarea
              value={v.text ?? ""}
              onChange={(e) => setV((s) => ({ ...s, text: e.target.value }))}
              rows={8}
              className="w-full rounded-xl bg-white/8 border border-white/15 text-white text-[13px] p-3 outline-none focus:border-amber-400/40 placeholder:text-white/30"
              placeholder="Andika mu Kinyarwanda…"
            />
          )}
          {target.type === "payment" && (
            <input
              value={v.name ?? ""}
              onChange={(e) => setV((s) => ({ ...s, name: e.target.value }))}
              className="w-full rounded-xl bg-white/8 border border-white/15 text-white text-[13px] p-3 outline-none focus:border-amber-400/40"
            />
          )}
          {target.type === "requirement" && (
            <>
              <input
                value={v.item ?? ""}
                onChange={(e) => setV((s) => ({ ...s, item: e.target.value }))}
                className="w-full rounded-xl bg-white/8 border border-white/15 text-white text-[13px] p-3 outline-none focus:border-amber-400/40"
                placeholder={T.thItem || "Item"}
              />
              <textarea
                value={v.description ?? ""}
                onChange={(e) => setV((s) => ({ ...s, description: e.target.value }))}
                rows={4}
                className="w-full rounded-xl bg-white/8 border border-white/15 text-white text-[13px] p-3 outline-none focus:border-amber-400/40"
                placeholder={T.thDescription || "Description"}
              />
            </>
          )}
          {target.type === "otherInfo" && (
            <textarea
              value={v.item ?? ""}
              onChange={(e) => setV((s) => ({ ...s, item: e.target.value }))}
              rows={5}
              className="w-full rounded-xl bg-white/8 border border-white/15 text-white text-[13px] p-3 outline-none focus:border-amber-400/40"
            />
          )}
          {target.type === "classNote" && (
            <>
              <input
                value={v.item ?? ""}
                onChange={(e) => setV((s) => ({ ...s, item: e.target.value }))}
                className="w-full rounded-xl bg-white/8 border border-white/15 text-white text-[13px] p-3 outline-none focus:border-amber-400/40"
                placeholder={T.thItem || "Item"}
              />
              <textarea
                value={v.details ?? ""}
                onChange={(e) => setV((s) => ({ ...s, details: e.target.value }))}
                rows={4}
                className="w-full rounded-xl bg-white/8 border border-white/15 text-white text-[13px] p-3 outline-none focus:border-amber-400/40"
                placeholder={T.thDetails || "Details"}
              />
            </>
          )}
          {target.type === "leader" && (
            <textarea
              value={v.role ?? ""}
              onChange={(e) => setV((s) => ({ ...s, role: e.target.value }))}
              rows={3}
              className="w-full rounded-xl bg-white/8 border border-white/15 text-white text-[13px] p-3 outline-none focus:border-amber-400/40"
            />
          )}

          <div>
            <p className="text-[9px] font-semibold uppercase tracking-wider text-white/35 mb-1">{T.livePreviewLabel || "Live preview"}</p>
            <div className="rounded-xl border border-white/10 bg-white p-3 text-[12px] text-[#1e293b] max-h-[140px] overflow-y-auto whitespace-pre-wrap" style={{ fontFamily: "Georgia,'Times New Roman',serif" }}>
              {previewRw || "—"}
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button
            type="button"
            onClick={() => !saving && onClose()}
            className="flex-1 py-2.5 rounded-xl border border-white/15 text-white/70 text-[12px] font-bold hover:bg-white/8"
          >
            {T.cancelBtn || "Cancel"}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-amber-400 text-[#000435] text-[12px] font-semibold disabled:opacity-50"
          >
            {saving ? "…" : T.save || "Save"}
          </button>
        </div>
        <p className="text-[9px] text-white/35 mt-2 leading-snug">
          {T.rwEditFooterNote || "After saving, the on-screen preview and school PDF are updated. Your Kinyarwanda text is stored for next time."}
        </p>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Official doc modal ────────────────────────────────────────
function OfficialDoc({
  rec: originalRec,
  onClose,
  globalLang,
  onLangChange,
  T: parentT,
  apiLang: parentApiLang,
  mtLoading: parentMtLoading,
  session,
  onRecordRefresh,
}) {
  const [lang, setLang] = useState(globalLang || "en");
  const [downloading, setDownloading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [schoolLogoB64, setSchoolLogoB64] = useState(null);
  const [otherLogoB64, setOtherLogoB64] = useState(null);
  const [sigB64, setSigB64] = useState(null);
  const [stampB64, setStampB64] = useState(null);
  const [qrB64, setQrB64] = useState(null);
  const [vUrl, setVUrl] = useState(null);
  const [showShare, setShowShare] = useState(false);
  const [qrLoading, setQrLoading] = useState(true);
  const [editRwTarget, setEditRwTarget] = useState(null);

  const [rec, setRec] = useState(originalRec);
  useEffect(() => {
    setRec(originalRec);
  }, [originalRec]);
  const T = parentT || getLegacyBabyeyiUI(lang);
  const apiLang = parentApiLang ?? (["en", "rw", "fr"].includes(lang) ? lang : "en");
  const docBody = useMachineDocBody(lang, rec);
  const parentMsg = docBody.parentMsg;
  const payments = Array.isArray(docBody.merged.payments) ? docBody.merged.payments : [];
  const totalFee = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
  const today = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  const stKeyDoc = String(rec.status || "draft").toLowerCase();
  const st = { ...(STATUS_CFG[rec.status] || STATUS_CFG.draft), label: T[`status_${stKeyDoc}`] || getStatusLabelSafe(lang, rec.status) };
  const blocked = isBlocked(rec.status);
  const banks = docBody.banks;
  const classesArr = Array.isArray(rec.classes) && rec.classes.length ? rec.classes : [rec.class];
  const classLabel = formatBabyeyiDocumentClassLabel(classesArr);
  const levelLabel = rec.level || rec.education_level || "";
  const reqs = Array.isArray(docBody.merged.requirements) ? docBody.merged.requirements : [];
  const otherInfos = Array.isArray(docBody.merged.otherInfos) ? docBody.merged.otherInfos : [];
  const leaders = Array.isArray(docBody.merged.leaders) ? docBody.merged.leaders : [];
  const classNotes = Array.isArray(docBody.merged.classNotes) ? docBody.merged.classNotes : [];
  const isRwLocale = normalizeBabyeyiLang(lang) === "rw";
  const canSaveRwEdits = canSessionEditKinyarwandaRw(session);
  const openRwEdit = (target) => {
    if (!canSaveRwEdits) {
      alert(T.rwEditDenied || "You do not have permission to edit Kinyarwanda fields. Contact your school administrator.");
      return;
    }
    setEditRwTarget(target);
  };

  useEffect(() => {
    Promise.all([
      toBase64(toAssetUrl(originalRec.schoolLogoPath)),
      toBase64(toAssetUrl(originalRec.otherLogoPath)),
      toBase64(toAssetUrl(originalRec.signaturePath)),
      toBase64(toAssetUrl(originalRec.stampPath)),
    ]).then(([logo, otherLogo, sig, stamp]) => { setSchoolLogoB64(logo); setOtherLogoB64(otherLogo); setSigB64(sig); setStampB64(stamp); });
    setQrLoading(true);
    ensureQRCode(originalRec).then(async (result) => {
      await applyQrToState(result, setQrB64, setVUrl);
    }).finally(() => setQrLoading(false));
  }, [originalRec.id, originalRec.docId, originalRec.integrityHash]);

  useEffect(() => {
    if (globalLang) setLang(normalizeBabyeyiLang(globalLang));
  }, [globalLang, originalRec?.id]);

  const handleLangChange = (newLang) => {
    const n = normalizeBabyeyiLang(newLang);
    setLang(n);
    try {
      localStorage.setItem("babyeyi_lang", n);
    } catch {}
    onLangChange?.(n);
  };

  const handlePDF = async () => {
    if (blocked) return;
    setDownloading(true);
    try {
      const fileName = `Babyeyi-${rec.docId || rec.class}-${rec.term}${lang !== "en" ? `-${lang.toUpperCase()}` : ""}.pdf`;
      const docEl = document.getElementById("babyeyi-pdf-doc");
      if (docEl) {
        try {
          await downloadBabyeyiClientPdf({ rootEl: docEl, fileName });
          return;
        } catch (clientErr) {
          console.warn("[babyeyi] client PDF capture failed, trying server:", clientErr);
        }
      }
      await downloadBabyeyiServerPdf({
        babyeyiId: rec.id,
        apiLang,
        fileName,
        onRegenerate: async () => {
          const res = await fetch(`${API_BASE}/babyeyi/${rec.id}/regenerate-docs?lang=${encodeURIComponent(apiLang)}`, {
            method: "POST",
            credentials: "include",
          });
          const json = await res.json().catch(() => ({}));
          if (!res.ok || json.success === false) throw new Error(json.message || "Regenerate failed");
        },
      });
    } catch (e) {
      alert("PDF error: " + (e.message || e));
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    if (blocked) return;
    openBabyeyiPrintPage({ babyeyiId: rec.id, apiLang });
  };

  const handleRegen = async () => {
    setRegenerating(true);
    try {
      const res = await fetch(`${API_BASE}/babyeyi/${rec.id}/regenerate-docs?lang=${encodeURIComponent(apiLang)}`, { method: "POST", credentials: "include" });
      const json = await res.json();
      if (json.success) {
        const result = await ensureQRCode(rec);
        await applyQrToState(result, setQrB64, setVUrl);
      }
    } catch (e) { alert("Error: " + e.message); }
    finally { setRegenerating(false); }
  };

  const Th = ({ children, center, w }) => (
    <th style={{ ...DOC.th, textAlign: center ? "center" : "left", width: w || "auto" }}>{children}</th>
  );
  const Td = ({ children, center, mono, bold, color, italic }) => (
    <td style={{ ...DOC.td, textAlign: center ? "center" : "left", fontFamily: mono ? "monospace" : "inherit", fontWeight: bold ? 700 : 400, color: color || DOC.td.color, fontStyle: italic ? "italic" : "normal" }}>{children}</td>
  );
  const tblStyle = { width: "100%", borderCollapse: "collapse", marginTop: "8px" };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/75 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto" style={{ fontFamily: FONT }}>
      <div className="w-full max-w-3xl my-4">
        {/* Toolbar */}
        <div className="bg-[#000435] border-2 border-amber-400/30 rounded-t-2xl px-3 sm:px-4 py-3 flex items-center gap-2 flex-wrap">
          <button onClick={onClose} className="flex items-center gap-1 px-3 py-1.5 bg-white/8 border border-white/15 hover:bg-white/14 text-white rounded-xl text-[11px] font-bold shrink-0">
            ← {T.backBtn || "Back"}
          </button>
          <div className="flex-1 min-w-0 hidden sm:block">
            <p className="text-white font-semibold text-[13px] truncate">
              {rec.schoolName} — {levelLabel} · {classLabel} · {rec.term} · {rec.academicYear}
              {rec.docId && <span className="ml-2 px-2 py-0.5 bg-amber-400/15 text-amber-400 rounded text-[8px] font-mono">{rec.docId}</span>}
            </p>
          </div>
          <LangSwitcher
            lang={lang}
            setLang={handleLangChange}
            compact
            moreHint={T.moreLanguagesHint}
            mtLoading={!!parentMtLoading || docBody.busy}
            searchPlaceholder="Search language or code…"
          />
          <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-semibold border shrink-0 ${st.bg} ${st.text} ${st.border}`}>
            <span className={`w-1.5 h-1.5 rounded-full inline-block ${st.dot}`} /> {st.label}
          </span>
          {rec.docId && (
            <a href={babyeyiVerifyScanUrl(rec.docId, rec.integrityHash)} target="_blank" rel="noreferrer"
              className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 rounded-xl text-[10px] font-bold shrink-0 hover:bg-emerald-500/25">
              <Check className="w-3 h-3 shrink-0" strokeWidth={3} aria-hidden /> {T.verify || "Verify"}
            </a>
          )}
          <button onClick={handleRegen} disabled={regenerating}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-white/8 border border-white/15 text-white/70 rounded-xl text-[10px] font-bold disabled:opacity-50 shrink-0 hover:bg-white/14">
            {regenerating ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <RefreshCw className="w-3 h-3 shrink-0" strokeWidth={2.5} aria-hidden />} {T.regen || "Regen"}
            </button>
          {!blocked ? (
            <button onClick={() => setShowShare(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-bold shrink-0 text-white"
              style={{ background: "linear-gradient(135deg,#25D366,#128C7E)" }}>
              <svg viewBox="0 0 24 24" width="11" height="11" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              {T.share || "Share"}
            </button>
          ) : (
            <span className="flex items-center gap-1 px-2.5 py-1.5 bg-white/5 text-white/30 rounded-xl text-[10px] font-bold shrink-0"><Lock className="w-3 h-3 shrink-0 opacity-70" aria-hidden /> {T.locked || "Locked"}</span>
          )}
          {!blocked ? (
            <>
              <button onClick={handlePrint}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-white/8 border border-white/15 hover:bg-white/14 text-white rounded-xl text-[10px] font-bold shrink-0">
                <Printer className="w-3 h-3 shrink-0" strokeWidth={2.5} aria-hidden /> {T.printBtn || "Print"}
              </button>
              <button onClick={handlePDF} disabled={downloading}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white rounded-xl text-[10px] font-bold shrink-0">
                {downloading ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FileText className="w-3 h-3 shrink-0" strokeWidth={2.5} aria-hidden />} {T.pdfBtn || "PDF"} {lang !== "en" ? langMeta(lang).flag : ""}
              </button>
            </>
          ) : (
            <span className="flex items-center gap-1 px-2.5 py-1.5 bg-white/5 text-white/30 rounded-xl text-[10px] font-bold shrink-0"><Lock className="w-3 h-3 shrink-0 opacity-70" aria-hidden /> PDF</span>
          )}
        </div>

        {blocked && (
          <div className="bg-amber-400/10 border-x border-amber-400/20 px-4 py-2 flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 shrink-0 text-amber-400" aria-hidden strokeWidth={2.5} />
            <p className="text-amber-400 text-[10px] font-bold">{T.lockedPdfWhatsapp || "PDF and sharing locked until approved."}</p>
          </div>
        )}
        <div className="sm:hidden bg-[#000435] border-x border-white/10 px-4 py-2">
          <p className="text-[10px] text-amber-300/95 font-bold tracking-wide text-center">
            Swipe left/right to view full document
          </p>
        </div>

        {/* Doc body — white background for official doc look */}
        <div className="relative bg-white shadow-sm rounded-b-2xl overflow-hidden" style={{ fontFamily: "Georgia,'Times New Roman',serif" }}>
          {docBody.busy && !isCoreBabyeyiLang(lang) && (
            <div className="absolute inset-0 z-10 bg-white/75 backdrop-blur-[2px] flex items-center justify-center p-4">
              <div className="flex flex-col items-center gap-2 text-[#000435]">
                <span className="w-8 h-8 border-2 border-amber-400/30 border-t-amber-500 rounded-full animate-spin" />
                <p className="text-[11px] font-semibold text-center">{T.translating || "Translating document…"}</p>
              </div>
            </div>
          )}
          <div className="overflow-x-auto overscroll-x-contain">
            <div style={{ minWidth: "760px" }}>
            <BabyeyiDocFrame>
          {/* Header */}
          <div id="babyeyi-pdf-header" style={{ padding: "20px 40px 16px", borderBottom: "2px solid #1e3a5f" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
              <div style={{ flexShrink: 0, width: "110px", height: "110px", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                {schoolLogoB64 ? <img src={schoolLogoB64} style={{ width: "110px", height: "110px", objectFit: "contain" }} alt="Logo" /> : <span style={{ fontSize: "8px", color: "#64748b", textAlign: "center", fontWeight: 700, padding: "4px" }}>{T.schoolLogoPlaceholder || "SCHOOL LOGO"}</span>}
              </div>
              <div style={{ flex: 1, textAlign: "center" }}>
                <p style={{ fontSize: "10px", color: "#64748b", margin: "0", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600, lineHeight: "1.8" }}>{T.republic}</p>
                <p style={{ fontSize: "10px", color: "#64748b", margin: "0", lineHeight: "1.8" }}>{T.district}: <strong style={{ color: "#1e3a5f" }}>{rec.district || "—"}</strong></p>
                <p style={{ fontSize: "10px", color: "#64748b", margin: "0 0 6px", lineHeight: "1.8" }}>{T.sector}: <strong style={{ color: "#1e3a5f" }}>{rec.sector || "—"}</strong></p>
                <h1 style={{ fontSize: "17px", fontWeight: 700, color: "#1e3a5f", margin: "0 0 8px", textTransform: "uppercase", letterSpacing: ".03em" }}>{rec.schoolName}</h1>
                <div style={{ marginBottom: "10px" }}>
                  <p style={{ fontSize: "10px", color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", margin: "0 0 6px" }}>{T.classLabel}</p>
                  <BabyeyiClassChips labels={classesArr} max={12} size="md" />
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "14px", alignItems: "center", justifyContent: "center", marginBottom: "8px" }}>
                  {[[T.academicYear, rec.academicYear], [T.termLabel, rec.term], [T.levelLabel, levelLabel]].map(([l, v], i) => (
                    <span key={i} style={DOC.body}><strong style={{ color: "#1e3a5f" }}>{l}:</strong> {v || "—"}</span>
                  ))}
                  {rec.docId && <span style={{ ...DOC.body, fontFamily: "monospace", fontWeight: 700, color: "#3730a3", border: "1px solid #c7d2fe", padding: "1px 8px" }}>{rec.docId}</span>}
                </div>
              </div>
              <div style={{ flexShrink: 0, width: "84px", height: "84px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {otherLogoB64 && <img src={otherLogoB64} style={{ width: "80px", height: "80px", objectFit: "contain" }} alt="Other Logo" />}
              </div>
            </div>
          </div>

          {/* Body */}
          <div id="babyeyi-pdf-body" style={{ padding: "20px 40px 28px" }}>
            {(parentMsg || isRwLocale) && (
              <div data-babyeyi-pdf-section="parent" style={DOC.section}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: "5px", marginBottom: "8px", gap: "8px" }}>
                  <span style={DOC.heading}>{T.parentMessageHeading}</span>
                  {isRwLocale && (
                    <button
                      type="button"
                      onClick={() => openRwEdit({ type: "parent", text: parentMsg })}
                      style={{ fontSize: "10px", fontWeight: 700, color: "#4f46e5", border: "none", background: "none", cursor: "pointer", flexShrink: 0 }}
                    >
                      {T.editBtn}
                    </button>
                  )}
                </div>
                {parentMsg ? (
                  <p style={{ ...DOC.body, whiteSpace: "pre-line", margin: 0, paddingLeft: "16px" }}>{parentMsg}</p>
                ) : (
                  isRwLocale && <p style={{ ...DOC.body, color: "#94a3b8", margin: 0, paddingLeft: "16px", fontStyle: "italic" }}>—</p>
                )}
              </div>
            )}
            {payments.length > 0 && (
              <div data-babyeyi-pdf-section="fees" style={DOC.section}>
                <div style={{ paddingBottom: "5px", marginBottom: "12px" }}><span style={DOC.heading}>{T.secFee}</span></div>
                <table style={tblStyle}>
                  <thead><tr><Th w="42px" center>#</Th><Th>{T.thPaymentItem}</Th><Th>{T.thAmount || "Amount"}</Th></tr></thead>
                  <tbody>{payments.map((p, i) => (
                    <tr key={i}>
                      <Td center color="#64748b">{i + 1}</Td>
                      <Td>
                        <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                          <span>{p.name}</span>
                          {isRwLocale && (
                            <button type="button" onClick={() => openRwEdit({ type: "payment", index: i, name: p.name })}
                              style={{ fontSize: "10px", fontWeight: 700, color: "#4f46e5", border: "none", background: "none", cursor: "pointer", flexShrink: 0 }}>{T.editBtn}</button>
                          )}
                        </span>
                      </Td>
                      <td style={{ ...DOC.td, textAlign: "right", fontFamily: "monospace", fontWeight: 600 }}>{Number(p.amount || 0).toLocaleString()}</td>
                    </tr>
                  ))}</tbody>
                  <tfoot><tr><td colSpan={2} style={{ padding: "9px 12px", fontSize: "14px", fontWeight: 700, color: "#1e3a5f", borderTop: "2px solid #1e3a5f" }}>{T.thTotalLabel}</td><td style={{ padding: "9px 12px", fontSize: "14px", fontWeight: 700, color: "#1e3a5f", borderTop: "2px solid #1e3a5f", textAlign: "right", fontFamily: "monospace" }}>RWF {totalFee.toLocaleString()}</td></tr></tfoot>
                </table>
              </div>
            )}
            {banks.length > 0 && (
              <div data-babyeyi-pdf-section="banking" style={DOC.section}>
                <div style={{ paddingBottom: "5px", marginBottom: "12px" }}><span style={DOC.heading}>{T.secBanking}</span></div>
                <table style={tblStyle}>
                  <thead><tr><Th w="40px" center>#</Th><Th>{T.thBank || "Bank"}</Th><Th>{T.thAccount || "Account"}</Th><Th>{T.thAccountName || "Name"}</Th><Th w="70px" center>{T.thPrimary || "Primary"}</Th></tr></thead>
                  <tbody>{banks.map((bk, i) => (<tr key={i}><Td center color="#64748b">{i + 1}</Td><Td bold>{bk.bankName || "—"}</Td><Td mono>{bk.accountNumber || "—"}</Td><Td>{bk.accountName || "—"}</Td><Td center color="#059669" bold>{bk.isPrimary || i === 0 ? "✓" : ""}</Td></tr>))}</tbody>
                </table>
              </div>
            )}
            {reqs.length > 0 && (
              <div data-babyeyi-pdf-section="requirements" style={DOC.section}>
                <div style={{ paddingBottom: "5px", marginBottom: "12px" }}><span style={DOC.heading}>{T.secRequirements}</span></div>
                <table style={tblStyle}>
                  <thead><tr><Th w="42px" center>#</Th><Th>{T.thItem || "Item"}</Th><Th>{T.thDescription || "Description"}</Th><Th w="80px" center>{T.thQuantity || "Qty"}</Th></tr></thead>
                  <tbody>{reqs.map((r, i) => (
                    <tr key={i}>
                      <Td center color="#64748b">{i + 1}</Td>
                      <Td>
                        <span style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                          <span>{(r && r.item) || r}</span>
                          {isRwLocale && (
                            <button type="button" onClick={() => openRwEdit({ type: "requirement", index: i, item: r.item, description: r.description || "" })}
                              style={{ fontSize: "10px", fontWeight: 700, color: "#4f46e5", border: "none", background: "none", cursor: "pointer", flexShrink: 0 }}>{T.editBtn}</button>
                          )}
                        </span>
                      </Td>
                      <Td>{r && r.description}</Td>
                      <Td center>{r && r.quantity}</Td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
            {otherInfos.length > 0 && (
              <div data-babyeyi-pdf-section="other" style={DOC.section}>
                <div style={{ paddingBottom: "5px", marginBottom: "12px" }}><span style={DOC.heading}>{T.secOtherInfo}</span></div>
                <table style={tblStyle}>
                  <thead><tr><Th w="42px" center>#</Th><Th>{T.thItem || "Item"}</Th><Th>{T.thDetails || "Details"}</Th></tr></thead>
                  <tbody>{otherInfos.map((n, i) => (
                    <tr key={i}>
                      <Td center color="#64748b">{i + 1}</Td>
                      <Td bold>
                        <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                          <span>{n.item}</span>
                          {isRwLocale && (
                            <button type="button" onClick={() => openRwEdit({ type: "otherInfo", index: i, item: n.item })}
                              style={{ fontSize: "10px", fontWeight: 700, color: "#4f46e5", border: "none", background: "none", cursor: "pointer", flexShrink: 0 }}>{T.editBtn}</button>
                          )}
                        </span>
                      </Td>
                      <Td>{n.details}</Td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
            {leaders.length > 0 && (
              <div data-babyeyi-pdf-section="leadership" style={DOC.section}>
                <div style={{ paddingBottom: "5px", marginBottom: "12px" }}><span style={DOC.heading}>{T.secLeadership}</span></div>
                <table style={tblStyle}>
                  <thead><tr><Th w="36px" center>#</Th><Th>{T.thFullName || "Full Name"}</Th><Th>{T.thRole || "Role"}</Th><Th>{T.thPhone || "Phone"}</Th><Th>{T.thEmail || "Email"}</Th></tr></thead>
                  <tbody>{leaders.map((l, i) => (
                    <tr key={l.id || i}>
                      <Td center color="#64748b">{i + 1}</Td>
                      <Td bold color="#1e3a5f">{l.name || "—"}</Td>
                      <Td italic color="#475569">
                        <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                          <span>{l.role || "—"}</span>
                          {isRwLocale && (
                            <button type="button" onClick={() => openRwEdit({ type: "leader", index: i, role: l.role || "" })}
                              style={{ fontSize: "10px", fontWeight: 700, color: "#4f46e5", border: "none", background: "none", cursor: "pointer", flexShrink: 0 }}>{T.editBtn}</button>
                          )}
                        </span>
                      </Td>
                      <td style={{ ...DOC.td, fontFamily: "monospace", fontSize: "11px" }}>{l.phone ? `+250 ${l.phone}` : "—"}</td>
                      <td style={{ ...DOC.td, fontSize: "11px", color: "#2563eb" }}>{l.email || "—"}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
            {classNotes.length > 0 && (
              <div data-babyeyi-pdf-section="notes" style={DOC.section}>
                <div style={{ paddingBottom: "5px", marginBottom: "12px" }}><span style={DOC.heading}>{T.secClassNotes}</span></div>
                <table style={tblStyle}>
                  <thead><tr><Th w="42px" center>#</Th><Th>{T.thItem || "Item"}</Th><Th>{T.thDetails || "Details"}</Th></tr></thead>
                  <tbody>{classNotes.map((n, i) => (
                    <tr key={i}>
                      <Td center color="#64748b">{i + 1}</Td>
                      <Td bold>
                        <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                          <span>{n.item}</span>
                          {isRwLocale && (
                            <button type="button" onClick={() => openRwEdit({ type: "classNote", index: i, item: n.item, details: n.details || "" })}
                              style={{ fontSize: "10px", fontWeight: 700, color: "#4f46e5", border: "none", background: "none", cursor: "pointer", flexShrink: 0 }}>{T.editBtn}</button>
                          )}
                        </span>
                      </Td>
                      <Td>{n.details || "—"}</Td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
            {/* Auth — compact; stays on same page when content is short */}
            <div id="babyeyi-pdf-auth-block" style={{ marginTop: "14px", pageBreakInside: "avoid", breakInside: "avoid", pageBreakBefore: "avoid", breakBefore: "avoid" }}>
              <div style={{ borderBottom: "1.5px solid #1e3a5f", paddingBottom: "4px", marginBottom: "8px" }}><span style={{ ...DOC.heading, fontSize: "13px" }}>{T.secAuth}</span></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginTop: "8px" }}>
                <div style={{ border: "1px solid #e2e8f0", padding: "10px 8px", textAlign: "center", minHeight: "96px", boxSizing: "border-box" }}>
                  <p style={{ ...DOC.label, textTransform: "uppercase", fontSize: "10px", margin: "0 0 6px" }}>{T.sigHeadTeacher}</p>
                  <div style={{ height: "44px", display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: "2px", marginBottom: "2px" }}>
                    {sigB64 && <img src={sigB64} style={{ maxHeight: "40px", maxWidth: "120px", objectFit: "contain" }} alt="Sig" />}
                    {!sigB64 && <div style={{ width: "100%", height: "1px", borderBottom: "1px solid #cbd5e1" }} />}
                  </div>
                  <p style={{ fontSize: "10px", color: "#94a3b8", margin: 0 }}>{sigB64 ? T.sigSigned : T.sigRequired}</p>
                </div>
                <div style={{ border: "1px solid #e2e8f0", padding: "10px 8px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "96px", boxSizing: "border-box" }}>
                  {qrB64 ? (
                    <>
                      <div style={{ background: "white", border: "1px solid #e2e8f0", padding: "4px", borderRadius: "4px" }}>
                        <img src={qrB64} style={{ width: "64px", height: "64px", objectFit: "contain", display: "block" }} alt="QR" />
                      </div>
                      <p style={{ fontSize: "9px", color: "#1e3a5f", fontWeight: 700, margin: "4px 0 0", textTransform: "uppercase", letterSpacing: ".05em" }}>{T.sigScanVerify}</p>
                      {rec.docId && <p style={{ fontSize: "9px", color: "#64748b", margin: "2px 0 0", fontFamily: "monospace" }}>ID: {rec.docId}</p>}
                    </>
                  ) : qrLoading ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-5 h-5 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
                      <span style={{ fontSize: "10px", color: "#4f46e5", fontWeight: 700 }}>{T.generatingQr || "Generating…"}</span>
                    </div>
                  ) : (
                    <div style={{ width: 64, height: 64, border: "1px dashed #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <QrCode className="w-7 h-7 text-slate-300 opacity-35" aria-hidden strokeWidth={1.75} />
                    </div>
                  )}
                </div>
                <div style={{ border: "1px solid #e2e8f0", padding: "10px 8px", textAlign: "center", minHeight: "96px", boxSizing: "border-box" }}>
                  <p style={{ ...DOC.label, textTransform: "uppercase", fontSize: "10px", margin: "0 0 6px" }}>{T.sigStamp}</p>
                  <div style={{ width: "64px", height: "64px", border: "1px dashed #e2e8f0", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", margin: "0 auto 4px" }}>
                    {stampB64 ? <img src={stampB64} style={{ width: "60px", height: "60px", objectFit: "contain", borderRadius: "50%" }} alt="Stamp" /> : <StampLucide className="w-7 h-7 text-slate-300 opacity-[0.14]" aria-hidden strokeWidth={1.5} />}
                  </div>
                  <p style={{ fontSize: "10px", color: "#94a3b8", margin: 0 }}>{T.sigCachet}</p>
                </div>
              </div>
              <div style={{ borderTop: "1px solid #1e3a5f", padding: "6px 0", marginTop: "10px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                <span style={{ fontSize: "10px", color: "#64748b" }}>{rec.schoolName || ""} · {rec.district || ""}</span>
                <span style={{ fontSize: "10px", color: "#1e3a5f", fontWeight: 700, textTransform: "uppercase" }}>{T.docOfficial}</span>
                <span style={{ fontSize: "10px", color: "#64748b" }}>{T.docFooterLeft != null ? T.docFooterLeft : "Doc"} {rec.docId || ""} · {today}</span>
              </div>
            </div>
          </div>
            </BabyeyiDocFrame>
            </div>
          </div>
        </div>
      </div>

      {showShare && !blocked && (
        <ShareModal
          rec={docBody.merged}
          onClose={() => setShowShare(false)}
          schoolLogoB64={schoolLogoB64}
          otherLogoB64={otherLogoB64}
          sigB64={sigB64}
          stampB64={stampB64}
          qrB64={qrB64}
          vUrl={vUrl}
          lang={lang}
          T={T}
          parentMsgOverride={docBody.parentMsg}
        />
      )}
      {editRwTarget && (
        <KinyarwandaSectionEditModal
          target={editRwTarget}
          recId={rec.id}
          docId={rec.docId}
          onClose={() => setEditRwTarget(null)}
          onSaved={onRecordRefresh}
          T={T}
        />
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ── Edit wizard modal — same design as Create Babyeyi ─────────
function EditWizardModal({ rec, session, onClose, onSaved }) {
  return (
    <CreateBabyeyiModal
      key={rec.id}
      session={session}
      isOpen
      editRecord={rec}
      onClose={onClose}
      onSuccess={() => {
        onSaved?.(rec);
        onClose();
      }}
    />
  );
}

// ── Delete modal ──────────────────────────────────────────────
function DeleteModal({ rec, onConfirm, onCancel, T }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" style={{ fontFamily: FONT }}>
      <div className="bg-[#000435] border-2 border-red-500/40 rounded-2xl shadow-sm w-full max-w-sm overflow-hidden">
        <div className="bg-red-600 px-5 py-4">
          <p className="font-semibold text-white text-[14px]">{T.deleteTitle || "Delete Babyeyi"}</p>
          <p className="text-red-100 text-[11px] mt-0.5">{T.deleteWarning || "This action cannot be undone."}</p>
        </div>
        <div className="p-5">
          <div className="rounded-xl border border-white/10 bg-white/4 p-4 mb-4">
            <p className="font-semibold text-white text-[14px]">{rec.class} · {rec.term} · {rec.academicYear}</p>
            {rec.docId && <p className="text-[10px] font-mono text-amber-400/60 mt-1">{rec.docId}</p>}
          </div>
          <div className="flex gap-3">
            <button onClick={onCancel} className="flex-1 px-4 py-3 border border-white/15 text-white/70 rounded-xl font-bold text-[13px] hover:bg-white/8 transition-all">
              {T.cancelBtn || "Cancel"}
            </button>
            <button onClick={() => onConfirm(rec.id)} className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold text-[13px] transition-all">
              {T.confirmDelete || "Delete"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Babyeyi card ──────────────────────────────────────────────
function BabyeyiCard({ rec, onView, onEdit, onDelete, onShare, T, lang }) {
  const stKeyCard = String(rec.status || "draft").toLowerCase();
  const st = { ...(STATUS_CFG[rec.status] || STATUS_CFG.draft), label: T[`status_${stKeyCard}`] || getStatusLabelSafe(lang, rec.status) };
  const classes = Array.isArray(rec.classes) && rec.classes.length ? rec.classes : [rec.class];
  const payments = Array.isArray(rec.payments) ? rec.payments : [];
  const fee = rec.totalFee ?? payments.reduce((s, p) => s + Number(p.amount || 0), 0);
  const over = rec.exceedsLimit ? fee - (rec.nesaLimit || 0) : 0;
  const blocked = isBlocked(rec.status);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden hover:border-amber-300 transition-all hover:shadow-md" style={{ fontFamily: FONT }}>
      {/* Top accent by status */}
      <div className="h-[3px] w-full bg-amber-400" />
      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="min-w-0 flex-1">
              <BabyeyiClassChips labels={classes} max={4} />
              <p className="font-semibold text-slate-900 text-[13px] truncate mt-2">{rec.term} · {rec.academicYear}</p>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <span className="text-[10px] font-medium text-slate-500">{rec.level}</span>
                {rec.docId && <span className="px-1.5 py-0.5 rounded text-[8px] font-mono font-medium bg-amber-50 text-amber-700 border border-amber-200">{rec.docId}</span>}
                {blocked && <Lock className="w-3 h-3 text-slate-300 shrink-0" aria-hidden strokeWidth={2.25} />}
              </div>
            </div>
          </div>
          <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold border shrink-0 ${st.bg} ${st.text} ${st.border}`}>
            <span className={`w-1.5 h-1.5 rounded-full inline-block ${st.dot}`} /> {st.label}
          </span>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="rounded-xl px-3 py-2.5 border bg-amber-50 border-amber-200">
            <p className="text-[9px] font-medium uppercase tracking-wider text-slate-500 mb-0.5">{T.cardTotalFee || "Total fee"}</p>
            <p className="text-[14px] font-semibold font-mono text-[#000435]">
              {fee.toLocaleString()} <span className="text-[10px]">RWF</span>
            </p>
            {rec.exceedsLimit && <p className="text-[9px] text-amber-700 font-medium">+{over.toLocaleString()} {T.overNesaHint || "over NESA"}</p>}
          </div>
          <div className="rounded-xl px-3 py-2.5 border bg-slate-50 border-slate-200">
            <p className="text-[9px] font-medium uppercase tracking-wider text-slate-500 mb-0.5">{T.bankShort || "Bank"}</p>
            <p className="text-[11px] font-medium text-slate-700 truncate">{rec.bankName || "—"}</p>
            {rec.bankAccountNo && <p className="text-[9px] text-slate-400 font-mono truncate">{rec.bankAccountNo}</p>}
          </div>
        </div>

        {/* Action row */}
        <div className="flex items-center gap-2">
          {/* View/PDF */}
          <button type="button" onClick={() => onView(rec)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-amber-400 text-[#000435] font-medium text-[12px] hover:bg-amber-300 transition-all active:scale-[.98]">
            <Eye className="w-4 h-4 shrink-0" strokeWidth={2.5} aria-hidden /> {T.viewBtn || "View"}
          </button>
          {/* Edit */}
          <button type="button" onClick={() => onEdit(rec)}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-50 border border-slate-200 text-slate-500 hover:text-amber-700 hover:bg-amber-50 hover:border-amber-200 transition-all"
            title={T.editBtn || "Edit"}><Pencil className="w-4 h-4" strokeWidth={2} aria-hidden /></button>
          {/* Share/WhatsApp */}
          {blocked ? (
            <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 text-slate-300 cursor-not-allowed"><Lock className="w-4 h-4" aria-hidden /></div>
          ) : (
            <button type="button" onClick={() => onShare(rec)}
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-amber-200 transition-all bg-amber-50 text-[#000435] hover:bg-amber-100"
              aria-label={T.share || "Share"}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="#000435" aria-hidden><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            </button>
          )}
          {/* Delete */}
          <button type="button" onClick={() => onDelete(rec)}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 transition-all"
            aria-label={T.confirmDelete || "Delete"}>
            <Trash2 className="w-4 h-4" strokeWidth={2.25} aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Data mapping ──────────────────────────────────────────────
const mapRow = (row) => {
  let paymentsArr = [];
  try { const raw = row.payments; if (Array.isArray(raw)) paymentsArr = raw; else if (typeof raw === "string" && raw.startsWith("[")) paymentsArr = JSON.parse(raw); } catch {}
  const totalFee = row.total_fee ?? row.total_amount ?? paymentsArr.reduce((s, p) => s + Number(p.amount || 0), 0);
  let classes = [];
  try { if (row.classes_json) { const raw = typeof row.classes_json === "string" ? JSON.parse(row.classes_json) : row.classes_json; if (Array.isArray(raw)) classes = raw; } } catch {}
  return {
    id: row.id, class: row.class_name || row.class || (classes[0] || ""), classes,
    level: row.education_level || row.level || "Primary", term: row.term || "", academicYear: row.academic_year || "",
    status: row.status || "draft", totalFee: Number(totalFee || 0), nesaLimit: row.nesa_limit != null ? Number(row.nesa_limit) : null,
    exceedsLimit: !!row.exceeds_limit, schoolName: row.school_name || "", district: row.school_district || row.district || "",
    sector: row.school_sector || row.sector || "", createdAt: row.created_at || "",
    bankName: row.bank_name || "", bankAccountNo: row.bank_account_no || "", bankAccountName: row.bank_account_name || "",
    banksJson: row.banks_json || null, parentMessage: row.parent_message || "", docId: row.doc_id || null,
    integrityHash: row.integrity_hash != null ? String(row.integrity_hash) : null,
    schoolLogoPath: row.school_logo_url || null, otherLogoPath: row.other_logo_url || null,
    qrCodeUrl: row.qr_code_url || row.qr_code_path || null, qrViewUrl: row.qr_view_url || null,
    pdfPath: row.pdf_url || row.pdf_path || null, signaturePath: null, stampPath: null,
    payments: paymentsArr, requirements: [], classNotes: [], otherInfos: [],
    leaders: Array.isArray(row.leaders) ? row.leaders : [], leadersCount: Array.isArray(row.leaders) ? row.leaders.length : 0,
    increaseRequest: null, translationsJson: parseTranslationsJson(row.translations_json),
  };
};

async function loadFullRecord(sumRec, docLang = "en") {
  const code = ["en","rw","fr"].includes(docLang) ? docLang : "en";
  const res = await fetch(`${API_BASE}/babyeyi/${sumRec.id}?lang=${encodeURIComponent(code)}`, { credentials: "include" });
  const json = await res.json();
  if (!json.success) throw new Error(json.message || "Failed");
  const d = json.data, sig = d.signatures || {};
  let payments = (d.payments || []).map((p) => ({
    name: p.name,
    amount: String(p.amount ?? ""),
    pay_channel: String(p.pay_channel || p.payChannel || "babyeyi").toLowerCase() === "school" ? "school" : "babyeyi",
  }));
  if (!payments.length && d.payments_json) {
    try {
      const raw = JSON.parse(d.payments_json);
      if (Array.isArray(raw)) {
        payments = raw.map((p) => ({
          ...p,
          amount: String(p.amount ?? ""),
          pay_channel: String(p.pay_channel || p.payChannel || "babyeyi").toLowerCase() === "school" ? "school" : "babyeyi",
        }));
      }
    } catch { /* ignore */ }
  }
  const norm = (p) => p ? p.replace(/\\/g, "/") : null;
  const allClassReqs = (d.class_requirements || []).map(r => ({ item: r.item || r.information || "", details: r.details || "" }));
  const classNotes = allClassReqs.filter(r => r.details && r.details.trim());
  const otherInfos = allClassReqs.filter(r => !r.details || !r.details.trim());
  let leaders = [];
  if (Array.isArray(d.leaders) && d.leaders.length) leaders = d.leaders;
  else { try { const lRes = await fetch(`${API_BASE}/babyeyi/${sumRec.id}/leaders`, { credentials: "include" }); const lJson = await lRes.json(); if (lJson.success && Array.isArray(lJson.data)) leaders = lJson.data; } catch {} }
  return {
    ...sumRec, payments,
    requirements: (d.student_requirements || []).map((r) => ({
      item: r.item,
      description: r.description || "",
      quantity: r.quantity || "",
      pay_channel: String(r.pay_channel || r.payChannel || "").toLowerCase() === "school" ? "school" : "babyeyi",
      cost: r.cost != null && r.cost !== "" ? String(r.cost) : "",
    })),
    classNotes, otherInfos, leaders, leadersCount: leaders.length,
    increaseRequest: d.increase_request ? { requestTitle: d.increase_request.request_title || d.increase_request.reason, nesaStatus: d.increase_request.nesa_status } : null,
    signaturePath: norm(sig.director_sig_path) || null, stampPath: norm(sig.stamp_path) || null,
    schoolLogoPath: norm(sig.school_logo_path) || norm(sumRec.schoolLogoPath) || null,
    otherLogoPath: norm(sig.other_logo_path) || norm(sumRec.otherLogoPath) || null,
    qrCodeUrl: norm(sig.qr_code_path) || norm(d.qr_code_path) || norm(d.qr_code_url) || null,
    qrViewUrl: sig.qr_view_url || d.qr_view_url || null,
    pdfPath: norm(d.pdf_path) || norm(d.pdf_url) || null,
    docId: d.doc_id || sumRec.docId || null,
    integrityHash: d.integrity_hash != null ? String(d.integrity_hash) : sumRec.integrityHash || null,
    totalFee: Number(d.total_fee || d.total_amount || payments.reduce((s, p) => s + Number(p.amount || 0), 0) || 0),
    parentMessage: d.parent_message || sumRec.parentMessage || "",
    banksJson: d.banks_json || sumRec.banksJson || null,
    translationsJson: parseTranslationsJson(d.translations_json) ?? sumRec.translationsJson ?? null,
  };
}

// ════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════
export default function BabyeyiList({ session }) {
  const schoolId = session?.schoolId ?? null;
  const [lang, setLang] = useState(() => {
    try {
      return normalizeBabyeyiLang(localStorage.getItem("babyeyi_lang") || "en");
    } catch {
      return "en";
    }
  });
  const { T, apiLang, mtLoading, mtError, machineActive } = useBabyeyiUiT(lang);
  const handleLangChange = (newLang) => {
    const n = normalizeBabyeyiLang(newLang);
    setLang(n);
    try {
      localStorage.setItem("babyeyi_lang", n);
    } catch {}
  };

  const [records, setRecords] = useState([]);
  const [viewing, setViewing] = useState(null);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [sharing, setSharing] = useState(null);
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ status: "", level: "", term: "", year: "" });
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState("date_desc");
  const [loading, setLoading] = useState(true);

  const showToast = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        let url = `${API_BASE}/babyeyi?limit=200`;
        if (schoolId) url += `&school_id=${schoolId}`;
        const res = await fetch(url, { credentials: "include" });
        const json = await res.json();
        setRecords((json.data || []).map(mapRow));
      } catch { showToast("Failed to load records", "error"); }
      finally { setLoading(false); }
    })();
  }, [schoolId]);

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/babyeyi/${id}`, { method: "DELETE", credentials: "include" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) throw new Error(json.message || "Failed");
      setRecords(r => r.filter(x => x.id !== id)); setDeleting(null); showToast("Babyeyi deleted");
    } catch (e) { showToast(e.message || "Failed", "error"); }
  };

  const handleView = async (sumRec) => { try { setViewing(await loadFullRecord(sumRec, lang)); } catch (e) { showToast(e.message || "Failed to open", "error"); } };

  const handleEdit = async (sumRec) => {
    showToast("Loading record…", "info");
    try { const full = await loadFullRecord(sumRec, lang); setToast(null); setEditing(full); }
    catch (e) { showToast(e.message || "Failed to load", "error"); }
  };

  const handleSaved = (updatedRec) => { setRecords(r => r.map(x => x.id === updatedRec.id ? { ...x, ...updatedRec } : x)); showToast("Babyeyi updated!"); };

  const handleShare = async (sumRec) => {
    if (isBlocked(sumRec.status)) { showToast("Sharing locked until approved.", "error"); return; }
    showToast("Loading document…", "info");
    try { const full = await loadFullRecord(sumRec, lang); setToast(null); setSharing(full); }
    catch (e) { showToast(e.message || "Failed", "error"); }
  };

  useEffect(() => {
    if (!viewing?.id) return;
    (async () => {
      try { const sumRec = records.find(r => r.id === viewing.id) || { id: viewing.id }; setViewing(await loadFullRecord(sumRec, lang)); }
      catch (e) { showToast(e.message || "Failed to refresh", "error"); }
    })();
  }, [lang]);

  const filtered = records.filter(r => {
    const q = search.toLowerCase();
    if (q && !r.class.toLowerCase().includes(q) && !r.term.toLowerCase().includes(q) && !r.academicYear.includes(q) && !(r.docId || "").toLowerCase().includes(q)) return false;
    if (filters.status && r.status !== filters.status) return false;
    if (filters.level && r.level !== filters.level) return false;
    if (filters.term && r.term !== filters.term) return false;
    if (filters.year && r.academicYear !== filters.year) return false;
    return true;
  }).sort((a, b) => {
    if (sortBy === "date_desc") return new Date(b.createdAt) - new Date(a.createdAt);
    if (sortBy === "date_asc") return new Date(a.createdAt) - new Date(b.createdAt);
    if (sortBy === "fee_desc") return b.totalFee - a.totalFee;
    if (sortBy === "fee_asc") return a.totalFee - b.totalFee;
    return 0;
  });

  const stats = {
    total: records.length,
    approved: records.filter(r => r.status === "approved").length,
    pending: records.filter(r => ["pending","draft","submitted"].includes(r.status)).length,
    rejected: records.filter(r => r.status === "rejected").length,
  };
  const activeFilters = Object.values(filters).filter(Boolean).length;

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900&family=Varela+Round&display=swap'); @keyframes slideIn{from{transform:translateX(100px);opacity:0}to{transform:translateX(0);opacity:1}} @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}} .card-enter{animation:fadeUp .3s ease-out both}`}</style>

      {viewing && (
        <OfficialDoc
          key={viewing.id}
          rec={viewing}
          onClose={() => setViewing(null)}
          globalLang={lang}
          onLangChange={handleLangChange}
          T={T}
          apiLang={apiLang}
          mtLoading={machineActive && mtLoading}
          session={session}
          onRecordRefresh={async () => {
            const sumRec = records.find((r) => r.id === viewing.id) || { id: viewing.id };
            setViewing(await loadFullRecord(sumRec, lang));
            showToast(T.rwSectionSaved || "Kinyarwanda text saved.", "success");
          }}
        />
      )}
      {editing && <EditWizardModal rec={editing} session={session} onClose={() => setEditing(null)} onSaved={u => { handleSaved(u); setEditing(null); }} />}
      {deleting && <DeleteModal rec={deleting} onConfirm={handleDelete} onCancel={() => setDeleting(null)} T={T} />}
      {sharing && !isBlocked(sharing.status) && <ShareModal rec={sharing} onClose={() => setSharing(null)} schoolLogoB64={null} otherLogoB64={null} sigB64={null} stampB64={null} qrB64={null} vUrl={babyeyiVerifyScanUrl(sharing.docId, sharing.integrityHash) || sharing.qrViewUrl} lang={lang} T={T} />}

      {!schoolId && (
        <div className="bg-red-600 text-white text-center text-[12px] font-bold py-2 px-4 rounded-xl mb-4">School session not found. Please log out and log back in.</div>
      )}

      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-sm text-[13px] font-bold flex items-center gap-2 max-w-xs border ${
          toast.type === "success" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25" :
          toast.type === "info" ? "bg-amber-400/15 text-amber-400 border-amber-400/25" :
          "bg-red-500/15 text-red-400 border-red-500/25"
        } bg-[#000435]`} style={{ animation: "slideIn .3s ease-out", fontFamily: FONT }}>
          {toast.type === "success" ? <CircleCheck className="w-4 h-4 shrink-0" strokeWidth={2.5} aria-hidden /> :
            toast.type === "info" ? <Info className="w-4 h-4 shrink-0" strokeWidth={2.5} aria-hidden /> :
            <CircleX className="w-4 h-4 shrink-0" strokeWidth={2.5} aria-hidden />}
          {toast.msg}
        </div>
      )}

      <div className="space-y-5" style={{ fontFamily: FONT }}>
        {/* Header */}
        <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-sm">
          <div className="h-[3px] bg-amber-400" />
          <div className="px-5 py-5">
            <div className="flex items-center justify-between gap-4 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0 text-amber-700">
                  <ClipboardList className="w-5 h-5" strokeWidth={2} aria-hidden />
                </div>
                <div>
                  <h1 className="font-semibold text-slate-900 text-[18px] xl:text-xl">{T.title || "Babyeyi Documents"}</h1>
                  <p className="text-[11px] text-slate-500">{session?.schoolName || "School"}</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <p className="text-[9px] font-medium uppercase tracking-widest text-slate-400">{T.language || "Language"}</p>
                <LangSwitcher
                  lang={lang}
                  setLang={handleLangChange}
                  compact
                  mtLoading={machineActive && mtLoading}
                  moreHint={T.moreLanguagesHint}
                  searchPlaceholder="Search language or code…"
                />
                {machineActive && mtError && (
                  <p className="text-[9px] text-red-500 max-w-[200px] text-right">{mtError}</p>
                )}
                {machineActive && !mtLoading && !mtError && (
                  <p className="text-[9px] text-slate-400 max-w-[220px] text-right leading-tight">{T.machineTranslateNote}</p>
                )}
              </div>
            </div>
            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 xl:gap-3">
              {[
                { label: T.total || "Total", value: stats.total, color: "text-[#000435]" },
                { label: T.approved || "Approved", value: stats.approved, color: "text-[#000435]" },
                { label: T.pending || "Pending", value: stats.pending, color: "text-[#000435]" },
                { label: T.rejected || "Rejected", value: stats.rejected, color: "text-[#000435]" },
              ].map(s => (
                <div key={s.label} className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-center">
                  <p className={`text-xl xl:text-2xl font-semibold ${s.color}`}>{s.value}</p>
                  <p className="text-[10px] text-slate-500 font-medium">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Search + filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none w-[15px] h-[15px]" strokeWidth={2} aria-hidden />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder={T.searchPlaceholder || "Search by class, term, year, doc ID…"}
              className="w-full pl-9 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-[13px] text-slate-700 placeholder:text-slate-400 outline-none focus:border-amber-400/60 transition-all" style={{ fontFamily: FONT }} />
            {search && (
              <button type="button" onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded" aria-label="Clear search">
                <X className="w-4 h-4" strokeWidth={2.5} />
              </button>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            <button type="button" onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl font-bold text-[12px] border-2 transition-all ${
                showFilters || activeFilters > 0
                  ? "bg-amber-400 text-[#000435] border-amber-400"
                  : "bg-white text-slate-600 border-slate-200 hover:border-amber-300"
              }`} style={{ fontFamily: FONT }}>
              <SlidersHorizontal className="w-3.5 h-3.5 shrink-0 opacity-90" strokeWidth={2.25} aria-hidden />
              {T.filters || "Filters"} {activeFilters > 0 && <span className={`w-5 h-5 rounded-full text-[10px] font-semibold flex items-center justify-center ${showFilters || activeFilters>0?"bg-[#000435] text-amber-400":"bg-amber-400 text-[#000435]"}`}>{activeFilters}</span>}
            </button>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
              className="px-3 py-3 bg-white border border-slate-200 rounded-xl text-[12px] text-slate-700 font-medium outline-none focus:border-amber-400/50 cursor-pointer" style={{ fontFamily: FONT }}>
              <option value="date_desc">{T.newestFirst || "Newest first"}</option>
              <option value="date_asc">{T.oldestFirst || "Oldest first"}</option>
              <option value="fee_desc">{T.highestFee || "Highest fee"}</option>
              <option value="fee_asc">{T.lowestFee || "Lowest fee"}</option>
            </select>
          </div>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="rounded-2xl bg-white border border-slate-200 p-4" style={{ fontFamily: FONT }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-medium uppercase tracking-widest text-slate-500">{T.filters || "Filters"}</p>
              {activeFilters > 0 && (
                <button type="button" onClick={() => setFilters({ status:"", level:"", term:"", year:"" })} className="text-[11px] text-red-400 font-bold flex items-center gap-1">
                  <X className="w-3 h-3" strokeWidth={2.5} aria-hidden /> {T.clearAll || "Clear all"}
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { key: "status", label: T.status || "Status", opts: ["","approved","pending","recommended","rejected","draft","submitted"], labels: [T.allOption || "All", T.status_approved || "Approved", T.status_pending || "Pending", T.status_recommended || "Recommended", T.status_rejected || "Rejected", T.status_draft || "Draft", T.status_submitted || "Submitted"] },
                { key: "level", label: T.level || "Level", opts: ["","Nursery","Primary","Secondary","University"], labels: [T.allOption || "All", "Nursery", "Primary", "Secondary", "University"] },
                { key: "term", label: T.term || "Term", opts: ["","Term 1","Term 2","Term 3"], labels: [T.allOption || "All", "Term 1", "Term 2", "Term 3"] },
                { key: "year", label: T.year || "Year", opts: ["","2025","2026","2024"], labels: [T.allOption || "All", "2025", "2026", "2024"] },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-[10px] font-medium uppercase tracking-widest text-slate-500 mb-1">{f.label}</label>
                  <select value={filters[f.key]} onChange={e => setFilters(p => ({ ...p, [f.key]: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[12px] text-slate-700 font-medium outline-none focus:border-amber-400/50 cursor-pointer" style={{ fontFamily: FONT }}>
                    {f.opts.map((o, i) => <option key={o} value={o}>{f.labels[i]}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Result count */}
        <div className="flex items-center justify-between">
          <p className="text-[12px] font-medium text-slate-500" style={{ fontFamily: FONT }}>
            {filtered.length} {filtered.length !== 1 ? (T.recordsPlural || "records") : (T.records || "record")}
            {(search || activeFilters > 0) && <span className="text-amber-400"> — {T.filtered ? String(T.filtered).replace(/^\(|\)$/g, "") : "filtered"}</span>}
          </p>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="text-center py-20">
            <div className="w-12 h-12 border-2 border-amber-400/20 border-t-amber-400 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-500 font-medium text-[13px]" style={{ fontFamily: FONT }}>{T.loading || "Loading…"}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 rounded-2xl bg-white border border-slate-200">
            <div className="text-slate-300 mb-4"><ClipboardList className="mx-auto w-14 h-14 opacity-25" strokeWidth={1.25} aria-hidden /></div>
            <p className="font-medium text-slate-500 text-lg" style={{ fontFamily: FONT }}>{T.noRecords || "No records found"}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((rec, i) => (
              <div key={rec.id} className="card-enter" style={{ animationDelay: `${i * 50}ms` }}>
                <BabyeyiCard rec={rec} onView={handleView} onEdit={handleEdit} onDelete={setDeleting} onShare={handleShare} T={T} lang={lang} />
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}