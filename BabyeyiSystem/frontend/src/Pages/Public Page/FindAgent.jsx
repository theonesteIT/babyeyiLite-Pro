import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { GraduationCap, MapPin, Phone, Mail, UserRound, Search, ChevronRight, ShoppingBag } from "lucide-react";

const NAVY = "#000435";
const AMBER = "#FBBF24";
const API = `${import.meta.env.VITE_API_URL || "http://localhost:5100"}/api`;
const MTN = "'MTN Brighter Sans','Trebuchet MS','Segoe UI',sans-serif";

async function getJson(url) {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok || json.success === false) {
    throw new Error(json.message || "Request failed");
  }
  return json;
}

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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [form, setForm] = useState({ agent_user_id: "", requester_name: "", requester_contact: "", requester_description: "" });

  useEffect(() => {
    let off = false;
    setLoadingGeo(true);
    getJson(`${API}/locations/provinces`)
      .then((j) => {
        if (off) return;
        setProvinces(Array.isArray(j.data) ? j.data : []);
      })
      .catch((e) => !off && setError(e.message || "Failed to load provinces"))
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
    getJson(`${API}/locations/districts?province=${encodeURIComponent(province)}`)
      .then((j) => {
        if (off) return;
        setDistricts(Array.isArray(j.data) ? j.data : []);
        setDistrict("");
        setSectors([]);
        setSector("");
        setAgents([]);
      })
      .catch((e) => !off && setError(e.message || "Failed to load districts"))
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
    getJson(`${API}/locations/sectors?province=${encodeURIComponent(province)}&district=${encodeURIComponent(district)}`)
      .then((j) => {
        if (off) return;
        setSectors(Array.isArray(j.data) ? j.data : []);
        setSector("");
        setAgents([]);
      })
      .catch((e) => !off && setError(e.message || "Failed to load sectors"))
      .finally(() => !off && setLoadingGeo(false));
    return () => {
      off = true;
    };
  }, [province, district]);

  useEffect(() => {
    if (!province || !district || !sector) {
      setAgents([]);
      return;
    }
    let off = false;
    setLoadingAgents(true);
    setError("");
    getJson(`${API}/public/agents/find?province=${encodeURIComponent(province)}&district=${encodeURIComponent(district)}&sector=${encodeURIComponent(sector)}`)
      .then((j) => !off && setAgents(Array.isArray(j.data) ? j.data : []))
      .catch((e) => !off && setError(e.message || "Failed to load agents"))
      .finally(() => !off && setLoadingAgents(false));
    return () => {
      off = true;
    };
  }, [province, district, sector]);

  useEffect(() => {
    if (!agents.length) {
      setForm((p) => ({ ...p, agent_user_id: "" }));
      return;
    }
    setForm((p) => ({ ...p, agent_user_id: p.agent_user_id || String(agents[0].id) }));
  }, [agents]);

  const submitSupport = async (e) => {
    e.preventDefault();
    setError("");
    setOk("");
    if (!form.agent_user_id || !form.requester_name.trim() || !form.requester_contact.trim() || !form.requester_description.trim()) {
      setError("Please complete all support request fields.");
      return;
    }
    try {
      setSubmitting(true);
      const res = await fetch(`${API}/public/agents/support-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          province,
          district,
          sector,
        }),
      });
      const json = await res.json();
      if (!res.ok || json.success === false) throw new Error(json.message || "Failed to submit request.");
      setOk("Request sent successfully. The allocated agent will review it from their dashboard.");
      setForm((p) => ({ ...p, requester_name: "", requester_contact: "", requester_description: "" }));
    } catch (err) {
      setError(err.message || "Failed to submit request.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC", fontFamily: MTN }}>
      <nav style={{ background: NAVY, borderBottom: `3px solid ${AMBER}` }}>
        <div style={{ maxWidth: 1160, margin: "0 auto", padding: "0.85rem 1rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <Link to="/" style={{ display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none", color: "#fff" }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: AMBER, display: "grid", placeItems: "center" }}>
              <GraduationCap size={18} color={NAVY} />
            </div>
            <strong style={{ letterSpacing: "-0.02em" }}>baby<span style={{ color: AMBER }}>eyi</span></strong>
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Link to="/services" style={{ color: "rgba(255,255,255,.86)", textDecoration: "none", fontWeight: 700, fontSize: 14 }}>Services</Link>
            <Link to="/pay-by-school" style={{ color: "rgba(255,255,255,.86)", textDecoration: "none", fontWeight: 700, fontSize: 14 }}>Pay</Link>
          </div>
        </div>
      </nav>

      <section style={{ background: NAVY }}>
        <div style={{ maxWidth: 1160, margin: "0 auto", padding: "2.7rem 1rem 2.2rem" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(251,191,36,.14)", border: "1px solid rgba(251,191,36,.35)", borderRadius: 999, padding: "6px 12px", color: AMBER, fontWeight: 800, fontSize: 12 }}>
            <Search size={13} /> Find Nearby Agent
          </div>
          <h1 style={{ margin: "1rem 0 .6rem", color: "#fff", fontSize: "clamp(1.8rem,4vw,2.9rem)", lineHeight: 1.08 }}>
            Find your allocated Babyeyi Agent
          </h1>
          <p style={{ margin: 0, color: "rgba(255,255,255,.72)", maxWidth: 760, lineHeight: 1.65, fontSize: 15 }}>
            Select province, district, and sector. We instantly show the official agent allocated by Super Admin for that location.
          </p>
        </div>
      </section>

      <main style={{ maxWidth: 1160, margin: "0 auto", padding: "1.25rem 1rem 3rem" }}>
        <div className="fa-grid">
          <section style={{ background: "#fff", border: "1.5px solid #E2E8F0", borderRadius: 18, padding: "1rem" }}>
            <h2 style={{ margin: "0 0 .9rem", color: NAVY, fontSize: 17 }}>Location filters</h2>
            <div style={{ display: "grid", gap: 12 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 11, color: "#64748B", fontWeight: 800, textTransform: "uppercase", letterSpacing: ".08em" }}>Province</span>
                <select value={province} onChange={(e) => setProvince(e.target.value)} style={sel}>
                  <option value="">Select province</option>
                  {provinces.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 11, color: "#64748B", fontWeight: 800, textTransform: "uppercase", letterSpacing: ".08em" }}>District</span>
                <select value={district} onChange={(e) => setDistrict(e.target.value)} disabled={!province} style={sel}>
                  <option value="">Select district</option>
                  {districts.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 11, color: "#64748B", fontWeight: 800, textTransform: "uppercase", letterSpacing: ".08em" }}>Sector</span>
                <select value={sector} onChange={(e) => setSector(e.target.value)} disabled={!district} style={sel}>
                  <option value="">Select sector</option>
                  {sectors.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
            </div>
            {(loadingGeo || loadingAgents) && <p style={{ margin: "12px 0 0", color: "#475569", fontSize: 13 }}>Loading...</p>}
            {error && <p style={{ margin: "12px 0 0", color: "#B91C1C", fontSize: 13 }}>{error}</p>}
          </section>

          <section style={{ background: "#fff", border: `2px solid ${AMBER}66`, borderRadius: 18, padding: "1rem", minHeight: 320 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <MapPin size={16} color={AMBER} />
              <h2 style={{ margin: 0, color: NAVY, fontSize: 17 }}>Allocated agents</h2>
            </div>
            {!sector && <p style={{ margin: 0, color: "#64748B" }}>Select full location to view assigned agent details.</p>}
            {sector && !loadingAgents && agents.length === 0 && (
              <p style={{ margin: 0, color: "#64748B" }}>No agent is currently allocated to this sector.</p>
            )}

            <div style={{ display: "grid", gap: 10 }}>
              {agents.map((a) => (
                <article key={a.id} style={{ border: "1.5px solid #E2E8F0", borderRadius: 14, padding: "12px 12px 11px", background: "#fff" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 9, background: NAVY, color: AMBER, display: "grid", placeItems: "center" }}>
                        <UserRound size={17} />
                      </div>
                      <div>
                        <p style={{ margin: 0, color: NAVY, fontWeight: 900, fontSize: 14 }}>{a.full_name || `${a.first_name || ""} ${a.last_name || ""}`.trim()}</p>
                        <p style={{ margin: "2px 0 0", color: "#64748B", fontSize: 12 }}>{a.province} · {a.district} · {a.sector}</p>
                      </div>
                    </div>
                    <ChevronRight size={16} color="#94A3B8" />
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                    {a.phone && (
                      <a href={`tel:${a.phone}`} style={pillLink}>
                        <Phone size={13} /> {a.phone}
                      </a>
                    )}
                    {a.email && (
                      <a href={`mailto:${a.email}`} style={pillLink}>
                        <Mail size={13} /> {a.email}
                      </a>
                    )}
                    <Link
                      to={`/agent-shop?agent_user_id=${encodeURIComponent(a.id)}&agent_name=${encodeURIComponent(a.full_name || `${a.first_name || ""} ${a.last_name || ""}`.trim())}&sector=${encodeURIComponent(a.sector || sector)}`}
                      style={{ ...pillLink, background: NAVY, color: AMBER, border: `1px solid ${NAVY}` }}
                    >
                      <ShoppingBag size={13} /> Continue to Agent Shop
                    </Link>
                  </div>
                </article>
              ))}
            </div>

            {!!agents.length && (
              <form onSubmit={submitSupport} style={{ marginTop: 14, borderTop: "1px solid #E2E8F0", paddingTop: 14, display: "grid", gap: 10 }}>
                <h3 style={{ margin: 0, color: NAVY, fontSize: 15 }}>Request support from this area agent</h3>
                <select value={form.agent_user_id} onChange={(e) => setForm((p) => ({ ...p, agent_user_id: e.target.value }))} style={sel}>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.full_name}
                    </option>
                  ))}
                </select>
                <input
                  value={form.requester_name}
                  onChange={(e) => setForm((p) => ({ ...p, requester_name: e.target.value }))}
                  placeholder="Your full name"
                  style={input}
                />
                <input
                  value={form.requester_contact}
                  onChange={(e) => setForm((p) => ({ ...p, requester_contact: e.target.value }))}
                  placeholder="Your phone or email"
                  style={input}
                />
                <textarea
                  rows={4}
                  value={form.requester_description}
                  onChange={(e) => setForm((p) => ({ ...p, requester_description: e.target.value }))}
                  placeholder="Describe the support you need"
                  style={{ ...input, resize: "vertical" }}
                />
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    minHeight: 46,
                    border: "none",
                    borderRadius: 12,
                    background: AMBER,
                    color: NAVY,
                    fontWeight: 900,
                    cursor: submitting ? "not-allowed" : "pointer",
                    opacity: submitting ? 0.6 : 1,
                  }}
                >
                  {submitting ? "Sending request..." : "Request support"}
                </button>
                {ok && <p style={{ margin: 0, color: "#166534", fontWeight: 700, fontSize: 13 }}>{ok}</p>}
              </form>
            )}
          </section>
        </div>
      </main>

      <style>{`
        .fa-grid{display:grid;grid-template-columns:1fr;gap:14px}
        @media(min-width:900px){.fa-grid{grid-template-columns:340px 1fr}}
      `}</style>
    </div>
  );
}

const sel = {
  width: "100%",
  border: "2px solid #E2E8F0",
  borderRadius: 12,
  padding: "11px 12px",
  fontFamily: MTN,
  fontWeight: 700,
  fontSize: 14,
  color: NAVY,
  outline: "none",
  background: "#fff",
};

const pillLink = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  textDecoration: "none",
  borderRadius: 999,
  border: "1px solid rgba(251,191,36,.6)",
  background: "rgba(251,191,36,.12)",
  color: NAVY,
  fontSize: 12,
  fontWeight: 800,
  padding: "6px 10px",
};

const input = {
  width: "100%",
  border: "2px solid #E2E8F0",
  borderRadius: 12,
  padding: "11px 12px",
  fontFamily: MTN,
  fontWeight: 600,
  fontSize: 14,
  color: NAVY,
  outline: "none",
  background: "#fff",
  boxSizing: "border-box",
};
