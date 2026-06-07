import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Check, Loader2, User } from 'lucide-react';
import {
  HrDrawer, HrBtnPrimary, HrBtnOutline, HrField, HrInput, HrTextarea, HrSelect,
} from './hrDrawerUi';

export const PERMISSION_TYPES = [
  { value: 'SICK_LEAVE', label: 'Sick Leave' },
  { value: 'PERSONAL', label: 'Personal' },
  { value: 'FAMILY', label: 'Family' },
  { value: 'OFFICIAL', label: 'Official' },
  { value: 'LATE_ARRIVAL', label: 'Late Arrival' },
  { value: 'EARLY_DEPARTURE', label: 'Early Departure' },
  { value: 'OTHER', label: 'Other' },
];

const STEPS = ['Permission details', 'Reason', 'Review'];

function calcPermissionDays(start, end) {
  if (!start || !end) return 0;
  const diff = new Date(end) - new Date(start);
  if (Number.isNaN(diff)) return 0;
  return Math.max(1, Math.ceil(diff / 86400000) + 1);
}

function typeLabel(value, otherText) {
  if (value === 'OTHER' && otherText?.trim()) return otherText.trim();
  return PERMISSION_TYPES.find((p) => p.value === value)?.label || String(value || 'Other').replace(/_/g, ' ');
}

const emptyForm = () => ({
  permission_type: '',
  permission_type_other: '',
  start_date: new Date().toISOString().slice(0, 10),
  end_date: new Date().toISOString().slice(0, 10),
  reason: '',
  emergency_phone: '',
  alt_contact: '',
});

function Stepper({ step }) {
  return (
    <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center shrink-0">
          <div
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] ${
              i === step ? 'bg-[#c87800] text-white' : i < step ? 'bg-amber-50 text-[#c87800]' : 'bg-slate-100 text-slate-400'
            }`}
            style={{ fontWeight: 500 }}
          >
            <span className="w-4 h-4 rounded-full border flex items-center justify-center text-[9px]">
              {i < step ? <Check size={10} /> : i + 1}
            </span>
            <span className="hidden sm:inline">{label}</span>
          </div>
          {i < STEPS.length - 1 && <ChevronRight size={12} className="text-slate-300 mx-0.5 shrink-0" />}
        </div>
      ))}
    </div>
  );
}

export default function PermissionRequestModal({
  open,
  onClose,
  teacherName = 'Teacher',
  teacherMeta = {},
  onSubmit,
}) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const totalDays = calcPermissionDays(form.start_date, form.end_date);
  const displayType = typeLabel(form.permission_type, form.permission_type_other);

  useEffect(() => {
    if (!open) {
      setStep(0);
      setForm(emptyForm());
      setError('');
      setSubmitting(false);
    }
  }, [open]);

  const set = (key, value) => setForm((p) => ({ ...p, [key]: value }));

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const reasonParts = [form.reason.trim()];
      if (form.emergency_phone.trim()) reasonParts.push(`Emergency: ${form.emergency_phone.trim()}`);
      if (form.alt_contact.trim()) reasonParts.push(`Alt contact: ${form.alt_contact.trim()}`);

      const payload = {
        permission_type: form.permission_type,
        start_date: form.start_date,
        end_date: form.end_date,
        reason:
          form.permission_type === 'OTHER' && form.permission_type_other.trim()
            ? `[${form.permission_type_other.trim()}] ${reasonParts.filter(Boolean).join(' · ')}`
            : reasonParts.filter(Boolean).join(' · '),
        teacher_name: teacherName,
      };

      await onSubmit(payload);
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  const next = () => {
    if (step === 0) {
      if (!form.permission_type || !form.start_date || !form.end_date) {
        setError('Complete permission type and dates.');
        return;
      }
      if (form.permission_type === 'OTHER' && !form.permission_type_other.trim()) {
        setError('Specify permission type.');
        return;
      }
      if (new Date(form.end_date) < new Date(form.start_date)) {
        setError('End date cannot be before start date.');
        return;
      }
    }
    if (step === 1 && !form.reason.trim()) {
      setError('Please provide a reason for your request.');
      return;
    }
    setError('');
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const prev = () => {
    setError('');
    setStep((s) => Math.max(s - 1, 0));
  };

  const teacherInitial = useMemo(() => (teacherName || '?')[0]?.toUpperCase() || '?', [teacherName]);

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-4">
            <div className="p-4 rounded-xl border border-amber-100 bg-amber-50/50 flex gap-3">
              <div className="w-12 h-12 rounded-full bg-[#c87800] text-white flex items-center justify-center shrink-0 text-sm" style={{ fontWeight: 500 }}>
                {teacherInitial}
              </div>
              <div>
                <p className="text-sm text-[#000435]" style={{ fontWeight: 500 }}>{teacherName}</p>
                {teacherMeta.position || teacherMeta.department ? (
                  <p className="text-xs text-slate-500">
                    {[teacherMeta.position, teacherMeta.department].filter(Boolean).join(' · ')}
                  </p>
                ) : (
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                    <User size={12} /> Teacher
                  </p>
                )}
                <p className="text-xs text-[#c87800] mt-1">Submitting on your behalf</p>
              </div>
            </div>

            <HrField label="Permission type" required>
              <HrSelect
                value={form.permission_type}
                onChange={(e) => {
                  set('permission_type', e.target.value);
                  if (e.target.value !== 'OTHER') set('permission_type_other', '');
                }}
              >
                <option value="">Select…</option>
                {PERMISSION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </HrSelect>
            </HrField>

            {form.permission_type === 'OTHER' && (
              <HrField label="Specify permission type" required>
                <HrInput
                  value={form.permission_type_other}
                  onChange={(e) => set('permission_type_other', e.target.value)}
                  placeholder="e.g. Medical appointment, workshop…"
                />
              </HrField>
            )}

            <div className="grid grid-cols-2 gap-3">
              <HrField label="Start date" required>
                <HrInput type="date" value={form.start_date} onChange={(e) => set('start_date', e.target.value)} />
              </HrField>
              <HrField label="End date" required>
                <HrInput type="date" value={form.end_date} onChange={(e) => set('end_date', e.target.value)} />
              </HrField>
            </div>

            {form.start_date && form.end_date && (
              <div className="p-3 rounded-xl bg-sky-50 border border-sky-100 text-sm">
                <span className="text-slate-500">Total days requested: </span>
                <span className="text-[#000435]" style={{ fontWeight: 500 }}>{totalDays}</span>
              </div>
            )}
          </div>
        );
      case 1:
        return (
          <div className="space-y-4">
            <HrField label="Reason for permission" required>
              <HrTextarea
                rows={5}
                value={form.reason}
                onChange={(e) => set('reason', e.target.value)}
                placeholder="Explain the reason for your permission request…"
                maxLength={500}
              />
              <p className="text-[10px] text-slate-400 mt-1 text-right">{form.reason.length}/500</p>
            </HrField>
            <HrField label="Emergency phone">
              <HrInput
                value={form.emergency_phone}
                onChange={(e) => set('emergency_phone', e.target.value)}
                placeholder="+250 7XX XXX XXX"
              />
            </HrField>
            <HrField label="Alternative contact">
              <HrInput value={form.alt_contact} onChange={(e) => set('alt_contact', e.target.value)} placeholder="Name or number" />
            </HrField>
          </div>
        );
      case 2:
        return (
          <div className="space-y-3 text-sm">
            <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50">
              <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">Request summary</p>
              <p className="text-xs text-slate-600">
                Duration: <span style={{ fontWeight: 600 }}>{totalDays} day{totalDays !== 1 ? 's' : ''}</span>
                {' · '}
                Awaiting manager approval
              </p>
            </div>
            {[
              ['Teacher', teacherName],
              ['Permission type', displayType],
              ['Dates', `${form.start_date} → ${form.end_date}`],
              ['Total days', totalDays],
              ['Reason', form.reason || '—'],
              ['Emergency phone', form.emergency_phone || '—'],
              ['Alternative contact', form.alt_contact || '—'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 py-2 border-b border-slate-50">
                <span className="text-slate-400 text-xs uppercase">{k}</span>
                <span className="text-slate-700 text-right max-w-[60%]" style={{ fontWeight: 500 }}>{v}</span>
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
      title="Request Permission"
      footer={
        <>
          {step > 0 ? (
            <HrBtnOutline className="flex-1" onClick={prev} disabled={submitting}>
              <ChevronLeft size={14} /> Previous
            </HrBtnOutline>
          ) : (
            <HrBtnOutline className="flex-1" onClick={onClose} disabled={submitting}>Cancel</HrBtnOutline>
          )}
          {step < STEPS.length - 1 ? (
            <HrBtnPrimary className="flex-1" onClick={next}>
              Next <ChevronRight size={14} />
            </HrBtnPrimary>
          ) : (
            <HrBtnPrimary className="flex-1" onClick={handleSubmit} disabled={submitting}>
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Submit
            </HrBtnPrimary>
          )}
        </>
      }
    >
      <Stepper step={step} />
      {error ? (
        <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</div>
      ) : null}
      {renderStep()}
    </HrDrawer>
  );
}
