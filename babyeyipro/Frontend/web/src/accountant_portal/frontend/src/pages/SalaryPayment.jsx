import React, { useState } from 'react';
import { ArrowLeft, CheckCircle2, Loader2, CreditCard, Smartphone, Banknote, User, AlertCircle } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api';

const fmt = (v) => `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Number(v) || 0)}`;

export default function SalaryPayment() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const draft = state?.payrollDraft || null;
  const [paymentMethod, setPaymentMethod] = useState('MTN');
  const [mtnPhone, setMtnPhone] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!draft) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans" style={{ fontFamily: "'Montserrat', sans-serif" }}>
        <div className="max-w-md w-full bg-white rounded-3xl shadow-sm border border-slate-100 p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={24} className="text-red-500" />
          </div>
          <h2 className="text-xl font-medium text-[#000435]">No Draft Found</h2>
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-widest leading-relaxed">
            Please start the payment process from the Payroll Configuration page.
          </p>
          <button
            onClick={() => navigate('/accountant/payroll/config')}
            className="mt-6 w-full h-12 rounded-xl bg-[#000435] text-[#FEBF10] text-[11px] font-medium uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-[#000435]/90 transition-all shadow-lg shadow-[#000435]/20"
          >
            <ArrowLeft size={16} /> Back To Payroll Config
          </button>
        </div>
      </div>
    );
  }

  const handlePay = async () => {
    setError('');
    if (!draft?.staffUserId || !draft?.staffName || !draft?.month || !draft?.term || !draft?.year || !(Number(draft?.amount) > 0)) {
      setError('PAYROLL DRAFT IS INCOMPLETE. GO BACK AND REGENERATE PAYMENT PAYLOAD.');
      return;
    }
    if (paymentMethod === 'MTN' && !mtnPhone.trim()) {
      setError('PLEASE ENTER A VALID MTN PHONE NUMBER.');
      return;
    }
    if (paymentMethod === 'BANK' && (!bankName.trim() || !bankAccount.trim())) {
      setError('PLEASE PROVIDE BOTH BANK NAME AND ACCOUNT NUMBER.');
      return;
    }

    setLoading(true);
    try {
      const reqId = draft.id || (draft.payrollId ? draft.payrollId.replace('PAY-', '') : null);
      if (!reqId) throw new Error('Missing request ID');

      await api.patch(`/manager/payroll-requests/${reqId}/decision`, {
        decision: 'pay',
        paymentMethod,
        paymentMeta: paymentMethod === 'MTN'
          ? { mtnPhone: mtnPhone.trim() || null }
          : { bankName: bankName.trim() || null, bankAccount: bankAccount.trim() || null },
      });
      navigate('/accountant/payroll/config', { state: { payrollPaymentSaved: true } });
    } catch (e) {
      setError((e?.response?.data?.message || e?.message || 'FAILED TO COMPLETE SALARY PAYMENT.').toUpperCase());
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20" style={{ fontFamily: "'Montserrat', sans-serif" }}>

      {/* ── Hero Header ── */}
      <div className="relative bg-[#000435] overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full border border-white/5" />
        <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full border border-white/5" />
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#FEBF10]/30 to-transparent" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-8 pt-10 pb-24 sm:pb-32">
          <button
            onClick={() => navigate(-1)}
            className="mb-6 h-9 px-3 rounded-lg bg-white/5 border border-white/10 text-white/70 text-[10px] font-medium uppercase tracking-wider inline-flex items-center gap-2 hover:bg-white/10 hover:text-white transition-all"
          >
            <ArrowLeft size={13} /> Go Back
          </button>

          <div className="flex items-center gap-4 sm:gap-6">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-[#FEBF10]/10 border border-[#FEBF10]/20 flex items-center justify-center shrink-0">
              <Banknote size={24} className="text-[#FEBF10]" />
            </div>
            <div>
              <p className="text-[9px] sm:text-[10px] font-medium uppercase tracking-[0.3em] text-[#FEBF10]/80 mb-1">FINANCE · DISBURSEMENT</p>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-medium text-white tracking-tight leading-none">
                Salary <span className="text-[#FEBF10]">Payment</span>
              </h1>
              <p className="text-[10px] sm:text-xs text-white/40 mt-2 font-medium uppercase tracking-widest max-w-md leading-relaxed">
                PROCESS SALARY DISBURSEMENTS SECURELY VIA MTN MOBILE MONEY OR BANK TRANSFER.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="acct-shell-salary space-y-6">

        {/* Payroll Summary Card */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
            <div className="w-8 h-8 rounded-full bg-[#000435]/5 flex items-center justify-center">
              <User size={14} className="text-[#000435]" />
            </div>
            <h2 className="text-[13px] font-medium text-[#000435] uppercase tracking-wider">Payroll Summary</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <p className="text-[9px] font-medium text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><User size={10} /> STAFF</p>
              <p className="text-[13px] font-medium text-[#000435] truncate">{draft.staffName}</p>
            </div>
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <p className="text-[9px] font-medium text-slate-400 uppercase tracking-widest mb-1.5">STAFF CODE</p>
              <p className="text-[13px] font-medium text-[#000435] truncate">{draft.staffCode}</p>
            </div>
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <p className="text-[9px] font-medium text-slate-400 uppercase tracking-widest mb-1.5">PERIOD</p>
              <p className="text-[11px] font-medium text-[#000435]">{draft.month} · {draft.term} · {draft.year}</p>
            </div>
            <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100/50 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10"><Banknote size={48} /></div>
              <p className="text-[9px] font-medium text-emerald-600/60 uppercase tracking-widest mb-1.5 relative z-10">AMOUNT TO PAY</p>
              <p className="text-[16px] xl:text-[18px] font-medium text-emerald-600 tabular-nums relative z-10">{fmt(draft.amount)} <span className="text-[10px]">RWF</span></p>
            </div>
          </div>
        </div>

        {/* Payment Configuration Card */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
            <div className="w-8 h-8 rounded-full bg-[#FEBF10]/10 flex items-center justify-center">
              <Banknote size={14} className="text-[#FEBF10]" />
            </div>
            <h2 className="text-[13px] font-medium text-[#000435] uppercase tracking-wider">Payment Configuration</h2>
          </div>

          {/* Method Selection */}
          <div className="mb-8">
            <label className="block text-[10px] font-medium text-slate-400 uppercase tracking-widest mb-3">SELECT DISBURSEMENT METHOD</label>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:w-2/3">
              <button
                onClick={() => setPaymentMethod('MTN')}
                className={`relative flex flex-col items-center justify-center gap-2.5 h-24 sm:h-28 rounded-2xl border-2 transition-all ${paymentMethod === 'MTN' ? 'border-[#000435] bg-[#000435]/5 text-[#000435] shadow-lg shadow-[#000435]/5' : 'border-slate-100 bg-white text-slate-400 hover:border-slate-300 hover:bg-slate-50'}`}
              >
                {paymentMethod === 'MTN' && <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-[#FEBF10] animate-pulse" />}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${paymentMethod === 'MTN' ? 'bg-[#000435]/10' : 'bg-slate-100'}`}>
                  <Smartphone size={20} className={paymentMethod === 'MTN' ? 'text-[#000435]' : 'text-slate-400'} />
                </div>
                <span className="text-[10px] font-medium uppercase tracking-widest">MTN Mobile</span>
              </button>

              <button
                onClick={() => setPaymentMethod('BANK')}
                className={`relative flex flex-col items-center justify-center gap-2.5 h-24 sm:h-28 rounded-2xl border-2 transition-all ${paymentMethod === 'BANK' ? 'border-[#000435] bg-[#000435]/5 text-[#000435] shadow-lg shadow-[#000435]/5' : 'border-slate-100 bg-white text-slate-400 hover:border-slate-300 hover:bg-slate-50'}`}
              >
                {paymentMethod === 'BANK' && <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-[#FEBF10] animate-pulse" />}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${paymentMethod === 'BANK' ? 'bg-[#000435]/10' : 'bg-slate-100'}`}>
                  <CreditCard size={20} className={paymentMethod === 'BANK' ? 'text-[#000435]' : 'text-slate-400'} />
                </div>
                <span className="text-[10px] font-medium uppercase tracking-widest">Bank Transfer</span>
              </button>
            </div>
          </div>

          {/* Form Fields */}
          <div className="max-w-2xl bg-slate-50 rounded-2xl p-5 sm:p-6 border border-slate-100">
            {paymentMethod === 'MTN' && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <label className="block text-[10px] font-medium uppercase tracking-widest text-slate-500 mb-2">MTN PHONE NUMBER</label>
                <div className="relative">
                  <Smartphone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400/80" />
                  <input
                    value={mtnPhone}
                    onChange={(e) => setMtnPhone(e.target.value.replace(/[^\d+ ]/g, ''))}
                    className="h-12 w-full rounded-xl border border-slate-200 bg-white px-11 text-[13px] font-medium text-[#000435] outline-none focus:border-[#000435]/40 focus:bg-white transition-all placeholder:text-slate-300/80 hover:border-slate-300 shadow-sm"
                    placeholder="e.g. 078XXXXXXX"
                    inputMode="tel"
                  />
                </div>
                <p className="mt-2 text-[9px] font-medium text-slate-400 uppercase tracking-widest">Verify the mobile money number before proceeding.</p>
              </div>
            )}

            {paymentMethod === 'BANK' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div>
                  <label className="block text-[10px] font-medium uppercase tracking-widest text-slate-500 mb-2">BANK NAME</label>
                  <div className="relative">
                    <Banknote size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400/80" />
                    <input
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="h-12 w-full rounded-xl border border-slate-200 bg-white px-11 text-[13px] font-medium text-[#000435] outline-none focus:border-[#000435]/40 focus:bg-white transition-all placeholder:text-slate-300/80 hover:border-slate-300 shadow-sm"
                      placeholder="e.g. Bank of Kigali"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-medium uppercase tracking-widest text-slate-500 mb-2">ACCOUNT NUMBER</label>
                  <div className="relative">
                    <CreditCard size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400/80" />
                    <input
                      value={bankAccount}
                      onChange={(e) => setBankAccount(e.target.value.replace(/[^\d-]/g, ''))}
                      className="h-12 w-full rounded-xl border border-slate-200 bg-white px-11 text-[13px] font-medium text-[#000435] outline-none focus:border-[#000435]/40 focus:bg-white transition-all placeholder:text-slate-300/80 hover:border-slate-300 shadow-sm"
                      placeholder="XXXX-XXXX-XXXX"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 animate-in fade-in zoom-in-95 shadow-sm">
              <p className="text-[10px] font-medium text-red-600 flex items-center gap-2 uppercase tracking-wider">
                <AlertCircle size={14} /> {error}
              </p>
            </div>
          )}

          {/* Action Footer */}
          <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col-reverse sm:flex-row justify-between items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              disabled={loading}
              className="w-full sm:w-auto h-12 px-6 rounded-xl border border-slate-200 bg-white text-slate-600 text-[11px] font-medium uppercase tracking-widest hover:bg-slate-50 hover:text-slate-800 transition-all disabled:opacity-50"
            >
              Cancel Payment
            </button>
            <button
              onClick={handlePay}
              disabled={loading}
              className="w-full sm:w-auto h-12 px-10 rounded-xl bg-[#000435] text-[#FEBF10] text-[11px] font-medium uppercase tracking-widest inline-flex items-center justify-center gap-2.5 hover:bg-[#000435]/90 active:scale-95 transition-all shadow-sm shadow-[#000435]/30 disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin text-[#FEBF10]" /> PROCESSING...
                </>
              ) : (
                <>
                  CONFIRM PAYMENT <CheckCircle2 size={16} />
                </>
              )}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
