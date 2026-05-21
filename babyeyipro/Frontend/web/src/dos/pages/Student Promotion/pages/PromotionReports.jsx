import { useState } from "react";
import { FileBarChart, Download, FileText, Users, GraduationCap, ArrowRight, TrendingUp, RefreshCw, Check } from "lucide-react";

const reports = [
  { icon: TrendingUp, title: "PDF Promotion Report", desc: "Complete promotion summary with student details, statistics, and class transitions.", color: "bg-blue-50 text-blue-600", action: "Generate PDF", accent: "blue" },
  { icon: RefreshCw, title: "Repeater Report", desc: "Detailed list of all students flagged for repeating, with reasons and analysis.", color: "bg-amber-50 text-amber-600", action: "Generate PDF", accent: "amber" },
  { icon: GraduationCap, title: "Graduation Report", desc: "Final-year student graduation records, achievements, and certificate readiness.", color: "bg-purple-50 text-purple-600", action: "Generate PDF", accent: "purple" },
  { icon: ArrowRight, title: "Class Transition Report", desc: "Overview of all class movements: promotions, repeats, and transfers by stream.", color: "bg-green-50 text-green-600", action: "Generate PDF", accent: "green" },
];

const accentMap = {
  blue: "bg-blue-600 hover:bg-blue-700",
  amber: "bg-amber-500 hover:bg-amber-600",
  purple: "bg-purple-600 hover:bg-purple-700",
  green: "bg-green-600 hover:bg-green-700",
};

export default function PromotionReports() {
  const [generating, setGenerating] = useState(null);
  const [generated, setGenerated] = useState({});

  const generate = (title) => {
    setGenerating(title);
    setTimeout(() => {
      setGenerating(null);
      setGenerated(p => ({ ...p, [title]: true }));
    }, 1800);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      <div className="flex flex-wrap items-center gap-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
            <FileBarChart size={18} className="text-amber-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-800">Promotion Reports</h3>
            <p className="text-xs text-gray-400">Generate and export promotion documentation</p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <select className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 focus:outline-none focus:border-amber-400">
            <option>2024-2025</option>
            <option>2023-2024</option>
          </select>
          <select className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 focus:outline-none focus:border-amber-400">
            <option>All Classes</option>
            <option>S4</option><option>S5</option><option>S6</option>
          </select>
        </div>
      </div>

      {/* Report Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {reports.map(r => {
          const Icon = r.icon;
          const isGen = generating === r.title;
          const isDone = generated[r.title];
          return (
            <div key={r.title} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow">
              <div className={`w-12 h-12 rounded-2xl ${r.color} flex items-center justify-center mb-4`}>
                <Icon size={22} />
              </div>
              <h4 className="text-base font-semibold text-gray-800 mb-2">{r.title}</h4>
              <p className="text-sm text-gray-500 mb-5 leading-relaxed">{r.desc}</p>
              <button
                onClick={() => generate(r.title)}
                disabled={isGen}
                className={`w-full flex items-center justify-center gap-2 text-sm font-bold py-2.5 rounded-xl text-white transition-all ${isDone ? "bg-green-500 hover:bg-green-600" : isGen ? "bg-gray-300 cursor-not-allowed" : accentMap[r.accent]}`}
              >
                {isGen ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Generating...
                  </>
                ) : isDone ? (
                  <><Check size={14} /> Download Report</>
                ) : (
                  <><FileText size={14} /> {r.action}</>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Analytics Preview */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h4 className="text-sm font-semibold text-gray-800 mb-4">Promotion Analytics — S4 2024–2025</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Promotion Rate", value: "79.8%", change: "+3.2%", pos: true },
            { label: "Failure Rate", value: "12.9%", change: "-1.5%", pos: true },
            { label: "Transfer Rate", value: "4.5%", change: "+0.8%", pos: false },
            { label: "Graduation Rate", value: "100%", change: "S6 only", pos: true },
          ].map(m => (
            <div key={m.label} className="text-center p-4 bg-gray-50 rounded-xl">
              <p className="text-xs text-gray-400 mb-1">{m.label}</p>
              <p className="text-2xl font-semibold text-gray-900">{m.value}</p>
              <p className={`text-xs font-semibold mt-1 ${m.pos ? "text-green-600" : "text-amber-600"}`}>{m.change} vs last year</p>
            </div>
          ))}
        </div>
        <div className="space-y-3">
          {[
            { stream: "MPC", promote: 88, repeat: 8, total: 96, color: "bg-blue-500" },
            { stream: "MCB", promote: 82, repeat: 14, total: 96, color: "bg-green-500" },
            { stream: "HEG", promote: 76, repeat: 18, total: 94, color: "bg-amber-500" },
            { stream: "MEG", promote: 80, repeat: 12, total: 92, color: "bg-purple-500" },
          ].map(row => (
            <div key={row.stream} className="flex items-center gap-3">
              <span className="text-xs font-bold text-gray-500 w-12">{row.stream}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden flex">
                <div className={`h-full ${row.color}`} style={{ width: `${(row.promote / row.total) * 100}%` }} />
                <div className="h-full bg-red-300" style={{ width: `${(row.repeat / row.total) * 100}%` }} />
              </div>
              <span className="text-xs text-gray-400 w-24 text-right">
                <span className="text-green-600 font-semibold">{row.promote}</span> / <span className="text-red-500">{row.repeat}</span>
              </span>
            </div>
          ))}
          <div className="flex gap-4 text-xs text-gray-400 pt-1">
            <div className="flex items-center gap-1.5"><span className="w-3 h-2 rounded bg-blue-500 inline-block" /><span>Promoted</span></div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-2 rounded bg-red-300 inline-block" /><span>Repeat</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
