import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import {
  AlertCircle, AlertTriangle, BookOpen, BookPlus, Calendar, CheckCircle2, ChevronDown,
  Clock, Download, Edit3, Layers, Loader2, Plus, RefreshCw,
  Search, Trash2, UserPlus, Users, X, Zap, BarChart3,
  ClipboardList, Sparkles, Shield, FlaskConical, Check,
} from 'lucide-react';
import api from '../services/api';
import DosOchreHero from '../components/DosOchreHero';
import DndTimetableGrid from '../components/DndTimetableGrid';

const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const ALL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const PRIORITY_LABELS = { low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical' };
const PRIORITY_COLORS = { low: '#94a3b8', medium: '#3b82f6', high: '#f59e0b', critical: '#ef4444' };

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
  for (let i = 0; i < value.length; i++) hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  return SUBJECT_PALETTES[hash % SUBJECT_PALETTES.length];
};

const normalizeTime = (v) => { const r = String(v || '').trim(); if (!r) return ''; const p = r.split(':'); return p.length < 2 ? r : `${p[0].padStart(2,'0')}:${p[1].padStart(2,'0')}`; };
const fmt12 = (t) => { if (!t) return '—'; const [h,m] = t.split(':').map(Number); return `${((h%12)||12)}:${String(m).padStart(2,'0')} ${h>=12?'PM':'AM'}`; };
const classLabel = (row) => [row?.group_name, row?.stream_name, row?.combination].map(s => String(s||'').trim()).filter(Boolean).join(' ').replace(/\s+/g,' ').trim();
const TABS = [
  { id: 'teachers', label: 'Teachers', Icon: Users },
  { id: 'courses', label: 'Courses', Icon: BookOpen },
  { id: 'schedule', label: 'Time Settings', Icon: Clock },
  { id: 'assignments', label: 'Assignments', Icon: ClipboardList },
  { id: 'generator', label: 'Generator', Icon: Sparkles },
  { id: 'timetable', label: 'Timetable', Icon: Calendar },
];

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export default function Timetable() {
  const exportRef = useRef(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const TAB_IDS = TABS.map(t => t.id);
  const tabParam = searchParams.get('tab');
  const activeTab = TAB_IDS.includes(tabParam) ? tabParam : 'teachers';
  const setActiveTab = (id) => setSearchParams({ tab: id }, { replace: true });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [notice, setNotice] = useState(null);

  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [rows, setRows] = useState([]);
  const [academicSettings, setAcademicSettings] = useState({ current_academic_year: '2025-2026', active_terms: ['Term 1','Term 2','Term 3'] });

  const [teacherProfiles, setTeacherProfiles] = useState([]);
  const [courseConfigs, setCourseConfigs] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [schedule, setSchedule] = useState(null);
  const [workload, setWorkload] = useState([]);
  const [generatedResult, setGeneratedResult] = useState(null);
  const [conflicts, setConflicts] = useState([]);

  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showTTModal, setShowTTModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [editingProfile, setEditingProfile] = useState(null);
  const [editingCourseConfig, setEditingCourseConfig] = useState(null);

  const [filters, setFilters] = useState({ class_name: '', staff_id: '', day_of_week: '', q: '' });
  const [assignFilter, setAssignFilter] = useState('');

  const [newTeacher, setNewTeacher] = useState({ first_name:'', last_name:'', email:'', username:'', phone:'', staff_id:'' });
  const [newCourse, setNewCourse] = useState({ name:'', category:'', subject_code:'' });
  const [assignForm, setAssignForm] = useState({ class_name:'', subject_name:'', teacher_user_id:'', periods_per_week:3, room:'' });
  const [bulkAssign, setBulkAssign] = useState({ class_name:'', selectedSubjects:[], selectedTeachers:[], periods_per_week:3 });
  const [ttForm, setTTForm] = useState({ class_name:'', subject_name:'', staff_id:'', day_of_week:'Monday', start_time:'08:00', end_time:'09:00', room:'', term:'', academic_year:'' });
  const [scheduleForm, setScheduleForm] = useState({ day_start_time:'08:00', day_end_time:'17:00', period_duration_mins:40, active_days:['Monday','Tuesday','Wednesday','Thursday','Friday'], breaks:[{ name:'Break', start:'10:30', end:'11:00' },{ name:'Lunch', start:'13:00', end:'14:00' }] });
  const [profileForm, setProfileForm] = useState({ subjects:[], max_periods_per_day:6, available_days:[], preferred_slots:[], department:'' });
  const [courseConfigForm, setCourseConfigForm] = useState({ default_duration_mins:40, requires_lab:false, is_double_period:false, priority_level:'medium', department:'', periods_per_week:3 });
  const [genClass, setGenClass] = useState('');

  const flash = (type, text) => { setNotice({ type, text }); setTimeout(() => setNotice(null), 5000); };

  const [studentClasses, setStudentClasses] = useState([]);

  const classOptions = useMemo(() => {
    const from1 = classes.map(classLabel).filter(Boolean);
    const from2 = rows.map(x => String(x.class_name||'').trim()).filter(Boolean);
    const from3 = assignments.map(x => String(x.class_name||'').trim()).filter(Boolean);
    const from4 = studentClasses.filter(Boolean);
    return Array.from(new Set([...from1,...from2,...from3,...from4])).sort();
  }, [classes, rows, assignments, studentClasses]);

  const fetchCore = useCallback(async () => {
    const [tR, sR, cR, pR, aR, rR, scR] = await Promise.all([
      api.get('/dos/teaching-staff').catch(()=>({data:{success:false}})),
      api.get('/dos/subjects', {params:{include_inactive:1}}).catch(()=>({data:{success:false}})),
      api.get('/dos/registry/classes').catch(()=>({data:{success:false}})),
      api.get('/dos/calendar/periods').catch(()=>({data:{success:false}})),
      api.get('/dos/academic-calendar-settings').catch(()=>({data:{success:false}})),
      api.get('/dos/timetable').catch(()=>({data:{success:false}})),
      api.get('/dos/class-enrollment').catch(()=>({data:{success:false}})),
    ]);
    if (tR.data?.success) setTeachers(tR.data.data || []);
    if (sR.data?.success) setSubjects((sR.data.data||[]).filter(x=>x.is_active!==0));
    if (cR.data?.success) setClasses(cR.data.data || []);
    if (pR.data?.success) setPeriods(pR.data.data || []);
    if (aR.data?.success) setAcademicSettings(aR.data.data || academicSettings);
    if (rR.data?.success) setRows(rR.data.data || []);
    if (scR.data?.success) setStudentClasses((scR.data.data?.rows||[]).map(r=>r.class_name).filter(Boolean));
  }, []);

  const fetchSmart = useCallback(async () => {
    const [tpR, ccR, asR, scR, wR] = await Promise.all([
      api.get('/dos/timetable-system/teacher-profiles').catch(()=>({data:{success:false}})),
      api.get('/dos/timetable-system/course-config').catch(()=>({data:{success:false}})),
      api.get('/dos/timetable-system/assignments').catch(()=>({data:{success:false}})),
      api.get('/dos/timetable-system/schedule').catch(()=>({data:{success:false}})),
      api.get('/dos/timetable-system/workload').catch(()=>({data:{success:false}})),
    ]);
    if (tpR.data?.success) setTeacherProfiles(tpR.data.data || []);
    if (ccR.data?.success) setCourseConfigs(ccR.data.data || []);
    if (asR.data?.success) setAssignments(asR.data.data || []);
    if (scR.data?.success) { setSchedule(scR.data.data); setScheduleForm({ day_start_time: scR.data.data.day_start_time||'08:00', day_end_time: scR.data.data.day_end_time||'17:00', period_duration_mins: scR.data.data.period_duration_mins||40, active_days: scR.data.data.active_days||WEEK_DAYS, breaks: scR.data.data.breaks||[] }); }
    if (wR.data?.success) setWorkload(wR.data.data || []);
  }, []);

  useEffect(() => { (async () => { setLoading(true); try { await Promise.all([fetchCore(), fetchSmart()]); } catch(e){ flash('error', e.response?.data?.message||'Failed to load'); } finally { setLoading(false); } })(); }, [fetchCore, fetchSmart]);

  useEffect(() => {
    if (!showAssignModal) return;
    const handler = (e) => {
      if (!e.target.closest('#course-dropdown-wrap')) setBulkAssign(p => p._courseOpen ? ({...p,_courseOpen:false}) : p);
      if (!e.target.closest('#teacher-dropdown-wrap')) setBulkAssign(p => p._teacherOpen ? ({...p,_teacherOpen:false}) : p);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showAssignModal]);

  const profileMap = useMemo(() => new Map(teacherProfiles.map(p=>[p.teacher_user_id, p])), [teacherProfiles]);
  const configMap = useMemo(() => new Map(courseConfigs.map(c=>[c.subject_name, c])), [courseConfigs]);

  // ── Teacher actions ──
  const submitNewTeacher = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.post('/school/staff', { ...newTeacher, role_code:'TEACHER' });
      flash('success','Teacher created'); setNewTeacher({ first_name:'', last_name:'', email:'', username:'', phone:'', staff_id:'' }); setShowTeacherModal(false); await fetchCore(); await fetchSmart();
    } catch(err){ flash('error', err.response?.data?.message||'Failed'); } finally { setSaving(false); }
  };

  const saveProfile = async (teacherId) => {
    setSaving(true);
    try {
      await api.put(`/dos/timetable-system/teacher-profiles/${teacherId}`, profileForm);
      flash('success','Profile saved'); setEditingProfile(null); await fetchSmart();
    } catch(err){ flash('error', err.response?.data?.message||'Failed'); } finally { setSaving(false); }
  };

  // ── Course actions ──
  const submitNewCourse = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.post('/dos/subjects', newCourse);
      flash('success','Course created'); setNewCourse({ name:'', category:'', subject_code:'' }); setShowCourseModal(false); await fetchCore();
    } catch(err){ flash('error', err.response?.data?.message||'Failed'); } finally { setSaving(false); }
  };

  const saveCourseConfig = async (subjectName) => {
    setSaving(true);
    try {
      await api.put(`/dos/timetable-system/course-config/${encodeURIComponent(subjectName)}`, courseConfigForm);
      flash('success','Config saved'); setEditingCourseConfig(null); await fetchSmart();
    } catch(err){ flash('error', err.response?.data?.message||'Failed'); } finally { setSaving(false); }
  };

  // ── Schedule actions ──
  const saveSchedule = async () => {
    setSaving(true);
    try {
      const res = await api.put('/dos/timetable-system/schedule', scheduleForm);
      flash('success','Schedule saved & periods generated'); await fetchCore(); await fetchSmart();
    } catch(err){ flash('error', err.response?.data?.message||'Failed'); } finally { setSaving(false); }
  };

  // ── Assignment actions ──
  const submitAssignment = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.post('/dos/timetable-system/assignments', assignForm);
      flash('success','Assignment saved'); setShowAssignModal(false); setAssignForm({ class_name:'', subject_name:'', teacher_user_id:'', periods_per_week:3, room:'' }); await fetchSmart();
    } catch(err){ flash('error', err.response?.data?.message||'Failed'); } finally { setSaving(false); }
  };

  const submitBulkAssignment = async () => {
    if (!bulkAssign.class_name || !bulkAssign.selectedSubjects.length || !bulkAssign.selectedTeachers.length) { flash('error','Select class, at least one course and one teacher'); return; }
    setSaving(true);
    try {
      await api.post('/dos/timetable-system/assignments/bulk', { class_name: bulkAssign.class_name, subjects: bulkAssign.selectedSubjects, teacher_ids: bulkAssign.selectedTeachers, periods_per_week: bulkAssign.periods_per_week });
      flash('success','Assignments created'); setBulkAssign({ class_name:'', selectedSubjects:[], selectedTeachers:[], periods_per_week:3, _courseSearch:'', _teacherSearch:'', _courseOpen:false, _teacherOpen:false }); setShowAssignModal(false); await fetchSmart();
    } catch(err){ flash('error', err.response?.data?.message||'Failed'); } finally { setSaving(false); }
  };

  const deleteAssignment = async (id) => {
    if (!confirm('Remove this assignment?')) return;
    try { await api.delete(`/dos/timetable-system/assignments/${id}`); flash('success','Removed'); await fetchSmart(); } catch(err){ flash('error','Failed'); }
  };

  // ── Generator actions ──
  const runGenerator = async () => {
    if (!genClass) { flash('error','Select a class first'); return; }
    setSaving(true);
    try {
      const res = await api.post('/dos/timetable-system/generate', { class_name: genClass, term: academicSettings.active_terms?.[0]||'Term 1', academic_year: academicSettings.current_academic_year||'2025-2026' });
      setGeneratedResult(res.data?.data); flash('success',`Generated ${res.data?.data?.stats?.total||0} entries`);
    } catch(err){ flash('error', err.response?.data?.message||'Generation failed'); } finally { setSaving(false); }
  };

  const applyGenerated = async () => {
    if (!generatedResult?.generated?.length) return;
    setSaving(true);
    try {
      await api.post('/dos/timetable-system/apply', { entries: generatedResult.generated, class_name: genClass, term: generatedResult.generated[0]?.term, academic_year: generatedResult.generated[0]?.academic_year, clear_existing: true });
      flash('success','Timetable applied!'); setGeneratedResult(null); setFilters(p=>({...p,class_name:genClass})); await fetchCore(); await fetchSmart(); setActiveTab('timetable');
    } catch(err){ flash('error', err.response?.data?.message||'Failed to apply'); } finally { setSaving(false); }
  };

  // ── Timetable CRUD ──
  const submitTT = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const payload = { class_name:ttForm.class_name.trim(), subject_name:ttForm.subject_name.trim(), staff_id:Number(ttForm.staff_id), day_of_week:ttForm.day_of_week, start_time:ttForm.start_time, end_time:ttForm.end_time, room:ttForm.room.trim()||null, term:ttForm.term, academic_year:ttForm.academic_year };
      if (editingRow?.id) { await api.put(`/dos/timetable/${editingRow.id}`, payload); } else { await api.post('/dos/timetable', payload); }
      flash('success', editingRow?'Updated':'Created'); setShowTTModal(false); await fetchCore(); await fetchSmart();
    } catch(err){ flash('error', err.response?.data?.message||'Failed'); } finally { setSaving(false); }
  };

  const deleteTTRow = async (id) => {
    if (!confirm('Delete this period?')) return;
    try { await api.delete(`/dos/timetable/${id}`); flash('success','Deleted'); await fetchCore(); await fetchSmart(); } catch(err){ flash('error','Failed'); }
  };

  const deleteClassTimetable = async (className) => {
    if (!className) return;
    if (!confirm(`Delete ALL timetable entries for "${className}"? This cannot be undone.`)) return;
    setSaving(true);
    try {
      const classRows = rows.filter(r => r.class_name === className);
      await Promise.all(classRows.map(r => api.delete(`/dos/timetable/${r.id}`)));
      flash('success', `Deleted ${classRows.length} entries for ${className}`);
      await fetchCore(); await fetchSmart();
    } catch(err) { flash('error', err.response?.data?.message || 'Failed to delete'); } finally { setSaving(false); }
  };

  const classTimetableCounts = useMemo(() => {
    const map = new Map();
    for (const r of rows) {
      const c = String(r.class_name || '').trim();
      if (!c) continue;
      map.set(c, (map.get(c) || 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [rows]);

  const openCreateTT = (day='Monday', start='08:00', end='09:00') => { setEditingRow(null); setTTForm({ class_name:filters.class_name||'', subject_name:'', staff_id:'', day_of_week:day, start_time:start, end_time:end, room:'', term:academicSettings.active_terms?.[0]||'Term 1', academic_year:academicSettings.current_academic_year||'2025-2026' }); setShowTTModal(true); };
  const openEditTT = (row) => { setEditingRow(row); setTTForm({ class_name:row.class_name||'', subject_name:row.subject_name||'', staff_id:String(row.staff_id||''), day_of_week:row.day_of_week||'Monday', start_time:row.start_time||'08:00', end_time:row.end_time||'09:00', room:row.room||'', term:row.term||academicSettings.active_terms?.[0]||'Term 1', academic_year:row.academic_year||academicSettings.current_academic_year||'2025-2026' }); setShowTTModal(true); };

  const updateTTInline = async (id, data) => {
    try {
      const payload = { class_name: data.class_name, subject_name: data.subject_name, staff_id: Number(data.staff_id), day_of_week: data.day_of_week, start_time: data.start_time, end_time: data.end_time, room: data.room || null, term: data.term, academic_year: data.academic_year, is_locked: data.is_locked };
      await api.put(`/dos/timetable/${id}`, payload);
      await fetchCore(); await fetchSmart();
    } catch (err) { flash('error', err.response?.data?.message || 'Failed to update'); }
  };

  const duplicateTTRow = async (lesson) => {
    try {
      const payload = { class_name: lesson.class_name, subject_name: lesson.subject_name, staff_id: Number(lesson.staff_id), day_of_week: lesson.day_of_week, start_time: lesson.start_time, end_time: lesson.end_time, room: lesson.room || null, term: lesson.term || academicSettings.active_terms?.[0] || 'Term 1', academic_year: lesson.academic_year || academicSettings.current_academic_year || '2025-2026' };
      await api.post('/dos/timetable', payload);
      flash('success', 'Lesson duplicated'); await fetchCore(); await fetchSmart();
    } catch (err) { flash('error', err.response?.data?.message || 'Failed to duplicate'); }
  };

  // ── Timetable display helpers ──
  const displayPeriods = useMemo(() => {
    const map = new Map();
    const source = periods.length > 0 ? periods : (schedule?.generated_slots || []);
    for (const p of [...source].sort((a,b)=>(a.sort_order||0)-(b.sort_order||0)||String(a.start_time||'').localeCompare(String(b.start_time||'')))) {
      const key = normalizeTime(p.start_time); if (!key) continue;
      map.set(key, { ...p, start_time:key, end_time:normalizeTime(p.end_time)||p.end_time });
    }
    for (const r of rows) { const key = normalizeTime(r.start_time); if (!key||map.has(key)) continue; map.set(key, { id:`auto-${key}`, period_name:`Period ${key}`, start_time:key, end_time:normalizeTime(r.end_time)||r.end_time||'', is_break:false, sort_order:999 }); }
    return [...map.values()].sort((a,b)=>normalizeTime(a.start_time).localeCompare(normalizeTime(b.start_time)));
  }, [periods, rows, schedule]);

  const filteredRows = useMemo(() => rows.filter(r => { if (filters.class_name && r.class_name!==filters.class_name) return false; if (filters.staff_id && String(r.staff_id)!==filters.staff_id) return false; if (filters.day_of_week && r.day_of_week!==filters.day_of_week) return false; if (filters.q) { const q=filters.q.toLowerCase(); if (![r.class_name,r.subject_name,r.teacher_name,r.room].some(v=>String(v||'').toLowerCase().includes(q))) return false; } return true; }), [rows, filters]);
  const lessonMap = useMemo(() => { const m = new Map(); for (const r of filteredRows) { const k=`${r.day_of_week}__${normalizeTime(r.start_time)}`; const c=m.get(k)||[]; c.push(r); m.set(k,c); } return m; }, [filteredRows]);

  // ── Export ──
  const exportPdf = useCallback(() => {
    try {
      setExporting(true);
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pw = pdf.internal.pageSize.getWidth(), ph = pdf.internal.pageSize.getHeight();
      const margin = 8;
      const activeDays = scheduleForm.active_days?.length ? scheduleForm.active_days.filter(d => WEEK_DAYS.includes(d)) : WEEK_DAYS;
      const cols = activeDays.length;
      const pRows = displayPeriods;
      if (!pRows.length) { flash('error','No periods to export'); setExporting(false); return; }

      const colW = (pw - margin*2 - 28) / cols;
      const rowH = 14;
      const headerH = 10;
      const timeColW = 28;
      let y = margin;

      pdf.setFontSize(14); pdf.setFont('helvetica','bold'); pdf.setTextColor(15,23,42);
      pdf.text(filters.class_name ? `Timetable — ${filters.class_name}` : 'School Timetable', pw/2, y+5, {align:'center'});
      y += 12;

      const hexToRgb = (hex) => { const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16); return [r,g,b]; };

      const drawHeader = () => {
        pdf.setFillColor(15,23,42); pdf.rect(margin, y, pw-margin*2, headerH, 'F');
        pdf.setFontSize(7); pdf.setFont('helvetica','bold'); pdf.setTextColor(255,255,255);
        pdf.text('TIME', margin+timeColW/2, y+headerH/2+2, {align:'center'});
        activeDays.forEach((day, i) => { pdf.text(day.toUpperCase(), margin+timeColW+i*colW+colW/2, y+headerH/2+2, {align:'center'}); });
        y += headerH;
      };

      drawHeader();

      const checkPageBreak = (needed) => {
        if (y + needed > ph - margin) {
          pdf.addPage(); y = margin;
          drawHeader();
        }
      };

      pRows.forEach(period => {
        const isBrk = Boolean(period.is_break) || String(period.period_name||'').toLowerCase().match(/break|lunch|free/);

        if (isBrk) {
          checkPageBreak(rowH*0.7);
          pdf.setFillColor(241,245,249); pdf.rect(margin, y, pw-margin*2, rowH*0.7, 'F');
          pdf.setDrawColor(226,232,240); pdf.rect(margin, y, pw-margin*2, rowH*0.7, 'S');
          pdf.setFontSize(6); pdf.setFont('helvetica','bold'); pdf.setTextColor(148,163,184);
          pdf.text(`${String(period.period_name).toUpperCase()}  ${normalizeTime(period.start_time)}–${normalizeTime(period.end_time)}`, pw/2, y+rowH*0.35+1.5, {align:'center'});
          y += rowH*0.7;
          return;
        }

        checkPageBreak(rowH);
        pdf.setFillColor(248,250,252); pdf.rect(margin, y, timeColW, rowH, 'F');
        pdf.setDrawColor(226,232,240); pdf.rect(margin, y, timeColW, rowH, 'S');
        pdf.setFontSize(5.5); pdf.setFont('helvetica','bold'); pdf.setTextColor(100,116,139);
        pdf.text(period.period_name, margin+timeColW/2, y+4, {align:'center'});
        pdf.setFontSize(6); pdf.setTextColor(15,23,42);
        pdf.text(`${normalizeTime(period.start_time)}`, margin+timeColW/2, y+8, {align:'center'});
        pdf.text(`${normalizeTime(period.end_time)}`, margin+timeColW/2, y+11.5, {align:'center'});

        activeDays.forEach((day, i) => {
          const cellX = margin + timeColW + i*colW;
          const key = `${day}__${normalizeTime(period.start_time)}`;
          const lesson = (lessonMap.get(key)||[])[0];
          const pal = lesson ? paletteForSubject(lesson.subject_name) : null;

          if (lesson) {
            const bgRgb = hexToRgb(pal.bg); pdf.setFillColor(...bgRgb); pdf.rect(cellX, y, colW, rowH, 'F');
            const brRgb = hexToRgb(pal.border); pdf.setDrawColor(...brRgb); pdf.rect(cellX, y, colW, rowH, 'S');
            const ttRgb = hexToRgb(pal.title);
            pdf.setFontSize(7); pdf.setFont('helvetica','bold'); pdf.setTextColor(...ttRgb);
            pdf.text(String(lesson.subject_name||'').toUpperCase(), cellX+colW/2, y+5, {align:'center', maxWidth:colW-3});
            pdf.setFontSize(5.5); pdf.setTextColor(148,163,184);
            pdf.text(lesson.teacher_name||'', cellX+colW/2, y+10, {align:'center', maxWidth:colW-2});
          } else {
            pdf.setFillColor(255,255,255); pdf.rect(cellX, y, colW, rowH, 'F');
            pdf.setDrawColor(226,232,240); pdf.rect(cellX, y, colW, rowH, 'S');
          }
        });
        y += rowH;
      });

      pdf.save(`timetable${filters.class_name?'-'+filters.class_name:''}-${new Date().toISOString().slice(0,10)}.pdf`);
      flash('success','Exported PDF');
    } catch(e) { console.error(e); flash('error', e.message||'PDF export failed'); } finally { setExporting(false); }
  }, [displayPeriods, lessonMap, scheduleForm.active_days, filters.class_name, flash]);

  // ── UI Helpers ──
  const Card = ({children, className=''}) => <div className={`bg-white rounded-2xl border border-black/5 shadow-sm ${className}`}>{children}</div>;
  const SectionTitle = ({icon:Icon, title, count, action}) => (
    <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
      <div className="flex items-center gap-2.5"><div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FEBF10]/15 to-[#FF8C00]/10 flex items-center justify-center"><Icon size={16} className="text-[#FF8C00]"/></div><h2 className="text-sm font-black text-[#0f172a] uppercase tracking-widest">{title}</h2>{count!=null&&<span className="text-[10px] font-bold text-[#94a3b8] bg-[#f1f5f9] px-2 py-0.5 rounded-full">{count}</span>}</div>
      {action}
    </div>
  );
  const Btn = ({children, onClick, variant='primary', disabled, className='', type='button'}) => {
    const base = 'h-10 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-2 transition disabled:opacity-50';
    const styles = { primary:'bg-gradient-to-r from-[#FF8C00] to-[#FF5E00] text-white shadow-md hover:shadow-lg', ghost:'border border-black/10 text-[#64748b] hover:bg-[#f8fafc]', danger:'border border-red-200 text-red-600 hover:bg-red-50' };
    return <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${styles[variant]} ${className}`}>{children}</button>;
  };
  const Badge = ({children, color='#3b82f6'}) => <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-black uppercase" style={{background:`${color}14`,color,border:`1px solid ${color}28`}}>{children}</span>;

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#f8f9fc]"><Loader2 size={24} className="animate-spin text-[#FF8C00]"/></div>;

  return (
    <>
      <DosOchreHero eyebrow="Academic System" titleLine="Smart" titleAccent="Timetable" subtitle="Manage teachers, courses, schedule, assignments, and auto-generate conflict-free timetables." icon={Calendar}
        rightSlot={activeTab==='timetable'?<div className="flex flex-wrap gap-2"><button onClick={exportPdf} disabled={exporting} className="h-10 px-5 rounded-xl text-[11px] font-black uppercase tracking-widest inline-flex items-center gap-2 bg-white text-[#0f172a] border border-black/10 shadow-md hover:shadow-lg hover:bg-[#f8fafc] transition disabled:opacity-50"><Download size={14}/>Export PDF</button><Btn onClick={()=>openCreateTT()}><Plus size={13}/>Add slot</Btn></div>:null}
      />
      <div className="max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8 -mt-4 sm:-mt-5 md:-mt-6 pt-2 relative z-20 pb-10">

      {notice && <div className={`rounded-2xl border px-4 py-3 text-sm font-bold flex items-start gap-2 mb-4 ${notice.type==='success'?'bg-emerald-50 border-emerald-100 text-emerald-900':'bg-red-50 border-red-100 text-red-900'}`}>{notice.type==='success'?<CheckCircle2 size={16} className="shrink-0 mt-0.5"/>:<AlertCircle size={16} className="shrink-0 mt-0.5"/>}<span>{notice.text}</span></div>}

      {/* ── TAB BAR ── */}
      <div className="flex gap-1.5 p-1.5 bg-white rounded-2xl border border-black/5 shadow-sm mb-5 overflow-x-auto">
        {TABS.map(({id,label,Icon})=>(
          <button key={id} type="button" onClick={()=>setActiveTab(id)} className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition whitespace-nowrap ${activeTab===id?'bg-gradient-to-r from-[#FF8C00] to-[#FF5E00] text-white shadow-md':'text-[#64748b] hover:bg-[#f8fafc]'}`}>
            <Icon size={14}/>{label}
          </button>
        ))}
      </div>

      {/* ═══ TEACHERS TAB ═══ */}
      {activeTab==='teachers' && (
        <div className="space-y-5">
          <SectionTitle icon={Users} title="Teacher Management" count={teachers.length} action={<Btn onClick={()=>setShowTeacherModal(true)}><UserPlus size={13}/>Register Teacher</Btn>}/>

          {/* Workload Overview */}
          {workload.length>0 && (
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-4"><BarChart3 size={15} className="text-[#FF8C00]"/><span className="text-xs font-black uppercase tracking-widest text-[#0f172a]">Teacher Workload</span></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {workload.map(w=>{
                  const pct = w.utilization_pct||0;
                  const color = w.overloaded?'#ef4444':pct>80?'#f59e0b':pct>50?'#3b82f6':'#10b981';
                  return (
                    <div key={w.teacher_user_id} className="rounded-xl border border-black/5 p-3 hover:shadow-md transition">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-[#0f172a] truncate">{w.teacher_name}</span>
                        {w.overloaded && <Badge color="#ef4444">Overloaded</Badge>}
                      </div>
                      <div className="h-2 bg-[#f1f5f9] rounded-full overflow-hidden mb-1.5"><div className="h-full rounded-full transition-all" style={{width:`${Math.min(pct,100)}%`,background:color}}/></div>
                      <div className="flex justify-between text-[10px] text-[#94a3b8] font-bold"><span>{w.total_periods} periods</span><span>{pct}%</span></div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Teacher Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {teachers.map(t => {
              const profile = profileMap.get(t.id);
              const wl = workload.find(w=>w.teacher_user_id===t.id);
              return (
                <Card key={t.id} className="p-4 hover:shadow-md transition">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0f172a] to-[#334155] flex items-center justify-center text-white text-sm font-black">{(t.first_name||'')[0]}{(t.last_name||'')[0]}</div>
                      <div><p className="text-sm font-black text-[#0f172a]">{t.first_name} {t.last_name}</p><p className="text-[10px] text-[#94a3b8] font-mono">{t.email}</p></div>
                    </div>
                    <Badge color="#10b981">{t.role_code}</Badge>
                  </div>
                  {profile && (
                    <div className="space-y-2 mb-3">
                      {profile.subjects?.length>0 && <div className="flex flex-wrap gap-1">{profile.subjects.map(s=><span key={s} className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100">{s}</span>)}</div>}
                      <div className="flex gap-3 text-[10px] text-[#64748b] font-bold">
                        <span>Max {profile.max_periods_per_day}/day</span>
                        {profile.department && <span>Dept: {profile.department}</span>}
                      </div>
                    </div>
                  )}
                  {wl && <div className="text-[10px] font-bold text-[#94a3b8] mb-2">{wl.total_periods} periods · {wl.active_days} days</div>}
                  <div className="flex gap-2 justify-end">
                    <button type="button" onClick={()=>{setEditingProfile(t.id); const p=profileMap.get(t.id); setProfileForm({ subjects:p?.subjects||[], max_periods_per_day:p?.max_periods_per_day||6, available_days:p?.available_days||[], preferred_slots:p?.preferred_slots||[], department:p?.department||'' });}} className="text-[9px] font-black uppercase px-3 py-1.5 rounded-lg border border-[#FF8C00]/20 text-[#FF8C00] hover:bg-orange-50">Configure</button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ COURSES TAB ═══ */}
      {activeTab==='courses' && (
        <div className="space-y-5">
          <SectionTitle icon={BookOpen} title="Course / Subject Management" count={subjects.length} action={<Btn onClick={()=>setShowCourseModal(true)}><BookPlus size={13}/>New Course</Btn>}/>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {subjects.map(s => {
              const cfg = configMap.get(s.name);
              const pal = paletteForSubject(s.name);
              return (
                <Card key={s.id} className="p-4 hover:shadow-md transition" style={{borderLeftWidth:4,borderLeftColor:pal.title}}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div><p className="text-sm font-black" style={{color:pal.title}}>{s.name}</p><p className="text-[10px] text-[#94a3b8] font-bold">{s.category||'General'} {s.subject_code?`· ${s.subject_code}`:''}</p></div>
                    {cfg && <Badge color={PRIORITY_COLORS[cfg.priority_level]}>{cfg.priority_level}</Badge>}
                  </div>
                  {cfg && (
                    <div className="flex flex-wrap gap-2 mb-2 text-[10px] font-bold text-[#64748b]">
                      <span className="flex items-center gap-1"><Clock size={10}/>{cfg.default_duration_mins}min</span>
                      {cfg.requires_lab?<span className="flex items-center gap-1 text-purple-600"><FlaskConical size={10}/>Lab</span>:null}
                      {cfg.is_double_period?<span className="flex items-center gap-1 text-amber-600"><Layers size={10}/>Double</span>:null}
                      <span>{cfg.periods_per_week}x/week</span>
                    </div>
                  )}
                  <div className="flex justify-end">
                    <button type="button" onClick={()=>{setEditingCourseConfig(s.name); const c=configMap.get(s.name); setCourseConfigForm({ default_duration_mins:c?.default_duration_mins||40, requires_lab:!!c?.requires_lab, is_double_period:!!c?.is_double_period, priority_level:c?.priority_level||'medium', department:c?.department||'', periods_per_week:c?.periods_per_week||3 });}} className="text-[9px] font-black uppercase px-3 py-1.5 rounded-lg border border-[#FF8C00]/20 text-[#FF8C00] hover:bg-orange-50">Configure</button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ TIME SETTINGS TAB ═══ */}
      {activeTab==='schedule' && (
        <div className="space-y-5">
          <SectionTitle icon={Clock} title="School Time Settings" action={<Btn onClick={()=>setShowScheduleModal(true)}><Clock size={13}/>Configure Schedule</Btn>}/>

          {schedule ? (
            <Card className="p-5 max-w-3xl">
              <div className="flex items-center gap-2 mb-4"><Zap size={14} className="text-[#FF8C00]"/><span className="text-xs font-black uppercase tracking-widest text-[#0f172a]">Current Schedule</span></div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                <div className="rounded-xl bg-[#f8fafc] border border-black/5 p-3 text-center"><p className="text-[10px] font-black uppercase tracking-widest text-[#94a3b8] mb-1">Day Start</p><p className="text-sm font-black text-[#0f172a]">{fmt12(schedule.day_start_time)}</p></div>
                <div className="rounded-xl bg-[#f8fafc] border border-black/5 p-3 text-center"><p className="text-[10px] font-black uppercase tracking-widest text-[#94a3b8] mb-1">Day End</p><p className="text-sm font-black text-[#0f172a]">{fmt12(schedule.day_end_time)}</p></div>
                <div className="rounded-xl bg-[#f8fafc] border border-black/5 p-3 text-center"><p className="text-[10px] font-black uppercase tracking-widest text-[#94a3b8] mb-1">Period Duration</p><p className="text-sm font-black text-[#0f172a]">{schedule.period_duration_mins} min</p></div>
              </div>
              <div className="mb-4"><p className="text-[10px] font-black uppercase tracking-widest text-[#94a3b8] mb-2">Active Days</p><div className="flex flex-wrap gap-1.5">{(schedule.active_days||[]).map(d=><span key={d} className="px-3 py-1.5 rounded-lg bg-[#FF8C00]/10 text-[#FF8C00] text-[10px] font-black uppercase">{d.slice(0,3)}</span>)}</div></div>
              {schedule.breaks?.length>0 && <div><p className="text-[10px] font-black uppercase tracking-widest text-[#94a3b8] mb-2">Breaks</p><div className="flex flex-wrap gap-2">{schedule.breaks.map((b,i)=><span key={i} className="px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-[10px] font-bold text-amber-800">{b.name}: {fmt12(b.start)} – {fmt12(b.end)}</span>)}</div></div>}
            </Card>
          ) : (
            <Card className="p-10">
              <div className="text-center">
                <Clock size={40} className="mx-auto text-[#d1d5db] mb-3"/>
                <p className="text-sm font-black text-[#0f172a] mb-1">No Schedule Configured</p>
                <p className="text-xs text-[#94a3b8] mb-4">Click "Configure Schedule" to set up your school day times and breaks.</p>
                <Btn onClick={()=>setShowScheduleModal(true)}><Clock size={13}/>Configure Schedule</Btn>
              </div>
            </Card>
          )}

          {schedule?.generated_slots?.length>0 && (
            <Card className="p-5 max-w-3xl">
              <div className="flex items-center gap-2 mb-3"><Zap size={14} className="text-[#FF8C00]"/><span className="text-xs font-black uppercase tracking-widest text-[#0f172a]">Generated Time Slots</span><Badge color="#10b981">{schedule.generated_slots.length} slots</Badge></div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {schedule.generated_slots.map((s,i)=>(
                  <div key={i} className={`rounded-lg border p-2.5 text-center ${s.is_break?'bg-amber-50 border-amber-200':'bg-[#f8fafc] border-black/5'}`}>
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#94a3b8]">{s.period_name}</p>
                    <p className="text-sm font-black text-[#0f172a] mt-0.5">{fmt12(s.start_time)}</p>
                    <p className="text-[10px] text-[#94a3b8]">to {fmt12(s.end_time)}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ═══ ASSIGNMENTS TAB ═══ */}
      {activeTab==='assignments' && (
        <div className="space-y-5">
          <SectionTitle icon={ClipboardList} title="Course Assignments" count={assignments.length} action={<Btn onClick={()=>setShowAssignModal(true)}><Plus size={13}/>Assign Courses</Btn>}/>

          <Card className="overflow-hidden">
            <div className="px-4 py-3 border-b border-black/5 bg-[#f8fafc]">
              <select value={assignFilter} onChange={e=>setAssignFilter(e.target.value)} className="h-9 rounded-xl border border-black/10 px-3 text-xs font-semibold bg-white min-w-[180px]">
                <option value="">All Classes</option>
                {classOptions.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px]">
                <thead><tr className="text-[#94a3b8] font-black uppercase tracking-wider border-b border-black/5 bg-[#f8fafc]">
                  <th className="py-3 px-4">Class</th><th className="py-3 px-4">Subject</th><th className="py-3 px-4">Teacher</th><th className="py-3 px-4">Per/wk</th><th className="py-3 px-4 text-right">Remove</th>
                </tr></thead>
                <tbody>
                  {assignments.filter(a=>!assignFilter||a.class_name===assignFilter).length===0 && <tr><td colSpan={5} className="py-10 text-center text-[#94a3b8] font-bold">{assignFilter?`No assignments for ${assignFilter}.`:'No assignments yet. Click "Assign Courses" to get started.'}</td></tr>}
                  {assignments.filter(a=>!assignFilter||a.class_name===assignFilter).map(a=>(
                    <tr key={a.id} className="border-b border-black/5 hover:bg-[#f8fafc]">
                      <td className="py-2.5 px-4 font-bold text-[#0f172a]">{a.class_name}</td>
                      <td className="py-2.5 px-4"><span className="font-bold" style={{color:paletteForSubject(a.subject_name).title}}>{a.subject_name}</span></td>
                      <td className="py-2.5 px-4 font-bold text-[#64748b]">{a.teacher_name}</td>
                      <td className="py-2.5 px-4">{a.periods_per_week}</td>
                      <td className="py-2.5 px-4 text-right"><button type="button" onClick={()=>deleteAssignment(a.id)} className="p-1 rounded-lg text-red-400 hover:bg-red-50"><Trash2 size={12}/></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ═══ GENERATOR TAB ═══ */}
      {activeTab==='generator' && (
        <div className="space-y-5">
          <SectionTitle icon={Sparkles} title="Smart Timetable Generator"/>
          <Card className="p-5 sm:p-6 max-w-3xl">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 border border-blue-100 mb-5">
              <Shield size={18} className="text-blue-600 shrink-0 mt-0.5"/>
              <div className="text-xs text-blue-800"><p className="font-bold mb-1">AI Smart Rules Applied:</p>
                <ul className="space-y-0.5 text-[11px]">
                  <li>✓ No teacher conflict (same teacher, same time)</li>
                  <li>✓ No duplicate subject at same time slot</li>
                  <li>✓ Respect teacher max periods per day</li>
                  <li>✓ Respect teacher available days</li>
                  <li>✓ High priority subjects placed first (morning)</li>
                  <li>✓ Spread subjects across the week</li>
                </ul>
              </div>
            </div>
            <div className="mb-5">
              <label className="block text-[10px] font-black uppercase tracking-widest text-[#94a3b8] mb-1">Select Class to Generate</label>
              <select value={genClass} onChange={e=>setGenClass(e.target.value)} className="w-full h-11 rounded-xl border border-black/10 px-3 text-sm font-semibold bg-white">
                <option value="">Choose class...</option>
                {classOptions.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <Btn onClick={runGenerator} disabled={saving||!genClass}>{saving?<Loader2 size={13} className="animate-spin"/>:<Sparkles size={13}/>}Generate Timetable</Btn>
          </Card>

          {generatedResult && (
            <Card className="p-5">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-500"/><span className="text-sm font-black text-[#0f172a]">Generated: {generatedResult.stats?.total} entries for {genClass}</span></div>
                <Btn onClick={applyGenerated} disabled={saving}><Check size={13}/>Apply to Timetable</Btn>
              </div>
              {generatedResult.conflicts?.length>0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 mb-4">
                  <p className="text-xs font-bold text-amber-800 flex items-center gap-1.5 mb-2"><AlertTriangle size={14}/>Conflicts ({generatedResult.conflicts.length})</p>
                  <div className="space-y-1">{generatedResult.conflicts.map((c,i)=><p key={i} className="text-[10px] text-amber-700">• {c.type}: {c.subject||''} {c.day||''} {c.time||''}</p>)}</div>
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead><tr className="text-[#94a3b8] font-black uppercase tracking-wider border-b border-black/5"><th className="py-2 px-3 text-left">Day</th><th className="py-2 px-3 text-left">Time</th><th className="py-2 px-3 text-left">Subject</th><th className="py-2 px-3 text-left">Class</th></tr></thead>
                  <tbody>{generatedResult.generated?.map((e,i)=><tr key={i} className="border-b border-black/5"><td className="py-2 px-3 font-bold">{e.day_of_week}</td><td className="py-2 px-3 font-mono">{normalizeTime(e.start_time)}–{normalizeTime(e.end_time)}</td><td className="py-2 px-3 font-bold" style={{color:paletteForSubject(e.subject_name).title}}>{e.subject_name}</td><td className="py-2 px-3">{e.class_name}</td></tr>)}</tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Existing timetable for selected class */}
          {genClass && !generatedResult && rows.filter(r=>r.class_name===genClass).length>0 && (
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-4"><Calendar size={16} className="text-[#FF8C00]"/><span className="text-sm font-black text-[#0f172a]">Current Timetable for {genClass}</span><Badge color="#3b82f6">{rows.filter(r=>r.class_name===genClass).length} lessons</Badge></div>
              <div className="overflow-x-auto">
                <div className="grid gap-3 min-w-[980px]" style={{gridTemplateColumns:`repeat(${Math.min(WEEK_DAYS.length, scheduleForm.active_days?.length||5)},1fr)`}}>
                  {(scheduleForm.active_days?.length?scheduleForm.active_days.filter(d=>WEEK_DAYS.includes(d)):WEEK_DAYS).map(day=>(
                    <div key={day} className="bg-[#eef0f4] rounded-2xl border border-black/10 shadow-sm overflow-hidden">
                      <div className="px-3 py-3 border-b border-black/10 text-center text-sm font-bold tracking-tight text-[#0f172a]">{day}</div>
                      <div className="p-2 space-y-2 bg-[#f4f5f7]">
                        {displayPeriods.map(period=>{
                          const lesson=rows.find(r=>r.class_name===genClass&&r.day_of_week===day&&normalizeTime(r.start_time)===normalizeTime(period.start_time));
                          const isBreak=Boolean(period.is_break)||String(period.period_name||'').toLowerCase().match(/break|lunch|free/);
                          const pal=lesson?paletteForSubject(lesson.subject_name):null;
                          return (
                            <div key={`${day}-${period.sort_order}`} className={`rounded-lg border p-2.5 min-h-[60px] ${isBreak?'bg-[#eceff3] border-[#e1e5ea]':lesson?'shadow-sm':'bg-white border-[#e3e7ed]'}`} style={lesson?{backgroundColor:pal.bg,borderColor:pal.border}:undefined}>
                              <div className="flex items-center justify-between"><span className="text-[9px] font-black uppercase tracking-widest text-[#b3bac5]">{period.period_name}</span><span className="text-[9px] font-black text-[#c1c7d0]">{normalizeTime(period.start_time)}–{normalizeTime(period.end_time)}</span></div>
                              {isBreak?<div className="text-[10px] font-black uppercase text-[#9ca3af] mt-1">{String(period.period_name).toUpperCase()}</div>
                              :lesson?<div className="mt-1"><p className="text-[12px] font-black uppercase tracking-tight break-words" style={{color:pal.title}}>{lesson.subject_name}</p>{lesson.teacher_name&&<p className="text-[9px] text-[#94a3b8] mt-0.5">{lesson.teacher_name}</p>}</div>
                              :<div className="mt-2 text-[9px] text-[#c1c7d0] text-center font-bold">—</div>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ═══ TIMETABLE TAB ═══ */}
      {activeTab==='timetable' && (
        <div className="space-y-5">
          {/* Class selector */}
          <Card className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-[#94a3b8]">Select Class</label>
              <select value={filters.class_name} onChange={e=>setFilters(p=>({...p,class_name:e.target.value}))} className="h-11 min-w-[220px] rounded-xl border border-black/10 px-3 text-sm font-semibold bg-white">
                <option value="">Choose a class...</option>
                {classOptions.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
              {filters.class_name && (
                <Btn variant="danger" onClick={()=>deleteClassTimetable(filters.class_name)} disabled={saving || rows.filter(r=>r.class_name===filters.class_name).length===0}>
                  <Trash2 size={13}/>Delete All for {filters.class_name}
                </Btn>
              )}
            </div>
          </Card>

          {/* Class Timetable Overview */}
          {classTimetableCounts.length > 0 && (
            <Card className="overflow-hidden">
              <div className="px-4 sm:px-5 py-3 border-b border-black/5 bg-[#f8fafc] flex items-center gap-2">
                <Layers size={14} className="text-[#FF8C00]"/>
                <span className="text-xs font-black uppercase tracking-widest text-[#0f172a]">Classes Timetable Overview</span>
                <Badge color="#3b82f6">{classTimetableCounts.length} classes</Badge>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px]">
                  <thead><tr className="text-[#94a3b8] font-black uppercase tracking-wider border-b border-black/5 bg-[#f8fafc]">
                    <th className="py-3 px-4">Class</th><th className="py-3 px-4 text-center">Timetable Entries</th><th className="py-3 px-4 text-right">Actions</th>
                  </tr></thead>
                  <tbody>
                    {classTimetableCounts.map(([className, count]) => (
                      <tr key={className} className="border-b border-black/5 hover:bg-[#f8fafc]">
                        <td className="py-2.5 px-4 font-bold text-[#0f172a]">{className}</td>
                        <td className="py-2.5 px-4 text-center"><Badge color={count>0?'#10b981':'#94a3b8'}>{count} {count===1?'entry':'entries'}</Badge></td>
                        <td className="py-2.5 px-4 text-right flex items-center justify-end gap-2">
                          <button type="button" onClick={()=>setFilters(p=>({...p,class_name:className}))} className="text-[9px] font-black uppercase px-3 py-1.5 rounded-lg border border-[#FF8C00]/20 text-[#FF8C00] hover:bg-orange-50">View</button>
                          <button type="button" onClick={()=>deleteClassTimetable(className)} disabled={saving} className="text-[9px] font-black uppercase px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50">Delete All</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {!filters.class_name ? (
            <Card className="p-10">
              <div className="text-center">
                <Calendar size={40} className="mx-auto text-[#d1d5db] mb-3"/>
                <p className="text-sm font-black text-[#0f172a] mb-1">Select a Class to View Timetable</p>
                <p className="text-xs text-[#94a3b8]">Choose a class above to see its weekly timetable grid.</p>
              </div>
            </Card>
          ) : (
            <>
              {/* Filters */}
              <Card className="p-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]"/><input value={filters.q} onChange={e=>setFilters(p=>({...p,q:e.target.value}))} placeholder="Search..." className="w-full h-10 pl-9 pr-3 rounded-xl border border-black/10 text-sm font-semibold"/></div>
                  <select value={filters.staff_id} onChange={e=>setFilters(p=>({...p,staff_id:e.target.value}))} className="h-10 rounded-xl border border-black/10 px-3 text-sm font-semibold bg-white"><option value="">All Teachers</option>{teachers.map(t=><option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}</select>
                  <select value={filters.day_of_week} onChange={e=>setFilters(p=>({...p,day_of_week:e.target.value}))} className="h-10 rounded-xl border border-black/10 px-3 text-sm font-semibold bg-white"><option value="">All Days</option>{ALL_DAYS.map(d=><option key={d} value={d}>{d}</option>)}</select>
                </div>
              </Card>

              {/* Header */}
              <div className="flex items-center justify-between px-1">
                <span className="text-sm font-black text-[#0f172a] uppercase tracking-widest">Timetable — {filters.class_name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-[#94a3b8]">{filteredRows.length} lessons</span>
                  <span className="text-[9px] font-bold text-[#c1c7d0] bg-[#f1f5f9] px-2 py-1 rounded-lg">Drag & drop to reschedule</span>
                </div>
              </div>

              {/* DnD Timetable Grid */}
              {displayPeriods.length===0?(
                <Card className="p-14 text-center">
                  <p className="text-sm font-bold text-[#94a3b8]">No periods configured. Go to Time Settings tab first.</p>
                </Card>
              ):(
                <DndTimetableGrid
                  rows={rows}
                  periods={displayPeriods}
                  activeDays={scheduleForm.active_days}
                  filterClassName={filters.class_name}
                  teachers={teachers}
                  onUpdate={updateTTInline}
                  onDelete={deleteTTRow}
                  onEdit={openEditTT}
                  onDuplicate={duplicateTTRow}
                  onCreateAt={openCreateTT}
                  flash={flash}
                />
              )}
            </>
          )}
        </div>
      )}

      {/* ═══════ MODALS ═══════ */}

      {/* New Teacher Modal */}
      {showTeacherModal && (
        <div className="fixed inset-0 z-[2000] bg-black/50 p-3 sm:p-6 flex items-center justify-center">
          <form onSubmit={submitNewTeacher} className="w-full max-w-lg bg-white rounded-3xl shadow-xl border border-black/5 overflow-hidden">
            <div className="px-5 py-4 border-b border-black/5 flex items-center justify-between"><h3 className="text-sm font-black uppercase tracking-widest">New Teacher Account</h3><button type="button" onClick={()=>setShowTeacherModal(false)} className="p-2 rounded-lg hover:bg-[#f8fafc]"><X size={16}/></button></div>
            <div className="p-5 space-y-3">
              <p className="text-[10px] text-[#94a3b8] font-bold">Creates a Teacher login and sends a temporary password by email.</p>
              <div className="grid grid-cols-2 gap-3">
                <input required value={newTeacher.first_name} onChange={e=>setNewTeacher(p=>({...p,first_name:e.target.value}))} placeholder="First name" className="h-10 rounded-xl border border-black/10 px-3 text-sm font-semibold"/>
                <input required value={newTeacher.last_name} onChange={e=>setNewTeacher(p=>({...p,last_name:e.target.value}))} placeholder="Last name" className="h-10 rounded-xl border border-black/10 px-3 text-sm font-semibold"/>
              </div>
              <input required type="email" value={newTeacher.email} onChange={e=>setNewTeacher(p=>({...p,email:e.target.value}))} placeholder="Work email (receives temporary password)" className="w-full h-10 rounded-xl border border-black/10 px-3 text-sm font-semibold"/>
              <input required value={newTeacher.username} onChange={e=>setNewTeacher(p=>({...p,username:e.target.value}))} placeholder="Username (login)" className="w-full h-10 rounded-xl border border-black/10 px-3 text-sm font-semibold"/>
              <div className="grid grid-cols-2 gap-3">
                <input value={newTeacher.phone} onChange={e=>setNewTeacher(p=>({...p,phone:e.target.value}))} placeholder="Phone (optional)" className="h-10 rounded-xl border border-black/10 px-3 text-sm font-semibold"/>
                <input value={newTeacher.staff_id} onChange={e=>setNewTeacher(p=>({...p,staff_id:e.target.value}))} placeholder="Staff ID label (optional)" className="h-10 rounded-xl border border-black/10 px-3 text-sm font-semibold"/>
              </div>
            </div>
            <div className="px-5 py-4 border-t border-black/5 bg-[#f8fafc] flex justify-end gap-2">
              <Btn variant="ghost" onClick={()=>setShowTeacherModal(false)}>Cancel</Btn>
              <Btn type="submit" disabled={saving}>{saving&&<Loader2 size={13} className="animate-spin"/>}Create Teacher</Btn>
            </div>
          </form>
        </div>
      )}

      {/* Teacher Profile Config Modal */}
      {editingProfile && (
        <div className="fixed inset-0 z-[2000] bg-black/50 p-3 sm:p-6 flex items-center justify-center">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl border border-black/5 overflow-hidden">
            <div className="px-5 py-4 border-b border-black/5 flex items-center justify-between"><h3 className="text-sm font-black uppercase tracking-widest">Teacher Timetable Profile</h3><button type="button" onClick={()=>setEditingProfile(null)} className="p-2 rounded-lg hover:bg-[#f8fafc]"><X size={16}/></button></div>
            <div className="p-5 space-y-4">
              <div><label className="block text-[10px] font-black uppercase tracking-widest text-[#94a3b8] mb-1">Subjects (select multiple)</label>
                <div className="flex flex-wrap gap-1.5">{subjects.map(s=><button key={s.id} type="button" onClick={()=>setProfileForm(p=>({...p,subjects:p.subjects.includes(s.name)?p.subjects.filter(x=>x!==s.name):[...p.subjects,s.name]}))} className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition ${profileForm.subjects.includes(s.name)?'bg-[#FF8C00] text-white':'bg-[#f1f5f9] text-[#64748b] hover:bg-[#e2e8f0]'}`}>{s.name}</button>)}</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-[10px] font-black uppercase tracking-widest text-[#94a3b8] mb-1">Max Periods/Day</label><input type="number" min={1} max={12} value={profileForm.max_periods_per_day} onChange={e=>setProfileForm(p=>({...p,max_periods_per_day:Number(e.target.value)}))} className="w-full h-10 rounded-xl border border-black/10 px-3 text-sm font-semibold"/></div>
                <div><label className="block text-[10px] font-black uppercase tracking-widest text-[#94a3b8] mb-1">Department</label><input value={profileForm.department} onChange={e=>setProfileForm(p=>({...p,department:e.target.value}))} className="w-full h-10 rounded-xl border border-black/10 px-3 text-sm font-semibold" placeholder="e.g. Sciences"/></div>
              </div>
              <div><label className="block text-[10px] font-black uppercase tracking-widest text-[#94a3b8] mb-1">Available Days</label>
                <div className="flex flex-wrap gap-1.5">{ALL_DAYS.map(d=><button key={d} type="button" onClick={()=>setProfileForm(p=>({...p,available_days:p.available_days.includes(d)?p.available_days.filter(x=>x!==d):[...p.available_days,d]}))} className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition ${profileForm.available_days.includes(d)?'bg-[#3b82f6] text-white':'bg-[#f1f5f9] text-[#64748b] hover:bg-[#e2e8f0]'}`}>{d.slice(0,3)}</button>)}</div>
                <p className="text-[9px] text-[#94a3b8] mt-1">Leave empty = available all days</p>
              </div>
            </div>
            <div className="px-5 py-4 border-t border-black/5 bg-[#f8fafc] flex justify-end gap-2">
              <Btn variant="ghost" onClick={()=>setEditingProfile(null)}>Cancel</Btn>
              <Btn onClick={()=>saveProfile(editingProfile)} disabled={saving}>{saving&&<Loader2 size={13} className="animate-spin"/>}Save Profile</Btn>
            </div>
          </div>
        </div>
      )}

      {/* Course Config Modal */}
      {editingCourseConfig && (
        <div className="fixed inset-0 z-[2000] bg-black/50 p-3 sm:p-6 flex items-center justify-center">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-black/5 overflow-hidden">
            <div className="px-5 py-4 border-b border-black/5 flex items-center justify-between"><h3 className="text-sm font-black uppercase tracking-widest">Course Config: {editingCourseConfig}</h3><button type="button" onClick={()=>setEditingCourseConfig(null)} className="p-2 rounded-lg hover:bg-[#f8fafc]"><X size={16}/></button></div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-[10px] font-black uppercase tracking-widest text-[#94a3b8] mb-1">Duration (min)</label><input type="number" min={20} max={120} value={courseConfigForm.default_duration_mins} onChange={e=>setCourseConfigForm(p=>({...p,default_duration_mins:Number(e.target.value)}))} className="w-full h-10 rounded-xl border border-black/10 px-3 text-sm font-semibold"/></div>
                <div><label className="block text-[10px] font-black uppercase tracking-widest text-[#94a3b8] mb-1">Periods/Week</label><input type="number" min={1} max={10} value={courseConfigForm.periods_per_week} onChange={e=>setCourseConfigForm(p=>({...p,periods_per_week:Number(e.target.value)}))} className="w-full h-10 rounded-xl border border-black/10 px-3 text-sm font-semibold"/></div>
              </div>
              <div><label className="block text-[10px] font-black uppercase tracking-widest text-[#94a3b8] mb-1">Priority Level</label>
                <div className="flex gap-2">{Object.entries(PRIORITY_LABELS).map(([k,v])=><button key={k} type="button" onClick={()=>setCourseConfigForm(p=>({...p,priority_level:k}))} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase transition ${courseConfigForm.priority_level===k?'text-white shadow-md':'bg-[#f1f5f9] text-[#64748b]'}`} style={courseConfigForm.priority_level===k?{background:PRIORITY_COLORS[k]}:undefined}>{v}</button>)}</div>
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer"><input type="checkbox" checked={courseConfigForm.requires_lab} onChange={e=>setCourseConfigForm(p=>({...p,requires_lab:e.target.checked}))}/><FlaskConical size={14} className="text-purple-500"/>Requires Lab</label>
                <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer"><input type="checkbox" checked={courseConfigForm.is_double_period} onChange={e=>setCourseConfigForm(p=>({...p,is_double_period:e.target.checked}))}/><Layers size={14} className="text-amber-500"/>Double Period</label>
              </div>
              <div><label className="block text-[10px] font-black uppercase tracking-widest text-[#94a3b8] mb-1">Department</label><input value={courseConfigForm.department} onChange={e=>setCourseConfigForm(p=>({...p,department:e.target.value}))} className="w-full h-10 rounded-xl border border-black/10 px-3 text-sm font-semibold" placeholder="e.g. Languages"/></div>
            </div>
            <div className="px-5 py-4 border-t border-black/5 bg-[#f8fafc] flex justify-end gap-2">
              <Btn variant="ghost" onClick={()=>setEditingCourseConfig(null)}>Cancel</Btn>
              <Btn onClick={()=>saveCourseConfig(editingCourseConfig)} disabled={saving}>{saving&&<Loader2 size={13} className="animate-spin"/>}Save Config</Btn>
            </div>
          </div>
        </div>
      )}

      {/* New Course Modal */}
      {showCourseModal && (
        <div className="fixed inset-0 z-[2000] bg-black/50 p-3 sm:p-6 flex items-center justify-center">
          <form onSubmit={submitNewCourse} className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-black/5 overflow-hidden">
            <div className="px-5 py-4 border-b border-black/5 flex items-center justify-between"><h3 className="text-sm font-black uppercase tracking-widest">Create Course</h3><button type="button" onClick={()=>setShowCourseModal(false)} className="p-2 rounded-lg hover:bg-[#f8fafc]"><X size={16}/></button></div>
            <div className="p-5 space-y-3">
              <input required value={newCourse.name} onChange={e=>setNewCourse(p=>({...p,name:e.target.value}))} placeholder="Course name" className="w-full h-10 rounded-xl border border-black/10 px-3 text-sm font-semibold"/>
              <div className="grid grid-cols-2 gap-3">
                <input value={newCourse.category} onChange={e=>setNewCourse(p=>({...p,category:e.target.value}))} placeholder="Category" className="h-10 rounded-xl border border-black/10 px-3 text-sm font-semibold"/>
                <input value={newCourse.subject_code} onChange={e=>setNewCourse(p=>({...p,subject_code:e.target.value}))} placeholder="Code" className="h-10 rounded-xl border border-black/10 px-3 text-sm font-semibold"/>
              </div>
            </div>
            <div className="px-5 py-4 border-t border-black/5 bg-[#f8fafc] flex justify-end gap-2">
              <Btn variant="ghost" onClick={()=>setShowCourseModal(false)}>Cancel</Btn>
              <Btn type="submit" disabled={saving}>{saving&&<Loader2 size={13} className="animate-spin"/>}Save Course</Btn>
            </div>
          </form>
        </div>
      )}

      {/* Assign Courses Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-[2000] bg-black/50 p-3 sm:p-6 flex items-center justify-center overflow-y-auto">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl border border-black/5 overflow-hidden my-4">
            <div className="px-5 py-4 border-b border-black/5 flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-widest">Assign Courses to Class</h3>
              <button type="button" onClick={()=>setShowAssignModal(false)} className="p-2 rounded-lg hover:bg-[#f8fafc]"><X size={16}/></button>
            </div>
            <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
              <p className="text-[11px] text-[#94a3b8] font-bold">Select a class, choose courses they learn, pick teachers — the system creates all assignments automatically.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-[#94a3b8] mb-1.5">Class</label>
                  <select value={bulkAssign.class_name} onChange={e=>setBulkAssign(p=>({...p,class_name:e.target.value}))} className="w-full h-11 rounded-xl border border-black/10 px-3 text-sm font-semibold bg-white">
                    <option value="">Select class...</option>
                    {classOptions.map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-[#94a3b8] mb-1.5">Periods per Week (each)</label>
                  <input type="number" min={1} max={10} value={bulkAssign.periods_per_week} onChange={e=>setBulkAssign(p=>({...p,periods_per_week:Number(e.target.value)}))} className="w-full h-11 rounded-xl border border-black/10 px-3 text-sm font-semibold"/>
                </div>
              </div>

              {/* Courses searchable dropdown */}
              <div id="course-dropdown-wrap">
                <label className="block text-[10px] font-black uppercase tracking-widest text-[#94a3b8] mb-1.5">Courses (select multiple)</label>
                <div className="relative">
                  <div className="w-full min-h-[44px] rounded-xl border border-black/10 px-3 py-2 bg-white flex flex-wrap gap-1.5 items-center cursor-text" onClick={()=>document.getElementById('course-search-input')?.focus()}>
                    {bulkAssign.selectedSubjects.map(name=>(
                      <span key={name} className="inline-flex items-center gap-1 bg-[#FF8C00] text-white text-[10px] font-bold px-2 py-1 rounded-lg">
                        {name}
                        <button type="button" onClick={(e)=>{e.stopPropagation();setBulkAssign(p=>({...p,selectedSubjects:p.selectedSubjects.filter(x=>x!==name)}));}} className="hover:bg-white/20 rounded-full p-0.5"><X size={10}/></button>
                      </span>
                    ))}
                    <input id="course-search-input" value={bulkAssign._courseSearch||''} onChange={e=>setBulkAssign(p=>({...p,_courseSearch:e.target.value}))} onFocus={()=>setBulkAssign(p=>({...p,_courseOpen:true}))} placeholder={bulkAssign.selectedSubjects.length?'':'Search courses...'} className="flex-1 min-w-[100px] text-sm font-semibold outline-none bg-transparent h-7"/>
                  </div>
                  {bulkAssign._courseOpen && (
                    <div className="absolute z-50 left-0 right-0 mt-1 bg-white rounded-xl border border-black/10 shadow-lg max-h-[200px] overflow-y-auto">
                      {subjects.filter(s=>{const q=(bulkAssign._courseSearch||'').toLowerCase(); return !q||s.name.toLowerCase().includes(q);}).map(s=>{
                        const sel=bulkAssign.selectedSubjects.includes(s.name);
                        return <button key={s.id} type="button" onClick={()=>setBulkAssign(p=>({...p,selectedSubjects:sel?p.selectedSubjects.filter(x=>x!==s.name):[...p.selectedSubjects,s.name],_courseSearch:'',_courseOpen:true}))} className={`w-full text-left px-4 py-2.5 text-sm font-semibold flex items-center justify-between hover:bg-[#f8fafc] transition ${sel?'bg-[#FFF7ED]':''}`}>
                          <span>{s.name}</span>
                          {sel&&<Check size={14} className="text-[#FF8C00]"/>}
                        </button>;
                      })}
                      {subjects.filter(s=>{const q=(bulkAssign._courseSearch||'').toLowerCase(); return !q||s.name.toLowerCase().includes(q);}).length===0 && <p className="px-4 py-3 text-xs text-[#94a3b8] font-bold">No courses found</p>}
                    </div>
                  )}
                </div>
                {bulkAssign.selectedSubjects.length>0 && <p className="text-[10px] text-[#FF8C00] font-bold mt-1.5">{bulkAssign.selectedSubjects.length} course{bulkAssign.selectedSubjects.length>1?'s':''} selected</p>}
              </div>

              {/* Teachers searchable dropdown */}
              <div id="teacher-dropdown-wrap">
                <label className="block text-[10px] font-black uppercase tracking-widest text-[#94a3b8] mb-1.5">Teachers (select multiple)</label>
                <div className="relative">
                  <div className="w-full min-h-[44px] rounded-xl border border-black/10 px-3 py-2 bg-white flex flex-wrap gap-1.5 items-center cursor-text" onClick={()=>document.getElementById('teacher-search-input')?.focus()}>
                    {bulkAssign.selectedTeachers.map(tid=>{
                      const t=teachers.find(x=>String(x.id)===tid);
                      return t ? (
                        <span key={tid} className="inline-flex items-center gap-1 bg-[#0f172a] text-white text-[10px] font-bold px-2 py-1 rounded-lg">
                          {t.first_name} {t.last_name}
                          <button type="button" onClick={(e)=>{e.stopPropagation();setBulkAssign(p=>({...p,selectedTeachers:p.selectedTeachers.filter(x=>x!==tid)}));}} className="hover:bg-white/20 rounded-full p-0.5"><X size={10}/></button>
                        </span>
                      ) : null;
                    })}
                    <input id="teacher-search-input" value={bulkAssign._teacherSearch||''} onChange={e=>setBulkAssign(p=>({...p,_teacherSearch:e.target.value}))} onFocus={()=>setBulkAssign(p=>({...p,_teacherOpen:true}))} placeholder={bulkAssign.selectedTeachers.length?'':'Search teachers...'} className="flex-1 min-w-[100px] text-sm font-semibold outline-none bg-transparent h-7"/>
                  </div>
                  {bulkAssign._teacherOpen && (
                    <div className="absolute z-50 left-0 right-0 mt-1 bg-white rounded-xl border border-black/10 shadow-lg max-h-[200px] overflow-y-auto">
                      {teachers.filter(t=>{const q=(bulkAssign._teacherSearch||'').toLowerCase(); const name=`${t.first_name} ${t.last_name}`.toLowerCase(); return !q||name.includes(q);}).map(t=>{
                        const tid=String(t.id);
                        const sel=bulkAssign.selectedTeachers.includes(tid);
                        return <button key={t.id} type="button" onClick={()=>setBulkAssign(p=>({...p,selectedTeachers:sel?p.selectedTeachers.filter(x=>x!==tid):[...p.selectedTeachers,tid],_teacherSearch:'',_teacherOpen:true}))} className={`w-full text-left px-4 py-2.5 text-sm font-semibold flex items-center justify-between hover:bg-[#f8fafc] transition ${sel?'bg-[#f1f5f9]':''}`}>
                          <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-lg bg-[#e2e8f0] flex items-center justify-center text-[10px] font-black text-[#64748b]">{(t.first_name||'')[0]}{(t.last_name||'')[0]}</span>
                            <span>{t.first_name} {t.last_name}</span>
                          </div>
                          {sel&&<Check size={14} className="text-[#0f172a]"/>}
                        </button>;
                      })}
                      {teachers.filter(t=>{const q=(bulkAssign._teacherSearch||'').toLowerCase(); const name=`${t.first_name} ${t.last_name}`.toLowerCase(); return !q||name.includes(q);}).length===0 && <p className="px-4 py-3 text-xs text-[#94a3b8] font-bold">No teachers found</p>}
                    </div>
                  )}
                </div>
                {bulkAssign.selectedTeachers.length>0 && <p className="text-[10px] text-[#0f172a] font-bold mt-1.5">{bulkAssign.selectedTeachers.length} teacher{bulkAssign.selectedTeachers.length>1?'s':''} selected</p>}
              </div>
            </div>
            <div className="px-5 py-4 border-t border-black/5 bg-[#f8fafc] flex items-center justify-between gap-3">
              <span className="text-[10px] text-[#94a3b8] font-bold">Will create {bulkAssign.selectedSubjects.length * bulkAssign.selectedTeachers.length} assignment{bulkAssign.selectedSubjects.length * bulkAssign.selectedTeachers.length!==1?'s':''}</span>
              <div className="flex gap-2">
                <Btn variant="ghost" onClick={()=>setShowAssignModal(false)}>Cancel</Btn>
                <Btn onClick={submitBulkAssignment} disabled={saving||!bulkAssign.class_name||!bulkAssign.selectedSubjects.length||!bulkAssign.selectedTeachers.length}>{saving?<Loader2 size={13} className="animate-spin"/>:<Plus size={13}/>}Save Assignments</Btn>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Settings Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-[2000] bg-black/50 p-3 sm:p-6 flex items-center justify-center overflow-y-auto">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl border border-black/5 overflow-hidden my-4">
            <div className="px-5 py-4 border-b border-black/5 flex items-center justify-between"><h3 className="text-sm font-black uppercase tracking-widest">School Time Settings</h3><button type="button" onClick={()=>setShowScheduleModal(false)} className="p-2 rounded-lg hover:bg-[#f8fafc]"><X size={16}/></button></div>
            <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
              <p className="text-xs text-[#94a3b8] font-bold">Configure your school day once. The system will automatically generate time slots.</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div><label className="block text-[10px] font-black uppercase tracking-widest text-[#94a3b8] mb-1">Day Start</label><input type="time" value={scheduleForm.day_start_time} onChange={e=>setScheduleForm(p=>({...p,day_start_time:e.target.value}))} className="w-full h-10 rounded-xl border border-black/10 px-3 text-sm font-semibold"/></div>
                <div><label className="block text-[10px] font-black uppercase tracking-widest text-[#94a3b8] mb-1">Day End</label><input type="time" value={scheduleForm.day_end_time} onChange={e=>setScheduleForm(p=>({...p,day_end_time:e.target.value}))} className="w-full h-10 rounded-xl border border-black/10 px-3 text-sm font-semibold"/></div>
                <div><label className="block text-[10px] font-black uppercase tracking-widest text-[#94a3b8] mb-1">Period Duration (min)</label><input type="number" min={20} max={120} value={scheduleForm.period_duration_mins} onChange={e=>setScheduleForm(p=>({...p,period_duration_mins:Number(e.target.value)}))} className="w-full h-10 rounded-xl border border-black/10 px-3 text-sm font-semibold"/></div>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-[#94a3b8] mb-2">Active Days</label>
                <div className="flex flex-wrap gap-2">
                  {ALL_DAYS.map(d=><button key={d} type="button" onClick={()=>setScheduleForm(p=>({...p,active_days:p.active_days.includes(d)?p.active_days.filter(x=>x!==d):[...p.active_days,d]}))} className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition ${scheduleForm.active_days.includes(d)?'bg-[#FF8C00] text-white shadow-md':'bg-[#f1f5f9] text-[#64748b] hover:bg-[#e2e8f0]'}`}>{d.slice(0,3)}</button>)}
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-[#94a3b8] mb-2">Breaks</label>
                {scheduleForm.breaks.map((b,i) => (
                  <div key={i} className="flex items-center gap-2 mb-2">
                    <input value={b.name} onChange={e=>{const n=[...scheduleForm.breaks]; n[i]={...n[i],name:e.target.value}; setScheduleForm(p=>({...p,breaks:n}));}} className="h-9 rounded-lg border border-black/10 px-2 text-sm font-semibold w-28" placeholder="Name"/>
                    <input type="time" value={b.start} onChange={e=>{const n=[...scheduleForm.breaks]; n[i]={...n[i],start:e.target.value}; setScheduleForm(p=>({...p,breaks:n}));}} className="h-9 rounded-lg border border-black/10 px-2 text-sm font-semibold"/>
                    <input type="time" value={b.end} onChange={e=>{const n=[...scheduleForm.breaks]; n[i]={...n[i],end:e.target.value}; setScheduleForm(p=>({...p,breaks:n}));}} className="h-9 rounded-lg border border-black/10 px-2 text-sm font-semibold"/>
                    <button type="button" onClick={()=>setScheduleForm(p=>({...p,breaks:p.breaks.filter((_,j)=>j!==i)}))} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50"><X size={14}/></button>
                  </div>
                ))}
                <button type="button" onClick={()=>setScheduleForm(p=>({...p,breaks:[...p.breaks,{name:'Break',start:'10:30',end:'11:00'}]}))} className="text-[10px] font-black text-[#FF8C00] hover:underline flex items-center gap-1 mt-1"><Plus size={12}/>Add break</button>
              </div>
            </div>
            <div className="px-5 py-4 border-t border-black/5 bg-[#f8fafc] flex justify-end gap-2">
              <Btn variant="ghost" onClick={()=>setShowScheduleModal(false)}>Cancel</Btn>
              <Btn onClick={async()=>{await saveSchedule(); setShowScheduleModal(false);}} disabled={saving}>{saving&&<Loader2 size={13} className="animate-spin"/>}Save & Generate Slots</Btn>
            </div>
          </div>
        </div>
      )}

      {/* Timetable Entry Modal */}
      {showTTModal && (
        <div className="fixed inset-0 z-[2000] bg-black/50 p-3 sm:p-6 flex items-center justify-center">
          <form onSubmit={submitTT} className="w-full max-w-xl bg-white rounded-3xl shadow-xl border border-black/5 overflow-hidden">
            <div className="px-5 py-4 border-b border-black/5 flex items-center justify-between"><h3 className="text-sm font-black uppercase tracking-widest">{editingRow?'Edit Period':'Add Period'}</h3><button type="button" onClick={()=>setShowTTModal(false)} className="p-2 rounded-lg hover:bg-[#f8fafc]"><X size={16}/></button></div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-[10px] font-black uppercase tracking-widest text-[#94a3b8] mb-1">Class</label><input required list="tt-class-list" value={ttForm.class_name} onChange={e=>setTTForm(p=>({...p,class_name:e.target.value}))} className="w-full h-10 rounded-xl border border-black/10 px-3 text-sm font-semibold"/><datalist id="tt-class-list">{classOptions.map(c=><option key={c} value={c}/>)}</datalist></div>
                <div><label className="block text-[10px] font-black uppercase tracking-widest text-[#94a3b8] mb-1">Subject</label><select required value={ttForm.subject_name} onChange={e=>setTTForm(p=>({...p,subject_name:e.target.value}))} className="w-full h-10 rounded-xl border border-black/10 px-3 text-sm font-semibold bg-white"><option value="">Select</option>{subjects.map(s=><option key={s.id} value={s.name}>{s.name}</option>)}</select></div>
              </div>
              <div><label className="block text-[10px] font-black uppercase tracking-widest text-[#94a3b8] mb-1">Teacher</label><select required value={ttForm.staff_id} onChange={e=>setTTForm(p=>({...p,staff_id:e.target.value}))} className="w-full h-10 rounded-xl border border-black/10 px-3 text-sm font-semibold bg-white"><option value="">Select</option>{teachers.map(t=><option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}</select></div>
              <div className="grid grid-cols-4 gap-3">
                <div><label className="block text-[10px] font-black uppercase tracking-widest text-[#94a3b8] mb-1">Day</label><select value={ttForm.day_of_week} onChange={e=>setTTForm(p=>({...p,day_of_week:e.target.value}))} className="w-full h-10 rounded-xl border border-black/10 px-3 text-sm font-semibold bg-white">{ALL_DAYS.map(d=><option key={d} value={d}>{d}</option>)}</select></div>
                <div><label className="block text-[10px] font-black uppercase tracking-widest text-[#94a3b8] mb-1">Start</label><input required type="time" value={ttForm.start_time} onChange={e=>setTTForm(p=>({...p,start_time:e.target.value}))} className="w-full h-10 rounded-xl border border-black/10 px-3 text-sm font-semibold"/></div>
                <div><label className="block text-[10px] font-black uppercase tracking-widest text-[#94a3b8] mb-1">End</label><input required type="time" value={ttForm.end_time} onChange={e=>setTTForm(p=>({...p,end_time:e.target.value}))} className="w-full h-10 rounded-xl border border-black/10 px-3 text-sm font-semibold"/></div>
                <div><label className="block text-[10px] font-black uppercase tracking-widest text-[#94a3b8] mb-1">Room</label><input value={ttForm.room} onChange={e=>setTTForm(p=>({...p,room:e.target.value}))} className="w-full h-10 rounded-xl border border-black/10 px-3 text-sm font-semibold" placeholder="Opt."/></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-[10px] font-black uppercase tracking-widest text-[#94a3b8] mb-1">Term</label><select value={ttForm.term} onChange={e=>setTTForm(p=>({...p,term:e.target.value}))} className="w-full h-10 rounded-xl border border-black/10 px-3 text-sm font-semibold bg-white" required>{(academicSettings.active_terms||['Term 1','Term 2','Term 3']).map(t=><option key={t} value={t}>{t}</option>)}</select></div>
                <div><label className="block text-[10px] font-black uppercase tracking-widest text-[#94a3b8] mb-1">Academic Year</label><input required value={ttForm.academic_year} onChange={e=>setTTForm(p=>({...p,academic_year:e.target.value}))} className="w-full h-10 rounded-xl border border-black/10 px-3 text-sm font-semibold" placeholder="2025-2026"/></div>
              </div>
            </div>
            <div className="px-5 py-4 border-t border-black/5 bg-[#f8fafc] flex justify-end gap-2">
              <Btn variant="ghost" onClick={()=>setShowTTModal(false)}>Cancel</Btn>
              <Btn type="submit" disabled={saving}>{saving&&<Loader2 size={13} className="animate-spin"/>}{editingRow?'Update':'Create'}</Btn>
            </div>
          </form>
        </div>
      )}

      </div>
    </>
  );
}
