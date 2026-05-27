import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Target, Activity, AlertTriangle, CheckCircle, Clock, Loader2, RefreshCw, Layers,
} from 'lucide-react';
import { useActionPlanData } from '../../context/ActionPlanDataContext';
import { fetchActionPlanActivities, fetchActionPlans } from '../../services/actionPlanApi';
import ActionPlanPageHero from './ActionPlanPageHero';
import ActivityStatusControls, { normalizeActivityStatus, statusOption } from './ActivityStatusControls';
import { formatDateShort } from '../../utils/actionPlanFormatters';

export default function ActionPlanTracking({ embedded = false }) {
  const { planId, reload: reloadContext } = useActionPlanData();
  const [plans, setPlans] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('All');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [planList, actList] = await Promise.all([
        fetchActionPlans(),
        fetchActionPlanActivities(planId || undefined),
      ]);
      setPlans(planList);
      setActivities(actList);
    } catch (e) {
      setError(e.message || 'Failed to load activities');
      setPlans([]);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  }, [planId]);

  useEffect(() => { load(); }, [load]);

  const handleUpdated = () => {
    load();
    reloadContext?.();
  };

  const grouped = useMemo(() => {
    const byPlan = new Map();
    plans.forEach((p) => byPlan.set(p.id, { plan: p, activities: [] }));
    activities.forEach((a) => {
      const pid = a.actionPlanId || a.action_plan_id;
      if (!byPlan.has(pid)) {
        byPlan.set(pid, {
          plan: { id: pid, title: a.planTitle || `Plan #${pid}`, department: a.department },
          activities: [],
        });
      }
      byPlan.get(pid).activities.push(a);
    });
    return Array.from(byPlan.values()).filter((g) => g.activities.length > 0 || plans.some((p) => p.id === g.plan.id));
  }, [plans, activities]);

  const allActs = activities;
  const stats = [
    { label: 'Total', value: allActs.length, icon: Layers },
    { label: 'Ongoing', value: allActs.filter((a) => normalizeActivityStatus(a.status) === 'ongoing').length, icon: Activity },
    { label: 'Not started', value: allActs.filter((a) => normalizeActivityStatus(a.status) === 'not_started').length, icon: Clock },
    { label: 'Completed', value: allActs.filter((a) => normalizeActivityStatus(a.status) === 'completed').length, icon: CheckCircle },
    { label: 'Delayed', value: allActs.filter((a) => normalizeActivityStatus(a.status) === 'delayed').length, icon: AlertTriangle },
  ];

  const filterKey = filterStatus === 'All' ? null : filterStatus.toLowerCase().replace(/\s+/g, '_');

  const filteredGroups = grouped
    .map((g) => ({
      ...g,
      activities: g.activities.filter((a) => {
        if (!filterKey) return true;
        return normalizeActivityStatus(a.status) === filterKey;
      }),
    }))
    .filter((g) => g.activities.length > 0);

  return (
    <div className={`${embedded ? 'w-full min-h-0' : 'flex h-screen overflow-hidden'} bg-gray-50 font-['Montserrat']`}>
      <div className={embedded ? 'w-full' : 'flex-1 flex flex-col min-w-0 overflow-hidden'}>
        {!embedded && <ActionPlanPageHero pageId="ap-progress" />}

        <main className={`${embedded ? 'p-4 md:p-6 pb-12 space-y-5' : 'flex-1 overflow-y-auto p-4 md:p-6 pb-12 space-y-5'}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-gray-600 max-w-xl">
              Set each activity to <strong>Not started</strong>, <strong>Ongoing</strong> (working on it),{' '}
              <strong>Delayed</strong>, or <strong>Completed</strong>. Progress % is saved automatically.
            </p>
            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="inline-flex items-center gap-2 bg-[#000435] text-white px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-60"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {stats.map(({ label, value, icon: Icon }) => (
              <div key={label} className="bg-white rounded-xl border border-gray-100 p-3 text-center shadow-sm">
                <Icon size={16} className="mx-auto text-amber-500 mb-1" />
                <p className="text-lg font-bold text-[#000435]">{value}</p>
                <p className="text-[10px] uppercase tracking-wide text-gray-400">{label}</p>
              </div>
            ))}
          </div>

          {allActs.some((a) => normalizeActivityStatus(a.status) === 'delayed') && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
              <AlertTriangle size={20} className="text-red-500 shrink-0" />
              <p className="text-sm text-red-700">
                {allActs.filter((a) => normalizeActivityStatus(a.status) === 'delayed').length} delayed
                {' '}— review dates and mark Ongoing or Completed when caught up.
              </p>
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            {['All', 'Not started', 'Ongoing', 'Delayed', 'Completed', 'Cancelled'].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all border
                  ${filterStatus === s ? 'bg-[#000435] text-white border-[#000435]' : 'bg-white text-gray-600 border-gray-200 hover:border-amber-400'}`}
              >
                {s}
              </button>
            ))}
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 size={32} className="animate-spin text-amber-500" />
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
              <Target size={36} className="mx-auto text-gray-300 mb-2" />
              <p className="text-gray-500">No activities match this filter.</p>
              <p className="text-xs text-gray-400 mt-1">Add activities under Activity Planning first.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredGroups.map(({ plan, activities: acts }) => (
                <section key={plan.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-[#000435]/5 to-transparent">
                    <h3 className="font-bold text-[#000435] text-sm">{plan.title}</h3>
                    <p className="text-xs text-gray-400">{acts.length} activities</p>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {acts.map((act) => {
                      const st = statusOption(act.status);
                      const StIcon = st.icon;
                      return (
                        <div key={act.id} className="p-4 md:p-5">
                          <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start gap-2 flex-wrap mb-1">
                                <h4 className="font-semibold text-[#000435]">{act.activityName}</h4>
                                <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${st.pill}`}>
                                  <StIcon size={11} /> {st.label}
                                </span>
                              </div>
                              <p className="text-xs text-gray-500">
                                {act.department || '—'} · {formatDateShort(act.plannedStart)} → {formatDateShort(act.plannedEnd)}
                                {act.responsibleName ? ` · ${act.responsibleName}` : ''}
                              </p>
                            </div>
                            <div className="w-full lg:w-[min(100%,320px)] shrink-0 bg-gray-50/80 rounded-xl border border-gray-100 p-3">
                              <ActivityStatusControls
                                activityId={act.id}
                                status={act.status}
                                progressPct={act.progressPct}
                                plannedStart={act.plannedStart}
                                plannedEnd={act.plannedEnd}
                                statusManualOverride={act.statusManualOverride}
                                timelineDriven={act.timelineDriven}
                                compact
                                onUpdated={handleUpdated}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
