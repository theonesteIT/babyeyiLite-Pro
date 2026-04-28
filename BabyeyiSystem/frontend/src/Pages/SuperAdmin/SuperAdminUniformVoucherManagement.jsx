import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { ArrowLeft, Loader2, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";

const API = `${import.meta.env.VITE_API_URL || "http://localhost:5100"}/api`;
const ax = { withCredentials: true };
const FONT = `"MTN Brighter Sans", "Nunito", "Varela Round", sans-serif`;
const NAVY = "#000435";
const AMBER = "#FBBF24";

const emptyItem = {
  id: null,
  uniform_type: "school",
  name: "",
  description: "",
  price_rwf: "",
  sizes: "S,M,L,XL",
  colors: "",
  stock_qty: "",
  sort_order: "0",
};

export default function SuperAdminUniformVoucherManagement() {
  const [tab, setTab] = useState("summary");
  const [summary, setSummary] = useState(null);
  const [items, setItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [modal, setModal] = useState({ open: false, form: { ...emptyItem } });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const loadSummary = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/uniform-vouchers/admin/summary`, ax);
      setSummary(res.data?.data || null);
    } catch {
      setSummary(null);
    }
  }, []);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/uniform-vouchers/admin/items`, ax);
      setItems(res.data?.data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/uniform-vouchers/admin/orders`, { ...ax, params: { q: q.trim() || undefined } });
      setOrders(res.data?.data || []);
    } finally {
      setLoading(false);
    }
  }, [q]);

  useEffect(() => {
    if (tab === "summary") loadSummary();
  }, [tab, loadSummary]);

  useEffect(() => {
    if (tab === "items") loadItems();
  }, [tab, loadItems]);

  useEffect(() => {
    if (tab !== "orders") return;
    const t = setTimeout(() => loadOrders(), 300);
    return () => clearTimeout(t);
  }, [tab, q, loadOrders]);

  const saveItem = async (e) => {
    e.preventDefault();
    setSaving(true);
    setToast(null);
    try {
      const f = modal.form;
      const fd = new FormData();
      fd.append("uniform_type", f.uniform_type);
      fd.append("name", f.name.trim());
      fd.append("description", f.description.trim());
      fd.append("price_rwf", String(parseInt(f.price_rwf, 10) || 0));
      fd.append("sizes", f.sizes.trim());
      if (f.colors.trim()) fd.append("colors", f.colors.trim());
      if (f.stock_qty !== "") fd.append("stock_qty", f.stock_qty);
      fd.append("sort_order", f.sort_order || "0");
      if (f.imageFile) fd.append("image", f.imageFile);
      if (f.id) {
        await axios.put(`${API}/uniform-vouchers/admin/items/${f.id}`, fd, {
          ...ax,
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        await axios.post(`${API}/uniform-vouchers/admin/items`, fd, { ...ax, headers: { "Content-Type": "multipart/form-data" } });
      }
      setToast("Saved");
      setModal({ open: false, form: { ...emptyItem } });
      loadItems();
    } catch (err) {
      setToast(err.response?.data?.message || err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const patchOrder = async (id, body) => {
    try {
      await axios.patch(`${API}/uniform-vouchers/admin/orders/${id}`, body, ax);
      loadOrders();
    } catch (e) {
      window.alert(e.response?.data?.message || e.message);
    }
  };

  const deleteItem = async (it) => {
    if (!window.confirm(`Delete “${it.name}”? This cannot be undone.`)) return;
    setDeletingId(it.id);
    setToast(null);
    try {
      await axios.delete(`${API}/uniform-vouchers/admin/items/${it.id}`, ax);
      setToast("Item deleted");
      if (modal.open && modal.form?.id === it.id) setModal({ open: false, form: { ...emptyItem } });
      loadItems();
    } catch (err) {
      setToast(err.response?.data?.message || err.message || "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div style={{ fontFamily: FONT, minHeight: "100vh", background: "#f8fafc", padding: "1.25rem" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
          <Link to="/superadmin/dashboard" style={{ color: "#B45309", fontWeight: 800, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <ArrowLeft size={16} /> Dashboard
          </Link>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: NAVY }}>Uniform voucher management</h1>
            <p style={{ margin: "6px 0 0", fontSize: 13, color: "#64748b" }}>
              Catalog, orders, delivery and payment statuses — same palette as public services.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (tab === "summary") loadSummary();
              if (tab === "items") loadItems();
              if (tab === "orders") loadOrders();
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 14px",
              borderRadius: 12,
              border: `2px solid ${AMBER}`,
              background: "#fff",
              fontWeight: 800,
              color: NAVY,
              cursor: "pointer",
            }}
          >
            <RefreshCw size={16} /> Refresh
          </button>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          {[
            { id: "summary", label: "Dashboard" },
            { id: "items", label: "Items & packages" },
            { id: "orders", label: "Transactions" },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              style={{
                padding: "10px 16px",
                borderRadius: 12,
                border: tab === t.id ? `2px solid ${NAVY}` : "1px solid #e2e8f0",
                background: tab === t.id ? NAVY : "#fff",
                color: tab === t.id ? AMBER : NAVY,
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {toast && (
          <div
            style={{
              marginBottom: 12,
              padding: "10px 14px",
              borderRadius: 12,
              background: /fail|error/i.test(toast) ? "#fef2f2" : "#ecfdf5",
              color: "#0f172a",
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            {toast}
          </div>
        )}

        {tab === "summary" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
            {[
              ["Total orders", summary?.orders_total ?? "—"],
              ["Paid orders", summary?.paid_count ?? "—"],
              ["Paid volume (Frw)", summary?.paid_volume_rwf?.toLocaleString?.() ?? "—"],
              ["Awaiting payment", summary?.pending_payment_count ?? "—"],
            ].map(([k, v]) => (
              <div key={k} style={{ background: "#fff", borderRadius: 16, padding: 16, border: "1px solid #e2e8f0" }}>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase" }}>{k}</p>
                <p style={{ margin: "8px 0 0", fontSize: 22, fontWeight: 900, color: NAVY }}>{v}</p>
              </div>
            ))}
          </div>
        )}

        {tab === "items" && (
          <div>
            <button
              type="button"
              onClick={() => setModal({ open: true, form: { ...emptyItem, imageFile: null } })}
              style={{
                marginBottom: 14,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 16px",
                borderRadius: 12,
                border: "none",
                background: NAVY,
                color: AMBER,
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              <Plus size={18} /> Add item
            </button>
            {loading ? (
              <Loader2 className="animate-spin text-amber-500" style={{ margin: 24 }} />
            ) : (
              <div style={{ overflowX: "auto", borderRadius: 16, border: "1px solid #e2e8f0", background: "#fff" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#f8fafc", textAlign: "left" }}>
                      {["Type", "Name", "Price", "Stock", "Active", "Actions"].map((h) => (
                        <th key={h} style={{ padding: "10px 12px", fontWeight: 800, color: NAVY }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it) => (
                      <tr key={it.id} style={{ borderTop: "1px solid #e2e8f0" }}>
                        <td style={{ padding: "10px 12px", textTransform: "capitalize" }}>{it.uniform_type}</td>
                        <td style={{ padding: "10px 12px", fontWeight: 700 }}>{it.name}</td>
                        <td style={{ padding: "10px 12px" }}>{Number(it.price_rwf).toLocaleString()} Frw</td>
                        <td style={{ padding: "10px 12px" }}>{it.stock_qty == null ? "∞" : it.stock_qty}</td>
                        <td style={{ padding: "10px 12px" }}>{it.is_active ? "Yes" : "No"}</td>
                        <td style={{ padding: "10px 12px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <button
                              type="button"
                              title="Edit"
                              onClick={() =>
                                setModal({
                                  open: true,
                                  form: {
                                    id: it.id,
                                    uniform_type: it.uniform_type,
                                    name: it.name,
                                    description: it.description || "",
                                    price_rwf: String(it.price_rwf),
                                    sizes: (it.sizes || []).join(","),
                                    colors: (it.colors || []).join(","),
                                    stock_qty: it.stock_qty == null ? "" : String(it.stock_qty),
                                    sort_order: String(it.sort_order || 0),
                                    imageFile: null,
                                  },
                                })
                              }
                              style={{ border: "none", background: "none", cursor: "pointer", color: "#B45309", fontWeight: 800 }}
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              type="button"
                              title="Delete"
                              disabled={deletingId === it.id}
                              onClick={() => deleteItem(it)}
                              style={{
                                border: "none",
                                background: "none",
                                cursor: deletingId === it.id ? "wait" : "pointer",
                                color: "#b91c1c",
                                fontWeight: 800,
                                opacity: deletingId === it.id ? 0.5 : 1,
                              }}
                            >
                              {deletingId === it.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === "orders" && (
          <div>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search student, school, voucher…"
              style={{
                width: "100%",
                maxWidth: 360,
                marginBottom: 12,
                padding: "10px 14px",
                borderRadius: 12,
                border: "2px solid #e2e8f0",
                fontFamily: FONT,
              }}
            />
            {loading ? (
              <Loader2 className="animate-spin text-amber-500" />
            ) : (
              <div style={{ overflowX: "auto", borderRadius: 16, border: "1px solid #e2e8f0", background: "#fff" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: "#f8fafc", textAlign: "left" }}>
                      {["Voucher", "Student", "School", "Total", "Pay", "Delivery", "Booking", ""].map((h) => (
                        <th key={h} style={{ padding: "8px 10px", fontWeight: 800, color: NAVY }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o) => {
                      let st = {};
                      let sch = {};
                      try {
                        st = typeof o.student_detail_json === "string" ? JSON.parse(o.student_detail_json) : o.student_detail_json;
                      } catch {
                        st = {};
                      }
                      try {
                        sch = typeof o.school_detail_json === "string" ? JSON.parse(o.school_detail_json) : o.school_detail_json;
                      } catch {
                        sch = {};
                      }
                      return (
                        <tr key={o.id} style={{ borderTop: "1px solid #e2e8f0", verticalAlign: "top" }}>
                          <td style={{ padding: "8px 10px", fontFamily: "monospace", fontSize: 11 }}>{o.voucher_number}</td>
                          <td style={{ padding: "8px 10px" }}>
                            {st.first_name} {st.last_name}
                            <div style={{ color: "#94a3b8", fontSize: 11 }}>{st.student_code}</div>
                          </td>
                          <td style={{ padding: "8px 10px" }}>{sch.school_name || "—"}</td>
                          <td style={{ padding: "8px 10px", fontWeight: 800 }}>{Number(o.total_rwf).toLocaleString()}</td>
                          <td style={{ padding: "8px 10px" }}>{o.payment_status}</td>
                          <td style={{ padding: "8px 10px" }}>{o.delivery_status}</td>
                          <td style={{ padding: "8px 10px" }}>{o.booking_status}</td>
                          <td style={{ padding: "8px 10px" }}>
                            <select
                              defaultValue={o.delivery_status}
                              onChange={(e) => patchOrder(o.id, { delivery_status: e.target.value })}
                              style={{ fontSize: 11, borderRadius: 8, padding: 6, maxWidth: 160 }}
                            >
                              {["Waiting", "Processing", "Sent", "Delivered to School", "Delivered at Home", "Completed"].map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {modal.open && (
        <div style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(0,4,53,0.55)", display: "flex", alignItems: "center", padding: 16 }}>
          <form
            onSubmit={saveItem}
            style={{
              width: "100%",
              maxWidth: 440,
              margin: "auto",
              background: "#fff",
              borderRadius: 20,
              padding: "1.25rem",
              border: `2px solid ${AMBER}`,
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <h3 style={{ margin: "0 0 12px", fontWeight: 900, color: NAVY }}>{modal.form.id ? "Edit item" : "New item"}</h3>
            <label style={{ fontSize: 11, fontWeight: 800, color: "#64748b" }}>Type</label>
            <select
              value={modal.form.uniform_type}
              onChange={(e) => setModal((m) => ({ ...m, form: { ...m.form, uniform_type: e.target.value } }))}
              style={{ width: "100%", marginBottom: 10, padding: 10, borderRadius: 10, border: "2px solid #e2e8f0" }}
            >
              <option value="school">School</option>
              <option value="sports">Sports</option>
            </select>
            {["name", "description", "price_rwf", "sizes", "colors", "stock_qty", "sort_order"].map((field) => (
              <div key={field} style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 11, fontWeight: 800, color: "#64748b" }}>{field.replace("_", " ")}</label>
                <input
                  value={modal.form[field]}
                  onChange={(e) => setModal((m) => ({ ...m, form: { ...m.form, [field]: e.target.value } }))}
                  style={{ width: "100%", padding: 10, borderRadius: 10, border: "2px solid #e2e8f0", boxSizing: "border-box" }}
                  placeholder={field === "sizes" ? "Comma sizes e.g. S,M,L" : ""}
                />
              </div>
            ))}
            <label style={{ fontSize: 11, fontWeight: 800, color: "#64748b" }}>Image</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setModal((m) => ({ ...m, form: { ...m.form, imageFile: e.target.files?.[0] || null } }))}
              style={{ marginBottom: 14 }}
            />
            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" onClick={() => setModal({ open: false, form: { ...emptyItem } })} style={{ flex: 1, padding: 12, borderRadius: 12, border: "2px solid #e2e8f0", fontWeight: 800 }}>
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                style={{ flex: 1, padding: 12, borderRadius: 12, border: "none", background: NAVY, color: AMBER, fontWeight: 900 }}
              >
                {saving ? "…" : "Save"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
