import { useEffect, useState } from 'react';
import {
  Pause, Activity, AlertTriangle, CheckCircle2, Ban, Loader2,
} from 'lucide-react';
import { updateActionPlanActivity } from '../../services/actionPlanApi';
import { computeActivityTimeline, isTimelineDriven } from '../../utils/activityTimeline';

export const ACTIVITY_STATUS_OPTIONS = [
  {
    value: 'not_started',
    label: 'Not started',
    short: 'Not started',
    pill: 'bg-slate-100 text-slate-700 border-slate-200',
    active: 'bg-slate-600 text-white border-slate-600',
    icon: Pause,
  },
  {
    value: 'ongoing',
    label: 'Ongoing',
    short: 'Working on it',
    pill: 'bg-amber-100 text-amber-800 border-amber-200',
    active: 'bg-amber-500 text-white border-amber-500',
    icon: Activity,
  },
  {
    value: 'delayed',
    label: 'Delayed',
    short: 'Delayed',
    pill: 'bg-red-100 text-red-700 border-red-200',
    active: 'bg-red-500 text-white border-red-500',
    icon: AlertTriangle,
  },
  {
    value: 'completed',
    label: 'Completed',
    short: 'Completed',
    pill: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    active: 'bg-emerald-600 text-white border-emerald-600',
    icon: CheckCircle2,
  },
  {
    value: 'cancelled',
    label: 'Cancelled',
    short: 'Cancelled',
    pill: 'bg-gray-100 text-gray-500 border-gray-200',
    active: 'bg-gray-500 text-white border-gray-500',
    icon: Ban,
  },
];

export function normalizeActivityStatus(raw) {
  const s = String(raw || 'not_started').toLowerCase().replace(/\s+/g, '_');
  if (s === 'not started') return 'not_started';
  if (ACTIVITY_STATUS_OPTIONS.some((o) => o.value === s)) return s;
  return 'not_started';
}

export function statusOption(value) {
  return ACTIVITY_STATUS_OPTIONS.find((o) => o.value === normalizeActivityStatus(value)) || ACTIVITY_STATUS_OPTIONS[0];
}

/**
 * Status pills + progress % — saves via PATCH /accountant/action-plan-activities/:id
 */
export default function ActivityStatusControls({
  activityId,
  status: statusProp,
  progressPct: progressProp = 0,
  plannedStart,
  plannedEnd,
  statusManualOverride = false,
  timelineDriven: timelineDrivenProp,
  compact = false,
  onUpdated,
}) {
  const [status, setStatus] = useState(() => normalizeActivityStatus(statusProp));
  const [progress, setProgress] = useState(() => Math.min(100, Math.max(0, Number(progressProp) || 0)));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    setStatus(normalizeActivityStatus(statusProp));
    setProgress(Math.min(100, Math.max(0, Number(progressProp) || 0)));
  }, [statusProp, progressProp, activityId]);

  const current = statusOption(status);

  const scheduleDriven = timelineDrivenProp ?? isTimelineDriven({
    plannedStart,
    plannedEnd,
    statusManualOverride,
    status: statusProp,
  });

  const scheduledToday = scheduleDriven && plannedStart && plannedEnd
    ? computeActivityTimeline(plannedStart, plannedEnd, new Date(), { manualOverride: false })
    : null;

  const apply = async (nextStatus, nextProgress) => {
    const st = normalizeActivityStatus(nextStatus);
    let pct = Math.min(100, Math.max(0, Number(nextProgress)));
    if (st === 'completed') pct = 100;
    if (st === 'not_started' && pct > 0 && pct < 100) {
      /* keep user progress */
    } else if (st === 'not_started' && pct === 100) {
      pct = 0;
    }

    setSaving(true);
    setErr('');
    try {
      await updateActionPlanActivity(activityId, { status: st, progressPct: pct });
      setStatus(st);
      setProgress(pct);
      onUpdated?.({ status: st, progressPct: pct });
    } catch (e) {
      setErr(e.message || 'Failed to update status');
    } finally {
      setSaving(false);
    }
  };

  const onPickStatus = (value) => {
    const pct = value === 'completed' ? 100 : value === 'not_started' ? Math.min(progress, 99) : Math.max(progress, value === 'ongoing' ? 1 : progress);
    apply(value, pct);
  };

  const onProgressBlur = () => {
    apply(status, progress);
  };

  const restoreSchedule = async () => {
    setSaving(true);
    setErr('');
    try {
      const data = await updateActionPlanActivity(activityId, { resetTimeline: true });
      if (data?.status) setStatus(normalizeActivityStatus(data.status));
      if (data?.progressPct != null) setProgress(Number(data.progressPct));
      onUpdated?.(data);
    } catch (e) {
      setErr(e.message || 'Failed to restore schedule');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
          Activity status
        </p>
        <div className="flex flex-wrap gap-1.5">
          {ACTIVITY_STATUS_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const active = status === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                disabled={saving}
                title={opt.short}
                onClick={() => onPickStatus(opt.value)}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[10px] sm:text-xs font-semibold border transition-all disabled:opacity-50
                  ${active ? opt.active : `${opt.pill} hover:opacity-90`}`}
              >
                <Icon size={12} />
                {compact ? opt.label : opt.short}
              </button>
            );
          })}
          {saving && <Loader2 size={14} className="animate-spin text-amber-500 self-center" />}
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Progress</p>
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={0}
              max={100}
              value={progress}
              disabled={saving}
              onChange={(e) => setProgress(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
              onBlur={onProgressBlur}
              className="w-12 text-right text-xs font-bold text-[#000435] border border-gray-200 rounded-lg px-1 py-0.5"
            />
            <span className="text-xs text-gray-500">%</span>
          </div>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={progress}
          disabled={saving}
          onChange={(e) => setProgress(Number(e.target.value))}
          onMouseUp={onProgressBlur}
          onTouchEnd={onProgressBlur}
          className="w-full h-2 accent-amber-500 cursor-pointer"
        />
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mt-1">
          <div
            className={`h-full rounded-full transition-all ${
              status === 'completed' ? 'bg-emerald-500' : status === 'delayed' ? 'bg-red-400' : 'bg-amber-500'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {err && <p className="text-xs text-red-600">{err}</p>}
      {scheduleDriven && (
        <p className="text-[10px] text-amber-700/90 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1.5">
          Status and progress update daily from planned dates
          {scheduledToday ? ` (today: ${scheduledToday.progressPct}%)` : ''}.
          Manual changes pause auto-updates for this activity.
        </p>
      )}
      {statusManualOverride && (
        <button
          type="button"
          disabled={saving}
          className="text-[10px] font-semibold text-amber-700 hover:underline disabled:opacity-50"
          onClick={restoreSchedule}
        >
          Use schedule dates again
        </button>
      )}
      <p className="text-[10px] text-gray-400">
        Current: <span className="font-semibold text-[#000435]">{current.label}</span>
        {status === 'ongoing' && ' — in progress'}
        {status === 'not_started' && ' — before start date'}
        {status === 'completed' && ' — finished'}
      </p>
    </div>
  );
}
