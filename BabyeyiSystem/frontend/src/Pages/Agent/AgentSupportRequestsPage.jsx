import { useEffect, useState } from "react";
import { Loader2, LifeBuoy } from "lucide-react";
import { axAgent } from "./agentApi";
import { ACCENT_SLATE, cardBorder, inputClass } from "./agentTheme";

const STATUS = ["NEW", "IN_PROGRESS", "RESOLVED"];

export default function AgentSupportRequestsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [savingId, setSavingId] = useState(null);

  const [filters, setFilters] = useState({
    status: "",
    sector: "",
    search: "",
    date_from: "",
    date_to: "",
  });

  const load = () => {
    setLoading(true);
    setErr("");
    axAgent
      .get("/support-requests", {
        status: filters.status || undefined,
        sector: filters.sector || undefined,
        search: filters.search || undefined,
        date_from: filters.date_from || undefined,
        date_to: filters.date_to || undefined,
      })
      .then((r) => {
        if (r.data.success) setRows(r.data.data || []);
      })
      .catch((e) => setErr(e.response?.data?.message || "Could not load support requests"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [filters.status, filters.sector, filters.date_from, filters.date_to]);

  const onStatusChange = async (id, status) => {
    try {
      setSavingId(id);
      await axAgent.get("/summary"); // keep session fresh on some proxies
      const API = `${import.meta.env.VITE_API_URL || "http://localhost:5100"}/api`;
      const res = await fetch(`${API}/agent/support-requests/${id}/status`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (!res.ok || json.success === false) throw new Error(json.message || "Update failed");
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    } catch (e) {
      setErr(e.message || "Failed to update status");
    } finally {
      setSavingId(null);
    }
  };

  const sectors = [...new Set(rows.map((r) => r.sector).filter(Boolean))];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-[#111827]">Support requests</h2>
        <p className="text-sm text-amber-900/80 mt-1 font-medium">
          Requests submitted by families in your allocated area.
        </p>
      </div>

      <div className={`rounded-3xl ${cardBorder} bg-white p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3`}>
        <select className={inputClass} value={filters.status} onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}>
          <option value="">All status</option>
          {STATUS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select className={inputClass} value={filters.sector} onChange={(e) => setFilters((p) => ({ ...p, sector: e.target.value }))}>
          <option value="">All sectors</option>
          {sectors.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <input type="date" className={inputClass} value={filters.date_from} onChange={(e) => setFilters((p) => ({ ...p, date_from: e.target.value }))} />
        <input type="date" className={inputClass} value={filters.date_to} onChange={(e) => setFilters((p) => ({ ...p, date_to: e.target.value }))} />
        <div className="flex gap-2">
          <input
            className={inputClass}
            placeholder="Search name/contact/need"
            value={filters.search}
            onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
          />
          <button
            type="button"
            onClick={load}
            className="px-4 rounded-xl border-2 border-amber-300 bg-amber-50 text-amber-900 font-bold text-sm"
          >
            Filter
          </button>
        </div>
      </div>

      {err && <div className="rounded-2xl border-2 border-red-200 bg-red-50 text-red-800 text-sm font-semibold p-4">{err}</div>}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: ACCENT_SLATE }} />
        </div>
      ) : (
        <div className="grid gap-3">
          {!rows.length && (
            <div className={`rounded-3xl ${cardBorder} bg-white p-8 text-center`}>
              <LifeBuoy className="w-8 h-8 mx-auto text-amber-500 mb-2" />
              <p className="text-sm font-semibold text-amber-900/80">No support requests found for current filters.</p>
            </div>
          )}
          {rows.map((r) => (
            <article key={r.id} className={`rounded-3xl ${cardBorder} bg-white p-4 sm:p-5`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-[#111827]">{r.requester_name}</p>
                  <p className="text-xs text-amber-900/70 font-semibold">
                    {r.requester_contact} · {r.province} / {r.district} / {r.sector}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{new Date(r.created_at).toLocaleString()}</p>
                </div>
                <select
                  className={inputClass}
                  style={{ maxWidth: 170 }}
                  value={r.status}
                  disabled={savingId === r.id}
                  onChange={(e) => onStatusChange(r.id, e.target.value)}
                >
                  {STATUS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-sm text-gray-700 mt-3 whitespace-pre-wrap leading-relaxed">{r.requester_description}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
