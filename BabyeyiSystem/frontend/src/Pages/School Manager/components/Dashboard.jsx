// ================================================================
// Dashboard.jsx — Navy + amber (School Manager shell)
// ================================================================

import { useState, useEffect, useCallback } from "react";
import { BABYEYI_FONT_STACK } from "../../../theme/babyeyiDashboardTheme";
import {
  FileText, CheckCircle, Clock, XCircle, AlertTriangle, TrendingUp,
  Activity, ArrowUpRight,
} from "lucide-react";
import { LineAreaChart, HBarChart } from "../components/UI";

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : "http://localhost:5100/api";

const CURRENT_YEAR = new Date().getFullYear();

export default function DashboardPage({ setTab, toast, t, session }) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [chartYear, setChartYear] = useState(CURRENT_YEAR);

  const schoolId = session?.schoolId ?? null;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (schoolId) q.set("school_id", String(schoolId));
      q.set("year", String(chartYear));

      const statsRes = await fetch(`${API_BASE}/babyeyi/stats?${q}`, { credentials: "include" });
      const statsJson = await statsRes.json().catch(() => ({}));
      if (!statsRes.ok || statsJson.success === false) {
        throw new Error(statsJson.message || "Failed to load Babyeyi stats");
      }
      const s = statsJson.data || {};

      const total = Number(s.total || 0);
      const approved = Number(s.approved || 0);
      const pending = Number(s.pending || 0);
      const rejected = Number(s.rejected || 0);
      const exceeded = Number(s.exceeds_count || 0);
      const complianceRate = total > 0 ? Math.round(((total - exceeded) / total) * 100) : 100;

      const statusOverview = Array.isArray(s.status_overview) && s.status_overview.length
        ? s.status_overview
        : [
            { label: "Approved", value: approved, color: "#000435" },
            { label: "Pending", value: pending, color: "#fbbf24" },
            { label: "Rejected", value: rejected, color: "#94a3b8" },
          ];

      const monthlyActivity = Array.isArray(s.monthly_activity) ? s.monthly_activity : [];

      setStats({
        total,
        approved,
        pending,
        rejected,
        exceeded,
        complianceRate,
        statusOverview,
        monthlyActivity,
        year: s.year || chartYear,
      });
    } catch (e) {
      console.error(e);
      if (toast) toast(e.message || "Failed to load Babyeyi dashboard", "error");
    } finally {
      setLoading(false);
    }
  }, [schoolId, chartYear, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 rounded-full border-4 border-amber-200 animate-spin" style={{ borderTopColor: "#fbbf24" }} />
      </div>
    );
  }

  if (!stats) return null;

  const kpiCards = [
    { icon: FileText, label: t?.totalBabyeyi ?? "Total Babyeyi", value: stats.total, highlight: false },
    { icon: CheckCircle, label: t?.approved ?? "Approved", value: stats.approved, highlight: false },
    { icon: Clock, label: t?.pending ?? "Pending", value: stats.pending, highlight: false },
    { icon: XCircle, label: t?.rejected ?? "Rejected", value: stats.rejected, highlight: false },
    { icon: AlertTriangle, label: "NESA Alerts", value: stats.exceeded, highlight: stats.exceeded > 0 },
  ];

  const statusBarData = stats.statusOverview.map((row) => ({
    label: row.label,
    value: Number(row.value) || 0,
    color: row.color,
  }));

  const yearOptions = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2];

  return (
    <div className="space-y-4 sm:space-y-5 anim" style={{ fontFamily: BABYEYI_FONT_STACK }}>
      {/* Hero — date + title only */}
      <div className="rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-5 sm:p-8 shadow-sm">
        <time
          dateTime={new Date().toISOString().slice(0, 10)}
          className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-900"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </time>
        <h2 className="mt-4 text-2xl sm:text-3xl font-bold text-[#000435] tracking-tight">
          School Babyeyi Portal
        </h2>
        <div className="mt-2 h-1 w-12 rounded-full bg-amber-400" />
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
        {kpiCards.map((card, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setTab("babyeyi")}
            className={`text-left rounded-xl sm:rounded-2xl p-3 sm:p-4 border transition-all hover:shadow-md active:scale-[0.98] ${
              card.highlight
                ? "border-amber-300 bg-gradient-to-br from-amber-50 to-amber-100/80"
                : "border-slate-200 bg-white"
            }`}
          >
            <div className="flex items-start justify-between gap-1 mb-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${card.highlight ? "bg-amber-400" : "bg-amber-50"}`}>
                <card.icon className={`w-4 h-4 ${card.highlight ? "text-[#000435]" : "text-amber-600"}`} />
              </div>
              {card.highlight && <ArrowUpRight className="w-4 h-4 text-amber-700 shrink-0" />}
            </div>
            <p className="text-xl sm:text-2xl font-bold text-[#000435] tabular-nums">{card.value}</p>
            <p className="text-[10px] sm:text-[11px] font-semibold text-slate-600 mt-0.5">{card.label}</p>
          </button>
        ))}
      </div>

      {stats.exceeded > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex flex-col sm:flex-row sm:items-center gap-3 slide-up">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-400/30 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#000435]">NESA Limit Violation Detected</h3>
              <p className="text-xs text-amber-900/80 mt-0.5">
                {stats.exceeded} Babyeyi exceed national fee limits.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setTab("babyeyi")}
            className="shrink-0 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#000435] text-white text-xs font-bold hover:bg-[#000a50] transition-all active:scale-95"
          >
            View &amp; Fix <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Status bar chart — from API */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4 gap-2">
            <h3 className="font-bold text-[#000435] flex items-center gap-2 text-sm">
              <Activity className="w-4 h-4 text-amber-500 shrink-0" />
              Babyeyi Status Overview
            </h3>
            <select
              value={chartYear}
              onChange={(e) => setChartYear(Number(e.target.value))}
              className="text-[11px] font-semibold text-slate-600 border border-slate-200 rounded-lg px-2 py-1 bg-white outline-none focus:border-amber-400/60"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>{y === CURRENT_YEAR ? "This Year" : y}</option>
              ))}
            </select>
          </div>
          {statusBarData.some((d) => d.value > 0) ? (
            <>
              <HBarChart data={statusBarData} labelKey="label" valueKey="value" />
            </>
          ) : (
            <p className="text-center text-sm text-slate-400 py-12">No Babyeyi records yet for this school.</p>
          )}
        </div>

        {/* Monthly activity — from API */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4 gap-2">
            <h3 className="font-bold text-[#000435] flex items-center gap-2 text-sm">
              <TrendingUp className="w-4 h-4 text-amber-500 shrink-0" />
              Monthly Activity
            </h3>
            <select
              value={chartYear}
              onChange={(e) => setChartYear(Number(e.target.value))}
              className="text-[11px] font-semibold text-slate-600 border border-slate-200 rounded-lg px-2 py-1 bg-white outline-none focus:border-amber-400/60"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>{y === CURRENT_YEAR ? "This Year" : y}</option>
              ))}
            </select>
          </div>
          <LineAreaChart
            data={stats.monthlyActivity}
            labelKey="label"
            valueKey="value"
            color="#fbbf24"
            height={180}
          />
          <p className="text-[10px] text-slate-400 text-center mt-2">
            Babyeyi created per month · {chartYear}
          </p>
        </div>
      </div>
    </div>
  );
}
