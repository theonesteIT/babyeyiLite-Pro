import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Loader2, Eye, Download, Receipt, Building2, Globe, AlertCircle,
} from 'lucide-react';
import api from '../services/api';
import {
  formatMoneyRWF,
  formatReceiptDate,
  openAuthenticatedPdf,
  downloadHistoryItemPdf,
  printFeePaymentReceiptPdf,
  buildReceiptViewModel,
} from '../utils/feePaymentReceipt';

function statusClass(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'paid') return 'bg-emerald-50 text-emerald-700 border-emerald-100';
  if (s === 'partial') return 'bg-amber-50 text-amber-800 border-amber-100';
  return 'bg-slate-100 text-slate-600 border-slate-200';
}

export default function InvoiceHistoryModal({
  isOpen,
  onClose,
  student,
  academicYear,
  term,
  schoolName,
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const [busyKey, setBusyKey] = useState('');

  const studentId = student?.student_id || student?.id;

  const load = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/accountant/students/${studentId}/payment-history`, {
        params: { academic_year: academicYear, term },
      });
      if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load history');
      setData(res.data.data || null);
    } catch (e) {
      setData(null);
      setError(e?.response?.data?.message || e.message || 'Could not load payment history');
    } finally {
      setLoading(false);
    }
  }, [studentId, academicYear, term]);

  useEffect(() => {
    if (!isOpen) return;
    load();
  }, [isOpen, load]);

  const handleView = async (item) => {
    if (!item) return;
    setBusyKey(`${item.key}:view`);
    try {
      if (item.source === 'online') {
        const viewPath =
          item.status === 'paid' && item.receipt_pdf_url
            ? item.receipt_pdf_url
            : item.invoice_pdf_url || item.view_url;
        if (viewPath) await openAuthenticatedPdf(api, viewPath);
      } else if (item.source === 'manual' && item.raw) {
        printFeePaymentReceiptPdf(
          buildReceiptViewModel(item.raw, {
            studentName: student?.name,
            studentCode: student?.id,
            className: student?.class,
            academicYear,
            term,
            schoolName: data?.student?.school_name || schoolName,
          })
        );
      }
    } finally {
      setBusyKey('');
    }
  };

  const handleDownload = async (item) => {
    if (!item) return;
    setBusyKey(`${item.key}:dl`);
    try {
      await downloadHistoryItemPdf(item, {
        studentName: student?.name,
        studentCode: student?.id,
        className: student?.class,
        academicYear,
        term,
        schoolName: data?.student?.school_name || schoolName,
      }, api);
    } finally {
      setBusyKey('');
    }
  };

  if (!isOpen) return null;

  const items = data?.items || [];
  const summary = data?.summary || {};

  return createPortal(
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => onClose?.()} />
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-white rounded-[28px] border border-black/10 shadow-2xl flex flex-col overflow-hidden">
        <div
          className="px-6 py-5 text-white shrink-0"
          style={{ background: 'linear-gradient(135deg, #000435 0%, #0D2644 100%)' }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-amber-300/90">Invoice history</p>
              <h3 className="text-lg font-bold mt-1">{student?.name || 'Student'}</h3>
              <p className="text-[11px] text-white/70 mt-1">
                {academicYear} · {term} · Manual + online public pay
              </p>
            </div>
            <button type="button" onClick={() => onClose?.()} className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="px-6 py-4 border-b border-black/5 bg-slate-50/80 grid grid-cols-2 sm:grid-cols-4 gap-2 shrink-0">
          {[
            { label: 'Total', value: summary.total_items ?? 0 },
            { label: 'At school', value: summary.manual_count ?? 0 },
            { label: 'Online paid', value: summary.online_paid ?? 0 },
            { label: 'Waiting', value: summary.online_waiting ?? 0 },
          ].map((s) => (
            <div key={s.label} className="rounded-xl bg-white border border-black/5 px-3 py-2 text-center">
              <p className="text-[8px] font-bold uppercase tracking-widest text-slate-400">{s.label}</p>
              <p className="text-lg font-bold text-[#000435]">{s.value}</p>
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="animate-spin text-[#000435]" size={28} />
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Loading payments…</p>
            </div>
          ) : error ? (
            <div className="rounded-2xl bg-red-50 border border-red-100 p-4 flex gap-2">
              <AlertCircle size={18} className="text-red-500 shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          ) : items.length === 0 ? (
            <p className="text-center py-12 text-[11px] font-bold uppercase tracking-widest text-slate-400">
              No payments for this term
            </p>
          ) : (
            <div className="space-y-3">
              {items.map((item) => {
                const busy = busyKey.startsWith(item.key);
                const Icon = item.source === 'online' ? Globe : Building2;
                return (
                  <div
                    key={item.key}
                    className="rounded-2xl border border-black/5 bg-white p-4 hover:border-[#000435]/15 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-slate-50 border border-black/5 flex items-center justify-center shrink-0">
                          <Icon size={16} className="text-[#000435]" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-bold text-[#000435]">{formatMoneyRWF(item.amount)}</p>
                            <span className={`text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${statusClass(item.status)}`}>
                              {item.status_label}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-1">{item.source_label} · {item.channel}</p>
                          <p className="text-[10px] font-mono text-slate-400 mt-0.5 truncate">
                            {item.reference} · {formatReceiptDate(item.date)}
                          </p>
                          {item.paid_by ? (
                            <p className="text-[10px] text-slate-500 mt-1">Paid by: {item.paid_by}</p>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5 shrink-0">
                        <button
                          type="button"
                          disabled={busy || !item.can_view}
                          onClick={() => handleView(item)}
                          className="h-8 px-3 rounded-lg border border-black/10 text-[9px] font-bold uppercase tracking-widest text-[#000435] hover:bg-slate-50 inline-flex items-center gap-1.5 disabled:opacity-40"
                        >
                          <Eye size={12} />
                          View
                        </button>
                        <button
                          type="button"
                          disabled={busy || !item.can_download}
                          onClick={() => handleDownload(item)}
                          className="h-8 px-3 rounded-lg border border-black/10 text-[9px] font-bold uppercase tracking-widest text-[#000435] hover:bg-slate-50 inline-flex items-center gap-1.5 disabled:opacity-40"
                        >
                          <Download size={12} />
                          PDF
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-black/5 flex justify-end shrink-0">
          <button
            type="button"
            onClick={() => onClose?.()}
            className="h-10 px-5 rounded-xl border border-black/10 text-[10px] font-bold uppercase tracking-widest text-[#000435]"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
