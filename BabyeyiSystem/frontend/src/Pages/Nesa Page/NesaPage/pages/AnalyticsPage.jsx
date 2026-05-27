import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Loader2, TrendingUp, MapPin, Calendar, Activity, Filter, BarChart3 } from 'lucide-react';
import { font } from '../utils/theme';
import { apiFetch, NESA_API } from '../utils/api';
import { HBarChart, DonutChart, LineAreaChart } from '../components/charts/SimpleCharts';

export default function AnalyticsPage({ toast, portalFilters, filterVersion = 0 }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ district: '', sector: '' });
  const [filterOptions, setFilterOptions] = useState({
    districts: [],
    sectors: [],
    academic_years: [],
    terms: ['Term 1', 'Term 2', 'Term 3'],
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
      if (portalFilters?.academicYear) params.set('academic_year', portalFilters.academicYear);
      if (portalFilters?.term) params.set('term', portalFilters.term);
      if (portalFilters?.schoolId) params.set('school_id', portalFilters.schoolId);
      const r = await apiFetch(`${NESA_API}/analytics?${params}`);
      setData(r.data || null);
      if (r.filterOptions) setFilterOptions((prev) => ({ ...prev, ...r.filterOptions }));
    } catch (e) {
      toast?.('Failed to load analytics', 'error');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [filters, portalFilters, toast]);

  useEffect(() => {
    load();
  }, [load, filterVersion]);

  const d = data || {};
  const districtBreakdown = d.district_breakdown || [];
  const districtViolations = d.district_violations || [];
  const yearBreakdown = d.year_breakdown || [];
  const monthlyTrend = d.monthly_trend || [];
  const sectorBreakdown = d.sector_breakdown || [];

  const performanceDonut = districtBreakdown.slice(0, 6).map((x) => ({
    label: x.district,
    value: x.total,
  }));

  return (
    <div className="space-y-5 anim" style={{ fontFamily: font }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="m-0 text-sm text-amber-800/80">National performance · requests by district, year, and term</p>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#000435] px-4 py-2.5 text-[13px] font-bold text-amber-400 disabled:opacity-60"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          Refresh
        </button>
      </div>

      <div className="rounded-2xl border border-[#fde68a] bg-white p-4 shadow-sm sm:p-5">
        <p className="m-0 mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-amber-800">
          <Filter size={14} /> Filters
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { key: 'district', label: 'District', options: filterOptions.districts },
            { key: 'sector', label: 'Sector', options: filterOptions.sectors },
          ].map(({ key, label, options }) => (
            <div key={key}>
              <label className="mb-1 block text-[10px] font-bold text-[#000435]/60">{label}</label>
              <select
                value={filters[key]}
                onChange={(e) => setFilters((f) => ({ ...f, [key]: e.target.value }))}
                className="w-full rounded-xl border border-[#fde68a] bg-[#fffbeb] px-3 py-2 text-[13px]"
              >
                <option value="">All</option>
                {(options || []).map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
          ))}
          <div className="flex items-end">
            <button type="button" onClick={load} className="w-full rounded-xl border-2 border-[#000435] bg-[#000435] py-2 text-sm font-bold text-amber-400">
              Apply
            </button>
          </div>
        </div>
      </div>

      {loading && !data ? (
        <div className="flex justify-center py-24">
          <Loader2 className="h-10 w-10 animate-spin text-amber-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ChartCard icon={TrendingUp} title="Increase requests by district">
            {districtBreakdown.length ? (
              <HBarChart data={districtBreakdown.map((x) => ({ label: x.district, value: x.total }))} />
            ) : (
              <EmptyChart />
            )}
          </ChartCard>

          <ChartCard icon={BarChart3} title="District share (top 6)">
            {performanceDonut.length ? (
              <DonutChart segments={performanceDonut} />
            ) : (
              <EmptyChart />
            )}
          </ChartCard>

          <ChartCard icon={Calendar} title="By academic year">
            {yearBreakdown.length ? (
              <HBarChart data={yearBreakdown.map((x) => ({ label: String(x.academic_year), value: x.total }))} />
            ) : (
              <EmptyChart />
            )}
          </ChartCard>

          <ChartCard icon={MapPin} title="Violations by district">
            {districtViolations.length ? (
              <HBarChart data={districtViolations} />
            ) : (
              <EmptyChart />
            )}
          </ChartCard>

          <ChartCard icon={Activity} title="Monthly submission trend" className="lg:col-span-2">
            {monthlyTrend.length ? (
              <LineAreaChart data={monthlyTrend} labelKey="label" valueKey="total" />
            ) : (
              <EmptyChart />
            )}
          </ChartCard>

          {sectorBreakdown.length > 0 && (
            <ChartCard icon={MapPin} title="By sector" className="lg:col-span-2">
              <HBarChart data={sectorBreakdown.map((x) => ({ label: x.label || x.sector, value: x.value || x.total }))} />
            </ChartCard>
          )}
        </div>
      )}

      {districtBreakdown.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-[#fde68a] bg-white shadow-sm">
          <div className="border-b border-[#fde68a] bg-[#fffbeb] px-4 py-3">
            <h4 className="m-0 text-sm font-black text-[#000435]">District performance table</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-left text-[13px]">
              <thead>
                <tr className="border-b border-amber-200 bg-amber-100/50 text-[10px] font-black uppercase text-amber-900">
                  <th className="px-4 py-3">District</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Recommended</th>
                  <th className="px-4 py-3">Approved</th>
                  <th className="px-4 py-3">Pending</th>
                  <th className="px-4 py-3">Rejected</th>
                </tr>
              </thead>
              <tbody>
                {districtBreakdown.map((row, i) => (
                  <tr key={row.district} className={i % 2 ? 'bg-[#fffbeb]/40' : ''}>
                    <td className="px-4 py-3 font-bold text-[#000435]">{row.district}</td>
                    <td className="px-4 py-3 font-black">{row.total}</td>
                    <td className="px-4 py-3 text-blue-700">{row.recommended}</td>
                    <td className="px-4 py-3 text-emerald-700">{row.approved}</td>
                    <td className="px-4 py-3 text-amber-800">{row.pending}</td>
                    <td className="px-4 py-3 text-red-700">{row.rejected}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function ChartCard({ icon: Icon, title, children, className = '' }) {
  return (
    <div className={`rounded-2xl border border-[#fde68a] bg-white p-5 shadow-sm ${className}`}>
      <h4 className="m-0 mb-4 flex items-center gap-2 text-[13px] font-black text-[#000435]">
        <Icon size={16} className="text-amber-600" />
        {title}
      </h4>
      {children}
    </div>
  );
}

function EmptyChart() {
  return <p className="m-0 py-8 text-center text-sm text-amber-800/60">No data for selected filters</p>;
}
