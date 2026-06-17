/**
 * Sidebar.jsx — School Manager navigation (District-style)
 * Thin outline icons · amber active state · grouped sections · mobile drawer
 */

import { createElement, useCallback, useEffect, useMemo, useState } from 'react';
import {
  X,
  Sparkles,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  LayoutDashboard,
} from 'lucide-react';
import LogoutButton from '../../Auth/LogoutButton';
import babyeyiIcon from '../../../assets/babyeyi-icon.png';
import { findNavGroupForTab } from './schoolManagerNavConfig';

const FONT = "'Montserrat', system-ui, sans-serif";
const COLLAPSE_KEY = 'babyeyi-sm-sidebar-collapsed';

function readCollapsed() {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === '1';
  } catch {
    return false;
  }
}

function NavButton({ item, active, onClick, badge = 0, collapsed = false, nested = false, title }) {
  const Icon = item.icon;
  const iconSize = nested ? 17 : 19;
  return (
    <button
      type="button"
      title={title || (collapsed ? item.label : undefined)}
      onClick={onClick}
      className={`relative flex w-full items-center border text-left font-medium tracking-tight transition-all duration-200 ${
        nested
          ? `gap-2.5 rounded-lg py-2 text-[13px] ${collapsed ? 'justify-center px-2' : 'pl-8 pr-2.5'}`
          : `gap-3 rounded-xl px-3 py-3 text-[14px] ${collapsed ? 'justify-center px-2' : ''}`
      } ${
        active
          ? 'border-white/10 bg-white/[0.12] text-amber-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
          : 'border-transparent text-white/72 hover:bg-white/[0.06] hover:text-white'
      }`}
      style={{ fontFamily: FONT }}
    >
      {createElement(Icon, {
        size: iconSize,
        strokeWidth: 1.75,
        className: active ? 'shrink-0 text-amber-400' : 'shrink-0 text-white/45',
      })}
      {!collapsed && (
        <>
          <span className="flex-1 truncate">{item.label}</span>
          {badge > 0 && (
            <span
              className={`min-w-[20px] rounded-full px-1.5 py-0.5 text-center text-[11px] font-black ${
                active ? 'bg-amber-400/20 text-amber-300' : 'bg-amber-400 text-[#000435]'
              }`}
            >
              {badge > 9 ? '9+' : badge}
            </span>
          )}
        </>
      )}
    </button>
  );
}

export default function Sidebar({
  tab,
  switchTab,
  navGroups = [],
  transferNotifCount = 0,
  mobileOpen,
  setMobileOpen,
  showProLaunch = false,
  proAppBase = '',
  session = null,
  onCollapsedChange,
}) {
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const buildExpandedState = useCallback(
    (openGroupId) => {
      const next = {};
      navGroups.forEach((g) => {
        next[g.id] = openGroupId != null && g.id === openGroupId;
      });
      return next;
    },
    [navGroups],
  );

  const [expanded, setExpanded] = useState(() =>
    buildExpandedState(findNavGroupForTab(navGroups, tab)),
  );

  const activeGroupId = useMemo(() => findNavGroupForTab(navGroups, tab), [navGroups, tab]);
  const dashboardItem = useMemo(
    () => ({ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }),
    [],
  );

  useEffect(() => {
    setExpanded(buildExpandedState(activeGroupId));
  }, [activeGroupId, buildExpandedState]);

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0');
    } catch {
      /* ignore */
    }
    const w = collapsed ? '72px' : '272px';
    document.documentElement.style.setProperty('--sm-sidebar-w', w);
    onCollapsedChange?.(collapsed);
  }, [collapsed, onCollapsedChange]);

  const toggleGroup = useCallback(
    (groupId) => {
      if (collapsed) {
        setCollapsed(false);
        setExpanded(buildExpandedState(groupId));
        return;
      }
      setExpanded((prev) => {
        if (prev[groupId]) return buildExpandedState(null);
        return buildExpandedState(groupId);
      });
    },
    [collapsed, buildExpandedState],
  );

  const navigate = (itemId, onItemClick) => {
    switchTab(itemId);
    onItemClick?.();
  };

  const displayName =
    session?.userName || [session?.userEmail].filter(Boolean)[0] || 'School Manager';
  const schoolName = session?.schoolName || '';

  const SidebarInner = ({ onItemClick, forceExpanded = false }) => {
    const isCollapsed = forceExpanded ? false : collapsed;

    return (
      <div
        className="flex h-full min-h-0 w-full flex-col border-r border-white/[0.06] shadow-sm"
        style={{ background: '#000435', colorScheme: 'dark', fontFamily: FONT }}
      >
        {/* Brand */}
        <div
          className={`shrink-0 border-b border-white/[0.06] ${isCollapsed ? 'p-3' : 'p-4 pb-3'}`}
        >
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
                  School Manager
                </p>
              </div>
            )}
            {!forceExpanded && (
              <button
                type="button"
                onClick={() => setCollapsed((c) => !c)}
                className={`hidden shrink-0 cursor-pointer items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/45 transition hover:bg-white/10 hover:text-white lg:flex ${
                  isCollapsed ? 'h-8 w-8' : 'h-8 w-8 ml-auto'
                }`}
                aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {isCollapsed ? <ChevronsRight size={15} /> : <ChevronsLeft size={15} />}
              </button>
            )}
          </div>
        </div>

        <nav
          className="sm-sidebar-scroll min-h-0 flex-1 space-y-0.5 overflow-y-auto overflow-x-hidden overscroll-y-contain px-3 py-3 pr-1"
          aria-label="School Manager navigation"
        >
          {!isCollapsed && (
            <p className="px-3 pb-2 pt-1 text-[11px] font-medium uppercase tracking-widest text-white/40">
              Main
            </p>
          )}
          <NavButton
            item={dashboardItem}
            active={tab === 'dashboard'}
            collapsed={isCollapsed}
            onClick={() => navigate('dashboard', onItemClick)}
          />

          {navGroups.map((group) => {
            const isOpen = expanded[group.id] === true;
            const hasActiveChild = group.items.some((i) => i.id === tab);
            const groupActive = isOpen || hasActiveChild;

            return (
              <div key={group.id} className="pt-1.5">
                {!isCollapsed ? (
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    aria-expanded={isOpen}
                    className={`mb-0.5 flex w-full min-h-[32px] cursor-pointer items-center justify-between gap-1.5 rounded-lg border px-3 py-2 text-left transition-all duration-200 ${
                      groupActive
                        ? 'border-white/10 bg-white/[0.1] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
                        : 'border-transparent hover:bg-white/[0.04]'
                    }`}
                  >
                    <span
                      className={`text-[11px] font-semibold uppercase tracking-[0.12em] ${
                        groupActive ? 'text-amber-400' : 'text-white/38'
                      }`}
                    >
                      {group.label}
                    </span>
                    <ChevronDown
                      size={14}
                      strokeWidth={2}
                      className={`shrink-0 transition-transform duration-200 ${
                        groupActive ? 'text-amber-400/70' : 'text-white/30'
                      } ${isOpen ? 'rotate-0' : '-rotate-90'}`}
                    />
                  </button>
                ) : (
                  <div className="mx-auto my-1.5 h-px w-6 bg-white/10" aria-hidden />
                )}

                {(isOpen || isCollapsed) && (
                  <div className={`${isCollapsed ? 'space-y-0.5' : 'space-y-px border-l border-white/[0.06] ml-4 pl-0.5'}`}>
                    {group.items.map((item) => (
                      <NavButton
                        key={item.id}
                        item={item}
                        active={tab === item.id}
                        collapsed={isCollapsed}
                        nested={!isCollapsed}
                        badge={item.id === 'student_transfer' ? transferNotifCount : 0}
                        onClick={() => navigate(item.id, onItemClick)}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {showProLaunch && proAppBase && !isCollapsed && (
            <div className="pt-4 px-1">
              <button
                type="button"
                onClick={() => window.location.assign(`${proAppBase}/manager`)}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-violet-400/25 bg-violet-600/90 px-3 py-2.5 text-[13px] font-bold text-white transition hover:bg-violet-600"
              >
                <Sparkles size={16} strokeWidth={1.75} />
                Open Pro Manager
              </button>
            </div>
          )}
        </nav>

        <div
          className={`shrink-0 space-y-2 border-t border-white/[0.06] ${isCollapsed ? 'p-2' : 'p-3'}`}
        >
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
            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#000c6e]">
              <span className="text-sm font-black text-amber-400">
                {(displayName[0] || 'S').toUpperCase()}
              </span>
            </div>
            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-white">{displayName}</p>
                {schoolName ? (
                  <p className="mt-0.5 truncate text-[11px] text-white/50">{schoolName}</p>
                ) : null}
                <p className="mt-0.5 truncate text-[10px] text-amber-400/80">Babyeyi System · v2.0</p>
              </div>
            )}
          </div>
          {!isCollapsed && (
            <p className="px-3 pb-0 text-center text-[11px] font-medium text-white/35">
              NESA Rwanda · v2.0
            </p>
          )}
        </div>

        <style>{`
          .sm-sidebar-scroll::-webkit-scrollbar { width: 4px; }
          .sm-sidebar-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 99px; }
        `}</style>
      </div>
    );
  };

  const asideWidth = collapsed ? 'w-[72px]' : 'w-[272px]';

  return (
    <>
      <aside
        className={`fixed left-0 top-0 z-30 hidden h-full shrink-0 transition-[width] duration-200 lg:flex lg:flex-col ${asideWidth}`}
        aria-label="School Manager navigation"
      >
        <SidebarInner />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 cursor-pointer border-none"
            style={{ background: 'rgba(0,4,53,0.5)' }}
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative flex h-full w-[min(280px,88vw)] flex-col shadow-2xl">
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
