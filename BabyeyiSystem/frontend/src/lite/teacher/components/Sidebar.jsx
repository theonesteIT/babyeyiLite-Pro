import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import useChatUnread from '../hooks/useChatUnread';
import {
  LayoutDashboard, Users, BookOpen, Calendar, CalendarDays, ClipboardCheck,
  Wallet, MessageSquare, ClipboardList, Eye, PenLine, FileSpreadsheet,
  Building2, LogOut, WifiOff, Wifi, GraduationCap, ChevronDown, DollarSign, Shield,
  ListChecks, Search, Headphones,
} from 'lucide-react';
import babyeyiIcon from '../../shared/assets/babyeyi-icon.png';
import { h } from '../utils/href';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5100';
const GOLD = '#FEBF10';
const NAVY = '#000435';

const toPhotoUrl = (photo) => {
  if (!photo) return null;
  if (photo.startsWith('http://') || photo.startsWith('https://')) return photo;
  return `${API_BASE}${photo}`;
};

const AppStatusBadge = ({ online }) => (
  <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 ring-1 ring-white/10">
    <span className="relative flex h-1.5 w-1.5">
      {online && (
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-60" />
      )}
      <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${online ? 'bg-green-400' : 'bg-red-400'}`} />
    </span>
    {online ? <Wifi size={10} className="text-green-400" /> : <WifiOff size={10} className="text-red-400" />}
    <span className="text-[9px] font-medium text-white/70">{online ? 'Online' : 'Offline'}</span>
  </div>
);

const NavItem = ({ icon: Icon, name, path, exact, onClose, badgeCount = 0 }) => (
  <NavLink
    to={path}
    end={exact}
    onClick={onClose}
    className={({ isActive }) =>
      `relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-[13px] font-medium tracking-tight border border-transparent
      ${
        isActive
          ? 'bg-white/[0.12] text-[#FEBF10] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] border-white/10'
          : 'text-white/72 hover:bg-white/[0.06] hover:text-white'
      }`
    }
  >
    {({ isActive }) => (
      <>
        <Icon size={18} strokeWidth={1.75} className={isActive ? 'text-[#FEBF10] shrink-0' : 'text-white/45 shrink-0'} />
        <span className="truncate flex-1">{name}</span>
        {badgeCount > 0 && (
          <span className="text-[10px] leading-none px-1.5 py-0.5 rounded-md bg-[#FEBF10]/90 text-[#0B1530] font-medium shrink-0">
            {badgeCount > 99 ? '99+' : badgeCount}
          </span>
        )}
      </>
    )}
  </NavLink>
);

const ExpandableNavItem = ({ icon: Icon, name, subItems, onClose }) => {
  const location = useLocation();
  const isAnyActive = subItems.some((s) => location.pathname === s.path);
  const [open, setOpen] = useState(isAnyActive);

  useEffect(() => {
    if (isAnyActive) setOpen(true);
  }, [isAnyActive]);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-[13px] font-medium tracking-tight border border-transparent
          ${
            isAnyActive
              ? 'bg-white/[0.12] text-[#FEBF10] border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
              : 'text-white/72 hover:bg-white/[0.06] hover:text-white'
          }`}
      >
        <Icon size={18} strokeWidth={1.75} className={isAnyActive ? 'text-[#FEBF10] shrink-0' : 'text-white/45 shrink-0'} />
        <span className="flex-1 text-left truncate">{name}</span>
        <ChevronDown size={16} strokeWidth={2} className={`transition-transform duration-300 text-white/40 shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="ml-2 mt-1 space-y-0.5 border-l border-white/15 pl-3">
          {subItems.map((sub) => (
            <NavLink
              key={sub.path}
              to={sub.path}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-all
                ${isActive ? 'text-[#FEBF10] bg-white/[0.08]' : 'text-white/60 hover:text-white hover:bg-white/[0.05]'}`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${isActive ? 'bg-[#FEBF10]' : 'bg-white/30'}`} />
                  <span className="truncate flex-1">{sub.name}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
};

const SectionLabel = ({ label }) => (
  <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-white/40 px-3 pt-4 pb-1">
    {label}
  </p>
);

const Sidebar = ({ onClose }) => {
  const navigate = useNavigate();
  const { teacher, logout } = useAuth();
  const unreadCount = useChatUnread();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  const schoolLogo = teacher?.school?.logo ? toPhotoUrl(teacher.school.logo) : null;
  const schoolName = teacher?.school?.name || '';
  const schoolInitial = schoolName.trim().charAt(0).toUpperCase() || 'S';

  return (
    <div
      className="flex flex-col min-h-0 h-full w-full min-w-0 border-r border-white/[0.06] shadow-sm font-sans"
      style={{ background: NAVY, colorScheme: 'dark', fontFamily: "'Montserrat', sans-serif" }}
    >
      <div className="p-4 pb-3 shrink-0 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm overflow-hidden">
            <img src={babyeyiIcon} alt="Babyeyi" className="h-10 w-10 object-contain" />
          </div>
          <div className="min-w-0">
            <span className="text-base font-semibold tracking-tight text-white block leading-tight">Babyeyi</span>
            <p className="text-[10px] font-medium tracking-wide text-amber-400 mt-0.5 uppercase">Teacher portal</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 min-h-0 px-3 py-3 overflow-y-auto overflow-x-hidden space-y-1 pr-1 custom-scrollbar">
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
            { name: 'Period attendance', path: h('/attendance') },
            { name: 'Round roll call', path: h('/round-roll-call') },
            { name: 'Teacher attendance', path: h('/teacher-attendance') },
          ]}
        />
        <ExpandableNavItem
          icon={ClipboardList}
          name="Marks Sheet"
          onClose={onClose}
          subItems={[
            { name: 'View Student Marks', path: h('/marks/view') },
            { name: 'Record Marks', path: h('/marks/record') },
            { name: 'Examination list', path: h('/exam-eligibility') },
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

      <div className="p-4 pt-2 shrink-0 border-t border-white/[0.06] space-y-3">
        <div className="rounded-2xl bg-[#060d1f]/90 ring-1 ring-white/10 p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FEBF10]/15 ring-1 ring-[#FEBF10]/25">
              <Headphones className="text-[#FEBF10]" size={20} strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white">Help &amp; support</p>
              <p className="text-[12px] text-white/55 mt-1 leading-snug">Chat with your school or contact the admin office.</p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <AppStatusBadge online={isOnline} />
            <button
              type="button"
              onClick={() => {
                navigate(h('/chat'));
                onClose?.();
              }}
              className="inline-flex items-center justify-center rounded-xl bg-[#FEBF10] px-4 py-2.5 text-[13px] font-medium text-[#0b1530] border border-black/10 shadow-sm hover:brightness-105 active:scale-[0.98] transition-all"
            >
              Open chat
            </button>
          </div>
        </div>

        <div className="rounded-2xl bg-white/[0.06] ring-1 ring-white/10 p-3 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl overflow-hidden bg-white/10 flex items-center justify-center shrink-0 ring-1 ring-white/10">
            {schoolLogo && !logoError ? (
              <img
                src={schoolLogo}
                alt={schoolName}
                className="w-full h-full object-contain p-0.5"
                onError={() => setLogoError(true)}
              />
            ) : (
              <span className="text-xs font-bold text-white">{schoolInitial}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-medium text-white truncate">{teacher?.first_name || 'Teacher'}</p>
            <p className="text-[10px] text-white/45 truncate font-medium">{schoolName || 'Academic Staff'}</p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="p-2 rounded-xl text-white/45 hover:text-red-300 hover:bg-white/5 transition-colors"
            aria-label="Log out"
          >
            <LogOut size={18} strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
