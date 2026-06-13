import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, BookOpen, CalendarClock, CheckCircle2, Eye, ExternalLink, GraduationCap,
  Layers, Loader2, Pencil, Plus, RefreshCw, Search, Trash2, X,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import PageShell, { KpiCard, Panel } from '../../components/PageShell';
import {
  createSubject, deactivateSubject, fetchClassSubjects, fetchClassesOverview, fetchSubjects, setClassSubjects, updateSubject,
} from '../../services/marksAcademicApi';

const NAVY = '#000435';
const AMBER = '#f59e0b';

const btnPrimary = 'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium bg-[#f59e0b] text-[#000435] hover:opacity-90 transition-opacity';
const btnSecondary = 'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium bg-[#000435] text-white hover:bg-[#0a116b] transition-colors';
const btnGhost = 'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium border border-[#000435]/12 text-[#000435]/70 hover:border-[#f59e0b]/40 hover:text-[#000435] transition-colors';

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [classSubjects, setClassSubjectsState] = useState({ rows: [], by_class: {} });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [manageOpen, setManageOpen] = useState(false);
  const [classSearch, setClassSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState(null);
  const [pickedSubjects, setPickedSubjects] = useState([]);
  const [addCourseOpen, setAddCourseOpen] = useState(false);
  const [editCourse, setEditCourse] = useState(null);
  const [viewCourse, setViewCourse] = useState(null);
  const [courseForm, setCourseForm] = useState({ name: '', category: '', subject_code: '' });
  const [toast, setToast] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [subRes, clsRes, mapRes] = await Promise.all([
        fetchSubjects(true),
        fetchClassesOverview(),
        fetchClassSubjects(),
      ]);
      if (subRes?.success) setSubjects(subRes.data || []);
      if (clsRes?.success) setClasses(clsRes.data?.rows || []);
      if (mapRes?.success) setClassSubjectsState(mapRes.data || { rows: [], by_class: {} });
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Failed to load data' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const subjectClassMap = useMemo(() => {
    const map = {};
    for (const r of classSubjects.rows || []) {
      if (!map[r.subject_id]) map[r.subject_id] = [];
      if (!map[r.subject_id].includes(r.class_name)) map[r.subject_id].push(r.class_name);
    }
    return map;
  }, [classSubjects]);

  const timetableByClass = useMemo(() => {
    const map = {};
    for (const r of classSubjects.rows || []) {
      if (!r.from_timetable && r.source !== 'timetable' && r.source !== 'both') continue;
      const cn = r.class_name;
      if (!map[cn]) map[cn] = new Set();
      map[cn].add(r.subject_id);
    }
    return map;
  }, [classSubjects]);

  const stats = useMemo(() => ({
    total: subjects.length,
    active: subjects.filter((s) => s.is_active).length,
    mapped: classSubjects.rows?.length || 0,
    classesWithCourses: Object.keys(classSubjects.by_class || {}).length,
  }), [subjects, classSubjects]);

  const chartData = useMemo(() => {
    const counts = {};
    for (const s of subjects) {
      counts[s.name] = (subjectClassMap[s.id] || []).length;
    }
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .filter((x) => x.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [subjects, subjectClassMap]);

  const filteredSubjects = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return subjects;
    return subjects.filter((s) =>
      String(s.name).toLowerCase().includes(q)
      || String(s.category || '').toLowerCase().includes(q)
      || String(s.subject_code || '').toLowerCase().includes(q)
    );
  }, [subjects, search]);

  const filteredClasses = useMemo(() => {
    const q = classSearch.trim().toLowerCase();
    if (!q) return classes;
    return classes.filter((c) => String(c.class_name).toLowerCase().includes(q));
  }, [classes, classSearch]);

  const openManageModal = () => {
    setManageOpen(true);
    setClassSearch('');
    const first = classes[0] || null;
    setSelectedClass(first);
    if (first) {
      const assigned = classSubjects.by_class?.[first.class_name] || [];
      setPickedSubjects(assigned.map((r) => r.subject_id));
    } else {
      setPickedSubjects([]);
    }
  };

  const selectClassInModal = (cls) => {
    setSelectedClass(cls);
    const assigned = classSubjects.by_class?.[cls.class_name] || [];
    setPickedSubjects(assigned.map((r) => r.subject_id));
  };

  const selectedClassCourses = useMemo(() => {
    if (!selectedClass) return [];
    return classSubjects.by_class?.[selectedClass.class_name] || [];
  }, [selectedClass, classSubjects]);

  const handleSaveClassCourses = async () => {
    if (!selectedClass) return;
    setSaving(true);
    try {
      await setClassSubjects(selectedClass.class_name, pickedSubjects);
      setToast({ type: 'success', message: `Courses saved for ${selectedClass.class_name}` });
      await load();
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Failed to save' });
    } finally {
      setSaving(false);
    }
  };

  const handleAddCourse = async (e) => {
    e.preventDefault();
    if (!courseForm.name.trim()) return;
    setSaving(true);
    try {
      await createSubject({
        name: courseForm.name.trim(),
        category: courseForm.category.trim() || undefined,
        subject_code: courseForm.subject_code.trim() || undefined,
      });
      setToast({ type: 'success', message: 'Course added' });
      setAddCourseOpen(false);
      setCourseForm({ name: '', category: '', subject_code: '' });
      await load();
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Failed to add' });
    } finally {
      setSaving(false);
    }
  };

  const handleEditCourse = async (e) => {
    e.preventDefault();
    if (!editCourse) return;
    setSaving(true);
    try {
      await updateSubject(editCourse.id, {
        name: courseForm.name.trim(),
        category: courseForm.category.trim() || null,
        subject_code: courseForm.subject_code.trim() || null,
      });
      setToast({ type: 'success', message: 'Course updated' });
      setEditCourse(null);
      await load();
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Failed to update' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCourse = async (subject) => {
    if (!window.confirm(`Deactivate "${subject.name}"? It will be hidden from new assignments.`)) return;
    try {
      await deactivateSubject(subject.id);
      setToast({ type: 'success', message: 'Course deactivated' });
      await load();
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Failed to delete' });
    }
  };

  const togglePick = (id) => {
    setPickedSubjects((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  return (
    <PageShell
      title="Subjects & Class Courses"
      subtitle="Course catalogue and class assignments — synced with Timetable where subjects are scheduled."
      actions={(
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={openManageModal} className={btnPrimary}>
            <GraduationCap size={14} /> Manage class courses
          </button>
          <button type="button" onClick={() => { setAddCourseOpen(true); setCourseForm({ name: '', category: '', subject_code: '' }); }} className={btnGhost}>
            <Plus size={14} /> Add course
          </button>
          <button type="button" onClick={load} disabled={loading} className={btnSecondary}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      )}
    >
      {toast && (
        <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium border ${toast.type === 'success' ? 'bg-[#f59e0b]/8 border-[#f59e0b]/25 text-[#000435]' : 'bg-[#000435]/5 border-[#000435]/12 text-[#000435]'}`}>
          {toast.type === 'success' ? <CheckCircle2 size={16} className="text-[#f59e0b]" /> : <AlertTriangle size={16} className="text-[#f59e0b]" />}
          {toast.message}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 px-4 py-3 rounded-xl border border-[#000435]/8 bg-[#000435]/[0.02]">
        <CalendarClock size={16} className="text-[#f59e0b] shrink-0" />
        <p className="text-xs text-[#000435]/60 flex-1 min-w-0">
          Class courses include subjects assigned on <span className="font-medium text-[#000435]/80">Teacher Assignments</span> plus any manual additions here.
        </p>
        <Link to="/dos/teacher-assignments" className="inline-flex items-center gap-1.5 text-xs font-medium text-[#000435]/70 hover:text-[#f59e0b] transition-colors shrink-0">
          Teacher Assignments <ExternalLink size={12} />
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={BookOpen} label="Courses" value={stats.total} sub={`${stats.active} active`} />
        <KpiCard icon={Layers} label="Assignments" value={stats.mapped} />
        <KpiCard icon={GraduationCap} label="Classes mapped" value={stats.classesWithCourses} />
        <KpiCard icon={BookOpen} label="Catalogue" value={filteredSubjects.length} sub="shown" />
      </div>

      {chartData.length > 0 && (
        <Panel title="Course reach (classes per subject)">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={`${NAVY}08`} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: `${NAVY}99` }} angle={-12} textAnchor="end" height={44} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: `${NAVY}99` }} />
              <Tooltip contentStyle={{ borderRadius: 10, border: `1px solid ${NAVY}12`, fontSize: 12 }} />
              <Bar dataKey="count" fill={AMBER} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      )}

      <Panel title="School course catalogue">
        <div className="relative mb-4 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#000435]/30" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search courses…"
            className="w-full h-9 pl-9 pr-3 rounded-xl border border-[#000435]/12 text-sm text-[#000435] focus:outline-none focus:ring-2 focus:ring-[#f59e0b]/25"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-14"><Loader2 className="animate-spin text-[#000435]/25" /></div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[#000435]/8">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="bg-[#000435]/[0.03] text-[#000435]/50 text-[10px] font-medium uppercase tracking-wide">
                  <th className="text-left py-3 px-4">Course</th>
                  <th className="text-left py-3 px-4">Code</th>
                  <th className="text-left py-3 px-4">Category</th>
                  <th className="text-center py-3 px-4">Classes</th>
                  <th className="text-center py-3 px-4">Status</th>
                  <th className="text-right py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubjects.length === 0 ? (
                  <tr><td colSpan={6} className="py-12 text-center text-[#000435]/35 text-sm">No courses found</td></tr>
                ) : filteredSubjects.map((s, i) => {
                  const classList = subjectClassMap[s.id] || [];
                  return (
                    <tr key={s.id} className={`border-t border-[#000435]/6 ${i % 2 === 0 ? 'bg-white' : 'bg-[#000435]/[0.015]'} hover:bg-[#f59e0b]/4 transition-colors`}>
                      <td className="py-3 px-4 font-medium text-[#000435]">{s.name}</td>
                      <td className="py-3 px-4 text-[#000435]/50 font-mono text-xs">{s.subject_code || '—'}</td>
                      <td className="py-3 px-4 text-[#000435]/50">{s.category || 'General'}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex min-w-[1.75rem] justify-center px-2 py-0.5 rounded-md bg-[#f59e0b]/10 text-[#000435] text-xs font-medium">{classList.length}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${s.is_active ? 'bg-[#000435]/8 text-[#000435]/70' : 'bg-[#000435]/5 text-[#000435]/35'}`}>
                          {s.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-0.5">
                          <button type="button" title="View classes" onClick={() => setViewCourse({ ...s, classes: classList })} className="p-2 rounded-lg hover:bg-[#000435]/5 text-[#000435]/45 hover:text-[#f59e0b]">
                            <Eye size={15} />
                          </button>
                          <button type="button" title="Edit" onClick={() => { setEditCourse(s); setCourseForm({ name: s.name, category: s.category || '', subject_code: s.subject_code || '' }); }} className="p-2 rounded-lg hover:bg-[#000435]/5 text-[#000435]/45 hover:text-[#000435]">
                            <Pencil size={15} />
                          </button>
                          <button type="button" title="Deactivate" onClick={() => handleDeleteCourse(s)} className="p-2 rounded-lg hover:bg-[#000435]/5 text-[#000435]/35 hover:text-[#000435]">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* Manage class courses modal */}
      {manageOpen && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <button type="button" aria-label="Close" className="absolute inset-0 bg-[#000435]/50 backdrop-blur-[2px]" onClick={() => setManageOpen(false)} />
          <div className="relative w-full sm:max-w-3xl max-h-[90vh] bg-white rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col overflow-hidden border border-[#000435]/8">
            <div className="px-5 py-4 border-b border-[#000435]/8 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-semibold text-[#000435]">Manage class courses</h3>
                <p className="text-xs text-[#000435]/45 mt-0.5">Select a class to view and edit its courses</p>
              </div>
              <button type="button" onClick={() => setManageOpen(false)} className="p-1.5 rounded-lg hover:bg-[#000435]/5 text-[#000435]/40"><X size={18} /></button>
            </div>

            <div className="flex flex-1 min-h-0 flex-col sm:flex-row">
              {/* Class list */}
              <div className="sm:w-[220px] shrink-0 border-b sm:border-b-0 sm:border-r border-[#000435]/8 flex flex-col">
                <div className="p-3 border-b border-[#000435]/6">
                  <div className="relative">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#000435]/30" />
                    <input
                      type="search"
                      value={classSearch}
                      onChange={(e) => setClassSearch(e.target.value)}
                      placeholder="Filter classes…"
                      className="w-full h-8 pl-8 pr-2 rounded-lg border border-[#000435]/10 text-xs focus:outline-none focus:ring-1 focus:ring-[#f59e0b]/30"
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-0.5 max-h-[180px] sm:max-h-none">
                  {filteredClasses.length === 0 ? (
                    <p className="text-xs text-[#000435]/35 text-center py-6">No classes found</p>
                  ) : filteredClasses.map((cls) => {
                    const count = (classSubjects.by_class?.[cls.class_name] || []).length;
                    const active = selectedClass?.class_name === cls.class_name;
                    return (
                      <button
                        key={cls.class_name}
                        type="button"
                        onClick={() => selectClassInModal(cls)}
                        className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${active ? 'bg-[#f59e0b]/12 border border-[#f59e0b]/30' : 'hover:bg-[#000435]/4 border border-transparent'}`}
                      >
                        <p className={`text-xs font-medium truncate ${active ? 'text-[#000435]' : 'text-[#000435]/75'}`}>{cls.class_name}</p>
                        <p className="text-[10px] text-[#000435]/40 mt-0.5">{cls.student_count} students · {count} course{count !== 1 ? 's' : ''}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Courses panel */}
              <div className="flex-1 flex flex-col min-h-0">
                {selectedClass ? (
                  <>
                    <div className="px-4 py-3 border-b border-[#000435]/6 bg-[#000435]/[0.02]">
                      <p className="text-sm font-medium text-[#000435]">{selectedClass.class_name}</p>
                      <p className="text-[10px] text-[#000435]/40 mt-0.5">
                        {selectedClassCourses.length} course{selectedClassCourses.length !== 1 ? 's' : ''} assigned
                        {(timetableByClass[selectedClass.class_name]?.size || 0) > 0 && (
                          <> · {timetableByClass[selectedClass.class_name].size} from timetable</>
                        )}
                      </p>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
                      {subjects.filter((s) => s.is_active).map((s) => {
                        const isTt = timetableByClass[selectedClass.class_name]?.has(s.id);
                        const row = selectedClassCourses.find((r) => r.subject_id === s.id);
                        const checked = pickedSubjects.includes(s.id);
                        return (
                          <label
                            key={s.id}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-all ${checked ? 'border-[#f59e0b]/35 bg-[#f59e0b]/6' : 'border-[#000435]/8 hover:border-[#f59e0b]/25'}`}
                          >
                            <input type="checkbox" checked={checked} onChange={() => togglePick(s.id)} className="accent-[#f59e0b] w-3.5 h-3.5" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-xs font-medium text-[#000435] truncate">{s.name}</p>
                                {isTt && (
                                  <span className="shrink-0 text-[9px] font-medium px-1.5 py-0.5 rounded bg-[#000435]/6 text-[#000435]/55">Timetable</span>
                                )}
                                {row?.source === 'manual' && (
                                  <span className="shrink-0 text-[9px] font-medium px-1.5 py-0.5 rounded bg-[#f59e0b]/10 text-[#000435]/50">Manual</span>
                                )}
                              </div>
                              <p className="text-[10px] text-[#000435]/40">{s.category || 'General'}{s.subject_code ? ` · ${s.subject_code}` : ''}</p>
                            </div>
                          </label>
                        );
                      })}
                      {subjects.filter((s) => s.is_active).length === 0 && (
                        <p className="text-xs text-[#000435]/35 text-center py-8">Add courses to the catalogue first</p>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center p-8">
                    <p className="text-sm text-[#000435]/35">Select a class from the list</p>
                  </div>
                )}
              </div>
            </div>

            <div className="px-4 py-3 border-t border-[#000435]/8 flex gap-2 bg-white">
              <Link to="/dos/teacher-assignments" className={`${btnGhost} flex-1 justify-center`}>
                <ExternalLink size={13} /> Teacher Assignments
              </Link>
              <button type="button" onClick={() => setManageOpen(false)} className="flex-1 h-9 rounded-xl border border-[#000435]/12 text-xs font-medium text-[#000435]/70">Close</button>
              <button type="button" onClick={handleSaveClassCourses} disabled={saving || !selectedClass} className="flex-1 h-9 rounded-xl bg-[#f59e0b] text-[#000435] text-xs font-medium disabled:opacity-50">
                {saving ? 'Saving…' : `Save (${pickedSubjects.length})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View classes modal */}
      {viewCourse && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#000435]/50 backdrop-blur-[2px]">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-[#000435]/8">
            <div className="px-5 py-4 border-b border-[#000435]/8 flex justify-between items-start">
              <div>
                <h3 className="text-sm font-semibold text-[#000435]">{viewCourse.name}</h3>
                <p className="text-xs text-[#000435]/45 mt-0.5">Assigned to {viewCourse.classes?.length || 0} classes</p>
              </div>
              <button type="button" onClick={() => setViewCourse(null)} className="p-1 rounded-lg hover:bg-[#000435]/5 text-[#000435]/40"><X size={18} /></button>
            </div>
            <div className="p-5 flex flex-wrap gap-2 max-h-64 overflow-y-auto">
              {(viewCourse.classes || []).length === 0 ? (
                <p className="text-sm text-[#000435]/35">Not assigned to any class yet.</p>
              ) : viewCourse.classes.map((c) => (
                <span key={c} className="px-2.5 py-1 rounded-lg bg-[#f59e0b]/10 text-[#000435] text-xs font-medium border border-[#f59e0b]/20">{c}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit course modal */}
      {(addCourseOpen || editCourse) && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#000435]/50 backdrop-blur-[2px]">
          <form onSubmit={editCourse ? handleEditCourse : handleAddCourse} className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-[#000435]/8">
            <div className="px-5 py-4 border-b border-[#000435]/8 flex justify-between items-center">
              <h3 className="text-sm font-semibold text-[#000435]">{editCourse ? 'Edit course' : 'Add course'}</h3>
              <button type="button" onClick={() => { setAddCourseOpen(false); setEditCourse(null); }} className="p-1 rounded-lg hover:bg-[#000435]/5 text-[#000435]/40"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-3">
              <input required value={courseForm.name} onChange={(e) => setCourseForm((f) => ({ ...f, name: e.target.value }))} placeholder="Course name" className="w-full h-10 rounded-xl border border-[#000435]/12 px-3 text-sm focus:ring-2 focus:ring-[#f59e0b]/25 focus:outline-none" />
              <input value={courseForm.category} onChange={(e) => setCourseForm((f) => ({ ...f, category: e.target.value }))} placeholder="Category" className="w-full h-10 rounded-xl border border-[#000435]/12 px-3 text-sm focus:ring-2 focus:ring-[#f59e0b]/25 focus:outline-none" />
              <input value={courseForm.subject_code} onChange={(e) => setCourseForm((f) => ({ ...f, subject_code: e.target.value }))} placeholder="Code" className="w-full h-10 rounded-xl border border-[#000435]/12 px-3 text-sm focus:ring-2 focus:ring-[#f59e0b]/25 focus:outline-none" />
              <button type="submit" disabled={saving} className="w-full h-10 rounded-xl bg-[#000435] text-white text-sm font-medium">{saving ? 'Saving…' : editCourse ? 'Update' : 'Add course'}</button>
            </div>
          </form>
        </div>
      )}
    </PageShell>
  );
}
