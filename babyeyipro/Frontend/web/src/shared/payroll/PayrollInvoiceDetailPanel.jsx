import React from 'react';
import {
  X, Printer, Download, MessageCircle, Loader2, User, FileText,
  Banknote, TrendingDown, TrendingUp, AlertCircle, ChevronRight,
} from 'lucide-react';
import {
  downloadPayrollInvoicePdf,
  printPayrollInvoicePdf,
  sharePayrollInvoiceWhatsApp,
} from './exportPayrollInvoicePdf';

const fmt = (v) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Number(v) || 0);

const STATUS_CFG = {
  Pending: { cls: 'bg-amber-50 text-amber-800 border-amber-200', dot: 'bg-amber-500', label: 'Pending' },
  Approved: { cls: 'bg-blue-50 text-blue-800 border-blue-200', dot: 'bg-blue-500', label: 'Approved' },
  Rejected: { cls: 'bg-red-50 text-red-800 border-red-200', dot: 'bg-red-500', label: 'Rejected' },
  Paid: { cls: 'bg-emerald-50 text-emerald-800 border-emerald-200', dot: 'bg-emerald-500', label: 'Paid' },
};

function LineRow({ label, value, negative, highlight }) {
  return (
    <div className={`flex justify-between items-center py-2.5 ${highlight ? 'bg-[#000435]/5 -mx-3 px-3 rounded-xl' : 'border-b border-slate-100 last:border-0'}`}>
      <span className="text-[10px] font-medium text-slate-500 pr-3">{label}</span>
      <span className={`text-[11px] font-semibold tabular-nums shrink-0 ${negative ? 'text-red-600' : highlight ? 'text-[#000435]' : 'text-slate-800'}`}>
        {negative && value !== '—' ? `− ${value}` : value}
      </span>
    </div>
  );
}

function Section({ title, icon, children, accent = 'navy' }) {
  const iconCls = accent === 'amber' ? 'text-amber-600 bg-amber-50' : accent === 'red' ? 'text-red-600 bg-red-50' : 'text-[#000435] bg-[#000435]/8';
  return (
    <div className="rounded-2xl border border-slate-100 bg-white overflow-hidden shadow-sm">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2 bg-slate-50/80">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${iconCls}`}>{icon}</div>
        <p className="text-[9px] font-bold uppercase tracking-widest text-[#000435]">{title}</p>
      </div>
      <div className="px-4 py-1">{children}</div>
    </div>
  );
}

export default function PayrollInvoiceDetailPanel({
  row,
  invoice,
  breakdown,
  schoolName = 'School',
  staffPhone = '',
  loading = false,
  onClose,
  onPay,
  className = '',
}) {
  if (!row) return null;

  const cfg = STATUS_CFG[row.status] || STATUS_CFG.Pending;
  const pdfPayload = { schoolName, invoice, breakdown };

  const handlePrint = () => printPayrollInvoicePdf(pdfPayload);
  const handleDownload = () => downloadPayrollInvoicePdf(pdfPayload);
  const handleWhatsApp = () => sharePayrollInvoiceWhatsApp(pdfPayload, staffPhone);

  return (
    <div
      className={`flex h-full min-h-0 w-full flex-col bg-slate-50 ${className}`}
      aria-label="Payroll invoice details"
    >
      <div className="shrink-0 bg-[#000435] px-4 py-4 text-white">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[8px] font-bold uppercase tracking-[0.25em] text-[#FEBF10]/90">Payroll invoice</p>
            <p className="text-[13px] font-bold truncate mt-0.5">{invoice?.invoiceNo}</p>
            <p className="text-[10px] text-white/50 font-mono mt-0.5">{invoice?.payrollId}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-white/70 hover:bg-white/20 shrink-0"
            aria-label="Close panel"
          >
            <X size={16} />
          </button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest border ${cfg.cls}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
          </span>
          <span className="text-[9px] text-white/40 font-medium">{row.month} · {row.term} · {row.year}</span>
        </div>
      </div>

      <div className="shrink-0 px-3 py-3 flex gap-2 border-b border-slate-200 bg-white">
        <button
          type="button"
          onClick={handlePrint}
          disabled={loading}
          className="flex-1 h-10 rounded-xl border border-slate-200 bg-white text-[9px] font-bold uppercase tracking-wider text-[#000435] flex items-center justify-center gap-1.5 hover:bg-slate-50 disabled:opacity-50 transition"
        >
          <Printer size={14} /> Print
        </button>
        <button
          type="button"
          onClick={handleDownload}
          disabled={loading}
          className="flex-1 h-10 rounded-xl text-[9px] font-bold uppercase tracking-wider text-white flex items-center justify-center gap-1.5 disabled:opacity-50 transition shadow-sm"
          style={{ background: 'linear-gradient(135deg, #000435 0%, #0D2644 100%)' }}
        >
          <Download size={14} /> PDF
        </button>
        <button
          type="button"
          onClick={handleWhatsApp}
          disabled={loading}
          className="flex-1 h-10 rounded-xl bg-emerald-600 text-white text-[9px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 hover:bg-emerald-700 disabled:opacity-50 transition"
        >
          <MessageCircle size={14} /> Share
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {loading ? (
          <div className="py-16 flex flex-col items-center text-slate-400">
            <Loader2 size={24} className="animate-spin text-[#FEBF10] mb-3" />
            <p className="text-[10px] font-bold uppercase tracking-widest">Loading breakdown…</p>
          </div>
        ) : (
          <>
            <div className="rounded-2xl border border-slate-100 bg-white p-4 flex items-center gap-3 shadow-sm">
              <div className="w-11 h-11 rounded-full bg-[#000435]/8 flex items-center justify-center shrink-0">
                <User size={20} className="text-[#000435]/60" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-bold text-[#000435] truncate">{row.staffName}</p>
                <p className="text-[9px] font-mono text-slate-400 tracking-wider">{row.staffCode}</p>
                <p className="text-[9px] text-slate-500 font-medium mt-0.5">{row.role} · {row.department || '—'}</p>
              </div>
            </div>

            <div className="rounded-2xl bg-gradient-to-br from-[#000435] to-[#0D2644] p-4 text-white shadow-lg">
              <p className="text-[8px] font-bold uppercase tracking-widest text-white/50">Payment on this invoice</p>
              <p className="text-2xl font-bold tabular-nums mt-1">
                {fmt(row.amount)}
                <span className="text-[10px] font-semibold text-white/60 ml-1">RWF</span>
              </p>
              <p className="text-[9px] text-white/40 mt-2">Final payable for period: {fmt(breakdown?.finalPayable)} RWF</p>
            </div>

            <Section title="Basic salary" icon={<Banknote size={14} />}>
              <LineRow label="Basic salary" value={`${fmt(breakdown?.basic)} RWF`} highlight />
            </Section>

            <Section title="Allowances" icon={<TrendingUp size={14} />} accent="navy">
              {(breakdown?.allowanceLines || []).length ? (
                breakdown.allowanceLines.map((line) => (
                  <LineRow key={line.label} label={line.label} value={`${fmt(line.amount)} RWF`} />
                ))
              ) : (
                <LineRow label="Total allowances" value={`${fmt(breakdown?.allowancesTotal)} RWF`} />
              )}
              <div className="pt-1 pb-2">
                <LineRow label="Gross earnings" value={`${fmt(breakdown?.gross)} RWF`} highlight />
              </div>
            </Section>

            <Section title="Tax & deductions" icon={<TrendingDown size={14} />} accent="red">
              {(breakdown?.deductionLines || []).map((line) => (
                <LineRow key={line.label} label={line.label} value={`${fmt(line.amount)} RWF`} negative />
              ))}
              {!breakdown?.deductionLines?.length && (
                <LineRow label="Total deductions" value={`${fmt(breakdown?.deductionsTotal)} RWF`} negative />
              )}
            </Section>

            <Section title="Advance deductions" icon={<AlertCircle size={14} />} accent="amber">
              {(breakdown?.advanceLines || []).length ? (
                breakdown.advanceLines.map((line) => (
                  <LineRow key={line.label} label={line.label} value={`${fmt(line.amount)} RWF`} negative />
                ))
              ) : breakdown?.advanceApplied > 0 ? (
                <LineRow label="Advance repayment" value={`${fmt(breakdown.advanceApplied)} RWF`} negative />
              ) : (
                <p className="text-[10px] text-slate-400 py-3 text-center">No active advance deduction</p>
              )}
              {breakdown?.advanceOutstanding > 0 && (
                <p className="text-[9px] text-amber-700 bg-amber-50 rounded-lg px-2 py-1.5 mb-2 font-medium">
                  Outstanding advance balance: {fmt(breakdown.advanceOutstanding)} RWF
                </p>
              )}
            </Section>

            <Section title="Summary" icon={<FileText size={14} />}>
              <LineRow label="Net salary" value={`${fmt(breakdown?.netSalary)} RWF`} />
              <LineRow label="Advance applied" value={`${fmt(breakdown?.advanceApplied)} RWF`} negative />
              <LineRow label="Final payable" value={`${fmt(breakdown?.finalPayable)} RWF`} />
              <LineRow label="This payment" value={`${fmt(row.amount)} RWF`} highlight />
            </Section>

            {(row.submittedBy || row.approvedBy || row.paidBy) && (
              <div className="rounded-xl border border-slate-100 bg-white px-4 py-3 text-[9px] text-slate-500 space-y-1">
                {row.submittedBy && <p><span className="font-bold text-slate-400">Submitted:</span> {row.submittedBy}</p>}
                {row.approvedBy && <p><span className="font-bold text-slate-400">Approved:</span> {row.approvedBy}</p>}
                {row.paidBy && <p><span className="font-bold text-slate-400">Paid:</span> {row.paidBy}</p>}
              </div>
            )}
          </>
        )}
      </div>

      {row.status === 'Approved' && onPay && (
        <div className="shrink-0 p-3 border-t border-slate-200 bg-white">
          <button
            type="button"
            onClick={() => onPay(row)}
            className="w-full h-11 rounded-xl bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-emerald-700 transition"
          >
            Process payment <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
