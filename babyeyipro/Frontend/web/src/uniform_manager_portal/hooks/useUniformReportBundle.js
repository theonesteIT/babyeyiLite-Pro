import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchFinishedGoods } from '../../storekeeper_portal/frontend/src/services/finishedGoodsService'
import { fetchFabricReceipts } from '../../storekeeper_portal/frontend/src/services/fabricReceiptsService'
import { fetchFabricStockouts } from '../../storekeeper_portal/frontend/src/services/fabricStockoutsService'
import {
  fetchUniformIssues,
  fetchUniformIssueAnalytics,
  fetchUniformProfitCalculation,
  fetchUniformIssueReportLines,
} from '../../storekeeper_portal/frontend/src/services/uniformIssueService'
import { fetchStoreAcademicSettings } from '../../storekeeper_portal/frontend/src/services/academicSettingsService'
import { mergeSchoolPdfMeta } from '../../storekeeper_portal/frontend/src/utils/schoolPdfBranding'
import { defaultDateRange } from '../utils/reportUtils'

export function useUniformReportBundle(filters = {}) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [schoolName, setSchoolName] = useState('School')
  const [finishedGoods, setFinishedGoods] = useState([])
  const [fabrics, setFabrics] = useState([])
  const [stockouts, setStockouts] = useState([])
  const [issues, setIssues] = useState([])
  const [issueLines, setIssueLines] = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [profit, setProfit] = useState(null)
  const [academicSettings, setAcademicSettings] = useState(null)

  const reportDateParams = useMemo(
    () => ({
      from_date: filters.from || undefined,
      to_date: filters.to || undefined,
      class_name: filters.className || undefined,
    }),
    [filters.from, filters.to, filters.className]
  )

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const branding = await mergeSchoolPdfMeta().catch(() => null)
      if (branding?.name) setSchoolName(branding.name)

      const [goods, fabricRows, outRows, issueRows, lines, analyticsData, profitData, settings] = await Promise.all([
        fetchFinishedGoods(),
        fetchFabricReceipts(),
        fetchFabricStockouts(),
        fetchUniformIssues({
          academic_year: filters.academicYear || undefined,
          class_name: filters.className || undefined,
        }),
        fetchUniformIssueReportLines(reportDateParams).catch(() => []),
        fetchUniformIssueAnalytics(reportDateParams).catch(() => null),
        fetchUniformProfitCalculation(reportDateParams).catch(() => null),
        fetchStoreAcademicSettings().catch(() => null),
      ])

      setFinishedGoods(goods || [])
      setFabrics(fabricRows || [])
      setStockouts(outRows || [])
      setIssues(issueRows || [])
      setIssueLines(lines || [])
      setAnalytics(analyticsData)
      setProfit(profitData)
      setAcademicSettings(settings)
    } catch (e) {
      setError(e.message || 'Failed to load report data')
      setFinishedGoods([])
      setFabrics([])
      setStockouts([])
      setIssues([])
      setIssueLines([])
      setAnalytics(null)
      setProfit(null)
    } finally {
      setLoading(false)
    }
  }, [reportDateParams, filters.className])

  useEffect(() => {
    load()
  }, [load])

  return {
    loading,
    error,
    schoolName,
    finishedGoods,
    fabrics,
    stockouts,
    issues,
    issueLines,
    analytics,
    profit,
    academicSettings,
    reload: load,
  }
}

export function useReportFilters(initial = {}) {
  const range = defaultDateRange()
  const [filters, setFilters] = useState({
    from: initial.from || range.from,
    to: initial.to || range.to,
    academicYear: initial.academicYear || '',
    term: initial.term || '',
    category: '',
    uniformType: '',
    size: '',
    color: '',
    supplier: '',
    className: '',
    status: '',
    profitStatus: '',
    search: '',
    showSize: initial.showSize !== false,
    minStock: initial.minStock || 20,
    ...initial,
  })

  const setFilter = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }, [])

  const resetFilters = useCallback(() => {
    const r = defaultDateRange()
    setFilters((prev) => ({
      ...prev,
      from: r.from,
      to: r.to,
      category: '',
      uniformType: '',
      size: '',
      color: '',
      supplier: '',
      className: '',
      status: '',
      profitStatus: '',
      search: '',
    }))
  }, [])

  return { filters, setFilter, setFilters, resetFilters }
}
