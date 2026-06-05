import { useState, useEffect, useMemo } from 'react';
import {
  ChevronLeft, ChevronRight, Check, Upload, Loader2, User, Calendar,
  AlertTriangle, FileText,
} from 'lucide-react';
import {
  HrDrawer, HrBtnPrimary, HrBtnOutline, HrField, HrInput, HrTextarea, HrSelect, HrAlert,
} from './hrUi';
import { LEAVE_TYPES, LEAVE_DOC_REQUIREMENTS, calcLeaveDays, yearsOfService } from './hrConstants';
import hrService from '../../services/hrService';

const STEPS = [
  'Employee',
  'Leave details',
  'Reason',
  'Documents',
  'Review',
];

const emptyForm = () => ({
  staff_user_id: '',
  leave_type: '',
  leave_type_other: '',
  start_date: '',
  end_date: '',
  exclude_weekends: false,
  exclude_holidays: false,
  half_day: false,
  reason: '',
  emergency_phone: '',
  alt_contact: '',
  leave_address: '',
  approver_name: 'HR Manager',
  approver_position: 'Human Resources',
});

function Stepper({ step }) {
  return (
    <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center shrink-0">
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] ${i === step ? 'bg-[#c87800] text-white' : i < step ? 'bg-amber-50 text-[#c87800]' : 'bg-slate-100 text-slate-400'}`} style={{ fontWeight: 500 }}>
            <span className="w-4 h-4 rounded-full border flex items-center justify-center text-[9px]">{i < step ? <Check size={10} /> : i + 1}</span>
            <span className="hidden sm:inline">{label}</span>
          </div>
          {i < STEPS.length - 1 && <ChevronRight size={12} className="text-slate-300 mx-0.5 shrink-0" />}
        </div>
      ))}
    </div>
  );
}

export default function LeaveRegisterModal({ open, onClose, employees = [], onSubmitted, initialStaffUserId = '' }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(emptyForm());
  const [balance, setBalance] = useState(null);
  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [employeeSearch, setEmployeeSearch] = useState('');

  const selected = useMemo(
    () => employees.find((e) => String(e.id) === String(form.staff_user_id)),
    [employees, form.staff_user_id]
  );

  const totalDays = calcLeaveDays(form.start_date, form.end_date, {
    excludeWeekends: form.exclude_weekends,
    halfDay: form.half_day,
  });

  const remaining = balance ? Number(balance.remaining) : null;
  const insufficient = remaining != null && /annual/i.test(form.leave_type) && totalDays > remaining;

  const requiredDocs = LEAVE_DOC_REQUIREMENTS[form.leave_type] || [];

  useEffect(() => {
    if (!open) {
      setStep(0);
      setForm(emptyForm());
      setBalance(null);
      setFiles([]);
      setError('');
      setEmployeeSearch('');
    } else if (initialStaffUserId) {
      setForm((p) => ({ ...p, staff_user_id: String(initialStaffUserId) }));
    }
  }, [open, initialStaffUserId]);

  useEffect(() => {
    if (!form.staff_user_id || !form.leave_type) return;
    hrService.getLeaveBalance(form.staff_user_id, /annual/i.test(form.leave_type) ? 'Annual Leave' : form.leave_type)
      .then((res) => { if (res?.success) setBalance(res.data); })
      .catch(() => setBalance(null));
  }, [form.staff_user_id, form.leave_type]);

  const set = (key, value) => setForm((p) => ({ ...p, [key]: value }));
  const employeeResults = useMemo(() => {
    const q = employeeSearch.trim().toLowerCase();
    if (!q) return employees.slice(0, 30);
    return employees
      .filter((e) => `${e.name || ''} ${e.employee_id || ''}`.toLowerCase().includes(q))
      .slice(0, 30);
  }, [employees, employeeSearch]);

  const handleSubmit = async (draft = false) => {
    setSubmitting(true);
    setError('');
    try {
      const res = await hrService.submitLeaveRequest({
        ...form,
        staff_user_id: Number(form.staff_user_id),
        leave_type: form.leave_type === 'Others' ? form.leave_type_other : form.leave_type,
        leave_type_other: form.leave_type === 'Others' ? form.leave_type_other : null,
        attachments: files.map((f) => f.name),
        save_draft: draft,
      });
      if (!res?.success) throw new Error(res?.message || 'Submit failed');
      onSubmitted?.();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  const next = () => {
    if (step === 0 && !form.staff_user_id) { setError('Select an employee.'); return; }
    if (step === 1 && (!form.leave_type || !form.start_date || !form.end_date)) { setError('Complete leave type and dates.'); return; }
    if (step === 1 && form.leave_type === 'Others' && !form.leave_type_other.trim()) { setError('Specify leave type.'); return; }
    setError('');
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const prev = () => { setError(''); setStep((s) => Math.max(s - 1, 0)); };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-4">
            <HrField label="Employee" required>
              <div className="space-y-2">
                <HrInput
                  value={employeeSearch}
                  onChange={(e) => setEmployeeSearch(e.target.value)}
                  placeholder="Search staff by name or ID..."
                />
                <div className="max-h-44 overflow-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
                  {employeeResults.map((e) => (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => { set('staff_user_id', e.id); setEmployeeSearch(`${e.name} — ${e.employee_id || ''}`); }}
                      className={`w-full text-left px-3 py-2 text-xs hover:bg-amber-50 ${String(form.staff_user_id) === String(e.id) ? 'bg-amber-50 text-[#c87800]' : 'text-slate-600'}`}
                      style={{ fontWeight: 500 }}
                    >
                      {e.name} — {e.employee_id}
                    </button>
                  ))}
                  {!employeeResults.length ? <p className="px-3 py-2 text-xs text-slate-400">No staff found.</p> : null}
                </div>
              </div>
            </HrField>
            {selected && (
              <div className="p-4 rounded-xl border border-amber-100 bg-amber-50/50 flex gap-3">
                <div className="w-12 h-12 rounded-full bg-[#c87800] text-white flex items-center justify-center shrink-0 text-sm" style={{ fontWeight: 500 }}>
                  {(selected.name || '?')[0]}
                </div>
                <div>
                  <p className="text-sm text-[#000435]" style={{ fontWeight: 500 }}>{selected.name}</p>
                  <p className="text-xs text-slate-500">{selected.position} · {selected.department}</p>
                  <p className="text-xs text-[#c87800] mt-1">
                    {yearsOfService(selected.hire_date) != null ? `${yearsOfService(selected.hire_date)} yrs service · ` : ''}
                    Annual balance: {balance?.remaining ?? '…'} days
                  </p>
                </div>
              </div>
            )}
          </div>
        );
      case 1:
        return (
          <div className="space-y-4">
            <HrField label="Leave type" required>
              <HrSelect value={form.leave_type} onChange={(e) => set('leave_type', e.target.value)}>
                <option value="">Select…</option>
                {LEAVE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </HrSelect>
            </HrField>
            {form.leave_type === 'Others' && (
              <HrField label="Specify leave type" required>
                <HrInput value={form.leave_type_other} onChange={(e) => set('leave_type_other', e.target.value)} placeholder="Describe leave type" />
              </HrField>
            )}
            <div className="grid grid-cols-2 gap-3">
              <HrField label="Start date" required><HrInput type="date" value={form.start_date} onChange={(e) => set('start_date', e.target.value)} /></HrField>
              <HrField label="End date" required><HrInput type="date" value={form.end_date} onChange={(e) => set('end_date', e.target.value)} /></HrField>
            </div>
            {form.start_date && form.end_date && (
              <div className="p-3 rounded-xl bg-sky-50 border border-sky-100 text-sm">
                <span className="text-slate-500">Total days requested: </span>
                <span className="text-[#000435]" style={{ fontWeight: 500 }}>{totalDays}</span>
              </div>
            )}
            <div className="space-y-2">
              {[
                ['exclude_weekends', 'Exclude weekends'],
                ['exclude_holidays', 'Exclude public holidays'],
                ['half_day', 'Half-day leave'],
              ].map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                  <input type="checkbox" checked={form[key]} onChange={(e) => set(key, e.target.checked)} className="accent-[#c87800]" />
                  {label}
                </label>
              ))}
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <HrField label="Reason for leave" required>
              <HrTextarea rows={5} value={form.reason} onChange={(e) => set('reason', e.target.value)} placeholder="Explain reason for leave…" maxLength={500} />
              <p className="text-[10px] text-slate-400 mt-1 text-right">{form.reason.length}/500</p>
            </HrField>
            <HrField label="Emergency phone"><HrInput value={form.emergency_phone} onChange={(e) => set('emergency_phone', e.target.value)} placeholder="+250 7XX XXX XXX" /></HrField>
            <HrField label="Alternative contact"><HrInput value={form.alt_contact} onChange={(e) => set('alt_contact', e.target.value)} /></HrField>
            <HrField label="Leave address"><HrTextarea rows={2} value={form.leave_address} onChange={(e) => set('leave_address', e.target.value)} placeholder="Where will you be during leave?" /></HrField>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            {requiredDocs.length > 0 && (
              <HrAlert variant="info" title="Required documents">
                {requiredDocs.join(', ')} required for {form.leave_type}.
              </HrAlert>
            )}
            <div
              className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:border-[#c87800]/40 transition-colors"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); setFiles((p) => [...p, ...Array.from(e.dataTransfer.files)]); }}
            >
              <Upload size={28} className="mx-auto text-slate-300 mb-2" />
              <p className="text-sm text-slate-600" style={{ fontWeight: 500 }}>Drag & drop files here</p>
              <p className="text-xs text-slate-400 mt-1">PDF, DOCX, JPG, PNG — max 5MB</p>
              <label className="inline-block mt-3">
                <span className="px-4 py-2 rounded-xl border border-amber-200 text-[#c87800] text-xs cursor-pointer hover:bg-amber-50">Browse files</span>
                <input type="file" multiple accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" className="sr-only" onChange={(e) => setFiles((p) => [...p, ...Array.from(e.target.files || [])])} />
              </label>
            </div>
            {files.length > 0 && (
              <ul className="space-y-1">
                {files.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs text-slate-600"><FileText size={14} className="text-[#c87800]" /> {f.name}</li>
                ))}
              </ul>
            )}
          </div>
        );
      case 4:
        return (
          <div className="space-y-3 text-sm">
            <div className={`p-3 rounded-xl border ${insufficient ? 'border-red-200 bg-red-50' : 'border-emerald-200 bg-emerald-50'}`}>
              <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">{form.leave_type || 'Leave'} balance</p>
              <p className="text-xs text-slate-600">
                Available: <span style={{ fontWeight: 600 }}>{balance?.entitlement ?? '—'}</span> · Requested: <span style={{ fontWeight: 600 }}>{totalDays || '—'}</span> · Remaining: <span style={{ fontWeight: 600 }}>{remaining ?? '—'}</span>
              </p>
            </div>
            {[
              ['Employee', selected?.name],
              ['Leave type', form.leave_type === 'Others' ? form.leave_type_other : form.leave_type],
              ['Dates', `${form.start_date} → ${form.end_date}`],
              ['Total days', totalDays],
              ['Reason', form.reason || '—'],
              ['Attachments', files.length ? files.map((f) => f.name).join(', ') : 'None'],
              ['Approver', `${form.approver_name} (${form.approver_position})`],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 py-2 border-b border-slate-50">
                <span className="text-slate-400 text-xs uppercase">{k}</span>
                <span className="text-slate-700 text-right" style={{ fontWeight: 500 }}>{v}</span>
              </div>
            ))}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <HrDrawer
      open={open}
      onClose={onClose}
      title="Register Leave"
      footer={
        <>
          {step > 0 ? (
            <HrBtnOutline className="flex-1" onClick={prev} disabled={submitting}><ChevronLeft size={14} /> Previous</HrBtnOutline>
          ) : (
            <HrBtnOutline className="flex-1" onClick={onClose} disabled={submitting}>Cancel</HrBtnOutline>
          )}
          {step < STEPS.length - 1 ? (
            <HrBtnPrimary className="flex-1" onClick={next}>Next <ChevronRight size={14} /></HrBtnPrimary>
          ) : (
            <>
              <HrBtnOutline className="flex-1" onClick={() => handleSubmit(true)} disabled={submitting}>Save draft</HrBtnOutline>
              <HrBtnPrimary className="flex-1" onClick={() => handleSubmit(false)} disabled={submitting || insufficient}>
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Submit
              </HrBtnPrimary>
            </>
          )}
        </>
      }
    >
      <Stepper step={step} />
      {error ? <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</div> : null}
      {renderStep()}
    </HrDrawer>
  );
}
