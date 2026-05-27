import React from "react";
import { AlertCircle, TrendingUp, RefreshCw, Building2, FileImage, FileCheck, PenLine, Stamp, ThumbsUp, Send, ThumbsDown, Check, CheckCircle, XCircle } from "lucide-react";
import { C, font } from "../utils/theme";
import { fmt, fmtDate, resolveUrl } from "../utils/helpers";

export default function RequestsTab({ requests, reqLoad, reqErr, reqFilter, setReqFilter, loadRequests, deo, handleAction }) {
  const statusFilters = [
    { key: "", label: "All",         color: C.goldDark,     bg: C.goldBgMid,   border: C.goldBorder },
    { key: "pending",     label: "Pending",     color: "#92400e",     bg: C.amberBg,     border: C.amberBord  },
    { key: "recommended", label: "Sent to NESA",color: C.blue700,     bg: C.blueBg,      border: C.blueBord   },
    { key: "approved",    label: "Approved",    color: C.emeraldDark, bg: C.emeraldBg,   border: C.emeraldBord},
    { key: "rejected",    label: "Rejected",    color: C.red800,      bg: C.red50,       border: C.redBorder  },
  ];

  const filtered = reqFilter ? requests.filter(r => (r.nesa_status || r.status || "") === reqFilter) : requests;

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

      {reqLoad && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{ height: 160, background: "white", borderRadius: 20, border: `1px solid ${C.goldBorder}`, animation: "pulse 1.5s infinite" }}/>
          ))}
        </div>
      )}

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

      {!reqLoad && !reqErr && requests.length > 0 && filtered.length === 0 && (
        <div style={{ background: "white", border: `1px solid ${C.goldBorder}`, borderRadius: 20, padding: "32px 24px", textAlign: "center" }}>
          <p style={{ color: C.goldDark, fontWeight: 700, fontFamily: font }}>No {reqFilter} requests found</p>
        </div>
      )}

      {!reqLoad && !reqErr && filtered.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {filtered.map(req => {
            const status = req.nesa_status || req.status || "pending";
            const reqSt = {
              pending:     { bg: C.amberBg,   border: C.amberBord,   text: "#92400e",      label: "Pending Action" },
              recommended: { bg: C.blueBg,    border: C.blueBord,    text: C.blue700,      label: "Sent to NESA"   },
              approved:    { bg: C.emeraldBg, border: C.emeraldBord, text: C.emeraldDark,  label: "Approved"       },
              rejected:    { bg: C.red50,     border: C.redBorder,   text: C.red800,       label: "Rejected"       },
            }[status] || { bg: C.goldBg, border: C.goldBorder, text: C.goldDark, label: status };

            const overAmount = Math.max(0, Number(req.total_fee) - Number(req.nesa_limit));
            const actionId = req.babyeyi_id || req.id;

            return (
              <div key={req.id} style={{
                background: "white", border: `2px solid ${reqSt.border}`,
                borderRadius: 22, overflow: "hidden",
                boxShadow: "0 2px 12px rgba(26,18,0,0.06)",
                fontFamily: font, transition: "all 150ms",
              }}>
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
                  <p style={{ fontSize: 13, color: C.darkMid, margin: "0 0 14px", lineHeight: 1.6, borderLeft: `3px solid ${C.goldBorder}`, paddingLeft: 12 }}>
                    {req.reason || "No reason provided"}
                  </p>

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

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
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
}
