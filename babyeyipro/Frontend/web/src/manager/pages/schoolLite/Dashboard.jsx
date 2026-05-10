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
    { icon: Award, label: "Teaching Personnel", value: "—", sub: "Linked from HR" },
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
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
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
            <div className="p-4 space-y-2 bg-slate-50/70">
              <button className="w-full h-10 rounded-xl bg-[#0b2a57] text-white text-xs font-semibold">Export Records</button>
              <button className="w-full h-10 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold">Quick Actions</button>
              <button className="w-full h-10 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 text-xs font-semibold">
                Refresh Data
              </button>
            </div>
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

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm" style={{ fontFamily: BABYEYI_FONT_STACK }}>
              <TrendingUp className="w-4 h-4" style={{ color: "#FEBF10" }}/> Babyeyi Approval Trend
            </h3>
            <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-1.5 rounded inline-block" style={{ background: "#FEBF10" }}/>Submitted
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-1.5 rounded bg-emerald-500 inline-block"/>Approved
              </span>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mb-3">Academic year history · All terms</p>
          <LineAreaChart data={stats.termTrend} labelKey="label" valueKey="value"    color="#FEBF10" height={130}/>
          <div className="mt-1">
            <LineAreaChart data={stats.termTrend} labelKey="label" valueKey="approved" color="#10b981" height={70} showGrid={false}/>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 flex flex-col">
          <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm mb-4" style={{ fontFamily: BABYEYI_FONT_STACK }}>
            <Activity className="w-4 h-4" style={{ color: "#B88A00" }}/> Payment Breakdown
          </h3>
          <div className="flex items-center justify-center flex-1 gap-4">
            <DonutChart data={stats.paymentBreakdown} size={130}/>
            <div className="space-y-2.5">
              {stats.paymentBreakdown.map(d => (
                <div key={d.label} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }}/>
                  <div>
                    <p className="text-xs font-bold text-slate-800">{d.value}%</p>
                    <p className="text-[9px] text-slate-400 font-medium">{d.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 rounded-xl p-2.5 text-center border"
            style={{ background: "#FFFBE8", borderColor: "#FEBF10" }}>
            <p className="text-sm font-semibold" style={{ color: "#B88A00" }}>{stats.complianceRate}%</p>
            <p className="text-[10px]" style={{ color: "#7A5C00" }}>Compliance Rate</p>
          </div>
        </div>
      </div>

      {/* Fee vs Limit + Recent */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
          <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm mb-1" style={{ fontFamily: BABYEYI_FONT_STACK }}>
            <BarChart3 className="w-4 h-4" style={{ color: "#FEBF10" }}/> Your Fee vs Recommended Limit (×1000 RWF)
          </h3>
          <p className="text-[10px] text-slate-400 mb-3">Per class comparison — current term</p>
          <ModernBarChart
            data={stats.feeByClass} labelKey="label" valueKey="value"
            color="#FEBF10" secondaryKey="limit" secondaryColor="#10b981" height={160}
          />
          <div className="flex items-center gap-4 mt-2 justify-center">
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
              <span className="w-3 h-2 rounded inline-block" style={{ background: "#FEBF10" }}/>Your Fee
            </span>
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
              <span className="w-3 h-2 rounded bg-emerald-500 inline-block"/>Recommended Limit
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2 text-sm" style={{ fontFamily: BABYEYI_FONT_STACK }}>
              <Award className="w-4 h-4 text-amber-500"/> Recent Babyeyi
            </h3>
            <button onClick={() => setTab("babyeyi")}
              className="text-xs hover:underline flex items-center gap-1 font-medium"
              style={{ color: "#B88A00" }}>
              View all <ChevronRight className="w-3.5 h-3.5"/>
            </button>
          </div>
          <div className="divide-y divide-slate-50">
            {stats.recentBabyeyi.map((b) => (
              <div key={b.id} className="flex items-center gap-3 px-5 py-3 hover:bg-amber-50/40 transition-all">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "linear-gradient(135deg, #FFF3CC, #FFFBE8)" }}>
                  <BookOpen className="w-4 h-4" style={{ color: "#B88A00" }}/>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm">{b.class} — {b.term}</p>
                  <p className="text-[10px] text-slate-400">{b.year} · {b.category}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-slate-800">RWF {(b.totalFee/1000).toFixed(0)}K</p>
                  <Badge status={b.status}/>
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 border-t border-slate-50">
            <button
              onClick={() => setTab("babyeyi")}
              className="w-full flex items-center justify-center gap-2 py-2.5 text-white rounded-xl font-semibold text-sm shadow-lg active:scale-95 transition-all"
              style={{ background: "linear-gradient(135deg, #FEBF10, #B88A00)", boxShadow: "0 4px 15px rgba(254,191,16,0.35)" }}>
              <Zap className="w-4 h-4"/> Create New Babyeyi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}