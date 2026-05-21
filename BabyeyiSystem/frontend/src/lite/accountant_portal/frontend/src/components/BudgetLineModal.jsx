import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, CircleAlert, CircleCheck, Eye, Info, Save, X } from "lucide-react";
import {
  BUDGET_CATEGORIES,
  BUDGET_LINE_NAMES,
  COLORS,
  DEPARTMENTS,
  PRIORITY_LEVELS,
  APPROVAL_STATUSES,
} from "../utils/budgetLineConstants";
import { createBudgetLine, fetchBudgetLineOptions, fetchBudgetLinesSummary } from "../services/budgetLineApi";
import { useIsMobile } from "../utils/useIsMobile";

const FLBL = {
  display: "block",
  fontSize: 11,
  fontWeight: 700,
  color: COLORS.gray600,
  marginBottom: 6,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};
const FINP = {
  width: "100%",
  boxSizing: "border-box",
  border: `1px solid ${COLORS.gray200}`,
  borderRadius: 8,
  padding: "10px 12px",
  fontSize: 13,
  color: COLORS.navy,
  background: COLORS.white,
};

function parseAmt(v) {
  const n = Number(String(v || "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function SearchableSelect({ label, value, onChange, options = [], placeholder, required }) {
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
      {label && (
        <label style={FLBL}>
          {label}
          {required ? " *" : ""}
        </label>
      )}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          ...FINP,
          textAlign: "left",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          cursor: "pointer",
        }}
      >
        <span style={{ color: value ? COLORS.navy : COLORS.gray400 }}>{value || placeholder}</span>
        <ChevronDown size={16} color={COLORS.gray400} />
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            zIndex: 20,
            top: "100%",
            left: 0,
            right: 0,
            marginTop: 4,
            background: COLORS.white,
            border: `1px solid ${COLORS.gray200}`,
            borderRadius: 8,
            boxShadow: "0 8px 24px rgba(0,4,53,0.12)",
            maxHeight: 220,
            overflow: "hidden",
          }}
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            style={{ ...FINP, border: "none", borderBottom: `1px solid ${COLORS.gray100}`, borderRadius: 0 }}
          />
          <div style={{ maxHeight: 170, overflowY: "auto" }}>
            {filtered.map((opt) => (
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
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MonitoringPanel({ fmt, summary, lineAmount, lineName }) {
  const total = summary?.totalBudgetAmount ?? 0;
  const allocated = summary?.alreadyAllocated ?? 0;
  const afterLine = allocated + lineAmount;
  const remaining = total - afterLine;
  const usagePct = total > 0 ? Math.round((afterLine / total) * 100) : 0;
  const linePct = lineAmount > 0 && total > 0 ? Math.round((lineAmount / total) * 100) : 0;
  const over = remaining < 0;

  return (
    <div
      style={{
        background: COLORS.navy,
        borderRadius: 12,
        padding: 18,
        color: COLORS.white,
        position: "sticky",
        top: 0,
      }}
    >
      <div style={{ fontWeight: 800, fontSize: 14, color: COLORS.amber, marginBottom: 14 }}>
        Budget Control & Monitoring
      </div>
      {[
        { label: "Total Budget Amount", value: fmt(total) },
        { label: "Already Allocated", value: fmt(allocated) },
        { label: "This Line Amount", value: fmt(lineAmount), highlight: true },
        { label: "Remaining Balance", value: fmt(Math.max(remaining, 0)), warn: over },
        { label: "Available After Save", value: fmt(Math.max(remaining, 0)) },
      ].map((row) => (
        <div
          key={row.label}
          style={{
            background: "rgba(255,255,255,0.06)",
            borderRadius: 8,
            padding: "10px 12px",
            marginBottom: 8,
          }}
        >
          <div style={{ fontSize: 10, color: COLORS.amberLight, textTransform: "uppercase" }}>{row.label}</div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 800,
              color: row.warn ? COLORS.red : row.highlight ? COLORS.amber : COLORS.white,
              marginTop: 4,
            }}
          >
            {row.value}
          </div>
        </div>
      ))}
      <div style={{ marginTop: 12 }}>
        <div style={{ fontSize: 10, color: COLORS.amberLight, marginBottom: 6 }}>Budget Usage</div>
        <div style={{ background: "rgba(255,255,255,0.12)", borderRadius: 99, height: 8, overflow: "hidden" }}>
          <div
            style={{
              width: `${Math.min(usagePct, 100)}%`,
              height: "100%",
              background: over ? COLORS.red : usagePct >= 80 ? COLORS.amber : COLORS.green,
              borderRadius: 99,
            }}
          />
        </div>
        <div style={{ fontSize: 12, fontWeight: 700, marginTop: 6, color: over ? "#FCA5A5" : COLORS.amberLight }}>
          {usagePct}% of school budget allocated
        </div>
      </div>
      {lineName && lineAmount > 0 && (
        <div style={{ marginTop: 10, fontSize: 11, color: COLORS.amberLight }}>
          {lineName} allocation: {linePct}% of total budget
        </div>
      )}
      {over && (
        <div
          style={{
            marginTop: 12,
            padding: "10px 12px",
            background: "rgba(239,68,68,0.2)",
            borderRadius: 8,
            border: `1px solid ${COLORS.red}`,
            display: "flex",
            gap: 8,
            fontSize: 11,
          }}
        >
          <CircleAlert size={16} color={COLORS.red} />
          Warning: This allocation exceeds remaining balance.
        </div>
      )}
      {!over && usagePct >= 90 && total > 0 && (
        <div style={{ marginTop: 10, fontSize: 11, color: "#FDE68A" }}>
          Only {100 - usagePct}% of budget remains for this department.
        </div>
      )}
    </div>
  );
}

const emptyForm = (preparedBy) => ({
  lineName: "",
  customLineName: "",
  otherDescription: "",
  budgetCategory: "",
  department: "",
  priorityLevel: "Medium",
  plannedAmount: "",
  allocationDate: new Date().toISOString().slice(0, 10),
  description: "",
  notes: "",
  referenceNumber: "",
  reviewedByName: "",
  approvalStatus: "Pending",
  approvalNotes: "",
  preparedByName: preparedBy || "",
});

export default function BudgetLineModal({
  open,
  onClose,
  fmt,
  staff,
  budgetId,
  onSaved,
  previewOnly = false,
}) {
  const isMobile = useIsMobile();
  const [form, setForm] = useState(emptyForm(""));
  const [options, setOptions] = useState(null);
  const [summary, setSummary] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [preview, setPreview] = useState(false);

  const preparedBy = useMemo(() => {
    if (!staff) return "";
    const parts = [staff.first_name, staff.last_name].filter(Boolean);
    return parts.length ? parts.join(" ") : staff.full_name || staff.name || "";
  }, [staff]);

  const load = useCallback(async () => {
    if (!open) return;
    setError("");
    setSuccess("");
    setPreview(false);
    setForm(emptyForm(preparedBy));
    try {
      const data = await fetchBudgetLineOptions(budgetId);
      setOptions(data);
      const bid = budgetId || data?.activeBudget?.id;
      if (bid) {
        const sumRes = await fetchBudgetLinesSummary(bid);
        setSummary({
          totalBudgetAmount: sumRes.totalBudget,
          alreadyAllocated: sumRes.totalBudget - sumRes.remainingBalance,
          lines: sumRes.lines,
        });
      }
    } catch (e) {
      setError(e.message || "Failed to load form");
    }
  }, [open, budgetId, preparedBy]);

  useEffect(() => {
    load();
  }, [load]);

  const setField = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const isOther = form.lineName.toLowerCase() === "other";
  const lineAmount = parseAmt(form.plannedAmount);
  const displayLineName = isOther ? form.customLineName || "Other" : form.lineName;

  const activeBudgetId = budgetId || options?.activeBudget?.id;

  const validate = () => {
    if (!activeBudgetId) return "No active school budget. Create or approve a budget first.";
    if (!form.lineName.trim()) return "Select a budget line name";
    if (isOther && !form.customLineName.trim()) return "Custom budget line name is required";
    if (!form.budgetCategory) return "Budget category is required";
    if (!form.department) return "Department is required";
    if (lineAmount <= 0) return "Planned amount must be greater than zero";
    const total = summary?.totalBudgetAmount ?? options?.activeBudget?.totalExpectedIncome ?? 0;
    const allocated = summary?.alreadyAllocated ?? 0;
    if (lineAmount > total - allocated && total > 0) {
      return "This allocation exceeds remaining balance.";
    }
    return "";
  };

  const buildPayload = () => ({
    budgetId: activeBudgetId,
    lineName: form.lineName,
    customLineName: isOther ? form.customLineName.trim() : "",
    budgetCategory: form.budgetCategory,
    department: form.department,
    priorityLevel: form.priorityLevel,
    plannedAmount: lineAmount,
    allocationDate: form.allocationDate || null,
    description: [form.description, isOther ? form.otherDescription : ""].filter(Boolean).join("\n").trim(),
    notes: form.notes.trim(),
    referenceNumber: form.referenceNumber.trim(),
    preparedByName: form.preparedByName || preparedBy,
    reviewedByName: form.reviewedByName.trim(),
    approvalStatus: form.approvalStatus,
    approvalNotes: form.approvalNotes.trim(),
  });

  const handleSave = async (addAnother = false) => {
    const msg = validate();
    if (msg) {
      setError(msg);
      return;
    }
    setSaving(true);
    setError("");
    try {
      const result = await createBudgetLine(buildPayload());
      setSuccess(result?.message || "Budget line successfully created.");
      onSaved?.();
      if (addAnother) {
        setForm(emptyForm(preparedBy));
        setPreview(false);
        load();
      } else {
        onClose();
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const lineNames = options?.budgetLineNames || BUDGET_LINE_NAMES;
  const categories = options?.budgetCategories || BUDGET_CATEGORIES;
  const departments = options?.departments || DEPARTMENTS;

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10001,
        background: "rgba(0,4,53,0.55)",
        display: "flex",
        alignItems: isMobile ? "stretch" : "center",
        justifyContent: "center",
        padding: isMobile ? 0 : 16,
      }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: COLORS.white,
          borderRadius: isMobile ? 0 : 16,
          width: isMobile ? "100%" : "min(1100px, 96vw)",
          maxHeight: isMobile ? "100dvh" : "92vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div style={{ background: COLORS.navy, padding: isMobile ? "14px 16px" : "18px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: COLORS.amber }}>Create Budget Line</div>
            <div style={{ fontSize: 12, color: COLORS.amberLight, marginTop: 4 }}>
              {options?.activeBudget?.budgetCode || "—"} · {options?.activeBudget?.title || "School budget"}
            </div>
          </div>
          <button type="button" onClick={onClose} style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 8, padding: 8, cursor: "pointer", color: COLORS.white }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: isMobile ? 16 : "20px 24px" }}>
          {error && (
            <div style={{ marginBottom: 12, padding: 12, background: "#FEE2E2", borderRadius: 8, display: "flex", gap: 8, alignItems: "center" }}>
              <CircleAlert size={18} color={COLORS.red} />
              <span style={{ fontSize: 13, color: "#991B1B" }}>{error}</span>
            </div>
          )}
          {success && (
            <div style={{ marginBottom: 12, padding: 12, background: "#D1FAE5", borderRadius: 8, display: "flex", gap: 8, alignItems: "center" }}>
              <CircleCheck size={18} color={COLORS.green} />
              <span style={{ fontSize: 13, color: "#065F46", fontWeight: 600 }}>{success}</span>
            </div>
          )}

          {preview ? (
            <div style={{ background: COLORS.gray50, borderRadius: 12, padding: 18, border: `1px solid ${COLORS.gray200}` }}>
              <div style={{ fontWeight: 800, color: COLORS.navy, marginBottom: 12 }}>Allocation Preview</div>
              <p style={{ fontSize: 14, color: COLORS.gray600 }}>
                <strong>{displayLineName}</strong> — {fmt(lineAmount)} · {form.department} · {form.budgetCategory}
              </p>
              <button type="button" onClick={() => setPreview(false)} style={{ marginTop: 12, padding: "8px 14px", border: `1px solid ${COLORS.navy}`, borderRadius: 8, background: COLORS.white, cursor: "pointer", fontWeight: 600 }}>
                Back to Edit
              </button>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 320px", gap: 20, alignItems: "start" }}>
              <div>
                <Section title="Budget Line Details">
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
                    <div style={{ gridColumn: isMobile ? undefined : "1 / -1" }}>
                      <SearchableSelect label="Budget Line Name" required value={form.lineName} onChange={(v) => setField("lineName", v)} options={lineNames} placeholder="Select budget line" />
                    </div>
                    {isOther && (
                      <>
                        <div style={{ gridColumn: "1 / -1" }}>
                          <label style={FLBL}>Custom Budget Line Name *</label>
                          <input value={form.customLineName} onChange={(e) => setField("customLineName", e.target.value)} placeholder="Enter custom budget line" style={FINP} />
                        </div>
                        <div style={{ gridColumn: "1 / -1" }}>
                          <label style={FLBL}>Description</label>
                          <textarea value={form.otherDescription} onChange={(e) => setField("otherDescription", e.target.value)} placeholder="Describe allocation purpose" rows={2} style={{ ...FINP, resize: "vertical" }} />
                        </div>
                      </>
                    )}
                    <div>
                      <label style={FLBL}>Budget Category *</label>
                      <select value={form.budgetCategory} onChange={(e) => setField("budgetCategory", e.target.value)} style={FINP}>
                        <option value="">Select category</option>
                        {categories.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={FLBL}>Department *</label>
                      <select value={form.department} onChange={(e) => setField("department", e.target.value)} style={FINP}>
                        <option value="">Select department</option>
                        {departments.map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={FLBL}>Priority Level</label>
                      <select value={form.priorityLevel} onChange={(e) => setField("priorityLevel", e.target.value)} style={FINP}>
                        {PRIORITY_LEVELS.map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={FLBL}>Planned Amount (RWF) *</label>
                      <input type="number" min="0" value={form.plannedAmount} onChange={(e) => setField("plannedAmount", e.target.value)} placeholder="Enter amount" style={FINP} />
                    </div>
                    <div>
                      <label style={FLBL}>Allocation Date</label>
                      <input type="date" value={form.allocationDate} onChange={(e) => setField("allocationDate", e.target.value)} style={FINP} />
                    </div>
                  </div>
                </Section>

                <Section title="Additional Details">
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div>
                      <label style={FLBL}>Description</label>
                      <textarea value={form.description} onChange={(e) => setField("description", e.target.value)} rows={2} style={{ ...FINP, resize: "vertical" }} />
                    </div>
                    <div>
                      <label style={FLBL}>Notes</label>
                      <textarea value={form.notes} onChange={(e) => setField("notes", e.target.value)} rows={2} style={{ ...FINP, resize: "vertical" }} />
                    </div>
                    <div>
                      <label style={FLBL}>Reference Number</label>
                      <input value={form.referenceNumber} onChange={(e) => setField("referenceNumber", e.target.value)} style={FINP} />
                    </div>
                    <div>
                      <label style={FLBL}>Attachment</label>
                      <input type="file" style={{ fontSize: 12 }} onChange={() => {}} />
                      <div style={{ fontSize: 11, color: COLORS.gray400, marginTop: 4 }}>Supporting documents (optional)</div>
                    </div>
                  </div>
                </Section>

                <Section title="Approval & Tracking">
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
                    <div>
                      <label style={FLBL}>Prepared By</label>
                      <input value={form.preparedByName} readOnly style={{ ...FINP, background: COLORS.gray100 }} />
                    </div>
                    <div>
                      <label style={FLBL}>Reviewed By</label>
                      <input value={form.reviewedByName} onChange={(e) => setField("reviewedByName", e.target.value)} placeholder="Reviewer name" style={FINP} />
                    </div>
                    <div>
                      <label style={FLBL}>Approval Status</label>
                      <select value={form.approvalStatus} onChange={(e) => setField("approvalStatus", e.target.value)} style={FINP}>
                        {APPROVAL_STATUSES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <label style={FLBL}>Approval Notes</label>
                      <textarea value={form.approvalNotes} onChange={(e) => setField("approvalNotes", e.target.value)} rows={2} style={{ ...FINP, resize: "vertical" }} />
                    </div>
                  </div>
                </Section>
              </div>

              <MonitoringPanel fmt={fmt} summary={summary} lineAmount={lineAmount} lineName={displayLineName} />
            </div>
          )}
        </div>

        {!previewOnly && (
          <div style={{ borderTop: `1px solid ${COLORS.gray200}`, padding: isMobile ? "12px 16px" : "14px 24px", display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "flex-end", background: COLORS.gray50 }}>
            <button type="button" onClick={onClose} disabled={saving} style={btnOutline}>Cancel</button>
            <button type="button" disabled={saving} onClick={() => { const m = validate(); if (m) setError(m); else { setError(""); setPreview(true); } }} style={btnOutline}>
              <Eye size={16} /> Preview Allocation
            </button>
            <button type="button" disabled={saving} onClick={() => handleSave(true)} style={btnOutline}>
              <Save size={16} /> Save & Add Another
            </button>
            <button type="button" disabled={saving} onClick={() => handleSave(false)} style={btnPrimary}>
              <Save size={16} /> Save Budget Line
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

function Section({ title, children }) {
  return (
    <div style={{ background: COLORS.gray50, borderRadius: 12, padding: 18, border: `1px solid ${COLORS.gray200}`, marginBottom: 16 }}>
      <div style={{ fontWeight: 800, color: COLORS.navy, fontSize: 14, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
        <Info size={18} color={COLORS.navy} />
        {title}
      </div>
      {children}
    </div>
  );
}

const btnOutline = {
  padding: "10px 16px",
  border: `2px solid ${COLORS.navy}`,
  borderRadius: 8,
  background: COLORS.white,
  color: COLORS.navy,
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
};

const btnPrimary = {
  ...btnOutline,
  background: COLORS.amber,
  border: "none",
};
