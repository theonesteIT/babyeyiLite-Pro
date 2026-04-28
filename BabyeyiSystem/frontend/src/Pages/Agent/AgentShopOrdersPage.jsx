import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { cardBorder, inputClass } from "./agentTheme";
const API = `${import.meta.env.VITE_API_URL || "http://localhost:5100"}/api`;

export default function AgentShopOrdersPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [f, setF] = useState({ status: "", delivery_mode: "", date_from: "", date_to: "", search: "" });

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const p = new URLSearchParams();
      if (f.status) p.set("status", f.status);
      if (f.delivery_mode) p.set("delivery_mode", f.delivery_mode);
      if (f.date_from) p.set("date_from", f.date_from);
      if (f.date_to) p.set("date_to", f.date_to);
      if (f.search) p.set("search", f.search);
      const url = `${API}/student-services/agent/shop-orders${p.toString() ? `?${p.toString()}` : ""}`;
      const r = await fetch(url, { credentials: "include" });
      const j = await r.json();
      if (!r.ok || j.success === false) throw new Error(j.message || "Failed to load orders");
      setRows(j.data || []);
    } catch (e) {
      setErr(e.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [f.status, f.delivery_mode, f.date_from, f.date_to]);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-black text-[#111827]">Shop orders</h2>
        <p className="text-sm text-amber-900/80 font-medium">Payments and orders made for your shop products.</p>
      </div>
      <div className={`rounded-2xl ${cardBorder} bg-white p-4 grid grid-cols-1 md:grid-cols-5 gap-2`}>
        <select className={inputClass} value={f.status} onChange={(e) => setF((p) => ({ ...p, status: e.target.value }))}>
          <option value="">All status</option>
          <option value="paid">Paid</option>
          <option value="awaiting_payment">Awaiting payment</option>
          <option value="pending">Pending</option>
        </select>
        <select className={inputClass} value={f.delivery_mode} onChange={(e) => setF((p) => ({ ...p, delivery_mode: e.target.value }))}>
          <option value="">All delivery</option>
          <option value="AT_SCHOOL">At school</option>
          <option value="AT_HOME">At home</option>
        </select>
        <input type="date" className={inputClass} value={f.date_from} onChange={(e) => setF((p) => ({ ...p, date_from: e.target.value }))} />
        <input type="date" className={inputClass} value={f.date_to} onChange={(e) => setF((p) => ({ ...p, date_to: e.target.value }))} />
        <div className="flex gap-2">
          <input className={inputClass} placeholder="Search" value={f.search} onChange={(e) => setF((p) => ({ ...p, search: e.target.value }))} />
          <button onClick={load} className="px-4 rounded-xl border-2 border-amber-300 bg-amber-50 text-amber-900 font-bold text-sm">Go</button>
        </div>
      </div>
      {err && <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm p-3">{err}</div>}
      {loading ? (
        <div className="py-16 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-amber-700" /></div>
      ) : (
        <div className={`rounded-2xl ${cardBorder} bg-white overflow-auto`}>
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="bg-amber-50/80 border-b border-amber-100 text-left text-[11px] uppercase font-black text-amber-900">
                <th className="p-3">Date</th>
                <th className="p-3">Batch</th>
                <th className="p-3">Buyer</th>
                <th className="p-3">Student</th>
                <th className="p-3">Product</th>
                <th className="p-3">Qty</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Delivery</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-amber-50">
                  <td className="p-3">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="p-3 font-mono text-xs">{r.batch_ref || "—"}</td>
                  <td className="p-3">
                    <div className="font-semibold">{r.buyer_name || "—"}</div>
                    <div className="text-xs text-gray-500">{r.buyer_contact || ""}</div>
                  </td>
                  <td className="p-3">{`${r.first_name || ""} ${r.last_name || ""}`.trim() || "—"}</td>
                  <td className="p-3">{r.product_name || "—"}</td>
                  <td className="p-3">{r.quantity || 1}</td>
                  <td className="p-3 font-bold text-amber-800">{Number(r.amount || 0).toLocaleString()} RWF</td>
                  <td className="p-3">{r.delivery_mode || "—"}</td>
                  <td className="p-3">
                    <span className="px-2 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold">{r.payment_status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && <p className="text-center py-10 text-amber-800/70 text-sm font-medium">No shop orders yet.</p>}
        </div>
      )}
    </div>
  );
}
