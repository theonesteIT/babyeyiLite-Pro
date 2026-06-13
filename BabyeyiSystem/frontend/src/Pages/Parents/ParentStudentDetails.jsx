import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft, Calendar, ClipboardList, Loader2, UserCircle2,
  Home, TrendingUp, BookOpen, AlertTriangle, ChevronDown,
  Award, Filter, BarChart2, CheckCircle2, XCircle, Clock, GraduationCap, User
} from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://localhost:5100";

function ordinal(n) {
  const x = Number(n || 0);
  const s = ["th", "st", "nd", "rd"];
  const v = x % 100;
  return `${x}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

const NAVY = "#000435";
const AMBER = "#f59e0b";
const AMBER_DARK = "#d97706";

const pill = (active) => ({
  flex: 1,
  padding: "11px 8px",
  borderRadius: 14,
  border: active ? `2px solid ${AMBER}` : "2px solid transparent",
  background: active ? "#fffbeb" : "transparent",
  color: active ? AMBER_DARK : "#6b7280",
  fontWeight: 800,
  fontSize: 13,
  fontFamily: "'Sora', sans-serif",
  cursor: "pointer",
  transition: "all 0.18s ease",
  whiteSpace: "nowrap",
});

function StatCard({ label, value, sub, accent = "#f59e0b", icon: Icon }) {
  return (
    <div style={{
      background: "#fff",
      borderRadius: 20,
      padding: "18px 20px",
      border: `1.5px solid ${accent}22`,
      boxShadow: `0 4px 24px ${accent}10`,
      animation: "fadeSlide 0.35s ease both",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</span>
        {Icon && (
          <div style={{ width: 32, height: 32, borderRadius: 10, background: `${accent}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon size={16} color={accent} />
          </div>
        )}
      </div>
      <p style={{ fontSize: 28, fontWeight: 900, color: NAVY, margin: 0, fontFamily: "'Sora', sans-serif", lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 6 }}>{sub}</p>}
    </div>
  );
}

function ProgressBar({ pct, color = AMBER }) {
  return (
    <div style={{ height: 8, borderRadius: 99, background: "#f3f4f6", overflow: "hidden", marginTop: 8 }}>
      <div style={{
        height: "100%",
        width: `${Math.max(0, Math.min(100, pct))}%`,
        background: color,
        borderRadius: 99,
        transition: "width 0.6s cubic-bezier(0.34,1.2,0.64,1)"
      }} />
    </div>
  );
}

function FilterSelect({ value, onChange, children }) {
  return (
    <div style={{ position: "relative" }}>
      <select
        value={value}
        onChange={onChange}
        style={{
          appearance: "none",
          width: "100%",
          padding: "10px 36px 10px 14px",
          borderRadius: 12,
          border: "1.5px solid rgba(255,255,255,0.2)",
          background: "rgba(255,255,255,0.1)",
          color: "#fff",
          fontSize: 13,
          fontWeight: 700,
          fontFamily: "'Sora', sans-serif",
          backdropFilter: "blur(8px)",
          cursor: "pointer",
          outline: "none",
        }}
      >
        {children}
      </select>
      <ChevronDown size={14} color="rgba(255,255,255,0.7)" style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    present: { bg: "#ecfdf5", color: "#065f46", label: "Present", icon: CheckCircle2 },
    absent:  { bg: "#fff1f2", color: "#be123c", label: "Absent",  icon: XCircle },
    late:    { bg: "#fffbeb", color: "#92400e", label: "Late",    icon: Clock },
  };
  const s = status?.toLowerCase();
  const cfg = map[s] || { bg: "#f3f4f6", color: "#374151", label: status || "-", icon: null };
  const Icon = cfg.icon;
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: cfg.bg, color: cfg.color, borderRadius: 8, padding: "3px 10px", fontSize: 12, fontWeight: 700 }}>
      {Icon && <Icon size={12} />}
      {cfg.label}
    </div>
  );
}

function formatDisplayDate(v) {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString();
}

export default function ParentStudentDetails() {
  const { studentId: studentRef } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") === "attendance" || searchParams.get("tab") === "discipline"
    ? searchParams.get("tab")
    : "academic";
  const [tab, setTab] = useState(initialTab);
  const [attendanceType, setAttendanceType] = useState("class");
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ academic_years: [], terms: [], weekdays: [] });
  const [academic, setAcademic] = useState(null);
  const [attendance, setAttendance] = useState({ rows: [], summary: { present: 0, absent: 0, late: 0, other: 0, total: 0 } });
  const [discipline, setDiscipline] = useState({ rows: [], summary: { cases_count: 0, marks_deducted_total: 0, marks_remaining_latest: 0 } });
  const [err, setErr] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const hasYearParam    = searchParams.has("academic_year");
  const hasTermParam    = searchParams.has("term");
  const selectedYear    = hasYearParam ? (searchParams.get("academic_year") || "") : "";
  const selectedTerm    = hasTermParam ? (searchParams.get("term") || "") : "";
  const selectedWeekday = searchParams.get("weekday") || "";
  const selectedDate    = searchParams.get("date") || "";

  const termOptions = useMemo(() => {
    if (!selectedYear) return filters.terms || [];
    return filters.terms_by_year?.[selectedYear] || filters.terms || [];
  }, [filters, selectedYear]);

  const setFilter = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value); else next.delete(key);
    setSearchParams(next);
  };

  const normalizeAttendancePayload = (payload) => {
    if (!payload || typeof payload !== "object") {
      return { rows: [], summary: { present: 0, absent: 0, late: 0, other: 0, total: 0 } };
    }

    // Parent API shape (already normalized on backend)
    if (Array.isArray(payload.rows)) {
      return {
        rows: payload.rows,
        summary: payload.summary || { present: 0, absent: 0, late: 0, other: 0, total: payload.rows.length },
      };
    }

    // DOS class-period shape: { periods, roster } -> flatten one student rows
    if (Array.isArray(payload.periods) && Array.isArray(payload.roster)) {
      const rosterRow =
        payload.roster.find((r) => String(r.student_id) === String(studentRef)) ||
        payload.roster[0];
      if (!rosterRow) return { rows: [], summary: { present: 0, absent: 0, late: 0, other: 0, total: 0 } };
      const rows = (payload.periods || []).map((p) => ({
        attendance_date: payload.date || "",
        period: p.period,
        status: rosterRow?.period_statuses?.[p.period] || "NotMarked",
        remarks: rosterRow?.remarks || "",
      }));
      const summary = rows.reduce(
        (acc, r) => {
          const s = String(r.status || "").toLowerCase();
          if (s === "present") acc.present += 1;
          else if (s === "absent") acc.absent += 1;
          else if (s === "late") acc.late += 1;
          else acc.other += 1;
          acc.total += 1;
          return acc;
        },
        { present: 0, absent: 0, late: 0, other: 0, total: 0 }
      );
      return { rows, summary };
    }

    return { rows: [], summary: { present: 0, absent: 0, late: 0, other: 0, total: 0 } };
  };

  const normalizeDisciplinePayload = (payload) => {
    if (!payload) return { rows: [], summary: { cases_count: 0, marks_deducted_total: 0, marks_remaining_latest: 0 } };

    // Parent API shape
    if (Array.isArray(payload.rows)) {
      return {
        rows: payload.rows,
        summary:
          payload.summary || {
            cases_count: payload.rows.length,
            marks_deducted_total: payload.rows.reduce((s, r) => s + (r.action === 'remove' || !r.action ? Number(r.marks || r.marks_deducted || 0) : 0), 0),
            marks_remaining_latest: payload.rows.length ? Number(payload.rows[0]?.new_marks || payload.rows[0]?.marks_remaining_after || 0) : 0,
          },
      };
    }

    // Discipline API shape: data = array
    if (Array.isArray(payload)) {
      return {
        rows: payload,
        summary: {
          cases_count: payload.length,
          marks_deducted_total: payload.reduce((s, r) => s + Number(r.marks_deducted || 0), 0),
          marks_remaining_latest: payload.length ? Number(payload[0]?.marks_remaining_after || 0) : 0,
        },
      };
    }

    return { rows: [], summary: { cases_count: 0, marks_deducted_total: 0, marks_remaining_latest: 0 } };
  };

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t === "academic" || t === "attendance" || t === "discipline") setTab(t);
  }, [searchParams]);

  useEffect(() => {
    let ignore = false;
    const run = async () => {
      setLoading(true); setErr("");
      try {
        const buildQuery = (baseParams) => {
          const q = new URLSearchParams(baseParams);
          if (hasYearParam) q.set("academic_year", selectedYear);
          if (hasTermParam) q.set("term", selectedTerm);
          if (selectedWeekday) q.set("weekday", selectedWeekday);
          if (selectedDate) q.set("date", selectedDate);
          return q.toString();
        };

        const attendanceBase = attendanceType === "class"
          ? { student_ref: studentRef || "", type: "class" }
          : { student_ref: studentRef || "", type: "entry_exit" };

        const [fRes, aRes, atRes, dRes] = await Promise.all([
          fetch(`${API}/api/parent-portal/student-details/filters?student_ref=${encodeURIComponent(studentRef || "")}`, { credentials: "include" }),
          fetch(`${API}/api/parent-portal/student-details/academics?${buildQuery({ student_ref: studentRef || "" })}`, { credentials: "include" }),
          fetch(`${API}/api/parent-portal/student-attendance?${buildQuery(attendanceBase)}`, { credentials: "include" }),
          fetch(`${API}/api/parent-portal/student-discipline?${buildQuery({ student_ref: studentRef || "" })}`, { credentials: "include" }),
        ]);
        const [fJson, aJson, atJson, dJson] = await Promise.all([
          fRes.json().catch(() => ({})),
          aRes.json().catch(() => ({})),
          atRes.json().catch(() => ({})),
          dRes.json().catch(() => ({}))
        ]);
        if (!fRes.ok || !fJson.success) throw new Error(fJson.message || "Could not load filters");
        if (!aRes.ok || !aJson.success) throw new Error(aJson.message || "Could not load academics");
        if (!atRes.ok || !atJson.success) throw new Error(atJson.message || "Could not load attendance");
        if (!dRes.ok || !dJson.success) throw new Error(dJson.message || "Could not load discipline");
        if (ignore) return;
        const nextFilters = fJson.data || { academic_years: [], terms: [], weekdays: [] };
        setFilters(nextFilters);

        // Default to manager-configured current year/term on first visit.
        if (!hasYearParam && !hasTermParam) {
          const y = nextFilters.current_academic_year
            || (Array.isArray(nextFilters.academic_years) ? nextFilters.academic_years[0] : "")
            || "";
          const t = nextFilters.current_term
            || (Array.isArray(nextFilters.terms) ? nextFilters.terms[0] : "")
            || "";
          if (y || t) {
            const next = new URLSearchParams(searchParams);
            if (y) next.set("academic_year", y);
            if (t) next.set("term", t);
            setSearchParams(next);
            return;
          }
        }

        setAcademic(aJson.data || null);
        setAttendance(normalizeAttendancePayload(atJson.data));
        setDiscipline(normalizeDisciplinePayload(dJson.data));
      } catch (e) {
        if (!ignore) setErr(e.message || "Failed to load student details");
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    run();
    return () => { ignore = true; };
  }, [studentRef, hasYearParam, hasTermParam, selectedYear, selectedTerm, selectedWeekday, selectedDate, attendanceType]);

  const studentName = useMemo(() => {
    const st = academic?.student || {};
    return `${st.first_name || ""} ${st.last_name || ""}`.trim() || "Student";
  }, [academic]);

  const rankLabel = useMemo(() => {
    const raw = String(academic?.class_rank || "").trim();
    const m = raw.match(/(\d+)\s*(?:of|\/)\s*(\d+)/i);
    if (!m) return raw || "-";
    return `${ordinal(Number(m[1]))} of ${Number(m[2])}`;
  }, [academic?.class_rank]);

  const gpaRaw = academic?.overall_gpa_percent;
  const gpa = gpaRaw != null && gpaRaw !== '' ? Number(gpaRaw) : null;
  const gpaColor = gpa == null ? "#9ca3af" : gpa >= 75 ? "#10b981" : gpa >= 50 ? AMBER : "#ef4444";
  const hasActiveFilters = hasYearParam || hasTermParam || selectedWeekday || selectedDate;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800;900&display=swap');

        @keyframes fadeSlide { from { opacity:0; transform:translateY(14px) } to { opacity:1; transform:translateY(0) } }
        @keyframes fadeIn    { from { opacity:0 } to { opacity:1 } }
        @keyframes spin      { to { transform: rotate(360deg) } }

        * { font-family: 'Sora', sans-serif; box-sizing: border-box; }
        select option { color: #000435; background: #fff; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 99px; }

        /* ── Page shell ── */
        .sd-page {
          width: 100%;
          min-height: 100vh;
          background: #f0f2f8;
        }

        /* ── Hero: full width ── */
        .sd-hero {
          width: 100%;
          background: linear-gradient(150deg, #000435 0%, #000d6b 65%, #001799 100%);
          position: relative;
          overflow: hidden;
          padding-bottom: 0;
        }

        .sd-hero-inner {
          max-width: 1280px;
          margin: 0 auto;
          padding: 52px 32px 32px;
          position: relative;
          z-index: 1;
        }

        /* ── Body: max-width container ── */
        .sd-body {
          max-width: 1280px;
          margin: 0 auto;
          padding: 28px 32px 48px;
        }

        /* ── Main layout ── */
        .sd-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
          align-items: start;
        }

        .sd-top-controls {
          display: flex;
          flex-direction: column;
          gap: 12px;
          background: #fff;
          border-radius: 20px;
          padding: 14px;
          box-shadow: 0 2px 12px rgba(0,4,53,0.07);
        }

        /* Top tab bar */
        .sd-tabs {
          border-radius: 16px;
          padding: 6px;
          display: flex;
          flex-direction: row;
          gap: 4px;
          background: #f8fafc;
        }

        .sd-tab-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 12px 14px;
          border-radius: 14px;
          border: 2px solid transparent;
          background: transparent;
          color: #6b7280;
          font-weight: 800;
          font-size: 14px;
          font-family: 'Sora', sans-serif;
          cursor: pointer;
          transition: all 0.18s ease;
          text-align: center;
          flex: 1;
        }
        .sd-tab-btn.active {
          border-color: #f59e0b;
          background: #fffbeb;
          color: #d97706;
        }

        /* Filter panel in top controls */
        .sd-filter-card {
          background: #f8fafc;
          border-radius: 16px;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .sd-filter-card select,
        .sd-filter-card input[type="date"] {
          width: 100%;
          padding: 9px 14px;
          border-radius: 12px;
          border: 1.5px solid #e5e7eb;
          background: #f9fafb;
          color: #000435;
          font-size: 13px;
          font-weight: 700;
          font-family: 'Sora', sans-serif;
          outline: none;
          appearance: none;
        }

        .sd-filter-card select:focus,
        .sd-filter-card input:focus {
          border-color: #f59e0b;
          box-shadow: 0 0 0 3px rgba(245,158,11,0.12);
        }

        /* ── Subject grid: 2 cols on desktop ── */
        .subject-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        /* ── Attendance / discipline rows ── */
        .record-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        /* ── Mobile overrides ── */
        @media (max-width: 768px) {
          .sd-hero-inner { padding: 52px 16px 24px; }
          .sd-body { padding: 16px 16px 48px; }
          .sd-grid { grid-template-columns: 1fr; }

          .sd-tabs {
            border-radius: 16px;
            display: grid;
            grid-template-columns: 1fr;
          }
          .sd-tab-btn {
            justify-content: flex-start;
            gap: 6px;
            padding: 11px 10px;
            font-size: 13px;
            text-align: left;
          }

          .sd-filter-card { display: flex; }

          .subject-grid { grid-template-columns: 1fr; }
          .record-grid  { grid-template-columns: 1fr; }
        }

        /* Hero filter: hidden on desktop, shown on mobile */
        .sd-hero-filter { display: none; }

        .att-table-desktop { display: block; }
        .att-cards-mobile { display: none; }

        @media (max-width: 768px) {
          .att-table-desktop { display: none; }
          .att-cards-mobile { display: grid; grid-template-columns: 1fr; gap: 10px; }
        }
      `}</style>

      <div className="sd-page">

        {/* ═══ HERO ═══ */}
        <div className="sd-hero">
          {/* Decorative rings */}
          <div style={{ position:"absolute", top:-60, right:-60, width:280, height:280, borderRadius:"50%", border:"2px solid rgba(245,158,11,0.1)", pointerEvents:"none" }} />
          <div style={{ position:"absolute", top:-20, right:-20, width:160, height:160, borderRadius:"50%", border:"2px solid rgba(245,158,11,0.18)", pointerEvents:"none" }} />
          <div style={{ position:"absolute", bottom:-50, left:-40, width:220, height:220, borderRadius:"50%", background:"rgba(245,158,11,0.04)", pointerEvents:"none" }} />

          <div className="sd-hero-inner">
            {/* Nav row */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24 }}>
              <Link to="/parents/shulecard" style={{
                display:"inline-flex", alignItems:"center", gap:8,
                background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.15)",
                borderRadius:12, padding:"8px 16px",
                color:"#fff", textDecoration:"none", fontSize:13, fontWeight:700,
              }}>
                <ArrowLeft size={15} /> Back
              </Link>
              <Link to="/parents/home" style={{
                width:42, height:42, borderRadius:13,
                background:"rgba(245,158,11,0.15)", border:"1px solid rgba(245,158,11,0.3)",
                display:"flex", alignItems:"center", justifyContent:"center", textDecoration:"none"
              }}>
                <Home size={18} color={AMBER} />
              </Link>
            </div>

            {/* Student identity */}
            <div style={{ display:"flex", alignItems:"center", gap:18, marginBottom:24 }}>
              <div style={{
                width:62, height:62, borderRadius:20,
                background:`linear-gradient(135deg, ${AMBER}, ${AMBER_DARK})`,
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:24, fontWeight:900, color:"#fff",
                boxShadow:`0 4px 20px rgba(245,158,11,0.4)`,
                flexShrink:0,
              }}>
                {studentName.slice(0,1).toUpperCase()}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ color:"rgba(255,255,255,0.55)", fontSize:11, fontWeight:600, letterSpacing:"0.1em", textTransform:"uppercase", margin:"0 0 4px" }}>Student Profile</p>
                <h2 style={{ color:"#fff", fontSize:22, fontWeight:900, margin:0, letterSpacing:"-0.3px" }}>{studentName}</h2>
                <p style={{ color:"rgba(255,255,255,0.5)", fontSize:13, margin:"4px 0 0" }}>
                  {academic?.student?.class_name || "—"} &nbsp;·&nbsp; {academic?.student?.school_name || "—"}
                </p>
              </div>

              {/* GPA pill in hero — desktop only */}
              {gpa != null && (
                <div style={{
                  flexShrink: 0,
                  background: `${gpaColor}20`,
                  border: `1.5px solid ${gpaColor}40`,
                  borderRadius: 16, padding: "10px 18px",
                  textAlign: "center",
                }}>
                  <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 2px" }}>GPA</p>
                  <p style={{ color: gpaColor, fontSize: 24, fontWeight: 900, margin: 0, lineHeight: 1 }}>{gpa}<span style={{ fontSize: 13, opacity: 0.7 }}>%</span></p>
                </div>
              )}
            </div>

            {/* Mobile-only filter toggle */}
            <div className="sd-hero-filter">
              <button
                type="button"
                onClick={() => setFiltersOpen(p => !p)}
                style={{
                  display:"flex", alignItems:"center", justifyContent:"space-between",
                  width:"100%",
                  background:"rgba(255,255,255,0.08)", border:`1px solid ${hasActiveFilters ? AMBER+"55" : "rgba(255,255,255,0.15)"}`,
                  borderRadius:16, padding:"12px 16px",
                  color:"#fff", cursor:"pointer",
                }}
              >
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <Filter size={15} color={hasActiveFilters ? AMBER : "rgba(255,255,255,0.6)"} />
                  <span style={{ fontSize:13, fontWeight:700, color: hasActiveFilters ? AMBER : "rgba(255,255,255,0.8)" }}>
                    {hasActiveFilters ? "Filters active" : "Filter results"}
                  </span>
                  {hasActiveFilters && (
                    <span style={{ background:AMBER, color:"#fff", borderRadius:99, padding:"1px 8px", fontSize:11, fontWeight:800 }}>
                      {[selectedYear, selectedTerm, selectedWeekday, selectedDate].filter(Boolean).length}
                    </span>
                  )}
                </div>
                <ChevronDown size={16} color="rgba(255,255,255,0.5)" style={{ transform: filtersOpen ? "rotate(180deg)" : "none", transition:"transform 0.2s" }} />
              </button>

              {filtersOpen && (
                <div style={{
                  marginTop:10,
                  background:"rgba(0,4,53,0.95)",
                  border:"1px solid rgba(255,255,255,0.12)",
                  borderRadius:20, padding:16,
                  display:"grid", gridTemplateColumns:"1fr 1fr", gap:10,
                  animation:"fadeSlide 0.2s ease",
                  backdropFilter:"blur(16px)",
                }}>
                  <FilterSelect value={selectedYear} onChange={(e) => setFilter("academic_year", e.target.value)}>
                    <option value="">All years</option>
                    {(filters.academic_years || []).map((y) => <option key={y} value={y}>{y}</option>)}
                  </FilterSelect>
                  <FilterSelect value={selectedTerm} onChange={(e) => setFilter("term", e.target.value)}>
                    <option value="">All terms</option>
                    {termOptions.map((t) => <option key={t} value={t}>{t}</option>)}
                  </FilterSelect>
                  <FilterSelect value={selectedWeekday} onChange={(e) => setFilter("weekday", e.target.value)}>
                    <option value="">Any day</option>
                    {(filters.weekdays || []).map((d) => <option key={d} value={d}>{d}</option>)}
                  </FilterSelect>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setFilter("date", e.target.value)}
                    style={{
                      width:"100%", padding:"10px 14px",
                      borderRadius:12,
                      border:"1.5px solid rgba(255,255,255,0.2)",
                      background:"rgba(255,255,255,0.1)",
                      color:"#fff", fontSize:13, fontWeight:700,
                      fontFamily:"'Sora', sans-serif",
                      outline:"none", colorScheme:"dark",
                    }}
                  />
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={() => { ["academic_year","term","weekday","date"].forEach(k => setFilter(k,"")); }}
                      style={{
                        gridColumn:"span 2", padding:"9px", borderRadius:12,
                        border:"1px solid rgba(245,158,11,0.3)", background:"rgba(245,158,11,0.1)",
                        color:AMBER, fontSize:13, fontWeight:700, cursor:"pointer",
                      }}
                    >
                      Clear all filters
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ═══ BODY ═══ */}
        <div className="sd-body">
          <div className="sd-grid">
            <div>
              <div className="sd-top-controls">
                <div className="sd-tabs">
                  {[
                    { key:"academic",   label:"Academic",   icon:BookOpen },
                    { key:"attendance", label:"Attendance", icon:Calendar },
                    { key:"discipline", label:"Discipline", icon:ClipboardList },
                  ].map(({ key, label, icon: Icon }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setTab(key)}
                      className={`sd-tab-btn${tab === key ? " active" : ""}`}
                    >
                      <Icon size={16} />
                      {label}
                    </button>
                  ))}
                </div>

                <div className="sd-filter-card">
                  <p style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9ca3af", margin: "0 0 4px", display: "flex", alignItems: "center", gap: 6 }}>
                    <Filter size={12} /> Filters
                    {hasActiveFilters && (
                      <span style={{ background: AMBER, color: "#fff", borderRadius: 99, padding: "1px 7px", fontSize: 10, fontWeight: 800, marginLeft: 4 }}>
                        {[selectedYear, selectedTerm, selectedWeekday, selectedDate].filter(Boolean).length}
                      </span>
                    )}
                  </p>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(180px, 1fr))", gap:10 }}>
                    <div style={{ position: "relative" }}>
                      <select
                        value={selectedYear}
                        onChange={(e) => setFilter("academic_year", e.target.value)}
                        style={{ width:"100%", padding:"9px 14px", borderRadius:12, border:"1.5px solid #e5e7eb", background:"#fff", color:"#000435", fontSize:13, fontWeight:700, fontFamily:"'Sora',sans-serif", outline:"none", appearance:"none" }}
                      >
                        <option value="">All years</option>
                        {(filters.academic_years || []).map((y) => <option key={y} value={y}>{y}</option>)}
                      </select>
                      <ChevronDown size={13} color="#9ca3af" style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", pointerEvents:"none" }} />
                    </div>
                    <div style={{ position: "relative" }}>
                      <select
                        value={selectedTerm}
                        onChange={(e) => setFilter("term", e.target.value)}
                        style={{ width:"100%", padding:"9px 14px", borderRadius:12, border:"1.5px solid #e5e7eb", background:"#fff", color:"#000435", fontSize:13, fontWeight:700, fontFamily:"'Sora',sans-serif", outline:"none", appearance:"none" }}
                      >
                        <option value="">All terms</option>
                        {termOptions.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <ChevronDown size={13} color="#9ca3af" style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", pointerEvents:"none" }} />
                    </div>
                    <div style={{ position: "relative" }}>
                      <select
                        value={selectedWeekday}
                        onChange={(e) => setFilter("weekday", e.target.value)}
                        style={{ width:"100%", padding:"9px 14px", borderRadius:12, border:"1.5px solid #e5e7eb", background:"#fff", color:"#000435", fontSize:13, fontWeight:700, fontFamily:"'Sora',sans-serif", outline:"none", appearance:"none" }}
                      >
                        <option value="">Any day</option>
                        {(filters.weekdays || []).map((d) => <option key={d} value={d}>{d}</option>)}
                      </select>
                      <ChevronDown size={13} color="#9ca3af" style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", pointerEvents:"none" }} />
                    </div>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setFilter("date", e.target.value)}
                      style={{ width:"100%", padding:"9px 14px", borderRadius:12, border:"1.5px solid #e5e7eb", background:"#fff", color:"#000435", fontSize:13, fontWeight:700, fontFamily:"'Sora',sans-serif", outline:"none" }}
                    />
                  </div>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={() => { ["academic_year","term","weekday","date"].forEach(k => setFilter(k,"")); }}
                      style={{
                        width:"100%", padding:"9px", borderRadius:12,
                        border:`1px solid ${AMBER}44`, background:"#fffbeb",
                        color:AMBER_DARK, fontSize:13, fontWeight:700, cursor:"pointer",
                      }}
                    >
                      Clear all filters
                    </button>
                  )}
                </div>

                {tab === "attendance" && (
                  <div style={{ background:"#f8fafc", borderRadius:16, padding:6, display:"flex", gap:4 }}>
                    {[
                      { key:"class",      label:"Class Period" },
                      { key:"entry_exit", label:"Entry / Exit" },
                    ].map(({ key, label }) => (
                      <button
                        key={key} type="button"
                        onClick={() => setAttendanceType(key)}
                        style={pill(attendanceType === key)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {loading ? (
                <div style={{ textAlign:"center", padding:"60px 0", color:"#9ca3af", background:"#fff", borderRadius:24, boxShadow:"0 2px 12px rgba(0,4,53,0.06)" }}>
                  <Loader2 size={36} style={{ animation:"spin 1s linear infinite", margin:"0 auto 14px", display:"block" }} />
                  <p style={{ fontWeight:700, margin:0 }}>Loading data…</p>
                </div>
              ) : err ? (
                <div style={{ borderRadius:20, background:"#fff1f2", border:"1.5px solid #fecaca", padding:"16px 20px", color:"#be123c", fontWeight:700, fontSize:14 }}>
                  {err}
                </div>
              ) : (
                <>
                  {/* ─── ACADEMIC ─── */}
                  {tab === "academic" && (
                    <div style={{ display:"flex", flexDirection:"column", gap:16, animation:"fadeSlide 0.3s ease" }}>
                      {hasActiveFilters && (
                        <div style={{ background:"#fffbeb", border:"1.5px solid #fde68a", borderRadius:14, padding:"10px 16px", fontSize:12, fontWeight:700, color:AMBER_DARK, display:"flex", alignItems:"center", gap:6 }}>
                          <Filter size={13} />
                          {hasYearParam ? (selectedYear || "All years") : (filters.current_academic_year || "Current year")}
                          &nbsp;·&nbsp;
                          {hasTermParam ? (selectedTerm || "All terms") : (filters.current_term || "Current term")}
                          {selectedDate ? ` · ${selectedDate}` : ""}
                        </div>
                      )}

                      {/* GPA card */}
                      <div style={{ background:"#fff", borderRadius:20, padding:"22px 24px", border:`1.5px solid ${gpaColor}22`, boxShadow:`0 4px 20px ${gpaColor}10` }}>
                        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                          <span style={{ fontSize:11, fontWeight:700, color:"#9ca3af", textTransform:"uppercase", letterSpacing:"0.08em" }}>Overall GPA</span>
                          <div style={{ display:"flex", alignItems:"center", gap:6, background:`${gpaColor}15`, borderRadius:8, padding:"3px 12px" }}>
                            <TrendingUp size={13} color={gpaColor} />
                            <span style={{ color:gpaColor, fontSize:12, fontWeight:800 }}>{gpa == null ? "No data" : gpa >= 75 ? "Strong" : gpa >= 50 ? "Average" : "Needs work"}</span>
                          </div>
                        </div>
                        <p style={{ fontSize:52, fontWeight:900, color:NAVY, margin:0, lineHeight:1, fontFamily:"'Sora', sans-serif" }}>
                          {gpa != null ? <>{gpa}<span style={{ fontSize:24, color:"#9ca3af" }}>%</span></> : '—'}
                        </p>
                        <ProgressBar pct={gpa} color={gpaColor} />
                      </div>

                      {/* Rank + subjects count */}
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                        <StatCard label="Class Rank" value={rankLabel} icon={Award} accent={AMBER} />
                        <StatCard label="Subjects" value={(academic?.subjects || []).length || "—"} icon={BookOpen} accent="#8b5cf6" />
                      </div>

                      {/* Subject performance */}
                      {(academic?.subjects || []).length > 0 && (
                        <div style={{ background:"#fff", borderRadius:20, padding:"20px 24px", boxShadow:"0 2px 12px rgba(0,4,53,0.06)" }}>
                          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:18 }}>
                            <BarChart2 size={16} color={NAVY} />
                            <span style={{ fontWeight:800, fontSize:15, color:NAVY }}>Subject Performance</span>
                          </div>
                          <div className="subject-grid">
                            {(academic?.subjects || []).map((s, i) => {
                              const pct = s.average_percent ?? ((s.score / s.max) * 100);
                              const col = pct >= 75 ? "#10b981" : pct >= 50 ? AMBER : "#ef4444";
                              return (
                                <div key={s.subject} style={{ padding:"14px 16px", background:"#f9fafb", borderRadius:14, animation:`fadeSlide 0.3s ease ${i * 0.05}s both` }}>
                                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
                                    <span style={{ fontSize:13, fontWeight:700, color:NAVY }}>{s.subject}</span>
                                    <span style={{ fontSize:14, fontWeight:800, color:col }}>
                                      {s.score != null ? <>{s.score}<span style={{ color:"#9ca3af", fontWeight:600 }}>/{s.max}</span></> : `${pct}%`}
                                    </span>
                                  </div>
                                  {s.latest_assessment && (
                                    <p style={{ fontSize:11, color:"#9ca3af", margin:"0 0 6px" }}>{s.latest_assessment} · {s.teacher_name || "Teacher"}</p>
                                  )}
                                  <ProgressBar pct={pct} color={col} />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Teacher-registered marks feed */}
                      <div style={{ background:"#fff", borderRadius:20, padding:"20px 24px", boxShadow:"0 2px 12px rgba(0,4,53,0.06)" }}>
                        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16, flexWrap:"wrap", gap:8 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                            <GraduationCap size={16} color={AMBER} />
                            <span style={{ fontWeight:800, fontSize:15, color:NAVY }}>Marks from teachers</span>
                          </div>
                          {(academic?.assessment_count ?? 0) > 0 && (
                            <span style={{ fontSize:11, fontWeight:700, color:AMBER_DARK, background:"#fffbeb", padding:"4px 10px", borderRadius:99 }}>
                              {academic.assessment_count} recorded
                            </span>
                          )}
                        </div>
                        {(academic?.assessments || []).length === 0 ? (
                          <div style={{ textAlign:"center", padding:"28px 0", color:"#9ca3af" }}>
                            <BookOpen size={32} style={{ margin:"0 auto 10px", display:"block", opacity:0.35 }} />
                            <p style={{ fontWeight:700, margin:0, fontSize:14 }}>No published marks yet</p>
                            <p style={{ fontSize:12, margin:"6px 0 0" }}>Scores appear here when teachers publish marks on the portal.</p>
                          </div>
                        ) : (
                          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                            {(academic?.assessments || []).slice(0, 25).map((a, i) => {
                              const pct = a.percent;
                              const col = pct == null ? "#6b7280" : pct >= 75 ? "#10b981" : pct >= 50 ? AMBER : "#ef4444";
                              return (
                                <div key={`${a.assessment_id}-${a.subject_name}-${i}`} style={{
                                  display:"flex", alignItems:"center", justifyContent:"space-between", gap:12,
                                  padding:"14px 16px", borderRadius:14, border:"1.5px solid #f3f4f6",
                                  background: i === 0 ? "#fffbeb" : "#fafafa",
                                }}>
                                  <div style={{ minWidth:0, flex:1 }}>
                                    <p style={{ margin:0, fontSize:14, fontWeight:800, color:NAVY }}>{a.assessment_name}</p>
                                    <p style={{ margin:"4px 0 0", fontSize:12, color:"#6b7280" }}>
                                      {a.subject_name} · {formatDisplayDate(a.assessment_date)}
                                    </p>
                                    <p style={{ margin:"6px 0 0", fontSize:11, color:"#9ca3af", display:"flex", alignItems:"center", gap:4 }}>
                                      <User size={11} /> Registered by {a.teacher_name || "Teacher"}
                                    </p>
                                  </div>
                                  <div style={{ textAlign:"right", flexShrink:0 }}>
                                    {a.mark_code_label ? (
                                      <span style={{ fontSize:12, fontWeight:800, color:"#6b7280", background:"#f3f4f6", padding:"6px 10px", borderRadius:8 }}>{a.mark_code_label}</span>
                                    ) : (
                                      <>
                                        <p style={{ margin:0, fontSize:18, fontWeight:900, color:col }}>{a.score}<span style={{ fontSize:12, color:"#9ca3af" }}>/{a.max}</span></p>
                                        {pct != null && <p style={{ margin:"2px 0 0", fontSize:11, fontWeight:700, color:col }}>{pct}%</p>}
                                      </>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {!academic && (
                        <div style={{ textAlign:"center", padding:"40px 0", color:"#9ca3af", background:"#fff", borderRadius:20 }}>
                          <BookOpen size={36} style={{ margin:"0 auto 10px", display:"block", opacity:0.3 }} />
                          <p style={{ fontWeight:700, margin:0 }}>No academic data available</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ─── ATTENDANCE ─── */}
                  {tab === "attendance" && (
                    <div style={{ display:"flex", flexDirection:"column", gap:16, animation:"fadeSlide 0.3s ease" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
                        <StatCard
                          label="Present"
                          value={attendance?.summary?.present ?? 0}
                          accent="#10b981"
                          icon={CheckCircle2}
                        />
                        <StatCard
                          label="Absent"
                          value={attendance?.summary?.absent ?? 0}
                          accent="#ef4444"
                          icon={XCircle}
                        />
                        <StatCard
                          label="Late"
                          value={attendance?.summary?.late ?? 0}
                          accent={AMBER}
                          icon={Clock}
                        />
                        <StatCard
                          label="Total"
                          value={attendance?.summary?.total ?? (attendance?.rows || []).length}
                          accent="#6366f1"
                          icon={Calendar}
                        />
                      </div>

                      <div style={{ background:"#fff", borderRadius:20, padding:"20px 24px", boxShadow:"0 2px 12px rgba(0,4,53,0.06)" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16 }}>
                          <Calendar size={16} color={NAVY} />
                          <span style={{ fontWeight:800, fontSize:15, color:NAVY }}>
                            Attendance Records
                            {(attendance?.rows || []).length > 0 && (
                              <span style={{ marginLeft:8, background:"#f3f4f6", borderRadius:8, padding:"2px 8px", fontSize:12, color:"#6b7280" }}>
                                {(attendance?.rows || []).length}
                              </span>
                            )}
                          </span>
                        </div>

                        {(attendance?.rows || []).length === 0 ? (
                          <div style={{ textAlign:"center", padding:"32px 0", color:"#9ca3af" }}>
                            <Calendar size={34} style={{ margin:"0 auto 10px", display:"block", opacity:0.3 }} />
                            <p style={{ fontWeight:700, margin:0, fontSize:14 }}>No records for selected filter</p>
                          </div>
                        ) : attendanceType === "class" ? (
                          <>
                            <div className="att-table-desktop" style={{ maxHeight:520, overflowY:"auto", border:"1.5px solid #f3f4f6", borderRadius:14 }}>
                              <table style={{ width:"100%", borderCollapse:"separate", borderSpacing:0 }}>
                                <thead>
                                  <tr style={{ background:"#f8fafc" }}>
                                    <th style={{ textAlign:"left", padding:"10px 12px", fontSize:11, textTransform:"uppercase", letterSpacing:"0.08em", color:"#6b7280" }}>Date</th>
                                    <th style={{ textAlign:"left", padding:"10px 12px", fontSize:11, textTransform:"uppercase", letterSpacing:"0.08em", color:"#6b7280" }}>Period</th>
                                    <th style={{ textAlign:"left", padding:"10px 12px", fontSize:11, textTransform:"uppercase", letterSpacing:"0.08em", color:"#6b7280" }}>Course</th>
                                    <th style={{ textAlign:"left", padding:"10px 12px", fontSize:11, textTransform:"uppercase", letterSpacing:"0.08em", color:"#6b7280" }}>Status</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(attendance?.rows || []).map((r, idx) => (
                                    <tr key={`${idx}-${r.attendance_date || r.created_at}`} style={{ borderTop:"1px solid #f1f5f9" }}>
                                      <td style={{ padding:"12px", fontSize:13, color:"#334155", fontWeight:700 }}>{formatDisplayDate(r.attendance_date)}</td>
                                      <td style={{ padding:"12px", fontSize:13, color:NAVY, fontWeight:800 }}>{r.period || "Period"}</td>
                                      <td style={{ padding:"12px", fontSize:13, color:"#475569", fontWeight:700 }}>{r.course_name || r.course || "—"}</td>
                                      <td style={{ padding:"12px" }}><StatusBadge status={r.status} /></td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            <div className="att-cards-mobile">
                              {(attendance?.rows || []).map((r, idx) => (
                                <div
                                  key={`m-${idx}-${r.attendance_date || r.created_at}`}
                                  style={{
                                    borderRadius:14, border:"1.5px solid #f3f4f6", padding:"12px 14px",
                                    background:"#fafafa",
                                  }}
                                >
                                  <p style={{ margin:0, fontSize:12, color:"#94a3b8", fontWeight:700 }}>{formatDisplayDate(r.attendance_date)}</p>
                                  <p style={{ margin:"3px 0 0", fontSize:14, color:NAVY, fontWeight:800 }}>{r.period || "Period"}</p>
                                  <p style={{ margin:"2px 0 8px", fontSize:12, color:"#475569", fontWeight:700 }}>{r.course_name || r.course || "—"}</p>
                                  <StatusBadge status={r.status} />
                                </div>
                              ))}
                            </div>
                          </>
                        ) : (
                          <div className="record-grid" style={{ maxHeight:520, overflowY:"auto" }}>
                            {(attendance?.rows || []).map((r, idx) => (
                              <div
                                key={`${idx}-${r.attendance_date || r.created_at}`}
                                style={{
                                  borderRadius:14, border:"1.5px solid #f3f4f6", padding:"13px 16px",
                                  display:"flex", alignItems:"center", justifyContent:"space-between",
                                  background:"#fafafa",
                                  animation:`fadeSlide 0.25s ease ${idx * 0.04}s both`,
                                }}
                              >
                                <p style={{ fontWeight:700, fontSize:13, color:NAVY, margin:0 }}>{formatDisplayDate(r.attendance_date)}</p>
                                <div style={{ display:"flex", gap:5 }}>
                                  <StatusBadge status={r.status_in || "absent"} />
                                  <StatusBadge status={r.status_out || "absent"} />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ─── DISCIPLINE ─── */}
                  {tab === "discipline" && (
                    <div style={{ animation:"fadeSlide 0.3s ease" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
                        <StatCard
                          label="Cases"
                          value={discipline?.summary?.cases_count ?? (discipline?.rows || []).length}
                          accent="#ef4444"
                          icon={ClipboardList}
                        />
                        <StatCard
                          label="Marks Deducted"
                          value={discipline?.summary?.marks_deducted_total ?? 0}
                          accent="#b91c1c"
                          icon={AlertTriangle}
                        />
                        <StatCard
                          label="Marks Remaining"
                          value={discipline?.summary?.marks_remaining_latest ?? 0}
                          accent="#10b981"
                          icon={Award}
                        />
                      </div>
                      <div style={{ marginBottom: 12, background:"#ecfeff", border:"1px solid #bae6fd", borderRadius:12, padding:"8px 12px", fontSize:12, fontWeight:700, color:"#0c4a6e" }}>
                        Discipline default marks: {discipline?.summary?.discipline_default_marks ?? 40}
                      </div>

                      <div style={{ background:"#fff", borderRadius:20, padding:"20px 24px", boxShadow:"0 2px 12px rgba(0,4,53,0.06)" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16 }}>
                          <ClipboardList size={16} color={NAVY} />
                          <span style={{ fontWeight:800, fontSize:15, color:NAVY }}>
                            Discipline Records
                            {(discipline?.rows || []).length > 0 && (
                              <span style={{ marginLeft:8, background:"#fff1f2", borderRadius:8, padding:"2px 8px", fontSize:12, color:"#be123c" }}>
                                {(discipline?.rows || []).length}
                              </span>
                            )}
                          </span>
                        </div>

                        {(discipline?.rows || []).length === 0 ? (
                          <div style={{ textAlign:"center", padding:"36px 0", color:"#9ca3af" }}>
                            <CheckCircle2 size={40} style={{ margin:"0 auto 10px", display:"block", color:"#10b981", opacity:0.6 }} />
                            <p style={{ fontWeight:800, color:"#065f46", margin:0, fontSize:15 }}>No discipline issues</p>
                            <p style={{ fontSize:13, color:"#9ca3af", marginTop:5 }}>Great job keeping a clean record!</p>
                          </div>
                        ) : (
                          <div className="record-grid" style={{ maxHeight:520, overflowY:"auto" }}>
                            {(discipline?.rows || []).map((r, idx) => {
                              const isAdd = r.action === 'add';
                              const bgColor = isAdd ? '#ecfdf5' : '#fff9f9';
                              const borderColor = isAdd ? '#a7f3d0' : '#fecaca';
                              const textColor = isAdd ? '#047857' : '#be123c';
                              const iconColor = isAdd ? '#10b981' : '#ef4444';
                              const pillBg = isAdd ? '#d1fae5' : '#fff1f2';
                              return (
                              <div
                                key={r.id}
                                style={{
                                  borderRadius:14, border:`1.5px solid ${borderColor}`, padding:"14px 16px",
                                  background:bgColor,
                                  animation:`fadeSlide 0.25s ease ${idx * 0.04}s both`,
                                }}
                              >
                                <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:8 }}>
                                  <div style={{ flex:1, minWidth:0 }}>
                                    <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:5 }}>
                                      {isAdd ? <Award size={13} color={iconColor} /> : <AlertTriangle size={13} color={iconColor} />}
                                      <span style={{ fontWeight:800, fontSize:14, color:NAVY }}>
                                        {r.reason || r.case_name || r.lesson_subject || (isAdd ? "Marks Added" : "Case")}
                                      </span>
                                    </div>
                                    <p style={{ fontSize:12, color:"#9ca3af", margin:"0 0 5px" }}>
                                      {r.academic_year ? `${r.academic_year} · ${r.term} · ` : ""}{new Date(r.action_date || r.created_at).toLocaleDateString()}
                                    </p>
                                    {(r.notes || r.description) && (
                                      <p style={{ fontSize:13, color:"#374151", margin:0, lineHeight:1.5 }}>{r.notes || r.description}</p>
                                    )}
                                  </div>
                                  <div style={{
                                    flexShrink:0,
                                    background:pillBg, border:`1.5px solid ${borderColor}`,
                                    borderRadius:10, padding:"4px 10px",
                                    color:textColor, fontWeight:900, fontSize:14,
                                  }}>
                                    {isAdd ? '+' : '-'}{Number(r.marks || r.marks_deducted || 0).toLocaleString()}
                                  </div>
                                </div>
                              </div>
                            )})}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}