import { useEffect, useState } from "react";
import { Boxes, Loader2, RefreshCw } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import LogoutButton from "../Auth/LogoutButton";

const API = import.meta.env.VITE_API_URL || "http://localhost:5100";

const emptyItem = {
  item_name: "",
  sku: "",
  category: "",
  unit: "pcs",
  reorder_level: 0,
  opening_qty: 0,
  status: "ACTIVE",
};

const emptyMovement = {
  item_id: "",
  movement_type: "IN",
  quantity: 1,
  reason: "",
  movement_date: "",
};

function toDateTimeInput(v) {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 16);
}

export default function StoreManagerPortalPage() {
  const auth = useAuth();
  const [items, setItems] = useState([]);
  const [movements, setMovements] = useState([]);
  const [itemForm, setItemForm] = useState(emptyItem);
  const [movementForm, setMovementForm] = useState(emptyMovement);
  const [editingItemId, setEditingItemId] = useState(null);
  const [editingMovementId, setEditingMovementId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [itemsRes, movementsRes] = await Promise.all([
        fetch(`${API}/api/stock/items`, { credentials: "include" }),
        fetch(`${API}/api/stock/movements`, { credentials: "include" }),
      ]);
      const itemsJson = await itemsRes.json().catch(() => ({}));
      const movementsJson = await movementsRes.json().catch(() => ({}));
      if (!itemsRes.ok || !itemsJson.success) throw new Error(itemsJson.message || "Failed to load items");
      if (!movementsRes.ok || !movementsJson.success) throw new Error(movementsJson.message || "Failed to load movements");
      setItems(itemsJson.data || []);
      setMovements(movementsJson.data || []);
    } catch (err) {
      setError(err.message || "Failed to load stock data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const submitItem = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const url = editingItemId ? `${API}/api/stock/items/${editingItemId}` : `${API}/api/stock/items`;
      const method = editingItemId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(itemForm),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) throw new Error(json.message || "Failed to save item");
      setMessage(editingItemId ? "Stock item updated." : "Stock item created.");
      setItemForm(emptyItem);
      setEditingItemId(null);
      await loadData();
    } catch (err) {
      setError(err.message || "Failed to save stock item.");
    } finally {
      setSaving(false);
    }
  };

  const submitMovement = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const url = editingMovementId ? `${API}/api/stock/movements/${editingMovementId}` : `${API}/api/stock/movements`;
      const method = editingMovementId ? "PUT" : "POST";
      const body = {
        ...movementForm,
        movement_date: movementForm.movement_date ? new Date(movementForm.movement_date).toISOString() : undefined,
      };
      const res = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) throw new Error(json.message || "Failed to save movement");
      setMessage(editingMovementId ? "Stock movement updated." : "Stock movement created.");
      setMovementForm(emptyMovement);
      setEditingMovementId(null);
      await loadData();
    } catch (err) {
      setError(err.message || "Failed to save stock movement.");
    } finally {
      setSaving(false);
    }
  };

  const removeItem = async (id) => {
    if (!window.confirm("Delete this stock item and linked movements?")) return;
    const res = await fetch(`${API}/api/stock/items/${id}`, { method: "DELETE", credentials: "include" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.success) return setError(json.message || "Failed to delete item");
    setMessage("Stock item deleted.");
    loadData();
  };

  const removeMovement = async (id) => {
    if (!window.confirm("Delete this movement?")) return;
    const res = await fetch(`${API}/api/stock/movements/${id}`, { method: "DELETE", credentials: "include" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.success) return setError(json.message || "Failed to delete movement");
    setMessage("Stock movement deleted.");
    loadData();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800">
                <Boxes size={14} /> STORE_MANAGER
              </p>
              <h1 className="mt-2 text-2xl font-black text-slate-900">Inventory and stock module</h1>
              <p className="text-sm text-slate-600">
                School: {auth.school?.name || "N/A"} ({auth.school?.code || "N/A"})
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={loadData} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold">
                <RefreshCw size={15} /> Refresh
              </button>
              <LogoutButton variant="default" size="sm" />
            </div>
          </div>
          {loading && <p className="mt-3 inline-flex items-center gap-2 text-sm text-slate-600"><Loader2 size={14} className="animate-spin" /> Loading...</p>}
          {message && <p className="mt-3 text-sm font-semibold text-emerald-700">{message}</p>}
          {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-slate-900">{editingItemId ? "Edit stock item" : "Add stock item"}</h2>
            <form onSubmit={submitItem} className="mt-3 grid gap-3">
              <input required className="rounded-xl border px-3 py-2 text-sm" placeholder="Item name" value={itemForm.item_name} onChange={(e) => setItemForm((p) => ({ ...p, item_name: e.target.value }))} />
              <div className="grid grid-cols-2 gap-3">
                <input className="rounded-xl border px-3 py-2 text-sm" placeholder="SKU" value={itemForm.sku} onChange={(e) => setItemForm((p) => ({ ...p, sku: e.target.value }))} />
                <input className="rounded-xl border px-3 py-2 text-sm" placeholder="Category" value={itemForm.category} onChange={(e) => setItemForm((p) => ({ ...p, category: e.target.value }))} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <input className="rounded-xl border px-3 py-2 text-sm" placeholder="Unit" value={itemForm.unit} onChange={(e) => setItemForm((p) => ({ ...p, unit: e.target.value }))} />
                <input type="number" min="0" className="rounded-xl border px-3 py-2 text-sm" placeholder="Reorder level" value={itemForm.reorder_level} onChange={(e) => setItemForm((p) => ({ ...p, reorder_level: Number(e.target.value || 0) }))} />
                <input type="number" min="0" className="rounded-xl border px-3 py-2 text-sm" placeholder="Opening qty" value={itemForm.opening_qty} onChange={(e) => setItemForm((p) => ({ ...p, opening_qty: Number(e.target.value || 0) }))} />
              </div>
              <select className="rounded-xl border px-3 py-2 text-sm" value={itemForm.status} onChange={(e) => setItemForm((p) => ({ ...p, status: e.target.value }))}>
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
              <div className="flex gap-2">
                <button disabled={saving} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">{editingItemId ? "Update item" : "Create item"}</button>
                {editingItemId && <button type="button" className="rounded-xl border px-4 py-2 text-sm font-semibold" onClick={() => { setEditingItemId(null); setItemForm(emptyItem); }}>Cancel</button>}
              </div>
            </form>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-slate-900">{editingMovementId ? "Edit movement" : "Record movement"}</h2>
            <form onSubmit={submitMovement} className="mt-3 grid gap-3">
              <select required className="rounded-xl border px-3 py-2 text-sm" value={movementForm.item_id} onChange={(e) => setMovementForm((p) => ({ ...p, item_id: e.target.value }))}>
                <option value="">Select item</option>
                {items.map((it) => <option key={it.id} value={it.id}>{it.item_name}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <select className="rounded-xl border px-3 py-2 text-sm" value={movementForm.movement_type} onChange={(e) => setMovementForm((p) => ({ ...p, movement_type: e.target.value }))}>
                  <option value="IN">IN</option>
                  <option value="OUT">OUT</option>
                  <option value="ADJUSTMENT">ADJUSTMENT</option>
                </select>
                <input type="number" min="0.01" step="0.01" className="rounded-xl border px-3 py-2 text-sm" placeholder="Quantity" value={movementForm.quantity} onChange={(e) => setMovementForm((p) => ({ ...p, quantity: Number(e.target.value || 0) }))} />
              </div>
              <input className="rounded-xl border px-3 py-2 text-sm" placeholder="Reason" value={movementForm.reason} onChange={(e) => setMovementForm((p) => ({ ...p, reason: e.target.value }))} />
              <input type="datetime-local" className="rounded-xl border px-3 py-2 text-sm" value={movementForm.movement_date} onChange={(e) => setMovementForm((p) => ({ ...p, movement_date: e.target.value }))} />
              <div className="flex gap-2">
                <button disabled={saving} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">{editingMovementId ? "Update movement" : "Create movement"}</button>
                {editingMovementId && <button type="button" className="rounded-xl border px-4 py-2 text-sm font-semibold" onClick={() => { setEditingMovementId(null); setMovementForm(emptyMovement); }}>Cancel</button>}
              </div>
            </form>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-black text-slate-900">Stock items</h3>
            <div className="mt-3 space-y-2">
              {items.map((it) => (
                <div key={it.id} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  <p className="font-bold text-slate-900">{it.item_name}</p>
                  <p className="text-slate-600">Current: {it.current_qty} {it.unit} | Reorder: {it.reorder_level}</p>
                  <div className="mt-2 flex gap-2">
                    <button className="rounded-lg border px-2 py-1 text-xs font-semibold" onClick={() => { setEditingItemId(it.id); setItemForm({ item_name: it.item_name || "", sku: it.sku || "", category: it.category || "", unit: it.unit || "pcs", reorder_level: Number(it.reorder_level || 0), opening_qty: Number(it.opening_qty || 0), status: it.status || "ACTIVE" }); }}>Edit</button>
                    <button className="rounded-lg border border-red-200 px-2 py-1 text-xs font-semibold text-red-600" onClick={() => removeItem(it.id)}>Delete</button>
                  </div>
                </div>
              ))}
              {items.length === 0 && <p className="text-sm text-slate-500">No stock items yet.</p>}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-black text-slate-900">Stock movements</h3>
            <div className="mt-3 space-y-2">
              {movements.map((m) => (
                <div key={m.id} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  <p className="font-bold text-slate-900">{m.item_name || "Unknown item"}</p>
                  <p className="text-slate-600">{m.movement_type} | Qty change: {m.quantity_change}</p>
                  <div className="mt-2 flex gap-2">
                    <button className="rounded-lg border px-2 py-1 text-xs font-semibold" onClick={() => { setEditingMovementId(m.id); setMovementForm({ item_id: m.item_id || "", movement_type: m.movement_type || "IN", quantity: Math.abs(Number(m.quantity_change || 0)), reason: m.reason || "", movement_date: toDateTimeInput(m.movement_date) }); }}>Edit</button>
                    <button className="rounded-lg border border-red-200 px-2 py-1 text-xs font-semibold text-red-600" onClick={() => removeMovement(m.id)}>Delete</button>
                  </div>
                </div>
              ))}
              {movements.length === 0 && <p className="text-sm text-slate-500">No movements yet.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
