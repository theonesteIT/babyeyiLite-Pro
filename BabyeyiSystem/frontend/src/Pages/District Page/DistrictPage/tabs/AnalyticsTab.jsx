import React from 'react';
import { BarChart2, Loader2, TrendingUp } from 'lucide-react';
import DeoFilterToolbar from '../components/DeoFilterToolbar';
import { fmt } from '../utils/helpers';
import Pagination from '../components/Pagination';
import { font } from '../utils/theme';

const TABLE_PAGE_SIZE = 12;
const BAR_PAGE_SIZE = 8;

function ChartCard({ title, children, action }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#fde68a] bg-white shadow-[0_2px_12px_rgba(0,4,53,0.06)]">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-[#fde68a]/80 bg-amber-50/40 px-4 py-3 sm:px-5">
        <h3 className="m-0 text-sm font-bold text-[#000435]">{title}</h3>
        {action}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </div>
  );
}

function BarBlock({ title, items, valueKey = 'total', labelKey, page, onPageChange }) {
  const all = items || [];
  const totalPages = Math.max(1, Math.ceil(all.length / BAR_PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const slice = all.slice((current - 1) * BAR_PAGE_SIZE, current * BAR_PAGE_SIZE);
  const max = Math.max(1, ...slice.map((x) => Number(x[valueKey]) || 0));

  return (
    <ChartCard
      title={title}
      action={
        all.length > BAR_PAGE_SIZE ? (
          <span className="text-[10px] font-bold text-amber-800/70">
            Page {current}/{totalPages}
          </span>
        ) : null
      }
    >
      <div className="space-y-2.5">
        {slice.length === 0 ? (
          <p className="m-0 py-6 text-center text-xs text-[#000435]/45">No data for current filters</p>
        ) : (
          slice.map((row, i) => {
            const val = Number(row[valueKey]) || 0;
            const pct = max ? (val / max) * 100 : 0;
            const label = row[labelKey] ?? row.sector ?? row.term ?? row.academic_year ?? '—';
            return (
              <div key={i} className="flex items-center gap-2 sm:gap-3">
                <span
                  className="w-16 shrink-0 truncate text-[11px] font-bold text-[#000435]/70 sm:w-20"
                  title={String(label)}
                >
                  {label}
                </span>
                <div className="h-6 min-w-0 flex-1 overflow-hidden rounded-lg bg-amber-50">
                  <div
                    className="h-full rounded-lg bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-300"
                    style={{ width: `${pct}%`, minWidth: val ? 4 : 0 }}
                  />
                </div>
                <span className="w-8 shrink-0 text-right text-xs font-black tabular-nums text-[#000435]">
                  {fmt(val)}
                </span>
              </div>
            );
          })
        )}
      </div>
      {all.length > BAR_PAGE_SIZE && (
        <div className="mt-3 flex justify-center gap-1">
          <button
            type="button"
            disabled={current <= 1}
            onClick={() => onPageChange(current - 1)}
            className="rounded-lg border border-[#fde68a] px-3 py-1 text-[11px] font-bold disabled:opacity-40"
          >
            Prev
          </button>
          <button
            type="button"
            disabled={current >= totalPages}
            onClick={() => onPageChange(current + 1)}
            className="rounded-lg border border-[#fde68a] px-3 py-1 text-[11px] font-bold disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </ChartCard>
  );
}

export default function AnalyticsTab({
  district,
  data,
  loading,
  filterBar,
  tablePagination = { total: 0, page: 1, pages: 1 },
  onTablePageChange,
  barPages = { sector: 1, term: 1, year: 1 },
  onBarPageChange,
}) {
  const schoolRows = data?.school_requests || [];
  const tableTotal = tablePagination?.total ?? schoolRows.length;
  const tablePage = tablePagination?.page ?? 1;
  const tablePages = tablePagination?.pages ?? 1;

  return (
    <div className="anim space-y-4 pb-4" style={{ fontFamily: font }}>
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#000435] to-[#000c6e] p-5 text-white shadow-[0_8px_24px_rgba(0,4,53,0.25)] sm:p-6">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, white 0%, transparent 50%)' }}
        />
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="m-0 text-lg font-black sm:text-xl">District analytics</h2>
            <p className="m-0 mt-1 text-xs text-amber-200/90">
              {district} — reports by term, year & sector
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-400/15 px-3 py-2 text-xs font-bold text-amber-200">
            <BarChart2 className="h-4 w-4" />
            Reports
          </span>
        </div>
      </section>

      {filterBar && <DeoFilterToolbar {...filterBar} />}

      {loading && !data ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-9 w-9 animate-spin text-amber-500" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <BarBlock
              title="By sector"
              items={data?.sector_breakdown}
              valueKey="total"
              labelKey="sector"
              page={barPages.sector}
              onPageChange={(p) => onBarPageChange('sector', p)}
            />
            <BarBlock
              title="By term"
              items={data?.term_breakdown}
              valueKey="total"
              labelKey="term"
              page={barPages.term}
              onPageChange={(p) => onBarPageChange('term', p)}
            />
            <BarBlock
              title="By academic year"
              items={data?.year_breakdown}
              valueKey="total"
              labelKey="academic_year"
              page={barPages.year}
              onPageChange={(p) => onBarPageChange('year', p)}
            />
          </div>

          <div className="overflow-hidden rounded-2xl border border-[#fde68a] bg-white shadow-[0_2px_12px_rgba(0,4,53,0.06)]">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#fde68a] bg-amber-50/50 px-4 py-3 sm:px-5">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-amber-700" />
                <h3 className="m-0 text-sm font-bold text-[#000435]">Schools — requests & counts</h3>
              </div>
              {tableTotal > 0 && (
                <span className="text-[11px] font-bold text-amber-800/80">{tableTotal} rows</span>
              )}
            </div>

            {schoolRows.length === 0 ? (
              <p className="m-0 px-5 py-12 text-center text-sm text-[#000435]/45">
                No school rows for the selected filters
              </p>
            ) : (
              <>
                <div className="-mx-px overflow-x-auto">
                  <table className="w-full min-w-[640px] border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#fde68a] bg-amber-50/80">
                        {[
                          'School',
                          'Sector',
                          'Year',
                          'Term',
                          'Total',
                          'Approved',
                          'Pending',
                          'Increase req.',
                        ].map((h) => (
                          <th
                            key={h}
                            className={`px-3 py-3 font-bold text-[#000435]/70 sm:px-4 ${
                              ['Total', 'Approved', 'Pending', 'Increase req.'].includes(h)
                                ? 'text-right'
                                : ''
                            }`}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {schoolRows.map((row, i) => (
                        <tr
                          key={`${row.school_id}-${row.academic_year}-${row.term}-${i}`}
                          className="border-b border-[#fde68a]/50 transition-colors hover:bg-amber-50/30"
                        >
                          <td className="max-w-[140px] truncate px-3 py-3 font-bold text-[#000435] sm:px-4">
                            {row.school_name || '—'}
                          </td>
                          <td className="px-3 py-3 text-[#000435]/65 sm:px-4">{row.school_sector || '—'}</td>
                          <td className="px-3 py-3 text-[#000435]/65 sm:px-4">{row.academic_year || '—'}</td>
                          <td className="px-3 py-3 text-[#000435]/65 sm:px-4">{row.term || '—'}</td>
                          <td className="px-3 py-3 text-right font-bold tabular-nums sm:px-4">
                            {fmt(row.total_babyeyi)}
                          </td>
                          <td className="px-3 py-3 text-right font-semibold text-[#000435] tabular-nums sm:px-4">
                            {fmt(row.approved)}
                          </td>
                          <td className="px-3 py-3 text-right font-semibold text-amber-800 tabular-nums sm:px-4">
                            {fmt(row.pending)}
                          </td>
                          <td
                            className={`px-3 py-3 text-right font-black tabular-nums sm:px-4 ${
                              row.increase_requests > 0 ? 'text-amber-700' : 'text-[#000435]/45'
                            }`}
                          >
                            {fmt(row.increase_requests)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {tableTotal > TABLE_PAGE_SIZE && (
                  <div className="border-t border-[#fde68a] p-3 sm:p-4">
                    <Pagination
                      current={tablePage}
                      total={tablePages}
                      totalItems={tableTotal}
                      pageSize={TABLE_PAGE_SIZE}
                      loading={loading}
                      onChange={onTablePageChange}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
