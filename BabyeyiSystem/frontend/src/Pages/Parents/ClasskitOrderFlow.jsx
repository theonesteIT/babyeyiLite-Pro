// ================================================================
// ClasskitOrderFlow.jsx — Shulekit / Classkit multi-step order (demo)
// ================================================================

import { useState, useMemo, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Home as HomeIcon,
  House,
  BookOpen,
  Check,
  GraduationCap,
  Building2,
  ChevronRight,
  Truck,
  Wallet,
  FileText,
  CheckCircle2,
  Plus,
} from "lucide-react";
import AddChildModal from "../../components/Parents/AddChildModal";
import { useMergedParentChildren } from "../../hooks/useMergedParentChildren";
import { normalizeChildForUi } from "../../utils/parentLocalChildren";
import { useParentShell } from "../../context/ParentShellContext";
import { addParentOrder } from "../../utils/parentOrderHistory";
import { useAuth } from "../../context/AuthContext";

const STEPS = [
  { id: 1, label: "Child" },
  { id: 2, label: "Kit" },
  { id: 3, label: "Delivery" },
  { id: 4, label: "Pay" },
];

const API = import.meta.env.VITE_API_URL || "http://localhost:5100";

const HOME_DELIVERY_FEE = 7000;

function makeFeeId(id) {
  return `fee:${id}`;
}
function makeReqId(id) {
  return `req:${id}`;
}

export default function ClasskitOrderFlow() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { merged, loading, error, refreshLocal } = useMergedParentChildren();
  const { addNotification } = useParentShell();

  const [step, setStep] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [selectedChild, setSelectedChild] = useState(null);
  const [pricingData, setPricingData] = useState(null);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [pricingError, setPricingError] = useState(null);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [delivery, setDelivery] = useState("school");
  const [payment, setPayment] = useState("momo");
  const [childQuery, setChildQuery] = useState("");
  const [draftApplied, setDraftApplied] = useState(false);
  const [matchedFromPublicDraft, setMatchedFromPublicDraft] = useState(false);
  const [quickPreselectApplied, setQuickPreselectApplied] = useState(false);
  const [quickPaySkipApplied, setQuickPaySkipApplied] = useState(false);

  useEffect(() => {
    if (step >= 2 && step <= 4 && !selectedChild) setStep(1);
  }, [step, selectedChild]);

  const childUi = selectedChild ? normalizeChildForUi(selectedChild) : null;
  const gradeLabel =
    pricingData?.student?.class_name ||
    pricingData?.babyeyi?.class_name ||
    childUi?.class_name ||
    childUi?.grade_label ||
    childUi?.displayGrade ||
    "P4";
  const kitTitle = gradeLabel.match(/^P/i)
    ? `Primary ${gradeLabel.replace(/^P/i, "")} Classkit`
    : `${gradeLabel} Classkit`;
  const feeLines = pricingData?.school_fees || [];
  const reqLines = pricingData?.requirements || [];
  const feeSelectedRows = feeLines.filter((f) => selectedItems.has(makeFeeId(f.id)));
  const reqSelectedRows = reqLines.filter((r) => selectedItems.has(makeReqId(r.babyeyi_requirement_id)));
  const subtotal = useMemo(() => {
    const feeTotal = feeSelectedRows.reduce((s, f) => s + Number(f.amount || 0), 0);
    const reqTotal = reqSelectedRows.reduce((s, r) => s + Number(r.line_total_rwf || 0), 0);
    return Math.round((feeTotal + reqTotal) * 100) / 100;
  }, [feeSelectedRows, reqSelectedRows]);
  const deliveryFee = delivery === "home" ? HOME_DELIVERY_FEE : 0;
  const grandTotal = subtotal + deliveryFee;
  const isQuickPayFlow = !!location?.state?.fromQuickPay;
  const filteredChildren = useMemo(() => {
    const q = String(childQuery || "").trim().toLowerCase();
    if (!q) return merged;
    return (merged || []).filter((c) => {
      const u = normalizeChildForUi(c);
      const fullName = `${u.first_name || ""} ${u.last_name || ""}`.trim().toLowerCase();
      const studentId = String(u.student_uid || u.student_id || u.id || "").toLowerCase();
      return fullName.includes(q) || studentId.includes(q);
    });
  }, [merged, childQuery]);

  useEffect(() => {
    if (draftApplied) return;
    if (!Array.isArray(merged) || merged.length === 0) return;
    let draft = null;
    try {
      const raw = sessionStorage.getItem("babyeyi_public_pay_draft");
      if (raw) draft = JSON.parse(raw);
    } catch {
      draft = null;
    }
    if (!draft?.fromPublicFinder) {
      setDraftApplied(true);
      return;
    }
    const wantedClassRaw =
      draft?.pricingSnapshot?.babyeyi?.class_name ||
      (typeof draft?.docLabel === "string" ? draft.docLabel.split("·")[0] : "") ||
      "";
    const wantedClass = String(wantedClassRaw || "").trim().toLowerCase();
    const wantedSchool = String(draft?.schoolName || "").trim().toLowerCase();
    const sameSchool = (c) => {
      if (!wantedSchool) return true;
      const u = normalizeChildForUi(c);
      return String(u.school_name || "").trim().toLowerCase() === wantedSchool;
    };
    const sameClass = (c) => {
      const u = normalizeChildForUi(c);
      return String(u.class_name || u.grade_label || u.displayGrade || "")
        .trim()
        .toLowerCase() === wantedClass;
    };
    const firstPass = merged.find((c) => sameSchool(c) && sameClass(c));
    const fallback = merged.find((c) => sameClass(c));
    const match = firstPass || fallback || null;
    if (match) {
      const u = normalizeChildForUi(match);
      setSelectedChild(match);
      setChildQuery(String(u.class_name || u.grade_label || u.displayGrade || "").trim());
      setMatchedFromPublicDraft(true);
    }
    setDraftApplied(true);
  }, [merged, draftApplied]);

  useEffect(() => {
    if (quickPreselectApplied) return;
    if (!Array.isArray(merged) || merged.length === 0) return;
    let targetId = location?.state?.preselectStudentId || null;
    if (!targetId) {
      try {
        targetId = sessionStorage.getItem("babyeyi_quickpay_selected_student_id") || null;
      } catch {
        targetId = null;
      }
    }
    if (!targetId) {
      setQuickPreselectApplied(true);
      return;
    }
    const match = merged.find((c) => String(c?.id) === String(targetId));
    if (match) {
      setSelectedChild(match);
    }
    try {
      sessionStorage.removeItem("babyeyi_quickpay_selected_student_id");
    } catch {}
    setQuickPreselectApplied(true);
  }, [merged, location?.state, quickPreselectApplied]);

  useEffect(() => {
    if (!isQuickPayFlow) return;
    if (quickPaySkipApplied) return;
    if (!selectedChild || !pricingData) return;
    let draft = null;
    try {
      const raw = sessionStorage.getItem("babyeyi_public_pay_draft");
      if (raw) draft = JSON.parse(raw);
    } catch {
      draft = null;
    }
    if (!draft?.fromPublicFinder) {
      setQuickPaySkipApplied(true);
      return;
    }
    const feeIds = Array.isArray(draft.selectedFeeIds) ? draft.selectedFeeIds : [];
    const reqIds = Array.isArray(draft.selectedReqIds) ? draft.selectedReqIds : [];
    const next = new Set();
    (pricingData.school_fees || []).forEach((f) => {
      if (feeIds.includes(f.id)) next.add(makeFeeId(f.id));
    });
    (pricingData.requirements || []).forEach((r) => {
      if (reqIds.includes(r.babyeyi_requirement_id)) next.add(makeReqId(r.babyeyi_requirement_id));
    });
    if (next.size > 0) setSelectedItems(next);
    setStep(3);
    setQuickPaySkipApplied(true);
  }, [isQuickPayFlow, quickPaySkipApplied, selectedChild, pricingData]);

  const toggleItem = (idKey) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(idKey)) next.delete(idKey);
      else next.add(idKey);
      return next;
    });
  };

  useEffect(() => {
    let cancelled = false;
    const loadPricing = async () => {
      if (!selectedChild) {
        setPricingData(null);
        setSelectedItems(new Set());
        setPricingError(null);
        return;
      }
      const studentId = Number(selectedChild?.id);
      const isSchoolChild = Number.isFinite(studentId) && studentId > 0 && !!selectedChild?.school_id;
      if (!isSchoolChild) {
        setPricingData(null);
        setSelectedItems(new Set());
        setPricingError("This child is local only. Ask the school to register the learner to load class requirements automatically.");
        return;
      }
      setPricingLoading(true);
      setPricingError(null);
      try {
        const res = await fetch(`${API}/api/parent-portal/classkit-pricing?student_id=${encodeURIComponent(studentId)}`, {
          credentials: "include",
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.success) {
          throw new Error(json.message || "Could not load classkit requirements");
        }
        const apiStudentId = Number(json?.data?.student?.id || 0);
        if (!apiStudentId || apiStudentId !== studentId) {
          throw new Error("Loaded classkit does not match selected student. Please refresh and select again.");
        }
        if (cancelled) return;
        const data = {
          babyeyi: json.data?.babyeyi || null,
          school_fees: json.data?.school_fees || [],
          requirements: json.data?.requirements || [],
          totals: json.data?.totals || {},
        };
        setPricingData(data);
        const all = new Set();
        data.school_fees.forEach((f) => all.add(makeFeeId(f.id)));
        data.requirements.forEach((r) => all.add(makeReqId(r.babyeyi_requirement_id)));
        setSelectedItems(all);
      } catch (e) {
        if (!cancelled) {
          setPricingData(null);
          setSelectedItems(new Set());
          setPricingError(e.message || "Failed to load classkit requirements");
        }
      } finally {
        if (!cancelled) setPricingLoading(false);
      }
    };
    loadPricing();
    return () => {
      cancelled = true;
    };
  }, [selectedChild]);

  const goBack = () => {
    if (step <= 1) {
      navigate("/parents/services");
      return;
    }
    setStep((s) => s - 1);
  };

  const completeOrder = () => {
    if (!childUi || !pricingData?.babyeyi || grandTotal <= 0) return;
    const childName = `${childUi.first_name} ${childUi.last_name}`.trim();
    const selectedFeeIds = feeSelectedRows.map((f) => f.id);
    const selectedReqIds = reqSelectedRows.map((r) => r.babyeyi_requirement_id);
    const payer = {
      name: auth.user?.full_name || childName || "Parent",
      phone: auth.user?.parent_phone || null,
      email: auth.user?.email || auth.user?.father_email || auth.user?.mother_email || null,
    };
    const selectedStudent = {
      student_id: childUi.id || null,
      student_name: childName || null,
      first_name: childUi.first_name || null,
      last_name: childUi.last_name || null,
      class_name: childUi.class_name || null,
      academic_year: childUi.academic_year || null,
      school_name: childUi.school_name || pricingData?.student?.school_name || null,
    };
    addParentOrder({
      type: "classkit",
      status: "pending",
      childName,
      kitTitle,
      totalRwf: grandTotal,
      delivery,
      payment,
    });
    addNotification({
      id: `notif-order-${Date.now()}`,
      title: "Classkit order saved",
      body: `${kitTitle} for ${childName} — ${grandTotal.toLocaleString()} RWF (${delivery === "school" ? "school" : "home"} delivery, ${payment === "loan" ? "loan" : "Mobile Money"}).`,
      createdAt: new Date().toISOString(),
    });
    navigate("/payments", {
      state: {
        schoolId: pricingData.babyeyi.school_id,
        babyeyiId: pricingData.babyeyi.id,
        schoolName: childUi.school_name || pricingData?.student?.school_name || "",
        schoolSlug: "",
        docLabel: `${pricingData.babyeyi.class_name || ""} · ${pricingData.babyeyi.term || ""} · ${pricingData.babyeyi.academic_year || ""}`,
        grandTotal,
        selectedFeeIds,
        selectedReqIds,
        pricingSnapshot: pricingData,
        payer,
        selectedStudent,
      },
    });
  };

  const Stepper = () => (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-3 py-4 mb-6">
      <div className="flex items-center justify-between max-w-md mx-auto">
        {STEPS.map((s, idx) => (
          <div key={s.id} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center flex-1 min-w-0">
              <div
                className={[
                  "w-9 h-9 rounded-full flex items-center justify-center text-sm font-extrabold border-2",
                  step > s.id
                    ? "bg-orange-500 border-orange-500 text-white"
                    : step === s.id
                      ? "bg-orange-500 border-orange-500 text-white"
                      : "bg-slate-100 border-slate-200 text-slate-400",
                ].join(" ")}
              >
                {step > s.id ? <Check size={18} strokeWidth={3} /> : s.id}
              </div>
              <span
                className={[
                  "text-[10px] sm:text-xs font-bold mt-1.5 truncate max-w-full px-0.5",
                  step >= s.id ? "text-orange-600" : "text-slate-400",
                ].join(" ")}
              >
                {s.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className={`h-0.5 flex-1 mx-1 min-w-[12px] rounded-full ${step > s.id ? "bg-orange-400" : "bg-slate-200"}`}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const HeaderBar = ({ title, subtitle, icon: Icon = BookOpen }) => (
    <div
      className="-mx-4 sm:-mx-6 px-4 sm:px-6 pt-2 pb-6 mb-4 text-white rounded-b-3xl"
      style={{ background: "linear-gradient(135deg, #ea580c 0%, #f97316 50%, #fb923c 100%)" }}
    >
      <div className="max-w-3xl mx-auto flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={goBack}
            className="shrink-0 mt-0.5 p-2 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20"
            aria-label="Back"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center shrink-0 border border-white/25">
              <Icon className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-extrabold leading-tight">{title}</h1>
              {subtitle && <p className="text-white/85 text-xs sm:text-sm mt-1">{subtitle}</p>}
            </div>
          </div>
        </div>
        <Link
          to="/parents/home"
          className="shrink-0 p-2.5 rounded-full border border-white/35 text-white hover:bg-white/10"
          aria-label="Home"
        >
          <HomeIcon size={22} />
        </Link>
      </div>
    </div>
  );

  return (
    <div className="-mx-4 sm:-mx-6 -mt-2">
      {step === 1 && (
        <HeaderBar
          title="Order Classkit"
          subtitle="Educational supplies for your child's success."
        />
      )}
      {step === 2 && (
        <HeaderBar
          title="Classkit selection"
          subtitle={childUi ? `Educational supplies for ${childUi.first_name} ${childUi.last_name}` : "Review your package"}
        />
      )}
      {step === 3 && (
        <HeaderBar title="Delivery options" subtitle="Choose where to receive the classkit." icon={Truck} />
      )}
      {step === 4 && (
        <HeaderBar title="Payment options" subtitle="Choose how you want to pay." icon={Wallet} />
      )}
      {step === 5 && (
        <HeaderBar title="Order placed" subtitle="Thank you for your order." icon={CheckCircle2} />
      )}

      <div className="px-4 sm:px-6 max-w-3xl mx-auto pb-8">
        {step < 5 && <Stepper />}

        {/* Step 1 — select child */}
        {step === 1 && (
          <>
            {matchedFromPublicDraft && selectedChild && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 mb-3">
                <p className="text-[11px] font-bold text-emerald-700">
                  Matched from Public View &amp; Pay
                </p>
              </div>
            )}
            <div className="rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-3 mb-5">
              <h2 className="font-extrabold text-slate-900 text-sm">Select child for Classkit</h2>
              <p className="text-xs text-amber-900/80 mt-1 leading-relaxed">
                Choose which child needs a classkit. We&apos;ll show available kits for their grade and school.
              </p>
            </div>

            <div className="flex justify-end mb-3">
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                className="inline-flex items-center gap-1.5 text-sm font-bold text-orange-600"
              >
                <Plus size={18} strokeWidth={2.5} />
                Add child
              </button>
            </div>
            <div className="mb-3">
              <input
                type="search"
                value={childQuery}
                onChange={(e) => setChildQuery(e.target.value)}
                placeholder="Search by student ID or name..."
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
              />
            </div>

            {loading && <p className="text-center text-slate-500 py-12">Loading children…</p>}
            {!loading && error && <p className="text-center text-red-600 py-8">{error}</p>}
            {!loading && !error && merged.length === 0 && (
              <div className="rounded-2xl border border-slate-100 bg-white p-10 text-center shadow-sm">
                <p className="font-bold text-slate-800">No learners linked yet</p>
                <p className="text-sm text-slate-500 mt-2 max-w-xs mx-auto">
                  When a school registers a student with your phone, they appear here. You can also add a child manually.
                </p>
                <button
                  type="button"
                  onClick={() => setAddOpen(true)}
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-orange-500 text-white font-bold px-5 py-3"
                >
                  <Plus size={18} />
                  Add child
                </button>
              </div>
            )}

            {!loading && !error && merged.length > 0 && (
              <ul className="space-y-3">
                {filteredChildren.map((c) => {
                  const u = normalizeChildForUi(c);
                  const active = selectedChild?.id === c.id;
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedChild(c)}
                        className={[
                          "w-full flex items-center gap-3 rounded-2xl border p-4 text-left transition-all shadow-sm",
                          active ? "border-orange-500 bg-orange-50/50 ring-2 ring-orange-200" : "border-slate-200 bg-white hover:border-orange-200",
                        ].join(" ")}
                      >
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-extrabold text-lg shrink-0">
                          {(u.first_name || "?")[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-900">
                            {u.first_name} {u.last_name}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-1">
                            Student ID: {u.student_uid || u.student_id || u.id || "—"}
                          </p>
                          <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                            <Building2 size={12} className="shrink-0" />
                            {u.schoolLabel}
                          </p>
                          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <GraduationCap size={12} />
                            {u.displayGrade}
                          </p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-300 shrink-0" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            {!loading && !error && merged.length > 0 && filteredChildren.length === 0 && (
              <div className="rounded-2xl border border-slate-100 bg-white p-6 text-center text-sm text-slate-500">
                No student matches that ID or name.
              </div>
            )}

            <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 mt-6">
              <p className="font-bold text-slate-900 text-sm mb-2">What&apos;s next?</p>
              <ul className="space-y-2 text-xs text-slate-700">
                {["View available classkits for the grade", "Choose payment method", "Select delivery (home or school)", "Complete your order"].map(
                  (t) => (
                    <li key={t} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                      {t}
                    </li>
                  )
                )}
              </ul>
            </div>

            <button
              type="button"
              disabled={!selectedChild}
              onClick={() => setStep(2)}
              className="w-full mt-8 rounded-2xl py-4 font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 shadow-lg shadow-orange-500/25 disabled:opacity-45 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              Continue To Kit
              <ChevronRight size={20} />
            </button>
          </>
        )}

        {/* Step 2 — kit */}
        {step === 2 && childUi && (
          <>
            <div className="rounded-2xl border border-slate-100 bg-white shadow-md p-4 sm:p-5 mb-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-full bg-orange-500 text-white flex items-center justify-center font-extrabold">
                  {(childUi.first_name || "?")[0]}
                </div>
                <div>
                  <p className="font-bold text-slate-900">
                    {childUi.first_name} {childUi.last_name}
                  </p>
                  <p className="text-sm text-slate-500">
                    {childUi.schoolLabel} • {childUi.displayGrade}
                  </p>
                </div>
              </div>
              <div className="flex items-start justify-between gap-2 border-t border-slate-100 pt-4">
                <div className="flex items-start gap-2">
                  <BookOpen className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-extrabold text-slate-900">{kitTitle}</p>
                    <p className="text-xs text-slate-500">
                      {pricingData?.babyeyi
                        ? `Babyeyi ${pricingData.babyeyi.term || ""} · ${pricingData.babyeyi.academic_year || ""}`
                        : `Predetermined package for ${gradeLabel}`}
                    </p>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                  <Check className="w-4 h-4 text-orange-600" strokeWidth={3} />
                </div>
              </div>
              {pricingLoading && <p className="text-sm text-slate-500 mt-4">Loading class requirements...</p>}
              {pricingError && (
                <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {pricingError}
                </div>
              )}
              {!pricingLoading && !pricingError && (
                <>
                  {!!feeLines.length && (
                    <>
                      <p className="text-xs text-slate-500 mt-4 mb-2">School fee items:</p>
                      <ul className="space-y-2">
                        {feeLines.map((item) => {
                          const idKey = makeFeeId(item.id);
                          const on = selectedItems.has(idKey);
                          return (
                            <li key={idKey}>
                              <button
                                type="button"
                                onClick={() => toggleItem(idKey)}
                                className={[
                                  "w-full flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors",
                                  on ? "border-amber-200 bg-amber-50/50" : "border-slate-100 bg-slate-50/80 opacity-70",
                                ].join(" ")}
                              >
                                <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                                  <span
                                    className={[
                                      "w-6 h-6 rounded-full flex items-center justify-center text-xs border-2",
                                      on ? "bg-orange-500 border-orange-500 text-white" : "border-slate-300 text-transparent",
                                    ].join(" ")}
                                  >
                                    {on ? <Check size={14} strokeWidth={3} /> : ""}
                                  </span>
                                  {item.name}
                                </span>
                                <span className="text-sm font-bold text-slate-700 whitespace-nowrap">
                                  {Number(item.amount || 0).toLocaleString()} RWF
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </>
                  )}
                  {!!reqLines.length && (
                    <>
                      <p className="text-xs text-slate-500 mt-4 mb-2">Student requirements:</p>
                      <ul className="space-y-2">
                        {reqLines.map((item) => {
                          const idKey = makeReqId(item.babyeyi_requirement_id);
                          const on = selectedItems.has(idKey);
                          return (
                            <li key={idKey}>
                              <button
                                type="button"
                                onClick={() => toggleItem(idKey)}
                                className={[
                                  "w-full flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors",
                                  on ? "border-amber-200 bg-amber-50/50" : "border-slate-100 bg-slate-50/80 opacity-70",
                                ].join(" ")}
                              >
                                <span className="flex items-center gap-2 text-sm font-semibold text-slate-800 min-w-0">
                                  <span
                                    className={[
                                      "w-6 h-6 rounded-full flex items-center justify-center text-xs border-2 shrink-0",
                                      on ? "bg-orange-500 border-orange-500 text-white" : "border-slate-300 text-transparent",
                                    ].join(" ")}
                                  >
                                    {on ? <Check size={14} strokeWidth={3} /> : ""}
                                  </span>
                                  {item.catalog_image_url && (
                                    <img
                                      src={`${API}${item.catalog_image_url}`}
                                      alt=""
                                      className="w-8 h-8 rounded object-contain border border-amber-100 shrink-0"
                                    />
                                  )}
                                  <span className="truncate">{item.requirement_name}</span>
                                </span>
                                <span className="text-sm font-bold text-slate-700 whitespace-nowrap">
                                  {Number(item.line_total_rwf || 0).toLocaleString()} RWF
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </>
                  )}
                  {!feeLines.length && !reqLines.length && (
                    <p className="text-sm text-slate-500 mt-4">No priced items found for this class yet.</p>
                  )}
                </>
              )}
              <div className="flex items-center justify-between mt-5 pt-4 border-t border-slate-100">
                <span className="font-bold text-slate-700">Total price</span>
                <span className="text-xl font-extrabold text-orange-600">{subtotal.toLocaleString()} RWF</span>
              </div>
            </div>
            <button
              type="button"
              disabled={subtotal === 0 || pricingLoading || !!pricingError}
              onClick={() => setStep(3)}
              className="w-full rounded-2xl py-4 font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 shadow-lg disabled:opacity-45 flex items-center justify-center gap-2"
            >
              Continue To Delivery
              <ChevronRight size={20} />
            </button>
          </>
        )}

        {/* Step 3 — delivery */}
        {step === 3 && childUi && (
          <>
            <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4 mb-5">
              <p className="text-sm font-bold text-slate-700 mb-3">Order summary</p>
              <div className="flex gap-3">
                <div className="w-12 h-12 rounded-xl bg-orange-500 flex items-center justify-center shrink-0">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="font-bold text-slate-900">{kitTitle}</p>
                  <p className="text-xs text-slate-500">
                    For {childUi.first_name} {childUi.last_name} — {childUi.displayGrade}
                  </p>
                  <p className="text-sm font-bold text-orange-600 mt-1">{subtotal.toLocaleString()} RWF</p>
                </div>
              </div>
            </div>

            <p className="text-sm font-bold text-slate-800 mb-3">Select delivery location</p>
            <div className="space-y-3 mb-5">
              <button
                type="button"
                onClick={() => setDelivery("school")}
                className={[
                  "w-full flex items-center gap-3 rounded-2xl border p-4 text-left transition-all",
                  delivery === "school" ? "border-orange-500 bg-orange-50/40 ring-2 ring-orange-200" : "border-slate-100 bg-white",
                ].join(" ")}
              >
                <div className="w-11 h-11 rounded-xl bg-orange-500 flex items-center justify-center shrink-0">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 flex items-center gap-2 flex-wrap">
                    Delivered at school
                    <span className="text-xs font-extrabold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">FREE</span>
                  </p>
                  <p className="text-sm text-slate-500">{childUi.schoolLabel}</p>
                </div>
                {delivery === "school" && <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />}
              </button>
              <button
                type="button"
                onClick={() => setDelivery("home")}
                className={[
                  "w-full flex items-center gap-3 rounded-2xl border p-4 text-left transition-all",
                  delivery === "home" ? "border-orange-500 bg-orange-50/40 ring-2 ring-orange-200" : "border-slate-100 bg-white",
                ].join(" ")}
              >
                <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                  <House className="w-6 h-6 text-amber-800" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900">Home delivery</p>
                  <p className="text-sm font-bold text-orange-600">{HOME_DELIVERY_FEE.toLocaleString()} RWF</p>
                  <p className="text-xs text-slate-500">KG 123 St — Kigali (demo address)</p>
                </div>
                {delivery === "home" && <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />}
              </button>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Location</span>
                <span className="font-semibold text-slate-900">{delivery === "school" ? "School" : "Home"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Address</span>
                <span className="font-semibold text-slate-900 text-right max-w-[60%]">
                  {delivery === "school" ? childUi.schoolLabel : "KG 123 St, Kigali"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Delivery fee</span>
                <span className="font-bold text-orange-600">{deliveryFee === 0 ? "FREE" : `${deliveryFee.toLocaleString()} RWF`}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-amber-200/80">
                <span className="font-bold text-slate-900">Total amount</span>
                <span className="text-xl font-extrabold text-orange-600">{grandTotal.toLocaleString()} RWF</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setStep(4)}
              className="w-full mt-6 rounded-2xl py-4 font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 shadow-lg flex items-center justify-center gap-2"
            >
              Continue To Payment
              <ChevronRight size={20} />
            </button>
          </>
        )}

        {/* Step 4 — payment */}
        {step === 4 && (
          <>
            <p className="text-sm font-semibold text-slate-600 mb-4">Select payment method</p>
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setPayment("momo")}
                className={[
                  "w-full rounded-2xl border p-5 text-left shadow-sm transition-all",
                  payment === "momo" ? "border-orange-500 ring-2 ring-orange-200 bg-orange-50/30" : "border-slate-100 bg-white",
                ].join(" ")}
              >
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-xl bg-orange-500 flex items-center justify-center shrink-0">
                    <Wallet className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-extrabold text-slate-900">Pay full amount now</p>
                    <p className="text-sm text-slate-500 mt-0.5">Complete payment via Mobile Money</p>
                    <span className="inline-block mt-2 text-sm font-bold text-orange-600 bg-orange-100 px-3 py-1 rounded-full">
                      {grandTotal.toLocaleString()} RWF
                    </span>
                    <p className="text-xs text-slate-500 mt-3 flex items-center gap-1">
                      <CheckCircle2 size={14} className="text-emerald-500" /> Immediate processing
                    </p>
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setPayment("loan")}
                className={[
                  "w-full rounded-2xl border p-5 text-left shadow-sm transition-all",
                  payment === "loan" ? "border-orange-500 ring-2 ring-orange-200 bg-orange-50/30" : "border-slate-100 bg-white",
                ].join(" ")}
              >
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-xl bg-orange-500 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-extrabold text-slate-900">Request loan</p>
                    <p className="text-sm text-slate-500 mt-0.5">Apply for financing through KoraLink</p>
                    <span className="inline-block mt-2 text-sm font-bold text-orange-600 bg-orange-100 px-3 py-1 rounded-full">
                      3, 6, or 12-month plans
                    </span>
                    <p className="text-xs text-slate-500 mt-3 flex items-center gap-1">
                      <CheckCircle2 size={14} className="text-emerald-500" /> Fast approval process
                    </p>
                  </div>
                </div>
              </button>
            </div>
            <button
              type="button"
              onClick={completeOrder}
              disabled={grandTotal <= 0 || !pricingData?.babyeyi}
              className="w-full mt-8 rounded-2xl py-4 font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 shadow-lg"
            >
              Continue To Payment
            </button>
          </>
        )}

        {/* Step 5 — success */}
        {step === 5 && (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-9 h-9 text-emerald-600" />
            </div>
            <h2 className="text-xl font-extrabold text-slate-900">Order recorded</h2>
            <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">
              This is a demo flow. When payments go live, you&apos;ll confirm Mobile Money or loan here.
            </p>
            <Link
              to="/parents/home"
              className="inline-flex mt-8 rounded-2xl px-8 py-3 font-bold bg-orange-500 text-white hover:bg-orange-600"
            >
              Back to home
            </Link>
          </div>
        )}
      </div>

      <AddChildModal open={addOpen} onClose={() => setAddOpen(false)} onSaved={refreshLocal} />
    </div>
  );
}
