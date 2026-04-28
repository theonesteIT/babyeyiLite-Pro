import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ChevronLeft, ChevronRight, History, Loader2, RotateCcw, Search, ShieldAlert, UserCircle2 } from 'lucide-react';
import disciplineService from '../services/disciplineService';

const REASON_PRESETS = [
  'Late to class',
  'Absence',
  'Fighting',
  'Disrespect',
  'Uniform violation',
  'Other',
];

const MAX_MARKS = 100;

function Toast({ toast }) {
  if (!toast.message) return null;
  const isError = toast.type === 'error';
  return (
    <div className={`fixed top-4 right-4 z-[350] px-4 py-3 rounded-xl text-sm font-bold text-white shadow-2xl ${isError ? 'bg-red-600' : 'bg-emerald-600'}`}>
      {toast.message}
    </div>
  );
}

export default function SetDisciplineMarks() {
  const [query, setQuery] = useState('');
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [history, setHistory] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [saving, setSaving] = useState(false);
  const [undoing, setUndoing] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [meta, setMeta] = useState({ page: 1, limit: 15, total: 0, total_pages: 1 });
  const [toast, setToast] = useState({ type: '', message: '' });

  const [form, setForm] = useState({
    action: 'remove',
    marks: '5',
    reason: 'Late to class',
    customReason: '',
    notes: '',
    date: new Date().toISOString().slice(0, 10),
  });

  const notify = (type, message) => {
    setToast({ type, message });
    clearTimeout(window.__disciplineMarksToast);
    window.__disciplineMarksToast = setTimeout(() => setToast({ type: '', message: '' }), 3000);
  };

  const fetchStudents = async (targetPage = page, targetLimit = limit) => {
    setLoadingStudents(true);
    try {
      const res = await disciplineService.searchStudents(query, targetPage, targetLimit);
      const data = Array.isArray(res.data?.data) ? res.data.data : [];
      const m = res.data?.meta || {};
      setStudents(data);
      setMeta({
        page: Number(m.page || targetPage || 1),
        limit: Number(m.limit || targetLimit || 15),
        total: Number(m.total || 0),
        total_pages: Math.max(1, Number(m.total_pages || 1)),
      });
    } catch {
      setStudents([]);
      setMeta((prev) => ({ ...prev, total: 0, total_pages: 1 }));
    } finally {
      setLoadingStudents(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      fetchStudents(1, limit);
    }, 250);
    return () => clearTimeout(t);
  }, [query, limit]);

  useEffect(() => {
    fetchStudents(page, limit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const fetchHistory = async (studentId) => {
    if (!studentId) return;
    setLoadingHistory(true);
    try {
      const res = await disciplineService.getStudentLogs(studentId);
      setHistory(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch {
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const openStudentDrawer = (student) => {
    setSelectedStudent(student);
    setForm((prev) => ({ ...prev, date: new Date().toISOString().slice(0, 10) }));
    setDrawerOpen(true);
    fetchHistory(student.id);
  };

  const closeDrawer = () => setDrawerOpen(false);

  const marksValue = Number(form.marks);
  const reasonValue = form.reason === 'Other' ? form.customReason.trim() : form.reason;
  const currentMarks = Number(selectedStudent?.discipline_marks || 0);
  const nextMarks = form.action === 'add' ? currentMarks + marksValue : currentMarks - marksValue;
  const validMarks = Number.isFinite(marksValue) && marksValue > 0;
  const validReason = reasonValue.length > 0;
  const withinLimits = Number.isFinite(nextMarks) && nextMarks >= 0 && nextMarks <= MAX_MARKS;
  const canSubmit = validMarks && validReason && withinLimits;

  const saveAction = async () => {
    if (!selectedStudent) return;
    if (!canSubmit) {
      if (!withinLimits) notify('error', `Resulting marks must remain between 0 and ${MAX_MARKS}.`);
      else notify('error', 'Please complete required fields before saving.');
      return;
    }

    setSaving(true);
    try {
      await disciplineService.applyStudentMarks(selectedStudent.id, {
        action: form.action,
        marks: marksValue,
        reason: reasonValue,
        date: form.date,
        notes: form.notes?.trim() || null,
      });

      const updated = students.map((s) => (s.id === selectedStudent.id ? { ...s, discipline_marks: nextMarks } : s));
      setStudents(updated);
      setSelectedStudent((prev) => (prev ? { ...prev, discipline_marks: nextMarks } : prev));
      notify('success', 'Marks updated successfully.');
      fetchHistory(selectedStudent.id);
    } catch (e) {
      notify('error', e.response?.data?.message || 'Failed to update marks.');
    } finally {
      setSaving(false);
    }
  };

  const undoLastAction = async () => {
    if (!selectedStudent || history.length === 0) return;
    setUndoing(true);
    try {
      await disciplineService.undoLastAction(selectedStudent.id);
      await fetchHistory(selectedStudent.id);
      await fetchStudents(page, limit);
      const current = students.find((s) => s.id === selectedStudent.id);
      if (current) setSelectedStudent(current);
      notify('success', 'Last action reverted successfully.');
    } catch (e) {
      notify('error', e.response?.data?.message || 'Could not undo the last action.');
    } finally {
      setUndoing(false);
    }
  };

  const summary = useMemo(() => {
    return history.reduce(
      (acc, row) => {
        const marks = Number(row.marks || 0);
        if (row.action === 'add') acc.added += marks;
        if (row.action === 'remove') acc.removed += marks;
        return acc;
      },
      { added: 0, removed: 0 }
    );
  }, [history]);

  return (
    <div className="min-h-screen bg-re-bg p-4 md:p-6">
      <Toast toast={toast} />

      {drawerOpen && selectedStudent && (
        <div className="fixed inset-0 z-[300]">
          <div className="absolute inset-0 bg-black/50" onClick={closeDrawer} />
          <aside className="absolute top-0 right-0 h-full w-full max-w-2xl bg-white shadow-2xl border-l border-black/10 overflow-y-auto">
            <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-black/10 px-5 py-4 flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                  <UserCircle2 size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-re-text-muted">Student details</p>
                  <h3 className="text-base font-black text-re-text">{selectedStudent.name}</h3>
                  <p className="text-xs text-re-text-muted">
                    {selectedStudent.code || selectedStudent.student_code || `ST-${selectedStudent.id}`} • {selectedStudent.class_name || 'No class'} • Current marks: {currentMarks}
                  </p>
                </div>
              </div>
              <button type="button" onClick={closeDrawer} className="h-9 px-3 rounded-lg border border-black/10 text-xs font-black uppercase tracking-widest">
                Close
              </button>
            </div>

            <div className="p-5 space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Marks added</p>
                  <p className="text-xl font-black text-emerald-700 mt-1">{summary.added}</p>
                </div>
                <div className="rounded-xl bg-red-50 border border-red-200 p-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-red-700">Marks removed</p>
                  <p className="text-xl font-black text-red-700 mt-1">{summary.removed}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-black/10 p-4 space-y-4">
                <label className="space-y-1.5 block">
                  <span className="text-[11px] font-black uppercase tracking-widest text-re-text-muted">Action type</span>
                  <select
                    value={form.action}
                    onChange={(e) => setForm((prev) => ({ ...prev, action: e.target.value }))}
                    className="w-full h-11 rounded-xl border border-black/10 bg-re-bg/30 px-4 text-sm font-semibold"
                  >
                    <option value="add">Add Marks</option>
                    <option value="remove">Remove Marks</option>
                  </select>
                </label>

                <label className="space-y-1.5 block">
                  <span className="text-[11px] font-black uppercase tracking-widest text-re-text-muted">Marks</span>
                  <input
                    type="number"
                    min="1"
                    value={form.marks}
                    onChange={(e) => setForm((prev) => ({ ...prev, marks: e.target.value }))}
                    className="w-full h-11 rounded-xl border border-black/10 bg-re-bg/30 px-4 text-sm font-semibold"
                  />
                </label>

                <label className="space-y-1.5 block">
                  <span className="text-[11px] font-black uppercase tracking-widest text-re-text-muted">Reason (required)</span>
                  <select
                    value={form.reason}
                    onChange={(e) => setForm((prev) => ({ ...prev, reason: e.target.value }))}
                    className="w-full h-11 rounded-xl border border-black/10 bg-re-bg/30 px-4 text-sm font-semibold"
                  >
                    {REASON_PRESETS.map((reason) => (
                      <option key={reason} value={reason}>
                        {reason}
                      </option>
                    ))}
                  </select>
                </label>

                {form.reason === 'Other' && (
                  <label className="space-y-1.5 block">
                    <span className="text-[11px] font-black uppercase tracking-widest text-re-text-muted">Custom reason</span>
                    <input
                      type="text"
                      value={form.customReason}
                      onChange={(e) => setForm((prev) => ({ ...prev, customReason: e.target.value }))}
                      className="w-full h-11 rounded-xl border border-black/10 bg-re-bg/30 px-4 text-sm font-semibold"
                    />
                  </label>
                )}

                <label className="space-y-1.5 block">
                  <span className="text-[11px] font-black uppercase tracking-widest text-re-text-muted">Date</span>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
                    className="w-full h-11 rounded-xl border border-black/10 bg-re-bg/30 px-4 text-sm font-semibold"
                  />
                </label>

                <label className="space-y-1.5 block">
                  <span className="text-[11px] font-black uppercase tracking-widest text-re-text-muted">Notes (optional)</span>
                  <textarea
                    rows={3}
                    value={form.notes}
                    onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                    className="w-full rounded-xl border border-black/10 bg-re-bg/30 px-4 py-2 text-sm font-semibold resize-none"
                  />
                </label>

                <div className={`rounded-xl border px-3 py-2 text-sm font-bold ${form.action === 'add' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
                  New marks preview: {currentMarks} {form.action === 'add' ? '+' : '-'} {Number.isFinite(marksValue) ? marksValue : 0} = {Number.isFinite(nextMarks) ? nextMarks : '—'}
                </div>

                {!withinLimits && (
                  <p className="text-xs font-bold text-red-600">Result must stay between 0 and {MAX_MARKS}.</p>
                )}

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={saveAction}
                    disabled={!canSubmit || saving}
                    className={`h-10 px-4 rounded-xl text-white text-xs font-black uppercase tracking-widest inline-flex items-center gap-2 disabled:opacity-60 ${
                      form.action === 'add' ? 'bg-emerald-600' : 'bg-red-600'
                    }`}
                  >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    Save action
                  </button>
                  <button
                    type="button"
                    onClick={undoLastAction}
                    disabled={undoing || history.length === 0}
                    className="h-10 px-4 rounded-xl border border-black/10 text-xs font-black uppercase tracking-widest inline-flex items-center gap-2 disabled:opacity-60"
                  >
                    {undoing ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                    Undo last action
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-black/10 overflow-hidden">
                <div className="px-4 py-3 border-b border-black/10 bg-white flex items-center gap-2">
                  <History size={14} className="text-re-text-muted" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-re-text-muted">Student discipline history</p>
                </div>
                <div className="max-h-[420px] overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-re-bg/30 text-[10px] uppercase tracking-widest text-re-text-muted">
                      <tr>
                        <th className="px-3 py-2 text-left">Date</th>
                        <th className="px-3 py-2 text-left">Action</th>
                        <th className="px-3 py-2 text-left">Marks</th>
                        <th className="px-3 py-2 text-left">Reason</th>
                        <th className="px-3 py-2 text-left">By</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingHistory ? (
                        <tr>
                          <td className="px-3 py-6 text-center text-re-text-muted" colSpan={5}>
                            <Loader2 size={16} className="animate-spin mx-auto mb-2" />
                            Loading history...
                          </td>
                        </tr>
                      ) : history.length === 0 ? (
                        <tr>
                          <td className="px-3 py-6 text-center text-re-text-muted" colSpan={5}>
                            No logs yet.
                          </td>
                        </tr>
                      ) : (
                        history.map((row) => (
                          <tr key={row.id} className="border-t border-black/5">
                            <td className="px-3 py-2 text-xs font-semibold">
                              {row.action_date ? new Date(row.action_date).toLocaleDateString() : row.created_at ? new Date(row.created_at).toLocaleDateString() : '—'}
                            </td>
                            <td className="px-3 py-2">
                              <span className={`inline-flex px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${row.action === 'add' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                {row.action}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-xs font-black">{row.marks}</td>
                            <td className="px-3 py-2 text-xs">{row.reason || '—'}</td>
                            <td className="px-3 py-2 text-xs">{row.created_by || '—'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}

      <div className="max-w-6xl mx-auto space-y-5">
        <div className="rounded-2xl bg-white border border-black/5 p-5 md:p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
              <ShieldAlert size={18} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-re-text-muted">Operations</p>
              <h1 className="text-lg md:text-xl font-black text-re-text">Set Discipline Marks</h1>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-black/5 p-4 shadow-sm">
          <label className="relative block">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-re-text-muted" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by student code or name"
              className="w-full h-11 rounded-xl border border-black/10 bg-re-bg/20 pl-10 pr-4 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </label>
        </div>

        <div className="rounded-2xl bg-white border border-black/5 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-re-bg/30 text-[10px] uppercase tracking-widest text-re-text-muted">
                <tr>
                  <th className="px-4 py-3 text-left">Code</th>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Class</th>
                  <th className="px-4 py-3 text-left">Current Marks</th>
                  <th className="px-4 py-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody>
                {loadingStudents ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-re-text-muted">
                      <Loader2 size={18} className="animate-spin mx-auto mb-2" />
                      Loading students...
                    </td>
                  </tr>
                ) : students.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-re-text-muted">No students found.</td>
                  </tr>
                ) : (
                  students.map((student) => (
                    <tr key={student.id} className="border-t border-black/5">
                      <td className="px-4 py-3 text-xs font-black">{student.code || student.student_code || `ST-${student.id}`}</td>
                      <td className="px-4 py-3 text-sm font-semibold">{student.name}</td>
                      <td className="px-4 py-3 text-sm">{student.class_name || student.class || '—'}</td>
                      <td className="px-4 py-3 text-sm font-black">{student.discipline_marks ?? 0}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => openStudentDrawer(student)}
                          className="h-9 px-3 rounded-lg bg-[#000435] text-white text-[10px] font-black uppercase tracking-widest"
                        >
                          Open
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="border-t border-black/10 px-4 py-3 bg-re-bg/20 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-semibold text-re-text-muted">
              Showing page {meta.page} of {meta.total_pages} • {meta.total} students
            </p>
            <div className="flex items-center gap-2">
              <select
                value={limit}
                onChange={(e) => {
                  const next = Number(e.target.value);
                  setLimit(next);
                  setPage(1);
                }}
                className="h-9 rounded-lg border border-black/10 bg-white px-2 text-xs font-semibold"
              >
                <option value={10}>10 / page</option>
                <option value={15}>15 / page</option>
                <option value={25}>25 / page</option>
                <option value={50}>50 / page</option>
              </select>
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={meta.page <= 1}
                className="h-9 px-3 rounded-lg border border-black/10 text-xs font-black uppercase tracking-widest inline-flex items-center gap-1 disabled:opacity-50"
              >
                <ChevronLeft size={14} />
                Prev
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(meta.total_pages, p + 1))}
                disabled={meta.page >= meta.total_pages}
                className="h-9 px-3 rounded-lg border border-black/10 text-xs font-black uppercase tracking-widest inline-flex items-center gap-1 disabled:opacity-50"
              >
                Next
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
