import React, { useState } from 'react';
import { ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api';

const fmt = (v) => `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(Number(v) || 0)} RWF`;

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
      <div className="min-h-screen bg-white px-6 py-8">
        <div className="max-w-2xl mx-auto rounded-2xl border border-[#000435] bg-white p-6">
          <p className="text-sm text-[#000435] font-semibold">No salary payment draft found. Start from Payroll Config.</p>
          <button onClick={() => navigate('/payroll/config')} className="mt-4 h-10 px-4 rounded-xl bg-[#000435] text-white text-xs font-black uppercase tracking-wider">
            Back To Payroll Config
          </button>
        </div>
      </div>
    );
  }

  const handlePay = async () => {
    setError('');
    if (paymentMethod === 'MTN' && !mtnPhone.trim()) {
      setError('MTN phone number is required.');
      return;
    }
    if (paymentMethod === 'BANK' && (!bankName.trim() || !bankAccount.trim())) {
      setError('Bank name and account number are required.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/accountant/payroll-requests', draft);
      navigate('/payroll/config');
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Failed to complete salary payment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white px-3 sm:px-6 lg:px-8 py-6 space-y-5" style={{ fontFamily: "'Montserrat', sans-serif" }}>
      <div className="rounded-3xl bg-[#000435] p-6 sm:p-8 text-white">
        <button onClick={() => navigate(-1)} className="h-9 px-3 rounded-lg border border-white/20 text-xs font-black uppercase tracking-wider inline-flex items-center gap-2">
          <ArrowLeft size={14} /> Back
        </button>
        <h1 className="text-2xl sm:text-3xl font-black mt-4">Salary Payment</h1>
        <p className="text-sm text-[#000435] mt-2">Pay salary using MTN Mobile Money or Bank Transfer.</p>
      </div>

      <div className="rounded-2xl border border-[#000435] bg-white p-5">
        <h2 className="text-base font-black text-[#000435] mb-3">Payroll Summary</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl border border-[#000435] p-3"><span className="text-[#000435]">Staff</span><p className="font-black text-[#000435]">{draft.staffName}</p></div>
          <div className="rounded-xl border border-[#000435] p-3"><span className="text-[#000435]">Staff Code</span><p className="font-black text-[#000435]">{draft.staffCode}</p></div>
          <div className="rounded-xl border border-[#000435] p-3"><span className="text-[#000435]">Period</span><p className="font-black text-[#000435]">{draft.month} / {draft.term} / {draft.year}</p></div>
          <div className="rounded-xl border border-[#000435] p-3"><span className="text-[#000435]">Amount To Pay</span><p className="font-black text-emerald-700">{fmt(draft.amount)}</p></div>
        </div>
      </div>

      <div className="rounded-2xl border border-[#000435] bg-white p-5 space-y-4">
        <h2 className="text-base font-black text-[#000435]">Payment Method</h2>
        <div className="flex gap-3">
          <button onClick={() => setPaymentMethod('MTN')} className={`h-10 px-4 rounded-xl border text-xs font-black uppercase tracking-wider ${paymentMethod === 'MTN' ? 'bg-[#000435] text-white border-[#000435]' : 'bg-white text-[#000435] border-[#000435]'}`}>
            MTN Mobile Money
          </button>
          <button onClick={() => setPaymentMethod('BANK')} className={`h-10 px-4 rounded-xl border text-xs font-black uppercase tracking-wider ${paymentMethod === 'BANK' ? 'bg-[#000435] text-white border-[#000435]' : 'bg-white text-[#000435] border-[#000435]'}`}>
            Bank Transfer
          </button>
        </div>

        {paymentMethod === 'MTN' && (
          <div>
            <label className="text-[11px] font-black uppercase tracking-widest text-[#000435]">MTN Phone Number</label>
            <input value={mtnPhone} onChange={(e) => setMtnPhone(e.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-[#000435] px-4 text-sm bg-white" placeholder="07xxxxxxxx" />
          </div>
        )}

        {paymentMethod === 'BANK' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-black uppercase tracking-widest text-[#000435]">Bank Name</label>
              <input value={bankName} onChange={(e) => setBankName(e.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-[#000435] px-4 text-sm bg-white" placeholder="Bank name" />
            </div>
            <div>
              <label className="text-[11px] font-black uppercase tracking-widest text-[#000435]">Account Number</label>
              <input value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-[#000435] px-4 text-sm bg-white" placeholder="Account number" />
            </div>
          </div>
        )}

        {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 font-semibold">{error}</div>}

        <div className="flex justify-end">
          <button onClick={handlePay} disabled={loading} className="h-10 px-5 rounded-xl bg-amber-500 text-[#000435] text-[11px] font-black uppercase tracking-widest inline-flex items-center gap-2 disabled:opacity-50">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            Confirm Salary Payment
          </button>
        </div>
      </div>
    </div>
  );
}
