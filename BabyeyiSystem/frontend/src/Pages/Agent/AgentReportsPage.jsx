import { useEffect, useState } from "react";
import { Loader2, CalendarRange } from "lucide-react";
import { axAgent } from "./agentApi";
import { ACCENT_SLATE, inputClass, cardBorder } from "./agentTheme";

export default function AgentReportsPage() {
  const [rows, setRows] = useState([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    axAgent
      .get("/reports/summary", { date_from: from || undefined, date_to: to || undefined })
      .then((r) => {
        if (!cancelled && r.data.success) setRows(r.data.data?.by_month || []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [from, to]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-[#111827]">Reports</h2>
        <p className="text-sm text-amber-900/80 mt-1 font-medium">Babyeyi payment intents by month (paid amounts only in the paid column).</p>
      </div>

      <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-stretch sm:items-end">
        <label className="text-xs font-bold text-amber-900 flex flex-col gap-1">
          From
          <input type="date" className={inputClass} value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="text-xs font-bold text-amber-900 flex flex-col gap-1">
          To
          <input type="date" className={inputClass} value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: ACCENT_SLATE }} />
        </div>
      ) : (
        <div className={`rounded-3xl ${cardBorder} bg-white overflow-hidden shadow-md shadow-amber-900/5`}>
          <div className="px-4 py-3 border-b-2 border-amber-100 flex items-center gap-2 bg-gradient-to-r from-amber-50 to-amber-100/50">
            <CalendarRange className="w-4 h-4 text-amber-700" />
            <span className="text-sm font-black text-[#111827]">Monthly totals</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] font-black uppercase text-amber-900 border-b-2 border-amber-100 bg-amber-50/50">
                  <th className="py-3 px-4">Month</th>
                  <th className="py-3 px-4 text-right">Paid RWF</th>
                  <th className="py-3 px-4 text-right">Intents</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.period} className="border-b border-amber-100/60 hover:bg-amber-50/40">
                    <td className="py-3 px-4 font-semibold text-[#111827]">{r.period}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-amber-800">
                      {Number(r.paid_rwf || 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right text-amber-900/70">{r.intents}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!rows.length && <p className="text-center py-10 text-amber-800/70 text-sm font-medium">No data in this range.</p>}
        </div>
      )}
    </div>
  );
}
