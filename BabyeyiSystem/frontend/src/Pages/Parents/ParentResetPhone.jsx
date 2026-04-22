// ================================================================
// ParentResetPhone.jsx — Self-service phone reset via recovery email
// ================================================================

import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Mail, Phone, Lock, Loader2, AlertCircle, ChevronLeft, CheckCircle2 } from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://localhost:5100";

const inputCls =
  "w-full rounded-2xl border-2 border-orange-400 bg-white px-4 py-3.5 text-slate-900 placeholder:text-slate-400 outline-none transition-shadow focus:border-orange-500 focus:ring-4 focus:ring-orange-400/20";

export default function ParentResetPhone() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tokenFromUrl = (searchParams.get("token") || "").trim();

  const [email, setEmail] = useState("");
  const [requesting, setRequesting] = useState(false);
  const [requestOk, setRequestOk] = useState(false);
  const [error, setError] = useState(null);

  const [tokenValid, setTokenValid] = useState(null);
  const [newPhone, setNewPhone] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [completing, setCompleting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!tokenFromUrl) {
      setTokenValid(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `${API}/api/parent-portal/phone-reset/validate?token=${encodeURIComponent(tokenFromUrl)}`,
          { credentials: "omit" }
        );
        const json = await res.json().catch(() => ({}));
        if (!cancelled) setTokenValid(!!json.valid);
      } catch {
        if (!cancelled) setTokenValid(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tokenFromUrl]);

  const submitRequest = async (e) => {
    e.preventDefault();
    setError(null);
    setRequestOk(false);
    setRequesting(true);
    try {
      const res = await fetch(`${API}/api/parent-portal/request-phone-reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        setError(json.message || "Could not send email");
        return;
      }
      setRequestOk(true);
    } catch {
      setError("Network error");
    } finally {
      setRequesting(false);
    }
  };

  const submitComplete = async (e) => {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setCompleting(true);
    try {
      const res = await fetch(`${API}/api/parent-portal/complete-phone-reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: tokenFromUrl,
          new_phone: newPhone,
          new_password: newPassword,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        setError(json.message || "Could not update your number");
        return;
      }
      setDone(true);
      setTimeout(() => navigate("/parents/login", { replace: true }), 2200);
    } catch {
      setError("Network error");
    } finally {
      setCompleting(false);
    }
  };

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

      <main className="flex-1 flex flex-col items-center justify-start px-4 pb-12 pt-4 max-w-md mx-auto w-full">
        <div className="w-full bg-white rounded-[2rem] shadow-xl shadow-orange-900/[0.06] border border-stone-100/90 p-6 sm:p-8">
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center mb-4 shadow-sm">
              {tokenFromUrl ? (
                <Phone className="w-7 h-7 text-orange-500" strokeWidth={2} />
              ) : (
                <Mail className="w-7 h-7 text-orange-500" strokeWidth={2} />
              )}
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {tokenFromUrl ? "New phone number" : "Lost your phone number?"}
            </h1>
            <p className="mt-2 text-sm text-slate-500 leading-relaxed max-w-[300px]">
              {tokenFromUrl
                ? "Enter your new Rwanda mobile number and choose a new password for your parent account."
                : "Enter the recovery email saved on your parent account. We will send a secure link (valid 1 hour)."}
            </p>
          </div>

          {error && (
            <div className="mb-6 flex items-start gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {tokenFromUrl && tokenValid === false && (
            <div className="mb-6 flex items-start gap-2 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <span>This link is invalid or has expired. Request a new email below.</span>
            </div>
          )}

          {requestOk && !tokenFromUrl && (
            <div className="mb-6 flex items-start gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
              <span>
                If that email is registered for recovery, check your inbox for the reset link. If you do not see it,
                verify spam or try again later.
              </span>
            </div>
          )}

          {done && (
            <div className="mb-6 flex items-start gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
              <span>Success! Redirecting to login…</span>
            </div>
          )}

          {!tokenFromUrl && (
            <form onSubmit={submitRequest} className="space-y-6">
              <label className="block text-left">
                <span className="block text-sm font-bold text-slate-800 mb-2">Recovery email</span>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-orange-400" size={18} />
                  <input
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    className={`${inputCls} pl-11`}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={requesting}
                  />
                </div>
              </label>
              <button
                type="submit"
                disabled={requesting || !email.trim()}
                className="w-full flex items-center justify-center gap-2 rounded-2xl py-4 font-bold text-white shadow-lg shadow-orange-500/30 bg-gradient-to-r from-amber-400 via-orange-500 to-orange-600 hover:from-amber-500 hover:via-orange-500 hover:to-orange-700 transition-all active:scale-[0.99] disabled:opacity-50 disabled:shadow-none"
              >
                {requesting ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    Sending…
                  </>
                ) : (
                  "Send reset link"
                )}
              </button>
            </form>
          )}

          {tokenFromUrl && tokenValid === true && !done && (
            <form onSubmit={submitComplete} className="space-y-5">
              <label className="block text-left">
                <span className="block text-sm font-bold text-slate-800 mb-2">New phone number</span>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-orange-400" size={18} />
                  <input
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="+250 7XX XXX XXX"
                    className={`${inputCls} pl-11`}
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    disabled={completing}
                  />
                </div>
              </label>
              <label className="block text-left">
                <span className="block text-sm font-bold text-slate-800 mb-2">New password</span>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-orange-400" size={18} />
                  <input
                    type="password"
                    autoComplete="new-password"
                    className={`${inputCls} pl-11`}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={completing}
                  />
                </div>
              </label>
              <label className="block text-left">
                <span className="block text-sm font-bold text-slate-800 mb-2">Confirm new password</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  className={inputCls}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={completing}
                />
              </label>
              <button
                type="submit"
                disabled={completing || !newPhone.trim()}
                className="w-full flex items-center justify-center gap-2 rounded-2xl py-4 font-bold text-white shadow-lg shadow-orange-500/30 bg-gradient-to-r from-amber-400 via-orange-500 to-orange-600 hover:from-amber-500 hover:via-orange-500 hover:to-orange-700 transition-all active:scale-[0.99] disabled:opacity-50 disabled:shadow-none"
              >
                {completing ? <Loader2 className="animate-spin" size={20} /> : "Update phone & log in"}
              </button>
            </form>
          )}

          {tokenFromUrl && tokenValid === null && (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin text-orange-500" size={32} />
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-slate-400 max-w-sm leading-relaxed px-2">
          Add or update your recovery email anytime under <strong className="text-slate-600">Profile</strong> in the
          parent dashboard (after you log in).
        </p>
      </main>
    </div>
  );
}
