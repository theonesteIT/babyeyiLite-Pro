// ================================================================
// NotificationDrawer — slide-over panel for parent notifications
// ================================================================

import { useEffect } from "react";
import { X, Bell } from "lucide-react";
import { useParentShell } from "../../context/ParentShellContext";

export default function NotificationDrawer() {
  const {
    notificationsOpen,
    setNotificationsOpen,
    notifications,
    unreadCount,
    markNotificationRead,
    markAllNotificationsRead,
  } = useParentShell();

  useEffect(() => {
    if (!notificationsOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [notificationsOpen]);

  if (!notificationsOpen) return null;

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[60] bg-slate-900/50 backdrop-blur-sm dark:bg-black/60"
        aria-label="Close notifications"
        onClick={() => setNotificationsOpen(false)}
      />
      <aside
        className="fixed right-0 top-0 z-[70] flex h-[100dvh] w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
        role="dialog"
        aria-modal="true"
        aria-labelledby="notif-panel-title"
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 dark:border-slate-700">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 dark:bg-orange-950/50">
              <Bell className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="min-w-0">
              <h2 id="notif-panel-title" className="font-extrabold text-slate-900 dark:text-slate-100 truncate">
                Notifications
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllNotificationsRead}
                className="text-xs font-bold text-orange-600 hover:underline dark:text-orange-400"
              >
                Mark all read
              </button>
            )}
            <button
              type="button"
              onClick={() => setNotificationsOpen(false)}
              className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Close"
            >
              <X size={22} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-3">
          {notifications.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-12 text-center text-sm text-slate-500 dark:border-slate-600 dark:text-slate-400">
              No notifications yet.
            </div>
          ) : (
            <ul className="space-y-2">
              {notifications.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => {
                      markNotificationRead(n.id);
                    }}
                    className={[
                      "w-full rounded-2xl border px-4 py-3 text-left transition-colors",
                      n.read
                        ? "border-slate-100 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-800/50"
                        : "border-orange-200/80 bg-orange-50/60 dark:border-orange-900/50 dark:bg-orange-950/20",
                    ].join(" ")}
                  >
                    <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">{n.title}</p>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{n.body}</p>
                    <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                      {new Date(n.createdAt).toLocaleString()}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </>
  );
}
