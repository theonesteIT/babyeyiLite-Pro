import { useEffect, useState } from 'react';
import {
  X,
  Building2,
  MapPin,
  Layers,
  Calendar,
  FileText,
  ShieldCheck,
  MessageSquare,
  Paperclip,
  Eye,
  Loader2,
  AlertTriangle,
  PenLine,
  Stamp,
} from 'lucide-react';
import { font } from '../utils/theme';
import { apiFetch, NESA_API } from '../utils/api';
import { fmt, fmtD } from '../utils/helpers';
import {
  collectRequestDocuments,
  collectDeoDocuments,
  requestStatusMeta,
  overLimitPct,
} from '../utils/monitoringHelpers';
import DocViewerModal from './DocViewerModal';

function InfoTile({ label, value, accent }) {
  return (
    <div className={`rounded-xl border p-3 text-center ${accent || 'border-[#fde68a] bg-white'}`}>
      <p className="m-0 text-[9px] font-bold uppercase tracking-wider text-[#000435]/50">{label}</p>
      <p className="m-0 mt-1 text-sm font-bold tabular-nums text-[#000435]">{value}</p>
    </div>
  );
}

function DocButton({ doc, onView }) {
  const Icon = doc.icon || FileText;
  return (
    <button
      type="button"
      onClick={() => onView({ url: doc.url, title: doc.title })}
      className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-[#fde68a] bg-white p-3 text-left transition-colors hover:border-amber-300 hover:bg-amber-50/80"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#000435] text-amber-400">
        <Icon size={18} strokeWidth={1.75} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-semibold text-[#000435]">{doc.title}</span>
        <span className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-amber-700">
          <Eye size={12} /> Tap to preview
        </span>
      </span>
    </button>
  );
}

export default function MonitoringDetailDrawer({ babyeyiId, listRow, onClose, toast }) {
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [docViewer, setDocViewer] = useState(null);

  useEffect(() => {
    if (!babyeyiId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await apiFetch(`${NESA_API}/violations/${babyeyiId}`);
        if (!cancelled) setDetail(res.data || null);
      } catch (e) {
        if (!cancelled) {
          toast?.(e.message || 'Failed to load details', 'error');
          onClose?.();
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [babyeyiId, toast]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const violation = detail?.violation || listRow;
  const request = detail?.request;
  const schoolDocs = collectRequestDocuments(request);
  const deoDocs = collectDeoDocuments(request);
  const status = requestStatusMeta(request?.nesa_status || listRow?.request_status);
  const pct = overLimitPct(violation?.total_fee, violation?.nesa_limit);

  return (
    <>
      <div className="fixed inset-0 z-[120] bg-[#000435]/50 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <aside
        className="fixed inset-y-0 right-0 z-[121] flex w-full max-w-[min(100%,520px)] flex-col border-l border-[#fde68a] bg-[#F3F4F6] shadow-2xl"
        style={{ fontFamily: font }}
        role="dialog"
        aria-modal="true"
        aria-label="Violation details"
      >
        <div className="shrink-0 border-b border-[#fde68a] bg-[#c87800] px-4 py-4 sm:px-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="m-0 text-[9px] font-semibold uppercase tracking-[0.2em] text-[#FEBF10]">
                Fee violation detail
              </p>
              <h2 className="m-0 mt-1 truncate text-lg font-bold text-white sm:text-xl">
                {violation?.school_name || 'School'}
              </h2>
              <p className="m-0 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-white/75">
                <span className="inline-flex items-center gap-1">
                  <MapPin size={12} /> {violation?.district}
                </span>
                <span>{violation?.category} · {violation?.level}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>
          <span className={`mt-3 inline-flex rounded-lg border px-2.5 py-1 text-[11px] font-bold ${status.className}`}>
            {status.label}
          </span>
        </div>

        <div className="nesa-main-scroll min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20">
              <Loader2 className="h-10 w-10 animate-spin text-amber-500" />
              <p className="m-0 text-sm font-medium text-[#000435]/60">Loading full record…</p>
            </div>
          ) : (
            <div className="space-y-5">
              <section className="rounded-2xl border border-[#fde68a] bg-white p-4 shadow-sm">
                <h3 className="m-0 mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#000435]">
                  <AlertTriangle size={14} className="text-red-600" /> Fee comparison
                </h3>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <InfoTile label="Set fee" value={`RWF ${fmt(violation?.total_fee)}`} accent="border-red-200 bg-red-50" />
                  <InfoTile label="NESA limit" value={`RWF ${fmt(violation?.nesa_limit)}`} accent="border-emerald-200 bg-emerald-50" />
                  <InfoTile
                    label="Over by"
                    value={`RWF ${fmt(Math.max(0, Number(violation?.total_fee || 0) - Number(violation?.nesa_limit || 0)))}`}
                    accent="border-red-200 bg-red-50"
                  />
                  <InfoTile label="% over limit" value={pct ? `+${pct}%` : '—'} accent="border-amber-200 bg-amber-50" />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-[12px] text-[#000435]/80 sm:grid-cols-3">
                  <span className="flex items-center gap-1.5">
                    <Calendar size={13} className="text-amber-600" />
                    {violation?.academic_year} · {violation?.term}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Layers size={13} className="text-amber-600" />
                    {(violation?.classes?.length ? violation.classes.join(', ') : violation?.class_name) || '—'}
                  </span>
                  {violation?.doc_id && (
                    <span className="flex items-center gap-1.5">
                      <FileText size={13} className="text-amber-600" />
                      Doc {violation.doc_id}
                    </span>
                  )}
                </div>
              </section>

              {request?.reason && (
                <section className="rounded-2xl border border-[#fde68a] bg-white p-4 shadow-sm">
                  <h3 className="m-0 mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#000435]">
                    <MessageSquare size={14} className="text-amber-600" /> School justification
                  </h3>
                  <p className="m-0 rounded-xl border border-[#fde68a] bg-[#fffbeb] p-3 text-[13px] leading-relaxed text-[#000435]/85">
                    {request.reason}
                  </p>
                </section>
              )}

              {(request?.deo_notes || deoDocs.length > 0) && (
                <section className="rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-4 shadow-sm">
                  <h3 className="m-0 mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-800">
                    <ShieldCheck size={14} /> DEO recommendation
                  </h3>
                  {request?.deo_notes && (
                    <div className="mb-3 rounded-xl border border-blue-200 bg-white/80 p-3">
                      <p className="m-0 mb-1 text-[10px] font-bold uppercase text-blue-700">DEO notes / comment</p>
                      <p className="m-0 text-[13px] leading-relaxed text-[#000435]/85">{request.deo_notes}</p>
                      {request.deo_reviewed_at && (
                        <p className="m-0 mt-2 text-[10px] text-blue-700/70">Reviewed {fmtD(request.deo_reviewed_at)}</p>
                      )}
                    </div>
                  )}
                  {!request?.deo_notes && listRow?.deo_notes && (
                    <div className="mb-3 rounded-xl border border-blue-200 bg-white/80 p-3">
                      <p className="m-0 mb-1 text-[10px] font-bold uppercase text-blue-700">DEO notes (summary)</p>
                      <p className="m-0 text-[13px] leading-relaxed text-[#000435]/85">{listRow.deo_notes}</p>
                    </div>
                  )}
                  {deoDocs.length > 0 ? (
                    <div className="space-y-2">
                      <p className="m-0 flex items-center gap-1 text-[10px] font-bold uppercase text-blue-700">
                        <PenLine size={11} /> Signature & stamp
                      </p>
                      {deoDocs.map((doc) => (
                        <DocButton key={doc.url} doc={doc} onView={setDocViewer} />
                      ))}
                    </div>
                  ) : (
                    <p className="m-0 text-[12px] text-blue-800/70">No DEO signature or stamp uploaded.</p>
                  )}
                </section>
              )}

              <section className="rounded-2xl border-2 border-violet-200 bg-gradient-to-br from-violet-50 to-indigo-50 p-4 shadow-sm">
                <h3 className="m-0 mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-violet-900">
                  <Paperclip size={14} /> School manager documents
                </h3>
                <p className="m-0 mb-3 text-[11px] leading-relaxed text-violet-900/80">
                  Parent representative letter, school budget, and related files submitted with the increase request.
                </p>
                {schoolDocs.length > 0 ? (
                  <div className="space-y-2">
                    {schoolDocs.map((doc) => (
                      <DocButton key={doc.url} doc={doc} onView={setDocViewer} />
                    ))}
                  </div>
                ) : request ? (
                  <p className="m-0 rounded-xl border border-violet-200 bg-white/70 p-3 text-[12px] text-violet-900/80">
                    No school documents were attached to this request.
                  </p>
                ) : (
                  <p className="m-0 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[12px] text-amber-900">
                    No increase request has been filed for this violation yet. Documents will appear here once the school submits a request and the DEO forwards it.
                  </p>
                )}
              </section>

              {request?.nesa_notes && (
                <section className="rounded-2xl border border-[#fde68a] bg-white p-4 shadow-sm">
                  <h3 className="m-0 mb-2 text-xs font-bold uppercase tracking-wider text-[#000435]">NESA decision notes</h3>
                  <p className="m-0 text-[13px] text-[#000435]/85">{request.nesa_notes}</p>
                  {request.nesa_reviewed_at && (
                    <p className="m-0 mt-2 text-[10px] text-amber-800/70">{fmtD(request.nesa_reviewed_at)}</p>
                  )}
                </section>
              )}
            </div>
          )}
        </div>
      </aside>

      {docViewer && (
        <DocViewerModal url={docViewer.url} title={docViewer.title} onClose={() => setDocViewer(null)} />
      )}
    </>
  );
}
