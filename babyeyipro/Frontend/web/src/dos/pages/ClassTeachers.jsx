import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Search,
  Trash2,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import api from '../services/api';
import DosOrangePageHero, { DosPageBody } from '../components/DosOrangePageHero';

function fmtTeacher(t) {
  if (!t) return '—';
  return `${t.first_name || ''} ${t.last_name || ''}`.trim() || t.email || 'Teacher';
}

export default function ClassTeachers() {
  const [rows, setRows] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [academicYear, setAcademicYear] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ teacher_user_id: '' });
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ctRes, staffRes, calRes] = await Promise.all([
        api.get('/dos/class-teachers'),
        api.get('/dos/teaching-staff'),
        api.get('/dos/academic-calendar-settings').catch(() => ({ data: {} })),
      ]);
      if (ctRes.data?.success) setRows(ctRes.data.data?.rows || []);
      if (staffRes.data?.success) setTeachers(staffRes.data.data || []);
      const year = calRes.data?.data?.current_academic_year || calRes.data?.current_academic_year;
      if (year) setAcademicYear(String(year));
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Failed to load class teachers' });
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(() => {
    const assigned = rows.filter((r) => r.teacher_user_id).length;
    return {
      classes: rows.length,
      assigned,
      unassigned: rows.length - assigned,
      students: rows.reduce((s, r) => s + Number(r.student_count || 0), 0),
    };
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter === 'assigned' && !r.teacher_user_id) return false;
      if (filter === 'unassigned' && r.teacher_user_id) return false;
      if (!q) return true;
      return (
        String(r.class_name || '').toLowerCase().includes(q)
        || String(r.teacher_name || '').toLowerCase().includes(q)
      );
    });
  }, [rows, search, filter]);

  const openAssign = (row) => {
    setModal(row);
    setForm({ teacher_user_id: row.teacher_user_id ? String(row.teacher_user_id) : '' });
  };

  const saveAssign = async (e) => {
    e.preventDefault();
    if (!modal?.class_name || !form.teacher_user_id) return;
    setSaving(true);
    try {
      await api.post('/dos/class-teachers', {
        class_name: modal.class_name,
        teacher_user_id: Number(form.teacher_user_id),
        academic_year: academicYear || undefined,
      });
      setToast({ type: 'success', message: `Class teacher set for ${modal.class_name}` });
      setModal(null);
      await load();
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Failed to save assignment' });
    } finally {
      setSaving(false);
    }
  };

  const removeAssign = async (row) => {
    if (!row.assignment_id) return;
    if (!window.confirm(`Remove class teacher for ${row.class_name}?`)) return;
    setSaving(true);
    try {
      await api.delete(`/dos/class-teachers/${row.assignment_id}`);
      setToast({ type: 'success', message: 'Assignment removed' });
      await load();
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Failed to remove' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <DosPageBody>
      <DosOrangePageHero
        title="Class Teachers"
        subtitle="Assign a registered teacher as homeroom (class) teacher. They will see only that class on the teacher portal Students page."
        onRefresh={load}
        refreshing={loading}
        heroStats={[
          { label: 'Classes', value: stats.classes },
          { label: 'Assigned', value: stats.assigned },
          { label: 'Unassigned', value: stats.unassigned },
          { label: 'Students', value: stats.students },
        ]}
      />

      {toast && (
        <div
          className={`mb-4 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold ${
            toast.type === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          {toast.message}
        </div>
      )}

      <div className="rounded-2xl border border-black/5 bg-white shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 border-b border-black/5">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search class or teacher…"
              className="w-full h-10 pl-9 pr-3 rounded-xl border border-black/10 text-sm font-medium"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {['all', 'assigned', 'unassigned'].map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider ${
                  filter === key ? 'bg-[#000435] text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {key}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-slate-500">
            <Loader2 className="animate-spin" size={22} />
            Loading classes…
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-500">
                  <th className="px-4 py-3">Class</th>
                  <th className="px-4 py-3">Students</th>
                  <th className="px-4 py-3">Class teacher</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center text-slate-500 font-medium">
                      No classes match your filters. Enroll students in classes first.
                    </td>
                  </tr>
                ) : (
                  filtered.map((row) => (
                    <tr key={row.class_name} className="border-t border-black/5 hover:bg-slate-50/80">
                      <td className="px-4 py-3 font-bold text-[#0f172a]">{row.class_name}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-slate-600 font-semibold">
                          <Users size={14} />
                          {row.student_count}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {row.teacher_name ? (
                          <div>
                            <p className="font-bold text-[#0f172a]">{row.teacher_name}</p>
                            {row.teacher_email ? (
                              <p className="text-[11px] text-slate-500">{row.teacher_email}</p>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-amber-600 font-bold text-xs uppercase tracking-wide">Not assigned</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openAssign(row)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#FF8C00] text-white text-[11px] font-black uppercase tracking-wide hover:bg-[#e67e00]"
                          >
                            <UserCheck size={14} />
                            {row.teacher_user_id ? 'Change' : 'Assign'}
                          </button>
                          {row.assignment_id ? (
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() => removeAssign(row)}
                              className="p-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50"
                              title="Remove assignment"
                            >
                              <Trash2 size={16} />
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl border border-black/10">
            <div className="flex items-center justify-between px-5 py-4 border-b border-black/5">
              <h2 className="text-lg font-black text-[#0f172a]">
                Assign class teacher — {modal.class_name}
              </h2>
              <button type="button" onClick={() => setModal(null)} className="p-1 rounded-lg hover:bg-slate-100">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={saveAssign} className="p-5 space-y-4">
              <p className="text-sm text-slate-600">
                Choose a registered teacher ({modal.student_count} students in this class).
                They will manage this class on the teacher portal.
              </p>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">
                  Teacher
                </label>
                <select
                  required
                  value={form.teacher_user_id}
                  onChange={(e) => setForm({ teacher_user_id: e.target.value })}
                  className="w-full h-11 rounded-xl border border-black/10 px-3 text-sm font-semibold bg-white"
                >
                  <option value="">Select teacher…</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {fmtTeacher(t)} {t.role_code ? `(${t.role_code})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              {academicYear ? (
                <p className="text-[11px] text-slate-500 font-medium">Academic year: {academicYear}</p>
              ) : null}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModal(null)}
                  className="flex-1 h-11 rounded-xl border border-black/10 font-bold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 h-11 rounded-xl bg-[#000435] text-white font-bold flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 size={18} className="animate-spin" /> : <UserCheck size={18} />}
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DosPageBody>
  );
}
