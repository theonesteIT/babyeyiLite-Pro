import { NavLink } from 'react-router-dom'
import { Camera, LayoutDashboard, LogOut, ClipboardList, Shield } from 'lucide-react'
import { useMasterAuth } from '../context/MasterAuthContext'

const NavItem = ({ icon: Icon, name, path, exact, badge, onClose }) => (
  <NavLink
    to={path}
    end={exact}
    onClick={onClose}
    className={({ isActive }) =>
      `relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 group text-[13px] font-bold ${
        isActive
          ? 'bg-gradient-to-r from-[#000435] to-[#0a116b] text-white shadow-lg shadow-[#000435]/20'
          : 'text-slate-500 hover:bg-[#000435]/5 hover:text-[#000435]'
      }`
    }
  >
    {({ isActive }) => (
      <>
        <div className={`flex items-center justify-center w-7 h-7 rounded-lg transition-all ${
          isActive ? 'bg-white/10' : 'bg-transparent group-hover:bg-[#000435]/8'
        }`}>
          <Icon
            size={15}
            strokeWidth={isActive ? 2.5 : 2}
            className={isActive ? 'text-[#f59e0b]' : 'text-slate-400 group-hover:text-[#000435] transition-colors'}
          />
        </div>
        <span className="flex-1 tracking-tight">{name}</span>
        {badge && (
          <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${
            isActive ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'
          }`}>
            {badge}
          </span>
        )}
        {isActive && (
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[#f59e0b] rounded-l-full" />
        )}
      </>
    )}
  </NavLink>
)

const SectionLabel = ({ label }) => (
  <p className="text-[9.5px] font-black tracking-[0.18em] uppercase text-slate-400/70 px-3.5 pt-5 pb-1.5">
    {label}
  </p>
)

const Divider = () => <div className="mx-3 my-2 h-px bg-slate-100" />

export default function GateKeeperSidebar({ onClose }) {
  const { user, roleCode, logout } = useMasterAuth()
  const initial = (user?.first_name || roleCode || 'G').charAt(0).toUpperCase()
  const fullName = user?.first_name
    ? `${user.first_name} ${user.last_name || ''}`.trim()
    : roleCode || 'Gate Officer'

  return (
    <div className="flex flex-col h-full bg-white border-r border-slate-100 shadow-xl shadow-slate-200/50">

      {/* Brand Header */}
      <div className="px-4 pt-4 pb-3 shrink-0">
        <div className="rounded-2xl bg-gradient-to-br from-[#000435] via-[#000c6e] to-[#0a116b] p-4 shadow-xl shadow-[#000435]/30 relative overflow-hidden">
          {/* Decorative circles */}
          <div className="absolute -top-4 -right-4 w-20 h-20 bg-white/5 rounded-full blur-md pointer-events-none" />
          <div className="absolute -bottom-3 -left-3 w-14 h-14 bg-[#f59e0b]/10 rounded-full blur-md pointer-events-none" />

          <div className="relative z-10 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#f59e0b] flex items-center justify-center shadow-lg shadow-[#f59e0b]/30 shrink-0">
              <Shield size={18} className="text-[#000435]" strokeWidth={2.5} />
            </div>
            <div>
              <span className="text-base font-black text-white tracking-tight block leading-none">
                EduGate
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#f59e0b]/90 mt-0.5 block">
                Gate Portal
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-3 pb-4">
        <nav className="space-y-0.5 pt-1">
          <NavItem
            icon={LayoutDashboard}
            name="Dashboard"
            path="/gatekeeper"
            exact
            onClose={onClose}
          />

          <SectionLabel label="Gate Operations" />

          <NavItem
            icon={Camera}
            name="Gate Scanner"
            path="/gatekeeper/scanner"
            onClose={onClose}
          />

          <NavItem
            icon={ClipboardList}
            name="Date Logs"
            path="/gatekeeper/logs"
            onClose={onClose}
          />
        </nav>
      </div>

      {/* User Footer */}
      <div className="shrink-0 p-3 border-t border-slate-100">
        <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-colors group">
          {/* Avatar */}
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-black shrink-0 shadow-md"
            style={{ background: 'linear-gradient(135deg, #000435, #0a116b)' }}
          >
            {initial}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-black text-[#000435] truncate leading-tight">{fullName}</p>
            <p className="text-[10px] font-semibold text-slate-400 truncate mt-0.5 leading-tight">
              {user?.school?.name || 'Gate Control'}
            </p>
          </div>

          {/* Logout */}
          <button
            onClick={logout}
            className="p-1.5 rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all shrink-0"
            title="Sign out"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}