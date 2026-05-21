import { useState, useMemo } from "react";
import { Filter, Download, RotateCcw, Clock, ClipboardList, TrendingUp, RefreshCw, GraduationCap } from "lucide-react";
import { useStudentPromotionData } from "../context/StudentPromotionDataContext";

const statusColors = {
  Promoted: "bg-green-100 text-green-700",
  Repeated: "bg-amber-100 text-amber-700",
  Transferred: "bg-blue-100 text-blue-700",
  Graduated: "bg-purple-100 text-purple-700",
};

export default function PromotionHistory() {
  const { history, academicYears } = useStudentPromotionData();
  const [yearFilter, setYearFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const filtered = useMemo(
    () =>
      history.filter(
        (p) =>
          (yearFilter === "All" || p.year === yearFilter) &&
          (statusFilter === "All" || p.status === statusFilter)
      ),
    [history, yearFilter, statusFilter]
  );

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
          <Filter size={13} /> Filters:
        </div>
        <select value={yearFilter} onChange={e => setYearFilter(e.target.value)} className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:border-amber-400 transition">
          <option>All</option>
          {["All", ...academicYears].map((y) => <option key={y}>{y}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:border-amber-400 transition">
          <option>All</option>
          {["Promoted", "Repeated", "Transferred", "Graduated"].map(s => <option key={s}>{s}</option>)}
        </select>
        <button className="ml-auto flex items-center gap-2 text-xs font-semibold bg-amber-500 text-white px-4 py-2 rounded-xl hover:bg-amber-600 transition">
          <Download size={13} /> Export History
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Records", value: history.length, color: "text-blue-700", icon: ClipboardList },
          { label: "Promotions", value: history.filter((p) => p.status === "Promoted").length, color: "text-green-700", icon: TrendingUp },
          { label: "Repeaters", value: history.filter((p) => p.status === "Repeated").length, color: "text-amber-700", icon: RefreshCw },
          { label: "Graduates", value: history.filter((p) => p.status === "Graduated").length, color: "text-purple-700", icon: GraduationCap },
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

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-3">
          <Clock size={16} className="text-amber-500" />
          <h3 className="text-sm font-semibold text-gray-800">Promotion Records</h3>
          <span className="ml-auto text-xs text-gray-400">{filtered.length} records</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {["Student", "From Class", "To Class", "Stream", "Year", "Status", "Done By", "Date", "Actions"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white text-xs font-bold">
                        {r.student[0]}
                      </div>
                      <span className="font-semibold text-gray-800">{r.student}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-600">{r.fromClass}</td>
                  <td className="px-4 py-3 font-semibold text-gray-800">{r.toClass}</td>
                  <td className="px-4 py-3 text-gray-500">{r.stream}</td>
                  <td className="px-4 py-3 text-gray-500">{r.year}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${statusColors[r.status] || "bg-gray-100 text-gray-600"}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{r.doneBy}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{r.date}</td>
                  <td className="px-4 py-3">
                    <button className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold transition">
                      <RotateCcw size={11} /> Restore
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-12 text-gray-400 text-sm">No records match the selected filters.</div>
          )}
        </div>
      </div>
    </div>
  );
}
