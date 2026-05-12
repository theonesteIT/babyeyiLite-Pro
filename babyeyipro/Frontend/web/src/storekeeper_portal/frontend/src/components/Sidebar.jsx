import { NavLink, useNavigate } from 'react-router-dom';
import { createElement } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Package,
  ArrowDownUp,
  ClipboardList,
  Building2,
  User,
  LogOut,
  Wifi,
  WifiOff,
  RefreshCw,
  Store,
  MessageSquare,
  DollarSign,
  Sparkles,
  Landmark,
  Headphones,
  CalendarDays,
} from 'lucide-react';
import { PORTAL } from '../config/portal';
import useChatUnread from '../../../../shared/hooks/useChatUnread';
import { h } from '../utils/href';
import babyeyiIcon from '../assets/babyeyi-icon.png';

const statusConfig = {
  online: { label: 'Online', dot: 'bg-green-400', text: 'text-green-400', Icon: Wifi },
  offline: { label: 'Offline', dot: 'bg-red-400', text: 'text-red-400', Icon: WifiOff },
  syncing: { label: 'Syncing', dot: 'bg-amber-400', text: 'text-amber-400', Icon: RefreshCw },
};

const AppStatusBadge = ({ status = 'online' }) => {
  const s = statusConfig[status];
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 ring-1 ring-white/10">
      <span className="relative flex h-1.5 w-1.5">
        {status !== 'offline' && (
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${s.dot} opacity-60`} />
        )}
        <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${s.dot}`} />
      </span>
      <s.Icon size={10} className={`${s.text} ${status === 'syncing' ? 'animate-spin' : ''}`} />
      <span className="text-[9px] font-bold text-white/70">{s.label}</span>
    </div>
  );
};

const NavItem = ({ icon, name, path, exact, onClose, badgeCount = 0 }) => (
  <NavLink
    to={path}
    end={exact}
    onClick={onClose}
    className={({ isActive }) =>
      `relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group text-[13px] font-semibold tracking-tight border border-transparent
      ${
        isActive
          ? 'bg-white/[0.12] text-re-gold shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] border-white/10'
          : 'text-white/72 hover:bg-white/[0.06] hover:text-white'
      }`
    }
  >
    {({ isActive }) => (
      <>
        {createElement(icon, {
          size: 18,
          strokeWidth: 1.75,
          className: isActive
            ? 'text-re-gold shrink-0'
            : 'text-white/45 group-hover:text-white/85 shrink-0 transition-colors',
        })}
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

const SectionLabel = ({ label }) => (
  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400 px-3 pt-4 pb-2 first:pt-1">{label}</p>
);

const Sidebar = ({ onClose }) => {
  const navigate = useNavigate();
  const { staff, logout } = useAuth();
  const unreadCount = useChatUnread();

  return (
    <div
      className="flex flex-col min-h-0 h-full w-full min-w-0 shadow-[2px_0_16px_rgba(11,21,48,0.14)] border-r border-white/[0.06]"
      style={{
        background: 'linear-gradient(180deg,#0f2247 0%,#0b1530 40%,#060d1f 100%)',
        colorScheme: 'dark',
      }}
    >
      <div className="p-4 pb-3 shrink-0 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/[0.08] ring-1 ring-white/10">
            <img src={babyeyiIcon} alt="Babyeyi icon" className="h-7 w-7 object-contain" />
          </div>
          <div className="min-w-0">
            <span className="text-lg font-bold tracking-tight text-white block leading-tight">Babyeyi</span>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-re-gold/95 mt-0.5">{PORTAL.brandLine}</p>
          </div>
        </div>
      </div>

      <nav
        className="storekeeper-sidebar-scroll flex-1 min-h-0 px-3 py-3 overflow-y-auto overflow-x-hidden overscroll-y-contain space-y-0.5 pr-1"
        aria-label="Storekeeper navigation"
      >
        <SectionLabel label="Main" />
        <NavItem icon={LayoutDashboard} name="Dashboard" path={h('/')} exact onClose={onClose} />

        <SectionLabel label="Store operations" />
        <NavItem icon={Package} name="Inventory" path={h('/inventory')} onClose={onClose} />
        <NavItem icon={ArrowDownUp} name="Stock Movements" path={h('/movements')} onClose={onClose} />
        <NavItem icon={ClipboardList} name="Requisitions" path={h('/requisitions')} onClose={onClose} />
        <NavItem icon={Building2} name="Suppliers" path={h('/suppliers')} onClose={onClose} />

        <NavItem icon={CalendarDays} name="School Calendar" path={h('/school-calendar')} onClose={onClose} />

        <SectionLabel label="Services" />
        <NavItem icon={DollarSign} name="My Payroll" path={h('/my-payroll')} onClose={onClose} />
        <NavItem icon={Sparkles} name="Shule Avance" path={h('/shule-avance')} onClose={onClose} />
        <NavItem icon={Store} name="Ticha AI" path={h('/ticha-ai')} onClose={onClose} />
        <NavItem icon={MessageSquare} name="Chat Center" path={h('/chat')} onClose={onClose} badgeCount={unreadCount} />
      </nav>

      <div className="p-4 pt-2 shrink-0 border-t border-white/[0.06] space-y-3">
        <div className="rounded-2xl bg-[#060d1f]/90 ring-1 ring-white/10 p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-re-gold/15 ring-1 ring-re-gold/25">
              <Headphones className="text-re-gold" size={20} strokeWidth={1.75} aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">Help &amp; support</p>
              <p className="text-[12px] text-white/55 mt-1 leading-snug">
                Contact procurement or finance from chat or through your manager.
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
              className="inline-flex items-center justify-center rounded-xl bg-re-gold px-4 py-2.5 text-[13px] font-bold text-[#0b1530] shadow-sm border border-[#d4a20a]/30 hover:bg-yellow-400 active:scale-[0.98] transition-all"
            >
              Open chat
            </button>
          </div>
        </div>

        <div className="rounded-2xl bg-white/[0.06] ring-1 ring-white/10 p-3 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl overflow-hidden bg-white/10 flex items-center justify-center shrink-0 ring-1 ring-white/10">
            {staff?.photo ? (
              <img src={staff.photo} alt="" className="w-full h-full object-cover" />
            ) : (
              <User size={16} className="text-white/70" aria-hidden />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold text-white truncate">{staff?.first_name || 'Storekeeper'}</p>
            <p className="text-[10px] text-white/45 truncate font-medium">{staff?.role_name || PORTAL.roleLabel}</p>
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
