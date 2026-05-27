import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus, Search, Eye, Edit2, Trash2, Menu, X,
  ChevronRight, BookOpen, LayoutDashboard, FileText, Layers,
  DollarSign, TrendingUp, BarChart2, Bell, Settings, Calendar,
  Users, Target, AlertTriangle, CheckCircle, Clock, Filter,
  Download, ArrowUpRight, Cpu, Book, Wrench, Shield, Heart,
  Globe, Award, Leaf, Activity, Loader2
} from "lucide-react";
import { useActionPlanData } from "../../context/ActionPlanDataContext";
import CreateActivityModal from "../../components/CreateActivityModal";
import { fetchActionPlanActivities, deleteActionPlanActivity, fetchActionPlans } from "../../services/actionPlanApi";
import ActionPlanPushBanner from "@/shared/ActionPlanPushBanner";
import api from "../../services/api";
import { fmtMoney, formatDateShort, initials } from "../../utils/actionPlanFormatters";
import ActivityStatusControls from "./ActivityStatusControls";
import ActionPlanPageHero from "./ActionPlanPageHero";

const CATEGORY_ICONS = {
  "Academic Activities": Book,
  "Infrastructure": Wrench,
  "ICT Development": Cpu,
  "Sports Activities": Award,
  "Student Welfare": Heart,
  "Teacher Training": Users,
  "Procurement": DollarSign,
  "Maintenance": Settings,
  "Security": Shield,
  "Health Activities": Activity,
  "Community Outreach": Globe,
  "Discipline Activities": AlertTriangle,
  "Environmental Activities": Leaf,
};

const CATEGORY_COLORS = {
  "Academic Activities": "bg-blue-100 text-blue-700",
  "Infrastructure": "bg-orange-100 text-orange-700",
  "ICT Development": "bg-purple-100 text-purple-700",
  "Sports Activities": "bg-green-100 text-green-700",
  "Student Welfare": "bg-pink-100 text-pink-700",
  "Teacher Training": "bg-indigo-100 text-indigo-700",
  "Procurement": "bg-amber-100 text-amber-700",
  "Maintenance": "bg-gray-100 text-gray-700",
  "Security": "bg-red-100 text-red-700",
  "Health Activities": "bg-emerald-100 text-emerald-700",
  "Community Outreach": "bg-teal-100 text-teal-700",
  "Discipline Activities": "bg-rose-100 text-rose-700",
  "Environmental Activities": "bg-lime-100 text-lime-700",
};

const STATUS_CONFIG = {
  "Not Started": { color: "bg-gray-100 text-gray-600", dot: "bg-gray-400" },
  Ongoing: { color: "bg-amber-100 text-amber-700", dot: "bg-amber-500" },
  Delayed: { color: "bg-red-100 text-red-600", dot: "bg-red-500" },
  Completed: { color: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
  Cancelled: { color: "bg-gray-200 text-gray-500", dot: "bg-gray-400" },
};

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard" },
  { icon: FileText, label: "Action Plans" },
  { icon: Layers, label: "Activities", active: true },
  { icon: DollarSign, label: "Budget" },
  { icon: TrendingUp, label: "Tracking" },
  { icon: BarChart2, label: "Reports" },
  { icon: Bell, label: "Notifications" },
  { icon: Calendar, label: "Calendar" },
];

function Sidebar({ open, onClose }) {
  return (
    <>
      {open && <div className="fixed inset-0 bg-black/40 z-20 md:hidden" onClick={onClose} />}
      <aside className={`fixed top-0 left-0 h-full w-64 bg-[#000435] z-30 flex flex-col transition-transform duration-300
        ${open ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 md:static md:z-auto`}>
        <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10">
          <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center">
            <BookOpen size={18} className="text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm font-['Montserrat']">SchoolPlan</p>
            <p className="text-white/40 text-xs">Management System</p>
          </div>
          <button type="button" onClick={onClose} className="ml-auto md:hidden text-white/60"><X size={18} /></button>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const NavIcon = item.icon;
            return (
            <button key={item.label} type="button" className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-['Montserrat'] font-medium transition-all
              ${item.active ? "bg-amber-500 text-white shadow-lg shadow-amber-500/30" : "text-white/60 hover:bg-white/10 hover:text-white"}`}>
              <NavIcon size={18} />{item.label}
            </button>
            );
          })}
        </nav>
      </aside>
    </>
  );
}

export default function ActivityPlanning({ embedded = false }) {
  const { options, planId, reload } = useActionPlanData();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("All");
  const [activities, setActivities] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [acts, planList] = await Promise.all([
        fetchActionPlanActivities(),
        fetchActionPlans(),
      ]);
      setActivities(acts);
      setPlans(planList);
    } catch (e) {
      setError(e.message || "Failed to load activities");
      setActivities([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const categories = useMemo(() => {
    const fromOpts = options?.activityCategories || Object.keys(CATEGORY_ICONS);
    const fromData = activities.map((a) => a.category).filter(Boolean);
    return ["All", ...new Set([...fromOpts, ...fromData])];
  }, [options?.activityCategories, activities]);

  const filtered = useMemo(() => activities.filter((a) => {
    const name = (a.activityName || "").toLowerCase();
    const dept = (a.department || "").toLowerCase();
    const q = search.toLowerCase();
    return (filterCat === "All" || a.category === filterCat) && (name.includes(q) || dept.includes(q));
  }), [activities, filterCat, search]);

  const stats = useMemo(() => [
    { label: "Total Activities", value: activities.length, icon: Layers, color: "from-[#000435] to-[#001080]" },
    { label: "Ongoing", value: activities.filter((a) => a.status === "ongoing" || a.statusLabel === "Ongoing").length, icon: Clock, color: "from-amber-500 to-amber-600" },
    { label: "Completed", value: activities.filter((a) => a.status === "completed" || a.statusLabel === "Completed").length, icon: CheckCircle, color: "from-emerald-500 to-emerald-600" },
    { label: "Delayed", value: activities.filter((a) => a.status === "delayed" || a.statusLabel === "Delayed").length, icon: AlertTriangle, color: "from-red-500 to-red-600" },
  ], [activities]);

  const handleCreated = () => {
    load();
    reload?.();
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await deleteActionPlanActivity(deleteId);
      setDeleteId(null);
      await load();
      reload?.();
    } catch (e) {
      setError(e.message || "Failed to delete activity");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className={`${embedded ? 'w-full min-h-0' : 'flex h-screen overflow-hidden'} bg-gray-50 font-['Montserrat']`}>
      {!embedded && <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />}

      <div className={embedded ? "w-full" : "flex-1 flex flex-col min-w-0 overflow-hidden"}>
        {!embedded && (
          <ActionPlanPageHero
            pageId="ap-activities"
            headerRight={(
              <button type="button" onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 rounded-xl border border-[#FEBF10]/35 bg-[#FEBF10]/15 px-4 py-2.5 text-[10px] font-medium uppercase tracking-widest text-white hover:bg-[#FEBF10]/25 transition-all">
                <Plus size={16} /> Add Activity
              </button>
            )}
          />
        )}

        <main className={`${embedded ? "p-4 md:p-6 pb-12 space-y-6" : "flex-1 overflow-y-auto p-4 md:p-6 space-y-6"}`}>
          {embedded && (
            <ActionPlanPushBanner api={api} className="mb-2" />
          )}

          {embedded && (
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-gray-500">{activities.length} activities across all plans</p>
              <button type="button" onClick={() => setShowCreate(true)} className="flex items-center gap-2 bg-[#000435] hover:bg-[#000870] text-white px-4 py-2 rounded-xl text-sm font-semibold">
                <Plus size={16} /> Add Activity
              </button>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {stats.map((stat) => {
              const StatIcon = stat.icon;
              return (
              <div key={stat.label} className="bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-gray-100">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-3`}>
                  <StatIcon size={18} className="text-white" />
                </div>
                <p className="text-2xl font-bold text-[#000435]">{loading ? "—" : stat.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
              </div>
              );
            })}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Filter by Category</p>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => {
                const Icon = CATEGORY_ICONS[cat];
                return (
                  <button key={cat} type="button" onClick={() => setFilterCat(cat)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all
                      ${filterCat === cat ? "bg-[#000435] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                    {Icon && <Icon size={12} />}{cat}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-amber-500"
                placeholder="Search activities..." />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 size={32} className="animate-spin text-amber-500" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map((act) => {
                const sc = STATUS_CONFIG[act.statusLabel] || STATUS_CONFIG["Not Started"];
                const Icon = CATEGORY_ICONS[act.category] || Target;
                const progress = Number(act.progressPct || 0);
                return (
                  <div key={act.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden">
                    <div className="bg-gradient-to-r from-[#000435] to-[#001580] px-4 py-3 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-white/20 text-white">
                        <Icon size={11} />{act.category || "Activity"}
                      </span>
                      <span className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${sc.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />{act.statusLabel}
                      </span>
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-[#000435] text-sm mb-1">{act.activityName}</h3>
                      <p className="text-xs text-gray-400 mb-3 line-clamp-1">{act.planTitle || "—"}</p>
                      <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                        <div className="bg-gray-50 rounded-lg p-2">
                          <p className="text-gray-400">Department</p>
                          <p className="font-semibold text-[#000435] mt-0.5">{act.department || "—"}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-2">
                          <p className="text-gray-400">Cost (RWF)</p>
                          <p className="font-semibold text-[#000435] mt-0.5">{fmtMoney(act.estimatedCost)}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-2 col-span-2">
                          <p className="text-gray-400">Timeline</p>
                          <p className="font-semibold text-[#000435] mt-0.5">{formatDateShort(act.plannedStart)} → {formatDateShort(act.plannedEnd)}</p>
                        </div>
                      </div>
                      <div className="mb-3 pt-2 border-t border-gray-100">
                        <ActivityStatusControls
                          activityId={act.id}
                          status={act.status}
                          progressPct={act.progressPct}
                          plannedStart={act.plannedStart}
                          plannedEnd={act.plannedEnd}
                          statusManualOverride={act.statusManualOverride}
                          timelineDriven={act.timelineDriven}
                          compact
                          onUpdated={() => { load(); reload?.(); }}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-[#000435] flex items-center justify-center text-white text-xs font-bold">
                            {initials(act.responsibleName)}
                          </div>
                          <span className="text-xs text-gray-500 truncate max-w-[100px]">{act.responsibleName || "—"}</span>
                        </div>
                        <button type="button" onClick={() => setDeleteId(act.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400" title="Delete">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
              <Layers size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">No activities found</p>
              <button type="button" onClick={() => setShowCreate(true)} className="mt-3 text-sm text-amber-600 font-semibold hover:underline">Add your first activity</button>
            </div>
          )}
        </main>
      </div>

      <CreateActivityModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        options={options}
        plans={plans}
        defaultPlanId={planId}
        onCreated={handleCreated}
      />

      {deleteId && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <p className="font-bold text-[#000435] mb-2">Delete activity?</p>
            <p className="text-sm text-gray-500 mb-4">This cannot be undone.</p>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
              <button type="button" disabled={deleting} onClick={confirmDelete} className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg disabled:opacity-60">
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
