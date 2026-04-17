import { useEffect, useState } from "react";
import { Loader2, RefreshCw, ScanLine } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import LogoutButton from "../Auth/LogoutButton";

const API = import.meta.env.VITE_API_URL || "http://localhost:5100";

const emptyLog = {
  person_name: "",
  person_type: "STUDENT",
  person_ref: "",
  action_type: "IN",
  logged_at: "",
  notes: "",
};

function toDateTimeInput(v) {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 16);
}

export default function GateOfficerPortalPage() {
  const auth = useAuth();
  const [logs, setLogs] = useState([]);
  const [form, setForm] = useState(emptyLog);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadLogs = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/api/gate/logs`, { credentials: "include" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) throw new Error(json.message || "Failed to load logs");
      setLogs(json.data || []);
    } catch (err) {
      setError(err.message || "Failed to load gate logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const url = editingId ? `${API}/api/gate/logs/${editingId}` : `${API}/api/gate/logs`;
      const method = editingId ? "PUT" : "POST";
      const body = {
        ...form,
        logged_at: form.logged_at ? new Date(form.logged_at).toISOString() : undefined,
      };
      const res = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) throw new Error(json.message || "Failed to save gate log");
      setMessage(editingId ? "Gate log updated." : "Gate log created.");
      setForm(emptyLog);
      setEditingId(null);
      await loadLogs();
    } catch (err) {
      setError(err.message || "Failed to save gate log.");
    } finally {
      setSaving(false);
    }
  };

  const removeLog = async (id) => {
    if (!window.confirm("Delete this gate log entry?")) return;
    const res = await fetch(`${API}/api/gate/logs/${id}`, { method: "DELETE", credentials: "include" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.success) return setError(json.message || "Failed to delete gate log");
    setMessage("Gate log deleted.");
    loadLogs();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                <ScanLine size={14} /> GATE_OFFICER
              </p>
              <h1 className="mt-2 text-2xl font-black text-slate-900">Gate attendance scanner module</h1>
              <p className="text-sm text-slate-600">
                School: {auth.school?.name || "N/A"} ({auth.school?.code || "N/A"})
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={loadLogs} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold">
                <RefreshCw size={15} /> Refresh
              </button>
              <LogoutButton variant="default" size="sm" />
            </div>
          </div>
          {loading && <p className="mt-3 inline-flex items-center gap-2 text-sm text-slate-600"><Loader2 size={14} className="animate-spin" /> Loading...</p>}
          {message && <p className="mt-3 text-sm font-semibold text-emerald-700">{message}</p>}
          {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-slate-900">{editingId ? "Edit gate log" : "Create gate log"}</h2>
          <form onSubmit={submit} className="mt-3 grid gap-3">
            <input required className="rounded-xl border px-3 py-2 text-sm" placeholder="Person name" value={form.person_name} onChange={(e) => setForm((p) => ({ ...p, person_name: e.target.value }))} />
            <div className="grid grid-cols-2 gap-3">
              <select className="rounded-xl border px-3 py-2 text-sm" value={form.person_type} onChange={(e) => setForm((p) => ({ ...p, person_type: e.target.value }))}>
                <option value="STUDENT">STUDENT</option>
                <option value="STAFF">STAFF</option>
                <option value="VISITOR">VISITOR</option>
              </select>
              <select className="rounded-xl border px-3 py-2 text-sm" value={form.action_type} onChange={(e) => setForm((p) => ({ ...p, action_type: e.target.value }))}>
                <option value="IN">IN</option>
                <option value="OUT">OUT</option>
              </select>
            </div>
            <input className="rounded-xl border px-3 py-2 text-sm" placeholder="Person ID / code / plate" value={form.person_ref} onChange={(e) => setForm((p) => ({ ...p, person_ref: e.target.value }))} />
            <input type="datetime-local" className="rounded-xl border px-3 py-2 text-sm" value={form.logged_at} onChange={(e) => setForm((p) => ({ ...p, logged_at: e.target.value }))} />
            <textarea className="rounded-xl border px-3 py-2 text-sm" placeholder="Notes" value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
            <div className="flex gap-2">
              <button disabled={saving} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">{editingId ? "Update log" : "Create log"}</button>
              {editingId && <button type="button" className="rounded-xl border px-4 py-2 text-sm font-semibold" onClick={() => { setEditingId(null); setForm(emptyLog); }}>Cancel</button>}
            </div>
          </form>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-base font-black text-slate-900">Gate logs</h3>
          <div className="mt-3 space-y-2">
            {logs.map((log) => (
              <div key={log.id} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                <p className="font-bold text-slate-900">{log.person_name}</p>
                <p className="text-slate-600">{log.person_type} | {log.action_type} | {new Date(log.logged_at).toLocaleString()}</p>
                <div className="mt-2 flex gap-2">
                  <button className="rounded-lg border px-2 py-1 text-xs font-semibold" onClick={() => { setEditingId(log.id); setForm({ person_name: log.person_name || "", person_type: log.person_type || "STUDENT", person_ref: log.person_ref || "", action_type: log.action_type || "IN", logged_at: toDateTimeInput(log.logged_at), notes: log.notes || "" }); }}>Edit</button>
                  <button className="rounded-lg border border-red-200 px-2 py-1 text-xs font-semibold text-red-600" onClick={() => removeLog(log.id)}>Delete</button>
                </div>
              </div>
            ))}
            {logs.length === 0 && <p className="text-sm text-slate-500">No gate logs yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
