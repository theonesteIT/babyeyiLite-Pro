import { useMemo, useState } from "react";
import {
  Download, FileText, DollarSign, CheckCircle, AlertTriangle, Target,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart as RePieChart, Pie, Cell, AreaChart, Area
} from "recharts";
import { useActionPlanData } from "../../context/ActionPlanDataContext";
import { fmtCompact } from "../../utils/actionPlanFormatters";
import ActionPlanPageHero from "./ActionPlanPageHero";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg px-3 py-2.5 text-xs font-['Montserrat']">
      <p className="font-bold text-[#000435] mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-medium">{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

export default function ReportsAnalytics({ embedded = false }) {
  const [period, setPeriod] = useState("Current Plan");
  const { activities, totals, departmentUsage, monthlyTimeline } = useActionPlanData();

  const completionPie = useMemo(() => {
    const m = new Map();
    activities.forEach((a) => {
      const k = a.statusLabel || a.status || "Unknown";
      m.set(k, (m.get(k) || 0) + 1);
    });
    const palette = ["#10b981", "#f59e0b", "#ef4444", "#9ca3af", "#6366f1"];
    return Array.from(m.entries()).map(([name, value], i) => ({ name, value, color: palette[i % palette.length] }));
  }, [activities]);

  const deptBudget = useMemo(() => (
    (departmentUsage || []).map((d) => ({
      dept: d.department,
      planned: Number((d.planned || 0) / 1_000_000).toFixed(1),
      used: Number((d.used || 0) / 1_000_000).toFixed(1),
    }))
  ), [departmentUsage]);

  const monthly = useMemo(() => (
    (monthlyTimeline || []).map((m) => ({ month: m.month_label, count: Number(m.count || 0) }))
  ), [monthlyTimeline]);

  const delayedActivities = useMemo(() => activities
    .filter((a) => a.status === "delayed" || a.statusLabel === "Delayed")
    .map((a) => ({
      activity: a.activityName,
      dept: a.department || "—",
      progress: Number(a.progressPct || 0),
      responsible: a.responsibleName || "—",
    })), [activities]);

  return (
    <div className={`${embedded ? 'w-full min-h-0' : 'flex h-screen overflow-hidden'} bg-gray-50 font-['Montserrat']`}>
      <div className={embedded ? "w-full" : "flex-1 flex flex-col min-w-0 overflow-hidden"}>
        {!embedded && <ActionPlanPageHero pageId="ap-reports" />}
        <main className={`${embedded ? "p-4 md:p-6 pb-12 space-y-6" : "flex-1 overflow-y-auto p-4 md:p-6 space-y-6"}`}>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-500 font-semibold">Period:</span>
            {["Current Plan", "Term 1", "Term 2", "Full Year"].map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all
                  ${period === p ? "bg-[#000435] text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-amber-400"}`}>
                {p}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {[
              { label: "Activities Completion", value: `${totals.totalActivities ? Math.round((totals.completedActivities / totals.totalActivities) * 100) : 0}%`, change: `${totals.completedActivities || 0}/${totals.totalActivities || 0}`, icon: CheckCircle, color: "from-emerald-500 to-emerald-600" },
              { label: "Budget Usage", value: `${totals.plannedBudget ? Math.round((totals.usedBudget / totals.plannedBudget) * 100) : 0}%`, change: `${fmtCompact(totals.usedBudget || 0)} / ${fmtCompact(totals.plannedBudget || 0)}`, icon: DollarSign, color: "from-amber-500 to-amber-600" },
              { label: "Delayed Activities", value: `${totals.delayedActivities || 0}`, change: `of ${totals.totalActivities || 0} total`, icon: AlertTriangle, color: "from-red-500 to-red-600" },
              { label: "Avg. Progress", value: `${activities.length ? Math.round(activities.reduce((s, a) => s + Number(a.progressPct || 0), 0) / activities.length) : 0}%`, change: "Across all activities", icon: Target, color: "from-[#000435] to-[#001080]" },
            ].map((stat) => {
              const StatIcon = stat.icon;
              return (
              <div key={stat.label} className="bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-3`}><StatIcon size={18} className="text-white" /></div>
                <p className="text-2xl font-bold text-[#000435]">{stat.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
                <p className="text-xs text-amber-600 font-medium mt-1">{stat.change}</p>
              </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-[#000435] text-sm">Department Budget Usage</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Planned vs Actual (RWF Millions)</p>
                </div>
                <button className="text-xs text-gray-400 hover:text-amber-600 border border-gray-200 px-2 py-1 rounded-lg"><Download size={12} /></button>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={deptBudget} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="dept" tick={{ fontSize: 10, fontFamily: "Montserrat", fill: "#9ca3af" }} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fontFamily: "Montserrat", fill: "#9ca3af" }} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="planned" name="Planned" fill="#e0e7ff" radius={[4,4,0,0]} />
                  <Bar dataKey="used" name="Used" fill="#f59e0b" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="flex gap-4 mt-2 justify-center">
                <div className="flex items-center gap-1.5 text-xs text-gray-500"><div className="w-3 h-3 rounded-sm bg-[#e0e7ff]" />Planned</div>
                <div className="flex items-center gap-1.5 text-xs text-gray-500"><div className="w-3 h-3 rounded-sm bg-amber-400" />Used</div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-[#000435] text-sm">Activity Completion</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Status distribution across all activities</p>
                </div>
                <button className="text-xs text-gray-400 hover:text-amber-600 border border-gray-200 px-2 py-1 rounded-lg"><Download size={12} /></button>
              </div>
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="55%" height={200}>
                  <RePieChart>
                    <Pie data={completionPie} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                      {completionPie.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                  </RePieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {completionPie.map(item => (
                    <div key={item.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
                        <span className="text-xs text-gray-600">{item.name}</span>
                      </div>
                      <span className="text-xs font-bold text-[#000435]">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-[#000435] text-sm">Monthly Activity Timeline</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Planned activities by month</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={monthly} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fontFamily: "Montserrat", fill: "#9ca3af" }} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fontFamily: "Montserrat", fill: "#9ca3af" }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ fontFamily: "Montserrat", fontSize: 12, borderRadius: 12, border: "1px solid #f3f4f6" }} />
                  <Area type="monotone" dataKey="count" name="Activities" stroke="#f59e0b" fill="#fef3c7" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-[#000435] text-sm">Budget vs Actual Cost</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Department planned vs used (M RWF)</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={deptBudget} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="dept" tick={{ fontSize: 10, fontFamily: "Montserrat", fill: "#9ca3af" }} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fontFamily: "Montserrat", fill: "#9ca3af" }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ fontFamily: "Montserrat", fontSize: 12, borderRadius: 12, border: "1px solid #f3f4f6" }} />
                  <Line type="monotone" dataKey="planned" name="Planned" stroke="#000435" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                  <Line type="monotone" dataKey="used" name="Used" stroke="#f59e0b" strokeWidth={2.5} dot={{ fill: "#f59e0b", r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
              <div className="flex gap-4 mt-2 justify-center">
                <div className="flex items-center gap-1.5 text-xs text-gray-500"><div className="w-5 h-0.5 bg-[#000435] opacity-50" style={{borderTop:"2px dashed #000435"}} />Planned</div>
                <div className="flex items-center gap-1.5 text-xs text-gray-500"><div className="w-5 h-0.5 bg-amber-400" />Used</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 md:px-6 py-4 border-b border-red-100 bg-red-50/50 flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-500" />
              <p className="text-sm font-bold text-red-700">Delayed Activities Report</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="bg-gray-50 border-b border-gray-100">
                  {["Activity", "Department", "Progress", "Responsible"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {delayedActivities.map((a, i) => (
                    <tr key={`${a.activity}-${i}`} className="border-b border-gray-50 hover:bg-red-50/30">
                      <td className="px-4 py-3 text-sm font-semibold text-[#000435]">{a.activity}</td>
                      <td className="px-4 py-3"><span className="text-xs bg-gray-100 px-2.5 py-1 rounded-lg font-medium text-gray-600">{a.dept}</span></td>
                      <td className="px-4 py-3 min-w-[140px]">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full"><div className="h-full bg-red-400 rounded-full" style={{ width: `${a.progress}%` }} /></div>
                          <span className="text-xs font-bold text-red-500">{a.progress}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{a.responsible}</td>
                    </tr>
                  ))}
                  {!delayedActivities.length && (
                    <tr><td colSpan={4} className="px-4 py-6 text-sm text-gray-500 text-center">No delayed activities.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}