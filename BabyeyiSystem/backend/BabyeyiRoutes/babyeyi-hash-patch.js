// ================================================================
// routes/BabyeyiRoutes/babyeyi-hash-patch.js
//
// DROP-IN additions for your existing babyeyi.js route file.
//
// Add these three things to babyeyi.js:
//
//   1. const { generateHash, verifyHash, buildQRPayload, parseQRPayload }
//           = require("../../utils/babyeyiHash");
//
//   2. Inside your POST /  handler, after inserting the row and
//      getting back the new `id` + `doc_id`, call:
//          const hash = generateHash({ ... });
//          await db.query(
//            "UPDATE babyeyi SET integrity_hash=? WHERE id=?",
//            [hash, newId]
//          );
//      Then use buildQRPayload(docId, hash) as the QR code content.
//
//   3. Mount the GET /verify/:docId handler below.
//
// ================================================================

const express = require("express");
const router  = express.Router();
const { generateHash, verifyHash, buildQRPayload, parseQRPayload } = require("../babyeyi-crypto/utils/babyeyiHash");

// ── Helper: load the minimal fields needed for hash verification ──
// Adjust column names to match your actual schema.
async function loadHashFields(db, id) {
  const [rows] = await db.query(
    `SELECT
       b.id,
       b.doc_id,
       b.school_id,
       b.class,
       b.term,
       b.academic_year,
       b.bank_account_no,
       b.integrity_hash,
       b.status,
       b.school_name,
       b.district,
       b.sector,
       b.total_fee,
       b.created_at,
       b.pdf_path,
       b.qr_code_path
     FROM babyeyi b
     WHERE b.doc_id = ? AND b.deleted_at IS NULL
     LIMIT 1`,
    [id]
  );
  if (!rows.length) return null;
  const row = rows[0];

  // Load payments for canonical hash
  const [payments] = await db.query(
    "SELECT name, amount FROM babyeyi_payments WHERE babyeyi_id = ?",
    [row.id]
  );

  return { row, payments };
}

// ================================================================
// GET /api/babyeyi/verify/:docId
//
// Public endpoint — no auth required.
// Accepts either:
//   • BY-2025-00001               (plain docId — checks stored hash)
//   • BY-2025-00001|8d91f7c3a91e  (QR payload  — checks provided hash)
// ================================================================
router.get("/verify/:docId", async (req, res) => {
  const db = req.app.get("db") || require("../../config/database").pool;

  try {
    const raw = decodeURIComponent(req.params.docId).toUpperCase().trim();

    // Detect QR payload vs plain doc ID
    const parsed = parseQRPayload(raw);
    const docId       = parsed ? parsed.docId : raw;
    const qrHash      = parsed ? parsed.hash  : null;

    if (!/^BY-\d{4}-\d{5}$/.test(docId)) {
      return res.status(400).json({ success: false, message: "Invalid document ID format (expected BY-YYYY-NNNNN)" });
    }

    const result = await loadHashFields(db, docId);
    if (!result) {
      return res.status(404).json({ success: false, message: "Document not found" });
    }

    const { row, payments } = result;

    // ── Recompute hash from stored data ──────────────────────────
    const serverHash = generateHash({
      docId:       row.doc_id,
      schoolId:    row.school_id,
      className:   row.class,
      term:        row.term,
      academicYear: row.academic_year,
      payments,
      bankAccountNo: row.bank_account_no || "",
    });

    // ── Verification result ──────────────────────────────────────
    let integrityStatus;
    let integrityDetail;

    if (qrHash) {
      // QR payload path: compare provided hash with server-recomputed hash
      const match = verifyHash(
        {
          docId:       row.doc_id,
          schoolId:    row.school_id,
          className:   row.class,
          term:        row.term,
          academicYear: row.academic_year,
          payments,
          bankAccountNo: row.bank_account_no || "",
        },
        qrHash
      );
      integrityStatus = match ? "valid" : "tampered";
      integrityDetail = match
        ? "QR hash matches server — document is authentic and unmodified"
        : "QR hash does NOT match server — document may have been altered";
    } else {
      // Plain docId path: verify stored hash is still consistent
      const storedHash = row.integrity_hash;
      if (!storedHash) {
        integrityStatus = "no_hash";
        integrityDetail = "This document was created before cryptographic signing was enabled";
      } else {
        const match = storedHash === serverHash;
        integrityStatus = match ? "valid" : "tampered";
        integrityDetail = match
          ? "Stored hash matches recomputed hash — data integrity confirmed"
          : "Stored hash does NOT match current data — possible database tampering";
      }
    }

    // ── Response ─────────────────────────────────────────────────
    return res.json({
      success: true,
      data: {
        docId:          row.doc_id,
        status:         row.status,
        schoolName:     row.school_name,
        district:       row.district,
        sector:         row.sector,
        class:          row.class,
        term:           row.term,
        academicYear:   row.academic_year,
        totalFee:       Number(row.total_fee || 0),
        payments:       payments.map(p => ({ name: p.name, amount: Number(p.amount) })),
        pdfPath:        row.pdf_path  || null,
        qrPath:         row.qr_code_path || null,
        createdAt:      row.created_at,
        verifiedAt:     new Date().toISOString(),

        // ── Integrity fields ──────────────────────────────────────
        integrity: {
          status:        integrityStatus,   // "valid" | "tampered" | "no_hash"
          detail:        integrityDetail,
          serverHash,                       // what the server computes NOW
          storedHash:    row.integrity_hash || null,
          qrHash:        qrHash || null,
          algorithm:     "HMAC-SHA256 (truncated 64-bit)",
        },
      },
    });
  } catch (err) {
    console.error("[verify] error:", err);
    return res.status(500).json({ success: false, message: "Verification error" });
  }
});

module.exports = router;
