import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Home as HomeIcon, RefreshCw, ShieldCheck } from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://localhost:5100";

function fmtWhen(v) {
  if (!v) return "Unknown time";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "Unknown time";
  return d.toLocaleString();
}

function eventLabel(e) {
  const t = String(e?.event_type || "").toLowerCase();
  if (t === "parent_child_added") return "Child added to parent account";
  if (t === "classkit_share_link_opened") return "Shared ClassKit link opened";
  if (t === "classkit_share_otp_sent") return "OTP sent for shared link";
  if (t === "classkit_share_otp_verify") return "OTP verification attempted";
  if (t === "classkit_share_pricing_opened") return "Shared pricing viewed";
  return e?.event_type || "Security activity";
}

export default function AuditLog() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, total_pages: 1, has_prev: false, has_next: false });

  const loadRows = async (nextPage = page) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/api/parent-portal/audit-log?limit=20&page=${encodeURIComponent(nextPage)}`, { credentials: "include" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) throw new Error(json.message || "Failed to load audit log");
      setRows(Array.isArray(json.data) ? json.data : []);
      setPagination(json.pagination || { page: nextPage, total_pages: 1, has_prev: false, has_next: false });
      setPage(Number(json?.pagination?.page || nextPage || 1));
    } catch (e) {
      setRows([]);
      setError(e.message || "Could not load audit log");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRows(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6 pb-4 max-w-3xl mx-auto">
      <div className="rounded-2xl bg-emerald-600 px-4 py-4 flex items-center justify-between gap-3 text-white shadow-lg shadow-emerald-500/20">
        <div className="flex items-center gap-3 min-w-0">
          <ShieldCheck className="w-8 h-8 shrink-0 opacity-95" strokeWidth={2} />
          <div className="min-w-0">
            <h1 className="font-extrabold text-lg leading-tight">Audit Log</h1>
            <p className="text-white/85 text-xs sm:text-sm">Security activity on your parent account</p>
          </div>
        </div>
        <Link
          to="/parents/home"
          className="shrink-0 w-11 h-11 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors border border-white/30"
          aria-label="Home"
        >
          <HomeIcon size={20} />
        </Link>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <h2 className="font-bold text-slate-900">Recent activity</h2>
          <button
            type="button"
            onClick={() => void loadRows(page)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>
        <div className="px-4 py-3">
          {loading ? <p className="text-sm text-slate-500">Loading audit log…</p> : null}
          {!loading && error ? <p className="text-sm text-red-600">{error}</p> : null}
          {!loading && !error && rows.length === 0 ? (
            <p className="text-sm text-slate-500">No security activity yet.</p>
          ) : null}
          {!loading && !error && rows.length > 0 ? (
            <>
              <ul className="space-y-3">
                {rows.map((row) => (
                  <li key={row.id} className="rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2">
                    <p className="text-sm font-bold text-slate-900">{eventLabel(row)}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{fmtWhen(row.created_at)}</p>
                    <p className="text-xs text-slate-600 mt-1">
                      Outcome: <span className="font-semibold">{row.outcome || "unknown"}</span>
                      {row?.ip_address ? ` • IP: ${row.ip_address}` : ""}
                      {row?.channel ? ` • Channel: ${row.channel}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex items-center justify-between gap-2">
                <button
                  type="button"
                  disabled={!pagination.has_prev || loading}
                  onClick={() => void loadRows(Math.max(1, page - 1))}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 disabled:opacity-40"
                >
                  Previous
                </button>
                <p className="text-xs text-slate-500">
                  Page {page} / {pagination.total_pages || 1}
                </p>
                <button
                  type="button"
                  disabled={!pagination.has_next || loading}
                  onClick={() => void loadRows(page + 1)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
