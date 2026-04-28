// ================================================================
// Shulecard.jsx — Pocket money card: balance, top-up, daily limit
// ================================================================

import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  CreditCard,
  Smartphone,
  Shield,
  Plus,
  Wallet,
  Gauge,
  Info,
  Loader2,
} from "lucide-react";
import {
  getShulecardBalance,
  getDailyLimit,
  setDailyLimit,
  addTopUp,
  getTopUpLog,
} from "../../utils/shulecardLocal";

const PRESET_TOPUPS = [1000, 5000, 10000, 20000, 50000];

const LIMIT_MIN = 500;
const LIMIT_MAX = 100000;
const DEFAULT_DAILY = 5000;

function formatRwf(n) {
  return `${Number(n || 0).toLocaleString()} RWF`;
}

export default function Shulecard() {
  const [balance, setBalance] = useState(0);
  const [dailyLimit, setDailyLimitState] = useState(DEFAULT_DAILY);
  const [limitDraft, setLimitDraft] = useState(String(DEFAULT_DAILY));
  const [topUpAmount, setTopUpAmount] = useState("");
  const [topUps, setTopUps] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const refresh = useCallback(() => {
    setBalance(getShulecardBalance());
    const lim = getDailyLimit();
    setDailyLimitState(lim);
    setLimitDraft(String(lim));
    setTopUps(getTopUpLog());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const onUpd = () => refresh();
    window.addEventListener("babyeyi-shulecard-updated", onUpd);
    window.addEventListener("storage", onUpd);
    return () => {
      window.removeEventListener("babyeyi-shulecard-updated", onUpd);
      window.removeEventListener("storage", onUpd);
    };
  }, [refresh]);

  const applyTopUp = async (amount) => {
    const raw = amount ?? topUpAmount;
    const n = Math.floor(Number(String(raw).replace(/\s/g, "")) || 0);
    if (n < 500) {
      setMsg({ type: "err", text: "Minimum top-up is 500 RWF." });
      return;
    }
    if (n > 5_000_000) {
      setMsg({ type: "err", text: "Enter a smaller amount (max 5,000,000 RWF for demo)." });
      return;
    }
    setBusy(true);
    setMsg(null);
    await new Promise((r) => setTimeout(r, 400));
    const { balance: next } = addTopUp(n);
    setBalance(next);
    setTopUps(getTopUpLog());
    setTopUpAmount("");
    setMsg({ type: "ok", text: `Added ${formatRwf(n)} to Shulecard.` });
    setBusy(false);
  };

  const saveDailyLimit = () => {
    const n = Math.floor(Number(String(limitDraft).replace(/\s/g, "")) || 0);
    if (n < LIMIT_MIN || n > LIMIT_MAX) {
      setMsg({ type: "err", text: `Daily limit must be between ${formatRwf(LIMIT_MIN)} and ${formatRwf(LIMIT_MAX)}.` });
      return;
    }
    const v = setDailyLimit(n);
    setDailyLimitState(v);
    setMsg({ type: "ok", text: "Daily spending limit saved." });
  };

  return (
    <div className="space-y-6 pb-6 max-w-lg mx-auto text-slate-900 dark:text-slate-100">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight dark:text-slate-100">Shulecard</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Pocket money for school — top up anytime and cap daily spend.
        </p>
      </div>

      {msg && (
        <div
          className={`rounded-2xl px-4 py-3 text-sm font-semibold ${
            msg.type === "ok"
              ? "bg-emerald-50 text-emerald-900 border border-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-900"
              : "bg-red-50 text-red-800 border border-red-100 dark:bg-red-950/40 dark:text-red-200 dark:border-red-900"
          }`}
        >
          {msg.text}
        </div>
      )}

      {/* Balance + card visual */}
      <div className="rounded-3xl bg-gradient-to-br from-orange-600 via-orange-500 to-amber-400 p-6 text-white shadow-xl shadow-orange-500/25">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-white/80 text-sm font-medium">Shulecard balance</p>
            <p className="text-3xl font-extrabold mt-1 tabular-nums tracking-tight">{formatRwf(balance)}</p>
            <p className="text-white/70 text-xs mt-2">Card •••• 4242 · demo wallet on this device</p>
          </div>
          <CreditCard className="w-10 h-10 text-white/90 shrink-0" strokeWidth={1.5} />
        </div>
        <div className="mt-5 flex flex-wrap gap-2 text-xs text-white/85">
          <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1">
            <Shield className="w-3.5 h-3.5" />
            Daily cap {formatRwf(dailyLimit)}
          </span>
        </div>
      </div>

      {/* Top up */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800/80 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 dark:bg-orange-950/50">
            <Plus className="w-5 h-5 text-orange-600 dark:text-orange-400" strokeWidth={2.25} />
          </div>
          <div>
            <h2 className="font-extrabold text-slate-900 dark:text-slate-100">Top up</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Add money from Mobile Money (demo — saved locally)</p>
          </div>
        </div>

        <label className="block">
          <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">Amount (RWF)</span>
          <input
            type="number"
            min={500}
            step={100}
            inputMode="numeric"
            value={topUpAmount}
            onChange={(e) => setTopUpAmount(e.target.value)}
            placeholder="e.g. 10000"
            className="mt-2 w-full rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-3 text-lg font-bold text-slate-900 dark:text-slate-100 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-400/15"
          />
        </label>

        <div className="flex flex-wrap gap-2 mt-3">
          {PRESET_TOPUPS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setTopUpAmount(String(p))}
              className="rounded-full border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-orange-300 hover:bg-orange-50 dark:hover:bg-orange-950/30 transition-colors"
            >
              +{p.toLocaleString()}
            </button>
          ))}
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={() => applyTopUp()}
          className="mt-4 w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 py-3.5 font-bold text-white shadow-lg shadow-orange-500/25 hover:brightness-105 disabled:opacity-60"
        >
          {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wallet className="w-5 h-5" />}
          Confirm top-up
        </button>
      </section>

      {/* Daily limit */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800/80 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-950/40">
            <Gauge className="w-5 h-5 text-amber-800 dark:text-amber-300" strokeWidth={2} />
          </div>
          <div>
            <h2 className="font-extrabold text-slate-900 dark:text-slate-100">Daily spending limit</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Max your child can spend per day with Shulecard</p>
          </div>
        </div>

        <label className="block">
          <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
            Limit per day (RWF)
          </span>
          <input
            type="number"
            min={LIMIT_MIN}
            max={LIMIT_MAX}
            step={500}
            inputMode="numeric"
            value={limitDraft}
            onChange={(e) => setLimitDraft(e.target.value)}
            className="mt-2 w-full rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-3 font-bold text-slate-900 dark:text-slate-100 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-400/15"
          />
        </label>

        <input
          type="range"
          min={LIMIT_MIN}
          max={LIMIT_MAX}
          step={500}
          value={Math.min(LIMIT_MAX, Math.max(LIMIT_MIN, Number(limitDraft) || dailyLimit))}
          onChange={(e) => setLimitDraft(e.target.value)}
          className="mt-4 w-full accent-orange-500 h-2 rounded-full"
        />
        <div className="flex justify-between text-[10px] font-semibold text-slate-400 mt-1">
          <span>{formatRwf(LIMIT_MIN)}</span>
          <span>{formatRwf(LIMIT_MAX)}</span>
        </div>

        <button
          type="button"
          onClick={saveDailyLimit}
          className="mt-4 w-full rounded-2xl border-2 border-orange-200 dark:border-orange-800 bg-orange-50/80 dark:bg-orange-950/30 py-3 font-bold text-orange-800 dark:text-orange-200 hover:bg-orange-100 dark:hover:bg-orange-950/50 transition-colors"
        >
          Save daily limit
        </button>
      </section>

      {/* Recent top-ups */}
      {topUps.length > 0 && (
        <section className="rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800/80 p-5 shadow-sm">
          <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm mb-3">Recent top-ups</h3>
          <ul className="space-y-2">
            {topUps.slice(0, 8).map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between text-sm border-b border-slate-100 dark:border-slate-700 pb-2 last:border-0 last:pb-0"
              >
                <span className="text-slate-600 dark:text-slate-400">
                  {new Date(t.at).toLocaleString()}
                </span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">+{formatRwf(t.amount)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="rounded-2xl border border-blue-100 dark:border-blue-900/50 bg-blue-50/80 dark:bg-blue-950/30 px-4 py-3 flex gap-3">
        <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-900 dark:text-blue-200 leading-relaxed">
          Limits apply per day in supported canteens and shops. This screen stores values on your device until Babyeyi
          connects live Mobile Money and card rails.
        </p>
      </div>

      <ul className="rounded-2xl border border-slate-100 dark:border-slate-600 bg-white dark:bg-slate-800/50 divide-y divide-slate-100 dark:divide-slate-700 shadow-sm overflow-hidden">
        <li className="flex items-center gap-4 p-4">
          <div className="w-11 h-11 rounded-xl bg-orange-50 dark:bg-orange-950/40 flex items-center justify-center shrink-0">
            <Smartphone className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-900 dark:text-slate-100">Pay with phone</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Top-ups simulate adding balance here first.</p>
          </div>
        </li>
        <li className="flex items-center gap-4 p-4">
          <div className="w-11 h-11 rounded-xl bg-orange-50 dark:bg-orange-950/40 flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-900 dark:text-slate-100">Safe by design</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Daily cap helps prevent overspending at school.</p>
          </div>
        </li>
      </ul>

      <p className="text-center text-sm text-slate-500 dark:text-slate-400">
        Main wallet:{" "}
        <Link to="/parents/account" className="font-bold text-orange-600 dark:text-orange-400 hover:underline">
          My Babyeyi Account
        </Link>
      </p>
    </div>
  );
}
