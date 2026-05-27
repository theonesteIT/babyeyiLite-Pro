import { useState, useEffect, useCallback, useMemo } from "react";
import {
  CheckCircle, XCircle, Clock, MessageSquare, Menu, X, BookOpen,
  ChevronRight, Eye, RotateCcw, User, Users, Shield, Loader2
} from "lucide-react";
import { fetchActionPlans, reviewActionPlan } from "../../services/actionPlanApi";
import { fmtMoney, formatDateShort } from "../../utils/actionPlanFormatters";
import ActionPlanPageHero from "./ActionPlanPageHero";

const WORKFLOW_STEPS = [
  { id: 1, role: "Accountant", icon: User, desc: "Creates action plan & submits for review" },
  { id: 2, role: "School Manager", icon: Users, desc: "Reviews and sends for headmaster approval" },
  { id: 3, role: "Headmaster", icon: Shield, desc: "Final approval — activates the plan" },
];

function ReviewModal({ plan, onClose, onReviewed }) {
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (decision) => {
    setSaving(true);
    setErr("");
    try {
      await reviewActionPlan(plan.id, { decision, notes: comment });
      onReviewed?.();
      onClose();
    } catch (e) {
      setErr(e.message || "Review failed — you may need manager permissions.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="bg-[#000435] px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-white font-bold text-base">Review Action Plan</h2>
            <p className="text-white/50 text-xs">{plan.title}</p>
          </div>
          <button type="button" onClick={onClose} className="text-white/60 hover:text-white"><X size={20} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Department</span><span className="font-semibold">{plan.department || "—"}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Term</span><span className="font-semibold">{plan.term}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Budget</span><span className="font-semibold">{fmtMoney(plan.estimatedBudget)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Submitted</span><span className="font-semibold">{formatDateShort(plan.submittedAt)}</span></div>
          </div>
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:border-amber-500"
            placeholder="Add your review comment..." />
          {err && <p className="text-sm text-red-600">{err}</p>}
          <div className="grid grid-cols-3 gap-2">
            <button type="button" disabled={saving} onClick={() => submit("approve")} className="flex flex-col items-center gap-2 p-3 border-2 border-emerald-200 hover:bg-emerald-50 rounded-xl disabled:opacity-60">
              <CheckCircle size={20} className="text-emerald-500" />
              <span className="text-xs font-bold text-emerald-600">Approve</span>
            </button>
            <button type="button" disabled={saving} onClick={() => submit("ongoing")} className="flex flex-col items-center gap-2 p-3 border-2 border-amber-200 hover:bg-amber-50 rounded-xl disabled:opacity-60">
              <RotateCcw size={20} className="text-amber-500" />
              <span className="text-xs font-bold text-amber-600">Mark Ongoing</span>
            </button>
            <button type="button" disabled={saving} onClick={() => submit("reject")} className="flex flex-col items-center gap-2 p-3 border-2 border-red-200 hover:bg-red-50 rounded-xl disabled:opacity-60">
              <XCircle size={20} className="text-red-500" />
              <span className="text-xs font-bold text-red-500">Reject</span>
            </button>
          </div>
        </div>
        <div className="px-5 py-3 border-t flex justify-end">
          <button type="button" onClick={onClose} className="text-gray-500 text-sm">Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default function ApprovalWorkflow({ embedded = false }) {
  const [reviewing, setReviewing] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchActionPlans();
      setPlans(list);
    } catch {
      setPlans([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const pending = useMemo(() => plans.filter((p) => p.status === "pending_approval"), [plans]);
  const recent = useMemo(() => plans
    .filter((p) => ["approved", "cancelled", "ongoing", "completed"].includes(p.status))
    .slice(0, 8)
    .map((p) => ({
      id: p.id,
      title: p.title,
      action: p.statusLabel || p.status,
      date: formatDateShort(p.updatedAt || p.managerReviewedAt),
      color: p.status === "cancelled" ? "red" : p.status === "approved" || p.status === "completed" ? "emerald" : "amber",
    })), [plans]);

  const approvedThisMonth = useMemo(() => plans.filter((p) => {
    if (p.status !== "approved" && p.status !== "ongoing") return false;
    const d = new Date(p.managerReviewedAt || p.updatedAt);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length, [plans]);

  return (
    <div className={`${embedded ? 'w-full min-h-0' : 'flex h-screen overflow-hidden'} bg-gray-50 font-['Montserrat']`}>
      <div className={embedded ? "w-full" : "flex-1 flex flex-col min-w-0 overflow-hidden"}>
        {!embedded && (
          <ActionPlanPageHero pageId="ap-approvals" />
        )}

        <main className={`${embedded ? "p-4 md:p-6 pb-12 space-y-6" : "flex-1 overflow-y-auto p-4 md:p-6 space-y-6"}`}>
          <div className="bg-white rounded-2xl border shadow-sm p-5">
            <p className="text-sm font-bold text-[#000435] mb-5">Approval Process Flow</p>
            <div className="flex items-center">
              {WORKFLOW_STEPS.map((step, i) => {
                const Icon = step.icon;
                return (
                  <div key={step.id} className="flex items-center flex-1">
                    <div className="flex flex-col items-center text-center flex-1">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-2 ${i === 0 ? "bg-[#000435]" : i === 1 ? "bg-amber-500" : "bg-emerald-500"}`}>
                        <Icon size={20} className="text-white" />
                      </div>
                      <p className="text-xs font-bold">{step.role}</p>
                    </div>
                    {i < WORKFLOW_STEPS.length - 1 && <ChevronRight size={12} className="text-amber-400 shrink-0" />}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Pending", value: pending.length, icon: Clock },
              { label: "Approved (Month)", value: approvedThisMonth, icon: CheckCircle },
            ].map((stat) => {
              const StatIcon = stat.icon;
              return (
              <div key={stat.label} className="bg-white rounded-2xl p-4 border shadow-sm">
                <StatIcon size={18} className="text-amber-500 mb-2" />
                <p className="text-2xl font-bold">{loading ? "—" : stat.value}</p>
                <p className="text-xs text-gray-500">{stat.label}</p>
              </div>
              );
            })}
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><Loader2 size={32} className="animate-spin text-amber-500" /></div>
          ) : (
            <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
              <div className="px-4 md:px-6 py-4 border-b">
                <p className="text-sm font-bold">Pending Approvals ({pending.length})</p>
              </div>
              <div className="divide-y">
                {pending.length === 0 ? (
                  <p className="p-8 text-center text-gray-500 text-sm">No plans awaiting approval.</p>
                ) : pending.map((plan) => (
                  <div key={plan.id} className="p-4 md:p-5">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <h3 className="font-bold text-sm">{plan.title}</h3>
                        <p className="text-xs text-gray-400">{plan.department} · {plan.term} · {formatDateShort(plan.submittedAt)}</p>
                      </div>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">Pending</span>
                    </div>
                    {plan.managerReviewNotes && expandedId === plan.id && (
                      <p className="text-xs text-gray-600 bg-gray-50 p-3 rounded-lg mb-3">{plan.managerReviewNotes}</p>
                    )}
                    <div className="flex justify-between items-center">
                      <button type="button" onClick={() => setExpandedId(expandedId === plan.id ? null : plan.id)} className="text-xs text-gray-600 border px-2.5 py-1.5 rounded-lg flex items-center gap-1">
                        <MessageSquare size={12} /> Notes
                      </button>
                      <button type="button" onClick={() => setReviewing(plan)} className="text-xs bg-[#000435] text-white px-3 py-1.5 rounded-lg flex items-center gap-1">
                        <Eye size={12} /> Review
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
            <div className="px-4 md:px-6 py-4 border-b"><p className="text-sm font-bold">Recent Decisions</p></div>
            <div className="divide-y">
              {recent.map((r) => (
                <div key={r.id} className="flex items-center gap-3 px-4 md:px-6 py-3.5">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${r.color === "emerald" ? "bg-emerald-100" : r.color === "red" ? "bg-red-100" : "bg-amber-100"}`}>
                    {r.color === "emerald" ? <CheckCircle size={16} className="text-emerald-600" /> : r.color === "red" ? <XCircle size={16} className="text-red-500" /> : <RotateCcw size={16} className="text-amber-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{r.title}</p>
                    <p className="text-xs text-gray-400">{r.date}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${r.color === "emerald" ? "bg-emerald-100 text-emerald-700" : r.color === "red" ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-700"}`}>
                    {r.action}
                  </span>
                </div>
              ))}
              {!recent.length && !loading && <p className="p-6 text-center text-gray-500 text-sm">No recent decisions.</p>}
            </div>
          </div>
        </main>
      </div>

      {reviewing && (
        <ReviewModal plan={reviewing} onClose={() => setReviewing(false)} onReviewed={load} />
      )}
    </div>
  );
}
