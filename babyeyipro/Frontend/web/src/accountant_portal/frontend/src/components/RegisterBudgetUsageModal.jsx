import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { CircleAlert, Save, X } from "lucide-react";
import { COLORS, EXPENSE_CATEGORIES, PAYMENT_METHODS } from "../utils/budgetLineConstants";
import { registerBudgetLineUsage } from "../services/budgetLineApi";
import { useIsMobile } from "../utils/useIsMobile";

const FLBL = {
  display: "block",
  fontSize: 11,
  fontWeight: 500,
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

const EMPTY_FORM = {
  budgetLineId: "",
  usageAmount: "",
  usageDate: new Date().toISOString().slice(0, 10),
  expenseCategory: "",
  paymentMethod: "",
  paymentBankName: "",
  paymentPhone: "",
  description: "",
  receiptName: "",
};

function isBankTransfer(method) {
  return String(method || "").toLowerCase().includes("bank");
}

function isMobileMoney(method) {
  return String(method || "").toLowerCase().includes("mobile");
}

export default function RegisterBudgetUsageModal({ open, onClose, fmt, lines = [], onSaved }) {
  const isMobile = useIsMobile();
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    setForm({
      ...EMPTY_FORM,
      budgetLineId: lines[0]?.db_id || lines[0]?.id || "",
      usageDate: new Date().toISOString().slice(0, 10),
    });
  }, [open, lines]);

  const selected = lines.find((l) => String(l.db_id || l.id) === String(form.budgetLineId));
  const remaining = selected ? selected.plannedAmount - selected.usedAmount : 0;
  const showBankName = isBankTransfer(form.paymentMethod);
  const showPhone = isMobileMoney(form.paymentMethod);

  const setField = (key, value) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "paymentMethod") {
        if (!isBankTransfer(value)) next.paymentBankName = "";
        if (!isMobileMoney(value)) next.paymentPhone = "";
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    const amount = Number(form.usageAmount);
    if (!form.budgetLineId) {
      setError("Select a budget line");
      return;
    }
    if (!amount || amount <= 0) {
      setError("Enter a valid usage amount");
      return;
    }
    if (amount > remaining) {
      setError("Usage amount exceeds remaining budget for this line");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await registerBudgetLineUsage({
        budgetLineId: Number(form.budgetLineId),
        usageAmount: amount,
        usageDate: form.usageDate,
        expenseCategory: form.expenseCategory,
        paymentMethod: form.paymentMethod,
        paymentBankName: showBankName ? form.paymentBankName.trim() : "",
        paymentPhone: showPhone ? form.paymentPhone.trim() : "",
        description: form.description,
        receiptName: form.receiptName,
      });
      if (res.notification) {
        try {
          new Notification("Budget Alert", { body: res.notification });
        } catch (_) {
          /* web push optional */
        }
      }
      onSaved?.(res);
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10002,
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
          borderRadius: isMobile ? 0 : 14,
          width: isMobile ? "100%" : "min(520px, 96vw)",
          maxHeight: isMobile ? "100dvh" : "90vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div style={{ background: COLORS.navy, padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 17, fontWeight: 500, color: COLORS.amber }}>Register Budget Usage</div>
          <button type="button" onClick={onClose} style={{ background: "transparent", border: "none", color: COLORS.white, cursor: "pointer" }}>
            <X size={20} />
          </button>
        </div>
        <div style={{ padding: 20, overflow: "auto", flex: 1 }}>
          {error && (
            <div style={{ marginBottom: 12, padding: 10, background: "#FEE2E2", borderRadius: 8, display: "flex", gap: 8, fontSize: 13, color: "#991B1B" }}>
              <CircleAlert size={18} color={COLORS.red} />
              {error}
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={FLBL}>Select expense line *</label>
              <select value={form.budgetLineId} onChange={(e) => setField("budgetLineId", e.target.value)} style={FINP}>
                <option value="">Select line</option>
                {lines.map((l) => (
                  <option key={l.db_id || l.id} value={l.db_id || l.id}>
                    {l.lineName} — {fmt(l.remaining)} left
                  </option>
                ))}
              </select>
            </div>
            {selected && (
              <div style={{ padding: 12, background: COLORS.gray50, borderRadius: 8, fontSize: 12, color: COLORS.gray600 }}>
                Allocated: {fmt(selected.plannedAmount)} · Used: {fmt(selected.usedAmount)} · Remaining:{" "}
                <span style={{ color: COLORS.navy, fontWeight: 500 }}>{fmt(remaining)}</span>
              </div>
            )}
            <div>
              <label style={FLBL}>Usage amount (RWF) *</label>
              <input type="number" min="0" value={form.usageAmount} onChange={(e) => setField("usageAmount", e.target.value)} style={FINP} />
            </div>
            <div>
              <label style={FLBL}>Usage date</label>
              <input type="date" value={form.usageDate} onChange={(e) => setField("usageDate", e.target.value)} style={FINP} />
            </div>
            <div>
              <label style={FLBL}>Expense category</label>
              <select value={form.expenseCategory} onChange={(e) => setField("expenseCategory", e.target.value)} style={FINP}>
                <option value="">Select</option>
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={FLBL}>Payment method</label>
              <select value={form.paymentMethod} onChange={(e) => setField("paymentMethod", e.target.value)} style={FINP}>
                <option value="">Select (optional)</option>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            {showBankName && (
              <div>
                <label style={FLBL}>Bank name (optional)</label>
                <input
                  type="text"
                  value={form.paymentBankName}
                  onChange={(e) => setField("paymentBankName", e.target.value)}
                  placeholder="e.g. Bank of Kigali, Equity Bank"
                  style={FINP}
                />
              </div>
            )}
            {showPhone && (
              <div>
                <label style={FLBL}>Mobile money phone (optional)</label>
                <input
                  type="tel"
                  value={form.paymentPhone}
                  onChange={(e) => setField("paymentPhone", e.target.value)}
                  placeholder="e.g. 0781234567"
                  style={FINP}
                />
              </div>
            )}
            <div>
              <label style={FLBL}>Description</label>
              <textarea value={form.description} onChange={(e) => setField("description", e.target.value)} rows={2} style={{ ...FINP, resize: "vertical" }} />
            </div>
            <div>
              <label style={FLBL}>Attachment / receipt</label>
              <input type="file" style={{ fontSize: 12 }} onChange={(e) => setField("receiptName", e.target.files?.[0]?.name || "")} />
            </div>
          </div>
        </div>
        <div style={{ padding: "14px 20px", borderTop: `1px solid ${COLORS.gray200}`, display: "flex", justifyContent: "flex-end", gap: 10, background: COLORS.gray50 }}>
          <button type="button" onClick={onClose} style={{ padding: "10px 16px", border: `2px solid ${COLORS.navy}`, borderRadius: 8, background: COLORS.white, fontWeight: 500, cursor: "pointer" }}>
            Cancel
          </button>
          <button type="button" disabled={saving} onClick={handleSubmit} style={{ padding: "10px 18px", border: "none", borderRadius: 8, background: COLORS.amber, color: COLORS.navy, fontWeight: 500, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Save size={16} />
            Register usage
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
