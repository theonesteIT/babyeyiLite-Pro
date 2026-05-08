// AdmissionApplyPage.jsx
// ================================================================
//  Public Admission Application Form  v1.0
//
//  Usage:
//    <AdmissionApplyPage formId={formId} onClose={() => ...} />
//
//  Or standalone route:
//    Route: /apply/:formId
//    import AdmissionApplyPage from "./AdmissionApplyPage";
//    <AdmissionApplyPage />  (reads formId from URL)
//
//  Loads form from:  GET /api/admissions/forms/:formId/public
//  Submits to:       POST /api/admissions/forms/:formId/apply
// ================================================================
import { useState, useEffect, useRef } from "react";
import {
  Loader2, AlertCircle, CheckCircle, Upload, X,
  Calendar, Users, Clock, ArrowRight, ChevronLeft,
  FileText, Image as ImageIcon
} from "lucide-react";

import { API_BASE, SERVER_BASE } from '../../lib/schoolLiteApi';
const API = `${API_BASE}/admissions`;
const SERVER = SERVER_BASE;

const THEMES = {
  blue:   { p: "#2563EB", s: "#EFF6FF", a: "#F59E0B" },
  green:  { p: "#16A34A", s: "#F0FDF4", a: "#F59E0B" },
  teal:   { p: "#0D9488", s: "#F0FDFA", a: "#F97316" },
  maroon: { p: "#9B1C1C", s: "#FEF2F2", a: "#F59E0B" },
  purple: { p: "#7C3AED", s: "#F5F3FF", a: "#F59E0B" },
  dark:   { p: "#1E293B", s: "#F8FAFC", a: "#F59E0B" },
};

function getTheme(colorTheme, customColors) {
  const base = THEMES[colorTheme] || THEMES.blue;
  return {
    p: customColors?.primary   || base.p,
    s: customColors?.secondary || base.s,
    a: customColors?.accent    || base.a,
  };
}

// ── Countdown / Stats Bar ─────────────────────────────────────
function StatsBar({ form, theme }) {
  const now   = new Date();
  const dead  = form.applicationDeadline ? new Date(form.applicationDeadline) : null;
  const start = form.applicationStart    ? new Date(form.applicationStart)    : null;
  const days  = dead && dead > now ? Math.ceil((dead - now) / 86400000) : null;
  const { p } = theme;

  const items = [
    start && { label: "Opens",     val: start.toLocaleDateString(), icon: Calendar },
    dead  && { label: "Deadline",  val: dead.toLocaleDateString(),  icon: Calendar },
    days != null && { label: "Days Remaining", val: `${days} days`,  icon: Clock },
    form.maxApplicants && { label: "Spots Available", val: form.spotsRemaining ?? "∞", icon: Users },
    form.applicantsCount != null && { label: "Applied",  val: form.applicantsCount, icon: Users },
  ].filter(Boolean);

  if (!items.length) return null;

  return (
    <div className="flex flex-wrap gap-3 mb-8">
      {items.map((item, i) => (
        <div
          key={i}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold"
          style={{ background: `${p}12`, color: p }}
        >
          <item.icon size={14} />
          <span className="text-gray-600 font-semibold">{item.label}:</span>
          <span style={{ color: p }}>{item.val}</span>
        </div>
      ))}
    </div>
  );
}

// ── File Upload Field ────────────────────────────────────────
function FileField({ question, value = [], onChange, theme }) {
  const ref = useRef();
  const max = question.questionType === "multifile" ? (question.maxFiles || 5) : 1;
  const { p } = theme;

  const handleFiles = (e) => {
    const files = Array.from(e.target.files || []);
    const next  = question.questionType === "multifile"
      ? [...value, ...files].slice(0, max)
      : files.slice(0, 1);
    onChange(next);
    e.target.value = "";
  };

  const remove = (i) => onChange(value.filter((_, j) => j !== i));

  return (
    <div className="space-y-2">
      <div
        onClick={() => ref.current?.click()}
        className="border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer hover:border-indigo-400 transition-colors"
        style={{ borderColor: `${p}40`, background: `${p}06` }}
      >
        <Upload size={22} className="mx-auto mb-2" style={{ color: p }} />
        <p className="text-sm font-bold text-gray-600">
          {value.length === 0
            ? `Click to upload ${question.questionType === "multifile" ? `up to ${max} files` : "a file"}`
            : "Click to add more files"}
        </p>
        <p className="text-xs text-gray-400 mt-1">JPEG, PNG, WebP, PDF accepted</p>
        <input ref={ref} type="file" multiple={question.questionType === "multifile"} onChange={handleFiles} className="hidden"
          accept="image/jpeg,image/png,image/webp,application/pdf" />
      </div>

      {value.length > 0 && (
        <div className="space-y-2">
          {value.map((file, i) => {
            const isImg = file.type?.startsWith("image/");
            return (
              <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                {isImg ? (
                  <img src={URL.createObjectURL(file)} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <FileText size={16} className="text-gray-500" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-gray-800 truncate">{file.name}</p>
                  <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(0)} KB</p>
                </div>
                <button type="button" onClick={() => remove(i)} className="text-gray-400 hover:text-red-500 transition">
                  <X size={16} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Dynamic Question Field ────────────────────────────────────
function QuestionField({ question, value, onChange, theme, error }) {
  const { p } = theme;
  const base = "w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 transition";
  const cls  = error
    ? `${base} border-red-300 focus:ring-red-300 bg-red-50`
    : `${base} border-gray-200 focus:ring-indigo-300 focus:border-transparent bg-white`;

  switch (question.questionType) {
    case "text":
      return (
        <input
          className={cls}
          value={value || ""}
          onChange={e => onChange(e.target.value)}
          placeholder={question.placeholder || ""}
        />
      );

    case "textarea":
      return (
        <textarea
          className={`${cls} resize-none`}
          rows={4}
          value={value || ""}
          onChange={e => onChange(e.target.value)}
          placeholder={question.placeholder || ""}
        />
      );

    case "yesno":
      return (
        <div className="flex gap-3">
          {["Yes", "No"].map(opt => (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className={`flex-1 py-3 rounded-2xl text-sm font-semibold transition-all border-2 ${
                value === opt
                  ? "text-white border-transparent shadow-lg"
                  : "text-gray-600 border-gray-200 hover:border-indigo-300 bg-white"
              }`}
              style={value === opt ? { background: p, borderColor: p } : {}}
            >
              {opt}
            </button>
          ))}
        </div>
      );

    case "select":
      return (
        <select
          className={cls}
          value={value || ""}
          onChange={e => onChange(e.target.value)}
        >
          <option value="">— Select an option —</option>
          {(question.options || []).map((opt, i) => (
            <option key={i} value={opt}>{opt}</option>
          ))}
        </select>
      );

    case "multiselect": {
      const selected = Array.isArray(value) ? value : [];
      return (
        <div className="flex flex-wrap gap-2">
          {(question.options || []).map((opt, i) => {
            const active = selected.includes(opt);
            return (
              <button
                key={i}
                type="button"
                onClick={() => {
                  onChange(active ? selected.filter(v => v !== opt) : [...selected, opt]);
                }}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border-2 ${
                  active ? "text-white border-transparent" : "text-gray-600 border-gray-200 bg-white hover:border-indigo-300"
                }`}
                style={active ? { background: p, borderColor: p } : {}}
              >
                {opt}
              </button>
            );
          })}
        </div>
      );
    }

    case "file":
    case "multifile":
      return <FileField question={question} value={Array.isArray(value) ? value : []} onChange={onChange} theme={theme} />;

    default:
      return null;
  }
}

// ═══════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function AdmissionApplyPage({ formId: propFormId, onClose }) {
  // Support both prop and URL param
  const urlFormId = typeof window !== "undefined"
    ? window.location.pathname.split("/apply/")[1]?.split("/")[0]
    : null;
  const formId = propFormId || urlFormId;

  const [form,       setForm]     = useState(null);
  const [loading,    setLoading]  = useState(true);
  const [submitting, setSubmitting]= useState(false);
  const [submitted,  setSubmitted]= useState(null); // { referenceNo, applicantName }
  const [error,      setError]    = useState(null);
  const [answers,    setAnswers]  = useState({});   // { [questionId]: value }
  const [fieldErrors,setFieldErrors] = useState({});

  // Applicant identity fields
  const [name,  setName]  = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (!formId) { setError("No form ID provided"); setLoading(false); return; }
    fetch(`${API}/forms/${formId}/public`)
      .then(r => r.json())
      .then(d => {
        if (d.success) setForm(d.data);
        else setError(d.message || "Form not found");
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [formId]);

  const theme = form ? getTheme(form.colorTheme, form.customColors) : THEMES.blue;

  const validate = () => {
    const errs = {};
    if (!name.trim()) errs._name = "Full name is required";
    for (const q of form.questions || []) {
      if (!q.isRequired) continue;
      const val = answers[q.id];
      const isFile = q.questionType === "file" || q.questionType === "multifile";
      if (isFile && (!Array.isArray(val) || val.length === 0)) {
        errs[q.id] = "Please upload the required file(s)";
      } else if (!isFile && q.questionType === "multiselect" && (!Array.isArray(val) || val.length === 0)) {
        errs[q.id] = "Please select at least one option";
      } else if (!isFile && q.questionType !== "multiselect" && !val?.toString().trim()) {
        errs[q.id] = "This field is required";
      }
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("applicantName",  name.trim());
      fd.append("applicantEmail", email.trim());
      fd.append("applicantPhone", phone.trim());

      // Serialize non-file answers
      const answersPayload = {};
      for (const q of form.questions || []) {
        const val = answers[q.id];
        const isFile = q.questionType === "file" || q.questionType === "multifile";
        if (!isFile) {
          answersPayload[`q_${q.id}`] = val;
        }
      }
      fd.append("answers", JSON.stringify(answersPayload));

      // File answers
      for (const q of form.questions || []) {
        const isFile = q.questionType === "file" || q.questionType === "multifile";
        if (isFile && Array.isArray(answers[q.id])) {
          for (const file of answers[q.id]) {
            fd.append(`q_${q.id}`, file);
          }
        }
      }

      const r = await fetch(`${API}/forms/${formId}/apply`, { method: "POST", body: fd });
      const d = await r.json();
      if (d.success) {
        setSubmitted(d.data);
      } else {
        setError(d.message || "Submission failed");
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading ──────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#f8fafc" }}>
      <div className="text-center">
        <Loader2 size={40} className="animate-spin mx-auto mb-4" style={{ color: "#6366f1" }} />
        <p className="text-gray-500 font-semibold text-sm">Loading application form…</p>
      </div>
    </div>
  );

  // ── Error ────────────────────────────────────────────────────
  if (error && !form) return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "#f8fafc" }}>
      <div className="bg-white rounded-3xl p-10 shadow-sm text-center max-w-sm border border-red-100">
        <div className="text-5xl mb-4">😔</div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Form Unavailable</h3>
        <p className="text-gray-500 text-sm mb-6">{error}</p>
        {onClose && (
          <button onClick={onClose} className="px-6 py-3 rounded-2xl font-semibold text-sm text-white"
            style={{ background: "#6366f1" }}>
            ← Go Back
          </button>
        )}
      </div>
    </div>
  );

  // ── Closed ───────────────────────────────────────────────────
  if (form && form.status !== "open") return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: form?.colorTheme ? theme.s : "#f8fafc" }}>
      <div className="bg-white rounded-3xl p-10 shadow-sm text-center max-w-sm">
        <div className="text-5xl mb-4">🔒</div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Admissions Not Open</h3>
        <p className="text-gray-500 text-sm mb-2">{form.title}</p>
        <p className="text-gray-400 text-sm mb-6">
          {form.status === "closed" ? "Applications are closed." : "Applications are not currently accepting submissions."}
          {form.applicationDeadline && form.status !== "closed" && ` Check back on ${new Date(form.applicationStart || form.applicationDeadline).toLocaleDateString()}.`}
        </p>
        {onClose && (
          <button onClick={onClose} className="px-6 py-3 rounded-2xl font-semibold text-sm text-white"
            style={{ background: theme.p }}>
            ← Back to School Website
          </button>
        )}
      </div>
    </div>
  );

  // ── Success ──────────────────────────────────────────────────
  if (submitted) return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: theme.s }}>
      <div className="bg-white rounded-3xl p-10 shadow-sm text-center max-w-md border border-gray-100">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg"
          style={{ background: `${theme.p}15` }}>
          <CheckCircle size={40} style={{ color: theme.p }} />
        </div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Application Submitted!</h2>
        <p className="text-gray-500 text-sm mb-6">
          Thank you, <strong>{submitted.applicantName}</strong>! Your application has been received.
        </p>
        <div className="rounded-2xl p-5 mb-6" style={{ background: `${theme.p}08`, border: `1.5px solid ${theme.p}25` }}>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Your Reference Number</p>
          <p className="text-2xl font-semibold font-mono" style={{ color: theme.p }}>{submitted.referenceNo}</p>
          <p className="text-xs text-gray-400 mt-2">Keep this for tracking your application status</p>
        </div>
        {onClose ? (
          <button onClick={onClose} className="px-8 py-3.5 rounded-2xl font-semibold text-sm text-white shadow-lg hover:opacity-90 transition"
            style={{ background: theme.p }}>
            ← Back to School Website
          </button>
        ) : (
          <button onClick={() => window.history.back()} className="px-8 py-3.5 rounded-2xl font-semibold text-sm text-white"
            style={{ background: theme.p }}>
            Done
          </button>
        )}
      </div>
    </div>
  );

  // ── Form ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ background: theme.s, fontFamily: "'Sora', 'Inter', system-ui, sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600;700;800&display=swap" rel="stylesheet" />

      {/* Header */}
      <div className="text-white py-10 px-6" style={{ background: `linear-gradient(135deg, ${theme.p}, ${theme.p}cc)` }}>
        <div className="max-w-2xl mx-auto">
          {onClose && (
            <button onClick={onClose} className="flex items-center gap-2 text-white/70 hover:text-white text-sm font-bold mb-6 transition">
              <ChevronLeft size={16} /> Back to School Website
            </button>
          )}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4 text-xs font-semibold uppercase tracking-wider"
            style={{ background: "rgba(255,255,255,0.15)" }}>
            📋 Online Admission
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold mb-2">{form.title}</h1>
          {form.schoolName && <p className="text-white/70 text-sm font-semibold">{form.schoolName}</p>}
          {form.academicYear && <p className="text-white/60 text-sm mt-1">Academic Year: {form.academicYear}</p>}
          {form.description && <p className="text-white/80 text-sm mt-3 leading-relaxed">{form.description}</p>}
        </div>
      </div>

      {/* Body */}
      <div className="max-w-2xl mx-auto px-6 py-10">
        <StatsBar form={form} theme={theme} />

        {error && (
          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm mb-6">
            <AlertCircle size={16} className="flex-shrink-0" />
            {error}
          </div>
        )}

        {Object.keys(fieldErrors).length > 0 && (
          <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-700 text-sm mb-6">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold mb-1">Please fix the following errors:</p>
              <ul className="list-disc list-inside space-y-0.5 text-xs">
                {fieldErrors._name && <li>{fieldErrors._name}</li>}
                {form.questions?.map(q => fieldErrors[q.id] && <li key={q.id}>{q.label}: {fieldErrors[q.id]}</li>)}
              </ul>
            </div>
          </div>
        )}

        {/* Applicant Info */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 mb-6">
          <h3 className="font-semibold text-gray-900 text-lg mb-5">Applicant Information</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                className={`w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 transition ${
                  fieldErrors._name ? "border-red-300 bg-red-50 focus:ring-red-300" : "border-gray-200 focus:ring-indigo-300 focus:border-transparent"
                }`}
                placeholder="Student's full name"
              />
              {fieldErrors._name && <p className="text-red-500 text-xs mt-1">{fieldErrors._name}</p>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition"
                  placeholder="parent@email.com"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition"
                  placeholder="+250 7XX XXX XXX"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Questions */}
        {(form.questions || []).map((q, idx) => (
          <div key={q.id} className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 mb-4">
            <div className="flex items-start gap-2 mb-4">
              <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold text-white mt-0.5"
                style={{ background: theme.p }}>{idx + 1}</span>
              <div>
                <p className="text-sm font-semibold text-gray-900 leading-snug">
                  {q.label}
                  {q.isRequired && <span className="text-red-500 ml-1">*</span>}
                </p>
                {q.placeholder && (q.questionType === "text" || q.questionType === "textarea") ? null : (
                  q.placeholder && <p className="text-xs text-gray-400 mt-0.5">{q.placeholder}</p>
                )}
              </div>
            </div>
            <QuestionField
              question={q}
              value={answers[q.id]}
              onChange={val => setAnswers(a => ({ ...a, [q.id]: val }))}
              theme={theme}
              error={fieldErrors[q.id]}
            />
            {fieldErrors[q.id] && (
              <p className="text-red-500 text-xs mt-2 flex items-center gap-1">
                <AlertCircle size={11} /> {fieldErrors[q.id]}
              </p>
            )}
          </div>
        ))}

        {/* Submit */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-semibold text-white text-base shadow-sm hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60 mt-6"
          style={{ background: `linear-gradient(135deg, ${theme.p}, ${theme.p}cc)` }}
        >
          {submitting ? (
            <><Loader2 size={18} className="animate-spin" /> Submitting Application…</>
          ) : (
            <>Submit Application <ArrowRight size={18} /></>
          )}
        </button>
        <p className="text-center text-xs text-gray-400 mt-4">
          Your application will be reviewed by the school admissions team.
        </p>
      </div>
    </div>
  );
}