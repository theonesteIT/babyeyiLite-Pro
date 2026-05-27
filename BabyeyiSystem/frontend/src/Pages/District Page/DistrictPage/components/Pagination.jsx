import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Pagination({ current, total, onChange }) {
  if (total <= 1) return null;
  const count = Math.min(total, 7);
  const start = total <= 7 ? 1 : current <= 4 ? 1 : current >= total - 3 ? total - 6 : current - 3;

  return (
    <div className="flex items-center justify-center gap-2">
      <button onClick={() => onChange(current - 1)} disabled={current === 1} 
        className={`w-9 h-9 rounded-xl border border-deo-amber-border bg-white flex items-center justify-center transition-all duration-150 ${current === 1 ? 'cursor-not-allowed opacity-40' : 'cursor-pointer hover:bg-deo-amber-bg'}`}>
        <ChevronLeft className="w-4 h-4 text-deo-amber-dark"/>
      </button>

      {Array.from({ length: count }, (_, i) => {
        const page = start + i;
        const isActive = page === current;
        return (
          <button key={page} onClick={() => onChange(page)} 
            className={`w-9 h-9 rounded-xl text-[13px] font-bold border transition-all duration-150 cursor-pointer ${isActive ? 'bg-deo-navy border-deo-navy text-deo-amber shadow-[0_4px_12px_rgba(26,18,0,0.2)]' : 'bg-white border-deo-amber-border text-deo-amber-dark hover:bg-deo-amber-bg'}`}>
            {page}
          </button>
        );
      })}

      <button onClick={() => onChange(current + 1)} disabled={current === total} 
        className={`w-9 h-9 rounded-xl border border-deo-amber-border bg-white flex items-center justify-center transition-all duration-150 ${current === total ? 'cursor-not-allowed opacity-40' : 'cursor-pointer hover:bg-deo-amber-bg'}`}>
        <ChevronRight className="w-4 h-4 text-deo-amber-dark"/>
      </button>
    </div>
  );
}
