import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowRight, CheckCircle2, Clock, MapPin, Package, Shield, Sparkles, Shirt, Truck,
  GraduationCap, Star, Heart,
} from "lucide-react";
import uniformVoucherImage from "../../assets/services/uniformvoucher.png";
import shuleShoeImage from "../../assets/services/shuleshoes.png";

const FONT = `"MTN Brighter Sans", "Nunito", "Varela Round", sans-serif`;
const NAVY = "#000435";
const AMBER = "#FBBF24";

export default function PublicUniformVoucherLanding() {
  const { t } = useTranslation();
  const highlights = [
    { Icon: Shirt, title: t("uniformVoucher.highlights1Title"), text: t("uniformVoucher.highlights1Text") },
    { Icon: Package, title: t("uniformVoucher.highlights2Title"), text: t("uniformVoucher.highlights2Text") },
    { Icon: Sparkles, title: t("uniformVoucher.highlights3Title"), text: t("uniformVoucher.highlights3Text") },
    { Icon: Truck, title: t("uniformVoucher.highlights4Title"), text: t("uniformVoucher.highlights4Text") },
    { Icon: Shield, title: t("uniformVoucher.highlights5Title"), text: t("uniformVoucher.highlights5Text") },
    { Icon: Clock, title: t("uniformVoucher.highlights6Title"), text: t("uniformVoucher.highlights6Text") },
  ];
  const benefits = [
    t("uniformVoucher.benefit1"),
    t("uniformVoucher.benefit2"),
    t("uniformVoucher.benefit3"),
    t("uniformVoucher.benefit4"),
  ];
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
            maxWidth: 1120,
            margin: "0 auto",
            padding: "14px 1rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <Link
            to="/services"
            style={{
              color: AMBER,
              fontWeight: 800,
              fontSize: 14,
              textDecoration: "none",
            }}
          >
            ← {t("uniformVoucher.services")}
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <Link
              to="/services/uniform-voucher/track"
              style={{
                color: AMBER,
                fontWeight: 800,
                fontSize: 13,
                textDecoration: "none",
                borderBottom: "1px solid rgba(251,191,36,0.45)",
              }}
            >
              {t("uniformVoucher.trackOrder")}
            </Link>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Shirt size={18} color={AMBER} />
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 900,
                  letterSpacing: "0.14em",
                  color: "rgba(255,255,255,0.55)",
                  textTransform: "uppercase",
                }}
              >
                {t("uniformVoucher.uniformVoucher")}
              </span>
            </div>
          </div>
        </div>
      </header>

      <section
        style={{
          background: `linear-gradient(165deg, ${NAVY} 0%, #020a4a 55%, #0a1454 100%)`,
          color: "#fff",
          padding: "2.5rem 1rem 2rem",
        }}
      >
        <div
          style={{
            maxWidth: 1120,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "2rem",
            alignItems: "center",
          }}
        >
          <div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 14px",
                borderRadius: 999,
                background: "rgba(251,191,36,0.12)",
                border: `1px solid rgba(251,191,36,0.35)`,
                marginBottom: "1.25rem",
              }}
            >
              <GraduationCap size={16} color={AMBER} />
              <span style={{ fontSize: 11, fontWeight: 800, color: AMBER, letterSpacing: "0.08em" }}>
                {t("uniformVoucher.trustedSchoolService")}
              </span>
            </div>
            <h1
              style={{
                fontSize: "clamp(2rem, 5vw, 2.85rem)",
                fontWeight: 900,
                lineHeight: 1.08,
                margin: "0 0 1rem",
                letterSpacing: "-0.02em",
              }}
            >
              {t("uniformVoucher.title")}{" "}
              <span style={{ color: AMBER }}>{t("uniformVoucher.titleAccent")}</span>
            </h1>
            <p
              style={{
                fontSize: "clamp(1rem, 2.4vw, 1.125rem)",
                color: "rgba(255,255,255,0.62)",
                lineHeight: 1.65,
                maxWidth: 480,
                margin: "0 0 1.75rem",
              }}
            >
              {t("uniformVoucher.heroSub")}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              <Link
                to="/services/uniform-voucher/request"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  background: AMBER,
                  color: NAVY,
                  fontWeight: 900,
                  fontSize: 15,
                  padding: "14px 22px",
                  borderRadius: 14,
                  textDecoration: "none",
                  minHeight: 52,
                  boxShadow: "0 12px 40px rgba(251,191,36,0.25)",
                }}
              >
                {t("uniformVoucher.continueToRequest")} <ArrowRight size={18} />
              </Link>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 13,
                  color: "rgba(255,255,255,0.5)",
                  paddingTop: 4,
                }}
              >
                <MapPin size={16} color={AMBER} />
                {t("uniformVoucher.rwandaWideSchoolLinked")}
              </div>
            </div>
            <p style={{ marginTop: "1.25rem", fontSize: 12, color: "rgba(255,255,255,0.45)" }}>
              {t("uniformVoucher.priceNote")}
            </p>
          </div>
          <div style={{ position: "relative" }}>
            <div
              style={{
                borderRadius: 24,
                overflow: "hidden",
                border: `2px solid rgba(251,191,36,0.5)`,
                boxShadow: "0 24px 60px rgba(0,0,0,0.35)",
              }}
            >
              <img
                src={uniformVoucherImage}
                alt={t("uniformVoucher.schoolUniformsAlt")}
                style={{ width: "100%", height: 300, objectFit: "cover", display: "block" }}
              />
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "linear-gradient(180deg, transparent 40%, rgba(0,4,53,0.75) 100%)",
                  pointerEvents: "none",
                }}
              />
            </div>
            <div
              style={{
                position: "absolute",
                bottom: 16,
                left: 16,
                right: 16,
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  flex: "1 1 120px",
                  background: "rgba(255,255,255,0.1)",
                  backdropFilter: "blur(8px)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: 12,
                  padding: "10px 12px",
                }}
              >
                <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: AMBER }}>{t("uniformVoucher.schoolKit")}</p>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "rgba(255,255,255,0.85)" }}>{t("uniformVoucher.fullLooks")}</p>
              </div>
              <div
                style={{
                  flex: "1 1 120px",
                  background: "rgba(255,255,255,0.1)",
                  backdropFilter: "blur(8px)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: 12,
                  padding: "10px 12px",
                }}
              >
                <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: AMBER }}>{t("uniformVoucher.sports")}</p>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "rgba(255,255,255,0.85)" }}>{t("uniformVoucher.peReady")}</p>
              </div>
            </div>
            <img
              src={shuleShoeImage}
              alt=""
              style={{
                position: "absolute",
                top: -12,
                right: -8,
                width: 88,
                height: 88,
                objectFit: "cover",
                borderRadius: 16,
                border: `2px solid ${AMBER}`,
                boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
                display: "none",
              }}
              className="uv-float-shoe"
            />
          </div>
        </div>
        <style>{`
          @media (min-width: 900px) {
            .uv-float-shoe { display: block !important; }
          }
        `}</style>
      </section>

      <section style={{ maxWidth: 1120, margin: "0 auto", padding: "2.75rem 1rem" }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.35rem", fontWeight: 900, color: NAVY, margin: "0 0 0.5rem" }}>
            {t("uniformVoucher.whatYouCanOrder")}
          </h2>
          <p style={{ margin: 0, color: "#64748b", fontSize: 15, maxWidth: 520, marginInline: "auto" }}>
            {t("uniformVoucher.whatYouCanOrderSub")}
          </p>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: 14,
          }}
        >
          {highlights.map(({ Icon, title, text }) => (
            <article
              key={title}
              style={{
                background: "#fff",
                borderRadius: 16,
                padding: "1.15rem 1.2rem",
                border: "1px solid #e2e8f0",
                boxShadow: "0 4px 20px rgba(15,23,42,0.04)",
              }}
            >
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
                  color: AMBER,
                  marginBottom: 12,
                }}
              >
                <Icon size={20} />
              </div>
              <h3 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 800, color: NAVY }}>{title}</h3>
              <p style={{ margin: 0, fontSize: 13, color: "#64748b", lineHeight: 1.55 }}>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section style={{ background: "#fff", borderBlock: "1px solid #e2e8f0" }}>
        <div
          style={{
            maxWidth: 1120,
            margin: "0 auto",
            padding: "2.5rem 1rem",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "2rem",
            alignItems: "start",
          }}
        >
          <div>
            <h2 style={{ fontSize: "1.35rem", fontWeight: 900, color: NAVY, margin: "0 0 1rem" }}>
            {t("uniformVoucher.whyFamiliesUse")}
            </h2>
            <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
              {benefits.map((t) => (
                <li
                  key={t}
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "flex-start",
                    marginBottom: 12,
                    fontSize: 14,
                    color: "#475569",
                    lineHeight: 1.55,
                  }}
                >
                  <CheckCircle2 size={18} color="#D97706" style={{ flexShrink: 0, marginTop: 2 }} />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div
            style={{
              background: `linear-gradient(135deg, ${NAVY}, #0c1a5e)`,
              borderRadius: 20,
              padding: "1.5rem 1.35rem",
              color: "#fff",
              border: `2px solid ${AMBER}`,
            }}
          >
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <Star size={18} fill={AMBER} color={AMBER} />
              <Heart size={18} color={AMBER} />
            </div>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 700, lineHeight: 1.6, color: "rgba(255,255,255,0.92)" }}>
              "{t("uniformVoucher.quote")}"
            </p>
            <p style={{ margin: "1rem 0 0", fontSize: 12, color: "rgba(255,255,255,0.45)" }}>
              {t("uniformVoucher.programme")} · {new Date().getFullYear()}
            </p>
          </div>
        </div>
      </section>

      <section style={{ maxWidth: 1120, margin: "0 auto", padding: "2.75rem 1rem 3.5rem", textAlign: "center" }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 900, color: NAVY, margin: "0 0 0.75rem" }}>{t("uniformVoucher.readyToStart")}</h2>
        <p style={{ color: "#64748b", margin: "0 0 1.5rem", fontSize: 15 }}>
          {t("uniformVoucher.readyToStartSub")}
        </p>
        <Link
          to="/services/uniform-voucher/request"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            background: NAVY,
            color: AMBER,
            fontWeight: 900,
            fontSize: 15,
            padding: "14px 26px",
            borderRadius: 14,
            textDecoration: "none",
            minHeight: 52,
          }}
        >
          {t("uniformVoucher.continueToRequest")} <ArrowRight size={18} />
        </Link>
      </section>
    </div>
  );
}
