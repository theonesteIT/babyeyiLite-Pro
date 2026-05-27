import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Users, Loader2, CheckCircle2, AlertTriangle,
  X, ChevronRight, MapPin, Fingerprint, CreditCard, Camera, Settings, FileText
} from "lucide-react";
import schoolService from "../services/schoolService";
import { useAuth } from "../context/AuthContext";

// API Resolution pointing strictly to the central backend
const API = import.meta.env.VITE_API_URL || "http://localhost:5100";

// ─── Birth year range ────────────────────────────────────────────
const YEARS = (() => {
  const now = new Date().getFullYear();
  const out = [];
  for (let y = now - 3; y >= now - 30; y -= 1) out.push(y);
  return out;
})();

const ACADEMIC_YEARS = [
  "2023", "2023-2024", "2024", "2024-2025", "2025", "2025-2026", "2026", "2026-2027", "2027"
];

// Province display labels -- must match what locationRoutes.js returns.
const RWANDA_PROVINCES = [
  "Kigali City",
  "Northern Province",
  "Southern Province",
  "Eastern Province",
  "Western Province",
];

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

export function normalizeProvinceForUI(raw) {
  if (!raw) return "";
  return PROVINCE_NORMALIZE_MAP[raw.trim().toLowerCase()] || raw.trim();
}

export function normalizeLocationTokenForUI(raw) {
  if (raw === undefined || raw === null) return "";
  return String(raw).trim();
}

// ════════════════════════════════════════════════════════════════
// Location hook — fetches districts → sectors → cells lazily
// ════════════════════════════════════════════════════════════════
export function useLocationCascade(province, district, sector, cell) {
  const [districts, setDistricts] = useState([]);
  const [sectors,   setSectors]   = useState([]);
  const [cells,     setCells]     = useState([]);
  const [villages,  setVillages]  = useState([]);
  const [loading,   setLoading]   = useState({ districts: false, sectors: false, cells: false, villages: false });
  const [errors,    setErrors]    = useState({ districts: "", sectors: "", cells: "", villages: "" });

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
           setErrors(prev => ({ ...prev, districts: data?.message || "Failed to load districts. Please check location service." }));
        }
      })
      .catch(() => {
        setDistricts([]);
        setErrors(prev => ({ ...prev, districts: "Failed to load districts. Please check network." }));
      })
      .finally(() => setLoading(l => ({ ...l, districts: false })));
  }, [province]);

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
           setErrors(prev => ({ ...prev, sectors: data?.message || "Failed to load sectors." }));
        }
      })
      .catch(() => {
        setSectors([]);
        setErrors(prev => ({ ...prev, sectors: "Failed to load sectors." }));
      })
      .finally(() => setLoading(l => ({ ...l, sectors: false })));
  }, [province, district]);

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
          setErrors(prev => ({ ...prev, cells: data?.message || "Failed to load cells." }));
        }
      })
      .catch(() => {
        setCells([]);
        setErrors(prev => ({ ...prev, cells: "Failed to load cells." }));
      })
      .finally(() => setLoading(l => ({ ...l, cells: false })));
  }, [province, district, sector]);

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
          setErrors(prev => ({ ...prev, villages: data?.message || "Failed to load villages." }));
        }
      })
      .catch(() => {
        setVillages([]);
        setErrors(prev => ({ ...prev, villages: "Failed to load villages." }));
      })
      .finally(() => setLoading(l => ({ ...l, villages: false })));
  }, [province, district, sector, cell]);

  return { districts, sectors, cells, villages, loading, errors };
}


const inputCls = "w-full h-9 bg-re-bg rounded-lg px-3 outline-none border border-transparent focus:border-[#1E3A5F]/20 focus:bg-white transition-all text-re-text text-[9px] sm:text-[10px] font-semibold tracking-tight shadow-inner placeholder:text-re-text-muted/40";
const selectCls = `${inputCls} cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%236b7280%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:10px_10px] bg-no-repeat bg-[position:right_1rem_center] pr-10`;
const labelCls = "block text-[9px] font-semibold text-[#1E3A5F] uppercase tracking-[0.2em] mb-1.5 opacity-80";

function FormField({ label, required, children }) {
  return (
    <div>
      <label className={labelCls}>{label}{required && <span className="text-red-400 ml-0.5">*</span>}</label>
      {children}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// StudentWizardModal
// ════════════════════════════════════════════════════════════════
export default function StudentWizardModal({ open, onClose, session, toast, onSuccess, editStudent = null }) {
  const isEdit = !!editStudent?.id;

  const BLANK_FORM = {
    student_uid: "", autoId: true, first_name: "", last_name: "", gender: "", birth_year: "", nationality: "Rwandan",
    class_name: "", class_id: "", academic_year: "2025", sdm_code: "", province: "", district: "", sector: "", cell: "", village: "",
    father_full_name: "", father_phone: "", father_email: "", mother_full_name: "", mother_phone: "", mother_email: "",
    rfid_uid: "", fingerprint_id: "", identity_remarks: "",
    residency_status: "DAY"
  };

  const STEPS = [
    { id: 1, label: "Identity", icon: Users },
    { id: 2, label: "Residence", icon: MapPin },
    { id: 3, label: "Parents", icon: Users },
    { id: 4, label: "Credentials (Optional)", icon: Fingerprint },
  ];

  const { manager, teacher } = useAuth();
  const sessionUser = manager || teacher;
  const [classes, setClasses] = useState([]);
  const [fetchingClasses, setFetchingClasses] = useState(false);

  const [step, setStep] = useState(1);
  const [form, setForm] = useState(BLANK_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  const { districts, sectors, cells, villages, loading: locLoading, errors: locErrors } =
    useLocationCascade(form.province, form.district, form.sector, form.cell);

  useEffect(() => {
    if (!open) return;
    setStep(1); setError(null); setLoading(false);
    setPhotoFile(null); setPhotoPreview(null);
    if (isEdit) {
      setForm({
        ...BLANK_FORM,
        ...editStudent,
        autoId: false,
        birth_year: editStudent.birth_year ? String(editStudent.birth_year) : "",
        province: normalizeProvinceForUI(editStudent.province || ""),
        district: normalizeLocationTokenForUI(editStudent.district),
        sector: normalizeLocationTokenForUI(editStudent.sector),
        cell: normalizeLocationTokenForUI(editStudent.cell),
        village: normalizeLocationTokenForUI(editStudent.village),
        academic_year: editStudent.academic_year ? String(editStudent.academic_year) : "",
      });
    } else setForm(BLANK_FORM);

    const loadClasses = async () => {
      const sid = sessionUser?.school_id || sessionUser?.schoolId || session?.school_id || session?.schoolId || session?.school?.id;
      if (!sid) return;
      setFetchingClasses(true);
      try {
        const res = await schoolService.getGroups(sid);
        if (res.success) setClasses(res.data || []);
      } catch (err) {
        console.error("Failed to load classes for wizard:", err);
      } finally {
        setFetchingClasses(false);
      }
    };
    loadClasses();
  }, [open, editStudent?.id, sessionUser?.school_id, session?.school_id]);

  useEffect(() => {
    if (!open || !isEdit || !classes.length) return;
    if (form.class_id) return;
    const cn = String(form.class_name || editStudent?.class_name || "").trim();
    if (!cn) return;
    const match = classes.find((c) => {
      const label = `${c.group_name || ""} ${c.stream_name || ""} ${c.combination || ""}`.trim();
      return label === cn || String(c.group_name || "").trim() === cn;
    });
    if (match) {
      setForm((prev) => ({
        ...prev,
        class_id: String(match.id),
        class_name: `${match.group_name || ""} ${match.stream_name || ""} ${match.combination || ""}`.trim(),
      }));
    }
  }, [open, isEdit, classes, editStudent?.id, editStudent?.class_name, form.class_id, form.class_name]);

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const setProvince = (v) => setForm(prev => ({ ...prev, province: v, district: "", sector: "", cell: "", village: "" }));
  const setDistrict = (v) => setForm(prev => ({ ...prev, district: v, sector: "", cell: "", village: "" }));
  const setSector   = (v) => setForm(prev => ({ ...prev, sector: v, cell: "", village: "" }));
  const setCell     = (v) => setForm(prev => ({ ...prev, cell: v, village: "" }));

  const validateStep = (s) => {
    if (s === 1) {
      if (!form.first_name.trim()) return "First name is required.";
      if (!form.last_name.trim()) return "Last name is required.";
      if (!form.gender) return "Gender is required.";
      if (!form.birth_year) return "Please select a birth year.";
      if (!form.academic_year && !isEdit) return "Please select an academic year.";
      if (!form.class_id && !String(form.class_name || "").trim()) return "Please select a homeroom/class.";
      if (!form.autoId && !form.student_uid.trim()) return "Enter a student ID or enable auto-generate.";
    }
    if (s === 2) {
      if (!form.province) return "Please select a province.";
      if (!form.district) return "Please select a district.";
      if (!form.sector) return "Please select a sector.";
      if (!form.cell) return "Please select a cell.";
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

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!["image/jpeg", "image/jpg", "image/png"].includes(file.type)) { setError("Only JPG and PNG images are allowed."); return; }
    if (file.size > 5 * 1024 * 1024) { setError("Image size must be less than 5MB."); return; }
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    setLoading(true); setError(null);
    const payload = { ...form };
    let studentId = isEdit ? editStudent.id : null;

    try {
      const url = isEdit ? `${API}/api/students/${studentId}` : `${API}/api/students`;
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) { setError(json.message || "Failed to save student."); setLoading(false); return; }
      
      // If new, get the ID from response
      if (!isEdit && json.data?.id) studentId = json.data.id;

      // Handle Photo Upload if selected
      if (photoFile && studentId) {
        const photoData = new FormData();
        photoData.append("photo", photoFile);
        const pRes = await fetch(`${API}/api/students/${studentId}/identity/photo`, {
          method: "PUT",
          credentials: "include",
          body: photoData,
        });
        if (!pRes.ok) {
          setError("Student saved, but photo upload failed. You can add it later.");
          setLoading(false);
          return;
        }
        // Auto-build card cache right after photo upload so card pages are instant.
        await fetch(`${API}/api/student-cards/cache/refresh/${studentId}`, {
          method: "POST",
          credentials: "include",
        }).catch(() => null);
      }
      
      if(toast) toast(isEdit ? "Student updated" : "Student registered", "success");
      if(onSuccess) onSuccess();
      onClose();
    } catch {
      setError("Cannot connect to server. Please try again.");
      setLoading(false);
    }
  };

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
        <div className="absolute inset-0 bg-[#0A192F]/60 backdrop-blur-xl animate-in fade-in duration-500" onClick={() => !loading && onClose()} />
        <div className="relative w-full max-w-4xl max-h-[92vh] bg-re-bg rounded-3xl shadow-[0_32px_128px_-15px_rgba(30,58,95,0.4)] border border-white/20 flex flex-col overflow-hidden animate-in zoom-in-95 fade-in duration-500">
            
            {/* Header */}
            <div className="relative z-10 bg-re-grad-navy px-5 py-3 shrink-0">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 text-re-gold shadow-md shadow-re-gold/10">
                            <Settings size={16} className="animate-spin-slow" />
                        </div>
                        <div>
                            <h1 className="text-[11px] font-semibold text-white uppercase tracking-widest leading-none">{isEdit ? 'Refine Institutional Record' : 'Register Student Identity'}</h1>
                            <p className="text-[7px] font-bold text-white/40 uppercase tracking-tight mt-1">{session?.schoolName || "Global Registry"} · Wizard</p>
                        </div>
                    </div>
                    <button onClick={onClose} disabled={loading} className="p-1.5 bg-white/5 hover:bg-white/10 rounded-xl transition-all text-white/40 hover:text-re-gold group disabled:opacity-50">
                        <X size={14} className="group-hover:rotate-90 transition-all duration-300" />
                    </button>
                </div>

                {/* Stepper */}
                <div className="relative flex items-center">
                    <div className="flex items-center justify-between gap-1 overflow-x-auto scrollbar-none pb-0.5 scroll-smooth w-full px-1">
                        {STEPS.map((s, idx) => (
                            <div key={s.id} className="flex items-center shrink-0">
                                <button onClick={() => setStep(s.id)} disabled={loading} className={`flex items-center gap-1.5 transition-all outline-none ${step === s.id ? 'opacity-100' : 'opacity-30 hover:opacity-60'}`}>
                                    <div className={`w-6 h-6 rounded-md flex items-center justify-center border transition-all ${
                                        step === s.id ? 'bg-re-gold border-re-gold text-[#1E3A5F] shadow-[0_0_15px_rgba(254,191,16,0.2)] scale-105' : 
                                        step > s.id ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white/5 border-white/10 text-white'
                                    }`}>
                                        {step > s.id ? <CheckCircle2 size={12} /> : <s.icon size={10} />}
                                    </div>
                                    <div className="text-left hidden lg:block">
                                        <p className={`text-[6px] font-semibold uppercase tracking-widest leading-none mb-0.5 text-white/40`}>Phase 0{s.id}</p>
                                        <p className="text-[8px] font-semibold text-white tracking-tight">{s.label}</p>
                                    </div>
                                </button>
                                {idx < STEPS.length - 1 && <div className="w-3 h-px bg-white/10 mx-1.5" />}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar bg-re-bg/50 px-4 sm:px-6 py-4">
                <div className="max-w-3xl mx-auto space-y-4">
                    {error && (
                      <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 shadow-sm animate-in fade-in">
                        <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                        <p className="text-xs font-bold text-red-800 tracking-tight leading-relaxed">{error}</p>
                      </div>
                    )}
                    
                    <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-4 sm:p-5 min-h-[250px]">
                      
                      {step === 1 && (
                        <div className="space-y-4 animate-in slide-in-from-right-4">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border border-black/5 bg-re-bg/30 p-3 shadow-sm">
                            <label className="flex items-center gap-3 cursor-pointer select-none shrink-0">
                              <div role="switch" onClick={() => set("autoId", !form.autoId)} className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${form.autoId ? "bg-[#1E3A5F]" : "bg-black/10"}`}>
                                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${form.autoId ? "translate-x-6 bg-re-gold" : "translate-x-0.5"}`} />
                              </div>
                              <span className="text-[10px] font-semibold text-re-text uppercase tracking-widest">Auto-Gen ID</span>
                            </label>
                            <input type="text" placeholder={form.autoId ? "Assign automatically generated UID..." : "Enter strict student ID"} value={form.student_uid} onChange={e => set("student_uid", e.target.value)} disabled={form.autoId} className="w-full sm:flex-1 h-10 rounded-xl border border-transparent bg-white px-4 text-[10px] font-semibold uppercase tracking-widest text-[#1E3A5F] placeholder:text-re-text-muted/40 disabled:bg-re-bg disabled:opacity-50 focus:border-[#1E3A5F]/20 focus:shadow-inner outline-none transition-all shadow-sm" />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <FormField label="First Name" required><input type="text" className={inputCls} placeholder="e.g. Samuel" value={form.first_name} onChange={e => set("first_name", e.target.value)} /></FormField>
                            <FormField label="Last Name" required><input type="text" className={inputCls} placeholder="e.g. Murenzi" value={form.last_name} onChange={e => set("last_name", e.target.value)} /></FormField>
                            <FormField label="Gender" required><select className={selectCls} value={form.gender} onChange={e => set("gender", e.target.value)}><option value="">Select…</option><option value="Male">Male</option><option value="Female">Female</option></select></FormField>
                            <FormField label="Birth Year" required><select className={selectCls} value={form.birth_year} onChange={e => set("birth_year", e.target.value)}><option value="">Select…</option>{YEARS.map(y => <option key={y} value={y}>{y}</option>)}</select></FormField>
                            <FormField label="Nationality"><input type="text" className={inputCls} value={form.nationality} onChange={e => set("nationality", e.target.value)} /></FormField>
                            <FormField label="Homeroom / Class" required>
                              <select 
                                className={selectCls} 
                                value={form.class_id || ""} 
                                onChange={e => {
                                  const cid = e.target.value;
                                  const selected = classes.find(c => String(c.id) === String(cid));
                                  setForm(prev => ({ 
                                    ...prev, 
                                    class_id: cid, 
                                    class_name: selected ? `${selected.group_name} ${selected.stream_name || ''} ${selected.combination || ''}`.trim() : "" 
                                  }));
                                }}
                              >
                                <option value="">{fetchingClasses ? "Fetching registry..." : "Select Class..."}</option>
                                {classes.map(c => (
                                  <option key={c.id} value={c.id}>
                                    {c.group_name} {c.stream_name || ''} {c.combination ? `(${c.combination})` : ''}
                                  </option>
                                ))}
                              </select>
                            </FormField>
                            <FormField label="Academic Year" required>
                              <select className={selectCls} value={form.academic_year} onChange={e => set("academic_year", e.target.value)}>
                                <option value="">Select Year…</option>
                                {ACADEMIC_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                              </select>
                            </FormField>
                            <FormField label="Residency Status" required>
                              <select className={selectCls} value={form.residency_status} onChange={e => set("residency_status", e.target.value)}>
                                <option value="DAY">Day Student</option>
                                <option value="BOARDING">Boarding Student</option>
                              </select>
                            </FormField>
                          </div>

                          <div className="flex flex-col sm:flex-row gap-4 rounded-lg border border-black/5 bg-re-bg/30 p-4">
                            <div className="flex flex-col items-center sm:items-start shrink-0">
                              <label className="text-[8px] font-semibold text-[#1E3A5F] uppercase tracking-[0.2em] mb-1.5 opacity-80">
                                Profile photo (optional)
                              </label>
                              <div className="relative w-28 h-28 rounded-2xl overflow-hidden border-2 border-dashed border-[#1E3A5F]/20 hover:border-re-gold bg-white flex flex-col justify-center items-center transition-colors">
                                <input
                                  type="file"
                                  disabled={loading}
                                  accept="image/png, image/jpeg"
                                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                  onChange={handlePhotoChange}
                                />
                                {(photoPreview || editStudent?.student_photo_url) ? (
                                  <img
                                    src={photoPreview || `${API}${editStudent.student_photo_url}`}
                                    alt="Student"
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <>
                                    <Camera size={20} className="text-[#1E3A5F]/30 mb-1.5" />
                                    <span className="text-[7px] font-bold text-center text-[#1E3A5F]/50 uppercase tracking-widest px-2">
                                      Upload
                                    </span>
                                  </>
                                )}
                              </div>
                              <p className="text-[9px] text-re-text-muted mt-2 max-w-[9rem] text-center sm:text-left">
                                JPG or PNG, max 5MB
                              </p>
                            </div>
                            <p className="text-[10px] text-re-text-muted leading-relaxed flex-1 flex items-center">
                              Optional portrait for student cards and class lists. You can add or change it anytime when editing.
                            </p>
                          </div>
                        </div>
                      )}

                      {step === 2 && (
                        <div className="space-y-3 animate-in slide-in-from-right-4">
                          <div className="rounded-lg border border-black/5 bg-re-bg/30 p-4 shadow-sm">
                            <div className="flex items-start gap-3 mb-4">
                              <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center border border-black/5 shadow-sm shrink-0">
                                <MapPin size={14} className="text-[#1E3A5F]" />
                              </div>
                              <div>
                                <h3 className="text-[11px] sm:text-xs font-semibold uppercase tracking-tight text-[#1E3A5F]">Residence Details</h3>
                                <p className="text-[8px] sm:text-[9px] uppercase font-semibold text-re-text-muted mt-0.5 opacity-60 tracking-widest">Geographic location tracking</p>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <FormField label="Province/System" required><select className={selectCls} value={form.province} onChange={e => setProvince(e.target.value)}><option value="">Select…</option>{RWANDA_PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}</select></FormField>
                              <FormField label="District" required><select className={selectCls} value={form.district} onChange={e => setDistrict(e.target.value)} disabled={!form.province || locLoading.districts}><option value="">{locLoading.districts ? "Loading…" : form.province ? "Select…" : "— pick province first —"}</option>{districts.map(d => <option key={d} value={d}>{d}</option>)}</select></FormField>
                              <FormField label="Sector" required><select className={selectCls} value={form.sector} onChange={e => setSector(e.target.value)} disabled={!form.district || locLoading.sectors}><option value="">{locLoading.sectors ? "Loading…" : form.district ? "Select…" : "— pick district first —"}</option>{sectors.map(s => <option key={s} value={s}>{s}</option>)}</select></FormField>
                              <FormField label="Cell" required><select className={selectCls} value={form.cell} onChange={e => setCell(e.target.value)} disabled={!form.sector || locLoading.cells}><option value="">{locLoading.cells ? "Loading…" : form.sector ? "Select…" : "— pick sector first —"}</option>{cells.map(c => <option key={c} value={c}>{c}</option>)}</select></FormField>
                              <div className="col-span-1 sm:col-span-2"><FormField label="Village Designation" required><select className={selectCls} value={form.village} onChange={e => set("village", e.target.value)} disabled={!form.cell || locLoading.villages}><option value="">{locLoading.villages ? "Loading…" : form.cell ? "Select…" : "— pick cell first —"}</option>{villages.map(v => <option key={v} value={v}>{v}</option>)}</select></FormField></div>
                            </div>
                          </div>
                        </div>
                      )}

                      {step === 3 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in slide-in-from-right-4">
                          <div className="rounded-lg border border-black/5 bg-re-bg/30 p-4 space-y-3 shadow-sm">
                            <p className="text-[9px] font-semibold text-[#1E3A5F] uppercase tracking-widest border-b border-black/10 pb-2">Father / Guardian Details</p>
                            <input type="text" className={inputCls} placeholder="Full name" value={form.father_full_name} onChange={e => set("father_full_name", e.target.value)} />
                            <input type="tel" className={inputCls} placeholder="Phone: 07xxxxxxxx" value={form.father_phone} onChange={e => set("father_phone", e.target.value)} />
                            <input type="email" className={inputCls} placeholder="Email" value={form.father_email} onChange={e => set("father_email", e.target.value)} />
                          </div>
                          <div className="rounded-lg border border-black/5 bg-re-bg/30 p-4 space-y-3 shadow-sm">
                            <p className="text-[10px] font-semibold text-[#1E3A5F] uppercase tracking-widest border-b border-black/10 pb-2">Mother / Guardian Details</p>
                            <input type="text" className={inputCls} placeholder="Full name" value={form.mother_full_name} onChange={e => set("mother_full_name", e.target.value)} />
                            <input type="tel" className={inputCls} placeholder="Phone: 07xxxxxxxx" value={form.mother_phone} onChange={e => set("mother_phone", e.target.value)} />
                            <input type="email" className={inputCls} placeholder="Email" value={form.mother_email} onChange={e => set("mother_email", e.target.value)} />
                          </div>
                        </div>
                      )}

                      {step === 4 && (
                        <div className="space-y-3 animate-in slide-in-from-right-4">
                          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
                            <p className="text-[9px] font-semibold text-amber-800 uppercase tracking-wider">Optional step</p>
                            <p className="text-[10px] text-amber-700 mt-1">
                              RFID UID, fingerprint ID, and remarks are optional. Profile photo is on the Identity step.
                            </p>
                          </div>
                          <div className="space-y-3">
                              <FormField label="RFID Gateway Tag UID (Optional)">
                                <div className="relative">
                                  <CreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#1E3A5F]/30" size={16} />
                                  <input type="text" className={`${inputCls} pl-10`} placeholder="Scan or enter RFID..." value={form.rfid_uid} onChange={e => set("rfid_uid", e.target.value)} disabled={loading} />
                                </div>
                              </FormField>
                              
                              <FormField label="Biometric Fingerprint ID (Optional)">
                                <div className="relative">
                                  <Fingerprint className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#1E3A5F]/30" size={16} />
                                  <input type="text" className={`${inputCls} pl-10`} placeholder="Enter generated FP ID..." value={form.fingerprint_id} onChange={e => set("fingerprint_id", e.target.value)} disabled={loading} />
                                </div>
                              </FormField>

                              <FormField label="Access / Identity Remarks (Optional)">
                                <div className="relative">
                                  <FileText className="absolute left-3.5 top-3.5 text-[#1E3A5F]/30" size={16} />
                                  <textarea className={`${inputCls} pl-10 py-3 resize-none h-20 min-h-[80px]`} placeholder="Special access instructions..." value={form.identity_remarks} onChange={e => set("identity_remarks", e.target.value)} disabled={loading} />
                                </div>
                              </FormField>
                          </div>
                        </div>
                      )}
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="bg-white border-t border-black/5 px-5 sm:px-6 py-2 flex items-center justify-between shrink-0 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
                <div className="flex items-center gap-2">
                     <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                     <p className="text-[7px] font-semibold text-re-text-muted uppercase tracking-[0.2em] opacity-30 italic hidden sm:block">Automated Validation Active</p>
                </div>
                <div className="flex items-center gap-2">
                    <button type="button" onClick={step === 1 ? onClose : prevStep} disabled={loading} className="h-9 px-4 rounded-lg border border-black/5 text-re-navy font-medium text-[9px] uppercase tracking-widest hover:bg-re-bg transition-all active:scale-95 disabled:opacity-50">
                      {step === 1 ? "Cancel" : "Back"}
                    </button>
                    {step < 4 ? (
                      <button type="button" onClick={nextStep} disabled={loading} className="h-9 px-6 rounded-lg bg-re-grad-navy text-white font-medium text-[9px] uppercase tracking-widest shadow-re-premium-navy active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-50">
                          Continue <ChevronRight size={14} />
                      </button>
                    ) : (
                      <button type="button" onClick={handleSubmit} disabled={loading} className="h-9 px-6 rounded-lg bg-re-gold text-[#1E3A5F] font-medium text-[9px] uppercase tracking-widest shadow-md shadow-re-gold/30 active:scale-95 transition-all flex items-center gap-1.5 overflow-hidden relative disabled:opacity-50">
                        {loading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                        {loading ? "Transmitting..." : isEdit ? "Save Profile" : "Register Now"}
                      </button>
                    )}
                </div>
            </div>
        </div>
    </div>,
    document.body
  );
}
