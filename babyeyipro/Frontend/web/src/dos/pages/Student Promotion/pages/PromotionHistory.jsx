import { useEffect, useMemo, useState } from "react";
import { Filter, Download, Clock, RefreshCw, Loader2 } from "lucide-react";
import { useStudentPromotionData } from "../context/StudentPromotionDataContext";
import PromotionPageHero, { PromotionPageBody } from "../components/PromotionPageHero";
import { downloadHistoryPdf } from "../utils/promotionReportPdf";

const statusColors = {
  Promoted: "bg-green-100 text-green-700",
  Repeated: "bg-amber-100 text-amber-700",
  Transferred: "bg-blue-100 text-blue-700",
  Graduated: "bg-purple-100 text-purple-700",
};

export default function PromotionHistory() {
  const { history, academicYears, academicYear, schoolName, refreshHistory, loading } =
    useStudentPromotionData();
  const [yearFilter, setYearFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [exporting, setExporting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (academicYear && yearFilter === "All") return;
    if (academicYear && !academicYears.includes(yearFilter) && yearFilter !== "All") {
      setYearFilter(academicYear);
    }
  }, [academicYear, academicYears, yearFilter]);

  useEffect(() => {
    if (loading) return;
    refreshHistory(yearFilter);
  }, [yearFilter, loading, refreshHistory]);

  const filtered = useMemo(
    () =>
      history.filter(
        (p) =>
          (yearFilter === "All" || p.year === yearFilter) &&
          (statusFilter === "All" || p.status === statusFilter)
      ),
    [history, yearFilter, statusFilter]
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshHistory(yearFilter === "All" ? "All" : yearFilter);
    } finally {
      setRefreshing(false);
    }
  };

  const handleExport = () => {
    setExporting(true);
    try {
      downloadHistoryPdf({
        schoolName,
        academicYear: yearFilter === "All" ? "All years" : yearFilter,
        rows: filtered,
      });
    } finally {
      setExporting(false);
    }
  };

  const heroStats = useMemo(
    () => [
      { label: "Total records", value: String(history.length) },
      { label: "Promoted", value: String(history.filter((p) => p.status === "Promoted").length) },
      { label: "Repeaters", value: String(history.filter((p) => p.status === "Repeated").length) },
      { label: "Graduates", value: String(history.filter((p) => p.status === "Graduated").length) },
    ],
    [history]
  );

  const handleHeroRefresh = () => handleRefresh();

  return (
    <div className="min-h-full bg-white animate-in fade-in duration-500">
      <PromotionPageHero
        title="Promotion History"
        subtitle="Audit trail of class moves, repeats, and graduations from your school registry."
        heroStats={heroStats}
        onRefresh={handleHeroRefresh}
        refreshing={refreshing || loading}
      />
      <PromotionPageBody maxWidth="max-w-6xl" className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
          <Filter size={13} /> Filters:
        </div>
        <select
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value)}
          className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:border-amber-400 transition"
        >
          <option value="All">All years</option>
          {academicYears.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:border-amber-400 transition"
        >
          <option value="All">All statuses</option>
          {["Promoted", "Repeated", "Transferred", "Graduated"].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing || loading}
          className="flex items-center gap-2 text-xs font-semibold border border-gray-200 text-gray-600 px-4 py-2 rounded-xl hover:bg-gray-50 transition disabled:opacity-60"
        >
          {refreshing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
          Refresh
        </button>
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting || !filtered.length}
          className="ml-auto flex items-center gap-2 text-xs font-semibold bg-amber-500 text-white px-4 py-2 rounded-xl hover:bg-amber-600 transition disabled:opacity-60"
        >
          {exporting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
          Export History
        </button>
      </div>

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
                {["Student", "From Class", "To Class", "Stream", "Year", "Status", "Done By", "Date"].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white text-xs font-bold">
                        {(r.student || "?")[0]}
                      </div>
                      <span className="font-semibold text-gray-800">{r.student}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-600">{r.fromClass}</td>
                  <td className="px-4 py-3 font-semibold text-gray-800">{r.toClass}</td>
                  <td className="px-4 py-3 text-gray-500">{r.stream || "—"}</td>
                  <td className="px-4 py-3 text-gray-500">{r.year}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-lg ${statusColors[r.status] || "bg-gray-100 text-gray-600"}`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{r.doneBy || "—"}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{r.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-12 text-gray-400 text-sm">
              {loading ? "Loading promotion history…" : "No records match the selected filters."}
            </div>
          )}
        </div>
      </div>
      </PromotionPageBody>
    </div>
  );
}
