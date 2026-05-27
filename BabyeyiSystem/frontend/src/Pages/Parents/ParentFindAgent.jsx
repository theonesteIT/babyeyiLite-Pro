import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import {
  MapPin,
  Phone,
  Mail,
  UserRound,
  Search,
  ShoppingBag,
  ChevronDown,
  X,
  Send,
  CheckCircle2,
  AlertCircle,
  Loader2,
  MessageSquarePlus,
  Menu,
  LogIn,
  Map,
  Building2,
  Users,
  Headphones,
} from "lucide-react";
import babyeyiLogo from "../../assets/1BABYEYI LOGO FINAL.png";

// ── Brand tokens ──────────────────────────────────────────────────
const NAVY = "#000435";
const AMBER = "#FBBF24";
const AM50 = "#FAEEDA";
const AM600 = "#854F0B";
const AM200 = "#EF9F27";
const INK = "rgba(0,4,53,0.72)";
const INK_LT = "rgba(0,4,53,0.45)";
const LINE = "rgba(0,4,53,0.10)";
const FONT = "'Montserrat', 'Segoe UI', sans-serif";
const API = `${import.meta.env.VITE_API_URL || "http://localhost:5100"}/api`;

async function getJson(url) {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok || json.success === false)
    throw new Error(json.message || "Request failed");
  return json;
}

// ── SelectField ───────────────────────────────────────────────────
function SelectField({ label, value, onChange, disabled, children }) {
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.09em",
          color: INK_LT,
        }}
      >
        {label}
      </span>
      <div style={{ position: "relative" }}>
        <select
          value={value}
          onChange={onChange}
          disabled={disabled}
          style={{
            width: "100%",
            appearance: "none",
            border: `1.5px solid ${disabled ? "#e8eaf0" : LINE}`,
            borderRadius: 10,
            padding: "11px 38px 11px 14px",
            fontFamily: FONT,
            fontWeight: 500,
            fontSize: 14,
            color: disabled ? "#aab" : NAVY,
            background: disabled ? "#f8fafc" : "#fff",
            outline: "none",
            cursor: disabled ? "not-allowed" : "pointer",
            transition: "border 0.15s, box-shadow 0.15s",
            boxSizing: "border-box",
          }}
          onFocus={(e) => {
            e.target.style.borderColor = AMBER;
            e.target.style.boxShadow = `0 0 0 3px rgba(251,191,36,0.15)`;
          }}
          onBlur={(e) => {
            e.target.style.borderColor = disabled ? "#e8eaf0" : LINE;
            e.target.style.boxShadow = "none";
          }}
        >
          {children}
        </select>
        <ChevronDown
          size={15}
          color={disabled ? "#ccc" : INK_LT}
          style={{
            position: "absolute",
            right: 12,
            top: "50%",
            transform: "translateY(-50%)",
            pointerEvents: "none",
          }}
        />
      </div>
    </div>
  );
}

// ── InputField ────────────────────────────────────────────────────
function InputField({
  label,
  value,
  onChange,
  placeholder,
  as: As = "input",
  rows,
}) {
  const Tag = As;
  return (
    <label style={{ display: "grid", gap: 5 }}>
      {label && (
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: INK_LT,
          }}
        >
          {label}
        </span>
      )}
      <Tag
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        style={{
          width: "100%",
          border: `1.5px solid ${LINE}`,
          borderRadius: 10,
          padding: "11px 14px",
          fontFamily: FONT,
          fontWeight: 500,
          fontSize: 14,
          color: NAVY,
          background: "#fff",
          outline: "none",
          resize: As === "textarea" ? "vertical" : undefined,
          boxSizing: "border-box",
        }}
      />
    </label>
  );
}

// ── Support Modal ─────────────────────────────────────────────────
function SupportModal({
  agents,
  initialAgentId,
  province,
  district,
  sector,
  onClose,
}) {
  const [agentId, setAgentId] = useState(
    initialAgentId || (agents[0]?.id ? String(agents[0].id) : ""),
  );
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [err, setErr] = useState("");
  const overlayRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    if (!agentId || !name.trim() || !contact.trim() || !description.trim()) {
      setErr("Please fill in all required fields.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/public/agents/support-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_user_id: agentId,
          requester_name: name.trim(),
          requester_contact: contact.trim(),
          requester_description: description.trim(),
          province,
          district,
          sector,
        }),
      });
      const json = await res.json();
      if (!res.ok || json.success === false)
        throw new Error(json.message || "Failed to submit.");
      setSuccess(true);
    } catch (e) {
      setErr(e.message || "Failed to send request.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      ref={overlayRef}
      onClick={(e) => e.target === overlayRef.current && onClose()}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(0,4,53,0.55)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        fontFamily: FONT,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          background: "#fff",
          borderRadius: 20,
          overflow: "hidden",
          boxShadow: "0 24px 64px rgba(0,4,53,0.22)",
          animation: "modalSlide 0.22s ease",
        }}
      >
        <div
          style={{
            background: NAVY,
            padding: "20px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                display: "grid",
                placeItems: "center",
              }}
            >
              <MessageSquarePlus size={17} color={AMBER} />
            </div>
            <div>
              <div
                style={{
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 15,
                  lineHeight: 1.2,
                }}
              >
                Request Agent Support
              </div>
              <div
                style={{
                  color: "rgba(255,255,255,0.55)",
                  fontSize: 12,
                  marginTop: 2,
                }}
              >
                {district}
                {sector ? ` · ${sector}` : ""}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.10)",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              padding: 7,
              display: "grid",
              placeItems: "center",
              color: "#fff",
            }}
          >
            <X size={17} />
          </button>
        </div>
        <div style={{ padding: 24 }}>
          {success ? (
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <div
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 999,
                  background: "#f0fdf4",
                  border: "1px solid #86efac",
                  display: "grid",
                  placeItems: "center",
                  margin: "0 auto 16px",
                }}
              >
                <CheckCircle2 size={28} color="#16a34a" />
              </div>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 17,
                  color: NAVY,
                  marginBottom: 8,
                }}
              >
                Request Sent!
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: INK,
                  lineHeight: 1.6,
                  marginBottom: 20,
                }}
              >
                Your support request has been sent. The agent will review it and
                get back to you.
              </div>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: "11px 28px",
                  borderRadius: 10,
                  background: NAVY,
                  color: "#fff",
                  border: "none",
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: "pointer",
                  fontFamily: FONT,
                }}
              >
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: "grid", gap: 14 }}>
              {agents.length > 1 && (
                <SelectField
                  label="Select Agent"
                  value={agentId}
                  onChange={(e) => setAgentId(e.target.value)}
                >
                  {agents.map((a) => (
                    <option key={a.id} value={String(a.id)}>
                      {a.full_name ||
                        `${a.first_name || ""} ${a.last_name || ""}`.trim()}
                    </option>
                  ))}
                </SelectField>
              )}
              <InputField
                label="Your Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
              />
              <InputField
                label="Phone or Email"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="+250 7XX XXX XXX or email@example.com"
              />
              <InputField
                label="How can we help you?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the support you need…"
                as="textarea"
                rows={4}
              />
              {err && (
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "flex-start",
                    background: "#fff7ed",
                    border: "1px solid #fed7aa",
                    borderRadius: 10,
                    padding: "10px 14px",
                  }}
                >
                  <AlertCircle
                    size={15}
                    color="#c2410c"
                    style={{ flexShrink: 0, marginTop: 1 }}
                  />
                  <span
                    style={{ fontSize: 13, color: "#9a3412", fontWeight: 500 }}
                  >
                    {err}
                  </span>
                </div>
              )}
              <button
                type="submit"
                disabled={submitting}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: 13,
                  borderRadius: 12,
                  border: "none",
                  background: submitting ? AM50 : AMBER,
                  color: submitting ? AM600 : NAVY,
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: submitting ? "not-allowed" : "pointer",
                  fontFamily: FONT,
                  boxShadow: submitting
                    ? "none"
                    : "0 4px 16px rgba(251,191,36,0.35)",
                }}
              >
                {submitting ? (
                  <>
                    <Loader2
                      size={16}
                      style={{ animation: "spin 1s linear infinite" }}
                    />{" "}
                    Sending…
                  </>
                ) : (
                  <>
                    <Send size={15} /> Send Request
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Agent Card ────────────────────────────────────────────────────
function AgentCard({ agent, sector, onRequestSupport }) {
  const name =
    agent.full_name ||
    `${agent.first_name || ""} ${agent.last_name || ""}`.trim();
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <article
      style={{
        border: `1.5px solid ${LINE}`,
        borderRadius: 16,
        background: "#fff",
        overflow: "hidden",
        boxShadow: "0 2px 12px rgba(0,4,53,0.06)",
      }}
    >
      <div style={{ padding: "16px 16px 14px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 14,
          }}
        >
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: 12,
              background: NAVY,
              color: AMBER,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: 16,
              flexShrink: 0,
            }}
          >
            {<UserRound size={20} />}
          </div>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontWeight: 700,
                fontSize: 15,
                color: NAVY,
                lineHeight: 1.2,
                marginBottom: 3,
              }}
            >
              {name}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                fontSize: 12,
                color: INK_LT,
              }}
            >
              <MapPin size={11} />
              <span
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {[agent.province, agent.district, agent.sector]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </div>
          </div>
          <div
            style={{
              marginLeft: "auto",
              flexShrink: 0,
              background: "#f0fdf4",
              border: "1px solid #86efac",
              borderRadius: 20,
              padding: "3px 10px",
              fontSize: 10,
              fontWeight: 700,
              color: "#16a34a",
              textTransform: "uppercase",
            }}
          >
            Active
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 7,
            marginBottom: 14,
          }}
        >
          {agent.phone && (
            <div className="flex border-slate-600 rounded-lg px-3 py-1 items-center gap-2 text-xs text-slate-600 justify-between w-full">
              <div className="">
                <button
                  className="bg-slate-700"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    padding: "10px 12px",
                    borderRadius: 10,
                    background: NAVY,
                    color: AMBER,
                    fontWeight: 700,
                    fontSize: 12,
                    textDecoration: "none",
                    fontFamily: FONT,
                  }}
                >
                  <Phone size={12} /> Call now
                </button>
              </div>
              <div className="flex items-center gap-1 text-xs text-slate-600">
                <div className="w-full">
                  <a href={`tel:${agent.phone}`} className="text-xl">
                    {agent.phone}
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}
        >
          <button
            type="button"
            onClick={() => onRequestSupport(agent)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              padding: "10px 12px",
              borderRadius: 10,
              border: `1.5px solid ${AMBER}`,
              background: AM50,
              color: AM600,
              fontWeight: 700,
              fontSize: 12,
              cursor: "pointer",
              fontFamily: FONT,
            }}
          >
            Request Support
          </button>
          <Link
            to={`/parents/agent-shop?agent_user_id=${encodeURIComponent(agent.id)}&agent_name=${encodeURIComponent(name)}&sector=${encodeURIComponent(agent.sector || sector)}`}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              padding: "10px 12px",
              borderRadius: 10,
              background: NAVY,
              color: AMBER,
              fontWeight: 700,
              fontSize: 12,
              textDecoration: "none",
              fontFamily: FONT,
            }}
          >
            Agent Shop
          </Link>
        </div>
      </div>
    </article>
  );
}

// ── Navbar ────────────────────────────────────────────────────────
function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const links = [
    { label: "Home page", href: "/" },
    { label: "Pay Fees", href: "/combined-tution-requrement" },
    { label: "Services", href: "/services" },
    { label: "Features", href: "/features" },
    { label: "Schools", href: "/schools" },
    { label: "Find Agent", href: "/find-agent" },
  ];

  return (
    <nav
      style={{
        position: "fixed",
        inset: "0 0 auto 0",
        zIndex: 100,
        background: scrolled ? NAVY : "rgba(0,4,53,0.95)",
        backdropFilter: scrolled ? "none" : "blur(16px)",
        borderBottom: "1px solid rgba(251,191,36,0.18)",
        boxShadow: scrolled ? "0 4px 32px rgba(0,0,0,0.5)" : "none",
        transition: "background 0.4s, box-shadow 0.4s",
        fontFamily: FONT,
      }}
    >
      <style>{`
        .fa-nav-links { display: none !important; }
        .fa-nav-cta   { display: none !important; }
        .fa-nav-mobile{ display: flex !important; }
        @media (min-width: 900px) {
          .fa-nav-links { display: flex !important; }
          .fa-nav-cta   { display: flex !important; }
          .fa-nav-mobile{ display: none !important; }
        }
      `}</style>

      <div
        style={{
          maxWidth: 1400,
          margin: "0 auto",
          padding: "0 24px",
          height: 62,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <Link
          to="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            flexShrink: 0,
            textDecoration: "none",
          }}
        >
          <img
            src={babyeyiLogo}
            alt="Babyeyi"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = "/1BABYEYI LOGO FINAL.png";
            }}
            style={{ height: 38, width: "auto", objectFit: "contain" }}
          />
        </Link>

        {/* Desktop nav links */}
        <div
          className="fa-nav-links"
          style={{ display: "flex", alignItems: "center" }}
        >
          {links.map((l) => (
            <Link
              key={l.label}
              to={l.href}
              style={{
                position: "relative",
                padding: "8px 14px",
                fontSize: 13.5,
                fontWeight: 600,
                color:
                  l.href === "/find-agent" ? AMBER : "rgba(255,255,255,0.62)",
                textDecoration: "none",
                transition: "color 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = AMBER;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color =
                  l.href === "/find-agent" ? AMBER : "rgba(255,255,255,0.62)";
              }}
            >
              {l.label}
            </Link>
          ))}
        </div>

        {/* Desktop CTA */}
        <div
          className="fa-nav-cta"
          style={{ display: "flex", alignItems: "center", gap: 10 }}
        >
          <Link
            to="/register"
            style={{
              padding: "8px 16px",
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              color: "rgba(255,255,255,0.65)",
              border: "1px solid rgba(255,255,255,0.18)",
              textDecoration: "none",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = AMBER;
              e.currentTarget.style.borderColor = "rgba(251,191,36,0.5)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "rgba(255,255,255,0.65)";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)";
            }}
          >
            Register School
          </Link>
          <a
            href="/login"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "9px 20px",
              borderRadius: 10,
              background: "linear-gradient(135deg,#FBBF24,#F59E0B)",
              color: NAVY,
              fontWeight: 800,
              fontSize: 13,
              textDecoration: "none",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow =
                "0 4px 18px rgba(251,191,36,0.45)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <LogIn size={14} strokeWidth={2.5} /> Login
          </a>
        </div>

        {/* Mobile Login + Hamburger */}
        <div
          className="fa-nav-mobile"
          style={{ display: "none", alignItems: "center", gap: 8 }}
        >
          <a
            href="/login"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              height: 36,
              padding: "0 14px",
              borderRadius: 9,
              background: "linear-gradient(135deg,#FBBF24,#F59E0B)",
              color: NAVY,
              fontWeight: 800,
              fontSize: 12,
              textDecoration: "none",
            }}
          >
            <LogIn size={13} strokeWidth={2.5} /> Login
          </a>
          <button
            type="button"
            onClick={() => setOpen(!open)}
            style={{
              width: 36,
              height: 36,
              borderRadius: 9,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "#fff",
            }}
          >
            {open ? <X size={17} /> : <Menu size={17} />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div
          style={{
            background: "#000120",
            borderTop: "1px solid rgba(251,191,36,0.12)",
            padding: "8px 16px 20px",
            display: "grid",
            gap: 2,
          }}
        >
          {links.map((l) => (
            <Link
              key={l.label}
              to={l.href}
              onClick={() => setOpen(false)}
              style={{
                display: "flex",
                padding: "12px 16px",
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 600,
                color:
                  l.href === "/find-agent" ? AMBER : "rgba(255,255,255,0.72)",
                textDecoration: "none",
              }}
            >
              {l.label}
            </Link>
          ))}
          <div style={{ paddingTop: 10, display: "grid", gap: 8 }}>
            <Link
              to="/register"
              onClick={() => setOpen(false)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "12px",
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 700,
                color: AMBER,
                border: "1px solid rgba(251,191,36,0.35)",
                textDecoration: "none",
              }}
            >
              Register School
            </Link>
            <a
              href="/login"
              onClick={() => setOpen(false)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: 13,
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 800,
                background: "linear-gradient(135deg,#FBBF24,#F59E0B)",
                color: NAVY,
                textDecoration: "none",
              }}
            >
              <LogIn size={16} strokeWidth={2.5} /> Login to Babyeyi
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}

// ── Main Page ─────────────────────────────────────────────────────
export default function FindAgent() {
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [agents, setAgents] = useState([]);
  const [province, setProvince] = useState("");
  const [district, setDistrict] = useState("");
  const [sector, setSector] = useState("");
  const [loadingGeo, setLoadingGeo] = useState(false);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [error, setError] = useState("");
  const [modalAgent, setModalAgent] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    let off = false;
    setLoadingGeo(true);
    getJson(`${API}/locations/provinces`)
      .then((j) => {
        if (!off) setProvinces(Array.isArray(j.data) ? j.data : []);
      })
      .catch((e) => !off && setError(e.message))
      .finally(() => !off && setLoadingGeo(false));
    return () => {
      off = true;
    };
  }, []);

  useEffect(() => {
    if (!province) {
      setDistricts([]);
      setDistrict("");
      setSectors([]);
      setSector("");
      setAgents([]);
      return;
    }
    let off = false;
    setLoadingGeo(true);
    setError("");
    getJson(
      `${API}/locations/districts?province=${encodeURIComponent(province)}`,
    )
      .then((j) => {
        if (!off) {
          setDistricts(Array.isArray(j.data) ? j.data : []);
          setDistrict("");
          setSectors([]);
          setSector("");
          setAgents([]);
        }
      })
      .catch((e) => !off && setError(e.message))
      .finally(() => !off && setLoadingGeo(false));
    return () => {
      off = true;
    };
  }, [province]);

  useEffect(() => {
    if (!province || !district) {
      setSectors([]);
      setSector("");
      setAgents([]);
      return;
    }
    let off = false;
    setLoadingGeo(true);
    setError("");
    getJson(
      `${API}/locations/sectors?province=${encodeURIComponent(province)}&district=${encodeURIComponent(district)}`,
    )
      .then((j) => {
        if (!off) {
          setSectors(Array.isArray(j.data) ? j.data : []);
          setSector("");
          setAgents([]);
        }
      })
      .catch((e) => !off && setError(e.message))
      .finally(() => !off && setLoadingGeo(false));
    return () => {
      off = true;
    };
  }, [province, district]);

  useEffect(() => {
    if (!province || !district) {
      setAgents([]);
      return;
    }
    let off = false;
    setLoadingAgents(true);
    setError("");
    const q = sector
      ? `province=${encodeURIComponent(province)}&district=${encodeURIComponent(district)}&sector=${encodeURIComponent(sector)}`
      : `province=${encodeURIComponent(province)}&district=${encodeURIComponent(district)}`;
    getJson(`${API}/public/agents/find?${q}`)
      .then((j) => !off && setAgents(Array.isArray(j.data) ? j.data : []))
      .catch((e) => !off && setError(e.message))
      .finally(() => !off && setLoadingAgents(false));
    return () => {
      off = true;
    };
  }, [province, district, sector]);

  const openModal = (agent) => {
    setModalAgent(agent);
    setShowModal(true);
  };
  const closeModal = () => {
    setShowModal(false);
    setModalAgent(null);
  };

  const filtersComplete = !!(province && district);
  const step = !province ? 1 : !district ? 2 : !sector ? 3 : 4;

  return (
    <div style={{ minHeight: "100vh", fontFamily: FONT }}>
      {/* <Navbar /> */}
      <div>
        <div
          className="mx-auto max-w-[1100px] px-5 pt-0"
        >
          {/* Heading */}
          <h1
            style={{
              margin: "0 0 14px",
              color: NAVY,
              fontWeight: 800,
              lineHeight: 1.08,
              fontSize: "clamp(2rem,5vw,3rem)",
            }}
          >
            Find Babyeyi Agent
          </h1>

          {/* ── Filter Card ── */}
          <div
            style={{
              background: "#fff",
              border: `1px solid ${LINE}`,
              borderRadius: 18,
              boxShadow: "0 4px 24px rgba(0,4,53,0.08)",
              padding: "24px 24px 20px",
              marginBottom: 0,
            }}
          >
            {/* Card title */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 22,
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 11,
                  background: AM50,
                  border: `1px solid rgba(251,191,36,0.28)`,
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                }}
              >
                <MapPin size={17} color={AM200} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: NAVY }}>
                  Quick location search
                </div>
                <div style={{ fontSize: 12, color: INK_LT, marginTop: 2 }}>
                  Find agents in your area
                </div>
              </div>
            </div>

            {/* 4-col filter grid */}
            <div className="fa-filter-grid">
              <SelectField
                label="Province"
                value={province}
                onChange={(e) => setProvince(e.target.value)}
              >
                <option value="">Select province</option>
                {provinces.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </SelectField>

              <SelectField
                label="District"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                disabled={!province}
              >
                <option value="">Select district</option>
                {districts.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </SelectField>

              <SelectField
                label="Sector"
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                disabled={!district}
              >
                <option value="">All sectors</option>
                {sectors.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </SelectField>

              {/* Location status / CTA */}
              <div style={{ display: "grid", gap: 6 }}>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.09em",
                    color: INK_LT,
                  }}
                >
                  Location (optional)
                </span>
                <div
                  style={{
                    height: 46,
                    borderRadius: 10,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 7,
                    background: filtersComplete
                      ? "linear-gradient(135deg,#FBBF24,#F59E0B)"
                      : "#f8fafc",
                    border: filtersComplete ? "none" : `1.5px solid ${LINE}`,
                    color: filtersComplete ? NAVY : INK_LT,
                    fontWeight: 700,
                    fontSize: 13,
                    boxShadow: filtersComplete
                      ? "0 4px 16px rgba(251,191,36,0.35)"
                      : "none",
                    transition: "all 0.3s",
                    cursor: filtersComplete ? "default" : "default",
                  }}
                >
                  {loadingGeo || loadingAgents ? (
                    <>
                      <Loader2
                        size={14}
                        style={{ animation: "spin 1s linear infinite" }}
                      />{" "}
                      Loading…
                    </>
                  ) : filtersComplete ? (
                    <>
                      <Search size={14} />{" "}
                      {agents.length > 0
                        ? `${agents.length} Agent${agents.length !== 1 ? "s" : ""} found`
                        : "Searching…"}
                    </>
                  ) : (
                    <>
                      <MapPin size={14} /> Choose location
                    </>
                  )}
                </div>
              </div>
            </div>

            {error && (
              <div
                style={{
                  display: "flex",
                  gap: 7,
                  alignItems: "flex-start",
                  marginTop: 14,
                  background: "#fff7ed",
                  border: "1px solid #fed7aa",
                  borderRadius: 10,
                  padding: "9px 12px",
                }}
              >
                <AlertCircle
                  size={13}
                  color="#c2410c"
                  style={{ flexShrink: 0, marginTop: 1 }}
                />
                <span
                  style={{ fontSize: 12, color: "#9a3412", fontWeight: 500 }}
                >
                  {error}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Results ── */}
      <main>
        <div className="mx-auto max-w-[1100px] px-5">
          {/* Results */}
          <section>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 16,
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              <div className="pt-6">
                <div style={{ fontWeight: 700, fontSize: 15, color: NAVY }}>
                  {loadingAgents
                    ? "Searching agents…"
                    : agents.length > 0
                      ? `${agents.length} Agent${agents.length !== 1 ? "s" : ""} found`
                      : ""}
                </div>
                {filtersComplete && (
                  <div
                    style={{
                      fontSize: 12,
                      color: INK_LT,
                      marginTop: 3,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <MapPin size={11} />{" "}
                    {[province, district, sector].filter(Boolean).join(" · ")}
                  </div>
                )}
              </div>
              {/* {agents.length > 0 && (
                <button
                  type="button"
                  onClick={() => openModal(null)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    padding: "10px 16px",
                    borderRadius: 10,
                    border: `1.5px solid ${AMBER}`,
                    background: AM50,
                    color: AM600,
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: "pointer",
                    fontFamily: FONT,
                    boxShadow: "0 2px 8px rgba(251,191,36,0.18)",
                    whiteSpace: "nowrap",
                  }}
                >
                  <MessageSquarePlus size={14} /> Request support from this area
                  agent
                </button>
              )} */}
            </div>

            {!filtersComplete && !loadingGeo && (
              <div
                className="mx-6 sm:mx-6"
                style={{
                  background: "#fff",
                  padding: "52px 24px",
                  borderRadius: 16,
                  textAlign: "center",
                  boxShadow: "0 2px 12px rgba(0,4,53,0.05)",
                }}
              >
                <div
                  style={{
                    width: 60,
                    height: 60,
                    display: "grid",
                    placeItems: "center",
                    margin: "0 auto 16px",
                  }}
                >
                  <Search size={26} color={AM200} />
                </div>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 15,
                    color: NAVY,
                    marginBottom: 8,
                  }}
                >
                  Start your search
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: INK_LT,
                    lineHeight: 1.65,
                    maxWidth: 300,
                    margin: "0 auto",
                  }}
                >
                  Use the location filter above to find Babyeyi agents near you.
                </div>
              </div>
            )}

            {filtersComplete &&
              !loadingAgents &&
              agents.length === 0 &&
              !error && (
                <div
                  style={{
                    background: "#fff",
                    borderRadius: 16,
                    padding: "52px 24px",
                    textAlign: "center",
                    boxShadow: "0 2px 12px rgba(0,4,53,0.05)",
                  }}
                >
                  <div
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: 18,
                      background: "#f0f2f5",
                      display: "grid",
                      placeItems: "center",
                      margin: "0 auto 16px",
                    }}
                  >
                    <UserRound size={26} color={INK_LT} />
                  </div>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 15,
                      color: NAVY,
                      marginBottom: 8,
                    }}
                  >
                    No agents found
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: INK_LT,
                      lineHeight: 1.65,
                      maxWidth: 300,
                      margin: "0 auto",
                    }}
                  >
                    No agent is allocated to this location yet. Try a broader
                    area.
                  </div>
                </div>
              )}

            {agents.length > 0 && (
              <div style={{ display: "grid", gap: 14 }}>
                {agents.map((a) => (
                  <AgentCard
                    key={a.id}
                    agent={a}
                    sector={sector}
                    onRequestSupport={() => openModal(a)}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      {showModal && (
        <SupportModal
          agents={agents}
          initialAgentId={
            modalAgent
              ? String(modalAgent.id)
              : agents[0]?.id
                ? String(agents[0].id)
                : ""
          }
          province={province}
          district={district}
          sector={sector}
          onClose={closeModal}
        />
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap');
        *{box-sizing:border-box;}

        /* Filter grid: 4 cols on desktop, 2 on tablet, 1 on mobile */
        .fa-filter-grid{
          display:grid;
          grid-template-columns:1fr 1fr 1fr 1fr;
          gap:14px;
          align-items:end;
        }
        @media(max-width:760px){ .fa-filter-grid{grid-template-columns:1fr 1fr;} }
        @media(max-width:440px){ .fa-filter-grid{grid-template-columns:1fr;} }

        /* Stats bar */
        .fa-stats{
          display:grid;
          grid-template-columns:repeat(4,1fr);
          gap:0;
          border-top:1px solid rgba(0,4,53,0.08);
        }
        .fa-stats>div{ border-right:1px solid rgba(0,4,53,0.07); }
        .fa-stats>div:last-child{ border-right:none; }
        @media(max-width:600px){
          .fa-stats{ grid-template-columns:repeat(2,1fr); }
          .fa-stats>div:nth-child(2){ border-right:none; }
          .fa-stats>div:nth-child(3){ border-top:1px solid rgba(0,4,53,0.07); }
          .fa-stats>div:nth-child(4){ border-top:1px solid rgba(0,4,53,0.07); border-right:none; }
        }

        /* Main layout */
        .fa-grid{ display:grid; grid-template-columns:1fr; gap:20px; }
        .fa-aside{ display:none; }
        @media(min-width:860px){
          .fa-grid{ grid-template-columns:1fr; }
          .fa-aside{ display:none; }
        }

        @keyframes spin{ to{transform:rotate(360deg)} }
        @keyframes modalSlide{ from{opacity:0;transform:translateY(16px) scale(0.97)} to{opacity:1;transform:none} }
      `}</style>
    </div>
  );
}

// ── Shared micro-styles ───────────────────────────────────────────
const pillLink = {
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  textDecoration: "none",
  borderRadius: 999,
  border: `1px solid rgba(251,191,36,0.45)`,
  background: AM50,
  color: AM600,
  fontSize: 12,
  fontWeight: 600,
  padding: "5px 10px",
  whiteSpace: "nowrap",
};
