import React from "react";
import { BarChart2, Filter, Loader2, TrendingUp } from "lucide-react";
import { C, font, inp } from "../utils/theme";
import { fmt } from "../utils/helpers";

export default function AnalyticsTab({ district, data, loading, filters, sectorOptions = [], onFilterChange, onApply }) {
  const termOpts = ["", "Term 1", "Term 2", "Term 3"];
  const yearOpts = ["", "2026-2027", "2025-2026", "2024-2025", "2023-2024"];
  const sectors = sectorOptions.length ? ["", ...sectorOptions] : (data?.sector_breakdown?.length ? ["", ...data.sector_breakdown.map(s => s.sector)] : [""]);

  const BarBlock = ({ title, items, valueKey = "total", labelKey }) => {
    const max = Math.max(1, ...(items || []).map(x => Number(x[valueKey]) || 0));
    return (
      <div style={{ background: "white", borderRadius: 20, border: `1px solid ${C.goldBorder}`, padding: 20, boxShadow: "0 2px 8px rgba(0,4,53,0.08)" }}>
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
      <div style={{ background: "white", borderRadius: 20, border: `1px solid ${C.goldBorder}`, padding: 16, boxShadow: "0 2px 8px rgba(0,4,53,0.08)" }}>
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
            <div style={{ background: "white", borderRadius: 20, border: `1px solid ${C.goldBorder}`, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,4,53,0.08)" }}>
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
