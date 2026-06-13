import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  AlertCircle, AlertTriangle, BookOpen, BookPlus, Calendar, CheckCircle2, ChevronDown,
  Clock, Download, Edit3, Layers, Loader2, Plus, RefreshCw,
  Search, Trash2, UserPlus, Users, X, Zap, BarChart3,
  ClipboardList, Sparkles, Shield, FlaskConical, Check, ShieldAlert, LayoutGrid,
} from 'lucide-react';
import api from '../services/api';
import TeacherOrangeHero from '../../shared/components/TeacherOrangeHero';
import { useAuth } from '../context/AuthContext';
import DndTimetableGrid from '../components/DndTimetableGrid';
import MasterStreamTimetable, { buildClassGroups } from '../components/MasterStreamTimetable';
import ClassChooseModal from '../components/ClassChooseModal';
import ClassesTimetableOverviewModal from '../components/ClassesTimetableOverviewModal';
import ClassPeriodsOverviewModal from '../components/ClassPeriodsOverviewModal';
import ExtraActivitiesModal from '../components/ExtraActivitiesModal';
import TeachersTimetablePanel from '../components/TeachersTimetablePanel';
import { paletteForSubject } from '../utils/masterTimetableShared';
import { exportClassTimetablePdf } from '../utils/exportClassTimetablePdf';
import { buildExtraActivityLookup, getTeachingSlots } from '../utils/extraActivityUtils';

const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const ALL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const PRIORITY_LABELS = { low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical' };
const PRIORITY_COLORS = { low: '#94a3b8', medium: '#3b82f6', high: '#f59e0b', critical: '#ef4444' };
const TIME_RULE_OPTIONS = [
  { id: 'any', label: 'Any time' },
  { id: 'morning', label: 'Morning only' },
  { id: 'afternoon', label: 'Afternoon only' },
  { id: 'custom', label: 'Custom window' },
];
const defaultSchedulingRules = () => ({ time_preference: 'any', earliest_start: '', latest_end: '', preferred_start: '' });
const parseSchedulingRules = (cfg) => {
  const r = cfg?.scheduling_rules || {};
  return {
    time_preference: r.time_preference || 'any',
    earliest_start: r.earliest_start || '',
    latest_end: r.latest_end || '',
    preferred_start: r.preferred_start || '',
  };
};
const ruleLabel = (rules = {}) => {
  const pref = rules.time_preference || 'any';
  if (pref === 'morning') return `Morning · end by ${rules.latest_end || '12:00'}`;
  if (pref === 'afternoon') return `Afternoon · from ${rules.earliest_start || '12:00'}`;
  if (pref === 'custom') {
    const parts = [];
    if (rules.earliest_start) parts.push(`from ${rules.earliest_start}`);
    if (rules.latest_end) parts.push(`until ${rules.latest_end}`);
    if (rules.preferred_start) parts.push(`~${rules.preferred_start}`);
    return parts.length ? parts.join(' ') : 'Custom';
  }
  return null;
};

const normalizeTime = (v) => { const r = String(v || '').trim(); if (!r) return ''; const p = r.split(':'); return p.length < 2 ? r : `${p[0].padStart(2,'0')}:${p[1].padStart(2,'0')}`; };
const fmt12 = (t) => { if (!t) return '—'; const [h,m] = t.split(':').map(Number); return `${((h%12)||12)}:${String(m).padStart(2,'0')} ${h>=12?'PM':'AM'}`; };
const classLabel = (row) => [row?.group_name, row?.stream_name, row?.combination].map(s => String(s||'').trim()).filter(Boolean).join(' ').replace(/\s+/g,' ').trim();
const TABS = [
  { id: 'teachers', label: 'Teachers', Icon: Users },
  { id: 'courses', label: 'Courses', Icon: BookOpen },
  { id: 'schedule', label: 'Time Settings', Icon: Clock },
  { id: 'generator', label: 'Generator', Icon: Sparkles },
  { id: 'timetable', label: 'Timetable', Icon: Calendar },
  { id: 'master-timetable', label: 'Per Class Timetable', Icon: LayoutGrid },
  { id: 'conflicts', label: 'Conflict Center', Icon: ShieldAlert },
];

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export default function Timetable() {
  const exportRef = useRef(null);
  const navigate = useNavigate();
  const { teacher } = useAuth();
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
  const [conflictCenter, setConflictCenter] = useState([]);
  const [conflictSummary, setConflictSummary] = useState(null);
  const [scanningConflicts, setScanningConflicts] = useState(false);

  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showTTModal, setShowTTModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [editingProfile, setEditingProfile] = useState(null);
  const [editingCourseConfig, setEditingCourseConfig] = useState(null);

  const [filters, setFilters] = useState({ class_name: '', staff_id: '', day_of_week: '', q: '' });

  const [newTeacher, setNewTeacher] = useState({ first_name:'', last_name:'', email:'', username:'', phone:'', staff_id:'' });
  const [newCourse, setNewCourse] = useState({ name:'', category:'', subject_code:'' });
  const [ttForm, setTTForm] = useState({ class_name:'', subject_name:'', staff_id:'', day_of_week:'Monday', start_time:'08:00', end_time:'09:00', room:'', term:'', academic_year:'' });
  const [scheduleForm, setScheduleForm] = useState({ day_start_time:'08:00', day_end_time:'17:00', period_duration_mins:40, active_days:['Monday','Tuesday','Wednesday','Thursday','Friday'], breaks:[{ name:'Break', start:'10:30', end:'11:00' },{ name:'Lunch', start:'13:00', end:'14:00' }] });
  const [profileForm, setProfileForm] = useState({ subjects:[], max_periods_per_day:6, available_days:[], preferred_slots:[], department:'' });
  const [courseConfigForm, setCourseConfigForm] = useState({ default_duration_mins:40, requires_lab:false, is_double_period:false, priority_level:'medium', department:'', periods_per_week:3, scheduling_rules: defaultSchedulingRules() });
  const [autoFixing, setAutoFixing] = useState(false);
  const [fixingGenWarnings, setFixingGenWarnings] = useState(false);
  const [genClass, setGenClass] = useState('');
  const [genSelectedClasses, setGenSelectedClasses] = useState([]);
  const [genTerm, setGenTerm] = useState('');
  const [genYear, setGenYear] = useState('');
  const [conflictTerm, setConflictTerm] = useState('');
  const [conflictYear, setConflictYear] = useState('');
  const [conflictClassFilter, setConflictClassFilter] = useState('');
  const [previewClass, setPreviewClass] = useState('');
  const [showClassChooseModal, setShowClassChooseModal] = useState(false);
  const [showOverviewModal, setShowOverviewModal] = useState(false);
  const [showClassPeriodsModal, setShowClassPeriodsModal] = useState(false);
  const [showExtraActivitiesModal, setShowExtraActivitiesModal] = useState(false);
  const [extraActivitiesClass, setExtraActivitiesClass] = useState('');
  const [extraActivities, setExtraActivities] = useState([]);
  const [timetableSubView, setTimetableSubView] = useState('class');
  const [masterGroup, setMasterGroup] = useState('');
  const [seedingTermMarks, setSeedingTermMarks] = useState(false);

  const flash = (type, text) => { setNotice({ type, text }); setTimeout(() => setNotice(null), 5000); };

  const seedTermMarksForTeachers = async () => {
    if (!confirm('Seed demo marks for all teacher assignments in the current term?\n\nCreates homework, CAT, mid-term and end-term scores per class/course so you can generate Mid-Term and Final reports.')) return;
    setSeedingTermMarks(true);
    try {
      const res = await api.post('/dos/student-reports/seed-term-marks', {
        term: genTerm || academicSettings.active_terms?.[0],
        academic_year: genYear || academicSettings.current_academic_year,
        generate_reports: true,
        clear_demo_marks: true,
      });
      flash('success', res.data?.message || 'Term marks seeded');
    } catch (err) {
      flash('error', err.response?.data?.message || 'Failed to seed marks');
    } finally {
      setSeedingTermMarks(false);
    }
  };

  const [studentClasses, setStudentClasses] = useState([]);

  const classOptions = useMemo(() => {
    const from1 = classes.map(classLabel).filter(Boolean);
    const from2 = rows.map(x => String(x.class_name||'').trim()).filter(Boolean);
    const from3 = assignments.map(x => String(x.class_name||'').trim()).filter(Boolean);
    const from4 = studentClasses.filter(Boolean);
    return Array.from(new Set([...from1,...from2,...from3,...from4])).sort();
  }, [classes, rows, assignments, studentClasses]);

  const fetchCore = useCallback(async () => {
    const term = genTerm || 'Term 1';
    const year = genYear || '2025-2026';
    const [tR, sR, cR, pR, aR, rR, scR] = await Promise.all([
      api.get('/dos/teaching-staff').catch(()=>({data:{success:false}})),
      api.get('/dos/subjects', {params:{include_inactive:1}}).catch(()=>({data:{success:false}})),
      api.get('/dos/registry/classes').catch(()=>({data:{success:false}})),
      api.get('/dos/calendar/periods').catch(()=>({data:{success:false}})),
      api.get('/dos/academic-calendar-settings').catch(()=>({data:{success:false}})),
      api.get('/dos/timetable', { params: { term, academic_year: year } }).catch(()=>({data:{success:false}})),
      api.get('/dos/class-enrollment').catch(()=>({data:{success:false}})),
    ]);
    if (tR.data?.success) setTeachers(tR.data.data || []);
    if (sR.data?.success) setSubjects((sR.data.data||[]).filter(x=>x.is_active!==0));
    if (cR.data?.success) setClasses(cR.data.data || []);
    if (pR.data?.success) setPeriods(pR.data.data || []);
    if (aR.data?.success && aR.data.data) {
      const next = aR.data.data;
      setAcademicSettings((prev) => {
        const prevKey = `${prev.current_academic_year}|${(prev.active_terms || []).join(',')}`;
        const nextKey = `${next.current_academic_year}|${(next.active_terms || []).join(',')}`;
        return prevKey === nextKey ? prev : next;
      });
    }
    if (rR.data?.success) setRows(rR.data.data || []);
    if (scR.data?.success) setStudentClasses((scR.data.data?.rows||[]).map(r=>r.class_name).filter(Boolean));
  }, [genTerm, genYear]);

  const fetchExtraActivities = useCallback(async () => {
    const term = genTerm || academicSettings.active_terms?.[0] || 'Term 1';
    const year = genYear || academicSettings.current_academic_year || '2025-2026';
    const res = await api.get('/dos/timetable-system/extra-activities', {
      params: { term, academic_year: year },
    }).catch(() => ({ data: { success: false } }));
    if (res.data?.success) setExtraActivities(res.data.data || []);
  }, [genTerm, genYear, academicSettings.active_terms, academicSettings.current_academic_year]);

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
    await fetchExtraActivities();
  }, [fetchExtraActivities]);

  useEffect(() => { (async () => { setLoading(true); try { await Promise.all([fetchCore(), fetchSmart()]); } catch(e){ flash('error', e.response?.data?.message||'Failed to load'); } finally { setLoading(false); } })(); }, [fetchCore, fetchSmart]);

  useEffect(() => {
    if (!genTerm && academicSettings.active_terms?.length) setGenTerm(academicSettings.active_terms[0]);
    if (!genYear && academicSettings.current_academic_year) setGenYear(academicSettings.current_academic_year);
    if (!conflictTerm && academicSettings.active_terms?.length) setConflictTerm(academicSettings.active_terms[0]);
    if (!conflictYear && academicSettings.current_academic_year) setConflictYear(academicSettings.current_academic_year);
  }, [academicSettings, genTerm, genYear, conflictTerm, conflictYear]);

  useEffect(() => {
    if (tabParam === 'assignments') {
      navigate('/dos/teacher-assignments', { replace: true });
    }
  }, [tabParam, navigate]);

  const profileMap = useMemo(() => new Map(teacherProfiles.map(p=>[p.teacher_user_id, p])), [teacherProfiles]);
  const configMap = useMemo(() => new Map(courseConfigs.map(c=>[c.subject_name, c])), [courseConfigs]);
  const teacherOnly = useMemo(
    () => teachers.filter((t) => String(t.role_code || '').toUpperCase() === 'TEACHER'),
    [teachers]
  );

  // ── Teacher actions ──
  const submitNewTeacher = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      await api.post('/school/staff', {
        ...newTeacher,
        role_code: 'TEACHER',
        job_title: 'Teacher',
        employment_status: 'Active',
        employment_type: 'Permanent',
        date_of_employment: today,
        contract_start_date: today,
      });
      flash('success','Teacher created and added to Employee Directory'); setNewTeacher({ first_name:'', last_name:'', email:'', username:'', phone:'', staff_id:'' }); setShowTeacherModal(false); await fetchCore(); await fetchSmart();
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

  const deleteAssignment = async (id, { confirmMessage } = {}) => {
    if (confirmMessage !== false) {
      const msg = confirmMessage || 'Remove this assignment?';
      if (!confirm(msg)) return false;
    }
    try {
      await api.delete(`/dos/timetable-system/assignments/${id}`);
      flash('success', 'Removed');
      await fetchSmart();
      return true;
    } catch (err) {
      flash('error', err.response?.data?.message || 'Failed');
      return false;
    }
  };

  const saveAssignmentEdit = async (id, payload) => {
    setSaving(true);
    try {
      await api.put(`/dos/timetable-system/assignments/${id}`, payload);
      flash('success', 'Assignment updated');
      await fetchSmart();
      return true;
    } catch (err) {
      flash('error', err.response?.data?.message || 'Failed to update');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const deleteAssignmentFromOverview = async (assignment) => {
    const name = assignment.teacher_name || 'this teacher';
    const ok = await deleteAssignment(assignment.id, {
      confirmMessage: `Remove ${name} from ${assignment.class_name} — ${assignment.subject_name}?`,
    });
    return ok;
  };

  const toggleGenClass = (className) => {
    setGenSelectedClasses((prev) => prev.includes(className) ? prev.filter((c) => c !== className) : [...prev, className].sort());
  };

  const classesForGeneration = genSelectedClasses.length ? genSelectedClasses : (genClass ? [genClass] : []);

  // ── Generator actions ──
  const runGenerator = async () => {
    if (!classesForGeneration.length) { flash('error','Select at least one class'); return; }
    setSaving(true);
    try {
      const res = await api.post('/dos/timetable-system/generate', {
        class_names: classesForGeneration,
        term: genTerm || academicSettings.active_terms?.[0] || 'Term 1',
        academic_year: genYear || academicSettings.current_academic_year || '2025-2026',
      });
      const data = res.data?.data;
      setGeneratedResult(data);
      setPreviewClass(classesForGeneration[0] || '');
      const stats = data?.stats;
      flash('success', `Generated ${stats?.total || 0} entries across ${stats?.generated_classes || 0} class(es)`);
    } catch(err){ flash('error', err.response?.data?.message||'Generation failed'); } finally { setSaving(false); }
  };

  const runFixGenerationWarnings = async () => {
    if (!classesForGeneration.length) { flash('error','Select at least one class'); return; }
    setFixingGenWarnings(true);
    try {
      const res = await api.post('/dos/timetable-system/generate', {
        class_names: classesForGeneration,
        term: genTerm || generatedResult?.term || academicSettings.active_terms?.[0] || 'Term 1',
        academic_year: genYear || generatedResult?.academic_year || academicSettings.current_academic_year || '2025-2026',
        auto_resolve: true,
        accept_partial: true,
      });
      const data = res.data?.data;
      setGeneratedResult(data);
      const remaining = data?.conflicts?.length || 0;
      const fixed = data?.fix_actions?.length || 0;
      if (remaining === 0) {
        flash('success', res.data?.message || `Fixed all warnings — ${fixed} adjustment(s) applied`);
      } else {
        flash('success', `Reduced warnings from ${generatedResult?.conflicts?.length || '?'} to ${remaining} (${fixed} auto-adjustments)`);
      }
    } catch(err){ flash('error', err.response?.data?.message||'Auto-fix generation failed'); } finally { setFixingGenWarnings(false); }
  };

  const acceptFreePeriodsView = async () => {
    if (!classesForGeneration.length) return;
    setFixingGenWarnings(true);
    try {
      const res = await api.post('/dos/timetable-system/generate', {
        class_names: classesForGeneration,
        term: genTerm || generatedResult?.term || academicSettings.active_terms?.[0] || 'Term 1',
        academic_year: genYear || generatedResult?.academic_year || academicSettings.current_academic_year || '2025-2026',
        auto_resolve: true,
        accept_partial: true,
      });
      const data = res.data?.data;
      setGeneratedResult(data);
      const free = data?.period_coverage?.total_free_periods || 0;
      flash('success', free > 0
        ? `Accepted ${free} unplaced period(s) as free time — ${data?.period_coverage?.coverage_pct || 0}% coverage`
        : 'All periods matched — timetable is complete');
    } catch(err){ flash('error', err.response?.data?.message||'Failed to accept free periods'); } finally { setFixingGenWarnings(false); }
  };

  const applyGenerated = async (partial = false) => {
    if (!generatedResult?.generated?.length) return;
    const blocking = (generatedResult.conflicts || []).filter((c) => c.type !== 'insufficient_slots');
    if (!partial && blocking.length > 0) {
      flash('error', `${blocking.length} teacher conflict(s) must be resolved before applying`);
      return;
    }
    setSaving(true);
    try {
      const classNames = generatedResult.class_names || classesForGeneration;
      const freePeriods = generatedResult.period_coverage?.total_free_periods || 0;
      const res = await api.post('/dos/timetable-system/apply', {
        entries: generatedResult.generated,
        class_names: classNames,
        term: generatedResult.term || genTerm,
        academic_year: generatedResult.academic_year || genYear,
        clear_existing: true,
        allow_partial: partial || !generatedResult.period_coverage?.all_fully_matched,
        expected_free_periods: freePeriods,
      });
      flash('success', res.data?.message || `Timetable applied for ${classNames.length} class(es)!`);
      setGeneratedResult(null);
      setFilters((p) => ({ ...p, class_name: classNames[0] || p.class_name }));
      await fetchCore();
      await fetchSmart();
      setActiveTab('timetable');
    } catch(err){
      const conflicts = err.response?.data?.conflicts;
      if (conflicts?.length) {
        flash('error', `${err.response?.data?.message || 'Teacher conflicts detected'} — see Conflict Center`);
        setConflictCenter(conflicts);
        setConflictSummary({ total: conflicts.length, critical: conflicts.length, warnings: 0 });
        setActiveTab('conflicts');
      } else {
        flash('error', err.response?.data?.message||'Failed to apply');
      }
    } finally { setSaving(false); }
  };

  const scanConflicts = async () => {
    setScanningConflicts(true);
    try {
      const res = await api.get('/dos/timetable-system/conflict-center', {
        params: {
          term: conflictTerm || academicSettings.active_terms?.[0],
          academic_year: conflictYear || academicSettings.current_academic_year,
          class_name: conflictClassFilter || undefined,
        },
      });
      setConflictCenter(res.data?.data || []);
      setConflictSummary(res.data?.summary || null);
      if (!res.data?.data?.length) flash('success', 'No conflicts found — timetable looks good!');
    } catch(err){ flash('error', err.response?.data?.message||'Failed to scan conflicts'); } finally { setScanningConflicts(false); }
  };

  const runAutoFix = async () => {
    setAutoFixing(true);
    try {
      const res = await api.post('/dos/timetable-system/auto-fix', {
        term: conflictTerm || academicSettings.active_terms?.[0],
        academic_year: conflictYear || academicSettings.current_academic_year,
      });
      const data = res.data?.data;
      setConflictCenter(data?.remaining || []);
      setConflictSummary(data?.summary || null);
      await fetchCore();
      await fetchSmart();
      flash('success', res.data?.message || `Fixed ${data?.fixed?.length || 0} issue(s)`);
    } catch(err){ flash('error', err.response?.data?.message||'Auto-fix failed'); } finally { setAutoFixing(false); }
  };

  // ── Timetable CRUD ──
  const submitTT = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const payload = { class_name:ttForm.class_name.trim(), subject_name:ttForm.subject_name.trim(), staff_id:Number(ttForm.staff_id), day_of_week:ttForm.day_of_week, start_time:ttForm.start_time, end_time:ttForm.end_time, room:ttForm.room.trim()||null, term:ttForm.term, academic_year:ttForm.academic_year };
      const editId = Number(editingRow?.id);
      if (Number.isFinite(editId) && editId > 0) {
        await api.put(`/dos/timetable/${editId}`, payload);
      } else {
        await api.post('/dos/timetable', payload);
      }
      flash('success', editingRow?'Updated':'Created'); setShowTTModal(false); await fetchCore(); await fetchSmart();
    } catch(err){
      if (err.response?.data?.code === 'TEACHER_PERIOD_CONFLICT') {
        flash('error', err.response?.data?.message || 'Teacher already has another class at this time');
      } else {
        flash('error', err.response?.data?.message||'Failed');
      }
    } finally { setSaving(false); }
  };

  const deleteTTRow = async (id) => {
    const rowId = Number(id);
    if (!Number.isFinite(rowId) || rowId <= 0) {
      flash('error', 'This lesson cannot be deleted until it is saved. Refresh and try again.');
      return;
    }
    if (!confirm('Delete this period?')) return;
    try { await api.delete(`/dos/timetable/${rowId}`); flash('success','Deleted'); await fetchCore(); await fetchSmart(); } catch(err){ flash('error','Failed'); }
  };

  const deleteClassTimetable = async (className) => {
    if (!className) return;
    if (!confirm(`Delete ALL timetable entries for "${className}"? Assignments and teachers will NOT be deleted.`)) return;
    setSaving(true);
    try {
      const res = await api.post('/dos/timetable-system/clear-timetables', {
        class_names: [className],
        term: academicSettings.active_terms?.[0] || 'Term 1',
        academic_year: academicSettings.current_academic_year || '2025-2026',
      });
      flash('success', res.data?.message || `Cleared timetable for ${className}`);
      await fetchCore(); await fetchSmart();
    } catch(err) { flash('error', err.response?.data?.message || 'Failed to delete'); } finally { setSaving(false); }
  };

  const clearTimetablesForClasses = async (classNames) => {
    if (!classNames?.length) { flash('error', 'Select at least one class'); return; }
    if (!confirm(`Clear timetables for ${classNames.length} class(es)? Assignments and teachers stay unchanged.`)) return;
    setSaving(true);
    try {
      const res = await api.post('/dos/timetable-system/clear-timetables', {
        class_names: classNames,
        term: genTerm || academicSettings.active_terms?.[0] || 'Term 1',
        academic_year: genYear || academicSettings.current_academic_year || '2025-2026',
      });
      flash('success', res.data?.message || 'Timetables cleared');
      await fetchCore(); await fetchSmart();
    } catch(err) { flash('error', err.response?.data?.message || 'Failed to clear'); } finally { setSaving(false); }
  };

  const reimportDemoSeed = async () => {
    if (!confirm(
      'Re-import demo seed?\n\n'
      + 'This will reset demo teachers (*@timetable-seed.local), courses (MATH, ENG, EST, SST, RE, KINY, FRE, DELF, PE, CA, COMPUTER, SET), '
      + 'teacher profiles, and P5A–P5H course assignments — same as the CLI seed script.\n\n'
      + 'Existing generated timetables are not removed. Continue?'
    )) return;
    setSaving(true);
    try {
      const res = await api.post('/dos/timetable-system/seed-demo', { clear: true });
      flash('success', res.data?.message || 'Demo seed imported');
      await fetchCore();
      await fetchSmart();
      navigate('/dos/teacher-assignments');
    } catch (err) {
      flash('error', err.response?.data?.message || 'Demo seed import failed');
    } finally {
      setSaving(false);
    }
  };

  const regenerateTimetablesForClasses = async (classNames, { goToTimetable = false } = {}) => {
    if (!classNames?.length) { flash('error', 'Select at least one class'); return; }
    setSaving(true);
    try {
      const res = await api.post('/dos/timetable-system/regenerate', {
        class_names: classNames,
        term: genTerm || academicSettings.active_terms?.[0] || 'Term 1',
        academic_year: genYear || academicSettings.current_academic_year || '2025-2026',
        auto_apply: true,
      });
      const cov = res.data?.data?.period_coverage;
      flash('success', res.data?.message || `Regenerated ${classNames.length} class(es)`);
      await fetchCore(); await fetchSmart();
      if (goToTimetable) {
        setFilters((p) => ({ ...p, class_name: classNames[0] || p.class_name }));
        setActiveTab('timetable');
      } else if (cov && !cov.all_fully_matched) {
        setActiveTab('conflicts');
        scanConflicts();
      }
    } catch(err) { flash('error', err.response?.data?.message || 'Regenerate failed'); } finally { setSaving(false); }
  };

  const classTimetableCoverage = useMemo(() => {
    const activeTerm = genTerm || academicSettings.active_terms?.[0] || '';
    const activeYear = genYear || academicSettings.current_academic_year || '';
    const scopedRows = rows.filter((r) => {
      const rowTerm = String(r.term || '').trim();
      const rowYear = String(r.academic_year || '').trim();
      if (activeTerm && rowTerm && rowTerm !== activeTerm) return false;
      if (activeYear && rowYear && rowYear !== activeYear) return false;
      return true;
    });

    const expectedByClass = new Map();
    for (const a of assignments) {
      const c = String(a.class_name || '').trim();
      if (!c) continue;
      expectedByClass.set(c, (expectedByClass.get(c) || 0) + (Number(a.periods_per_week) || 0));
    }

    const placedByClass = new Map();
    const subjectPlaced = new Map();
    const duplicateSlots = new Map();
    const slotKeys = new Set();

    for (const r of scopedRows) {
      if (r.extra_activity_id) continue;
      const c = String(r.class_name || '').trim();
      if (!c) continue;
      placedByClass.set(c, (placedByClass.get(c) || 0) + 1);
      const sk = `${c}__${r.subject_name}__${r.staff_id}`;
      subjectPlaced.set(sk, (subjectPlaced.get(sk) || 0) + 1);
      const slotKey = `${c}__${r.day_of_week}__${normalizeTime(r.start_time)}`;
      if (slotKeys.has(slotKey)) duplicateSlots.set(c, (duplicateSlots.get(c) || 0) + 1);
      else slotKeys.add(slotKey);
    }

    const allClasses = [...new Set([...expectedByClass.keys(), ...placedByClass.keys()])].sort();
    return allClasses.map((className) => {
      const expected = expectedByClass.get(className) || 0;
      const placed = placedByClass.get(className) || 0;
      const missing = Math.max(0, expected - placed);
      const excess = Math.max(0, placed - expected);
      const dupes = duplicateSlots.get(className) || 0;
      const subjectGaps = [];
      for (const a of assignments.filter((x) => String(x.class_name || '').trim() === className)) {
        const sk = `${className}__${a.subject_name}__${a.teacher_user_id}`;
        const exp = Number(a.periods_per_week) || 0;
        const act = subjectPlaced.get(sk) || 0;
        if (act !== exp) subjectGaps.push({ subject: a.subject_name, teacher: a.teacher_name, expected: exp, placed: act });
      }
      return {
        className,
        expected,
        placed,
        missing,
        excess,
        dupes,
        fullyMatched: expected > 0 && placed === expected && dupes === 0,
        subjectGaps,
        coveragePct: expected > 0 ? Math.round((placed / expected) * 100) : (placed > 0 ? 100 : 0),
      };
    });
  }, [assignments, rows, genTerm, genYear, academicSettings.active_terms, academicSettings.current_academic_year]);

  const classTimetableCounts = useMemo(
    () => classTimetableCoverage.map((c) => [c.className, c.placed]),
    [classTimetableCoverage]
  );

  const classCountsMap = useMemo(() => new Map(classTimetableCounts), [classTimetableCounts]);

  const classGroups = useMemo(() => buildClassGroups(classOptions), [classOptions]);

  const classGroupOptions = useMemo(
    () => Array.from(classGroups.keys()).sort(),
    [classGroups]
  );

  useEffect(() => {
    if (masterGroup && classGroupOptions.includes(masterGroup)) return;
    const p5 = classGroupOptions.find((g) => g === 'P5' || g.startsWith('P5'));
    if (p5) setMasterGroup(p5);
    else if (classGroupOptions.length) setMasterGroup(classGroupOptions[0]);
  }, [classGroupOptions, masterGroup]);

  const masterStreams = useMemo(
    () => (masterGroup ? classGroups.get(masterGroup) || [] : []),
    [classGroups, masterGroup]
  );

  const masterRows = useMemo(() => {
    const names = new Set(masterStreams.map((s) => s.fullName));
    const activeTerm = genTerm || '';
    const activeYear = genYear || '';
    return rows.filter((r) => {
      if (!names.has(String(r.class_name || '').trim())) return false;
      const rowTerm = String(r.term || '').trim();
      const rowYear = String(r.academic_year || '').trim();
      if (activeTerm && rowTerm && rowTerm !== activeTerm) return false;
      if (activeYear && rowYear && rowYear !== activeYear) return false;
      return true;
    });
  }, [rows, masterStreams, genTerm, genYear]);

  const masterExtraActivities = useMemo(() => {
    const names = new Set(masterStreams.map((s) => s.fullName));
    const activeTerm = genTerm || '';
    const activeYear = genYear || '';
    return extraActivities.filter((a) => {
      if (!names.has(String(a.class_name || '').trim())) return false;
      const actTerm = String(a.term || '').trim();
      const actYear = String(a.academic_year || '').trim();
      if (activeTerm && actTerm && actTerm !== activeTerm) return false;
      if (activeYear && actYear && actYear !== activeYear) return false;
      return true;
    });
  }, [extraActivities, masterStreams, genTerm, genYear]);

  const openCreateTT = (day='Monday', start='08:00', end='09:00') => { setEditingRow(null); setTTForm({ class_name:filters.class_name||'', subject_name:'', staff_id:'', day_of_week:day, start_time:start, end_time:end, room:'', term:academicSettings.active_terms?.[0]||'Term 1', academic_year:academicSettings.current_academic_year||'2025-2026' }); setShowTTModal(true); };
  const openEditTT = (row) => { setEditingRow(row); setTTForm({ class_name:row.class_name||'', subject_name:row.subject_name||'', staff_id:String(row.staff_id||''), day_of_week:row.day_of_week||'Monday', start_time:row.start_time||'08:00', end_time:row.end_time||'09:00', room:row.room||'', term:row.term||academicSettings.active_terms?.[0]||'Term 1', academic_year:row.academic_year||academicSettings.current_academic_year||'2025-2026' }); setShowTTModal(true); };

  const updateTTInline = async (id, data) => {
    const rowId = Number(id);
    if (!Number.isFinite(rowId) || rowId <= 0) {
      flash('error', 'This lesson is not saved yet. Use Add Slot to create it, then drag to reschedule.');
      return;
    }
    try {
      const payload = { class_name: data.class_name, subject_name: data.subject_name, staff_id: Number(data.staff_id), day_of_week: data.day_of_week, start_time: data.start_time, end_time: data.end_time, room: data.room || null, term: data.term, academic_year: data.academic_year, is_locked: data.is_locked };
      await api.put(`/dos/timetable/${rowId}`, payload);
      await fetchCore(); await fetchSmart();
    } catch (err) {
      if (err.response?.data?.code === 'TEACHER_PERIOD_CONFLICT') {
        flash('error', err.response?.data?.message || 'Teacher already has another class at this time');
      } else {
        flash('error', err.response?.data?.message || 'Failed to update');
      }
    }
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

  const extraActivityLookup = useMemo(() => {
    if (!filters.class_name) return new Map();
    return buildExtraActivityLookup(extraActivities, filters.class_name, getTeachingSlots(displayPeriods));
  }, [extraActivities, filters.class_name, displayPeriods]);

  const filteredRows = useMemo(() => rows.filter(r => { if (filters.class_name && r.class_name!==filters.class_name) return false; if (filters.staff_id && String(r.staff_id)!==filters.staff_id) return false; if (filters.day_of_week && r.day_of_week!==filters.day_of_week) return false; if (filters.q) { const q=filters.q.toLowerCase(); if (![r.class_name,r.subject_name,r.teacher_name,r.room].some(v=>String(v||'').toLowerCase().includes(q))) return false; } return true; }), [rows, filters]);
  const lessonMap = useMemo(() => { const m = new Map(); for (const r of filteredRows) { const k=`${r.day_of_week}__${normalizeTime(r.start_time)}`; const c=m.get(k)||[]; c.push(r); m.set(k,c); } return m; }, [filteredRows]);

  // ── Export ──
  const exportPdf = useCallback(() => {
    if (!filters.class_name) { flash('error', 'Choose a class first'); return; }
    try {
      setExporting(true);
      exportClassTimetablePdf({
        className: filters.class_name,
        rows,
        periods: displayPeriods,
        activeDays: scheduleForm.active_days,
        term: genTerm || academicSettings.active_terms?.[0] || '',
        academicYear: genYear || academicSettings.current_academic_year || '',
        schoolName: teacher?.school_name || teacher?.school?.name || 'School',
      });
      flash('success', 'Exported PDF');
    } catch (e) {
      console.error(e);
      flash('error', e.message || 'PDF export failed');
    } finally {
      setExporting(false);
    }
  }, [displayPeriods, scheduleForm.active_days, filters.class_name, rows, genTerm, genYear, academicSettings, teacher, flash]);

  const handleOverviewViewClass = (className) => {
    setFilters((p) => ({ ...p, class_name: className }));
    setTimetableSubView('class');
    setShowOverviewModal(false);
  };

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
    const styles = { primary:'bg-gradient-to-r from-[#FF8C00] to-[#FF5E00] text-white shadow-md hover:shadow-lg', secondary:'border border-amber-300 bg-amber-100 text-amber-900 hover:bg-amber-200', ghost:'border border-black/10 text-[#64748b] hover:bg-[#f8fafc]', danger:'border border-red-200 text-red-600 hover:bg-red-50' };
    return <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${styles[variant]} ${className}`}>{children}</button>;
  };
  const Badge = ({children, color='#3b82f6'}) => <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-black uppercase" style={{background:`${color}14`,color,border:`1px solid ${color}28`}}>{children}</span>;

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#f8f9fc]"><Loader2 size={24} className="animate-spin text-[#FF8C00]"/></div>;

  return (
    <>
      <TeacherOrangeHero
        title={`Welcome back, ${teacher?.first_name || 'Director'}`}
        subtitle="Manage teachers, courses, schedule, and auto-generate conflict-free timetables. Course assignments live on Teacher Assignments."
        rightSlot={
          activeTab === 'timetable' && timetableSubView === 'class' && filters.class_name ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={exportPdf}
                disabled={exporting}
                className="h-10 px-5 rounded-xl text-[11px] font-black uppercase tracking-widest inline-flex items-center gap-2 bg-white text-[#0f172a] border border-black/10 shadow-md hover:shadow-lg hover:bg-[#f8fafc] transition disabled:opacity-50"
              >
                <Download size={14} /> Export PDF
              </button>
              <Btn onClick={() => openCreateTT()}>
                <Plus size={13} /> Add slot
              </Btn>
            </div>
          ) : null
        }
      />
      <div className="max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8 -mt-10 pt-2 relative z-20 pb-10">

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
          <SectionTitle icon={Users} title="Teacher Management" count={teacherOnly.length} action={
            <div className="flex flex-wrap gap-2">
              <Btn variant="ghost" onClick={seedTermMarksForTeachers} disabled={seedingTermMarks}>
                {seedingTermMarks ? <Loader2 size={13} className="animate-spin"/> : <ClipboardList size={13}/>}
                Seed term marks
              </Btn>
              <Btn onClick={()=>setShowTeacherModal(true)}><UserPlus size={13}/>Register Teacher</Btn>
            </div>
          }/>

          {/* Workload Overview */}
          {workload.length>0 && (
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-4"><BarChart3 size={15} className="text-[#FF8C00]"/><span className="text-xs font-black uppercase tracking-widest text-[#0f172a]">Teacher Workload</span></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {workload.filter(w=>teacherOnly.some(t=>t.id===w.teacher_user_id)).map(w=>{
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
            {teacherOnly.map(t => {
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
                  {wl && <div className="text-[10px] font-bold text-[#94a3b8] mb-3">{wl.total_periods} periods · {wl.active_days} days</div>}
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
                      {cfg.is_double_period?<span className="flex items-center gap-1 text-amber-600"><Layers size={10}/>Back-to-back</span>:null}
                      <span>{cfg.periods_per_week}x/week</span>
                      {ruleLabel(parseSchedulingRules(cfg)) && <span className="flex items-center gap-1 text-sky-600"><Clock size={10}/>{ruleLabel(parseSchedulingRules(cfg))}</span>}
                    </div>
                  )}
                  <div className="flex justify-end">
                    <button type="button" onClick={()=>{setEditingCourseConfig(s.name); const c=configMap.get(s.name); setCourseConfigForm({ default_duration_mins:c?.default_duration_mins||40, requires_lab:!!c?.requires_lab, is_double_period:!!c?.is_double_period, priority_level:c?.priority_level||'medium', department:c?.department||'', periods_per_week:c?.periods_per_week||3, scheduling_rules: parseSchedulingRules(c) });}} className="text-[9px] font-black uppercase px-3 py-1.5 rounded-lg border border-[#FF8C00]/20 text-[#FF8C00] hover:bg-orange-50">Configure</button>
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


      {/* ═══ GENERATOR TAB ═══ */}
      {activeTab==='generator' && (
        <div className="space-y-5">
          <SectionTitle icon={Sparkles} title="Smart Timetable Generator" action={
            <div className="flex flex-wrap gap-2">
              <Btn variant="ghost" onClick={() => navigate('/dos/teacher-assignments')}><ClipboardList size={13}/>Teacher Assignments</Btn>
              <Btn variant="ghost" onClick={() => setShowClassPeriodsModal(true)} disabled={!classOptions.length}><BarChart3 size={13}/>Class Periods</Btn>
              <Btn variant="ghost" onClick={() => { setExtraActivitiesClass(''); setShowExtraActivitiesModal(true); }} disabled={!classOptions.length}><Sparkles size={13}/>Extra Activities</Btn>
            </div>
          }/>
          <Card className="p-5 sm:p-6 max-w-4xl">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 border border-blue-100 mb-5">
              <Shield size={18} className="text-blue-600 shrink-0 mt-0.5"/>
              <div className="text-xs text-blue-800"><p className="font-bold mb-1">Smart Rules Applied:</p>
                <ul className="space-y-0.5 text-[11px]">
                  <li>✓ Generate many classes at once — each class gets its own timetable</li>
                  <li>✓ No teacher clash across classes (same term &amp; academic year)</li>
                  <li>✓ Respect teacher max periods per day &amp; available days</li>
                  <li>✓ Course scheduling rules (morning / afternoon / custom time)</li>
                  <li>✓ High priority subjects placed first</li>
                </ul>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-[#94a3b8] mb-1">Term</label>
                <select value={genTerm} onChange={e=>setGenTerm(e.target.value)} className="w-full h-11 rounded-xl border border-black/10 px-3 text-sm font-semibold bg-white">
                  {(academicSettings.active_terms||['Term 1','Term 2','Term 3']).map(t=><option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-[#94a3b8] mb-1">Academic Year</label>
                <input value={genYear} onChange={e=>setGenYear(e.target.value)} className="w-full h-11 rounded-xl border border-black/10 px-3 text-sm font-semibold bg-white" placeholder="2025-2026"/>
              </div>
            </div>

            <div className="mb-4">
              <div className="flex items-center justify-between gap-2 mb-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#94a3b8]">Select Classes (multi-select)</label>
                <div className="flex gap-2">
                  <button type="button" onClick={()=>setGenSelectedClasses([...classOptions])} className="text-[9px] font-black uppercase px-2 py-1 rounded-lg border border-black/10 text-[#64748b] hover:bg-[#f8fafc]">Select all</button>
                  <button type="button" onClick={()=>{setGenSelectedClasses([]);setGenClass('');}} className="text-[9px] font-black uppercase px-2 py-1 rounded-lg border border-black/10 text-[#64748b] hover:bg-[#f8fafc]">Clear</button>
                </div>
              </div>
              <div className="max-h-[200px] overflow-y-auto rounded-xl border border-black/10 p-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 bg-[#f8fafc]">
                {classOptions.map(c=>(
                  <label key={c} className={`flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer text-xs font-bold transition ${genSelectedClasses.includes(c)?'bg-[#FF8C00]/15 text-[#FF8C00] border border-[#FF8C00]/30':'bg-white border border-black/5 text-[#64748b] hover:border-[#FF8C00]/20'}`}>
                    <input type="checkbox" checked={genSelectedClasses.includes(c)} onChange={()=>toggleGenClass(c)} className="rounded border-black/20 text-[#FF8C00]"/>
                    <span className="truncate">{c}</span>
                  </label>
                ))}
                {!classOptions.length && (
                  <p className="col-span-full text-xs text-[#94a3b8] font-bold py-4 text-center">
                    No classes found.{' '}
                    <button type="button" onClick={() => navigate('/dos/teacher-assignments')} className="text-[#FF8C00] hover:underline">
                      Add teacher assignments
                    </button>
                    {' '}or register classes first.
                  </p>
                )}
              </div>
              {genSelectedClasses.length>0 && <p className="text-[10px] text-[#FF8C00] font-bold mt-2">{genSelectedClasses.length} class(es) selected — each will get its own timetable</p>}
            </div>

            <Btn onClick={runGenerator} disabled={saving||!classesForGeneration.length}>{saving?<Loader2 size={13} className="animate-spin"/>:<Sparkles size={13}/>}Generate Timetables</Btn>
            {classesForGeneration.length>0 && (
              <>
                <Btn variant="ghost" onClick={()=>clearTimetablesForClasses(classesForGeneration)} disabled={saving}><Trash2 size={13}/>Clear Timetable</Btn>
                <Btn variant="secondary" onClick={()=>regenerateTimetablesForClasses(classesForGeneration)} disabled={saving}><RefreshCw size={13}/>Regenerate & Apply</Btn>
              </>
            )}
          </Card>

          {generatedResult && (
            <Card className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <div className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-500"/><span className="text-sm font-black text-[#0f172a]">Generated {generatedResult.stats?.total || generatedResult.generated?.length} periods</span></div>
                  <p className="text-[10px] text-[#94a3b8] font-bold mt-1">
                    {generatedResult.stats?.generated_classes} class(es) · {generatedResult.term} · {generatedResult.academic_year}
                    {generatedResult.period_coverage && ` · ${generatedResult.period_coverage.coverage_pct}% period coverage`}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {generatedResult.period_coverage?.all_fully_matched && !(generatedResult.conflicts||[]).length ? (
                    <Btn onClick={()=>applyGenerated(false)} disabled={saving}><Check size={13}/>Apply All Classes</Btn>
                  ) : (
                    <>
                      <Btn onClick={()=>applyGenerated(true)} disabled={saving||!generatedResult.generated?.length}><Check size={13}/>Apply Partial ({generatedResult.period_coverage?.total_free_periods||0} free)</Btn>
                      {!generatedResult.accept_partial && (generatedResult.period_coverage?.total_missing||0)>0 && (
                        <Btn onClick={acceptFreePeriodsView} disabled={fixingGenWarnings||saving} variant="secondary">
                          {fixingGenWarnings?<Loader2 size={13} className="animate-spin"/>:<Zap size={13}/>}Accept Free Periods
                        </Btn>
                      )}
                    </>
                  )}
                </div>
              </div>

              {generatedResult.period_coverage && (
                <div className={`rounded-xl border p-4 mb-4 ${generatedResult.period_coverage.all_fully_matched?'border-emerald-200 bg-emerald-50':'border-violet-200 bg-violet-50'}`}>
                  <p className={`text-xs font-bold flex items-center gap-1.5 mb-2 ${generatedResult.period_coverage.all_fully_matched?'text-emerald-800':'text-violet-900'}`}>
                    {generatedResult.period_coverage.all_fully_matched ? <CheckCircle2 size={14}/> : <AlertCircle size={14}/>}
                    Period coverage — {generatedResult.period_coverage.coverage_pct}% ({generatedResult.period_coverage.total_placed}/{generatedResult.period_coverage.total_expected} periods/week)
                  </p>
                  {!generatedResult.period_coverage.all_fully_matched && (
                    <p className="text-[10px] text-violet-800 font-semibold mb-2">{generatedResult.period_coverage.dos_message}</p>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 max-h-[140px] overflow-y-auto">
                    {generatedResult.period_coverage.by_class?.map((cls)=>(
                      <div key={cls.class_name} className="rounded-lg bg-white/80 border border-black/5 p-2">
                        <p className="text-[10px] font-black text-[#0f172a]">{cls.class_name} — {cls.coverage_pct}%</p>
                        <div className="mt-1 space-y-0.5">
                          {cls.subjects?.filter(s=>!s.complete).slice(0,4).map((s,i)=>(
                            <p key={i} className="text-[9px] text-violet-700 font-bold">
                              {s.subject_name}{s.teacher_name ? ` (${s.teacher_name})` : ''}: {s.placed}/{s.expected} {s.missing>0?`(${s.missing} free)`:''}{s.excess>0?`(${s.excess} extra)`:''}
                            </p>
                          ))}
                          {cls.fully_matched && <p className="text-[9px] text-emerald-600 font-bold">All courses matched</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                  {generatedResult.period_coverage.auto_fix_suggestions?.length>0 && (
                    <div className="mt-2 pt-2 border-t border-violet-200/60">
                      <p className="text-[9px] font-black uppercase tracking-widest text-violet-600 mb-1">To reach 100% coverage, DOS should:</p>
                      <ul className="space-y-0.5">{generatedResult.period_coverage.auto_fix_suggestions.slice(0,4).map((s,i)=><li key={i} className="text-[10px] text-violet-800 font-semibold">→ {s}</li>)}</ul>
                    </div>
                  )}
                </div>
              )}

              {generatedResult.skipped_lessons?.length>0 && generatedResult.accept_partial && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 mb-4">
                  <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5"><Clock size={14}/>{generatedResult.skipped_lessons.length} period(s) accepted as free time</p>
                  <p className="text-[10px] text-slate-600 font-semibold mt-1">These lessons were not placed. Empty slots will show in the timetable grid. Assign more teachers to fill them later.</p>
                </div>
              )}

              {generatedResult.stats?.by_class?.length>0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mb-4">
                  {generatedResult.stats.by_class.map(s=>(
                    <button key={s.class_name} type="button" onClick={()=>setPreviewClass(s.class_name)} className={`rounded-xl border p-3 text-left transition ${previewClass===s.class_name?'border-[#FF8C00] bg-[#FFF7ED]':'border-black/5 bg-[#f8fafc] hover:border-[#FF8C00]/30'}`}>
                      <p className="text-xs font-black text-[#0f172a] truncate">{s.class_name}</p>
                      <p className="text-[10px] text-[#94a3b8] font-bold mt-0.5">{s.total} periods{s.entries?` · ${s.entries} blocks`:''}{s.conflicts>0?` · ${s.conflicts} issues`:''}</p>
                    </button>
                  ))}
                </div>
              )}

              {generatedResult.skipped?.length>0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 mb-4 text-[10px] text-amber-800 font-bold">
                  Skipped: {generatedResult.skipped.map(s=>`${s.class_name} (${s.reason})`).join(', ')}
                </div>
              )}

              {generatedResult.fix_advice && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 mb-4">
                  <p className="text-xs font-bold text-emerald-800 flex items-center gap-1.5 mb-2"><CheckCircle2 size={14}/>Auto-fix plan ({generatedResult.fix_advice.summary?.total_adjustments || 0} adjustments)</p>
                  <ul className="space-y-1 mb-3">{generatedResult.fix_advice.steps?.map((step,i)=><li key={i} className="text-[10px] text-emerald-700 font-semibold">• {step}</li>)}</ul>
                  {generatedResult.fix_advice.summary?.strategy?.length>0 && (
                    <div className="rounded-lg bg-white/70 border border-emerald-100 p-2 mb-2">
                      <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600 mb-1">How the system fixes conflicts</p>
                      <ul className="space-y-0.5">{generatedResult.fix_advice.summary.strategy.map((s,i)=><li key={i} className="text-[10px] text-emerald-700">— {s}</li>)}</ul>
                    </div>
                  )}
                  {generatedResult.fix_advice.actions?.length>0 && (
                    <div className="space-y-1 max-h-[100px] overflow-y-auto">{generatedResult.fix_advice.actions.slice(0,15).map((a,i)=><p key={i} className="text-[10px] text-emerald-800 font-bold">→ {a.description}</p>)}</div>
                  )}
                </div>
              )}

              {(generatedResult.dos_recommendations || generatedResult.fix_advice?.dos_recommendations) && (
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 mb-4">
                  <p className="text-xs font-bold text-blue-900 flex items-center gap-1.5 mb-2"><ShieldAlert size={14}/>What DOS can do — manual steps required</p>
                  {(() => {
                    const rec = generatedResult.dos_recommendations || generatedResult.fix_advice?.dos_recommendations;
                    return (
                      <>
                        <p className="text-[10px] text-blue-800 font-bold mb-2">Root cause: {rec.root_cause}</p>
                        {rec.overloaded_teachers?.length>0 && (
                          <div className="rounded-lg bg-white/70 border border-blue-100 p-2 mb-2">
                            <p className="text-[9px] font-black uppercase tracking-widest text-blue-600 mb-1">Overloaded teachers</p>
                            {rec.overloaded_teachers.slice(0,3).map((t,i)=>(
                              <p key={i} className="text-[10px] text-blue-800 font-semibold">• {t.teacher_name}: {t.failed_lessons} unplaced lesson(s) — teaches {t.subjects?.join(', ')} in {t.classes?.join(', ')}</p>
                            ))}
                          </div>
                        )}
                        {rec.affected_classes?.length>0 && (
                          <p className="text-[10px] text-blue-700 font-semibold mb-2">Most affected: {rec.affected_classes.slice(0,4).map(c=>`${c.class_name} (${c.missing_lessons})`).join(', ')}</p>
                        )}
                        <p className="text-[9px] font-black uppercase tracking-widest text-blue-600 mb-1">What DOS can do</p>
                        <ul className="space-y-1 mb-2">{rec.what_dos_can_do?.map((a,i)=><li key={i} className="text-[10px] text-blue-800 font-bold">→ {a}</li>)}</ul>
                        {rec.what_system_can_do?.length>0 && (
                          <>
                            <p className="text-[9px] font-black uppercase tracking-widest text-blue-600 mb-1">What the system can do automatically</p>
                            <ul className="space-y-1 mb-2">{rec.what_system_can_do.map((a,i)=><li key={i} className="text-[10px] text-blue-700 font-semibold">• {a}</li>)}</ul>
                          </>
                        )}
                        <div className="flex flex-wrap gap-2 mt-2">
                          <Btn variant="ghost" onClick={() => navigate('/dos/teacher-assignments')}><ClipboardList size={13}/>Teacher Assignments</Btn>
                          <Btn variant="ghost" onClick={()=>setActiveTab('teachers')}><Users size={13}/>Go to Teachers</Btn>
                          <Btn variant="ghost" onClick={()=>setActiveTab('schedule')}><Clock size={13}/>Time Settings</Btn>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}

              {generatedResult.conflicts?.length>0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 mb-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <p className="text-xs font-bold text-amber-800 flex items-center gap-1.5"><AlertTriangle size={14}/>Blocking warnings ({generatedResult.conflicts.length})</p>
                    <div className="flex flex-wrap gap-2">
                      <Btn onClick={runFixGenerationWarnings} disabled={fixingGenWarnings||saving} variant="secondary">
                        {fixingGenWarnings ? <Loader2 size={13} className="animate-spin"/> : <Zap size={13}/>}
                        Auto Fix
                      </Btn>
                      {(generatedResult.period_coverage?.total_missing||0)>0 && !generatedResult.accept_partial && (
                        <Btn onClick={acceptFreePeriodsView} disabled={fixingGenWarnings||saving} variant="ghost">
                          Accept as Free Time
                        </Btn>
                      )}
                    </div>
                  </div>
                  <p className="text-[10px] text-amber-700 font-semibold mb-2">Teacher conflicts block apply. Unplaced periods (insufficient slots) can be accepted as free time — use Accept Free Periods or Apply Partial.</p>
                  <div className="space-y-2 max-h-[160px] overflow-y-auto">
                    {generatedResult.conflicts.slice(0,15).map((c,i)=>(
                      <div key={i} className="text-[10px] text-amber-700">
                        <p className="font-bold">• {c.class_name}: {c.type} — {c.subject||''} {c.day||''} {c.time||''}{c.conflicts_with_class?` (teacher busy in ${c.conflicts_with_class})`:''}</p>
                        {c.message && <p className="text-amber-600 ml-3 mt-0.5">Why: {c.message}</p>}
                      </div>
                    ))}
                  </div>
                  {generatedResult.conflicts.length>15 && <p className="text-[9px] text-amber-600 font-bold mt-1">+ {generatedResult.conflicts.length - 15} more warnings</p>}
                </div>
              )}

              <div className="overflow-x-auto">
                <p className="text-[10px] font-black uppercase tracking-widest text-[#94a3b8] mb-2">Preview: {previewClass || generatedResult.class_names?.[0]}</p>
                <table className="w-full text-[11px]">
                  <thead><tr className="text-[#94a3b8] font-black uppercase tracking-wider border-b border-black/5"><th className="py-2 px-3 text-left">Day</th><th className="py-2 px-3 text-left">Time</th><th className="py-2 px-3 text-left">Subject</th><th className="py-2 px-3 text-left">Class</th></tr></thead>
                  <tbody>{(generatedResult.by_class?.[previewClass] || generatedResult.generated?.filter(e=>e.class_name===(previewClass||generatedResult.class_names?.[0])) || []).map((e,i)=><tr key={i} className="border-b border-black/5"><td className="py-2 px-3 font-bold">{e.day_of_week}</td><td className="py-2 px-3 font-mono">{normalizeTime(e.start_time)}–{normalizeTime(e.end_time)}</td><td className="py-2 px-3 font-bold" style={{color:paletteForSubject(e.subject_name).title}}>{e.subject_name}</td><td className="py-2 px-3">{e.class_name}</td></tr>)}</tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Existing timetable for selected class */}
          {(genSelectedClasses[0]||genClass) && !generatedResult && rows.filter(r=>r.class_name===(genSelectedClasses[0]||genClass)).length>0 && (
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-4"><Calendar size={16} className="text-[#FF8C00]"/><span className="text-sm font-black text-[#0f172a]">Current Timetable for {genSelectedClasses[0]||genClass}</span><Badge color="#3b82f6">{rows.filter(r=>r.class_name===(genSelectedClasses[0]||genClass)).length} lessons</Badge></div>
              <div className="overflow-x-auto">
                <div className="grid gap-3 min-w-[980px]" style={{gridTemplateColumns:`repeat(${Math.min(WEEK_DAYS.length, scheduleForm.active_days?.length||5)},1fr)`}}>
                  {(scheduleForm.active_days?.length?scheduleForm.active_days.filter(d=>WEEK_DAYS.includes(d)):WEEK_DAYS).map(day=>(
                    <div key={day} className="bg-[#eef0f4] rounded-2xl border border-black/10 shadow-sm overflow-hidden">
                      <div className="px-3 py-3 border-b border-black/10 text-center text-sm font-bold tracking-tight text-[#0f172a]">{day}</div>
                      <div className="p-2 space-y-2 bg-[#f4f5f7]">
                        {displayPeriods.map(period=>{
                          const lesson=rows.find(r=>r.class_name===(genSelectedClasses[0]||genClass)&&r.day_of_week===day&&normalizeTime(r.start_time)===normalizeTime(period.start_time));
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
          {/* Sub-navigation */}
          <Card className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex gap-1.5 p-1 bg-[#f8fafc] rounded-xl overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setTimetableSubView('class')}
                  className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition ${timetableSubView === 'class' ? 'bg-white text-[#FF8C00] shadow-sm border border-[#FF8C00]/20' : 'text-[#64748b] hover:bg-white'}`}
                >
                  <Calendar size={13} /> Class Timetable
                </button>
                <button
                  type="button"
                  onClick={() => setShowOverviewModal(true)}
                  className="flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition text-[#64748b] hover:bg-white border border-transparent hover:border-black/5"
                >
                  <Layers size={13} /> Classes Overview
                  {classTimetableCoverage.length > 0 && (
                    <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-black ${classTimetableCoverage.every((c) => c.fullyMatched) ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {classTimetableCoverage.filter((c) => !c.fullyMatched).length || '✓'}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setTimetableSubView('teachers')}
                  className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition ${timetableSubView === 'teachers' ? 'bg-white text-indigo-600 shadow-sm border border-indigo-200' : 'text-[#64748b] hover:bg-white'}`}
                >
                  <Users size={13} /> Teachers Timetable
                </button>
              </div>

              {timetableSubView === 'class' && (
                <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
                  <Btn onClick={() => setShowClassChooseModal(true)}><Users size={13}/>Choose Class</Btn>
                  {filters.class_name && (
                    <>
                      <span className="text-sm font-black text-[#0f172a] uppercase tracking-wide px-3 py-2 rounded-xl bg-[#fff7ed] border border-[#FF8C00]/20">
                        {filters.class_name}
                      </span>
                      <Btn variant="ghost" onClick={exportPdf} disabled={exporting}>
                        {exporting ? <Loader2 size={13} className="animate-spin"/> : <Download size={13}/>}Download
                      </Btn>
                      <Btn variant="danger" onClick={() => deleteClassTimetable(filters.class_name)} disabled={saving || rows.filter(r=>r.class_name===filters.class_name).length===0}>
                        <Trash2 size={13}/>Delete All
                      </Btn>
                    </>
                  )}
                </div>
              )}
            </div>
          </Card>

          {timetableSubView === 'teachers' ? (
            <TeachersTimetablePanel
              teachers={teachers}
              rows={rows}
              periods={displayPeriods}
              classOptions={classOptions}
              activeDays={scheduleForm.active_days}
              term={genTerm || academicSettings.active_terms?.[0] || ''}
              academicYear={genYear || academicSettings.current_academic_year || ''}
              schoolName={teacher?.school_name || teacher?.school?.name || 'School'}
            />
          ) : !filters.class_name ? (
            <Card className="p-10 sm:p-14">
              <div className="text-center max-w-md mx-auto">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#fff7ed] to-[#ffedd5] flex items-center justify-center mx-auto mb-4">
                  <Calendar size={28} className="text-[#FF8C00]"/>
                </div>
                <p className="text-base font-black text-[#0f172a] mb-1">Choose a Class to View Timetable</p>
                <p className="text-xs text-[#94a3b8] mb-5">Pick P5A, P5B, or any stream. View the weekly grid, edit slots, and download PDF.</p>
                <div className="flex flex-wrap justify-center gap-2">
                  <Btn onClick={() => setShowClassChooseModal(true)}><Users size={13}/>Choose Class</Btn>
                  <Btn variant="ghost" onClick={() => setShowOverviewModal(true)}><Layers size={13}/>Classes Overview</Btn>
                </div>
              </div>
            </Card>
          ) : (
            <>
              <Card className="overflow-hidden">
                <div className="px-4 sm:px-6 py-4 bg-gradient-to-r from-[#0f172a] via-[#1e293b] to-[#0f172a] flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#fdba74]">Weekly Timetable</p>
                    <h3 className="text-xl font-black text-white uppercase tracking-wide">{filters.class_name}</h3>
                    <p className="text-[11px] text-[#94a3b8] mt-0.5">
                      {genTerm || academicSettings.active_terms?.[0]} · {genYear || academicSettings.current_academic_year} · {filteredRows.length} lessons
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Btn variant="ghost" className="!bg-white/10 !text-white !border-white/20 hover:!bg-white/20" onClick={exportPdf} disabled={exporting}>
                      {exporting ? <Loader2 size={13} className="animate-spin"/> : <Download size={13}/>}Download PDF
                    </Btn>
                    <Btn onClick={() => openCreateTT()} className="!shadow-lg"><Plus size={13}/>Add Slot</Btn>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]"/><input value={filters.q} onChange={e=>setFilters(p=>({...p,q:e.target.value}))} placeholder="Search subject, teacher..." className="w-full h-10 pl-9 pr-3 rounded-xl border border-black/10 text-sm font-semibold"/></div>
                  <select value={filters.staff_id} onChange={e=>setFilters(p=>({...p,staff_id:e.target.value}))} className="h-10 rounded-xl border border-black/10 px-3 text-sm font-semibold bg-white"><option value="">All Teachers</option>{teacherOnly.map(t=><option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}</select>
                  <select value={filters.day_of_week} onChange={e=>setFilters(p=>({...p,day_of_week:e.target.value}))} className="h-10 rounded-xl border border-black/10 px-3 text-sm font-semibold bg-white"><option value="">All Days</option>{ALL_DAYS.map(d=><option key={d} value={d}>{d}</option>)}</select>
                </div>
                <p className="text-[9px] font-bold text-[#94a3b8] mt-2 flex items-center gap-1"><Edit3 size={10}/> Drag & drop cells to reschedule lessons</p>
              </Card>

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
                  teachers={teacherOnly}
                  extraActivityLookup={extraActivityLookup}
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

      {/* ═══ PER CLASS TIMETABLE (ALL STREAMS) ═══ */}
      {activeTab==='master-timetable' && (
        <div className="space-y-5">
          <Card className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-[#94a3b8]">Class Group</label>
              <select
                value={masterGroup}
                onChange={(e) => setMasterGroup(e.target.value)}
                className="h-11 min-w-[200px] rounded-xl border border-black/10 px-3 text-sm font-semibold bg-white"
              >
                {classGroupOptions.map((g) => (
                  <option key={g} value={g}>{g} ({(classGroups.get(g) || []).length} streams)</option>
                ))}
              </select>
              {masterGroup && (
                <div className="flex flex-wrap gap-1.5">
                  {(classGroups.get(masterGroup) || []).map((s) => (
                    <span
                      key={s.fullName}
                      className="text-[9px] font-black uppercase px-2.5 py-1 rounded-lg border border-[#FF8C00]/20 text-[#FF8C00] bg-[#fff7ed]"
                    >
                      {s.fullName}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {!classGroupOptions.length ? (
            <Card className="p-10 text-center">
              <LayoutGrid size={40} className="mx-auto text-[#d1d5db] mb-3"/>
              <p className="text-sm font-black text-[#0f172a] mb-1">No class groups found</p>
              <p className="text-xs text-[#94a3b8]">Generate timetables for P5A, P5B, etc. first.</p>
            </Card>
          ) : (
            <MasterStreamTimetable
              rows={masterRows}
              extraActivities={masterExtraActivities}
              periods={displayPeriods}
              streams={masterStreams}
              groupLabel={masterGroup}
              activeDays={scheduleForm.active_days}
              term={genTerm || academicSettings.active_terms?.[0] || ''}
              academicYear={genYear || academicSettings.current_academic_year || ''}
              schoolName={teacher?.school_name || teacher?.school?.name || 'Wisdom School'}
            />
          )}
        </div>
      )}

      <ClassesTimetableOverviewModal
        open={showOverviewModal}
        onClose={() => setShowOverviewModal(false)}
        coverage={classTimetableCoverage}
        term={genTerm || academicSettings.active_terms?.[0] || ''}
        academicYear={genYear || academicSettings.current_academic_year || ''}
        saving={saving}
        onViewClass={handleOverviewViewClass}
        onScanConflicts={() => { setShowOverviewModal(false); setActiveTab('conflicts'); scanConflicts(); }}
        onDeleteClass={deleteClassTimetable}
        onRegenerateAll={() => { setShowOverviewModal(false); regenerateTimetablesForClasses(classOptions, { goToTimetable: true }); }}
        onGoToGenerator={() => { setShowOverviewModal(false); setActiveTab('generator'); }}
        onClearAll={() => { setShowOverviewModal(false); clearTimetablesForClasses(classOptions); }}
      />

      <ClassPeriodsOverviewModal
        open={showClassPeriodsModal}
        onClose={() => setShowClassPeriodsModal(false)}
        assignments={assignments}
        classOptions={classOptions}
        teachers={teacherOnly}
        saving={saving}
        onDelete={deleteAssignmentFromOverview}
        onSaveEdit={saveAssignmentEdit}
        extraActivities={extraActivities}
        periods={displayPeriods}
        activeDays={scheduleForm.active_days}
        timetableRows={rows}
        onOpenExtraActivities={(cls) => {
          setExtraActivitiesClass(cls || '');
          setShowClassPeriodsModal(false);
          setShowExtraActivitiesModal(true);
        }}
      />

      <ExtraActivitiesModal
        open={showExtraActivitiesModal}
        onClose={() => setShowExtraActivitiesModal(false)}
        classOptions={classOptions}
        initialClass={extraActivitiesClass}
        assignments={assignments}
        periods={displayPeriods}
        activeDays={scheduleForm.active_days}
        timetableRows={rows}
        term={genTerm || academicSettings.active_terms?.[0] || ''}
        academicYear={genYear || academicSettings.current_academic_year || ''}
        availableTerms={academicSettings.active_terms || ['Term 1', 'Term 2', 'Term 3']}
        availableYears={[genYear || academicSettings.current_academic_year || '2025-2026'].filter(Boolean)}
        activities={extraActivities}
        onRefresh={async () => { await fetchExtraActivities(); await fetchCore(); }}
        flash={flash}
      />

      <ClassChooseModal
        open={showClassChooseModal}
        onClose={() => setShowClassChooseModal(false)}
        classOptions={classOptions}
        classCounts={classCountsMap}
        selectedClass={filters.class_name}
        onSelect={(className) => setFilters((p) => ({ ...p, class_name: className }))}
      />

      {/* ═══ CONFLICT CENTER TAB ═══ */}
      {activeTab==='conflicts' && (
        <div className="space-y-5">
          <SectionTitle
            icon={ShieldAlert}
            title="Conflict Center"
            count={conflictSummary?.total}
            action={
              <div className="flex flex-wrap gap-2">
                <Btn onClick={scanConflicts} disabled={scanningConflicts || autoFixing}>
                  {scanningConflicts ? <Loader2 size={13} className="animate-spin"/> : <RefreshCw size={13}/>}
                  Scan
                </Btn>
                <Btn onClick={runAutoFix} disabled={autoFixing || scanningConflicts || !conflictSummary?.fixable}>
                  {autoFixing ? <Loader2 size={13} className="animate-spin"/> : <Zap size={13}/>}
                  Auto Fix
                </Btn>
              </div>
            }
          />

          <Card className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-[#94a3b8] mb-1">Term</label>
                <select value={conflictTerm} onChange={e=>setConflictTerm(e.target.value)} className="w-full h-10 rounded-xl border border-black/10 px-3 text-sm font-semibold bg-white">
                  {(academicSettings.active_terms||['Term 1','Term 2','Term 3']).map(t=><option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-[#94a3b8] mb-1">Academic Year</label>
                <input value={conflictYear} onChange={e=>setConflictYear(e.target.value)} className="w-full h-10 rounded-xl border border-black/10 px-3 text-sm font-semibold bg-white"/>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-black uppercase tracking-widest text-[#94a3b8] mb-1">Filter by Class (optional)</label>
                <select value={conflictClassFilter} onChange={e=>setConflictClassFilter(e.target.value)} className="w-full h-10 rounded-xl border border-black/10 px-3 text-sm font-semibold bg-white">
                  <option value="">All classes</option>
                  {classOptions.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          </Card>

          {conflictSummary && (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <Card className="p-4 border-l-4 border-l-red-500">
                <p className="text-[10px] font-black uppercase tracking-widest text-[#94a3b8]">Critical</p>
                <p className="text-2xl font-black text-red-600 mt-1">{conflictSummary.critical}</p>
                <p className="text-[10px] text-[#94a3b8] font-bold">Clashes &amp; rule violations</p>
              </Card>
              <Card className="p-4 border-l-4 border-l-amber-500">
                <p className="text-[10px] font-black uppercase tracking-widest text-[#94a3b8]">Warnings</p>
                <p className="text-2xl font-black text-amber-600 mt-1">{conflictSummary.warnings}</p>
                <p className="text-[10px] text-[#94a3b8] font-bold">Missing subject periods</p>
              </Card>
              <Card className="p-4 border-l-4 border-l-sky-500">
                <p className="text-[10px] font-black uppercase tracking-widest text-[#94a3b8]">Auto-fixable</p>
                <p className="text-2xl font-black text-sky-600 mt-1">{conflictSummary.fixable || 0}</p>
                <p className="text-[10px] text-[#94a3b8] font-bold">Can be resolved automatically</p>
              </Card>
              <Card className="p-4 border-l-4 border-l-emerald-500">
                <p className="text-[10px] font-black uppercase tracking-widest text-[#94a3b8]">Status</p>
                <p className="text-lg font-black text-emerald-600 mt-1">{conflictSummary.ok ? 'All Clear' : 'Needs Review'}</p>
                <p className="text-[10px] text-[#94a3b8] font-bold">{conflictTerm} · {conflictYear}</p>
              </Card>
            </div>
          )}

          <Card className="overflow-hidden">
            <div className="px-4 py-3 border-b border-black/5 bg-[#f8fafc]">
              <span className="text-xs font-black uppercase tracking-widest text-[#0f172a]">Detected Issues</span>
            </div>
            {scanningConflicts ? (
              <div className="p-12 flex justify-center"><Loader2 size={24} className="animate-spin text-[#FF8C00]"/></div>
            ) : conflictCenter.length === 0 ? (
              <div className="p-12 text-center">
                <CheckCircle2 size={40} className="mx-auto text-emerald-400 mb-3"/>
                <p className="text-sm font-black text-[#0f172a]">No conflicts detected</p>
                <p className="text-xs text-[#94a3b8] mt-1">Teachers have no duplicate periods across classes for this term.</p>
              </div>
            ) : (
              <div className="divide-y divide-black/5">
                {conflictCenter.map((c, i) => (
                  <div key={c.id || i} className="px-4 py-4 hover:bg-[#f8fafc] flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${c.severity==='critical'?'bg-red-50':'bg-amber-50'}`}>
                      {c.type==='teacher_clash' ? <Users size={16} className="text-red-500"/> : c.type==='subject_missing' ? <BookOpen size={16} className="text-amber-500"/> : c.type==='rule_violation' ? <Clock size={16} className="text-red-500"/> : <AlertTriangle size={16} className="text-red-500"/>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <Badge color={c.severity==='critical'?'#ef4444':'#f59e0b'}>{c.title || c.type}</Badge>
                        {c.day && <span className="text-[10px] font-bold text-[#94a3b8]">{c.day}{c.time?` · ${c.time}`:''}</span>}
                      </div>
                      <p className="text-sm font-bold text-[#0f172a]">{c.message}</p>
                      {c.type==='teacher_clash' && (
                        <p className="text-[10px] text-[#64748b] font-bold mt-1">{c.class_a} ({c.subject_a}) ↔ {c.class_b} ({c.subject_b})</p>
                      )}
                      {c.type==='subject_missing' && (
                        <p className="text-[10px] text-[#64748b] font-bold mt-1">{c.actual}/{c.expected} periods scheduled{c.teacher_name?` · ${c.teacher_name}`:''}</p>
                      )}
                      {c.type==='rule_violation' && c.rule && (
                        <p className="text-[10px] text-[#64748b] font-bold mt-1">Rule: {c.rule}</p>
                      )}
                      {c.auto_fixable && (
                        <span className="inline-block mt-1 text-[9px] font-black uppercase text-sky-600 bg-sky-50 px-2 py-0.5 rounded-md">Auto-fixable</span>
                      )}
                    </div>
                    {(c.class_a || c.class_name) && (
                      <button type="button" onClick={()=>{setFilters(p=>({...p,class_name:c.class_a||c.class_name}));setActiveTab('timetable');}} className="text-[9px] font-black uppercase px-3 py-1.5 rounded-lg border border-[#FF8C00]/20 text-[#FF8C00] hover:bg-orange-50 shrink-0">View</button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
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
        <div className="fixed inset-0 z-[2000] bg-black/50 p-3 sm:p-6 flex items-center justify-center overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl border border-black/5 overflow-hidden my-4">
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
                <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer"><input type="checkbox" checked={courseConfigForm.is_double_period} onChange={e=>setCourseConfigForm(p=>({...p,is_double_period:e.target.checked}))}/><Layers size={14} className="text-amber-500"/>Double period (back-to-back)</label>
              </div>
              {courseConfigForm.is_double_period ? (
                <p className="text-[10px] text-amber-700 font-semibold -mt-2">When enabled, some lessons are placed in two consecutive periods on the same day (e.g. period 1 + period 2 on Monday). Periods/week stays the same — MATH 9 means 9 slots, not 18.</p>
              ) : null}
              <div><label className="block text-[10px] font-black uppercase tracking-widest text-[#94a3b8] mb-1">Department</label><input value={courseConfigForm.department} onChange={e=>setCourseConfigForm(p=>({...p,department:e.target.value}))} className="w-full h-10 rounded-xl border border-black/10 px-3 text-sm font-semibold" placeholder="e.g. Languages"/></div>

              <div className="rounded-xl border border-sky-100 bg-sky-50/50 p-4 space-y-3">
                <div className="flex items-center gap-2"><Clock size={14} className="text-sky-600"/><span className="text-[10px] font-black uppercase tracking-widest text-sky-800">Scheduling Rules</span></div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {TIME_RULE_OPTIONS.map(opt=>(
                    <button key={opt.id} type="button" onClick={()=>setCourseConfigForm(p=>({...p,scheduling_rules:{...p.scheduling_rules,time_preference:opt.id}}))} className={`py-2 px-2 rounded-xl text-[9px] font-black uppercase transition ${courseConfigForm.scheduling_rules?.time_preference===opt.id?'bg-sky-600 text-white shadow-md':'bg-white border border-black/10 text-[#64748b] hover:border-sky-300'}`}>{opt.label}</button>
                  ))}
                </div>
                {courseConfigForm.scheduling_rules?.time_preference==='morning' && (
                  <div><label className="block text-[10px] font-black uppercase tracking-widest text-[#94a3b8] mb-1">Must end before</label><input type="time" value={courseConfigForm.scheduling_rules.latest_end||'12:00'} onChange={e=>setCourseConfigForm(p=>({...p,scheduling_rules:{...p.scheduling_rules,latest_end:e.target.value}}))} className="w-full h-10 rounded-xl border border-black/10 px-3 text-sm font-semibold bg-white"/></div>
                )}
                {courseConfigForm.scheduling_rules?.time_preference==='afternoon' && (
                  <div><label className="block text-[10px] font-black uppercase tracking-widest text-[#94a3b8] mb-1">Must start from</label><input type="time" value={courseConfigForm.scheduling_rules.earliest_start||'12:00'} onChange={e=>setCourseConfigForm(p=>({...p,scheduling_rules:{...p.scheduling_rules,earliest_start:e.target.value}}))} className="w-full h-10 rounded-xl border border-black/10 px-3 text-sm font-semibold bg-white"/></div>
                )}
                {courseConfigForm.scheduling_rules?.time_preference==='custom' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div><label className="block text-[10px] font-black uppercase tracking-widest text-[#94a3b8] mb-1">Earliest start</label><input type="time" value={courseConfigForm.scheduling_rules.earliest_start||''} onChange={e=>setCourseConfigForm(p=>({...p,scheduling_rules:{...p.scheduling_rules,earliest_start:e.target.value}}))} className="w-full h-10 rounded-xl border border-black/10 px-3 text-sm font-semibold bg-white"/></div>
                    <div><label className="block text-[10px] font-black uppercase tracking-widest text-[#94a3b8] mb-1">Latest end</label><input type="time" value={courseConfigForm.scheduling_rules.latest_end||''} onChange={e=>setCourseConfigForm(p=>({...p,scheduling_rules:{...p.scheduling_rules,latest_end:e.target.value}}))} className="w-full h-10 rounded-xl border border-black/10 px-3 text-sm font-semibold bg-white"/></div>
                    <div><label className="block text-[10px] font-black uppercase tracking-widest text-[#94a3b8] mb-1">Preferred time</label><input type="time" value={courseConfigForm.scheduling_rules.preferred_start||''} onChange={e=>setCourseConfigForm(p=>({...p,scheduling_rules:{...p.scheduling_rules,preferred_start:e.target.value}}))} className="w-full h-10 rounded-xl border border-black/10 px-3 text-sm font-semibold bg-white"/></div>
                  </div>
                )}
                <p className="text-[10px] text-sky-700 font-bold">Generator and Auto Fix respect these rules. Example: P.E. → Morning only, end before 13:00.</p>
              </div>
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
              <div><label className="block text-[10px] font-black uppercase tracking-widest text-[#94a3b8] mb-1">Teacher</label><select required value={ttForm.staff_id} onChange={e=>setTTForm(p=>({...p,staff_id:e.target.value}))} className="w-full h-10 rounded-xl border border-black/10 px-3 text-sm font-semibold bg-white"><option value="">Select</option>{teacherOnly.map(t=><option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}</select></div>
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
