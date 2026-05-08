import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { SCHOOL_CONSOLE_NAV } from '../config/schoolConsoleNav';
import {
  LayoutDashboard, Users, BookOpen, ClipboardCheck,
  Wallet, MessageSquare, ClipboardList,
  Wifi, WifiOff, RefreshCw, GraduationCap, ChevronDown,
  Building2, Landmark, UserCog, UserCheck, PieChart, Activity, Settings, ShieldCheck,
  LayoutGrid,
  DoorOpen,
  DollarSign,
  Shield,
  Package,
  Headphones,
  Home,
} from 'lucide-react';
import { h } from '../utils/href';
import useChatUnread from '../../shared/hooks/useChatUnread';

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
    to={h(path)}
    end={exact}
    onClick={onClose}
    className={({ isActive }) =>
      `relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group text-[13px] font-semibold tracking-tight border border-transparent
      ${isActive
        ? 'bg-white/[0.12] text-re-gold shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] border-white/10'
        : 'text-white/72 hover:bg-white/[0.06] hover:text-white'
      }`
    }
  >
    {({ isActive }) => (
      <>
        <Icon
          size={18}
          strokeWidth={1.75}
          className={isActive ? 'text-re-gold shrink-0' : 'text-white/45 group-hover:text-white/85 shrink-0 transition-colors'}
        />
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
  const pathMatches = (path) => {
    if (!path) return false;
    const full = h(path);
    if (path.includes('?')) {
      return `${location.pathname}${location.search}` === full;
    }
    const querySiblingActive = subItems.some(
      (x) => x.path && x.path.includes('?') && `${location.pathname}${location.search}` === h(x.path)
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
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-[13px] font-semibold tracking-tight group border border-transparent
          ${isAnyActive
            ? 'bg-white/[0.12] text-re-gold border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
            : 'text-white/72 hover:bg-white/[0.06] hover:text-white'
          }`}
      >
        <Icon
          size={18}
          strokeWidth={1.75}
          className={`${isAnyActive ? 'text-re-gold' : 'text-white/45 group-hover:text-white/85'} transition-colors shrink-0`}
        />
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
              to={h(sub.path)}
              end={sub.path === '/finance'}
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
  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400 px-3 pt-4 pb-2 first:pt-1">
    {label}
  </p>
);

// ── Sidebar ───────────────────────────────────────────────────
const Sidebar = ({ onClose }) => {
  const navigate = useNavigate();
  const { canAccessSchoolConsole } = useAuth();
  const unreadCount = useChatUnread();

  const schoolConsoleSubItems = useMemo(
    () =>
      SCHOOL_CONSOLE_NAV.map((item) =>
        item.external
          ? { name: item.label, path: item.path, icon: item.icon }
          : { name: item.label, path: `/school-console${item.pathSuffix}`, icon: item.icon }
      ),
    []
  );

  return (
    <div
      className="flex flex-col h-full w-full shadow-[4px_0_24px_rgba(11,21,48,0.35)] border-r border-white/[0.06]"
      style={{ background: 'linear-gradient(180deg,#0f2247 0%,#0b1530 40%,#060d1f 100%)' }}
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
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-re-gold/95 mt-0.5">
              Manager Portal
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto overflow-x-hidden space-y-0.5">
        <SectionLabel label="Main" />
        <NavItem icon={LayoutDashboard} name="Dashboard" path="/" exact onClose={onClose} />
        <SectionLabel label="School admin" />
        {canAccessSchoolConsole && (
          <ExpandableNavItem
            icon={LayoutGrid}
            name="Babyeyi school admin"
            onClose={onClose}
            subItems={schoolConsoleSubItems}
          />
        )}
        <NavItem icon={Users} name="Students" path="/students" onClose={onClose} />
        <NavItem icon={Building2} name="School profile" path="/registry" onClose={onClose} />
        <NavItem icon={UserCog} name="Teachers & staff" path="/hr" onClose={onClose} />
        <SectionLabel label="Finance center" />
        <ExpandableNavItem
          icon={Landmark}
          name="Finance center"
          onClose={onClose}
          subItems={[
            { name: 'Financial overview',   path: '/finance',          icon: PieChart },
            { name: 'Fees & invoices', path: '/finance/wizard', icon: ClipboardList },
            { name: 'Student fee payment',  path: '/finance/payments', icon: Users },
            { name: 'Payroll',              path: '/payroll',          icon: ClipboardCheck },
            { name: 'Stock reports',        path: '/reports/stock',    icon: Package },
            { name: 'Library reports',      path: '/reports/library',  icon: BookOpen },
          ]}
        />
        <SectionLabel label="HR central" />
        <NavItem icon={ClipboardCheck} name="Payroll" path="/payroll" onClose={onClose} />

        <SectionLabel label="Services" />
        <NavItem icon={DollarSign} name="My Payroll" path="/my-payroll" onClose={onClose} />
        <ExpandableNavItem
          icon={Wallet}
          name="Tools"
          onClose={onClose}
          subItems={[
            { name: 'Teacher Avance', path: '/avance', icon: Wallet },
            { name: 'TichaAI', path: '/manager-ai', icon: MessageSquare },
          ]}
        />

        <SectionLabel label="Operational tools" />
        <NavItem icon={MessageSquare} name="Chat Center" path="/chat" onClose={onClose} badgeCount={unreadCount} />
        <ExpandableNavItem
          icon={ShieldCheck}
          name="Student Conduct"
          onClose={onClose}
          subItems={[
            { name: 'Student Permissions', path: '/permissions', icon: ShieldCheck },
            { name: 'Student Discipline', path: '/reports/discipline', icon: Activity },
          ]}
        />

        <SectionLabel label="Institutional reports" />
        <NavItem icon={GraduationCap} name="Academic Reports" path="/reports/academic" onClose={onClose} />
        <ExpandableNavItem
          icon={ClipboardCheck}
          name="Attendance Reports"
          onClose={onClose}
          subItems={[
            { name: 'Student Attendance', path: '/reports/attendance/students', icon: Users },
            { name: 'Staff Attendance', path: '/reports/attendance/staff', icon: UserCheck },
            { name: 'Gate Attendance', path: '/attendance/gate', icon: DoorOpen },
            { name: 'All Gate Logs', path: '/attendance/gate-logs', icon: ClipboardList },
          ]}
        />
        <SectionLabel label="Security" />
        <NavItem icon={Shield} name="Audit Center" path="/audit" onClose={onClose} />

        <SectionLabel label="App configuration" />
        <ExpandableNavItem
          icon={Building2}
          name="Configuration"
          onClose={onClose}
          subItems={[
            { name: 'School Profile',       path: '/registry',   icon: Building2 },
            { name: 'System Configuration', path: '/settings',   icon: Settings },
            { name: 'Academic Planner',     path: '/timetable',  icon: GraduationCap },
            { name: 'School Operations',    path: '/operations', icon: Activity },
          ]}
        />
      </nav>

      {/* Help & support — reference layout */}
      <div className="p-4 pt-2 shrink-0 border-t border-white/[0.06] space-y-3">
        <div className="rounded-2xl bg-[#060d1f]/90 ring-1 ring-white/10 p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-re-gold/15 ring-1 ring-re-gold/25">
              <Headphones className="text-re-gold" size={20} strokeWidth={1.75} aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">Help &amp; Support</p>
              <p className="text-[12px] text-white/55 mt-1 leading-snug">
                Reach the team from chat or raise a ticket anytime.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <AppStatusBadge status="online" />
            <button
              type="button"
              onClick={() => {
                navigate(h('/chat'));
                onClose?.();
              }}
              className="inline-flex items-center justify-center rounded-xl bg-re-gold px-4 py-2.5 text-[13px] font-bold text-[#0b1530] shadow-[0_4px_14px_rgba(254,191,16,0.35)] hover:bg-re-gold-light active:scale-[0.98] transition-all"
            >
              Contact support
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
