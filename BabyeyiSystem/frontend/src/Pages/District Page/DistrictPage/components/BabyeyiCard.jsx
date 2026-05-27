import React from "react";
import { AlertTriangle, Check, Send, Eye, ThumbsUp, ThumbsDown } from "lucide-react";
import { st } from "../utils/theme";
import { fmt, fmtDate } from "../utils/helpers";
import Badge from "./Badge";

export default function BabyeyiCard({ item, onAction, onView }) {
  const s       = st(item.status);
  const Icon    = s.icon;
  const exceeds = item.exceeds_limit === 1 || item.exceeds_limit === true;
  // Normalize: backend may return nesa_status or request_status depending on join
  const nesaStatus = item.nesa_status || item.request_status || "";
  const isSentToNesa = nesaStatus === "recommended";

  const borderClass = exceeds ? "border-deo-amber-border"
    : item.status === "approved" ? "border-deo-emerald-border"
    : item.status === "rejected" ? "border-deo-red-border"
    : "border-deo-amber-border";

  return (
    <div className={`bg-white border-2 ${borderClass} rounded-[20px] p-4 transition-all duration-150 shadow-[0_2px_8px_rgba(0,4,53,0.08)]`}>
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-[14px] shrink-0 flex items-center justify-center border-2 ${s.bgClass} ${s.borderClass}`}>
          <Icon className={`w-5 h-5 ${s.textClass}`}/>
        </div>

        <div className="flex-1 min-w-0">
          {/* Top row */}
          <div className="flex items-start justify-between gap-2 mb-1.5 flex-wrap">
            <div className="min-w-0">
              <p className="font-black text-deo-navy text-sm m-0 mb-0.5 overflow-hidden text-ellipsis whitespace-nowrap">
                {item.school_name || "Unknown School"}
              </p>
              <p className="text-[10px] text-deo-amber-dark m-0">
                {item.school_sector || "—"} · {item.doc_id || `#${item.id}`}
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
              {exceeds && (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-deo-amber-bg border border-deo-amber-border rounded-full text-[9px] font-black text-[#92400e] uppercase tracking-wider animate-pulse">
                  <AlertTriangle className="w-2.5 h-2.5"/> Exceeds
                </span>
              )}
              <Badge status={item.status}/>
            </div>
          </div>

          {/* Tags */}
          <div className="flex items-center flex-wrap gap-1 mb-2.5">
            {[item.class, item.term, item.academic_year, item.level, item.category].filter(Boolean).map((v, i) => (
              <span key={i} className="text-[10px] font-semibold text-deo-amber-dark bg-white px-2 py-0.5 rounded-lg border border-deo-amber-border">
                {v}
              </span>
            ))}
            <span className="text-xs font-black text-deo-navy ml-auto">
              RWF {fmt(item.total_fee)}
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center flex-wrap gap-0.5 pt-2.5 border-t border-deo-amber-border">
            {[
              { label: "View",    onClick: () => onView(item),             show: true,                         color: "text-deo-amber-dark",    icon: Eye      },
              { label: "Approve", onClick: () => onAction("approve", item), show: item.status !== "approved",  color: "text-deo-emerald-dark", icon: ThumbsUp },
              { label: "Reject",  onClick: () => onAction("reject",  item), show: item.status !== "rejected",  color: "text-deo-red-800",      icon: ThumbsDown},
            ].filter(b => b.show).map(({ label, onClick, color, icon: BIcon }) => (
              <button key={label} onClick={onClick} className={`flex items-center gap-1.5 text-[11px] font-bold ${color} px-2.5 py-1.5 rounded-lg bg-transparent border-none cursor-pointer transition-colors duration-150 hover:bg-white`}>
                <BIcon className="w-3.5 h-3.5"/> {label}
              </button>
            ))}

            {exceeds && !isSentToNesa && (
              <button onClick={() => onAction("recommend", item)} className="flex items-center gap-1.5 text-[11px] font-bold text-white px-3 py-1.5 rounded-lg bg-deo-navy border-none cursor-pointer ml-auto shadow-[0_2px_8px_rgba(59,130,246,0.3)]">
                <Send className="w-3.5 h-3.5"/> → NESA
              </button>
            )}
            {isSentToNesa && (
              <span className="flex items-center gap-1.5 text-[10px] font-black text-deo-navy ml-auto px-2.5 py-1 rounded-lg bg-deo-blue-bg border border-deo-blue-border">
                <Check className="w-3.5 h-3.5"/> Sent to NESA
              </span>
            )}

            <span className="text-[10px] text-deo-amber-border ml-auto">{fmtDate(item.created_at)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
