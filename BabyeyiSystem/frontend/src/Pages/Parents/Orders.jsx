// ================================================================
// Orders.jsx — Order history (local demo data from Classkit flow)
// ================================================================

import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Package, ChevronRight, ClipboardList, ArrowLeft } from "lucide-react";
import { getParentOrders } from "../../utils/parentOrderHistory";

const STATUS_LABEL = {
  pending: { label: "Pending", className: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300" },
  confirmed: { label: "Confirmed", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300" },
  cancelled: { label: "Cancelled", className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
};

export default function Orders() {
  const [tick, setTick] = useState(0);
  const orders = useMemo(() => getParentOrders(), [tick]);

  useEffect(() => {
    const bump = () => setTick((t) => t + 1);
    window.addEventListener("babyeyi-orders-updated", bump);
    window.addEventListener("storage", bump);
    return () => {
      window.removeEventListener("babyeyi-orders-updated", bump);
      window.removeEventListener("storage", bump);
    };
  }, []);

  return (
    <div className="space-y-6 pb-6">
      <div className="flex items-center gap-3">
        <Link
          to="/parents/home"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          aria-label="Back to home"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">Order history</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Classkit and shop orders on this device</p>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white/80 px-6 py-16 text-center dark:border-slate-600 dark:bg-slate-800/40">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-700">
            <ClipboardList className="h-7 w-7 text-slate-400" />
          </div>
          <p className="font-bold text-slate-800 dark:text-slate-200">No orders yet</p>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
            Complete a Classkit order from Services — it will appear here automatically (saved on this device).
          </p>
          <Link
            to="/parents/services"
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-orange-500/25 hover:brightness-105"
          >
            Browse services
            <ChevronRight size={18} />
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {orders.map((o) => {
            const st = STATUS_LABEL[o.status] || STATUS_LABEL.pending;
            return (
              <li key={o.id}>
                <div className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/80">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-100 dark:bg-orange-950/40">
                    <Package className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-extrabold text-slate-900 dark:text-slate-100">{o.kitTitle || "Classkit order"}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${st.className}`}>
                        {st.label}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      {o.childName}
                      {o.delivery === "home" ? " · Home delivery" : " · School delivery"}
                      {o.payment === "loan" ? " · Loan" : " · Mobile Money"}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 dark:text-slate-500">
                      <span>{new Date(o.createdAt).toLocaleString()}</span>
                      <span className="font-bold text-orange-600 dark:text-orange-400 tabular-nums">
                        {Number(o.totalRwf).toLocaleString()} RWF
                      </span>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
