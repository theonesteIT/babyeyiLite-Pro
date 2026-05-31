import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { CreditCard, Calendar, X, User, Banknote, FileText, Building2, Smartphone, Hash, AlertCircle } from 'lucide-react';

const METHODS = ['Cash', 'Mobile Money', 'Bank Transfer', 'Card'];

const labelCls = 'block text-[9px] font-medium uppercase tracking-[0.2em] text-[#000435]/60 pl-0.5';
const inputCls =
  'w-full h-11 rounded-xl bg-white border border-black/5 outline-none pl-9 pr-3 text-[11px] font-medium text-re-navy focus:bg-white focus:border-[#000435]/20 transition-all disabled:opacity-50';

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

function Field({ label, hint, required, children }) {
  return (
    <div className="space-y-1">
      <label className={labelCls}>
        {label}
        {required ? <span className="text-red-500 ml-0.5">*</span> : null}
        {hint ? <span className="normal-case tracking-normal text-[#000435]/40 font-normal"> · {hint}</span> : null}
      </label>
      {children}
    </div>
  );
}

function IconInput({ icon: Icon, iconClass = 'text-amber-500', children }) {
  return (
    <div className="relative">
      <Icon size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${iconClass}`} />
      {children}
    </div>
  );
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
    if (isBankMethod(method) && !bankName.trim()) {
      return 'Bank name is required for bank transfer.';
    }
    return '';
  };

  if (!isOpen) return null;

  const disabled = !student || submitting;

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
              type="button"
              onClick={() => onClose?.()}
              className="shrink-0 w-9 h-9 rounded-xl border border-black/10 bg-white flex items-center justify-center hover:bg-re-bg transition-colors"
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Amount" required>
                <IconInput icon={Banknote}>
                  <input
                    value={amount}
                    onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ''))}
                    inputMode="numeric"
                    placeholder="0"
                    aria-label="Amount in RWF"
                    className={inputCls}
                    disabled={disabled}
                  />
                </IconInput>
              </Field>

              <Field label="Payment method" required>
                <IconInput icon={CreditCard}>
                  <select
                    value={method}
                    onChange={(e) => {
                      setMethod(e.target.value);
                      setFormError('');
                    }}
                    aria-label="Payment method"
                    className={`${inputCls} cursor-pointer appearance-none`}
                    disabled={disabled}
                  >
                    {METHODS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </IconInput>
              </Field>

              <Field label="Payment date" required>
                <IconInput icon={Calendar}>
                  <input
                    type="date"
                    value={paidAt}
                    onChange={(e) => setPaidAt(e.target.value)}
                    aria-label="Payment date"
                    className={inputCls}
                    disabled={disabled}
                  />
                </IconInput>
              </Field>

              <Field label="Student" hint="read-only">
                <IconInput icon={User}>
                  <input
                    value={student ? student.name : ''}
                    readOnly
                    placeholder="—"
                    aria-label="Student name"
                    className={`${inputCls} text-re-navy/70 bg-re-bg/30`}
                  />
                </IconInput>
              </Field>
            </div>

            {isMomoMethod(method) && (
              <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-4 space-y-4">
                <p className="text-[9px] font-bold uppercase tracking-widest text-amber-900/80">
                  Mobile money details
                </p>
                <Field label="Payer phone" hint="optional">
                  <IconInput icon={Smartphone} iconClass="text-amber-600">
                    <input
                      value={momoPhone}
                      onChange={(e) => setMomoPhone(e.target.value)}
                      placeholder="07xx xxx xxx"
                      aria-label="Payer phone"
                      className={inputCls}
                      disabled={disabled}
                    />
                  </IconInput>
                </Field>
                <Field label="MoMo transaction ID / receipt" hint="optional">
                  <IconInput icon={Hash} iconClass="text-amber-600">
                    <input
                      value={transactionRef}
                      onChange={(e) => setTransactionRef(e.target.value)}
                      placeholder="Reference number"
                      aria-label="MoMo transaction ID or receipt number"
                      className={inputCls}
                      disabled={disabled}
                    />
                  </IconInput>
                </Field>
              </div>
            )}

            {isBankMethod(method) && (
              <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4 space-y-4">
                <p className="text-[9px] font-bold uppercase tracking-widest text-[#000435]/70">
                  Bank transfer details
                </p>
                <Field label="Bank name" required>
                  <IconInput icon={Building2} iconClass="text-[#000435]">
                    <input
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="e.g. Bank of Kigali"
                      aria-label="Bank name"
                      className={inputCls}
                      disabled={disabled}
                    />
                  </IconInput>
                </Field>
                <Field label="Paid by" hint="who paid · optional">
                  <IconInput icon={User} iconClass="text-[#000435]">
                    <input
                      value={paidBy}
                      onChange={(e) => setPaidBy(e.target.value)}
                      placeholder="Payer name"
                      aria-label="Paid by"
                      className={inputCls}
                      disabled={disabled}
                    />
                  </IconInput>
                </Field>
                <Field label="Transaction / receipt number" hint="optional">
                  <IconInput icon={Hash} iconClass="text-[#000435]">
                    <input
                      value={transactionRef}
                      onChange={(e) => setTransactionRef(e.target.value)}
                      placeholder="Reference number"
                      aria-label="Transaction or receipt number"
                      className={inputCls}
                      disabled={disabled}
                    />
                  </IconInput>
                </Field>
              </div>
            )}

            {!isBankMethod(method) && !isMomoMethod(method) && (
              <Field label="Reference / receipt number" hint="optional">
                <IconInput icon={Hash}>
                  <input
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    placeholder="Reference number"
                    aria-label="Reference or receipt number"
                    className={inputCls}
                    disabled={disabled}
                  />
                </IconInput>
              </Field>
            )}

            <Field label="Additional note" hint="optional">
              <div className="relative">
                <FileText size={14} className="absolute left-3 top-3 text-amber-500 pointer-events-none" />
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Internal note for finance records"
                  aria-label="Additional note"
                  className="w-full min-h-[72px] rounded-xl bg-white border border-black/5 outline-none pl-9 pr-3 py-3 text-[11px] font-medium text-re-navy focus:bg-white focus:border-[#000435]/20 transition-all resize-none disabled:opacity-50"
                  disabled={disabled}
                />
              </div>
            </Field>
          </div>

          <div className="px-5 md:px-6 py-4 border-t border-black/5 bg-white/20 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => onClose?.()}
              className="h-10 px-4 rounded-xl bg-white border border-black/5 text-re-navy font-medium text-[10px] uppercase tracking-widest hover:bg-re-bg transition-all"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="button"
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
