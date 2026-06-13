import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  PlusCircle,
  ChevronDown,
  Search,
  CircleAlert,
  CircleCheck,
  Eye,
  Save,
  Send,
  FileText,
  CalendarDays,
  X,
  RefreshCw,
  Pencil,
  TriangleAlert,
  Info,
  Bell,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  createSchoolBudget,
  extractApiError,
  fetchSchoolBudget,
  fetchSchoolBudgetOptions,
  fetchSchoolBudgets,
  updateSchoolBudget,
} from "../services/schoolBudgetApi";
import BudgetIncomeSourcesSection from "../components/BudgetIncomeSourcesSection";
import BudgetViewModal from "../components/BudgetViewModal";
import { BudgetCodeBadge } from "../components/IncomeSourceIcon";
import {
  computeBudgetIncomeSummary,
  computeIncomeSource,
  incomeSourceDisplayName,
  mapIncomeFromApi,
  mapIncomeToPayload,
} from "../utils/budgetIncomeConfig";
import { useIsMobile } from "../utils/useIsMobile";
import api from "../services/api";
import BudgetAlertsModal from "@/shared/BudgetAlertsModal";
import BudgetFilterBar from "@/shared/BudgetFilterBar";
import { fetchBudgetLines } from "../services/budgetLineApi";
import { DEPARTMENTS } from "../utils/budgetLineConstants";
import { setSelectedBudgetId } from "../utils/selectedSchoolBudget";
import SchoolBudgetPageShell from "../components/SchoolBudgetPageShell";
import {
  sbPageTitleClass,
  sbPageSubtitleClass,
  sbInput,
  sbLabel,
} from "../utils/schoolBudgetTypography";

const COLORS = {
  navy: "#000435",
  amber: "#F59E0B",
  amberLight: "#FDE68A",
  white: "#FFFFFF",
  gray50: "#F9FAFB",
  gray100: "#F3F4F6",
  gray200: "#E5E7EB",
  gray400: "#9CA3AF",
  gray600: "#4B5563",
  gray800: "#1F2937",
  green: "#10B981",
  red: "#EF4444",
};

const EMPTY_LIST_FILTERS = { search: "", academicYear: "", term: "", status: "", department: "" };

const ACCOUNTANT_STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "pending_approval", label: "Pending Approval" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "closed", label: "Closed" },
];

const FLBL = {
  display: "block",
  ...sbLabel,
  marginBottom: 6,
};
const FINP = {
  width: "100%",
  boxSizing: "border-box",
  border: `1px solid ${COLORS.gray200}`,
  borderRadius: 8,
  padding: "10px 12px",
  ...sbInput,
  color: COLORS.navy,
  background: COLORS.white,
};



function formatDateInput(val) {
  if (!val) return "";
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return String(val).slice(0, 10);
  return d.toISOString().slice(0, 10);
}

function staffDisplayName(staff) {
  if (!staff) return "";
  const parts = [staff.first_name, staff.last_name].filter(Boolean);
  if (parts.length) return parts.join(" ");
  return staff.full_name || staff.name || staff.email || "";
}

function statusBadgeStyle(status) {
  const s = String(status || "").toLowerCase();
  if (s === "approved") return { bg: "#D1FAE5", color: "#065F46" };
  if (s === "pending_approval") return { bg: "#FEF3C7", color: "#92400E" };
  if (s === "rejected") return { bg: "#FEE2E2", color: "#991B1B" };
  if (s === "closed") return { bg: COLORS.gray100, color: COLORS.gray600 };
  return { bg: "#EFF6FF", color: "#1E40AF" };
}

function SearchableSelect({ label, value, onChange, options = [], placeholder, required, disabled }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef(null);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => String(o).toLowerCase().includes(q)) : options;
  }, [options, query]);

  useEffect(() => {
    const h = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <label style={FLBL}>
        {label}
        {required ? " *" : ""}
      </label>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        style={{
          ...FINP,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.7 : 1,
          color: value ? COLORS.navy : COLORS.gray400,
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {value || placeholder}
        </span>
        <ChevronDown size={16} color={COLORS.gray400} />
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            zIndex: 60,
            top: "100%",
            left: 0,
            right: 0,
            marginTop: 4,
            background: COLORS.white,
            border: `1px solid ${COLORS.gray200}`,
            borderRadius: 10,
            boxShadow: "0 8px 24px rgba(0,4,53,0.12)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 10px",
              borderBottom: `1px solid ${COLORS.gray100}`,
            }}
          >
            <Search size={14} color={COLORS.gray400} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search..."
              style={{ flex: 1, border: "none", outline: "none", fontSize: 13, color: COLORS.navy }}
            />
          </div>
          <div style={{ maxHeight: 220, overflowY: "auto" }}>
            {filtered.length === 0 ? (
              <div style={{ padding: "12px 14px", fontSize: 12, color: COLORS.gray400 }}>
                No matches
              </div>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    onChange(opt);
                    setOpen(false);
                    setQuery("");
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "10px 14px",
                    border: "none",
                    background: value === opt ? "#FEF3C7" : COLORS.white,
                    color: COLORS.navy,
                    fontSize: 13,
                    cursor: "pointer",
                    fontWeight: value === opt ? 700 : 400,
                  }}
                >
                  {opt}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function BudgetSummaryPanel({ fmt, incomeSummary, totalAllocated, overAllocated }) {
  const totalIncome = incomeSummary?.netIncome ?? 0;
  const grossIncome = incomeSummary?.grossIncome ?? 0;
  const totalDeductions = incomeSummary?.totalDeductionsImpact ?? 0;
  const remaining = totalIncome - totalAllocated;
  const usagePct = totalIncome > 0 ? Math.round((totalAllocated / totalIncome) * 100) : 0;
  return (
    <div
      style={{
        position: "sticky",
        top: 16,
        background: COLORS.navy,
        borderRadius: 14,
        padding: 20,
        color: COLORS.white,
        alignSelf: "flex-start",
        border: `1px solid ${COLORS.navy}`,
      }}
    >
      <div style={{ fontWeight: 500, fontSize: 14, color: COLORS.amber, marginBottom: 16 }}>
        Budget Summary
      </div>
      {[
        { label: "Total gross income", value: fmt(grossIncome), color: COLORS.amberLight },
        { label: "Total deductions", value: fmt(totalDeductions), color: "#FCA5A5" },
        { label: "Total net budget income", value: fmt(totalIncome), color: COLORS.amber },
        { label: "Total allocated", value: fmt(totalAllocated), color: COLORS.white },
        { label: "Remaining balance", value: fmt(remaining), color: remaining >= 0 ? COLORS.green : COLORS.red },
        { label: "Budget usage", value: `${usagePct}%`, color: usagePct > 100 ? COLORS.red : COLORS.amberLight },
      ].map((row) => (
        <div
          key={row.label}
          style={{
            background: "rgba(255,255,255,0.06)",
            borderRadius: 8,
            padding: "12px 14px",
            marginBottom: 10,
          }}
        >
          <div style={{ fontSize: 10, color: COLORS.amberLight, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {row.label}
          </div>
          <div style={{ fontSize: 18, fontWeight: 500, color: row.color, marginTop: 4 }}>
            {row.value}
          </div>
        </div>
      ))}
      {overAllocated && (
        <div
          style={{
            marginTop: 8,
            padding: "10px 12px",
            background: "rgba(239,68,68,0.15)",
            borderRadius: 8,
            border: `1px solid ${COLORS.red}`,
            display: "flex",
            gap: 8,
            alignItems: "flex-start",
          }}
        >
          <CircleAlert size={16} color={COLORS.red} style={{ flexShrink: 0, marginTop: 2 }} />
          <span style={{ fontSize: 11, color: "#FCA5A5", lineHeight: 1.4 }}>
            Allocated amount exceeds expected income. Reduce allocations before saving.
          </span>
        </div>
      )}
      <div style={{ marginTop: 14 }}>
        <div style={{ fontSize: 10, color: COLORS.amberLight, marginBottom: 6 }}>Usage Progress</div>
        <div style={{ background: "rgba(255,255,255,0.12)", borderRadius: 99, height: 8, overflow: "hidden" }}>
          <div
            style={{
              width: `${Math.min(usagePct, 100)}%`,
              height: "100%",
              background: overAllocated ? COLORS.red : COLORS.amber,
              borderRadius: 99,
              transition: "width 0.3s",
            }}
          />
        </div>
      </div>
    </div>
  );
}

function buildFormFromBudget(budget, preparedByFallback) {
  const incomes =
    budget?.incomeSources?.length > 0
      ? budget.incomeSources.map((row) => mapIncomeFromApi(row))
      : [];
  return {
    title: budget?.title || "",
    budgetCode: budget?.budgetCode || "",
    academicYear: budget?.academicYear || "",
    term: budget?.term || "",
    budgetType: budget?.budgetType || "Term Budget",
    status: budget?.status || "draft",
    startDate: formatDateInput(budget?.startDate),
    endDate: formatDateInput(budget?.endDate),
    description: budget?.description || "",
    approvalNotes: budget?.approvalNotes || "",
    preparedByName: budget?.preparedByName || preparedByFallback || "",
    incomes,
  };
}

function BudgetCard({ budget, fmt, onView, onEdit, isMobile }) {
  const badge = statusBadgeStyle(budget.status);
  const statusKey = String(budget.status || "").toLowerCase();
  const canEdit = ["draft", "rejected"].includes(statusKey);
  const continueLabel = statusKey === "draft" ? "Continue draft" : "Continue editing";

  return (
    <div
      style={{
        background: COLORS.white,
        borderRadius: 12,
        border: `1px solid ${COLORS.gray200}`,
        padding: "14px 16px",
        boxShadow: "0 1px 3px rgba(0,4,53,0.06)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ marginBottom: 8 }}>
            <BudgetCodeBadge code={budget.budgetCode} compact />
          </div>
          <div style={{ fontWeight: 500, color: COLORS.navy, fontSize: 14, wordBreak: "break-word" }}>
            {budget.title}
          </div>
        </div>
        <span
          style={{
            background: badge.bg,
            color: badge.color,
            borderRadius: 20,
            padding: "3px 10px",
            fontSize: 10,
            fontWeight: 500,
            flexShrink: 0,
          }}
        >
          {budget.statusLabel || budget.status}
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12, color: COLORS.gray600, marginBottom: 10 }}>
        <div>
          <span style={{ color: COLORS.gray400 }}>Year</span>
          <div style={{ fontWeight: 500, color: COLORS.navy }}>{budget.academicYear}</div>
        </div>
        <div>
          <span style={{ color: COLORS.gray400 }}>Term</span>
          <div style={{ fontWeight: 500, color: COLORS.navy }}>{budget.term}</div>
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <span style={{ color: COLORS.gray400 }}>Expected income</span>
          <div style={{ fontWeight: 500, color: COLORS.navy, fontSize: 15 }}>{fmt(budget.totalExpectedIncome || 0)}</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => onView(budget)}
          style={{
            flex: isMobile ? "1 1 calc(50% - 4px)" : undefined,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            padding: "8px 12px",
            border: `1px solid ${COLORS.amber}`,
            borderRadius: 8,
            background: COLORS.white,
            color: COLORS.navy,
            fontSize: 12,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          <Eye size={14} />
          View
        </button>
        {canEdit && (
          <button
            type="button"
            onClick={() => onEdit(budget)}
            style={{
              flex: isMobile ? "1 1 calc(50% - 4px)" : undefined,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              padding: "8px 12px",
              border: `1px solid ${COLORS.navy}`,
              borderRadius: 8,
              background: COLORS.white,
              color: COLORS.navy,
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            <Pencil size={14} />
            {continueLabel}
          </button>
        )}
      </div>
    </div>
  );
}

function BudgetModal({
  open,
  onClose,
  editBudget,
  fmt,
  staff,
  onSaved,
  isMobile,
}) {
  const [options, setOptions] = useState(null);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [previewMode, setPreviewMode] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState("");
  const errorBannerRef = useRef(null);
  const preparedFallback = staffDisplayName(staff);

  const [form, setForm] = useState(() => buildFormFromBudget(null, preparedFallback));

  const isEdit = Boolean(editBudget?.db_id);

  const loadOptions = useCallback(
    async (academicYear) => {
      setLoadingOptions(true);
      setError("");
      try {
        const data = await fetchSchoolBudgetOptions(academicYear || undefined);
        setOptions(data);
        if (!isEdit) {
          setForm((prev) => ({
            ...prev,
            budgetCode: data.nextBudgetCode || prev.budgetCode,
            academicYear: prev.academicYear || data.defaultAcademicYear || "",
            term: prev.term || data.defaultTerm || "",
            budgetType: prev.budgetType || data.budgetTypes?.[0] || "Term Budget",
            preparedByName: prev.preparedByName || preparedFallback,
          }));
        }
      } catch (e) {
        setError(e.message || "Failed to load form options");
      } finally {
        setLoadingOptions(false);
      }
    },
    [isEdit, preparedFallback]
  );

  useEffect(() => {
    if (!open) return;
    setPreviewMode(false);
    setError("");
    setSaveSuccess("");
    let cancelled = false;

    (async () => {
      let budgetRow = editBudget;
      if (editBudget?.db_id) {
        try {
          budgetRow = await fetchSchoolBudget(editBudget.db_id);
        } catch (e) {
          if (!cancelled) setError(e.message || "Failed to load budget for editing");
        }
      }
      if (cancelled) return;
      const initial = buildFormFromBudget(budgetRow, preparedFallback);
      setForm(initial);
      loadOptions(initial.academicYear);
    })();

    return () => {
      cancelled = true;
    };
  }, [open, editBudget, preparedFallback, loadOptions]);

  useEffect(() => {
    if (!open || !form.academicYear || isEdit) return;
    loadOptions(form.academicYear);
  }, [form.academicYear]); // eslint-disable-line react-hooks/exhaustive-deps

  const setField = (key, val) => setForm((prev) => ({ ...prev, [key]: val }));

  const incomeSummary = useMemo(() => computeBudgetIncomeSummary(form.incomes), [form.incomes]);
  const totalIncome = incomeSummary.netIncome;
  const totalAllocated = 0;
  const overAllocated = totalAllocated > totalIncome && totalIncome > 0;

  const statusOptions = useMemo(() => {
    if (options?.budgetStatuses?.length) return options.budgetStatuses;
    return [
      { value: "draft", label: "Draft" },
      { value: "pending_approval", label: "Pending Approval" },
      { value: "approved", label: "Approved" },
      { value: "rejected", label: "Rejected" },
      { value: "closed", label: "Closed" },
    ];
  }, [options]);

  const scrollToError = useCallback(() => {
    requestAnimationFrame(() => {
      errorBannerRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }, []);

  const validateDraft = useCallback(() => {
    if (!form.title.trim()) {
      return "Budget title is required — scroll up to Section 1 (Budget Information).";
    }
    if (!form.academicYear.trim()) return "Academic year is required";
    if (!form.term.trim()) return "Term is required";
    if (!form.budgetType.trim()) return "Budget type is required";
    return "";
  }, [form]);

  const validateSubmit = useCallback(() => {
    const draftMsg = validateDraft();
    if (draftMsg) return draftMsg;
    if (overAllocated) return "Allocated amount cannot exceed expected income";
    const validRows = form.incomes.filter((r) => r.incomeSource?.trim() || r.customSourceName?.trim());
    if (!validRows.length) return "Add at least one income source";
    for (const row of validRows) {
      const calc = computeIncomeSource(row);
      if (calc.grossAmount <= 0) {
        return `${incomeSourceDisplayName(row)} requires an expected gross amount`;
      }
      if (calc.netAmount <= 0) {
        return `${incomeSourceDisplayName(row)} must have a positive net expected income`;
      }
      if (!row.collectionFrequency?.trim()) {
        return `${incomeSourceDisplayName(row)} requires a collection frequency`;
      }
      if (!row.incomeSource?.trim() && !row.customSourceName?.trim()) {
        return "Custom source name is required";
      }
    }
    return "";
  }, [form, overAllocated, validateDraft]);

  const buildPayload = useCallback(
    (submit) => ({
      title: form.title.trim(),
      budgetCode: form.budgetCode.trim(),
      academicYear: form.academicYear.trim(),
      term: form.term.trim(),
      budgetType: form.budgetType,
      status: submit ? "pending_approval" : form.status || "draft",
      startDate: form.startDate || null,
      endDate: form.endDate || null,
      description: form.description.trim(),
      approvalNotes: "",
      preparedByName: preparedFallback,
      incomeSources: form.incomes
        .filter((r) => r.incomeSource?.trim() || r.customSourceName?.trim())
        .map((r) => mapIncomeToPayload(r)),
      submit,
      totalAllocated: 0,
    }),
    [form, preparedFallback]
  );

  const handleSave = async (submit) => {
    const msg = submit ? validateSubmit() : validateDraft();
    if (msg) {
      setError(msg);
      setSaveSuccess("");
      scrollToError();
      return;
    }
    setSaving(true);
    setError("");
    setSaveSuccess("");
    try {
      const payload = buildPayload(submit);
      let result;
      if (isEdit) {
        result = await updateSchoolBudget(editBudget.db_id, payload);
      } else {
        result = await createSchoolBudget(payload);
      }
      const successMsg = result?.message || (submit ? "Budget submitted for approval" : "Budget saved as draft");
      const savedId = result?.id ?? editBudget?.db_id;
      if (savedId) setSelectedBudgetId(savedId);
      onSaved(successMsg, savedId);
      onClose();
    } catch (e) {
      const errMsg = extractApiError(e, "Failed to save budget");
      setError(errMsg);
      scrollToError();
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const frequencyList = options?.collectionFrequencies || [];
  const categoryList = options?.incomeCategories || [];
  const incomeSourceList = options?.incomeSources || [];
  const yearList = options?.academicYears || [];
  const termList = options?.terms || [];
  const typeList = options?.budgetTypes || [];

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: COLORS.gray50,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          background: COLORS.white,
          width: "100%",
          height: "100dvh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            background: COLORS.navy,
            padding: isMobile ? "12px 16px" : "14px 28px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
            borderBottom: `3px solid ${COLORS.amber}`,
          }}
        >
          <div>
            <div style={{ fontSize: isMobile ? 16 : 20, fontWeight: 500, color: COLORS.amber }}>
              {isEdit ? "Edit School Budget" : "Create New School Budget"}
            </div>
            <div style={{ fontSize: 12, color: COLORS.amberLight, marginTop: 2 }}>
              {options?.schoolName || "School"} · {form.budgetCode || "—"}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.1)",
              border: "none",
              borderRadius: 8,
              padding: 8,
              cursor: "pointer",
              color: COLORS.white,
            }}
          >
            <X size={22} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: "auto", background: COLORS.gray50 }}>
          <div style={{ maxWidth: 1600, margin: "0 auto", padding: isMobile ? "16px" : "24px 28px" }}>
          {loadingOptions && (
            <div style={{ fontSize: 13, color: COLORS.gray400, marginBottom: 12 }}>Loading options…</div>
          )}
          {error && (
            <div
              ref={errorBannerRef}
              style={{
                marginBottom: 14,
                padding: "12px 14px",
                background: "#FEE2E2",
                borderRadius: 8,
                border: `1px solid ${COLORS.red}`,
                display: "flex",
                gap: 8,
                alignItems: "flex-start",
              }}
            >
              <CircleAlert size={18} color={COLORS.red} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: "#991B1B" }}>{error}</span>
            </div>
          )}

          {previewMode ? (
            <div>
              <div
                style={{
                  background: "#FEF3C7",
                  borderRadius: 10,
                  padding: "14px 16px",
                  marginBottom: 16,
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
                }}
              >
                <Info size={18} color="#92400E" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: "#78350F" }}>
                  Preview mode — review details before submitting for approval.
                </span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 300px", gap: 24 }}>
                <div>
                  <div style={{ fontWeight: 500, color: COLORS.navy, fontSize: 16, marginBottom: 12 }}>
                    {form.title || "Untitled Budget"}
                  </div>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginBottom: 16 }}>
                    <tbody>
                      {[
                        ["Budget Code", form.budgetCode],
                        ["Academic Year", form.academicYear],
                        ["Term", form.term],
                        ["Budget Type", form.budgetType],
                        ["Status", statusOptions.find((s) => s.value === form.status)?.label || form.status],
                        ["Period", `${form.startDate || "—"} → ${form.endDate || "—"}`],
                      ].map(([k, v]) => (
                        <tr key={k} style={{ borderBottom: `1px solid ${COLORS.gray100}` }}>
                          <td style={{ padding: "8px 0", color: COLORS.gray400, width: "40%" }}>{k}</td>
                          <td style={{ padding: "8px 0", fontWeight: 500, color: COLORS.navy }}>{v}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ fontWeight: 500, color: COLORS.navy, marginBottom: 8 }}>Income Sources</div>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: COLORS.navy }}>
                        {["Income source", "Gross amount", "Deductions", "Net amount", "Frequency"].map((h) => (
                          <th key={h} style={{ padding: "8px 12px", color: COLORS.white, textAlign: "left" }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {incomeSummary.rows.map((row, i) => (
                        <tr key={i} style={{ borderBottom: `1px solid ${COLORS.gray100}` }}>
                          <td style={{ padding: "8px 12px", color: COLORS.navy, fontWeight: 500 }}>
                            {row.name || incomeSourceDisplayName(row.source)}
                          </td>
                          <td style={{ padding: "8px 12px", color: COLORS.gray600 }}>{fmt(row.grossAmount)}</td>
                          <td style={{ padding: "8px 12px", color: COLORS.red }}>{fmt(row.totalDeductions)}</td>
                          <td style={{ padding: "8px 12px", fontWeight: 500, color: COLORS.amber }}>{fmt(row.netAmount)}</td>
                          <td style={{ padding: "8px 12px", color: COLORS.gray600 }}>{row.source.collectionFrequency || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {form.description && (
                    <div style={{ marginTop: 14 }}>
                      <div style={{ fontWeight: 500, color: COLORS.navy, fontSize: 13 }}>Description</div>
                      <div style={{ fontSize: 13, color: COLORS.gray600, marginTop: 4 }}>{form.description}</div>
                    </div>
                  )}
                </div>
                <BudgetSummaryPanel
                  fmt={fmt}
                  incomeSummary={incomeSummary}
                  totalAllocated={totalAllocated}
                  overAllocated={overAllocated}
                />
              </div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 300px", gap: 24, alignItems: "start" }}>
              <div>
                {/* Section 1 */}
                <div
                  style={{
                    background: COLORS.gray50,
                    borderRadius: 12,
                    padding: 18,
                    border: `1px solid ${COLORS.gray200}`,
                    marginBottom: 16,
                  }}
                >
                  <div
                    style={{
                      fontWeight: 500,
                      color: COLORS.navy,
                      fontSize: 14,
                      marginBottom: 14,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <CalendarDays size={18} color={COLORS.navy} />
                    Budget Information
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
                    <div style={{ gridColumn: isMobile ? undefined : "1 / -1" }}>
                      <label style={FLBL}>Budget Title *</label>
                      <input
                        value={form.title}
                        onChange={(e) => setField("title", e.target.value)}
                        placeholder="e.g. Term 1 Budget 2025–2026"
                        style={FINP}
                      />
                    </div>
                    <div>
                      <label style={FLBL}>Budget Code</label>
                      <input value={form.budgetCode} readOnly style={{ ...FINP, background: COLORS.gray100, fontWeight: 500 }} />
                    </div>
                    <div>
                      <SearchableSelect
                        label="Academic Year"
                        required
                        value={form.academicYear}
                        onChange={(v) => setField("academicYear", v)}
                        options={yearList}
                        placeholder="Select academic year"
                      />
                    </div>
                    <div>
                      <label style={FLBL}>Term *</label>
                      <select
                        value={form.term}
                        onChange={(e) => setField("term", e.target.value)}
                        style={FINP}
                      >
                        <option value="">Select term</option>
                        {termList.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={FLBL}>Budget Type *</label>
                      <select
                        value={form.budgetType}
                        onChange={(e) => setField("budgetType", e.target.value)}
                        style={FINP}
                      >
                        {typeList.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={FLBL}>Status</label>
                      <select
                        value={form.status}
                        onChange={(e) => setField("status", e.target.value)}
                        style={FINP}
                      >
                        {statusOptions.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={FLBL}>Start Date</label>
                      <input
                        type="date"
                        value={form.startDate}
                        onChange={(e) => setField("startDate", e.target.value)}
                        style={FINP}
                      />
                    </div>
                    <div>
                      <label style={FLBL}>End Date</label>
                      <input
                        type="date"
                        value={form.endDate}
                        onChange={(e) => setField("endDate", e.target.value)}
                        style={FINP}
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2 — Income sources */}
                <div
                  style={{
                    background: COLORS.white,
                    borderRadius: 12,
                    padding: 18,
                    border: `1px solid ${COLORS.gray200}`,
                    marginBottom: 16,
                  }}
                >
                  <BudgetIncomeSourcesSection
                    incomes={form.incomes}
                    onIncomesChange={(incomes) => setField("incomes", incomes)}
                    academicYear={form.academicYear}
                    term={form.term}
                    budgetType={form.budgetType}
                    frequencyList={frequencyList}
                    categoryList={categoryList}
                    incomeSourceOptions={incomeSourceList}
                    disabled={previewMode || saving}
                    isMobile={isMobile}
                    fmt={fmt}
                  />
                </div>

                {/* Section 4 - Notes */}
                <div
                  style={{
                    background: COLORS.gray50,
                    borderRadius: 12,
                    padding: 18,
                    border: `1px solid ${COLORS.gray200}`,
                  }}
                >
                  <div
                    style={{
                      fontWeight: 500,
                      color: COLORS.navy,
                      fontSize: 14,
                      marginBottom: 14,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <FileText size={18} color={COLORS.navy} />
                    Notes
                  </div>
                  <div>
                    <label style={FLBL}>Description</label>
                    <textarea
                      value={form.description}
                      onChange={(e) => setField("description", e.target.value)}
                      placeholder="Overall budget description and objectives"
                      rows={3}
                      style={{ ...FINP, resize: "vertical" }}
                    />
                  </div>
                </div>
              </div>

              {/* Section 3 - Sticky summary */}
              <BudgetSummaryPanel
                fmt={fmt}
                incomeSummary={incomeSummary}
                totalAllocated={totalAllocated}
                overAllocated={overAllocated}
              />
            </div>
          )}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            borderTop: `1px solid ${COLORS.gray200}`,
            padding: isMobile ? "12px 16px" : "14px 28px",
            display: "flex",
            flexDirection: "column",
            gap: 10,
            flexShrink: 0,
            background: COLORS.white,
            boxShadow: "0 -4px 20px rgba(0,4,53,0.06)",
          }}
        >
          {error && (
            <div
              style={{
                padding: "10px 12px",
                background: "#FEE2E2",
                borderRadius: 8,
                border: `1px solid ${COLORS.red}`,
                display: "flex",
                gap: 8,
                alignItems: "center",
                fontSize: 12,
                color: "#991B1B",
              }}
            >
              <CircleAlert size={16} color={COLORS.red} />
              <span>{error}</span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            style={{
              padding: "10px 18px",
              border: `2px solid ${COLORS.navy}`,
              borderRadius: 8,
              background: COLORS.white,
              color: COLORS.navy,
              fontWeight: 500,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          {previewMode ? (
            <button
              type="button"
              onClick={() => setPreviewMode(false)}
              style={{
                padding: "10px 18px",
                border: `2px solid ${COLORS.gray200}`,
                borderRadius: 8,
                background: COLORS.white,
                color: COLORS.gray600,
                fontWeight: 500,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              Back to Edit
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                const msg = validateSubmit();
                if (msg) {
                  setError(msg);
                  scrollToError();
                  return;
                }
                setPreviewMode(true);
                setError("");
              }}
              style={{
                padding: "10px 18px",
                border: `2px solid ${COLORS.amber}`,
                borderRadius: 8,
                background: COLORS.white,
                color: COLORS.navy,
                fontWeight: 500,
                fontSize: 13,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Eye size={16} />
              Preview Budget
            </button>
          )}
          <button
            type="button"
            disabled={saving || overAllocated}
            onClick={() => handleSave(false)}
            style={{
              padding: "10px 18px",
              border: `2px solid ${COLORS.navy}`,
              borderRadius: 8,
              background: COLORS.white,
              color: COLORS.navy,
              fontWeight: 500,
              fontSize: 13,
              cursor: saving || overAllocated ? "not-allowed" : "pointer",
              opacity: saving || overAllocated ? 0.6 : 1,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Save size={16} />
            {saving ? "Saving…" : "Save Draft"}
          </button>
          <button
            type="button"
            disabled={saving || overAllocated}
            onClick={() => handleSave(true)}
            style={{
              padding: "10px 20px",
              border: "none",
              borderRadius: 8,
              background: COLORS.amber,
              color: COLORS.navy,
              fontWeight: 500,
              fontSize: 13,
              cursor: saving || overAllocated ? "not-allowed" : "pointer",
              opacity: saving || overAllocated ? 0.6 : 1,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Send size={16} />
            {saving ? "Submitting…" : "Submit Budget"}
          </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export function CreateBudgetPage({ fmt }) {
  const { staff } = useAuth();
  const isMobile = useIsMobile();
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [listFilters, setListFilters] = useState(EMPTY_LIST_FILTERS);
  const [filterOptions, setFilterOptions] = useState({ academicYears: [], terms: [] });
  const [budgetLines, setBudgetLines] = useState([]);
  const [alertsModalOpen, setAlertsModalOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editBudget, setEditBudget] = useState(null);
  const [viewBudgetId, setViewBudgetId] = useState(null);

  const loadBudgets = useCallback(async () => {
    setLoading(true);
    setListError("");
    try {
      const [data, options, lines] = await Promise.all([
        fetchSchoolBudgets(),
        fetchSchoolBudgetOptions().catch(() => ({ academicYears: [], terms: [] })),
        fetchBudgetLines().catch(() => []),
      ]);
      setBudgets(Array.isArray(data) ? data : []);
      setFilterOptions({
        academicYears: options?.academicYears || [],
        terms: options?.terms?.length ? options.terms : ["Term 1", "Term 2", "Term 3"],
      });
      setBudgetLines(Array.isArray(lines) ? lines : []);
    } catch (e) {
      setListError(e.message || "Failed to load budgets");
      setBudgets([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBudgets();
  }, [loadBudgets]);

  const openCreate = () => {
    setEditBudget(null);
    setSuccessMsg("");
    setModalOpen(true);
  };

  const openEdit = (budget) => {
    setEditBudget(budget);
    setSuccessMsg("");
    setModalOpen(true);
  };

  const openView = (budget) => {
    const id = budget?.db_id;
    if (id) setViewBudgetId(id);
  };

  const handleSaved = (msg, budgetId) => {
    setModalOpen(false);
    setEditBudget(null);
    setSuccessMsg(msg || "Budget saved successfully");
    if (budgetId) setSelectedBudgetId(budgetId);
    loadBudgets();
  };

  useEffect(() => {
    if (!successMsg) return undefined;
    const t = setTimeout(() => setSuccessMsg(""), 6000);
    return () => clearTimeout(t);
  }, [successMsg]);

  const budgetIdsForDepartment = useMemo(() => {
    if (!listFilters.department) return null;
    const ids = new Set();
    budgetLines.forEach((line) => {
      if (line.department === listFilters.department) {
        const bid = line.budgetId ?? line.budget_id;
        if (bid != null) ids.add(Number(bid));
      }
    });
    return ids;
  }, [budgetLines, listFilters.department]);

  const yearOptions = useMemo(() => {
    const set = new Set(filterOptions.academicYears || []);
    budgets.forEach((b) => { if (b.academicYear) set.add(b.academicYear); });
    return [...set].sort().reverse();
  }, [filterOptions.academicYears, budgets]);

  const termOptions = useMemo(() => {
    const set = new Set(filterOptions.terms || []);
    budgets.forEach((b) => { if (b.term) set.add(b.term); });
    return [...set];
  }, [filterOptions.terms, budgets]);

  const filteredBudgets = useMemo(() => {
    const q = listFilters.search.trim().toLowerCase();
    return budgets.filter((b) => {
      if (listFilters.academicYear && b.academicYear !== listFilters.academicYear) return false;
      if (listFilters.term && b.term !== listFilters.term) return false;
      if (listFilters.status && String(b.status || "").toLowerCase() !== listFilters.status) return false;
      if (budgetIdsForDepartment && !budgetIdsForDepartment.has(Number(b.db_id ?? b.id))) return false;
      if (q) {
        const hay = `${b.title} ${b.budgetCode} ${b.id} ${b.academicYear} ${b.term} ${b.budgetType}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [budgets, listFilters, budgetIdsForDepartment]);

  return (
    <SchoolBudgetPageShell>
      <div
        className="sb-page-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 20,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <h2 className={sbPageTitleClass} style={{ marginBottom: 4 }}>School Budgets</h2>
          <p className={sbPageSubtitleClass}>Create and manage school budgets for each academic period</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => setAlertsModalOpen(true)}
            style={{
              padding: "10px 16px",
              border: `1px solid ${COLORS.amber}66`,
              borderRadius: 8,
              background: "#FFFBEB",
              color: COLORS.navy,
              fontWeight: 500,
              fontSize: 13,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Bell size={16} color={COLORS.amber} />
            {isMobile ? "" : "Budget alerts"}
          </button>
          <button
            type="button"
            onClick={loadBudgets}
            disabled={loading}
            style={{
              padding: "10px 16px",
              border: `1px solid ${COLORS.gray200}`,
              borderRadius: 8,
              background: COLORS.white,
              color: COLORS.navy,
              fontWeight: 500,
              fontSize: 13,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <RefreshCw size={16} />
            {isMobile ? "" : "Refresh"}
          </button>
          <button
            type="button"
            onClick={openCreate}
            style={{
              padding: "10px 18px",
              border: "none",
              borderRadius: 8,
              background: COLORS.amber,
              color: COLORS.navy,
              fontWeight: 500,
              fontSize: 13,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              flex: isMobile ? "1 1 100%" : undefined,
            }}
          >
            <PlusCircle size={18} />
            {isMobile ? "New Budget" : "Create New School Budget"}
          </button>
        </div>
      </div>

      {listError && (
        <div
          style={{
            marginBottom: 14,
            padding: "12px 14px",
            background: "#FEE2E2",
            borderRadius: 8,
            display: "flex",
            gap: 8,
            alignItems: "center",
          }}
        >
          <TriangleAlert size={18} color={COLORS.red} />
          <span style={{ fontSize: 13, color: "#991B1B" }}>{listError}</span>
        </div>
      )}

      {successMsg && (
        <div
          style={{
            marginBottom: 14,
            padding: "12px 14px",
            background: "#D1FAE5",
            borderRadius: 8,
            border: `1px solid ${COLORS.green}`,
            display: "flex",
            gap: 8,
            alignItems: "center",
          }}
        >
          <CircleCheck size={18} color={COLORS.green} />
          <span style={{ fontSize: 13, color: "#065F46", fontWeight: 500 }}>{successMsg}</span>
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <BudgetFilterBar
          filters={listFilters}
          setFilters={setListFilters}
          years={yearOptions}
          terms={termOptions}
          statuses={ACCOUNTANT_STATUS_OPTIONS}
          departments={DEPARTMENTS}
          onClear={() => setListFilters(EMPTY_LIST_FILTERS)}
          searchPlaceholder="Search budgets by title, code, year…"
          navy={COLORS.navy}
          amber={COLORS.amber}
        />
      </div>

      <div
        style={{
          background: COLORS.white,
          borderRadius: 12,
          border: `1px solid ${COLORS.gray200}`,
          overflow: "hidden",
          padding: isMobile && !loading && filteredBudgets.length > 0 ? 12 : 0,
        }}
      >
        {isMobile ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {loading ? (
              <div style={{ padding: 24, textAlign: "center", color: COLORS.gray400 }}>Loading budgets…</div>
            ) : filteredBudgets.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center" }}>
                <div style={{ color: COLORS.gray400, fontSize: 13, marginBottom: 12 }}>
                  {budgets.length === 0
                    ? "No school budgets yet. Create your first budget to get started."
                    : "No budgets match this filter."}
                </div>
                <button
                  type="button"
                  onClick={openCreate}
                  style={{
                    padding: "8px 16px",
                    background: COLORS.amber,
                    color: COLORS.navy,
                    border: "none",
                    borderRadius: 8,
                    fontWeight: 500,
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  Create New School Budget
                </button>
              </div>
            ) : (
              filteredBudgets.map((b) => (
                <BudgetCard
                  key={b.db_id || b.id}
                  budget={b}
                  fmt={fmt}
                  onView={openView}
                  onEdit={openEdit}
                  isMobile={isMobile}
                />
              ))
            )}
          </div>
        ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: COLORS.navy }}>
              {["Code", "Title", "Academic Year", "Term", "Type", "Expected Income", "Status", "Actions"].map(
                (h) => (
                  <th
                    key={h}
                    style={{
                      padding: "12px 14px",
                      color: COLORS.white,
                      textAlign: "left",
                      fontWeight: 500,
                      fontSize: 12,
                    }}
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ padding: 24, textAlign: "center", color: COLORS.gray400 }}>
                  Loading budgets…
                </td>
              </tr>
            ) : filteredBudgets.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: 32, textAlign: "center" }}>
                  <div style={{ color: COLORS.gray400, fontSize: 13, marginBottom: 12 }}>
                    {budgets.length === 0
                      ? "No school budgets yet. Create your first budget to get started."
                      : "No budgets match this filter."}
                  </div>
                  <button
                    type="button"
                    onClick={openCreate}
                    style={{
                      padding: "8px 16px",
                      background: COLORS.amber,
                      color: COLORS.navy,
                      border: "none",
                      borderRadius: 8,
                      fontWeight: 500,
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    Create New School Budget
                  </button>
                </td>
              </tr>
            ) : (
              filteredBudgets.map((b, i) => {
                const badge = statusBadgeStyle(b.status);
                const statusKey = String(b.status || "").toLowerCase();
                const canEdit = ["draft", "rejected"].includes(statusKey);
                const continueLabel = statusKey === "draft" ? "Continue draft" : "Continue editing";
                return (
                  <tr
                    key={b.db_id || b.id || i}
                    style={{
                      borderBottom: `1px solid ${COLORS.gray100}`,
                      background: i % 2 === 0 ? COLORS.white : COLORS.gray50,
                    }}
                  >
                    <td style={{ padding: "11px 14px" }}>
                      <BudgetCodeBadge code={b.budgetCode} compact />
                    </td>
                    <td style={{ padding: "11px 14px", fontWeight: 500, color: COLORS.navy }}>{b.title}</td>
                    <td style={{ padding: "11px 14px", color: COLORS.gray600 }}>{b.academicYear}</td>
                    <td style={{ padding: "11px 14px", color: COLORS.gray600 }}>{b.term}</td>
                    <td style={{ padding: "11px 14px", color: COLORS.gray600 }}>{b.budgetType}</td>
                    <td style={{ padding: "11px 14px", fontWeight: 500, color: COLORS.navy }}>
                      {fmt(b.totalExpectedIncome || 0)}
                    </td>
                    <td style={{ padding: "11px 14px" }}>
                      <span
                        style={{
                          background: badge.bg,
                          color: badge.color,
                          borderRadius: 20,
                          padding: "3px 10px",
                          fontSize: 11,
                          fontWeight: 500,
                        }}
                      >
                        {b.statusLabel || b.status}
                      </span>
                    </td>
                    <td style={{ padding: "11px 14px" }}>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <button
                          type="button"
                          onClick={() => openView(b)}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            padding: "5px 10px",
                            border: `1px solid ${COLORS.amber}`,
                            borderRadius: 6,
                            background: COLORS.white,
                            color: COLORS.navy,
                            fontSize: 11,
                            fontWeight: 500,
                            cursor: "pointer",
                          }}
                        >
                          <Eye size={12} />
                          View
                        </button>
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => openEdit(b)}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              padding: "5px 10px",
                              border: `1px solid ${COLORS.navy}`,
                              borderRadius: 6,
                              background: COLORS.white,
                              color: COLORS.navy,
                              fontSize: 11,
                              fontWeight: 500,
                              cursor: "pointer",
                            }}
                          >
                            <Pencil size={12} />
                            {continueLabel}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        )}
      </div>

      {!loading && budgets.length > 0 && (
        <div
          style={{
            marginTop: 12,
            fontSize: 12,
            color: COLORS.gray400,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <CircleCheck size={14} color={COLORS.green} />
          {filteredBudgets.length} of {budgets.length} budget{budgets.length !== 1 ? "s" : ""} shown
        </div>
      )}

      <BudgetAlertsModal
        open={alertsModalOpen}
        onClose={() => setAlertsModalOpen(false)}
        api={api}
        alerts={[]}
        navy={COLORS.navy}
        amber={COLORS.amber}
      />

      <BudgetModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditBudget(null);
        }}
        editBudget={editBudget}
        fmt={fmt}
        staff={staff}
        onSaved={handleSaved}
        isMobile={isMobile}
      />

      <BudgetViewModal
        open={Boolean(viewBudgetId)}
        budgetId={viewBudgetId}
        onClose={() => setViewBudgetId(null)}
        fmt={fmt}
        isMobile={isMobile}
        onEdit={(b) => {
          setViewBudgetId(null);
          openEdit(b);
        }}
      />
    </SchoolBudgetPageShell>
  );
}
