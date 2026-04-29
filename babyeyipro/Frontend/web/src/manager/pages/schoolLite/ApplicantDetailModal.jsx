// ApplicantDetailModal.jsx — Enhanced v2.0
// ================================================================
//  Full applicant detail modal with:
//  ✅ All application answers displayed per question
//  ✅ Uploaded documents (images + PDF previews)
//  ✅ Status update with notes
//  ✅ Clean print-friendly layout
//  ✅ Animated, polished UI
// ================================================================

import { useState, useEffect } from "react";
import {
  X, CheckCircle, Clock, Users, Mail, Phone,
  FileText, Image as ImageIcon, Download, ExternalLink,
  ChevronDown, ChevronUp, Check, AlertCircle, Loader2,
  Calendar, Hash, MessageSquare, List, ToggleLeft,
  User, Paperclip, Eye, Printer, RefreshCw
} from "lucide-react";

import { SERVER_BASE as SERVER } from '../../lib/schoolLiteApi';
const ADMISSION_API = `${SERVER}/api/admissions`;

const APP_STATUSES = [
  { value: "pending",    label: "Pending",    color: "bg-amber-100 text-amber-700 border-amber-300",   dot: "bg-amber-500",   ring: "ring-amber-400"   },
  { value: "reviewed",   label: "Reviewed",   color: "bg-blue-100 text-blue-700 border-blue-300",     dot: "bg-blue-500",    ring: "ring-blue-400"    },
  { value: "accepted",   label: "Accepted",   color: "bg-emerald-100 text-emerald-700 border-emerald-300", dot: "bg-emerald-500", ring: "ring-emerald-400" },
  { value: "rejected",   label: "Rejected",   color: "bg-red-100 text-red-700 border-red-300",         dot: "bg-red-500",     ring: "ring-red-400"     },
  { value: "waitlisted", label: "Waitlisted", color: "bg-purple-100 text-purple-700 border-purple-300",dot: "bg-purple-500",  ring: "ring-purple-400"  },
];

function getStatus(s) { return APP_STATUSES.find(x => x.value === s) || APP_STATUSES[0]; }

function toFileUrl(p) {
  if (!p) return null;
  if (p.startsWith("http")) return p;
  const norm = p.replace(/\\/g, "/");
  const idx = norm.indexOf("uploads/");
  return idx !== -1 ? `${SERVER}/${norm.slice(idx)}` : `${SERVER}/uploads/${norm.split("/").pop()}`;
}

// ── Question type icon ────────────────────────────────────────
function QIcon({ type }) {
  const icons = {
    text:        <MessageSquare size={13} />,
    textarea:    <FileText size={13} />,
    yesno:       <ToggleLeft size={13} />,
    select:      <List size={13} />,
    multiselect: <List size={13} />,
    file:        <Paperclip size={13} />,
    multifile:   <Paperclip size={13} />,
  };
  return <span className="text-indigo-500">{icons[type] || <MessageSquare size={13} />}</span>;
}

// ── File Viewer Card ─────────────────────────────────────────
function FileCard({ file }) {
  const [imgErr, setImgErr] = useState(false);
  const url = toFileUrl(file.url);
  const isImage = file.name?.match(/\.(jpg|jpeg|png|webp|gif)$/i) ||
                  (url && !file.name?.match(/\.pdf$/i));
  const isPdf = file.name?.match(/\.pdf$/i) || file.type === "application/pdf";

  return (
    <div className="group relative rounded-2xl overflow-hidden border border-gray-200 bg-gray-50 hover:shadow-lg transition-all duration-200">
      {isImage && !imgErr ? (
        <div className="relative">
          <img
            src={url}
            alt={file.name || "Uploaded file"}
            className="w-full h-32 object-cover"
            onError={() => setImgErr(true)}
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
            <a href={url} target="_blank" rel="noopener noreferrer"
              className="w-9 h-9 rounded-full bg-white/90 flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
              <Eye size={15} className="text-gray-800" />
            </a>
          </div>
        </div>
      ) : isPdf ? (
        <div className="h-32 flex flex-col items-center justify-center gap-2 bg-red-50">
          <div className="w-10 h-12 rounded-lg bg-red-100 flex items-center justify-center">
            <FileText size={20} className="text-red-500" />
          </div>
          <span className="text-xs font-bold text-red-600">PDF Document</span>
        </div>
      ) : (
        <div className="h-32 flex flex-col items-center justify-center gap-2 bg-gray-100">
          <Paperclip size={24} className="text-gray-400" />
          <span className="text-xs text-gray-500 font-semibold">File</span>
        </div>
      )}
      <div className="p-2.5 flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold text-gray-700 truncate flex-1 min-w-0">{file.name || "Document"}</p>
        <div className="flex gap-1 flex-shrink-0">
          {url && (
            <>
              <a href={url} target="_blank" rel="noopener noreferrer"
                className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center hover:bg-indigo-100 transition" title="View">
                <ExternalLink size={11} className="text-indigo-600" />
              </a>
              <a href={url} download
                className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition" title="Download">
                <Download size={11} className="text-gray-600" />
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Answer Renderer ──────────────────────────────────────────
function AnswerBlock({ answer, index }) {
  const [open, setOpen] = useState(true);
  const hasFiles = answer.filesJson && (Array.isArray(answer.filesJson) ? answer.filesJson.length > 0 : false);
  const hasText  = answer.answerText && answer.answerText.trim();
  const hasJson  = answer.answerJson && (Array.isArray(answer.answerJson) ? answer.answerJson.length > 0 : false);
  const isEmpty  = !hasFiles && !hasText && !hasJson;

  return (
    <div className="rounded-2xl border border-gray-100 overflow-hidden bg-white shadow-sm">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition text-left"
      >
        <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white flex-shrink-0"
          style={{ background: isEmpty ? "#d1d5db" : "#6366f1" }}>
          {index + 1}
        </span>
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <QIcon type={answer.questionType} />
          <span className="text-sm font-bold text-gray-800 truncate">{answer.label}</span>
          {isEmpty && <span className="text-[10px] text-gray-400 font-semibold italic flex-shrink-0">No answer</span>}
        </div>
        <span className={`transition-transform flex-shrink-0 ${open ? "rotate-0" : "-rotate-90"}`}>
          <ChevronDown size={14} className="text-gray-400" />
        </span>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1">
          {isEmpty ? (
            <p className="text-xs text-gray-400 italic bg-gray-50 rounded-xl px-4 py-3">Not answered</p>
          ) : hasFiles ? (
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">
                {Array.isArray(answer.filesJson) ? `${answer.filesJson.length} file(s) uploaded` : "Uploaded files"}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {(Array.isArray(answer.filesJson) ? answer.filesJson : []).map((f, i) => (
                  <FileCard key={i} file={f} />
                ))}
              </div>
            </div>
          ) : hasJson ? (
            <div className="flex flex-wrap gap-2">
              {(Array.isArray(answer.answerJson) ? answer.answerJson : [answer.answerJson]).map((v, i) => (
                <span key={i} className="px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-100">
                  {v}
                </span>
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-xl px-4 py-3">
              {answer.questionType === "yesno" ? (
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-black ${
                  answer.answerText === "Yes"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-red-100 text-red-600"
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
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  MAIN MODAL
// ═══════════════════════════════════════════════════════════════
export default function ApplicantDetailModal({ app: initialApp, onClose, onStatusChange }) {
  const [app,        setApp]       = useState(initialApp);
  const [fullApp,    setFullApp]   = useState(null);
  const [loading,    setLoading]   = useState(true);
  const [saving,     setSaving]    = useState(false);
  const [notes,      setNotes]     = useState(initialApp?.notes || "");
  const [saved,      setSaved]     = useState(false);
  const [activeTab,  setActiveTab] = useState("answers"); // "answers" | "profile"

  // Load full application with answers
  useEffect(() => {
    if (!app?.id) return;
    setLoading(true);
    fetch(`${ADMISSION_API}/applications/${app.id}`, { credentials: "include" })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setFullApp(d.data);
          setNotes(d.data.notes || "");
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [app?.id]);

  const updateStatus = async (status) => {
    setSaving(true);
    try {
      await fetch(`${ADMISSION_API}/applications/${app.id}/status`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, notes }),
      });
      const updated = { ...app, status, notes };
      setApp(updated);
      if (fullApp) setFullApp(f => ({ ...f, status, notes }));
      onStatusChange?.(app.id, status);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
    finally { setSaving(false); }
  };

  const saveNotes = async () => {
    setSaving(true);
    try {
      await fetch(`${ADMISSION_API}/applications/${app.id}/status`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: app.status, notes }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
    finally { setSaving(false); }
  };

  const st = getStatus(app?.status);
  const answers = fullApp?.answers || [];
  const fileAnswers = answers.filter(a => a.filesJson && Array.isArray(a.filesJson) && a.filesJson.length > 0);
  const totalFiles  = fileAnswers.reduce((s, a) => s + (a.filesJson?.length || 0), 0);

  return (
    <div
      className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <div className="w-full sm:max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: "92vh", fontFamily: "'Nunito', system-ui, sans-serif" }}>

        {/* ── Header ── */}
        <div className="flex-shrink-0 bg-gradient-to-r from-slate-900 to-indigo-950 px-5 py-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center flex-shrink-0">
                <span className="text-lg font-black text-indigo-300">
                  {(app?.applicant_name || "?")[0].toUpperCase()}
                </span>
              </div>
              <div className="min-w-0">
                <h2 className="text-white font-black text-base truncate">{app?.applicant_name}</h2>
                <p className="text-indigo-300 text-xs font-mono">{app?.reference_no}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => window.print?.()}
                className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition"
                title="Print"
              >
                <Printer size={13} className="text-white/70" />
              </button>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition"
              >
                <X size={14} className="text-white" />
              </button>
            </div>
          </div>

          {/* Status + meta row */}
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black border ${st.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
              {st.label}
            </span>
            {app?.applicant_email && (
              <a href={`mailto:${app.applicant_email}`}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-white/10 text-white/70 text-[11px] font-semibold hover:bg-white/20 transition truncate max-w-[180px]">
                <Mail size={10} />{app.applicant_email}
              </a>
            )}
            {app?.applicant_phone && (
              <a href={`tel:${app.applicant_phone}`}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-white/10 text-white/70 text-[11px] font-semibold hover:bg-white/20 transition">
                <Phone size={10} />{app.applicant_phone}
              </a>
            )}
            <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-white/10 text-white/60 text-[11px]">
              <Calendar size={10} />
              {new Date(app?.submitted_at || app?.created_at).toLocaleDateString("en-RW", {
                day: "numeric", month: "short", year: "numeric"
              })}
            </span>
            {totalFiles > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-bold">
                <Paperclip size={10} />{totalFiles} file{totalFiles !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>

        {/* ── Tab Bar ── */}
        <div className="flex-shrink-0 bg-gray-50 border-b border-gray-200 px-5 flex gap-0">
          {[
            { key: "answers",   label: `Answers (${answers.length})`, icon: MessageSquare },
            { key: "documents", label: `Documents (${totalFiles})`,   icon: Paperclip },
            { key: "status",    label: "Status & Notes",              icon: CheckCircle },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-3 text-xs font-black border-b-2 -mb-px transition-colors ${
                activeTab === tab.key
                  ? "border-indigo-600 text-indigo-700"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              }`}>
              <tab.icon size={12} />{tab.label}
            </button>
          ))}
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 size={28} className="animate-spin text-indigo-500" />
              <p className="text-sm text-gray-400 font-semibold">Loading application details…</p>
            </div>
          ) : (
            <>
              {/* ANSWERS TAB */}
              {activeTab === "answers" && (
                <div className="space-y-2">
                  {answers.length === 0 ? (
                    <div className="text-center py-12 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200">
                      <MessageSquare size={28} className="mx-auto text-gray-300 mb-3" />
                      <p className="text-gray-500 font-bold text-sm">No answers recorded</p>
                      <p className="text-gray-400 text-xs mt-1">This applicant's form answers are not available.</p>
                    </div>
                  ) : (
                    answers.map((ans, i) => (
                      <AnswerBlock key={ans.questionId || i} answer={ans} index={i} />
                    ))
                  )}
                </div>
              )}

              {/* DOCUMENTS TAB */}
              {activeTab === "documents" && (
                <div className="space-y-5">
                  {totalFiles === 0 ? (
                    <div className="text-center py-12 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200">
                      <Paperclip size={28} className="mx-auto text-gray-300 mb-3" />
                      <p className="text-gray-500 font-bold text-sm">No documents submitted</p>
                      <p className="text-gray-400 text-xs mt-1">This applicant didn't upload any files.</p>
                    </div>
                  ) : (
                    fileAnswers.map((ans, i) => (
                      <div key={i}>
                        <div className="flex items-center gap-2 mb-3">
                          <Paperclip size={13} className="text-indigo-500" />
                          <h4 className="text-xs font-black text-gray-700 uppercase tracking-wider">{ans.label}</h4>
                          <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                            {ans.filesJson?.length} file{ans.filesJson?.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {(ans.filesJson || []).map((f, j) => (
                            <FileCard key={j} file={f} />
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* STATUS TAB */}
              {activeTab === "status" && (
                <div className="space-y-5">
                  <div>
                    <p className="text-xs font-black text-gray-500 uppercase tracking-wider mb-3">Update Status</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {APP_STATUSES.map(s => (
                        <button
                          key={s.value}
                          onClick={() => updateStatus(s.value)}
                          disabled={saving}
                          className={`flex items-center gap-2.5 px-3.5 py-3 rounded-2xl text-sm font-black border-2 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 ${
                            app.status === s.value
                              ? `${s.color} ring-2 ring-offset-2 ${s.ring}`
                              : "bg-white border-gray-200 text-gray-600 hover:border-gray-400"
                          }`}
                        >
                          <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${s.dot}`} />
                          <span>{s.label}</span>
                          {app.status === s.value && <Check size={11} className="ml-auto flex-shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">
                      Internal Notes (not visible to applicant)
                    </label>
                    <textarea
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      rows={4}
                      placeholder="Add notes about this application…"
                      className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition bg-gray-50"
                    />
                    <button
                      onClick={saveNotes}
                      disabled={saving}
                      className="mt-2 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-black hover:bg-indigo-700 transition disabled:opacity-60"
                    >
                      {saving ? <Loader2 size={12} className="animate-spin" /> : saved ? <Check size={12} /> : null}
                      {saved ? "Saved!" : "Save Notes"}
                    </button>
                  </div>

                  {/* Application metadata */}
                  <div className="rounded-2xl bg-gray-50 border border-gray-200 p-4">
                    <h4 className="text-xs font-black text-gray-500 uppercase tracking-wider mb-3">Application Info</h4>
                    <div className="space-y-2">
                      {[
                        { label: "Reference No",  val: app.reference_no },
                        { label: "Submitted",      val: new Date(app.submitted_at || app.created_at).toLocaleString() },
                        { label: "Reviewed At",    val: app.reviewed_at ? new Date(app.reviewed_at).toLocaleString() : "—" },
                        { label: "Applicant Name", val: app.applicant_name },
                        { label: "Email",          val: app.applicant_email || "—" },
                        { label: "Phone",          val: app.applicant_phone || "—" },
                      ].map(r => (
                        <div key={r.label} className="flex justify-between gap-2 text-xs">
                          <span className="text-gray-400 font-bold">{r.label}</span>
                          <span className="text-gray-700 font-semibold text-right">{r.val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
