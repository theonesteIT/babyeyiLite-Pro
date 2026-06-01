// ================================================================
// ParentLogin.jsx — Phone-based parent portal (session cookie)
// Phone → (portal account?) password login : (student match?) set password : register
// ================================================================

import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Phone,
  Lock,
  ArrowRight,
  Loader2,
  AlertCircle,
  ChevronLeft,
  Sparkles,
  KeyRound,
  Eye,
  EyeOff,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const API = import.meta.env.VITE_API_URL || "http://localhost:5100";

const PARENT_LOGIN_PREFS_KEY = "babyeyi_parent_login_prefs";

function loadParentLoginPrefs() {
  try {
    const raw = localStorage.getItem(PARENT_LOGIN_PREFS_KEY);
    if (!raw) return { remember: false, phone: "" };
    const p = JSON.parse(raw);
    return {
      remember: !!p.remember,
      phone: typeof p.phone === "string" ? p.phone : "",
    };
  } catch {
    return { remember: false, phone: "" };
  }
}

const inputCls =
  "w-full rounded-2xl border-2 border-orange-400 bg-white px-4 py-3.5 text-slate-900 placeholder:text-slate-400 outline-none transition-shadow focus:border-orange-500 focus:ring-1 focus:ring-orange-400/20";

export default function ParentLogin() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const auth = useAuth();
  const nextParam = searchParams.get("next") || "";
  const redirectAfterLogin = nextParam.startsWith("/") ? nextParam : "/parents";

  const [phone, setPhone] = useState(() => {
    const prefs = loadParentLoginPrefs();
    try {
      const q =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("phone")
          : null;
      const fromUrl = (q || "").trim();
      if (fromUrl) return fromUrl;
      return prefs.phone || "";
    } catch {
      return prefs.phone || "";
    }
  });
  const [rememberMe, setRememberMe] = useState(() => {
    const prefs = loadParentLoginPrefs();
    const fromUrl =
      typeof window !== "undefined"
        ? (
            new URLSearchParams(window.location.search).get("phone") || ""
          ).trim()
        : "";
    if (fromUrl) return false;
    return !!(prefs.remember && prefs.phone);
  });
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  /** phone | login | setPassword */
  const [step, setStep] = useState("phone");
  const [normalizedPhone, setNormalizedPhone] = useState("");
  const [checking, setChecking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const q = searchParams.get("phone");
    if (q) setPhone(q);
  }, [searchParams]);

  const phoneOnlyRequired = !!(
    auth.user && auth.user.phone_only_registration_required
  );
  const parentPhone = auth.user && auth.user.parent_phone;

  // Full parent account → go to app (not the login screen)
  useEffect(() => {
    if (auth.loading) return;
    if (!auth.isLoggedIn || auth.role !== "PARENT") return;
    if (phoneOnlyRequired) return;
    navigate(redirectAfterLogin, { replace: true });
  }, [
    auth.loading,
    auth.isLoggedIn,
    auth.role,
    phoneOnlyRequired,
    navigate,
    redirectAfterLogin,
  ]);

  // Phone-only session → must set password on this page first
  useEffect(() => {
    if (auth.loading) return;
    if (!auth.isLoggedIn || auth.role !== "PARENT") return;
    if (!phoneOnlyRequired) return;
    setNormalizedPhone(parentPhone || "");
    setStep("setPassword");
  }, [
    auth.loading,
    auth.isLoggedIn,
    auth.role,
    phoneOnlyRequired,
    parentPhone,
  ]);

  const runCheckPhone = async (e) => {
    e?.preventDefault?.();
    setError(null);
    setChecking(true);
    try {
      const res = await fetch(`${API}/api/parent-portal/check-phone`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        setError(json.message || "Could not verify phone number");
        return;
      }
      setNormalizedPhone(json.phone);
      if (json.hasPortalAccount) {
        setStep("login");
        return;
      }
      if (json.inStudents) {
        const quick = await fetch(`${API}/api/parent-portal/phone-login`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: json.phone, remember_me: rememberMe }),
        });
        const quickJson = await quick.json().catch(() => ({}));
        if (!quick.ok || !quickJson.success) {
          setError(
            quickJson.message || "Could not log in with this phone number",
          );
          return;
        }
        await auth.login();
        setNewPassword("");
        setConfirmNewPassword("");
        setRecoveryEmail("");
        setStep("setPassword");
        if (rememberMe) {
          localStorage.setItem(
            PARENT_LOGIN_PREFS_KEY,
            JSON.stringify({ remember: true, phone: json.phone }),
          );
        } else {
          localStorage.removeItem(PARENT_LOGIN_PREFS_KEY);
        }
        return;
      }
      navigate(`/parents/register?phone=${encodeURIComponent(json.phone)}`, {
        replace: false,
      });
    } catch {
      setError("Network error — check your connection");
    } finally {
      setChecking(false);
    }
  };

  const submitLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/parent-portal/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: normalizedPhone,
          password,
          remember_me: rememberMe,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        setError(json.message || "Login failed");
        return;
      }
      if (rememberMe) {
        localStorage.setItem(
          PARENT_LOGIN_PREFS_KEY,
          JSON.stringify({ remember: true, phone: normalizedPhone }),
        );
      } else {
        localStorage.removeItem(PARENT_LOGIN_PREFS_KEY);
      }
      await auth.login();
      navigate(redirectAfterLogin || json.redirect || "/parents", {
        replace: true,
      });
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  const submitCompleteRegistration = async (e) => {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `${API}/api/parent-portal/complete-registration`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            password: newPassword,
            recovery_email: recoveryEmail.trim() || undefined,
            remember_me: rememberMe,
          }),
        },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        setError(json.message || "Could not complete registration.");
        return;
      }
      if (rememberMe && normalizedPhone) {
        localStorage.setItem(
          PARENT_LOGIN_PREFS_KEY,
          JSON.stringify({ remember: true, phone: normalizedPhone }),
        );
      } else if (!rememberMe) {
        localStorage.removeItem(PARENT_LOGIN_PREFS_KEY);
      }
      setNewPassword("");
      setConfirmNewPassword("");
      setRecoveryEmail("");
      await auth.login();
      navigate(redirectAfterLogin || "/parents", { replace: true });
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    setStep("phone");
    setPassword("");
    setError(null);
  };

  const goBackFromSetPassword = async () => {
    setError(null);
    await auth.logout();
    setStep("phone");
    setNormalizedPhone("");
    setNewPassword("");
    setConfirmNewPassword("");
    setRecoveryEmail("");
  };

  const registerHref = `/parents/register${phone.trim() ? `?phone=${encodeURIComponent(phone.trim())}` : ""}`;

  const stepTitle =
    step === "phone"
      ? "Phone number"
      : step === "login"
        ? "Password"
        : "Create your password";
  const stepSubtitle =
    step === "phone"
      ? "Enter your phone. If you already have an account, you’ll enter your password next. If your number matches a student record, you’ll create a password before entering the portal."
      : step === "login"
        ? "Enter your password for this number."
        : "Choose a password to secure your account. Next time: enter this phone number, tap Continue, then sign in with this password.";
  const StepIcon =
    step === "phone" ? Phone : step === "login" ? Lock : KeyRound;

  return (
    <div className="h-screen w-full flex justify-center items-center">
      <div className="flex flex-col text-slate-900">
        <header className="px-0 pt-8 pb-4 flex items-center justify-between max-w-2xl mx-auto w-full">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ChevronLeft size={20} strokeWidth={2.25} />
            Back
          </Link>
        </header>

        <main className="flex-1 flex flex-col items-center justify-start pt-2 px-0 max-w-2xl mx-auto w-full">
          <div className="w-full bg-white rounded-[2rem] shadow-[0_20px_80px_rgba(245,158,11,0.15)] border border-slate-200/80 p-6 sm:p-6">
            <div className="flex flex-col items-center text-center py-3">
              <div className="w-16 h-16 rounded-3xl bg-orange-100 flex items-center justify-center mb-4 shadow-sm shadow-orange-200/80">
                <StepIcon className="w-8 h-8 text-orange-500" strokeWidth={2} />
              </div>
              <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">
                {stepTitle}
              </h1>
            </div>

            {error && (
              <div className="mb-6 flex items-start gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {step === "phone" && (
              <form onSubmit={runCheckPhone} className="space-y-3">
                <label className="block text-left space-y-3">
                  <span className="block text-sm font-semibold text-slate-800">
                    Enter Phone number
                  </span>
                  <input
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="07XX XXX XXX"
                    className={inputCls}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={checking}
                  />
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    disabled={checking}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-stone-300 text-orange-600 focus:ring-orange-400"
                  />
                  Remember me on this device
                </label>

                <button
                  type="submit"
                  disabled={checking || !phone.trim()}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl py-4 font-bold text-slate-700 shadow-lg shadow-orange-500/30 bg-amber-400 transition-all active:scale-[0.99] disabled:opacity-50 disabled:shadow-none"
                >
                  {checking ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      Checking…
                    </>
                  ) : (
                    <>
                      Continue
                      <ArrowRight size={20} strokeWidth={2.5} />
                    </>
                  )}
                </button>

                <p className="text-center text-sm text-slate-500">
                  New here?{" "}
                  <Link
                    to={registerHref}
                    className="font-bold text-amber-600 hover:text-orange-700"
                  >
                    Create a parent account
                  </Link>
                </p>
                <p className="text-center text-xs text-slate-500">
                  <Link
                    to="/parents/reset-phone"
                    className="font-semibold text-slate-600 hover:text-orange-600 underline-offset-2 hover:underline"
                  >
                    Lost your phone number ?
                  </Link>
                </p>
              </form>
            )}

            {step === "login" && (
              <form onSubmit={submitLogin} className="space-y-3">
                <div className="flex justify-between flex-row-reverse px-3">
                  <div className="flex gap-2 text-amber-400">
                    <div className="">
                      <button
                        type="button"
                        onClick={goBack}
                        className="text-sm font-semibold  hover:text-orange-700 pb-3"
                      >
                        Change
                      </button>
                    </div>
                  </div>

                  <div className="flex py-1 gap-3 text-amber-900 text-left">
                    <Phone size={16} className="inline mb-0.5" />
                    <div className="-mt-[3px]">
                      <span className="font-mono font-semibold">
                        {normalizedPhone}
                      </span>
                    </div>
                  </div>
                </div>

                <label className="block text-left">
                  <span className="block text-sm font-semibold text-slate-800 mb-2">
                    Enter Password
                  </span>
                  <div className="relative">
                    <Lock
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-orange-400"
                      size={18}
                    />
                    <input
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      className={`${inputCls} pl-11 pr-11`}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={loading}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    disabled={loading}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-stone-300 text-orange-600 focus:ring-orange-400"
                  />
                  Remember me on this device
                </label>

                <button
                  type="submit"
                  disabled={loading || !password}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl py-4 font-bold text-white shadow-lg shadow-orange-500/30 bg-gradient-to-r from-amber-400 via-orange-500 to-orange-600 hover:from-amber-500 hover:via-orange-500 hover:to-orange-700 transition-all active:scale-[0.99] disabled:opacity-50 disabled:shadow-none"
                >
                  {loading ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    "Log in"
                  )}
                </button>

                <p className="text-center text-sm text-slate-500">
                  <Link
                    to={registerHref}
                    className="font-semibold text-orange-600 hover:text-orange-700 inline-flex items-center gap-1 justify-center"
                  >
                    Register instead
                  </Link>
                </p>
                <p className="text-center text-xs text-slate-500">
                  <Link
                    to="/parents/reset-phone"
                    className="font-semibold text-slate-600 hover:text-orange-600 underline-offset-2 hover:underline"
                  >
                    Lost this phone number?
                  </Link>
                </p>
              </form>
            )}

            {step === "setPassword" && (
              <form onSubmit={submitCompleteRegistration} className="space-y-5">
                <button
                  type="button"
                  onClick={goBackFromSetPassword}
                  className="text-sm font-semibold text-orange-600 hover:text-orange-700 -mt-2 mb-1"
                >
                  ← Use a different number
                </button>

                <div className="rounded-2xl px-4 py-2 text-sm text-amber-900 text-left">
                  <span className="font-mono font-semibold">
                    {normalizedPhone}
                  </span>
                </div>

                <label className="block text-left">
                  <span className="block text-sm font-bold text-slate-800 mb-2">
                    Password
                  </span>
                  <div className="relative">
                    <Lock
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-orange-400"
                      size={18}
                    />
                    <input
                      type={showNewPassword ? "text" : "password"}
                      autoComplete="new-password"
                      className={`${inputCls} pl-11 pr-11`}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      disabled={loading}
                      placeholder="At least 8 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      disabled={loading}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"
                    >
                      {showNewPassword ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                  </div>
                </label>

                <label className="block text-left">
                  <span className="block text-sm font-bold text-slate-800 mb-2">
                    Confirm password
                  </span>
                  <div className="relative">
                    <Lock
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-orange-400"
                      size={18}
                    />
                    <input
                      type={showConfirmNewPassword ? "text" : "password"}
                      autoComplete="new-password"
                      className={`${inputCls} pl-11 pr-11`}
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmNewPassword(!showConfirmNewPassword)
                      }
                      disabled={loading}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"
                    >
                      {showConfirmNewPassword ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                  </div>
                </label>

                <label className="block text-left">
                  <span className="block text-sm font-bold text-slate-800 mb-2">
                    Recovery email{" "}
                    <span className="text-slate-400 font-semibold">
                      (optional)
                    </span>
                  </span>
                  <input
                    type="email"
                    autoComplete="email"
                    placeholder="For account recovery"
                    className={inputCls}
                    value={recoveryEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    disabled={loading}
                  />
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    disabled={loading}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-stone-300 text-orange-600 focus:ring-orange-400"
                  />
                  Remember me on this device
                </label>

                <button
                  type="submit"
                  disabled={loading || !newPassword || !confirmNewPassword}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl py-4 font-bold text-white shadow-lg shadow-orange-500/30 bg-gradient-to-r from-amber-400 via-orange-500 to-orange-600 hover:from-amber-500 hover:via-orange-500 hover:to-orange-700 transition-all active:scale-[0.99] disabled:opacity-50 disabled:shadow-none"
                >
                  {loading ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    "Continue to dashboard"
                  )}
                </button>
              </form>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
