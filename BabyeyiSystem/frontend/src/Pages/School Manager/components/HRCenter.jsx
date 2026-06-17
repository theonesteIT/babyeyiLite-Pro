/**
 * HRCenter.jsx — Lite School Manager HR (reference layout)
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Users, UserPlus, Search, Loader2, MoreVertical, ChevronLeft, ChevronRight,
  UserCheck, CalendarClock, Palmtree, LayoutList, Wallet, X, Settings2,
} from "lucide-react";
import AddStaffWizard from "./hr/AddStaffWizard";
import StaffViewModal from "./hr/StaffViewModal";
import EditStaffModal from "./hr/EditStaffModal";
import StaffActionsMenu from "./hr/StaffActionsMenu";
import { BABYEYI_FONT_STACK } from "../../../theme/babyeyiDashboardTheme";
import { SM_NAVY } from "../utils/schoolManagerTheme";
import SmStatCard from "./SmStatCard";
import { DEPARTMENTS } from "../utils/hrCenterConstants";

const API = import.meta.env.VITE_API_URL || "http://localhost:5100";
const FONT = BABYEYI_FONT_STACK;
const PAGE_SIZE = 5;

function StatusBadge({ status }) {
  const s = String(status || "").toLowerCase();
  const active = (s.includes("active") || s === "") && !s.includes("leave") && !s.includes("inactive");
  const leave = s.includes("leave");
  const cls = leave
    ? "bg-amber-100 text-[#000435] border border-amber-200"
    : active
      ? "bg-[#000435] text-amber-400"
      : "bg-[#000435]/10 text-[#000435]/70";
  const label = leave ? "On Leave" : active ? "Active" : status || "Inactive";
  return (
    <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold ${cls}`}>
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
      className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold ${
        yes ? "bg-amber-400/20 text-[#000435] border border-amber-300" : "bg-[#000435]/8 text-[#000435]/50"
      }`}
    >
      {yes ? "Avance allowed" : "No avance"}
    </span>
  );
}

function ShuleAvancePolicyModal({ open, onClose, maxPercent, onChange, onSave, saving }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[5000] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(0,4,53,0.82)", backdropFilter: "blur(8px)" }}
      onClick={(e) => e.target === e.currentTarget && !saving && onClose()}
    >
      <div
        className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 sm:px-6 pt-6 pb-4" style={{ background: SM_NAVY }}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-amber-400 flex items-center justify-center shrink-0">
                <Wallet size={22} className="text-[#000435]" strokeWidth={2.25} />
              </div>
              <div>
                <h2 className="text-lg font-black text-white">Shule Avance policy</h2>
                <p className="text-xs text-amber-300/80 mt-0.5">Salary advance limits for staff</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="p-5 sm:p-6 space-y-5">
          <p className="text-sm text-[#000435]/70 leading-relaxed">
            Set the maximum advance each staff member can request per month as a percentage of their net salary.
            Enable &quot;Shule Avance&quot; individually when adding or editing staff payroll.
          </p>

          <div className="rounded-2xl border border-[#000435]/10 bg-amber-50/50 p-4">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[#000435]/50 mb-2">
              Max % of net salary
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={100}
                value={Math.min(100, Math.max(1, Number(maxPercent) || 25))}
                onChange={(e) => onChange(e.target.value)}
                className="flex-1 h-2 accent-amber-400"
              />
              <div className="w-16 h-12 rounded-xl border border-[#000435]/15 bg-white flex items-center justify-center">
                <span className="text-lg font-black text-[#000435] tabular-nums">{maxPercent}%</span>
              </div>
            </div>
            <input
              type="number"
              min={1}
              max={100}
              value={maxPercent}
              onChange={(e) => onChange(e.target.value)}
              className="mt-3 w-full h-11 px-3 rounded-xl border border-[#000435]/15 text-sm font-bold text-[#000435] focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              disabled={saving}
              onClick={onClose}
              className="flex-1 h-11 rounded-xl border border-[#000435]/15 text-sm font-bold text-[#000435]/70 hover:bg-[#000435]/5"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={onSave}
              className="flex-1 h-11 rounded-xl bg-[#000435] text-amber-400 text-sm font-black hover:bg-[#000435]/90 disabled:opacity-60 inline-flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Settings2 size={16} />}
              {saving ? "Saving…" : "Save policy"}
            </button>
          </div>
        </div>
      </div>
    </div>
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
  const [policyModalOpen, setPolicyModalOpen] = useState(false);

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
      setPolicyModalOpen(false);
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
    <div className="space-y-5 sm:space-y-6 anim -mx-1 sm:mx-0 min-h-0" style={{ fontFamily: FONT }}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-[26px] font-black text-[#000435] tracking-tight">HR Center</h1>
          <p className="text-sm text-[#000435]/50 mt-1">Manage your staff and HR operations.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setPolicyModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[#000435]/15 bg-white text-[#000435] text-sm font-bold hover:border-amber-300 hover:bg-amber-50/50 transition-all w-full sm:w-auto"
          >
            <Wallet size={18} strokeWidth={2} />
            Shule Avance policy
          </button>
          <button
            type="button"
            onClick={() => setWizardOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-400 text-[#000435] text-sm font-bold shadow-md shadow-amber-500/25 hover:bg-amber-300 active:scale-[0.98] transition-all w-full sm:w-auto shrink-0"
          >
            <UserPlus size={18} strokeWidth={2.25} />
            Add Staff
          </button>
        </div>
      </div>

      {/* Policy summary card */}
      <button
        type="button"
        onClick={() => setPolicyModalOpen(true)}
        className="w-full text-left rounded-2xl border border-[#000435]/10 bg-gradient-to-r from-[#000435] to-[#000435]/95 p-4 sm:p-5 shadow-sm hover:shadow-md transition-all group"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-amber-400 flex items-center justify-center shrink-0">
              <Wallet size={22} className="text-[#000435]" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-amber-400/90">Shule Avance</p>
              <p className="text-white font-black text-lg mt-0.5">Max {advanceMaxPercent}% of net salary</p>
              <p className="text-white/50 text-xs mt-1 truncate">Tap to configure advance policy for all staff</p>
            </div>
          </div>
          <Settings2 size={20} className="text-amber-400/70 group-hover:text-amber-400 shrink-0 transition-colors" />
        </div>
      </button>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <SmStatCard label="Total Staff" value={stats.total} sub="All active staff" />
        <SmStatCard label="Active Staff" value={stats.active} sub="Currently working" />
        <SmStatCard label="New This Month" value={stats.newMonth} sub="Recently added" />
        <SmStatCard label="On Leave" value={stats.onLeave} sub="Currently on leave" />
      </div>

      {/* Staff list card */}
      <div className="rounded-2xl sm:rounded-3xl bg-white border border-[#000435]/10 shadow-sm overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-[#000435]/8 bg-[#000435]/[0.02]">
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
                  className="w-full h-10 pl-9 pr-3 rounded-xl border border-[#000435]/15 bg-white text-sm text-[#000435] placeholder:text-[#000435]/35 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/15"
                />
              </div>
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="h-10 px-3 rounded-xl border border-[#000435]/15 bg-white text-sm font-medium text-[#000435] outline-none focus:border-amber-400 sm:min-w-[160px]"
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
                  <tr className="border-b border-[#000435]/8 text-[11px] font-bold uppercase tracking-wider text-[#000435]/45 bg-[#000435]/[0.03]">
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
                    <tr key={row.id} className="hover:bg-amber-50/40 transition-colors cursor-pointer" onClick={() => setViewStaff(row)}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#000435] text-amber-400 flex items-center justify-center text-xs font-bold shrink-0">
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
                      <td className="px-4 py-4 text-right relative" onClick={(e) => e.stopPropagation()}>
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
                  <div className="w-10 h-10 rounded-full bg-[#000435] text-amber-400 flex items-center justify-center text-xs font-bold shrink-0">
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

      <ShuleAvancePolicyModal
        open={policyModalOpen}
        onClose={() => !policySaving && setPolicyModalOpen(false)}
        maxPercent={advanceMaxPercent}
        onChange={setAdvanceMaxPercent}
        onSave={saveAdvancePolicy}
        saving={policySaving}
      />

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
