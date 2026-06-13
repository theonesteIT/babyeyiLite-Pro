import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle, BookOpen, Calendar, CheckCircle2, Loader2, Plus, RefreshCw, Save, Settings, X,
} from 'lucide-react';
import { toDateInputValue } from '../../../../../shared/dateInput';
import PageShell, { KpiCard, Panel } from '../../components/PageShell';
import {
  fetchAcademicCalendar, registerAcademicYear, saveAcademicCalendar, setCurrentAcademicYear,
} from '../../services/marksAcademicApi';

const TERM_OPTIONS = ['Term 1', 'Term 2', 'Term 3'];

const btnPrimary = 'inline-flex items-center gap-2 h-9 px-4 rounded-xl text-xs font-medium bg-[#f59e0b] text-[#000435] hover:opacity-90 transition-opacity';
const btnSecondary = 'inline-flex items-center gap-2 h-9 px-4 rounded-xl text-xs font-medium bg-[#000435] text-white hover:bg-[#0a116b] transition-colors';
const btnGhost = 'px-2.5 py-1 rounded-lg bg-[#000435]/5 text-[10px] font-medium text-[#000435]/60 hover:bg-[#f59e0b]/15 transition-colors';

function emptyTermDates(terms) {
  return terms.map((n) => ({ name: n, start: '', end: '' }));
}

function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
}

export default function AcademicCalendarPage() {
  const [registry, setRegistry] = useState([]);
  const [academicYear, setAcademicYear] = useState('');
  const [newYear, setNewYear] = useState('');
  const [activeTerms, setActiveTerms] = useState(TERM_OPTIONS);
  const [termDates, setTermDates] = useState(emptyTermDates(TERM_OPTIONS));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchAcademicCalendar();
      if (res?.success) {
        const d = res.data || {};
        const list = Array.isArray(d.academic_years_registry) ? d.academic_years_registry : [];
        setRegistry(list);
        const current = list.find((r) => r.is_current) || list[0];
        const year = d.current_academic_year || current?.academic_year || '';
        const terms = current?.active_terms?.length ? current.active_terms : TERM_OPTIONS;
        setAcademicYear(year);
        setActiveTerms(terms);
        const saved = current?.term_dates || d.term_dates || [];
        setTermDates(
          terms.map((n) => {
            const row = saved.find((x) => x.name === n);
            return row
              ? { name: n, start: toDateInputValue(row.start), end: toDateInputValue(row.end) }
              : { name: n, start: '', end: '' };
          })
        );
      }
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Failed to load calendar' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const currentRow = registry.find((r) => r.is_current);
  const setTermDate = (termName, field, value) => {
    setTermDates((prev) => prev.map((d) => (d.name === termName ? { ...d, [field]: value } : d)));
  };

  const handleActiveTermsChange = (checked, term) => {
    const next = checked ? [...new Set([...activeTerms, term])] : activeTerms.filter((x) => x !== term);
    setActiveTerms(next);
    setTermDates((prev) => next.map((n) => prev.find((d) => d.name === n) || { name: n, start: '', end: '' }));
  };

  const selectYearForEdit = (row) => {
    setAcademicYear(row.academic_year);
    const terms = row.active_terms?.length ? row.active_terms : TERM_OPTIONS;
    setActiveTerms(terms);
    setTermDates(
      terms.map((n) => {
        const td = row.term_dates?.find((x) => x.name === n);
        return td
          ? { name: n, start: toDateInputValue(td.start), end: toDateInputValue(td.end) }
          : { name: n, start: '', end: '' };
      })
    );
  };

  const handleSaveCurrent = async () => {
    setSaving(true);
    try {
      const res = await saveAcademicCalendar({
        current_academic_year: academicYear,
        active_terms: activeTerms.map((t) => String(t).trim()).filter(Boolean),
        term_dates: termDates,
      });
      if (res?.success) {
        setRegistry(res.data?.academic_years_registry || []);
        setToast({ type: 'success', message: 'Academic year & terms saved — all portals will use this.' });
        await load();
      }
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Failed to save' });
    } finally {
      setSaving(false);
    }
  };

  const handleRegisterYear = async () => {
    const y = String(newYear || '').trim();
    if (!/^\d{4}-\d{4}$/.test(y)) {
      setToast({ type: 'error', message: 'Use format YYYY-YYYY (e.g. 2026-2027)' });
      return;
    }
    setSaving(true);
    try {
      const res = await registerAcademicYear({
        academic_year: y,
        active_terms: activeTerms,
        term_dates: termDates,
        set_as_current: false,
      });
      if (res?.success) {
        setRegistry(res.data?.academic_years_registry || []);
        setNewYear('');
        setToast({ type: 'success', message: `Academic year ${y} registered` });
        await load();
      }
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Failed to register' });
    } finally {
      setSaving(false);
    }
  };

  const handleSetCurrent = async (year) => {
    try {
      const res = await setCurrentAcademicYear(year);
      if (res?.success) {
        setRegistry(res.data?.academic_years_registry || []);
        setAcademicYear(res.data?.current_academic_year || year);
        setToast({ type: 'success', message: `${year} is now the current academic year` });
        await load();
      }
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Failed to set current' });
    }
  };

  return (
    <PageShell
      title="Academic Years & Terms"
      subtitle="Set the current academic year and term dates — used school-wide by DOS, teachers, and reports."
      actions={(
        <button type="button" onClick={load} disabled={loading} className={btnSecondary}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      )}
    >
      {toast && (
        <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium border ${toast.type === 'success' ? 'bg-[#f59e0b]/8 border-[#f59e0b]/25 text-[#000435]' : 'bg-[#000435]/5 border-[#000435]/12 text-[#000435]'}`}>
          {toast.type === 'success' ? <CheckCircle2 size={16} className="text-[#f59e0b]" /> : <AlertTriangle size={16} className="text-[#f59e0b]" />}
          {toast.message}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={Calendar} label="Registered years" value={registry.length} />
        <KpiCard icon={BookOpen} label="Current year" value={currentRow?.academic_year || academicYear || '—'} accent="text-[#f59e0b]" />
        <KpiCard icon={Settings} label="Active terms" value={activeTerms.length} />
        <KpiCard icon={Calendar} label="Students (current)" value={currentRow?.student_count ?? '—'} />
      </div>

      <Panel title="All academic years">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-[#000435]/25" /></div>
        ) : registry.length === 0 ? (
          <p className="text-sm text-[#000435]/35 text-center py-10">No years registered. Add your first year below.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[#000435]/8">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="bg-[#000435]/[0.03] text-[#000435]/50 text-[10px] font-medium uppercase tracking-wide">
                  <th className="text-left py-3 px-4">Year</th>
                  <th className="text-left py-3 px-4">Status</th>
                  <th className="text-left py-3 px-4">Terms</th>
                  <th className="text-left py-3 px-4">Term dates</th>
                  <th className="text-right py-3 px-4">Students</th>
                  <th className="text-right py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {registry.map((row, i) => (
                  <tr key={row.academic_year} className={`border-t border-[#000435]/6 ${row.is_current ? 'bg-[#f59e0b]/6' : i % 2 ? 'bg-[#000435]/[0.015]' : 'bg-white'}`}>
                    <td className="py-3 px-4 font-medium text-[#000435]">{row.academic_year}</td>
                    <td className="py-3 px-4">
                      {row.is_current ? (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#000435]/8 text-[#000435]/70">Current</span>
                      ) : (
                        <span className="text-[10px] text-[#000435]/35 font-medium">Registered</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-[#000435]/55 text-xs">{(row.active_terms || []).join(', ')}</td>
                    <td className="py-3 px-4 text-xs text-[#000435]/50">
                      {(row.term_dates || []).map((t) => (
                        <div key={t.name}><span className="font-medium text-[#000435]/65">{t.name}:</span> {t.start && t.end ? `${formatDate(t.start)} → ${formatDate(t.end)}` : 'Not set'}</div>
                      ))}
                    </td>
                    <td className="py-3 px-4 text-right font-medium tabular-nums text-[#000435]/70">{row.student_count ?? 0}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button type="button" onClick={() => selectYearForEdit(row)} className={btnGhost}>Edit</button>
                        {!row.is_current && (
                          <button type="button" onClick={() => handleSetCurrent(row.academic_year)} className="px-2.5 py-1 rounded-lg bg-[#000435] text-white text-[10px] font-medium hover:bg-[#0a116b] transition-colors">Set current</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Panel title="Register new academic year">
          <div className="space-y-3">
            <input
              value={newYear}
              onChange={(e) => setNewYear(e.target.value)}
              placeholder="2027-2028"
              className="w-full h-10 rounded-xl border border-[#000435]/12 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#f59e0b]/25"
            />
            <button type="button" disabled={saving} onClick={handleRegisterYear} className={btnPrimary}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Add year
            </button>
            <p className="text-[10px] text-[#000435]/35">Configure terms below first, then register the year.</p>
          </div>
        </Panel>

        <Panel title={`Edit — ${academicYear || 'select a year'}`}>
          <div className="space-y-4">
            <input
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              placeholder="2026-2027"
              className="w-full h-10 rounded-xl border border-[#000435]/12 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#f59e0b]/25"
            />
            <div>
              <p className="text-[10px] font-medium text-[#000435]/40 mb-2">Active terms</p>
              <div className="flex flex-wrap gap-3">
                {TERM_OPTIONS.map((term) => (
                  <label key={term} className="inline-flex items-center gap-2 text-xs font-medium text-[#000435]/70 cursor-pointer">
                    <input type="checkbox" checked={activeTerms.includes(term)} onChange={(e) => handleActiveTermsChange(e.target.checked, term)} className="accent-[#f59e0b] w-3.5 h-3.5" />
                    {term}
                  </label>
                ))}
              </div>
            </div>
            {activeTerms.map((term) => {
              const cfg = termDates.find((d) => d.name === term) || { start: '', end: '' };
              return (
                <div key={term} className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-xl border border-[#000435]/8 bg-[#000435]/[0.015]">
                  <span className="text-[10px] font-medium text-[#000435]/55 w-14 shrink-0">{term}</span>
                  <input type="date" value={cfg.start} onChange={(e) => setTermDate(term, 'start', e.target.value)} className="flex-1 h-8 px-3 rounded-lg border border-[#000435]/12 text-xs focus:ring-1 focus:ring-[#f59e0b]/25 focus:outline-none" />
                  <span className="text-[#000435]/25 text-xs">→</span>
                  <input type="date" value={cfg.end} onChange={(e) => setTermDate(term, 'end', e.target.value)} className="flex-1 h-8 px-3 rounded-lg border border-[#000435]/12 text-xs focus:ring-1 focus:ring-[#f59e0b]/25 focus:outline-none" />
                </div>
              );
            })}
            <button type="button" disabled={saving || !academicYear} onClick={handleSaveCurrent} className={btnSecondary}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} className="text-[#f59e0b]" />}
              Save & set as current
            </button>
          </div>
        </Panel>
      </div>
    </PageShell>
  );
}
