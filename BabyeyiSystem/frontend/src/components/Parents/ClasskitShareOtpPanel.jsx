// ================================================================
// Unlock server-issued ClassKit share link (?cks=) via email / SMS / WhatsApp OTP
// ================================================================

import { useState } from "react";
import { ShieldCheck, X, Mail, MessageSquare, Smartphone, Loader2 } from "lucide-react";

export default function ClasskitShareOtpPanel({ apiBase, plainToken, gate, onVerified, onDismiss }) {
  const [channel, setChannel] = useState(
    gate?.channels?.email ? "email" : gate?.channels?.sms ? "sms" : "whatsapp",
  );
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState("");
  const [err, setErr] = useState("");

  const sendOtp = async () => {
    setErr("");
    setHint("");
    setBusy(true);
    try {
      const res = await fetch(`${apiBase}/api/public/classkit-share/send-otp`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: plainToken, channel }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.success) throw new Error(j.message || "Could not send code");
      setHint(j.message || "Check the parent inbox or messages for your code.");
    } catch (e) {
      setErr(e.message || "Send failed");
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    setErr("");
    setBusy(true);
    try {
      const res = await fetch(`${apiBase}/api/public/classkit-share/verify-otp`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: plainToken, otp: otp.replace(/\s/g, "") }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.success) throw new Error(j.message || "Verification failed");
      try {
        sessionStorage.setItem("by_ck_guest_share", "1");
      } catch {
        /* ignore */
      }
      onVerified?.(j);
    } catch (e) {
      setErr(e.message || "Verification failed");
    } finally {
      setBusy(false);
    }
  };

  const ch = gate?.channels || {};
  const ttl = gate?.otp_ttl_minutes ?? 15;
  const hasChannel = !!(ch.email || ch.sms || ch.whatsapp);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-orange-100 dark:border-orange-900/60 p-5 sm:p-6">
        <button
          type="button"
          className="absolute right-4 top-4 rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="Close"
          onClick={onDismiss}
        >
          <X size={20} />
        </button>
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500 text-white">
            <ShieldCheck size={26} strokeWidth={2} />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-50">Secure link</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              OTP sent only to contacts on file for this parent (~{ttl} min)
            </p>
          </div>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
          This ClassKit/ShuleKit link belongs to the family who shared it. Request a verification code sent to their email
          or phone (WhatsApp if configured), enter it below, then you can finish pricing &amp; checkout on this browser.
        </p>
        <div className="rounded-2xl border border-slate-100 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/80 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 mb-4 space-y-1">
          {gate?.masked_email ? (
            <p>
              Email hint: <span className="text-slate-900 dark:text-slate-100">{gate.masked_email}</span>
            </p>
          ) : (
            <p>No email hint on file.</p>
          )}
          {gate?.phone_tail ? (
            <p>
              Phone hint: <span className="text-slate-900 dark:text-slate-100">{gate.phone_tail}</span>
            </p>
          ) : null}
        </div>

        {!hasChannel ? (
          <p className="text-sm text-red-600 mb-4 leading-relaxed">
            This link requires a verification code, but no delivery method is available (parent email missing and SMS/WhatsApp not configured).
            Ask the family to ensure their Babyeyi account has an email, or contact support.
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2 mb-4">
          {ch.email && (
            <button
              type="button"
              onClick={() => setChannel("email")}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold border ${
                channel === "email"
                  ? "border-orange-500 bg-orange-50 text-orange-800 dark:bg-orange-950/60 dark:text-orange-200"
                  : "border-slate-200 bg-white dark:border-slate-600 dark:bg-slate-800"
              }`}
            >
              <Mail size={14} /> Email
            </button>
          )}
          {ch.sms && (
            <button
              type="button"
              onClick={() => setChannel("sms")}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold border ${
                channel === "sms"
                  ? "border-orange-500 bg-orange-50 text-orange-800 dark:bg-orange-950/60 dark:text-orange-200"
                  : "border-slate-200 bg-white dark:border-slate-600 dark:bg-slate-800"
              }`}
            >
              <Smartphone size={14} /> SMS
            </button>
          )}
          {ch.whatsapp && (
            <button
              type="button"
              onClick={() => setChannel("whatsapp")}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold border ${
                channel === "whatsapp"
                  ? "border-orange-500 bg-orange-50 text-orange-800 dark:bg-orange-950/60 dark:text-orange-200"
                  : "border-slate-200 bg-white dark:border-slate-600 dark:bg-slate-800"
              }`}
            >
              <MessageSquare size={14} /> WhatsApp
            </button>
          )}
        </div>

        <div className="flex gap-2 mb-4">
          <button
            type="button"
            disabled={busy || !hasChannel}
            onClick={sendOtp}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-600 text-white font-bold text-sm py-3 disabled:opacity-50"
          >
            {busy ? <Loader2 className="animate-spin" size={18} /> : null}
            Send code
          </button>
        </div>

        <label className="block text-[11px] font-bold uppercase text-slate-500 mb-2">Verification code</label>
        <input
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="6-digit code"
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
          className="w-full rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-3 text-lg font-mono tracking-widest mb-4"
        />
        {hint ? <p className="text-xs text-emerald-700 dark:text-emerald-300 mb-3">{hint}</p> : null}
        {err ? <p className="text-xs text-red-600 mb-3">{err}</p> : null}

        <button
          type="button"
          disabled={busy || otp.length < 6}
          onClick={verify}
          className="w-full rounded-2xl bg-slate-900 dark:bg-orange-700 text-white font-bold text-sm py-3.5 disabled:opacity-45"
        >
          Continue checkout
        </button>
      </div>
    </div>
  );
}
