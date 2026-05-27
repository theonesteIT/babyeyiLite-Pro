import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus, Search, Eye, Edit2, Trash2, MoreVertical, FileText,
  Download, Loader2, AlertTriangle, X,
  ClipboardList, Wallet, Target, Clock, CheckCircle2, AlertCircle,
} from "lucide-react";
import { useActionPlanData } from "../../context/ActionPlanDataContext";
import CreateActionPlanModal from "../../components/CreateActionPlanModal";
import ActionPlanViewModal from "../../components/ActionPlanViewModal";
import { fetchActionPlans, deleteActionPlan } from "../../services/actionPlanApi";
import ActionPlanPageHero from "./ActionPlanPageHero";
import ActionPlanKpiStrip from "./ActionPlanKpiStrip";

const STATUS_CONFIG = {
  Draft:     { color: "bg-gray-100 text-gray-600",       dot: "bg-gray-400" },
  Pending:   { color: "bg-amber-100 text-amber-700",     dot: "bg-amber-500" },
  Approved:  { color: "bg-blue-100 text-blue-700",       dot: "bg-blue-500" },
  Ongoing:   { color: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
  Completed: { color: "bg-purple-100 text-purple-700",   dot: "bg-purple-500" },
  Cancelled: { color: "bg-red-100 text-red-700",         dot: "bg-red-500" },
};

const PRIORITY_CONFIG = {
  Low:      "text-gray-500 bg-gray-50 border border-gray-200",
  Medium:   "text-amber-600 bg-amber-50 border border-amber-200",
  High:     "text-orange-600 bg-orange-50 border border-orange-200",
  Critical: "text-red-600 bg-red-50 border border-red-200",
};

const FILTER_STATUSES = ["All", "Ongoing", "Approved", "Pending", "Draft", "Completed", "Cancelled"];

const fmtMoney = (n) => new Intl.NumberFormat("en-RW", { maximumFractionDigits: 0 }).format(Number(n) || 0);

const formatDateShort = (d) => {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString("en-RW", { month: "short", day: "numeric" });
};

const planProgress = (plan) => {
  if (plan.statusLabel === "Completed") return 100;
  if (!plan.activityCount) return 0;
  return Math.round((Number(plan.completedActivities || 0) / plan.activityCount) * 100);
};

const initials = (name) =>
  (name || "?").split(" ").filter(Boolean).map((n) => n[0]).join("").slice(0, 2).toUpperCase();

function ActionMenu({ onView, onEdit, onDelete, onClose }) {
  return (
    <div className="absolute right-0 top-8 bg-white rounded-xl shadow-xl border border-gray-100 z-20 py-1.5 w-44">
      <button type="button" onClick={() => { onView(); onClose(); }} className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 font-['Montserrat']">
        <Eye size={14} className="text-blue-500" /> View Details
      </button>
      <button type="button" onClick={() => { onEdit(); onClose(); }} className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 font-['Montserrat']">
        <Edit2 size={14} className="text-amber-500" /> Edit Plan
      </button>
      <div className="h-px bg-gray-100 my-1" />
      <button type="button" onClick={() => { onDelete(); onClose(); }} className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-500 hover:bg-red-50 font-['Montserrat']">
        <Trash2 size={14} /> Delete
      </button>
    </div>
  );
}

function PlanRow({ plan, openMenu, setOpenMenu, onView, onEdit, onDelete }) {
  const sc = STATUS_CONFIG[plan.statusLabel] || STATUS_CONFIG.Draft;
  const pc = PRIORITY_CONFIG[plan.priorityLevel] || PRIORITY_CONFIG.Medium;
  const progress = planProgress(plan);

  return (
    <tr className="hover:bg-amber-50/30 transition-colors group">
      <td className="px-4 py-4">
        <p className="font-semibold text-[#000435] text-sm leading-tight max-w-[200px]">{plan.title}</p>
        <p className="text-xs text-gray-400 mt-0.5">{formatDateShort(plan.startDate)} → {formatDateShort(plan.endDate)}</p>
      </td>
      <td className="px-4 py-4">
        <span className="text-xs text-gray-600">{plan.term}<br />{plan.academicYear}</span>
      </td>
      <td className="px-4 py-4">
        <span className="text-xs font-medium text-gray-700 bg-gray-100 px-2.5 py-1 rounded-lg">{plan.department}</span>
      </td>
      <td className="px-4 py-4">
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${pc}`}>{plan.priorityLevel}</span>
      </td>
      <td className="px-4 py-4">
        <span className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full w-fit ${sc.color}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />{plan.statusLabel}
        </span>
      </td>
      <td className="px-4 py-4">
        <p className="text-sm font-semibold text-[#000435]">{fmtMoney(plan.estimatedBudget)}</p>
        <p className="text-xs text-gray-400">Used: {fmtMoney(plan.usedBudget)}</p>
      </td>
      <td className="px-4 py-4 min-w-[120px]">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-amber-500 rounded-full" style={{ width: `${progress}%` }} />
          </div>
          <span className="text-xs font-semibold text-gray-600 w-8 text-right">{progress}%</span>
        </div>
      </td>
      <td className="px-4 py-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-[#000435] flex items-center justify-center text-white text-xs font-bold">
            {initials(plan.responsibleName)}
          </div>
          <span className="text-xs text-gray-600 hidden xl:inline">{plan.responsibleName || "—"}</span>
        </div>
      </td>
      <td className="px-4 py-4">
        <div className="relative flex items-center gap-1">
          <button type="button" onClick={() => onView(plan)} className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-500 transition-colors"><Eye size={15} /></button>
          <button type="button" onClick={() => onEdit(plan)} className="p-1.5 hover:bg-amber-50 rounded-lg text-amber-500 transition-colors"><Edit2 size={15} /></button>
          <button type="button" onClick={() => onDelete(plan)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400 transition-colors"><Trash2 size={15} /></button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenMenu(openMenu === plan.id ? null : plan.id)}
              className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors"
            >
              <MoreVertical size={15} />
            </button>
            {openMenu === plan.id && (
              <ActionMenu
                onView={() => onView(plan)}
                onEdit={() => onEdit(plan)}
                onDelete={() => onDelete(plan)}
                onClose={() => setOpenMenu(null)}
              />
            )}
          </div>
        </div>
      </td>
    </tr>
  );
}

function PlanCard({ plan, openMenu, setOpenMenu, onView, onEdit, onDelete }) {
  const sc = STATUS_CONFIG[plan.statusLabel] || STATUS_CONFIG.Draft;
  const pc = PRIORITY_CONFIG[plan.priorityLevel] || PRIORITY_CONFIG.Medium;
  const progress = planProgress(plan);

  return (
    <div className="p-4 hover:bg-gray-50">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 pr-2">
          <p className="font-semibold text-[#000435] text-sm leading-tight">{plan.title}</p>
          <p className="text-xs text-gray-400 mt-0.5">{plan.department} · {plan.term}</p>
        </div>
        <span className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${sc.color}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />{plan.statusLabel}
        </span>
      </div>
      <div className="flex items-center gap-2 mb-3">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg ${pc}`}>{plan.priorityLevel}</span>
        <span className="text-xs text-gray-500">{formatDateShort(plan.startDate)} → {formatDateShort(plan.endDate)}</span>
      </div>
      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-500">Progress</span>
          <span className="font-semibold text-[#000435]">{progress}%</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-amber-500 rounded-full" style={{ width: `${progress}%` }} />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500">Budget</p>
          <p className="text-sm font-bold text-[#000435]">{fmtMoney(plan.estimatedBudget)} RWF</p>
        </div>
        <div className="flex gap-1">
          <button type="button" onClick={() => onView(plan)} className="p-2 hover:bg-blue-50 rounded-lg text-blue-500"><Eye size={16} /></button>
          <button type="button" onClick={() => onEdit(plan)} className="p-2 hover:bg-amber-50 rounded-lg text-amber-500"><Edit2 size={16} /></button>
          <button type="button" onClick={() => onDelete(plan)} className="p-2 hover:bg-red-50 rounded-lg text-red-400"><Trash2 size={16} /></button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenMenu(openMenu === plan.id ? null : plan.id)}
              className="p-2 hover:bg-gray-100 rounded-lg text-gray-400"
            >
              <MoreVertical size={16} />
            </button>
            {openMenu === plan.id && (
              <ActionMenu
                onView={() => onView(plan)}
                onEdit={() => onEdit(plan)}
                onDelete={() => onDelete(plan)}
                onClose={() => setOpenMenu(null)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ActionPlan({
  embedded = false,
  createModalOpen,
  onCreateModalOpenChange,
}) {
  const { options, totals, reload: reloadContext, setPlanId, planId } = useActionPlanData();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreateInternal, setShowCreateInternal] = useState(false);
  const [viewPlan, setViewPlan] = useState(null);
  const [editPlan, setEditPlan] = useState(null);
  const [deletePlan, setDeletePlan] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [openMenu, setOpenMenu] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");

  const showCreate = createModalOpen ?? showCreateInternal;
  const setShowCreate = onCreateModalOpenChange ?? setShowCreateInternal;

  const loadPlans = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchActionPlans();
      setPlans(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || "Failed to load action plans");
      setPlans([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const fmtRwf = (n) => `${fmtMoney(n)} RWF`;

  const kpiTiles = useMemo(() => [
    { label: 'Total plans', value: totals?.totalPlans ?? plans.length, icon: ClipboardList },
    { label: 'Activities', value: totals?.totalActivities ?? '—', icon: Target },
    { label: 'Planned budget', value: fmtRwf(totals?.plannedBudget ?? plans.reduce((s, p) => s + (Number(p.estimatedBudget) || 0), 0)), icon: Wallet },
    { label: 'Used budget', value: fmtRwf(totals?.usedBudget ?? 0), icon: Wallet },
    { label: 'Remaining', value: fmtRwf(totals?.remainingBudget ?? 0), icon: Wallet },
    { label: 'Completed', value: totals?.completedActivities ?? plans.filter((p) => p.statusLabel === 'Completed').length, icon: CheckCircle2 },
    { label: 'Ongoing', value: totals?.ongoingActivities ?? plans.filter((p) => p.statusLabel === 'Ongoing').length, icon: Clock },
    { label: 'Delayed', value: totals?.delayedActivities ?? 0, icon: AlertCircle },
  ], [plans, totals]);

  const filtered = useMemo(() => plans.filter((p) => {
    const q = search.trim().toLowerCase();
    const matchesSearch = !q
      || p.title?.toLowerCase().includes(q)
      || p.department?.toLowerCase().includes(q)
      || p.term?.toLowerCase().includes(q);
    const matchesStatus = filterStatus === "All" || p.statusLabel === filterStatus;
    return matchesSearch && matchesStatus;
  }), [plans, search, filterStatus]);

  const handleCreated = (plan) => {
    if (plan?.id) setPlanId(plan.id);
    loadPlans();
    reloadContext();
  };

  const handleUpdated = (plan) => {
    if (plan?.id) setPlanId(plan.id);
    setEditPlan(null);
    loadPlans();
    reloadContext();
  };

  const handleView = (plan) => {
    setOpenMenu(null);
    setViewPlan(plan);
  };

  const handleEdit = (plan) => {
    setOpenMenu(null);
    setViewPlan(null);
    setEditPlan(plan);
  };

  const handleDelete = (plan) => {
    setOpenMenu(null);
    setActionError("");
    setDeletePlan(plan);
  };

  const confirmDelete = async () => {
    if (!deletePlan?.id) return;
    setDeleteLoading(true);
    setActionError("");
    try {
      await deleteActionPlan(deletePlan.id);
      if (deletePlan.id === planId) setPlanId(null);
      setDeletePlan(null);
      loadPlans();
      reloadContext();
    } catch (e) {
      setActionError(e.message || "Failed to delete action plan");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className={`${embedded ? 'w-full min-h-0' : 'flex h-screen overflow-hidden'} bg-gray-50 font-['Montserrat']`}>
      <div className={embedded ? "w-full" : "flex-1 flex flex-col min-w-0 overflow-hidden"}>
        {!embedded && (
          <ActionPlanPageHero
            pageId="ap-create"
            headerRight={(
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-[#FEBF10]/35 bg-[#FEBF10]/15 px-4 py-2.5 text-[10px] font-medium uppercase tracking-widest text-white hover:bg-[#FEBF10]/25 transition-all"
              >
                <Plus size={16} /> New Plan
              </button>
            )}
          />
        )}

        <main className={`${embedded ? "px-4 md:px-6 pb-12 space-y-6" : "flex-1 overflow-y-auto px-4 md:px-6 pb-12 space-y-6"}`}>
          <div className={`max-w-[1600px] mx-auto w-full ${embedded ? '-mt-4 sm:-mt-5 pt-2 relative z-20' : 'mb-2'}`}>
            <ActionPlanKpiStrip
              tiles={kpiTiles}
              gridClassName="grid-cols-2 sm:grid-cols-4 xl:grid-cols-8"
            />
          </div>

          <div className="max-w-[1600px] mx-auto w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                placeholder="Search action plans..."
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {FILTER_STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setFilterStatus(s)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap
                    ${filterStatus === s ? "bg-[#000435] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                >
                  {s}
                </button>
              ))}
            </div>
            {embedded && (
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="flex items-center justify-center gap-2 bg-[#000435] hover:bg-[#000870] text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap"
              >
                <Plus size={16} /> New Plan
              </button>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-700">{error}</p>
                <button type="button" onClick={loadPlans} className="text-xs text-red-600 underline mt-1">Retry</button>
              </div>
            </div>
          )}

          <div className="max-w-[1600px] mx-auto w-full bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 md:px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <p className="text-sm font-semibold text-[#000435]">{filtered.length} Action Plans</p>
              <button
                type="button"
                onClick={loadPlans}
                disabled={loading}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-amber-600 px-3 py-1.5 border border-gray-200 rounded-lg hover:border-amber-300 disabled:opacity-50"
              >
                {loading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                Refresh
              </button>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <Loader2 size={32} className="animate-spin text-amber-500 mb-3" />
                <p className="text-sm">Loading action plans...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <FileText size={36} className="mb-3 opacity-40" />
                <p className="text-sm font-medium text-gray-600">No action plans found</p>
                <p className="text-xs mt-1 mb-4">Create your first action plan to get started</p>
                <button
                  type="button"
                  onClick={() => setShowCreate(true)}
                  className="flex items-center gap-2 bg-[#000435] text-white px-4 py-2.5 rounded-xl text-sm font-semibold"
                >
                  <Plus size={16} /> Create Action Plan
                </button>
              </div>
            ) : (
              <>
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        {["Plan Title", "Term / Year", "Department", "Priority", "Status", "Budget (RWF)", "Progress", "Responsible", "Actions"].map((h) => (
                          <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filtered.map((plan) => (
                        <PlanRow
                          key={plan.id}
                          plan={plan}
                          openMenu={openMenu}
                          setOpenMenu={setOpenMenu}
                          onView={handleView}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="lg:hidden divide-y divide-gray-100">
                  {filtered.map((plan) => (
                    <PlanCard
                      key={plan.id}
                      plan={plan}
                      openMenu={openMenu}
                      setOpenMenu={setOpenMenu}
                      onView={handleView}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </>
            )}

            <div className="px-4 md:px-6 py-4 border-t border-gray-100">
              <p className="text-xs text-gray-500">Showing {filtered.length} of {plans.length} plans</p>
            </div>
          </div>
        </main>
      </div>

      <CreateActionPlanModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        options={options}
        onCreated={handleCreated}
      />

      <CreateActionPlanModal
        open={Boolean(editPlan)}
        onClose={() => setEditPlan(null)}
        options={options}
        plan={editPlan}
        onCreated={handleUpdated}
      />

      <ActionPlanViewModal
        open={Boolean(viewPlan)}
        onClose={() => setViewPlan(null)}
        plan={viewPlan}
        onEdit={handleEdit}
      />

      {deletePlan && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close"
            onClick={() => !deleteLoading && setDeletePlan(null)}
            className="absolute inset-0 bg-[#000435]/55 border-none cursor-pointer"
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 font-['Montserrat']">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h3 className="text-lg font-bold text-[#000435]">Delete action plan?</h3>
                <p className="text-sm text-gray-500 mt-1">
                  This will remove <span className="font-semibold text-gray-700">{deletePlan.title}</span> and its linked activities.
                </p>
              </div>
              <button type="button" onClick={() => !deleteLoading && setDeletePlan(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            {actionError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">{actionError}</p>
            )}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                disabled={deleteLoading}
                onClick={() => setDeletePlan(null)}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteLoading}
                onClick={confirmDelete}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 flex items-center gap-2"
              >
                {deleteLoading ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                Delete plan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
