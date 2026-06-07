import { useMemo } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Shirt, Apple, Package, Truck, ShoppingCart, AlertTriangle,
  FileBarChart, Settings, ChevronLeft, ChevronRight, BarChart3, Bell, X, ClipboardList,
  LogOut, User,
} from 'lucide-react'
import { createPortalHref } from '../utils/href'
import { useAuth } from '../context/AuthContext'
import { PORTAL } from '../config/portal'
import { resolveUserPhotoUrl } from '../../../../shared/utils/userPhotoUrl'
import babyeyiIcon from '../assets/babyeyi-icon.png'

function NavItem({ to, label, icon: Icon, collapsed, onNavigate, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-[13px] font-medium tracking-tight border border-transparent ${
          isActive
            ? 'bg-[#FEBF10]/20 text-[#FEBF10] border-[#FEBF10]/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
            : 'text-white/72 hover:bg-white/[0.06] hover:text-white'
        } ${collapsed ? 'justify-center px-2' : ''}`
      }
      title={collapsed ? label : undefined}
    >
      <Icon size={18} strokeWidth={1.75} className="shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </NavLink>
  )
}

export default function Sidebar({
  collapsed = false,
  setCollapsed,
  onClose,
  basePath = '',
}) {
  const h = useMemo(() => createPortalHref(basePath), [basePath])
  const closeNav = () => onClose?.()
  const { staff, logout } = useAuth()
  const avatarPhoto = staff?.photo ? resolveUserPhotoUrl(staff.photo) : null
  const initials = staff
    ? `${(staff.first_name || '')[0] || ''}${(staff.last_name || '')[0] || ''}`.toUpperCase()
    : ''

  const navTop = [
    { to: h('/'), label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: h('/analytics'), label: 'Analytics', icon: BarChart3 },
    { to: h('/alerts'), label: 'Alerts', icon: Bell },
  ]

  const navInventory = [
    { to: h('/suppliers'), label: 'Suppliers', icon: Truck },
    { to: h('/purchase-requests'), label: 'Purchase Requests', icon: ShoppingCart },
    { to: h('/uniform-inventory'), label: 'Uniform Inventory', icon: Shirt },
    { to: h('/student-requirements'), label: 'Student Requirements', icon: ClipboardList },
    { to: h('/food-inventory'), label: 'Food Inventory', icon: Apple },
    { to: h('/other-inventory'), label: 'Other Inventory', icon: Package },
    { to: h('/stock-adjustments'), label: 'Stock Adjustments', icon: AlertTriangle },
  ]

  const navBottom = [
    { to: h('/reports'), label: 'Reports', icon: FileBarChart },
    { to: h('/settings'), label: 'Settings', icon: Settings },
  ]

  return (
    <aside
      className="flex flex-col h-full min-h-0 w-full border-r border-white/[0.06]"
      style={{ background: '#000435', fontFamily: "'Montserrat', sans-serif" }}
    >
      <div className="p-4 pb-3 shrink-0 border-b border-white/[0.06]">
        <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm overflow-hidden">
            <img src={babyeyiIcon} alt="Babyeyi" className="h-10 w-10 object-contain" />
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <span className="text-base font-medium tracking-tight text-white block leading-tight">
                Babyeyi
              </span>
              <p className="text-[10px] font-medium tracking-wide text-[#FEBF10] mt-0.5">
                Storekeeper portal
              </p>
            </div>
          )}
          {setCollapsed && (
            <button
              type="button"
              onClick={() => setCollapsed(!collapsed)}
              className={`hidden lg:flex items-center justify-center shrink-0 transition-all ${
                collapsed
                  ? 'w-8 h-8 rounded-lg bg-white/10 text-[#FEBF10] hover:bg-[#FEBF10]/20 hover:text-white ring-1 ring-white/10'
                  : 'p-1.5 hover:bg-white/10 rounded-lg text-white/70'
              }`}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <ChevronRight size={18} strokeWidth={2.5} /> : <ChevronLeft size={18} />}
            </button>
          )}
          {onClose && (
            <button
              type="button"
              onClick={closeNav}
              className="lg:hidden p-1.5 hover:bg-white/10 rounded-lg transition text-white/70 shrink-0 ml-auto"
              aria-label="Close menu"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      <nav
        className="storekeeper-sidebar-scroll flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-y-contain px-3 py-3 space-y-1"
        aria-label="Storekeeper navigation"
      >
        {!collapsed && (
          <p className="text-[10px] uppercase tracking-widest text-white/35 px-3 pb-1 font-medium">Main</p>
        )}
        {navTop.map((item) => (
          <NavItem key={item.to} {...item} collapsed={collapsed} onNavigate={closeNav} />
        ))}

        {!collapsed && <div className="border-t border-white/5 my-2" />}
        {!collapsed && (
          <p className="text-[10px] uppercase tracking-widest text-white/35 px-3 pb-1 font-medium">Inventory</p>
        )}
        {navInventory.map((item) => (
          <NavItem key={item.to} {...item} collapsed={collapsed} onNavigate={closeNav} />
        ))}

        {!collapsed && <div className="border-t border-white/5 my-2" />}
        {!collapsed && (
          <p className="text-[10px] uppercase tracking-widest text-white/35 px-3 pb-1 font-medium">Other</p>
        )}
        {navBottom.map((item) => (
          <NavItem key={item.to} {...item} collapsed={collapsed} onNavigate={closeNav} />
        ))}
      </nav>

      <div className={`p-3 border-t border-white/[0.06] shrink-0 ${collapsed ? 'flex justify-center' : ''}`}>
        {collapsed ? (
          <button
            type="button"
            onClick={() => void logout()}
            className="p-2 rounded-xl text-white/45 hover:text-red-300 hover:bg-white/5 transition-colors"
            aria-label="Log out"
            title="Sign out"
          >
            <LogOut size={18} strokeWidth={1.75} />
          </button>
        ) : (
          <div className="rounded-2xl bg-white/[0.06] ring-1 ring-white/10 p-3 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl overflow-hidden bg-white/10 flex items-center justify-center shrink-0 ring-1 ring-white/10 text-[11px] font-semibold text-white">
              {avatarPhoto ? (
                <img src={avatarPhoto} alt="" className="w-full h-full object-cover" />
              ) : initials ? (
                initials
              ) : (
                <User size={16} className="text-white/70" aria-hidden />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold text-white truncate capitalize">
                {staff?.first_name || PORTAL.profileFallback}
              </p>
              <p className="text-[10px] text-white/45 truncate font-medium">
                {staff?.role_name || PORTAL.roleLabel}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void logout()}
              className="p-2 rounded-xl text-white/45 hover:text-red-300 hover:bg-white/5 transition-colors"
              aria-label="Log out"
              title="Sign out"
            >
              <LogOut size={18} strokeWidth={1.75} />
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
