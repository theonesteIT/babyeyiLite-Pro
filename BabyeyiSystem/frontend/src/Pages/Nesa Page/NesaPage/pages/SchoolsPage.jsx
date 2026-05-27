import { useState, useEffect, useCallback } from 'react';
import { Search, RefreshCw, Loader2, Building2, MapPin } from 'lucide-react';
import { font } from '../utils/theme';
import { apiFetch, NESA_API } from '../utils/api';
import Pagination from '../components/Pagination';

const PAGE_SIZE = 12;

export default function SchoolsPage({ toast, onMetricsChange, portalFilters, filterVersion = 0 }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [district, setDistrict] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  const [districts, setDistricts] = useState([]);

  const load = useCallback(
    async (pg = 1) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: pg, limit: PAGE_SIZE });
        if (search) params.set('search', search);
        if (district) params.set('district', district);
        if (portalFilters?.schoolId) params.set('school_id', portalFilters.schoolId);
        const res = await apiFetch(`${NESA_API}/schools?${params}`);
        setRows(res.data || []);
        setPagination(res.pagination || { total: 0, pages: 1 });
        setDistricts((prev) => {
          const merged = [...new Set([...prev, ...(res.data || []).map((s) => s.district).filter(Boolean)])];
          return merged.sort();
        });
      } catch (e) {
        toast?.(e.message || 'Failed to load schools', 'error');
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
    load(page);
  }, [page, load, filterVersion]);

  useEffect(() => {
    onMetricsChange?.({ total: pagination.total });
  }, [pagination.total, onMetricsChange]);

  return (
    <div className="space-y-5 anim" style={{ fontFamily: font }}>
      <div className="rounded-2xl border border-[#fde68a] bg-white p-4 shadow-sm sm:p-5">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            load(1);
          }}
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-700" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search school name, code, district…"
              className="w-full rounded-xl border border-[#fde68a] bg-[#fffbeb] py-2.5 pl-10 pr-3 text-[13px]"
            />
          </div>
          <select
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            className="rounded-xl border border-[#fde68a] bg-[#fffbeb] px-3 py-2.5 text-[13px] sm:w-48"
          >
            <option value="">All districts</option>
            {districts.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <button type="submit" className="rounded-xl bg-[#000435] px-5 py-2.5 text-[13px] font-bold text-amber-400">
            Search
          </button>
        </form>
        <p className="m-0 mt-3 text-[11px] font-medium text-amber-800/80">
          Showing registered public and government schools from the national registry.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-amber-500" />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-[#fde68a] bg-white py-16 text-center">
          <Building2 className="mx-auto mb-3 h-12 w-12 text-amber-400" />
          <p className="m-0 font-semibold text-[#000435]">No schools found</p>
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map((s) => (
              <div key={s.id} className="rounded-2xl border border-[#fde68a] bg-white p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#000435] text-amber-400">
                    <Building2 size={20} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="m-0 truncate font-bold text-[#000435]">{s.school_name}</p>
                    <p className="m-0 mt-1 flex items-center gap-1 text-xs text-amber-800">
                      <MapPin size={12} /> {s.district}, {s.province}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <span className="rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase text-blue-800">
                        {s.ownership_type || 'Government'}
                      </span>
                      <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                        {s.school_category || 'Public'}
                      </span>
                    </div>
                    {s.school_code && (
                      <p className="m-0 mt-2 text-[10px] font-mono text-[#000435]/50">Code: {s.school_code}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <Pagination
            current={page}
            total={pagination.pages || 1}
            totalItems={pagination.total || 0}
            pageSize={PAGE_SIZE}
            loading={loading}
            onChange={setPage}
          />
        </>
      )}
    </div>
  );
}
