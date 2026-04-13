import { useState, useEffect, useCallback } from "react";
import {
  Users, Loader2, Plus, Shield, Mail, User, KeyRound, Phone, BadgeCheck, AlertCircle,
} from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://localhost:5100";

const ROLE_OPTIONS = [
  { code: "ACCOUNTANT", label: "Accountant" },
  { code: "TEACHER", label: "Teacher" },
  { code: "HOD", label: "Head of Discipline" },
  { code: "DOS", label: "Head of Study (DOS)" },
  { code: "LIBRARIAN", label: "Librarian" },
  { code: "STORE_MANAGER", label: "Store manager" },
  { code: "GATE_OFFICER", label: "Gate officer" },
];

const emptyForm = () => ({
  first_name: "",
  last_name: "",
  email: "",
  username: "",
  password: "",
  phone: "",
  role_code: "TEACHER",
  staff_id: "",
});

export default function SchoolWorkersPage({ session, toast }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/school/staff`, { credentials: "include" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        setError(json.message || "Failed to load team");
        setList([]);
        return;
      }
      setList(json.data || []);
    } catch {
      setError("Cannot reach server");
      setList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/school/staff`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          email: form.email.trim(),
          username: form.username.trim(),
          password: form.password,
          phone: form.phone.trim() || undefined,
          role_code: form.role_code,
          staff_id: form.staff_id.trim() || undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        setError(json.message || "Could not create account");
        return;
      }
      toast?.("Staff account created. Share email, username, and password securely.", "success");
      setForm(emptyForm());
      load();
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 anim">
      <div className="rounded-3xl border border-amber-200/60 bg-white/90 shadow-sm overflow-hidden">
        <div
          className="px-5 py-4 flex flex-wrap items-center gap-3 border-b border-amber-100"
          style={{ background: "linear-gradient(135deg, #FFFBEB, #FFF7D6)" }}
        >
          <div className="w-11 h-11 rounded-2xl bg-amber-400 flex items-center justify-center shadow-inner">
            <Users size={22} className="text-gray-900" />
          </div>
          <div>
            <h2 className="text-lg font-black text-gray-900 tracking-tight">School team</h2>
            <p className="text-xs text-gray-600 font-medium">
              Create logins for teachers, accountant, <strong>Head of Discipline (HOD)</strong>, and other staff. They
              sign in at <span className="font-mono text-amber-800">/login</span> with email, password, and your school
              code.
            </p>
          </div>
        </div>

        <div className="p-5 lg:p-6 grid grid-cols-1 xl:grid-cols-2 gap-8">
          <form onSubmit={submit} className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-gray-500">
              <Plus size={14} className="text-amber-600" /> New worker
            </div>
            {error && (
              <div className="flex items-start gap-2 rounded-2xl bg-red-50 border border-red-100 px-4 py-3 text-xs font-semibold text-red-700">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                {error}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[0.65rem] font-bold text-gray-500 uppercase mb-1">First name</label>
                <input
                  required
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 outline-none"
                  value={form.first_name}
                  onChange={(e) => setForm((p) => ({ ...p, first_name: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-[0.65rem] font-bold text-gray-500 uppercase mb-1">Last name</label>
                <input
                  required
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 outline-none"
                  value={form.last_name}
                  onChange={(e) => setForm((p) => ({ ...p, last_name: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="block text-[0.65rem] font-bold text-gray-500 uppercase mb-1 flex items-center gap-1">
                <Mail size={12} /> Email (login)
              </label>
              <input
                required
                type="email"
                autoComplete="off"
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 outline-none"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[0.65rem] font-bold text-gray-500 uppercase mb-1 flex items-center gap-1">
                  <User size={12} /> Username
                </label>
                <input
                  required
                  minLength={3}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-mono font-medium focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 outline-none"
                  value={form.username}
                  onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-[0.65rem] font-bold text-gray-500 uppercase mb-1 flex items-center gap-1">
                  <KeyRound size={12} /> Password
                </label>
                <input
                  required
                  minLength={8}
                  type="password"
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 outline-none"
                  value={form.password}
                  onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[0.65rem] font-bold text-gray-500 uppercase mb-1 flex items-center gap-1">
                  <Phone size={12} /> Phone (optional)
                </label>
                <input
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 outline-none"
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-[0.65rem] font-bold text-gray-500 uppercase mb-1">Staff ID (optional)</label>
                <input
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-mono font-medium focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 outline-none"
                  value={form.staff_id}
                  onChange={(e) => setForm((p) => ({ ...p, staff_id: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="block text-[0.65rem] font-bold text-gray-500 uppercase mb-1 flex items-center gap-1">
                <Shield size={12} /> Role
              </label>
              <select
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-semibold bg-white focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 outline-none"
                value={form.role_code}
                onChange={(e) => setForm((p) => ({ ...p, role_code: e.target.value }))}
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-gray-900 text-amber-300 font-black text-sm hover:bg-gray-800 transition-colors disabled:opacity-60"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <BadgeCheck size={16} />}
              Create account
            </button>
          </form>

          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-black uppercase tracking-wider text-gray-500">Existing accounts</span>
              <span className="text-[0.65rem] font-mono text-gray-400">{session?.schoolCode || "—"}</span>
            </div>
            <div className="rounded-2xl border border-gray-100 overflow-hidden max-h-[480px] overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-16 text-gray-500 gap-2 text-sm">
                  <Loader2 size={18} className="animate-spin" /> Loading…
                </div>
              ) : list.length === 0 ? (
                <div className="py-12 text-center text-sm text-gray-500">No staff yet.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-[0.65rem] uppercase font-bold text-gray-500">
                    <tr>
                      <th className="text-left px-3 py-2">Name</th>
                      <th className="text-left px-3 py-2">Role</th>
                      <th className="text-left px-3 py-2 hidden md:table-cell">Email</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {list.map((row) => (
                      <tr key={row.id} className="hover:bg-amber-50/40">
                        <td className="px-3 py-2.5 font-semibold text-gray-900">
                          {row.first_name} {row.last_name}
                          <div className="text-[0.7rem] font-mono text-gray-500 md:hidden">{row.email}</div>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="inline-flex px-2 py-0.5 rounded-lg bg-amber-100 text-amber-900 text-[0.7rem] font-bold">
                            {row.role_code}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-gray-600 hidden md:table-cell">{row.email}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
