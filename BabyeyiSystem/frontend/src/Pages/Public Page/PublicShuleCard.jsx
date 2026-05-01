import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CreditCard, Loader2, School, Search, UserRound, Wallet } from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://localhost:5100";
const SHULECARD_TOPUP_DRAFT_KEY = "babyeyi_shulecard_topup_draft";
const QUICK_AMOUNTS = [1000, 5000, 10000, 20000, 50000];
const rwf = (v) => `${Number(v || 0).toLocaleString()} RWF`;

function normalizeRwandaPhone(raw) {
  const digits = String(raw || "").replace(/\D/g, "");
  if (digits.startsWith("250") && digits.length === 12) return `0${digits.slice(3)}`;
  if (digits.length === 9 && /^[72]\d{8}$/.test(digits)) return `0${digits}`;
  if (digits.length === 10 && /^0[72]\d{8}$/.test(digits)) return digits;
  return String(raw || "").trim();
}

export default function PublicShuleCard() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1 search, 2 amount, 3 payer, 4 review
  const [mode, setMode] = useState("code");
  const [code, setCode] = useState("");
  const [studentNameSearch, setStudentNameSearch] = useState("");
  const [schoolCode, setSchoolCode] = useState("");
  const [student, setStudent] = useState(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupErr, setLookupErr] = useState("");
  const [amount, setAmount] = useState("");
  const [payerName, setPayerName] = useState("");
  const [payerPhone, setPayerPhone] = useState("");
  const [note, setNote] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitErr, setSubmitErr] = useState("");
  const amountNum = useMemo(() => Math.floor(Number(amount || 0)), [amount]);

  const fetchIntentSeed = async (row) => {
    const lookupCode = String(row?.student_code || row?.sdm_code || row?.student_uid || "").trim();
    if (!lookupCode) return null;
    const res = await fetch(`${API}/api/public/public-pay/student-catalog`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: lookupCode }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.success === false || !json.data) return null;
    const combinations = Array.isArray(json.data.combinations) ? json.data.combinations : [];
    const preferred = combinations[0];
    if (!preferred?.babyeyi_id || !json.data?.school?.id) return null;
    return {
      schoolId: Number(json.data.school.id),
      babyeyiId: Number(preferred.babyeyi_id),
      academicYear: preferred.academic_year || json.data.default_academic_year || row?.academic_year || null,
      term: preferred.term || json.data.default_term || null,
    };
  };

  const lookupStudent = async () => {
    setLookupErr("");
    setStudent(null);
    setLookupLoading(true);
    try {
      let row = null;
      if (mode === "code") {
        const trimmed = code.trim();
        if (!trimmed) throw new Error("Enter student code or SDMIS code.");
        const res = await fetch(`${API}/api/public/student-code-lookup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: trimmed }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || json.success === false || !json.found || !json.data) throw new Error(json.message || "Student not found.");
        row = json.data;
      } else {
        const name = studentNameSearch.trim();
        const sc = schoolCode.trim();
        if (!name || !sc) throw new Error("Enter student name and school code.");
        const res = await fetch(`${API}/api/public/public-pay/search-student`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ student_name: name, school_code: sc }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || json.success === false || !json.data?.student) throw new Error(json.message || "Student not found in this school.");
        const st = json.data.student;
        row = { id: st.id, school_name: json.data.school?.school_name, school_code: json.data.school?.school_code, student_uid: st.student_uid, student_code: st.student_code, sdm_code: st.sdm_code, first_name: st.first_name, last_name: st.last_name, class_name: st.class_name, academic_year: st.academic_year };
      }
      const intentSeed = await fetchIntentSeed(row);
      setStudent({ ...row, intentSeed });
      setStep(2);
    } catch (e) {
      setLookupErr(e.message || "Lookup failed.");
    } finally {
      setLookupLoading(false);
    }
  };

  const goReview = () => {
    setSubmitErr("");
    if (!Number.isFinite(amountNum) || amountNum < 500 || amountNum > 5000000) return setSubmitErr("Amount must be 500 - 5,000,000 RWF.");
    if (!String(payerName || "").trim()) return setSubmitErr("Payer name is required.");
    if (!String(payerPhone || "").trim()) return setSubmitErr("Payer phone number is required.");
    setStep(4);
  };

  const payWithMtn = () => {
    setSubmitErr("");
    const seed = student?.intentSeed;
    if (!seed?.schoolId || !seed?.babyeyiId) return setSubmitErr("Unable to prepare payment context.");
    const studentFullName = `${student?.first_name || ""} ${student?.last_name || ""}`.trim() || "Student";
    const selectedStudent = { student_id: Number(student.id || 0), student_name: studentFullName, student_uid: student.student_uid || null, student_code: student.student_code || null, sdm_code: student.sdm_code || null, class_name: student.class_name || null, academic_year: seed.academicYear || student.academic_year || null, school_name: student.school_name || null };
    const draftTopup = { student_id: Number(student.id || 0), student_name: studentFullName, amount_rwf: amountNum, payment_method: "momo", note: note.trim(), payer_name: String(payerName || "").trim(), payer_phone: normalizeRwandaPhone(payerPhone), source: "public_shulecard_review_flow", created_at: new Date().toISOString() };
    try { sessionStorage.setItem(SHULECARD_TOPUP_DRAFT_KEY, JSON.stringify(draftTopup)); } catch {}
    navigate("/payments", {
      state: {
        schoolId: seed.schoolId,
        babyeyiId: seed.babyeyiId,
        schoolName: student.school_name || "Babyeyi",
        docLabel: "ShuleCard Top-Up (Public MoMo)",
        grandTotal: amountNum,
        academicYear: seed.academicYear || null,
        term: seed.term || null,
        selectedFeeIds: [],
        selectedReqIds: [],
        selectedStudent,
        selectedStudents: [selectedStudent],
        payer: { name: String(payerName || "").trim(), phone: normalizeRwandaPhone(payerPhone) },
        publicPayNoLogin: true,
        fromPublicFinder: true,
        shulecardTopupPublicFallback: true,
        forcePayMethod: "momo",
      },
    });
  };

  return (
    <div className="min-h-screen bg-[#000435] text-white py-8 px-4">
      <div className="max-w-xl mx-auto">
        <button type="button" onClick={() => navigate("/services")} className="inline-flex items-center gap-2 text-xs font-bold text-white/80 hover:text-white mb-5"><ArrowLeft size={14} /> Back to Services</button>
        <div className="rounded-3xl border border-white/10 bg-white/[0.05] backdrop-blur-xl shadow-2xl p-5 sm:p-7">
          <div className="flex items-center gap-3 mb-5"><div className="w-11 h-11 rounded-2xl bg-amber-400/20 flex items-center justify-center"><Wallet className="w-5 h-5 text-amber-300" /></div><div><p className="text-xs uppercase tracking-widest text-amber-300 font-black">ShuleCard</p><h1 className="text-xl font-black">Student card top-up</h1></div></div>
          <p className="text-xs text-white/65 mb-4">Step {step} of 4</p>

          {step === 1 && <section className="space-y-4">
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/10 p-1 bg-white/[0.03]">
              <button type="button" onClick={() => setMode("code")} className={`rounded-lg py-2 text-sm font-bold ${mode === "code" ? "bg-amber-400 text-[#000435]" : "text-white/70"}`}>Code / SDMIS</button>
              <button type="button" onClick={() => setMode("name")} className={`rounded-lg py-2 text-sm font-bold ${mode === "name" ? "bg-amber-400 text-[#000435]" : "text-white/70"}`}>Name + School</button>
            </div>
            {mode === "code" ? <div><label className="text-xs font-bold text-white/60 uppercase">Student code or SDMIS code</label><div className="relative mt-1.5"><Search className="w-4 h-4 text-white/35 absolute left-3 top-1/2 -translate-y-1/2" /><input value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => e.key === "Enter" && lookupStudent()} className="w-full rounded-xl border border-white/15 bg-white/[0.07] pl-9 pr-3 py-3 text-sm outline-none focus:border-amber-400/60" /></div></div> : <div className="space-y-3"><div><label className="text-xs font-bold text-white/60 uppercase">Student name</label><input value={studentNameSearch} onChange={(e) => setStudentNameSearch(e.target.value)} className="mt-1.5 w-full rounded-xl border border-white/15 bg-white/[0.07] px-3 py-3 text-sm outline-none focus:border-amber-400/60" /></div><div><label className="text-xs font-bold text-white/60 uppercase">School code</label><input value={schoolCode} onChange={(e) => setSchoolCode(e.target.value)} onKeyDown={(e) => e.key === "Enter" && lookupStudent()} className="mt-1.5 w-full rounded-xl border border-white/15 bg-white/[0.07] px-3 py-3 text-sm outline-none focus:border-amber-400/60" /></div></div>}
            {lookupErr && <p className="text-sm text-red-300">{lookupErr}</p>}
            <button type="button" onClick={lookupStudent} disabled={lookupLoading} className="w-full rounded-xl bg-amber-400 text-[#000435] py-3 font-black text-sm disabled:opacity-55 flex items-center justify-center gap-2">{lookupLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}Find student</button>
          </section>}

          {step === 2 && student && <section className="space-y-4">
            <div className="rounded-2xl border border-emerald-300/35 bg-emerald-500/10 p-4"><p className="font-black text-white flex items-center gap-2"><UserRound className="w-4 h-4 text-emerald-300" />{student.first_name} {student.last_name}</p><p className="text-xs text-white/70 mt-1 flex items-center gap-2"><School className="w-4 h-4" />{student.school_name || "School"} ({student.school_code || "N/A"})</p></div>
            <div><label className="text-xs font-bold text-white/60 uppercase">Top-up amount (RWF)</label><input type="number" min={500} value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1.5 w-full rounded-xl border border-white/15 bg-white/[0.07] px-3 py-3 text-sm outline-none focus:border-amber-400/60" /></div>
            <div className="flex flex-wrap gap-2">{QUICK_AMOUNTS.map((v) => <button key={v} type="button" onClick={() => setAmount(String(v))} className="rounded-full border border-white/20 px-3 py-1.5 text-xs font-bold text-white/90">+{v.toLocaleString()}</button>)}</div>
            <div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => setStep(1)} className="rounded-xl border border-white/20 py-3 text-sm font-bold text-white/85">Back</button><button type="button" disabled={!amountNum} onClick={() => setStep(3)} className="rounded-xl bg-amber-400 text-[#000435] py-3 font-black text-sm disabled:opacity-55">Continue</button></div>
          </section>}

          {step === 3 && student && <section className="space-y-4">
            <div className="rounded-2xl border border-white/10 p-4 bg-white/[0.03]"><p className="font-black flex items-center gap-2 mb-2"><CreditCard className="w-4 h-4 text-amber-300" />Payment details</p><p className="text-sm text-white/85">Student: {student.first_name} {student.last_name}</p><p className="text-sm text-white/85">Amount: <span className="font-black text-amber-300">{rwf(amountNum)}</span></p></div>
            <div><label className="text-xs font-bold text-white/60 uppercase">Payer name</label><input value={payerName} onChange={(e) => setPayerName(e.target.value)} className="mt-1.5 w-full rounded-xl border border-white/15 bg-white/[0.07] px-3 py-3 text-sm outline-none" /></div>
            <div><label className="text-xs font-bold text-white/60 uppercase">Payer phone number</label><input value={payerPhone} onChange={(e) => setPayerPhone(e.target.value)} className="mt-1.5 w-full rounded-xl border border-white/15 bg-white/[0.07] px-3 py-3 text-sm outline-none" placeholder="07XXXXXXXX" /></div>
            <div><label className="text-xs font-bold text-white/60 uppercase">Note (optional)</label><textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} className="mt-1.5 w-full rounded-xl border border-white/15 bg-white/[0.07] px-3 py-3 text-sm outline-none" /></div>
            {submitErr && <p className="text-sm text-red-300">{submitErr}</p>}
            <div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => setStep(2)} className="rounded-xl border border-white/20 py-3 text-sm font-bold text-white/85">Back</button><button type="button" onClick={goReview} className="rounded-xl bg-amber-400 text-[#000435] py-3 font-black text-sm">Review & Pay</button></div>
          </section>}

          {step === 4 && student && <section className="space-y-4">
            <div className="rounded-2xl border border-white/10 p-4 bg-white/[0.03]"><p className="font-black flex items-center gap-2 mb-2"><CreditCard className="w-4 h-4 text-amber-300" />Review</p><p className="text-sm text-white/85">Student: {student.first_name} {student.last_name}</p><p className="text-sm text-white/85">Amount: <span className="font-black text-amber-300">{rwf(amountNum)}</span></p><p className="text-sm text-white/85">Payer: {payerName}</p><p className="text-sm text-white/85">Phone: {normalizeRwandaPhone(payerPhone)}</p>{note ? <p className="text-sm text-white/75">Note: {note}</p> : null}</div>
            {submitErr && <p className="text-sm text-red-300">{submitErr}</p>}
            <div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => setStep(3)} className="rounded-xl border border-white/20 py-3 text-sm font-bold text-white/85">Back</button><button type="button" onClick={payWithMtn} disabled={submitLoading} className="rounded-xl bg-amber-400 text-[#000435] py-3 font-black text-sm disabled:opacity-55 flex items-center justify-center gap-2">{submitLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}Pay (MTN MoMo)</button></div>
          </section>}
        </div>
      </div>
    </div>
  );
}
