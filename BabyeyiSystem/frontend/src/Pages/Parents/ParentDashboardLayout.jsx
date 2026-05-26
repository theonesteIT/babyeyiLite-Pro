// ================================================================
// ParentDashboardLayout — Header (search), left sidebar, mobile bottom nav
// ================================================================

import { useState, useEffect, useRef } from "react";
import {
  Outlet,
  NavLink,
  useNavigate,
  useLocation,
  Link,
} from "react-router-dom";
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
  MessageSquare,
  FileText,
  ShieldCheck,
  Sun,
  Moon,
  Monitor,
  MoreVertical,
  MenuIcon,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useParentShell } from "../../context/ParentShellContext";
import NotificationDrawer from "../../components/Parents/NotificationDrawer";
import babyeyiLogo from "../../assets/1BABYEYI LOGO FINAL.png";

const navItemsDesktop = [
  { to: "/parents/home", end: true, label: "Home", Icon: Home },
  { to: "/parents/chat", label: "School chat", Icon: MessageSquare },
  { to: "/parents/services", label: "Services", Icon: LayoutGrid },
  { to: "/parents/orders", label: "Orders", Icon: ClipboardList },
  { to: "/parents/payments-report", label: "Payments", Icon: FileText },
  { to: "/parents/shop", label: "Shop", Icon: ShoppingBag },
  { to: "/parents/shulecard", label: "Shulecard", Icon: CreditCard },
  { to: "/parents/audit-log", label: "Audit", Icon: ShieldCheck },
  { to: "/parents/account", label: "Account", Icon: Wallet },
  { to: "/parents/profile", label: "Profile", Icon: User },
];

/** Mobile: keep top actions visible without overcrowding the bottom bar */
const navItemsMobile = [
  { to: "/parents/home", end: true, label: "Home", Icon: Home },
  { to: "/parents/chat", label: "Chat", Icon: MessageSquare },
  { to: "/parents/services", label: "Services", Icon: LayoutGrid },
  { to: "/parents/shop", label: "Shop", Icon: ShoppingBag },
  { to: "/parents/shulecard", label: "Shulecard", Icon: CreditCard },
  // { to: "/parents/account", label: "Account", Icon: Wallet },
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
  const hideGlobalHero = /^\/parents\/chat/.test(location.pathname);

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
    const next =
      `${location.pathname}${location.search || ""}` || "/parents/home";
    navigate(`/parents/login?next=${encodeURIComponent(next)}`, {
      replace: true,
    });
  }, [
    auth.loading,
    auth.user?.phone_only_registration_required,
    navigate,
    location.pathname,
    location.search,
  ]);

  const submitSearch = (e) => {
    e?.preventDefault?.();
    const q = studentCode.trim();
    navigate(q ? `/parents/home?q=${encodeURIComponent(q)}` : "/parents/home");
  };

  const handleLogout = async () => {
    await auth.logout();
    window.location.href = "/parents/login";
  };

  const ThemeIcon =
    themeMode === "system" ? Monitor : themeMode === "dark" ? Moon : Sun;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef(null);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleClickOutside = (event) => {
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target)
      ) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [mobileMenuOpen]);

  const NavButton = ({ to, end, label, Icon, mobile }) => (
    <NavLink
      to={to}
      end={end}
      className={
        mobile ? "flex-1 flex justify-center min-w-0 basis-0" : "block w-full"
      }
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
          <span
            className={
              mobile
                ? "text-[10px] font-bold leading-tight text-center max-w-full truncate px-0.5"
                : ""
            }
          >
            {label}
          </span>
        </span>
      )}
    </NavLink>
  );

  return (
    <div className={resolvedTheme === "dark" ? "dark" : ""}>
      <div className="min-h-screen flex flex-col lg:flex-row bg-white scroll-smooth antialiased">
        {/* ── Desktop sidebar ── */}
        <aside className="hidden lg:flex lg:flex-col lg:w-60 xl:w-64 shrink-0 bg-white border-r border-slate-200/80 z-20 dark:bg-slate-900 dark:border-slate-700">
          <div className="p-6 border-b border-slate-100 dark:border-slate-700">
            <div className="flex w-full items-center gap-2">
              <div className="rounded-xl w-full flex justify-center items-center px-2 py-1.5">
                <img
                  src={babyeyiLogo}
                  alt="Babyeyi logo"
                  className="h-7 w-auto object-contain"
                />
              </div>
              {/* <div>
                <p className="text-sm font-extrabold text-slate-900 leading-tight dark:text-slate-100">Babyeyi</p>
                <p className="text-[10px] font-semibold text-orange-600 uppercase tracking-wide dark:text-orange-400">Parent</p>
              </div> */}
            </div>
          </div>
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {navItemsDesktop.map((item) => (
              <NavButton key={item.to} {...item} mobile={false} />
            ))}
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
          </nav>
        </aside>

        {/* ── Main column ── */}
        <div className="flex-1 flex flex-col min-w-0 h-screen">
          {!hideGlobalHero && (
            <>
              <header className="relative overflow-visible bg-slate-900 text-white/90 dark:bg-slate-800 dark:text-white/80 border-b border-slate-700/80 px-1 sm:px-16 py-3">
              <div className="absolute inset-0 opacity-10 pointer-events-none" />
              <div className="relative max-w-full px-4 mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex flex-col sm:flex-row w-full items-center gap-3 min-w-0">
                  <div className="rounded-3xl flex sm:hidden w-full items-center justify-center shrink-0 px-3 py-2 overflow-visible">
                    <div className="w-full flex justify-between">
                      <div className="">
                        <img
                          src={babyeyiLogo}
                          alt="Babyeyi logo"
                          className="h-9 w-auto object-contain"
                        />
                      </div>
                      <div
                        className="relative flex sm:hidden overflow-visible"
                        ref={mobileMenuRef}
                      >
                        <button
                          type="button"
                          onClick={() => setMobileMenuOpen((open) => !open)}
                          className="inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/25"
                          aria-haspopup="menu"
                          aria-expanded={mobileMenuOpen}
                        >
                          <MenuIcon className="w-5 h-5 text-bold" size={18} />
                        </button>
                        <div
                          className={
                            "absolute right-0 top-full mt-2 w-72 min-w-[16rem] rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10 ring-1 ring-slate-900/5 z-1 transition-all duration-200 ease-out " +
                            (mobileMenuOpen
                              ? "opacity-100 scale-100 visible"
                              : "opacity-0 scale-95 invisible")
                          }
                          role="menu"
                        >
                          <div className="flex flex-col gap-1 p-2">
                            <a
                              href="/parents/profile"
                              className="group flex items-center gap-3 rounded-2xl px-4 py-3 text-slate-700 hover:bg-slate-100"
                              role="menuitem"
                            >
                              <User className="w-5 h-5 text-orange-500" />
                              <span>Profile</span>
                            </a>
                            <a
                              href="mailto:hello@babyeyi.rw?subject=Parent%20portal%20help"
                              className="group flex items-center gap-3 rounded-2xl px-4 py-3 text-slate-700 hover:bg-slate-100"
                              role="menuitem"
                            >
                              <LifeBuoy className="w-5 h-5 text-orange-500" />
                              <span>Help & support</span>
                            </a>
                            <button
                              type="button"
                              onClick={cycleThemeMode}
                              className="group flex items-center gap-3 rounded-2xl px-4 py-3 text-slate-700 hover:bg-slate-100"
                              role="menuitem"
                            >
                              <ThemeIcon className="w-5 h-5 text-orange-500" />
                              <span>Switch theme</span>
                            </button>
                            <button
                              type="button"
                              className="group flex items-center gap-3 rounded-2xl px-4 py-3 text-slate-700 hover:bg-slate-100"
                              role="menuitem"
                              aria-label="Language"
                            >
                              <Globe className="w-5 h-5 text-orange-500" />
                              <span>Language</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setMobileMenuOpen(false);
                                setNotificationsOpen(true);
                              }}
                              className="group relative flex items-center gap-3 rounded-2xl px-4 py-3 text-slate-700 hover:bg-slate-100"
                              role="menuitem"
                            >
                              <Bell className="w-5 h-5 text-orange-500" />
                              <span>Notifications</span>
                              {unreadCount > 0 && (
                                <span className="ml-auto inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-2 text-[10px] font-bold text-white">
                                  {unreadCount > 9 ? "9+" : unreadCount}
                                </span>
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setMobileMenuOpen(false);
                                handleLogout();
                              }}
                              className="group flex items-center gap-3 rounded-2xl px-4 py-3 text-slate-700 hover:bg-slate-100"
                              role="menuitem"
                            >
                              <LogOut className="w-5 h-5 text-orange-500" />
                              <span>Log out</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="min-w-0 sm:flex hidden">
                    <p className="text-white font-extrabold text-2xl sm:text-3xl tracking-tight truncate">
                      Parent portal
                    </p>
                  </div>
                </div>
                <div className="hidden sm:block px-4 mt-2 mb-2 max-w-8xl mx-auto w-full">
                  <form
                    onSubmit={submitSearch}
                    className="flex items-center gap-2 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md rounded-full px-1 shadow-xl shadow-orange-900/10 border border-white/90 dark:border-slate-600 ring-1 ring-orange-500/10 pl-2 sm:pl-4"
                  >
                      <Search
                        className="w-5 h-4 text-slate-400 shrink-0 hidden sm:block dark:text-slate-500"
                        aria-hidden
                      />
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
                        className="shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/30 hover:brightness-105 active:scale-95 transition-all"
                        aria-label="Search"
                      >
                        <Send className="w-5 h-5" />
                      </button>
                    </form>
                  </div>

                <div className="hidden sm:flex w-full sm:w-auto items-center gap-2 sm:gap-3 shrink-0 flex-wrap justify-center sm:justify-end">
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
                    <span className="hidden sm:inline text-xs font-bold">
                      Logout
                    </span>
                  </button>
                </div>
              </div>
            </header>

            <div className="sm:hidden z-0 px-4 py-4 border-b border-slate-200 bg-slate-50">
              <form
                onSubmit={submitSearch}
                className="flex items-center gap-2bg-slate-50/80 dark:bg-slate-700/80 backdrop-blur-md rounded-full pl-4 p-1 px-1 shadow-xl shadow-orange-900/10 border border-white/90 dark:border-slate-600 ring-1 ring-orange-500/10 w-full"
              >
                <Search
                  className="w-5 h-5 text-slate-100"
                  aria-hidden
                />
                <input
                  type="search"
                  value={studentCode}
                  onChange={(e) => setStudentCode(e.target.value)}
                  placeholder="Student code or SDM ID…"
                  className="flex-1 min-w-0 py-3 text-sm text-slate-100 pl-4 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none "
                  aria-label="Search by student code or SDM ID"
                />
                <button
                  type="submit"
                  className="shrink-0 w-11 h-11 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/30 hover:brightness-105 active:scale-95 transition-all"
                  aria-label="Search"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
            </>
          )}

          <main className="p-6 pb-20 overflow-y-auto h-screen">
            <Outlet />
          </main>
{/* 
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
            </div>
          </footer> */}
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
