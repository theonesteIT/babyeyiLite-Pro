import { NavLink, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, BookOpen, BookMarked, RotateCcw,
  Wallet, User, LogOut, Wifi, WifiOff, RefreshCw, ChevronDown, MessageSquare,
  BarChart2, Settings, DollarSign, AlertTriangle, Layers, Sparkles, Home,
} from 'lucide-react';
import { PORTAL } from '../config/portal';
import useChatUnread from '../../../../shared/hooks/useChatUnread';

// ── Status Badge ──────────────────────────────────────────────
const statusConfig = {
  online: { label: 'Online', dot: 'bg-green-400', text: 'text-green-600', ring: 'ring-green-100', bg: 'bg-green-50', Icon: Wifi },
  offline: { label: 'Offline', dot: 'bg-red-400', text: 'text-red-500', ring: 'ring-red-100', bg: 'bg-red-50', Icon: WifiOff },
  syncing: { label: 'Syncing', dot: 'bg-amber-400', text: 'text-amber-600', ring: 'ring-amber-100', bg: 'bg-amber-50', Icon: RefreshCw },
};

const AppStatusBadge = ({ status = 'online' }) => {
  const s = statusConfig[status];
  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 ring-1 ring-white/10`}>
      <span className="relative flex h-1.5 w-1.5">
        {status !== 'offline' && <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${s.dot} opacity-60`} />}
        <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${s.dot}`} />
      </span>
      <s.Icon size={10} className={`${s.text} ${status === 'syncing' ? 'animate-spin' : ''}`} />
      <span className="text-[9px] font-bold text-white/70">{s.label}</span>
    </div>
  );
};

// ── Single nav link ───────────────────────────────────────────
const NavItem = ({ icon: Icon, name, path, exact, onClose, badgeCount = 0 }) => (
  <NavLink
    to={path}
    end={exact}
    onClick={onClose}
    className={({ isActive }) =>
      `relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group text-[13px] font-medium tracking-tight border border-transparent
      ${isActive
        ? 'bg-white/[0.12] text-re-gold shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] border-white/10'
        : 'text-white/72 hover:bg-white/[0.06] hover:text-white'
      }`
    }
  >
    {({ isActive }) => (
      <>
        <Icon size={18} strokeWidth={1.75} className={isActive ? 'text-re-gold shrink-0' : 'text-white/45 group-hover:text-white/85 shrink-0 transition-colors'} />
        <span className="truncate">{name}</span>
        {badgeCount > 0 && (
          <span className="ml-auto text-[10px] leading-none px-1.5 py-0.5 rounded-md bg-re-gold/90 text-[#0B1530] font-bold">
            {badgeCount > 99 ? '99+' : badgeCount}
          </span>
        )}
      </>
    )}
  </NavLink>
);

// ── Expandable item ───────────────────────────────────────────
const ExpandableNavItem = ({ icon: Icon, name, subItems, onClose }) => {
  const location = useLocation();
  const pathMatches = (path) => location.pathname === path;
  const isAnyActive = subItems.some((s) => pathMatches(s.path));
  const [open, setOpen] = useState(isAnyActive);

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-[13px] font-medium tracking-tight group border border-transparent
          ${isAnyActive
            ? 'bg-white/[0.12] text-re-gold border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
            : 'text-white/72 hover:bg-white/[0.06] hover:text-white'
          }`}
      >
        <Icon size={18} strokeWidth={1.75} className={`${isAnyActive ? 'text-re-gold' : 'text-white/45 group-hover:text-white/85'} transition-colors shrink-0`} />
        <span className="flex-1 text-left">{name}</span>
        <ChevronDown size={16} strokeWidth={2} className={`transition-transform duration-300 text-white/40 shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="ml-2 mt-1 space-y-0.5 border-l border-white/15 pl-3">
          {subItems.map(sub => {
            const subActive = pathMatches(sub.path);
            return (
              <NavLink
                key={sub.path}
                to={sub.path}
                onClick={onClose}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-all
                  ${subActive ? 'text-re-gold bg-white/[0.08]' : 'text-white/60 hover:text-white hover:bg-white/[0.05]'}`}
              >
                <sub.icon size={14} strokeWidth={1.75} className={subActive ? 'text-re-gold/90' : 'text-white/35'} />
                <span className="truncate">{sub.name}</span>
              </NavLink>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ── Section label ──────────────────────────────────────────────
const SectionLabel = ({ label }) => (
  <p className="text-[11px] font-medium uppercase tracking-[0.13em] text-slate-400 px-3 pt-4 pb-2 first:pt-1">
    {label}
  </p>
);

// ── Sidebar ───────────────────────────────────────────────────
const Sidebar = ({ onClose }) => {
  const { staff, logout } = useAuth();
  const unreadCount = useChatUnread();

  return (
    <div
      className="flex flex-col min-h-0 h-full min-w-[300px] shadow-[2px_0_16px_rgba(11,21,48,0.14)] border-r border-white/[0.06]"
      style={{
        background: 'linear-gradient(180deg,#0f2247 0%,#0b1530 40%,#060d1f 100%)',
        colorScheme: 'dark',
      }}
    >
      {/* Brand — matches Babyeyi Manager portal hero */}
      <div className="p-4 pb-3 shrink-0 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/[0.08] ring-1 ring-white/10">
            <Home className="text-re-gold" size={22} strokeWidth={1.75} aria-hidden />
          </div>
          <div className="min-w-0">
            <span className="text-lg font-bold tracking-tight text-white block leading-tight">
              Babyeyi
            </span>
            <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-re-gold/95 mt-0.5">
              {PORTAL.brandLine}
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-0.5 pr-1">
        <SectionLabel label="General" />
        <NavItem icon={LayoutDashboard} name="Dashboard" path="/librarian" exact onClose={onClose} />

        <SectionLabel label="Catalogue" />
        <NavItem icon={BookOpen} name="Books" path="/librarian/books" onClose={onClose} />

        <SectionLabel label="Circulation" />
        <NavItem icon={BookMarked} name="Borrowing" path="/librarian/borrowing" onClose={onClose} />
        <NavItem icon={RotateCcw} name="Returns" path="/librarian/returns" onClose={onClose} />

        <SectionLabel label="Reports" />
        <ExpandableNavItem
          icon={BarChart2}
          name="Reports"
          onClose={onClose}
          subItems={[
            { name: 'Overview', path: '/librarian/reports', icon: BarChart2 },
            { name: 'Overdue', path: '/librarian/reports/overdue', icon: AlertTriangle },
            { name: 'Book Stock', path: '/librarian/reports/circulation', icon: Layers },
          ]}
        />

        <SectionLabel label="Services" />
        <NavItem icon={DollarSign} name="My Payroll" path="/librarian/my-payroll" onClose={onClose} />
        <NavItem icon={Sparkles} name="Shule Avance" path="/librarian/shule-avance" onClose={onClose} />
        <NavItem icon={MessageSquare} name="Chat Center" path="/librarian/chat" onClose={onClose} badgeCount={unreadCount} />

        <SectionLabel label="System" />
        <NavItem icon={Settings} name="Settings" path="/librarian/settings" onClose={onClose} />
      </nav>

      {/* Bottom Profile Area */}
      <div className="p-4 pt-2 shrink-0 border-t border-white/[0.06] space-y-3">
        <div className="rounded-2xl bg-[#060d1f]/90 ring-1 ring-white/10 p-3 space-y-3">
          <div className="flex items-center justify-between">
            <AppStatusBadge status="online" />
            <button
              onClick={logout}
              className="p-1 rounded-md hover:bg-red-500/10 text-white/40 hover:text-red-400 transition-colors"
            >
              <LogOut size={14} />
            </button>
          </div>

          <div className="h-px w-full bg-white/10" />

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-white/10 ring-1 ring-white/10 flex items-center justify-center shrink-0">
              {staff?.photo
                ? <img src={staff.photo} alt={staff.first_name} className="w-full h-full object-cover" />
                : <User size={20} className="text-white/60" />
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-white truncate">
                {staff?.first_name || 'Librarian'}
              </p>
              <p className="text-[11px] font-medium text-white/60 truncate mt-0.5">
                {staff?.school?.name ? staff.school.name : PORTAL.profileFallback}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;

