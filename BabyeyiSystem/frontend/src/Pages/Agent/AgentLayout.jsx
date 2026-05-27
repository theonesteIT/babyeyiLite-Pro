import { createElement, useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  School,
  FileBarChart,
  Layers,
  Wallet,
  LifeBuoy,
  Store,
  ShoppingBag,
  PackageCheck,
  Shirt,
  Receipt,
  Menu,
  MapPinned,
  Wifi,
  WifiOff,
  Loader2,
  X,
  User,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import LogoutButton from "../Auth/LogoutButton";
import babyeyiIcon from "../../assets/babyeyi-icon.png";
import { BABYEYI_FONT_STACK, BABYEYI_NAVY, BABYEYI_PAGE_BG } from "../../theme/babyeyiDashboardTheme";
import { AGENT_PAGE_BG } from "./agentTheme";

const font = BABYEYI_FONT_STACK;
const NAVY = "#000435";

const NAV = [
  { to: "/agent/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/agent/schools", label: "Schools", icon: School },
  { to: "/agent/support-requests", label: "Support requests", icon: LifeBuoy },
  { to: "/agent/shop-products", label: "Shop products", icon: Store },
  { to: "/agent/shop-orders", label: "Shop orders", icon: ShoppingBag },
  { to: "/agent/standard-kit-requests", label: "Standard kit requests", icon: PackageCheck },
  { to: "/agent/uniform-voucher-orders", label: "Uniform vouchers", icon: Shirt },
  { to: "/agent/services", label: "Services revenue", icon: Layers },
  { to: "/agent/school-fees", label: "School fees", icon: Wallet },
  { to: "/agent/ticha-deal-requests", label: "Ticha Deal requests", icon: Receipt },
  { to: "/agent/reports", label: "Reports", icon: FileBarChart },
];

function navLinkClass({ isActive }) {
  return [
    "relative flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-[13px] font-medium tracking-tight transition-all duration-200 min-h-[44px]",
    isActive
      ? "border-white/10 bg-white/[0.12] text-amber-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
      : "border-transparent text-white/72 hover:bg-white/[0.06] hover:text-white",
  ].join(" ");
}

function NavItem({ to, label, icon, end, onNavigate }) {
  return (
    <NavLink to={to} end={end} className={navLinkClass} onClick={onNavigate}>
      {({ isActive }) => (
        <>
          {createElement(icon, {
            size: 18,
            strokeWidth: 1.75,
            className: isActive ? "shrink-0 text-amber-400" : "shrink-0 text-white/45",
          })}
          <span className="truncate">{label}</span>
        </>
      )}
    </NavLink>
  );
}

function SidebarPanel({ auth, cov, online, onClose }) {
  const displayName = [auth.user?.first_name, auth.user?.last_name].filter(Boolean).join(" ") || "Agent";

  return (
    <div
      className="flex h-full min-h-0 w-full min-w-0 flex-col border-r border-white/[0.06] shadow-sm"
      style={{ background: NAVY, colorScheme: "dark", fontFamily: font }}
    >
      <div className="shrink-0 border-b border-white/[0.06] p-4 pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm">
            <img src={babyeyiIcon} alt="Babyeyi" className="h-10 w-10 object-contain" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="block text-base font-semibold leading-tight tracking-tight text-white">Babyeyi</span>
            <p className="mt-0.5 text-[10px] font-medium tracking-wide text-amber-400">Field agent portal</p>
          </div>
        </div>
        <div
          className={`mt-3 flex items-center gap-2 rounded-xl px-3 py-2 text-[11px] font-semibold ${
            online
              ? "border border-amber-400/30 bg-amber-400/10 text-amber-300"
              : "border border-white/10 bg-white/5 text-white/60"
          }`}
        >
          {online ? <Wifi size={12} /> : <WifiOff size={12} />}
          {online ? "Connected" : "Offline"}
        </div>
      </div>

      <nav
        className="agent-sidebar-scroll min-h-0 flex-1 space-y-0.5 overflow-y-auto overflow-x-hidden overscroll-y-contain px-3 py-3 pr-1"
        aria-label="Agent navigation"
      >
        <p className="px-3 pb-2 pt-1 text-[10px] font-medium uppercase tracking-widest text-white/40">Workspace</p>
        {NAV.map(({ to, label, icon }) => (
          <NavItem
            key={to}
            to={to}
            label={label}
            icon={icon}
            end={to === "/agent/dashboard"}
            onNavigate={onClose}
          />
        ))}
      </nav>

      <div className="shrink-0 space-y-2 border-t border-white/[0.06] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="flex items-start gap-2.5 rounded-xl border border-white/10 bg-white/[0.06] p-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#000c6e]">
            <User size={16} className="text-amber-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-semibold text-white">{displayName}</p>
            <div className="mt-0.5 flex items-start gap-1 text-[10px] text-white/50">
              <MapPinned size={10} className="mt-0.5 shrink-0" />
              <span className="leading-snug">{cov}</span>
            </div>
          </div>
        </div>
        <LogoutButton variant="sidebar" />
      </div>
      <style>{`
        .agent-sidebar-scroll::-webkit-scrollbar { width: 4px; }
        .agent-sidebar-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 99px; }
      `}</style>
    </div>
  );
}

export default function AgentLayout() {
  const auth = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);

  const pageTitle = useMemo(() => {
    const match = NAV.find((item) => location.pathname === item.to || location.pathname.startsWith(`${item.to}/`));
    return match?.label ?? "Agent workspace";
  }, [location.pathname]);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

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

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (auth.loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center babyeyi-dash-shell bg-white"
        style={{ fontFamily: font }}
      >
        <div className="text-center px-4">
          <Loader2 className="w-10 h-10 animate-spin mx-auto mb-3" style={{ color: BABYEYI_NAVY }} />
          <p className="text-[#000435] text-sm font-semibold">Loading workspace…</p>
        </div>
      </div>
    );
  }

  const agent = auth.user?.agent;
  const cov = agent
    ? [
        agent.province,
        agent.district,
        agent.all_sectors ? "All sectors in district" : `${(agent.sectors || []).length} sector(s)`,
      ]
        .filter(Boolean)
        .join(" · ")
    : "Coverage not loaded";

  const closeMenu = () => setOpen(false);

  return (
    <div
      className="min-h-screen flex babyeyi-dash-shell bg-white"
      style={{ fontFamily: font, backgroundColor: AGENT_PAGE_BG || BABYEYI_PAGE_BG }}
    >
      <aside className="hidden h-full w-[260px] shrink-0 lg:fixed lg:left-0 lg:top-0 lg:z-40 lg:flex lg:h-screen">
        <SidebarPanel auth={auth} cov={cov} online={online} />
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 flex lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
          <button
            type="button"
            className="absolute inset-0 border-none cursor-pointer"
            style={{ background: "rgba(0,4,53,0.55)" }}
            aria-label="Close menu"
            onClick={closeMenu}
          />
          <div className="relative flex h-full w-[min(280px,88vw)] flex-col shadow-2xl animate-in slide-in-from-left duration-200">
            <button
              type="button"
              onClick={closeMenu}
              className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-xl border-none bg-white/10 text-white cursor-pointer hover:bg-white/15"
              aria-label="Close"
            >
              <X size={18} />
            </button>
            <SidebarPanel auth={auth} cov={cov} online={online} onClose={closeMenu} />
          </div>
        </div>
      )}

      <div className="flex min-h-screen w-full min-w-0 flex-1 flex-col bg-white lg:ml-[260px] babyeyi-dash-main">
        <header
          className="sticky top-0 z-30 flex items-center gap-2 border-b border-slate-200 bg-white/95 px-3 py-2.5 backdrop-blur-md shadow-sm sm:gap-3 sm:px-4 sm:py-3"
          style={{ paddingTop: "max(0.625rem, env(safe-area-inset-top))" }}
        >
          <button
            type="button"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-[#000435] transition hover:bg-slate-50 lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            aria-expanded={open}
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-100 bg-white shadow-sm lg:hidden">
              <img src={babyeyiIcon} alt="" className="h-8 w-8 object-contain" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[10px] font-semibold uppercase tracking-widest text-amber-600 lg:hidden">
                Field agent
              </p>
              <h1 className="truncate text-sm font-bold text-[#000435] sm:text-base lg:text-lg">{pageTitle}</h1>
            </div>
          </div>

          <div
            className={`hidden shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold sm:flex ${
              online
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-slate-200 bg-slate-50 text-slate-500"
            }`}
            title={online ? "Online" : "Offline"}
          >
            {online ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            <span className="hidden md:inline">{online ? "Online" : "Offline"}</span>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 bg-white p-3 sm:p-5 md:p-6 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
