import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { Loader2, Shirt } from "lucide-react";

const API = `${import.meta.env.VITE_API_URL || "http://localhost:5100"}/api`;
const ax = { withCredentials: true };
const FONT = `"MTN Brighter Sans", "Nunito", "Varela Round", sans-serif`;
const NAVY = "#000435";
const AMBER = "#FBBF24";

const DELIVERY_OPTIONS = [
  "Waiting",
  "Processing",
  "Sent",
  "Delivered to School",
  "Delivered at Home",
  "Completed",
];

export default function AgentUniformVoucherOrdersPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await axios.get(`${API}/uniform-vouchers/agent/orders`, ax);
      setRows(res.data?.data || []);
    } catch (e) {
      setErr(e.response?.data?.message || e.message || "Failed to load");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const patch = async (id, delivery_status) => {
    try {
      await axios.patch(`${API}/uniform-vouchers/agent/orders/${id}`, { delivery_status }, ax);
      load();
    } catch (e) {
      window.alert(e.response?.data?.message || e.message);
    }
  };

  return (
    <div style={{ fontFamily: FONT }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: NAVY,
            border: `2px solid ${AMBER}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Shirt size={20} color={AMBER} />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: NAVY }}>Uniform voucher orders</h1>
          <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>Only schools in your assigned district and sectors.</p>
        </div>
      </div>

      {err && <p style={{ color: "#b91c1c", fontWeight: 600, marginBottom: 12 }}>{err}</p>}

      {loading ? (
        <div style={{ padding: 40, textAlign: "center" }}>
          <Loader2 className="animate-spin" style={{ color: AMBER }} size={32} />
        </div>
      ) : !rows.length ? (
        <p style={{ color: "#64748b" }}>No orders in your coverage yet.</p>
      ) : (
        <div style={{ overflowX: "auto", borderRadius: 16, border: "1px solid #fde68a", background: "#fff" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "#fffbeb", textAlign: "left" }}>
                {["Voucher", "Student", "School", "District", "Sector", "Total", "Payment", "Delivery", "Update"].map((h) => (
                  <th key={h} style={{ padding: "10px 12px", fontWeight: 800, color: NAVY }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => {
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
                  <tr key={o.id} style={{ borderTop: "1px solid #fef3c7" }}>
                    <td style={{ padding: "10px 12px", fontFamily: "monospace", fontSize: 11 }}>{o.voucher_number}</td>
                    <td style={{ padding: "10px 12px" }}>
                      {st.first_name} {st.last_name}
                      <div style={{ color: "#94a3b8" }}>{st.student_code}</div>
                    </td>
                    <td style={{ padding: "10px 12px" }}>{sch.school_name || "—"}</td>
                    <td style={{ padding: "10px 12px" }}>{o.order_district || "—"}</td>
                    <td style={{ padding: "10px 12px" }}>{o.order_sector || "—"}</td>
                    <td style={{ padding: "10px 12px", fontWeight: 800 }}>{Number(o.total_rwf).toLocaleString()} Frw</td>
                    <td style={{ padding: "10px 12px" }}>{o.payment_status}</td>
                    <td style={{ padding: "10px 12px" }}>{o.delivery_status}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <select
                        value={o.delivery_status}
                        onChange={(e) => patch(o.id, e.target.value)}
                        style={{ maxWidth: 200, padding: 8, borderRadius: 10, border: "2px solid #e2e8f0", fontSize: 11 }}
                      >
                        {[...new Set([...(DELIVERY_OPTIONS || []), o.delivery_status].filter(Boolean))].map((s) => (
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
  );
}
