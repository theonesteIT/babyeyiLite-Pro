import React from "react";
import { CheckCircle, XCircle, AlertCircle, Info, X } from "lucide-react";

export default function Toast({ toasts, remove }) {
  return (
    <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none max-w-[calc(100vw-2rem)]">
      {toasts.map(t => {
        const s = {
          success: { bgClass: "bg-deo-emerald-bg", borderClass: "border-deo-emerald-border", textClass: "text-deo-emerald-dark", icon: <CheckCircle className="w-4 h-4 text-deo-emerald"/> },
          error:   { bgClass: "bg-deo-red-50",     borderClass: "border-deo-red-border",   textClass: "text-deo-red-700",      icon: <XCircle     className="w-4 h-4 text-deo-red"/> },
          warning: { bgClass: "bg-deo-amber-bg",   borderClass: "border-deo-amber-border",   textClass: "text-[#92400e]",      icon: <AlertCircle className="w-4 h-4 text-deo-amber"/> },
        }[t.type] || { bgClass: "bg-white", borderClass: "border-deo-amber-border", textClass: "text-deo-amber-dark", icon: <Info className="w-4 h-4 text-deo-amber-dark"/> };
        
        return (
          <div key={t.id} className={`pointer-events-auto flex items-start gap-2.5 px-3.5 py-3 rounded-2xl shadow-[0_4px_20px_rgba(26,18,0,0.15)] border w-[300px] ${s.bgClass} ${s.borderClass}`}>
            <div className="mt-px shrink-0">{s.icon}</div>
            <p className={`flex-1 text-xs font-semibold leading-relaxed m-0 ${s.textClass}`}>{t.message}</p>
            <button onClick={() => remove(t.id)} className={`opacity-50 bg-transparent border-none cursor-pointer p-0 hover:opacity-100 transition-opacity ${s.textClass}`}>
              <X className="w-3.5 h-3.5"/>
            </button>
          </div>
        );
      })}
    </div>
  );
}
