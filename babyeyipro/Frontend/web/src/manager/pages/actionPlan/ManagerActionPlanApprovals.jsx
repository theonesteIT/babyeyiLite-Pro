import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CheckCircle2, XCircle, Clock, Search, RefreshCw, Loader2, X,
  FileText, ChevronRight, MessageSquare, Shield, RotateCcw, Calendar, DollarSign,
} from 'lucide-react';
import ManagerOchreHeroShell from '../../components/ManagerOchreHeroShell';
import ActionPlanPushBanner from '../../../shared/ActionPlanPushBanner';
import api from '../../services/api';
import { fetchActionPlans, reviewActionPlan } from '../../services/actionPlanApi';

const NAVY = '#1E3A5F';
const AMBER = '#F59E0B';

function money(v) {
  return new Intl.NumberFormat('en-RW', { maximumFractionDigits: 0 }).format(Number(v) || 0);
}

function dateShort(d) {
  if (!d) return '—';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '—';
  return dt.toLocaleDateString('en-RW', { month: 'short', day: 'numeric', year: 'numeric' });
}

function statusStyle(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'pending_approval') return { bg: '#FEF3C7', color: '#92400E', label: 'Pending approval' };
  if (s === 'approved') return { bg: '#D1FAE5', color: '#065F46', label: 'Approved' };
  if (s === 'ongoing') return { bg: '#DBEAFE', color: '#1E40AF', label: 'Ongoing' };
  if (s === 'cancelled') return { bg: '#FEE2E2', color: '#991B1B', label: 'Rejected' };
  return { bg: '#F3F4F6', color: '#4B5563', label: status || '—' };
}

function ReviewModal({ plan, onClose, onDone }) {
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (decision) => {
    setSaving(true);
    setErr('');
    try {
      await reviewActionPlan(plan.id, { decision, notes });
      onDone();
      onClose();
    } catch (e) {
      setErr(e.message || 'Review failed');
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 flex items-start justify-between" style={{ background: NAVY }}>
          <div>
            <p className="text-white/60 text-xs uppercase tracking-widest font-bold">Review action plan</p>
            <h2 className="text-white font-bold text-lg mt-1">{plan.title}</h2>
            <p className="text-white/50 text-xs mt-0.5">{plan.planCode} · {plan.term}</p>
          </div>
          <button type="button" onClick={onClose} className="text-white/70 hover:text-white p-1"><X size={20} /></button>
        </div>
        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-slate-50 rounded-xl p-3"><p className="text-xs text-slate-400">Department</p><p className="font-semibold text-slate-800">{plan.department || '—'}</p></div>
            <div className="bg-slate-50 rounded-xl p-3"><p className="text-xs text-slate-400">Budget</p><p className="font-semibold text-slate-800">{money(plan.estimatedBudget)} RWF</p></div>
            <div className="bg-slate-50 rounded-xl p-3 col-span-2"><p className="text-xs text-slate-400">Submitted</p><p className="font-semibold text-slate-800">{dateShort(plan.submittedAt)}</p></div>
          </div>
          {plan.strategicObjective && (
            <div className="text-sm bg-amber-50 border border-amber-100 rounded-xl p-3 text-amber-900">
              <p className="text-xs font-bold uppercase text-amber-700 mb-1">Objective</p>
              {plan.strategicObjective}
            </div>
          )}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Review notes</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1.5 w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
              placeholder="Optional comment for the accountant..."
            />
          </div>
          {err && <p className="text-sm text-red-600">{err}</p>}
          <div className="grid grid-cols-3 gap-2">
            <button type="button" disabled={saving} onClick={() => submit('approve')} className="flex flex-col items-center gap-2 p-3 rounded-xl border-2 border-emerald-200 hover:bg-emerald-50 disabled:opacity-60">
              <CheckCircle2 className="text-emerald-500" size={22} />
              <span className="text-xs font-bold text-emerald-700">Approve</span>
            </button>
            <button type="button" disabled={saving} onClick={() => submit('ongoing')} className="flex flex-col items-center gap-2 p-3 rounded-xl border-2 border-blue-200 hover:bg-blue-50 disabled:opacity-60">
              <RotateCcw className="text-blue-500" size={22} />
              <span className="text-xs font-bold text-blue-700">Ongoing</span>
            </button>
            <button type="button" disabled={saving} onClick={() => submit('reject')} className="flex flex-col items-center gap-2 p-3 rounded-xl border-2 border-red-200 hover:bg-red-50 disabled:opacity-60">
              <XCircle className="text-red-500" size={22} />
              <span className="text-xs font-bold text-red-600">Reject</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function ManagerActionPlanApprovals() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('pending');
  const [reviewing, setReviewing] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

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

  const pending = useMemo(() => plans.filter((p) => p.status === 'pending_approval'), [plans]);
  const recent = useMemo(() => plans.filter((p) => p.status !== 'pending_approval' && p.status !== 'draft').slice(0, 12), [plans]);

  const filtered = useMemo(() => {
    let list = filter === 'pending' ? pending : filter === 'all' ? plans : recent;
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((p) =>
      (p.title || '').toLowerCase().includes(q)
      || (p.department || '').toLowerCase().includes(q)
      || (p.planCode || '').toLowerCase().includes(q)
    );
  }, [filter, pending, plans, recent, search]);

  const kpiTiles = [
    { label: 'Pending approval', value: String(pending.length), sub: 'Needs your decision' },
    { label: 'Approved plans', value: String(plans.filter((p) => p.status === 'approved' || p.status === 'ongoing').length), sub: 'Active & approved' },
    { label: 'Total plans', value: String(plans.length), sub: 'All terms' },
    { label: 'Rejected', value: String(plans.filter((p) => p.status === 'cancelled').length), sub: 'Cancelled / rejected' },
  ];

  return (
    <>
      <ManagerOchreHeroShell
        eyebrow="Finance · Action plans"
        title="Action Plan Approvals"
        subtitle="Review and approve action plans submitted by the accountant"
        HeroIcon={Shield}
        headerRight={(
          <button type="button" onClick={load} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 text-white text-xs font-bold border border-white/20 hover:bg-white/20">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        )}
        kpiTiles={kpiTiles}
        cardBody={(
          <div className="p-4 sm:p-5 space-y-4">
            <ActionPlanPushBanner api={api} />
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search plans..."
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm"
                />
              </div>
              <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                {[
                  { id: 'pending', label: `Pending (${pending.length})` },
                  { id: 'recent', label: 'Recent' },
                  { id: 'all', label: 'All' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setFilter(t.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === t.id ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-16"><Loader2 size={32} className="animate-spin text-amber-500" /></div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                <FileText size={40} className="mx-auto mb-3 opacity-30" />
                <p className="font-semibold">No action plans in this view</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((plan) => {
                  const st = statusStyle(plan.status);
                  const isPending = plan.status === 'pending_approval';
                  return (
                    <div key={plan.id} className="border border-slate-100 rounded-2xl p-4 hover:border-amber-200 hover:shadow-sm transition-all bg-white">
                      <div className="flex flex-col lg:flex-row lg:items-center gap-4 justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <h3 className="font-bold text-slate-900 truncate">{plan.title}</h3>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                          </div>
                          <p className="text-xs text-slate-500 flex flex-wrap gap-x-3 gap-y-1">
                            <span>{plan.planCode}</span>
                            <span>{plan.department}</span>
                            <span>{plan.term} · {plan.academicYear}</span>
                          </p>
                          <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-600">
                            <span className="inline-flex items-center gap-1"><DollarSign size={12} />{money(plan.estimatedBudget)} RWF</span>
                            <span className="inline-flex items-center gap-1"><Calendar size={12} />Submitted {dateShort(plan.submittedAt)}</span>
                            <span>{plan.activityCount || 0} activities</span>
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          {plan.managerReviewNotes && (
                            <button type="button" onClick={() => setExpandedId(expandedId === plan.id ? null : plan.id)} className="px-3 py-2 text-xs font-semibold border rounded-xl hover:border-amber-300 flex items-center gap-1">
                              <MessageSquare size={14} /> Notes
                            </button>
                          )}
                          {isPending && (
                            <button
                              type="button"
                              onClick={() => setReviewing(plan)}
                              className="px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1.5"
                              style={{ background: NAVY }}
                            >
                              Review <ChevronRight size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                      {expandedId === plan.id && plan.managerReviewNotes && (
                        <p className="mt-3 text-sm text-slate-600 bg-slate-50 rounded-xl p-3 border border-slate-100">{plan.managerReviewNotes}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      />

      {reviewing && <ReviewModal plan={reviewing} onClose={() => setReviewing(null)} onDone={load} />}
    </>
  );
}
