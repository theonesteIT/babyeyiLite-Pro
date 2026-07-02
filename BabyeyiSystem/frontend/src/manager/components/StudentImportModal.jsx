import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Upload, X, Loader2, FileSpreadsheet, Download } from "lucide-react";
import EducationLevelPicker from "../../Pages/School Manager/components/EducationLevelPicker";
import { formatClassWithStream, formatSchoolClassRowLabel } from "../../utils/classStreamGroups";
import schoolService from "../services/schoolService";
import {
  EDUCATION_LEVEL_OPTIONS,
  inferEducationLevelFromClass,
  normalizeEducationLevel,
  levelsPresentInCatalog,
  mergeWithDefaultClassCatalog,
} from "../../utils/educationLevelClasses";
import { downloadStudentImportTemplate } from "../utils/studentImportTemplate";

const API = import.meta.env.VITE_API_URL || "http://localhost:5100";

export default function StudentImportModal({ open, onClose, onImported, schoolId, toast }) {
  const [educationLevel, setEducationLevel] = useState("Primary");
  const [classes, setClasses] = useState([]);
  const [importClass, setImportClass] = useState("");
  const [importStream, setImportStream] = useState("");
  const [importYear, setImportYear] = useState("2025-2026");
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    if (!open || !schoolId) return;
    setResult(null);
    setFile(null);
    if (fileRef.current) fileRef.current.value = "";
    schoolService.getGroups(schoolId).then((res) => {
      if (res.success) setClasses(res.data || []);
    }).catch(() => setClasses([]));
  }, [open, schoolId]);

  const mergedCatalog = useMemo(() => {
    const labels = (classes || []).map((c) =>
      formatSchoolClassRowLabel(c) || `${c.group_name || ""} ${c.stream_name || ""}`.trim(),
    ).filter(Boolean);
    return mergeWithDefaultClassCatalog(labels, classes || []);
  }, [classes]);

  const classRows = useMemo(() => (mergedCatalog.rows || []).map((c) => ({
    ...c,
    label: formatSchoolClassRowLabel(c) || `${c.group_name || ""} ${c.stream_name || ""}`.trim(),
    id: c.id ?? formatSchoolClassRowLabel(c) || c.group_name,
  })), [mergedCatalog]);

  const levelOptions = useMemo(() => {
    const labels = classRows.map((c) => c.label).filter(Boolean);
    const present = levelsPresentInCatalog(labels, classRows);
    return present.length ? present : EDUCATION_LEVEL_OPTIONS;
  }, [classRows]);

  const filteredGroups = useMemo(() => {
    const seen = new Set();
    return classRows.filter((c) => {
      if (inferEducationLevelFromClass(c.label, c) !== normalizeEducationLevel(educationLevel)) return false;
      const g = String(c.group_name || "").trim();
      if (!g || seen.has(g)) return false;
      seen.add(g);
      return true;
    });
  }, [classRows, educationLevel]);

  const streamsForClass = useMemo(() => classRows.filter((c) =>
    String(c.group_name || "").trim() === importClass &&
    inferEducationLevelFromClass(c.label, c) === normalizeEducationLevel(educationLevel)
  ), [classRows, importClass, educationLevel]);

  useEffect(() => {
    if (!open) return;
    if (levelOptions.some((o) => o.id === educationLevel)) return;
    if (levelOptions[0]) setEducationLevel(levelOptions[0].id);
  }, [open, levelOptions, educationLevel]);

  useEffect(() => {
    setImportClass("");
    setImportStream("");
  }, [educationLevel]);

  const handleImport = async () => {
    const yr = importYear.trim();
    if (!importClass.trim() || !yr || !file) {
      toast?.("Select education level, class, year, and Excel file.", "error");
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("importMode", "insert_only");
      fd.append("class_name", importClass.trim());
      if (importStream.trim()) fd.append("stream", importStream.trim());
      fd.append("academic_year", yr);
      fd.append("education_level", normalizeEducationLevel(educationLevel));
      const res = await fetch(`${API}/api/students/import`, { method: "POST", credentials: "include", body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        setResult({ ok: false, message: json.message || "Import failed." });
        toast?.(json.message || "Import failed", "error");
      } else {
        setResult({ ok: true, message: json.message });
        toast?.(`Imported ${json.inserted || 0} students`, "success");
        onImported?.();
        onClose?.();
      }
    } catch {
      setResult({ ok: false, message: "Cannot connect to server." });
      toast?.("Import failed", "error");
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#0A192F]/60 backdrop-blur-md" onClick={() => !busy && onClose?.()} />
      <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-white rounded-3xl shadow-2xl border border-black/5">
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-black/5 bg-white">
          <div>
            <h2 className="text-sm font-semibold text-[#1E3A5F] uppercase tracking-widest">Import students from Excel</h2>
            <p className="text-[10px] text-re-text-muted mt-1">Choose level and class, then upload your roster file.</p>
          </div>
          <button type="button" onClick={onClose} disabled={busy} className="p-2 rounded-xl hover:bg-re-bg text-re-text-muted">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <EducationLevelPicker
            value={educationLevel}
            onChange={setEducationLevel}
            options={levelOptions}
            title="Education level for this import"
            hint="Pick the level, then choose class and stream from the list."
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="block">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-re-text-muted">Class / grade</span>
              <select
                value={importClass}
                onChange={(e) => { setImportClass(e.target.value); setImportStream(""); }}
                className="mt-1 w-full h-11 rounded-xl border border-black/10 px-3 text-sm font-semibold text-[#1E3A5F] bg-re-bg/30"
              >
                <option value="">{filteredGroups.length ? "Select…" : "No classes on this level"}</option>
                {filteredGroups.map((c) => (
                  <option key={c.id} value={c.group_name}>{c.group_name}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-re-text-muted">Stream (optional)</span>
              <select
                value={importStream}
                onChange={(e) => setImportStream(e.target.value)}
                disabled={!importClass}
                className="mt-1 w-full h-11 rounded-xl border border-black/10 px-3 text-sm font-semibold text-[#1E3A5F] bg-re-bg/30 disabled:opacity-50"
              >
                <option value="">— none —</option>
                {streamsForClass.filter((c) => c.stream_name).map((c) => (
                  <option key={c.id} value={c.stream_name}>{c.stream_name}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-re-text-muted">Academic year</span>
              <input
                value={importYear}
                onChange={(e) => setImportYear(e.target.value)}
                className="mt-1 w-full h-11 rounded-xl border border-black/10 px-3 text-sm font-semibold text-[#1E3A5F] bg-re-bg/30"
                placeholder="2025-2026"
              />
            </label>
          </div>

          {importClass ? (
            <p className="text-[11px] text-slate-600 rounded-xl bg-slate-50 border border-slate-100 px-3 py-2">
              Import target: <strong>{formatClassWithStream(importClass, importStream)}</strong> · {educationLevel} · {importYear}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => downloadStudentImportTemplate()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-black/10 text-[10px] font-semibold uppercase tracking-widest text-[#1E3A5F] hover:bg-re-bg"
            >
              <Download size={14} /> Download template
            </button>
          </div>

          <label className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50/40 px-4 py-8 cursor-pointer hover:bg-amber-50/70">
            <FileSpreadsheet size={28} className="text-amber-600" />
            <span className="text-sm font-semibold text-[#1E3A5F]">{file ? file.name : "Choose Excel file (.xlsx)"}</span>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </label>

          {result ? (
            <p className={`text-xs font-semibold rounded-xl px-3 py-2 ${result.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>
              {result.message}
            </p>
          ) : null}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} disabled={busy} className="px-5 py-2.5 rounded-xl border border-black/10 text-xs font-semibold uppercase tracking-widest">
              Cancel
            </button>
            <button
              type="button"
              onClick={handleImport}
              disabled={busy || !file || !importClass.trim()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1E3A5F] text-white text-xs font-semibold uppercase tracking-widest disabled:opacity-50"
            >
              {busy ? <><Loader2 size={14} className="animate-spin" /> Importing…</> : <><Upload size={14} /> Import</>}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
