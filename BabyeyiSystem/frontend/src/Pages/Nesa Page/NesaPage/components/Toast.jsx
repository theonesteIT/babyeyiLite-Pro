import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

export default function Toast({ toasts, remove }) {
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[200] flex max-w-[calc(100vw-2rem)] flex-col gap-2">
      {toasts.map((t) => {
        const s =
          {
            success: {
              bgClass: 'bg-amber-50',
              borderClass: 'border-amber-200',
              textClass: 'text-[#047857]',
              icon: <CheckCircle className="h-4 w-4 text-emerald-600" />,
            },
            error: {
              bgClass: 'bg-red-50',
              borderClass: 'border-red-200',
              textClass: 'text-red-700',
              icon: <XCircle className="h-4 w-4 text-red-600" />,
            },
            warning: {
              bgClass: 'bg-amber-50',
              borderClass: 'border-amber-200',
              textClass: 'text-[#92400e]',
              icon: <AlertCircle className="h-4 w-4 text-amber-600" />,
            },
          }[t.type] || {
            bgClass: 'bg-white',
            borderClass: 'border-amber-200',
            textClass: 'text-[#000435]',
            icon: <Info className="h-4 w-4 text-amber-700" />,
          };

        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex w-[min(300px,calc(100vw-2rem))] items-start gap-2.5 rounded-2xl border px-3.5 py-3 shadow-[0_4px_20px_rgba(0,4,53,0.12)] ${s.bgClass} ${s.borderClass}`}
          >
            <div className="mt-px shrink-0">{s.icon}</div>
            <p className={`m-0 flex-1 text-xs font-semibold leading-relaxed ${s.textClass}`}>{t.message}</p>
            <button
              type="button"
              onClick={() => remove(t.id)}
              className={`cursor-pointer border-none bg-transparent p-0 opacity-50 transition-opacity hover:opacity-100 ${s.textClass}`}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
