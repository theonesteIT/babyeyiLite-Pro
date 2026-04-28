import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  RefreshCw,
  UserPlus,
  BookMarked,
  CalendarClock,
  Trash2,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Pencil,
  Power,
  Eye,
  X,
} from 'lucide-react';
import api from '../services/api';
import { h } from '../utils/href';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const emptyTeacher = () => ({
  first_name: '',
  last_name: '',
  email: '',
  username: '',
  phone: '',
  staff_id: '',
});

const emptyCourse = () => ({
  name: '',
  category: '',
  subject_code: '',
});

const emptyPeriod = () => ({
  class_name: '',
  subject_name: '',
  staff_id: '',
  day_of_week: 'Monday',
  start_time: '08:00',
  end_time: '09:00',
  room: '',
});

export default function AcademicPlanning() {
  const [tab, setTab] = useState('teachers');
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState(null);

  const [staffList, setStaffList] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachingStaff, setTeachingStaff] = useState([]);
  const [classes, setClasses] = useState([]);
  const [timetable, setTimetable] = useState([]);

  const [teacherForm, setTeacherForm] = useState(() => emptyTeacher());
  const [courseForm, setCourseForm] = useState(() => emptyCourse());
  const [periodForm, setPeriodForm] = useState(() => emptyPeriod());
  const [viewTeacher, setViewTeacher] = useState(null);
  const [editTeacher, setEditTeacher] = useState(null);
  const [editTeacherForm, setEditTeacherForm] = useState(null);
  const [deleteTeacher, setDeleteTeacher] = useState(null);
  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const bannerTimer = useRef(null);

  const showBanner = (type, text) => {
    setBanner({ type, text });
    if (bannerTimer.current) window.clearTimeout(bannerTimer.current);
    bannerTimer.current = window.setTimeout(() => setBanner(null), 6000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let subjRes;
      try {
        subjRes = await api.get('/dos/subjects', { params: { include_inactive: '1' } });
      } catch (e) {
        if (e.response?.status === 403) {
          subjRes = await api.get('/dos/subjects');
        } else {
          subjRes = { data: { success: false } };
        }
      }

      const [staffRes, teachRes, clsRes, ttRes] = await Promise.all([
        api.get('/school/staff').catch(() => ({ data: { success: false } })),
        api.get('/dos/teaching-staff').catch(() => ({ data: { success: false } })),
        api.get('/teacher-portal/classes').catch(() => ({ data: { success: false } })),
        api.get('/teacher-portal/timetable').catch(() => ({ data: { success: false } })),
      ]);

      if (staffRes.data?.success) setStaffList(staffRes.data.data || []);
      if (subjRes.data?.success) setSubjects(subjRes.data.data || []);
      if (teachRes.data?.success) setTeachingStaff(teachRes.data.data || []);
      if (clsRes.data?.success) setClasses(clsRes.data.data || []);
      if (ttRes.data?.success) setTimetable(ttRes.data.data || []);
    } catch (e) {
      console.error(e);
      setBanner({
        type: 'err',
        text: e.response?.data?.message || 'Could not load academic data.',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submitTeacher = async (e) => {
    e.preventDefault();
    setBanner(null);
    try {
      const res = await api.post('/school/staff', {
        first_name: teacherForm.first_name.trim(),
        last_name: teacherForm.last_name.trim(),
        email: teacherForm.email.trim(),
        username: teacherForm.username.trim(),
        role_code: 'TEACHER',
        phone: teacherForm.phone.trim() || undefined,
        staff_id: teacherForm.staff_id.trim() || undefined,
      });
      if (res.data.success) {
        const sent = res.data.data?.password_sent_by_email;
        showBanner(
          'ok',
          sent
            ? 'Teacher account created. A temporary password was sent to their email.'
            : res.data.message || 'Teacher account created.'
        );
        setTeacherForm(emptyTeacher());
        setShowTeacherModal(false);
        load();
      }
    } catch (err) {
      const code = err.response?.data?.code;
      const field = err.response?.data?.field;
      const msg = err.response?.data?.message ||
        (code === 'PRO_REQUIRED'
          ? 'Staff accounts require a Pro school subscription.'
          : 'Could not create teacher.');
      if (field) {
        showBanner('err', `${msg} (Field: ${field})`);
      } else {
        showBanner('err', msg);
      }
    }
  };

  const patchTeacher = async (id, body) => {
    try {
      const res = await api.patch(`/school/staff/${id}`, body);
      if (res.data?.success) {
        showBanner('ok', res.data.message || 'Updated.');
        await load();
        return true;
      }
    } catch (err) {
      showBanner('err', err.response?.data?.message || 'Update failed.');
    }
    return false;
  };

  const saveTeacherEdit = async (e) => {
    e.preventDefault();
    if (!editTeacher || !editTeacherForm) return;
    const body = {
      first_name: editTeacherForm.first_name.trim(),
      last_name: editTeacherForm.last_name.trim(),
      phone: editTeacherForm.phone.trim() || null,
      email: editTeacherForm.email.trim(),
    };
    const nextPassword = (editTeacherForm.password || '').trim();
    if (nextPassword) body.password = nextPassword;
    const ok = await patchTeacher(editTeacher.id, {
      ...body,
    });
    if (ok) {
      setEditTeacher(null);
      setEditTeacherForm(null);
    }
  };

  const toggleTeacherActive = (row) => {
    patchTeacher(row.id, { is_active: !row.is_active });
  };

  const confirmDeleteTeacher = async () => {
    if (!deleteTeacher) return;
    try {
      const res = await api.delete(`/school/staff/${deleteTeacher.id}`);
      if (res.data?.success) {
        showBanner('ok', res.data.message || 'Account removed.');
        setDeleteTeacher(null);
        load();
      }
    } catch (err) {
      showBanner('err', err.response?.data?.message || 'Delete failed.');
    }
  };

  const submitCourse = async (e) => {
    e.preventDefault();
    setBanner(null);
    try {
      const res = await api.post('/dos/subjects', courseForm);
      if (res.data.success) {
        showBanner('ok', res.data.message || 'Subject added.');
        setCourseForm(emptyCourse());
        load();
      }
    } catch (err) {
      showBanner('err', err.response?.data?.message || 'Could not add subject.');
    }
  };

  const toggleSubject = async (id, currentlyActive) => {
    try {
      await api.patch(`/dos/subjects/${id}`, { is_active: !currentlyActive });
      showBanner('ok', 'Subject updated.');
      load();
    } catch (err) {
      showBanner('err', err.response?.data?.message || 'Update failed.');
    }
  };

  const submitPeriod = async (e) => {
    e.preventDefault();
    setBanner(null);
    try {
      const staffId = Number(periodForm.staff_id);
      const res = await api.post('/dos/timetable', {
        class_name: periodForm.class_name.trim(),
        subject_name: periodForm.subject_name.trim(),
        staff_id: staffId,
        day_of_week: periodForm.day_of_week,
        start_time: periodForm.start_time,
        end_time: periodForm.end_time,
        room: periodForm.room.trim() || null,
      });
      if (res.data.success) {
        showBanner('ok', res.data.message || 'Period added.');
        setPeriodForm(emptyPeriod());
        load();
      }
    } catch (err) {
      showBanner('err', err.response?.data?.message || 'Could not add period.');
    }
  };

  const deletePeriod = async (id) => {
    if (!window.confirm('Remove this period from the timetable?')) return;
    try {
      await api.delete(`/dos/timetable/${id}`);
      showBanner('ok', 'Period removed.');
      load();
    } catch (err) {
      showBanner('err', err.response?.data?.message || 'Delete failed.');
    }
  };

  const teachersOnly = staffList.filter((s) => String(s.role_code || '').toUpperCase() === 'TEACHER');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-re-bg">
        <RefreshCw className="animate-spin text-re-orange" />
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500 bg-re-bg min-h-screen pb-16">
      <div className="bg-white border-b border-black/5 px-5 md:px-8 py-6">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-re-text-muted opacity-60 mb-1">
          Academic office
        </p>
        <h1 className="text-xl md:text-2xl font-black text-re-text tracking-tight">Staff, courses & timetable</h1>
        <p className="text-xs text-re-text-muted font-bold mt-1 max-w-2xl">
          Create teacher logins, maintain the subject catalogue, and place class periods on the school timetable.
        </p>
      </div>

      <div className="max-w-[1100px] mx-auto px-4 md:px-8 py-6 space-y-5">
        {banner && (
          <div
            className={`flex items-start gap-2 rounded-2xl border px-4 py-3 text-sm font-bold ${
              banner.type === 'ok'
                ? 'bg-emerald-50 border-emerald-100 text-emerald-900'
                : 'bg-red-50 border-red-100 text-red-900'
            }`}
          >
            {banner.type === 'ok' ? (
              <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
            ) : (
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
            )}
            <span>{banner.text}</span>
          </div>
        )}

        <div className="flex flex-wrap gap-2 p-1 bg-white rounded-2xl border border-black/5 shadow-sm">
          {[
            { id: 'teachers', label: 'Teachers', Icon: UserPlus },
            { id: 'courses', label: 'Courses', Icon: BookMarked },
            { id: 'timetable', label: 'Timetable', Icon: CalendarClock },
          ].map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                tab === id
                  ? 'bg-re-grad-orange text-white shadow-md'
                  : 'text-re-text-muted hover:bg-re-bg'
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {tab === 'teachers' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] font-bold text-re-text-muted">
                Manage teacher accounts with a cleaner full-width view and mobile-friendly layout.
              </p>
              <button
                type="button"
                onClick={() => setShowTeacherModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-re-grad-orange text-white text-[10px] font-black uppercase tracking-widest shadow-md hover:opacity-95"
              >
                <UserPlus size={14} />
                Add teacher
              </button>
            </div>

            <div className="bg-white rounded-[24px] border border-black/5 shadow-sm p-4 sm:p-5 flex flex-col min-h-[320px]">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <h2 className="text-sm font-black text-re-text uppercase tracking-widest opacity-80">
                  Teachers ({teachersOnly.length})
                </h2>
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    to={h('/staff-smart-access')}
                    className="text-[9px] font-black uppercase tracking-widest text-re-orange hover:underline"
                  >
                    Photo / RFID
                  </Link>
                  <button
                    type="button"
                    onClick={load}
                    className="text-[9px] font-black uppercase tracking-widest text-re-orange"
                  >
                    Refresh
                  </button>
                </div>
              </div>
              <div className="hidden md:block overflow-x-auto rounded-xl border border-black/5 flex-1">
                <table className="w-full text-left text-[11px] min-w-[680px]">
                  <thead>
                    <tr className="text-re-text-muted font-black uppercase tracking-wider border-b border-black/5 bg-re-bg/50">
                      <th className="py-2.5 px-3">Teacher</th>
                      <th className="py-2.5 px-3">Username</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teachersOnly.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-8 px-3 text-re-text-muted font-bold">
                          No teacher accounts yet.
                        </td>
                      </tr>
                    )}
                    {teachersOnly.map((s) => {
                      const active = s.is_active === 1 || s.is_active === true;
                      return (
                        <tr key={s.id} className={`border-b border-black/5 ${active ? '' : 'opacity-60'} hover:bg-re-bg/40`}>
                          <td className="py-3 px-3 align-top">
                            <p className="font-black text-re-text text-[12px]">
                              {s.first_name} {s.last_name}
                            </p>
                            <p className="text-[10px] text-re-text-muted font-mono truncate max-w-[240px]">{s.email}</p>
                          </td>
                          <td className="py-3 px-3 align-top font-mono text-[10px] text-re-text-muted">
                            {s.username || '—'}
                          </td>
                          <td className="py-3 px-3 align-top">
                            <span
                              className={`inline-flex px-2.5 py-1 rounded-lg text-[9px] font-black uppercase ${
                                active ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="py-3 px-3 align-middle">
                            <div className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap min-w-[146px]">
                              <button
                                type="button"
                                title="View"
                                onClick={() => setViewTeacher(s)}
                                className="p-2 rounded-lg text-re-text-muted hover:bg-re-bg transition-colors"
                              >
                                <Eye size={14} />
                              </button>
                              <button
                                type="button"
                                title="Edit"
                                onClick={() => {
                                  setEditTeacher(s);
                                  setEditTeacherForm({
                                    first_name: s.first_name || '',
                                    last_name: s.last_name || '',
                                    phone: s.phone || '',
                                    email: s.email || '',
                                    password: '',
                                  });
                                }}
                                className="p-2 rounded-lg text-re-orange hover:bg-orange-50 transition-colors"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                type="button"
                                title={active ? 'Deactivate' : 'Activate'}
                                onClick={() => toggleTeacherActive(s)}
                                className={`p-2 rounded-lg transition-colors ${active ? 'text-amber-700 hover:bg-orange-50' : 'text-slate-400 hover:bg-re-bg'}`}
                              >
                                <Power size={14} />
                              </button>
                              <button
                                type="button"
                                title="Delete"
                                onClick={() => setDeleteTeacher(s)}
                                className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden space-y-2">
                {teachersOnly.length === 0 && (
                  <div className="rounded-xl border border-black/5 px-3 py-6 text-center text-re-text-muted font-bold text-sm">
                    No teacher accounts yet.
                  </div>
                )}
                {teachersOnly.map((s) => {
                  const active = s.is_active === 1 || s.is_active === true;
                  return (
                    <div key={s.id} className={`rounded-xl border border-black/5 p-3 ${active ? 'bg-white' : 'bg-slate-50'}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-black text-re-text text-sm truncate">
                            {s.first_name} {s.last_name}
                          </p>
                          <p className="text-[10px] text-re-text-muted font-mono truncate">{s.email}</p>
                          <p className="text-[10px] text-re-text-muted font-mono truncate mt-0.5">u: {s.username || '—'}</p>
                        </div>
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-lg text-[8px] font-black uppercase ${
                            active ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-end gap-1">
                        <button
                          type="button"
                          title="View"
                          onClick={() => setViewTeacher(s)}
                          className="p-1.5 rounded-lg text-re-text-muted hover:bg-re-bg"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          type="button"
                          title="Edit"
                          onClick={() => {
                            setEditTeacher(s);
                            setEditTeacherForm({
                              first_name: s.first_name || '',
                              last_name: s.last_name || '',
                              phone: s.phone || '',
                              email: s.email || '',
                              password: '',
                            });
                          }}
                          className="p-1.5 rounded-lg text-re-orange hover:bg-orange-50"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          title={active ? 'Deactivate' : 'Activate'}
                          onClick={() => toggleTeacherActive(s)}
                          className={`p-1.5 rounded-lg ${active ? 'text-amber-700 hover:bg-orange-50' : 'text-slate-400 hover:bg-re-bg'}`}
                        >
                          <Power size={14} />
                        </button>
                        <button
                          type="button"
                          title="Delete"
                          onClick={() => setDeleteTeacher(s)}
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-50"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {tab === 'courses' && (
          <div className="grid md:grid-cols-2 gap-5">
            <form
              onSubmit={submitCourse}
              className="bg-white rounded-[24px] border border-black/5 shadow-sm p-5 space-y-4"
            >
              <h2 className="text-sm font-black text-re-text uppercase tracking-widest opacity-80">Add subject</h2>
              <input
                required
                placeholder="Subject name (e.g. Mathematics)"
                className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm font-bold"
                value={courseForm.name}
                onChange={(e) => setCourseForm((f) => ({ ...f, name: e.target.value }))}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  placeholder="Category (optional)"
                  className="rounded-xl border border-black/10 px-3 py-2 text-sm font-bold"
                  value={courseForm.category}
                  onChange={(e) => setCourseForm((f) => ({ ...f, category: e.target.value }))}
                />
                <input
                  placeholder="Code (optional)"
                  className="rounded-xl border border-black/10 px-3 py-2 text-sm font-bold"
                  value={courseForm.subject_code}
                  onChange={(e) => setCourseForm((f) => ({ ...f, subject_code: e.target.value }))}
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-re-grad-orange text-white font-black text-[10px] uppercase tracking-widest shadow-md"
              >
                Save subject
              </button>
            </form>

            <div className="bg-white rounded-[24px] border border-black/5 shadow-sm p-5">
              <h2 className="text-sm font-black text-re-text uppercase tracking-widest opacity-80 mb-3">Catalogue</h2>
              <div className="max-h-[420px] overflow-y-auto space-y-2">
                {subjects.length === 0 && (
                  <p className="text-xs text-re-text-muted font-bold">No subjects yet.</p>
                )}
                {subjects.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between rounded-xl border border-black/5 px-3 py-2.5 gap-2"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-black text-re-text truncate">{sub.name}</p>
                      <p className="text-[9px] text-re-text-muted font-bold truncate">
                        {[sub.category, sub.subject_code].filter(Boolean).join(' · ') || '—'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleSubject(sub.id, sub.is_active === 1 || sub.is_active === true)}
                      className={`shrink-0 text-[8px] font-black uppercase tracking-wider px-2 py-1 rounded-lg border ${
                        sub.is_active
                          ? 'border-orange-200 text-re-orange hover:bg-orange-50'
                          : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                      }`}
                    >
                      {sub.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'timetable' && (
          <div className="space-y-5">
            <form
              onSubmit={submitPeriod}
              className="bg-white rounded-[24px] border border-black/5 shadow-sm p-5 space-y-4"
            >
              <h2 className="text-sm font-black text-re-text uppercase tracking-widest opacity-80">Add period</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-black uppercase text-re-text-muted mb-1">Class / group</label>
                  <input
                    required
                    list="class-options"
                    placeholder="e.g. S3 Science A"
                    className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm font-bold"
                    value={periodForm.class_name}
                    onChange={(e) => setPeriodForm((f) => ({ ...f, class_name: e.target.value }))}
                  />
                  <datalist id="class-options">
                    {classes.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-[9px] font-black uppercase text-re-text-muted mb-1">Subject</label>
                  <input
                    required
                    list="subject-options"
                    placeholder="Subject taught this period"
                    className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm font-bold"
                    value={periodForm.subject_name}
                    onChange={(e) => setPeriodForm((f) => ({ ...f, subject_name: e.target.value }))}
                  />
                  <datalist id="subject-options">
                    {subjects
                      .filter((s) => s.is_active === 1 || s.is_active === true)
                      .map((s) => (
                        <option key={s.id} value={s.name} />
                      ))}
                  </datalist>
                </div>
              </div>
              <div>
                <label className="block text-[9px] font-black uppercase text-re-text-muted mb-1">Teacher</label>
                <select
                  required
                  className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm font-bold bg-white"
                  value={periodForm.staff_id}
                  onChange={(e) => setPeriodForm((f) => ({ ...f, staff_id: e.target.value }))}
                >
                  <option value="">Select teacher</option>
                  {teachingStaff.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.first_name} {t.last_name} ({t.role_code})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[9px] font-black uppercase text-re-text-muted mb-1">Day</label>
                  <select
                    className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm font-bold bg-white"
                    value={periodForm.day_of_week}
                    onChange={(e) => setPeriodForm((f) => ({ ...f, day_of_week: e.target.value }))}
                  >
                    {DAYS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-black uppercase text-re-text-muted mb-1">Start</label>
                  <input
                    type="time"
                    required
                    className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm font-bold"
                    value={periodForm.start_time}
                    onChange={(e) => setPeriodForm((f) => ({ ...f, start_time: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black uppercase text-re-text-muted mb-1">End</label>
                  <input
                    type="time"
                    required
                    className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm font-bold"
                    value={periodForm.end_time}
                    onChange={(e) => setPeriodForm((f) => ({ ...f, end_time: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black uppercase text-re-text-muted mb-1">Room</label>
                  <input
                    placeholder="Optional"
                    className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm font-bold"
                    value={periodForm.room}
                    onChange={(e) => setPeriodForm((f) => ({ ...f, room: e.target.value }))}
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full md:w-auto px-8 py-3 rounded-xl bg-re-grad-orange text-white font-black text-[10px] uppercase tracking-widest shadow-md"
              >
                Add to timetable
              </button>
            </form>

            <div className="bg-white rounded-[24px] border border-black/5 shadow-sm p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <h2 className="text-sm font-black text-re-text uppercase tracking-widest opacity-80">
                  Scheduled periods ({timetable.length})
                </h2>
                <Link
                  to={h('/timetable')}
                  className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-re-orange hover:underline"
                >
                  Open full view <ArrowRight size={12} />
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[10px]">
                  <thead>
                    <tr className="text-re-text-muted font-black uppercase tracking-wider border-b border-black/5">
                      <th className="py-2 pr-2">Day</th>
                      <th className="py-2 pr-2">Time</th>
                      <th className="py-2 pr-2">Class</th>
                      <th className="py-2 pr-2">Subject</th>
                      <th className="py-2 pr-2">Teacher</th>
                      <th className="py-2 w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {timetable.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-6 text-re-text-muted font-bold">
                          No periods yet. Add one above.
                        </td>
                      </tr>
                    )}
                    {[...timetable]
                      .sort((a, b) => {
                        const da = DAYS.indexOf(a.day) - DAYS.indexOf(b.day);
                        if (da !== 0) return da;
                        return String(a.time || '').localeCompare(String(b.time || ''));
                      })
                      .map((row) => (
                        <tr key={row.id} className="border-b border-black/5 font-bold text-re-text">
                          <td className="py-2 pr-2 whitespace-nowrap">{row.day}</td>
                          <td className="py-2 pr-2 whitespace-nowrap">{row.time}</td>
                          <td className="py-2 pr-2">{row.group}</td>
                          <td className="py-2 pr-2">{row.subject}</td>
                          <td className="py-2 pr-2 text-[9px] text-re-text-muted">{row.teacher_name || '—'}</td>
                          <td className="py-2">
                            <button
                              type="button"
                              onClick={() => deletePeriod(row.id)}
                              className="p-1.5 rounded-lg text-red-500 hover:bg-red-50"
                              title="Remove"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {viewTeacher && (
        <div className="fixed inset-0 z-[4000] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl border border-black/5 p-6 space-y-3">
            <h3 className="text-sm font-black text-re-text uppercase tracking-widest">Teacher details</h3>
            <dl className="text-xs space-y-2 font-bold text-re-text">
              <div>
                <dt className="text-re-text-muted text-[9px] uppercase">Name</dt>
                <dd>
                  {viewTeacher.first_name} {viewTeacher.last_name}
                </dd>
              </div>
              <div>
                <dt className="text-re-text-muted text-[9px] uppercase">Email</dt>
                <dd className="font-mono break-all">{viewTeacher.email}</dd>
              </div>
              <div>
                <dt className="text-re-text-muted text-[9px] uppercase">Username</dt>
                <dd className="font-mono">{viewTeacher.username || '—'}</dd>
              </div>
              <div>
                <dt className="text-re-text-muted text-[9px] uppercase">Phone</dt>
                <dd>{viewTeacher.phone || '—'}</dd>
              </div>
              <div>
                <dt className="text-re-text-muted text-[9px] uppercase">Staff ID</dt>
                <dd className="font-mono">{viewTeacher.staff_id || '—'}</dd>
              </div>
            </dl>
            <button
              type="button"
              onClick={() => setViewTeacher(null)}
              className="w-full py-2.5 rounded-xl bg-re-bg text-re-text font-black text-[10px] uppercase tracking-widest"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {showTeacherModal && (
        <div className="fixed inset-0 z-[4000] flex items-center justify-center bg-black/50 p-3 sm:p-4">
          <form
            onSubmit={submitTeacher}
            className="w-full max-w-2xl bg-white rounded-3xl border border-black/5 shadow-2xl overflow-hidden"
          >
            <div className="px-4 sm:px-5 py-4 border-b border-black/5 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-re-text uppercase tracking-widest opacity-90">New teacher account</h3>
                <p className="text-[10px] text-re-text-muted font-bold mt-1">
                  Creates a Teacher login and sends a temporary password by email.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowTeacherModal(false)}
                className="p-2 rounded-lg text-re-text-muted hover:bg-re-bg"
                aria-label="Close teacher form"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-4 max-h-[78vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  required
                  placeholder="First name"
                  className="rounded-xl border border-black/10 px-3 py-2.5 text-sm font-bold"
                  value={teacherForm.first_name}
                  onChange={(e) => setTeacherForm((f) => ({ ...f, first_name: e.target.value }))}
                />
                <input
                  required
                  placeholder="Last name"
                  className="rounded-xl border border-black/10 px-3 py-2.5 text-sm font-bold"
                  value={teacherForm.last_name}
                  onChange={(e) => setTeacherForm((f) => ({ ...f, last_name: e.target.value }))}
                />
              </div>
              <input
                required
                type="email"
                placeholder="Work email (receives temporary password)"
                className="w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm font-bold"
                value={teacherForm.email}
                onChange={(e) => setTeacherForm((f) => ({ ...f, email: e.target.value }))}
              />
              <input
                required
                minLength={3}
                placeholder="Username (login)"
                className="w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm font-bold font-mono"
                value={teacherForm.username}
                onChange={(e) => setTeacherForm((f) => ({ ...f, username: e.target.value }))}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  placeholder="Phone (optional)"
                  className="rounded-xl border border-black/10 px-3 py-2.5 text-sm font-bold"
                  value={teacherForm.phone}
                  onChange={(e) => setTeacherForm((f) => ({ ...f, phone: e.target.value }))}
                />
                <input
                  placeholder="Staff ID label (optional)"
                  className="rounded-xl border border-black/10 px-3 py-2.5 text-sm font-bold"
                  value={teacherForm.staff_id}
                  onChange={(e) => setTeacherForm((f) => ({ ...f, staff_id: e.target.value }))}
                />
              </div>
            </div>

            <div className="px-4 sm:px-5 py-4 border-t border-black/5 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 bg-white">
              <button
                type="button"
                onClick={() => setShowTeacherModal(false)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-sm font-bold text-re-text-muted hover:bg-re-bg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-re-grad-orange text-white font-black text-[11px] uppercase tracking-widest shadow-md hover:opacity-95"
              >
                Create teacher
              </button>
            </div>
          </form>
        </div>
      )}

      {editTeacher && editTeacherForm && (
        <div className="fixed inset-0 z-[4000] flex items-center justify-center bg-black/50 p-4">
          <form onSubmit={saveTeacherEdit} className="w-full max-w-md rounded-2xl bg-white shadow-xl border border-black/5 p-6 space-y-4">
            <h3 className="text-sm font-black text-re-text uppercase tracking-widest">Edit teacher</h3>
            <p className="text-[10px] text-re-text-muted font-bold font-mono break-all">{editTeacher.email}</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[9px] font-black uppercase text-re-text-muted mb-1">First name</label>
                <input
                  required
                  className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm font-bold"
                  value={editTeacherForm.first_name}
                  onChange={(e) => setEditTeacherForm((f) => ({ ...f, first_name: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-[9px] font-black uppercase text-re-text-muted mb-1">Last name</label>
                <input
                  required
                  className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm font-bold"
                  value={editTeacherForm.last_name}
                  onChange={(e) => setEditTeacherForm((f) => ({ ...f, last_name: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="block text-[9px] font-black uppercase text-re-text-muted mb-1">Email</label>
              <input
                required
                type="email"
                className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm font-bold"
                value={editTeacherForm.email}
                onChange={(e) => setEditTeacherForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-[9px] font-black uppercase text-re-text-muted mb-1">Phone</label>
              <input
                className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm font-bold"
                value={editTeacherForm.phone}
                onChange={(e) => setEditTeacherForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-[9px] font-black uppercase text-re-text-muted mb-1">New password (optional)</label>
              <input
                type="password"
                minLength={8}
                placeholder="Leave blank to keep current password"
                className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm font-bold"
                value={editTeacherForm.password}
                onChange={(e) => setEditTeacherForm((f) => ({ ...f, password: e.target.value }))}
              />
            </div>
            <div className="pt-1">
              <button
                type="button"
                onClick={() => {
                  patchTeacher(editTeacher.id, { is_active: !(editTeacher.is_active === 1 || editTeacher.is_active === true) });
                  setEditTeacher((prev) =>
                    prev ? { ...prev, is_active: prev.is_active === 1 || prev.is_active === true ? 0 : 1 } : prev
                  );
                }}
                className={`w-full py-2.5 rounded-xl text-sm font-black ${
                  editTeacher.is_active === 1 || editTeacher.is_active === true
                    ? 'bg-amber-50 text-amber-800 border border-amber-200'
                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                }`}
              >
                {editTeacher.is_active === 1 || editTeacher.is_active === true ? 'Deactivate teacher' : 'Activate teacher'}
              </button>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                className="px-4 py-2 rounded-xl text-sm font-bold text-re-text-muted"
                onClick={() => {
                  setEditTeacher(null);
                  setEditTeacherForm(null);
                }}
              >
                Cancel
              </button>
              <button type="submit" className="px-5 py-2 rounded-xl bg-re-grad-orange text-white text-sm font-black">
                Save
              </button>
            </div>
          </form>
        </div>
      )}

      {deleteTeacher && (
        <div className="fixed inset-0 z-[4000] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl border border-red-100 p-6 space-y-4">
            <p className="text-sm font-black text-re-text">Remove this teacher account?</p>
            <p className="text-xs text-re-text-muted font-bold">
              {deleteTeacher.first_name} {deleteTeacher.last_name} — they will no longer be able to sign in.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                className="px-4 py-2 rounded-xl text-sm font-bold text-re-text-muted"
                onClick={() => setDeleteTeacher(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-black"
                onClick={confirmDeleteTeacher}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
