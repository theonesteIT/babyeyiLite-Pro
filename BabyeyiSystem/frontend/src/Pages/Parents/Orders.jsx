// ================================================================
// Orders.jsx — Order history + resume / share (ClassKit / ShuleKit)
// ================================================================

import { useReducer, useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Package, ChevronRight, ClipboardList, ArrowLeft, MoreVertical } from "lucide-react";
import { getParentOrders, deleteParentOrder } from "../../utils/parentOrderHistory";
import { kitOrderResumeShareUrl, whatsappShareHref } from "../../utils/parentKitOrderClipboard";

const STATUS_LABEL = {
  incomplete: {
    label: "In progress",
    className: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
  },
  pending_payment: {
    label: "Pay now",
    className: "bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-300",
  },
  pending: {
    label: "Pending",
    className: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
  },
  confirmed: {
    label: "Confirmed",
    className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  },
};

function OrderActionsMenu({ order, onDelete }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  const resumePayload = order.resumePayload;
  const resumeToken = order.resumeToken;

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const canResume =
    (order.status === "incomplete" || order.status === "pending_payment") && (resumePayload || resumeToken);

  if (!canResume) return null;

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const isShule = order.type === "shulekit" || resumePayload?.kitLabel === "shulekit";
  const qs = new URLSearchParams();
  if (resumeToken) qs.set("resume", resumeToken);
  if (isShule) qs.set("kit", "shule");
  const continuePath = `/parents/classkit${qs.toString() ? `?${qs.toString()}` : ""}`;

  const pathForShare = `/parents/classkit${isShule ? "?kit=shule" : ""}`;
  const portable =
    resumePayload && origin
      ? kitOrderResumeShareUrl(origin, pathForShare, resumePayload)
      : `${origin}${continuePath}`;

  const wa = whatsappShareHref(
    `Babyeyi — resume ${order.kitTitle || "ClassKit / ShuleKit"} for ${order.childName || "your child"}`,
    portable,
  );

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(portable);
      window.alert("Link copied.");
    } catch {
      window.alert("Could not copy.");
    }
    setOpen(false);
  };

  return (
    <div className="relative shrink-0 self-start" ref={wrapRef}>
      <button
        type="button"
        aria-label="Order actions"
        onClick={() => setOpen((x) => !x)}
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-100 bg-slate-50 text-slate-600 hover:bg-white dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
      >
        <MoreVertical className="h-5 w-5" />
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-600 dark:bg-slate-900">
          <button
            type="button"
            className="flex w-full px-3 py-2.5 text-left text-sm font-bold text-slate-800 hover:bg-orange-50 dark:text-slate-100 dark:hover:bg-slate-800"
            onClick={() => {
              navigate(continuePath);
              setOpen(false);
            }}
          >
            Continue order
          </button>
          <button
            type="button"
            className="flex w-full px-3 py-2.5 text-left text-sm font-bold text-slate-800 hover:bg-orange-50 dark:text-slate-100 dark:hover:bg-slate-800"
            onClick={onCopy}
          >
            Copy link
          </button>
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full px-3 py-2.5 text-left text-sm font-bold text-emerald-800 hover:bg-emerald-50 dark:text-emerald-200 dark:hover:bg-slate-800"
            onClick={() => setOpen(false)}
          >
            Share (WhatsApp)
          </a>
          <button
            type="button"
            className="flex w-full px-3 py-2.5 text-left text-sm font-bold text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-slate-800"
            onClick={() => {
              const ok = window.confirm("Delete this order from history?");
              if (ok) onDelete?.(order.id);
              setOpen(false);
            }}
          >
            Delete order
          </button>
        </div>
      )}
    </div>
  );
}

export default function Orders() {
  const [, rerenderOrders] = useReducer((n) => n + 1, 0);
  const orders = getParentOrders();
  const handleDelete = (id) => {
    deleteParentOrder(id);
    rerenderOrders();
  };

  useEffect(() => {
    const bump = () => rerenderOrders();
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
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Order history</h1>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white/80 px-6 py-16 text-center dark:border-slate-600">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-700">
            <ClipboardList className="h-7 w-7 text-slate-400" />
          </div>
          <p className="font-bold text-slate-800 dark:text-slate-400">No orders yet</p>
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
                      <p className="font-extrabold text-slate-900 dark:text-slate-100">{o.kitTitle || "ClassKit order"}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${st.className}`}>
                        {st.label}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      {o.childName}
                      {o.delivery === "home" ? " · Home delivery" : " · School delivery"}
                      {o.payment === "loan" ? " · Loan" : " · Mobile Money"}
                      {o.type === "shulekit" ? " · ShuleKit" : ""}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 dark:text-slate-500">
                      <span>{o.createdAt || o.updatedAt ? new Date(o.createdAt || o.updatedAt).toLocaleString() : "—"}</span>
                      <span className="font-bold text-orange-600 dark:text-orange-400 tabular-nums">
                        {Number(o.totalRwf).toLocaleString()} RWF
                      </span>
                    </div>
                  </div>
                  <OrderActionsMenu order={o} onDelete={handleDelete} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
