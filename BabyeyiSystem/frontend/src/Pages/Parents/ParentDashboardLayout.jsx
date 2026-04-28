// ================================================================
// ParentDashboardLayout — Header (search), left sidebar, mobile bottom nav
// ================================================================

import { useState, useEffect } from "react";
import { Outlet, NavLink, useNavigate, useLocation, Link } from "react-router-dom";
import {
  Home,
  LayoutGrid,
  ShoppingBag,
  CreditCard,
  Wallet,
  User,
  Bell,
  Globe,
  Send,
  Search,
  LogOut,
  LifeBuoy,
  ClipboardList,
  FileText,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useParentShell } from "../../context/ParentShellContext";
import NotificationDrawer from "../../components/Parents/NotificationDrawer";
import babyeyiLogo from "../../assets/1BABYEYI LOGO FINAL.png";

const navItemsDesktop = [
  { to: "/parents/home", end: true, label: "Home", Icon: Home },
  { to: "/parents/services", label: "Services", Icon: LayoutGrid },
  { to: "/parents/orders", label: "Orders", Icon: ClipboardList },
  { to: "/parents/payments-report", label: "Payments", Icon: FileText },
  { to: "/parents/shop", label: "Shop", Icon: ShoppingBag },
  { to: "/parents/shulecard", label: "Shulecard", Icon: CreditCard },
  { to: "/parents/account", label: "Account", Icon: Wallet },
  { to: "/parents/profile", label: "Profile", Icon: User },
];

/** Mobile: keep 6 tabs — Orders accessible via footer + Home */
const navItemsMobile = [
  { to: "/parents/home", end: true, label: "Home", Icon: Home },
  { to: "/parents/services", label: "Services", Icon: LayoutGrid },
  { to: "/parents/payments-report", label: "Payments", Icon: FileText },
  { to: "/parents/shop", label: "Shop", Icon: ShoppingBag },
  { to: "/parents/shulecard", label: "Shulecard", Icon: CreditCard },
  { to: "/parents/account", label: "Account", Icon: Wallet },
  { to: "/parents/profile", label: "Profile", Icon: User },
];

function firstGreetingName(fullName) {
  if (!fullName || typeof fullName !== "string") return "Parent";
  const part = fullName.split("&")[0].trim();
  return part.split(/\s+/)[0] || "Parent";
}

export default function ParentDashboardLayout() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [studentCode, setStudentCode] = useState("");
  const hideGlobalHero = /^\/parents\/classkit/.test(location.pathname);

  const {
    resolvedTheme,
    themeMode,
    cycleThemeMode,
    notificationsOpen,
    setNotificationsOpen,
    unreadCount,
  } = useParentShell();

  const displayName =
    auth.user?.full_name ||
    [auth.user?.first_name, auth.user?.last_name].filter(Boolean).join(" ") ||
    "Parent";
  const greet = firstGreetingName(displayName);

  /** Phone-only sessions must set a password on the login page before using the portal. */
  useEffect(() => {
    if (auth.loading) return;
    if (!auth.user?.phone_only_registration_required) return;
    const next = `${location.pathname}${location.search || ""}` || "/parents/home";
    navigate(`/parents/login?next=${encodeURIComponent(next)}`, { replace: true });
  }, [auth.loading, auth.user?.phone_only_registration_required, navigate, location.pathname, location.search]);

  const submitSearch = (e) => {
    e?.preventDefault?.();
    const q = studentCode.trim();
    navigate(q ? `/parents/home?q=${encodeURIComponent(q)}` : "/parents/home");
  };

  const handleLogout = async () => {
    await auth.logout();
    window.location.href = "/parents/login";
  };

  const ThemeIcon = themeMode === "system" ? Monitor : themeMode === "dark" ? Moon : Sun;

  const NavButton = ({ to, end, label, Icon, mobile }) => (
    <NavLink
      to={to}
      end={end}
      className={mobile ? "flex-1 flex justify-center min-w-0 basis-0" : "block w-full"}
    >
      {({ isActive }) => (
        <span
          className={[
            mobile
              ? "flex flex-col items-center justify-center gap-0.5 w-full py-2 px-0.5 rounded-xl transition-colors"
              : "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all border-l-4",
            mobile
              ? isActive
                ? "text-orange-500 dark:text-orange-400"
                : "text-slate-500 dark:text-slate-400"
              : isActive
                ? "bg-orange-50 text-orange-600 border-orange-500 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-500"
                : "text-slate-600 hover:bg-slate-50 border-transparent dark:text-slate-300 dark:hover:bg-slate-800/80",
          ].join(" ")}
        >
          <Icon className="w-5 h-5 shrink-0" strokeWidth={isActive ? 2.5 : 2} />
          <span className={mobile ? "text-[10px] font-bold leading-tight text-center max-w-full truncate px-0.5" : ""}>
            {label}
          </span>
        </span>
      )}
    </NavLink>
  );

  return (
    <div
      className={resolvedTheme === "dark" ? "dark" : ""}
    >
      <div className="min-h-[100dvh] flex flex-col lg:flex-row bg-slate-50 scroll-smooth antialiased dark:bg-slate-950">
        {/* ── Desktop sidebar ── */}
        <aside className="hidden lg:flex lg:flex-col lg:w-60 xl:w-64 shrink-0 bg-white border-r border-slate-200/80 z-20 dark:bg-slate-900 dark:border-slate-700">
          <div className="p-6 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <div className="rounded-xl bg-slate-900 px-2 py-1.5 border border-slate-700 shadow-md">
                <img src={babyeyiLogo} alt="Babyeyi logo" className="h-7 w-auto object-contain" />
              </div>
              <div>
                <p className="text-sm font-extrabold text-slate-900 leading-tight dark:text-slate-100">Babyeyi</p>
                <p className="text-[10px] font-semibold text-orange-600 uppercase tracking-wide dark:text-orange-400">Parent</p>
              </div>
            </div>
          </div>
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {navItemsDesktop.map((item) => (
              <NavButton key={item.to} {...item} mobile={false} />
            ))}
          </nav>
          <div className="p-4 border-t border-slate-100 dark:border-slate-700">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 border border-slate-200 dark:text-slate-300 dark:hover:bg-slate-800 dark:border-slate-600"
            >
              <LogOut size={18} />
              Log out
            </button>
          </div>
        </aside>

        {/* ── Main column ── */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          {!hideGlobalHero && (
            <header
              className="relative shrink-0 pt-4 pb-28 sm:pb-32 px-4 sm:px-6 overflow-hidden"
              style={{
                background: "linear-gradient(135deg, #ea580c 0%, #f97316 42%, #fb923c 100%)",
              }}
            >
              <div
                className="absolute inset-0 opacity-[0.07] pointer-events-none"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                }}
              />
              <div className="relative max-w-5xl mx-auto flex items-start justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="rounded-2xl bg-[#1F2937]/70 backdrop-blur-sm flex items-center justify-center border border-white/30 shrink-0 px-2 py-1">
                    <img src={babyeyiLogo} alt="Babyeyi logo" className="h-8 w-auto object-contain" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-white font-extrabold text-lg sm:text-xl tracking-tight truncate">Babyeyi</p>
                    <p className="text-white/85 text-sm sm:text-base font-bold truncate">Muraho, {greet}!</p>
                    <p className="text-white/70 text-xs sm:text-sm mt-0.5">Welcome to Babyeyi</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 flex-wrap justify-end">
                  <a
                    href="mailto:hello@babyeyi.rw?subject=Parent%20portal%20help"
                    className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center text-white hover:bg-white/25 transition-colors"
                    aria-label="Help and support"
                    title="Help"
                  >
                    <LifeBuoy size={18} />
                  </a>
                  <button
                    type="button"
                    onClick={cycleThemeMode}
                    className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center text-white hover:bg-white/25 transition-colors"
                    title={
                      themeMode === "system"
                        ? "Theme: System — tap for light"
                        : themeMode === "light"
                          ? "Theme: Light — tap for dark"
                          : "Theme: Dark — tap for system"
                    }
                    aria-label="Cycle theme: system, light, dark"
                  >
                    <ThemeIcon size={18} />
                  </button>
                  <button
                    type="button"
                    className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center text-white hover:bg-white/25 transition-colors"
                    aria-label="Language"
                    title="Language"
                  >
                    <Globe size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setNotificationsOpen(true)}
                    className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center text-white hover:bg-white/25 transition-colors"
                    aria-label="Notifications"
                    title="Notifications"
                  >
                    <Bell size={18} />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center border-2 border-orange-500">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="h-10 sm:h-11 px-3 rounded-full bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center gap-1.5 text-white hover:bg-white/25 transition-colors"
                    aria-label="Log out"
                    title="Log out"
                  >
                    <LogOut size={16} />
                    <span className="hidden sm:inline text-xs font-bold">Logout</span>
                  </button>
                </div>
              </div>
            </header>
          )}

          {!hideGlobalHero && (
            <div className="relative z-10 px-4 -mt-[4.75rem] sm:-mt-20 mb-4 max-w-5xl mx-auto w-full">
              <form
                onSubmit={submitSearch}
                className="flex items-center gap-2 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md rounded-full shadow-xl shadow-orange-900/10 border border-white/90 dark:border-slate-600 ring-1 ring-orange-500/10 p-1.5 pl-4 sm:pl-5"
              >
                <Search className="w-5 h-5 text-slate-400 shrink-0 hidden sm:block dark:text-slate-500" aria-hidden />
                <input
                  type="search"
                  value={studentCode}
                  onChange={(e) => setStudentCode(e.target.value)}
                  placeholder="Student code or SDM ID…"
                  className="flex-1 min-w-0 py-3 text-sm sm:text-base text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none bg-transparent"
                  aria-label="Search by student code or SDM ID"
                />
                <button
                  type="submit"
                  className="shrink-0 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/30 hover:brightness-105 active:scale-95 transition-all"
                  aria-label="Search"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          )}

          <main className={`flex-1 px-4 sm:px-6 pb-8 max-w-5xl mx-auto w-full ${hideGlobalHero ? "pt-4 lg:pt-6" : ""}`}>
            <Outlet />
          </main>

          <footer className="shrink-0 border-t border-slate-200/90 bg-white/90 dark:bg-slate-900/90 dark:border-slate-700 backdrop-blur-md px-4 sm:px-6 py-4 mb-20 lg:mb-0">
            <div className="max-w-5xl mx-auto flex flex-col sm:flex-row flex-wrap items-center justify-between gap-3 text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
              <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
                <Link
                  to="/"
                  className="font-semibold text-slate-600 hover:text-orange-600 transition-colors dark:text-slate-300 dark:hover:text-orange-400"
                >
                  Website
                </Link>
                <Link
                  to="/schools"
                  className="font-semibold text-slate-600 hover:text-orange-600 transition-colors dark:text-slate-300 dark:hover:text-orange-400"
                >
                  Find schools
                </Link>
                <Link
                  to="/parents/orders"
                  className="font-semibold text-slate-600 hover:text-orange-600 transition-colors dark:text-slate-300 dark:hover:text-orange-400 lg:hidden"
                >
                  Order history
                </Link>
                <Link
                  to="/track"
                  className="font-semibold text-slate-600 hover:text-orange-600 transition-colors dark:text-slate-300 dark:hover:text-orange-400"
                >
                  Track application
                </Link>
                <a
                  href="mailto:hello@babyeyi.rw"
                  className="font-semibold text-slate-600 hover:text-orange-600 transition-colors dark:text-slate-300 dark:hover:text-orange-400"
                >
                  Support
                </a>
              </div>
              <span className="text-slate-400 dark:text-slate-500 tabular-nums">Encrypted session · Babyeyi Parent</span>
            </div>
          </footer>
        </div>

        <nav
          className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white dark:bg-slate-900 border-t border-slate-200/90 dark:border-slate-700 shadow-[0_-4px_24px_rgba(15,23,42,0.06)] flex items-stretch justify-around px-1 pt-1"
          style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
        >
          {navItemsMobile.map((item) => (
            <NavButton key={item.to} {...item} mobile />
          ))}
        </nav>

        <NotificationDrawer />
      </div>
    </div>
  );
}
