import { createElement } from 'react';
import { MapPin, User, Wifi, WifiOff, X } from 'lucide-react';
import { resolveUrl } from '../utils/helpers';
import LogoutButton from './LogoutButton';
import babyeyiIcon from '../../../../assets/babyeyi-icon.png';

function NavButton({ item, active, onSelect, onClose }) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={() => {
        onSelect(item.id);
        onClose?.();
      }}
      className={`relative flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-[13px] font-medium tracking-tight transition-all duration-200 ${
        active
          ? 'border-white/10 bg-white/[0.12] text-amber-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
          : 'border-transparent text-white/72 hover:bg-white/[0.06] hover:text-white'
      }`}
    >
      {createElement(Icon, {
        size: 18,
        strokeWidth: 1.75,
        className: active ? 'shrink-0 text-amber-400' : 'shrink-0 text-white/45 group-hover:text-white/85',
      })}
      <span className="truncate">{item.label}</span>
    </button>
  );
}

function SidebarPanel({ tab, navConfig, switchTab, deo, online, onOpenProfile, onClose }) {
  return (
    <div
      className="flex h-full min-h-0 w-full min-w-0 flex-col border-r border-white/[0.06] font-sans shadow-sm"
      style={{ background: '#000435', colorScheme: 'dark', fontFamily: "'Montserrat', sans-serif" }}
    >
      <div className="shrink-0 border-b border-white/[0.06] p-4 pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm">
            <img src={babyeyiIcon} alt="Babyeyi" className="h-10 w-10 object-contain" />
          </div>
          <div className="min-w-0">
            <span className="block text-base font-semibold leading-tight tracking-tight text-white">Babyeyi</span>
            <p className="mt-0.5 text-[10px] font-medium tracking-wide text-amber-400">DEO Portal</p>
          </div>
        </div>
        <div
          className={`mt-3 flex items-center gap-2 rounded-xl px-3 py-2 text-[11px] font-semibold ${
            online
              ? 'border border-amber-400/30 bg-amber-400/10 text-amber-300'
              : 'border border-white/10 bg-white/5 text-white/60'
          }`}
        >
          {online ? <Wifi size={12} /> : <WifiOff size={12} />}
          {online ? 'Connected' : 'Offline'}
        </div>
      </div>

      <nav
        className="deo-sidebar-scroll min-h-0 flex-1 space-y-0.5 overflow-y-auto overflow-x-hidden overscroll-y-contain px-3 py-3 pr-1"
        aria-label="DEO navigation"
      >
        <p className="px-3 pb-2 pt-1 text-[10px] font-medium uppercase tracking-widest text-white/40">
          District oversight
        </p>
        {navConfig.map((item) => (
          <NavButton
            key={item.id}
            item={item}
            active={tab === item.id}
            onSelect={switchTab}
            onClose={onClose}
          />
        ))}
      </nav>

      <div className="shrink-0 space-y-2 border-t border-white/[0.06] p-3">
        {deo && (
          <div className="flex items-start gap-2.5 rounded-xl border border-white/10 bg-white/[0.06] p-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#000c6e]">
              {resolveUrl(deo.photo) ? (
                <img src={resolveUrl(deo.photo)} alt="" className="h-full w-full object-cover" />
              ) : (
                <User size={16} className="text-amber-400" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-semibold text-white">{deo.fullName}</p>
              <div className="mt-0.5 flex items-center gap-1 text-[10px] text-white/50">
                <MapPin size={10} className="shrink-0" />
                <span className="truncate">{deo.district} District</span>
              </div>
              {deo.province && <p className="mt-0.5 truncate text-[9px] text-amber-400/80">{deo.province}</p>}
            </div>
          </div>
        )}
        {onOpenProfile && (
          <button
            type="button"
            onClick={onOpenProfile}
            className="flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-[13px] font-medium text-white/72 transition-all hover:bg-white/[0.06] hover:text-white"
          >
            <User size={18} strokeWidth={1.75} className="shrink-0 text-white/45" />
            My profile
          </button>
        )}
        <p className="px-3 pb-0 text-center text-[10px] font-medium text-white/35">NESA Rwanda · v2.0</p>
        <LogoutButton />
      </div>
    </div>
  );
}

export default function Sidebar({
  tab,
  navConfig,
  switchTab,
  deo,
  online,
  mobileOpen,
  setMobileOpen,
  onOpenProfile,
}) {
  const close = () => setMobileOpen(false);

  return (
    <>
      {/* Desktop */}
      <aside className="hidden h-full w-[260px] shrink-0 lg:flex lg:flex-col">
        <SidebarPanel
          tab={tab}
          navConfig={navConfig}
          switchTab={switchTab}
          deo={deo}
          online={online}
          onOpenProfile={onOpenProfile}
        />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 border-none cursor-pointer"
            style={{ background: 'rgba(0,4,53,0.5)' }}
            onClick={close}
          />
          <div className="relative flex h-full w-[min(280px,88vw)] flex-col shadow-2xl">
            <button
              type="button"
              onClick={close}
              className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-xl border-none bg-white/10 text-white cursor-pointer"
              aria-label="Close"
            >
              <X size={18} />
            </button>
            <SidebarPanel
              tab={tab}
              navConfig={navConfig}
              switchTab={switchTab}
              deo={deo}
              online={online}
              onOpenProfile={() => {
                onOpenProfile?.();
                close();
              }}
              onClose={close}
            />
          </div>
        </div>
      )}
    </>
  );
}
