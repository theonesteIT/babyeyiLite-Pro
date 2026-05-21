import React, { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Filter,
  Loader2,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  TrendingDown,
  User,
} from 'lucide-react';
import api from '../services/api';
import ConductMarksModal from '../components/ConductMarksModal';
import { useAcademic } from '../context/AcademicContext';

const EMPTY_STATS = {
  caseCount: '—',
  studentsAffected: '—',
  totalMarksRemoved: '—',
  totalMarksDefault: '—',
};

export default function DisciplineReports() {
  const academic = useAcademic();
  const [searchTerm, setSearchTerm] = useState('');
  // Seed from global academic context; API meta will override once loaded
  const [activeAcademicYear, setActiveAcademicYear] = useState('—');
  const [activeTerm, setActiveTerm] = useState('—');

  useEffect(() => {
    if (!academic.loading && activeAcademicYear === '—') {
      if (academic.academicYear) setActiveAcademicYear(academic.academicYear);
      if (academic.currentTerm)  setActiveTerm(academic.currentTerm);
    }
  }, [academic.loading, academic.academicYear, academic.currentTerm]);
  const [selectedClass, setSelectedClass] = useState('All Classes');
  const [showMobileClassModal, setShowMobileClassModal] = useState(false);

  const [isConductModalOpen, setIsConductModalOpen] = useState(false);
  const [conductStudent, setConductStudent] = useState(null);

  const [students, setStudents] = useState([]);
  const [stats, setStats] = useState(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState({ key: 'name', dir: 'asc' });

  const openConductModal = (student = null) => {
    setConductStudent(student);
    setIsConductModalOpen(true);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setStatsLoading(true);
    setError(null);

    try {
      const [studentsRes, summaryRes] = await Promise.all([
        api.get('/discipline/students-summary', { params: { limit: 300 } }),
        api.get('/discipline/report-summary'),
      ]);

      if (studentsRes.data?.success) {
        setStudents(studentsRes.data.data || []);
        const m = studentsRes.data.meta || {};
        if (m.academic_year) setActiveAcademicYear(m.academic_year);
        if (m.term) setActiveTerm(m.term);
      }
      if (summaryRes.data?.success) {
        const d = summaryRes.data.data;
        setStats({
          caseCount: d.case_count ?? 0,
          studentsAffected: d.students_affected ?? 0,
          totalMarksRemoved: Number(d.total_marks_removed ?? 0).toFixed(0),
          totalMarksDefault: d.total_marks_default ?? 100,
        });
        if (d.academic_year) setActiveAcademicYear(d.academic_year);
        if (d.term) setActiveTerm(d.term);
      }
    } catch (e) {
      console.error('DisciplineReports fetch error:', e);
      setError('Failed to load discipline reports. Please try again.');
    } finally {
      setLoading(false);
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const uniqueClasses = ['All Classes', ...new Set(students.map((s) => s.class_name || 'Unassigned'))].sort((a, b) => {
    if (a === 'All Classes') return -1;
    if (b === 'All Classes') return 1;
    return a.localeCompare(b);
  });

  const filteredStudents = students.filter((s) => {
    const studentClass = s.class_name || 'Unassigned';
    const classMatch = selectedClass === 'All Classes' || studentClass === selectedClass;
    const name = `${s.first_name || ''} ${s.last_name || ''}`.toLowerCase();
    const uid = (s.student_uid || s.student_code || '').toLowerCase();
    const cls = studentClass.toLowerCase();
    const q = searchTerm.toLowerCase();
    return classMatch && (!q || name.includes(q) || uid.includes(q) || cls.includes(q));
  });

  const getStudentName = (s) => `${s.first_name || ''} ${s.last_name || ''}`.trim();

  const sortedStudents = [...filteredStudents].sort((a, b) => {
    const dir = sortBy.dir === 'asc' ? 1 : -1;
    if (sortBy.key === 'class') {
      return String(a.class_name || 'Unassigned').localeCompare(String(b.class_name || 'Unassigned')) * dir;
    }
    if (sortBy.key === 'standing') {
      const aPct = Number(a.discipline_remaining ?? 0) / (Number(a.discipline_total ?? 100) || 100);
      const bPct = Number(b.discipline_remaining ?? 0) / (Number(b.discipline_total ?? 100) || 100);
      return (aPct - bPct) * dir;
    }
    if (sortBy.key === 'score') {
      return (Number(a.discipline_remaining ?? 0) - Number(b.discipline_remaining ?? 0)) * dir;
    }
    return getStudentName(a).localeCompare(getStudentName(b)) * dir;
  });

  const toggleSort = (key) => {
    setSortBy((prev) => {
      if (prev.key !== key) return { key, dir: 'asc' };
      return { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' };
    });
  };

  const sortBadge = (key) => (sortBy.key === key ? (sortBy.dir === 'asc' ? '↑' : '↓') : '');

  return (
    <div className="animate-in fade-in duration-700 bg-re-bg min-h-screen">
      <ConductMarksModal
        isOpen={isConductModalOpen}
        onClose={() => setIsConductModalOpen(false)}
        initialStudent={conductStudent}
        academicYear={activeAcademicYear !== '—' ? activeAcademicYear : undefined}
        term={activeTerm !== '—' ? activeTerm : undefined}
        onSuccess={fetchData}
      />

      <div className="relative w-full min-h-[280px] overflow-hidden bg-[#c87800]">
        <div className="relative z-20 max-w-[1600px] mx-auto px-6 md:px-12 pt-16 pb-24">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-6 h-1 rounded-full bg-white/70"></span>
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/80">Student Conduct</p>
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold text-white tracking-tight leading-none mb-2 mt-2 uppercase" style={{ fontFamily: "'Montserrat', sans-serif" }}>
            Discipline Reports
          </h1>
          <p className="text-[10px] font-medium text-white/60 max-w-xl leading-relaxed uppercase tracking-widest" style={{ fontFamily: "'Montserrat', sans-serif" }}>
            Each student discipline marks with class filters and term analytics.
          </p>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 md:px-12 -mt-4 sm:-mt-5 md:-mt-6 pt-2 relative z-20 pb-20">
        <div className="bg-white rounded-t-[32px] border border-black/5 overflow-hidden flex flex-col">
          <div className="grid grid-cols-1 lg:grid-cols-4 border-b border-black/5">
            <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-black/5">
              {[
                { label: 'Total Cases', value: statsLoading ? '…' : String(stats.caseCount), icon: <ShieldAlert size={14} className="text-red-500" /> },
                { label: 'Students Affected', value: statsLoading ? '…' : String(stats.studentsAffected), icon: <ShieldCheck size={14} className="text-emerald-500" /> },
                { label: 'Marks Removed', value: statsLoading ? '…' : String(stats.totalMarksRemoved), icon: <TrendingDown size={14} /> },
                { label: 'Total Mark (default)', value: statsLoading ? '…' : String(stats.totalMarksDefault), icon: <AlertTriangle size={14} className="text-amber-500" /> },
              ].map((stat) => (
                <div key={stat.label} className="p-4 sm:p-8 flex flex-col items-center justify-center text-center group hover:bg-re-bg/20 transition-all">
                  <div className="mb-1.5 sm:mb-2 opacity-40 shrink-0">{stat.icon}</div>
                  <span className="text-sm sm:text-2xl font-semibold text-re-text tracking-tighter">{stat.value}</span>
                  <p className="text-[6px] sm:text-[8px] font-semibold text-re-text-muted uppercase tracking-[0.2em] mt-0.5 sm:mt-1 opacity-60">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
            <div className="hidden lg:flex flex-col border-l border-black/5 bg-re-bg/30 p-6 justify-center gap-3">
              <button
                onClick={() => openConductModal(null)}
                className="w-full h-11 flex items-center justify-center gap-2 bg-[#c87800] border border-[#c87800] text-white font-medium text-[9px] uppercase tracking-widest rounded-xl hover:opacity-90 transition-all"
              >
                <Activity size={14} />
                <span className="tracking-tighter">+/-</span> <span>Conduct Marks</span>
              </button>
            </div>
          </div>

          <div className="lg:hidden flex flex-col bg-white border-b border-black/5 divide-y divide-black/5">
            <div className="flex items-center justify-between px-6 py-3">
              <span className="text-[10px] font-semibold text-[#000435] uppercase tracking-widest">{selectedClass}</span>
              <button onClick={() => setShowMobileClassModal(true)} className="text-[9px] font-semibold text-[#c87800] uppercase tracking-widest hover:underline">Change Class</button>
            </div>
            <div className="flex items-center justify-between px-6 py-3">
              <span className="text-[10px] font-semibold text-[#000435] uppercase tracking-widest">{activeAcademicYear} · {activeTerm}</span>
              <span className="text-[9px] font-semibold text-[#000435]/60 uppercase tracking-widest">From manager settings</span>
            </div>
          </div>

          <div className="flex p-6 md:px-8 border-b border-black/5 flex-col lg:flex-row items-center gap-3 bg-white/50">
            <div className="relative w-full lg:w-[11rem]">
              <Filter size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#c87800]" />
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full h-10 bg-white border border-black/5 rounded-xl pl-9 pr-3 text-[10px] font-semibold uppercase tracking-widest outline-none"
              >
                {uniqueClasses.map((cls) => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>
            </div>
            <div className="h-10 px-3 inline-flex items-center bg-re-bg rounded-xl border border-black/5 text-[10px] font-semibold uppercase tracking-widest text-[#000435]">
              {activeAcademicYear} · {activeTerm}
            </div>

            <div className="relative flex-1 w-full group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-re-text-muted/40 group-focus-within:text-[#c87800] transition-colors" size={16} />
              <input
                type="text"
                placeholder="Search by student, class or UID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-10 bg-re-bg rounded-xl pl-11 pr-4 font-extrabold outline-none border border-transparent focus:border-[#c87800]/30 focus:bg-white transition-all text-re-text text-sm sm:text-xs tracking-tight"
              />
            </div>
            <button onClick={fetchData} disabled={loading} className="h-10 w-10 flex items-center justify-center bg-white border border-black/5 rounded-xl hover:bg-re-bg transition-all disabled:opacity-40">
              <RefreshCw size={14} className={`text-[#c87800] ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {error && (
            <div className="mx-6 md:mx-8 mt-4 flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-100 rounded-xl">
              <AlertTriangle size={14} className="text-red-500 shrink-0" />
              <p className="text-[10px] font-semibold text-red-700 uppercase tracking-widest">{error}</p>
              <button onClick={fetchData} className="ml-auto text-[9px] font-semibold text-red-500 hover:underline uppercase tracking-widest">Retry</button>
            </div>
          )}

          <div className="overflow-x-auto bg-white">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-re-bg/20 border-b border-black/5">
                  <th onClick={() => toggleSort('name')} className="px-4 sm:px-8 py-3 sm:py-4 text-[7px] sm:text-[8px] font-semibold text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5 cursor-pointer">Student {sortBadge('name')}</th>
                  <th onClick={() => toggleSort('class')} className="hidden md:table-cell px-8 py-4 text-[8px] font-semibold text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5 cursor-pointer">Class {sortBadge('class')}</th>
                  <th onClick={() => toggleSort('standing')} className="hidden md:table-cell px-8 py-4 text-[8px] font-semibold text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5 cursor-pointer">Conduct Standing {sortBadge('standing')}</th>
                  <th onClick={() => toggleSort('score')} className="md:hidden px-4 py-3 text-[7px] font-semibold text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5 text-center cursor-pointer">Score {sortBadge('score')}</th>
                  <th className="px-4 sm:px-8 py-3 sm:py-4 text-[7px] sm:text-[8px] font-semibold text-re-text-muted uppercase tracking-[0.2em] opacity-40 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="p-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 size={24} className="animate-spin text-[#1E3A5F]/40" />
                        <p className="text-[10px] font-semibold text-re-text-muted uppercase tracking-widest">Loading Discipline Reports...</p>
                      </div>
                    </td>
                  </tr>
                ) : sortedStudents.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-14 h-14 bg-re-bg rounded-2xl flex items-center justify-center border border-black/5">
                          <ShieldCheck size={24} className="text-emerald-400" />
                        </div>
                        <p className="text-[10px] font-semibold text-re-text-muted uppercase tracking-widest">
                          {searchTerm ? 'No learners match your search' : 'No learners found'}
                        </p>
                        <p className="text-[9px] text-re-text-muted/50 font-bold uppercase tracking-widest italic">
                          {activeAcademicYear} · {activeTerm}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  sortedStudents.map((s) => {
                    const studentName = `${s.first_name || ''} ${s.last_name || ''}`.trim();
                    const uid = s.student_uid || s.student_code || `#${s.id}`;
                    const remaining = Number(s.discipline_remaining ?? 0);
                    const total = Number(s.discipline_total ?? 100) || 100;
                    const deducted = Number(s.discipline_deducted ?? 0);
                    const isCritical = remaining < total * 0.5;
                    const isWarning = !isCritical && remaining < total * 0.75;
                    return (
                      <tr key={s.id} className="hover:bg-re-bg/60 even:bg-re-bg/20 transition-colors group cursor-default">
                        <td className="px-4 sm:px-8 py-3 sm:py-5 border-r border-black/5">
                          <div className="flex items-center gap-3 sm:gap-4">
                            <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl border flex-shrink-0 flex items-center justify-center overflow-hidden ${
                              isCritical ? 'bg-red-50 border-red-100 text-red-500' : isWarning ? 'bg-amber-50 border-amber-100 text-amber-500' : 'bg-emerald-50 border-emerald-100 text-emerald-500'
                            }`}>
                              <User size={13} className="sm:w-3.5 sm:h-3.5" />
                            </div>
                            <div>
                              <p className="text-xs sm:text-sm font-semibold text-re-text tracking-tight uppercase leading-none mb-1 group-hover:text-[#1E3A5F] transition-colors">{studentName}</p>
                              <p className="text-[7px] sm:text-[9px] font-bold text-re-text-muted opacity-80 uppercase tracking-widest leading-none truncate max-w-[220px]">{uid}</p>
                            </div>
                          </div>
                        </td>

                        <td className="hidden md:table-cell px-8 py-5 border-r border-black/5">
                          <p className="text-[10px] font-semibold text-[#1E3A5F]">{s.class_name || 'Unassigned'}</p>
                        </td>

                        <td className="hidden md:table-cell px-8 py-5 border-r border-black/5">
                          <div className="flex flex-col gap-1">
                            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg ring-1 ring-inset text-[8px] font-semibold uppercase tracking-widest w-fit ${
                              isCritical ? 'bg-red-50 text-red-600 ring-red-500/20' : isWarning ? 'bg-amber-50 text-amber-600 ring-amber-500/20' : 'bg-emerald-50 text-emerald-600 ring-emerald-500/20'
                            }`}>
                              <span>Remaining: {remaining.toFixed(0)} / {total}</span>
                            </div>
                            <p className="text-[7px] font-bold text-re-text-muted opacity-50 uppercase tracking-widest">
                              Deducted: -{deducted.toFixed(0)} pts
                            </p>
                          </div>
                        </td>

                        <td className="md:hidden px-4 py-3 text-center border-r border-black/5">
                          <div className="text-sm font-semibold text-[#1E3A5F]">{remaining.toFixed(0)}</div>
                          <div className="text-[7px] text-re-text-muted">/ {total}</div>
                        </td>

                        <td className="px-4 sm:px-8 py-3 sm:py-5 text-right">
                          <button
                            onClick={() => openConductModal({
                              id: uid,
                              dbId: s.id,
                              name: studentName,
                              grade: s.class_name || '',
                            })}
                            className="h-8 px-4 rounded-xl flex items-center justify-center gap-2 bg-white border border-black/5 text-re-text font-medium text-[9px] uppercase tracking-widest hover:bg-re-bg hover:text-[#1E3A5F] transition-all ml-auto"
                          >
                            <Activity size={12} />
                            <span className="hidden sm:inline">+/- Marks</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex px-4 sm:px-8 py-5 bg-re-bg/20 border-t border-black/5 flex-row items-center justify-between gap-4">
            <p className="text-[7px] sm:text-[8px] font-semibold text-re-text-muted uppercase tracking-[0.2em] opacity-40 italic whitespace-nowrap">
              {loading ? '—' : `${sortedStudents.length} Learners`} · {activeAcademicYear} · {activeTerm} · {selectedClass}
            </p>
          </div>
        </div>
      </div>

      {showMobileClassModal && (
        <div className="fixed lg:hidden inset-0 z-[200] bg-black/50 flex flex-col justify-end backdrop-blur-sm">
          <div className="bg-white w-full rounded-t-3xl max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-black/5 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-[#000435]">Select Class</span>
              <button onClick={() => setShowMobileClassModal(false)} className="w-8 h-8 flex items-center justify-center bg-re-bg border border-black/5 rounded-full text-[#000435] font-semibold text-xs">X</button>
            </div>
            <div className="overflow-y-auto p-4 flex flex-col gap-2">
              {uniqueClasses.map((cls) => (
                <button
                  key={cls}
                  onClick={() => { setSelectedClass(cls); setShowMobileClassModal(false); }}
                  className={`p-4 rounded-xl text-[10px] font-semibold tracking-widest text-left border ${selectedClass === cls ? 'bg-[#1E3A5F] text-white border-[#1E3A5F]' : 'bg-white border-black/5 text-[#000435]'}`}
                >
                  {cls}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
