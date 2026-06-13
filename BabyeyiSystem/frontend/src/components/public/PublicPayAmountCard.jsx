import { useState } from "react";
import { Bell, Check, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { isPublicGuestPushSupported, subscribePublicGuestPush } from "../../utils/webPushPublicGuest";

function ProgressRing({ percent }) {
  const p = Math.min(100, Math.max(0, percent || 0));
  const r = 28;
  const c = 2 * Math.PI * r;
  const offset = c - (p / 100) * c;
  return (
    <div className="relative w-16 h-16 shrink-0">
      <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r={r} fill="none" stroke="#f1f5f9" strokeWidth="6" />
        <circle
          cx="32" cy="32" r={r} fill="none" stroke="#fbbf24" strokeWidth="6"
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-black text-[#000435]">
        {Math.round(p)}%
      </span>
    </div>
  );
}

export function FeeReminderPushOptIn({ studentName, studentCode, onEnabled }) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const ask = async () => {
    if (!("Notification" in window)) return;
    setBusy(true);
    setErr("");
    try {
      if (isPublicGuestPushSupported()) {
        try {
          await subscribePublicGuestPush({ studentCode: studentCode || undefined });
          onEnabled?.();
          return;
        } catch (e) {
          setErr(e?.message || "Could not enable notifications");
        }
      }
      const perm = await Notification.requestPermission();
      if (perm === "granted") {
        try {
          localStorage.setItem("babyeyi_fee_reminders", "1");
          if (studentName) localStorage.setItem("babyeyi_fee_reminder_student", studentName);
        } catch { /* ignore */ }
        onEnabled?.();
      }
    } catch { /* ignore */ }
    finally { setBusy(false); }
  };
  if (!("Notification" in window)) return null;
  if (Notification.permission === "granted") return null;
  return (
    <button
      type="button"
      onClick={ask}
      disabled={busy}
      className="mt-4 w-full flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-left hover:border-amber-300 hover:bg-amber-50/60 transition-colors disabled:opacity-60"
    >
      <span className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
        {busy ? <Loader2 size={16} className="text-amber-600 animate-spin" /> : <Bell size={16} className="text-amber-600" />}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-[12px] font-black text-[#000435]">
          {t("publicPay.enableReminders", { defaultValue: "Enable daily balance reminders" })}
        </span>
        <span className="block text-[11px] text-gray-500 font-medium mt-0.5">
          {t("publicPay.enableRemindersSub", { defaultValue: "Get a browser notification when fees remain unpaid." })}
        </span>
      </span>
      {err ? <span className="block text-[10px] text-red-500 font-semibold mt-2">{err}</span> : null}
    </button>
  );
}

export default function PublicPayAmountCard({
  student,
  school,
  selectedCombo,
  comboLabel,
  totalDue,
  alreadyPaid,
  remainingBalance,
  enteredAmount,
  amountInput,
  setAmountInput,
  amountValid,
  amountError,
  balanceLoading,
  payCap,
  onPayFullRemaining,
  showPushOptIn = true,
  cardTitle,
}) {
  const { t } = useTranslation();
  const balanceAfter = remainingBalance != null
    ? Math.max(0, Math.round((remainingBalance - enteredAmount) * 100) / 100)
    : null;
  const paidSoFar = alreadyPaid != null ? alreadyPaid : 0;
  const progressPct = totalDue > 0
    ? Math.min(100, Math.round(((paidSoFar + enteredAmount) / totalDue) * 100))
    : 0;

  return (
    <div className="rounded-2xl border-2 border-amber-200 bg-white overflow-hidden shadow-sm">
      <div className="px-4 py-3 border-b border-amber-100 bg-amber-50">
        <p className="text-[10px] font-black uppercase tracking-[.14em] text-amber-700 text-center">
          {cardTitle || t("publicPay.schoolFeesCard", { defaultValue: "School Fees" })}
        </p>
      </div>

      <div className="p-4 sm:p-5 space-y-3">
        <div className="flex items-start gap-3">
          <ProgressRing percent={progressPct} />
          <div className="flex-1 min-w-0 grid grid-cols-2 gap-x-3 gap-y-2 text-[12px]">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">{t("publicPay.student", { defaultValue: "Student" })}</p>
              <p className="font-bold text-[#000435] truncate">{student ? `${student.first_name || ""} ${student.last_name || ""}`.trim() : "—"}</p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">{t("publicPay.studentCode", { defaultValue: "Student Code" })}</p>
              <p className="font-bold text-[#000435] font-mono text-[11px] truncate">
                {student?.student_code || student?.student_uid || student?.sdm_code || "—"}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">{t("publicPay.class", { defaultValue: "Class" })}</p>
              <p className="font-bold text-[#000435]">{student?.class_name || selectedCombo?.class_name || "—"}</p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">{t("publicPay.academicYear", { defaultValue: "Academic Year" })}</p>
              <p className="font-bold text-[#000435]">{selectedCombo?.academic_year || student?.academic_year || "—"}</p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">{t("publicPay.term", { defaultValue: "Term" })}</p>
              <p className="font-bold text-[#000435]">{selectedCombo?.term || "—"}</p>
            </div>
          </div>
        </div>

        {school?.school_name ? (
          <p className="text-[11px] text-gray-500 font-semibold">{school.school_name}</p>
        ) : null}

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
            <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">{t("publicPay.totalDue", { defaultValue: "Total Due" })}</p>
            <p className="text-[15px] font-black font-mono text-[#000435] mt-0.5">{totalDue.toLocaleString()} RWF</p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
            <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">{t("publicPay.alreadyPaid", { defaultValue: "Already Paid" })}</p>
            <p className="text-[15px] font-black font-mono text-emerald-600 mt-0.5">{paidSoFar.toLocaleString()} RWF</p>
          </div>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 flex items-center justify-between">
          <p className="text-[11px] font-black uppercase tracking-wider text-amber-800">{t("publicPay.remainingBalance", { defaultValue: "Remaining Balance" })}</p>
          <p className="text-[18px] font-black font-mono text-amber-600">
            {balanceLoading ? "…" : `${(remainingBalance ?? totalDue).toLocaleString()} RWF`}
          </p>
        </div>

        {remainingBalance != null && remainingBalance > 0 && onPayFullRemaining ? (
          <button
            type="button"
            onClick={onPayFullRemaining}
            className="w-full rounded-xl border border-[#000435] bg-[#000435] text-white py-2.5 text-[12px] font-black hover:bg-[#000635] transition-colors"
          >
            {t("publicPay.payFullRemaining", { defaultValue: "Pay full remaining balance" })}
            {" "}({remainingBalance.toLocaleString()} RWF)
          </button>
        ) : null}

        <div>
          <label className="block text-[10px] font-black uppercase tracking-[.1em] text-gray-400 mb-2">
            {t("publicPay.amountToPayNow", { defaultValue: "Amount To Pay Now" })}
          </label>
          <div className={`flex items-center gap-2.5 rounded-xl border transition-all h-14 px-4 ${
            amountError ? "border-red-300 bg-red-50"
              : amountValid && enteredAmount > 0 ? "border-emerald-300 bg-emerald-50"
              : "border-gray-200 bg-white"
          }`}>
            <span className="text-gray-400 font-bold text-[12px] shrink-0">RWF</span>
            <input
              type="text"
              inputMode="numeric"
              value={amountInput}
              onChange={(e) => {
                const v = e.target.value.replace(/,/g, "");
                if (v === "" || /^\d*\.?\d*$/.test(v)) setAmountInput(v);
              }}
              placeholder="0"
              className="flex-1 bg-transparent text-[#000435] text-[20px] font-black font-mono placeholder:text-gray-300 outline-none"
            />
            {amountValid && enteredAmount > 0 ? <Check size={18} className="text-emerald-500 shrink-0" strokeWidth={2.5} /> : null}
          </div>
          {amountError ? (
            <p className="text-[11px] text-red-500 font-semibold mt-1.5">{amountError}</p>
          ) : (
            <p className="text-[11px] text-gray-400 mt-1.5">
              {t("publicPay.partialPayHint", { defaultValue: "Pay any amount you have now — balance updates automatically." })}
              {payCap ? ` Max ${payCap.toLocaleString()} RWF.` : ""}
            </p>
          )}
        </div>

        {balanceAfter != null && enteredAmount > 0 ? (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 flex items-center justify-between">
            <p className="text-[11px] font-black uppercase tracking-wider text-gray-500">
              {t("publicPay.balanceAfterPayment", { defaultValue: "Balance After Payment" })}
            </p>
            <p className={`text-[16px] font-black font-mono ${balanceAfter === 0 ? "text-emerald-600" : "text-[#000435]"}`}>
              {balanceAfter.toLocaleString()} RWF
            </p>
          </div>
        ) : null}

        {showPushOptIn ? (
          <FeeReminderPushOptIn
            studentName={student ? `${student.first_name} ${student.last_name}`.trim() : ""}
            studentCode={student?.student_code || student?.student_uid || student?.sdm_code || ""}
          />
        ) : null}
      </div>
    </div>
  );
}
