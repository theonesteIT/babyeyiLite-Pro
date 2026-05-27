import { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  Search,
  Filter,
  Eye,
  Pencil,
  X,
  Save,
  ShoppingBag,
  Wallet,
  PackageCheck,
  Clock,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  Download,
  Package,
  SlidersHorizontal,
} from "lucide-react";
import {
  pageShell,
  pageCard,
  tableShell,
  tableHeadRow,
  tableHeadCell,
  tableBodyRow,
  inputClass,
  selectClass,
  btnPrimary,
  btnSecondary,
  btnAmber,
  labelClass,
  ACCENT_SLATE,
} from "./agentTheme";
import AgentPageHeader from "./AgentPageHeader";
import { BABYEYI_FONT_STACK } from "../../theme/babyeyiDashboardTheme";

const API = `${import.meta.env.VITE_API_URL || "http://localhost:5100"}/api`;
const API_ORIGIN = (import.meta.env.VITE_API_URL || "http://localhost:5100").replace(/\/$/, "");
const PAGE_SIZE = 8;

const FULFILLMENT_OPTIONS = [
  { value: "Pending", label: "Pending" },
  { value: "Processing", label: "Processing" },
  { value: "Ready for delivery", label: "Ready for delivery" },
  { value: "Delivered", label: "Delivered" },
  { value: "Not delivered", label: "Not delivered" },
  { value: "Out of stock", label: "Out of stock" },
  { value: "Cancelled", label: "Cancelled" },
  { value: "Completed", label: "Completed" },
];

const PAYMENT_LABELS = {
  awaiting_payment: "Awaiting payment",
  pending: "Pending",
  paid: "Paid",
  failed: "Failed",
  refunded: "Refunded",
};

function toImage(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_ORIGIN}${url.startsWith("/") ? "" : "/"}${url}`;
}

function productThumb(row) {
  const g = row?.product_gallery_images;
  if (Array.isArray(g) && g[0]) return toImage(g[0]);
  if (row?.product_icon_url) return toImage(row.product_icon_url);
  return "";
}

function formatDate(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return "—";
  }
}

function formatDateTime(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function orderRef(row) {
  return row.batch_ref || row.order_number || `#${row.id}`;
}

function isDelivered(row) {
  const f = String(row.fulfillment_status || "").toLowerCase();
  return f === "delivered" || f === "completed";
}

function isPendingOrder(row) {
  const pay = String(row.payment_status || "").toLowerCase();
  if (pay === "awaiting_payment" || pay === "pending") return true;
  const f = String(row.fulfillment_status || "Pending").toLowerCase();
  return f === "pending" || f === "processing" || f === "ready for delivery";
}

function paymentStatusBadge(row) {
  const pay = String(row.payment_status || "pending").toLowerCase();
  if (pay === "awaiting_payment") {
    return { label: PAYMENT_LABELS.awaiting_payment, className: "bg-amber-50 text-amber-800 border-amber-200/80" };
  }
  if (pay === "paid") {
    return { label: PAYMENT_LABELS.paid, className: "bg-emerald-50 text-emerald-800 border-emerald-200/80" };
  }
  if (pay === "failed") {
    return { label: PAYMENT_LABELS.failed, className: "bg-red-50 text-red-700 border-red-200/80" };
  }
  if (pay === "refunded") {
    return { label: PAYMENT_LABELS.refunded, className: "bg-slate-100 text-slate-700 border-slate-200" };
  }
  return { label: PAYMENT_LABELS.pending, className: "bg-slate-50 text-slate-600 border-slate-200" };
}

function fulfillmentStatusBadge(row) {
  const f = String(row.fulfillment_status || "Pending").trim();
  const low = f.toLowerCase();
  if (low === "delivered" || low === "completed") {
    return { label: low === "completed" ? "Completed" : "Delivered", className: "bg-emerald-50 text-emerald-800 border-emerald-200/80" };
  }
  if (low === "processing") {
    return { label: "Processing", className: "bg-sky-50 text-sky-800 border-sky-200/80" };
  }
  if (low === "ready for delivery") {
    return { label: "Ready", className: "bg-indigo-50 text-indigo-800 border-indigo-200/80" };
  }
  if (low === "cancelled" || low === "not delivered" || low === "out of stock") {
    return { label: f, className: "bg-red-50 text-red-700 border-red-200/80" };
  }
  return { label: f || "Pending", className: "bg-violet-50 text-violet-800 border-violet-200/80" };
}

function deliveryBadge(mode) {
  const m = String(mode || "").toUpperCase();
  if (m === "AT_HOME") return { label: "At home", short: "HOME", className: "bg-sky-50 text-sky-800 border-sky-200/80" };
  if (m === "AT_SCHOOL") return { label: "At school", short: "SCHOOL", className: "bg-sky-50 text-sky-800 border-sky-200/80" };
  return { label: mode || "—", short: "—", className: "bg-slate-50 text-slate-600 border-slate-200" };
}

function StatusPill({ badge, title }) {
  return (
    <span
      title={title}
      className={`inline-flex max-w-full items-center px-1.5 py-0.5 rounded-md border text-[9px] sm:text-[10px] font-bold leading-tight truncate ${badge.className}`}
    >
      {badge.label}
    </span>
  );
}

function CompactStat({ icon: Icon, label, value, sub, accent = "amber", pct }) {
  const iconBg = {
    amber: "bg-amber-100 text-amber-700",
    emerald: "bg-emerald-100 text-emerald-700",
    sky: "bg-sky-100 text-sky-700",
    violet: "bg-violet-100 text-violet-700",
  }[accent];
  const bar = { amber: "bg-amber-400", emerald: "bg-emerald-500", sky: "bg-sky-500", violet: "bg-violet-500" }[accent];

  return (
    <div className="rounded-xl border border-slate-200/90 bg-white px-3 py-2.5 shadow-sm">
      <div className="flex items-center gap-2.5">
        <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>
          <Icon className="w-3.5 h-3.5" strokeWidth={2.25} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-wide truncate">{label}</p>
          <p className="text-sm sm:text-base font-bold text-[#000435] tabular-nums leading-tight truncate">{value}</p>
          {sub && <p className="text-[9px] text-slate-500 font-medium truncate">{sub}</p>}
        </div>
      </div>
      {pct != null && (
        <div className="mt-2 h-1 rounded-full bg-slate-100 overflow-hidden">
          <div className={`h-full rounded-full ${bar}`} style={{ width: `${Math.min(100, pct)}%` }} />
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value, mono = false }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`text-sm font-medium text-[#000435] mt-0.5 break-words ${mono ? "font-mono text-xs" : ""}`}>
        {value ?? "—"}
      </p>
    </div>
  );
}

function CopyRef({ text }) {
  const [ok, setOk] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setOk(true);
      setTimeout(() => setOk(false), 1500);
    } catch {
      /* ignore */
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex p-0.5 rounded text-slate-400 hover:text-[#000435]"
      title="Copy"
    >
      {ok ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

function OrderActions({ onView, onEdit }) {
  return (
    <div className="flex items-center gap-0.5 shrink-0">
      <button
        type="button"
        onClick={onView}
        className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
        aria-label="View"
      >
        <Eye className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={onEdit}
        className="p-1.5 rounded-lg text-slate-500 hover:bg-amber-50 hover:text-amber-800"
        aria-label="Edit product status"
      >
        <Pencil className="w-4 h-4" />
      </button>
    </div>
  );
}

function OrderMobileCard({ row, onView, onEdit }) {
  const pay = paymentStatusBadge(row);
  const fulfill = fulfillmentStatusBadge(row);
  const del = deliveryBadge(row.delivery_mode);
  const img = productThumb(row);
  const student = `${row.first_name || ""} ${row.last_name || ""}`.trim();
  const ref = orderRef(row);

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm active:scale-[0.99] transition-transform">
      <div className="flex gap-2.5">
        <div className="h-11 w-11 shrink-0 rounded-lg border border-slate-100 bg-slate-50 overflow-hidden">
          {img ? (
            <img src={img} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full flex items-center justify-center">
              <Package className="w-4 h-4 text-slate-300" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-bold text-[#000435] truncate">{row.product_name || "—"}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-[10px] font-mono text-slate-500 truncate">{ref}</span>
                <CopyRef text={ref} />
              </div>
            </div>
            <OrderActions onView={() => onView(row)} onEdit={() => onEdit(row)} />
          </div>
          <p className="text-sm font-bold text-[#000435] mt-1 tabular-nums">
            {Number(row.amount || 0).toLocaleString()} <span className="text-[10px] font-semibold text-slate-500">RWF</span>
          </p>
        </div>
      </div>

      <div className="mt-2.5 flex flex-wrap gap-1.5">
        <StatusPill badge={pay} title="Payment status" />
        <StatusPill badge={fulfill} title="Product status" />
        <span className={`inline-flex px-1.5 py-0.5 rounded-md border text-[9px] font-bold ${del.className}`}>
          {del.label}
        </span>
      </div>

      <div className="mt-2 pt-2 border-t border-slate-100 grid grid-cols-2 gap-x-2 gap-y-1 text-[10px]">
        <p className="text-slate-500">
          <span className="font-semibold text-slate-600">Buyer:</span> {row.buyer_name || "—"}
        </p>
        <p className="text-slate-500 truncate">
          <span className="font-semibold text-slate-600">Student:</span> {student || "—"}
        </p>
        <p className="text-slate-500 col-span-2">
          <span className="font-semibold text-slate-600">Date:</span> {formatDate(row.created_at)} · Qty {row.quantity ?? 1}
        </p>
      </div>
    </article>
  );
}

function OrderViewModal({ order, onClose, onEditStatus }) {
  if (!order) return null;
  const pay = paymentStatusBadge(order);
  const fulfill = fulfillmentStatusBadge(order);
  const del = deliveryBadge(order.delivery_mode);
  const img = productThumb(order);
  const student = `${order.first_name || ""} ${order.last_name || ""}`.trim();

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <button type="button" className="absolute inset-0 bg-[#000435]/40 backdrop-blur-[2px]" aria-label="Close" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[90dvh] overflow-y-auto safe-area-pb">
        <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-slate-200 px-4 py-3 flex items-center justify-between z-10">
          <h3 className="text-base font-bold text-[#000435]">Order details</h3>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>
        <div className="p-4 space-y-3.5">
          <div className="flex gap-3">
            <div className="h-14 w-14 shrink-0 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
              {img ? <img src={img} alt="" className="h-full w-full object-cover" /> : <Package className="w-6 h-6 m-auto mt-4 text-slate-300" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-[#000435]">{order.product_name || "—"}</p>
              <p className="text-[10px] font-mono text-slate-500 mt-0.5">{orderRef(order)}</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                <div>
                  <p className="text-[8px] uppercase font-bold text-slate-400 mb-0.5">Payment</p>
                  <StatusPill badge={pay} />
                </div>
                <div>
                  <p className="text-[8px] uppercase font-bold text-slate-400 mb-0.5">Product</p>
                  <StatusPill badge={fulfill} />
                </div>
                <div>
                  <p className="text-[8px] uppercase font-bold text-slate-400 mb-0.5">Delivery</p>
                  <StatusPill badge={del} />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <DetailRow label="Date" value={formatDateTime(order.created_at)} />
            <DetailRow label="Amount" value={`${Number(order.amount || 0).toLocaleString()} RWF`} />
            <DetailRow label="Qty" value={order.quantity ?? 1} />
            <DetailRow label="School" value={order.school_name} />
          </div>
          <DetailRow label="Buyer" value={`${order.buyer_name || "—"}${order.buyer_contact ? ` · ${order.buyer_contact}` : ""}`} />
          <DetailRow label="Student" value={`${student || "—"}${order.student_code ? ` (${order.student_code})` : ""}`} />
          {order.delivery_address && <DetailRow label="Address" value={order.delivery_address} />}

          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <button type="button" onClick={() => onEditStatus(order)} className={`${btnAmber} w-full sm:w-auto text-sm py-2`}>
              <Pencil className="w-3.5 h-3.5" />
              Update product status
            </button>
            <button type="button" onClick={onClose} className={`${btnSecondary} w-full sm:w-auto text-sm py-2`}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function OrderStatusModal({ order, onClose, onSaved }) {
  const [status, setStatus] = useState(order?.fulfillment_status || "Pending");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    setStatus(order?.fulfillment_status || "Pending");
    setErr("");
  }, [order]);

  if (!order) return null;
  const pay = paymentStatusBadge(order);

  const save = async () => {
    setSaving(true);
    setErr("");
    try {
      const res = await fetch(`${API}/student-services/agent/shop-orders/${order.id}/status`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fulfillment_status: status }),
      });
      const j = await res.json();
      if (!res.ok || j.success === false) throw new Error(j.message || "Update failed");
      onSaved(j.data || { ...order, fulfillment_status: status });
      onClose();
    } catch (e) {
      setErr(e.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <button type="button" className="absolute inset-0 bg-[#000435]/40 backdrop-blur-[2px]" onClick={onClose} aria-label="Close" />
      <div className="relative w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-xl p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold text-[#000435]">Product status</h3>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-[10px] font-mono text-slate-500 mb-2">{orderRef(order)}</p>
        <div className="mb-3 flex items-center gap-2">
          <span className="text-[10px] font-semibold text-slate-500">Payment:</span>
          <StatusPill badge={pay} />
        </div>
        {err && <div className="mb-2 rounded-lg border border-red-200 bg-red-50 text-red-700 text-xs p-2">{err}</div>}
        <label className={labelClass}>Delivery / product status</label>
        <select className={`${selectClass} text-sm py-2 min-h-[40px] mb-2`} value={status} onChange={(e) => setStatus(e.target.value)}>
          {FULFILLMENT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <p className="text-[10px] text-slate-500 mb-3 leading-relaxed">
          Payment updates automatically when the parent pays via MoMo. You control product delivery status here.
        </p>
        <div className="flex flex-col-reverse sm:flex-row gap-2">
          <button type="button" onClick={onClose} className={`${btnSecondary} sm:flex-none text-sm py-2`}>
            Cancel
          </button>
          <button type="button" onClick={save} disabled={saving} className={`${btnPrimary} flex-1 text-sm py-2`}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

const EMPTY_FILTERS = {
  payment_status: "",
  fulfillment_status: "",
  delivery_mode: "",
  date_from: "",
  date_to: "",
  search: "",
};

export default function AgentShopOrdersPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [page, setPage] = useState(1);
  const [viewOrder, setViewOrder] = useState(null);
  const [statusOrder, setStatusOrder] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState(EMPTY_FILTERS);
  const [f, setF] = useState(EMPTY_FILTERS);

  const load = async (filters = f) => {
    setLoading(true);
    setErr("");
    try {
      const p = new URLSearchParams();
      if (filters.payment_status) p.set("payment_status", filters.payment_status);
      if (filters.fulfillment_status) p.set("fulfillment_status", filters.fulfillment_status);
      if (filters.delivery_mode) p.set("delivery_mode", filters.delivery_mode);
      if (filters.date_from) p.set("date_from", filters.date_from);
      if (filters.date_to) p.set("date_to", filters.date_to);
      if (filters.search) p.set("search", filters.search);
      const url = `${API}/student-services/agent/shop-orders${p.toString() ? `?${p.toString()}` : ""}`;
      const r = await fetch(url, { credentials: "include" });
      const j = await r.json();
      if (!r.ok || j.success === false) throw new Error(j.message || "Failed to load orders");
      setRows(j.data || []);
      setPage(1);
    } catch (e) {
      setErr(e.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const stats = useMemo(() => {
    const total = rows.length;
    const amount = rows.reduce((s, r) => s + Number(r.amount || 0), 0);
    const delivered = rows.filter(isDelivered).length;
    const pending = rows.filter(isPendingOrder).length;
    const paidCount = rows.filter((r) => String(r.payment_status).toLowerCase() === "paid").length;
    return {
      total,
      amount,
      delivered,
      pending,
      paidCount,
      delPct: total ? Math.round((delivered / total) * 100) : 0,
      pendPct: total ? Math.round((pending / total) * 100) : 0,
    };
  }, [rows]);

  const pageSafe = Math.max(1, Math.min(page, Math.ceil(rows.length / PAGE_SIZE) || 1));
  const pageRows = useMemo(() => {
    const start = (pageSafe - 1) * PAGE_SIZE;
    return rows.slice(start, start + PAGE_SIZE);
  }, [rows, pageSafe]);

  const rangeStart = rows.length ? (pageSafe - 1) * PAGE_SIZE + 1 : 0;
  const rangeEnd = Math.min(pageSafe * PAGE_SIZE, rows.length);
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));

  const applyFilters = () => {
    setF({ ...draftFilters });
    load(draftFilters);
    setFiltersOpen(false);
  };

  const onStatusSaved = (updated) => {
    if (!updated?.id) {
      load();
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)));
    setViewOrder((v) => (v?.id === updated.id ? { ...v, ...updated } : v));
  };

  const exportCsv = () => {
    const header = ["Date", "Order ID", "Buyer", "Student", "Product", "Qty", "Amount", "Payment", "Product status", "Delivery"];
    const lines = rows.map((r) => {
      const student = `${r.first_name || ""} ${r.last_name || ""}`.trim();
      return [
        formatDateTime(r.created_at),
        orderRef(r),
        r.buyer_name || "",
        student,
        r.product_name || "",
        r.quantity ?? 1,
        r.amount ?? 0,
        r.payment_status || "",
        r.fulfillment_status || "",
        r.delivery_mode || "",
      ]
        .map((c) => `"${String(c).replace(/"/g, '""')}"`)
        .join(",");
    });
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `shop-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const filterFields = (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-2">
      <select
        className={`${selectClass} text-xs py-2 min-h-[40px]`}
        value={draftFilters.payment_status}
        onChange={(e) => setDraftFilters((p) => ({ ...p, payment_status: e.target.value }))}
      >
        <option value="">Payment: All</option>
        <option value="awaiting_payment">Awaiting payment</option>
        <option value="paid">Paid</option>
        <option value="pending">Pending</option>
        <option value="failed">Failed</option>
      </select>
      <select
        className={`${selectClass} text-xs py-2 min-h-[40px]`}
        value={draftFilters.fulfillment_status}
        onChange={(e) => setDraftFilters((p) => ({ ...p, fulfillment_status: e.target.value }))}
      >
        <option value="">Product: All</option>
        {FULFILLMENT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <select
        className={`${selectClass} text-xs py-2 min-h-[40px]`}
        value={draftFilters.delivery_mode}
        onChange={(e) => setDraftFilters((p) => ({ ...p, delivery_mode: e.target.value }))}
      >
        <option value="">Delivery: All</option>
        <option value="AT_SCHOOL">At school</option>
        <option value="AT_HOME">At home</option>
      </select>
      <input
        type="date"
        className={`${inputClass} text-xs py-2 min-h-[40px]`}
        value={draftFilters.date_from}
        onChange={(e) => setDraftFilters((p) => ({ ...p, date_from: e.target.value }))}
        aria-label="From date"
      />
      <input
        type="date"
        className={`${inputClass} text-xs py-2 min-h-[40px]`}
        value={draftFilters.date_to}
        onChange={(e) => setDraftFilters((p) => ({ ...p, date_to: e.target.value }))}
        aria-label="To date"
      />
      <div className="relative sm:col-span-2 lg:col-span-1">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
        <input
          className={`${inputClass} pl-8 text-xs py-2 min-h-[40px]`}
          placeholder="Search..."
          value={draftFilters.search}
          onChange={(e) => setDraftFilters((p) => ({ ...p, search: e.target.value }))}
          onKeyDown={(e) => e.key === "Enter" && applyFilters()}
        />
      </div>
      <button type="button" onClick={applyFilters} className={`${btnPrimary} text-xs py-2 min-h-[40px] sm:col-span-2 lg:col-span-1`}>
        <Filter className="w-3.5 h-3.5" />
        Apply
      </button>
    </div>
  );

  return (
    <div className={`${pageShell} bg-white pb-6`} style={{ fontFamily: BABYEYI_FONT_STACK }}>
      <AgentPageHeader title="Shop orders" description="Track payments and product delivery for your shop.">
        <button
          type="button"
          onClick={exportCsv}
          disabled={!rows.length}
          className={`${btnSecondary} text-xs py-2 min-h-[40px] px-3`}
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Export</span>
        </button>
      </AgentPageHeader>

      {/* Compact stats — 2×2 on mobile, 4 cols on md+ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <CompactStat icon={ShoppingBag} label="Orders" value={stats.total} sub="Filtered" accent="amber" />
        <CompactStat
          icon={Wallet}
          label="Amount"
          value={stats.amount >= 1000 ? `${Math.round(stats.amount / 1000)}k` : stats.amount}
          sub={`${stats.amount.toLocaleString()} RWF`}
          accent="emerald"
        />
        <CompactStat
          icon={PackageCheck}
          label="Delivered"
          value={stats.delivered}
          sub={`${stats.delPct}%`}
          accent="sky"
          pct={stats.delPct}
        />
        <CompactStat
          icon={Clock}
          label="Ongoing"
          value={stats.pending}
          sub={`${stats.paidCount} paid`}
          accent="violet"
          pct={stats.pendPct}
        />
      </div>

      {/* Filters — collapsible on mobile */}
      <div className={`${pageCard} overflow-hidden`}>
        <button
          type="button"
          className="w-full flex items-center justify-between gap-2 px-3 py-2.5 md:hidden text-left"
          onClick={() => setFiltersOpen((o) => !o)}
        >
          <span className="text-xs font-bold text-[#000435] flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-amber-600" />
            Filters
          </span>
          <span className="text-[10px] text-slate-500 font-medium">{filtersOpen ? "Hide" : "Show"}</span>
        </button>
        <div className={`p-3 ${filtersOpen ? "block" : "hidden"} md:block border-t md:border-t-0 border-slate-100`}>
          {filterFields}
        </div>
      </div>

      {err && (
        <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 text-xs font-medium px-3 py-2">{err}</div>
      )}

      {loading ? (
        <div className="py-16 flex justify-center">
          <Loader2 className="w-7 h-7 animate-spin" style={{ color: ACCENT_SLATE }} />
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {pageRows.map((r) => (
              <OrderMobileCard
                key={r.id}
                row={r}
                onView={setViewOrder}
                onEdit={setStatusOrder}
              />
            ))}
            {!rows.length && (
              <p className="text-center py-10 text-slate-500 text-sm">No orders match your filters.</p>
            )}
          </div>

          {/* Desktop table */}
          <div className={`${tableShell} hidden md:block`}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[960px]">
                <thead>
                  <tr className={tableHeadRow}>
                    <th className={tableHeadCell}>Date</th>
                    <th className={tableHeadCell}>Order ID</th>
                    <th className={tableHeadCell}>Buyer</th>
                    <th className={tableHeadCell}>Student</th>
                    <th className={tableHeadCell}>Product</th>
                    <th className={`${tableHeadCell} text-center`}>Qty</th>
                    <th className={`${tableHeadCell} text-right`}>Amount</th>
                    <th className={tableHeadCell}>Payment</th>
                    <th className={tableHeadCell}>Product</th>
                    <th className={tableHeadCell}>Delivery</th>
                    <th className={`${tableHeadCell} text-right`}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((r) => {
                    const pay = paymentStatusBadge(r);
                    const fulfill = fulfillmentStatusBadge(r);
                    const del = deliveryBadge(r.delivery_mode);
                    const img = productThumb(r);
                    const student = `${r.first_name || ""} ${r.last_name || ""}`.trim();
                    const ref = orderRef(r);
                    return (
                      <tr key={r.id} className={tableBodyRow}>
                        <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap text-xs">{formatDate(r.created_at)}</td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-0.5 max-w-[120px]">
                            <span className="font-mono text-[10px] font-semibold text-[#000435] truncate">{ref}</span>
                            <CopyRef text={ref} />
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="text-xs font-semibold text-[#000435]">{r.buyer_name || "—"}</div>
                          <div className="text-[10px] text-slate-500">{r.buyer_contact || ""}</div>
                        </td>
                        <td className="py-2.5 px-3 text-xs">
                          <div className="font-medium">{student || "—"}</div>
                          {r.student_code && <div className="text-[10px] text-slate-500">{r.student_code}</div>}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2 min-w-[140px]">
                            <div className="h-8 w-8 shrink-0 rounded-md border border-slate-200 bg-slate-50 overflow-hidden">
                              {img ? (
                                <img src={img} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <Package className="w-3.5 h-3.5 m-auto mt-2 text-slate-300" />
                              )}
                            </div>
                            <span className="text-xs font-medium text-[#000435] truncate">{r.product_name || "—"}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center text-xs font-semibold tabular-nums">{r.quantity ?? 1}</td>
                        <td className="py-2.5 px-3 text-right text-xs font-bold text-[#000435] tabular-nums whitespace-nowrap">
                          {Number(r.amount || 0).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3">
                          <StatusPill badge={pay} title="Payment" />
                        </td>
                        <td className="py-2.5 px-3">
                          <StatusPill badge={fulfill} title="Product status" />
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`inline-flex px-1.5 py-0.5 rounded-md border text-[9px] font-bold ${del.className}`}>
                            {del.short}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex justify-end">
                            <OrderActions onView={() => setViewOrder(r)} onEdit={() => setStatusOrder(r)} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {!rows.length && (
              <p className="text-center py-12 text-slate-500 text-sm">No orders match your filters.</p>
            )}
          </div>

          {rows.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-1 sm:px-0 py-2">
              <p className="text-[10px] sm:text-xs text-slate-600 font-medium order-2 sm:order-1">
                {rangeStart}–{rangeEnd} of {rows.length}
              </p>
              <div className="flex items-center gap-1 order-1 sm:order-2 w-full sm:w-auto justify-center">
                <button
                  type="button"
                  disabled={pageSafe <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let n;
                  if (totalPages <= 5) n = i + 1;
                  else if (pageSafe <= 3) n = i + 1;
                  else if (pageSafe >= totalPages - 2) n = totalPages - 4 + i;
                  else n = pageSafe - 2 + i;
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setPage(n)}
                      className={`min-w-[32px] h-8 rounded-lg text-[11px] font-bold ${
                        n === pageSafe ? "bg-amber-400 text-[#000435]" : "border border-slate-200 bg-white text-slate-700"
                      }`}
                    >
                      {n}
                    </button>
                  );
                })}
                <button
                  type="button"
                  disabled={pageSafe >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white disabled:opacity-40"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {viewOrder && (
        <OrderViewModal
          order={viewOrder}
          onClose={() => setViewOrder(null)}
          onEditStatus={(o) => {
            setViewOrder(null);
            setStatusOrder(o);
          }}
        />
      )}
      {statusOrder && (
        <OrderStatusModal order={statusOrder} onClose={() => setStatusOrder(null)} onSaved={onStatusSaved} />
      )}
    </div>
  );
}
