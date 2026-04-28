import { useEffect, useState } from "react";
import { Loader2, Plus, Pencil, Trash2, Package } from "lucide-react";
import { cardBorder, inputClass } from "./agentTheme";

const API = `${import.meta.env.VITE_API_URL || "http://localhost:5100"}/api`;

const blank = { service_code: "", name: "", description: "", short_tagline: "", amount: "", stock_quantity: "", status: "active", iconFile: null };

export default function AgentShopProductsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

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
  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm(blank); setOpen(true); };
  const openEdit = (r) => { setEditing(r); setForm({ ...blank, ...r, amount: "", iconFile: null }); setOpen(true); };

  const submit = async () => {
    if (!form.service_code || !form.name) return setErr("Code and name are required.");
    setSaving(true);
    setErr("");
    try {
      const fd = new FormData();
      fd.append("service_code", form.service_code);
      fd.append("name", form.name);
      fd.append("description", form.description || "");
      fd.append("short_tagline", form.short_tagline || "");
      fd.append("amount", String(form.amount || 0));
      fd.append("global_amount", String(form.amount || 0));
      fd.append("stock_quantity", String(form.stock_quantity || ""));
      fd.append("status", form.status || "active");
      fd.append("academic_year", `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`);
      if (form.iconFile) fd.append("icon", form.iconFile);
      const url = editing ? `${API}/student-services/agent/shop-products/${editing.id}` : `${API}/student-services/agent/shop-products`;
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
      const res = await fetch(`${API}/student-services/agent/shop-products/${r.id}`, { method: "DELETE", credentials: "include" });
      const json = await res.json();
      if (!res.ok || json.success === false) throw new Error(json.message || "Delete failed");
      load();
    } catch (e) {
      setErr(e.message || "Delete failed");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-[#111827]">Agent shop products</h2>
          <p className="text-sm text-amber-900/80 font-medium">Create and manage products you sell in your area.</p>
        </div>
        <button onClick={openCreate} className="inline-flex items-center gap-2 rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-2.5 font-bold text-amber-900">
          <Plus className="w-4 h-4" /> Add product
        </button>
      </div>
      {err && <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm p-3">{err}</div>}
      {loading ? (
        <div className="py-16 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-amber-700" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {rows.map((r) => (
            <article key={r.id} className={`rounded-2xl ${cardBorder} bg-white p-4`}>
              <div className="flex justify-between gap-2">
                <div>
                  <p className="font-black text-[#111827]">{r.name}</p>
                  <p className="text-xs text-amber-700 font-mono">{r.service_code}</p>
                </div>
                <Package className="w-5 h-5 text-amber-500" />
              </div>
              <p className="text-sm text-gray-600 mt-2">{r.short_tagline || r.description || "—"}</p>
              <div className="mt-3 flex items-center justify-between">
                <strong className="text-amber-700">{Number(r.price_from || 0).toLocaleString()} RWF</strong>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(r)} className="p-2 rounded-lg border border-amber-200 bg-amber-50"><Pencil className="w-4 h-4 text-amber-800" /></button>
                  <button type="button" title="Delete product" onClick={() => remove(r)} className="inline-flex items-center gap-1 px-2 py-2 rounded-lg border border-red-200 bg-red-50 text-xs font-bold text-red-700"><Trash2 className="w-4 h-4" /> Delete</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-[120] bg-black/45 p-4 flex items-end sm:items-center justify-center">
          <div className={`w-full max-w-xl rounded-2xl ${cardBorder} bg-white p-4 space-y-3`}>
            <h3 className="font-black text-[#111827]">{editing ? "Edit product" : "Add product"}</h3>
            <input className={inputClass} placeholder="Service code" value={form.service_code} onChange={(e) => setForm((p) => ({ ...p, service_code: e.target.value }))} />
            <input className={inputClass} placeholder="Name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            <input className={inputClass} placeholder="Short description" value={form.short_tagline} onChange={(e) => setForm((p) => ({ ...p, short_tagline: e.target.value }))} />
            <textarea className={inputClass} placeholder="Description" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
            <div className="grid grid-cols-2 gap-2">
              <input type="number" className={inputClass} placeholder="Price (RWF)" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} />
              <input type="number" className={inputClass} placeholder="Stock" value={form.stock_quantity} onChange={(e) => setForm((p) => ({ ...p, stock_quantity: e.target.value }))} />
            </div>
            <input type="file" accept="image/*" onChange={(e) => setForm((p) => ({ ...p, iconFile: e.target.files?.[0] || null }))} />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setOpen(false)} className="px-4 py-2 rounded-lg border-2 border-amber-200 font-bold text-amber-900">Cancel</button>
              <button disabled={saving} onClick={submit} className="px-4 py-2 rounded-lg bg-[#1F2937] text-amber-300 font-black">
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
