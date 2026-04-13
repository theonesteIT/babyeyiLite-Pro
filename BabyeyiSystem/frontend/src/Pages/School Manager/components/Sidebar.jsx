/**
 * Sidebar.jsx — School Manager Navigation
 * #000435 navy + amber-400 · MTN font · Tailwind only
 */

import { BookOpen, Wifi, WifiOff, X, ArrowLeft, GraduationCap, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import LogoutButton from "../../Auth/LogoutButton";

const FONT = `"MTN Brighter Sans","Nunito","Varela Round",sans-serif`;

export default function Sidebar({
  tab, switchTab, NAV, notifCount, online,
  transferNotifCount = 0,
  mobileOpen, setMobileOpen, schoolProfile, session,
  /** When true and proAppBase is set, show CTA to open babyeyipro School Manager (same session). */
  showProLaunch = false,
  proAppBase = "",
}) {
  const displayName = session?.schoolName || schoolProfile?.name || "School Portal";
  const schoolCode = session?.schoolCode || "";

  const NavItem = ({ item, onClick }) => {
    const isActive = tab === item.id;
    const badge =
      item.id === "notifications" ? notifCount :
      item.id === "student_transfer" ? transferNotifCount : 0;

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
        {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#000435]/40 shrink-0" />}
      </button>
    );
  };

  const SidebarInner = ({ onItemClick }) => (
    <div className="flex flex-col h-full" style={{ fontFamily: FONT }}>
      {/* Brand header */}
      <div className="px-4 pt-4 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3 mb-3">
          <div className="relative shrink-0">
            <div className="w-10 h-10 rounded-xl bg-amber-400 flex items-center justify-center shadow-lg shadow-amber-900/20">
              <GraduationCap size={20} className="text-[#000435]" />
            </div>
            <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#000435] ${
              online ? "bg-emerald-400" : "bg-amber-400"
            }`} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-black text-white leading-tight truncate">{displayName}</p>
            {schoolCode && <p className="text-[10px] text-amber-400/70 font-semibold truncate">Code: {schoolCode}</p>}
          </div>
        </div>

        {/* Connection status */}
        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-bold border ${
          online
            ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
            : "bg-amber-400/10 text-amber-400 border-amber-400/20"
        }`}>
          {online ? <Wifi size={12} /> : <WifiOff size={12} />}
          {online ? "Connected · Rwanda" : "Offline Mode"}
        </div>

        {/* Back to admin */}
        <Link to="/admin/dashboard"
          className="mt-2 flex items-center gap-2 px-3 py-2 rounded-xl bg-white/6 border border-white/10 text-white/60 text-[12px] font-bold hover:bg-white/10 hover:text-white transition-all">
          <ArrowLeft size={14} /> Back to Dashboard
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-0.5">
        {NAV.map(item => (
          <NavItem key={item.id} item={item} onClick={onItemClick} />
        ))}
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
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900&family=Varela+Round&display=swap');`}</style>

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