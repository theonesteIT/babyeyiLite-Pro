import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Building2, Search } from 'lucide-react';
import { apiFetch } from '../utils/api';
import Pagination from '../components/Pagination';
import Badge from '../components/Badge';
import DeoFilterToolbar from '../components/DeoFilterToolbar';
import { font } from '../utils/theme';

const PAGE_SIZE = 12;

function SchoolCard({ school }) {
  return (
    <article className="group flex flex-col rounded-2xl border border-[#fde68a] bg-white p-4 shadow-[0_2px_12px_rgba(0,4,53,0.06)] transition-all hover:border-amber-300 hover:shadow-md">
      <div className="mb-3 flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#fde68a] bg-amber-50">
          <Building2 className="h-5 w-5 text-amber-700" strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="m-0 truncate text-sm font-bold text-[#000435]">{school.school_name}</h3>
          <p className="m-0 mt-0.5 text-[11px] font-medium text-amber-800/80">{school.school_code || '—'}</p>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {school.sector && (
          <span className="rounded-lg border border-[#fde68a] bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-900">
            {school.sector}
          </span>
        )}
        {school.school_category && <Badge status={school.school_category?.toLowerCase()} />}
      </div>

      <div className="mt-auto grid grid-cols-3 gap-2 border-t border-[#fde68a]/80 pt-3">
        {[
          { label: 'Total', value: school.total_babyeyi || 0, cls: 'text-[#000435]' },
          { label: 'Approved', value: school.approved_babyeyi || 0, cls: 'text-[#000435]' },
          { label: 'Pending', value: school.pending_babyeyi || 0, cls: 'text-amber-800' },
        ].map(({ label, value, cls }) => (
          <div key={label} className="text-center">
            <p className={`m-0 text-base font-black tabular-nums ${cls}`}>{value}</p>
            <p className="m-0 text-[9px] font-bold uppercase tracking-wide text-[#000435]/45">{label}</p>
          </div>
        ))}
      </div>
    </article>
  );
}

export default function SchoolsTab({ district, portalFilters, filterVersion = 0, filterBar }) {
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  const searchTimer = useRef(null);

  const load = useCallback((pg = 1, q = '') => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(pg), limit: String(PAGE_SIZE) });
    if (district) params.append('district', district);
    if (q) params.append('search', q);
    apiFetch(`/district/babyeyi/schools/list?${params}`)
      .then((r) => {
        let rows = Array.isArray(r.data) ? r.data : [];
        if (portalFilters?.schoolId) {
          rows = rows.filter((s) => String(s.id) === String(portalFilters.schoolId));
        }
        setSchools(rows);
        setPagination(
          portalFilters?.schoolId
            ? { total: rows.length, pages: 1, page: 1 }
            : r.pagination || { total: 0, pages: 1 },
        );
        setPage(pg);
      })
      .catch(() => setSchools([]))
      .finally(() => setLoading(false));
  }, [district, portalFilters?.schoolId]);

  useEffect(() => {
    load(1, search);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [load, filterVersion]);

  const onSearchChange = (value) => {
    setSearch(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => load(1, value), 350);
  };

  return (
    <div className="anim space-y-4 pb-4" style={{ fontFamily: font }}>
      {filterBar && <DeoFilterToolbar {...filterBar} />}

      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#000435] to-[#000c6e] p-5 text-white shadow-[0_8px_24px_rgba(0,4,53,0.25)] sm:p-6">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, white 0%, transparent 50%)' }}
        />
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="m-0 text-lg font-black tracking-tight sm:text-xl">Schools in {district}</h2>
            <p className="m-0 mt-1 text-xs text-amber-200/90">
              {pagination.total} registered schools in your district
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-400/15 px-3 py-2 text-xs font-bold text-amber-200">
            <Building2 className="h-4 w-4" />
            {pagination.total} Schools
          </span>
        </div>
      </section>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-700" />
        <input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by name or code…"
          className="w-full rounded-xl border border-[#fde68a] bg-white py-2.5 pl-10 pr-4 text-sm text-[#000435] outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-40 animate-pulse rounded-2xl border border-[#fde68a] bg-white"
            />
          ))}
        </div>
      ) : schools.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#fde68a] bg-white px-6 py-14 text-center">
          <Building2 className="mx-auto mb-3 h-10 w-10 text-[#fde68a]" />
          <p className="m-0 text-sm font-bold text-[#000435]">No schools found</p>
          <p className="m-0 mt-1 text-xs text-amber-800/70">Try a different search term</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {schools.map((s) => (
              <SchoolCard key={s.id} school={s} />
            ))}
          </div>
          {(pagination.pages > 1 || pagination.total > PAGE_SIZE) && (
            <Pagination
              current={page}
              total={pagination.pages || 1}
              totalItems={pagination.total || 0}
              pageSize={PAGE_SIZE}
              loading={loading}
              onChange={(p) => load(p, search)}
            />
          )}
        </>
      )}
    </div>
  );
}
