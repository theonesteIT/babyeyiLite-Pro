/**
 * Dedicated fee-reminder pay page — opened from web push / email links.
 * Shows student details, balance, amount input, and continues to /payments.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  AlertCircle, ArrowLeft, ArrowRight, Bell, CreditCard, Loader2, School, ShieldCheck,
} from "lucide-react";
import PublicPayAmountCard from "../../components/public/PublicPayAmountCard";
import PartialPayPromisePicker from "../../components/public/PartialPayPromisePicker";
import { parseRemainAmount } from "../../utils/publicPayDeepLink";
import { resolvePublicPayTotals } from "../../utils/publicPayTotals";
import { feeSelectionKey, feeCategoryLabel } from "../../utils/publicFeeSelection";
import { linkPublicGuestPushToStudent } from "../../utils/webPushPublicGuest";

const SERVER = import.meta.env.VITE_API_URL || "http://localhost:5100";
const API = `${SERVER}/api`;
const PAY_PATH = "/remainder-student-pay-fees";
const FONT = `"Montserrat",sans-serif`;

function hasBabyeyiId(id) {
  if (id === null || id === undefined || id === "") return false;
  const n = Number(id);
  return Number.isFinite(n) && n >= 0;
}

function comboLabel(c) {
  if (!c) return "—";
  const cls = c.class_name || "—";
  const te = c.term != null && String(c.term).trim() !== "" ? String(c.term).trim() : "—";
  const yr = c.academic_year != null && String(c.academic_year).trim() !== "" ? String(c.academic_year).trim() : "—";
  return `${cls} · ${te} · ${yr}`;
}

const FontLoader = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800;900&display=swap');
    @keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
    @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
    .fade-in{animation:fadeIn .35s cubic-bezier(.22,1,.36,1) both}
    .spin-anim{animation:spin 1s linear infinite}
  `}</style>
);

export default function RemainderStudentPayFess() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const studentCode = useMemo(
    () => (searchParams.get("student_uid") || searchParams.get("student_code") || searchParams.get("code") || "").trim(),
    [searchParams]
  );

  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogErr, setCatalogErr] = useState("");
  const [catalog, setCatalog] = useState(null);
  const [student, setStudent] = useState(null);
  const [termPick, setTermPick] = useState("");
  const [yearPick, setYearPick] = useState("");
  const [comboIndex, setComboIndex] = useState(0);

  const [pricingLoading, setPricingLoading] = useState(false);
  const [pricingErr, setPricingErr] = useState("");
  const [pricingData, setPricingData] = useState(null);
  const [feeSel, setFeeSel] = useState(() => new Set());

  const [amountInput, setAmountInput] = useState("");
  const [promiseDate, setPromiseDate] = useState("");
  const [promiseDateErr, setPromiseDateErr] = useState("");
  const [payErr, setPayErr] = useState("");
  const [balanceQuote, setBalanceQuote] = useState(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceErr, setBalanceErr] = useState("");

  const amountPrefilled = useRef(false);
  const loadStarted = useRef(false);

  const school = catalog?.school;
  const combinations = catalog?.combinations || [];
  const selectedCombo = combinations[comboIndex] || null;

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

  useEffect(() => {
    if (!matchingComboIndices.length) return;
    if (!matchingComboIndices.includes(comboIndex)) setComboIndex(matchingComboIndices[0]);
  }, [matchingComboIndices, comboIndex]);

  const loadStudentCatalog = async (code) => {
    const c = String(code || "").trim();
    if (!c) {
      setCatalogErr(t("publicPay.reminderMissingCode", { defaultValue: "Student code is missing from this reminder link." }));
      return;
    }
    setCatalogLoading(true);
    setCatalogErr("");
    setCatalog(null);
    setPricingData(null);
    setStudent(null);
    setAmountInput("");
    amountPrefilled.current = false;
    try {
      const res = await fetch(`${API}/public/public-pay/student-catalog`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: c }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) throw new Error(json.message || "Could not load student.");
      setCatalog(json.data);
      setStudent(json.data.student);
      const y = searchParams.get("year") || searchParams.get("academic_year") || json.data.default_academic_year;
      const tm = searchParams.get("term") || json.data.default_term;
      if (y) setYearPick(String(y));
      if (tm) setTermPick(String(tm));
      const bid = searchParams.get("babyeyi_id");
      if (bid != null && bid !== "") {
        const idx = (json.data.combinations || []).findIndex((x) => String(x.babyeyi_id) === String(bid));
        if (idx >= 0) setComboIndex(idx);
      }
    } catch (e) {
      setCatalogErr(e.message || "Request failed.");
    } finally {
      setCatalogLoading(false);
    }
  };

  useEffect(() => {
    if (loadStarted.current) return;
    if (!studentCode) {
      setCatalogErr(t("publicPay.reminderMissingCode", { defaultValue: "Student code is missing from this reminder link." }));
      return;
    }
    loadStarted.current = true;
    void loadStudentCatalog(studentCode);
  }, [studentCode, t]);

  useEffect(() => {
    if (!school?.id || !hasBabyeyiId(selectedCombo?.babyeyi_id)) {
      setPricingData(null);
      return;
    }
    let cancelled = false;
    setPricingLoading(true);
    setPricingErr("");
    setPricingData(null);
    setAmountInput("");
    amountPrefilled.current = false;
    fetch(`${API}/public/babyeyi-pay/pricing/${selectedCombo.babyeyi_id}?school_id=${encodeURIComponent(school.id)}`)
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (!j.success) throw new Error(j.message || "Could not load pricing");
        setPricingData(j.data);
        setFeeSel(new Set((j.data.school_fees || []).map((f) => feeSelectionKey(f)).filter((x) => x != null && x !== "")));
      })
      .catch((e) => { if (!cancelled) setPricingErr(e.message || "Failed to load fees"); })
      .finally(() => { if (!cancelled) setPricingLoading(false); });
    return () => { cancelled = true; };
  }, [school?.id, selectedCombo?.babyeyi_id]);

  const feeTotal = useMemo(() => {
    if (!pricingData?.school_fees) return 0;
    return pricingData.school_fees
      .filter((f) => feeSel.has(feeSelectionKey(f)))
      .reduce((s, f) => s + Math.round(Number(f.amount || 0) * 100) / 100, 0);
  }, [pricingData, feeSel]);

  const grand = Math.round(feeTotal * 100) / 100;
  const effectiveFeeIds = useMemo(
    () => Array.from(feeSel).map((x) => feeSelectionKey(x)).filter((x) => x !== "" && x != null),
    [feeSel]
  );

  const selectedFeeLines = useMemo(() => {
    if (!pricingData?.school_fees) return [];
    return pricingData.school_fees
      .filter((f) => feeSel.has(feeSelectionKey(f)))
      .map((f) => ({
        selection_key: feeSelectionKey(f),
        id: f.id,
        name: f.name || "Fee item",
        amount_rwf: Math.round(Number(f.amount || 0) * 100) / 100,
        fee_category: feeCategoryLabel(f),
      }));
  }, [pricingData, feeSel]);

  const selectedStudentForQuote = useMemo(() => {
    if (!student?.id) return null;
    return {
      student_id: student.id,
      student_uid: student.student_uid || null,
      student_code: student.student_code || null,
      sdm_code: student.sdm_code || null,
      student_name: `${student.first_name || ""} ${student.last_name || ""}`.trim(),
      first_name: student.first_name || null,
      last_name: student.last_name || null,
      class_name: student.class_name || null,
      academic_year: student.academic_year || null,
      school_name: school?.school_name || null,
    };
  }, [student, school?.school_name]);

  useEffect(() => {
    if (!school?.id || !hasBabyeyiId(selectedCombo?.babyeyi_id) || !selectedStudentForQuote) {
      setBalanceQuote(null);
      setBalanceErr("");
      return;
    }
    let cancelled = false;
    setBalanceLoading(true);
    setBalanceErr("");
    fetch(`${API}/public/babyeyi-pay/quote-balance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        school_id: school.id,
        babyeyi_id: selectedCombo.babyeyi_id,
        selected_fee_ids: effectiveFeeIds,
        selected_requirement_ids: [],
        selected_students: [selectedStudentForQuote],
        school_counter_credits_rwf: {},
      }),
    })
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (!j.success) throw new Error(j.message || "Balance check failed");
        setBalanceQuote(j.data || null);
      })
      .catch((e) => { if (!cancelled) { setBalanceQuote(null); setBalanceErr(e.message || "Balance check failed"); } })
      .finally(() => { if (!cancelled) setBalanceLoading(false); });
    return () => { cancelled = true; };
  }, [school?.id, selectedCombo?.babyeyi_id, selectedStudentForQuote, JSON.stringify(effectiveFeeIds)]);

  const { totalDue: selectionDueRwF, remainingBalance: remainingOwedDisplay, alreadyPaid: alreadyPaidRwF, payCap } =
    resolvePublicPayTotals({ grand, balanceQuote, optimisticPaidRwF: 0 });

  const enteredAmount = parseFloat(String(amountInput).replace(/,/g, "")) || 0;
  const remainingAfterCurrentPayment = Math.max(0, Math.round((remainingOwedDisplay - enteredAmount) * 100) / 100);
  const minPayAmount = 100;
  const amountOverSel = enteredAmount > payCap + 1.5;
  const isPartialPayment = enteredAmount >= minPayAmount && remainingAfterCurrentPayment > 0.5;
  const promiseDateValid = !isPartialPayment || (promiseDate && promiseDate >= new Date(Date.now() + 86400000).toISOString().slice(0, 10));
  const amountValid = enteredAmount + 1e-6 >= minPayAmount && !amountOverSel && enteredAmount <= payCap + 1.5 && promiseDateValid;
  const amountStepError = amountOverSel ? `Cannot exceed ${payCap.toLocaleString()} RWF remaining balance.` : "";

  useEffect(() => {
    if (!pricingData || balanceLoading || amountPrefilled.current) return;
    const urlRemain = parseRemainAmount(searchParams);
    const fill = payCap > 0 ? payCap : (urlRemain > 0 ? urlRemain : grand);
    if (fill > 0) {
      setAmountInput(String(fill));
      amountPrefilled.current = true;
    }
  }, [pricingData, payCap, grand, balanceLoading, searchParams]);

  const bootstrapping = catalogLoading || pricingLoading || !catalog || !pricingData || !student;

  const continueToPayment = async () => {
    setPayErr("");
    setPromiseDateErr("");
    if (!school || !hasBabyeyiId(selectedCombo?.babyeyi_id) || !pricingData) {
      setPayErr("Load student and fees first.");
      return;
    }
    if (isPartialPayment && !promiseDate) {
      setPromiseDateErr("Choose when you will pay the remaining balance.");
      return;
    }
    if (!amountValid) {
      setPayErr(amountStepError || `Enter at least ${minPayAmount.toLocaleString()} RWF.`);
      return;
    }
    if (!student) {
      setPayErr("Student could not be confirmed.");
      return;
    }
    if (balanceLoading) {
      setPayErr("Please wait — confirming balance.");
      return;
    }

    const selectedStudent = {
      student_id: student.id,
      student_uid: student.student_uid || null,
      student_code: student.student_code || null,
      sdm_code: student.sdm_code || null,
      student_name: `${student.first_name || ""} ${student.last_name || ""}`.trim(),
      first_name: student.first_name || null,
      last_name: student.last_name || null,
      class_name: student.class_name || null,
      academic_year: student.academic_year || null,
      school_name: school.school_name || null,
    };

    let paymentCommitmentId = null;
    if (isPartialPayment && promiseDate) {
      const stCode = student.student_code || student.student_uid || student.sdm_code;
      await linkPublicGuestPushToStudent(stCode);
      try {
        const cRes = await fetch(`${API}/public/babyeyi-pay/payment-commitment`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            school_id: school.id,
            babyeyi_id: selectedCombo.babyeyi_id,
            student_id: student.id,
            student_code: student.student_code || student.student_uid,
            student_name: selectedStudent.student_name,
            class_name: student.class_name || selectedCombo?.class_name,
            academic_year: selectedCombo?.academic_year || yearPick,
            term: selectedCombo?.term || termPick,
            pay_path: PAY_PATH,
            total_due_rwf: selectionDueRwF,
            amount_pay_now_rwf: enteredAmount,
            remaining_rwf: remainingAfterCurrentPayment,
            promise_date: promiseDate,
            selected_fee_ids: effectiveFeeIds,
            selected_requirement_ids: [],
          }),
        });
        const cJson = await cRes.json().catch(() => ({}));
        if (cRes.ok && cJson.success) paymentCommitmentId = cJson.data?.commitment_id;
      } catch { /* non-blocking */ }
    }

    const fullDraft = {
      schoolId: school.id,
      babyeyiId: selectedCombo.babyeyi_id,
      schoolName: school.school_name || "",
      docLabel: comboLabel(selectedCombo),
      grandTotal: enteredAmount,
      selectedFeeIds: effectiveFeeIds,
      selectedFeeLines,
      selectedReqIds: [],
      payScope: "tuition_school",
      schoolCounterCreditsRwf: {},
      pricingSnapshot: pricingData,
      selectedStudent,
      payer: null,
      fromPublicFinder: true,
      publicPayNoLogin: true,
      fromPublicSchoolPay: true,
      fromFeeReminder: true,
      promiseDate: isPartialPayment ? promiseDate : null,
      paymentCommitmentId,
      totalDueRwF: selectionDueRwF,
      remainingAfterPayRwF: remainingAfterCurrentPayment,
    };

    try { sessionStorage.setItem("babyeyi_pay_draft", JSON.stringify(fullDraft)); } catch { /* ignore */ }
    navigate("/payments", { state: fullDraft });
  };

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: FONT }}>
      <FontLoader />

      <div className="sticky top-0 z-20 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-gray-200 text-gray-600 font-bold text-[12px] hover:bg-gray-50 hover:text-[#000435] transition-all"
          >
            <ArrowLeft size={14} /> {t("publicPay.back", { defaultValue: "Back" })}
          </button>
          <div className="w-8 h-8 rounded-xl bg-amber-400 flex items-center justify-center shadow-sm shadow-amber-200">
            <Bell size={15} className="text-[#000435]" />
          </div>
          <div className="flex items-center gap-1.5 ml-auto text-[12px] font-bold text-[#000435]">
            <ShieldCheck size={15} className="text-amber-500" />
            <span className="hidden sm:inline">{t("publicPay.secureCheckout", { defaultValue: "Secure Checkout" })}</span>
          </div>
        </div>
        <div className="h-[3px] bg-amber-400" />
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <div className="mb-7 text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3.5 py-1.5 mb-4">
            <Bell size={12} className="text-amber-600" />
            <span className="text-[10px] font-black uppercase tracking-[.12em] text-amber-600">
              {t("publicPay.feeReminderBadge", { defaultValue: "Fee Reminder" })}
            </span>
          </div>
          <h1 className="font-black text-[#000435] text-[24px] sm:text-[28px] tracking-tight leading-tight mb-2">
            {t("publicPay.feeReminderTitle", { defaultValue: "Fee Reminder — Continue Paying" })}
          </h1>
          <p className="text-gray-400 text-[13px] font-semibold max-w-md mx-auto">
            {t("publicPay.feeReminderSub", { defaultValue: "Your student details and balance are below. Confirm the amount and continue to payment." })}
          </p>
        </div>

        <div className="rounded-2xl bg-white border border-gray-100 overflow-hidden shadow-lg fade-in">
          <div className="px-5 sm:px-8 py-6">
            {bootstrapping && (
              <div className="flex flex-col items-center justify-center py-14 gap-3">
                <Loader2 size={28} className="text-amber-500 spin-anim" />
                <p className="text-[14px] font-black text-[#000435]">
                  {t("publicPay.loadingReminder", { defaultValue: "Loading your fee reminder…" })}
                </p>
              </div>
            )}

            {!bootstrapping && catalogErr && (
              <div className="space-y-4">
                <div className="flex items-start gap-2.5 p-4 rounded-xl border border-red-200 bg-red-50 text-red-600 text-[13px] font-semibold">
                  <AlertCircle size={15} className="mt-0.5 shrink-0" />{catalogErr}
                </div>
                <Link
                  to="/paid-at-school"
                  className="inline-flex items-center gap-2 text-[13px] font-bold text-amber-600 hover:text-amber-700"
                >
                  <School size={14} /> {t("publicPay.payManually", { defaultValue: "Pay school fees manually" })}
                </Link>
              </div>
            )}

            {!bootstrapping && !catalogErr && pricingData && student && (
              <>
                <PublicPayAmountCard
                  student={student}
                  school={school}
                  selectedCombo={selectedCombo}
                  comboLabel={comboLabel}
                  totalDue={selectionDueRwF}
                  alreadyPaid={alreadyPaidRwF}
                  remainingBalance={remainingOwedDisplay}
                  enteredAmount={enteredAmount}
                  amountInput={amountInput}
                  setAmountInput={(v) => { setAmountInput(v); setPromiseDateErr(""); setPayErr(""); }}
                  amountValid={amountValid}
                  amountError={amountStepError}
                  balanceLoading={balanceLoading}
                  payCap={payCap}
                  onPayFullRemaining={() => setAmountInput(String(payCap > 0 ? payCap : grand))}
                  cardTitle={t("publicPay.feeReminderCard", { defaultValue: "School Fees Reminder" })}
                  showPushOptIn={false}
                />

                <PartialPayPromisePicker
                  remainingAfterPay={remainingAfterCurrentPayment}
                  promiseDate={promiseDate}
                  setPromiseDate={(v) => { setPromiseDate(v); setPromiseDateErr(""); }}
                  error={promiseDateErr}
                />

                {balanceErr ? (
                  <p className="mt-3 text-[12px] text-red-500 font-semibold">{balanceErr}</p>
                ) : null}

                {payErr ? (
                  <div className="mt-3 flex items-start gap-2.5 p-3 rounded-xl border border-red-200 bg-red-50 text-red-600 text-[12px] font-semibold">
                    <AlertCircle size={14} className="mt-0.5 shrink-0" />{payErr}
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={() => void continueToPayment()}
                  disabled={!amountValid || balanceLoading}
                  className={`mt-5 w-full flex items-center justify-center gap-2.5 py-4 rounded-xl font-black text-[15px] transition-all min-h-[56px] ${
                    !amountValid || balanceLoading
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-[#000435] text-white hover:bg-[#000630] shadow-lg active:scale-[.98]"
                  }`}
                >
                  {balanceLoading ? <Loader2 size={18} className="spin-anim" /> : <CreditCard size={18} strokeWidth={2.5} />}
                  {t("publicPay.continueToPayment", { defaultValue: "Continue to Payment" })}
                  {!balanceLoading && <ArrowRight size={16} />}
                </button>

                <p className="text-center mt-3 text-[11px] text-gray-400 font-semibold">
                  {t("publicPay.remainAfterPayHint", {
                    defaultValue: "Remaining after this payment: {{amount}} RWF",
                    amount: remainingAfterCurrentPayment.toLocaleString(),
                  })}
                </p>
              </>
            )}
          </div>
        </div>

        <div className="text-center mt-6 text-[12px] text-gray-400 font-semibold">
          <Link to="/paid-at-school" className="text-amber-500 hover:text-amber-600 font-bold transition-colors">
            {t("publicPay.fullPayWizard", { defaultValue: "Open full pay wizard" })}
          </Link>
        </div>
      </div>
    </div>
  );
}
