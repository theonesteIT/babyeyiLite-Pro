import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const API = `${import.meta.env.VITE_API_URL || "http://localhost:5100"}/api`;
const NAVY = "#000435";
const AMBER = "#FBBF24";

export default function AgentShopCheckout() {
  const navigate = useNavigate();
  const [payload] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem("babyeyi_agent_shop_checkout") || "null");
    } catch {
      return null;
    }
  });
  const [studentCode, setStudentCode] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [buyerContact, setBuyerContact] = useState("");
  const [deliveryMode, setDeliveryMode] = useState("AT_SCHOOL");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const subtotal = useMemo(
    () => (payload?.items || []).reduce((s, x) => s + Number(x.price || 0) * Number(x.quantity || 0), 0),
    [payload]
  );
  if (!payload?.items?.length) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 18 }}>
        <div>
          <p>No cart found.</p>
          <Link to="/find-agent">Back to Find Agent</Link>
        </div>
      </div>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    if (!studentCode.trim() || !buyerName.trim() || !buyerContact.trim()) {
      setErr("Student code, name and contact are required.");
      return;
    }
    if (deliveryMode === "AT_HOME" && !deliveryAddress.trim()) {
      setErr("Home delivery address is required.");
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(`${API}/student-services/public/shop/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_user_id: payload.agent_user_id,
          student_code: studentCode.trim(),
          buyer_name: buyerName.trim(),
          buyer_contact: buyerContact.trim(),
          delivery_mode: deliveryMode,
          delivery_address: deliveryMode === "AT_HOME" ? deliveryAddress.trim() : "",
          items: payload.items.map((x) => ({ service_id: x.service_id, quantity: x.quantity })),
        }),
      });
      const json = await res.json();
      if (!res.ok || json.success === false) throw new Error(json.message || "Checkout failed");
      const d = json.data;
      navigate("/payments", {
        state: {
          agentShopPay: {
            batchRef: d.batch_ref,
            grandTotal: d.total,
            subtotal: d.subtotal,
            deliveryFee: d.delivery_fee,
            lines: d.lines,
            student: d.student,
            payerName: buyerName.trim(),
            payerPhone: buyerContact.trim(),
          },
        },
      });
    } catch (e1) {
      setErr(e1.message || "Checkout failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC" }}>
      <div style={{ background: NAVY, borderBottom: `3px solid ${AMBER}` }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "1rem", color: "#fff", fontWeight: 700 }}>Agent Shop Checkout</div>
      </div>
      <main style={{ maxWidth: 900, margin: "0 auto", padding: "1rem" }}>
        <div style={{ background: "#fff", border: "1.5px solid #E2E8F0", borderRadius: 14, padding: 14, marginBottom: 14 }}>
          <strong>Order Summary</strong>
          <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
            {(payload.items || []).map((x) => (
              <div key={x.service_id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span>{x.name} x{x.quantity}</span>
                <span>{(Number(x.price || 0) * Number(x.quantity || 0)).toLocaleString()} RWF</span>
              </div>
            ))}
            <div style={{ borderTop: "1px solid #E2E8F0", paddingTop: 8, display: "flex", justifyContent: "space-between" }}>
              <strong>Subtotal</strong>
              <strong>{subtotal.toLocaleString()} RWF</strong>
            </div>
          </div>
        </div>
        <form onSubmit={submit} style={{ background: "#fff", border: "1.5px solid #E2E8F0", borderRadius: 14, padding: 14, display: "grid", gap: 10 }}>
          <input value={studentCode} onChange={(e) => setStudentCode(e.target.value)} placeholder="Student code / SDM code" style={input} />
          <input value={buyerName} onChange={(e) => setBuyerName(e.target.value)} placeholder="Your full name" style={input} />
          <input value={buyerContact} onChange={(e) => setBuyerContact(e.target.value)} placeholder="Your contact (phone)" style={input} />
          <select value={deliveryMode} onChange={(e) => setDeliveryMode(e.target.value)} style={input}>
            <option value="AT_SCHOOL">Delivery at school</option>
            <option value="AT_HOME">Delivery at home (+2,500 RWF)</option>
          </select>
          {deliveryMode === "AT_HOME" && (
            <textarea value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} rows={3} placeholder="Home delivery address" style={{ ...input, resize: "vertical" }} />
          )}
          {err && <p style={{ margin: 0, color: "#B91C1C", fontSize: 13 }}>{err}</p>}
          <button type="submit" disabled={loading} style={{ border: "none", background: AMBER, color: NAVY, borderRadius: 10, minHeight: 44, fontWeight: 900, cursor: "pointer", opacity: loading ? 0.65 : 1 }}>
            {loading ? "Preparing payment..." : "Continue to payment"}
          </button>
        </form>
      </main>
    </div>
  );
}

const input = {
  width: "100%",
  border: "2px solid #E2E8F0",
  borderRadius: 10,
  padding: "10px 12px",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
};
