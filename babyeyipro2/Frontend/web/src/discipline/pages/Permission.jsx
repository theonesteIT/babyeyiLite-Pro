import { useState, useEffect } from "react";
import api from "../services/api";
import {
  Eye, Pencil, Trash2, X, Check, Ban, Search, Shield, AlertTriangle, CheckCircle2,
  ArrowUpRight, ArrowDownLeft, ClipboardList, Stethoscope, Scale, DoorOpen, BookOpen,
  Home, Building2, Hospital, Bell, UserRoundCheck, GraduationCap, Plus, Save,
} from "lucide-react";

const theme = {
  navy: "#000435",
  amber: "#F59E0B",
  amberLight: "#FCD34D",
  amberDark: "#D97706",
  white: "#FFFFFF",
  gray50: "#F9FAFB",
  gray100: "#F3F4F6",
  gray200: "#E5E7EB",
  gray600: "#4B5563",
  gray700: "#374151",
  gray900: "#111827",
};

const statusConfig = {
  Approved: { color: "#10B981", bg: "#D1FAE5", icon: "●", label: "Approved" },
  Pending: { color: "#F59E0B", bg: "#FEF3C7", icon: "●", label: "Pending" },
  Denied: { color: "#EF4444", bg: "#FEE2E2", icon: "●", label: "Denied" },
  Out: { color: "#3B82F6", bg: "#DBEAFE", icon: "out", label: "Out" },
  Returned: { color: "#6B7280", bg: "#F3F4F6", icon: "returned", label: "Returned" },
  Overdue: { color: "#DC2626", bg: "#FEE2E2", icon: "overdue", label: "Overdue" },
};

const STEPS = ["Search Student", "Permission Details", "Time Control", "Authorization", "Confirmation"];
const backendStatusToUi = {
  APPROVED: "Approved",
  PENDING: "Pending",
  REJECTED: "Denied",
  CANCELLED: "Denied",
};
const uiTypeToBackend = {
  Medical: "MEDICAL",
  "Leave School": "OFFICIAL",
  "Leave Class": "OTHER",
  Discipline: "OTHER",
  Other: "OTHER",
};
const backendTypeToUi = {
  MEDICAL: "Medical",
  FAMILY: "Family",
  OFFICIAL: "Official",
  OTHER: "Other",
};
const uiStatusToBackend = {
  Approved: ["APPROVED"],
  Pending: ["PENDING"],
  Denied: ["REJECTED", "CANCELLED"],
  Out: ["APPROVED"],
  Returned: ["APPROVED"],
  Overdue: ["APPROVED"],
};

const formatDateOnly = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
};

const formatTimeOnly = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
};

const toDateTimeLocal = (date, time) => {
  if (!date || !time) return null;
  const cleanDate = String(date).trim();
  const cleanTime = String(time).trim().slice(0, 5);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) return null;
  if (!/^\d{2}:\d{2}$/.test(cleanTime)) return null;
  return `${cleanDate} ${cleanTime}:00`;
};

const todayLocalDate = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const parseReasonBlob = (text) => {
  const raw = String(text || "");
  const parts = raw.split("|").map((p) => p.trim()).filter(Boolean);
  const tagged = (prefix) => {
    const hit = parts.find((p) => p.toLowerCase().startsWith(prefix.toLowerCase()));
    return hit ? hit.slice(prefix.length).trim() : "";
  };
  return {
    destination: tagged("Destination:"),
    destinationAddress: tagged("Address:"),
    customType: tagged("[Other Type:").replace(/\]$/, "").trim(),
    reasonText: parts
      .filter((p) => !/^Destination:/i.test(p) && !/^Address:/i.test(p) && !/^\[Other Type:/i.test(p))
      .join(" | "),
  };
};

const getStatusIcon = (iconKey, color = "#111827") => {
  if (iconKey === "out") return <ArrowUpRight size={11} color={color} />;
  if (iconKey === "returned") return <ArrowDownLeft size={11} color={color} />;
  if (iconKey === "overdue") return <AlertTriangle size={11} color={color} />;
  return <CheckCircle2 size={11} color={color} />;
};

export default function PermissionManagement() {
  const [permissions, setPermissions] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [step, setStep] = useState(0);
  const [formMode, setFormMode] = useState("create");
  const [editingPermission, setEditingPermission] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterClass, setFilterClass] = useState("All");
  const [filterDate, setFilterDate] = useState("");
  const [formData, setFormData] = useState({
    studentCode: "", studentName: "", selectedStudent: null,
    type: "", reason: "", destination: "", destinationAddress: "", priority: "Normal",
    date: todayLocalDate(), timeOut: "", returnTime: "",
    notReturning: false, expectedReturnDate: "",
    customType: "",
    parentNotified: false, comment: "",
  });
  const [suggestions, setSuggestions] = useState([]);
  const [toast, setToast] = useState(null);
  const [selectedPermission, setSelectedPermission] = useState(null);
  const [detailsMode, setDetailsMode] = useState("view");
  const [actionLoading, setActionLoading] = useState(false);
  const [reportPeriod, setReportPeriod] = useState("month");
  const [exceededReport, setExceededReport] = useState({ totals: { today: { exceeded_count: 0, exceeded_minutes_total: 0 }, week: { exceeded_count: 0, exceeded_minutes_total: 0 }, month: { exceeded_count: 0, exceeded_minutes_total: 0 } }, data: [] });
  const [exceededOnly, setExceededOnly] = useState(false);

  const resetForm = () => {
    setFormData({ studentCode: "", studentName: "", selectedStudent: null, type: "", reason: "", destination: "", destinationAddress: "", priority: "Normal", date: todayLocalDate(), timeOut: "", returnTime: "", notReturning: false, expectedReturnDate: "", customType: "", parentNotified: false, comment: "" });
  };

  const closeFormModal = () => {
    setShowModal(false);
    setStep(0);
    setFormMode("create");
    setEditingPermission(null);
    resetForm();
  };

  const openCreateModal = () => {
    setFormMode("create");
    setEditingPermission(null);
    setStep(0);
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (perm) => {
    const selectedStudent = students.find((s) => s.code === perm.code) || {
      id: perm.studentId,
      code: perm.code,
      name: perm.student,
      class: perm.class,
      hasActivePermission: false,
      status: "Active",
    };
    const parsed = parseReasonBlob(perm.reason);
    const mappedType = backendTypeToUi[String(perm.permissionType || "").toUpperCase()] || perm.type || "Other";
    setFormMode("edit");
    setEditingPermission(perm);
    setStep(0);
    setFormData({
      studentCode: selectedStudent?.code || "",
      studentName: selectedStudent?.name || "",
      selectedStudent,
      type: mappedType,
      reason: parsed.reasonText || "",
      destination: parsed.destination || "",
      destinationAddress: parsed.destinationAddress || "",
      priority: "Normal",
      date: formatDateOnly(perm.startsAt) || todayLocalDate(),
      timeOut: formatTimeOnly(perm.startsAt) || "",
      returnTime: formatTimeOnly(perm.endsAt) || "",
      notReturning: false,
      expectedReturnDate: "",
      customType: mappedType === "Other" ? parsed.customType : "",
      parentNotified: false,
      comment: "",
    });
    setShowModal(true);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [permRes, studentsRes, exceededRes] = await Promise.all([
        api.get("/permissions"),
        api.get("/students", { params: { limit: 200 } }),
        api.get("/discipline/permissions/exceeded-report", { params: { period: reportPeriod } }),
      ]);

      const backendPermissions = permRes?.data?.data || [];
      const now = new Date();
      const mappedPermissions = backendPermissions.map((p) => {
        const start = new Date(p.starts_at);
        const end = new Date(p.ends_at);
        let status = backendStatusToUi[p.status] || "Pending";
        if (p.status === "APPROVED") {
          if (String(p.gate_scan_state || "") === "EXCEEDED") status = "Overdue";
          else if (String(p.gate_scan_state || "") === "BACK") status = "Returned";
          else if (String(p.gate_scan_state || "") === "OUT") status = "Out";
          else if (now >= start && now <= end) status = "Out";
          else if (now > end) status = "Returned";
        }
        return {
          id: `PERM-${String(p.id).padStart(6, "0")}`,
          studentId: p.student_id,
          student: `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Unknown",
          code: p.student_uid || String(p.student_id || ""),
          class: p.class_name || "N/A",
          type: backendTypeToUi[p.permission_type] || "Other",
          permissionType: p.permission_type || "OTHER",
          reason: p.reason || "—",
          timeOut: formatTimeOnly(p.starts_at),
          returnTime: formatTimeOnly(p.ends_at),
          status,
          date: formatDateOnly(p.starts_at),
          rawId: p.id,
          backendStatus: p.status,
          startsAt: p.starts_at,
          endsAt: p.ends_at,
          actualReturnAt: p.actual_return_at || null,
          submittedBy: `${p.req_first || ""} ${p.req_last || ""}`.trim() || "System",
          exceededMinutes: Number(p.exceeded_minutes || 0),
          gateState: p.gate_scan_state || "NOT_USED",
        };
      });

      setPermissions(mappedPermissions);
      setExceededReport({
        totals: exceededRes?.data?.totals || {
          today: { exceeded_count: 0, exceeded_minutes_total: 0 },
          week: { exceeded_count: 0, exceeded_minutes_total: 0 },
          month: { exceeded_count: 0, exceeded_minutes_total: 0 },
        },
        data: exceededRes?.data?.data || [],
      });

      const activeIds = new Set(
        backendPermissions
          .filter((p) => p.status === "APPROVED" && now >= new Date(p.starts_at) && now <= new Date(p.ends_at))
          .map((p) => p.student_id)
      );
      const mappedStudents = (studentsRes?.data?.data || []).map((s) => ({
        id: s.id,
        code: s.student_uid || s.student_code || String(s.id),
        name: `${s.first_name || ""} ${s.last_name || ""}`.trim() || "Unknown",
        class: s.class_name || "N/A",
        status: "Active",
        hasActivePermission: activeIds.has(s.id),
      }));
      setStudents(mappedStudents);
    } catch (error) {
      console.error("Failed to load permission data", error);
      showToast("Failed to load backend data", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [reportPeriod]);

  const formatExceeded = (mins) => {
    const total = Number(mins || 0);
    if (!total) return "0m";
    const d = Math.floor(total / 1440);
    const h = Math.floor((total % 1440) / 60);
    const m = total % 60;
    const parts = [];
    if (d) parts.push(`${d}d`);
    if (h) parts.push(`${h}h`);
    if (m || parts.length === 0) parts.push(`${m}m`);
    return parts.join(" ");
  };

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleStudentSearch = (val) => {
    setFormData(p => ({ ...p, studentCode: val, selectedStudent: null }));
    if (val.length > 1) {
      setSuggestions(students.filter(s =>
        s.name.toLowerCase().includes(val.toLowerCase()) ||
        s.code.toLowerCase().includes(val.toLowerCase())
      ));
    } else setSuggestions([]);
  };

  const selectStudent = (s) => {
    setFormData(p => ({ ...p, selectedStudent: s, studentCode: s.code, studentName: s.name }));
    setSuggestions([]);
  };

  const nextStep = () => {
    if (step === 0 && !formData.selectedStudent) return showToast("Please select a student first", "error");
    if (formMode === "create" && step === 0 && formData.selectedStudent?.hasActivePermission) return showToast("Student already has an active permission!", "error");
    if (step === 1 && !formData.type) return showToast("Please select permission type", "error");
    if (step === 1 && !formData.destination) return showToast("Please select destination", "error");
    if (step === 1 && !formData.destinationAddress.trim()) return showToast("Please enter destination address", "error");
    if (step === 1 && formData.type === "Other" && !formData.customType.trim()) return showToast("Please provide custom permission type", "error");
    if (step === 2 && !formData.timeOut) return showToast("Please set time out", "error");
    if (step === 2 && formData.notReturning && !formData.expectedReturnDate) return showToast("Please set expected return date", "error");
    if (step < STEPS.length - 1) setStep(s => s + 1);
  };

  const prevStep = () => setStep(s => s - 1);

  const submitPermission = async () => {
    if (!formData.selectedStudent?.id) return showToast("Please select a student first", "error");
    const startsAt = toDateTimeLocal(formData.date, formData.timeOut);
    const endDate = formData.notReturning ? (formData.expectedReturnDate || formData.date) : formData.date;
    const effectiveReturn = formData.notReturning ? (formData.returnTime || "23:59") : formData.returnTime;
    const endsAt = toDateTimeLocal(endDate, effectiveReturn);
    if (!startsAt || !endsAt) return showToast("Please provide valid time values", "error");

    setSubmitting(true);
    try {
      const payload = {
        student_id: formData.selectedStudent.id,
        starts_at: startsAt,
        ends_at: endsAt,
        permission_type: uiTypeToBackend[formData.type] || "OTHER",
        reason: [
          formData.type === "Other" && formData.customType.trim() ? `[Other Type: ${formData.customType.trim()}]` : "",
          formData.reason || "",
          formData.destination ? `Destination: ${formData.destination}` : "",
          formData.destinationAddress ? `Address: ${formData.destinationAddress}` : "",
        ].filter(Boolean).join(" | "),
      };
      const isEdit = formMode === "edit" && editingPermission?.rawId;
      const res = isEdit
        ? await api.put(`/permissions/${editingPermission.rawId}`, payload)
        : await api.post("/permissions", payload);
      if (res?.data?.success) {
        closeFormModal();
        await fetchData();
        showToast(isEdit ? "Permission updated successfully" : "Permission created successfully");
      } else {
        showToast(isEdit ? "Failed to update permission" : "Failed to create permission", "error");
      }
    } catch (error) {
      console.error("Failed to submit permission", error);
      showToast(formMode === "edit" ? "Failed to update permission" : "Failed to create permission", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = permissions.filter(p => {
    const matchSearch = p.student.toLowerCase().includes(search.toLowerCase()) || p.code.toLowerCase().includes(search.toLowerCase());
    const allowedBackendStatuses = uiStatusToBackend[filterStatus];
    const matchStatus = filterStatus === "All" || (allowedBackendStatuses ? allowedBackendStatuses.includes(p.backendStatus) : p.status === filterStatus);
    const matchClass = filterClass === "All" || p.class === filterClass;
    const matchDate = !filterDate || p.date === filterDate;
    const matchExceeded = !exceededOnly || Number(p.exceededMinutes || 0) > 0 || p.gateState === "EXCEEDED";
    return matchSearch && matchStatus && matchClass && matchDate && matchExceeded;
  });

  const statusCounts = Object.keys(statusConfig).reduce((acc, k) => {
    acc[k] = permissions.filter(p => p.status === k).length;
    return acc;
  }, {});

  const updatePermissionStatus = async (perm, backendStatus) => {
    if (!perm?.rawId) return;
    setActionLoading(true);
    try {
      const res = await api.patch(`/permissions/${perm.rawId}/status`, { status: backendStatus });
      if (res?.data?.success) {
        showToast(`Permission ${backendStatus.toLowerCase()} successfully`);
        await fetchData();
        setSelectedPermission(null);
      } else {
        showToast("Failed to update permission status", "error");
      }
    } catch (error) {
      console.error("Failed to update permission status", error);
      showToast("Failed to update permission status", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeletePermission = async (perm) => {
    if (perm?.backendStatus === "CANCELLED") return;
    const confirmed = window.confirm(`Cancel permission ${perm.id}?`);
    if (!confirmed) return;
    await updatePermissionStatus(perm, "CANCELLED");
  };

  return (
    <div style={{ fontFamily: "'Montserrat', sans-serif", background: "#F0F2F8", minHeight: "100vh", fontWeight: 500 }}>
      <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", top: 24, right: 24, zIndex: 9999, background: toast.type === "error" ? "#EF4444" : "#10B981", color: "#fff", padding: "14px 24px", borderRadius: 12, fontWeight: 600, fontSize: 14, boxShadow: "0 8px 32px rgba(0,0,0,0.2)", animation: "slideIn 0.3s ease" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            {toast.type === "error" ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
            {toast.msg}
          </span>
        </div>
      )}

      {/* Header */}
      <div style={{ background: theme.navy, padding: "0 32px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64, boxShadow: "0 4px 20px rgba(0,4,53,0.4)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, background: theme.amber, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <GraduationCap size={18} color={theme.navy} />
          </div>
          <div>
            <div style={{ color: theme.white, fontWeight: 800, fontSize: 16, letterSpacing: "0.5px" }}>EduGate</div>
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 10, fontWeight: 500, letterSpacing: "1px", textTransform: "uppercase" }}>Permission Control</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <select style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", padding: "6px 12px", borderRadius: 8, fontSize: 13, fontFamily: "Montserrat" }}>
            <option>2024-2025</option>
          </select>
          <select style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", padding: "6px 12px", borderRadius: 8, fontSize: 13, fontFamily: "Montserrat" }}>
            <option>Term 2</option><option>Term 1</option><option>Term 3</option>
          </select>
          <div style={{ width: 36, height: 36, background: theme.amber, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: theme.navy, fontSize: 14 }}>DM</div>
        </div>
      </div>

      <div style={{ padding: "28px 32px", maxWidth: 1400, margin: "0 auto" }}>
        {/* Page Title */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: theme.navy, letterSpacing: "-0.5px" }}>Student Permission Control</h1>
          <p style={{ margin: "4px 0 0", color: theme.gray600, fontSize: 14, fontWeight: 500 }}>Discipline Office · {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
        </div>

        {/* Stats Row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12, marginBottom: 24 }}>
          {Object.entries(statusConfig).map(([key, cfg]) => (
            <div key={key} onClick={() => setFilterStatus(filterStatus === key ? "All" : key)} style={{ background: filterStatus === key ? cfg.bg : "#fff", border: `2px solid ${filterStatus === key ? cfg.color : "#E5E7EB"}`, borderRadius: 12, padding: "14px 16px", cursor: "pointer", transition: "all 0.2s" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: cfg.color }}>{statusCounts[key] || 0}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: theme.gray600, textTransform: "uppercase", letterSpacing: "0.5px", marginTop: 2 }}>{cfg.label}</div>
            </div>
          ))}
        </div>

        {/* Exceeded Report */}
        <div style={{ background: "#fff", borderRadius: 16, padding: "16px 20px", marginBottom: 20, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
            <div style={{ fontWeight: 800, color: theme.navy, fontSize: 14, display: "inline-flex", alignItems: "center", gap: 8 }}>
              <AlertTriangle size={15} color="#DC2626" />
              Discipline Exceeded Report
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {["today", "week", "month"].map((p) => (
                <button key={p} onClick={() => setReportPeriod(p)} style={{ border: `1px solid ${reportPeriod === p ? theme.navy : "#E5E7EB"}`, background: reportPeriod === p ? theme.navy : "#fff", color: reportPeriod === p ? "#fff" : theme.gray700, borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontWeight: 700, fontSize: 12, textTransform: "capitalize", fontFamily: "Montserrat" }}>
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
            {[
              ["Today", exceededReport.totals?.today],
              ["Week", exceededReport.totals?.week],
              ["Month", exceededReport.totals?.month],
            ].map(([label, t]) => (
              <div key={label} style={{ border: "1px solid #F1F5F9", borderRadius: 10, padding: "10px 12px", background: "#FAFAFA" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: theme.gray600, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
                <div style={{ marginTop: 4, fontSize: 18, fontWeight: 800, color: "#DC2626" }}>{Number(t?.exceeded_count || 0)}</div>
                <div style={{ fontSize: 12, color: theme.gray700, fontWeight: 600 }}>{formatExceeded(t?.exceeded_minutes_total || 0)} total exceeded</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12, maxHeight: 140, overflowY: "auto", borderTop: "1px solid #F3F4F6", paddingTop: 10 }}>
            {(exceededReport.data || []).slice(0, 6).map((row) => (
              <div key={row.student_id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "6px 0", borderBottom: "1px dashed #F3F4F6" }}>
                <span style={{ color: theme.navy, fontWeight: 700 }}>{row.student_name} <span style={{ color: theme.gray600, fontWeight: 600 }}>({row.class_name || "N/A"})</span></span>
                <span style={{ color: "#B91C1C", fontWeight: 800 }}>{formatExceeded(row.exceeded_minutes_total)} · {row.exceeded_count}x</span>
              </div>
            ))}
            {(!exceededReport.data || exceededReport.data.length === 0) && (
              <div style={{ fontSize: 12, color: theme.gray600, fontWeight: 600 }}>No exceeded records in selected period.</div>
            )}
          </div>
        </div>

        {/* Toolbar */}
        <div style={{ background: "#fff", borderRadius: 16, padding: "16px 20px", marginBottom: 20, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
            <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: theme.gray600 }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or code..." style={{ width: "100%", padding: "10px 12px 10px 36px", border: "2px solid #E5E7EB", borderRadius: 10, fontSize: 14, fontFamily: "Montserrat", outline: "none", boxSizing: "border-box" }} />
          </div>
          <select value={filterClass} onChange={e => setFilterClass(e.target.value)} style={{ padding: "10px 14px", border: "2px solid #E5E7EB", borderRadius: 10, fontSize: 14, fontFamily: "Montserrat", outline: "none", color: theme.gray700 }}>
            <option value="All">All Classes</option>
            {[...new Set(permissions.map((p) => p.class).filter(Boolean))].map((cls) => (
              <option key={cls} value={cls}>{cls}</option>
            ))}
          </select>
          <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} style={{ padding: "10px 14px", border: "2px solid #E5E7EB", borderRadius: 10, fontSize: 14, fontFamily: "Montserrat", outline: "none", color: theme.gray700 }} />
          <button onClick={() => setExceededOnly(v => !v)} style={{ padding: "10px 14px", border: `2px solid ${exceededOnly ? "#DC2626" : "#E5E7EB"}`, borderRadius: 10, fontSize: 13, fontFamily: "Montserrat", outline: "none", color: exceededOnly ? "#fff" : theme.gray700, background: exceededOnly ? "#DC2626" : "#fff", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
            <AlertTriangle size={14} />
            {exceededOnly ? "Exceeded Only: ON" : "Exceeded Only"}
          </button>
          <button onClick={openCreateModal} style={{ background: `linear-gradient(135deg, ${theme.amber}, ${theme.amberDark})`, color: theme.navy, border: "none", padding: "10px 20px", borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontFamily: "Montserrat", whiteSpace: "nowrap", boxShadow: "0 4px 12px rgba(245,158,11,0.4)" }}>
            <Plus size={16} /> Create Permission
          </button>
        </div>

        {/* Table */}
        <div style={{ background: "#fff", borderRadius: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: theme.navy }}>
                  {["Permission ID", "Student", "Class", "Type", "Reason", "Time Out", "Return", "Status", "Actions"].map(h => (
                    <th key={h} style={{ padding: "14px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: "0.8px", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => {
                  const cfg = statusConfig[p.status];
                  return (
                    <tr key={p.id} style={{ borderBottom: "1px solid #F3F4F6", background: i % 2 === 0 ? "#fff" : "#FAFAFA", transition: "background 0.15s" }}
                      onMouseEnter={e => e.currentTarget.style.background = "#FFF8E7"}
                      onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? "#fff" : "#FAFAFA"}>
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{ fontWeight: 700, fontSize: 12, color: theme.navy, fontFamily: "monospace" }}>{p.id}</span>
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 34, height: 34, background: `linear-gradient(135deg, ${theme.navy}, #001080)`, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: theme.amber, fontWeight: 700, fontSize: 12 }}>
                            {p.student.split(" ").map(w => w[0]).join("").slice(0, 2)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 14, color: theme.navy }}>{p.student}</div>
                            <div style={{ fontSize: 11, color: theme.gray600 }}>{p.code}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: 13, fontWeight: 600, color: theme.gray700 }}>{p.class}</td>
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{ fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 20, background: "#EEF2FF", color: "#4338CA" }}>{p.type}</span>
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: 13, color: theme.gray600, maxWidth: 160 }}>
                        <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.reason}</div>
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: 13, fontWeight: 600, color: theme.navy }}>{p.timeOut}</td>
                      <td style={{ padding: "14px 16px", fontSize: 13, fontWeight: 600, color: theme.navy }}>{p.returnTime}</td>
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 20, background: cfg.bg, color: cfg.color, fontSize: 12, fontWeight: 700 }}>
                          {getStatusIcon(cfg.icon, cfg.color)}{cfg.label}
                        </span>
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            onClick={() => {
                              setDetailsMode("view");
                              setSelectedPermission(p);
                            }}
                            style={{ padding: "6px 8px", background: "#EEF2FF", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}
                            title="View"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            onClick={() => {
                              if (p.backendStatus === "CANCELLED") return;
                              openEditModal(p);
                            }}
                            disabled={p.backendStatus === "CANCELLED"}
                            style={{ padding: "6px 8px", background: p.backendStatus === "CANCELLED" ? "#F3F4F6" : "#FEF3C7", border: "none", borderRadius: 8, cursor: p.backendStatus === "CANCELLED" ? "not-allowed" : "pointer", opacity: p.backendStatus === "CANCELLED" ? 0.6 : 1, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}
                            title={p.backendStatus === "CANCELLED" ? "Already cancelled" : "Edit Status"}
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => handleDeletePermission(p)}
                            disabled={p.backendStatus === "CANCELLED"}
                            style={{ padding: "6px 8px", background: p.backendStatus === "CANCELLED" ? "#F3F4F6" : "#FEE2E2", border: "none", borderRadius: 8, cursor: p.backendStatus === "CANCELLED" ? "not-allowed" : "pointer", opacity: p.backendStatus === "CANCELLED" ? 0.6 : 1, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}
                            title={p.backendStatus === "CANCELLED" ? "Already cancelled" : "Cancel"}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div style={{ padding: 60, textAlign: "center", color: theme.gray600 }}>
              <div style={{ marginBottom: 12, display: "flex", justifyContent: "center" }}><ClipboardList size={44} color="#9CA3AF" /></div>
              <div style={{ fontWeight: 600 }}>No permissions found</div>
            </div>
          )}
          <div style={{ padding: "14px 20px", borderTop: "1px solid #F3F4F6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, color: theme.gray600, fontWeight: 500 }}>Showing {filtered.length} of {permissions.length} records</span>
            <div style={{ display: "flex", gap: 8 }}>
              {[1, 2, 3].map(n => (
                <button key={n} style={{ width: 32, height: 32, background: n === 1 ? theme.navy : "#fff", color: n === 1 ? "#fff" : theme.gray700, border: "1px solid #E5E7EB", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13, fontFamily: "Montserrat" }}>{n}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,4,53,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20, backdropFilter: "blur(4px)" }}>
          <div style={{ background: "#fff", borderRadius: 24, width: "100%", maxWidth: 620, maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 32px 80px rgba(0,4,53,0.4)" }}>
            {/* Modal Header */}
            <div style={{ background: theme.navy, padding: "24px 28px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ color: theme.amber, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 4 }}>
                  {formMode === "edit" ? "Edit Permission" : "New Permission"}
                </div>
                <div style={{ color: "#fff", fontWeight: 800, fontSize: 18 }}>{STEPS[step]}</div>
              </div>
              <button onClick={closeFormModal} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", width: 36, height: 36, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={18} /></button>
            </div>

            {/* Step Progress */}
            <div style={{ padding: "16px 28px", background: "#F9FAFB", borderBottom: "1px solid #E5E7EB" }}>
              <div style={{ display: "flex", gap: 0 }}>
                {STEPS.map((s, i) => (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
                      {i > 0 && <div style={{ flex: 1, height: 2, background: i <= step ? theme.amber : "#E5E7EB" }} />}
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: i < step ? theme.amber : i === step ? theme.navy : "#E5E7EB", color: i < step ? theme.navy : i === step ? "#fff" : "#9CA3AF", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
                        {i < step ? <Check size={14} /> : i + 1}
                      </div>
                      {i < STEPS.length - 1 && <div style={{ flex: 1, height: 2, background: i < step ? theme.amber : "#E5E7EB" }} />}
                    </div>
                    <div style={{ fontSize: 9, fontWeight: 600, color: i === step ? theme.navy : "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.5px", textAlign: "center" }}>{s}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Body */}
            <div style={{ padding: "28px", overflowY: "auto", flex: 1 }}>
              {/* Step 1 */}
              {step === 0 && (
                <div>
                  <label style={labelStyle}>Student Code or Name</label>
                  <div style={{ position: "relative" }}>
                    <input value={formData.studentCode} disabled={formMode === "edit"} onChange={e => handleStudentSearch(e.target.value)} placeholder="Type code or name (e.g. S001 or Ishimwe)" style={{ ...inputStyle, background: formMode === "edit" ? "#F3F4F6" : "#fff", cursor: formMode === "edit" ? "not-allowed" : "text" }} />
                    {suggestions.length > 0 && (
                      <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "2px solid #E5E7EB", borderRadius: 12, zIndex: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.1)", marginTop: 4 }}>
                        {suggestions.map(s => (
                          <div key={s.code} onClick={() => selectStudent(s)} style={{ padding: "12px 16px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #F3F4F6" }}
                            onMouseEnter={e => e.currentTarget.style.background = "#FFF8E7"}
                            onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 14, color: theme.navy }}>{s.name}</div>
                              <div style={{ fontSize: 12, color: theme.gray600 }}>{s.code} · {s.class}</div>
                            </div>
                            {s.hasActivePermission && <span style={{ fontSize: 11, background: "#FEE2E2", color: "#EF4444", padding: "3px 8px", borderRadius: 20, fontWeight: 600 }}>Active</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {formData.selectedStudent && (
                    <div style={{ marginTop: 20, padding: 20, background: "#F0F9FF", border: "2px solid #BAE6FD", borderRadius: 16 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                        <div style={{ width: 56, height: 56, background: `linear-gradient(135deg, ${theme.navy}, #001080)`, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: theme.amber, fontWeight: 800, fontSize: 18 }}>
                          {formData.selectedStudent.name.split(" ").map(w => w[0]).join("").slice(0, 2)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 18, color: theme.navy }}>{formData.selectedStudent.name}</div>
                          <div style={{ fontSize: 13, color: theme.gray600, marginTop: 2 }}>Class: {formData.selectedStudent.class} · Code: {formData.selectedStudent.code}</div>
                          <span style={{ marginTop: 6, display: "inline-block", fontSize: 12, background: "#D1FAE5", color: "#10B981", padding: "3px 10px", borderRadius: 20, fontWeight: 600 }}>● {formData.selectedStudent.status}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Step 2 */}
              {step === 1 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                  <div>
                    <label style={labelStyle}>Permission Type</label>
                    <select value={formData.type} onChange={e => setFormData(p => ({ ...p, type: e.target.value }))} style={inputStyle}>
                      <option value="">Select permission type</option>
                      <option value="Leave School">Leave School</option>
                      <option value="Leave Class">Leave Class</option>
                      <option value="Medical">Medical</option>
                      <option value="Discipline">Discipline</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  {formData.type === "Other" && (
                    <div>
                      <label style={labelStyle}>Custom Type</label>
                      <input
                        value={formData.customType}
                        onChange={e => setFormData(p => ({ ...p, customType: e.target.value }))}
                        placeholder="Enter custom permission type"
                        style={inputStyle}
                      />
                    </div>
                  )}
                  <div>
                    <label style={labelStyle}>Reason</label>
                    <textarea value={formData.reason} onChange={e => setFormData(p => ({ ...p, reason: e.target.value }))} placeholder="Describe the reason for permission..." rows={3} style={{ ...inputStyle, resize: "vertical" }} />
                  </div>
                  <div>
                    <label style={labelStyle}>Destination</label>
                    <select value={formData.destination} onChange={e => setFormData(p => ({ ...p, destination: e.target.value }))} style={inputStyle}>
                      <option value="">Select destination</option>
                      <option value="Home">Home</option>
                      <option value="Hospital">Hospital</option>
                      <option value="Office">Office</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  {formData.destination && (
                    <div>
                      <label style={labelStyle}>Address</label>
                      <input value={formData.destinationAddress} onChange={e => setFormData(p => ({ ...p, destinationAddress: e.target.value }))} placeholder="Enter destination address" style={inputStyle} />
                    </div>
                  )}
                  <div>
                    <label style={labelStyle}>Priority</label>
                    <div style={{ display: "flex", gap: 10 }}>
                      {["Normal", "Urgent"].map(pri => (
                        <div key={pri} onClick={() => setFormData(p => ({ ...p, priority: pri }))} style={{ flex: 1, padding: "12px", border: `2px solid ${formData.priority === pri ? (pri === "Urgent" ? "#EF4444" : theme.amber) : "#E5E7EB"}`, borderRadius: 10, cursor: "pointer", background: formData.priority === pri ? (pri === "Urgent" ? "#FEE2E2" : "#FFF8E7") : "#fff", fontWeight: 700, fontSize: 13, textAlign: "center", color: formData.priority === pri ? (pri === "Urgent" ? "#EF4444" : theme.navy) : theme.gray700 }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                            {pri === "Urgent" ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}
                            {pri}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3 */}
              {step === 2 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                  <div>
                    <label style={labelStyle}>Date</label>
                    <input type="date" value={formData.date} onChange={e => setFormData(p => ({ ...p, date: e.target.value }))} style={inputStyle} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    <div>
                      <label style={labelStyle}>Time Out</label>
                      <input type="time" value={formData.timeOut} onChange={e => setFormData(p => ({ ...p, timeOut: e.target.value }))} style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Expected Return</label>
                      <input type="time" value={formData.returnTime} onChange={e => setFormData(p => ({ ...p, returnTime: e.target.value }))} style={inputStyle} />
                    </div>
                  </div>
                  <div onClick={() => setFormData(p => ({ ...p, notReturning: !p.notReturning }))} style={{ display: "flex", alignItems: "center", gap: 12, padding: 16, border: `2px solid ${formData.notReturning ? "#EF4444" : "#E5E7EB"}`, borderRadius: 12, cursor: "pointer", background: formData.notReturning ? "#FEF2F2" : "#fff" }}>
                    <div style={{ width: 22, height: 22, borderRadius: 6, background: formData.notReturning ? "#EF4444" : "#fff", border: `2px solid ${formData.notReturning ? "#EF4444" : "#D1D5DB"}`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>{formData.notReturning ? <Check size={14} /> : ""}</div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: theme.navy }}>Not returning today</div>
                      <div style={{ fontSize: 12, color: theme.gray600 }}>Student will not return to school today</div>
                    </div>
                  </div>
                  {formData.notReturning && (
                    <div>
                      <label style={labelStyle}>Expected Return Date</label>
                      <input type="date" value={formData.expectedReturnDate} onChange={e => setFormData(p => ({ ...p, expectedReturnDate: e.target.value }))} style={inputStyle} />
                    </div>
                  )}
                </div>
              )}

              {/* Step 4 */}
              {step === 3 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                  <div onClick={() => setFormData(p => ({ ...p, parentNotified: !p.parentNotified }))} style={{ display: "flex", alignItems: "center", gap: 12, padding: 16, border: `2px solid ${formData.parentNotified ? "#10B981" : "#E5E7EB"}`, borderRadius: 12, cursor: "pointer", background: formData.parentNotified ? "#F0FDF4" : "#fff" }}>
                    <div style={{ width: 22, height: 22, borderRadius: 6, background: formData.parentNotified ? "#10B981" : "#fff", border: `2px solid ${formData.parentNotified ? "#10B981" : "#D1D5DB"}`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>{formData.parentNotified ? <Check size={14} /> : ""}</div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: theme.navy, display: "inline-flex", alignItems: "center", gap: 6 }}><Bell size={14} /> Parent Notified via SMS</div>
                      <div style={{ fontSize: 12, color: theme.gray600 }}>Send: "Your child left school at {formData.timeOut || '--:--'}"</div>
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Comment (Optional)</label>
                    <textarea value={formData.comment} onChange={e => setFormData(p => ({ ...p, comment: e.target.value }))} placeholder="Add any additional notes..." rows={3} style={{ ...inputStyle, resize: "vertical" }} />
                  </div>
                </div>
              )}

              {/* Step 5 */}
              {step === 4 && (
                <div>
                  <div style={{ background: "#F9FAFB", borderRadius: 16, padding: 20, border: "2px solid #E5E7EB" }}>
                    <div style={{ fontWeight: 700, fontSize: 16, color: theme.navy, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                      <ClipboardList size={18} /> Permission Summary
                    </div>
                    {[
                      ["Student", `${formData.selectedStudent?.name} (${formData.selectedStudent?.code})`],
                      ["Class", formData.selectedStudent?.class],
                      ["Type", formData.type === "Other" && formData.customType ? `Other - ${formData.customType}` : formData.type],
                      ["Destination", formData.destination],
                      ["Priority", formData.priority],
                      ["Reason", formData.reason],
                      ["Date", formData.date],
                      ["Time Out", formData.timeOut],
                      ["Return", formData.notReturning ? `${formData.expectedReturnDate || "Expected date not set"} ${formData.returnTime || ""}`.trim() : formData.returnTime],
                      ["Parent Notified", formData.parentNotified ? "Yes" : "No"],
                    ].map(([k, v]) => (
                      <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #E5E7EB", fontSize: 14 }}>
                        <span style={{ color: theme.gray600, fontWeight: 500 }}>{k}</span>
                        <span style={{ color: theme.navy, fontWeight: 600, textAlign: "right", maxWidth: "60%" }}>{v || "—"}</span>
                      </div>
                    ))}
                  </div>
                  {formData.priority === "Urgent" && (
                    <div style={{ marginTop: 16, padding: 14, background: "#FEF2F2", border: "2px solid #FCA5A5", borderRadius: 12, display: "flex", alignItems: "center", gap: 10 }}>
                      <AlertTriangle size={20} color="#DC2626" />
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#DC2626" }}>This is an URGENT permission. Immediate action required.</div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ padding: "20px 28px", borderTop: "1px solid #E5E7EB", display: "flex", justifyContent: "space-between", gap: 12 }}>
              <button onClick={prevStep} disabled={step === 0 || submitting} style={{ padding: "12px 24px", border: "2px solid #E5E7EB", borderRadius: 12, background: "#fff", color: theme.gray700, fontWeight: 600, fontSize: 14, cursor: step === 0 || submitting ? "not-allowed" : "pointer", opacity: step === 0 || submitting ? 0.5 : 1, fontFamily: "Montserrat" }}>
                ← Back
              </button>
              {step < STEPS.length - 1 ? (
                <button onClick={nextStep} style={{ padding: "12px 28px", background: `linear-gradient(135deg, ${theme.amber}, ${theme.amberDark})`, border: "none", borderRadius: 12, color: theme.navy, fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "Montserrat", boxShadow: "0 4px 12px rgba(245,158,11,0.4)" }}>
                  Continue →
                </button>
              ) : (
                <button onClick={submitPermission} disabled={submitting} style={{ padding: "12px 28px", background: `linear-gradient(135deg, #10B981, #059669)`, border: "none", borderRadius: 12, color: "#fff", fontWeight: 700, fontSize: 14, cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.7 : 1, fontFamily: "Montserrat", boxShadow: "0 4px 12px rgba(16,185,129,0.4)", display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <Save size={15} />
                  {submitting ? "Saving..." : formMode === "edit" ? "Update Permission" : "Confirm Permission"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(255,255,255,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1200 }}>
          <div style={{ background: "#fff", padding: "12px 16px", borderRadius: 12, fontWeight: 700, color: theme.navy, boxShadow: "0 6px 18px rgba(0,0,0,0.12)" }}>
            Loading backend data...
          </div>
        </div>
      )}

      {selectedPermission && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,4,53,0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1300, padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 560, boxShadow: "0 20px 50px rgba(0,0,0,0.25)", overflow: "hidden" }}>
            <div style={{ background: theme.navy, color: "#fff", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 11, opacity: 0.7, textTransform: "uppercase", letterSpacing: 1 }}>{detailsMode === "edit" ? "Update Permission" : "Permission Details"}</div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{selectedPermission.id}</div>
              </div>
              <button onClick={() => setSelectedPermission(null)} style={{ width: 32, height: 32, borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.15)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: 20, display: "grid", gap: 10 }}>
              <div style={detailsRowStyle}><strong>Student</strong><span>{selectedPermission.student} ({selectedPermission.code})</span></div>
              <div style={detailsRowStyle}><strong>Class</strong><span>{selectedPermission.class}</span></div>
              <div style={detailsRowStyle}><strong>Type</strong><span>{selectedPermission.type}</span></div>
              <div style={detailsRowStyle}><strong>Reason</strong><span>{selectedPermission.reason}</span></div>
              <div style={detailsRowStyle}><strong>Starts</strong><span>{new Date(selectedPermission.startsAt).toLocaleString()}</span></div>
              <div style={detailsRowStyle}><strong>Ends</strong><span>{new Date(selectedPermission.endsAt).toLocaleString()}</span></div>
              <div style={detailsRowStyle}><strong>Returned At</strong><span>{selectedPermission.actualReturnAt ? new Date(selectedPermission.actualReturnAt).toLocaleString() : "Not yet returned"}</span></div>
              <div style={detailsRowStyle}><strong>Status</strong><span>{selectedPermission.backendStatus}</span></div>
              <div style={detailsRowStyle}><strong>Submitted By</strong><span>{selectedPermission.submittedBy || "System"}</span></div>
            </div>

            {detailsMode === "edit" && (
              <div style={{ padding: "0 20px 20px", display: "flex", gap: 10, flexWrap: "wrap" }}>
                {selectedPermission.backendStatus === "PENDING" && (
                  <>
                    <button disabled={actionLoading} onClick={() => updatePermissionStatus(selectedPermission, "APPROVED")} style={{ ...actionBtnStyle, background: "#DCFCE7", color: "#166534" }}>
                      <Check size={14} /> Approve
                    </button>
                    <button disabled={actionLoading} onClick={() => updatePermissionStatus(selectedPermission, "REJECTED")} style={{ ...actionBtnStyle, background: "#FEE2E2", color: "#991B1B" }}>
                      <X size={14} /> Reject
                    </button>
                  </>
                )}
                {selectedPermission.backendStatus !== "CANCELLED" && (
                  <button disabled={actionLoading} onClick={() => updatePermissionStatus(selectedPermission, "CANCELLED")} style={{ ...actionBtnStyle, background: "#FFE4E6", color: "#9F1239" }}>
                    <Ban size={14} /> Cancel
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
        * { box-sizing: border-box; }
        input[type="date"]::-webkit-calendar-picker-indicator, input[type="time"]::-webkit-calendar-picker-indicator { cursor: pointer; }
        select option { color: #374151; }
      `}</style>
    </div>
  );
}

const labelStyle = { display: "block", fontWeight: 700, fontSize: 12, color: "#374151", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 8 };
const inputStyle = { width: "100%", padding: "12px 14px", border: "2px solid #E5E7EB", borderRadius: 12, fontSize: 14, fontFamily: "'Montserrat', sans-serif", outline: "none", color: "#111827", transition: "border-color 0.2s" };
const detailsRowStyle = { display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13, borderBottom: "1px solid #F3F4F6", paddingBottom: 8 };
const actionBtnStyle = { border: "none", borderRadius: 10, padding: "8px 12px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 700, fontFamily: "Montserrat" };