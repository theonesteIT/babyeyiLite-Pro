import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Wallet,
  Search, Filter, Loader2, X, ChevronRight, ChevronLeft,
  GraduationCap, Calendar, CheckCircle2, AlertCircle, ArrowLeft,
} from "lucide-react";
import {
  STUDENTS_PAGE_SIZE,
  TERMS,
  ACADEMIC_YEARS,
  visiblePageNumbers,
  formatMoney,
} from "./accountantUtils";

const API = import.meta.env.VITE_API_URL || "http://localhost:5100";

export default function AccountantPaymentPage() {
  const [students, setStudents] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [classFilter, setClassFilter] = useState("");
  const [payOpen, setPayOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [searchQ, setSearchQ] = useState("");
  const [searchHits, setSearchHits] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [academicYear, setAcademicYear] = useState("2025-2026");
  const [term, setTerm] = useState("Term 1");
  const [feeInfo, setFeeInfo] = useState(null);
  const [feeLoading, setFeeLoading] = useState(false);
  const [amountPaid, setAmountPaid] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [wizardError, setWizardError] = useState(null);
  const [studentPage, setStudentPage] = useState(1);

  const loadLists = useCallback(async () => {
    setLoading(true);
    try {
      const [s, p] = await Promise.all([
        fetch(`${API}/api/students?paginate=false&limit=2000`, { credentials: "include" }).then((r) => r.json()),
        fetch(`${API}/api/accountant/payments?limit=40`, { credentials: "include" }).then((r) => r.json()),
      ]);
      if (s.success) setStudents(s.data || []);
      if (p.success) setPayments(p.data || []);
    } catch {
      /* keep previous */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLists();
  }, [loadLists]);

  const classOptions = useMemo(() => {
    const set = new Set();
    students.forEach((st) => {
      if (st.class_name) set.add(st.class_name);
    });
    return Array.from(set).sort();
  }, [students]);

  const filteredStudents = useMemo(() => {
    if (!classFilter) return students;
    return students.filter((st) => st.class_name === classFilter);
  }, [students, classFilter]);

  const studentTotalPages = Math.max(1, Math.ceil(filteredStudents.length / STUDENTS_PAGE_SIZE));
  const paginatedStudents = useMemo(() => {
    const start = (studentPage - 1) * STUDENTS_PAGE_SIZE;
    return filteredStudents.slice(start, start + STUDENTS_PAGE_SIZE);
  }, [filteredStudents, studentPage]);

  useEffect(() => {
    setStudentPage(1);
  }, [classFilter, students.length]);

  useEffect(() => {
    if (studentPage > studentTotalPages) setStudentPage(studentTotalPages);
  }, [studentPage, studentTotalPages]);

  const searchStudents = useCallback(async (q) => {
    const t = q.trim();
    if (t.length < 2) {
      setSearchHits([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(
        `${API}/api/students?q=${encodeURIComponent(t)}&paginate=false&limit=50`,
        { credentials: "include" }
      );
      const json = await res.json();
      if (json.success) setSearchHits(json.data || []);
      else setSearchHits([]);
    } catch {
      setSearchHits([]);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    const id = setTimeout(() => searchStudents(searchQ), 320);
    return () => clearTimeout(id);
  }, [searchQ, searchStudents]);

  const openPay = (st) => {
    setSelectedStudent(st);
    setStep(1);
    setSearchQ("");
    setSearchHits([]);
    setAcademicYear(st?.academic_year || "2025-2026");
    setTerm("Term 1");
    setFeeInfo(null);
    setAmountPaid("");
    setWizardError(null);
    setPayOpen(true);
  };

  const closePay = () => {
    setPayOpen(false);
    setStep(1);
    setSelectedStudent(null);
  };

  const loadFee = async () => {
    if (!selectedStudent) return;
    setFeeLoading(true);
    setWizardError(null);
    try {
      const cls = selectedStudent.class_name || "";
      const params = new URLSearchParams({
        class_name: cls,
        academic_year: academicYear,
        term,
      });
      const res = await fetch(`${API}/api/accountant/babyeyi-fee?${params}`, { credentials: "include" });
      const json = await res.json();
      if (!json.success) {
        setWizardError(json.message || "Could not load fee");
        setFeeInfo(null);
        return;
      }
      if (!json.data) {
        setWizardError(json.message || "No Babyeyi card for this class/term/year.");
        setFeeInfo(null);
        return;
      }
      setFeeInfo(json.data);
      setAmountPaid(String(json.data.total_fee ?? ""));
    } catch {
      setWizardError("Network error");
      setFeeInfo(null);
    } finally {
      setFeeLoading(false);
    }
  };

  useEffect(() => {
    if (step !== 3 || !selectedStudent) return;
    loadFee();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, academicYear, term, selectedStudent?.id]);

  const totalDue = feeInfo ? Number(feeInfo.total_fee || 0) : 0;
  const paidNum = parseFloat(String(amountPaid).replace(/,/g, "")) || 0;
  const remain = Math.max(0, totalDue - paidNum);

  const submitPayment = async (e) => {
    e.preventDefault();
    if (!selectedStudent || !feeInfo) return;
    setSubmitting(true);
    setWizardError(null);
    try {
      const res = await fetch(`${API}/api/accountant/payments`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: selectedStudent.id,
          academic_year: academicYear,
          term,
          class_name: selectedStudent.class_name,
          amount_paid: paidNum,
          total_due: totalDue,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setWizardError(json.message || "Failed to record");
        return;
      }
      closePay();
      loadLists();
    } catch {
      setWizardError("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-black tracking-tight text-[#1A1200] sm:text-3xl">Payment</h1>
        <p className="mt-1 text-sm text-slate-500">
          Filter by class, find students, record fee payments, and review recent activity.
        </p>
      </div>

      <div className="space-y-8">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl xl:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#FDEAA0]/60 bg-[#FFFBE8]/90 px-5 py-4">
                <div className="flex items-center gap-2 font-black text-[#1A1200]">
                  <GraduationCap size={20} className="text-[#B88A00]" />
                  Students
                </div>
                <div className="flex items-center gap-2">
                  <Filter size={16} className="text-slate-400" />
                  <select
                    value={classFilter}
                    onChange={(e) => setClassFilter(e.target.value)}
                    className="rounded-xl border border-[#FDEAA0] bg-white px-3 py-2 text-sm font-semibold"
                  >
                    <option value="">All classes</option>
                    {classOptions.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="max-h-[420px] overflow-x-auto overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white text-[0.65rem] font-bold uppercase text-slate-500 shadow-sm">
                    <tr>
                      <th className="px-4 py-2 text-left">Code / ID</th>
                      <th className="px-4 py-2 text-left">Name</th>
                      <th className="px-4 py-2 text-left">Class</th>
                      <th className="px-4 py-2 text-right">Pay</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedStudents.map((st) => (
                      <tr key={st.id} className="hover:bg-[#FFFBE8]/80">
                        <td className="px-4 py-2.5 font-mono text-xs text-slate-600">
                          {st.student_code || st.student_uid}
                        </td>
                        <td className="px-4 py-2.5 font-semibold text-slate-900">
                          {st.first_name} {st.last_name}
                        </td>
                        <td className="px-4 py-2.5 text-slate-600">{st.class_name || "—"}</td>
                        <td className="px-4 py-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => openPay(st)}
                            className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-wide text-[#B88A00] hover:text-[#1A1200]"
                          >
                            Pay <ChevronRight size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredStudents.length === 0 && (
                  <div className="py-16 text-center text-sm text-slate-500">No students in this filter.</div>
                )}
              </div>
              {filteredStudents.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#FDEAA0]/60 bg-[#FFFBE8]/60 px-4 py-3">
                  <p className="text-[11px] font-semibold text-[#7A5C00]">
                    Showing{" "}
                    <span className="font-black text-[#1A1200]">
                      {(studentPage - 1) * STUDENTS_PAGE_SIZE + 1}
                    </span>
                    –
                    <span className="font-black text-[#1A1200]">
                      {Math.min(studentPage * STUDENTS_PAGE_SIZE, filteredStudents.length)}
                    </span>{" "}
                    of <span className="font-black text-[#1A1200]">{filteredStudents.length}</span> students
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      aria-label="Previous page"
                      disabled={studentPage <= 1}
                      onClick={() => setStudentPage((p) => Math.max(1, p - 1))}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#FDEAA0] bg-white text-[#1A1200] shadow-sm transition hover:bg-[#FFF3CC] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <div className="flex flex-wrap items-center gap-0.5 px-1">
                      {visiblePageNumbers(studentTotalPages, studentPage).map((num, idx, arr) => {
                        const prev = arr[idx - 1];
                        const gap = prev != null && num - prev > 1;
                        return (
                          <span key={num} className="flex items-center gap-0.5">
                            {gap ? (
                              <span className="px-1 text-xs font-bold text-[#B88A00]">…</span>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => setStudentPage(num)}
                              className={`min-w-[2rem] rounded-lg px-2 py-1.5 text-xs font-black transition ${
                                studentPage === num
                                  ? "bg-gradient-to-r from-[#1A1200] to-[#3D2C00] text-[#FEBF10] shadow-sm"
                                  : "text-[#7A5C00] hover:bg-[#FFF3CC]"
                              }`}
                            >
                              {num}
                            </button>
                          </span>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      aria-label="Next page"
                      disabled={studentPage >= studentTotalPages}
                      onClick={() => setStudentPage((p) => Math.min(studentTotalPages, p + 1))}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#FDEAA0] bg-white text-[#1A1200] shadow-sm transition hover:bg-[#FFF3CC] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
              <div className="border-b border-[#FDEAA0]/60 bg-[#FFFBE8]/90 px-5 py-4 font-black text-[#1A1200]">
                Recent fee payments
              </div>
              <div className="max-h-[480px] flex-1 divide-y divide-slate-100 overflow-y-auto">
                {payments.length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-500">No payments recorded yet.</div>
                ) : (
                  payments.map((p) => (
                    <div key={p.id} className="px-4 py-3 text-sm">
                      <div className="font-bold text-slate-900">
                        {p.first_name} {p.last_name}
                      </div>
                      <div className="mt-0.5 font-mono text-xs text-slate-500">
                        {p.student_code || p.student_uid} · {p.term} · {p.academic_year_label}
                      </div>
                      <div className="mt-2 flex justify-between text-xs font-semibold">
                        <span className="font-bold text-[#7A5C00]">Paid {formatMoney(p.amount_paid)}</span>
                        <span className="text-slate-500">Due {formatMoney(p.total_due)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {payOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/55 p-3 backdrop-blur-[2px] sm:items-center sm:p-6">
          <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#3D2C00] bg-gradient-to-r from-[#1A1200] to-[#3D2C00] px-5 py-4 text-white">
              <div className="flex items-center gap-2 text-sm font-black">
                <Wallet size={18} className="text-[#FEBF10]" />
                Record payment
              </div>
              <button type="button" onClick={closePay} className="rounded-lg p-1 hover:bg-white/10">
                <X size={20} />
              </button>
            </div>

            <div className="flex gap-2 px-5 py-3 text-xs font-bold">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className={`h-1.5 flex-1 rounded-full ${step >= n ? "bg-[#FEBF10]" : "bg-slate-200"}`}
                />
              ))}
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-5">
              {wizardError && (
                <div className="mb-3 flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                  <AlertCircle size={16} className="shrink-0" />
                  {wizardError}
                </div>
              )}

              {step === 1 && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-600">
                    Search by student name, student code, SDM ID, or student UID — then select to continue.
                  </p>
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-3 text-sm font-medium"
                      placeholder="Search…"
                      value={searchQ}
                      onChange={(e) => setSearchQ(e.target.value)}
                    />
                  </div>
                  <div className="max-h-52 divide-y divide-slate-50 overflow-y-auto rounded-xl border border-slate-100">
                    {searching && (
                      <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500">
                        <Loader2 className="h-4 w-4 animate-spin" /> Searching…
                      </div>
                    )}
                    {!searching &&
                      searchHits.map((st) => (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => {
                            setSelectedStudent(st);
                            setAcademicYear(st.academic_year || academicYear);
                          }}
                          className={`flex w-full justify-between gap-2 px-3 py-2.5 text-left text-sm hover:bg-[#FFFBE8] ${
                            selectedStudent?.id === st.id ? "bg-[#FFF3CC] ring-1 ring-[#FDEAA0]" : ""
                          }`}
                        >
                          <span className="font-semibold text-slate-900">
                            {st.first_name} {st.last_name}
                          </span>
                          <span className="font-mono text-xs text-slate-500">
                            {st.student_code || st.sdm_code || st.student_uid}
                          </span>
                        </button>
                      ))}
                    {!searching && searchQ.trim().length >= 2 && searchHits.length === 0 && (
                      <div className="py-8 text-center text-sm text-slate-500">No matches.</div>
                    )}
                  </div>
                  {selectedStudent && (
                    <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
                      <span className="font-bold text-slate-900">
                        {selectedStudent.first_name} {selectedStudent.last_name}
                      </span>
                      <span className="ml-2 font-mono text-xs text-slate-500">{selectedStudent.class_name}</span>
                    </div>
                  )}
                  <button
                    type="button"
                    disabled={!selectedStudent}
                    onClick={() => setStep(2)}
                    className="w-full rounded-xl bg-gradient-to-r from-[#1A1200] to-[#3D2C00] py-3 text-sm font-black text-[#FEBF10] disabled:opacity-40"
                  >
                    Continue
                  </button>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800"
                  >
                    <ArrowLeft size={14} /> Back
                  </button>
                  <div>
                    <label className="mb-1 flex items-center gap-1 text-[0.65rem] font-bold uppercase text-slate-500">
                      <Calendar size={12} /> Academic year
                    </label>
                    <select
                      value={academicYear}
                      onChange={(e) => setAcademicYear(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold"
                    >
                      {ACADEMIC_YEARS.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-[0.65rem] font-bold uppercase text-slate-500">Term</label>
                    <select
                      value={term}
                      onChange={(e) => setTerm(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold"
                    >
                      {TERMS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setWizardError(null);
                      setFeeInfo(null);
                      setStep(3);
                    }}
                    className="w-full rounded-xl bg-gradient-to-r from-[#1A1200] to-[#3D2C00] py-3 text-sm font-black text-[#FEBF10]"
                  >
                    Continue to amounts
                  </button>
                </div>
              )}

              {step === 3 && (
                <form onSubmit={submitPayment} className="space-y-4">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800"
                  >
                    <ArrowLeft size={14} /> Back
                  </button>

                  {feeLoading ? (
                    <div className="flex items-center justify-center gap-2 py-12 text-slate-500">
                      <Loader2 className="h-5 w-5 animate-spin" /> Loading Babyeyi fee…
                    </div>
                  ) : feeInfo ? (
                    <>
                      <div className="rounded-2xl border border-[#FDEAA0] bg-[#FFFBE8] px-4 py-3 text-sm">
                        <div className="text-xs font-bold uppercase text-[#7A5C00]">Total due (Babyeyi)</div>
                        <div className="mt-1 text-2xl font-black text-[#1A1200]">{formatMoney(feeInfo.total_fee)}</div>
                        {feeInfo.doc_id && (
                          <div className="mt-1 font-mono text-[0.7rem] text-slate-600">{feeInfo.doc_id}</div>
                        )}
                      </div>
                      <div>
                        <label className="mb-1 block text-[0.65rem] font-bold uppercase text-slate-500">
                          Amount paying now
                        </label>
                        <input
                          type="number"
                          min={0}
                          step={1}
                          required
                          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold"
                          value={amountPaid}
                          onChange={(e) => setAmountPaid(e.target.value)}
                        />
                      </div>
                      <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-[#1A1200] to-[#3D2C00] px-4 py-3 text-white">
                        <span className="text-xs font-bold uppercase text-white/70">Remaining</span>
                        <span className="text-lg font-black text-[#FEBF10]">{formatMoney(remain)}</span>
                      </div>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1A1200] to-[#3D2C00] py-3 text-sm font-black text-[#FEBF10] shadow-md shadow-[#1A1200]/20 disabled:opacity-50"
                      >
                        {submitting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 size={18} />
                        )}
                        Confirm payment
                      </button>
                    </>
                  ) : (
                    <p className="text-sm text-slate-600">Could not load fee. Go back and check year/term.</p>
                  )}
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
