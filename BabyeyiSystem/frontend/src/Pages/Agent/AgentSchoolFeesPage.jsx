import { useEffect, useState } from "react";
import { Loader2, Filter } from "lucide-react";
import { axAgent } from "./agentApi";
import { ACCENT_SLATE, selectClass, inputClass, cardBorder } from "./agentTheme";

const TERMS = ["", "Term 1", "Term 2", "Term 3"];

export default function AgentSchoolFeesPage() {
  const [rows, setRows] = useState([]);
  const [schools, setSchools] = useState([]);
  const [filters, setFilters] = useState({
    sector: "",
    cell: "",
    school_id: "",
    academic_year: "",
    term: "",
  });
  const [opts, setOpts] = useState({ sectors: [], cells: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axAgent.get("/schools/filters").then((r) => {
      if (r.data.success) setOpts(r.data.data || { sectors: [], cells: [] });
    });
    axAgent.get("/schools").then((r) => {
      if (r.data.success) setSchools(r.data.data || []);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = {
      sector: filters.sector || undefined,
      cell: filters.cell || undefined,
      school_id: filters.school_id || undefined,
      academic_year: filters.academic_year || undefined,
      term: filters.term || undefined,
    };
    axAgent
      .get("/school-fees", params)
      .then((r) => {
        if (!cancelled && r.data.success) setRows(r.data.data || []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filters.sector, filters.cell, filters.school_id, filters.academic_year, filters.term]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-[#111827]">School fees (Babyeyi)</h2>
        <p className="text-sm text-amber-900/80 mt-1 font-medium">Payment intents linked to schools in your coverage. Filter as needed.</p>
      </div>

      <div className={`rounded-3xl ${cardBorder} bg-white p-4 sm:p-5 shadow-md shadow-amber-900/5 space-y-3`}>
        <div className="flex items-center gap-2 text-sm font-black text-[#111827]">
          <Filter className="w-4 h-4 text-amber-600" /> Filters
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          <select
            className={selectClass}
            value={filters.sector}
            onChange={(e) => setFilters((f) => ({ ...f, sector: e.target.value }))}
          >
            <option value="">Sector</option>
            {opts.sectors.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            className={selectClass}
            value={filters.cell}
            onChange={(e) => setFilters((f) => ({ ...f, cell: e.target.value }))}
          >
            <option value="">Cell</option>
            {opts.cells.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            className={selectClass}
            value={filters.school_id}
            onChange={(e) => setFilters((f) => ({ ...f, school_id: e.target.value }))}
          >
            <option value="">School</option>
            {schools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.school_name}
              </option>
            ))}
          </select>
          <input
            className={inputClass}
            placeholder="Academic year"
            value={filters.academic_year}
            onChange={(e) => setFilters((f) => ({ ...f, academic_year: e.target.value }))}
          />
          <select
            className={selectClass}
            value={filters.term}
            onChange={(e) => setFilters((f) => ({ ...f, term: e.target.value }))}
          >
            {TERMS.map((t) => (
              <option key={t || "all"} value={t}>
                {t || "Term (any)"}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: ACCENT_SLATE }} />
        </div>
      ) : (
        <div className={`rounded-3xl ${cardBorder} bg-white overflow-hidden shadow-md shadow-amber-900/5`}>
          <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
            <table className="w-full text-xs sm:text-sm min-w-[720px]">
              <thead className="sticky top-0 z-10 bg-amber-50 border-b-2 border-amber-100">
                <tr className="text-left text-[10px] font-black uppercase text-amber-900">
                  <th className="py-3 px-3">Invoice</th>
                  <th className="py-3 px-3">School</th>
                  <th className="py-3 px-3 hidden md:table-cell">Sector / cell</th>
                  <th className="py-3 px-3 hidden lg:table-cell">Term · Year</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">RWF</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-amber-100/70 hover:bg-amber-50/40">
                    <td className="py-2.5 px-3 font-mono text-[11px] text-amber-900/80">{r.invoice_no || `#${r.id}`}</td>
                    <td className="py-2.5 px-3 font-semibold text-[#111827]">{r.school_name}</td>
                    <td className="py-2.5 px-3 hidden md:table-cell text-amber-900/70">
                      {r.sector} · {r.cell}
                    </td>
                    <td className="py-2.5 px-3 hidden lg:table-cell text-amber-900/70">
                      {r.term || "—"} {r.academic_year ? `· ${r.academic_year}` : ""}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-bold text-[10px] px-2 py-0.5 rounded-full bg-[#1F2937] text-amber-200 border border-amber-300/30">
                        {r.invoice_status || r.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-900">{Number(r.total_rwf || 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!rows.length && <p className="text-center py-10 text-amber-800/70 text-sm font-medium">No records for these filters.</p>}
        </div>
      )}
    </div>
  );
}
