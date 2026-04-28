import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { CreditCard, Calendar, X, User, Banknote, FileText } from 'lucide-react';

const METHODS = ['Cash', 'Mobile Money', 'Bank Transfer', 'Card'];

function formatMoneyRWF(value) {
  const n = Number(value) || 0;
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'RWF', maximumFractionDigits: 0 }).format(n);
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
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('Mobile Money');
  const [paidAt, setPaidAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setSubmitting(false);
    setAmount('');
    setMethod('Mobile Money');
    setPaidAt(new Date().toISOString().slice(0, 10));
    setNote('');
  }, [isOpen]);

  const context = useMemo(() => {
    const amountToPay = Number(student?.amountToPay) || 0;
    const paidThisTerm = Number(student?.paidThisTerm) || 0;
    const remaining = Number(student?.remaining) || (amountToPay - paidThisTerm);
    return { amountToPay, paidThisTerm, remaining };
  }, [student]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[220]">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-md" onClick={() => onClose?.()} />

      <div className="absolute inset-x-0 top-10 md:top-16 mx-auto w-[92vw] max-w-xl">
        <div className="bg-white rounded-[24px] shadow-2xl border border-black/10 overflow-hidden">
          <div className="px-5 md:px-6 py-4 border-b border-black/5 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.28em] text-re-text-muted/45">
                Record payment · {academicYear} · {term}
              </p>
              <h3 className="text-base md:text-lg font-black text-re-navy tracking-tight truncate">
                {student ? student.name : 'Student payment'}
              </h3>
              {student && (
                <p className="text-[10px] font-bold text-re-text-muted/70 mt-1 truncate">
                  UID {student.id} · {student.class} · Remaining {formatMoneyRWF(context.remaining)}
                </p>
              )}
            </div>
            <button
              onClick={() => onClose?.()}
              className="shrink-0 w-9 h-9 rounded-xl border border-black/10 bg-re-bg shadow-inner flex items-center justify-center hover:bg-white transition-colors"
              aria-label="Close modal"
            >
              <X size={16} className="text-slate-500" />
            </button>
          </div>

          <div className="p-5 md:p-6 space-y-4">
            {!student && (
              <div className="rounded-2xl bg-amber-50 border border-amber-100 p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-800">
                  Select a student first
                </p>
                <p className="text-[10px] font-bold text-amber-800/70 mt-1">
                  Open a learner record from the table, then tap “Record Payment”.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="relative">
                <Banknote size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500" />
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ''))}
                  inputMode="numeric"
                  placeholder="Amount (RWF)"
                  className="w-full h-11 rounded-xl bg-re-bg border border-black/5 outline-none pl-9 pr-3 text-[11px] font-black text-re-navy shadow-inner focus:bg-white focus:border-[#1E3A5F]/20 transition-all"
                  disabled={!student || submitting}
                />
              </div>

              <div className="relative">
                <CreditCard size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500" />
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className="w-full h-11 rounded-xl bg-re-bg border border-black/5 outline-none pl-9 pr-3 text-[11px] font-black text-re-navy shadow-inner focus:bg-white focus:border-[#1E3A5F]/20 transition-all cursor-pointer"
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
                  className="w-full h-11 rounded-xl bg-re-bg border border-black/5 outline-none pl-9 pr-3 text-[11px] font-black text-re-navy shadow-inner focus:bg-white focus:border-[#1E3A5F]/20 transition-all"
                  disabled={!student || submitting}
                />
              </div>

              <div className="relative">
                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500" />
                <input
                  value={student ? `${student.name}` : ''}
                  readOnly
                  placeholder="Student"
                  className="w-full h-11 rounded-xl bg-re-bg border border-black/5 outline-none pl-9 pr-3 text-[11px] font-black text-re-navy/70 shadow-inner"
                />
              </div>
            </div>

            <div className="relative">
              <FileText size={14} className="absolute left-3 top-3 text-amber-500" />
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Note (optional)"
                className="w-full min-h-[90px] rounded-xl bg-re-bg border border-black/5 outline-none pl-9 pr-3 py-3 text-[11px] font-bold text-re-navy shadow-inner focus:bg-white focus:border-[#1E3A5F]/20 transition-all resize-none"
                disabled={!student || submitting}
              />
            </div>
          </div>

          <div className="px-5 md:px-6 py-4 border-t border-black/5 bg-re-bg/20 flex items-center justify-end gap-2">
            <button
              onClick={() => onClose?.()}
              className="h-10 px-4 rounded-xl bg-white border border-black/5 text-re-navy font-black text-[10px] uppercase tracking-widest hover:bg-re-bg transition-all"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                if (!student) return;
                const amt = Number(amount) || 0;
                if (amt <= 0) return;
                setSubmitting(true);
                try {
                  if (onSave) {
                    await onSave({
                      amount: amt,
                      method,
                      paidAt,
                      note,
                    });
                  }
                  onClose?.({ saved: true, amount: amt, method, paidAt, note });
                } finally {
                  setSubmitting(false);
                }
              }}
              className="h-10 px-4 rounded-xl text-white font-black text-[10px] uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100"
              style={{ background: 'linear-gradient(135deg, #1E3A5F 0%, #0D2644 100%)' }}
              disabled={!student || submitting || !(Number(amount) > 0)}
            >
              Save payment
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

