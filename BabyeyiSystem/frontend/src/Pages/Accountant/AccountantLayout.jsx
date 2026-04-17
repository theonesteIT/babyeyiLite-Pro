import { useState, useEffect } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FileBarChart,
  Menu,
  X,
  Wallet,
  BookOpen,
  Wifi,
  WifiOff,
  Receipt,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import LogoutButton from "../Auth/LogoutButton";
import { BABYEYI_FONT_STACK, BABYEYI_NAVY, BABYEYI_PAGE_BG } from "../../theme/babyeyiDashboardTheme";

/** Amber + navy chrome (aligned with School Manager / Agent) */
const C = {
  gold: "#fbbf24",
  goldLight: "#fde68a",
  goldDark: "#d97706",
  goldDeep: "#000435",
  goldBg: "#fffbeb",
  goldBgMid: "#fef3c7",
  goldBorder: "#fcd34d",
  dark: "#000435",
  darkMid: "#1e3a5f",
};

const BRAND_LOGO = "/1BABYEYI LOGO FINAL.png";
const font = BABYEYI_FONT_STACK;

function navClass({ isActive }) {
  return [
    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-bold transition-all duration-150",
    isActive
      ? "bg-gradient-to-br from-[#000435] to-[#0c1a3a] text-amber-400 shadow-md shadow-black/15"
      : "text-amber-950/80 hover:bg-amber-100/80",
  ].join(" ");
}

export default function AccountantLayout() {
  const auth = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [online, setOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1024) setMobileOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);

  if (auth.loading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{
          fontFamily: font,
          background: "linear-gradient(150deg, #FFFBE8, #FFF3CC, #FFFDE8)",
        }}
      >
        <div className="flex flex-col items-center gap-4">
          <div
            className="h-12 w-12 animate-spin rounded-full border-4 border-[#FDEAA0] border-t-[#FEBF10]"
            style={{ borderTopColor: C.gold }}
          />
          <p className="text-sm font-semibold text-[#B88A00]">Loading…</p>
        </div>
      </div>
    );
  }

  const school = auth.school;
  const user = auth.user;
  const displayName = user
    ? `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.email
    : "";

  const currentTitle = location.pathname.includes("/reports")
    ? "Reports"
    : location.pathname.includes("/payment")
      ? "Payment"
      : "Dashboard";

  const NAV = [
    { to: "/accountant/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/accountant/payment", label: "Payment", icon: Wallet },
    { to: "/accountant/reports", label: "Reports", icon: FileBarChart },
    { to: "/invoices", label: "Invoices", icon: Receipt },
  ];

  const SidebarInner = ({ onNavigate } = {}) => (
    <div
      className="flex h-full flex-col"
      style={{ fontFamily: font }}
    >
      <div className="border-b px-5 py-5" style={{ borderColor: C.goldBorder }}>
        <div className="mb-3 flex items-center gap-3">
          <div className="relative shrink-0">
            <img
              src={BRAND_LOGO}
              alt="Babyeyi"
              className="h-10 w-auto rounded-xl border border-[#FDEAA0] bg-[#1F2937] object-contain px-2 py-1 shadow-md"
              style={{ boxShadow: "0 4px 12px rgba(26,18,0,0.18)" }}
            />
            <span
              className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white"
              style={{ background: online ? "#10b981" : "#f59e0b" }}
            />
          </div>
          <div className="min-w-0 flex-1">
            <h1
              className="truncate text-[13px] font-black leading-tight"
              style={{ color: C.dark }}
            >
              {school?.name || "School"}
            </h1>
            <p className="truncate text-[10px] font-semibold" style={{ color: C.goldDark }}>
              Accountant · Babyeyi
            </p>
          </div>
        </div>

        <div
          className="flex items-center gap-2 rounded-xl border px-3 py-1.5 text-[11px] font-bold"
          style={{
            background: online ? C.goldBg : "#fff7ed",
            borderColor: online ? C.goldBorder : "#fed7aa",
            color: online ? C.goldDark : "#c2410c",
          }}
        >
          {online ? <Wifi className="h-3 w-3 shrink-0" /> : <WifiOff className="h-3 w-3 shrink-0" />}
          {online ? "Connected" : "Offline"}
        </div>
      </div>

      <div className="border-b px-4 py-4" style={{ borderColor: C.goldBorder }}>
        <div
          className="flex items-start gap-2 rounded-xl px-3 py-2.5"
          style={{
            background: `linear-gradient(135deg, ${C.goldBg}, ${C.goldBgMid})`,
            border: `1px solid ${C.goldBorder}`,
          }}
        >
          <BookOpen className="mt-0.5 h-4 w-4 shrink-0" style={{ color: C.goldDark }} />
          <div className="min-w-0">
            <p className="truncate text-xs font-bold" style={{ color: C.dark }}>
              School code
            </p>
            {school?.code && (
              <p className="mt-0.5 font-mono text-[0.7rem] font-bold" style={{ color: C.goldDeep }}>
                {school.code}
              </p>
            )}
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
        <p className="mb-2 px-3 text-[0.65rem] font-bold uppercase tracking-wider" style={{ color: C.goldDeep }}>
          Menu
        </p>
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={navClass}
            onClick={() => onNavigate?.()}
          >
            {({ isActive }) => (
              <>
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                  style={{
                    background: isActive ? "rgba(254,191,16,0.18)" : "transparent",
                  }}
                >
                  <Icon className="h-4 w-4 shrink-0" strokeWidth={2.2} />
                </span>
                <span className="flex-1">{label}</span>
                {isActive ? (
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: C.gold }} />
                ) : null}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t p-3" style={{ borderColor: C.goldBorder }}>
        <div
          className="mb-3 rounded-xl px-3 py-2 text-center"
          style={{
            background: `linear-gradient(135deg, ${C.goldBg}, ${C.goldBgMid})`,
            border: `1px solid ${C.goldBorder}`,
          }}
        >
          <p className="text-[9px] font-bold" style={{ color: C.goldDeep }}>
            Babyeyi System
          </p>
        </div>
        <div className="mb-3 rounded-xl border border-[#FDEAA0] bg-white/80 px-3 py-2">
          <p className="truncate text-xs font-bold" style={{ color: C.dark }}>
            {displayName}
          </p>
          <p className="truncate text-[0.65rem] text-slate-500">{user?.email}</p>
        </div>
        <LogoutButton variant="sidebar" />
      </div>
    </div>
  );

  return (
    <div
      className="flex min-h-screen min-w-0 overflow-x-hidden text-slate-800"
      style={{
        fontFamily: font,
        background: "linear-gradient(150deg, #FFFBE8, #FFF3CC, #FFFDE8)",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap');
        .acc-scroll::-webkit-scrollbar { width: 4px; height: 4px; }
        .acc-scroll::-webkit-scrollbar-thumb { background: #FEBF10; border-radius: 99px; }
      `}</style>

      <button
        type="button"
        aria-label="Close menu"
        className={`fixed inset-0 z-40 transition-opacity lg:hidden ${
          mobileOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        style={{ background: "rgba(26,18,0,0.5)", backdropFilter: "blur(4px)" }}
        onClick={() => setMobileOpen(false)}
      />

      {/* Desktop sidebar */}
      <aside
        className="acc-scroll hidden lg:fixed lg:left-0 lg:top-0 lg:z-30 lg:flex lg:h-full lg:w-60 lg:flex-col xl:w-64"
        style={{
          borderRight: `1px solid ${C.goldBorder}`,
          background: "rgba(255,251,232,0.98)",
          backdropFilter: "blur(8px)",
        }}
      >
        <SidebarInner />
      </aside>

      {/* Mobile drawer */}
      <aside
        className={[
          "acc-scroll fixed left-0 top-0 z-50 flex h-full w-[min(100vw-2rem,18rem)] flex-col shadow-2xl transition-transform duration-300 ease-out lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
        style={{
          background: C.goldBg,
          boxShadow: "4px 0 24px rgba(26,18,0,0.2)",
        }}
      >
        <div
          className="flex items-center justify-between border-b px-4 py-4"
          style={{ borderColor: C.goldBorder }}
        >
          <div className="flex min-w-0 items-center gap-2">
            <div
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
              style={{ background: `linear-gradient(135deg, ${C.dark}, ${C.darkMid})` }}
            >
              <Wallet className="h-3.5 w-3.5" style={{ color: C.gold }} />
            </div>
            <span className="truncate text-sm font-black" style={{ color: C.dark }}>
              Accountant
            </span>
          </div>
          <button
            type="button"
            className="rounded-lg p-2"
            style={{ background: C.goldBgMid, color: C.goldDark }}
            onClick={() => setMobileOpen(false)}
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>
        <SidebarInner onNavigate={() => setMobileOpen(false)} />
      </aside>

      <div
        className="flex min-h-screen min-w-0 flex-1 flex-col lg:ml-60 xl:ml-64"
        style={{ background: "linear-gradient(150deg, #FFFBE8, #FFFDE8, #FFF3CC)" }}
      >
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b border-slate-200/80 bg-white/95 px-3 backdrop-blur-md shadow-sm lg:hidden">
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm active:scale-[0.98]"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-black text-slate-800">{currentTitle}</p>
            <p className="truncate text-[10px] font-medium text-slate-400">Babyeyi · {school?.name}</p>
          </div>
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
            style={{ background: `linear-gradient(135deg, ${C.dark}, ${C.darkMid})` }}
          >
            <Wallet className="h-4 w-4 text-[#FEBF10]" />
          </div>
        </header>

        <main className="acc-scroll flex-1 px-3 py-4 sm:px-5 sm:py-6 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
