/**
 * SuperAdminSidebar — accountant-portal style: search, collapsible groups, clear typography
 */
import { createElement, useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import {
  X,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  LayoutDashboard,
  Wifi,
  WifiOff,
  Search,
} from 'lucide-react';
import LogoutButton from '../../Auth/LogoutButton';
import babyeyiIcon from '../../../assets/babyeyi-icon.png';
import { BABYEYI_FONT_STACK } from '../../../theme/babyeyiDashboardTheme';
import {
  findNavGroupForPage,
  getActiveSuperAdminPage,
  getSuperAdminNavGroups,
  resolveSuperAdminNavAction,
  SA_SIDEBAR_WIDTH_COLLAPSED,
  SA_SIDEBAR_WIDTH_EXPANDED,
} from './superAdminNavConfig';

const COLLAPSE_KEY = 'babyeyi-sa-sidebar-collapsed';
const NAVY = '#000435';
const AMBER = '#fbbf24';

function readCollapsed() {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === '1';
  } catch {
    return false;
  }
}

function SubNavButton({ item, active, onClick, collapsed }) {
  const Icon = item.icon;
  if (collapsed) {
    return (
      <button
        type="button"
        title={item.label}
        onClick={onClick}
        className={`flex w-full items-center justify-center rounded-xl border p-2.5 transition-all ${
          active
            ? 'border-amber-400/50 bg-amber-400 text-[#000435]'
            : 'border-transparent text-white/70 hover:bg-white/[0.06]'
        }`}
      >
        {createElement(Icon, { size: 18, strokeWidth: 1.75, className: active ? 'text-[#000435]' : 'text-white/50' })}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[13px] font-medium transition-all ${
        active
          ? 'bg-white/[0.12] text-amber-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
          : item.highlight
            ? 'text-amber-200/90 hover:bg-white/[0.06] hover:text-white'
            : 'text-white/65 hover:bg-white/[0.05] hover:text-white'
      }`}
      style={{ fontFamily: BABYEYI_FONT_STACK }}
    >
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${active ? 'bg-amber-400' : 'bg-white/30'}`}
        aria-hidden
      />
      <span className="flex-1 truncate">{item.label}</span>
    </button>
  );
}

function NavGroupBlock({ group, activePage, collapsed, isOpen, onToggle, onNav, menuQuery }) {
  const GroupIcon = group.icon;
  const hasActiveChild = group.items.some((i) => i.id === activePage);
  const visibleItems = useMemo(() => {
    const q = menuQuery.trim().toLowerCase();
    if (!q) return group.items;
    const labelMatch = group.label.toLowerCase().includes(q);
    return group.items.filter((item) => labelMatch || item.label.toLowerCase().includes(q));
  }, [group, menuQuery]);

  if (!visibleItems.length) return null;

  if (collapsed) {
    return (
      <div className="space-y-0.5 pt-1">
        {visibleItems.map((item) => (
          <SubNavButton
            key={item.id}
            item={item}
            active={activePage === item.id}
            collapsed
            onClick={() => onNav(item)}
          />
        ))}
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className={`mb-0.5 flex w-full min-h-[44px] cursor-pointer items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-left text-[14px] font-medium tracking-tight transition-all ${
          hasActiveChild
            ? 'bg-white/[0.12] text-amber-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] border-white/10'
            : 'text-white/75 hover:bg-white/[0.06] hover:text-white'
        }`}
        style={{ fontFamily: BABYEYI_FONT_STACK }}
      >
        {GroupIcon &&
          createElement(GroupIcon, {
            size: 18,
            strokeWidth: 1.75,
            className: hasActiveChild ? 'shrink-0 text-amber-400' : 'shrink-0 text-white/45',
          })}
        <span className="flex-1 truncate">{group.label}</span>
        <ChevronDown
          size={16}
          strokeWidth={2}
          className={`shrink-0 text-white/40 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      {isOpen && (
        <div className="ml-2 mt-0.5 space-y-0.5 border-l border-white/15 pl-3 pb-1">
          {visibleItems.map((item) => (
            <SubNavButton
              key={item.id}
              item={item}
              active={activePage === item.id}
              collapsed={false}
              onClick={() => onNav(item)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function SuperAdminSidebar({
  navigate,
  online = true,
  user,
  mobileOpen,
  setMobileOpen,
  onCollapsedChange,
  navGroups: navGroupsProp,
}) {
  const { pathname, search } = useLocation();
  const [, setSearchParams] = useSearchParams();
  const activePage = getActiveSuperAdminPage(pathname, search);
  const navGroups = navGroupsProp ?? getSuperAdminNavGroups();
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [menuQuery, setMenuQuery] = useState('');

  const activeGroupId = useMemo(() => findNavGroupForPage(navGroups, activePage), [navGroups, activePage]);

  const [expanded, setExpanded] = useState(() => {
    const init = {};
    navGroups.forEach((g) => {
      init[g.id] = false;
    });
    if (activeGroupId) init[activeGroupId] = true;
    return init;
  });

  const filteredGroups = useMemo(() => {
    const q = menuQuery.trim().toLowerCase();
    if (!q) return navGroups;
    return navGroups
      .map((group) => {
        const labelMatch = group.label.toLowerCase().includes(q);
        const items = group.items.filter(
          (item) => labelMatch || item.label.toLowerCase().includes(q),
        );
        if (!items.length) return null;
        return { ...group, items };
      })
      .filter(Boolean);
  }, [navGroups, menuQuery]);

  useEffect(() => {
    if (!activeGroupId) return;
    setExpanded((prev) => ({ ...prev, [activeGroupId]: true }));
  }, [activeGroupId]);

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0');
    } catch {
      /* ignore */
    }
    const w = collapsed ? `${SA_SIDEBAR_WIDTH_COLLAPSED}px` : `${SA_SIDEBAR_WIDTH_EXPANDED}px`;
    document.documentElement.style.setProperty('--sa-sidebar-w', w);
    onCollapsedChange?.(collapsed);
  }, [collapsed, onCollapsedChange]);

  const toggleGroup = useCallback(
    (groupId) => {
      if (collapsed) {
        setCollapsed(false);
        setExpanded((prev) => ({ ...prev, [groupId]: true }));
        return;
      }
      setExpanded((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
    },
    [collapsed],
  );

  const handleNav = (item, onItemClick) => {
    resolveSuperAdminNavAction(item, { navigate, pathname, setSearchParams });
    onItemClick?.();
  };

  const displayName = user?.full_name || user?.first_name || 'Super Admin';
  const email = user?.email || '';
  const dashboardActive = activePage === 'dashboard';
  const searchOpen = !!menuQuery.trim();

  const SidebarInner = ({ onItemClick, forceExpanded = false }) => {
    const isCollapsed = forceExpanded ? false : collapsed;

    return (
      <div
        className="flex h-full min-h-0 w-full flex-col border-r border-white/[0.06] shadow-sm"
        style={{ background: NAVY, colorScheme: 'dark', fontFamily: BABYEYI_FONT_STACK }}
      >
        <div className={`shrink-0 border-b border-white/[0.06] ${isCollapsed ? 'p-3' : 'p-4 pb-3'}`}>
          <div className={`flex items-center gap-3 ${isCollapsed ? 'flex-col' : ''}`}>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm">
              <img src={babyeyiIcon} alt="Babyeyi" className="h-10 w-10 object-contain" />
            </div>
            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <span className="block text-base font-semibold leading-tight tracking-tight text-white">
                  Babyeyi
                </span>
                <p className="mt-0.5 text-[11px] font-medium tracking-wide text-amber-400">
                  Super Admin portal
                </p>
              </div>
            )}
            {!forceExpanded && (
              <button
                type="button"
                onClick={() => setCollapsed((c) => !c)}
                className={`hidden shrink-0 cursor-pointer items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/45 transition hover:bg-white/10 hover:text-white lg:flex h-8 w-8 ${isCollapsed ? '' : 'ml-auto'}`}
                aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {isCollapsed ? <ChevronsRight size={15} /> : <ChevronsLeft size={15} />}
              </button>
            )}
          </div>
          {!isCollapsed && (
            <div
              className={`mt-3 flex items-center gap-2 rounded-xl border px-3 py-2 text-[12px] font-semibold ${
                online
                  ? 'border-amber-400/35 bg-amber-400/15 text-amber-300'
                  : 'border-white/15 bg-white/8 text-white/60'
              }`}
            >
              {online ? <Wifi className="h-3.5 w-3.5 shrink-0" /> : <WifiOff className="h-3.5 w-3.5 shrink-0" />}
              {online ? 'Connected' : 'Offline'}
            </div>
          )}
        </div>

        {!isCollapsed && (
          <div className="shrink-0 px-3 pt-3">
            <div className="relative">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/35"
                aria-hidden
              />
              <input
                type="search"
                value={menuQuery}
                onChange={(e) => setMenuQuery(e.target.value)}
                placeholder="Search menu…"
                className="w-full rounded-xl border border-white/10 bg-white/[0.06] py-2.5 pl-9 pr-3 text-[13px] font-medium text-white placeholder:text-white/35 focus:border-white/20 focus:bg-white/[0.08] focus:outline-none"
                aria-label="Search menu"
              />
            </div>
          </div>
        )}

        <nav
          className="sa-sidebar-scroll min-h-0 flex-1 space-y-1 overflow-y-auto overflow-x-hidden overscroll-y-contain px-3 py-3 pr-1"
          aria-label="Super Admin navigation"
        >
          <button
            type="button"
            onClick={() =>
              handleNav({ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }, onItemClick)
            }
            title={isCollapsed ? 'Dashboard' : undefined}
            className={`relative flex w-full items-center border border-transparent text-left font-medium tracking-tight transition-all duration-200 ${
              isCollapsed
                ? 'justify-center rounded-xl p-2.5'
                : 'gap-3 rounded-xl px-3 py-2.5 text-[14px]'
            } ${
              dashboardActive
                ? 'bg-white/[0.12] text-amber-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] border-white/10'
                : 'text-white/75 hover:bg-white/[0.06] hover:text-white'
            }`}
            style={{ fontFamily: BABYEYI_FONT_STACK, minHeight: isCollapsed ? undefined : 44 }}
          >
            <LayoutDashboard
              size={18}
              strokeWidth={1.75}
              className={`shrink-0 ${dashboardActive ? 'text-amber-400' : 'text-white/45'}`}
            />
            {!isCollapsed && <span className="truncate">Dashboard</span>}
          </button>

          {!isCollapsed && filteredGroups.length === 0 && (
            <p className="px-3 py-4 text-[13px] text-white/45">No menu items match your search.</p>
          )}

          {filteredGroups.map((group) => (
            <NavGroupBlock
              key={`${group.id}-${menuQuery}`}
              group={group}
              activePage={activePage}
              collapsed={isCollapsed}
              isOpen={searchOpen || expanded[group.id] === true}
              onToggle={() => toggleGroup(group.id)}
              onNav={(item) => handleNav(item, onItemClick)}
              menuQuery={menuQuery}
            />
          ))}
        </nav>

        <div className={`shrink-0 space-y-2 border-t border-white/[0.06] ${isCollapsed ? 'p-2' : 'p-3'}`}>
          <div className={isCollapsed ? '[&_button]:!justify-center [&_button]:!px-2 [&_span]:hidden' : ''}>
            <LogoutButton
              variant="sidebar"
              className="!border-transparent !bg-transparent !text-red-400/90 hover:!bg-red-500/10 hover:!text-red-300"
            />
          </div>
          <div
            className={`flex items-start gap-2.5 rounded-xl border border-white/10 bg-white/[0.06] ${
              isCollapsed ? 'justify-center p-2' : 'p-2.5'
            }`}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-amber-400/15 ring-1 ring-amber-400/25">
              <span className="text-sm font-black text-amber-400">
                {(displayName[0] || 'S').toUpperCase()}
              </span>
            </div>
            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-white">{displayName}</p>
                {email ? <p className="mt-0.5 truncate text-[11px] text-white/50">{email}</p> : null}
                <p className="mt-0.5 truncate text-[10px] text-amber-400/80">Full Access · All Districts</p>
              </div>
            )}
          </div>
        </div>

        <style>{`
          .sa-sidebar-scroll::-webkit-scrollbar { width: 5px; }
          .sa-sidebar-scroll::-webkit-scrollbar-thumb { background: rgba(251,191,36,0.35); border-radius: 99px; }
        `}</style>
      </div>
    );
  };

  const asideWidth = collapsed ? 'w-[80px]' : 'w-[260px]';

  return (
    <>
      <aside
        className={`fixed left-0 top-0 z-30 hidden h-full shrink-0 transition-[width] duration-200 lg:flex lg:flex-col ${asideWidth}`}
        aria-label="Super Admin navigation"
      >
        <SidebarInner />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 cursor-pointer border-none"
            style={{ background: 'rgba(0,4,53,0.55)' }}
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative flex h-full w-[min(280px,92vw)] flex-col shadow-2xl">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-3 z-10 flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border-none bg-white/10 text-white"
              aria-label="Close"
            >
              <X size={18} strokeWidth={1.75} />
            </button>
            <SidebarInner onItemClick={() => setMobileOpen(false)} forceExpanded />
          </div>
        </div>
      )}
    </>
  );
}
