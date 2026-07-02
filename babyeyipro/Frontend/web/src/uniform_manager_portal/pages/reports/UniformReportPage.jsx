import { useMemo, useEffect, useState, useCallback } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { getReportBySlug } from '../../config/reportCatalog'
import { useUniformReportBundle, useReportFilters } from '../../hooks/useUniformReportBundle'
import { buildUniformReport, rowsForExport } from '../../utils/reportBuilders'
import { exportReportCsv, exportReportExcel, exportReportPdf, printReportSection } from '../../utils/reportExports'
import { fmtDate } from '../../utils/reportUtils'
import ReportPageShell from '../../components/reports/ReportPageShell'
import { useAuth } from '../../context/AuthContext'
import { uniformHref } from '../../config/portal'

export default function UniformReportPage() {
  const { reportSlug } = useParams()
  const meta = getReportBySlug(reportSlug)
  const { staff } = useAuth()
  const { filters, setFilter, resetFilters } = useReportFilters()
  const bundle = useUniformReportBundle(filters)
  const [exporting, setExporting] = useState(false)

  const generatedBy = [staff?.first_name, staff?.last_name].filter(Boolean).join(' ')
    || staff?.full_name
    || staff?.name
    || 'Uniform Manager'

  const report = useMemo(
    () => (meta ? buildUniformReport(reportSlug, bundle, filters) : null),
    [
      reportSlug,
      meta,
      filters,
      bundle.finishedGoods,
      bundle.fabrics,
      bundle.stockouts,
      bundle.issues,
      bundle.issueLines,
      bundle.analytics,
      bundle.profit,
    ]
  )

  const filterOptions = useMemo(() => ({
    uniformTypes: [...new Set(bundle.finishedGoods.map((g) => g.uniform_name).filter(Boolean))].sort(),
    sizes: [...new Set(bundle.finishedGoods.map((g) => g.size).filter(Boolean))].sort(),
    colors: [...new Set(bundle.finishedGoods.map((g) => g.fabric_color).filter(Boolean))].sort(),
    suppliers: [...new Set(bundle.fabrics.map((f) => f.supplier_name).filter(Boolean))].sort(),
    classes: [...new Set(bundle.issues.map((i) => i.class_name).filter(Boolean))].sort(),
    academicYears: bundle.academicSettings?.academicYears || [],
    terms: bundle.academicSettings?.activeTerms || ['Term 1', 'Term 2', 'Term 3'],
  }), [bundle.finishedGoods, bundle.fabrics, bundle.issues, bundle.academicSettings])

  useEffect(() => {
    if (!bundle.academicSettings) return
    if (!filters.academicYear && bundle.academicSettings.academicYear) {
      setFilter('academicYear', bundle.academicSettings.academicYear)
    }
    if (!filters.term && bundle.academicSettings.currentTerm) {
      setFilter('term', bundle.academicSettings.currentTerm)
    }
  }, [bundle.academicSettings, filters.academicYear, filters.term, setFilter])

  const periodLabel = `${fmtDate(filters.from)} → ${fmtDate(filters.to)}`
  const exportPayload = useMemo(() => {
    if (!report) return { columns: [], rows: [] }
    if (report.sections?.length) {
      const columns = [
        { key: 'section', label: 'Section' },
        ...report.sections[0].columns,
      ]
      const rows = []
      for (const section of report.sections) {
        for (const row of section.rows || []) {
          rows.push({
            section: section.title,
            ...row,
            result: row.result || '',
          })
        }
      }
      return { columns, rows }
    }
    return { columns: report.columns || [], rows: report.rows || [] }
  }, [report])

  const exportRows = rowsForExport(exportPayload.rows, exportPayload.columns)

  const withExport = useCallback(async (fn) => {
    setExporting(true)
    try {
      await fn()
    } finally {
      setExporting(false)
    }
  }, [])

  const handleExportExcel = useCallback(() => withExport(() => exportReportExcel({
    title: meta?.title,
    schoolName: bundle.schoolName,
    periodLabel,
    columns: exportPayload.columns,
    rows: exportRows,
    generatedBy,
    kpis: report?.kpis || [],
  })), [withExport, meta?.title, bundle.schoolName, periodLabel, exportPayload.columns, report, exportRows, generatedBy])

  const handleExportCsv = useCallback(() => withExport(() => Promise.resolve(exportReportCsv({
    title: meta?.title,
    columns: exportPayload.columns,
    rows: exportRows,
  }))), [withExport, meta?.title, exportPayload.columns, exportRows])

  const handlePrint = useCallback(() => withExport(() => printReportSection('uniform-report-print', meta?.title, {
    schoolName: bundle.schoolName,
    periodLabel,
    generatedBy,
  })), [withExport, meta?.title, bundle.schoolName, periodLabel, generatedBy])

  const handleExportPdf = useCallback(() => withExport(() => exportReportPdf({
    title: meta?.title,
    schoolName: bundle.schoolName,
    periodLabel,
    columns: exportPayload.columns,
    rows: exportRows,
    generatedBy,
    kpis: report?.kpis || [],
  })), [withExport, meta?.title, bundle.schoolName, periodLabel, exportPayload.columns, report, exportRows, generatedBy])

  if (!meta) {
    return <Navigate to={uniformHref('/reports')} replace />
  }

  if (meta.enabled === false) {
    return <Navigate to={uniformHref('/reports')} replace />
  }

  if (meta.legacyRoute) {
    return <Navigate to={uniformHref('/reports/general-stock')} replace />
  }

  const financialReport = reportSlug === 'sales-income' || reportSlug === 'profit-loss'
  const filterLayout = 'compact'
  const filterDrawerVariant = financialReport ? 'financial' : 'inventory'

  return (
    <ReportPageShell
      meta={meta}
      schoolName={bundle.schoolName}
      generatedBy={generatedBy}
      loading={bundle.loading}
      error={bundle.error}
      filters={filters}
      setFilter={setFilter}
      resetFilters={resetFilters}
      filterOptions={filterOptions}
      report={report}
      onRefresh={bundle.reload}
      onExportExcel={handleExportExcel}
      onExportCsv={handleExportCsv}
      onExportPdf={handleExportPdf}
      onPrint={handlePrint}
      exporting={exporting}
      showFilters
      showSizeToggle={reportSlug !== 'stock-out'}
      filterLayout={filterLayout}
      filterDrawerVariant={filterDrawerVariant}
    />
  )
}
