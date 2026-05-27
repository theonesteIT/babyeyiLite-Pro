import { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Package,
  Search,
  Filter,
  X,
  Save,
  ImagePlus,
  ChevronLeft,
  ChevronRight,
  Eye,
} from "lucide-react";
import {
  pageShell,
  tableShell,
  tableHeadRow,
  tableHeadCell,
  tableBodyRow,
  inputClass,
  selectClass,
  btnSecondary,
  btnAmber,
  labelClass,
  ACCENT_SLATE,
} from "./agentTheme";
import AgentPageHeader from "./AgentPageHeader";
import { BABYEYI_FONT_STACK } from "../../theme/babyeyiDashboardTheme";

const API = `${import.meta.env.VITE_API_URL || "http://localhost:5100"}/api`;
const API_ORIGIN = (import.meta.env.VITE_API_URL || "http://localhost:5100").replace(/\/$/, "");
const PAGE_SIZE = 5;
const LOW_STOCK_AT = 40;

const CATEGORY_OPTIONS = ["Agent Shop", "Stationery", "Sports", "Accessories", "Other"];
const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "draft", label: "Draft" },
];

const MAX_IMAGES = 12;

const blank = {
  service_code: "",
  name: "",
  description: "",
  short_tagline: "",
  amount: "",
  stock_quantity: "",
  category: "Agent Shop",
  status: "active",
  product_type: "",
  product_color: "",
  existingGallery: [],
  newFiles: [],
};

function getProductGallery(row) {
  const g = row?.gallery_images;
  if (Array.isArray(g) && g.length) return g;
  if (row?.icon_url) return [row.icon_url];
  return [];
}

function primaryImageUrl(row) {
  const g = getProductGallery(row);
  return g[0] ? toImage(g[0]) : "";
}

function toImage(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_ORIGIN}${url.startsWith("/") ? "" : "/"}${url}`;
}

function formatDate(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "—";
  }
}

function stockStatus(row) {
  const st = String(row.status || "").toLowerCase();
  if (st === "inactive" || st === "archived") {
    return { label: "Inactive", className: "bg-slate-100 text-slate-600 border-slate-200", dot: "bg-slate-400" };
  }
  const stock = row.stock_quantity;
  if (stock != null && Number(stock) <= LOW_STOCK_AT) {
    return { label: "Low Stock", className: "bg-amber-50 text-amber-800 border-amber-200", dot: "bg-amber-500" };
  }
  return { label: "Active", className: "bg-emerald-50 text-emerald-800 border-emerald-200", dot: "bg-emerald-500" };
}

function Field({ label, children, className = "" }) {
  return (
    <div className={className}>
      <label className={labelClass}>{label}</label>
      {children}
    </div>
  );
}

function DetailRow({ label, value, mono = false, className = "" }) {
  return (
    <div className={className}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`text-sm font-medium text-[#000435] mt-1 break-words ${mono ? "font-mono text-xs" : ""}`}>
        {value ?? "—"}
      </p>
    </div>
  );
}

function ImageGalleryGrid({ urls, size = "md" }) {
  if (!urls.length) return null;
  const box = size === "lg" ? "h-24 w-24" : "h-16 w-16";
  return (
    <div className="flex flex-wrap gap-2">
      {urls.map((src, i) => (
        <div key={`${src}-${i}`} className={`${box} rounded-lg border border-slate-200 bg-slate-50 overflow-hidden shrink-0`}>
          <img src={src} alt="" className="h-full w-full object-cover" />
        </div>
      ))}
    </div>
  );
}

function ProductViewModal({ product, onClose, onEdit }) {
  if (!product) return null;
  const badge = stockStatus(product);
  const galleryUrls = getProductGallery(product).map(toImage);
  const img = galleryUrls[0];

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#000435]/40 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-view-title"
    >
      <div className="w-full sm:max-w-2xl max-h-[94vh] sm:max-h-[90vh] flex flex-col bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="shrink-0 flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-200">
          <h3 id="product-view-title" className="text-lg font-bold text-[#000435]">
            Product details
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 inline-flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-5">
          <div className="flex flex-col sm:flex-row gap-5">
            <div className="shrink-0 mx-auto sm:mx-0">
              <div className="h-32 w-32 rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center shadow-sm">
                {img ? (
                  <img src={img} alt={product.name} className="h-full w-full object-cover" />
                ) : (
                  <Package className="w-12 h-12 text-slate-300" />
                )}
              </div>
            </div>
            <div className="flex-1 min-w-0 space-y-3">
              <div>
                <h4 className="text-xl font-bold text-[#000435] leading-tight">{product.name}</h4>
                <p className="text-sm text-slate-600 mt-1 font-mono">{product.service_code}</p>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${badge.className}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
                {badge.label}
              </span>
              <p className="text-2xl font-bold text-amber-600 tabular-nums">
                {Number(product.price_from || 0).toLocaleString()}{" "}
                <span className="text-sm font-semibold text-slate-500">RWF</span>
              </p>
            </div>
          </div>

          {product.short_tagline && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3">
              <p className="text-sm text-slate-700">{product.short_tagline}</p>
            </div>
          )}

          {product.description && (
            <DetailRow label="Full description" value={product.description} />
          )}

          {galleryUrls.length > 1 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">All images</p>
              <ImageGalleryGrid urls={galleryUrls} size="lg" />
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-1 border-t border-slate-100">
            <DetailRow label="Category" value={product.category || "Agent Shop"} />
            <DetailRow label="Product type" value={product.product_type || "—"} />
            <DetailRow label="Color" value={product.product_color || "—"} />
            <DetailRow
              label="Stock"
              value={product.stock_quantity != null ? String(product.stock_quantity) : "Not tracked"}
            />
            <DetailRow label="Catalog status" value={product.status || "—"} />
            <DetailRow label="Date added" value={formatDate(product.created_at)} />
            <DetailRow label="Last updated" value={formatDate(product.updated_at)} />
            <DetailRow label="Academic year" value={product.academic_year} />
            <DetailRow label="Product ID" value={`#${product.id}`} mono />
            <DetailRow label="Pricing type" value={product.default_pricing_type || "global"} />
          </div>
        </div>

        <div className="shrink-0 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 px-4 sm:px-6 py-4 border-t border-slate-200 bg-slate-50/50">
          <button type="button" onClick={onClose} className={btnSecondary}>
            Close
          </button>
          <button type="button" onClick={() => onEdit(product)} className={btnAmber}>
            <Pencil className="w-4 h-4" />
            Edit product
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AgentShopProductsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [page, setPage] = useState(1);

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const r = await fetch(`${API}/student-services/agent/shop-products`, { credentials: "include" });
      const j = await r.json();
      if (!r.ok || j.success === false) throw new Error(j.message || "Failed to load products");
      setRows(j.data || []);
    } catch (e) {
      setErr(e.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!open && !viewing) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, viewing]);

  useEffect(() => {
    setPage(1);
  }, [search, categoryFilter]);

  const categories = useMemo(() => {
    const fromRows = rows.map((r) => r.category).filter(Boolean);
    return [...new Set([...CATEGORY_OPTIONS, ...fromRows])].sort();
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (categoryFilter && r.category !== categoryFilter) return false;
      if (!q) return true;
      const hay = [r.name, r.service_code, r.short_tagline, r.description, r.category].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [rows, search, categoryFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const pageRows = filtered.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...blank, existingGallery: [], newFiles: [] });
    setErr("");
    setOpen(true);
  };

  const openView = (r) => {
    setViewing(r);
  };

  const openEdit = (r) => {
    setViewing(null);
    setEditing(r);
    setForm({
      service_code: r.service_code || "",
      name: r.name || "",
      description: r.description || "",
      short_tagline: r.short_tagline || "",
      amount: r.price_from != null ? String(r.price_from) : "",
      stock_quantity: r.stock_quantity != null ? String(r.stock_quantity) : "",
      category: r.category || "Agent Shop",
      status: r.status || "active",
      product_type: r.product_type || "",
      product_color: r.product_color || "",
      existingGallery: getProductGallery(r),
      newFiles: [],
    });
    setErr("");
    setOpen(true);
  };

  const imagePreviews = useMemo(() => {
    const existing = form.existingGallery.map((url, i) => ({
      key: `ex-${i}`,
      kind: "existing",
      preview: toImage(url),
      raw: url,
    }));
    const added = form.newFiles.map((file, i) => ({
      key: `new-${i}-${file.name}`,
      kind: "new",
      preview: URL.createObjectURL(file),
      file,
    }));
    return [...existing, ...added];
  }, [form.existingGallery, form.newFiles]);

  const onPickImages = (fileList) => {
    if (!fileList?.length) return;
    const room = MAX_IMAGES - form.existingGallery.length - form.newFiles.length;
    if (room <= 0) {
      setErr(`Maximum ${MAX_IMAGES} images per product.`);
      return;
    }
    const picked = Array.from(fileList).slice(0, room);
    setForm((p) => ({ ...p, newFiles: [...p.newFiles, ...picked] }));
    setErr("");
  };

  const removePreview = (item) => {
    if (item.kind === "existing") {
      setForm((p) => ({
        ...p,
        existingGallery: p.existingGallery.filter((u) => u !== item.raw),
      }));
    } else {
      setForm((p) => ({
        ...p,
        newFiles: p.newFiles.filter((f) => f !== item.file),
      }));
    }
  };

  const submit = async () => {
    if (!form.service_code?.trim() || !form.name?.trim()) {
      setErr("Service code and name are required.");
      return;
    }
    const priceNum = Number(form.amount);
    if (form.amount === "" || Number.isNaN(priceNum) || priceNum < 0) {
      setErr("Price (RWF) is required.");
      return;
    }
    setSaving(true);
    setErr("");
    try {
      const fd = new FormData();
      fd.append("service_code", form.service_code.trim());
      fd.append("name", form.name.trim());
      fd.append("description", form.description || "");
      fd.append("short_tagline", form.short_tagline || "");
      fd.append("category", form.category || "Agent Shop");
      fd.append("product_type", form.product_type.trim());
      fd.append("product_color", form.product_color.trim());
      fd.append("amount", String(priceNum));
      fd.append("global_amount", String(priceNum));
      fd.append("stock_quantity", String(form.stock_quantity ?? ""));
      fd.append("status", form.status || "active");
      fd.append("academic_year", `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`);
      fd.append("existing_gallery", JSON.stringify(form.existingGallery));
      form.newFiles.forEach((f) => fd.append("images", f));

      const url = editing
        ? `${API}/student-services/agent/shop-products/${editing.id}`
        : `${API}/student-services/agent/shop-products`;
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, { method, credentials: "include", body: fd });
      const json = await res.json();
      if (!res.ok || json.success === false) throw new Error(json.message || "Save failed");
      setOpen(false);
      load();
    } catch (e) {
      setErr(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (r) => {
    if (!window.confirm(`Delete "${r.name}"? It will be removed from your shop catalog.`)) return;
    try {
      const res = await fetch(`${API}/student-services/agent/shop-products/${r.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok || json.success === false) throw new Error(json.message || "Delete failed");
      load();
    } catch (e) {
      setErr(e.message || "Delete failed");
    }
  };

  const rangeStart = filtered.length ? (pageSafe - 1) * PAGE_SIZE + 1 : 0;
  const rangeEnd = Math.min(pageSafe * PAGE_SIZE, filtered.length);

  return (
    <div className={`${pageShell} bg-white`} style={{ fontFamily: BABYEYI_FONT_STACK }}>
      <AgentPageHeader title="Agent shop products" description="Create and manage products you sell in your area.">
        <button type="button" onClick={openCreate} className={btnAmber}>
          <Plus className="w-4 h-4" strokeWidth={2.5} />
          Add product
        </button>
      </AgentPageHeader>

      {err && !open && (
        <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm font-medium p-3">{err}</div>
      )}

      <div className={tableShell}>
        <div className="p-3 sm:p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between bg-white">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="search"
              className={`${inputClass} pl-10 py-2 min-h-[42px]`}
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search products"
            />
          </div>
          <div className="relative w-full sm:w-52">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <select
              className={`${selectClass} pl-10 py-2 min-h-[42px] appearance-none`}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              aria-label="Filter by category"
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="py-20 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: ACCENT_SLATE }} />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[940px]">
                <thead>
                  <tr className={tableHeadRow}>
                    <th className={tableHeadCell}>Product</th>
                    <th className={tableHeadCell}>Service code</th>
                    <th className={`${tableHeadCell} text-right`}>Price (RWF)</th>
                    <th className={`${tableHeadCell} text-center`}>Stock</th>
                    <th className={tableHeadCell}>Status</th>
                    <th className={tableHeadCell}>Date added</th>
                    <th className={`${tableHeadCell} text-right`}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((r) => {
                    const badge = stockStatus(r);
                    const img = primaryImageUrl(r);
                    return (
                      <tr key={r.id} className={tableBodyRow}>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3 min-w-[200px]">
                            <div className="h-11 w-11 shrink-0 rounded-lg border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center">
                              {img ? (
                                <img src={img} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <Package className="w-5 h-5 text-slate-300" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <button
                                type="button"
                                onClick={() => openView(r)}
                                className="font-semibold text-[#000435] truncate text-left hover:text-amber-700 transition-colors max-w-full"
                              >
                                {r.name}
                              </button>
                              <p className="text-xs text-slate-500 truncate mt-0.5">
                                {r.short_tagline || r.description || "—"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-slate-600">{r.service_code}</td>
                        <td className="py-3 px-4 text-right font-bold text-amber-600 tabular-nums">
                          {Number(r.price_from || 0).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-center font-semibold text-slate-700 tabular-nums">
                          {r.stock_quantity != null ? r.stock_quantity : "—"}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${badge.className}`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
                            {badge.label}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 text-xs whitespace-nowrap">
                          {formatDate(r.created_at)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => openView(r)}
                              className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-amber-50 hover:text-amber-800 hover:border-amber-200 transition-colors"
                              aria-label={`View ${r.name}`}
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => openEdit(r)}
                              className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-[#000435] transition-colors"
                              aria-label={`Edit ${r.name}`}
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => remove(r)}
                              className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-red-100 bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                              aria-label={`Delete ${r.name}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {!pageRows.length && (
              <p className="text-center py-14 text-slate-500 text-sm font-medium">No products match your filters.</p>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-200 bg-slate-50/50 text-xs text-slate-600">
              <p>
                Showing <span className="font-semibold text-[#000435]">{rangeStart}</span> to{" "}
                <span className="font-semibold text-[#000435]">{rangeEnd}</span> of{" "}
                <span className="font-semibold text-[#000435]">{filtered.length}</span> products
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={pageSafe <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white disabled:opacity-40 hover:bg-slate-50"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((n) => n === 1 || n === totalPages || Math.abs(n - pageSafe) <= 1)
                  .map((n, idx, arr) => {
                    const prev = arr[idx - 1];
                    const showEllipsis = prev != null && n - prev > 1;
                    return (
                      <span key={n} className="flex items-center gap-1">
                        {showEllipsis && <span className="px-1 text-slate-400">…</span>}
                        <button
                          type="button"
                          onClick={() => setPage(n)}
                          className={`min-w-[32px] h-8 px-2 rounded-lg text-xs font-bold transition-colors ${
                            n === pageSafe
                              ? "bg-amber-400 text-[#000435]"
                              : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          {n}
                        </button>
                      </span>
                    );
                  })}
                <button
                  type="button"
                  disabled={pageSafe >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white disabled:opacity-40 hover:bg-slate-50"
                  aria-label="Next page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {viewing && (
        <ProductViewModal
          product={viewing}
          onClose={() => setViewing(null)}
          onEdit={(p) => openEdit(p)}
        />
      )}

      {open && (
        <div
          className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#000435]/40 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="product-modal-title"
        >
          <div className="w-full sm:max-w-3xl max-h-[94vh] sm:max-h-[90vh] flex flex-col bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="shrink-0 flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-200">
              <h3 id="product-modal-title" className="text-lg font-bold text-[#000435]">
                {editing ? "Edit product" : "Add product"}
              </h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="h-9 w-9 inline-flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
              {err && (
                <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm font-medium p-3">{err}</div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <Field label="Service code">
                    <input
                      className={inputClass}
                      placeholder="e.g. SOCKS-0001"
                      value={form.service_code}
                      onChange={(e) => setForm((p) => ({ ...p, service_code: e.target.value }))}
                      disabled={!!editing}
                    />
                  </Field>
                  <Field label="Name">
                    <input
                      className={inputClass}
                      placeholder="e.g. Students White Sports Socks"
                      value={form.name}
                      onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    />
                  </Field>
                  <Field label="Short description">
                    <input
                      className={inputClass}
                      placeholder="e.g. This is student sports socks"
                      value={form.short_tagline}
                      onChange={(e) => setForm((p) => ({ ...p, short_tagline: e.target.value }))}
                    />
                  </Field>
                  <Field label="Description">
                    <textarea
                      className={`${inputClass} min-h-[100px] resize-y`}
                      placeholder="Enter product full description..."
                      value={form.description}
                      onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                    />
                  </Field>
                  <Field label="Product images (optional)">
                    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/80 p-4 space-y-3">
                      {imagePreviews.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {imagePreviews.map((item) => (
                            <div key={item.key} className="relative h-16 w-16 rounded-lg border border-slate-200 overflow-hidden bg-white">
                              <img src={item.preview} alt="" className="h-full w-full object-cover" />
                              <button
                                type="button"
                                onClick={() => removePreview(item)}
                                className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full bg-[#000435]/80 text-white flex items-center justify-center"
                                aria-label="Remove image"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-[#000435] hover:bg-slate-50">
                        <ImagePlus className="w-4 h-4" />
                        Add images
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          multiple
                          className="sr-only"
                          onChange={(e) => {
                            onPickImages(e.target.files);
                            e.target.value = "";
                          }}
                        />
                      </label>
                      <p className="text-[10px] text-slate-500">
                        Up to {MAX_IMAGES} images · PNG, JPG, WEBP · max 3MB each. First image is the cover.
                      </p>
                    </div>
                  </Field>
                </div>

                <div className="space-y-4">
                  <Field label="Price (RWF)">
                    <input
                      type="number"
                      min="0"
                      className={inputClass}
                      placeholder="e.g. 500"
                      value={form.amount}
                      onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                    />
                  </Field>
                  <Field label="Stock">
                    <input
                      type="number"
                      min="0"
                      className={inputClass}
                      placeholder="e.g. 120"
                      value={form.stock_quantity}
                      onChange={(e) => setForm((p) => ({ ...p, stock_quantity: e.target.value }))}
                    />
                  </Field>
                  <Field label="Category">
                    <select
                      className={selectClass}
                      value={form.category}
                      onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                    >
                      {categories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Product type (optional)">
                    <input
                      className={inputClass}
                      placeholder="e.g. Stationery, Sports, Accessories"
                      value={form.product_type}
                      onChange={(e) => setForm((p) => ({ ...p, product_type: e.target.value }))}
                    />
                  </Field>
                  <Field label="Product color (optional)">
                    <input
                      className={inputClass}
                      placeholder="e.g. White, Navy, Red"
                      value={form.product_color}
                      onChange={(e) => setForm((p) => ({ ...p, product_color: e.target.value }))}
                    />
                  </Field>
                  <Field label="Status">
                    <select
                      className={selectClass}
                      value={form.status}
                      onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                    >
                      {STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <p className="mt-2 text-[10px] text-slate-500 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      Active products appear in your public shop
                    </p>
                  </Field>
                </div>
              </div>
            </div>

            <div className="shrink-0 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 px-4 sm:px-6 py-4 border-t border-slate-200 bg-slate-50/50">
              <button type="button" onClick={() => setOpen(false)} className={btnSecondary}>
                Cancel
              </button>
              <button type="button" disabled={saving} onClick={submit} className={btnAmber}>
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {saving ? "Saving…" : "Save product"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
