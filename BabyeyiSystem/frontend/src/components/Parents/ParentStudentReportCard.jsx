import { useState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import {
  CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

const API_ORIGIN = (import.meta.env.VITE_API_URL || "http://localhost:5100").replace(/\/+$/, "");
const STUDENT_AVATAR = "/student-avatar.png";
const NAVY = "#1e3a5f";

function resolveAssetUrl(path) {
  if (!path) return null;
  const raw = String(path).trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  return `${API_ORIGIN}${raw.startsWith("/") ? raw : `/${raw}`}`;
}

function resolveStudentPhotoUrl(photoUrl) {
  const uploaded = resolveAssetUrl(photoUrl);
  if (uploaded) return uploaded;
  return STUDENT_AVATAR;
}

function formatSchoolAddress(school = {}) {
  if (school.address) return school.address;
  if (school.full_address) return school.full_address;
  const parts = [school.village, school.cell, school.sector, school.district, school.province].filter(Boolean);
  return parts.join(", ");
}

function gradeStyle(grade) {
  const g = String(grade || "").toUpperCase();
  if (g.startsWith("A")) return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (g.startsWith("B")) return "bg-sky-100 text-sky-800 border-sky-200";
  if (g.startsWith("C")) return "bg-amber-100 text-amber-900 border-amber-200";
  return "bg-slate-100 text-slate-600 border-slate-200";
}

function buildTrendSeries(report) {
  const terms = ["Term 1", "Term 2", "Term 3"];
  const fromTrend = Object.fromEntries((report?.performance_trend || []).map((t) => [t.term, t.average]));
  const ys = report?.year_summary || {};
  const fromYear = { "Term 1": ys.term_1, "Term 2": ys.term_2, "Term 3": ys.term_3 };
  return terms.map((term) => ({
    term,
    label: term,
    average: fromTrend[term] ?? fromYear[term] ?? null,
  })).filter((t) => t.average != null);
}

function TrendDotLabel({ x, y, value }) {
  if (value == null || x == null || y == null) return null;
  return (
    <text x={x} y={y - 12} fill={NAVY} fontSize={11} fontWeight={700} textAnchor="middle">
      {value}%
    </text>
  );
}

function StudentPhoto({ photoUrl, name }) {
  const [src, setSrc] = useState(resolveStudentPhotoUrl(photoUrl));
  return (
    <div className="w-[88px] h-[88px] rounded-full p-[3px] bg-gradient-to-br from-emerald-300 via-teal-200 to-sky-300 shadow-md shrink-0">
      <div className="w-full h-full rounded-full overflow-hidden bg-white ring-2 ring-white">
        <img
          src={src}
          alt={name || "Student"}
          className={`w-full h-full ${!photoUrl || src === STUDENT_AVATAR ? "object-contain p-1.5" : "object-cover"}`}
          onError={() => setSrc(STUDENT_AVATAR)}
        />
      </div>
    </div>
  );
}

export default function ParentStudentReportCard({ report, school }) {
  if (!report) return null;

  const sch = school || report.school || {};
  const logoUrl = resolveAssetUrl(sch.logo_url);
  const address = formatSchoolAddress(sch);
  const chartData = buildTrendSeries(report);
  const title = report.report_type === "mid_term" ? "Mid-Term Report" : "Final Report";

  return (
    <article className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden text-slate-800">
      <header className="mx-4 mt-4 rounded-2xl overflow-hidden border border-emerald-100 shadow-sm">
        <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="w-14 h-14 rounded-full bg-white shadow border border-emerald-100 flex items-center justify-center overflow-hidden shrink-0">
              {logoUrl ? <img src={logoUrl} alt="" className="w-full h-full object-contain p-1.5" /> : <span className="text-[10px] font-bold text-emerald-700">LOGO</span>}
            </div>
            <div className="flex-1 text-center min-w-0">
              <h1 className="text-base font-bold text-slate-900">{sch.school_name || "School"}</h1>
              {address && <p className="text-[11px] text-slate-500 mt-1">{address}</p>}
              {sch.phone && <p className="text-[10px] text-slate-400 mt-0.5">Tel: {sch.phone}</p>}
            </div>
            <div className="w-12 h-12 rounded-lg bg-white/80 border border-slate-200 shrink-0" />
          </div>
        </div>
        <div className="bg-gradient-to-r from-emerald-600/90 to-teal-600/90 py-2 text-center">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-white">Student Progress Report</p>
        </div>
      </header>

      <div className="p-5 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <StudentPhoto photoUrl={report.photo_url} name={report.name} />
          <div className="flex-1">
            <h2 className="text-xl font-bold">{report.name}</h2>
            <p className="text-xs text-slate-500 mt-1">Admission No: {report.student_uid} · Class: {report.class_name}</p>
            <p className="text-xs text-slate-400">{report.academic_year} · {report.term} — {title}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:w-[168px] shrink-0">
            {[
              { label: "Average", value: report.overall_average != null ? `${report.overall_average}%` : "—" },
              { label: "Grade", value: report.overall_grade || "—" },
              { label: "Position", value: report.class_position != null ? `${report.class_position}/${report.class_size}` : "—" },
              { label: "Attendance", value: report.attendance_percent != null ? `${report.attendance_percent}%` : "—" },
            ].map((s) => (
              <div key={s.label} className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-center">
                <p className="text-[9px] uppercase text-slate-400">{s.label}</p>
                <p className="text-sm font-bold mt-0.5">{s.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl overflow-hidden border border-slate-200">
          <div className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-white" style={{ background: NAVY }}>Subject Results</div>
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 text-[9px] uppercase text-slate-400">
                <th className="py-2 px-2 w-8">#</th>
                <th className="py-2 px-2 text-left">Subject</th>
                <th className="py-2 px-2 text-center">Mid</th>
                <th className="py-2 px-2 text-center">Final</th>
                <th className="py-2 px-2 text-center">Avg</th>
                <th className="py-2 px-3 text-center">Grade</th>
              </tr>
            </thead>
            <tbody>
              {(report.subjects || []).map((s, i) => (
                <tr key={s.subject_name} className={i % 2 ? "bg-slate-50/80" : ""}>
                  <td className="py-2 px-2 text-center text-slate-400">{i + 1}</td>
                  <td className="py-2 px-2 font-semibold">{s.subject_name}</td>
                  <td className="py-2 px-2 text-center">{s.mid_term ?? "—"}</td>
                  <td className="py-2 px-2 text-center">{s.final ?? "—"}</td>
                  <td className="py-2 px-2 text-center font-bold">{s.average ?? "—"}</td>
                  <td className="py-2 px-3 text-center">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${gradeStyle(s.grade)}`}>{s.grade || "—"}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl border border-slate-200 p-4">
            <h3 className="text-[11px] font-bold uppercase text-slate-500 mb-3">Performance Trend</h3>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={chartData} margin={{ top: 20, right: 8, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 9 }} tickFormatter={(v) => `${v}%`} width={32} />
                  <Tooltip formatter={(v) => [`${v}%`, "Average"]} />
                  <Line type="monotone" dataKey="average" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 5, fill: "#2563eb" }} label={<TrendDotLabel />} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-slate-400 text-center py-8">Trend available after more terms are recorded.</p>
            )}
          </div>
          <div className="space-y-3">
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
              <h3 className="text-[11px] font-bold uppercase text-emerald-800 mb-2">Strengths</h3>
              {(report.strong_subjects || []).map((s) => (
                <p key={s} className="flex items-center gap-2 text-xs text-emerald-900 mb-1"><CheckCircle2 size={14} className="text-emerald-500" />{s}</p>
              ))}
            </div>
            <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4">
              <h3 className="text-[11px] font-bold uppercase text-amber-900 mb-2">Needs Improvement</h3>
              {(report.weak_subjects || []).map((s) => (
                <p key={s} className="flex items-center gap-2 text-xs text-amber-950 mb-1"><AlertCircle size={14} className="text-amber-500" />{s}</p>
              ))}
            </div>
          </div>
        </div>

        {report.teacher_comment && (
          <div className="rounded-xl border border-slate-200 p-4">
            <h3 className="text-[10px] font-bold uppercase text-slate-500 mb-2">Teacher Comment</h3>
            <p className="text-xs text-slate-600 leading-relaxed">{report.teacher_comment}</p>
          </div>
        )}
        {report.dos_comment && (
          <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50/40 p-4">
            <h3 className="text-[10px] font-bold uppercase text-slate-500 mb-2">DOS Comment</h3>
            <p className="text-xs text-slate-700 leading-relaxed">{report.dos_comment}</p>
          </div>
        )}

        {report.report_type === "final" && report.promotion_status && (
          <div className="rounded-xl bg-slate-50 px-4 py-3 text-center">
            <p className="text-[10px] uppercase text-slate-400">Promotion</p>
            <p className="text-sm font-bold mt-1" style={{ color: NAVY }}>{report.promotion_status}</p>
          </div>
        )}

        <p className="text-[10px] text-slate-400 text-center pt-2 border-t">Generated by Babyeyi Academic Reporting System</p>
      </div>
    </article>
  );
}
