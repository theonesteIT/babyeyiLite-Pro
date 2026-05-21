import { GraduationCap, Download, Archive, Award, User } from "lucide-react";
import { useStudentPromotionData } from "../context/StudentPromotionDataContext";

export default function GraduatedStudents() {
  const { graduated } = useStudentPromotionData();
  const graduatedStudents = graduated;
  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      {/* Hero banner */}
      <div className="rounded-3xl p-8 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #000435 0%, #1a1a7e 100%)" }}>
        <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-10">
          <GraduationCap size={120} className="text-amber-400" />
        </div>
        <div className="relative">
          <p className="text-amber-400 text-xs font-bold uppercase tracking-widest mb-2">Academic Year 2023–2024</p>
          <h2 className="text-white text-2xl font-semibold mb-1">
            Graduated Students
          </h2>
          <p className="text-white/60 text-sm">Final-year S6 students who have completed their secondary education</p>
          <div className="flex gap-3 mt-5">
            <button className="flex items-center gap-2 bg-amber-500 text-white text-sm font-bold px-4 py-2.5 rounded-xl hover:bg-amber-600 transition shadow-lg shadow-amber-500/30">
              <Download size={14} /> Export Certificates List
            </button>
            <button className="flex items-center gap-2 bg-white/10 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-white/20 transition border border-white/20">
              <Archive size={14} /> Archive Students
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Graduates", value: graduatedStudents.length, color: "text-purple-700", icon: GraduationCap },
          { label: "Female", value: graduatedStudents.filter(s => s.gender === "F").length, color: "text-pink-600", icon: User },
          { label: "Male", value: graduatedStudents.filter(s => s.gender === "M").length, color: "text-blue-600", icon: User },
          {
            label: "With marks",
            value: graduatedStudents.length
              ? String(graduatedStudents.filter((s) => typeof s.avgMarks === "number").length)
              : "0",
            color: "text-amber-700",
            icon: Award,
          },
        ].map(s => {
          const StatIcon = s.icon;
          return (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs text-gray-400 mb-1">{s.label}</p>
                  <p className={`text-3xl font-semibold ${s.color}`}>{s.value}</p>
                </div>
                <StatIcon size={20} className={`${s.color} opacity-80 flex-shrink-0`} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Students Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {graduatedStudents.length === 0 && (
          <p className="col-span-full text-center text-sm text-gray-400 py-8">No final-year students found. Learners in your top class level appear here.</p>
        )}
        {graduatedStudents.map(s => (
          <div key={s.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white text-lg font-semibold flex-shrink-0">
                {s.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-gray-800 truncate">{s.name}</h4>
                <p className="text-xs text-gray-400">{s.code} · {s.class_name || `${s.class} ${s.stream}`.trim()}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg">{s.academic_year || "—"}</span>
                  <span className="text-xs font-bold text-amber-600">
                    {typeof s.avgMarks === "number" ? `${s.avgMarks}%` : "—"}
                  </span>
                </div>
              </div>
              <Award size={16} className="text-amber-500 flex-shrink-0" />
            </div>
            <div className="flex gap-2 mt-4">
              <button className="flex-1 text-xs font-semibold bg-purple-50 hover:bg-purple-100 text-purple-700 py-2 rounded-xl transition">
                View Records
              </button>
              <button className="flex-1 text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-700 py-2 rounded-xl transition">
                Certificate
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
