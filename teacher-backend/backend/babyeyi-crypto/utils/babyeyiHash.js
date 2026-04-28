// ================================================================
// utils/babyeyiHash.js
// Cryptographic integrity for Babyeyi documents
//
// QR payload format:  BY-2025-00001|8d91f7c3a91e4f2b
// Hash input:         HMAC-SHA256 over canonical document fields
//
// .env requirement:
//   BABYEYI_HASH_SECRET=43b7920096c8119a89a3d04500579ded67c6b012b4290f6a92553782d8a889b1
// ================================================================

const crypto = require("crypto");

// ── SINGLE SOURCE OF TRUTH FOR SECRET ────────────────────────
// Must match babyeyi.js exactly. Both files read from process.env.
const SECRET = process.env.BABYEYI_HASH_SECRET || "babyeyi-default-secret-change-me-in-production";

if (!process.env.BABYEYI_HASH_SECRET) {
  console.warn("[babyeyiHash] ⚠️  BABYEYI_HASH_SECRET not set — using insecure default");
} else {
  console.log("[babyeyiHash] ✅ BABYEYI_HASH_SECRET loaded. Prefix:", SECRET.slice(0, 8) + "...");
}

// ── Normalize scalar to consistent string ─────────────────────
const safeStr = (v) => {
  if (v == null)         return "";
  if (v === "null")      return "";
  if (v === "undefined") return "";
  return String(v).trim();
};

// ── Normalize amount to integer string ───────────────────────
// "5000.00", 5000, "5000", 5000.00  →  "5000"
const safeAmt = (v) => String(Math.round(Number(v) || 0));

/**
 * Build a deterministic canonical string from document fields.
 * Rules:
 *  - safeStr: null / "null" / undefined / "" → ""
 *  - safeAmt: always Math.round(Number) — handles string/number amounts
 *  - payments: sorted by name, include ALL with non-empty name (amount=0 valid)
 *  - fields joined with | separator
 */
function canonical(fields) {
  const {
    docId,
    schoolId,
    className,
    term,
    academicYear,
    payments     = [],
    bankAccountNo = "",
  } = fields;

  const paymentStr = [...payments]
    .filter(p => safeStr(p.name) !== "")
    .sort((a, b) => safeStr(a.name).localeCompare(safeStr(b.name)))
    .map(p => `${safeStr(p.name)}:${safeAmt(p.amount)}`)
    .join(",");

  return [
    safeStr(docId),
    safeStr(schoolId),
    safeStr(className),
    safeStr(term),
    safeStr(academicYear),
    paymentStr,
    safeStr(bankAccountNo),
  ].join("|");
}

/**
 * Generate HMAC-SHA256 hash (first 16 hex chars = 64-bit).
 * Returns lowercase hex string.
 */
function generateHash(fields) {
  return crypto
    .createHmac("sha256", SECRET)
    .update(canonical(fields))
    .digest("hex")
    .slice(0, 16);
}

/**
 * Constant-time verification.
 * Returns true only when the provided hash matches the recomputed hash.
 */
function verifyHash(fields, providedHash) {
  if (!providedHash || typeof providedHash !== "string") return false;
  const expected = generateHash(fields);
  try {
    const a = Buffer.from(expected.padEnd(64, "0").slice(0, 64));
    const b = Buffer.from(providedHash.padEnd(64, "0").slice(0, 64));
    return (
      crypto.timingSafeEqual(a, b) &&
      providedHash.length === expected.length
    );
  } catch {
    return false;
  }
}

/**
 * Build the full QR payload string: BY-2025-00001|8d91f7c3a91e4f2b
 */
function buildQRPayload(docId, hash) {
  return `${docId}|${hash}`;
}

/**
 * Parse a QR payload into { docId, hash }.
 * Handles:
 *   - Raw:         "BY-2025-00001|8d91f7c3a91e4f2b"
 *   - URL-encoded: "BY-2025-00001%7C8d91f7c3a91e4f2b"
 *   - Mixed case docId (normalised to uppercase)
 * Returns null if format does not match.
 */
function parseQRPayload(payload) {
  if (!payload || typeof payload !== "string") return null;

  let decoded;
  try {
    decoded = decodeURIComponent(payload);
  } catch {
    decoded = payload;
  }

  const pipeIdx = decoded.indexOf("|");
  if (pipeIdx === -1) return null;

  const docId = decoded.slice(0, pipeIdx).toUpperCase().trim();
  const hash  = decoded.slice(pipeIdx + 1).toLowerCase().trim();

  if (!/^BY-\d{4}-\d{5}$/.test(docId)) return null;
  if (!/^[0-9a-f]{16}$/.test(hash))    return null;

  return { docId, hash };
}

/**
 * Extract just the docId from either a plain ID or a full QR payload.
 */
function extractDocId(raw) {
  if (!raw) return null;
  let s;
  try { s = decodeURIComponent(String(raw)); } catch { s = String(raw); }
  const pipe = s.indexOf("|");
  return (pipe === -1 ? s : s.slice(0, pipe)).toUpperCase().trim() || null;
}

module.exports = {
  canonical,
  generateHash,
  verifyHash,
  buildQRPayload,
  parseQRPayload,
  extractDocId,
  SECRET,  // exported so babyeyi.js can optionally import instead of re-declaring
};