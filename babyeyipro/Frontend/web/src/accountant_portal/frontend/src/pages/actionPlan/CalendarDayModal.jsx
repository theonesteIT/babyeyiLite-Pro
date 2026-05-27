import { createPortal } from 'react-dom';
import {
  X, Calendar, Clock, CheckCircle2, AlertTriangle, CircleDashed, Ban, User,
} from 'lucide-react';
import { getTimelineStatusOnDate } from '../../utils/activityTimeline';

const STATUS_STYLES = {
  completed: {
    label: 'Completed',
    icon: CheckCircle2,
    pill: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    dot: 'bg-emerald-500',
  },
  ongoing: {
    label: 'Ongoing',
    icon: Clock,
    pill: 'bg-amber-100 text-amber-800 border-amber-200',
    dot: 'bg-amber-500',
  },
  not_started: {
    label: 'Not started',
    icon: CircleDashed,
    pill: 'bg-slate-100 text-slate-700 border-slate-200',
    dot: 'bg-slate-400',
  },
  delayed: {
    label: 'Delayed',
    icon: AlertTriangle,
    pill: 'bg-red-100 text-red-700 border-red-200',
    dot: 'bg-red-500',
  },
  not_reached: {
    label: 'Not reached',
    icon: Calendar,
    pill: 'bg-blue-50 text-blue-800 border-blue-200',
    dot: 'bg-blue-400',
  },
  past_end: {
    label: 'Past end date',
    icon: AlertTriangle,
    pill: 'bg-orange-100 text-orange-800 border-orange-200',
    dot: 'bg-orange-500',
  },
  cancelled: {
    label: 'Cancelled',
    icon: Ban,
    pill: 'bg-gray-100 text-gray-600 border-gray-200',
    dot: 'bg-gray-400',
  },
};

function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function normalizeStatus(raw) {
  const s = String(raw || '').toLowerCase().replace(/\s+/g, '_');
  if (s === 'completed') return 'completed';
  if (s === 'ongoing' || s === 'in_progress') return 'ongoing';
  if (s === 'delayed') return 'delayed';
  if (s === 'cancelled') return 'cancelled';
  if (s === 'not_started') return 'not_started';
  return 'not_started';
}

/** Status for how the activity relates to the clicked calendar day (date-driven timeline). */
export function getActivityStatusOnDate(activity, date) {
  return getTimelineStatusOnDate(
    {
      start: activity.start,
      end: activity.end,
      status: normalizeStatus(activity.status),
      statusManualOverride: activity.statusManualOverride,
    },
    date
  );
}

export default function CalendarDayModal({
  date,
  activities = [],
  categoryColors = {},
  onClose,
  onSelectActivity,
}) {
  if (!date) return null;

  const withStatus = activities.map((a) => ({
    ...a,
    dateStatus: getActivityStatusOnDate(a, date),
  }));

  const counts = withStatus.reduce((acc, a) => {
    acc[a.dateStatus] = (acc[a.dateStatus] || 0) + 1;
    return acc;
  }, {});

  const dateLabel = date.toLocaleDateString('en-RW', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="calendar-day-title"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-[#000435]/55 backdrop-blur-sm" aria-hidden />
      <div
        className="relative w-full sm:max-w-lg max-h-[min(92vh,720px)] bg-white rounded-t-[28px] sm:rounded-2xl shadow-2xl border border-black/10 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-[#c87800] to-[#a86500] px-5 py-5 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/85">Activities on</p>
              <h2 id="calendar-day-title" className="text-lg sm:text-xl font-semibold text-white mt-0.5 leading-tight">
                {dateLabel}
              </h2>
              <p className="text-xs text-white/75 mt-1.5">
                {withStatus.length} {withStatus.length === 1 ? 'activity' : 'activities'} scheduled
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 w-9 h-9 rounded-xl border border-white/25 bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          {withStatus.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {['ongoing', 'completed', 'not_started', 'not_reached', 'delayed', 'past_end'].map((key) => {
                const n = counts[key] || 0;
                if (!n) return null;
                const st = STATUS_STYLES[key];
                return (
                  <span
                    key={key}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-white/15 text-white border border-white/20"
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                    {n} {st.label}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-3 bg-slate-50/80">
          {withStatus.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-14 h-14 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center justify-center mx-auto mb-3">
                <Calendar size={24} className="text-amber-500" />
              </div>
              <p className="text-sm font-semibold text-[#000435]">No activities on this date</p>
              <p className="text-xs text-gray-500 mt-1">Select another day or add activities in Activity Planning.</p>
            </div>
          ) : (
            withStatus.map((a) => {
              const cc = categoryColors[a.category] || categoryColors.Academic || {
                bg: 'bg-blue-500',
                light: 'bg-blue-100',
                text: 'text-blue-700',
                border: 'border-blue-300',
              };
              const st = STATUS_STYLES[a.dateStatus] || STATUS_STYLES.not_started;
              const StatusIcon = st.icon;
              const progress = Math.min(100, Math.max(0, Number(a.progress) || 0));

              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => onSelectActivity?.(a)}
                  className="w-full text-left bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-amber-200/80 transition-all p-4 group"
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-1 rounded-full self-stretch min-h-[3rem] ${cc.bg}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-sm font-bold text-[#000435] leading-snug group-hover:text-amber-700 transition-colors">
                          {a.name}
                        </p>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border shrink-0 ${st.pill}`}>
                          <StatusIcon size={11} />
                          {st.label}
                        </span>
                      </div>
                      <p className={`text-[10px] font-semibold uppercase tracking-wide ${cc.text}`}>{a.category}</p>
                      <p className="text-xs text-gray-500 mt-1">{a.dept}</p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                        <User size={12} className="shrink-0" />
                        <span className="truncate">{a.responsible}</span>
                      </div>
                      <div className="mt-3 flex items-center gap-2 text-[10px] text-gray-400">
                        <span>
                          {a.start.toLocaleDateString('en-RW', { month: 'short', day: 'numeric' })}
                          {' → '}
                          {a.end.toLocaleDateString('en-RW', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${a.dateStatus === 'completed' ? 'bg-emerald-500' : a.dateStatus === 'delayed' ? 'bg-red-400' : 'bg-amber-500'}`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-gray-600 w-8 text-right">{progress}%</span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="shrink-0 px-4 py-3 border-t border-gray-100 bg-white flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-[#000435] border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
