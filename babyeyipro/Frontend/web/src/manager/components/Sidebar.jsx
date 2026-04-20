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
} from 'lucide-react';
import { h } from '../utils/href';

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
const NavItem = ({ icon: Icon, name, path, exact, onClose }) => (
  <NavLink
    to={h(path)}
    end={exact}
    onClick={onClose}
    className={({ isActive }) =>
      `relative flex items-center gap-2 px-2.5 py-1.5 rounded-xl transition-all duration-200 group text-[11px] font-bold
      ${isActive ? 'text-white shadow-sm' : 'text-re-text-muted hover:bg-re-navy/5 hover:text-re-navy'}`
    }
    style={({ isActive }) =>
      isActive ? { background: 'linear-gradient(135deg,#1E3A5F,#3D5A80)', boxShadow: '0 3px 10px rgba(30,58,95,0.25)' } : {}
    }
  >
    {({ isActive }) => (
      <>
        <Icon size={13} className={isActive ? 'text-white' : 'text-re-text-muted/50 group-hover:text-re-navy transition-colors'} />
        <span>{name}</span>
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
        className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl transition-all text-[11px] font-bold group
          ${isAnyActive ? 'text-re-navy bg-re-navy/10' : 'text-re-text-muted hover:bg-re-navy/5 hover:text-re-navy'}`}
      >
        <Icon size={13} className={`${isAnyActive ? 'text-re-navy' : 'text-re-text-muted/50 group-hover:text-re-navy'} transition-colors`} />
        <span className="flex-1 text-left">{name}</span>
        <ChevronDown size={11} className={`transition-transform duration-300 opacity-40 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="ml-4 mt-0.5 space-y-0.5 border-l-2 border-re-navy/10 pl-2.5">
          {subItems.map(sub => {
            const subActive = pathMatches(sub.path);
            return (
            <NavLink
              key={sub.path}
              to={h(sub.path)}
              end={sub.path === '/finance'}
              onClick={onClose}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all
                ${subActive ? 'text-re-navy bg-re-navy/10' : 'text-re-text-muted hover:text-re-navy hover:bg-re-navy/5'}`}
            >
              <sub.icon size={11} className={subActive ? 'text-re-navy' : 'text-re-text-muted/40'} />
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
  <p className="text-[8px] font-black uppercase tracking-[0.18em] text-re-text-muted/35 px-2.5 pt-2 pb-0.5">
    {label}
  </p>
);

// ── Sidebar ───────────────────────────────────────────────────
const Sidebar = ({ onClose }) => {
  const { manager, logout, canAccessSchoolConsole } = useAuth();

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
    <div className="flex flex-col h-full bg-white border-r border-black/5 shadow-sm">

      {/* Brand card — premium feel */}
      <div className="p-3">
        <div className="rounded-2xl  bg-re-bg shadow-inner p-3 space-y-1">
          <div className="flex items-center gap-3">
            <div className="bg-re-navy/10 p-2.5 rounded-2xl shadow-inner text-re-navy">
              <School size={22} />
            </div>
            <div>
              <span
                className="text-xl font-black tracking-tight leading-none block"
                style={{ background: 'linear-gradient(135deg,#1E3A5F,#3D5A80)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
              >
                Babyeyi
              </span>
              <p className="text-[9px] text-re-navy font-black uppercase tracking-[0.2em] opacity-60 mt-0.5">
                Manager Portal
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-1 overflow-y-auto space-y-0.5">
        <NavItem icon={LayoutDashboard} name="Command Center" path="/" exact onClose={onClose} />
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

        <SectionLabel label="Services" />
        <NavItem icon={Wallet} name="Shule Avance" path="/avance" onClose={onClose} />

        <SectionLabel label="Operational Tools" />
        <NavItem icon={MessageSquare} name="TichaAI" path="/manager-ai" onClose={onClose} />
        {canAccessSchoolConsole && (
          <NavItem icon={Radio} name="Smart School Access" path="/smart-access" onClose={onClose} />
        )}
        {canAccessSchoolConsole && (
          <NavItem icon={UserCheck} name="Staff smart access" path="/staff-smart-access" onClose={onClose} />
        )}
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
      <div className="p-3">
        <div className="rounded-2xl border border-black/5 bg-re-bg shadow-inner p-2 space-y-2">

          <div className="flex items-center justify-between px-1">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-re-text-muted/40">Status</p>
            <AppStatusBadge status="online" />
          </div>

          <div className="h-px bg-black/5 mx-1" />

          {/* Manager profile */}
          <div className="flex items-center gap-2.5 px-2 py-1.5 bg-white rounded-xl border border-black/5 shadow-sm">
            <div className="w-8 h-8 rounded-xl overflow-hidden bg-re-navy/10 flex items-center justify-center shrink-0">
              {manager?.photo
                ? <img src={manager.photo} alt={manager.full_name} className="w-full h-full object-cover" />
                : <User size={16} className="text-re-navy" />
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black truncate text-re-navy uppercase tracking-tight">
                {manager?.first_name || 'Manager'}
              </p>
              <p className="text-[9px] text-re-text-muted truncate font-bold uppercase tracking-wider opacity-50 mt-0.5">
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
