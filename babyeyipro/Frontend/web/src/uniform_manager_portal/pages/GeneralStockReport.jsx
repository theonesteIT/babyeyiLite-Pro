import { useCallback, useEffect, useMemo, useState } from 'react'
import { RefreshCw, FileBarChart, Shirt, Layers } from 'lucide-react'
import { fetchFinishedGoods } from '../../storekeeper_portal/frontend/src/services/finishedGoodsService'
import { fetchFabricReceipts } from '../../storekeeper_portal/frontend/src/services/fabricReceiptsService'
import { fetchFabricStockouts } from '../../storekeeper_portal/frontend/src/services/fabricStockoutsService'
import { fetchUniformIssueAnalytics } from '../../storekeeper_portal/frontend/src/services/uniformIssueService'
import { fetchStoreAcademicSettings } from '../../storekeeper_portal/frontend/src/services/academicSettingsService'
import { mergeSchoolPdfMeta } from '../../storekeeper_portal/frontend/src/utils/schoolPdfBranding'
import { printReportSection } from '../utils/reportExports'
import {
  UniformPageLayout,
  HrPanel,
  HrPanelHeader,
  HrBtnOutline,
  UniformTabBar,
} from '../components/uniformUi'
import StockCountSpreadsheet from '../components/StockCountSpreadsheet'
import ReportExportMenu from '../components/reports/ReportExportMenu'
import InventoryFilterShell from '../components/InventoryFilterShell'
import { useReportFilters } from '../hooks/useUniformReportBundle'
import { buildInventoryFilterOptions } from '../utils/inventoryFilterUtils'
import {
  resolvePeriodRange,
  buildFinishedUniformRows,
  buildFabricRows,
  sumReportRows,
  computeStockCountKpis,
  exportStockCountExcel,
  exportStockCountPdf,
} from '../utils/uniformStockCountReport'
import { useAuth } from '../context/AuthContext'

const REPORT_TYPES = [
  { id: 'finished', label: 'Finished uniforms', icon: Shirt },
  { id: 'fabric', label: 'Fabric stock', icon: Layers },
]

export default function GeneralStockReport() {
  const { staff } = useAuth()
  const { filters, setFilter, resetFilters } = useReportFilters()
  const [reportType, setReportType] = useState('finished')
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')
  const [schoolName, setSchoolName] = useState(staff?.school?.name || staff?.school_name || 'School')
  const [finishedGoods, setFinishedGoods] = useState([])
  const [fabrics, setFabrics] = useState([])
  const [stockouts, setStockouts] = useState([])
  const [topItems, setTopItems] = useState([])
  const [academicSettings, setAcademicSettings] = useState(null)

  const period = useMemo(
    () => resolvePeriodRange({ from: filters.from, to: filters.to }),
    [filters.from, filters.to]
  )

  const generatedBy = [staff?.first_name, staff?.last_name].filter(Boolean).join(' ')
    || staff?.full_name
    || staff?.name
    || 'Uniform Manager'

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const branding = await mergeSchoolPdfMeta().catch(() => null)
      if (branding?.name) setSchoolName(branding.name)

      const [goods, fabricRows, outRows, analytics, settings] = await Promise.all([
        fetchFinishedGoods(),
        fetchFabricReceipts(),
        fetchFabricStockouts(),
        fetchUniformIssueAnalytics({ from_date: period.from, to_date: period.to }).catch(() => ({ top_items: [] })),
        fetchStoreAcademicSettings().catch(() => null),
      ])
      setFinishedGoods(goods || [])
      setFabrics(fabricRows || [])
      setStockouts(outRows || [])
      setTopItems(analytics?.top_items || [])
      setAcademicSettings(settings)
    } catch (e) {
      setError(e.message || 'Failed to load report data')
      setFinishedGoods([])
      setFabrics([])
      setStockouts([])
      setTopItems([])
    } finally {
      setLoading(false)
    }
  }, [period.from, period.to])

  useEffect(() => {
    load()
  }, [load])

  const periodOpts = useMemo(() => ({ from: period.from, to: period.to }), [period.from, period.to])

  const rows = useMemo(() => {
    if (reportType === 'fabric') {
      return buildFabricRows(fabrics, stockouts, periodOpts)
    }
    return buildFinishedUniformRows(finishedGoods, topItems, periodOpts)
  }, [reportType, fabrics, stockouts, finishedGoods, topItems, periodOpts])

  const totals = useMemo(() => (rows.length ? sumReportRows(rows) : null), [rows])
  const kpis = useMemo(
    () => (rows.length ? computeStockCountKpis(rows, totals, reportType) : []),
    [rows, totals, reportType]
  )

  const reportTitle = reportType === 'fabric' ? 'FABRIC STOCK COUNT' : 'UNIFORM STOCK COUNT'
  const sheetTitle = `${String(schoolName).toUpperCase()} ${reportTitle} / ${period.label}`
  const exportRows = totals ? [...rows, totals] : rows

  const filterOptions = useMemo(
    () => buildInventoryFilterOptions({ fabrics, finishedGoods, academicSettings }),
    [fabrics, finishedGoods, academicSettings]
  )

  const withExport = async (fn) => {
    setExporting(true)
    try {
      await fn()
    } finally {
      setExporting(false)
    }
  }

  const handleExportExcel = () => withExport(() => Promise.resolve(exportStockCountExcel({
    schoolName,
    periodLabel: period.label,
    reportTitle,
    rows: exportRows,
    generatedBy,
    reportType,
    filename: `${reportType}-stock-count-${period.from}-to-${period.to}.xlsx`,
  })))

  const handleExportPdf = () => withExport(() => exportStockCountPdf({
    schoolName,
    periodLabel: period.label,
    reportTitle,
    rows: exportRows,
    generatedBy,
    reportType,
    kpis,
  }))

  const handlePrint = () => withExport(() => printReportSection('general-stock-count-print', 'General Stock Count', {
    schoolName,
    periodLabel: period.label,
    generatedBy,
  }))

  return (
    <UniformPageLayout
      eyebrow="Uniform Manager · Reports"
      title="General Stock Count"
      subtitle={`Opening · Stock in · Stock out · Closing — ${period.label}`}
      HeroIcon={FileBarChart}
      headerRight={(
        <div className="flex flex-wrap items-center gap-2">
          <HrBtnOutline onClick={load} disabled={loading || exporting}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Loading…' : 'Refresh'}
          </HrBtnOutline>
          <ReportExportMenu
            onExportExcel={handleExportExcel}
            onExportPdf={handleExportPdf}
            onPrint={handlePrint}
            disabled={!rows.length || loading}
            exporting={exporting}
          />
        </div>
      )}
      kpiTiles={kpis.map((k) => ({ label: k.label, value: loading ? '…' : k.value }))}
      kpiGridClassName="grid-cols-2 sm:grid-cols-3 xl:grid-cols-6"
    >
      <HrPanel>
        <HrPanelHeader title="Report type" description="Finished uniforms or fabric stock count" />
        <div className="px-5 pb-5">
          <UniformTabBar tabs={REPORT_TYPES} active={reportType} onChange={setReportType} />
        </div>
      </HrPanel>

      <InventoryFilterShell
        filters={filters}
        setFilter={setFilter}
        resetFilters={resetFilters}
        extraOptions={filterOptions}
        searchPlaceholder="Search product, fabric, reference…"
        subtitle="Date range drives stock in/out — use More filters for type, color and supplier"
      />

      {error ? (
        <HrPanel>
          <div className="p-5 text-sm text-red-600">{error}</div>
        </HrPanel>
      ) : loading ? (
        <HrPanel>
          <div className="p-8 text-center text-sm text-slate-500">Loading stock count…</div>
        </HrPanel>
      ) : rows.length === 0 ? (
        <HrPanel>
          <div className="p-8 text-center space-y-2">
            <p className="text-sm text-slate-600">No uniform or fabric stock found for your school.</p>
            <p className="text-xs text-slate-500 max-w-lg mx-auto">
              Demo seed data is stored per school. If you ran the seeder with <code className="text-[11px] bg-slate-100 px-1 rounded">--school-id=1</code> but you log in to another school, the report stays empty until you seed that school too.
            </p>
            {(staff?.school?.id || staff?.school_id) ? (
              <p className="text-xs font-semibold text-[#000435]">
                Your school id: {staff?.school?.id || staff?.school_id} — run:{' '}
                <code className="text-[11px] bg-slate-100 px-1 rounded">
                  node scripts/seed-uniform-stock-count-demo.js --clear --school-id={staff?.school?.id || staff?.school_id}
                </code>
              </p>
            ) : null}
          </div>
        </HrPanel>
      ) : (
        <HrPanel>
          <HrPanelHeader
            title="Stock count spreadsheet"
            subtitle={`${rows.length} product${rows.length === 1 ? '' : 's'} · ${reportType === 'fabric' ? 'meters' : 'pieces'}`}
          />
          <div className="p-4 sm:p-5">
            <StockCountSpreadsheet
              title={sheetTitle}
              rows={rows}
              totals={totals}
              reportType={reportType}
            />
          </div>
        </HrPanel>
      )}
    </UniformPageLayout>
  )
}
