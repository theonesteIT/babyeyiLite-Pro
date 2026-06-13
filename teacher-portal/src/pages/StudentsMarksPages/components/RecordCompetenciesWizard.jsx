import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft, ArrowRight, Award, CheckCircle2, GraduationCap, Loader2, Save, X,
} from 'lucide-react';
import {
  fetchTeachingAssignments,
  fetchCompetencyCategories,
  fetchCompetencyRatings,
  saveCompetencyRatings,
} from '../../../services/marksApi.js';

const STEPS = ['Class assignment', 'Academic period', 'Rate competencies'];

const RATING_DEFAULT = 'Good';

export default function RecordCompetenciesWizard({ open, onClose, onSaved }) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [assignments, setAssignments] = useState([]);
  const [academicYear, setAcademicYear] = useState('');
  const [academicYearOptions, setAcademicYearOptions] = useState([]);
  const [termOptions, setTermOptions] = useState([]);
  const [term, setTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('');

  const [categories, setCategories] = useState([]);
  const [ratingLevels, setRatingLevels] = useState([]);
  const [students, setStudents] = useState([]);
  const [ratings, setRatings] = useState({});

  const classOptions = useMemo(() => {
    const set = new Set(assignments.map((a) => a.class_name));
    return Array.from(set).sort();
  }, [assignments]);

  const reset = useCallback(() => {
    setStep(0);
    setSelectedClass('');
    setStudents([]);
    setRatings({});
    setError(null);
  }, []);

  useEffect(() => {
    if (!open) return;
    reset();
    (async () => {
      setLoading(true);
      try {
        const res = await fetchTeachingAssignments();
        const data = res?.data || {};
        setAssignments(data.assignments || []);
        setAcademicYear(data.academic_year || '');
        setAcademicYearOptions(data.academic_years || []);
        setTerm(data.term || '');
        setTermOptions(data.terms || []);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load assignments');
      } finally {
        setLoading(false);
      }
    })();
  }, [open, reset]);

  const loadRatingsGrid = async () => {
    setLoading(true);
    setError(null);
    try {
      const [catRes, ratingRes] = await Promise.all([
        fetchCompetencyCategories(),
        fetchCompetencyRatings({
          class_name: selectedClass,
          academic_year: academicYear,
          term,
        }),
      ]);
      const cats = catRes?.data?.categories || [];
      const levels = catRes?.data?.rating_levels || [];
      const stu = ratingRes?.data?.students || [];
      const existing = ratingRes?.data?.ratings || {};
      setCategories(cats);
      setRatingLevels(levels.length ? levels : ['Excellent', 'Very Good', 'Good', 'Needs Improvement']);
      setStudents(stu);
      const grid = {};
      for (const s of stu) {
        grid[s.id] = {};
        for (const c of cats) {
          grid[s.id][c.id] = existing[s.id]?.[c.id] || RATING_DEFAULT;
        }
      }
      setRatings(grid);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load competency data');
    } finally {
      setLoading(false);
    }
  };

  const setRating = (studentId, categoryId, value) => {
    setRatings((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], [categoryId]: value },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = [];
      for (const s of students) {
        for (const c of categories) {
          payload.push({
            student_id: s.id,
            category_id: c.id,
            rating: ratings[s.id]?.[c.id] || RATING_DEFAULT,
          });
        }
      }
      await saveCompetencyRatings({
        class_name: selectedClass,
        academic_year: academicYear,
        term,
        ratings: payload,
      });
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save ratings');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Competency analysis</p>
            <h2 className="text-lg font-semibold text-[#000435]">{STEPS[step]}</h2>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {error && <p className="mb-4 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          {loading && step < 2 && (
            <div className="py-16 flex justify-center"><Loader2 className="animate-spin text-slate-400" /></div>
          )}

          {step === 0 && !loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {classOptions.map((cn) => (
                <button
                  key={cn}
                  type="button"
                  onClick={() => setSelectedClass(cn)}
                  className={`text-left p-4 rounded-xl border-2 transition-colors ${selectedClass === cn ? 'border-[#ff8c00] bg-amber-50' : 'border-slate-100 hover:border-slate-200'}`}
                >
                  <p className="font-semibold text-[#000435]">{cn}</p>
                  <p className="text-xs text-slate-500 mt-1">Your assigned class</p>
                </button>
              ))}
              {!classOptions.length && <p className="text-sm text-slate-500 col-span-2">No class assignments found.</p>}
            </div>
          )}

          {step === 1 && (
            <div className="max-w-md space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-500">Academic year</label>
                <select
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                >
                  {(academicYearOptions.length ? academicYearOptions : [academicYear]).filter(Boolean).map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500">Term</label>
                <select
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                >
                  {(termOptions.length ? termOptions : [term]).filter(Boolean).map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-slate-500">Class: <strong>{selectedClass}</strong></p>
            </div>
          )}

          {step === 2 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] uppercase text-slate-400">
                    <th className="text-left py-2 pr-3">Student</th>
                    {categories.map((c) => (
                      <th key={c.id} className="text-center px-2 py-2 whitespace-nowrap">{c.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <tr key={s.id} className="border-b border-slate-50">
                      <td className="py-2 pr-3 font-medium text-[#000435]">
                        {s.first_name} {s.last_name}
                      </td>
                      {categories.map((c) => (
                        <td key={c.id} className="px-2 py-2">
                          <select
                            value={ratings[s.id]?.[c.id] || RATING_DEFAULT}
                            onChange={(e) => setRating(s.id, c.id, e.target.value)}
                            className="w-full text-xs px-2 py-1.5 rounded-lg border border-slate-200"
                          >
                            {ratingLevels.map((l) => <option key={l} value={l}>{l}</option>)}
                          </select>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100 bg-slate-50/50">
          <button
            type="button"
            disabled={step === 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            className="inline-flex items-center gap-1 px-4 py-2 text-sm text-slate-600 disabled:opacity-40"
          >
            <ArrowLeft size={16} /> Back
          </button>
          {step < 2 ? (
            <button
              type="button"
              disabled={step === 0 && !selectedClass}
              onClick={() => (step === 0 ? setStep(1) : loadRatingsGrid())}
              className="inline-flex items-center gap-1 px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-[#ff8c00] hover:bg-[#e67e00] disabled:opacity-50"
            >
              Next <ArrowRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              disabled={saving}
              onClick={handleSave}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-[#000435] hover:bg-[#0a116b] disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Save competencies
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
