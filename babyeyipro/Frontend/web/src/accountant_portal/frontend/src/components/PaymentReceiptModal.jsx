import { createPortal } from 'react-dom';
import { X, Download, Printer, Receipt, CheckCircle2, Building2, Smartphone, User } from 'lucide-react';
import {
  buildReceiptViewModel,
  downloadFeePaymentReceiptPdf,
  formatMoneyRWF,
  formatReceiptDate,
  printFeePaymentReceiptPdf,
} from '../utils/feePaymentReceipt';

export default function PaymentReceiptModal({ isOpen, payment, context, onClose }) {
  if (!isOpen || !payment) return null;

  const receipt = buildReceiptViewModel(payment, context);
  const isBank = String(receipt.paymentMethod || '').toLowerCase().includes('bank');
  const isMomo = String(receipt.paymentMethod || '').toLowerCase().includes('mobile');

  return createPortal(
    <div className="fixed inset-0 z-[240]">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-md" onClick={() => onClose?.()} />

      <div className="absolute inset-x-0 top-8 md:top-12 mx-auto w-[94vw] max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="bg-white rounded-[28px] border border-black/10 shadow-2xl overflow-hidden">
          <div
            className="px-6 py-5 text-white"
            style={{ background: 'linear-gradient(135deg, #000435 0%, #0D2644 100%)' }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-emerald-300 text-[10px] font-bold uppercase tracking-widest mb-2">
                  <CheckCircle2 size={14} />
                  Payment recorded
                </div>
                <h3 className="text-lg font-bold tracking-tight">{receipt.schoolName}</h3>
                <p className="text-[11px] text-white/70 mt-1">Official fees receipt</p>
              </div>
              <button
                type="button"
                onClick={() => onClose?.()}
                className="w-9 h-9 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center hover:bg-white/20"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-5">
            <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-amber-50 border border-amber-100">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-amber-800/70">Receipt number</p>
                <p className="text-sm font-mono font-bold text-[#000435] mt-1">{receipt.receiptNo}</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-bold uppercase tracking-widest text-amber-800/70">Amount</p>
                <p className="text-xl font-bold text-[#000435] mt-1">{formatMoneyRWF(receipt.amountPaid)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-[11px]">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-[8px] font-bold uppercase tracking-widest text-slate-400">Student</p>
                <p className="font-bold text-[#000435] mt-1">{receipt.studentName}</p>
                <p className="text-slate-500 mt-0.5">{receipt.studentCode} · {receipt.className}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-[8px] font-bold uppercase tracking-widest text-slate-400">Period</p>
                <p className="font-bold text-[#000435] mt-1">{receipt.term}</p>
                <p className="text-slate-500 mt-0.5">{receipt.academicYear}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 divide-y divide-slate-100 text-[11px]">
              <div className="flex justify-between px-4 py-3">
                <span className="text-slate-500">Date paid</span>
                <span className="font-semibold text-[#000435]">{formatReceiptDate(receipt.paidAt)}</span>
              </div>
              <div className="flex justify-between px-4 py-3">
                <span className="text-slate-500">Payment method</span>
                <span className="font-semibold text-[#000435]">{receipt.paymentMethod}</span>
              </div>
              {isBank && receipt.bankName ? (
                <div className="flex justify-between px-4 py-3 gap-3">
                  <span className="text-slate-500 flex items-center gap-1.5 shrink-0">
                    <Building2 size={12} /> Bank
                  </span>
                  <span className="font-semibold text-[#000435] text-right">{receipt.bankName}</span>
                </div>
              ) : null}
              {receipt.paidBy ? (
                <div className="flex justify-between px-4 py-3 gap-3">
                  <span className="text-slate-500 flex items-center gap-1.5 shrink-0">
                    <User size={12} /> Paid by
                  </span>
                  <span className="font-semibold text-[#000435] text-right">{receipt.paidBy}</span>
                </div>
              ) : null}
              {isMomo && receipt.momoPhone ? (
                <div className="flex justify-between px-4 py-3 gap-3">
                  <span className="text-slate-500 flex items-center gap-1.5 shrink-0">
                    <Smartphone size={12} /> MoMo phone
                  </span>
                  <span className="font-semibold text-[#000435] text-right">{receipt.momoPhone}</span>
                </div>
              ) : null}
              {receipt.transactionRef ? (
                <div className="flex justify-between px-4 py-3 gap-3">
                  <span className="text-slate-500 flex items-center gap-1.5 shrink-0">
                    <Receipt size={12} /> Transaction #
                  </span>
                  <span className="font-mono font-semibold text-[#000435] text-right break-all">{receipt.transactionRef}</span>
                </div>
              ) : null}
              <div className="flex justify-between px-4 py-3">
                <span className="text-slate-500">Balance remaining</span>
                <span className="font-semibold text-red-600">{formatMoneyRWF(receipt.balanceRemaining)}</span>
              </div>
            </div>

            {receipt.notes ? (
              <p className="text-[10px] text-slate-500 leading-relaxed px-1">
                Note: {receipt.notes}
              </p>
            ) : null}

            <p className="text-[10px] text-center text-slate-400">
              Download or print this receipt for the payer. You can close without saving — the payment is already stored.
            </p>
          </div>

          <div className="px-6 py-4 border-t border-black/5 bg-slate-50/80 flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => onClose?.()}
              className="h-10 px-4 rounded-xl bg-white border border-black/10 text-[#000435] font-bold text-[10px] uppercase tracking-widest hover:bg-slate-50"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => printFeePaymentReceiptPdf(receipt)}
              className="h-10 px-4 rounded-xl bg-white border border-black/10 text-[#000435] font-bold text-[10px] uppercase tracking-widest hover:bg-slate-50 inline-flex items-center gap-2"
            >
              <Printer size={14} />
              Print
            </button>
            <button
              type="button"
              onClick={() => downloadFeePaymentReceiptPdf(receipt)}
              className="h-10 px-4 rounded-xl text-white font-bold text-[10px] uppercase tracking-widest inline-flex items-center gap-2"
              style={{ background: 'linear-gradient(135deg, #000435 0%, #0D2644 100%)' }}
            >
              <Download size={14} />
              Download PDF
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
