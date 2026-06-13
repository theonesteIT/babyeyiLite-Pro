import { useEffect, useMemo, useState } from 'react';
import { Loader2, Search, UserCheck, X } from 'lucide-react';

function fmtTeacher(t) {
  if (!t) return '—';
  return `${t.first_name || ''} ${t.last_name || ''}`.trim() || t.email || 'Teacher';
}

export default function TeacherAssignModal({
  open,
  onClose,
  classRow,
  teachers = [],
  academicYear,
  saving,
  onSave,
}) {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState('');

  useEffect(() => {
    if (open && classRow) {
      setSelectedId(classRow.teacher_user_id ? String(classRow.teacher_user_id) : '');
      setSearch('');
    }
  }, [open, classRow]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return teachers;
    return teachers.filter((t) => {
      const name = fmtTeacher(t).toLowerCase();
      const email = String(t.email || '').toLowerCase();
      const role = String(t.role_code || '').toLowerCase();
      return name.includes(q) || email.includes(q) || role.includes(q);
    });
  }, [teachers, search]);

  if (!open || !classRow) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedId) return;
    onSave(Number(selectedId));
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-[#000435]/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg max-h-[90vh] bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#000435]/8">
          <div>
            <h3 className="text-sm font-semibold text-[#000435]">Assign class teacher</h3>
            <p className="text-xs text-[#000435]/45 mt-0.5">{classRow.class_name} · {classRow.student_count} students</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="p-4 border-b border-slate-100">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search teacher by name, email, role…"
                className="w-full h-11 pl-10 pr-3 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400"
                autoFocus
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-1.5 min-h-[200px] max-h-[340px]">
            {filtered.length === 0 ? (
              <p className="text-center text-sm text-slate-400 py-8">No teachers match your search.</p>
            ) : (
              filtered.map((t) => {
                const active = String(selectedId) === String(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedId(String(t.id))}
                    className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                      active ? 'border-amber-400 bg-amber-50' : 'border-slate-100 bg-slate-50/50 hover:border-slate-200'
                    }`}
                  >
                    <p className="text-sm font-medium text-[#000435]">{fmtTeacher(t)}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {t.email || '—'} {t.role_code ? `· ${t.role_code}` : ''}
                    </p>
                  </button>
                );
              })
            )}
          </div>

          <div className="p-4 border-t border-slate-100 bg-slate-50/80 space-y-3">
            {academicYear && (
              <p className="text-[10px] font-medium text-[#000435]/40">Academic year: {academicYear}</p>
            )}
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="flex-1 h-10 rounded-xl border border-[#000435]/12 font-medium text-[#000435]/60 text-sm">
                Cancel
              </button>
              <button
                type="submit"
                disabled={!selectedId || saving}
                className="flex-1 h-10 rounded-xl bg-[#000435] text-white font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saving ? <Loader2 size={18} className="animate-spin" /> : <UserCheck size={18} className="text-amber-400" />}
                Assign teacher
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
