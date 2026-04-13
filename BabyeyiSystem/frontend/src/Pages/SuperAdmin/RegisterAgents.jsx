// Super Admin — Field agents CRUD (multi-step create / edit)
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  ArrowLeft,
  UserPlus,
  Loader2,
  MapPin,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Pencil,
  Trash2,
  Check,
  X,
  Users,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import LogoutButton from "../Auth/LogoutButton";

const API = `${import.meta.env.VITE_API_URL || "http://localhost:5100"}/api`;
const axCfg = { withCredentials: true, headers: { "Content-Type": "application/json" } };

const STEPS = ["Personal", "Coverage area", "Login credentials"];

export default function RegisterAgents() {
  const navigate = useNavigate();
  const auth = useAuth();
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [geo, setGeo] = useState(null);
  const [toast, setToast] = useState(null);
  const [modal, setModal] = useState(null); // 'create' | { type:'edit', row }
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    national_id: "",
    gender: "",
    date_of_birth: "",
    province: "",
    district: "",
    all_sectors: false,
    sectors: [],
    email: "",
    password: "",
    password2: "",
  });

  const provinces = useMemo(() => (geo ? Object.keys(geo).sort() : []), [geo]);
  const districts = useMemo(() => {
    if (!form.province || !geo?.[form.province]?.districts) return [];
    return Object.keys(geo[form.province].districts).sort();
  }, [geo, form.province]);
  const sectorOptions = useMemo(() => {
    if (!form.province || !form.district || !geo?.[form.province]?.districts?.[form.district]) return [];
    return [...geo[form.province].districts[form.district].sectors];
  }, [geo, form.province, form.district]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, g] = await Promise.all([
        axios.get(`${API}/field-agents/agents`, axCfg),
        axios.get(`${API}/field-agents/rwanda-geo`, axCfg),
      ]);
      if (a.data.success) setAgents(a.data.data || []);
      if (g.data.success) setGeo(g.data.data);
    } catch (e) {
      setToast({ type: "error", message: e.response?.data?.message || "Failed to load" });
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

  const openCreate = () => {
    setForm({
      first_name: "",
      last_name: "",
      phone: "",
      national_id: "",
      gender: "",
      date_of_birth: "",
      province: "",
      district: "",
      all_sectors: false,
      sectors: [],
      email: "",
      password: "",
      password2: "",
    });
    setStep(0);
    setModal("create");
  };

  const openEdit = (row) => {
    setForm({
      first_name: row.first_name || "",
      last_name: row.last_name || "",
      phone: row.phone || "",
      national_id: row.national_id || "",
      gender: row.gender || "",
      date_of_birth: row.date_of_birth ? String(row.date_of_birth).slice(0, 10) : "",
      province: row.province || "",
      district: row.district || "",
      all_sectors: !!row.all_sectors,
      sectors: Array.isArray(row.sectors) ? [...row.sectors] : [],
      email: row.email || "",
      password: "",
      password2: "",
    });
    setStep(0);
    setModal({ type: "edit", row });
  };

  const toggleSector = (name) => {
    setForm((f) => {
      const s = new Set(f.sectors);
      if (s.has(name)) s.delete(name);
      else s.add(name);
      return { ...f, sectors: [...s], all_sectors: false };
    });
  };

  const selectAllSectors = () => {
    setForm((f) => ({ ...f, all_sectors: true, sectors: [...sectorOptions] }));
  };

  const nextStep = () => {
    if (step === 0) {
      if (!form.first_name.trim() || !form.last_name.trim()) {
        setToast({ type: "error", message: "Enter first and last name." });
        return;
      }
    }
    if (step === 1) {
      if (!form.province || !form.district) {
        setToast({ type: "error", message: "Choose province and district." });
        return;
      }
      if (!form.all_sectors && !form.sectors.length) {
        setToast({ type: "error", message: "Select all sectors or pick specific sectors." });
        return;
      }
    }
    setStep((s) => Math.min(s + 1, 2));
  };

  const submitCreate = async () => {
    if (!form.email.trim() || !form.password || form.password.length < 8) {
      setToast({ type: "error", message: "Valid email and password (8+ chars) required." });
      return;
    }
    if (form.password !== form.password2) {
      setToast({ type: "error", message: "Passwords do not match." });
      return;
    }
    setSaving(true);
    try {
      await axios.post(
        `${API}/field-agents/agents`,
        {
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          phone: form.phone.trim() || null,
          national_id: form.national_id.trim() || null,
          gender: form.gender.trim() || null,
          date_of_birth: form.date_of_birth || null,
          province: form.province,
          district: form.district,
          all_sectors: form.all_sectors,
          sectors: form.all_sectors ? sectorOptions : form.sectors,
          email: form.email.trim().toLowerCase(),
          password: form.password,
        },
        axCfg
      );
      setToast({ type: "ok", message: "Field agent created." });
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
        national_id: form.national_id.trim() || null,
        gender: form.gender.trim() || null,
        date_of_birth: form.date_of_birth || null,
        province: form.province,
        district: form.district,
        all_sectors: form.all_sectors,
        sectors: form.all_sectors ? sectorOptions : form.sectors,
      };
      if (form.password) {
        if (form.password.length < 8 || form.password !== form.password2) {
          setToast({ type: "error", message: "Passwords must match and be 8+ characters." });
          setSaving(false);
          return;
        }
        body.password = form.password;
      }
      await axios.patch(`${API}/field-agents/agents/${modal.row.id}`, body, axCfg);
      setToast({ type: "ok", message: "Agent updated." });
      setModal(null);
      load();
    } catch (e) {
      setToast({ type: "error", message: e.response?.data?.message || "Update failed" });
    } finally {
      setSaving(false);
    }
  };

  const removeAgent = async (row) => {
    if (!window.confirm(`Delete agent ${row.email}? They will be deactivated and removed from the agent list (soft delete).`)) return;
    try {
      await axios.delete(`${API}/field-agents/agents/${row.id}`, axCfg);
      setToast({ type: "ok", message: "Agent deleted." });
      load();
    } catch (e) {
      setToast({ type: "error", message: e.response?.data?.message || "Delete failed" });
    }
  };

  if (auth.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFFBF0]">
        <Loader2 className="w-10 h-10 animate-spin text-amber-600" />
      </div>
    );
  }

  const platformRole = String(auth?.user?.role?.code || "").toUpperCase();
  const adminDashboardPath =
    platformRole === "FULL_SYSTEM_CONTROLLER" ? "/superadmin/control" : "/superadmin/dashboard";
  const adminDashboardLabel =
    platformRole === "FULL_SYSTEM_CONTROLLER" ? "System control" : "Super Admin dashboard";

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFFBF0] via-white to-[#FFF8E8]" style={{ fontFamily: "Montserrat, sans-serif" }}>
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
            title={adminDashboardLabel}
            className="inline-flex items-center gap-1 text-xs sm:text-sm font-black text-amber-900 hover:bg-amber-50 rounded-xl px-2 py-1 border border-transparent hover:border-amber-200"
          >
            <span className="hidden sm:inline">Back to {adminDashboardLabel}</span>
            <span className="sm:hidden">{platformRole === "FULL_SYSTEM_CONTROLLER" ? "Control" : "Dashboard"}</span>
          </Link>
          <div className="min-w-0 border-l border-amber-200 pl-2 sm:pl-3 ml-0.5">
            <h1 className="text-lg font-black text-gray-900 truncate">Field agents</h1>
            <p className="text-[10px] text-amber-700 font-semibold uppercase tracking-wider">Register &amp; manage coverage</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <LogoutButton />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <p className="text-sm text-gray-600 max-w-xl">
            Create accounts for field staff. Each agent sees schools and Babyeyi payments only in their assigned district
            and sectors.
          </p>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#1A1200] to-[#3D2C00] px-5 py-3 text-sm font-black text-[#FEBF10] shadow-lg min-h-[44px]"
          >
            <UserPlus className="w-4 h-4" /> Register agent
          </button>
        </div>

        {toast && (
          <div
            className={`mb-4 rounded-2xl border px-4 py-3 text-sm font-semibold flex items-center gap-2 ${
              toast.type === "ok" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"
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
          ) : agents.length === 0 ? (
            <div className="text-center py-16 px-4">
              <Users className="w-12 h-12 mx-auto text-amber-300 mb-3" />
              <p className="text-gray-600 font-medium">No field agents yet.</p>
              <Link to="#" onClick={(e) => { e.preventDefault(); openCreate(); }} className="text-amber-700 font-bold text-sm mt-2 inline-block">
                Register the first agent
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-amber-50/90 border-b-2 border-amber-100 text-left text-[10px] font-black uppercase tracking-wider text-amber-900">
                    <th className="py-3 px-4">Name</th>
                    <th className="py-3 px-4 hidden md:table-cell">Email</th>
                    <th className="py-3 px-4">Coverage</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {agents.map((a) => (
                    <tr key={a.id} className="border-b border-amber-50 hover:bg-amber-50/40">
                      <td className="py-3 px-4 font-bold text-gray-900">
                        {a.first_name} {a.last_name}
                        <div className="md:hidden text-[11px] font-normal text-gray-500">{a.email}</div>
                      </td>
                      <td className="py-3 px-4 hidden md:table-cell text-gray-600">{a.email}</td>
                      <td className="py-3 px-4 text-xs text-gray-700">
                        <span className="font-semibold">{a.district || "—"}</span>
                        <span className="text-gray-400"> · </span>
                        {a.all_sectors ? (
                          <span className="text-emerald-700 font-semibold">All sectors</span>
                        ) : (
                          <span>{Array.isArray(a.sectors) ? `${a.sectors.length} sector(s)` : "—"}</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-[11px] font-black px-2 py-0.5 rounded-full ${
                            a.is_active ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-700"
                          }`}
                        >
                          {a.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-1">
                        <button
                          type="button"
                          onClick={() => openEdit(a)}
                          className="p-2 rounded-xl hover:bg-amber-100 text-amber-800 inline-flex"
                          aria-label="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeAgent(a)}
                          className="px-2 py-2 rounded-xl hover:bg-red-50 text-red-600 inline-flex items-center gap-1 text-xs font-bold"
                          aria-label="Delete agent"
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
          <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col border-2 border-amber-100">
            <div className="flex items-center justify-between px-5 py-4 border-b border-amber-100 shrink-0">
              <h3 className="font-black text-gray-900">
                {modal === "create" ? "Register field agent" : "Edit field agent"}
              </h3>
              <button type="button" onClick={() => setModal(null)} className="p-2 rounded-xl hover:bg-amber-50 text-amber-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-5 py-3 flex gap-2 border-b border-amber-50">
              {STEPS.map((label, i) => (
                <div
                  key={label}
                  className={`flex-1 text-center text-[10px] font-black uppercase py-2 rounded-xl ${
                    i === step ? "bg-[#1A1200] text-[#FEBF10]" : i < step ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-400"
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
                    <label className="block text-xs font-bold text-amber-900">
                      First name *
                      <input
                        className="mt-1 w-full rounded-xl border-2 border-amber-200 px-3 py-2.5 text-sm"
                        value={form.first_name}
                        onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                      />
                    </label>
                    <label className="block text-xs font-bold text-amber-900">
                      Last name *
                      <input
                        className="mt-1 w-full rounded-xl border-2 border-amber-200 px-3 py-2.5 text-sm"
                        value={form.last_name}
                        onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                      />
                    </label>
                  </div>
                  <label className="block text-xs font-bold text-amber-900">
                    Phone
                    <input
                      className="mt-1 w-full rounded-xl border-2 border-amber-200 px-3 py-2.5 text-sm"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    />
                  </label>
                  <label className="block text-xs font-bold text-amber-900">
                    National ID
                    <input
                      className="mt-1 w-full rounded-xl border-2 border-amber-200 px-3 py-2.5 text-sm"
                      value={form.national_id}
                      onChange={(e) => setForm({ ...form, national_id: e.target.value })}
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block text-xs font-bold text-amber-900">
                      Gender
                      <select
                        className="mt-1 w-full rounded-xl border-2 border-amber-200 px-3 py-2.5 text-sm"
                        value={form.gender}
                        onChange={(e) => setForm({ ...form, gender: e.target.value })}
                      >
                        <option value="">—</option>
                        <option value="Female">Female</option>
                        <option value="Male">Male</option>
                        <option value="Other">Other</option>
                      </select>
                    </label>
                    <label className="block text-xs font-bold text-amber-900">
                      Date of birth
                      <input
                        type="date"
                        className="mt-1 w-full rounded-xl border-2 border-amber-200 px-3 py-2.5 text-sm"
                        value={form.date_of_birth}
                        onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
                      />
                    </label>
                  </div>
                </>
              )}

              {step === 1 && (
                <>
                  <label className="block text-xs font-bold text-amber-900 flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5" /> Province *
                    <select
                      className="mt-1 w-full rounded-xl border-2 border-amber-200 px-3 py-2.5 text-sm font-semibold"
                      value={form.province}
                      onChange={(e) => setForm({ ...form, province: e.target.value, district: "", sectors: [], all_sectors: false })}
                    >
                      <option value="">Select province</option>
                      {provinces.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-xs font-bold text-amber-900">
                    District *
                    <select
                      className="mt-1 w-full rounded-xl border-2 border-amber-200 px-3 py-2.5 text-sm font-semibold"
                      value={form.district}
                      onChange={(e) => setForm({ ...form, district: e.target.value, sectors: [], all_sectors: false })}
                      disabled={!form.province}
                    >
                      <option value="">Select district</option>
                      {districts.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </label>
                  {!!sectorOptions.length && (
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="text-xs font-bold text-amber-900">Sectors *</span>
                        <button
                          type="button"
                          onClick={selectAllSectors}
                          className="text-[11px] font-black text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200"
                        >
                          Select all in district
                        </button>
                      </div>
                      <div className="max-h-48 overflow-y-auto rounded-xl border-2 border-amber-100 p-2 grid grid-cols-1 sm:grid-cols-2 gap-1">
                        {sectorOptions.map((s) => (
                          <label key={s} className="flex items-center gap-2 text-xs py-1.5 px-2 rounded-lg hover:bg-amber-50 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={form.all_sectors || form.sectors.includes(s)}
                              onChange={() => toggleSector(s)}
                              className="rounded border-amber-300"
                            />
                            <span>{s}</span>
                          </label>
                        ))}
                      </div>
                      {form.all_sectors && (
                        <p className="text-[11px] text-emerald-700 font-semibold mt-2">All {sectorOptions.length} sectors in this district are included.</p>
                      )}
                    </div>
                  )}
                </>
              )}

              {step === 2 && (
                <>
                  {modal === "create" && (
                    <label className="block text-xs font-bold text-amber-900">
                      <span className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5" /> Email (login) *
                      </span>
                      <input
                        type="email"
                        autoComplete="off"
                        className="mt-1 w-full rounded-xl border-2 border-amber-200 px-3 py-2.5 text-sm"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                      />
                    </label>
                  )}
                  {modal !== "create" && (
                    <p className="text-xs text-gray-500">Email: {form.email} (unchanged)</p>
                  )}
                  <label className="block text-xs font-bold text-amber-900">
                    <span className="flex items-center gap-2">
                      <Lock className="w-3.5 h-3.5" /> {modal === "create" ? "Password *" : "New password (optional)"}
                    </span>
                    <div className="relative mt-1">
                      <input
                        type={showPw ? "text" : "password"}
                        autoComplete="new-password"
                        className="w-full rounded-xl border-2 border-amber-200 px-3 py-2.5 pr-10 text-sm"
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
                  </label>
                  <label className="block text-xs font-bold text-amber-900">
                    Confirm password {modal === "create" ? "*" : ""}
                    <input
                      type={showPw ? "text" : "password"}
                      className="mt-1 w-full rounded-xl border-2 border-amber-200 px-3 py-2.5 text-sm"
                      value={form.password2}
                      onChange={(e) => setForm({ ...form, password2: e.target.value })}
                    />
                  </label>
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
                  className="flex-1 py-3 rounded-2xl bg-[#1A1200] text-[#FEBF10] font-black"
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
                  Create agent
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
