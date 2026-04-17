// ================================================================
// payments.jsx — Payment completion page (Babyeyi)
// Design: Amber + Dark Blue only, no gradients
// Shows: amount, remaining per checked lines, whole doc remaining
// Supports: MoMo, Bank Transfer, Visa Card, Loan
// ================================================================

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { STUDENT_SERVICE_CHECKOUT_KEY } from './StudentServiceCheckout';
import { UNIFORM_VOUCHER_CHECKOUT_KEY } from './UniformVoucherCheckout';
import {
  ArrowLeft, Building2, Wallet, Calculator, CheckCircle2,
  Loader2, Smartphone, AlertCircle, RefreshCw, Clock,
  ChevronRight, Shield, Info, CreditCard, Landmark, UserRound,
  Download, FileText,
} from 'lucide-react';

const SERVER = import.meta.env.VITE_API_URL || 'http://localhost:5100';
const API    = `${SERVER}/api`;

// ── Amber + Dark Blue tokens ──────────────────────────────────────
const C = {
  db900: "#042C53",
  db800: "#0C447C",
  db600: "#185FA5",
  db400: "#378ADD",
  db200: "#85B7EB",
  db100: "#B5D4F4",
  db50:  "#E6F1FB",
  am900: "#412402",
  am800: "#633806",
  am600: "#854F0B",
  am400: "#BA7517",
  am200: "#EF9F27",
  am100: "#FAC775",
  am50:  "#FAEEDA",
};

// ── Shared style helpers ──────────────────────────────────────────
const card = {
  background: "#fff",
  border: `1px solid ${C.db100}`,
  borderRadius: 12,
  padding: "20px 22px",
  marginBottom: 16,
};
const labelStyle = {
  display: "block", fontSize: 11, fontWeight: 700,
  textTransform: "uppercase", letterSpacing: "0.07em",
  color: C.db600, marginBottom: 5,
};
const inputStyle = {
  width: "100%", padding: "10px 14px",
  border: `1.5px solid ${C.db100}`,
  borderRadius: 8, fontSize: 13, outline: "none",
  background: "#fff", color: C.db900, fontFamily: "inherit",
};
const inputFocusStyle = {
  ...inputStyle,
  border: `1.5px solid ${C.db400}`,
};

// ── Helpers ───────────────────────────────────────────────────────
function normFeeId(id) {
  const n = Number(id);
  return Number.isFinite(n) ? n : null;
}
function normReqId(id) {
  const n = parseInt(id, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}
function computeSelectionTotalFromSnapshot(draft) {
  const snap = draft?.pricingSnapshot;
  if (!snap || typeof snap !== 'object') return null;
  const feeSet = new Set((draft.selectedFeeIds || []).map(x => normFeeId(x)).filter(n => n != null));
  const reqSet = new Set((draft.selectedReqIds || []).map(x => normReqId(x)).filter(n => n != null));
  const fees = Array.isArray(snap.school_fees)  ? snap.school_fees  : [];
  const reqs = Array.isArray(snap.requirements) ? snap.requirements : [];
  let s = 0;
  for (const f of fees) { const id = normFeeId(f.id); if (id != null && feeSet.has(id)) s += Number(f.amount || 0); }
  for (const r of reqs) { const id = normReqId(r.babyeyi_requirement_id); if (id != null && reqSet.has(id)) s += Number(r.line_total_rwf ?? r.price ?? 0); }
  return Math.round(s * 100) / 100;
}
function sanitizeRwandaPhone(raw) {
  if (!raw) return '';
  let p = String(raw).trim().replace(/\s+/g, '');
  if (p.startsWith('+')) p = p.slice(1);
  p = p.replace(/[^0-9]/g, '');
  if (p.startsWith('2507') && p.length === 12) return p;
  if (p.startsWith('07')   && p.length === 10) return '250' + p.slice(1);
  if (p.startsWith('7')    && p.length === 9)  return '250' + p;
  return p;
}
function isValidMomoPhone(raw) {
  // RegExp() avoids regex-literal parsing edge cases in some bundlers
  return new RegExp('^2507[0-9]{8}$').test(sanitizeRwandaPhone(raw));
}
function loanSchedule(principal, months, annualRate, frequency) {
  const p  = Math.max(0, Number(principal) || 0);
  const m  = Math.max(1, Math.min(36, parseInt(months, 10) || 1));
  const r  = Math.max(0, Number(annualRate) || 0);
  const interest = p * r * (m / 12);
  const totalDue = p + interest;
  let n = m;
  if (frequency === 'weekly') n = m * 4;
  if (frequency === 'daily')  n = m * 30;
  n = Math.max(1, n);
  const each = Math.round((totalDue / n) * 100) / 100;
  return { totalDue: Math.round(totalDue * 100) / 100, interest: Math.round(interest * 100) / 100, installments: n, each };
}

const RW_BANKS = [
  { code: 'bk',       name: 'Bank of Kigali (BK)',   accountNo: '00000-0000000-0' },
  { code: 'umwalimu', name: 'Umwalimu SACCO',         accountNo: '0000-000000-00'  },
  { code: 'equity',   name: 'Equity Bank Rwanda',     accountNo: '4001-xxxxxxx'    },
  { code: 'im',       name: 'I&M Bank Rwanda',        accountNo: 'RW00-xxxx'       },
  { code: 'access',   name: 'Access Bank Rwanda',     accountNo: 'ACC-xxxx'        },
  { code: 'other',    name: 'Other Rwandan bank',     accountNo: '—'               },
];
const BANK_TRANSFER_OPTIONS = [
  { code: 'bk',     name: 'Bank of Kigali' },
  { code: 'equity', name: 'Equity Bank'    },
  { code: 'im',     name: 'I&M Bank'       },
  { code: 'bpr',    name: 'BPR Bank'       },
  { code: 'kcb',    name: 'KCB Bank'       },
];
const INCOME_BRACKETS = [
  { id: 'low',  label: 'Under 200,000 RWF / month',     annualRate: 0.06 },
  { id: 'mid',  label: '200,000 – 500,000 RWF / month', annualRate: 0.10 },
  { id: 'high', label: 'Above 500,000 RWF / month',     annualRate: 0.14 },
];
const MOMO_POLL_INTERVAL_MS = 4_000;
const MOMO_MAX_POLLS        = 30;

// ── Subcomponents ────────────────────────────────────────────────

function MomoStatusBanner({ status, referenceId, pollCount, maxPolls, errorDetail, onRetry }) {
  if (!status) return null;
  const base = { borderRadius: 8, padding: "12px 16px", display: "flex", alignItems: "flex-start", gap: 10, marginTop: 12 };
  if (status === 'PENDING') return (
    <div style={{ ...base, background: C.am50, border: `1px solid ${C.am200}` }}>
      <Clock size={16} color={C.am600} style={{ flexShrink: 0, marginTop: 1 }} />
      <div>
        <div style={{ fontWeight: 700, color: C.am900, fontSize: 13 }}>Waiting for customer confirmation…</div>
        <div style={{ fontSize: 12, color: C.am800, marginTop: 3 }}>
          A MoMo USSD prompt has been sent. The customer must enter their PIN to approve.
        </div>
        {pollCount > 0 && <div style={{ fontSize: 11, color: C.am600, marginTop: 3 }}>Checking… ({pollCount}/{maxPolls})</div>}
      </div>
    </div>
  );
  if (status === 'SUCCESSFUL') return (
    <div style={{ ...base, background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
      <CheckCircle2 size={16} color="#15803d" style={{ flexShrink: 0, marginTop: 1 }} />
      <div>
        <div style={{ fontWeight: 700, color: "#14532d", fontSize: 13 }}>Payment confirmed by MTN MoMo ✓</div>
        {referenceId && <div style={{ fontSize: 11, fontFamily: "monospace", color: "#166534", marginTop: 3 }}>Ref: {referenceId}</div>}
      </div>
    </div>
  );
  if (status === 'FAILED' || status === 'TIMEOUT') return (
    <div style={{ ...base, background: "#fdf0ed", border: "1px solid #f5c6c0" }}>
      <AlertCircle size={16} color="#c0392b" style={{ flexShrink: 0, marginTop: 1 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, color: "#7f1d1d", fontSize: 13 }}>
          {status === 'TIMEOUT' ? 'No response — prompt may have expired.' : 'Payment declined or failed.'}
        </div>
        <div style={{ fontSize: 12, color: "#991b1b", marginTop: 3 }}>
          {status === 'TIMEOUT' ? 'Please check MoMo balance and try again.' : 'The customer may have declined, or their MoMo account is inactive.'}
        </div>
        {errorDetail && (
          <div style={{ fontSize: 11, fontFamily: "monospace", color: "#c0392b", background: "#fde8e4", padding: "4px 8px", borderRadius: 4, marginTop: 6, wordBreak: "break-all" }}>
            {errorDetail}
          </div>
        )}
        <button type="button" onClick={onRetry} style={{
          marginTop: 8, display: "flex", alignItems: "center", gap: 4,
          fontSize: 12, fontWeight: 700, color: "#c0392b", background: "transparent",
          border: "none", cursor: "pointer", textDecoration: "underline",
        }}>
          <RefreshCw size={12} /> Try again
        </button>
      </div>
    </div>
  );
  return null;
}

function InfoBox({ children, variant = "amber" }) {
  const colors = {
    amber: { bg: C.am50, border: C.am200, text: C.am800 },
    blue:  { bg: C.db50, border: C.db200, text: C.db800 },
  };
  const c = colors[variant] || colors.amber;
  return (
    <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 8, padding: "10px 14px", fontSize: 12, color: c.text, marginBottom: 12 }}>
      {children}
    </div>
  );
}

function MethodBtn({ id, label, Icon, selected, disabled, onClick }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
      padding: "12px 10px", borderRadius: 8, cursor: disabled ? "not-allowed" : "pointer",
      border: `2px solid ${selected ? C.am200 : C.db100}`,
      background: selected ? C.am50 : "#fff",
      color: selected ? C.am800 : C.db600,
      opacity: disabled ? 0.4 : 1,
      transition: "all 0.15s",
    }}>
      <Icon size={18} />
      <span style={{ fontSize: 11, fontWeight: 700, textAlign: "center", lineHeight: 1.2 }}>{label}</span>
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────
export default function PaymentsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [draft, setDraft] = useState(null);

  // Payment method
  const [payMethod, setPayMethod] = useState('momo');

  // Bank transfer
  const [bankCode,          setBankCode]          = useState('bk');
  const [bankAccountHolder, setBankAccountHolder] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankPaymentRef,    setBankPaymentRef]    = useState('');
  const [fieldErrors,       setFieldErrors]       = useState({});

  // Visa card
  const [visaCardHolder, setVisaCardHolder] = useState('');
  const [visaCardNumber, setVisaCardNumber] = useState('');
  const [visaExpiry,     setVisaExpiry]     = useState('');
  const [visaCvv,        setVisaCvv]        = useState('');

  // Loan
  const [loanMonths,        setLoanMonths]        = useState(3);
  const [incomeId,          setIncomeId]          = useState('mid');
  const [loanFreq,          setLoanFreq]          = useState('monthly');
  const [loanStep,          setLoanStep]          = useState('bank');
  const [loanBankCode,      setLoanBankCode]      = useState('bk');
  const [loanApplicantName, setLoanApplicantName] = useState('');
  const [loanAccountNumber, setLoanAccountNumber] = useState('');
  const [loanNationalId,    setLoanNationalId]    = useState('');
  const [loanError,         setLoanError]         = useState('');

  // MoMo
  const [momoPhoneRaw,    setMomoPhoneRaw]    = useState('');
  const [momoPhoneError,  setMomoPhoneError]  = useState('');
  const [momoStatus,      setMomoStatus]      = useState(null);
  const [momoReferenceId, setMomoReferenceId] = useState(null);
  const [momoErrorDetail, setMomoErrorDetail] = useState('');
  const [momoPollCount,   setMomoPollCount]   = useState(0);
  const pollTimerRef = useRef(null);

  // Submit / done
  const [submitting,    setSubmitting]    = useState(false);
  const [doneId,        setDoneId]        = useState(null);
  const [doneMode,      setDoneMode]      = useState(null);
  const [showDoneModal, setShowDoneModal] = useState(false);
  const [submitError,   setSubmitError]   = useState('');
  const [invoiceNo,     setInvoiceNo]     = useState('');
  const [invoiceStatus, setInvoiceStatus] = useState('');
  const [balanceQuote,  setBalanceQuote]  = useState(null);
  const [balanceLoading,setBalanceLoading]= useState(false);

  // ── Load draft ────────────────────────────────────────────────
  useEffect(() => {
    const st = location.state;
    if (st?.standardKitPay) {
      const p = st.standardKitPay || {};
      setDraft({
        standardKitCheckout: true,
        prepared: p.prepared,
        grandTotal: Number(p.grandTotal || p.prepared?.total_frw || 0),
        docLabel: "Standard Kit",
        schoolName: p.prepared?.student?.school_name || "Babyeyi",
        payer: {
          name: String(p.prepared?.requester_name || "").trim(),
          phone: String(p.prepared?.requester_contact || "").trim(),
        },
      });
      return;
    }
    if (st?.agentShopPay) {
      const p = st.agentShopPay || {};
      setDraft({
        agentShopCheckout: true,
        batchRef: p.batchRef,
        grandTotal: Number(p.grandTotal || 0),
        subtotal: Number(p.subtotal || 0),
        deliveryFee: Number(p.deliveryFee || 0),
        lines: Array.isArray(p.lines) ? p.lines : [],
        student: p.student || null,
        docLabel: "Agent Shop",
        schoolName: p.student?.school_name || "Babyeyi",
        payer: {
          name: String(p.payerName || "").trim(),
          phone: String(p.payerPhone || "").trim(),
        },
      });
      return;
    }
    if (st?.uniformVoucherPay) {
      try {
        const raw = sessionStorage.getItem(UNIFORM_VOUCHER_CHECKOUT_KEY);
        if (!raw) { setDraft(null); return; }
        const p = JSON.parse(raw);
        if (!p?.orderId || p.grandTotal == null) { setDraft(null); return; }
        setDraft({
          uniformVoucherCheckout: true,
          grandTotal: Number(p.grandTotal),
          docLabel: "Uniform Voucher",
          schoolName: p.prepared?.student?.school_name || "Babyeyi",
          payer: {
            name: String(st.uniformVoucherPay.payerName || "").trim(),
            phone: String(st.uniformVoucherPay.payerPhone || "").trim(),
          },
          uniformVoucherPayload: p,
        });
      } catch { setDraft(null); }
      return;
    }
    if (st?.studentServicePay) {
      try {
        const raw = sessionStorage.getItem(STUDENT_SERVICE_CHECKOUT_KEY);
        if (!raw) { setDraft(null); return; }
        const p = JSON.parse(raw);
        if (!p?.service?.id || p.quote?.amount == null) { setDraft(null); return; }
        setDraft({
          studentServiceCheckout: true,
          grandTotal:  Number(p.quote.amount),
          docLabel:    p.service?.name || 'Student service',
          schoolName:  'Babyeyi',
          payer: {
            name:  String(st.studentServicePay.payerName  || '').trim(),
            phone: String(st.studentServicePay.payerPhone || '').trim(),
          },
          studentServicePayload: p,
        });
      } catch { setDraft(null); }
      return;
    }
    if (st?.schoolId && st?.babyeyiId) {
      setDraft(st);
      try { sessionStorage.setItem('babyeyi_pay_draft', JSON.stringify(st)); } catch (_) {}
      return;
    }
    try {
      const raw = sessionStorage.getItem('babyeyi_pay_draft');
      if (raw) setDraft(JSON.parse(raw));
    } catch (_) {}
  }, [location.state]);

  useEffect(() => {
    if (draft?.studentServiceCheckout || draft?.agentShopCheckout || draft?.standardKitCheckout || draft?.uniformVoucherCheckout) setPayMethod('momo');
  }, [draft?.studentServiceCheckout, draft?.agentShopCheckout, draft?.standardKitCheckout, draft?.uniformVoucherCheckout]);

  useEffect(() => {
    if (!draft) return;
    if (!bankPaymentRef.trim()) {
      setBankPaymentRef(`BY-${draft.babyeyiId || 'PAY'}-${draft.schoolId || ''}`.replace(/\s+/g, ''));
    }
    if (!bankAccountHolder.trim()) {
      const n = String(draft?.payer?.name || '').trim();
      if (n) setBankAccountHolder(n);
    }
  }, [draft]);

  useEffect(() => {
    if (!draft) return;
    if (String(momoPhoneRaw || '').trim()) return;
    const fromDraft = String(draft?.payer?.phone || '').trim();
    if (!fromDraft) return;
    let digits = fromDraft.replace(/\D/g, '');
    if (digits.startsWith('250')) digits = digits.slice(3);
    if (digits.startsWith('0'))   digits = digits.slice(1);
    setMomoPhoneRaw(digits.slice(0, 9));
  }, [draft]);

  // ── Balance quote ─────────────────────────────────────────────
  useEffect(() => {
    if (!draft?.schoolId || !draft?.babyeyiId) { setBalanceQuote(null); return; }
    const studs = Array.isArray(draft.selectedStudents) && draft.selectedStudents.length
      ? draft.selectedStudents
      : (draft.selectedStudent ? [draft.selectedStudent] : []);
    if (!studs.length) { setBalanceQuote(null); return; }
    const feeIds = (draft.selectedFeeIds || []).map(x => normFeeId(x)).filter(n => n != null);
    const reqIds = (draft.selectedReqIds || []).map(x => normReqId(x)).filter(n => n != null);
    let cancelled = false;
    setBalanceLoading(true);
    fetch(`${API}/public/babyeyi-pay/quote-balance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        school_id: draft.schoolId, babyeyi_id: draft.babyeyiId,
        selected_fee_ids: feeIds, selected_requirement_ids: reqIds,
        selected_students: studs,
      }),
    })
      .then(r => r.json())
      .then(j => { if (cancelled) return; if (j.success) setBalanceQuote(j.data); else setBalanceQuote(null); })
      .catch(() => { if (!cancelled) setBalanceQuote(null); })
      .finally(() => { if (!cancelled) setBalanceLoading(false); });
    return () => { cancelled = true; };
  }, [
    draft?.schoolId, draft?.babyeyiId,
    JSON.stringify(draft?.selectedFeeIds  || []),
    JSON.stringify(draft?.selectedReqIds  || []),
    JSON.stringify(draft?.selectedStudents || []),
    draft?.selectedStudent?.student_id,
    draft?.selectedStudent?.student_uid,
  ]);

  useEffect(() => () => { if (pollTimerRef.current) clearTimeout(pollTimerRef.current); }, []);

  // ── Derived ───────────────────────────────────────────────────
  const principal = useMemo(() => {
    if (!draft) return 0;
    if (draft.studentServiceCheckout || draft?.uniformVoucherCheckout) return Math.max(0, Number(draft.grandTotal || 0));
    // Public pay-by-school already captures an explicit "pay now" amount.
    // Keep that amount instead of recomputing from all selected lines.
    if (draft.fromPublicSchoolPay) return Math.max(0, Number(draft.grandTotal || 0));
    const hasSel = (Array.isArray(draft.selectedFeeIds) && draft.selectedFeeIds.length > 0)
                || (Array.isArray(draft.selectedReqIds) && draft.selectedReqIds.length > 0);
    const fromSnap = computeSelectionTotalFromSnapshot(draft);
    const g = Math.max(0, Number(draft.grandTotal || 0));
    if (draft.pricingSnapshot && fromSnap != null && !Number.isNaN(fromSnap) && fromSnap >= 0) {
      if (fromSnap > 0.005) return fromSnap;
      if (!hasSel) return g;
      return g > 0.005 ? g : fromSnap;
    }
    return g;
  }, [draft]);

  const remainingBalanceRwf     = balanceQuote != null ? Number(balanceQuote.remaining_rwf          ?? 0) : null;
  const selectionListedRwf      = balanceQuote != null ? Number(balanceQuote.selection_due_rwf       ?? 0) : null;
  const creditedTowardSelection = selectionListedRwf != null && remainingBalanceRwf != null
    ? Math.max(0, Math.round((selectionListedRwf - remainingBalanceRwf) * 100) / 100) : null;
  const afterThisPaymentRwf     = remainingBalanceRwf != null
    ? Math.max(0, Math.round((remainingBalanceRwf - principal) * 100) / 100) : null;
  const remainingFullDocumentRwf = balanceQuote != null
    ? Number(balanceQuote.remaining_full_document_rwf ?? balanceQuote.remaining_rwf ?? 0) : null;
  const afterThisPaymentOnDocumentRwf = remainingFullDocumentRwf != null
    ? Math.max(0, Math.round((remainingFullDocumentRwf - principal) * 100) / 100) : null;
  const remainingUnselectedLinesRwf = balanceQuote != null && remainingFullDocumentRwf != null && remainingBalanceRwf != null
    ? Number(balanceQuote.remaining_unselected_lines_rwf ??
        Math.max(0, Math.round((remainingFullDocumentRwf - remainingBalanceRwf) * 100) / 100)) : null;
  const exceedsRemaining = payMethod !== 'loan' && remainingBalanceRwf != null && principal > remainingBalanceRwf + 1.5;

  /** School-fees Babyeyi payment intents only — PDFs use intent id + invoice_no */
  const isSchoolFeesIntent = Boolean(
    draft?.schoolId
    && draft?.babyeyiId
    && invoiceNo
    && Number.isFinite(Number(doneId))
    && !draft?.studentServiceCheckout
    && !draft?.agentShopCheckout
    && !draft?.standardKitCheckout
    && !draft?.uniformVoucherCheckout
  );
  const invoicePdfHref = isSchoolFeesIntent
    ? `${API}/public/babyeyi-pay/invoice/${Number(doneId)}.pdf?invoice_no=${encodeURIComponent(invoiceNo)}`
    : '';
  const receiptPdfHref = isSchoolFeesIntent && String(invoiceStatus || '').toUpperCase() === 'PAID'
    ? `${API}/public/babyeyi-pay/receipt/${Number(doneId)}.pdf?invoice_no=${encodeURIComponent(invoiceNo)}`
    : '';

  const income    = INCOME_BRACKETS.find(x => x.id === incomeId) || INCOME_BRACKETS[1];
  const sched     = useMemo(() => loanSchedule(principal, loanMonths, income.annualRate, loanFreq), [principal, loanMonths, income.annualRate, loanFreq]);
  const loanBank  = RW_BANKS.find(b => b.code === loanBankCode) || RW_BANKS[0];
  const publicGuestPay = !!(draft?.fromPublicFinder && draft?.publicPayNoLogin);

  const afterSuccessPath = useMemo(() => {
    if (!draft) return '/parents/home';
    if (draft.studentServiceCheckout) return '/services';
    if (draft.agentShopCheckout) return '/find-agent';
    if (draft.standardKitCheckout) return '/services/standard-shulekit';
    if (draft.uniformVoucherCheckout) return '/services/uniform-voucher';
    if (draft.fromPublicSchoolPay) return '/pay-by-school';
    if (draft.fromPublicFinder && draft.publicPayNoLogin) {
      const slug = String(draft.schoolSlug || '').trim();
      if (draft.fromSchoolMiniSite && slug) return `/school/${encodeURIComponent(slug)}`;
      return '/babyeyi-finder';
    }
    return '/parents/home';
  }, [draft]);

  const resetMomo = useCallback(() => {
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    setMomoStatus(null); setMomoReferenceId(null);
    setMomoPollCount(0); setMomoErrorDetail('');
    setSubmitting(false); setSubmitError('');
  }, []);

  const setFieldError = (key, message) => {
    setFieldErrors(prev => { const n = { ...prev }; if (message) n[key] = message; else delete n[key]; return n; });
  };

  // ── Record intent ─────────────────────────────────────────────
  const recordIntent = useCallback(async (extra = {}) => {
    if (!draft?.schoolId || !draft?.babyeyiId) return null;
    const res = await fetch(`${API}/public/babyeyi-pay/intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        school_id:                draft.schoolId,
        babyeyi_id:               draft.babyeyiId,
        total_rwf:                payMethod === 'loan' ? sched.totalDue : principal,
        status:                   extra.status || 'submitted',
        selected_fee_ids:         draft.selectedFeeIds         || [],
        selected_requirement_ids: draft.selectedReqIds         || [],
        selected_student:         draft.selectedStudent        || null,
        selected_students:        Array.isArray(draft.selectedStudents) ? draft.selectedStudents
                                    : (draft.selectedStudent ? [draft.selectedStudent] : []),
        payer: payMethod === 'momo'
          ? { ...(draft.payer || {}), phone: sanitizeRwandaPhone(momoPhoneRaw) }
          : (draft.payer || null),
        public_pay_no_login:   !!draft.publicPayNoLogin,
        from_public_finder:    !!draft.fromPublicFinder,
        from_school_mini_site: !!draft.fromSchoolMiniSite,
        payment_plan: {
          method:      payMethod,
          bankCode:    payMethod === 'bank' ? bankCode : payMethod === 'loan' ? loanBankCode : null,
          loanMonths:  payMethod === 'loan' ? loanMonths  : null,
          incomeId:    payMethod === 'loan' ? incomeId    : null,
          loanFreq:    payMethod === 'loan' ? loanFreq    : null,
          loanSummary: payMethod === 'loan' ? sched       : null,
          bank_transfer: payMethod === 'bank' ? {
            bankCode, bankName: BANK_TRANSFER_OPTIONS.find(b => b.code === bankCode)?.name || 'Bank',
            accountHolder: bankAccountHolder.trim(), accountNumber: bankAccountNumber.trim(),
            amount: principal, paymentReference: bankPaymentRef.trim(),
          } : null,
          visa_card: payMethod === 'visa' ? {
            cardHolder: visaCardHolder.trim(),
            cardLast4:  visaCardNumber.replace(/\D/g, '').slice(-4),
            expiry: visaExpiry.trim(), amount: principal,
          } : null,
          momo: payMethod === 'momo' ? {
            provider:      'mtn',
            phone:         sanitizeRwandaPhone(momoPhoneRaw),
            referenceId:   extra.momoReferenceId   || null,
            financialTxId: extra.momoFinancialTxId || null,
            status:        extra.momoReferenceId   ? 'SUCCESSFUL' : 'PENDING',
          } : null,
          loan_request: payMethod === 'loan' ? {
            bankCode:      loanBankCode, bankName:      loanBank.name,
            applicantName: loanApplicantName.trim(),
            accountNumber: loanAccountNumber.trim(),
            nationalId:    loanNationalId.trim(),
          } : null,
        },
        ...extra,
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (json.success) return json;
    const err = new Error(json.message || 'Failed to record intent');
    err.code = json.code; err.details = json.details; throw err;
  }, [draft, payMethod, principal, sched, bankCode, loanBankCode, loanMonths, incomeId, loanFreq,
      momoPhoneRaw, loanBank, loanApplicantName, loanAccountNumber, loanNationalId,
      bankAccountHolder, bankAccountNumber, bankPaymentRef, visaCardHolder, visaCardNumber, visaExpiry]);

  // ── MoMo polling ──────────────────────────────────────────────
  const pollMomoStatus = useCallback(async (intentId, count) => {
    if (count >= MOMO_MAX_POLLS) { setMomoStatus('TIMEOUT'); setSubmitting(false); return; }
    try {
      const res    = await fetch(`${API}/public/babyeyi-pay/intent/${intentId}/check-provider-status`, { method: 'POST' });
      const json   = await res.json().catch(() => ({}));
      const status = (json.provider_status || '').toUpperCase();
      if (status === 'SUCCESSFUL') {
        setMomoStatus('SUCCESSFUL');
        setInvoiceStatus(String(json.invoice_status || 'PAID').toUpperCase());
        setDoneId(intentId); setSubmitting(false); setDoneMode('momo'); setShowDoneModal(true); return;
      }
      if (status === 'FAILED') {
        setMomoStatus('FAILED'); setMomoErrorDetail(json.reason || json.raw?.reason || ''); setSubmitting(false); return;
      }
      setMomoPollCount(count + 1);
      pollTimerRef.current = setTimeout(() => pollMomoStatus(intentId, count + 1), MOMO_POLL_INTERVAL_MS);
    } catch {
      setMomoPollCount(count + 1);
      pollTimerRef.current = setTimeout(() => pollMomoStatus(intentId, count + 1), MOMO_POLL_INTERVAL_MS * 2);
    }
  }, []);

  const pollShopMomoStatus = useCallback(async (batchRef, count) => {
    if (count >= MOMO_MAX_POLLS) { setMomoStatus('TIMEOUT'); setSubmitting(false); return; }
    try {
      const res = await fetch(`${API}/student-services/public/shop/pay-status/${encodeURIComponent(batchRef)}`);
      const json = await res.json().catch(() => ({}));
      const status = String(json?.data?.status || '').toUpperCase();
      if (status === 'SUCCESSFUL') {
        setMomoStatus('SUCCESSFUL');
        setInvoiceStatus('PAID');
        setDoneId(batchRef);
        setDoneMode('momo');
        setShowDoneModal(true);
        setSubmitting(false);
        return;
      }
      if (status === 'FAILED') {
        setMomoStatus('FAILED');
        setSubmitting(false);
        return;
      }
      setMomoPollCount(count + 1);
      pollTimerRef.current = setTimeout(() => pollShopMomoStatus(batchRef, count + 1), MOMO_POLL_INTERVAL_MS);
    } catch {
      setMomoPollCount(count + 1);
      pollTimerRef.current = setTimeout(() => pollShopMomoStatus(batchRef, count + 1), MOMO_POLL_INTERVAL_MS * 2);
    }
  }, []);

  const pollStandardKitMomoStatus = useCallback(async (requestId, count) => {
    if (count >= MOMO_MAX_POLLS) { setMomoStatus('TIMEOUT'); setSubmitting(false); return; }
    try {
      const res = await fetch(`${API}/standard-shule-kits/public/requests/pay-status/${encodeURIComponent(requestId)}`);
      const json = await res.json().catch(() => ({}));
      const status = String(json?.data?.status || '').toUpperCase();
      if (status === 'SUCCESSFUL') {
        setMomoStatus('SUCCESSFUL');
        setInvoiceStatus('PAID');
        setDoneId(requestId);
        setDoneMode('momo');
        setShowDoneModal(true);
        setSubmitting(false);
        return;
      }
      if (status === 'FAILED') {
        setMomoStatus('FAILED');
        setSubmitting(false);
        return;
      }
      setMomoPollCount(count + 1);
      pollTimerRef.current = setTimeout(() => pollStandardKitMomoStatus(requestId, count + 1), MOMO_POLL_INTERVAL_MS);
    } catch {
      setMomoPollCount(count + 1);
      pollTimerRef.current = setTimeout(() => pollStandardKitMomoStatus(requestId, count + 1), MOMO_POLL_INTERVAL_MS * 2);
    }
  }, []);

  const pollUniformVoucherMomoStatus = useCallback(async (orderId, count) => {
    if (count >= MOMO_MAX_POLLS) { setMomoStatus('TIMEOUT'); setSubmitting(false); return; }
    try {
      const res = await fetch(`${API}/uniform-vouchers/public/pay-status/${encodeURIComponent(orderId)}`);
      const json = await res.json().catch(() => ({}));
      const status = String(json?.data?.status || json?.data?.mtn_status || '').toUpperCase();
      if (status === 'SUCCESSFUL') {
        setMomoStatus('SUCCESSFUL');
        setInvoiceStatus('PAID');
        setDoneId(orderId);
        setDoneMode('momo');
        setShowDoneModal(true);
        setSubmitting(false);
        try { sessionStorage.removeItem(UNIFORM_VOUCHER_CHECKOUT_KEY); } catch (_) {}
        return;
      }
      if (status === 'FAILED') {
        setMomoStatus('FAILED');
        setSubmitting(false);
        return;
      }
      setMomoPollCount(count + 1);
      pollTimerRef.current = setTimeout(() => pollUniformVoucherMomoStatus(orderId, count + 1), MOMO_POLL_INTERVAL_MS);
    } catch {
      setMomoPollCount(count + 1);
      pollTimerRef.current = setTimeout(() => pollUniformVoucherMomoStatus(orderId, count + 1), MOMO_POLL_INTERVAL_MS * 2);
    }
  }, []);

  const handleUniformVoucherConfirm = useCallback(async () => {
    if (!draft?.uniformVoucherCheckout || !draft?.uniformVoucherPayload) return;
    setSubmitError('');
    if (!isValidMomoPhone(momoPhoneRaw)) {
      setMomoPhoneError(`"${momoPhoneRaw || '(empty)'}" is not a valid MTN Rwanda number.`); return;
    }
    setMomoPhoneError('');
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    setMomoPollCount(0); setMomoErrorDetail(''); setSubmitting(true);
    const p = draft.uniformVoucherPayload;
    try {
      const res = await fetch(`${API}/uniform-vouchers/public/pay-momo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: p.orderId,
          momo_phone: momoPhoneRaw,
          payer_name: String(draft.payer?.name || '').trim(),
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.success) { setSubmitError(j.message || 'Payment could not start.'); setSubmitting(false); return; }
      const data = j.data || {};
      const st = String(data.mtn_status || 'PENDING').toUpperCase();
      setMomoStatus(st);
      setMomoReferenceId(data.order_number || '');
      setInvoiceNo(data.voucher_number || '');
      if (st === 'SUCCESSFUL') {
        setDoneId(data.order_id || p.orderId);
        setInvoiceStatus('PAID');
        setDoneMode('momo');
        setShowDoneModal(true);
        setSubmitting(false);
        try { sessionStorage.removeItem(UNIFORM_VOUCHER_CHECKOUT_KEY); } catch (_) {}
        return;
      }
      setMomoPollCount(0);
      pollTimerRef.current = setTimeout(() => pollUniformVoucherMomoStatus(p.orderId, 0), MOMO_POLL_INTERVAL_MS);
    } catch (e) {
      setSubmitError(e.message || 'Network error'); setSubmitting(false);
    }
  }, [draft, momoPhoneRaw, pollUniformVoucherMomoStatus]);

  const validateLoanDetails = useCallback(() => {
    if (!loanApplicantName.trim()) { setLoanError('Please enter the account holder name.'); return false; }
    if (!loanAccountNumber.trim()) { setLoanError('Please enter the account number.'); return false; }
    if (!loanNationalId.trim())    { setLoanError('Please enter your national ID.'); return false; }
    setLoanError(''); return true;
  }, [loanApplicantName, loanAccountNumber, loanNationalId]);

  const validateBankTransferDetails = useCallback(() => {
    if (!bankAccountHolder.trim()) { setSubmitError('Please enter the account holder name.'); return false; }
    if (!bankAccountNumber.trim()) { setSubmitError('Please enter the bank account number.'); return false; }
    if (!bankPaymentRef.trim())    { setSubmitError('Please provide a payment reference.'); return false; }
    return true;
  }, [bankAccountHolder, bankAccountNumber, bankPaymentRef]);

  const validateVisaDetails = useCallback(() => {
    const digits = visaCardNumber.replace(/\D/g, '');
    if (!visaCardHolder.trim())                                          return 'Please enter the card holder name.';
    if (digits.length !== 16)                                            return 'Please enter a valid 16-digit Visa card number.';
    if (!/^((0[1-9])|(1[0-2]))\/\d{2}$/.test(visaExpiry.trim()))       return 'Please enter expiry date in MM/YY format.';
    if (!/^\d{3,4}$/.test(visaCvv.trim()))                              return 'Please enter a valid CVV.';
    return '';
  }, [visaCardHolder, visaCardNumber, visaExpiry, visaCvv]);

  // ── Student service MoMo ──────────────────────────────────────
  const handleStudentServiceConfirm = useCallback(async () => {
    if (!draft?.studentServiceCheckout || !draft?.studentServicePayload) return;
    setSubmitError('');
    if (!isValidMomoPhone(momoPhoneRaw)) {
      setMomoPhoneError(`"${momoPhoneRaw || '(empty)'}" is not a valid MTN Rwanda number.`); return;
    }
    setMomoPhoneError('');
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    setMomoPollCount(0); setMomoErrorDetail(''); setSubmitting(true);
    const p           = draft.studentServicePayload;
    const stu         = p.quote?.student || {};
    const studentCode = String(p.studentCodeInput || stu.student_code || stu.sdm_code || stu.student_uid || '').trim();
    try {
      const res = await fetch(`${API}/student-services/public/pay-momo`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: p.service.id, student_code: studentCode,
          payer_name: String(draft.payer?.name || '').trim(), payer_phone: momoPhoneRaw,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.success) { setSubmitError(j.message || 'Payment could not start.'); setSubmitting(false); return; }
      const data  = j.data || {};
      const mtnSt = String(data.mtn_status || 'PENDING').toUpperCase();
      setMomoStatus(mtnSt); setMomoReferenceId(data.order_number || '');
      if (mtnSt === 'SUCCESSFUL') {
        setDoneId(data.order_id || data.order_number);
        setInvoiceNo(data.order_number || '');
        setInvoiceStatus('PAID'); setDoneMode('momo'); setShowDoneModal(true);
        try { sessionStorage.removeItem(STUDENT_SERVICE_CHECKOUT_KEY); } catch (_) {}
      }
      setSubmitting(false);
    } catch (e) { setSubmitError(e.message || 'Network error'); setSubmitting(false); }
  }, [draft, momoPhoneRaw]);

  // ── Main confirm ──────────────────────────────────────────────
  const handleConfirm = async () => {
    if (draft?.standardKitCheckout) {
      if (payMethod !== 'momo') { setSubmitError('Standard kit payments currently use MTN Mobile Money.'); return; }
      if (!isValidMomoPhone(momoPhoneRaw)) {
        setMomoPhoneError(`"${momoPhoneRaw || '(empty)'}" is not a valid MTN Rwanda number.`); return;
      }
      setMomoPhoneError('');
      setSubmitting(true);
      setSubmitError('');
      try {
        const res = await fetch(`${API}/standard-shule-kits/public/requests/pay-momo`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prepared: draft.prepared,
            momo_phone: momoPhoneRaw,
          }),
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok || !j.success) throw new Error(j.message || 'Payment failed');
        const data = j.data || {};
        const st = String(data.mtn_status || 'PENDING').toUpperCase();
        setMomoStatus(st);
        setMomoReferenceId(data.request_no || '');
        if (st === 'SUCCESSFUL') {
          setDoneId(data.request_id || 'STANDARD-KIT');
          setInvoiceStatus('PAID');
          setDoneMode('momo');
          setShowDoneModal(true);
          setSubmitting(false);
          return;
        }
        setMomoPollCount(0);
        pollTimerRef.current = setTimeout(() => pollStandardKitMomoStatus(data.request_id, 0), MOMO_POLL_INTERVAL_MS);
      } catch (e) {
        setSubmitError(e.message || 'Payment failed');
        setMomoStatus('FAILED');
      } finally {
        if (!pollTimerRef.current) setSubmitting(false);
      }
      return;
    }
    if (draft?.uniformVoucherCheckout) {
      if (payMethod !== 'momo') { setSubmitError('Uniform voucher payments currently use MTN Mobile Money.'); return; }
      await handleUniformVoucherConfirm();
      return;
    }
    if (draft?.agentShopCheckout) {
      if (payMethod !== 'momo') { setSubmitError('Agent shop payments currently use MTN Mobile Money.'); return; }
      if (!isValidMomoPhone(momoPhoneRaw)) {
        setMomoPhoneError(`"${momoPhoneRaw || '(empty)'}" is not a valid MTN Rwanda number.`); return;
      }
      setMomoPhoneError('');
      setSubmitting(true);
      setSubmitError('');
      try {
        const res = await fetch(`${API}/student-services/public/shop/pay-momo`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            batch_ref: draft.batchRef,
            payer_phone: momoPhoneRaw,
          }),
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok || !j.success) throw new Error(j.message || 'Payment failed');
        const data = j.data || {};
        const st = String(data.mtn_status || 'PENDING').toUpperCase();
        setMomoStatus(st);
        setMomoReferenceId(data.batch_ref || draft.batchRef || '');
        if (st === 'SUCCESSFUL') {
          setDoneId(data.batch_ref || draft.batchRef || 'SHOP');
          setInvoiceStatus('PAID');
          setDoneMode('momo');
          setShowDoneModal(true);
          setSubmitting(false);
          return;
        }
        setMomoPollCount(0);
        pollTimerRef.current = setTimeout(() => pollShopMomoStatus(draft.batchRef, 0), MOMO_POLL_INTERVAL_MS);
      } catch (e) {
        setSubmitError(e.message || 'Payment failed');
        setMomoStatus('FAILED');
      } finally {
        if (!pollTimerRef.current) setSubmitting(false);
      }
      return;
    }
    if (draft?.studentServiceCheckout) {
      if (payMethod !== 'momo') { setSubmitError('Student service payments use MTN Mobile Money.'); return; }
      await handleStudentServiceConfirm(); return;
    }
    if (!draft?.schoolId || !draft?.babyeyiId) return;
    setSubmitError('');
    if (!principal || principal < 100) { setSubmitError(`Invalid amount: ${principal} RWF. Minimum is 100 RWF.`); return; }
    if (exceedsRemaining && payMethod !== 'loan') {
      setSubmitError(`The amount (${Number(principal).toLocaleString()} RWF) is above the remaining balance (${Number(remainingBalanceRwf).toLocaleString()} RWF).`); return;
    }

    if (payMethod === 'momo') {
      if (!isValidMomoPhone(momoPhoneRaw)) {
        setMomoPhoneError(`"${momoPhoneRaw || '(empty)'}" is not a valid MTN Rwanda number. Use 07XXXXXXXX.`); return;
      }
      setMomoPhoneError('');
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
      setMomoStatus('PENDING'); setMomoPollCount(0); setMomoReferenceId(null); setMomoErrorDetail(''); setSubmitting(true);
      try {
        const intent = await recordIntent({ status: 'submitted' });
        setInvoiceNo(intent?.invoice?.invoice_no || '');
        setInvoiceStatus(String(intent?.invoice?.invoice_status || 'NOT_PAID').toUpperCase());
        if (!intent.intent_id) throw new Error('Intent ID not returned.');
        if (intent.gateway_failed) {
          setMomoStatus('FAILED'); setMomoErrorDetail(intent.gateway_error || '');
          setSubmitError(intent.message || 'MoMo request failed.'); setSubmitting(false); return;
        }
        if (!intent.provider_reference) {
          setMomoStatus('FAILED'); setSubmitError('MoMo provider did not return a reference.'); setSubmitting(false); return;
        }
        setMomoReferenceId(intent.provider_reference);
        pollTimerRef.current = setTimeout(() => pollMomoStatus(intent.intent_id, 0), MOMO_POLL_INTERVAL_MS);
      } catch (err) {
        setMomoStatus('FAILED'); setMomoErrorDetail(`Network error: ${err.message}`);
        setSubmitError(`Could not start payment: ${err.message}`); setSubmitting(false);
      }
      return;
    }

    if (payMethod === 'bank') {
      if (!validateBankTransferDetails()) return;
      setSubmitting(true);
      try {
        const intent = await recordIntent({ status: 'submitted' });
        setDoneId(intent.intent_id || null);
        setInvoiceNo(intent?.invoice?.invoice_no || '');
        setInvoiceStatus(String(intent?.invoice?.invoice_status || 'NOT_PAID').toUpperCase());
        setDoneMode('bank'); setShowDoneModal(true);
      } catch (err) { setSubmitError(`Could not record intent: ${err.message}`); }
      finally { setSubmitting(false); }
      return;
    }

    if (payMethod === 'visa') {
      const visaErr = validateVisaDetails();
      if (visaErr) { setSubmitError(visaErr); return; }
      setSubmitting(true);
      try {
        const intent = await recordIntent({ status: 'submitted' });
        setDoneId(intent.intent_id || null);
        setInvoiceNo(intent?.invoice?.invoice_no || '');
        setInvoiceStatus(String(intent?.invoice?.invoice_status || 'NOT_PAID').toUpperCase());
        setDoneMode('visa'); setShowDoneModal(true);
      } catch (err) { setSubmitError(`Could not process card intent: ${err.message}`); }
      finally { setSubmitting(false); }
      return;
    }

    if (payMethod === 'loan') {
      if (loanStep !== 'review') { setLoanError('Complete all steps before submitting.'); return; }
      if (!validateLoanDetails()) return;
      setSubmitting(true);
      try {
        const intent = await recordIntent({ status: 'submitted' });
        setDoneId(intent.intent_id || null);
        setInvoiceNo(intent?.invoice?.invoice_no || '');
        setInvoiceStatus(String(intent?.invoice?.invoice_status || 'NOT_PAID').toUpperCase());
        setDoneMode('loan'); setShowDoneModal(true);
      } catch (err) { setSubmitError(`Could not submit loan request: ${err.message}`); }
      finally { setSubmitting(false); }
    }
  };

  const studsForBalance = Array.isArray(draft?.selectedStudents) && draft.selectedStudents.length
    ? draft.selectedStudents : (draft?.selectedStudent ? [draft.selectedStudent] : []);
  const awaitingBalance = payMethod !== 'loan' && studsForBalance.length > 0 && balanceLoading;
  const visaDigits      = visaCardNumber.replace(/\D/g, '');
  const isVisaPrefix    = visaDigits.startsWith('4');

  const canSubmit = draft?.studentServiceCheckout
    ? !submitting && !doneId && payMethod === 'momo' && (!momoStatus || momoStatus === 'FAILED' || momoStatus === 'TIMEOUT') && principal >= 100
    : draft?.agentShopCheckout || draft?.standardKitCheckout || draft?.uniformVoucherCheckout
      ? !submitting && !doneId && payMethod === 'momo' && (!momoStatus || momoStatus === 'FAILED' || momoStatus === 'TIMEOUT') && principal >= 100
    : !submitting && !doneId && !exceedsRemaining && !awaitingBalance &&
      (payMethod === 'momo'
        ? (!momoStatus || momoStatus === 'FAILED' || momoStatus === 'TIMEOUT')
        : payMethod === 'visa'
          ? visaCardHolder.trim() && visaDigits.length === 16 && /^((0[1-9])|(1[0-2]))\/\d{2}$/.test(visaExpiry.trim()) && /^\d{3,4}$/.test(visaCvv.trim())
          : payMethod === 'loan'
            ? loanStep === 'review' && loanApplicantName.trim() && loanAccountNumber.trim() && loanNationalId.trim()
            : payMethod === 'bank'
              ? bankAccountHolder.trim() && bankAccountNumber.trim() && bankPaymentRef.trim()
              : true);

  const label = useMemo(() => {
    if (!draft) return '';
    if (draft.studentServiceCheckout) {
      const p   = draft.studentServicePayload;
      if (!p) return `${draft.docLabel || 'Service'} · Babyeyi`;
      const stu = p.quote?.student || {};
      const parts = [stu.class_name, p.service?.name || draft.docLabel, stu.academic_year, stu.school_name].filter(Boolean);
      return parts.length ? parts.join(' · ') : `${p.service?.name || draft.docLabel || 'Service'} · Babyeyi`;
    }
    if (draft.agentShopCheckout) {
      const st = draft.student || {};
      const parts = [st.class_name, 'Agent Shop', st.school_name].filter(Boolean);
      return parts.join(' · ') || 'Agent Shop · Babyeyi';
    }
    if (draft.standardKitCheckout) {
      const st = draft.prepared?.student || {};
      const parts = [draft.prepared?.kit?.grade_level, 'Standard Kit', st.school_name].filter(Boolean);
      return parts.join(' · ') || 'Standard Kit · Babyeyi';
    }
    if (draft.uniformVoucherCheckout) {
      const p = draft.uniformVoucherPayload;
      const st = p?.prepared?.student || {};
      const parts = [st.class_name, 'Uniform voucher', st.school_name].filter(Boolean);
      return parts.join(' · ') || 'Uniform voucher · Babyeyi';
    }
    return `${draft.docLabel || 'Babyeyi'} · ${draft.schoolName || 'School'}`;
  }, [draft]);

  // ── No draft ──────────────────────────────────────────────────
  if (!draft) return (
    <div style={{ minHeight: "100vh", background: C.db900, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ maxWidth: 400, textAlign: "center" }}>
        <AlertCircle size={40} color={C.am200} style={{ marginBottom: 16 }} />
        <div style={{ fontWeight: 700, color: "#fff", fontSize: 16, marginBottom: 8 }}>No payment selection loaded.</div>
        <div style={{ fontSize: 13, color: C.db200, marginBottom: 20, lineHeight: 1.6 }}>
          Start from a school page and tap <strong style={{ color: C.am100 }}>View &amp; pay</strong>, or go to{' '}
          <Link to="/services" style={{ color: C.am200, fontWeight: 700 }}>Babyeyi services</Link>.
        </div>
        <Link to="/schools" style={{ color: C.am200, fontWeight: 700, textDecoration: "none" }}>Browse schools →</Link>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: C.db900, paddingBottom: 60 }}>
      {/* Top bar */}
      <div style={{ background: C.db800, borderBottom: `3px solid ${C.am200}`, padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button onClick={() => navigate(-1)} style={{
          display: "flex", alignItems: "center", gap: 6, background: "transparent",
          border: `1px solid ${C.am400}`, color: C.am100, padding: "6px 14px",
          borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer",
        }}>
          <ArrowLeft size={14} /> Back
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: C.am200, textTransform: "uppercase", letterSpacing: "0.1em" }}>
          <Shield size={13} color={C.am200} /> Secure Payment
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "24px 24px 0" }}>

        {/* Page title */}
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ color: "#fff", fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Complete payment</h1>
          <div style={{ fontSize: 13, color: C.db200 }}>{label}</div>
          {(draft?.studentServiceCheckout || draft?.uniformVoucherCheckout) && draft?.payer?.name && (
            <div style={{ fontSize: 12, color: C.am100, marginTop: 3 }}>
              Payer: <strong>{draft.payer.name}</strong>
            </div>
          )}
        </div>

        {/* ── Payment summary card ────────────────────────────── */}
        <div style={card}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: C.am600, marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
            <Wallet size={13} color={C.am400} /> Payment summary
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
            {/* You pay now */}
            <div style={{ background: C.db900, borderRadius: 8, padding: "14px 16px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: C.am100, marginBottom: 4 }}>You pay now</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: C.am200, fontFamily: "monospace", lineHeight: 1 }}>
                {Number(principal).toLocaleString()} <span style={{ fontSize: 13, color: C.am100 }}>RWF</span>
              </div>
            </div>

            {/* Remaining on checked lines */}
            {!draft?.studentServiceCheckout && payMethod !== 'loan' && (balanceLoading || balanceQuote) ? (
              <div style={{ background: C.am50, border: `1px solid ${C.am200}`, borderRadius: 8, padding: "14px 16px" }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: C.am800, marginBottom: 4 }}>Still owed (checked lines)</div>
                {balanceLoading ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.am800, marginTop: 4 }}>
                    <Loader2 size={14} color={C.am400} style={{ animation: "spin 1s linear infinite" }} />
                    Checking school records…
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize: 20, fontWeight: 900, color: C.db900, fontFamily: "monospace", lineHeight: 1 }}>
                      {Number(balanceQuote.remaining_rwf ?? 0).toLocaleString()} <span style={{ fontSize: 12 }}>RWF</span>
                    </div>
                    {balanceQuote?.term_label && (
                      <div style={{ fontSize: 10, color: C.am800, marginTop: 4 }}>{balanceQuote.term_label}</div>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div style={{ background: C.db50, border: `1px solid ${C.db100}`, borderRadius: 8, padding: "14px 16px", display: "flex", alignItems: "center" }}>
                <div style={{ fontSize: 12, color: C.db600, lineHeight: 1.5 }}>
                  {draft?.studentServiceCheckout ? 'Fixed quote for this student service.'
                    : payMethod === 'loan' ? 'Loan flow — balance check skipped.'
                    : 'Balance shown after student is confirmed.'}
                </div>
              </div>
            )}
          </div>

          {/* Whole document remaining */}
          {!draft?.studentServiceCheckout && !balanceLoading && balanceQuote && payMethod !== 'loan' && remainingFullDocumentRwf != null && (
            <div style={{ background: C.db50, border: `1px solid ${C.db200}`, borderRadius: 8, padding: "12px 16px", marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: C.db800, marginBottom: 4 }}>Whole Babyeyi document — still owed</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: C.db900, fontFamily: "monospace" }}>
                {remainingFullDocumentRwf.toLocaleString()} <span style={{ fontSize: 12 }}>RWF</span>
              </div>
              <div style={{ fontSize: 11, color: C.db600, marginTop: 4, lineHeight: 1.5 }}>
                All tuition fees and requirements on this class/term, including unchecked lines.
              </div>
              {remainingUnselectedLinesRwf != null && remainingUnselectedLinesRwf > 0.5 && (
                <div style={{ borderTop: `1px solid ${C.db100}`, marginTop: 8, paddingTop: 8, fontSize: 11, fontWeight: 700, color: C.am800 }}>
                  Not in this payment: {remainingUnselectedLinesRwf.toLocaleString()} RWF still owed on unchecked lines
                </div>
              )}
            </div>
          )}

          {/* Mini stats row */}
          {!draft?.studentServiceCheckout && !balanceLoading && balanceQuote && payMethod !== 'loan' && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 8 }}>
              {selectionListedRwf != null && selectionListedRwf > 0 && (
                <div style={{ background: C.db50, border: `1px solid ${C.db100}`, borderRadius: 6, padding: "8px 10px", textAlign: "center" }}>
                  <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: C.db600, marginBottom: 3 }}>Listed (checked)</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: C.db900, fontFamily: "monospace" }}>{selectionListedRwf.toLocaleString()} RWF</div>
                </div>
              )}
              {creditedTowardSelection != null && selectionListedRwf != null && selectionListedRwf > 0 && (
                <div style={{ background: C.db50, border: `1px solid ${C.db100}`, borderRadius: 6, padding: "8px 10px", textAlign: "center" }}>
                  <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: C.db600, marginBottom: 3 }}>Paid (tracked)</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: C.am800, fontFamily: "monospace" }}>{creditedTowardSelection.toLocaleString()} RWF</div>
                </div>
              )}
              {afterThisPaymentRwf != null && (
                <div style={{ background: C.db50, border: `1px solid ${C.db100}`, borderRadius: 6, padding: "8px 10px", textAlign: "center" }}>
                  <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: C.db600, marginBottom: 3 }}>Left on checked</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: C.db900, fontFamily: "monospace" }}>{afterThisPaymentRwf.toLocaleString()} RWF</div>
                </div>
              )}
              {afterThisPaymentOnDocumentRwf != null && remainingFullDocumentRwf != null && (
                <div style={{ background: C.am50, border: `1px solid ${C.am200}`, borderRadius: 6, padding: "8px 10px", textAlign: "center" }}>
                  <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: C.am800, marginBottom: 3 }}>Left on whole doc</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: C.am900, fontFamily: "monospace" }}>{afterThisPaymentOnDocumentRwf.toLocaleString()} RWF</div>
                </div>
              )}
            </div>
          )}

          {/* Per-student line breakdown */}
          {!draft?.studentServiceCheckout && !balanceLoading && balanceQuote?.per_student?.length > 0 && payMethod !== 'loan' && (
            <details style={{ marginTop: 12 }}>
              <summary style={{ fontSize: 12, fontWeight: 700, color: C.db800, cursor: "pointer", padding: "4px 0", borderTop: `1px solid ${C.db100}`, paddingTop: 10 }}>
                Per line &amp; student breakdown
              </summary>
              {balanceQuote.per_student.map((row, idx) => (
                <div key={row.student_key || idx} style={{ marginTop: 8, background: C.db50, border: `1px solid ${C.db100}`, borderRadius: 8, padding: "10px 12px" }}>
                  <div style={{ fontWeight: 700, color: C.db900, marginBottom: 8, fontSize: 13 }}>{row.student_name}</div>
                  {(row.lines || []).map(ln => (
                    <div key={`${ln.kind}-${ln.id}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: `1px solid ${C.db100}` }}>
                      <span style={{ fontSize: 12, color: C.db700 }}>{ln.label}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 11, color: C.db600, fontFamily: "monospace" }}>
                          {Number(ln.paid_rwf ?? 0).toLocaleString()} paid
                        </span>
                        <span style={{
                          fontSize: 11, fontWeight: 700, fontFamily: "monospace", borderRadius: 4, padding: "2px 7px",
                          color: ln.remaining_rwf <= 0 ? "#15803d" : C.am800,
                          background: ln.remaining_rwf <= 0 ? "#f0fdf4" : C.am50,
                          border: `1px solid ${ln.remaining_rwf <= 0 ? "#bbf7d0" : C.am200}`,
                        }}>
                          {ln.remaining_rwf <= 0 ? "✓ Paid" : `${Number(ln.remaining_rwf).toLocaleString()} due`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </details>
          )}

          {!draft?.studentServiceCheckout && !balanceLoading && balanceQuote && payMethod !== 'loan' && (
            <div style={{ fontSize: 11, color: C.db400, marginTop: 12, lineHeight: 1.5 }}>
              Confirmed payments recorded for this learner on this Babyeyi are included. Pay at or below the remaining balance.
            </div>
          )}
          {exceedsRemaining && (
            <div style={{ marginTop: 8, background: "#fdf0ed", border: "1px solid #f5c6c0", borderRadius: 6, padding: "8px 12px", fontSize: 12, fontWeight: 700, color: "#c0392b" }}>
              Your total exceeds what is still owed — reduce selected items or contact the school.
            </div>
          )}
          {(invoiceNo || invoiceStatus) && (
            <div style={{ marginTop: 12, background: C.db50, border: `1px solid ${C.db100}`, borderRadius: 6, padding: "8px 12px", display: "flex", justifyContent: "space-between", fontSize: 12 }}>
              <span style={{ color: C.db600 }}>{invoiceNo ? `Invoice ${invoiceNo}` : 'Invoice'}</span>
              <span style={{ fontWeight: 800, color: invoiceStatus === 'PAID' ? "#15803d" : C.am800 }}>{invoiceStatus || 'NOT_PAID'}</span>
            </div>
          )}
        </div>

        {/* ── Payment method card ─────────────────────────────── */}
        <div style={card}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: C.am600, marginBottom: 14 }}>
            Choose payment method
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 18 }}>
            {[
              { id: 'momo', label: 'MTN / Airtel', Icon: Smartphone },
              { id: 'bank', label: 'Bank Transfer', Icon: Building2 },
              { id: 'visa', label: 'Visa Card',     Icon: CreditCard },
              { id: 'loan', label: 'Get Loan',      Icon: Wallet    },
            ].map(({ id, label: l, Icon }) => {
              const svcOnly = !!(draft?.studentServiceCheckout && id !== 'momo');
              const shopOnly = !!(draft?.agentShopCheckout && id !== 'momo');
              const kitOnly = !!(draft?.standardKitCheckout && id !== 'momo');
              const uniformOnly = !!(draft?.uniformVoucherCheckout && id !== 'momo');
              const loanLock = payMethod === 'loan' && id !== 'loan';
              return (
                <MethodBtn
                  key={id} id={id} label={l} Icon={Icon}
                  selected={payMethod === id}
                  disabled={svcOnly || shopOnly || kitOnly || uniformOnly || loanLock}
                  onClick={() => {
                    if (svcOnly || shopOnly || kitOnly || uniformOnly || loanLock) return;
                    setPayMethod(id); setSubmitError('');
                    if (id === 'momo') resetMomo();
                  }}
                />
              );
            })}
          </div>

          <div style={{ borderTop: `1px solid ${C.db100}`, paddingTop: 16 }}>

            {/* ── MoMo ───────────────────────────────────────── */}
            {payMethod === 'momo' && (
              <div>
                <InfoBox variant="amber">
                  <div style={{ display: "flex", gap: 8 }}>
                    <Info size={14} color={C.am600} style={{ flexShrink: 0, marginTop: 1 }} />
                    <span>Enter the MTN Mobile Money number to charge. The customer will receive a USSD prompt and must approve by entering their PIN.</span>
                  </div>
                </InfoBox>
                <label style={labelStyle}>MTN or Airtel phone number</label>
                <div style={{ position: "relative", marginBottom: 12 }}>
                  <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 13, fontWeight: 700, color: C.db600 }}>+250</span>
                  <input
                    type="tel" inputMode="numeric"
                    value={momoPhoneRaw.replace(/^\+?250/, '')}
                    onChange={e => { const d = e.target.value.replace(/\D/g, '').slice(0, 9); setMomoPhoneRaw(d); setMomoPhoneError(''); if (momoStatus === 'FAILED' || momoStatus === 'TIMEOUT') resetMomo(); }}
                    placeholder="7XXXXXXXX" maxLength={9}
                    disabled={submitting && momoStatus === 'PENDING'}
                    style={{ ...inputStyle, paddingLeft: 56, borderColor: momoPhoneError ? "#e74c3c" : C.db100 }}
                  />
                </div>
                {momoPhoneError && <div style={{ fontSize: 12, color: "#c0392b", fontWeight: 600, marginTop: -8, marginBottom: 10 }}>{momoPhoneError}</div>}
                <div style={{ background: C.db50, border: `1px solid ${C.db100}`, borderRadius: 8, padding: "10px 14px", marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                    <span style={{ color: C.db600 }}>Amount to deduct</span>
                    <span style={{ fontWeight: 800, color: C.db900, fontFamily: "monospace" }}>{Number(principal).toLocaleString()} RWF</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    <span style={{ color: C.db600 }}>Network</span>
                    <span style={{ fontWeight: 700, color: C.am800 }}>MTN or Airtel Rwanda</span>
                  </div>
                </div>
                <MomoStatusBanner
                  status={momoStatus} referenceId={momoReferenceId}
                  pollCount={momoPollCount} maxPolls={MOMO_MAX_POLLS}
                  errorDetail={momoErrorDetail} onRetry={resetMomo}
                />
              </div>
            )}

            {/* ── Bank transfer ───────────────────────────────── */}
            {payMethod === 'bank' && (
              <div>
                <InfoBox variant="blue">
                  <div style={{ display: "flex", gap: 8 }}>
                    <Landmark size={14} color={C.db600} style={{ flexShrink: 0, marginTop: 1 }} />
                    <span>Fill your transfer details. Your payment intent is recorded after confirmation for school verification.</span>
                  </div>
                </InfoBox>
                <label style={labelStyle}>Select bank</label>
                <select value={bankCode} onChange={e => setBankCode(e.target.value)} style={{ ...inputStyle, marginBottom: 12 }}>
                  {BANK_TRANSFER_OPTIONS.map(b => <option key={b.code} value={b.code}>{b.name}</option>)}
                </select>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={labelStyle}>Account holder name</label>
                    <div style={{ position: "relative" }}>
                      <UserRound size={14} color={C.db400} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)" }} />
                      <input value={bankAccountHolder}
                        onChange={e => { setBankAccountHolder(e.target.value); setFieldError('bankAccountHolder', e.target.value.trim() ? '' : 'Required'); }}
                        placeholder="Account holder name"
                        style={{ ...inputStyle, paddingLeft: 32, borderColor: fieldErrors.bankAccountHolder ? "#e74c3c" : C.db100 }}
                      />
                    </div>
                    {fieldErrors.bankAccountHolder && <div style={{ fontSize: 11, color: "#c0392b", marginTop: 3 }}>{fieldErrors.bankAccountHolder}</div>}
                  </div>
                  <div>
                    <label style={labelStyle}>Bank account number</label>
                    <input value={bankAccountNumber}
                      onChange={e => { setBankAccountNumber(e.target.value.replace(/[^\d-]/g, '')); setFieldError('bankAccountNumber', e.target.value.replace(/\D/g,'').length >= 6 ? '' : 'Enter valid account number'); }}
                      inputMode="numeric" placeholder="Account number"
                      style={{ ...inputStyle, fontFamily: "monospace", borderColor: fieldErrors.bankAccountNumber ? "#e74c3c" : C.db100 }}
                    />
                    {fieldErrors.bankAccountNumber && <div style={{ fontSize: 11, color: "#c0392b", marginTop: 3 }}>{fieldErrors.bankAccountNumber}</div>}
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={labelStyle}>Amount to pay</label>
                    <input value={`${Number(principal).toLocaleString()} RWF`} readOnly style={{ ...inputStyle, background: C.db50, fontWeight: 800 }} />
                  </div>
                  <div>
                    <label style={labelStyle}>Payment reference</label>
                    <input value={bankPaymentRef}
                      onChange={e => { setBankPaymentRef(e.target.value); setFieldError('bankPaymentRef', e.target.value.trim() ? '' : 'Required'); }}
                      placeholder="e.g. BY-REF-12345"
                      style={{ ...inputStyle, fontFamily: "monospace", borderColor: fieldErrors.bankPaymentRef ? "#e74c3c" : C.db100 }}
                    />
                    {fieldErrors.bankPaymentRef && <div style={{ fontSize: 11, color: "#c0392b", marginTop: 3 }}>{fieldErrors.bankPaymentRef}</div>}
                  </div>
                </div>
                <InfoBox variant="blue">Keep your bank transfer receipt and use the same reference for faster reconciliation.</InfoBox>
              </div>
            )}

            {/* ── Visa card ───────────────────────────────────── */}
            {payMethod === 'visa' && (
              <div>
                <InfoBox variant="blue">
                  <div style={{ display: "flex", gap: 8 }}>
                    <Shield size={14} color={C.db600} style={{ flexShrink: 0, marginTop: 1 }} />
                    <span>Enter your Visa card details. Use a valid card with sufficient funds.</span>
                  </div>
                </InfoBox>
                <div style={{ marginBottom: 12 }}>
                  <label style={labelStyle}>Card holder name</label>
                  <input value={visaCardHolder} onChange={e => { setVisaCardHolder(e.target.value); setFieldError('visaCardHolder', e.target.value.trim() ? '' : 'Required'); }}
                    placeholder="Name on card"
                    style={{ ...inputStyle, borderColor: fieldErrors.visaCardHolder ? "#e74c3c" : C.db100 }}
                  />
                  {fieldErrors.visaCardHolder && <div style={{ fontSize: 11, color: "#c0392b", marginTop: 3 }}>{fieldErrors.visaCardHolder}</div>}
                </div>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                    <label style={{ ...labelStyle, marginBottom: 0 }}>Card number (Visa)</label>
                    {visaDigits.length > 0 && (
                      <span style={{ fontSize: 10, fontWeight: 800, color: isVisaPrefix ? "#15803d" : "#c0392b" }}>
                        {isVisaPrefix ? "✓ Visa detected" : "Not a Visa card"}
                      </span>
                    )}
                  </div>
                  <div style={{ position: "relative" }}>
                    {isVisaPrefix && (
                      <span style={{
                        position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                        fontSize: 11, fontWeight: 800, color: C.db800, background: C.db50,
                        border: `1px solid ${C.db200}`, borderRadius: 4, padding: "2px 6px",
                      }}>VISA</span>
                    )}
                    <input value={visaCardNumber}
                      onChange={e => {
                        const d = e.target.value.replace(/\D/g,'').slice(0,16);
                        setVisaCardNumber(d.replace(/(\d{4})(?=\d)/g,'$1 ').trim());
                        if (!d) setFieldError('visaCardNumber','Required');
                        else if (!d.startsWith('4')) setFieldError('visaCardNumber','Must start with 4');
                        else if (d.length !== 16) setFieldError('visaCardNumber','Must be 16 digits');
                        else setFieldError('visaCardNumber','');
                      }}
                      inputMode="numeric" placeholder="1234 5678 9012 3456"
                      style={{ ...inputStyle, fontFamily: "monospace", borderColor: fieldErrors.visaCardNumber ? "#e74c3c" : C.db100, paddingRight: isVisaPrefix ? 52 : 14 }}
                    />
                  </div>
                  {fieldErrors.visaCardNumber && <div style={{ fontSize: 11, color: "#c0392b", marginTop: 3 }}>{fieldErrors.visaCardNumber}</div>}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={labelStyle}>Expiry (MM/YY)</label>
                    <input value={visaExpiry}
                      onChange={e => {
                        const d = e.target.value.replace(/\D/g,'').slice(0,4);
                        const v = d.length > 2 ? `${d.slice(0,2)}/${d.slice(2)}` : d;
                        setVisaExpiry(v);
                        if (!v) setFieldError('visaExpiry','Required');
                        else if (!/^((0[1-9])|(1[0-2]))\/\d{2}$/.test(v)) setFieldError('visaExpiry','Use MM/YY');
                        else setFieldError('visaExpiry','');
                      }}
                      inputMode="numeric" placeholder="MM/YY"
                      style={{ ...inputStyle, borderColor: fieldErrors.visaExpiry ? "#e74c3c" : C.db100 }}
                    />
                    {fieldErrors.visaExpiry && <div style={{ fontSize: 11, color: "#c0392b", marginTop: 3 }}>{fieldErrors.visaExpiry}</div>}
                  </div>
                  <div>
                    <label style={labelStyle}>CVV</label>
                    <input value={visaCvv}
                      onChange={e => { const v = e.target.value.replace(/\D/g,'').slice(0,4); setVisaCvv(v); setFieldError('visaCvv', /^\d{3,4}$/.test(v) ? '' : 'CVV 3–4 digits'); }}
                      inputMode="numeric" placeholder="123"
                      style={{ ...inputStyle, fontFamily: "monospace", borderColor: fieldErrors.visaCvv ? "#e74c3c" : C.db100 }}
                    />
                    {fieldErrors.visaCvv && <div style={{ fontSize: 11, color: "#c0392b", marginTop: 3 }}>{fieldErrors.visaCvv}</div>}
                  </div>
                  <div>
                    <label style={labelStyle}>Amount</label>
                    <input value={`${Number(principal).toLocaleString()} RWF`} readOnly style={{ ...inputStyle, background: C.db50, fontWeight: 800 }} />
                  </div>
                </div>
              </div>
            )}

            {/* ── Loan ────────────────────────────────────────── */}
            {payMethod === 'loan' && (
              <div>
                {/* Step indicator */}
                <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
                  {[{id:'bank',label:'Choose bank'},{id:'details',label:'Account details'},{id:'review',label:'Review'}].map((s, i) => {
                    const stepOrder = ['bank','details','review'];
                    const isDone    = stepOrder.indexOf(loanStep) > i;
                    const isCurrent = loanStep === s.id;
                    return (
                      <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{
                          padding: "5px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                          background: isCurrent ? C.db900 : isDone ? C.am50 : "#f1f5f9",
                          color: isCurrent ? C.am200 : isDone ? C.am800 : "#94a3b8",
                          border: `1px solid ${isCurrent ? C.db900 : isDone ? C.am200 : "#e2e8f0"}`,
                        }}>
                          {i + 1}. {s.label}
                        </span>
                        {i < 2 && <ChevronRight size={13} color="#cbd5e1" />}
                      </div>
                    );
                  })}
                </div>

                {loanStep === 'bank' && (
                  <div style={{ marginBottom: 14 }}>
                    <label style={labelStyle}>Choose bank for loan</label>
                    <select value={loanBankCode} onChange={e => setLoanBankCode(e.target.value)} style={{ ...inputStyle, marginBottom: 12 }}>
                      {RW_BANKS.map(b => <option key={b.code} value={b.code}>{b.name}</option>)}
                    </select>
                    <div style={{ background: C.db50, border: `1px solid ${C.db100}`, borderRadius: 8, padding: "10px 14px", fontSize: 13 }}>
                      <div style={{ marginBottom: 4 }}><span style={{ color: C.db600 }}>Bank: </span><span style={{ fontWeight: 700, color: C.db900 }}>{loanBank.name}</span></div>
                      
                    </div>
                  </div>
                )}

                {loanStep === 'details' && (
                  <div style={{ marginBottom: 14 }}>
                    {[
                      { label: 'Account holder full name', value: loanApplicantName, set: setLoanApplicantName, placeholder: 'Enter full name',     mono: false },
                      { label: 'Bank account number',      value: loanAccountNumber, set: setLoanAccountNumber, placeholder: 'Enter account number', mono: true  },
                      { label: 'National ID (Indangamuntu)', value: loanNationalId,  set: setLoanNationalId,    placeholder: 'Enter national ID',     mono: true  },
                    ].map(({ label: l, value, set, placeholder, mono }) => (
                      <div key={l} style={{ marginBottom: 12 }}>
                        <label style={labelStyle}>{l}</label>
                        <input value={value} onChange={e => { set(e.target.value); setLoanError(''); }} placeholder={placeholder}
                          style={{ ...inputStyle, fontFamily: mono ? "monospace" : "inherit" }}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Loan calculator */}
                <div style={{ background: C.db50, border: `1px solid ${C.db100}`, borderRadius: 8, padding: "14px 16px", marginBottom: 14 }}>
                  <div style={{ marginBottom: 12 }}>
                    <label style={labelStyle}>Loan duration</label>
                    <div style={{ display: "flex", gap: 8 }}>
                      {[1, 3, 6].map(m => (
                        <button key={m} type="button" onClick={() => setLoanMonths(m)} style={{
                          flex: 1, padding: "8px", borderRadius: 6, fontWeight: 700, fontSize: 13,
                          cursor: "pointer", transition: "all 0.15s",
                          background: loanMonths === m ? C.db900 : "#fff",
                          color:      loanMonths === m ? C.am200 : C.db600,
                          border:     `1.5px solid ${loanMonths === m ? C.db900 : C.db100}`,
                        }}>
                          {m} mo
                        </button>
                      ))}
                    </div>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={labelStyle}>Income bracket</label>
                    <select value={incomeId} onChange={e => setIncomeId(e.target.value)} style={inputStyle}>
                      {INCOME_BRACKETS.map(x => <option key={x.id} value={x.id}>{x.label} (~{(x.annualRate * 100).toFixed(0)}% p.a.)</option>)}
                    </select>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={labelStyle}>Repayment frequency</label>
                    <div style={{ display: "flex", gap: 8 }}>
                      {['monthly', 'weekly', 'daily'].map(f => (
                        <button key={f} type="button" onClick={() => setLoanFreq(f)} style={{
                          flex: 1, padding: "7px", borderRadius: 6, fontWeight: 700, fontSize: 12,
                          textTransform: "capitalize", cursor: "pointer",
                          background: loanFreq === f ? C.db900 : "#fff",
                          color:      loanFreq === f ? C.am200 : C.db600,
                          border:     `1.5px solid ${loanFreq === f ? C.db900 : C.db100}`,
                        }}>{f}</button>
                      ))}
                    </div>
                  </div>
                  <div style={{ background: C.db900, borderRadius: 8, padding: "12px 14px", display: "flex", gap: 10 }}>
                    <Calculator size={18} color={C.am200} style={{ flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <div style={{ fontWeight: 800, color: "#fff", fontSize: 13, marginBottom: 4 }}>Indicative schedule</div>
                      <div style={{ fontSize: 12, color: C.am100, marginBottom: 3 }}>
                        Principal: {principal.toLocaleString()} RWF · Interest: {sched.interest.toLocaleString()} RWF
                      </div>
                      <div style={{ fontFamily: "monospace", fontWeight: 800, color: C.am200, fontSize: 14 }}>
                        {sched.installments} × ~{sched.each.toLocaleString()} RWF
                      </div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 6 }}>Estimate only — real rates depend on the lender.</div>
                    </div>
                  </div>
                </div>

                {loanStep === 'review' && (
                  <div style={{ background: C.am50, border: `1px solid ${C.am200}`, borderRadius: 8, padding: "14px 16px", marginBottom: 14 }}>
                    <div style={{ fontWeight: 800, color: C.am900, marginBottom: 10, fontSize: 14 }}>Review loan request</div>
                    {[
                      ['Bank', loanBank.name],
                      ['Name', loanApplicantName || '—'],
                      ['Account No', loanAccountNumber || '—'],
                      ['National ID', loanNationalId || '—'],
                    ].map(([k, v]) => (
                      <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0", borderBottom: `1px solid ${C.am100}` }}>
                        <span style={{ color: C.am800, fontWeight: 600 }}>{k}:</span>
                        <span style={{ fontFamily: k !== 'Bank' && k !== 'Name' ? "monospace" : "inherit", color: C.am900, fontWeight: 700 }}>{v}</span>
                      </div>
                    ))}
                    <div style={{ marginTop: 10, fontWeight: 800, color: C.am900, fontSize: 14 }}>
                      Total to repay: {sched.totalDue.toLocaleString()} RWF
                    </div>
                  </div>
                )}

                {loanError && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#c0392b", fontWeight: 600, marginBottom: 10 }}>
                    <AlertCircle size={13} /> {loanError}
                  </div>
                )}

                <div style={{ display: "flex", gap: 10 }}>
                  <button type="button" disabled={loanStep === 'bank'}
                    onClick={() => { setLoanError(''); setLoanStep(s => s === 'review' ? 'details' : 'bank'); }}
                    style={{
                      flex: 1, padding: "10px", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer",
                      background: "#fff", border: `1.5px solid ${C.db200}`, color: C.db600,
                      opacity: loanStep === 'bank' ? 0.4 : 1,
                    }}>Back</button>
                  <button type="button" disabled={loanStep === 'review'}
                    onClick={() => {
                      setLoanError('');
                      if (loanStep === 'bank')    { setLoanStep('details'); }
                      if (loanStep === 'details') { if (validateLoanDetails()) setLoanStep('review'); }
                    }}
                    style={{
                      flex: 1, padding: "10px", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer",
                      background: C.db900, color: C.am200, border: `1.5px solid ${C.db900}`,
                      opacity: loanStep === 'review' ? 0.4 : 1,
                    }}>
                    {loanStep === 'bank' ? 'Continue →' : loanStep === 'details' ? 'Review →' : 'Ready ✓'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Submit button ───────────────────────────────────── */}
        <button type="button" disabled={!canSubmit} onClick={handleConfirm} style={{
          width: "100%", padding: "14px",
          borderRadius: 10, fontWeight: 800, fontSize: 15,
          background: canSubmit ? C.am200 : C.am50,
          color: canSubmit ? C.db900 : C.am400,
          border: `2px solid ${canSubmit ? C.am400 : C.am100}`,
          cursor: canSubmit ? "pointer" : "not-allowed",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          marginBottom: 12, transition: "all 0.15s",
        }}>
          {submitting && momoStatus === 'PENDING'
            ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Waiting for MoMo approval…</>
            : submitting
            ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Saving…</>
            : doneId ? 'Recorded ✓'
            : payMethod === 'momo'
            ? <><Smartphone size={16} /> Pay Now</>
            : payMethod === 'visa'
            ? <><CreditCard size={16} /> Confirm Visa Payment</>
            : payMethod === 'loan' ? 'Send Loan Request'
            : 'Confirm & Record Intent'}
        </button>

        {submitError && (
          <div style={{ background: "#fdf0ed", border: "1px solid #f5c6c0", borderRadius: 8, padding: "10px 14px", display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 12 }}>
            <AlertCircle size={15} color="#c0392b" style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontSize: 13, color: "#c0392b", fontWeight: 600 }}>{submitError}</div>
          </div>
        )}

        {doneId && payMethod !== 'momo' && (
          <div style={{ textAlign: "center", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, color: "#15803d", fontWeight: 700, fontSize: 14 }}>
              <CheckCircle2 size={16} color="#15803d" />
              Reference saved{typeof doneId === 'number' ? ` #${doneId}` : ''}.
            </div>
            {payMethod === 'bank' && <div style={{ fontSize: 13, color: C.db600, marginTop: 4 }}>Complete the transfer with your bank using the details above.</div>}
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 16, marginBottom: 40 }}>
          <Shield size={12} color={C.db400} />
          <div style={{ fontSize: 11, color: C.db400, textAlign: "center", maxWidth: 460, lineHeight: 1.5 }}>
            {draft?.studentServiceCheckout
              ? 'MTN MoMo is used for this Babyeyi student service. Approve the prompt on your phone to complete payment.'
              : draft?.uniformVoucherCheckout
              ? 'MTN MoMo is used for your uniform voucher. Approve the prompt on your phone to complete payment.'
              : payMethod === 'momo'
              ? ''
              : payMethod === 'visa'
              ? 'Use only your own Visa card. Card details are used for this payment flow and should not be shared.'
              : 'Complete your bank transfer using the details shown above. Keep your receipt for confirmation.'}
          </div>
        </div>
      </div>

      {/* ── Success modal — congratulations, downloads, manual navigation (no auto-redirect) ── */}
      {showDoneModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 120,
          background: "rgba(4,44,83,0.8)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
        }}>
          <div style={{
            width: "100%", maxWidth: 420, background: "#fff",
            border: `2px solid ${C.am200}`, borderRadius: 16,
            padding: "28px 24px", textAlign: "center",
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: 12,
              background: doneMode === 'momo' ? "#f0fdf4" : C.am50,
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 16px",
              border: `1px solid ${doneMode === 'momo' ? "#bbf7d0" : C.am200}`,
            }}>
              <CheckCircle2 size={30} color={doneMode === 'momo' ? "#15803d" : C.am600} />
            </div>

            {doneMode === 'momo' ? (
              <>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: C.db900, margin: "0 0 8px" }}>Congratulations — payment successful</h3>
                <p style={{ fontSize: 13, color: C.db600, lineHeight: 1.6, margin: "0 0 8px" }}>
                  {draft?.studentServiceCheckout
                    ? 'Your MTN MoMo payment went through. Your student service order has been recorded.'
                    : draft?.uniformVoucherCheckout
                    ? 'Your MTN MoMo payment went through. Your uniform voucher is confirmed.'
                    : 'Your MTN MoMo payment went through. Your school payment has been recorded.'}
                </p>
                {momoReferenceId && <div style={{ fontSize: 11, fontFamily: "monospace", color: C.db400, marginBottom: 4 }}>Ref: {momoReferenceId}</div>}
                {invoiceNo && <div style={{ fontSize: 11, fontFamily: "monospace", color: C.db400, marginBottom: 12 }}>Invoice: {invoiceNo}{invoiceStatus ? ` · ${invoiceStatus}` : ''}</div>}
              </>
            ) : doneMode === 'loan' ? (
              <>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: C.db900, margin: "0 0 8px" }}>Loan request submitted</h3>
                <p style={{ fontSize: 13, color: C.db600, lineHeight: 1.6, margin: "0 0 8px" }}>Your request is recorded. Complete each instalment on time when approved.</p>
                {invoiceNo && <div style={{ fontSize: 11, fontFamily: "monospace", color: C.db400, marginBottom: 12 }}>Invoice: {invoiceNo} · {invoiceStatus || 'NOT_PAID'}</div>}
              </>
            ) : doneMode === 'visa' ? (
              <>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: C.db900, margin: "0 0 8px" }}>Card payment intent recorded</h3>
                <p style={{ fontSize: 13, color: C.db600, lineHeight: 1.6, margin: "0 0 8px" }}>Your Visa details were captured and the intent has been saved.</p>
                {invoiceNo && <div style={{ fontSize: 11, fontFamily: "monospace", color: C.db400, marginBottom: 12 }}>Invoice: {invoiceNo} · {invoiceStatus || 'NOT_PAID'}</div>}
              </>
            ) : (
              <>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: C.db900, margin: "0 0 8px" }}>Payment intent recorded</h3>
                <p style={{ fontSize: 13, color: C.db600, lineHeight: 1.6, margin: "0 0 8px" }}>
                  {publicGuestPay
                    ? 'Complete your bank transfer using the details you were given.'
                    : 'Complete the bank transfer to finalise your payment.'}
                </p>
                {invoiceNo && <div style={{ fontSize: 11, fontFamily: "monospace", color: C.db400, marginBottom: 12 }}>Invoice: {invoiceNo} · {invoiceStatus || 'NOT_PAID'}</div>}
              </>
            )}

            {(invoicePdfHref || receiptPdfHref) && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
                {invoicePdfHref && (
                  <a href={invoicePdfHref} target="_blank" rel="noreferrer" style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    width: "100%", padding: "11px", borderRadius: 8,
                    background: "#fff", color: C.db900, fontWeight: 700, fontSize: 13,
                    textDecoration: "none", border: `2px solid ${C.db200}`,
                  }}>
                    <FileText size={15} /> Download invoice (PDF)
                  </a>
                )}
                {receiptPdfHref && (
                  <a href={receiptPdfHref} target="_blank" rel="noreferrer" style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    width: "100%", padding: "11px", borderRadius: 8,
                    background: C.db900, color: C.am200, fontWeight: 700, fontSize: 13,
                    textDecoration: "none",
                  }}>
                    <Download size={15} /> Download receipt (PDF)
                  </a>
                )}
              </div>
            )}

            <button type="button" onClick={() => navigate(afterSuccessPath, { replace: true })} style={{
              width: "100%", padding: "12px", borderRadius: 8,
              background: C.am200, color: C.db900,
              fontWeight: 800, fontSize: 14, border: "none", cursor: "pointer",
            }}>
              {draft?.studentServiceCheckout ? 'Back to services'
                : draft?.uniformVoucherCheckout ? 'Back to uniform voucher'
                : publicGuestPay ? 'Back to Babyeyi Finder'
                : 'Back to dashboard'}
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        select { appearance: auto; }
      `}</style>
    </div>
  );
}