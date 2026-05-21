import React, { useState, useCallback, useEffect } from "react";
import { Building2, Search } from "lucide-react";
import { C, font, inp } from "../utils/theme";
import { apiFetch } from "../utils/api";
import Pagination from "../components/Pagination";
import Badge from "../components/Badge";

export default function SchoolsTab({ district }) {
  const [schools,    setSchools]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [page,       setPage]       = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });

  const load = useCallback((pg = 1, q = "") => {
    setLoading(true);
    const params = new URLSearchParams({ page: pg, limit: 12 });
    if (district) params.append("district", district);
    if (q) params.append("search", q);
    apiFetch(`/district/babyeyi/schools/list?${params}`)
      .then(r => { setSchools(r.data); setPagination(r.pagination); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [district]);

  useEffect(() => { load(1, ""); }, [load]);

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
                boxShadow: "0 2px 8px rgba(0,4,53,0.08)",
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
