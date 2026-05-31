import { useEffect, useMemo, useState } from 'react';
import { Check, Layers, Plus } from 'lucide-react';
import AccountantFormModal, { FormGrid, FormInput, FormSelect } from './AccountantFormModal';
import api from '../services/api';

function asMoney(v) {
  const n = Number(v || 0);
  return Number.isFinite(n) ? n : 0;
}

const emptyForm = {
  class_name: '',
  selectedClasses: [],
  term: '',
  academic_year: '',
  tuition_total: '',
  paid_at_school_total: '',
  merge_into_existing: true,
};

export default function BabyeyiFeeCardModal({
  isOpen,
  onClose,
  mode = 'create',
  cardId = null,
  initialForm = null,
  yearOptions = [],
  termOptions = [],
  classOptions = [],
  onSaved,
}) {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isEdit = mode === 'edit' && cardId;

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    if (initialForm) {
      setForm({
        class_name: initialForm.class_name || '',
        selectedClasses: Array.isArray(initialForm.selectedClasses) ? initialForm.selectedClasses : [],
        term: initialForm.term || '',
        academic_year: initialForm.academic_year || '',
        tuition_total: initialForm.tuition_total ?? '',
        paid_at_school_total: initialForm.paid_at_school_total ?? '',
        merge_into_existing: true,
      });
    } else {
      setForm({
        ...emptyForm,
        term: termOptions[0] || '',
        academic_year: yearOptions[0] || '',
      });
    }
  }, [isOpen, initialForm, termOptions, yearOptions]);

  const totalDue = useMemo(
    () => Math.max(0, asMoney(form.tuition_total) + asMoney(form.paid_at_school_total)),
    [form.tuition_total, form.paid_at_school_total]
  );

  const toggleClass = (name) => {
    const n = String(name || '').trim();
    if (!n) return;
    setForm((prev) => {
      const set = new Set(prev.selectedClasses);
      if (set.has(n)) set.delete(n);
      else set.add(n);
      const selectedClasses = [...set];
      const class_name = prev.class_name && selectedClasses.includes(prev.class_name)
        ? prev.class_name
        : selectedClasses[0] || n;
      return { ...prev, selectedClasses, class_name };
    });
  };

  const setPrimaryClass = (name) => {
    const n = String(name || '').trim();
    if (!n) return;
    setForm((prev) => {
      const selected = new Set(prev.selectedClasses);
      selected.add(n);
      return { ...prev, class_name: n, selectedClasses: [...selected] };
    });
  };

  const handleSubmit = async () => {
    setError('');
    const class_name = String(form.class_name || '').trim();
    if (!class_name) {
      setError('Select a primary class.');
      return;
    }
    if (!form.term || !form.academic_year) {
      setError('Term and academic year are required.');
      return;
    }

    const classes_json =
      form.selectedClasses.length > 0 ? form.selectedClasses : [class_name];

    const payload = {
      class_name,
      classes_json,
      term: form.term,
      academic_year: form.academic_year,
      tuition_total: asMoney(form.tuition_total),
      paid_at_school_total: asMoney(form.paid_at_school_total),
    };

    if (!isEdit && payload.tuition_total + payload.paid_at_school_total <= 0) {
      setError('Enter tuition and/or paid-at-school amount.');
      return;
    }

    setSaving(true);
    try {
      if (isEdit) {
        const res = await api.put(`/accountant/babyeyi-fees/${cardId}`, payload);
        if (!res.data?.success) throw new Error(res.data?.message || 'Save failed');
      } else {
        const res = await api.post('/accountant/babyeyi-fees', {
          ...payload,
          merge_into_existing: form.merge_into_existing,
        });
        if (!res.data?.success) throw new Error(res.data?.message || 'Create failed');
        await onSaved?.(res.data?.data);
        onClose();
        return;
      }
      await onSaved?.({ id: cardId });
      onClose();
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Failed to save fee card');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AccountantFormModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? `Babyeyi Card #${initialForm?.babyeyi_id || cardId}` : 'New Babyeyi Fee Card'}
      subtitle={isEdit ? 'Editing configurations' : 'Assign classes · term · academic year'}
      statusHint={
        isEdit
          ? 'Updates replace totals for this card'
          : form.merge_into_existing
            ? 'Additional amounts merge into an existing card for the same term & year'
            : 'Creates a separate fee card'
      }
      footerHint={`Computed total due · ${totalDue.toLocaleString()} RWF`}
      submitLabel={isEdit ? 'Save card' : 'Create card'}
      submitting={saving}
      onSubmit={handleSubmit}
      submitDisabled={!form.class_name}
    >
      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[10px] font-medium uppercase tracking-widest text-red-800">
          {error}
        </div>
      ) : null}

      <FormGrid>
        <FormSelect
          label="Primary class"
          value={form.class_name}
          onChange={(e) => setPrimaryClass(e.target.value)}
        >
          <option value="">Select class</option>
          {classOptions.map((c) => (
            <option key={c.class_name} value={c.class_name}>
              {c.class_name}
              {c.student_count != null ? ` (${c.student_count})` : ''}
            </option>
          ))}
        </FormSelect>

        <FormSelect
          label="Academic year"
          value={form.academic_year}
          onChange={(e) => setForm((s) => ({ ...s, academic_year: e.target.value }))}
        >
          {yearOptions.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </FormSelect>

        <FormSelect
          label="Term"
          value={form.term}
          onChange={(e) => setForm((s) => ({ ...s, term: e.target.value }))}
        >
          {termOptions.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </FormSelect>

        <FormInput
          label="Tuition total (RWF)"
          type="number"
          min="0"
          step="1000"
          placeholder="0"
          value={form.tuition_total}
          onChange={(e) => setForm((s) => ({ ...s, tuition_total: e.target.value }))}
        />

        <FormInput
          label="Paid at school (RWF)"
          type="number"
          min="0"
          step="1000"
          placeholder="0"
          value={form.paid_at_school_total}
          onChange={(e) => setForm((s) => ({ ...s, paid_at_school_total: e.target.value }))}
        />
      </FormGrid>

      <div className="mt-5">
        <p className="text-[9px] font-medium uppercase tracking-[0.2em] text-[#000435]/55 mb-2 flex items-center gap-2">
          <Layers size={12} className="text-[#F59E0B]" />
          Applicable classes
        </p>
        <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto rounded-xl border border-[#000435]/8 bg-[#F8FAFC]/80 p-3">
          {classOptions.length === 0 ? (
            <span className="text-[10px] text-[#000435]/45 uppercase tracking-widest">No classes loaded</span>
          ) : (
            classOptions.map((c) => {
              const active = form.selectedClasses.includes(c.class_name);
              return (
                <button
                  key={c.class_name}
                  type="button"
                  onClick={() => toggleClass(c.class_name)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[10px] font-medium uppercase tracking-wide transition-all ${
                    active
                      ? 'border-[#000435] bg-[#000435] text-[#FEBF10]'
                      : 'border-[#000435]/12 bg-white text-[#000435]/70 hover:border-[#F59E0B]/40'
                  }`}
                >
                  {active ? <Check size={12} /> : <Plus size={12} className="opacity-40" />}
                  {c.class_name}
                </button>
              );
            })
          )}
        </div>
        <p className="mt-2 text-[9px] font-normal text-[#000435]/45 leading-relaxed">
          Learners in any selected class use this card for the chosen term and year. Primary class is the main label in the directory.
        </p>
      </div>

      {!isEdit ? (
        <label className="mt-5 flex items-start gap-3 rounded-xl border border-[#F59E0B]/25 bg-[#FFFBEB]/50 px-4 py-3 cursor-pointer">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-[#000435]/20 accent-[#000435]"
            checked={form.merge_into_existing}
            onChange={(e) => setForm((s) => ({ ...s, merge_into_existing: e.target.checked }))}
          />
          <span className="text-[10px] font-medium text-[#000435]/80 leading-relaxed uppercase tracking-wide">
            Add to existing card when the same term, academic year, and class already have fees (stack amounts instead of duplicating).
          </span>
        </label>
      ) : null}

      <div className="mt-5 rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3 flex items-center justify-between">
        <span className="text-[9px] font-medium uppercase tracking-widest text-emerald-800">Total due per learner</span>
        <span className="text-lg font-semibold text-emerald-700 tabular-nums">
          {totalDue.toLocaleString()} <span className="text-[10px] font-medium opacity-70">RWF</span>
        </span>
      </div>
    </AccountantFormModal>
  );
}
