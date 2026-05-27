/**
 * Sidebar.jsx — School Manager Navigation
 * #000435 navy + amber-400 · MTN font · Tailwind only
 */

import { BookOpen, X, Sparkles, ChevronRight } from "lucide-react";
import LogoutButton from "../../Auth/LogoutButton";
import babyeyiLogo from "../../../assets/1BABYEYI LOGO FINAL.png";
const FONT = `"Montserrat", system-ui, sans-serif`;

export default function Sidebar({
  tab, switchTab, NAV, notifCount,
  transferNotifCount = 0,
  mobileOpen, setMobileOpen,
  /** When true and proAppBase is set, show CTA to open babyeyipro School Manager (same session). */
  showProLaunch = false,
  proAppBase = "",
}) {
  const NavItem = ({ item, onClick }) => {
    const isActive = tab === item.id;
    const badge = item.id === "student_transfer" ? transferNotifCount : 0;

    return (
      <button
        type="button"
        onClick={() => {
          if (item.id === "invoices") { window.location.assign("/invoices"); return; }
          switchTab(item.id);
          if (onClick) onClick();
        }}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-bold transition-all duration-150 mb-0.5 text-left ${
          isActive
            ? "bg-amber-400 text-[#000435] shadow-md shadow-amber-900/20"
            : "text-white/65 hover:bg-white/8 hover:text-white"
        }`}
        style={{ fontFamily: FONT }}
      >
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all ${
          isActive ? "bg-[#000435]/20" : "bg-white/5"
        }`}>
          <item.icon size={16} />
        </div>
        <span className="flex-1 truncate">{item.label}</span>
        {badge > 0 && (
          <span className={`text-[10px] font-black rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 ${
            isActive ? "bg-[#000435] text-amber-400" : "bg-amber-400 text-[#000435]"
          }`}>
            {badge > 9 ? "9+" : badge}
          </span>
        )}
        {isActive && <ChevronRight size={14} className="text-[#000435]/50 shrink-0" />}
      </button>
    );
  };

  const SidebarInner = ({ onItemClick }) => (
    <div className="flex flex-col h-full" style={{ fontFamily: FONT }}>
      {/* Brand header */}
      <div className="px-4 pt-4 pb-4 border-b border-white/10">
        <div className="flex flex-col items-center justify-center gap-1.5">
          <img
            src={babyeyiLogo}
            alt="Babyeyi"
            className="h-9 w-auto max-w-[150px] object-contain"
          />
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-400/95">
            School Manager
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto flex flex-col min-h-0">
        <div className="space-y-0.5 flex-1">
          {NAV.filter((item) => !item.footer).map((item) => (
            <NavItem key={item.id} item={item} onClick={onItemClick} />
          ))}
        </div>
        {NAV.filter((item) => item.footer).length > 0 && (
          <div className="pt-3 mt-2 border-t border-white/10 space-y-0.5 shrink-0">
            {NAV.filter((item) => item.footer).map((item) => (
              <NavItem key={item.id} item={item} onClick={onItemClick} />
            ))}
          </div>
        )}
      </nav>

      {showProLaunch && proAppBase && (
        <div className="px-3 pt-1 pb-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              window.location.assign(`${proAppBase}/manager`);
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-[12px] font-black shadow-lg shadow-violet-900/30 border border-violet-400/30 active:scale-[0.98] transition-transform"
            style={{ fontFamily: FONT }}
          >
            <Sparkles size={16} className="shrink-0" />
            Open Pro School Manager
          </button>
          <p className="mt-1.5 text-[10px] text-white/35 text-center font-semibold leading-snug px-1">
            Pro workspace (academic & staff)
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="px-3 pb-4 pt-3 border-t border-white/10 space-y-3">
        {/* Branding tag */}
        <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <div className="w-5 h-5 rounded-md bg-amber-400 flex items-center justify-center">
              <span className="text-[10px] font-black text-[#000435]">E</span>
            </div>
            <p className="text-[11px] font-black text-amber-400">Edupoto360</p>
          </div>
          <p className="text-[10px] text-white/30">Babyeyi System · v2.0</p>
        </div>
        <LogoutButton variant="sidebar" />
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex flex-col fixed left-0 top-0 h-full z-30 w-[240px] xl:w-[256px] border-r border-amber-400/15 bg-[#000435]"
        style={{ fontFamily: FONT }}
      >
        <SidebarInner />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-[#000435]/70 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer panel */}
          <div
            className="relative w-[280px] max-w-[88vw] h-full bg-[#000435] border-r border-amber-400/20 flex flex-col shadow-2xl"
            style={{ animation: "slideInLeft .22s cubic-bezier(.22,1,.36,1)" }}
          >
            {/* Drawer close header */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-400 flex items-center justify-center">
                  <BookOpen size={15} className="text-[#000435]" />
                </div>
                <span className="font-black text-[14px] text-white" style={{ fontFamily: FONT }}>Menu</span>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="w-8 h-8 rounded-xl bg-white/8 border border-white/15 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/14"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <SidebarInner onItemClick={() => setMobileOpen(false)} />
            </div>
          </div>
          <style>{`@keyframes slideInLeft{from{transform:translateX(-100%)}to{transform:translateX(0)}}`}</style>
        </div>
      )}
    </>
  );
}
