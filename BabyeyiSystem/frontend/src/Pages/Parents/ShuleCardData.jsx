import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, BarChart3 } from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://localhost:5100";

function rwf(v) {
  return `${Number(v || 0).toLocaleString()} RWF`;
}

function DataTable({ title, rows, columns, empty }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-800/70 p-4 sm:p-5 shadow-sm">
      <h2 className="font-extrabold text-slate-900 dark:text-slate-100 mb-3">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-500 py-5 text-center">{empty}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-100">
                {columns.map((c) => (
                  <th key={c.key} className="py-2 pr-3 font-bold whitespace-nowrap">{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 last:border-0">
                  {columns.map((c) => (
                    <td key={c.key} className="py-2 pr-3 whitespace-nowrap text-slate-700 dark:text-slate-200">
                      {c.render ? c.render(r) : (r[c.key] ?? "-")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default function ShuleCardData() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [topups, setTopups] = useState([]);
  const [limits, setLimits] = useState([]);
  const [spending, setSpending] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`${API}/api/parent-portal/shulecard/data`, { credentials: "include" });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.success) throw new Error(json.message || "Failed to load data");
        if (cancelled) return;
        setTopups(Array.isArray(json.data?.topups) ? json.data.topups : []);
        setLimits(Array.isArray(json.data?.limits) ? json.data.limits : []);
        setSpending(Array.isArray(json.data?.spending) ? json.data.spending : []);
      } catch (e) {
        if (!cancelled) setError(e.message || "Could not load ShuleCard data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="max-w-6xl mx-auto pb-8 space-y-4 text-slate-900 dark:text-slate-100">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-orange-500" />
          <h1 className="text-2xl font-extrabold tracking-tight">ShuleCard Data</h1>
        </div>
        <Link to="/parents/shulecard" className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600">
          <ArrowLeft className="w-4 h-4" />
          Back to ShuleCard
        </Link>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Loading ShuleCard data...</div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>
      ) : (
        <div className="space-y-4">
          <DataTable
            title="All Top Ups"
            rows={topups}
            empty="No top-up records yet."
            columns={[
              { key: "student", label: "Student", render: (r) => `${r.first_name || ""} ${r.last_name || ""}`.trim() || "-" },
              { key: "school_name", label: "School" },
              { key: "class_name", label: "Class" },
              { key: "amount_rwf", label: "Amount", render: (r) => rwf(r.amount_rwf) },
              { key: "payment_method", label: "Method", render: (r) => String(r.payment_method || "-").toUpperCase() },
              { key: "reference_no", label: "Reference" },
              { key: "created_at", label: "Date", render: (r) => (r.created_at ? new Date(r.created_at).toLocaleString() : "-") },
            ]}
          />
          <DataTable
            title="All Daily Spending Limits"
            rows={limits}
            empty="No daily limit records yet."
            columns={[
              { key: "student", label: "Student", render: (r) => `${r.first_name || ""} ${r.last_name || ""}`.trim() || "-" },
              { key: "school_name", label: "School" },
              { key: "class_name", label: "Class" },
              { key: "balance_rwf", label: "Wallet Balance", render: (r) => rwf(r.balance_rwf) },
              { key: "daily_limit_rwf", label: "Daily Limit", render: (r) => rwf(r.daily_limit_rwf) },
              { key: "updated_at", label: "Updated", render: (r) => (r.updated_at ? new Date(r.updated_at).toLocaleString() : "-") },
            ]}
          />
          <DataTable
            title="All Child Spending on Wallets"
            rows={spending}
            empty="No child spending records yet."
            columns={[
              { key: "student", label: "Student", render: (r) => `${r.first_name || ""} ${r.last_name || ""}`.trim() || "-" },
              { key: "school_name", label: "School" },
              { key: "class_name", label: "Class" },
              { key: "merchant_name", label: "Merchant" },
              { key: "amount_rwf", label: "Spent", render: (r) => rwf(r.amount_rwf) },
              { key: "note", label: "Note" },
              { key: "spent_at", label: "Date", render: (r) => (r.spent_at ? new Date(r.spent_at).toLocaleString() : "-") },
            ]}
          />
        </div>
      )}
    </div>
  );
}

