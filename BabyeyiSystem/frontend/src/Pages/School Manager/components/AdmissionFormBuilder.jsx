// AdmissionFormBuilder.jsx  — v2.0
// ================================================================
//  School Manager — Admission Form Builder
//
//  NEW in v2.0:
//   • onNext / onBack props  → "Save & Continue" navigates to next step
//   • "Back" button in footer for step navigation
//   • Full applicants panel: search, filter, sort, status chips, detail modal
//   • Applicant detail bottom-sheet (mobile) / modal (desktop) with answers
//   • Responsive – mobile-card list + desktop table
//   • Stat cards with icons
// ================================================================
import { useState, useEffect, useCallback } from "react";
import {
  Plus, Trash2, GripVertical, ChevronDown, ChevronUp,
  Save, CheckCircle, AlertCircle, Loader2, Users,
  Calendar, Hash, ToggleLeft, ToggleRight, List,
  FileText, Upload, AlignLeft, Type, Settings2,
  Eye, ChevronRight, X, Check, Search,
  Mail, Phone, Clock,
  ChevronLeft, RefreshCw, User, BookOpen, Inbox,
  TrendingUp, Award, XCircle
} from "lucide-react";
import SmStatCard from "./SmStatCard";

const API = "http://localhost:5100/api/admissions";

const QUESTION_TYPES = [
  { value: "text",        label: "Short Text",      icon: Type,        desc: "Single line input" },
  { value: "textarea",    label: "Long Text",        icon: AlignLeft,   desc: "Paragraph / multi-line" },
  { value: "yesno",       label: "Yes / No",         icon: ToggleLeft,  desc: "Radio: Yes or No" },
  { value: "select",      label: "Dropdown",         icon: List,        desc: "Choose one option" },
  { value: "multiselect", label: "Multiple Choice",  icon: CheckCircle, desc: "Choose many options" },
  { value: "file",        label: "File Upload",      icon: Upload,      desc: "Single file or image" },
  { value: "multifile",   label: "Multiple Files",   icon: FileText,    desc: "Up to N files/images" },
];

const APP_STATUSES = [
  { value: "pending",    label: "Pending",    color: "bg-amber-100 text-amber-700",   dot: "bg-amber-500"  },
  { value: "reviewed",   label: "Reviewed",   color: "bg-blue-100 text-blue-700",     dot: "bg-blue-500"   },
  { value: "accepted",   label: "Accepted",   color: "bg-green-100 text-green-700",   dot: "bg-green-500"  },
  { value: "rejected",   label: "Rejected",   color: "bg-red-100 text-red-700",       dot: "bg-red-500"    },
  { value: "waitlisted", label: "Waitlisted", color: "bg-purple-100 text-purple-700", dot: "bg-purple-500" },
];

const FORM_STATUSES = [
  { value: "draft",  label: "Draft",  color: "bg-gray-100 text-gray-600",   icon: BookOpen    },
  { value: "open",   label: "Open",   color: "bg-green-100 text-green-700", icon: CheckCircle },
  { value: "paused", label: "Paused", color: "bg-amber-100 text-amber-700", icon: Clock       },
  { value: "closed", label: "Closed", color: "bg-red-100 text-red-700",     icon: XCircle     },
];

const getSt = (status, list) => list.find(s => s.value === status) || list[0];

// ─── Tiny shared primitives ───────────────────────────────────
function Label({ children, required }) {
  return (
    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
      {children}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}
function Input({ className = "", ...props }) {
  return <input {...props}
    className={`w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition bg-white ${className}`} />;
}
function Textarea({ className = "", ...props }) {
  return <textarea {...props} rows={3}
    className={`w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition bg-white resize-none ${className}`} />;
}
function Sel({ children, className = "", ...props }) {
  return <select {...props}
    className={`w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition bg-white ${className}`}>
    {children}</select>;
}
function Toggle({ checked, onChange, label }) {
  return (
    <button type="button" onClick={() => onChange(!checked)}
      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all ${checked ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-500"}`}>
      {checked ? <ToggleRight size={16} className="text-indigo-600" /> : <ToggleLeft size={16} />}
      {label}
    </button>
  );
}

// ─── Question card ────────────────────────────────────────────
function QuestionCard({ q, idx, total, onChange, onRemove, onMove }) {
  const TypeIcon  = QUESTION_TYPES.find(t => t.value === q.questionType)?.icon || Type;
  const needsOpts = q.questionType === "select" || q.questionType === "multiselect";
  const needsFile = q.questionType === "file"   || q.questionType === "multifile";
  const addOpt    = () => {
    if (!q._optionInput?.trim()) return;
    onChange({ ...q, options: [...(q.options || []), q._optionInput.trim()], _optionInput: "" });
  };
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      {/* header */}
      <div className="flex items-center gap-2 sm:gap-3 px-4 py-3.5 cursor-pointer select-none"
        onClick={() => onChange({ ...q, _open: !q._open })}>
        <GripVertical size={14} className="text-gray-300 hidden sm:block flex-shrink-0" />
        <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
          <TypeIcon size={13} className="text-indigo-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-800 truncate">
            {q.label || <span className="text-gray-400 italic">Untitled question</span>}
          </p>
          <p className="text-xs text-gray-400 truncate">
            {QUESTION_TYPES.find(t => t.value === q.questionType)?.label}
            {q.isRequired && <span className="ml-1.5 text-red-400 font-bold">• Required</span>}
          </p>
        </div>
        <div className="flex items-center gap-0.5">
          <button type="button" disabled={idx === 0}
            onClick={e => { e.stopPropagation(); onMove(idx, -1); }}
            className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition"><ChevronUp size={12}/></button>
          <button type="button" disabled={idx === total - 1}
            onClick={e => { e.stopPropagation(); onMove(idx, 1); }}
            className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition"><ChevronDown size={12}/></button>
          <button type="button" onClick={e => { e.stopPropagation(); onRemove(); }}
            className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition"><Trash2 size={12}/></button>
          <div className="ml-0.5 text-gray-400">{q._open ? <ChevronUp size={13}/> : <ChevronDown size={13}/>}</div>
        </div>
      </div>
      {/* body */}
      {q._open && (
        <div className="px-4 pb-4 pt-3 border-t border-gray-50 space-y-4">
          <div>
            <Label required>Question</Label>
            <Input value={q.label} onChange={e => onChange({ ...q, label: e.target.value })}
              placeholder="e.g. Student's full name" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Type</Label>
              <Sel value={q.questionType} onChange={e => onChange({ ...q, questionType: e.target.value, options: [] })}>
                {QUESTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </Sel>
            </div>
            <div>
              <Label>Placeholder</Label>
              <Input value={q.placeholder || ""} onChange={e => onChange({ ...q, placeholder: e.target.value })}
                placeholder="Hint text (optional)" />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Toggle checked={q.isRequired} onChange={v => onChange({ ...q, isRequired: v })} label="Required" />
            {needsFile && (
              <>
                <Toggle checked={q.questionType === "multifile"}
                  onChange={v => onChange({ ...q, questionType: v ? "multifile" : "file" })}
                  label="Allow multiple files" />
                {q.questionType === "multifile" && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 font-bold">Max:</span>
                    <select value={q.maxFiles||5} onChange={e => onChange({ ...q, maxFiles: parseInt(e.target.value) })}
                      className="text-xs px-2 py-1.5 rounded-lg border border-gray-200 focus:outline-none bg-white">
                      {[1,2,3,5,10].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                )}
              </>
            )}
          </div>
          {needsOpts && (
            <div>
              <Label>Options</Label>
              {(q.options||[]).length > 0 && (
                <div className="mb-2 flex flex-wrap gap-2">
                  {q.options.map((opt, i) => (
                    <span key={i} className="flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-bold">
                      {opt}
                      <button type="button" onClick={() => onChange({ ...q, options: q.options.filter((_,j) => j!==i) })}
                        className="hover:text-red-500"><X size={9}/></button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Input value={q._optionInput||""} onChange={e => onChange({ ...q, _optionInput: e.target.value })}
                  onKeyDown={e => { if (e.key==="Enter") { e.preventDefault(); addOpt(); } }}
                  placeholder="Type option and press Enter" />
                <button type="button" onClick={addOpt}
                  className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition flex-shrink-0">Add</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Applicant Detail Modal ───────────────────────────────────
function AppDetailModal({ app, onClose, onStatusChange }) {
  if (!app) return null;
  const st = getSt(app.status, APP_STATUSES);
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 flex items-center justify-center">
              <span className="text-base font-black text-indigo-600">{(app.applicant_name||"?")[0].toUpperCase()}</span>
            </div>
            <div>
              <h3 className="font-black text-gray-900 text-sm">{app.applicant_name}</h3>
              <p className="text-xs text-gray-400 font-mono">{app.reference_no}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-black ${st.color}`}>{st.label}</span>
            <button onClick={onClose} className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition">
              <X size={14}/>
            </button>
          </div>
        </div>
        {/* body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {app.applicant_email && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 overflow-hidden">
                <Mail size={13} className="text-gray-400 flex-shrink-0"/>
                <span className="text-xs text-gray-700 truncate">{app.applicant_email}</span>
              </div>
            )}
            {app.applicant_phone && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-50">
                <Phone size={13} className="text-gray-400 flex-shrink-0"/>
                <span className="text-xs text-gray-700">{app.applicant_phone}</span>
              </div>
            )}
            <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 col-span-full">
              <Clock size={13} className="text-gray-400 flex-shrink-0"/>
              <span className="text-xs text-gray-700">Submitted: {new Date(app.submitted_at||app.created_at).toLocaleString()}</span>
            </div>
          </div>
          {(app.answers||[]).length > 0 && (
            <div>
              <h4 className="text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Answers</h4>
              <div className="space-y-2">
                {app.answers.map((ans, i) => (
                  <div key={i} className="p-3 rounded-xl border border-gray-100 bg-gray-50">
                    <p className="text-xs font-bold text-gray-400 mb-1">{ans.question_label||`Question ${i+1}`}</p>
                    <p className="text-sm text-gray-800 font-medium">
                      {ans.answer_text || (ans.answer_json ? JSON.stringify(ans.answer_json) : "—")}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        {/* status footer */}
        <div className="flex-shrink-0 px-5 py-4 border-t border-gray-100 bg-gray-50">
          <p className="text-xs font-black text-gray-500 mb-2.5">Update Status</p>
          <div className="flex flex-wrap gap-2">
            {APP_STATUSES.map(s => (
              <button key={s.value} onClick={() => { onStatusChange(app.id, s.value); onClose(); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1 ${
                  app.status === s.value
                    ? `${s.color} ring-2 ring-offset-1 ring-current`
                    : "bg-white border border-gray-200 text-gray-600 hover:border-gray-400"
                }`}>
                {app.status === s.value && <Check size={9}/>}
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  MAIN
// ═══════════════════════════════════════════════════════════════
export default function AdmissionFormBuilder({ schoolId, toast, onNext, onBack }) {
  const [form,         setForm]         = useState(null);
  const [questions,    setQuestions]    = useState([]);
  const [stats,        setStats]        = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [saved,        setSaved]        = useState(false);
  const [statusBusy,   setStatusBusy]   = useState(false);
  const [error,        setError]        = useState(null);
  const [tab,          setTab]          = useState("form");
  const [apps,         setApps]         = useState([]);
  const [appsLoading,  setAppsLoading]  = useState(false);
  const [detailApp,    setDetailApp]    = useState(null);
  const [search,       setSearch]       = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy,       setSortBy]       = useState("newest");

  // Meta fields
  const [title,         setTitle]        = useState("Online Admission Application");
  const [description,   setDescription]  = useState("");
  const [academicYear,  setAcademicYear] = useState("");
  const [appStart,      setAppStart]     = useState("");
  const [appDeadline,   setAppDeadline]  = useState("");
  const [maxApplicants, setMaxApplicants]= useState("");

  // Load existing form
  const load = useCallback(async () => {
    if (!schoolId) { setLoading(false); return; }
    try {
      const r = await fetch(`${API}/school/${schoolId}`, { credentials: "include" });
      const d = await r.json();
      if (d.success && d.data) {
        const f = d.data;
        setForm(f);
        setTitle(f.title || "");
        setDescription(f.description || "");
        setAcademicYear(f.academicYear || "");
        setAppStart(f.applicationStart ? f.applicationStart.slice(0,10) : "");
        setAppDeadline(f.applicationDeadline ? f.applicationDeadline.slice(0,10) : "");
        setMaxApplicants(f.maxApplicants || "");
        setQuestions((f.questions||[]).map(q => ({
          ...q, _id: q.id || Math.random().toString(36).slice(2),
          _optionInput: "", _open: false,
        })));
        const rs = await fetch(`${API}/forms/${f.id}/stats`, { credentials:"include" });
        const ds = await rs.json();
        if (ds.success) setStats(ds.data);
      }
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [schoolId]);

  useEffect(() => { load(); }, [load]);

  // Load applications
  const loadApps = useCallback(async () => {
    if (!form?.id) return;
    setAppsLoading(true);
    try {
      const r = await fetch(`${API}/forms/${form.id}/applications`, { credentials:"include" });
      const d = await r.json();
      if (d.success) setApps(d.data||[]);
    } catch {} finally { setAppsLoading(false); }
  }, [form?.id]);

  useEffect(() => { if (tab === "applications") loadApps(); }, [tab, loadApps]);

  // Save
  const save = async (andNext = false) => {
    if (!schoolId) return;
    setSaving(true); setSaved(false);
    try {
      const payload = {
        title, description, academicYear,
        applicationStart:    appStart    || null,
        applicationDeadline: appDeadline || null,
        maxApplicants:       maxApplicants ? parseInt(maxApplicants) : null,
        status: form?.status || "draft",
        questions: questions.map(q => ({
          label: q.label, questionType: q.questionType, placeholder: q.placeholder,
          options: q.options||[], isRequired: q.isRequired,
          allowMultiple: q.allowMultiple, maxFiles: q.maxFiles,
        })),
      };
      const r = await fetch(`${API}/school/${schoolId}`, {
        method: "POST", credentials:"include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (d.success) {
        toast?.("Admission form saved!", "success");
        setForm(d.data); setSaved(true);
        const rs = await fetch(`${API}/forms/${d.data.id}/stats`, { credentials:"include" });
        const ds = await rs.json();
        if (ds.success) setStats(ds.data);
        if (andNext && onNext) onNext();
      } else {
        toast?.(d.message || "Save failed", "error");
      }
    } catch (e) { toast?.(e.message, "error"); }
    finally { setSaving(false); }
  };

  // Status
  const changeStatus = async (newStatus) => {
    if (!form?.id) return;
    setStatusBusy(true);
    try {
      const r = await fetch(`${API}/forms/${form.id}/status`, {
        method:"PATCH", credentials:"include",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ status: newStatus }),
      });
      const d = await r.json();
      if (d.success) {
        toast?.(`Form ${newStatus}!`, "success");
        setForm(f => ({ ...f, status: newStatus }));
        setStats(s => s ? { ...s, status: newStatus, isOpen: newStatus==="open" } : s);
      }
    } catch (e) { toast?.(e.message,"error"); }
    finally { setStatusBusy(false); }
  };

  // App status
  const updateAppStatus = async (appId, status) => {
    try {
      await fetch(`${API}/applications/${appId}/status`, {
        method:"PATCH", credentials:"include",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ status }),
      });
      setApps(prev => prev.map(a => a.id===appId ? {...a, status} : a));
      toast?.(`Marked as ${status}`, "success");
    } catch {}
  };

  // Question helpers
  const addQuestion     = () => setQuestions(q => [...q, {
    _id: Math.random().toString(36).slice(2), label:"", questionType:"text",
    placeholder:"", options:[], isRequired:true, allowMultiple:false, maxFiles:5,
    _optionInput:"", _open:true
  }]);
  const removeQuestion  = (i) => setQuestions(q => q.filter((_,j) => j!==i));
  const updateQuestion  = (i, up) => setQuestions(q => q.map((x,j) => j===i ? up : x));
  const moveQuestion    = (i, dir) => setQuestions(q => {
    const a=[...q]; const j=i+dir;
    if (j<0||j>=a.length) return a;
    [a[i],a[j]]=[a[j],a[i]]; return a;
  });

  // Filtered + sorted apps
  const filteredApps = apps
    .filter(a => {
      const sq = search.toLowerCase();
      const matchSearch = !sq ||
        (a.applicant_name||"").toLowerCase().includes(sq) ||
        (a.reference_no||"").toLowerCase().includes(sq) ||
        (a.applicant_email||"").toLowerCase().includes(sq);
      return matchSearch && (filterStatus==="all" || a.status===filterStatus);
    })
    .sort((a,b) => {
      if (sortBy==="newest") return new Date(b.submitted_at||b.created_at) - new Date(a.submitted_at||a.created_at);
      if (sortBy==="oldest") return new Date(a.submitted_at||a.created_at) - new Date(b.submitted_at||b.created_at);
      if (sortBy==="name")   return (a.applicant_name||"").localeCompare(b.applicant_name||"");
      return 0;
    });

  const statusCounts = apps.reduce((acc, a) => { acc[a.status]=(acc[a.status]||0)+1; return acc; }, {});

  // ── Loading ─────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <Loader2 size={34} className="text-indigo-500 animate-spin mx-auto mb-3"/>
        <p className="text-gray-400 text-sm font-semibold">Loading admission form…</p>
      </div>
    </div>
  );

  const fmSt    = getSt(form?.status||"draft", FORM_STATUSES);
  const now     = new Date();
  const dead    = stats?.applicationDeadline ? new Date(stats.applicationDeadline) : null;
  const daysLeft= dead && dead>now ? Math.ceil((dead-now)/86400000) : null;

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-5 py-6 sm:py-8 space-y-5"
      style={{ fontFamily:"'Nunito',system-ui,sans-serif" }}>

      {/* ── PAGE HEADER ──────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack}
              className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition flex-shrink-0">
              <ChevronLeft size={16}/>
            </button>
          )}
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-gray-900">Admission System</h2>
            <p className="text-gray-500 text-sm mt-0.5">Online application form &amp; applicant tracking</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {form && (
            <span className={`px-3 py-1.5 rounded-full text-xs font-black ${fmSt.color} flex items-center gap-1.5`}>
              <span className={`w-2 h-2 rounded-full ${
                form.status==="open"   ? "bg-green-500 animate-pulse" :
                form.status==="paused" ? "bg-amber-500" :
                form.status==="closed" ? "bg-red-500" : "bg-gray-400"
              }`}/>
              {fmSt.label}
            </span>
          )}
          <button onClick={() => load()} title="Refresh"
            className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition">
            <RefreshCw size={14}/>
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm">
          <AlertCircle size={16} className="flex-shrink-0"/> {error}
          <button onClick={()=>setError(null)} className="ml-auto"><X size={14}/></button>
        </div>
      )}

      {/* ── STATS STRIP ──────────────────────────────────────── */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SmStatCard label="Applications" value={stats.applicantsCount ?? 0} />
          <SmStatCard
            label="Spots Allowed"
            value={stats.maxApplicants ?? "∞"}
            sub={stats.maxApplicants ? `${stats.spotsRemaining ?? 0} left` : "Unlimited"}
          />
          <SmStatCard
            label="Days Left"
            value={daysLeft ?? "—"}
            sub={dead ? `Deadline: ${dead.toLocaleDateString()}` : "No deadline set"}
          />
          <SmStatCard label="Form Status" value={fmSt.label} />
        </div>
      )}

      {/* ── FORM STATUS CONTROLS ──────────────────────────────── */}
      {form && (
        <div className="flex flex-wrap items-center gap-2 p-4 bg-gray-50 rounded-2xl border border-gray-100">
          <span className="text-xs font-black text-gray-500 w-full sm:w-auto mb-1 sm:mb-0">Form Status:</span>
          {FORM_STATUSES.map(s => (
            <button key={s.value} disabled={statusBusy||form.status===s.value}
              onClick={() => changeStatus(s.value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all capitalize ${
                form.status===s.value
                  ? `${s.color} ring-2 ring-offset-1 ring-current`
                  : "bg-white text-gray-500 border border-gray-200 hover:border-indigo-300 hover:text-indigo-600"
              }`}>
              {statusBusy && form.status!==s.value
                ? <Loader2 size={9} className="animate-spin"/> : <s.icon size={9}/>}
              {s.label}
            </button>
          ))}
          {form.status==="open" && form.id && (
            <a href={`/apply/${form.id}`} target="_blank" rel="noopener noreferrer"
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-indigo-600 text-white hover:bg-indigo-700 transition">
              <Eye size={11}/> Preview Form
            </a>
          )}
        </div>
      )}

      {/* ── TABS ─────────────────────────────────────────────── */}
      <div className="flex border-b border-gray-200 gap-0.5">
        {[
          { key:"form",         label:"Form Builder",  icon:Settings2 },
          { key:"applications", label:`Applicants${apps.length>0?` (${apps.length})`:""}`, icon:Inbox },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-black transition-colors border-b-2 -mb-px ${
              tab===t.key ? "border-indigo-600 text-indigo-700" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}>
            <t.icon size={14}/> {t.label}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════
          FORM BUILDER TAB
      ════════════════════════════════════════════════════════ */}
      {tab==="form" && (
        <div className="space-y-5">
          {/* Meta settings */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
            <h3 className="font-black text-gray-800 flex items-center gap-2 text-sm sm:text-base">
              <Settings2 size={16} className="text-indigo-600"/> Form Settings
            </h3>
            <div>
              <Label required>Form Title</Label>
              <Input value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. 2025–2026 Admission Application"/>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={description} onChange={e=>setDescription(e.target.value)}
                placeholder="Brief intro shown at top of form…"/>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label>Academic Year</Label>
                <Input value={academicYear} onChange={e=>setAcademicYear(e.target.value)} placeholder="2025-2026"/>
              </div>
              <div>
                <Label>Application Opens</Label>
                <Input type="date" value={appStart} onChange={e=>setAppStart(e.target.value)}/>
              </div>
              <div>
                <Label>Application Deadline</Label>
                <Input type="date" value={appDeadline} onChange={e=>setAppDeadline(e.target.value)}/>
              </div>
            </div>
            <div className="max-w-xs">
              <Label>Max Applicants</Label>
              <div className="relative">
                <Hash size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"/>
                <input type="number" min="1" value={maxApplicants}
                  onChange={e=>setMaxApplicants(e.target.value)}
                  placeholder="Leave empty for unlimited"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"/>
              </div>
              <p className="text-xs text-gray-400 mt-1">Students can't apply once this limit is reached.</p>
            </div>
          </div>

          {/* Questions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-gray-800 flex items-center gap-2 text-sm sm:text-base">
                <List size={16} className="text-indigo-600"/> Questions
                <span className="text-xs font-bold text-gray-400">({questions.length})</span>
              </h3>
            </div>
            {questions.length===0 ? (
              <div className="text-center py-14 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50">
                <div className="text-4xl mb-3">📝</div>
                <p className="text-gray-600 font-black text-sm">No questions yet</p>
                <p className="text-gray-400 text-xs mt-1 mb-4">Add questions applicants will fill in</p>
                <button type="button" onClick={addQuestion}
                  className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-black hover:bg-indigo-700 transition">
                  + Add First Question
                </button>
              </div>
            ) : (
              <>
                {questions.map((q,i) => (
                  <QuestionCard key={q._id||i} q={q} idx={i} total={questions.length}
                    onChange={up => updateQuestion(i,up)}
                    onRemove={() => removeQuestion(i)}
                    onMove={(idx,dir) => moveQuestion(idx,dir)}/>
                ))}
                <button type="button" onClick={addQuestion}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border-2 border-dashed border-indigo-200 text-indigo-600 font-bold text-sm hover:bg-indigo-50 transition">
                  <Plus size={15}/> Add Question
                </button>
              </>
            )}
          </div>

          {/* ── SAVE + NAVIGATION FOOTER ─────────────────────── */}
          <div className="sticky bottom-0 z-10">
            <div className="bg-white/95 backdrop-blur-sm border border-gray-100 rounded-2xl shadow-xl p-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                {/* Back */}
                {onBack && (
                  <button type="button" onClick={onBack}
                    className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 transition order-last sm:order-first">
                    <ChevronLeft size={14}/> Back
                  </button>
                )}
                <div className="flex-1"/>
                {/* Save only */}
                <button type="button" onClick={()=>save(false)} disabled={saving}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-white border-2 border-indigo-200 text-indigo-700 rounded-xl font-black text-sm hover:bg-indigo-50 transition disabled:opacity-60">
                  {saving ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>}
                  {saving ? "Saving…" : saved ? "Saved ✓" : "Save Form"}
                </button>
                {/* Save & Continue */}
                {onNext && (
                  <button type="button" onClick={()=>save(true)} disabled={saving}
                    className="flex items-center justify-center gap-2 px-6 py-3.5 bg-indigo-600 text-white rounded-xl font-black text-sm hover:bg-indigo-700 transition disabled:opacity-60 shadow-lg shadow-indigo-100">
                    {saving
                      ? <><Loader2 size={14} className="animate-spin"/> Saving…</>
                      : <><Save size={14}/> Save &amp; Continue <ChevronRight size={13}/></>
                    }
                  </button>
                )}
              </div>
              {saved && !saving && (
                <p className="text-center text-xs text-green-600 font-bold mt-2.5 flex items-center justify-center gap-1">
                  <Check size={11}/> Form saved — you can continue to next step
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          APPLICANTS TAB
      ════════════════════════════════════════════════════════ */}
      {tab==="applications" && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"/>
              <input value={search} onChange={e=>setSearch(e.target.value)}
                placeholder="Search by name, ref, email…"
                className="w-full pl-10 pr-8 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"/>
              {search && (
                <button onClick={()=>setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X size={12}/>
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}
                className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white font-semibold text-gray-700">
                <option value="all">All statuses</option>
                {APP_STATUSES.map(s=>(
                  <option key={s.value} value={s.value}>
                    {s.label}{statusCounts[s.value]?` (${statusCounts[s.value]})`:""}
                  </option>
                ))}
              </select>
              <select value={sortBy} onChange={e=>setSortBy(e.target.value)}
                className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white text-gray-700">
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="name">A–Z</option>
              </select>
              <button onClick={()=>loadApps()} title="Refresh"
                className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition flex-shrink-0">
                <RefreshCw size={13}/>
              </button>
            </div>
          </div>

          {/* Status filter chips */}
          {apps.length>0 && (
            <div className="flex flex-wrap gap-2">
              <button onClick={()=>setFilterStatus("all")}
                className={`px-3 py-1.5 rounded-full text-xs font-black transition ${filterStatus==="all"?"bg-gray-900 text-white":"bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                All ({apps.length})
              </button>
              {APP_STATUSES.filter(s=>statusCounts[s.value]>0).map(s=>(
                <button key={s.value} onClick={()=>setFilterStatus(s.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-black transition flex items-center gap-1 ${
                    filterStatus===s.value ? `${s.color} ring-2 ring-offset-1 ring-current` : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`}/>
                  {s.label} ({statusCounts[s.value]||0})
                </button>
              ))}
            </div>
          )}

          {/* List */}
          {appsLoading ? (
            <div className="flex flex-col items-center py-20">
              <Loader2 size={28} className="animate-spin text-indigo-500 mb-3"/>
              <p className="text-gray-400 text-sm">Loading applicants…</p>
            </div>
          ) : filteredApps.length===0 ? (
            <div className="text-center py-16 rounded-2xl bg-gray-50 border border-gray-100">
              <div className="text-5xl mb-3">{apps.length===0?"📬":"🔍"}</div>
              <p className="text-gray-700 font-black text-base">
                {apps.length===0 ? "No applications yet" : "No results found"}
              </p>
              <p className="text-gray-400 text-xs mt-1">
                {apps.length===0 ? "Submitted applications will appear here" : "Try a different search or filter"}
              </p>
              {apps.length>0 && search && (
                <button onClick={()=>{setSearch("");setFilterStatus("all");}}
                  className="mt-4 px-4 py-2 rounded-xl bg-indigo-50 text-indigo-600 text-xs font-black hover:bg-indigo-100 transition">
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <>
              <p className="text-xs text-gray-400 font-bold">
                Showing {filteredApps.length} of {apps.length} applicant{apps.length!==1?"s":""}
              </p>

              {/* Desktop table */}
              <div className="hidden sm:block rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-left">
                      <th className="px-4 py-3 font-black text-gray-500 text-xs uppercase">Ref</th>
                      <th className="px-4 py-3 font-black text-gray-500 text-xs uppercase">Applicant</th>
                      <th className="px-4 py-3 font-black text-gray-500 text-xs uppercase">Contact</th>
                      <th className="px-4 py-3 font-black text-gray-500 text-xs uppercase">Date</th>
                      <th className="px-4 py-3 font-black text-gray-500 text-xs uppercase">Status</th>
                      <th className="px-4 py-3 font-black text-gray-500 text-xs uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredApps.map(app => {
                      const st = getSt(app.status, APP_STATUSES);
                      return (
                        <tr key={app.id} className="hover:bg-indigo-50/40 transition cursor-pointer"
                          onClick={()=>setDetailApp(app)}>
                          <td className="px-4 py-3.5 font-mono text-xs text-gray-400 whitespace-nowrap">{app.reference_no}</td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                                <span className="text-xs font-black text-indigo-600">
                                  {(app.applicant_name||"?")[0].toUpperCase()}
                                </span>
                              </div>
                              <span className="font-bold text-gray-800">{app.applicant_name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-xs text-gray-500">
                            <div className="truncate max-w-[140px]">{app.applicant_email||""}</div>
                            <div>{app.applicant_phone||""}</div>
                          </td>
                          <td className="px-4 py-3.5 text-xs text-gray-400 whitespace-nowrap">
                            {new Date(app.submitted_at||app.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black ${st.color}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`}/>
                              {st.label}
                            </span>
                          </td>
                          <td className="px-4 py-3.5" onClick={e=>e.stopPropagation()}>
                            <select value={app.status} onChange={e=>updateAppStatus(app.id,e.target.value)}
                              className="text-xs px-2 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white">
                              {APP_STATUSES.map(s=><option key={s.value} value={s.value}>{s.label}</option>)}
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="sm:hidden space-y-3">
                {filteredApps.map(app => {
                  const st = getSt(app.status, APP_STATUSES);
                  return (
                    <div key={app.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 cursor-pointer active:bg-gray-50 transition"
                      onClick={()=>setDetailApp(app)}>
                      <div className="flex items-start justify-between gap-2 mb-2.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-black text-indigo-600">
                              {(app.applicant_name||"?")[0].toUpperCase()}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="font-black text-gray-900 text-sm truncate">{app.applicant_name}</p>
                            <p className="text-xs text-gray-400 font-mono">{app.reference_no}</p>
                          </div>
                        </div>
                        <span className={`flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black ${st.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`}/>
                          {st.label}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-gray-400">
                          {new Date(app.submitted_at||app.created_at).toLocaleDateString()}
                        </span>
                        <select value={app.status}
                          onChange={e=>{e.stopPropagation();updateAppStatus(app.id,e.target.value);}}
                          onClick={e=>e.stopPropagation()}
                          className="text-xs px-2 py-1.5 rounded-lg border border-gray-200 bg-white focus:outline-none">
                          {APP_STATUSES.map(s=><option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Nav footer — applicants tab */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            {onBack ? (
              <button onClick={onBack}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 transition">
                <ChevronLeft size={14}/> Back
              </button>
            ) : <div/>}
            {onNext && (
              <button onClick={onNext}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-black text-sm hover:bg-indigo-700 transition shadow-lg shadow-indigo-100">
                Continue <ChevronRight size={14}/>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Application detail modal */}
      {detailApp && (
        <AppDetailModal
          app={detailApp}
          onClose={()=>setDetailApp(null)}
          onStatusChange={updateAppStatus}
        />
      )}
    </div>
  );
}