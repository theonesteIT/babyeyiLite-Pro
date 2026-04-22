// ================================================================
// ParentRegister.jsx — New parent account (maps to parent_portal_accounts)
// ================================================================

import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  UserRound,
  Phone,
  Mail,
  Lock,
  Loader2,
  AlertCircle,
  ChevronLeft,
  Info,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const API = import.meta.env.VITE_API_URL || "http://localhost:5100";

const PARENT_LOGIN_PREFS_KEY = "babyeyi_parent_login_prefs";

const inputCls =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-slate-900 placeholder:text-slate-400 outline-none transition-shadow focus:border-orange-400 focus:ring-4 focus:ring-orange-400/15";

export default function ParentRegister() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const auth = useAuth();

  const [parentName, setParentName] = useState("");
  const [phone, setPhone] = useState(() => searchParams.get("phone") || "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");

  const [inStudents, setInStudents] = useState(null);
  const [checkingPhone, setCheckingPhone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    const q = searchParams.get("phone");
    if (q) setPhone(q);
  }, [searchParams]);

  useEffect(() => {
    if (auth.loading) return;
    if (auth.isLoggedIn && auth.role === "PARENT") {
      navigate("/parents", { replace: true });
    }
  }, [auth.loading, auth.isLoggedIn, auth.role, navigate]);

  const runCheckPhone = useCallback(async () => {
    if (!phone.trim()) {
      setInStudents(null);
      return;
    }
    setCheckingPhone(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/parent-portal/check-phone`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        setInStudents(null);
        return;
      }
      if (json.hasPortalAccount) {
        setError("This number already has an account — log in instead.");
        setInStudents(null);
        return;
      }
      setInStudents(!!json.inStudents);
    } catch {
      setInStudents(null);
    } finally {
      setCheckingPhone(false);
    }
  }, [phone]);

  const didInitialPhoneCheck = useRef(false);
  useEffect(() => {
    if (didInitialPhoneCheck.current) return;
    const q = searchParams.get("phone")?.trim();
    if (!q) return;
    didInitialPhoneCheck.current = true;
    runCheckPhone();
  }, [searchParams, runCheckPhone]);

  const submitRegister = async (e) => {
    e.preventDefault();
    setError(null);
    if (!parentName.trim()) {
      setError("Please enter your name");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== password2) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/parent-portal/register`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          password,
          father_full_name: parentName.trim(),
          mother_full_name: null,
          father_email: email.trim() || null,
          mother_email: null,
          recovery_email: email.trim() || null,
          remember_me: rememberMe,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        setError(json.message || "Registration failed");
        return;
      }
      if (rememberMe && phone.trim()) {
        localStorage.setItem(
          PARENT_LOGIN_PREFS_KEY,
          JSON.stringify({ remember: true, phone: phone.trim() })
        );
      } else {
        localStorage.removeItem(PARENT_LOGIN_PREFS_KEY);
      }
      await auth.login();
      navigate(json.redirect || "/parents/home?addStudent=1", { replace: true });
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  const loginHref = `/parents/login${phone.trim() ? `?phone=${encodeURIComponent(phone.trim())}` : ""}`;

  return (
    <div
      className="min-h-[100dvh] flex flex-col bg-[#FAFAF8]"
    >
      <header className="px-4 pt-4 pb-2 flex items-center justify-between max-w-md mx-auto w-full">
        <Link
          to="/parents/login"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ChevronLeft size={20} strokeWidth={2.25} />
          Parent login
        </Link>
        <Link to="/" className="text-xs font-bold text-orange-600 hover:text-orange-700">
          Home
        </Link>
      </header>

      <main className="flex-1 flex flex-col items-center justify-start px-4 pb-12 pt-2 max-w-md mx-auto w-full">
        <div className="w-full bg-white rounded-[2rem] shadow-xl shadow-orange-900/[0.06] border border-stone-100/90 p-6 sm:p-8">
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center mb-4 shadow-sm">
              <UserRound className="w-7 h-7 text-orange-500" strokeWidth={2} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Create parent account
            </h1>
            <p className="mt-2 text-sm text-slate-500 leading-relaxed max-w-[300px]">
              Complete your profile so we can match you to your children when schools use your phone on their records.
            </p>
          </div>

          {error && (
            <div className="mb-6 flex items-start gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={submitRegister} className="space-y-5">
            <label className="block text-left">
              <span className="block text-sm font-bold text-slate-800 mb-2">
                Parent name <span className="text-red-500">*</span>
              </span>
              <div className="relative">
                <UserRound
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  size={18}
                />
                <input
                  type="text"
                  autoComplete="name"
                  placeholder="Full name"
                  className={`${inputCls} pl-11`}
                  value={parentName}
                  onChange={(e) => setParentName(e.target.value)}
                  disabled={loading}
                />
              </div>
            </label>

            <label className="block text-left">
              <span className="block text-sm font-bold text-slate-800 mb-2">
                Parent phone <span className="text-red-500">*</span>
              </span>
              <div className="relative">
                <Phone
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  size={18}
                />
                <input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="+250 7XX XXX XXX"
                  className={`${inputCls} pl-11`}
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    setInStudents(null);
                  }}
                  onBlur={runCheckPhone}
                  disabled={loading}
                />
              </div>
              {checkingPhone && (
                <p className="mt-1.5 text-xs text-slate-400 flex items-center gap-1">
                  <Loader2 className="animate-spin" size={12} />
                  Checking number…
                </p>
              )}
            </label>

            {inStudents === true && (
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/90 px-4 py-3 text-xs text-emerald-900 flex gap-2.5 text-left">
                <CheckCircle2 className="shrink-0 w-4 h-4 mt-0.5 text-emerald-600" />
                <span>
                  This number matches a parent phone on a student record. After you sign up, linked children will appear on your dashboard.
                </span>
              </div>
            )}
            {inStudents === false && (
              <div className="rounded-2xl border border-sky-100 bg-sky-50/90 px-4 py-3 text-xs text-sky-900 flex gap-2.5 text-left">
                <Info className="shrink-0 w-4 h-4 mt-0.5 text-sky-600" />
                <span>
                  We don&apos;t have this number on a learner profile yet. You can still register — when your school adds it, children will show up automatically.
                </span>
              </div>
            )}

            <label className="block text-left">
              <span className="block text-sm font-bold text-slate-800 mb-2">
                Parent email <span className="text-slate-400 font-semibold">(optional)</span>
              </span>
              <div className="relative">
                <Mail
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  size={18}
                />
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  className={`${inputCls} pl-11`}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="mt-2 rounded-2xl border border-amber-100 bg-amber-50/80 px-3 py-2.5 flex gap-2 text-left">
                <Mail className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-snug text-amber-900/90">
                  Optional. Used for school communications and as your recovery email if you change or lose your phone
                  (self-service reset from the parent login page).
                </p>
              </div>
            </label>

            <label className="block text-left">
              <span className="block text-sm font-bold text-slate-800 mb-2">
                Password <span className="text-red-500">*</span>
              </span>
              <div className="relative">
                <Lock
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  size={18}
                />
                <input
                  type="password"
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  className={`${inputCls} pl-11`}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
            </label>

            <label className="block text-left">
              <span className="block text-sm font-bold text-slate-800 mb-2">
                Confirm password <span className="text-red-500">*</span>
              </span>
              <input
                type="password"
                autoComplete="new-password"
                className={inputCls}
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
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
              Remember me on this device (longer session + save phone here only)
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-2xl py-4 font-bold text-white shadow-lg shadow-orange-500/30 bg-gradient-to-r from-amber-400 via-orange-500 to-orange-600 hover:from-amber-500 hover:via-orange-500 hover:to-orange-700 transition-all active:scale-[0.99] disabled:opacity-50 disabled:shadow-none mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Creating account…
                </>
              ) : (
                "Create account"
              )}
            </button>

            <p className="text-center text-sm text-slate-500 pt-1">
              Already have an account?{" "}
              <Link to={loginHref} className="font-bold text-orange-600 hover:text-orange-700">
                Log in
              </Link>
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}
