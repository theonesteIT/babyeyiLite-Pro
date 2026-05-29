// ================================================================
// Account.jsx — Babyeyi wallet + parent security audit activity
// ================================================================

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Wallet,
  CalendarDays,
  Filter,
  Home as HomeIcon,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";

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
      if (!res.ok || !json.success)
        throw new Error(json.message || "Failed to load security activity");
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
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 w-full">
          <div className="w-full">
            <h1 className="font-bold text-xl sm:text-2xl text-center sm:text-left leading-tight text-slate-700">
              My Babyeyi Account
            </h1>
          </div>
        </div>
      </div>

      <div className="rounded-3xl flex flex-col sm:flex-row justify-between p-6 sm:p-8 text-slate-700 bg-white shadow-sm">
        <div className="text-center sm:text-left">
          <p className="text-slate-500/85 text-sm font-medium">Available balance</p>
          <p className="text-3xl sm:text-4xl font-extrabold mt-2 tracking-tight">
            11,500 RWF
          </p>
        </div>

        <div className="flex flex-wrap gap-3 justify-center sm:justify-start mt-8">
          <button
            type="button"
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 font-semibold text-sm border border-amber-500 transition-colors"
          >
            + Add funds
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 font-semibold text-sm border border-amber-500 transition-colors"
          >
            <CalendarDays size={18} />
            All history
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <h2 className="font-bold text-slate-900">Recent transactions</h2>
          <button
            type="button"
            className="p-2 rounded-lg text-slate-400 hover:bg-slate-50"
            aria-label="Filter"
          >
            <Filter size={18} />
          </button>
        </div>
        <div className="py-14 px-6 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <Wallet className="w-8 h-8 text-slate-400" />
          </div>
          <p className="font-bold text-slate-600">No transactions yet</p>
          <p className="text-sm text-slate-400 mt-1 max-w-xs mx-auto">
            Your transaction history will appear here when you add funds or make
            payments.
          </p>
        </div>
      </div>
    </div>
  );
}
