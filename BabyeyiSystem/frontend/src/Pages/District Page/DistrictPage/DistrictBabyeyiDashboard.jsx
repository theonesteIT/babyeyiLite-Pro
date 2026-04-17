// ================================================================
// DistrictBabyeyiDashboard.jsx — Gold Theme (Montserrat + #FEBF10)
// ================================================================

import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle, XCircle, Clock, AlertTriangle,
  FileText, TrendingUp, Building2,
  Search, Filter, RefreshCw, ChevronDown,
  Eye, ThumbsUp, ThumbsDown, Send,
  MapPin, Shield, Loader2, AlertCircle,
  BarChart2, ChevronLeft, ChevronRight,
  X, Check, Info, LogOut, Menu,
  Wifi, WifiOff, Loader, Upload,
  FileImage, FileCheck, ExternalLink,
  PenLine, Stamp, Download, User, Lock
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";

// ── API ───────────────────────────────────────────────────────────
const API     = import.meta.env?.VITE_API_BASE    || "http://localhost:5100/api";
const UPLOADS = import.meta.env?.VITE_UPLOADS_BASE || "http://localhost:5100";

const apiFetch = async (path, opts = {}) => {
  const res  = await fetch(`${API}${path}`, {
    credentials: "include",
    headers: { Accept: "application/json", ...opts.headers },
    ...opts,
  });
  const json = await res.json();
  if (!res.ok) throw Object.assign(new Error(json.message || "Request failed"), { status: res.status });
  return json;
};

const apiFetchMultipart = async (path, formData, method = "PATCH") => {
  const res  = await fetch(`${API}${path}`, {
    method, credentials: "include",
    headers: { Accept: "application/json" },
    body: formData,
  });
  const json = await res.json();
  if (!res.ok) throw Object.assign(new Error(json.message || "Request failed"), { status: res.status });
  return json;
};

// ── Helpers ───────────────────────────────────────────────────────
const fmt      = (n) => Number(n || 0).toLocaleString();
const fmtDate  = (d) => d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const resolveUrl = (p) => p ? (p.startsWith("http") ? p : `${UPLOADS}${p.startsWith("/") ? "" : "/"}${p}`) : null;

// ── Babyeyi shell: navy #000435 + amber (aligned with School Manager) ──
const NAVY = "#000435";
const NAVY_MID = "#0c1a3a";
const C = {
  gold:        "#FBBF24",
  goldLight:   "#FDE68A",
  goldDark:    "#D97706",
  goldDeep:    NAVY,
  goldBg:      "#FFFBEB",
  goldBgMid:   "#FEF3C7",
  goldBorder:  "#FCD34D",

  dark:        NAVY,
  darkMid:     "#1e3a5f",

  emerald:     "#10B981",
  emeraldDark: "#047857",
  emeraldBg:   "#FFFBEB",
  emeraldBord: "#FCD34D",

  red:         "#EF4444",
  red50:       "#FEF2F2",
  red700:      "#B91C1C",
  red800:      "#991B1B",
  redBorder:   "#FECACA",

  amber:       "#F59E0B",
  amberBg:     "#FFFBEB",
  amberBord:   "#FDE68A",

  blue:        NAVY,
  blueBg:      "rgba(0, 4, 53, 0.06)",
  blueBord:    "rgba(0, 4, 53, 0.15)",
  blue700:     NAVY,

  violet:      "#D97706",
  violetBg:    "#FFFBEB",
  violetBord:  "#FCD34D",

  slate100:    "#F8FAFC",
  slate200:    "#E2E8F0",
  slate400:    "#94A3B8",
  slate500:    "#64748B",
};

const font = '"MTN Brighter Sans", "Nunito", "Varela Round", sans-serif';

// Shared input style
const inp = {
  width: "100%", padding: "10px 14px",
  background: C.goldBg, border: `1px solid ${C.goldBorder}`,
  borderRadius: 12, fontSize: 13, color: C.dark,
  outline: "none", fontFamily: font, boxSizing: "border-box",
};

const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900&family=Varela+Round&display=swap');
  @keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }
  @keyframes spin   { to { transform: rotate(360deg); } }
  @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:.5} }
  .anim { animation: fadeIn .25s ease-out; }
  ::-webkit-scrollbar { width:4px; height:4px; }
  ::-webkit-scrollbar-thumb { background:${C.goldBorder}; border-radius:99px; }
  option { background:white; color:${C.dark}; }
`;

// ════════════════════════════════════════════════════════════════
// STATUS CONFIG
// ════════════════════════════════════════════════════════════════
const STATUS_CFG = {
  approved: { label: "Approved", textColor: C.emeraldDark, bg: C.emeraldBg, border: C.emeraldBord, icon: CheckCircle },
  pending:  { label: "Pending",  textColor: "#92400e",     bg: C.amberBg,   border: C.amberBord,   icon: Clock      },
  rejected: { label: "Rejected", textColor: C.red800,      bg: C.red50,     border: C.redBorder,   icon: XCircle    },
  draft:    { label: "Draft",    textColor: C.slate500,    bg: C.slate100,  border: C.slate200,    icon: FileText   },
};
const st = (s) => STATUS_CFG[s] || STATUS_CFG.draft;

// ════════════════════════════════════════════════════════════════
// STAT CARD
// ════════════════════════════════════════════════════════════════
const StatCard = ({ icon: Icon, label, value, sub, color = "gold", alert, loading, onClick }) => {
  const bg = {
    gold:    `linear-gradient(135deg, ${NAVY}, ${NAVY_MID})`,
    emerald: `linear-gradient(135deg, ${NAVY_MID}, ${NAVY})`,
    amber:   `linear-gradient(135deg, #d97706, #fbbf24)`,
    red:     `linear-gradient(135deg, #b45309, #f59e0b)`,
    blue:    `linear-gradient(135deg, ${NAVY}, #1e3a5f)`,
    violet:  `linear-gradient(135deg, #d97706, #fbbf24)`,
  }[color] || `linear-gradient(135deg, ${NAVY}, ${NAVY_MID})`;

  return (
    <div
      onClick={onClick}
      style={{
        background: bg, borderRadius: 20, padding: "14px 16px",
        boxShadow: "0 4px 16px rgba(26,18,0,0.18)",
        cursor: onClick ? "pointer" : "default",
        position: "relative", overflow: "hidden",
        transition: "transform 150ms",
        fontFamily: font,
      }}
      onMouseEnter={e => onClick && (e.currentTarget.style.transform = "scale(1.02)")}
      onMouseLeave={e => onClick && (e.currentTarget.style.transform = "scale(1)")}
    >
      {/* Shine */}
      <div style={{
        position: "absolute", inset: 0, opacity: 0.08,
        backgroundImage: "radial-gradient(circle at 80% 20%,white 0%,transparent 60%)",
        pointerEvents: "none",
      }}/>
      <div style={{ position: "relative" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{
            padding: 8, borderRadius: 12, background: "rgba(255,255,255,0.18)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Icon style={{ width: 18, height: 18, color: "white" }}/>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {alert && (
              <span style={{
                fontSize: 9, fontWeight: 900, background: "rgba(255,255,255,0.3)",
                color: "white", padding: "2px 6px", borderRadius: 20,
                animation: "pulse 2s infinite",
              }}>!</span>
            )}
            {loading && <Loader2 style={{ width: 14, height: 14, color: "rgba(255,255,255,0.6)", animation: "spin 0.8s linear infinite" }}/>}
          </div>
        </div>
        <div style={{ fontSize: 26, fontWeight: 900, color: "white", marginBottom: 2 }}>
          {loading
            ? <span style={{ display: "inline-block", width: 48, height: 28, background: "rgba(255,255,255,0.2)", borderRadius: 6 }}/>
            : (value ?? "—")}
        </div>
        <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.8)" }}>{label}</div>
        {sub && <div style={{ fontSize: 10, color: "rgba(255,255,255,0.55)", marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════
// BADGE
// ════════════════════════════════════════════════════════════════
const Badge = ({ status }) => {
  const map = {
    approved:    { bg: C.emeraldBg, text: C.emeraldDark, border: C.emeraldBord },
    rejected:    { bg: C.red50,     text: C.red800,      border: C.redBorder   },
    pending:     { bg: C.amberBg,   text: "#92400e",     border: C.amberBord   },
    recommended: { bg: C.blueBg,    text: C.blue700,     border: C.blueBord    },
    draft:       { bg: C.slate100,  text: C.slate500,    border: C.slate200    },
  };
  const s = map[status?.toLowerCase()] || { bg: C.goldBg, text: C.goldDark, border: C.goldBorder };
  const label = status?.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) || "—";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "2px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700,
      background: s.bg, color: s.text, border: `1px solid ${s.border}`,
      fontFamily: font,
    }}>
      {label}
    </span>
  );
};

// ════════════════════════════════════════════════════════════════
// TOAST
// ════════════════════════════════════════════════════════════════
const Toast = ({ toasts, remove }) => (
  <div style={{
    position: "fixed", bottom: 16, right: 16, zIndex: 200,
    display: "flex", flexDirection: "column", gap: 8,
    pointerEvents: "none", maxWidth: "calc(100vw - 2rem)",
  }}>
    {toasts.map(t => {
      const s = {
        success: { bg: C.emeraldBg, border: C.emeraldBord, text: C.emeraldDark, icon: <CheckCircle style={{ width: 16, height: 16, color: C.emerald }}/> },
        error:   { bg: C.red50,     border: C.redBorder,   text: C.red700,      icon: <XCircle     style={{ width: 16, height: 16, color: C.red     }}/> },
        warning: { bg: C.amberBg,   border: C.amberBord,   text: "#92400e",     icon: <AlertCircle style={{ width: 16, height: 16, color: C.amber   }}/> },
      }[t.type] || { bg: C.goldBg, border: C.goldBorder, text: C.goldDark, icon: <Info style={{ width: 16, height: 16, color: C.goldDark }}/> };
      return (
        <div key={t.id} style={{
          pointerEvents: "auto", display: "flex", alignItems: "flex-start", gap: 10,
          padding: "12px 14px", borderRadius: 16, boxShadow: "0 4px 20px rgba(26,18,0,0.15)",
          border: `1px solid ${s.border}`, background: s.bg, width: 300,
          fontFamily: font,
        }}>
          <div style={{ marginTop: 1, flexShrink: 0 }}>{s.icon}</div>
          <p style={{ flex: 1, fontSize: 12, fontWeight: 600, color: s.text, lineHeight: 1.4, margin: 0 }}>{t.message}</p>
          <button onClick={() => remove(t.id)} style={{ opacity: 0.5, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
            <X style={{ width: 14, height: 14, color: s.text }}/>
          </button>
        </div>
      );
    })}
  </div>
);

// ════════════════════════════════════════════════════════════════
// DOCUMENT VIEWER MODAL
// ════════════════════════════════════════════════════════════════
function DocViewerModal({ url, title, onClose }) {
  if (!url) return null;
  const isImage = /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(url);
  const isPdf   = /\.pdf(\?|$)/i.test(url);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 150,
      background: "rgba(26,18,0,0.7)", backdropFilter: "blur(6px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }}>
      <div style={{
        background: "white", borderRadius: 24, boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        width: "100%", maxWidth: 768, maxHeight: "90vh",
        display: "flex", flexDirection: "column", overflow: "hidden",
        border: `1px solid ${C.goldBorder}`,
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 20px", borderBottom: `1px solid ${C.goldBorder}`,
          background: C.goldBg, flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {isImage
              ? <FileImage style={{ width: 16, height: 16, color: C.goldDark }}/>
              : <FileCheck style={{ width: 16, height: 16, color: C.goldDark }}/>}
            <h3 style={{ fontWeight: 900, color: C.dark, fontSize: 13, margin: 0, maxWidth: 260,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: font }}>
              {title || "Document"}
            </h3>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {[
              { href: url, target: "_blank", icon: ExternalLink, label: "Open"     },
              { href: url, download: true,   icon: Download,     label: "Download" },
            ].map(({ href, target, download, icon: Icon, label }) => (
              <a key={label} href={href} target={target} download={download}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  fontSize: 11, fontWeight: 700, color: C.goldDark,
                  padding: "6px 12px", borderRadius: 12,
                  border: `1px solid ${C.goldBorder}`, background: "white",
                  textDecoration: "none", fontFamily: font,
                }}>
                <Icon style={{ width: 12, height: 12 }}/> {label}
              </a>
            ))}
            <button onClick={onClose} style={{
              padding: 6, borderRadius: 10, background: "transparent", border: "none",
              cursor: "pointer", color: C.goldDark, display: "flex",
            }}>
              <X style={{ width: 16, height: 16 }}/>
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{
          flex: 1, overflowY: "auto", background: C.goldBgMid,
          padding: 16, display: "flex", alignItems: "center", justifyContent: "center",
          minHeight: 400,
        }}>
          {isImage ? (
            <img src={url} alt={title} style={{ maxWidth: "100%", maxHeight: "70vh", borderRadius: 16, boxShadow: "0 8px 32px rgba(26,18,0,0.12)", objectFit: "contain" }}/>
          ) : isPdf ? (
            <iframe src={url} title={title} style={{ width: "100%", height: "65vh", borderRadius: 16, border: `1px solid ${C.goldBorder}` }}/>
          ) : (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <FileText style={{ width: 48, height: 48, color: C.goldBorder, margin: "0 auto 12px" }}/>
              <p style={{ color: C.goldDark, fontWeight: 600, fontSize: 13, fontFamily: font }}>Preview not available</p>
              <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: C.goldDark, fontSize: 13, fontFamily: font }}>
                Open file directly
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// ASSET UPLOAD FIELD
// ════════════════════════════════════════════════════════════════
function AssetUploadField({ label, icon: Icon, fieldName, file, onFileChange, existingUrl }) {
  const inputRef   = useRef();
  const previewUrl = file ? URL.createObjectURL(file) : resolveUrl(existingUrl);
  const hasSomething = file || existingUrl;

  return (
    <div style={{
      border: `2px dashed ${hasSomething ? C.emeraldBord : C.goldBorder}`,
      borderRadius: 16, padding: 14, transition: "all 150ms",
      background: hasSomething ? C.emeraldBg : C.goldBg,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Icon style={{ width: 14, height: 14, color: hasSomething ? C.emerald : C.goldDark }}/>
          <span style={{ fontSize: 10, fontWeight: 900, color: C.dark, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: font }}>
            {label}
          </span>
          {existingUrl && !file && (
            <span style={{
              fontSize: 9, padding: "1px 6px", background: C.emeraldBg,
              color: C.emeraldDark, border: `1px solid ${C.emeraldBord}`,
              borderRadius: 20, fontWeight: 700, fontFamily: font,
            }}>Saved</span>
          )}
        </div>
        <button type="button" onClick={() => inputRef.current?.click()} style={{
          display: "flex", alignItems: "center", gap: 6,
          fontSize: 11, fontWeight: 700, padding: "5px 12px", borderRadius: 10,
          background: `linear-gradient(135deg, ${C.dark}, ${C.darkMid})`,
          color: C.gold, border: "none", cursor: "pointer", fontFamily: font,
        }}>
          <Upload style={{ width: 11, height: 11 }}/>
          {hasSomething ? "Change" : "Upload"}
        </button>
      </div>

      {previewUrl ? (
        <div style={{ position: "relative" }}>
          <img src={previewUrl} alt={label} style={{
            width: "100%", maxHeight: 80, objectFit: "contain",
            borderRadius: 10, border: `1px solid ${C.emeraldBord}`,
            background: "white", padding: 6,
          }}/>
          {file && (
            <button type="button" onClick={() => onFileChange(null)} style={{
              position: "absolute", top: 4, right: 4,
              width: 20, height: 20, background: C.red,
              color: "white", borderRadius: "50%", border: "none",
              display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
            }}>
              <X style={{ width: 10, height: 10 }}/>
            </button>
          )}
        </div>
      ) : (
        <div style={{
          height: 56, display: "flex", alignItems: "center", justifyContent: "center",
          borderRadius: 10, border: `1px solid ${C.goldBorder}`, background: "rgba(255,255,255,0.5)",
        }}>
          <p style={{ fontSize: 10, color: C.goldDeep, fontWeight: 600, fontFamily: font }}>
            No {label.toLowerCase()} uploaded
          </p>
        </div>
      )}

      <input ref={inputRef} type="file" name={fieldName} accept="image/png,image/jpeg,image/jpg,image/webp"
        style={{ display: "none" }} onChange={e => onFileChange(e.target.files?.[0] || null)}/>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// ACTION MODAL
// ════════════════════════════════════════════════════════════════
function ActionModal({ action, item, onClose, onConfirm, loading, deoAssets, onRefreshDeoAssets, toast }) {
  const [notes,        setNotes]        = useState("");
  const [sigFile,      setSigFile]      = useState(null);
  const [stampFile,    setStampFile]    = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);

  if (!action || !item) return null;

  const cfg = {
    approve:   { title: "Approve Babyeyi",      label: "Approve & Sign", btnBg: C.emerald,      icon: ThumbsUp  },
    reject:    { title: "Reject Babyeyi",        label: "Reject & Sign",  btnBg: C.red,          icon: ThumbsDown},
    recommend: { title: "Recommend to NESA",     label: "Send to NESA",   btnBg: C.blue,         icon: Send      },
  }[action] || {};

  const Icon = cfg.icon || Check;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 120,
      display: "flex", alignItems: "flex-end", justifyContent: "center",
      background: "rgba(26,18,0,0.4)", backdropFilter: "blur(6px)",
    }}>
      <div style={{
        background: "white", borderRadius: "24px 24px 0 0",
        boxShadow: "0 -8px 40px rgba(26,18,0,0.2)",
        width: "100%", maxWidth: 520, maxHeight: "96vh",
        display: "flex", flexDirection: "column", overflow: "hidden",
        border: `1px solid ${C.goldBorder}`,
        fontFamily: font,
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "16px 20px", borderBottom: `1px solid ${C.goldBorder}`,
          background: C.goldBg, flexShrink: 0,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 12,
            background: cfg.btnBg, display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Icon style={{ width: 16, height: 16, color: "white" }}/>
          </div>
          <h3 style={{ fontWeight: 900, color: C.dark, fontSize: 15, margin: 0 }}>{cfg.title}</h3>
          <button onClick={onClose} style={{
            marginLeft: "auto", padding: 6, borderRadius: 10,
            background: "transparent", border: "none", cursor: "pointer", color: C.goldDark,
            display: "flex",
          }}>
            <X style={{ width: 16, height: 16 }}/>
          </button>
        </div>

        <div style={{ overflowY: "auto", flex: 1, padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Summary */}
          <div style={{
            background: C.goldBg, border: `1px solid ${C.goldBorder}`,
            borderRadius: 16, padding: 14, fontSize: 13,
          }}>
            <p style={{ fontWeight: 900, color: C.dark, margin: "0 0 4px" }}>{item.school_name || "—"}</p>
            <p style={{ color: C.goldDark, fontSize: 11, margin: 0 }}>
              {[item.class, item.term, item.academic_year].filter(Boolean).join(" · ")} · RWF {fmt(item.total_fee || item.requested_amount)}
            </p>
          </div>

          {/* Rejection reason — required and prominent when rejecting */}
          {action === "reject" && (
            <div style={{ background: C.red50, border: `2px solid ${C.redBorder}`, borderRadius: 16, padding: 14 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 900, color: C.red800, marginBottom: 8 }}>
                Rejection reason <span style={{ color: C.red }}>*</span>
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="State the reason for rejecting this request (required)…"
                style={{ ...inp, resize: "none", lineHeight: 1.6, border: `2px solid ${C.redBorder}`, background: "white", width: "100%", boxSizing: "border-box" }}
              />
              {!notes.trim() && (
                <p style={{ fontSize: 11, color: C.red, fontWeight: 700, marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}>
                  You must provide a rejection reason before submitting.
                </p>
              )}
            </div>
          )}

          {/* DEO Uploads */}
          <div>
            <p style={{ fontSize: 10, fontWeight: 900, color: C.goldDark, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 10px" }}>
              DEO Authorization
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <AssetUploadField label="Signature"     icon={PenLine} fieldName="deo_signature" file={sigFile}   onFileChange={setSigFile}   existingUrl={deoAssets?.signature_url}/>
              <AssetUploadField label="Official Stamp" icon={Stamp}  fieldName="deo_stamp"     file={stampFile} onFileChange={setStampFile} existingUrl={deoAssets?.stamp_url}/>
            </div>
            {!sigFile && !stampFile && !deoAssets?.signature_url && !deoAssets?.stamp_url && (
              <p style={{ fontSize: 10, color: C.amber, fontWeight: 700, marginTop: 8, display: "flex", alignItems: "center", gap: 4, fontFamily: font }}>
                <AlertTriangle style={{ width: 12, height: 12 }}/> Upload your signature/stamp or save them in your profile first.
              </p>
            )}
            {(deoAssets?.signature_url || deoAssets?.stamp_url) && !sigFile && !stampFile && (
              <p style={{ fontSize: 10, color: C.emeraldDark, fontWeight: 700, marginTop: 8, fontFamily: font }}>
                Using saved profile assets. Upload new files above to change for this action only, or to save for next time.
              </p>
            )}
            {(sigFile || stampFile) && (
              <button
                type="button"
                disabled={savingProfile}
                onClick={async () => {
                  setSavingProfile(true);
                  try {
                    const fd = new FormData();
                    if (sigFile) fd.append("deo_signature", sigFile);
                    if (stampFile) fd.append("deo_stamp", stampFile);
                    await apiFetchMultipart("/district/babyeyi/deo-assets", fd, "POST");
                    onRefreshDeoAssets?.();
                    if (toast) toast("Signature & stamp saved to your profile. They will be used for future actions.", "success");
                  } catch (e) {
                    if (toast) toast(e.message || "Failed to save to profile", "error");
                  } finally {
                    setSavingProfile(false);
                  }
                }}
                style={{
                  marginTop: 10, padding: "8px 14px", fontSize: 11, fontWeight: 700,
                  background: C.goldBg, border: `1px solid ${C.goldBorder}`, borderRadius: 12,
                  color: C.darkMid, cursor: savingProfile ? "not-allowed" : "pointer", fontFamily: font,
                }}
              >
                {savingProfile ? "Saving…" : "Save to my profile for next time"}
              </button>
            )}
          </div>

          {/* Notes (optional for approve/recommend; reject uses the Rejection reason block above) */}
          {action !== "reject" && (
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.goldDark, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
                Notes
              </label>
              <textarea
                rows={3} value={notes} onChange={e => setNotes(e.target.value)}
                placeholder={action === "approve" ? "Optional approval comments…" : "Notes for NESA review…"}
                style={{ ...inp, resize: "none", lineHeight: 1.6 }}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: "12px 20px 20px", borderTop: `1px solid ${C.goldBorder}`,
          display: "flex", gap: 10, flexShrink: 0,
        }}>
          <button onClick={onClose} disabled={loading} style={{
            flex: 1, padding: "12px 0", border: `2px solid ${C.goldBorder}`, borderRadius: 14,
            fontSize: 13, fontWeight: 700, color: C.darkMid, background: "white",
            cursor: "pointer", fontFamily: font, opacity: loading ? 0.5 : 1,
          }}>
            Cancel
          </button>
          <button
            onClick={() => onConfirm({ notes, sigFile, stampFile })}
            disabled={loading || (action === "reject" && !notes.trim())}
            style={{
              flex: 1, padding: "12px 0", borderRadius: 14, border: "none",
              fontSize: 13, fontWeight: 700, color: "white", background: cfg.btnBg,
              cursor: loading || (action === "reject" && !notes.trim()) ? "not-allowed" : "pointer",
              opacity: (loading || (action === "reject" && !notes.trim())) ? 0.5 : 1,
              fontFamily: font, boxShadow: `0 4px 16px ${cfg.btnBg}44`,
            }}>
            {loading
              ? <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <Loader2 style={{ width: 16, height: 16, animation: "spin 0.8s linear infinite" }}/> Processing…
                </span>
              : cfg.label}
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// LOGOUT BUTTON
// ════════════════════════════════════════════════════════════════
function LogoutButton({ compact = false, style: extStyle = {} }) {
  const { logout }  = useAuth();
  const navigate    = useNavigate();
  const [loading,      setLoading]      = useState(false);
  const [showConfirm,  setShowConfirm]  = useState(false);

  const handleLogout = async () => {
    setLoading(true); setShowConfirm(false);
    try { await logout(); } finally {
      setLoading(false);
      navigate("/login", { replace: true });
    }
  };

  return (
    <>
      {showConfirm && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 400,
          background: "rgba(26,18,0,0.3)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
        }}>
          <div style={{
            background: "white", borderRadius: 24, border: `1px solid ${C.goldBorder}`,
            boxShadow: "0 20px 60px rgba(26,18,0,0.2)",
            width: "100%", maxWidth: 360, padding: 24, textAlign: "center",
            fontFamily: font,
          }}>
            <div style={{
              width: 52, height: 52, background: C.red50, borderRadius: 16,
              display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px",
            }}>
              <LogOut style={{ width: 26, height: 26, color: C.red }}/>
            </div>
            <h3 style={{ fontWeight: 900, color: C.dark, fontSize: 17, margin: "0 0 6px" }}>Sign Out?</h3>
            <p style={{ color: C.goldDark, fontSize: 13, margin: "0 0 20px" }}>You'll be redirected to the login page.</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowConfirm(false)} style={{
                flex: 1, padding: 12, border: `2px solid ${C.goldBorder}`, borderRadius: 14,
                fontSize: 13, fontWeight: 700, color: C.darkMid, background: "white",
                cursor: "pointer", fontFamily: font,
              }}>Cancel</button>
              <button onClick={handleLogout} disabled={loading} style={{
                flex: 1, padding: 12, background: C.red, color: "white", borderRadius: 14,
                fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                opacity: loading ? 0.6 : 1, fontFamily: font,
              }}>
                {loading ? <Loader style={{ width: 16, height: 16, animation: "spin 0.8s linear infinite" }}/> : <><LogOut style={{ width: 16, height: 16 }}/> Sign Out</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {compact ? (
        <button onClick={() => setShowConfirm(true)} disabled={loading} title="Sign Out" style={{
          padding: 8, borderRadius: 10, background: "transparent", border: "none",
          cursor: "pointer", color: C.goldDark, display: "flex", opacity: loading ? 0.5 : 1,
          ...extStyle,
        }}>
          {loading
            ? <Loader style={{ width: 16, height: 16, animation: "spin 0.8s linear infinite" }}/>
            : <LogOut style={{ width: 16, height: 16 }}/>}
        </button>
      ) : (
        <button onClick={() => setShowConfirm(true)} disabled={loading} style={{
          width: "100%", display: "flex", alignItems: "center", gap: 10,
          padding: "10px 12px", borderRadius: 12, fontSize: 13, fontWeight: 700,
          color: C.red, background: "transparent", border: `1px solid transparent`,
          cursor: "pointer", fontFamily: font, transition: "all 150ms",
          opacity: loading ? 0.5 : 1, ...extStyle,
        }}
        onMouseEnter={e => { e.currentTarget.style.background = C.red50; e.currentTarget.style.borderColor = C.redBorder; }}
        onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "transparent"; }}
        >
          {loading
            ? <Loader style={{ width: 16, height: 16, animation: "spin 0.8s linear infinite", flexShrink: 0 }}/>
            : <LogOut style={{ width: 16, height: 16, flexShrink: 0 }}/>}
          <span>{loading ? "Signing out…" : "Sign Out"}</span>
        </button>
      )}
    </>
  );
}

// ── Profile photo URL (same as uploads base) ─────────────────────
const profilePhotoUrl = (photo) => {
  if (!photo || typeof photo !== "string") return null;
  const p = photo.replace(/\\/g, "/").trim();
  if (p.startsWith("http")) return p;
  const base = (UPLOADS || "").replace(/\/$/, "");
  return base + (p.startsWith("/") ? p : "/" + p);
};

// ════════════════════════════════════════════════════════════════
// DEO PROFILE MODAL — change password + profile photo
// ════════════════════════════════════════════════════════════════
function DeoProfileModal({ open, deo, onClose, onUpdated, toast }) {
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoSaving, setPhotoSaving] = useState(false);
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [pwSaving, setPwSaving] = useState(false);
  const photoInputRef = useRef(null);

  if (!open) return null;

  const photoSrc = photoPreview || (deo?.photo ? profilePhotoUrl(deo.photo) : null);

  const handlePhotoUpload = async () => {
    if (!photoFile) return;
    setPhotoSaving(true);
    try {
      const fd = new FormData();
      fd.append("photo", photoFile);
      const res = await fetch(`${API}/auth/profile/photo`, { method: "POST", credentials: "include", body: fd });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        setPhotoFile(null); setPhotoPreview(null); if (photoInputRef.current) photoInputRef.current.value = "";
        onUpdated?.();
        if (toast) toast("Profile photo updated.", "success");
      } else if (toast) toast(json.message || "Upload failed", "error");
    } catch (e) {
      if (toast) toast("Failed to upload photo", "error");
    } finally {
      setPhotoSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      if (toast) toast("New password and confirm do not match", "error");
      return;
    }
    if (pwForm.newPassword.length < 8) {
      if (toast) toast("New password must be at least 8 characters", "error");
      return;
    }
    setPwSaving(true);
    try {
      const res = await fetch(`${API}/auth/change-password`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
        if (toast) toast("Password changed successfully.", "success");
      } else if (toast) toast(json.message || "Failed to change password", "error");
    } catch (e) {
      if (toast) toast("Failed to change password", "error");
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(26,18,0,0.4)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "white", borderRadius: 24, boxShadow: "0 20px 60px rgba(26,18,0,0.2)", border: `1px solid ${C.goldBorder}`, width: "100%", maxWidth: 440, maxHeight: "90vh", overflowY: "auto", fontFamily: font }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: `1px solid ${C.goldBorder}`, background: C.goldBg }}>
          <h3 style={{ fontWeight: 900, color: C.dark, fontSize: 18, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <User style={{ width: 20, height: 20, color: C.goldDark }}/> My Profile
          </h3>
          <button onClick={onClose} style={{ padding: 8, borderRadius: 12, border: "none", background: "transparent", cursor: "pointer", color: C.goldDark, display: "flex" }}>
            <X style={{ width: 20, height: 20 }}/>
          </button>
        </div>
        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Profile photo */}
          <div style={{ background: C.goldBg, border: `1px solid ${C.goldBorder}`, borderRadius: 16, padding: 20 }}>
            <h4 style={{ fontWeight: 700, color: C.dark, fontSize: 13, margin: "0 0 12px", display: "flex", alignItems: "center", gap: 8 }}>
              <User style={{ width: 16, height: 16, color: C.gold }}/> Profile Photo
            </h4>
            <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <div style={{ width: 80, height: 80, borderRadius: "50%", overflow: "hidden", border: `3px solid ${C.goldBorder}`, background: C.goldBgMid, flexShrink: 0 }}>
                {photoSrc ? (
                  <img src={photoSrc} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
                ) : (
                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <User style={{ width: 36, height: 36, color: C.goldDark }}/>
                  </div>
                )}
              </div>
              <div>
                <input ref={photoInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" style={{ display: "none" }}
                  onChange={e => { const f = e.target?.files?.[0]; if (f) { setPhotoFile(f); setPhotoPreview(URL.createObjectURL(f)); } }}/>
                <button type="button" onClick={() => photoInputRef.current?.click()} style={{
                  padding: "10px 16px", fontFamily: font, fontWeight: 700, fontSize: 12, background: C.goldBg, border: `2px solid ${C.goldBorder}`, borderRadius: 12, color: C.dark, cursor: "pointer", marginRight: 8,
                }}><Upload style={{ width: 14, height: 14, verticalAlign: "middle", marginRight: 6 }}/> Choose</button>
                {photoFile && (
                  <button type="button" disabled={photoSaving} onClick={handlePhotoUpload} style={{
                    padding: "10px 16px", fontFamily: font, fontWeight: 700, fontSize: 12, background: C.dark, border: "none", borderRadius: 12, color: C.gold, cursor: photoSaving ? "not-allowed" : "pointer", opacity: photoSaving ? 0.7 : 1,
                  }}>{photoSaving ? <Loader2 style={{ width: 14, height: 14, animation: "spin 0.8s linear infinite", verticalAlign: "middle" }}/> : "Upload"}</button>
                )}
                <p style={{ fontSize: 11, color: C.goldDark, margin: "8px 0 0" }}>JPEG, PNG or WebP, max 2MB</p>
              </div>
            </div>
          </div>
          {/* Change password */}
          <div style={{ background: C.goldBg, border: `1px solid ${C.goldBorder}`, borderRadius: 16, padding: 20 }}>
            <h4 style={{ fontWeight: 700, color: C.dark, fontSize: 13, margin: "0 0 12px", display: "flex", alignItems: "center", gap: 8 }}>
              <Lock style={{ width: 16, height: 16, color: C.gold }}/> Change Password
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: C.goldDark, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Current password</label>
                <input type="password" value={pwForm.currentPassword} onChange={e => setPwForm(f => ({ ...f, currentPassword: e.target.value }))} placeholder="Current password"
                  style={{ ...inp, width: "100%", boxSizing: "border-box" }}/>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: C.goldDark, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>New password</label>
                <input type="password" value={pwForm.newPassword} onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))} placeholder="At least 8 characters"
                  style={{ ...inp, width: "100%", boxSizing: "border-box" }}/>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: C.goldDark, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Confirm new password</label>
                <input type="password" value={pwForm.confirmPassword} onChange={e => setPwForm(f => ({ ...f, confirmPassword: e.target.value }))} placeholder="Repeat new password"
                  style={{ ...inp, width: "100%", boxSizing: "border-box" }}/>
              </div>
            </div>
            <button type="button" disabled={pwSaving || !pwForm.currentPassword || !pwForm.newPassword || !pwForm.confirmPassword} onClick={handleChangePassword} style={{
              marginTop: 16, padding: "12px 24px", fontFamily: font, fontWeight: 700, fontSize: 13,
              background: (pwSaving || !pwForm.currentPassword || !pwForm.newPassword || !pwForm.confirmPassword) ? C.slate200 : `linear-gradient(135deg, ${C.dark}, ${C.darkMid})`,
              color: C.gold, border: "none", borderRadius: 14, cursor: pwSaving ? "not-allowed" : "pointer", opacity: pwSaving ? 0.8 : 1,
            }}>{pwSaving ? <><Loader2 style={{ width: 16, height: 16, animation: "spin 0.8s linear infinite", verticalAlign: "middle", marginRight: 8 }}/> Updating…</> : "Change Password"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// NAV
// ════════════════════════════════════════════════════════════════
const NAV = [
  { id: "list",     label: "All Babyeyi",       icon: FileText   },
  { id: "requests", label: "Increase Requests", icon: TrendingUp },
  { id: "schools",  label: "Schools",           icon: Building2  },
  { id: "analytics", label: "Analytics",         icon: BarChart2  },
];

// ════════════════════════════════════════════════════════════════
// SIDEBAR
// ════════════════════════════════════════════════════════════════
function Sidebar({ tab, switchTab, deo, online, mobileOpen, setMobileOpen, onOpenProfile }) {
  const Content = () => (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", fontFamily: font }}>
      {/* Header */}
      <div style={{ padding: "20px 16px", borderBottom: `1px solid ${C.goldBorder}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{
            width: 96, height: 36, borderRadius: 12, flexShrink: 0,
            background: "#1F2937",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 12px rgba(26,18,0,0.25)",
            padding: "4px 10px",
          }}>
            <img src="/1BABYEYI LOGO FINAL.png" alt="Babyeyi logo" style={{ width: "100%", height: "100%", objectFit: "contain" }}/>
          </div>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontSize: 14, fontWeight: 900, color: C.dark, margin: 0, lineHeight: 1.2 }}>DEO Portal</h1>
            <p style={{ fontSize: 10, color: C.goldDark, margin: 0, fontWeight: 600 }}>District Education Officer</p>
          </div>
        </div>
        <div style={{
          display: "flex", alignItems: "center", gap: 8, padding: "6px 12px",
          borderRadius: 10, fontSize: 11, fontWeight: 700,
          background: online ? C.emeraldBg : C.amberBg,
          border: `1px solid ${online ? C.emeraldBord : C.amberBord}`,
          color: online ? C.emeraldDark : "#92400e",
        }}>
          {online ? <Wifi style={{ width: 12, height: 12 }}/> : <WifiOff style={{ width: 12, height: 12 }}/>}
          {online ? "Connected" : "Offline Mode"}
        </div>
      </div>

      {/* Nav — minHeight: 0 so flex child can scroll and footer stays visible */}
      <nav style={{ flex: 1, minHeight: 0, padding: 10, overflowY: "auto" }}>
        {NAV.map(item => {
          const isActive = tab === item.id;
          return (
            <button key={item.id} onClick={() => { switchTab(item.id); setMobileOpen(false); }} style={{
              width: "100%", display: "flex", alignItems: "center", gap: 10,
              padding: "10px 12px", borderRadius: 12, marginBottom: 2,
              border: "none", cursor: "pointer", fontFamily: font,
              fontWeight: 700, fontSize: 13, textAlign: "left",
              background: isActive ? `linear-gradient(135deg, ${C.dark}, ${C.darkMid})` : "transparent",
              color:      isActive ? C.gold : C.goldDeep,
              boxShadow:  isActive ? "0 4px 12px rgba(26,18,0,0.18)" : "none",
              transition: "all 150ms",
            }}>
              <item.icon style={{ width: 16, height: 16, flexShrink: 0 }}/>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer — flexShrink: 0 so Analytics + Profile always visible */}
      <div style={{ flexShrink: 0, padding: 10, borderTop: `1px solid ${C.goldBorder}` }}>
        {deo && (
          <div style={{
            display: "flex", alignItems: "flex-start", gap: 10,
            background: C.goldBg, border: `1px solid ${C.goldBorder}`,
            borderRadius: 14, padding: 10, marginBottom: 8,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: resolveUrl(deo.photo) ? "transparent" : `linear-gradient(135deg, ${C.dark}, ${C.darkMid})`,
              display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
            }}>
              {resolveUrl(deo.photo) ? (
                <img src={resolveUrl(deo.photo)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <User style={{ width: 18, height: 18, color: C.gold }}/>
              )}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: C.dark, margin: "0 0 2px",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {deo.fullName}
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <MapPin style={{ width: 11, height: 11, color: C.goldDark, flexShrink: 0 }}/>
                <p style={{ fontSize: 10, color: C.goldDark, fontWeight: 600, margin: 0,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {deo.district} District
                </p>
              </div>
              {deo.province && <p style={{ fontSize: 9, color: C.goldDeep, margin: "2px 0 0" }}>{deo.province}</p>}
            </div>
          </div>
        )}
        {onOpenProfile && (
          <button type="button" onClick={onOpenProfile} style={{
            width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12,
            fontSize: 13, fontWeight: 700, color: C.goldDeep, background: C.goldBg, border: `1px solid ${C.goldBorder}`,
            cursor: "pointer", fontFamily: font, marginBottom: 8,
          }}>
            <User style={{ width: 16, height: 16, flexShrink: 0 }}/> My profile
          </button>
        )}
        <div style={{
          background: C.goldBgMid, border: `1px solid ${C.goldBorder}`,
          borderRadius: 12, padding: "8px 10px", textAlign: "center", marginBottom: 8,
        }}>
          <p style={{ fontSize: 10, color: C.goldDark, fontWeight: 700, margin: 0 }}>NESA Rwanda · v2.0</p>
        </div>
        <LogoutButton/>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="hidden lg:flex" style={{
        flexDirection: "column", width: 240,
        borderRight: `1px solid ${C.goldBorder}`,
        position: "fixed", left: 0, top: 0, height: "100%", zIndex: 30,
        background: "rgba(255,251,232,0.98)", backdropFilter: "blur(8px)",
        fontFamily: font,
      }}>
        <Content/>
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="lg:hidden" style={{
          position: "fixed", inset: 0, zIndex: 50, display: "flex",
          background: "rgba(26,18,0,0.4)", backdropFilter: "blur(4px)",
        }} onClick={() => setMobileOpen(false)}>
          <div style={{
            width: 280, height: "100%", background: C.goldBg,
            boxShadow: "4px 0 24px rgba(26,18,0,0.2)",
            display: "flex", flexDirection: "column", fontFamily: font,
          }} onClick={e => e.stopPropagation()}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "16px 20px", borderBottom: `1px solid ${C.goldBorder}`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 90, height: 34, borderRadius: 10, flexShrink: 0,
                  background: "#1F2937",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  padding: "4px 9px",
                }}>
                  <img src="/1BABYEYI LOGO FINAL.png" alt="Babyeyi logo" style={{ width: "100%", height: "100%", objectFit: "contain" }}/>
                </div>
                <span style={{ fontWeight: 900, color: C.dark, fontSize: 14, fontFamily: font }}>DEO Portal</span>
              </div>
              <button onClick={() => setMobileOpen(false)} style={{
                padding: 6, borderRadius: 10, background: C.goldBgMid, border: "none", cursor: "pointer",
              }}>
                <X style={{ width: 18, height: 18, color: C.goldDark }}/>
              </button>
            </div>
            <div style={{ flex: 1, overflowY: "auto" }}><Content/></div>
          </div>
        </div>
      )}
    </>
  );
}

// ════════════════════════════════════════════════════════════════
// HEADER
// ════════════════════════════════════════════════════════════════
function Header({ tab, deo, online, statsLoad, listLoad, onRefresh, setMobileOpen }) {
  const current = NAV.find(n => n.id === tab);
  const spinning = statsLoad || listLoad;

  return (
    <header style={{
      position: "sticky", top: 0, zIndex: 20,
      borderBottom: `1px solid ${C.goldBorder}`,
      padding: "12px 16px",
      background: "rgba(255,251,232,0.94)", backdropFilter: "blur(12px)",
      fontFamily: font,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button className="lg:hidden" onClick={() => setMobileOpen(true)} style={{
            color: C.goldDark, background: "transparent", border: "none", cursor: "pointer",
            padding: 6, borderRadius: 10, display: "flex",
          }}>
            <Menu style={{ width: 20, height: 20 }}/>
          </button>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 900, color: C.dark, margin: 0, lineHeight: 1.2 }}>
              {current?.label || "Dashboard"}
            </h2>
            {deo?.district && (
              <p className="hidden sm:block" style={{ fontSize: 11, color: C.goldDark, fontWeight: 600, margin: 0 }}>
                {deo.district} District{deo.province ? ` · ${deo.province}` : ""}
              </p>
            )}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div className="hidden sm:flex" style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "5px 10px", borderRadius: 10, fontSize: 11, fontWeight: 700,
            background: online ? C.emeraldBg : C.amberBg,
            border: `1px solid ${online ? C.emeraldBord : C.amberBord}`,
            color: online ? C.emeraldDark : "#92400e",
          }}>
            {online ? <Wifi style={{ width: 12, height: 12 }}/> : <WifiOff style={{ width: 12, height: 12 }}/>}
            {online ? "Online" : "Offline"}
          </div>

          <button onClick={onRefresh} title="Refresh" style={{
            padding: 8, borderRadius: 10, background: "transparent", border: "none",
            cursor: "pointer", color: C.goldDark, display: "flex",
          }}>
            <RefreshCw style={{ width: 16, height: 16, animation: spinning ? "spin 0.8s linear infinite" : "none" }}/>
          </button>

          {deo && (
            <div className="hidden sm:flex" style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "8px 12px", borderRadius: 14,
              background: C.goldBg, border: `1px solid ${C.goldBorder}`,
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: 9,
                background: resolveUrl(deo.photo) ? "transparent" : `linear-gradient(135deg, ${C.dark}, ${C.darkMid})`,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                overflow: "hidden",
              }}>
                {resolveUrl(deo.photo) ? (
                  <img src={resolveUrl(deo.photo)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <Shield style={{ width: 14, height: 14, color: C.gold }}/>
                )}
              </div>
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: C.dark, margin: 0, lineHeight: 1.2 }}>{deo.fullName}</p>
                <p style={{ fontSize: 9, color: C.goldDark, margin: 0 }}>District Officer</p>
              </div>
            </div>
          )}

          <LogoutButton compact/>
        </div>
      </div>
    </header>
  );
}

// ════════════════════════════════════════════════════════════════
// SECTOR BAR CHART
// ════════════════════════════════════════════════════════════════
function SectorBreakdown({ sectors }) {
  if (!sectors?.length) return null;
  const max = Math.max(...sectors.map(s => Number(s.total)), 1);

  return (
    <div style={{
      background: "white", borderRadius: 20, border: `1px solid ${C.goldBorder}`,
      padding: 20, boxShadow: "0 2px 8px rgba(254,191,16,0.07)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <BarChart2 style={{ width: 16, height: 16, color: C.goldDark }}/>
        <h3 style={{ fontWeight: 900, color: C.dark, fontSize: 13, margin: 0, fontFamily: font }}>By Sector</h3>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {sectors.slice(0, 8).map((s, i) => (
          <div key={i}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: C.darkMid, fontFamily: font }}>{s.sector}</span>
              <span style={{ fontSize: 12, fontWeight: 900, color: C.dark, fontFamily: font }}>{s.total}</span>
            </div>
            <div style={{ height: 6, background: C.goldBgMid, borderRadius: 3, overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 3,
                background: `linear-gradient(90deg, ${C.dark}, ${C.gold})`,
                width: `${(Number(s.total) / max) * 100}%`,
                transition: "width 700ms ease",
              }}/>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 2 }}>
              <span style={{ fontSize: 9, color: C.emeraldDark, fontWeight: 600, fontFamily: font }}>{s.approved} approved</span>
              <span style={{ fontSize: 9, color: "#92400e",     fontWeight: 600, fontFamily: font }}>{s.pending} pending</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// BABYEYI CARD
// ════════════════════════════════════════════════════════════════
function BabyeyiCard({ item, onAction, onView }) {
  const s       = st(item.status);
  const Icon    = s.icon;
  const exceeds = item.exceeds_limit === 1 || item.exceeds_limit === true;
  // Normalize: backend may return nesa_status or request_status depending on join
  const nesaStatus = item.nesa_status || item.request_status || "";
  const isSentToNesa = nesaStatus === "recommended";

  const borderColor = exceeds ? C.amberBord
    : item.status === "approved" ? C.emeraldBord
    : item.status === "rejected" ? C.redBorder
    : C.goldBorder;

  return (
    <div style={{
      background: "white", border: `2px solid ${borderColor}`,
      borderRadius: 20, padding: 16, transition: "all 150ms",
      boxShadow: "0 2px 8px rgba(254,191,16,0.06)",
      fontFamily: font,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 14, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: s.bg, border: `2px solid ${s.border}`,
        }}>
          <Icon style={{ width: 20, height: 20, color: s.textColor }}/>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Top row */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontWeight: 900, color: C.dark, fontSize: 14, margin: "0 0 2px",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {item.school_name || "Unknown School"}
              </p>
              <p style={{ fontSize: 10, color: C.goldDark, margin: 0 }}>
                {item.school_sector || "—"} · {item.doc_id || `#${item.id}`}
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end" }}>
              {exceeds && (
                <span style={{
                  display: "flex", alignItems: "center", gap: 4,
                  padding: "2px 8px", background: C.amberBg,
                  border: `1px solid ${C.amberBord}`, borderRadius: 20,
                  fontSize: 9, fontWeight: 900, color: "#92400e",
                  textTransform: "uppercase", letterSpacing: "0.04em",
                  animation: "pulse 2s infinite",
                }}>
                  <AlertTriangle style={{ width: 10, height: 10 }}/> Exceeds
                </span>
              )}
              <Badge status={item.status}/>
            </div>
          </div>

          {/* Tags */}
          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
            {[item.class, item.term, item.academic_year, item.level, item.category].filter(Boolean).map((v, i) => (
              <span key={i} style={{
                fontSize: 10, fontWeight: 600, color: C.goldDark,
                background: C.goldBg, padding: "2px 8px", borderRadius: 8,
                border: `1px solid ${C.goldBorder}`,
              }}>{v}</span>
            ))}
            <span style={{ fontSize: 12, fontWeight: 900, color: C.dark, marginLeft: "auto" }}>
              RWF {fmt(item.total_fee)}
            </span>
          </div>

          {/* Actions */}
          <div style={{
            display: "flex", alignItems: "center", flexWrap: "wrap", gap: 2,
            paddingTop: 10, borderTop: `1px solid ${C.goldBorder}`,
          }}>
            {[
              { label: "View",    onClick: () => onView(item),             show: true,                         color: C.goldDark,    icon: Eye      },
              { label: "Approve", onClick: () => onAction("approve", item), show: item.status !== "approved",  color: C.emeraldDark, icon: ThumbsUp },
              { label: "Reject",  onClick: () => onAction("reject",  item), show: item.status !== "rejected",  color: C.red800,      icon: ThumbsDown},
            ].filter(b => b.show).map(({ label, onClick, color, icon: BIcon }) => (
              <button key={label} onClick={onClick} style={{
                display: "flex", alignItems: "center", gap: 5,
                fontSize: 11, fontWeight: 700, color,
                padding: "6px 10px", borderRadius: 10,
                background: "transparent", border: "none", cursor: "pointer", fontFamily: font,
                transition: "background 150ms",
              }}
              onMouseEnter={e => e.currentTarget.style.background = C.goldBg}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <BIcon style={{ width: 13, height: 13 }}/> {label}
              </button>
            ))}

            {exceeds && !isSentToNesa && (
              <button onClick={() => onAction("recommend", item)} style={{
                display: "flex", alignItems: "center", gap: 5,
                fontSize: 11, fontWeight: 700, color: "white",
                padding: "6px 12px", borderRadius: 10,
                background: C.blue, border: "none", cursor: "pointer",
                fontFamily: font, marginLeft: "auto",
                boxShadow: "0 2px 8px rgba(59,130,246,0.3)",
              }}>
                <Send style={{ width: 13, height: 13 }}/> → NESA
              </button>
            )}
            {isSentToNesa && (
              <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, fontWeight: 900, color: C.blue700, marginLeft: "auto",
                padding: "4px 10px", borderRadius: 10, background: C.blueBg, border: `1px solid ${C.blueBord}` }}>
                <Check style={{ width: 13, height: 13 }}/> Sent to NESA
              </span>
            )}

            <span style={{ fontSize: 10, color: C.goldBorder, marginLeft: "auto" }}>{fmtDate(item.created_at)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// DETAIL DRAWER
// ════════════════════════════════════════════════════════════════
function DetailDrawer({ id, onClose, onAction }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [err,     setErr]     = useState(null);
  const [docView, setDocView] = useState(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true); setErr(null);
    apiFetch(`/district/babyeyi/${id}`)
      .then(r => setData(r.data))
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const ir = data?.increase_request;

  const DocBtn = ({ path, name, label, icon: Icon = FileText, color = C.goldDark, bg = C.goldBg, border = C.goldBorder }) => {
    const url = resolveUrl(path);
    if (!url) return (
      <div style={{
        display: "flex", alignItems: "center", gap: 8, padding: 12,
        background: C.slate100, border: `1px dashed ${C.slate200}`,
        borderRadius: 14, fontFamily: font,
      }}>
        <Icon style={{ width: 14, height: 14, color: C.slate400, flexShrink: 0 }}/>
        <span style={{ fontSize: 11, color: C.slate400, fontWeight: 600 }}>{label} — Not uploaded</span>
      </div>
    );
    return (
      <button onClick={() => setDocView({ url, title: name || label })} style={{
        display: "flex", alignItems: "center", gap: 10, padding: 12,
        background: bg, border: `1px solid ${border}`, borderRadius: 14,
        cursor: "pointer", width: "100%", textAlign: "left", fontFamily: font,
        transition: "all 150ms",
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 10,
          background: "white", border: `1px solid ${border}`,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <Icon style={{ width: 16, height: 16, color }}/>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: C.dark, margin: "0 0 1px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</p>
          <p style={{ fontSize: 10, color: C.goldDark, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name || "Click to view"}</p>
        </div>
        <Eye style={{ width: 14, height: 14, color, flexShrink: 0 }}/>
      </button>
    );
  };

  return (
    <>
      {docView && <DocViewerModal url={docView.url} title={docView.title} onClose={() => setDocView(null)}/>}

      <div style={{ position: "fixed", inset: 0, zIndex: 40, display: "flex" }}>
        <div style={{ flex: 1, background: "rgba(26,18,0,0.3)", backdropFilter: "blur(4px)" }} onClick={onClose}/>
        <div style={{
          width: "100%", maxWidth: 480, background: "white",
          boxShadow: "-4px 0 32px rgba(26,18,0,0.15)",
          display: "flex", flexDirection: "column", overflow: "hidden",
          borderLeft: `1px solid ${C.goldBorder}`, fontFamily: font,
        }}>
          {/* Drawer header */}
          <div style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "16px 20px", borderBottom: `1px solid ${C.goldBorder}`,
            background: C.goldBg, flexShrink: 0,
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3 style={{ fontWeight: 900, color: C.dark, fontSize: 14, margin: "0 0 2px",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {data?.school_name || "Loading…"}
              </h3>
              <p style={{ fontSize: 10, color: C.goldDark, margin: 0 }}>{data?.doc_id || `#${id}`}</p>
            </div>
            <button onClick={onClose} style={{
              padding: 8, borderRadius: 12, background: "transparent", border: "none",
              cursor: "pointer", color: C.goldDark, display: "flex",
            }}>
              <X style={{ width: 18, height: 18 }}/>
            </button>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
            {loading && (
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 160 }}>
                <Loader2 style={{ width: 32, height: 32, color: C.gold, animation: "spin 0.8s linear infinite" }}/>
              </div>
            )}
            {err && (
              <div style={{ padding: 14, background: C.red50, border: `1px solid ${C.redBorder}`, borderRadius: 16, fontSize: 13, color: C.red700 }}>
                {err}
              </div>
            )}

            {data && !loading && (
              <>
                {/* Info grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {[
                    { l: "Class",         v: data.class },
                    { l: "Term",          v: data.term },
                    { l: "Academic Year", v: data.academic_year },
                    { l: "Level",         v: data.level },
                    { l: "Category",      v: data.category },
                    { l: "Status",        v: st(data.status).label },
                    { l: "Total Fees",    v: `RWF ${fmt(data.total_fee)}` },
                    { l: "NESA Limit",    v: data.nesa_limit ? `RWF ${fmt(data.nesa_limit)}` : "—" },
                  ].map(({ l, v }) => (
                    <div key={l} style={{ background: C.goldBg, border: `1px solid ${C.goldBorder}`, borderRadius: 14, padding: 12 }}>
                      <p style={{ fontSize: 9, color: C.goldDark, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 4px" }}>{l}</p>
                      <p style={{ fontSize: 13, fontWeight: 700, color: C.dark, margin: 0 }}>{v || "—"}</p>
                    </div>
                  ))}
                </div>

                {/* Payments */}
                {(data.payments || []).filter(p => p.name && p.amount).length > 0 && (
                  <div style={{ background: "white", border: `1px solid ${C.goldBorder}`, borderRadius: 16, overflow: "hidden" }}>
                    <div style={{ padding: "10px 16px", background: C.goldBg, borderBottom: `1px solid ${C.goldBorder}` }}>
                      <p style={{ fontSize: 10, fontWeight: 900, color: C.goldDark, textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>
                        Payment Breakdown
                      </p>
                    </div>
                    {data.payments.filter(p => p.name && p.amount).map((p, i) => (
                      <div key={i} style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "10px 16px",
                        background: i % 2 ? C.goldBg : "white",
                      }}>
                        <span style={{ fontSize: 13, color: C.darkMid }}>{p.name}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: C.dark }}>RWF {fmt(p.amount)}</span>
                      </div>
                    ))}
                    <div style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "12px 16px",
                      background: `linear-gradient(90deg, ${C.dark}, ${C.darkMid})`,
                    }}>
                      <span style={{ fontSize: 13, fontWeight: 900, color: C.gold }}>TOTAL</span>
                      <span style={{ fontSize: 13, fontWeight: 900, color: C.gold }}>RWF {fmt(data.total_fee)}</span>
                    </div>
                  </div>
                )}

                {/* School-submitted documents — review before approve/reject/send to NESA */}
                {ir && (
                  <div style={{ background: "linear-gradient(135deg, #f5f3ff 0%, #eff6ff 100%)", border: `2px solid ${C.violetBord}`, borderRadius: 16, padding: 14 }}>
                    <p style={{ fontSize: 10, fontWeight: 900, color: C.violet, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 6px" }}>
                      📄 Documents submitted by school
                    </p>
                    <p style={{ fontSize: 11, color: C.darkMid, margin: "0 0 12px", lineHeight: 1.5 }}>
                      Review the Parent Representative Document and School Budget below before you Approve, Reject, or Send to NESA.
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <DocBtn path={ir.parent_rep_doc_path} name={ir.parent_rep_doc_name} label="Parents Representative Document" icon={FileImage} color={C.violet} bg={C.violetBg} border={C.violetBord}/>
                      <DocBtn path={ir.budget_doc_path}     name={ir.budget_doc_name}     label="School Budget / Service Plan"    icon={FileCheck} color={C.blue}   bg={C.blueBg}   border={C.blueBord}/>
                    </div>

                    {(ir.deo_signature_path || ir.deo_stamp_path) && (
                      <div style={{ marginTop: 12 }}>
                        <p style={{ fontSize: 10, fontWeight: 900, color: C.emeraldDark, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px" }}>
                          ✅ DEO Authorization
                        </p>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                          {ir.deo_signature_path && (
                            <button onClick={() => setDocView({ url: resolveUrl(ir.deo_signature_path), title: "DEO Signature" })} style={{
                              display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: 12,
                              background: C.emeraldBg, border: `1px solid ${C.emeraldBord}`,
                              borderRadius: 14, cursor: "pointer", fontFamily: font,
                            }}>
                              <PenLine style={{ width: 18, height: 18, color: C.emerald }}/>
                              <span style={{ fontSize: 10, fontWeight: 700, color: C.emeraldDark }}>DEO Signature</span>
                            </button>
                          )}
                          {ir.deo_stamp_path && (
                            <button onClick={() => setDocView({ url: resolveUrl(ir.deo_stamp_path), title: "DEO Stamp" })} style={{
                              display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: 12,
                              background: C.emeraldBg, border: `1px solid ${C.emeraldBord}`,
                              borderRadius: 14, cursor: "pointer", fontFamily: font,
                            }}>
                              <Stamp style={{ width: 18, height: 18, color: C.emerald }}/>
                              <span style={{ fontSize: 10, fontWeight: 700, color: C.emeraldDark }}>DEO Stamp</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Increase request info */}
                {ir && (
                  <div style={{ background: C.amberBg, border: `1px solid ${C.amberBord}`, borderRadius: 16, padding: 14 }}>
                    <p style={{ fontSize: 11, fontWeight: 900, color: "#92400e", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px" }}>
                      Increase Request
                    </p>
                    <p style={{ fontSize: 13, color: "#92400e", margin: "0 0 10px" }}>{ir.reason || "No reason provided"}</p>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                      <Badge status={ir.nesa_status}/>
                      <span style={{ fontSize: 12, color: "#92400e", fontWeight: 700 }}>
                        Over by: RWF {fmt(Number(ir.requested_amount) - Number(ir.current_limit))}
                      </span>
                    </div>
                    {ir.deo_notes && (
                      <p style={{ fontSize: 11, color: C.blue700, marginTop: 8, fontStyle: "italic", borderTop: `1px solid ${C.amberBord}`, paddingTop: 8 }}>
                        DEO Notes: {ir.deo_notes}
                      </p>
                    )}
                  </div>
                )}

                {/* Babyeyi PDF */}
                {data.pdf_path && (
                  <DocBtn path={data.pdf_path} name={data.pdf_name || `Babyeyi-${data.doc_id}.pdf`} label="Official Babyeyi PDF" icon={FileText}/>
                )}

                {/* Action buttons */}
                <div style={{ display: "flex", gap: 8, paddingTop: 4 }}>
                  {data.status !== "approved" && (
                    <button onClick={() => { onAction("approve", data); onClose(); }} style={{
                      flex: 1, padding: "12px 0", background: C.emerald, color: "white",
                      borderRadius: 14, fontSize: 13, fontWeight: 700, border: "none",
                      cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                      boxShadow: "0 4px 16px rgba(16,185,129,0.3)", fontFamily: font,
                    }}>
                      <ThumbsUp style={{ width: 16, height: 16 }}/> Approve
                    </button>
                  )}
                  {data.status !== "rejected" && (
                    <button onClick={() => { onAction("reject", data); onClose(); }} style={{
                      flex: 1, padding: "12px 0", background: C.red, color: "white",
                      borderRadius: 14, fontSize: 13, fontWeight: 700, border: "none",
                      cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                      boxShadow: "0 4px 16px rgba(239,68,68,0.3)", fontFamily: font,
                    }}>
                      <ThumbsDown style={{ width: 16, height: 16 }}/> Reject
                    </button>
                  )}
                  {(data.exceeds_limit === 1 || data.exceeds_limit === true) &&
                   (ir?.nesa_status || ir?.status || "") !== "recommended" && (
                    <button onClick={() => { onAction("recommend", data); onClose(); }} style={{
                      flex: 1, padding: "12px 0", background: C.blue, color: "white",
                      borderRadius: 14, fontSize: 13, fontWeight: 700, border: "none",
                      cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                      boxShadow: "0 4px 16px rgba(59,130,246,0.3)", fontFamily: font,
                    }}>
                      <Send style={{ width: 16, height: 16 }}/> Send to NESA
                    </button>
                  )}
                  {(data.exceeds_limit === 1 || data.exceeds_limit === true) &&
                   (ir?.nesa_status || ir?.status || "") === "recommended" && (
                    <div style={{ flex: 1, padding: "12px 0", borderRadius: 14, fontSize: 12, fontWeight: 900,
                      color: C.blue700, background: C.blueBg, border: `1px solid ${C.blueBord}`,
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: font }}>
                      <Check style={{ width: 14, height: 14 }}/> Sent to NESA
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ════════════════════════════════════════════════════════════════
// PAGINATION
// ════════════════════════════════════════════════════════════════
function Pagination({ current, total, onChange }) {
  if (total <= 1) return null;
  const count = Math.min(total, 7);
  const start = total <= 7 ? 1 : current <= 4 ? 1 : current >= total - 3 ? total - 6 : current - 3;

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: font }}>
      <button onClick={() => onChange(current - 1)} disabled={current === 1} style={{
        width: 36, height: 36, borderRadius: 12, border: `1px solid ${C.goldBorder}`,
        background: "white", cursor: current === 1 ? "not-allowed" : "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        opacity: current === 1 ? 0.4 : 1, transition: "all 150ms",
      }}>
        <ChevronLeft style={{ width: 16, height: 16, color: C.goldDark }}/>
      </button>

      {Array.from({ length: count }, (_, i) => {
        const page = start + i;
        const isActive = page === current;
        return (
          <button key={page} onClick={() => onChange(page)} style={{
            width: 36, height: 36, borderRadius: 12, fontSize: 13, fontWeight: 700,
            border: `1px solid ${isActive ? C.dark : C.goldBorder}`,
            background: isActive ? C.dark : "white",
            color:      isActive ? C.gold : C.goldDark,
            cursor: "pointer", transition: "all 150ms",
            boxShadow: isActive ? "0 4px 12px rgba(26,18,0,0.2)" : "none",
          }}>{page}</button>
        );
      })}

      <button onClick={() => onChange(current + 1)} disabled={current === total} style={{
        width: 36, height: 36, borderRadius: 12, border: `1px solid ${C.goldBorder}`,
        background: "white", cursor: current === total ? "not-allowed" : "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        opacity: current === total ? 0.4 : 1, transition: "all 150ms",
      }}>
        <ChevronRight style={{ width: 16, height: 16, color: C.goldDark }}/>
      </button>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// SCHOOLS TAB
// ════════════════════════════════════════════════════════════════
function SchoolsTab({ district }) {
  const [schools,    setSchools]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [page,       setPage]       = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });

  const load = useCallback((pg = 1, q = "") => {
    setLoading(true);
    const params = new URLSearchParams({ page: pg, limit: 12 });
    if (q) params.append("search", q);
    apiFetch(`/district/babyeyi/schools/list?${params}`)
      .then(r => { setSchools(r.data); setPagination(r.pagination); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(1, ""); }, []); // eslint-disable-line

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, fontFamily: font }}>
      {/* Hero */}
      <div style={{
        background: `linear-gradient(135deg, ${C.dark}, ${C.darkMid})`,
        borderRadius: 20, padding: "20px 24px", color: "white",
        boxShadow: "0 8px 24px rgba(26,18,0,0.2)", position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", inset: 0, opacity: 0.07, backgroundImage: "radial-gradient(circle at 80% 20%,white 0%,transparent 50%)", pointerEvents: "none" }}/>
        <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 900, margin: "0 0 4px", color: "white" }}>Schools in {district}</h2>
            <p style={{ fontSize: 12, color: C.goldLight, margin: 0 }}>{pagination.total} registered schools</p>
          </div>
          <span style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "8px 14px", borderRadius: 12,
            background: "rgba(254,191,16,0.18)", border: `1px solid ${C.gold}44`,
            fontSize: 12, fontWeight: 700, color: C.goldLight,
          }}>
            <Building2 style={{ width: 14, height: 14 }}/> {pagination.total} Schools
          </span>
        </div>
      </div>

      {/* Search */}
      <div style={{ position: "relative", maxWidth: 380 }}>
        <Search style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: C.goldDark }}/>
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); load(1, e.target.value); }}
          placeholder="Search schools…" style={{ ...inp, paddingLeft: 38 }}/>
      </div>

      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 14 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ height: 144, background: "white", borderRadius: 20, border: `1px solid ${C.goldBorder}`, opacity: 0.5 }}/>
          ))}
        </div>
      ) : schools.length === 0 ? (
        <div style={{
          background: "white", border: `1px solid ${C.goldBorder}`, borderRadius: 20,
          padding: "40px 20px", textAlign: "center",
        }}>
          <Building2 style={{ width: 40, height: 40, color: C.goldBorder, margin: "0 auto 12px" }}/>
          <p style={{ color: C.goldDark, fontWeight: 600, fontFamily: font }}>No schools found</p>
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 14 }}>
            {schools.map(s => (
              <div key={s.id} style={{
                background: "white", border: `1px solid ${C.goldBorder}`,
                borderRadius: 20, padding: 16, transition: "all 150ms",
                boxShadow: "0 2px 8px rgba(254,191,16,0.06)",
              }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 14, flexShrink: 0,
                    background: C.goldBg, border: `1px solid ${C.goldBorder}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Building2 style={{ width: 18, height: 18, color: C.goldDark }}/>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 900, color: C.dark, fontSize: 13, margin: "0 0 2px",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {s.school_name}
                    </p>
                    <p style={{ fontSize: 10, color: C.goldDark, margin: 0 }}>{s.school_code}</p>
                  </div>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 12 }}>
                  {s.sector && (
                    <span style={{ fontSize: 10, background: C.goldBg, color: C.goldDark, border: `1px solid ${C.goldBorder}`, padding: "2px 8px", borderRadius: 8, fontWeight: 600 }}>
                      {s.sector}
                    </span>
                  )}
                  {s.school_category && <Badge status={s.school_category?.toLowerCase()}/>}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, paddingTop: 10, borderTop: `1px solid ${C.goldBorder}` }}>
                  {[
                    { l: "Total",    v: s.total_babyeyi    || 0, color: C.dark         },
                    { l: "Approved", v: s.approved_babyeyi || 0, color: C.emeraldDark  },
                    { l: "Pending",  v: s.pending_babyeyi  || 0, color: "#92400e"      },
                  ].map(({ l, v, color }) => (
                    <div key={l} style={{ textAlign: "center" }}>
                      <p style={{ fontSize: 16, fontWeight: 900, color, margin: "0 0 1px" }}>{v}</p>
                      <p style={{ fontSize: 9, color: C.goldDark, fontWeight: 600, margin: 0 }}>{l}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <Pagination current={page} total={pagination.pages} onChange={p => { setPage(p); load(p, search); }}/>
        </>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// ANALYTICS TAB — Charts, reports, filters (Term, Year, Sector)
// ════════════════════════════════════════════════════════════════
function AnalyticsTab({ district, data, loading, filters, sectorOptions = [], onFilterChange, onApply }) {
  const termOpts = ["", "Term 1", "Term 2", "Term 3"];
  const yearOpts = ["", "2026-2027", "2025-2026", "2024-2025", "2023-2024"];
  const sectors = sectorOptions.length ? ["", ...sectorOptions] : (data?.sector_breakdown?.length ? ["", ...data.sector_breakdown.map(s => s.sector)] : [""]);

  const BarBlock = ({ title, items, valueKey = "total", labelKey }) => {
    const max = Math.max(1, ...(items || []).map(x => Number(x[valueKey]) || 0));
    return (
      <div style={{ background: "white", borderRadius: 20, border: `1px solid ${C.goldBorder}`, padding: 20, boxShadow: "0 2px 8px rgba(254,191,16,0.07)" }}>
        <h3 style={{ fontWeight: 900, color: C.dark, fontSize: 13, margin: "0 0 14px", fontFamily: font }}>{title}</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {(items || []).slice(0, 10).map((row, i) => {
            const val = Number(row[valueKey]) || 0;
            const pct = max ? (val / max) * 100 : 0;
            const label = row[labelKey] ?? row.sector ?? row.term ?? row.academic_year ?? "—";
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 80, fontSize: 11, fontWeight: 700, color: C.darkMid, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={String(label)}>{label}</span>
                <div style={{ flex: 1, height: 24, background: C.goldBg, borderRadius: 8, overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: `linear-gradient(90deg, ${C.gold}, ${C.goldLight})`, borderRadius: 8, minWidth: val ? 4 : 0, transition: "width 0.3s ease" }}/>
                </div>
                <span style={{ fontSize: 12, fontWeight: 900, color: C.dark, flexShrink: 0, minWidth: 28, textAlign: "right" }}>{fmt(val)}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, fontFamily: font }}>
      <div style={{
        background: `linear-gradient(135deg, ${C.dark}, ${C.darkMid})`,
        borderRadius: 20, padding: "20px 24px", color: "white",
        boxShadow: "0 8px 24px rgba(26,18,0,0.2)", position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", inset: 0, opacity: 0.07, backgroundImage: "radial-gradient(circle at 80% 20%,white 0%,transparent 50%)", pointerEvents: "none" }}/>
        <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 900, margin: "0 0 4px", color: "white" }}>District Analytics</h2>
            <p style={{ fontSize: 12, color: C.goldLight, margin: 0 }}>{district} — Reports by Term, Year & Sector</p>
          </div>
          <span style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "8px 14px", borderRadius: 12,
            background: "rgba(254,191,16,0.18)", border: `1px solid ${C.gold}44`,
            fontSize: 12, fontWeight: 700, color: C.goldLight,
          }}>
            <BarChart2 style={{ width: 14, height: 14 }}/> Reports
          </span>
        </div>
      </div>

      {/* Filters */}
      <div style={{ background: "white", borderRadius: 20, border: `1px solid ${C.goldBorder}`, padding: 16, boxShadow: "0 2px 8px rgba(254,191,16,0.06)" }}>
        <p style={{ fontSize: 10, fontWeight: 900, color: C.goldDark, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 10px", fontFamily: font }}>Filters</p>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: 12 }}>
          <div>
            <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: C.goldDark, marginBottom: 4 }}>Term</label>
            <select value={filters.term || ""} onChange={e => onFilterChange("term", e.target.value)} style={inp}>
              {termOpts.map(o => <option key={o || "all"} value={o}>{o || "All"}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: C.goldDark, marginBottom: 4 }}>Academic year</label>
            <select value={filters.academic_year || ""} onChange={e => onFilterChange("academic_year", e.target.value)} style={inp}>
              {yearOpts.map(o => <option key={o || "all"} value={o}>{o || "All"}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: C.goldDark, marginBottom: 4 }}>Sector</label>
            <select value={filters.sector || ""} onChange={e => onFilterChange("sector", e.target.value)} style={{ ...inp, minWidth: 160 }}>
              {sectors.map(s => <option key={s || "all"} value={s}>{s || "All sectors"}</option>)}
            </select>
          </div>
          <button onClick={onApply} disabled={loading} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 14,
            fontSize: 13, fontWeight: 700, fontFamily: font,
            border: "none", background: C.dark, color: C.gold, cursor: loading ? "not-allowed" : "pointer",
            boxShadow: "0 4px 12px rgba(26,18,0,0.2)", opacity: loading ? 0.7 : 1,
          }}>
            {loading ? <Loader2 style={{ width: 16, height: 16, animation: "spin 0.8s linear infinite" }}/> : <Filter style={{ width: 16, height: 16 }}/>}
            Apply
          </button>
        </div>
      </div>

      {loading && !data ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 48 }}>
          <Loader2 style={{ width: 36, height: 36, color: C.gold, animation: "spin 0.8s linear infinite" }}/>
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
            <BarBlock title="By sector" items={data?.sector_breakdown} valueKey="total" labelKey="sector"/>
            <BarBlock title="By term" items={data?.term_breakdown} valueKey="total" labelKey="term"/>
            <BarBlock title="By academic year" items={data?.year_breakdown} valueKey="total" labelKey="academic_year"/>
          </div>

          {/* Schools with most requests */}
          {data?.school_requests?.length > 0 && (
            <div style={{ background: "white", borderRadius: 20, border: `1px solid ${C.goldBorder}`, overflow: "hidden", boxShadow: "0 2px 8px rgba(254,191,16,0.07)" }}>
              <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.goldBorder}`, display: "flex", alignItems: "center", gap: 8 }}>
                <TrendingUp style={{ width: 18, height: 18, color: C.goldDark }}/>
                <h3 style={{ fontWeight: 900, color: C.dark, fontSize: 14, margin: 0, fontFamily: font }}>Schools — requests & counts</h3>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, fontFamily: font }}>
                  <thead>
                    <tr style={{ background: C.goldBg }}>
                      <th style={{ padding: "12px 14px", textAlign: "left", fontWeight: 800, color: C.goldDeep }}>School</th>
                      <th style={{ padding: "12px 14px", textAlign: "left", fontWeight: 800, color: C.goldDeep }}>Sector</th>
                      <th style={{ padding: "12px 14px", textAlign: "left", fontWeight: 800, color: C.goldDeep }}>Year</th>
                      <th style={{ padding: "12px 14px", textAlign: "left", fontWeight: 800, color: C.goldDeep }}>Term</th>
                      <th style={{ padding: "12px 14px", textAlign: "right", fontWeight: 800, color: C.goldDeep }}>Total</th>
                      <th style={{ padding: "12px 14px", textAlign: "right", fontWeight: 800, color: C.goldDeep }}>Approved</th>
                      <th style={{ padding: "12px 14px", textAlign: "right", fontWeight: 800, color: C.goldDeep }}>Pending</th>
                      <th style={{ padding: "12px 14px", textAlign: "right", fontWeight: 800, color: C.goldDeep }}>Increase requests</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.school_requests.map((row, i) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${C.goldBorder}` }}>
                        <td style={{ padding: "12px 14px", fontWeight: 700, color: C.dark }}>{row.school_name || "—"}</td>
                        <td style={{ padding: "12px 14px", color: C.darkMid }}>{row.school_sector || "—"}</td>
                        <td style={{ padding: "12px 14px", color: C.darkMid }}>{row.academic_year || "—"}</td>
                        <td style={{ padding: "12px 14px", color: C.darkMid }}>{row.term || "—"}</td>
                        <td style={{ padding: "12px 14px", textAlign: "right", fontWeight: 700 }}>{fmt(row.total_babyeyi)}</td>
                        <td style={{ padding: "12px 14px", textAlign: "right", color: C.emeraldDark }}>{fmt(row.approved)}</td>
                        <td style={{ padding: "12px 14px", textAlign: "right", color: C.amber }}>{fmt(row.pending)}</td>
                        <td style={{ padding: "12px 14px", textAlign: "right", fontWeight: 800, color: row.increase_requests > 0 ? C.goldDark : C.darkMid }}>{fmt(row.increase_requests)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ════════════════════════════════════════════════════════════════
export default function DistrictBabyeyiDashboard() {
  const { user, loading: authLoading, isLoggedIn } = useAuth();
  const navigate = useNavigate();

  const [deo,       setDeo]       = useState(null);
  const [authErr,   setAuthErr]   = useState(null);
  const [authLoad,  setAuthLoad]  = useState(true);
  const [deoAssets, setDeoAssets] = useState({ signature_url: null, stamp_url: null });

  const [stats,     setStats]     = useState(null);
  const [statsLoad, setStatsLoad] = useState(false);

  const [items,      setItems]      = useState([]);
  const [listLoad,   setListLoad]   = useState(false);
  const [listErr,    setListErr]    = useState(null);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });

  const [filters, setFilters] = useState({
    status: "", year: "", term: "", category: "", level: "",
    sector: "", school_id: "", search: "", request_status: "", exceeds_limit: "",
  });
  const [showFilters, setShowFilters] = useState(false);
  const [page,        setPage]        = useState(1);

  const [tab,        setTab]        = useState("list");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [online,     setOnline]     = useState(navigator.onLine);

  const [actionModal, setActionModal] = useState({ open: false, action: null, item: null });
  const [actionLoad,  setActionLoad]  = useState(false);
  const [detailId,    setDetailId]    = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);

  const [toasts,   setToasts]   = useState([]);
  const [requests, setRequests] = useState([]);
  const [reqLoad,  setReqLoad]  = useState(false);
  const [reqErr,   setReqErr]   = useState(null);
  const [reqFilter, setReqFilter] = useState(""); // ""|"pending"|"recommended"|"approved"|"rejected"

  const [analyticsData, setAnalyticsData] = useState(null);
  const [analyticsLoad, setAnalyticsLoad] = useState(false);
  const [analyticsFilters, setAnalyticsFilters] = useState({ term: "", academic_year: "", sector: "" });
  const [analyticsSectors, setAnalyticsSectors] = useState([]); // full list for dropdown

  const meFetchedRef = useRef(false);

  const toast = useCallback((message, type = "info") => {
    const id = Date.now() + Math.random();
    setToasts(p => [...p, { id, message, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4500);
  }, []);
  const removeToast = useCallback(id => setToasts(p => p.filter(t => t.id !== id)), []);

  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener("online", on); window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  useEffect(() => {
    if (!authLoading && !isLoggedIn) navigate("/login", { replace: true });
  }, [authLoading, isLoggedIn, navigate]);

  useEffect(() => {
    if (meFetchedRef.current) return;
    meFetchedRef.current = true;
    setAuthLoad(true);
    apiFetch("/district/babyeyi/me")
      .then(r => { setDeo(r.data); setAuthErr(null); return apiFetch("/district/babyeyi/deo-assets"); })
      .then(r => setDeoAssets(r.data || {}))
      .catch(err => { meFetchedRef.current = false; setAuthErr(err.message || "Session expired."); })
      .finally(() => setAuthLoad(false));
  }, []);

  const loadStats = useCallback(() => {
    if (!deo) return;
    setStatsLoad(true);
    const params = new URLSearchParams();
    if (deo.district) params.append("district", deo.district);
    apiFetch(`/district/babyeyi/stats?${params}`)
      .then(r => setStats(r.data))
      .catch(e => console.error("Stats load failed:", e.message))
      .finally(() => setStatsLoad(false));
  }, [deo]);

  const loadList = useCallback((pageNum = 1) => {
    if (!deo) return;
    setListLoad(true); setListErr(null);
    const params = new URLSearchParams({ page: pageNum, limit: 12 });
    if (deo.district) params.append("district", deo.district);
    Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, v); });
    apiFetch(`/district/babyeyi/list?${params}`)
      .then(r => { setItems(Array.isArray(r.data) ? r.data : []); setPagination(r.pagination || { total: 0, page: 1, pages: 1 }); })
      .catch(e => setListErr(e.message))
      .finally(() => setListLoad(false));
  }, [deo, filters]);

  const loadRequests = useCallback(() => {
    if (!deo) return;
    setReqLoad(true); setReqErr(null);
    // Pass district explicitly as a query param so the backend can filter correctly
    // even if the session district injection is unreliable
    const params = new URLSearchParams();
    if (deo.district) params.append("district", deo.district);
    apiFetch(`/district/babyeyi/increase-requests?${params}`)
      .then(r => setRequests(Array.isArray(r.data) ? r.data : []))
      .catch(e => setReqErr(e.message || "Failed to load increase requests"))
      .finally(() => setReqLoad(false));
  }, [deo]);

  const loadAnalytics = useCallback((term = "", academic_year = "", sector = "") => {
    if (!deo) return;
    setAnalyticsLoad(true);
    const params = new URLSearchParams();
    if (deo.district) params.append("district", deo.district);
    if (term) params.append("term", term);
    if (academic_year) params.append("academic_year", academic_year);
    if (sector) params.append("sector", sector);
    apiFetch(`/district/babyeyi/analytics?${params}`)
      .then(r => {
        setAnalyticsData(r.data || null);
        if (!sector && r.data?.sector_breakdown?.length) setAnalyticsSectors(r.data.sector_breakdown.map(s => s.sector));
      })
      .catch(() => setAnalyticsData(null))
      .finally(() => setAnalyticsLoad(false));
  }, [deo]);

  useEffect(() => { if (!deo) return; loadStats(); loadList(1); }, [deo]); // eslint-disable-line
  useEffect(() => { if (!deo) return; loadList(page); }, [page, filters]); // eslint-disable-line
  useEffect(() => { if (tab === "requests" && deo) loadRequests(); }, [tab, deo]); // eslint-disable-line
  useEffect(() => { if (tab === "analytics" && deo) loadAnalytics(analyticsFilters.term, analyticsFilters.academic_year, analyticsFilters.sector); }, [tab, deo]); // eslint-disable-line

  const loadDeo = useCallback(() => {
    apiFetch("/district/babyeyi/me").then(r => setDeo(r.data)).catch(() => {});
  }, []);

  const handleAction = (action, item) => setActionModal({ open: true, action, item });

  const confirmAction = async ({ notes, sigFile, stampFile }) => {
    const { action, item } = actionModal;
    if (!item?.id) { toast("Invalid item — missing ID", "error"); return; }
    setActionLoad(true);
    try {
      let result;
      if (sigFile || stampFile) {
        const fd = new FormData();
        fd.append("notes", notes ?? "");
        if (sigFile)   fd.append("deo_signature",  sigFile);
        if (stampFile) fd.append("deo_stamp",      stampFile);
        result = await apiFetchMultipart(`/district/babyeyi/${item.id}/${action}`, fd, "PATCH");
      } else {
        const payload = { notes: notes || "", rejection_reason: notes || "" };
        result = await apiFetch(`/district/babyeyi/${item.id}/${action}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      void result;
      const msg = {
        approve:   `✅ Babyeyi approved for ${item.school_name || "school"}`,
        reject:    `❌ Babyeyi rejected for ${item.school_name || "school"}`,
        recommend: `📤 Sent to NESA for review — ${item.school_name || "school"}`,
      }[action] || "Action completed";
      toast(msg, "success");
      setActionModal({ open: false, action: null, item: null });
      // Always refresh stats + list + requests after any action
      loadStats();
      loadList(page);
      loadRequests();
    } catch (err) {
      toast(err.message || "Action failed. Please try again.", "error");
    } finally { setActionLoad(false); }
  };

  const filterUpdate = (key, val) => { setFilters(f => ({ ...f, [key]: val })); setPage(1); };
  const clearFilters = () => {
    setFilters({ status:"",year:"",term:"",category:"",level:"",sector:"",school_id:"",search:"",request_status:"",exceeds_limit:"" });
    setPage(1);
  };
  const switchTab = (id) => { setTab(id); setMobileOpen(false); };

  // ── Loading screen ───────────────────────────────────────────
  if (authLoading || authLoad) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: `linear-gradient(160deg, ${C.goldBg} 0%, ${C.goldBgMid} 40%, ${C.goldBorder} 100%)`,
        fontFamily: font,
      }}>
        <div style={{ textAlign: "center" }}>
          <Loader2 style={{ width: 40, height: 40, color: C.gold, animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }}/>
          <p style={{ color: C.goldDark, fontWeight: 600, fontSize: 13 }}>Verifying session…</p>
        </div>
      </div>
    );
  }

  if (authErr) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24, background: `linear-gradient(160deg, ${C.goldBg} 0%, ${C.goldBgMid} 40%, ${C.goldBorder} 100%)`,
        fontFamily: font,
      }}>
        <div style={{
          background: "white", borderRadius: 24, border: `1px solid ${C.redBorder}`,
          boxShadow: "0 20px 60px rgba(26,18,0,0.12)",
          padding: 32, maxWidth: 400, width: "100%", textAlign: "center",
        }}>
          <div style={{ width: 52, height: 52, background: C.red50, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <Shield style={{ width: 28, height: 28, color: C.red }}/>
          </div>
          <h2 style={{ fontWeight: 900, color: C.dark, fontSize: 18, margin: "0 0 8px" }}>Access Denied</h2>
          <p style={{ color: C.goldDark, fontSize: 13, margin: "0 0 24px" }}>{authErr}</p>
          <a href="/login" style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "12px 24px", background: `linear-gradient(135deg, ${C.dark}, ${C.darkMid})`,
            color: C.gold, borderRadius: 14, fontSize: 13, fontWeight: 700,
            textDecoration: "none", boxShadow: "0 4px 16px rgba(26,18,0,0.2)",
          }}>Go to Login</a>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // MAIN UI
  // ════════════════════════════════════════════════════════════
  return (
    <div style={{
      minHeight: "100vh", display: "flex",
      background: `linear-gradient(160deg, ${C.goldBg} 0%, #fff 40%, ${C.goldBgMid} 100%)`,
      fontFamily: font, color: C.dark,
    }}>
      <style>{globalStyles}</style>

      <Sidebar tab={tab} switchTab={switchTab} deo={deo} online={online} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} onOpenProfile={() => setProfileOpen(true)}/>

      <div className="lg:ml-60" style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <Header tab={tab} deo={deo} online={online} statsLoad={statsLoad} listLoad={listLoad}
          onRefresh={() => {
            loadStats();
            loadList(page);
            if (tab === "requests") loadRequests();
            if (tab === "analytics") loadAnalytics(analyticsFilters.term, analyticsFilters.academic_year, analyticsFilters.sector);
          }}
          setMobileOpen={setMobileOpen}/>

        <main style={{ flex: 1, padding: "20px 16px", display: "flex", flexDirection: "column", gap: 20 }}>
          <div className="lg:px-2">

            {/* ── HERO BANNER ── */}
            <div className="anim" style={{
              background: `linear-gradient(135deg, ${C.dark} 0%, ${C.darkMid} 100%)`,
              borderRadius: 24, padding: "20px 24px",
              boxShadow: "0 8px 32px rgba(26,18,0,0.2)",
              position: "relative", overflow: "hidden", marginBottom: 20,
            }}>
              <div style={{ position: "absolute", inset: 0, opacity: 0.07, backgroundImage: "radial-gradient(circle at 80% 20%,white 0%,transparent 50%)", pointerEvents: "none" }}/>
              <div style={{ position: "absolute", bottom: -32, right: -32, width: 160, height: 160, borderRadius: "50%", background: "rgba(254,191,16,0.07)", border: `1px solid ${C.gold}22`, pointerEvents: "none" }}/>
              <div style={{ position: "relative", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.emerald, animation: "pulse 2s infinite", flexShrink: 0 }}/>
                    <span style={{ color: C.goldLight, fontSize: 11 }}>
                      {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                    </span>
                  </div>
                  <h2 style={{ fontSize: 22, fontWeight: 900, color: "white", margin: "0 0 4px" }}>
                    {deo?.district ? `${deo.district} District` : "DEO Dashboard"}
                  </h2>
                  <p style={{ color: C.goldLight, fontSize: 13, margin: "0 0 14px" }}>
                    Welcome, {deo?.fullName || "District Education Officer"}
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {[
                      { icon: FileText,      label: `${stats?.total || 0} Babyeyi`,   bg: "rgba(255,255,255,0.12)", border: "rgba(255,255,255,0.18)"  },
                      { icon: CheckCircle,   label: `${stats?.approved || 0} Approved`, bg: "rgba(16,185,129,0.2)",  border: "rgba(16,185,129,0.3)"   },
                      ...(Number(stats?.exceeds_count || 0) > 0 ? [
                        { icon: AlertTriangle, label: `${stats.exceeds_count} Exceeding!`, bg: "rgba(239,68,68,0.2)", border: "rgba(239,68,68,0.3)", pulse: true }
                      ] : []),
                    ].map(({ icon: Icon, label, bg, border, pulse }) => (
                      <span key={label} style={{
                        display: "flex", alignItems: "center", gap: 6,
                        padding: "6px 12px", borderRadius: 12,
                        background: bg, border: `1px solid ${border}`,
                        fontSize: 11, fontWeight: 700, color: "white",
                        animation: pulse ? "pulse 2s infinite" : "none",
                      }}>
                        <Icon style={{ width: 13, height: 13 }}/> {label}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="hidden sm:flex" style={{
                  width: 52, height: 52, background: "rgba(254,191,16,0.15)",
                  border: `1px solid ${C.gold}44`, borderRadius: 16,
                  alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <Shield style={{ width: 26, height: 26, color: C.gold, opacity: 0.8 }}/>
                </div>
              </div>
            </div>

            {/* ── STATS GRID ── */}
            <div className="anim" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px,1fr))", gap: 10, marginBottom: 20 }}>
              {/* 2-col on mobile, 3-col sm, 6-col lg */}
              {[
                { icon: FileText,      label: "Total",            value: stats?.total,              color: "gold",    onClick: () => switchTab("list") },
                { icon: CheckCircle,   label: "Approved",         value: stats?.approved,           color: "emerald", onClick: () => { switchTab("list"); filterUpdate("status","approved"); } },
                { icon: Clock,         label: "Pending",          value: stats?.pending,            color: "amber",   onClick: () => { switchTab("list"); filterUpdate("status","pending"); }, alert: Number(stats?.pending||0) > 0 },
                { icon: AlertTriangle, label: "Exceeds Limit",    value: stats?.exceeds_count,      color: "red",     onClick: () => { switchTab("list"); filterUpdate("exceeds_limit","1"); }, alert: true },
                { icon: Building2,     label: "Schools",          value: stats?.schools_count,      color: "blue",    onClick: () => switchTab("schools") },
                { icon: TrendingUp,    label: "Pending Requests", value: stats?.pending_requests,   color: "violet",  onClick: () => switchTab("requests") },
              ].map((s, i) => (
                <StatCard key={i} {...s} loading={statsLoad}/>
              ))}
            </div>

            {/* ── TAB BAR ── */}
            <div className="anim" style={{
              display: "flex", gap: 4, background: "white",
              border: `1px solid ${C.goldBorder}`, borderRadius: 18, padding: 5,
              width: "fit-content", marginBottom: 20, boxShadow: "0 2px 8px rgba(254,191,16,0.07)",
            }}>
              {NAV.map(({ id, label, icon: Icon }) => {
                const isActive = tab === id;
                return (
                  <button key={id} onClick={() => switchTab(id)} style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "8px 16px", borderRadius: 14, fontSize: 13, fontWeight: 700,
                    border: "none", cursor: "pointer", fontFamily: font,
                    background: isActive ? `linear-gradient(135deg, ${C.dark}, ${C.darkMid})` : "transparent",
                    color:      isActive ? C.gold : C.goldDeep,
                    boxShadow:  isActive ? "0 4px 12px rgba(26,18,0,0.2)" : "none",
                    transition: "all 150ms",
                  }}>
                    <Icon style={{ width: 15, height: 15 }}/>
                    <span className="hidden sm:inline">{label}</span>
                  </button>
                );
              })}
            </div>

            {/* ══════════════════════════════════════════════ */}
            {/* TAB: LIST                                      */}
            {/* ══════════════════════════════════════════════ */}
            {tab === "list" && (
              <div className="anim">
                <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 300px", gap: 20, alignItems: "start" }}
                  className="list-grid">
                  <style>{`.list-grid { grid-template-columns: 1fr; } @media(min-width:1024px){ .list-grid { grid-template-columns: minmax(0,1fr) 300px; } }`}</style>
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      {/* Search + filters */}
                      <div style={{
                        background: "white", border: `1px solid ${C.goldBorder}`,
                        borderRadius: 20, padding: 16, boxShadow: "0 2px 8px rgba(254,191,16,0.06)",
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                          <div style={{ position: "relative", flex: 1, minWidth: 180 }}>
                            <Search style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: C.goldDark }}/>
                            <input value={filters.search} onChange={e => filterUpdate("search", e.target.value)}
                              placeholder="Search school, class, doc ID…" style={{ ...inp, paddingLeft: 38 }}/>
                          </div>
                          <button onClick={() => setShowFilters(f => !f)} style={{
                            display: "flex", alignItems: "center", gap: 8, padding: "10px 16px",
                            borderRadius: 14, fontSize: 13, fontWeight: 700, fontFamily: font,
                            border: `2px solid ${showFilters ? C.dark : C.goldBorder}`,
                            background: showFilters ? C.dark : "white",
                            color:      showFilters ? C.gold : C.goldDark,
                            cursor: "pointer", transition: "all 150ms",
                            boxShadow: showFilters ? "0 4px 12px rgba(26,18,0,0.2)" : "none",
                          }}>
                            <Filter style={{ width: 15, height: 15 }}/> Filters
                            <ChevronDown style={{ width: 12, height: 12, transform: showFilters ? "rotate(180deg)" : "none", transition: "transform 150ms" }}/>
                          </button>
                        </div>

                        {showFilters && (
                          <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.goldBorder}`, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
                            {[
                              { key: "status",        label: "Status",        options: ["approved","pending","rejected","draft"] },
                              { key: "year",          label: "Year",          options: ["2026-2027","2025-2026","2024-2025"] },
                              { key: "term",          label: "Term",          options: ["Term 1","Term 2","Term 3"] },
                              { key: "category",      label: "Category",      options: ["Government","Private","Government Aided"] },
                              { key: "level",         label: "Level",         options: ["Nursery","Primary","Secondary"] },
                              { key: "exceeds_limit", label: "Exceeds Limit", options: ["1"] },
                            ].map(({ key, label, options }) => (
                              <div key={key}>
                                <label style={{ display: "block", fontSize: 10, fontWeight: 900, color: C.goldDark, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4, fontFamily: font }}>
                                  {label}
                                </label>
                                <select value={filters[key]} onChange={e => filterUpdate(key, e.target.value)} style={inp}>
                                  <option value="">All</option>
                                  {options.map(o => <option key={o} value={o}>{o === "1" ? "Yes" : o}</option>)}
                                </select>
                              </div>
                            ))}
                            <div style={{ display: "flex", alignItems: "flex-end" }}>
                              <button onClick={clearFilters} style={{
                                padding: "10px 14px", fontSize: 12, fontWeight: 700, color: C.goldDark,
                                border: `1px solid ${C.goldBorder}`, borderRadius: 12, background: "white",
                                cursor: "pointer", fontFamily: font,
                              }}>
                                Clear All
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Active filter chips */}
                      {Object.values(filters).some(Boolean) && (
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 10, fontWeight: 900, color: C.goldDark, textTransform: "uppercase", letterSpacing: "0.06em" }}>Filters:</span>
                          {Object.entries(filters).filter(([, v]) => v).map(([k, v]) => (
                            <span key={k} style={{
                              display: "flex", alignItems: "center", gap: 5,
                              padding: "3px 10px", background: C.goldBgMid,
                              border: `1px solid ${C.goldBorder}`, borderRadius: 20,
                              fontSize: 11, fontWeight: 700, color: C.goldDark,
                            }}>
                              {k}: {v}
                              <button onClick={() => filterUpdate(k, "")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex" }}>
                                <X style={{ width: 11, height: 11, color: C.goldDark }}/>
                              </button>
                            </span>
                          ))}
                        </div>
                      )}

                      {/* List */}
                      {listLoad ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                          {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} style={{ height: 120, background: "white", borderRadius: 20, border: `1px solid ${C.goldBorder}`, opacity: 0.5 }}/>
                          ))}
                        </div>
                      ) : listErr ? (
                        <div style={{ background: C.red50, border: `1px solid ${C.redBorder}`, borderRadius: 20, padding: 24, textAlign: "center" }}>
                          <AlertCircle style={{ width: 32, height: 32, color: C.red, margin: "0 auto 8px" }}/>
                          <p style={{ color: C.red700, fontWeight: 600, fontSize: 13, fontFamily: font }}>{listErr}</p>
                          <button onClick={() => loadList(page)} style={{ marginTop: 10, fontSize: 12, fontWeight: 700, color: C.red700, background: "none", border: "none", cursor: "pointer" }}>Retry</button>
                        </div>
                      ) : items.length === 0 ? (
                        <div style={{ background: "white", border: `1px solid ${C.goldBorder}`, borderRadius: 20, padding: "40px 20px", textAlign: "center" }}>
                          <FileText style={{ width: 40, height: 40, color: C.goldBorder, margin: "0 auto 12px" }}/>
                          <p style={{ color: C.goldDark, fontWeight: 600, fontFamily: font }}>No babyeyi found for {deo?.district}</p>
                          <p style={{ color: C.goldBorder, fontSize: 12, marginTop: 4, fontFamily: font }}>Try adjusting your filters</p>
                        </div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                          {items.map(item => (
                            <BabyeyiCard key={item.id} item={item} onAction={handleAction} onView={i => setDetailId(i.id)}/>
                          ))}
                        </div>
                      )}

                      {pagination.pages > 1 && (
                        <div>
                          <Pagination current={page} total={pagination.pages} onChange={p => setPage(p)}/>
                          <p style={{ textAlign: "center", fontSize: 11, color: C.goldDark, marginTop: 8, fontFamily: font }}>
                            {pagination.total} total · Page {pagination.page} of {pagination.pages}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Right sidebar analytics */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      <SectorBreakdown sectors={stats?.sector_breakdown}/>

                      {stats?.school_breakdown?.length > 0 && (
                        <div style={{ background: "white", borderRadius: 20, border: `1px solid ${C.goldBorder}`, padding: 20, boxShadow: "0 2px 8px rgba(254,191,16,0.07)" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                            <Building2 style={{ width: 16, height: 16, color: C.goldDark }}/>
                            <h3 style={{ fontWeight: 900, color: C.dark, fontSize: 13, margin: 0, fontFamily: font }}>Top Schools</h3>
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            {stats.school_breakdown.slice(0, 5).map((s, i) => (
                              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <div style={{
                                  width: 20, height: 20, borderRadius: 6,
                                  background: C.goldBgMid, display: "flex", alignItems: "center", justifyContent: "center",
                                  fontSize: 9, fontWeight: 900, color: C.goldDark, flexShrink: 0,
                                }}>{i + 1}</div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <p style={{ fontSize: 12, fontWeight: 700, color: C.dark, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.school_name}</p>
                                  <p style={{ fontSize: 9, color: C.goldDark, margin: 0 }}>{s.school_sector}</p>
                                </div>
                                <span style={{ fontSize: 12, fontWeight: 900, color: C.dark, flexShrink: 0, background: C.goldBg, padding: "2px 8px", borderRadius: 8, border: `1px solid ${C.goldBorder}` }}>
                                  {s.total}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Quick actions */}
                      <div style={{ background: "white", borderRadius: 20, border: `1px solid ${C.goldBorder}`, padding: 16, boxShadow: "0 2px 8px rgba(254,191,16,0.07)" }}>
                        <p style={{ fontSize: 10, fontWeight: 900, color: C.goldDark, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 10px", fontFamily: font }}>
                          Quick Actions
                        </p>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                          {[
                            { label: "All Babyeyi",   icon: FileText,      onClick: clearFilters },
                            { label: "Pending",        icon: Clock,         onClick: () => filterUpdate("status","pending") },
                            { label: "Exceeds Limit",  icon: AlertTriangle, onClick: () => filterUpdate("exceeds_limit","1") },
                            { label: "View Schools",   icon: Building2,     onClick: () => switchTab("schools") },
                          ].map(({ label, icon: Icon, onClick }) => (
                            <button key={label} onClick={onClick} style={{
                              display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                              padding: 12, background: C.goldBg,
                              border: `1px solid ${C.goldBorder}`, borderRadius: 14,
                              cursor: "pointer", fontFamily: font, transition: "all 150ms",
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = C.goldBgMid}
                            onMouseLeave={e => e.currentTarget.style.background = C.goldBg}
                            >
                              <Icon style={{ width: 16, height: 16, color: C.goldDark }}/>
                              <span style={{ fontSize: 10, fontWeight: 700, color: C.darkMid, textAlign: "center", lineHeight: 1.3 }}>{label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════ */}
            {/* TAB: INCREASE REQUESTS                         */}
            {/* ══════════════════════════════════════════════ */}
            {tab === "requests" && (() => {
              const statusFilters = [
                { key: "", label: "All",         color: C.goldDark,     bg: C.goldBgMid,   border: C.goldBorder },
                { key: "pending",     label: "Pending",     color: "#92400e",     bg: C.amberBg,     border: C.amberBord  },
                { key: "recommended", label: "Sent to NESA",color: C.blue700,     bg: C.blueBg,      border: C.blueBord   },
                { key: "approved",    label: "Approved",    color: C.emeraldDark, bg: C.emeraldBg,   border: C.emeraldBord},
                { key: "rejected",    label: "Rejected",    color: C.red800,      bg: C.red50,       border: C.redBorder  },
              ];
              const filtered = reqFilter
                ? requests.filter(r => (r.nesa_status || r.status || "") === reqFilter)
                : requests;

              return (
              <div className="anim" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {/* Header */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                  <div>
                    <h2 style={{ fontWeight: 900, color: C.dark, fontSize: 18, margin: "0 0 4px", fontFamily: font }}>
                      Fee Increase Requests
                    </h2>
                    <p style={{ fontSize: 12, color: C.goldDark, margin: 0, fontFamily: font }}>
                      {deo?.district} District — schools requesting fees above NESA limits
                    </p>
                  </div>
                  <button onClick={loadRequests} disabled={reqLoad} style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "10px 18px",
                    background: `linear-gradient(135deg, ${C.dark}, ${C.darkMid})`,
                    color: C.gold, border: "none", borderRadius: 14, fontWeight: 700, fontSize: 13,
                    cursor: reqLoad ? "not-allowed" : "pointer", opacity: reqLoad ? 0.7 : 1,
                    boxShadow: "0 4px 12px rgba(26,18,0,0.2)", fontFamily: font,
                  }}>
                    <RefreshCw style={{ width: 14, height: 14, animation: reqLoad ? "spin 0.8s linear infinite" : "none" }}/> Refresh
                  </button>
                </div>

                {/* Summary cards */}
                {!reqLoad && !reqErr && requests.length > 0 && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
                    {[
                      { label: "Total",         value: requests.length,                                      color: C.goldDark,    bg: C.goldBg,    border: C.goldBorder  },
                      { label: "Pending Action",value: requests.filter(r => (r.nesa_status||"") === "pending").length, color: "#92400e", bg: C.amberBg, border: C.amberBord },
                      { label: "Sent to NESA",  value: requests.filter(r => (r.nesa_status||"") === "recommended").length, color: C.blue700, bg: C.blueBg, border: C.blueBord },
                      { label: "Resolved",      value: requests.filter(r => ["approved","rejected"].includes(r.nesa_status||"")).length, color: C.emeraldDark, bg: C.emeraldBg, border: C.emeraldBord },
                    ].map(({ label, value, color, bg, border }) => (
                      <div key={label} style={{ background: bg, border: `2px solid ${border}`, borderRadius: 16, padding: "12px 14px" }}>
                        <p style={{ fontSize: 20, fontWeight: 900, color, margin: "0 0 2px", fontFamily: font }}>{value}</p>
                        <p style={{ fontSize: 10, color, opacity: 0.8, fontWeight: 700, textTransform: "uppercase", margin: 0, fontFamily: font }}>{label}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Filter pills */}
                {!reqLoad && !reqErr && requests.length > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 10, fontWeight: 900, color: C.goldDark, textTransform: "uppercase", letterSpacing: "0.06em", marginRight: 4 }}>Filter:</span>
                    {statusFilters.map(f => {
                      const count = f.key ? requests.filter(r => (r.nesa_status||r.status||"") === f.key).length : requests.length;
                      const isActive = reqFilter === f.key;
                      return (
                        <button key={f.key} onClick={() => setReqFilter(f.key)} style={{
                          display: "flex", alignItems: "center", gap: 6,
                          padding: "5px 12px", borderRadius: 20,
                          border: `2px solid ${isActive ? f.color : f.border}`,
                          background: isActive ? f.bg : "white",
                          color: isActive ? f.color : C.goldDark,
                          fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: font,
                          transition: "all 150ms",
                        }}>
                          {f.label}
                          <span style={{
                            background: isActive ? f.color : C.goldBorder,
                            color: isActive ? "white" : C.goldDark,
                            fontSize: 9, fontWeight: 900,
                            padding: "1px 6px", borderRadius: 20, minWidth: 18, textAlign: "center",
                          }}>{count}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Error */}
                {reqErr && !reqLoad && (
                  <div style={{
                    background: C.red50, border: `1px solid ${C.redBorder}`,
                    borderRadius: 20, padding: "20px 24px",
                    display: "flex", alignItems: "center", gap: 14,
                  }}>
                    <AlertCircle style={{ width: 28, height: 28, color: C.red, flexShrink: 0 }}/>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 900, color: C.red800, fontSize: 14, margin: "0 0 4px", fontFamily: font }}>Failed to Load Requests</p>
                      <p style={{ fontSize: 12, color: C.red700, margin: "0 0 10px", fontFamily: font }}>{reqErr}</p>
                      <button onClick={loadRequests} style={{
                        padding: "8px 16px", background: C.red, color: "white", border: "none",
                        borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: font,
                      }}>Retry</button>
                    </div>
                  </div>
                )}

                {/* Loading skeleton */}
                {reqLoad && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} style={{ height: 160, background: "white", borderRadius: 20, border: `1px solid ${C.goldBorder}`, animation: "pulse 1.5s infinite" }}/>
                    ))}
                  </div>
                )}

                {/* Empty state */}
                {!reqLoad && !reqErr && requests.length === 0 && (
                  <div style={{
                    background: "white", border: `2px dashed ${C.goldBorder}`,
                    borderRadius: 24, padding: "60px 24px", textAlign: "center",
                  }}>
                    <div style={{
                      width: 64, height: 64, borderRadius: 20,
                      background: C.goldBg, border: `2px solid ${C.goldBorder}`,
                      display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px",
                    }}>
                      <TrendingUp style={{ width: 28, height: 28, color: C.goldDark }}/>
                    </div>
                    <p style={{ fontWeight: 900, color: C.dark, fontSize: 15, margin: "0 0 6px", fontFamily: font }}>
                      No increase requests
                    </p>
                    <p style={{ color: C.goldDark, fontSize: 12, fontFamily: font }}>
                      No schools in {deo?.district} district have submitted fee increase requests
                    </p>
                  </div>
                )}

                {/* Empty filtered state */}
                {!reqLoad && !reqErr && requests.length > 0 && filtered.length === 0 && (
                  <div style={{ background: "white", border: `1px solid ${C.goldBorder}`, borderRadius: 20, padding: "32px 24px", textAlign: "center" }}>
                    <p style={{ color: C.goldDark, fontWeight: 700, fontFamily: font }}>No {reqFilter} requests found</p>
                  </div>
                )}

                {/* Request cards */}
                {!reqLoad && !reqErr && filtered.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {filtered.map(req => {
                      // Normalize status field — backend may use nesa_status or status
                      const status = req.nesa_status || req.status || "pending";
                      const reqSt = {
                        pending:     { bg: C.amberBg,   border: C.amberBord,   text: "#92400e",      label: "Pending Action" },
                        recommended: { bg: C.blueBg,    border: C.blueBord,    text: C.blue700,      label: "Sent to NESA"   },
                        approved:    { bg: C.emeraldBg, border: C.emeraldBord, text: C.emeraldDark,  label: "Approved"       },
                        rejected:    { bg: C.red50,     border: C.redBorder,   text: C.red800,       label: "Rejected"       },
                      }[status] || { bg: C.goldBg, border: C.goldBorder, text: C.goldDark, label: status };

                      const overAmount = Math.max(0, Number(req.total_fee) - Number(req.nesa_limit));
                      // Use babyeyi_id for actions (the FK on the increase_request table)
                      const actionId = req.babyeyi_id || req.id;

                      return (
                        <div key={req.id} style={{
                          background: "white", border: `2px solid ${reqSt.border}`,
                          borderRadius: 22, overflow: "hidden",
                          boxShadow: "0 2px 12px rgba(26,18,0,0.06)",
                          fontFamily: font, transition: "all 150ms",
                        }}>
                          {/* Card header stripe */}
                          <div style={{
                            background: reqSt.bg, borderBottom: `1px solid ${reqSt.border}`,
                            padding: "10px 18px", display: "flex", alignItems: "center", justifyContent: "space-between",
                          }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <Building2 style={{ width: 16, height: 16, color: reqSt.text }}/>
                              <div>
                                <p style={{ fontWeight: 900, color: C.dark, fontSize: 14, margin: 0, lineHeight: 1.2 }}>{req.school_name || "—"}</p>
                                <p style={{ fontSize: 10, color: C.goldDark, margin: 0 }}>
                                  {(req.classes && req.classes.length > 0 ? req.classes.join(", ") : req.class)} · {req.term} · {req.academic_year} · Doc #{req.doc_id || req.babyeyi_id}
                                </p>
                              </div>
                            </div>
                            <span style={{
                              fontSize: 11, fontWeight: 900, padding: "4px 12px",
                              borderRadius: 20, border: `1px solid ${reqSt.border}`,
                              background: "rgba(255,255,255,0.8)", color: reqSt.text, whiteSpace: "nowrap",
                            }}>
                              {reqSt.label}
                            </span>
                          </div>

                          <div style={{ padding: "14px 18px 16px" }}>
                            {/* Reason */}
                            <p style={{ fontSize: 13, color: C.darkMid, margin: "0 0 14px", lineHeight: 1.6, borderLeft: `3px solid ${C.goldBorder}`, paddingLeft: 12 }}>
                              {req.reason || "No reason provided"}
                            </p>

                            {/* Fee comparison */}
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 14 }}>
                              {[
                                { l: "Fee Set",    v: `RWF ${fmt(req.total_fee)}`,  color: C.dark,         bg: C.goldBg,  border: C.goldBorder },
                                { l: "NESA Limit", v: `RWF ${fmt(req.nesa_limit)}`, color: C.emeraldDark,  bg: C.emeraldBg, border: C.emeraldBord },
                                { l: "Over By",    v: `+RWF ${fmt(overAmount)}`,    color: C.red800,       bg: C.red50,   border: C.redBorder  },
                              ].map(({ l, v, color, bg, border }) => (
                                <div key={l} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, padding: "10px 12px", textAlign: "center" }}>
                                  <p style={{ fontSize: 9, color: C.goldDark, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 4px" }}>{l}</p>
                                  <p style={{ fontSize: 14, fontWeight: 900, color, margin: 0 }}>{v}</p>
                                </div>
                              ))}
                            </div>

                            {/* Bottom row: docs + actions */}
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                              {/* School-submitted docs — view before decision */}
                              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                <p style={{ fontSize: 9, fontWeight: 900, color: C.goldDark, textTransform: "uppercase", letterSpacing: "0.06em", margin: 0 }}>
                                  View before approve / reject / send to NESA
                                </p>
                                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                  {req.parent_rep_doc_path ? (
                                    <a href={resolveUrl(req.parent_rep_doc_path)} target="_blank" rel="noopener noreferrer" style={{
                                      display: "flex", alignItems: "center", gap: 5,
                                      fontSize: 11, fontWeight: 700, color: C.violet,
                                      padding: "6px 12px", borderRadius: 10,
                                      background: C.violetBg, border: `1px solid ${C.violetBord}`,
                                      textDecoration: "none",
                                    }}>
                                      <FileImage style={{ width: 12, height: 12 }}/> Parent Rep Doc
                                    </a>
                                  ) : (
                                    <span style={{ fontSize: 10, color: C.slate400, padding: "6px 10px", background: C.slate100, borderRadius: 10 }}>Parent doc — not uploaded</span>
                                  )}
                                  {req.budget_doc_path ? (
                                    <a href={resolveUrl(req.budget_doc_path)} target="_blank" rel="noopener noreferrer" style={{
                                      display: "flex", alignItems: "center", gap: 5,
                                      fontSize: 11, fontWeight: 700, color: C.blue700,
                                      padding: "6px 12px", borderRadius: 10,
                                      background: C.blueBg, border: `1px solid ${C.blueBord}`,
                                      textDecoration: "none",
                                    }}>
                                      <FileCheck style={{ width: 12, height: 12 }}/> School Budget
                                    </a>
                                  ) : (
                                    <span style={{ fontSize: 10, color: C.slate400, padding: "6px 10px", background: C.slate100, borderRadius: 10 }}>Budget — not uploaded</span>
                                  )}
                                </div>
                              </div>
                              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                {req.deo_signature_path && (
                                  <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 700, color: C.emeraldDark,
                                    padding: "6px 10px", borderRadius: 10, background: C.emeraldBg, border: `1px solid ${C.emeraldBord}` }}>
                                    <PenLine style={{ width: 11, height: 11 }}/> DEO Signed
                                    {req.deo_stamp_path && <><Stamp style={{ width: 11, height: 11 }}/> Stamped</>}
                                  </span>
                                )}
                              </div>

                              {/* Action buttons — only show when pending */}
                              {status === "pending" && (
                                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                  <button onClick={() => handleAction("approve", { ...req, id: actionId })} style={{
                                    display: "flex", alignItems: "center", gap: 6,
                                    fontSize: 12, fontWeight: 900, color: "white",
                                    background: C.emerald, padding: "8px 16px", borderRadius: 12,
                                    border: "none", cursor: "pointer", fontFamily: font,
                                    boxShadow: "0 4px 12px rgba(16,185,129,0.35)",
                                  }}>
                                    <ThumbsUp style={{ width: 13, height: 13 }}/> Approve
                                  </button>
                                  <button onClick={() => handleAction("recommend", { ...req, id: actionId })} style={{
                                    display: "flex", alignItems: "center", gap: 6,
                                    fontSize: 12, fontWeight: 900, color: "white",
                                    background: C.blue, padding: "8px 16px", borderRadius: 12,
                                    border: "none", cursor: "pointer", fontFamily: font,
                                    boxShadow: "0 4px 12px rgba(59,130,246,0.35)",
                                  }}>
                                    <Send style={{ width: 13, height: 13 }}/> Send to NESA
                                  </button>
                                  <button onClick={() => handleAction("reject", { ...req, id: actionId })} style={{
                                    display: "flex", alignItems: "center", gap: 6,
                                    fontSize: 12, fontWeight: 900, color: "white",
                                    background: C.red, padding: "8px 16px", borderRadius: 12,
                                    border: "none", cursor: "pointer", fontFamily: font,
                                    boxShadow: "0 4px 12px rgba(239,68,68,0.35)",
                                  }}>
                                    <ThumbsDown style={{ width: 13, height: 13 }}/> Reject
                                  </button>
                                </div>
                              )}
                              {status === "recommended" && (
                                <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 900, color: C.blue700,
                                  padding: "8px 14px", borderRadius: 12, background: C.blueBg, border: `1px solid ${C.blueBord}` }}>
                                  <Check style={{ width: 14, height: 14 }}/> Forwarded to NESA — awaiting decision
                                </span>
                              )}
                              {status === "approved" && (
                                <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 900, color: C.emeraldDark,
                                  padding: "8px 14px", borderRadius: 12, background: C.emeraldBg, border: `1px solid ${C.emeraldBord}` }}>
                                  <CheckCircle style={{ width: 14, height: 14 }}/> Approved by NESA
                                </span>
                              )}
                              {status === "rejected" && (
                                <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 900, color: C.red800,
                                  padding: "8px 14px", borderRadius: 12, background: C.red50, border: `1px solid ${C.redBorder}` }}>
                                  <XCircle style={{ width: 14, height: 14 }}/> Rejected
                                </span>
                              )}
                            </div>

                            {/* DEO notes if any */}
                            {req.deo_notes && (
                              <div style={{ marginTop: 12, padding: "8px 12px", background: C.goldBg, border: `1px solid ${C.goldBorder}`, borderRadius: 10 }}>
                                <p style={{ fontSize: 11, color: C.goldDeep, fontStyle: "italic", margin: 0, fontFamily: font }}>
                                  DEO Notes: {req.deo_notes}
                                </p>
                              </div>
                            )}

                            <p style={{ fontSize: 9, color: C.goldBorder, margin: "10px 0 0", textAlign: "right", fontFamily: font }}>
                              Submitted {fmtDate(req.created_at)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
            })()}

            {/* ══════════════════════════════════════════════ */}
            {/* TAB: SCHOOLS                                   */}
            {/* ══════════════════════════════════════════════ */}
            {tab === "schools" && (
              <div className="anim"><SchoolsTab district={deo?.district}/></div>
            )}

            {tab === "analytics" && (
              <div className="anim">
                <AnalyticsTab
                  district={deo?.district}
                  data={analyticsData}
                  loading={analyticsLoad}
                  filters={analyticsFilters}
                  sectorOptions={analyticsSectors.length ? analyticsSectors : (analyticsData?.sector_breakdown?.map(s => s.sector) || [])}
                  onFilterChange={(key, val) => setAnalyticsFilters(f => ({ ...f, [key]: val }))}
                  onApply={() => loadAnalytics(analyticsFilters.term, analyticsFilters.academic_year, analyticsFilters.sector)}
                />
              </div>
            )}

          </div>
        </main>
      </div>

      {/* ── MODALS ── */}
      {profileOpen && (
        <DeoProfileModal
          open={profileOpen}
          deo={deo}
          onClose={() => setProfileOpen(false)}
          onUpdated={loadDeo}
          toast={toast}
        />
      )}
      {actionModal.open && (
        <ActionModal
          action={actionModal.action}
          item={actionModal.item}
          loading={actionLoad}
          deoAssets={deoAssets}
          onRefreshDeoAssets={() => apiFetch("/district/babyeyi/deo-assets").then(r => setDeoAssets(r.data || {}))}
          toast={toast}
          onClose={() => setActionModal({ open: false, action: null, item: null })}
          onConfirm={confirmAction}
        />
      )}

      {detailId && (
        <DetailDrawer
          id={detailId}
          onClose={() => setDetailId(null)}
          onAction={(action, item) => { setDetailId(null); handleAction(action, item); }}
        />
      )}

      <Toast toasts={toasts} remove={removeToast}/>
    </div>
  );
}