import { AlertTriangle, Check, Send, Eye, ThumbsUp, ThumbsDown } from 'lucide-react';
import { st } from '../utils/theme';
import { fmt, fmtDate } from '../utils/helpers';
import Badge from './Badge';

export default function BabyeyiCard({ item, onAction, onView }) {
  const s = st(item.status);
  const Icon = s.icon;
  const exceeds = item.exceeds_limit === 1 || item.exceeds_limit === true;
  const nesaStatus = item.nesa_status || item.request_status || '';
  const isSentToNesa = nesaStatus === 'recommended';

  const borderClass = exceeds
    ? 'border-amber-400'
    : item.status === 'approved'
      ? 'border-[#000435]/20'
      : item.status === 'rejected'
        ? 'border-[#000435]/30'
        : 'border-[#fde68a]';

  return (
    <article
      className={`rounded-2xl border-2 bg-white p-4 shadow-[0_2px_12px_rgba(0,4,53,0.06)] transition-shadow hover:shadow-md ${borderClass}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-3">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 ${s.bgClass} ${s.borderClass}`}>
          <Icon className={`h-5 w-5 ${s.textClass}`} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="m-0 mb-0.5 truncate text-sm font-bold text-[#000435]">
                {item.school_name || 'Unknown school'}
              </p>
              <p className="m-0 text-[11px] font-medium text-amber-800/90">
                {item.school_sector || '—'} · {item.doc_id || `#${item.id}`}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
              {exceeds && (
                <span className="inline-flex animate-pulse items-center gap-1 rounded-full border border-amber-400 bg-amber-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-900">
                  <AlertTriangle className="h-2.5 w-2.5" /> Exceeds
                </span>
              )}
              <Badge status={item.status} />
            </div>
          </div>

          <div className="mb-3 flex flex-wrap items-center gap-1.5">
            {[item.class, item.term, item.academic_year, item.level, item.category].filter(Boolean).map((v) => (
              <span
                key={`${v}`}
                className="rounded-lg border border-[#fde68a] bg-amber-50/80 px-2 py-0.5 text-[10px] font-semibold text-[#000435]"
              >
                {v}
              </span>
            ))}
            <span className="ml-auto text-sm font-bold tabular-nums text-[#000435]">
              RWF {fmt(item.total_fee)}
            </span>
          </div>

          <div className="flex flex-col gap-2 border-t border-[#fde68a] pt-3 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="flex flex-wrap gap-1">
              {[
                { label: 'View', onClick: () => onView(item), show: true, className: 'text-[#000435] bg-amber-50 border-amber-200', icon: Eye },
                { label: 'Approve', onClick: () => onAction('approve', item), show: item.status !== 'approved', className: 'text-[#000435] bg-white border-[#000435]/15', icon: ThumbsUp },
                { label: 'Reject', onClick: () => onAction('reject', item), show: item.status !== 'rejected', className: 'text-[#000435] bg-white border-[#000435]/15', icon: ThumbsDown },
              ].filter((b) => b.show).map(({ label, onClick, className, icon: BIcon }) => (
                <button
                  key={label}
                  type="button"
                  onClick={onClick}
                  className={`inline-flex min-h-[40px] cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-colors hover:bg-amber-100/60 ${className}`}
                >
                  <BIcon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>

            {exceeds && !isSentToNesa && (
              <button
                type="button"
                onClick={() => onAction('recommend', item)}
                className="inline-flex min-h-[40px] w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border-none bg-[#000435] px-4 py-2 text-xs font-bold text-amber-400 sm:ml-auto sm:w-auto"
              >
                <Send className="h-3.5 w-3.5" /> Send to NESA
              </button>
            )}
            {isSentToNesa && (
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-[#fde68a] bg-amber-50 px-3 py-2 text-[10px] font-bold text-[#000435] sm:ml-auto">
                <Check className="h-3.5 w-3.5" /> Sent to NESA
              </span>
            )}

            <span className="text-[10px] font-medium text-[#000435]/45 sm:ml-auto">
              {fmtDate(item.created_at)}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
