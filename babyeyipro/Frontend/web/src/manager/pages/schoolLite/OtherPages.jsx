import { useState, useEffect, useCallback, useRef } from "react";
import {
  Clock, CheckCircle, XCircle, RotateCcw, ArrowUpRight,
  Calendar, MessageSquare, FileText, Eye, AlertTriangle,
  Building2, Check, Loader2, Send, Download, Printer, Share2,
  QrCode, ShieldCheck, BadgeCheck, Flag,
  TrendingUp, Activity, BarChart3, DollarSign,
  Bell, Info, Upload, Save, Camera,
  Lock, Shield, User, Edit, Trash2, Plus, Search,
  Stamp, ZoomIn, ZoomOut, X,
} from "lucide-react";
import { Badge, Modal, THead, StatCard, LineAreaChart, DonutChart, HBarChart, Empty } from "./UI";
import { useAuth } from "../../context/AuthContext";
import { API_BASE, SERVER_BASE } from '../../lib/schoolLiteApi';
function profilePhotoUrl(photo) {
  if (!photo || typeof photo !== "string") return "";
  const path = photo.replace(/\\/g, "/").trim();
  if (path.startsWith("http")) return path;
  const base = SERVER_BASE.replace(/\/$/, "");
  return base + (path.startsWith("/") ? path : "/" + path);
}

// ── Gold Palette ──────────────────────────────────────────────
const C = {
  gold:       "#FEBF10",
  goldLight:  "#FED44A",
  goldDark:   "#B88A00",
  goldDeep:   "#7A5C00",
  goldBg:     "#FFFBE8",
  goldBgMid:  "#FFF3CC",
  goldBorder: "#FDEAA0",
  dark:       "#1A1200",
  darkMid:    "#3D2C00",
  emerald:    "#10b981",
  emeraldDark:"#047857",
  emeraldBg:  "#d1fae5",
  emeraldBord:"#6ee7b7",
  red:        "#ef4444",
  red50:      "#fef2f2",
  red700:     "#b91c1c",
  red800:     "#991b1b",
  redBorder:  "#fca5a5",
  amber:      "#f59e0b",
  amberBg:    "#fff7ed",
  amberBord:  "#fed7aa",
  blue:       "#3b82f6",
  blueBg:     "#eff6ff",
  blueBord:   "#bfdbfe",
  blue700:    "#1d4ed8",
  violet:     "#8b5cf6",
  violetBg:   "#f5f3ff",
  violetBord: "#ddd6fe",
  slate50:    "#f8fafc",
  slate100:   "#f1f5f9",
  slate200:   "#e2e8f0",
  slate400:   "#94a3b8",
  slate500:   "#64748b",
  slate600:   "#475569",
  slate700:   "#334155",
  slate800:   "#1e293b",
};

const font = "'Montserrat', sans-serif";

// Shared input style
const inp = {
  width: "100%", padding: "10px 12px",
  background: C.goldBg, border: `1px solid ${C.goldBorder}`,
  borderRadius: 12, fontSize: 13, color: C.dark,
  outline: "none", fontFamily: font, boxSizing: "border-box",
};

// Shared section title
const SectionTitle = ({ children }) => (
  <h3 style={{ fontWeight: 900, color: C.dark, fontSize: 18, margin: "0 0 4px", fontFamily: font }}>
    {children}
  </h3>
);
const SubTitle = ({ children }) => (
  <p style={{ fontSize: 12, color: C.goldDark, margin: 0, fontFamily: font }}>{children}</p>
);

const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap');
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes anim { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
  .anim { animation: anim 280ms ease-out both; }
`;

const Spinner = () => (
  <div style={{
    width: 32, height: 32, borderRadius: "50%",
    border: `4px solid ${C.goldBgMid}`, borderTopColor: C.gold,
    animation: "spin 0.8s linear infinite",
  }}/>
);

// ════════════════════════════════════════════════════
// REQUESTS PAGE
// ════════════════════════════════════════════════════
export function RequestsPage({ toast, t, session }) {
  const [requests,   setRequests]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [showDetail, setShowDetail] = useState(null);

  const schoolId = session?.schoolId ?? session?.school_id ?? session?.school?.id ?? null;

  const statusSteps = ["Submitted", "District Review", "NESA Decision"];
  const getProgress = (r) =>
    r.status === "pending" ? 1 : r.status === "district_review" ? 2 : 3;

  const mapStatus = (nesaStatus) => {
    if (nesaStatus === "approved")                                return "approved";
    if (nesaStatus === "rejected" || nesaStatus === "nesa_rejected") return "rejected";
    if (nesaStatus === "recommended")                             return "district_review";
    return "pending";
  };

  const fetchRequests = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (schoolId) params.set("school_id", String(schoolId));
      const res = await fetch(`${API_BASE}/babyeyi/requests?${params}`, { credentials: "include" });
      if (!res.ok) {
        let msg = `HTTP ${res.status}`;
        try { const j = await res.json(); msg = j.message || msg; } catch (_) {}
        throw new Error(msg);
      }
      const json = await res.json().catch(() => ({}));
      if (json.success === false) throw new Error(json.message || "Failed");
      const rows = Array.isArray(json.data) ? json.data : [];
      setRequests(rows.map(r => {
        const currentLimit = Number(r.currentLimit ?? r.current_limit ?? r.current_limit_amount ?? 0);
        const requested    = Number(r.requestedAmount ?? r.requested_amount ?? r.totalFee ?? r.total_fee ?? 0);
        const diff         = Math.max(0, requested - currentLimit);
        const diffPct      = currentLimit > 0 ? Math.round((diff / currentLimit) * 100) : 0;
        return {
          id: r.id,
          class: r.className || r.class_name || r.class || "—",
          term:  r.term || "—",
          year:  r.academicYear || r.academic_year || "—",
          status: mapStatus(r.nesaStatus || r.nesa_status),
          submittedAt: (r.submittedAt || r.submitted_at)
            ? new Date(r.submittedAt || r.submitted_at).toLocaleDateString("en-GB") : "—",
          currentLimit, requested, diff, diffPct,
          reason:      r.reason || r.request_title || "",
          description: r.description || r.other_reason || "",
          schoolDirectorSigned: ["district_review","approved"].includes(mapStatus(r.nesaStatus||r.nesa_status)),
          parentRepSigned:  !!(r.parentRepDocPath || r.parent_rep_doc_path),
          districtRecLetter: (r.nesaStatus||r.nesa_status)==="recommended"||(r.nesaStatus||r.nesa_status)==="approved",
          districtComment: r.deoNotes || r.deo_notes || "",
        };
      }));
    } catch (e) {
      setError(e.message || "Failed to load requests");
      if (toast) toast(e.message || "Failed", "error");
      setRequests([]);
    } finally { setLoading(false); }
  }, [schoolId, toast]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const statusColor = (s) => ({
    approved:      { bg: C.emeraldBg,  text: C.emeraldDark, border: C.emeraldBord },
    district_review:{ bg: C.blueBg,   text: C.blue700,     border: C.blueBord    },
    rejected:      { bg: C.red50,      text: C.red800,      border: C.redBorder   },
    pending:       { bg: C.goldBg,     text: C.goldDark,    border: C.goldBorder  },
  }[s] || { bg: C.goldBg, text: C.goldDark, border: C.goldBorder });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, fontFamily: font }} className="anim">
      <style>{globalStyles}</style>
      <div>
        <SectionTitle>📨 Increase Requests</SectionTitle>
        <SubTitle>Track your NESA fee increase approval requests</SubTitle>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
        {[
          { icon: Send,        label: "Total Requests",  value: requests.length,                                        color: C.gold },
          { icon: Clock,       label: "Pending",         value: requests.filter(r=>r.status==="pending").length,        color: C.amber },
          { icon: Building2,   label: "District Review", value: requests.filter(r=>r.status==="district_review").length, color: C.blue },
          { icon: CheckCircle, label: "Approved",        value: requests.filter(r=>r.status==="approved").length,       color: C.emerald },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} style={{
            background: "white", border: `1px solid ${C.goldBorder}`, borderRadius: 16,
            padding: "14px 16px", boxShadow: "0 2px 8px rgba(254,191,16,0.08)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 10,
                background: color + "22", display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Icon style={{ width: 16, height: 16, color }}/>
              </div>
              <p style={{ fontSize: 10, fontWeight: 700, color: C.goldDark, margin: 0, textTransform: "uppercase" }}>{label}</p>
            </div>
            <p style={{ fontSize: 24, fontWeight: 900, color: C.dark, margin: 0 }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Error banner */}
      {error && (
        <div style={{
          display: "flex", alignItems: "flex-start", gap: 12,
          padding: 16, background: C.red50, border: `1px solid ${C.redBorder}`, borderRadius: 16,
        }}>
          <AlertTriangle style={{ width: 16, height: 16, color: C.red, marginTop: 2, flexShrink: 0 }}/>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: C.red700, margin: "0 0 2px" }}>Failed to load requests</p>
            <p style={{ fontSize: 11, color: C.red700, margin: 0 }}>{error}</p>
          </div>
          <button onClick={fetchRequests} style={{
            display: "flex", alignItems: "center", gap: 6, padding: "6px 12px",
            background: C.red, color: "white", borderRadius: 12, fontSize: 11,
            fontWeight: 700, border: "none", cursor: "pointer", fontFamily: font,
          }}>
            <RotateCcw style={{ width: 12, height: 12 }}/> Retry
          </button>
        </div>
      )}

      {/* Request cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}><Spinner/></div>
        ) : requests.length === 0 && !error ? (
          <Empty msg="No increase requests yet"/>
        ) : requests.map(r => {
          const sc = statusColor(r.status);
          const prog = getProgress(r);
          return (
            <div key={r.id} style={{
              background: "white", border: `2px solid ${C.goldBorder}`,
              borderRadius: 20, boxShadow: "0 2px 8px rgba(254,191,16,0.06)",
            }}>
              <div style={{ padding: 20 }}>
                {/* Header */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <h4 style={{ fontWeight: 900, color: C.dark, margin: 0, fontSize: 15 }}>
                        {r.class} — {r.term} {r.year}
                      </h4>
                      <span style={{
                        padding: "2px 10px", borderRadius: 20, fontSize: 10, fontWeight: 900,
                        background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`,
                      }}>
                        {r.status.replace("_"," ").replace(/\b\w/g,l=>l.toUpperCase())}
                      </span>
                    </div>
                    <p style={{ fontSize: 11, color: C.goldDark, margin: 0, display: "flex", alignItems: "center", gap: 4 }}>
                      <Calendar style={{ width: 12, height: 12 }}/> Submitted {r.submittedAt}
                    </p>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, color: C.red, justifyContent: "flex-end" }}>
                      <ArrowUpRight style={{ width: 16, height: 16 }}/>
                      <span style={{ fontSize: 20, fontWeight: 900 }}>+{r.diffPct}%</span>
                    </div>
                    <p style={{ fontSize: 11, color: C.goldDark, margin: 0 }}>above limit</p>
                  </div>
                </div>

                {/* Fee comparison */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
                  {[
                    { label: "NESA Limit", val: `RWF ${r.currentLimit.toLocaleString()}`, bg: C.emeraldBg, border: C.emeraldBord, text: C.emeraldDark },
                    { label: "Requested",  val: `RWF ${r.requested.toLocaleString()}`,    bg: C.amberBg,   border: C.amberBord,   text: "#92400e"      },
                    { label: "Over By",    val: `+RWF ${r.diff.toLocaleString()}`,         bg: C.red50,     border: C.redBorder,   text: C.red800       },
                  ].map(f => (
                    <div key={f.label} style={{
                      background: f.bg, border: `1px solid ${f.border}`,
                      borderRadius: 14, padding: 12, textAlign: "center",
                    }}>
                      <p style={{ fontSize: 9, color: C.slate500, fontWeight: 700, textTransform: "uppercase", margin: "0 0 2px" }}>{f.label}</p>
                      <p style={{ fontSize: 13, fontWeight: 900, color: f.text, margin: 0 }}>{f.val}</p>
                    </div>
                  ))}
                </div>

                {/* Timeline */}
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 10, color: C.goldDark, fontWeight: 700, textTransform: "uppercase", margin: "0 0 8px" }}>
                    Request Status Timeline
                  </p>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    {statusSteps.map((step, i) => {
                      const done   = i < prog;
                      const active = i === prog - 1;
                      return (
                        <div key={step} style={{ display: "flex", alignItems: "center", flex: i < statusSteps.length - 1 ? 1 : "none" }}>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                            <div style={{
                              width: 24, height: 24, borderRadius: "50%", border: "2px solid",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: 9, fontWeight: 900,
                              borderColor:   done ? C.emerald : active ? C.gold : C.goldBorder,
                              background:    done ? C.emerald : active ? C.goldBgMid : "white",
                              color:         done ? "white"   : active ? C.goldDark  : C.goldBorder,
                            }}>
                              {done ? <Check style={{ width: 12, height: 12 }}/> : i + 1}
                            </div>
                            <p style={{
                              fontSize: 9, fontWeight: 600, marginTop: 4, textAlign: "center",
                              color: done ? C.emeraldDark : active ? C.goldDark : C.goldBorder,
                            }}>
                              {step}
                            </p>
                          </div>
                          {i < statusSteps.length - 1 && (
                            <div style={{
                              flex: 1, height: 2, marginBottom: 16,
                              background: done ? C.emerald : C.goldBorder,
                            }}/>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Document checklist */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 14 }}>
                  {[
                    { label: "Director Signed Doc", ok: r.schoolDirectorSigned },
                    { label: "Parent Rep Doc",       ok: r.parentRepSigned      },
                    { label: "District Rec. Letter", ok: r.districtRecLetter    },
                  ].map(d => (
                    <div key={d.label} style={{
                      display: "flex", alignItems: "center", gap: 8, padding: "8px 10px",
                      borderRadius: 12, border: "1px solid", fontSize: 11, fontWeight: 700,
                      background: d.ok ? C.emeraldBg : C.red50,
                      borderColor: d.ok ? C.emeraldBord : C.redBorder,
                      color: d.ok ? C.emeraldDark : C.red800,
                    }}>
                      {d.ok
                        ? <CheckCircle style={{ width: 14, height: 14, flexShrink: 0 }}/>
                        : <XCircle     style={{ width: 14, height: 14, flexShrink: 0 }}/>}
                      {d.label}
                    </div>
                  ))}
                </div>

                {r.districtComment && (
                  <div style={{
                    background: C.blueBg, border: `1px solid ${C.blueBord}`,
                    borderRadius: 12, padding: 12,
                    display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 12,
                  }}>
                    <MessageSquare style={{ width: 14, height: 14, color: C.blue, marginTop: 2, flexShrink: 0 }}/>
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 700, color: C.blue700, textTransform: "uppercase", margin: "0 0 2px" }}>
                        District Comment
                      </p>
                      <p style={{ fontSize: 11, color: C.blue700, margin: 0 }}>{r.districtComment}</p>
                    </div>
                  </div>
                )}

                <button onClick={() => setShowDetail(r)} style={{
                  width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  padding: 10, background: C.goldBg, border: `1px solid ${C.goldBorder}`,
                  color: C.darkMid, borderRadius: 12, fontSize: 12, fontWeight: 700,
                  cursor: "pointer", fontFamily: font,
                }}>
                  <Eye style={{ width: 14, height: 14 }}/> View Full Request Details
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {showDetail && (
        <Modal title={`Request Detail — ${showDetail.class}`} onClose={() => setShowDetail(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { label: "Reason",      val: showDetail.reason      || "Not specified" },
              { label: "Description", val: showDetail.description || "—"            },
            ].map(({ label, val }) => (
              <div key={label} style={{ background: C.goldBg, borderRadius: 16, padding: 16 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: C.goldDark, textTransform: "uppercase", margin: "0 0 6px" }}>{label}</p>
                <p style={{ fontSize: 13, color: C.dark, margin: 0, lineHeight: 1.6 }}>{val}</p>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════
// DOCUMENTS PAGE
// ════════════════════════════════════════════════════
export function DocumentsPage({ toast, session }) {
  const schoolId   = session?.schoolId ?? session?.school_id ?? session?.school?.id ?? null;
  const [showViewer, setShowViewer] = useState(null);
  const [zoom,       setZoom]       = useState(100);
  const [docs,       setDocs]       = useState([]);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    const fetchDocs = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ limit: "50", status: "approved" });
        if (schoolId) params.set("school_id", String(schoolId));
        const res  = await fetch(`${API_BASE}/babyeyi?${params}`, { credentials: "include" });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || json.success === false) throw new Error(json.message || "Failed");
        const rows = Array.isArray(json.data) ? json.data : [];
        setDocs(rows.map(b => ({
          id:     b.id,
          name:   `${b.class || b.class_name} ${b.term} Babyeyi ${b.academic_year}`,
          class:  b.class || b.class_name,
          term:   b.term,
          year:   b.academic_year,
          status: b.status,
          size:   "—",
          date:   b.created_at ? new Date(b.created_at).toLocaleDateString("en-GB") : "—",
          qr:     `BABYEYI-${b.id}`,
          type:   "Babyeyi",
        })));
      } catch (e) {
        if (toast) toast(e.message || "Failed to load documents", "error");
        setDocs([]);
      } finally { setLoading(false); }
    };
    fetchDocs();
  }, [toast, schoolId]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, fontFamily: font }} className="anim">
      <style>{globalStyles}</style>

      {/* Viewer modal */}
      {showViewer && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 150,
          background: "rgba(26,18,0,0.7)", backdropFilter: "blur(6px)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
        }}>
          <div style={{
            background: "white", borderRadius: 24, boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            width: "100%", maxWidth: 768, maxHeight: "90vh",
            display: "flex", flexDirection: "column", overflow: "hidden",
          }}>
            {/* Viewer toolbar */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "12px 20px", borderBottom: `1px solid ${C.goldBorder}`,
              background: C.goldBg, flexShrink: 0,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 32, height: 32, background: "#dc2626", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <FileText style={{ width: 16, height: 16, color: "white" }}/>
                </div>
                <div>
                  <p style={{ fontWeight: 700, color: C.dark, fontSize: 13, margin: 0 }}>{showViewer.name}</p>
                  <p style={{ fontSize: 10, color: C.goldDark, margin: 0 }}>{showViewer.type} · {showViewer.size}</p>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                {[
                  { icon: ZoomOut,  onClick: () => setZoom(z => Math.max(60, z - 20))  },
                  { icon: ZoomIn,   onClick: () => setZoom(z => Math.min(160, z + 20)) },
                  { icon: Download, onClick: () => {} },
                  { icon: Printer,  onClick: () => {} },
                ].map(({ icon: Icon, onClick }, i) => (
                  <button key={i} onClick={onClick} style={{
                    padding: 6, borderRadius: 8, background: "transparent", border: "none",
                    cursor: "pointer", color: C.goldDark, display: "flex",
                  }}>
                    <Icon style={{ width: 16, height: 16 }}/>
                  </button>
                ))}
                <span style={{
                  fontSize: 11, fontWeight: 700, color: C.goldDark,
                  width: 36, textAlign: "center",
                }}>{zoom}%</span>
                <button onClick={() => setShowViewer(null)} style={{
                  padding: 6, borderRadius: 8, background: C.red50, border: "none",
                  cursor: "pointer", color: C.red, display: "flex",
                }}>
                  <X style={{ width: 16, height: 16 }}/>
                </button>
              </div>
            </div>

            {/* Viewer body */}
            <div style={{ flex: 1, overflowY: "auto", background: C.goldBgMid, padding: 24, display: "flex", justifyContent: "center" }}>
              <div style={{
                background: "white", boxShadow: "0 8px 32px rgba(26,18,0,0.12)",
                borderRadius: 8, overflow: "hidden",
                width: `${zoom}%`, maxWidth: 600, minWidth: 280,
              }}>
                <div style={{ padding: 32, fontFamily: "Georgia, serif", minHeight: 500 }}>
                  {/* Doc header */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `2px solid ${C.dark}`, paddingBottom: 16, marginBottom: 20 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 12, background: C.dark, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Flag style={{ width: 20, height: 20, color: C.gold }}/>
                      </div>
                      <div>
                        <p style={{ fontWeight: 900, color: C.dark, margin: 0 }}>REPUBLIC OF RWANDA</p>
                        <p style={{ fontSize: 11, color: C.goldDark, margin: 0 }}>Ministry of Education · NESA</p>
                      </div>
                    </div>
                    <div style={{ textAlign: "right", fontSize: 11, color: C.goldDark }}>
                      <p style={{ margin: 0 }}>Ref: {showViewer.qr}</p>
                      <p style={{ margin: 0 }}>Date: {showViewer.date}</p>
                    </div>
                  </div>

                  <h2 style={{ textAlign: "center", fontWeight: 900, color: C.dark, fontSize: 18, margin: "0 0 4px", textTransform: "uppercase" }}>
                    BABYEYI YA FEES
                  </h2>
                  <p style={{ textAlign: "center", fontSize: 13, color: C.goldDark, margin: "0 0 24px" }}>
                    {showViewer.year} · {showViewer.term} · Class {showViewer.class}
                  </p>

                  <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13, color: C.darkMid, lineHeight: 1.7, marginBottom: 16 }}>
                    <p style={{ margin: 0 }}>Dear Parents and Guardians of Class <strong>{showViewer.class}</strong>,</p>
                    <p style={{ margin: 0 }}>We are pleased to present the school fee breakdown for <strong>{showViewer.term}, {showViewer.year}</strong>. Please review and ensure timely payment.</p>
                  </div>

                  {/* Fee table */}
                  <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 16, fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: C.dark }}>
                        <th style={{ padding: "8px 12px", textAlign: "left", color: C.gold, fontSize: 11 }}>Item</th>
                        <th style={{ padding: "8px 12px", textAlign: "right", color: C.gold, fontSize: 11 }}>Amount (RWF)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[{ n: "Tuition Fee", a: 18000 }, { n: "Academic Materials", a: 6000 }, { n: "Sports & Activities", a: 4000 }].map((r, i) => (
                        <tr key={i} style={{ background: i % 2 ? C.goldBg : "white" }}>
                          <td style={{ padding: "8px 12px", color: C.dark }}>{r.n}</td>
                          <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700, color: C.dark }}>{r.a.toLocaleString()}</td>
                        </tr>
                      ))}
                      <tr style={{ background: C.dark, borderTop: `2px solid ${C.gold}` }}>
                        <td style={{ padding: "8px 12px", fontWeight: 900, color: C.gold }}>TOTAL</td>
                        <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 900, color: C.gold }}>28,000</td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Signatures */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 32 }}>
                    {["Head Teacher", "Accountant"].map(role => (
                      <div key={role} style={{ textAlign: "center" }}>
                        <div style={{
                          border: `2px solid ${C.emeraldBord}`, background: C.emeraldBg,
                          borderRadius: 12, padding: 12, marginBottom: 8, minWidth: 80,
                        }}>
                          <div style={{ fontSize: 18, fontWeight: 900, color: C.emeraldDark, fontStyle: "italic", fontFamily: "cursive" }}>
                            {role === "Head Teacher" ? "Bosco" : "Marie"}
                          </div>
                          <BadgeCheck style={{ width: 14, height: 14, color: C.emerald, margin: "0 auto" }}/>
                        </div>
                        <p style={{ fontSize: 10, fontWeight: 700, color: C.goldDark, margin: 0 }}>{role}</p>
                      </div>
                    ))}
                    <div style={{ textAlign: "center" }}>
                      <div style={{
                        width: 64, height: 64, borderRadius: "50%",
                        border: `4px dashed ${C.goldBorder}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        opacity: 0.4, marginBottom: 8,
                      }}>
                        <Stamp style={{ width: 28, height: 28, color: C.goldDark }}/>
                      </div>
                      <p style={{ fontSize: 9, color: C.goldDark, margin: 0 }}>Official Stamp</p>
                    </div>
                  </div>

                  <div style={{ borderTop: `1px solid ${C.goldBorder}`, marginTop: 16, paddingTop: 12, textAlign: "center" }}>
                    <p style={{ fontSize: 9, color: C.goldDark, margin: 0 }}>
                      NESA Approved · {showViewer.qr} · Verify at nesa.rw
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div>
        <SectionTitle>📄 Document Center</SectionTitle>
        <SubTitle>Download, print, share and verify your Babyeyi documents</SubTitle>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
        {loading ? (
          <div style={{ gridColumn: "span 2", display: "flex", justifyContent: "center", padding: "40px 0" }}>
            <Spinner/>
          </div>
        ) : docs.length === 0 ? (
          <Empty msg="No approved Babyeyi documents yet"/>
        ) : docs.map(doc => (
          <div key={doc.id} style={{
            background: "white", border: `1px solid ${C.goldBorder}`,
            borderRadius: 20, boxShadow: "0 2px 8px rgba(254,191,16,0.07)", overflow: "hidden",
          }}>
            <div style={{
              background: `linear-gradient(135deg, ${C.goldBg}, ${C.goldBgMid})`,
              padding: 16, borderBottom: `1px solid ${C.goldBorder}`,
              display: "flex", alignItems: "flex-start", gap: 12,
            }}>
              <div style={{
                width: 40, height: 40, background: "#dc2626",
                borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, boxShadow: "0 4px 12px rgba(220,38,38,0.25)",
              }}>
                <FileText style={{ width: 20, height: 20, color: "white" }}/>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 700, color: C.dark, fontSize: 13, margin: "0 0 4px",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {doc.name}
                </p>
                <p style={{ fontSize: 10, color: C.goldDark, margin: 0 }}>
                  {doc.status} · {doc.size} · {doc.date}
                </p>
              </div>
            </div>

            <div style={{ padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
                  <QrCode style={{ width: 14, height: 14, color: C.goldDark }}/>
                  <span style={{ fontFamily: "monospace", fontWeight: 700, color: C.goldDeep }}>{doc.qr}</span>
                </div>
                {doc.status === "approved" && (
                  <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: C.emeraldDark }}>
                    <ShieldCheck style={{ width: 14, height: 14 }}/> NESA Verified
                  </span>
                )}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                {[
                  { icon: Eye,      label: "Preview",  onClick: () => setShowViewer(doc), bg: C.goldBg,   color: C.goldDark },
                  { icon: Download, label: "Download", onClick: () => {},                 bg: C.slate100, color: C.slate600 },
                  { icon: Share2,   label: "Share",    onClick: () => {},                 bg: C.slate100, color: C.slate600 },
                ].map(({ icon: Icon, label, onClick, bg, color }) => (
                  <button key={label} onClick={onClick} style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                    padding: 10, background: bg, border: `1px solid ${C.goldBorder}`,
                    borderRadius: 12, cursor: "pointer", fontFamily: font,
                  }}>
                    <Icon style={{ width: 16, height: 16, color }}/>
                    <span style={{ fontSize: 10, fontWeight: 700, color }}>{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════
// ANALYTICS PAGE
// ════════════════════════════════════════════════════
export function AnalyticsPage({ toast, session }) {
  const schoolId = session?.schoolId ?? session?.school_id ?? session?.school?.id ?? null;
  const [loading,      setLoading]      = useState(true);
  const [termData,     setTermData]     = useState([]);
  const [classData,    setClassData]    = useState([]);
  const [statusDonut,  setStatusDonut]  = useState([]);
  const [payBreakdown] = useState([
    { label: "Tuition",   value: 62, color: C.gold    },
    { label: "Materials", value: 18, color: C.emerald },
    { label: "Sports",    value: 12, color: C.amber   },
    { label: "Other",     value:  8, color: C.violet  },
  ]);
  const [summary, setSummary] = useState({ totalIncome: "RWF 0", complianceRate: "0%", avgIncrease: "0%" });

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const statsRes  = await fetch(`${API_BASE}/babyeyi/stats${schoolId ? `?school_id=${schoolId}` : ""}`, { credentials: "include" });
        const statsJson = await statsRes.json().catch(() => ({}));
        if (!statsRes.ok || statsJson.success === false) throw new Error(statsJson.message || "Failed");
        const s = statsJson.data || {};

        const listParams = new URLSearchParams({ limit: "200" });
        if (schoolId) listParams.set("school_id", String(schoolId));
        const listRes  = await fetch(`${API_BASE}/babyeyi?${listParams}`, { credentials: "include" });
        const listJson = await listRes.json().catch(() => ({}));
        if (!listRes.ok || listJson.success === false) throw new Error(listJson.message || "Failed");
        const rows = Array.isArray(listJson.data) ? listJson.data : [];

        const totalIncomeNumber = rows.reduce((sum, b) => sum + Number(b.total_fee || 0), 0);
        const exceeded          = Number(s.exceeds_count || 0);
        const total             = Number(s.total || rows.length || 0);
        const complianceRate    = total > 0 ? Math.round(((total - exceeded) / total) * 100) : 100;
        setSummary({
          totalIncome:    `RWF ${totalIncomeNumber.toLocaleString()}`,
          complianceRate: `${complianceRate}%`,
          avgIncrease:    `${(exceeded > 0 ? 12.4 : 0).toFixed(1)}%`,
        });

        const termMap = new Map();
        rows.forEach(b => {
          const label = `${b.term || ""} '${String(b.academic_year || "").slice(-2)}`.trim();
          if (!label) return;
          const prev = termMap.get(label) || { value: 0, limit: 0, count: 0 };
          prev.value += Number(b.total_fee || 0);
          prev.limit += Number(b.nesa_limit || 0);
          prev.count += 1;
          termMap.set(label, prev);
        });
        setTermData(Array.from(termMap.entries()).map(([label, v]) => ({
          label,
          value: Math.round((v.value / Math.max(1, v.count)) / 1000),
          limit: Math.round((v.limit / Math.max(1, v.count)) / 1000),
        })));

        const classMap = new Map();
        rows.forEach(b => {
          const cls = b.class || b.class_name;
          if (!cls) return;
          classMap.set(cls, (classMap.get(cls) || 0) + Number(b.total_fee || 0));
        });
        setClassData(Array.from(classMap.entries())
          .map(([label, totalFee]) => ({ label, value: Math.round(totalFee / 1000) }))
          .sort((a, b) => b.value - a.value).slice(0, 8));

        setStatusDonut([
          { label: "Approved", value: Number(s.approved || 0), color: C.emerald },
          { label: "Pending",  value: Number(s.pending  || 0), color: C.gold    },
          { label: "Rejected", value: Number(s.rejected || 0), color: C.red     },
        ]);
      } catch (e) {
        if (toast) toast(e.message || "Failed to load analytics", "error");
      } finally { setLoading(false); }
    };
    fetchAnalytics();
  }, [toast, schoolId]);

  const chartCard = (title, subtitle, children) => (
    <div style={{ background: "white", border: `1px solid ${C.goldBorder}`, borderRadius: 20, padding: 20, boxShadow: "0 2px 8px rgba(254,191,16,0.07)" }}>
      <h4 style={{ fontWeight: 700, color: C.dark, fontSize: 13, margin: "0 0 4px", display: "flex", alignItems: "center", gap: 8 }}>{title}</h4>
      {subtitle && <p style={{ fontSize: 10, color: C.goldDark, margin: "0 0 12px" }}>{subtitle}</p>}
      {children}
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, fontFamily: font }} className="anim">
      <style>{globalStyles}</style>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <SectionTitle>Financial Analytics</SectionTitle>
          <SubTitle>School fee trends and NESA compliance history (live data)</SubTitle>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {[
            { label: "PDF Report", bg: "white",  color: C.darkMid,   border: C.goldBorder },
            { label: "Excel",      bg: C.dark,   color: C.gold,      border: C.dark       },
          ].map(({ label, bg, color, border }) => (
            <button key={label} style={{
              display: "flex", alignItems: "center", gap: 8, padding: "8px 14px",
              background: bg, border: `1px solid ${border}`, borderRadius: 12,
              fontSize: 12, fontWeight: 700, color, cursor: "pointer", fontFamily: font,
            }}>
              <Download style={{ width: 14, height: 14 }}/> {label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
        {[
          { icon: DollarSign, label: "Total Projected Income", value: summary.totalIncome,    sub: "All Babyeyi",            color: C.emerald },
          { icon: Activity,   label: "Avg Compliance Rate",    value: summary.complianceRate, sub: "All years",              color: C.gold    },
          { icon: TrendingUp, label: "Avg Fee Increase",       value: summary.avgIncrease,    sub: "Year over year (approx)",color: C.amber   },
        ].map(({ icon: Icon, label, value, sub, color }) => (
          <div key={label} style={{
            background: "white", border: `1px solid ${C.goldBorder}`,
            borderRadius: 16, padding: "14px 16px", boxShadow: "0 2px 8px rgba(254,191,16,0.08)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: color + "22", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon style={{ width: 16, height: 16, color }}/>
              </div>
              <p style={{ fontSize: 10, fontWeight: 700, color: C.goldDark, margin: 0, textTransform: "uppercase" }}>{label}</p>
            </div>
            <p style={{ fontSize: 22, fontWeight: 900, color: C.dark, margin: "0 0 2px" }}>{value}</p>
            <p style={{ fontSize: 10, color: C.goldDark, margin: 0 }}>{sub}</p>
          </div>
        ))}
      </div>

      {loading && <div style={{ display: "flex", justifyContent: "center", padding: "32px 0" }}><Spinner/></div>}

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
        {chartCard(
          <><TrendingUp style={{ width: 16, height: 16, color: C.gold }}/> Fee Trend vs NESA Limit (×1000 RWF)</>,
          "Historical fee comparison across terms",
          <LineAreaChart data={termData} labelKey="label" valueKey="value" color={C.gold} height={145}/>
        )}
        {chartCard(
          <><Activity style={{ width: 16, height: 16, color: C.goldDark }}/> Request Status</>,
          null,
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
            <DonutChart data={statusDonut} size={120}/>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {statusDonut.map(d => (
                <div key={d.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: d.color }}/>
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 900, color: C.dark, margin: 0 }}>{d.value}</p>
                    <p style={{ fontSize: 9, color: C.goldDark, margin: 0 }}>{d.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {chartCard(
          <><BarChart3 style={{ width: 16, height: 16, color: C.gold }}/> Fee by Class (×1000 RWF)</>,
          null,
          <HBarChart data={classData} valueKey="value" labelKey="label"/>
        )}
        {chartCard(
          <><Activity style={{ width: 16, height: 16, color: C.goldDark }}/> Payment Category Breakdown (%)</>,
          null,
          <HBarChart data={payBreakdown} valueKey="value" labelKey="label"/>
        )}
      </div>

      {/* Compliance table */}
      <div style={{ background: "white", border: `1px solid ${C.goldBorder}`, borderRadius: 20, overflow: "hidden", boxShadow: "0 2px 8px rgba(254,191,16,0.07)" }}>
        <div style={{ padding: "14px 20px", borderBottom: `1px solid ${C.goldBorder}`, background: C.goldBg }}>
          <h4 style={{ fontWeight: 700, color: C.dark, fontSize: 13, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <ShieldCheck style={{ width: 16, height: 16, color: C.emerald }}/> NESA Compliance History
          </h4>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: font }}>
            <THead cols={["Year", "Term", "Class", "Your Fee", "NESA Limit", "Status", "Rate"]}/>
            <tbody>
              {termData.map((r, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${C.goldBorder}`, background: i % 2 ? C.goldBg : "white" }}>
                  <td style={{ padding: "12px 16px", fontSize: 12, color: C.goldDark, fontWeight: 600 }}>{r.y}</td>
                  <td style={{ padding: "12px 16px", fontSize: 12, color: C.slate600 }}>{r.t}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ width: 28, height: 28, borderRadius: 8, background: C.goldBgMid, color: C.goldDark, fontSize: 11, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {r.c}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", fontWeight: 700, color: C.dark, fontSize: 13 }}>RWF {(r.f || 0).toLocaleString()}</td>
                  <td style={{ padding: "12px 16px", fontWeight: 700, color: C.emeraldDark, fontSize: 13 }}>RWF {(r.l || 0).toLocaleString()}</td>
                  <td style={{ padding: "12px 16px" }}><Badge status={r.s}/></td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ flex: 1, height: 6, borderRadius: 3, background: C.goldBgMid, overflow: "hidden" }}>
                        <div style={{ height: "100%", borderRadius: 3, background: C.emerald, width: `${r.r || 0}%` }}/>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 900, color: C.dark }}>{r.r || 0}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════
// NOTIFICATIONS PAGE
// ════════════════════════════════════════════════════
export function NotificationsPage({ toast, setNotifCount }) {
  const [notifs,  setNotifs]  = useState([]);
  const [loading, setLoading] = useState(true);
  const unread = notifs.filter(n => !n.read).length;

  const typeStyle = {
    violation:  { bg: C.red50,     border: C.redBorder,   icon: <AlertTriangle style={{ width: 16, height: 16, color: C.red }}/> },
    approved:   { bg: C.emeraldBg, border: C.emeraldBord, icon: <CheckCircle   style={{ width: 16, height: 16, color: C.emerald }}/> },
    request:    { bg: C.amberBg,   border: C.amberBord,   icon: <Send          style={{ width: 16, height: 16, color: C.amber }}/> },
    system:     { bg: C.blueBg,    border: C.blueBord,    icon: <Info          style={{ width: 16, height: 16, color: C.blue }}/> },
    regulation: { bg: C.violetBg,  border: C.violetBord,  icon: <FileText      style={{ width: 16, height: 16, color: C.violet }}/> },
  };

  const markRead = (id) => {
    setNotifs(p => p.map(n => n.id === id ? { ...n, read: true } : n));
    setNotifCount(prev => Math.max(0, prev - 1));
  };
  const markAll = () => { setNotifs(p => p.map(n => ({ ...n, read: true }))); setNotifCount(0); };

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const res  = await fetch(`${API_BASE}/notifications/statistics`, { credentials: "include" });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || json.success === false) throw new Error(json.message || "Failed");
        const d = json.data || {};
        const generated = [
          { id: 1, type: "system",     title: "Notification summary", read: false, time: "Just now",
            body: `Total: ${d.total_notifications??0}. Sent: ${d.sent_count??0}, Failed: ${d.failed_count??0}.` },
          { id: 2, type: "request",    title: "Pending notifications", time: "Just now",
            read: (d.pending_count??0) === 0, body: `Pending in queue: ${d.pending_count??0}.` },
          { id: 3, type: "regulation", title: "Channel usage", time: "Just now", read: true,
            body: `Email: ${d.email_count??0}, SMS: ${d.sms_count??0}, Both: ${d.both_count??0}.` },
        ];
        setNotifs(generated);
        setNotifCount(generated.filter(n => !n.read).length);
      } catch (e) {
        if (toast) toast(e.message || "Failed", "error");
        setNotifs([]); setNotifCount(0);
      } finally { setLoading(false); }
    };
    fetchStats();
  }, [toast, setNotifCount]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, fontFamily: font }} className="anim">
      <style>{globalStyles}</style>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div>
          <SectionTitle>🔔 Notifications</SectionTitle>
          <SubTitle>{unread} unread notification{unread !== 1 ? "s" : ""}</SubTitle>
        </div>
        {unread > 0 && (
          <button onClick={markAll} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "8px 14px",
            background: "white", border: `1px solid ${C.goldBorder}`, color: C.darkMid,
            borderRadius: 12, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: font,
          }}>
            <CheckCircle style={{ width: 14, height: 14 }}/> Mark All Read
          </button>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "32px 0" }}><Spinner/></div>
        ) : notifs.length === 0 ? (
          <Empty msg="No notifications yet"/>
        ) : notifs.map(n => {
          const ts = typeStyle[n.type] || { bg: "white", border: C.goldBorder, icon: <Bell style={{ width: 16, height: 16, color: C.goldDark }}/> };
          return (
            <div
              key={n.id}
              onClick={() => !n.read && markRead(n.id)}
              style={{
                border: `1px solid ${ts.border}`, borderRadius: 16, padding: 16,
                background: ts.bg, opacity: n.read ? 0.6 : 1,
                cursor: n.read ? "default" : "pointer", transition: "all 150ms",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 12,
                  background: n.read ? C.slate100 : "white",
                  border: "1px solid rgba(255,255,255,0.7)",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  {ts.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 2 }}>
                    <h4 style={{ fontWeight: 700, color: C.dark, fontSize: 13, margin: 0 }}>{n.title}</h4>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                      <span style={{ fontSize: 10, color: C.goldDark }}>{n.time}</span>
                      {!n.read && <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.gold }}/>}
                    </div>
                  </div>
                  <p style={{ fontSize: 12, color: C.darkMid, lineHeight: 1.6, margin: 0 }}>{n.body}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════
// SCHOOL SETTINGS PAGE
// ════════════════════════════════════════════════════
const inpStyle = {
  width: "100%", padding: "10px 12px",
  background: C.goldBg, border: `1px solid ${C.goldBorder}`,
  borderRadius: 12, fontSize: 13, color: C.dark, outline: "none",
  fontFamily: font, boxSizing: "border-box",
};

export function SettingsPage({ toast, schoolProfile, setSchoolProfile }) {
  const auth = useAuth();
  const [form,      setForm]      = useState({ ...schoolProfile });
  const [saving,    setSaving]    = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoSaving, setPhotoSaving] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const photoInputRef = useRef(null);

  const up = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/babyeyi/school-info`, { credentials: "include" });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || json.success === false) return;
        const s = json.data?.school || {};
        if (cancelled) return;
        setForm((prev) => ({
          ...prev,
          name: s.school_name || prev.name,
          headTeacher: s.head_teacher_name || prev.headTeacher,
          district: s.district || prev.district,
          sector: s.sector || prev.sector,
          email: s.email || prev.email,
          phone: s.phone || prev.phone,
          category: s.category || prev.category,
        }));
        setSchoolProfile((prev) => ({
          ...prev,
          name: s.school_name || prev.name,
          headTeacher: s.head_teacher_name || prev.headTeacher,
          district: s.district || prev.district,
          sector: s.sector || prev.sector,
          email: s.email || prev.email,
          phone: s.phone || prev.phone,
          category: s.category || prev.category,
        }));
      } catch (_) { /* keep defaults */ }
    })();
    return () => { cancelled = true; };
  }, [setSchoolProfile]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/babyeyi/school-profile`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          headTeacher: form.headTeacher,
          district: form.district,
          sector: form.sector,
          email: form.email,
          phone: form.phone,
          category: form.category,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) throw new Error(json.message || "Save failed");
      setSchoolProfile(form);
      if (typeof auth.refresh === "function") await auth.refresh();
      toast("School profile updated!", "success");
    } catch (e) {
      toast(e.message || "Save failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: "profile",  label: "👤 My Profile" },
    { id: "identity", label: "🏫 Identity" },
    { id: "assets",   label: "🖼 Assets"   },
    { id: "defaults", label: "⚙️ Defaults" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, fontFamily: font }} className="anim">
      <style>{globalStyles}</style>
      <div>
        <SectionTitle>🏢 School Settings</SectionTitle>
        <SubTitle>Configure your school profile and defaults</SubTitle>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", background: "white", border: `1px solid ${C.goldBorder}`, borderRadius: 16, padding: 4, gap: 4, width: "fit-content" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            padding: "8px 16px", borderRadius: 12, fontSize: 12, fontWeight: 700,
            border: "none", cursor: "pointer", fontFamily: font,
            background: activeTab === t.id ? C.dark    : "transparent",
            color:      activeTab === t.id ? C.gold    : C.goldDark,
            boxShadow:  activeTab === t.id ? "0 2px 8px rgba(26,18,0,0.2)" : "none",
            transition: "all 150ms",
          }}>{t.label}</button>
        ))}
      </div>

      {/* My Profile — photo + change password */}
      {activeTab === "profile" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24, fontFamily: font }}>
          <div style={{ background: "white", border: `1px solid ${C.goldBorder}`, borderRadius: 20, padding: 20 }}>
            <h4 style={{ fontWeight: 700, color: C.dark, fontSize: 13, display: "flex", alignItems: "center", gap: 8, margin: "0 0 16px" }}>
              <User style={{ width: 16, height: 16, color: C.gold }}/> Profile Photo
            </h4>
            <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
              <div style={{ width: 88, height: 88, borderRadius: "50%", overflow: "hidden", border: `3px solid ${C.goldBorder}`, background: C.goldBg, flexShrink: 0 }}>
                {(photoPreview || auth.user?.photo) ? (
                  <img
                    src={photoPreview || profilePhotoUrl(auth.user?.photo)}
                    alt="Profile"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: C.goldBgMid }}>
                    <User style={{ width: 36, height: 36, color: C.goldDark }}/>
                  </div>
                )}
              </div>
              <div>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target?.files?.[0];
                    if (file) {
                      setPhotoFile(file);
                      setPhotoPreview(URL.createObjectURL(file));
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  style={{
                    padding: "10px 18px", fontFamily: font, fontWeight: 700, fontSize: 12,
                    background: C.goldBg, border: `2px solid ${C.goldBorder}`, borderRadius: 12,
                    color: C.dark, cursor: "pointer", marginRight: 8,
                  }}
                >
                  <Upload style={{ width: 14, height: 14, verticalAlign: "middle", marginRight: 6 }}/>
                  Choose Image
                </button>
                {photoFile && (
                  <button
                    type="button"
                    disabled={photoSaving}
                    onClick={async () => {
                      setPhotoSaving(true);
                      try {
                        const fd = new FormData();
                        fd.append("photo", photoFile);
                        const res = await fetch(`${API_BASE}/auth/profile/photo`, {
                          method: "POST",
                          credentials: "include",
                          body: fd,
                        });
                        const json = await res.json().catch(() => ({}));
                        if (res.ok && json.success) {
                          setPhotoFile(null);
                          setPhotoPreview(null);
                          if (photoInputRef.current) photoInputRef.current.value = "";
                          auth.refresh();
                          toast("Profile photo updated!", "success");
                        } else {
                          toast(json.message || "Upload failed", "error");
                        }
                      } catch (err) {
                        toast("Failed to upload photo", "error");
                      } finally {
                        setPhotoSaving(false);
                      }
                    }}
                    style={{
                      padding: "10px 18px", fontFamily: font, fontWeight: 700, fontSize: 12,
                      background: C.dark, border: "none", borderRadius: 12, color: C.gold, cursor: photoSaving ? "not-allowed" : "pointer",
                    }}
                  >
                    {photoSaving ? <Loader2 style={{ width: 14, height: 14, animation: "spin 0.8s linear infinite", verticalAlign: "middle" }}/> : "Upload"}
                  </button>
                )}
                <p style={{ fontSize: 11, color: C.goldDark, margin: "8px 0 0" }}>JPEG, PNG or WebP, max 2MB</p>
              </div>
            </div>
          </div>

          <div style={{ background: "white", border: `1px solid ${C.goldBorder}`, borderRadius: 20, padding: 20 }}>
            <h4 style={{ fontWeight: 700, color: C.dark, fontSize: 13, display: "flex", alignItems: "center", gap: 8, margin: "0 0 16px" }}>
              <Lock style={{ width: 16, height: 16, color: C.gold }}/> Change Password
            </h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, maxWidth: 480 }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: C.goldDark, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Current password</label>
                <input
                  type="password"
                  value={pwForm.currentPassword}
                  onChange={(e) => setPwForm((f) => ({ ...f, currentPassword: e.target.value }))}
                  placeholder="Enter current password"
                  style={inpStyle}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: C.goldDark, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>New password</label>
                <input
                  type="password"
                  value={pwForm.newPassword}
                  onChange={(e) => setPwForm((f) => ({ ...f, newPassword: e.target.value }))}
                  placeholder="At least 8 characters"
                  style={inpStyle}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: C.goldDark, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Confirm new password</label>
                <input
                  type="password"
                  value={pwForm.confirmPassword}
                  onChange={(e) => setPwForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                  placeholder="Repeat new password"
                  style={inpStyle}
                />
              </div>
            </div>
            <button
              type="button"
              disabled={pwSaving || !pwForm.currentPassword || !pwForm.newPassword || !pwForm.confirmPassword}
              onClick={async () => {
                if (pwForm.newPassword !== pwForm.confirmPassword) {
                  toast("New password and confirm do not match", "error");
                  return;
                }
                if (pwForm.newPassword.length < 8) {
                  toast("New password must be at least 8 characters", "error");
                  return;
                }
                setPwSaving(true);
                try {
                  const res = await fetch(`${API_BASE}/auth/change-password`, {
                    method: "PUT",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      currentPassword: pwForm.currentPassword,
                      newPassword: pwForm.newPassword,
                    }),
                  });
                  const json = await res.json().catch(() => ({}));
                  if (res.ok && json.success) {
                    setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
                    toast("Password changed successfully!", "success");
                  } else {
                    toast(json.message || "Failed to change password", "error");
                  }
                } catch (err) {
                  toast("Failed to change password", "error");
                } finally {
                  setPwSaving(false);
                }
              }}
              style={{
                marginTop: 16, padding: "12px 24px", fontFamily: font, fontWeight: 700, fontSize: 13,
                background: pwSaving || !pwForm.currentPassword || !pwForm.newPassword || !pwForm.confirmPassword ? C.slate200 : `linear-gradient(135deg, ${C.dark}, ${C.darkMid})`,
                color: C.gold, border: "none", borderRadius: 14, cursor: pwSaving ? "not-allowed" : "pointer",
                opacity: pwSaving ? 0.8 : 1,
              }}
            >
              {pwSaving ? <><Loader2 style={{ width: 16, height: 16, animation: "spin 0.8s linear infinite", verticalAlign: "middle", marginRight: 8 }}/> Updating…</> : "Change Password"}
            </button>
          </div>
        </div>
      )}

      {/* Identity */}
      {activeTab === "identity" && (
        <div style={{ background: "white", border: `1px solid ${C.goldBorder}`, borderRadius: 20, padding: 20 }}>
          <h4 style={{ fontWeight: 700, color: C.dark, fontSize: 13, display: "flex", alignItems: "center", gap: 8, margin: "0 0 16px" }}>
            <Building2 style={{ width: 16, height: 16, color: C.gold }}/> School Identity
          </h4>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[
              { label: "School Name *",     key: "name",        placeholder: "e.g. GS Kigali Heights"    },
              { label: "Head Teacher Name", key: "headTeacher", placeholder: "e.g. Jean Bosco NZEYIMANA" },
              { label: "District",          key: "district",    placeholder: "e.g. Gasabo"                },
              { label: "Sector",            key: "sector",      placeholder: "e.g. Kimironko"             },
              { label: "Email Address",     key: "email",       placeholder: "school@edu.rw"              },
              { label: "Phone Number",      key: "phone",       placeholder: "+250 7XX XXX XXX"           },
            ].map(({ label, key, placeholder }) => (
              <div key={key}>
                <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: C.goldDark, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
                  {label}
                </label>
                <input
                  value={form[key] || ""}
                  onChange={e => up(key, e.target.value)}
                  placeholder={placeholder}
                  style={inpStyle}
                />
              </div>
            ))}
            {[
              { label: "School Category", key: "category", opts: ["Public","Private","Boarding","TVET"] },
              { label: "School Level",    key: "level",    opts: ["Nursery","Primary","Secondary","Multi-level"] },
            ].map(({ label, key, opts }) => (
              <div key={key}>
                <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: C.goldDark, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
                  {label}
                </label>
                <select value={form[key] || ""} onChange={e => up(key, e.target.value)} style={inpStyle}>
                  {opts.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Assets */}
      {activeTab === "assets" && (
        <div style={{ background: "white", border: `1px solid ${C.goldBorder}`, borderRadius: 20, padding: 20 }}>
          <h4 style={{ fontWeight: 700, color: C.dark, fontSize: 13, display: "flex", alignItems: "center", gap: 8, margin: "0 0 6px" }}>
            <Camera style={{ width: 16, height: 16, color: C.gold }}/> Upload Assets
          </h4>
          <p style={{ fontSize: 11, color: C.goldDark, margin: "0 0 16px" }}>
            These assets will be used in all generated Babyeyi PDFs.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {[
              { label: "School Logo",            key: "logo",          icon: "🏫", desc: "PNG or JPG, max 2MB"                  },
              { label: "Head Teacher Signature", key: "directorSig",   icon: "✍️", desc: "Clear signature on white background" },
              { label: "Accountant Signature",   key: "accountantSig", icon: "✍️", desc: "Clear signature on white background" },
              { label: "Official School Stamp",  key: "stamp",         icon: "🔏", desc: "PNG with transparent background"     },
            ].map(({ label, key, icon, desc }) => (
              <div key={key}>
                <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: C.goldDark, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
                  {label}
                </label>
                <div style={{
                  border: `2px dashed ${C.goldBorder}`, borderRadius: 16, padding: 20,
                  textAlign: "center", cursor: "pointer",
                  background: C.goldBg, transition: "all 150ms",
                }}>
                  {form[key] ? (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <CheckCircle style={{ width: 32, height: 32, color: C.emerald, marginBottom: 8 }}/>
                      <p style={{ fontSize: 12, color: C.emeraldDark, fontWeight: 700, margin: 0 }}>Uploaded Successfully</p>
                      <button style={{ marginTop: 8, fontSize: 10, color: C.red, background: "none", border: "none", cursor: "pointer" }}>Remove</button>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
                      <Upload style={{ width: 20, height: 20, color: C.goldBorder, margin: "0 auto 8px" }}/>
                      <p style={{ fontSize: 12, color: C.goldDark, fontWeight: 700, margin: "0 0 4px" }}>{label}</p>
                      <p style={{ fontSize: 10, color: C.goldDeep, margin: 0 }}>{desc}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Defaults */}
      {activeTab === "defaults" && (
        <div style={{ background: "white", border: `1px solid ${C.goldBorder}`, borderRadius: 20, padding: 20 }}>
          <h4 style={{ fontWeight: 700, color: C.dark, fontSize: 13, margin: "0 0 16px" }}>⚙️ Default Settings</h4>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: C.goldDark, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
                Default Language
              </label>
              <select value={form.defaultLang || "en"} onChange={e => up("defaultLang", e.target.value)} style={inpStyle}>
                <option value="en">🇬🇧 English</option>
                <option value="rw">🇷🇼 Kinyarwanda</option>
                <option value="fr">🇫🇷 Français</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: C.goldDark, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
                Default Academic Year
              </label>
              <select value={form.defaultYear || "2024-2025"} onChange={e => up("defaultYear", e.target.value)} style={inpStyle}>
                {["2024-2025","2025-2026"].map(y => <option key={y}>{y}</option>)}
              </select>
            </div>
          </div>
          <div style={{ background: C.amberBg, border: `1px solid ${C.amberBord}`, borderRadius: 12, padding: 12, marginTop: 16 }}>
            <p style={{ fontSize: 12, color: "#92400e", margin: 0 }}>
              <strong>Note:</strong> Default language affects Babyeyi PDF generation. You can override per document.
            </p>
          </div>
        </div>
      )}

      {activeTab !== "profile" && (
        <button onClick={handleSave} disabled={saving} style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          padding: "12px 24px", fontFamily: font, fontWeight: 700, fontSize: 13,
          background: `linear-gradient(135deg, ${C.dark}, ${C.darkMid})`,
          color: C.gold, border: "none", borderRadius: 14, cursor: saving ? "not-allowed" : "pointer",
          boxShadow: "0 4px 16px rgba(26,18,0,0.2)", opacity: saving ? 0.7 : 1, transition: "all 150ms",
          width: "fit-content",
        }}>
          {saving
            ? <><Loader2 style={{ width: 16, height: 16, animation: "spin 0.8s linear infinite" }}/> Saving…</>
            : <><Save style={{ width: 16, height: 16 }}/> Save Changes</>}
        </button>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════
// AUDIT LOGS PAGE
// ════════════════════════════════════════════════════
const SettingsIcon = ({ style }) => (
  <svg style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);

const LOG_TYPE_STYLE = {
  create:   { bg: C.emeraldBg, text: C.emeraldDark, border: C.emeraldBord, icon: <Plus     style={{ width: 12, height: 12 }}/> },
  edit:     { bg: C.amberBg,   text: "#92400e",      border: C.amberBord,   icon: <Edit     style={{ width: 12, height: 12 }}/> },
  submit:   { bg: C.blueBg,    text: C.blue700,      border: C.blueBord,    icon: <Send     style={{ width: 12, height: 12 }}/> },
  download: { bg: C.violetBg,  text: "#6d28d9",      border: C.violetBord,  icon: <Download style={{ width: 12, height: 12 }}/> },
  auth:     { bg: C.goldBg,    text: C.goldDark,     border: C.goldBorder,  icon: <Lock     style={{ width: 12, height: 12 }}/> },
  system:   { bg: C.goldBgMid, text: C.goldDeep,     border: C.goldBorder,  icon: <SettingsIcon style={{ width: 12, height: 12 }}/> },
};

export function AuditPage({ toast }) {
  const [search,  setSearch]  = useState("");
  const [filter,  setFilter]  = useState("all");
  const [logs,    setLogs]    = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      try {
        const res  = await fetch(`${API_BASE}/babyeyi/audit?limit=150`, { credentials: "include" });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || json.success === false) throw new Error(json.message || "Failed");
        const rows = Array.isArray(json.data) ? json.data : [];
        setLogs(rows.map(r => {
          let type = "system";
          if (r.action === "created") type = "create";
          else if (r.action === "updated") type = "edit";
          else if (r.action === "deleted" || r.action?.includes("approved") || r.action?.includes("rejected")) type = "submit";
          const nv = r.new_values ?? r.changes;
          const detail = nv
            ? `New values: ${typeof nv === "string" ? nv : JSON.stringify(nv)}`
            : "";
          return {
            id:        r.id,
            type,
            action:    r.action,
            user:      r.changed_by ? `User #${r.changed_by}` : "System",
            detail,
            timestamp: r.created_at ? new Date(r.created_at).toLocaleString("en-GB") : "",
          };
        }));
      } catch (e) {
        if (toast) toast(e.message || "Failed", "error");
        setLogs([]);
      } finally { setLoading(false); }
    };
    fetchLogs();
  }, [toast]);

  const filtered = logs.filter(l =>
    (filter === "all" || l.type === filter) &&
    (!search ||
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.user.toLowerCase().includes(search.toLowerCase())   ||
      l.detail.toLowerCase().includes(search.toLowerCase()))
  );

  const TypeBadge = ({ type, action }) => {
    const s = LOG_TYPE_STYLE[type] || LOG_TYPE_STYLE.system;
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        padding: "3px 8px", borderRadius: 8, fontSize: 10, fontWeight: 700,
        background: s.bg, color: s.text, border: `1px solid ${s.border}`,
      }}>
        {s.icon} {action}
      </span>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, fontFamily: font }} className="anim">
      <style>{globalStyles}</style>
      <div>
        <SectionTitle>🔐 Audit Logs</SectionTitle>
        <SubTitle>Track all actions taken in the system for accountability</SubTitle>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
        {[
          { icon: Shield,  label: "Total Actions", value: logs.length,                               color: C.gold   },
          { icon: Edit,    label: "Edits",          value: logs.filter(l=>l.type==="edit").length,   color: C.amber  },
          { icon: Send,    label: "Submissions",    value: logs.filter(l=>l.type==="submit").length, color: C.blue   },
          { icon: Lock,    label: "Auth Events",    value: logs.filter(l=>l.type==="auth").length,   color: C.violet },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} style={{
            background: "white", border: `1px solid ${C.goldBorder}`,
            borderRadius: 16, padding: "14px 16px", boxShadow: "0 2px 8px rgba(254,191,16,0.08)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: color + "22", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon style={{ width: 16, height: 16, color }}/>
              </div>
              <p style={{ fontSize: 10, fontWeight: 700, color: C.goldDark, margin: 0, textTransform: "uppercase" }}>{label}</p>
            </div>
            <p style={{ fontSize: 24, fontWeight: 900, color: C.dark, margin: 0 }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Search + filter */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: C.goldDark }}/>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search actions, users…"
            style={{ ...inpStyle, paddingLeft: 36 }}
          />
        </div>
        <div style={{ display: "flex", background: "white", border: `1px solid ${C.goldBorder}`, borderRadius: 12, padding: 4, gap: 2, flexShrink: 0, overflowX: "auto" }}>
          {["all","create","edit","submit","download","auth"].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 700,
              border: "none", cursor: "pointer", fontFamily: font, whiteSpace: "nowrap",
              background: filter === f ? C.dark : "transparent",
              color:      filter === f ? C.gold : C.goldDark,
              transition: "all 150ms",
            }}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile cards */}
      <div className="lg:hidden" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "32px 0" }}><Spinner/></div>
        ) : filtered.map(l => (
          <div key={l.id} style={{
            background: "white", border: `1px solid ${C.goldBorder}`,
            borderRadius: 16, padding: 16, boxShadow: "0 2px 6px rgba(254,191,16,0.06)",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <TypeBadge type={l.type} action={l.action}/>
              <span style={{ fontSize: 10, color: C.goldDark }}>{l.timestamp}</span>
            </div>
            <p style={{ fontSize: 12, color: C.dark, margin: "0 0 4px" }}>{l.detail}</p>
            <p style={{ fontSize: 10, color: C.goldDark, margin: 0, display: "flex", alignItems: "center", gap: 4 }}>
              <User style={{ width: 12, height: 12 }}/> {l.user}
            </p>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden lg:block" style={{
        background: "white", border: `1px solid ${C.goldBorder}`,
        borderRadius: 20, overflow: "hidden", boxShadow: "0 2px 8px rgba(254,191,16,0.07)",
      }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: font }}>
            <THead cols={["#", "Action", "User", "Details", "Timestamp"]}/>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ padding: "24px", textAlign: "center", color: C.goldDark, fontSize: 12 }}>
                    Loading audit logs…
                  </td>
                </tr>
              ) : filtered.map((l, i) => (
                <tr key={l.id} style={{ borderBottom: `1px solid ${C.goldBorder}`, background: i % 2 ? C.goldBg : "white" }}>
                  <td style={{ padding: "12px 16px", fontSize: 11, color: C.goldDark, fontFamily: "monospace" }}>#{l.id}</td>
                  <td style={{ padding: "12px 16px" }}><TypeBadge type={l.type} action={l.action}/></td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{
                        width: 24, height: 24, borderRadius: "50%",
                        background: C.goldBgMid, display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 10, fontWeight: 900, color: C.goldDark,
                      }}>
                        {l.user[0]}
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: C.dark }}>{l.user}</span>
                    </div>
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 12, color: C.darkMid, maxWidth: 280 }}>{l.detail}</td>
                  <td style={{ padding: "12px 16px", fontSize: 11, fontFamily: "monospace", color: C.goldDark }}>{l.timestamp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}