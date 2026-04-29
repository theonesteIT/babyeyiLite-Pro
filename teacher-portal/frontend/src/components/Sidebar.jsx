import { NavLink, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import useChatUnread from '../hooks/useChatUnread';
import {
  LayoutDashboard, Users, BookOpen, Calendar, ClipboardCheck,
  Wallet, MessageSquare, ClipboardList, Eye, PenLine, FileSpreadsheet,
  Building2, LogOut, WifiOff, GraduationCap, ChevronDown, DollarSign,
} from 'lucide-react';

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
      `relative flex items-center gap-2 px-2.5 py-1.5 rounded-xl transition-all duration-200 group text-xs
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
  const isAnyActive = subItems.some(s => location.pathname === s.path);
  const [open, setOpen] = useState(isAnyActive);

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl transition-all text-xs group
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
              to={sub.path}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs  transition-all
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
  <p className="text-[10px] font-bold text-re-text-muted/50 px-2.5 pt-2 pb-0.5">
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
   console.log('school logo: ', schoolLogo);
   
  return (
    <div className="flex flex-col h-full bg-white border-r border-black/5 shadow-sm">

      {/* Brand card — premium feel */}
      <div className="p-3">
        <div className="rounded-2xl border border-orange-100 bg-orange-50 shadow-inner p-3 space-y-1">
          <div className="flex items-center gap-3">
            <div className="bg-white p-2 rounded-2xl shadow-inner border border-orange-100">
              <img src="/logo.png" alt="Babyeyi" className="w-7 h-7 object-contain" />
            </div>
            <div>
              <span
                className="text-xl font-bold leading-none block"
                style={{ background: 'linear-gradient(135deg,#FF8C00,#FF5E00)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
              >
                Babyeyi
              </span>
              <p className="text-[10px] text-re-text-muted font-bold mt-0.5">
                Shule Teacher
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
        <NavItem icon={DollarSign} name="My Payroll" path="/payroll" onClose={onClose} />

        <SectionLabel label="Services" />
        <NavItem icon={Wallet} name="Shule Avance" path="/shule-avance" onClose={onClose} />
        <NavItem icon={FileSpreadsheet} name="Requisitions" path="/requisitions" onClose={onClose} />

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

          {/* Offline warning — only shown when offline */}
          {!isOnline && (
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-xl bg-red-50 border border-red-100">
              <WifiOff size={13} className="text-tomato shrink-0" style={{ color: 'tomato' }} />
              <p className="text-[10px] font-bold" style={{ color: 'tomato' }}>
                You are working offline
              </p>
            </div>
          )}

          {/* School card */}
          <div className="flex items-center gap-2.5 px-2 py-1.5 ">
            <div className="w-8 h-8 rounded-xl overflow-hidden bg-orange-100 flex items-center justify-center shrink-0">
              {schoolLogo && !logoError
                ? <img
                    src={schoolLogo}
                    alt={schoolName}
                    className="w-full h-full object-contain p-0.5"
                    onError={() => setLogoError(true)}
                  />
                : <span
                    className="text-sm font-black"
                    style={{ color: '#FF8C00' }}
                  >{schoolInitial}</span>
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs  truncate text-re-text">
                {teacher?.first_name || 'Teacher'}
              </p>
              <p className="text-xs text-re-text-muted truncate  mt-0.5">
                {schoolName || 'Academic Staff'}
              </p>
            </div>
            <button
              onClick={logout}
              className="p-1.5 rounded-lg text-re-text-muted hover:bg-red-50 hover:text-red-500 transition-colors shrink-0"
              title="Sign out"
            >
              <LogOut size={14} />
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Sidebar;
