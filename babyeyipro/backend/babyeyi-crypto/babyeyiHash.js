// ================================================================
// utils/babyeyiHash.js
// Cryptographic integrity for Babyeyi documents
//
// QR payload format:  BY-2025-00001|8d91f7c3a91e4f2b
// Hash input:         HMAC-SHA256 over canonical document fields
//
// FIXES vs previous version:
//  ✅ parseQRPayload handles both raw | and URL-encoded %7C
//  ✅ parseQRPayload normalises docId to uppercase before regex check
//  ✅ parseQRPayload accepts lowercase hex hash (not uppercase)
//  ✅ canonical() trims whitespace from all fields to avoid drift
//  ✅ All functions exported + named consistently
// ================================================================

const crypto = require("crypto");

const SECRET = process.env.BABYEYI_HASH_SECRET || "babyeyi-default-secret-change-me";

if (!process.env.BABYEYI_HASH_SECRET) {
  console.warn("[babyeyiHash] ⚠️  BABYEYI_HASH_SECRET not set — using insecure default");
}

/**
 * Build a canonical string from document fields.
 * Rules:
 *  - Sort payments by name so insertion order doesn't matter
 *  - Trim + String() every value to avoid null/undefined/whitespace drift
 *  - Join with | — safe because | is not used in field values
 */
function canonical(fields) {
  const {
    docId,
    schoolId,
    className,        // "class" is a JS reserved word
    term,
    academicYear,
    payments     = [],
    bankAccountNo = "",
  } = fields;

  const paymentStr = [...payments]
    .sort((a, b) => String(a.name).trim().localeCompare(String(b.name).trim()))
    .map(p => `${String(p.name).trim()}:${Number(p.amount)}`)
    .join(",");

  return [
    String(docId        ?? "").trim(),
    String(schoolId     ?? "").trim(),
    String(className    ?? "").trim(),
    String(term         ?? "").trim(),
    String(academicYear ?? "").trim(),
    paymentStr,
    String(bankAccountNo ?? "").trim(),
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
    .slice(0, 16);          // always lowercase from Node crypto
}

/**
 * Constant-time verification. Returns true only when the
 * provided hash matches the recomputed hash for these fields.
 */
function verifyHash(fields, providedHash) {
  if (!providedHash || typeof providedHash !== "string") return false;
  const expected = generateHash(fields);
  try {
    // timingSafeEqual needs equal-length buffers
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
 * Build the full QR payload string:  BY-2025-00001|8d91f7c3a91e4f2b
 */
function buildQRPayload(docId, hash) {
  return `${docId}|${hash}`;
}

/**
 * Parse a QR payload into { docId, hash }.
 *
 * Handles all forms that arrive at the verify endpoint:
 *   - Raw:          "BY-2025-00001|8d91f7c3a91e4f2b"
 *   - URL-encoded:  "BY-2025-00001%7C8d91f7c3a91e4f2b"  (| → %7C)
 *   - Mixed case docId (normalised to uppercase)
 *
 * Returns null if the payload does not match the expected format.
 */
function parseQRPayload(payload) {
  if (!payload || typeof payload !== "string") return null;

  // Decode any URL-encoding first (handles %7C → |, %7c → |)
  let decoded;
  try {
    decoded = decodeURIComponent(payload);
  } catch {
    decoded = payload;         // already plain text
  }

  const pipeIdx = decoded.indexOf("|");
  if (pipeIdx === -1) return null;           // no separator — plain docId only

  const docId = decoded.slice(0, pipeIdx).toUpperCase().trim();
  const hash  = decoded.slice(pipeIdx + 1).toLowerCase().trim();

  // Validate docId: BY-YYYY-NNNNN
  if (!/^BY-\d{4}-\d{5}$/.test(docId)) return null;

  // Validate hash: exactly 16 lowercase hex chars
  if (!/^[0-9a-f]{16}$/.test(hash)) return null;

  return { docId, hash };
}

/**
 * Parse just the docId from either a plain ID or a full QR payload.
 * Useful for the verify endpoint when you only need the DB lookup key.
 *
 * Examples:
 *   "BY-2025-00001"                        → "BY-2025-00001"
 *   "BY-2025-00001|8d91f7c3a91e4f2b"       → "BY-2025-00001"
 *   "BY-2025-00001%7C8d91f7c3a91e4f2b"     → "BY-2025-00001"
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
};