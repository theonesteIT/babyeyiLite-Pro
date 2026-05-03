import { NavLink, useLocation } from 'react-router-dom';
import { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { SCHOOL_CONSOLE_NAV } from '../config/schoolConsoleNav';
import {
  LayoutDashboard, Users, BookOpen, Calendar, ClipboardCheck,
  Wallet, MessageSquare, ClipboardList, Eye, PenLine,
  User, LogOut, Wifi, WifiOff, RefreshCw, GraduationCap, ChevronDown,
  Building2, School, Landmark, UserCog, UserCheck, PieChart, Activity, Settings, ShieldCheck, Table2,
  LayoutGrid,
  Radio,
  DoorOpen,
  DollarSign,
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
    <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${s.bg} ring-1 ${s.ring}`}>
      <span className="relative flex h-1.5 w-1.5">
        {status !== 'offline' && <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${s.dot} opacity-60`} />}
        <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${s.dot}`} />
      </span>
      <s.Icon size={9} className={`${s.text} ${status === 'syncing' ? 'animate-spin' : ''}`} />
      <span className={`text-[9px] font-bold ${s.text}`}>{s.label}</span>
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
      `relative flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl transition-all duration-200 group text-[12px] font-black uppercase tracking-[0.08em] border
      ${isActive ? 'text-white shadow-sm border-amber-300/40' : 'text-[#000435]/65 hover:bg-[#000435]/5 hover:text-[#000435] border-transparent'}`
    }
    style={({ isActive }) =>
      isActive ? { background: 'linear-gradient(135deg,#000435,#00021A)', boxShadow: '0 8px 20px rgba(0,4,53,0.28)' } : {}
    }
  >
    {({ isActive }) => (
      <>
        <Icon size={14} className={isActive ? 'text-amber-300' : 'text-[#000435]/45 group-hover:text-[#000435] transition-colors'} />
        <span className="truncate">{name}</span>
        {badgeCount > 0 && (
          <span className="ml-auto text-[10px] leading-none px-1.5 py-1 rounded-full bg-amber-100 text-[#000435] border border-amber-300/40">
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
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl transition-all text-[12px] font-black uppercase tracking-[0.08em] group border
          ${isAnyActive ? 'text-white bg-[#000435] border-amber-300/40' : 'text-[#000435]/65 hover:bg-[#000435]/5 hover:text-[#000435] border-transparent'}`}
      >
        <Icon size={14} className={`${isAnyActive ? 'text-amber-300' : 'text-[#000435]/45 group-hover:text-[#000435]'} transition-colors`} />
        <span className="flex-1 text-left">{name}</span>
        <ChevronDown size={12} className={`transition-transform duration-300 opacity-60 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="ml-4 mt-1 space-y-1 border-l-2 border-amber-300/40 pl-3">
          {subItems.map(sub => {
            const subActive = pathMatches(sub.path);
            return (
            <NavLink
              key={sub.path}
              to={h(sub.path)}
              end={sub.path === '/finance'}
              onClick={onClose}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-[0.07em] transition-all border
                ${subActive ? 'text-[#000435] bg-amber-50 border-amber-300/40' : 'text-[#000435]/60 hover:text-[#000435] hover:bg-[#000435]/5 border-transparent'}`}
            >
              <sub.icon size={11} className={subActive ? 'text-amber-600' : 'text-[#000435]/40'} />
              {sub.name}
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
  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#000435]/35 px-3.5 pt-3 pb-1">
    {label}
  </p>
);

// ── Sidebar ───────────────────────────────────────────────────
const Sidebar = ({ onClose }) => {
  const { manager, logout, canAccessSchoolConsole } = useAuth();
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
    <div className="flex flex-col h-full min-w-[300px] bg-white border-r border-black/5 shadow-sm">

      {/* Brand card — premium feel */}
      <div className="p-4">
        <div className="rounded-3xl bg-white border border-[#000435]/10 shadow-[0_10px_30px_-16px_rgba(0,4,53,.45)] p-4 space-y-1">
          <div className="flex items-center gap-3">
            <div className="bg-[#000435]/10 p-3 rounded-2xl shadow-inner text-[#000435] border border-amber-300/30">
              <School size={22} />
            </div>
            <div>
              <span
                className="text-xl font-black tracking-tight leading-none block"
                style={{ background: 'linear-gradient(135deg,#000435,#142f63)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
              >
                Babyeyi
              </span>
              <p className="text-[9px] text-[#000435] font-black uppercase tracking-[0.22em] opacity-60 mt-0.5">
                Manager Portal
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 overflow-y-auto space-y-1">
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
        <ExpandableNavItem
          icon={Landmark}
          name="Finance Center"
          onClose={onClose}
          subItems={[
            { name: 'Financial Overview', path: '/finance', icon: PieChart },
            { name: 'Student Fee Payment', path: '/finance/payments', icon: Users },
            { name: 'Babyeyi Wizard', path: '/finance/wizard', icon: Activity },
          ]}
        />
        <NavItem icon={UserCog} name="HRCentral" path="/hr" onClose={onClose} />
        <NavItem icon={ClipboardCheck} name="Payroll" path="/payroll" onClose={onClose} />

        <SectionLabel label="Services" />
        <NavItem icon={DollarSign} name="My Payroll" path="/my-payroll" onClose={onClose} />
        <NavItem icon={Wallet} name="Teacher Avance" path="/avance" onClose={onClose} />

        <SectionLabel label="Operational Tools" />
        <NavItem icon={MessageSquare} name="TichaAI" path="/manager-ai" onClose={onClose} />
        <NavItem icon={MessageSquare} name="Chat Center" path="/chat" onClose={onClose} badgeCount={unreadCount} />
        {canAccessSchoolConsole && (
          <NavItem icon={Radio} name="Smart School Access" path="/smart-access" onClose={onClose} />
        )}
        {canAccessSchoolConsole && (
          <NavItem icon={UserCheck} name="Staff smart access" path="/staff-smart-access" onClose={onClose} />
        )}
        <NavItem icon={DoorOpen} name="Gate Attendance" path="/attendance/gate" onClose={onClose} />
        <NavItem icon={ClipboardList} name="All Gate Logs" path="/attendance/gate-logs" onClose={onClose} />
        <NavItem icon={ShieldCheck} name="Student Permissions" path="/permissions" onClose={onClose} />
        <ExpandableNavItem
          icon={ClipboardList}
          name="NESA Reports"
          onClose={onClose}
          subItems={[
            { name: 'Standard Return', path: '/reports/nesa', icon: Eye },
            { name: 'Generate New', path: '/reports/new', icon: PenLine },
          ]}
        />

        <SectionLabel label="Institutional Reports" />
        <NavItem icon={GraduationCap} name="Academic Reports" path="/reports/academic" onClose={onClose} />
        <ExpandableNavItem
          icon={ClipboardCheck}
          name="Attendance Reports"
          onClose={onClose}
          subItems={[
            { name: 'Student Attendance', path: '/reports/attendance/students', icon: Users },
            { name: 'Staff Attendance', path: '/reports/attendance/staff', icon: UserCheck },
          ]}
        />
        <NavItem icon={Activity} name="Student Discipline" path="/reports/discipline" onClose={onClose} />

        <SectionLabel label="App Configuration" />
        <NavItem icon={Building2} name="School Profile" path="/registry" onClose={onClose} />
        <ExpandableNavItem
          icon={Calendar}
          name="School Organization"
          onClose={onClose}
          subItems={[
            { name: 'Academic Planner', path: '/timetable', icon: GraduationCap },
            { name: 'School Operations', path: '/operations', icon: Activity },
            { name: 'Gradebook columns', path: '/operations?tab=gradebook', icon: Table2 },
          ]}
        />
        <NavItem icon={Settings} name="System Configuration" path="/settings" onClose={onClose} />
      </nav>

      {/* Bottom card — premium feel */}
      <div className="p-4">
        <div className="rounded-3xl border border-[#000435]/10 bg-white shadow-[0_10px_30px_-16px_rgba(0,4,53,.45)] p-3 space-y-2">

          <div className="flex items-center justify-between px-1">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#000435]/40">Status</p>
            <AppStatusBadge status="online" />
          </div>

          <div className="h-px bg-black/5 mx-1" />

          {/* Manager profile */}
          <div className="flex items-center gap-2.5 px-2.5 py-2 bg-white rounded-2xl border border-black/5 shadow-sm">
            <div className="w-8 h-8 rounded-xl overflow-hidden bg-[#000435]/10 flex items-center justify-center shrink-0">
              {manager?.photo
                ? <img src={manager.photo} alt={manager.full_name} className="w-full h-full object-cover" />
                : <User size={16} className="text-[#000435]" />
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black truncate text-[#000435] uppercase tracking-tight">
                {manager?.first_name || 'Manager'}
              </p>
              <p className="text-[9px] text-[#000435]/55 truncate font-bold uppercase tracking-wider opacity-70 mt-0.5">
                {manager?.school?.name || 'School Principal'}
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Sidebar;
