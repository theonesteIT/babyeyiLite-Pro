// ApplicationStatusTracker.jsx — v1.0
// ================================================================
//  Public page where applicants enter their reference code to:
//  ✅ Check application status (pending / accepted / rejected / etc)
//  ✅ View all their submitted answers + documents
//  ✅ See school information & contact details
//  ✅ Beautiful animated UI with status indicators
//
//  Usage:
//    <ApplicationStatusTracker />         — standalone page
//    <ApplicationStatusTracker schoolSlug="gsgahini" />  — pre-filtered
//
//  Requires new backend endpoint:
//    GET /api/admissions/track/:referenceNo  (see bottom of file)
// ================================================================

import { useState, useRef, useEffect } from "react";
import {
  Search, CheckCircle, Clock, XCircle, AlertCircle,
  Users, Mail, Phone, MapPin, Globe, Calendar,
  FileText, Paperclip, ExternalLink, Download,
  ChevronRight, ArrowLeft, RotateCcw, Building2,
  BookOpen, Award, GraduationCap, Loader2, Eye,
  MessageSquare, ToggleLeft, List, Image as ImageIcon,
  Sparkles, Hash, Check, X, Info
} from "lucide-react";

const SERVER       = "http://localhost:5100";
const TRACKING_API = `${SERVER}/api/admissions/track`;

// ── Status config ────────────────────────────────────────────
const STATUSES = {
  pending: {
    label:   "Under Review",
    sublabel:"Your application is being reviewed by the admissions team.",
    icon:    Clock,
    bg:      "from-amber-400 to-orange-500",
    badge:   "bg-amber-50 text-amber-700 border-amber-200",
    glow:    "shadow-amber-500/30",
    dot:     "bg-amber-500",
    emoji:   "⏳",
  },
  reviewed: {
    label:   "Reviewed",
    sublabel:"Your application has been reviewed. A decision is coming soon.",
    icon:    Eye,
    bg:      "from-blue-500 to-indigo-600",
    badge:   "bg-blue-50 text-blue-700 border-blue-200",
    glow:    "shadow-blue-500/30",
    dot:     "bg-blue-500",
    emoji:   "👀",
  },
  accepted: {
    label:   "Congratulations! Accepted",
    sublabel:"You have been accepted. Please contact the school for next steps.",
    icon:    CheckCircle,
    bg:      "from-emerald-500 to-teal-600",
    badge:   "bg-emerald-50 text-emerald-700 border-emerald-200",
    glow:    "shadow-emerald-500/30",
    dot:     "bg-emerald-500",
    emoji:   "🎉",
  },
  rejected: {
    label:   "Not Accepted",
    sublabel:"Unfortunately your application was not successful this time.",
    icon:    XCircle,
    bg:      "from-red-500 to-rose-600",
    badge:   "bg-red-50 text-red-700 border-red-200",
    glow:    "shadow-red-500/30",
    dot:     "bg-red-500",
    emoji:   "😔",
  },
  waitlisted: {
    label:   "Waitlisted",
    sublabel:"You are on the waiting list. You may be contacted if a spot opens.",
    icon:    Users,
    bg:      "from-purple-500 to-violet-600",
    badge:   "bg-purple-50 text-purple-700 border-purple-200",
    glow:    "shadow-purple-500/30",
    dot:     "bg-purple-500",
    emoji:   "📋",
  },
};

function toFileUrl(p) {
  if (!p) return null;
  if (p.startsWith("http")) return p;
  const norm = p.replace(/\\/g, "/");
  const idx  = norm.indexOf("uploads/");
  return idx !== -1 ? `${SERVER}/${norm.slice(idx)}` : `${SERVER}/uploads/${norm.split("/").pop()}`;
}

function imgUrl(p) {
  if (!p) return null;
  if (p.startsWith("http") || p.startsWith("blob:")) return p;
  let norm = p.replace(/\\/g, "/");
  const idx = norm.replace(/^\//, "").indexOf("uploads/");
  if (idx !== -1) norm = "/" + norm.replace(/^\//, "").slice(idx);
  return `${SERVER}${norm.startsWith("/") ? norm : "/" + norm}`;
}

// ── File Card ────────────────────────────────────────────────
function FileCard({ file }) {
  const [err, setErr] = useState(false);
  const url   = toFileUrl(file.url);
  const isImg = !err && !file.name?.match(/\.pdf$/i);
  const isPdf =  file.name?.match(/\.pdf$/i);

  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className="group flex flex-col rounded-2xl overflow-hidden border border-gray-200 hover:border-indigo-300 hover:shadow-lg transition-all duration-200 bg-white">
      {isImg ? (
        <img src={url} alt={file.name || ""} className="w-full h-28 object-cover"
          onError={() => setErr(true)} />
      ) : isPdf ? (
        <div className="h-28 flex flex-col items-center justify-center bg-red-50 gap-2">
          <FileText size={24} className="text-red-400" />
          <span className="text-[10px] font-bold text-red-500">PDF</span>
        </div>
      ) : (
        <div className="h-28 flex flex-col items-center justify-center bg-gray-50 gap-2">
          <Paperclip size={24} className="text-gray-400" />
        </div>
      )}
      <div className="p-2.5 flex items-center gap-1.5">
        <span className="text-[11px] font-semibold text-gray-600 truncate flex-1">{file.name || "Document"}</span>
        <ExternalLink size={11} className="text-gray-400 group-hover:text-indigo-500 transition flex-shrink-0" />
      </div>
    </a>
  );
}

// ── Answer Viewer ────────────────────────────────────────────
function AnswerRow({ answer, index }) {
  const [open, setOpen] = useState(false);
  const hasFiles  = answer.filesJson?.length > 0;
  const hasJson   = answer.answerJson?.length > 0;
  const hasText   = answer.answerText?.trim();
  const isEmpty   = !hasFiles && !hasJson && !hasText;

  const typeIcons = {
    text:        <MessageSquare size={12} className="text-indigo-400" />,
    textarea:    <FileText size={12} className="text-indigo-400" />,
    yesno:       <ToggleLeft size={12} className="text-indigo-400" />,
    select:      <List size={12} className="text-indigo-400" />,
    multiselect: <List size={12} className="text-indigo-400" />,
    file:        <Paperclip size={12} className="text-amber-500" />,
    multifile:   <Paperclip size={12} className="text-amber-500" />,
  };

  return (
    <div className="border border-gray-100 rounded-2xl overflow-hidden bg-white">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50/80 transition text-left"
      >
        <span className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center flex-shrink-0 ${
          isEmpty ? "bg-gray-200 text-gray-500" : "bg-indigo-100 text-indigo-600"
        }`}>{index + 1}</span>
        <span className="text-xs">{typeIcons[answer.questionType]}</span>
        <span className="flex-1 text-sm font-semibold text-gray-700 truncate">{answer.label}</span>
        {hasFiles && (
          <span className="flex-shrink-0 text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
            {answer.filesJson.length} file{answer.filesJson.length !== 1 ? "s" : ""}
          </span>
        )}
        {isEmpty && <span className="text-[10px] text-gray-300 italic flex-shrink-0">—</span>}
        <ChevronRight size={13} className={`flex-shrink-0 text-gray-300 transition-transform ${open ? "rotate-90" : ""}`} />
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-gray-50">
          <div className="mt-3">
            {isEmpty ? (
              <p className="text-xs text-gray-400 italic">No answer provided.</p>
            ) : hasFiles ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {answer.filesJson.map((f, i) => <FileCard key={i} file={f} />)}
              </div>
            ) : hasJson ? (
              <div className="flex flex-wrap gap-2">
                {answer.answerJson.map((v, i) => (
                  <span key={i} className="px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-bold">{v}</span>
                ))}
              </div>
            ) : (
              <div className="bg-gray-50 rounded-xl px-4 py-3">
                {answer.questionType === "yesno" ? (
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold ${
                    answer.answerText === "Yes" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"
                  }`}>
                    {answer.answerText === "Yes" ? <Check size={12} /> : <X size={12} />}
                    {answer.answerText}
                  </span>
                ) : (
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{answer.answerText}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function ApplicationStatusTracker({ schoolSlug }) {
  const [refCode,  setRefCode]  = useState("");
  const [loading,  setLoading]  = useState(false);
  const [result,   setResult]   = useState(null);   // { application, school, form }
  const [error,    setError]    = useState(null);
  const inputRef   = useRef();

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSearch = async () => {
    const code = refCode.trim().toUpperCase();
    if (!code) { setError("Please enter your reference number."); return; }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res  = await fetch(`${TRACKING_API}/${encodeURIComponent(code)}`);
      const data = await res.json();
      if (data.success) {
        setResult(data.data);
      } else {
        setError(data.message || "Application not found. Please check your reference number.");
      }
    } catch {
      setError("Could not connect to the server. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => { if (e.key === "Enter") handleSearch(); };
  const reset = () => { setResult(null); setError(null); setRefCode(""); setTimeout(() => inputRef.current?.focus(), 50); };

  const status      = result ? STATUSES[result.application?.status] || STATUSES.pending : null;
  const app         = result?.application;
  const school      = result?.school;
  const form        = result?.form;
  const answers     = app?.answers || [];
  const fileAnswers = answers.filter(a => a.filesJson?.length > 0);
  const totalFiles  = fileAnswers.reduce((s, a) => s + (a.filesJson?.length || 0), 0);

  return (
    <div
      className="min-h-screen"
      style={{
        background: result
          ? "#f1f5f9"
          : "linear-gradient(160deg, #0f172a 0%, #1e1b4b 40%, #0f172a 100%)",
      }}
    >
      {/* ─── SEARCH SCREEN ─────────────────────────────────────── */}
      {!result && (
        <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
          {/* Decorative background dots */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.07]"
            style={{ backgroundImage: "radial-gradient(circle, rgba(99,102,241,.8) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full blur-3xl pointer-events-none opacity-20"
            style={{ background: "radial-gradient(circle, #818cf8, transparent)" }} />

          <div className="relative w-full max-w-md">
            {/* Brand */}
            <div className="text-center mb-10">
              <h1 className="text-4xl sm:text-5xl font-black text-white leading-none mb-3">
                Track Your<br />
                <span className="text-transparent bg-clip-text" style={{ backgroundImage: "linear-gradient(135deg,#818cf8,#c084fc)" }}>
                  Application
                </span>
              </h1>
              <p className="text-slate-400 text-sm leading-relaxed max-w-xs mx-auto">
                Enter the reference number you received after submitting your admission application.
              </p>
            </div>

            {/* Search Card */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl">
              <label className="block text-xs font-black text-indigo-300 uppercase tracking-widest mb-3">
                Reference Number
              </label>
              <div className="relative mb-4">
                <Hash size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  ref={inputRef}
                  value={refCode}
                  onChange={e => setRefCode(e.target.value.toUpperCase())}
                  onKeyDown={handleKey}
                  placeholder="APP-2025-000001"
                  className="w-full pl-11 pr-4 py-4 rounded-2xl border border-white/15 bg-white/10 text-white placeholder-slate-500 text-base font-black tracking-wider focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                  spellCheck={false}
                  autoComplete="off"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-300 text-xs font-semibold mb-4">
                  <AlertCircle size={13} className="flex-shrink-0" /> {error}
                </div>
              )}

              <button
                onClick={handleSearch}
                disabled={loading || !refCode.trim()}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-sm transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-2xl"
                style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", boxShadow: "0 8px 32px rgba(99,102,241,0.4)" }}
              >
                {loading ? (
                  <><Loader2 size={16} className="animate-spin" /> Searching…</>
                ) : (
                  <><Search size={15} /> Check Status</>
                )}
              </button>
            </div>

            <p className="text-center text-slate-500 text-xs mt-6">
              Your reference number was sent to you after submitting your application.
              <br />Format: <span className="font-mono text-slate-400 font-bold">APP-YYYY-XXXXXX</span>
            </p>
          </div>
        </div>
      )}

      {/* ─── RESULT SCREEN ─────────────────────────────────────── */}
      {result && status && (
        <div className="min-h-screen">
          {/* Status Hero Banner */}
          <div className={`relative overflow-hidden bg-gradient-to-br ${status.bg} py-10 px-6 text-white`}>
            <div className="absolute inset-0 opacity-10"
              style={{ backgroundImage: "radial-gradient(circle,rgba(255,255,255,.8) 1px,transparent 1px)", backgroundSize: "24px 24px" }} />
            <div className="relative max-w-2xl mx-auto">
              <button onClick={reset}
                className="flex items-center gap-2 text-white/70 hover:text-white text-sm font-bold mb-6 transition">
                <ArrowLeft size={15} /> Check another application
              </button>

              <div className="flex items-start gap-5">
                <div className="text-5xl flex-shrink-0">{status.emoji}</div>
                <div className="min-w-0">
                  <div className="text-white/70 text-xs font-black uppercase tracking-widest mb-1">Application Status</div>
                  <h2 className="text-2xl sm:text-3xl font-black leading-tight mb-2">{status.label}</h2>
                  <p className="text-white/75 text-sm leading-relaxed max-w-md">{status.sublabel}</p>
                </div>
              </div>

              {/* Meta strip */}
              <div className="flex flex-wrap gap-2 mt-6">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 text-white text-xs font-black backdrop-blur-sm">
                  <Hash size={10} />{app.reference_no}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 text-white text-xs font-semibold backdrop-blur-sm">
                  <Calendar size={10} />
                  Submitted {new Date(app.submitted_at || app.created_at).toLocaleDateString("en-RW", { day: "numeric", month: "short", year: "numeric" })}
                </span>
                {totalFiles > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 text-white text-xs font-semibold backdrop-blur-sm">
                    <Paperclip size={10} />{totalFiles} document{totalFiles !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

            {/* School Info Card */}
            {school && (
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-3">
                  {school.logoUrl ? (
                    <img src={imgUrl(school.logoUrl)} alt="logo" className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                      <Building2 size={18} className="text-indigo-500" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <h3 className="font-black text-gray-900 text-base truncate">{school.schoolName || school.name}</h3>
                    <p className="text-gray-400 text-xs font-semibold">{school.district}, {school.province}</p>
                  </div>
                </div>
                <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { icon: Phone,   val: school.phone,   label: "Phone"   },
                    { icon: Mail,    val: school.email,   label: "Email"   },
                    { icon: MapPin,  val: school.address, label: "Address" },
                    { icon: Globe,   val: school.website, label: "Website" },
                  ].filter(c => c.val).map(c => (
                    <div key={c.label} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
                        <c.icon size={13} className="text-indigo-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] text-gray-400 font-bold uppercase">{c.label}</p>
                        {c.label === "Website" ? (
                          <a href={c.val} target="_blank" rel="noopener noreferrer"
                            className="text-xs font-semibold text-indigo-600 hover:underline truncate block">{c.val}</a>
                        ) : (
                          <p className="text-xs font-semibold text-gray-700 truncate">{c.val}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Applicant Card */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-xs font-black text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                <MessageSquare size={12} /> Your Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { label: "Full Name",  val: app.applicant_name  },
                  { label: "Email",      val: app.applicant_email || "—" },
                  { label: "Phone",      val: app.applicant_phone || "—" },
                  { label: "Reference",  val: app.reference_no    },
                  { label: "Submitted",  val: new Date(app.submitted_at || app.created_at).toLocaleDateString("en-RW", { day: "2-digit", month: "short", year: "numeric" }) },
                  { label: "Form",       val: form?.title || "Admission Application" },
                ].map(r => (
                  <div key={r.label} className="rounded-xl bg-gray-50 px-3 py-2.5">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{r.label}</p>
                    <p className="text-sm font-bold text-gray-800 mt-0.5 truncate">{r.val}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Application Answers */}
            {answers.length > 0 && (
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
                <h3 className="text-xs font-black text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <BookOpen size={12} /> Your Application Answers
                </h3>
                <div className="space-y-2">
                  {answers.map((ans, i) => (
                    <AnswerRow key={ans.questionId || i} answer={ans} index={i} />
                  ))}
                </div>
              </div>
            )}

            {/* Submitted Documents */}
            {totalFiles > 0 && (
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
                <h3 className="text-xs font-black text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Paperclip size={12} /> Submitted Documents ({totalFiles})
                </h3>
                <div className="space-y-4">
                  {fileAnswers.map((ans, i) => (
                    <div key={i}>
                      <p className="text-xs font-bold text-gray-600 mb-2">{ans.label}</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {ans.filesJson.map((f, j) => <FileCard key={j} file={f} />)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* What happens next */}
            <div className="rounded-3xl border border-indigo-100 bg-indigo-50 p-5">
              <h3 className="text-xs font-black text-indigo-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Info size={12} /> What Happens Next?
              </h3>
              <div className="space-y-2 text-sm text-indigo-800">
                {app.status === "accepted" ? (
                  <>
                    <p className="flex items-start gap-2"><Check size={14} className="text-emerald-500 flex-shrink-0 mt-0.5" /> You have been accepted — congratulations!</p>
                    <p className="flex items-start gap-2"><Check size={14} className="text-emerald-500 flex-shrink-0 mt-0.5" /> Contact the school to confirm your enrollment and pay fees.</p>
                    <p className="flex items-start gap-2"><Check size={14} className="text-emerald-500 flex-shrink-0 mt-0.5" /> Bring all required original documents on your first day.</p>
                  </>
                ) : app.status === "rejected" ? (
                  <>
                    <p className="flex items-start gap-2"><Info size={14} className="text-indigo-500 flex-shrink-0 mt-0.5" /> We appreciate your interest in this school.</p>
                    <p className="flex items-start gap-2"><Info size={14} className="text-indigo-500 flex-shrink-0 mt-0.5" /> You may contact the school to inquire about the reason or future openings.</p>
                  </>
                ) : app.status === "waitlisted" ? (
                  <>
                    <p className="flex items-start gap-2"><Info size={14} className="text-indigo-500 flex-shrink-0 mt-0.5" /> You are on the waitlist — we will notify you if a spot opens.</p>
                    <p className="flex items-start gap-2"><Info size={14} className="text-indigo-500 flex-shrink-0 mt-0.5" /> Contact the school to confirm your waitlist position.</p>
                  </>
                ) : (
                  <>
                    <p className="flex items-start gap-2"><Clock size={14} className="text-amber-500 flex-shrink-0 mt-0.5" /> Your application is being processed by the admissions team.</p>
                    <p className="flex items-start gap-2"><Clock size={14} className="text-amber-500 flex-shrink-0 mt-0.5" /> You will be notified once a decision is made. Check back here anytime.</p>
                  </>
                )}
              </div>
            </div>

            {/* Try another */}
            <button onClick={reset}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-sm text-white shadow-lg hover:opacity-90 transition"
              style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
              <RotateCcw size={14} /> Track Another Application
            </button>
          </div>
        </div>
      )}
    </div>
  );
}