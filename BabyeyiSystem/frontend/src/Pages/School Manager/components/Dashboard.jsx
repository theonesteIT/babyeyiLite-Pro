// ================================================================
// Dashboard.jsx — Navy + amber (School Manager shell)
// ================================================================

import { useState, useEffect } from "react";
import { BABYEYI_FONT_STACK } from "../../../theme/babyeyiDashboardTheme";
import {
  FileText, CheckCircle, Clock, XCircle, AlertTriangle, TrendingUp,
  Activity, BarChart3, ArrowUpRight, ChevronRight, Building2,
  DollarSign, BookOpen, Award, Zap
} from "lucide-react";
import { StatCard, LineAreaChart, DonutChart, HBarChart, ModernBarChart, Badge } from "../components/UI";

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : "http://localhost:5100/api";

function formatSchoolOwnershipLabel(raw) {
  const o = String(raw || "").trim();
  if (!o) return "";
  const l = o.toLowerCase();
  if (l.includes("aided")) return "Government Aided";
  if (l === "private") return "Private";
  if (l.includes("government")) return "Public (Government)";
  return o;
}

export default function DashboardPage({ setTab, toast, t, session }) {
  const [loading, setLoading] = useState(true);
  const [stats,   setStats]   = useState(null);
  const [schoolMeta, setSchoolMeta] = useState(null);

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
          { label: "Tuition",    value: 70, color: "#F5B800" },
          { label: "Materials",  value: 15, color: "#FFD84D" },
          { label: "Activities", value: 10, color: "#D99A00" },
          { label: "Other",      value:  5, color: "#8A6500" },
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

  useEffect(() => {
    if (!schoolId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/babyeyi/school-info`, { credentials: "include" });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || json.success === false || cancelled) return;
        const s = json.data?.school;
        if (s) {
          setSchoolMeta({
            ownership: s.ownership || "",
            category:  s.category  || "",
          });
        }
      } catch (_) {
        if (!cancelled) setSchoolMeta(null);
      }
    })();
    return () => { cancelled = true; };
  }, [schoolId]);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-10 h-10 rounded-full border-4 border-amber-200 animate-spin" style={{ borderTopColor: "#F5B800" }}/>
    </div>
  );

  if (!stats) return null;

  return (
    <div className="space-y-5 anim" style={{ fontFamily: BABYEYI_FONT_STACK }}>

      {/* Hero — light card on white page (aligned with Babyeyi wizard gold) */}
      <div
        className="relative overflow-hidden rounded-3xl p-6 sm:p-8 shadow-sm"
        style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          boxShadow: "0 1px 3px rgba(15, 23, 42, 0.06)",
        }}
      >
        <div
          className="pointer-events-none absolute -top-24 -right-16 h-64 w-64 rounded-full opacity-[0.12]"
          style={{ background: "radial-gradient(circle, #F5B800 0%, transparent 70%)" }}
        />

        <div className="relative">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <time
              dateTime={new Date().toISOString().slice(0, 10)}
              className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[11px] font-semibold tracking-wide sm:text-xs"
              style={{
                background: "#fffbeb",
                border: "1px solid #fde68a",
                color: "#92400e",
                letterSpacing: "0.02em",
              }}
            >
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{
                  background: "#F5B800",
                  boxShadow: "0 0 0 2px rgba(245,184,0,0.25)",
                }}
              />
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </time>
          </div>

          <div className="mb-5 max-w-2xl">
            <h2
              className="text-2xl font-black tracking-tight sm:text-3xl sm:leading-tight text-slate-900"
              style={{
                fontFamily: BABYEYI_FONT_STACK,
                letterSpacing: "-0.03em",
              }}
            >
              School Babyeyi Portal
            </h2>
            <div
              className="mt-3 h-1 w-14 rounded-full sm:w-16"
              style={{ background: "linear-gradient(90deg, #F5B800, rgba(245,184,0,0.35))" }}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {schoolMeta?.ownership && (
              <span
                className="flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold bg-slate-50 text-slate-700"
                style={{ borderColor: "#e2e8f0" }}
              >
                <Building2 className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                {formatSchoolOwnershipLabel(schoolMeta.ownership)}
              </span>
            )}
            <span
              className="flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold bg-amber-50 text-amber-950"
              style={{ borderColor: "#fde68a" }}
            >
              <FileText className="h-3.5 w-3.5 shrink-0 text-amber-600" /> {stats.total} Babyeyi
            </span>
            <span
              className="flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold bg-white text-slate-700"
              style={{ borderColor: "#e2e8f0" }}
            >
              <CheckCircle className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
              {stats.complianceRate}% Compliant
            </span>
            {stats.exceeded > 0 && (
              <span
                className="flex animate-pulse items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold bg-amber-50 text-amber-950"
                style={{ borderColor: "#fbbf24" }}
              >
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                {stats.exceeded} Exceed NESA Limit
              </span>
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { icon: FileText,      label: t?.totalBabyeyi ?? "Total Babyeyi", value: stats.total,    sub: "All terms",       trend: "+2", alert: false },
          { icon: CheckCircle,   label: t?.approved     ?? "Approved",      value: stats.approved, sub: "This year",       trend: null, alert: false },
          { icon: Clock,         label: t?.pending      ?? "Pending",        value: stats.pending,  sub: "Awaiting review", trend: null, alert: stats.pending > 0 },
          { icon: XCircle,       label: t?.rejected     ?? "Rejected",       value: stats.rejected, sub: "This year",       trend: null, alert: false },
          { icon: AlertTriangle, label: t?.alerts       ?? "Alerts",         value: stats.exceeded, sub: "NESA violations",  trend: null, alert: stats.exceeded > 0 },
        ].map((card, i) => (
          <button key={i} onClick={() => setTab("babyeyi")}
            className="text-left rounded-2xl p-4 border transition-all hover:shadow-lg active:scale-95"
            style={{
              background: card.alert ? "linear-gradient(135deg, #fff7e0, #fffbe8)" : "#fff",
              borderColor: card.alert ? "#FEBF10" : "#e2e8f0",
              fontFamily: BABYEYI_FONT_STACK,
            }}>
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: card.alert ? "#FEBF10" : "#FFF3CC" }}>
                <card.icon className="w-4 h-4" style={{ color: card.alert ? "#fff" : "#B88A00" }}/>
              </div>
              {card.trend && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-lg"
                  style={{ background: "#FFF3CC", color: "#B88A00" }}>{card.trend}</span>
              )}
            </div>
            <p className="text-2xl font-black" style={{ color: "#1A1200" }}>{card.value}</p>
            <p className="text-[10px] font-semibold mt-0.5" style={{ color: "#B88A00" }}>{card.label}</p>
            <p className="text-[9px] mt-0.5" style={{ color: "#94a3b8" }}>{card.sub}</p>
          </button>
        ))}
      </div>

      {/* NESA Alert */}
      {stats.exceeded > 0 && (
        <div className="rounded-2xl p-4 text-white shadow-lg flex items-center gap-4 slide-up"
          style={{ background: "linear-gradient(135deg, #dc2626, #ef4444)" }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "rgba(255,255,255,0.2)" }}>
            <AlertTriangle className="w-5 h-5"/>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-black text-sm">⚠️ NESA Limit Violation Detected</h3>
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
            <p className="text-sm font-black" style={{ color: "#B88A00" }}>{stats.complianceRate}%</p>
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
            <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm" style={{ fontFamily: BABYEYI_FONT_STACK }}>
              <Award className="w-4 h-4 text-amber-500"/> Recent Babyeyi
            </h3>
            <button onClick={() => setTab("babyeyi")}
              className="text-xs hover:underline flex items-center gap-1 font-semibold"
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
                  <p className="font-bold text-slate-800 text-sm">{b.class} — {b.term}</p>
                  <p className="text-[10px] text-slate-400">{b.year} · {b.category}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-black text-slate-800">RWF {(b.totalFee/1000).toFixed(0)}K</p>
                  <Badge status={b.status}/>
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 border-t border-slate-50">
            <button
              onClick={() => setTab("babyeyi")}
              className="w-full flex items-center justify-center gap-2 py-2.5 text-white rounded-xl font-bold text-sm shadow-lg active:scale-95 transition-all"
              style={{ background: "linear-gradient(135deg, #FEBF10, #B88A00)", boxShadow: "0 4px 15px rgba(254,191,16,0.35)" }}>
              <Zap className="w-4 h-4"/> Create New Babyeyi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}