import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  CreditCard, Eye, Gauge, Home, Loader2, Plus, Wallet,
  X, ChevronRight, Shield, Sparkles, ArrowUpRight, Check, GraduationCap, BookOpen, Filter
} from "lucide-react";
import AddChildModal from "../../components/Parents/AddChildModal";

const API = import.meta.env.VITE_API_URL || "http://localhost:5100";
const PRESET_TOPUPS = [1000, 5000, 10000, 20000, 50000];
const LIMIT_MIN = 500;
const LIMIT_MAX = 200000;

function rwf(v) {
  return `${Number(v || 0).toLocaleString()} RWF`;
}

function Overlay({ onClose }) {
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-40 bg-slate-950/75 backdrop-blur-xl"
    />
  );
}

function Modal({ onClose, children, title, subtitle }) {
  return (
    <>
      <Overlay onClose={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-xl overflow-hidden rounded-[28px] bg-white shadow-[0_24px_80px_rgba(0,4,53,0.28)]">
          <div className="space-y-6 px-8 py-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-950">{title}</h2>
                {subtitle && <p className="mt-2 text-sm text-slate-500">{subtitle}</p>}
              </div>
              <button
                onClick={onClose}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition hover:bg-slate-200"
              >
                <X size={18} />
              </button>
            </div>
            {children}
          </div>
        </div>
      </div>
    </>
  );
}

function PrimaryBtn({ onClick, disabled, children, fullWidth = true }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-4 text-sm font-extrabold text-white transition ${
        disabled
          ? "cursor-not-allowed bg-amber-400/70 shadow-none"
          : "bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/20 hover:-translate-y-0.5"
      } ${fullWidth ? "w-full" : "w-auto"}`}
    >
      {children}
    </button>
  );
}

function GhostBtn({ onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
    >
      {children}
    </button>
  );
}

function Field({ label, children }) {
  return (
    <label className="block space-y-3">
      <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</span>
      {children}
    </label>
  );
}

const inputClasses =
  "w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-200/70";

function TopupModal({ student, onClose, onContinue }) {
  const [topupAmount, setTopupAmount] = useState("10000");
  const [paymentMethod, setPaymentMethod] = useState("momo");
  const [note, setNote] = useState("");
  const topupValue = Math.max(0, Math.floor(Number(topupAmount || 0)));

  return (
    <Modal onClose={onClose} title="Fund Account" subtitle={`Top up ${student?.first_name}'s Shulecard`}>
      <div className="rounded-3xl bg-slate-950 p-6 text-white shadow-xl shadow-slate-950/20">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">Amount to fund</p>
        <p className="mt-3 text-4xl font-black">
          {topupValue.toLocaleString()} <span className="text-base font-semibold text-slate-300">RWF</span>
        </p>
      </div>

      <div className="space-y-6">
        <Field label="Custom Amount (RWF)">
          <input
            type="number"
            min={500}
            value={topupAmount}
            onChange={(e) => setTopupAmount(e.target.value)}
            className={inputClasses}
          />
        </Field>

        <div className="flex flex-wrap gap-3">
          {PRESET_TOPUPS.map((p) => {
            const active = topupValue === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => setTopupAmount(String(p))}
                className={`rounded-full border px-4 py-2 text-sm font-bold transition ${
                  active
                    ? "border-amber-300 bg-amber-100 text-amber-700"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                }`}
              >
                +{p.toLocaleString()}
              </button>
            );
          })}
        </div>

        <Field label="Payment Method">
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className={`${inputClasses} appearance-none`}
          >
            <option value="momo">📱 Mobile Money (MoMo)</option>
            <option value="wallet">👜 Babyeyi Wallet</option>
            <option value="card">💳 Bank Card</option>
          </select>
        </Field>

        <Field label="Note (optional)">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="e.g. Lunch money for the week"
            className={`${inputClasses} resize-none leading-6`}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
          <GhostBtn onClick={onClose}>Cancel</GhostBtn>
          <PrimaryBtn onClick={() => onContinue(topupValue, paymentMethod, note)}>
            <CreditCard size={18} /> Continue to Payment
          </PrimaryBtn>
        </div>
      </div>
    </Modal>
  );
}

function LimitModal({ student, currentLimit, onClose, onSave, busy }) {
  const [limitDraft, setLimitDraft] = useState(String(Math.floor(Number(currentLimit || 5000))));
  const n = Math.min(LIMIT_MAX, Math.max(LIMIT_MIN, Number(limitDraft) || LIMIT_MIN));
  const pct = ((n - LIMIT_MIN) / (LIMIT_MAX - LIMIT_MIN)) * 100;

  return (
    <Modal onClose={onClose} title="Daily Spending Limit" subtitle={`Control ${student?.first_name}'s daily spending`}>
      <div className="rounded-3xl bg-slate-50 p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Limit</span>
          <span className="text-2xl font-black text-slate-950">
            {n.toLocaleString()} <span className="text-sm font-semibold text-slate-500">RWF</span>
          </span>
        </div>

        <div className="mt-4 overflow-hidden rounded-full bg-slate-200">
          <div className="h-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-600" style={{ width: `${pct}%` }} />
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
          <span>{rwf(LIMIT_MIN)}</span>
          <span>{rwf(LIMIT_MAX)}</span>
        </div>
      </div>

      <div className="space-y-6 mt-6">
        <Field label="Daily Limit Amount (RWF)">
          <input
            type="number"
            min={LIMIT_MIN}
            max={LIMIT_MAX}
            step={500}
            value={limitDraft}
            onChange={(e) => setLimitDraft(e.target.value)}
            className={inputClasses}
          />
        </Field>

        <input
          type="range"
          min={LIMIT_MIN}
          max={LIMIT_MAX}
          step={500}
          value={n}
          onChange={(e) => setLimitDraft(e.target.value)}
          className="w-full accent-amber-500"
        />

        <div className="grid gap-3 sm:grid-cols-3">
          {[2000, 5000, 10000, 20000, 50000, 100000].map((v) => {
            const active = Number(limitDraft) === v;
            return (
              <button
                key={v}
                type="button"
                onClick={() => setLimitDraft(String(v))}
                className={`rounded-2xl border px-3 py-2 text-sm font-bold transition ${
                  active
                    ? "border-amber-300 bg-amber-100 text-amber-800"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                }`}
              >
                {`${(v / 1000).toFixed(0)}K`}
              </button>
            );
          })}
        </div>

        <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
          <GhostBtn onClick={onClose}>Cancel</GhostBtn>
          <PrimaryBtn onClick={() => onSave(limitDraft)} disabled={busy}>
            {busy ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
            {busy ? "Saving…" : "Save Limit"}
          </PrimaryBtn>
        </div>
      </div>
    </Modal>
  );
}

export default function Shulecard() {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showTopup, setShowTopup] = useState(false);
  const [showLimit, setShowLimit] = useState(false);
  const [busyLimit, setBusyLimit] = useState(false);
  const [msg, setMsg] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [markFilterOptions, setMarkFilterOptions] = useState(null);
  const [markYear, setMarkYear] = useState("");
  const [markTerm, setMarkTerm] = useState("");
  const [markFiltersExplicit, setMarkFiltersExplicit] = useState(false);
  const [academicData, setAcademicData] = useState(null);
  const [loadingAcademics, setLoadingAcademics] = useState(false);

  const selectedWallet = selectedStudent?.wallet || { balance_rwf: 0, daily_limit_rwf: 5000 };
  const canViewFinancials = selectedStudent?.can_view_financials ?? selectedStudent?.access_type === "FULL";
  const canSetLimit = selectedStudent?.can_set_daily_limit ?? selectedStudent?.access_type === "FULL";

  const loadStudents = async () => {
    setLoadingStudents(true);
    try {
      const res = await fetch(`${API}/api/parent-portal/shulecard/students`, { credentials: "include" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) throw new Error(json.message || "Could not load students");
      setStudents(Array.isArray(json.data) ? json.data : []);
    } catch (e) {
      setMsg({ type: "err", text: e.message || "Network error loading students" });
      setStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  };

  useEffect(() => { loadStudents(); }, []);
  useEffect(() => { if (!selectedStudent && students.length > 0) setSelectedStudent(students[0]); }, [students, selectedStudent]);

  const studentRef = selectedStudent
    ? (selectedStudent.student_code || selectedStudent.student_uid || selectedStudent.id)
    : null;

  const markTermOptions = useMemo(() => {
    const all = markFilterOptions?.terms || [];
    if (!markYear) return all;
    return markFilterOptions?.terms_by_year?.[markYear] || all;
  }, [markFilterOptions, markYear]);

  useEffect(() => {
    if (!studentRef) {
      setMarkFilterOptions(null);
      setAcademicData(null);
      return undefined;
    }
    let ignore = false;
    (async () => {
      try {
        const fRes = await fetch(
          `${API}/api/parent-portal/student-details/filters?student_ref=${encodeURIComponent(studentRef)}`,
          { credentials: "include" },
        );
        const fJson = await fRes.json().catch(() => ({}));
        if (ignore || !fRes.ok || !fJson.success) return;
        setMarkFilterOptions(fJson.data || null);
        setMarkYear(fJson.data?.current_academic_year || "");
        setMarkTerm(fJson.data?.current_term || "");
        setMarkFiltersExplicit(false);
      } catch {
        if (!ignore) setMarkFilterOptions(null);
      }
    })();
    return () => { ignore = true; };
  }, [studentRef]);

  useEffect(() => {
    if (!studentRef) return undefined;
    let ignore = false;
    (async () => {
      setLoadingAcademics(true);
      try {
        const q = new URLSearchParams({ student_ref: String(studentRef) });
        if (markFiltersExplicit) {
          q.set("academic_year", markYear);
          q.set("term", markTerm);
        }
        const aRes = await fetch(
          `${API}/api/parent-portal/student-details/academics?${q.toString()}`,
          { credentials: "include" },
        );
        const aJson = await aRes.json().catch(() => ({}));
        if (!ignore && aRes.ok && aJson.success) {
          setAcademicData(aJson.data || null);
        }
      } catch {
        if (!ignore) setAcademicData(null);
      } finally {
        if (!ignore) setLoadingAcademics(false);
      }
    })();
    return () => { ignore = true; };
  }, [studentRef, markYear, markTerm, markFiltersExplicit]);

  const academicsSummary = academicData
    ? {
        average_percent: academicData.overall_gpa_percent,
        assessment_count: academicData.assessment_count,
        latest: (academicData.latest_by_subject || academicData.assessments || []).slice(0, 3).map((m) => ({
          subject: m.subject || m.subject_name,
          percent: m.percent ?? m.average_percent,
          assessment_name: m.assessment_name || m.latest_assessment,
          teacher_name: m.teacher_name,
        })),
      }
    : selectedStudent?.academics;

  const goToPaymentsForTopup = (topupValue, paymentMethod, note) => {
    if (!selectedStudent?.id) return;
    if (topupValue < 500 || topupValue > 5_000_000) {
      setMsg({ type: "err", text: "Top-up amount must be between 500 and 5,000,000 RWF." });
      return;
    }

    try {
      sessionStorage.setItem("babyeyi_shulecard_topup_draft", JSON.stringify({
        student_id: selectedStudent.id,
        student_name: `${selectedStudent.first_name || ""} ${selectedStudent.last_name || ""}`.trim(),
        amount_rwf: topupValue,
        payment_method: paymentMethod,
        note,
        source: "parents_shulecard",
        created_at: new Date().toISOString(),
      }));
    } catch {
      // ignore storage failures
    }

    setShowTopup(false);
    navigate("/payments", {
      state: {
        shulecardTopup: true,
        topupAmountRwf: topupValue,
        student: {
          id: selectedStudent.id,
          name: `${selectedStudent.first_name || ""} ${selectedStudent.last_name || ""}`.trim(),
        },
      },
    });
  };

  const submitLimit = async (limitDraft) => {
    if (!selectedStudent?.id) return;
    const n = Math.floor(Number(limitDraft || 0));
    if (n < LIMIT_MIN || n > LIMIT_MAX) {
      setMsg({ type: "err", text: `Daily limit must be between ${rwf(LIMIT_MIN)} and ${rwf(LIMIT_MAX)}.` });
      return;
    }

    setBusyLimit(true);
    setMsg(null);
    try {
      const res = await fetch(`${API}/api/parent-portal/shulecard/daily-limit`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_id: selectedStudent.id, daily_limit_rwf: n }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) throw new Error(json.message || "Could not save daily limit");
      setMsg({ type: "ok", text: `Daily limit updated to ${rwf(n)}.` });
      setShowLimit(false);
      await loadStudents();
    } catch (e) {
      setMsg({ type: "err", text: e.message || "Could not save daily limit" });
    } finally {
      setBusyLimit(false);
    }
  };

  return (
    <div className="min-h-screen text-slate-950">
      <div className="relative overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="w-full">
                <h1 className="mt-2 text-3xl font-extrabold text-slate-700 sm:text-4xl text-center sm:text-left">ShuleCard</h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto">
        {msg && (
          <div className={`mb-6 flex items-center justify-between gap-4 rounded-3xl border px-5 py-4 text-sm font-bold ${
            msg.type === "ok"
              ? "border-emerald-200/70 bg-emerald-50 text-emerald-800"
              : "border-rose-200/70 bg-rose-50 text-rose-800"
          }`}>
            <span>{msg.text}</span>
            <button onClick={() => setMsg(null)} className="rounded-full p-2 transition hover:bg-slate-100">
              <X size={16} />
            </button>
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-[360px_1fr]">
          <section>
            <div className="mb-6 flex items-center justify-between gap-4">
              <h2 className="text-lg font-extrabold text-slate-950">Your Children</h2>
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-bold bg-amber-500 transition hover:bg-amber-600"
              >
                <Plus size={15} /> Add Child
              </button>
            </div>

            <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
              {loadingStudents ? (
                <div className="space-y-3 p-8 text-center text-slate-400">
                  <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                    <Loader2 size={28} className="animate-spin text-slate-500" />
                  </div>
                  <p className="text-sm font-semibold">Loading students…</p>
                </div>
              ) : students.length === 0 ? (
                <div className="space-y-3 p-8 text-center text-slate-400">
                  <Sparkles size={32} className="mx-auto text-slate-300" />
                  <p className="text-sm font-semibold text-slate-800">No children added yet</p>
                  <p className="text-sm">Tap "Add Child" to get started.</p>
                </div>
              ) : (
                students.map((s) => {
                  const isSelected = selectedStudent?.id === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSelectedStudent(s)}
                      className={`w-full border-b border-slate-200 px-5 py-4 text-left transition ${
                        isSelected ? "bg-amber-50" : "bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className={`flex h-12 w-12 items-center justify-center rounded-3xl text-lg font-black ${
                            isSelected ? "bg-gradient-to-br from-amber-500 to-orange-600 text-white" : "bg-slate-100 text-slate-500"
                          }`}>
                            {(s.first_name || "S").slice(0, 1).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-base font-bold text-slate-950">{s.first_name} {s.last_name}</p>
                            <p className="truncate text-sm text-slate-500">{s.class_name || "Class"} · {s.school_name || "School"}</p>
                            {!((s.can_set_daily_limit ?? s.access_type === "FULL")) && (
                              <span className="mt-2 inline-flex items-center gap-2 rounded-full border border-rose-200/70 bg-rose-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.15em] text-rose-700">
                                <span className="h-2 w-2 rounded-full bg-rose-500" /> Fund Only
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronRight size={20} className={isSelected ? "text-amber-500" : "text-slate-300"} />
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </section>

          <section className="space-y-6">
            {selectedStudent ? (
              <>
                <div className="grid gap-4 sm:grid-cols-3">
                  {[
                    { label: "Balance", value: canViewFinancials ? rwf(selectedWallet.balance_rwf) : "Private", accent: "text-slate-950 bg-white" },
                    { label: "Daily Limit", value: canViewFinancials ? rwf(selectedWallet.daily_limit_rwf) : "Private", accent: "text-amber-600 bg-amber-50" },
                    { label: "Status", value: "Active", accent: "text-emerald-600 bg-emerald-50" },
                  ].map((item) => (
                    <div key={item.label} className={`rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm ${item.accent}`}>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{item.label}</p>
                      <p className="mt-3 text-2xl font-black">{item.value}</p>
                    </div>
                  ))}
                </div>

                {/* Academics from teacher portal */}
                <div className="rounded-[28px] border border-[#000435]/10 bg-gradient-to-br from-[#000435] to-[#001266] p-6 text-white shadow-xl shadow-[#000435]/15">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-300">
                        <GraduationCap size={22} />
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-300/90">Academics</p>
                        <p className="text-lg font-extrabold">Published teacher marks</p>
                      </div>
                    </div>
                    {academicsSummary?.average_percent != null && (
                      <div className="text-right">
                        <p className="text-2xl font-black text-amber-400">{academicsSummary.average_percent}%</p>
                        <p className="text-[10px] uppercase tracking-wider text-white/50">Average</p>
                      </div>
                    )}
                  </div>

                  {markFilterOptions && (
                    <div className="mb-4 rounded-2xl bg-white/8 p-3 ring-1 ring-white/10">
                      <p className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-amber-200/80">
                        <Filter size={12} /> Filters
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={markYear}
                          onChange={(e) => {
                            setMarkYear(e.target.value);
                            setMarkFiltersExplicit(true);
                          }}
                          className="h-9 rounded-xl border border-white/15 bg-white/10 px-3 text-xs font-bold text-white outline-none"
                        >
                          <option value="" className="text-[#000435]">All years</option>
                          {(markFilterOptions.academic_years || []).map((y) => (
                            <option key={y} value={y} className="text-[#000435]">{y}</option>
                          ))}
                        </select>
                        <select
                          value={markTerm}
                          onChange={(e) => {
                            setMarkTerm(e.target.value);
                            setMarkFiltersExplicit(true);
                          }}
                          className="h-9 rounded-xl border border-white/15 bg-white/10 px-3 text-xs font-bold text-white outline-none"
                        >
                          <option value="" className="text-[#000435]">All terms</option>
                          {markTermOptions.map((t) => (
                            <option key={t} value={t} className="text-[#000435]">{t}</option>
                          ))}
                        </select>
                      </div>
                      <p className="mt-2 text-[10px] text-white/45">
                        {markFiltersExplicit
                          ? `${markYear || "All years"} · ${markTerm || "All terms"}`
                          : `${markFilterOptions.current_academic_year || "Current year"} · ${markFilterOptions.current_term || "Current term"} (school default)`}
                      </p>
                    </div>
                  )}

                  {loadingAcademics ? (
                    <div className="mb-5 flex justify-center py-8">
                      <Loader2 className="animate-spin text-amber-400" size={28} />
                    </div>
                  ) : (academicsSummary?.latest || []).length > 0 ? (
                    <div className="space-y-2 mb-5">
                      {academicsSummary.latest.map((m) => (
                        <div key={`${m.subject}-${m.assessment_name}`} className="flex items-center justify-between gap-3 rounded-2xl bg-white/8 px-4 py-3 ring-1 ring-white/10">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold">{m.subject}</p>
                            <p className="truncate text-xs text-white/55">{m.assessment_name} · {m.teacher_name}</p>
                          </div>
                          <span className="shrink-0 rounded-lg bg-amber-500/20 px-2.5 py-1 text-xs font-extrabold text-amber-200">
                            {m.percent != null ? `${m.percent}%` : '—'}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mb-5 rounded-2xl bg-white/5 px-4 py-6 text-center ring-1 ring-white/10">
                      <BookOpen size={28} className="mx-auto mb-2 text-white/30" />
                      <p className="text-sm font-semibold text-white/70">No published marks yet</p>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      const ref = selectedStudent.student_code || selectedStudent.student_uid || selectedStudent.id;
                      const params = new URLSearchParams({ tab: "academic" });
                      if (markFiltersExplicit && markYear) params.set("academic_year", markYear);
                      if (markFiltersExplicit && markTerm) params.set("term", markTerm);
                      if (!markFiltersExplicit && markFilterOptions?.current_academic_year) {
                        params.set("academic_year", markFilterOptions.current_academic_year);
                      }
                      if (!markFiltersExplicit && markFilterOptions?.current_term) {
                        params.set("term", markFilterOptions.current_term);
                      }
                      navigate(`/parents/student-details/${ref}?${params.toString()}`);
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-500 px-4 py-3.5 text-sm font-extrabold text-[#000435] transition hover:bg-amber-400"
                  >
                    View full academics
                    <ChevronRight size={18} />
                  </button>
                </div>

                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={() => setShowTopup(true)}
                    className="flex w-full items-center justify-between rounded-[28px] bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-5 text-white shadow-xl shadow-amber-500/20 transition hover:-translate-y-0.5"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-white/15">
                        <Wallet size={22} />
                      </div>
                      <div className="text-left">
                        <p className="font-extrabold">Fund Account</p>
                        <p className="text-sm text-white/80">Add money via MoMo or card</p>
                      </div>
                    </div>
                    <ArrowUpRight size={22} className="opacity-80" />
                  </button>

                  {canSetLimit && (
                    <button
                      type="button"
                      onClick={() => setShowLimit(true)}
                      className="flex w-full items-center justify-between rounded-[28px] bg-slate-950 px-6 py-5 text-white shadow-lg shadow-slate-950/10 transition hover:-translate-y-0.5"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-amber-500/10 text-amber-300">
                          <Gauge size={22} />
                        </div>
                        <div className="text-left">
                          <p className="font-extrabold">Set Daily Limit</p>
                          <p className="text-sm text-slate-300">Currently: {rwf(selectedWallet.daily_limit_rwf)}</p>
                        </div>
                      </div>
                      <ArrowUpRight size={22} className="opacity-70" />
                    </button>
                  )}

                  {canSetLimit && (
                    <button
                      type="button"
                      onClick={() => navigate(`/parents/student-details/${selectedStudent.student_code || selectedStudent.student_uid || selectedStudent.id}?tab=academic`)}
                      className="flex w-full items-center justify-between rounded-[28px] border border-slate-200 bg-white px-6 py-5 text-slate-950 shadow-sm transition hover:-translate-y-0.5"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-slate-100 text-slate-600">
                          <Eye size={22} />
                        </div>
                        <div className="text-left">
                          <p className="font-extrabold">Academics & activity</p>
                          <p className="text-sm text-slate-500">Marks, attendance & discipline</p>
                        </div>
                      </div>
                      <ChevronRight size={22} className="text-slate-400" />
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className="rounded-[28px] border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">
                <Sparkles size={36} className="mx-auto mb-4 text-slate-300" />
                <p className="text-xl font-bold text-slate-900">No student selected</p>
                <p className="mt-2 text-sm">Choose a child from the list to manage their card.</p>
              </div>
            )}
          </section>
        </div>
      </div>

      <AddChildModal open={addOpen} onClose={() => setAddOpen(false)} onSaved={loadStudents} onLinked={loadStudents} />

      {showTopup && selectedStudent && (
        <TopupModal student={selectedStudent} onClose={() => setShowTopup(false)} onContinue={goToPaymentsForTopup} />
      )}

      {showLimit && selectedStudent && (
        <LimitModal
          student={selectedStudent}
          currentLimit={selectedWallet.daily_limit_rwf}
          onClose={() => setShowLimit(false)}
          onSave={submitLimit}
          busy={busyLimit}
        />
      )}
    </div>
  );
}
