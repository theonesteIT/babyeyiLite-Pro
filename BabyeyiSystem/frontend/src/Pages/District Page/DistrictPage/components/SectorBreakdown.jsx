import React from "react";
import { BarChart2 } from "lucide-react";

export default function SectorBreakdown({ sectors }) {
  if (!sectors?.length) return null;
  const max = Math.max(...sectors.map(s => Number(s.total)), 1);

  return (
    <div className="bg-white rounded-[20px] border border-deo-amber-border p-5 shadow-[0_2px_8px_rgba(0,4,53,0.08)]">
      <div className="flex items-center gap-2 mb-4">
        <BarChart2 className="w-4 h-4 text-deo-amber-dark"/>
        <h3 className="font-black text-deo-navy text-[13px] m-0">By Sector</h3>
      </div>
      <div className="flex flex-col gap-3">
        {sectors.slice(0, 8).map((s, i) => (
          <div key={i}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-deo-navy-mid">{s.sector}</span>
              <span className="text-xs font-black text-deo-navy">{s.total}</span>
            </div>
            <div className="h-1.5 bg-deo-amber-bg rounded-[3px] overflow-hidden">
              <div className="h-full rounded-[3px] bg-gradient-to-r from-deo-navy to-deo-amber transition-all duration-700 ease-in-out" style={{ width: `${(Number(s.total) / max) * 100}%` }}/>
            </div>
            <div className="flex gap-3 mt-0.5">
              <span className="text-[9px] text-deo-emerald-dark font-semibold">{s.approved} approved</span>
              <span className="text-[9px] text-[#92400e] font-semibold">{s.pending} pending</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
