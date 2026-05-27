import { useState, useEffect, useCallback } from 'react';
import {
  UserPlus, Search, RefreshCw, Loader2, MapPin, Edit, Trash2, Eye, EyeOff, X,
} from 'lucide-react';
import { PROVINCES } from '../../../../data/rwandaSchoolProvinces';

function districtsForProvince(province) {
  const p = PROVINCES[province];
  if (!p) return [];
  if (Array.isArray(p)) return p;
  if (p.districts) return Object.keys(p.districts);
  return [];
}
import { font } from '../utils/theme';
import { apiFetch, AUTH_API } from '../utils/api';
import Pagination from '../components/Pagination';

const EMPTY = {
  firstName: '', lastName: '', email: '', phone: '', password: '', confirmPassword: '',
  district: '', province: '', sector: '',
};

const PAGE_SIZE = 10;

export default function DeoOfficersPage({ toast }) {
  const [rows, setRows] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`${AUTH_API}/deo-admins`);
      setRows(res.data || []);
    } catch (e) {
      toast?.(e.message || 'Failed to load DEO officers', 'error');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const q = search.trim().toLowerCase();
    const list = !q
      ? rows
      : rows.filter(
          (r) =>
            `${r.first_name} ${r.last_name}`.toLowerCase().includes(q) ||
            (r.email || '').toLowerCase().includes(q) ||
            (r.district || '').toLowerCase().includes(q),
        );
    setFiltered(list);
    setPage(1);
  }, [rows, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openAdd = () => {
    setForm(EMPTY);
    setModal({ mode: 'add' });
  };

  const openEdit = (row) => {
    setForm({
      id: row.id,
      firstName: row.first_name || '',
      lastName: row.last_name || '',
      email: row.email || '',
      phone: row.phone || '',
      district: row.district || '',
      province: row.province || '',
      sector: row.sector || '',
      password: '',
      confirmPassword: '',
      is_active: row.is_active !== 0,
    });
    setModal({ mode: 'edit', row });
  };

  const save = async () => {
    if (!form.firstName?.trim() || !form.lastName?.trim() || !form.email?.trim() || !form.district?.trim()) {
      toast?.('Fill required fields', 'error');
      return;
    }
    if (modal.mode === 'add') {
      if (!form.password || form.password.length < 8) {
        toast?.('Password min 8 characters', 'error');
        return;
      }
      if (form.password !== form.confirmPassword) {
        toast?.('Passwords do not match', 'error');
        return;
      }
    }
    setSaving(true);
    try {
      const payload = {
        first_name: form.firstName,
        last_name: form.lastName,
        email: form.email,
        phone: form.phone || undefined,
        district: form.district,
        province: form.province || undefined,
        sector: form.sector || undefined,
        ...(form.password && { password: form.password }),
        ...(modal.mode === 'edit' && { is_active: form.is_active ? 1 : 0 }),
      };
      if (modal.mode === 'edit') {
        await apiFetch(`${AUTH_API}/deo-admin/${form.id}`, { method: 'PUT', body: JSON.stringify(payload) });
        toast?.('DEO updated.', 'success');
      } else {
        await apiFetch(`${AUTH_API}/create-deo`, { method: 'POST', body: JSON.stringify(payload) });
        toast?.('DEO created.', 'success');
      }
      setModal(null);
      load();
    } catch (e) {
      toast?.(e.message || 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row) => {
    if (!window.confirm(`Deactivate/delete DEO ${row.first_name} ${row.last_name}?`)) return;
    try {
      await apiFetch(`${AUTH_API}/deo-admin/${row.id}`, { method: 'DELETE' });
      toast?.('DEO removed.', 'info');
      load();
    } catch (e) {
      toast?.(e.message || 'Delete failed', 'error');
    }
  };

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-5 anim" style={{ fontFamily: font }}>
      <div className="flex flex-col gap-3 rounded-2xl border border-[#fde68a] bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-700" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search DEO by name, email, district…"
            className="w-full rounded-xl border border-[#fde68a] bg-[#fffbeb] py-2.5 pl-10 pr-3 text-[13px]"
          />
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={load} className="rounded-xl border border-[#fde68a] px-3 py-2.5">
            <RefreshCw size={16} className="text-amber-800" />
          </button>
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#000435] px-4 py-2.5 text-[13px] font-bold text-amber-400 sm:flex-none"
          >
            <UserPlus size={16} /> Add DEO
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-amber-500" />
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-[#fde68a] bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-left text-[13px]">
                <thead>
                  <tr className="border-b border-amber-200 bg-gradient-to-r from-amber-400 to-amber-500 text-[10px] font-black uppercase text-[#000435]">
                    <th className="px-4 py-3">Officer</th>
                    <th className="px-4 py-3">District</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((r, i) => (
                    <tr key={r.id} className={i % 2 ? 'bg-[#fffbeb]/50' : ''}>
                      <td className="px-4 py-3 font-bold text-[#000435]">
                        {r.first_name} {r.last_name}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-amber-900">
                          <MapPin size={12} /> {r.district}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#000435]/80">{r.email}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-lg border px-2 py-0.5 text-[10px] font-bold ${
                          r.is_active ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800'
                        }`}>
                          {r.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button type="button" onClick={() => openEdit(r)} className="cursor-pointer rounded-lg border border-[#fde68a] p-2 text-amber-800 hover:bg-amber-50">
                            <Edit size={14} />
                          </button>
                          <button type="button" onClick={() => remove(r)} className="cursor-pointer rounded-lg border border-red-200 p-2 text-red-700 hover:bg-red-50">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <Pagination
            current={page}
            total={totalPages}
            totalItems={filtered.length}
            pageSize={PAGE_SIZE}
            loading={loading}
            onChange={setPage}
          />
        </>
      )}

      {modal && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center bg-[#000435]/50 p-4 backdrop-blur-sm sm:items-center">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#fde68a] bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="m-0 text-lg font-black text-[#000435]">
                {modal.mode === 'add' ? 'Create DEO Officer' : 'Edit DEO Officer'}
              </h3>
              <button type="button" onClick={() => setModal(null)} className="cursor-pointer rounded-lg p-1 text-amber-800">
                <X size={20} />
              </button>
            </div>
            <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              DEO officers can only review fee requests from their assigned district.
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="First name *" value={form.firstName} onChange={(v) => set('firstName', v)} />
              <Field label="Last name *" value={form.lastName} onChange={(v) => set('lastName', v)} />
              <div className="col-span-2">
                <Field label="Email *" value={form.email} onChange={(v) => set('email', v)} type="email" />
              </div>
              <Field label="Phone" value={form.phone} onChange={(v) => set('phone', v)} />
              <div>
                <label className="mb-1 block text-[10px] font-bold text-[#000435]/60">Province</label>
                <select
                  value={form.province}
                  onChange={(e) => { set('province', e.target.value); set('district', ''); }}
                  className="w-full rounded-xl border border-[#fde68a] bg-[#fffbeb] px-3 py-2 text-[13px]"
                >
                  <option value="">Select…</option>
                  {Object.keys(PROVINCES).map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold text-[#000435]/60">District *</label>
                <select
                  value={form.district}
                  onChange={(e) => set('district', e.target.value)}
                  disabled={!form.province}
                  className="w-full rounded-xl border border-[#fde68a] bg-[#fffbeb] px-3 py-2 text-[13px] disabled:opacity-50"
                >
                  <option value="">Select…</option>
                  {districtsForProvince(form.province).map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>
            {modal.mode === 'edit' && (
              <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm font-semibold">
                <input type="checkbox" checked={!!form.is_active} onChange={(e) => set('is_active', e.target.checked)} />
                Account active
              </label>
            )}
            <div className="mt-4 space-y-2">
              <label className="block text-[10px] font-bold text-[#000435]/60">
                {modal.mode === 'add' ? 'Password *' : 'New password (optional)'}
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => set('password', e.target.value)}
                  className="w-full rounded-xl border border-[#fde68a] bg-[#fffbeb] px-3 py-2 pr-10 text-[13px]"
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer text-amber-800">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {(modal.mode === 'add' || form.password) && (
                <input
                  type="password"
                  placeholder="Confirm password"
                  value={form.confirmPassword}
                  onChange={(e) => set('confirmPassword', e.target.value)}
                  className="w-full rounded-xl border border-[#fde68a] bg-[#fffbeb] px-3 py-2 text-[13px]"
                />
              )}
            </div>
            <button
              type="button"
              disabled={saving}
              onClick={save}
              className="mt-5 w-full cursor-pointer rounded-xl bg-[#000435] py-3 text-sm font-bold text-amber-400 disabled:opacity-60"
            >
              {saving ? 'Saving…' : modal.mode === 'add' ? 'Create DEO' : 'Save changes'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, type = 'text' }) {
  return (
    <div>
      <label className="mb-1 block text-[10px] font-bold text-[#000435]/60">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-[#fde68a] bg-[#fffbeb] px-3 py-2 text-[13px]"
      />
    </div>
  );
}
