import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getApiBase } from "../../utils/apiBase";

const API = getApiBase();

export default function SuperAdminStandardKitRequestsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  useEffect(() => {
    let off = false;
    setLoading(true);
    fetch(`${API}/standard-shule-kits/admin/requests`, { credentials: "include" })
      .then((r) => r.json())
      .then((j) => !off && setRows(Array.isArray(j.data) ? j.data : []))
      .finally(() => !off && setLoading(false));
    return () => { off = true; };
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
        `${r.first_name || ""} ${r.last_name || ""}`,
        r.school_name,
        r.grade_level,
        r.district,
        r.sector,
        `${r.agent_first_name || ""} ${r.agent_last_name || ""}`,
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [rows, search, status, from, to]);

  const paymentBadge = (st) => {
    const s = String(st || "").toLowerCase();
    if (s === "paid") return "bg-emerald-100 text-emerald-800 border-emerald-200";
    if (s === "failed") return "bg-red-100 text-red-800 border-red-200";
    return "bg-amber-100 text-amber-900 border-amber-200";
  };

  const exportCsv = () => {
    const header = [
      "RequestNo",
      "StudentName",
      "School",
      "District",
      "Sector",
      "Kit",
      "Agent",
      "Delivery",
      "AmountFrw",
      "PaymentStatus",
      "CreatedAt",
    ];
    const lines = filteredRows.map((r) => [
      r.request_no || "",
      `${r.first_name || ""} ${r.last_name || ""}`.trim(),
      r.school_name || "",
      r.district || "",
      r.sector || "",
      r.grade_level || "",
      `${r.agent_first_name || ""} ${r.agent_last_name || ""}`.trim(),
      r.delivery_option || "",
      Number(r.total_frw || 0),
      r.payment_status || "",
      String(r.created_at || "").slice(0, 19).replace("T", " "),
    ]);
    const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = [header, ...lines].map((row) => row.map(esc).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `standard-kit-requests-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-amber-50/40 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h1 className="text-xl sm:text-2xl font-black text-[#111827]">Standard Kit Requests Report</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={exportCsv}
              className="rounded-xl border border-amber-300 bg-amber-100 px-3 py-2 text-sm font-bold text-amber-900"
            >
              Export CSV
            </button>
            <Link to="/superadmin/dashboard" className="rounded-xl border border-amber-300 bg-white px-3 py-2 text-sm font-bold text-amber-900">
              Back dashboard
            </Link>
          </div>
        </div>
        <div className="rounded-2xl border-2 border-amber-100 bg-white p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search request/student/school/agent..."
            className="rounded-xl border border-amber-200 px-3 py-2 text-sm"
          />
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-xl border border-amber-200 px-3 py-2 text-sm">
            <option value="">All payment statuses</option>
            <option value="paid">Paid</option>
            <option value="awaiting_payment">Awaiting payment</option>
            <option value="failed">Failed</option>
          </select>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-xl border border-amber-200 px-3 py-2 text-sm" />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-xl border border-amber-200 px-3 py-2 text-sm" />
        </div>
        <div className="rounded-2xl border-2 border-amber-100 bg-white overflow-auto">
          <table className="w-full text-sm min-w-[980px]">
            <thead className="bg-amber-50 text-amber-900 text-[11px] uppercase">
              <tr>
                <th className="px-3 py-2 text-left">Request</th>
                <th className="px-3 py-2 text-left">Student</th>
                <th className="px-3 py-2 text-left">School</th>
                <th className="px-3 py-2 text-left">District/Sector</th>
                <th className="px-3 py-2 text-left">Kit</th>
                <th className="px-3 py-2 text-left">Agent</th>
                <th className="px-3 py-2 text-right">Amount</th>
              <th className="px-3 py-2 text-left">Date</th>
                <th className="px-3 py-2 text-left">Payment</th>
              </tr>
            </thead>
            <tbody>
              {!loading && filteredRows.map((r) => (
                <tr key={r.id} className="border-t border-amber-100/70">
                  <td className="px-3 py-2 font-bold">{r.request_no}</td>
                  <td className="px-3 py-2">{`${r.first_name || ""} ${r.last_name || ""}`.trim()}</td>
                  <td className="px-3 py-2">{r.school_name || "—"}</td>
                  <td className="px-3 py-2">{[r.district, r.sector].filter(Boolean).join(" / ") || "—"}</td>
                  <td className="px-3 py-2">{r.grade_level || "—"}</td>
                  <td className="px-3 py-2">{`${r.agent_first_name || ""} ${r.agent_last_name || ""}`.trim() || "Unassigned"}</td>
                  <td className="px-3 py-2 text-right font-mono">{Number(r.total_frw || 0).toLocaleString()}</td>
                  <td className="px-3 py-2">{String(r.created_at || "").slice(0, 10) || "—"}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-bold ${paymentBadge(r.payment_status)}`}>
                      {r.payment_status === "paid" ? "Payment Completed" : String(r.payment_status || "unknown")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && !filteredRows.length && <p className="py-8 text-center text-sm text-slate-500">No requests match these filters.</p>}
        </div>
      </div>
    </div>
  );
}
