/**
 * TichaDealPayments.jsx
 * Modern payment page — #000435 navy + amber
 * MTN MoMo (live collection) + Airtel / Bank / Visa (intent)
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../../../services/api';
import {
  ArrowLeft, Loader2, Smartphone, Building2, CreditCard,
  CheckCircle2, AlertCircle, Info, Clock, Shield, ChevronRight,
  Lock, Banknote, Copy, Check,
} from 'lucide-react';

const MOMO_POLL_MS = 2500;
const MOMO_MAX_POLLS = 48;

/** Montserrat is linked in `teacher-portal/index.html` */
const PAGE_FONT_FAMILY = "'Montserrat', system-ui, sans-serif";

/**
 * Babyeyi deposit accounts per bank (same catalogue pattern as main payments.jsx).
 * Replace placeholders with live banking details when operating.
 */
const BABYEYI_BANK_DEPOSITS = [
  { code: 'bk', name: 'Bank of Kigali (BK)', accountNo: '00000-0000000-0', accountName: 'Babyeyi Ltd' },
  { code: 'umwalimu', name: 'Umwalimu SACCO', accountNo: '0000-000000-00', accountName: 'Babyeyi Ltd' },
  { code: 'equity', name: 'Equity Bank Rwanda', accountNo: '4001-xxxxxxx', accountName: 'Babyeyi Ltd' },
  { code: 'im', name: 'I&M Bank Rwanda', accountNo: 'RW00-xxxx', accountName: 'Babyeyi Ltd' },
  { code: 'access', name: 'Access Bank Rwanda', accountNo: 'ACC-xxxx', accountName: 'Babyeyi Ltd' },
  { code: 'bpr', name: 'BPR / Bank of Africa', accountNo: '00040-xxxxxxx', accountName: 'Babyeyi Ltd' },
  { code: 'kcb', name: 'KCB Bank Rwanda', accountNo: '11xxxxxxxx', accountName: 'Babyeyi Ltd' },
  { code: 'gt', name: 'GTBank Rwanda', accountNo: 'xxxxxxxxxx', accountName: 'Babyeyi Ltd' },
  { code: 'other', name: 'Other Rwandan bank', accountNo: '', accountName: '', otherNote: true },
];

function sanitizeRwandaPhone(raw) {
  if (!raw) return '';
  let p = String(raw).trim().replace(/\s+/g, '');
  if (p.startsWith('+')) p = p.slice(1);
  p = p.replace(/[^0-9]/g, '');
  if (p.startsWith('2507') && p.length === 12) return p;
  if (p.startsWith('07') && p.length === 10) return `250${p.slice(1)}`;
  if (p.startsWith('7') && p.length === 9) return `250${p}`;
  return p;
}

function isValidMtnRw(raw) {
  return /^2507[0-9]{8}$/.test(sanitizeRwandaPhone(raw));
}

function formatFrw(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return '—';
  return `${Math.round(v).toLocaleString('en-RW')} RWF`;
}

/* ── Payment method tab ── */
function MethodTab({ label, Icon, active, onClick }) {
  return (
    <button type="button" onClick={onClick}
      className={`flex-1 flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 text-center transition-all min-h-[60px] ${
        active
          ? 'border-[#000435] bg-[#000435] text-white shadow-md'
          : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50'
      }`}>
      {React.createElement(Icon, { size: 18 })}
      <span className="text-[10px] font-black uppercase tracking-wider leading-none">{label}</span>
    </button>
  );
}

/* ── Input field ── */
function PayField({ label, value, onChange, placeholder, inputMode = 'text', hint }) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-2">{label}</label>
      <div className={`flex items-center gap-2.5 px-3.5 h-12 rounded-xl border-2 bg-slate-50 transition-all ${
        focused ? 'border-[#000435] bg-white shadow-sm' : 'border-slate-200'
      }`}>
        <input
          value={value} onChange={onChange} placeholder={placeholder} inputMode={inputMode}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          className="flex-1 bg-transparent text-sm font-semibold text-slate-800 placeholder:text-slate-400 outline-none"
        />
      </div>
      {hint && <p className="text-[11px] text-slate-400 mt-1.5 ml-1">{hint}</p>}
    </div>
  );
}

/* ── Select (banks) ── */
function PaySelect({ label, value, onChange, children }) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-2">{label}</label>
      <div className={`flex items-center gap-2.5 px-3.5 h-12 rounded-xl border-2 bg-slate-50 transition-all ${
        focused ? 'border-[#000435] bg-white shadow-sm' : 'border-slate-200'
      }`}>
        <select
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="w-full bg-transparent text-sm font-semibold text-slate-800 outline-none cursor-pointer"
        >
          {children}
        </select>
      </div>
    </div>
  );
}

/* ── Submit button ── */
function SubmitBtn({ onClick, disabled, loading, label, amber = false }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled || loading}
      className={`w-full flex items-center justify-center gap-2.5 py-4 rounded-xl font-black text-sm
      min-h-[52px] transition-all active:scale-[.98] ${
        disabled || loading
          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
          : amber
            ? 'bg-amber-400 text-[#000435] hover:bg-amber-300 shadow-lg shadow-amber-400/25'
            : 'bg-[#000435] text-white hover:bg-[#000c70] shadow-lg shadow-[#000435]/20'
      }`}>
      {loading
        ? <Loader2 size={18} className="animate-spin" />
        : label}
    </button>
  );
}

export default function LiteTichaDealPaymentsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = String(searchParams.get('tdt') || '').trim();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [payload, setPayload] = useState(null);

  const [method, setMethod] = useState('momo');
  const [momoPhone, setMomoPhone] = useState('');
  const [airtelPhone, setAirtelPhone] = useState('');
  const [bankHolder, setBankHolder] = useState('');
  const [bankRef, setBankRef] = useState('');
  const [bankCode, setBankCode] = useState(BABYEYI_BANK_DEPOSITS[0]?.code || 'bk');
  const [copiedAcc, setCopiedAcc] = useState(false);
  const [visaName, setVisaName] = useState('');
  const [visaLast4, setVisaLast4] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(null);
  const [momoWaiting, setMomoWaiting] = useState(null);
  const pollTimerRef = useRef(null);

  const stopMomoPoll = useCallback(() => {
    if (pollTimerRef.current) { clearTimeout(pollTimerRef.current); pollTimerRef.current = null; }
  }, []);

  const load = useCallback(async () => {
    if (!token) {
      setError('Missing payment link. Go back to the deal and start again.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/services/shule-avance/public/teacher-deal-pay-payload', { params: { token } });
      if (!res.data?.success || !res.data.data) throw new Error(res.data?.message || 'Invalid or expired payment session');
      const p = res.data.data;
      setPayload(p);
      setMomoPhone(String(p.payer_phone || '').trim());
      setAirtelPhone(String(p.payer_phone || '').trim());
      setVisaName(String(p.payer_name || '').trim());
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Could not load payment.');
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => () => stopMomoPoll(), [stopMomoPoll]);

  const pollMomoStatus = useCallback(async (refId, orderNumber, attemptIndex) => {
    if (!token || !refId) return;
    setMomoWaiting(w => w ? { ...w, pollCount: attemptIndex + 1 } : w);
    try {
      const res = await api.post('/services/shule-avance/public/teacher-deal-pay-momo-status', { token, reference_id: refId });
      const d = res.data?.data;
      if (!res.data?.success) { stopMomoPoll(); setMomoWaiting(null); setSubmitting(false); setError(res.data?.message || 'Status check failed'); return; }
      if (d?.phase === 'complete' || d?.mtn_status === 'SUCCESSFUL') {
        stopMomoPoll(); setMomoWaiting(null); setSubmitting(false);
        setDone({ title: 'Payment Received!', detail: d?.message || 'Your payment was completed successfully.', ref: d?.order_number || orderNumber || '' });
        return;
      }
      if (d?.payment_failed || d?.phase === 'failed') { stopMomoPoll(); setMomoWaiting(null); setError(d?.message || 'Payment was not completed on the phone.'); return; }
      if (attemptIndex + 1 >= MOMO_MAX_POLLS) { stopMomoPoll(); setMomoWaiting(null); setError('No confirmation from MTN in time. If you already paid, please wait a few minutes or contact finance.'); return; }
      pollTimerRef.current = setTimeout(() => pollMomoStatus(refId, orderNumber, attemptIndex + 1), MOMO_POLL_MS);
    } catch (e) {
      if (attemptIndex + 1 >= MOMO_MAX_POLLS) { stopMomoPoll(); setMomoWaiting(null); setSubmitting(false); setError(e.message || 'Could not confirm payment.'); return; }
      pollTimerRef.current = setTimeout(() => pollMomoStatus(refId, orderNumber, attemptIndex + 1), MOMO_POLL_MS * 2);
    }
  }, [token, stopMomoPoll]);

  const refCode = useMemo(() => (token ? `TD-${token.slice(0, 8).toUpperCase()}` : ''), [token]);
  const amount = useMemo(() => Math.max(0, Math.round(Number(payload?.amount_rwf) || 0)), [payload]);

  const selectedBankDeposit = useMemo(
    () => BABYEYI_BANK_DEPOSITS.find((b) => b.code === bankCode) || BABYEYI_BANK_DEPOSITS[0],
    [bankCode]
  );

  const copyDepositAccount = useCallback(async () => {
    const n = String(selectedBankDeposit?.accountNo || '').trim();
    if (!n) return;
    try {
      await navigator.clipboard.writeText(n);
      setCopiedAcc(true);
      setTimeout(() => setCopiedAcc(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }, [selectedBankDeposit]);

  const payMtn = async () => {
    if (!token) return;
    if (!isValidMtnRw(momoPhone)) { setError('Enter a valid Rwanda MTN number (e.g. 078…).'); return; }
    setSubmitting(true); setError(null);
    try {
      const res = await api.post('/services/shule-avance/public/teacher-deal-pay-momo', { token, momo_phone: momoPhone });
      const j = res.data || {};
      if (!j.success) { const base = j.message || 'Payment could not start.'; const hint = j.detail ? ` ${j.detail}` : ''; throw new Error(base + hint); }
      const d = j.data || {};
      if (d.phase === 'complete' && String(d.mtn_status || '').toUpperCase() === 'SUCCESSFUL') {
        setDone({ title: 'Payment Received!', detail: d.message || 'Your payment was completed successfully.', ref: d.order_number || '' });
        return;
      }
      if (d.mtn_reference_id && (d.phase === 'awaiting_device' || String(d.mtn_status || '').toUpperCase() === 'PENDING')) {
        setSubmitting(false);
        setMomoWaiting({ mtnReferenceId: d.mtn_reference_id, orderNumber: d.order_number || '', pollCount: 0 });
        stopMomoPoll();
        pollTimerRef.current = setTimeout(() => pollMomoStatus(d.mtn_reference_id, d.order_number || '', 0), MOMO_POLL_MS);
        return;
      }
      setError('Unexpected response. Please try again.');
    } catch (e) {
      const d = e.response?.data;
      const line = d && (d.message || d.detail) ? [d.message, d.detail].filter(x => x?.trim()).join(' ') : e.message;
      setError(line || 'Payment failed');
    } finally {
      if (!pollTimerRef.current) setSubmitting(false);
    }
  };

  const submitAlt = async (channel, extra) => {
    if (!token) return;
    setSubmitting(true); setError(null);
    try {
      const res = await api.post('/services/shule-avance/public/teacher-deal-pay-alt-intent', { token, channel, ...extra });
      const j = res.data || {};
      if (!j.success) throw new Error(j.message || 'Could not save');
      const detail = channel === 'airtel_money'
        ? 'Your Airtel Money preference is logged. Finance may contact you or send a wallet request.'
        : channel === 'bank_transfer'
          ? 'Use the reference below when you transfer. Finance will match your payment.'
          : 'Visa / card details recorded. School finance will follow up with you.';
      setDone({ title: 'Request Recorded', detail, ref: refCode });
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Failed');
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="min-h-screen bg-[#000435] flex flex-col items-center justify-center gap-4" style={{ fontFamily: PAGE_FONT_FAMILY }}>
        <Loader2 className="w-10 h-10 text-amber-400 animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Loading payment…</p>
      </div>
    );
  }

  /* ── MoMo Waiting ── */
  if (momoWaiting) {
    return (
      <div className="min-h-screen bg-[#000435] flex items-center justify-center p-4" style={{ fontFamily: PAGE_FONT_FAMILY }}>
        <div className="w-full max-w-sm bg-white rounded-3xl p-8 text-center shadow-2xl">
          <div className="w-20 h-20 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-5">
            <Clock size={36} className="text-amber-500 animate-pulse" />
          </div>
          <h2 className="text-xl font-black text-[#000435] mb-2">Approve on your phone</h2>
          <p className="text-sm text-slate-500 font-semibold leading-relaxed mb-4">
            A payment prompt was sent to your MTN number. Enter your PIN only when ready to pay.
          </p>
          <p className="text-xs text-slate-400 font-semibold mb-4">
            This page will update automatically after MTN confirms.
          </p>
          {momoWaiting.orderNumber && (
            <div className="bg-slate-50 rounded-xl px-4 py-2.5 mb-5">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-0.5">Reference</p>
              <p className="text-sm font-mono font-black text-[#000435]">{momoWaiting.orderNumber}</p>
            </div>
          )}
          <div className="flex items-center justify-center gap-2 mb-6">
            <Loader2 size={16} className="text-amber-500 animate-spin" />
            <span className="text-xs font-black uppercase tracking-wider text-amber-600">
              Checking {momoWaiting.pollCount > 0 ? `(${momoWaiting.pollCount}/${MOMO_MAX_POLLS})` : ''}
            </span>
          </div>
          <button type="button"
            onClick={() => { stopMomoPoll(); setMomoWaiting(null); setSubmitting(false); }}
            className="w-full py-3.5 rounded-xl border-2 border-slate-200 text-slate-600 font-black text-sm hover:bg-slate-50 transition-all">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  /* ── Done ── */
  if (done) {
    return (
      <div className="min-h-screen bg-[#000435] flex items-center justify-center p-4" style={{ fontFamily: PAGE_FONT_FAMILY }}>
        <div className="w-full max-w-sm bg-white rounded-3xl p-8 text-center shadow-2xl">
          <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 size={40} className="text-emerald-500" />
          </div>
          <h2 className="text-xl font-black text-[#000435] mb-2">{done.title}</h2>
          <p className="text-sm text-slate-500 font-semibold leading-relaxed mb-4">{done.detail}</p>
          {done.ref && (
            <div className="bg-slate-50 rounded-xl px-4 py-2.5 mb-6">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-0.5">Reference</p>
              <p className="text-sm font-mono font-black text-[#000435]">{done.ref}</p>
            </div>
          )}
          <div className="space-y-3">
            <button type="button" onClick={() => navigate('/lite/shule-avance')}
              className="w-full py-4 rounded-xl bg-amber-400 text-[#000435] font-black text-sm shadow-lg shadow-amber-400/25 hover:bg-amber-300 transition-all">
              Track Deal Status
            </button>
            <button type="button" onClick={() => navigate('/lite/shule-avance/deals')}
              className="w-full py-3.5 rounded-xl border-2 border-slate-200 text-slate-600 font-black text-sm hover:bg-slate-50 transition-all">
              Back to Catalog
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Main payment UI ── */
  return (
    <>
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .slide-up { animation: slideUp 0.3s cubic-bezier(.22,1,.36,1) both; }
      `}</style>

      <div className="min-h-screen bg-[#000435]" style={{ fontFamily: PAGE_FONT_FAMILY }}>

        {/* Top bar */}
        <div className="sticky top-0 z-20 bg-[#000435]/95 backdrop-blur-xl border-b border-white/8">
          <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
            <button type="button" onClick={() => navigate(-1)}
              className="w-9 h-9 rounded-xl bg-white/8 border border-white/12 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/14 transition-all">
              <ArrowLeft size={16} />
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black uppercase tracking-wider text-white/40 leading-none">Teacher Deal</p>
              <p className="text-sm font-black text-white truncate leading-tight mt-0.5">{payload?.product_name || 'Payment'}</p>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-400">
              <Lock size={12} /> Secure
            </div>
          </div>
        </div>

        <div className="max-w-lg mx-auto px-4 py-6 pb-16">

          {/* Amount hero card */}
          <div className="rounded-2xl overflow-hidden mb-5 shadow-xl shadow-black/30"
            style={{ background: 'linear-gradient(135deg, #000435 0%, #001580 60%, #000c70 100%)' }}>
            <div className="px-5 py-5 border-b border-white/8">
              <p className="text-[10px] font-black uppercase tracking-wider text-white/40 mb-2">Amount Due</p>
              <p className="text-4xl font-black text-amber-400">
                {formatFrw(amount)}
              </p>
              {payload?.payer_name && (
                <p className="text-xs text-white/50 font-semibold mt-2">Payer: {payload.payer_name}</p>
              )}
            </div>
            {payload?.product_name && (
              <div className="px-5 py-3 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-400" />
                <p className="text-xs text-white/60 font-semibold truncate">{payload.product_name}</p>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-400/25 text-red-300 text-sm font-semibold">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" /> {error}
            </div>
          )}

          {/* Method tabs */}
          <div className="mb-5">
            <p className="text-[10px] font-black uppercase tracking-wider text-white/40 mb-3">Payment Method</p>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'momo', label: 'MTN', Icon: Smartphone },
                { id: 'airtel', label: 'Airtel', Icon: Smartphone },
                { id: 'bank', label: 'Bank', Icon: Building2 },
                { id: 'visa', label: 'Visa', Icon: CreditCard },
              ].map(({ id, label, Icon }) => (
                <MethodTab key={id} id={id} label={label} Icon={Icon}
                  active={method === id}
                  onClick={() => { setMethod(id); setError(null); }} />
              ))}
            </div>
          </div>

          {/* Info banner */}
          <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-amber-400/8 border border-amber-400/20 mb-5">
            <Info size={15} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] font-semibold text-amber-200/80 leading-relaxed">
              MTN MoMo sends a live payment prompt to your phone. Other methods are recorded for school finance to process.
            </p>
          </div>

          {/* Method form */}
          <div className="bg-white rounded-2xl p-5 shadow-xl shadow-black/20 slide-up" key={method}>

            {/* ── MTN MoMo ── */}
            {method === 'momo' && (
              <div className="space-y-5">
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-10 h-10 rounded-xl bg-amber-400 flex items-center justify-center">
                    <Smartphone size={18} className="text-[#000435]" />
                  </div>
                  <div>
                    <p className="font-black text-[#000435] text-sm">MTN Mobile Money</p>
                    <p className="text-xs text-slate-500">Live push payment to your phone</p>
                  </div>
                </div>

                <PayField
                  label="MTN MoMo Number"
                  value={momoPhone}
                  onChange={e => { setMomoPhone(e.target.value); setError(null); }}
                  placeholder="078 000 0000"
                  inputMode="tel"
                  hint="Enter your MTN number starting with 078 or 079"
                />

                <SubmitBtn
                  onClick={payMtn}
                  disabled={!isValidMtnRw(momoPhone)}
                  loading={submitting}
                  label={<><Smartphone size={16} /> Pay {formatFrw(amount)} with MTN</>}
                  amber
                />
              </div>
            )}

            {/* ── Airtel ── */}
            {method === 'airtel' && (
              <div className="space-y-5">
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-10 h-10 rounded-xl bg-[#000435] flex items-center justify-center">
                    <Smartphone size={18} className="text-white" />
                  </div>
                  <div>
                    <p className="font-black text-[#000435] text-sm">Airtel Money</p>
                    <p className="text-xs text-slate-500">Finance will send a payment request</p>
                  </div>
                </div>

                <PayField
                  label="Airtel Money Number"
                  value={airtelPhone}
                  onChange={e => setAirtelPhone(e.target.value)}
                  placeholder="073 000 0000"
                  inputMode="tel"
                />

                <SubmitBtn
                  onClick={() => submitAlt('airtel_money', { phone: airtelPhone.trim(), note: 'User selected Airtel Money' })}
                  disabled={!airtelPhone.trim()}
                  loading={submitting}
                  label={<><Smartphone size={16} /> Continue with Airtel Money</>}
                />
              </div>
            )}

            {/* ── Bank Transfer ── */}
            {method === 'bank' && (
              <div className="space-y-5">
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-10 h-10 rounded-xl bg-[#000435] flex items-center justify-center">
                    <Building2 size={18} className="text-amber-400" />
                  </div>
                  <div>
                    <p className="font-black text-[#000435] text-sm">Bank Transfer</p>
                    <p className="text-xs text-slate-500">Choose Babyeyi’s receiving bank, then transfer using the reference</p>
                  </div>
                </div>

                <PaySelect
                  label="Bank (deposit to)"
                  value={bankCode}
                  onChange={(e) => { setBankCode(e.target.value); setCopiedAcc(false); }}
                >
                  {BABYEYI_BANK_DEPOSITS.map((b) => (
                    <option key={b.code} value={b.code}>{b.name}</option>
                  ))}
                </PaySelect>

                {/* Babyeyi account for selected bank */}
                {selectedBankDeposit?.otherNote ? (
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                    <p className="text-xs font-bold text-amber-900 leading-relaxed">
                      For banks not listed above, contact your school finance office for the correct Babyeyi deposit account. You can still record your intent below after you transfer using reference <span className="font-mono">{refCode}</span>.
                    </p>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-[#000435]/5 border border-[#000435]/10 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-0.5">Account name (beneficiary)</p>
                        <p className="text-sm font-black text-[#000435]">{selectedBankDeposit.accountName || 'Babyeyi'}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Account number</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-lg font-mono font-black text-[#000435] tracking-tight break-all">
                          {selectedBankDeposit.accountNo}
                        </p>
                        {selectedBankDeposit.accountNo ? (
                          <button
                            type="button"
                            onClick={copyDepositAccount}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#000435] text-white text-[11px] font-black uppercase tracking-wider hover:bg-[#000c70] transition-all"
                          >
                            {copiedAcc ? <Check size={14} /> : <Copy size={14} />}
                            {copiedAcc ? 'Copied' : 'Copy'}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                )}

                {/* Reference box */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Payment reference (required on transfer)</p>
                  <p className="text-xl font-mono font-black text-[#000435]">{refCode}</p>
                  <p className="text-xs text-slate-500 mt-1 font-semibold">
                    Transfer <strong className="text-[#000435]">{formatFrw(amount)}</strong> and include this reference in the narration / description.
                  </p>
                </div>

                <PayField
                  label="Your Full Name (as on transfer)"
                  value={bankHolder}
                  onChange={e => setBankHolder(e.target.value)}
                  placeholder="Full name"
                />

                <PayField
                  label="Your bank confirmation reference (optional)"
                  value={bankRef}
                  onChange={e => setBankRef(e.target.value)}
                  placeholder="e.g. TXN ID from your banking app"
                />

                <SubmitBtn
                  onClick={() => submitAlt('bank_transfer', {
                    bank_reference: refCode,
                    account_holder: bankHolder.trim(),
                    transfer_note: bankRef.trim(),
                    bank_code: selectedBankDeposit.code,
                    bank_name: selectedBankDeposit.name,
                    babyeyi_account_number: selectedBankDeposit.accountNo || null,
                    babyeyi_account_name: selectedBankDeposit.accountName || null,
                  })}
                  disabled={!bankHolder.trim()}
                  loading={submitting}
                  label={<><Banknote size={16} /> Confirm bank transfer & continue</>}
                />
              </div>
            )}

            {/* ── Visa / Card ── */}
            {method === 'visa' && (
              <div className="space-y-5">
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-10 h-10 rounded-xl bg-[#000435] flex items-center justify-center">
                    <CreditCard size={18} className="text-amber-400" />
                  </div>
                  <div>
                    <p className="font-black text-[#000435] text-sm">Visa / Card</p>
                    <p className="text-xs text-slate-500">School finance will process your card payment</p>
                  </div>
                </div>

                <PayField
                  label="Cardholder Name"
                  value={visaName}
                  onChange={e => setVisaName(e.target.value)}
                  placeholder="Name on card"
                />

                <PayField
                  label="Last 4 Digits of Card"
                  value={visaLast4}
                  onChange={e => setVisaLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="••••"
                  inputMode="numeric"
                />

                <SubmitBtn
                  onClick={() => submitAlt('visa_card', { cardholder: visaName.trim(), card_last4: visaLast4 })}
                  disabled={!visaName.trim() || visaLast4.length !== 4}
                  loading={submitting}
                  label={<><CreditCard size={16} /> Submit Card Details</>}
                />
              </div>
            )}
          </div>

          {/* Security footer */}
          <div className="flex items-center justify-center gap-4 mt-6">
            <span className="flex items-center gap-1.5 text-[10px] text-white/30 font-semibold">
              <Shield size={11} /> SSL Encrypted
            </span>
            <span className="text-white/15">·</span>
            <span className="text-[10px] text-white/30 font-semibold">Babyeyi Systems 🇷🇼</span>
          </div>
        </div>
      </div>
    </>
  );
}