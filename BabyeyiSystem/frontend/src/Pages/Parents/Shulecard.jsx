import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, CreditCard, Gauge, Loader2, Plus, Wallet } from "lucide-react";
import AddChildModal from "../../components/Parents/AddChildModal";

const API = import.meta.env.VITE_API_URL || "http://localhost:5100";
const PRESET_TOPUPS = [1000, 5000, 10000, 20000, 50000];
const LIMIT_MIN = 500;
const LIMIT_MAX = 200000;

function rwf(v) {
  return `${Number(v || 0).toLocaleString()} RWF`;
}

export default function Shulecard() {
  const navigate = useNavigate();
  const [mode, setMode] = useState(null); // null | topup | limit
  const [step, setStep] = useState(1);
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [topupAmount, setTopupAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("momo");
  const [note, setNote] = useState("");
  const [limitDraft, setLimitDraft] = useState("5000");
  const [topupHistory, setTopupHistory] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [addOpen, setAddOpen] = useState(false);

  const selectedWallet = selectedStudent?.wallet || { balance_rwf: 0, daily_limit_rwf: 5000 };

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

  const loadTopups = async (studentId) => {
    if (!studentId) return;
    try {
      const res = await fetch(`${API}/api/parent-portal/shulecard/topups?student_id=${studentId}`, { credentials: "include" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) throw new Error(json.message || "Could not load top-up history");
      setTopupHistory(Array.isArray(json.data) ? json.data : []);
    } catch {
      setTopupHistory([]);
    }
  };

  useEffect(() => {
    loadStudents();
  }, []);

  useEffect(() => {
    if (mode === "topup" && selectedStudent?.id) loadTopups(selectedStudent.id);
  }, [mode, selectedStudent?.id]);

  const topupValue = useMemo(() => Math.floor(Number(topupAmount || 0)), [topupAmount]);

  const resetFlow = () => {
    setMode(null);
    setStep(1);
    setSelectedStudent(null);
    setTopupAmount("");
    setPaymentMethod("momo");
    setNote("");
    setLimitDraft("5000");
    setMsg(null);
  };

  const openTopup = () => {
    setMode("topup");
    setStep(1);
    setMsg(null);
  };

  const openLimit = () => {
    setMode("limit");
    setStep(1);
    setMsg(null);
  };

  const continueFromStudent = () => {
    if (!selectedStudent) return;
    if (mode === "limit") {
      setLimitDraft(String(Math.floor(Number(selectedStudent.wallet?.daily_limit_rwf || 5000))));
    }
    setStep(2);
  };

  const goToPaymentsForTopup = () => {
    if (!selectedStudent?.id) return;
    if (topupValue < 500 || topupValue > 5_000_000) {
      setMsg({ type: "err", text: "Top-up amount must be between 500 and 5,000,000 RWF." });
      return;
    }
    try {
      sessionStorage.setItem(
        "babyeyi_shulecard_topup_draft",
        JSON.stringify({
          student_id: selectedStudent.id,
          student_name: `${selectedStudent.first_name || ""} ${selectedStudent.last_name || ""}`.trim(),
          amount_rwf: topupValue,
          payment_method: paymentMethod,
          note,
          source: "parents_shulecard",
          created_at: new Date().toISOString(),
        })
      );
    } catch {
      // no-op
    }
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

  const submitLimit = async () => {
    if (!selectedStudent?.id) return;
    const n = Math.floor(Number(limitDraft || 0));
    if (n < LIMIT_MIN || n > LIMIT_MAX) {
      setMsg({ type: "err", text: `Daily limit must be between ${rwf(LIMIT_MIN)} and ${rwf(LIMIT_MAX)}.` });
      return;
    }
    setBusy(true);
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
      await loadStudents();
      setStep(1);
      setSelectedStudent(null);
    } catch (e) {
      setMsg({ type: "err", text: e.message || "Could not save daily limit" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto pb-8 space-y-5 text-slate-900 dark:text-slate-100">
      <AddChildModal open={addOpen} onClose={() => setAddOpen(false)} onSaved={loadStudents} onLinked={loadStudents} />
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">ShuleCard</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Top up pocket money and manage daily spending limits per student.</p>
        <div className="mt-2">
          <Link to="/parents/shulecard-data" className="text-xs font-bold text-orange-600 hover:underline">
            Open ShuleCard data table
          </Link>
        </div>
      </div>

      {msg && (
        <div className={`rounded-2xl px-4 py-3 text-sm font-semibold ${msg.type === "ok" ? "bg-emerald-50 border border-emerald-200 text-emerald-800" : "bg-red-50 border border-red-200 text-red-700"}`}>
          {msg.text}
        </div>
      )}

      {!mode && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button type="button" onClick={openTopup} className="rounded-3xl border border-slate-200 bg-white dark:bg-slate-800/70 p-5 text-left shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mb-3"><Wallet className="w-6 h-6" /></div>
            <p className="font-extrabold text-lg">Top Up</p>
            <p className="text-sm text-slate-500 mt-1">Select student → amount → payment confirmation.</p>
          </button>
          <button type="button" onClick={openLimit} className="rounded-3xl border border-slate-200 bg-white dark:bg-slate-800/70 p-5 text-left shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mb-3"><Gauge className="w-6 h-6" /></div>
            <p className="font-extrabold text-lg">Set Daily Spending Limit</p>
            <p className="text-sm text-slate-500 mt-1">Select student → choose cap → save securely.</p>
          </button>
        </div>
      )}

      {mode && (
        <section className="rounded-3xl border border-slate-200 bg-white dark:bg-slate-800/70 p-4 sm:p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <p className="font-extrabold text-lg">{mode === "topup" ? "Top Up Flow" : "Daily Limit Flow"} · Step {step} of 3</p>
            <button type="button" onClick={resetFlow} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          </div>

          {step === 1 && (
            <>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-600">Select student</p>
                <button type="button" onClick={() => setAddOpen(true)} className="inline-flex items-center gap-1 rounded-xl bg-orange-500 text-white px-3 py-2 text-xs font-bold">
                  <Plus className="w-4 h-4" /> Add student
                </button>
              </div>
              {loadingStudents ? (
                <p className="text-sm text-slate-500 py-8 text-center">Loading students...</p>
              ) : students.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center">
                  <p className="font-bold text-slate-800">No students available for ShuleCard yet.</p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {students.map((s) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedStudent(s)}
                        className={`w-full rounded-2xl border p-3 text-left transition ${selectedStudent?.id === s.id ? "border-orange-400 bg-orange-50" : "border-slate-200 hover:border-orange-200"}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="font-bold">{s.first_name} {s.last_name}</p>
                            <p className="text-xs text-slate-500">{s.school_name || "School"} · {s.class_name || "Class"}</p>
                            <p className="text-xs text-slate-500 mt-1">Balance {rwf(s.wallet?.balance_rwf)} · Limit {rwf(s.wallet?.daily_limit_rwf)}</p>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-1 rounded ${s.access_type === "LIMITED" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-700"}`}>
                            {s.access_type}
                          </span>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <button type="button" disabled={!selectedStudent} onClick={continueFromStudent} className="w-full rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 py-3.5 text-white font-bold disabled:opacity-50">
                Continue
              </button>
            </>
          )}

          {step === 2 && selectedStudent && mode === "topup" && (
            <>
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3">
                <p className="font-bold">{selectedStudent.first_name} {selectedStudent.last_name}</p>
                <p className="text-xs text-slate-500">Current balance: {rwf(selectedWallet.balance_rwf)}</p>
              </div>
              <label className="block">
                <span className="text-xs font-bold text-slate-600 uppercase">Top up amount (RWF)</span>
                <input type="number" min={500} value={topupAmount} onChange={(e) => setTopupAmount(e.target.value)} className="mt-2 w-full rounded-xl border-2 border-slate-200 px-4 py-3 font-bold" placeholder="10000" />
              </label>
              <div className="flex flex-wrap gap-2">
                {PRESET_TOPUPS.map((p) => (
                  <button key={p} type="button" onClick={() => setTopupAmount(String(p))} className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700">
                    +{p.toLocaleString()}
                  </button>
                ))}
              </div>
              <label className="block">
                <span className="text-xs font-bold text-slate-600 uppercase">Payment method</span>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="mt-2 w-full rounded-xl border-2 border-slate-200 px-4 py-3 font-semibold">
                  <option value="momo">Mobile Money</option>
                  <option value="wallet">Babyeyi Wallet</option>
                  <option value="card">Card</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-bold text-slate-600 uppercase">Optional note</span>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} className="mt-2 w-full rounded-xl border-2 border-slate-200 px-4 py-3" placeholder="Optional transaction note..." />
              </label>
              <button type="button" disabled={!topupValue} onClick={() => setStep(3)} className="w-full rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 py-3.5 text-white font-bold disabled:opacity-50">
                Continue to payment
              </button>
            </>
          )}

          {step === 2 && selectedStudent && mode === "limit" && (
            <>
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3">
                <p className="font-bold">{selectedStudent.first_name} {selectedStudent.last_name}</p>
                <p className="text-xs text-slate-500">Current limit: {rwf(selectedWallet.daily_limit_rwf)}</p>
              </div>
              <label className="block">
                <span className="text-xs font-bold text-slate-600 uppercase">New daily limit (RWF)</span>
                <input type="number" min={LIMIT_MIN} max={LIMIT_MAX} step={500} value={limitDraft} onChange={(e) => setLimitDraft(e.target.value)} className="mt-2 w-full rounded-xl border-2 border-slate-200 px-4 py-3 font-bold" />
              </label>
              <input type="range" min={LIMIT_MIN} max={LIMIT_MAX} step={500} value={Math.min(LIMIT_MAX, Math.max(LIMIT_MIN, Number(limitDraft) || LIMIT_MIN))} onChange={(e) => setLimitDraft(e.target.value)} className="w-full accent-orange-500" />
              <button type="button" onClick={() => setStep(3)} className="w-full rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 py-3.5 text-white font-bold">
                Review and save
              </button>
            </>
          )}

          {step === 3 && selectedStudent && mode === "topup" && (
            <>
              <div className="rounded-2xl border border-slate-200 p-4 space-y-2">
                <p className="font-extrabold text-slate-900 flex items-center gap-2"><CreditCard className="w-5 h-5 text-orange-500" /> Confirm top-up</p>
                <p className="text-sm text-slate-600">Student: <span className="font-bold">{selectedStudent.first_name} {selectedStudent.last_name}</span></p>
                <p className="text-sm text-slate-600">Amount: <span className="font-bold text-orange-600">{rwf(topupValue)}</span></p>
                <p className="text-sm text-slate-600">Method: <span className="font-bold uppercase">{paymentMethod}</span></p>
              </div>
              <button type="button" onClick={goToPaymentsForTopup} className="w-full rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 py-3.5 text-white font-bold flex items-center justify-center gap-2">
                <CreditCard className="w-5 h-5" />
                Continue to Payments
              </button>
              {topupHistory.length > 0 && (
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="font-extrabold text-sm mb-2">Recent top-ups</p>
                  <ul className="space-y-1.5">
                    {topupHistory.slice(0, 6).map((t) => (
                      <li key={t.id} className="text-xs flex items-center justify-between border-b border-slate-100 pb-1 last:border-0">
                        <span>{new Date(t.created_at).toLocaleString()}</span>
                        <span className="font-bold text-emerald-600">+{rwf(t.amount_rwf)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          {step === 3 && selectedStudent && mode === "limit" && (
            <>
              <div className="rounded-2xl border border-slate-200 p-4 space-y-2">
                <p className="font-extrabold text-slate-900 flex items-center gap-2"><Gauge className="w-5 h-5 text-amber-700" /> Confirm daily limit</p>
                <p className="text-sm text-slate-600">Student: <span className="font-bold">{selectedStudent.first_name} {selectedStudent.last_name}</span></p>
                <p className="text-sm text-slate-600">New cap: <span className="font-bold text-orange-600">{rwf(limitDraft)}</span></p>
              </div>
              <button type="button" onClick={submitLimit} disabled={busy} className="w-full rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 py-3.5 text-white font-bold disabled:opacity-60 flex items-center justify-center gap-2">
                {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                Save daily limit
              </button>
            </>
          )}
        </section>
      )}
    </div>
  );
}
