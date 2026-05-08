import { useMemo, useState, useRef, useEffect } from 'react'
import { Bell, ChevronDown, Menu, Search, X } from 'lucide-react'
import { useLocation, Link } from 'react-router-dom'
import { useMasterAuth } from '../context/MasterAuthContext'

const BREADCRUMBS = {
  '/gatekeeper':         ['Gate Portal', 'Dashboard'],
  '/gatekeeper/scanner': ['Gate Portal', 'Gate Scanner'],
  '/gatekeeper/logs':    ['Gate Portal', 'Date Logs'],
}

export default function GateKeeperTopNav({ onMenuClick }) {
  const { user, roleCode } = useMasterAuth()
  const location = useLocation()
  const [searchOpen, setSearchOpen] = useState(false)
  const [search, setSearch]         = useState('')
  const searchRef                   = useRef(null)

  const crumbs  = BREADCRUMBS[location.pathname] || ['Gate Portal', 'Dashboard']
  const title   = crumbs[crumbs.length - 1]
  const initials = `${(user?.first_name || 'G')[0]}${(user?.last_name || 'K')[0]}`.toUpperCase()

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus()
  }, [searchOpen])

  return (
    <header className="h-14 flex items-center gap-3 px-4 md:px-5 bg-white/90 backdrop-blur-xl border-b border-slate-100 sticky top-0 z-20 shrink-0 shadow-sm shadow-slate-100/80">

      {/* Left: Hamburger + breadcrumb */}
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <button
          onClick={onMenuClick}
          className="lg:hidden w-8 h-8 flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-[#000435] transition-all shrink-0"
        >
          <Menu size={17} />
        </button>

        {/* Breadcrumb — desktop */}
        <div className="hidden lg:flex items-center gap-1.5 min-w-0">
          {crumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-slate-300 text-xs">/</span>}
              <span className={`text-[12px] font-black tracking-tight truncate ${
                i === crumbs.length - 1 ? 'text-[#000435]' : 'text-slate-400'
              }`}>
                {c}
              </span>
            </span>
          ))}
        </div>

        {/* Title — mobile */}
        <span className="lg:hidden text-[13px] font-black text-[#000435] tracking-tight truncate">{title}</span>
      </div>

      {/* Center: Search */}
      <div className="hidden sm:flex flex-1 max-w-xs">
        <div className="relative w-full group">
          <Search
            size={14}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#f59e0b] transition-colors"
          />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search students, logs…"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-[12px] font-semibold text-slate-700 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#f59e0b]/25 focus:border-[#f59e0b]/50 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Mobile search toggle */}
        <button
          onClick={() => setSearchOpen(o => !o)}
          className="sm:hidden w-8 h-8 flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 transition-all"
        >
          <Search size={16} />
        </button>

        {/* Notifications */}
        <button className="relative w-8 h-8 flex items-center justify-center rounded-xl text-slate-500 hover:bg-amber-50 hover:text-[#f59e0b] transition-all group">
          <Bell size={16} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 border-2 border-white rounded-full" />
        </button>

        <div className="w-px h-5 bg-slate-200 mx-0.5" />

        {/* User chip */}
        <button className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-xl hover:bg-slate-50 transition-all group">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[11px] font-black shadow-sm shrink-0"
            style={{ background: 'linear-gradient(135deg, #000435, #0a116b)' }}
          >
            {initials}
          </div>
          <div className="hidden md:block text-left">
            <p className="text-[11px] font-black text-[#000435] tracking-tight leading-none">
              {user?.first_name || roleCode || 'Gate Keeper'}
            </p>
            <p className="text-[9px] font-semibold text-slate-400 mt-0.5 leading-none">
              {user?.school?.name || 'Gate Control'}
            </p>
          </div>
          <ChevronDown size={12} className="text-slate-400 hidden md:block" />
        </button>
      </div>

      {/* Mobile search expandable bar */}
      {searchOpen && (
        <div className="sm:hidden absolute top-full left-0 right-0 bg-white border-b border-slate-100 px-4 py-2.5 shadow-lg z-30 flex items-center gap-2">
          <Search size={15} className="text-slate-400 shrink-0" />
          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search students, logs…"
            className="flex-1 text-[13px] font-semibold text-slate-700 outline-none placeholder:text-slate-400 bg-transparent"
          />
          <button onClick={() => { setSearchOpen(false); setSearch('') }} className="text-slate-400 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>
      )}
    </header>
  )
}