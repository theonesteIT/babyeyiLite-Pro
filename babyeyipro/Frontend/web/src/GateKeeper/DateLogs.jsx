import React, { useState, useMemo } from 'react'
import {
  Search, Filter, Download, ChevronLeft, ChevronRight,
  ArrowUpRight, ArrowDownLeft, ShieldOff, X, Calendar,
  SlidersHorizontal, RefreshCw
} from 'lucide-react'
import { useEffect } from 'react'
import { fetchGateScanLogs } from './gateApi'

// ─── Helpers ────────────────────────────────────────────────────────────────
function getPastDate(days) {
  const d = new Date(); d.setDate(d.getDate() - days)
  return d.toISOString().split('T')[0]
}
const today = new Date().toISOString().split('T')[0]
const yesterday = getPastDate(1)

// ─── Sub-components ──────────────────────────────────────────────────────────
function Avatar({ name }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const palettes = [
    'from-[#000435] to-[#0a116b]',
    'from-amber-500 to-orange-500',
    'from-emerald-500 to-teal-500',
    'from-blue-500 to-indigo-500',
    'from-purple-500 to-pink-500',
  ]
  const bg = palettes[name.charCodeAt(0) % palettes.length]
  return (
    <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${bg} flex items-center justify-center text-white text-[11px] font-black shrink-0 shadow-sm`}>
      {initials}
    </div>
  )
}

function ActionBadge({ action }) {
  if (action === 'EXIT') return <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-lg"><ArrowUpRight size={11} />Exit</span>
  if (action === 'RETURN') return <span className="inline-flex items-center gap-1 text-[10px] font-black text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-lg"><ArrowDownLeft size={11} />Return</span>
  return <span className="inline-flex items-center gap-1 text-[10px] font-black text-red-600 bg-red-50 border border-red-100 px-2.5 py-1 rounded-lg"><ShieldOff size={11} />Denied</span>
}

function StatusChip({ status }) {
  const cls = status.includes('Denied') || status === 'Overdue'
    ? 'bg-red-50 text-red-600 border-red-100'
    : status === 'Returned'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
      : 'bg-blue-50 text-blue-700 border-blue-100'
  const short = status.replace('Denied – ', '').replace('Denied', 'Denied')
  return <span className={`inline-block text-[9.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${cls} max-w-[140px] truncate`}>{short}</span>
}

function FilterChip({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1.5 bg-[#000435]/8 text-[#000435] text-[11px] font-black px-2.5 py-1 rounded-xl border border-[#000435]/10">
      {label}
      <button onClick={onRemove} className="hover:text-red-500 transition-colors ml-0.5">
        <X size={11} />
      </button>
    </span>
  )
}

// ─── Summary mini-bar ───────────────────────────────────────────────────────
function SummaryBar({ logs }) {
  const exits = logs.filter(l => l.action === 'EXIT').length
  const returns = logs.filter(l => l.action === 'RETURN').length
  const denied = logs.filter(l => l.status.includes('Denied')).length
  const total = logs.length
  if (total === 0) return null
  return (
    <div className="flex items-center gap-1.5 h-1.5 rounded-full overflow-hidden bg-slate-100 flex-1 max-w-xs">
      {exits > 0 && <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${(exits / total) * 100}%` }} />}
      {returns > 0 && <div className="h-full bg-blue-400   rounded-full" style={{ width: `${(returns / total) * 100}%` }} />}
      {denied > 0 && <div className="h-full bg-red-400    rounded-full" style={{ width: `${(denied / total) * 100}%` }} />}
    </div>
  )
}

// ─── Main DateLogs component ─────────────────────────────────────────────────
const PAGE_SIZE = 15

export default function DateLogs() {
  const [logs, setLogs] = useState([])
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [filterAction, setFilterAction] = useState('All')
  const [filterClass, setFilterClass] = useState('All')
  const [quickDate, setQuickDate] = useState('All')
  const [page, setPage] = useState(1)
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    let mounted = true
      ; (async () => {
        try {
          const json = await fetchGateScanLogs(500)
          const rows = Array.isArray(json?.data) ? json.data : []
          const mapped = rows.map((row) => {
            const dt = row.created_at ? new Date(row.created_at) : null
            const date = dt ? dt.toISOString().slice(0, 10) : ''
            const time = dt ? dt.toTimeString().slice(0, 5) : '--:--'
            const code = String(row.result_code || '')
            const isAllowed = code === 'EXIT_ALLOWED' || code === 'RETURN_ON_TIME'
            const isReturn = code.startsWith('RETURN_')
            return {
              id: row.id,
              date,
              time,
              student: row.student_name || 'Unknown Student',
              class: row.class_name || '—',
              action: isReturn ? 'RETURN' : (code === 'EXIT_ALLOWED' ? 'EXIT' : 'SCAN'),
              status: code === 'RETURN_EXCEEDED' ? `Denied – RETURN_EXCEEDED` : (isAllowed ? (isReturn ? 'Returned' : 'Allowed') : `Denied – ${code || 'UNKNOWN'}`),
              permId: '—',
            }
          })
          if (mounted) setLogs(mapped)
        } catch (_err) {
          if (mounted) setLogs([])
        }
      })()
    return () => { mounted = false }
  }, [])

  // Collect unique classes
  const allClasses = useMemo(() => {
    const s = new Set(logs.map(l => l.class).filter(Boolean))
    return ['All', ...Array.from(s).sort()]
  }, [logs])

  // Collect unique dates for date list
  const allDates = useMemo(() => {
    const s = new Set(logs.map(l => l.date))
    return Array.from(s).sort((a, b) => b.localeCompare(a))
  }, [logs])

  // Apply quick-date shortcuts
  const effectiveDateFrom = quickDate === 'Today' ? today
    : quickDate === 'Yesterday' ? yesterday
      : quickDate === 'Week' ? getPastDate(7)
        : dateFrom

  const effectiveDateTo = quickDate === 'Today' ? today
    : quickDate === 'Yesterday' ? yesterday
      : quickDate === 'Week' ? today
        : dateTo

  // Filtered logs
  const filtered = useMemo(() => {
    return logs.filter(log => {
      const matchSearch = !search || log.student.toLowerCase().includes(search.toLowerCase()) || log.class.toLowerCase().includes(search.toLowerCase()) || log.permId.toLowerCase().includes(search.toLowerCase())
      const matchAction = filterAction === 'All' || log.action === filterAction || (filterAction === 'DENIED' && log.status.includes('Denied'))
      const matchClass = filterClass === 'All' || log.class === filterClass
      const matchFrom = !effectiveDateFrom || log.date >= effectiveDateFrom
      const matchTo = !effectiveDateTo || log.date <= effectiveDateTo
      return matchSearch && matchAction && matchClass && matchFrom && matchTo
    })
  }, [logs, search, filterAction, filterClass, effectiveDateFrom, effectiveDateTo])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const exits = filtered.filter(l => l.action === 'EXIT').length
  const returns = filtered.filter(l => l.action === 'RETURN').length
  const denied = filtered.filter(l => l.status.includes('Denied')).length

  // Active filter count
  const activeFilters = [
    search,
    filterAction !== 'All' ? filterAction : '',
    filterClass !== 'All' ? filterClass : '',
    effectiveDateFrom,
    effectiveDateTo && effectiveDateTo !== effectiveDateFrom ? effectiveDateTo : '',
  ].filter(Boolean).length

  const resetFilters = () => {
    setSearch(''); setDateFrom(''); setDateTo('')
    setFilterAction('All'); setFilterClass('All'); setQuickDate('All'); setPage(1)
  }

  const handleExport = () => {
    const header = 'Date,Time,Student,Class,Action,Status,Permission ID\n'
    const rows = filtered.map(l => `${l.date},${l.time},"${l.student}",${l.class},${l.action},"${l.status}",${l.permId}`).join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'gate_logs.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="animate-in fade-in duration-700 bg-re-bg min-h-screen pb-14">
      {/* ── High-Fidelity Hero Section ── */}
      <div className="relative w-full min-h-[200px] sm:min-h-[220px] overflow-hidden bg-[#c87800]">
        <div className="absolute -top-28 -right-28 w-[22rem] h-[22rem] rounded-full border border-white/[0.07] pointer-events-none" aria-hidden />
        <div className="absolute -top-14 -right-14 w-[15rem] h-[15rem] rounded-full border border-white/[0.06] pointer-events-none" aria-hidden />
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#FEBF10]/30 to-transparent pointer-events-none" aria-hidden />

        <div className="relative z-10 max-w-[1400px] mx-auto px-4 sm:px-6 pt-10 sm:pt-12 pb-20 sm:pb-24 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1 max-w-3xl">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-5 h-1 rounded-full bg-[#FEBF10]" aria-hidden />
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#FEBF10]">Gate Portal</p>
            </div>
            <h1 className="text-xl md:text-3xl font-semibold text-white tracking-tight leading-none mb-1 mt-1 uppercase">
              Date Logs
            </h1>
            <p className="text-[10px] sm:text-[11px] font-medium text-white/60 tracking-wider">
              Full history of all gate events · {logs.length} total records
            </p>
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 bg-[#000435] text-white text-[12px] font-black px-4 py-2.5 rounded-xl hover:shadow-lg transition-colors shadow-md shadow-[#000435]/20 shrink-0"
          >
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 -mt-12 sm:-mt-16 relative z-20 space-y-5">

        {/* ── Summary KPIs ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Events', val: filtered.length, color: 'text-[#000435]', bg: 'bg-slate-50', border: 'border-slate-200' },
            { label: 'Exits', val: exits, color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-100' },
            { label: 'Returns', val: returns, color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-100' },
            { label: 'Denied', val: denied, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100' },
          ].map(({ label, val, color, bg, border }) => (
            <div key={label} className={`${bg} border ${border} rounded-2xl p-4 flex flex-col gap-1`}>
              <p className="text-[9.5px] font-black uppercase tracking-[0.14em] text-slate-400">{label}</p>
              <p className={`text-2xl font-black ${color} tracking-tight leading-none`}>{val}</p>
            </div>
          ))}
        </div>

        {/* ── Toolbar ── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">

          {/* Row 1: Search + filter toggle + export */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }}
                placeholder="Search student, class, permission ID…"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-9 pr-4 text-[12px] font-semibold text-slate-700 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#f59e0b]/25 focus:border-[#f59e0b]/50 focus:bg-white transition-all"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Filter toggle */}
            <button
              onClick={() => setShowFilters(f => !f)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-[12px] font-black transition-all ${showFilters || activeFilters > 0
                ? 'bg-[#000435] text-white border-[#000435] shadow-md'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
            >
              <SlidersHorizontal size={14} />
              Filters
              {activeFilters > 0 && (
                <span className={`text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center ${showFilters ? 'bg-white text-[#000435]' : 'bg-[#f59e0b] text-[#000435]'}`}>
                  {activeFilters}
                </span>
              )}
            </button>

            {activeFilters > 0 && (
              <button onClick={resetFilters} className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-[12px] font-black text-slate-500 hover:text-red-500 hover:bg-red-50 border border-transparent hover:border-red-100 transition-all">
                <RefreshCw size={13} /> Reset
              </button>
            )}
          </div>

          {/* Row 2: Quick date buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Quick:</span>
            {['All', 'Today', 'Yesterday', 'Week'].map(q => (
              <button
                key={q}
                onClick={() => { setQuickDate(q); setDateFrom(''); setDateTo(''); setPage(1) }}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-black border transition-all ${quickDate === q
                  ? 'bg-[#000435] text-white border-[#000435] shadow-sm'
                  : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                  }`}
              >
                {q === 'All' ? 'All Time' : q === 'Week' ? 'Last 7 Days' : q}
              </button>
            ))}
          </div>

          {/* Row 3: Expanded filters */}
          {showFilters && (
            <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {/* Action */}
              <div>
                <label className="block text-[9.5px] font-black uppercase tracking-[0.14em] text-slate-400 mb-1.5">Action</label>
                <select
                  value={filterAction}
                  onChange={e => { setFilterAction(e.target.value); setPage(1) }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-[12px] font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-[#f59e0b]/25 focus:border-[#f59e0b]/50"
                >
                  <option value="All">All Actions</option>
                  <option value="EXIT">Exit</option>
                  <option value="RETURN">Return</option>
                  <option value="DENIED">Denied</option>
                </select>
              </div>

              {/* Class */}
              <div>
                <label className="block text-[9.5px] font-black uppercase tracking-[0.14em] text-slate-400 mb-1.5">Class</label>
                <select
                  value={filterClass}
                  onChange={e => { setFilterClass(e.target.value); setPage(1) }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-[12px] font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-[#f59e0b]/25 focus:border-[#f59e0b]/50"
                >
                  {allClasses.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>

              {/* Date from */}
              <div>
                <label className="block text-[9.5px] font-black uppercase tracking-[0.14em] text-slate-400 mb-1.5">
                  <Calendar size={10} className="inline mr-1" />From Date
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={e => { setDateFrom(e.target.value); setQuickDate('All'); setPage(1) }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-[12px] font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-[#f59e0b]/25 focus:border-[#f59e0b]/50"
                />
              </div>

              {/* Date to */}
              <div>
                <label className="block text-[9.5px] font-black uppercase tracking-[0.14em] text-slate-400 mb-1.5">
                  <Calendar size={10} className="inline mr-1" />To Date
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={e => { setDateTo(e.target.value); setQuickDate('All'); setPage(1) }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-[12px] font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-[#f59e0b]/25 focus:border-[#f59e0b]/50"
                />
              </div>
            </div>
          )}

          {/* Active filter chips */}
          {activeFilters > 0 && (
            <div className="flex items-center gap-2 flex-wrap pt-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Active:</span>
              {search && <FilterChip label={`"${search}"`} onRemove={() => setSearch('')} />}
              {filterAction !== 'All' && <FilterChip label={filterAction} onRemove={() => setFilterAction('All')} />}
              {filterClass !== 'All' && <FilterChip label={filterClass} onRemove={() => setFilterClass('All')} />}
              {effectiveDateFrom && <FilterChip label={`From ${effectiveDateFrom}`} onRemove={() => { setDateFrom(''); setQuickDate('All') }} />}
              {effectiveDateTo && effectiveDateTo !== effectiveDateFrom && <FilterChip label={`To ${effectiveDateTo}`} onRemove={() => { setDateTo(''); setQuickDate('All') }} />}
            </div>
          )}
        </div>

        {/* ── Table ── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">

          {/* Table header row */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <p className="text-[13px] font-black text-[#000435]">
                {filtered.length} record{filtered.length !== 1 ? 's' : ''}
              </p>
              <SummaryBar logs={filtered} />
            </div>
            <p className="text-[11px] font-semibold text-slate-400">Page {page} of {totalPages}</p>
          </div>

          {/* Desktop Table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/80">
                  {['Student', 'Class', 'Date', 'Time', 'Action', 'Status', 'Permission ID'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-[9.5px] font-black uppercase tracking-[0.12em] text-slate-400 whitespace-nowrap border-b border-slate-100">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-14 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
                          <Filter size={20} className="text-slate-400" />
                        </div>
                        <p className="text-[13px] font-black text-slate-400">No logs match your filters</p>
                        <button onClick={resetFilters} className="text-[12px] font-black text-[#000435] hover:text-[#f59e0b] transition-colors">
                          Reset filters
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : paginated.map((log, i) => (
                  <tr
                    key={log.id}
                    className={`hover:bg-slate-50/80 transition-colors ${log.status.includes('Denied') ? 'bg-red-50/20' : log.status === 'Overdue' ? 'bg-amber-50/20' : ''}`}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar name={log.student} />
                        <p className="text-[12px] font-black text-[#000435] whitespace-nowrap">{log.student}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">{log.class}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap">
                        {log.date === today ? <span className="text-[#f59e0b] font-black">Today</span> : log.date === yesterday ? 'Yesterday' : log.date}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-[12px] font-black text-[#000435] tabular-nums">{log.time}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <ActionBadge action={log.action} />
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusChip status={log.status} />
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`text-[10px] font-black font-mono ${log.permId === '—' ? 'text-slate-300' : 'text-[#000435]/60'}`}>
                        {log.permId}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card list */}
          <div className="sm:hidden divide-y divide-slate-50">
            {paginated.length === 0 ? (
              <div className="px-5 py-10 text-center space-y-2">
                <p className="text-[13px] font-black text-slate-400">No logs found</p>
                <button onClick={resetFilters} className="text-[12px] font-black text-[#000435]">Reset filters</button>
              </div>
            ) : paginated.map(log => (
              <div key={log.id} className={`px-5 py-4 hover:bg-slate-50 transition-colors ${log.status.includes('Denied') ? 'bg-red-50/20' : ''}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={log.student} />
                    <div>
                      <p className="text-[13px] font-black text-[#000435] leading-none">{log.student}</p>
                      <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">{log.class}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[11px] font-black text-slate-500 tabular-nums">
                      {log.date === today ? 'Today' : log.date === yesterday ? 'Yesterday' : log.date} {log.time}
                    </p>
                    <div className="mt-1.5 flex items-center gap-1.5 justify-end flex-wrap">
                      <ActionBadge action={log.action} />
                    </div>
                  </div>
                </div>
                <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                  <StatusChip status={log.status} />
                  {log.permId !== '—' && (
                    <span className="text-[10px] font-black text-[#000435]/40 font-mono">{log.permId}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* ── Pagination ── */}
          {totalPages > 1 && (
            <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between gap-3 flex-wrap">
              <p className="text-[11px] font-semibold text-slate-400">
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="w-8 h-8 flex items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft size={15} />
                </button>

                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let p
                  if (totalPages <= 5) p = i + 1
                  else if (page <= 3) p = i + 1
                  else if (page >= totalPages - 2) p = totalPages - 4 + i
                  else p = page - 2 + i
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-8 h-8 flex items-center justify-center rounded-xl text-[12px] font-black border transition-all ${p === page
                        ? 'bg-[#000435] text-white border-[#000435] shadow-md'
                        : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                        }`}
                    >
                      {p}
                    </button>
                  )
                })}

                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="w-8 h-8 flex items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}