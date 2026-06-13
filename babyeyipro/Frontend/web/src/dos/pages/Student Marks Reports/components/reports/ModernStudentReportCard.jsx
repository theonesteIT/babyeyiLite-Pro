import { useMemo, useState } from 'react';
import ReportQrCode from './ReportQrCode';
import {
  LineChart, Line, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, LabelList,
} from 'recharts';
import {
  buildReportQrValue,
  buildTrendSeries,
  filterReportSubjects,
  formatAssessmentScoreOnly,
  assessmentTrendArrow,
  assessmentTrendClass,
  formatSchoolAddress,
  gradeStyle,
  NAVY,
  reportTypeLabel,
  resolveAssetUrl,
  formatDisciplineMarks,
  resolveGradeRemark,
  resolveReportAssessmentColumns,
  resolveAssessmentColumnMax,
  computeMarksGrandTotals,
  resolveGradingBands,
  resolveStudentPhotoUrl,
  STUDENT_AVATAR,
} from '../../utils/reportCardHelpers';

function StudentPhoto({ photoUrl, name }) {
  const initial = resolveStudentPhotoUrl(photoUrl);
  const [src, setSrc] = useState(initial);
  const isDefaultAvatar = !photoUrl || src === STUDENT_AVATAR || String(src).includes('student-avatar');

  return (
    <div
      className="w-[92px] h-[92px] sm:w-[96px] sm:h-[96px] rounded-full overflow-hidden border-2 border-slate-300 bg-white shadow-sm shrink-0 ring-2 ring-white"
      data-report-student-photo
      style={{ borderRadius: '50%' }}
    >
      <img
        src={src}
        alt={name || 'Student'}
        className={`w-full h-full rounded-full ${isDefaultAvatar ? 'object-contain p-2.5' : 'object-cover object-[center_20%]'}`}
        style={{ borderRadius: '50%' }}
        onError={() => setSrc(resolveStudentPhotoUrl(null))}
      />
    </div>
  );
}

function SummaryStatCard({ label, value, sub }) {
  return (
    <div
      className="rounded-lg border border-slate-200 bg-gradient-to-b from-white to-slate-50/80 px-2 py-2 sm:px-2.5 sm:py-2.5 min-h-[70px] sm:min-h-[76px] flex flex-col justify-center text-center shadow-sm"
      data-report-stat-card
    >
      <p className="text-[8px] sm:text-[9px] font-semibold uppercase tracking-wide text-slate-500 leading-tight">{label}</p>
      <p className="text-sm sm:text-base font-bold text-slate-900 tabular-nums leading-tight mt-1">{value ?? '—'}</p>
      {sub && (
        <p className="text-[8px] sm:text-[9px] text-slate-500 mt-0.5 leading-tight" title={sub}>{sub}</p>
      )}
    </div>
  );
}

function SchoolManagerSignature({ school }) {
  const managerName = school?.head_teacher_name || school?.deputy_head_name || 'School Manager';
  const sigUrl = resolveAssetUrl(school?.head_signature_url);
  const stampUrl = resolveAssetUrl(school?.school_stamp_url);

  return (
    <div className="min-w-0 flex items-end justify-between gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">School Manager</p>
        <p className="text-sm font-semibold text-slate-900 leading-snug">{managerName}</p>
        <div className="mt-3 max-w-[220px]">
          {sigUrl ? (
            <img
              src={sigUrl}
              alt="School manager signature"
              className="h-9 max-w-full object-contain object-left"
              crossOrigin="anonymous"
            />
          ) : null}
          <div className="border-b border-slate-400 mt-1" />
          <p className="text-[8px] text-slate-400 mt-0.5 uppercase tracking-wide">Signature</p>
        </div>
      </div>
      <div className="shrink-0 w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center">
        {stampUrl ? (
          <img
            src={stampUrl}
            alt="Official school stamp"
            className="max-w-full max-h-full object-contain"
            crossOrigin="anonymous"
          />
        ) : null}
      </div>
    </div>
  );
}

function ReportSummaryPanel({ report, isMidReport, isAnnualReport, overallRemark }) {
  const disciplineValue = formatDisciplineMarks(report);
  const disciplineSub = report.discipline_marks_max != null
    ? `Out of ${report.discipline_marks_max} default`
    : 'Conduct marks';

  const row1 = [
    {
      label: 'Position',
      value: report.class_position != null ? `${report.class_position}/${report.class_size}` : '—',
      sub: 'Class rank',
    },
    {
      label: isAnnualReport ? 'Annual average' : (isMidReport ? 'Mid-term average' : 'Term average'),
      value: report.overall_average != null ? `${report.overall_average}%` : '—',
    },
    {
      label: 'Grade',
      value: report.overall_grade || '—',
      sub: overallRemark && overallRemark !== '—' ? overallRemark : null,
    },
  ];

  const row2 = [
    {
      label: 'Attendance',
      value: report.attendance_percent != null ? `${report.attendance_percent}%` : '—',
    },
    {
      label: 'Health',
      value: report.academic_health_score != null ? `${report.academic_health_score}%` : '—',
      sub: 'Academic health',
    },
    {
      label: 'Discipline',
      value: disciplineValue,
      sub: disciplineSub,
    },
  ];

  return (
    <div className="w-full lg:w-[min(100%,400px)] lg:shrink-0 space-y-2" data-report-summary-cards>
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
        {row1.map((c) => (
          <SummaryStatCard key={c.label} label={c.label} value={c.value} sub={c.sub} />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
        {row2.map((c) => (
          <SummaryStatCard key={c.label} label={c.label} value={c.value} sub={c.sub} />
        ))}
      </div>
    </div>
  );
}

function ClassTeacherSignature({ report }) {
  const teacherName = report?.class_teacher_name || '—';
  return (
    <div className="min-w-0">
      <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">Class Teacher</p>
      <p className="text-sm font-semibold text-slate-900 leading-snug">{teacherName}</p>
      <div className="mt-3 max-w-[220px]">
        <div className="border-b border-slate-400" />
        <p className="text-[8px] text-slate-400 mt-0.5 uppercase tracking-wide">Signature</p>
      </div>
    </div>
  );
}

function GradingSchemaPanel({ report }) {
  const bands = resolveGradingBands(report);

  return (
    <section
      className="border-t border-slate-100 pt-3 print:break-inside-avoid print:pt-2"
      data-report-grading-schema
    >
      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Grading schema</p>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-700">
        {bands.map((b) => (
          <span key={b.letter} className="tabular-nums whitespace-nowrap">
            <strong className="text-slate-900">{b.min_percent}–{b.max_percent} {b.letter}</strong>
            {b.remark ? <span className="text-slate-500"> · {b.remark}</span> : null}
          </span>
        ))}
      </div>
    </section>
  );
}

function ReportSignaturesRow({ report, school }) {
  return (
    <section
      className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 pt-4 border-t border-slate-200 print:break-inside-avoid print:pt-3"
      data-report-signatures
    >
      <ClassTeacherSignature report={report} />
      <SchoolManagerSignature school={school} />
    </section>
  );
}

export default function ModernStudentReportCard({
  report,
  school,
  footerSlot,
  compact = false,
  showExtraActivities = false,
  printMode = false,
  showSignatures = true,
}) {
  const sch = school || report?.school || {};
  const logoUrl = resolveAssetUrl(sch.logo_url);
  const address = formatSchoolAddress(sch);
  const title = reportTypeLabel(report?.report_type);
  const isMidReport = report?.report_type === 'mid_term';
  const isAnnualReport = report?.report_type === 'annual';
  const termLine = isAnnualReport
    ? `${report?.academic_year || 'Academic Year'} — ${title}`
    : `${report?.term || 'Term'} — ${title}`;
  const qrValue = buildReportQrValue(report);

  const displaySubjects = useMemo(
    () => filterReportSubjects(report?.subjects || [], showExtraActivities),
    [report?.subjects, showExtraActivities],
  );

  const assessmentColumns = useMemo(
    () => (isAnnualReport ? [] : resolveReportAssessmentColumns(report, isMidReport)),
    [report, isMidReport, isAnnualReport],
  );

  const tableColSpan = isAnnualReport
    ? 8
    : isMidReport
      ? 5 + assessmentColumns.length
      : 7 + assessmentColumns.length;

  const chartData = useMemo(() => {
    const series = buildTrendSeries(report);
    return series.filter((t) => t.average != null);
  }, [report]);

  const assessmentColumnMaxes = useMemo(() => {
    const map = {};
    for (const col of assessmentColumns) {
      map[col.slug] = resolveAssessmentColumnMax(displaySubjects, col.slug);
    }
    return map;
  }, [assessmentColumns, displaySubjects]);

  const marksGrandTotals = useMemo(
    () => computeMarksGrandTotals(displaySubjects, assessmentColumns),
    [displaySubjects, assessmentColumns],
  );

  const overallRemark = report?.overall_grade_remark
    || resolveGradeRemark(report?.overall_grade, report);

  if (!report) return null;

  const manySubjects = displaySubjects.length > 8;

  return (
    <article
      className={`bg-white text-slate-800 overflow-hidden print:shadow-none print:overflow-visible ${printMode ? 'report-card-print-mode' : ''}`}
      data-report-card
      {...(manySubjects ? { 'data-report-many-subjects': true } : {})}
    >
      {/* Header — clean, large logo */}
      <header className="px-5 sm:px-8 pt-6 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="w-[100px] h-[100px] sm:w-[120px] sm:h-[120px] shrink-0 flex items-center justify-center">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt=""
                className="max-w-full max-h-full object-contain"
                crossOrigin="anonymous"
              />
            ) : (
              <span className="text-xs font-bold text-slate-400">SCHOOL LOGO</span>
            )}
          </div>
          <div className="flex-1 min-w-0 text-center">
            <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight uppercase tracking-wide">
              {sch.school_name || 'School'}
            </h1>
            {address && (
              <p className="text-[11px] text-slate-500 mt-1 leading-snug">{address}</p>
            )}
            {(sch.phone || sch.email) && (
              <p className="text-[10px] text-slate-400 mt-0.5">
                {[sch.phone ? `Tel: ${sch.phone}` : null, sch.email].filter(Boolean).join(' · ')}
              </p>
            )}
            <p className="text-[11px] font-semibold text-slate-700 mt-2 tracking-wide uppercase">
              Student Progress Report — {termLine}
            </p>
          </div>
          <div className="shrink-0 block" data-report-qr>
            <ReportQrCode value={qrValue} size={72} level="H" bgColor="#ffffff" fgColor="#000000" />
          </div>
        </div>
      </header>

      <div className={`${compact ? 'p-4 sm:p-5' : 'p-5 sm:p-8'} space-y-4 sm:space-y-5`}>
        {/* Student profile (left) + summary cards (right) */}
        <section
          className="flex flex-col lg:flex-row lg:items-start gap-4 lg:gap-6 border-b border-slate-100 pb-6"
          data-report-profile-row
        >
          <div className="flex gap-4 flex-1 min-w-0">
            <StudentPhoto photoUrl={report.photo_url} name={report.name} />
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-slate-900">{report.name}</h2>
              <dl className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs text-slate-600">
                <div><dt className="inline font-medium text-slate-500">Admission:</dt> <dd className="inline">{report.student_uid || '—'}</dd></div>
                <div><dt className="inline font-medium text-slate-500">Class:</dt> <dd className="inline">{report.class_name || '—'}</dd></div>
                <div><dt className="inline font-medium text-slate-500">Year:</dt> <dd className="inline">{report.academic_year || '—'}</dd></div>
                <div><dt className="inline font-medium text-slate-500">Term:</dt> <dd className="inline">{report.term || '—'}</dd></div>
              </dl>
            </div>
          </div>
          <ReportSummaryPanel
            report={report}
            isMidReport={isMidReport}
            isAnnualReport={isAnnualReport}
            overallRemark={overallRemark}
          />
        </section>

        {/* Subject results table */}
        <section className="print:break-inside-avoid" data-report-subjects-section>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-2">
            {isAnnualReport ? 'Annual Subject Performance' : 'Subject Results'}
          </h3>
          <div
            className="overflow-x-auto -mx-1 print:overflow-visible print:mx-0 rounded-lg border border-slate-200 shadow-sm bg-white"
            data-report-table-wrap
          >
            <table className="w-full min-w-[720px] text-xs border-collapse" data-report-subjects-table>
              <thead data-report-table-head>
                <tr className="bg-slate-800 text-white text-[9px] uppercase tracking-wide">
                  <th className="py-2 px-2 w-7 text-left font-semibold align-middle" data-report-th-fixed>#</th>
                  <th className="py-2 px-2 text-left min-w-[64px] font-semibold align-middle" data-report-th-fixed>Subject</th>
                  {isAnnualReport ? (
                    <>
                      <th className="py-2 px-2 text-center font-semibold align-middle" data-report-th-fixed>Term 1 %</th>
                      <th className="py-2 px-2 text-center font-semibold align-middle" data-report-th-fixed>Term 2 %</th>
                      <th className="py-2 px-2 text-center font-semibold align-middle" data-report-th-fixed>Term 3 %</th>
                      <th className="py-2 px-2 text-center font-bold align-middle" data-report-th-fixed>Annual %</th>
                    </>
                  ) : (
                    <>
                      {assessmentColumns.map((col) => {
                        const max = assessmentColumnMaxes[col.slug];
                        return (
                          <th
                            key={col.slug}
                            className="py-1.5 px-1 text-center whitespace-nowrap align-middle"
                            data-report-th-assessment
                            title={col.name || col.slug}
                          >
                            <span className="block font-semibold leading-tight">{col.short_label || col.slug}</span>
                            <span
                              className="block text-[8px] font-medium normal-case tracking-normal text-slate-300 leading-tight mt-0.5"
                              data-report-th-sub
                            >
                              {max != null ? `out of ${max}` : '—'}
                            </span>
                          </th>
                        );
                      })}
                      <th className="py-2 px-2 text-center whitespace-nowrap font-bold align-middle" data-report-th-fixed>
                        {isMidReport ? 'Total %' : 'Mid %'}
                      </th>
                      {!isMidReport && (
                        <th className="py-2 px-2 text-center whitespace-nowrap font-semibold align-middle" data-report-th-fixed>Final %</th>
                      )}
                      {!isMidReport && (
                        <th className="py-2 px-2 text-center whitespace-nowrap font-bold align-middle" data-report-th-fixed>Term %</th>
                      )}
                    </>
                  )}
                  <th className="py-2 px-2 text-center w-10 font-semibold align-middle" data-report-th-fixed>Grd</th>
                  <th className="py-2 pl-2 text-left min-w-[72px] font-semibold align-middle" data-report-th-fixed>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {displaySubjects.length === 0 ? (
                  <tr><td colSpan={tableColSpan} className="py-8 text-center text-slate-400">No subject marks recorded</td></tr>
                ) : displaySubjects.map((s, i) => {
                  const remark = s.grade_remark || resolveGradeRemark(s.grade, report);
                  return (
                    <tr key={s.subject_name} className={`border-b border-slate-100 ${i % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}`}>
                      <td className="py-2 px-2 text-slate-400 tabular-nums">{i + 1}</td>
                      <td className="py-2 px-2 font-semibold text-slate-800">
                        {s.subject_name}
                        {s.is_extra_activity && showExtraActivities && (
                          <span className="ml-1 text-[9px] text-slate-400">(Extra)</span>
                        )}
                      </td>
                      {isAnnualReport ? (
                        <>
                          <td className="py-2 px-2 text-center tabular-nums text-slate-700">{s.term_1 != null ? `${s.term_1}%` : '—'}</td>
                          <td className="py-2 px-2 text-center tabular-nums text-slate-700">{s.term_2 != null ? `${s.term_2}%` : '—'}</td>
                          <td className="py-2 px-2 text-center tabular-nums text-slate-700">{s.term_3 != null ? `${s.term_3}%` : '—'}</td>
                          <td className="py-2 px-2 text-center tabular-nums font-bold text-slate-900">{s.average != null ? `${s.average}%` : '—'}</td>
                        </>
                      ) : (
                        <>
                          {assessmentColumns.map((col) => {
                            const trend = s.assessment_trends?.[col.slug];
                            return (
                              <td key={col.slug} className="py-2 px-1 text-center tabular-nums text-slate-700 whitespace-nowrap font-medium">
                                {formatAssessmentScoreOnly(s.assessments, col.slug)}
                                {trend && trend !== 'stable' && (
                                  <span className={`ml-0.5 text-[9px] ${assessmentTrendClass(trend)}`}>
                                    {assessmentTrendArrow(trend)}
                                  </span>
                                )}
                              </td>
                            );
                          })}
                          <td className="py-2 px-2 text-center tabular-nums font-bold text-slate-900">
                            {(isMidReport ? s.average : s.mid_term) != null
                              ? `${isMidReport ? s.average : s.mid_term}%`
                              : '—'}
                          </td>
                          {!isMidReport && (
                            <td className="py-2 px-2 text-center tabular-nums text-slate-600">
                              {s.final != null ? `${s.final}%` : '—'}
                            </td>
                          )}
                          {!isMidReport && (
                            <td className="py-2 px-2 text-center tabular-nums font-bold text-slate-900">
                              {s.average != null ? `${s.average}%` : '—'}
                            </td>
                          )}
                        </>
                      )}
                      <td className={`py-2 px-2 text-center font-bold ${gradeStyle(s.grade)}`}>
                        {s.grade || '—'}
                      </td>
                      <td className="py-2 pl-2 text-[9px] text-slate-600 uppercase tracking-wide font-medium">
                        {remark && remark !== '—' ? remark : '—'}
                      </td>
                    </tr>
                  );
                })}
                {displaySubjects.length > 0 && !isAnnualReport && (
                  <tr className="border-t-2 border-slate-400 bg-slate-100 font-bold text-slate-900" data-report-grand-total>
                    <td className="py-2.5 px-2" />
                    <td className="py-2.5 px-2 text-[10px] uppercase tracking-wider">Grand Total</td>
                    {assessmentColumns.map((col) => (
                      <td key={`total-${col.slug}`} className="py-2 px-1 text-center tabular-nums">
                        {marksGrandTotals.columnTotals[col.slug] ?? '—'}
                      </td>
                    ))}
                    <td className="py-2 px-2 text-center tabular-nums text-[10px]">
                      {marksGrandTotals.overallScore != null && marksGrandTotals.overallMax != null
                        ? `${marksGrandTotals.overallScore} / ${marksGrandTotals.overallMax}`
                        : marksGrandTotals.overallPercent != null
                          ? `${marksGrandTotals.overallPercent}%`
                          : '—'}
                    </td>
                    {!isMidReport && <td className="py-2 px-2 text-center">—</td>}
                    {!isMidReport && <td className="py-2 px-2 text-center">—</td>}
                    <td className="py-2 px-2 text-center">—</td>
                    <td className="py-2 pl-2 text-[9px] text-slate-500 uppercase">
                      {marksGrandTotals.overallPercent != null
                        ? `${marksGrandTotals.overallPercent}%`
                        : '—'}
                    </td>
                  </tr>
                )}
                {displaySubjects.length > 0 && isAnnualReport && (
                  <tr className="border-t-2 border-slate-400 bg-slate-100 font-bold text-slate-900" data-report-grand-total>
                    <td className="py-2.5 px-2" />
                    <td className="py-2.5 px-2 text-[10px] uppercase tracking-wider">Year Average</td>
                    <td className="py-2 px-2 text-center tabular-nums">{report.year_summary?.term_1 != null ? `${report.year_summary.term_1}%` : '—'}</td>
                    <td className="py-2 px-2 text-center tabular-nums">{report.year_summary?.term_2 != null ? `${report.year_summary.term_2}%` : '—'}</td>
                    <td className="py-2 px-2 text-center tabular-nums">{report.year_summary?.term_3 != null ? `${report.year_summary.term_3}%` : '—'}</td>
                    <td className="py-2 px-2 text-center tabular-nums">{report.overall_average != null ? `${report.overall_average}%` : '—'}</td>
                    <td className="py-2 px-2 text-center">{report.overall_grade || '—'}</td>
                    <td className="py-2 pl-2 text-[9px] text-slate-500 uppercase">{overallRemark || '—'}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <GradingSchemaPanel report={report} />

        {/* Competency — minimal */}
        {(report.competencies?.length > 0) && (
          <section className="border-t border-slate-100 pt-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Competencies</h3>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-600">
              {report.competencies.map((c) => (
                <span key={c.name}><strong className="text-slate-800">{c.name}:</strong> {c.rating}</span>
              ))}
            </div>
          </section>
        )}

        {/* Trend + strengths — simple */}
        <section
          className="grid grid-cols-1 lg:grid-cols-2 gap-6 border-t border-slate-100 pt-4 print:gap-3 print:pt-2"
          data-report-bottom-panels
        >
          <div data-report-trend-chart>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              {isAnnualReport ? 'Year Performance (Term 1 · Term 2 · Term 3)' : 'Performance Trends'}
            </h3>
            {isAnnualReport && report.performance_insight && (
              <p className="text-[10px] text-slate-500 mb-2">{report.performance_insight}</p>
            )}
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={compact ? 130 : 150}>
                <LineChart data={chartData} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#475569' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#94a3b8' }} width={28} />
                  <Tooltip formatter={(v) => [`${v}%`, 'Average']} />
                  <Line type="monotone" dataKey="average" stroke={NAVY} strokeWidth={2} dot={{ r: 4, fill: NAVY, strokeWidth: 0 }}>
                    <LabelList
                      dataKey="average"
                      position="top"
                      offset={8}
                      formatter={(v) => (v != null ? `${v}%` : '')}
                      style={{ fontSize: 10, fontWeight: 700, fill: NAVY }}
                    />
                  </Line>
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-slate-400 py-6">Trend appears after multiple terms are recorded.</p>
            )}
          </div>
          <div className="space-y-3 text-xs text-slate-600">
            <div>
              <p className="font-bold uppercase tracking-wider text-slate-700 mb-1">Strengths</p>
              <ul className="list-disc list-inside space-y-0.5">
                {(report.strong_subjects || []).slice(0, 5).map((s) => <li key={s}>{s}</li>)}
                {!(report.strong_subjects || []).length && <li className="list-none text-slate-400">—</li>}
              </ul>
            </div>
            <div>
              <p className="font-bold uppercase tracking-wider text-slate-700 mb-1">Needs Improvement</p>
              <ul className="list-disc list-inside space-y-0.5">
                {(report.weak_subjects || []).slice(0, 5).map((s) => <li key={s}>{s}</li>)}
                {!(report.weak_subjects || []).length && <li className="list-none text-slate-400">—</li>}
              </ul>
            </div>
          </div>
        </section>

        {showSignatures && <ReportSignaturesRow report={report} school={sch} />}

        {report.report_type === 'final' && report.promotion_status && (
          <p className="text-center text-sm font-medium text-slate-800 pt-2 border-t border-slate-100">
            Promotion: {report.promotion_status}
          </p>
        )}

        {footerSlot}

        <footer className="text-center text-[10px] text-slate-400 pt-2">
          Generated by Babyeyi Academic Reporting System
        </footer>
      </div>
    </article>
  );
}
