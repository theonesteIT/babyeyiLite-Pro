import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CircleAlert, Save, X } from "lucide-react";
import { COLORS, EXPENSE_CATEGORIES, PAYMENT_METHODS } from "../utils/budgetLineConstants";
import { registerBudgetLineUsage } from "../services/budgetLineApi";
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

export default function RegisterBudgetUsageModal({ open, onClose, fmt, lines = [], onSaved }) {
  const isMobile = useIsMobile();
  const [form, setForm] = useState({
    budgetLineId: "",
    usageAmount: "",
    usageDate: new Date().toISOString().slice(0, 10),
    expenseCategory: "",
    paymentMethod: "",
    description: "",
    receiptName: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    setForm({
      budgetLineId: lines[0]?.db_id || lines[0]?.id || "",
      usageAmount: "",
      usageDate: new Date().toISOString().slice(0, 10),
      expenseCategory: "",
      paymentMethod: "",
      description: "",
      receiptName: "",
    });
  }, [open, lines]);

  const selected = lines.find((l) => String(l.db_id || l.id) === String(form.budgetLineId));
  const remaining = selected ? selected.plannedAmount - selected.usedAmount : 0;

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
          <div style={{ fontSize: 17, fontWeight: 800, color: COLORS.amber }}>Register Budget Usage</div>
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
              <label style={FLBL}>Select Budget Line *</label>
              <select value={form.budgetLineId} onChange={(e) => setForm((p) => ({ ...p, budgetLineId: e.target.value }))} style={FINP}>
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
                <strong style={{ color: COLORS.navy }}>{fmt(remaining)}</strong>
              </div>
            )}
            <div>
              <label style={FLBL}>Usage Amount (RWF) *</label>
              <input type="number" min="0" value={form.usageAmount} onChange={(e) => setForm((p) => ({ ...p, usageAmount: e.target.value }))} style={FINP} />
            </div>
            <div>
              <label style={FLBL}>Usage Date</label>
              <input type="date" value={form.usageDate} onChange={(e) => setForm((p) => ({ ...p, usageDate: e.target.value }))} style={FINP} />
            </div>
            <div>
              <label style={FLBL}>Expense Category</label>
              <select value={form.expenseCategory} onChange={(e) => setForm((p) => ({ ...p, expenseCategory: e.target.value }))} style={FINP}>
                <option value="">Select</option>
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={FLBL}>Payment Method</label>
              <select value={form.paymentMethod} onChange={(e) => setForm((p) => ({ ...p, paymentMethod: e.target.value }))} style={FINP}>
                <option value="">Select</option>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={FLBL}>Description</label>
              <textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={2} style={{ ...FINP, resize: "vertical" }} />
            </div>
            <div>
              <label style={FLBL}>Attachment / Receipt</label>
              <input type="file" style={{ fontSize: 12 }} onChange={(e) => setForm((p) => ({ ...p, receiptName: e.target.files?.[0]?.name || "" }))} />
            </div>
          </div>
        </div>
        <div style={{ padding: "14px 20px", borderTop: `1px solid ${COLORS.gray200}`, display: "flex", justifyContent: "flex-end", gap: 10, background: COLORS.gray50 }}>
          <button type="button" onClick={onClose} style={{ padding: "10px 16px", border: `2px solid ${COLORS.navy}`, borderRadius: 8, background: COLORS.white, fontWeight: 700, cursor: "pointer" }}>
            Cancel
          </button>
          <button type="button" disabled={saving} onClick={handleSubmit} style={{ padding: "10px 18px", border: "none", borderRadius: 8, background: COLORS.amber, color: COLORS.navy, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Save size={16} />
            Register Usage
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
