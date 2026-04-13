import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Loader2, Search, Shirt, ClipboardList, Package } from "lucide-react";
import { getApiBase } from "../../utils/apiBase";

const FONT = `"MTN Brighter Sans", "Nunito", "Varela Round", sans-serif`;
const NAVY = "#000435";
const AMBER = "#FBBF24";
const API = getApiBase();

function frw(n) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  return `${Number(n).toLocaleString("en-RW")} Frw`;
}

function fmtDate(s) {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleString();
  } catch {
    return String(s);
  }
}

function Row({ label, value }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        padding: "10px 0",
        borderBottom: "1px solid #e2e8f0",
        fontSize: 14,
      }}
    >
      <span style={{ color: "#64748b", fontWeight: 600 }}>{label}</span>
      <span style={{ color: NAVY, fontWeight: 800, textAlign: "right" }}>{value ?? "—"}</span>
    </div>
  );
}

export default function PublicUniformVoucherTrack() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initial = String(searchParams.get("voucher") || searchParams.get("v") || "").trim();
  const [code, setCode] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [data, setData] = useState(null);

  const runLookup = useCallback(async (voucherNumber) => {
    const v = String(voucherNumber || "").trim();
    setErr("");
    setData(null);
    if (!v) {
      setErr("Enter your voucher number.");
      return;
    }
    setLoading(true);
    try {
      const r = await fetch(`${API}/uniform-vouchers/public/track/${encodeURIComponent(v)}`);
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.success) {
        setErr(j.message || "Order not found.");
        return;
      }
      setData(j.data);
      setSearchParams({ voucher: v }, { replace: true });
    } catch {
      setErr("Could not reach the server. Try again.");
    } finally {
      setLoading(false);
    }
  }, [setSearchParams]);

  useEffect(() => {
    if (!initial) return;
    runLookup(initial);
  }, [initial, runLookup]);

  const onSubmit = (e) => {
    e.preventDefault();
    runLookup(code);
  };

  const st = data?.student || {};
  const sch = data?.school || {};
  const lines = Array.isArray(data?.lines) ? data.lines : [];

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC", fontFamily: FONT }}>
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 40,
          background: NAVY,
          borderBottom: `3px solid ${AMBER}`,
        }}
      >
        <div
          style={{
            maxWidth: 640,
            margin: "0 auto",
            padding: "14px 1rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <Link to="/services/uniform-voucher" style={{ color: AMBER, fontWeight: 800, fontSize: 14, textDecoration: "none" }}>
            <ArrowLeft size={16} style={{ verticalAlign: "middle", marginRight: 4 }} />
            Uniform voucher
          </Link>
          <ClipboardList size={18} color={AMBER} aria-hidden />
        </div>
      </header>

      <main style={{ maxWidth: 640, margin: "0 auto", padding: "1.5rem 1rem 2.5rem" }}>
        <h1 style={{ fontSize: "clamp(1.35rem, 4vw, 1.75rem)", fontWeight: 900, color: NAVY, margin: "0 0 0.35rem" }}>
          Track your order
        </h1>
        <p style={{ margin: "0 0 1.25rem", color: "#64748b", fontSize: 14, lineHeight: 1.55 }}>
          Enter the voucher number from your confirmation (for example <span style={{ fontFamily: "monospace", color: NAVY }}>UNI-2026-…</span>
          ). You can also open this page with <span style={{ fontFamily: "monospace" }}>?voucher=YOUR_CODE</span> in the link.
        </p>

        <form
          onSubmit={onSubmit}
          style={{
            background: "#fff",
            borderRadius: 16,
            border: "1px solid #e2e8f0",
            padding: "1rem 1.1rem",
            marginBottom: "1.25rem",
            boxShadow: "0 4px 20px rgba(15,23,42,0.05)",
          }}
        >
          <label style={{ display: "block", fontSize: 10, fontWeight: 900, letterSpacing: "0.1em", color: `${NAVY}99`, marginBottom: 8, textTransform: "uppercase" }}>
            Voucher number
          </label>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. UNI-2026-AB12CD34"
              style={{
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
              }}
            />
            <button
              type="submit"
              disabled={loading}
              style={{
                minHeight: 48,
                borderRadius: 12,
                border: "none",
                background: NAVY,
                color: AMBER,
                fontWeight: 900,
                fontFamily: FONT,
                fontSize: 14,
                cursor: loading ? "wait" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              {loading ? <Loader2 size={18} className="uv-spin" /> : <Search size={18} />}
              Look up
            </button>
          </div>
          {err && (
            <p style={{ margin: "12px 0 0", color: "#dc2626", fontSize: 13, fontWeight: 600 }} role="alert">
              {err}
            </p>
          )}
        </form>

        <style>{`.uv-spin{animation:uvs .85s linear infinite}@keyframes uvs{to{transform:rotate(360deg)}}`}</style>

        {data && (
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              border: `2px solid ${AMBER}`,
              padding: "1.15rem 1.2rem",
              boxShadow: "0 8px 28px rgba(15,23,42,0.06)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
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
                <Shirt size={20} color={AMBER} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: "#B45309", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  Order found
                </p>
                <p style={{ margin: "4px 0 0", fontSize: 16, fontWeight: 900, color: NAVY, fontFamily: "monospace" }}>{data.voucher_number}</p>
              </div>
            </div>

            <Row label="Order number" value={data.order_number} />
            <Row label="Booking status" value={data.booking_status} />
            <Row label="Payment status" value={data.payment_status} />
            <Row label="Delivery status" value={data.delivery_status} />
            <Row label="Uniform type" value={data.uniform_type ? String(data.uniform_type).replace(/^\w/, (c) => c.toUpperCase()) : "—"} />
            <Row label="Delivery" value={data.delivery_method === "home" ? "Home" : "School"} />
            <Row label="Total" value={frw(data.total_rwf)} />
            <Row label="Created" value={fmtDate(data.created_at)} />
            <Row label="Last updated" value={fmtDate(data.updated_at)} />

            <div style={{ marginTop: 18, paddingTop: 14, borderTop: `2px solid ${AMBER}55` }}>
              <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 900, color: `${NAVY}99`, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Student
              </p>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: NAVY }}>
                {st.first_name} {st.last_name}
              </p>
              <p style={{ margin: "6px 0 0", fontSize: 13, color: "#64748b" }}>Code: {st.student_code || "—"}</p>
            </div>

            <div style={{ marginTop: 16 }}>
              <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 900, color: `${NAVY}99`, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                School
              </p>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: NAVY }}>{sch.school_name || "—"}</p>
              <p style={{ margin: "6px 0 0", fontSize: 13, color: "#64748b" }}>
                {[sch.district, sch.sector].filter(Boolean).join(" · ") || "—"}
              </p>
            </div>

            {lines.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <p style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 900, color: `${NAVY}99`, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Items
                </p>
                <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                  {lines.map((ln, i) => (
                    <li
                      key={i}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 8,
                        padding: "8px 0",
                        borderBottom: "1px solid #f1f5f9",
                        fontSize: 13,
                        color: "#334155",
                      }}
                    >
                      <span>
                        <Package size={14} style={{ verticalAlign: "middle", marginRight: 6, color: "#94a3b8" }} />
                        {ln.name || "Item"} · {ln.size || "—"}
                        {ln.color ? ` · ${ln.color}` : ""} × {ln.qty ?? 1}
                      </span>
                      <span style={{ fontWeight: 800, color: NAVY, flexShrink: 0 }}>{frw(ln.line_total_rwf)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <p style={{ marginTop: "1.5rem", fontSize: 13, color: "#64748b", textAlign: "center" }}>
          <Link to="/services/uniform-voucher/request" style={{ color: "#B45309", fontWeight: 800, textDecoration: "none" }}>
            Start a new uniform request →
          </Link>
        </p>
      </main>
    </div>
  );
}
