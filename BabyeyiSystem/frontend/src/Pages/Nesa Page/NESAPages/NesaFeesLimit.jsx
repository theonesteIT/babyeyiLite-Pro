// ================================================================
// NesaFeesLimit.jsx — National fee limits (Tuition Manager tab)
// Modern create/edit modal · levels match school Babyeyi smart checker
// ================================================================

import { useState, useEffect, useCallback } from "react";
import {
  Plus, Edit, Trash2, Loader2, X, Search,
  RefreshCw, FileText, Eye, Clock,
  School, ChevronLeft, ChevronRight,
  History, DollarSign
} from "lucide-react";
import { C as themeC, font as themeFont, inp as themeInp } from "../NesaPage/utils/theme";
import { FEE_API, apiFetch, apiFetchForm } from "../NesaPage/utils/api";
import Pagination from "../NesaPage/components/Pagination";
import { validateAcademicYear } from "../../../utils/babyeyiAcademicPeriod";
import NesaFeeLimitFormModal from "./NesaFeeLimitFormModal";
import NesaAcademicPeriodPanel from "../NesaPage/components/NesaAcademicPeriodPanel";
import {
  NESA_FEE_BLANK_FORM,
  NESA_FEE_LEVEL_IDS,
  NESA_SMART_CHECKER_CATEGORIES,
  normalizeNesaFeeLevel,
  normalizeNesaFeeCategory,
} from "../../../utils/nesaFeeLimitShared";

// ── Navy + amber (aligned with NESA / District portal) ────────
const C = {
  ...themeC,
  gold:        themeC.amberLight,
  goldLight:   "#FDE68A",
  goldDark:    themeC.amberDark,
  goldDeep:    themeC.navy,
  goldBg:      themeC.amberBg,
  goldBgMid:   themeC.amberBgMid,
  goldBorder:  themeC.amberBorder,
  dark:        themeC.navy,
  darkMid:     themeC.navyMid,
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

const font = themeFont;
const inp = { ...themeInp, width: "100%" };

const globalStyles = `
  @keyframes spin    { to { transform: rotate(360deg); } }
  @keyframes fadeIn  { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }
  .anim { animation: fadeIn .25s ease-out; }
`;

const API_BASE = FEE_API;
const NAVY = themeC.navy;
const NAVY_MID = themeC.navyMid;

const BLANK = { ...NESA_FEE_BLANK_FORM };

// ════════════════════════════════════════════════════════════════
// SHARED COMPONENTS
// ════════════════════════════════════════════════════════════════
const StatCard = ({ icon: Icon, label, value, sub, color = "gold" }) => {
  const bg = {
    gold:    `linear-gradient(135deg, ${NAVY}, ${NAVY_MID})`,
    emerald: `linear-gradient(135deg, ${NAVY_MID}, ${NAVY})`,
    violet:  `linear-gradient(135deg, #d97706, #fbbf24)`,
    teal:    `linear-gradient(135deg, ${NAVY_MID}, #1e3a5f)`,
    blue:    `linear-gradient(135deg, ${NAVY}, #1e3a5f)`,
  }[color] || `linear-gradient(135deg, ${NAVY}, ${NAVY_MID})`;

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
    tss:       { bg: C.tealBg,   text: C.teal,     border: C.tealBord   },
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
    <tr style={{ borderBottom: `1px solid ${C.goldBorder}`, background: '#f59e0b' }}>
      {cols.map(h => (
        <th key={h} style={{ textAlign: "left", padding: "12px 16px", fontSize: 10, fontWeight: 900, color: NAVY, textTransform: "uppercase", letterSpacing: "0.08em", whiteSpace: "nowrap", fontFamily: font }}>{h}</th>
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
export default function NesaFeesLimit({
  toast,
  embedded = false,
  onStatsChange,
  onHeroActions,
  portalFilters,
  filterVersion = 0,
  academicPeriod,
  yearOptions = [],
  sortedYearOptions = [],
  termOptions = [],
  onAcademicMetaRefresh,
  onAcademicPeriodChange,
}) {
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

  const [search,      setSearch]      = useState("");
  const [filterCat,   setFilterCat]   = useState("");
  const [filterLevel, setFilterLevel] = useState("");
  const [page,        setPage]        = useState(1);
  const [pagination,  setPagination]  = useState({ total: 0, pages: 1 });
  const LIMIT = 10;

  const filterYear = portalFilters?.academicYear || "";
  const filterTerm = portalFilters?.term || "";
  const modalYearOptions = sortedYearOptions?.length ? sortedYearOptions : yearOptions;
  const panelPeriod = academicPeriod || { academicYear: filterYear, term: filterTerm };

  // ── Fetch ──────────────────────────────────────────────────
  const fetchLimits = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: LIMIT });
      if (search)      params.set("search",       search);
      if (filterCat)   params.set("category",      filterCat);
      if (filterLevel) params.set("level",         filterLevel);
      if (filterYear)  params.set("academic_year", filterYear);
      if (filterTerm)  params.set("term", filterTerm);
      const data = await apiFetch(`${API_BASE}?${params}`);
      setLimits(data.data ?? []);
      setPagination(data.pagination ?? { total: data.data?.length ?? 0, pages: 1 });
    } catch (err) {
      toast(err.message, "error");
      setLimits([]);
      setPagination({ total: 0, pages: 1 });
    } finally {
      setLoading(false);
    }
  }, [page, search, filterCat, filterLevel, filterYear, filterTerm, toast]);

  useEffect(() => {
    setPage(1);
  }, [filterVersion]);

  const fetchStats = useCallback(async () => {
    try {
      const data = await apiFetch(`${API_BASE}/stats`);
      setStats(data.data);
    } catch {
      setStats(null);
    }
  }, []);

  useEffect(() => { fetchLimits(); }, [fetchLimits]);
  useEffect(() => { fetchStats();  }, [fetchStats]);

  useEffect(() => {
    if (stats) onStatsChange?.(stats);
  }, [stats, onStatsChange]);

  // ── Form helpers ───────────────────────────────────────────
  const openCreate = useCallback(() => {
    setEditItem(null);
    setForm({
      ...BLANK,
      academic_year: portalFilters?.academicYear || modalYearOptions[0] || "",
      term: portalFilters?.term || BLANK.term,
    });
    setPdfFile(null);
    setShowForm(true);
  }, [portalFilters?.academicYear, portalFilters?.term, modalYearOptions]);

  useEffect(() => {
    if (!embedded || !onHeroActions) return;
    onHeroActions({
      refresh: () => { fetchLimits(); fetchStats(); },
      openCreate,
    });
    return () => onHeroActions(null);
  }, [embedded, onHeroActions, fetchLimits, fetchStats, openCreate]);
  const openEdit   = (item) => {
    setEditItem(item);
    setForm({
      category:       normalizeNesaFeeCategory(item.category || "Public"),
      level:          normalizeNesaFeeLevel(item.level || "Primary"),
      term:           item.term           || "Term 1",
      academic_year:  item.academic_year  || portalFilters?.academicYear || "",
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
    const yearCheck = validateAcademicYear(form.academic_year);
    if (!yearCheck.valid || yearCheck.empty) {
      toast(yearCheck.message || "Academic year is required (e.g. 2027-2028)", "error");
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      const payload = {
        ...form,
        category: normalizeNesaFeeCategory(form.category),
        level: normalizeNesaFeeLevel(form.level),
        academic_year: yearCheck.normalized,
      };
      Object.entries(payload).forEach(([k, v]) => {
        if (v === "" || v == null) return;
        fd.append(k, v);
      });
      if (pdfFile) fd.append("regulation_pdf", pdfFile);
      if (editItem) {
        await apiFetchForm(`${API_BASE}/${editItem.id}`, "PUT", fd);
        toast("Fee limit updated successfully!", "success");
      } else {
        await apiFetchForm(API_BASE, "POST", fd);
        toast("Fee limit created successfully!", "success");
      }
      const savedYear = yearCheck.normalized;
      closeForm();
      await fetchLimits();
      await fetchStats();
      await onAcademicMetaRefresh?.();
      if (savedYear && onAcademicPeriodChange) {
        await onAcademicPeriodChange(
          { academicYear: savedYear, term: portalFilters?.term || "" },
          { skipRegister: true },
        );
      }
    } catch (err) {
      toast(err.message || (Array.isArray(err.errors) ? err.errors.join('; ') : 'Save failed'), 'error');
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
    <div className="anim space-y-5" style={{ fontFamily: font }}>
      <style>{globalStyles}</style>

      {/* Babyeyi wizard connection */}
      <div className="rounded-2xl border border-[#FEBF10]/30 bg-gradient-to-br from-amber-50/90 to-white px-4 py-3.5 sm:px-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#92400e]">
          Linked to school Babyeyi wizard
        </p>
        <p className="mt-1 text-xs leading-relaxed text-slate-600">
          Set limits for <strong className="text-[#000435]">Public</strong>, <strong className="text-[#000435]">Boarding</strong>, and{' '}
          <strong className="text-[#000435]">TVET</strong> only — the same categories schools pick in the Babyeyi wizard
          (School Manager &amp; Full school console). Education levels Nursery · Primary · Secondary · TSS drive the smart fee checker.
        </p>
      </div>

      {!embedded && (
        <>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-[#000435]">Tuition management</h3>
              <p className="mt-0.5 text-xs text-slate-500">National fee caps · audit trail · Babyeyi-aligned</p>
            </div>
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#000435] to-[#0a1142] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-[#FEBF10] shadow-md"
            >
              <Plus size={15} /> Set new limit
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { key: 'public', label: 'Public limits', value: stats?.public_count, sub: 'Day / public schools' },
              { key: 'boarding', label: 'Boarding limits', value: stats?.boarding_count, sub: 'Boarding category' },
              { key: 'tvet', label: 'TVET limits', value: stats?.tvet_count, sub: 'Technical schools' },
            ].map((card) => (
              <div
                key={card.key}
                className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm hover:border-[#FEBF10]/40 transition-colors"
              >
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{card.label}</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-[#000435]">{card.value ?? '—'}</p>
                <p className="mt-0.5 text-[10px] text-slate-500">{card.sub}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {embedded && onAcademicPeriodChange && (
        <NesaAcademicPeriodPanel
          academicPeriod={panelPeriod}
          yearOptions={yearOptions}
          termOptions={termOptions}
          onAcademicPeriodChange={onAcademicPeriodChange}
          onRegisterYear={async (year) => {
            await onAcademicPeriodChange(
              { academicYear: year, term: panelPeriod.term || "Term 1" },
              { skipRegister: false },
            );
            await onAcademicMetaRefresh?.();
          }}
        />
      )}

      {/* Filters */}
      <div className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search regulation ref, notes…"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/80 py-2.5 pl-10 pr-3 text-sm text-[#000435] placeholder:text-slate-400 focus:border-[#c87800]/40 focus:outline-none focus:ring-2 focus:ring-[#FEBF10]/15"
            />
          </div>
          <select
            value={filterCat}
            onChange={(e) => { setFilterCat(e.target.value); setPage(1); }}
            className="w-full min-w-[140px] rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-sm font-medium text-[#000435] sm:w-44"
          >
            <option value="">All categories</option>
            {NESA_SMART_CHECKER_CATEGORIES.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
          <select
            value={filterLevel}
            onChange={(e) => { setFilterLevel(e.target.value); setPage(1); }}
            className="w-full min-w-[140px] rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-sm font-medium text-[#000435] sm:w-44"
          >
            <option value="">All levels</option>
            {NESA_FEE_LEVEL_IDS.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-[#c87800]" />
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-sm">
            {limits.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <DollarSign className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                <p className="text-sm font-semibold text-slate-600">No fee limits found</p>
                <p className="mt-1 text-xs text-slate-400">Create a limit aligned with Babyeyi wizard categories.</p>
                <button
                  type="button"
                  onClick={openCreate}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#c87800] to-[#FEBF10] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-[#000435]"
                >
                  <Plus size={14} /> Set first limit
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-black/[0.06] bg-slate-50/90">
                      {['Category', 'Level', 'Term', 'Year', 'Max (RWF)', 'Regulation', 'Effective', 'Doc', 'Actions'].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500 whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.04]">
                    {limits.map((l) => {
                      const cs = catStyle[l.category] || { bg: C.goldBg, text: C.goldDark, border: C.goldBorder };
                      return (
                        <tr key={l.id} className="transition-colors hover:bg-amber-50/30">
                          <td className="px-4 py-3">
                            <span
                              className="inline-flex rounded-lg border px-2.5 py-0.5 text-[11px] font-bold"
                              style={{ background: cs.bg, color: cs.text, borderColor: cs.border }}
                            >
                              {l.category}
                            </span>
                          </td>
                          <td className="px-4 py-3"><Badge status={l.level?.toLowerCase()} /></td>
                          <td className="px-4 py-3 text-xs font-semibold text-slate-600">{l.term}</td>
                          <td className="px-4 py-3 text-xs text-slate-600">{l.academic_year}</td>
                          <td className="px-4 py-3 text-sm font-bold tabular-nums text-[#000435]">
                            {Number(l.max_amount).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 font-mono text-[11px] text-slate-500">{l.regulation_ref || '—'}</td>
                          <td className="px-4 py-3 text-xs text-slate-500">
                            {l.effective_date ? l.effective_date.substring(0, 10) : '—'}
                          </td>
                          <td className="px-4 py-3">
                            {l.document_name ? (
                              <a
                                href={l.document_path}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#c87800] hover:underline"
                              >
                                <FileText size={12} /> PDF
                              </a>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              {[
                                { onClick: () => openAudit(l), icon: History, title: 'Audit', cls: 'hover:bg-amber-50 text-[#c87800]' },
                                { onClick: () => openEdit(l), icon: Edit, title: 'Edit', cls: 'hover:bg-amber-50 text-[#c87800]' },
                                { onClick: () => handleDelete(l), icon: deleting === l.id ? Loader2 : Trash2, title: 'Delete', cls: 'hover:bg-red-50 text-red-600', spin: deleting === l.id },
                              ].map(({ onClick, icon: Icon, title, cls, spin }, bi) => (
                                <button
                                  key={bi}
                                  type="button"
                                  onClick={onClick}
                                  disabled={spin}
                                  title={title}
                                  className={`rounded-lg p-2 transition-colors ${cls}`}
                                >
                                  <Icon size={14} className={spin ? 'animate-spin' : ''} />
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

          <Pagination
            current={page}
            total={pagination.pages || 1}
            totalItems={pagination.total || 0}
            pageSize={LIMIT}
            loading={loading}
            onChange={setPage}
            className="mt-2"
          />
        </>
      )}

      {/* CREATE / EDIT — modern modal (NesaFeesLimit) */}
      <NesaFeeLimitFormModal
        open={showForm}
        editItem={editItem}
        form={form}
        setForm={setForm}
        pdfFile={pdfFile}
        setPdfFile={setPdfFile}
        saving={saving}
        onClose={closeForm}
        onSave={handleSave}
        yearOptions={modalYearOptions}
        currentAcademicYear={panelPeriod.academicYear || modalYearOptions[0] || ""}
      />

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