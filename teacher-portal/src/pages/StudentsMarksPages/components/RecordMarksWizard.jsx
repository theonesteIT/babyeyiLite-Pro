import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertTriangle, ArrowLeft, ArrowRight, BookOpen, CheckCircle2, GraduationCap,
  Loader2, Search, Star, Users, X, Zap, Save, Send, Plus,
} from 'lucide-react';
import {
  fetchTeachingAssignments, fetchAssessmentTypes, fetchAssessmentContext,
  fetchGradebookMatrix, registerMarks,
} from '../../../services/marksApi.js'; 
import {
  loadFavorites, saveFavorites, loadRecent, pushRecent, draftKey,
  saveDraft, loadDraft, clearDraft, computeLiveStats, parseBulkPaste,
  isValidMarkValue,
} from '../utils/recordMarksUtils.js';

const STEPS = ['Teaching assignment', 'Create assessment', 'Enter marks', 'Review & publish'];

export default function RecordMarksWizard({ open, onClose, onPublished, preset = null }) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  const [assignments, setAssignments] = useState([]);
  const [academicYear, setAcademicYear] = useState('');
  const [academicYearOptions, setAcademicYearOptions] = useState([]);
  const [currentAcademicYear, setCurrentAcademicYear] = useState('');
  const [selectedAcademicYear, setSelectedAcademicYear] = useState('');
  const [activeTerm, setActiveTerm] = useState('');
  const [termOptions, setTermOptions] = useState([]);
  const [selectedTerm, setSelectedTerm] = useState('');
  const [types, setTypes] = useState([]);
  const [selected, setSelected] = useState(null);
  const [students, setStudents] = useState([]);

  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [favorites, setFavorites] = useState(loadFavorites());
  const [recentIds, setRecentIds] = useState(loadRecent());

  const [typeSlug, setTypeSlug] = useState('');
  const [assessmentName, setAssessmentName] = useState('');
  const [maxScore, setMaxScore] = useState(20);
  const [assessmentDate, setAssessmentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [typeWeight, setTypeWeight] = useState(null);
  const [typeCount, setTypeCount] = useState(0);
  const [duplicateWarn, setDuplicateWarn] = useState(false);

  const [marks, setMarks] = useState({});
  const [validationError, setValidationError] = useState(null);
  const [lastDraftSave, setLastDraftSave] = useState(null);
  const [publishResult, setPublishResult] = useState(null);

  const inputRefs = useRef([]);
  const draftTimerRef = useRef(null);
  const presetAppliedRef = useRef(false);

  const selectedType = useMemo(() => types.find((t) => t.slug === typeSlug), [types, typeSlug]);

  const classOptions = useMemo(() => {
    const set = new Set(assignments.map((a) => a.class_name));
    return Array.from(set).sort();
  }, [assignments]);

  const filteredAssignments = useMemo(() => {
    const q = search.trim().toLowerCase();
    return assignments.filter((a) => {
      if (classFilter && a.class_name !== classFilter) return false;
      if (!q) return true;
      return a.class_name.toLowerCase().includes(q) || a.subject_name.toLowerCase().includes(q);
    });
  }, [assignments, search, classFilter]);

  const recentAssignments = useMemo(
    () => recentIds.map((id) => assignments.find((a) => a.id === id)).filter(Boolean),
    [recentIds, assignments],
  );

  const favoriteAssignments = useMemo(
    () => favorites.map((id) => assignments.find((a) => a.id === id)).filter(Boolean),
    [favorites, assignments],
  );

  const liveStats = useMemo(() => computeLiveStats(students, marks, maxScore), [students, marks, maxScore]);

  const resetWizard = useCallback(() => {
    setStep(0);
    setSelected(null);
    setStudents([]);
    setTypeSlug('');
    setAssessmentName('');
    setMaxScore(20);
    setDescription('');
    setMarks({});
    setError(null);
    setValidationError(null);
    setDuplicateWarn(false);
    setPublishResult(null);
    setSearch('');
    setClassFilter('');
  }, []);

  const loadInitial = useCallback(async ({ yearParam = null, termParam = null } = {}) => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (yearParam) params.academic_year = yearParam;
      if (termParam) params.term = termParam;
      const [aRes, tRes] = await Promise.all([fetchTeachingAssignments(params), fetchAssessmentTypes()]);
      if (aRes?.success) {
        setAssignments(aRes.data?.assignments || []);
        const resolvedYear = aRes.data?.academic_year
          || aRes.data?.current_academic_year
          || yearParam
          || '';
        const resolvedTerm = aRes.data?.term || termParam || '';
        setAcademicYear(resolvedYear);
        setAcademicYearOptions(aRes.data?.academic_years || []);
        setCurrentAcademicYear(aRes.data?.current_academic_year || resolvedYear);
        setActiveTerm(resolvedTerm);
        setSelectedAcademicYear((prev) => (yearParam != null ? yearParam : (prev || resolvedYear)));
        setSelectedTerm((prev) => (termParam != null ? termParam : (prev || resolvedTerm)));
        setTermOptions(aRes.data?.terms || []);
      } else setError(aRes?.message || 'Failed to load assignments');
      if (tRes?.success) setTypes(tRes.data?.rows || []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      resetWizard();
      presetAppliedRef.current = false;
      setSelectedTerm('');
      setSelectedAcademicYear('');
      loadInitial();
      setFavorites(loadFavorites());
      setRecentIds(loadRecent());
    }
  }, [open, resetWizard, loadInitial]);

  const handleAcademicYearChange = (year) => {
    setSelectedAcademicYear(year);
    setSelectedTerm('');
    setSelected(null);
    setStep(0);
    loadInitial({ yearParam: year, termParam: null });
  };

  const handleTermChange = (term) => {
    setSelectedTerm(term);
    setSelected(null);
    setStep(0);
    loadInitial({
      yearParam: selectedAcademicYear || academicYear || currentAcademicYear,
      termParam: term,
    });
  };

  useEffect(() => {
    if (!open || !preset || presetAppliedRef.current || loading || !assignments.length) return;
    const className = String(preset.className || '').trim().toLowerCase();
    const subjectName = String(preset.subjectName || '').trim().toLowerCase();
    const match = assignments.find((a) => {
      const classOk = !className || a.class_name.toLowerCase() === className;
      const subjOk = !subjectName || a.subject_name.toLowerCase() === subjectName;
      return classOk && subjOk;
    });
    if (!match) return;
    presetAppliedRef.current = true;
    (async () => {
      await pickAssignment(match);
      if (preset.typeSlug) setTypeSlug(preset.typeSlug);
      if (preset.startStep != null) setStep(preset.startStep);
    })();
  }, [open, preset, assignments, loading]);

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  const toggleFavorite = (id) => {
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      saveFavorites(next);
      return next;
    });
  };

  const pickAssignment = async (a) => {
    setSelected(a);
    pushRecent(a.id);
    setRecentIds(loadRecent());
    setStep(1);
    setLoading(true);
    try {
      const mRes = await fetchGradebookMatrix(a.class_name, a.subject_name);
      if (mRes?.success) {
        const list = (mRes.data?.students || []).map((s) => ({
          student_id: s.student_id,
          student_uid: s.student_uid,
          name: s.name,
          gender: s.gender,
        }));
        setStudents(list);
        const apiTypes = mRes.data?.assessment_types;
        if (apiTypes?.length) setTypes(apiTypes);
      }
    } catch {
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (step !== 1 || !selected || !typeSlug) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchAssessmentContext(selected.class_name, selected.subject_name, typeSlug);
        if (cancelled || !res?.success) return;
        const d = res.data;
        setSuggestions(d.suggestions || []);
        setTypeWeight(d.type_weight_percent);
        setTypeCount(d.assessment_count || 0);
        setMaxScore(d.default_max_score || selectedType?.default_max_score || 20);
        if (!assessmentName && d.suggestions?.[0]) setAssessmentName(d.suggestions[0]);
        const names = (d.assessments || []).map((x) => x.assessment_name.toLowerCase());
        setDuplicateWarn(names.includes(assessmentName.trim().toLowerCase()));
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [step, selected, typeSlug, selectedType, assessmentName]);

  useEffect(() => {
    if (!selected || !typeSlug) return;
    const key = draftKey(selected, typeSlug);
    const draft = loadDraft(key);
    if (draft?.marks && step === 2) {
      setMarks(draft.marks);
      if (draft.assessmentName) setAssessmentName(draft.assessmentName);
      if (draft.maxScore) setMaxScore(draft.maxScore);
    }
  }, [selected, typeSlug, step]);

  useEffect(() => {
    if (step !== 2 || !selected || !typeSlug) return;
    const key = draftKey(selected, typeSlug);
    draftTimerRef.current = setInterval(() => {
      saveDraft(key, { marks, assessmentName, maxScore, assessmentDate, description });
      setLastDraftSave(new Date());
    }, 5000);
    return () => {
      if (draftTimerRef.current) clearInterval(draftTimerRef.current);
    };
  }, [step, selected, typeSlug, marks, assessmentName, maxScore, assessmentDate, description]);

  const goToEnterMarks = () => {
    if (!typeSlug || !assessmentName.trim()) {
      setError('Select assessment type and enter a name');
      return;
    }
    setDuplicateWarn(false);
    setError(null);
    setStep(2);
    setMarks({});
    setValidationError(null);
  };

  const setMark = (studentId, raw) => {
    const upper = raw.trim().toUpperCase();
    if (['A', 'E', 'M'].includes(upper)) {
      setMarks((prev) => ({ ...prev, [studentId]: { value: '', code: upper } }));
      setValidationError(null);
      return;
    }
    if (raw !== '' && !isValidMarkValue(raw, maxScore)) {
      setValidationError(`Maximum marks is ${maxScore}`);
      return;
    }
    setValidationError(null);
    setMarks((prev) => ({ ...prev, [studentId]: { value: raw, code: '' } }));
  };

  const handleKeyDown = (idx, e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const next = inputRefs.current[idx + 1];
      if (next) next.focus();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      inputRefs.current[idx + 1]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      inputRefs.current[idx - 1]?.focus();
    }
  };

  const handleBulkPaste = (e) => {
    const text = e.clipboardData.getData('text');
    if (!text.includes('\n') && !text.includes('\t') && !text.includes(',')) return;
    e.preventDefault();
    const values = parseBulkPaste(text);
    setMarks((prev) => {
      const next = { ...prev };
      students.forEach((s, i) => {
        if (values[i] == null) return;
        const v = values[i];
        const upper = v.toUpperCase();
        if (['A', 'E', 'M'].includes(upper)) {
          next[s.student_id] = { value: '', code: upper };
        } else if (isValidMarkValue(v, maxScore)) {
          next[s.student_id] = { value: v, code: '' };
        }
      });
      return next;
    });
    setToast('Pasted marks from clipboard');
    setTimeout(() => setToast(null), 2000);
  };

  const buildPayload = (status) => ({
    teacher_assignment_id: selected.assignment_id || selected.id,
    class_name: selected.class_name,
    subject_name: selected.subject_name,
    assessment_name: assessmentName.trim(),
    max_score: maxScore,
    column_slug: typeSlug,
    assessment_date: assessmentDate,
    description: description.trim() || null,
    term: selected?.term || activeTerm || selectedTerm || null,
    academic_year: selected?.academic_year || selectedAcademicYear || academicYear || currentAcademicYear || null,
    status,
    marks: students.map((s) => {
      const entry = marks[s.student_id];
      if (!entry) return { student_id: s.student_id, value: '', mark_code: null };
      if (entry.code) return { student_id: s.student_id, value: null, mark_code: entry.code };
      return { student_id: s.student_id, value: entry.value === '' ? null : Number(entry.value), mark_code: null };
    }).filter((m) => m.mark_code || m.value != null),
  });

  const handleSave = async (status, addAnother = false) => {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      const res = await registerMarks(buildPayload(status));
      if (!res?.success) {
        if (res?.duplicate) {
          setDuplicateWarn(true);
          setError(res.message);
        } else {
          setError(res?.message || 'Failed to save');
        }
        return;
      }
      if (selected && typeSlug) clearDraft(draftKey(selected, typeSlug));
      if (status === 'published') {
        setPublishResult({ stats: res.statistics, atRisk: res.at_risk || [] });
        setStep(3);
        onPublished?.();
      } else {
        setToast('Draft saved');
        setTimeout(() => setToast(null), 2500);
      }
      if (addAnother) {
        setAssessmentName('');
        setMarks({});
        setStep(1);
        setPublishResult(null);
      }
    } catch (err) {
      if (err?.response?.data?.duplicate) {
        setDuplicateWarn(true);
        setError(err.response.data.message || 'Assessment already exists');
      } else {
        setError(err?.response?.data?.message || 'Failed to save marks');
      }
    } finally {
      setSaving(false);
    }
  };

  const renderAssignmentCard = (a, compact = false) => {
    const isFav = favorites.includes(a.id);
    const cardId = a.assignment_id || a.id;
    return (
      <div
        key={cardId}
        role="button"
        tabIndex={0}
        onClick={() => pickAssignment(a)}
        onKeyDown={(e) => { if (e.key === 'Enter') pickAssignment(a); }}
        className={`group text-left w-full rounded-2xl border bg-white transition-all hover:shadow-md cursor-pointer ${
          compact ? '' : ''
        } ${selected?.id === a.id ? 'border-[#ff8c00] shadow-sm' : 'border-black/8 hover:border-black/15'}`}
      >
        <div className={compact ? 'p-3' : 'p-4'}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-8 h-8 rounded-lg bg-[#000435]/5 flex items-center justify-center shrink-0">
                  <BookOpen size={15} className="text-[#000435]" />
                </span>
                <p className="text-sm font-bold text-[#000435] truncate leading-tight">{a.subject_name}</p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-[#000435]/70">
                <GraduationCap size={13} className="shrink-0 text-[#ff8c00]" />
                <span className="font-semibold truncate">{a.class_name}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-2.5">
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#ff8c00]/10 text-[#000435] border border-[#ff8c00]/20">
                  {a.term || activeTerm || 'Term 1'}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#000435]/50">
                  <Users size={11} />
                  {a.student_count ?? 0} students
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); toggleFavorite(a.id); }}
              className="p-1.5 rounded-lg hover:bg-black/5 shrink-0"
              title={isFav ? 'Remove favorite' : 'Favorite'}
            >
              <Star size={14} className={isFav ? 'fill-[#ff8c00] text-[#ff8c00]' : 'text-[#000435]/25'} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (!open) return null;

  const wizard = (
    <div className="fixed inset-0 z-[200] flex flex-col bg-[#f8f9fc]">
      <header className="shrink-0 bg-white border-b border-black/6 shadow-sm px-5 sm:px-8 lg:px-10 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-black/5 text-[#000435]/50">
            <X size={20} />
          </button>
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wider text-[#000435]/40">Record marks</p>
            <h2 className="text-base font-semibold text-[#000435] truncate">
              {step === 0 ? 'Select teaching assignment' : selected ? `${selected.subject_name} · ${selected.class_name}` : STEPS[step]}
            </h2>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-1">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-1">
              <span className={`text-[10px] font-medium px-2.5 py-1 rounded-full ${
                i === step ? 'bg-[#000435] text-white' : i < step ? 'bg-[#ff8c00]/15 text-[#000435]' : 'bg-black/5 text-[#000435]/40'
              }`}>
                {i + 1}. {label}
              </span>
              {i < STEPS.length - 1 && <span className="text-[#000435]/20">→</span>}
            </div>
          ))}
        </div>
        <p className="md:hidden text-xs font-medium text-[#000435]/50">Step {step + 1}/{STEPS.length}</p>
      </header>

      <div className="flex-1 overflow-y-auto px-5 sm:px-8 lg:px-10 py-6">
        <div className="w-full max-w-6xl mx-auto">
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium bg-red-50 border border-red-100 text-red-800">
            <AlertTriangle size={16} /> {error}
          </div>
        )}
        {toast && (
          <div className="mb-4 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium bg-[#ff8c00]/10 border border-[#ff8c00]/25 text-[#000435]">
            <CheckCircle2 size={16} className="text-[#ff8c00]" /> {toast}
          </div>
        )}

        {loading && step === 0 ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[#000435]/30" size={32} /></div>
        ) : step === 0 ? (
          <div className="max-w-5xl mx-auto space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-[#000435]">My assigned courses</h3>
                <p className="text-sm text-[#000435]/50 mt-1">
                  Select academic year and term, then pick a teaching assignment.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
                <div className="min-w-[160px]">
                  <label className="text-[10px] font-medium text-[#000435]/45 block mb-1">Academic year *</label>
                  <select
                    value={selectedAcademicYear || academicYear || currentAcademicYear || ''}
                    onChange={(e) => handleAcademicYearChange(e.target.value)}
                    className="w-full h-10 rounded-xl border border-black/10 px-3 text-sm text-[#000435] bg-white focus:ring-2 focus:ring-[#ff8c00]/25 focus:outline-none"
                  >
                    {(academicYearOptions.length
                      ? academicYearOptions
                      : [currentAcademicYear || academicYear].filter(Boolean)
                    ).map((y) => (
                      <option key={y} value={y}>
                        {y}{y === currentAcademicYear ? ' (current)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="min-w-[160px]">
                  <label className="text-[10px] font-medium text-[#000435]/45 block mb-1">Term *</label>
                  <select
                    value={selectedTerm || activeTerm || ''}
                    onChange={(e) => handleTermChange(e.target.value)}
                    className="w-full h-10 rounded-xl border border-black/10 px-3 text-sm text-[#000435] bg-white focus:ring-2 focus:ring-[#ff8c00]/25 focus:outline-none"
                  >
                    {(termOptions.length ? termOptions : ['Term 1', 'Term 2', 'Term 3']).map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#000435]/30" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search course or class…"
                  className="w-full h-10 pl-10 pr-3 rounded-xl border border-black/10 text-sm focus:ring-2 focus:ring-[#ff8c00]/25 focus:outline-none"
                />
              </div>
              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="h-10 rounded-xl border border-black/10 px-3 text-sm text-[#000435] bg-white"
              >
                <option value="">All classes</option>
                {classOptions.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {recentAssignments.length > 0 && (
              <div>
                <p className="text-xs font-medium text-[#000435]/45 mb-2">Recent</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {recentAssignments.map((a) => renderAssignmentCard(a, true))}
                </div>
              </div>
            )}

            {favoriteAssignments.length > 0 && (
              <div>
                <p className="text-xs font-medium text-[#000435]/45 mb-2">Favorites</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {favoriteAssignments.map((a) => renderAssignmentCard(a, true))}
                </div>
              </div>
            )}

            <div>
              <p className="text-xs font-medium text-[#000435]/45 mb-2">All assignments ({filteredAssignments.length})</p>
              {filteredAssignments.length === 0 ? (
                <p className="text-sm text-[#000435]/40 py-8 text-center rounded-2xl border border-dashed border-black/10 bg-white">
                  No teaching assignments for this term. Ask DOS to assign your courses under Timetable → Assignments.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredAssignments.map((a) => renderAssignmentCard(a))}
                </div>
              )}
            </div>
          </div>
        ) : step === 1 ? (
          <div className="max-w-xl mx-auto space-y-5">
            <div>
              <h3 className="text-lg font-semibold text-[#000435]">Create assessment</h3>
              <p className="text-sm text-[#000435]/50 mt-1">
                {selected?.subject_name} · {selected?.class_name}
                {selected?.term ? ` · ${selected.term}` : ''}
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-black/6 p-5 space-y-4 shadow-sm">
              <div>
                <label className="text-xs font-medium text-[#000435]/55 block mb-1.5">Assessment type *</label>
                <select
                  value={typeSlug}
                  onChange={(e) => { setTypeSlug(e.target.value); setAssessmentName(''); }}
                  className="w-full h-10 rounded-xl border border-black/10 px-3 text-sm focus:ring-2 focus:ring-[#ff8c00]/25 focus:outline-none"
                >
                  <option value="">Select type…</option>
                  {types.map((t) => (
                    <option key={t.slug} value={t.slug}>{t.name} ({t.weight_percent}%)</option>
                  ))}
                </select>
                {typeSlug && typeWeight != null && (
                  <div className="mt-3 p-3 rounded-xl bg-[#000435]/[0.03] border border-black/6 text-xs text-[#000435]/60">
                    <p><span className="font-medium text-[#000435]/80">{selectedType?.name}</span> category weight: <span className="font-semibold text-[#ff8c00]">{typeWeight}%</span></p>
                    <p className="mt-1">Assessments recorded: {typeCount}</p>
                    <p className="mt-1 text-[#000435]/40">System calculates category average as total obtained ÷ total maximum, then applies this weight.</p>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-medium text-[#000435]/55 block mb-1.5">Assessment name *</label>
                <input
                  value={assessmentName}
                  onChange={(e) => {
                    setAssessmentName(e.target.value);
                    setDuplicateWarn(false);
                  }}
                  placeholder="e.g. Algebra Homework 1"
                  className="w-full h-10 rounded-xl border border-black/10 px-3 text-sm focus:ring-2 focus:ring-[#ff8c00]/25 focus:outline-none"
                />
                {duplicateWarn && (
                  <p className="text-xs text-amber-700 mt-1.5 flex items-center gap-1"><AlertTriangle size={12} /> This assessment name already exists.</p>
                )}
                {suggestions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {suggestions.slice(0, 4).map((s) => (
                      <button key={s} type="button" onClick={() => setAssessmentName(s)} className="text-[10px] font-medium px-2 py-1 rounded-lg bg-[#ff8c00]/10 text-[#000435] hover:bg-[#ff8c00]/20">
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-[#000435]/55 block mb-1.5">Maximum marks *</label>
                  <input
                    type="number"
                    min={1}
                    max={200}
                    value={maxScore}
                    onChange={(e) => setMaxScore(Math.max(1, Number(e.target.value) || 1))}
                    className="w-full h-10 rounded-xl border border-black/10 px-3 text-sm focus:ring-2 focus:ring-[#ff8c00]/25 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-[#000435]/55 block mb-1.5">Assessment date *</label>
                  <input
                    type="date"
                    value={assessmentDate}
                    onChange={(e) => setAssessmentDate(e.target.value)}
                    className="w-full h-10 rounded-xl border border-black/10 px-3 text-sm focus:ring-2 focus:ring-[#ff8c00]/25 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-[#000435]/55 block mb-1.5">Description (optional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm focus:ring-2 focus:ring-[#ff8c00]/25 focus:outline-none resize-none"
                  placeholder="Notes for this assessment…"
                />
              </div>
            </div>
          </div>
        ) : step === 2 ? (
          <div className="max-w-3xl mx-auto space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-[#000435]">Enter marks</h3>
                <p className="text-sm text-[#000435]/50 mt-0.5">{assessmentName} · max {maxScore} · use A/E/M for absent/excused/missing</p>
              </div>
              {lastDraftSave && (
                <p className="text-[10px] text-[#000435]/35">Draft auto-saved {lastDraftSave.toLocaleTimeString()}</p>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { label: 'Average', value: liveStats.average != null ? liveStats.average : '—' },
                { label: 'Highest', value: liveStats.highest ?? '—' },
                { label: 'Lowest', value: liveStats.lowest ?? '—' },
                { label: 'Pass rate', value: liveStats.passRate != null ? `${liveStats.passRate}%` : '—' },
                { label: 'Missing', value: liveStats.missing, warn: liveStats.missing > 0 },
              ].map((s) => (
                <div key={s.label} className={`rounded-xl border px-3 py-2.5 ${s.warn ? 'border-amber-200 bg-amber-50' : 'border-black/6 bg-white'}`}>
                  <p className="text-[10px] text-[#000435]/40">{s.label}</p>
                  <p className="text-sm font-semibold text-[#000435]">{s.value}</p>
                </div>
              ))}
            </div>

            {liveStats.missing > 0 && (
              <p className="text-xs text-amber-700 flex items-center gap-1.5">
                <AlertTriangle size={14} /> {liveStats.missing} student{liveStats.missing !== 1 ? 's have' : ' has'} no marks
              </p>
            )}
            {validationError && (
              <p className="text-xs text-red-600 flex items-center gap-1.5"><AlertTriangle size={14} /> {validationError}</p>
            )}

            <div className="bg-white rounded-2xl border border-black/6 overflow-hidden shadow-sm" onPaste={handleBulkPaste}>
              <div className="px-4 py-2.5 border-b border-black/6 bg-[#000435]/[0.02] flex items-center justify-between">
                <p className="text-xs text-[#000435]/50">{students.length} students · Enter to move down · paste from Excel</p>
                <Zap size={14} className="text-[#ff8c00]" />
              </div>
              <div className="overflow-x-auto max-h-[50vh] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white z-10">
                    <tr className="border-b border-black/6 text-[10px] font-medium uppercase tracking-wide text-[#000435]/45">
                      <th className="text-left py-2.5 px-4 w-10">#</th>
                      <th className="text-left py-2.5 px-4">Student</th>
                      <th className="text-left py-2.5 px-4 w-36">Marks</th>
                      <th className="text-center py-2.5 px-4 w-16">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s, idx) => {
                      const entry = marks[s.student_id];
                      const raw = entry?.code || entry?.value || '';
                      const num = entry?.code ? null : (entry?.value ? Number(entry.value) : null);
                      const pct = num != null && maxScore > 0 ? Math.round((num / maxScore) * 100) : null;
                      return (
                        <tr key={s.student_id} className="border-t border-black/4 hover:bg-[#ff8c00]/3">
                          <td className="px-4 py-2 text-[#000435]/35 text-xs">{idx + 1}</td>
                          <td className="px-4 py-2">
                            <p className="font-medium text-[#000435]">{s.name}</p>
                            <p className="text-[10px] text-[#000435]/35">{s.student_uid}</p>
                          </td>
                          <td className="px-4 py-2">
                            <input
                              ref={(el) => { inputRefs.current[idx] = el; }}
                              type="text"
                              value={raw}
                              onChange={(e) => setMark(s.student_id, e.target.value)}
                              onKeyDown={(e) => handleKeyDown(idx, e)}
                              placeholder="—"
                              className="w-full h-9 px-3 rounded-lg border border-black/10 text-sm font-medium text-center focus:ring-2 focus:ring-[#ff8c00]/30 focus:outline-none"
                            />
                          </td>
                          <td className="px-4 py-2 text-center text-xs text-[#000435]/50">
                            {entry?.code ? entry.code : pct != null ? `${pct}%` : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : publishResult ? (
          <div className="max-w-lg mx-auto space-y-5">
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 size={28} className="text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-[#000435]">Marks published</h3>
              <p className="text-sm text-[#000435]/50 mt-1">Averages, grades, and rankings will update automatically.</p>
            </div>

            <div className="bg-white rounded-2xl border border-black/6 p-5 space-y-3 text-sm shadow-sm">
              <div className="grid grid-cols-2 gap-2 text-[#000435]/70">
                <span>Course</span><span className="font-medium text-[#000435] text-right">{selected?.subject_name}</span>
                <span>Class</span><span className="font-medium text-[#000435] text-right">{selected?.class_name}</span>
                <span>Assessment</span><span className="font-medium text-[#000435] text-right">{assessmentName}</span>
                <span>Maximum marks</span><span className="font-medium text-[#000435] text-right">{maxScore}</span>
                <span>Students</span><span className="font-medium text-[#000435] text-right">{students.length}</span>
              </div>
              <div className="pt-3 border-t border-black/6 grid grid-cols-2 gap-3">
                <div><p className="text-[10px] text-[#000435]/40">Highest</p><p className="font-semibold">{publishResult.stats.highest ?? '—'}</p></div>
                <div><p className="text-[10px] text-[#000435]/40">Lowest</p><p className="font-semibold">{publishResult.stats.lowest ?? '—'}</p></div>
                <div><p className="text-[10px] text-[#000435]/40">Average</p><p className="font-semibold">{publishResult.stats.average ?? '—'}</p></div>
                <div><p className="text-[10px] text-[#000435]/40">Pass rate</p><p className="font-semibold">{publishResult.stats.pass_rate != null ? `${publishResult.stats.pass_rate}%` : '—'}</p></div>
              </div>
            </div>

            {publishResult.atRisk.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <p className="font-medium flex items-center gap-1.5"><AlertTriangle size={16} /> {publishResult.atRisk.length} student{publishResult.atRisk.length !== 1 ? 's' : ''} scored below 40%</p>
                <p className="text-xs mt-1 text-amber-800/80">Consider creating an intervention list from At-risk students.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="max-w-lg mx-auto space-y-5">
            <div>
              <h3 className="text-lg font-semibold text-[#000435]">Review & publish</h3>
              <p className="text-sm text-[#000435]/50 mt-1">Confirm details before publishing to students and reports.</p>
            </div>

            <div className="bg-white rounded-2xl border border-black/6 p-5 space-y-3 text-sm shadow-sm">
              <div className="grid grid-cols-2 gap-2 text-[#000435]/70">
                <span>Course</span><span className="font-medium text-[#000435] text-right">{selected?.subject_name}</span>
                <span>Class</span><span className="font-medium text-[#000435] text-right">{selected?.class_name}</span>
                <span>Assessment</span><span className="font-medium text-[#000435] text-right">{assessmentName}</span>
                <span>Type</span><span className="font-medium text-[#000435] text-right">{selectedType?.name} ({selectedType?.weight_percent}%)</span>
                <span>Maximum marks</span><span className="font-medium text-[#000435] text-right">{maxScore}</span>
                <span>Students marked</span><span className="font-medium text-[#000435] text-right">{liveStats.filled} / {students.length}</span>
              </div>
              <div className="pt-3 border-t border-black/6 grid grid-cols-2 gap-3">
                <div><p className="text-[10px] text-[#000435]/40">Highest</p><p className="font-semibold">{liveStats.highest ?? '—'}</p></div>
                <div><p className="text-[10px] text-[#000435]/40">Lowest</p><p className="font-semibold">{liveStats.lowest ?? '—'}</p></div>
                <div><p className="text-[10px] text-[#000435]/40">Average</p><p className="font-semibold">{liveStats.average ?? '—'}</p></div>
                <div><p className="text-[10px] text-[#000435]/40">Pass rate</p><p className="font-semibold">{liveStats.passRate != null ? `${liveStats.passRate}%` : '—'}</p></div>
              </div>
            </div>

            {liveStats.missing > 0 && (
              <p className="text-xs text-amber-700 flex items-center gap-1.5">
                <AlertTriangle size={14} /> {liveStats.missing} student{liveStats.missing !== 1 ? 's have' : ' has'} no marks — you can still publish or go back to fill them.
              </p>
            )}
          </div>
        )}
        </div>
      </div>

      <footer className="shrink-0 bg-white border-t border-black/6 shadow-[0_-4px_24px_rgba(0,4,53,0.06)] px-5 sm:px-8 lg:px-10 py-4">
        <div className="w-full max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
        <div>
          {step > 0 && step < 3 && (
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium border border-black/10 text-[#000435]/70 hover:bg-black/5"
            >
              <ArrowLeft size={14} /> Back
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {step === 1 && (
            <button
              type="button"
              onClick={goToEnterMarks}
              disabled={!typeSlug || !assessmentName.trim()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-medium text-white bg-[#000435] hover:bg-[#0a116b] disabled:opacity-40"
            >
              Continue <ArrowRight size={14} />
            </button>
          )}
          {step === 2 && (
            <>
              <button
                type="button"
                onClick={() => handleSave('draft')}
                disabled={saving || liveStats.filled === 0}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium border border-black/10 text-[#000435]/70 hover:bg-black/5 disabled:opacity-40"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save draft
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                disabled={liveStats.filled === 0}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium border border-[#ff8c00]/30 text-[#000435] hover:bg-[#ff8c00]/10 disabled:opacity-40"
              >
                Review <ArrowRight size={14} />
              </button>
            </>
          )}
          {step === 3 && !publishResult && (
            <>
              <button type="button" onClick={() => setStep(2)} className="px-4 py-2.5 rounded-xl text-xs font-medium border border-black/10 text-[#000435]/70">Edit marks</button>
              <button
                type="button"
                onClick={() => handleSave('draft')}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium border border-black/10"
              >
                <Save size={14} /> Save draft
              </button>
              <button
                type="button"
                onClick={() => handleSave('published')}
                disabled={saving || liveStats.filled === 0}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-medium text-white bg-[#ff8c00] hover:opacity-90 disabled:opacity-40"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Publish marks
              </button>
            </>
          )}
          {step === 3 && publishResult && (
            <>
              <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl text-xs font-medium border border-black/10">Close</button>
              <button
                type="button"
                onClick={() => { setPublishResult(null); setAssessmentName(''); setMarks({}); setStep(1); }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-medium text-white bg-[#000435]"
              >
                <Plus size={14} /> Add another assessment
              </button>
            </>
          )}
        </div>
        </div>
      </footer>
    </div>
  );

  return createPortal(wizard, document.body);
}
