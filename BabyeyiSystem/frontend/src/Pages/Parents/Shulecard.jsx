import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  CreditCard, Eye, Gauge, Home, Loader2, Plus, Wallet,
  X, ChevronRight, Shield, Sparkles, ArrowUpRight, Check
} from "lucide-react";
import AddChildModal from "../../components/Parents/AddChildModal";

const API = import.meta.env.VITE_API_URL || "http://localhost:5100";
const PRESET_TOPUPS = [1000, 5000, 10000, 20000, 50000];
const LIMIT_MIN = 500;
const LIMIT_MAX = 200000;

function rwf(v) {
  return `${Number(v || 0).toLocaleString()} RWF`;
}

/* ─── Backdrop overlay ─── */
function Overlay({ onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,4,53,0.72)",
        backdropFilter: "blur(6px)",
        zIndex: 40,
        animation: "fadeIn 0.2s ease"
      }}
    />
  );
}

/* ─── Modal shell ─── */
function Modal({ onClose, children, title, subtitle }) {
  return (
    <>
      <Overlay onClose={onClose} />
      <div style={{
        position: "fixed", inset: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 50, padding: "20px",
        pointerEvents: "none"
      }}>
        <div style={{
          background: "#fff",
          borderRadius: "28px",
          width: "100%", maxWidth: 560,
          maxHeight: "92vh",
          overflowY: "auto",
          pointerEvents: "all",
          animation: "scaleIn 0.28s cubic-bezier(0.34,1.56,0.64,1)",
          boxShadow: "0 24px 80px rgba(0,4,53,0.28)"
        }}>
          <div style={{ padding: "28px 32px 36px" }}>
            {/* header */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
              <div>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: "#000435", margin: 0, fontFamily: "'Sora', sans-serif" }}>{title}</h2>
                {subtitle && <p style={{ fontSize: 13, color: "#6b7280", marginTop: 5 }}>{subtitle}</p>}
              </div>
              <button onClick={onClose} style={{
                width: 38, height: 38, borderRadius: "50%",
                border: "none", background: "#f3f4f6",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", flexShrink: 0
              }}>
                <X size={18} color="#374151" />
              </button>
            </div>
            {children}
          </div>
        </div>
      </div>
    </>
  );
}

/* ─── Amber primary button ─── */
function PrimaryBtn({ onClick, disabled, children, fullWidth = true }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        width: fullWidth ? "100%" : "auto",
        padding: "15px 24px",
        borderRadius: 16,
        border: "none",
        background: disabled ? "#f59e0b88" : "linear-gradient(135deg, #f59e0b, #d97706)",
        color: "#fff",
        fontWeight: 800,
        fontSize: 15,
        fontFamily: "'Sora', sans-serif",
        cursor: disabled ? "not-allowed" : "pointer",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        boxShadow: disabled ? "none" : "0 4px 20px rgba(245,158,11,0.38)",
        transition: "all 0.18s ease",
      }}
    >
      {children}
    </button>
  );
}

/* ─── Ghost button ─── */
function GhostBtn({ onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: "100%", padding: "15px 24px",
        borderRadius: 16,
        border: "2px solid #e5e7eb",
        background: "transparent",
        color: "#374151",
        fontWeight: 700, fontSize: 15,
        fontFamily: "'Sora', sans-serif",
        cursor: "pointer",
        transition: "all 0.18s ease",
      }}
    >
      {children}
    </button>
  );
}

/* ─── Input ─── */
function Field({ label, children }) {
  return (
    <label style={{ display: "block", marginBottom: 16 }}>
      <span style={{ display: "block", fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9ca3af", marginBottom: 8 }}>{label}</span>
      {children}
    </label>
  );
}

const inputStyle = {
  width: "100%", padding: "13px 16px",
  border: "2px solid #e5e7eb",
  borderRadius: 14, fontSize: 16,
  fontWeight: 700, fontFamily: "'Sora', sans-serif",
  color: "#000435", background: "#fafafa",
  outline: "none", boxSizing: "border-box",
  transition: "border-color 0.18s",
};

/* ═══════════════════════════════════════════════
   TOP-UP MODAL
═══════════════════════════════════════════════ */
function TopupModal({ student, onClose, onContinue }) {
  const [topupAmount, setTopupAmount] = useState("10000");
  const [paymentMethod, setPaymentMethod] = useState("momo");
  const [note, setNote] = useState("");
  const topupValue = Math.floor(Number(topupAmount || 0));

  return (
    <Modal onClose={onClose} title="Fund Account" subtitle={`Top up ${student?.first_name}'s Shulecard`}>
      {/* Amount card */}
      <div style={{
        background: "linear-gradient(135deg, #000435, #001080)",
        borderRadius: 20, padding: "20px 24px", marginBottom: 20,
        display: "flex", flexDirection: "column", gap: 4
      }}>
        <span style={{ color: "#f59e0b", fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Amount to fund</span>
        <span style={{ color: "#fff", fontSize: 32, fontWeight: 900, fontFamily: "'Sora', sans-serif" }}>
          {topupValue > 0 ? topupValue.toLocaleString() : "0"} <span style={{ fontSize: 16, opacity: 0.7 }}>RWF</span>
        </span>
      </div>

      <Field label="Custom Amount (RWF)">
        <input
          type="number" min={500}
          value={topupAmount}
          onChange={(e) => setTopupAmount(e.target.value)}
          style={inputStyle}
        />
      </Field>

      {/* Preset chips */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
        {PRESET_TOPUPS.map((p) => (
          <button
            key={p} type="button"
            onClick={() => setTopupAmount(String(p))}
            style={{
              padding: "8px 14px", borderRadius: 99,
              border: `2px solid ${topupValue === p ? "#f59e0b" : "#e5e7eb"}`,
              background: topupValue === p ? "#fef3c7" : "transparent",
              color: topupValue === p ? "#92400e" : "#6b7280",
              fontSize: 13, fontWeight: 700,
              cursor: "pointer", fontFamily: "'Sora', sans-serif",
              transition: "all 0.15s"
            }}
          >
            +{p.toLocaleString()}
          </button>
        ))}
      </div>

      <Field label="Payment Method">
        <select
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          style={{ ...inputStyle, appearance: "none" }}
        >
          <option value="momo">📱 Mobile Money (MoMo)</option>
          <option value="wallet">👜 Babyeyi Wallet</option>
          <option value="card">💳 Bank Card</option>
        </select>
      </Field>

      <Field label="Note (optional)">
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          style={{ ...inputStyle, resize: "none", lineHeight: 1.5 }}
          placeholder="e.g. Lunch money for the week"
        />
      </Field>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12, marginTop: 4 }}>
        <GhostBtn onClick={onClose}>Cancel</GhostBtn>
        <PrimaryBtn onClick={() => onContinue(topupValue, paymentMethod, note)}>
          <CreditCard size={18} /> Continue to Payment
        </PrimaryBtn>
      </div>
    </Modal>
  );
}

/* ═══════════════════════════════════════════════
   DAILY LIMIT MODAL
═══════════════════════════════════════════════ */
function LimitModal({ student, currentLimit, onClose, onSave, busy }) {
  const [limitDraft, setLimitDraft] = useState(String(Math.floor(Number(currentLimit || 5000))));
  const n = Math.min(LIMIT_MAX, Math.max(LIMIT_MIN, Number(limitDraft) || LIMIT_MIN));
  const pct = ((n - LIMIT_MIN) / (LIMIT_MAX - LIMIT_MIN)) * 100;

  return (
    <Modal onClose={onClose} title="Daily Spending Limit" subtitle={`Control ${student?.first_name}'s daily spending`}>
      {/* Visual limit gauge */}
      <div style={{
        background: "#f9fafb", borderRadius: 20, padding: 20, marginBottom: 20
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontSize: 13, color: "#6b7280", fontWeight: 600 }}>Limit</span>
          <span style={{ fontSize: 22, fontWeight: 900, color: "#000435", fontFamily: "'Sora', sans-serif" }}>
            {Number(limitDraft || 0).toLocaleString()} <span style={{ fontSize: 13, fontWeight: 600, color: "#6b7280" }}>RWF</span>
          </span>
        </div>
        <div style={{ height: 10, borderRadius: 99, background: "#e5e7eb", overflow: "hidden" }}>
          <div style={{
            height: "100%", width: `${pct}%`,
            background: "linear-gradient(90deg, #f59e0b, #d97706)",
            borderRadius: 99, transition: "width 0.2s ease"
          }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
          <span style={{ fontSize: 11, color: "#9ca3af" }}>{rwf(LIMIT_MIN)}</span>
          <span style={{ fontSize: 11, color: "#9ca3af" }}>{rwf(LIMIT_MAX)}</span>
        </div>
      </div>

      <Field label="Daily Limit Amount (RWF)">
        <input
          type="number" min={LIMIT_MIN} max={LIMIT_MAX} step={500}
          value={limitDraft}
          onChange={(e) => setLimitDraft(e.target.value)}
          style={inputStyle}
        />
      </Field>

      <input
        type="range"
        min={LIMIT_MIN} max={LIMIT_MAX} step={500}
        value={n}
        onChange={(e) => setLimitDraft(e.target.value)}
        style={{ width: "100%", marginBottom: 24, accentColor: "#f59e0b" }}
      />

      {/* Quick presets */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 24 }}>
        {[2000, 5000, 10000, 20000, 50000, 100000].map((v) => (
          <button
            key={v} type="button"
            onClick={() => setLimitDraft(String(v))}
            style={{
              padding: "10px 4px", borderRadius: 12,
              border: `2px solid ${Number(limitDraft) === v ? "#f59e0b" : "#e5e7eb"}`,
              background: Number(limitDraft) === v ? "#fef3c7" : "#f9fafb",
              color: Number(limitDraft) === v ? "#92400e" : "#374151",
              fontSize: 12, fontWeight: 700,
              cursor: "pointer", fontFamily: "'Sora', sans-serif"
            }}
          >
            {(v / 1000).toFixed(0)}K
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12 }}>
        <GhostBtn onClick={onClose}>Cancel</GhostBtn>
        <PrimaryBtn onClick={() => onSave(limitDraft)} disabled={busy}>
          {busy ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
          {busy ? "Saving…" : "Save Limit"}
        </PrimaryBtn>
      </div>
    </Modal>
  );
}

/* ═══════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════ */
export default function Shulecard() {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showTopup, setShowTopup] = useState(false);
  const [showLimit, setShowLimit] = useState(false);
  const [busyLimit, setBusyLimit] = useState(false);
  const [msg, setMsg] = useState(null);
  const [addOpen, setAddOpen] = useState(false);

  const selectedWallet = selectedStudent?.wallet || { balance_rwf: 0, daily_limit_rwf: 5000 };
  const canViewFinancials = selectedStudent?.can_view_financials ?? selectedStudent?.access_type === "FULL";
  const canSetLimit = selectedStudent?.can_set_daily_limit ?? selectedStudent?.access_type === "FULL";

  const loadStudents = async () => {
    setLoadingStudents(true);
    try {
      const res = await fetch(`${API}/api/parent-portal/shulecard/students`, { credentials: "include" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) throw new Error(json.message || "Could not load students");
      setStudents(Array.isArray(json.data) ? json.data : []);
    } catch (e) {
      setMsg({ type: "err", text: e.message || "Network error loading students" });
      setStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  };

  useEffect(() => { loadStudents(); }, []);
  useEffect(() => { if (!selectedStudent && students.length > 0) setSelectedStudent(students[0]); }, [students, selectedStudent]);

  const goToPaymentsForTopup = (topupValue, paymentMethod, note) => {
    if (!selectedStudent?.id) return;
    if (topupValue < 500 || topupValue > 5_000_000) {
      setMsg({ type: "err", text: "Top-up amount must be between 500 and 5,000,000 RWF." });
      return;
    }
    try {
      sessionStorage.setItem("babyeyi_shulecard_topup_draft", JSON.stringify({
        student_id: selectedStudent.id,
        student_name: `${selectedStudent.first_name || ""} ${selectedStudent.last_name || ""}`.trim(),
        amount_rwf: topupValue, payment_method: paymentMethod, note,
        source: "parents_shulecard", created_at: new Date().toISOString(),
      }));
    } catch {}
    setShowTopup(false);
    navigate("/payments", {
      state: {
        shulecardTopup: true, topupAmountRwf: topupValue,
        student: { id: selectedStudent.id, name: `${selectedStudent.first_name || ""} ${selectedStudent.last_name || ""}`.trim() },
      },
    });
  };

  const submitLimit = async (limitDraft) => {
    if (!selectedStudent?.id) return;
    const n = Math.floor(Number(limitDraft || 0));
    if (n < LIMIT_MIN || n > LIMIT_MAX) {
      setMsg({ type: "err", text: `Daily limit must be between ${rwf(LIMIT_MIN)} and ${rwf(LIMIT_MAX)}.` });
      return;
    }
    setBusyLimit(true);
    setMsg(null);
    try {
      const res = await fetch(`${API}/api/parent-portal/shulecard/daily-limit`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_id: selectedStudent.id, daily_limit_rwf: n }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) throw new Error(json.message || "Could not save daily limit");
      setMsg({ type: "ok", text: `Daily limit updated to ${rwf(n)}.` });
      setShowLimit(false);
      await loadStudents();
    } catch (e) {
      setMsg({ type: "err", text: e.message || "Could not save daily limit" });
    } finally {
      setBusyLimit(false);
    }
  };

  return (
    <>
      {/* Fonts & Animations */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800;900&display=swap');

        @keyframes fadeIn    { from { opacity: 0 } to { opacity: 1 } }
        @keyframes scaleIn   { from { opacity:0; transform:scale(0.94) } to { opacity:1; transform:scale(1) } }
        @keyframes fadeSlide { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }
        @keyframes spin      { to { transform: rotate(360deg) } }

        * { font-family: 'Sora', sans-serif; box-sizing: border-box; }

        input:focus, select:focus, textarea:focus {
          border-color: #f59e0b !important;
          box-shadow: 0 0 0 3px rgba(245,158,11,0.12) !important;
          outline: none !important;
        }

        .sc-page {
          width: 100%;
          min-height: 100vh;
          background: #f0f2f8;
        }

        /* ── Desktop two-column grid ── */
        .sc-inner {
          width: 100%;
          max-width: 1280px;
          margin: 0 auto;
          padding: 0 32px 48px;
        }

        /* Hero banner spans full width */
        .sc-hero {
          background: linear-gradient(135deg, #000435 0%, #000d6b 60%, #001799 100%);
          padding: 56px 0 0;
          margin-bottom: 0;
          width: 100%;
          position: relative;
          overflow: hidden;
        }

        .sc-hero-inner {
          max-width: 1280px;
          margin: 0 auto;
          padding: 0 32px 36px;
          position: relative;
          z-index: 1;
        }

        .sc-body-grid {
          display: grid;
          grid-template-columns: 340px 1fr;
          gap: 28px;
          margin-top: 28px;
          align-items: start;
        }

        /* Mobile: single column */
        @media (max-width: 768px) {
          .sc-inner { padding: 0 16px 48px; }
          .sc-hero-inner { padding: 0 16px 28px; }
          .sc-body-grid {
            grid-template-columns: 1fr;
            margin-top: 20px;
          }
        }

        .sc-card-panel {
          background: #fff;
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 2px 16px rgba(0,4,53,0.07);
        }

        .sc-right-panel {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .action-btn {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px;
          border-radius: 20px;
          border: none;
          cursor: pointer;
          width: 100%;
          text-align: left;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .action-btn:hover { transform: translateY(-2px); }

        .action-btn-icon {
          width: 46px; height: 46px;
          border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }

        .student-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 20px;
          border-bottom: 1px solid #f3f4f6;
          cursor: pointer;
          transition: background 0.15s;
        }
        .student-row:last-child { border-bottom: none; }
        .student-row:hover { background: #fafafa; }
        .student-row.active { background: #fffbeb; }
      `}</style>

      <div className="sc-page">

        {/* ═══ HERO BANNER ═══ */}
        <div className="sc-hero">
          {/* Decorative circles */}
          <div style={{ position: "absolute", top: -60, right: -60, width: 280, height: 280, borderRadius: "50%", border: "2px solid rgba(245,158,11,0.12)" }} />
          <div style={{ position: "absolute", top: -20, right: -20, width: 160, height: 160, borderRadius: "50%", border: "2px solid rgba(245,158,11,0.2)" }} />
          <div style={{ position: "absolute", bottom: -50, left: -50, width: 220, height: 220, borderRadius: "50%", background: "rgba(245,158,11,0.04)" }} />
          <div style={{ position: "absolute", top: 40, left: "45%", width: 120, height: 120, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.05)" }} />

          <div className="sc-hero-inner">
            {/* Top bar */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ background: "rgba(245,158,11,0.2)", borderRadius: 16, padding: "10px 12px", border: "1px solid rgba(245,158,11,0.3)" }}>
                  <CreditCard size={24} color="#f59e0b" />
                </div>
                <div>
                  <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", margin: 0 }}>Parent Portal</p>
                  <h1 style={{ color: "#fff", fontSize: 26, fontWeight: 900, margin: 0, letterSpacing: "-0.5px" }}>ShuleCard</h1>
                </div>
              </div>
              <Link to="/parents/home" style={{
                width: 46, height: 46, borderRadius: 14,
                background: "rgba(245,158,11,0.15)",
                border: "1px solid rgba(245,158,11,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
                textDecoration: "none"
              }}>
                <Home size={20} color="#f59e0b" />
              </Link>
            </div>

            {/* Selected student card — spans full hero width on desktop */}
            {selectedStudent ? (
              <div style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 24, padding: "24px 28px",
                backdropFilter: "blur(12px)",
                animation: "fadeSlide 0.3s ease",
                maxWidth: 680,
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{
                      width: 52, height: 52, borderRadius: 16,
                      background: "linear-gradient(135deg, #f59e0b, #d97706)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 22, fontWeight: 900, color: "#fff", flexShrink: 0
                    }}>
                      {(selectedStudent.first_name || "S").slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <p style={{ color: "#fff", fontWeight: 800, fontSize: 18, margin: 0 }}>
                        {selectedStudent.first_name} {selectedStudent.last_name}
                      </p>
                      <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 13, margin: 0 }}>
                        {selectedStudent.school_name || "School"} · {selectedStudent.class_name || "Class"}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 7 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(245,158,11,0.15)", borderRadius: 10, padding: "5px 12px", border: "1px solid rgba(245,158,11,0.25)" }}>
                      <Shield size={13} color="#f59e0b" />
                      <span style={{ color: "#f59e0b", fontSize: 12, fontWeight: 700 }}>Active</span>
                    </div>
                    {!canSetLimit && (
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          background: "rgba(239,68,68,0.12)",
                          border: "1px solid rgba(239,68,68,0.35)",
                          borderRadius: 999,
                          padding: "4px 10px",
                        }}
                      >
                        <span style={{ width: 6, height: 6, borderRadius: 99, background: "#ef4444" }} />
                        <span style={{ color: "#fecaca", fontSize: 11, fontWeight: 800 }}>Limited Access: Fund Only</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card ID + balance row */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  <div style={{ background: "rgba(0,0,0,0.25)", borderRadius: 14, padding: "12px 16px" }}>
                    <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, margin: "0 0 4px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>Card ID</p>
                    <p style={{ color: "#f59e0b", fontWeight: 800, fontSize: 13, letterSpacing: 1.5, margin: 0 }}>
                      {(selectedStudent.student_uid || selectedStudent.student_code || `ST-${selectedStudent.id}`).replace(/[^\d]/g, "").slice(0, 10).replace(/(\d{4})(?=\d)/g, "$1 ") || "– – – –"}
                    </p>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 14, padding: "12px 16px" }}>
                    <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, margin: "0 0 4px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Balance</p>
                    <p style={{ color: "#fff", fontWeight: 900, fontSize: 18, margin: 0 }}>{canViewFinancials ? rwf(selectedWallet.balance_rwf) : "Private"}</p>
                  </div>
                  <div style={{ background: "rgba(245,158,11,0.12)", borderRadius: 14, padding: "12px 16px", border: "1px solid rgba(245,158,11,0.2)" }}>
                    <p style={{ color: "rgba(245,158,11,0.8)", fontSize: 11, margin: "0 0 4px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Daily Limit</p>
                    <p style={{ color: "#f59e0b", fontWeight: 900, fontSize: 18, margin: 0 }}>{canViewFinancials ? rwf(selectedWallet.daily_limit_rwf) : "Private"}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 15, paddingBottom: 8 }}>
                Select a child below to view their card
              </div>
            )}
          </div>
        </div>

        {/* ═══ BODY ═══ */}
        <div className="sc-inner">

          {/* Toast */}
          {msg && (
            <div style={{
              marginTop: 20,
              padding: "14px 20px",
              borderRadius: 16,
              background: msg.type === "ok" ? "#ecfdf5" : "#fff1f2",
              border: `1px solid ${msg.type === "ok" ? "#6ee7b7" : "#fecaca"}`,
              color: msg.type === "ok" ? "#065f46" : "#be123c",
              fontSize: 14, fontWeight: 700,
              display: "flex", alignItems: "center", justifyContent: "space-between",
              animation: "fadeSlide 0.3s ease"
            }}>
              <span>{msg.text}</span>
              <button onClick={() => setMsg(null)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex" }}>
                <X size={16} />
              </button>
            </div>
          )}

          {/* Two-column grid on desktop */}
          <div className="sc-body-grid">

            {/* LEFT: Children list */}
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <h2 style={{ fontSize: 16, fontWeight: 800, color: "#000435", margin: 0 }}>Your Children</h2>
                <button
                  type="button" onClick={() => setAddOpen(true)}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    background: "#000435", color: "#f59e0b",
                    border: "none", borderRadius: 12,
                    padding: "8px 16px", fontSize: 13, fontWeight: 700,
                    cursor: "pointer"
                  }}
                >
                  <Plus size={15} /> Add Child
                </button>
              </div>

              <div className="sc-card-panel">
                {loadingStudents ? (
                  <div style={{ textAlign: "center", padding: "40px 0", color: "#9ca3af", fontSize: 14 }}>
                    <Loader2 size={28} style={{ animation: "spin 1s linear infinite", margin: "0 auto 12px", display: "block" }} />
                    Loading students…
                  </div>
                ) : students.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 20px", color: "#9ca3af" }}>
                    <Sparkles size={32} style={{ margin: "0 auto 10px", display: "block", opacity: 0.4 }} />
                    <p style={{ fontWeight: 700, margin: 0 }}>No children added yet</p>
                    <p style={{ fontSize: 13, margin: "6px 0 0" }}>Tap "Add Child" to get started</p>
                  </div>
                ) : (
                  students.map((s) => {
                    const isSelected = selectedStudent?.id === s.id;
                    return (
                      <div
                        key={s.id}
                        onClick={() => setSelectedStudent(s)}
                        className={`student-row${isSelected ? " active" : ""}`}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{
                            width: 44, height: 44, borderRadius: 12,
                            background: isSelected ? "linear-gradient(135deg, #f59e0b, #d97706)" : "#f3f4f6",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 17, fontWeight: 900,
                            color: isSelected ? "#fff" : "#9ca3af",
                            flexShrink: 0,
                            transition: "all 0.18s"
                          }}>
                            {(s.first_name || "S").slice(0, 1).toUpperCase()}
                          </div>
                          <div>
                            <p style={{ fontWeight: 800, color: "#000435", margin: 0, fontSize: 15 }}>{s.first_name} {s.last_name}</p>
                            <p style={{ fontSize: 12, color: "#9ca3af", margin: 0 }}>{s.class_name || "Class"} · {s.school_name || "School"}</p>
                            {!((s.can_set_daily_limit ?? s.access_type === "FULL")) && (
                              <p
                                style={{
                                  margin: "4px 0 0",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 5,
                                  borderRadius: 999,
                                  padding: "3px 8px",
                                  fontSize: 10,
                                  fontWeight: 800,
                                  color: "#b91c1c",
                                  background: "#fef2f2",
                                  border: "1px solid #fecaca",
                                }}
                              >
                                <span style={{ width: 5, height: 5, borderRadius: 99, background: "#ef4444" }} />
                                Limited Access: Fund Only
                              </p>
                            )}
                          </div>
                        </div>
                        <ChevronRight size={18} color={isSelected ? "#f59e0b" : "#d1d5db"} />
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* RIGHT: Actions + stats */}
            <div className="sc-right-panel">

              {selectedStudent ? (
                <>
                  {/* Stats row */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
                    {[
                      { label: "Balance", value: canViewFinancials ? rwf(selectedWallet.balance_rwf) : "Private", accent: "#000435", bg: "#fff" },
                      { label: "Daily Limit", value: canViewFinancials ? rwf(selectedWallet.daily_limit_rwf) : "Private", accent: "#d97706", bg: "#fffbeb" },
                      { label: "Status", value: "Active", accent: "#059669", bg: "#ecfdf5" },
                    ].map((s) => (
                      <div key={s.label} style={{
                        background: s.bg, borderRadius: 20, padding: "20px 22px",
                        boxShadow: "0 2px 12px rgba(0,4,53,0.06)"
                      }}>
                        <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9ca3af", margin: "0 0 6px" }}>{s.label}</p>
                        <p style={{ fontSize: 18, fontWeight: 900, color: s.accent, margin: 0 }}>{s.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Action buttons */}
                  <button
                    type="button" onClick={() => setShowTopup(true)}
                    className="action-btn"
                    style={{
                      background: "linear-gradient(135deg, #f59e0b, #d97706)",
                      color: "#fff",
                      boxShadow: "0 6px 28px rgba(245,158,11,0.35)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <div className="action-btn-icon" style={{ background: "rgba(255,255,255,0.2)" }}>
                        <Wallet size={22} />
                      </div>
                      <div>
                        <p style={{ fontWeight: 800, fontSize: 16, margin: 0 }}>Fund Account</p>
                        <p style={{ fontSize: 13, opacity: 0.8, margin: "2px 0 0" }}>Add money via MoMo or card</p>
                      </div>
                    </div>
                    <ArrowUpRight size={22} style={{ opacity: 0.8, flexShrink: 0 }} />
                  </button>

                  {canSetLimit && (
                    <button
                      type="button" onClick={() => setShowLimit(true)}
                      className="action-btn"
                      style={{
                        background: "#000435",
                        color: "#fff",
                        boxShadow: "0 6px 24px rgba(0,4,53,0.22)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        <div className="action-btn-icon" style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)" }}>
                          <Gauge size={22} color="#f59e0b" />
                        </div>
                        <div>
                          <p style={{ fontWeight: 800, fontSize: 16, margin: 0 }}>Set Daily Limit</p>
                          <p style={{ fontSize: 13, opacity: 0.55, margin: "2px 0 0" }}>Currently: {rwf(selectedWallet.daily_limit_rwf)}</p>
                        </div>
                      </div>
                      <ArrowUpRight size={22} style={{ opacity: 0.5, flexShrink: 0 }} />
                    </button>
                  )}

                  {canSetLimit && (
                    <button
                      type="button" onClick={() => navigate(`/parents/student-details/${selectedStudent.student_code || selectedStudent.student_uid || selectedStudent.id}`)}
                      className="action-btn"
                      style={{
                        background: "#fff",
                        color: "#000435",
                        border: "2px solid #e5e7eb",
                        boxShadow: "0 2px 12px rgba(0,4,53,0.05)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        <div className="action-btn-icon" style={{ background: "#f3f4f6" }}>
                          <Eye size={22} color="#6b7280" />
                        </div>
                        <div>
                          <p style={{ fontWeight: 800, fontSize: 16, margin: 0 }}>View Details</p>
                          <p style={{ fontSize: 13, color: "#9ca3af", margin: "2px 0 0" }}>Transactions & activity</p>
                        </div>
                      </div>
                      <ChevronRight size={22} color="#d1d5db" style={{ flexShrink: 0 }} />
                    </button>
                  )}
                </>
              ) : (
                <div style={{
                  background: "#fff", borderRadius: 24, padding: "40px 32px",
                  textAlign: "center", color: "#9ca3af",
                  boxShadow: "0 2px 12px rgba(0,4,53,0.06)"
                }}>
                  <Sparkles size={36} style={{ margin: "0 auto 12px", display: "block", opacity: 0.3 }} />
                  <p style={{ fontWeight: 700, margin: 0, fontSize: 16, color: "#374151" }}>No student selected</p>
                  <p style={{ fontSize: 13, margin: "6px 0 0" }}>Choose a child from the list to manage their card</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Modals ─── */}
      <AddChildModal open={addOpen} onClose={() => setAddOpen(false)} onSaved={loadStudents} onLinked={loadStudents} />

      {showTopup && selectedStudent && (
        <TopupModal
          student={selectedStudent}
          onClose={() => setShowTopup(false)}
          onContinue={goToPaymentsForTopup}
        />
      )}

      {showLimit && selectedStudent && (
        <LimitModal
          student={selectedStudent}
          currentLimit={selectedWallet.daily_limit_rwf}
          onClose={() => setShowLimit(false)}
          onSave={submitLimit}
          busy={busyLimit}
        />
      )}
    </>
  );
}