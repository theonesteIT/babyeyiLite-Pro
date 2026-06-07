import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Search, RefreshCw, Plus, Loader2, AlertCircle,
  CheckCircle2, Clock, Banknote, PackageOpen, Filter, X, SlidersHorizontal,
  ExternalLink, ChevronDown, ChevronUp,
} from 'lucide-react'
import assetsApi from '../../../assets_portal/services/assetsApi'
import { formatRwfPlain } from '../../../assets_portal/utils/financialYearUtils'
import { formatDateModern, normalizeDateOnly, EMPTY_DATE_PERIOD, resolveDateFilterQuery, countDatePeriodActive } from '../../../assets_portal/utils/assetsDateUtils'
import { assetsHref } from '../../../assets_portal/config/portal'
import { ASSET_HEALTH_STATUS_NOT_USED_OLD } from '../../../assets_portal/utils/assetsConstants'
import AssetReplacementModal from '../components/AssetReplacementModal'
import ViewReplacementModal from '../components/ViewReplacementModal'
import EditReplacementModal from '../components/EditReplacementModal'
import ReplacementActionsMenu from '../components/ReplacementActionsMenu'
import { AssetHealthStatusBadge } from '../components/AssetHealthStatusMenu'
import AssetDatePeriodFilter from '../components/AssetDatePeriodFilter'
import TablePagination from '../components/TablePagination'

const FONT = "'Montserrat', sans-serif"
const PAGE_SIZE = 20
const fmt = (v) => (v != null && v !== '' ? `RWF ${formatRwfPlain(v)}` : '—')

const REGISTER_OLD_NOT_REPLACED = `${assetsHref('asset-add-test')}?health=${encodeURIComponent(ASSET_HEALTH_STATUS_NOT_USED_OLD)}&old_not_replaced=1`

function KpiMoneyValue({ amount }) {
  const formatted = formatRwfPlain(amount ?? 0)
  return (
    <div className="min-w-0 flex-1" title={`RWF ${formatted}`}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600/70 leading-none mb-1">RWF</p>
      <p className="text-base sm:text-lg lg:text-xl font-bold tabular-nums text-blue-600 leading-snug break-all">
        {formatted}
      </p>
    </div>
  )
}

const EMPTY_FILTERS = { category: '', reason: '' }

function normalizeReplacement(row) {
  return {
    ...row,
    replacement_id: row.replacement_code || row.replacement_id,
    old_asset: row.old_asset_name || row.old_asset,
    new_asset: row.new_asset_name || row.new_asset,
    date: normalizeDateOnly(row.replacement_date || row.date),
    approvedBy: row.approved_by || row.approvedBy,
  }
}

function statusBadge(status) {
  const map = {
    Pending: 'bg-amber-100 text-amber-700',
    Completed: 'bg-emerald-100 text-emerald-700',
    Rejected: 'bg-red-100 text-red-700',
  }
  return map[status] || 'bg-gray-100 text-gray-600'
}

function countActiveFilters(f, datePeriod) {
  return [f.category, f.reason].filter(Boolean).length + countDatePeriodActive(datePeriod)
}

export default function Replacements() {
  const [createOpen, setCreateOpen] = useState(false)
  const [viewOpen, setViewOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [selected, setSelected] = useState(null)
  const [meta, setMeta] = useState(null)
  const [rows, setRows] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [datePeriod, setDatePeriod] = useState(EMPTY_DATE_PERIOD)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [showFilters, setShowFilters] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [showAwaitingPanel, setShowAwaitingPanel] = useState(false)
  const [awaitingAssets, setAwaitingAssets] = useState([])
  const [awaitingLoading, setAwaitingLoading] = useState(false)

  const loadAwaitingAssets = useCallback(() => {
    setAwaitingLoading(true)
    assetsApi.listAwaitingReplacementAssets()
      .then((list) => setAwaitingAssets(Array.isArray(list) ? list : []))
      .catch(() => setAwaitingAssets([]))
      .finally(() => setAwaitingLoading(false))
  }, [])

  const toggleAwaitingPanel = () => {
    setShowAwaitingPanel((open) => {
      const next = !open
      if (next && awaitingAssets.length === 0) loadAwaitingAssets()
      return next
    })
  }

  const loadReplacements = useCallback(() => {
    const params = { page, limit: PAGE_SIZE, ...resolveDateFilterQuery(datePeriod) }
    if (filters.category) params.category = filters.category
    if (filters.reason) params.reason = filters.reason
    if (search.trim()) params.q = search.trim()
    return assetsApi.listReplacements(params)
      .then((result) => {
        setRows((result.items ?? []).map(normalizeReplacement))
        setTotal(result.total ?? 0)
        setTotalPages(result.totalPages ?? 1)
      })
      .catch((err) => {
        setRows([])
        setTotal(0)
        setTotalPages(1)
        throw err
      })
  }, [page, filters, datePeriod, search])

  const loadAll = useCallback(() => {
    setLoading(true)
    setError('')
    Promise.all([
      loadReplacements(),
      assetsApi.getReplacementStats().catch(() => null),
      assetsApi.getReplacementMeta().catch(() => null),
    ])
      .then(([, st, metaData]) => {
        setStats(st)
        setMeta(metaData)
        if (showAwaitingPanel) loadAwaitingAssets()
      })
      .catch((err) => {
        setError(err.message || 'Failed to load replacements')
      })
      .finally(() => setLoading(false))
  }, [loadReplacements, showAwaitingPanel, loadAwaitingAssets])

  useEffect(() => { setPage(1) }, [search, filters, datePeriod])

  useEffect(() => {
    const t = setTimeout(() => { loadAll() }, 300)
    return () => clearTimeout(t)
  }, [loadAll])

  const categories = useMemo(() => {
    const fromMeta = meta?.categories || []
    const fromRows = rows.map((r) => r.category).filter(Boolean)
    return [...new Set([...fromMeta, ...fromRows])].sort()
  }, [meta, rows])

  const reasons = useMemo(() => {
    const fromMeta = meta?.reasons || []
    const fromRows = rows.map((r) => r.reason_raw || r.reason).filter(Boolean)
    return [...new Set([...fromMeta, ...fromRows])].sort()
  }, [meta, rows])

  const activeFilterCount = countActiveFilters(filters, datePeriod)
  const pageStartIndex = (page - 1) * PAGE_SIZE

  const openView = (row) => {
    setSelected(row)
    setViewOpen(true)
  }

  const openEdit = (row) => {
    setSelected(row)
    setEditOpen(true)
  }

  const handleApprove = async (row) => {
    const label = row.replacement_code || row.replacement_id
    if (!window.confirm(`Approve replacement ${label}? This will register the new asset and mark the old one as replaced.`)) return
    setBusyId(row.id)
    setError('')
    try {
      await assetsApi.approveReplacement(row.id)
      loadAll()
    } catch (err) {
      setError(err?.message || 'Approve failed')
    } finally {
      setBusyId(null)
    }
  }

  const handleReject = async (row) => {
    const label = row.replacement_code || row.replacement_id
    const note = window.prompt(`Reject replacement ${label}? Optional note:`)
    if (note === null) return
    setBusyId(row.id)
    setError('')
    try {
      await assetsApi.rejectReplacement(row.id, note.trim() ? { notes: note.trim() } : {})
      loadAll()
    } catch (err) {
      setError(err?.message || 'Reject failed')
    } finally {
      setBusyId(null)
    }
  }

  const handleDelete = async (row) => {
    if (row.status === 'Completed') {
      setError('Completed replacements cannot be deleted. Asset links remain in the register.')
      return
    }
    const label = row.replacement_code || row.replacement_id
    if (!window.confirm(`Delete replacement ${label}? This cannot be undone.`)) return

    setBusyId(row.id)
    setError('')
    try {
      await assetsApi.deleteReplacement(row.id)
      loadAll()
    } catch (err) {
      setError(err?.message || 'Delete failed')
    } finally {
      setBusyId(null)
    }
  }

  const clearFilters = () => {
    setFilters(EMPTY_FILTERS)
    setDatePeriod(EMPTY_DATE_PERIOD)
  }

  const kpiCards = [
    { key: 'total', label: 'Total Replacements', value: stats?.total ?? rows.length, icon: RefreshCw, tone: 'text-navy' },
    { key: 'pending', label: 'Pending Replacements', value: stats?.pending ?? 0, icon: Clock, tone: 'text-amber-600' },
    { key: 'completed', label: 'Completed Replacements', value: stats?.completed ?? 0, icon: CheckCircle2, tone: 'text-emerald-600' },
    { key: 'cost', label: 'Replacement Cost', money: stats?.replacement_cost ?? 0, icon: Banknote, tone: 'text-blue-600' },
    {
      key: 'awaiting',
      label: 'Assets Awaiting Replacement',
      sublabel: 'Not Used (Old) · not linked',
      value: stats?.awaiting_replacement ?? 0,
      icon: PackageOpen,
      tone: 'text-red-600',
      clickable: true,
    },
  ]

  return (
    <div className="space-y-6" style={{ fontFamily: FONT }}>
      <AssetReplacementModal open={createOpen} onClose={() => setCreateOpen(false)} onSuccess={loadAll} />
      <ViewReplacementModal open={viewOpen} onClose={() => { setViewOpen(false); setSelected(null) }} replacement={selected} />
      <EditReplacementModal
        open={editOpen}
        onClose={() => { setEditOpen(false); setSelected(null) }}
        onSuccess={loadAll}
        replacement={selected}
        meta={meta}
      />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-navy">Asset Replacement</h2>
          <p className="text-gray-500 text-sm mt-1 font-medium">
            Replace damaged, obsolete, or retired assets while preserving full history
          </p>
        </div>
        <button type="button" onClick={() => setCreateOpen(true)} className="btn-primary flex items-center gap-2 shadow-lg shadow-amber-500/20">
          <Plus size={18} /> Create Replacement
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertCircle size={16} /> {error}
          <button type="button" onClick={() => setError('')} className="ml-auto text-red-500 hover:text-red-700 text-xs font-semibold">Dismiss</button>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {kpiCards.map(({ key, label, sublabel, value, money, icon: Icon, tone, clickable }) => {
          const isAwaiting = key === 'awaiting'
          const active = isAwaiting && showAwaitingPanel
          const CardTag = clickable ? 'button' : 'div'
          return (
            <CardTag
              key={key}
              type={clickable ? 'button' : undefined}
              onClick={clickable ? toggleAwaitingPanel : undefined}
              className={`card py-4 px-5 hover:shadow-md transition-all text-left w-full ${
                clickable ? 'cursor-pointer hover:border-red-200' : ''
              } ${active ? 'ring-2 ring-red-300 border-red-100 bg-red-50/30' : ''}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  {money != null ? (
                    <KpiMoneyValue amount={money} />
                  ) : (
                    <p className={`text-xl sm:text-2xl font-bold tabular-nums ${tone}`}>{value}</p>
                  )}
                  <p className="text-[10px] sm:text-xs text-gray-500 font-medium mt-1 leading-tight">{label}</p>
                  {sublabel && (
                    <p className="text-[9px] text-red-500/80 font-medium mt-0.5 leading-tight">{sublabel}</p>
                  )}
                  {isAwaiting && (
                    <p className="text-[9px] text-gray-400 mt-1 flex items-center gap-0.5">
                      {active ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                      Click to {active ? 'hide' : 'view'} list
                    </p>
                  )}
                </div>
                <div className={`w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center shrink-0 ${active ? 'bg-red-100' : ''}`}>
                  <Icon size={18} className={tone} />
                </div>
              </div>
            </CardTag>
          )
        })}
      </div>

      {showAwaitingPanel && (
        <div className="bg-white rounded-xl shadow-sm border border-red-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-red-100 bg-red-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-navy">Old assets — not yet replaced</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Health status <strong>Not Used (Old)</strong> with no replacement link on the register
              </p>
            </div>
            <Link
              to={REGISTER_OLD_NOT_REPLACED}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white border border-gray-200 text-navy hover:bg-gray-50 shrink-0"
            >
              <ExternalLink size={13} /> Open in Asset Register
            </Link>
          </div>
          <div className="overflow-x-auto min-h-[120px]">
            {awaitingLoading ? (
              <div className="flex items-center justify-center py-12 text-gray-400 gap-2">
                <Loader2 size={20} className="animate-spin" /> Loading assets…
              </div>
            ) : awaitingAssets.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-12">No old assets awaiting replacement</p>
            ) : (
              <table className="w-full min-w-[640px]">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="table-header">Asset Code</th>
                    <th className="table-header">Name</th>
                    <th className="table-header">Category</th>
                    <th className="table-header">Health</th>
                    <th className="table-header">Status</th>
                    <th className="table-header">Net Book Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {awaitingAssets.map((a) => (
                    <tr key={a.id} className="hover:bg-gray-50">
                      <td className="table-cell font-mono text-xs">{a.asset_code || a.code}</td>
                      <td className="table-cell text-sm font-medium">{a.asset_name || a.name}</td>
                      <td className="table-cell text-sm">{a.category || '—'}</td>
                      <td className="table-cell"><AssetHealthStatusBadge value={a.asset_health_status} /></td>
                      <td className="table-cell text-sm">{a.status || a.assets_status || '—'}</td>
                      <td className="table-cell text-sm font-mono tabular-nums">{fmt(a.net_book_value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Search replacements…" className="input-field pl-10 text-sm w-full"
                value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setShowFilters((v) => !v)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                  showFilters || activeFilterCount
                    ? 'border-amber-300 bg-amber-50 text-amber-800'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <SlidersHorizontal size={14} />
                Filters
                {activeFilterCount > 0 && (
                  <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold">{activeFilterCount}</span>
                )}
              </button>
              <button type="button" onClick={loadAll} className="text-xs font-semibold text-amber-600 hover:text-amber-700 px-2">
                Refresh
              </button>
            </div>
          </div>

          {(showFilters || activeFilterCount > 0) && (
            <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                  <Filter size={13} /> Filter replacements
                </p>
                {activeFilterCount > 0 && (
                  <button type="button" onClick={clearFilters}
                    className="text-[11px] font-semibold text-red-500 hover:text-red-700 inline-flex items-center gap-1">
                    <X size={12} /> Clear all
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Category</label>
                  <select className="input-field text-sm w-full" value={filters.category}
                    onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}>
                    <option value="">All categories</option>
                    {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Reason</label>
                  <select className="input-field text-sm w-full" value={filters.reason}
                    onChange={(e) => setFilters((f) => ({ ...f, reason: e.target.value }))}>
                    <option value="">All reasons</option>
                    {reasons.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              <AssetDatePeriodFilter value={datePeriod} onChange={setDatePeriod} label="Replacement date" compact />
              {activeFilterCount > 0 && (
                <p className="text-[11px] text-gray-500 font-medium">
                  {total} replacement{total !== 1 ? 's' : ''} match your filters
                </p>
              )}
            </div>
          )}
        </div>

        <div className="overflow-x-auto min-h-[240px]">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-400 gap-2">
              <Loader2 size={22} className="animate-spin" /> Loading replacements…
            </div>
          ) : (
            <table className="w-full min-w-[980px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="table-header">Replacement ID</th>
                  <th className="table-header">Old Asset</th>
                  <th className="table-header">New Asset</th>
                  <th className="table-header">Category</th>
                  <th className="table-header">Date</th>
                  <th className="table-header">Reason</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Approved By</th>
                  <th className="table-header w-16 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.length === 0 ? (
                  <tr><td colSpan={9} className="table-cell text-center text-gray-400 py-12">No replacements found</td></tr>
                ) : rows.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="table-cell font-mono text-xs font-semibold text-navy">{r.replacement_id}</td>
                    <td className="table-cell">
                      <p className="font-medium text-sm text-navy">{r.old_asset}</p>
                      <p className="text-[10px] font-mono text-gray-400">{r.old_asset_code}</p>
                    </td>
                    <td className="table-cell">
                      <p className="font-medium text-sm text-navy">{r.new_asset || '—'}</p>
                      <p className="text-[10px] font-mono text-gray-400">{r.new_asset_code || '—'}</p>
                    </td>
                    <td className="table-cell text-sm">{r.category}</td>
                    <td className="table-cell text-sm">
                      <span title={r.date}>{formatDateModern(r.date) || '—'}</span>
                    </td>
                    <td className="table-cell text-sm text-gray-600 max-w-[140px] truncate" title={r.reason}>{r.reason}</td>
                    <td className="table-cell">
                      <div className="space-y-1.5">
                        <span className={`badge text-[10px] ${statusBadge(r.status)}`}>{r.status}</span>
                        {r.status === 'Pending' && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleApprove(r)}
                              disabled={busyId === r.id}
                              className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-700 hover:bg-emerald-200 disabled:opacity-50"
                            >
                              {busyId === r.id ? <Loader2 size={10} className="animate-spin" /> : <CheckCircle2 size={10} />}
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReject(r)}
                              disabled={busyId === r.id}
                              className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-100 text-red-600 hover:bg-red-200 disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="table-cell text-sm">{r.approvedBy || '—'}</td>
                    <td className="table-cell text-center">
                      <ReplacementActionsMenu
                        row={r}
                        busy={busyId === r.id}
                        onView={openView}
                        onEdit={openEdit}
                        onApprove={handleApprove}
                        onReject={handleReject}
                        onPrint={openView}
                        onDelete={handleDelete}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {!loading && rows.length > 0 && (
          <TablePagination
            page={page}
            totalPages={totalPages}
            total={total}
            pageSize={PAGE_SIZE}
            itemCount={rows.length}
            pageStartIndex={pageStartIndex}
            onPageChange={setPage}
          />
        )}
      </div>
    </div>
  )
}
