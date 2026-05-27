import React from "react";
import { Loader2 } from "lucide-react";

export default function StatCard({ icon: Icon, label, value, sub, color = "gold", alert, loading, onClick }) {
  const bgClass = {
    gold:    "bg-gradient-to-br from-deo-navy to-deo-navy-mid",
    emerald: "bg-gradient-to-br from-deo-navy-mid to-deo-navy",
    amber:   "bg-gradient-to-br from-deo-amber-dark to-deo-amber",
    red:     "bg-gradient-to-br from-deo-amber-dark to-deo-amber",
    blue:    "bg-gradient-to-br from-deo-navy to-deo-navy-mid",
    violet:  "bg-gradient-to-br from-deo-amber-dark to-deo-amber",
  }[color] || "bg-gradient-to-br from-deo-navy to-deo-navy-mid";

  return (
    <div
      onClick={onClick}
      className={`${bgClass} rounded-[20px] px-4 py-3.5 shadow-[0_4px_16px_rgba(26,18,0,0.18)] relative overflow-hidden transition-transform duration-150 ${onClick ? 'cursor-pointer hover:scale-102' : 'cursor-default'}`}
    >
      {/* Shine */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at 80% 20%,white 0%,transparent 60%)" }}/>
      
      <div className="relative">
        <div className="flex items-start justify-between mb-2">
          <div className="p-2 rounded-xl bg-white/20 flex items-center justify-center">
            <Icon className="w-4.5 h-4.5 text-white"/>
          </div>
          <div className="flex gap-1.5">
            {alert && (
              <span className="text-[9px] font-black bg-white/30 text-white px-1.5 py-0.5 rounded-full animate-pulse">
                !
              </span>
            )}
            {loading && <Loader2 className="w-3.5 h-3.5 text-white/60 animate-spin"/>}
          </div>
        </div>
        <div className="text-[26px] font-black text-white mb-0.5">
          {loading
            ? <span className="inline-block w-12 h-7 bg-white/20 rounded-md"/>
            : (value ?? "—")}
        </div>
        <div className="text-[11px] font-semibold text-white/80">{label}</div>
        {sub && <div className="text-[10px] text-white/55 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}
