import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ShoppingCart, Plus, Minus, ArrowRight } from "lucide-react";

const API = `${import.meta.env.VITE_API_URL || "http://localhost:5100"}/api`;
const NAVY = "#000435";
const AMBER = "#FBBF24";
const CART_KEY = "babyeyi_agent_shop_cart";

function toImage(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  const base = (import.meta.env.VITE_API_URL || "http://localhost:5100").replace(/\/$/, "");
  return `${base}${url.startsWith("/") ? "" : "/"}${url}`;
}

export default function AgentShop() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const agentUserId = params.get("agent_user_id") || "";
  const agentName = params.get("agent_name") || "Agent";
  const sector = params.get("sector") || "";

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [cart, setCart] = useState([]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(CART_KEY);
      if (raw) setCart(JSON.parse(raw));
    } catch {
      setCart([]);
    }
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch {}
  }, [cart]);

  useEffect(() => {
    if (!agentUserId) {
      setErr("Missing agent context. Go back and select an allocated agent.");
      setLoading(false);
      return;
    }
    let off = false;
    setLoading(true);
    fetch(`${API}/student-services/public/shop/products?agent_user_id=${encodeURIComponent(agentUserId)}`)
      .then((r) => r.json())
      .then((j) => {
        if (off) return;
        if (!j.success) throw new Error(j.message || "Failed to load products");
        setRows(j.data || []);
      })
      .catch((e) => !off && setErr(e.message || "Failed to load products"))
      .finally(() => !off && setLoading(false));
    return () => {
      off = true;
    };
  }, [agentUserId]);

  const add = (p) => {
    setCart((prev) => {
      const hit = prev.find((x) => x.service_id === p.id);
      if (hit) return prev.map((x) => (x.service_id === p.id ? { ...x, quantity: x.quantity + 1 } : x));
      return [...prev, { service_id: p.id, name: p.name, price: Number(p.price || 0), quantity: 1, image: p.icon_url || "" }];
    });
  };
  const inc = (id) => setCart((prev) => prev.map((x) => (x.service_id === id ? { ...x, quantity: x.quantity + 1 } : x)));
  const dec = (id) =>
    setCart((prev) =>
      prev
        .map((x) => (x.service_id === id ? { ...x, quantity: Math.max(0, x.quantity - 1) } : x))
        .filter((x) => x.quantity > 0)
    );
  const total = useMemo(() => cart.reduce((s, x) => s + Number(x.price || 0) * Number(x.quantity || 0), 0), [cart]);
  const itemsCount = useMemo(() => cart.reduce((s, x) => s + Number(x.quantity || 0), 0), [cart]);

  const goCheckout = () => {
    if (!cart.length) return;
    const payload = { agent_user_id: Number(agentUserId), agent_name: agentName, sector, items: cart };
    sessionStorage.setItem("babyeyi_agent_shop_checkout", JSON.stringify(payload));
    navigate("/agent-shop/checkout");
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC" }}>
      <div style={{ background: NAVY, borderBottom: `3px solid ${AMBER}` }}>
        <div style={{ maxWidth: 1140, margin: "0 auto", padding: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <Link to="/find-agent" style={{ color: "#fff", textDecoration: "none", fontWeight: 700 }}>Back</Link>
          <span style={{ color: AMBER, fontWeight: 800, fontSize: 13 }}>Agent Shop · {agentName}{sector ? ` · ${sector}` : ""}</span>
          <button onClick={goCheckout} style={{ background: AMBER, color: NAVY, border: "none", borderRadius: 10, padding: "9px 12px", fontWeight: 900, cursor: "pointer" }}>
            <ShoppingCart size={14} style={{ display: "inline-block", marginRight: 6 }} />
            Cart ({itemsCount})
          </button>
        </div>
      </div>
      <main style={{ maxWidth: 1140, margin: "0 auto", padding: "1rem" }}>
        {loading && <p>Loading products...</p>}
        {err && <p style={{ color: "#B91C1C" }}>{err}</p>}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 14 }}>
          {rows.map((p) => {
            const inCart = cart.find((x) => x.service_id === p.id);
            return (
              <article key={p.id} style={{ background: "#fff", border: "1.5px solid #E2E8F0", borderRadius: 14, overflow: "hidden" }}>
                <img src={toImage(p.icon_url)} alt={p.name} style={{ width: "100%", height: 150, objectFit: "cover", background: "#f1f5f9" }} />
                <div style={{ padding: 12 }}>
                  <h3 style={{ margin: "0 0 6px", color: NAVY, fontSize: 15 }}>{p.name}</h3>
                  <p style={{ margin: "0 0 8px", color: "#64748B", fontSize: 12, minHeight: 34 }}>{p.short_tagline || p.description || "Quality product."}</p>
                  <p style={{ margin: "0 0 10px", fontWeight: 900, color: "#B45309" }}>{Number(p.price || 0).toLocaleString()} RWF</p>
                  {!inCart ? (
                    <button onClick={() => add(p)} style={{ width: "100%", border: "none", background: NAVY, color: AMBER, borderRadius: 10, minHeight: 40, fontWeight: 800, cursor: "pointer" }}>Add to cart</button>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", border: "1.5px solid #E2E8F0", borderRadius: 10, minHeight: 40, padding: "0 8px" }}>
                      <button onClick={() => dec(p.id)} style={qtyBtn}><Minus size={14} /></button>
                      <strong>{inCart.quantity}</strong>
                      <button onClick={() => inc(p.id)} style={qtyBtn}><Plus size={14} /></button>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </main>
      {!!cart.length && (
        <div style={{ position: "sticky", bottom: 0, background: "#fff", borderTop: "1px solid #E2E8F0", padding: "10px 1rem" }}>
          <div style={{ maxWidth: 1140, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <strong>{itemsCount} items · {total.toLocaleString()} RWF</strong>
            <button onClick={goCheckout} style={{ border: "none", background: AMBER, color: NAVY, borderRadius: 10, minHeight: 42, padding: "0 14px", fontWeight: 900, cursor: "pointer" }}>
              Continue to checkout <ArrowRight size={14} style={{ display: "inline-block", marginLeft: 6 }} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const qtyBtn = {
  width: 26,
  height: 26,
  border: "none",
  borderRadius: 7,
  background: "#F1F5F9",
  cursor: "pointer",
};
