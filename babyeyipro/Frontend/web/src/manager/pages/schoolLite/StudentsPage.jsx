import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  Upload, Plus, Users, Loader2, CheckCircle2, AlertTriangle,
  Search, RefreshCw, Pencil, Trash2, FileSpreadsheet, FileText,
  X, ChevronRight, Eye, MapPin, User, Phone, GraduationCap, ListFilter, Download,
} from "lucide-react";
import { downloadStudentImportTemplate } from "../../utils/studentImportTemplate";

const API = import.meta.env.VITE_API_URL || "http://localhost:5100";

// ─── Birth year range ────────────────────────────────────────────
const YEARS = (() => {
  const now = new Date().getFullYear();
  const out = [];
  for (let y = now - 3; y >= now - 30; y -= 1) out.push(y);
  return out;
})();

// Province display labels -- must match what locationRoutes.js returns.
// These are the strings the cascade hook sends as ?province= query param.
const RWANDA_PROVINCES = [
  "Kigali City",
  "Northern Province",
  "Southern Province",
  "Eastern Province",
  "Western Province",
];

// Normalize any province variant (from DB imports, old data, typos)
// to the display label that locationRoutes.js and the dropdowns expect.
const PROVINCE_NORMALIZE_MAP = {
  "kigali":            "Kigali City",
  "kigali city":       "Kigali City",
  "north":             "Northern Province",
  "northern":          "Northern Province",
  "northern province": "Northern Province",
  "nothern":           "Northern Province",
  "south":             "Southern Province",
  "southern":          "Southern Province",
  "southern province": "Southern Province",
  "east":              "Eastern Province",
  "eastern":           "Eastern Province",
  "eastern province":  "Eastern Province",
  "west":              "Western Province",
  "western":           "Western Province",
  "western province":  "Western Province",
};

function normalizeProvinceForUI(raw) {
  if (!raw) return "";
  return PROVINCE_NORMALIZE_MAP[raw.trim().toLowerCase()] || raw.trim();
}

function normalizeLocationTokenForUI(raw) {
  if (raw === undefined || raw === null) return "";
  return String(raw).trim();
}

function resolveSelectionCaseInsensitive(currentRaw, options) {
  const current = normalizeLocationTokenForUI(currentRaw);
  if (!current) return "";
  const normalizedOptions = Array.isArray(options) ? options : [];
  const exact = normalizedOptions.find(o => normalizeLocationTokenForUI(o) === current);
  if (exact) return exact;
  const lower = current.toLowerCase();
  const match = normalizedOptions.find(o => normalizeLocationTokenForUI(o).toLowerCase() === lower);
  // If no match exists in the API options, keep the original value
  // (prevents breaking the select when the DB contains a non-canonical token).
  return match || currentRaw || current;
}

// ─── Helpers ─────────────────────────────────────────────────────
function parseMissingFields(v) {
  if (!v) return [];
  try {
    const arr = typeof v === "string" ? JSON.parse(v) : v;
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

function resolveMediaUrl(url) {
  if (!url) return null;
  const s = String(url).trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s) || s.startsWith("data:")) return s;
  const base = String(API || "").replace(/\/+$/, "");
  const rel = s.startsWith("/") ? s : `/${s}`;
  return `${base}${rel}`;
}

// ════════════════════════════════════════════════════════════════
// Location hook — fetches districts → sectors → cells lazily
// ════════════════════════════════════════════════════════════════
function useLocationCascade(province, district, sector, cell) {
  const [districts, setDistricts] = useState([]);
  const [sectors,   setSectors]   = useState([]);
  const [cells,     setCells]     = useState([]);
  const [villages,  setVillages]  = useState([]);
  const [loading,   setLoading]   = useState({ districts: false, sectors: false, cells: false, villages: false });
  const [errors,    setErrors]    = useState({ districts: "", sectors: "", cells: "", villages: "" });

  // Fetch districts when province changes
  useEffect(() => {
    if (!province) {
      setDistricts([]);
      setErrors(prev => ({ ...prev, districts: "" }));
      return;
    }
    setLoading(l => ({ ...l, districts: true }));
    setErrors(prev => ({ ...prev, districts: "" }));
    fetch(`${API}/api/locations/districts?province=${encodeURIComponent(province)}`, { credentials: "include" })
      .then(r => r.json().catch(() => ({})).then(json => ({ ok: r.ok, json })))
      .then(json => {
        const data = json?.json;
        const ok = json?.ok && data?.success && Array.isArray(data?.data);
        setDistricts(ok ? data.data : []);
        if (!ok) {
          setErrors(prev => ({
            ...prev,
            districts: data?.message || "Failed to load districts. Please check location service.",
          }));
        }
      })
      .catch(() => {
        setDistricts([]);
        setErrors(prev => ({ ...prev, districts: "Failed to load districts. Please check your network/server." }));
      })
      .finally(() => setLoading(l => ({ ...l, districts: false })));
  }, [province]);

  // Fetch sectors when district changes
  useEffect(() => {
    if (!province || !district) {
      setSectors([]);
      setErrors(prev => ({ ...prev, sectors: "" }));
      return;
    }
    setLoading(l => ({ ...l, sectors: true }));
    setErrors(prev => ({ ...prev, sectors: "" }));
    const p = new URLSearchParams({ province, district });
    fetch(`${API}/api/locations/sectors?${p}`, { credentials: "include" })
      .then(r => r.json().catch(() => ({})).then(json => ({ ok: r.ok, json })))
      .then(json => {
        const data = json?.json;
        const ok = json?.ok && data?.success && Array.isArray(data?.data);
        setSectors(ok ? data.data : []);
        if (!ok) {
          setErrors(prev => ({
            ...prev,
            sectors: data?.message || "Failed to load sectors for selected district.",
          }));
        }
      })
      .catch(() => {
        setSectors([]);
        setErrors(prev => ({ ...prev, sectors: "Failed to load sectors. Please check your network/server." }));
      })
      .finally(() => setLoading(l => ({ ...l, sectors: false })));
  }, [province, district]);

  // Fetch cells when sector changes
  useEffect(() => {
    if (!province || !district || !sector) {
      setCells([]);
      setErrors(prev => ({ ...prev, cells: "" }));
      return;
    }
    setLoading(l => ({ ...l, cells: true }));
    setErrors(prev => ({ ...prev, cells: "" }));
    const p = new URLSearchParams({ province, district, sector });
    fetch(`${API}/api/locations/cells?${p}`, { credentials: "include" })
      .then(r => r.json().catch(() => ({})).then(json => ({ ok: r.ok, json })))
      .then(json => {
        const data = json?.json;
        const ok = json?.ok && data?.success && Array.isArray(data?.data);
        setCells(ok ? data.data : []);
        if (!ok) {
          setErrors(prev => ({
            ...prev,
            cells: data?.message || "Failed to load cells for selected sector.",
          }));
        }
      })
      .catch(() => {
        setCells([]);
        setErrors(prev => ({ ...prev, cells: "Failed to load cells. Please check your network/server." }));
      })
      .finally(() => setLoading(l => ({ ...l, cells: false })));
  }, [province, district, sector]);

  // Fetch villages when cell changes
  useEffect(() => {
    if (!province || !district || !sector || !cell) {
      setVillages([]);
      setErrors(prev => ({ ...prev, villages: "" }));
      return;
    }
    setLoading(l => ({ ...l, villages: true }));
    setErrors(prev => ({ ...prev, villages: "" }));
    const p = new URLSearchParams({ province, district, sector, cell });
    fetch(`${API}/api/locations/villages?${p}`, { credentials: "include" })
      .then(r => r.json().catch(() => ({})).then(json => ({ ok: r.ok, json })))
      .then(json => {
        const data = json?.json;
        const ok = json?.ok && data?.success && Array.isArray(data?.data);
        setVillages(ok ? data.data : []);
        if (!ok) {
          setErrors(prev => ({
            ...prev,
            villages: data?.message || "Failed to load villages for selected cell.",
          }));
        }
      })
      .catch(() => {
        setVillages([]);
        setErrors(prev => ({ ...prev, villages: "Failed to load villages. Please check your network/server." }));
      })
      .finally(() => setLoading(l => ({ ...l, villages: false })));
  }, [province, district, sector, cell]);

  return { districts, sectors, cells, villages, loading, errors };
}

// ════════════════════════════════════════════════════════════════
// StudentDetailModal
// ════════════════════════════════════════════════════════════════
function StudentDetailModal({ student, onClose, onEdit }) {
  if (!student) return null;
  const missing = new Set(
    parseMissingFields(student.import_missing_fields).map(x => String(x || "").toLowerCase())
  );

  const Section = ({ title, icon: Icon, children }) => (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-3.5 h-3.5 text-amber-500 shrink-0" />
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">{title}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">{children}</div>
    </div>
  );

  const Field = ({ label, value, warn, mono }) => (
    <div className={`rounded-xl border px-3 py-2.5 sm:py-2 ${warn ? "border-red-200 bg-red-50" : "border-slate-100 bg-slate-50"}`}>
      <p className={`text-[9px] uppercase tracking-widest font-semibold mb-0.5 ${warn ? "text-red-500" : "text-slate-400"}`}>{label}</p>
      <p className={`text-xs font-semibold break-words ${mono ? "font-mono" : ""} ${warn ? "text-red-700" : "text-slate-800"}`}>
        {value || (warn ? "⚠ Missing" : "—")}
      </p>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-[70] flex items-stretch sm:items-center justify-center p-0 sm:p-5"
      style={{ background: "rgba(2,6,23,0.72)", backdropFilter: "blur(6px)" }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-2xl sm:rounded-3xl bg-white shadow-sm overflow-hidden flex flex-col min-h-0 h-full sm:h-auto sm:max-h-[90vh] max-h-[100dvh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-4 sm:px-5 py-3 sm:py-4 bg-gradient-to-r from-slate-900 to-slate-800 flex items-start sm:items-center justify-between gap-3 shrink-0 pt-[max(0.75rem,env(safe-area-inset-top))] sm:pt-4">
          <div className="min-w-0 flex-1">
            <p className="text-white font-semibold text-sm sm:text-base">Student Profile</p>
            <p className="text-amber-300 text-[10px] sm:text-[11px] font-mono mt-0.5 break-words">
              {student.student_code || student.student_uid} · {student.first_name} {student.last_name}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => { onClose(); onEdit(student); }}
              className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] sm:min-h-0 rounded-xl bg-amber-400 text-[11px] font-semibold text-slate-900 hover:bg-amber-300 touch-manipulation"
            >
              <Pencil className="w-3 h-3" /> Edit
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-11 h-11 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 touch-manipulation"
              aria-label="Close"
            >
              <X className="w-5 h-5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-5 flex-1 min-h-0 overflow-y-auto overscroll-contain pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-2xl overflow-hidden border border-slate-200 bg-white shrink-0 flex items-center justify-center">
                {resolveMediaUrl(student.student_photo_url) ? (
                  <img src={resolveMediaUrl(student.student_photo_url)} alt="Student" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-7 h-7 text-slate-300" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Identity Credentials</p>
                <p className="text-[11px] text-slate-600 mt-1">
                  RFID UID: <span className="font-mono font-semibold text-slate-800">{student.rfid_uid || "—"}</span>
                </p>
                <p className="text-[11px] text-slate-600">
                  Fingerprint ID: <span className="font-mono font-semibold text-slate-800">{student.fingerprint_id || "—"}</span>
                </p>
              </div>
            </div>
          </div>

          {missing.size > 0 && (
            <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-700 font-semibold flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              Missing location data: {Array.from(missing).join(", ")}
            </div>
          )}

          <Section title="Identity" icon={User}>
            <Field label="First Name"  value={student.first_name} />
            <Field label="Last Name"   value={student.last_name} />
            <Field label="Gender"      value={student.gender} />
            <Field label="Birth Year"  value={student.birth_year} />
            <Field label="Nationality" value={student.nationality} />
          </Section>

          <Section title="School enrolment" icon={GraduationCap}>
            <Field label="Class" value={student.class_name} />
            <Field label="Academic year" value={student.academic_year} />
            <Field label="SDMS ID" value={student.sdm_code} />
            <Field label="RFID UID" value={student.rfid_uid} />
            <Field label="Fingerprint ID" value={student.fingerprint_id} />
            <Field label="Identity Remarks" value={student.identity_remarks} />
          </Section>

          <Section title="Residence" icon={MapPin}>
            <Field label="Province" value={student.province} warn={missing.has("province")} />
            <Field label="District" value={student.district} warn={missing.has("district")} />
            <Field label="Sector"   value={student.sector}   warn={missing.has("sector")} />
            <Field label="Cell"     value={student.cell}     warn={missing.has("cell")} />
            <Field label="Village"  value={student.village}  warn={missing.has("village")} />
          </Section>

          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Phone className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Parents</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-3 space-y-2">
                <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">Father</p>
                <Field label="Name" value={student.father_full_name} />
                <Field label="Phone" value={student.father_phone} mono />
                <Field label="Email" value={student.father_email} />
                <Field label="National ID" value={student.father_national_id} mono />
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-3 space-y-2">
                <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">Mother</p>
                <Field label="Name" value={student.mother_full_name} />
                <Field label="Phone" value={student.mother_phone} mono />
                <Field label="Email" value={student.mother_email} />
                <Field label="National ID" value={student.mother_national_id} mono />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// Step indicator
// ════════════════════════════════════════════════════════════════
function StepIndicator({ step, totalSteps = 3 }) {
  const labels = ["Identity", "Residence", "Parents"];
  return (
    <div className="mb-5 px-0.5">
      <div className="flex items-start w-full">
        {labels.map((label, idx) => {
          const s      = idx + 1;
          const active = step === s;
          const done   = step > s;
          return (
            <div key={label} className="flex items-start flex-1 min-w-0 last:flex-none">
              <div className="flex flex-col items-center gap-1.5 w-full max-w-[6.5rem] mx-auto">
                <div className={`w-9 h-9 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-[11px] sm:text-[10px] font-semibold transition-all shrink-0
                  ${done   ? "bg-emerald-500 text-white shadow-sm shadow-emerald-400/50"
                  : active ? "bg-amber-400  text-slate-900 shadow-sm shadow-amber-400/60 ring-2 ring-amber-200"
                  :          "bg-slate-100  text-slate-400"}`}>
                  {done ? <CheckCircle2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" /> : s}
                </div>
                <span className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-wide text-center leading-snug
                  ${active ? "text-slate-800" : done ? "text-emerald-600" : "text-slate-400"}`}>
                  {label}
                </span>
              </div>
              {idx < labels.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mt-[1.125rem] sm:mt-3 mx-1 rounded-full transition-colors shrink min-w-[8px]
                    ${step > s + 1 ? "bg-emerald-400" : step > s ? "bg-emerald-300" : "bg-slate-200"}`}
                  aria-hidden
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// Input / Select helpers
// ════════════════════════════════════════════════════════════════
const inputCls = "w-full min-h-[44px] rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-base sm:text-sm text-slate-800 placeholder:text-slate-300 focus:border-amber-400 focus:ring-2 focus:ring-amber-200/60 outline-none transition-all";
const selectCls = `${inputCls} cursor-pointer`;
const labelCls = "block text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1";

function FormField({ label, required, children }) {
  return (
    <div>
      <label className={labelCls}>{label}{required && <span className="text-red-400 ml-0.5">*</span>}</label>
      {children}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// StudentWizardModal — fixed form with working location cascade
// ════════════════════════════════════════════════════════════════
function StudentWizardModal({ open, onClose, session, toast, onSuccess, editStudent = null }) {
  const isEdit = !!editStudent?.id;

  const BLANK_FORM = {
    student_uid:      "",
    autoId:           true,
    first_name:       "",
    last_name:        "",
    gender:           "",
    birth_year:       "",
    nationality:      "Rwandan",
    class_name:       "",
    academic_year:    "",
    sdm_code:         "",
    province:         "",
    district:         "",
    sector:           "",
    cell:             "",
    village:          "",
    father_full_name: "",
    father_phone:     "",
    father_email:     "",
    father_national_id: "",
    mother_full_name: "",
    mother_phone:     "",
    mother_email:     "",
    mother_national_id: "",
  };

  const [step,    setStep]    = useState(1);
  const [form,    setForm]    = useState(BLANK_FORM);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  // Location cascade
  const { districts, sectors, cells, villages, loading: locLoading, errors: locErrors } =
    useLocationCascade(form.province, form.district, form.sector, form.cell);

  // Initialise / reset form when modal opens or editStudent changes
  useEffect(() => {
    if (!open) return;
    setStep(1);
    setError(null);
    setLoading(false);

    if (isEdit) {
      setForm({
        student_uid:      editStudent.student_uid      || "",
        autoId:           false,
        first_name:       editStudent.first_name       || "",
        last_name:        editStudent.last_name        || "",
        gender:           editStudent.gender           || "",
        birth_year:       editStudent.birth_year       ? String(editStudent.birth_year) : "",
        nationality:      editStudent.nationality      || "Rwandan",
        // Normalize province so it matches the API / dropdown options
        province:         normalizeProvinceForUI(editStudent.province  || ""),
        district:         normalizeLocationTokenForUI(editStudent.district),
        sector:           normalizeLocationTokenForUI(editStudent.sector),
        cell:             normalizeLocationTokenForUI(editStudent.cell),
        village:          normalizeLocationTokenForUI(editStudent.village),
        father_full_name: editStudent.father_full_name || "",
        father_phone:     editStudent.father_phone     || "",
        father_email:     editStudent.father_email     || "",
        father_national_id: editStudent.father_national_id || "",
        mother_full_name: editStudent.mother_full_name || "",
        mother_phone:     editStudent.mother_phone     || "",
        mother_email:     editStudent.mother_email     || "",
        mother_national_id: editStudent.mother_national_id || "",
        class_name:       editStudent.class_name       || "",
        academic_year:    editStudent.academic_year    ? String(editStudent.academic_year) : "",
        sdm_code:         editStudent.sdm_code         || "",
      });
    } else {
      setForm(BLANK_FORM);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editStudent?.id]);

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  // When province changes, clear dependent fields
  const setProvince = (v) => setForm(prev => ({ ...prev, province: v, district: "", sector: "", cell: "", village: "" }));
  const setDistrict = (v) => setForm(prev => ({ ...prev, district: v, sector: "", cell: "", village: "" }));
  const setSector   = (v) => setForm(prev => ({ ...prev, sector: v, cell: "", village: "" }));
  const setCell     = (v) => setForm(prev => ({ ...prev, cell: v, village: "" }));

  // In edit mode, DB values may have different casing/whitespace than the
  // exact strings returned by the location API endpoints.
  // Snap the selected district/sector/cell to the API option value.
  useEffect(() => {
    if (!open) return;
    if (!districts?.length) return;
    setForm(prev => {
      const resolved = resolveSelectionCaseInsensitive(prev.district, districts);
      if (!resolved || resolved === prev.district) return prev;
      return { ...prev, district: resolved };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, districts]);

  useEffect(() => {
    if (!open) return;
    if (!sectors?.length) return;
    setForm(prev => {
      const resolved = resolveSelectionCaseInsensitive(prev.sector, sectors);
      if (!resolved || resolved === prev.sector) return prev;
      return { ...prev, sector: resolved };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, sectors]);

  useEffect(() => {
    if (!open) return;
    if (!cells?.length) return;
    setForm(prev => {
      const resolved = resolveSelectionCaseInsensitive(prev.cell, cells);
      if (!resolved || resolved === prev.cell) return prev;
      return { ...prev, cell: resolved };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, cells]);

  useEffect(() => {
    if (!open) return;
    if (!villages?.length) return;
    setForm(prev => {
      const resolved = resolveSelectionCaseInsensitive(prev.village, villages);
      if (!resolved || resolved === prev.village) return prev;
      return { ...prev, village: resolved };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, villages]);

  // ── Validation per step ────────────────────────────────────────
  const validateStep = (s) => {
    if (s === 1) {
      if (!form.first_name.trim()) return "First name is required.";
      if (!form.last_name.trim())  return "Last name is required.";
      if (!form.gender)            return "Please select a gender.";
      if (!form.birth_year)        return "Please select a birth year.";
      if (!form.autoId && !form.student_uid.trim()) return "Enter a student ID or enable auto-generate.";
    }
    if (s === 2) {
      if (!form.province) return "Please select a province.";
      if (!form.district) return "Please select a district.";
      if (!form.sector)   return "Please select a sector.";
      if (!form.cell)     return "Please select a cell.";
      if (!form.village.trim()) return "Please enter a village.";
    }
    return null;
  };

  const nextStep = () => {
    const err = validateStep(step);
    if (err) { setError(err); return; }
    setError(null);
    setStep(s => s + 1);
  };

  const prevStep = () => { setError(null); setStep(s => Math.max(1, s - 1)); };

  // ── Submit ─────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const phoneRe = /^0[27]\d{8}$/;
    const validatePhoneField = (label, val) => {
      if (!val || !String(val).trim()) return null;
      const parts = String(val)
        .split(/\s*[·,|/]\s*/)
        .map((s) => s.trim().replace(/\s/g, ""))
        .filter(Boolean);
      if (parts.length === 0) return null;
      const bad = parts.find((p) => !phoneRe.test(p));
      return bad ? `${label}: each number must be Rwandan format (07… or 02…), separated by · if there are several.` : null;
    };
    const fe = validatePhoneField("Father phone", form.father_phone);
    if (fe) {
      setError(fe);
      return;
    }
    const me = validatePhoneField("Mother phone", form.mother_phone);
    if (me) {
      setError(me);
      return;
    }

    setLoading(true);
    setError(null);

    const payload = {
      student_uid:      form.student_uid.trim() || undefined,
      autoId:           form.autoId,
      first_name:       form.first_name.trim(),
      last_name:        form.last_name.trim(),
      gender:           form.gender,
      birth_year:       form.birth_year ? Number(form.birth_year) : undefined,
      nationality:      form.nationality.trim() || "Rwandan",
      province:         form.province,
      district:         form.district,
      sector:           form.sector,
      cell:             form.cell,
      village:          form.village.trim(),
      class_name:       form.class_name.trim()       || undefined,
      academic_year:    form.academic_year.trim()    || undefined,
      sdm_code:         form.sdm_code.trim()         || undefined,
      father_full_name: form.father_full_name.trim() || undefined,
      father_phone:     form.father_phone.trim()     || undefined,
      father_email:     form.father_email.trim()     || undefined,
      father_national_id: form.father_national_id.trim() || null,
      mother_full_name: form.mother_full_name.trim() || undefined,
      mother_phone:     form.mother_phone.trim()     || undefined,
      mother_email:     form.mother_email.trim()     || undefined,
      mother_national_id: form.mother_national_id.trim() || null,
    };

    try {
      const url    = isEdit ? `${API}/api/students/${editStudent.id}` : `${API}/api/students`;
      const method = isEdit ? "PUT" : "POST";
      const res    = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.success) {
        setError(json.message || "Failed to save student.");
        setLoading(false);
        return;
      }

      toast?.(isEdit ? "Student updated successfully." : "Student registered successfully.", "success");
      onSuccess?.();
      onClose();
    } catch {
      setError("Cannot connect to server. Please try again.");
      setLoading(false);
    }
  };

  // Note: do not return early before all hooks are declared.
  // Hooks order must stay identical between renders.
  if (!open) return null;

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(8,6,0,0.82)", backdropFilter: "blur(8px)" }}
      onClick={e => { if (e.target === e.currentTarget && !loading) onClose(); }}
    >
      <div
        className="bg-white w-full max-w-xl flex flex-col overflow-hidden shadow-sm rounded-t-[1.35rem] sm:rounded-3xl
          h-[100dvh] max-h-[100dvh] sm:h-auto sm:max-h-[min(95vh,900px)]"
        onClick={e => e.stopPropagation()}
      >

        {/* Header */}
        <div className="px-4 sm:px-5 py-3 sm:py-4 flex items-center justify-between bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 shrink-0 pt-[max(0.75rem,env(safe-area-inset-top))] sm:pt-4">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-9 h-9 rounded-2xl bg-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/40 shrink-0">
              <Users size={18} className="text-slate-900" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-semibold text-white truncate">
                {isEdit ? "Edit Student" : "Register New Student"}
              </h2>
              <p className="text-[10px] text-amber-300 font-medium mt-0.5 truncate">
                {session?.schoolName || "Your School"} · Step {step} of 3
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="w-11 h-11 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all shrink-0 touch-manipulation"
            aria-label="Close"
          >
            <X className="w-5 h-5 sm:w-4 sm:h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 sm:px-5 py-4 bg-slate-50">
          <StepIndicator step={step} />

          {/* Error banner */}
          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-3 py-2.5">
              <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-xs font-semibold text-red-700">{error}</p>
            </div>
          )}

          {/* ── Step 1: Identity ─────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-3">
              {/* Auto ID toggle */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 sm:py-2.5">
                <label className="flex items-center gap-2 cursor-pointer select-none shrink-0">
                  <div
                    role="switch"
                    aria-checked={form.autoId}
                    onClick={() => set("autoId", !form.autoId)}
                    className={`w-11 h-6 sm:w-9 sm:h-5 rounded-full transition-colors cursor-pointer relative touch-manipulation
                      ${form.autoId ? "bg-amber-400" : "bg-slate-200"}`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 sm:w-4 sm:h-4 rounded-full bg-white shadow transition-transform
                      ${form.autoId ? "translate-x-5 sm:translate-x-4" : "translate-x-0.5"}`} />
                  </div>
                  <span className="text-sm sm:text-xs font-bold text-slate-700">Auto-generate ID</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder={form.autoId ? "9-digit code (DD + school + #)" : "Enter student ID"}
                  value={form.student_uid}
                  onChange={e => set("student_uid", e.target.value)}
                  disabled={form.autoId}
                  className="w-full sm:flex-1 min-h-[44px] sm:min-h-0 rounded-xl border border-slate-200 px-3 py-2 text-base sm:text-xs text-slate-800 placeholder:text-slate-300 disabled:bg-slate-50 disabled:text-slate-400 focus:border-amber-400 outline-none font-mono"
                />
              </div>
              {form.autoId && (
                <p className="text-[10px] text-slate-500 -mt-1">
                  Official ID format: district (2) + school code (3) + sequence (4), e.g. 010010001 — assigned on save.
                </p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField label="First Name" required>
                  <input
                    type="text"
                    className={inputCls}
                    placeholder="e.g. Aline"
                    value={form.first_name}
                    onChange={e => set("first_name", e.target.value)}
                  />
                </FormField>
                <FormField label="Last Name" required>
                  <input
                    type="text"
                    className={inputCls}
                    placeholder="e.g. Habimana"
                    value={form.last_name}
                    onChange={e => set("last_name", e.target.value)}
                  />
                </FormField>
                <FormField label="Gender" required>
                  <select
                    className={selectCls}
                    value={form.gender}
                    onChange={e => set("gender", e.target.value)}
                  >
                    <option value="">Select…</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </FormField>
                <FormField label="Birth Year" required>
                  <select
                    className={selectCls}
                    value={form.birth_year}
                    onChange={e => set("birth_year", e.target.value)}
                  >
                    <option value="">Select…</option>
                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </FormField>
                <FormField label="Nationality">
                  <input
                    type="text"
                    className={inputCls}
                    value={form.nationality}
                    onChange={e => set("nationality", e.target.value)}
                  />
                </FormField>
                <FormField label="Class / stream">
                  <input
                    type="text"
                    className={inputCls}
                    placeholder="e.g. S3 Science A"
                    value={form.class_name}
                    onChange={e => set("class_name", e.target.value)}
                  />
                </FormField>
                <FormField label="Academic year">
                  <input
                    type="text"
                    className={inputCls}
                    placeholder="e.g. 2025-2026"
                    value={form.academic_year}
                    onChange={e => set("academic_year", e.target.value)}
                  />
                </FormField>
                <FormField label="SDMS code (school entry)">
                  <input
                    type="text"
                    className={inputCls}
                    placeholder="Optional — entered by school"
                    value={form.sdm_code}
                    onChange={e => set("sdm_code", e.target.value)}
                  />
                </FormField>
              </div>
            </div>
          )}

          {/* ── Step 2: Residence ─────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50/80 p-4 sm:p-5 shadow-sm">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center shadow-md shadow-amber-500/25 shrink-0">
                    <MapPin className="w-5 h-5 text-slate-900" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-slate-900 tracking-tight">Residence</h3>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                      Where the student lives. Choose Province first — lower levels load automatically.
                    </p>
                  </div>
                </div>
              {(locErrors.districts || locErrors.sectors || locErrors.cells || locErrors.villages) && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700 font-semibold flex items-start gap-2 mb-3">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <div>
                    <p>Residence data could not load completely.</p>
                    <p className="font-medium text-[10px] mt-0.5">
                      {locErrors.villages || locErrors.cells || locErrors.sectors || locErrors.districts}
                    </p>
                  </div>
                </div>
              )}
              <div className="rounded-xl border border-amber-200/80 bg-amber-50/90 px-3 py-2.5 text-[11px] text-amber-800 font-medium flex items-start gap-2.5">
                <MapPin className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                <span>Cascade: Province → District → Sector → Cell → Village.</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <FormField label="Province" required>
                  <select className={selectCls} value={form.province} onChange={e => setProvince(e.target.value)}>
                    <option value="">Select…</option>
                    {RWANDA_PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </FormField>

                <FormField label="District" required>
                  <select
                    className={selectCls}
                    value={form.district}
                    onChange={e => setDistrict(e.target.value)}
                    disabled={!form.province || locLoading.districts}
                  >
                    <option value="">
                      {locLoading.districts ? "Loading…" : form.province ? "Select…" : "— pick province first —"}
                    </option>
                    {districts.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </FormField>

                <FormField label="Sector" required>
                  <select
                    className={selectCls}
                    value={form.sector}
                    onChange={e => setSector(e.target.value)}
                    disabled={!form.district || locLoading.sectors}
                  >
                    <option value="">
                      {locLoading.sectors ? "Loading…" : form.district ? "Select…" : "— pick district first —"}
                    </option>
                    {sectors.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </FormField>

                <FormField label="Cell" required>
                  <select
                    className={selectCls}
                    value={form.cell}
                    onChange={e => setCell(e.target.value)}
                    disabled={!form.sector || locLoading.cells}
                  >
                    <option value="">
                      {locLoading.cells ? "Loading…" : form.sector ? "Select…" : "— pick sector first —"}
                    </option>
                    {cells.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </FormField>

                <div className="col-span-1 sm:col-span-2">
                  <FormField label="Village" required>
                    <select
                      className={selectCls}
                      value={form.village}
                      onChange={e => set("village", e.target.value)}
                      disabled={!form.cell || locLoading.villages}
                    >
                      <option value="">
                        {locLoading.villages ? "Loading…" : form.cell ? "Select…" : "— pick cell first —"}
                      </option>
                      {villages.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </FormField>
                </div>
              </div>
              </div>
            </div>
          )}

          {/* ── Step 3: Parents ───────────────────────────────── */}
          {step === 3 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Father */}
              <div className="rounded-2xl border border-slate-200 bg-white p-3 space-y-2.5">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Father (optional)</p>
                <input
                  type="text"
                  className={inputCls}
                  placeholder="Full name"
                  value={form.father_full_name}
                  onChange={e => set("father_full_name", e.target.value)}
                />
                <input
                  type="tel"
                  className={inputCls}
                  placeholder="Phone: 07xxxxxxxx"
                  value={form.father_phone}
                  onChange={e => set("father_phone", e.target.value)}
                />
                <input
                  type="email"
                  className={inputCls}
                  placeholder="Email (optional)"
                  value={form.father_email}
                  onChange={e => set("father_email", e.target.value)}
                />
                <FormField label="Father National ID">
                  <input
                    type="text"
                    className={inputCls}
                    placeholder="e.g. 1199080000000001"
                    value={form.father_national_id}
                    onChange={e => set("father_national_id", e.target.value)}
                  />
                </FormField>
              </div>
              {/* Mother */}
              <div className="rounded-2xl border border-slate-200 bg-white p-3 space-y-2.5">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Mother (optional)</p>
                <input
                  type="text"
                  className={inputCls}
                  placeholder="Full name"
                  value={form.mother_full_name}
                  onChange={e => set("mother_full_name", e.target.value)}
                />
                <input
                  type="tel"
                  className={inputCls}
                  placeholder="Phone: 07xxxxxxxx"
                  value={form.mother_phone}
                  onChange={e => set("mother_phone", e.target.value)}
                />
                <input
                  type="email"
                  className={inputCls}
                  placeholder="Email (optional)"
                  value={form.mother_email}
                  onChange={e => set("mother_email", e.target.value)}
                />
                <FormField label="Mother National ID">
                  <input
                    type="text"
                    className={inputCls}
                    placeholder="e.g. 1199080000000002"
                    value={form.mother_national_id}
                    onChange={e => set("mother_national_id", e.target.value)}
                  />
                </FormField>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-5 py-3 border-t border-slate-100 bg-white flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2 shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-3">
          <button
            type="button"
            onClick={step === 1 ? onClose : prevStep}
            disabled={loading}
            className="w-full sm:w-auto min-h-[48px] sm:min-h-0 px-4 py-3 sm:py-2 rounded-xl border border-slate-200 text-sm sm:text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all touch-manipulation"
          >
            {step === 1 ? "Cancel" : "← Back"}
          </button>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            {step < 3 && (
              <button
                type="button"
                onClick={nextStep}
                disabled={loading}
                className="inline-flex items-center justify-center gap-1.5 min-h-[48px] sm:min-h-0 px-5 py-3 sm:py-2 rounded-xl bg-amber-400 text-sm sm:text-xs font-semibold text-slate-900 hover:bg-amber-300 transition-all touch-manipulation w-full sm:w-auto"
              >
                Next <ChevronRight className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
              </button>
            )}
            {step === 3 && (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 min-h-[48px] sm:min-h-0 px-5 py-3 sm:py-2 rounded-xl bg-emerald-600 text-sm sm:text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-60 transition-all touch-manipulation w-full sm:w-auto"
              >
                {loading
                  ? <><Loader2 className="w-4 h-4 sm:w-3.5 sm:h-3.5 animate-spin" /> Saving…</>
                  : <><CheckCircle2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" /> {isEdit ? "Save Changes" : "Register Student"}</>
                }
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// ImportCard
// ════════════════════════════════════════════════════════════════
function ImportCard({ toast, onImported }) {
  const [importClass, setImportClass] = useState("");
  const [importYear, setImportYear] = useState("");
  const [file,       setFile]       = useState(null);
  const [busy,       setBusy]       = useState(false);
  const [result,     setResult]     = useState(null);
  const [errors,     setErrors]     = useState([]);
  const fileRef = useRef();

  const handleImport = async () => {
    const cls = importClass.trim();
    const yr = importYear.trim();
    if (!cls || !yr) {
      toast?.("Enter class and academic year before importing.", "error");
      return;
    }
    if (!file) return;
    setBusy(true);
    setResult(null);
    setErrors([]);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("importMode", "insert_only");
      fd.append("class_name", cls);
      fd.append("academic_year", yr);
      const res  = await fetch(`${API}/api/students/import`, { method: "POST", credentials: "include", body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        setResult({ ok: false, message: json.message || "Import failed." });
        setErrors(json.errors || []);
        toast?.("Import failed", "error");
      } else {
        setResult({ ok: true, message: json.message, meta: json });
        setErrors(json.errors || []);
        toast?.(`Imported ${json.inserted} students successfully.`, "success");
        onImported?.();
        setFile(null);
        if (fileRef.current) fileRef.current.value = "";
      }
    } catch {
      setResult({ ok: false, message: "Cannot connect to server." });
      toast?.("Import failed", "error");
    } finally {
      setBusy(false);
    }
  };

  const canImport = importClass.trim() && importYear.trim() && file;

  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-4 sm:p-5">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center shrink-0 shadow-md shadow-amber-500/20">
          <Upload className="w-5 h-5 text-slate-900" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-800">Bulk import from Excel</p>
          <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
            <span className="font-semibold text-amber-700">1.</span> Class &amp; academic year for this batch ·{" "}
            <span className="font-semibold text-amber-700">2.</span> Download template &amp; fill rows ·{" "}
            <span className="font-semibold text-amber-700">3.</span> Upload &amp; import. Urubuto exports also work.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Class / stream <span className="text-red-500">*</span></label>
          <input
            type="text"
            value={importClass}
            onChange={e => { setImportClass(e.target.value); setResult(null); }}
            placeholder="e.g. S3 Science A"
            className="w-full min-h-[44px] sm:min-h-0 rounded-xl border border-slate-200 px-3 py-2.5 text-base sm:text-sm text-slate-800 placeholder:text-slate-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none"
          />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Academic year <span className="text-red-500">*</span></label>
          <input
            type="text"
            value={importYear}
            onChange={e => { setImportYear(e.target.value); setResult(null); }}
            placeholder="e.g. 2025-2026"
            className="w-full min-h-[44px] sm:min-h-0 rounded-xl border border-slate-200 px-3 py-2.5 text-base sm:text-sm text-slate-800 placeholder:text-slate-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none"
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
        <button
          type="button"
          onClick={() => {
            try {
              downloadStudentImportTemplate();
              toast?.("Template downloaded. Fill rows and upload below.", "success");
            } catch {
              toast?.("Could not generate template.", "error");
            }
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100 transition-all min-h-[44px] touch-manipulation"
        >
          <Download className="w-3.5 h-3.5 shrink-0" />
          Download Excel template
        </button>

        <label className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-all min-h-[44px] touch-manipulation flex-1 sm:flex-initial sm:min-w-[200px]">
          <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="text-[11px] font-bold text-slate-700 truncate flex-1 min-w-0">
            {file ? file.name : "Choose Excel file (.xlsx)"}
          </span>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={e => { setFile(e.target.files?.[0] || null); setResult(null); setErrors([]); }}
          />
        </label>

        <button
          type="button"
          onClick={handleImport}
          disabled={!canImport || busy}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-[11px] font-semibold text-amber-300 hover:bg-slate-800 disabled:opacity-50 transition-all min-h-[44px] touch-manipulation"
        >
          {busy
            ? <><Loader2 className="w-3 h-3 animate-spin" /> Importing…</>
            : <><Upload className="w-3 h-3" /> Import</>}
        </button>
      </div>

      {result && (
        <div className={`mt-3 rounded-xl border px-3 py-2 text-[11px] font-semibold
          ${result.ok ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>
          {result.message}
          {result.ok && result.meta && (
            <span className="ml-2 text-[10px] opacity-75">
              · Inserted: {result.meta.inserted} · Updated: {result.meta.updated} · Skipped: {result.meta.skipped}
              {result.meta.phoneWarnings > 0 ? ` · ⚠ ${result.meta.phoneWarnings} phone(s) skipped` : ""}
            </span>
          )}
        </div>
      )}

      {errors.length > 0 && (
        <ul className="mt-2 max-h-24 overflow-y-auto space-y-0.5">
          {errors.map((e, i) => (
            <li key={i} className="text-[10px] text-amber-700">• {e}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// Delete confirmation modal
// ════════════════════════════════════════════════════════════════
function BulkDeleteModal({ count, onCancel, onConfirm, loading }) {
  if (!count) return null;
  return (
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(2,6,23,0.75)", backdropFilter: "blur(6px)" }}
      onClick={e => e.target === e.currentTarget && !loading && onCancel()}
    >
      <div className="w-full max-w-sm rounded-t-3xl sm:rounded-3xl bg-white shadow-sm overflow-hidden max-h-[90dvh] sm:max-h-none" onClick={e => e.stopPropagation()}>
        <div className="px-5 pt-[max(1.25rem,env(safe-area-inset-top))] sm:pt-5 pb-4">
          <div className="w-10 h-10 rounded-2xl bg-red-100 flex items-center justify-center mb-3">
            <Trash2 className="w-5 h-5 text-red-600" />
          </div>
          <p className="text-sm font-semibold text-slate-900">Delete selected students?</p>
          <p className="text-xs text-slate-500 mt-1">
            <span className="font-semibold text-slate-700">{count}</span>
            {" "}student{count === 1 ? "" : "s"} will be permanently removed. This cannot be undone.
          </p>
        </div>
        <div className="flex gap-2 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pb-5">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 min-h-[48px] py-3 sm:py-2 rounded-xl border border-slate-200 text-sm sm:text-xs font-bold text-slate-600 hover:bg-slate-50 touch-manipulation"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 min-h-[48px] py-3 sm:py-2 rounded-xl bg-red-600 text-sm sm:text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-60 inline-flex items-center justify-center gap-1.5 touch-manipulation"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            {loading ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteAllStudentsModal({ schoolName, phrase, onPhraseChange, onCancel, onConfirm, loading }) {
  const ok = phrase.trim() === "DELETE ALL STUDENTS";
  return (
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(2,6,23,0.75)", backdropFilter: "blur(6px)" }}
      onClick={e => e.target === e.currentTarget && !loading && onCancel()}
    >
      <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-white shadow-sm overflow-hidden max-h-[90dvh] sm:max-h-none flex flex-col min-h-0" onClick={e => e.stopPropagation()}>
        <div className="px-5 pt-[max(1.25rem,env(safe-area-inset-top))] sm:pt-5 pb-4 overflow-y-auto">
          <div className="w-10 h-10 rounded-2xl bg-red-100 flex items-center justify-center mb-3">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <p className="text-sm font-semibold text-slate-900">Delete every student?</p>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            <span className="font-semibold text-red-700">All students</span> for{" "}
            <span className="font-semibold text-slate-700">{schoolName || "this school"}</span> will be permanently removed. This cannot be undone.
          </p>
          <p className="text-[11px] text-slate-500 mt-3 font-semibold">
            Type <span className="font-mono text-slate-800">DELETE ALL STUDENTS</span> to confirm:
          </p>
          <input
            type="text"
            value={phrase}
            onChange={e => onPhraseChange(e.target.value)}
            autoComplete="off"
            className="mt-2 w-full min-h-[44px] rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-mono text-slate-800 focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none"
            placeholder="DELETE ALL STUDENTS"
          />
        </div>
        <div className="flex gap-2 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pb-5 shrink-0 border-t border-slate-100">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 min-h-[48px] py-3 sm:py-2 rounded-xl border border-slate-200 text-sm sm:text-xs font-bold text-slate-600 hover:bg-slate-50 touch-manipulation"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading || !ok}
            className="flex-1 min-h-[48px] py-3 sm:py-2 rounded-xl bg-red-600 text-sm sm:text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-50 inline-flex items-center justify-center gap-1.5 touch-manipulation"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            {loading ? "Deleting…" : "Delete all"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteModal({ student, onCancel, onConfirm, loading }) {
  if (!student) return null;
  return (
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(2,6,23,0.75)", backdropFilter: "blur(6px)" }}
    >
      <div className="w-full max-w-sm rounded-t-3xl sm:rounded-3xl bg-white shadow-sm overflow-hidden max-h-[90dvh] sm:max-h-none">
        <div className="px-5 pt-[max(1.25rem,env(safe-area-inset-top))] sm:pt-5 pb-4">
          <div className="w-10 h-10 rounded-2xl bg-red-100 flex items-center justify-center mb-3">
            <Trash2 className="w-5 h-5 text-red-600" />
          </div>
          <p className="text-sm font-semibold text-slate-900">Delete Student?</p>
          <p className="text-xs text-slate-500 mt-1">
            <span className="font-semibold text-slate-700">{student.first_name} {student.last_name}</span>
            {" "}({student.student_code || student.student_uid}) will be permanently removed. This cannot be undone.
          </p>
        </div>
        <div className="flex gap-2 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pb-5">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 min-h-[48px] py-3 sm:py-2 rounded-xl border border-slate-200 text-sm sm:text-xs font-bold text-slate-600 hover:bg-slate-50 touch-manipulation"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 min-h-[48px] py-3 sm:py-2 rounded-xl bg-red-600 text-sm sm:text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-60 inline-flex items-center justify-center gap-1.5 touch-manipulation"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            {loading ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// Mobile student card (avoids wide table on small screens)
// ════════════════════════════════════════════════════════════════
function StudentMobileCard({ student: s, hasMissing, selected, onToggleSelect, onView, onEdit, onDelete }) {
  const residence = [s.district, s.sector, s.village].filter(Boolean).join(", ") || "—";
  const photoUrl = resolveMediaUrl(s.student_photo_url);
  return (
    <article className="p-4 border-b border-slate-100 last:border-b-0 bg-white">
      <div className="flex justify-between gap-3 items-start">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect(s.id)}
          className="mt-1 w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-400 shrink-0 touch-manipulation"
          aria-label={`Select ${s.first_name} ${s.last_name}`}
        />
        <div className="w-11 h-11 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 shrink-0 flex items-center justify-center shadow-inner">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={`${s.first_name} ${s.last_name}`}
              className="w-full h-full object-cover [transform:translateZ(0)]"
              decoding="async"
              loading="lazy"
            />
          ) : (
            <User className="w-5 h-5 text-slate-300" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-slate-900 leading-snug">
            {s.first_name} {s.last_name}
          </p>
          <p className="text-[12px] font-mono font-semibold text-slate-600 mt-1 flex flex-wrap items-center gap-1.5">
            <span>{s.student_code || s.student_uid}</span>
            {hasMissing && (
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-200 text-amber-800 text-[9px] font-semibold" title="Some residence fields are missing">!</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button" 
            onClick={() => onView(s)}
            className="min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 touch-manipulation"
            title="View"
            aria-label="View details"
          >
            <Eye className="w-[18px] h-[18px]" />
          </button>
          <button
            type="button"
            onClick={() => onEdit(s)}
            className="min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 touch-manipulation"
            title="Edit"
            aria-label="Edit student"
          >
            <Pencil className="w-[18px] h-[18px]" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(s)}
            className="min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 touch-manipulation"
            title="Delete"
            aria-label="Delete student"
          >
            <Trash2 className="w-[18px] h-[18px]" />
          </button>
        </div>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2.5 text-[12px]">
        <div className="min-w-0">
          <dt className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">SDMS ID</dt>
          <dd className="font-mono text-slate-700 truncate mt-0.5">{s.sdm_code || "—"}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Class</dt>
          <dd className="text-slate-800 font-semibold truncate mt-0.5">{s.class_name || "—"}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Acad. year</dt>
          <dd className="text-slate-700 mt-0.5">{s.academic_year || "—"}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Birth</dt>
          <dd className="text-slate-700 mt-0.5">{s.birth_year || "—"}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">RFID UID</dt>
          <dd className="font-mono text-slate-700 truncate mt-0.5">{s.rfid_uid || "—"}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Fingerprint</dt>
          <dd className="font-mono text-slate-700 truncate mt-0.5">{s.fingerprint_id || "—"}</dd>
        </div>
        <div className="col-span-2 min-w-0">
          <dt className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Residence</dt>
          <dd className="text-slate-600 mt-0.5 leading-snug break-words">{residence}</dd>
        </div>
        {(s.father_full_name || s.father_phone || s.father_email || s.father_national_id) && (
          <div className="col-span-2 min-w-0">
            <dt className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Father</dt>
            <dd className="text-slate-700 mt-0.5 text-[11px] leading-snug break-words">
              {s.father_full_name || "—"}
              {s.father_phone ? <span className="block font-mono text-[10px] text-slate-600">{s.father_phone}</span> : null}
              {s.father_email ? <span className="block text-[10px] text-slate-500 break-all">{s.father_email}</span> : null}
              {s.father_national_id ? <span className="block font-mono text-[10px] text-slate-600">ID: {s.father_national_id}</span> : null}
            </dd>
          </div>
        )}
        {(s.mother_full_name || s.mother_phone || s.mother_email || s.mother_national_id) && (
          <div className="col-span-2 min-w-0">
            <dt className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Mother</dt>
            <dd className="text-slate-700 mt-0.5 text-[11px] leading-snug break-words">
              {s.mother_full_name || "—"}
              {s.mother_phone ? <span className="block font-mono text-[10px] text-slate-600">{s.mother_phone}</span> : null}
              {s.mother_email ? <span className="block text-[10px] text-slate-500 break-all">{s.mother_email}</span> : null}
              {s.mother_national_id ? <span className="block font-mono text-[10px] text-slate-600">ID: {s.mother_national_id}</span> : null}
            </dd>
          </div>
        )}
      </dl>
    </article>
  );
}

/** Ochre hero + overlapping white KPI panel (responsive). */
function StudentsInstitutionalHeader({
  schoolName,
  rows,
  stats,
  statsBusy,
  filterClass,
  onClassChange,
  filterYearTrimmed,
  searchActive,
  onAdd,
  rightHeaderAction,
  children,
}) {
  const incompleteOnPage = useMemo(() => {
    let incomplete = 0;
    for (const s of rows) {
      if (parseMissingFields(s.import_missing_fields).length) incomplete++;
    }
    return incomplete;
  }, [rows]);

  const registryClassKeys = useMemo(() => (stats.classes || []).map((r) => r.class_name), [stats.classes]);
  const fcTrim = filterClass.trim();
  const unknownClassPick = fcTrim !== "" && !registryClassKeys.includes(fcTrim);

  const nf = (n) => {
    if (statsBusy) return "…";
    const v = Number(n ?? 0);
    return Number.isFinite(v) ? v.toLocaleString() : "0";
  };

  const classLabelShort = fcTrim || "All classes";
  const allRosterLabel = nf(stats.rosterAllClasses ?? stats.total);

  const Kpi = ({ icon: Icon, iconWrapClass, label, value, sub }) => (
    <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/90 p-3 sm:p-4 shadow-sm shadow-slate-900/5 min-h-[96px] sm:min-h-[104px] flex flex-col justify-between">
      <div className="flex items-center gap-2 min-w-0">
        <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconWrapClass}`}>
          <Icon className="h-4 w-4 shrink-0" aria-hidden />
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 truncate">{label}</span>
      </div>
      <div className="min-w-0">
        <p className="text-2xl sm:text-3xl font-semibold tabular-nums text-slate-900 leading-none tracking-tight">{value}</p>
        {sub ? <p className="text-[10px] text-slate-500 mt-1.5 leading-snug line-clamp-2">{sub}</p> : null}
      </div>
    </div>
  );

  return (
    <div className="relative mb-1">
      <div
        className="relative overflow-hidden rounded-2xl sm:rounded-[1.85rem] bg-gradient-to-br from-[#b5842a] via-[#cf9f2e] to-[#926b16] px-4 sm:px-8 pt-6 sm:pt-9 pb-20 sm:pb-28 text-white shadow-lg shadow-amber-900/25"
        aria-label="Students list banner"
      >
        <div className="pointer-events-none absolute -right-20 -top-28 size-72 rounded-full border-[3px] border-white/14 sm:size-[22rem]" />
        <div className="pointer-events-none absolute -right-6 top-6 size-[13.5rem] rounded-full border-2 border-white/12 sm:size-64 sm:top-10" />
        <div className="pointer-events-none absolute right-[14%] bottom-2 size-32 rounded-full border border-white/10 opacity-50 sm:size-44" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 max-w-3xl">
            <div className="flex items-center gap-2 text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.2em] text-white/85">
              <span className="h-px w-6 shrink-0 bg-white/55 sm:w-9" aria-hidden />
              Institutional repository
            </div>
            <h1 className="mt-3 text-[1.625rem] sm:text-[2.125rem] md:text-4xl font-semibold tracking-[0.06em] text-white leading-[1.1] uppercase">
              Students list
            </h1>
            <p className="mt-2.5 max-w-xl text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.16em] text-white/85 leading-relaxed">
              Professional academic & behavioral analytics view
            </p>
            {schoolName ? <p className="mt-3 truncate text-[13px] font-semibold text-white/95 sm:text-sm">{schoolName}</p> : null}
          </div>
          <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={onAdd}
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-white px-5 text-sm font-semibold text-amber-900 shadow-md shadow-amber-950/20 transition-colors hover:bg-amber-50 touch-manipulation active:scale-[0.99]"
            >
              <Plus className="size-4 shrink-0" aria-hidden />
              Add Student
            </button>
            {rightHeaderAction ? (
              <div className="flex flex-col gap-2 sm:flex-row [&_a]:rounded-2xl [&_button]:min-h-[48px] [&_button]:rounded-2xl">
                {rightHeaderAction}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="relative z-10 -mt-14 px-1 sm:-mt-[4.25rem] sm:px-0">
        <div className="mx-auto max-w-full overflow-hidden rounded-t-[1.35rem] sm:rounded-t-[1.75rem] rounded-b-2xl sm:rounded-b-[1.75rem] border border-slate-200/95 bg-white shadow-sm shadow-slate-900/[0.11]">
          <div className="border-b border-slate-100 px-3 py-4 sm:px-6 sm:py-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-5">
              <div className="min-w-0 flex-1">
                <label
                  htmlFor="student-registry-class"
                  className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500"
                >
                  <ListFilter className="size-3.5 shrink-0 opacity-70" aria-hidden />
                  Select class (roll total)
                </label>
                <select
                  id="student-registry-class"
                  value={filterClass}
                  onChange={(e) => onClassChange(e.target.value)}
                  className="min-h-[48px] w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-[15px] sm:text-sm font-semibold text-slate-900 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 touch-manipulation sm:max-w-md"
                >
                  <option value="">All classes · {statsBusy ? "…" : allRosterLabel} enrolled</option>
                  {(stats.classes || []).map((row) => (
                    <option key={row.class_name} value={row.class_name}>
                      {row.class_name} ({Number(row.count || 0).toLocaleString()})
                    </option>
                  ))}
                  {unknownClassPick ? (
                    <option value={fcTrim}>{fcTrim} ({statsBusy ? "…" : nf(stats.total)})</option>
                  ) : null}
                </select>
              </div>
              <div className="sm:pb-0.5 sm:text-right">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Academic year scope</p>
                <p className="mt-1 text-[12px] font-bold text-slate-700">{filterYearTrimmed || "Any year"}</p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
              <Kpi
                icon={User}
                iconWrapClass="bg-sky-100 text-sky-700"
                label="Total boys"
                value={nf(stats.male)}
                sub={`${classLabelShort}${filterYearTrimmed ? ` · ${filterYearTrimmed}` : ""}${searchActive ? " · search filter" : ""}`}
              />
              <Kpi
                icon={User}
                iconWrapClass="bg-rose-100 text-rose-700"
                label="Total girls"
                value={nf(stats.female)}
                sub={`${classLabelShort}${filterYearTrimmed ? ` · ${filterYearTrimmed}` : ""}`}
              />
              <Kpi
                icon={Users}
                iconWrapClass="bg-amber-100 text-amber-900"
                label={fcTrim ? `Total · ${fcTrim}` : "Total enrollment"}
                value={nf(stats.total)}
                sub={fcTrim ? "Students in selected class" : "All classes matching search / year"}
              />
            </div>

            {(stats.unspecified > 0 && !statsBusy) || incompleteOnPage > 0 ? (
              <div className="mt-4 space-y-2">
                {stats.unspecified > 0 ? (
                  <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[11px] leading-snug text-slate-600">
                    <AlertTriangle className="size-4 shrink-0 text-amber-600" aria-hidden />
                    <span>
                      <span className="font-semibold tabular-nums">{stats.unspecified}</span>
                      {" "}student{stats.unspecified === 1 ? "" : "s"} with gender not set in registry (included in totals above).
                    </span>
                  </div>
                ) : null}
                {incompleteOnPage > 0 ? (
                  <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-200 bg-amber-50/90 px-3 py-2.5 text-[11px] leading-snug text-amber-950">
                    <AlertTriangle className="size-4 shrink-0 text-amber-600" aria-hidden />
                    <span>
                      <span className="font-semibold tabular-nums">{incompleteOnPage}</span>
                      {" "}on this results page still need residence / import details completed.
                    </span>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// Main StudentsPage
// ════════════════════════════════════════════════════════════════
export default function StudentsPage({ session, toast, rightHeaderAction = null }) {
  const [modalOpen,    setModalOpen]    = useState(false);
  const [editStudent,  setEditStudent]  = useState(null);
  const [viewStudent,  setViewStudent]  = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting,     setDeleting]     = useState(false);

  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [deleteAllPhrase, setDeleteAllPhrase] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const tableHeaderSelectRef = useRef(null);

  const [rows,        setRows]        = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [search,      setSearch]      = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterYear,  setFilterYear]  = useState("");
  const [page,        setPage]        = useState(1);
  const [pageSize,    setPageSize]    = useState(20);
  const [total,       setTotal]       = useState(0);
  const [totalPages,  setTotalPages]  = useState(1);
  const [registryStats, setRegistryStats] = useState({
    male: 0,
    female: 0,
    total: 0,
    unspecified: 0,
    rosterAllClasses: 0,
    classes: [],
  });
  const [statsBusy, setStatsBusy] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const skipLoadAfterPageReset = useRef(false);
  const prevFiltersRef = useRef({ d: "", fc: "", fy: "" });

  const loadRegistryStats = useCallback(async () => {
    setStatsBusy(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch.trim()) params.set("q", debouncedSearch.trim());
      if (filterYear.trim()) params.set("academic_year", filterYear.trim());
      if (filterClass.trim()) params.set("class_name", filterClass.trim());
      const res = await fetch(`${API}/api/students/registry-stats?${params}`, { credentials: "include" });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        setRegistryStats({
          male: Number(json.male ?? 0),
          female: Number(json.female ?? 0),
          total: Number(json.total ?? 0),
          unspecified: Number(json.unspecified ?? 0),
          rosterAllClasses: Number(json.rosterAllClasses ?? json.total ?? 0),
          classes: Array.isArray(json.classes) ? json.classes : [],
        });
      } else {
        setRegistryStats({
          male: 0,
          female: 0,
          total: 0,
          unspecified: 0,
          rosterAllClasses: 0,
          classes: [],
        });
      }
    } catch {
      setRegistryStats({
        male: 0,
        female: 0,
        total: 0,
        unspecified: 0,
        rosterAllClasses: 0,
        classes: [],
      });
    } finally {
      setStatsBusy(false);
    }
  }, [debouncedSearch, filterYear, filterClass]);

  // ── Load students ──────────────────────────────────────────────
  const loadStudents = useCallback(async (q = "", pg = page, ps = pageSize, fc = filterClass, fy = filterYear) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(pg), limit: String(ps) });
      if (q.trim()) params.set("q", q.trim());
      if (fc.trim()) params.set("class_name", fc.trim());
      if (fy.trim()) params.set("academic_year", fy.trim());
      const res  = await fetch(`${API}/api/students?${params}`, { credentials: "include" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        toast?.(json.message || "Failed to load students", "error");
        setRows([]);
      } else {
        setRows(Array.isArray(json.data) ? json.data : []);
        setTotal(Number(json.total || 0));
        setTotalPages(Number(json.totalPages || 1));
      }
    } catch {
      toast?.("Cannot reach server.", "error");
      setRows([]);
    } finally {
      setLoading(false);
    }
    void loadRegistryStats();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, filterClass, filterYear, loadRegistryStats]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (skipLoadAfterPageReset.current) {
      skipLoadAfterPageReset.current = false;
      return;
    }
    const prev = prevFiltersRef.current;
    const filtersChanged =
      prev.d !== debouncedSearch ||
      prev.fc !== filterClass ||
      prev.fy !== filterYear;
    if (filtersChanged) {
      prevFiltersRef.current = { d: debouncedSearch, fc: filterClass, fy: filterYear };
    }
    const pg = filtersChanged ? 1 : page;
    if (filtersChanged && page !== 1) {
      skipLoadAfterPageReset.current = true;
      setPage(1);
    }
    loadStudents(debouncedSearch, pg, pageSize);
  }, [debouncedSearch, page, pageSize, filterClass, filterYear, loadStudents]);

  const idsOnPage = rows.map(r => r.id);
  const allPageSelected = rows.length > 0 && idsOnPage.every(id => selectedIds.has(id));
  const somePageSelected = idsOnPage.some(id => selectedIds.has(id));

  useEffect(() => {
    const el = tableHeaderSelectRef.current;
    if (el) el.indeterminate = somePageSelected && !allPageSelected;
  }, [somePageSelected, allPageSelected]);

  const toggleSelect = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAllPage = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const ids = rows.map(r => r.id);
      const every = ids.length > 0 && ids.every(i => next.has(i));
      if (every) ids.forEach(i => next.delete(i));
      else ids.forEach(i => next.add(i));
      return next;
    });
  }, [rows]);

  // ── Open add modal ─────────────────────────────────────────────
  const openAdd = () => { setEditStudent(null); setModalOpen(true); };

  // ── Open edit modal ────────────────────────────────────────────
  const openEdit = (student) => { setEditStudent(student); setModalOpen(true); };

  // ── Close modal ────────────────────────────────────────────────
  const closeModal = () => { setModalOpen(false); setEditStudent(null); };

  // ── Delete ─────────────────────────────────────────────────────
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res  = await fetch(`${API}/api/students/${deleteTarget.id}`, { method: "DELETE", credentials: "include" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        toast?.(json.message || "Delete failed", "error");
      } else {
        toast?.("Student deleted successfully.", "success");
        const removedId = deleteTarget.id;
        setDeleteTarget(null);
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(removedId);
          return next;
        });
        loadStudents(debouncedSearch, page, pageSize);
      }
    } catch {
      toast?.("Delete failed.", "error");
    } finally {
      setDeleting(false);
    }
  };

  const runBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    setBulkBusy(true);
    try {
      const res = await fetch(`${API}/api/students/bulk-delete`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        toast?.(json.message || "Bulk delete failed", "error");
      } else {
        toast?.(json.message || `Removed ${json.deleted ?? ids.length} student(s).`, "success");
        setSelectedIds(new Set());
        setBulkDeleteOpen(false);
        loadStudents(debouncedSearch, page, pageSize);
      }
    } catch {
      toast?.("Bulk delete failed.", "error");
    } finally {
      setBulkBusy(false);
    }
  };

  const runDeleteAll = async () => {
    setBulkBusy(true);
    try {
      const res = await fetch(`${API}/api/students/delete-all`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmPhrase: deleteAllPhrase.trim() }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        toast?.(json.message || "Delete all failed", "error");
      } else {
        toast?.(json.message || `Removed ${json.deleted ?? 0} student(s).`, "success");
        setSelectedIds(new Set());
        setDeleteAllOpen(false);
        setDeleteAllPhrase("");
        setPage(1);
        loadStudents(debouncedSearch, 1, pageSize);
      }
    } catch {
      toast?.("Delete all failed.", "error");
    } finally {
      setBulkBusy(false);
    }
  };

  const selectedCount = selectedIds.size;

  return (
    <div className="min-h-[100dvh] min-h-screen w-full min-w-0 overflow-x-hidden bg-gradient-to-br from-slate-50 via-amber-50/25 to-slate-100 pb-[env(safe-area-inset-bottom,0px)]">
      <div className="max-w-6xl mx-auto w-full min-w-0 px-3 sm:px-4 py-3 sm:py-5">

        <StudentsInstitutionalHeader
          schoolName={session?.schoolName}
          rows={rows}
          stats={registryStats}
          statsBusy={statsBusy}
          filterClass={filterClass}
          onClassChange={setFilterClass}
          filterYearTrimmed={filterYear.trim()}
          searchActive={!!debouncedSearch.trim()}
          onAdd={openAdd}
          rightHeaderAction={rightHeaderAction}
        >
          <div className="border-t border-slate-100 bg-slate-50/45 px-3 py-4 sm:px-5">
            <ImportCard toast={toast} onImported={() => loadStudents(debouncedSearch, 1, pageSize)} />
          </div>
          <div className="border-t border-slate-100 bg-white overflow-hidden max-w-full min-w-0">
            {/* Toolbar */}
            <div className="px-3 sm:px-4 py-3 border-b border-slate-100 flex flex-col gap-3 bg-white">
            {/* Search — full width; text-base on small screens reduces iOS zoom on focus */}
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                enterKeyHint="search"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search ID or name…"
                className="w-full min-h-[44px] rounded-xl border border-slate-200 pl-10 pr-3 py-2.5 text-base sm:text-xs text-slate-700 focus:border-amber-400 focus:ring-2 focus:ring-amber-200 outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] lg:flex lg:flex-wrap lg:items-end gap-2">
              <div className="min-w-0 lg:flex-1 lg:max-w-[16rem]">
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Academic year filter
                </label>
                <input
                  type="text"
                  value={filterYear}
                  onChange={e => setFilterYear(e.target.value)}
                  placeholder="e.g. 2024–2025 · leave empty for all years"
                  className="w-full min-h-[44px] sm:min-h-0 rounded-xl border border-slate-200 px-3 py-2.5 sm:py-2 text-base sm:text-xs text-slate-700 focus:border-amber-400 focus:ring-2 focus:ring-amber-200 outline-none"
                />
              </div>
              {(filterClass.trim() || filterYear.trim()) && (
                <button
                  type="button"
                  onClick={() => { setFilterClass(""); setFilterYear(""); }}
                  className="text-[12px] sm:text-[11px] font-bold text-amber-700 hover:text-amber-800 underline-offset-2 hover:underline py-2 sm:py-0 sm:self-end touch-manipulation min-h-[44px] sm:min-h-0 flex items-center"
                >
                  Clear class & year
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:justify-end sm:gap-2">
            <span className="text-[11px] font-semibold text-slate-500 mr-1">
              {selectedCount} selected
            </span>
            <button
              type="button"
              onClick={() => setBulkDeleteOpen(true)}
              disabled={selectedCount === 0 || bulkBusy}
              className="inline-flex items-center justify-center gap-1.5 min-h-[44px] sm:min-h-0 px-4 sm:px-3 py-2.5 sm:py-2 rounded-xl border border-red-200 bg-red-50 text-sm sm:text-xs font-bold text-red-700 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation flex-1 sm:flex-initial"
            >
              <Trash2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" /> Delete selected
            </button>
            <button
              type="button"
              onClick={() => setDeleteAllOpen(true)}
              disabled={bulkBusy || total === 0}
              className="inline-flex items-center justify-center gap-1.5 min-h-[44px] sm:min-h-0 px-4 sm:px-3 py-2.5 sm:py-2 rounded-xl border border-red-300 bg-white text-sm sm:text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation flex-1 sm:flex-initial"
            >
              <AlertTriangle className="w-4 h-4 sm:w-3.5 sm:h-3.5" /> Delete all
            </button>
            <button
              type="button"
              onClick={() => loadStudents(debouncedSearch, page, pageSize)}
              className="inline-flex items-center justify-center gap-1.5 min-h-[44px] sm:min-h-0 px-4 sm:px-3 py-2.5 sm:py-2 rounded-xl border border-slate-200 text-sm sm:text-xs font-bold text-slate-600 hover:bg-slate-50 touch-manipulation flex-1 sm:flex-initial"
            >
              <RefreshCw className="w-4 h-4 sm:w-3.5 sm:h-3.5" /> Refresh
            </button>

            <a
              href={`${API}/api/students/export.xlsx`}
              className="inline-flex items-center justify-center gap-1.5 min-h-[44px] sm:min-h-0 px-4 sm:px-3 py-2.5 sm:py-2 rounded-xl border border-emerald-200 bg-emerald-50 text-sm sm:text-xs font-bold text-emerald-700 hover:bg-emerald-100 touch-manipulation flex-1 sm:flex-initial"
            >
              <FileSpreadsheet className="w-4 h-4 sm:w-3.5 sm:h-3.5" /> Excel
            </a>
            <a
              href={`${API}/api/students/export.pdf`}
              className="inline-flex items-center justify-center gap-1.5 min-h-[44px] sm:min-h-0 px-4 sm:px-3 py-2.5 sm:py-2 rounded-xl border border-rose-200 bg-rose-50 text-sm sm:text-xs font-bold text-rose-700 hover:bg-rose-100 touch-manipulation flex-1 sm:flex-initial"
            >
              <FileText className="w-4 h-4 sm:w-3.5 sm:h-3.5" /> PDF
            </a>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="py-16 flex flex-col items-center gap-3 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
              <p className="text-xs font-semibold">Loading students…</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                <Users className="w-6 h-6 text-slate-300" />
              </div>
              <p className="text-sm font-semibold text-slate-400">No students found</p>
              <p className="text-[11px] text-slate-400 mt-1">
                {search || filterClass.trim() || filterYear.trim()
                  ? "Try different search or filters."
                  : "Add students manually or import from Excel."}
              </p>
            </div>
          ) : (
            <>
            {/* Mobile: stacked cards */}
            <div className="md:hidden divide-y divide-slate-100 border-t border-slate-100">
              {rows.map(s => {
                const hasMissing = parseMissingFields(s.import_missing_fields).length > 0;
                return (
                  <StudentMobileCard
                    key={s.id}
                    student={s}
                    hasMissing={hasMissing}
                    selected={selectedIds.has(s.id)}
                    onToggleSelect={toggleSelect}
                    onView={setViewStudent}
                    onEdit={openEdit}
                    onDelete={setDeleteTarget}
                  />
                );
              })}
            </div>

            {/* md+: data table */}
            <div className="hidden md:block w-full min-w-0 max-w-full overflow-x-auto overscroll-x-contain">
              <table className="w-full min-w-[1120px] lg:min-w-[1220px] text-xs">
                <thead>
                  <tr className="text-[10px] text-slate-400 uppercase tracking-wider bg-slate-50 border-b border-slate-100">
                    <th className="w-11 pl-3 pr-1 sm:pl-4 py-3 text-left">
                      <input
                        ref={tableHeaderSelectRef}
                        type="checkbox"
                        checked={rows.length > 0 && allPageSelected}
                        disabled={rows.length === 0}
                        onChange={toggleSelectAllPage}
                        className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-400"
                        title="Select all on this page"
                        aria-label="Select all students on this page"
                      />
                    </th>
                    <th className="px-3 sm:px-4 py-3 text-left font-semibold whitespace-nowrap">Photo</th>
                    <th className="px-3 sm:px-4 py-3 text-left font-semibold whitespace-nowrap">Student ID</th>
                    <th className="px-3 sm:px-4 py-3 text-left font-semibold whitespace-nowrap">SDMS ID</th>
                    <th className="px-3 sm:px-4 py-3 text-left font-semibold">Name</th>
                    <th className="px-3 sm:px-4 py-3 text-left font-semibold whitespace-nowrap">Class</th>
                    <th className="px-3 sm:px-4 py-3 text-left font-semibold whitespace-nowrap">Acad. year</th>
                    <th className="px-3 sm:px-4 py-3 text-left font-semibold whitespace-nowrap">RFID UID</th>
                    <th className="px-3 sm:px-4 py-3 text-left font-semibold whitespace-nowrap">Fingerprint</th>
                    <th className="px-3 sm:px-4 py-3 text-left font-semibold whitespace-nowrap">Gender</th>
                    <th className="px-3 sm:px-4 py-3 text-left font-semibold whitespace-nowrap">Birth</th>
                    <th className="px-3 sm:px-4 py-3 text-left font-semibold">Residence</th>
                    <th className="px-3 sm:px-4 py-3 text-left font-semibold">Father</th>
                    <th className="px-3 sm:px-4 py-3 text-left font-semibold">Mother</th>
                    <th className="px-3 sm:px-4 py-3 text-left font-semibold whitespace-nowrap">Registered</th>
                    <th className="px-3 sm:px-4 py-3 text-right font-semibold whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {rows.map(s => {
                    const hasMissing = parseMissingFields(s.import_missing_fields).length > 0;
                    return (
                      <tr key={s.id} className="hover:bg-amber-50/40 transition-colors group">
                        <td className="w-11 pl-3 pr-1 sm:pl-4 py-3 align-middle">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(s.id)}
                            onChange={() => toggleSelect(s.id)}
                            className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-400"
                            aria-label={`Select ${s.first_name} ${s.last_name}`}
                          />
                        </td>
                        <td className="px-3 sm:px-4 py-3">
                          <div className="w-11 h-11 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center shadow-inner">
                            {resolveMediaUrl(s.student_photo_url) ? (
                              <img
                                src={resolveMediaUrl(s.student_photo_url)}
                                alt={`${s.first_name} ${s.last_name}`}
                                className="w-full h-full object-cover [transform:translateZ(0)]"
                                decoding="async"
                                loading="lazy"
                              />
                            ) : (
                              <User className="w-5 h-5 text-slate-300" />
                            )}
                          </div>
                        </td>
                        <td className="px-3 sm:px-4 py-3">
                          <span className="font-mono font-semibold text-slate-700 text-[11px]">
                            {s.student_code || s.student_uid}
                          </span>
                          {hasMissing && (
                            <span className="ml-1 inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-amber-200 text-amber-700 text-[8px] font-semibold" title="Some residence fields are missing">!</span>
                          )}
                        </td>
                        <td className="px-3 sm:px-4 py-3 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                          {s.sdm_code || "—"}
                        </td>
                        <td className="px-3 sm:px-4 py-3 font-semibold text-slate-800">
                          {s.first_name} {s.last_name}
                        </td>
                        <td className="px-3 sm:px-4 py-3 text-slate-600 max-w-[100px]">
                          <span className="truncate block">{s.class_name || "—"}</span>
                        </td>
                        <td className="px-3 sm:px-4 py-3 text-slate-600 whitespace-nowrap">
                          {s.academic_year || "—"}
                        </td>
                        <td className="px-3 sm:px-4 py-3 text-slate-600 font-mono whitespace-nowrap">
                          {s.rfid_uid || "—"}
                        </td>
                        <td className="px-3 sm:px-4 py-3 text-slate-600 font-mono whitespace-nowrap">
                          {s.fingerprint_id || "—"}
                        </td>
                        <td className="px-3 sm:px-4 py-3 text-slate-600">{s.gender || "—"}</td>
                        <td className="px-3 sm:px-4 py-3 text-slate-600 whitespace-nowrap">{s.birth_year || "—"}</td>
                        <td className="px-3 sm:px-4 py-3 text-slate-500 max-w-[140px]">
                          <span className="truncate block">
                            {[s.district, s.sector, s.village].filter(Boolean).join(", ") || "—"}
                          </span>
                        </td>
                        <td className="px-3 sm:px-4 py-3 text-slate-500 max-w-[140px]">
                          <span className="block break-words">
                            {s.father_full_name || "—"}
                            {s.father_phone ? (
                              <span className="block font-mono text-[10px] mt-0.5 whitespace-pre-wrap">{s.father_phone}</span>
                            ) : null}
                            {s.father_email ? (
                              <span className="block text-[10px] text-slate-600 mt-0.5 break-all">{s.father_email}</span>
                            ) : null}
                            {s.father_national_id ? (
                              <span className="block font-mono text-[10px] text-slate-600 mt-0.5">ID: {s.father_national_id}</span>
                            ) : null}
                          </span>
                        </td>
                        <td className="px-3 sm:px-4 py-3 text-slate-500 max-w-[140px]">
                          <span className="block break-words">
                            {s.mother_full_name || "—"}
                            {s.mother_phone ? (
                              <span className="block font-mono text-[10px] mt-0.5 whitespace-pre-wrap">{s.mother_phone}</span>
                            ) : null}
                            {s.mother_email ? (
                              <span className="block text-[10px] text-slate-600 mt-0.5 break-all">{s.mother_email}</span>
                            ) : null}
                            {s.mother_national_id ? (
                              <span className="block font-mono text-[10px] text-slate-600 mt-0.5">ID: {s.mother_national_id}</span>
                            ) : null}
                          </span>
                        </td>
                        <td className="px-3 sm:px-4 py-3 text-slate-400 whitespace-nowrap">
                          {s.created_at ? new Date(s.created_at).toLocaleDateString("en-RW") : "—"}
                        </td>
                        <td className="px-3 sm:px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => setViewStudent(s)}
                              className="min-w-[40px] min-h-[40px] w-9 h-9 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-all touch-manipulation"
                              title="View details"
                            >
                              <Eye className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => openEdit(s)}
                              className="min-w-[40px] min-h-[40px] w-9 h-9 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center border border-amber-200 bg-amber-50 text-amber-600 hover:bg-amber-100 transition-all touch-manipulation"
                              title="Edit student"
                            >
                              <Pencil className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(s)}
                              className="min-w-[40px] min-h-[40px] w-9 h-9 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center border border-red-200 bg-red-50 text-red-500 hover:bg-red-100 transition-all touch-manipulation"
                              title="Delete student"
                            >
                              <Trash2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            </>
          )}

          {/* Pagination */}
          {!loading && rows.length > 0 && (
            <div className="px-3 sm:px-4 py-3 border-t border-slate-100 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[12px] sm:text-[11px] text-slate-500 text-center sm:text-left order-2 sm:order-1">
                Showing <span className="font-semibold">{rows.length}</span> of <span className="font-semibold">{total}</span> students
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 order-1 sm:order-2">
                <select
                  value={pageSize}
                  onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
                  className="min-h-[44px] sm:min-h-0 rounded-xl border border-slate-200 px-3 py-2 text-sm sm:text-[11px] font-semibold text-slate-600 touch-manipulation"
                >
                  {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n} / page</option>)}
                </select>
                <button
                  type="button"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="min-h-[44px] sm:min-h-0 px-4 sm:px-3 py-2 sm:py-1.5 rounded-xl sm:rounded-lg border border-slate-200 text-sm sm:text-[11px] font-bold text-slate-600 disabled:opacity-40 hover:bg-slate-50 touch-manipulation"
                >
                  ← Prev
                </button>
                <span className="text-sm sm:text-[11px] text-slate-500 font-semibold px-2 tabular-nums">
                  {page} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="min-h-[44px] sm:min-h-0 px-4 sm:px-3 py-2 sm:py-1.5 rounded-xl sm:rounded-lg border border-slate-200 text-sm sm:text-[11px] font-bold text-slate-600 disabled:opacity-40 hover:bg-slate-50 touch-manipulation"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
        </StudentsInstitutionalHeader>

      </div>

      {/* Modals */}
      <StudentWizardModal
        open={modalOpen}
        onClose={closeModal}
        session={session}
        toast={toast}
        onSuccess={() => loadStudents(debouncedSearch, page, pageSize)}
        editStudent={editStudent}
      />

      <StudentDetailModal
        student={viewStudent}
        onClose={() => setViewStudent(null)}
        onEdit={s => { setViewStudent(null); openEdit(s); }}
      />

      <DeleteModal
        student={deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        loading={deleting}
      />

      {bulkDeleteOpen && selectedCount > 0 && (
        <BulkDeleteModal
          count={selectedCount}
          onCancel={() => { if (!bulkBusy) setBulkDeleteOpen(false); }}
          onConfirm={runBulkDelete}
          loading={bulkBusy}
        />
      )}

      {deleteAllOpen && (
        <DeleteAllStudentsModal
          schoolName={session?.schoolName}
          phrase={deleteAllPhrase}
          onPhraseChange={setDeleteAllPhrase}
          onCancel={() => {
            if (!bulkBusy) {
              setDeleteAllOpen(false);
              setDeleteAllPhrase("");
            }
          }}
          onConfirm={runDeleteAll}
          loading={bulkBusy}
        />
      )}
    </div>
  );
}