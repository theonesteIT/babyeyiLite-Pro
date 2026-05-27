import { useState, useEffect, useCallback } from 'react';
import {
  Search, RefreshCw, Loader2, Building2, MapPin, Calendar, Eye,
  ThumbsUp, ThumbsDown, FileText, Layers, AlertCircle, ShieldCheck, PenLine, Stamp,
} from 'lucide-react';
import { font } from '../utils/theme';
import { apiFetch, NESA_API } from '../utils/api';
import { fmt, fmtD } from '../utils/helpers';
import {
  getApprovalDocuments, isPendingApproval, STATUS_FILTERS, statusBadgeClass,
} from '../utils/approvalHelpers';
import Pagination from '../components/Pagination';
import DocViewerModal from '../components/DocViewerModal';
import { resolveApprovalsStatus } from '../utils/dashboardFilters';

const PAGE_SIZE = 12;

export default function ApprovalsPage({ toast, onMetricsChange, portalFilters, filterVersion = 0 }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('pending');
  const [district, setDistrict] = useState('');
  const academicYear = portalFilters?.academicYear || '';
  const term = portalFilters?.term || '';
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  const [meta, setMeta] = useState({ academic_years: [], terms: [], districts: [] });
  const [processing, setProcessing] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [notes, setNotes] = useState('');
  const [detail, setDetail] = useState(null);
  const [docViewer, setDocViewer] = useState(null);

  useEffect(() => {
    apiFetch(`${NESA_API}/requests/meta`)
      .then((r) => setMeta(r.data || {}))
      .catch(() => {});
  }, []);

  const load = useCallback(
    async (pg = 1) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: pg, limit: PAGE_SIZE });
        const apiStatus = resolveApprovalsStatus(portalFilters, status);
        if (apiStatus && apiStatus !== 'all') params.set('status', apiStatus);
        if (search) params.set('search', search);
        if (district) params.set('district', district);
        if (academicYear) params.set('academic_year', academicYear);
        if (term) params.set('term', term);
        if (portalFilters?.schoolId) params.set('school_id', portalFilters.schoolId);
        const res = await apiFetch(`${NESA_API}/requests?${params}`);
        setRows(res.data || []);
        setPagination(res.pagination || { total: 0, pages: 1, page: pg });
      } catch (e) {
        toast?.(e.message || 'Failed to load approvals', 'error');
        setRows([]);
      } finally {
        setLoading(false);
      }
    },
    [status, search, district, academicYear, term, portalFilters, toast],
  );

  useEffect(() => {
    load(page);
  }, [page, load]);

  useEffect(() => {
    setPage(1);
  }, [filterVersion]);

  const pendingCount = rows.filter((r) => isPendingApproval(r)).length;
  const approvedCount = rows.filter((r) => r.nesa_status === 'approved').length;
  const recommendedCount = rows.filter((r) => r.nesa_status === 'recommended').length;

  useEffect(() => {
    onMetricsChange?.({
      total: pagination.total,
      pending: pendingCount,
      approved: approvedCount,
      recommended: recommendedCount,
    });
  }, [pagination.total, pendingCount, approvedCount, recommendedCount, onMetricsChange]);

  const runAction = async (id, action) => {
    setProcessing(id);
    setConfirm(null);
    try {
      const endpoint =
        action === 'approved'
          ? `${NESA_API}/requests/${id}/approve`
          : `${NESA_API}/requests/${id}/reject`;
      const res = await apiFetch(endpoint, {
        method: 'PATCH',
        body: JSON.stringify({ notes: notes || (action === 'approved' ? 'Approved by NESA' : '') }),
      });
      if (!res?.success) throw new Error(res?.message || 'Action failed');
      toast?.(action === 'approved' ? 'Request approved.' : 'Request rejected.', action === 'approved' ? 'success' : 'error');
      setDetail(null);
      setNotes('');
      load(page);
    } catch (e) {
      toast?.(e.message || 'Action failed', 'error');
    } finally {
      setProcessing(null);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    load(1);
  };

  return (
    <div className="space-y-5 anim" style={{ fontFamily: font }}>
      {docViewer && (
        <DocViewerModal url={docViewer.url} title={docViewer.title} onClose={() => setDocViewer(null)} />
      )}

      <div className="rounded-2xl border border-[#fde68a] bg-white p-4 shadow-sm sm:p-5">
        <form onSubmit={handleSearch} className="flex flex-col gap-3">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-700" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search school, district, class…"
              className="w-full rounded-xl border border-[#fde68a] bg-[#fffbeb] py-2.5 pl-10 pr-3 text-[13px] text-[#000435] outline-none focus:border-amber-400"
            />
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <select
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className="rounded-xl border border-[#fde68a] bg-[#fffbeb] px-3 py-2.5 text-[13px]"
            >
              <option value="">All districts</option>
              {(meta.districts || []).map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <button type="submit" className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#000435] px-4 py-2.5 text-[13px] font-bold text-amber-400">
                <Search size={16} /> Search
              </button>
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setDistrict('');
                  setPage(1);
                }}
                className="cursor-pointer rounded-xl border border-[#fde68a] bg-white px-4 py-2.5 text-[13px] font-semibold text-amber-800"
              >
                <RefreshCw size={16} />
              </button>
            </div>
          </div>
          <p className="m-0 text-[11px] text-amber-800/75">
            Year <span className="font-bold text-[#000435]">{academicYear || '—'}</span>
            {' · '}
            Term <span className="font-bold text-[#000435]">{term || 'All Terms'}</span>
            {' '}(set in the bar above)
          </p>
        </form>
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => { setStatus(f.id); setPage(1); }}
              className={`shrink-0 cursor-pointer rounded-full border px-3 py-1.5 text-[11px] font-bold ${
                status === f.id ? 'border-[#000435] bg-[#000435] text-amber-400' : 'border-[#fde68a] bg-[#fffbeb] text-amber-900'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-[#fde68a] bg-white py-20">
          <Loader2 className="h-10 w-10 animate-spin text-amber-500" />
          <p className="m-0 text-sm text-[#000435]/60">Loading approval requests…</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-[#fde68a] bg-white py-16 text-center">
          <ShieldCheck className="mx-auto mb-3 h-12 w-12 text-amber-400" />
          <p className="m-0 font-semibold text-[#000435]">No requests match your filters</p>
        </div>
      ) : (
        <>
          <div className="space-y-3 lg:hidden">
            {rows.map((r) => (
              <ApprovalCard key={r.id} row={r} onView={() => setDetail(r)} processing={processing} />
            ))}
          </div>
          <div className="hidden overflow-hidden rounded-2xl border border-[#fde68a] bg-white shadow-sm lg:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse text-left text-[13px]">
                <thead>
                  <tr className="border-b border-amber-200 bg-gradient-to-r from-amber-400 to-amber-500 text-[10px] font-black uppercase tracking-wider text-[#000435]">
                    <th className="px-4 py-3">School</th>
                    <th className="px-4 py-3">District</th>
                    <th className="px-4 py-3">Year / Term</th>
                    <th className="px-4 py-3">Requested</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={r.id} className={i % 2 ? 'bg-[#fffbeb]/50' : 'bg-white'}>
                      <td className="px-4 py-3 font-bold text-[#000435]">{r.school_name}</td>
                      <td className="px-4 py-3 text-amber-900">{r.district}</td>
                      <td className="px-4 py-3">{r.academic_year} · {r.term}</td>
                      <td className="px-4 py-3 tabular-nums">RWF {fmt(r.requested_amount)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-lg border px-2 py-0.5 text-[10px] font-bold uppercase ${statusBadgeClass(r.nesa_status)}`}>
                          {r.nesa_status?.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => setDetail(r)}
                          className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[#000435] bg-[#000435] px-3 py-1.5 text-[11px] font-bold text-amber-400"
                        >
                          <Eye size={14} /> View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <Pagination
            current={page}
            total={pagination.pages || 1}
            totalItems={pagination.total || 0}
            pageSize={PAGE_SIZE}
            loading={loading}
            onChange={(p) => setPage(p)}
          />
        </>
      )}

      {confirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#000435]/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-[#fde68a] bg-white p-6 shadow-xl">
            <h3 className="m-0 text-center text-lg font-black text-[#000435]">
              {confirm.action === 'approved' ? 'Approve request?' : 'Reject request?'}
            </h3>
            <p className="mt-2 text-center text-sm text-amber-800">{confirm.school}</p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="mt-4 w-full rounded-xl border border-[#fde68a] bg-[#fffbeb] p-3 text-[13px]"
              placeholder={confirm.action === 'approved' ? 'Notes (optional)' : 'Rejection reason (required)'}
            />
            {confirm.action !== 'approved' && !notes.trim() && (
              <p className="mt-1 flex items-center gap-1 text-xs font-bold text-red-600">
                <AlertCircle size={12} /> Reason required
              </p>
            )}
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => { setConfirm(null); setNotes(''); }} className="flex-1 rounded-xl border border-[#fde68a] py-2.5 text-sm font-bold">
                Cancel
              </button>
              <button
                type="button"
                disabled={processing === confirm.id || (confirm.action !== 'approved' && !notes.trim())}
                onClick={() => runAction(confirm.id, confirm.action)}
                className={`flex-1 rounded-xl py-2.5 text-sm font-bold text-white ${
                  confirm.action === 'approved' ? 'bg-emerald-600' : 'bg-red-600'
                }`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {detail && (
        <DetailPanel
          row={detail}
          notes={notes}
          setNotes={setNotes}
          processing={processing}
          onClose={() => setDetail(null)}
          onDoc={setDocViewer}
          onConfirm={(action) => setConfirm({ id: detail.id, action, school: detail.school_name })}
        />
      )}
    </div>
  );
}

function ApprovalCard({ row, onView }) {
  return (
    <div className="rounded-2xl border border-[#fde68a] bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="m-0 font-bold text-[#000435]">{row.school_name}</p>
          <p className="m-0 mt-1 flex items-center gap-1 text-xs text-amber-800">
            <MapPin size={12} /> {row.district}
          </p>
        </div>
        <span className={`rounded-lg border px-2 py-0.5 text-[10px] font-bold uppercase ${statusBadgeClass(row.nesa_status)}`}>
          {row.nesa_status}
        </span>
      </div>
      <p className="mt-2 text-xs text-[#000435]/70">
        {row.academic_year} · {row.term} · RWF {fmt(row.requested_amount)}
      </p>
      <button type="button" onClick={onView} className="mt-3 w-full cursor-pointer rounded-xl bg-[#000435] py-2 text-xs font-bold text-amber-400">
        View & decide
      </button>
    </div>
  );
}

function DetailPanel({ row, notes, setNotes, processing, onClose, onDoc, onConfirm }) {
  const docs = getApprovalDocuments(row);
  const pending = isPendingApproval(row);

  return (
    <div className="fixed inset-0 z-[150] flex justify-end bg-[#000435]/50 backdrop-blur-sm">
      <div className="flex h-full w-full max-w-lg flex-col bg-white shadow-2xl sm:max-w-xl">
        <div className="flex items-center justify-between border-b border-[#fde68a] bg-[#fffbeb] px-4 py-3">
          <h3 className="m-0 text-base font-black text-[#000435]">{row.school_name}</h3>
          <button type="button" onClick={onClose} className="cursor-pointer rounded-lg px-2 py-1 text-sm font-bold text-amber-800">Close</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="grid grid-cols-2 gap-2 text-center text-xs">
            <Info label="Academic year" value={row.academic_year} />
            <Info label="Term" value={row.term} />
            <Info label="NESA limit" value={`RWF ${fmt(row.current_limit)}`} />
            <Info label="Requested" value={`RWF ${fmt(row.requested_amount)}`} accent />
          </div>
          {row.deo_notes && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
              <p className="m-0 mb-1 text-[10px] font-bold uppercase">DEO notes</p>
              {row.deo_notes}
            </div>
          )}
          {docs.length > 0 && (
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase text-amber-800">Documents</p>
              <div className="space-y-2">
                {docs.map((d, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => onDoc({ url: d.url, title: d.title })}
                    className="flex w-full cursor-pointer items-center gap-2 rounded-xl border border-[#fde68a] p-3 text-left text-sm font-semibold"
                  >
                    <FileText size={16} /> {d.title}
                  </button>
                ))}
              </div>
            </div>
          )}
          {pending && (
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-[#fde68a] bg-[#fffbeb] p-3 text-sm"
              placeholder="NESA decision notes…"
            />
          )}
        </div>
        {pending && (
          <div className="flex gap-2 border-t border-[#fde68a] p-4">
            <button
              type="button"
              disabled={!!processing}
              onClick={() => onConfirm('approved')}
              className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white"
            >
              <ThumbsUp size={16} /> Approve
            </button>
            <button
              type="button"
              disabled={!!processing}
              onClick={() => onConfirm('rejected')}
              className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-red-600 py-3 text-sm font-bold text-white"
            >
              <ThumbsDown size={16} /> Reject
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Info({ label, value, accent }) {
  return (
    <div className={`rounded-xl border p-2 ${accent ? 'border-amber-300 bg-amber-50' : 'border-[#fde68a] bg-white'}`}>
      <p className="m-0 text-[9px] font-bold uppercase text-[#000435]/50">{label}</p>
      <p className="m-0 mt-0.5 text-sm font-bold text-[#000435]">{value || '—'}</p>
    </div>
  );
}
