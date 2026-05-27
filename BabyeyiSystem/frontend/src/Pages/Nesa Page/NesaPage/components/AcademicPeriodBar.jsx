import { useState, useEffect } from 'react';
import { Calendar, GraduationCap } from 'lucide-react';
import { font } from '../utils/theme';
import {
  ALL_TERMS_LABEL,
  ALL_TERMS_VALUE,
  ALL_YEARS_LABEL,
  ALL_YEARS_VALUE,
  TERM_OPTIONS,
  validateAcademicYear,
} from '../../../../utils/babyeyiAcademicPeriod';

/**
 * Portal-wide academic year & term selector (Tuition Manager + all NESA tabs).
 * Academic year: type manually (YYYY-YYYY) or pick from NESA-registered years — no mock list.
 */
export default function AcademicPeriodBar({
  academicYear = '',
  term = '',
  yearOptions = [],
  termOptions = [],
  onChange,
  onValidationError,
  primary = false,
  className = '',
}) {
  const [draftYear, setDraftYear] = useState(academicYear);
  const [yearHint, setYearHint] = useState('');

  useEffect(() => {
    setDraftYear(academicYear);
  }, [academicYear]);

  const terms = termOptions.length ? termOptions : TERM_OPTIONS;
  const years = yearOptions || [];

  const commitYear = (raw) => {
    const check = validateAcademicYear(raw);
    if (!check.valid) {
      setYearHint(check.message);
      onValidationError?.(check.message);
      return;
    }
    setYearHint('');
    setDraftYear(check.normalized || '');
    onChange?.({ academicYear: check.normalized || '', term });
  };

  return (
    <div
      className={`rounded-2xl border border-[#fde68a] bg-white p-4 shadow-[0_2px_12px_rgba(0,4,53,0.06)] sm:p-5 ${className}`}
      style={{ fontFamily: font }}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="m-0 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-amber-700">
            <GraduationCap className="h-3.5 w-3.5" />
            Academic period
          </p>
          <p className="m-0 mt-1 text-sm text-[#000435]/70">
            {primary
              ? 'Type or select academic year (YYYY-YYYY, e.g. 2027-2028) — all NESA tabs use this filter.'
              : 'Filtering data for the selected academic year and term.'}
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <label className="flex min-w-0 flex-1 flex-col gap-1 sm:min-w-[12rem]">
            <span className="text-[10px] font-bold uppercase tracking-wide text-amber-800/80">Academic year</span>
            <div className="relative">
              <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-700" />
              <input
                type="text"
                value={draftYear}
                onChange={(e) => {
                  setYearHint('');
                  setDraftYear(e.target.value);
                }}
                onBlur={(e) => commitYear(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    commitYear(e.currentTarget.value);
                  }
                }}
                placeholder="e.g. 2027-2028 or leave empty"
                list="nesa-portal-academic-years"
                className={`w-full rounded-xl border bg-[#fffbeb] py-2.5 pl-10 pr-3 text-[13px] font-semibold text-[#000435] outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-400 ${
                  yearHint ? 'border-red-400' : 'border-[#fde68a]'
                }`}
              />
              <datalist id="nesa-portal-academic-years">
                <option value={ALL_YEARS_VALUE}>{ALL_YEARS_LABEL}</option>
                {years.map((y) => (
                  <option key={y} value={y} />
                ))}
              </datalist>
            </div>
            {yearHint ? (
              <span className="text-[10px] font-semibold text-red-600">{yearHint}</span>
            ) : (
              <span className="text-[10px] text-amber-800/70">
                Format YYYY-YYYY — second year = first + 1 (school Babyeyi lite)
              </span>
            )}
          </label>
          <label className="flex min-w-0 flex-1 flex-col gap-1 sm:min-w-[10rem]">
            <span className="text-[10px] font-bold uppercase tracking-wide text-amber-800/80">Term</span>
            <select
              value={term}
              onChange={(e) => onChange?.({ academicYear, term: e.target.value })}
              className="w-full cursor-pointer rounded-xl border border-[#fde68a] bg-[#fffbeb] px-3 py-2.5 text-[13px] font-semibold text-[#000435] outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-400"
            >
              <option value={ALL_TERMS_VALUE}>{ALL_TERMS_LABEL}</option>
              {terms.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </div>
  );
}
