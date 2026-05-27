// SchoolBabyeyiDashboard.jsx — Montserrat + #FEBF10 Gold Theme
// ================================================================

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  AlertCircle, Lock, Eye, EyeOff, Loader2, CheckCircle2,
} from "lucide-react";

import { useAuth } from "../../../context/AuthContext";
import { AcademicProvider } from "../../../manager/context/AcademicContext";
import { getProEntryUrl, shouldUseProApp } from "../../../utils/proAppEntry";

import Header        from "./Header";
import Sidebar       from "./Sidebar";
import {
  getSchoolManagerNavGroups,
  flattenSchoolManagerNav,
} from "./schoolManagerNavConfig";
import { Toast }     from "./UI";
import DashboardPage from "./Dashboard";
import BabyeyiPage   from "./Babyeyi";
import BabyeyiList   from "./BabyeyiList";
import StudentsPage  from "./StudentsPage";
import SchoolWorkersPage from "./SchoolWorkersPage";
import HRCenter from "./HRCenter";
import GateAttendancePage from "./GateAttendancePage";
import LogoutButton  from "../../Auth/LogoutButton";
import { BABYEYI_FONT_STACK, BABYEYI_PAGE_BG } from "../../../theme/babyeyiDashboardTheme";
import BabyeyiPortalLoader from "../../../components/BabyeyiPortalLoader";

import SchoolMiniWebsitePage from "./SchoolMiniWebsitePage";
import StudentTransferPage from "./StudentTransferPage";
import SchoolManagerShuleAvance from "./SchoolManagerShuleAvance";

import {
  RequestsPage, DocumentsPage, AnalyticsPage,
  NotificationsPage, SettingsPage, AuditPage,
} from "./OtherPages";
import { TRANSLATIONS, SAMPLE_NOTIFICATIONS } from "./utils/constants";

const API = import.meta.env.VITE_API_URL || "http://localhost:5100";

/** Full URL of the Pro frontend (babyeyipro Vite app), e.g. http://localhost:5174 — same API / session cookie as this app */
const PRO_APP_BASE = (import.meta.env.VITE_PRO_APP_URL || "").replace(/\/$/, "");

const DEFAULT_PROFILE = {
  name:          "School Name",
  headTeacher:   "",
  district:      "",
  sector:        "",
  category:      "",
  level:         "",
  email:         "",
  phone:         "",
  defaultLang:   "en",
  defaultYear:   "2024-2025",
  logo:          null,
  directorSig:   null,
  accountantSig: null,
  stamp:         null,
};

function ForcePasswordChangeModal({ open, userEmail, onSuccess }) {
  const [show, setShow] = useState({ next: false, confirm: false });
  const [form, setForm] = useState({ newPassword: "", confirm: "" });
  const [ui, setUi] = useState({ loading: false, error: null, success: null });

  useEffect(() => {
    if (!open) return;
    setUi({ loading: false, error: null, success: null });
    setForm({ newPassword: "", confirm: "" });
    setShow({ next: false, confirm: false });
  }, [open]);

  if (!open) return null;

  const submit = async (e) => {
    e.preventDefault();
    if (ui.loading) return;
    if (!form.newPassword.trim() || form.newPassword.length < 8) return setUi(p => ({ ...p, error: "New password must be at least 8 characters." }));
    if (form.newPassword !== form.confirm) return setUi(p => ({ ...p, error: "Passwords do not match." }));

    setUi({ loading: true, error: null, success: null });
    try {
      const res = await fetch(`${API}/api/auth/change-password`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: form.newPassword }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        setUi({ loading: false, error: json.message || "Failed to change password.", success: null });
        return;
      }
      setUi({ loading: false, error: null, success: "Password updated. Redirecting…" });
      await onSuccess?.();
    } catch (err) {
      setUi({ loading: false, error: "Cannot connect to server. Please try again.", success: null });
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/60 p-3 sm:p-6">
      <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 flex items-center justify-center">
              <Lock size={16} className="text-gray-900" />
            </div>
            <div className="min-w-0">
              <div className="text-white font-black text-sm">Change Password</div>
              <div className="text-gray-400 text-xs mt-0.5 leading-snug">
                For security, you must change your password before using the dashboard.
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          <div className="text-xs text-gray-500 font-semibold mb-4">
            Account: <span className="font-mono text-gray-700">{userEmail || "—"}</span>
          </div>

          {ui.error && (
            <div className="mb-4 rounded-2xl bg-red-50 border border-red-100 px-4 py-3 text-xs font-semibold text-red-700">
              {ui.error}
            </div>
          )}
          {ui.success && (
            <div className="mb-4 rounded-2xl bg-green-50 border border-green-100 px-4 py-3 text-xs font-semibold text-green-700 flex items-center gap-2">
              <CheckCircle2 size={14} className="text-green-600" />
              <span>{ui.success}</span>
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">New Password</label>
                <div className="relative">
                  <input
                    className="w-full px-3 py-2.5 pr-10 rounded-xl border border-gray-200 bg-white text-gray-900 text-sm font-medium focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all placeholder-gray-400"
                    type={show.next ? "text" : "password"}
                    value={form.newPassword}
                    onChange={(e) => setForm(p => ({ ...p, newPassword: e.target.value }))}
                    disabled={ui.loading}
                    autoComplete="new-password"
                    placeholder="At least 8 chars"
                  />
                  <button
                    type="button"
                    onClick={() => setShow(p => ({ ...p, next: !p.next }))}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl hover:bg-gray-100 flex items-center justify-center text-gray-500"
                    aria-label="Toggle new password visibility"
                  >
                    {show.next ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Confirm Password</label>
                <div className="relative">
                  <input
                    className="w-full px-3 py-2.5 pr-10 rounded-xl border border-gray-200 bg-white text-gray-900 text-sm font-medium focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all placeholder-gray-400"
                    type={show.confirm ? "text" : "password"}
                    value={form.confirm}
                    onChange={(e) => setForm(p => ({ ...p, confirm: e.target.value }))}
                    disabled={ui.loading}
                    autoComplete="new-password"
                    placeholder="Repeat new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShow(p => ({ ...p, confirm: !p.confirm }))}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl hover:bg-gray-100 flex items-center justify-center text-gray-500"
                    aria-label="Toggle confirm password visibility"
                  >
                    {show.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={ui.loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-amber-400 text-gray-900 font-black text-sm hover:bg-amber-300 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {ui.loading ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
              {ui.loading ? "Updating…" : "Update Password"}
            </button>

            <div className="text-[11px] text-gray-500 leading-relaxed">
              After you change the password, we will send a confirmation email to your account.
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════
export default function SchoolBabyeyiDashboard() {
  const auth = useAuth();

  const [tab,           setTabState]      = useState("dashboard");
  const [toasts,        setToasts]        = useState([]);
  const [mobileOpen,    setMobileOpen]    = useState(false);
  const [online,        setOnline]        = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [notifCount,    setNotifCount]    = useState(
    SAMPLE_NOTIFICATIONS.filter(n => !n.read).length
  );
  const [transferNotifCount, setTransferNotifCount] = useState(0);
  const [lang,          setLang]          = useState("en");
  const [schoolProfile, setSchoolProfile] = useState(DEFAULT_PROFILE);

  const u = auth.user;
  const isProSchool =
    !!u?.school &&
    (u.school.pro_access_effective === true || u.school.pro_access_effective === 1);
  const navGroups = useMemo(
    () => getSchoolManagerNavGroups({ includeSchoolTeam: isProSchool }),
    [isProSchool],
  );
  const navItems = useMemo(() => flattenSchoolManagerNav(navGroups), [navGroups]);
  /** Pro tenant but Lite build has no babyeyipro origin — cannot redirect. */
  const showProEnvMissing = isProSchool && !PRO_APP_BASE;
  const mustChangePassword = !!u?.force_password_change;
  const [pwModalOpen, setPwModalOpen] = useState(false);

  useEffect(() => {
    if (auth.loading) return;
    if (mustChangePassword) setPwModalOpen(true);
    else setPwModalOpen(false);
  }, [auth.loading, mustChangePassword]);

  // Pro schools: skip Lite school-manager shell and open unified Pro app (same session cookie).
  useEffect(() => {
    if (auth.loading) return;
    if (!u || u === false) return;
    if (mustChangePassword) return;
    const rc = String(u?.role?.code || u?.role_code || "").toUpperCase();
    if (shouldUseProApp(u) && getProEntryUrl(rc)) {
      window.location.replace(getProEntryUrl(rc));
    }
  }, [auth.loading, u, mustChangePassword]);

  const session = {
    userId:     u?.id                                    ?? null,
    userName:   u ? `${u.first_name} ${u.last_name}`    : null,
    userEmail:  u?.email                                 ?? null,
    userPhoto:  u?.photo                                 ?? null,
    userRole:   u?.role?.code   ?? u?.role_code          ?? null,
    schoolId:   u?.school?.id   ?? u?.school_id          ?? null,
    schoolName: u?.school?.name ?? u?.school_name        ?? null,
    schoolCode: u?.school?.code ?? u?.school_code        ?? null,
    schoolDistrict:  u?.school?.district ?? u?.district  ?? null,
    schoolProvince:  u?.school?.province ?? u?.province  ?? null,
  };

  useEffect(() => {
    if (!u) return;
    setSchoolProfile(prev => ({
      ...prev,
      name:        session.schoolName    || prev.name,
      district:    session.schoolDistrict|| prev.district,
      email:       session.userEmail     || prev.email,
    }));
  }, [u]);

  useEffect(() => {
    if (auth.loading) return;
    const sid = session.schoolId;
    if (!sid) return;

    (async () => {
      try {
        const res = await fetch(`${API}/api/student-transfers/notifications/unread-count`, {
          credentials: "include",
        });
        const json = await res.json().catch(() => ({}));
        if (res.ok && json.success) setTransferNotifCount(Number(json.data?.unread_count || 0));
        else setTransferNotifCount(0);
      } catch {
        setTransferNotifCount(0);
      }
    })();
  }, [auth.loading, session.schoolId]);

  useEffect(() => {
    const on  = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online",  on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online",  on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const toast = useCallback((message, type = "info") => {
    const id = Date.now() + Math.random();
    setToasts(p => [...p, { id, message, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4500);
  }, []);

  const removeToast = useCallback(
    id => setToasts(p => p.filter(t => t.id !== id)),
    []
  );

  const switchTab = id => { setTabState(id); setMobileOpen(false); };
  const current   = navItems.find(n => n.id === tab) || navItems[0];
  const t         = TRANSLATIONS[lang] || TRANSLATIONS.en;

  useEffect(() => {
    if (!isProSchool && tab === "school_team") {
      setTabState("dashboard");
    }
  }, [isProSchool, tab]);

  const commonProps = { toast, t, setTab: switchTab, session, lang, setLang };

  if (auth.loading) {
    return <BabyeyiPortalLoader message="Loading" />;
  }

  const isMiniWebsite = tab === "school_mini_website";

  return (
    <AcademicProvider>
    <div
      className="min-h-screen flex min-w-0 overflow-x-hidden text-slate-800 babyeyi-dash-shell"
      style={{
        fontFamily: BABYEYI_FONT_STACK,
        background: BABYEYI_PAGE_BG,
      }}
    >
      <style>{`
        @keyframes fadeIn  { from { opacity:0; transform:translateY(8px) }  to { opacity:1; transform:none } }
        @keyframes slideUp { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:none } }
        .anim      { animation: fadeIn  .25s ease-out }
        .slide-up  { animation: slideUp .3s  ease-out }
        ::-webkit-scrollbar       { width:4px; height:4px }
        ::-webkit-scrollbar-thumb { background:#FEBF10; border-radius:99px }
        option { background:white; color:#1e293b }
      `}</style>

      {/* Warning: school_id missing */}
      {!auth.loading && !session.schoolId && (
        <div className="fixed top-0 left-0 right-0 z-50 text-white text-xs font-semibold px-4 py-2 flex items-center gap-2 justify-center"
          style={{ background: "#B88A00" }}>
          <AlertCircle className="w-4 h-4 shrink-0" />
          Warning: school_id not found in session. Please log out and re-login with your school manager account.
        </div>
      )}

      {/* Sidebar */}
      <Sidebar
        tab={tab}
        switchTab={switchTab}
        navGroups={navGroups}
        transferNotifCount={transferNotifCount}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        showProLaunch={false}
        proAppBase={PRO_APP_BASE}
        session={session}
      />

      <ForcePasswordChangeModal
        open={pwModalOpen}
        userEmail={session.userEmail}
        onSuccess={async () => {
          await auth.refresh();
          setPwModalOpen(false);
          toast("Password changed successfully.", "success");
        }}
      />

      {/* Main content */}
      <div
        className={`flex-1 min-w-0 flex flex-col min-h-screen transition-[margin] duration-200 lg:ml-[var(--sm-sidebar-w,260px)] ${!session.schoolId && !auth.loading ? "pt-8" : ""}`}
      >

        {!isMiniWebsite && (
          <Header
            current={current}
            online={online}
            notifCount={notifCount}
            switchTab={switchTab}
            setMobileOpen={setMobileOpen}
            lang={lang}
            setLang={setLang}
            schoolProfile={schoolProfile}
            session={session}
          />
        )}

        {!isMiniWebsite && session.schoolId && showProEnvMissing && (
          <div className="px-4 lg:px-6 max-w-7xl w-full mx-auto pb-3">
            <div className="rounded-2xl border border-amber-300 bg-amber-50/90 p-4 shadow-md flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div className="min-w-0 text-sm text-amber-950">
                <p className="font-black tracking-tight">Pro school — configure the Pro app URL</p>
                <p className="text-[12px] mt-1 leading-relaxed text-amber-900/90">
                  Set <code className="font-mono bg-white/80 px-1 rounded">VITE_PRO_APP_URL</code> on this Lite
                  frontend to the babyeyipro origin (e.g. <code className="font-mono">http://localhost:5174</code>
                  ). Use the <strong>same</strong> <code className="font-mono">VITE_API_URL</code> on both apps so
                  the session cookie applies.
                </p>
              </div>
            </div>
          </div>
        )}

        <main className={isMiniWebsite ? "flex-1 min-w-0" : "flex-1 min-w-0 p-4 lg:p-6 max-w-7xl w-full mx-auto"}>
          {tab === "dashboard"     && <DashboardPage     {...commonProps} />}
          {tab === "babyeyi"       && <BabyeyiPage       {...commonProps} />}
          {tab === "babyeyi_list"  && <BabyeyiList       {...commonProps} />}
          {tab === "students"      && <StudentsPage      session={session} toast={toast} />}
          {tab === "student_transfer" && <StudentTransferPage {...commonProps} />}
          {tab === "school_team" && isProSchool && <SchoolWorkersPage session={session} toast={toast} />}
          {tab === "hr_center" && <HRCenter session={session} toast={toast} />}
          {tab === "gate_attendance" && <GateAttendancePage toast={toast} />}

          {tab === "school_mini_website" && (
            <SchoolMiniWebsitePage session={session} toast={toast} />
          )}

          {tab === "requests"      && <RequestsPage      {...commonProps} />}
          {tab === "documents"     && <DocumentsPage     {...commonProps} />}
          {tab === "shule_avance"  && <SchoolManagerShuleAvance toast={toast} />}
          {tab === "analytics"     && <AnalyticsPage     {...commonProps} />}
          {tab === "notifications" && <NotificationsPage {...commonProps} setNotifCount={setNotifCount} />}
          {tab === "settings"      && (
            <SettingsPage
              {...commonProps}
              schoolProfile={schoolProfile}
              setSchoolProfile={setSchoolProfile}
            />
          )}
          {tab === "audit" && <AuditPage {...commonProps} />}
        </main>
      </div>

      <Toast toasts={toasts} remove={removeToast} />

      {/* Logout */}
      <div className="fixed bottom-4 right-4 z-50 hidden sm:block">
        <LogoutButton
          variant="sidebar"
          className="px-3 py-2 text-white text-xs font-bold rounded-xl shadow-lg"
          style={{ background: "#1A1200", border: "1px solid #3D2C00" }}
        />
      </div>
    </div>
    </AcademicProvider>
  );
}