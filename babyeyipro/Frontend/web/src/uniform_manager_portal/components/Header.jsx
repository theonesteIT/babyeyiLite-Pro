import { Menu, Bell } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Header({ setMobileOpen }) {
  const { staff } = useAuth()
  const displayName = [staff?.first_name, staff?.last_name].filter(Boolean).join(' ')
    || staff?.full_name
    || 'Uniform Manager'
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .map((s) => s[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'UM'

  return (
    <header
      className="h-14 flex items-center justify-between px-4 md:px-6 bg-white/80 backdrop-blur-xl border-b border-black/5 sticky top-0 z-20 shrink-0"
      style={{ fontFamily: "'Montserrat', sans-serif" }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="lg:hidden p-2 text-re-text-muted hover:bg-re-navy/5 hover:text-re-navy rounded-xl transition-all shrink-0"
          aria-label="Open menu"
        >
          <Menu size={18} />
        </button>
        <p className="text-sm font-medium text-re-text truncate lg:hidden">Uniform Manager</p>
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
            <p className="text-[11px] text-re-text-muted truncate">{staff?.email || 'Uniform portal'}</p>
          </div>
        </div>
      </div>
    </header>
  )
}
