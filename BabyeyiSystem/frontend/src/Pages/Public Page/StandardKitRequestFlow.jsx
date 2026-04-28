import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Check, ChevronRight, Loader2, School, Home, UserCircle2 } from "lucide-react";
import { getApiBase } from "../../utils/apiBase";

const API = getApiBase();
const NAVY = "#000435";
const AMBER = "#FBBF24";

const steps = ["Kit", "Student", "Delivery", "Payment"];

export default function StandardKitRequestFlow() {
  const { kitId } = useParams();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [kit, setKit] = useState(null);
  const [loadingKit, setLoadingKit] = useState(true);
  const [studentCode, setStudentCode] = useState("");
  const [student, setStudent] = useState(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [delivery, setDelivery] = useState("AT_SCHOOL");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [requesterName, setRequesterName] = useState("");
  const [requesterContact, setRequesterContact] = useState("");
  const [err, setErr] = useState("");
  const [preparing, setPreparing] = useState(false);

  useEffect(() => {
    let off = false;
    setLoadingKit(true);
    fetch(`${API}/standard-shule-kits/public/kits/${encodeURIComponent(kitId)}`)
      .then((r) => r.json())
      .then((j) => {
        if (off) return;
        if (!j.success) throw new Error(j.message || "Could not load kit");
        setKit(j.data);
      })
      .catch((e) => !off && setErr(e.message || "Could not load kit"))
      .finally(() => !off && setLoadingKit(false));
    return () => {
      off = true;
    };
  }, [kitId]);

  const deliveryFee = delivery === "AT_HOME" ? 2500 : 0;
  const total = useMemo(() => Number(kit?.total_frw || 0) + deliveryFee, [kit, deliveryFee]);

  const lookup = async () => {
    setErr("");
    if (!studentCode.trim()) return setErr("Enter student code first.");
    setLookingUp(true);
    try {
      const res = await fetch(`${API}/public/student-code-lookup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: studentCode.trim() }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false || !json.found || !json.data) throw new Error(json.message || "Student not found.");
      setStudent(json.data);
      setStep(2);
    } catch (e) {
      setErr(e.message || "Lookup failed");
    } finally {
      setLookingUp(false);
    }
  };

  const continueToDelivery = () => {
    if (!student) return setErr("Lookup and confirm student first.");
    setErr("");
    setStep(3);
  };

  const continueToPayment = async () => {
    setErr("");
    if (!requesterName.trim() || !requesterContact.trim()) return setErr("Name and contact are required.");
    if (delivery === "AT_HOME" && !deliveryAddress.trim()) return setErr("Home delivery address is required.");
    setPreparing(true);
    try {
      const res = await fetch(`${API}/standard-shule-kits/public/requests/prepare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kit_id: Number(kitId),
          student_code: studentCode.trim(),
          requester_name: requesterName.trim(),
          requester_contact: requesterContact.trim(),
          delivery_option: delivery,
          delivery_address: delivery === "AT_HOME" ? deliveryAddress.trim() : "",
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) throw new Error(json.message || "Could not prepare request.");
      navigate("/payments", {
        state: {
          standardKitPay: {
            prepared: json.data,
            grandTotal: Number(json.data.total_frw || 0),
          },
        },
      });
    } catch (e) {
      setErr(e.message || "Could not continue to payment");
    } finally {
      setPreparing(false);
    }
  };

  if (loadingKit) return <div style={{ minHeight: "70vh", display: "grid", placeItems: "center" }}><Loader2 className="animate-spin" /></div>;

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC" }}>
      <div style={{ background: NAVY, borderBottom: `3px solid ${AMBER}` }}>
        <div style={{ maxWidth: 980, margin: "0 auto", padding: "1rem", color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <Link to="/services/standard-shulekit" style={{ color: "#fff", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}>
            <ArrowLeft size={15} /> Back
          </Link>
          <strong style={{ color: AMBER, fontSize: 13 }}>Standard Kit Request</strong>
        </div>
      </div>

      <main style={{ maxWidth: 980, margin: "0 auto", padding: "1rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 8, marginBottom: 14 }}>
          {steps.map((s, i) => (
            <div key={s} style={{ background: i + 1 <= step ? "#fff7e6" : "#fff", border: `1.5px solid ${i + 1 <= step ? "#fcd34d" : "#E2E8F0"}`, borderRadius: 10, padding: "8px 10px", fontSize: 12, fontWeight: 800, color: i + 1 <= step ? "#92400E" : "#64748B", display: "flex", alignItems: "center", gap: 6 }}>
              {i + 1 < step ? <Check size={12} /> : i + 1}. {s}
            </div>
          ))}
        </div>

        <section style={{ background: "#fff", border: "1.5px solid #E2E8F0", borderRadius: 14, padding: 14, marginBottom: 12 }}>
          <h2 style={{ margin: "0 0 8px", color: NAVY, fontSize: 18 }}>{kit?.grade_level || "Standard Kit"}</h2>
          <p style={{ margin: "0 0 6px", color: "#64748B", fontSize: 13 }}>{kit?.description || "Predefined standard kit."}</p>
          <strong style={{ color: "#B45309" }}>{Number(kit?.total_frw || 0).toLocaleString()} RWF</strong>
        </section>

        {step === 1 && (
          <section style={{ background: "#fff", border: "1.5px solid #E2E8F0", borderRadius: 14, padding: 14 }}>
            <p style={{ margin: "0 0 8px", fontWeight: 800, color: NAVY }}>Student lookup</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input value={studentCode} onChange={(e) => setStudentCode(e.target.value)} placeholder="Enter Student Code / SDM" style={{ ...input, flex: 1, minWidth: 220 }} />
              <button onClick={lookup} disabled={lookingUp} style={btn}>{lookingUp ? "Looking up..." : "Lookup"}</button>
            </div>
          </section>
        )}

        {step >= 2 && student && (
          <section style={{ background: "#fff", border: "1.5px solid #E2E8F0", borderRadius: 14, padding: 14, marginTop: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <UserCircle2 size={16} color="#475569" />
              <strong>Student details</strong>
            </div>
            <p style={txt}><strong>Name:</strong> {student.first_name} {student.last_name}</p>
            <p style={txt}><strong>School:</strong> {student.school_name || "—"}</p>
            <p style={txt}><strong>District:</strong> {student.district || "—"}</p>
            <p style={txt}><strong>Sector:</strong> {student.sector || "—"}</p>
            {step === 2 && <button onClick={continueToDelivery} style={{ ...btn, marginTop: 8 }}>Continue <ChevronRight size={14} /></button>}
          </section>
        )}

        {step >= 3 && (
          <section style={{ background: "#fff", border: "1.5px solid #E2E8F0", borderRadius: 14, padding: 14, marginTop: 12 }}>
            <p style={{ margin: "0 0 8px", fontWeight: 800, color: NAVY }}>Delivery option</p>
            <div style={{ display: "grid", gap: 8 }}>
              <button onClick={() => setDelivery("AT_SCHOOL")} style={delivery === "AT_SCHOOL" ? pickOn : pickOff}>
                <School size={16} /> Delivered to School (FREE)
              </button>
              <button onClick={() => setDelivery("AT_HOME")} style={delivery === "AT_HOME" ? pickOn : pickOff}>
                <Home size={16} /> Delivered at Home (+2,500 RWF)
              </button>
              {delivery === "AT_HOME" && (
                <textarea rows={3} value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} placeholder="Enter home delivery address" style={{ ...input, resize: "vertical" }} />
              )}
            </div>
            <div style={{ marginTop: 10, borderTop: "1px solid #E2E8F0", paddingTop: 8 }}>
              <input value={requesterName} onChange={(e) => setRequesterName(e.target.value)} placeholder="Your full name" style={input} />
              <input value={requesterContact} onChange={(e) => setRequesterContact(e.target.value)} placeholder="Your contact phone" style={{ ...input, marginTop: 8 }} />
            </div>
            <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong>Total</strong>
              <strong style={{ color: "#B45309" }}>{total.toLocaleString()} RWF</strong>
            </div>
            <button onClick={continueToPayment} disabled={preparing} style={{ ...btn, marginTop: 10 }}>{preparing ? "Preparing..." : "Continue to Payment"}</button>
          </section>
        )}

        {err && <p style={{ marginTop: 10, color: "#B91C1C", fontSize: 13 }}>{err}</p>}
      </main>
    </div>
  );
}

const input = { width: "100%", border: "2px solid #E2E8F0", borderRadius: 10, padding: "10px 12px", fontSize: 14, outline: "none", boxSizing: "border-box" };
const btn = { border: "none", background: AMBER, color: NAVY, borderRadius: 10, minHeight: 42, padding: "0 14px", fontWeight: 900, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 };
const pickOn = { border: "1.5px solid #F59E0B", background: "#FFFBEB", color: "#92400E", borderRadius: 10, minHeight: 44, padding: "0 12px", fontWeight: 800, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 };
const pickOff = { ...pickOn, border: "1.5px solid #E2E8F0", background: "#fff", color: "#334155" };
const txt = { margin: "2px 0", color: "#475569", fontSize: 13 };
