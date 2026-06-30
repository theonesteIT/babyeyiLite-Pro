import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Plus, Search, Loader2, RefreshCw, Package, Banknote, TrendingDown,
  Calendar, Layers, Trash2, Upload, Sparkles, FileSpreadsheet,
} from 'lucide-react'
import QRCode from '../../../assets_portal/components/AssetQrCode'
import AddAsset2 from '../components/AddAsset2'
import AssetTestImportModal from '../components/AssetTestImportModal'
import AssetSlideDrawer from '../components/AssetSlideDrawer'
import AssetPreviewPanel from '../components/AssetPreviewPanel'
import AssetHealthStatusMenu, { AssetHealthStatusBadge } from '../components/AssetHealthStatusMenu'
import assetTestApi from '../../../assets_portal/services/assetTestApi'
import { formatRwfPlain } from '../../../assets_portal/utils/financialYearUtils'
import { enrichRegisterFinancials } from '../../../assets_portal/utils/assetRegisterMath'
import { buildAssetScanUrl } from '../../../assets_portal/utils/assetsQr'
import { ASSET_HEALTH_STATUS_OPTIONS, ASSET_HEALTH_STATUS_NOT_USED_OLD } from '../../../assets_portal/utils/assetsConstants'
import { assetsHref } from '../../../assets_portal/config/portal'
import { EMPTY_DATE_PERIOD, resolveDateFilterQuery } from '../../../assets_portal/utils/assetsDateUtils'
import AssetDatePeriodFilter from '../components/AssetDatePeriodFilter'
import AssetOldNotReplacedFilter from '../components/AssetOldNotReplacedFilter'
import TablePagination from '../components/TablePagination'
import { exportReportExcel } from './Reports/utils/reportExport'

const NAVY = '#000435'
const AMBER = '#FEBF10'
const PAGE_SIZE = 30

function assetDetailLink(asset) {
  const params = new URLSearchParams()
  if (asset?.id != null) params.set('asset', String(asset.id))
  const code = asset?.asset_code || asset?.code
  if (code) params.set('code', code)
  const q = params.toString()
  return q ? `${assetsHref('asset-add-test')}?${q}` : assetsHref('asset-add-test')
}

const fmt = (v) => (v != null && v !== '' ? `RWF ${formatRwfPlain(v)}` : '—')
const fmtPct = (v) => (v != null && v !== '' ? `${v}%` : '—')

const rowFin = (a) => enrichRegisterFinancials(a) || a

const TABLE_COLUMNS = [
  { key: 'sn', label: 'S/N', render: (_, idx) => idx + 1 },
  { key: 'name', label: 'ASSET NAME', render: (a) => a.asset_name || a.name || '—' },
  { key: 'category', label: 'CATEGORY', render: (a) => a.category || '—' },
  { key: 'opening', label: 'OPENING STOCK', num: true, render: (a) => fmt(rowFin(a).opening_amount) },
  { key: 'purchase', label: 'PURCHASE PRICE', num: true, render: (a) => fmt(rowFin(a).unit_price) },
  { key: 'total_balance', label: 'TOTAL BALANCE', num: true, total: true, render: (a) => fmt(rowFin(a).total_balance) },
  { key: 'accumulated', label: 'ACCUMULATED DEPRECIATION', num: true, render: (a) => fmt(rowFin(a).accumulated_depreciation) },
  { key: 'dep_rate', label: 'DEPRECIATION RATE', render: (a) => fmtPct(a.dep_rate) },
  { key: 'annual_dep', label: 'ANNUAL DEPRECIATION', num: true, render: (a) => fmt(rowFin(a).annual_dep) },
  { key: 'total_dep', label: 'TOTAL DEPRECIATION', num: true, total: true, render: (a) => fmt(rowFin(a).total_dep) },
  { key: 'net_book', label: 'NET BOOK VALUE', num: true, total: true, highlight: true, render: (a) => fmt(rowFin(a).net_book_value) },
  { key: 'health', label: 'HEALTH STATUS', render: (a) => <AssetHealthStatusBadge value={a.asset_health_status} /> },
  { key: 'qty', label: 'QUANTITY', render: (a) => a.quantity ?? 1 },
  { key: 'qr', label: 'QR', render: (a) => (
    <Link
      to={assetDetailLink(a)}
      onClick={(e) => e.stopPropagation()}
      title="Scan or click to open asset details"
      className="inline-block bg-white p-0.5 rounded border border-gray-200 hover:border-amber-400 hover:shadow-sm transition-all"
    >
      <QRCode value={buildAssetScanUrl(a)} size={36} level="M" />
    </Link>
  ) },
]

export default function AssetAddTest() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [assets, setAssets] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterHealth, setFilterHealth] = useState('')
  const [filterOldNotReplaced, setFilterOldNotReplaced] = useState(false)
  const [datePeriod, setDatePeriod] = useState(EMPTY_DATE_PERIOD)
  const [exporting, setExporting] = useState(false)
  const [filterYear, setFilterYear] = useState('')
  const [wizardOpen, setWizardOpen] = useState(false)
  const [editAssetId, setEditAssetId] = useState(null)
  const [importOpen, setImportOpen] = useState(false)
  const [importConfirming, setImportConfirming] = useState(false)
  const [importMsg, setImportMsg] = useState('')
  const [previewId, setPreviewId] = useState(null)
  const [selectedIds, setSelectedIds] = useState([])
  const [deleting, setDeleting] = useState(false)
  const [healthUpdatingId, setHealthUpdatingId] = useState(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  const syncPreviewToUrl = useCallback((id, code) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (id) {
        next.set('asset', String(id))
        if (code) next.set('code', String(code))
        else next.delete('code')
      } else {
        next.delete('asset')
        next.delete('id')
        next.delete('code')
      }
      return next
    }, { replace: true })
  }, [setSearchParams])

  const openAssetPreview = useCallback((assetOrId) => {
    const id = typeof assetOrId === 'object' ? assetOrId?.id : assetOrId
    if (!id) return
    setPreviewId(Number(id))
    const code = typeof assetOrId === 'object'
      ? (assetOrId.asset_code || assetOrId.code)
      : searchParams.get('code')
    syncPreviewToUrl(id, code)
  }, [syncPreviewToUrl, searchParams])

  const closeAssetPreview = useCallback(() => {
    setPreviewId(null)
    syncPreviewToUrl(null)
  }, [syncPreviewToUrl])

  const loadStats = useCallback(async () => {
    setStatsLoading(true)
    try {
      const data = await assetTestApi.getStats()
      setStats(data)
    } catch {
      setStats(null)
    } finally {
      setStatsLoading(false)
    }
  }, [])

  const loadAssets = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = { page, limit: PAGE_SIZE }
      if (filterYear) params.register_year = filterYear
      if (filterCategory) params.category = filterCategory
      if (filterHealth) params.asset_health_status = filterHealth
      if (filterOldNotReplaced) params.old_not_replaced = '1'
      Object.assign(params, resolveDateFilterQuery(datePeriod))
      if (search.trim()) params.q = search.trim()
      const result = await assetTestApi.listAssets(params)
      setAssets(result.items ?? [])
      setTotal(result.total ?? 0)
      setTotalPages(result.totalPages ?? 0)
    } catch (err) {
      setError(err?.message || 'Failed to load assets')
      setAssets([])
      setTotal(0)
      setTotalPages(0)
    } finally {
      setLoading(false)
    }
  }, [search, filterCategory, filterHealth, filterOldNotReplaced, datePeriod, filterYear, page])

  const refreshAll = useCallback(async () => {
    if (filterYear) {
      try {
        await assetTestApi.recalcRegisterChain(Number(filterYear), filterCategory || undefined)
      } catch {
        /* chain recalc is best-effort on refresh */
      }
    }
    await Promise.all([loadStats(), loadAssets()])
  }, [loadStats, loadAssets, filterYear, filterCategory])

  useEffect(() => { loadStats() }, [loadStats])

  useEffect(() => { setPage(1) }, [search, filterCategory, filterHealth, filterOldNotReplaced, datePeriod, filterYear])

  /** Filters from URL — e.g. Replacements page link */
  useEffect(() => {
    const health = searchParams.get('health') || searchParams.get('asset_health_status')
    const oldNr = searchParams.get('old_not_replaced')
    if (health) setFilterHealth(health)
    if (oldNr === '1' || oldNr === 'true') {
      setFilterOldNotReplaced(true)
      if (!health) setFilterHealth(ASSET_HEALTH_STATUS_NOT_USED_OLD)
    }
  }, [searchParams])

  /** Open detail drawer when URL has ?asset= from QR scan or shared link */
  useEffect(() => {
    const assetParam = searchParams.get('asset') || searchParams.get('id')
    const codeParam = searchParams.get('code')

    if (assetParam) {
      const id = Number(assetParam)
      if (Number.isFinite(id) && id > 0) setPreviewId(id)
      return undefined
    }

    if (!codeParam) return undefined

    let cancelled = false
    assetTestApi.lookupScanAsset({ code: codeParam })
      .then((data) => {
        if (!cancelled && data?.asset?.id) {
          setPreviewId(data.asset.id)
          syncPreviewToUrl(data.asset.id, data.asset.asset_code || codeParam)
        }
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [searchParams, syncPreviewToUrl])

  useEffect(() => {
    const t = setTimeout(loadAssets, 300)
    return () => clearTimeout(t)
  }, [loadAssets])

  const categories = useMemo(() => {
    const fromStats = (stats?.by_category ?? []).map((c) => c.category)
    const fromAssets = assets.map((a) => a.category)
    return [...new Set([...fromStats, ...fromAssets].filter(Boolean))].sort()
  }, [stats, assets])

  const pageStartIndex = (page - 1) * PAGE_SIZE

  const years = useMemo(() => {
    const fromStats = (stats?.by_year ?? []).map((y) => y.year)
    const fromAssets = assets.map((a) => a.register_year)
    return [...new Set([...fromStats, ...fromAssets].filter(Boolean))].sort((a, b) => b - a)
  }, [stats, assets])

  const handleExportExcel = async () => {
    setExporting(true)
    setError('')
    try {
      const params = { page: 1, limit: 2000, ...resolveDateFilterQuery(datePeriod) }
      if (filterYear) params.register_year = filterYear
      if (filterCategory) params.category = filterCategory
      if (filterHealth) params.asset_health_status = filterHealth
      if (filterOldNotReplaced) params.old_not_replaced = '1'
      if (search.trim()) params.q = search.trim()
      const result = await assetTestApi.listAssets(params)
      const items = result.items ?? []
      const columns = TABLE_COLUMNS.filter((c) => c.key !== 'sn').map((c) => ({
        label: c.label,
        field: c.key,
        exportValue: (row) => {
          const idx = items.indexOf(row)
          if (c.key === 'sn') return idx + 1
          return c.render(row, idx)
        },
      }))
      const rows = items.map((a, idx) => {
        const o = { ...a }
        TABLE_COLUMNS.forEach((col) => {
          if (col.key === 'sn') o.sn = idx + 1
          else if (col.render) {
            const v = col.render(a, idx)
            o[col.key] = typeof v === 'object' && v?.props ? (a[col.key] || a.asset_health_status || '') : v
          }
        })
        return {
          ...o,
          name: a.asset_name || a.name,
          opening: rowFin(a).opening_amount,
          purchase: rowFin(a).unit_price,
          total_balance: rowFin(a).total_balance,
          accumulated: rowFin(a).accumulated_depreciation,
          dep_rate: a.dep_rate,
          annual_dep: rowFin(a).annual_dep,
          total_dep: rowFin(a).total_dep,
          net_book: rowFin(a).net_book_value,
          health: a.asset_health_status,
        }
      })
      await exportReportExcel({
        title: 'Asset Register Export',
        columns: [
          { label: 'S/N', field: 'sn' },
          { label: 'ASSET NAME', field: 'name' },
          { label: 'CATEGORY', field: 'category' },
          { label: 'OPENING STOCK', field: 'opening' },
          { label: 'PURCHASE PRICE', field: 'purchase' },
          { label: 'TOTAL BALANCE', field: 'total_balance' },
          { label: 'ACCUMULATED DEPRECIATION', field: 'accumulated' },
          { label: 'DEPRECIATION RATE', field: 'dep_rate' },
          { label: 'ANNUAL DEPRECIATION', field: 'annual_dep' },
          { label: 'TOTAL DEPRECIATION', field: 'total_dep' },
          { label: 'NET BOOK VALUE', field: 'net_book' },
          { label: 'HEALTH STATUS', field: 'health' },
        ],
        rows,
        filename: 'asset-register',
      })
    } catch (err) {
      setError(err?.message || 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  const handleSuccess = () => {
    setWizardOpen(false)
    refreshAll()
  }

  const handleConfirmImport = async ({ rows, skipDuplicates, registerYear, entryMode, firstTime, autoGenerateSku }) => {
    if (!rows.length) return
    setImportConfirming(true)
    setError('')
    setImportMsg('')
    try {
      const result = await assetTestApi.importAssets(rows, {
        registerYear,
        entryMode,
        firstTime,
        skipDuplicates,
        autoGenerateSku,
      })
      const created = result?.created ?? 0
      const failed = result?.failed ?? 0
      const skipped = result?.skipped ?? 0
      const errSample = (result?.errors ?? []).slice(0, 3).map((e) => `Row ${e.row}: ${e.message}`).join(' · ')
      let msg = `Imported ${created} of ${rows.length} asset(s) into FY ${registerYear}.`
      if (skipped) msg += ` ${skipped} skipped (duplicate SKU).`
      if (failed) msg += ` ${failed} failed.${errSample ? ` ${errSample}` : ''}`
      setImportMsg(msg)
      if (failed > 0 && result?.errors?.length) {
        setError(`Import errors (first ${Math.min(5, result.errors.length)}): ${result.errors.slice(0, 5).map((e) => `Row ${e.row}: ${e.message}`).join(' | ')}`)
      }
      setImportOpen(false)
      await refreshAll()
    } catch (err) {
      setError(err?.message || 'Import failed')
    } finally {
      setImportConfirming(false)
    }
  }

  const handleHealthStatusChange = async (row, healthStatus) => {
    setHealthUpdatingId(row.id)
    setError('')
    try {
      const updated = await assetTestApi.updateAssetHealthStatus(row.id, healthStatus)
      setAssets((prev) => prev.map((a) => (a.id === row.id ? { ...a, ...updated } : a)))
      return updated
    } catch (err) {
      setError(err?.message || 'Failed to update health status')
      throw err
    } finally {
      setHealthUpdatingId(null)
    }
  }

  const toggleRow = (id, e) => {
    e?.stopPropagation()
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const toggleAll = (e) => {
    e?.stopPropagation()
    const pageIds = assets.map((a) => a.id)
    const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id))
    if (allPageSelected) setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)))
    else setSelectedIds((prev) => [...new Set([...prev, ...pageIds])])
  }

  const handleDeleteOne = async (asset, e) => {
    e?.stopPropagation()
    const name = asset.asset_name || asset.name || asset.asset_code
    if (!window.confirm(`Delete asset "${name}"? This cannot be undone.`)) return
    setDeleting(true)
    setError('')
    try {
      await assetTestApi.deleteAsset(asset.id)
      setSelectedIds((prev) => prev.filter((id) => id !== asset.id))
      if (previewId === asset.id) closeAssetPreview()
      await refreshAll()
    } catch (err) {
      setError(err?.message || 'Failed to delete asset')
    } finally {
      setDeleting(false)
    }
  }

  const handleDeleteSelected = async () => {
    if (!selectedIds.length) return
    if (!window.confirm(`Delete ${selectedIds.length} selected asset(s)? This cannot be undone.`)) return
    setDeleting(true)
    setError('')
    try {
      await assetTestApi.bulkDelete({ ids: selectedIds })
      setSelectedIds([])
      closeAssetPreview()
      await refreshAll()
    } catch (err) {
      setError(err?.message || 'Failed to delete selected assets')
    } finally {
      setDeleting(false)
    }
  }

  const handleDeleteAll = async () => {
    if (!assets.length) return
    if (!window.confirm(
      `Delete ALL ${assets.length} asset(s) in this register? This removes every asset in the database. This cannot be undone.`
    )) return
    setDeleting(true)
    setError('')
    try {
      await assetTestApi.bulkDelete({ all: true })
      setSelectedIds([])
      closeAssetPreview()
      await refreshAll()
    } catch (err) {
      setError(err?.message || 'Failed to delete all assets')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6 min-w-0 max-w-full" style={{ fontFamily: "'Montserrat', sans-serif" }}>
      <AddAsset2
        open={wizardOpen || editAssetId != null}
        editAssetId={editAssetId}
        onClose={() => { setWizardOpen(false); setEditAssetId(null) }}
        onSuccess={handleSuccess}
      />
      <AssetTestImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onSuccess={handleConfirmImport}
        confirming={importConfirming}
      />

      <AssetSlideDrawer open={!!previewId} onClose={closeAssetPreview}>
        {previewId && (
          <AssetPreviewPanel
            assetId={previewId}
            onClose={closeAssetPreview}
          />
        )}
      </AssetSlideDrawer>

      {/* Hero header */}
      <div
        className="rounded-2xl p-6 sm:p-8 text-white relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #1a237e 55%, ${NAVY} 100%)` }}
      >
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10" style={{ background: AMBER, transform: 'translate(30%, -40%)' }} />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-widest mb-2">
              <Sparkles size={14} /> Asset Test Register
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold">Smart Asset Entry</h2>
            <p className="text-white/70 text-sm mt-2 max-w-xl">
              Register assets with automatic opening stock from financial year engine.
              Dedicated API · live ledger sync.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <button
              type="button"
              onClick={refreshAll}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-sm font-medium transition-colors"
            >
              <RefreshCw size={16} className={loading || statsLoading ? 'animate-spin' : ''} /> Refresh
            </button>
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={exporting || loading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-sm font-medium transition-colors border border-white/20 disabled:opacity-50"
            >
              {exporting ? <Loader2 size={16} className="animate-spin" /> : <FileSpreadsheet size={16} />}
              Export Excel
            </button>
            <button
              type="button"
              onClick={() => setImportOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-sm font-medium transition-colors border border-white/20"
            >
              <Upload size={16} /> Import Excel
            </button>
            <button
              type="button"
              onClick={() => { setEditAssetId(null); setWizardOpen(true) }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg transition-transform hover:scale-[1.02]"
              style={{ background: AMBER, color: NAVY }}
            >
              <Plus size={18} /> Add Asset
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Assets', value: stats?.total_count ?? '—', icon: Package, sub: 'Registered entries' },
          { label: 'Purchase Value', value: stats ? `RWF ${formatRwfPlain(stats.total_purchase)}` : '—', icon: Banknote, sub: 'Sum of unit prices' },
          { label: 'Net Book Value', value: stats ? `RWF ${formatRwfPlain(stats.total_net_book)}` : '—', icon: TrendingDown, sub: 'After depreciation' },
          { label: 'Active FY', value: stats?.active_financial_year ?? 'None', icon: Calendar, sub: stats?.active_year_status || 'Set up in Year Setup' },
        ].map((k) => (
          <div key={k.label} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <k.icon size={20} className="text-amber-500" />
              {statsLoading && <Loader2 size={14} className="animate-spin text-gray-300" />}
            </div>
            <p className="text-xl font-bold tabular-nums mt-3" style={{ color: NAVY }}>{k.value}</p>
            <p className="text-xs font-semibold text-gray-700 mt-0.5">{k.label}</p>
            <p className="text-[10px] text-gray-400 mt-1">{k.sub}</p>
          </div>
        ))}
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      )}

      {importMsg && !error && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{importMsg}</div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Layers size={16} className="text-amber-500" />
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Filters</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search name, code, label…"
              className="assets-wizard-input pl-9 w-full text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select className="assets-wizard-input w-full text-sm" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
            <option value="">All Categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="assets-wizard-input w-full text-sm" value={filterHealth} onChange={(e) => setFilterHealth(e.target.value)}>
            <option value="">All health statuses</option>
            {ASSET_HEALTH_STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select className="assets-wizard-input w-full text-sm" value={filterYear} onChange={(e) => setFilterYear(e.target.value)}>
            <option value="">All Financial Years</option>
            {years.map((y) => <option key={y} value={y}>FY {y}</option>)}
          </select>
        </div>
        <AssetOldNotReplacedFilter
          className="mt-3 pt-3 border-t border-slate-100"
          active={filterOldNotReplaced}
          onChange={(on) => {
            setFilterOldNotReplaced(on)
            if (on && !filterHealth) setFilterHealth(ASSET_HEALTH_STATUS_NOT_USED_OLD)
          }}
        />
        <div className="mt-4">
          <AssetDatePeriodFilter value={datePeriod} onChange={setDatePeriod} label="Purchase / register date" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 min-w-0 max-w-full">
        <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-sm" style={{ color: NAVY }}>Asset Register</h3>
            <p className="text-[10px] text-gray-400 mt-0.5">
              {selectedIds.length > 0 ? `${selectedIds.length} selected` : 'GET /school/assets/test'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {selectedIds.length > 0 && (
              <button
                type="button"
                onClick={handleDeleteSelected}
                disabled={deleting || loading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50"
              >
                {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Delete selected ({selectedIds.length})
              </button>
            )}
            {assets.length > 0 && (
              <button
                type="button"
                onClick={handleDeleteAll}
                disabled={deleting || loading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                <Trash2 size={14} /> Delete all
              </button>
            )}
            <span className="text-xs font-medium text-gray-500 tabular-nums">
              {loading ? 'Loading…' : `${total} record${total !== 1 ? 's' : ''}${totalPages > 1 ? ` · page ${page}/${totalPages}` : ''}`}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-20 text-gray-500">
            <Loader2 className="animate-spin text-amber-500" size={24} />
            <span className="text-sm font-medium">Fetching from database…</span>
          </div>
        ) : assets.length === 0 ? (
          <div className="py-20 text-center">
            <Package size={40} className="mx-auto text-gray-200 mb-3" />
            <p className="text-gray-500 font-medium">No assets found</p>
            <p className="text-sm text-gray-400 mt-1">Add your first asset to see it here instantly.</p>
            <button
              type="button"
              onClick={() => { setEditAssetId(null); setWizardOpen(true) }}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold"
              style={{ background: AMBER, color: NAVY }}
            >
              <Plus size={16} /> Add Asset
            </button>
          </div>
        ) : (
          <div
            className="w-full min-w-0 max-w-full overflow-x-auto overflow-y-visible overscroll-x-contain border-t border-gray-100"
            style={{ WebkitOverflowScrolling: 'touch', scrollbarGutter: 'stable' }}
          >
            <table className="text-xs w-max min-w-[2400px]">
              <thead>
                <tr style={{ background: NAVY }}>
                  <th className="px-3 py-2.5 w-10">
                    <input
                      type="checkbox"
                      checked={assets.length > 0 && assets.every((a) => selectedIds.includes(a.id))}
                      onChange={toggleAll}
                      className="rounded border-gray-300"
                      aria-label="Select all"
                    />
                  </th>
                  {TABLE_COLUMNS.map((col) => (
                    <th
                      key={col.key}
                      className={`px-3 py-2.5 text-left whitespace-nowrap font-bold uppercase tracking-wide text-[10px] text-white ${col.total ? 'text-amber-300' : ''}`}
                    >
                      {col.label}
                    </th>
                  ))}
                  <th className="px-3 py-2.5 text-left whitespace-nowrap font-bold uppercase tracking-wide text-[10px] text-white w-16">
                    actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {assets.map((asset, idx) => (
                  <tr
                    key={asset.id}
                    className={`hover:bg-amber-50/40 transition-colors cursor-pointer ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'} ${selectedIds.includes(asset.id) ? 'bg-amber-50/60' : ''} ${previewId === asset.id ? 'ring-2 ring-amber-400 ring-inset' : ''}`}
                    onClick={() => openAssetPreview(asset)}
                  >
                    <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(asset.id)}
                        onChange={(e) => toggleRow(asset.id, e)}
                        className="rounded border-gray-300"
                        aria-label={`Select ${asset.asset_name || asset.name}`}
                      />
                    </td>
                    {TABLE_COLUMNS.map((col) => (
                      <td
                        key={col.key}
                        className={`px-3 py-2.5 whitespace-nowrap tabular-nums ${col.num ? 'font-mono text-[11px]' : 'text-[11px]'} ${col.total ? 'font-bold' : ''} ${col.highlight ? 'text-emerald-800' : ''}`}
                        style={{ color: col.total && !col.highlight ? NAVY : undefined }}
                      >
                        {col.key === 'sn' ? pageStartIndex + idx + 1 : col.render(asset, idx)}
                      </td>
                    ))}
                    <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <AssetHealthStatusMenu
                          asset={asset}
                          onStatusChange={handleHealthStatusChange}
                          onEdit={(row) => {
                            setWizardOpen(false)
                            setEditAssetId(row.id)
                          }}
                          updating={healthUpdatingId === asset.id}
                        />
                        <button
                          type="button"
                          onClick={(e) => handleDeleteOne(asset, e)}
                          disabled={deleting}
                          title="Delete asset"
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 disabled:opacity-40 transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="px-4 py-2 text-[10px] text-gray-400 text-center border-t border-gray-50 bg-gray-50/50">
              Scroll horizontally to see all columns →
            </p>
          </div>
        )}

        {!loading && assets.length > 0 && (
          <TablePagination
            page={page}
            totalPages={totalPages}
            total={total}
            pageSize={PAGE_SIZE}
            itemCount={assets.length}
            pageStartIndex={pageStartIndex}
            onPageChange={setPage}
          />
        )}
      </div>

      {/* Category breakdown */}
      {stats?.by_category?.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="text-sm font-bold mb-4" style={{ color: NAVY }}>By Category</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {stats.by_category.map((c) => (
              <button
                key={c.category}
                type="button"
                onClick={() => setFilterCategory(c.category)}
                className="text-left rounded-xl border border-gray-100 p-3 hover:border-amber-300 hover:bg-amber-50/40 transition-all"
              >
                <p className="text-xs font-bold truncate" style={{ color: NAVY }}>{c.category}</p>
                <p className="text-lg font-bold tabular-nums mt-1">{c.count}</p>
                <p className="text-[10px] text-gray-400">RWF {formatRwfPlain(c.purchase_value)}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
