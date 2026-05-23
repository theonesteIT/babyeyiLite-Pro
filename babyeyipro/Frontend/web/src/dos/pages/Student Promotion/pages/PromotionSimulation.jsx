import { useEffect, useMemo, useState } from "react";
import { PlayCircle, RotateCcw, AlertTriangle, CheckCircle, ArrowRight, Eye, Sparkles } from "lucide-react";
import { useStudentPromotionData } from "../context/StudentPromotionDataContext";
import PromotionPageHero, { PromotionPageBody } from "../components/PromotionPageHero";

export default function PromotionSimulation() {
  const { groups, streams, streamsByGroup, getStudentsForClass, academicYear, refresh, loading } =
    useStudentPromotionData();
  const [fromClass, setFromClass] = useState("");
  const [fromStream, setFromStream] = useState("");
  const [toClass, setToClass] = useState("");
  const [toStream, setToStream] = useState("");
  const [simulated, setSimulated] = useState(false);
  const [running, setRunning] = useState(false);

  const runSimulation = () => {
    setRunning(true);
    setTimeout(() => { setRunning(false); setSimulated(true); }, 2000);
  };

  const reset = () => { setSimulated(false); };

  useEffect(() => {
    if (groups.length && !fromClass) {
      setFromClass(groups[0]);
      setToClass(groups[Math.min(1, groups.length - 1)] || groups[0]);
    }
  }, [groups, fromClass]);

  const fromStreamOpts = useMemo(() => {
    if (fromClass && streamsByGroup[fromClass]?.length) return streamsByGroup[fromClass];
    return streams;
  }, [fromClass, streams, streamsByGroup]);

  const cohort = useMemo(
    () => (simulated ? getStudentsForClass(fromClass, fromStream) : []),
    [simulated, fromClass, fromStream, getStudentsForClass]
  );

  const eligible = cohort.filter((s) => s.status === "Eligible");
  const risky = cohort.filter((s) => s.status === "Risky");
  const repeaters = cohort.filter((s) => s.status === "Repeat Recommended");

  const heroStats = useMemo(
    () => [
      { label: "Classes", value: String(groups.length) },
      { label: "Cohort size", value: simulated ? String(cohort.length) : "—" },
      { label: "Would promote", value: simulated ? String(eligible.length) : "—" },
      { label: "Academic year", value: academicYear || "—" },
    ],
    [groups.length, simulated, cohort.length, eligible.length, academicYear]
  );

  return (
    <div className="min-h-full bg-white animate-in fade-in duration-500">
      <PromotionPageHero
        title="Promotion Simulation"
        subtitle="Preview outcomes before final promotion — no changes are saved to the registry."
        heroStats={heroStats}
        onRefresh={refresh}
        refreshing={loading}
      >
        <span className="inline-flex items-center gap-2 rounded-xl border border-white/35 bg-white/15 px-3 py-2 text-xs font-bold uppercase tracking-wider text-white backdrop-blur-sm">
          <Eye size={12} /> Preview mode
        </span>
      </PromotionPageHero>
      <PromotionPageBody maxWidth="max-w-5xl" className="space-y-5">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
          {[
            { label: "From Class", val: fromClass, set: setFromClass, opts: groups },
            { label: "From Stream", val: fromStream, set: setFromStream, opts: fromStreamOpts },
            { label: "To Class", val: toClass, set: setToClass, opts: groups },
            { label: "To Stream", val: toStream, set: setToStream, opts: streams },
          ].map(({ label, val, set, opts }) => (
            <div key={label}>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">{label}</label>
              <select value={val} onChange={e => set(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:outline-none focus:border-purple-400 transition">
                {opts.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <button
            onClick={runSimulation}
            disabled={running}
            className={`flex items-center gap-2 text-sm font-bold px-6 py-3 rounded-xl text-white transition-all ${running ? "bg-gray-300 cursor-not-allowed" : "bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-200"}`}
          >
            {running ? (
              <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Running Simulation...</>
            ) : (
              <><PlayCircle size={16} />Run Simulation</>
            )}
          </button>
          {simulated && (
            <button onClick={reset} className="flex items-center gap-2 text-sm font-semibold text-gray-500 bg-gray-100 hover:bg-gray-200 px-4 py-3 rounded-xl transition">
              <RotateCcw size={15} /> Reset
            </button>
          )}
        </div>
      </div>

      {simulated && (
        <>
          {/* Simulation Results */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: "Will Be Promoted", count: eligible.length, students: eligible, color: "text-green-700", bg: "bg-green-50", border: "border-green-200", icon: CheckCircle, iconColor: "text-green-600" },
              { label: "At Risk (Review Needed)", count: risky.length, students: risky, color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", icon: AlertTriangle, iconColor: "text-amber-600" },
              { label: "Will Repeat", count: repeaters.length, students: repeaters, color: "text-red-700", bg: "bg-red-50", border: "border-red-200", icon: RotateCcw, iconColor: "text-red-600" },
            ].map(card => {
              const Icon = card.icon;
              return (
                <div key={card.label} className={`rounded-2xl border ${card.border} ${card.bg} p-5`}>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className={`text-sm font-semibold ${card.color}`}>{card.label}</h4>
                    <Icon size={16} className={card.iconColor} />
                  </div>
                  <p className={`text-4xl font-semibold ${card.color} mb-4`}>{card.count}</p>
                  <div className="space-y-1.5">
                    {card.students.slice(0, 3).map(s => (
                      <div key={s.id} className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-white shadow-sm flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0">
                          {s.name[0]}
                        </div>
                        <span className={`text-xs font-semibold ${card.color}`}>{s.name}</span>
                        <span className="text-xs text-gray-400 ml-auto">{s.avgMarks}%</span>
                      </div>
                    ))}
                    {card.students.length > 3 && (
                      <p className={`text-xs font-semibold ${card.color} opacity-70`}>+{card.students.length - 3} more students...</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h4 className="text-sm font-semibold text-gray-800 mb-4">Simulation Summary</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
              {[
                { label: "Total Students", value: cohort.length },
                { label: "Promotion Rate", value: cohort.length ? `${Math.round((eligible.length / cohort.length) * 100)}%` : "0%" },
                { label: "Repeat Rate", value: cohort.length ? `${Math.round((repeaters.length / cohort.length) * 100)}%` : "0%" },
                { label: "At-Risk", value: risky.length },
              ].map(m => (
                <div key={m.label} className="text-center bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-400">{m.label}</p>
                  <p className="text-2xl font-semibold text-gray-800">{m.value}</p>
                </div>
              ))}
            </div>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl mb-4 flex items-start gap-2">
              <Sparkles size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-700 font-semibold">
                <span className="font-semibold">AI Insight:</span> {risky.length} students are borderline — consider reviewing their records individually before final submission. {repeaters.length} students have been auto-flagged based on academic performance thresholds.
              </p>
            </div>
            <div className="flex gap-3">
              <button className="flex items-center gap-2 text-sm font-bold bg-amber-500 hover:bg-amber-600 text-white px-6 py-2.5 rounded-xl transition shadow-lg shadow-amber-200 ml-auto">
                Proceed to Actual Promotion <ArrowRight size={15} />
              </button>
            </div>
          </div>

          {/* Undo section */}
          <div className="bg-gray-50 rounded-2xl border border-dashed border-gray-200 p-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-gray-700">Need to Undo a Recent Promotion?</p>
              <p className="text-xs text-gray-400 mt-0.5">Rollback is available before the academic year officially starts</p>
            </div>
            <button className="flex items-center gap-2 text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 px-4 py-2.5 rounded-xl transition">
              <RotateCcw size={14} /> Undo Last Promotion
            </button>
          </div>
        </>
      )}

      {!simulated && !running && (
        <div className="text-center py-16">
          <PlayCircle size={48} className="text-gray-200 mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Configure the promotion parameters above and run the simulation to preview outcomes.</p>
        </div>
      )}
      </PromotionPageBody>
    </div>
  );
}
