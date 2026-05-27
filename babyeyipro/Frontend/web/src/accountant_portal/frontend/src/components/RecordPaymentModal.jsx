import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { CreditCard, Calendar, X, User, Banknote, FileText, Building2, Smartphone, Hash, AlertCircle } from 'lucide-react';

const METHODS = ['Cash', 'Mobile Money', 'Bank Transfer', 'Card'];

function formatMoneyRWF(value) {
  const n = Number(value) || 0;
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'RWF', maximumFractionDigits: 0 }).format(n);
}

function isBankMethod(method) {
  return String(method || '').toLowerCase().includes('bank');
}

function isMomoMethod(method) {
  const m = String(method || '').toLowerCase();
  return m.includes('mobile') || m.includes('momo');
}

export default function RecordPaymentModal({
  isOpen,
  onClose,
  onSave,
  student,
  academicYear,
  term,
}) {
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('Mobile Money');
  const [paidAt, setPaidAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');
  const [bankName, setBankName] = useState('');
  const [paidBy, setPaidBy] = useState('');
  const [transactionRef, setTransactionRef] = useState('');
  const [momoPhone, setMomoPhone] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setSubmitting(false);
    setFormError('');
    setAmount('');
    setMethod('Mobile Money');
    setPaidAt(new Date().toISOString().slice(0, 10));
    setNote('');
    setBankName('');
    setPaidBy('');
    setTransactionRef('');
    setMomoPhone('');
  }, [isOpen]);

  const context = useMemo(() => {
    const amountToPay = Number(student?.amountToPay) || 0;
    const paidThisTerm = Number(student?.paidThisTerm) || 0;
    const remaining = Number(student?.remaining) || (amountToPay - paidThisTerm);
    return { amountToPay, paidThisTerm, remaining };
  }, [student]);

  const validate = () => {
    const amt = Number(amount) || 0;
    if (!student) return 'Select a student first.';
    if (amt <= 0) return 'Enter a valid payment amount.';
    if (isBankMethod(method)) {
      if (!bankName.trim()) return 'Bank name is required.';
      if (!paidBy.trim()) return 'Paid by (who paid) is required.';
      if (!transactionRef.trim()) return 'Transaction or receipt number is required.';
    }
    if (isMomoMethod(method) && !transactionRef.trim()) {
      return 'MoMo transaction ID or receipt number is required.';
    }
    return '';
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[220]">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-md" onClick={() => onClose?.()} />

      <div className="absolute inset-x-0 top-8 md:top-12 mx-auto w-[92vw] max-w-xl max-h-[92vh] overflow-y-auto">
        <div className="bg-white rounded-[24px] border border-black/10 overflow-hidden">
          <div className="px-5 md:px-6 py-4 border-b border-black/5 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[9px] font-medium uppercase tracking-[0.28em] text-re-text-muted/45">
                Record payment · {academicYear} · {term}
              </p>
              <h3 className="text-base md:text-lg font-medium text-re-navy tracking-tight truncate">
                {student ? student.name : 'Student payment'}
              </h3>
              {student && (
                <p className="text-[10px] font-medium text-re-text-muted/70 mt-1 truncate">
                  UID {student.id} · {student.class} · Remaining {formatMoneyRWF(context.remaining)}
                </p>
              )}
            </div>
            <button
              onClick={() => onClose?.()}
              className="shrink-0 w-9 h-9 rounded-xl border border-black/10 bg-white flex items-center justify-center hover:bg-white transition-colors"
              aria-label="Close modal"
            >
              <X size={16} className="text-slate-500" />
            </button>
          </div>

          <div className="p-5 md:p-6 space-y-4">
            {!student && (
              <div className="rounded-2xl bg-amber-50 border border-amber-100 p-4">
                <p className="text-[10px] font-medium uppercase tracking-widest text-amber-800">
                  Select a student first
                </p>
                <p className="text-[10px] font-medium text-amber-800/70 mt-1">
                  Open a learner record from the table, then tap Record.
                </p>
              </div>
            )}

            {formError ? (
              <div className="rounded-2xl bg-red-50 border border-red-100 p-3 flex items-start gap-2">
                <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                <p className="text-[11px] font-medium text-red-700">{formError}</p>
              </div>
            ) : null}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="relative">
                <Banknote size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500" />
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ''))}
                  inputMode="numeric"
                  placeholder="Amount (RWF)"
                  className="w-full h-11 rounded-xl bg-white border border-black/5 outline-none pl-9 pr-3 text-[11px] font-medium text-re-navy focus:bg-white focus:border-[#000435]/20 transition-all"
                  disabled={!student || submitting}
                />
              </div>

              <div className="relative">
                <CreditCard size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500" />
                <select
                  value={method}
                  onChange={(e) => {
                    setMethod(e.target.value);
                    setFormError('');
                  }}
                  className="w-full h-11 rounded-xl bg-white border border-black/5 outline-none pl-9 pr-3 text-[11px] font-medium text-re-navy focus:bg-white focus:border-[#000435]/20 transition-all cursor-pointer"
                  disabled={!student || submitting}
                >
                  {METHODS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500" />
                <input
                  type="date"
                  value={paidAt}
                  onChange={(e) => setPaidAt(e.target.value)}
                  className="w-full h-11 rounded-xl bg-white border border-black/5 outline-none pl-9 pr-3 text-[11px] font-medium text-re-navy focus:bg-white focus:border-[#000435]/20 transition-all"
                  disabled={!student || submitting}
                />
              </div>

              <div className="relative">
                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500" />
                <input
                  value={student ? `${student.name}` : ''}
                  readOnly
                  placeholder="Student"
                  className="w-full h-11 rounded-xl bg-white border border-black/5 outline-none pl-9 pr-3 text-[11px] font-medium text-re-navy/70"
                />
              </div>
            </div>

            {isMomoMethod(method) && (
              <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-4 space-y-3">
                <p className="text-[9px] font-bold uppercase tracking-widest text-amber-900/80">Mobile money details</p>
                <div className="relative">
                  <Smartphone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-600" />
                  <input
                    value={momoPhone}
                    onChange={(e) => setMomoPhone(e.target.value)}
                    placeholder="Payer phone (optional)"
                    className="w-full h-11 rounded-xl bg-white border border-black/5 outline-none pl-9 pr-3 text-[11px] font-medium text-re-navy"
                    disabled={!student || submitting}
                  />
                </div>
                <div className="relative">
                  <Hash size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-600" />
                  <input
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    placeholder="MoMo transaction ID / receipt number *"
                    className="w-full h-11 rounded-xl bg-white border border-black/5 outline-none pl-9 pr-3 text-[11px] font-medium text-re-navy"
                    disabled={!student || submitting}
                  />
                </div>
              </div>
            )}

            {isBankMethod(method) && (
              <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4 space-y-3">
                <p className="text-[9px] font-bold uppercase tracking-widest text-[#000435]/70">Bank transfer details</p>
                <div className="relative">
                  <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#000435]" />
                  <input
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="Bank name *"
                    className="w-full h-11 rounded-xl bg-white border border-black/5 outline-none pl-9 pr-3 text-[11px] font-medium text-re-navy"
                    disabled={!student || submitting}
                  />
                </div>
                <div className="relative">
                  <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#000435]" />
                  <input
                    value={paidBy}
                    onChange={(e) => setPaidBy(e.target.value)}
                    placeholder="Paid by (who paid) *"
                    className="w-full h-11 rounded-xl bg-white border border-black/5 outline-none pl-9 pr-3 text-[11px] font-medium text-re-navy"
                    disabled={!student || submitting}
                  />
                </div>
                <div className="relative">
                  <Hash size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#000435]" />
                  <input
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    placeholder="Transaction / receipt number *"
                    className="w-full h-11 rounded-xl bg-white border border-black/5 outline-none pl-9 pr-3 text-[11px] font-medium text-re-navy"
                    disabled={!student || submitting}
                  />
                </div>
              </div>
            )}

            {!isBankMethod(method) && !isMomoMethod(method) && (
              <div className="relative">
                <Hash size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500" />
                <input
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  placeholder="Reference / receipt number (optional)"
                  className="w-full h-11 rounded-xl bg-white border border-black/5 outline-none pl-9 pr-3 text-[11px] font-medium text-re-navy"
                  disabled={!student || submitting}
                />
              </div>
            )}

            <div className="relative">
              <FileText size={14} className="absolute left-3 top-3 text-amber-500" />
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Additional note (optional)"
                className="w-full min-h-[72px] rounded-xl bg-white border border-black/5 outline-none pl-9 pr-3 py-3 text-[11px] font-medium text-re-navy focus:bg-white focus:border-[#000435]/20 transition-all resize-none"
                disabled={!student || submitting}
              />
            </div>
          </div>

          <div className="px-5 md:px-6 py-4 border-t border-black/5 bg-white/20 flex items-center justify-end gap-2">
            <button
              onClick={() => onClose?.()}
              className="h-10 px-4 rounded-xl bg-white border border-black/5 text-re-navy font-medium text-[10px] uppercase tracking-widest hover:bg-re-bg transition-all"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                const err = validate();
                if (err) {
                  setFormError(err);
                  return;
                }
                const amt = Number(amount) || 0;
                setSubmitting(true);
                setFormError('');
                try {
                  let saveResult = null;
                  if (onSave) {
                    saveResult = await onSave({
                      amount: amt,
                      method,
                      paidAt,
                      note,
                      bankName: bankName.trim(),
                      paidBy: paidBy.trim(),
                      transactionRef: transactionRef.trim(),
                      momoPhone: momoPhone.trim(),
                    });
                  }
                  onClose?.({
                    saved: true,
                    amount: amt,
                    method,
                    paidAt,
                    note,
                    payment: saveResult?.payment || saveResult,
                  });
                } catch (e) {
                  setFormError(e?.response?.data?.message || e?.message || 'Failed to save payment.');
                } finally {
                  setSubmitting(false);
                }
              }}
              className="h-10 px-4 rounded-xl text-white font-medium text-[10px] uppercase tracking-widest active:scale-95 transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #000435 0%, #0D2644 100%)' }}
              disabled={!student || submitting || !(Number(amount) > 0)}
            >
              Save &amp; get receipt
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
