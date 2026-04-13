import { useEffect, useMemo, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, Building2, Home, Loader2, Package,
  Search, Shirt, Truck, User, CreditCard, ClipboardList,
} from "lucide-react";
import { getApiBase, getApiOrigin } from "../../utils/apiBase";
import { UNIFORM_VOUCHER_CHECKOUT_KEY } from "./UniformVoucherCheckout";

const FONT = `"MTN Brighter Sans", "Nunito", "Varela Round", sans-serif`;
const NAVY = "#000435";
const AMBER = "#FBBF24";

const API = getApiBase();
const ORIGIN = getApiOrigin();

const STEP_LABELS = ["Student", "Uniform type", "Items", "Delivery", "Summary", "Pay"];

function frw(n) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  return `${Number(n).toLocaleString("en-RW")} Frw`;
}

function imgSrc(url) {
  if (!url) return null;
  if (String(url).startsWith("http")) return url;
  return `${ORIGIN}${String(url).startsWith("/") ? "" : "/"}${url}`;
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label
        style={{
          display: "block",
          fontSize: 10,
          fontWeight: 900,
          letterSpacing: "0.1em",
          color: `${NAVY}99`,
          textTransform: "uppercase",
          marginBottom: 6,
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

const inp = {
  width: "100%",
  boxSizing: "border-box",
  border: "2px solid #e2e8f0",
  borderRadius: 12,
  padding: "12px 14px",
  fontSize: 15,
  fontWeight: 600,
  color: NAVY,
  fontFamily: FONT,
  minHeight: 48,
  outline: "none",
};

export default function PublicUniformVoucherRequestFlow() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [studentCode, setStudentCode] = useState("");
  const [lookupErr, setLookupErr] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [student, setStudent] = useState(null);

  const [uniformType, setUniformType] = useState(null);
  const [items, setItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [cart, setCart] = useState({});

  const [deliveryMethod, setDeliveryMethod] = useState("school");
  const [deliveryDetail, setDeliveryDetail] = useState({
    district: "",
    sector: "",
    cell: "",
    village: "",
    phone: "",
    full_address: "",
    instructions: "",
  });

  const [submitErr, setSubmitErr] = useState("");
  const [orderBusy, setOrderBusy] = useState(false);
  const [payerName, setPayerName] = useState("");
  const [payerPhone, setPayerPhone] = useState("");

  const loadItems = useCallback(async (type) => {
    setItemsLoading(true);
    try {
      const r = await fetch(`${API}/uniform-vouchers/public/items?type=${encodeURIComponent(type)}`);
      const j = await r.json();
      if (!j.success) throw new Error(j.message || "Failed to load items");
      setItems(Array.isArray(j.data) ? j.data : []);
      setCart({});
    } catch (e) {
      setItems([]);
      setSubmitErr(e.message || "Could not load catalog");
    } finally {
      setItemsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (step === 2 && uniformType) loadItems(uniformType);
  }, [step, uniformType, loadItems]);

  const onLookup = async (e) => {
    e.preventDefault();
    setLookupErr("");
    if (studentCode.trim().length < 2) {
      setLookupErr("Enter a valid student code.");
      return;
    }
    setLookupLoading(true);
    try {
      const r = await fetch(`${API}/uniform-vouchers/public/lookup-student`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_code: studentCode.trim() }),
      });
      const j = await r.json();
      if (!j.success) {
        setLookupErr(j.message || "Student not found");
        return;
      }
      setStudent(j.data.student);
      setStep(1);
    } catch {
      setLookupErr("Network error. Try again.");
    } finally {
      setLookupLoading(false);
    }
  };

  const initLine = (item) => {
    const sizes = item.sizes || [];
    const colors = item.colors || [];
    return {
      sel: false,
      size: sizes[0] ? String(sizes[0]) : "",
      color: colors[0] ? String(colors[0]) : "",
      qty: 1,
    };
  };

  const lineFor = (item) => cart[item.id] || initLine(item);

  const setLine = (item, patch) => {
    setCart((c) => ({
      ...c,
      [item.id]: { ...lineFor(item), ...patch },
    }));
  };

  const selectedLines = useMemo(() => {
    return items
      .filter((it) => lineFor(it).sel)
      .map((it) => {
        const L = lineFor(it);
        return {
          item_id: it.id,
          size: L.size,
          color: L.color || undefined,
          qty: L.qty,
        };
      });
  }, [items, cart]);

  const subtotal = useMemo(() => {
    let s = 0;
    for (const it of items) {
      const L = lineFor(it);
      if (!L.sel) continue;
      s += Number(it.price_rwf || 0) * Math.max(1, Number(L.qty) || 1);
    }
    return s;
  }, [items, cart]);

  const deliveryFee = deliveryMethod === "home" ? 2500 : 0;
  const total = subtotal + deliveryFee;

  const goPay = async () => {
    setSubmitErr("");
    if (!student || !uniformType || !selectedLines.length) return;
    if (!payerName.trim() || !payerPhone.trim()) {
      setSubmitErr("Enter payer full name and MTN phone for MoMo (next step).");
      return;
    }
    setOrderBusy(true);
    try {
      const r = await fetch(`${API}/uniform-vouchers/public/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_code: studentCode.trim(),
          uniform_type: uniformType,
          lines: selectedLines,
          delivery_method: deliveryMethod,
          delivery_detail: deliveryMethod === "home" ? deliveryDetail : {},
        }),
      });
      const j = await r.json();
      if (!r.ok || !j.success) {
        throw new Error(j.message || "Could not create order");
      }
      const d = j.data;
      const payload = {
        orderId: d.order_id,
        voucherNumber: d.voucher_number,
        orderNumber: d.order_number,
        grandTotal: Number(d.total_rwf),
        prepared: {
          student,
          uniform_type: uniformType,
          lines: selectedLines.map((ln) => {
            const it = items.find((x) => x.id === ln.item_id);
            return {
              ...ln,
              name: it?.name,
              unit_price_rwf: it?.price_rwf,
            };
          }),
          delivery_method: deliveryMethod,
          delivery_detail: deliveryMethod === "home" ? deliveryDetail : null,
        },
      };
      try {
        sessionStorage.setItem(UNIFORM_VOUCHER_CHECKOUT_KEY, JSON.stringify(payload));
      } catch {
        setSubmitErr("Could not save checkout session.");
        return;
      }
      navigate("/payments", {
        state: {
          uniformVoucherPay: { payerName: payerName.trim(), payerPhone: payerPhone.trim() },
        },
      });
    } catch (e) {
      setSubmitErr(e.message || "Failed");
    } finally {
      setOrderBusy(false);
    }
  };

  const canDelivery = () => {
    if (deliveryMethod === "school") return true;
    const need = ["district", "sector", "cell", "village", "phone", "full_address"];
    return need.every((k) => String(deliveryDetail[k] || "").trim());
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: FONT }}>
      <header style={{ position: "sticky", top: 0, zIndex: 30, background: NAVY, borderBottom: `3px solid ${AMBER}` }}>
        <div
          style={{
            maxWidth: 960,
            margin: "0 auto",
            padding: "12px 1rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <Link to="/services/uniform-voucher" style={{ color: AMBER, fontWeight: 800, fontSize: 14, textDecoration: "none" }}>
            <ArrowLeft size={16} style={{ verticalAlign: "middle", marginRight: 4 }} />
            Landing
          </Link>
          <span style={{ fontSize: 10, fontWeight: 900, color: "rgba(255,255,255,0.5)", letterSpacing: "0.12em" }}>
            REQUEST FLOW
          </span>
        </div>
      </header>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "1.25rem 1rem 3rem" }}>
        <h1 style={{ fontSize: "clamp(1.45rem, 4vw, 2rem)", fontWeight: 900, color: NAVY, margin: "0 0 0.35rem" }}>
          Uniform voucher request
        </h1>
        <p style={{ margin: "0 0 1.25rem", color: "#64748b", fontSize: 14 }}>
          Step-by-step · your progress is saved in this session until payment.
        </p>

        <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 10, marginBottom: 18 }}>
          {STEP_LABELS.map((lab, i) => (
            <button
              key={lab}
              type="button"
              onClick={() => {
                if (i <= step) setStep(i);
              }}
              style={{
                flexShrink: 0,
                borderRadius: 10,
                padding: "8px 12px",
                fontSize: 11,
                fontWeight: 800,
                border: i === step ? `2px solid ${NAVY}` : "1px solid #e2e8f0",
                background: i < step ? AMBER : i === step ? NAVY : "#fff",
                color: i < step ? NAVY : i === step ? AMBER : "#94a3b8",
                cursor: i <= step ? "pointer" : "default",
              }}
            >
              <span className="hide-sm" style={{ display: "none" }}>
                {lab}
              </span>
              <span className="show-sm">{i + 1}</span>
            </button>
          ))}
        </div>
        <style>{`
          @media(min-width:640px){
            .hide-sm{display:inline!important}
            .show-sm{display:none!important}
          }
        `}</style>

        <div
          style={{
            background: "#fff",
            borderRadius: 20,
            border: "1px solid #e2e8f0",
            padding: "1.25rem 1.1rem 1.5rem",
            boxShadow: "0 8px 30px rgba(15,23,42,0.06)",
          }}
        >
          {step === 0 && (
            <form onSubmit={onLookup}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: NAVY,
                    border: `2px solid ${AMBER}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <User size={20} color={AMBER} />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: NAVY }}>Student code</h2>
                  <p style={{ margin: 0, fontSize: 13, color: "#94a3b8" }}>We load student, school, and location automatically.</p>
                </div>
              </div>
              <Field label="Student code">
                <div className="uv-lookup-row" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <input
                    value={studentCode}
                    onChange={(e) => setStudentCode(e.target.value)}
                    placeholder="e.g. 040080001"
                    style={inp}
                  />
                  <button
                    type="submit"
                    disabled={lookupLoading}
                    style={{
                      minHeight: 48,
                      padding: "0 20px",
                      borderRadius: 12,
                      border: "none",
                      background: NAVY,
                      color: AMBER,
                      fontWeight: 900,
                      fontFamily: FONT,
                      cursor: lookupLoading ? "wait" : "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                    }}
                  >
                    {lookupLoading ? <Loader2 className="spin" size={18} /> : <Search size={18} />}
                    Lookup
                  </button>
                </div>
              </Field>
              {lookupErr && <p style={{ color: "#dc2626", fontSize: 13, fontWeight: 600 }}>{lookupErr}</p>}
              <style>{`
                .spin{animation:spin .9s linear infinite}
                @keyframes spin{to{transform:rotate(360deg)}}
                @media(min-width:640px){
                  .uv-lookup-row{flex-direction:row!important;align-items:stretch}
                  .uv-lookup-row input{flex:1}
                }
              `}</style>
            </form>
          )}

          {step === 1 && student && (
            <div>
              <h2 style={{ margin: "0 0 12px", fontSize: 18, fontWeight: 900, color: NAVY }}>Student & school</h2>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                  gap: 10,
                  marginBottom: 20,
                }}
              >
                {[
                  ["Full name", student.full_name || `${student.first_name} ${student.last_name}`],
                  ["Student code", student.student_code || student.student_uid],
                  ["Gender", student.gender || "—"],
                  ["Class", student.class_name || "—"],
                  ["School", student.school_name || "—"],
                  ["District", student.school_district || student.district || "—"],
                  ["Sector", student.school_sector || student.sector || "—"],
                  ["Cell", student.cell || "—"],
                  ["Father", student.parent_guardian?.father_name || "—"],
                  ["Mother", student.parent_guardian?.mother_name || "—"],
                ].map(([k, v]) => (
                  <div key={k} style={{ background: "#f8fafc", borderRadius: 12, padding: "10px 12px", border: "1px solid #e2e8f0" }}>
                    <p style={{ margin: 0, fontSize: 10, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase" }}>{k}</p>
                    <p style={{ margin: "6px 0 0", fontSize: 14, fontWeight: 700, color: NAVY }}>{v || "—"}</p>
                  </div>
                ))}
              </div>
              <h2 style={{ margin: "0 0 12px", fontSize: 18, fontWeight: 900, color: NAVY }}>Choose uniform type</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
                {[
                  {
                    id: "school",
                    title: "School uniform",
                    sub: "Shirt, trousers, skirt, sweater…",
                    Icon: Shirt,
                  },
                  {
                    id: "sports",
                    title: "Sports uniform",
                    sub: "PE kit, tracksuit, sports shoes…",
                    Icon: Package,
                  },
                ].map(({ id, title, sub, Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setUniformType(id);
                      setStep(2);
                    }}
                    style={{
                      textAlign: "left",
                      padding: "1rem 1.1rem",
                      borderRadius: 16,
                      border: uniformType === id ? `2px solid ${AMBER}` : "2px solid #e2e8f0",
                      background: uniformType === id ? "#fffbeb" : "#fff",
                      cursor: "pointer",
                      fontFamily: FONT,
                    }}
                  >
                    <Icon size={22} color={NAVY} />
                    <p style={{ margin: "10px 0 4px", fontWeight: 900, color: NAVY }}>{title}</p>
                    <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>{sub}</p>
                  </button>
                ))}
              </div>
              <div style={{ marginTop: 18 }}>
                <button type="button" onClick={() => setStep(0)} style={{ ...inp, width: "auto", cursor: "pointer", fontWeight: 800 }}>
                  Back
                </button>
              </div>
            </div>
          )}

          {step === 2 && uniformType && (
            <div>
              <h2 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 900, color: NAVY }}>Select items</h2>
              <p style={{ margin: "0 0 14px", fontSize: 13, color: "#64748b" }}>
                Pick only what you need — one piece or a full set. Prices may vary by item.
              </p>
              {itemsLoading ? (
                <div style={{ padding: 40, textAlign: "center" }}>
                  <Loader2 className="spin" size={32} color="#D97706" />
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {items.map((it) => {
                    const L = lineFor(it);
                    const src = imgSrc(it.image_url);
                    return (
                      <div
                        key={it.id}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "minmax(0,1fr)",
                          gap: 12,
                          border: L.sel ? `2px solid ${AMBER}` : "1px solid #e2e8f0",
                          borderRadius: 16,
                          padding: 12,
                          background: L.sel ? "#fffbeb" : "#fff",
                        }}
                      >
                        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                          <div
                            style={{
                              width: 72,
                              height: 72,
                              borderRadius: 12,
                              background: "#f1f5f9",
                              overflow: "hidden",
                              flexShrink: 0,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            {src ? (
                              <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            ) : (
                              <Shirt size={28} color="#94a3b8" />
                            )}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                              <div>
                                <p style={{ margin: 0, fontWeight: 900, color: NAVY }}>{it.name}</p>
                                <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b", lineHeight: 1.45 }}>{it.description}</p>
                              </div>
                              <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 800, color: NAVY, cursor: "pointer" }}>
                                <input
                                  type="checkbox"
                                  checked={L.sel}
                                  onChange={(e) => setLine(it, { sel: e.target.checked })}
                                />
                                Select
                              </label>
                            </div>
                            <p style={{ margin: "8px 0 0", fontWeight: 900, color: "#B45309" }}>{frw(it.price_rwf)}</p>
                            {it.stock_qty != null && (
                              <p style={{ margin: "4px 0 0", fontSize: 11, color: it.stock_qty < 5 ? "#b91c1c" : "#64748b" }}>
                                Stock: {it.stock_qty}
                              </p>
                            )}
                          </div>
                        </div>
                        {L.sel && (
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                              gap: 10,
                              paddingTop: 4,
                            }}
                          >
                            <Field label="Size">
                              <select
                                value={L.size}
                                onChange={(e) => setLine(it, { size: e.target.value })}
                                style={{ ...inp, cursor: "pointer" }}
                              >
                                {(it.sizes || []).map((s) => (
                                  <option key={s} value={s}>
                                    {s}
                                  </option>
                                ))}
                              </select>
                            </Field>
                            {(it.colors || []).length > 0 && (
                              <Field label="Colour">
                                <select
                                  value={L.color}
                                  onChange={(e) => setLine(it, { color: e.target.value })}
                                  style={{ ...inp, cursor: "pointer" }}
                                >
                                  {(it.colors || []).map((s) => (
                                    <option key={s} value={s}>
                                      {s}
                                    </option>
                                  ))}
                                </select>
                              </Field>
                            )}
                            <Field label="Qty">
                              <input
                                type="number"
                                min={1}
                                max={99}
                                value={L.qty}
                                onChange={(e) => setLine(it, { qty: Math.max(1, Math.min(99, parseInt(e.target.value, 10) || 1)) })}
                                style={inp}
                              />
                            </Field>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20, gap: 10, flexWrap: "wrap" }}>
                <button type="button" onClick={() => setStep(1)} style={{ ...inp, width: "auto", cursor: "pointer", fontWeight: 800 }}>
                  Back
                </button>
                <button
                  type="button"
                  disabled={!selectedLines.length}
                  onClick={() => selectedLines.length && setStep(3)}
                  style={{
                    ...inp,
                    width: "auto",
                    cursor: selectedLines.length ? "pointer" : "not-allowed",
                    opacity: selectedLines.length ? 1 : 0.45,
                    background: NAVY,
                    color: AMBER,
                    border: "none",
                    fontWeight: 900,
                  }}
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 style={{ margin: "0 0 12px", fontSize: 18, fontWeight: 900, color: NAVY }}>Delivery</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginBottom: 16 }}>
                {[
                  { id: "school", label: "Deliver to school", Icon: Building2, note: student?.school_name || "School address on file" },
                  { id: "home", label: "Deliver at home", Icon: Home, note: "+2,500 Frw delivery fee" },
                ].map(({ id, label, Icon, note }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setDeliveryMethod(id)}
                    style={{
                      textAlign: "left",
                      padding: "12px 14px",
                      borderRadius: 14,
                      border: deliveryMethod === id ? `2px solid ${AMBER}` : "2px solid #e2e8f0",
                      background: deliveryMethod === id ? "#fffbeb" : "#fff",
                      cursor: "pointer",
                      fontFamily: FONT,
                    }}
                  >
                    <Icon size={20} color={NAVY} />
                    <p style={{ margin: "8px 0 4px", fontWeight: 900, color: NAVY, fontSize: 14 }}>{label}</p>
                    <p style={{ margin: 0, fontSize: 11, color: "#64748b" }}>{note}</p>
                  </button>
                ))}
              </div>
              {deliveryMethod === "school" && student && (
                <div style={{ background: "#f8fafc", borderRadius: 14, padding: 14, fontSize: 13, color: "#475569", marginBottom: 12 }}>
                  <p style={{ margin: "0 0 6px", fontWeight: 800, color: NAVY }}>{student.school_name}</p>
                  <p style={{ margin: 0 }}>
                    {student.school_district || student.district} · {student.school_sector || student.sector}
                  </p>
                  <p style={{ margin: "8px 0 0", fontSize: 12 }}>Uniforms are batched for school delivery where the programme allows.</p>
                </div>
              )}
              {deliveryMethod === "home" && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
                  {["district", "sector", "cell", "village", "phone", "full_address"].map((k) => (
                    <Field key={k} label={k.replace("_", " ")}>
                      <input
                        value={deliveryDetail[k]}
                        onChange={(e) => setDeliveryDetail((d) => ({ ...d, [k]: e.target.value }))}
                        style={inp}
                        placeholder={k}
                      />
                    </Field>
                  ))}
                  <Field label="Instructions (optional)">
                    <input
                      value={deliveryDetail.instructions}
                      onChange={(e) => setDeliveryDetail((d) => ({ ...d, instructions: e.target.value }))}
                      style={{ ...inp, gridColumn: "1 / -1" }}
                      placeholder="Gate, landmark, etc."
                    />
                  </Field>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20, gap: 10, flexWrap: "wrap" }}>
                <button type="button" onClick={() => setStep(2)} style={{ ...inp, width: "auto", cursor: "pointer", fontWeight: 800 }}>
                  Back
                </button>
                <button
                  type="button"
                  disabled={!canDelivery()}
                  onClick={() => canDelivery() && setStep(4)}
                  style={{
                    ...inp,
                    width: "auto",
                    background: NAVY,
                    color: AMBER,
                    border: "none",
                    fontWeight: 900,
                    cursor: canDelivery() ? "pointer" : "not-allowed",
                    opacity: canDelivery() ? 1 : 0.45,
                  }}
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <h2 style={{ margin: "0 0 12px", fontSize: 18, fontWeight: 900, color: NAVY }}>Order summary</h2>
              <div style={{ background: "#f8fafc", borderRadius: 14, padding: 14, marginBottom: 14, fontSize: 13 }}>
                <p style={{ margin: 0, fontWeight: 800, color: NAVY }}>Student</p>
                <p style={{ margin: "6px 0 0", color: "#475569" }}>
                  {student?.full_name} · {student?.student_code || student?.student_uid}
                </p>
                <p style={{ margin: "10px 0 0", fontWeight: 800, color: NAVY }}>School</p>
                <p style={{ margin: "6px 0 0", color: "#475569" }}>{student?.school_name}</p>
                <p style={{ margin: "10px 0 0", fontWeight: 800, color: NAVY }}>Uniform type</p>
                <p style={{ margin: "6px 0 0", color: "#475569", textTransform: "capitalize" }}>{uniformType}</p>
              </div>
              <div style={{ marginBottom: 12 }}>
                <p style={{ fontWeight: 900, color: NAVY, marginBottom: 8 }}>Line items</p>
                {items
                  .filter((it) => lineFor(it).sel)
                  .map((it) => {
                    const L = lineFor(it);
                    return (
                      <div
                        key={it.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          padding: "8px 0",
                          borderBottom: "1px solid #e2e8f0",
                          fontSize: 13,
                        }}
                      >
                        <span>
                          {it.name} · {L.size}
                          {L.color ? ` · ${L.color}` : ""} × {L.qty}
                        </span>
                        <span style={{ fontWeight: 800 }}>{frw(Number(it.price_rwf) * L.qty)}</span>
                      </div>
                    );
                  })}
              </div>
              <div style={{ background: "#fffbeb", border: `2px solid ${AMBER}`, borderRadius: 14, padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span>Subtotal</span>
                  <span style={{ fontWeight: 800 }}>{frw(subtotal)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span>Delivery</span>
                  <span style={{ fontWeight: 800 }}>{frw(deliveryFee)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 8, borderTop: `2px solid #fcd34d` }}>
                  <span style={{ fontWeight: 900, color: NAVY }}>Total</span>
                  <span style={{ fontWeight: 900, fontSize: 18, color: NAVY }}>{frw(total)}</span>
                </div>
              </div>
              {submitErr && <p style={{ color: "#dc2626", fontSize: 13, marginTop: 10 }}>{submitErr}</p>}
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20, gap: 10, flexWrap: "wrap" }}>
                <button type="button" onClick={() => setStep(3)} style={{ ...inp, width: "auto", cursor: "pointer", fontWeight: 800 }}>
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setStep(5)}
                  style={{ ...inp, width: "auto", background: NAVY, color: AMBER, border: "none", fontWeight: 900, cursor: "pointer" }}
                >
                  Confirm &amp; continue to payment
                </button>
              </div>
            </div>
          )}

          {step === 5 && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: NAVY,
                    border: `2px solid ${AMBER}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <CreditCard size={20} color={AMBER} />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: NAVY }}>Payment</h2>
                  <p style={{ margin: 0, fontSize: 13, color: "#94a3b8" }}>We will create your order, then open secure MTN MoMo checkout.</p>
                </div>
              </div>
              <div style={{ background: "#f8fafc", borderRadius: 14, padding: 14, marginBottom: 14, fontSize: 14 }}>
                <p style={{ margin: 0 }}>
                  Amount due: <strong style={{ color: NAVY }}>{frw(total)}</strong>
                </p>
                <p style={{ margin: "8px 0 0", fontSize: 12, color: "#64748b" }}>
                  Confirm who pays — the next screen starts MTN MoMo for this amount.
                </p>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10, marginBottom: 14 }}>
                <Field label="Payer full name">
                  <input value={payerName} onChange={(e) => setPayerName(e.target.value)} placeholder="Parent or guardian" style={inp} />
                </Field>
                <Field label="Payer phone (MTN)">
                  <input value={payerPhone} onChange={(e) => setPayerPhone(e.target.value)} placeholder="07…" style={inp} />
                </Field>
              </div>
              {submitErr && <p style={{ color: "#dc2626", fontSize: 13 }}>{submitErr}</p>}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button type="button" onClick={() => setStep(4)} style={{ ...inp, width: "auto", cursor: "pointer", fontWeight: 800 }}>
                  Back
                </button>
                <button
                  type="button"
                  disabled={orderBusy}
                  onClick={goPay}
                  style={{
                    ...inp,
                    width: "auto",
                    background: AMBER,
                    color: NAVY,
                    border: "none",
                    fontWeight: 900,
                    cursor: orderBusy ? "wait" : "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  {orderBusy ? <Loader2 className="spin" size={18} /> : <Truck size={18} />}
                  Create order &amp; pay
                </button>
              </div>
            </div>
          )}
        </div>

        <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#64748b", flexWrap: "wrap" }}>
          <ClipboardList size={14} />
          <span>
            After payment, track with your voucher on{" "}
            <Link to="/services/uniform-voucher/track" style={{ color: "#B45309", fontWeight: 800 }}>
              Track order
            </Link>
            .
          </span>
        </div>
      </div>
    </div>
  );
}
