import { useCallback, useEffect, useState } from "react";
import {
  FileText,
  GraduationCap,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  Check,
  Loader2,
} from "lucide-react";
import { useStudentPromotionData } from "../context/StudentPromotionDataContext";
import PromotionPageHero, { PromotionPageBody } from "../components/PromotionPageHero";
import { fetchPromotionSummary } from "../services/studentPromotionService";
import {
  downloadHistoryPdf,
  downloadPromotionSummaryPdf,
  downloadRepeatersReportPdf,
} from "../utils/promotionReportPdf";

const REPORT_KEYS = {
  summary: "PDF Promotion Report",
  repeaters: "Repeater Report",
  graduation: "Graduation Report",
  transition: "Class Transition Report",
};

const reports = [
  {
    key: "summary",
    icon: TrendingUp,
    title: REPORT_KEYS.summary,
    desc: "Complete promotion summary with statistics and class transitions.",
    color: "bg-blue-50 text-blue-600",
    accent: "blue",
  },
  {
    key: "repeaters",
    icon: RefreshCw,
    title: REPORT_KEYS.repeaters,
    desc: "Detailed list of all students flagged for repeating, with reasons and analysis.",
    color: "bg-amber-50 text-amber-600",
    accent: "amber",
  },
  {
    key: "graduation",
    icon: GraduationCap,
    title: REPORT_KEYS.graduation,
    desc: "Final-year graduation records from promotion history.",
    color: "bg-purple-50 text-purple-600",
    accent: "purple",
  },
  {
    key: "transition",
    icon: ArrowRight,
    title: REPORT_KEYS.transition,
    desc: "Overview of all class movements: promotions, repeats, and transfers.",
    color: "bg-green-50 text-green-600",
    accent: "green",
  },
];

const accentMap = {
  blue: "bg-blue-600 hover:bg-blue-700",
  amber: "bg-amber-500 hover:bg-amber-600",
  purple: "bg-purple-600 hover:bg-purple-700",
  green: "bg-green-600 hover:bg-green-700",
};

export default function PromotionReports() {
  const { schoolName, academicYears, academicYear, setAcademicYear, repeaters, history } =
    useStudentPromotionData();
  const [year, setYear] = useState(academicYear || "");
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [generating, setGenerating] = useState(null);
  const [generated, setGenerated] = useState({});

  const loadSummary = useCallback(async (y) => {
    if (!y) return;
    setSummaryLoading(true);
    try {
      const data = await fetchPromotionSummary(y);
      setSummary(data);
    } catch {
      setSummary(null);
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (academicYear && !year) setYear(academicYear);
  }, [academicYear, year]);

  useEffect(() => {
    if (year) loadSummary(year);
  }, [year, loadSummary]);

  const generate = async (key, title) => {
    setGenerating(title);
    try {
      if (key === "summary") {
        downloadPromotionSummaryPdf({
          schoolName,
          academicYear: year,
          summary: summary || {},
          history,
        });
      } else if (key === "repeaters") {
        downloadRepeatersReportPdf({
          schoolName,
          academicYear: year,
          repeaters,
        });
      } else if (key === "graduation") {
        const gradRows = history.filter((r) => r.status === "Graduated");
        downloadHistoryPdf({
          schoolName,
          academicYear: `${year} — Graduates`,
          rows: gradRows,
        });
      } else if (key === "transition") {
        downloadHistoryPdf({
          schoolName,
          academicYear: year,
          rows: history.filter((r) => r.year === year),
        });
      }
      setGenerated((p) => ({ ...p, [title]: true }));
    } finally {
      setGenerating(null);
    }
  };

  const byClass = summary?.by_class || [];
  const promotionRate = summary?.promotion_rate ?? "—";
  const repeatRate = summary?.repeat_rate ?? "—";

  const heroStats = [
    { label: "Total students", value: String(summary?.total_students ?? "—") },
    { label: "Promoted", value: String(summary?.promoted ?? "—") },
    { label: "Promotion rate", value: `${promotionRate}%` },
    { label: "Repeat rate", value: `${repeatRate}%` },
  ];

  return (
    <div className="min-h-full bg-white animate-in fade-in duration-500">
      <PromotionPageHero
        title="Promotion Reports"
        subtitle={`Generate PDF summaries for ${year || "the selected academic year"}.`}
        heroStats={heroStats}
        onRefresh={() => loadSummary(year)}
        refreshing={summaryLoading}
      >
        <select
          value={year}
          onChange={(e) => {
            setYear(e.target.value);
            setAcademicYear(e.target.value);
          }}
          className="rounded-xl border border-white/35 bg-[#000435]/40 px-3 py-2.5 text-sm font-semibold text-white backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-white/30"
        >
          {academicYears.map((y) => (
            <option key={y} value={y} className="text-gray-900">
              {y}
            </option>
          ))}
        </select>
      </PromotionPageHero>

      <PromotionPageBody maxWidth="max-w-4xl" className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {reports.map((r) => {
          const Icon = r.icon;
          const isGen = generating === r.title;
          const isDone = generated[r.title];
          return (
            <div
              key={r.title}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow"
            >
              <div className={`w-12 h-12 rounded-2xl ${r.color} flex items-center justify-center mb-4`}>
                <Icon size={22} />
              </div>
              <h4 className="text-base font-semibold text-gray-800 mb-2">{r.title}</h4>
              <p className="text-sm text-gray-500 mb-5 leading-relaxed">{r.desc}</p>
              <button
                type="button"
                onClick={() => generate(r.key, r.title)}
                disabled={isGen || !year}
                className={`w-full flex items-center justify-center gap-2 text-sm font-bold py-2.5 rounded-xl text-white transition-all ${
                  isDone ? "bg-green-500 hover:bg-green-600" : isGen ? "bg-gray-300 cursor-not-allowed" : accentMap[r.accent]
                }`}
              >
                {isGen ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Generating...
                  </>
                ) : isDone ? (
                  <>
                    <Check size={14} /> Download again
                  </>
                ) : (
                  <>
                    <FileText size={14} /> Generate PDF
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h4 className="text-sm font-semibold text-gray-800 mb-4">
          Promotion Analytics — {year || "—"}
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Total students", value: summary?.total_students ?? "—" },
            { label: "Promoted (records)", value: summary?.promoted ?? "—" },
            { label: "Promotion rate", value: `${promotionRate}%` },
            { label: "Repeat rate", value: `${repeatRate}%` },
          ].map((m) => (
            <div key={m.label} className="text-center p-4 bg-gray-50 rounded-xl">
              <p className="text-xs text-gray-400 mb-1">{m.label}</p>
              <p className="text-2xl font-semibold text-gray-900">{m.value}</p>
            </div>
          ))}
        </div>
        {byClass.length ? (
          <div className="space-y-3">
            {byClass.map((row) => {
              const total = row.total || 1;
              const promote = row.promote || 0;
              const repeat = row.repeat || 0;
              return (
                <div key={row.class_name} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-500 w-16 truncate">{row.class_name}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden flex">
                    <div
                      className="h-full bg-blue-500"
                      style={{ width: `${(promote / total) * 100}%` }}
                    />
                    <div
                      className="h-full bg-red-300"
                      style={{ width: `${(repeat / total) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 w-24 text-right">
                    <span className="text-green-600 font-semibold">{promote}</span> /{" "}
                    <span className="text-red-500">{repeat}</span>
                  </span>
                </div>
              );
            })}
            <div className="flex gap-4 text-xs text-gray-400 pt-1">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-2 rounded bg-blue-500 inline-block" />
                <span>Promoted</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-2 rounded bg-red-300 inline-block" />
                <span>Repeat</span>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-4">
            {summaryLoading ? "Loading analytics…" : "No class breakdown for this year yet."}
          </p>
        )}
      </div>
      </PromotionPageBody>
    </div>
  );
}
