import React, { useState } from "react";
import { Search, X, AlertCircle, FileText, Building2, Clock, AlertTriangle } from "lucide-react";
import { C, font } from "../utils/theme";
import BabyeyiCard from "../components/BabyeyiCard";
import Pagination from "../components/Pagination";
import SectorBreakdown from "../components/SectorBreakdown";
import DeoFilterToolbar from "../components/DeoFilterToolbar";

export default function ListTab({
  items, listLoad, listErr, loadList,
  filters, filterUpdate, onClearFilters, filterBar,
  page, setPage, pagination,
  deo, stats, switchTab, handleAction, setDetailId
}) {
  return (
    <div className="anim font-[Montserrat,sans-serif]">
      {filterBar && <DeoFilterToolbar {...filterBar} />}

      <div className="list-grid grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-6">
        <div className="flex min-w-0 flex-col gap-3.5">
          <div className="rounded-2xl border border-[#fde68a] bg-white p-4 shadow-[0_2px_12px_rgba(0,4,53,0.06)]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-700" />
              <input
                value={filters.search}
                onChange={(e) => filterUpdate('search', e.target.value)}
                placeholder="Search school, class, doc ID…"
                className="w-full rounded-xl border border-[#fde68a] bg-white py-2.5 pl-10 pr-3 text-[13px] text-[#000435] outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-400"
                style={{ fontFamily: font }}
              />
            </div>
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

          {(pagination.pages > 1 || pagination.total > 12) && (
            <Pagination
              current={page}
              total={pagination.pages || 1}
              totalItems={pagination.total || 0}
              pageSize={12}
              loading={listLoad}
              onChange={p => setPage(p)}
            />
          )}
        </div>

        {/* Right sidebar analytics */}
        <div className="flex flex-col gap-3.5 lg:sticky lg:top-4">
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
                { label: "All Babyeyi",   icon: FileText,      onClick: onClearFilters },
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
