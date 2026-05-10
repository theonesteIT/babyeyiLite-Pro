import { NavLink, useNavigate } from 'react-router-dom';
import { createElement } from 'react';
import {
  LayoutDashboard,
  Building2,
  BarChart3,
  Wallet,
  GraduationCap,
  ShieldAlert,
  ClipboardCheck,
  Bus,
  MessageSquare,
  FileSearch,
  FolderOpen,
  Settings,
  Wifi,
  WifiOff,
  RefreshCw,
  Headphones,
  Sparkles,
} from 'lucide-react';
import { h } from '../utils/href';
import babyeyiIcon from '../../manager/assets/babyeyi-icon.png';

const statusConfig = {
  online: { label: 'Live', dot: 'bg-emerald-400', text: 'text-emerald-400', Icon: Wifi },
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
    to={h(path)}
    end={exact}
    onClick={onClose}
    className={({ isActive }) =>
      `relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group text-[13px] font-semibold tracking-tight border border-transparent
      ${
        isActive
          ? 'bg-white/[0.12] text-amber-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] border-white/10'
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
            ? 'text-amber-400 shrink-0'
            : 'text-white/45 group-hover:text-white/85 shrink-0 transition-colors',
        })}
        <span className="truncate">{name}</span>
        {badgeCount > 0 && (
          <span className="ml-auto text-[10px] leading-none px-1.5 py-0.5 rounded-md bg-amber-400/95 text-[#000435] font-bold">
            {badgeCount > 99 ? '99+' : badgeCount}
          </span>
        )}
      </>
    )}
  </NavLink>
);

const SectionLabel = ({ label }) => (
  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/40 px-3 pt-4 pb-2 first:pt-1">{label}</p>
);

export default function RepresentativeSidebar({ onClose }) {
  const navigate = useNavigate();

  return (
    <div
      className="flex flex-col min-h-0 h-full w-full min-w-0 shadow-[2px_0_16px_rgba(0,4,53,0.35)] border-r border-white/[0.06]"
      style={{
        background: 'linear-gradient(180deg,#001a5c 0%,#000435 45%,#000220 100%)',
        colorScheme: 'dark',
      }}
    >
      <div className="p-4 pb-3 shrink-0 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/[0.08] ring-1 ring-amber-400/20">
            <img src={babyeyiIcon} alt="Babyeyi" className="h-7 w-7 object-contain" />
          </div>
          <div className="min-w-0">
            <span className="text-lg font-bold tracking-tight text-white block leading-tight">Babyeyi</span>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-400/95 mt-0.5">
              Representative Portal
            </p>
          </div>
        </div>
      </div>

      <nav
        className="manager-sidebar-scroll flex-1 min-h-0 px-3 py-3 overflow-y-auto overflow-x-hidden overscroll-y-contain space-y-0.5 pr-1"
        aria-label="School representative navigation"
      >
        <SectionLabel label="Main" />
        <NavItem icon={LayoutDashboard} name="Dashboard" path="/" exact onClose={onClose} />

        <SectionLabel label="Network" />
        <NavItem icon={Building2} name="Schools" path="/schools" onClose={onClose} />

        <SectionLabel label="Intelligence" />
        <NavItem icon={BarChart3} name="Analytics" path="/analytics" onClose={onClose} />
        <NavItem icon={Sparkles} name="AI insights" path="/insights" onClose={onClose} badgeCount={2} />

        <SectionLabel label="Operations" />
        <NavItem icon={Wallet} name="Finance" path="/finance" onClose={onClose} />
        <NavItem icon={GraduationCap} name="Academic reports" path="/academic" onClose={onClose} />
        <NavItem icon={ShieldAlert} name="Discipline" path="/discipline" onClose={onClose} />
        <NavItem icon={ClipboardCheck} name="Attendance" path="/attendance" onClose={onClose} />

        <SectionLabel label="Logistics" />
        <NavItem icon={Bus} name="Transport" path="/transport" onClose={onClose} />

        <SectionLabel label="Engagement" />
        <NavItem icon={MessageSquare} name="Communication" path="/communication" onClose={onClose} />

        <SectionLabel label="Compliance" />
        <NavItem icon={FileSearch} name="Inspections" path="/inspections" onClose={onClose} />

        <SectionLabel label="Library" />
        <NavItem icon={FolderOpen} name="Documents" path="/documents" onClose={onClose} />

        <SectionLabel label="App" />
        <NavItem icon={Settings} name="Settings" path="/settings" onClose={onClose} />
      </nav>

      <div className="p-4 pt-2 shrink-0 border-t border-white/[0.06] space-y-3">
        <div className="rounded-2xl bg-[#000220]/90 ring-1 ring-white/10 p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/15 ring-1 ring-amber-400/25">
              <Headphones className="text-amber-400" size={20} strokeWidth={1.75} aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">Help &amp; support</p>
              <p className="text-[12px] text-white/55 mt-1 leading-snug">
                Network operations, MINEDUC exports, and onboarding — we are one message away.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <AppStatusBadge status="online" />
            <button
              type="button"
              onClick={() => {
                navigate(h('/communication'));
                onClose?.();
              }}
              className="inline-flex items-center justify-center rounded-xl bg-amber-400 px-4 py-2.5 text-[13px] font-semibold text-[#000435] shadow-sm border border-amber-300/50 hover:bg-amber-300 active:scale-[0.98] transition-all"
            >
              Contact support
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
