import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { jsPDF } from 'jspdf';
import { AlertCircle, BookPlus, Calendar, CheckCircle2, Download, Edit3, Image as ImageIcon, Loader2, Plus, Search, Trash2, X } from 'lucide-react';
import api from '../services/api';
import DosOchreHero from '../components/DosOchreHero';

const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const ALL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const emptyTimetableForm = {
  class_name: '',
  subject_name: '',
  staff_id: '',
  day_of_week: 'Monday',
  start_time: '08:00',
  end_time: '09:00',
  room: '',
  term: '',
  academic_year: '',
};
const emptyCourseForm = { name: '', category: '', subject_code: '' };
const emptyPeriodForm = { period_name: '', start_time: '08:00', end_time: '08:50', is_break: false, sort_order: 0 };

const classLabelFromRow = (row) => {
  const g = String(row?.group_name || '').trim();
  const s = String(row?.stream_name || '').trim();
  const c = String(row?.combination || '').trim();
  return [g, s, c].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
};

const isBreakPeriod = (period) => {
  const name = String(period?.period_name || '').toLowerCase();
  return Boolean(period?.is_break) || name.includes('break') || name.includes('lunch') || name.includes('free');
};

const normalizeTime = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const parts = raw.split(':');
  if (parts.length < 2) return raw;
  const h = parts[0].padStart(2, '0');
  const m = parts[1].padStart(2, '0');
  return `${h}:${m}`;
};

const SUBJECT_PALETTES = [
  { bg: '#fff1f2', border: '#fecdd3', title: '#9f1239', meta: '#881337' },
  { bg: '#eff6ff', border: '#bfdbfe', title: '#1d4ed8', meta: '#1e40af' },
  { bg: '#ecfdf5', border: '#bbf7d0', title: '#047857', meta: '#065f46' },
  { bg: '#fff7ed', border: '#fed7aa', title: '#c2410c', meta: '#9a3412' },
  { bg: '#f5f3ff', border: '#ddd6fe', title: '#6d28d9', meta: '#5b21b6' },
  { bg: '#f0fdfa', border: '#99f6e4', title: '#0f766e', meta: '#115e59' },
  { bg: '#fefce8', border: '#fde68a', title: '#a16207', meta: '#854d0e' },
  { bg: '#eef2ff', border: '#c7d2fe', title: '#3730a3', meta: '#312e81' },
];

const paletteForSubject = (subject = '') => {
  const value = String(subject || '').trim().toLowerCase();
  if (!value) return SUBJECT_PALETTES[0];
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  return SUBJECT_PALETTES[hash % SUBJECT_PALETTES.length];
};

// ─── Utility: strip modern CSS color functions that html2canvas cannot parse ───
// Tailwind v3 emits oklch()/oklab() inside <style> tags and CSS custom properties.
// html2canvas throws "unsupported color function" and produces blank output.
// This helper rewrites those values to safe hex equivalents before capture.
const stripModernColors = (cssText) =>
  cssText.replace(/\b(?:oklab|oklch)\([^)]*\)/gi, '#888');

export default function Timetable() {
  const exportRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [notice, setNotice] = useState(null);
  const [academicSettings, setAcademicSettings] = useState({
    current_academic_year: '2025-2026',
    active_terms: ['Term 1', 'Term 2', 'Term 3'],
  });

  const [showTimetableModal, setShowTimetableModal] = useState(false);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [editingRow, setEditingRow] = useState(null);

  const [filters, setFilters] = useState({ class_name: '', staff_id: '', subject_name: '', day_of_week: '', q: '' });
  const [timetableForm, setTimetableForm] = useState(emptyTimetableForm);
  const [courseForm, setCourseForm] = useState(emptyCourseForm);
  const [periodForm, setPeriodForm] = useState(emptyPeriodForm);

  const classOptions = useMemo(() => {
    const fromRegistry = classes.map(classLabelFromRow).filter(Boolean);
    const fromRows = rows.map((x) => String(x.class_name || '').trim()).filter(Boolean);
    return Array.from(new Set([...fromRegistry, ...fromRows])).sort((a, b) => a.localeCompare(b));
  }, [classes, rows]);

  const sortedPeriods = useMemo(() => {
    return [...periods].sort((a, b) => {
      const d = Number(a.sort_order || 0) - Number(b.sort_order || 0);
      if (d !== 0) return d;
      return String(a.start_time || '').localeCompare(String(b.start_time || ''));
    });
  }, [periods]);

  const displayPeriods = useMemo(() => {
    const map = new Map();
    for (const p of sortedPeriods) {
      const key = normalizeTime(p.start_time);
      if (!key) continue;
      map.set(key, { ...p, start_time: key, end_time: normalizeTime(p.end_time) || p.end_time });
    }
    for (const row of rows) {
      const key = normalizeTime(row.start_time);
      if (!key || map.has(key)) continue;
      map.set(key, {
        id: `auto-${key}`,
        period_name: `Period ${key}`,
        start_time: key,
        end_time: normalizeTime(row.end_time) || row.end_time || '',
        is_break: false,
        sort_order: 999,
      });
    }
    return [...map.values()].sort((a, b) => normalizeTime(a.start_time).localeCompare(normalizeTime(b.start_time)));
  }, [sortedPeriods, rows]);

  const lessonMap = useMemo(() => {
    const m = new Map();
    for (const row of rows) {
      const key = `${row.day_of_week}__${normalizeTime(row.start_time)}`;
      const current = m.get(key) || [];
      current.push(row);
      m.set(key, current);
    }
    return m;
  }, [rows]);

  const legendSubjects = useMemo(() => {
    const names = Array.from(new Set(rows.map((row) => String(row.subject_name || '').trim()).filter(Boolean)));
    return names.sort((a, b) => a.localeCompare(b)).slice(0, 12);
  }, [rows]);

  const fetchMeta = async () => {
    const [teachersRes, subjectsRes, classesRes, periodsRes, settingsRes] = await Promise.all([
      api.get('/dos/teaching-staff').catch(() => ({ data: { success: false } })),
      api.get('/dos/subjects', { params: { include_inactive: 1 } }).catch(() => ({ data: { success: false } })),
      api.get('/dos/registry/classes').catch(() => ({ data: { success: false } })),
      api.get('/dos/calendar/periods').catch(() => ({ data: { success: false } })),
      api.get('/dos/academic-calendar-settings').catch(() => ({ data: { success: false } })),
    ]);
    if (teachersRes.data?.success) setTeachers(teachersRes.data.data || []);
    if (subjectsRes.data?.success) setSubjects((subjectsRes.data.data || []).filter((x) => x.is_active !== 0));
    if (classesRes.data?.success) setClasses(classesRes.data.data || []);
    if (periodsRes.data?.success) setPeriods(periodsRes.data.data || []);
    if (settingsRes.data?.success) {
      setAcademicSettings(settingsRes.data.data || academicSettings);
    }
  };

  const fetchRows = async () => {
    const params = {};
    if (filters.class_name) params.class_name = filters.class_name;
    if (filters.staff_id) params.staff_id = filters.staff_id;
    if (filters.subject_name) params.subject_name = filters.subject_name;
    if (filters.day_of_week) params.day_of_week = filters.day_of_week;
    if (filters.q.trim()) params.q = filters.q.trim();
    const res = await api.get('/dos/timetable', { params });
    setRows(res.data?.success ? res.data.data || [] : []);
  };

  useEffect(() => {
    const boot = async () => {
      setLoading(true);
      try {
        await Promise.all([fetchMeta(), fetchRows()]);
      } catch (err) {
        setNotice({ type: 'error', text: err.response?.data?.message || 'Failed to load timetable data.' });
      } finally {
        setLoading(false);
      }
    };
    boot();
  }, []);

  useEffect(() => {
    fetchRows().catch((err) => setNotice({ type: 'error', text: err.response?.data?.message || 'Failed to apply filters.' }));
  }, [filters.class_name, filters.staff_id, filters.subject_name, filters.day_of_week, filters.q]);

  const openCreateTimetable = (day = 'Monday', start = '08:00', end = '09:00') => {
    setEditingRow(null);
    setTimetableForm({
      ...emptyTimetableForm,
      day_of_week: day,
      start_time: start,
      end_time: end,
      term: academicSettings.active_terms?.[0] || 'Term 1',
      academic_year: academicSettings.current_academic_year || '2025-2026',
    });
    setShowTimetableModal(true);
  };

  const openEditTimetable = (row) => {
    setEditingRow(row);
    setTimetableForm({
      class_name: row.class_name || '',
      subject_name: row.subject_name || '',
      staff_id: String(row.staff_id || ''),
      day_of_week: row.day_of_week || 'Monday',
      start_time: row.start_time || '08:00',
      end_time: row.end_time || '09:00',
      room: row.room || '',
      term: row.term || academicSettings.active_terms?.[0] || 'Term 1',
      academic_year: row.academic_year || academicSettings.current_academic_year || '2025-2026',
    });
    setShowTimetableModal(true);
  };

  const submitTimetable = async (e) => {
    e.preventDefault();
    setSaving(true);
    setNotice(null);
    try {
      const payload = {
        class_name: timetableForm.class_name.trim(),
        subject_name: timetableForm.subject_name.trim(),
        staff_id: Number(timetableForm.staff_id),
        day_of_week: timetableForm.day_of_week,
        start_time: timetableForm.start_time,
        end_time: timetableForm.end_time,
        room: timetableForm.room.trim() || null,
        term: timetableForm.term,
        academic_year: timetableForm.academic_year,
      };
      if (editingRow?.id) {
        await api.put(`/dos/timetable/${editingRow.id}`, payload);
        setNotice({ type: 'success', text: 'Timetable updated successfully.' });
      } else {
        await api.post('/dos/timetable', payload);
        setNotice({ type: 'success', text: 'Timetable period created successfully.' });
      }
      setShowTimetableModal(false);
      await fetchRows();
    } catch (err) {
      setNotice({ type: 'error', text: err.response?.data?.message || 'Failed to save timetable period.' });
    } finally {
      setSaving(false);
    }
  };

  const submitCourse = async (e) => {
    e.preventDefault();
    setSaving(true);
    setNotice(null);
    try {
      const res = await api.post('/dos/subjects', {
        name: courseForm.name.trim(),
        category: courseForm.category.trim() || null,
        subject_code: courseForm.subject_code.trim() || null,
      });
      const createdName = res?.data?.data?.name || courseForm.name.trim();
      setNotice({ type: 'success', text: `Course "${createdName}" created. Assign it to a timetable slot.` });
      setCourseForm(emptyCourseForm);
      setShowCourseModal(false);
      await fetchMeta();
      setEditingRow(null);
      setTimetableForm((prev) => ({ ...prev, subject_name: createdName }));
      setShowTimetableModal(true);
    } catch (err) {
      setNotice({ type: 'error', text: err.response?.data?.message || 'Failed to create course.' });
    } finally {
      setSaving(false);
    }
  };

  const submitPeriod = async (e) => {
    e.preventDefault();
    setSaving(true);
    setNotice(null);
    try {
      await api.post('/dos/calendar/periods', {
        period_name: periodForm.period_name.trim(),
        start_time: periodForm.start_time,
        end_time: periodForm.end_time,
        is_break: periodForm.is_break,
        sort_order: Number(periodForm.sort_order) || 0,
      });
      setNotice({ type: 'success', text: 'Period setup saved.' });
      setPeriodForm(emptyPeriodForm);
      setShowPeriodModal(false);
      await fetchMeta();
    } catch (err) {
      setNotice({ type: 'error', text: err.response?.data?.message || 'Failed to save period setup.' });
    } finally {
      setSaving(false);
    }
  };

  const deleteTimetableRow = async (id) => {
    if (!window.confirm('Delete this timetable period?')) return;
    try {
      await api.delete(`/dos/timetable/${id}`);
      setNotice({ type: 'success', text: 'Timetable period deleted.' });
      await fetchRows();
    } catch (err) {
      setNotice({ type: 'error', text: err.response?.data?.message || 'Failed to delete period.' });
    }
  };

  const renderToCanvas = useCallback(async () => {
    const node = exportRef.current;
    if (!node) throw new Error('Timetable grid not ready.');

    let html2canvas;
    try {
      const mod = await import('html2canvas');
      html2canvas = mod.default || mod;
    } catch {
      throw new Error('html2canvas is missing. Run: npm install html2canvas');
    }

    return await html2canvas(node, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#f4f5f7',
      logging: false,
      scrollX: 0,
      scrollY: -window.scrollY,
      windowWidth: document.documentElement.scrollWidth,
      windowHeight: document.documentElement.scrollHeight,
      onclone: (clonedDoc) => {
        // ── FIX: Tailwind v3 writes CSS variables using oklch()/oklab() inside
        // <style> tags. html2canvas cannot parse these modern color functions and
        // throws "unsupported color function" → blank/corrupt export.
        //
        // ROOT CAUSE of the original bug: the code used a single regex object
        // with the /g flag for BOTH .test() and .replace(). After .test() advances
        // lastIndex, the subsequent .replace() call starts mid-string and misses
        // all matches at the beginning — so nothing was actually replaced.
        //
        // FIX: Use separate regex literals (each starts with lastIndex = 0), and
        // always replace unconditionally — the .test() guard is unnecessary.

        // 1. Rewrite <style> tag contents
        clonedDoc.querySelectorAll('style').forEach((styleEl) => {
          if (styleEl.textContent) {
            styleEl.textContent = stripModernColors(styleEl.textContent);
          }
        });

        // 2. Rewrite inline style= attributes (belt-and-suspenders)
        clonedDoc.querySelectorAll('[style]').forEach((el) => {
          const inlineStyle = el.getAttribute('style');
          if (inlineStyle) {
            el.setAttribute('style', stripModernColors(inlineStyle));
          }
        });

        // 3. Rewrite CSS custom properties declared on :root / any element
        // via CSSOM (covers cases where Tailwind injects via JS-in-CSS)
        try {
          Array.from(clonedDoc.styleSheets).forEach((sheet) => {
            try {
              Array.from(sheet.cssRules || []).forEach((rule) => {
                if (rule.style) {
                  Array.from(rule.style).forEach((prop) => {
                    const val = rule.style.getPropertyValue(prop);
                    if (/oklab|oklch/i.test(val)) {
                      rule.style.setProperty(prop, '#888', rule.style.getPropertyPriority(prop));
                    }
                  });
                }
              });
            } catch {
              // Cross-origin sheets throw SecurityError — safely ignore
            }
          });
        } catch {
          // CSSOM iteration not available — fallback already handled by <style> rewrite above
        }
      },
    });
  }, []);

  const exportAsPng = useCallback(async () => {
    try {
      setExporting(true);
      const canvas = await renderToCanvas();
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `dos-timetable-${new Date().toISOString().slice(0, 10)}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setNotice({ type: 'success', text: 'Timetable exported as PNG.' });
    } catch (err) {
      setNotice({ type: 'error', text: err.message || 'Failed to export PNG.' });
    } finally {
      setExporting(false);
    }
  }, [renderToCanvas]);

  const exportAsPdf = useCallback(async () => {
    try {
      setExporting(true);
      const canvas = await renderToCanvas();
      const img = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 8;
      const fitW = pageW - margin * 2;
      const fitH = pageH - margin * 2;
      const ratio = Math.min(fitW / canvas.width, fitH / canvas.height);
      const w = canvas.width * ratio;
      const h = canvas.height * ratio;
      const x = (pageW - w) / 2;
      const y = (pageH - h) / 2;
      pdf.addImage(img, 'PNG', x, y, w, h, undefined, 'FAST');
      pdf.save(`dos-timetable-${new Date().toISOString().slice(0, 10)}.pdf`);
      setNotice({ type: 'success', text: 'Timetable exported as PDF.' });
    } catch (err) {
      setNotice({ type: 'error', text: err.message || 'Failed to export PDF.' });
    } finally {
      setExporting(false);
    }
  }, [renderToCanvas]);

  const heroBtn =
    'h-10 px-3 sm:px-4 rounded-xl text-xs font-medium transition inline-flex items-center gap-2 disabled:opacity-50';
  const heroGhost = `${heroBtn} border border-white/25 bg-white/10 text-white hover:bg-white/15`;
  const heroPrimary = `${heroBtn} border border-[#FEBF10]/45 bg-[#FEBF10]/18 text-[#FEBF10] hover:bg-[#FEBF10]/26 shadow-sm`;

  const heroActions = (
    <div className="flex flex-wrap gap-2 justify-end max-w-xl lg:max-w-none">
      <button type="button" onClick={exportAsPng} disabled={exporting || loading || displayPeriods.length === 0} className={heroGhost}>
        <ImageIcon size={14} className="text-[#FEBF10]" />
        Export PNG
      </button>
      <button type="button" onClick={exportAsPdf} disabled={exporting || loading || displayPeriods.length === 0} className={heroGhost}>
        <Download size={14} className="text-[#FEBF10]" />
        Export PDF
      </button>
      <button type="button" onClick={() => setShowPeriodModal(true)} className={heroGhost}>
        Break / lunch
      </button>
      <button type="button" onClick={() => setShowCourseModal(true)} className={heroGhost}>
        <BookPlus size={14} className="text-[#FEBF10]" />
        New course
      </button>
      <button type="button" onClick={() => openCreateTimetable()} className={heroPrimary}>
        <Plus size={14} strokeWidth={2.25} />
        Add slot
      </button>
    </div>
  );

  return (
    <>
      <DosOchreHero
        eyebrow="Schedule"
        titleLine="Weekly"
        titleAccent="timetable"
        subtitle="Configure periods, assign classes and teachers, and export PNG or PDF for your school week."
        icon={Calendar}
        rightSlot={heroActions}
      />
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 -mt-4 sm:-mt-5 md:-mt-6 pt-2 relative z-20 pb-10">
      <div className="space-y-4">
        <div className="bg-white rounded-[28px] border border-black/10 shadow-sm p-4 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
            <div className="relative xl:col-span-2">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-re-text-muted/60" />
              <input value={filters.q} onChange={(e) => setFilters((prev) => ({ ...prev, q: e.target.value }))} placeholder="Search class, subject, room, teacher..." className="w-full h-11 pl-10 pr-3 rounded-xl border border-black/10 text-sm font-semibold bg-white" />
            </div>
            <select value={filters.class_name} onChange={(e) => setFilters((prev) => ({ ...prev, class_name: e.target.value }))} className="h-11 rounded-xl border border-black/10 px-3 text-sm font-semibold bg-white">
              <option value="">All Classes</option>
              {classOptions.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={filters.subject_name} onChange={(e) => setFilters((prev) => ({ ...prev, subject_name: e.target.value }))} className="h-11 rounded-xl border border-black/10 px-3 text-sm font-semibold bg-white">
              <option value="">All Courses</option>
              {subjects.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-3">
              <select value={filters.staff_id} onChange={(e) => setFilters((prev) => ({ ...prev, staff_id: e.target.value }))} className="h-11 rounded-xl border border-black/10 px-3 text-sm font-semibold bg-white">
                <option value="">All Teachers</option>
                {teachers.map((t) => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
              </select>
              <select value={filters.day_of_week} onChange={(e) => setFilters((prev) => ({ ...prev, day_of_week: e.target.value }))} className="h-11 rounded-xl border border-black/10 px-3 text-sm font-semibold bg-white">
                <option value="">All Days</option>
                {ALL_DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
        </div>

        {notice && (
          <div className={`rounded-2xl border px-4 py-3 text-sm font-bold flex items-start gap-2 ${notice.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-900' : 'bg-red-50 border-red-100 text-red-900'}`}>
            {notice.type === 'success' ? <CheckCircle2 size={18} className="shrink-0 mt-0.5" /> : <AlertCircle size={18} className="shrink-0 mt-0.5" />}
            <span>{notice.text}</span>
          </div>
        )}

        <div className="bg-[#f4f5f7] rounded-[28px] border border-black/10 shadow-sm overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-black/5 flex items-center justify-between">
            <h2 className="text-sm font-medium text-re-text tracking-tight">Weekly grid</h2>
            <span className="text-[11px] font-medium text-re-text-muted">{rows.length} lessons</span>
          </div>

          {loading ? (
            <div className="py-14 flex items-center justify-center"><Loader2 size={20} className="animate-spin text-re-orange" /></div>
          ) : displayPeriods.length === 0 ? (
            <div className="py-14 text-center text-sm font-bold text-re-text-muted">No periods configured. Add Break/Lunch/Free or teaching periods.</div>
          ) : (
            <div className="overflow-x-auto p-3 sm:p-4" ref={exportRef}>
              <div className="grid grid-cols-5 gap-3 min-w-[980px]">
                {WEEK_DAYS.map((day) => (
                  <div key={day} className="bg-[#eef0f4] rounded-2xl border border-black/10 shadow-sm overflow-hidden">
                    <div className="px-3 py-3 border-b border-black/10 text-center text-sm font-medium tracking-tight text-[#1f2937]">
                      <span className="text-sm">{day}</span>
                    </div>
                    <div className="p-2 space-y-2 bg-[#f4f5f7]">
                      {displayPeriods.map((period) => {
                        const key = `${day}__${normalizeTime(period.start_time)}`;
                        const lesson = (lessonMap.get(key) || [])[0];
                        const pause = isBreakPeriod(period);
                        const palette = lesson ? paletteForSubject(lesson.subject_name) : null;
                        return (
                          <div
                            key={`${day}-${period.id}`}
                            className={`rounded-lg border p-2.5 min-h-[84px] ${pause
                              ? 'bg-[#eceff3] border-[#e1e5ea]'
                              : lesson
                                ? 'shadow-[0_2px_6px_rgba(15,23,42,0.12)]'
                                : 'bg-white border-[#e3e7ed] shadow-[0_1px_3px_rgba(15,23,42,0.04)]'
                              }`}
                            style={lesson ? { backgroundColor: palette.bg, borderColor: palette.border } : undefined}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] leading-none font-black uppercase tracking-[0.14em] text-[#b3bac5]">{period.period_name}</span>
                              <span className="text-[10px] leading-none font-black text-[#c1c7d0]">{period.start_time}</span>
                            </div>
                            {pause ? (
                              <div className="text-[12px] leading-tight font-black uppercase tracking-tight text-[#9ca3af] mt-1.5">
                                {String(period.period_name).toUpperCase()}
                              </div>
                            ) : lesson ? (
                              <div className="mt-1.5">
                                <p className="text-[16px] leading-[1.15] font-black uppercase tracking-tight break-words" style={{ color: palette.title }}>{lesson.subject_name}</p>
                                <p className="text-[11px] leading-tight font-bold uppercase tracking-tight mt-0.5" style={{ color: palette.meta }}>{lesson.class_name}</p>
                                <div className="mt-2 flex justify-end gap-1">
                                  <button type="button" onClick={() => openEditTimetable(lesson)} className="p-1.5 rounded-md text-[#d97706] hover:bg-amber-100"><Edit3 size={12} /></button>
                                  <button type="button" onClick={() => deleteTimetableRow(lesson.id)} className="p-1.5 rounded-md text-red-500 hover:bg-red-100"><Trash2 size={12} /></button>
                                </div>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => openCreateTimetable(day, period.start_time, period.end_time)}
                                className="mt-2 w-full h-10 rounded-md border border-[#e8ecf2] text-[#9aa3af] hover:text-re-orange hover:border-re-orange/40 inline-flex items-center justify-center bg-[#fafbfc]"
                              >
                                <Plus size={16} />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        {legendSubjects.length > 0 && (
          <div className="bg-white rounded-2xl border border-black/5 px-4 sm:px-5 py-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h3 className="text-[11px] font-black uppercase tracking-[0.14em] text-re-text-muted">Course Color Legend</h3>
              <span className="text-[10px] font-bold text-re-text-muted">{legendSubjects.length} courses</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2.5">
              {legendSubjects.map((subject) => {
                const palette = paletteForSubject(subject);
                return (
                  <div key={subject} className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-[11px] font-bold" style={{ backgroundColor: palette.bg, borderColor: palette.border, color: palette.title }}>
                    <span className="w-2.5 h-2.5 rounded-full border border-black/10" style={{ backgroundColor: palette.title }} />
                    <span>{subject}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {showTimetableModal && (
        <div className="fixed inset-0 z-[2000] bg-black/50 p-3 sm:p-6 flex items-center justify-center">
          <form onSubmit={submitTimetable} className="w-full max-w-xl bg-white rounded-3xl shadow-sm border border-black/5 overflow-hidden">
            <div className="px-5 py-4 border-b border-black/5 flex items-center justify-between">
              <h3 className="text-sm font-black text-re-text uppercase tracking-widest">{editingRow ? 'Edit Timetable Period' : 'Create Timetable Period'}</h3>
              <button type="button" onClick={() => setShowTimetableModal(false)} className="p-2 rounded-lg text-re-text-muted hover:bg-re-bg"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-re-text-muted mb-1">Class</label>
                  <input required list="class-options-list" value={timetableForm.class_name} onChange={(e) => setTimetableForm((p) => ({ ...p, class_name: e.target.value }))} className="w-full h-10 rounded-xl border border-black/10 px-3 text-sm font-semibold" />
                  <datalist id="class-options-list">{classOptions.map((c) => <option key={c} value={c} />)}</datalist>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-re-text-muted mb-1">Course</label>
                  <select required value={timetableForm.subject_name} onChange={(e) => setTimetableForm((p) => ({ ...p, subject_name: e.target.value }))} className="w-full h-10 rounded-xl border border-black/10 px-3 text-sm font-semibold bg-white">
                    <option value="">Select course</option>
                    {subjects.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-re-text-muted mb-1">Teacher</label>
                <select required value={timetableForm.staff_id} onChange={(e) => setTimetableForm((p) => ({ ...p, staff_id: e.target.value }))} className="w-full h-10 rounded-xl border border-black/10 px-3 text-sm font-semibold bg-white">
                  <option value="">Select teacher</option>
                  {teachers.map((t) => <option key={t.id} value={t.id}>{t.first_name} {t.last_name} ({t.role_code})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-re-text-muted mb-1">Day</label>
                  <select value={timetableForm.day_of_week} onChange={(e) => setTimetableForm((p) => ({ ...p, day_of_week: e.target.value }))} className="w-full h-10 rounded-xl border border-black/10 px-3 text-sm font-semibold bg-white">
                    {ALL_DAYS.map((day) => <option key={day} value={day}>{day}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-re-text-muted mb-1">Start</label>
                  <input required type="time" value={timetableForm.start_time} onChange={(e) => setTimetableForm((p) => ({ ...p, start_time: e.target.value }))} className="w-full h-10 rounded-xl border border-black/10 px-3 text-sm font-semibold" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-re-text-muted mb-1">End</label>
                  <input required type="time" value={timetableForm.end_time} onChange={(e) => setTimetableForm((p) => ({ ...p, end_time: e.target.value }))} className="w-full h-10 rounded-xl border border-black/10 px-3 text-sm font-semibold" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-re-text-muted mb-1">Room</label>
                  <input value={timetableForm.room} onChange={(e) => setTimetableForm((p) => ({ ...p, room: e.target.value }))} className="w-full h-10 rounded-xl border border-black/10 px-3 text-sm font-semibold" placeholder="Optional" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-re-text-muted mb-1">Term</label>
                  <select
                    value={timetableForm.term}
                    onChange={(e) => setTimetableForm((p) => ({ ...p, term: e.target.value }))}
                    className="w-full h-10 rounded-xl border border-black/10 px-3 text-sm font-semibold bg-white"
                    required
                  >
                    {(academicSettings.active_terms || ['Term 1', 'Term 2', 'Term 3']).map((term) => (
                      <option key={term} value={term}>{term}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-re-text-muted mb-1">Academic Year</label>
                  <input
                    required
                    value={timetableForm.academic_year}
                    onChange={(e) => setTimetableForm((p) => ({ ...p, academic_year: e.target.value }))}
                    className="w-full h-10 rounded-xl border border-black/10 px-3 text-sm font-semibold"
                    placeholder="2025-2026"
                  />
                </div>
              </div>
            </div>
            <div className="px-5 py-4 border-t border-black/5 bg-re-bg/40 flex justify-end gap-2">
              <button type="button" onClick={() => setShowTimetableModal(false)} className="h-10 px-4 rounded-xl border border-black/10 text-re-text-muted font-black text-[10px] uppercase tracking-widest">Cancel</button>
              <button type="submit" disabled={saving} className="h-10 px-4 rounded-xl bg-re-grad-orange text-white font-black text-[10px] uppercase tracking-widest shadow-re-glow inline-flex items-center gap-2 disabled:opacity-70">
                {saving && <Loader2 size={13} className="animate-spin" />}
                {editingRow ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}

      {showCourseModal && (
        <div className="fixed inset-0 z-[2100] bg-black/50 p-3 sm:p-6 flex items-center justify-center">
          <form onSubmit={submitCourse} className="w-full max-w-md bg-white rounded-3xl shadow-sm border border-black/5 overflow-hidden">
            <div className="px-5 py-4 border-b border-black/5 flex items-center justify-between">
              <h3 className="text-sm font-black text-re-text uppercase tracking-widest">Create School Course</h3>
              <button type="button" onClick={() => setShowCourseModal(false)} className="p-2 rounded-lg text-re-text-muted hover:bg-re-bg"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-re-text-muted mb-1">Course name</label>
                <input required value={courseForm.name} onChange={(e) => setCourseForm((p) => ({ ...p, name: e.target.value }))} className="w-full h-10 rounded-xl border border-black/10 px-3 text-sm font-semibold" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-re-text-muted mb-1">Category</label>
                  <input value={courseForm.category} onChange={(e) => setCourseForm((p) => ({ ...p, category: e.target.value }))} className="w-full h-10 rounded-xl border border-black/10 px-3 text-sm font-semibold" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-re-text-muted mb-1">Code</label>
                  <input value={courseForm.subject_code} onChange={(e) => setCourseForm((p) => ({ ...p, subject_code: e.target.value }))} className="w-full h-10 rounded-xl border border-black/10 px-3 text-sm font-semibold" />
                </div>
              </div>
            </div>
            <div className="px-5 py-4 border-t border-black/5 bg-re-bg/40 flex justify-end gap-2">
              <button type="button" onClick={() => setShowCourseModal(false)} className="h-10 px-4 rounded-xl border border-black/10 text-re-text-muted font-black text-[10px] uppercase tracking-widest">Cancel</button>
              <button type="submit" disabled={saving} className="h-10 px-4 rounded-xl bg-re-grad-orange text-white font-black text-[10px] uppercase tracking-widest shadow-re-glow inline-flex items-center gap-2 disabled:opacity-70">
                {saving && <Loader2 size={13} className="animate-spin" />}
                Save Course
              </button>
            </div>
          </form>
        </div>
      )}

      {showPeriodModal && (
        <div className="fixed inset-0 z-[2200] bg-black/50 p-3 sm:p-6 flex items-center justify-center">
          <form onSubmit={submitPeriod} className="w-full max-w-md bg-white rounded-3xl shadow-sm border border-black/5 overflow-hidden">
            <div className="px-5 py-4 border-b border-black/5 flex items-center justify-between">
              <h3 className="text-sm font-black text-re-text uppercase tracking-widest">Set Break / Lunch / Free Hour</h3>
              <button type="button" onClick={() => setShowPeriodModal(false)} className="p-2 rounded-lg text-re-text-muted hover:bg-re-bg"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <button type="button" onClick={() => setPeriodForm((p) => ({ ...p, period_name: 'Break', is_break: true }))} className="h-9 rounded-lg bg-slate-100 text-slate-700 font-black text-[10px] uppercase">Break</button>
                <button type="button" onClick={() => setPeriodForm((p) => ({ ...p, period_name: 'Lunch', is_break: true }))} className="h-9 rounded-lg bg-slate-100 text-slate-700 font-black text-[10px] uppercase">Lunch</button>
                <button type="button" onClick={() => setPeriodForm((p) => ({ ...p, period_name: 'Free Hour', is_break: true }))} className="h-9 rounded-lg bg-slate-100 text-slate-700 font-black text-[10px] uppercase">Free Hour</button>
              </div>
              <input required value={periodForm.period_name} onChange={(e) => setPeriodForm((p) => ({ ...p, period_name: e.target.value }))} className="w-full h-10 rounded-xl border border-black/10 px-3 text-sm font-semibold" placeholder="Period name" />
              <div className="grid grid-cols-2 gap-3">
                <input required type="time" value={periodForm.start_time} onChange={(e) => setPeriodForm((p) => ({ ...p, start_time: e.target.value }))} className="h-10 rounded-xl border border-black/10 px-3 text-sm font-semibold" />
                <input required type="time" value={periodForm.end_time} onChange={(e) => setPeriodForm((p) => ({ ...p, end_time: e.target.value }))} className="h-10 rounded-xl border border-black/10 px-3 text-sm font-semibold" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="inline-flex items-center gap-2 h-10 px-3 rounded-xl border border-black/10 text-sm font-semibold">
                  <input type="checkbox" checked={periodForm.is_break} onChange={(e) => setPeriodForm((p) => ({ ...p, is_break: e.target.checked }))} />
                  Pause Slot
                </label>
                <input type="number" min="0" value={periodForm.sort_order} onChange={(e) => setPeriodForm((p) => ({ ...p, sort_order: e.target.value }))} className="h-10 rounded-xl border border-black/10 px-3 text-sm font-semibold" placeholder="Sort order" />
              </div>
            </div>
            <div className="px-5 py-4 border-t border-black/5 bg-re-bg/40 flex justify-end gap-2">
              <button type="button" onClick={() => setShowPeriodModal(false)} className="h-10 px-4 rounded-xl border border-black/10 text-re-text-muted font-black text-[10px] uppercase tracking-widest">Cancel</button>
              <button type="submit" disabled={saving} className="h-10 px-4 rounded-xl bg-re-grad-orange text-white font-black text-[10px] uppercase tracking-widest shadow-re-glow inline-flex items-center gap-2 disabled:opacity-70">
                {saving && <Loader2 size={13} className="animate-spin" />}
                Save Period
              </button>
            </div>
          </form>
        </div>
      )}
      </div>
    </>
  );
}