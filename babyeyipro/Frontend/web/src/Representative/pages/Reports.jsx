import { useRef, useState } from 'react';
import {
  FileDown,
  FileSpreadsheet,
  FileText,
  Printer,
  Receipt,
  Users,
  AlertCircle,
  Building2,
  GraduationCap,
  Wallet,
  FileBarChart,
  Sparkles,
} from 'lucide-react';

const REPORT_DEFS = [
  {
    id: 'fee-collection',
    title: 'Fee Collection Report',
    description: 'Collections by school, channel, and period — reconciliation-ready for auditors.',
    icon: Receipt,
    accent: '#000435',
  },
  {
    id: 'payroll',
    title: 'Payroll Report',
    description: 'Gross, deductions, net pay, and statutory totals across the network.',
    icon: Users,
    accent: '#f59e0b',
  },
  {
    id: 'pending-fees',
    title: 'Pending Fees Report',
    description: 'Outstanding balances, ageing buckets, and follow-up priority lists.',
    icon: AlertCircle,
    accent: '#f43f5e',
  },
  {
    id: 'school-financial',
    title: 'School Financial Report',
    description: 'P&L-style snapshot per school with budget variance highlights.',
    icon: Building2,
    accent: '#10b981',
  },
  {
    id: 'student-payment',
    title: 'Student Payment Report',
    description: 'Line-level payments with invoice references and allocation status.',
    icon: GraduationCap,
    accent: '#6366f1',
  },
  {
    id: 'salary-payment',
    title: 'Salary Payment Report',
    description: 'Payslip batches, payment rails (bank / MoMo), and approval trail.',
    icon: Wallet,
    accent: '#14b8a6',
  },
];

export default function Reports() {
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const notify = (msg) => {
    setToast(msg);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 3200);
  };

  const handleExport = (kind) => {
    notify(`${kind} export queued — you will receive a download link when ready.`);
  };

  const handleReportRun = (title) => {
    notify(`“${title}” scheduled — PDF preview opens when generation completes.`);
  };

  return (
    <div className="animate-in fade-in duration-500 bg-[#f0f2f8] min-h-full pb-24">
      <div
        className="relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #000435 0%, #000320 60%, #00021a 100%)' }}
      >
        <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full border border-white/[0.04] pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-400/30 to-transparent" />
        <div className="relative z-10 px-4 sm:px-6 lg:px-8 pt-8 pb-14 max-w-[1600px] mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-4 h-0.5 rounded-full bg-amber-400" />
                <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-amber-400/80">
                  Finance · Compliance
                </span>
              </div>
              <h1
                className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight uppercase"
                style={{ fontFamily: "'Montserrat',sans-serif" }}
              >
                Reports &amp; Export Center
              </h1>
              <p className="text-sm text-white/55 mt-2 max-w-xl leading-relaxed">
                Audit-ready exports for MINEDUC, boards, and donors. Generate network-wide or per-school packs in one
                place.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-[11px] font-bold text-white/80 ring-1 ring-white/10">
                <Sparkles size={14} className="text-amber-400" aria-hidden />
                ISO-aligned naming
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 -mt-8 relative z-20 max-w-[1600px] mx-auto space-y-6">
        {toast && (
          <div
            role="status"
            className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] font-semibold text-emerald-900 shadow-sm"
          >
            {toast}
          </div>
        )}

        {/* Export dock */}
        <section className="rounded-2xl bg-white border border-black/10 shadow-[0_8px_40px_-16px_rgba(0,4,53,0.18)] overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#000435]/8 text-[#000435]">
                <FileBarChart size={22} strokeWidth={1.75} aria-hidden />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-900">Bulk export options</h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Choose a format — filters (date range, schools, currency) apply on the next step.
                </p>
              </div>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 sm:text-right">
              Very important for schools
            </p>
          </div>
          <div className="p-4 sm:p-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
            <button
              type="button"
              onClick={() => handleExport('PDF')}
              className="group flex flex-col items-start gap-3 rounded-2xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/80 p-4 text-left transition-all hover:border-amber-300/80 hover:shadow-md active:scale-[0.99]"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 ring-1 ring-rose-500/15">
                <FileText size={20} strokeWidth={1.75} />
              </span>
              <span className="text-[13px] font-black text-slate-900">PDF</span>
              <span className="text-[10px] font-semibold text-slate-500 leading-snug">Print-quality packs &amp; signatures</span>
            </button>
            <button
              type="button"
              onClick={() => handleExport('Excel')}
              className="group flex flex-col items-start gap-3 rounded-2xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/80 p-4 text-left transition-all hover:border-emerald-300/80 hover:shadow-md active:scale-[0.99]"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/15">
                <FileSpreadsheet size={20} strokeWidth={1.75} />
              </span>
              <span className="text-[13px] font-black text-slate-900">Excel</span>
              <span className="text-[10px] font-semibold text-slate-500 leading-snug">Pivot-ready worksheets</span>
            </button>
            <button
              type="button"
              onClick={() => handleExport('CSV')}
              className="group flex flex-col items-start gap-3 rounded-2xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/80 p-4 text-left transition-all hover:border-sky-300/80 hover:shadow-md active:scale-[0.99]"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10 text-sky-700 ring-1 ring-sky-500/15">
                <FileDown size={20} strokeWidth={1.75} />
              </span>
              <span className="text-[13px] font-black text-slate-900">CSV</span>
              <span className="text-[10px] font-semibold text-slate-500 leading-snug">ERP &amp; BI pipelines</span>
            </button>
            <button
              type="button"
              onClick={() => handleExport('Print')}
              className="group flex flex-col items-start gap-3 rounded-2xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/80 p-4 text-left transition-all hover:border-amber-300/80 hover:shadow-md active:scale-[0.99] col-span-2 lg:col-span-1"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-800 ring-1 ring-amber-400/25">
                <Printer size={20} strokeWidth={1.75} />
              </span>
              <span className="text-[13px] font-black text-slate-900">Print reports</span>
              <span className="text-[10px] font-semibold text-slate-500 leading-snug">Optimized A4 layout &amp; headers</span>
            </button>
          </div>
        </section>

        {/* Report catalog */}
        <section>
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <h2 className="text-sm font-black text-slate-900 tracking-tight">Standard reports</h2>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Tap run on mobile</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {REPORT_DEFS.map((r) => (
              <article
                key={r.id}
                className="flex flex-col rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_4px_24px_-12px_rgba(0,4,53,0.12)] transition-all hover:border-slate-300 hover:shadow-lg"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-inner ring-1 ring-black/5"
                    style={{ background: `linear-gradient(135deg, ${r.accent}, ${r.accent}cc)` }}
                  >
                    <r.icon size={22} strokeWidth={1.75} aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[14px] font-black text-slate-900 leading-snug">{r.title}</h3>
                    <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">{r.description}</p>
                  </div>
                </div>
                <div className="mt-auto pt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Est. size · 1–4 MB</span>
                  <button
                    type="button"
                    onClick={() => handleReportRun(r.title)}
                    className="inline-flex items-center justify-center rounded-xl bg-[#000435] px-4 py-2.5 text-[11px] font-black uppercase tracking-widest text-white shadow-sm ring-1 ring-white/10 hover:bg-[#00052a] active:scale-[0.98] transition-all w-full sm:w-auto"
                  >
                    Run report
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <footer className="rounded-2xl border border-dashed border-slate-300/80 bg-white/60 px-4 py-4 text-center text-[11px] font-semibold text-slate-500">
          Watermarked previews for external sharing · Full audit trail retained per your network policy (demo).
        </footer>
      </div>
    </div>
  );
}
