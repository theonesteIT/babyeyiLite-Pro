// ================================================================
// SearchStudent.jsx — Public pay flow: verify student by code, pick
// fees & requirements, then continue to /payments (no parent login).
// ================================================================

import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Building2,
  CreditCard,
  GraduationCap,
  Loader2,
  MapPin,
  Search,
  UserRound,
  X,
  ZoomIn,
} from "lucide-react";
import Heroimage from "../../assets/hero-image.png";

const SERVER = import.meta.env.VITE_API_URL || "http://localhost:5100";
const API = `${SERVER}/api`;

const DRAFT_KEY = "babyeyi_public_pay_draft";

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

function normalizeEmail(raw) {
  const v = String(raw || "").trim().toLowerCase();
  if (!v) return "";
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? v : null;
}

export default function SearchStudent() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [draft, setDraft] = useState(null);
  const [badDraft, setBadDraft] = useState(false);

  const [code, setCode] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupErr, setLookupErr] = useState("");

  const [student, setStudent] = useState(null);
  const [selectedStudents, setSelectedStudents] = useState([]);

  const [pricingLoading, setPricingLoading] = useState(false);
  const [pricingErr, setPricingErr] = useState("");
  const [data, setData] = useState(null);
  const [feeSel, setFeeSel] = useState(() => new Set());
  const [reqSel, setReqSel] = useState(() => new Set());
  const [imgPreview, setImgPreview] = useState(null);

  const [balanceQuote, setBalanceQuote] = useState(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceErr, setBalanceErr] = useState("");

  const [payerName, setPayerName] = useState("");
  const [payerPhone, setPayerPhone] = useState("");
  const [payErr, setPayErr] = useState("");
  const [payerEmailHint, setPayerEmailHint] = useState("");

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (!raw) {
        setBadDraft(true);
        return;
      }
      const d = JSON.parse(raw);
      if (!d?.babyeyiId || !d?.schoolId || !d.publicPayNoLogin) {
        setBadDraft(true);
        return;
      }
      setDraft(d);
      if (d.studentCodeHint) setCode(String(d.studentCodeHint));
    } catch {
      setBadDraft(true);
    }
  }, []);

  useEffect(() => {
    if (!draft?.babyeyiId || !draft?.schoolId) return;
    let cancelled = false;
    setPricingLoading(true);
    setPricingErr("");
    setData(null);
    fetch(
      `${API}/public/babyeyi-pay/pricing/${draft.babyeyiId}?school_id=${encodeURIComponent(draft.schoolId)}`
    )
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (!j.success) throw new Error(j.message || "Could not load pricing");
        setData(j.data);
        const fees = j.data.school_fees || [];
        const reqs = j.data.requirements || [];
        setFeeSel(new Set(fees.map((f) => f.id)));
        setReqSel(new Set(reqs.map((x) => x.babyeyi_requirement_id)));
      })
      .catch((e) => {
        if (!cancelled) setPricingErr(e.message || "Failed to load fees and requirements");
      })
      .finally(() => {
        if (!cancelled) setPricingLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [draft?.babyeyiId, draft?.schoolId]);

  useEffect(() => {
    if (!draft?.babyeyiId || !draft?.schoolId || !data) {
      setBalanceQuote(null);
      return;
    }
    if (selectedStudents.length === 0) {
      setBalanceQuote(null);
      setBalanceErr("");
      return;
    }
    const feeIds = Array.from(feeSel);
    const reqIds = Array.from(reqSel);
    let cancelled = false;
    setBalanceLoading(true);
    setBalanceErr("");
    fetch(`${API}/public/babyeyi-pay/quote-balance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        school_id: draft.schoolId,
        babyeyi_id: draft.babyeyiId,
        selected_fee_ids: feeIds,
        selected_requirement_ids: reqIds,
        selected_students: selectedStudents,
      }),
    })
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (!j.success) throw new Error(j.message || "Could not load balance");
        setBalanceQuote(j.data);
      })
      .catch((e) => {
        if (!cancelled) {
          setBalanceErr(e.message || "Balance check failed");
          setBalanceQuote(null);
        }
      })
      .finally(() => {
        if (!cancelled) setBalanceLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [draft?.babyeyiId, draft?.schoolId, data, feeSel, reqSel, selectedStudents]);

  const feeTotal = useMemo(() => {
    if (!data?.school_fees) return 0;
    return data.school_fees.filter((f) => feeSel.has(f.id)).reduce((s, f) => s + Number(f.amount || 0), 0);
  }, [data, feeSel]);

  const reqTotal = useMemo(() => {
    if (!data?.requirements) return 0;
    return data.requirements
      .filter((r) => reqSel.has(r.babyeyi_requirement_id))
      .reduce((s, r) => s + Number(r.line_total_rwf ?? r.price ?? 0), 0);
  }, [data, reqSel]);

  const perStudentTotal = Math.round((feeTotal + reqTotal) * 100) / 100;
  const grand = Math.round((perStudentTotal * Math.max(selectedStudents.length, 0)) * 100) / 100;

  const remainingForSelection = balanceQuote != null ? Number(balanceQuote.remaining_rwf ?? 0) : null;
  const overpayVersusBalance =
    remainingForSelection != null && grand > remainingForSelection + 1.5;

  const classMismatch = useMemo(() => {
    if (!student?.class_name || !data?.babyeyi?.class_name) return false;
    const a = String(student.class_name).trim().toLowerCase().replace(/\s+/g, "");
    const b = String(data.babyeyi.class_name).trim().toLowerCase().replace(/\s+/g, "");
    return a && b && a !== b;
  }, [student, data]);

  const toggleFee = (id) => {
    setFeeSel((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const toggleReq = (id) => {
    setReqSel((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const mapStudentForInvoice = (row) => ({
    student_uid: row.student_uid || null,
    student_code: row.student_code || null,
    sdm_code: row.sdm_code || null,
    student_name: `${row.first_name || ''} ${row.last_name || ''}`.trim(),
    first_name: row.first_name || null,
    last_name: row.last_name || null,
    class_name: row.class_name || null,
    academic_year: row.academic_year || null,
    school_name: row.school_name || null,
  });

  const addStudentToInvoice = (row) => {
    const key = studentUniqueKey(row);
    if (!key) {
      setLookupErr('This student record is missing an identifier (UID/code).');
      return false;
    }
    let added = false;
    setSelectedStudents((prev) => {
      if (prev.some((s) => studentUniqueKey(s) === key)) return prev;
      added = true;
      return [...prev, mapStudentForInvoice(row)];
    });
    return added;
  };

  const runLookup = async () => {
    const trimmed = code.trim();
    if (!trimmed) {
      setLookupErr("Enter the student code or SDM ID.");
      return;
    }
    if (!draft?.schoolId) return;
    setLookupLoading(true);
    setLookupErr("");
    setStudent(null);
    setPayerEmailHint("");
    try {
      const res = await fetch(`${API}/public/student-code-lookup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trimmed }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false || !json.found || !json.data) {
        throw new Error(json.message || "No student matches this code.");
      }
      const row = json.data;
      if (String(row.school_id || "") !== String(draft.schoolId || "")) {
        throw new Error("This student is registered at a different school than this Babyeyi document.");
      }
      setStudent(row);
      const emailHint = String(row.parent_email || row.father_email || row.mother_email || "").trim().toLowerCase();
      setPayerEmailHint(emailHint);
      const wasAdded = addStudentToInvoice(row);
      if (!wasAdded) setLookupErr('Student already added to this invoice.');
      else setLookupErr('');
    } catch (e) {
      setLookupErr(e.message || "Lookup failed.");
      setPayerEmailHint("");
    } finally {
      setLookupLoading(false);
    }
  };

  const studentUniqueKey = (s) =>
    String(s?.student_uid || s?.student_code || s?.sdm_code || '').trim().toUpperCase();

  const addCurrentStudent = () => {
    if (!student) return;
    const ok = addStudentToInvoice(student);
    if (!ok) setLookupErr('Student already added to this invoice.');
    else setLookupErr('');
  };

  const removeSelectedStudent = (key) => {
    setSelectedStudents((prev) => prev.filter((s) => studentUniqueKey(s) !== key));
  };

  const addAnotherStudent = () => {
    setCode('');
    setStudent(null);
    setLookupErr('');
  };

  const continueToPayment = () => {
    setPayErr("");
    if (!draft) {
      setPayErr("Payment session is missing. Please start again.");
      return;
    }
    if (selectedStudents.length === 0) {
      setPayErr("Add at least one student before continuing.");
      return;
    }
    if (balanceLoading) {
      setPayErr("Please wait a moment while we confirm the remaining balance for this term.");
      return;
    }
    if (grand <= 0) {
      setPayErr("Select at least one fee or requirement with a total greater than zero.");
      return;
    }
    if (overpayVersusBalance) {
      setPayErr(
        `This invoice total (${grand.toLocaleString()} RWF) is above the remaining balance for this term (${remainingForSelection.toLocaleString()} RWF). Adjust your selection or contact the school.`
      );
      return;
    }
    const name = String(payerName || "").trim();
    if (!name) {
      setPayErr("Enter the payer name (e.g. parent or guardian).");
      return;
    }
    const phoneOk = normalizeRwandaMobile(payerPhone);
    if (!phoneOk) {
      setPayErr("Enter a valid Rwanda mobile number (e.g. 07XXXXXXXX).");
      return;
    }
    const emailOk = normalizeEmail(payerEmailHint);
    if (emailOk === null) {
      setPayErr("Enter a valid invoice email address (example: name@email.com) or leave it empty.");
      return;
    }

    const fullDraft = {
      schoolId: draft.schoolId,
      babyeyiId: draft.babyeyiId,
      schoolName: draft.schoolName || "",
      schoolSlug: draft.schoolSlug || "",
      docLabel: draft.docLabel || "",
      grandTotal: grand,
      perStudentTotal,
      studentsCount: selectedStudents.length,
      selectedFeeIds: Array.from(feeSel),
      selectedReqIds: Array.from(reqSel),
      pricingSnapshot: data,
      selectedStudent: selectedStudents[0] || null,
      selectedStudents,
      payer: { name, phone: phoneOk, email: emailOk || null },
      fromPublicFinder: true,
      publicPayNoLogin: true,
      fromSchoolMiniSite: !!draft.fromSchoolMiniSite,
    };

    try {
      sessionStorage.setItem("babyeyi_pay_draft", JSON.stringify(fullDraft));
    } catch {}
    navigate("/payments", { state: fullDraft });
  };

  if (badDraft) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-[#0F172A] flex items-center justify-center p-4 sm:p-6">
        <img src={Heroimage} alt="" className="absolute inset-0 w-full h-full object-cover opacity-25" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0B1220]/95 via-[#111827]/88 to-[#0B1220]/96" />
        <div className="relative z-10 w-full max-w-lg border border-amber-300/25 rounded-3xl p-6 text-center shadow-2xl bg-white/[0.06] backdrop-blur-xl">
          <h1 className="text-xl font-black text-white mb-2">{t("searchStudent.paySessionExpired", { defaultValue: "Pay session expired" })}</h1>
          <p className="text-sm text-white/75 mb-5">
            {t("searchStudent.paySessionExpiredSub", { defaultValue: "Start again from Babyeyi Finder: choose a document and tap View & pay." })}
          </p>
          <Link
            to="/babyeyi-finder"
            className="inline-flex items-center justify-center rounded-xl bg-amber-500 px-5 py-3 text-sm font-black text-slate-900 hover:bg-amber-400"
          >
            {t("searchStudent.backToBabyeyiFinder", { defaultValue: "Back to Babyeyi Finder" })}
          </Link>
        </div>
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-amber-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0F172A]">
      <img src={Heroimage} alt="" className="absolute inset-0 w-full h-full object-cover opacity-25" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0B1220]/95 via-[#111827]/88 to-[#0B1220]/95" />

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-6 sm:py-10 pb-24">
        <div className="flex items-center gap-3 mb-6">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-xs sm:text-sm font-black text-white hover:bg-white/15"
          >
            <ArrowLeft size={16} /> {t("searchStudent.back", { defaultValue: "Back" })}
          </button>
          <span className="text-[11px] font-black uppercase tracking-widest text-amber-200/90">{t("searchStudent.publicPay", { defaultValue: "Public pay" })}</span>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.06] backdrop-blur-xl shadow-2xl p-5 sm:p-7">
          <div className="flex items-start gap-3 mb-6">
            <div className="w-11 h-11 rounded-2xl bg-amber-400/20 flex items-center justify-center text-amber-200">
              <CreditCard className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-black text-white">{t("searchStudent.findStudentPay", { defaultValue: "Find student & pay" })}</h1>
              <p className="text-xs sm:text-sm text-white/65 mt-1">
                Document: {draft.docLabel || "—"} · {draft.schoolName || "School"}
              </p>
            </div>
          </div>

          <section className="mb-8">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-amber-200/90 mb-3">
              1 · Student code or SDM ID
            </h2>
            <div className="mb-3 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={addAnotherStudent}
                className="rounded-xl border border-[#CFE2FF] bg-[#EAF2FF] px-3 py-2 text-xs font-black text-[#123A86] hover:bg-[#DCEBFF]"
              >
                + {t("searchStudent.addAnotherStudent", { defaultValue: "Add another student" })}
              </button>
              <span className="text-[11px] text-white/60">Added: {selectedStudents.length}</span>
            </div>
            <p className="text-[11px] text-white/55 mb-3">
              Enter code and click confirm. Student is automatically added to invoice list.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-white/35 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && runLookup()}
                  placeholder="Code or SDM ID"
                  className="w-full rounded-xl border border-white/15 bg-white/[0.07] pl-9 pr-3 py-3 text-sm text-white placeholder:text-white/35 outline-none focus:border-amber-400/50"
                />
              </div>
              <button
                type="button"
                onClick={runLookup}
                disabled={lookupLoading}
                className="rounded-xl bg-amber-500 px-5 py-3 text-sm font-black text-slate-900 hover:bg-amber-400 disabled:opacity-50"
              >
                {lookupLoading ? <Loader2 className="w-4 h-4 animate-spin inline" /> : t("searchStudent.confirmDetails", { defaultValue: "Confirm details before continuing" })}
              </button>
            </div>
            {lookupErr ? (
              <p className="mt-2 text-sm text-red-300">{lookupErr}</p>
            ) : null}
          </section>

          {student && (
            <section className="mb-8 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 p-4">
              <h2 className="text-[10px] font-black uppercase tracking-widest text-emerald-200/90 mb-3">
                Student (verified for this school)
              </h2>
              <div className="space-y-2 text-sm text-white/90">
                <p className="font-black text-base text-white flex items-center gap-2">
                  <UserRound className="w-4 h-4 text-emerald-300 shrink-0" />
                  {student.first_name} {student.last_name}
                </p>
                <p className="flex items-center gap-2 text-white/80">
                  <Building2 className="w-4 h-4 shrink-0" />
                  {student.school_name || "—"}
                </p>
                <p className="flex items-center gap-2 text-white/80">
                  <GraduationCap className="w-4 h-4 shrink-0" />
                  Class {student.class_name || "—"} · Year {student.academic_year || "—"}
                </p>
                {(student.district || student.sector || student.province) && (
                  <p className="flex items-start gap-2 text-white/65 text-xs">
                    <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                    {[student.province, student.district, student.sector].filter(Boolean).join(" · ")}
                  </p>
                )}
                <p className="text-[11px] font-mono text-white/55">UID: {student.student_uid || "—"}</p>
                {(student.student_code || student.sdm_code) && (
                  <p className="text-[11px] font-mono text-white/55">
                    {student.student_code ? `Code: ${student.student_code}` : null}
                    {student.student_code && student.sdm_code ? " · " : null}
                    {student.sdm_code ? `SDM: ${student.sdm_code}` : null}
                  </p>
                )}
              </div>
              {classMismatch && (
                <p className="mt-3 text-xs text-amber-200 border border-amber-400/30 rounded-lg px-3 py-2 bg-amber-500/10">
                  Note: Class on this Babyeyi document may differ from the class shown in the student register. Continue
                  only if this payment is for the correct term and class.
                </p>
              )}
            </section>
          )}

          <section className="mb-6">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-amber-200/90 mb-3">
              2 · Fees &amp; requirements
            </h2>
            {pricingLoading && (
              <div className="flex justify-center py-12">
                <Loader2 className="w-10 h-10 text-amber-400 animate-spin" />
              </div>
            )}
            {pricingErr && (
              <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {pricingErr}
              </div>
            )}
            {!pricingLoading && !pricingErr && data && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-[10px] font-black uppercase text-amber-100/80 mb-2">{t("searchStudent.schoolFeeItems", { defaultValue: "School fee items" })}</h3>
                  <p className="text-[11px] text-white/50 mb-2">Uncheck anything you are not paying in this transaction.</p>
                  {(data.school_fees || []).length === 0 ? (
                    <p className="text-sm text-white/45">No separate fee lines — total may be on the document only.</p>
                  ) : (
                    <ul className="space-y-2">
                      {data.school_fees.map((f) => (
                        <li
                          key={f.id}
                          className="flex items-start gap-3 p-3 rounded-xl border border-white/10 bg-white/[0.04]"
                        >
                          <input
                            type="checkbox"
                            checked={feeSel.has(f.id)}
                            onChange={() => toggleFee(f.id)}
                            className="mt-1 w-4 h-4 rounded border-white/30"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-white text-sm">{f.name || "Fee item"}</p>
                            <p className="font-mono font-black text-amber-200">{Number(f.amount || 0).toLocaleString()} RWF</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div>
                  <h3 className="text-[10px] font-black uppercase text-amber-100/80 mb-2">{t("searchStudent.studentRequirements", { defaultValue: "Student requirements" })}</h3>
                  <p className="text-[11px] text-white/50 mb-2">Unit price × quantity from the Babyeyi list.</p>
                  {(data.requirements || []).length === 0 ? (
                    <p className="text-sm text-white/45">No requirement lines for this document.</p>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-white/10">
                      <table className="w-full text-xs sm:text-sm min-w-[480px]">
                        <thead>
                          <tr className="bg-white/[0.06] text-left text-[10px] font-black uppercase text-amber-100/90">
                            <th className="p-2 w-8" />
                            <th className="p-2">Cat.</th>
                            <th className="p-2">Item</th>
                            <th className="p-2 text-right">Qty</th>
                            <th className="p-2 text-right">Unit</th>
                            <th className="p-2 text-right">Line</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.requirements.map((r) => (
                            <tr key={r.babyeyi_requirement_id} className="border-t border-white/10">
                              <td className="p-2 align-top">
                                <input
                                  type="checkbox"
                                  checked={reqSel.has(r.babyeyi_requirement_id)}
                                  onChange={() => toggleReq(r.babyeyi_requirement_id)}
                                  className="w-4 h-4 rounded border-white/30"
                                />
                              </td>
                              <td className="p-2 align-top w-16">
                                {r.catalog_image_url ? (
                                  <div className="flex items-center gap-1">
                                    <img
                                      src={payImgUrl(r.catalog_image_url)}
                                      alt=""
                                      className="w-10 h-10 object-contain rounded border border-amber-400/30"
                                    />
                                    <button
                                      type="button"
                                      className="p-1 rounded border border-white/20 bg-white/10"
                                      onClick={() => setImgPreview(payImgUrl(r.catalog_image_url))}
                                    >
                                      <ZoomIn className="w-3.5 h-3.5 text-white" />
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-white/25">—</span>
                                )}
                              </td>
                              <td className="p-2 align-top text-white">
                                <span className="font-semibold">{r.requirement_name}</span>
                                {r.description ? (
                                  <span className="block text-[10px] text-white/50">{r.description}</span>
                                ) : null}
                              </td>
                              <td className="p-2 text-right tabular-nums text-white/80">
                                {r.quantity != null && String(r.quantity).trim() !== "" ? String(r.quantity) : "1"}
                              </td>
                              <td className="p-2 text-right font-mono tabular-nums text-white/80">
                                {Number(r.unit_price_rwf ?? 0).toLocaleString()}
                              </td>
                              <td className="p-2 text-right font-bold text-amber-200 tabular-nums">
                                {Number(r.line_total_rwf ?? r.price ?? 0).toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border-2 border-amber-400/35 bg-amber-500/10 p-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-black text-white">{t("searchStudent.perStudentTotal", { defaultValue: "Per student total" })}</span>
                    <span className="text-lg font-black text-amber-200">{perStudentTotal.toLocaleString()} RWF</span>
                  </div>
                  <div className="flex justify-between items-center text-sm text-amber-100">
                    <span>Students selected</span>
                    <span className="font-black">{selectedStudents.length}</span>
                  </div>
                  <div className="h-px bg-amber-200/30" />
                  <div className="flex justify-between items-center">
                    <span className="font-black text-white">{t("searchStudent.invoiceTotal", { defaultValue: "Invoice total" })}</span>
                    <span className="text-2xl font-black text-amber-200">{grand.toLocaleString()} RWF</span>
                  </div>
                  {selectedStudents.length > 0 && (balanceLoading || balanceErr || balanceQuote) && (
                    <div className="mt-4 rounded-2xl border border-emerald-400/30 bg-emerald-950/40 p-4 text-left space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-emerald-200/90">
                        Term balance (this Babyeyi · {balanceQuote?.term_label || data?.babyeyi?.term || "—"})
                      </p>
                      {balanceLoading && (
                        <p className="text-xs text-white/60 flex items-center gap-2">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Calculating remaining balance…
                        </p>
                      )}
                      {balanceErr && !balanceLoading && (
                        <p className="text-xs text-amber-200/90">{balanceErr}</p>
                      )}
                      {balanceQuote && !balanceLoading && (
                        <>
                          <div className="flex justify-between items-baseline gap-2">
                            <span className="text-sm text-white/80">Still owed for this selection</span>
                            <span className="text-xl font-black text-emerald-300 tabular-nums">
                              {Number(balanceQuote.remaining_rwf ?? 0).toLocaleString()} RWF
                            </span>
                          </div>
                          <p className="text-[11px] text-white/55 leading-relaxed">
                            Based on confirmed payments already recorded for each learner and the fee lines on this document.
                            Your invoice total should not exceed this amount unless the school has asked you to pay extra.
                          </p>
                          {overpayVersusBalance && (
                            <p className="text-xs font-bold text-red-300 border border-red-400/30 rounded-lg px-3 py-2 bg-red-500/10">
                              The current total is higher than the remaining balance. Reduce selected items or speak to the school before paying.
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>

          <section className="mb-6">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-amber-200/90 mb-3">
              3 · Students to include on this invoice
            </h2>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
              <div className="mt-3 space-y-2">
                {selectedStudents.map((s) => {
                  const k = studentUniqueKey(s);
                  return (
                    <div key={k} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2">
                      <div className="min-w-0">
                        <p className="text-sm font-black text-white truncate">{s.student_name || 'Student'}</p>
                        <p className="text-[11px] text-white/60">Class {s.class_name || '—'} · {s.student_code || s.sdm_code || s.student_uid || '—'}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeSelectedStudent(k)}
                        className="rounded-lg border border-red-300/40 bg-red-500/10 px-2.5 py-1 text-[11px] font-black text-red-200 hover:bg-red-500/20"
                      >
                        Remove
                      </button>
                    </div>
                  );
                })}
                {selectedStudents.length === 0 && (
                  <p className="text-xs text-white/45">{t("searchStudent.noStudentsAdded", { defaultValue: "No students added yet." })}</p>
                )}
              </div>
            </div>
          </section>

          <section className="mb-6">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-amber-200/90 mb-3">
              4 · Payer (telephone number / records)
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-white/50 uppercase">{t("searchStudent.fullName", { defaultValue: "Full name" })}</label>
                <input
                  value={payerName}
                  onChange={(e) => setPayerName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/15 bg-white/[0.07] px-3 py-2.5 text-sm text-white placeholder:text-white/35 outline-none focus:border-amber-400/50"
                  placeholder="Parent or guardian name"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-white/50 uppercase">{t("searchStudent.telephoneNumber", { defaultValue: "Telephone number" })}</label>
                <input
                  value={payerPhone}
                  onChange={(e) => setPayerPhone(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/15 bg-white/[0.07] px-3 py-2.5 text-sm text-white placeholder:text-white/35 outline-none focus:border-amber-400/50"
                  placeholder="07XXXXXXXX"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-white/50 uppercase">Invoice email (from student registration)</label>
                <input
                  value={payerEmailHint || ""}
                  onChange={(e) => setPayerEmailHint(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/15 bg-white/[0.07] px-3 py-2.5 text-sm text-white placeholder:text-white/35 outline-none focus:border-amber-400/50"
                  placeholder="No parent email found in student record"
                />
                <p className="mt-1 text-[11px] text-white/55">
                  Auto-filled from student registration, you can edit if needed.
                </p>
              </div>
            </div>
          </section>

          {payErr ? <p className="text-sm text-red-300 mb-3">{payErr}</p> : null}

          <button
            type="button"
            disabled={selectedStudents.length === 0 || pricingLoading || !!pricingErr || grand <= 0}
            onClick={continueToPayment}
            className="w-full py-3.5 rounded-2xl font-black text-slate-900 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {t("searchStudent.continueToPayment", { defaultValue: "Continue to payment" })}
          </button>
        </div>
      </div>

      {imgPreview && (
        <div
          className="fixed inset-0 z-[400] bg-black/85 flex items-center justify-center p-4"
          onClick={() => setImgPreview(null)}
        >
          <button
            type="button"
            className="absolute top-4 right-4 text-white p-2"
            onClick={() => setImgPreview(null)}
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={imgPreview}
            alt=""
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
