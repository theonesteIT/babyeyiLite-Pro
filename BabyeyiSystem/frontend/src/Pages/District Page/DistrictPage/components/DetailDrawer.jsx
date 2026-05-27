import React, { useState, useEffect } from "react";
import { FileText, Eye, X, Loader2, PenLine, Stamp, FileImage, FileCheck, ThumbsUp, ThumbsDown, Send, Check } from "lucide-react";
import { st } from "../utils/theme";
import { fmt, resolveUrl } from "../utils/helpers";
import Badge from "./Badge";
import DocViewerModal from "./DocViewerModal";
import { apiFetch } from "../utils/api";

export default function DetailDrawer({ id, onClose, onAction }) {
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

  const DocBtn = ({ path, name, label, icon: Icon = FileText, textClass = "text-deo-amber-dark", bgClass = "bg-white", borderClass = "border-deo-amber-border" }) => {
    const url = resolveUrl(path);
    if (!url) return (
      <div className="flex items-center gap-2 p-3 bg-deo-slate-100 border border-dashed border-deo-slate-200 rounded-xl">
        <Icon className="w-3.5 h-3.5 text-deo-slate-400 shrink-0"/>
        <span className="text-[11px] text-deo-slate-400 font-semibold">{label} — Not uploaded</span>
      </div>
    );
    return (
      <button onClick={() => setDocView({ url, title: name || label })} className={`flex items-center gap-2.5 p-3 rounded-xl border ${borderClass} ${bgClass} cursor-pointer w-full text-left transition-all duration-150`}>
        <div className={`w-8 h-8 rounded-lg bg-white border ${borderClass} flex items-center justify-center shrink-0`}>
          <Icon className={`w-4 h-4 ${textClass}`}/>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-deo-navy m-0 mb-px overflow-hidden text-ellipsis whitespace-nowrap">{label}</p>
          <p className="text-[10px] text-deo-amber-dark m-0 overflow-hidden text-ellipsis whitespace-nowrap">{name || "Click to view"}</p>
        </div>
        <Eye className={`w-3.5 h-3.5 shrink-0 ${textClass}`}/>
      </button>
    );
  };

  return (
    <>
      {docView && <DocViewerModal url={docView.url} title={docView.title} onClose={() => setDocView(null)}/>}

      <div className="fixed inset-0 z-40 flex">
        <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={onClose}/>
        <div className="w-full max-w-[480px] bg-white shadow-[-4px_0_32px_rgba(26,18,0,0.15)] flex flex-col overflow-hidden border-l border-deo-amber-border">
          {/* Drawer header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-deo-amber-border bg-white shrink-0">
            <div className="flex-1 min-w-0">
              <h3 className="font-black text-deo-navy text-sm m-0 mb-0.5 overflow-hidden text-ellipsis whitespace-nowrap">
                {data?.school_name || "Loading…"}
              </h3>
              <p className="text-[10px] text-deo-amber-dark m-0">{data?.doc_id || `#${id}`}</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl bg-transparent border-none cursor-pointer text-deo-amber-dark flex">
              <X className="w-4.5 h-4.5"/>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
            {loading && (
              <div className="flex justify-center items-center h-40">
                <Loader2 className="w-8 h-8 text-deo-amber animate-spin"/>
              </div>
            )}
            {err && (
              <div className="p-3.5 bg-deo-red-50 border border-deo-red-border rounded-2xl text-[13px] text-deo-red-700">
                {err}
              </div>
            )}

            {data && !loading && (
              <>
                {/* Info grid */}
                <div className="grid grid-cols-2 gap-2.5">
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
                    <div key={l} className="bg-white border border-deo-amber-border rounded-xl p-3">
                      <p className="text-[9px] text-deo-amber-dark font-black uppercase tracking-wider m-0 mb-1">{l}</p>
                      <p className="text-[13px] font-bold text-deo-navy m-0">{v || "—"}</p>
                    </div>
                  ))}
                </div>

                {/* Payments */}
                {(data.payments || []).filter(p => p.name && p.amount).length > 0 && (
                  <div className="bg-white border border-deo-amber-border rounded-2xl overflow-hidden">
                    <div className="px-4 py-2.5 bg-white border-b border-deo-amber-border">
                      <p className="text-[10px] font-black text-deo-amber-dark uppercase tracking-wider m-0">
                        Payment Breakdown
                      </p>
                    </div>
                    {data.payments.filter(p => p.name && p.amount).map((p, i) => (
                      <div key={i} className={`flex items-center justify-between px-4 py-2.5 ${i % 2 ? 'bg-deo-amber-bg' : 'bg-white'}`}>
                        <span className="text-[13px] text-deo-navy-mid">{p.name}</span>
                        <span className="text-[13px] font-bold text-deo-navy">RWF {fmt(p.amount)}</span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between px-4 py-3 bg-deo-grad-navy">
                      <span className="text-[13px] font-black text-deo-amber">TOTAL</span>
                      <span className="text-[13px] font-black text-deo-amber">RWF {fmt(data.total_fee)}</span>
                    </div>
                  </div>
                )}

                {/* School-submitted documents — review before approve/reject/send to NESA */}
                {ir && (
                  <div className="bg-gradient-to-br from-[#f5f3ff] to-[#eff6ff] border-2 border-deo-amber-border rounded-2xl p-3.5">
                    <p className="text-[10px] font-black text-deo-amber uppercase tracking-wider m-0 mb-1.5">
                      📄 Documents submitted by school
                    </p>
                    <p className="text-[11px] text-deo-navy-mid m-0 mb-3 leading-relaxed">
                      Review the Parent Representative Document and School Budget below before you Approve, Reject, or Send to NESA.
                    </p>
                    <div className="flex flex-col gap-2">
                      <DocBtn path={ir.parent_rep_doc_path} name={ir.parent_rep_doc_name} label="Parents Representative Document" icon={FileImage} textClass="text-deo-amber" bgClass="bg-deo-amber-bg" borderClass="border-deo-amber-border"/>
                      <DocBtn path={ir.budget_doc_path}     name={ir.budget_doc_name}     label="School Budget / Service Plan"    icon={FileCheck} textClass="text-deo-navy"   bgClass="bg-deo-blue-bg"   borderClass="border-deo-blue-border"/>
                    </div>

                    {(ir.deo_signature_path || ir.deo_stamp_path) && (
                      <div className="mt-3">
                        <p className="text-[10px] font-black text-deo-emerald-dark uppercase tracking-wider m-0 mb-2">
                          ✅ DEO Authorization
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {ir.deo_signature_path && (
                            <button onClick={() => setDocView({ url: resolveUrl(ir.deo_signature_path), title: "DEO Signature" })} className="flex flex-col items-center gap-1.5 p-3 bg-deo-emerald-bg border border-deo-emerald-border rounded-xl cursor-pointer">
                              <PenLine className="w-4.5 h-4.5 text-deo-emerald"/>
                              <span className="text-[10px] font-bold text-deo-emerald-dark">DEO Signature</span>
                            </button>
                          )}
                          {ir.deo_stamp_path && (
                            <button onClick={() => setDocView({ url: resolveUrl(ir.deo_stamp_path), title: "DEO Stamp" })} className="flex flex-col items-center gap-1.5 p-3 bg-deo-emerald-bg border border-deo-emerald-border rounded-xl cursor-pointer">
                              <Stamp className="w-4.5 h-4.5 text-deo-emerald"/>
                              <span className="text-[10px] font-bold text-deo-emerald-dark">DEO Stamp</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Increase request info */}
                {ir && (
                  <div className="bg-deo-amber-bg border border-deo-amber-border rounded-2xl p-3.5">
                    <p className="text-[11px] font-black text-[#92400e] uppercase tracking-wider m-0 mb-2">
                      Increase Request
                    </p>
                    <p className="text-[13px] text-[#92400e] m-0 mb-2.5">{ir.reason || "No reason provided"}</p>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <Badge status={ir.nesa_status}/>
                      <span className="text-xs text-[#92400e] font-bold">
                        Over by: RWF {fmt(Number(ir.requested_amount) - Number(ir.current_limit))}
                      </span>
                    </div>
                    {ir.deo_notes && (
                      <p className="text-[11px] text-[#1d4ed8] mt-2 italic border-t border-deo-amber-border pt-2">
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
                <div className="flex gap-2 pt-1">
                  {data.status !== "approved" && (
                    <button onClick={() => { onAction("approve", data); onClose(); }} className="flex-1 py-3 bg-deo-emerald text-white rounded-[14px] text-[13px] font-bold border-none cursor-pointer flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(16,185,129,0.3)]">
                      <ThumbsUp className="w-4 h-4"/> Approve
                    </button>
                  )}
                  {data.status !== "rejected" && (
                    <button onClick={() => { onAction("reject", data); onClose(); }} className="flex-1 py-3 bg-deo-red text-white rounded-[14px] text-[13px] font-bold border-none cursor-pointer flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(239,68,68,0.3)]">
                      <ThumbsDown className="w-4 h-4"/> Reject
                    </button>
                  )}
                  {(data.exceeds_limit === 1 || data.exceeds_limit === true) &&
                   (ir?.nesa_status || ir?.status || "") !== "recommended" && (
                    <button onClick={() => { onAction("recommend", data); onClose(); }} className="flex-1 py-3 bg-[#1d4ed8] text-white rounded-[14px] text-[13px] font-bold border-none cursor-pointer flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(59,130,246,0.3)]">
                      <Send className="w-4 h-4"/> Send to NESA
                    </button>
                  )}
                  {(data.exceeds_limit === 1 || data.exceeds_limit === true) &&
                   (ir?.nesa_status || ir?.status || "") === "recommended" && (
                    <div className="flex-1 py-3 rounded-[14px] text-xs font-black text-[#1d4ed8] bg-deo-blue-bg border border-deo-blue-border flex items-center justify-center gap-2">
                      <Check className="w-3.5 h-3.5"/> Sent to NESA
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
