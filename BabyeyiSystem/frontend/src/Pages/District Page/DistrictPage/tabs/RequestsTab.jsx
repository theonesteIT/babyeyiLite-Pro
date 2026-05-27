import React from 'react';
import {
  AlertCircle,
  TrendingUp,
  RefreshCw,
  Building2,
  FileImage,
  FileCheck,
  PenLine,
  Stamp,
  ThumbsUp,
  Send,
  ThumbsDown,
  Check,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { fmt, fmtDate, resolveUrl } from '../utils/helpers';
import Pagination from '../components/Pagination';
import DeoFilterToolbar from '../components/DeoFilterToolbar';
import DeoRequestStatusPills from '../components/DeoRequestStatusPills';
import { font } from '../utils/theme';

const REQ_PAGE_SIZE = 10;

const STATUS_STYLES = {
  pending: {
    header: 'bg-amber-50 border-amber-200',
    badge: 'bg-white/90 text-amber-900 border-amber-200',
    label: 'Pending Action',
  },
  recommended: {
    header: 'bg-[#000435]/5 border-[#000435]/15',
    badge: 'bg-white/90 text-[#000435] border-[#000435]/20',
    label: 'Sent to NESA',
  },
  approved: {
    header: 'bg-amber-50/80 border-[#fde68a]',
    badge: 'bg-white/90 text-[#000435] border-[#fde68a]',
    label: 'Approved',
  },
  rejected: {
    header: 'bg-slate-50 border-slate-200',
    badge: 'bg-white/90 text-slate-700 border-slate-200',
    label: 'Rejected',
  },
};

function SummaryCard({ label, value, tone }) {
  const tones = {
    default: 'border-[#fde68a] bg-amber-50/60 text-[#000435]',
    pending: 'border-amber-300 bg-amber-50 text-amber-900',
    nesa: 'border-[#000435]/15 bg-[#000435]/5 text-[#000435]',
    resolved: 'border-[#fde68a] bg-white text-[#000435]',
  };
  return (
    <div className={`rounded-2xl border-2 p-3 sm:p-3.5 ${tones[tone] || tones.default}`}>
      <p className="m-0 text-xl font-black tabular-nums sm:text-2xl">{value}</p>
      <p className="m-0 mt-0.5 text-[10px] font-bold uppercase tracking-wide opacity-80">{label}</p>
    </div>
  );
}

function RequestCard({ req, handleAction }) {
  const status = req.nesa_status || req.status || 'pending';
  const st = STATUS_STYLES[status] || STATUS_STYLES.pending;
  const overAmount = Math.max(0, Number(req.total_fee) - Number(req.nesa_limit));
  const actionId = req.babyeyi_id || req.id;
  const classLabel =
    req.classes?.length > 0 ? req.classes.join(', ') : req.class || req.class_name || '—';

  return (
    <article className="overflow-hidden rounded-2xl border border-[#fde68a] bg-white shadow-[0_2px_12px_rgba(0,4,53,0.06)]">
      <div className={`flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3 sm:px-5 ${st.header}`}>
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/80">
            <Building2 className="h-4 w-4 text-[#000435]" />
          </div>
          <div className="min-w-0">
            <p className="m-0 truncate text-sm font-bold text-[#000435]">{req.school_name || '—'}</p>
            <p className="m-0 truncate text-[10px] font-medium text-[#000435]/55">
              {classLabel} · {req.term} · {req.academic_year} · Doc #{req.doc_id || req.babyeyi_id}
            </p>
          </div>
        </div>
        <span className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-bold ${st.badge}`}>
          {st.label}
        </span>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        <p className="m-0 border-l-[3px] border-amber-300 pl-3 text-sm leading-relaxed text-[#000435]/80">
          {req.reason || 'No reason provided'}
        </p>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {[
            { label: 'Fee set', value: `RWF ${fmt(req.total_fee)}`, cls: 'border-[#fde68a] bg-amber-50' },
            { label: 'NESA limit', value: `RWF ${fmt(req.nesa_limit)}`, cls: 'border-[#fde68a] bg-white' },
            { label: 'Over by', value: `+RWF ${fmt(overAmount)}`, cls: 'border-amber-300 bg-amber-50/80' },
          ].map((m) => (
            <div key={m.label} className={`rounded-xl border px-3 py-2.5 text-center ${m.cls}`}>
              <p className="m-0 text-[9px] font-bold uppercase tracking-wide text-[#000435]/50">{m.label}</p>
              <p className="m-0 mt-1 text-sm font-black text-[#000435]">{m.value}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <p className="m-0 text-[9px] font-bold uppercase tracking-wider text-amber-800/70">
              Documents
            </p>
            <div className="flex flex-wrap gap-2">
              {req.parent_rep_doc_path ? (
                <a
                  href={resolveUrl(req.parent_rep_doc_path)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] font-bold text-amber-900 no-underline hover:bg-amber-100"
                >
                  <FileImage className="h-3.5 w-3.5" />
                  Parent rep
                </a>
              ) : (
                <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-[10px] text-slate-500">
                  Parent doc — N/A
                </span>
              )}
              {req.budget_doc_path ? (
                <a
                  href={resolveUrl(req.budget_doc_path)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#000435]/15 bg-[#000435]/5 px-2.5 py-1.5 text-[11px] font-bold text-[#000435] no-underline hover:bg-[#000435]/10"
                >
                  <FileCheck className="h-3.5 w-3.5" />
                  Budget
                </a>
              ) : (
                <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-[10px] text-slate-500">
                  Budget — N/A
                </span>
              )}
            </div>
          </div>

          {req.deo_signature_path && (
            <span className="inline-flex items-center gap-1.5 self-start rounded-lg border border-[#fde68a] bg-amber-50 px-2.5 py-1.5 text-[10px] font-bold text-[#000435]">
              <PenLine className="h-3.5 w-3.5" />
              DEO signed
              {req.deo_stamp_path && <Stamp className="h-3.5 w-3.5" />}
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2 border-t border-[#fde68a]/60 pt-3">
          {status === 'pending' && (
            <>
              <button
                type="button"
                onClick={() => handleAction('approve', { ...req, id: actionId })}
                className="inline-flex min-h-[40px] cursor-pointer items-center gap-2 rounded-xl bg-[#000435] px-4 py-2 text-xs font-bold text-amber-400 shadow-md transition hover:bg-[#000c6e]"
              >
                <ThumbsUp className="h-3.5 w-3.5" />
                Approve
              </button>
              <button
                type="button"
                onClick={() => handleAction('recommend', { ...req, id: actionId })}
                className="inline-flex min-h-[40px] cursor-pointer items-center gap-2 rounded-xl border border-[#000435] bg-white px-4 py-2 text-xs font-bold text-[#000435] transition hover:bg-[#000435]/5"
              >
                <Send className="h-3.5 w-3.5" />
                Send to NESA
              </button>
              <button
                type="button"
                onClick={() => handleAction('reject', { ...req, id: actionId })}
                className="inline-flex min-h-[40px] cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-100"
              >
                <ThumbsDown className="h-3.5 w-3.5" />
                Reject
              </button>
            </>
          )}
          {status === 'recommended' && (
            <span className="inline-flex items-center gap-2 rounded-xl border border-[#000435]/15 bg-[#000435]/5 px-3 py-2 text-xs font-bold text-[#000435]">
              <Check className="h-4 w-4" />
              Forwarded to NESA — awaiting decision
            </span>
          )}
          {status === 'approved' && (
            <span className="inline-flex items-center gap-2 rounded-xl border border-[#fde68a] bg-amber-50 px-3 py-2 text-xs font-bold text-[#000435]">
              <CheckCircle className="h-4 w-4" />
              Approved by NESA
            </span>
          )}
          {status === 'rejected' && (
            <span className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700">
              <XCircle className="h-4 w-4" />
              Rejected
            </span>
          )}
        </div>

        {req.deo_notes && (
          <div className="rounded-xl border border-[#fde68a] bg-amber-50/50 px-3 py-2">
            <p className="m-0 text-xs italic text-amber-900/90">DEO notes: {req.deo_notes}</p>
          </div>
        )}

        <p className="m-0 text-right text-[10px] font-medium text-[#000435]/40">
          Submitted {fmtDate(req.created_at)}
        </p>
      </div>
    </article>
  );
}

export default function RequestsTab({
  requests,
  reqLoad,
  reqErr,
  reqFilter,
  reqPage,
  setReqPage,
  reqPagination,
  reqSummary,
  loadRequests,
  deo,
  handleAction,
  filterBar,
  onReqFilterPill,
}) {
  const summary = reqSummary || { total: 0, pending: 0, recommended: 0, approved: 0, rejected: 0 };
  const pages = reqPagination?.pages || 1;
  const totalItems = reqPagination?.total ?? summary.total;

  const onFilterChange = (key) => {
    if (onReqFilterPill) onReqFilterPill(key);
    else {
      setReqPage(1);
      loadRequests(1, key);
    }
  };

  const activeRequestStatus = filterBar?.portalFilters?.requestStatus ?? reqFilter;

  return (
    <div className="anim space-y-4 pb-4" style={{ fontFamily: font }}>
      {filterBar && <DeoFilterToolbar {...filterBar} />}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="m-0 text-[10px] font-bold uppercase tracking-widest text-amber-700">Review queue</p>
          <h2 className="m-0 text-lg font-black text-[#000435] sm:text-xl">Fee increase requests</h2>
          <p className="m-0 mt-1 text-xs text-[#000435]/60">
            {deo?.district} — schools requesting fees above NESA limits
          </p>
        </div>
        <button
          type="button"
          onClick={() => loadRequests(reqPage, reqFilter)}
          disabled={reqLoad}
          className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl bg-[#000435] px-4 py-2.5 text-xs font-bold text-amber-400 shadow-md transition hover:bg-[#000c6e] disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${reqLoad ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {!reqLoad && !reqErr && summary.total > 0 && (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <SummaryCard label="Total" value={summary.total} tone="default" />
          <SummaryCard label="Pending action" value={summary.pending} tone="pending" />
          <SummaryCard label="Sent to NESA" value={summary.recommended} tone="nesa" />
          <SummaryCard label="Resolved" value={summary.approved + summary.rejected} tone="resolved" />
        </div>
      )}

      {!reqLoad && !reqErr && summary.total > 0 && (
        <DeoRequestStatusPills
          variant="page"
          value={activeRequestStatus}
          onChange={onFilterChange}
          summary={summary}
        />
      )}

      {reqErr && !reqLoad && (
        <div className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center">
          <AlertCircle className="h-7 w-7 shrink-0 text-red-600" />
          <div className="flex-1">
            <p className="m-0 text-sm font-bold text-red-900">Failed to load requests</p>
            <p className="m-0 mt-1 text-xs text-red-700">{reqErr}</p>
          </div>
          <button
            type="button"
            onClick={() => loadRequests(reqPage, reqFilter)}
            className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white"
          >
            Retry
          </button>
        </div>
      )}

      {reqLoad && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-44 animate-pulse rounded-2xl border border-[#fde68a] bg-white" />
          ))}
        </div>
      )}

      {!reqLoad && !reqErr && requests.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-[#fde68a] bg-white px-6 py-14 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#fde68a] bg-amber-50">
            <TrendingUp className="h-8 w-8 text-amber-600" />
          </div>
          <p className="m-0 text-base font-bold text-[#000435]">
            {reqFilter ? `No ${reqFilter} requests` : 'No increase requests'}
          </p>
          <p className="m-0 mt-1 text-sm text-[#000435]/55">
            {reqFilter
              ? 'Try another filter or refresh the list.'
              : `No schools in ${deo?.district} have submitted fee increase requests yet.`}
          </p>
        </div>
      )}

      {!reqLoad && !reqErr && requests.length > 0 && (
        <div className="space-y-3">
          {requests.map((req) => (
            <RequestCard key={req.id} req={req} handleAction={handleAction} />
          ))}
        </div>
      )}

      {!reqLoad && !reqErr && totalItems > REQ_PAGE_SIZE && (
        <Pagination
          current={reqPage}
          total={pages}
          totalItems={totalItems}
          pageSize={REQ_PAGE_SIZE}
          loading={reqLoad}
          onChange={(p) => {
            setReqPage(p);
            loadRequests(p, reqFilter);
          }}
        />
      )}
    </div>
  );
}
