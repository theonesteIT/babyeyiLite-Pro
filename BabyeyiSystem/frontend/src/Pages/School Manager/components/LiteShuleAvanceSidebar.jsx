/**
 * Left navigation for Lite Shule Avance (Ticha Avance + TichaDeals).
 * Matches School Manager sidebar: #000435 navy + amber-400.
 */
import { NavLink } from 'react-router-dom';
import { BookOpen, ChevronRight, ShoppingBag, Wallet, X } from 'lucide-react';
import LogoutButton from '../../Auth/LogoutButton';
import { useAuth } from '../../../context/AuthContext';
import babyeyiLogo from '../../../assets/1BABYEYI LOGO FINAL.png';

const FONT = `"Montserrat", system-ui, sans-serif`;

const NAV = [
  { to: '/lite/shule-avance', end: true, label: 'Ticha Avance', icon: Wallet },
  { to: '/lite/shule-avance/deals', end: false, label: 'TichaDeals', icon: ShoppingBag },
];

function NavItem({ item, onNavigate }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      className={({ isActive }) =>
        `w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-bold transition-all duration-150 mb-0.5 ${
          isActive
            ? 'bg-amber-400 text-[#000435] shadow-md shadow-amber-900/20'
            : 'text-white/65 hover:bg-white/8 hover:text-white'
        }`
      }
      style={{ fontFamily: FONT }}
    >
      {({ isActive }) => (
        <>
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all ${
              isActive ? 'bg-[#000435]/20' : 'bg-white/5'
            }`}
          >
            <item.icon size={16} />
          </div>
          <span className="flex-1 truncate text-left">{item.label}</span>
          {isActive ? <ChevronRight size={14} className="text-[#000435]/50 shrink-0" /> : null}
        </>
      )}
    </NavLink>
  );
}

function SidebarInner({ onNavigate }) {
  const auth = useAuth();
  const user = auth.user && auth.user !== false ? auth.user : null;
  const name = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : 'Staff';
  const school = user?.school?.name || user?.school_name || '';
  const role = user?.role?.name || user?.role_name || user?.role_code || '';

  return (
    <div className="flex flex-col h-full" style={{ fontFamily: FONT }}>
      <div className="px-4 pt-4 pb-4 border-b border-white/10">
        <div className="flex flex-col items-center justify-center gap-1.5">
          <img
            src={babyeyiLogo}
            alt="Babyeyi"
            className="h-9 w-auto max-w-[150px] object-contain"
          />
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-400/95">
            Shule Avance Lite
          </p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-0.5">
        {NAV.map((item) => (
          <NavItem key={item.to} item={item} onNavigate={onNavigate} />
        ))}
      </nav>

      <div className="px-3 py-3 border-t border-white/10 shrink-0">
        <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 mb-3">
          <p className="text-[11px] font-black text-white truncate">{name}</p>
          {school ? (
            <p className="text-[10px] text-white/45 truncate mt-0.5">{school}</p>
          ) : null}
          {role ? (
            <p className="text-[9px] font-bold uppercase tracking-wider text-amber-400/80 mt-1 truncate">
              {role}
            </p>
          ) : null}
        </div>
        <LogoutButton
          variant="sidebar"
          className="!text-white/70 hover:!text-white hover:!bg-white/10 hover:!border-white/15"
        />
      </div>
    </div>
  );
}

export default function LiteShuleAvanceSidebar({ mobileOpen, setMobileOpen }) {
  const close = () => setMobileOpen(false);

  return (
    <>
      <aside
        className="hidden lg:flex flex-col fixed left-0 top-0 h-full z-30 w-[240px] xl:w-[256px] border-r border-amber-400/15 bg-[#000435]"
        style={{ fontFamily: FONT }}
        aria-label="Shule Avance navigation"
      >
        <SidebarInner />
      </aside>

      {mobileOpen ? (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-[#000435]/70 backdrop-blur-sm"
            onClick={close}
            aria-hidden
          />
          <div
            className="relative w-[280px] max-w-[88vw] h-full bg-[#000435] border-r border-amber-400/20 flex flex-col shadow-2xl"
            style={{ animation: 'slideInLeft .22s cubic-bezier(.22,1,.36,1)' }}
          >
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-400 flex items-center justify-center">
                  <BookOpen size={15} className="text-[#000435]" />
                </div>
                <span className="font-black text-[14px] text-white">Menu</span>
              </div>
              <button
                type="button"
                onClick={close}
                className="w-8 h-8 rounded-xl bg-white/8 border border-white/15 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/14"
                aria-label="Close menu"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <SidebarInner onNavigate={close} />
            </div>
          </div>
          <style>{`@keyframes slideInLeft{from{transform:translateX(-100%)}to{transform:translateX(0)}}`}</style>
        </div>
      ) : null}
    </>
  );
}
