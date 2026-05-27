/**
 * HRCenter.jsx — Lite School Manager HR (reference layout)
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Users, UserPlus, Search, Loader2, MoreVertical, ChevronLeft, ChevronRight,
  UserCheck, CalendarClock, Palmtree, LayoutList,
} from "lucide-react";
import AddStaffWizard from "./hr/AddStaffWizard";
import StaffViewModal from "./hr/StaffViewModal";
import EditStaffModal from "./hr/EditStaffModal";
import StaffActionsMenu from "./hr/StaffActionsMenu";
import { BABYEYI_FONT_STACK } from "../../../theme/babyeyiDashboardTheme";
import { DEPARTMENTS } from "../utils/hrCenterConstants";

const API = import.meta.env.VITE_API_URL || "http://localhost:5100";
const FONT = BABYEYI_FONT_STACK;
const PAGE_SIZE = 5;

function StatCard({ icon: Icon, label, value, sub }) {
  return (
    <div className="rounded-2xl bg-white border border-slate-100 shadow-[0_1px_3px_rgba(0,4,53,0.06)] p-5 hover:shadow-md transition-shadow">
      <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center mb-4 ring-1 ring-amber-100">
        <Icon size={22} strokeWidth={1.5} className="text-amber-500" />
      </div>
      <p className="text-[28px] sm:text-[32px] font-black text-[#000435] leading-none tabular-nums">{value}</p>
      <p className="text-sm font-bold text-slate-800 mt-2">{label}</p>
      {sub ? <p className="text-[11px] text-slate-500 mt-0.5">{sub}</p> : null}
    </div>
  );
}

function StatusBadge({ status }) {
  const s = String(status || "").toLowerCase();
  const active = (s.includes("active") || s === "") && !s.includes("leave") && !s.includes("inactive");
  const leave = s.includes("leave");
  const cls = leave
    ? "bg-amber-100 text-amber-800"
    : active
      ? "bg-emerald-100 text-emerald-800"
      : "bg-slate-100 text-slate-600";
  const label = leave ? "On Leave" : active ? "Active" : status || "Inactive";
  return (
    <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold ${cls}`}>
      {label}
    </span>
  );
}

function initials(first, last) {
  return `${(first || "?")[0]}${(last || "")[0] || ""}`.toUpperCase();
}

function displayStatus(row) {
  const st = String(row.employment_status || "").trim();
  if (st) return st;
  return Number(row.is_active) === 1 ? "Active" : "Inactive";
}

function AdvanceBadge({ allowed }) {
  const yes = Number(allowed) === 1 || allowed === true;
  return (
    <span
      className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-semibold ${
        yes ? "bg-violet-100 text-violet-800" : "bg-slate-100 text-slate-500"
      }`}
    >
      {yes ? "Avance allowed" : "No avance"}
    </span>
  );
}

export default function HRCenter({ session, toast }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [viewStaff, setViewStaff] = useState(null);
  const [editStaff, setEditStaff] = useState(null);
  const [deleteStaff, setDeleteStaff] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [page, setPage] = useState(1);
  const [advanceMaxPercent, setAdvanceMaxPercent] = useState(25);
  const [policySaving, setPolicySaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/school/staff`, { credentials: "include" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        toast?.(json.message || "Failed to load staff", "error");
        setList([]);
        return;
      }
      setList(json.data || []);
    } catch {
      toast?.("Cannot reach server", "error");
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/api/school/shule-avance-policy`, { credentials: "include" });
        const json = await res.json().catch(() => ({}));
        if (res.ok && json.success && json.data?.max_percent != null) {
          setAdvanceMaxPercent(Number(json.data.max_percent) || 25);
        }
      } catch { /* ignore */ }
    })();
  }, []);

  const saveAdvancePolicy = async () => {
    const pct = Number(advanceMaxPercent);
    if (!Number.isFinite(pct) || pct <= 0 || pct > 100) {
      toast?.("Enter a percentage between 1 and 100.", "error");
      return;
    }
    setPolicySaving(true);
    try {
      const res = await fetch(`${API}/api/school/shule-avance-policy`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ max_percent: pct }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        toast?.(json.message || "Could not save policy", "error");
        return;
      }
      toast?.("Shule Avance limit saved.", "success");
    } catch {
      toast?.("Network error", "error");
    } finally {
      setPolicySaving(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [search, deptFilter]);

  const departmentOptions = useMemo(() => {
    const fromData = new Set(list.map((r) => r.department).filter(Boolean));
    DEPARTMENTS.forEach((d) => fromData.add(d));
    return [...fromData].sort();
  }, [list]);

  const stats = useMemo(() => {
    const total = list.length;
    const active = list.filter((r) => {
      const st = displayStatus(r).toLowerCase();
      return st === "active" || (st === "inactive" ? false : !st.includes("leave") && Number(r.is_active) === 1);
    }).length;
    const onLeave = list.filter((r) => displayStatus(r).toLowerCase().includes("leave")).length;
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const newMonth = list.filter((r) => {
      const d = new Date(r.created_at || r.date_of_employment);
      return !Number.isNaN(d.getTime()) && d >= monthStart;
    }).length;
    return { total, active, onLeave, newMonth };
  }, [list]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return list.filter((r) => {
      if (deptFilter && (r.department || "") !== deptFilter) return false;
      if (!q) return true;
      const name = `${r.first_name} ${r.last_name}`.toLowerCase();
      return (
        name.includes(q) ||
        String(r.email || "").toLowerCase().includes(q) ||
        String(r.phone || "").includes(q) ||
        String(r.role_name || r.job_title || r.role_code || "").toLowerCase().includes(q) ||
        String(r.department || "").toLowerCase().includes(q)
      );
    });
  }, [list, search, deptFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, safePage]);

  const rangeStart = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(safePage * PAGE_SIZE, filtered.length);

  const existingUsernames = useMemo(
    () => list.map((r) => String(r.username || "").toLowerCase()).filter(Boolean),
    [list]
  );

  const openActionsMenu = (e, row) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const id = String(row.id);
    if (menuAnchor?.id === id) {
      setMenuAnchor(null);
    } else {
      setMenuAnchor({ id, rect });
    }
  };

  const patchStaff = async (row, body, successMsg) => {
    setMenuAnchor(null);
    try {
      const res = await fetch(`${API}/api/school/staff/${row.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        toast?.(json.message || "Update failed", "error");
        return;
      }
      toast?.(successMsg || "Staff updated.", "success");
      load();
    } catch {
      toast?.("Network error", "error");
    }
  };

  const toggleStaffActive = (row) => {
    const activating = Number(row.is_active) !== 1;
    patchStaff(
      row,
      { is_active: activating },
      activating ? "Staff activated." : "Staff deactivated."
    );
  };

  const handleDeleteStaff = async () => {
    if (!deleteStaff) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API}/api/school/staff/${deleteStaff.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        toast?.(json.message || "Delete failed", "error");
        return;
      }
      toast?.("Staff removed.", "success");
      setDeleteStaff(null);
      load();
    } catch {
      toast?.("Network error", "error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6 anim -mx-1 sm:mx-0" style={{ fontFamily: FONT }}>
      {/* Page title row — matches reference */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-[26px] font-black text-[#000435] tracking-tight">HRCenter</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your staff and HR operations.</p>
        </div>
        <button
          type="button"
          onClick={() => setWizardOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-400 text-[#000435] text-sm font-bold shadow-md shadow-amber-500/25 hover:bg-amber-300 active:scale-[0.98] transition-all w-full sm:w-auto shrink-0"
        >
          <UserPlus size={18} strokeWidth={2.25} />
          Add Staff
        </button>
      </div>

      <div className="rounded-2xl border border-amber-200/80 bg-gradient-to-r from-amber-50/90 to-white p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:justify-between">
          <div>
            <h2 className="text-sm font-black text-[#000435]">Shule Avance policy</h2>
            <p className="text-xs text-slate-600 mt-1 max-w-xl">
              Maximum advance per staff per month as % of net salary. Enable &quot;Shule Avance&quot; per staff on payroll step.
            </p>
          </div>
          <div className="flex items-end gap-2 shrink-0">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Max % of salary</label>
              <input
                type="number"
                min={1}
                max={100}
                value={advanceMaxPercent}
                onChange={(e) => setAdvanceMaxPercent(e.target.value)}
                className="w-24 h-10 px-3 rounded-xl border border-slate-200 text-sm font-bold"
              />
            </div>
            <button
              type="button"
              disabled={policySaving}
              onClick={saveAdvancePolicy}
              className="h-10 px-4 rounded-xl bg-[#000435] text-amber-400 text-xs font-bold disabled:opacity-60"
            >
              {policySaving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard icon={Users} label="Total Staff" value={stats.total} sub="All active staff" />
        <StatCard icon={UserCheck} label="Active Staff" value={stats.active} sub="Currently working" />
        <StatCard icon={CalendarClock} label="New This Month" value={stats.newMonth} sub="Recently added" />
        <StatCard icon={Palmtree} label="On Leave" value={stats.onLeave} sub="Currently on leave" />
      </div>

      {/* Staff list card */}
      <div className="rounded-2xl sm:rounded-3xl bg-white border border-slate-100 shadow-[0_1px_4px_rgba(0,4,53,0.05)] overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-slate-100">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-4">
            <h2 className="text-base font-black text-[#000435] shrink-0">Staff List</h2>
            <div className="flex flex-col sm:flex-row gap-2 flex-1 lg:justify-end">
              <div className="relative flex-1 sm:max-w-xs">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="search"
                  placeholder="Search staff..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 bg-slate-50/50 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:bg-white focus:border-amber-400 focus:ring-2 focus:ring-amber-400/15"
                />
              </div>
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="h-10 px-3 rounded-xl border border-slate-200 bg-slate-50/50 text-sm font-medium text-slate-700 outline-none focus:border-amber-400 focus:bg-white sm:min-w-[160px]"
              >
                <option value="">All Departments</option>
                {departmentOptions.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <button
                type="button"
                className="hidden sm:flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 shrink-0"
                title="List view"
              >
                <LayoutList size={18} />
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400 gap-2">
            <Loader2 size={22} className="animate-spin text-amber-500" />
            <span className="text-sm font-medium">Loading staff…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Users size={44} className="mx-auto text-slate-200 mb-3" />
            <p className="font-bold text-slate-700">No staff found</p>
            <p className="text-sm text-slate-400 mt-1">Add your first team member to get started.</p>
            <button
              type="button"
              onClick={() => setWizardOpen(true)}
              className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-400 text-[#000435] text-sm font-bold shadow-sm"
            >
              <UserPlus size={16} /> Add Staff
            </button>
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="px-6 py-3.5 font-bold">Name</th>
                    <th className="px-4 py-3.5">Department</th>
                    <th className="px-4 py-3.5">Position</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5">Avance</th>
                    <th className="px-4 py-3.5">Email</th>
                    <th className="px-4 py-3.5">Phone</th>
                    <th className="px-4 py-3.5">RFID</th>
                    <th className="px-4 py-3.5 w-14 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {pageRows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold shrink-0">
                            {initials(row.first_name, row.last_name)}
                          </div>
                          <p className="font-semibold text-slate-900 text-sm">
                            {row.first_name} {row.last_name}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600">{row.department || "—"}</td>
                      <td className="px-4 py-4 text-sm text-slate-600">
                        {row.role_name || row.job_title || row.role_code || "—"}
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={displayStatus(row)} />
                      </td>
                      <td className="px-4 py-4">
                        <AdvanceBadge allowed={row.allow_advance} />
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-500 max-w-[180px] truncate">{row.email}</td>
                      <td className="px-4 py-4 text-sm text-slate-600 whitespace-nowrap">{row.phone || "—"}</td>
                      <td className="px-4 py-4 text-xs font-mono text-slate-500 max-w-[100px] truncate">{row.rfid_uid || "—"}</td>
                      <td className="px-4 py-4 text-right relative">
                        <button
                          type="button"
                          className="w-8 h-8 rounded-lg hover:bg-slate-100 inline-flex items-center justify-center text-slate-400"
                          onClick={(e) => openActionsMenu(e, row)}
                        >
                          <MoreVertical size={16} />
                        </button>
                        {menuAnchor?.id === String(row.id) && (
                          <StaffActionsMenu
                            anchorRect={menuAnchor.rect}
                            row={row}
                            onView={setViewStaff}
                            onEdit={setEditStaff}
                            onToggleActive={toggleStaffActive}
                            onDelete={setDeleteStaff}
                            onClose={() => setMenuAnchor(null)}
                          />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile list */}
            <div className="md:hidden divide-y divide-slate-100">
              {pageRows.map((row) => (
                <div key={row.id} className="p-4 flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold shrink-0">
                    {initials(row.first_name, row.last_name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-slate-900 text-sm">{row.first_name} {row.last_name}</p>
                      <div className="flex items-center gap-1 shrink-0">
                        <StatusBadge status={displayStatus(row)} />
                        <div className="relative">
                          <button
                            type="button"
                            className="w-8 h-8 rounded-lg hover:bg-slate-100 inline-flex items-center justify-center text-slate-400"
                            onClick={(e) => openActionsMenu(e, row)}
                          >
                            <MoreVertical size={16} />
                          </button>
                          {menuAnchor?.id === String(row.id) && (
                            <StaffActionsMenu
                              anchorRect={menuAnchor.rect}
                              row={row}
                              onView={setViewStaff}
                              onEdit={setEditStaff}
                              onToggleActive={toggleStaffActive}
                              onDelete={setDeleteStaff}
                              onClose={() => setMenuAnchor(null)}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{row.role_name || row.job_title}</p>
                    <p className="text-[11px] text-slate-400">{row.department || "—"}</p>
                    <div className="mt-1.5">
                      <AdvanceBadge allowed={row.allow_advance} />
                    </div>
                    <p className="text-[11px] text-slate-500 truncate mt-1">{row.email}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="px-4 sm:px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-xs text-slate-500 font-medium">
                Showing {rangeStart} to {rangeEnd} of {filtered.length} entries
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-40"
                >
                  <ChevronLeft size={16} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setPage(n)}
                    className={`min-w-[36px] h-9 px-2 rounded-lg text-sm font-bold transition-colors ${
                      n === safePage
                        ? "bg-amber-400 text-[#000435] border border-amber-400"
                        : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {n}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-40"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <AddStaffWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onSuccess={load}
        session={session}
        toast={toast}
        existingUsernames={existingUsernames}
      />

      <StaffViewModal
        open={!!viewStaff}
        staff={viewStaff}
        onClose={() => setViewStaff(null)}
        onEdit={(row) => {
          setViewStaff(null);
          setEditStaff(row);
        }}
      />

      <EditStaffModal
        open={!!editStaff}
        staff={editStaff}
        onClose={() => setEditStaff(null)}
        onSuccess={load}
        toast={toast}
      />

      {deleteStaff && (
        <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4" style={{ fontFamily: FONT }}>
          <div className="absolute inset-0 bg-[#000435]/60 backdrop-blur-sm" onClick={() => !deleting && setDeleteStaff(null)} aria-hidden />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6">
            <h3 className="text-lg font-black text-[#000435]">Delete staff member?</h3>
            <p className="text-sm text-slate-600 mt-2">
              This will remove{" "}
              <span className="font-semibold text-slate-900">
                {deleteStaff.first_name} {deleteStaff.last_name}
              </span>{" "}
              from your school. This action cannot be undone.
            </p>
            <div className="flex gap-2 justify-end mt-6">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteStaff(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDeleteStaff}
                className="px-5 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 disabled:opacity-60 inline-flex items-center gap-2"
              >
                {deleting ? <Loader2 size={16} className="animate-spin" /> : null}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
