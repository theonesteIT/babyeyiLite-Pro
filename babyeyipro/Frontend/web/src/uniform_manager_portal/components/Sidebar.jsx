import { useMemo, useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Shirt,
  Settings,
  FileBarChart,
  Package,
  DollarSign,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  LogOut,
  X,
  Headphones,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { uniformHref } from '../config/portal'
import { INVENTORY_REPORTS, FINANCIAL_REPORTS } from '../config/reportCatalog'
import babyeyiIcon from '../../storekeeper_portal/frontend/src/assets/babyeyi-icon.png'

function reportNavPath(report) {
  if (report.legacyRoute) return 'reports/general-stock'
  return `reports/${report.slug}`
}

const INVENTORY_REPORT_ITEMS = INVENTORY_REPORTS.map((r) => ({
  name: r.title,
  path: reportNavPath(r),
}))

const FINANCIAL_REPORT_ITEMS = FINANCIAL_REPORTS.map((r) => ({
  name: r.title,
  path: reportNavPath(r),
}))

const NAV_GROUPS = [
  {
    id: 'inventory-reports',
    label: 'Inventory Reports',
    icon: Package,
    kind: 'path',
    items: INVENTORY_REPORT_ITEMS,
  },
  {
    id: 'financial-reports',
    label: 'Financial Reports',
    icon: DollarSign,
    kind: 'path',
    items: FINANCIAL_REPORT_ITEMS,
  },
  {
    id: 'inventory',
    label: 'Uniform Inventory',
    icon: Shirt,
    kind: 'inventory',
    items: [
      { name: 'Overview', tab: 'dashboard' },
      { name: 'Fabric Stock In', tab: 'fabric-in' },
      { name: 'Fabric Stock Out', tab: 'fabric-out' },
      { name: 'Fabric Stock', tab: 'fabric-stock' },
      { name: 'Fabric Planner', tab: 'fabric-planner' },
      { name: 'Finished Goods', tab: 'finished-goods' },
      { name: 'Issue Uniform', tab: 'issue' },
      { name: 'Sales Analytics', tab: 'sales' },
    ],
  },
]

function isReportActive(location, path) {
  const segment = path.split('/').pop()
  return location.pathname.includes(`/${path}`)
    || (segment && location.pathname.endsWith(`/${segment}`))
}

function isReportsHubActive(location) {
  return /\/uniform-manager\/reports\/?$/.test(location.pathname)
    || location.pathname.endsWith('/uniform-manager/reports')
}

function currentInventoryTab(location) {
  if (!location.pathname.includes('/inventory')) return null
  return new URLSearchParams(location.search).get('tab') || 'dashboard'
}

function isInventoryItemActive(location, item) {
  const tab = currentInventoryTab(location)
  if (tab === null) return false
  return tab === item.tab
}

function isInventorySectionActive(location) {
  return location.pathname.includes('/inventory')
}

function uniformPathMatches(pathname, segment) {
  if (!segment) {
    return /\/uniform-manager\/?$/.test(pathname) || pathname.endsWith('/uniform-manager')
  }
  const base = segment.split('?')[0]
  const escaped = base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`/uniform-manager/${escaped}(/|$|\\?)`).test(pathname)
}

function inventoryItemHref(item) {
  if (!item.tab || item.tab === 'dashboard') return uniformHref('/inventory')
  return uniformHref(`/inventory?tab=${item.tab}`)
}

function isGroupActive(location, group) {
  if (group.kind === 'path') {
    return group.items.some((item) => isReportActive(location, item.path))
  }
  return isInventorySectionActive(location)
}

function itemHref(group, item) {
  if (group.kind === 'path') return uniformHref(`/${item.path}`)
  return inventoryItemHref(item)
}

function isItemActive(location, group, item) {
  if (group.kind === 'path') return isReportActive(location, item.path)
  return isInventoryItemActive(location, item)
}

function SubNavLink({ name, item, group, onClose, location }) {
  const active = isItemActive(location, group, item)
  return (
    <NavLink
      to={itemHref(group, item)}
      onClick={onClose}
      className={() =>
        `flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-all ${
          active
            ? 'text-[#FEBF10] bg-white/[0.10] ring-1 ring-[#FEBF10]/20'
            : 'text-white/60 hover:text-white hover:bg-white/[0.05]'
        }`
      }
    >
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${active ? 'bg-[#FEBF10]' : 'bg-white/30'}`}
        aria-hidden
      />
      <span className="truncate flex-1">{name}</span>
    </NavLink>
  )
}

function NavGroup({ group, onClose, location, defaultOpen = false }) {
  const isAnyActive = isGroupActive(location, group)
  const [open, setOpen] = useState(defaultOpen || isAnyActive)
  const GroupIcon = group.icon

  useEffect(() => {
    if (isAnyActive) setOpen(true)
  }, [isAnyActive])

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-[13px] font-medium tracking-tight group border border-transparent ${
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
            <SubNavLink
              key={item.tab || item.path}
              name={item.name}
              item={item}
              group={group}
              onClose={onClose}
              location={location}
            />
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

  const dashboardActive = uniformPathMatches(location.pathname, '')

  const displayName = [staff?.first_name, staff?.last_name].filter(Boolean).join(' ')
    || staff?.full_name
    || staff?.name
    || 'Uniform Manager'

  const roleLabel = staff?.role_name || staff?.role?.name || 'Uniform Manager'
  const email = staff?.email || staff?.username || ''

  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .map((s) => s[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'UM'

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
                Uniform Manager portal
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
        className="uniform-sidebar-scroll flex-1 min-h-0 px-3 py-3 overflow-y-auto overflow-x-hidden overscroll-y-contain space-y-1 pr-1"
        aria-label="Uniform Manager navigation"
      >
        <NavLink
          to={uniformHref('/')}
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

        <NavLink
          to={uniformHref('/reports')}
          onClick={closeNav}
          className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-[13px] font-medium tracking-tight border border-transparent ${
            collapsed ? 'justify-center px-2' : ''
          } ${
            isReportsHubActive(location)
              ? 'bg-white/[0.12] text-[#FEBF10] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] border-white/10'
              : 'text-white/72 hover:bg-white/[0.06] hover:text-white'
          }`}
          title={collapsed ? 'Reports Center' : undefined}
        >
          <FileBarChart
            size={18}
            strokeWidth={1.75}
            className={`shrink-0 ${isReportsHubActive(location) ? 'text-[#FEBF10]' : 'text-white/45'}`}
          />
          {!collapsed && <span className="truncate">Reports Center</span>}
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
          <NavLink
            to={uniformHref('/inventory')}
            onClick={closeNav}
            title="Uniform Inventory"
            className={({ isActive }) =>
              `flex justify-center p-2.5 rounded-xl transition-all ${
                isActive ? 'bg-[#FEBF10]/20 text-[#FEBF10]' : 'text-white/50 hover:bg-white/[0.06] hover:text-white'
              }`
            }
          >
            <Shirt size={18} strokeWidth={1.75} />
          </NavLink>
        )}

        <NavLink
          to={uniformHref('/settings')}
          onClick={closeNav}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-[13px] font-medium tracking-tight border border-transparent ${
              collapsed ? 'justify-center px-2' : ''
            } ${
              isActive
                ? 'bg-white/[0.12] text-[#FEBF10] border-white/10'
                : 'text-white/72 hover:bg-white/[0.06] hover:text-white'
            }`
          }
          title={collapsed ? 'Settings' : undefined}
        >
          <Settings size={18} strokeWidth={1.75} className="shrink-0" />
          {!collapsed && <span className="truncate">Settings</span>}
        </NavLink>
      </nav>

      {!collapsed && (
        <div className="p-4 pt-2 shrink-0 border-t border-white/[0.06] space-y-3">
          <div className="rounded-2xl bg-[#060d1f]/90 ring-1 ring-white/10 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FEBF10]/15 ring-1 ring-[#FEBF10]/25">
                <Headphones className="text-[#FEBF10]" size={20} strokeWidth={1.75} aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white">Help and support</p>
                <p className="text-[12px] text-white/55 mt-1 leading-snug">
                  Contact your school admin for uniform policy or stock approvals.
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
