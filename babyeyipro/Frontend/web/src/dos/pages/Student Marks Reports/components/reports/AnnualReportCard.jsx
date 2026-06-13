import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import ReportQrCode from './ReportQrCode';

const NAVY = '#000435';
const AMBER = '#f59e0b';

function StatCard({ label, value, sub }) {
  return (
    <div className="rounded-2xl bg-white border-2 border-amber-400/40 p-4 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#000435]/50">{label}</p>
      <p className="text-2xl font-black text-[#000435] mt-1">{value ?? '—'}</p>
      {sub && <p className="text-[11px] text-[#000435]/45 mt-1">{sub}</p>}
    </div>
  );
}

function SuccessScoreRing({ score }) {
  const pct = Math.min(100, Math.max(0, Number(score) || 0));
  const r = 52;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <div className="flex flex-col items-center justify-center">
      <svg width="140" height="140" className="-rotate-90">
        <circle cx="70" cy="70" r={r} fill="none" stroke="#e5e7eb" strokeWidth="10" />
        <circle
          cx="70"
          cy="70"
          r={r}
          fill="none"
          stroke={AMBER}
          strokeWidth="10"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <p className="text-3xl font-black text-[#000435]">{pct}</p>
        <p className="text-[10px] font-bold text-[#000435]/45 uppercase">/ 100</p>
      </div>
      <p className="text-xs font-bold text-[#000435] mt-2">Student Success Score</p>
    </div>
  );
}

export default function AnnualReportCard({ report }) {
  if (!report) return null;
  const timeline = report.performance_timeline || [];
  const subjects = report.annual_subjects || [];

  return (
    <div className="report-print-surface max-w-4xl mx-auto bg-white rounded-3xl overflow-hidden shadow-xl border border-[#000435]/10" data-report-card>
      {/* Cover */}
      <div className="p-8 text-white" style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #001266 100%)` }}>
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="flex items-center gap-4">
            {report.photo_url ? (
              <img src={report.photo_url} alt="" className="w-20 h-20 rounded-2xl object-cover ring-2 ring-amber-400/50" />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-amber-500/20 flex items-center justify-center text-2xl font-black text-amber-300">
                {(report.name || '?').slice(0, 1)}
              </div>
            )}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300">{report.branding || 'BABYEYI SMART EDUCARD'}</p>
              <h1 className="text-xl font-black mt-1">{report.report_title || 'ANNUAL ACADEMIC REPORT'}</h1>
              <p className="text-lg font-bold mt-2">{report.name}</p>
              <p className="text-sm text-white/60 mt-1">
                {report.student_uid} · {report.class_name} · {report.academic_year}
              </p>
            </div>
          </div>
          {report.qr_data && (
            <div className="bg-white p-2 rounded-xl shrink-0" data-report-qr>
              <ReportQrCode value={report.qr_data} size={96} />
              <p className="text-[9px] text-center text-[#000435]/50 mt-1 font-medium">Scan to verify</p>
            </div>
          )}
        </div>
      </div>

      <div className="p-6 space-y-6 bg-slate-50">
        {/* Summary dashboard */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <StatCard label="Annual Average" value={report.overall_average != null ? `${report.overall_average}%` : '—'} sub={`Grade ${report.overall_grade || '—'}`} />
          <StatCard label="Class Rank" value={report.class_position && report.class_size ? `${report.class_position}/${report.class_size}` : '—'} />
          <StatCard label="Stream Rank" value={report.stream_position && report.stream_size ? `${report.stream_position}/${report.stream_size}` : '—'} />
          <StatCard label="School Rank" value={report.school_position && report.school_size ? `${report.school_position}/${report.school_size}` : '—'} />
          <StatCard label="Attendance" value={report.attendance_percent != null ? `${report.attendance_percent}%` : '—'} />
          <StatCard label="Academic Health" value={report.academic_health_score != null ? `${report.academic_health_score}/100` : '—'} />
        </div>

        {report.success_score != null && (
          <div className="rounded-2xl bg-white border border-[#000435]/8 p-6 flex flex-col sm:flex-row items-center justify-center gap-8">
            <div className="relative">
              <SuccessScoreRing score={report.success_score} />
            </div>
            <div className="text-sm text-[#000435]/65 space-y-1 max-w-xs">
              <p className="font-bold text-[#000435] mb-2">Score breakdown</p>
              <p>Academic results — 50%</p>
              <p>Attendance — 20%</p>
              <p>Assignments — 10%</p>
              <p>Behaviour — 10%</p>
              <p>Competencies — 10%</p>
            </div>
          </div>
        )}

        {/* Year timeline */}
        {timeline.length > 0 && (
          <div className="rounded-2xl bg-white border border-[#000435]/8 p-5">
            <h3 className="text-sm font-bold text-[#000435] mb-1">Year Performance Timeline</h3>
            <p className="text-xs text-[#000435]/50 mb-4">{report.performance_insight}</p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={timeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="term" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="average" stroke={NAVY} strokeWidth={3} dot={{ fill: AMBER, r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Annual subject table */}
        {subjects.length > 0 && (
          <div className="rounded-2xl bg-white border border-[#000435]/8 p-5 overflow-x-auto">
            <h3 className="text-sm font-bold text-[#000435] mb-4">Annual Subject Performance</h3>
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-[#000435]/10 text-[10px] uppercase tracking-wider text-[#000435]/45">
                  <th className="text-left py-2 pr-2">Subject</th>
                  <th className="text-center py-2 px-2">T1</th>
                  <th className="text-center py-2 px-2">T2</th>
                  <th className="text-center py-2 px-2">T3</th>
                  <th className="text-center py-2 px-2">Annual</th>
                  <th className="text-center py-2 pl-2">Grade</th>
                </tr>
              </thead>
              <tbody>
                {subjects.map((s) => (
                  <tr key={s.subject} className="border-b border-slate-100">
                    <td className="py-2.5 font-semibold text-[#000435]">{s.subject}</td>
                    <td className="text-center py-2.5">{s.term1 ?? '—'}</td>
                    <td className="text-center py-2.5">{s.term2 ?? '—'}</td>
                    <td className="text-center py-2.5">{s.term3 ?? '—'}</td>
                    <td className="text-center py-2.5 font-bold text-amber-600">{s.annual_avg ?? '—'}</td>
                    <td className="text-center py-2.5 font-bold">{s.grade ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Growth + strengths */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl bg-white border border-[#000435]/8 p-5">
            <h3 className="text-sm font-bold text-[#000435] mb-3">Subject Growth</h3>
            <div className="space-y-2">
              {subjects.filter((s) => s.growth != null).map((s) => (
                <div key={s.subject} className="flex items-center justify-between text-sm">
                  <span className="font-medium text-[#000435]">{s.subject}</span>
                  <span className={`text-xs font-bold px-2 py-1 rounded-lg ${s.growth >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {s.growth_label || `${s.growth}%`}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl bg-white border border-[#000435]/8 p-5">
            <h3 className="text-sm font-bold text-[#000435] mb-3">Strengths & Improvement</h3>
            <p className="text-xs font-bold text-green-700 mb-2">Strong subjects</p>
            <ul className="text-sm text-[#000435]/70 mb-3 space-y-1">
              {(report.strong_subjects || []).map((s) => <li key={s}>✓ {s}</li>)}
              {!report.strong_subjects?.length && <li>—</li>}
            </ul>
            <p className="text-xs font-bold text-amber-700 mb-2">Improvement areas</p>
            <ul className="text-sm text-[#000435]/70 space-y-1">
              {(report.weak_subjects || []).map((s) => <li key={s}>⚠ {s}</li>)}
              {!report.weak_subjects?.length && <li>—</li>}
            </ul>
          </div>
        </div>

        {/* Competencies + participation */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(report.competencies || []).length > 0 && (
            <div className="rounded-2xl bg-white border border-[#000435]/8 p-5">
              <h3 className="text-sm font-bold text-[#000435] mb-3">Competency Report (CBC)</h3>
              <ul className="space-y-2 text-sm">
                {report.competencies.map((c) => (
                  <li key={c.name || c.category} className="flex justify-between">
                    <span>{c.name || c.category}</span>
                    <span className="font-bold text-amber-600">{c.rating || c.level}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="rounded-2xl bg-white border border-[#000435]/8 p-5">
            <h3 className="text-sm font-bold text-[#000435] mb-3">Assessment Participation</h3>
            <p className="text-sm">Homework completion: <strong>{report.homework_completion_percent ?? '—'}%</strong></p>
            <p className="text-sm mt-2">Assessments completed: <strong>{report.assessment_participation_percent ?? '—'}%</strong></p>
          </div>
        </div>

        {/* Achievements */}
        {(report.achievements || []).length > 0 && (
          <div className="rounded-2xl bg-gradient-to-r from-amber-50 to-amber-100/50 border border-amber-200 p-5">
            <h3 className="text-sm font-bold text-[#000435] mb-3">Achievements</h3>
            <div className="flex flex-wrap gap-2">
              {report.achievements.map((a) => (
                <span key={a} className="px-3 py-1.5 rounded-full bg-white text-xs font-bold text-[#000435] border border-amber-200">🏆 {a}</span>
              ))}
            </div>
          </div>
        )}

        {/* Intervention history */}
        {(report.intervention_history || []).length > 0 && (
          <div className="rounded-2xl bg-white border border-[#000435]/8 p-5">
            <h3 className="text-sm font-bold text-[#000435] mb-3">Intervention History</h3>
            <div className="space-y-3">
              {report.intervention_history.map((item, i) => (
                <div key={i} className="p-3 rounded-xl bg-slate-50 text-sm">
                  <p className="font-bold text-[#000435]">{item.term} — {item.issue}</p>
                  <p className="text-[#000435]/60 mt-1">Intervention: {item.intervention}</p>
                  <p className="text-amber-700 font-semibold mt-1">Result: {item.result}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
