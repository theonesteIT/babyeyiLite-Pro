import { Globe, ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";

const LANGS = ["rw", "en", "fr"];

export default function PublicLanguageFab() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const path = String(location?.pathname || "").toLowerCase();
  if (path === "/services") return null;
  const current = String(i18n.language || "en").slice(0, 2).toLowerCase();
  const value = LANGS.includes(current) ? current : "en";

  return (
    <label
      style={{
        position: "fixed",
        right: 16,
        bottom: 16,
        zIndex: 1200,
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "10px 12px",
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.14)",
        background: "rgba(0,4,53,0.95)",
        color: "#fff",
        boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
        fontSize: 12,
        fontWeight: 800,
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        backdropFilter: "blur(10px)",
      }}
    >
      <Globe size={14} color="#FBBF24" />
      <span>{t("language.label")}</span>
      <ChevronDown size={13} />
      <select
        aria-label={t("language.switcherLabel")}
        value={value}
        onChange={(e) => i18n.changeLanguage(e.target.value)}
        style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }}
      >
        <option value="rw">🇷🇼 {t("language.rw")}</option>
        <option value="en">🇬🇧 {t("language.en")}</option>
        <option value="fr">🇫🇷 {t("language.fr")}</option>
      </select>
    </label>
  );
}
