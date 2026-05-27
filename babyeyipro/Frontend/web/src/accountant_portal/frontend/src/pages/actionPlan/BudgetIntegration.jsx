import { useState, useEffect, useCallback, useMemo } from "react";
import {
  DollarSign, AlertTriangle, CheckCircle, Menu, X, BookOpen, LayoutDashboard,
  FileText, Layers, BarChart2, Bell, Calendar, ChevronRight, ArrowUpRight, Plus,
  Download, Eye, Edit2, PieChart, Activity, Loader2
} from "lucide-react";
import { useActionPlanData } from "../../context/ActionPlanDataContext";
import { fetchActionPlanActivities, recordActivityExpense } from "../../services/actionPlanApi";
import { fmtCompact, pct } from "../../utils/actionPlanFormatters";
import ActionPlanPageHero from "./ActionPlanPageHero";

const STATUS_BADGE = {
  Critical: "bg-red-100 text-red-600 border border-red-200",
  Warning: "bg-amber-100 text-amber-600 border border-amber-200",
  Healthy: "bg-emerald-100 text-emerald-600 border border-emerald-200",
  Unused: "bg-gray-100 text-gray-500 border border-gray-200",
};

function lineStatus(used, allocated) {
  const p = pct(used, allocated);
  if (p >= 95) return "Critical";
  if (p >= 80) return "Warning";
  if (used === 0) return "Unused";
  return "Healthy";
}

function BudgetBar({ used, total, warn = 80 }) {
  const p = pct(used, total);
  const color = p >= 95 ? "bg-red-500" : p >= warn ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className="relative">
      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(p, 100)}%` }} />
      </div>
    </div>
  );
}

function RecordExpenseModal({ activity, onClose, onSaved }) {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    const amt = Number(String(amount).replace(/,/g, ""));
    if (!amt || amt <= 0) {
      setErr("Enter a valid amount");
      return;
    }
    setSaving(true);
    setErr("");
    try {
      await recordActivityExpense(activity.id, { amount: amt, description, expenseDate });
      onSaved?.();
      onClose();
    } catch (e) {
      setErr(e.message || "Failed to record expense");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl p-6">
        <h3 className="font-bold text-[#000435] mb-1">Record expense</h3>
        <p className="text-xs text-gray-500 mb-4">{activity.activityName}</p>
        <div className="space-y-3">
          <input type="text" inputMode="numeric" placeholder="Amount (RWF)" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))} className="w-full border rounded-xl px-3 py-2 text-sm" />
          <input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} className="w-full border rounded-xl px-3 py-2 text-sm" />
          <textarea rows={2} placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full border rounded-xl px-3 py-2 text-sm resize-none" />
        </div>
        {err && <p className="text-sm text-red-600 mt-2">{err}</p>}
        <div className="flex justify-end gap-2 mt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
          <button type="button" disabled={saving} onClick={submit} className="px-4 py-2 text-sm bg-[#000435] text-white rounded-lg disabled:opacity-60">
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BudgetIntegration({ embedded = false }) {
  const { options, totals, reload } = useActionPlanData();
  const [tab, setTab] = useState("lines");
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expenseActivity, setExpenseActivity] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const acts = await fetchActionPlanActivities();
      setActivities(acts);
    } catch {
      setActivities([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const budgetLines = useMemo(() => {
    const lines = options?.budgetLines || [];
    return lines.map((bl) => {
      const linked = activities.filter((a) => Number(a.budgetLineId) === Number(bl.id));
      const usedFromActs = linked.reduce((s, a) => s + Number(a.usedAmount || 0), 0);
      const used = Number(bl.used || 0) || usedFromActs;
      const allocated = Number(bl.planned || 0);
      return {
        id: bl.id,
        line: bl.name,
        allocated,
        used,
        activities: linked.length,
        status: lineStatus(used, allocated),
        department: bl.department,
      };
    });
  }, [options?.budgetLines, activities]);

  const activityMapping = useMemo(() => {
    const lineById = Object.fromEntries((options?.budgetLines || []).map((l) => [l.id, l.name]));
    return activities
      .filter((a) => a.budgetLineId || Number(a.estimatedCost) > 0)
      .map((a) => ({
        id: a.id,
        activity: a.activityName,
        budgetLine: lineById[a.budgetLineId] || "Unassigned",
        planned: Number(a.estimatedCost || 0),
        used: Number(a.usedAmount || 0),
        activityRef: a,
      }));
  }, [activities, options?.budgetLines]);

  const totalAllocated = budgetLines.reduce((s, b) => s + b.allocated, 0) || Number(totals.plannedBudget || 0);
  const totalUsed = budgetLines.reduce((s, b) => s + b.used, 0) || Number(totals.usedBudget || 0);
  const totalRemaining = Math.max(0, totalAllocated - totalUsed);
  const overallPct = pct(totalUsed, totalAllocated);

  const onExpenseSaved = () => {
    load();
    reload?.();
  };

  return (
    <div className={`${embedded ? 'w-full min-h-0' : 'flex h-screen overflow-hidden'} bg-gray-50 font-['Montserrat']`}>
      <div className={embedded ? "w-full" : "flex-1 flex flex-col min-w-0 overflow-hidden"}>
        {!embedded && (
          <ActionPlanPageHero pageId="ap-budget" />
        )}

        <main className={`${embedded ? "p-4 md:p-6 pb-12 space-y-6" : "flex-1 overflow-y-auto p-4 md:p-6 space-y-6"}`}>
          <div className="bg-gradient-to-r from-[#000435] to-[#001580] rounded-2xl p-5 md:p-6 text-white">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
              <div>
                <p className="text-white/60 text-sm mb-1">Overall Budget Utilization</p>
                <p className="text-3xl font-bold">{overallPct}%</p>
              </div>
              <div className="grid grid-cols-3 gap-4 text-right">
                <div><p className="text-white/50 text-xs">Allocated</p><p className="text-lg font-bold">{fmtCompact(totalAllocated)}</p></div>
                <div><p className="text-white/50 text-xs">Used</p><p className="text-lg font-bold text-amber-400">{fmtCompact(totalUsed)}</p></div>
                <div><p className="text-white/50 text-xs">Remaining</p><p className="text-lg font-bold text-emerald-400">{fmtCompact(totalRemaining)}</p></div>
              </div>
            </div>
            <div className="h-3 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-amber-400 rounded-full" style={{ width: `${overallPct}%` }} />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><Loader2 size={32} className="animate-spin text-amber-500" /></div>
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { label: "Budget Lines", value: budgetLines.length, icon: PieChart, color: "from-[#000435] to-[#001080]" },
                  { label: "Critical Lines", value: budgetLines.filter((b) => pct(b.used, b.allocated) >= 90).length, icon: AlertTriangle, color: "from-red-500 to-red-600" },
                  { label: "Activities Linked", value: activityMapping.length, icon: Activity, color: "from-amber-500 to-amber-600" },
                  { label: "Healthy Lines", value: budgetLines.filter((b) => pct(b.used, b.allocated) < 80).length, icon: CheckCircle, color: "from-emerald-500 to-emerald-600" },
                ].map((stat) => {
                  const StatIcon = stat.icon;
                  return (
                  <div key={stat.label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-3`}><StatIcon size={18} className="text-white" /></div>
                    <p className="text-2xl font-bold text-[#000435]">{stat.value}</p>
                    <p className="text-xs text-gray-500">{stat.label}</p>
                  </div>
                  );
                })}
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex border-b border-gray-100">
                  {[{ key: "lines", label: "Budget Lines" }, { key: "mapping", label: "Activity Mapping" }, { key: "warnings", label: "Warnings" }].map((t) => (
                    <button key={t.key} type="button" onClick={() => setTab(t.key)}
                      className={`px-5 py-3.5 text-sm font-semibold border-b-2 ${tab === t.key ? "border-amber-500 text-amber-600" : "border-transparent text-gray-500"}`}>
                      {t.label}
                    </button>
                  ))}
                </div>

                {tab === "lines" && (
                  <div className="divide-y divide-gray-50">
                    {budgetLines.length === 0 ? (
                      <p className="p-8 text-center text-gray-500 text-sm">No budget lines configured.</p>
                    ) : budgetLines.map((b) => {
                      const p = pct(b.used, b.allocated);
                      const remaining = b.allocated - b.used;
                      return (
                        <div key={b.id} className="px-4 md:px-6 py-4">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-semibold text-[#000435] text-sm">{b.line}</p>
                              <p className="text-xs text-gray-400">{b.activities} activities linked</p>
                            </div>
                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_BADGE[b.status]}`}>{b.status}</span>
                          </div>
                          <BudgetBar used={b.used} total={b.allocated} />
                          <div className="grid grid-cols-3 mt-3 gap-2 text-center text-xs">
                            <div className="bg-gray-50 rounded-xl p-2"><p className="text-gray-400">Allocated</p><p className="font-bold">{fmtCompact(b.allocated)}</p></div>
                            <div className="bg-gray-50 rounded-xl p-2"><p className="text-gray-400">Used</p><p className="font-bold text-amber-600">{fmtCompact(b.used)}</p></div>
                            <div className="bg-gray-50 rounded-xl p-2"><p className="text-gray-400">Remaining</p><p className="font-bold text-emerald-600">{fmtCompact(remaining)}</p></div>
                          </div>
                          <p className="text-xs text-gray-400 mt-2"><span className="font-semibold text-[#000435]">{p}%</span> utilized</p>
                        </div>
                      );
                    })}
                  </div>
                )}

                {tab === "mapping" && (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50 border-b">
                          {["Activity", "Budget Line", "Planned", "Used", "Remaining", "Action"].map((h) => (
                            <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {activityMapping.map((m) => (
                          <tr key={m.id} className="hover:bg-amber-50/30">
                            <td className="px-4 py-3 text-sm font-medium text-[#000435]">{m.activity}</td>
                            <td className="px-4 py-3 text-sm">{m.budgetLine}</td>
                            <td className="px-4 py-3 text-sm">{fmtCompact(m.planned)}</td>
                            <td className="px-4 py-3 text-sm text-amber-600 font-semibold">{fmtCompact(m.used)}</td>
                            <td className="px-4 py-3 text-sm text-emerald-600">{fmtCompact(m.planned - m.used)}</td>
                            <td className="px-4 py-3">
                              <button type="button" onClick={() => setExpenseActivity(m.activityRef)} className="text-xs text-[#000435] font-semibold hover:underline">+ Expense</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {activityMapping.length === 0 && <p className="p-8 text-center text-gray-500 text-sm">No activities with budget data.</p>}
                  </div>
                )}

                {tab === "warnings" && (
                  <div className="p-4 space-y-3">
                    {budgetLines.filter((b) => pct(b.used, b.allocated) >= 80).map((b) => {
                      const p = pct(b.used, b.allocated);
                      return (
                        <div key={b.id} className={`flex items-center gap-4 p-4 rounded-xl border ${p >= 95 ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"}`}>
                          <AlertTriangle size={18} className={p >= 95 ? "text-red-500" : "text-amber-500"} />
                          <div className="flex-1">
                            <p className="font-semibold text-sm">{b.line}</p>
                            <p className="text-xs text-gray-500">{p}% used · {fmtCompact(b.allocated - b.used)} remaining</p>
                          </div>
                          <span className="text-xs font-bold">{p}%</span>
                        </div>
                      );
                    })}
                    {budgetLines.filter((b) => pct(b.used, b.allocated) >= 80).length === 0 && (
                      <div className="text-center py-12">
                        <CheckCircle size={40} className="mx-auto text-emerald-500 mb-3" />
                        <p className="font-semibold text-gray-600">All budgets are within safe limits</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </main>
      </div>

      {expenseActivity && (
        <RecordExpenseModal
          activity={expenseActivity}
          onClose={() => setExpenseActivity(null)}
          onSaved={onExpenseSaved}
        />
      )}
    </div>
  );
}
