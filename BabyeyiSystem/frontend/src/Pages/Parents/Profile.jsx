// ================================================================
// Profile.jsx — Parent profile & session
// ================================================================

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  User,
  Phone,
  Mail,
  LogOut,
  ChevronRight,
  Lock,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import ParentPushNotificationsCard from "../../components/Parents/ParentPushNotificationsCard";

const API = import.meta.env.VITE_API_URL || "http://localhost:5100";

export default function Profile() {
  const auth = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [recoveryEmailComplete, setRecoveryEmailComplete] = useState("");
  const [recoveryEmailEdit, setRecoveryEmailEdit] = useState("");
  const [recoverySaving, setRecoverySaving] = useState(false);
  const [recoveryMsg, setRecoveryMsg] = useState(null);
  const [recoveryErr, setRecoveryErr] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [okMsg, setOkMsg] = useState(null);

  const hasFullPortal = !!auth.user?.parent_portal_id;

  useEffect(() => {
    const r = auth.user?.recovery_email || "";
    setRecoveryEmailEdit(r);
  }, [auth.user?.recovery_email]);

  const displayName =
    auth.user?.full_name ||
    [auth.user?.first_name, auth.user?.last_name].filter(Boolean).join(" ") ||
    "Parent";

  const phone = auth.user?.parent_phone || auth.user?.phone || "—";
  const email =
    auth.user?.email ||
    auth.user?.father_email ||
    auth.user?.mother_email ||
    null;
  const needsCompleteRegistration =
    !!auth.user?.phone_only_registration_required;

  const handleLogout = async () => {
    await auth.logout();
    window.location.href = "/parents/login";
  };

  const submitCompleteRegistration = async (e) => {
    e.preventDefault();
    setFormError(null);
    setOkMsg(null);
    if (password.length < 8) {
      setFormError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(
        `${API}/api/parent-portal/complete-registration`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            password,
            recovery_email: recoveryEmailComplete.trim() || undefined,
          }),
        },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        setFormError(json.message || "Could not complete registration.");
        return;
      }
      setPassword("");
      setConfirmPassword("");
      setRecoveryEmailComplete("");
      setOkMsg(
        "Registration completed. You can now log in with your password next time.",
      );
      await auth.refresh();
    } catch {
      setFormError("Network error. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const submitRecoveryEmail = async (e) => {
    e.preventDefault();
    setRecoveryErr(null);
    setRecoveryMsg(null);
    setRecoverySaving(true);
    try {
      const res = await fetch(`${API}/api/parent-portal/recovery-email`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recovery_email: recoveryEmailEdit.trim() }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        setRecoveryErr(json.message || "Could not save recovery email.");
        return;
      }
      setRecoveryMsg("Recovery email saved.");
      await auth.refresh();
    } catch {
      setRecoveryErr("Network error. Try again.");
    } finally {
      setRecoverySaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-4">
      <div className="flex flex-col items-center text-center pt-2">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-3xl font-extrabold shadow-lg shadow-orange-500/30 border-4 border-white">
          {displayName[0]?.toUpperCase() || "P"}
        </div>
        <h1 className="text-xl font-extrabold text-slate-900 mt-4">
          {displayName}
        </h1>
      </div>
      <div className="w-full gap-4 justify-center flex flex-col sm:flex-row">
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden divide-y divide-slate-100">
          <div className="flex items-center gap-4 p-4">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
              <User className="w-5 h-5 text-slate-600" />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                Name
              </p>
              <p className="font-semibold text-slate-900 truncate">
                {displayName}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
              <Phone className="w-5 h-5 text-slate-600" />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                Phone
              </p>
              <p className="font-mono font-semibold text-slate-900">{phone}</p>
            </div>
          </div>
          {email && (
            <div className="flex items-center gap-4 p-4">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                <Mail className="w-5 h-5 text-slate-600" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                  Email
                </p>
                <p className="font-semibold text-slate-900 truncate">{email}</p>
              </div>
            </div>
          )}
          {hasFullPortal && (
            <div className="flex items-center gap-4 p-4">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                <Mail className="w-5 h-5 text-amber-700" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                  Recovery email
                </p>
                <p className="font-semibold text-slate-900 truncate">
                  {auth.user?.recovery_email ||
                    "Not set — add below to reset your phone by email"}
                </p>
              </div>
            </div>
          )}
        </div>
        {needsCompleteRegistration && (
          <section
            id="complete-registration"
            className="rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5 shadow-sm"
          >
            <p className="text-sm font-extrabold text-amber-900 mb-1">
              Complete registration
            </p>
            <p className="text-sm text-amber-800 mb-4">
              Secure this parent account by setting your password.
            </p>

            {formError && (
              <div className="mb-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{formError}</span>
              </div>
            )}
            {okMsg && (
              <div className="mb-3 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{okMsg}</span>
              </div>
            )}

            <form onSubmit={submitCompleteRegistration} className="space-y-3">
              <label className="block">
                <span className="text-xs font-bold text-amber-900 uppercase tracking-wide">
                  Recovery email{" "}
                  <span className="text-amber-700/70 font-semibold normal-case">
                    (optional)
                  </span>
                </span>
                <input
                  type="email"
                  autoComplete="email"
                  value={recoveryEmailComplete}
                  onChange={(e) => setRecoveryEmailComplete(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-amber-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-400/20"
                  placeholder="For phone reset if you lose your number"
                  disabled={saving}
                />
                <p className="mt-1 text-[11px] text-amber-800/80">
                  If empty, we use your parent email on file when possible.
                </p>
              </label>
              <label className="block">
                <span className="text-xs font-bold text-amber-900 uppercase tracking-wide">
                  Password
                </span>
                <div className="relative mt-1.5">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-700" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-amber-200 bg-white pl-9 pr-3 py-2.5 text-sm outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-400/20"
                    placeholder="At least 8 characters"
                    disabled={saving}
                  />
                </div>
              </label>
              <label className="block">
                <span className="text-xs font-bold text-amber-900 uppercase tracking-wide">
                  Confirm password
                </span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-amber-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-400/20"
                  disabled={saving}
                />
              </label>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-amber-700 disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save password"}
              </button>
            </form>
          </section>
        )}

        {hasFullPortal && !needsCompleteRegistration && (
          <section className="rounded-2xl border border-slate-100 bg-white p-4 sm:p-5 shadow-sm">
            <p className="text-sm font-extrabold text-slate-900 mb-1">
              Recovery email
            </p>
            {recoveryErr && (
              <div className="mb-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{recoveryErr}</span>
              </div>
            )}
            {recoveryMsg && (
              <div className="mb-3 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{recoveryMsg}</span>
              </div>
            )}
            <form onSubmit={submitRecoveryEmail} className="space-y-3">
              <label className="block">
                <input
                  type="email"
                  autoComplete="email"
                  value={recoveryEmailEdit}
                  onChange={(e) => setRecoveryEmailEdit(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-400/20"
                  placeholder="you@example.com"
                  disabled={recoverySaving}
                />
              </label>
              <button
                type="submit"
                disabled={recoverySaving || !recoveryEmailEdit.trim()}
                className="inline-flex items-center justify-center w-full sm:w-auto rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-amber-700 disabled:opacity-60"
              >
                {recoverySaving ? "Saving…" : "Save"}
              </button>
            </form>
          </section>
        )}
      </div>

      <ParentPushNotificationsCard />

      <button
        type="button"
        onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 rounded-2xl py-4 font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 transition-colors lg:hidden"
      >
        <LogOut size={20} />
        Log out
      </button>
    </div>
  );
}
