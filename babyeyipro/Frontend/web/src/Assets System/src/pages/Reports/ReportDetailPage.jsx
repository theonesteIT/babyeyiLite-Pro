import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { fetchAssetReport } from '../../../../assets_portal/services/reportsApi';
import { EMPTY_DATE_PERIOD, resolveDateFilterQuery } from '../../../../assets_portal/utils/assetsDateUtils';
import { assetsHref } from '../../../../assets_portal/config/portal';
import { NAVY, GOLD, FONT, REPORT_NAV, tableColumnsFromReport, ALL_ASSETS_REPORT_COLUMNS, allAssetsExportRows } from './reportConfig';
import ReportFilters from './components/ReportFilters';
import ReportKpiCards from './components/ReportKpiCards';
import ReportExportBar from './components/ReportExportBar';
import ReportCharts from './components/ReportCharts';
import ReportDataTable from './components/ReportDataTable';
import AllAssetsReportTable from './components/AllAssetsReportTable';

export default function ReportDetailPage() {
  const { reportType } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const [filters, setFilters] = useState({
    year: 'all', category: 'all', location: 'all', status: 'all', health: 'all',
    datePeriod: { ...EMPTY_DATE_PERIOD },
  });

  const navItem = REPORT_NAV.find((r) => r.slug === reportType);

  const load = useCallback(async () => {
    if (!reportType) return;
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
      const res = await fetchAssetReport(reportType, params);
      setData(res);
    } catch (err) {
      setError(err?.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  }, [reportType, filters]);

  useEffect(() => { load(); }, [load]);

  const isAllAssets = reportType === 'all-assets';
  const columns = useMemo(() => {
    if (isAllAssets) return ALL_ASSETS_REPORT_COLUMNS;
    return tableColumnsFromReport(data?.table);
  }, [isAllAssets, data?.table]);
  const rows = useMemo(() => {
    const raw = data?.table?.rows || [];
    return isAllAssets ? allAssetsExportRows(raw) : raw;
  }, [isAllAssets, data?.table?.rows]);

  return (
    <div className="space-y-6" style={{ fontFamily: FONT }}>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <Link to={assetsHref('reports')} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-2">
            <ArrowLeft size={14} /> Back to Reports Center
          </Link>
          <h1 className="text-2xl font-bold" style={{ color: NAVY }}>{data?.title || navItem?.name || 'Report'}</h1>
          <p className="text-sm text-slate-500 mt-1">{data?.subtitle || 'Asset register analytics'}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-bold text-slate-600 hover:bg-slate-50"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <ReportExportBar
            title={data?.title}
            subtitle={data?.subtitle}
            columns={columns}
            rows={rows}
            disabled={!rows.length}
          />
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
          <span className="text-sm font-medium">Generating report…</span>
        </div>
      ) : (
        <>
          {data?.kpis && <ReportKpiCards kpis={data.kpis} />}

          {data?.summary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.entries(data.summary).map(([key, val]) => (
                <div key={key} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {key.replace(/_/g, ' ')}
                  </p>
                  <p className="text-lg font-bold mt-1 tabular-nums" style={{ color: NAVY }}>
                    {typeof val === 'number' && val > 999 ? val.toLocaleString() : String(val)}
                  </p>
                </div>
              ))}
            </div>
          )}

          {(data?.chart?.length > 0) && (
            <ReportCharts reportType={reportType} chart={data.chart} />
          )}

          {data?.table && (
            <div>
              <h2 className="text-sm font-bold mb-3" style={{ color: NAVY }}>Register Table</h2>
              {isAllAssets ? (
                <AllAssetsReportTable rows={data.table.rows} />
              ) : (
                <ReportDataTable table={data.table} columns={columns} />
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
