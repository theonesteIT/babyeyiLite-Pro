import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import {
  Loader2, PlusCircle, Save, Check, TriangleAlert, Info, CalendarDays, Bell, Download,
  ClipboardList, Wallet, Target, Clock, CheckCircle2, AlertCircle,
} from 'lucide-react';
import { useActionPlanData } from '../../context/ActionPlanDataContext';
import ActionPlanSelector from '../../components/ActionPlanSelector';
import ActionPlanCreateForm from '../../components/ActionPlanCreateForm';
import { AP_COLORS } from '../../utils/actionPlanConstants';
import {
  createActionPlan, createActionPlanActivity, recordActivityExpense, updateActionPlanActivity, reviewActionPlan,
} from '../../services/actionPlanApi';
import { useIsMobile } from '../../utils/useIsMobile';

const NAVY = AP_COLORS.navy;
const AMBER = AP_COLORS.amber;
const CHART = [AMBER, NAVY];

const inp = { width: '100%', boxSizing: 'border-box', border: `1px solid ${AP_COLORS.gray200}`, borderRadius: 8, padding: '10px 12px', fontSize: 13, color: NAVY };
const lbl = { display: 'block', fontSize: 11, fontWeight: 700, color: AP_COLORS.gray400, marginBottom: 6, textTransform: 'uppercase' };

function TabFrame({ title, subtitle, fmt, children, requirePlan = true }) {
  const { planId, setPlanId, loading, error, reload, activePlan } = useActionPlanData();
  return (
    <div>
      <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800, color: NAVY }}>{title}</h2>
      {subtitle && <p style={{ margin: '0 0 16px', fontSize: 13, color: AP_COLORS.gray400 }}>{subtitle}</p>}
      <ActionPlanSelector planId={planId} onPlanIdChange={setPlanId} fmt={fmt} />
      {error && (
        <div style={{ background: '#FEE2E2', color: '#991B1B', padding: 12, borderRadius: 8, marginBottom: 12, display: 'flex', justifyContent: 'space-between' }}>
          <span>{error}</span>
          <button type="button" onClick={reload} style={{ border: 'none', background: '#fff', borderRadius: 6, padding: '4px 10px', fontWeight: 600, cursor: 'pointer' }}>Retry</button>
        </div>
      )}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 48 }}><Loader2 size={32} color={AMBER} style={{ animation: 'spin 1s linear infinite' }} /></div>
      ) : requirePlan && !activePlan ? (
        <p style={{ color: AP_COLORS.gray400 }}>Select or create an action plan.</p>
      ) : children}
    </div>
  );
}

export function ActionPlanDashboardPage({ fmt, onOpenCreate }) {
  const isMobile = useIsMobile();
  const { planId, setPlanId, totals, activities, notifications, departmentUsage, activePlan, reload, loading, data } = useActionPlanData();
  if (loading && !data) {
    return <div style={{ textAlign: 'center', padding: 48 }}><Loader2 size={36} color={AMBER} /></div>;
  }
  const cards = [
    { label: 'Total plans', value: totals.totalPlans, Icon: ClipboardList },
    { label: 'Activities', value: totals.totalActivities, Icon: Target },
    { label: 'Planned budget', value: fmt(totals.plannedBudget), Icon: Wallet },
    { label: 'Used budget', value: fmt(totals.usedBudget), Icon: Wallet },
    { label: 'Remaining', value: fmt(totals.remainingBudget), Icon: Wallet },
    { label: 'Completed', value: totals.completedActivities, Icon: CheckCircle2 },
    { label: 'Ongoing', value: totals.ongoingActivities, Icon: Clock },
    { label: 'Delayed', value: totals.delayedActivities, Icon: AlertCircle },
  ];
  return (
    <div>
      <div className="ap-hero" style={{ background: `linear-gradient(135deg, ${NAVY}, #1e3a5f)`, borderRadius: 16, padding: isMobile ? 18 : 24, color: '#fff', marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', opacity: 0.8 }}>SCHOOL ACTION PLAN</div>
        <h1 style={{ margin: '6px 0', fontSize: isMobile ? 22 : 28, fontWeight: 800 }}>Action Plan Dashboard</h1>
        <p style={{ margin: 0, opacity: 0.85, fontSize: 14 }}>
          {activePlan ? `${activePlan.title} Â· ${activePlan.term}` : 'Plan, monitor, and track school activities'}
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>
          <button type="button" onClick={() => onOpenCreate?.()} style={{ background: AMBER, color: NAVY, border: 'none', borderRadius: 8, padding: '8px 14px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <PlusCircle size={16} /> Create action plan
          </button>
          <button type="button" onClick={reload} style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8, padding: '8px 14px', fontWeight: 600, cursor: 'pointer' }}>Refresh</button>
        </div>
      </div>
      <ActionPlanSelector planId={planId} onPlanIdChange={setPlanId} fmt={fmt} />
      <div className="ap-grid-4" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {cards.map((c) => {
          const Icon = c.Icon;
          return (
            <div key={c.label} style={{ background: '#fff', borderRadius: 12, padding: 16, border: `1px solid ${AP_COLORS.gray200}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: AP_COLORS.gray400, textTransform: 'uppercase' }}>{c.label}</span>
                <Icon size={18} color={AMBER} />
              </div>
              <div style={{ fontSize: isMobile ? 16 : 20, fontWeight: 800, color: NAVY, marginTop: 8 }}>{c.value}</div>
            </div>
          );
        })}
      </div>
      <div className="ap-grid-2" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
        <div style={{ background: '#fff', borderRadius: 12, padding: 18, border: `1px solid ${AP_COLORS.gray200}` }}>
          <div style={{ fontWeight: 700, color: NAVY, marginBottom: 12 }}>Department usage</div>
          {departmentUsage.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={departmentUsage.map((d) => ({ name: (d.department || '').slice(0, 8), used: d.used / 1e6, planned: d.planned / 1e6 }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={(v) => `${v}M`} />
                <Bar dataKey="planned" fill={NAVY} name="Planned" />
                <Bar dataKey="used" fill={AMBER} name="Used" />
              </BarChart>
            </ResponsiveContainer>
          ) : <p style={{ color: AP_COLORS.gray400 }}>No data yet</p>}
        </div>
        <div style={{ background: '#fff', borderRadius: 12, padding: 18, border: `1px solid ${AP_COLORS.gray200}` }}>
          <div style={{ fontWeight: 700, color: NAVY, marginBottom: 12 }}>Alerts</div>
          {notifications.length ? notifications.slice(0, 5).map((n) => (
            <div key={n.id} style={{ fontSize: 12, padding: '8px 0', borderBottom: `1px solid ${AP_COLORS.gray100}`, display: 'flex', gap: 8 }}>
              <TriangleAlert size={14} color={AMBER} />
              {n.message}
            </div>
          )) : <p style={{ color: AP_COLORS.gray400, fontSize: 13 }}>No alerts</p>}
        </div>
      </div>
      {activities.length > 0 && (
        <div style={{ marginTop: 16, background: '#fff', borderRadius: 12, border: `1px solid ${AP_COLORS.gray200}`, overflow: 'hidden' }}>
          <div style={{ padding: 14, fontWeight: 700, color: NAVY }}>Activity progress</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr style={{ background: NAVY, color: '#fff' }}>{['Activity', 'Planned', 'Used', 'Progress'].map((h) => <th key={h} style={{ padding: 10, textAlign: 'left' }}>{h}</th>)}</tr></thead>
            <tbody>
              {activities.slice(0, 8).map((a) => (
                <tr key={a.id} style={{ borderBottom: `1px solid ${AP_COLORS.gray100}` }}>
                  <td style={{ padding: 10, fontWeight: 600 }}>{a.activityName}</td>
                  <td style={{ padding: 10 }}>{fmt(a.estimatedCost)}</td>
                  <td style={{ padding: 10 }}>{fmt(a.usedAmount)}</td>
                  <td style={{ padding: 10 }}>{a.progressPct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function CreateActionPlanPage({ fmt }) {
  const { options, reload, setPlanId } = useActionPlanData();
  const [form, setForm] = useState({ title: '', academicYear: '', term: 'Term 1', department: 'Administration', strategicObjective: '', startDate: '', endDate: '', responsibleName: '', estimatedBudget: '', fundingSource: 'Student Fees', priorityLevel: 'Medium', status: 'draft' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const submit = async (submitForApproval) => {
    setSaving(true);
    setMsg('');
    try {
      const plan = await createActionPlan({ ...form, estimatedBudget: Number(form.estimatedBudget) || 0, submit: submitForApproval });
      setPlanId(plan.id);
      await reload();
      setMsg(submitForApproval ? 'Submitted for approval' : 'Action plan saved');
    } catch (e) {
      setMsg(e.message);
    } finally {
      setSaving(false);
    }
  };

  const f = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  return (
    <TabFrame title="Create Action Plan" subtitle="Plan school activities for a term or academic year" fmt={fmt} requirePlan={false}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: `1px solid ${AP_COLORS.gray200}` }}>
        <div className="ap-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div><label style={lbl}>Title *</label><input style={inp} value={form.title} onChange={(e) => f('title', e.target.value)} /></div>
          <div><label style={lbl}>Academic year</label>
            <select style={inp} value={form.academicYear} onChange={(e) => f('academicYear', e.target.value)}>
              <option value="">Select</option>
              {(options?.academicYears || []).map((y) => <option key={y}>{y}</option>)}
            </select>
          </div>
          <div><label style={lbl}>Term</label>
            <select style={inp} value={form.term} onChange={(e) => f('term', e.target.value)}>
              {(options?.terms || ['Term 1', 'Term 2', 'Term 3']).map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div><label style={lbl}>Department</label>
            <select style={inp} value={form.department} onChange={(e) => f('department', e.target.value)}>
              {(options?.departments || []).map((d) => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div style={{ gridColumn: '1 / -1' }}><label style={lbl}>Strategic objective</label><textarea style={{ ...inp, minHeight: 80 }} value={form.strategicObjective} onChange={(e) => f('strategicObjective', e.target.value)} /></div>
          <div><label style={lbl}>Start date</label><input type="date" style={inp} value={form.startDate} onChange={(e) => f('startDate', e.target.value)} /></div>
          <div><label style={lbl}>End date</label><input type="date" style={inp} value={form.endDate} onChange={(e) => f('endDate', e.target.value)} /></div>
          <div><label style={lbl}>Responsible person</label><input style={inp} value={form.responsibleName} onChange={(e) => f('responsibleName', e.target.value)} /></div>
          <div><label style={lbl}>Estimated budget (RWF)</label><input type="number" style={inp} value={form.estimatedBudget} onChange={(e) => f('estimatedBudget', e.target.value)} /></div>
          <div><label style={lbl}>Funding source</label>
            <select style={inp} value={form.fundingSource} onChange={(e) => f('fundingSource', e.target.value)}>
              {(options?.fundingSources || []).map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div><label style={lbl}>Priority</label>
            <select style={inp} value={form.priorityLevel} onChange={(e) => f('priorityLevel', e.target.value)}>
              {(options?.priorities || []).map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
        </div>
        {msg && <p style={{ marginTop: 12, color: NAVY, fontWeight: 600 }}>{msg}</p>}
        <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
          <button type="button" disabled={saving} onClick={() => submit(false)} style={{ background: NAVY, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontWeight: 700, cursor: 'pointer' }}>Save draft</button>
          <button type="button" disabled={saving} onClick={() => submit(true)} style={{ background: AMBER, color: NAVY, border: 'none', borderRadius: 8, padding: '10px 18px', fontWeight: 700, cursor: 'pointer' }}>Submit for approval</button>
        </div>
      </div>
    </TabFrame>
  );
}

export function ActivitiesPage({ fmt }) {
  const { activities, planId, options, reload } = useActionPlanData();
  const [form, setForm] = useState({ activityName: '', category: '', department: '', estimatedCost: '', plannedStart: '', plannedEnd: '', budgetLineId: '' });
  const [saving, setSaving] = useState(false);

  const add = async () => {
    if (!planId) return;
    setSaving(true);
    try {
      await createActionPlanActivity({
        actionPlanId: planId,
        activityName: form.activityName,
        category: form.category,
        department: form.department,
        estimatedCost: Number(form.estimatedCost) || 0,
        plannedStart: form.plannedStart,
        plannedEnd: form.plannedEnd,
        budgetLineId: form.budgetLineId || null,
      });
      setForm({ activityName: '', category: '', department: '', estimatedCost: '', plannedStart: '', plannedEnd: '', budgetLineId: '' });
      reload();
    } finally {
      setSaving(false);
    }
  };

  return (
    <TabFrame title="Activities" fmt={fmt}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 16, border: `1px solid ${AP_COLORS.gray200}`, marginBottom: 16 }}>
        <div style={{ fontWeight: 700, color: NAVY, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}><PlusCircle size={18} /> Add activity</div>
        <div className="ap-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <input style={inp} placeholder="Activity name *" value={form.activityName} onChange={(e) => setForm({ ...form, activityName: e.target.value })} />
          <select style={inp} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            <option value="">Category</option>
            {(options?.activityCategories || []).map((c) => <option key={c}>{c}</option>)}
          </select>
          <input type="number" style={inp} placeholder="Estimated cost" value={form.estimatedCost} onChange={(e) => setForm({ ...form, estimatedCost: e.target.value })} />
          <select style={inp} value={form.budgetLineId} onChange={(e) => setForm({ ...form, budgetLineId: e.target.value })}>
            <option value="">Link budget line</option>
            {(options?.budgetLines || []).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
        <button type="button" disabled={saving} onClick={add} style={{ marginTop: 12, background: AMBER, color: NAVY, border: 'none', borderRadius: 8, padding: '10px 16px', fontWeight: 700, cursor: 'pointer' }}>Add activity</button>
      </div>
      <table style={{ width: '100%', background: '#fff', borderRadius: 12, borderCollapse: 'collapse', fontSize: 13, overflow: 'hidden' }}>
        <thead><tr style={{ background: NAVY, color: '#fff' }}>{['Activity', 'Dept', 'Planned', 'Used', 'Progress', 'Status'].map((h) => <th key={h} style={{ padding: 10, textAlign: 'left' }}>{h}</th>)}</tr></thead>
        <tbody>
          {activities.map((a) => (
            <tr key={a.id} style={{ borderBottom: `1px solid ${AP_COLORS.gray100}` }}>
              <td style={{ padding: 10, fontWeight: 600 }}>{a.activityName}</td>
              <td style={{ padding: 10 }}>{a.department}</td>
              <td style={{ padding: 10 }}>{fmt(a.estimatedCost)}</td>
              <td style={{ padding: 10 }}>{fmt(a.usedAmount)}</td>
              <td style={{ padding: 10 }}>{a.progressPct}%</td>
              <td style={{ padding: 10 }}><span style={{ background: '#FEF3C7', padding: '2px 8px', borderRadius: 12, fontSize: 11 }}>{a.statusLabel}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </TabFrame>
  );
}

export function BudgetTrackingPage({ fmt }) {
  const { activities, reload } = useActionPlanData();
  const [expForm, setExpForm] = useState({ activityId: '', amount: '', description: '', expenseDate: '' });
  const record = async () => {
    if (!expForm.activityId || !expForm.amount) return;
    await recordActivityExpense(Number(expForm.activityId), {
      amount: Number(expForm.amount),
      description: expForm.description,
      expenseDate: expForm.expenseDate,
    });
    setExpForm({ activityId: '', amount: '', description: '', expenseDate: '' });
    reload();
  };
  return (
    <TabFrame title="Budget Tracking" subtitle="Activity costs linked to school budget lines" fmt={fmt}>
      <div style={{ background: '#fff', padding: 16, borderRadius: 12, marginBottom: 16, border: `1px solid ${AP_COLORS.gray200}` }}>
        <div style={{ fontWeight: 700, color: NAVY, marginBottom: 10 }}>Record expense</div>
        <select style={{ ...inp, marginBottom: 8 }} value={expForm.activityId} onChange={(e) => setExpForm({ ...expForm, activityId: e.target.value })}>
          <option value="">Select activity</option>
          {activities.map((a) => <option key={a.id} value={a.id}>{a.activityName}</option>)}
        </select>
        <input style={{ ...inp, marginBottom: 8 }} type="number" placeholder="Amount RWF" value={expForm.amount} onChange={(e) => setExpForm({ ...expForm, amount: e.target.value })} />
        <input style={{ ...inp, marginBottom: 8 }} type="date" value={expForm.expenseDate} onChange={(e) => setExpForm({ ...expForm, expenseDate: e.target.value })} />
        <input style={inp} placeholder="Description" value={expForm.description} onChange={(e) => setExpForm({ ...expForm, description: e.target.value })} />
        <button type="button" onClick={record} style={{ marginTop: 10, background: AMBER, color: NAVY, border: 'none', borderRadius: 8, padding: '10px 16px', fontWeight: 700, cursor: 'pointer' }}>Record expense</button>
      </div>
      <table style={{ width: '100%', background: '#fff', borderRadius: 12, borderCollapse: 'collapse', fontSize: 13 }}>
        <thead><tr style={{ background: NAVY, color: '#fff' }}>{['Activity', 'Planned', 'Used', 'Remaining', 'Usage %'].map((h) => <th key={h} style={{ padding: 10, textAlign: 'left' }}>{h}</th>)}</tr></thead>
        <tbody>
          {activities.map((a) => (
            <tr key={a.id} style={{ borderBottom: `1px solid ${AP_COLORS.gray100}` }}>
              <td style={{ padding: 10, fontWeight: 600 }}>{a.activityName}</td>
              <td style={{ padding: 10 }}>{fmt(a.estimatedCost)}</td>
              <td style={{ padding: 10, color: a.usagePct >= 100 ? AMBER : NAVY }}>{fmt(a.usedAmount)}</td>
              <td style={{ padding: 10 }}>{fmt(a.remaining)}</td>
              <td style={{ padding: 10, fontWeight: 700 }}>{a.usagePct}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </TabFrame>
  );
}

export function ProgressTrackingPage({ fmt }) {
  const { activities, reload } = useActionPlanData();
  const updateProgress = async (id, progressPct, status) => {
    await updateActionPlanActivity(id, { progressPct, status });
    reload();
  };
  return (
    <TabFrame title="Progress Tracking" fmt={fmt}>
      {activities.map((a) => (
        <div key={a.id} style={{ background: '#fff', borderRadius: 10, padding: 14, marginBottom: 10, border: `1px solid ${AP_COLORS.gray200}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontWeight: 700, color: NAVY }}>{a.activityName}</span>
            <span style={{ fontWeight: 700, color: AMBER }}>{a.progressPct}%</span>
          </div>
          <div style={{ background: AP_COLORS.gray100, borderRadius: 99, height: 8, overflow: 'hidden', marginBottom: 10 }}>
            <div style={{ width: `${a.progressPct}%`, height: '100%', background: AMBER }} />
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['not_started', 'ongoing', 'delayed', 'completed'].map((s) => (
              <button key={s} type="button" onClick={() => updateProgress(a.id, s === 'completed' ? 100 : a.progressPct, s)} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 20, border: `1px solid ${AP_COLORS.gray200}`, background: a.status === s ? AMBER : '#fff', cursor: 'pointer' }}>{s.replace('_', ' ')}</button>
            ))}
          </div>
        </div>
      ))}
    </TabFrame>
  );
}

export function ApprovalsPage({ fmt }) {
  const { activePlan, reload } = useActionPlanData();
  const [notes, setNotes] = useState('');
  return (
    <TabFrame title="Approvals" fmt={fmt}>
      {activePlan && (
        <>
          <div style={{ background: '#fff', padding: 20, borderRadius: 12, border: `1px solid ${AP_COLORS.gray200}` }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: NAVY }}>{activePlan.title}</div>
            <p style={{ color: AP_COLORS.gray600 }}>Status: {activePlan.statusLabel} Â· {fmt(activePlan.estimatedBudget)}</p>
            <textarea style={{ ...inp, marginTop: 12, minHeight: 60 }} placeholder="Review notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button type="button" onClick={() => reviewActionPlan(activePlan.id, { decision: 'approve', notes }).then(reload)} style={{ background: AMBER, color: NAVY, border: 'none', borderRadius: 8, padding: '8px 14px', fontWeight: 700, cursor: 'pointer' }}>Approve</button>
              <button type="button" onClick={() => reviewActionPlan(activePlan.id, { decision: 'reject', notes }).then(reload)} style={{ background: '#fff', color: NAVY, border: `1px solid ${NAVY}`, borderRadius: 8, padding: '8px 14px', fontWeight: 700, cursor: 'pointer' }}>Reject</button>
            </div>
          </div>
        </>
      )}
    </TabFrame>
  );
}

export function ReportsPage({ fmt }) {
  const { totals, activePlan } = useActionPlanData();
  const reports = ['Action Plan Summary', 'Department Activity', 'Budget Utilization', 'Progress Report', 'Delayed Activities'];
  return (
    <TabFrame title="Reports" fmt={fmt} requirePlan={false}>
      <div className="ap-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {reports.map((r) => (
          <div key={r} style={{ background: '#fff', padding: 16, borderRadius: 12, border: `1px solid ${AP_COLORS.gray200}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, color: NAVY }}>{r}</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button type="button" style={{ fontSize: 11, padding: '4px 10px', border: `1px solid ${NAVY}`, borderRadius: 6, background: '#fff', cursor: 'pointer' }}>PDF</button>
              <button type="button" style={{ fontSize: 11, padding: '4px 10px', border: `1px solid ${AMBER}`, borderRadius: 6, background: '#fff', cursor: 'pointer' }}>Excel</button>
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 16, background: NAVY, color: '#fff', padding: 20, borderRadius: 12 }}>
        <div style={{ color: AMBER, fontWeight: 700 }}>Quick summary â€” {activePlan?.title || 'All plans'}</div>
        <p style={{ marginTop: 8 }}>Planned: {fmt(totals.plannedBudget)} Â· Used: {fmt(totals.usedBudget)} Â· Activities: {totals.totalActivities}</p>
      </div>
    </TabFrame>
  );
}

export function AnalyticsPage({ fmt }) {
  const { departmentUsage, activities } = useActionPlanData();
  const pie = departmentUsage.filter((d) => d.used > 0).map((d) => ({ name: d.department, value: d.used }));
  return (
    <TabFrame title="Analytics" fmt={fmt} requirePlan={false}>
      <div className="ap-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ background: '#fff', padding: 18, borderRadius: 12, border: `1px solid ${AP_COLORS.gray200}` }}>
          {pie.length ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart><Pie data={pie} dataKey="value" nameKey="name" outerRadius={80} label>{pie.map((_, i) => <Cell key={i} fill={CHART[i % 2]} />)}</Pie></PieChart>
            </ResponsiveContainer>
          ) : <p style={{ color: AP_COLORS.gray400 }}>No spending data</p>}
        </div>
        <div style={{ background: '#fff', padding: 18, borderRadius: 12, border: `1px solid ${AP_COLORS.gray200}` }}>
          <div style={{ fontWeight: 700, color: NAVY, marginBottom: 12 }}>Completion</div>
          {activities.slice(0, 6).map((a) => (
            <div key={a.id} style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 12, display: 'flex', justifyContent: 'space-between' }}><span>{a.activityName}</span><span>{a.progressPct}%</span></div>
              <div style={{ background: AP_COLORS.gray100, height: 6, borderRadius: 99, marginTop: 4 }}><div style={{ width: `${a.progressPct}%`, height: '100%', background: NAVY, borderRadius: 99 }} /></div>
            </div>
          ))}
        </div>
      </div>
    </TabFrame>
  );
}

export function CalendarPage() {
  const { activities } = useActionPlanData();
  return (
    <TabFrame title="Calendar View" subtitle="Planned activity timeline" fmt={(n) => String(n)}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
        {activities.map((a) => (
          <div key={a.id} style={{ background: '#fff', borderRadius: 10, padding: 14, borderLeft: `4px solid ${AMBER}`, border: `1px solid ${AP_COLORS.gray200}` }}>
            <div style={{ fontWeight: 700, color: NAVY }}>{a.activityName}</div>
            <div style={{ fontSize: 12, color: AP_COLORS.gray600, marginTop: 6 }}>
              <CalendarDays size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
              {a.plannedStart || 'â€”'} â†’ {a.plannedEnd || 'â€”'}
            </div>
          </div>
        ))}
      </div>
    </TabFrame>
  );
}

export function NotificationsPage() {
  const { notifications } = useActionPlanData();
  return (
    <TabFrame title="Notifications" fmt={(n) => String(n)} requirePlan={false}>
      {notifications.length ? notifications.map((n) => (
        <div key={n.id} style={{ background: '#FFFBEB', border: `1px solid ${AMBER}`, borderRadius: 10, padding: 14, marginBottom: 10, display: 'flex', gap: 10 }}>
          <Bell size={18} color={NAVY} />
          <span style={{ fontSize: 13, color: NAVY }}>{n.message}</span>
        </div>
      )) : <p style={{ color: AP_COLORS.gray400 }}>No notifications</p>}
    </TabFrame>
  );
}

export function ExpensePerActivityPage({ fmt }) {
  const { activities, reload } = useActionPlanData();
  const [expForm, setExpForm] = useState({ activityId: '', amount: '', description: '', expenseDate: '' });
  const record = async () => {
    await recordActivityExpense(Number(expForm.activityId), { amount: Number(expForm.amount), description: expForm.description, expenseDate: expForm.expenseDate });
    setExpForm({ activityId: '', amount: '', description: '', expenseDate: '' });
    reload();
  };
  return (
    <TabFrame title="Record expense" fmt={fmt}>
      <div style={{ background: '#fff', padding: 16, borderRadius: 12, marginBottom: 16, border: `1px solid ${AP_COLORS.gray200}` }}>
        <select style={{ ...inp, marginBottom: 8 }} value={expForm.activityId} onChange={(e) => setExpForm({ ...expForm, activityId: e.target.value })}>
          <option value="">Select activity</option>
          {activities.map((a) => <option key={a.id} value={a.id}>{a.activityName}</option>)}
        </select>
        <input style={{ ...inp, marginBottom: 8 }} type="number" placeholder="Amount RWF" value={expForm.amount} onChange={(e) => setExpForm({ ...expForm, amount: e.target.value })} />
        <input style={{ ...inp, marginBottom: 8 }} type="date" value={expForm.expenseDate} onChange={(e) => setExpForm({ ...expForm, expenseDate: e.target.value })} />
        <input style={inp} placeholder="Description" value={expForm.description} onChange={(e) => setExpForm({ ...expForm, description: e.target.value })} />
        <button type="button" onClick={record} style={{ marginTop: 10, background: AMBER, color: NAVY, border: 'none', borderRadius: 8, padding: '10px 16px', fontWeight: 700, cursor: 'pointer' }}>Record expense</button>
      </div>
    </TabFrame>
  );
}





