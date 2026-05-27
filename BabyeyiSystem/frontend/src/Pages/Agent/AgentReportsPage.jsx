import { useEffect, useState } from "react";
import { Loader2, CalendarRange } from "lucide-react";
import { axAgent } from "./agentApi";
import { ACCENT_SLATE, inputClass, pageShell, tableShell, tableHeadRow, tableHeadCell, tableBodyRow, pageCardPad } from "./agentTheme";
import AgentPageHeader from "./AgentPageHeader";

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
    <div className={`${pageShell} bg-white`}>
      <AgentPageHeader
        title="Reports"
        description="Babyeyi payment intents by month (paid amounts in the paid column)."
      />

      <div className={`${pageCardPad} flex flex-col sm:flex-row flex-wrap gap-3 items-stretch sm:items-end`}>
        <label className="text-xs font-semibold text-slate-600 flex flex-col gap-1 flex-1 min-w-[140px]">
          From
          <input type="date" className={inputClass} value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="text-xs font-semibold text-slate-600 flex flex-col gap-1 flex-1 min-w-[140px]">
          To
          <input type="date" className={inputClass} value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: ACCENT_SLATE }} />
        </div>
      ) : (
        <div className={tableShell}>
          <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2 bg-slate-50">
            <CalendarRange className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-bold text-[#000435]">Monthly totals</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={tableHeadRow}>
                  <th className={tableHeadCell}>Month</th>
                  <th className={`${tableHeadCell} text-right`}>Paid RWF</th>
                  <th className={`${tableHeadCell} text-right`}>Intents</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.period} className={tableBodyRow}>
                    <td className="py-3 px-4 font-semibold text-[#000435]">{r.period}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                      {Number(r.paid_rwf || 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-600">{r.intents}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!rows.length && <p className="text-center py-10 text-slate-500 text-sm font-medium">No data in this range.</p>}
        </div>
      )}
    </div>
  );
}
