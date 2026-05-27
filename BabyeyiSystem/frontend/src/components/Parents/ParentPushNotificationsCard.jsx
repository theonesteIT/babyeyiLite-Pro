import { useCallback, useEffect, useState } from "react";
import { Bell, BellOff, BellRing, Loader2, ShieldCheck, AlertTriangle } from "lucide-react";
import {
  getParentPushState,
  subscribeParentPush,
  unsubscribeParentPush,
  updateParentPushPreferences,
  isWebPushEnvironmentSupported,
} from "../../utils/webPushParentPortal";

const defaultPrefs = {
  notify_fee_reminders: true,
  notify_discipline: true,
  notify_school_activity: true,
};

export default function ParentPushNotificationsCard() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [permission, setPermission] = useState("default");
  const [prefs, setPrefs] = useState(defaultPrefs);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const state = await getParentPushState();
      setSupported(!!state.supported);
      setSubscribed(!!state.subscribed);
      setPermission(state.permission || "default");
      if (state.preferences) {
        setPrefs({ ...defaultPrefs, ...state.preferences });
      }
    } catch (e) {
      setError(e.message || "Could not load notification settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleEnable = async () => {
    setBusy(true);
    setError("");
    try {
      await subscribeParentPush(prefs);
      await refresh();
    } catch (e) {
      setError(e.message || "Could not enable notifications");
    } finally {
      setBusy(false);
    }
  };

  const handleDisable = async () => {
    setBusy(true);
    setError("");
    try {
      await unsubscribeParentPush();
      await refresh();
    } catch (e) {
      setError(e.message || "Could not disable notifications");
    } finally {
      setBusy(false);
    }
  };

  const togglePref = async (key) => {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    if (!subscribed) return;
    setBusy(true);
    try {
      await updateParentPushPreferences(next);
    } catch (e) {
      setPrefs(prefs);
      setError(e.message || "Could not save preference");
    } finally {
      setBusy(false);
    }
  };

  if (!isWebPushEnvironmentSupported()) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        <p className="font-bold text-slate-800">Browser notifications unavailable</p>
        <p className="mt-1">Use Chrome, Edge, or Firefox on desktop or Android for fee reminder alerts.</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-orange-200/80 bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 p-5 sm:p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex gap-3 min-w-0">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-100 text-orange-600">
            {subscribed ? <BellRing className="w-6 h-6" /> : <Bell className="w-6 h-6" />}
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-extrabold text-slate-900">Instant alerts on this device</h2>
            <p className="text-sm text-slate-600 mt-1 leading-relaxed">
              Get web push notifications for <strong>fee reminders</strong>, discipline updates when marks are
              deducted, and other school activity — even when Babyeyi is closed.
            </p>
            {loading ? (
              <p className="text-xs text-slate-500 mt-2 inline-flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking status…
              </p>
            ) : subscribed ? (
              <p className="text-xs font-bold text-emerald-700 mt-2 inline-flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" /> Notifications enabled on this device
              </p>
            ) : permission === "denied" ? (
              <p className="text-xs font-bold text-amber-800 mt-2 inline-flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> Blocked in browser — allow notifications in site settings
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          {!subscribed ? (
            <button
              type="button"
              disabled={busy || loading || permission === "denied"}
              onClick={handleEnable}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-orange-500/25 hover:brightness-105 disabled:opacity-50 transition-all"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <BellRing className="w-4 h-4" />}
              Enable notifications
            </button>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={handleDisable}
              className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <BellOff className="w-4 h-4" />}
              Turn off
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-orange-100 grid grid-cols-1 sm:grid-cols-3 gap-2">
        {[
          { key: "notify_fee_reminders", label: "Fee reminders", desc: "Outstanding balances & campaigns" },
          { key: "notify_discipline", label: "Discipline", desc: "Marks deducted & cases" },
          { key: "notify_school_activity", label: "School activity", desc: "Other portal updates" },
        ].map((item) => (
          <label
            key={item.key}
            className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 cursor-pointer transition-colors ${
              prefs[item.key]
                ? "border-orange-300 bg-orange-50/80"
                : "border-slate-200 bg-white/80 opacity-75"
            }`}
          >
            <input
              type="checkbox"
              className="mt-1 accent-orange-500"
              checked={!!prefs[item.key]}
              disabled={busy}
              onChange={() => togglePref(item.key)}
            />
            <span>
              <span className="block text-xs font-bold text-slate-900">{item.label}</span>
              <span className="block text-[10px] text-slate-500 mt-0.5">{item.desc}</span>
            </span>
          </label>
        ))}
      </div>

      {error ? (
        <p className="mt-3 text-xs font-semibold text-red-600 rounded-lg bg-red-50 border border-red-100 px-3 py-2">
          {error}
        </p>
      ) : null}
    </section>
  );
}
