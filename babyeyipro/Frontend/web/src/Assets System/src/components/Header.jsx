import { Menu, Bell, Search } from 'lucide-react'
import { useAuth } from '../../../assets_portal/context/AuthContext'

export default function Header({ setMobileOpen, title = 'Asset Management' }) {
  const { staff } = useAuth()
  const displayName = [staff?.first_name, staff?.last_name].filter(Boolean).join(' ')
    || staff?.full_name
    || 'Assets Manager'
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .map((s) => s[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'AM'

  return (
    <header
      className="h-14 sm:h-16 bg-white/95 backdrop-blur-md border-b border-black/5 flex items-center justify-between px-3 sm:px-4 lg:px-6 shrink-0 z-20"
      style={{ fontFamily: "'Montserrat', sans-serif" }}
    >
      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="lg:hidden p-2 hover:bg-re-bg rounded-xl transition shrink-0"
          aria-label="Open menu"
        >
          <Menu size={20} className="text-re-text" />
        </button>
        <p className="text-sm sm:text-base font-medium text-re-text truncate lg:hidden">{title}</p>
        <div className="hidden sm:flex items-center gap-2 bg-re-bg border border-black/5 rounded-xl px-3 py-2 w-full max-w-xs lg:max-w-sm">
          <Search size={16} className="text-re-text-muted shrink-0" />
          <input
            type="search"
            placeholder="Search assets…"
            className="bg-transparent border-none outline-none text-[12px] w-full text-re-text placeholder:text-re-text-muted font-medium min-w-0"
          />
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <button
          type="button"
          className="relative p-2 hover:bg-re-bg rounded-xl transition"
          aria-label="Notifications"
        >
          <Bell size={20} className="text-re-text-muted" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#FEBF10] rounded-full" />
        </button>
        <div className="flex items-center gap-2 pl-2 sm:pl-3 border-l border-black/5">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#FEBF10]/25 border border-[#FEBF10]/40 flex items-center justify-center text-re-text font-medium text-xs sm:text-sm">
            {initials}
          </div>
          <div className="hidden md:block min-w-0">
            <p className="text-sm font-medium text-re-text truncate">{displayName}</p>
            <p className="text-[11px] text-re-text-muted truncate">{staff?.email || 'Assets portal'}</p>
          </div>
        </div>
      </div>
    </header>
  )
}
