// ================================================================
// NotificationDrawer — slide-over panel for parent notifications
// Supports resume links for ClassKit / ShuleKit (copy, WhatsApp share)
// ================================================================

import { useEffect } from "react";
import { X, Bell, Copy, MessageCircle, LinkIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { useParentShell } from "../../context/ParentShellContext";
import { whatsappShareHref } from "../../utils/parentKitOrderClipboard";

function toastCopy(ok) {
  try {
    if (typeof window !== "undefined") window.alert(ok ? "Link copied." : "Could not copy. Try again.");
  } catch {
    /* ignore */
  }
}

function toRouterPath(fullOrRelative) {
  const s = String(fullOrRelative || "").trim();
  if (!s) return "/parents/classkit";
  try {
    if (s.startsWith("http://") || s.startsWith("https://")) {
      const u = new URL(s);
      return `${u.pathname}${u.search}${u.hash}`;
    }
  } catch {
    /* fall through */
  }
  return s.startsWith("/") ? s : "/parents/classkit";
}

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
              {notifications.map((n) => {
                const portable = String(n.shareUrl || "").trim();
                const sameDevice = String(n.resumeUrl || "").trim();
                const copyTarget = portable || sameDevice;

                const hasResume =
                  n.kind === "incomplete_kit_order" ||
                  n.kind === "discipline" ||
                  Boolean(copyTarget);

                const markReadThen = () => markNotificationRead(n.id);

                const baseCard =
                  "w-full rounded-2xl border px-4 py-3 text-left transition-colors ";

                if (hasResume && copyTarget) {
                  const continueTo = portable ? toRouterPath(portable) : toRouterPath(sameDevice);
                  const wa = whatsappShareHref(`${n.title}\n${n.body}`, portable || sameDevice);
                  const isDiscipline = n.kind === "discipline";

                  return (
                    <li key={n.id}>
                      <div
                        className={
                          baseCard +
                          (n.read
                            ? "border-slate-100 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-800/50"
                            : "border-orange-200/80 bg-orange-50/60 dark:border-orange-900/50 dark:bg-orange-950/20")
                        }
                      >
                        <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">{n.title}</p>
                        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{n.body}</p>
                        <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                          {new Date(n.createdAt).toLocaleString()}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <Link
                            to={continueTo}
                            onClick={() => {
                              markReadThen();
                              setNotificationsOpen(false);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-orange-600 px-3 py-2 text-[11px] font-bold text-white hover:bg-orange-700"
                          >
                            <LinkIcon size={13} aria-hidden /> {isDiscipline ? "View discipline" : "Continue order"}
                          </Link>
                          {!isDiscipline ? (
                            <>
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                                onClick={async () => {
                                  markReadThen();
                                  try {
                                    await navigator.clipboard.writeText(copyTarget);
                                    toastCopy(true);
                                  } catch {
                                    toastCopy(false);
                                  }
                                }}
                              >
                                <Copy size={13} aria-hidden /> Copy link
                              </button>
                              <a
                                href={wa}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-bold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200"
                                onClick={() => markReadThen()}
                              >
                                <MessageCircle size={13} aria-hidden /> WhatsApp
                              </a>
                            </>
                          ) : null}
                        </div>

                        {!isDiscipline ? (
                          <p className="mt-2 text-[10px] text-slate-400 dark:text-slate-500 break-all leading-snug">{copyTarget}</p>
                        ) : null}
                      </div>
                    </li>
                  );
                }

                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      className={
                        baseCard +
                        "hover:bg-orange-50/30 dark:hover:bg-slate-800/80 " +
                        (n.read
                          ? "border-slate-100 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-800/50"
                          : "border-orange-200/80 bg-orange-50/60 dark:border-orange-900/50 dark:bg-orange-950/20")
                      }
                      onClick={markReadThen}
                    >
                      <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">{n.title}</p>
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{n.body}</p>
                      <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                        {new Date(n.createdAt).toLocaleString()}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>
    </>
  );
}
