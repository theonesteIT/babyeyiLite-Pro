import { useMemo, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Boxes,
  ArrowLeftRight,
  ClipboardCheck,
  QrCode,
  Settings,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  LogOut,
  X,
  Headphones,
  PlusCircle,
  FolderTree,
  UserCheck,
  Undo2,
  Wrench,
  ShieldCheck,
  Award,
  TrendingDown,
  AlertTriangle,
  Trash2,
  BarChart3,
  Bell,
  Users,
} from 'lucide-react'

const PATH_ICONS = {
  inventory: Boxes,
  'add-asset': PlusCircle,
  categories: FolderTree,
  assignments: UserCheck,
  returns: Undo2,
  transfers: ArrowLeftRight,
  maintenance: Wrench,
  preventive: ShieldCheck,
  warranty: Award,
  depreciation: TrendingDown,
  audit: ClipboardCheck,
  'lost-damaged': AlertTriangle,
  disposal: Trash2,
  'qr-barcode': QrCode,
  reports: BarChart3,
  analytics: BarChart3,
  notifications: Bell,
  users: Users,
  settings: Settings,
}
import { useAuth } from '../../../assets_portal/context/AuthContext'
import { assetsHref } from '../../../assets_portal/config/portal'
import babyeyiIcon from '../../../storekeeper_portal/frontend/src/assets/babyeyi-icon.png'

const NAV_GROUPS = [
  {
    id: 'assets',
    label: 'Asset Management',
    icon: Boxes,
    items: [
      { name: 'Asset Inventory', path: 'inventory' },
      { name: 'Analytics', path: 'analytics' },
      { name: 'Categories', path: 'categories' },
    ],
  },
  {
    id: 'operations',
    label: 'Operations',
    icon: ArrowLeftRight,
    items: [
      { name: 'Assignments', path: 'assignments' },
      { name: 'Returns', path: 'returns' },
      { name: 'Transfers', path: 'transfers' },
      { name: 'Maintenance', path: 'maintenance' },
      
    ],
  },
  // {
  //   id: 'compliance',
  //   label: 'Compliance',
  //   icon: ClipboardCheck,
  //   items: [
  //     { name: 'Warranties', path: 'warranty' },
  //     { name: 'Depreciation', path: 'depreciation' },
  //     { name: 'Audit', path: 'audit' },
  //     { name: 'Lost & Damaged', path: 'lost-damaged' },
  //     { name: 'Disposal', path: 'disposal' },
  //   ],
  // },
  // {
  //   id: 'tools',
  //   label: 'Tools',
  //   icon: QrCode,
  //   items: [
  //     { name: 'QR & Barcode', path: 'qr-barcode' },
  //     { name: 'Reports', path: 'reports' },
  //     { name: 'Notifications', path: 'notifications' },
  //   ],
  // },
  // {
  //   id: 'admin',
  //   label: 'Administration',
  //   icon: Settings,
  //   items: [
  //     { name: 'Users & Roles', path: 'users' },
  //     { name: 'Settings', path: 'settings' },
  //   ],
  // },
]

function assetsPathMatches(pathname, segment) {
  if (!segment) {
    return /\/assets\/?$/.test(pathname) || pathname.endsWith('/assets')
  }
  const escaped = segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`/assets/${escaped}(/|$)`).test(pathname)
}

function SubNavLink({ name, path, onClose }) {
  return (
    <NavLink
      to={assetsHref(`/${path}`)}
      onClick={onClose}
      className={({ isActive }) =>
        `flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-all ${
          isActive
            ? 'text-[#FEBF10] bg-white/[0.08]'
            : 'text-white/60 hover:text-white hover:bg-white/[0.05]'
        }`
      }
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-white/30 aria-[current=page]:bg-[#FEBF10]" aria-hidden />
      <span className="truncate flex-1">{name}</span>
    </NavLink>
  )
}

function NavGroup({ group, onClose, location, defaultOpen = false }) {
  const isAnyActive = group.items.some((item) => assetsPathMatches(location.pathname, item.path))
  const [open, setOpen] = useState(defaultOpen || isAnyActive)
  const GroupIcon = group.icon

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-[13px] font-medium tracking-tight group border border-transparent
          ${
            isAnyActive
              ? 'bg-white/[0.12] text-[#FEBF10] border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
              : 'text-white/72 hover:bg-white/[0.06] hover:text-white'
          }`}
      >
        <GroupIcon
          size={18}
          strokeWidth={1.75}
          className={`${
            isAnyActive ? 'text-[#FEBF10]' : 'text-white/45 group-hover:text-white/85'
          } transition-colors shrink-0`}
        />
        <span className="flex-1 text-left truncate">{group.label}</span>
        <ChevronDown
          size={16}
          strokeWidth={2}
          className={`transition-transform duration-300 text-white/40 shrink-0 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="ml-2 mt-1 space-y-0.5 border-l border-white/15 pl-3">
          {group.items.map((item) => (
            <SubNavLink key={item.path} name={item.name} path={item.path} onClose={onClose} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function Sidebar({ collapsed = false, setCollapsed, onClose }) {
  const location = useLocation()
  const { staff, logout } = useAuth()
  const [menuQuery, setMenuQuery] = useState('')
  const closeNav = () => onClose?.()

  const filteredGroups = useMemo(() => {
    const q = menuQuery.trim().toLowerCase()
    if (!q) return NAV_GROUPS
    return NAV_GROUPS.map((group) => {
      const labelMatch = group.label.toLowerCase().includes(q)
      const items = group.items.filter(
        (item) => labelMatch || item.name.toLowerCase().includes(q)
      )
      if (!items.length) return null
      return { ...group, items }
    }).filter(Boolean)
  }, [menuQuery])

  const dashboardActive = assetsPathMatches(location.pathname, '')

  const displayName = [staff?.first_name, staff?.last_name].filter(Boolean).join(' ')
    || staff?.full_name
    || staff?.name
    || 'Assets Manager'

  const roleLabel = staff?.role_name || staff?.role?.name || 'Assets Manager'
  const email = staff?.email || staff?.username || ''

  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .map((s) => s[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'AM'

  return (
    <aside
      className="flex flex-col min-h-0 h-full w-full min-w-0 border-r border-white/[0.06] shadow-sm font-sans"
      style={{ background: '#000435', colorScheme: 'dark', fontFamily: "'Montserrat', sans-serif" }}
    >
      <div className="p-4 pb-3 shrink-0 border-b border-white/[0.06]">
        <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm overflow-hidden">
            <img src={babyeyiIcon} alt="Babyeyi" className="h-10 w-10 object-contain" />
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <span className="text-base font-semibold tracking-tight text-white block leading-tight">
                Babyeyi
              </span>
              <p className="text-[10px] font-medium tracking-wide text-[#FEBF10] mt-0.5">
                Assets Manager portal
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

      {!collapsed && (
        <div className="px-3 pt-3 shrink-0">
          <div className="relative">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-white/35 pointer-events-none"
              aria-hidden
            />
            <input
              type="search"
              value={menuQuery}
              onChange={(e) => setMenuQuery(e.target.value)}
              placeholder="Search menu…"
              className="w-full rounded-xl border border-white/10 bg-white/[0.06] py-2 pl-9 pr-3 text-[12px] font-medium text-white placeholder:text-white/35 focus:outline-none focus:border-white/20 focus:bg-white/[0.08]"
              aria-label="Search menu"
            />
          </div>
        </div>
      )}

      <nav
        className="assets-sidebar-scroll flex-1 min-h-0 px-3 py-3 overflow-y-auto overflow-x-hidden overscroll-y-contain space-y-1 pr-1"
        aria-label="Assets navigation"
      >
        <NavLink
          to={assetsHref('/')}
          end
          onClick={closeNav}
          className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-[13px] font-medium tracking-tight border border-transparent ${
            collapsed ? 'justify-center px-2' : ''
          } ${
            dashboardActive
              ? 'bg-white/[0.12] text-[#FEBF10] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] border-white/10'
              : 'text-white/72 hover:bg-white/[0.06] hover:text-white'
          }`}
          title={collapsed ? 'Dashboard' : undefined}
        >
          <LayoutDashboard
            size={18}
            strokeWidth={1.75}
            className={`shrink-0 ${dashboardActive ? 'text-[#FEBF10]' : 'text-white/45'}`}
          />
          {!collapsed && <span className="truncate">Dashboard</span>}
        </NavLink>

        {!collapsed && (
          filteredGroups.length === 0 ? (
            <p className="px-3 py-4 text-[12px] text-white/45">No menu items match your search.</p>
          ) : (
            filteredGroups.map((group) => (
              <NavGroup
                key={`${group.id}-${menuQuery}`}
                group={group}
                onClose={closeNav}
                location={location}
                defaultOpen={!!menuQuery.trim()}
              />
            ))
          )
        )}

        {collapsed && (
          <div className="space-y-1 pt-1">
            {NAV_GROUPS.flatMap((g) => g.items).map((item) => {
              const Icon = PATH_ICONS[item.path] || Boxes
              return (
                <NavLink
                  key={item.path}
                  to={assetsHref(`/${item.path}`)}
                  onClick={closeNav}
                  title={item.name}
                  className={({ isActive }) =>
                    `flex justify-center p-2.5 rounded-xl transition-all ${
                      isActive ? 'bg-[#FEBF10]/20 text-[#FEBF10]' : 'text-white/50 hover:bg-white/[0.06] hover:text-white'
                    }`
                  }
                >
                  <Icon size={18} strokeWidth={1.75} />
                </NavLink>
              )
            })}
          </div>
        )}
      </nav>

      {collapsed && (
        <div className="p-3 shrink-0 border-t border-white/[0.06] flex flex-col items-center gap-2">
          <div
            className="w-9 h-9 rounded-xl bg-[#FEBF10]/20 flex items-center justify-center text-[#FEBF10] text-xs font-bold ring-1 ring-white/10"
            title={displayName}
          >
            {initials}
          </div>
          <button
            type="button"
            onClick={logout}
            className="p-2 rounded-xl text-white/45 hover:text-red-300 hover:bg-white/5 transition-colors"
            aria-label="Log out"
          >
            <LogOut size={18} strokeWidth={1.75} />
          </button>
        </div>
      )}

      {!collapsed && (
        <div className="p-4 pt-2 shrink-0 border-t border-white/[0.06] space-y-3">
          <div className="rounded-2xl bg-[#060d1f]/90 ring-1 ring-white/10 p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FEBF10]/15 ring-1 ring-[#FEBF10]/25">
                <Headphones className="text-[#FEBF10]" size={20} strokeWidth={1.75} aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white">Help &amp; support</p>
                <p className="text-[12px] text-white/55 mt-1 leading-snug">
                  Contact your school admin for asset register or disposal approvals.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white/[0.06] ring-1 ring-white/10 p-3 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl overflow-hidden bg-[#FEBF10]/20 flex items-center justify-center shrink-0 ring-1 ring-white/10 text-[#FEBF10] text-xs font-bold">
              {staff?.photo ? (
                <img src={staff.photo} alt="" className="w-full h-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-medium text-white truncate">{displayName}</p>
              <p className="text-[10px] text-white/45 truncate font-medium">{roleLabel}</p>
              {email ? (
                <p className="text-[10px] text-white/35 truncate">{email}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={logout}
              className="p-2 rounded-xl text-white/45 hover:text-red-300 hover:bg-white/5 transition-colors"
              aria-label="Log out"
            >
              <LogOut size={18} strokeWidth={1.75} />
            </button>
          </div>
        </div>
      )}
    </aside>
  )
}
