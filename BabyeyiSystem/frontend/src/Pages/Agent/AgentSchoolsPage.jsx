import { useEffect, useState } from "react";
import { Search, Loader2, MapPin } from "lucide-react";
import { axAgent } from "./agentApi";
import { ACCENT_SLATE, inputClass, selectClass, pageShell, pageCardPad, tableShell, tableHeadRow, tableHeadCell, tableBodyRow } from "./agentTheme";
import AgentPageHeader from "./AgentPageHeader";

export default function AgentSchoolsPage() {
  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState({ sector: "", cell: "", search: "" });
  const [options, setOptions] = useState({ sectors: [], cells: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axAgent
      .get("/schools/filters")
      .then((r) => {
        if (r.data.success) setOptions(r.data.data || { sectors: [], cells: [] });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    axAgent
      .get("/schools", {
        sector: filters.sector || undefined,
        cell: filters.cell || undefined,
        search: filters.search || undefined,
      })
      .then((r) => {
        if (!cancelled && r.data.success) setRows(r.data.data || []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filters.sector, filters.cell, filters.search]);

  return (
    <div className={`${pageShell} bg-white`}>
      <AgentPageHeader
        title="Schools"
        description="Institutions in your coverage area. Refine by sector, cell, or name."
      />

      <div className={`${pageCardPad} grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3`}>
        <div className="relative sm:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500" />
          <input
            className={`${inputClass} pl-10`}
            placeholder="Search name or code…"
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          />
        </div>
        <select
          className={selectClass}
          value={filters.sector}
          onChange={(e) => setFilters((f) => ({ ...f, sector: e.target.value }))}
        >
          <option value="">All sectors</option>
          {options.sectors.map((s) => (
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
          <option value="">All cells</option>
          {options.cells.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: ACCENT_SLATE }} />
        </div>
      ) : (
        <div className={tableShell}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={tableHeadRow}>
                  <th className={tableHeadCell}>School</th>
                  <th className={`${tableHeadCell} hidden sm:table-cell`}>Code</th>
                  <th className={tableHeadCell}>Location</th>
                  <th className={tableHeadCell}>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.id} className={tableBodyRow}>
                    <td className="py-3 px-4 font-semibold text-[#000435]">{s.school_name}</td>
                    <td className="py-3 px-4 hidden sm:table-cell font-mono text-slate-500">{s.school_code}</td>
                    <td className="py-3 px-4 text-xs text-slate-600">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3 h-3 shrink-0 text-amber-500" />
                        {s.sector} · {s.cell}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                        {s.status || "—"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!rows.length && <p className="text-center py-12 text-slate-500 text-sm font-medium">No schools match your filters.</p>}
        </div>
      )}
    </div>
  );
}
