import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Building2, Loader2, Save, Shield } from 'lucide-react';

const API = `${import.meta.env.VITE_API_URL || 'http://localhost:5100'}/api`;
const ax = { withCredentials: true, headers: { 'Content-Type': 'application/json' } };

const NAVY = '#000435';
const AMBER = '#F59E0B';

export default function SuperAdminShuleAvanceOrgs() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    org_name: '',
    org_type: 'INTERNAL_PARTNER',
    contact_person: '',
    contact_email: '',
    contact_phone: '',
    login_username: '',
    password: '',
    address: '',
    description: '',
    notes: '',
    is_active: true,
  });

  const load = async () => {
    setErr('');
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/auth/shule-avance-organizations`, ax);
      if (data.success) setRows(data.data || []);
      else setErr(data.message || 'Failed to load');
    } catch (e) {
      setErr(e.response?.data?.message || e.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErr('');
    try {
      const { data } = await axios.post(`${API}/auth/create-shule-avance-organization`, {
        ...form,
        rate_percent: '12',
        applicant_categories_text: 'Parent, Teacher, Director',
      }, ax);
      if (!data.success) throw new Error(data.message || 'Failed');
      setForm({
        org_name: '',
        org_type: 'INTERNAL_PARTNER',
        contact_person: '',
        contact_email: '',
        contact_phone: '',
        login_username: '',
        password: '',
        address: '',
        description: '',
        notes: '',
        is_active: true,
      });
      await load();
    } catch (e2) {
      setErr(e2.response?.data?.message || e2.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const inp = 'w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-amber-400/60';

  return (
    <div className="min-h-screen" style={{ background: NAVY, fontFamily: 'system-ui, sans-serif' }}>
      <header className="border-b border-amber-400/30 px-4 py-4 flex items-center justify-between" style={{ background: '#061a3a' }}>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/superadmin/dashboard')}
            className="inline-flex items-center gap-2 rounded-lg border border-amber-400/40 px-3 py-1.5 text-sm font-semibold text-amber-200 hover:bg-white/5"
          >
            <ArrowLeft size={16} /> Dashboard
          </button>
          <div className="flex items-center gap-2 text-white/90">
            <Shield size={18} className="text-amber-400" />
            <span className="font-bold text-sm tracking-wide">ShuleAvance organizations</span>
          </div>
        </div>
        <img src="/1BABYEYI LOGO FINAL.png" alt="" className="h-9 w-9 object-contain rounded-lg border border-amber-400/30" />
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {err && (
          <div className="rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {err}
          </div>
        )}

        <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-xl">
          <h2 className="text-lg font-bold text-amber-300 mb-1 flex items-center gap-2">
            <Building2 size={20} /> Create organization
          </h2>
          <p className="text-xs text-white/60 mb-5">
            Creates a platform login (email + username) and partner dashboard access. Password is hashed on the server.
          </p>
          <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-200/80 mb-1">Organization name</label>
              <input className={inp} value={form.org_name} onChange={(e) => setForm((f) => ({ ...f, org_name: e.target.value }))} required />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-200/80 mb-1">Type</label>
              <select className={inp} value={form.org_type} onChange={(e) => setForm((f) => ({ ...f, org_type: e.target.value }))}>
                <option value="BANK">Bank</option>
                <option value="MFI">Microfinance</option>
                <option value="SACCO">SACCO</option>
                <option value="INTERNAL_PARTNER">Internal partner</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-200/80 mb-1">Contact person</label>
              <input className={inp} value={form.contact_person} onChange={(e) => setForm((f) => ({ ...f, contact_person: e.target.value }))} />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-200/80 mb-1">Contact email (login)</label>
              <input type="email" className={inp} value={form.contact_email} onChange={(e) => setForm((f) => ({ ...f, contact_email: e.target.value }))} required />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-200/80 mb-1">Phone</label>
              <input className={inp} value={form.contact_phone} onChange={(e) => setForm((f) => ({ ...f, contact_phone: e.target.value }))} />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-200/80 mb-1">Username (alternate login)</label>
              <input className={inp} value={form.login_username} onChange={(e) => setForm((f) => ({ ...f, login_username: e.target.value }))} required />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-200/80 mb-1">Password (min 8)</label>
              <input type="password" className={inp} value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} required minLength={8} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-200/80 mb-1">Address</label>
              <input className={inp} value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-200/80 mb-1">Description</label>
              <textarea className={`${inp} min-h-[72px]`} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-200/80 mb-1">Internal notes</label>
              <textarea className={`${inp} min-h-[56px]`} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
            <label className="md:col-span-2 flex items-center gap-2 text-sm text-white/80">
              <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} />
              Active (inactive partners do not appear in public school pay picker)
            </label>
            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-slate-900 disabled:opacity-50"
                style={{ background: AMBER }}
              >
                {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                Create organization
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.04] overflow-hidden">
          <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
            <h2 className="text-base font-bold text-white">Organizations</h2>
            <button type="button" onClick={load} className="text-xs font-semibold text-amber-300 hover:underline">Refresh</button>
          </div>
          {loading ? (
            <div className="p-10 flex justify-center text-amber-200"><Loader2 className="animate-spin" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-white/90">
                <thead className="text-[10px] uppercase tracking-wider text-amber-200/90 bg-black/20">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Username</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Active</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-t border-white/10 hover:bg-white/[0.03]">
                      <td className="px-4 py-3 font-semibold">{r.org_name}</td>
                      <td className="px-4 py-3 text-white/70">{r.org_type}</td>
                      <td className="px-4 py-3 font-mono text-xs">{r.login_username}</td>
                      <td className="px-4 py-3 text-xs">{r.contact_email}</td>
                      <td className="px-4 py-3">{r.is_active ? 'Yes' : 'No'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!rows.length && <div className="p-8 text-center text-white/50 text-sm">No organizations yet.</div>}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
