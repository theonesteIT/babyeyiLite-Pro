import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import { useAcademic } from '../context/AcademicContext';
import {
  Search, FileText, FileSpreadsheet, Eye, Activity, BookOpen, Plus, AlertTriangle, Users,
  RefreshCw, MoreVertical, UserCheck,
} from 'lucide-react';
import {
  RegistryPageShell,
  RegistryPageHeader,
  RegistryStatGrid,
  RegistryCard,
  ExportSplitButton,
} from '../components/RegistryPageChrome';
import {
  AttendanceDonutSummaryCard,
  computeRollMixFromRows,
  rowSessionTotals,
} from '../components/AttendanceReportShared';
import { useAuth } from '../context/AuthContext';

const TERM_DAYS = {
  'Term 1 (Current)': 90,
  'Term 2': 90,
  'Term 3': 90,
  'Annual Review': 365,
};

function getTermRange(selectedYear, selectedTerm) {
  const [a, b] = String(selectedYear || '').split('-').map((v) => Number(v));
  if (!a || !b) return { from: '', to: '' };
  if (selectedTerm.includes('Term 1')) return { from: `${a}-09-01`, to: `${a}-12-31` };
  if (selectedTerm === 'Term 2') return { from: `${b}-01-01`, to: `${b}-04-30` };
  if (selectedTerm === 'Term 3') return { from: `${b}-05-01`, to: `${b}-08-31` };
  return { from: `${a}-09-01`, to: `${b}-08-31` };
}

function statusBadgeClass(status) {
  if (status === 'Exceptional') return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
  if (status === 'Expected') return 'bg-blue-50 text-blue-700 ring-blue-200';
  return 'bg-rose-50 text-rose-700 ring-rose-200';
}

const StudentAttendanceReports = () => {
  const academic = useAcademic();
  const { manager } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [exportOpen, setExportOpen] = useState(false);
  const [selectedTerm, setSelectedTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [specificDate, setSpecificDate] = useState('');

  useEffect(() => {
    if (!academic.loading && academic.currentTerm) {
      setSelectedTerm((prev) => prev || academic.currentTerm);
      setSelectedYear((prev) => prev || academic.academicYear);
    }
  }, [academic.loading, academic.currentTerm, academic.academicYear]);

  const [stats, setStats] = useState({
    globalPresence: '—',
    chronicAbsentees: '0',
    mostPresentClass: '—',
    termSync: 'Live',
  });
  const [range, setRange] = useState({ from: '', to: '' });
  const [classRows, setClassRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const terms = [...(academic.activeTerms.length ? academic.activeTerms : ['Term 1', 'Term 2', 'Term 3']), 'Annual Review'];
  const years = academic.academicYears;

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const termRange = getTermRange(selectedYear, selectedTerm);
      const from = specificDate || termRange.from;
      const to = specificDate || termRange.to;
      const res = await api.get('/dos/reports/attendance/by-class', {
        params: { from, to, days: TERM_DAYS[selectedTerm] || 90 },
      });
      if (!res.data.success) {
        setError(res.data.message || 'Failed to load');
        return;
      }
      const { stats: s, classes } = res.data.data || {};
      if (s) {
        setStats({
          globalPresence: s.globalPresence ?? '—',
          chronicAbsentees: s.chronicAbsentees ?? '0',
          mostPresentClass: s.mostPresentClass ?? '—',
          termSync: s.termSync ?? 'Live',
        });
        if (s.range) setRange(s.range);
      }
      setClassRows(Array.isArray(classes) ? classes : []);
    } catch (e) {
      console.error(e);
      setError(e.response?.data?.message || e.message || 'Could not load report');
      setClassRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedTerm && selectedYear) load();
  }, [selectedTerm, selectedYear, specificDate]);

  const filteredAnalytics = useMemo(
    () =>
      classRows.filter(
        (cls) =>
          cls.class.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (cls.headTeacher || '').toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    [classRows, searchTerm],
  );

  const rollMix = useMemo(() => computeRollMixFromRows(filteredAnalytics), [filteredAnalytics]);

  const registryStatItems = useMemo(
    () => [
      { label: 'Global presence', value: stats.globalPresence, icon: UserCheck, tone: 'navy' },
      { label: 'Chronic weak classes', value: stats.chronicAbsentees, icon: AlertTriangle, tone: 'gold' },
      { label: 'Strongest class', value: stats.mostPresentClass, icon: Users, tone: 'emerald' },
      { label: 'Live feed', value: stats.termSync, icon: Activity, tone: 'violet' },
    ],
    [stats],
  );

  const windowHint = range.from && range.to ? `${range.from} → ${range.to}` : `${TERM_DAYS[selectedTerm] || 90} day window`;

  return (
    <RegistryPageShell>
      <RegistryPageHeader
        overline="Roll-call analytics"
        title="Student attendance reports"
        subtitle={`Class-level presence from lesson roll-call records. ${manager?.school?.name ? `School: ${manager.school.name}. ` : ''}Window: ${windowHint}.`}
        secondaryAction={(
          <div className="flex flex-col sm:flex-row flex-wrap gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => load()}
              className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[13px] font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin text-re-navy' : 'text-slate-500'} />
              Refresh
            </button>
            <ExportSplitButton open={exportOpen} onOpen={setExportOpen} onClose={() => setExportOpen(false)}>
              <button
                type="button"
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-slate-400 cursor-not-allowed"
                disabled
              >
                <FileText size={16} className="text-re-gold shrink-0" /> Export PDF
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2 border-t border-slate-100 px-4 py-2.5 text-left text-sm font-medium text-slate-400 cursor-not-allowed"
                disabled
              >
                <FileSpreadsheet size={16} className="text-re-gold shrink-0" /> Export Excel
              </button>
            </ExportSplitButton>
          </div>
        )}
        primaryAction={(
          <button
            type="button"
            disabled
            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-[13px] font-bold text-slate-400 cursor-not-allowed"
          >
            <Plus size={18} className="text-slate-300" />
            Generate
          </button>
        )}
      />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 lg:gap-6">
        <div className="xl:col-span-8 min-w-0">
          <RegistryStatGrid columns="sm:grid-cols-2 xl:grid-cols-4" items={registryStatItems} />
        </div>
        <div className="xl:col-span-4 min-w-0">
          <AttendanceDonutSummaryCard
            present={rollMix.present}
            absent={rollMix.absent}
            title="Attendance overview"
            footnote="Late and permission-style marks are counted as present (same rules as lesson roll-call)."
          />
        </div>
      </div>

      <RegistryCard>
        <div className="space-y-4 border-b border-slate-100 bg-white p-4 sm:p-6">
          <div className="relative w-full group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-re-navy transition-colors" size={18} />
            <input
              type="search"
              placeholder="Search by class or teacher…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm font-medium text-slate-800 outline-none transition-all focus:border-re-gold/40 focus:bg-white focus:ring-2 focus:ring-re-gold/20"
            />
          </div>
          <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 lg:max-w-[200px]"
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            <div className="flex flex-wrap gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-1">
              {terms.map((term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => setSelectedTerm(term)}
                  className={`rounded-lg px-3 py-2 text-[10px] font-bold uppercase tracking-wide transition-all sm:px-4 sm:text-[11px] ${
                    selectedTerm === term
                      ? 'bg-white text-re-navy shadow-sm ring-1 ring-slate-200/80'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {term}
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-1 sm:justify-end">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-500 whitespace-nowrap">
                <span className="hidden sm:inline">Date override</span>
                <input
                  type="date"
                  value={specificDate}
                  onChange={(e) => setSpecificDate(e.target.value)}
                  className="h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 sm:w-auto"
                />
              </label>
            </div>
          </div>
        </div>

        {error && (
          <div className="px-6 py-4 bg-red-50 text-red-800 text-sm font-semibold border-b border-red-100">{error}</div>
        )}

        <div className="overflow-x-auto -mx-px">
          <table className="min-w-[760px] w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-100">
                <th className="px-4 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider sm:px-6">Class</th>
                <th className="px-4 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider hidden md:table-cell">Sessions</th>
                <th className="px-4 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Present</th>
                <th className="px-4 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Absent</th>
                <th className="px-4 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider hidden md:table-cell">Rate</th>
                <th className="px-4 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider hidden md:table-cell">Status</th>
                <th className="px-4 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right sm:px-6">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <RefreshCw className="animate-spin inline text-re-navy mb-2" size={24} />
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Loading attendance…</p>
                  </td>
                </tr>
              ) : filteredAnalytics.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-sm text-slate-500 font-medium">
                    No roll-call records in this window. Mark attendance from the Attendance page or extend the term window (Annual Review = 365 days).
                  </td>
                </tr>
              ) : (
                filteredAnalytics.map((cls) => {
                  const t = rowSessionTotals(cls);
                  const pr = t.total ? Math.round((t.present / t.total) * 100) : 0;
                  const ar = t.total ? Math.round((t.absent / t.total) * 100) : 0;
                  return (
                    <tr key={cls.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-4 align-top sm:px-6">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-100 bg-slate-50 text-slate-400">
                            <BookOpen size={18} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-900 leading-snug">{cls.class}</p>
                            <p className="text-[11px] font-medium text-slate-500 mt-0.5">Timetable: {cls.headTeacher}</p>
                            <div className="mt-2 space-y-1 md:hidden text-[11px]">
                              <p>
                                <span className="text-emerald-600 font-semibold">{t.present}</span>
                                <span className="text-slate-400"> present · </span>
                                <span className="text-rose-600 font-semibold">{t.absent}</span>
                                <span className="text-slate-400"> absent</span>
                              </p>
                              <p className="font-bold text-slate-800">{cls.presenceRate}% rate</p>
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset ${statusBadgeClass(cls.status)}`}
                              >
                                {cls.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm font-semibold tabular-nums text-slate-700 hidden md:table-cell">
                        {t.total ? t.total.toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-4 hidden lg:table-cell">
                        <p className="text-sm font-semibold text-emerald-700 tabular-nums">{t.present.toLocaleString()}</p>
                        <p className="text-[11px] text-slate-500">{t.total ? `${pr}%` : '—'}</p>
                      </td>
                      <td className="px-4 py-4 hidden lg:table-cell">
                        <p className="text-sm font-semibold text-rose-700 tabular-nums">{t.absent.toLocaleString()}</p>
                        <p className="text-[11px] text-slate-500">{t.total ? `${ar}%` : '—'}</p>
                      </td>
                      <td className="px-4 py-4 hidden md:table-cell">
                        <div className="space-y-2 max-w-[140px]">
                          <p className="text-sm font-bold text-slate-900 tabular-nums">{cls.presenceRate}%</p>
                          <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${Math.min(100, cls.presenceRate)}%`,
                                background:
                                  cls.presenceRate >= 95
                                    ? 'linear-gradient(90deg, #1E3A5F, #3D5A80)'
                                    : cls.presenceRate >= 85
                                      ? '#FEBF10'
                                      : '#ef4444',
                              }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 hidden md:table-cell">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset ${statusBadgeClass(cls.status)}`}
                        >
                          {cls.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right align-middle sm:px-6">
                        <div className="inline-flex items-center justify-end gap-1">
                          <button
                            type="button"
                            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-re-navy transition-colors"
                            title="View details"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            type="button"
                            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-re-navy transition-colors"
                            title="More"
                          >
                            <MoreVertical size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-4 py-4 bg-slate-50/80 border-t border-slate-100 sm:px-6">
          <p className="text-[11px] font-medium text-slate-500">
            Live from lesson roll-call · {selectedYear} · {selectedTerm}
          </p>
          <p className="text-[11px] text-slate-400 tabular-nums">{windowHint}</p>
        </div>
      </RegistryCard>
    </RegistryPageShell>
  );
};

export default StudentAttendanceReports;
