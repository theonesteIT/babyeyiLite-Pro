import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, Loader2, RefreshCw, Sparkles, ChevronRight, AlertCircle } from 'lucide-react';
import { fetchAssetReport } from '../../../../assets_portal/services/reportsApi';
import { EMPTY_DATE_PERIOD, resolveDateFilterQuery } from '../../../../assets_portal/utils/assetsDateUtils';
import { assetsHref } from '../../../../assets_portal/config/portal';
import { NAVY, GOLD, FONT, REPORT_CARDS } from './reportConfig';
import ReportFilters from './components/ReportFilters';
import ReportKpiCards from './components/ReportKpiCards';

const INSIGHT_STYLE = {
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  danger: 'border-red-200 bg-red-50 text-red-900',
  info: 'border-blue-200 bg-blue-50 text-blue-900',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
};

export default function ReportsOverview() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const [filters, setFilters] = useState({
    year: 'all', category: 'all', location: 'all', status: 'all', health: 'all',
    datePeriod: { ...EMPTY_DATE_PERIOD },
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { ...filters, ...resolveDateFilterQuery(filters.datePeriod) };
      delete params.datePeriod;
      if (params.year === 'all') delete params.year;
      if (params.category === 'all') delete params.category;
      if (params.location === 'all') delete params.location;
      if (params.status === 'all') delete params.status;
      if (params.health === 'all') delete params.health;
      const res = await fetchAssetReport('overview', params);
      setData(res);
    } catch (err) {
      setError(err?.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6" style={{ fontFamily: FONT }}>
      <div className="rounded-2xl p-6 sm:p-8 text-white relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #1a237e 55%, ${NAVY} 100%)` }}>
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full opacity-10" style={{ background: GOLD, transform: 'translate(35%, -45%)' }} />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest mb-2" style={{ color: GOLD }}>
              <BarChart3 size={14} /> Asset Reports Center
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold">Asset Reports & Analytics</h1>
            <p className="text-white/70 text-sm mt-2">Generate, analyze & export asset reports</p>
          </div>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold self-start"
            style={{ background: GOLD, color: NAVY }}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      <ReportFilters filters={data?.filters} value={filters} onChange={setFilters} onApply={load} loading={loading} />

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 flex items-center gap-2">
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {loading && !data ? (
        <div className="flex items-center justify-center gap-2 py-20 text-slate-500">
          <Loader2 className="animate-spin" size={24} style={{ color: GOLD }} />
          <span className="text-sm font-medium">Loading report center…</span>
        </div>
      ) : (
        <>
          <ReportKpiCards kpis={data?.kpis} />

          {data?.insights?.length > 0 && (
            <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles size={18} style={{ color: GOLD }} />
                <h2 className="text-sm font-bold" style={{ color: NAVY }}>AI Insights</h2>
              </div>
              <div className="space-y-2">
                {data.insights.map((item, i) => (
                  <div key={i} className={`rounded-xl border px-4 py-3 text-sm font-medium ${INSIGHT_STYLE[item.level] || INSIGHT_STYLE.info}`}>
                    {item.text}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h2 className="text-lg font-bold mb-4" style={{ color: NAVY }}>Report Types</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {REPORT_CARDS.map((card) => {
                const Icon = card.icon;
                return (
                  <Link
                    key={card.slug}
                    to={assetsHref(`reports/${card.slug}`)}
                    className="group rounded-2xl border border-black/5 bg-white p-5 shadow-sm hover:shadow-lg hover:border-amber-300/60 transition-all"
                  >
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-3 group-hover:scale-105 transition-transform" style={{ background: `${GOLD}22`, color: NAVY }}>
                      <Icon size={22} />
                    </div>
                    <h3 className="font-bold text-sm" style={{ color: NAVY }}>{card.title}</h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">{card.desc}</p>
                    <span className="inline-flex items-center gap-1 text-xs font-bold mt-3 group-hover:gap-2 transition-all" style={{ color: GOLD }}>
                      View report <ChevronRight size={14} />
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>

          {data?.recent?.length > 0 && (
            <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-bold mb-4" style={{ color: NAVY }}>Recent Assets</h2>
              <div className="divide-y divide-slate-100">
                {data.recent.map((a) => (
                  <div key={a.id} className="py-3 flex items-center justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <p className="font-semibold truncate" style={{ color: NAVY }}>{a.asset_name}</p>
                      <p className="text-xs text-slate-400 font-mono">{a.asset_code} · {a.category}</p>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      {a.created_at ? new Date(a.created_at).toLocaleDateString() : '—'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
