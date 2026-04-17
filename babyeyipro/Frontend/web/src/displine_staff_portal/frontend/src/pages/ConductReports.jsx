import { useState, useEffect, useCallback } from 'react';
import { FileBarChart, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import api from '../services/api';
import { PORTAL } from '../config/portal';

const TERMS = ['Term 1', 'Term 2', 'Term 3'];
const ACADEMIC_YEARS = ['2023-2024', '2024-2025', '2025-2026', '2026-2027', '2027-2028'];

const BAR_COLORS = [
  '#FF8C00', '#FF5E00', '#FF6B35', '#FF9F45', '#FFB347',
  '#E08000', '#D45500', '#C44000', '#F4A261', '#E76F51',
];

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-black/10 bg-white px-3 py-2 shadow-lg text-xs">
      <p className="font-black text-re-text mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }} className="font-bold">
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
}

/**
 * GET /api/discipline/report-summary — aggregates for HoD
 */
export default function ConductReports() {
  const [academicYear, setAcademicYear] = useState('2025-2026');
  const [term, setTerm] = useState('Term 1');
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/discipline/report-summary', {
        params: { academic_year: academicYear, term },
      });
      if (!res.data?.success) {
        setError(res.data?.message || 'Failed to load report');
        setData(null);
        return;
      }
      setData(res.data.data);
    } catch (e) {
      setError(e.response?.data?.message || 'Could not load report. HoD or manager access required.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [academicYear, term]);

  useEffect(() => { load(); }, [load]);

  const field =
    'rounded-xl border border-black/10 bg-re-bg px-3 py-2 text-xs font-bold text-re-text shadow-inner focus:border-re-orange/40 focus:outline-none focus:ring-2 focus:ring-re-orange/20';

  const byClass = (data?.by_class || []).map((r) => ({
    ...r,
    case_count: Number(r.case_count || 0),
    marks_removed: Number(r.marks_removed || 0),
  }));

  const totalMarksRemoved = Number(data?.total_marks_removed || 0).toFixed(2);

  return (
    <div className="animate-in fade-in duration-500 bg-re-bg min-h-screen pb-16 px-4 md:px-8 pt-8 max-w-[1000px] mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-re-text-muted mb-1 flex items-center gap-2">
            <FileBarChart size={14} className="text-re-orange" /> Reports
          </p>
          <h1 className="text-2xl md:text-3xl font-black text-re-text tracking-tight">Conduct summary</h1>
          <p className="mt-2 text-sm text-re-text-muted font-bold max-w-xl">
            Term view of discipline cases and marks removed — aligned with SmartEducationSystem HoD reporting.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-widest text-re-text hover:bg-re-bg"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="rounded-[24px] border border-black/5 bg-white p-4 md:p-5 shadow-sm mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md">
          <div>
            <label className="mb-1 block text-[9px] font-black uppercase text-re-text-muted">Year</label>
            <select className={`w-full ${field}`} value={academicYear} onChange={(e) => setAcademicYear(e.target.value)}>
              {ACADEMIC_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[9px] font-black uppercase text-re-text-muted">Term</label>
            <select className={`w-full ${field}`} value={term} onChange={(e) => setTerm(e.target.value)}>
              {TERMS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-950">
          <AlertCircle size={18} className="shrink-0" />
          {error}
        </div>
      )}

      {loading && !data ? (
        <div className="flex justify-center py-20 text-re-text-muted font-bold">
          <Loader2 className="animate-spin text-re-orange w-8 h-8" />
        </div>
      ) : data ? (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'School cap', value: data.total_marks_default },
              { label: 'Cases', value: data.case_count },
              { label: 'Learners affected', value: data.students_affected },
              { label: 'Marks removed', value: totalMarksRemoved },
            ].map((card) => (
              <div key={card.label} className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
                <p className="text-[9px] font-black uppercase text-re-text-muted mb-1">{card.label}</p>
                <p className="text-xl font-black text-re-text">{card.value}</p>
              </div>
            ))}
          </div>

          {/* Bar chart — cases by class */}
          {byClass.length > 0 && (
            <div className="rounded-[24px] border border-black/5 bg-white p-5 shadow-sm mb-6">
              <div className="mb-4">
                <p className="text-[9px] font-black uppercase tracking-widest text-re-text-muted mb-0.5">Visual breakdown</p>
                <h2 className="text-sm font-black text-re-text">Cases per class</h2>
              </div>
              <div style={{ height: Math.max(220, byClass.length * 44) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={byClass}
                    layout="vertical"
                    margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
                  >
                    <XAxis type="number" tick={{ fontSize: 10, fontWeight: 700 }} allowDecimals={false} />
                    <YAxis
                      type="category"
                      dataKey="class_name"
                      width={90}
                      tick={{ fontSize: 10, fontWeight: 700 }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="case_count" name="Cases" radius={[0, 6, 6, 0]}>
                      {byClass.map((_, i) => (
                        <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Marks removed mini chart */}
              <div className="mt-6 mb-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-re-text-muted mb-0.5">Marks removed per class</p>
              </div>
              <div style={{ height: Math.max(220, byClass.length * 44) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={byClass}
                    layout="vertical"
                    margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
                  >
                    <XAxis type="number" tick={{ fontSize: 10, fontWeight: 700 }} />
                    <YAxis
                      type="category"
                      dataKey="class_name"
                      width={90}
                      tick={{ fontSize: 10, fontWeight: 700 }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="marks_removed" name="Marks removed" radius={[0, 6, 6, 0]} fill="#FF5E00" opacity={0.75} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Per-class table */}
          <div className="rounded-[24px] border border-black/5 bg-white overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-black/5 bg-re-bg">
              <h2 className="text-[10px] font-black uppercase tracking-widest text-re-text-muted">Detail by class</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-[9px] font-black uppercase text-re-text-muted border-b border-black/5">
                  <tr>
                    <th className="text-left px-4 py-2">Class</th>
                    <th className="text-right px-4 py-2">Cases</th>
                    <th className="text-right px-4 py-2">Marks removed</th>
                    <th className="px-4 py-2">Severity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {byClass.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-re-text-muted font-bold">
                        No cases in this period.
                      </td>
                    </tr>
                  ) : (
                    byClass.map((row, i) => {
                      const maxCases = Math.max(...byClass.map((r) => r.case_count), 1);
                      const pct = Math.round((row.case_count / maxCases) * 100);
                      const barColor = pct > 66 ? '#FF5E00' : pct > 33 ? '#FF8C00' : '#22c55e';
                      return (
                        <tr key={`${row.class_name}-${i}`} className="hover:bg-re-bg/40">
                          <td className="px-4 py-2 font-bold text-re-text">{row.class_name}</td>
                          <td className="px-4 py-2 text-right font-black">{row.case_count}</td>
                          <td className="px-4 py-2 text-right font-bold text-re-orange">
                            {Number(row.marks_removed || 0).toFixed(2)}
                          </td>
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 rounded-full bg-black/5 overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{ width: `${pct}%`, background: barColor }}
                                />
                              </div>
                              <span className="text-[9px] font-black text-re-text-muted w-8 text-right">{pct}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}

      <p className="text-center text-[9px] text-re-text-muted font-black uppercase tracking-widest mt-10 opacity-40">
        {PORTAL.roleLabel} · {PORTAL.brandLine}
      </p>
    </div>
  );
}
