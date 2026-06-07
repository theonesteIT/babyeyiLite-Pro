import { NavLink, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { h } from '../utils/href';
import useChatUnread from '../../shared/hooks/useChatUnread';
import {
  LayoutDashboard, Users, BookOpen, Calendar, ClipboardCheck,
  Wallet, MessageSquare, ClipboardList, Eye, PenLine,
  User, LogOut, Wifi, WifiOff, RefreshCw, GraduationCap, ChevronDown, Package,
  ShoppingBag,
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
const NavItem = ({ icon: Icon, name, path, exact, onClose, badgeCount = 0 }) => (
  <NavLink
    to={h(path)}
    end={exact}
    onClick={onClose}
    className={({ isActive }) =>
      `relative flex items-center gap-2 px-2.5 py-1.5 rounded-xl transition-all duration-200 group text-[11px] font-bold
      ${isActive ? 'text-white shadow-sm' : 'text-re-text-muted hover:bg-orange-50 hover:text-re-orange'}`
    }
    style={({ isActive }) =>
      isActive ? { background: 'linear-gradient(135deg,#FF8C00,#FF5E00)', boxShadow: '0 3px 10px rgba(255,140,0,0.28)' } : {}
    }
  >
    {({ isActive }) => (
      <>
        <Icon size={13} className={isActive ? 'text-white' : 'text-re-text-muted/50 group-hover:text-re-orange transition-colors'} />
        <span>{name}</span>
        {badgeCount > 0 && (
          <span className="ml-auto text-[10px] leading-none px-1.5 py-1 rounded-full bg-red-100 text-red-700">
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
  const isAnyActive = subItems.some(s => location.pathname === h(s.path));
  const [open, setOpen] = useState(isAnyActive);

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl transition-all text-[11px] font-bold group
          ${isAnyActive ? 'text-re-orange bg-orange-50' : 'text-re-text-muted hover:bg-orange-50 hover:text-re-orange'}`}
      >
        <Icon size={13} className={`${isAnyActive ? 'text-re-orange' : 'text-re-text-muted/50 group-hover:text-re-orange'} transition-colors`} />
        <span className="flex-1 text-left">{name}</span>
        <ChevronDown size={11} className={`transition-transform duration-300 opacity-40 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="ml-4 mt-0.5 space-y-0.5 border-l-2 border-orange-100 pl-2.5">
          {subItems.map(sub => (
            <NavLink
              key={sub.path}
              to={h(sub.path)}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all
                ${isActive ? 'text-re-orange bg-orange-50' : 'text-re-text-muted hover:text-re-orange hover:bg-orange-50/50'}`
              }
            >
              {({ isActive }) => (
                <>
                  <sub.icon size={11} className={isActive ? 'text-re-orange' : 'text-re-text-muted/40'} />
                  {sub.name}
                </>
              )}
            </NavLink>
          ))}
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
  const { teacher, logout } = useAuth();
  const unreadCount = useChatUnread();

  return (
    <div className="flex flex-col h-full bg-white border-r border-black/5 shadow-sm">

      {/* Brand card — premium feel */}
      <div className="p-3">
        <div className="rounded-2xl border border-orange-100 bg-orange-50 shadow-inner p-3 space-y-1">
          <div className="flex items-center gap-3">
            <div className="bg-orange-100 p-2.5 rounded-2xl shadow-inner" style={{ color: '#FF8C00' }}>
              <GraduationCap size={22} />
            </div>
            <div>
              <span
                className="text-xl font-black tracking-tight leading-none block"
                style={{ background: 'linear-gradient(135deg,#FF8C00,#FF5E00)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
              >
                Babyeyi
              </span>
              <p className="text-[9px] text-re-text-muted font-black uppercase tracking-[0.2em] opacity-60 mt-0.5">
                Teacher Portal
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-1 overflow-y-auto space-y-0.5">
        <NavItem icon={LayoutDashboard} name="Dashboard" path="/" exact onClose={onClose} />
        <NavItem icon={Users} name="Students" path="/students" onClose={onClose} />
        <NavItem icon={BookOpen} name="English Club" path="/english-club" onClose={onClose} />
        <NavItem icon={Calendar} name="Timetable" path="/timetable" onClose={onClose} />
        <NavItem icon={ClipboardCheck} name="Attendance" path="/attendance" onClose={onClose} />
        <NavItem icon={Package} name="Request Equipment" path="/equipment-requests" onClose={onClose} />
        <NavItem icon={ShoppingBag} name="Purchase Requests" path="/purchase-requests" onClose={onClose} />

        <SectionLabel label="Services" />
        <NavItem icon={Wallet} name="Shule Avance" path="/shule-avance" onClose={onClose} />
        <NavItem icon={ShoppingBag} name="Ticha Deals" path="/ticha-deals" onClose={onClose} />

        <SectionLabel label="Tools" />
        <NavItem icon={MessageSquare} name="TichaAI" path="/ticha-ai" onClose={onClose} />
        <NavItem icon={MessageSquare} name="Chat Center" path="/chat" onClose={onClose} badgeCount={unreadCount} />
        <ExpandableNavItem
          icon={ClipboardList}
          name="Marks Sheet"
          onClose={onClose}
          subItems={[
            { name: 'View Student Marks', path: '/marks/view', icon: Eye },
            { name: 'Record Marks', path: '/marks/record', icon: PenLine },
          ]}
        />
      </nav>

      {/* Bottom card — premium feel */}
      <div className="p-3">
        <div className="rounded-2xl border border-black/5 bg-re-bg shadow-inner p-2 space-y-2">

          <div className="flex items-center justify-between px-1">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-re-text-muted/40">Status</p>
            <AppStatusBadge status="online" />
          </div>

          <div className="h-px bg-black/5 mx-1" />

          {/* Teacher profile */}
          <div className="flex items-center gap-2.5 px-2 py-1.5 bg-white rounded-xl border border-black/5 shadow-sm">
            <div className="w-8 h-8 rounded-xl overflow-hidden bg-orange-100 flex items-center justify-center shrink-0">
              {teacher?.photo
                ? <img src={teacher.photo} alt={teacher.full_name} className="w-full h-full object-cover" />
                : <User size={16} style={{ color: '#FF8C00' }} />
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black truncate text-re-text uppercase tracking-tight">
                {teacher?.first_name || 'Teacher'}
              </p>
              <p className="text-[9px] text-re-text-muted truncate font-bold uppercase tracking-wider opacity-50 mt-0.5">
                {teacher?.school?.name || 'Academic Staff'}
              </p>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={logout}
            className="flex items-center justify-between w-full px-3 py-2 bg-white hover:bg-red-50 text-re-text-muted hover:text-red-500 rounded-xl border border-black/5 hover:border-red-100 shadow-sm transition-all group cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-re-bg group-hover:bg-red-100 flex items-center justify-center transition-colors">
                <LogOut size={13} className="text-re-text-muted group-hover:text-red-500" />
              </div>
              <span className="text-sm font-bold">Logout</span>
            </div>
            <p className="text-[10px] text-re-text-muted/40 font-bold truncate max-w-[90px]">
              {teacher?.email || ''}
            </p>
          </button>

        </div>
      </div>
    </div>
  );
};

export default Sidebar;
