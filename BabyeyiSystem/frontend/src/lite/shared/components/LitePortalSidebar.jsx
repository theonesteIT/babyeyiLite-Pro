import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { createElement, useState } from 'react';
import { Wifi, WifiOff, RefreshCw, Headphones, ChevronDown } from 'lucide-react';
import babyeyiIcon from '../assets/babyeyi-icon.png';
import '../litePortalChrome.css';

const GOLD = '#FEBF10';

const statusConfig = {
  online: { label: 'Online', dot: 'bg-green-400', text: 'text-green-400', Icon: Wifi },
  offline: { label: 'Offline', dot: 'bg-red-400', text: 'text-red-400', Icon: WifiOff },
  syncing: { label: 'Syncing', dot: 'bg-amber-400', text: 'text-amber-400', Icon: RefreshCw },
};

function AppStatusBadge({ status = 'online' }) {
  const s = statusConfig[status];
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 ring-1 ring-white/10">
      <span className="relative flex h-1.5 w-1.5">
        {status !== 'offline' && (
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${s.dot} opacity-60`} />
        )}
        <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${s.dot}`} />
      </span>
      <s.Icon size={10} className={`${s.text} ${status === 'syncing' ? 'animate-spin' : ''}`} />
      <span className="text-[9px] font-bold text-white/70">{s.label}</span>
    </div>
  );
}

const SectionLabel = ({ label }) => (
  <p className="lite-portal-sidebar-section px-3 pt-4 pb-2 first:pt-1">{label}</p>
);

function navItemClass(isActive) {
  return `lite-sidebar-nav-item${isActive ? ' lite-sidebar-nav-item--active' : ''}`;
}

function NavItem({ href, icon, name, path, exact, onClose, badgeCount = 0 }) {
  return (
    <NavLink
      to={href(path)}
      end={exact}
      onClick={onClose}
      className={({ isActive }) => navItemClass(isActive)}
    >
      {({ isActive }) => (
        <>
          {createElement(icon, {
            size: 18,
            strokeWidth: 1.75,
            className: 'lite-sidebar-nav-icon',
          })}
          <span className="truncate">{name}</span>
          {badgeCount > 0 ? (
            <span className="lite-sidebar-badge">{badgeCount > 99 ? '99+' : badgeCount}</span>
          ) : null}
        </>
      )}
    </NavLink>
  );
}

function ExpandableNavItem({ href, icon, name, subItems, onClose }) {
  const location = useLocation();
  const navigate = useNavigate();
  const pathMatches = (path) => {
    if (!path) return false;
    const full = href(path);
    if (path.includes('?')) {
      return `${location.pathname}${location.search}` === full;
    }
    const querySiblingActive = subItems.some(
      (x) => x.path && x.path.includes('?') && `${location.pathname}${location.search}` === href(x.path),
    );
    if (location.pathname === full && querySiblingActive) return false;
    return location.pathname === full;
  };
  const isAnyActive = subItems.some((s) => pathMatches(s.path));
  const [open, setOpen] = useState(isAnyActive);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`${navItemClass(isAnyActive)} w-full${isAnyActive ? ' lite-sidebar-nav-item--parent-active' : ''}`}
      >
        {createElement(icon, {
          size: 18,
          strokeWidth: 1.75,
          className: 'lite-sidebar-nav-icon',
        })}
        <span className="flex-1 text-left truncate">{name}</span>
        <ChevronDown
          size={16}
          strokeWidth={2}
          className={`lite-sidebar-nav-chevron shrink-0 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="lite-sidebar-subnav">
          {subItems.map((sub) => {
            const subActive = pathMatches(sub.path);
            const fullPath = href(sub.path);
            return (
              <button
                type="button"
                key={sub.path}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  navigate(fullPath);
                  onClose?.();
                }}
                className={`lite-sidebar-subnav-item${subActive ? ' lite-sidebar-subnav-item--active' : ''}`}
              >
                {createElement(sub.icon, {
                  size: 14,
                  strokeWidth: 1.75,
                  className: 'lite-sidebar-nav-icon',
                })}
                <span className="truncate">{sub.name}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * @param {{
 *   portalLabel: string;
 *   href: (path: string) => string;
 *   sections: Array<{ label?: string; items: Array<{ type?: 'item'|'expand'; icon: any; name: string; path?: string; exact?: boolean; badgeCount?: number; subItems?: Array<{ name: string; path: string; icon: any }> }> }>;
 *   onClose?: () => void;
 *   chatPath?: string;
 *   supportMessage?: string;
 *   supportButtonLabel?: string;
 *   navAriaLabel?: string;
 * }} props
 */
export default function LitePortalSidebar({
  portalLabel,
  href,
  sections,
  onClose,
  chatPath = '/chat',
  supportMessage = 'Reach the team from chat or raise a ticket anytime.',
  supportButtonLabel = 'Contact support',
  navAriaLabel = 'Portal navigation',
}) {
  const navigate = useNavigate();

  return (
    <div className="lite-portal-sidebar flex flex-col min-h-0 h-full w-full min-w-0 shadow-[2px_0_16px_rgba(11,21,48,0.14)] border-r border-white/[0.06]">
      <div className="p-4 pb-3 shrink-0 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="lite-portal-sidebar-brand-icon flex h-11 w-11 items-center justify-center rounded-xl ring-1 ring-white/20">
            <img src={babyeyiIcon} alt="Babyeyi" className="h-7 w-7 object-contain drop-shadow-sm" />
          </div>
          <div className="min-w-0">
            <span className="text-lg font-bold tracking-tight text-white block leading-tight">Babyeyi</span>
            <p className="lite-portal-sidebar-portal-label text-[11px] font-semibold uppercase mt-0.5 truncate">
              {portalLabel}
            </p>
          </div>
        </div>
      </div>

      <nav
        className="lite-portal-sidebar-scroll flex-1 min-h-0 px-3 py-3 overflow-y-auto overflow-x-hidden overscroll-y-contain space-y-0.5 pr-1"
        aria-label={navAriaLabel}
      >
        {sections.map((section) => (
          <div key={section.label || 'main'}>
            {section.label ? <SectionLabel label={section.label} /> : null}
            {section.items.map((item) =>
              item.subItems?.length ? (
                <ExpandableNavItem
                  key={item.name}
                  href={href}
                  icon={item.icon}
                  name={item.name}
                  subItems={item.subItems}
                  onClose={onClose}
                />
              ) : (
                <NavItem
                  key={item.path || item.name}
                  href={href}
                  icon={item.icon}
                  name={item.name}
                  path={item.path}
                  exact={item.exact}
                  onClose={onClose}
                  badgeCount={item.badgeCount}
                />
              ),
            )}
          </div>
        ))}
      </nav>

      <div className="p-4 pt-2 shrink-0 border-t border-white/[0.06]">
        <div className="rounded-2xl bg-[#060d1f]/90 ring-1 ring-white/10 p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1"
              style={{
                background: 'rgba(254, 191, 16, 0.15)',
                borderColor: 'rgba(254, 191, 16, 0.28)',
              }}
            >
              <Headphones size={20} strokeWidth={1.75} style={{ color: GOLD }} aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">Help &amp; Support</p>
              <p className="text-[12px] text-white/55 mt-1 leading-snug">{supportMessage}</p>
            </div>
          </div>
          <div className="flex flex-col gap-2.5">
            <AppStatusBadge status="online" />
            <button
              type="button"
              onClick={() => {
                navigate(href(chatPath));
                onClose?.();
              }}
              className="lite-sidebar-support-btn"
            >
              {supportButtonLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
