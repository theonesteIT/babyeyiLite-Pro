import { useEffect, useState } from "react";
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
  Menu,
  MapPinned,
  Wifi,
  WifiOff,
  Loader2,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import LogoutButton from "../Auth/LogoutButton";
import { BABYEYI_FONT_STACK, BABYEYI_NAVY } from "../../theme/babyeyiDashboardTheme";

const font = BABYEYI_FONT_STACK;
const BRAND = "/1BABYEYI LOGO FINAL.png";

function linkClass({ isActive }) {
  return [
    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-bold transition-all min-h-[44px]",
    isActive
      ? "bg-amber-400 text-[#000435] shadow-md shadow-black/20"
      : "text-white/70 hover:text-white hover:bg-white/10",
  ].join(" ");
}

export default function AgentLayout() {
  const auth = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);

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

  if (auth.loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center babyeyi-dash-shell"
        style={{
          background: "linear-gradient(165deg, #fffbeb 0%, #fef3c7 40%, #fff7ed 100%)",
          fontFamily: font,
        }}
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
    { to: "/agent/reports", label: "Reports", icon: FileBarChart },
  ];

  const Sidebar = ({ mobile } = {}) => (
    <div
      className="flex h-full flex-col bg-[#000435] border-r border-amber-400/20 shadow-xl"
      style={{ fontFamily: font }}
    >
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-3 mb-3">
          <div className="rounded-xl shadow-lg bg-[#1F2937] flex items-center justify-center overflow-hidden border border-amber-300/50 px-2 py-1">
            <img src={BRAND} alt="Babyeyi logo" className="h-8 w-auto object-contain" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-400/90">Field agent</p>
            <p className="text-sm font-black text-white truncate">
              {auth.user?.first_name} {auth.user?.last_name}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-2 rounded-xl bg-white/6 border border-white/12 px-3 py-2.5 text-[11px] text-amber-100">
          <MapPinned className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
          <span className="leading-snug font-semibold">{cov}</span>
        </div>
        <div
          className={`mt-2 flex items-center gap-1.5 text-[11px] font-bold px-2 py-1.5 rounded-lg border ${
            online ? "text-amber-300 bg-amber-400/15 border-amber-400/35" : "text-white/60 bg-white/6 border-white/12"
          }`}
        >
          {online ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          {online ? "Online" : "Offline"}
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={linkClass} onClick={() => mobile && setOpen(false)} end={to === "/agent/dashboard"}>
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="p-3 border-t border-white/10">
        <LogoutButton variant="sidebar" />
      </div>
    </div>
  );

  return (
    <div
      className="min-h-screen flex babyeyi-dash-shell"
      style={{
        fontFamily: font,
        background: "linear-gradient(165deg, #fffbeb 0%, #fef3c7 35%, #fff7ed 100%)",
      }}
    >
      <aside className="hidden lg:flex w-64 xl:w-72 shrink-0 fixed left-0 top-0 h-full z-40">
        <Sidebar />
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" className="absolute inset-0 bg-[#000435]/55 backdrop-blur-sm" aria-label="Close menu" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-[min(100%,320px)] shadow-2xl border-r border-amber-400/20">
            <Sidebar mobile />
          </div>
        </div>
      )}

      <div className="flex-1 lg:ml-64 xl:ml-72 flex flex-col min-h-screen w-full min-w-0 babyeyi-dash-main">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 px-4 py-3 border-b-[3px] border-amber-400 bg-[#000435]/97 backdrop-blur-md">
          <button
            type="button"
            className="lg:hidden p-2 rounded-xl bg-white/8 border border-white/15 text-white/85 hover:bg-white/14"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-base sm:text-lg font-black text-white truncate flex-1 text-center lg:text-left flex items-center justify-center lg:justify-start gap-2">
            <img src={BRAND} alt="Babyeyi logo" className="h-7 w-auto object-contain shrink-0" />
            <span className="text-white/35 font-bold">·</span>
            <span>Agent workspace</span>
          </h1>
          <div className="w-10 lg:w-0" />
        </header>
        <main className="flex-1 p-4 sm:p-5 md:p-6 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
