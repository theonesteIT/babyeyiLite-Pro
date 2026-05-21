import { NavLink, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import useChatUnread from '../hooks/useChatUnread';
import {
  LayoutDashboard, Users, BookOpen, Calendar, CalendarDays, ClipboardCheck,
  Wallet, MessageSquare, ClipboardList, Eye, PenLine, FileSpreadsheet,
  Building2, LogOut, WifiOff, GraduationCap, ChevronDown, DollarSign, Shield,
  ListChecks,
} from 'lucide-react';

import { h } from '../utils/href';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5100';
const toPhotoUrl = (photo) => {
  if (!photo) return null;
  if (photo.startsWith('http://') || photo.startsWith('https://')) return photo;
  return `${API_BASE}${photo}`;
};

// ── Single nav link ───────────────────────────────────────────
const NavItem = ({ icon: Icon, name, path, exact, onClose, badgeCount = 0 }) => (
  <NavLink
    to={path}
    end={exact}
    onClick={onClose}
    className={({ isActive }) =>
      `relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group text-[13px] font-black
      ${isActive ? 'bg-gradient-to-r from-[#000435] to-[#0a116b] text-white shadow-md' : 'text-slate-500 hover:bg-[#000435]/5 hover:text-[#000435]'}`
    }
  >
    {({ isActive }) => (
      <>
        <Icon size={16} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'text-[#f59e0b]' : 'text-slate-400 group-hover:text-[#f59e0b] transition-colors'} />
        <span>{name}</span>
        {badgeCount > 0 && (
          <span className="ml-auto text-[10px] font-black leading-none px-2 py-1 rounded-full bg-red-500 text-white shadow-sm">
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
  const isAnyActive = subItems.some(s => location.pathname === s.path);
  const [open, setOpen] = useState(isAnyActive);

  useEffect(() => {
    if (isAnyActive) setOpen(true);
  }, [isAnyActive]);

  return (
    <div className="space-y-1">
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-[13px] font-black group
          ${isAnyActive ? 'text-[#000435] bg-[#000435]/5' : 'text-slate-500 hover:bg-[#000435]/5 hover:text-[#000435]'}`}
      >
        <Icon size={16} strokeWidth={isAnyActive ? 2.5 : 2} className={`${isAnyActive ? 'text-[#f59e0b]' : 'text-slate-400 group-hover:text-[#f59e0b]'} transition-colors`} />
        <span className="flex-1 text-left">{name}</span>
        <ChevronDown size={14} className={`transition-transform duration-300 opacity-50 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="ml-5 mt-1 space-y-1 border-l-2 border-[#000435]/10 pl-3 py-1">
          {subItems.map(sub => (
            <NavLink
              key={sub.path}
              to={sub.path}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all
                ${isActive ? 'text-[#000435] bg-[#000435]/5' : 'text-slate-500 hover:text-[#000435] hover:bg-slate-50'}`
              }
            >
              {({ isActive }) => (
                <>
                  <sub.icon size={14} className={isActive ? 'text-[#f59e0b]' : 'text-slate-400'} />
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
  <p className="text-[10px] font-black tracking-[0.15em] uppercase text-slate-400 px-3 pt-4 pb-1">
    {label}
  </p>
);

// ── Sidebar ───────────────────────────────────────────────────
const Sidebar = ({ onClose }) => {
  const { teacher, logout } = useAuth();
  const unreadCount = useChatUnread();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    const goOnline  = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online',  goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online',  goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // School logo + initials fallback
  const schoolLogo   = teacher?.school?.logo ? toPhotoUrl(teacher.school.logo) : null;
  const schoolName   = teacher?.school?.name || '';
  const schoolInitial = schoolName.trim().charAt(0).toUpperCase() || 'S';
   
  return (
    <div className="flex flex-col h-full bg-white border-r border-black/5 shadow-sm">

      {/* Brand card — premium feel */}
      <div className="p-4 shrink-0">
        <div className="rounded-2xl bg-gradient-to-br from-[#000435] to-[#0a116b] p-3 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          <div className="flex items-center gap-3 relative z-10">
            
            <div>
              <span className="text-xl font-black text-center text-white tracking-wide block">
                Babyeyi
              </span>
              <span className="text-[10px] text-center font-bold uppercase tracking-widest text-[#f59e0b] bg-[#f59e0b]/10 px-2 py-0.5 rounded-md mt-1 inline-block">
                Portal
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <nav className="px-3 pb-6 space-y-1">
          <NavItem icon={LayoutDashboard} name="Dashboard" path={h('/')} exact onClose={onClose} />
          
          <SectionLabel label="Academic" />
          <NavItem icon={Users} name="Students" path={h('/students')} onClose={onClose} />
          <NavItem icon={BookOpen} name="English Club" path={h('/english-club')} onClose={onClose} />
          <NavItem icon={Calendar} name="Timetable" path={h('/timetable')} onClose={onClose} />
          <ExpandableNavItem
            icon={ClipboardCheck}
            name="Attendance"
            onClose={onClose}
            subItems={[
              { name: 'Period attendance', path: h('/attendance'), icon: ClipboardCheck },
              { name: 'Round roll call', path: h('/round-roll-call'), icon: Users },
              { name: 'Teacher attendance', path: h('/teacher-attendance'), icon: GraduationCap },
            ]}
          />
          <ExpandableNavItem
            icon={ClipboardList}
            name="Marks Sheet"
            onClose={onClose}
            subItems={[
              { name: 'View Student Marks', path: h('/marks/view'), icon: Eye },
              { name: 'Record Marks', path: h('/marks/record'), icon: PenLine },
              { name: 'Examination list', path: h('/exam-eligibility'), icon: ListChecks },
            ]}
          />

          <SectionLabel label="Management" />
          <NavItem icon={DollarSign} name="My Payroll" path={h('/payroll')} onClose={onClose} />
          <NavItem icon={Wallet} name="Shule Avance" path={h('/shule-avance')} onClose={onClose} />
          <NavItem icon={Building2} name="TichaDeals" path={h('/ticha-deals')} onClose={onClose} />
          <NavItem icon={FileSpreadsheet} name="Requisitions" path={h('/requisitions')} onClose={onClose} />
          <NavItem icon={Shield} name="Permissions" path={h('/permissions')} onClose={onClose} />
          <NavItem icon={CalendarDays} name="School Calendar" path={h('/school-calendar')} onClose={onClose} />

          <SectionLabel label="Communication" />
          <NavItem icon={MessageSquare} name="TichaAI" path={h('/ticha-ai')} onClose={onClose} />
          <NavItem icon={MessageSquare} name="Chat Center" path={h('/chat')} onClose={onClose} badgeCount={unreadCount} />
        </nav>
      </div>

      {/* Bottom card — premium feel */}
      <div className="p-4 shrink-0 border-t border-slate-100 bg-slate-50/50">
        <div className="space-y-3">
          {/* Offline warning — only shown when offline */}
          {!isOnline && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 border border-red-100 shadow-sm animate-pulse">
              <WifiOff size={14} className="text-red-500 shrink-0" />
              <p className="text-[10px] font-black uppercase tracking-wider text-red-600">
                Working Offline
              </p>
            </div>
          )}

          {/* School card */}
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-2xl bg-white border border-black/5 shadow-sm">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 flex items-center justify-center shrink-0 border border-black/5">
              {schoolLogo && !logoError
                ? <img
                    src={schoolLogo}
                    alt={schoolName}
                    className="w-full h-full object-contain p-1"
                    onError={() => setLogoError(true)}
                  />
                : <span className="text-sm font-black text-[#000435]">{schoolInitial}</span>
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-black truncate text-[#000435]">
                {teacher?.first_name || 'Teacher'}
              </p>
              <p className="text-[10px] font-bold text-slate-500 truncate mt-0.5">
                {schoolName || 'Academic Staff'}
              </p>
            </div>
            <button
              onClick={logout}
              className="p-2 rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors shrink-0"
              title="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
