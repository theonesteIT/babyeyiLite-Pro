import React, { useState } from 'react';
import { ChevronDown, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';

/**
 * Modern export control — Excel + PDF with loading state.
 */
export default function PayrollExportBar({
  onExportExcel,
  onExportPdf,
  disabled = false,
  compact = false,
  className = '',
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState('');

  const run = async (kind, fn) => {
    if (!fn || busy) return;
    setBusy(kind);
    setOpen(false);
    try {
      await fn();
    } finally {
      setBusy('');
    }
  };

  const btnClass = compact
    ? 'h-9 px-3 rounded-xl border border-slate-200/90 bg-white text-[10px] font-bold uppercase tracking-wider text-[#1E3A5F] inline-flex items-center gap-1.5 hover:border-[#c87800]/40 hover:bg-amber-50/50 transition disabled:opacity-50'
    : 'h-10 px-4 rounded-xl border border-slate-200 bg-white text-[10px] font-bold uppercase tracking-wider text-[#000435] inline-flex items-center gap-2 shadow-sm hover:border-[#FEBF10]/50 hover:bg-amber-50/40 transition disabled:opacity-50';

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled || !!busy}
        onClick={() => setOpen((o) => !o)}
        className={btnClass}
      >
        {busy ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} style={{ color: '#FEBF10' }} />}
        <span>{busy ? 'Exporting…' : 'Export'}</span>
        <ChevronDown size={12} className={`transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <>
          <button type="button" className="fixed inset-0 z-[60] cursor-default" aria-label="Close export menu" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-[70] min-w-[11rem] rounded-2xl border border-slate-200 bg-white shadow-lg overflow-hidden py-1 animate-in fade-in slide-in-from-top-1 duration-150">
            <button
              type="button"
              onClick={() => run('excel', onExportExcel)}
              className="w-full text-left px-4 py-3 text-[11px] font-semibold text-slate-700 hover:bg-emerald-50 flex items-center gap-2.5 transition"
            >
              <FileSpreadsheet size={15} className="text-emerald-600 shrink-0" />
              <span>
                <span className="block uppercase tracking-wider text-[10px]">Excel</span>
                <span className="block text-[9px] text-slate-400 font-medium normal-case">.xlsx workbook</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => run('pdf', onExportPdf)}
              className="w-full text-left px-4 py-3 text-[11px] font-semibold text-slate-700 hover:bg-red-50 flex items-center gap-2.5 border-t border-slate-100 transition"
            >
              <FileText size={15} className="text-red-600 shrink-0" />
              <span>
                <span className="block uppercase tracking-wider text-[10px]">PDF</span>
                <span className="block text-[9px] text-slate-400 font-medium normal-case">Formatted report</span>
              </span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
