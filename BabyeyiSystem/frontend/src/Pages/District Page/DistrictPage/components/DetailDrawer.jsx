import { useState, useEffect } from 'react';
import {
  FileText, Eye, X, Loader2, PenLine, Stamp, FileImage, FileCheck,
  ThumbsUp, ThumbsDown, Send, Check,
} from 'lucide-react';
import { st } from '../utils/theme';
import { fmt, resolveUrl } from '../utils/helpers';
import Badge from './Badge';
import DocViewerModal from './DocViewerModal';
import { apiFetch } from '../utils/api';

export default function DetailDrawer({ id, onClose, onAction }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [docView, setDocView] = useState(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setErr(null);
    apiFetch(`/district/babyeyi/${id}`)
      .then((r) => setData(r.data))
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const ir = data?.increase_request;

  const DocBtn = ({
    path,
    name,
    label,
    icon: Icon = FileText,
    variant = 'default',
  }) => {
    const url = resolveUrl(path);
    const variantStyles = {
      default: 'border-[#fde68a] bg-white hover:bg-amber-50/50',
      amber: 'border-amber-300 bg-amber-50 hover:bg-amber-100/80',
      navy: 'border-[#000435]/15 bg-[#000435]/[0.04] hover:bg-[#000435]/[0.07]',
    };
    const styles = variantStyles[variant] || variantStyles.default;

    if (!url) {
      return (
        <div className="flex items-center gap-2 rounded-xl border border-dashed border-gray-200 bg-gray-50 p-3">
          <Icon className="h-4 w-4 shrink-0 text-gray-400" />
          <span className="text-xs font-medium text-gray-500">{label} — Not uploaded</span>
        </div>
      );
    }

    return (
      <button
        type="button"
        onClick={() => setDocView({ url, title: name || label })}
        className={`flex w-full cursor-pointer items-center gap-3 rounded-xl border p-3 text-left transition-colors ${styles}`}
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#fde68a] bg-white">
          <Icon className="h-4 w-4 text-amber-700" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="m-0 mb-0.5 truncate text-xs font-bold text-[#000435]">{label}</p>
          <p className="m-0 truncate text-[10px] font-medium text-amber-800/80">{name || 'Tap to preview'}</p>
        </div>
        <Eye className="h-4 w-4 shrink-0 text-[#000435]" />
      </button>
    );
  };

  return (
    <>
      {docView && (
        <DocViewerModal
          url={docView.url}
          title={docView.title}
          onClose={() => setDocView(null)}
        />
      )}

      <div className="fixed inset-0 z-40 flex">
        <button
          type="button"
          aria-label="Close details"
          className="flex-1 cursor-pointer border-none bg-[#000435]/40 backdrop-blur-sm"
          onClick={onClose}
        />
        <div className="flex h-full w-full max-w-full flex-col overflow-hidden border-l border-[#fde68a] bg-white shadow-[-4px_0_32px_rgba(0,4,53,0.18)] sm:max-w-[min(100%,480px)]">
          <div className="flex shrink-0 items-center gap-3 border-b border-[#fde68a] bg-white px-4 py-3.5 sm:px-5">
            <div className="min-w-0 flex-1">
              <h3 className="m-0 mb-0.5 truncate text-sm font-bold text-[#000435]">
                {data?.school_name || 'Loading…'}
              </h3>
              <p className="m-0 text-[10px] font-medium text-amber-700">{data?.doc_id || `#${id}`}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-none bg-[#000435]/5 text-[#000435] cursor-pointer"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex flex-1 flex-col gap-4 overflow-y-auto overscroll-y-contain p-4 sm:p-5">
            {loading && (
              <div className="flex h-40 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
              </div>
            )}
            {err && (
              <div className="rounded-2xl border border-[#fde68a] bg-amber-50 p-4 text-sm font-medium text-[#000435]">
                {err}
              </div>
            )}

            {data && !loading && (
              <>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { l: 'Class', v: data.class },
                    { l: 'Term', v: data.term },
                    { l: 'Academic Year', v: data.academic_year },
                    { l: 'Level', v: data.level },
                    { l: 'Category', v: data.category },
                    { l: 'Status', v: st(data.status).label },
                    { l: 'Total Fees', v: `RWF ${fmt(data.total_fee)}` },
                    { l: 'NESA Limit', v: data.nesa_limit ? `RWF ${fmt(data.nesa_limit)}` : '—' },
                  ].map(({ l, v }) => (
                    <div key={l} className="rounded-xl border border-[#fde68a] bg-white p-3">
                      <p className="m-0 mb-1 text-[9px] font-bold uppercase tracking-wider text-amber-700">{l}</p>
                      <p className="m-0 text-[13px] font-bold text-[#000435]">{v || '—'}</p>
                    </div>
                  ))}
                </div>

                {(data.payments || []).filter((p) => p.name && p.amount).length > 0 && (
                  <div className="overflow-hidden rounded-2xl border border-[#fde68a] bg-white">
                    <div className="border-b border-[#fde68a] px-4 py-2.5">
                      <p className="m-0 text-[10px] font-bold uppercase tracking-wider text-amber-700">
                        Payment breakdown
                      </p>
                    </div>
                    {data.payments.filter((p) => p.name && p.amount).map((p, i) => (
                      <div
                        key={i}
                        className={`flex items-center justify-between px-4 py-2.5 ${i % 2 ? 'bg-amber-50/50' : 'bg-white'}`}
                      >
                        <span className="text-[13px] text-[#000435]/80">{p.name}</span>
                        <span className="text-[13px] font-bold text-[#000435]">RWF {fmt(p.amount)}</span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between bg-[#000435] px-4 py-3">
                      <span className="text-[13px] font-bold text-amber-400">TOTAL</span>
                      <span className="text-[13px] font-bold text-amber-400">RWF {fmt(data.total_fee)}</span>
                    </div>
                  </div>
                )}

                {ir && (
                  <div className="rounded-2xl border-2 border-[#fde68a] bg-amber-50/40 p-3.5">
                    <p className="m-0 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-800">
                      Documents submitted by school
                    </p>
                    <p className="m-0 mb-3 text-[11px] leading-relaxed text-[#000435]/75">
                      Review the documents below before you approve, reject, or send to NESA.
                    </p>
                    <div className="flex flex-col gap-2">
                      <DocBtn
                        path={ir.parent_rep_doc_path}
                        name={ir.parent_rep_doc_name}
                        label="Parents representative document"
                        icon={FileImage}
                        variant="amber"
                      />
                      <DocBtn
                        path={ir.budget_doc_path}
                        name={ir.budget_doc_name}
                        label="School budget / service plan"
                        icon={FileCheck}
                        variant="navy"
                      />
                    </div>

                    {(ir.deo_signature_path || ir.deo_stamp_path) && (
                      <div className="mt-3">
                        <p className="m-0 mb-2 text-[10px] font-bold uppercase tracking-wider text-amber-800">
                          DEO authorization
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {ir.deo_signature_path && (
                            <button
                              type="button"
                              onClick={() => setDocView({ url: resolveUrl(ir.deo_signature_path), title: 'DEO Signature' })}
                              className="flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border border-[#fde68a] bg-white p-3"
                            >
                              <PenLine className="h-4 w-4 text-amber-700" />
                              <span className="text-[10px] font-bold text-[#000435]">Signature</span>
                            </button>
                          )}
                          {ir.deo_stamp_path && (
                            <button
                              type="button"
                              onClick={() => setDocView({ url: resolveUrl(ir.deo_stamp_path), title: 'DEO Stamp' })}
                              className="flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border border-[#fde68a] bg-white p-3"
                            >
                              <Stamp className="h-4 w-4 text-amber-700" />
                              <span className="text-[10px] font-bold text-[#000435]">Stamp</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {ir && (
                  <div className="rounded-2xl border border-[#fde68a] bg-amber-50 p-3.5">
                    <p className="m-0 mb-2 text-[11px] font-bold uppercase tracking-wider text-amber-900">
                      Increase request
                    </p>
                    <p className="m-0 mb-2.5 text-[13px] text-[#000435]">{ir.reason || 'No reason provided'}</p>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Badge status={ir.nesa_status} />
                      <span className="text-xs font-bold text-amber-900">
                        Over by: RWF {fmt(Number(ir.requested_amount) - Number(ir.current_limit))}
                      </span>
                    </div>
                    {ir.deo_notes && (
                      <p className="mt-2 border-t border-[#fde68a] pt-2 text-[11px] italic text-[#000435]/70">
                        DEO notes: {ir.deo_notes}
                      </p>
                    )}
                  </div>
                )}

                {data.pdf_path && (
                  <DocBtn
                    path={data.pdf_path}
                    name={data.pdf_name || `Babyeyi-${data.doc_id}.pdf`}
                    label="Official Babyeyi PDF"
                    icon={FileText}
                  />
                )}

                <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:flex-wrap">
                  {data.status !== 'approved' && (
                    <button
                      type="button"
                      onClick={() => { onAction('approve', data); onClose(); }}
                      className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-[#000435] py-3.5 text-[13px] font-bold text-amber-400 shadow-md sm:min-w-[120px]"
                    >
                      <ThumbsUp className="h-4 w-4" /> Approve
                    </button>
                  )}
                  {data.status !== 'rejected' && (
                    <button
                      type="button"
                      onClick={() => { onAction('reject', data); onClose(); }}
                      className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-[#000435] bg-white py-3.5 text-[13px] font-bold text-[#000435] sm:min-w-[120px]"
                    >
                      <ThumbsDown className="h-4 w-4" /> Reject
                    </button>
                  )}
                  {(data.exceeds_limit === 1 || data.exceeds_limit === true)
                    && (ir?.nesa_status || ir?.status || '') !== 'recommended' && (
                    <button
                      type="button"
                      onClick={() => { onAction('recommend', data); onClose(); }}
                      className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-amber-500 py-3.5 text-[13px] font-bold text-[#000435] shadow-md sm:min-w-[140px]"
                    >
                      <Send className="h-4 w-4" /> Send to NESA
                    </button>
                  )}
                  {(data.exceeds_limit === 1 || data.exceeds_limit === true)
                    && (ir?.nesa_status || ir?.status || '') === 'recommended' && (
                    <div className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#fde68a] bg-amber-50 py-3.5 text-xs font-bold text-[#000435]">
                      <Check className="h-3.5 w-3.5" /> Sent to NESA
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
