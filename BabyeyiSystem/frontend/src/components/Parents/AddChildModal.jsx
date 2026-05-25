// ================================================================
// AddChildModal — link by student code (API) or add local profile
// ================================================================

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { X, Loader2, Hash, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import { addLocalChild } from "../../utils/parentLocalChildren";
import { useAuth } from "../../context/AuthContext";

const API = import.meta.env.VITE_API_URL || "http://localhost:5100";

export default function AddChildModal({ open, onClose, onSaved, onLinked }) {
  const auth = useAuth();
  const [code, setCode] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState([]);
  const [linking, setLinking] = useState(false);
  const [selectedResultId, setSelectedResultId] = useState(null);
  const [linkErr, setLinkErr] = useState(null);
  const [linkOk, setLinkOk] = useState(null);
  const [limitedLinked, setLimitedLinked] = useState(null);
  const [requestingFull, setRequestingFull] = useState(false);
  const [requestMsg, setRequestMsg] = useState("");
  const [showLocal, setShowLocal] = useState(false);

  const [childName, setChildName] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [grade, setGrade] = useState("P4");
  const [localErr, setLocalErr] = useState(null);

  useEffect(() => {
    if (!open) return;
    setCode("");
    setSearching(false);
    setResults([]);
    setLinking(false);
    setSelectedResultId(null);
    setLinkErr(null);
    setLinkOk(null);
    setLimitedLinked(null);
    setRequestingFull(false);
    setRequestMsg("");
    setShowLocal(false);
    setChildName("");
    setSchoolName("");
    setGrade("P4");
    setLocalErr(null);
  }, [open]);

  if (!open) return null;

  const searchStudents = async (e) => {
    e?.preventDefault();
    setLinkErr(null);
    setLinkOk(null);
    setLimitedLinked(null);
    setResults([]);
    const trimmed = code.trim();
    if (trimmed.length < 2) {
      setLinkErr("Enter at least 2 characters (student code or full name)");
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`${API}/api/parent-portal/search-students?q=${encodeURIComponent(trimmed)}`, {
        credentials: "include",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        setLinkErr(json.message || "Could not search learners");
        return;
      }
      setResults(Array.isArray(json.data) ? json.data : []);
      if (!json.data?.length) setLinkErr("not_found");
    } catch {
      setLinkErr("Network error — try again");
    } finally {
      setSearching(false);
    }
  };

  const addStudent = async (student) => {
    setLinkErr(null);
    setLinkOk(null);
    setLimitedLinked(null);
    setSelectedResultId(student?.id || null);
    setLinking(true);
    try {
      const res = await fetch(`${API}/api/parent-portal/link-student-by-code`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_id: student?.id, code: student?.student_uid || student?.student_code }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        setLinkErr(json.message || "Could not add this learner");
        return;
      }
      onLinked?.();
      if (json.access_type === "LIMITED") {
        setLimitedLinked(json.data || student);
        return;
      }
      setLinkOk(json.data || student);
      setTimeout(() => onClose?.(), 900);
    } catch {
      setLinkErr("Network error — try again");
    } finally {
      setLinking(false);
      setSelectedResultId(null);
    }
  };

  const submitLocal = (e) => {
    e.preventDefault();
    setLocalErr(null);
    if (!childName.trim()) {
      setLocalErr("Please enter your child’s name");
      return;
    }
    addLocalChild({
      childName,
      schoolName,
      grade,
      parentPhone: auth.user?.parent_phone || null,
    });
    onSaved?.();
    onClose?.();
  };

  const requestFullAccess = async () => {
    const studentId = Number(limitedLinked?.id || 0);
    if (!studentId) return;
    setRequestingFull(true);
    setRequestMsg("");
    try {
      const res = await fetch(`${API}/api/parent-portal/access-requests`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: studentId,
          purpose: "full_access_request",
          message: "Please review and grant full parent access for academic and school records.",
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        setRequestMsg(json.message || "Could not submit full access request");
        return;
      }
      setRequestMsg("Full access request sent to school admin.");
    } catch {
      setRequestMsg("Network error — try again");
    } finally {
      setRequestingFull(false);
    }
  };

  const trackLimitedAction = async (actionType) => {
    const studentId = Number(limitedLinked?.id || 0);
    if (!studentId) return;
    try {
      await fetch(`${API}/api/parent-portal/limited-actions/log`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: studentId,
          action_type: actionType,
          payload: { source: "add_child_modal" },
        }),
      });
    } catch {
      // no-op; navigation should continue even if log fails
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-child-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-100 max-h-[92dvh] overflow-y-auto">
        <div className="sticky top-0 flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-white/95 backdrop-blur-sm rounded-t-3xl z-10">
          <h2 id="add-child-title" className="text-lg font-extrabold text-slate-900">
            Add learner
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-500 hover:bg-slate-100"
            aria-label="Close"
          >
            <X size={22} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <form onSubmit={searchStudents} className="space-y-3">
            <label className="block">
              <span className="text-sm font-bold text-slate-800 mb-1.5 flex items-center gap-2">
                <Hash className="w-4 h-4 text-orange-500" />
                Student code / Full name
              </span>
              <input
                className="w-full rounded-xl border-2 border-slate-200 px-4 py-3.5 text-slate-900 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-400/15 font-mono text-sm"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  setLinkErr(null);
                  setLinkOk(null);
                  setLimitedLinked(null);
                  setResults([]);
                }}
                placeholder="e.g. BEY123456789 or Uwase Diane"
                autoComplete="off"
                disabled={linking || searching}
              />
            </label>

            {linkErr && linkErr !== "not_found" && (
              <p className="text-sm font-semibold text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{linkErr}</p>
            )}

            {linkErr === "not_found" && (
              <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50/80 p-4 space-y-3">
                <p className="text-sm font-bold text-amber-950">No learner found with that code or SDM ID</p>
                <p className="text-sm text-amber-900/90 leading-relaxed">
                  Your child must be registered by a school on Babyeyi first. Choose a school and ask them to add your
                  learner — then you can link your account here.
                </p>
                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <Link
                    to="/schools"
                    className="inline-flex items-center justify-center rounded-xl bg-orange-600 px-4 py-3 text-sm font-bold text-white hover:bg-orange-700 transition-colors"
                    onClick={onClose}
                  >
                    Find a school
                  </Link>
                  <Link
                    to="/register"
                    className="inline-flex items-center justify-center rounded-xl border-2 border-amber-300 bg-white px-4 py-3 text-sm font-bold text-amber-950 hover:bg-amber-50 transition-colors"
                    onClick={onClose}
                  >
                    Register a school on Babyeyi
                  </Link>
                </div>
              </div>
            )}

            {results.length > 0 && (
              <div className="space-y-2.5">
                {results.map((student) => {
                  const isOfficial = !!student?.officially_linked;
                  return (
                    <div key={student.id} className="rounded-2xl border border-slate-200 bg-white p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 truncate">
                            {student.first_name} {student.last_name}
                          </p>
                          <p className="text-xs text-slate-600 mt-1">
                            {student.school_name || "School"} · {student.class_name || "Class"}
                          </p>
                          {!isOfficial && (
                            <p className="mt-2 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 inline-flex items-center gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              You are not registered as this student&apos;s parent.
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          disabled={linking}
                          onClick={() => addStudent(student)}
                          className="shrink-0 rounded-xl bg-orange-500 text-white text-xs font-bold px-3 py-2 hover:bg-orange-600 disabled:opacity-50"
                        >
                          {linking && selectedResultId === student.id ? "Adding..." : "+ Add Student"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {linkOk && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 font-semibold">
                Linked {linkOk.first_name} {linkOk.last_name}
                {linkOk.school_name ? ` · ${linkOk.school_name}` : ""}
              </div>
            )}

            {limitedLinked && (
              <div className="rounded-2xl border border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 p-4 space-y-3">
                <p className="text-sm font-extrabold text-amber-950">You have Limited Access to this student.</p>
                <div className="text-xs text-amber-950 space-y-1">
                  <p className="font-bold">You can:</p>
                  <p>• Add Pocket Money (ShuleCard)</p>
                  <p>• Buy ShuliKit / ClassKit</p>
                  <p className="font-bold mt-2">You cannot:</p>
                  <p>• View attendance, discipline, reports, or transactions</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  <Link to="/parents/shulecard" onClick={() => { trackLimitedAction("open_pocket_money"); onClose?.(); }} className="rounded-xl bg-orange-500 text-white text-xs font-bold px-3 py-2 text-center">
                    Add Pocket Money
                  </Link>
                  <Link to="/parents/classkit" onClick={() => { trackLimitedAction("open_buy_classkit"); onClose?.(); }} className="rounded-xl border border-orange-300 text-orange-700 bg-white text-xs font-bold px-3 py-2 text-center">
                    Buy ClassKit
                  </Link>
                  <Link to="/parents/shop" onClick={() => { trackLimitedAction("open_buy_shulikit"); onClose?.(); }} className="rounded-xl border border-orange-300 text-orange-700 bg-white text-xs font-bold px-3 py-2 text-center">
                    Buy ShuliKit
                  </Link>
                </div>
                <button
                  type="button"
                  onClick={requestFullAccess}
                  disabled={requestingFull}
                  className="w-full rounded-xl border border-amber-300 bg-white text-amber-800 text-xs font-bold px-3 py-2 hover:bg-amber-50 disabled:opacity-60"
                >
                  {requestingFull ? "Sending request..." : "Request Full Access"}
                </button>
                {requestMsg && <p className="text-xs font-semibold text-amber-900">{requestMsg}</p>}
              </div>
            )}

            <button
              type="submit"
              disabled={linking || searching}
              className="w-full rounded-2xl py-4 font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 shadow-lg shadow-orange-500/25 hover:brightness-105 active:scale-[0.99] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {searching ? (
                <>
                  <Loader2 className="animate-spin w-5 h-5" />
                  Searching learners…
                </>
              ) : (
                "Search learner"
              )}
            </button>
          </form>

          <button
            type="button"
            onClick={() => setShowLocal((s) => !s)}
            className="w-full flex items-center justify-between gap-2 text-sm font-bold text-slate-600 py-2 border-t border-slate-100"
          >
            <span>Or add a local profile (for Classkit planning only)</span>
            {showLocal ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>

          {showLocal && (
            <form onSubmit={submitLocal} className="space-y-4 pt-1 border-t border-slate-100">
              {localErr && (
                <p className="text-sm font-semibold text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{localErr}</p>
              )}
              <label className="block">
                <span className="text-sm font-bold text-slate-800 mb-1.5 block">
                  Child name <span className="text-red-500">*</span>
                </span>
                <input
                  className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-slate-900 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-400/15"
                  value={childName}
                  onChange={(e) => setChildName(e.target.value)}
                  placeholder="e.g. Uwase Diane"
                  autoComplete="name"
                />
              </label>
              <label className="block">
                <span className="text-sm font-bold text-slate-800 mb-1.5 block">School name</span>
                <input
                  className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-slate-900 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-400/15"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  placeholder="e.g. GS Kimironko"
                />
              </label>
              <label className="block">
                <span className="text-sm font-bold text-slate-800 mb-1.5 block">Grade / class</span>
                <select
                  className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-slate-900 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-400/15 bg-white"
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                >
                  {["P1", "P2", "P3", "P4", "P5", "P6", "S1", "S2", "S3", "S4", "S5", "S6"].map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="submit"
                className="w-full rounded-2xl py-3.5 font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                Save local profile
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
