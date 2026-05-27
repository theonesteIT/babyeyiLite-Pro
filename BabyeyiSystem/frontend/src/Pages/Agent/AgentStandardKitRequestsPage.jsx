import { useEffect, useMemo, useState } from "react";
import { getApiBase } from "../../utils/apiBase";
import {
  pageShell,
  pageCardPad,
  tableShell,
  tableHeadRow,
  tableHeadCell,
  tableBodyRow,
  inputClass,
  selectClass,
} from "./agentTheme";
import AgentPageHeader from "./AgentPageHeader";

const API = getApiBase();

export default function AgentStandardKitRequestsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  useEffect(() => {
    let off = false;
    setLoading(true);
    fetch(`${API}/standard-shule-kits/agent/requests`, { credentials: "include" })
      .then((r) => r.json())
      .then((j) => !off && setRows(Array.isArray(j.data) ? j.data : []))
      .finally(() => !off && setLoading(false));
    return () => {
      off = true;
    };
  }, []);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (status && String(r.payment_status || "").toLowerCase() !== status.toLowerCase()) return false;
      const date = String(r.created_at || "").slice(0, 10);
      if (from && date && date < from) return false;
      if (to && date && date > to) return false;
      if (!q) return true;
      const hay = [
        r.request_no,
        r.student_code,
        `${r.first_name || ""} ${r.last_name || ""}`,
        r.school_name,
        r.grade_level,
        r.delivery_option,
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [rows, search, status, from, to]);

  const paymentBadge = (st) => {
    const s = String(st || "").toLowerCase();
    if (s === "paid") return "bg-emerald-50 text-emerald-800 border-emerald-200";
    if (s === "failed") return "bg-red-50 text-red-800 border-red-200";
    return "bg-amber-50 text-amber-800 border-amber-200";
  };

  return (
    <div className={`${pageShell} bg-white`}>
      <AgentPageHeader
        title="Standard kit requests"
        description="Requests assigned to your sector coverage."
      />

      <div className={`${pageCardPad} grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3`}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search request/student/school..."
          className={inputClass}
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectClass}>
          <option value="">All payment statuses</option>
          <option value="paid">Paid</option>
          <option value="awaiting_payment">Awaiting payment</option>
          <option value="failed">Failed</option>
        </select>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputClass} />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputClass} />
      </div>

      <div className={tableShell}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead>
              <tr className={tableHeadRow}>
                <th className={tableHeadCell}>Request</th>
                <th className={tableHeadCell}>Student</th>
                <th className={tableHeadCell}>School</th>
                <th className={tableHeadCell}>Kit</th>
                <th className={tableHeadCell}>Delivery</th>
                <th className={`${tableHeadCell} text-right`}>Amount</th>
                <th className={tableHeadCell}>Date</th>
                <th className={tableHeadCell}>Payment</th>
              </tr>
            </thead>
            <tbody>
              {!loading &&
                filteredRows.map((r) => (
                  <tr key={r.id} className={tableBodyRow}>
                    <td className="py-3 px-4 font-semibold text-[#000435]">{r.request_no}</td>
                    <td className="py-3 px-4 text-slate-700">
                      {`${r.first_name || ""} ${r.last_name || ""}`.trim() || r.student_code || "—"}
                    </td>
                    <td className="py-3 px-4 text-slate-700">{r.school_name || "—"}</td>
                    <td className="py-3 px-4 text-slate-700">{r.grade_level || "—"}</td>
                    <td className="py-3 px-4 text-slate-700">{r.delivery_option}</td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-[#000435]">
                      {Number(r.total_frw || 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{String(r.created_at || "").slice(0, 10) || "—"}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${paymentBadge(r.payment_status)}`}
                      >
                        {r.payment_status === "paid" ? "Payment Completed" : String(r.payment_status || "unknown")}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {!loading && !filteredRows.length && (
          <p className="py-8 text-center text-sm text-slate-500">No requests match these filters.</p>
        )}
      </div>
    </div>
  );
}
