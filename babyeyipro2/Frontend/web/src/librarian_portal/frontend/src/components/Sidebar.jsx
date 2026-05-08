import { NavLink, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, BookOpen, BookMarked, RotateCcw,
  Wallet, User, LogOut, Wifi, WifiOff, RefreshCw, ChevronDown, MessageSquare,
  Library, BarChart2, Settings, DollarSign, AlertTriangle, Layers, Sparkles,
} from 'lucide-react';
import { PORTAL } from '../config/portal';
import useChatUnread from '../../../../shared/hooks/useChatUnread';

// ── Status Badge ──────────────────────────────────────────────
const statusConfig = {
  online:  { label: 'Online',  dot: 'bg-green-400',  text: 'text-green-600',  ring: 'ring-green-100',  bg: 'bg-green-50',  Icon: Wifi },
  offline: { label: 'Offline', dot: 'bg-red-400',    text: 'text-red-500',    ring: 'ring-red-100',    bg: 'bg-red-50',    Icon: WifiOff },
  syncing: { label: 'Syncing', dot: 'bg-amber-400',  text: 'text-amber-600',  ring: 'ring-amber-100',  bg: 'bg-amber-50',  Icon: RefreshCw },
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
    to={path}
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
  const pathMatches = (path) => location.pathname === path;
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
                to={sub.path}
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
  const { staff, logout } = useAuth();
  const unreadCount = useChatUnread();

  return (
    <div className="flex flex-col h-full min-w-[300px] bg-white border-r border-black/5 shadow-sm">

      {/* Brand card */}
      <div className="p-4">
        <div className="rounded-3xl bg-white border border-[#000435]/10 shadow-[0_10px_30px_-16px_rgba(0,4,53,.45)] p-4 space-y-1">
          <div className="flex items-center gap-3">
            <div className="bg-[#000435]/10 p-3 rounded-2xl shadow-inner text-[#000435] border border-amber-300/30">
              <Library size={22} />
            </div>
            <div>
              <span
                className="text-xl font-black tracking-tight leading-none block"
                style={{ background: 'linear-gradient(135deg,#000435,#142f63)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
              >
                Babyeyi
              </span>
              <p className="text-[9px] text-[#000435] font-black uppercase tracking-[0.22em] opacity-60 mt-0.5">
                {PORTAL.brandLine}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 overflow-y-auto space-y-1">
        <NavItem icon={LayoutDashboard} name="Dashboard" path="/librarian" exact onClose={onClose} />

        <SectionLabel label="Catalogue" />
        <NavItem icon={BookOpen}   name="Books"    path="/librarian/books"    onClose={onClose} />

        <SectionLabel label="Circulation" />
        <NavItem icon={BookMarked} name="Borrowing" path="/librarian/borrowing" onClose={onClose} />
        <NavItem icon={RotateCcw}  name="Returns"   path="/librarian/returns"   onClose={onClose} />

        <SectionLabel label="Reports" />
        <ExpandableNavItem
          icon={BarChart2}
          name="Reports"
          onClose={onClose}
          subItems={[
            { name: 'Overview',    path: '/librarian/reports',             icon: BarChart2 },
            { name: 'Overdue',     path: '/librarian/reports/overdue',     icon: AlertTriangle },
            { name: 'Book Stock',  path: '/librarian/reports/circulation', icon: Layers },
          ]}
        />

        <SectionLabel label="Services" />
        <NavItem icon={DollarSign}    name="My Payroll"   path="/librarian/my-payroll"   onClose={onClose} />
        <NavItem icon={Sparkles}      name="Shule Avance" path="/librarian/shule-avance" onClose={onClose} />
        <NavItem icon={MessageSquare} name="Chat Center"  path="/librarian/chat"         onClose={onClose} badgeCount={unreadCount} />

        <SectionLabel label="System" />
        <NavItem icon={Settings} name="Settings" path="/librarian/settings" onClose={onClose} />
      </nav>

      {/* Bottom card */}
      <div className="p-4">
        <div className="rounded-3xl border border-[#000435]/10 bg-white shadow-[0_10px_30px_-16px_rgba(0,4,53,.45)] p-3 space-y-2">

          <div className="flex items-center justify-between px-1">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#000435]/40">Status</p>
            <AppStatusBadge status="online" />
          </div>

          <div className="h-px bg-black/5 mx-1" />

          <div className="flex items-center gap-2.5 px-2.5 py-2 bg-white rounded-2xl border border-black/5 shadow-sm">
            <div className="w-8 h-8 rounded-xl overflow-hidden bg-[#000435]/10 flex items-center justify-center shrink-0">
              {staff?.photo
                ? <img src={staff.photo} alt={staff.first_name} className="w-full h-full object-cover" />
                : <User size={16} className="text-[#000435]" />
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black truncate text-[#000435] uppercase tracking-tight">
                {staff?.first_name || 'Librarian'}
              </p>
              <p className="text-[9px] text-[#000435]/55 truncate font-bold uppercase tracking-wider opacity-70 mt-0.5">
                {staff?.school?.name ? `${staff.school.name} · ${PORTAL.roleLabel}` : PORTAL.profileFallback}
              </p>
            </div>
            <button
              onClick={logout}
              className="p-1.5 rounded-lg hover:bg-red-50 text-[#000435]/30 hover:text-red-500 transition-colors"
            >
              <LogOut size={12} />
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Sidebar;
