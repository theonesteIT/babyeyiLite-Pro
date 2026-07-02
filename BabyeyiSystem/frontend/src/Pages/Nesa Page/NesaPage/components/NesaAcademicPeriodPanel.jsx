import { useState, useEffect, useMemo } from 'react';
import { Calendar, GraduationCap, Plus, Loader2, Check } from 'lucide-react';
import { font } from '../utils/theme';
import {
  ALL_TERMS_LABEL,
  ALL_TERMS_VALUE,
  ALL_YEARS_LABEL,
  ALL_YEARS_VALUE,
  TERM_OPTIONS,
  buildNesaYearSelectOptions,
  validateAcademicYear,
} from '../../../../utils/babyeyiAcademicPeriod';

/**
 * Tuition Manager academic period — same idea as manager Preferences:
 * pick current academic year & term; register new years for national fee limits.
 */
export default function NesaAcademicPeriodPanel({
  academicPeriod = {},
  yearOptions = [],
  termOptions = [],
  onAcademicPeriodChange,
  onRegisterYear,
  className = '',
}) {
  const currentYear = academicPeriod?.academicYear || '';
  const currentTerm = academicPeriod?.term ?? '';
  const [newYear, setNewYear] = useState('');
  const [registering, setRegistering] = useState(false);
  const [yearHint, setYearHint] = useState('');

  const years = useMemo(
    () => buildNesaYearSelectOptions(yearOptions, currentYear),
    [yearOptions, currentYear],
  );
  const terms = termOptions?.length ? termOptions : TERM_OPTIONS;

  useEffect(() => {
    setYearHint('');
  }, [currentYear]);

  const handleYearChange = (value) => {
    onAcademicPeriodChange?.({ academicYear: value, term: currentTerm });
  };

  const handleTermChange = (value) => {
    onAcademicPeriodChange?.({ academicYear: currentYear, term: value });
  };

  const handleRegister = async () => {
    const check = validateAcademicYear(newYear);
    if (!check.valid || check.empty) {
      setYearHint(check.message || 'Enter a valid year (YYYY-YYYY)');
      return;
    }
    setRegistering(true);
    setYearHint('');
    try {
      if (onRegisterYear) {
        await onRegisterYear(check.normalized);
      } else {
        await onAcademicPeriodChange?.(
          { academicYear: check.normalized, term: currentTerm || 'Term 1' },
          { skipRegister: false },
        );
      }
      setNewYear('');
    } catch (e) {
      setYearHint(e?.message || 'Could not register year');
    } finally {
      setRegistering(false);
    }
  };

  return (
    <section
      className={`overflow-hidden rounded-2xl border border-[#FEBF10]/35 bg-gradient-to-br from-white via-amber-50/30 to-white shadow-[0_4px_24px_rgba(0,4,53,0.06)] ${className}`}
      style={{ fontFamily: font }}
    >
      <div className="flex flex-col gap-4 border-b border-[#FEBF10]/20 bg-gradient-to-r from-[#000435] to-[#0a1142] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="min-w-0">
          <p className="m-0 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#FEBF10]/90">
            <GraduationCap className="h-3.5 w-3.5" />
            Academic period
          </p>
          <p className="m-0 mt-1 text-xs text-white/75">
            Same as manager Preferences — filters limits below and pre-fills Set Limit.
          </p>
        </div>
        {(currentYear || currentTerm) && (
          <div className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-[#FEBF10]/30 bg-white/10 px-3 py-2">
            <Check className="h-3.5 w-3.5 text-[#FEBF10]" />
            <span className="text-[11px] font-semibold text-white">
              {currentYear || ALL_YEARS_LABEL}
              {currentTerm ? ` · ${currentTerm}` : ''}
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:p-5">
        <label className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wide text-[#92400e]">
            Academic year
          </span>
          <div className="relative">
            <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#c87800]" />
            <select
              value={currentYear}
              onChange={(e) => handleYearChange(e.target.value)}
              className="w-full cursor-pointer appearance-none rounded-xl border border-[#fde68a] bg-[#fffbeb] py-2.5 pl-10 pr-8 text-[13px] font-semibold text-[#000435] outline-none focus:border-[#c87800] focus:ring-2 focus:ring-[#FEBF10]/20"
            >
              <option value={ALL_YEARS_VALUE}>{ALL_YEARS_LABEL}</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                  {y === (currentYear || years[0]) ? ' · Current' : ''}
                </option>
              ))}
            </select>
          </div>
          <span className="text-[10px] text-amber-900/60">Current year listed first</span>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wide text-[#92400e]">Term</span>
          <select
            value={currentTerm}
            onChange={(e) => handleTermChange(e.target.value)}
            className="w-full cursor-pointer rounded-xl border border-[#fde68a] bg-[#fffbeb] px-3 py-2.5 text-[13px] font-semibold text-[#000435] outline-none focus:border-[#c87800] focus:ring-2 focus:ring-[#FEBF10]/20"
          >
            <option value={ALL_TERMS_VALUE}>{ALL_TERMS_LABEL}</option>
            {terms.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <span className="text-[10px] text-amber-900/60">Term 1 · 2 · 3 or Full Year on each limit</span>
        </label>
      </div>

      <div className="border-t border-[#FEBF10]/15 bg-slate-50/60 px-4 py-3 sm:px-5">
        <p className="m-0 mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">
          Register academic year
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="text"
            value={newYear}
            onChange={(e) => {
              setYearHint('');
              setNewYear(e.target.value);
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
            placeholder="e.g. 2026-2027"
            className={`min-w-0 flex-1 rounded-xl border bg-white px-3 py-2.5 text-[13px] font-semibold text-[#000435] outline-none focus:border-[#c87800] focus:ring-2 focus:ring-[#FEBF10]/15 ${
              yearHint ? 'border-red-300' : 'border-slate-200'
            }`}
          />
          <button
            type="button"
            disabled={registering || !newYear.trim()}
            onClick={handleRegister}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#c87800] to-[#FEBF10] px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-[#000435] shadow-sm disabled:opacity-50"
          >
            {registering ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Add year
          </button>
        </div>
        {yearHint ? (
          <p className="m-0 mt-1.5 text-[10px] font-semibold text-red-600">{yearHint}</p>
        ) : (
          <p className="m-0 mt-1.5 text-[10px] text-slate-500">Format YYYY-YYYY — second year = first + 1</p>
        )}
      </div>
    </section>
  );
}
