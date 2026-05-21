import React, { useState } from "react";
import { Search, Filter, ChevronDown, X, AlertCircle, FileText, Building2, Clock, AlertTriangle } from "lucide-react";
import { C, font, inp } from "../utils/theme";
import BabyeyiCard from "../components/BabyeyiCard";
import Pagination from "../components/Pagination";
import SectorBreakdown from "../components/SectorBreakdown";

export default function ListTab({
  items, listLoad, listErr, loadList,
  filters, filterUpdate, clearFilters, showFilters, setShowFilters,
  page, setPage, pagination,
  deo, stats, switchTab, handleAction, setDetailId
}) {
  return (
    <div className="anim">
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 300px", gap: 20, alignItems: "start" }}
        className="list-grid">
        <style>{`.list-grid { grid-template-columns: 1fr; } @media(min-width:1024px){ .list-grid { grid-template-columns: minmax(0,1fr) 300px; } }`}</style>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Search + filters */}
          <div style={{
            background: "white", border: `1px solid ${C.goldBorder}`,
            borderRadius: 20, padding: 16, boxShadow: "0 2px 8px rgba(0,4,53,0.08)",
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
            <div style={{ background: "white", borderRadius: 20, border: `1px solid ${C.goldBorder}`, padding: 20, boxShadow: "0 2px 8px rgba(0,4,53,0.08)" }}>
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
          <div style={{ background: "white", borderRadius: 20, border: `1px solid ${C.goldBorder}`, padding: 16, boxShadow: "0 2px 8px rgba(0,4,53,0.08)" }}>
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
  );
}
