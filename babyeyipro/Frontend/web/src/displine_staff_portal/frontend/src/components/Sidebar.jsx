import { NavLink, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Users, BookOpen, Calendar, ClipboardCheck,
  Wallet, MessageSquare, ClipboardList, Eye, PenLine,
  User, LogOut, Wifi, WifiOff, RefreshCw, GraduationCap, ChevronDown,
  Building2, School, Landmark, UserCog, UserCheck, PieChart, Activity, Settings, ShieldCheck, ShieldAlert
} from 'lucide-react';

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
    to={path}
    end={exact}
    onClick={onClose}
    className={({ isActive }) =>
      `relative flex items-center gap-2 px-2.5 py-1.5 rounded-xl transition-all duration-200 group text-[11px] font-bold
      ${isActive ? 'text-white shadow-sm' : 'text-white/60 hover:bg-white/10 hover:text-white'}`
    }
    style={({ isActive }) =>
      isActive ? { background: 'linear-gradient(135deg,#FEBF10,#D9A400)', boxShadow: '0 3px 10px rgba(254,191,16,0.25)' } : {}
    }
  >
    {({ isActive }) => (
      <>
        <Icon size={13} className={isActive ? 'text-white' : 'text-white/40 group-hover:text-white transition-colors'} />
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
    return location.pathname === path;
  };
  const isAnyActive = subItems.some((s) => pathMatches(s.path));
  const [open, setOpen] = useState(isAnyActive);

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl transition-all text-[11px] font-bold group
          ${isAnyActive ? 'text-re-gold bg-white/10' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}
      >
        <Icon size={13} className={`${isAnyActive ? 'text-re-gold' : 'text-white/40 group-hover:text-white'} transition-colors`} />
        <span className="flex-1 text-left">{name}</span>
        <ChevronDown size={11} className={`transition-transform duration-300 opacity-40 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="ml-4 mt-0.5 space-y-0.5 border-l-2 border-white/10 pl-2.5">
          {subItems.map(sub => {
            const subActive = pathMatches(sub.path);
            return (
            <NavLink
              key={sub.path}
              to={sub.path}
              onClick={onClose}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all
                ${subActive ? 'text-white bg-re-gold shadow-sm' : 'text-white/50 hover:text-white hover:bg-white/10'}`}
            >
              <sub.icon size={11} className={subActive ? 'text-white' : 'text-white/30'} />
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
  <p className="text-[8px] font-black uppercase tracking-[0.18em] text-white/20 px-2.5 pt-2 pb-0.5">
    {label}
  </p>
);

const Sidebar = ({ onClose }) => {
  const { staff, logout } = useAuth();

  return (
    <div className="flex flex-col h-full bg-re-navy border-r border-white/5 shadow-2xl">
      <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />

      {/* Brand card — Gold header on dark sidebar */}
      <div className="p-3">
        <div className="rounded-2xl shadow-re-inner-dark border border-white/5 p-3 space-y-1">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2.5 rounded-2xl shadow-re-inner-dark text-white">
                  <img src="/logo.png" alt="Babyeyi" className="w-7 h-7 object-contain brightness-0 invert" />
            </div>
            <div>
              <span className="text-xl font-black tracking-tight leading-none block text-white">
                Babyeyi
              </span>
              <p className="text-[9px] text-white/70 font-black uppercase tracking-[0.2em] mt-0.5">
                Discipline Portal
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-1 overflow-y-auto space-y-0.5 custom-scrollbar">
        <SectionLabel label="Core Analytics" />
        <NavItem icon={LayoutDashboard} name="Dashboard" path="/" exact onClose={onClose} />
        
        <SectionLabel label="Behavioral Center" />
        <NavItem icon={ShieldAlert} name="Discipline Marks" path="/students" onClose={onClose} />
        <NavItem icon={ShieldCheck} name="Student Permissions" path="/permissions" onClose={onClose} />

        <SectionLabel label="Services" />
        <NavItem icon={Wallet} name="Shule Avance" path="/shule-avance" onClose={onClose} />

        <SectionLabel label="Config" />
        <NavItem icon={Settings} name="System Settings" path="/settings" onClose={onClose} />
      </nav>

      {/* Bottom Profile */}
      <div className="p-3">
        <div className="rounded-2xl border border-white/5 bg-white/5 shadow-re-inner-dark p-2 space-y-2">
          <div className="flex items-center justify-between px-1">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30">Status</p>
            <div className="scale-75 origin-right">
              <AppStatusBadge status="online" />
            </div>
          </div>

          <div className="h-px bg-white/5 mx-1" />

          {/* User profile */}
          <div className="flex items-center gap-2.5 px-2 py-1.5 bg-white/5 border border-white/5 rounded-xl shadow-re-inner-dark transform transition-all hover:bg-white/10">
            <div className="w-8 h-8 rounded-xl overflow-hidden bg-white/10 flex items-center justify-center shrink-0">
              {staff?.photo
                ? <img src={staff.photo} alt={staff.first_name} className="w-full h-full object-cover" />
                : <User size={16} className="text-white/50" />
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black truncate text-white uppercase tracking-tight">
                {staff?.first_name || 'Staff Member'}
              </p>
              <p className="text-[9px] text-white/40 truncate font-bold uppercase tracking-wider mt-0.5">
                {staff?.role_name || 'H.O.D'}
              </p>
            </div>
            <button onClick={logout} className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/30 hover:text-red-400 transition-colors">
              <LogOut size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
