import { useCallback, useEffect, useState } from "react";
import {
  Bell, AlertTriangle, Clock, DollarSign, CheckCircle, Menu, BookOpen,
  LayoutDashboard, FileText, Layers, TrendingUp, BarChart2, Calendar,
  ChevronRight, BellOff, BellRing, Info, Loader2, RefreshCw, MailOpen, Trash2,
} from "lucide-react";
import ActionPlanPushBanner from "@/shared/ActionPlanPushBanner";
import api from "../../services/api";
import {
  fetchActionPlanNotifications,
  markActionPlanNotificationRead,
  markAllActionPlanNotificationsRead,
} from "../../services/actionPlanApi";
import ActionPlanPageHero from "./ActionPlanPageHero";

const NOTIF_TYPES = {
  deadline: { icon: Clock, iconBg: "bg-amber-100", iconColor: "text-amber-600", label: "Deadline" },
  budget: { icon: DollarSign, iconBg: "bg-red-100", iconColor: "text-red-500", label: "Budget" },
  delayed: { icon: AlertTriangle, iconBg: "bg-orange-100", iconColor: "text-orange-600", label: "Delayed" },
  approval: { icon: CheckCircle, iconBg: "bg-blue-100", iconColor: "text-blue-600", label: "Approval" },
  info: { icon: Info, iconBg: "bg-gray-100", iconColor: "text-gray-500", label: "Info" },
  success: { icon: CheckCircle, iconBg: "bg-emerald-100", iconColor: "text-emerald-600", label: "Update" },
};

function mapNotifType(apiType) {
  const t = String(apiType || "");
  if (t === "activity_deadline") return "deadline";
  if (t === "action_plan_approval") return "approval";
  if (t === "action_plan_review") return "success";
  return "info";
}

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 48) return `${hrs}h ago`;
  return d.toLocaleDateString("en-RW", { month: "short", day: "numeric" });
}

export default function NotificationReminder({ embedded = false }) {
  const [tab, setTab] = useState("all");
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { items } = await fetchActionPlanNotifications(50);
      setNotifications(
        items.map((n) => ({
          id: n.id,
          type: mapNotifType(n.type),
          title: n.title,
          message: n.body || n.message || "",
          time: timeAgo(n.createdAt),
          read: n.isRead,
          url: n.url,
        }))
      );
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const unread = notifications.filter((n) => !n.read).length;

  const markAllRead = async () => {
    await markAllActionPlanNotificationsRead().catch(() => {});
    setNotifications((n) => n.map((x) => ({ ...x, read: true })));
  };

  const markRead = async (id) => {
    await markActionPlanNotificationRead(id).catch(() => {});
    setNotifications((n) => n.map((x) => (x.id === id ? { ...x, read: true } : x)));
  };

  const filtered = notifications.filter((n) => {
    if (tab === "unread" && n.read) return false;
    if (tab === "read" && !n.read) return false;
    if (filterType !== "all" && n.type !== filterType) return false;
    return true;
  });

  const stats = [
    { label: "Unread", value: unread, icon: BellRing },
    { label: "Deadlines", value: notifications.filter((n) => n.type === "deadline" && !n.read).length, icon: Clock },
    { label: "Approvals", value: notifications.filter((n) => n.type === "approval" && !n.read).length, icon: CheckCircle },
    { label: "Updates", value: notifications.filter((n) => n.type === "success" && !n.read).length, icon: Info },
  ];

  return (
    <div className={`${embedded ? 'w-full min-h-0' : 'flex h-screen overflow-hidden'} bg-gray-50 font-['Montserrat']`}>
      <div className={embedded ? "w-full" : "flex-1 flex flex-col min-w-0 overflow-hidden"}>
        {!embedded && (
          <ActionPlanPageHero
            pageId="ap-notifications"
            headerRight={(
              <>
                <button type="button" onClick={load} className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-[10px] font-medium uppercase tracking-widest text-white">
                  <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
                </button>
                <button type="button" onClick={markAllRead} className="inline-flex items-center gap-2 rounded-xl border border-[#FEBF10]/35 bg-[#FEBF10]/15 px-3 py-2 text-[10px] font-medium uppercase tracking-widest text-white">
                  <MailOpen size={13} /> Mark all read
                </button>
              </>
            )}
          />
        )}

        <main className={`${embedded ? "p-4 md:p-6 pb-12 space-y-4" : "flex-1 overflow-y-auto p-4 md:p-6 space-y-4"}`}>
          {embedded && (
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-gray-500">Reminders before activity end dates · plan approvals</p>
              <button type="button" onClick={load} className="text-xs font-semibold text-amber-600 flex items-center gap-1">
                <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
              </button>
            </div>
          )}

          <ActionPlanPushBanner api={api} />

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {stats.map((stat) => {
              const StatIcon = stat.icon;
              return (
                <div key={stat.label} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                  <StatIcon size={18} className="text-amber-500 mb-2" />
                  <p className="text-2xl font-bold text-[#000435]">{stat.value}</p>
                  <p className="text-xs text-gray-500">{stat.label}</p>
                </div>
              );
            })}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex border-b border-gray-100">
              {[{ key: "all", label: "All" }, { key: "unread", label: `Unread (${unread})` }, { key: "read", label: "Read" }].map((t) => (
                <button key={t.key} type="button" onClick={() => setTab(t.key)}
                  className={`px-4 py-3 text-sm font-semibold border-b-2 ${tab === t.key ? "border-amber-500 text-amber-600" : "border-transparent text-gray-500"}`}>
                  {t.label}
                </button>
              ))}
            </div>

            <div className="px-4 py-2 flex flex-wrap gap-2 border-b border-gray-50">
              {[["all", "All"], ["deadline", "Deadline"], ["approval", "Approval"], ["success", "Review"]].map(([key, label]) => (
                <button key={key} type="button" onClick={() => setFilterType(key)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${filterType === key ? "bg-[#000435] text-white" : "bg-gray-100 text-gray-600"}`}>
                  {label}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-amber-500" /></div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <BellOff size={36} className="mx-auto mb-3 opacity-40" />
                <p className="text-sm font-medium">No notifications</p>
                <p className="text-xs mt-1">Enable push alerts above to get reminders on this device.</p>
              </div>
            ) : (
              <div className="divide-y max-h-[480px] overflow-y-auto">
                {filtered.map((notif) => {
                  const cfg = NOTIF_TYPES[notif.type] || NOTIF_TYPES.info;
                  const Icon = cfg.icon;
                  return (
                    <div
                      key={notif.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => markRead(notif.id)}
                      onKeyDown={(e) => e.key === "Enter" && markRead(notif.id)}
                      className={`flex gap-3 p-4 cursor-pointer hover:bg-gray-50 ${!notif.read ? "bg-amber-50/30" : ""}`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${cfg.iconBg}`}>
                        <Icon size={18} className={cfg.iconColor} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm ${!notif.read ? "font-bold text-[#000435]" : "font-medium text-gray-700"}`}>{notif.title}</p>
                          <span className="text-[10px] text-gray-400 shrink-0">{notif.time}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notif.message}</p>
                        <span className="text-[10px] font-semibold text-amber-600 mt-1 inline-block">{cfg.label}</span>
                      </div>
                      {!notif.read && <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 mt-2" />}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <p className="text-xs text-gray-400 text-center">
            Reminders are sent 7, 3, and 1 day before an activity&apos;s planned end date.
          </p>
        </main>
      </div>
    </div>
  );
}
