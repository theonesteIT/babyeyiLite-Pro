// ================================================================
// Orders.jsx — Order history + resume / share (ClassKit / ShuleKit)
// ================================================================

import { useReducer, useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Package, ChevronRight, ClipboardList, ArrowLeft, MoreVertical } from "lucide-react";
import { getParentOrders, deleteParentOrder } from "../../utils/parentOrderHistory";
import { whatsappShareHref } from "../../utils/parentKitOrderClipboard";
import {
  deleteIncompleteOrderOnServer,
  fetchIncompleteOrdersFromServer,
  incompleteOrderToLocalOrder,
} from "../../utils/parentIncompleteOrderApi";
import { orderResumePaths } from "../../utils/parentVoucherIncompleteOrder";
import { kitOrderResumeShareUrl } from "../../utils/parentKitOrderClipboard";

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
  const paths = orderResumePaths(order, origin);
  const continuePath = paths.continuePath;
  let portable = paths.portable;
  if (paths.isClasskit && resumePayload && origin && paths.pathForShare) {
    portable = kitOrderResumeShareUrl(origin, paths.pathForShare, resumePayload);
  }

  const wa = whatsappShareHref(
    `Babyeyi — resume ${order.kitTitle || "your order"} for ${order.childName || "your child"}`,
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
              if (ok) onDelete?.(order);
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

function mergeOrders(local, serverRows) {
  const byToken = new Map();
  for (const o of local) {
    const key = o.resumeToken ? String(o.resumeToken) : String(o.id);
    byToken.set(key, o);
  }
  for (const row of serverRows) {
    const mapped = incompleteOrderToLocalOrder(row);
    const key = mapped.resumeToken ? String(mapped.resumeToken) : String(mapped.id);
    const prev = byToken.get(key);
    if (!prev || new Date(mapped.updatedAt || 0) >= new Date(prev.updatedAt || 0)) {
      byToken.set(key, { ...prev, ...mapped, fromServer: true });
    } else {
      byToken.set(key, prev);
    }
  }
  return [...byToken.values()].sort(
    (a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0),
  );
}

export default function Orders() {
  const [, rerenderOrders] = useReducer((n) => n + 1, 0);
  const [serverOrders, setServerOrders] = useState([]);
  const orders = mergeOrders(getParentOrders(), serverOrders);

  const handleDelete = (order) => {
    const id = typeof order === "object" ? order.id : order;
    deleteParentOrder(id);
    const token = typeof order === "object" ? order.resumeToken : null;
    if (token) void deleteIncompleteOrderOnServer(token);
    rerenderOrders();
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const rows = await fetchIncompleteOrdersFromServer();
      if (!cancelled) setServerOrders(rows);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Order history</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            ClassKit, shoes & uniform vouchers — synced to your account; resume on any device
          </p>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-3xl border border-slate-100 bg-white/80 px-6 py-16 text-center dark:border-slate-100 shadow-sm dark:bg-slate-100/40">
          
          <p className="font-bold text-slate-800 dark:text-slate-700">No orders yet</p>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
            Start ClassKit or ShuleKit from Services — unfinished orders get a resume link you can share.
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
                  <OrderActionsMenu order={o} onDelete={() => handleDelete(o)} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
