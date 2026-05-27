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
    navigate("/parents/agent-shop/checkout");
  };

return (
  <div className="min-h-screen">
    {/* Header */}
    <header className="sticky top-0 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
        <Link
          to="/parents/find-agent"
          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
        >Back
        </Link>
        <div className="text-center">
          <h1 className="text-lg font-bold text-slate-900">
            Agent Shop
          </h1>

          <p className="text-sm text-slate-500">
            {agentName}
            {sector && ` • ${sector}`}
          </p>
        </div>
        <button
          onClick={goCheckout}
          className="flex items-center gap-2 rounded-xl bg-indigo-950 px-4 py-2 font-semibold text-white transition hover:bg-indigo-900"
        >
          <ShoppingCart size={18} />
          <span>{itemsCount}</span>
        </button>
      </div>
    </header>
    <main className="mx-auto max-w-7xl px-4 py-8">
      {loading && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="animate-pulse overflow-hidden rounded-3xl border bg-white"
            >
              <div className="h-52 bg-slate-200" />
              <div className="space-y-3 p-4">
                <div className="h-4 rounded bg-slate-200" />
                <div className="h-4 w-2/3 rounded bg-slate-200" />
                <div className="h-10 rounded bg-slate-200" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {!loading && err && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-600">
          {err}
        </div>
      )}

      {/* Empty State */}
      {!loading && !err && rows.length === 0 && (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <ShoppingCart
            size={50}
            className="mx-auto mb-4 text-slate-300"
          />

          <h3 className="text-lg font-semibold text-slate-800">
            No Products Available
          </h3>

          <p className="mt-2 text-slate-500">
            This agent hasn't published any products yet.
          </p>
        </div>
      )}

      {/* Product Grid */}
      {!loading && !err && rows.length > 0 && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rows.map((p) => {
            const inCart = cart.find(
              (x) => x.service_id === p.id
            );

            return (
              <article
                key={p.id}
                className="
                  group
                  overflow-hidden
                  rounded-3xl
                  border
                  border-slate-200
                  bg-white
                  shadow-sm
                  transition-all
                  duration-300
                  hover:-translate-y-1
                  hover:shadow-xl
                "
              >
                {/* Image */}
                <div className="overflow-hidden">
                  <img
                    src={toImage(p.icon_url)}
                    alt={p.name}
                    className="
                      h-56
                      w-full
                      object-cover
                      transition-transform
                      duration-500
                      group-hover:scale-105
                    "
                  />
                </div>

                <div className="space-y-4 p-5">
                  <div>
                    <h3 className="line-clamp-1 text-lg font-bold text-slate-900">
                      {p.name}
                    </h3>

                    <p className="mt-2 line-clamp-2 text-sm text-slate-500">
                      {p.short_tagline ||
                        p.description ||
                        "Quality product available for purchase."}
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xl font-bold text-amber-600">
                      {Number(
                        p.price || 0
                      ).toLocaleString()}{" "}
                      RWF
                    </span>

                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                      Available
                    </span>
                  </div>

                  {!inCart ? (
                    <button
                      onClick={() => add(p)}
                      className="
                        w-full
                        rounded-xl
                        bg-indigo-950
                        py-3
                        font-semibold
                        text-white
                        transition
                        hover:bg-indigo-900
                      "
                    >
                      Add to Cart
                    </button>
                  ) : (
                    <div
                      className="
                        flex
                        items-center
                        justify-between
                        rounded-xl
                        border
                        border-slate-200
                        p-2
                      "
                    >
                      <button
                        onClick={() => dec(p.id)}
                        className="
                          flex
                          h-10
                          w-10
                          items-center
                          justify-center
                          rounded-lg
                          bg-slate-100
                          transition
                          hover:bg-slate-200
                        "
                      >
                        <Minus size={16} />
                      </button>

                      <span className="text-lg font-bold">
                        {inCart.quantity}
                      </span>

                      <button
                        onClick={() => inc(p.id)}
                        className="
                          flex
                          h-10
                          w-10
                          items-center
                          justify-center
                          rounded-lg
                          bg-slate-100
                          transition
                          hover:bg-slate-200
                        "
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>

    {/* Floating Checkout Bar */}
    {cart.length > 0 && (
      <div className="fixed bottom-20 left-4 right-4 z-50">
        <div
          className="
            mx-auto
            flex
            max-w-4xl
            items-center
            justify-between
            rounded-3xl
            border
            border-slate-200
            bg-white
            p-4
            shadow-2xl
          "
        >
          <div>
            <p className="text-sm text-slate-500">
              {itemsCount} item{itemsCount > 1 ? "s" : ""}
            </p>

            <p className="text-2xl font-bold text-slate-900">
              {total.toLocaleString()} RWF
            </p>
          </div>

          <button
            onClick={goCheckout}
            className="
              flex
              items-center
              gap-2
              rounded-xl
              bg-amber-400
              px-5
              py-3
              font-bold
              text-slate-900
              transition
              hover:bg-amber-300
            "
          >
            Checkout
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    )}
  </div>
);
}