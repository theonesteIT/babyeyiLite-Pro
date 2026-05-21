import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { AP_COLORS, PLAN_STATUS_OPTIONS, FUNDING_SOURCES, PRIORITY_LEVELS, ACTION_PLAN_TERMS } from '../utils/actionPlanConstants';
import { createActionPlan } from '../services/actionPlanApi';

const NAVY = AP_COLORS.navy;
const AMBER = AP_COLORS.amber;

const inp = {
  width: '100%',
  boxSizing: 'border-box',
  border: `1px solid ${AP_COLORS.gray200}`,
  borderRadius: 10,
  padding: '11px 14px',
  fontSize: 14,
  color: NAVY,
  background: '#fff',
  outline: 'none',
};
const lbl = {
  display: 'block',
  fontSize: 11,
  fontWeight: 700,
  color: AP_COLORS.gray600,
  marginBottom: 6,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

const EMPTY = {
  title: '',
  academicYear: '',
  term: 'Term 1',
  department: 'Administration',
  strategicObjective: '',
  startDate: '',
  endDate: '',
  responsibleUserId: '',
  responsibleName: '',
  estimatedBudget: '',
  fundingSource: 'Student Fees',
  priorityLevel: 'Medium',
  status: 'draft',
};

export default function ActionPlanCreateForm({ options, onSuccess, compact }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    const year = options?.currentAcademicYear || options?.academicYears?.[0] || '';
    const term = options?.defaultTerm || 'Term 1';
    const termRow = (options?.termDates || []).find((t) => t.name === term);
    setForm({
      ...EMPTY,
      academicYear: year,
      term,
      department: options?.departments?.[0] || 'Administration',
      startDate: termRow?.start || '',
      endDate: termRow?.end || '',
    });
    setMsg('');
    setErr('');
  }, [options?.currentAcademicYear, options?.academicYears, options?.defaultTerm, options?.termDates, options?.departments]);

  const f = (k, v) => setForm((s) => {
    const next = { ...s, [k]: v };
    if (k === 'term') {
      const termRow = (options?.termDates || []).find((t) => t.name === v);
      if (termRow?.start) next.startDate = termRow.start;
      if (termRow?.end) next.endDate = termRow.end;
    }
    return next;
  });

  const onStaffChange = (userId) => {
    const staff = (options?.staff || []).find((u) => String(u.id) === String(userId));
    setForm((s) => ({
      ...s,
      responsibleUserId: userId,
      responsibleName: staff?.name || s.responsibleName,
    }));
  };

  const submit = async (submitForApproval) => {
    if (!form.title.trim()) {
      setErr('Action plan title is required.');
      return;
    }
    setSaving(true);
    setErr('');
    setMsg('');
    try {
      const plan = await createActionPlan({
        ...form,
        estimatedBudget: Number(String(form.estimatedBudget).replace(/,/g, '')) || 0,
        responsibleUserId: form.responsibleUserId ? Number(form.responsibleUserId) : null,
        submit: submitForApproval,
      });
      setMsg(submitForApproval ? 'Submitted for approval.' : 'Action plan saved.');
      onSuccess?.(plan);
    } catch (e) {
      setErr(e.message || 'Failed to save plan');
    } finally {
      setSaving(false);
    }
  };

  const departments = options?.departments?.length ? options.departments : ['Administration'];
  const years = options?.academicYears?.length ? options.academicYears : [`${new Date().getFullYear()}-${new Date().getFullYear() + 1}`];
  const funding = options?.fundingSources?.length ? options.fundingSources : FUNDING_SOURCES;
  const priorities = options?.priorities?.length ? options.priorities : PRIORITY_LEVELS;
  const terms = options?.terms?.length ? options.terms : ACTION_PLAN_TERMS;
  const statuses = options?.planStatuses?.length
    ? options.planStatuses
    : PLAN_STATUS_OPTIONS;

  return (
    <div style={{ background: '#fff', borderRadius: compact ? 12 : 16, padding: compact ? 16 : 24, border: `1px solid ${AP_COLORS.gray200}` }}>
      <div className="ap-modal-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={lbl}>Action plan title *</label>
          <input style={inp} value={form.title} onChange={(e) => f('title', e.target.value)} placeholder="e.g. Term 1 Academic Improvement Plan" />
        </div>
        <div>
          <label style={lbl}>Academic year</label>
          <select style={inp} value={form.academicYear} onChange={(e) => f('academicYear', e.target.value)}>
            <option value="">Select year</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          {options?.currentAcademicYear && (
            <p style={{ margin: '6px 0 0', fontSize: 11, color: AP_COLORS.gray600 }}>
              From manager configuration: {options.currentAcademicYear}
            </p>
          )}
        </div>
        <div>
          <label style={lbl}>Term</label>
          <select style={inp} value={form.term} onChange={(e) => f('term', e.target.value)}>
            {terms.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>Department</label>
          <select style={inp} value={form.department} onChange={(e) => f('department', e.target.value)}>
            {departments.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>Responsible person</label>
          <select style={inp} value={form.responsibleUserId} onChange={(e) => onStaffChange(e.target.value)}>
            <option value="">Select staff member</option>
            {(options?.staff || []).map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={lbl}>Strategic objective</label>
          <textarea
            style={{ ...inp, minHeight: 88, resize: 'vertical' }}
            value={form.strategicObjective}
            onChange={(e) => f('strategicObjective', e.target.value)}
            placeholder="Describe the main goal of this action plan..."
          />
        </div>
        <div>
          <label style={lbl}>Start date</label>
          <input type="date" style={inp} value={form.startDate} onChange={(e) => f('startDate', e.target.value)} />
        </div>
        <div>
          <label style={lbl}>End date</label>
          <input type="date" style={inp} value={form.endDate} onChange={(e) => f('endDate', e.target.value)} />
        </div>
        <div>
          <label style={lbl}>Estimated budget (RWF)</label>
          <input
            type="text"
            inputMode="numeric"
            style={inp}
            value={form.estimatedBudget}
            onChange={(e) => f('estimatedBudget', e.target.value.replace(/[^\d]/g, ''))}
            placeholder="0"
          />
        </div>
        <div>
          <label style={lbl}>Funding source</label>
          <select style={inp} value={form.fundingSource} onChange={(e) => f('fundingSource', e.target.value)}>
            {funding.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>Priority level</label>
          <select style={inp} value={form.priorityLevel} onChange={(e) => f('priorityLevel', e.target.value)}>
            {priorities.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>Status</label>
          <select style={inp} value={form.status} onChange={(e) => f('status', e.target.value)}>
            {statuses.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      {err && (
        <p style={{ marginTop: 14, padding: '10px 12px', background: '#FEE2E2', color: '#991B1B', borderRadius: 8, fontSize: 13 }}>{err}</p>
      )}
      {msg && (
        <p style={{ marginTop: 14, padding: '10px 12px', background: '#FFFBEB', color: NAVY, borderRadius: 8, fontSize: 13, fontWeight: 600 }}>{msg}</p>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 18, justifyContent: 'flex-end' }}>
        <button
          type="button"
          disabled={saving}
          onClick={() => submit(false)}
          style={{ padding: '11px 18px', borderRadius: 10, border: 'none', background: NAVY, color: '#fff', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
        >
          {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : null}
          Save draft
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => submit(true)}
          style={{ padding: '11px 18px', borderRadius: 10, border: 'none', background: AMBER, color: NAVY, fontWeight: 700, cursor: 'pointer' }}
        >
          Submit for approval
        </button>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

