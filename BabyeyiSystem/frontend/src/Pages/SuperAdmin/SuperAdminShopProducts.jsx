import { useEffect, useState } from "react";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";

const API = `${import.meta.env.VITE_API_URL || "http://localhost:5100"}/api`;
const blank = { service_code: "", name: "", description: "", short_tagline: "", amount: "", stock_quantity: "", status: "active", iconFile: null };

export default function SuperAdminShopProducts() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/student-services/admin/shop-products`, { credentials: "include" });
      const json = await res.json();
      if (!res.ok || json.success === false) throw new Error(json.message || "Failed to load products");
      setRows(json.data || []);
    } catch (e) {
      setErr(e.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm(blank); setOpen(true); };
  const openEdit = (r) => { setEditing(r); setForm({ ...blank, ...r, amount: String(r.price_from || 0), iconFile: null }); setOpen(true); };

  const submit = async () => {
    if (!form.service_code || !form.name) return setErr("Code and name are required.");
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("service_code", form.service_code);
      fd.append("name", form.name);
      fd.append("category", "Agent Shop");
      fd.append("description", form.description || "");
      fd.append("short_tagline", form.short_tagline || "");
      fd.append("academic_year", `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`);
      fd.append("eligibility_levels", JSON.stringify([]));
      fd.append("default_pricing_type", "global");
      fd.append("status", form.status || "active");
      fd.append("stock_quantity", String(form.stock_quantity || ""));
      fd.append("prices", JSON.stringify([{ pricing_type: "global", amount: Number(form.amount || 0), academic_year: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}` }]));
      if (form.iconFile) fd.append("icon", form.iconFile);
      const url = editing ? `${API}/student-services/admin/services/${editing.id}` : `${API}/student-services/admin/services`;
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

  const removeProduct = async (id, name) => {
    if (!window.confirm(`Delete “${name || "this product"}”? It will be removed from the shop catalog.`)) return;
    const res = await fetch(`${API}/student-services/admin/services/${id}`, { method: "DELETE", credentials: "include" });
    const json = await res.json();
    if (!res.ok || json.success === false) return setErr(json.message || "Delete failed");
    load();
  };

  const rowsShop = rows.filter((r) => r.is_shop_product === 1 || r.category === "Agent Shop");

  return (
    <div className="min-h-screen bg-amber-50/50 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-[#111827]">Super Admin Shop Products</h1>
            <p className="text-sm text-amber-900/80">Global + agent products management (full CRUD).</p>
          </div>
          <button onClick={openCreate} className="inline-flex items-center gap-2 rounded-xl border-2 border-amber-300 bg-white px-4 py-2 font-bold text-amber-900">
            <Plus className="w-4 h-4" /> Add Product
          </button>
        </div>
        {err && <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm p-3">{err}</div>}
        {loading ? (
          <div className="py-16 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-amber-700" /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {rowsShop.map((r) => (
              <article key={r.id} className="rounded-2xl border-2 border-amber-100 bg-white p-4">
                <div className="flex justify-between">
                  <div>
                    <p className="font-black text-[#111827]">{r.name}</p>
                    <p className="text-xs text-amber-700 font-mono">{r.service_code}</p>
                  </div>
                  <div className="text-xs text-amber-800">{r.created_by_role || "SUPER_ADMIN"}</div>
                </div>
                <p className="text-sm text-gray-600 mt-2">{r.short_tagline || r.description || "—"}</p>
                <div className="mt-3 flex justify-between items-center">
                  <strong className="text-amber-700">{Number(r.price_from || 0).toLocaleString()} RWF</strong>
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(r)} className="p-2 rounded-lg border border-amber-200 bg-amber-50"><Pencil className="w-4 h-4 text-amber-800" /></button>
                    <button type="button" title="Delete product" onClick={() => removeProduct(r.id, r.name)} className="inline-flex items-center gap-1.5 px-2 py-2 rounded-lg border border-red-200 bg-red-50 text-xs font-bold text-red-700"><Trash2 className="w-4 h-4" /> Delete</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
      {open && (
        <div className="fixed inset-0 z-[120] bg-black/45 p-4 flex items-end sm:items-center justify-center">
          <div className="w-full max-w-xl rounded-2xl border-2 border-amber-100 bg-white p-4 space-y-3">
            <h3 className="font-black text-[#111827]">{editing ? "Edit product" : "Add product"}</h3>
            <input className={inp} placeholder="Service code" value={form.service_code} onChange={(e) => setForm((p) => ({ ...p, service_code: e.target.value }))} />
            <input className={inp} placeholder="Name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            <input className={inp} placeholder="Short description" value={form.short_tagline} onChange={(e) => setForm((p) => ({ ...p, short_tagline: e.target.value }))} />
            <textarea className={inp} placeholder="Description" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
            <div className="grid grid-cols-2 gap-2">
              <input type="number" className={inp} placeholder="Price (RWF)" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} />
              <input type="number" className={inp} placeholder="Stock" value={form.stock_quantity} onChange={(e) => setForm((p) => ({ ...p, stock_quantity: e.target.value }))} />
            </div>
            <input type="file" accept="image/*" onChange={(e) => setForm((p) => ({ ...p, iconFile: e.target.files?.[0] || null }))} />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setOpen(false)} className="px-4 py-2 rounded-lg border-2 border-amber-200 font-bold text-amber-900">Cancel</button>
              <button disabled={saving} onClick={submit} className="px-4 py-2 rounded-lg bg-[#1F2937] text-amber-300 font-black">{saving ? "Saving..." : "Save"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inp =
  "w-full bg-amber-50/80 border-2 border-amber-200 text-gray-900 rounded-xl px-4 py-3 text-sm font-medium " +
  "focus:outline-none focus:border-[#FEBF10] focus:ring-2 focus:ring-amber-100 placeholder-amber-400/70 transition-all min-h-[44px]";
