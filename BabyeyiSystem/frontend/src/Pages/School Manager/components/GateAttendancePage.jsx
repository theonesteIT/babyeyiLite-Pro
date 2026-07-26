/**
 * Gate Attendance — Lite School Manager (reference layout)
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Sunrise, Sunset, Clock, Settings, Search, Loader2,
  Download, ChevronLeft, ChevronRight, DoorOpen, ClipboardList, AlertCircle,
} from "lucide-react";
import { BABYEYI_FONT_STACK } from "../../../theme/babyeyiDashboardTheme";
import { SM_NAVY } from "../utils/schoolManagerTheme";
import SmStatCard from "./SmStatCard";

const API = import.meta.env.VITE_API_URL || "http://localhost:5100";
const FONT = BABYEYI_FONT_STACK;
const PAGE_SIZE = 8;
const NAVY = SM_NAVY;

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function fmtTime(dt) {
  if (!dt) return "—";
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function fmt12(hhmm) {
  if (!hhmm) return "—";
  const [h, m] = String(hhmm).split(":").map(Number);
  const d = new Date();
  d.setHours(h || 0, m || 0, 0, 0);
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function normalizeSettings(data = {}) {
  return {
    morningDeadline: data.morning_deadline || data.morningDeadline || "08:00",
    morningCutoff: data.morning_cutoff || data.morningCutoff || "10:00",
    eveningStart: data.evening_start || data.eveningStart || "16:00",
    eveningCutoff: data.evening_cutoff || data.eveningCutoff || "19:00",
  };
}

function StatusPill({ status, variant }) {
  const map = {
    present: "bg-[#000435] text-amber-400",
    late: "bg-amber-400 text-[#000435]",
    absent: "bg-[#000435]/10 text-[#000435]",
    exit: "bg-amber-400/25 text-[#000435] border border-amber-300",
    pending: "bg-[#000435]/8 text-[#000435]/60",
  };
  const cls = map[variant] || "bg-[#000435]/8 text-[#000435]/60";
  return (
    <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold ${cls}`}>
      {status}
    </span>
  );
}

export default function GateAttendancePage({ toast }) {
  const [mainTab, setMainTab] = useState("attendance");
  const [sessionTab, setSessionTab] = useState("morning");
  const [personFilter, setPersonFilter] = useState("all");
  const [date, setDate] = useState(todayStr());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [records, setRecords] = useState([]);
  const [settings, setSettings] = useState(normalizeSettings());
  const [draftSettings, setDraftSettings] = useState(normalizeSettings());
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [studentTotal, setStudentTotal] = useState(0);
  const [staffTotal, setStaffTotal] = useState(0);
  const [page, setPage] = useState(1);

  const loadSettings = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/gate/attendance/settings`, { credentials: "include" });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        const s = normalizeSettings(json.data);
        setSettings(s);
        setDraftSettings(s);
      }
    } catch { /* ignore */ }
  }, []);

  const loadToday = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/gate/attendance/today?date=${encodeURIComponent(date)}`, {
        credentials: "include",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        toast?.(json.message || "Failed to load attendance", "error");
        setRecords([]);
      } else {
        setRecords(json.data || []);
      }
    } catch {
      toast?.("Cannot reach server", "error");
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [date, toast]);

  const loadTotals = useCallback(async () => {
    try {
      const [stuRes, staffRes] = await Promise.all([
        fetch(`${API}/api/students?page=1&limit=1`, { credentials: "include" }),
        fetch(`${API}/api/school/staff`, { credentials: "include" }),
      ]);
      const stuJson = await stuRes.json().catch(() => ({}));
      const staffJson = await staffRes.json().catch(() => ({}));
      if (stuRes.ok && stuJson.success) setStudentTotal(Number(stuJson.total || 0));
      if (staffRes.ok && staffJson.success) {
        const staff = staffJson.data || [];
        setStaffTotal(staff.length);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    loadSettings();
    loadTotals();
  }, [loadSettings, loadTotals]);

  useEffect(() => {
    loadToday();
  }, [loadToday]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, personFilter, sessionTab, date]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter((r) => {
      if (personFilter === "student" && r.person_type !== "STUDENT") return false;
      if (personFilter === "staff" && r.person_type !== "STAFF") return false;
      if (sessionTab === "morning" && !r.morning_check_in && statusFilter !== "absent") {
        if (statusFilter === "present" || statusFilter === "late") return false;
      }
      if (sessionTab === "evening" && !r.evening_check_out && statusFilter === "present") return false;
      if (statusFilter === "present" && sessionTab === "morning" && !r.morning_check_in) return false;
      if (statusFilter === "late" && r.morning_status !== "Late") return false;
      if (statusFilter === "present" && sessionTab === "evening" && !r.evening_check_out) return false;
      if (!q) return true;
      return (
        String(r.person_name || "").toLowerCase().includes(q) ||
        String(r.person_ref || "").toLowerCase().includes(q) ||
        String(r.card_uid || "").toLowerCase().includes(q)
      );
    });
  }, [records, personFilter, sessionTab, search, statusFilter]);

  const stats = useMemo(() => {
    const morningPresent = records.filter((r) => r.morning_check_in).length;
    const eveningPresent = records.filter((r) => r.evening_check_out).length;
    const late = records.filter((r) => r.morning_status === "Late").length;
    const totalEnrolled = studentTotal + staffTotal;
    const notMarked = Math.max(0, totalEnrolled - morningPresent);
    const absent = Math.max(0, totalEnrolled - morningPresent - notMarked);
    const morningPct = totalEnrolled ? Math.round((morningPresent / totalEnrolled) * 100) : 0;
    const eveningPct = totalEnrolled ? Math.round((eveningPresent / totalEnrolled) * 100) : 0;
    const absentPct = totalEnrolled ? Math.round(((late + absent) / totalEnrolled) * 100) : 0;
    const pendingPct = totalEnrolled ? Math.round((notMarked / totalEnrolled) * 100) : 0;
    return {
      morningPresent, eveningPresent, late, notMarked, totalEnrolled,
      morningPct, eveningPct, absentPct, pendingPct,
      presentAll: morningPresent,
      lateAll: late,
      absentAll: absent,
      pendingAll: notMarked,
    };
  }, [records, studentTotal, staffTotal]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const rangeStart = filtered.length ? (safePage - 1) * PAGE_SIZE + 1 : 0;
  const rangeEnd = Math.min(safePage * PAGE_SIZE, filtered.length);

  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      const res = await fetch(`${API}/api/gate/attendance/settings`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          morningDeadline: draftSettings.morningDeadline,
          morningCutoff: draftSettings.morningCutoff,
          eveningStart: draftSettings.eveningStart,
          eveningCutoff: draftSettings.eveningCutoff,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        toast?.(json.message || "Could not save settings", "error");
        return;
      }
      const s = normalizeSettings(json.data || draftSettings);
      setSettings(s);
      setDraftSettings(s);
      toast?.("Gate times saved.", "success");
    } catch {
      toast?.("Network error", "error");
    } finally {
      setSavingSettings(false);
    }
  };

  const exportCsv = () => {
    const headers = ["Date", "Type", "ID", "Name", "Card UID", "Morning In", "Morning Status", "Evening Out"];
    const lines = records.map((r) => [
      r.attendance_date,
      r.person_type,
      r.person_ref || r.person_id,
      r.person_name,
      r.card_uid,
      r.morning_check_in || "",
      r.morning_status || "",
      r.evening_check_out || "",
    ].map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","));
    const blob = new Blob([[headers.join(","), ...lines].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gate-attendance-${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const donutSegments = [
    { label: "Present", pct: stats.morningPct, color: NAVY },
    { label: "Late", pct: Math.round((stats.late / Math.max(1, stats.totalEnrolled)) * 100), color: "#f59e0b" },
    { label: "Absent", pct: stats.absentPct, color: "rgba(0,4,53,0.35)" },
    { label: "Not marked", pct: stats.pendingPct, color: "#fbbf24" },
  ];

  return (
    <div className="space-y-5 sm:space-y-6 anim min-h-0" style={{ fontFamily: FONT }}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl sm:text-[26px] font-black text-[#000435] tracking-tight">Gate Attendance</h1>
          <p className="text-sm text-[#000435]/50 mt-1">Monitor morning and evening gate attendance for students and staff.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-10 px-3 rounded-xl border border-[#000435]/15 bg-white text-sm font-medium text-[#000435] focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none"
          />
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400 text-[#000435] text-sm font-bold shadow-md shadow-amber-500/20 hover:bg-amber-300"
          >
            <Download size={16} /> Export Report
          </button>
        </div>
      </div>

      <div className="flex gap-1 p-1 rounded-xl bg-[#000435]/8 w-fit max-w-full overflow-x-auto">
        {[
          { id: "attendance", label: "Attendance", icon: DoorOpen },
          { id: "settings", label: "Time settings", icon: Settings },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setMainTab(id)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-colors ${
              mainTab === id ? "bg-[#000435] text-amber-400 shadow-sm" : "text-[#000435]/60 hover:text-[#000435]"
            }`}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {mainTab === "settings" ? (
        <div className="rounded-2xl sm:rounded-3xl bg-white border border-[#000435]/10 shadow-sm overflow-hidden max-w-2xl">
          <div className="px-6 py-5" style={{ background: NAVY }}>
            <h2 className="text-lg font-black text-white">Morning & evening windows</h2>
            <p className="text-sm text-amber-300/70 mt-1">
              When RFID taps count as on-time, late, or closed for each session.
            </p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { key: "morningDeadline", label: "Morning on-time until", hint: "After this → Late" },
                { key: "morningCutoff", label: "Morning session closes", hint: "No more morning check-in" },
                { key: "eveningStart", label: "Evening exit opens", hint: "Evening check-out allowed from" },
                { key: "eveningCutoff", label: "Evening session closes", hint: "No more evening check-out" },
              ].map(({ key, label, hint }) => (
                <div key={key}>
                  <label className="block text-[11px] font-bold text-[#000435]/50 uppercase tracking-wide mb-1.5">{label}</label>
                  <input
                    type="time"
                    value={draftSettings[key]}
                    onChange={(e) => setDraftSettings((s) => ({ ...s, [key]: e.target.value }))}
                    className="w-full h-11 px-3 rounded-xl border border-[#000435]/15 text-sm font-medium text-[#000435] focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none"
                  />
                  <p className="text-[10px] text-[#000435]/40 mt-1">{hint}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={saveSettings}
                disabled={savingSettings}
                className="px-5 py-2.5 rounded-xl bg-[#000435] text-amber-400 text-sm font-bold disabled:opacity-60 inline-flex items-center gap-2"
              >
                {savingSettings ? <Loader2 size={16} className="animate-spin" /> : null}
                Save times
              </button>
              <button
                type="button"
                onClick={() => setDraftSettings(settings)}
                className="px-4 py-2.5 rounded-xl border border-[#000435]/15 text-sm font-bold text-[#000435]/70 hover:bg-[#000435]/5"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
            <SmStatCard label="Morning Attendance" value={stats.morningPresent} sub={`${stats.morningPct}% present today`} />
            <SmStatCard label="Evening Attendance" value={stats.eveningPresent} sub={`${stats.eveningPct}% checked out`} />
            <SmStatCard label="Absent (est.)" value={stats.absentAll} sub={`${stats.absentPct}% today`} />
            <SmStatCard label="Not Marked" value={stats.pendingAll} sub={`${stats.pendingPct}% pending`} />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-5">
            <div className="rounded-2xl sm:rounded-3xl bg-white border border-[#000435]/10 shadow-sm overflow-hidden min-w-0">
              <div className="px-4 sm:px-6 py-4 border-b border-[#000435]/8 bg-[#000435]/[0.02] flex flex-col gap-3">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSessionTab("morning")}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
                      sessionTab === "morning" ? "bg-amber-400 text-[#000435]" : "bg-[#000435]/8 text-[#000435]/70"
                    }`}
                  >
                    <Sunrise size={16} /> Morning
                  </button>
                  <button
                    type="button"
                    onClick={() => setSessionTab("evening")}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
                      sessionTab === "evening" ? "bg-[#000435] text-amber-400" : "bg-[#000435]/8 text-[#000435]/70"
                    }`}
                  >
                    <Sunset size={16} /> Evening
                  </button>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between">
                  <div>
                    <h2 className="text-base font-black text-[#000435]">
                      {sessionTab === "morning" ? "Morning Attendance" : "Evening Attendance"}
                    </h2>
                    <p className="text-xs text-[#000435]/45">
                      {sessionTab === "morning"
                        ? `On-time until ${fmt12(settings.morningDeadline)} · closes ${fmt12(settings.morningCutoff)}`
                        : `Opens ${fmt12(settings.eveningStart)} · closes ${fmt12(settings.eveningCutoff)}`}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <select value={personFilter} onChange={(e) => setPersonFilter(e.target.value)} className="h-9 px-2 rounded-lg border border-[#000435]/15 text-xs font-medium text-[#000435] bg-white focus:border-amber-400 outline-none">
                      <option value="all">All</option>
                      <option value="student">Students</option>
                      <option value="staff">Staff</option>
                    </select>
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-9 px-2 rounded-lg border border-[#000435]/15 text-xs font-medium text-[#000435] bg-white focus:border-amber-400 outline-none">
                      <option value="">All status</option>
                      <option value="present">Present</option>
                      <option value="late">Late</option>
                    </select>
                    <div className="relative flex-1 min-w-[140px]">
                      <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#000435]/35" />
                      <input
                        type="search"
                        placeholder="Search…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full h-9 pl-8 pr-2 rounded-lg border border-[#000435]/15 text-xs text-[#000435] focus:border-amber-400 outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="py-16 flex justify-center text-slate-400 gap-2">
                  <Loader2 className="animate-spin text-amber-500" size={22} />
                  <span className="text-sm">Loading…</span>
                </div>
              ) : pageRows.length === 0 ? (
                <div className="py-14 text-center px-4">
                  <AlertCircle className="mx-auto text-slate-300 mb-2" size={40} />
                  <p className="font-bold text-slate-700">No records for this filter</p>
                  <p className="text-sm text-slate-400 mt-1">Attendance appears when RFID cards are tapped at the gate.</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="text-[11px] font-bold uppercase text-[#000435]/45 border-b border-[#000435]/8 bg-[#000435]/[0.03]">
                          <th className="px-4 py-3">#</th>
                          <th className="px-4 py-3">ID</th>
                          <th className="px-4 py-3">Name</th>
                          <th className="px-4 py-3">Type</th>
                          <th className="px-4 py-3">{sessionTab === "morning" ? "Time In" : "Time Out"}</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3">Card UID</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {pageRows.map((row, i) => {
                          const isMorning = sessionTab === "morning";
                          const time = isMorning ? row.morning_check_in : row.evening_check_out;
                          const status = isMorning
                            ? (row.morning_check_in ? (row.morning_status === "Late" ? "Late" : "Present") : "—")
                            : (row.evening_check_out ? "Exit" : "—");
                          const variant = status === "Present" ? "present" : status === "Late" ? "late" : status === "Exit" ? "exit" : "pending";
                          return (
                            <tr key={row.id || `${row.card_uid}-${i}`} className="hover:bg-amber-50/40 transition-colors">
                              <td className="px-4 py-3 text-slate-500">{(safePage - 1) * PAGE_SIZE + i + 1}</td>
                              <td className="px-4 py-3 font-mono text-xs text-slate-600">{row.person_ref || row.person_id}</td>
                              <td className="px-4 py-3 font-semibold text-slate-900">{row.person_name}</td>
                              <td className="px-4 py-3 text-slate-600">{row.person_type === "STAFF" ? "Staff" : "Student"}</td>
                              <td className="px-4 py-3">{fmtTime(time)}</td>
                              <td className="px-4 py-3">{status === "—" ? "—" : <StatusPill status={status} variant={variant} />}</td>
                              <td className="px-4 py-3 font-mono text-xs text-slate-500">{row.card_uid}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs text-slate-500">
                    <span>Showing {rangeStart}–{rangeEnd} of {filtered.length}</span>
                    <div className="flex gap-1">
                      <button type="button" disabled={safePage <= 1} onClick={() => setPage((p) => p - 1)} className="w-8 h-8 rounded-lg border flex items-center justify-center disabled:opacity-40"><ChevronLeft size={14} /></button>
                      <button type="button" disabled={safePage >= totalPages} onClick={() => setPage((p) => p + 1)} className="w-8 h-8 rounded-lg border flex items-center justify-center disabled:opacity-40"><ChevronRight size={14} /></button>
                    </div>
                  </div>
                </>
              )}
            </div>

            <aside className="space-y-4">
              <div className="rounded-2xl bg-white border border-[#000435]/10 shadow-sm p-5">
                <h3 className="text-sm font-black text-[#000435] mb-4">Today overview</h3>
                <div className="flex flex-col items-center">
                  <div className="relative w-40 h-40">
                    <svg viewBox="0 0 42 42" className="w-full h-full -rotate-90">
                      {(() => {
                        let acc = 0;
                        return donutSegments.map((seg) => {
                          const dash = `${seg.pct} ${100 - seg.pct}`;
                          const el = (
                            <circle
                              key={seg.label}
                              r="15.915"
                              cx="21" cy="21"
                              fill="transparent"
                              stroke={seg.color}
                              strokeWidth="4"
                              strokeDasharray={dash}
                              strokeDashoffset={25 - acc}
                            />
                          );
                          acc += seg.pct;
                          return el;
                        });
                      })()}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-black text-[#000435]">{stats.totalEnrolled}</span>
                      <span className="text-[10px] text-[#000435]/45 font-semibold">Total enrolled</span>
                    </div>
                  </div>
                  <ul className="w-full mt-4 space-y-2 text-xs">
                    {donutSegments.map((s) => (
                      <li key={s.label} className="flex justify-between">
                        <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ background: s.color }} />{s.label}</span>
                        <span className="font-bold">{s.pct}%</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="rounded-2xl bg-white border border-[#000435]/10 shadow-sm p-5">
                <h3 className="text-sm font-black text-[#000435] mb-3">Quick actions</h3>
                <ul className="space-y-2 text-sm">
                  <li><button type="button" onClick={() => setMainTab("settings")} className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-amber-50 font-medium text-[#000435]"><Settings size={16} className="text-amber-500" /> Gate time settings</button></li>
                  <li><button type="button" onClick={() => { setSessionTab("morning"); setStatusFilter("late"); }} className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-amber-50 font-medium text-[#000435]"><Clock size={16} className="text-[#000435]" /> Late arrivals</button></li>
                  <li><button type="button" onClick={exportCsv} className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-amber-50 font-medium text-[#000435]"><ClipboardList size={16} className="text-amber-500" /> Export report</button></li>
                </ul>
              </div>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
