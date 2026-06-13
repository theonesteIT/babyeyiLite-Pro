import { Calendar, Clock } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const d = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.ceil((d - today) / (24 * 60 * 60 * 1000));
}

export default function PartialPayPromisePicker({
  remainingAfterPay,
  promiseDate,
  setPromiseDate,
  error,
}) {
  const { t } = useTranslation();
  const minDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }, []);
  const maxDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 90);
    return d.toISOString().slice(0, 10);
  }, []);
  const days = daysUntil(promiseDate);

  if (!(remainingAfterPay > 0)) return null;

  return (
    <div className="mt-4 rounded-2xl border-2 border-amber-200 bg-amber-50/50 overflow-hidden">
      <div className="px-4 py-3 border-b border-amber-100 flex items-center gap-2">
        <Calendar size={16} className="text-amber-600 shrink-0" />
        <p className="text-[12px] font-black text-[#000435]">
          {t("publicPay.promiseDateTitle", { defaultValue: "When will you pay the remaining balance?" })}
        </p>
      </div>
      <div className="p-4 space-y-3">
        <p className="text-[12px] text-gray-600 font-medium leading-relaxed">
          {t("publicPay.promiseDateSub", {
            defaultValue: "You are paying less than the full amount. Choose a date for the remaining {{amount}} RWF — we will send daily reminders until then.",
            amount: remainingAfterPay.toLocaleString(),
          })}
        </p>
        <div>
          <label className="block text-[10px] font-black uppercase tracking-[.1em] text-gray-400 mb-2">
            {t("publicPay.promiseDateLabel", { defaultValue: "Promise date" })}
          </label>
          <input
            type="date"
            value={promiseDate || ""}
            min={minDate}
            max={maxDate}
            onChange={(e) => setPromiseDate(e.target.value)}
            className={`w-full h-12 rounded-xl border px-4 text-[#000435] font-bold text-[14px] outline-none transition-colors ${
              error ? "border-red-300 bg-red-50" : "border-gray-200 bg-white focus:border-amber-400 focus:bg-amber-50"
            }`}
          />
          {error ? <p className="text-[11px] text-red-500 font-semibold mt-1.5">{error}</p> : null}
        </div>
        {promiseDate && days != null ? (
          <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-[12px]">
            <Clock size={14} className="text-amber-500 shrink-0" />
            <span className="text-gray-600 font-semibold">
              {days <= 0
                ? t("publicPay.promiseToday", { defaultValue: "Due today" })
                : t("publicPay.promiseDaysLeft", {
                    defaultValue: "{{days}} day(s) until your promise date",
                    days,
                  })}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
