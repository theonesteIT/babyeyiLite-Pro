import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, CheckCircle2, GraduationCap, Loader2, RefreshCw, Search, Trash2, UserCheck, Users,
} from 'lucide-react';
import PageShell, { KpiCard, Panel } from '../../components/PageShell';
import TeacherAssignModal from '../../components/TeacherAssignModal';
import {
  assignClassTeacher, fetchAcademicYear, fetchClassesOverview, fetchTeachingStaff, removeClassTeacher,
} from '../../services/marksAcademicApi';

export default function ClassesPage() {
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState({ total_classes: 0, assigned_count: 0, unassigned_count: 0, total_students: 0 });
  const [teachers, setTeachers] = useState([]);
  const [academicYear, setAcademicYear] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [modalRow, setModalRow] = useState(null);
  const [toast, setToast] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [clsRes, staffRes, year] = await Promise.all([
        fetchClassesOverview(),
        fetchTeachingStaff(),
        fetchAcademicYear(),
      ]);
      if (clsRes?.success) {
        setRows(clsRes.data?.rows || []);
        setStats({
          total_classes: clsRes.data?.total_classes || 0,
          assigned_count: clsRes.data?.assigned_count || 0,
          unassigned_count: clsRes.data?.unassigned_count || 0,
          total_students: clsRes.data?.total_students || 0,
        });
      }
      if (staffRes?.success) setTeachers(staffRes.data || []);
      if (year) setAcademicYear(String(year));
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Failed to load classes' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

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

  const handleAssign = async (teacherUserId) => {
    if (!modalRow) return;
    setSaving(true);
    try {
      await assignClassTeacher({
        class_name: modalRow.class_name,
        teacher_user_id: teacherUserId,
        academic_year: academicYear || undefined,
      });
      setToast({ type: 'success', message: `Class teacher assigned to ${modalRow.class_name}` });
      setModalRow(null);
      await load();
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Failed to assign teacher' });
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (row) => {
    if (!row.assignment_id || !window.confirm(`Remove class teacher for ${row.class_name}?`)) return;
    setSaving(true);
    try {
      await removeClassTeacher(row.assignment_id);
      setToast({ type: 'success', message: 'Assignment removed' });
      await load();
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Failed to remove' });
    } finally {
      setSaving(false);
    }
  };

  const btnSecondary = 'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium bg-[#000435] text-white hover:bg-[#0a116b] transition-colors disabled:opacity-50';

  return (
    <PageShell
      title="Classes"
      subtitle="All classes registered at your school — assign homeroom teachers for marks and student oversight."
      actions={(
        <button type="button" onClick={load} disabled={loading} className={btnSecondary}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      )}
    >
      {toast && (
        <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium border ${toast.type === 'success' ? 'bg-[#f59e0b]/8 border-[#f59e0b]/25 text-[#000435]' : 'bg-[#000435]/5 border-[#000435]/12 text-[#000435]'}`}>
          {toast.type === 'success' ? <CheckCircle2 size={16} className="text-[#f59e0b]" /> : <AlertTriangle size={16} className="text-[#f59e0b]" />}
          {toast.message}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={GraduationCap} label="Total classes" value={stats.total_classes} />
        <KpiCard icon={UserCheck} label="With class teacher" value={stats.assigned_count} accent="text-green-600" />
        <KpiCard icon={AlertTriangle} label="Unassigned" value={stats.unassigned_count} accent="text-amber-600" />
        <KpiCard icon={Users} label="Total students" value={stats.total_students} />
      </div>

      <Panel>
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#000435]/30" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search class or teacher…"
              className="w-full h-9 pl-9 pr-3 rounded-xl border border-[#000435]/12 text-sm text-[#000435] focus:outline-none focus:ring-2 focus:ring-[#f59e0b]/25"
            />
          </div>
          <div className="flex gap-2">
            {['all', 'assigned', 'unassigned'].map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-medium capitalize ${filter === key ? 'bg-[#000435] text-white' : 'bg-[#000435]/5 text-[#000435]/55 hover:bg-[#000435]/8'}`}
              >
                {key}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-[#000435]/40">
            <Loader2 className="animate-spin" size={20} /> Loading classes…
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[#000435]/8">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="bg-[#000435]/[0.03] text-[10px] font-medium uppercase tracking-wide text-[#000435]/50">
                  <th className="text-left py-3 px-4">Class</th>
                  <th className="text-left py-3 px-4">Level</th>
                  <th className="text-left py-3 px-4">Students</th>
                  <th className="text-left py-3 px-4">Class teacher</th>
                  <th className="text-right py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-[#000435]/35 text-sm">No classes found. Register classes or enroll students first.</td>
                  </tr>
                ) : filtered.map((row, i) => (
                  <tr key={row.class_name} className={`border-t border-[#000435]/6 ${i % 2 === 0 ? 'bg-white' : 'bg-[#000435]/[0.015]'} hover:bg-[#f59e0b]/4 transition-colors`}>
                    <td className="py-3 px-4 font-medium text-[#000435]">{row.class_name}</td>
                    <td className="py-3 px-4 text-[#000435]/45 text-xs">{row.category || row.group_name || '—'}</td>
                    <td className="py-3 px-4 font-medium text-[#000435]/70 tabular-nums">{row.student_count}</td>
                    <td className="py-3 px-4">
                      {row.teacher_name ? (
                        <div>
                          <p className="font-medium text-[#000435]">{row.teacher_name}</p>
                          {row.teacher_email && <p className="text-[10px] text-[#000435]/40">{row.teacher_email}</p>}
                        </div>
                      ) : (
                        <span className="text-[10px] font-medium text-[#f59e0b] bg-[#f59e0b]/10 px-2 py-0.5 rounded-md">Not assigned</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setModalRow(row)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f59e0b] text-[#000435] text-[10px] font-medium hover:opacity-90 transition-opacity"
                        >
                          <UserCheck size={13} />
                          {row.teacher_user_id ? 'Change' : 'Assign'}
                        </button>
                        {row.assignment_id && (
                          <button type="button" disabled={saving} onClick={() => handleRemove(row)} className="p-1.5 rounded-lg border border-red-200/80 text-red-500 hover:bg-red-50 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <TeacherAssignModal
        open={Boolean(modalRow)}
        classRow={modalRow}
        teachers={teachers}
        academicYear={academicYear}
        saving={saving}
        onClose={() => setModalRow(null)}
        onSave={handleAssign}
      />
    </PageShell>
  );
}
