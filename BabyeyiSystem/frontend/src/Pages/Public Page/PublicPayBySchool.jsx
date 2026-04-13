// ================================================================
// PublicPayBySchool.jsx — Guest pay by school code
// Design: Amber + Dark Blue only, no gradients
// Flow: Select requirements → amount → remaining shown → confirm student → checkout
// ================================================================

import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  GraduationCap,
  Loader2,
  Search,
  ShieldCheck,
  UserRound,
  Wallet,
  X,
  ZoomIn,
} from "lucide-react";

const SERVER = import.meta.env.VITE_API_URL || "http://localhost:5100";
const API = `${SERVER}/api`;

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

function normFeeId(id) {
  const n = Number(id);
  return Number.isFinite(n) ? n : id;
}
function normReqId(id) {
  const n = parseInt(id, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}
function payImgUrl(pathOrUrl) {
  if (!pathOrUrl) return "";
  if (pathOrUrl.startsWith("http")) return pathOrUrl;
  return `${SERVER}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}
function normalizeRwandaMobile(raw) {
  let v = String(raw || "").trim().replace(/[\s\-()]/g, "");
  if (v.startsWith("+250")) v = `0${v.slice(4)}`;
  else if (v.startsWith("250") && v.length === 12) v = `0${v.slice(3)}`;
  if (/^[27]\d{8}$/.test(v)) v = `0${v}`;
  if (/^07[2389]\d{7}$/.test(v)) return v;
  return null;
}
function comboLabel(c) {
  const cls = c.class_name || "—";
  const te  = c.term        != null && String(c.term).trim()          !== "" ? String(c.term).trim()          : "—";
  const yr  = c.academic_year != null && String(c.academic_year).trim() !== "" ? String(c.academic_year).trim() : "—";
  return `${cls} · ${te} · ${yr}`;
}

// ── Shared style helpers ──────────────────────────────────────────
const card = {
  background: "#fff",
  border: `1px solid ${C.db100}`,
  borderRadius: 12,
  padding: "20px 22px",
  marginBottom: 16,
};
const stepNum = (active) => ({
  width: 34, height: 34, borderRadius: 8,
  background: active ? C.am200 : C.db900,
  color: active ? C.db900 : C.am100,
  display: "flex", alignItems: "center", justifyContent: "center",
  fontWeight: 700, fontSize: 14, flexShrink: 0,
});
const inputStyle = (focused) => ({
  width: "100%", padding: "10px 14px",
  border: `1.5px solid ${focused ? C.db400 : C.db100}`,
  borderRadius: 8, fontSize: 14, outline: "none",
  background: "#fff", color: C.db900,
  fontFamily: "inherit",
});
const btnPrimary = {
  display: "inline-flex", alignItems: "center", gap: 8,
  padding: "11px 22px", borderRadius: 8,
  background: C.db900, color: C.am100,
  fontSize: 13, fontWeight: 700, border: "none",
  cursor: "pointer",
};
const btnAmber = {
  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
  padding: "13px 24px", borderRadius: 8,
  background: C.am200, color: C.db900,
  fontSize: 14, fontWeight: 700, border: "none",
  cursor: "pointer", width: "100%",
};
const labelStyle = {
  display: "block", fontSize: 11, fontWeight: 700,
  textTransform: "uppercase", letterSpacing: "0.07em",
  color: C.db600, marginBottom: 5,
};
const sectionLabel = {
  fontSize: 11, fontWeight: 700, textTransform: "uppercase",
  letterSpacing: "0.1em", color: C.am600,
  borderBottom: `2px solid ${C.db900}`, paddingBottom: 6,
  marginBottom: 14, display: "flex", alignItems: "center", gap: 6,
};

export default function PublicPayBySchool() {
  const navigate     = useNavigate();
  const [searchParams] = useSearchParams();
  const classkitIntent =
    searchParams.get("intent") === "classkit" ||
    String(searchParams.get("service") || "").toLowerCase() === "shulekit";

  const [schoolCodeInput, setSchoolCodeInput] = useState("");
  const urlSchoolLoadDone = useRef(false);
  const autoStudentLookupDone = useRef(false);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogErr, setCatalogErr]         = useState("");
  const [catalog, setCatalog]               = useState(null);

  const [comboIndex, setComboIndex]     = useState(0);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [pricingErr, setPricingErr]         = useState("");
  const [pricingData, setPricingData]       = useState(null);
  const [feeSel, setFeeSel]   = useState(() => new Set());
  const [reqSel, setReqSel]   = useState(() => new Set());
  const [imgPreview, setImgPreview] = useState(null);

  // ── Amount entry (new: before student) ───────────────────────
  const [amountInput, setAmountInput]   = useState("");
  const [amountFocus, setAmountFocus]   = useState(false);

  const [studentCode, setStudentCode]   = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupErr, setLookupErr]         = useState("");
  const [student, setStudent]             = useState(null);

  const [payerName, setPayerName]   = useState("");
  const [payerPhone, setPayerPhone] = useState("");
  const [payErr, setPayErr]         = useState("");

  const [balanceQuote, setBalanceQuote]     = useState(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceErr, setBalanceErr]         = useState("");

  const school        = catalog?.school;
  const combinations  = catalog?.combinations || [];
  const selectedCombo = combinations[comboIndex] || null;

  const studentPrefill = useMemo(
    () =>
      (searchParams.get("student_uid") || searchParams.get("student_code") || searchParams.get("uid") || "").trim(),
    [searchParams]
  );

  // ── Prefill + auto-load school catalog from URL (e.g. from landing AI learner modal) ──
  useEffect(() => {
    if (urlSchoolLoadDone.current) return;
    const c = (searchParams.get("code") || searchParams.get("school_code") || "").trim();
    if (!c) return;
    urlSchoolLoadDone.current = true;
    setSchoolCodeInput(c);
    void loadCatalog(c);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per mount when code in URL
  }, [searchParams]);

  // ── Load school catalog ───────────────────────────────────────
  const loadCatalog = async (codeOverride) => {
    const code = String(codeOverride ?? schoolCodeInput).trim();
    if (!code) { setCatalogErr("Enter the school code printed on your invoice."); return; }
    setCatalogLoading(true);
    setCatalogErr("");
    setCatalog(null);
    setPricingData(null);
    setStudent(null);
    setAmountInput("");
    setComboIndex(0);
    try {
      const res  = await fetch(`${API}/public/public-pay/school-catalog`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ school_code: code }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) throw new Error(json.message || "Could not load school.");
      setCatalog(json.data);
      if (!(json.data.combinations || []).length)
        setCatalogErr("This school has no published Babyeyi documents yet. Contact the school office.");
    } catch (e) {
      setCatalogErr(e.message || "Request failed.");
    } finally {
      setCatalogLoading(false);
    }
  };

  // ── Load pricing when combo changes ──────────────────────────
  useEffect(() => {
    if (!school?.id || !selectedCombo?.babyeyi_id) { setPricingData(null); return; }
    let cancelled = false;
    setPricingLoading(true);
    setPricingErr("");
    setPricingData(null);
    setStudent(null);
    setAmountInput("");
    setBalanceQuote(null);
    fetch(`${API}/public/babyeyi-pay/pricing/${selectedCombo.babyeyi_id}?school_id=${encodeURIComponent(school.id)}`)
      .then(r => r.json())
      .then(j => {
        if (cancelled) return;
        if (!j.success) throw new Error(j.message || "Could not load pricing");
        setPricingData(j.data);
        const fees = j.data.school_fees   || [];
        const reqs = j.data.requirements  || [];
        setFeeSel(new Set(fees.map(f => normFeeId(f.id)).filter(x => x !== "" && x != null)));
        setReqSel(new Set(reqs.map(x => normReqId(x.babyeyi_requirement_id)).filter(Boolean)));
      })
      .catch(e => { if (!cancelled) setPricingErr(e.message || "Failed to load fees"); })
      .finally(() => { if (!cancelled) setPricingLoading(false); });
    return () => { cancelled = true; };
  }, [school?.id, selectedCombo?.babyeyi_id]);

  // ── Selected totals ───────────────────────────────────────────
  const feeTotal = useMemo(() => {
    if (!pricingData?.school_fees) return 0;
    return pricingData.school_fees
      .filter(f => feeSel.has(normFeeId(f.id)))
      .reduce((s, f) => s + Number(f.amount || 0), 0);
  }, [pricingData, feeSel]);

  const reqTotal = useMemo(() => {
    if (!pricingData?.requirements) return 0;
    return pricingData.requirements
      .filter(r => { const rid = normReqId(r.babyeyi_requirement_id); return rid != null && reqSel.has(rid); })
      .reduce((s, r) => s + Number(r.line_total_rwf ?? r.price ?? 0), 0);
  }, [pricingData, reqSel]);

  const grand = Math.round((feeTotal + reqTotal) * 100) / 100;

  // ── Amount validation ─────────────────────────────────────────
  const enteredAmount = parseFloat(String(amountInput).replace(/,/g, "")) || 0;
  const amountOverSel = enteredAmount > grand + 1.5;
  const amountValid   = enteredAmount >= 100 && !amountOverSel;

  // ── Student for balance quote ─────────────────────────────────
  const selectedStudentForQuote = useMemo(() => {
    if (!student?.id) return null;
    return {
      student_id:    student.id,
      student_uid:   student.student_uid   || null,
      student_code:  student.student_code  || null,
      sdm_code:      student.sdm_code      || null,
      student_name:  `${student.first_name || ""} ${student.last_name || ""}`.trim(),
      first_name:    student.first_name    || null,
      last_name:     student.last_name     || null,
      class_name:    student.class_name    || null,
      academic_year: student.academic_year || null,
      school_name:   school?.school_name   || null,
    };
  }, [student, school?.school_name]);

  // ── Balance quote (after student confirmed) ───────────────────
  useEffect(() => {
    if (!school?.id || !selectedCombo?.babyeyi_id || !selectedStudentForQuote) {
      setBalanceQuote(null); setBalanceErr(""); return;
    }
    const feeIds = Array.from(feeSel).map(id => normFeeId(id)).filter(n => n !== "" && n != null);
    const reqIds = Array.from(reqSel).map(id => normReqId(id)).filter(Boolean);
    let cancelled = false;
    setBalanceLoading(true);
    setBalanceErr("");
    fetch(`${API}/public/babyeyi-pay/quote-balance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        school_id:                school.id,
        babyeyi_id:               selectedCombo.babyeyi_id,
        selected_fee_ids:         feeIds,
        selected_requirement_ids: reqIds,
        selected_students:        [selectedStudentForQuote],
      }),
    })
      .then(r => r.json())
      .then(j => {
        if (cancelled) return;
        if (!j.success) throw new Error(j.message || "Balance check failed");
        setBalanceQuote(j.data || null);
      })
      .catch(e => {
        if (!cancelled) { setBalanceQuote(null); setBalanceErr(e.message || "Balance check failed"); }
      })
      .finally(() => { if (!cancelled) setBalanceLoading(false); });
    return () => { cancelled = true; };
  }, [school?.id, selectedCombo?.babyeyi_id, selectedStudentForQuote,
      JSON.stringify([...feeSel].sort()), JSON.stringify([...reqSel].sort())]);

  // ── Derived balance values ────────────────────────────────────
  const remainingOwed         = balanceQuote != null ? Number(balanceQuote.remaining_rwf          ?? 0) : null;
  const remainingFullDocument = balanceQuote != null
    ? Number(balanceQuote.remaining_full_document_rwf ?? balanceQuote.remaining_rwf ?? 0) : null;
  const remainingUnselected   = balanceQuote != null
    ? Number(balanceQuote.remaining_unselected_lines_rwf ??
        Math.max(0, (remainingFullDocument ?? 0) - (remainingOwed ?? 0))) : null;
  const selectionListed = balanceQuote != null ? Number(balanceQuote.selection_due_rwf ?? 0) : null;
  const creditedTracked =
    selectionListed != null && remainingOwed != null
      ? Math.max(0, Math.round((selectionListed - remainingOwed) * 100) / 100) : null;
  const afterPayEstimate =
    remainingFullDocument != null
      ? Math.max(0, Math.round((remainingFullDocument - enteredAmount) * 100) / 100) : null;
  const overpays = remainingOwed != null && enteredAmount > remainingOwed + 1.5;

  const classMismatch = useMemo(() => {
    if (!student?.class_name || !pricingData?.babyeyi?.class_name) return false;
    const a = String(student.class_name).trim().toLowerCase().replace(/\s+/g, "");
    const b = String(pricingData.babyeyi.class_name).trim().toLowerCase().replace(/\s+/g, "");
    return a && b && a !== b;
  }, [student, pricingData]);

  const toggleFee = (id) => {
    const fid = normFeeId(id);
    setFeeSel(prev => { const n = new Set(prev); n.has(fid) ? n.delete(fid) : n.add(fid); return n; });
  };
  const toggleReq = (id) => {
    const rid = normReqId(id);
    if (rid == null) return;
    setReqSel(prev => { const n = new Set(prev); n.has(rid) ? n.delete(rid) : n.add(rid); return n; });
  };

  const runStudentLookup = async (codeOverride) => {
    const trimmed = String(codeOverride ?? studentCode).trim();
    if (!trimmed) { setLookupErr("Enter student UID, official code, or SDM ID."); return; }
    if (!school?.school_code || !selectedCombo?.babyeyi_id) return;
    setStudentCode(trimmed);
    setLookupLoading(true);
    setLookupErr("");
    setStudent(null);
    try {
      const res  = await fetch(`${API}/public/public-pay/search-student`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          school_code: school.school_code,
          code:        trimmed,
          babyeyi_id:  selectedCombo.babyeyi_id,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) throw new Error(json.message || "No student matched.");
      setStudent(json.data.student);
    } catch (e) {
      setLookupErr(e.message || "Lookup failed.");
    } finally {
      setLookupLoading(false);
    }
  };

  // ── Auto student lookup when opened from AI modal with ?student_uid= ─────────
  useEffect(() => {
    if (autoStudentLookupDone.current) return;
    if (!studentPrefill) return;
    if (!school?.school_code || !selectedCombo?.babyeyi_id) return;
    if (!pricingData || pricingLoading) return;
    autoStudentLookupDone.current = true;
    void runStudentLookup(studentPrefill);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: one-shot after pricing ready
  }, [studentPrefill, school?.school_code, selectedCombo?.babyeyi_id, pricingData, pricingLoading]);

  const continueToPayment = () => {
    setPayErr("");
    if (!school || !selectedCombo?.babyeyi_id || !pricingData)
      { setPayErr("Load school and class/term first."); return; }
    if (!amountValid)
      { setPayErr("Enter a valid payment amount (min 100 RWF, not exceeding selected total)."); return; }
    if (!student)
      { setPayErr("Find and confirm the student before continuing."); return; }
    if (balanceLoading)
      { setPayErr("Please wait — confirming balance for this student."); return; }
    if (overpays)
      { setPayErr("Amount exceeds remaining balance for this student. Reduce or contact the school."); return; }
    const name    = String(payerName  || "").trim();
    const phoneOk = normalizeRwandaMobile(payerPhone);
    if (!name)    { setPayErr("Enter the payer name (parent or guardian)."); return; }
    if (!phoneOk) { setPayErr("Enter a valid Rwanda mobile number (07XXXXXXXX)."); return; }

    const selectedStudent = {
      student_id:    student.id,
      student_uid:   student.student_uid   || null,
      student_code:  student.student_code  || null,
      sdm_code:      student.sdm_code      || null,
      student_name:  `${student.first_name || ""} ${student.last_name || ""}`.trim(),
      first_name:    student.first_name    || null,
      last_name:     student.last_name     || null,
      class_name:    student.class_name    || null,
      academic_year: student.academic_year || null,
      school_name:   school.school_name    || null,
    };

    const fullDraft = {
      schoolId:       school.id,
      babyeyiId:      selectedCombo.babyeyi_id,
      schoolName:     school.school_name || "",
      schoolSlug:     "",
      docLabel:       comboLabel(selectedCombo),
      grandTotal:     enteredAmount,
      selectedFeeIds: Array.from(feeSel).map(x => normFeeId(x)).filter(n => n !== "" && n != null),
      selectedReqIds: Array.from(reqSel).map(x => normReqId(x)).filter(Boolean),
      pricingSnapshot: pricingData,
      selectedStudent,
      payer:           { name, phone: phoneOk, email: null },
      fromPublicFinder:    true,
      publicPayNoLogin:    true,
      fromPublicSchoolPay: true,
    };
    try { sessionStorage.setItem("babyeyi_pay_draft", JSON.stringify(fullDraft)); } catch (_) {}
    navigate("/payments", { state: fullDraft });
  };

  // ── Step number badge ─────────────────────────────────────────
  const Step = ({ n, active }) => (
    <div style={stepNum(active)}>{n}</div>
  );

  return (
    <div style={{ minHeight: "100vh", background: C.db900, padding: "0 0 60px" }}>

      {/* Top bar */}
      <div style={{
        background: C.db800, borderBottom: `3px solid ${C.am200}`,
        padding: "14px 24px", display: "flex", alignItems: "center",
        justifyContent: "space-between",
      }}>
        <button onClick={() => navigate(-1)} style={{
          display: "flex", alignItems: "center", gap: 6,
          background: "transparent", border: `1px solid ${C.am400}`,
          color: C.am100, padding: "6px 14px", borderRadius: 6,
          fontSize: 13, fontWeight: 600, cursor: "pointer",
        }}>
          <ArrowLeft size={14} /> Back
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: C.am200, fontSize: 12, fontWeight: 700 }}>
          <ShieldCheck size={15} color={C.am200} />
          SECURE PUBLIC CHECKOUT
        </div>
      </div>

      {/* Hero header */}
      <div style={{ background: C.db900, padding: "28px 24px 20px", maxWidth: 720, margin: "0 auto" }}>
        <div style={{
          display: "inline-block", background: C.am200, color: C.db900,
          fontSize: 10, fontWeight: 800, letterSpacing: "0.15em",
          textTransform: "uppercase", padding: "3px 10px", borderRadius: 4, marginBottom: 10,
        }}>
          {classkitIntent ? "ShuleKit / ClassKit" : "Parents & Guardians"}
        </div>
        <h1 style={{ color: "#fff", fontSize: 24, fontWeight: 800, margin: "0 0 8px", lineHeight: 1.2 }}>
          {classkitIntent ? "Pay ClassKit by school code" : "Pay school fees by school code"}
        </h1>
        <p style={{ color: C.db200, fontSize: 14, lineHeight: 1.6, margin: 0, maxWidth: 560 }}>
          Enter your school code, select what to pay, enter the amount, then confirm your child — no account required.
        </p>
      </div>

      {/* Main content */}
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 24px" }}>

        {/* ── STEP 1: School code ────────────────────────────────── */}
        <div style={card}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
            <Step n="1" active={true} />
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.db900 }}>School code</div>
              <div style={{ fontSize: 12, color: C.db600, marginTop: 2 }}>
                The code printed on your Babyeyi invoice or school directory.
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <input
              value={schoolCodeInput}
              onChange={e => setSchoolCodeInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && loadCatalog()}
              placeholder="e.g. 003"
              style={{ ...inputStyle(false), flex: 1 }}
              autoCapitalize="characters"
              autoCorrect="off"
            />
            <button onClick={loadCatalog} disabled={catalogLoading} style={{
              ...btnPrimary,
              opacity: catalogLoading ? 0.6 : 1,
            }}>
              {catalogLoading ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> : <Search size={15} />}
              Find school
            </button>
          </div>
          {catalogErr && (
            <div style={{ marginTop: 10, color: "#c0392b", fontSize: 13, background: "#fdf0ed", border: "1px solid #f5c6c0", borderRadius: 6, padding: "8px 12px" }}>
              {catalogErr}
            </div>
          )}
          {school && (
            <div style={{
              marginTop: 14, display: "flex", alignItems: "center", gap: 10,
              background: C.am50, border: `1px solid ${C.am200}`, borderRadius: 8, padding: "10px 14px",
            }}>
              <Building2 size={18} color={C.am600} />
              <div>
                <div style={{ fontWeight: 700, color: C.db900, fontSize: 14 }}>{school.school_name}</div>
                <div style={{ fontSize: 11, color: C.am800, fontFamily: "monospace", marginTop: 1 }}>Code: {school.school_code}</div>
              </div>
              <CheckCircle2 size={18} color={C.am400} style={{ marginLeft: "auto" }} />
            </div>
          )}
        </div>

        {/* ── STEP 2: Class & Term → Fee/Req selection ──────────── */}
        {school && combinations.length > 0 && (
          <div style={card}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
              <Step n="2" active={!!pricingData} />
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.db900 }}>Class, term & what to pay</div>
                <div style={{ fontSize: 12, color: C.db600, marginTop: 2 }}>Select the Babyeyi document, then check the lines for this payment.</div>
              </div>
            </div>

            <label style={labelStyle}>Select class / term / year</label>
            <select
              value={comboIndex}
              onChange={e => setComboIndex(Number(e.target.value))}
              style={{ ...inputStyle(false), marginBottom: 20 }}
            >
              {combinations.map((c, i) => (
                <option key={`${c.babyeyi_id}-${i}`} value={i}>{comboLabel(c)}</option>
              ))}
            </select>

            {pricingLoading && (
              <div style={{ display: "flex", justifyContent: "center", padding: "30px 0" }}>
                <Loader2 size={32} color={C.am200} style={{ animation: "spin 1s linear infinite" }} />
              </div>
            )}
            {pricingErr && (
              <div style={{ color: "#c0392b", fontSize: 13, background: "#fdf0ed", border: "1px solid #f5c6c0", borderRadius: 6, padding: "8px 12px" }}>
                {pricingErr}
              </div>
            )}

            {!pricingLoading && !pricingErr && pricingData && (
              <>
                {/* School fees */}
                {(pricingData.school_fees || []).length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <div style={sectionLabel}>
                      <Wallet size={13} color={C.am400} /> Tuition & school fees
                    </div>
                    <div style={{ fontSize: 11, color: C.db600, marginBottom: 10 }}>
                      Uncheck lines you are not paying in this transaction.
                    </div>
                    {pricingData.school_fees.map(f => (
                      <div key={f.id} style={{
                        display: "flex", alignItems: "center", gap: 12,
                        padding: "10px 14px", marginBottom: 6,
                        border: `1px solid ${feeSel.has(normFeeId(f.id)) ? C.am200 : C.db100}`,
                        borderRadius: 8,
                        background: feeSel.has(normFeeId(f.id)) ? C.am50 : "#fff",
                        cursor: "pointer",
                        transition: "all 0.15s",
                      }} onClick={() => toggleFee(f.id)}>
                        <input
                          type="checkbox"
                          checked={feeSel.has(normFeeId(f.id))}
                          onChange={() => toggleFee(f.id)}
                          onClick={e => e.stopPropagation()}
                          style={{ width: 16, height: 16, accentColor: C.db800, cursor: "pointer" }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, color: C.db900, fontSize: 13 }}>{f.name || "Fee item"}</div>
                        </div>
                        <div style={{ fontWeight: 800, color: C.am800, fontFamily: "monospace", fontSize: 13 }}>
                          {Number(f.amount || 0).toLocaleString()} RWF
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Requirements */}
                {(pricingData.requirements || []).length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <div style={sectionLabel}>
                      <GraduationCap size={13} color={C.am400} /> Student requirements
                    </div>
                    <div style={{ fontSize: 11, color: C.db600, marginBottom: 10 }}>
                      Unit price × quantity from the school's Babyeyi list.
                    </div>
                    <div style={{ overflowX: "auto", borderRadius: 8, border: `1px solid ${C.db100}` }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 500 }}>
                        <thead>
                          <tr style={{ background: C.db900 }}>
                            <th style={{ width: 36, padding: "8px 10px" }}></th>
                            <th style={{ width: 48, padding: "8px 6px" }}></th>
                            <th style={{ textAlign: "left", padding: "8px 10px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: C.am100 }}>Item</th>
                            <th style={{ textAlign: "right", padding: "8px 10px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: C.am100 }}>Qty</th>
                            <th style={{ textAlign: "right", padding: "8px 10px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: C.am100 }}>Unit</th>
                            <th style={{ textAlign: "right", padding: "8px 10px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: C.am100 }}>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pricingData.requirements.map((r, idx) => {
                            const rid     = normReqId(r.babyeyi_requirement_id);
                            const checked = rid != null && reqSel.has(rid);
                            return (
                              <tr key={r.babyeyi_requirement_id}
                                style={{
                                  background: checked ? C.am50 : idx % 2 === 0 ? "#fff" : C.db50,
                                  cursor: "pointer", borderBottom: `1px solid ${C.db100}`,
                                }}
                                onClick={() => toggleReq(r.babyeyi_requirement_id)}
                              >
                                <td style={{ padding: "9px 10px", textAlign: "center" }}>
                                  <input type="checkbox" checked={checked}
                                    onChange={() => toggleReq(r.babyeyi_requirement_id)}
                                    onClick={e => e.stopPropagation()}
                                    style={{ width: 15, height: 15, accentColor: C.db800, cursor: "pointer" }}
                                  />
                                </td>
                                <td style={{ padding: "9px 6px", textAlign: "center" }}>
                                  {r.catalog_image_url ? (
                                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                      <img src={payImgUrl(r.catalog_image_url)} alt=""
                                        style={{ width: 34, height: 34, objectFit: "contain", borderRadius: 4, border: `1px solid ${C.am100}` }} />
                                      <button type="button"
                                        style={{ padding: 3, border: `1px solid ${C.db200}`, borderRadius: 4, background: "#fff", cursor: "pointer" }}
                                        onClick={e => { e.stopPropagation(); setImgPreview(payImgUrl(r.catalog_image_url)); }}>
                                        <ZoomIn size={12} color={C.db600} />
                                      </button>
                                    </div>
                                  ) : <span style={{ color: C.db200, fontSize: 12 }}>—</span>}
                                </td>
                                <td style={{ padding: "9px 10px" }}>
                                  <div style={{ fontWeight: 600, color: C.db900, fontSize: 13 }}>{r.requirement_name}</div>
                                  {r.description && <div style={{ fontSize: 11, color: C.db600, marginTop: 2 }}>{r.description}</div>}
                                </td>
                                <td style={{ padding: "9px 10px", textAlign: "right", color: C.db600, fontSize: 13 }}>
                                  {r.quantity != null && String(r.quantity).trim() !== "" ? String(r.quantity) : "1"}
                                </td>
                                <td style={{ padding: "9px 10px", textAlign: "right", fontFamily: "monospace", color: C.db600, fontSize: 13 }}>
                                  {Number(r.unit_price_rwf ?? 0).toLocaleString()}
                                </td>
                                <td style={{ padding: "9px 10px", textAlign: "right", fontWeight: 800, color: C.am800, fontFamily: "monospace", fontSize: 13 }}>
                                  {Number(r.line_total_rwf ?? r.price ?? 0).toLocaleString()}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Selected total banner */}
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  background: C.db900, borderRadius: 10, padding: "16px 20px",
                  border: `2px solid ${C.am200}`,
                }}>
                  <span style={{ fontWeight: 700, color: C.am100, fontSize: 14 }}>Selected total</span>
                  <span style={{ fontWeight: 900, color: C.am200, fontSize: 22, fontFamily: "monospace" }}>
                    {grand.toLocaleString()} <span style={{ fontSize: 14, fontWeight: 700 }}>RWF</span>
                  </span>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── STEP 3: Amount to pay ──────────────────────────────── */}
        {pricingData && !pricingLoading && (
          <div style={card}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
              <Step n="3" active={amountValid} />
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.db900 }}>Amount to pay now</div>
                <div style={{ fontSize: 12, color: C.db600, marginTop: 2 }}>
                  Enter how much you are paying. Max is the selected total above.
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Payment amount (RWF)</label>
                <div style={{ position: "relative" }}>
                  <span style={{
                    position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
                    fontSize: 12, fontWeight: 700, color: C.db600, pointerEvents: "none",
                  }}>RWF</span>
                  <input
                    type="number"
                    value={amountInput}
                    onChange={e => setAmountInput(e.target.value)}
                    onFocus={() => setAmountFocus(true)}
                    onBlur={() => setAmountFocus(false)}
                    placeholder="0"
                    min="0"
                    style={{
                      ...inputStyle(amountFocus),
                      paddingLeft: 48,
                      borderColor: amountOverSel ? "#e74c3c" : amountValid ? C.am200 : amountFocus ? C.db400 : C.db100,
                      fontWeight: 700, fontSize: 16, fontFamily: "monospace",
                    }}
                  />
                </div>
                {amountOverSel && (
                  <div style={{ fontSize: 12, color: "#c0392b", marginTop: 5, fontWeight: 600 }}>
                    Amount exceeds selected total ({grand.toLocaleString()} RWF)
                  </div>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 22 }}>
                <button onClick={() => setAmountInput(String(grand))} style={{
                  padding: "8px 14px", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer",
                  background: C.db50, border: `1px solid ${C.db200}`, color: C.db800,
                }}>
                  Full amount
                </button>
                <button onClick={() => setAmountInput(String(Math.round(grand / 2)))} style={{
                  padding: "8px 14px", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer",
                  background: C.am50, border: `1px solid ${C.am200}`, color: C.am800,
                }}>
                  Half
                </button>
              </div>
            </div>

            {/* Amount summary */}
            {enteredAmount >= 100 && (
              <div style={{
                display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 4,
              }}>
                <div style={{
                  background: C.db900, borderRadius: 8, padding: "12px 16px",
                }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: C.am100, marginBottom: 4 }}>You pay now</div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: C.am200, fontFamily: "monospace" }}>
                    {enteredAmount.toLocaleString()} <span style={{ fontSize: 12, fontWeight: 700, color: C.am100 }}>RWF</span>
                  </div>
                </div>
                <div style={{
                  background: C.am50, border: `1px solid ${C.am200}`, borderRadius: 8, padding: "12px 16px",
                }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: C.am800, marginBottom: 4 }}>Balance after payment</div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: C.db900, fontFamily: "monospace" }}>
                    {Math.max(0, grand - enteredAmount).toLocaleString()} <span style={{ fontSize: 12, fontWeight: 700, color: C.db600 }}>RWF</span>
                  </div>
                  <div style={{ fontSize: 11, color: C.am800, marginTop: 3 }}>on selected items</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 4: Confirm student ────────────────────────────── */}
        {pricingData && !pricingLoading && amountValid && (
          <div style={card}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
              <Step n="4" active={!!student} />
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.db900 }}>Confirm student</div>
                <div style={{ fontSize: 12, color: C.db600, marginTop: 2 }}>
                  Search by UID, student code, or SDM ID — only learners at this school shown.
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1, position: "relative" }}>
                <Search size={14} color={C.db400} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)" }} />
                <input
                  value={studentCode}
                  onChange={e => setStudentCode(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && runStudentLookup()}
                  placeholder="Student code or SDM ID"
                  style={{ ...inputStyle(false), paddingLeft: 34 }}
                />
              </div>
              <button onClick={runStudentLookup} disabled={lookupLoading} style={{
                ...btnPrimary, opacity: lookupLoading ? 0.6 : 1,
              }}>
                {lookupLoading ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : "Search"}
              </button>
            </div>
            {lookupErr && (
              <div style={{ marginTop: 8, color: "#c0392b", fontSize: 13 }}>{lookupErr}</div>
            )}

            {student && (
              <div style={{
                marginTop: 14, background: C.db50,
                border: `1px solid ${C.db200}`, borderRadius: 10, padding: "14px 16px",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <UserRound size={16} color={C.db600} />
                  <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: C.db600 }}>Matched learner</span>
                </div>
                <div style={{ fontWeight: 800, fontSize: 16, color: C.db900, marginBottom: 4 }}>
                  {student.first_name} {student.last_name}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: C.db600 }}>
                  <GraduationCap size={13} />
                  Class {student.class_name || "—"} · Year {student.academic_year || "—"}
                </div>
                <div style={{ fontSize: 11, fontFamily: "monospace", color: C.db400, marginTop: 4 }}>
                  UID: {student.student_uid || "—"}
                </div>

                {classMismatch && (
                  <div style={{
                    marginTop: 10, padding: "8px 12px", borderRadius: 6,
                    background: C.am50, border: `1px solid ${C.am200}`,
                    fontSize: 12, color: C.am800, fontWeight: 600,
                  }}>
                    Class mismatch — continue only if this is the correct child and term.
                  </div>
                )}

                {/* ── Balance quote panel ──── */}
                {(balanceLoading || balanceQuote || balanceErr) && (
                  <div style={{
                    marginTop: 14, background: "#fff", border: `1px solid ${C.db200}`,
                    borderRadius: 10, padding: "14px 16px",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                      <CircleDollarSign size={15} color={C.am400} />
                      <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: C.db800 }}>
                        Balance for this student &amp; Babyeyi
                      </span>
                    </div>

                    {balanceErr && <div style={{ fontSize: 13, color: "#c0392b" }}>{balanceErr}</div>}

                    {balanceLoading && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.db600, padding: "6px 0" }}>
                        <Loader2 size={16} color={C.am400} style={{ animation: "spin 1s linear infinite" }} />
                        Calculating outstanding balance…
                      </div>
                    )}

                    {!balanceLoading && balanceQuote && (
                      <>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                          {/* Paying now */}
                          <div style={{ background: C.db900, borderRadius: 8, padding: "10px 14px" }}>
                            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: C.am100, marginBottom: 3 }}>Paying now</div>
                            <div style={{ fontSize: 18, fontWeight: 900, color: C.am200, fontFamily: "monospace" }}>
                              {enteredAmount.toLocaleString()} <span style={{ fontSize: 11 }}>RWF</span>
                            </div>
                          </div>
                          {/* Still owed on checked lines */}
                          <div style={{
                            background: remainingOwed === 0 ? "#f0fdf4" : C.am50,
                            border: `1px solid ${remainingOwed === 0 ? "#bbf7d0" : C.am200}`,
                            borderRadius: 8, padding: "10px 14px",
                          }}>
                            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: remainingOwed === 0 ? "#166534" : C.am800, marginBottom: 3 }}>
                              Still owed (checked lines)
                            </div>
                            <div style={{ fontSize: 18, fontWeight: 900, color: remainingOwed === 0 ? "#15803d" : C.db900, fontFamily: "monospace" }}>
                              {(remainingOwed ?? 0).toLocaleString()} <span style={{ fontSize: 11 }}>RWF</span>
                            </div>
                            {balanceQuote.term_label && (
                              <div style={{ fontSize: 10, color: C.am800, marginTop: 3 }}>{balanceQuote.term_label}</div>
                            )}
                          </div>
                        </div>

                        {/* Whole document remaining */}
                        {remainingFullDocument != null && (
                          <div style={{
                            background: C.db50, border: `1px solid ${C.db200}`,
                            borderRadius: 8, padding: "10px 14px", marginBottom: 10,
                          }}>
                            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: C.db800, marginBottom: 3 }}>
                              Whole Babyeyi document — still owed
                            </div>
                            <div style={{ fontSize: 18, fontWeight: 900, color: C.db900, fontFamily: "monospace" }}>
                              {remainingFullDocument.toLocaleString()} RWF
                            </div>
                            <div style={{ fontSize: 11, color: C.db600, marginTop: 4, lineHeight: 1.5 }}>
                              All tuition fees and requirements on this class/term, including unchecked lines.
                            </div>
                          </div>
                        )}

                        {/* Unchecked lines */}
                        {remainingUnselected != null && remainingUnselected > 0.5 && (
                          <div style={{
                            background: C.am50, border: `1px solid ${C.am200}`,
                            borderRadius: 8, padding: "8px 12px", marginBottom: 10,
                            fontSize: 12, color: C.am800, fontWeight: 600,
                          }}>
                            Not in this payment: {remainingUnselected.toLocaleString()} RWF still owed on unchecked lines
                          </div>
                        )}

                        {/* Stats row */}
                        {selectionListed != null && selectionListed > 0 && (
                          <div style={{
                            display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8,
                            background: C.db50, borderRadius: 8, padding: "10px 12px",
                          }}>
                            <div style={{ textAlign: "center" }}>
                              <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: C.db600, marginBottom: 3 }}>Listed (checked)</div>
                              <div style={{ fontSize: 13, fontWeight: 800, color: C.db900, fontFamily: "monospace" }}>{selectionListed.toLocaleString()}</div>
                            </div>
                            {creditedTracked != null && (
                              <div style={{ textAlign: "center" }}>
                                <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: C.db600, marginBottom: 3 }}>Paid (tracked)</div>
                                <div style={{ fontSize: 13, fontWeight: 800, color: C.am800, fontFamily: "monospace" }}>{creditedTracked.toLocaleString()}</div>
                              </div>
                            )}
                            {afterPayEstimate != null && (
                              <div style={{ textAlign: "center" }}>
                                <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: C.db600, marginBottom: 3 }}>Est. left on doc</div>
                                <div style={{ fontSize: 13, fontWeight: 800, color: C.db800, fontFamily: "monospace" }}>{afterPayEstimate.toLocaleString()}</div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Per-student line breakdown */}
                        {balanceQuote.per_student?.length > 0 && (
                          <details style={{ marginTop: 10 }}>
                            <summary style={{ fontSize: 12, fontWeight: 700, color: C.db800, cursor: "pointer", padding: "4px 0" }}>
                              Per line breakdown
                            </summary>
                            {balanceQuote.per_student.map((row, idx) => (
                              <div key={row.student_key || idx} style={{
                                marginTop: 8, background: "#fff", border: `1px solid ${C.db100}`,
                                borderRadius: 8, padding: "10px 12px",
                              }}>
                                <div style={{ fontWeight: 700, color: C.db900, marginBottom: 6, fontSize: 13 }}>{row.student_name}</div>
                                {(row.lines || []).map(ln => (
                                  <div key={`${ln.kind}-${ln.id}`} style={{
                                    display: "flex", justifyContent: "space-between", alignItems: "center",
                                    padding: "4px 0", borderBottom: `1px solid ${C.db50}`,
                                  }}>
                                    <span style={{ fontSize: 12, color: C.db700 }}>{ln.label}</span>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                      <span style={{ fontSize: 11, color: C.db600, fontFamily: "monospace" }}>
                                        {Number(ln.paid_rwf ?? 0).toLocaleString()} paid
                                      </span>
                                      <span style={{
                                        fontSize: 11, fontWeight: 700, fontFamily: "monospace",
                                        color: ln.remaining_rwf <= 0 ? "#15803d" : C.am800,
                                        background: ln.remaining_rwf <= 0 ? "#f0fdf4" : C.am50,
                                        border: `1px solid ${ln.remaining_rwf <= 0 ? "#bbf7d0" : C.am200}`,
                                        borderRadius: 4, padding: "1px 6px",
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

                        {overpays && (
                          <div style={{
                            marginTop: 10, padding: "8px 12px", borderRadius: 6,
                            background: "#fdf0ed", border: "1px solid #f5c6c0",
                            fontSize: 12, color: "#c0392b", fontWeight: 600,
                          }}>
                            Amount exceeds remaining balance. Reduce your payment amount or uncheck some items.
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── STEP 5: Payer & checkout ───────────────────────────── */}
        {pricingData && amountValid && student && (
          <div style={card}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
              <Step n="5" active={false} />
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.db900 }}>Payer & checkout</div>
                <div style={{ fontSize: 12, color: C.db600, marginTop: 2 }}>Used for mobile money prompts and receipts.</div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>Full name</label>
                <input
                  value={payerName}
                  onChange={e => setPayerName(e.target.value)}
                  placeholder="Parent or guardian"
                  style={inputStyle(false)}
                />
              </div>
              <div>
                <label style={labelStyle}>Telephone number</label>
                <input
                  value={payerPhone}
                  onChange={e => setPayerPhone(e.target.value)}
                  placeholder="07XXXXXXXX"
                  inputMode="tel"
                  style={inputStyle(false)}
                />
              </div>
            </div>

            {payErr && (
              <div style={{
                marginBottom: 14, padding: "10px 14px", borderRadius: 6,
                background: "#fdf0ed", border: "1px solid #f5c6c0", fontSize: 13, color: "#c0392b", fontWeight: 600,
              }}>
                {payErr}
              </div>
            )}

            {!balanceLoading && balanceQuote && overpays && (
              <div style={{
                marginBottom: 14, padding: "10px 14px", borderRadius: 6,
                background: C.am50, border: `1px solid ${C.am200}`,
                fontSize: 12, color: C.am800, fontWeight: 600,
              }}>
                Adjust your selection so the total is not above the remaining balance, or contact the school office.
              </div>
            )}

            {/* Payment summary before CTA */}
            <div style={{
              background: C.db50, border: `1px solid ${C.db200}`, borderRadius: 10,
              padding: "12px 16px", marginBottom: 16,
              display: "grid", gridTemplateColumns: "1fr auto",
              alignItems: "center", gap: 12,
            }}>
              <div>
                <div style={{ fontSize: 12, color: C.db600 }}>
                  {comboLabel(selectedCombo)} · {student.first_name} {student.last_name}
                </div>
                <div style={{ fontSize: 11, color: C.db400, marginTop: 2 }}>
                  {Array.from(feeSel).length + Array.from(reqSel).length} items selected
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: C.db600 }}>Total</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: C.db900, fontFamily: "monospace" }}>
                  {enteredAmount.toLocaleString()} RWF
                </div>
              </div>
            </div>

            <button
              onClick={continueToPayment}
              disabled={overpays || balanceLoading}
              style={{
                ...btnAmber,
                opacity: (overpays || balanceLoading) ? 0.45 : 1,
                cursor: (overpays || balanceLoading) ? "not-allowed" : "pointer",
                fontSize: 15,
              }}
            >
              Continue to payment
              <ChevronRight size={18} />
            </button>

            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              marginTop: 12, fontSize: 11, color: C.db400,
            }}>
              <CreditCard size={13} />
              Choose bank transfer, MTN MoMo, or other methods on the next screen.
            </div>
          </div>
        )}

        <div style={{ textAlign: "center", marginTop: 24, fontSize: 12, color: C.db200 }}>
          Wrong school?{" "}
          <Link to="/schools" style={{ color: C.am200, fontWeight: 700, textDecoration: "none" }}>
            Browse all schools →
          </Link>
        </div>
      </div>

      {/* Image preview overlay */}
      {imgPreview && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 400, background: "rgba(4,44,83,0.95)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
          }}
          onClick={() => setImgPreview(null)}
        >
          <button
            style={{
              position: "absolute", top: 16, right: 16, background: "transparent",
              border: `1px solid ${C.am200}`, color: C.am200, padding: 6, borderRadius: 6, cursor: "pointer",
            }}
            onClick={() => setImgPreview(null)}
          >
            <X size={22} />
          </button>
          <img
            src={imgPreview} alt=""
            style={{ maxWidth: "100%", maxHeight: "90vh", objectFit: "contain", borderRadius: 8 }}
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
      `}</style>
    </div>
  );
}