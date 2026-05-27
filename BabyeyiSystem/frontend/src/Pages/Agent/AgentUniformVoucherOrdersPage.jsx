import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { Loader2, Shirt } from "lucide-react";
import {
  pageShell,
  pageCardPad,
  tableShell,
  tableHeadRow,
  tableHeadCell,
  tableBodyRow,
  selectClass,
  ACCENT_SLATE,
} from "./agentTheme";
import AgentPageHeader from "./AgentPageHeader";

const API = `${import.meta.env.VITE_API_URL || "http://localhost:5100"}/api`;
const ax = { withCredentials: true };

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
    <div className={`${pageShell} bg-white`}>
      <AgentPageHeader
        title="Uniform voucher orders"
        description="Only schools in your assigned district and sectors."
      />

      {err && <div className="rounded-xl border border-red-200 bg-red-50 text-red-800 text-sm font-medium p-4">{err}</div>}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: ACCENT_SLATE }} />
        </div>
      ) : !rows.length ? (
        <div className={`${pageCardPad} text-center text-slate-500 text-sm`}>No orders in your coverage yet.</div>
      ) : (
        <div className={`${tableShell} overflow-x-auto`}>
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className={tableHeadRow}>
                {["Voucher", "Student", "School", "District", "Sector", "Total", "Payment", "Delivery", "Update"].map((h) => (
                  <th key={h} className={tableHeadCell}>
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
                  <tr key={o.id} className={tableBodyRow}>
                    <td className="py-3 px-4 font-mono text-xs text-slate-600">{o.voucher_number}</td>
                    <td className="py-3 px-4 text-slate-800">
                      {st.first_name} {st.last_name}
                      <div className="text-xs text-slate-400">{st.student_code}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-700">{sch.school_name || "—"}</td>
                    <td className="py-3 px-4 text-slate-700">{o.order_district || "—"}</td>
                    <td className="py-3 px-4 text-slate-700">{o.order_sector || "—"}</td>
                    <td className="py-3 px-4 font-bold text-[#000435]">{Number(o.total_rwf).toLocaleString()} Frw</td>
                    <td className="py-3 px-4 text-slate-600">{o.payment_status}</td>
                    <td className="py-3 px-4 text-slate-600">{o.delivery_status}</td>
                    <td className="py-3 px-4">
                      <select
                        value={o.delivery_status}
                        onChange={(e) => patch(o.id, e.target.value)}
                        className={`${selectClass} max-w-[200px] text-xs py-2`}
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
