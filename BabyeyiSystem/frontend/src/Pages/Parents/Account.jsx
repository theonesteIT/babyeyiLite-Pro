// ================================================================
// Account.jsx — Babyeyi wallet + parent security audit activity
// ================================================================

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Wallet, CalendarDays, Filter, Home as HomeIcon, ShieldCheck, RefreshCw } from "lucide-react";

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

export default function Account() {
  const [auditRows, setAuditRows] = useState([]);
  const [auditLoading, setAuditLoading] = useState(true);
  const [auditError, setAuditError] = useState("");

  const loadAudit = async () => {
    setAuditLoading(true);
    setAuditError("");
    try {
      const res = await fetch(`${API}/api/parent-portal/audit-log?limit=25`, {
        credentials: "include",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) throw new Error(json.message || "Failed to load security activity");
      setAuditRows(Array.isArray(json.data) ? json.data : []);
    } catch (e) {
      setAuditRows([]);
      setAuditError(e.message || "Could not load security activity");
    } finally {
      setAuditLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      await loadAudit();
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const securityRows = useMemo(() => auditRows.slice(0, 8), [auditRows]);

  return (
    <div className="space-y-6 pb-4 max-w-lg mx-auto">
      <div className="rounded-2xl bg-orange-500 px-4 py-4 flex items-center justify-between gap-3 text-white shadow-lg shadow-orange-500/20">
        <div className="flex items-center gap-3 min-w-0">
          <Wallet className="w-8 h-8 shrink-0 opacity-95" strokeWidth={2} />
          <div className="min-w-0">
            <h1 className="font-extrabold text-lg leading-tight">My Babyeyi Account</h1>
            <p className="text-white/85 text-xs sm:text-sm">Manage your savings &amp; transactions</p>
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

      <div className="rounded-3xl bg-gradient-to-r from-orange-600 to-orange-400 p-6 sm:p-8 text-white shadow-xl">
        <p className="text-white/85 text-sm font-medium">Available balance</p>
        <p className="text-3xl sm:text-4xl font-extrabold mt-2 tracking-tight">11,500 RWF</p>
        <div className="flex flex-wrap gap-3 mt-8">
          <button
            type="button"
            className="px-5 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 font-bold text-sm border border-white/30 transition-colors"
          >
            + Add funds
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 font-bold text-sm border border-white/30 transition-colors"
          >
            <CalendarDays size={18} />
            All history
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <h2 className="font-bold text-slate-900">Recent transactions</h2>
          <button type="button" className="p-2 rounded-lg text-slate-400 hover:bg-slate-50" aria-label="Filter">
            <Filter size={18} />
          </button>
        </div>
        <div className="py-14 px-6 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <Wallet className="w-8 h-8 text-slate-400" />
          </div>
          <p className="font-bold text-slate-600">No transactions yet</p>
          <p className="text-sm text-slate-400 mt-1 max-w-xs mx-auto">
            Your transaction history will appear here when you add funds or make payments.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-emerald-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-emerald-100">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h2 className="font-bold text-slate-900">Security activity</h2>
          </div>
          <button
            type="button"
            onClick={loadAudit}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>
        <div className="px-4 py-3">
          {auditLoading ? (
            <p className="text-sm text-slate-500">Loading security activity…</p>
          ) : auditError ? (
            <p className="text-sm text-red-600">{auditError}</p>
          ) : securityRows.length === 0 ? (
            <p className="text-sm text-slate-500">No security activity yet.</p>
          ) : (
            <ul className="space-y-3">
              {securityRows.map((row) => (
                <li key={row.id} className="rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2">
                  <p className="text-sm font-bold text-slate-900">{eventLabel(row)}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{fmtWhen(row.created_at)}</p>
                  <p className="text-xs text-slate-600 mt-1">
                    Outcome: <span className="font-semibold">{row.outcome || "unknown"}</span>
                    {row?.ip_address ? ` • IP: ${row.ip_address}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
