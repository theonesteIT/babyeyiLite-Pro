// ================================================================
// Dashboard.jsx — Navy + amber (School Manager shell)
// ================================================================

import { useState, useEffect } from "react";
import { BABYEYI_FONT_STACK } from '../../schoolLiteSupport/babyeyiDashboardTheme';
import {
  FileText, CheckCircle, Clock, XCircle, AlertTriangle, TrendingUp,
  Activity, BarChart3, ArrowUpRight, ChevronRight,
  DollarSign, BookOpen, Award, Zap
} from "lucide-react";
import { StatCard, LineAreaChart, DonutChart, HBarChart, ModernBarChart, Badge } from "./UI";
import { API_BASE } from '../../lib/schoolLiteApi';

export default function DashboardPage({ setTab, toast, t, session }) {
  const [loading, setLoading] = useState(true);
  const [stats,   setStats]   = useState(null);

  const schoolId = session?.schoolId ?? null;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const statsRes = await fetch(
          `${API_BASE}/babyeyi/stats${schoolId ? `?school_id=${schoolId}` : ""}`,
          { credentials: "include" }
        );
        const statsJson = await statsRes.json().catch(() => ({}));
        if (!statsRes.ok || statsJson.success === false) {
          throw new Error(statsJson.message || "Failed to load Babyeyi stats");
        }
        const s = statsJson.data || {};

        const listRes = await fetch(
          `${API_BASE}/babyeyi?limit=50${schoolId ? `&school_id=${schoolId}` : ""}`,
          { credentials: "include" }
        );
        const listJson = await listRes.json().catch(() => ({}));
        if (!listRes.ok || listJson.success === false) {
          throw new Error(listJson.message || "Failed to load Babyeyi records");
        }
        const rows = Array.isArray(listJson.data) ? listJson.data : [];

        const total    = Number(s.total    || 0);
        const approved = Number(s.approved || 0);
        const pending  = Number(s.pending  || 0);
        const rejected = Number(s.rejected || 0);
        const exceeded = Number(s.exceeds_count || 0);

        const complianceRate =
          total > 0 ? Math.round(((total - exceeded) / total) * 100) : 100;

        const feeByClass = rows.map((b) => ({
          label: b.class,
          value: Math.round(Number(b.total_fee || 0) / 1000),
          limit: b.nesa_limit != null
            ? Math.round(Number(b.nesa_limit) / 1000)
            : null,
        }));

        const trendMap = new Map();
        rows.forEach((b) => {
          const label = `${b.term || ""} ${b.academic_year || ""}`.trim();
          if (!label) return;
          const prev = trendMap.get(label) || { value: 0, approved: 0 };
          prev.value += 1;
          if (b.status === "approved") prev.approved += 1;
          trendMap.set(label, prev);
        });
        const termTrend = Array.from(trendMap.entries()).map(
          ([label, v]) => ({ label, value: v.value, approved: v.approved })
        );

        const paymentBreakdown = [
          { label: "Tuition",    value: 70, color: "#FEBF10" },
          { label: "Materials",  value: 15, color: "#FED44A" },
          { label: "Activities", value: 10, color: "#B88A00" },
          { label: "Other",      value:  5, color: "#7A5C00" },
        ];

        const recentBabyeyi = rows.slice(0, 4).map((b) => ({
          id:       b.id,
          class:    b.class,
          term:     b.term,
          year:     b.academic_year,
          category: b.category,
          totalFee: Number(b.total_fee || 0),
          status:   b.status,
        }));

        setStats({
          total, approved, pending, rejected, exceeded,
          complianceRate, feeByClass, termTrend, paymentBreakdown, recentBabyeyi,
        });
      } catch (e) {
        console.error(e);
        if (toast) toast(e.message || "Failed to load Babyeyi dashboard", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [schoolId, toast]);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-10 h-10 rounded-full border-4 border-amber-200 animate-spin" style={{ borderTopColor: "#FEBF10" }}/>
    </div>
  );

  if (!stats) return null;

  const kpis = [
    { icon: FileText, label: t?.totalBabyeyi ?? "Total Babyeyi", value: stats.total, sub: "All terms" },
    { icon: DollarSign, label: "Fees Collected", value: `RWF ${(stats.recentBabyeyi || []).reduce((s, r) => s + Number(r.totalFee || 0), 0).toLocaleString()}`, sub: "Current selection" },
    { icon: BookOpen, label: "Active Classes", value: new Set((stats.feeByClass || []).map((x) => x.label)).size || 0, sub: "Enrolled cohorts" },
    
  ];

  return (
    <div className="space-y-5" style={{ fontFamily: BABYEYI_FONT_STACK }}>
      <section className="rounded-2xl border border-slate-200/70 bg-white shadow-sm overflow-hidden">
       

        <div className="px-4 md:px-6 py-8 md:py-10 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #c47b00 0%, #b36d00 45%, #9f6100 100%)" }}>
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full border border-white/10" />
          <div className="absolute -right-4 -top-4 h-40 w-40 rounded-full border border-white/10" />
          <div className="relative">
            <div className="w-7 h-1 rounded-full bg-amber-300 mb-4" />
            <h3 className="text-2xl md:text-3xl tracking-tight text-white font-semibold">Manager Dashboard</h3>
            <p className="text-sm text-white/80 mt-2">Performance snapshot and approvals overview</p>
          </div>
        </div>

        <div className="px-3 md:px-6 pb-4 md:pb-6 -mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
            {kpis.map((card, i) => (
              <button
                key={i}
                onClick={() => setTab("babyeyi")}
                className="text-left p-4 border-b sm:border-b xl:border-b-0 sm:border-r last:border-r-0 border-slate-100 hover:bg-slate-50/80 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-50 text-amber-700 mb-2">
                  <card.icon className="w-4 h-4" />
                </div>
                <p className="text-3xl leading-none font-semibold text-slate-900">{card.value}</p>
                <p className="mt-2 text-[11px] uppercase tracking-[0.11em] text-slate-500 font-medium">{card.label}</p>
                <p className="mt-1 text-[11px] text-slate-400">{card.sub}</p>
              </button>
            ))}
           
          </div>
        </div>
      </section>

      {/* NESA Alert */}
      {stats.exceeded > 0 && (
        <div className="rounded-2xl p-4 text-white shadow-lg flex items-center gap-4 slide-up"
          style={{ background: "linear-gradient(135deg, #dc2626, #ef4444)" }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "rgba(255,255,255,0.2)" }}>
            <AlertTriangle className="w-5 h-5"/>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4 shrink-0" /> NESA Limit Violation Detected</h3>
            <p className="text-red-100 text-xs">{stats.exceeded} Babyeyi exceed national fee limits. Review and submit increase requests.</p>
          </div>
          <button onClick={() => setTab("babyeyi")}
            className="shrink-0 px-4 py-2 font-bold text-xs rounded-xl transition-all active:scale-95"
            style={{ background: "#fff", color: "#dc2626" }}>
            View &amp; Fix →
          </button>
        </div>
      )}

     
    </div>
  );
}