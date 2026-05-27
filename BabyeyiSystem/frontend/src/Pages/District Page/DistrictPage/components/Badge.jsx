import React from "react";

export default function Badge({ status }) {
  const map = {
    approved:    { bgClass: "bg-deo-emerald-bg", textClass: "text-deo-emerald-dark", borderClass: "border-deo-emerald-border" },
    rejected:    { bgClass: "bg-deo-red-50",     textClass: "text-deo-red-800",      borderClass: "border-deo-red-border"   },
    pending:     { bgClass: "bg-deo-amber-bg",   textClass: "text-[#92400e]",        borderClass: "border-deo-amber-border"   },
    recommended: { bgClass: "bg-deo-blue-bg",    textClass: "text-[#1d4ed8]",        borderClass: "border-deo-blue-border"    },
    draft:       { bgClass: "bg-deo-slate-100",  textClass: "text-deo-slate-500",    borderClass: "border-deo-slate-200"    },
  };
  const s = map[status?.toLowerCase()] || { bgClass: "bg-white", textClass: "text-deo-amber-dark", borderClass: "border-deo-amber-border" };
  const label = status?.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) || "—";
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-[11px] font-bold border ${s.bgClass} ${s.textClass} ${s.borderClass}`}>
      {label}
    </span>
  );
}
