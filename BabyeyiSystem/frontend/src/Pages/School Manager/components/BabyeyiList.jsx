// ================================================================
// BabyeyiList.jsx — v12 redesign
// #000435 navy + amber-400 · MTN font · Tailwind only · Mobile-first
// ================================================================

import { useState, useEffect, useRef, useCallback } from "react";
import { WizardContent } from "./UpdateBabyeyi";
import { parseTranslationsJson } from "../../../utils/applyBabyeyiTranslations";
import { getLegacyBabyeyiUI, getParentMessageForDisplay, getStatusLabelSafe } from "../../../i18n";

const FONT = `"MTN Brighter Sans","Nunito","Varela Round",sans-serif`;
const API_BASE        = "http://localhost:5100/api";
const ASSET_BASE      = "http://localhost:5100";
const FRONTEND_ORIGIN = typeof window !== "undefined" ? window.location.origin : "http://localhost:5174";
const verifyUrl = (docId) => docId ? `${FRONTEND_ORIGIN}/babyeyi/verify/${docId}` : "";

// ── Translation dicts ─────────────────────────────────────────
const LANGS = {
  en: { flag: "🇬🇧", name: "English", code: "en" },
  rw: { flag: "🇷🇼", name: "Kinyarwanda", code: "rw" },
  fr: { flag: "🇫🇷", name: "Français", code: "fr" },
};

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

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement("script"); s.src = src; s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });
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
  approved:    { label:"Approved",    bg:"bg-emerald-500/15", text:"text-emerald-400",  dot:"bg-emerald-400",  border:"border-emerald-500/25" },
  pending:     { label:"Pending",     bg:"bg-amber-400/15",   text:"text-amber-400",    dot:"bg-amber-400",    border:"border-amber-400/25" },
  recommended: { label:"Recommended", bg:"bg-blue-500/15",    text:"text-blue-400",     dot:"bg-blue-400",     border:"border-blue-500/25" },
  rejected:    { label:"Rejected",    bg:"bg-red-500/15",     text:"text-red-400",      dot:"bg-red-500",      border:"border-red-500/25" },
  draft:       { label:"Draft",       bg:"bg-white/8",        text:"text-white/50",     dot:"bg-white/40",     border:"border-white/15" },
  submitted:   { label:"Submitted",   bg:"bg-blue-500/15",    text:"text-blue-400",     dot:"bg-blue-400",     border:"border-blue-500/25" },
};

const BLOCKED_STATUSES = new Set(["pending","draft","submitted"]);
const isBlocked = (s) => BLOCKED_STATUSES.has(s);

export function buildWordDocHTML({ rec, totalFee, today, schoolLogoB64, otherLogoB64, sigB64, stampB64, qrB64, vUrl, lang = "en" }) {
  const T = getLegacyBabyeyiUI(lang);
  const parentMsg = getParentMessageForDisplay(rec, lang, T);
  const payments = Array.isArray(rec.payments) ? rec.payments : [];
  const classNotes = Array.isArray(rec.classNotes) ? rec.classNotes : [];
  const reqs = Array.isArray(rec.requirements) ? rec.requirements : [];
  const otherInfos = Array.isArray(rec.otherInfos) ? rec.otherInfos : [];
  const leaders = Array.isArray(rec.leaders) ? rec.leaders : [];
  const banks = parseBanks(rec);
  const classesArr = Array.isArray(rec.classes) && rec.classes.length ? rec.classes : [rec.class];
  const classLabel = classesArr.filter(Boolean).join(", ");
  const levelLabel = rec.level || rec.education_level || "";
  const tblStyle = `width:100%;border-collapse:collapse;margin-top:8px`;
  const thS = `padding:8px 12px;font-size:12px;font-weight:700;color:#1e3a5f;border-bottom:2px solid #1e3a5f;text-align:left;background:transparent`;
  const tdS = `padding:7px 12px;font-size:12px;color:#1e293b;border-bottom:1px solid #e2e8f0;background:transparent`;
  const hdg = (title) => `<div style="padding-bottom:5px;margin-bottom:12px;margin-top:20px"><span style="font-size:14px;font-weight:700;color:#1e3a5f;text-transform:uppercase;letter-spacing:0.05em">${title}</span></div>`;

  const parentSection = parentMsg ? `<div style="margin-bottom:22px">${hdg(T.parentMessageHeading)}<div style="padding-left:16px;margin-top:4px"><p style="font-size:12px;color:#1e293b;line-height:1.7;white-space:pre-line;margin:0">${parentMsg}</p></div></div>` : "";
  const payRows = payments.map((p,i) => `<tr><td style="${tdS};text-align:center;color:#64748b;width:42px">${i+1}</td><td style="${tdS}">${p.name||""}</td><td style="${tdS};text-align:right;font-family:monospace;font-weight:600">${Number(p.amount||0).toLocaleString()}</td></tr>`).join("");
  const paySection = payments.length > 0 ? `<div style="margin-bottom:22px">${hdg(T.secFee)}<table style="${tblStyle}"><thead><tr><th style="${thS};width:42px;text-align:center">${T.thNo}</th><th style="${thS}">${T.thPaymentItem}</th><th style="${thS};text-align:right">${T.thAmount}</th></tr></thead><tbody>${payRows}</tbody><tfoot><tr><td colspan="2" style="padding:9px 12px;font-size:14px;font-weight:700;color:#1e3a5f;border-top:2px solid #1e3a5f">${T.thTotalLabel}</td><td style="padding:9px 12px;font-size:14px;font-weight:700;color:#1e3a5f;border-top:2px solid #1e3a5f;text-align:right;font-family:monospace">RWF ${totalFee.toLocaleString()}</td></tr></tfoot></table></div>` : "";
  const bankRows = banks.map((bk,i) => `<tr><td style="${tdS};text-align:center;color:#64748b;width:40px">${i+1}</td><td style="${tdS};font-weight:600">${bk.bankName||"—"}</td><td style="${tdS};font-family:monospace">${bk.accountNumber||"—"}</td><td style="${tdS}">${bk.accountName||"—"}</td><td style="${tdS};text-align:center;color:#059669;font-weight:700">${bk.isPrimary||i===0?"✓":""}</td></tr>`).join("");
  const banksSection = banks.length > 0 ? `<div style="margin-bottom:22px">${hdg(T.secBanking)}<table style="${tblStyle}"><thead><tr><th style="${thS};width:40px;text-align:center">#</th><th style="${thS}">Bank</th><th style="${thS}">Account</th><th style="${thS}">Name</th><th style="${thS};text-align:center;width:70px">Primary</th></tr></thead><tbody>${bankRows}</tbody></table></div>` : "";
  const reqRows = reqs.map((r,i) => `<tr><td style="${tdS};text-align:center;color:#64748b;width:42px">${i+1}</td><td style="${tdS}">${(r&&r.item)||r||""}</td><td style="${tdS}">${(r&&r.description)||""}</td><td style="${tdS};text-align:center">${(r&&r.quantity)||""}</td></tr>`).join("");
  const reqSection = reqs.length > 0 ? `<div style="margin-bottom:22px">${hdg(T.secRequirements)}<table style="${tblStyle}"><thead><tr><th style="${thS};width:42px;text-align:center">#</th><th style="${thS}">Item</th><th style="${thS}">Description</th><th style="${thS};text-align:center;width:80px">Qty</th></tr></thead><tbody>${reqRows}</tbody></table></div>` : "";
  const otherRows = otherInfos.map((n,i) => `<tr><td style="${tdS};text-align:center;color:#64748b;width:42px">${i+1}</td><td style="${tdS};font-weight:600">${n.item||""}</td><td style="${tdS}">${n.details||""}</td></tr>`).join("");
  const otherSection = otherInfos.length > 0 ? `<div style="margin-bottom:22px">${hdg(T.secOtherInfo)}<table style="${tblStyle}"><thead><tr><th style="${thS};width:42px;text-align:center">#</th><th style="${thS}">Item</th><th style="${thS}">Details</th></tr></thead><tbody>${otherRows}</tbody></table></div>` : "";
  const leaderRows = leaders.map((l,i) => `<tr><td style="${tdS};text-align:center;color:#64748b;width:36px;font-size:11px">${i+1}</td><td style="${tdS};font-weight:700;color:#1e3a5f">${l.name||"—"}</td><td style="${tdS};color:#475569;font-style:italic">${l.role||"—"}</td><td style="${tdS};font-family:monospace;font-size:11px">${l.phone?`+250 ${l.phone}`:"—"}</td><td style="${tdS};font-size:11px;color:#2563eb">${l.email||"—"}</td></tr>`).join("");
  const leadersSection = leaders.length > 0 ? `<div style="margin-bottom:22px">${hdg(T.secLeadership)}<table style="${tblStyle}"><thead><tr><th style="${thS};width:36px;text-align:center">#</th><th style="${thS}">Full Name</th><th style="${thS}">Role</th><th style="${thS}">Phone</th><th style="${thS}">Email</th></tr></thead><tbody>${leaderRows}</tbody></table></div>` : "";
  const noteRows = classNotes.map((n,i) => `<tr><td style="${tdS};text-align:center;color:#64748b;width:42px">${i+1}</td><td style="${tdS};font-weight:600">${n.item||""}</td><td style="${tdS}">${n.details||"—"}</td></tr>`).join("");
  const notesSection = classNotes.length > 0 ? `<div style="margin-bottom:22px">${hdg(T.secClassNotes)}<table style="${tblStyle}"><thead><tr><th style="${thS};width:42px;text-align:center">#</th><th style="${thS}">Item</th><th style="${thS}">Details</th></tr></thead><tbody>${noteRows}</tbody></table></div>` : "";
  const qrBlock = qrB64 ? `<div style="display:flex;flex-direction:column;align-items:center;gap:4px"><div style="background:white;border:1px solid #e2e8f0;padding:6px;border-radius:6px"><img src="${qrB64}" style="width:80px;height:80px;object-fit:contain;display:block"/></div><p style="font-size:10px;color:#1e3a5f;font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin:0">${T.sigScanVerify}</p>${rec.docId?`<p style="font-size:10px;color:#64748b;font-family:monospace;margin:0">ID: ${rec.docId}</p>`:""}</div>` : `<div style="width:80px;height:80px;border:1px dashed #e2e8f0;display:flex;align-items:center;justify-content:center"><span style="font-size:20px;opacity:.1">▣</span></div>`;
  const schoolLogoHtml = schoolLogoB64 ? `<img src="${schoolLogoB64}" style="width:92px;height:92px;object-fit:contain;display:block"/>` : `<div style="width:92px;height:92px;display:flex;align-items:center;justify-content:center;border:1px dashed #e2e8f0"><span style="font-size:8px;color:#64748b;text-align:center;font-weight:700">SCHOOL LOGO</span></div>`;
  const otherLogoHtml = otherLogoB64 ? `<img src="${otherLogoB64}" style="width:70px;height:70px;object-fit:contain;display:block"/>` : "";
  return `<div style="width:794px;background:#fff;font-family:Georgia,'Times New Roman',serif;color:#1e293b"><div style="height:3px;background:#1e3a5f"></div><div style="padding:20px 40px 16px;border-bottom:2px solid #1e3a5f"><div style="display:flex;align-items:center;gap:20px"><div style="flex-shrink:0;width:110px;height:110px;display:flex;align-items:center;justify-content:center">${schoolLogoHtml}</div><div style="flex:1;text-align:center"><p style="font-size:10px;color:#64748b;margin:0 0 2px;letter-spacing:0.08em;text-transform:uppercase;font-weight:600">${T.republic}</p><p style="font-size:9px;color:#64748b;margin:0 0 2px">${T.district}: ${rec.district||"—"}</p><p style="font-size:9px;color:#64748b;margin:0 0 6px">${T.sector}: ${rec.sector||"—"}</p><h1 style="font-size:17px;font-weight:700;color:#1e3a5f;margin:0 0 6px;text-transform:uppercase;letter-spacing:.03em">${rec.schoolName||""}</h1><div style="display:flex;flex-wrap:wrap;gap:16px;align-items:center;justify-content:center">${[[T.academicYear,rec.academicYear],[T.termLabel,rec.term],[T.levelLabel,levelLabel],[T.classLabel,classLabel]].map(([l,v])=>`<span style="font-size:12px;color:#1e293b"><strong style="color:#1e3a5f">${l}:</strong> ${v||"—"}</span>`).join("")}${rec.docId?`<span style="font-size:11px;font-family:monospace;font-weight:700;color:#3730a3;padding:1px 8px">${rec.docId}</span>`:""}</div></div><div style="flex-shrink:0;width:80px;height:80px;display:flex;align-items:center;justify-content:center;overflow:hidden">${otherLogoHtml}</div></div></div><div style="padding:20px 40px 28px">${parentSection}${paySection}${banksSection}${reqSection}${otherSection}${leadersSection}${notesSection}<div style="margin-bottom:22px"><div style="border-bottom:1.5px solid #1e3a5f;padding-bottom:5px;margin-bottom:12px;margin-top:20px"><span style="font-size:14px;font-weight:700;color:#1e3a5f;text-transform:uppercase;letter-spacing:0.05em">${T.secAuth}</span></div><div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;margin-top:12px"><div style="border:1px solid #e2e8f0;padding:14px;text-align:center"><p style="font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;margin:0 0 8px">${T.sigHeadTeacher}</p><div style="height:52px;display:flex;align-items:flex-end;justify-content:center;padding-bottom:4px">${sigB64?`<img src="${sigB64}" style="max-height:48px;max-width:140px;object-fit:contain"/>`:`<div style="width:100%;height:1px;border-bottom:1px solid #cbd5e1"></div>`}</div><p style="font-size:11px;color:#94a3b8;margin:4px 0 0">${sigB64?T.sigSigned:T.sigRequired}</p></div><div style="border:1px solid #e2e8f0;padding:14px;display:flex;flex-direction:column;align-items:center;justify-content:center">${qrBlock}</div><div style="border:1px solid #e2e8f0;padding:14px;text-align:center"><p style="font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;margin:0 0 8px">${T.sigStamp}</p><div style="width:80px;height:80px;border:1px dashed #e2e8f0;border-radius:50%;display:flex;align-items:center;justify-content:center;overflow:hidden;margin:0 auto 6px">${stampB64?`<img src="${stampB64}" style="width:76px;height:76px;object-fit:contain;border-radius:50%"/>`:`<span style="font-size:22px;opacity:.08">🔏</span>`}</div><p style="font-size:11px;color:#94a3b8;margin:0">${T.sigCachet}</p></div></div></div></div><div style="border-top:1px solid #1e3a5f;padding:8px 40px;display:flex;justify-content:space-between;align-items:center"><span style="font-size:11px;color:#64748b">${rec.schoolName||""} · ${rec.district||""}</span><span style="font-size:11px;color:#1e3a5f;font-weight:700;text-transform:uppercase">${T.docOfficial}</span><span style="font-size:11px;color:#64748b">${T.docFooterLeft} ${rec.docId||"—"} · ${today}</span></div><div style="height:3px;background:#1e3a5f"></div></div>`;
}

// ── Capture doc image ─────────────────────────────────────────
async function captureDocAsImage({ rec, schoolLogoB64, otherLogoB64, sigB64, stampB64, qrB64, vUrl, lang = "en" }) {
  await loadScript("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js");
  const payments = Array.isArray(rec.payments) ? rec.payments : [];
  const totalFee = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
  const today = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  const html = buildWordDocHTML({ rec, totalFee, today, schoolLogoB64, otherLogoB64, sigB64, stampB64, qrB64, vUrl, lang });
  const style = document.createElement("style");
  style.textContent = `#__by_c__ * { box-sizing:border-box; color-scheme:light only; } #__by_c__ { all:initial;display:block;background:#fff; }`;
  document.head.appendChild(style);
  const host = document.createElement("div");
  host.style.cssText = "position:fixed;left:-9999px;top:0;width:794px;background:#fff;z-index:-9999;";
  const root = document.createElement("div"); root.id = "__by_c__"; root.innerHTML = html;
  host.appendChild(root); document.body.appendChild(host);
  try {
    await new Promise(r => setTimeout(r, 500));
    const canvas = await window.html2canvas(root, { scale: 2, useCORS: true, allowTaint: false, backgroundColor: "#fff", logging: false });
    return canvas.toDataURL("image/jpeg", 0.95);
  } finally { document.body.removeChild(host); document.head.removeChild(style); }
}

// ── QR helpers ────────────────────────────────────────────────
async function ensureQRCode(rec) {
  if (!rec?.id) return null;
  try {
    const res = await fetch(`${API_BASE}/babyeyi/${rec.id}/qrcode`, { credentials: "include" });
    const json = await res.json();
    if (json.success && json.data?.qr_code_url) return { qrUrl: json.data.qr_code_url, vUrl: json.data.qr_view_url || verifyUrl(rec.docId) };
  } catch {}
  try {
    const res = await fetch(`${API_BASE}/babyeyi/${rec.id}/regenerate-docs`, { method: "POST", credentials: "include" });
    const json = await res.json();
    if (json.success) {
      const qrRes = await fetch(`${API_BASE}/babyeyi/${rec.id}/qrcode`, { credentials: "include" });
      const qrJson = await qrRes.json();
      if (qrJson.success && qrJson.data?.qr_code_url) return { qrUrl: qrJson.data.qr_code_url, vUrl: qrJson.data.qr_view_url || verifyUrl(rec.docId) };
    }
  } catch {}
  return null;
}

// ── Language switcher ─────────────────────────────────────────
function LangSwitcher({ lang, setLang, compact = false }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);
  const current = LANGS[lang];
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-black transition-all border ${
          open ? "bg-amber-400 text-[#000435] border-amber-400" : "bg-white/8 text-white border-white/15 hover:bg-white/14"
        }`}
        style={{ fontFamily: FONT }}>
        <span className="text-[13px]">{current.flag}</span>
        <span className="hidden sm:inline">{current.name}</span>
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M6 9l6 6 6-6"/></svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1.5 rounded-2xl shadow-2xl z-50 min-w-[150px] bg-[#000435] border border-amber-400/30 overflow-hidden">
          {Object.values(LANGS).map(l => (
            <button key={l.code} onClick={() => { setLang(l.code); setOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-[12px] font-bold transition-all text-left ${
                lang === l.code ? "bg-amber-400/15 text-amber-400" : "text-white/70 hover:bg-white/8"
              }`} style={{ fontFamily: FONT }}>
              <span className="text-[14px]">{l.flag}</span> {l.name}
              {lang === l.code && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-400" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Share modal ───────────────────────────────────────────────
function ShareModal({ rec, onClose, schoolLogoB64, otherLogoB64, sigB64, stampB64, qrB64, vUrl, lang = "en", T }) {
  const [step, setStep] = useState("capturing");
  const [imgUrl, setImgUrl] = useState(null);
  const [errMsg, setErrMsg] = useState(null);
  const shareVerifyUrl = vUrl || verifyUrl(rec.docId);

  useEffect(() => {
    captureDocAsImage({ rec, schoolLogoB64, otherLogoB64, sigB64, stampB64, qrB64, vUrl: shareVerifyUrl, lang })
      .then(url => { setImgUrl(url); setStep("ready"); })
      .catch(e => { setErrMsg(e.message); setStep("error"); });
  }, []);

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
      <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl bg-[#000435] border-2 border-amber-400/30 flex flex-col max-h-[92vh]" style={{ fontFamily: FONT }}>
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between shrink-0 bg-[#000435]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-400/15 flex items-center justify-center text-xl">📤</div>
            <div>
              <p className="font-black text-white text-[14px]">Share Document</p>
              <p className="text-[10px] text-white/40">{rec.class} · {rec.docId || rec.id} · {LANGS[lang]?.flag}</p>
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
                <p className="text-white/50 text-[12px]">Rendering document…</p>
              </div>
            )}
            {step === "error" && <p className="text-red-400 text-[12px] text-center p-4">❌ {errMsg}</p>}
            {step === "ready" && imgUrl && (
              <img src={imgUrl} className="w-full max-h-[250px] object-cover object-top" alt="Preview" />
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={shareWhatsApp} disabled={step !== "ready"}
              className="flex items-center justify-center gap-2 py-3.5 rounded-xl text-[13px] font-black text-white disabled:opacity-40 transition-all"
              style={{ background: step === "ready" ? "linear-gradient(135deg,#25D366,#128C7E)" : "#1a2035" }}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              {T.whatsapp || "WhatsApp"}
            </button>
            <button onClick={downloadImage} disabled={step !== "ready"}
              className="flex items-center justify-center gap-2 py-3.5 rounded-xl text-[13px] font-black text-[#000435] bg-amber-400 hover:bg-amber-300 disabled:opacity-40 transition-all">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
              Save Image
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

// ── Official doc modal ────────────────────────────────────────
function OfficialDoc({ rec: originalRec, onClose, globalLang }) {
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

  const rec = originalRec;
  const T = getLegacyBabyeyiUI(lang);
  const parentMsg = getParentMessageForDisplay(rec, lang, T);
  const payments = Array.isArray(rec.payments) ? rec.payments : [];
  const totalFee = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
  const today = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  const st = { ...(STATUS_CFG[rec.status] || STATUS_CFG.draft), label: getStatusLabelSafe(lang, rec.status) };
  const blocked = isBlocked(rec.status);
  const banks = parseBanks(rec);
  const classesArr = Array.isArray(rec.classes) && rec.classes.length ? rec.classes : [rec.class];
  const classLabel = classesArr.filter(Boolean).join(", ");
  const levelLabel = rec.level || rec.education_level || "";
  const reqs = Array.isArray(rec.requirements) ? rec.requirements : [];
  const otherInfos = Array.isArray(rec.otherInfos) ? rec.otherInfos : [];
  const leaders = Array.isArray(rec.leaders) ? rec.leaders : [];
  const classNotes = Array.isArray(rec.classNotes) ? rec.classNotes : [];

  useEffect(() => {
    Promise.all([
      toBase64(toAssetUrl(originalRec.schoolLogoPath)),
      toBase64(toAssetUrl(originalRec.otherLogoPath)),
      toBase64(toAssetUrl(originalRec.signaturePath)),
      toBase64(toAssetUrl(originalRec.stampPath)),
    ]).then(([logo, otherLogo, sig, stamp]) => { setSchoolLogoB64(logo); setOtherLogoB64(otherLogo); setSigB64(sig); setStampB64(stamp); });
    setQrLoading(true);
    ensureQRCode(originalRec).then(async result => {
      if (result) { const b64 = await toBase64(toAssetUrl(result.qrUrl)); setQrB64(b64); setVUrl(result.vUrl); }
    }).finally(() => setQrLoading(false));
  }, [originalRec.id]);

  useEffect(() => { if (globalLang) setLang(globalLang); }, [globalLang, originalRec?.id]);

  const handleLangChange = (newLang) => { setLang(newLang); try { localStorage.setItem("babyeyi_lang", newLang); } catch {} };

  const handlePDF = async () => {
    if (blocked) return;
    setDownloading(true);
    try {
      await loadScript("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js");
      await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");
      const html = buildWordDocHTML({ rec, totalFee, today, schoolLogoB64, otherLogoB64, sigB64, stampB64, qrB64, vUrl, lang });
      const style = document.createElement("style");
      style.textContent = `#__by_p__ * { box-sizing:border-box; color-scheme:light only; } #__by_p__ { all:initial;display:block;background:#fff; }`;
      document.head.appendChild(style);
      const host = document.createElement("div");
      host.style.cssText = "position:fixed;left:-9999px;top:0;width:794px;background:#fff;z-index:-9999;";
      const root = document.createElement("div"); root.id = "__by_p__"; root.innerHTML = html;
      host.appendChild(root); document.body.appendChild(host);
      try {
        await new Promise(r => setTimeout(r, 500));
        const canvas = await window.html2canvas(root, { scale: 2, useCORS: true, backgroundColor: "#fff", logging: false, windowWidth: 794 });
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
        const pW = 210, pH = 297;
        const imgH = (canvas.height / canvas.width) * pW;
        if (imgH <= pH) { pdf.addImage(canvas.toDataURL("image/jpeg", 0.95), "JPEG", 0, 0, pW, imgH); }
        else {
          let yPos = 0, page = 0;
          while (yPos < imgH) {
            if (page > 0) pdf.addPage();
            const srcYPx = Math.floor((yPos / imgH) * canvas.height);
            const sliceHPx = Math.min(Math.ceil((pH / imgH) * canvas.height), canvas.height - srcYPx);
            if (sliceHPx <= 0) break;
            const sl = document.createElement("canvas"); sl.width = canvas.width; sl.height = sliceHPx;
            sl.getContext("2d").drawImage(canvas, 0, srcYPx, canvas.width, sliceHPx, 0, 0, canvas.width, sliceHPx);
            pdf.addImage(sl.toDataURL("image/jpeg", 0.95), "JPEG", 0, 0, pW, (sliceHPx / canvas.height) * imgH);
            yPos += pH; page++;
          }
        }
        pdf.save(`Babyeyi-${rec.docId || rec.class}-${rec.term}${lang !== "en" ? `-${lang.toUpperCase()}` : ""}.pdf`);
      } finally { document.body.removeChild(host); document.head.removeChild(style); }
    } catch (e) { alert("PDF error: " + e.message); }
    finally { setDownloading(false); }
  };

  const handleRegen = async () => {
    setRegenerating(true);
    try {
      const res = await fetch(`${API_BASE}/babyeyi/${originalRec.id}/regenerate-docs?lang=${encodeURIComponent(lang)}`, { method: "POST", credentials: "include" });
      const json = await res.json();
      if (json.success) {
        const result = await ensureQRCode(originalRec);
        if (result) { const b64 = await toBase64(toAssetUrl(result.qrUrl)); setQrB64(b64); setVUrl(result.vUrl); }
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
            <p className="text-white font-black text-[13px] truncate">
              {rec.schoolName} — {levelLabel} · {classLabel} · {rec.term} · {rec.academicYear}
              {rec.docId && <span className="ml-2 px-2 py-0.5 bg-amber-400/15 text-amber-400 rounded text-[8px] font-mono">{rec.docId}</span>}
            </p>
          </div>
          <LangSwitcher lang={lang} setLang={handleLangChange} compact />
          <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black border shrink-0 ${st.bg} ${st.text} ${st.border}`}>
            <span className={`w-1.5 h-1.5 rounded-full inline-block ${st.dot}`} /> {st.label}
          </span>
          {rec.docId && (
            <a href={verifyUrl(rec.docId)} target="_blank" rel="noreferrer"
              className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 rounded-xl text-[10px] font-bold shrink-0 hover:bg-emerald-500/25">
              ✓ Verify
            </a>
          )}
          <button onClick={handleRegen} disabled={regenerating}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-white/8 border border-white/15 text-white/70 rounded-xl text-[10px] font-bold disabled:opacity-50 shrink-0 hover:bg-white/14">
            {regenerating ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "↻"} Regen
          </button>
          {!blocked ? (
            <button onClick={() => setShowShare(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-bold shrink-0 text-white"
              style={{ background: "linear-gradient(135deg,#25D366,#128C7E)" }}>
              <svg viewBox="0 0 24 24" width="11" height="11" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              {T.share || "Share"}
            </button>
          ) : (
            <span className="flex items-center gap-1 px-2.5 py-1.5 bg-white/5 text-white/30 rounded-xl text-[10px] font-bold shrink-0">🔒 {T.locked || "Locked"}</span>
          )}
          {!blocked ? (
            <button onClick={handlePDF} disabled={downloading}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white rounded-xl text-[10px] font-bold shrink-0">
              {downloading ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "📄"} {T.pdfBtn || "PDF"} {lang !== "en" ? LANGS[lang]?.flag : ""}
            </button>
          ) : (
            <span className="flex items-center gap-1 px-2.5 py-1.5 bg-white/5 text-white/30 rounded-xl text-[10px] font-bold shrink-0">🔒 PDF</span>
          )}
        </div>

        {blocked && (
          <div className="bg-amber-400/10 border-x border-amber-400/20 px-4 py-2 flex items-center gap-2">
            <span className="text-amber-400 text-[11px]">🔒</span>
            <p className="text-amber-400 text-[10px] font-bold">{T.lockedPdfWhatsapp || "PDF and sharing locked until approved."}</p>
          </div>
        )}

        {/* Doc body — white background for official doc look */}
        <div className="bg-white shadow-2xl rounded-b-2xl overflow-hidden" style={{ fontFamily: "Georgia,'Times New Roman',serif" }}>
          <div style={{ height: "3px", background: "#1e3a5f" }} />
          {/* Header */}
          <div style={{ padding: "20px 40px 16px", borderBottom: "2px solid #1e3a5f" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
              <div style={{ flexShrink: 0, width: "110px", height: "110px", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                {schoolLogoB64 ? <img src={schoolLogoB64} style={{ width: "110px", height: "110px", objectFit: "contain" }} alt="Logo" /> : <span style={{ fontSize: "8px", color: "#64748b", textAlign: "center", fontWeight: 700, padding: "4px" }}>SCHOOL LOGO</span>}
              </div>
              <div style={{ flex: 1, textAlign: "center" }}>
                <p style={{ fontSize: "10px", color: "#64748b", margin: "0", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600, lineHeight: "1.8" }}>{T.republic}</p>
                <p style={{ fontSize: "10px", color: "#64748b", margin: "0", lineHeight: "1.8" }}>{T.district}: <strong style={{ color: "#1e3a5f" }}>{rec.district || "—"}</strong></p>
                <p style={{ fontSize: "10px", color: "#64748b", margin: "0 0 6px", lineHeight: "1.8" }}>{T.sector}: <strong style={{ color: "#1e3a5f" }}>{rec.sector || "—"}</strong></p>
                <h1 style={{ fontSize: "17px", fontWeight: 700, color: "#1e3a5f", margin: "0 0 6px", textTransform: "uppercase", letterSpacing: ".03em" }}>{rec.schoolName}</h1>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "14px", alignItems: "center", justifyContent: "center", marginBottom: "8px" }}>
                  {[[T.academicYear, rec.academicYear], [T.termLabel, rec.term], [T.levelLabel, levelLabel], [T.classLabel, classLabel]].map(([l, v], i) => (
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
          <div style={{ padding: "20px 40px 28px" }}>
            {parentMsg && (
              <div style={DOC.section}>
                <div style={{ paddingBottom: "5px", marginBottom: "8px" }}><span style={DOC.heading}>{T.parentMessageHeading}</span></div>
                <p style={{ ...DOC.body, whiteSpace: "pre-line", margin: 0, paddingLeft: "16px" }}>{parentMsg}</p>
              </div>
            )}
            {payments.length > 0 && (
              <div style={DOC.section}>
                <div style={{ paddingBottom: "5px", marginBottom: "12px" }}><span style={DOC.heading}>{T.secFee}</span></div>
                <table style={tblStyle}>
                  <thead><tr><Th w="42px" center>#</Th><Th>{T.thPaymentItem}</Th><Th>Amount</Th></tr></thead>
                  <tbody>{payments.map((p, i) => (<tr key={i}><Td center color="#64748b">{i + 1}</Td><Td>{p.name}</Td><td style={{ ...DOC.td, textAlign: "right", fontFamily: "monospace", fontWeight: 600 }}>{Number(p.amount || 0).toLocaleString()}</td></tr>))}</tbody>
                  <tfoot><tr><td colSpan={2} style={{ padding: "9px 12px", fontSize: "14px", fontWeight: 700, color: "#1e3a5f", borderTop: "2px solid #1e3a5f" }}>{T.thTotalLabel}</td><td style={{ padding: "9px 12px", fontSize: "14px", fontWeight: 700, color: "#1e3a5f", borderTop: "2px solid #1e3a5f", textAlign: "right", fontFamily: "monospace" }}>RWF {totalFee.toLocaleString()}</td></tr></tfoot>
                </table>
              </div>
            )}
            {banks.length > 0 && (
              <div style={DOC.section}>
                <div style={{ paddingBottom: "5px", marginBottom: "12px" }}><span style={DOC.heading}>{T.secBanking}</span></div>
                <table style={tblStyle}>
                  <thead><tr><Th w="40px" center>#</Th><Th>Bank</Th><Th>Account No.</Th><Th>Name</Th><Th w="70px" center>Primary</Th></tr></thead>
                  <tbody>{banks.map((bk, i) => (<tr key={i}><Td center color="#64748b">{i + 1}</Td><Td bold>{bk.bankName || "—"}</Td><Td mono>{bk.accountNumber || "—"}</Td><Td>{bk.accountName || "—"}</Td><Td center color="#059669" bold>{bk.isPrimary || i === 0 ? "✓" : ""}</Td></tr>))}</tbody>
                </table>
              </div>
            )}
            {reqs.length > 0 && (
              <div style={DOC.section}>
                <div style={{ paddingBottom: "5px", marginBottom: "12px" }}><span style={DOC.heading}>{T.secRequirements}</span></div>
                <table style={tblStyle}>
                  <thead><tr><Th w="42px" center>#</Th><Th>Item</Th><Th>Description</Th><Th w="80px" center>Qty</Th></tr></thead>
                  <tbody>{reqs.map((r, i) => (<tr key={i}><Td center color="#64748b">{i + 1}</Td><Td>{(r && r.item) || r}</Td><Td>{r && r.description}</Td><Td center>{r && r.quantity}</Td></tr>))}</tbody>
                </table>
              </div>
            )}
            {otherInfos.length > 0 && (
              <div style={DOC.section}>
                <div style={{ paddingBottom: "5px", marginBottom: "12px" }}><span style={DOC.heading}>{T.secOtherInfo}</span></div>
                <table style={tblStyle}>
                  <thead><tr><Th w="42px" center>#</Th><Th>Item</Th><Th>Details</Th></tr></thead>
                  <tbody>{otherInfos.map((n, i) => (<tr key={i}><Td center color="#64748b">{i + 1}</Td><Td bold>{n.item}</Td><Td>{n.details}</Td></tr>))}</tbody>
                </table>
              </div>
            )}
            {leaders.length > 0 && (
              <div style={DOC.section}>
                <div style={{ paddingBottom: "5px", marginBottom: "12px" }}><span style={DOC.heading}>{T.secLeadership}</span></div>
                <table style={tblStyle}>
                  <thead><tr><Th w="36px" center>#</Th><Th>Full Name</Th><Th>Role</Th><Th>Phone</Th><Th>Email</Th></tr></thead>
                  <tbody>{leaders.map((l, i) => (<tr key={l.id || i}><Td center color="#64748b">{i + 1}</Td><Td bold color="#1e3a5f">{l.name || "—"}</Td><Td italic color="#475569">{l.role || "—"}</Td><td style={{ ...DOC.td, fontFamily: "monospace", fontSize: "11px" }}>{l.phone ? `+250 ${l.phone}` : "—"}</td><td style={{ ...DOC.td, fontSize: "11px", color: "#2563eb" }}>{l.email || "—"}</td></tr>))}</tbody>
                </table>
              </div>
            )}
            {classNotes.length > 0 && (
              <div style={DOC.section}>
                <div style={{ paddingBottom: "5px", marginBottom: "12px" }}><span style={DOC.heading}>{T.secClassNotes}</span></div>
                <table style={tblStyle}>
                  <thead><tr><Th w="42px" center>#</Th><Th>Item</Th><Th>Details</Th></tr></thead>
                  <tbody>{classNotes.map((n, i) => (<tr key={i}><Td center color="#64748b">{i + 1}</Td><Td bold>{n.item}</Td><Td>{n.details || "—"}</Td></tr>))}</tbody>
                </table>
              </div>
            )}
            {/* Auth */}
            <div style={DOC.section}>
              <div style={{ borderBottom: "1.5px solid #1e3a5f", paddingBottom: "5px", marginBottom: "12px" }}><span style={DOC.heading}>{T.secAuth}</span></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px", marginTop: "12px" }}>
                <div style={{ border: "1px solid #e2e8f0", padding: "14px", textAlign: "center" }}>
                  <p style={{ ...DOC.label, textTransform: "uppercase", fontSize: "11px", margin: "0 0 8px" }}>{T.sigHeadTeacher}</p>
                  <div style={{ height: "52px", borderBottom: "1px solid #cbd5e1", display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: "4px", marginBottom: "6px" }}>
                    {sigB64 && <img src={sigB64} style={{ maxHeight: "48px", maxWidth: "140px", objectFit: "contain" }} alt="Sig" />}
                  </div>
                  <p style={{ fontSize: "11px", color: "#94a3b8", margin: 0 }}>{sigB64 ? T.sigSigned : T.sigRequired}</p>
                </div>
                <div style={{ border: "1px solid #e2e8f0", padding: "14px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                  {qrB64 ? (
                    <>
                      <div style={{ background: "white", border: "1px solid #e2e8f0", padding: "4px", borderRadius: "4px" }}>
                        <img src={qrB64} style={{ width: "80px", height: "80px", objectFit: "contain", display: "block" }} alt="QR" />
                      </div>
                      <p style={{ fontSize: "10px", color: "#1e3a5f", fontWeight: 700, margin: "6px 0 0", textTransform: "uppercase", letterSpacing: ".05em" }}>{T.sigScanVerify}</p>
                      {rec.docId && <p style={{ fontSize: "10px", color: "#64748b", margin: "2px 0 0", fontFamily: "monospace" }}>ID: {rec.docId}</p>}
                    </>
                  ) : qrLoading ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-5 h-5 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
                      <span style={{ fontSize: "10px", color: "#4f46e5", fontWeight: 700 }}>Generating…</span>
                    </div>
                  ) : (
                    <div style={{ width: 80, height: 80, border: "1px dashed #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: "22px", opacity: .1 }}>▣</span>
                    </div>
                  )}
                </div>
                <div style={{ border: "1px solid #e2e8f0", padding: "14px", textAlign: "center" }}>
                  <p style={{ ...DOC.label, textTransform: "uppercase", fontSize: "11px", margin: "0 0 8px" }}>{T.sigStamp}</p>
                  <div style={{ width: "80px", height: "80px", border: "1px dashed #e2e8f0", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", margin: "0 auto 6px" }}>
                    {stampB64 ? <img src={stampB64} style={{ width: "76px", height: "76px", objectFit: "contain", borderRadius: "50%" }} alt="Stamp" /> : <span style={{ fontSize: "22px", opacity: .08 }}>🔏</span>}
                  </div>
                  <p style={{ fontSize: "11px", color: "#94a3b8", margin: 0 }}>{T.sigCachet}</p>
                </div>
              </div>
            </div>
          </div>
          <div style={{ height: "3px", background: "#1e3a5f" }} />
        </div>
      </div>

      {showShare && !blocked && (
        <ShareModal rec={rec} onClose={() => setShowShare(false)} schoolLogoB64={schoolLogoB64} otherLogoB64={otherLogoB64} sigB64={sigB64} stampB64={stampB64} qrB64={qrB64} vUrl={vUrl} lang={lang} T={T} />
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ── Edit wizard modal ─────────────────────────────────────────
function EditWizardModal({ rec, session, onClose, onSaved }) {
  useEffect(() => { document.body.style.overflow = "hidden"; return () => { document.body.style.overflow = ""; }; }, []);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-[#000435]/85 backdrop-blur-md"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-[#000435] border-2 border-amber-400/30 rounded-3xl w-full flex flex-col shadow-2xl"
        style={{ maxWidth: "680px", maxHeight: "94vh", overflowY: "auto", animation: "modalIn 0.25s cubic-bezier(0.34,1.56,0.64,1)", fontFamily: FONT }}>
        <div className="px-5 py-4 shrink-0 flex items-center justify-between sticky top-0 z-10 bg-[#000435] border-b border-amber-400/20">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-400/15 border border-amber-400/20 flex items-center justify-center text-[16px]">✏️</div>
            <div>
              <h1 className="font-black text-white text-[14px]">Edit Babyeyi</h1>
              <p className="text-[10px] text-amber-400/60">{rec.class} · {rec.term} · {rec.academicYear}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/8 border border-white/15 text-white/60 hover:text-white hover:bg-white/14">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div style={{ flex: 1, minHeight: 0 }}>
          <WizardContent session={session} editRecord={rec} onClose={onClose} onSuccess={() => { if (onSaved) onSaved(rec); onClose(); }} />
        </div>
      </div>
      <style>{`@keyframes modalIn{from{opacity:0;transform:scale(.95) translateY(12px)}to{opacity:1;transform:scale(1) translateY(0)}} @keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ── Delete modal ──────────────────────────────────────────────
function DeleteModal({ rec, onConfirm, onCancel, T }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" style={{ fontFamily: FONT }}>
      <div className="bg-[#000435] border-2 border-red-500/40 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="bg-red-600 px-5 py-4">
          <p className="font-black text-white text-[14px]">{T.deleteTitle || "Delete Babyeyi"}</p>
          <p className="text-red-100 text-[11px] mt-0.5">{T.deleteWarning || "This action cannot be undone."}</p>
        </div>
        <div className="p-5">
          <div className="rounded-xl border border-white/10 bg-white/4 p-4 mb-4">
            <p className="font-black text-white text-[14px]">{rec.class} · {rec.term} · {rec.academicYear}</p>
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
  const st = { ...(STATUS_CFG[rec.status] || STATUS_CFG.draft), label: getStatusLabelSafe(lang, rec.status) };
  const classes = Array.isArray(rec.classes) && rec.classes.length ? rec.classes : [rec.class];
  const payments = Array.isArray(rec.payments) ? rec.payments : [];
  const fee = rec.totalFee ?? payments.reduce((s, p) => s + Number(p.amount || 0), 0);
  const over = rec.exceedsLimit ? fee - (rec.nesaLimit || 0) : 0;
  const blocked = isBlocked(rec.status);

  return (
    <div className="rounded-2xl border border-amber-400/15 bg-[#000435] overflow-hidden hover:border-amber-400/40 transition-all hover:shadow-lg hover:shadow-black/20" style={{ fontFamily: FONT }}>
      {/* Top accent by status */}
      <div className={`h-[3px] w-full ${rec.status === "approved" ? "bg-emerald-500" : rec.status === "rejected" ? "bg-red-500" : "bg-amber-400"}`} />
      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-amber-400 flex items-center justify-center shrink-0 shadow-md shadow-amber-900/30">
              <span className="text-[#000435] font-black text-[10px] text-center leading-tight">{classes.join(", ")}</span>
            </div>
            <div className="min-w-0">
              <p className="font-black text-white text-[13px] truncate">{rec.term} · {rec.academicYear}</p>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <span className="text-[10px] font-bold text-white/40">{rec.level}</span>
                {rec.docId && <span className="px-1.5 py-0.5 rounded text-[8px] font-mono font-black bg-amber-400/10 text-amber-400 border border-amber-400/20">{rec.docId}</span>}
                {blocked && <span className="text-[9px] font-black text-white/30">🔒</span>}
              </div>
            </div>
          </div>
          <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black border shrink-0 ${st.bg} ${st.text} ${st.border}`}>
            <span className={`w-1.5 h-1.5 rounded-full inline-block ${st.dot}`} /> {st.label}
          </span>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className={`rounded-xl px-3 py-2.5 border ${rec.exceedsLimit ? "bg-red-500/10 border-red-500/25" : "bg-emerald-500/8 border-emerald-500/20"}`}>
            <p className="text-[9px] font-black uppercase tracking-wider text-white/35 mb-0.5">Total Fee</p>
            <p className={`text-[14px] font-black font-mono ${rec.exceedsLimit ? "text-red-400" : "text-emerald-400"}`}>
              {fee.toLocaleString()} <span className="text-[10px]">RWF</span>
            </p>
            {rec.exceedsLimit && <p className="text-[9px] text-red-400/70 font-semibold">+{over.toLocaleString()} over NESA</p>}
          </div>
          <div className="rounded-xl px-3 py-2.5 border bg-white/4 border-white/10">
            <p className="text-[9px] font-black uppercase tracking-wider text-white/35 mb-0.5">Bank</p>
            <p className="text-[11px] font-bold text-white/70 truncate">{rec.bankName || "—"}</p>
            {rec.bankAccountNo && <p className="text-[9px] text-white/30 font-mono truncate">{rec.bankAccountNo}</p>}
          </div>
        </div>

        {/* Action row */}
        <div className="flex items-center gap-2">
          {/* View/PDF */}
          <button onClick={() => onView(rec)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-amber-400 text-[#000435] font-black text-[12px] hover:bg-amber-300 transition-all active:scale-[.98]">
            👁 {T.viewBtn || "View"}
          </button>
          {/* Edit */}
          <button onClick={() => onEdit(rec)}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/8 border border-white/15 text-white/60 hover:text-amber-400 hover:bg-amber-400/10 hover:border-amber-400/30 transition-all"
            title={T.editBtn || "Edit"}>✏️</button>
          {/* Share/WhatsApp */}
          {blocked ? (
            <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/4 text-white/20 cursor-not-allowed">🔒</div>
          ) : (
            <button onClick={() => onShare(rec)}
              className="w-9 h-9 flex items-center justify-center rounded-xl transition-all"
              style={{ background: "#dcfce7", color: "#16a34a" }}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="#16a34a"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            </button>
          )}
          {/* Delete */}
          <button onClick={() => onDelete(rec)}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all">
            🗑
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
  let payments = (d.payments || []).map(p => ({ name: p.name, amount: Number(p.amount || 0) }));
  if (!payments.length && d.payments_json) { try { payments = JSON.parse(d.payments_json); } catch {} }
  const norm = (p) => p ? p.replace(/\\/g, "/") : null;
  const allClassReqs = (d.class_requirements || []).map(r => ({ item: r.item || r.information || "", details: r.details || "" }));
  const classNotes = allClassReqs.filter(r => r.details && r.details.trim());
  const otherInfos = allClassReqs.filter(r => !r.details || !r.details.trim());
  let leaders = [];
  if (Array.isArray(d.leaders) && d.leaders.length) leaders = d.leaders;
  else { try { const lRes = await fetch(`${API_BASE}/babyeyi/${sumRec.id}/leaders`, { credentials: "include" }); const lJson = await lRes.json(); if (lJson.success && Array.isArray(lJson.data)) leaders = lJson.data; } catch {} }
  return {
    ...sumRec, payments,
    requirements: (d.student_requirements || []).map(r => ({ item: r.item, description: r.description || "", quantity: r.quantity || "" })),
    classNotes, otherInfos, leaders, leadersCount: leaders.length,
    increaseRequest: d.increase_request ? { requestTitle: d.increase_request.request_title || d.increase_request.reason, nesaStatus: d.increase_request.nesa_status } : null,
    signaturePath: norm(sig.director_sig_path) || null, stampPath: norm(sig.stamp_path) || null,
    schoolLogoPath: norm(sig.school_logo_path) || norm(sumRec.schoolLogoPath) || null,
    otherLogoPath: norm(sig.other_logo_path) || norm(sumRec.otherLogoPath) || null,
    qrCodeUrl: norm(sig.qr_code_path) || norm(d.qr_code_path) || norm(d.qr_code_url) || null,
    qrViewUrl: sig.qr_view_url || d.qr_view_url || null,
    pdfPath: norm(d.pdf_path) || norm(d.pdf_url) || null,
    docId: d.doc_id || sumRec.docId || null,
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
  const [lang, setLang] = useState(() => { try { return localStorage.getItem("babyeyi_lang") || "en"; } catch { return "en"; } });
  const T = getLegacyBabyeyiUI(lang);
  const handleLangChange = (newLang) => { setLang(newLang); try { localStorage.setItem("babyeyi_lang", newLang); } catch {} };

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

      {viewing && <OfficialDoc key={viewing.id} rec={viewing} onClose={() => setViewing(null)} globalLang={lang} />}
      {editing && <EditWizardModal rec={editing} session={session} onClose={() => setEditing(null)} onSaved={u => { handleSaved(u); setEditing(null); }} />}
      {deleting && <DeleteModal rec={deleting} onConfirm={handleDelete} onCancel={() => setDeleting(null)} T={T} />}
      {sharing && !isBlocked(sharing.status) && <ShareModal rec={sharing} onClose={() => setSharing(null)} schoolLogoB64={null} otherLogoB64={null} sigB64={null} stampB64={null} qrB64={null} vUrl={sharing.qrViewUrl || verifyUrl(sharing.docId)} lang={lang} T={T} />}

      {!schoolId && (
        <div className="bg-red-600 text-white text-center text-[12px] font-bold py-2 px-4 rounded-xl mb-4">School session not found. Please log out and log back in.</div>
      )}

      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-2xl text-[13px] font-bold flex items-center gap-2 max-w-xs border ${
          toast.type === "success" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25" :
          toast.type === "info" ? "bg-amber-400/15 text-amber-400 border-amber-400/25" :
          "bg-red-500/15 text-red-400 border-red-500/25"
        } bg-[#000435]`} style={{ animation: "slideIn .3s ease-out", fontFamily: FONT }}>
          {toast.type === "success" ? "✅" : toast.type === "info" ? "ℹ️" : "❌"} {toast.msg}
        </div>
      )}

      <div className="space-y-5" style={{ fontFamily: FONT }}>
        {/* Header */}
        <div className="rounded-2xl bg-[#000435] border-2 border-amber-400/25 overflow-hidden">
          <div className="h-[3px] bg-amber-400" />
          <div className="px-5 py-5">
            <div className="flex items-center justify-between gap-4 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-400/15 border border-amber-400/20 flex items-center justify-center text-xl">📋</div>
                <div>
                  <h1 className="font-black text-white text-[18px] xl:text-xl">{T.title || "Babyeyi Documents"}</h1>
                  <p className="text-[11px] text-white/40">{session?.schoolName || "School"}</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <p className="text-[9px] font-bold uppercase tracking-widest text-white/35">{T.language || "Language"}</p>
                <LangSwitcher lang={lang} setLang={handleLangChange} compact />
              </div>
            </div>
            {/* Stats row */}
            <div className="grid grid-cols-4 gap-2 xl:gap-3">
              {[
                { label: T.total || "Total", value: stats.total, color: "text-white" },
                { label: T.approved || "Approved", value: stats.approved, color: "text-emerald-400" },
                { label: T.pending || "Pending", value: stats.pending, color: "text-amber-400" },
                { label: T.rejected || "Rejected", value: stats.rejected, color: "text-red-400" },
              ].map(s => (
                <div key={s.label} className="rounded-xl bg-white/4 border border-white/8 p-3 text-center">
                  <p className={`text-xl xl:text-2xl font-black ${s.color}`}>{s.value}</p>
                  <p className="text-[10px] text-white/50 font-bold">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Search + filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0z"/></svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder={T.searchPlaceholder || "Search by class, term, year, doc ID…"}
              className="w-full pl-9 pr-4 py-3 bg-[#000435] border border-amber-400/20 rounded-xl text-[13px] text-white placeholder:text-white/25 outline-none focus:border-amber-400/50 transition-all" style={{ fontFamily: FONT }} />
            {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">✕</button>}
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl font-bold text-[12px] border-2 transition-all ${
                showFilters || activeFilters > 0
                  ? "bg-amber-400 text-[#000435] border-amber-400"
                  : "bg-[#000435] text-white/60 border-white/15 hover:border-amber-400/30"
              }`} style={{ fontFamily: FONT }}>
              ⚙ Filters {activeFilters > 0 && <span className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center ${showFilters || activeFilters>0?"bg-[#000435] text-amber-400":"bg-amber-400 text-[#000435]"}`}>{activeFilters}</span>}
            </button>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
              className="px-3 py-3 bg-[#000435] border border-white/15 rounded-xl text-[12px] text-white/70 font-bold outline-none focus:border-amber-400/40 cursor-pointer" style={{ fontFamily: FONT }}>
              <option value="date_desc">Newest first</option>
              <option value="date_asc">Oldest first</option>
              <option value="fee_desc">Highest fee</option>
              <option value="fee_asc">Lowest fee</option>
            </select>
          </div>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="rounded-2xl bg-[#000435] border border-amber-400/20 p-4" style={{ fontFamily: FONT }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-black uppercase tracking-widest text-white/40">Filters</p>
              {activeFilters > 0 && <button onClick={() => setFilters({ status:"", level:"", term:"", year:"" })} className="text-[11px] text-red-400 font-bold flex items-center gap-1">✕ Clear all</button>}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { key: "status", label: "Status", opts: ["","approved","pending","recommended","rejected","draft"], labels: ["All","Approved","Pending","Recommended","Rejected","Draft"] },
                { key: "level", label: "Level", opts: ["","Nursery","Primary","Secondary","University"], labels: ["All","Nursery","Primary","Secondary","University"] },
                { key: "term", label: "Term", opts: ["","Term 1","Term 2","Term 3"], labels: ["All","Term 1","Term 2","Term 3"] },
                { key: "year", label: "Year", opts: ["","2025","2026","2024"], labels: ["All","2025","2026","2024"] },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-white/35 mb-1">{f.label}</label>
                  <select value={filters[f.key]} onChange={e => setFilters(p => ({ ...p, [f.key]: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-white/4 border border-white/10 rounded-xl text-[12px] text-white font-bold outline-none focus:border-amber-400/40 cursor-pointer" style={{ fontFamily: FONT }}>
                    {f.opts.map((o, i) => <option key={o} value={o}>{f.labels[i]}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Result count */}
        <div className="flex items-center justify-between">
          <p className="text-[12px] font-bold text-white/40" style={{ fontFamily: FONT }}>
            {filtered.length} {filtered.length !== 1 ? (T.recordsPlural || "records") : (T.records || "record")}
            {(search || activeFilters > 0) && <span className="text-amber-400"> — filtered</span>}
          </p>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="text-center py-20">
            <div className="w-12 h-12 border-2 border-amber-400/20 border-t-amber-400 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white/40 font-semibold text-[13px]" style={{ fontFamily: FONT }}>{T.loading || "Loading…"}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 rounded-2xl bg-[#000435] border border-white/8">
            <div className="text-5xl mb-4 opacity-20">📋</div>
            <p className="font-black text-white/40 text-lg" style={{ fontFamily: FONT }}>{T.noRecords || "No records found"}</p>
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