import { useEffect, useMemo, useState } from "react";
import { CalendarClock, CheckCircle2, Loader2, School, Shield, UserCircle2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import LogoutButton from "../Auth/LogoutButton";

const API = import.meta.env.VITE_API_URL || "http://localhost:5100";

const ROLE_META = {
  TEACHER: {
    title: "Teacher Dashboard",
    subtitle: "Attendance, timetable, and class follow-up",
    tasks: [
      "Take and review daily class attendance",
      "Enter marks and classroom assessments",
      "Follow each learner progress",
    ],
  },
  LIBRARIAN: {
    title: "Librarian Dashboard",
    subtitle: "Library operations and learners support",
    tasks: [
      "Issue and receive books",
      "Track overdue books and reminders",
      "Keep inventory records organized",
    ],
  },
  STORE_MANAGER: {
    title: "Stock Manager Dashboard",
    subtitle: "School stock and inventory control",
    tasks: [
      "Track stock entries and exits",
      "Monitor low-stock items",
      "Prepare stock reports for school manager",
    ],
  },
  GATE_OFFICER: {
    title: "Gate Officer Dashboard",
    subtitle: "School gate access and visitor monitoring",
    tasks: [
      "Record student/visitor entry and exit",
      "Verify access and identity details",
      "Report incidents to school management",
    ],
  },
};

export default function StaffRoleDashboard({ roleCode }) {
  const auth = useAuth();
  const normalizedRole = String(roleCode || auth.role || "").toUpperCase();
  const roleMeta = ROLE_META[normalizedRole] || {
    title: "Staff Dashboard",
    subtitle: "School staff workspace",
    tasks: ["Manage your daily staff tasks"],
  };

  const [teacherData, setTeacherData] = useState(null);
  const [teacherLoading, setTeacherLoading] = useState(false);
  const [teacherError, setTeacherError] = useState(null);

  useEffect(() => {
    if (normalizedRole !== "TEACHER") return;
    let cancelled = false;
    setTeacherLoading(true);
    setTeacherError(null);
    fetch(`${API}/api/teacher-portal/dashboard`, { credentials: "include" })
      .then((res) => res.json().then((json) => ({ ok: res.ok, json })))
      .then(({ ok, json }) => {
        if (cancelled) return;
        if (!ok || !json?.success) {
          setTeacherError(json?.message || "Could not load teacher dashboard data.");
          return;
        }
        setTeacherData(json.data || null);
      })
      .catch(() => {
        if (!cancelled) setTeacherError("Network error while loading teacher dashboard data.");
      })
      .finally(() => {
        if (!cancelled) setTeacherLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [normalizedRole]);

  const fullName = useMemo(() => {
    const first = auth.user?.first_name || "";
    const last = auth.user?.last_name || "";
    return `${first} ${last}`.trim() || auth.user?.email || "Staff user";
  }, [auth.user]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                <Shield size={14} />
                {normalizedRole}
              </p>
              <h1 className="text-2xl font-black tracking-tight text-slate-900">{roleMeta.title}</h1>
              <p className="text-sm font-medium text-slate-500">{roleMeta.subtitle}</p>
            </div>
            <LogoutButton variant="default" size="sm" />
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Account</p>
              <p className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-800">
                <UserCircle2 size={16} />
                {fullName}
              </p>
              <p className="mt-1 text-xs text-slate-500">{auth.user?.email || "No email"}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">School</p>
              <p className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-800">
                <School size={16} />
                {auth.school?.name || "School"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Code: <span className="font-mono">{auth.school?.code || "N/A"}</span>
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-amber-900">Main responsibilities</p>
            <ul className="mt-2 space-y-2 text-sm text-amber-900">
              {roleMeta.tasks.map((task) => (
                <li key={task} className="inline-flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-amber-700" />
                  {task}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {normalizedRole === "TEACHER" && (
          <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex items-center gap-2">
              <CalendarClock size={18} className="text-slate-700" />
              <h2 className="text-lg font-black text-slate-900">Today class overview</h2>
            </div>
            {teacherLoading && (
              <div className="mt-4 inline-flex items-center gap-2 text-sm text-slate-600">
                <Loader2 size={16} className="animate-spin" />
                Loading teacher stats...
              </div>
            )}
            {!teacherLoading && teacherError && (
              <p className="mt-4 text-sm font-semibold text-red-600">{teacherError}</p>
            )}
            {!teacherLoading && !teacherError && teacherData && (
              <>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {(teacherData.stats || []).map((stat) => (
                    <div key={stat.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{stat.label}</p>
                      <p className="mt-2 text-xl font-black text-slate-900">{stat.value}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-5">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Schedule</p>
                  <div className="mt-2 space-y-2">
                    {(teacherData.schedule || []).length === 0 ? (
                      <p className="text-sm text-slate-500">No timetable entries for today.</p>
                    ) : (
                      teacherData.schedule.map((row, idx) => (
                        <div
                          key={`${row.subject}-${row.time}-${idx}`}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                        >
                          <span className="font-bold text-slate-900">{row.subject}</span>
                          <span className="mx-2 text-slate-400">|</span>
                          <span className="text-slate-700">{row.group}</span>
                          <span className="mx-2 text-slate-400">|</span>
                          <span className="font-mono text-slate-600">{row.time}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
