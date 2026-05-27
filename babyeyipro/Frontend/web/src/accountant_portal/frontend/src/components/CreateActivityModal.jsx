import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Loader2 } from 'lucide-react';
import { createActionPlanActivity } from '../services/actionPlanApi';

export default function CreateActivityModal({ open, onClose, options, plans = [], defaultPlanId, onCreated }) {
  const [form, setForm] = useState({
    actionPlanId: '',
    activityName: '',
    category: '',
    department: '',
    responsibleName: '',
    estimatedCost: '',
    plannedStart: '',
    plannedEnd: '',
    description: '',
    expectedOutcome: '',
    performanceIndicator: '',
    budgetLineId: '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!open) return;
    const pid = defaultPlanId || plans[0]?.id || '';
    const cats = options?.activityCategories || [];
    setForm({
      actionPlanId: pid ? String(pid) : '',
      activityName: '',
      category: cats[0] || '',
      department: options?.departments?.[0] || 'Administration',
      responsibleName: '',
      estimatedCost: '',
      plannedStart: '',
      plannedEnd: '',
      description: '',
      expectedOutcome: '',
      performanceIndicator: '',
      budgetLineId: '',
    });
    setErr('');
    setMsg('');
  }, [open, defaultPlanId, plans, options?.activityCategories, options?.departments]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  const f = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  const onStaffChange = (userId) => {
    const staff = (options?.staff || []).find((u) => String(u.id) === String(userId));
    setForm((s) => ({
      ...s,
      responsibleUserId: userId,
      responsibleName: staff?.name || s.responsibleName,
    }));
  };

  const submit = async () => {
    if (!form.actionPlanId) {
      setErr('Select an action plan.');
      return;
    }
    if (!form.activityName.trim()) {
      setErr('Activity name is required.');
      return;
    }
    setSaving(true);
    setErr('');
    setMsg('');
    try {
      const activity = await createActionPlanActivity({
        actionPlanId: Number(form.actionPlanId),
        activityName: form.activityName.trim(),
        category: form.category,
        department: form.department,
        responsibleName: form.responsibleName,
        estimatedCost: Number(String(form.estimatedCost).replace(/,/g, '')) || 0,
        plannedStart: form.plannedStart,
        plannedEnd: form.plannedEnd,
        description: form.description,
        expectedOutcome: form.expectedOutcome,
        performanceIndicator: form.performanceIndicator,
        budgetLineId: form.budgetLineId ? Number(form.budgetLineId) : null,
      });
      setMsg('Activity added successfully.');
      onCreated?.(activity);
      setTimeout(onClose, 400);
    } catch (e) {
      setErr(e.message || 'Failed to create activity');
    } finally {
      setSaving(false);
    }
  };

  const categories = options?.activityCategories?.length ? options.activityCategories : [];
  const departments = options?.departments?.length ? options.departments : ['Administration'];
  const budgetLines = options?.budgetLines || [];

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-[#000435]/55 border-none cursor-pointer" />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-2xl max-h-[92vh] shadow-2xl flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="bg-[#000435] px-6 py-4 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-white font-bold text-lg font-['Montserrat']">Add New Activity</h2>
            <p className="text-white/50 text-sm">Attach to an existing action plan</p>
          </div>
          <button type="button" onClick={onClose} className="text-white/60 hover:text-white"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Action Plan *</label>
              <select
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 bg-white"
                value={form.actionPlanId}
                onChange={(e) => f('actionPlanId', e.target.value)}
              >
                <option value="">Select action plan</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>{p.title} · {p.term}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Activity Name *</label>
              <input
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                value={form.activityName}
                onChange={(e) => f('activityName', e.target.value)}
                placeholder="e.g. Buy laboratory equipment"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Category</label>
              <select className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white" value={form.category} onChange={(e) => f('category', e.target.value)}>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Department</label>
              <select className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white" value={form.department} onChange={(e) => f('department', e.target.value)}>
                {departments.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Responsible Staff</label>
              <select className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white" value={form.responsibleUserId || ''} onChange={(e) => onStaffChange(e.target.value)}>
                <option value="">Select staff</option>
                {(options?.staff || []).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Budget Line</label>
              <select className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white" value={form.budgetLineId} onChange={(e) => f('budgetLineId', e.target.value)}>
                <option value="">None</option>
                {budgetLines.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Estimated Cost (RWF)</label>
              <input type="text" inputMode="numeric" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm" value={form.estimatedCost} onChange={(e) => f('estimatedCost', e.target.value.replace(/[^\d]/g, ''))} placeholder="0" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Planned Start</label>
              <input type="date" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm" value={form.plannedStart} onChange={(e) => f('plannedStart', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Planned End</label>
              <input type="date" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm" value={form.plannedEnd} onChange={(e) => f('plannedEnd', e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Performance Indicator</label>
              <input className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm" value={form.performanceIndicator} onChange={(e) => f('performanceIndicator', e.target.value)} placeholder="e.g. 95% students screened" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Description</label>
              <textarea rows={2} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none" value={form.description} onChange={(e) => f('description', e.target.value)} placeholder="Describe this activity..." />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Expected Outcome</label>
              <textarea rows={2} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none" value={form.expectedOutcome} onChange={(e) => f('expectedOutcome', e.target.value)} placeholder="What results do you expect?" />
            </div>
          </div>
          {err && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</p>}
          {msg && <p className="text-sm text-[#000435] bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 font-medium">{msg}</p>}
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-between shrink-0">
          <button type="button" onClick={onClose} className="text-gray-500 text-sm hover:text-gray-700">Cancel</button>
          <button type="button" disabled={saving} onClick={submit} className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 disabled:opacity-60">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            Add Activity
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
