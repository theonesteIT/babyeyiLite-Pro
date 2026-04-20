import { useState, useEffect, useCallback } from "react";
import {
  Users, Loader2, Plus, Shield, Mail, User, Phone, BadgeCheck, AlertCircle,
  Pencil, Trash2, Power, ScanFace, RefreshCw,
} from "lucide-react";
import StaffIdentityModal from "./StaffIdentityModal";

const API = import.meta.env.VITE_API_URL || "http://localhost:5100";

const ROLE_OPTIONS = [
  { code: "ACCOUNTANT", label: "Accountant" },
  { code: "TEACHER", label: "Teacher" },
  { code: "HOD", label: "Head of Discipline (Discipline)" },
  { code: "DOS", label: "Head of Study (DOS)" },
  { code: "LIBRARIAN", label: "Librarian" },
  { code: "STORE_MANAGER", label: "Store / Stock manager" },
  { code: "GATE_OFFICER", label: "Gate officer" },
];

const emptyForm = () => ({
  first_name: "",
  last_name: "",
  email: "",
  username: "",
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
  const [identityOpen, setIdentityOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [deleteRow, setDeleteRow] = useState(null);

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
      toast?.(
        json.data?.password_sent_by_email
          ? "Account created. A temporary password was sent to their email."
          : "Staff account created.",
        "success"
      );
      setForm(emptyForm());
      load();
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  };

  const patchStaff = async (id, body) => {
    const res = await fetch(`${API}/api/school/staff/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.success) {
      toast?.(json.message || "Update failed", "error");
      return false;
    }
    toast?.("Saved.", "success");
    load();
    return true;
  };

  const toggleActive = (row) => {
    patchStaff(row.id, { is_active: !row.is_active });
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!editForm) return;
    const ok = await patchStaff(editRow.id, {
      first_name: editForm.first_name.trim(),
      last_name: editForm.last_name.trim(),
      phone: editForm.phone.trim() || null,
      role_code: editForm.role_code,
    });
    if (ok) {
      setEditRow(null);
      setEditForm(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteRow) return;
    try {
      const res = await fetch(`${API}/api/school/staff/${deleteRow.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        toast?.(json.message || "Could not delete", "error");
        return;
      }
      toast?.("Account removed.", "success");
      setDeleteRow(null);
      load();
    } catch {
      toast?.("Network error", "error");
    }
  };

  return (
    <div className="space-y-8 anim">
      <StaffIdentityModal
        open={identityOpen}
        onClose={(saved) => {
          setIdentityOpen(false);
          if (saved) load();
        }}
        staffList={list}
        creatorRole={session?.userRole}
        toast={toast}
      />

      {editRow && editForm && (
        <div className="fixed inset-0 z-[4000] flex items-center justify-center bg-black/50 p-4">
          <form onSubmit={saveEdit} className="w-full max-w-md rounded-3xl bg-white shadow-xl border border-gray-100 p-6 space-y-4">
            <h3 className="text-lg font-black text-gray-900">Edit staff</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[0.65rem] font-bold text-gray-500 uppercase mb-1">First name</label>
                <input
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                  value={editForm.first_name}
                  onChange={(e) => setEditForm((p) => ({ ...p, first_name: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-[0.65rem] font-bold text-gray-500 uppercase mb-1">Last name</label>
                <input
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                  value={editForm.last_name}
                  onChange={(e) => setEditForm((p) => ({ ...p, last_name: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="block text-[0.65rem] font-bold text-gray-500 uppercase mb-1">Phone</label>
              <input
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                value={editForm.phone}
                onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-[0.65rem] font-bold text-gray-500 uppercase mb-1">Role</label>
              <select
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold"
                value={editForm.role_code}
                onChange={(e) => setEditForm((p) => ({ ...p, role_code: e.target.value }))}
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                className="px-4 py-2 rounded-xl text-sm font-bold text-gray-600"
                onClick={() => {
                  setEditRow(null);
                  setEditForm(null);
                }}
              >
                Cancel
              </button>
              <button type="submit" className="px-5 py-2 rounded-xl bg-gray-900 text-amber-300 text-sm font-black">
                Save
              </button>
            </div>
          </form>
        </div>
      )}

      {deleteRow && (
        <div className="fixed inset-0 z-[4000] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white shadow-xl border border-red-100 p-6 space-y-4">
            <p className="text-sm font-bold text-gray-900">Remove this account?</p>
            <p className="text-xs text-gray-600">
              {deleteRow.first_name} {deleteRow.last_name} — they will no longer be able to sign in.
            </p>
            <div className="flex gap-2 justify-end">
              <button type="button" className="px-4 py-2 rounded-xl text-sm font-bold" onClick={() => setDeleteRow(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-black"
                onClick={confirmDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-3xl border border-amber-200/60 bg-white/90 shadow-sm overflow-hidden">
        <div
          className="px-5 py-4 flex flex-wrap items-center gap-3 border-b border-amber-100"
          style={{ background: "linear-gradient(135deg, #FFFBEB, #FFF7D6)" }}
        >
          <div className="w-11 h-11 rounded-2xl bg-amber-400 flex items-center justify-center shadow-inner">
            <Users size={22} className="text-gray-900" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-black text-gray-900 tracking-tight">School team</h2>
            <p className="text-xs text-gray-600 font-medium">
              Add staff with email — a <strong>temporary password is generated and emailed</strong> to them. They sign in at{" "}
              <span className="font-mono text-amber-800">/login</span> and can change their password from the staff dashboard
              profile.
            </p>
          </div>
          <button
            type="button"
            onClick={() => load()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-amber-200 text-xs font-bold text-gray-700 hover:bg-amber-50"
          >
            <RefreshCw size={14} /> Refresh
          </button>
          <button
            type="button"
            onClick={() => setIdentityOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-gray-900 text-amber-300 text-xs font-black hover:bg-gray-800"
          >
            <ScanFace size={16} /> Set identity (photo / RFID)
          </button>
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
                <Mail size={12} /> Email (login — receives password)
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
            <p className="text-[0.7rem] text-gray-500 leading-relaxed rounded-xl bg-amber-50/80 border border-amber-100 px-3 py-2">
              No password to type here — the system generates a secure password and sends it to the email above.
            </p>
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
              <span className="text-xs font-black uppercase tracking-wider text-gray-500">Team members</span>
              <span className="text-[0.65rem] font-mono text-gray-400">{session?.schoolCode || "—"}</span>
            </div>
            <div className="rounded-2xl border border-gray-100 overflow-hidden max-h-[520px] overflow-y-auto shadow-inner">
              {loading ? (
                <div className="flex items-center justify-center py-16 text-gray-500 gap-2 text-sm">
                  <Loader2 size={18} className="animate-spin" /> Loading…
                </div>
              ) : list.length === 0 ? (
                <div className="py-12 text-center text-sm text-gray-500">No staff yet.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-[0.6rem] uppercase font-bold text-gray-500 sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-2">Name</th>
                      <th className="text-left px-2 py-2">Role</th>
                      <th className="text-right px-2 py-2 w-[1%]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {list.map((row) => (
                      <tr key={row.id} className={`hover:bg-amber-50/50 ${row.is_active ? "" : "opacity-60"}`}>
                        <td className="px-3 py-2.5">
                          <div className="font-semibold text-gray-900">
                            {row.first_name} {row.last_name}
                          </div>
                          <div className="text-[0.7rem] font-mono text-gray-500 truncate max-w-[180px]">{row.email}</div>
                        </td>
                        <td className="px-2 py-2.5">
                          <span className="inline-flex px-2 py-0.5 rounded-lg bg-amber-100 text-amber-900 text-[0.65rem] font-bold">
                            {row.role_code}
                          </span>
                        </td>
                        <td className="px-2 py-2.5">
                          <div className="flex flex-wrap items-center justify-end gap-1">
                            <button
                              type="button"
                              title="Edit"
                              onClick={() => {
                                setEditRow(row);
                                setEditForm({
                                  first_name: row.first_name || "",
                                  last_name: row.last_name || "",
                                  phone: row.phone || "",
                                  role_code: row.role_code || "TEACHER",
                                });
                              }}
                              className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              type="button"
                              title={row.is_active ? "Deactivate" : "Activate"}
                              onClick={() => toggleActive(row)}
                              className={`p-1.5 rounded-lg ${row.is_active ? "text-amber-700 hover:bg-amber-50" : "text-gray-400 hover:bg-gray-100"}`}
                            >
                              <Power size={15} />
                            </button>
                            <button
                              type="button"
                              title="Delete"
                              onClick={() => setDeleteRow(row)}
                              className="p-1.5 rounded-lg text-red-600 hover:bg-red-50"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
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
