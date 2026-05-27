// ================================================================
// BabyeyiVerifyPage â€” public fee document verification
// View + PDF: same OfficialDoc pipeline as BabyeyiList
// ================================================================

import { useState, useEffect, useRef, useCallback } from "react";
import babyeyiLogo from "../../../assets/1BABYEYI LOGO FINAL.png";
import { API_BASE, SERVER_BASE } from "../lib/schoolLiteApi";
import { BabyeyiOfficialDocViewer, loadFullRecord } from "./BabyeyiList";

const C = {
  navy: "#001428",
  orange: "#f97316",
  orangeDark: "#ea580c",
  pageBg: "#eef2f7",
  card: "#ffffff",
  ink: "#0f172a",
  navyText: "#1e3a5f",
  muted: "#64748b",
  border: "#e2e8f0",
  success: "#10b981",
};

const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
  @keyframes bv-spin{to{transform:rotate(360deg)}}
  @keyframes bv-fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
  .bv-root{font-family:'Inter',system-ui,sans-serif;-webkit-font-smoothing:antialiased}
  .bv-fade{animation:bv-fadeUp .4s ease-out both}
  .bv-spin{width:20px;height:20px;border:2.5px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:bv-spin .75s linear infinite}
  .bv-card{background:#fff;border-radius:16px;box-shadow:0 4px 24px rgba(15,23,42,.06);border:1px solid #e2e8f0}
  .bv-btn-orange{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;padding:14px 18px;background:linear-gradient(135deg,#f97316,#ea580c);border:none;border-radius:14px;color:#fff;font-size:15px;font-weight:800;cursor:pointer;transition:transform .15s,box-shadow .15s;box-shadow:0 4px 20px rgba(249,115,22,.35)}
  .bv-btn-orange:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 6px 24px rgba(249,115,22,.45)}
  .bv-btn-orange:disabled{opacity:.65;cursor:not-allowed;transform:none}
  .bv-search-input:focus{outline:none;border-color:rgba(249,115,22,.6)!important;box-shadow:0 0 0 3px rgba(249,115,22,.15)!important}
`;

function getDocIdFromUrl() {
  const parts = window.location.pathname.split("/").filter(Boolean);
  const last = (parts[parts.length - 1] || "").toUpperCase();
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

function mapVerifyToSummary(d) {
  const cls = d.class || d.class_name || "";
  return {
    id: d.id,
    docId: d.docId || d.doc_id,
    integrityHash: d.integrityHash ?? null,
    class: cls,
    classes: cls ? [cls] : [],
    level: d.level || "",
    term: d.term || "",
    academicYear: d.academicYear || d.academic_year || "",
    status: d.status || "draft",
    totalFee: Number(d.totalFee || 0),
    nesaLimit: d.nesaLimit != null ? Number(d.nesaLimit) : null,
    exceedsLimit: !!d.exceedsLimit,
    schoolName: d.schoolName || "",
    district: d.district || "",
    sector: d.sector || "",
    createdAt: d.createdAt || "",
    payments: Array.isArray(d.payments) ? d.payments : [],
    parentMessage: "",
    banksJson: null,
    requirements: [],
    classNotes: [],
    otherInfos: [],
    leaders: [],
    leadersCount: 0,
    schoolLogoPath: null,
    otherLogoPath: null,
    qrCodeUrl: d.qrPath || null,
    pdfPath: d.pdfPath || null,
  };
}

async function resolveNumericId(data) {
  const direct = pick(data.id, data.record_id, data.recordId, data.babyeyi_id, data.babyeyiId);
  if (direct) return direct;
  const docId = data.docId || data.doc_id;
  if (!docId) return null;
  for (const param of ["doc_id", "docId"]) {
    try {
      const res = await fetch(`${API_BASE}/babyeyi?${param}=${encodeURIComponent(docId)}&limit=1`);
      const json = await res.json();
      const row = json.data?.[0] || (json.success && !Array.isArray(json.data) ? json.data : null);
      const id = pick(row?.id, row?.record_id, row?.recordId);
      if (id) return id;
    } catch { /* next */ }
  }
  return null;
}

function getClassLabel(d) {
  return d?.class || d?.class_name || d?.className || "â€”";
}

function fmtDate(iso) {
  if (!iso) return { date: "â€”", time: "â€”" };
  const dt = new Date(iso);
  return {
    date: dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    time: dt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
  };
}

function assetUrl(path) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${SERVER_BASE}${path.replace(/\\/g, "/").replace(/^\/?/, "/")}`;
}

const PATH = {
  check: "M20 6L9 17l-5-5",
  x: "M18 6L6 18M6 6l12 12",
  warn: "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01",
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  copy: "M8 17.929H6c-1.105 0-2-.912-2-2.036V5.036C4 3.91 4.895 3 6 3h8c1.105 0 2 .911 2 2.036v1.866m-6 .17h8c1.105 0 2 .91 2 2.035v10.857C20 21.09 19.105 22 18 22h-8c-1.105 0-2-.911-2-2.036V9.107c0-1.124.895-2.036 2-2.036z",
  link: "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71",
  search: "M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z",
  back: "M19 12H5M12 5l-7 7 7 7",
  doc: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6",
  download: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3",
  building: "M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6",
  calendar: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z",
};
const Ic = ({ n, s = 18, c = "currentColor", sw = 2 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    <path d={PATH[n] || PATH.shield} />
  </svg>
);

function BabyeyiBrandLogo({ height = 56 }) {
  return (
    <img src={babyeyiLogo} alt="Babyeyi" style={{ height, width: "auto", maxWidth: "min(200px, 70vw)", objectFit: "contain", display: "block" }} />
  );
}

const STATUS_CFG = {
  approved: { label: "Approved", bg: "rgba(16,185,129,.15)", text: "#6ee7b7", border: "rgba(16,185,129,.35)", dot: C.success },
  pending: { label: "Pending", bg: "rgba(251,191,36,.15)", text: "#fcd34d", border: "rgba(251,191,36,.35)", dot: "#f59e0b" },
  recommended: { label: "Recommended", bg: "rgba(59,130,246,.15)", text: "#93c5fd", border: "rgba(59,130,246,.35)", dot: "#3b82f6" },
  rejected: { label: "Rejected", bg: "rgba(239,68,68,.15)", text: "#fca5a5", border: "rgba(239,68,68,.35)", dot: "#ef4444" },
  draft: { label: "Draft", bg: "rgba(148,163,184,.15)", text: "#cbd5e1", border: "rgba(148,163,184,.35)", dot: "#94a3b8" },
};

function Spinner({ size = 20, light }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        border: `2.5px solid ${light ? "rgba(255,255,255,.25)" : "rgba(15,23,42,.12)"}`,
        borderTopColor: light ? "#fff" : C.orange,
        animation: "bv-spin .75s linear infinite",
      }}
    />
  );
}

function SchoolInfoCard({ data, fullRec }) {
  const rec = fullRec || data;
  const docId = data.docId || data.doc_id;
  const logoUrl = assetUrl(rec.schoolLogoPath);
  return (
    <div className="bv-card bv-fade" style={{ padding: "20px 22px", marginBottom: 14 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center", fontSize: 11, color: C.muted, marginBottom: 10 }}>
        {rec.district && <span>District: <strong style={{ color: C.navyText }}>{rec.district}</strong></span>}
        {rec.sector && <span>Sector: <strong style={{ color: C.navyText }}>{rec.sector}</strong></span>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, margin: "8px 0", borderBottom: `2px solid ${C.navyText}`, paddingBottom: 14 }}>
        <div style={{ width: 64, height: 64, borderRadius: 10, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", flexShrink: 0, overflow: "hidden" }}>
          {logoUrl ? <img src={logoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : <Ic n="building" s={28} c={C.navyText} />}
        </div>
        <h2 style={{ flex: 1, textAlign: "center", margin: 0, fontSize: 18, fontWeight: 800, color: C.navyText, textTransform: "uppercase" }}>{rec.schoolName || "â€”"}</h2>
        <div style={{ width: 64, height: 64, borderRadius: 10, border: `1px dashed ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span style={{ fontSize: 8, color: C.muted, textAlign: "center", lineHeight: 1.3, fontWeight: 700 }}>SCHOOL<br />LOGO</span>
        </div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "center", fontSize: 12, margin: "12px 0 8px" }}>
        {rec.academicYear && <span><strong style={{ color: C.navyText }}>Academic Year:</strong> {rec.academicYear}</span>}
        {rec.term && <span><strong style={{ color: C.navyText }}>Term:</strong> {rec.term}</span>}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 12 }}><strong style={{ color: C.navyText }}>Class:</strong> {getClassLabel(rec)}</span>
        {docId && <span style={{ fontSize: 11, fontFamily: "monospace", fontWeight: 700, color: C.orange, border: `1px solid ${C.orange}55`, background: `${C.orange}15`, padding: "2px 10px", borderRadius: 6 }}>{docId}</span>}
      </div>
    </div>
  );
}

function FeeBreakdownCard({ data, fullRec }) {
  const rec = fullRec || data;
  const payments = Array.isArray(rec.payments) ? rec.payments : [];
  const total = payments.reduce((s, p) => s + Number(p.amount || 0), 0) || Number(rec.totalFee || 0);
  const th = { padding: "8px 12px", fontSize: 12, fontWeight: 700, color: C.navyText, borderBottom: `2px solid ${C.navyText}`, textAlign: "left" };
  const td = { padding: "7px 12px", fontSize: 12, color: C.ink, borderBottom: `1px solid ${C.border}` };
  return (
    <div className="bv-card bv-fade" style={{ padding: "20px 22px", marginBottom: 14 }}>
      <div style={{ borderBottom: `1.5px solid ${C.navyText}`, paddingBottom: 6, marginBottom: 12 }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: C.navyText, textTransform: "uppercase", letterSpacing: ".04em" }}>Fee Payment Breakdown</span>
      </div>
      {payments.length > 0 ? (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ ...th, width: 42, textAlign: "center" }}>No.</th>
              <th style={th}>Payment Item</th>
              <th style={{ ...th, textAlign: "right" }}>Amount (RWF)</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p, i) => (
              <tr key={i}>
                <td style={{ ...td, textAlign: "center", color: C.muted }}>{i + 1}</td>
                <td style={td}>{p.name}</td>
                <td style={{ ...td, textAlign: "right", fontFamily: "monospace", fontWeight: 600 }}>{Number(p.amount || 0).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2} style={{ padding: "9px 12px", fontSize: 14, fontWeight: 800, color: C.navyText, borderTop: `2px solid ${C.navyText}` }}>TOTAL</td>
              <td style={{ padding: "9px 12px", fontSize: 14, fontWeight: 800, color: C.navyText, borderTop: `2px solid ${C.navyText}`, textAlign: "right", fontFamily: "monospace" }}>RWF {total.toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>
      ) : (
        <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>No payment lines on this document.</p>
      )}
      {rec.exceedsLimit && (
        <div style={{ background: "#fff7ed", border: "1px solid #fdba74", borderRadius: 8, padding: "10px 12px", marginTop: 12, display: "flex", gap: 8, alignItems: "flex-start" }}>
          <Ic n="warn" s={16} c="#ea580c" sw={2.5} />
          <p style={{ margin: 0, fontSize: 12, color: "#9a3412", fontWeight: 600, lineHeight: 1.5 }}>
            Total exceeded NESA limit{rec.nesaLimit != null ? ` (max RWF ${Number(rec.nesaLimit).toLocaleString()})` : ""}.
          </p>
        </div>
      )}
    </div>
  );
}

function VerifyLinkCard({ url, copied, onCopy }) {
  return (
    <div className="bv-card bv-fade" style={{ padding: "16px 18px", marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
        <Ic n="link" s={14} c={C.muted} />
        <span style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: ".1em" }}>Verification Link</span>
      </div>
      <p style={{ fontFamily: "monospace", fontSize: 11, color: "#2563eb", wordBreak: "break-all", margin: "0 0 12px", lineHeight: 1.7 }}>{url}</p>
      <button type="button" className="bv-btn-orange" onClick={onCopy}>
        <Ic n={copied ? "check" : "copy"} s={16} c="#fff" />
        {copied ? "Copied to clipboard!" : "Copy verification link"}
      </button>
    </div>
  );
}

function TimestampCards({ createdAt, verifiedAt }) {
  const created = fmtDate(createdAt);
  const verified = fmtDate(verifiedAt);
  const card = (label, icon, d, t, accent) => (
    <div className="bv-card" style={{ flex: 1, padding: "14px 16px", display: "flex", gap: 12, alignItems: "center" }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: `${accent}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Ic n={icon} s={18} c={accent} />
      </div>
      <div>
        <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: ".08em" }}>{label}</p>
        <p style={{ margin: "2px 0 0", fontSize: 13, fontWeight: 700, color: C.ink }}>{d}</p>
        <p style={{ margin: 0, fontSize: 11, color: C.muted }}>{t}</p>
      </div>
    </div>
  );
  return (
    <div style={{ display: "flex", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
      {createdAt && card("Created", "calendar", created.date, created.time, C.orange)}
      {card("Verified at", "shield", verified.date, verified.time, C.success)}
    </div>
  );
}

function SearchForm({ onSearch, loading, prevError }) {
  const [input, setInput] = useState("");
  const [fmtErr, setFmtErr] = useState("");
  const inputRef = useRef(null);
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 80); }, []);
  const submit = () => {
    setFmtErr("");
    const v = normaliseDocId(input);
    if (!/^BY-\d{4}-\d{5}$/.test(v)) { setFmtErr("Enter a valid document ID  e.g. BY-2025-00026"); return; }
    onSearch(v);
  };
  const showErr = fmtErr || prevError;
  return (
    <div style={{ maxWidth: 440, margin: "0 auto", padding: "0 20px" }}>
      <div style={{ textAlign: "center", marginBottom: 28 }} className="bv-fade">
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}><BabyeyiBrandLogo height={72} /></div>
        <h1 style={{ color: "#fff", fontSize: 24, fontWeight: 900, margin: "0 0 10px" }}>Fee Document Verification</h1>
        <p style={{ color: "rgba(255,255,255,.5)", fontSize: 14, margin: 0, lineHeight: 1.7 }}>Enter a Babyeyi document ID to verify authenticity and view the official fee document.</p>
      </div>
      <div className="bv-card bv-fade" style={{ padding: "24px 22px" }}>
        <label style={{ display: "block", color: C.muted, fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 8 }}>Document ID</label>
        <div style={{ position: "relative", marginBottom: 8 }}>
          <div style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}><Ic n="doc" s={17} c={C.muted} /></div>
          <input ref={inputRef} className="bv-search-input" value={input} onChange={(e) => { setFmtErr(""); setInput(e.target.value.toUpperCase()); }} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="BY-2025-00026" maxLength={14} spellCheck={false} autoComplete="off" style={{ width: "100%", boxSizing: "border-box", padding: "13px 14px 13px 42px", border: `1.5px solid ${showErr ? "#fca5a5" : C.border}`, borderRadius: 12, fontSize: 17, fontFamily: "monospace", fontWeight: 700, letterSpacing: ".06em" }} />
        </div>
        {showErr && <p style={{ color: "#dc2626", fontSize: 12, margin: "0 0 10px", fontWeight: 600 }}>{fmtErr || prevError}</p>}
        <p style={{ color: C.muted, fontSize: 11, margin: "0 0 16px" }}>Format: BY-YYYY-NNNNN</p>
        <button type="button" className="bv-btn-orange" onClick={submit} disabled={loading}>
          {loading ? <Spinner light /> : <Ic n="search" s={18} c="#fff" sw={2.5} />}
          {loading ? "Verifyingâ€¦" : "Verify Document"}
        </button>
      </div>
      <p style={{ color: "rgba(255,255,255,.25)", fontSize: 11, textAlign: "center", marginTop: 16, lineHeight: 1.8 }}>Scan the QR code on any printed Babyeyi document to open this page automatically.</p>
    </div>
  );
}

export default function BabyeyiVerify() {
  const [data, setData] = useState(null);
  const [fullRec, setFullRec] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [view, setView] = useState("search");
  const [viewingRec, setViewingRec] = useState(null);
  const [docLoading, setDocLoading] = useState(false);
  const [docError, setDocError] = useState(null);

  const urlDocId = getDocIdFromUrl();
  const urlQrHash = getQrHashFromUrl();

  const loadFull = useCallback(async (verifyData) => {
    const numericId = await resolveNumericId(verifyData);
    if (!numericId) return null;
    const sum = { ...mapVerifyToSummary(verifyData), id: numericId };
    return loadFullRecord(sum, "en");
  }, []);

  const openOfficialDocument = useCallback(async (verifyData) => {
    setDocLoading(true);
    setDocError(null);
    try {
      const full = await loadFull(verifyData);
      if (!full) throw new Error("Could not load document record.");
      setFullRec(full);
      setViewingRec(full);
    } catch (e) {
      setDocError(e.message || "Failed to load document");
    } finally {
      setDocLoading(false);
    }
  }, [loadFull]);

  const doFetch = useCallback(async (docId, qrHash = null) => {
    setLoading(true);
    setError(null);
    setFullRec(null);
    setViewingRec(null);
    setDocError(null);
    try {
      const url = `${API_BASE}/babyeyi/verify/${docId}${qrHash ? `?h=${qrHash}` : ""}`;
      const res = await fetch(url);
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Document not found");
      setData(json.data);
      setView("result");
      loadFull(json.data).then((full) => { if (full) setFullRec(full); }).catch(() => {});
    } catch (e) {
      setError(e.message);
      setView("search");
    } finally {
      setLoading(false);
    }
  }, [loadFull]);

  useEffect(() => {
    if (urlDocId) doFetch(urlDocId, urlQrHash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = (docId) => doFetch(docId, null);
  const handleReset = () => {
    setData(null);
    setFullRec(null);
    setError(null);
    setView("search");
    setViewingRec(null);
    setDocError(null);
  };
  const copyUrl = (url) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const navyBg = { background: `linear-gradient(165deg, ${C.navy} 0%, #0c2d4a 100%)`, minHeight: "100vh" };

  if (urlDocId && loading && !data) {
    return (
      <div className="bv-root" style={{ ...navyBg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
        <style>{GLOBAL_CSS}</style>
        <Spinner size={44} light />
        <p style={{ color: "rgba(255,255,255,.55)", fontSize: 14, fontWeight: 600 }}>Verifying documentâ€¦</p>
      </div>
    );
  }

  if (view === "search" || !data) {
    return (
      <div className="bv-root" style={{ ...navyBg, paddingTop: 48, paddingBottom: 48 }}>
        <style>{GLOBAL_CSS}</style>
        {loading && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,20,40,.75)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 99 }}>
            <div style={{ textAlign: "center" }}><Spinner size={40} light /><p style={{ color: "rgba(255,255,255,.6)", fontSize: 13, fontWeight: 600, marginTop: 12 }}>Verifyingâ€¦</p></div>
          </div>
        )}
        <SearchForm onSearch={handleSearch} loading={loading} prevError={error} />
      </div>
    );
  }

  const st = STATUS_CFG[data.status] || STATUS_CFG.pending;
  const docId = data.docId || data.doc_id;
  const pageUrl = data.verifyUrl || window.location.href;
  const display = fullRec || data;

  return (
    <div className="bv-root" style={{ minHeight: "100vh", background: C.pageBg }}>
      <style>{GLOBAL_CSS}</style>
      {viewingRec && (
        <BabyeyiOfficialDocViewer
          key={viewingRec.id}
          rec={viewingRec}
          onClose={() => setViewingRec(null)}
          globalLang="en"
          publicVerify
        />
      )}

      <div style={{ background: `linear-gradient(165deg, ${C.navy} 0%, #0c2d4a 100%)`, padding: "28px 20px 24px", textAlign: "center" }}>
        <BabyeyiBrandLogo height={52} />
        <h1 style={{ color: "#fff", fontSize: 20, fontWeight: 900, margin: "14px 0 12px" }}>Fee Document Verification</h1>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.15)", borderRadius: 100, padding: "6px 16px" }}>
            <Ic n="link" s={12} c="rgba(255,255,255,.7)" />
            <span style={{ fontFamily: "monospace", color: "#fff", fontSize: 13, fontWeight: 800 }}>{docId}</span>
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: st.bg, color: st.text, border: `1.5px solid ${st.border}`, borderRadius: 100, padding: "5px 14px", fontSize: 12, fontWeight: 800 }}>
            <Ic n="check" s={12} c={st.dot} sw={3} /> {st.label}
          </span>
        </div>
        <div style={{ maxWidth: 520, margin: "18px auto 0" }}>
          <button type="button" className="bv-btn-orange" disabled={docLoading} onClick={() => openOfficialDocument(data)}>
            {docLoading ? <Spinner light /> : <Ic n="download" s={18} c="#fff" />}
            <span>{docLoading ? "Loading documentâ€¦" : "Download Official PDF"}</span>
            <span style={{ marginLeft: "auto", fontSize: 11, opacity: .75, fontFamily: "monospace", fontWeight: 500 }}>{docId}</span>
          </button>
          {docError && <p style={{ color: "#fca5a5", fontSize: 12, margin: "8px 0 0", fontWeight: 600 }}>{docError}</p>}
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 20px 40px" }}>
          <SchoolInfoCard data={data} fullRec={display} />
          <FeeBreakdownCard data={data} fullRec={display} />
          <VerifyLinkCard url={pageUrl} copied={copied} onCopy={() => copyUrl(pageUrl)} />
          <TimestampCards createdAt={data.createdAt} verifiedAt={data.verifiedAt} />
          <button type="button" onClick={handleReset} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: 12, background: "#fff", border: `1px solid ${C.border}`, borderRadius: 12, color: C.muted, fontSize: 13, fontWeight: 700, cursor: "pointer", marginBottom: 16 }}>
            <Ic n="back" s={14} c="currentColor" /> Verify another document
          </button>
          <p style={{ color: C.muted, fontSize: 11, textAlign: "center", lineHeight: 1.8, margin: 0 }}>
            Verified on babyeyi.rw
          </p>
      </div>
    </div>
  );
}
