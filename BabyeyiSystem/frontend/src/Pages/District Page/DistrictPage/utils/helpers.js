import { UPLOADS } from "./api";

export const fmt = (n) => Number(n || 0).toLocaleString();
export const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";
export const resolveUrl = (p) => p ? (p.startsWith("http") ? p : `${UPLOADS}${p.startsWith("/") ? "" : "/"}${p}`) : null;

// ── Profile photo URL ─────────────────────
export const profilePhotoUrl = (photo) => {
  if (!photo || typeof photo !== "string") return null;
  const p = photo.replace(/\\/g, "/").trim();
  if (p.startsWith("http")) return p;
  const base = (UPLOADS || "").replace(/\/$/, "");
  return base + (p.startsWith("/") ? p : "/" + p);
};
