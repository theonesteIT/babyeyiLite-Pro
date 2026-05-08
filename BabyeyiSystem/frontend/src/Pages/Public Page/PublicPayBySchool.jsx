/**
 * PublicPayBySchool.jsx — Modern Modal Step Wizard
 * #000435 navy + amber · Montserrat font · Tailwind only
 * Beautiful step-by-step modal with smooth transitions
 */

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft, Building2, ChevronRight, CircleDollarSign,
  CreditCard, GraduationCap, Loader2, Search, ShieldCheck,
  Wallet, X, ArrowRight, School, Banknote, Check,
  AlertCircle, ChevronDown, Calendar,
} from "lucide-react";

const SERVER = import.meta.env.VITE_API_URL || "http://localhost:5100";
const API = `${SERVER}/api`;

const FONT = `"Montserrat",sans-serif`;

const FontLoader = () => (
  <style>{`
    @keyframes stepIn{from{opacity:0;transform:translateX(18px)}to{opacity:1;transform:translateX(0)}}
    @keyframes fadeIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
    @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
    .step-in{animation:stepIn .35s cubic-bezier(.22,1,.36,1) both}
    .fade-in{animation:fadeIn .3s cubic-bezier(.22,1,.36,1) both}
    .spin-anim{animation:spin 1s linear infinite}
  `}</style>
);

/* ── helpers ─────────────────────────────────────────────────── */
function normFeeId(id) {
  if (id != null && String(id).startsWith("pasreq:")) return String(id);
  if (id != null && String(id).startsWith("paspay:")) return String(id);
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
  { id: 3, label: "Select Fees", short: "Fees", icon: Wallet },
  { id: 4, label: "Amount", short: "Amount", icon: Banknote },
  { id: 5, label: "Checkout", short: "Pay", icon: CreditCard },
];

function StepIndicator({ current }) {
  return (
    <div className="flex items-center w-full">
      {STEPS.map((s, i) => {
        const done = current > s.id;
        const active = current === s.id;
        return (
          <div key={s.id} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
              <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all duration-300 border-2 ${
                done
                  ? "bg-amber-400 border-amber-400 text-white shadow-md shadow-amber-200"
                  : active
                  ? "bg-white border-amber-400 text-amber-500 shadow-sm"
                  : "bg-white border-gray-200 text-gray-400"
              }`}>
                {done ? <Check size={15} strokeWidth={3}/> : <s.icon size={15}/>}
              </div>
              <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-[.06em] text-center leading-none ${
                done ? "text-amber-500" : active ? "text-[#000435]" : "text-gray-400"
              }`}>{s.short}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="flex-1 h-0.5 mx-1.5 sm:mx-2 rounded-full overflow-hidden bg-gray-200">
                <div className="h-full rounded-full bg-amber-400 transition-all duration-500"
                  style={{ width: done ? "100%" : "0%" }}/>
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
      <label className="block text-[10px] font-black uppercase tracking-[.1em] text-gray-400 mb-2">
        {label}{required && <span className="text-amber-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="flex items-center gap-1.5 text-[11px] text-red-500 font-semibold mt-1.5"><AlertCircle size={11}/>{error}</p>}
      {hint && !error && <p className="text-[11px] text-gray-400 mt-1.5">{hint}</p>}
    </div>
  );
}

function Input({ value, onChange, placeholder, type="text", icon: Icon, onKeyDown, className="" }) {
  const [focused, setFocused] = useState(false);
  return (
    <div className={`flex items-center gap-2.5 rounded-xl border transition-all ${
      focused ? "border-amber-400 bg-amber-50 shadow-sm" : "border-gray-200 bg-white hover:border-gray-300"
    } px-3.5 h-12`}>
      {Icon && <Icon size={15} className={focused ? "text-amber-500" : "text-gray-400"} />}
      <input
        type={type} value={value} onChange={onChange} placeholder={placeholder}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} onKeyDown={onKeyDown}
        className={`flex-1 bg-transparent text-[#000435] text-[14px] font-semibold placeholder:text-gray-400 outline-none ${className}`}
      />
    </div>
  );
}

function Select({ value, onChange, children, disabled = false }) {
  return (
    <div className="relative">
      <select value={value} onChange={onChange} disabled={disabled}
        className={`w-full h-12 rounded-xl border border-gray-200 bg-white text-[#000435] text-[13px] font-bold px-4 outline-none appearance-none transition-all ${
          disabled ? "opacity-50 cursor-not-allowed bg-gray-50" : "hover:border-gray-300 focus:border-amber-400 focus:bg-amber-50 cursor-pointer"
        }`}>
        {children}
      </select>
      <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
    </div>
  );
}

/* ── Summary card ────────────────────────────────────────────── */
function SummaryCard({ label, value, sub, highlight, green }) {
  return (
    <div className={`rounded-xl p-3.5 sm:p-4 border ${
      highlight ? "bg-amber-50 border-amber-200"
      : green ? "bg-emerald-50 border-emerald-200"
      : "bg-gray-50 border-gray-200"
    }`}>
      <p className="text-[9px] font-black uppercase tracking-[.1em] text-gray-400 mb-1">{label}</p>
      <p className={`text-[16px] sm:text-[18px] font-black leading-none ${
        highlight ? "text-amber-500" : green ? "text-emerald-600" : "text-[#000435]"
      }`}>{value}</p>
      {sub && <p className="text-[10px] text-gray-400 mt-1 font-semibold">{sub}</p>}
    </div>
  );
}

/* ── Nav buttons ─────────────────────────────────────────────── */
function NavBtns({ onBack, onNext, nextLabel = "Continue", nextDisabled = false, nextLoading = false, backLabel = "Back" }) {
  return (
    <div className="flex items-center gap-3 pt-5 mt-1 border-t border-gray-100">
      {onBack && (
        <button type="button" onClick={onBack}
          className="flex items-center gap-2 px-4 py-3 rounded-xl border border-gray-200 text-gray-500 font-bold text-[13px] hover:border-gray-300 hover:text-[#000435] transition-all min-h-[48px]">
          <ArrowLeft size={15}/> {backLabel}
        </button>
      )}
      <button type="button" onClick={onNext} disabled={nextDisabled || nextLoading}
        className={`flex-1 sm:flex-none sm:ml-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-black text-[14px] min-h-[48px] transition-all ${
          nextDisabled || nextLoading
            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
            : "bg-[#000435] text-white hover:bg-[#000635] shadow-lg active:scale-[.98]"
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
export default function PublicPayBySchool() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const classkitIntent = searchParams.get("intent") === "classkit" || String(searchParams.get("service") || "").toLowerCase() === "shulekit";
  const urlStudentLoadDone = useRef(false);
  const autoCheckoutTriggered = useRef(false);
  const resumeHandledRef = useRef(false);

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
        setFeeSel(new Set(j.data.school_fees?.map(f => normFeeId(f.id)).filter(x => x !== "" && x != null) || []));
        setReqSel(new Set(j.data.requirements?.map(x => normReqId(x.babyeyi_requirement_id)).filter(Boolean) || []));
      })
      .catch(e => { if (!cancelled) setPricingErr(e.message || "Failed to load fees"); })
      .finally(() => { if (!cancelled) setPricingLoading(false); });
    return () => { cancelled = true; };
  }, [school?.id, selectedCombo?.babyeyi_id]);

  useEffect(() => {
    setPayScope("combined");
  }, [selectedCombo?.babyeyi_id]);

  const schoolCounterCreditsRwf = useMemo(() => {
    const out = {};
    if (!pricingData?.school_fees) return out;
    for (const f of pricingData.school_fees) {
      if (f.pay_source !== "requirement_paid_at_school" && f.pay_source !== "payment_paid_at_school") continue;
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
      const cred =
        f.pay_source === "requirement_paid_at_school" || f.pay_source === "payment_paid_at_school"
          ? (schoolCounterCreditsRwf[key] || 0)
          : 0;
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
    const selectedStudent = { student_id: student.id, student_uid: student.student_uid || null, student_code: student.student_code || null, sdm_code: student.sdm_code || null, student_name: `${student.first_name || ""} ${student.last_name || ""}`.trim(), first_name: student.first_name || null, last_name: student.last_name || null, class_name: student.class_name || null, academic_year: student.academic_year || null, school_name: school.school_name || null };
    const fullDraft = {
      schoolId: school.id,
      babyeyiId: selectedCombo.babyeyi_id,
      term: selectedCombo.term || termPick || null,
      academicYear: selectedCombo.academic_year || yearPick || null,
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
    };
    try { sessionStorage.setItem("babyeyi_pay_draft", JSON.stringify(fullDraft)); } catch (_) {}
    navigate("/payments", { state: fullDraft });
  };

  useEffect(() => {
    if (step !== 5) autoCheckoutTriggered.current = false;
  }, [step]);

  // Restore checkout step from /payments “Back to school checkout” (session draft).
  useEffect(() => {
    if (resumeHandledRef.current) return;
    if (searchParams.get("resumeStep") !== "5") return;
    let d = null;
    try {
      d = JSON.parse(sessionStorage.getItem("babyeyi_pay_draft") || "null");
    } catch {
      return;
    }
    if (!d?.fromPublicSchoolPay || !d.babyeyiId || !combinations.length || !student) return;
    if (Number(d.schoolId) !== Number(school?.id)) return;
    const idx = combinations.findIndex((c) => Number(c.babyeyi_id) === Number(d.babyeyi_id));
    if (idx < 0) return;
    setComboIndex(idx);
    const combo = combinations[idx];
    setTermPick(String(combo.term || "").trim());
    setYearPick(String(combo.academic_year || "").trim());
  }, [combinations, student, school?.id, searchParams]);

  useEffect(() => {
    if (resumeHandledRef.current) return;
    if (searchParams.get("resumeStep") !== "5") return;
    let d = null;
    try {
      d = JSON.parse(sessionStorage.getItem("babyeyi_pay_draft") || "null");
    } catch {
      return;
    }
    if (!d?.fromPublicSchoolPay || !pricingData || !selectedCombo) return;
    if (Number(d.babyeyiId) !== Number(selectedCombo.babyeyi_id)) return;
    if (Number(d.schoolId) !== Number(school?.id)) return;
    setFeeSel(new Set((d.selectedFeeIds || []).map(normFeeId).filter((x) => x != null && x !== "")));
    setReqSel(new Set((d.selectedReqIds || []).map(normReqId).filter(Boolean)));
    setPayScope(d.payScope || "combined");
    setAmountInput(String(d.grandTotal ?? ""));
    if (d.schoolCounterCreditsRwf && typeof d.schoolCounterCreditsRwf === "object") {
      setSchoolCounterPaidByFeeId({ ...d.schoolCounterCreditsRwf });
    }
    autoCheckoutTriggered.current = true;
    setStep(5);
    resumeHandledRef.current = true;
    setSearchParams(
      (prev) => {
        const n = new URLSearchParams(prev);
        n.delete("resumeStep");
        return n;
      },
      { replace: true }
    );
  }, [pricingData, selectedCombo, school?.id, searchParams, setSearchParams]);

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
      !balanceLoading;
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
  ]);

  // ── RENDER ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: FONT }}>
      <FontLoader/>

      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-gray-200 text-gray-600 font-bold text-[12px] hover:bg-gray-50 hover:text-[#000435] transition-all">
            <ArrowLeft size={14}/> Back
          </button>
          <div className="flex items-center gap-2 ml-1">
            <div className="w-8 h-8 rounded-xl bg-amber-400 flex items-center justify-center shadow-sm shadow-amber-200">
              <School size={15} className="text-[#000435]"/>
            </div>
          </div>
          <div className="flex items-center gap-1.5 ml-auto text-[12px] font-bold text-[#000435]">
            <ShieldCheck size={15} className="text-amber-500"/>
            <span className="hidden sm:inline">Secure Checkout</span>
          </div>
        </div>
        <div className="h-[3px] bg-amber-400"/>
      </div>

      {/* Page */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-10">

        {/* Hero heading */}
        <div className="mb-7 sm:mb-8 text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3.5 py-1.5 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"/>
            <span className="text-[10px] font-black uppercase tracking-[.12em] text-amber-600">
              {classkitIntent ? "ClassKit & ShuleKit" : "Parents & Guardians"}
            </span>
          </div>
          <h1 className="font-black text-[#000435] text-[26px] sm:text-[30px] xl:text-[34px] tracking-tight leading-tight mb-2">
            {classkitIntent ? "Pay for SchoolKit" : "Pay school fees by"}&nbsp;
            <span className="text-amber-500">Student code</span>
          </h1>
          <p className="text-gray-400 text-[13px] font-semibold">Quick, secure &amp; easy way to manage school payments</p>
        </div>

        {/* Main card */}
        <div className="rounded-2xl bg-white border border-gray-100 overflow-hidden shadow-lg">

          {/* Step indicator header */}
          <div className="px-5 sm:px-8 py-5 border-b-2 border-amber-400">
            <StepIndicator current={step}/>
          </div>

          {/* Step content area */}
          <div className="px-5 sm:px-8 py-6">

            {/* ── STEP 1: Student code → school + class ──────── */}
            {step === 1 && (
              <div key={stepKey} className="step-in">
                <div className="mb-6">
                  <h2 className="font-black text-[#000435] text-[18px] sm:text-[20px] mb-1">Enter student code</h2>
                </div>

                <Field label="Student Code / UID / SDMS ID" required error={catalogErr}>
                  <div className="flex gap-2.5">
                    <div className="flex-1">
                      <Input value={studentCodeInput} onChange={e => { setStudentCodeInput(e.target.value); setCatalogErr(""); }} placeholder="Official student code or UID" icon={Search} onKeyDown={e => e.key === "Enter" && loadStudentCatalog()}/>
                    </div>
                    <button type="button" onClick={() => loadStudentCatalog()} disabled={catalogLoading}
                      className="flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-400 text-[#000435] font-black text-[13px] hover:bg-amber-300 transition-all disabled:opacity-50 shrink-0 min-h-[48px] shadow-sm">
                      {catalogLoading ? <Loader2 size={15} className="spin-anim"/> : <Search size={15}/>}
                      <span className="hidden sm:inline">Find</span>
                    </button>
                  </div>
                </Field>

                {school && student && (
                  <div className="mt-5 fade-in space-y-3">
                    <div className="flex items-center gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50">
                      <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center shrink-0">
                        <Building2 size={18} className="text-amber-500"/>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-[#000435] text-[15px] truncate">{school.school_name}</p>
                        <p className="text-[11px] font-mono text-amber-600/70 mt-0.5">School code: {school.school_code}</p>
                      </div>
                      <Check size={16} className="text-amber-500 shrink-0" strokeWidth={2.5}/>
                    </div>
                    <div className="flex items-start gap-3 p-4 rounded-xl border border-gray-100 bg-gray-50">
                      <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center font-black text-[13px] text-amber-600 shrink-0">
                        {`${student.first_name || " "}`[0]}{`${student.last_name || " "}`[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-[#000435] text-[15px]">{student.first_name} {student.last_name}</p>
                        <p className="text-[12px] text-gray-400 font-semibold mt-1">
                          Class <span className="text-[#000435]">{student.class_name || "—"}</span>
                          {student.academic_year ? <span className="text-gray-300"> · Record year {student.academic_year}</span> : null}
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
                  <h2 className="font-black text-[#000435] text-[18px] sm:text-[20px] mb-1.5">Term and academic year</h2>
                  <p className="text-gray-400 text-[13px]">
                    Fees are for <span className="text-amber-500 font-bold">{student.class_name || "your class"}</span> at {school.school_name}.
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
                  <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-[12px] text-red-600 font-semibold">
                    No Babyeyi for this class with the selected term and year. Try another combination.
                  </div>
                )}

                <NavBtns
                  onBack={() => goStep(1)}
                  onNext={() => { if (termPick && yearPick && matchingComboIndices.length > 0) goStep(3); }}
                  nextLabel="Continue to Fees"
                  nextDisabled={!termPick || !yearPick || matchingComboIndices.length === 0}
                />
              </div>
            )}

            {/* ── STEP 3: Fees & Requirements ─────────────────── */}
            {step === 3 && school && (
              <div key={stepKey} className="step-in">
                <div className="mb-5">
                  <h2 className="font-black text-[#000435] text-[18px] sm:text-[20px] mb-1">Select what to pay</h2>
                  <p className="text-gray-400 text-[13px]">Choose one or more fee and requirement items. Total updates instantly.</p>
                </div>

                {/* Combo selector */}
                <div className="mb-5 p-3.5 rounded-xl border border-amber-200 bg-amber-50 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-400 flex items-center justify-center shrink-0">
                    <GraduationCap size={15} className="text-[#000435]"/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-[#000435] text-[13px]">{school.school_name}</p>
                    <p className="text-[11px] text-amber-600/70 font-semibold">{selectedCombo ? comboLabel(selectedCombo) : "—"}</p>
                  </div>
                  <button type="button" onClick={() => goStep(2)} className="text-[11px] text-amber-500 hover:text-amber-600 font-bold transition-colors shrink-0">Change</button>
                </div>

                {pricingLoading && (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <div className="w-10 h-10 rounded-xl border border-amber-200 flex items-center justify-center">
                      <Loader2 size={20} className="text-amber-500 spin-anim"/>
                    </div>
                    <p className="text-gray-400 text-[13px] font-semibold">Loading fees…</p>
                  </div>
                )}

                {pricingErr && (
                  <div className="flex items-start gap-2.5 p-4 rounded-xl border border-red-200 bg-red-50 text-red-600 text-[13px] font-semibold">
                    <AlertCircle size={15} className="mt-0.5 shrink-0"/>{pricingErr}
                  </div>
                )}

                {!pricingLoading && !pricingErr && pricingData && (
                  <>
                    {/* School fees */}
                    {(pricingData.school_fees || []).length > 0 && (
                      <div className="mb-4">
                        <p className="text-[10px] font-black uppercase tracking-[.1em] text-gray-400 mb-3 flex items-center gap-2">
                          <Wallet size={12}/> Tuition &amp; Paid at School Items
                        </p>
                        <div className="space-y-2">
                          {pricingData.school_fees.map(f => {
                            const fid = normFeeId(f.id);
                            const selected = feeSel.has(fid);
                            const isPas =
                              f.pay_source === "requirement_paid_at_school" ||
                              f.pay_source === "payment_paid_at_school";
                            const owedLine = Math.round(Number(f.amount || 0) * 100) / 100;
                            return (
                              <div
                                key={String(f.id)}
                                className={`rounded-xl border transition-all ${
                                  selected ? "border-amber-300 bg-amber-50" : "border-gray-100 bg-gray-50 hover:border-gray-200"
                                }`}
                              >
                                <div
                                  role="button"
                                  tabIndex={0}
                                  onClick={() => toggleFee(f.id)}
                                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleFee(f.id); } }}
                                  className="flex items-center gap-3 p-3.5 cursor-pointer"
                                >
                                  <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border-2 transition-all ${
                                    selected ? "bg-amber-400 border-amber-400" : "border-gray-300 bg-white"
                                  }`}>
                                    {selected && <Check size={11} className="text-white" strokeWidth={3}/>}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-semibold text-[#000435] text-[13px]">{f.name || "Fee item"}</span>
                                      {isPas ? (
                                        <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-700 border border-amber-200">Paid at school</span>
                                      ) : null}
                                    </div>
                                    {isPas && f.unit_price_rwf != null ? (
                                      <p className="text-[10px] text-gray-400 mt-1">
                                        {Number(f.unit_price_rwf || 0).toLocaleString()} RWF × {Number(f.quantity_value ?? 1)} = {owedLine.toLocaleString()} RWF
                                      </p>
                                    ) : null}
                                  </div>
                                  <div className="text-right shrink-0">
                                    <span className="font-black text-[13px] font-mono text-amber-500">{owedLine.toLocaleString()} RWF</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="mt-3 p-3.5 rounded-xl border border-amber-200 bg-amber-50 flex items-center justify-between">
                          <p className="text-[12px] font-black text-[#000435]">Total Tuition Fee &amp; Paid At School</p>
                          <p className="font-black text-[16px] font-mono text-amber-500">{feeTotal.toLocaleString()} RWF</p>
                        </div>
                      </div>
                    )}

                    {/* Requirements (selectable) */}
                    {(pricingData.requirements || []).length > 0 && (
                      <div className="mb-5">
                        <p className="text-[10px] font-black uppercase tracking-[.1em] text-gray-400 mb-3 flex items-center gap-2">
                          <GraduationCap size={12}/> Pay via Babyeyi — other requirements
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
                                  selected ? "border-amber-300 bg-amber-50" : "border-gray-100 bg-gray-50 hover:border-gray-200"
                                }`}
                              >
                                <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border-2 transition-all ${
                                  selected ? "bg-amber-400 border-amber-400" : "border-gray-300 bg-white"
                                }`}>
                                  {selected && <Check size={11} className="text-white" strokeWidth={3}/>}
                                </div>
                                {r.catalog_image_url ? (
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setImgPreview(payImgUrl(r.catalog_image_url)); }}
                                    className="w-9 h-9 rounded-lg border border-gray-200 overflow-hidden shrink-0"
                                  >
                                    <img src={payImgUrl(r.catalog_image_url)} alt="" className="w-full h-full object-contain"/>
                                  </button>
                                ) : null}
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-[#000435] text-[13px]">{r.requirement_name}</p>
                                  <p className="text-[10px] text-gray-400 mt-0.5">
                                    {Number(r.unit_price_rwf ?? 0).toLocaleString()} RWF × {Number(r.quantity_value ?? 1)} = {line.toLocaleString()} RWF
                                    {r.quantity != null && String(r.quantity).trim() !== "" ? ` · ${String(r.quantity)}` : ""}
                                  </p>
                                </div>
                                <span className="font-black text-[13px] font-mono text-amber-500 shrink-0">{line.toLocaleString()} RWF</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Grand total */}
                    <div className="p-4 rounded-xl border-2 border-amber-300 bg-amber-50">
                      <div className="flex items-center justify-between">
                        <p className="font-black text-[#000435] text-[15px]">Total due online</p>
                        <p className="font-black text-amber-500 text-[22px] font-mono">{grand.toLocaleString()} <span className="text-[14px]">RWF</span></p>
                      </div>
                      {schoolCounterCreditSum > 0 && (
                        <p className="text-[11px] text-emerald-700 font-semibold mt-2 pt-2 border-t border-amber-200">
                          Including −{schoolCounterCreditSum.toLocaleString()} RWF declared as already paid at school (school-counter items only).
                        </p>
                      )}
                    </div>
                  </>
                )}

                <NavBtns
                  onBack={() => goStep(2)}
                  onNext={() => { if (pricingData && grand > 0) goStep(4); }}
                  nextLabel="Continue"
                  nextDisabled={!pricingData || pricingLoading || !!pricingErr || grand === 0}
                />
              </div>
            )}

            {/* ── STEP 4: Amount ───────────────────────────────── */}
            {step === 4 && pricingData && (
              <div key={stepKey} className="step-in">
                <div className="mb-5">
                  <h2 className="font-black text-[#000435] text-[18px] sm:text-[20px] mb-1.5">Payment amount</h2>
                </div>

                <div className="grid gap-2.5 mb-5">
                  {feeTotal > 0 && (
                    <button
                      type="button"
                      onClick={() => { setPayScope("tuition_school"); setAmountInput(String(Math.round(feeTotal * 100) / 100)); }}
                      className={`text-left rounded-xl border px-4 py-3 transition-all ${
                        payScope === "tuition_school" ? "border-amber-400 bg-amber-50" : "border-gray-200 bg-gray-50 hover:border-gray-300"
                      }`}
                    >
                      <p className="text-[11px] font-black uppercase tracking-[.08em] text-gray-400">Paid at school items</p>
                      <p className="text-[15px] font-black text-amber-500 font-mono mt-0.5">{Math.round(feeTotal * 100) / 100} RWF</p>
                    </button>
                  )}
                  {reqTotal > 0 && (
                    <button
                      type="button"
                      onClick={() => { setPayScope("requirements_online"); setAmountInput(String(Math.round(reqTotal * 100) / 100)); }}
                      className={`text-left rounded-xl border px-4 py-3 transition-all ${
                        payScope === "requirements_online" ? "border-amber-400 bg-amber-50" : "border-gray-200 bg-gray-50 hover:border-gray-300"
                      }`}
                    >
                      <p className="text-[11px] font-black uppercase tracking-[.08em] text-gray-400">Selected Requirements</p>
                      <p className="text-[15px] font-black text-amber-500 font-mono mt-0.5">{Math.round(reqTotal * 100) / 100} RWF</p>
                    </button>
                  )}
                  {grand > 0 && (
                    <button
                      type="button"
                      onClick={() => { setPayScope("combined"); setAmountInput(String(Math.round(grand * 100) / 100)); }}
                      className={`text-left rounded-xl border px-4 py-3 transition-all ${
                        payScope === "combined" ? "border-amber-400 bg-amber-50" : "border-gray-200 bg-gray-50 hover:border-gray-300"
                      }`}
                    >
                      <p className="text-[11px] font-black uppercase tracking-[.08em] text-gray-400">Total of Paid at school items &amp; Selected Requirements</p>
                      <p className="text-[15px] font-black text-amber-500 font-mono mt-0.5">{Math.round(grand * 100) / 100} RWF</p>
                    </button>
                  )}
                </div>

                <Field label="Amount (RWF)" required error={amountOverSel ? `Cannot exceed ${grand.toLocaleString()} RWF (selected items total).` : enteredAmount > 0 && enteredAmount + 1e-6 < minPayAmount ? `Enter at least ${minPayAmount.toLocaleString()} RWF for selected requirements/items.` : ""}>
                  <div className={`flex items-center gap-2.5 rounded-xl border transition-all h-14 px-4 ${
                    amountOverSel ? "border-red-300 bg-red-50"
                    : amountValid && enteredAmount > 0 ? "border-emerald-300 bg-emerald-50"
                    : "border-gray-200 bg-white"
                  }`}>
                    <span className="text-gray-400 font-bold text-[12px] shrink-0">RWF</span>
                    <input
                      type="number" value={amountInput} onChange={e => setAmountInput(e.target.value)}
                      placeholder="0" min="0"
                      className="flex-1 bg-transparent text-[#000435] text-[20px] font-black font-mono placeholder:text-gray-300 outline-none"
                    />
                    {amountValid && enteredAmount > 0 && <Check size={18} className="text-emerald-500 shrink-0" strokeWidth={2.5}/>}
                  </div>
                </Field>

                {allocationNote && enteredAmount >= 100 && (
                  <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-[12px] text-amber-800 font-semibold leading-snug">
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
                  <h2 className="font-black text-[#000435] text-[18px] sm:text-[20px] mb-1.5">Confirm and continue</h2>
                  <p className="text-gray-400 text-[13px]">Review this payment and continue to choose your payment method.</p>
                </div>

                {/* Payment summary */}
                <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[11px] font-black uppercase tracking-[.1em] text-amber-600">Payment Summary</p>
                    <button type="button" onClick={() => goStep(3)} className="text-[11px] text-amber-500 hover:text-amber-600 font-bold transition-colors">Edit</button>
                  </div>
                  <div className="space-y-1.5 text-[13px]">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 font-semibold">School</span>
                      <span className="text-[#000435] font-bold truncate max-w-[60%] text-right">{school?.school_name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 font-semibold">Class / Term</span>
                      <span className="text-[#000435] font-bold">{comboLabel(selectedCombo)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 font-semibold">Student</span>
                      <span className="text-[#000435] font-bold">{student.first_name} {student.last_name}</span>
                    </div>
                    {remainingOwed != null && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 font-semibold">Outstanding before payment</span>
                        <span className="text-[#000435] font-bold">{remainingOwed.toLocaleString()} RWF</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-2 mt-1 border-t border-amber-200">
                      <span className="text-[#000435] font-black">Total to pay</span>
                      <span className="text-amber-500 font-black text-[18px] font-mono">{enteredAmount.toLocaleString()} RWF</span>
                    </div>
                    {remainingAfterCurrentPayment != null && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 font-semibold">Outstanding after payment</span>
                        <span className={`font-bold ${remainingAfterCurrentPayment === 0 ? "text-emerald-600" : "text-[#000435]"}`}>
                          {remainingAfterCurrentPayment.toLocaleString()} RWF
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {!classMismatch && (balanceLoading || balanceErr || balanceQuote) && (
                  <div className="rounded-xl border border-gray-100 bg-gray-50 overflow-hidden mb-4">
                    <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                      <CircleDollarSign size={15} className="text-amber-500"/>
                      <span className="text-[11px] font-black uppercase tracking-[.1em] text-gray-400">Balance check</span>
                      {balanceLoading && <Loader2 size={13} className="text-amber-500 spin-anim ml-auto"/>}
                    </div>
                    {balanceErr && (
                      <div className="px-4 py-3 text-[12px] text-red-500 font-semibold">{balanceErr}</div>
                    )}
                    {!balanceLoading && balanceQuote && (
                      <div className="p-4 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <SummaryCard label="Paying Now" value={`${enteredAmount.toLocaleString()} RWF`} highlight />
                          <SummaryCard label="Remaining After This Payment" value={`${(remainingAfterCurrentPayment ?? 0).toLocaleString()} RWF`} sub={balanceQuote.term_label} green={remainingAfterCurrentPayment === 0} />
                        </div>
                        {remainingFullDocumentAfterCurrentPayment != null && (
                          <div className="p-3 rounded-xl bg-white border border-gray-100 text-[12px]">
                            <span className="text-gray-400 font-bold">Outstanding after this payment for this term: </span>
                            <span className="text-[#000435] font-black font-mono">{remainingFullDocumentAfterCurrentPayment.toLocaleString()} RWF</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {payErr && (
                  <div className="flex items-start gap-2.5 p-4 rounded-xl border border-red-200 bg-red-50 text-red-600 text-[13px] font-semibold mb-4 fade-in">
                    <AlertCircle size={15} className="mt-0.5 shrink-0"/>{payErr}
                  </div>
                )}

                <button type="button" onClick={continueToPayment} disabled={balanceLoading || classMismatch}
                  className={`w-full flex items-center justify-center gap-2.5 py-4 rounded-xl font-black text-[15px] transition-all min-h-[56px] ${
                    balanceLoading || classMismatch
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-[#000435] text-white hover:bg-[#000630] shadow-lg active:scale-[.98]"
                  }`}>
                  {balanceLoading ? <Loader2 size={18} className="spin-anim"/> : <CreditCard size={18} strokeWidth={2.5}/>}
                  Continue to Payment
                  {!balanceLoading && <ArrowRight size={16}/>}
                </button>

                <div className="flex items-center justify-center gap-2 mt-3 text-[11px] text-gray-400 font-semibold">
                  <ShieldCheck size={12}/> Choose MTN MoMo, bank transfer, or card on the next screen
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100">
                  <button type="button" onClick={() => goStep(4)} className="text-[12px] text-gray-400 hover:text-[#000435] font-bold transition-colors flex items-center gap-1.5">
                    <ArrowLeft size={13}/> Back to amount
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Footer link */}
        <div className="text-center mt-6 text-[12px] text-gray-400 font-semibold">
          Need a different learner?{" "}
          <button type="button" onClick={() => {
            setCatalog(null); setStudent(null); setTermPick(""); setYearPick(""); setPricingData(null);
            setAmountInput(""); setCatalogErr(""); setComboIndex(0); goStep(1);
          }} className="text-amber-500 hover:text-amber-600 transition-colors font-bold">Start over</button>
          {" · "}
          <Link to="/schools" className="text-amber-500 hover:text-amber-600 transition-colors font-bold">Browse schools</Link>
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