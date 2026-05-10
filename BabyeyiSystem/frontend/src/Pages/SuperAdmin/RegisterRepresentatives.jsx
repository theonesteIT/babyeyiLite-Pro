// Super Admin — School Representatives CRUD
// Wizard: Personal info → Login credentials → Search & assign schools.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  ArrowLeft,
  Building2,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Pencil,
  Search,
  Star,
  StarOff,
  Trash2,
  UserPlus,
  Users,
  X,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import LogoutButton from "../Auth/LogoutButton";

const API = `${import.meta.env.VITE_API_URL || "http://localhost:5100"}/api`;
const axCfg = { withCredentials: true, headers: { "Content-Type": "application/json" } };

const STEPS = ["Personal info", "Login credentials", "Assign schools"];

const ORG_TYPES = [
  "Owner / individual",
  "Director",
  "Church organization",
  "Cooperative",
  "Education group",
  "NGO",
  "Government body",
  "Other",
];

const initialForm = {
  first_name: "",
  last_name: "",
  phone: "",
  national_id: "",
  gender: "",
  date_of_birth: "",
  organization_name: "",
  organization_type: "",
  address: "",
  notes: "",
  email: "",
  password: "",
  password2: "",
};

export default function RegisterRepresentatives() {
  const navigate = useNavigate();
  const auth = useAuth();
  const [reps, setReps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [modal, setModal] = useState(null); // 'create' | { type:'edit', row }
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [form, setForm] = useState(initialForm);

  // School assignment state
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedSchools, setSelectedSchools] = useState([]); // [{ id, school_name, school_code, district, ... }]
  const [primaryId, setPrimaryId] = useState(null);
  const debounceRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API}/representatives`, axCfg);
      if (r.data.success) setReps(r.data.data || []);
    } catch (e) {
      setToast({ type: "error", message: e.response?.data?.message || "Failed to load representatives" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  // Debounced school search
  useEffect(() => {
    if (!modal) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const r = await axios.get(`${API}/representatives/search/schools`, {
          ...axCfg,
          params: { q: search, limit: 60 },
        });
        if (r.data.success) setSearchResults(r.data.data || []);
      } catch (e) {
        setToast({ type: "error", message: e.response?.data?.message || "Search failed" });
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(debounceRef.current);
  }, [search, modal]);

  const resetWizard = () => {
    setForm(initialForm);
    setStep(0);
    setSelectedSchools([]);
    setPrimaryId(null);
    setSearch("");
    setSearchResults([]);
    setShowPw(false);
  };

  const openCreate = () => {
    resetWizard();
    setModal("create");
  };

  const openEdit = async (row) => {
    resetWizard();
    setForm({
      first_name: row.first_name || "",
      last_name: row.last_name || "",
      phone: row.phone || "",
      national_id: "",
      gender: "",
      date_of_birth: "",
      organization_name: row.organization_name || "",
      organization_type: row.organization_type || "",
      address: "",
      notes: "",
      email: row.email || "",
      password: "",
      password2: "",
    });
    try {
      const r = await axios.get(`${API}/representatives/${row.id}`, axCfg);
      if (r.data.success) {
        const det = r.data.data;
        setForm((f) => ({
          ...f,
          national_id: det.national_id || "",
          gender: det.gender || "",
          date_of_birth: det.date_of_birth ? String(det.date_of_birth).slice(0, 10) : "",
          address: det.address || "",
          notes: det.notes || "",
        }));
        setSelectedSchools(det.schools || []);
        const primary = (det.schools || []).find((s) => s.is_primary);
        setPrimaryId(primary?.id || null);
      }
    } catch (_) {}
    setModal({ type: "edit", row });
  };

  const isSelected = (id) => selectedSchools.some((s) => s.id === id);
  const toggleSchool = (school) => {
    setSelectedSchools((prev) => {
      const exists = prev.some((s) => s.id === school.id);
      if (exists) {
        if (primaryId === school.id) setPrimaryId(null);
        return prev.filter((s) => s.id !== school.id);
      }
      return [...prev, school];
    });
  };
  const removeSelected = (id) => {
    setSelectedSchools((prev) => prev.filter((s) => s.id !== id));
    if (primaryId === id) setPrimaryId(null);
  };

  const nextStep = () => {
    if (step === 0) {
      if (!form.first_name.trim() || !form.last_name.trim()) {
        setToast({ type: "error", message: "Enter first and last name." });
        return;
      }
    }
    if (step === 1) {
      const isCreate = modal === "create";
      if (isCreate) {
        if (!form.email.trim()) {
          setToast({ type: "error", message: "Email is required." });
          return;
        }
        if (!form.password || form.password.length < 8) {
          setToast({ type: "error", message: "Password must be at least 8 characters." });
          return;
        }
        if (form.password !== form.password2) {
          setToast({ type: "error", message: "Passwords do not match." });
          return;
        }
      } else if (form.password) {
        if (form.password.length < 8 || form.password !== form.password2) {
          setToast({ type: "error", message: "Passwords must match and be 8+ characters." });
          return;
        }
      }
    }
    setStep((s) => Math.min(s + 1, 2));
  };

  const submitCreate = async () => {
    setSaving(true);
    try {
      const ids = selectedSchools.map((s) => s.id);
      await axios.post(
        `${API}/representatives`,
        {
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          phone: form.phone.trim() || null,
          email: form.email.trim().toLowerCase(),
          password: form.password,
          organization_name: form.organization_name.trim() || null,
          organization_type: form.organization_type || null,
          national_id: form.national_id.trim() || null,
          gender: form.gender || null,
          date_of_birth: form.date_of_birth || null,
          address: form.address.trim() || null,
          notes: form.notes.trim() || null,
          school_ids: ids,
          primary_school_id: primaryId,
        },
        axCfg
      );
      setToast({ type: "ok", message: "Representative created with schools assigned." });
      setModal(null);
      load();
    } catch (e) {
      setToast({ type: "error", message: e.response?.data?.message || "Create failed" });
    } finally {
      setSaving(false);
    }
  };

  const submitEdit = async () => {
    if (!modal?.row) return;
    setSaving(true);
    try {
      const body = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        phone: form.phone.trim() || null,
        organization_name: form.organization_name.trim() || null,
        organization_type: form.organization_type || null,
        national_id: form.national_id.trim() || null,
        gender: form.gender || null,
        date_of_birth: form.date_of_birth || null,
        address: form.address.trim() || null,
        notes: form.notes.trim() || null,
      };
      if (form.password) body.password = form.password;
      await axios.patch(`${API}/representatives/${modal.row.id}`, body, axCfg);
      await axios.put(
        `${API}/representatives/${modal.row.id}/schools`,
        {
          school_ids: selectedSchools.map((s) => s.id),
          primary_school_id: primaryId,
        },
        axCfg
      );
      setToast({ type: "ok", message: "Representative updated." });
      setModal(null);
      load();
    } catch (e) {
      setToast({ type: "error", message: e.response?.data?.message || "Update failed" });
    } finally {
      setSaving(false);
    }
  };

  const removeRep = async (row) => {
    if (
      !window.confirm(
        `Delete representative ${row.email}? Their account will be deactivated and their school assignments removed.`
      )
    )
      return;
    try {
      await axios.delete(`${API}/representatives/${row.id}`, axCfg);
      setToast({ type: "ok", message: "Representative deactivated." });
      load();
    } catch (e) {
      setToast({ type: "error", message: e.response?.data?.message || "Delete failed" });
    }
  };

  const platformRole = String(auth?.user?.role?.code || "").toUpperCase();
  const adminDashboardPath =
    platformRole === "FULL_SYSTEM_CONTROLLER" ? "/superadmin/control" : "/superadmin/dashboard";
  const adminDashboardLabel =
    platformRole === "FULL_SYSTEM_CONTROLLER" ? "System control" : "Super Admin dashboard";

  if (auth.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFFBF0]">
        <Loader2 className="w-10 h-10 animate-spin text-amber-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFFBF0] via-white to-[#FFF8E8]">
      <header className="sticky top-0 z-30 border-b border-amber-200/80 bg-white/95 backdrop-blur-md px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={() => navigate(adminDashboardPath)}
            className="p-2 rounded-xl hover:bg-amber-50 text-amber-800 shrink-0"
            aria-label={`Back to ${adminDashboardLabel}`}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <Link
            to={adminDashboardPath}
            className="inline-flex items-center gap-1 text-xs sm:text-sm font-black text-amber-900 hover:bg-amber-50 rounded-xl px-2 py-1 border border-transparent hover:border-amber-200"
          >
            <span className="hidden sm:inline">Back to {adminDashboardLabel}</span>
            <span className="sm:hidden">Back</span>
          </Link>
          <div className="min-w-0 border-l border-amber-200 pl-2 sm:pl-3 ml-0.5">
            <h1 className="text-lg font-black text-gray-900 truncate">School Representatives</h1>
            <p className="text-[10px] text-amber-700 font-semibold uppercase tracking-wider">
              Owners · cooperatives · education groups
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <LogoutButton />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <p className="text-sm text-gray-600 max-w-xl">
            Create accounts for representatives that need to oversee one or many schools at once. After registering them
            with login credentials, search and assign every school they should be able to access.
          </p>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#000435] to-[#001a5c] px-5 py-3 text-sm font-black text-amber-300 shadow-lg min-h-[44px] hover:from-[#001a5c] hover:to-[#000435] transition-all"
          >
            <UserPlus className="w-4 h-4" /> Register representative
          </button>
        </div>

        {toast && (
          <div
            className={`mb-4 rounded-2xl border px-4 py-3 text-sm font-semibold flex items-center gap-2 ${
              toast.type === "ok"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-red-50 border-red-200 text-red-800"
            }`}
          >
            {toast.type === "ok" ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {toast.message}
          </div>
        )}

        <div className="rounded-3xl border-2 border-amber-100 bg-white shadow-xl overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
            </div>
          ) : reps.length === 0 ? (
            <div className="text-center py-16 px-4">
              <Users className="w-12 h-12 mx-auto text-amber-300 mb-3" />
              <p className="text-gray-600 font-medium">No school representatives yet.</p>
              <button
                type="button"
                onClick={openCreate}
                className="text-amber-700 font-bold text-sm mt-2 inline-block"
              >
                Register the first representative
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-amber-50/90 border-b-2 border-amber-100 text-left text-[10px] font-black uppercase tracking-wider text-amber-900">
                    <th className="py-3 px-4">Name</th>
                    <th className="py-3 px-4 hidden md:table-cell">Email</th>
                    <th className="py-3 px-4 hidden lg:table-cell">Organization</th>
                    <th className="py-3 px-4">Schools</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reps.map((r) => (
                    <tr key={r.id} className="border-b border-amber-50 hover:bg-amber-50/40">
                      <td className="py-3 px-4 font-bold text-gray-900">
                        {r.first_name} {r.last_name}
                        <div className="md:hidden text-[11px] font-normal text-gray-500">{r.email}</div>
                        <div className="text-[10px] text-amber-700 font-semibold mt-0.5">UID {r.user_uid}</div>
                      </td>
                      <td className="py-3 px-4 hidden md:table-cell text-gray-600">{r.email}</td>
                      <td className="py-3 px-4 hidden lg:table-cell text-xs text-gray-700">
                        <span className="font-semibold">{r.organization_name || "—"}</span>
                        {r.organization_type ? (
                          <div className="text-[10px] text-gray-500">{r.organization_type}</div>
                        ) : null}
                      </td>
                      <td className="py-3 px-4 text-xs">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#000435] text-amber-300 font-bold">
                          <Building2 className="w-3 h-3" />
                          {Number(r.school_count || 0)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-[11px] font-black px-2 py-0.5 rounded-full ${
                            r.is_active ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-700"
                          }`}
                        >
                          {r.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-1">
                        <button
                          type="button"
                          onClick={() => openEdit(r)}
                          className="p-2 rounded-xl hover:bg-amber-100 text-amber-800 inline-flex"
                          aria-label="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeRep(r)}
                          className="px-2 py-2 rounded-xl hover:bg-red-50 text-red-600 inline-flex items-center gap-1 text-xs font-bold"
                          aria-label="Delete representative"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span className="hidden sm:inline">Delete</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {modal && (
        <div className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col border-2 border-amber-100">
            <div className="flex items-center justify-between px-5 py-4 border-b border-amber-100 shrink-0">
              <h3 className="font-black text-gray-900">
                {modal === "create" ? "Register school representative" : "Edit school representative"}
              </h3>
              <button
                type="button"
                onClick={() => setModal(null)}
                className="p-2 rounded-xl hover:bg-amber-50 text-amber-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-5 py-3 flex gap-2 border-b border-amber-50">
              {STEPS.map((label, i) => (
                <div
                  key={label}
                  className={`flex-1 text-center text-[10px] font-black uppercase py-2 rounded-xl ${
                    i === step
                      ? "bg-[#000435] text-amber-300"
                      : i < step
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {i + 1}. {label}
                </div>
              ))}
            </div>

            <div className="overflow-y-auto flex-1 p-5 space-y-4">
              {step === 0 && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="First name *">
                      <Input
                        value={form.first_name}
                        onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                      />
                    </Field>
                    <Field label="Last name *">
                      <Input
                        value={form.last_name}
                        onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                      />
                    </Field>
                  </div>
                  <Field label="Phone">
                    <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  </Field>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="National ID">
                      <Input
                        value={form.national_id}
                        onChange={(e) => setForm({ ...form, national_id: e.target.value })}
                      />
                    </Field>
                    <Field label="Date of birth">
                      <Input
                        type="date"
                        value={form.date_of_birth}
                        onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
                      />
                    </Field>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Gender">
                      <select
                        className="mt-1 w-full rounded-xl border-2 border-amber-200 px-3 py-2.5 text-sm bg-white"
                        value={form.gender}
                        onChange={(e) => setForm({ ...form, gender: e.target.value })}
                      >
                        <option value="">—</option>
                        <option value="Female">Female</option>
                        <option value="Male">Male</option>
                        <option value="Other">Other</option>
                      </select>
                    </Field>
                    <Field label="Organization type">
                      <select
                        className="mt-1 w-full rounded-xl border-2 border-amber-200 px-3 py-2.5 text-sm bg-white"
                        value={form.organization_type}
                        onChange={(e) => setForm({ ...form, organization_type: e.target.value })}
                      >
                        <option value="">—</option>
                        {ORG_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                  <Field label="Organization name">
                    <Input
                      value={form.organization_name}
                      onChange={(e) => setForm({ ...form, organization_name: e.target.value })}
                      placeholder="e.g. Diocese of Kigali, Coopec Tujyane"
                    />
                  </Field>
                  <Field label="Address">
                    <Input
                      value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                    />
                  </Field>
                  <Field label="Internal notes (optional)">
                    <textarea
                      rows={3}
                      className="mt-1 w-full rounded-xl border-2 border-amber-200 px-3 py-2.5 text-sm"
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    />
                  </Field>
                </>
              )}

              {step === 1 && (
                <>
                  {modal === "create" ? (
                    <Field label="Email (login) *">
                      <div className="relative">
                        <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-amber-700" />
                        <input
                          type="email"
                          autoComplete="off"
                          className="mt-0 w-full rounded-xl border-2 border-amber-200 pl-9 pr-3 py-2.5 text-sm"
                          value={form.email}
                          onChange={(e) => setForm({ ...form, email: e.target.value })}
                        />
                      </div>
                    </Field>
                  ) : (
                    <p className="text-xs text-gray-500">
                      Email: <span className="font-bold">{form.email}</span> (cannot be changed here)
                    </p>
                  )}

                  <Field label={modal === "create" ? "Password *" : "New password (optional)"}>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-amber-700" />
                      <input
                        type={showPw ? "text" : "password"}
                        autoComplete="new-password"
                        className="w-full rounded-xl border-2 border-amber-200 pl-9 pr-10 py-2.5 text-sm"
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                      />
                      <button
                        type="button"
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-amber-700"
                        onClick={() => setShowPw(!showPw)}
                      >
                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </Field>

                  <Field label={`Confirm password ${modal === "create" ? "*" : ""}`}>
                    <Input
                      type={showPw ? "text" : "password"}
                      value={form.password2}
                      onChange={(e) => setForm({ ...form, password2: e.target.value })}
                    />
                  </Field>

                  <div className="rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 text-[12px] text-amber-900">
                    The representative will sign in on the main Babyeyi app with this email and password. They are
                    automatically routed to the Representative Portal.
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <div className="rounded-2xl bg-[#000435] text-white px-4 py-3 flex items-start gap-3">
                    <Building2 className="w-5 h-5 text-amber-400 mt-0.5" />
                    <div className="text-xs">
                      <p className="font-black uppercase tracking-wider text-amber-300">Assign schools</p>
                      <p className="text-white/75 mt-1">
                        Search and select every school this representative should manage. They will see and control
                        everything for those schools after sign-in.
                      </p>
                    </div>
                  </div>

                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-amber-700" />
                    <input
                      type="search"
                      className="w-full rounded-xl border-2 border-amber-200 pl-9 pr-3 py-2.5 text-sm"
                      placeholder="Search by school name, code, or district…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                    {searching && (
                      <Loader2 className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-amber-700 animate-spin" />
                    )}
                  </div>

                  {selectedSchools.length > 0 && (
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wider text-amber-900 mb-2">
                        Selected ({selectedSchools.length})
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {selectedSchools.map((s) => (
                          <span
                            key={`sel-${s.id}`}
                            className={`inline-flex items-center gap-1.5 pl-3 pr-2 py-1 rounded-full text-[11px] font-bold border ${
                              primaryId === s.id
                                ? "bg-amber-400 text-[#000435] border-amber-300"
                                : "bg-[#000435] text-amber-300 border-amber-400/30"
                            }`}
                          >
                            <Building2 className="w-3 h-3" />
                            {s.school_name}
                            <button
                              type="button"
                              onClick={() => setPrimaryId(primaryId === s.id ? null : s.id)}
                              className={`ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full ${
                                primaryId === s.id ? "bg-[#000435] text-amber-300" : "bg-amber-400/15 text-amber-200"
                              }`}
                              title={primaryId === s.id ? "Primary school" : "Set as primary"}
                            >
                              {primaryId === s.id ? <Star className="w-3 h-3" /> : <StarOff className="w-3 h-3" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => removeSelected(s.id)}
                              className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/15 hover:bg-red-500/40 text-white"
                              aria-label="Remove"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="rounded-2xl border-2 border-amber-100 bg-white max-h-[280px] overflow-y-auto">
                    {searchResults.length === 0 ? (
                      <p className="text-center text-xs text-gray-500 py-6">
                        {searching ? "Searching…" : "Type to search schools, or browse the latest results."}
                      </p>
                    ) : (
                      <ul className="divide-y divide-amber-50">
                        {searchResults.map((s) => {
                          const sel = isSelected(s.id);
                          return (
                            <li key={s.id}>
                              <button
                                type="button"
                                onClick={() => toggleSchool(s)}
                                className={`w-full text-left flex items-center gap-3 px-4 py-2.5 hover:bg-amber-50/60 transition-colors ${
                                  sel ? "bg-amber-50" : ""
                                }`}
                              >
                                <span
                                  className={`flex h-7 w-7 items-center justify-center rounded-lg shrink-0 ${
                                    sel ? "bg-emerald-500 text-white" : "bg-amber-100 text-amber-700"
                                  }`}
                                >
                                  {sel ? <CheckCircle2 className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-bold text-gray-900 truncate">{s.school_name}</p>
                                  <p className="text-[11px] text-gray-500 truncate">
                                    {s.school_code || "—"}
                                    {s.district ? ` · ${s.district}` : ""}
                                    {s.province ? ` · ${s.province}` : ""}
                                  </p>
                                </div>
                                {Number(s.pro_enabled) === 1 && (
                                  <span className="text-[9px] font-black text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-md">
                                    PRO
                                  </span>
                                )}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="p-5 border-t border-amber-100 flex gap-2 shrink-0">
              {step > 0 && (
                <button
                  type="button"
                  onClick={() => setStep((s) => s - 1)}
                  className="flex-1 py-3 rounded-2xl border-2 border-amber-200 font-bold text-amber-900"
                >
                  Back
                </button>
              )}
              {step < 2 && (
                <button
                  type="button"
                  onClick={nextStep}
                  className="flex-1 py-3 rounded-2xl bg-[#000435] text-amber-300 font-black hover:bg-[#001a5c] transition-colors"
                >
                  Continue
                </button>
              )}
              {step === 2 && modal === "create" && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={submitCreate}
                  className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black disabled:opacity-50 flex justify-center items-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Create representative
                </button>
              )}
              {step === 2 && modal?.type === "edit" && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={submitEdit}
                  className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black disabled:opacity-50 flex justify-center items-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Save changes
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block text-xs font-bold text-amber-900">
      {label}
      {children}
    </label>
  );
}

function Input(props) {
  return (
    <input
      {...props}
      className={`mt-1 w-full rounded-xl border-2 border-amber-200 px-3 py-2.5 text-sm ${props.className || ""}`}
    />
  );
}
