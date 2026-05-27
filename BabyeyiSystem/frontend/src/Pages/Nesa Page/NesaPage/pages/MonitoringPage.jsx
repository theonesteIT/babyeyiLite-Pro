import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search,
  RefreshCw,
  AlertTriangle,
  Eye,
  Building2,
  Loader2,
  MapPin,
} from 'lucide-react';
import { font } from '../utils/theme';
import { apiFetch, NESA_API } from '../utils/api';
import { fmt } from '../utils/helpers';
import { requestStatusMeta } from '../utils/monitoringHelpers';
import Pagination from '../components/Pagination';
import MonitoringDetailDrawer from '../components/MonitoringDetailDrawer';

const PAGE_SIZE = 12;

const FILTER_PILLS = [
  { id: 'all', label: 'All' },
  { id: 'no_request', label: 'No request' },
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
];

function matchesFilter(row, filter) {
  if (filter === 'all') return true;
  if (filter === 'no_request') return !row.request_id;
  if (filter === 'pending') {
    return row.request_status === 'pending' || row.request_status === 'recommended';
  }
  if (filter === 'approved') return row.request_status === 'approved';
  if (filter === 'rejected') {
    return row.request_status === 'rejected' || row.request_status === 'nesa_rejected';
  }
  return true;
}

function CategoryBadge({ value }) {
  const v = String(value || '').toLowerCase();
  const styles = {
    public: 'bg-blue-50 text-blue-800 border-blue-200',
    private: 'bg-violet-50 text-violet-800 border-violet-200',
    boarding: 'bg-purple-50 text-purple-800 border-purple-200',
    tvet: 'bg-teal-50 text-teal-800 border-teal-200',
  };
  return (
    <span className={`inline-flex rounded-lg border px-2 py-0.5 text-[10px] font-bold uppercase ${styles[v] || 'bg-amber-50 text-amber-900 border-amber-200'}`}>
      {value || '—'}
    </span>
  );
}

export default function MonitoringPage({ toast, onMetricsChange, portalFilters, filterVersion = 0 }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [district, setDistrict] = useState('');
  const [reqFilter, setReqFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  const [districts, setDistricts] = useState([]);
  const [detailId, setDetailId] = useState(null);
  const [detailRow, setDetailRow] = useState(null);

  const load = useCallback(
    async (pg = 1, q = search, d = district) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: pg, limit: PAGE_SIZE });
        if (q) params.set('search', q);
        if (d) params.set('district', d);
        if (portalFilters?.academicYear) params.set('academic_year', portalFilters.academicYear);
        if (portalFilters?.term) params.set('term', portalFilters.term);
        if (portalFilters?.schoolId) params.set('school_id', portalFilters.schoolId);
        const res = await apiFetch(`${NESA_API}/violations?${params}`);
        setRows(res.data || []);
        setPagination(res.pagination || { total: 0, pages: 1, page: pg });
        setDistricts((prev) => {
          const merged = [...new Set([...prev, ...(res.data || []).map((v) => v.district).filter(Boolean)])];
          return merged.sort();
        });
      } catch (e) {
        toast?.(e.message || 'Failed to load violations', 'error');
        setRows([]);
      } finally {
        setLoading(false);
      }
    },
    [search, district, portalFilters, toast],
  );

  useEffect(() => {
    setPage(1);
  }, [filterVersion]);

  useEffect(() => {
    load(1, search, district);
  }, [filterVersion, load]);

  const filtered = useMemo(() => rows.filter((r) => matchesFilter(r, reqFilter)), [rows, reqFilter]);

  const counts = useMemo(
    () => ({
      all: rows.length,
      no_request: rows.filter((v) => !v.request_id).length,
      pending: rows.filter((v) => v.request_status === 'pending' || v.request_status === 'recommended').length,
      approved: rows.filter((v) => v.request_status === 'approved').length,
      rejected: rows.filter((v) => v.request_status === 'rejected' || v.request_status === 'nesa_rejected').length,
    }),
    [rows],
  );

  useEffect(() => {
    onMetricsChange?.({
      total: pagination.total,
      no_request: counts.no_request,
      pending: counts.pending,
      approved: counts.approved,
    });
  }, [pagination.total, counts.no_request, counts.pending, counts.approved, onMetricsChange]);

  const openDetail = (row) => {
    setDetailRow(row);
    setDetailId(row.id);
  };

  const closeDetail = useCallback(() => {
    setDetailId(null);
    setDetailRow(null);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    load(1, search, district);
  };

  return (
    <div className="space-y-5 anim" style={{ fontFamily: font }}>
      {/* Filters */}
      <div className="rounded-2xl border border-[#fde68a] bg-white p-4 shadow-sm sm:p-5">
        <form onSubmit={handleSearch} className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-700" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search school, district, document ID…"
              className="w-full rounded-xl border border-[#fde68a] bg-[#fffbeb] py-2.5 pl-10 pr-3 text-[13px] text-[#000435] outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
            />
          </div>
          <select
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            className="w-full rounded-xl border border-[#fde68a] bg-[#fffbeb] px-3 py-2.5 text-[13px] text-[#000435] outline-none lg:w-48"
          >
            <option value="">All districts</option>
            {districts.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#000435] px-4 py-2.5 text-[13px] font-bold text-amber-400 lg:flex-none"
            >
              <Search size={16} /> Search
            </button>
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setDistrict('');
                setPage(1);
                load(1, '', '');
              }}
              className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#fde68a] bg-white px-4 py-2.5 text-[13px] font-semibold text-amber-800"
            >
              <RefreshCw size={16} />
              <span className="hidden sm:inline">Reset</span>
            </button>
          </div>
        </form>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {FILTER_PILLS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setReqFilter(f.id)}
              className={`shrink-0 cursor-pointer rounded-full border px-3 py-1.5 text-[11px] font-bold transition-colors ${
                reqFilter === f.id
                  ? 'border-[#000435] bg-[#000435] text-amber-400'
                  : 'border-[#fde68a] bg-[#fffbeb] text-amber-900 hover:bg-amber-100'
              }`}
            >
              {f.label} ({counts[f.id] ?? 0})
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-[#fde68a] bg-white py-20">
          <Loader2 className="h-10 w-10 animate-spin text-amber-500" />
          <p className="m-0 text-sm font-medium text-[#000435]/60">Loading violations…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-[#fde68a] bg-white py-16 text-center shadow-sm">
          <AlertTriangle className="mx-auto mb-3 h-12 w-12 text-amber-400" />
          <p className="m-0 font-semibold text-[#000435]">No violations match your filters</p>
          <p className="m-0 mt-1 text-sm text-amber-800/70">Try adjusting search or filter pills</p>
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="grid gap-3 lg:hidden">
            {filtered.map((v) => {
              const st = requestStatusMeta(v.request_status);
              const diff = Number(v.total_fee || 0) - Number(v.nesa_limit || 0);
              const pct = v.nesa_limit ? ((diff / Number(v.nesa_limit)) * 100).toFixed(1) : '—';
              return (
                <article
                  key={v.id}
                  className="overflow-hidden rounded-2xl border-2 border-red-200 bg-white shadow-sm"
                >
                  <div className="border-b border-red-100 bg-red-50/50 px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="m-0 truncate text-[15px] font-bold text-[#000435]">{v.school_name}</h3>
                        <p className="m-0 mt-0.5 flex items-center gap-1 text-[11px] text-amber-800/80">
                          <MapPin size={11} /> {v.district}
                        </p>
                      </div>
                      <span className={`shrink-0 rounded-lg border px-2 py-0.5 text-[10px] font-bold ${st.className}`}>
                        {st.label}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 p-3">
                    <div className="rounded-xl bg-red-50 p-2 text-center">
                      <p className="m-0 text-[8px] font-bold uppercase text-red-800">Set fee</p>
                      <p className="m-0 text-[11px] font-bold text-red-900">RWF {fmt(v.total_fee)}</p>
                    </div>
                    <div className="rounded-xl bg-emerald-50 p-2 text-center">
                      <p className="m-0 text-[8px] font-bold uppercase text-emerald-800">Limit</p>
                      <p className="m-0 text-[11px] font-bold text-emerald-900">RWF {fmt(v.nesa_limit)}</p>
                    </div>
                    <div className="rounded-xl bg-amber-50 p-2 text-center">
                      <p className="m-0 text-[8px] font-bold uppercase text-amber-900">Over</p>
                      <p className="m-0 text-[11px] font-bold text-amber-900">+{pct}%</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 border-t border-[#fde68a]/60 px-3 py-2">
                    <CategoryBadge value={v.category} />
                    <CategoryBadge value={v.level} />
                  </div>
                  <div className="border-t border-[#fde68a]/60 p-3">
                    <button
                      type="button"
                      onClick={() => openDetail(v)}
                      className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#000435] py-2.5 text-[13px] font-bold text-amber-400"
                    >
                      <Eye size={16} /> View full details & documents
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-2xl border border-[#fde68a] bg-white shadow-sm lg:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse text-left">
                <thead>
                  <tr className="bg-[#f59e0b] text-[10px] font-bold uppercase tracking-wider text-[#000435]">
                    {['School', 'District', 'Category', 'Level', 'Set fee', 'NESA limit', 'Over', '%', 'Request', 'Actions'].map(
                      (h) => (
                        <th key={h} className="whitespace-nowrap px-4 py-3">
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((v, i) => {
                    const st = requestStatusMeta(v.request_status);
                    const diff = Number(v.total_fee || 0) - Number(v.nesa_limit || 0);
                    const pct = v.nesa_limit ? ((diff / Number(v.nesa_limit)) * 100).toFixed(1) : '—';
                    return (
                      <tr
                        key={v.id}
                        className={`border-b border-[#fde68a]/40 ${i % 2 ? 'bg-[#fffbeb]/40' : 'bg-white'} hover:bg-amber-50/50`}
                      >
                        <td className="px-4 py-3">
                          <p className="m-0 text-[13px] font-bold text-[#000435]">{v.school_name}</p>
                          <p className="m-0 text-[10px] text-amber-800/70">
                            {v.academic_year} · {v.term}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-[12px] font-semibold text-[#000435]/80">{v.district}</td>
                        <td className="px-4 py-3">
                          <CategoryBadge value={v.category} />
                        </td>
                        <td className="px-4 py-3">
                          <CategoryBadge value={v.level} />
                        </td>
                        <td className="px-4 py-3 text-[13px] font-bold tabular-nums text-red-800">
                          {fmt(v.total_fee)}
                        </td>
                        <td className="px-4 py-3 text-[13px] font-semibold tabular-nums text-emerald-800">
                          {fmt(v.nesa_limit)}
                        </td>
                        <td className="px-4 py-3 text-[13px] font-bold tabular-nums text-red-800">+{fmt(diff)}</td>
                        <td className="px-4 py-3">
                          <span className="rounded-lg border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-800">
                            +{pct}%
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-lg border px-2 py-0.5 text-[10px] font-bold ${st.className}`}>
                            {st.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => openDetail(v)}
                            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[#000435] bg-[#000435] px-3 py-2 text-[11px] font-bold text-amber-400 transition-opacity hover:opacity-90"
                          >
                            <Eye size={14} /> View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
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
            onChange={(p) => {
              setPage(p);
              load(p, search, district);
            }}
          />
        </>
      )}

      {detailId != null && (
        <MonitoringDetailDrawer
          babyeyiId={detailId}
          listRow={detailRow}
          onClose={closeDetail}
          toast={toast}
        />
      )}
    </div>
  );
}
