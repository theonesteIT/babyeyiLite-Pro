/**
 * ShuleKitPay.jsx — Custom ShuleKit (school-specific kit items)
 * Same steps 1–2 as Pay by school; step 3 is Babyeyi requirements only for class/term/year.
 * #000435 navy + amber · MTN/Nunito font · Tailwind only
 */

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft, Building2, ChevronRight, CircleDollarSign,
  CreditCard, GraduationCap, Loader2, Search, ShieldCheck,
  X, ArrowRight, School, Banknote, Check, Package,
  AlertCircle, ChevronDown, Calendar,
} from "lucide-react";

const SERVER = import.meta.env.VITE_API_URL || "http://localhost:5100";
const API = `${SERVER}/api`;

const FONT = `"MTN Brighter Sans","Nunito","Varela Round",sans-serif`;

const FontLoader = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900&family=Varela+Round&display=swap');
    *{font-family:"MTN Brighter Sans","Nunito","Varela Round",sans-serif!important}
    @keyframes stepIn{from{opacity:0;transform:translateX(18px)}to{opacity:1;transform:translateX(0)}}
    @keyframes stepOut{from{opacity:1;transform:translateX(0)}to{opacity:0;transform:translateX(-18px)}}
    @keyframes fadeIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
    @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
    @keyframes pulseAmber{0%,100%{box-shadow:0 0 0 0 rgba(251,191,36,.4)}50%{box-shadow:0 0 0 8px rgba(251,191,36,0)}}
    .step-in{animation:stepIn .35s cubic-bezier(.22,1,.36,1) both}
    .fade-in{animation:fadeIn .3s cubic-bezier(.22,1,.36,1) both}
    .spin-anim{animation:spin 1s linear infinite}
  `}</style>
);

/* ── helpers ─────────────────────────────────────────────────── */
function normFeeId(id) {
  if (id != null && String(id).startsWith("pasreq:")) return String(id);
  const n = Number(id);
  return Number.isFinite(n) ? n : id;
}
function normReqId(id) { const n = parseInt(id, 10); return Number.isFinite(n) && n > 0 ? n : null; }
function payImgUrl(p) { if (!p) return ""; if (p.startsWith("http")) return p; return `${SERVER}${p.startsWith("/") ? "" : "/"}${p}`; }
function comboLabel(c) {
  const cls = c.class_name || "—";
  const te = c.term != null && String(c.term).trim() !== "" ? String(c.term).trim() : "—";
  const yr = c.academic_year != null && String(c.academic_year).trim() !== "" ? String(c.academic_year).trim() : "—";
  return `${cls} · ${te} · ${yr}`;
}

/* ── Step indicator component ────────────────────────────────── */
const STEPS = [
  { id: 1, label: "Student", short: "Code", icon: GraduationCap },
  { id: 2, label: "Term & Year", short: "Period", icon: Calendar },
  { id: 3, label: "Requirements", short: "Kit", icon: Package },
  { id: 4, label: "Amount", short: "Amount", icon: Banknote },
  { id: 5, label: "Checkout", short: "Pay", icon: CreditCard },
];

function StepIndicator({ current }) {
  return (
    <div className="flex items-center gap-0 w-full">
      {STEPS.map((s, i) => {
        const done = current > s.id;
        const active = current === s.id;
        return (
          <div key={s.id} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
              <div className={`relative w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center font-black text-[13px] transition-all duration-300 ${
                done ? "bg-amber-400 text-[#000435] shadow-md shadow-amber-400/30"
                : active ? "bg-[#000435] border-2 border-amber-400 text-amber-400 shadow-lg shadow-amber-400/20"
                : "bg-white/5 border border-white/15 text-white/30"
              }`} style={active ? { animation: "pulseAmber 2s ease-in-out infinite" } : {}}>
                {done ? <Check size={15} strokeWidth={3}/> : <s.icon size={14}/>}
              </div>
              <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-[.06em] text-center leading-none hidden xs:block ${
                done ? "text-amber-400" : active ? "text-white" : "text-white/30"
              }`}>{s.short}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="flex-1 h-0.5 mx-1 sm:mx-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
                <div className="h-full rounded-full bg-amber-400 transition-all duration-500"
                  style={{ width: done ? "100%" : active ? "50%" : "0%" }}/>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Reusable field wrapper ──────────────────────────────────── */
function Field({ label, required, error, hint, children }) {
  return (
    <div>
      <label className="block text-[10px] font-black uppercase tracking-[.1em] text-white/40 mb-2">
        {label}{required && <span className="text-amber-400 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="flex items-center gap-1.5 text-[11px] text-red-400 font-semibold mt-1.5"><AlertCircle size={11}/>{error}</p>}
      {hint && !error && <p className="text-[11px] text-white/35 mt-1.5">{hint}</p>}
    </div>
  );
}

function Input({ value, onChange, placeholder, type="text", icon: Icon, onKeyDown, className="" }) {
  const [focused, setFocused] = useState(false);
  return (
    <div className={`flex items-center gap-2.5 rounded-xl border transition-all ${
      focused ? "border-amber-400 bg-amber-400/5 shadow-lg shadow-amber-400/10" : "border-white/15 bg-white/5 hover:border-white/25"
    } px-3.5 h-12`}>
      {Icon && <Icon size={15} className={focused ? "text-amber-400" : "text-white/35"} />}
      <input
        type={type} value={value} onChange={onChange} placeholder={placeholder}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} onKeyDown={onKeyDown}
        className={`flex-1 bg-transparent text-white text-[14px] font-semibold placeholder:text-white/25 outline-none ${className}`}
      />
    </div>
  );
}

function Select({ value, onChange, children, disabled = false }) {
  return (
    <div className="relative">
      <select value={value} onChange={onChange} disabled={disabled}
        className={`w-full h-12 rounded-xl border border-white/15 bg-white/5 text-white text-[13px] font-bold px-4 outline-none appearance-none transition-all ${
          disabled ? "opacity-60 cursor-not-allowed" : "hover:border-white/25 focus:border-amber-400 focus:bg-amber-400/5 cursor-pointer"
        }`}>
        {children}
      </select>
      <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none"/>
    </div>
  );
}

/* ── Summary card ────────────────────────────────────────────── */
function SummaryCard({ label, value, sub, highlight, green }) {
  return (
    <div className={`rounded-xl p-3.5 sm:p-4 border ${
      highlight ? "bg-amber-400/12 border-amber-400/30"
      : green ? "bg-emerald-500/10 border-emerald-500/25"
      : "bg-white/5 border-white/10"
    }`}>
      <p className="text-[9px] font-black uppercase tracking-[.1em] text-white/40 mb-1">{label}</p>
      <p className={`text-[16px] sm:text-[18px] font-black leading-none ${
        highlight ? "text-amber-400" : green ? "text-emerald-400" : "text-white"
      }`}>{value}</p>
      {sub && <p className="text-[10px] text-white/35 mt-1 font-semibold">{sub}</p>}
    </div>
  );
}

/* ── Nav buttons ─────────────────────────────────────────────── */
function NavBtns({ onBack, onNext, nextLabel = "Continue", nextDisabled = false, nextLoading = false, backLabel = "Back" }) {
  return (
    <div className="flex items-center gap-3 pt-5 mt-1 border-t border-white/8">
      {onBack && (
        <button type="button" onClick={onBack}
          className="flex items-center gap-2 px-4 py-3 rounded-xl border border-white/15 text-white/60 font-bold text-[13px] hover:border-white/30 hover:text-white transition-all min-h-[48px]">
          <ArrowLeft size={15}/> {backLabel}
        </button>
      )}
      <button type="button" onClick={onNext} disabled={nextDisabled || nextLoading}
        className={`flex-1 sm:flex-none sm:ml-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-black text-[14px] min-h-[48px] transition-all ${
          nextDisabled || nextLoading
            ? "bg-white/8 text-white/25 cursor-not-allowed"
            : "bg-amber-400 text-[#000435] hover:bg-amber-300 shadow-xl shadow-amber-400/20 active:scale-[.98]"
        }`}>
        {nextLoading && <Loader2 size={16} className="spin-anim"/>}
        {nextLabel} {!nextLoading && <ChevronRight size={16}/>}
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════ */
export default function ShuleKitPay() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlStudentLoadDone = useRef(false);
  const autoCheckoutTriggered = useRef(false);

  // Wizard state
  const [step, setStep] = useState(1);
  const [stepKey, setStepKey] = useState(0);

  const goStep = useCallback((n) => { setStep(n); setStepKey(k => k + 1); }, []);

  // Student code → school + class (from API)
  const [studentCodeInput, setStudentCodeInput] = useState("");
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogErr, setCatalogErr] = useState("");
  const [catalog, setCatalog] = useState(null);
  const [termPick, setTermPick] = useState("");
  const [yearPick, setYearPick] = useState("");

  // Combo / pricing
  const [comboIndex, setComboIndex] = useState(0);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [pricingErr, setPricingErr] = useState("");
  const [pricingData, setPricingData] = useState(null);
  const [feeSel, setFeeSel] = useState(() => new Set());
  const [reqSel, setReqSel] = useState(() => new Set());
  /** RWF already paid at school counter — only for selected "School counter" (pasreq) lines; keys are String(fee id) e.g. pasreq:12 */
  const [schoolCounterPaidByFeeId, setSchoolCounterPaidByFeeId] = useState({});
  const [imgPreview, setImgPreview] = useState(null);

  // Amount
  const [amountInput, setAmountInput] = useState("");
  /** What this payment is covering: tuition & school-counter lines | online requirements only | full selection */
  const [payScope, setPayScope] = useState("combined");

  const [student, setStudent] = useState(null);

  const [payErr, setPayErr] = useState("");

  // Balance
  const [balanceQuote, setBalanceQuote] = useState(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceErr, setBalanceErr] = useState("");

  const school = catalog?.school;
  const combinations = catalog?.combinations || [];

  const yearsForSelection = useMemo(() => {
    return [...new Set(combinations.map((c) => String(c.academic_year || "").trim()).filter(Boolean))]
      .sort((a, b) => String(b).localeCompare(String(a)));
  }, [combinations]);

  const termsForSelection = useMemo(() => {
    const src = combinations.filter((c) => {
      if (yearPick && String(c.academic_year || "").trim() !== yearPick) return false;
      return true;
    });
    return [...new Set(src.map((c) => String(c.term || "").trim()).filter(Boolean))]
      .sort((a, b) => String(a).localeCompare(String(b)));
  }, [combinations, yearPick]);

  const matchingComboIndices = useMemo(() => {
    return combinations
      .map((c, i) => ({ c, i }))
      .filter(({ c }) => {
        if (termPick && String(c.term || "").trim() !== termPick) return false;
        if (yearPick && String(c.academic_year || "").trim() !== yearPick) return false;
        return true;
      })
      .map((x) => x.i);
  }, [combinations, termPick, yearPick]);

  const selectedCombo = combinations[comboIndex] || null;

  const studentPrefill = useMemo(() => (
    (searchParams.get("student_uid") || searchParams.get("student_code") || searchParams.get("code") || "").trim()
  ), [searchParams]);

  useEffect(() => {
    if (!matchingComboIndices.length) return;
    if (!matchingComboIndices.includes(comboIndex)) setComboIndex(matchingComboIndices[0]);
  }, [matchingComboIndices, comboIndex]);

  useEffect(() => {
    if (yearsForSelection.length === 1 && !yearPick) setYearPick(yearsForSelection[0]);
  }, [yearsForSelection, yearPick]);

  useEffect(() => {
    if (termsForSelection.length === 1 && !termPick) setTermPick(termsForSelection[0]);
  }, [termsForSelection, termPick]);

  // Load school + student class + Babyeyi rows for that class (global student code)
  const loadStudentCatalog = async (codeOverride) => {
    const code = String(codeOverride ?? studentCodeInput).trim();
    if (!code) { setCatalogErr("Enter the student UID, official code, or SDM ID."); return; }
    setCatalogLoading(true); setCatalogErr(""); setCatalog(null);
    setPricingData(null); setStudent(null); setAmountInput(""); setComboIndex(0);
    setSchoolCounterPaidByFeeId({});
    setTermPick(""); setYearPick("");
    try {
      const res = await fetch(`${API}/public/public-pay/student-catalog`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) throw new Error(json.message || "Could not load student.");
      setCatalog(json.data);
      setStudent(json.data.student);
      const defY = json.data.default_academic_year;
      const defT = json.data.default_term;
      if (defY) setYearPick(String(defY));
      if (defT) setTermPick(String(defT));
    } catch (e) { setCatalogErr(e.message || "Request failed."); }
    finally { setCatalogLoading(false); }
  };

  // Auto-load student from URL (?code= or ?student_code=)
  useEffect(() => {
    if (urlStudentLoadDone.current) return;
    const c = studentPrefill;
    if (!c) return;
    urlStudentLoadDone.current = true;
    setStudentCodeInput(c);
    void loadStudentCatalog(c);
  }, [studentPrefill]);

  // Load pricing when combo changes
  useEffect(() => {
    if (!school?.id || !selectedCombo?.babyeyi_id) { setPricingData(null); return; }
    let cancelled = false;
    setPricingLoading(true); setPricingErr(""); setPricingData(null);
    setAmountInput(""); setBalanceQuote(null);
    fetch(`${API}/public/babyeyi-pay/pricing/${selectedCombo.babyeyi_id}?school_id=${encodeURIComponent(school.id)}`)
      .then(r => r.json()).then(j => {
        if (cancelled) return;
        if (!j.success) throw new Error(j.message || "Could not load pricing");
        setPricingData(j.data);
        setSchoolCounterPaidByFeeId({});
        setFeeSel(new Set());
        setReqSel(new Set(j.data.requirements?.map(x => normReqId(x.babyeyi_requirement_id)).filter(Boolean) || []));
        setPayScope("requirements_online");
      })
      .catch(e => { if (!cancelled) setPricingErr(e.message || "Failed to load fees"); })
      .finally(() => { if (!cancelled) setPricingLoading(false); });
    return () => { cancelled = true; };
  }, [school?.id, selectedCombo?.babyeyi_id]);

  useEffect(() => {
    setPayScope("requirements_online");
  }, [selectedCombo?.babyeyi_id]);

  const schoolCounterCreditsRwf = useMemo(() => {
    const out = {};
    if (!pricingData?.school_fees) return out;
    for (const f of pricingData.school_fees) {
      if (f.pay_source !== "requirement_paid_at_school") continue;
      const fid = normFeeId(f.id);
      if (!feeSel.has(fid)) continue;
      const key = String(fid);
      const raw = schoolCounterPaidByFeeId[key] ?? "";
      const n = Math.round((parseFloat(String(raw).replace(/,/g, "")) || 0) * 100) / 100;
      if (n <= 0) continue;
      const cap = Math.round(Number(f.amount || 0) * 100) / 100;
      out[key] = Math.min(n, cap);
    }
    return out;
  }, [pricingData, feeSel, schoolCounterPaidByFeeId]);

  const schoolCounterCreditSum = useMemo(
    () => Math.round(Object.values(schoolCounterCreditsRwf).reduce((a, v) => a + Number(v || 0), 0) * 100) / 100,
    [schoolCounterCreditsRwf]
  );

  // Totals (school-counter lines: subtract "already paid at school" toward online remainder)
  const feeTotal = useMemo(() => {
    if (!pricingData?.school_fees) return 0;
    return pricingData.school_fees.filter(f => feeSel.has(normFeeId(f.id))).reduce((s, f) => {
      const owed = Math.round(Number(f.amount || 0) * 100) / 100;
      const key = String(normFeeId(f.id));
      const cred = f.pay_source === "requirement_paid_at_school" ? (schoolCounterCreditsRwf[key] || 0) : 0;
      return s + Math.max(0, owed - cred);
    }, 0);
  }, [pricingData, feeSel, schoolCounterCreditsRwf]);
  const reqTotal = useMemo(() => {
    if (!pricingData?.requirements) return 0;
    return pricingData.requirements
      .filter((r) => reqSel.has(normReqId(r.babyeyi_requirement_id)))
      .reduce((s, r) => s + Number(r.line_total_rwf ?? r.price ?? 0), 0);
  }, [pricingData, reqSel]);
  const grand = Math.round((feeTotal + reqTotal) * 100) / 100;

  useEffect(() => {
    if (step !== 4) return;
    setPayScope("requirements_online");
    const t = Math.round(reqTotal * 100) / 100;
    if (t > 0) setAmountInput(String(t));
  }, [step, reqTotal]);

  const effectiveFeeIds = useMemo(() => {
    if (payScope === "requirements_online") return [];
    return Array.from(feeSel).map((x) => normFeeId(x)).filter((x) => x !== "" && x != null);
  }, [payScope, feeSel]);

  const effectiveReqIds = useMemo(() => {
    if (payScope === "tuition_school") return [];
    return Array.from(reqSel).map((x) => normReqId(x)).filter(Boolean);
  }, [payScope, reqSel]);

  const enteredAmount = parseFloat(String(amountInput).replace(/,/g, "")) || 0;
  const amountOverSel = enteredAmount > grand + 1.5;
  const minPayAmount = useMemo(() => {
    // Step 4 rule: minimum should follow selected requirements/items first,
    // not force full combined (tuition + requirements) payment.
    if (reqTotal > 0) return Math.round(reqTotal * 100) / 100;
    if (feeTotal > 0) return Math.round(feeTotal * 100) / 100;
    return Math.round(grand * 100) / 100;
  }, [feeTotal, reqTotal, grand]);

  const allocationNote = useMemo(() => {
    if (!pricingData || enteredAmount <= 0) return null;
    if (reqTotal > 0 && enteredAmount > reqTotal + 0.01 && feeTotal > 0) {
      return "You pay selected requirements/items first. Additional money is deposited to Tuition Fees & Paid at school.";
    }
    const toReqFirst = Math.min(enteredAmount, reqTotal);
    const afterReq = Math.max(0, enteredAmount - toReqFirst);
    const toFeeAfter = Math.min(afterReq, feeTotal);
    if (payScope === "requirements_online" && reqTotal > 0 && enteredAmount > reqTotal + 0.01 && feeTotal > 0) {
      return `Your selected online requirements total ${Math.round(reqTotal * 100) / 100} RWF. Any amount above that (up to your full selection) is recorded toward tuition & school-counter items.`;
    }
    if (payScope === "tuition_school" && feeTotal > 0 && enteredAmount > feeTotal + 0.01 && reqTotal > 0) {
      const toFee = Math.min(enteredAmount, feeTotal);
      const toReq = Math.min(Math.max(0, enteredAmount - toFee), reqTotal);
      return `Tuition & school items use ${Math.round(toFee * 100) / 100} RWF; ${Math.round(toReq * 100) / 100} RWF is applied to online requirements.`;
    }
    if (payScope === "combined" && grand > 0 && reqTotal > 0 && feeTotal > 0 && enteredAmount + 1e-6 >= minPayAmount && enteredAmount <= grand + 1e-6) {
      return `This payment applies ${Math.round(toReqFirst * 100) / 100} RWF to online requirements first, then ${Math.round(toFeeAfter * 100) / 100} RWF to tuition & school-counter lines.`;
    }
    return null;
  }, [pricingData, enteredAmount, reqTotal, feeTotal, payScope, minPayAmount, grand]);

  const amountValid = enteredAmount + 1e-6 >= minPayAmount && !amountOverSel && enteredAmount <= grand + 1.5;

  // Student lookup
  const selectedStudentForQuote = useMemo(() => {
    if (!student?.id) return null;
    return { student_id: student.id, student_uid: student.student_uid || null, student_code: student.student_code || null, sdm_code: student.sdm_code || null, student_name: `${student.first_name || ""} ${student.last_name || ""}`.trim(), first_name: student.first_name || null, last_name: student.last_name || null, class_name: student.class_name || null, academic_year: student.academic_year || null, school_name: school?.school_name || null };
  }, [student, school?.school_name]);

  // Balance quote (matches intended payment scope on step 4+)
  useEffect(() => {
    if (!school?.id || !selectedCombo?.babyeyi_id || !selectedStudentForQuote) { setBalanceQuote(null); setBalanceErr(""); return; }
    const feeIds = effectiveFeeIds;
    const reqIds = effectiveReqIds;
    let cancelled = false;
    setBalanceLoading(true); setBalanceErr("");
    fetch(`${API}/public/babyeyi-pay/quote-balance`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        school_id: school.id,
        babyeyi_id: selectedCombo.babyeyi_id,
        selected_fee_ids: feeIds,
        selected_requirement_ids: reqIds,
        selected_students: [selectedStudentForQuote],
        school_counter_credits_rwf: schoolCounterCreditsRwf,
      }),
    }).then(r => r.json()).then(j => {
      if (cancelled) return;
      if (!j.success) throw new Error(j.message || "Balance check failed");
      setBalanceQuote(j.data || null);
    }).catch(e => { if (!cancelled) { setBalanceQuote(null); setBalanceErr(e.message || "Balance check failed"); } })
    .finally(() => { if (!cancelled) setBalanceLoading(false); });
    return () => { cancelled = true; };
  }, [school?.id, selectedCombo?.babyeyi_id, selectedStudentForQuote, payScope, JSON.stringify(effectiveFeeIds), JSON.stringify(effectiveReqIds), JSON.stringify(schoolCounterCreditsRwf)]);

  const remainingOwed = balanceQuote != null ? Number(balanceQuote.remaining_rwf ?? 0) : null;
  const remainingFullDocument = balanceQuote != null ? Number(balanceQuote.remaining_full_document_rwf ?? balanceQuote.remaining_rwf ?? 0) : null;
  const remainingAfterCurrentPayment = remainingOwed != null
    ? Math.max(0, Math.round((remainingOwed - enteredAmount) * 100) / 100)
    : null;
  const remainingFullDocumentAfterCurrentPayment = remainingFullDocument != null
    ? Math.max(0, Math.round((remainingFullDocument - enteredAmount) * 100) / 100)
    : null;
  const overpays = remainingOwed != null && enteredAmount > remainingOwed + 1.5;

  const classMismatch = useMemo(() => {
    if (!student?.class_name || !pricingData?.babyeyi?.class_name) return false;
    const a = String(student.class_name).trim().toLowerCase().replace(/\s+/g, "");
    const b = String(pricingData.babyeyi.class_name).trim().toLowerCase().replace(/\s+/g, "");
    return a && b && a !== b;
  }, [student, pricingData]);

  const toggleFee = (id) => { const fid = normFeeId(id); setFeeSel(prev => { const n = new Set(prev); n.has(fid) ? n.delete(fid) : n.add(fid); return n; }); };
  const toggleReq = (id) => {
    const rid = normReqId(id);
    if (!rid) return;
    setReqSel((prev) => {
      const n = new Set(prev);
      if (n.has(rid)) n.delete(rid);
      else n.add(rid);
      return n;
    });
  };

  const continueToPayment = () => {
    setPayErr("");
    if (!school || !selectedCombo?.babyeyi_id || !pricingData) { setPayErr("Load term, year, and fees first."); return; }
    if (!amountValid) {
      if (enteredAmount + 1e-6 < minPayAmount) {
        setPayErr("The amount entered is less than the total for the selected requirements. Please pay the full required amount.");
      } else {
        setPayErr(`Enter at least ${minPayAmount.toLocaleString()} RWF.`);
      }
      return;
    }
    if (classMismatch) { setPayErr("Student's class does not match the selected Babyeyi. Go back and pick another term or year."); return; }
    if (!student) { setPayErr("Student could not be confirmed. Go back to step 1."); return; }
    if (balanceLoading) { setPayErr("Please wait — confirming balance."); return; }
    if (overpays) { setPayErr("Amount exceeds remaining balance for this student."); return; }
    const selectedStudent = { student_id: student.id, student_uid: student.student_uid || null, student_code: student.student_code || null, sdm_code: student.sdm_code || null, student_name: `${student.first_name || ""} ${student.last_name || ""}`.trim(), first_name: student.first_name || null, last_name: student.last_name || null, class_name: student.class_name || null, academic_year: student.academic_year || null, school_name: school.school_name || null };
    const fullDraft = {
      schoolId: school.id,
      babyeyiId: selectedCombo.babyeyi_id,
      schoolName: school.school_name || "",
      docLabel: comboLabel(selectedCombo),
      grandTotal: enteredAmount,
      selectedFeeIds: effectiveFeeIds,
      selectedReqIds: effectiveReqIds,
      payScope,
      schoolCounterCreditsRwf,
      pricingSnapshot: pricingData,
      selectedStudent,
      payer: null,
      fromPublicFinder: true,
      publicPayNoLogin: true,
      fromPublicSchoolPay: true,
      fromCustomShuleKit: true,
    };
    try { sessionStorage.setItem("babyeyi_pay_draft", JSON.stringify(fullDraft)); } catch (_) {}
    navigate("/payments", { state: fullDraft });
  };

  useEffect(() => {
    if (step !== 5) autoCheckoutTriggered.current = false;
  }, [step]);

  // Auto-open payment page once the checkout form is fully valid.
  useEffect(() => {
    if (step !== 5 || autoCheckoutTriggered.current) return;
    const ready =
      !!school &&
      !!selectedCombo?.babyeyi_id &&
      !!pricingData &&
      amountValid &&
      !!student &&
      !classMismatch &&
      !balanceLoading &&
      !overpays;
    if (!ready) return;
    autoCheckoutTriggered.current = true;
    const t = setTimeout(() => continueToPayment(), 180);
    return () => clearTimeout(t);
  }, [
    step,
    school,
    selectedCombo,
    pricingData,
    amountValid,
    student,
    classMismatch,
    balanceLoading,
    overpays,
  ]);

  // ── RENDER ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#000435]" style={{ fontFamily: FONT }}>
      <FontLoader/>

      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-[#000435]/95 backdrop-blur-xl border-b-[3px] border-amber-400">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/6 border border-white/12 text-white/60 font-bold text-[12px] hover:bg-white/10 hover:text-white transition-all">
            <ArrowLeft size={14}/> Back
          </button>
          <div className="flex items-center gap-2 ml-1">
            <div className="w-7 h-7 rounded-lg bg-amber-400 flex items-center justify-center">
              <School size={14} className="text-[#000435]"/>
            </div>
            <span className="font-black text-[14px] sm:text-[15px] text-white hidden xs:block">
              Custom ShuleKit
            </span>
          </div>
          <div className="flex items-center gap-1.5 ml-auto text-[11px] font-bold text-amber-400">
            <ShieldCheck size={14}/>
            <span className="hidden sm:inline">Secure Checkout</span>
          </div>
        </div>
      </div>

      {/* Page */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8">

        {/* Hero heading */}
        <div className="mb-7 sm:mb-8">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/10 border border-amber-400/25 px-3 py-1.5 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"/>
            <span className="text-[10px] font-black uppercase tracking-[.12em] text-amber-400">
              Custom ShuleKit
            </span>
          </div>
          <h1 className="font-black text-white text-[24px] sm:text-[28px] xl:text-[32px] tracking-tight leading-tight mb-2">
            Pay for SchoolKit by&nbsp;
            <span className="text-amber-400">Student code</span>
          </h1>
        
        </div>

        {/* Main card */}
        <div className="rounded-2xl xl:rounded-3xl bg-white/4 border border-amber-400/20 overflow-hidden shadow-2xl shadow-black/30">

          {/* Step indicator header */}
          <div className="px-5 sm:px-6 py-5 border-b border-white/8 bg-[#000435]/50">
            <StepIndicator current={step}/>
          </div>

          {/* Step content area */}
          <div className="px-5 sm:px-6 py-6">

            {/* ── STEP 1: Student code → school + class ──────── */}
            {step === 1 && (
              <div key={stepKey} className="step-in">
                <div className="mb-6">
                  <h2 className="font-black text-white text-[18px] sm:text-[20px] mb-1.5">Enter student code</h2>
                  
                </div>

                <Field label="Student Code / UID / SDMS ID" required error={catalogErr}>
                  <div className="flex gap-2.5">
                    <div className="flex-1">
                      <Input value={studentCodeInput} onChange={e => { setStudentCodeInput(e.target.value); setCatalogErr(""); }} placeholder="Official student code or UID" icon={Search} onKeyDown={e => e.key === "Enter" && loadStudentCatalog()}/>
                    </div>
                    <button type="button" onClick={() => loadStudentCatalog()} disabled={catalogLoading}
                      className="flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-400 text-[#000435] font-black text-[13px] hover:bg-amber-300 transition-all disabled:opacity-50 shrink-0 min-h-[48px]">
                      {catalogLoading ? <Loader2 size={15} className="spin-anim"/> : <Search size={15}/>}
                      <span className="hidden sm:inline">Find</span>
                    </button>
                  </div>
                </Field>

                {school && student && (
                  <div className="mt-5 fade-in space-y-3">
                    <div className="flex items-center gap-3 p-4 rounded-xl border border-amber-400/30 bg-amber-400/8">
                      <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center shrink-0">
                        <Building2 size={18} className="text-amber-400"/>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-white text-[15px] truncate">{school.school_name}</p>
                        <p className="text-[11px] font-mono text-amber-400/70 mt-0.5">School code: {school.school_code}</p>
                      </div>
                      <Check size={16} className="text-amber-400 shrink-0" strokeWidth={2.5}/>
                    </div>
                    <div className="flex items-start gap-3 p-4 rounded-xl border border-white/10 bg-white/4">
                      <div className="w-10 h-10 rounded-xl bg-amber-400/15 border border-amber-400/25 flex items-center justify-center font-black text-[13px] text-amber-400 shrink-0">
                        {`${student.first_name || " "}`[0]}{`${student.last_name || " "}`[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-white text-[15px]">{student.first_name} {student.last_name}</p>
                        <p className="text-[12px] text-white/45 font-semibold mt-1">
                          Class <span className="text-white/80">{student.class_name || "—"}</span>
                          {student.academic_year ? <span className="text-white/35"> · Record year {student.academic_year}</span> : null}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <NavBtns
                  onNext={() => {
                    if (school && student && combinations.length > 0) goStep(2);
                    else if (!school) loadStudentCatalog();
                  }}
                  nextLabel={school ? "Continue" : "Find Student"}
                  nextDisabled={!school || !student || !combinations.length}
                  nextLoading={catalogLoading}
                />
              </div>
            )}

            {/* ── STEP 2: Term & academic year (class fixed) ─── */}
            {step === 2 && school && student && (
              <div key={stepKey} className="step-in">
                <div className="mb-6">
                  <h2 className="font-black text-white text-[18px] sm:text-[20px] mb-1.5">Term and academic year</h2>
                  <p className="text-white/45 text-[13px]">
                    Fees are for <span className="text-amber-400 font-bold">{student.class_name || "your class"}</span> at {school.school_name}.
                  
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 gap-3 mb-4">
                  <Field label="Academic Year" required>
                    <Select
                      value={yearPick}
                      onChange={(e) => { setYearPick(e.target.value); setTermPick(""); }}
                      disabled={!yearsForSelection.length}
                    >
                      <option value="">Choose year…</option>
                      {yearsForSelection.map((y) => <option key={y} value={y}>{y}</option>)}
                    </Select>
                  </Field>
                  <Field label="Term" required>
                    <Select value={termPick} onChange={(e) => setTermPick(e.target.value)} disabled={!yearPick}>
                      <option value="">Choose term…</option>
                      {termsForSelection.map((t) => <option key={t} value={t}>{t}</option>)}
                    </Select>
                  </Field>
                </div>

                {matchingComboIndices.length > 1 && (
                  <Field label="Babyeyi document" hint="Multiple fee documents match; pick the one that matches your invoice.">
                    <Select value={comboIndex} onChange={(e) => setComboIndex(Number(e.target.value))}>
                      {matchingComboIndices.map((i) => (
                        <option key={`${combinations[i].babyeyi_id}-${i}`} value={i}>{comboLabel(combinations[i])}</option>
                      ))}
                    </Select>
                  </Field>
                )}

                {yearPick && termPick && matchingComboIndices.length === 0 && (
                  <div className="rounded-xl border border-red-400/25 bg-red-400/8 px-3.5 py-3 text-[12px] text-red-300 font-semibold">
                    No Babyeyi for this class with the selected term and year. Try another combination.
                  </div>
                )}

                <NavBtns
                  onBack={() => goStep(1)}
                  onNext={() => { if (termPick && yearPick && matchingComboIndices.length > 0) goStep(3); }}
                  nextLabel="Continue to Requirements"
                  nextDisabled={!termPick || !yearPick || matchingComboIndices.length === 0}
                />
              </div>
            )}

            {/* ── STEP 3: Fees & Requirements ─────────────────── */}
            {step === 3 && school && (
              <div key={stepKey} className="step-in">
                <div className="mb-5">
                  <h2 className="font-black text-white text-[18px] sm:text-[20px] mb-1">School kit requirements</h2>
                  <p className="text-white/45 text-[13px]">
                    Items listed here come from your school&apos;s Babyeyi document for <span className="text-amber-400 font-bold">{student?.class_name || "your class"}</span>, this term, and academic year. Select what you need; total updates instantly.
                  </p>
                </div>

                {/* Combo selector */}
                <div className="mb-5 p-3.5 rounded-xl border border-amber-400/20 bg-amber-400/5 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-400 flex items-center justify-center shrink-0">
                    <GraduationCap size={15} className="text-[#000435]"/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-white text-[13px]">{school.school_name}</p>
                    <p className="text-[11px] text-amber-400/70 font-semibold">{selectedCombo ? comboLabel(selectedCombo) : "—"}</p>
                  </div>
                  <button type="button" onClick={() => goStep(2)} className="text-[11px] text-amber-400/60 hover:text-amber-400 font-bold transition-colors shrink-0">Change</button>
                </div>

                {pricingLoading && (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <div className="w-10 h-10 rounded-xl border border-amber-400/25 flex items-center justify-center">
                      <Loader2 size={20} className="text-amber-400 spin-anim"/>
                    </div>
                    <p className="text-white/40 text-[13px] font-semibold">Loading requirements…</p>
                  </div>
                )}

                {pricingErr && (
                  <div className="flex items-start gap-2.5 p-4 rounded-xl border border-red-500/25 bg-red-500/8 text-red-400 text-[13px] font-semibold">
                    <AlertCircle size={15} className="mt-0.5 shrink-0"/>{pricingErr}
                  </div>
                )}

                {!pricingLoading && !pricingErr && pricingData && (
                  <>
                    {/* Requirements only — Custom ShuleKit */}
                    {(pricingData.requirements || []).length > 0 && (
                      <div className="mb-5">
                        <p className="text-[10px] font-black uppercase tracking-[.1em] text-white/35 mb-3 flex items-center gap-2">
                          <GraduationCap size={12}/> Babyeyi requirements for this class / term / year
                        </p>
                        <div className="space-y-2">
                          {pricingData.requirements.map((r) => {
                            const rid = normReqId(r.babyeyi_requirement_id);
                            const selected = rid != null && reqSel.has(rid);
                            const line = Number(r.line_total_rwf ?? r.price ?? 0);
                            return (
                              <div
                                key={r.babyeyi_requirement_id}
                                onClick={() => rid != null && toggleReq(rid)}
                                className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                                  selected ? "border-amber-400/40 bg-amber-400/8" : "border-white/10 bg-white/3 hover:border-white/20"
                                }`}
                              >
                                <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border-2 transition-all ${
                                  selected ? "bg-amber-400 border-amber-400" : "border-white/25 bg-transparent"
                                }`}>
                                  {selected && <Check size={11} className="text-[#000435]" strokeWidth={3}/>}
                                </div>
                                {r.catalog_image_url ? (
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setImgPreview(payImgUrl(r.catalog_image_url)); }}
                                    className="w-9 h-9 rounded-lg border border-white/10 overflow-hidden shrink-0"
                                  >
                                    <img src={payImgUrl(r.catalog_image_url)} alt="" className="w-full h-full object-contain"/>
                                  </button>
                                ) : null}
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-white text-[13px]">{r.requirement_name}</p>
                                  <p className="text-[10px] text-white/35 mt-0.5">
                                    {Number(r.unit_price_rwf ?? 0).toLocaleString()} RWF × {Number(r.quantity_value ?? 1)} = {line.toLocaleString()} RWF
                                    {r.quantity != null && String(r.quantity).trim() !== "" ? ` · ${String(r.quantity)}` : ""}
                                  </p>
                                </div>
                                <span className="font-black text-[13px] font-mono text-amber-400 shrink-0">{line.toLocaleString()} RWF</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {(pricingData.requirements || []).length === 0 && (
                      <div className="rounded-xl border border-amber-400/25 bg-amber-400/8 px-3.5 py-3 text-[12px] text-amber-100/90 font-semibold">
                        No kit requirements are configured for this class and period in Babyeyi. Contact the school if this is unexpected.
                      </div>
                    )}

                    {/* Total — requirements only */}
                    <div className="p-4 rounded-xl border-2 border-amber-400/40 bg-amber-400/6">
                      <div className="flex items-center justify-between">
                        <p className="font-black text-white text-[15px]">Selected kit total</p>
                        <p className="font-black text-amber-400 text-[22px] font-mono">{reqTotal.toLocaleString()} <span className="text-[14px]">RWF</span></p>
                      </div>
                    </div>
                  </>
                )}

                <NavBtns
                  onBack={() => goStep(2)}
                  onNext={() => { if (pricingData && reqTotal > 0) goStep(4); }}
                  nextLabel="Set Amount"
                  nextDisabled={!pricingData || pricingLoading || !!pricingErr || reqTotal === 0}
                />
              </div>
            )}

            {/* ── STEP 4: Amount ───────────────────────────────── */}
            {step === 4 && pricingData && (
              <div key={stepKey} className="step-in">
                <div className="mb-5">
                  <h2 className="font-black text-white text-[18px] sm:text-[20px] mb-1.5">Payment amount</h2>
                  <p className="text-white/45 text-[13px]">Custom ShuleKit covers your selected Babyeyi requirements only (not tuition fees).</p>
                </div>

                <div className="mb-5 p-4 rounded-xl border border-amber-400/30 bg-amber-400/8">
                  <p className="text-[10px] font-black uppercase tracking-[.1em] text-white/45 mb-1">Selected requirements total</p>
                  <p className="text-[20px] font-black text-amber-400 font-mono">{Math.round(reqTotal * 100) / 100} <span className="text-[14px]">RWF</span></p>
                </div>

                <Field label="Amount (RWF)" required error={amountOverSel ? `Cannot exceed ${grand.toLocaleString()} RWF (selected items total).` : enteredAmount > 0 && enteredAmount + 1e-6 < minPayAmount ? `Enter at least ${minPayAmount.toLocaleString()} RWF for selected requirements.` : ""}>
                  <div className={`flex items-center gap-2.5 rounded-xl border transition-all h-14 px-4 ${
                    amountOverSel ? "border-red-400/50 bg-red-400/5"
                    : amountValid && enteredAmount > 0 ? "border-emerald-400/50 bg-emerald-400/5"
                    : "border-white/15 bg-white/5"
                  }`}>
                    <span className="text-white/35 font-bold text-[12px] shrink-0">RWF</span>
                    <input
                      type="number" value={amountInput} onChange={e => setAmountInput(e.target.value)}
                      placeholder="0" min="0"
                      className="flex-1 bg-transparent text-white text-[20px] font-black font-mono placeholder:text-white/20 outline-none"
                    />
                    {amountValid && enteredAmount > 0 && <Check size={18} className="text-emerald-400 shrink-0" strokeWidth={2.5}/>}
                  </div>
                </Field>

                {allocationNote && enteredAmount >= 100 && (
                  <div className="mt-3 rounded-xl border border-amber-400/25 bg-amber-400/8 px-3.5 py-3 text-[12px] text-amber-100/90 font-semibold leading-snug">
                    {allocationNote}
                  </div>
                )}

                {enteredAmount >= 100 && (
                  <div className="mt-4 grid grid-cols-1 gap-3 fade-in">
                    <SummaryCard label="You pay now" value={`${enteredAmount.toLocaleString()} RWF`} highlight />
                  </div>
                )}

                <NavBtns
                  onBack={() => goStep(3)}
                  onNext={() => { if (amountValid) goStep(5); }}
                  nextLabel="Review & Pay"
                  nextDisabled={!amountValid}
                />
              </div>
            )}

            {/* ── STEP 5: Payer & Checkout ──────────────────────── */}
            {step === 5 && pricingData && amountValid && student && !classMismatch && (
              <div key={stepKey} className="step-in">
                <div className="mb-6">
                  <h2 className="font-black text-white text-[18px] sm:text-[20px] mb-1.5">Confirm and continue</h2>
                  <p className="text-white/45 text-[13px]">Review this payment and continue to choose your payment method.</p>
                </div>

                {/* Payment summary */}
                <div className="p-4 rounded-xl border border-amber-400/25 bg-amber-400/6 mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[11px] font-black uppercase tracking-[.1em] text-amber-400/60">Payment Summary</p>
                    <button type="button" onClick={() => goStep(3)} className="text-[11px] text-amber-400/50 hover:text-amber-400 font-bold transition-colors">Edit</button>
                  </div>
                  <div className="space-y-1.5 text-[13px]">
                    <div className="flex items-center justify-between">
                      <span className="text-white/50 font-semibold">School</span>
                      <span className="text-white font-bold truncate max-w-[60%] text-right">{school?.school_name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white/50 font-semibold">Class / Term</span>
                      <span className="text-white font-bold">{comboLabel(selectedCombo)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white/50 font-semibold">Student</span>
                      <span className="text-white font-bold">{student.first_name} {student.last_name}</span>
                    </div>
                    {remainingOwed != null && (
                      <div className="flex items-center justify-between">
                        <span className="text-white/50 font-semibold">Outstanding before payment</span>
                        <span className="text-white font-bold">{remainingOwed.toLocaleString()} RWF</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-2 mt-1 border-t border-amber-400/15">
                      <span className="text-white font-black">Total to pay</span>
                      <span className="text-amber-400 font-black text-[18px] font-mono">{enteredAmount.toLocaleString()} RWF</span>
                    </div>
                    {remainingAfterCurrentPayment != null && (
                      <div className="flex items-center justify-between">
                        <span className="text-white/50 font-semibold">Outstanding after payment</span>
                        <span className={`font-bold ${remainingAfterCurrentPayment === 0 ? "text-emerald-400" : "text-white"}`}>
                          {remainingAfterCurrentPayment.toLocaleString()} RWF
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {!classMismatch && (balanceLoading || balanceErr || balanceQuote) && (
                  <div className="rounded-xl border border-white/10 bg-white/3 overflow-hidden mb-4">
                    <div className="px-4 py-3 border-b border-white/8 flex items-center gap-2">
                      <CircleDollarSign size={15} className="text-amber-400"/>
                      <span className="text-[11px] font-black uppercase tracking-[.1em] text-white/50">Balance check</span>
                      {balanceLoading && <Loader2 size={13} className="text-amber-400 spin-anim ml-auto"/>}
                    </div>
                    {balanceErr && (
                      <div className="px-4 py-3 text-[12px] text-red-400 font-semibold">{balanceErr}</div>
                    )}
                    {!balanceLoading && balanceQuote && (
                      <div className="p-4 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <SummaryCard label="Paying Now" value={`${enteredAmount.toLocaleString()} RWF`} highlight />
                          <SummaryCard label="Remaining After This Payment" value={`${(remainingAfterCurrentPayment ?? 0).toLocaleString()} RWF`} sub={balanceQuote.term_label} green={remainingAfterCurrentPayment === 0} />
                        </div>
                        {remainingFullDocumentAfterCurrentPayment != null && (
                          <div className="p-3 rounded-xl bg-white/4 border border-white/8 text-[12px]">
                            <span className="text-white/40 font-bold">Outstanding after this payment for this term: </span>
                            <span className="text-white font-black font-mono">{remainingFullDocumentAfterCurrentPayment.toLocaleString()} RWF</span>
                          </div>
                        )}
                        {overpays && (
                          <div className="flex items-start gap-2 p-3 rounded-xl border border-red-400/30 bg-red-400/8 text-[12px] text-red-400 font-semibold">
                            <AlertCircle size={12} className="mt-0.5 shrink-0"/>
                            Amount exceeds remaining balance. Go back and lower the amount.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {payErr && (
                  <div className="flex items-start gap-2.5 p-4 rounded-xl border border-red-400/30 bg-red-400/8 text-red-400 text-[13px] font-semibold mb-4 fade-in">
                    <AlertCircle size={15} className="mt-0.5 shrink-0"/>{payErr}
                  </div>
                )}

                <button type="button" onClick={continueToPayment} disabled={overpays || balanceLoading || classMismatch}
                  className={`w-full flex items-center justify-center gap-2.5 py-4 rounded-xl font-black text-[15px] transition-all min-h-[56px] ${
                    overpays || balanceLoading || classMismatch
                      ? "bg-white/8 text-white/25 cursor-not-allowed"
                      : "bg-amber-400 text-[#000435] hover:bg-amber-300 shadow-2xl shadow-amber-400/25 active:scale-[.98]"
                  }`}>
                  {balanceLoading ? <Loader2 size={18} className="spin-anim"/> : <CreditCard size={18} strokeWidth={2.5}/>}
                  Continue to Payment
                  {!balanceLoading && <ArrowRight size={16}/>}
                </button>

                <div className="flex items-center justify-center gap-2 mt-3 text-[11px] text-white/25 font-semibold">
                  <ShieldCheck size={12}/> Choose MTN MoMo, bank transfer, or card on the next screen
                </div>

                <div className="mt-4 pt-4 border-t border-white/8">
                  <button type="button" onClick={() => goStep(4)} className="text-[12px] text-white/35 hover:text-white/60 font-bold transition-colors flex items-center gap-1.5">
                    <ArrowLeft size={13}/> Back to amount
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Footer link */}
        <div className="text-center mt-6 text-[12px] text-white/30 font-semibold">
          Need a different learner?{" "}
          <button type="button" onClick={() => {
            setCatalog(null); setStudent(null); setTermPick(""); setYearPick(""); setPricingData(null);
            setAmountInput(""); setCatalogErr(""); setComboIndex(0); goStep(1);
          }} className="text-amber-400/70 hover:text-amber-400 transition-colors font-bold">Start over</button>
          {" · "}
          <Link to="/schools" className="text-amber-400/70 hover:text-amber-400 transition-colors font-bold">Browse schools</Link>
        </div>
      </div>

      {/* Image preview overlay */}
      {imgPreview && (
        <div className="fixed inset-0 z-[400] bg-[#000435]/95 backdrop-blur-xl flex items-center justify-center p-4"
          onClick={() => setImgPreview(null)}>
          <button onClick={() => setImgPreview(null)}
            className="absolute top-5 right-5 w-10 h-10 rounded-xl bg-white/8 border border-white/15 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/14 transition-all">
            <X size={18}/>
          </button>
          <img src={imgPreview} alt="" className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}/>
        </div>
      )}
    </div>
  );
}