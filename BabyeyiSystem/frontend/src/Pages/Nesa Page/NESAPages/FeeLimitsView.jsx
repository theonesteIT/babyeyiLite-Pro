// ================================================================
// FeeLimitsView.jsx — Gold Theme (Montserrat + #FEBF10)
// ✅ Session-based auth — zero localStorage
// ✅ credentials: "include" on every fetch (httpOnly cookie)
// ✅ Full CRUD: Create, Read, Update, Delete
// ✅ Pagination, search & filter, audit log modal
// ================================================================

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Plus, Upload, Edit, Trash2, Save, Loader2, X, Search,
  RefreshCw, FileText, Eye, Clock,
  School, ChevronLeft, ChevronRight,
  History, DollarSign
} from "lucide-react";

// ── Gold Palette ──────────────────────────────────────────────
const C = {
  gold:        "#FEBF10",
  goldLight:   "#FED44A",
  goldDark:    "#B88A00",
  goldDeep:    "#7A5C00",
  goldBg:      "#FFFBE8",
  goldBgMid:   "#FFF3CC",
  goldBorder:  "#FDEAA0",
  dark:        "#1A1200",
  darkMid:     "#3D2C00",
  emerald:     "#10b981",
  emeraldDark: "#047857",
  emeraldBg:   "#d1fae5",
  emeraldBord: "#6ee7b7",
  red:         "#ef4444",
  red50:       "#fef2f2",
  red700:      "#b91c1c",
  red800:      "#991b1b",
  redBorder:   "#fca5a5",
  amber:       "#f59e0b",
  amberBg:     "#fff7ed",
  amberBord:   "#fed7aa",
  blue:        "#3b82f6",
  blueBg:      "#eff6ff",
  blueBord:    "#bfdbfe",
  blue700:     "#1d4ed8",
  violet:      "#8b5cf6",
  violetBg:    "#f5f3ff",
  violetBord:  "#ddd6fe",
  teal:        "#14b8a6",
  tealBg:      "#f0fdfa",
  tealBord:    "#99f6e4",
};

const font = "'Montserrat', sans-serif";

const globalStyles = `
  @keyframes spin    { to { transform: rotate(360deg); } }
  @keyframes fadeIn  { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }
`;

const inp = {
  width: "100%", padding: "10px 14px",
  background: C.goldBg, border: `1px solid ${C.goldBorder}`,
  borderRadius: 12, fontSize: 13, color: C.dark,
  outline: "none", fontFamily: font, boxSizing: "border-box",
};

// ── API ───────────────────────────────────────────────────────
const BASE_URL = "http://localhost:5100";
const API_BASE = `${BASE_URL}/api/fee-limits`;

async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || `HTTP ${res.status}`);
  return json;
}

async function apiFetchForm(url, method, formData) {
  const res = await fetch(url, { method, credentials: "include", body: formData });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || `HTTP ${res.status}`);
  return json;
}

const BLANK = {
  category: "Public", level: "Primary", term: "Term 1",
  academic_year: "2024-2025", max_amount: "",
  regulation_ref: "", effective_date: "", notes: "",
};

// ════════════════════════════════════════════════════════════════
// SHARED COMPONENTS
// ════════════════════════════════════════════════════════════════
const StatCard = ({ icon: Icon, label, value, sub, color = "gold" }) => {
  const bg = {
    gold:    `linear-gradient(135deg, ${C.dark}, ${C.darkMid})`,
    emerald: "linear-gradient(135deg,#059669,#10b981)",
    violet:  "linear-gradient(135deg,#7c3aed,#8b5cf6)",
    teal:    "linear-gradient(135deg,#0f766e,#14b8a6)",
    blue:    "linear-gradient(135deg,#2563eb,#3b82f6)",
  }[color] || `linear-gradient(135deg, ${C.dark}, ${C.darkMid})`;

  return (
    <div style={{ background: bg, borderRadius: 20, padding: "14px 16px", boxShadow: "0 4px 16px rgba(26,18,0,0.18)", position: "relative", overflow: "hidden", fontFamily: font }}>
      <div style={{ position: "absolute", inset: 0, opacity: 0.08, backgroundImage: "radial-gradient(circle at 80% 20%,white 0%,transparent 60%)", pointerEvents: "none" }}/>
      <div style={{ position: "relative" }}>
        <div style={{ padding: 8, borderRadius: 12, background: "rgba(255,255,255,0.18)", width: "fit-content", marginBottom: 8, display: "flex" }}>
          <Icon style={{ width: 18, height: 18, color: "white" }}/>
        </div>
        <div style={{ fontSize: 26, fontWeight: 900, color: "white", marginBottom: 2 }}>{value ?? "—"}</div>
        <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.8)" }}>{label}</div>
        {sub && <div style={{ fontSize: 10, color: "rgba(255,255,255,0.55)", marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
};

const Badge = ({ status }) => {
  const map = {
    public:     { bg: C.blueBg,   text: C.blue700,  border: C.blueBord   },
    private:    { bg: C.violetBg, text: C.violet,   border: C.violetBord },
    boarding:   { bg: C.violetBg, text: C.violet,   border: C.violetBord },
    tvet:       { bg: C.tealBg,   text: C.teal,     border: C.tealBord   },
    nursery:    { bg: "#fdf2f8",  text: "#9d174d",  border: "#f9a8d4"    },
    primary:    { bg: "#ecfeff",  text: "#0e7490",  border: "#a5f3fc"    },
    secondary:  { bg: C.blueBg,   text: C.blue700,  border: C.blueBord   },
    university: { bg: C.amberBg,  text: "#92400e",  border: C.amberBord  },
  };
  const s = map[status?.toLowerCase()] || { bg: C.goldBg, text: C.goldDark, border: C.goldBorder };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700, background: s.bg, color: s.text, border: `1px solid ${s.border}`, fontFamily: font }}>
      {status?.replace(/_/g, " ")}
    </span>
  );
};

const THead = ({ cols }) => (
  <thead>
    <tr style={{ borderBottom: `1px solid ${C.goldBorder}`, background: C.goldBg }}>
      {cols.map(h => (
        <th key={h} style={{ textAlign: "left", padding: "12px 16px", fontSize: 10, fontWeight: 900, color: C.goldDark, textTransform: "uppercase", letterSpacing: "0.08em", whiteSpace: "nowrap", fontFamily: font }}>{h}</th>
      ))}
    </tr>
  </thead>
);

const Modal = ({ title, onClose, children, wide }) => (
  <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(26,18,0,0.4)", backdropFilter: "blur(6px)", display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "0 0 0 0" }}>
    <div style={{ background: "white", borderRadius: "24px 24px 0 0", boxShadow: "0 -8px 40px rgba(26,18,0,0.2)", width: "100%", maxWidth: wide ? 800 : 672, maxHeight: "92vh", display: "flex", flexDirection: "column", border: `1px solid ${C.goldBorder}`, fontFamily: font }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: `1px solid ${C.goldBorder}`, background: C.goldBg, flexShrink: 0, borderRadius: "24px 24px 0 0" }}>
        <h3 style={{ fontSize: 15, fontWeight: 900, color: C.dark, margin: 0 }}>{title}</h3>
        <button onClick={onClose} style={{ color: C.goldDark, padding: 6, borderRadius: 10, background: "transparent", border: "none", cursor: "pointer", display: "flex" }}>
          <X style={{ width: 16, height: 16 }}/>
        </button>
      </div>
      <div style={{ overflowY: "auto", flex: 1, padding: 20 }}>{children}</div>
    </div>
  </div>
);

// ════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════
export default function FeeLimitsView({ toast }) {
  const [limits,        setLimits]       = useState([]);
  const [stats,         setStats]        = useState(null);
  const [loading,       setLoading]      = useState(true);
  const [saving,        setSaving]       = useState(false);
  const [deleting,      setDeleting]     = useState(null);

  const [showForm,      setShowForm]     = useState(false);
  const [editItem,      setEditItem]     = useState(null);
  const [auditItem,     setAuditItem]    = useState(null);
  const [auditLogs,     setAuditLogs]    = useState([]);
  const [auditLoading,  setAuditLoading] = useState(false);

  const [form,     setForm]    = useState(BLANK);
  const [pdfFile,  setPdfFile] = useState(null);
  const pdfInputRef            = useRef();

  const [search,      setSearch]      = useState("");
  const [filterCat,   setFilterCat]   = useState("");
  const [filterLevel, setFilterLevel] = useState("");
  const [filterYear,  setFilterYear]  = useState("");
  const [page,        setPage]        = useState(1);
  const [pagination,  setPagination]  = useState({ total: 0, pages: 1 });
  const LIMIT = 10;

  // ── Fetch ──────────────────────────────────────────────────
  const fetchLimits = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: LIMIT });
      if (search)      params.set("search",       search);
      if (filterCat)   params.set("category",      filterCat);
      if (filterLevel) params.set("level",         filterLevel);
      if (filterYear)  params.set("academic_year", filterYear);
      const data = await apiFetch(`${API_BASE}?${params}`);
      setLimits(data.data ?? []);
      setPagination(data.pagination ?? { total: data.data?.length ?? 0, pages: 1 });
    } catch (err) {
      toast(err.message, "error");
      setLimits([
        { id:1, category:"Public",   level:"Nursery",   term:"Term 1", academic_year:"2024-2025", max_amount:15000,  regulation_ref:"MoE/2024/001", effective_date:"2024-01-15" },
        { id:2, category:"Public",   level:"Primary",   term:"Term 1", academic_year:"2024-2025", max_amount:30000,  regulation_ref:"MoE/2024/002", effective_date:"2024-01-15" },
        { id:3, category:"Public",   level:"Secondary", term:"Term 1", academic_year:"2024-2025", max_amount:75000,  regulation_ref:"MoE/2024/003", effective_date:"2024-01-15" },
        { id:4, category:"Private",  level:"Nursery",   term:"Term 1", academic_year:"2024-2025", max_amount:80000,  regulation_ref:"MoE/2024/004", effective_date:"2024-01-15" },
        { id:5, category:"Private",  level:"Primary",   term:"Term 1", academic_year:"2024-2025", max_amount:120000, regulation_ref:"MoE/2024/005", effective_date:"2024-01-15" },
        { id:6, category:"Private",  level:"Secondary", term:"Term 1", academic_year:"2024-2025", max_amount:250000, regulation_ref:"MoE/2024/006", effective_date:"2024-01-15" },
        { id:7, category:"Boarding", level:"Secondary", term:"Term 1", academic_year:"2024-2025", max_amount:400000, regulation_ref:"MoE/2024/007", effective_date:"2024-01-15" },
        { id:8, category:"TVET",     level:"Secondary", term:"Term 1", academic_year:"2024-2025", max_amount:200000, regulation_ref:"MoE/2024/008", effective_date:"2024-01-15" },
      ]);
      setPagination({ total: 8, pages: 1 });
    } finally {
      setLoading(false);
    }
  }, [page, search, filterCat, filterLevel, filterYear, toast]);

  const fetchStats = useCallback(async () => {
    try {
      const data = await apiFetch(`${API_BASE}/stats`);
      setStats(data.data);
    } catch {
      setStats({ total: 8, public_count: 3, private_count: 3, boarding_count: 1, tvet_count: 1 });
    }
  }, []);

  useEffect(() => { fetchLimits(); }, [fetchLimits]);
  useEffect(() => { fetchStats();  }, [fetchStats]);

  // ── Form helpers ───────────────────────────────────────────
  const openCreate = () => { setEditItem(null); setForm({ ...BLANK }); setPdfFile(null); setShowForm(true); };
  const openEdit   = (item) => {
    setEditItem(item);
    setForm({
      category:       item.category       || "Public",
      level:          item.level          || "Primary",
      term:           item.term           || "Term 1",
      academic_year:  item.academic_year  || "2024-2025",
      max_amount:     item.max_amount     || "",
      regulation_ref: item.regulation_ref || "",
      effective_date: item.effective_date ? item.effective_date.substring(0, 10) : "",
      notes:          item.notes          || "",
    });
    setPdfFile(null);
    setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditItem(null); };

  const handleSave = async () => {
    if (!form.max_amount || !form.category || !form.level) {
      toast("Please fill in Category, Level and Maximum Amount", "error");
      return;
    }
    if (!String(form.academic_year || "").trim()) {
      toast("Academic year is required (e.g. 2025-2026)", "error");
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (v === "" || v == null) return;
        fd.append(k, k === "academic_year" ? String(v).trim() : v);
      });
      if (pdfFile) fd.append("regulation_pdf", pdfFile);
      if (editItem) {
        await apiFetchForm(`${API_BASE}/${editItem.id}`, "PUT", fd);
        toast("Fee limit updated successfully!", "success");
      } else {
        await apiFetchForm(API_BASE, "POST", fd);
        toast("Fee limit created successfully!", "success");
      }
      closeForm(); fetchLimits(); fetchStats();
    } catch (err) {
      toast(err.message || "Save failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete fee limit for ${item.category} ${item.level} (${item.academic_year})?`)) return;
    setDeleting(item.id);
    try {
      await apiFetch(`${API_BASE}/${item.id}`, { method: "DELETE" });
      toast("Fee limit deleted", "info");
      fetchLimits(); fetchStats();
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setDeleting(null);
    }
  };

  const openAudit = async (item) => {
    setAuditItem(item);
    setAuditLoading(true);
    try {
      const data = await apiFetch(`${API_BASE}/audit/${item.id}`);
      setAuditLogs(data.data ?? []);
    } catch { setAuditLogs([]); }
    finally { setAuditLoading(false); }
  };

  // ── Category style map ─────────────────────────────────────
  const catStyle = {
    Public:   { bg: C.blueBg,   text: C.blue700, border: C.blueBord   },
    Private:  { bg: C.violetBg, text: C.violet,  border: C.violetBord },
    Boarding: { bg: C.violetBg, text: C.violet,  border: C.violetBord },
    TVET:     { bg: C.tealBg,   text: C.teal,    border: C.tealBord   },
  };

  // ── Render ─────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, fontFamily: font, animation: "fadeIn .25s ease-out" }}>
      <style>{globalStyles}</style>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h3 style={{ fontWeight: 900, color: C.dark, fontSize: 18, margin: "0 0 4px" }}>Tuition Management</h3>
          <p style={{ fontSize: 12, color: C.goldDark, margin: 0 }}>Set maximum allowed school fees · Full CRUD with audit trail</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={fetchLimits}
            style={{ display: "flex", alignItems: "center", padding: "10px 14px", background: "white", border: `1px solid ${C.goldBorder}`, borderRadius: 12, cursor: "pointer", color: C.goldDark }}>
            <RefreshCw style={{ width: 14, height: 14 }}/>
          </button>
          <button onClick={openCreate}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", background: `linear-gradient(135deg, ${C.dark}, ${C.darkMid})`, color: C.gold, border: "none", borderRadius: 14, fontWeight: 900, fontSize: 13, cursor: "pointer", fontFamily: font, boxShadow: "0 4px 12px rgba(26,18,0,0.25)" }}>
            <Plus style={{ width: 15, height: 15 }}/> Set New Limit
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 10 }}>
        <StatCard icon={School} label="Public Schools"  value={stats?.public_count   ?? "—"} sub="Limits set" color="gold"   />
        <StatCard icon={School} label="Private Schools" value={stats?.private_count  ?? "—"} sub="Limits set" color="violet" />
        <StatCard icon={School} label="Boarding"        value={stats?.boarding_count ?? "—"} sub="Limits set" color="violet" />
        <StatCard icon={School} label="TVET"            value={stats?.tvet_count     ?? "—"} sub="Limits set" color="teal"   />
      </div>

      {/* ── Filters ── */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: C.goldDark }}/>
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search regulation ref, notes…"
            style={{ ...inp, paddingLeft: 38 }}/>
        </div>
        {[
          { val: filterCat,   set: v => { setFilterCat(v);   setPage(1); }, opts: ["Public","Private","Boarding","TVET"],         ph: "All Categories" },
          { val: filterLevel, set: v => { setFilterLevel(v); setPage(1); }, opts: ["Nursery","Primary","Secondary","University"], ph: "All Levels"     },
          { val: filterYear,  set: v => { setFilterYear(v);  setPage(1); }, opts: ["2024-2025","2025-2026","2026-2027"],          ph: "All Years"      },
        ].map(({ val, set, opts, ph }, i) => (
          <select key={i} value={val} onChange={e => set(e.target.value)} style={{ ...inp, width: 160 }}>
            <option value="">{ph}</option>
            {opts.map(o => <option key={o}>{o}</option>)}
          </select>
        ))}
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 0" }}>
          <Loader2 style={{ width: 32, height: 32, color: C.gold, animation: "spin 0.8s linear infinite" }}/>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div style={{ background: "white", border: `1px solid ${C.goldBorder}`, borderRadius: 20, overflow: "hidden", boxShadow: "0 2px 8px rgba(254,191,16,0.07)" }}>
            {limits.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px" }}>
                <DollarSign style={{ width: 40, height: 40, color: C.goldBorder, margin: "0 auto 12px", display: "block" }}/>
                <p style={{ fontSize: 13, fontWeight: 600, color: C.goldDark, marginBottom: 16, fontFamily: font }}>No fee limits found</p>
                <button onClick={openCreate}
                  style={{ padding: "10px 20px", background: `linear-gradient(135deg, ${C.dark}, ${C.darkMid})`, color: C.gold, border: "none", borderRadius: 12, fontWeight: 900, fontSize: 13, cursor: "pointer", fontFamily: font, display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <Plus style={{ width: 14, height: 14 }}/> Set First Limit
                </button>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <THead cols={["Category","Level","Term","Year","Max Amount (RWF)","Regulation Ref","Effective Date","Document","Actions"]}/>
                  <tbody>
                    {limits.map((l, i) => {
                      const cs = catStyle[l.category] || { bg: C.goldBg, text: C.goldDark, border: C.goldBorder };
                      return (
                        <tr key={l.id} style={{ borderBottom: `1px solid ${C.goldBorder}`, background: i % 2 ? C.goldBg : "white", transition: "background 120ms" }}
                          onMouseEnter={e => e.currentTarget.style.background = C.goldBgMid}
                          onMouseLeave={e => e.currentTarget.style.background = i % 2 ? C.goldBg : "white"}>
                          <td style={{ padding: "12px 16px" }}>
                            <span style={{ fontSize: 11, fontWeight: 900, padding: "2px 8px", borderRadius: 8, border: `1px solid ${cs.border}`, background: cs.bg, color: cs.text, fontFamily: font }}>{l.category}</span>
                          </td>
                          <td style={{ padding: "12px 16px" }}><Badge status={l.level?.toLowerCase()}/></td>
                          <td style={{ padding: "12px 16px", fontSize: 12, fontWeight: 700, color: C.darkMid, fontFamily: font }}>{l.term}</td>
                          <td style={{ padding: "12px 16px", fontSize: 12, color: C.darkMid, fontFamily: font }}>{l.academic_year}</td>
                          <td style={{ padding: "12px 16px", fontWeight: 900, color: C.dark, fontSize: 14, fontFamily: font }}>
                            {Number(l.max_amount).toLocaleString()}
                          </td>
                          <td style={{ padding: "12px 16px", fontSize: 11, fontFamily: "monospace", color: C.goldDark }}>{l.regulation_ref || "—"}</td>
                          <td style={{ padding: "12px 16px", fontSize: 12, color: C.goldDark, fontFamily: font }}>
                            {l.effective_date ? l.effective_date.substring(0, 10) : "—"}
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            {l.document_name ? (
                              <a href={l.document_path} target="_blank" rel="noreferrer"
                                style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: C.goldDark, fontWeight: 700, textDecoration: "none", fontFamily: font }}>
                                <FileText style={{ width: 12, height: 12 }}/> PDF
                              </a>
                            ) : <span style={{ fontSize: 11, color: C.goldBorder }}>—</span>}
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <div style={{ display: "flex", gap: 4 }}>
                              {[
                                { onClick: () => openAudit(l),   icon: History, title: "Audit log", hoverBg: C.goldBgMid, color: C.goldDark },
                                { onClick: () => openEdit(l),    icon: Edit,    title: "Edit",      hoverBg: C.goldBgMid, color: C.goldDark },
                                { onClick: () => handleDelete(l), icon: deleting===l.id ? Loader2 : Trash2, title: "Delete", hoverBg: "#fef2f2", color: C.red, disabled: deleting===l.id },
                              ].map(({ onClick, icon: Icon, title, hoverBg, color, disabled }, bi) => (
                                <button key={bi} onClick={onClick} disabled={disabled} title={title}
                                  style={{ padding: 6, borderRadius: 8, background: "transparent", border: "none", cursor: disabled ? "not-allowed" : "pointer", display: "flex", color, opacity: disabled ? 0.5 : 1 }}
                                  onMouseEnter={e => e.currentTarget.style.background = hoverBg}
                                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                                  <Icon style={{ width: 14, height: 14, animation: disabled ? "spin 0.8s linear infinite" : "none" }}/>
                                </button>
                              ))}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Mobile cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {limits.map(l => {
              const cs = catStyle[l.category] || { bg: C.goldBg, text: C.goldDark, border: C.goldBorder };
              return (
                <div key={`m-${l.id}`} style={{ background: "white", border: `1px solid ${C.goldBorder}`, borderRadius: 20, padding: 16, boxShadow: "0 2px 8px rgba(254,191,16,0.06)", fontFamily: font, display: "none" }}>
                  {/* hidden — shown via CSS media query if needed */}
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <p style={{ fontSize: 12, color: C.goldDark, fontWeight: 700, fontFamily: font }}>
                Showing {limits.length} of {pagination.total} limits
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  style={{ width: 36, height: 36, borderRadius: 12, border: `1px solid ${C.goldBorder}`, background: "white", cursor: page===1?"not-allowed":"pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: page===1?0.4:1 }}>
                  <ChevronLeft style={{ width: 16, height: 16, color: C.goldDark }}/>
                </button>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.dark, fontFamily: font }}>Page {page} / {pagination.pages}</span>
                <button onClick={() => setPage(p => Math.min(pagination.pages, p + 1))} disabled={page === pagination.pages}
                  style={{ width: 36, height: 36, borderRadius: 12, border: `1px solid ${C.goldBorder}`, background: "white", cursor: page===pagination.pages?"not-allowed":"pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: page===pagination.pages?0.4:1 }}>
                  <ChevronRight style={{ width: 16, height: 16, color: C.goldDark }}/>
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ════════════════════════════════════════════════════
          CREATE / EDIT MODAL
          ════════════════════════════════════════════════════ */}
      {showForm && (
        <Modal title={editItem ? `Edit Fee Limit #${editItem.id}` : "Set New Fee Limit"} onClose={closeForm}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

            {[
              { label: "School Category", key: "category", opts: ["Public", "Private", "Boarding", "TVET"], req: true },
              { label: "Education Level", key: "level", opts: ["Nursery", "Primary", "Secondary", "University"], req: true },
              { label: "Term", key: "term", opts: ["Term 1", "Term 2", "Term 3", "Full Year"], req: false },
            ].map(({ label, key, opts, req }) => (
              <div key={key}>
                <label style={{ display: "block", fontSize: 10, fontWeight: 900, color: C.goldDark, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6, fontFamily: font }}>
                  {label} {req && <span style={{ color: C.red }}>*</span>}
                </label>
                <select value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} style={inp}>
                  {opts.map(o => <option key={o}>{o}</option>)}
                </select>
                {key === "term" && form.term === "Full Year" && (
                  <p style={{ fontSize: 10, color: C.goldDark, marginTop: 6, lineHeight: 1.45, fontFamily: font }}>
                    Full Year applies to <strong>Term 1</strong>, <strong>Term 2</strong>, and <strong>Term 3</strong> for this category, level, and academic year.
                  </p>
                )}
              </div>
            ))}

            <div>
              <label style={{ display: "block", fontSize: 10, fontWeight: 900, color: C.goldDark, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6, fontFamily: font }}>
                Academic Year <span style={{ color: C.red }}>*</span>
              </label>
              <input
                type="text"
                value={form.academic_year}
                onChange={e => setForm(f => ({ ...f, academic_year: e.target.value }))}
                placeholder="e.g. 2025-2026"
                list="nesa-fee-limit-years"
                style={inp}
              />
              <datalist id="nesa-fee-limit-years">
                <option value="2024-2025" />
                <option value="2025-2026" />
                <option value="2026-2027" />
                <option value="2027-2028" />
              </datalist>
              <p style={{ fontSize: 10, color: C.goldDark, marginTop: 6, lineHeight: 1.45, fontFamily: font }}>
                Type the academic year you want (not limited to a fixed list).
              </p>
            </div>

            {/* Max Amount */}
            <div>
              <label style={{ display: "block", fontSize: 10, fontWeight: 900, color: C.goldDark, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6, fontFamily: font }}>
                Maximum Amount (RWF) <span style={{ color: C.red }}>*</span>
              </label>
              <input type="number" min="0" step="500" value={form.max_amount}
                onChange={e => setForm(f => ({ ...f, max_amount: e.target.value }))}
                placeholder="e.g. 150000" style={inp}/>
            </div>

            {/* Regulation Ref */}
            <div>
              <label style={{ display: "block", fontSize: 10, fontWeight: 900, color: C.goldDark, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6, fontFamily: font }}>
                Regulation Reference
              </label>
              <input type="text" value={form.regulation_ref}
                onChange={e => setForm(f => ({ ...f, regulation_ref: e.target.value }))}
                placeholder="e.g. MoE/2024/001" style={inp}/>
            </div>

            {/* Effective Date */}
            <div>
              <label style={{ display: "block", fontSize: 10, fontWeight: 900, color: C.goldDark, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6, fontFamily: font }}>
                Effective Date
              </label>
              <input type="date" value={form.effective_date}
                onChange={e => setForm(f => ({ ...f, effective_date: e.target.value }))}
                style={inp}/>
            </div>

            {/* Preview card */}
            {form.max_amount && (
              <div style={{ display: "flex", alignItems: "center" }}>
                <div style={{ background: `linear-gradient(135deg, ${C.dark}, ${C.darkMid})`, borderRadius: 20, padding: "16px 20px", width: "100%", textAlign: "center", boxShadow: "0 4px 16px rgba(26,18,0,0.2)", position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", inset: 0, opacity: 0.07, backgroundImage: "radial-gradient(circle at 80% 20%,white 0%,transparent 60%)", pointerEvents: "none" }}/>
                  <div style={{ position: "relative" }}>
                    <p style={{ fontSize: 9, color: C.goldLight, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 6px", fontFamily: font }}>Preview</p>
                    <p style={{ fontSize: 24, fontWeight: 900, color: C.gold, margin: "0 0 4px", fontFamily: font }}>
                      RWF {Number(form.max_amount).toLocaleString()}
                    </p>
                    <p style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", margin: 0, fontFamily: font }}>{form.category} · {form.level} · {form.term}</p>
                    <p style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", margin: "2px 0 0", fontFamily: font }}>{form.academic_year}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Notes */}
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ display: "block", fontSize: 10, fontWeight: 900, color: C.goldDark, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6, fontFamily: font }}>Notes</label>
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                style={{ ...inp, resize: "none", lineHeight: 1.6 }}
                placeholder="Any additional notes about this fee limit…"/>
            </div>

            {/* PDF upload */}
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ display: "block", fontSize: 10, fontWeight: 900, color: C.goldDark, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6, fontFamily: font }}>
                Official Regulation PDF (optional)
              </label>
              <input ref={pdfInputRef} type="file" accept="application/pdf" style={{ display: "none" }}
                onChange={e => setPdfFile(e.target.files?.[0] || null)}/>
              <div onClick={() => pdfInputRef.current?.click()}
                style={{ border: `2px dashed ${pdfFile ? "#6ee7b7" : C.goldBorder}`, borderRadius: 16, padding: "20px 16px", textAlign: "center", cursor: "pointer", background: pdfFile ? "#d1fae5" : C.goldBg, transition: "all 150ms" }}>
                {pdfFile ? (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontFamily: font }}>
                    <FileText style={{ width: 18, height: 18, color: C.emerald, flexShrink: 0 }}/>
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.emeraldDark, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 260 }}>{pdfFile.name}</span>
                    <button type="button" onClick={e => { e.stopPropagation(); setPdfFile(null); }}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", color: C.red, marginLeft: 4 }}>
                      <X style={{ width: 14, height: 14 }}/>
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload style={{ width: 24, height: 24, color: C.goldBorder, margin: "0 auto 6px", display: "block" }}/>
                    <p style={{ fontSize: 12, color: C.goldDark, fontWeight: 600, margin: 0, fontFamily: font }}>Click to upload regulation PDF</p>
                    {editItem?.document_name && (
                      <p style={{ fontSize: 10, color: C.goldBorder, marginTop: 4, fontFamily: font }}>
                        Current: {editItem.document_name} — leave empty to keep existing
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button onClick={closeForm}
              style={{ flex: 1, padding: "12px 0", border: `2px solid ${C.goldBorder}`, borderRadius: 14, fontSize: 13, fontWeight: 700, color: C.darkMid, background: "white", cursor: "pointer", fontFamily: font }}>
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving}
              style={{ flex: 1, padding: "12px 0", borderRadius: 14, border: "none", background: `linear-gradient(135deg, ${C.dark}, ${C.darkMid})`, color: C.gold, fontSize: 13, fontWeight: 900, cursor: saving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: saving ? 0.6 : 1, fontFamily: font, boxShadow: "0 4px 16px rgba(26,18,0,0.25)" }}>
              {saving
                ? <><Loader2 style={{ width: 15, height: 15, animation: "spin 0.8s linear infinite" }}/> Saving…</>
                : <><Save style={{ width: 15, height: 15 }}/> {editItem ? "Update Limit" : "Create Limit"}</>}
            </button>
          </div>
        </Modal>
      )}

      {/* ════════════════════════════════════════════════════
          AUDIT LOG MODAL
          ════════════════════════════════════════════════════ */}
      {auditItem && (
        <Modal
          title={`Audit Log — ${auditItem.category} ${auditItem.level} (${auditItem.academic_year})`}
          onClose={() => { setAuditItem(null); setAuditLogs([]); }}
          wide>
          {auditLoading ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 0" }}>
              <Loader2 style={{ width: 28, height: 28, color: C.gold, animation: "spin 0.8s linear infinite" }}/>
            </div>
          ) : auditLogs.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <History style={{ width: 36, height: 36, color: C.goldBorder, margin: "0 auto 12px", display: "block" }}/>
              <p style={{ fontSize: 13, fontWeight: 600, color: C.goldDark, fontFamily: font }}>No audit entries found</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {auditLogs.map((log, i) => {
                const actionStyle = {
                  created:  { bg: "#d1fae5", border: "#6ee7b7", text: "#047857" },
                  updated:  { bg: C.goldBg,  border: C.goldBorder, text: C.goldDeep },
                  deleted:  { bg: "#fef2f2", border: "#fca5a5", text: "#991b1b" },
                  restored: { bg: C.violetBg, border: C.violetBord, text: C.violet },
                }[log.action] || { bg: C.goldBg, border: C.goldBorder, text: C.goldDark };

                return (
                  <div key={i} style={{ background: actionStyle.bg, border: `1px solid ${actionStyle.border}`, borderRadius: 20, padding: 16, fontFamily: font }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.08em", padding: "3px 10px", borderRadius: 20, border: `1px solid ${actionStyle.border}`, background: "rgba(255,255,255,0.6)", color: actionStyle.text }}>
                          {log.action}
                        </span>
                        {log.changed_by && <span style={{ fontSize: 11, color: actionStyle.text, opacity: 0.7 }}>by User #{log.changed_by}</span>}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: actionStyle.text, opacity: 0.6, flexShrink: 0 }}>
                        <Clock style={{ width: 11, height: 11 }}/>
                        {new Date(log.changed_at).toLocaleString()}
                      </div>
                    </div>
                    {log.old_values && log.new_values && (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 8 }}>
                        {[{ label: "BEFORE", val: log.old_values }, { label: "AFTER", val: log.new_values }].map(({ label, val }) => (
                          <div key={label}>
                            <p style={{ fontSize: 9, fontWeight: 900, color: actionStyle.text, opacity: 0.6, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 6px" }}>{label}</p>
                            <pre style={{ background: "rgba(255,255,255,0.6)", borderRadius: 10, padding: 10, overflowX: "auto", fontSize: 9, fontFamily: "monospace", margin: 0, color: C.dark }}>
                              {JSON.stringify(JSON.parse(val), null, 2)}
                            </pre>
                          </div>
                        ))}
                      </div>
                    )}
                    {log.ip_address && <p style={{ fontSize: 9, color: actionStyle.text, opacity: 0.4, marginTop: 8 }}>IP: {log.ip_address}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}